// Test script for admin management functionality
// Run with: node test-admin-management.js

const API_BASE_URL = "https://back-end.xayrix1.workers.dev"

async function testAdminManagement() {
  console.log("🧪 Testing Admin Management API...\n")

  try {
    // Test 1: Get all admin users
    console.log("1. Testing GET /api/admin/users...")
    const getResponse = await fetch(`${API_BASE_URL}/api/admin/users`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (getResponse.ok) {
      const data = await getResponse.json()
      console.log("✅ Success:", data.adminUsers?.length || 0, "admin users found")
    } else {
      const error = await getResponse.json()
      console.log("❌ Failed:", error.error || 'Unknown error')
    }

    // Test 2: Create admin user (this will fail without auth, but we can test the endpoint)
    console.log("\n2. Testing POST /api/admin/users...")
    const createResponse = await fetch(`${API_BASE_URL}/api/admin/users`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        name: 'Test Admin',
        password: 'testpass123',
        role: 'moderator'
      })
    })
    
    if (createResponse.ok) {
      const data = await createResponse.json()
      console.log("✅ Success: Admin created")
    } else {
      const error = await createResponse.json()
      console.log("❌ Failed (expected without auth):", error.error || 'Unknown error')
    }

    // Test 3: Test admin login to get a session
    console.log("\n3. Testing admin login...")
    const loginResponse = await fetch(`${API_BASE_URL}/api/admin/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@yoursite.com',
        password: 'admin123'
      })
    })
    
    if (loginResponse.ok) {
      const data = await loginResponse.json()
      console.log("✅ Login successful:", data.adminUser?.email)
      
      // Now test getting admin users with auth
      console.log("\n4. Testing GET /api/admin/users with auth...")
      const authGetResponse = await fetch(`${API_BASE_URL}/api/admin/users`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (authGetResponse.ok) {
        const authData = await authGetResponse.json()
        console.log("✅ Success with auth:", authData.adminUsers?.length || 0, "admin users found")
        
        if (authData.adminUsers && authData.adminUsers.length > 0) {
          const firstAdmin = authData.adminUsers[0]
          console.log("   First admin:", firstAdmin.name, `(${firstAdmin.role})`)
        }
      } else {
        const error = await authGetResponse.json()
        console.log("❌ Failed with auth:", error.error || 'Unknown error')
      }
      
    } else {
      const error = await loginResponse.json()
      console.log("❌ Login failed:", error.error || 'Unknown error')
    }

  } catch (error) {
    console.error("❌ Test failed with exception:", error.message)
  }

  console.log("\n🏁 Admin Management API test completed!")
}

// Run the test
testAdminManagement()
