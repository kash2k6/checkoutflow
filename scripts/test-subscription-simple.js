/**
 * Simple test script to check subscription via API endpoint
 * Run this while your dev server is running
 */

const testCompanyId = process.env.TEST_COMPANY_ID || process.env.WHOP_COMPANY_ID || 'biz_PHQfLZ3o2GvXQn';
const apiUrl = `http://localhost:3000/api/flows/${testCompanyId}`;

console.log('🔍 Testing Subscription Check via API...\n');
console.log('Configuration:');
console.log(`  Test Company ID: ${testCompanyId}`);
console.log(`  API URL: ${apiUrl}\n`);

console.log('📋 Testing API endpoint (simulating customer request)...');
console.log(`  GET ${apiUrl}\n`);

fetch(apiUrl)
  .then(async (response) => {
    const data = await response.json();
    
    console.log(`  Status: ${response.status} ${response.statusText}`);
    console.log('\n  Response:');
    console.log(JSON.stringify(data, null, 2));
    
    if (response.status === 403) {
      console.log('\n  ❌ Result: Funnel BLOCKED (403 Forbidden)');
      console.log('  ⚠️  This means the subscription check is working, but no active subscription was found.');
      console.log('  💡 If you have a subscription, check:');
      console.log('     - Is the subscription plan ID correct?');
      console.log('     - Is the subscription active?');
      console.log('     - Are you checking the right company ID?');
    } else if (response.ok && data.enabled === false) {
      console.log('\n  ❌ Result: Funnel DISABLED (enabled: false)');
      console.log('  ⚠️  Subscription check found no active subscription.');
    } else if (response.ok && data.enabled !== false) {
      console.log('\n  ✅ Result: Funnel ALLOWED (200 OK)');
      console.log('  ✅ Subscription check passed! Funnels will work.');
    } else if (response.status === 404) {
      console.log('\n  ⚠️  Result: Flow not found (404)');
      console.log('  💡 This is expected if no flow is configured for this company.');
    } else {
      console.log(`\n  ⚠️  Result: Unexpected status ${response.status}`);
    }
  })
  .catch((error) => {
    console.error('  ❌ Error:', error.message);
    console.log('\n  💡 Make sure:');
    console.log('     - Dev server is running (pnpm dev)');
    console.log('     - The API endpoint is accessible');
    console.log('     - Company ID is correct');
  });

