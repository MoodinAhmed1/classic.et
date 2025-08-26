UPDATE admin_users
SET password_hash = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',  -- sha256(admin123)
    is_active = 1
WHERE email = 'admin@yoursite.com';