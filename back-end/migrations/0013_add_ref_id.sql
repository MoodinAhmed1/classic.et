-- Migration number: 0013   2025-08-20T00:00:00.000Z
-- Add ref_id to payment_transactions to store Chapa reference ID

ALTER TABLE payment_transactions ADD COLUMN ref_id TEXT;

CREATE INDEX IF NOT EXISTS idx_payment_transactions_ref_id ON payment_transactions(ref_id);


