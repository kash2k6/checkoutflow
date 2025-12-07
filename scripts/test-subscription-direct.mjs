/**
 * Direct test of subscription check functions
 * This bypasses the API and tests the functions directly
 */

import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

const WHOP_SUBSCRIPTION_API_KEY = process.env.WHOP_SUBSCRIPTION_API_KEY;
const WHOP_API_KEY = process.env.WHOP_API_KEY;
const SUBSCRIPTION_PLAN_ID = 'plan_9ykCIXvTEDMyp';
const COMPANY_ID = 'biz_PHQfLZ3o2GvXQn';
const TARGET_COMPANY_ID = process.env.TEST_COMPANY_ID || 'biz_nULEeITGXYHdQ2'; // Company with flow

console.log('🔍 Testing Subscription Check Directly...\n');
console.log('Configuration:');
console.log(`  Subscription Plan ID: ${SUBSCRIPTION_PLAN_ID}`);
console.log(`  Our Company ID: ${COMPANY_ID}`);
console.log(`  Target Company ID: ${TARGET_COMPANY_ID}`);
console.log(`  Subscription API Key: ${WHOP_SUBSCRIPTION_API_KEY ? '✅ Set (' + WHOP_SUBSCRIPTION_API_KEY.substring(0, 20) + '...)' : '❌ Missing'}`);
console.log(`  Main API Key: ${WHOP_API_KEY ? '✅ Set (' + WHOP_API_KEY.substring(0, 20) + '...)' : '❌ Missing'}\n`);

const apiKey = WHOP_SUBSCRIPTION_API_KEY || WHOP_API_KEY;
if (!apiKey) {
  console.error('❌ WHOP_SUBSCRIPTION_API_KEY or WHOP_API_KEY is required. Please set it in .env.local');
  process.exit(1);
}

console.log(`  Using: ${WHOP_SUBSCRIPTION_API_KEY ? 'WHOP_SUBSCRIPTION_API_KEY' : 'WHOP_API_KEY'}\n`);

// Test 1: Check all active subscriptions for our plan
console.log('📋 Test 1: Checking all active subscriptions for our plan...');
const membershipsUrl = new URL('https://api.whop.com/api/v1/memberships');
membershipsUrl.searchParams.set('company_id', COMPANY_ID);
membershipsUrl.searchParams.set('plan_ids', SUBSCRIPTION_PLAN_ID);
membershipsUrl.searchParams.set('status', 'active,trialing');

console.log(`  URL: ${membershipsUrl.toString()}\n`);

try {
  const response = await fetch(membershipsUrl.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`  ❌ Error: ${response.status} ${response.statusText}`);
    console.error(`  ${errorText}`);
    process.exit(1);
  }

  const data = await response.json();
  const memberships = data.data || [];
  
  console.log(`  ✅ Found ${memberships.length} active subscription(s)\n`);
  
  if (memberships.length === 0) {
    console.log('  ⚠️  WARNING: No active subscriptions found!');
    console.log('     This means funnels will be BLOCKED.\n');
  } else {
    console.log('  Active Subscriptions:');
    for (const membership of memberships) {
      console.log(`    - User ID: ${membership.user_id}`);
      console.log(`      Status: ${membership.status}`);
      console.log(`      Membership ID: ${membership.id}`);
      console.log(`      Plan ID: ${membership.plan_id}`);
      console.log('');
    }
  }

  // Test 2: Check if any of these users are admins of the target company
  if (memberships.length > 0 && TARGET_COMPANY_ID !== COMPANY_ID) {
    console.log('📋 Test 2: Checking if subscription holders are admins of target company...');
    console.log(`  Target Company: ${TARGET_COMPANY_ID}\n`);
    
    // We can't easily check admin status without the SDK, but we can note it
    console.log('  💡 To verify admin status, you need to:');
    console.log('     1. Use the Whop SDK users.checkAccess() method');
    console.log('     2. Or check in the Whop dashboard\n');
  }

  // Test 3: Test the actual API endpoint if server is running
  console.log('📋 Test 3: Testing API endpoint...');
  const apiUrl = `http://localhost:3000/api/flows/${TARGET_COMPANY_ID}`;
  console.log(`  URL: ${apiUrl}\n`);
  
  try {
    const apiResponse = await fetch(apiUrl);
    const apiData = await apiResponse.json();
    
    console.log(`  Status: ${apiResponse.status} ${apiResponse.statusText}`);
    
    if (apiResponse.status === 403) {
      console.log('  ❌ Result: Funnel BLOCKED (403 Forbidden)');
      console.log('  Error:', apiData.error);
      console.log('  ⚠️  Subscription check is working, but no subscription found!');
    } else if (apiResponse.ok) {
      if (apiData.enabled === false) {
        console.log('  ❌ Result: Funnel DISABLED');
        console.log('  ⚠️  Subscription check found no active subscription.');
      } else {
        console.log('  ✅ Result: Funnel ALLOWED');
        console.log('  ✅ Subscription check passed!');
        console.log('  Enabled:', apiData.enabled);
        console.log('  Subscription Status:', apiData.subscriptionStatus || 'N/A');
      }
    } else if (apiResponse.status === 404) {
      console.log('  ⚠️  Result: Flow not found (404)');
      console.log('  💡 This is expected if no flow is configured.');
      console.log('  💡 The subscription check would run before this, so if you see 403, it means subscription check failed.');
    }
  } catch (error) {
    console.log('  ⚠️  Could not test API endpoint:', error.message);
    console.log('  💡 Make sure dev server is running: pnpm dev');
  }

  console.log('\n✅ Test completed!');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error);
  process.exit(1);
}

