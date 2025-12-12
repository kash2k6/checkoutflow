/**
 * Subscription plan constants
 * These can be safely imported in both client and server components
 */

// Plan IDs for multi-tier pricing
export const STARTER_PLAN_ID = 'plan_xBBClCOpMLmyW'; // $19.95/month, 3 funnels
export const GROWTH_PLAN_ID = 'plan_57x57dvQMqg8l'; // $34.95/month, 10 funnels
export const PRO_PLAN_ID = 'plan_9ykCIXvTEDMyp'; // $49.95/month, unlimited

// Product ID
export const SUBSCRIPTION_PRODUCT_ID = 'prod_mM22JTuMsyM8V';

// Company ID
export const COMPANY_ID = 'biz_PHQfLZ3o2GvXQn';

// Free tier limit
export const FREE_TIER_FUNNEL_LIMIT = 1;

// All paid plan IDs (for querying memberships)
export const PAID_PLAN_IDS = [STARTER_PLAN_ID, GROWTH_PLAN_ID, PRO_PLAN_ID];

