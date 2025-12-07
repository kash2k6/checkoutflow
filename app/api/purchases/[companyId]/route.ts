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
      .select('*, flow_nodes:node_id(title, plan_id), company_flows:flow_id(initial_product_plan_id)')
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

    // Format purchases for the confirmation page
    const formattedPurchases = (purchases || []).map((purchase: any) => {
      const nodeTitle = purchase.flow_nodes?.title;
      const planId = purchase.flow_nodes?.plan_id || purchase.company_flows?.initial_product_plan_id || purchase.plan_id;
      
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

