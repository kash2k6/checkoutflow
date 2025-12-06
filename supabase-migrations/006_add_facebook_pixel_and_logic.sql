-- Add Facebook Pixel ID to company_flows (global) and flow_nodes (per step)
ALTER TABLE company_flows ADD COLUMN IF NOT EXISTS facebook_pixel_id TEXT;
ALTER TABLE flow_nodes ADD COLUMN IF NOT EXISTS facebook_pixel_id TEXT;

-- Update flow_edges to support better logic
-- Add target_type to distinguish between node, confirmation, or external URL
ALTER TABLE flow_edges ADD COLUMN IF NOT EXISTS target_type TEXT DEFAULT 'node' CHECK (target_type IN ('node', 'confirmation', 'external_url'));
ALTER TABLE flow_edges ADD COLUMN IF NOT EXISTS target_url TEXT; -- For external_url or confirmation page URL

-- Add customization to company_flows for confirmation page
ALTER TABLE company_flows ADD COLUMN IF NOT EXISTS confirmation_customization JSONB DEFAULT '{}'::jsonb;

