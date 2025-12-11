import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

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

    // Subscription checks removed - app is now free to use
    const response = NextResponse.json({
      ...flow,
      nodes: nodes || [],
      enabled: true, // Always enabled - no subscription required
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

// Delete a flow
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;

    if (!isSupabaseConfigured() || !supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      );
    }

    // Get flowId from query params
    const { searchParams } = request.nextUrl;
    const flowId = searchParams.get('flowId');

    if (!flowId) {
      return NextResponse.json(
        { error: 'flowId is required' },
        { status: 400 }
      );
    }

    // Verify flow belongs to company before deleting
    const { data: flow, error: flowError } = await supabase
      .from('company_flows')
      .select('id, flow_name, company_id')
      .eq('id', flowId)
      .eq('company_id', companyId)
      .single();

    if (flowError || !flow) {
      if (flowError?.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Flow not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: 'Flow not found or access denied' },
        { status: 404 }
      );
    }

    // Delete the flow (CASCADE will automatically delete related nodes, edges, and analytics)
    const { error: deleteError } = await supabase
      .from('company_flows')
      .delete()
      .eq('id', flowId)
      .eq('company_id', companyId);

    if (deleteError) {
      console.error('Error deleting flow:', deleteError);
      throw deleteError;
    }

    console.log(`Flow ${flowId} (${flow.flow_name}) deleted successfully`);

    return NextResponse.json({ 
      success: true,
      message: `Flow "${flow.flow_name}" deleted successfully`,
    });
  } catch (error) {
    console.error('Error deleting flow:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete flow' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}

