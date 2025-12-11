import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * Charge a tip with a custom amount using saved payment method
 * Creates a one-time payment with the specified amount
 */
export async function POST(request: NextRequest) {
  try {
    const { memberId, amount, currency = 'usd', companyId: providedCompanyId, userEmail } = await request.json();

    if (!memberId || !amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Missing required fields: memberId, amount (must be > 0)' },
        { status: 400 }
      );
    }

    if (!process.env.WHOP_API_KEY) {
      return NextResponse.json(
        { error: 'Whop API key not configured' },
        { status: 500 }
      );
    }

    // Tips always go to the main business ID
    const TIP_COMPANY_ID = 'biz_PHQfLZ3o2GvXQn';
    const companyId = TIP_COMPANY_ID;

    // Get payment method ID from member's saved payment methods
    let paymentMethodId: string | null = null;
    
    // Try to get from Supabase if email is provided
    if (userEmail && isSupabaseConfigured() && supabase) {
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
            // Use the first available payment method
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

    // Charge the tip amount using inline plan (one-time payment)
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
        plan: {
          initial_price: amount,
          currency: currency,
          plan_type: 'one_time',
        },
      }),
    });

    if (!chargeResponse.ok) {
      const error = await chargeResponse.json();
      console.error('Whop API error charging tip:', {
        status: chargeResponse.status,
        error: error,
      });
      
      const errorMessage = error.error?.message || error.message || 'Failed to charge tip';
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
    
    console.log('Tip charged successfully:', {
      paymentId: payment.id,
      status: payment.status,
      amount: amount,
      memberId: memberId,
    });

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      status: payment.status,
      amount: amount,
    });
  } catch (error) {
    console.error('Charge tip error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to charge tip' },
      { status: 500 }
    );
  }
}

// Route segment config for App Router
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

