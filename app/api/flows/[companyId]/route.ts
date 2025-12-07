import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { headers } from 'next/headers';
import { whopSdk } from '@/lib/whop-sdk';
import { checkSubscriptionAccess } from '@/lib/subscription-access';

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

    // Check subscription status for authenticated requests (company owner)
    // For customer-facing requests (unauthenticated), we'll check subscription separately
    let isEnabled = true;
    let subscriptionStatus = null;
    
    try {
      const result = await whopSdk.verifyUserToken(await headers(), { dontThrow: true });
      if (result && result.userId) {
        // This is an authenticated request (dashboard) - check subscription
        subscriptionStatus = await checkSubscriptionAccess(result.userId);
        isEnabled = subscriptionStatus.hasAccess;
      }
      // For unauthenticated requests (customers), we allow access for now
      // Subscription check will happen at the customer-facing page level
    } catch (error) {
      console.error('Error checking subscription in flow endpoint:', error);
      // On error, allow access
      isEnabled = true;
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

