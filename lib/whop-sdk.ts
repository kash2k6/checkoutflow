import Whop from '@whop/sdk';

// Initialize Whop SDK with environment variables
export const whopSdk = new Whop({
  // Required: your App ID ("App Settings" → App ID)
  appID: process.env.NEXT_PUBLIC_WHOP_APP_ID!,
  
  // Required: the API key you generated in "API Keys"
  apiKey: process.env.WHOP_API_KEY!,
});

// Export for use in API routes and server components
export default whopSdk;

