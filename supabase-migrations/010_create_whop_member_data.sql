-- Create table for storing Whop member data and setup intents
-- This table stores setup intent IDs, payment methods, and member information
-- for reliable retrieval across serverless instances

CREATE TABLE IF NOT EXISTS whop_member_data (
  email TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  setup_intent_id TEXT NOT NULL,
  payment_method_id TEXT,
  initial_plan_id TEXT,
  checkout_config_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_whop_member_data_member_id ON whop_member_data(member_id);
CREATE INDEX IF NOT EXISTS idx_whop_member_data_setup_intent_id ON whop_member_data(setup_intent_id);
CREATE INDEX IF NOT EXISTS idx_whop_member_data_payment_method_id ON whop_member_data(payment_method_id);

-- Function to update updated_at timestamp
CREATE TRIGGER update_whop_member_data_updated_at
  BEFORE UPDATE ON whop_member_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

