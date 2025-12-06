import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// Track a visit to a flow page
export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured() || !supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { flow_id, company_id, session_id, page_type, node_id, user_agent, referrer, ip_address } = body;

    if (!flow_id || !company_id || !page_type) {
      return NextResponse.json(
        { error: 'Missing required fields: flow_id, company_id, page_type' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('flow_visits')
      .insert({
        flow_id,
        company_id,
        session_id: session_id || null,
        page_type,
        node_id: node_id || null,
        user_agent: user_agent || null,
        referrer: referrer || null,
        ip_address: ip_address || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, visit_id: data.id });
  } catch (error) {
    console.error('Error tracking visit:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to track visit' },
      { status: 500 }
    );
  }
}

