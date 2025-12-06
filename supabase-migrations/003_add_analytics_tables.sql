-- Analytics tables for tracking visits, purchases, and A/B testing

-- Track visits to checkout pages
CREATE TABLE IF NOT EXISTS flow_visits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  flow_id UUID NOT NULL REFERENCES company_flows(id) ON DELETE CASCADE,
  company_id TEXT NOT NULL,
  session_id TEXT, -- Browser session ID
  user_agent TEXT,
  referrer TEXT,
  ip_address TEXT,
  visited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  page_type TEXT NOT NULL CHECK (page_type IN ('checkout', 'upsell', 'downsell', 'cross_sell', 'confirmation')),
  node_id UUID REFERENCES flow_nodes(id) ON DELETE SET NULL, -- For upsell/downsell visits
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Track purchases per flow
CREATE TABLE IF NOT EXISTS flow_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  flow_id UUID NOT NULL REFERENCES company_flows(id) ON DELETE CASCADE,
  company_id TEXT NOT NULL,
  member_id TEXT NOT NULL, -- Whop member ID
  plan_id TEXT NOT NULL,
  purchase_type TEXT NOT NULL CHECK (purchase_type IN ('initial', 'upsell', 'downsell', 'cross_sell')),
  node_id UUID REFERENCES flow_nodes(id) ON DELETE SET NULL, -- For upsell/downsell purchases
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'usd',
  session_id TEXT, -- Link to visit session
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- A/B test variants
CREATE TABLE IF NOT EXISTS flow_variants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  flow_id UUID NOT NULL REFERENCES company_flows(id) ON DELETE CASCADE,
  variant_name TEXT NOT NULL,
  variant_type TEXT NOT NULL CHECK (variant_type IN ('checkout', 'upsell', 'downsell', 'cross_sell')),
  node_id UUID REFERENCES flow_nodes(id) ON DELETE CASCADE, -- For node-specific variants
  configuration JSONB, -- Store variant-specific config (colors, copy, etc.)
  traffic_percentage INTEGER DEFAULT 50, -- Percentage of traffic to show this variant
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(flow_id, variant_name, variant_type, node_id)
);

-- Track which variant a user saw
CREATE TABLE IF NOT EXISTS flow_variant_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  flow_id UUID NOT NULL REFERENCES company_flows(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES flow_variants(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  member_id TEXT, -- If user is logged in
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(flow_id, session_id, variant_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_flow_visits_flow_id ON flow_visits(flow_id);
CREATE INDEX IF NOT EXISTS idx_flow_visits_company_id ON flow_visits(company_id);
CREATE INDEX IF NOT EXISTS idx_flow_visits_visited_at ON flow_visits(visited_at);
CREATE INDEX IF NOT EXISTS idx_flow_visits_session_id ON flow_visits(session_id);

CREATE INDEX IF NOT EXISTS idx_flow_purchases_flow_id ON flow_purchases(flow_id);
CREATE INDEX IF NOT EXISTS idx_flow_purchases_company_id ON flow_purchases(company_id);
CREATE INDEX IF NOT EXISTS idx_flow_purchases_member_id ON flow_purchases(member_id);
CREATE INDEX IF NOT EXISTS idx_flow_purchases_purchased_at ON flow_purchases(purchased_at);
CREATE INDEX IF NOT EXISTS idx_flow_purchases_session_id ON flow_purchases(session_id);

CREATE INDEX IF NOT EXISTS idx_flow_variants_flow_id ON flow_variants(flow_id);
CREATE INDEX IF NOT EXISTS idx_flow_variants_node_id ON flow_variants(node_id);

CREATE INDEX IF NOT EXISTS idx_flow_variant_assignments_flow_id ON flow_variant_assignments(flow_id);
CREATE INDEX IF NOT EXISTS idx_flow_variant_assignments_session_id ON flow_variant_assignments(session_id);

-- Function to update updated_at timestamp
CREATE TRIGGER update_flow_variants_updated_at
  BEFORE UPDATE ON flow_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

