-- Fix admin user role for admin@yoursite.com
-- Run this SQL if the admin user doesn't have the super_admin role

-- First, check current admin user
SELECT id, email, name, role, permissions, is_active FROM admin_users WHERE email = 'admin@yoursite.com';

-- Update the admin user to have super_admin role and proper permissions
UPDATE admin_users 
SET role = 'super_admin', 
    permissions = '{"users":["read","write","delete"],"links":["read","write","delete"],"subscriptions":["read","write","delete"],"analytics":["read","write","delete"],"system":["read","write","delete"],"admins":["read","write","delete"]}',
    is_active = true,
    updated_at = datetime('now')
WHERE email = 'admin@yoursite.com';

-- If the admin user doesn't exist, create it
INSERT OR IGNORE INTO admin_users (
    id, 
    email, 
    name, 
    password_hash, 
    role, 
    permissions,
    is_active,
    created_at,
    updated_at
) VALUES (
    'admin_001',
    'admin@yoursite.com',
    'Super Administrator',
    '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', -- sha256(admin123)
    'super_admin',
    '{"users":["read","write","delete"],"links":["read","write","delete"],"subscriptions":["read","write","delete"],"analytics":["read","write","delete"],"system":["read","write","delete"],"admins":["read","write","delete"]}',
    true,
    datetime('now'),
    datetime('now')
);

-- Verify the update
SELECT id, email, name, role, permissions, is_active FROM admin_users WHERE email = 'admin@yoursite.com';

