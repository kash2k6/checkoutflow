import { NextRequest, NextResponse } from 'next/server';

/**
 * API endpoint to charge a saved payment method for upsell/downsell
 * This charges the customer's saved payment method without requiring them to enter details again
 */
export async function POST(request: NextRequest) {
  try {
    const { 
      memberId, 
      paymentMethodId, 
      planId, 
      amount, 
      currency = 'usd', 
      isSubscription = false, 
      companyId,
      flowId,
      nodeId,
      purchaseType = 'upsell', // 'initial', 'upsell', 'downsell', 'cross_sell'
      sessionId,
    } = await request.json();

    // Validate required fields (amount can be 0 for free products, so check for null/undefined)
    if (!memberId || !planId || amount === null || amount === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: memberId, planId, amount' },
        { status: 400 }
      );
    }

    if (!process.env.WHOP_API_KEY) {
      return NextResponse.json(
        { error: 'Whop API key not configured' },
        { status: 500 }
      );
    }

    // Get company ID from request body, fallback to env variable
    const finalCompanyId = companyId || process.env.WHOP_COMPANY_ID;
    if (!finalCompanyId) {
      return NextResponse.json(
        { error: 'Company ID is required. Please provide companyId in request body or set WHOP_COMPANY_ID environment variable.' },
        { status: 400 }
      );
    }

    // Charge directly using saved payment method (works for both one-time and subscriptions)
    // When using planId, the payment API will automatically create the subscription if it's a subscription plan
    let finalPaymentMethodId = paymentMethodId;

    // If no payment method ID provided, get it from member's saved payment methods via Whop API
    if (!finalPaymentMethodId && memberId) {
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
            // Use the first available payment method (Whop stores them)
            finalPaymentMethodId = paymentMethods.data[0].id;
            console.log('Retrieved payment method from Whop API:', finalPaymentMethodId);
          }
        } else {
          const error = await paymentMethodsResponse.json();
          console.error('Whop API error fetching payment methods:', error);
        }
      } catch (error) {
        console.error('Error fetching payment methods from Whop:', error);
      }
    }

    if (!finalPaymentMethodId) {
      return NextResponse.json(
        { error: 'No payment method found. Payment method should be saved by Whop after checkout.' },
        { status: 400 }
      );
    }

    // Use existing plan by passing planId at top level (works for both one-time and subscriptions)
    const response = await fetch('https://api.whop.com/api/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        company_id: finalCompanyId,
        member_id: memberId,
        payment_method_id: finalPaymentMethodId,
        planId: planId, // Use planId (camelCase) at top level - works for both one-time and subscriptions
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Whop API error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to charge payment method' },
        { status: response.status }
      );
    }

    const payment = await response.json();

    // Track purchase in database if we have flowId and companyId
    if (flowId && companyId && planId && purchaseType) {
      try {
        const { supabase, isSupabaseConfigured } = await import('@/lib/supabase');
        if (isSupabaseConfigured() && supabase) {
          await supabase
            .from('flow_purchases')
            .insert({
              flow_id: flowId,
              company_id: companyId,
              member_id: memberId,
              plan_id: planId,
              purchase_type: purchaseType,
              node_id: nodeId || null,
              amount: amount || 0,
              currency: currency || 'usd',
              session_id: sessionId || null,
            });
          console.log('Purchase tracked in database:', { flowId, companyId, memberId, planId, purchaseType, amount });
        }
      } catch (trackError) {
        // Don't fail the charge if tracking fails, just log it
        console.error('Error tracking purchase in database:', trackError);
      }
    }

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      status: payment.status,
      requiresRedirect: false, // No redirect needed - one-click charge
    });
  } catch (error) {
    console.error('Charge payment error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to charge payment' },
      { status: 500 }
    );
  }
}

