import { NextRequest, NextResponse } from 'next/server';

/**
 * Create a checkout configuration in SETUP MODE to save payment method
 * After setup completes, we'll charge the initial product, then show upsells
 * 
 * Flow:
 * 1. Setup mode checkout (save payment method, no charge) -> triggers setup_intent.succeeded
 * 2. Charge initial product using saved payment method
 * 3. Show upsells and charge saved payment method if accepted
 */
export async function POST(request: NextRequest) {
  try {
    const { planId, userEmail, companyId: providedCompanyId, flowId, tipAmount } = await request.json();

    if (!planId && !tipAmount) {
      return NextResponse.json(
        { error: 'Missing planId or tipAmount' },
        { status: 400 }
      );
    }

    if (!process.env.WHOP_API_KEY) {
      return NextResponse.json(
        { error: 'Whop API key not configured' },
        { status: 500 }
      );
    }

    // Get company ID - for tips, always use the main business ID
    // For regular flows, use provided one or fallback to env
    const TIP_COMPANY_ID = 'biz_PHQfLZ3o2GvXQn';
    const companyId = tipAmount ? TIP_COMPANY_ID : (providedCompanyId || process.env.WHOP_COMPANY_ID);
    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID not provided and WHOP_COMPANY_ID not configured' },
        { status: 500 }
      );
    }

    // For tips, create a one-time payment plan (actual charge)
    // For regular flows, use setup mode to save payment method
    const checkoutConfigBody: any = {
      metadata: {
        userEmail: userEmail || '',
        planId: planId || '',
        companyId: companyId,
        flowId: flowId || '',
        tipAmount: tipAmount || '',
        source: tipAmount ? 'tip_creator' : 'whop_checkout_flow',
      },
    };

    if (tipAmount) {
      // Create one-time payment plan for tips (actual charge)
      checkoutConfigBody.plan = {
        company_id: companyId,
        initial_price: tipAmount,
        currency: 'usd',
        plan_type: 'one_time',
        title: `Tip $${tipAmount.toFixed(2)}`,
        description: 'Thank you for your support!',
      };
    } else {
      // Setup mode for regular flows (save payment method, no charge)
      checkoutConfigBody.mode = 'setup';
      checkoutConfigBody.company_id = companyId;
    }

    const checkoutConfigResponse = await fetch(
      'https://api.whop.com/api/v1/checkout_configurations',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(checkoutConfigBody),
      }
    );

    if (!checkoutConfigResponse.ok) {
      const error = await checkoutConfigResponse.json();
      console.error('Whop checkout config API error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to create checkout configuration' },
        { status: checkoutConfigResponse.status }
      );
    }

    const checkoutConfig = await checkoutConfigResponse.json();

    return NextResponse.json({
      checkoutConfigId: checkoutConfig.id,
      planId: checkoutConfig.plan?.id || planId, // Return the plan ID from the created plan, or fallback to metadata
      purchaseUrl: checkoutConfig.purchase_url,
    });
  } catch (error) {
    console.error('Create checkout config error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create checkout configuration' },
      { status: 500 }
    );
  }
}

// Route segment config for App Router
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

