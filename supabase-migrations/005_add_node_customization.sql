-- Add customization fields to flow_nodes for brand customization
ALTER TABLE flow_nodes ADD COLUMN IF NOT EXISTS customization JSONB DEFAULT '{}'::jsonb;

-- Add index for customization queries
CREATE INDEX IF NOT EXISTS idx_flow_nodes_customization ON flow_nodes USING GIN (customization);

