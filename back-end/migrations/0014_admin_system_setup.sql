-- Migration number: 0014 	 2025-01-27T00:00:00.000Z
-- Create admin system tables and setup

-- Create admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'moderator', 'analyst')),
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);
CREATE INDEX IF NOT EXISTS idx_admin_users_is_active ON admin_users(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_id ON admin_sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_admin_id ON admin_activity_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_created_at ON admin_activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_resource ON admin_activity_log(resource_type, resource_id);

-- Insert default super admin (password should be changed on first login)
-- Default password: "admin123" (SHA-256)
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
  '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', -- sha256(admin123)
  'super_admin',
  '{"users":["read","write","delete"],"links":["read","write","delete"],"subscriptions":["read","write","delete"],"analytics":["read","write"],"system":["read","write","delete"],"admins":["read","write","delete"]}', -- Super admin has all permissions
  true
);
