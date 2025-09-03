-- Migration number: 0020 	 2025-01-27T00:00:00.000Z
-- Remove unused tables that are not referenced in the codebase

-- Drop unused tables
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS billing_history;
DROP TABLE IF EXISTS admin_permissions;
DROP TABLE IF EXISTS admin_settings;
DROP TABLE IF EXISTS admin_activity_log;
DROP TABLE IF EXISTS custom_domains;

-- Clean up any remaining indexes for these tables
DROP INDEX IF EXISTS idx_custom_domains_user_id;
DROP INDEX IF EXISTS idx_custom_domains_domain;
