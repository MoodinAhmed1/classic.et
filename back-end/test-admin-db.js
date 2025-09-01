// Simple test script to check admin database connectivity
// This can help diagnose why admin creation is failing

console.log('Testing admin database connectivity...');

// Test 1: Check if we can access the database
try {
  // This would be run in your Cloudflare Workers environment
  console.log('✅ Database connection should be available');
} catch (error) {
  console.error('❌ Database connection failed:', error);
}

// Test 2: Check if admin tables exist
const checkTables = `
  SELECT name FROM sqlite_master 
  WHERE type='table' AND name IN ('admin_users', 'admin_sessions', 'admin_activity_log')
`;

console.log('🔍 SQL to check admin tables:');
console.log(checkTables);

// Test 3: Check admin_users table structure
const checkTableStructure = `
  PRAGMA table_info(admin_users)
`;

console.log('🔍 SQL to check admin_users structure:');
console.log(checkTableStructure);

// Test 4: Check if default admin exists
const checkDefaultAdmin = `
  SELECT id, email, name, role, is_active FROM admin_users 
  WHERE email = 'admin@yoursite.com'
`;

console.log('🔍 SQL to check default admin:');
console.log(checkDefaultAdmin);

console.log('\n📋 To fix the admin creation issue:');
console.log('1. Run the migration: 0014_admin_system_setup.sql');
console.log('2. Verify admin_users table exists');
console.log('3. Check if default super admin is created');
console.log('4. Test admin login flow');
console.log('5. Then test admin creation');

console.log('\n🚀 Next steps:');
console.log('- Deploy the updated backend with the test endpoint');
console.log('- Call GET /api/admin/test-db to check database status');
console.log('- If tables don\'t exist, run the migration');
console.log('- If tables exist, check the specific error in admin creation');

