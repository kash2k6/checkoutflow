import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// Create or update a flow
export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured() || !supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { company_id, initial_product_plan_id, confirmation_page_url, flow_name, facebook_pixel_id, confirmation_customization, id } = body;

    if (!company_id) {
      return NextResponse.json(
        { error: 'Missing required field: company_id' },
        { status: 400 }
      );
    }

    // initial_product_plan_id is required for updates, but optional for new flows (can be set later)
    if (id && !initial_product_plan_id) {
      return NextResponse.json(
        { error: 'Missing required field: initial_product_plan_id (required for updates)' },
        { status: 400 }
      );
    }

    let flow;
    if (id) {
      // Update existing flow by ID
      // If flow_name is being updated, check if it conflicts with another flow
      if (flow_name) {
        const { data: existingFlow } = await supabase
          .from('company_flows')
          .select('id, flow_name')
          .eq('company_id', company_id)
          .eq('flow_name', flow_name)
          .neq('id', id) // Exclude the current flow
          .single();

        if (existingFlow) {
          return NextResponse.json(
            { error: `A flow named "${flow_name}" already exists for this company. Please choose a different name.` },
            { status: 409 } // Conflict status code
          );
        }
      }

      const { data, error } = await supabase
        .from('company_flows')
        .update({
          initial_product_plan_id,
          confirmation_page_url: confirmation_page_url || null,
          flow_name: flow_name || null,
          facebook_pixel_id: facebook_pixel_id || null,
          confirmation_customization: confirmation_customization || {},
        })
        .eq('id', id)
        .eq('company_id', company_id)
        .select()
        .single();

      if (error) {
        // Handle duplicate key constraint violation
        if (error.code === '23505' && error.details?.includes('idx_company_flows_company_name')) {
          return NextResponse.json(
            { error: `A flow named "${flow_name}" already exists for this company. Please choose a different name.` },
            { status: 409 } // Conflict status code
          );
        }
        throw error;
      }
      flow = data;
      
      // If confirmation_page_url was updated, also update all edges with target_type='confirmation'
      if (confirmation_page_url !== undefined) {
        const { error: edgesError } = await supabase
          .from('flow_edges')
          .update({
            target_url: confirmation_page_url || null,
          })
          .eq('flow_id', id)
          .eq('target_type', 'confirmation');
        
        if (edgesError) {
          console.error('Error updating confirmation edges:', edgesError);
        } else {
          console.log(`Updated confirmation edges for flow ${id} with new confirmation_page_url: ${confirmation_page_url || 'null'}`);
        }
      }
    } else {
      // Create new flow (initial_product_plan_id can be empty/null for new flows)
      const insertData: any = {
        company_id,
        confirmation_page_url: confirmation_page_url || null,
        flow_name: flow_name || `Flow ${new Date().toLocaleDateString()}`,
        facebook_pixel_id: facebook_pixel_id || null,
        confirmation_customization: confirmation_customization || {},
      };
      
      // Only include initial_product_plan_id if it's provided and not empty
      if (initial_product_plan_id && initial_product_plan_id.trim() !== '') {
        insertData.initial_product_plan_id = initial_product_plan_id;
      }

      // Check if a flow with this name already exists for this company
      const finalFlowName = insertData.flow_name;
      if (finalFlowName) {
        const { data: existingFlow } = await supabase
          .from('company_flows')
          .select('id, flow_name')
          .eq('company_id', company_id)
          .eq('flow_name', finalFlowName)
          .single();

        if (existingFlow) {
          return NextResponse.json(
            { error: `A flow named "${finalFlowName}" already exists for this company. Please choose a different name.` },
            { status: 409 } // Conflict status code
          );
        }
      }

      const { data, error } = await supabase
        .from('company_flows')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Supabase error creating flow:', error);
        
        // Handle duplicate key constraint violation
        if (error.code === '23505' && error.details?.includes('idx_company_flows_company_name')) {
          return NextResponse.json(
            { error: `A flow named "${finalFlowName}" already exists for this company. Please choose a different name.` },
            { status: 409 } // Conflict status code
          );
        }
        
        throw error;
      }
      flow = data;
    }

    // Get nodes for this flow
    const { data: nodes } = await supabase
      .from('flow_nodes')
      .select('*')
      .eq('flow_id', flow.id)
      .order('node_type', { ascending: true })
      .order('order_index', { ascending: true });

    return NextResponse.json({
      ...flow,
      nodes: nodes || [],
    });
  } catch (error: any) {
    console.error('Error creating/updating flow:', error);
    
    // Handle duplicate key constraint violation in catch block as fallback
    if (error?.code === '23505' && error?.details?.includes('idx_company_flows_company_name')) {
      const flowName = error?.details?.match(/flow_name\)=\([^,]+,\s*([^)]+)\)/)?.[1] || 'this name';
      return NextResponse.json(
        { error: `A flow named "${flowName}" already exists for this company. Please choose a different name.` },
        { status: 409 } // Conflict status code
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save flow' },
      { status: 500 }
    );
  }
}

