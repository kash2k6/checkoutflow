import { NextRequest, NextResponse } from 'next/server';

/**
 * Retrieve setup intent from Whop API to get member ID
 * This is a fallback when webhook hasn't processed yet
 * Can search by setupIntentId or checkoutConfigId
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const setupIntentId = searchParams.get('setupIntentId');
    const checkoutConfigId = searchParams.get('checkoutConfigId');

    if (!setupIntentId && !checkoutConfigId) {
      return NextResponse.json(
        { error: 'Missing setupIntentId or checkoutConfigId parameter' },
        { status: 400 }
      );
    }

    if (!process.env.WHOP_API_KEY) {
      return NextResponse.json(
        { error: 'Whop API key not configured' },
        { status: 500 }
      );
    }

    let setupIntent: any = null;

    // If we have setup intent ID, retrieve it directly
    if (setupIntentId) {
      const setupIntentResponse = await fetch(
        `https://api.whop.com/api/v2/setup_intents/${setupIntentId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (setupIntentResponse.ok) {
        setupIntent = await setupIntentResponse.json();
      }
    } 
    // Otherwise, retrieve checkout config first, then get setup intent from it
    else if (checkoutConfigId) {
      // First, retrieve the checkout configuration
      const checkoutConfigResponse = await fetch(
        `https://api.whop.com/api/v1/checkout_configurations/${checkoutConfigId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (checkoutConfigResponse.ok) {
        const checkoutConfig = await checkoutConfigResponse.json();
        
        // Check if checkout config has a setup_intent_id field
        if (checkoutConfig.setup_intent_id) {
          // Retrieve setup intent directly using the ID from checkout config
          const setupIntentResponse = await fetch(
            `https://api.whop.com/api/v2/setup_intents/${checkoutConfig.setup_intent_id}`,
            {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
                'Content-Type': 'application/json',
              },
            }
          );
          
          if (setupIntentResponse.ok) {
            setupIntent = await setupIntentResponse.json();
          }
        } else {
          // Fallback: List recent setup intents and find one matching this checkout config
          // This is less efficient but necessary if checkout config doesn't have setup_intent_id
          const companyId = process.env.WHOP_COMPANY_ID;
          const url = companyId 
            ? `https://api.whop.com/api/v2/setup_intents?company_id=${companyId}&limit=10`
            : 'https://api.whop.com/api/v2/setup_intents?limit=10';
          
          const setupIntentsResponse = await fetch(
            url,
            {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
                'Content-Type': 'application/json',
              },
            }
          );

          if (setupIntentsResponse.ok) {
            const setupIntents = await setupIntentsResponse.json();
            setupIntent = setupIntents.data?.find(
              (si: any) => si.checkout_configuration?.id === checkoutConfigId
            );
          }
        }
      }
    }

    if (!setupIntent) {
      return NextResponse.json(
        { error: 'Setup intent not found' },
        { status: 404 }
      );
    }

    const memberId = setupIntent.member?.id;
    const userEmail = setupIntent.member?.user?.email || setupIntent.member?.email;
    const checkoutConfig = setupIntent.checkout_configuration;
    const metadataEmail = checkoutConfig?.metadata?.userEmail;

    if (!memberId) {
      return NextResponse.json(
        { error: 'Member ID not found in setup intent' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      memberId,
      email: userEmail || metadataEmail || 'unknown',
      paymentMethodId: setupIntent.payment_method?.id,
    });
  } catch (error) {
    console.error('Get setup intent error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to retrieve setup intent' },
      { status: 500 }
    );
  }
}

// Route segment config for App Router
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

