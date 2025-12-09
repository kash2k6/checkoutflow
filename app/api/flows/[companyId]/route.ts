import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { headers } from 'next/headers';
import { whopSdk } from '@/lib/whop-sdk';
import { checkSubscriptionAccess, checkCompanyAdminSubscription } from '@/lib/subscription-access';

// Get flow for a company
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;

    // Allow read access for dashboard setup - subscription check happens on customer-facing pages
    if (!isSupabaseConfigured() || !supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      );
    }

    // Get flowId from query params (optional - if not provided, get first flow)
    const { searchParams } = request.nextUrl;
    const flowId = searchParams.get('flowId');

    let flow;
    if (flowId) {
      // Get specific flow by ID
      const { data, error: flowError } = await supabase
        .from('company_flows')
        .select('*')
        .eq('id', flowId)
        .eq('company_id', companyId)
        .single();

      if (flowError) {
        if (flowError.code === 'PGRST116') {
          return NextResponse.json(
            { error: 'Flow not found' },
            { status: 404 }
          );
        }
        throw flowError;
      }
      flow = data;
    } else {
      // Get first flow for company (backward compatibility)
      const { data, error: flowError } = await supabase
        .from('company_flows')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (flowError) {
        if (flowError.code === 'PGRST116') {
          return NextResponse.json(
            { error: 'Flow not found' },
            { status: 404 }
          );
        }
        throw flowError;
      }
      flow = data;
    }

    if (!flow) {
      return NextResponse.json(
        { error: 'Flow not found' },
        { status: 404 }
      );
    }

    // Log what we're loading
    console.log('Loading flow. checkout_customization:', JSON.stringify(flow.checkout_customization));

    // Get nodes for this flow
    const { data: nodes, error: nodesError } = await supabase
      .from('flow_nodes')
      .select('*')
      .eq('flow_id', flow.id)
      .order('node_type', { ascending: true })
      .order('order_index', { ascending: true });

    if (nodesError) throw nodesError;

    /**
     * SUBSCRIPTION CHECK FOR FUNNELS
     * 
     * IMPORTANT: Dashboard users (authenticated) can ALWAYS create, view, and edit flows.
     * Subscription only blocks CUSTOMER-FACING pages (unauthenticated access).
     * 
     * For authenticated requests (dashboard): ALWAYS allow - never block
     * For unauthenticated requests (customers): Block if no active/trialing subscription
     */
    let isEnabled = true;
    let subscriptionStatus = null;
    let isAuthenticated = false;
    
    try {
      const result = await whopSdk.verifyUserToken(await headers(), { dontThrow: true });
      if (result && result.userId) {
        // AUTHENTICATED REQUEST (DASHBOARD) - ALWAYS ALLOW
        // Dashboard users can create, view, and edit flows regardless of subscription
        isAuthenticated = true;
        console.log(`[Subscription Check] Authenticated dashboard request for user ${result.userId} - ALLOWING ACCESS`);
        subscriptionStatus = await checkSubscriptionAccess(result.userId);
        isEnabled = subscriptionStatus.hasAccess;
        console.log(`[Subscription Check] User subscription status:`, {
          hasAccess: subscriptionStatus.hasAccess,
          isTrial: subscriptionStatus.isTrial,
          isExpired: subscriptionStatus.isExpired,
        });
        // Note: We still check subscription status to show in UI, but we NEVER block dashboard access
      } else {
        // UNAUTHENTICATED REQUEST (CUSTOMER-FACING PAGE) - CHECK SUBSCRIPTION
        // Customer-facing pages require active subscription
        console.log(`[Subscription Check] Unauthenticated customer request for company ${companyId}`);
        subscriptionStatus = await checkCompanyAdminSubscription(companyId);
        isEnabled = subscriptionStatus.hasAccess;
        console.log(`[Subscription Check] Company admin subscription status:`, {
          hasAccess: subscriptionStatus.hasAccess,
          isTrial: subscriptionStatus.isTrial,
          isExpired: subscriptionStatus.isExpired,
          membershipId: subscriptionStatus.membership?.id,
          userId: subscriptionStatus.membership?.user_id,
        });
        
        // For unauthenticated requests, block access if no subscription
        if (!isEnabled) {
          const errorResponse = NextResponse.json(
            { 
              error: 'Funnel access requires an active subscription. Please subscribe to enable your funnels.',
              enabled: false,
              subscriptionStatus: subscriptionStatus ? {
                hasAccess: subscriptionStatus.hasAccess,
                isTrial: subscriptionStatus.isTrial,
              } : null,
            },
            { status: 403 }
          );
          errorResponse.headers.set('Access-Control-Allow-Origin', '*');
          return errorResponse;
        }
      }
    } catch (error) {
      console.error('[Subscription Check] Error checking subscription in flow endpoint:', error);
      console.error('[Subscription Check] Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        companyId,
      });
      
      // On error: if authenticated, always allow (fail open for dashboard)
      // If unauthenticated, block (fail closed for customer pages)
      isEnabled = false;
      subscriptionStatus = {
        hasAccess: false,
        isTrial: false,
        isExpired: true,
      };
      
      // Only block if NOT authenticated (customer-facing page)
      if (!isAuthenticated) {
        const errorResponse = NextResponse.json(
          { 
            error: 'Funnel access requires an active subscription. Please subscribe to enable your funnels.',
            enabled: false,
            subscriptionStatus: null,
          },
          { status: 403 }
        );
        errorResponse.headers.set('Access-Control-Allow-Origin', '*');
        return errorResponse;
      }
      // If authenticated, continue and return flow data (even if subscription check failed)
    }

    const response = NextResponse.json({
      ...flow,
      nodes: nodes || [],
      enabled: isEnabled, // Funnel is enabled/disabled based on subscription
      subscriptionStatus: subscriptionStatus ? {
        hasAccess: subscriptionStatus.hasAccess,
        isTrial: subscriptionStatus.isTrial,
      } : null,
    });
    
    // Add CORS headers for cross-origin iframe embedding
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    
    // Prevent caching to ensure fresh data (important for confirmation_page_url updates)
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error('Error fetching flow:', error);
    const errorResponse = NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch flow' },
      { status: 500 }
    );
    errorResponse.headers.set('Access-Control-Allow-Origin', '*');
    return errorResponse;
  }
}

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}

