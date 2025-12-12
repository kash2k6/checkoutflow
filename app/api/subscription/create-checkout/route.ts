import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { whopSdk } from '@/lib/whop-sdk';
import { PRO_PLAN_ID, STARTER_PLAN_ID, GROWTH_PLAN_ID } from '@/lib/subscription-access';

/**
 * Create checkout configuration for subscription purchase
 * Uses the subscription plan ID to create a checkout session
 * Accepts planId in request body to support multiple tiers
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user token
    const result = await whopSdk.verifyUserToken(await headers(), { dontThrow: true });
    
    if (!result || !result.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!process.env.WHOP_API_KEY) {
      return NextResponse.json(
        { error: 'Whop API key not configured' },
        { status: 500 }
      );
    }

    // Get plan ID from request body, default to Pro plan
    const body = await request.json().catch(() => ({}));
    const requestedPlanId = body.planId;
    
    // Validate plan ID or default to Pro plan
    const validPlanIds = [STARTER_PLAN_ID, GROWTH_PLAN_ID, PRO_PLAN_ID];
    const selectedPlanId = requestedPlanId && validPlanIds.includes(requestedPlanId) 
      ? requestedPlanId 
      : PRO_PLAN_ID;

    // Create checkout configuration for subscription plan
    // Note: When using plan_id, do NOT include company_id - the plan already belongs to a company
    const checkoutConfigResponse = await fetch(
      'https://api.whop.com/api/v1/checkout_configurations',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan_id: selectedPlanId,
          metadata: {
            source: 'funnel_builder_subscription',
            plan_type: 'subscription',
            plan_tier: selectedPlanId === STARTER_PLAN_ID ? 'starter' : 
                       selectedPlanId === GROWTH_PLAN_ID ? 'growth' : 'pro',
          },
        }),
      }
    );

    if (!checkoutConfigResponse.ok) {
      const errorData = await checkoutConfigResponse.json();
      console.error('Failed to create checkout configuration:', errorData);
      return NextResponse.json(
        { error: errorData.message || 'Failed to create checkout session' },
        { status: checkoutConfigResponse.status }
      );
    }

    const checkoutData = await checkoutConfigResponse.json();

    return NextResponse.json({
      checkoutConfigId: checkoutData.id,
      checkoutUrl: checkoutData.checkout_url,
    });
  } catch (error) {
    console.error('Error creating checkout:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

