import { headers } from 'next/headers';
import { whopSdk } from '@/lib/whop-sdk';
import { checkSubscriptionAccess } from '@/lib/subscription-access';

/**
 * Check subscription access in API routes
 * Returns null if user is not authenticated (for public routes)
 * Returns true/false if user is authenticated
 */
export async function checkSubscriptionAccessInApi(): Promise<boolean | null> {
  try {
    // Verify user token (with dontThrow to allow unauthenticated requests)
    const result = await whopSdk.verifyUserToken(await headers(), { dontThrow: true });
    
    // If user is not authenticated, return null (allow access for public routes)
    if (!result || !result.userId) {
      return null;
    }

    // User is authenticated, check subscription
    const subscriptionStatus = await checkSubscriptionAccess(result.userId);
    return subscriptionStatus.hasAccess;
  } catch (error) {
    console.error('Error checking subscription in API:', error);
    // On error, allow access (fail open)
    return true;
  }
}