// Update flow
export async function PUT(request: NextRequest) {
  try {
    if (!isSupabaseConfigured() || !supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { id, company_id, initial_product_plan_id, confirmation_page_url, flow_name, facebook_pixel_id, checkout_theme, checkout_customization, confirmation_customization } = body;

    if (!id || !company_id || !initial_product_plan_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // If flow_name is being updated, check if it conflicts with another flow
    if (flow_name) {
      const { data: existingFlow } = await supabase
        .from('company_flows')
        .select('id, flow_name')
        .eq('company_id', company_id)
        .eq('flow_name', flow_name)
        .neq('id', id) // Exclude the current flow
        .single();

      if (existingFlow) {
        return NextResponse.json(
          { error: `A flow named "${flow_name}" already exists for this company. Please choose a different name.` },
          { status: 409 } // Conflict status code
        );
      }
    }

    // Log what we're trying to save
    console.log('Saving checkout_customization:', JSON.stringify(checkout_customization));
    
    const { data, error } = await supabase
      .from('company_flows')
      .update({
        initial_product_plan_id,
        confirmation_page_url: confirmation_page_url || null,
        flow_name: flow_name || null,
        facebook_pixel_id: facebook_pixel_id || null,
        checkout_theme: checkout_theme || 'system',
        checkout_customization: checkout_customization ? JSON.parse(JSON.stringify(checkout_customization)) : {},
        confirmation_customization: confirmation_customization ? JSON.parse(JSON.stringify(confirmation_customization)) : {},
      })
      .eq('id', id)
      .eq('company_id', company_id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating flow:', error);
      
      // Handle duplicate key constraint violation
      if (error.code === '23505' && error.details?.includes('idx_company_flows_company_name')) {
        return NextResponse.json(
          { error: `A flow named "${flow_name}" already exists for this company. Please choose a different name.` },
          { status: 409 } // Conflict status code
        );
      }
    } else {
      console.log('Flow updated successfully. checkout_customization:', JSON.stringify(data?.checkout_customization));
    }

    if (error) throw error;

    // If confirmation_page_url was updated, also update all edges with target_type='confirmation'
    // to use the new URL (so they don't have stale URLs)
    if (confirmation_page_url !== undefined) {
      const { error: edgesError } = await supabase
        .from('flow_edges')
        .update({
          target_url: confirmation_page_url || null,
        })
        .eq('flow_id', id)
        .eq('target_type', 'confirmation');
      
      if (edgesError) {
        console.error('Error updating confirmation edges:', edgesError);
        // Don't fail the request, just log the error
      } else {
        console.log(`Updated confirmation edges for flow ${id} with new confirmation_page_url: ${confirmation_page_url || 'null'}`);
      }
    }

    // Get nodes for this flow
    const { data: nodes } = await supabase
      .from('flow_nodes')
      .select('*')
      .eq('flow_id', data.id)
      .order('node_type', { ascending: true })
      .order('order_index', { ascending: true });

    return NextResponse.json({
      ...data,
      nodes: nodes || [],
    });
  } catch (error: any) {
    console.error('Error updating flow:', error);
    
    // Handle duplicate key constraint violation in catch block as fallback
    if (error?.code === '23505' && error?.details?.includes('idx_company_flows_company_name')) {
      const flowName = error?.details?.match(/flow_name\)=\([^,]+,\s*([^)]+)\)/)?.[1] || 'this name';
      return NextResponse.json(
        { error: `A flow named "${flowName}" already exists for this company. Please choose a different name.` },
        { status: 409 } // Conflict status code
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update flow' },
      { status: 500 }
    );
  }
}

