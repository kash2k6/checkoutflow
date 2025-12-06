import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// Get edges for a node or flow
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    const { searchParams } = request.nextUrl;
    const flowId = searchParams.get('flowId');
    const nodeId = searchParams.get('nodeId');

    if (!isSupabaseConfigured() || !supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      );
    }

    if (!flowId) {
      return NextResponse.json(
        { error: 'flowId is required' },
        { status: 400 }
      );
    }

    // Verify flow belongs to company
    const { data: flow } = await supabase
      .from('company_flows')
      .select('id')
      .eq('id', flowId)
      .eq('company_id', companyId)
      .single();

    if (!flow) {
      return NextResponse.json(
        { error: 'Flow not found or access denied' },
        { status: 404 }
      );
    }

    let query = supabase
      .from('flow_edges')
      .select('*')
      .eq('flow_id', flowId);

    if (nodeId) {
      query = query.eq('from_node_id', nodeId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error fetching edges:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch edges' },
      { status: 500 }
    );
  }
}

// Create a new edge
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    const body = await request.json();

    if (!isSupabaseConfigured() || !supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      );
    }

    const {
      from_node_id,
      to_node_id,
      action,
      flow_id,
      target_type,
      target_url,
    } = body;

    if (!from_node_id || !action || !flow_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify flow belongs to company
    const { data: flow } = await supabase
      .from('company_flows')
      .select('id')
      .eq('id', flow_id)
      .eq('company_id', companyId)
      .single();

    if (!flow) {
      return NextResponse.json(
        { error: 'Flow not found or access denied' },
        { status: 404 }
      );
    }

    const { data, error } = await supabase
      .from('flow_edges')
      .insert({
        from_node_id,
        to_node_id: target_type === 'node' ? to_node_id : null,
        action,
        flow_id,
        target_type: target_type || 'node',
        target_url: target_url || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating edge:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create edge' },
      { status: 500 }
    );
  }
}

// Delete edges for a node
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    const { searchParams } = request.nextUrl;
    const flowId = searchParams.get('flowId');
    const nodeId = searchParams.get('nodeId');

    if (!isSupabaseConfigured() || !supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      );
    }

    if (!flowId || !nodeId) {
      return NextResponse.json(
        { error: 'flowId and nodeId are required' },
        { status: 400 }
      );
    }

    // Verify flow belongs to company
    const { data: flow } = await supabase
      .from('company_flows')
      .select('id')
      .eq('id', flowId)
      .eq('company_id', companyId)
      .single();

    if (!flow) {
      return NextResponse.json(
        { error: 'Flow not found or access denied' },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from('flow_edges')
      .delete()
      .eq('flow_id', flowId)
      .eq('from_node_id', nodeId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting edges:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete edges' },
      { status: 500 }
    );
  }
}

