import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * Get purchases for a member in a flow
 * Used by confirmation page to display purchase items
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    const { searchParams } = request.nextUrl;
    const memberId = searchParams.get('memberId');
    const flowId = searchParams.get('flowId');
    const sessionId = searchParams.get('sessionId'); // Session ID to filter by current transaction

    if (!memberId) {
      return NextResponse.json(
        { error: 'Missing required parameter: memberId' },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured() || !supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      );
    }

    const db = supabase;

    // Build query to get purchases
    let query = db
      .from('flow_purchases')
      .select('*')
      .eq('member_id', memberId)
      .eq('company_id', companyId);

    if (flowId) {
      query = query.eq('flow_id', flowId);
    }

    // Filter by session ID if provided (to show only current transaction)
    if (sessionId) {
      console.log('Purchases API - Filtering by sessionId:', sessionId);
      query = query.eq('session_id', sessionId);
    } else {
      console.log('Purchases API - No sessionId provided, showing all purchases for member');
    }
    // Removed the 30-minute time window filter - show all purchases for the member/flow
    // This allows the confirmation page to display purchases even if they're older

    // Get purchases, ordered by purchase time
    const { data: purchases, error } = await query.order('purchased_at', { ascending: true });
    
    console.log('Purchases API - Query result:', {
      sessionId,
      memberId,
      flowId,
      count: purchases?.length || 0,
      purchases: purchases?.map((p: any) => ({
        id: p.id,
        type: p.purchase_type,
        amount: p.amount,
        session_id: p.session_id,
        purchased_at: p.purchased_at
      }))
    });

    if (error) {
      console.error('Error fetching purchases:', error);
      throw error;
    }

    // Get node titles and product names if we have node_ids
    const nodeIds = (purchases || [])
      .map((p: any) => p.node_id)
      .filter((id: string | null) => id !== null);
    
    let nodeTitles: Record<string, string> = {};
    if (nodeIds.length > 0 && flowId) {
      const { data: nodes } = await db
        .from('flow_nodes')
        .select('id, title')
        .in('id', nodeIds);
      
      if (nodes) {
        nodes.forEach((node: any) => {
          nodeTitles[node.id] = node.title || 'Product';
        });
      }
    }

    // Get initial product name from flow if we have initial purchases
    let initialProductName = 'Product';
    if (flowId) {
      const { data: flowData } = await db
        .from('company_flows')
        .select('initial_product_plan_id')
        .eq('id', flowId)
        .single();
      
      // Try to get product name from Whop API if we have plan ID
      if (flowData?.initial_product_plan_id && process.env.WHOP_API_KEY) {
        try {
          const planResponse = await fetch(
            `https://api.whop.com/api/v2/plans/${flowData.initial_product_plan_id}`,
            {
              headers: {
                'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
              },
            }
          );
          if (planResponse.ok) {
            const planData = await planResponse.json();
            initialProductName = planData.title || planData.product?.title || 'Product';
          }
        } catch (e) {
          console.error('Error fetching plan name:', e);
        }
      }
    }

    // Format purchases for the confirmation page
    const formattedPurchases = (purchases || []).map((purchase: any) => {
      const nodeTitle = purchase.node_id ? nodeTitles[purchase.node_id] : null;
      // For initial purchases without node_id, use initial product name
      const productName = nodeTitle || (purchase.purchase_type === 'initial' ? initialProductName : 'Product');
      
      return {
        name: productName,
        price: Number(purchase.amount) || 0,
        type: purchase.purchase_type === 'initial' ? 'one_time' : 'one_time', // Most are one-time for now
        purchaseType: purchase.purchase_type,
        purchasedAt: purchase.purchased_at,
      };
    });

    const response = NextResponse.json({
      purchases: formattedPurchases,
      total: formattedPurchases.reduce((sum, p) => sum + p.price, 0),
    });
    
    // Add CORS headers for cross-origin iframe embedding
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    
    return response;
  } catch (error) {
    console.error('Error fetching purchases:', error);
    const errorResponse = NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch purchases' },
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

