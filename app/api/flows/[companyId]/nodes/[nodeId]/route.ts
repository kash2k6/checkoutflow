import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// Update a node
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string; nodeId: string }> }
) {
  try {
    const { companyId, nodeId } = await params;
    const body = await request.json();

    if (!isSupabaseConfigured() || !supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      );
    }

    // Verify node belongs to company's flow
    const { data: node } = await supabase
      .from('flow_nodes')
      .select('flow_id, company_flows!inner(company_id)')
      .eq('id', nodeId)
      .single();

    if (!node || (node.company_flows as any).company_id !== companyId) {
      return NextResponse.json(
        { error: 'Node not found or access denied' },
        { status: 404 }
      );
    }

    const {
      flow_id,
      node_type,
      plan_id,
      title,
      description,
      price,
      original_price,
      redirect_url,
      order_index,
      facebook_pixel_id,
      customization,
    } = body;

    // Verify flow_id matches if provided
    if (flow_id) {
      const { data: flowCheck } = await supabase
        .from('company_flows')
        .select('id, company_id')
        .eq('id', flow_id)
        .eq('company_id', companyId)
        .single();

      if (!flowCheck) {
        return NextResponse.json(
          { error: 'Flow not found or access denied' },
          { status: 404 }
        );
      }
    }

    const updateData: any = {};
    if (node_type !== undefined) updateData.node_type = node_type;
    if (plan_id !== undefined) updateData.plan_id = plan_id;
    if (title !== undefined) updateData.title = title || null;
    if (description !== undefined) updateData.description = description || null;
    if (price !== undefined) updateData.price = price || null;
    if (original_price !== undefined) updateData.original_price = original_price || null;
    if (redirect_url !== undefined) updateData.redirect_url = redirect_url;
    if (order_index !== undefined) updateData.order_index = order_index;
    if (facebook_pixel_id !== undefined) updateData.facebook_pixel_id = facebook_pixel_id || null;
    if (customization !== undefined) updateData.customization = customization || {};

    const { data, error } = await supabase
      .from('flow_nodes')
      .update(updateData)
      .eq('id', nodeId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating node:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update node' },
      { status: 500 }
    );
  }
}

// Delete a node
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string; nodeId: string }> }
) {
  try {
    const { companyId, nodeId } = await params;
    const body = await request.json().catch(() => ({})); // Optional body
    const { flow_id } = body;

    if (!isSupabaseConfigured() || !supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      );
    }

    // Verify node belongs to company's flow
    let query = supabase
      .from('flow_nodes')
      .select('flow_id, company_flows!inner(company_id)')
      .eq('id', nodeId);

    // If flow_id is provided, also verify it matches
    if (flow_id) {
      query = query.eq('flow_id', flow_id);
    }

    const { data: node } = await query.single();

    if (!node || (node.company_flows as any).company_id !== companyId) {
      return NextResponse.json(
        { error: 'Node not found or access denied' },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from('flow_nodes')
      .delete()
      .eq('id', nodeId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting node:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete node' },
      { status: 500 }
    );
  }
}

