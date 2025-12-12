import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { checkSubscriptionAccess, getPlanLimit, FREE_TIER_FUNNEL_LIMIT } from '@/lib/subscription-access';

/**
 * Get the count of funnels (flows) for a company
 * @param companyId - The company ID to count funnels for
 * @returns The number of funnels for the company
 */
export async function getFunnelCount(companyId: string): Promise<number> {
  if (!isSupabaseConfigured() || !supabase) {
    return 0;
  }

  try {
    const { count, error } = await supabase
      .from('company_flows')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId);

    if (error) {
      console.error('Error counting funnels:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error counting funnels:', error);
    return 0;
  }
}

/**
 * Get user's plan information including plan ID and funnel limit
 * @param userId - The user ID to check
 * @returns Object with planId and limit (null means unlimited)
 */
export async function getUserPlanInfo(userId: string): Promise<{ planId: string | null; limit: number | null }> {
  const subscriptionStatus = await checkSubscriptionAccess(userId);
  
  if (!subscriptionStatus.hasAccess) {
    // No subscription = free tier
    return {
      planId: null,
      limit: FREE_TIER_FUNNEL_LIMIT,
    };
  }

  return {
    planId: subscriptionStatus.planId || null,
    limit: subscriptionStatus.funnelLimit ?? FREE_TIER_FUNNEL_LIMIT,
  };
}

/**
 * Check if a user/company can create a new funnel based on their plan limit
 * @param userId - The user ID to check subscription for
 * @param companyId - The company ID to count funnels for
 * @returns Object with allowed status, current count, limit, and plan info
 */
export async function checkFunnelLimit(
  userId: string,
  companyId: string
): Promise<{
  allowed: boolean;
  currentCount: number;
  limit: number | null;
  planId?: string | null;
  message?: string;
}> {
  // Get user's plan info
  const planInfo = await getUserPlanInfo(userId);
  
  // Get current funnel count
  const currentCount = await getFunnelCount(companyId);
  
  // Determine limit
  const limit = planInfo.limit;
  
  // Check if allowed (null limit means unlimited)
  const allowed = limit === null || currentCount < limit;
  
  let message: string | undefined;
  if (!allowed) {
    message = `You've reached your funnel limit of ${limit} funnel${limit === 1 ? '' : 's'}. Please upgrade your plan to create more funnels.`;
  }
  
  return {
    allowed,
    currentCount,
    limit,
    planId: planInfo.planId,
    message,
  };
}

