/**
 * Debug script to see the actual structure of membership data from Whop API
 */

import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

const WHOP_SUBSCRIPTION_API_KEY = process.env.WHOP_SUBSCRIPTION_API_KEY || process.env.WHOP_API_KEY;
const SUBSCRIPTION_PLAN_ID = 'plan_9ykCIXvTEDMyp';
const COMPANY_ID = 'biz_PHQfLZ3o2GvXQn';

console.log('🔍 Debugging Membership Structure from Whop API...\n');

if (!WHOP_SUBSCRIPTION_API_KEY) {
  console.error('❌ API key not found');
  process.exit(1);
}

const url = new URL('https://api.whop.com/api/v1/memberships');
url.searchParams.set('company_id', COMPANY_ID);
url.searchParams.set('plan_ids', SUBSCRIPTION_PLAN_ID);

console.log('Request URL:', url.toString());
console.log('Plan ID:', SUBSCRIPTION_PLAN_ID);
console.log('Company ID:', COMPANY_ID);
console.log('\n');

fetch(url.toString(), {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${WHOP_SUBSCRIPTION_API_KEY}`,
    'Content-Type': 'application/json',
  },
})
  .then(async (response) => {
    console.log('Response Status:', response.status, response.statusText);
    console.log('\n');
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error:', errorText);
      return;
    }
    
    const data = await response.json();
    const memberships = data.data || [];
    
    console.log(`Found ${memberships.length} membership(s)\n`);
    
    if (memberships.length > 0) {
      console.log('=== FULL MEMBERSHIP STRUCTURE ===\n');
      console.log(JSON.stringify(memberships[0], null, 2));
      console.log('\n');
      
      console.log('=== KEY FIELDS EXTRACTED ===\n');
      memberships.forEach((m, index) => {
        console.log(`Membership ${index + 1}:`);
        console.log('  id:', m.id);
        console.log('  status:', m.status);
        console.log('  plan_id:', m.plan_id);
        console.log('  user_id:', m.user_id);
        console.log('  member_id:', m.member_id);
        console.log('  member?.id:', m.member?.id);
        console.log('  member?.user_id:', m.member?.user_id);
        console.log('  member?.user?.id:', m.member?.user?.id);
        console.log('  user?.id:', m.user?.id);
        console.log('  company_id:', m.company_id);
        console.log('  created_at:', m.created_at);
        console.log('');
      });
      
      console.log('=== CHECKING ADMIN STATUS ===\n');
      // Now check if we can get user ID from any of these fields
      for (const membership of memberships) {
        const possibleUserIds = [
          membership.user_id,
          membership.member?.user_id,
          membership.member?.user?.id,
          membership.user?.id,
        ].filter(Boolean);
        
        console.log(`Membership ${membership.id}:`);
        console.log('  Possible User IDs found:', possibleUserIds);
        
        if (possibleUserIds.length === 0) {
          console.log('  ⚠️  WARNING: No user_id found in membership data!');
          console.log('  This means we cannot check if user is admin of target company.');
        }
      }
    } else {
      console.log('No memberships found');
    }
  })
  .catch((error) => {
    console.error('Error:', error);
  });

