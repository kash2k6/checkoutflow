import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// Get analytics for a company's flows
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    const { searchParams } = request.nextUrl;
    const flowId = searchParams.get('flowId'); // Optional: specific flow
    const startDate = searchParams.get('startDate'); // Optional: date range
    const endDate = searchParams.get('endDate');

    if (!isSupabaseConfigured() || !supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      );
    }

    // Build date filter
    let dateFilter = '';
    if (startDate) {
      dateFilter += `AND visited_at >= '${startDate}'::timestamp`;
    }
    if (endDate) {
      dateFilter += `AND visited_at <= '${endDate}'::timestamp`;
    }

    // Get all flows for company (or specific flow)
    let flowsQuery = supabase
      .from('company_flows')
      .select('id, flow_name, created_at');
    
    if (flowId) {
      flowsQuery = flowsQuery.eq('id', flowId);
    } else {
      flowsQuery = flowsQuery.eq('company_id', companyId);
    }

    const { data: flows, error: flowsError } = await flowsQuery;

    if (flowsError) throw flowsError;

    // Get analytics for each flow
    const analytics = await Promise.all(
      (flows || []).map(async (flow) => {
        // Get visits
        let visitsQuery = supabase
          .from('flow_visits')
          .select('id, page_type, visited_at', { count: 'exact' })
          .eq('flow_id', flow.id);
        
        if (startDate) {
          visitsQuery = visitsQuery.gte('visited_at', startDate);
        }
        if (endDate) {
          visitsQuery = visitsQuery.lte('visited_at', endDate);
        }

        const { data: visits, count: visitsCount } = await visitsQuery;

        // Get purchases
        let purchasesQuery = supabase
          .from('flow_purchases')
          .select('id, purchase_type, amount, purchased_at', { count: 'exact' })
          .eq('flow_id', flow.id);
        
        if (startDate) {
          purchasesQuery = purchasesQuery.gte('purchased_at', startDate);
        }
        if (endDate) {
          purchasesQuery = purchasesQuery.lte('purchased_at', endDate);
        }

        const { data: purchases, count: purchasesCount } = await purchasesQuery;

        // Calculate metrics
        const checkoutVisits = visits?.filter(v => v.page_type === 'checkout').length || 0;
        const totalRevenue = purchases?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0;
        const conversionRate = checkoutVisits > 0 
          ? ((purchases?.filter(p => p.purchase_type === 'initial').length || 0) / checkoutVisits * 100).toFixed(2)
          : '0.00';

        // Get purchases by type
        const purchasesByType = {
          initial: purchases?.filter(p => p.purchase_type === 'initial').length || 0,
          upsell: purchases?.filter(p => p.purchase_type === 'upsell').length || 0,
          downsell: purchases?.filter(p => p.purchase_type === 'downsell').length || 0,
          cross_sell: purchases?.filter(p => p.purchase_type === 'cross_sell').length || 0,
        };

        return {
          flow_id: flow.id,
          flow_name: flow.flow_name || 'Unnamed Flow',
          visits: {
            total: visitsCount || 0,
            checkout: checkoutVisits,
            upsell: visits?.filter(v => v.page_type === 'upsell').length || 0,
            downsell: visits?.filter(v => v.page_type === 'downsell').length || 0,
            cross_sell: visits?.filter(v => v.page_type === 'cross_sell').length || 0,
            confirmation: visits?.filter(v => v.page_type === 'confirmation').length || 0,
          },
          purchases: {
            total: purchasesCount || 0,
            by_type: purchasesByType,
            revenue: totalRevenue,
          },
          conversion_rate: parseFloat(conversionRate),
        };
      })
    );

    return NextResponse.json({
      analytics,
      summary: {
        total_flows: analytics.length,
        total_visits: analytics.reduce((sum, a) => sum + a.visits.total, 0),
        total_purchases: analytics.reduce((sum, a) => sum + a.purchases.total, 0),
        total_revenue: analytics.reduce((sum, a) => sum + a.purchases.revenue, 0),
        average_conversion_rate: analytics.length > 0
          ? (analytics.reduce((sum, a) => sum + a.conversion_rate, 0) / analytics.length).toFixed(2)
          : '0.00',
      },
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

