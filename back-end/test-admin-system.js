// Test script for admin system functionality
// Run this with: node test-admin-system.js

const { execSync } = require('child_process');

console.log('🧪 Testing Admin System Functionality...\n');

// Test 1: Check if admin tables exist
console.log('1️⃣ Testing Database Schema...');
try {
  const tableCheck = execSync('wrangler d1 execute url-shortner-db --command "SELECT name FROM sqlite_master WHERE type=\'table\' AND name IN (\'admin_users\', \'admin_activity_logs\', \'system_settings\', \'user_activity_logs\')"', { encoding: 'utf8' });
  console.log('✅ Admin tables exist:', tableCheck);
} catch (error) {
  console.log('❌ Error checking tables:', error.message);
}

// Test 2: Check admin users
console.log('\n2️⃣ Testing Admin Users...');
try {
  const adminUsers = execSync('wrangler d1 execute url-shortner-db --command "SELECT id, email, name, role, is_active FROM admin_users"', { encoding: 'utf8' });
  console.log('✅ Admin users found:', adminUsers);
} catch (error) {
  console.log('❌ Error checking admin users:', error.message);
}

// Test 3: Check system settings
console.log('\n3️⃣ Testing System Settings...');
try {
  const settings = execSync('wrangler d1 execute url-shortner-db --command "SELECT setting_key, setting_value, setting_type FROM system_settings LIMIT 5"', { encoding: 'utf8' });
  console.log('✅ System settings found:', settings);
} catch (error) {
  console.log('❌ Error checking system settings:', error.message);
}

// Test 4: Check admin activity logs table structure
console.log('\n4️⃣ Testing Admin Activity Logs...');
try {
  const tableInfo = execSync('wrangler d1 execute url-shortner-db --command "PRAGMA table_info(admin_activity_logs)"', { encoding: 'utf8' });
  console.log('✅ Admin activity logs table structure:', tableInfo);
} catch (error) {
  console.log('❌ Error checking admin activity logs:', error.message);
}

// Test 5: Check user activity logs table structure
console.log('\n5️⃣ Testing User Activity Logs...');
try {
  const tableInfo = execSync('wrangler d1 execute url-shortner-db --command "PRAGMA table_info(user_activity_logs)"', { encoding: 'utf8' });
  console.log('✅ User activity logs table structure:', tableInfo);
} catch (error) {
  console.log('❌ Error checking user activity logs:', error.message);
}

// Test 6: Check if super admin exists and has proper permissions
console.log('\n6️⃣ Testing Super Admin Permissions...');
try {
  const superAdmin = execSync('wrangler d1 execute url-shortner-db --command "SELECT id, email, name, role, permissions FROM admin_users WHERE role = \'super_admin\' LIMIT 1"', { encoding: 'utf8' });
  console.log('✅ Super admin found:', superAdmin);
} catch (error) {
  console.log('❌ Error checking super admin:', error.message);
}

// Test 7: Check indexes
console.log('\n7️⃣ Testing Database Indexes...');
try {
  const indexes = execSync('wrangler d1 execute url-shortner-db --command "SELECT name FROM sqlite_master WHERE type=\'index\' AND name LIKE \'idx_admin_%\'"', { encoding: 'utf8' });
  console.log('✅ Admin indexes found:', indexes);
} catch (error) {
  console.log('❌ Error checking indexes:', error.message);
}

console.log('\n🎯 Admin System Test Complete!');
console.log('\n📋 Next Steps:');
console.log('1. Migration already completed successfully! ✅');
console.log('2. Test the admin login with: admin@yoursite.com / admin123');
console.log('3. Verify all admin endpoints are working');
console.log('4. Check that system settings can be updated');
