import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// Track a purchase in a flow
export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured() || !supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { flow_id, company_id, member_id, plan_id, purchase_type, node_id, amount, currency, session_id } = body;

    if (!flow_id || !company_id || !member_id || !plan_id || !purchase_type || amount === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('flow_purchases')
      .insert({
        flow_id,
        company_id,
        member_id,
        plan_id,
        purchase_type,
        node_id: node_id || null,
        amount,
        currency: currency || 'usd',
        session_id: session_id || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, purchase_id: data.id });
  } catch (error) {
    console.error('Error tracking purchase:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to track purchase' },
      { status: 500 }
    );
  }
}

