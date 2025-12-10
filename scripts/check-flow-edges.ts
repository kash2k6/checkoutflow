import dotenv from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  console.error('Need: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFlowEdges() {
  const flowId = '49652c37-eba0-4c6a-8459-fd78f664892f';
  const companyId = 'biz_nULEeITGXYHdQ2';

  console.log('Checking flow:', flowId);
  console.log('Company ID:', companyId);
  console.log('\n--- Flow Configuration ---\n');

  // Get flow
  const { data: flow, error: flowError } = await supabase
    .from('company_flows')
    .select('*')
    .eq('id', flowId)
    .single();

  if (flowError) {
    console.error('Error fetching flow:', flowError);
    return;
  }

  console.log('Flow:', JSON.stringify(flow, null, 2));
  console.log('\n--- Flow Nodes ---\n');

  // Get nodes
  const { data: nodes, error: nodesError } = await supabase
    .from('flow_nodes')
    .select('*')
    .eq('flow_id', flowId)
    .order('node_type', { ascending: true })
    .order('order_index', { ascending: true });

  if (nodesError) {
    console.error('Error fetching nodes:', nodesError);
  } else {
    console.log(`Found ${nodes?.length || 0} nodes:\n`);
    nodes?.forEach((node, idx) => {
      console.log(`${idx + 1}. ${node.node_type.toUpperCase()} (order: ${node.order_index})`);
      console.log(`   ID: ${node.id}`);
      console.log(`   Title: ${node.title || 'N/A'}`);
      console.log(`   Plan ID: ${node.plan_id}`);
      console.log(`   Price: $${node.price || '0.00'}`);
      console.log('');
    });
  }

  console.log('\n--- Flow Edges (Logic) ---\n');

  // Get edges
  const { data: edges, error: edgesError } = await supabase
    .from('flow_edges')
    .select('*')
    .eq('flow_id', flowId);

  if (edgesError) {
    console.error('Error fetching edges:', edgesError);
  } else {
    console.log(`Found ${edges?.length || 0} edges:\n`);
    
    if (!edges || edges.length === 0) {
      console.log('⚠️  NO EDGES CONFIGURED - This means all navigation uses fallback logic!');
      console.log('   When declining an upsell, it will use fallback to find next downsell.');
      console.log('   When no more nodes, it should go to confirmation.\n');
    }

    // Group edges by from_node
    const edgesByNode: Record<string, typeof edges> = {};
    edges?.forEach(edge => {
      if (!edgesByNode[edge.from_node_id]) {
        edgesByNode[edge.from_node_id] = [];
      }
      edgesByNode[edge.from_node_id].push(edge);
    });

    // Display edges for each node
    Object.entries(edgesByNode).forEach(([fromNodeId, nodeEdges]) => {
      const fromNode = nodes?.find(n => n.id === fromNodeId);
      console.log(`From: ${fromNode?.node_type.toUpperCase()} - ${fromNode?.title || fromNodeId}`);
      
      nodeEdges.forEach(edge => {
        console.log(`  ${edge.action.toUpperCase()}:`);
        console.log(`    Type: ${edge.target_type}`);
        
        if (edge.target_type === 'node' && edge.to_node_id) {
          const toNode = nodes?.find(n => n.id === edge.to_node_id);
          console.log(`    → ${toNode?.node_type.toUpperCase()} - ${toNode?.title || edge.to_node_id}`);
        } else if (edge.target_type === 'confirmation') {
          console.log(`    → CONFIRMATION PAGE: ${edge.target_url || flow.confirmation_page_url || 'Flow default'}`);
        } else if (edge.target_type === 'external_url') {
          console.log(`    → EXTERNAL URL: ${edge.target_url}`);
        }
      });
      console.log('');
    });

    // Check for potential issues
    console.log('\n--- Potential Issues ---\n');
    
    // Check if any node has decline -> confirmation pointing to wrong URL
    edges?.forEach(edge => {
      if (edge.action === 'decline' && edge.target_type === 'confirmation') {
        const targetUrl = edge.target_url || flow.confirmation_page_url;
        if (targetUrl && targetUrl.includes('systeme.io') && !targetUrl.includes('/confirmation')) {
          console.log(`⚠️  ISSUE: Decline edge from node ${edge.from_node_id}`);
          console.log(`   Points to external confirmation URL: ${targetUrl}`);
          console.log(`   This URL might be embedding our upsell script, causing upsells to show on confirmation page!`);
          console.log(`   The external page URL contains companyId, flowId, memberId which might trigger upsell embed.\n`);
        }
      }
    });

    // Check if confirmation_page_url has nodeId parameter
    if (flow.confirmation_page_url) {
      try {
        const url = new URL(flow.confirmation_page_url);
        if (url.searchParams.has('nodeId')) {
          console.log(`⚠️  ISSUE: confirmation_page_url contains nodeId parameter!`);
          console.log(`   URL: ${flow.confirmation_page_url}`);
          console.log(`   This will cause the confirmation page to redirect to upsell!\n`);
        }
      } catch (e) {
        // Not a full URL, might be relative
      }
    }
  }

  console.log('\n--- Summary ---\n');
  console.log('If confirmation page is showing upsell:');
  console.log('1. Check if confirmation_page_url is an external URL that embeds our script');
  console.log('2. Check if any decline edges point to confirmation with nodeId in URL');
  console.log('3. Check if the external confirmation page has our embed.js script loaded');
  console.log('4. The embed.js script might be auto-creating upsell containers based on URL params');
}

checkFlowEdges().catch(console.error);

