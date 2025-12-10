import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function testPurchasesAPI() {
  const companyId = 'biz_nULEeITGXYHdQ2';
  const memberId = 'mber_F7StCPtXuYI9q';
  const sessionId = 'session_1765378415946_p59rytgrj';
  const flowId = '49652c37-eba0-4c6a-8459-fd78f664892f';

  console.log('Testing Purchases API\n');
  console.log('Parameters:');
  console.log(`  Company ID: ${companyId}`);
  console.log(`  Member ID: ${memberId}`);
  console.log(`  Session ID: ${sessionId}`);
  console.log(`  Flow ID: ${flowId}\n`);

  // Test 1: Without sessionId
  console.log('--- Test 1: API call WITHOUT sessionId ---\n');
  const urlWithoutSession = `${baseUrl}/api/purchases/${companyId}?memberId=${encodeURIComponent(memberId)}&flowId=${flowId}`;
  console.log(`URL: ${urlWithoutSession}\n`);
  
  try {
    const response1 = await fetch(urlWithoutSession);
    const data1 = await response1.json();
    console.log(`Status: ${response1.status}`);
    console.log(`Purchases count: ${data1.purchases?.length || 0}`);
    console.log(`Total: $${data1.total || '0.00'}\n`);
  } catch (error) {
    console.error('Error:', error);
  }

  // Test 2: With sessionId
  console.log('--- Test 2: API call WITH sessionId ---\n');
  const urlWithSession = `${baseUrl}/api/purchases/${companyId}?memberId=${encodeURIComponent(memberId)}&flowId=${flowId}&sessionId=${encodeURIComponent(sessionId)}`;
  console.log(`URL: ${urlWithSession}\n`);
  
  try {
    const response2 = await fetch(urlWithSession);
    const data2 = await response2.json();
    console.log(`Status: ${response2.status}`);
    console.log(`Purchases count: ${data2.purchases?.length || 0}`);
    console.log(`Total: $${data2.total || '0.00'}`);
    
    if (data2.purchases && data2.purchases.length > 0) {
      console.log('\nPurchases:');
      data2.purchases.forEach((p: any, idx: number) => {
        console.log(`  ${idx + 1}. ${p.name} - $${p.price.toFixed(2)} (${p.purchaseType})`);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  }

  console.log('\n--- Summary ---\n');
  console.log('If Test 1 shows more purchases than Test 2, the sessionId filter is working.');
  console.log('If both show the same count, the sessionId filter is NOT working.');
}

testPurchasesAPI().catch(console.error);

