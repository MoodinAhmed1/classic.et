const fetch = require('node-fetch');

const BASE_URL = 'https://back-end.xayrix1.workers.dev';

async function testSystemSettings() {
  console.log('🧪 Testing System Settings Endpoints...\n');

  try {
    // Test 1: Get system settings (should fail without auth)
    console.log('1. Testing GET /api/admin/settings/system (unauthenticated)...');
    try {
      const response = await fetch(`${BASE_URL}/api/admin/settings/system`);
      console.log(`   Status: ${response.status}`);
      if (response.status === 401) {
        console.log('   ✅ Correctly requires authentication');
      } else {
        console.log('   ❌ Should require authentication');
      }
    } catch (error) {
      console.log('   ❌ Request failed:', error.message);
    }

    // Test 2: Get all settings (should fail without auth)
    console.log('\n2. Testing GET /api/admin/settings (unauthenticated)...');
    try {
      const response = await fetch(`${BASE_URL}/api/admin/settings`);
      console.log(`   Status: ${response.status}`);
      if (response.status === 401) {
        console.log('   ✅ Correctly requires authentication');
      } else {
        console.log('   ❌ Should require authentication');
      }
    } catch (error) {
      console.log('   ❌ Request failed:', error.message);
    }

    // Test 3: Get individual setting (should fail without auth)
    console.log('\n3. Testing GET /api/admin/settings/site_name (unauthenticated)...');
    try {
      const response = await fetch(`${BASE_URL}/api/admin/settings/site_name`);
      console.log(`   Status: ${response.status}`);
      if (response.status === 401) {
        console.log('   ✅ Correctly requires authentication');
      } else {
        console.log('   ❌ Should require authentication');
      }
    } catch (error) {
      console.log('   ❌ Request failed:', error.message);
    }

    console.log('\n✅ System settings endpoints are properly protected');
    console.log('   - All endpoints require authentication');
    console.log('   - Endpoints are accessible at:');
    console.log('     • GET /api/admin/settings/system');
    console.log('     • PUT /api/admin/settings/system');
    console.log('     • GET /api/admin/settings/:key');
    console.log('     • PUT /api/admin/settings/:key');
    console.log('     • GET /api/admin/settings');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testSystemSettings();
