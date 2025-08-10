-- Migration number: 0007 	 2025-08-09T21:06:36.073Z
-- Drop the old table if it exists
DROP TABLE IF EXISTS email_verifications;

-- Create the new table with TEXT primary key for id
CREATE TABLE email_verifications (
  id INTEGER AUTOINCREMENT PRIMARY KEY,
  user_id TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Create indexes for faster lookups
CREATE INDEX idx_email_verifications_user_id ON email_verifications(user_id);
CREATE INDEX idx_email_verifications_code ON email_verifications(code);
CREATE INDEX idx_email_verifications_expires_at ON email_verifications(expires_at);
