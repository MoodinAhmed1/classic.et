-- Migration number: 0010 	 2025-01-27T00:00:00.000Z
-- Add subscription and usage tracking tables

-- Update users table to include subscription details
ALTER TABLE users ADD COLUMN subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'unpaid'));
ALTER TABLE users ADD COLUMN subscription_id TEXT;
ALTER TABLE users ADD COLUMN current_period_start TEXT;
ALTER TABLE users ADD COLUMN current_period_end TEXT;
ALTER TABLE users ADD COLUMN cancel_at_period_end BOOLEAN DEFAULT false;

-- Create subscription plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'pro', 'premium')),
  price_monthly INTEGER NOT NULL, -- Price in cents
  price_yearly INTEGER NOT NULL, -- Price in cents (with discount)
  features JSON NOT NULL, -- Store features as JSON
  limits JSON NOT NULL, -- Store limits as JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
 
-- Create usage tracking table
CREATE TABLE IF NOT EXISTS usage_tracking (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  month TEXT NOT NULL, -- Format: YYYY-MM
  links_created INTEGER DEFAULT 0,
  api_requests INTEGER DEFAULT 0,
  custom_domains_used INTEGER DEFAULT 0,
  analytics_events INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, month)
);

-- Create billing history table
CREATE TABLE IF NOT EXISTS billing_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  subscription_id TEXT,
  amount INTEGER NOT NULL, -- Amount in cents
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  billing_period_start TEXT,
  billing_period_end TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Insert default subscription plans
INSERT INTO subscription_plans (id, name, tier, price_monthly, price_yearly, features, limits) VALUES
(
  'free',
  'Free',
  'free',
  0,
  0,
  '["Basic link shortening", "7-day analytics", "Standard support"]',
  '{"links_per_month": 5, "api_requests_per_month": 0, "custom_domains": 0, "analytics_retention_days": 7, "team_members": 1}'
),
(
  'pro',
  'Pro',
  'pro',
  999,
  9990, -- $99.90/year (save ~17%)
  '["Advanced analytics", "Custom domains", "API access", "Email support", "Link scheduling", "QR codes"]',
  '{"links_per_month": 100, "api_requests_per_month": 1000, "custom_domains": 1, "analytics_retention_days": 30, "team_members": 1}'
),
(
  'premium',
  'Pro Extreme',
  'premium',
  2999,
  29990, -- $299.90/year (save ~17%)
  '["Unlimited links", "Full analytics", "Multiple custom domains", "Unlimited API", "Priority support", "Team collaboration", "White-label options"]',
  '{"links_per_month": -1, "api_requests_per_month": -1, "custom_domains": 5, "analytics_retention_days": 365, "team_members": 3}'
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_users_tier ON users(tier);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_month ON usage_tracking(user_id, month);
CREATE INDEX IF NOT EXISTS idx_billing_history_user_id ON billing_history(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_history_created_at ON billing_history(created_at);


