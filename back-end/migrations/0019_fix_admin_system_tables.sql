-- Migration number: 0019 	 2025-01-27T00:00:00.000Z
-- Fix admin system tables and ensure consistency

-- Drop old admin_activity_log table if it exists (wrong name)
DROP TABLE IF EXISTS admin_activity_log;

-- Drop existing tables to recreate them with correct structure
DROP TABLE IF EXISTS admin_activity_logs;
DROP TABLE IF EXISTS user_activity_logs;
DROP TABLE IF EXISTS system_settings;

-- Create admin_activity_logs table
CREATE TABLE admin_activity_logs (
    id TEXT PRIMARY KEY,
    admin_user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    resource_id TEXT,
    details TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Create user_activity_logs table
CREATE TABLE user_activity_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    details TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Create system_settings table
CREATE TABLE system_settings (
    id TEXT PRIMARY KEY,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type TEXT NOT NULL DEFAULT 'string',
    description TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Create indexes for better performance
CREATE INDEX idx_admin_activity_logs_admin_id ON admin_activity_logs(admin_user_id);
CREATE INDEX idx_admin_activity_logs_action ON admin_activity_logs(action);
CREATE INDEX idx_admin_activity_logs_resource ON admin_activity_logs(resource);
CREATE INDEX idx_admin_activity_logs_created_at ON admin_activity_logs(created_at);

CREATE INDEX idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX idx_user_activity_logs_action ON user_activity_logs(action);
CREATE INDEX idx_user_activity_logs_resource_type ON user_activity_logs(resource_type);
CREATE INDEX idx_user_activity_logs_created_at ON user_activity_logs(created_at);

CREATE INDEX idx_system_settings_key ON system_settings(setting_key);

-- Insert default system settings
INSERT INTO system_settings (id, setting_key, setting_value, setting_type, description) VALUES
('setting_001', 'site_name', 'URL Shortener', 'string', 'Site name displayed throughout the application'),
('setting_002', 'site_description', 'A powerful URL shortening service', 'string', 'Site description for SEO'),
('setting_003', 'site_url', 'https://example.com', 'string', 'Main site URL'),
('setting_004', 'contact_email', 'contact@example.com', 'string', 'Contact email address'),
('setting_005', 'support_email', 'support@example.com', 'string', 'Support email address'),
('setting_006', 'max_links_per_user', '100', 'number', 'Maximum number of links a user can create'),
('setting_007', 'max_clicks_per_link', '10000', 'number', 'Maximum number of clicks per link'),
('setting_008', 'link_expiry_days', '365', 'number', 'Default link expiry in days'),
('setting_009', 'enable_registration', 'true', 'boolean', 'Allow new user registration'),
('setting_010', 'require_email_verification', 'true', 'boolean', 'Require email verification for new users'),
('setting_011', 'enable_analytics', 'true', 'boolean', 'Enable analytics tracking'),
('setting_012', 'enable_notifications', 'true', 'boolean', 'Enable email notifications'),
('setting_013', 'maintenance_mode', 'false', 'boolean', 'Put site in maintenance mode'),
('setting_014', 'maintenance_message', 'We are currently performing maintenance. Please check back soon.', 'string', 'Message shown during maintenance'),
('setting_015', 'session_timeout_minutes', '60', 'number', 'Session timeout in minutes'),
('setting_016', 'max_login_attempts', '5', 'number', 'Maximum login attempts before lockout'),
('setting_017', 'password_min_length', '8', 'number', 'Minimum password length'),
('setting_018', 'enable_two_factor', 'false', 'boolean', 'Enable two-factor authentication'),
('setting_019', 'log_retention_days', '90', 'number', 'How long to keep activity logs'),
('setting_020', 'backup_frequency', 'daily', 'string', 'Backup frequency'),
('setting_021', 'chapa_webhook_url', '', 'string', 'Chapa payment webhook URL'),
('setting_022', 'chapa_secret_key', '', 'string', 'Chapa payment secret key'),
('setting_023', 'resend_api_key', '', 'string', 'Resend email API key');

-- Ensure admin_users table exists with correct structure
-- First check if it exists and has the right columns
CREATE TABLE IF NOT EXISTS admin_users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    permissions TEXT NOT NULL DEFAULT '{}',
    is_active INTEGER NOT NULL DEFAULT 1,
    last_login_at TEXT,
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Insert super admin if it doesn't exist
INSERT OR IGNORE INTO admin_users (
    id, 
    email, 
    name, 
    password_hash, 
    role, 
    permissions,
    is_active
) VALUES (
    'admin_001',
    'admin@yoursite.com',
    'Super Administrator',
    '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
    'super_admin',
    '{"users":["read","write","delete"],"links":["read","write","delete"],"subscriptions":["read","write","delete"],"analytics":["read","write"],"system":["read","write","delete"],"admins":["read","write","delete"]}',
    1
);
