@echo off
echo 🚀 Running Admin System Migration...
echo ==================================

REM Check if wrangler is installed
wrangler --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Error: wrangler is not installed or not in PATH
    echo Please install wrangler first: npm install -g wrangler
    pause
    exit /b 1
)

REM Check if the migration file exists
if not exist "migrations\0019_fix_admin_system_tables.sql" (
    echo ❌ Error: Migration file not found
    echo Expected: migrations\0019_fix_admin_system_tables.sql
    pause
    exit /b 1
)

echo 📋 Applying migration: 0019_fix_admin_system_tables.sql
echo This will fix admin system table inconsistencies...

REM Run the migration
wrangler d1 execute classic-et --file migrations/0019_fix_admin_system_tables.sql

if %errorlevel% equ 0 (
    echo ✅ Migration completed successfully!
    echo.
    echo 🎯 Next steps:
    echo 1. Test the admin system: node test-admin-system.js
    echo 2. Access admin panel at: /admin
    echo 3. Login with: admin@yoursite.com / admin123
    echo.
    echo 🔧 If you encounter issues, check the ADMIN_SYSTEM_SETUP_GUIDE.md
) else (
    echo ❌ Migration failed!
    echo Please check the error messages above and try again.
    pause
    exit /b 1
)

pause
