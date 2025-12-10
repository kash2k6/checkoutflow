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

async function checkSessionPurchases() {
  const companyId = 'biz_nULEeITGXYHdQ2';
  const memberId = 'mber_F7StCPtXuYI9q';
  const sessionId = 'session_1765382312585_uzcfirpp0';
  const flowId = '49652c37-eba0-4c6a-8459-fd78f664892f';

  console.log('Checking purchases for:');
  console.log(`  Company ID: ${companyId}`);
  console.log(`  Member ID: ${memberId}`);
  console.log(`  Session ID: ${sessionId}`);
  console.log(`  Flow ID: ${flowId}`);
  console.log('\n--- All Purchases for Member (No Filter) ---\n');

  // Get ALL purchases for this member
  const { data: allPurchases, error: allError } = await supabase
    .from('flow_purchases')
    .select('*')
    .eq('member_id', memberId)
    .eq('company_id', companyId)
    .order('purchased_at', { ascending: true });

  if (allError) {
    console.error('Error fetching all purchases:', allError);
    return;
  }

  console.log(`Found ${allPurchases?.length || 0} total purchases for this member:\n`);
  
  if (allPurchases && allPurchases.length > 0) {
    allPurchases.forEach((purchase, idx) => {
      console.log(`${idx + 1}. Purchase ID: ${purchase.id}`);
      console.log(`   Type: ${purchase.purchase_type}`);
      console.log(`   Amount: $${purchase.amount || '0.00'}`);
      console.log(`   Session ID: ${purchase.session_id || '❌ NULL/MISSING'}`);
      console.log(`   Flow ID: ${purchase.flow_id}`);
      console.log(`   Node ID: ${purchase.node_id || 'N/A'}`);
      console.log(`   Purchased At: ${purchase.purchased_at}`);
      console.log(`   Matches target session? ${purchase.session_id === sessionId ? '✅ YES' : '❌ NO'}`);
      console.log('');
    });
  } else {
    console.log('No purchases found for this member.\n');
  }

  console.log('\n--- Purchases Filtered by Session ID ---\n');

  // Get purchases filtered by sessionId
  const { data: sessionPurchases, error: sessionError } = await supabase
    .from('flow_purchases')
    .select('*')
    .eq('member_id', memberId)
    .eq('company_id', companyId)
    .eq('session_id', sessionId)
    .order('purchased_at', { ascending: true });

  if (sessionError) {
    console.error('Error fetching session purchases:', sessionError);
    return;
  }

  console.log(`Found ${sessionPurchases?.length || 0} purchases with session ID "${sessionId}":\n`);
  
  if (sessionPurchases && sessionPurchases.length > 0) {
    sessionPurchases.forEach((purchase, idx) => {
      console.log(`${idx + 1}. Purchase ID: ${purchase.id}`);
      console.log(`   Type: ${purchase.purchase_type}`);
      console.log(`   Amount: $${purchase.amount || '0.00'}`);
      console.log(`   Node ID: ${purchase.node_id || 'N/A'}`);
      console.log(`   Purchased At: ${purchase.purchased_at}`);
      console.log('');
    });
  } else {
    console.log('⚠️  NO PURCHASES FOUND with this session ID!');
    console.log('   This means either:');
    console.log('   1. Purchases were not saved with session_id');
    console.log('   2. The session_id values don\'t match');
    console.log('   3. No purchases were made in this session\n');
  }

  console.log('\n--- Purchases Filtered by Flow ID ---\n');

  // Get purchases filtered by flowId
  const { data: flowPurchases, error: flowError } = await supabase
    .from('flow_purchases')
    .select('*')
    .eq('member_id', memberId)
    .eq('company_id', companyId)
    .eq('flow_id', flowId)
    .order('purchased_at', { ascending: true });

  if (flowError) {
    console.error('Error fetching flow purchases:', flowError);
    return;
  }

  console.log(`Found ${flowPurchases?.length || 0} purchases for flow "${flowId}":\n`);
  
  if (flowPurchases && flowPurchases.length > 0) {
    flowPurchases.forEach((purchase, idx) => {
      console.log(`${idx + 1}. Purchase ID: ${purchase.id}`);
      console.log(`   Type: ${purchase.purchase_type}`);
      console.log(`   Amount: $${purchase.amount || '0.00'}`);
      console.log(`   Session ID: ${purchase.session_id || '❌ NULL/MISSING'}`);
      console.log(`   Node ID: ${purchase.node_id || 'N/A'}`);
      console.log(`   Purchased At: ${purchase.purchased_at}`);
      console.log(`   Matches target session? ${purchase.session_id === sessionId ? '✅ YES' : '❌ NO'}`);
      console.log('');
    });
  }

  console.log('\n--- Summary ---\n');
  console.log(`Total purchases for member: ${allPurchases?.length || 0}`);
  console.log(`Purchases with matching session ID: ${sessionPurchases?.length || 0}`);
  console.log(`Purchases for this flow: ${flowPurchases?.length || 0}`);
  
  if (sessionPurchases && sessionPurchases.length === 0 && allPurchases && allPurchases.length > 0) {
    console.log('\n⚠️  ISSUE DETECTED:');
    console.log('   Purchases exist but none have the matching session_id!');
    console.log('   This means purchases are not being saved with session_id.');
    console.log('   Check the purchase tracking code to ensure session_id is being passed.\n');
    
    // Check if any purchases have null session_id
    const nullSessionPurchases = allPurchases?.filter(p => !p.session_id);
    if (nullSessionPurchases && nullSessionPurchases.length > 0) {
      console.log(`   Found ${nullSessionPurchases.length} purchases with NULL session_id.`);
      console.log('   These need to be updated or future purchases need to include session_id.\n');
    }
  }
}

checkSessionPurchases().catch(console.error);

