#!/bin/bash

echo "🚀 Running Admin System Migration..."
echo "=================================="

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Error: wrangler is not installed or not in PATH"
    echo "Please install wrangler first: npm install -g wrangler"
    exit 1
fi

# Check if the migration file exists
if [ ! -f "migrations/0019_fix_admin_system_tables.sql" ]; then
    echo "❌ Error: Migration file not found"
    echo "Expected: migrations/0019_fix_admin_system_tables.sql"
    exit 1
fi

echo "📋 Applying migration: 0019_fix_admin_system_tables.sql"
echo "This will fix admin system table inconsistencies..."

# Run the migration
wrangler d1 execute classic-et --file migrations/0019_fix_admin_system_tables.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully!"
    echo ""
    echo "🎯 Next steps:"
    echo "1. Test the admin system: node test-admin-system.js"
    echo "2. Access admin panel at: /admin"
    echo "3. Login with: admin@yoursite.com / admin123"
    echo ""
    echo "🔧 If you encounter issues, check the ADMIN_SYSTEM_SETUP_GUIDE.md"
else
    echo "❌ Migration failed!"
    echo "Please check the error messages above and try again."
    exit 1
fi
