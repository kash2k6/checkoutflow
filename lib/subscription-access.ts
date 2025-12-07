import { whopSdk } from '@/lib/whop-sdk';

/**
 * SUBSCRIPTION REQUIREMENTS FOR FUNNELS
 * 
 * Funnels (checkout flows, upsells, downsells) require the company owner/admin
 * to have an active subscription to our service plan.
 * 
 * Required Plan ID: plan_9ykCIXvTEDMyp
 * Required Product ID: prod_mM22JTuMsyM8V
 * Our Company ID: biz_PHQfLZ3o2GvXQn
 * 
 * How it works:
 * - For authenticated requests (dashboard): Check the authenticated user's subscription
 * - For unauthenticated requests (customers): Check if any admin of the target company has an active subscription
 * 
 * If no active subscription is found, funnels are completely blocked (not just a warning).
 * This ensures only paying customers can use the funnel features.
 */

// Subscription constants
export const SUBSCRIPTION_PLAN_ID = 'plan_9ykCIXvTEDMyp';
export const SUBSCRIPTION_PRODUCT_ID = 'prod_mM22JTuMsyM8V';
export const COMPANY_ID = 'biz_PHQfLZ3o2GvXQn';

export interface SubscriptionStatus {
  hasAccess: boolean;
  isTrial: boolean;
  isExpired: boolean;
  membership?: {
    id: string;
    status: string;
    plan_id: string;
    user_id: string;
    created_at: string;
    trial_end?: string;
  };
}

/**
 * Check if a user has active subscription access to the product/plan
 * Uses Whop REST API to query memberships by user_id and plan_id
 */
export async function checkSubscriptionAccess(userId: string): Promise<SubscriptionStatus> {
  const companyId = COMPANY_ID;

  // Use subscription-specific API key, fallback to main API key
  const apiKey = process.env.WHOP_SUBSCRIPTION_API_KEY || process.env.WHOP_API_KEY;
  
  if (!apiKey) {
    console.error('WHOP_SUBSCRIPTION_API_KEY or WHOP_API_KEY environment variable is not set');
    return {
      hasAccess: false,
      isTrial: false,
      isExpired: true,
    };
  }

  try {
    // Query memberships using REST API - faster than SDK methods
    // Build URL with query parameters - company_id is required
    const url = new URL('https://api.whop.com/api/v1/memberships');
    url.searchParams.set('company_id', companyId);
    
    // Only add plan_ids if we have a plan ID
    if (SUBSCRIPTION_PLAN_ID) {
      url.searchParams.set('plan_ids', SUBSCRIPTION_PLAN_ID);
    }
    
    // Only add user_ids if we have a user ID
    if (userId) {
      url.searchParams.set('user_ids', userId);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorJson.message || errorText;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      console.error('Failed to check subscription access:', response.status, errorMessage);
      console.error('URL used:', url.toString());
      console.error('Company ID:', companyId);
      return {
        hasAccess: false,
        isTrial: false,
        isExpired: true,
      };
    }

    const data = await response.json();
    const memberships = data.data || [];

    // Check if user has any active memberships
    const activeMembership = memberships.find((m: any) => {
      const status = m.status?.toLowerCase();
      return status === 'active' || status === 'trialing';
    });

    if (!activeMembership) {
      return {
        hasAccess: false,
        isTrial: false,
        isExpired: true,
      };
    }

    const isTrial = activeMembership.status?.toLowerCase() === 'trialing';
    const isExpired = activeMembership.status?.toLowerCase() === 'canceled' || 
                     activeMembership.status?.toLowerCase() === 'expired';

    return {
      hasAccess: true,
      isTrial,
      isExpired,
      membership: {
        id: activeMembership.id,
        status: activeMembership.status,
        plan_id: activeMembership.plan_id,
        user_id: activeMembership.user_id,
        created_at: activeMembership.created_at,
        trial_end: activeMembership.trial_end,
      },
    };
  } catch (error) {
    console.error('Error checking subscription access:', error);
    return {
      hasAccess: false,
      isTrial: false,
      isExpired: true,
    };
  }
}

/**
 * Check if any admin of a company has an active subscription
 * This is used for unauthenticated requests (customers) to verify that
 * the company owner has an active subscription before allowing funnel access.
 * 
 * @param targetCompanyId - The company ID whose admins we want to check
 * @returns SubscriptionStatus indicating if any admin has active subscription
 */
export async function checkCompanyAdminSubscription(targetCompanyId: string): Promise<SubscriptionStatus> {
  const subscriptionCompanyId = COMPANY_ID;

  // Use subscription-specific API key, fallback to main API key
  const apiKey = process.env.WHOP_SUBSCRIPTION_API_KEY || process.env.WHOP_API_KEY;
  
  if (!apiKey) {
    console.error('WHOP_SUBSCRIPTION_API_KEY or WHOP_API_KEY environment variable is not set');
    return {
      hasAccess: false,
      isTrial: false,
      isExpired: true,
    };
  }

  try {
    // Get company members/admins from Whop API
    // We'll query memberships for the subscription plan and check if any belong to admins of the target company
    const url = new URL('https://api.whop.com/api/v1/memberships');
    url.searchParams.set('company_id', subscriptionCompanyId);
    url.searchParams.set('plan_ids', SUBSCRIPTION_PLAN_ID);
    // Get all active memberships for our subscription plan
    url.searchParams.set('status', 'active,trialing');

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorJson.message || errorText;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      console.error('Failed to check company admin subscription:', response.status, errorMessage);
      return {
        hasAccess: false,
        isTrial: false,
        isExpired: true,
      };
    }

    const data = await response.json();
    const memberships = data.data || [];

    // For each active membership, check if the user is an admin of the target company
    for (const membership of memberships) {
      const userId = membership.user_id;
      if (!userId) continue;

      try {
        // Check if this user has admin access to the target company
        const access = await whopSdk.users.checkAccess(
          targetCompanyId,
          { id: userId }
        );

        // If user is an admin and has active subscription, return success
        if (access.access_level === 'admin') {
          const isTrial = membership.status?.toLowerCase() === 'trialing';
          const isExpired = membership.status?.toLowerCase() === 'canceled' || 
                           membership.status?.toLowerCase() === 'expired';

          return {
            hasAccess: true,
            isTrial,
            isExpired,
            membership: {
              id: membership.id,
              status: membership.status,
              plan_id: membership.plan_id,
              user_id: membership.user_id,
              created_at: membership.created_at,
              trial_end: membership.trial_end,
            },
          };
        }
      } catch (error) {
        // If checkAccess fails for this user, continue to next membership
        console.warn(`Error checking access for user ${userId}:`, error);
        continue;
      }
    }

    // No admin found with active subscription
    return {
      hasAccess: false,
      isTrial: false,
      isExpired: true,
    };
  } catch (error) {
    console.error('Error checking company admin subscription:', error);
    return {
      hasAccess: false,
      isTrial: false,
      isExpired: true,
    };
  }
}

