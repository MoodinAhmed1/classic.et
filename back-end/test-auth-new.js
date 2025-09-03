// Test script for the new admin authentication system
const BACKEND_URL = 'https://back-end.xayrix1.workers.dev';

async function testAuthEndpoints() {
  console.log('🧪 Testing new admin authentication system...\n');

  // Test 1: Check if login endpoint exists
  console.log('1. Testing login endpoint...');
  try {
    const response = await fetch(`${BACKEND_URL}/api/admin/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpassword'
      })
    });

    if (response.status === 401) {
      console.log('✅ Login endpoint exists and responds with 401 for invalid credentials (expected)');
    } else if (response.status === 404) {
      console.log('❌ Login endpoint not found (404)');
      return;
    } else {
      console.log(`⚠️  Login endpoint responded with unexpected status: ${response.status}`);
    }
  } catch (error) {
    console.log('❌ Error testing login endpoint:', error.message);
    return;
  }

  // Test 2: Check if me endpoint exists (should return 401 without auth)
  console.log('\n2. Testing me endpoint...');
  try {
    const response = await fetch(`${BACKEND_URL}/api/admin/auth/me`);
    
    if (response.status === 401) {
      console.log('✅ Me endpoint exists and requires authentication (expected)');
    } else if (response.status === 404) {
      console.log('❌ Me endpoint not found (404)');
    } else {
      console.log(`⚠️  Me endpoint responded with unexpected status: ${response.status}`);
    }
  } catch (error) {
    console.log('❌ Error testing me endpoint:', error.message);
  }

  // Test 3: Check if logout endpoint exists
  console.log('\n3. Testing logout endpoint...');
  try {
    const response = await fetch(`${BACKEND_URL}/api/admin/auth/logout`, {
      method: 'POST'
    });
    
    if (response.status === 200) {
      console.log('✅ Logout endpoint exists and responds with 200');
    } else if (response.status === 404) {
      console.log('❌ Logout endpoint not found (404)');
    } else {
      console.log(`⚠️  Logout endpoint responded with unexpected status: ${response.status}`);
    }
  } catch (error) {
    console.log('❌ Error testing logout endpoint:', error.message);
  }

  // Test 4: Check if admin users endpoint exists (should return 401 without auth)
  console.log('\n4. Testing admin users endpoint...');
  try {
    const response = await fetch(`${BACKEND_URL}/api/admin/users`);
    
    if (response.status === 401) {
      console.log('✅ Admin users endpoint exists and requires authentication (expected)');
    } else if (response.status === 404) {
      console.log('❌ Admin users endpoint not found (404)');
    } else {
      console.log(`⚠️  Admin users endpoint responded with unexpected status: ${response.status}`);
    }
  } catch (error) {
    console.log('❌ Error testing admin users endpoint:', error.message);
  }

  console.log('\n🎯 Authentication system test completed!');
  console.log('\n📝 Next steps:');
  console.log('1. Create an admin user in the database');
  console.log('2. Test login with valid credentials');
  console.log('3. Test protected endpoints with authentication');
}

// Run the tests
testAuthEndpoints().catch(console.error);
