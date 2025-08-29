-- System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type TEXT NOT NULL DEFAULT 'string' CHECK (setting_type IN ('string', 'number', 'boolean')),
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Admin Activity Logs Table
CREATE TABLE IF NOT EXISTS admin_activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_user_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    details TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_admin_id ON admin_activity_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_action ON admin_activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_resource ON admin_activity_logs(resource);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_created_at ON admin_activity_logs(created_at);

-- Insert default system settings
INSERT OR IGNORE INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
('site_name', 'URL Shortener', 'string', 'Site name displayed throughout the application'),
('site_description', 'A powerful URL shortening service', 'string', 'Site description for SEO'),
('site_url', 'https://example.com', 'string', 'Main site URL'),
('contact_email', 'contact@example.com', 'string', 'Contact email address'),
('support_email', 'support@example.com', 'string', 'Support email address'),
('max_links_per_user', '100', 'number', 'Maximum number of links a user can create'),
('max_clicks_per_link', '10000', 'number', 'Maximum number of clicks per link'),
('link_expiry_days', '365', 'number', 'Default link expiry in days'),
('enable_registration', 'true', 'boolean', 'Allow new user registration'),
('require_email_verification', 'true', 'boolean', 'Require email verification for new users'),
('enable_analytics', 'true', 'boolean', 'Enable analytics tracking'),
('enable_notifications', 'true', 'boolean', 'Enable email notifications'),
('maintenance_mode', 'false', 'boolean', 'Put site in maintenance mode'),
('maintenance_message', 'We are currently performing maintenance. Please check back soon.', 'string', 'Message shown during maintenance'),
('session_timeout_minutes', '60', 'number', 'Session timeout in minutes'),
('max_login_attempts', '5', 'number', 'Maximum login attempts before lockout'),
('password_min_length', '8', 'number', 'Minimum password length'),
('enable_two_factor', 'false', 'boolean', 'Enable two-factor authentication'),
('log_retention_days', '90', 'number', 'How long to keep activity logs'),
('backup_frequency', 'daily', 'string', 'Backup frequency'),
('chapa_webhook_url', '', 'string', 'Chapa payment webhook URL'),
('chapa_secret_key', '', 'string', 'Chapa payment secret key'),
('resend_api_key', '', 'string', 'Resend email API key');
