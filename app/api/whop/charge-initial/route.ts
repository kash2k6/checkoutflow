import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * Charge the initial product after setup intent succeeds
 * This charges the customer for the product they selected using their saved payment method
 */
export async function POST(request: NextRequest) {
  try {
    const { memberId, planId, userEmail, paymentMethodId: providedPaymentMethodId, companyId: providedCompanyId, flowId } = await request.json();

    if (!memberId || !planId) {
      return NextResponse.json(
        { error: 'Missing required fields: memberId, planId' },
        { status: 400 }
      );
    }

    if (!process.env.WHOP_API_KEY) {
      return NextResponse.json(
        { error: 'Whop API key not configured' },
        { status: 500 }
      );
    }

    // Get payment method ID - try in this order:
    // 1. Provided in request
    // 2. From Supabase (if email provided)
    // 3. From Whop API
    let paymentMethodId: string | null = providedPaymentMethodId || null;
    
    // Try to get from Supabase if email is provided
    if (!paymentMethodId && userEmail && isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('whop_member_data')
          .select('payment_method_id')
          .eq('email', userEmail.toLowerCase())
          .single();

        if (!error && data && data.payment_method_id) {
          paymentMethodId = data.payment_method_id;
          console.log('Using payment method from Supabase:', paymentMethodId);
        }
      } catch (error) {
        console.error('Error fetching payment method from Supabase:', error);
      }
    }

    // Fallback: Get payment method from member's saved payment methods via Whop API
    if (!paymentMethodId) {
      try {
        const paymentMethodsResponse = await fetch(
          `https://api.whop.com/api/v1/payment_methods?member_id=${memberId}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (paymentMethodsResponse.ok) {
          const paymentMethods = await paymentMethodsResponse.json();
          if (paymentMethods.data && paymentMethods.data.length > 0) {
            // Use the first available payment method (the one just saved)
            paymentMethodId = paymentMethods.data[0].id;
            console.log('Using payment method from Whop API:', paymentMethodId);
          }
        } else {
          const errorData = await paymentMethodsResponse.json();
          console.error('Whop API error fetching payment methods:', errorData);
        }
      } catch (error) {
        console.error('Error fetching payment methods:', error);
      }
    }

    if (!paymentMethodId) {
      return NextResponse.json(
        { error: 'No payment method found. Please ensure payment method was saved during checkout.' },
        { status: 400 }
      );
    }

    // Get company ID - use provided one or fallback to env
    const companyId = providedCompanyId || process.env.WHOP_COMPANY_ID;
    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID not provided and WHOP_COMPANY_ID not configured' },
        { status: 500 }
      );
    }

    // Charge the initial product using saved payment method
    // Use the existing plan by passing planId at top level (not plan_id, and no plan object)
    const chargeResponse = await fetch('https://api.whop.com/api/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        company_id: companyId,
        member_id: memberId,
        payment_method_id: paymentMethodId,
        planId: planId, // Use planId (camelCase) at top level, not plan_id
      }),
    });

    if (!chargeResponse.ok) {
      const error = await chargeResponse.json();
      console.error('Whop API error charging initial product:', {
        status: chargeResponse.status,
        error: error,
        requestBody: {
          planId: planId,
          company_id: companyId,
          member_id: memberId,
          payment_method_id: paymentMethodId,
        },
      });
      
      // Return detailed error information
      const errorMessage = error.error?.message || error.message || 'Failed to charge payment method';
      return NextResponse.json(
        { 
          error: errorMessage,
          details: error.error || error,
          status: chargeResponse.status,
        },
        { status: chargeResponse.status }
      );
    }

    const payment = await chargeResponse.json();
    
    console.log('Initial product charged successfully:', {
      paymentId: payment.id,
      status: payment.status,
      memberId: memberId,
      planId: planId,
    });

    // Track initial purchase in database if we have flowId and companyId
    if (flowId && companyId && planId) {
      try {
        if (isSupabaseConfigured() && supabase) {
          // Get plan amount from payment or try to fetch from Whop API
          let amount = 0;
          if (payment.total) {
            amount = payment.total / 100; // Convert from cents
          } else if (payment.amount) {
            amount = payment.amount / 100;
          } else {
            // Try to get from Whop API
            try {
              const planResponse = await fetch(
                `https://api.whop.com/api/v2/plans/${planId}`,
                {
                  headers: {
                    'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
                  },
                }
              );
              if (planResponse.ok) {
                const planData = await planResponse.json();
                amount = planData.initial_price || planData.price || 0;
              }
            } catch (e) {
              console.error('Error fetching plan price:', e);
            }
          }

          await supabase
            .from('flow_purchases')
            .insert({
              flow_id: flowId,
              company_id: companyId,
              member_id: memberId,
              plan_id: planId,
              purchase_type: 'initial',
              node_id: null, // Initial purchase has no node_id
              amount: amount,
              currency: payment.currency || 'usd',
              session_id: sessionId || null, // Session ID to track current transaction
            });
          console.log('Initial purchase tracked in database:', { flowId, companyId, memberId, planId, amount });
        }
      } catch (trackError) {
        // Don't fail the charge if tracking fails, just log it
        console.error('Error tracking initial purchase in database:', trackError);
      }
    }

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      status: payment.status,
    });
  } catch (error) {
    console.error('Charge initial product error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to charge initial product' },
      { status: 500 }
    );
  }
}

// Route segment config for App Router
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

