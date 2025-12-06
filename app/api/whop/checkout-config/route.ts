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
    const { planId, userEmail, companyId: providedCompanyId, flowId } = await request.json();

    if (!planId) {
      return NextResponse.json(
        { error: 'Missing planId' },
        { status: 400 }
      );
    }

    if (!process.env.WHOP_API_KEY) {
      return NextResponse.json(
        { error: 'Whop API key not configured' },
        { status: 500 }
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

    // Create checkout configuration in SETUP MODE (no plan_id, just mode: "setup")
    // This saves the payment method without charging
    // We'll charge after setup completes via API
    const checkoutConfigResponse = await fetch(
      'https://api.whop.com/api/v1/checkout_configurations',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: 'setup', // Setup mode - saves payment method, no charge
          company_id: companyId,
          metadata: {
            userEmail: userEmail || '', // Store email in metadata for webhook retrieval
            planId: planId, // Store plan ID in metadata so we can charge after setup
            companyId: companyId, // Store company ID
            flowId: flowId || '', // Store flow ID if provided
            source: 'whop_checkout_flow',
          },
        }),
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
      planId: planId, // Return the plan ID we stored in metadata
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

