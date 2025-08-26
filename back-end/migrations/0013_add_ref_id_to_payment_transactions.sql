-- Migration number: 0013 	 2025-01-27T01:00:00.000Z
-- Add ref_id column to payment_transactions table for Chapa verification

-- Add ref_id column to store Chapa's reference ID
ALTER TABLE payment_transactions ADD COLUMN ref_id TEXT;

-- Create index for better performance on ref_id lookups
CREATE INDEX IF NOT EXISTS idx_payment_transactions_ref_id ON payment_transactions(ref_id);
