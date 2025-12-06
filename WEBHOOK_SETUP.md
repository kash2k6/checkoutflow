# Webhook Setup Guide

## The Problem

The error "Please ensure your email is saved. Please contact support." occurs because:

1. When checkout completes, the code tries to retrieve the email from localStorage or Supabase
2. The email gets saved to Supabase only when the `setup_intent.succeeded` webhook fires
3. If the webhook isn't configured in Whop, the email is never saved
4. So the lookup fails and shows the error

## Solution: Configure Webhook in Whop Dashboard

### Step 1: Get Your Webhook URL

**For Production (Vercel):**
```
https://your-domain.vercel.app/api/whop/webhook
```
Or if you have a custom domain:
```
https://your-domain.com/api/whop/webhook
```

**For Local Development:**
Use ngrok or Cloudflare Tunnel to expose your local server:
```bash
# Install ngrok: https://ngrok.com/download
ngrok http 3000
```

Then use the ngrok URL:
```
https://your-ngrok-url.ngrok.io/api/whop/webhook
```

### Step 2: Configure Webhook in Whop Dashboard

1. Go to **Whop Developer Dashboard**: https://dash.whop.com/developer
2. Click **"Create Webhook"** (this is a **company webhook**, not an app webhook)
3. Fill in the webhook details:
   - **Webhook URL**: Enter your webhook URL from Step 1
   - **API Version**: Select **v1**
   - **Events**: Check the following events:
     - ✅ `setup_intent.succeeded` (REQUIRED - saves email and setup intent)
     - ✅ `payment.succeeded` (REQUIRED - tracks purchases)
4. Click **"Save"**

### Step 3: Verify Webhook is Working

1. Complete a test checkout in your app
2. Check your webhook logs in Whop dashboard - you should see successful deliveries
3. Check your Supabase `whop_member_data` table - you should see the email and setup intent saved

### Step 4: Verify Environment Variables

Make sure these are set in your Vercel environment variables (or `.env.local` for local):

- `WHOP_API_KEY` - Your Whop API key
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key

### How It Works

1. User completes checkout → Whop checkout embed completes
2. Whop sends `setup_intent.succeeded` webhook → Your `/api/whop/webhook` endpoint receives it
3. Webhook handler saves to Supabase:
   - Email
   - Member ID
   - Setup Intent ID
   - Payment Method ID
4. Checkout page retrieves data from Supabase using email
5. Initial product is charged using the saved payment method

### Troubleshooting

**Error: "Please ensure your email is saved"**
- ✅ Check webhook is configured in Whop dashboard
- ✅ Check webhook URL is correct and accessible
- ✅ Check webhook logs in Whop dashboard for errors
- ✅ Check Supabase `whop_member_data` table has the data

**Webhook not receiving events:**
- Verify webhook URL is publicly accessible (not localhost)
- For local dev, use ngrok or Cloudflare Tunnel
- Check webhook logs in Whop dashboard
- Verify API version is set to **v1** (not v2)

**Email not being saved:**
- Check webhook handler logs (Vercel logs or console)
- Verify Supabase credentials are correct
- Check `whop_member_data` table exists (run migration `010_create_whop_member_data.sql`)

## Important Notes

- The webhook endpoint is at: `/api/whop/webhook`
- The webhook handles both POST (events) and GET (retrieval) requests
- Setup intent data is stored in Supabase for reliable retrieval across serverless instances
- The email comes from the checkout metadata or the setup intent member data

