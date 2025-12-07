# Deployment Checklist - Subscription Check

## Environment Variables Required in Production (Vercel)

Make sure these are set in your Vercel project settings:

### Required Variables:
1. **WHOP_SUBSCRIPTION_API_KEY** ⚠️ **CRITICAL**
   - Value: `apik_tTPq9C7CcMwBW_C1299077_C_f99bc2694fe928e0a5c75c96ec26db779fd80b1a6733c48ee3d711c9e8cc1a`
   - This is the API key specifically for checking subscriptions
   - Located in `.env.local` line 12
   - **Without this, subscription checks will fail!**

2. **WHOP_API_KEY** (fallback)
   - Main API key (used if WHOP_SUBSCRIPTION_API_KEY is not set)
   - Should also be set as backup

3. **NEXT_PUBLIC_WHOP_APP_ID**
   - Your Whop App ID

4. **SUPABASE_URL** (if using Supabase)
5. **SUPABASE_SERVICE_ROLE_KEY** (if using Supabase)

## How to Set Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Click on **Settings** → **Environment Variables**
3. Add each variable:
   - **Name**: `WHOP_SUBSCRIPTION_API_KEY`
   - **Value**: `apik_tTPq9C7CcMwBW_C1299077_C_f99bc2694fe928e0a5c75c96ec26db779fd80b1a6733c48ee3d711c9e8cc1a`
   - **Environment**: Production, Preview, Development (select all)
4. Click **Save**
5. **Redeploy** your application for changes to take effect

## Verifying Subscription Check is Working

### Check Vercel Logs:
1. Go to Vercel dashboard → Your project → **Deployments**
2. Click on the latest deployment → **Functions** tab
3. Look for logs containing `[Subscription Check]` or `[checkCompanyAdminSubscription]`
4. Check for errors or warnings

### Expected Log Output (Success):
```
[Subscription Check] Unauthenticated request for company biz_nULEeITGXYHdQ2
[checkCompanyAdminSubscription] Using WHOP_SUBSCRIPTION_API_KEY (apik_tTPq9C7CcMwBW_C...)
[checkCompanyAdminSubscription] Found 1 active subscription(s) out of 1 total
[checkCompanyAdminSubscription] Found user user_ojPhs9dIhFQ9C with subscription, checking if admin of company biz_nULEeITGXYHdQ2
[checkCompanyAdminSubscription] Access check result for user user_ojPhs9dIhFQ9C: { access_level: 'admin' }
[checkCompanyAdminSubscription] ✅ User user_ojPhs9dIhFQ9C is admin of biz_nULEeITGXYHdQ2 and has active subscription!
[Subscription Check] Company admin subscription status: { hasAccess: true, isTrial: true, ... }
```

### Error Indicators:
- `WHOP_SUBSCRIPTION_API_KEY or WHOP_API_KEY environment variable is not set` → Missing env var
- `API Error: HTTP 403` → API key doesn't have permissions
- `No admin found with active subscription` → User with subscription is not admin of target company

## Troubleshooting

### Issue: "Funnel access requires an active subscription" error on live site

**Possible causes:**
1. ❌ `WHOP_SUBSCRIPTION_API_KEY` not set in Vercel
2. ❌ API key doesn't have correct permissions
3. ❌ User with subscription is not admin of the target company
4. ❌ Subscription status is not `active` or `trialing`

**Steps to fix:**
1. Check Vercel environment variables (see above)
2. Check Vercel logs for detailed error messages
3. Verify subscription is active in Whop dashboard
4. Verify user with subscription is admin of target company
5. Redeploy after setting environment variables

## Testing After Deployment

1. Visit your live checkout page: `https://your-domain.com/checkout?companyId=biz_nULEeITGXYHdQ2`
2. Check browser console for errors
3. Check Vercel function logs
4. Should see funnel working if subscription check passes

