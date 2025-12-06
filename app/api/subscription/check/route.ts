import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { whopSdk } from '@/lib/whop-sdk';
import { checkSubscriptionAccess } from '@/lib/subscription-access';

/**
 * API endpoint to check if user has subscription access
 * Returns subscription status including trial status
 */
export async function GET(request: NextRequest) {
  try {
    // Verify user token to get userId
    const result = await whopSdk.verifyUserToken(await headers(), { dontThrow: true });
    
    if (!result || !result.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { userId } = result;

    // Check subscription access using REST API
    const subscriptionStatus = await checkSubscriptionAccess(userId);

    return NextResponse.json({
      ...subscriptionStatus,
    });
  } catch (error) {
    console.error('Error checking subscription:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check subscription status',
        hasAccess: false,
        isTrial: false,
        isExpired: true,
      },
      { status: 500 }
    );
  }
}

