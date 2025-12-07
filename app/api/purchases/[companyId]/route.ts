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

    // Get purchases, ordered by purchase time
    const { data: purchases, error } = await query.order('purchased_at', { ascending: true });

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

    // Format purchases for the confirmation page
    const formattedPurchases = (purchases || []).map((purchase: any) => {
      const nodeTitle = purchase.node_id ? nodeTitles[purchase.node_id] : null;
      
      return {
        name: nodeTitle || 'Product',
        price: Number(purchase.amount) || 0,
        type: purchase.purchase_type === 'initial' ? 'one_time' : 'one_time', // Most are one-time for now
        purchaseType: purchase.purchase_type,
        purchasedAt: purchase.purchased_at,
      };
    });

    return NextResponse.json({
      purchases: formattedPurchases,
      total: formattedPurchases.reduce((sum, p) => sum + p.price, 0),
    });
  } catch (error) {
    console.error('Error fetching purchases:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch purchases' },
      { status: 500 }
    );
  }
}

