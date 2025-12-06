"use server";

import { whopSdk } from "@/lib/whop-sdk";
import { headers } from "next/headers";
import { SUBSCRIPTION_PLAN_ID } from "@/lib/subscription-access";

/**
 * Create in-app purchase for subscription
 * Creates a checkout configuration with plan_id for subscription and returns
 * the format needed for iframe SDK inAppPurchase method
 */
export async function createSubscriptionPurchase() {
  await whopSdk.verifyUserToken(await headers());

  if (!process.env.WHOP_API_KEY) {
    throw new Error("Whop API key not configured");
  }

  // Create checkout configuration for subscription using REST API
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
        plan_id: SUBSCRIPTION_PLAN_ID,
        metadata: {
          source: 'funnel_builder_subscription',
          plan_type: 'subscription',
        },
      }),
    }
  );

  if (!checkoutConfigResponse.ok) {
    const errorData = await checkoutConfigResponse.json();
    throw new Error(errorData.error?.message || 'Failed to create checkout configuration');
  }

  const checkoutConfig = await checkoutConfigResponse.json();

  // Return the in-app purchase object for iframe SDK
  // The iframe SDK expects: { planId: string, id: string (checkout config id) }
  return {
    planId: SUBSCRIPTION_PLAN_ID,
    id: checkoutConfig.id,
  };
}

