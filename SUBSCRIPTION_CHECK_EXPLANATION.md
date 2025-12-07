# How Subscription Check Works

## Overview
The subscription check ensures funnels only work for companies whose owners have an active subscription to our service plan.

## The Process

### Step 1: Query Memberships by Plan
```javascript
// Query Whop API for all memberships to our subscription plan
GET /api/v1/memberships?company_id=biz_PHQfLZ3o2GvXQn&plan_ids=plan_9ykCIXvTEDMyp
```

**What this does:**
- Filters by our company ID (`biz_PHQfLZ3o2GvXQn`) - the company that owns the subscription plan
- Filters by plan ID (`plan_9ykCIXvTEDMyp`) - our subscription plan
- Returns all memberships (active, trialing, canceled, etc.)

### Step 2: Filter Active Subscriptions
```javascript
// Filter for only active/trialing memberships
memberships.filter(m => m.status === 'active' || m.status === 'trialing')
```

**What this does:**
- Only keeps memberships with status `active` or `trialing`
- Ignores canceled, expired, or past_due memberships

### Step 3: Extract User ID from Membership
```javascript
// Whop API returns user ID in nested structure
const userId = membership.user?.id || membership.user_id
```

**Membership Structure from Whop API:**
```json
{
  "id": "mem_MemrBlbHjCeM5d",
  "status": "trialing",
  "user": {
    "id": "user_ojPhs9dIhFQ9C",  // ← User ID is here
    "username": "digitalnomadonline",
    "name": "Kash"
  },
  "plan": {
    "id": "plan_9ykCIXvTEDMyp"  // ← Plan ID is here
  },
  "company": {
    "id": "biz_PHQfLZ3o2GvXQn"  // ← Our company ID
  }
}
```

**Note:** The API uses nested objects, not flat fields like `user_id` or `plan_id`.

### Step 4: Check if User is Admin of Target Company
```javascript
// For each user with active subscription, check if they're admin of target company
const access = await whopSdk.users.checkAccess(
  targetCompanyId,  // e.g., biz_nULEeITGXYHdQ2 (the company with the funnel)
  { id: userId }     // e.g., user_ojPhs9dIhFQ9C (the user with subscription)
);

if (access.access_level === 'admin') {
  // ✅ User is admin AND has subscription → Allow funnel
}
```

**What this does:**
- Checks if the user (who has subscription) is an admin of the target company (that has the funnel)
- If yes → funnel is enabled
- If no → continue checking other users with subscriptions

## Two Types of Checks

### 1. Authenticated Requests (Dashboard)
**When:** User is logged in and accessing dashboard
**How:** 
- Get `userId` from authentication token
- Call `checkSubscriptionAccess(userId)`
- Directly checks if that specific user has subscription

### 2. Unauthenticated Requests (Customer-Facing Pages)
**When:** Customer visits checkout/upsell page (no auth)
**How:**
- Call `checkCompanyAdminSubscription(targetCompanyId)`
- Gets all users with active subscriptions
- Checks if ANY of those users is an admin of the target company
- If found → funnel enabled

## Example Flow

```
1. Customer visits: /checkout?companyId=biz_nULEeITGXYHdQ2
2. API calls: checkCompanyAdminSubscription('biz_nULEeITGXYHdQ2')
3. Query: GET /api/v1/memberships?company_id=biz_PHQfLZ3o2GvXQn&plan_ids=plan_9ykCIXvTEDMyp
4. Result: Found 1 membership (user_ojPhs9dIhFQ9C, status: trialing)
5. Check: Is user_ojPhs9dIhFQ9C admin of biz_nULEeITGXYHdQ2?
6. Result: YES → hasAccess: true
7. Response: { enabled: true, subscriptionStatus: { hasAccess: true, isTrial: true } }
```

## Key Points

1. **Plan Filtering:** We filter by `plan_ids=plan_9ykCIXvTEDMyp` to only get subscriptions to OUR plan
2. **Company Filtering:** We filter by `company_id=biz_PHQfLZ3o2GvXQn` to only get memberships to OUR company
3. **User Extraction:** User ID is in `membership.user.id` (nested, not flat)
4. **Admin Verification:** We verify the user with subscription is admin of the target company
5. **Status Check:** Only `active` or `trialing` memberships count

## API Key Used

- Uses `WHOP_SUBSCRIPTION_API_KEY` from `.env.local` (line 12)
- Falls back to `WHOP_API_KEY` if subscription key not set
- This key needs permissions to:
  - Read memberships (`member:basic:read`)
  - Check user access (`user:access:read`)

