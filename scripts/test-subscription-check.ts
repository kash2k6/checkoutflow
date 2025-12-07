#!/usr/bin/env tsx

/**
 * Test script to verify subscription check is working
 * This script tests both checkSubscriptionAccess and checkCompanyAdminSubscription
 */

// Load environment variables FIRST before importing anything that uses them
import dotenv from 'dotenv';
import { resolve } from 'path';

// Try multiple env file locations
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

// Now import after env vars are loaded
import { checkSubscriptionAccess, checkCompanyAdminSubscription, COMPANY_ID, SUBSCRIPTION_PLAN_ID } from '../lib/subscription-access';

async function testSubscriptionCheck() {
  console.log('🔍 Testing Subscription Check...\n');
  console.log('Configuration:');
  console.log(`  Subscription Plan ID: ${SUBSCRIPTION_PLAN_ID}`);
  console.log(`  Company ID: ${COMPANY_ID}`);
  console.log(`  API Key: ${process.env.WHOP_API_KEY ? '✅ Set' : '❌ Missing'}\n`);

  // Test 1: Check subscription for a specific user (if you have a user ID)
  if (process.env.TEST_USER_ID) {
    console.log('📋 Test 1: Checking subscription for specific user...');
    console.log(`  User ID: ${process.env.TEST_USER_ID}`);
    try {
      const status = await checkSubscriptionAccess(process.env.TEST_USER_ID);
      console.log('  Result:', {
        hasAccess: status.hasAccess ? '✅ YES' : '❌ NO',
        isTrial: status.isTrial ? 'Yes' : 'No',
        isExpired: status.isExpired ? 'Yes' : 'No',
        membershipId: status.membership?.id || 'N/A',
      });
    } catch (error) {
      console.error('  ❌ Error:', error);
    }
    console.log('');
  } else {
    console.log('⏭️  Test 1: Skipped (TEST_USER_ID not set in .env.local)\n');
  }

  // Test 2: Check company admin subscription for a target company
  const targetCompanyId = process.env.TEST_COMPANY_ID || COMPANY_ID;
  console.log('📋 Test 2: Checking if any admin of target company has subscription...');
  console.log(`  Target Company ID: ${targetCompanyId}`);
  try {
    const status = await checkCompanyAdminSubscription(targetCompanyId);
    console.log('  Result:', {
      hasAccess: status.hasAccess ? '✅ YES' : '❌ NO',
      isTrial: status.isTrial ? 'Yes' : 'No',
      isExpired: status.isExpired ? 'Yes' : 'No',
      membershipId: status.membership?.id || 'N/A',
      userId: status.membership?.user_id || 'N/A',
    });
    
    if (!status.hasAccess) {
      console.log('\n  ⚠️  WARNING: No active subscription found!');
      console.log('     Funnels will be blocked for this company.');
    } else {
      console.log('\n  ✅ SUCCESS: Active subscription found!');
      console.log('     Funnels will work for this company.');
    }
  } catch (error) {
    console.error('  ❌ Error:', error);
  }
  console.log('');

  // Test 3: Test the API endpoint directly (simulate customer request)
  console.log('📋 Test 3: Testing API endpoint (simulating customer request)...');
  const testCompanyId = process.env.TEST_COMPANY_ID || COMPANY_ID;
  const apiUrl = `http://localhost:3000/api/flows/${testCompanyId}`;
  console.log(`  API URL: ${apiUrl}`);
  
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    if (response.status === 403) {
      console.log('  ❌ Result: Funnel BLOCKED (403 Forbidden)');
      console.log('  Error:', data.error);
      console.log('  Subscription Status:', data.subscriptionStatus);
    } else if (response.ok) {
      console.log('  ✅ Result: Funnel ALLOWED (200 OK)');
      console.log('  Enabled:', data.enabled ? '✅ YES' : '❌ NO');
      console.log('  Subscription Status:', data.subscriptionStatus || 'N/A');
    } else {
      console.log(`  ⚠️  Result: Unexpected status ${response.status}`);
      console.log('  Data:', data);
    }
  } catch (error) {
    console.error('  ❌ Error:', error);
    console.log('  💡 Make sure the dev server is running (pnpm dev)');
  }

  console.log('\n✅ Test completed!');
}

// Run the test
testSubscriptionCheck().catch(console.error);

