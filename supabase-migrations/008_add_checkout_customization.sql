-- Add checkout_customization to company_flows
ALTER TABLE company_flows ADD COLUMN IF NOT EXISTS checkout_customization JSONB DEFAULT '{}'::jsonb;

