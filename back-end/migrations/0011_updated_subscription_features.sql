-- Migration number: 0011 	 2025-01-27T00:00:00.000Z
-- Update subscription plans with new features and visitor caps

-- Add new fields to subscription_plans table
ALTER TABLE subscription_plans ADD COLUMN visitor_cap INTEGER;
ALTER TABLE subscription_plans ADD COLUMN has_full_analytics BOOLEAN DEFAULT false;
ALTER TABLE subscription_plans ADD COLUMN has_advanced_charts BOOLEAN DEFAULT false;
ALTER TABLE subscription_plans ADD COLUMN has_pdf_download BOOLEAN DEFAULT false;

-- Update existing plans with new features
UPDATE subscription_plans SET 
  visitor_cap = 500,
  has_full_analytics = false,
  has_advanced_charts = false,
  has_pdf_download = false
WHERE tier = 'free';

UPDATE subscription_plans SET 
  visitor_cap = 50000,
  has_full_analytics = true,
  has_advanced_charts = false,
  has_pdf_download = false
WHERE tier = 'pro';

UPDATE subscription_plans SET 
  visitor_cap = NULL, -- NULL means unlimited
  has_full_analytics = true,
  has_advanced_charts = true,
  has_pdf_download = true
WHERE tier = 'premium';

-- Create visitor tracking table for usage caps
CREATE TABLE IF NOT EXISTS visitor_tracking (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  month TEXT NOT NULL, -- Format: YYYY-MM
  total_visitors INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, month)
);

-- Create last_visit_tracking table for new visitor notifications
CREATE TABLE IF NOT EXISTS last_visit_tracking (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  last_visit_at DATETIME NOT NULL,
  new_visitors_since_last_visit INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_visitor_tracking_user_month ON visitor_tracking(user_id, month);
CREATE INDEX IF NOT EXISTS idx_last_visit_tracking_user_id ON last_visit_tracking(user_id);

-- Remove old API requests and custom domains fields from usage_tracking
-- (These features are being removed as per requirements)
ALTER TABLE usage_tracking DROP COLUMN api_requests;
ALTER TABLE usage_tracking DROP COLUMN custom_domains_used;

-- Update subscription_plans to remove old features
UPDATE subscription_plans SET 
  features = '["Basic link shortening", "7-day analytics", "Standard support"]',
  limits = '{"links_per_month": 5, "analytics_retention_days": 7, "team_members": 1}'
WHERE tier = 'free';

UPDATE subscription_plans SET 
  features = '["Advanced analytics", "Email support", "Link scheduling", "QR codes", "Custom short codes"]',
  limits = '{"links_per_month": 100, "analytics_retention_days": 30, "team_members": 1}'
WHERE tier = 'pro';

UPDATE subscription_plans SET 
  features = '["Unlimited links", "Full analytics", "Priority support", "Team collaboration", "White-label options", "Advanced charts", "PDF reports"]',
  limits = '{"links_per_month": -1, "analytics_retention_days": 365, "team_members": 3}'
WHERE tier = 'premium';

