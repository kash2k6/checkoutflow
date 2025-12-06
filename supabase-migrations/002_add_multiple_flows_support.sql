-- Update company_flows to support multiple flows per company
-- Remove UNIQUE constraint on company_id and add flow_name field

-- First, drop the unique constraint
ALTER TABLE company_flows DROP CONSTRAINT IF EXISTS company_flows_company_id_key;

-- Add flow_name column
ALTER TABLE company_flows ADD COLUMN IF NOT EXISTS flow_name TEXT;

-- Add a unique constraint on (company_id, flow_name) so each flow name is unique per company
-- But allow NULL flow_name for backward compatibility
CREATE UNIQUE INDEX IF NOT EXISTS idx_company_flows_company_name 
ON company_flows(company_id, flow_name) 
WHERE flow_name IS NOT NULL;

-- Update existing flows to have a default name if they don't have one
UPDATE company_flows 
SET flow_name = 'Default Flow' 
WHERE flow_name IS NULL;

