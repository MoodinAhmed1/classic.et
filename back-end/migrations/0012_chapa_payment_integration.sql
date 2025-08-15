-- Migration number: 0012 	 2025-01-27T00:00:00.000Z
-- Add Chapa payment integration tables

-- Create payment transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  tx_ref TEXT UNIQUE NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'ETB',
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed', 'cancelled')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_tx_ref ON payment_transactions(tx_ref);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON payment_transactions(created_at);

-- Update subscription plans to use ETB pricing
UPDATE subscription_plans 
SET price_monthly = CASE 
  WHEN tier = 'pro' THEN 30000  -- 300 ETB
  WHEN tier = 'premium' THEN 90000  -- 900 ETB
  ELSE price_monthly
END,
price_yearly = CASE 
  WHEN tier = 'pro' THEN 300000  -- 3000 ETB (save 17%)
  WHEN tier = 'premium' THEN 900000  -- 9000 ETB (save 17%)
  ELSE price_yearly
END
WHERE tier IN ('pro', 'premium');
