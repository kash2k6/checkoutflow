import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// Create a new node
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

    if (!flow_id || !node_type || !plan_id || !redirect_url) {
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
      .from('flow_nodes')
      .insert({
        flow_id,
        node_type,
        plan_id,
        title: title || null,
        description: description || null,
        price: price || null,
        original_price: original_price || null,
        redirect_url,
        order_index: order_index || 0,
        facebook_pixel_id: facebook_pixel_id || null,
        customization: customization || {},
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating node:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create node' },
      { status: 500 }
    );
  }
}

