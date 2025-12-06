-- Create table for company flows
-- Each company can have one flow configuration
CREATE TABLE IF NOT EXISTS company_flows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id TEXT NOT NULL UNIQUE,
  initial_product_plan_id TEXT NOT NULL,
  confirmation_page_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for flow nodes (upsells, downsells, cross-sells)
CREATE TABLE IF NOT EXISTS flow_nodes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  flow_id UUID NOT NULL REFERENCES company_flows(id) ON DELETE CASCADE,
  node_type TEXT NOT NULL CHECK (node_type IN ('upsell', 'downsell', 'cross_sell')),
  plan_id TEXT NOT NULL,
  title TEXT,
  description TEXT,
  price DECIMAL(10, 2),
  original_price DECIMAL(10, 2),
  redirect_url TEXT NOT NULL, -- URL where this node's page is hosted
  order_index INTEGER NOT NULL DEFAULT 0, -- Order within same node type
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for flow edges (connections between nodes)
-- This defines the flow logic: what happens after accept/decline
CREATE TABLE IF NOT EXISTS flow_edges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_node_id UUID REFERENCES flow_nodes(id) ON DELETE CASCADE,
  to_node_id UUID REFERENCES flow_nodes(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('accept', 'decline')),
  flow_id UUID NOT NULL REFERENCES company_flows(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_company_flows_company_id ON company_flows(company_id);
CREATE INDEX IF NOT EXISTS idx_flow_nodes_flow_id ON flow_nodes(flow_id);
CREATE INDEX IF NOT EXISTS idx_flow_nodes_type_order ON flow_nodes(flow_id, node_type, order_index);
CREATE INDEX IF NOT EXISTS idx_flow_edges_flow_id ON flow_edges(flow_id);
CREATE INDEX IF NOT EXISTS idx_flow_edges_from_node ON flow_edges(from_node_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_company_flows_updated_at
  BEFORE UPDATE ON company_flows
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_flow_nodes_updated_at
  BEFORE UPDATE ON flow_nodes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

