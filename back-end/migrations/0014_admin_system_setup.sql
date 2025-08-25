-- Migration number: 0013 	 2025-01-27T00:00:00.000Z
-- Create admin system tables and setup

-- Create admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'moderator')),
  permissions JSON NOT NULL, -- Store permissions as JSON array
  is_active BOOLEAN DEFAULT true,
  last_login_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT, -- Which admin created this admin
  FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL
);

-- Create admin sessions table for authentication
CREATE TABLE IF NOT EXISTS admin_sessions (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE CASCADE
);

-- Create admin activity log table for audit trail
CREATE TABLE IF NOT EXISTS admin_activity_log (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  action TEXT NOT NULL, -- e.g., 'user_created', 'user_deleted', 'subscription_updated'
  resource_type TEXT NOT NULL, -- e.g., 'user', 'link', 'subscription'
  resource_id TEXT, -- ID of the affected resource
  details JSON, -- Additional details about the action
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE CASCADE
);

-- Create system settings table for admin configuration
CREATE TABLE IF NOT EXISTS admin_settings (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  updated_by TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (updated_by) REFERENCES admin_users(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);
CREATE INDEX IF NOT EXISTS idx_admin_users_is_active ON admin_users(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_id ON admin_sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_admin_id ON admin_activity_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_created_at ON admin_activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_resource ON admin_activity_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_admin_settings_key ON admin_settings(key);

-- Insert default super admin (password should be changed on first login)
-- Default password: "admin123" (hashed with bcrypt)
INSERT INTO admin_users (
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
  '$2b$10$rQZ8kHWKQVz7mXGKGx.oHOGKGx.oHOGKGx.oHOGKGx.oHOGKGx.oHO', -- This should be properly hashed
  'super_admin',
  '["all"]', -- Super admin has all permissions
  true
);

-- Insert default system settings
INSERT INTO admin_settings (id, key, value, description) VALUES
('setting_001', 'site_name', 'URL Shortener Admin', 'Name of the site displayed in admin panel'),
('setting_002', 'max_login_attempts', '5', 'Maximum login attempts before account lockout'),
('setting_003', 'session_timeout', '3600', 'Admin session timeout in seconds'),
('setting_004', 'enable_user_registration', 'true', 'Allow new user registrations'),
('setting_005', 'default_user_tier', 'free', 'Default tier for new users'),
('setting_006', 'maintenance_mode', 'false', 'Enable maintenance mode'),
('setting_007', 'analytics_retention_days', '365', 'How long to keep analytics data'),
('setting_008', 'max_links_per_free_user', '5', 'Maximum links for free tier users'),
('setting_009', 'enable_custom_domains', 'true', 'Allow custom domains feature'),
('setting_010', 'chapa_webhook_secret', '', 'Chapa webhook secret key');

-- Create admin permission definitions
CREATE TABLE IF NOT EXISTS admin_permissions (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL, -- e.g., 'users', 'links', 'analytics', 'subscriptions', 'system'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default permissions
INSERT INTO admin_permissions (id, name, description, category) VALUES
-- User management permissions
('perm_001', 'users.view', 'View user list and details', 'users'),
('perm_002', 'users.create', 'Create new users', 'users'),
('perm_003', 'users.edit', 'Edit user information', 'users'),
('perm_004', 'users.delete', 'Delete users', 'users'),
('perm_005', 'users.change_tier', 'Change user subscription tier', 'users'),

-- Link management permissions
('perm_006', 'links.view', 'View all links', 'links'),
('perm_007', 'links.edit', 'Edit link details', 'links'),
('perm_008', 'links.delete', 'Delete links', 'links'),
('perm_009', 'links.analytics', 'View link analytics', 'links'),

-- Analytics permissions
('perm_010', 'analytics.view', 'View system analytics', 'analytics'),
('perm_011', 'analytics.export', 'Export analytics data', 'analytics'),

-- Subscription management permissions
('perm_012', 'subscriptions.view', 'View subscription data', 'subscriptions'),
('perm_013', 'subscriptions.edit', 'Modify subscriptions', 'subscriptions'),
('perm_014', 'subscriptions.plans', 'Manage subscription plans', 'subscriptions'),

-- Payment management permissions
('perm_015', 'payments.view', 'View payment transactions', 'payments'),
('perm_016', 'payments.refund', 'Process refunds', 'payments'),
('perm_017', 'payments.settings', 'Manage payment settings', 'payments'),

-- System administration permissions
('perm_018', 'system.settings', 'Manage system settings', 'system'),
('perm_019', 'system.admins', 'Manage admin users', 'system'),
('perm_020', 'system.logs', 'View system logs', 'system'),
('perm_021', 'system.maintenance', 'Enable/disable maintenance mode', 'system');
