import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { checkSubscriptionAccessInApi } from '@/lib/subscription-api-helpers';

interface FlowData {
  id: string;
  flow_name: string | null;
  initial_product_plan_id: string | null;
  confirmation_page_url: string | null;
  created_at: string;
  updated_at: string;
}

// List all flows for a company
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

    // TypeScript: supabase is guaranteed to be non-null after the check above
    const db = supabase;

    console.log('Fetching flows for company_id:', companyId, 'Type:', typeof companyId);
    
    // First, let's check what flows exist in the database (for debugging)
    // Include initial_product_plan_id in this query to see if it's available
    const { data: allFlows, error: allFlowsError } = await db
      .from('company_flows')
      .select('id, flow_name, company_id, initial_product_plan_id')
      .order('created_at', { ascending: false });
    
    if (allFlowsError) {
      console.error('Error fetching all flows:', allFlowsError);
    } else {
      console.log('All flows in database (for debugging):', JSON.stringify(allFlows, null, 2));
      const matchingFlows = allFlows?.filter(f => {
        const matches = f.company_id === companyId;
        console.log(`Flow ${f.id} (${f.flow_name}): company_id="${f.company_id}" (type: ${typeof f.company_id}) === "${companyId}" (type: ${typeof companyId}) = ${matches}`);
        return matches;
      });
      console.log('Flows matching company_id:', JSON.stringify(matchingFlows, null, 2));
    }
    
    // Get all flows for company
    // Use ilike for case-insensitive matching and ensure we're comparing strings
    let flows: FlowData[] | null = null;
    let error;
    
    const { data: flowsQuery, error: queryError } = await db
      .from('company_flows')
      .select('id, flow_name, initial_product_plan_id, confirmation_page_url, created_at, updated_at')
      .eq('company_id', String(companyId).trim())
      .order('created_at', { ascending: false });
    
    if (queryError) {
      error = queryError;
    } else {
      flows = flowsQuery;
      console.log('Raw Supabase query result:', JSON.stringify(flowsQuery, null, 2));
      console.log('First flow initial_product_plan_id:', flowsQuery?.[0]?.initial_product_plan_id);
    }
    
    // If query returns fewer flows than expected, try alternative query with manual filtering
    if (flows && allFlows && flows.length < allFlows.filter(f => String(f.company_id).trim() === String(companyId).trim()).length) {
      console.warn('Query returned fewer flows than expected. Using manual filtering...');
      const matchingFlows = allFlows.filter(f => String(f.company_id).trim() === String(companyId).trim());
      
      // Get full details for matching flows
      if (matchingFlows.length > 0) {
        const flowIds = matchingFlows.map(f => f.id);
        console.log('Querying flows by IDs:', flowIds);
        
        // Try to get the initial_product_plan_id from allFlows first (if we included it)
        const flowsWithProductId = matchingFlows.map(mf => {
          const allFlowData = allFlows?.find(af => af.id === mf.id);
          return {
            ...mf,
            initial_product_plan_id: allFlowData?.initial_product_plan_id || null
          };
        });
        
        console.log('Flows with product ID from allFlows:', flowsWithProductId.map(f => ({ id: f.id, initial_product_plan_id: f.initial_product_plan_id })));
        
        // Now query for full details
        const { data: fullFlows, error: fullError } = await db
          .from('company_flows')
          .select('id, flow_name, initial_product_plan_id, confirmation_page_url, created_at, updated_at')
          .in('id', flowIds)
          .order('created_at', { ascending: false });
        
        console.log('Full flows query result:', JSON.stringify(fullFlows, null, 2));
        console.log('Full flows query error:', fullError);
        
        // Merge the initial_product_plan_id from allFlows if the query returned null
        if (!fullError && fullFlows) {
          const mergedFlows = fullFlows.map(ff => {
            const withProductId = flowsWithProductId.find(f => f.id === ff.id);
            if (withProductId && withProductId.initial_product_plan_id && !ff.initial_product_plan_id) {
              console.log(`Merging initial_product_plan_id for flow ${ff.id}: ${withProductId.initial_product_plan_id}`);
              return {
                ...ff,
                initial_product_plan_id: withProductId.initial_product_plan_id
              };
            }
            return ff;
          });
          
          if (mergedFlows.length > flows.length || mergedFlows.some(f => f.initial_product_plan_id && !flows.find(orig => orig.id === f.id && orig.initial_product_plan_id))) {
            console.log('Using manually filtered flows with merged product IDs:', mergedFlows.length);
            flows = mergedFlows;
          }
        }
      }
    }

    if (error && !flows) {
      console.error('Supabase error fetching flows:', error);
      throw error;
    }

    console.log('Found flows for company:', flows?.length || 0, flows);

    // Return debug info to help diagnose the issue
    const debugInfo = {
      debug: {
        companyId,
        allFlowsInDb: allFlows?.length || 0,
        allFlows: allFlows?.map(f => ({ id: f.id, name: f.flow_name, company_id: f.company_id })) || [],
        matchingFlows: allFlows?.filter(f => f.company_id === companyId)?.map(f => ({ id: f.id, name: f.flow_name })) || [],
        queryResultCount: flows?.length || 0,
        queryResult: flows?.map(f => ({ 
          id: f.id, 
          name: f.flow_name,
          initial_product_plan_id: f.initial_product_plan_id 
        })) || [],
        rawFlows: flows || [], // Include full flow objects for debugging
      }
    };

    return NextResponse.json({
      flows: flows || [],
      ...debugInfo,
    });
  } catch (error) {
    console.error('Error fetching flows:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch flows' },
      { status: 500 }
    );
  }
}

