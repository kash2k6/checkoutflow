-- Add checkout_theme to company_flows
-- Options: 'light', 'dark', 'system' (defaults to 'system' to follow user's system preference)
ALTER TABLE company_flows ADD COLUMN IF NOT EXISTS checkout_theme TEXT DEFAULT 'system' CHECK (checkout_theme IN ('light', 'dark', 'system'));

