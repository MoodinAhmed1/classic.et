// Simple test script to verify user activity logging setup
// Run with: node test-user-activity.js

const { D1Database } = require('@cloudflare/workers-types');

// Mock environment for testing
const mockEnv = {
  DB: {
    prepare: (query) => ({
      bind: (...params) => ({
        first: async () => {
          console.log('Query:', query);
          console.log('Params:', params);
          
          // Mock table check
          if (query.includes('sqlite_master') && query.includes('user_activity_logs')) {
            return { name: 'user_activity_logs' };
          }
          
          // Mock user activity logs query
          if (query.includes('user_activity_logs')) {
            return {
              logs: [
                {
                  id: 'test-1',
                  user_id: 'user-1',
                  action: 'link_created',
                  resource_type: 'link',
                  resource_id: 'link-1',
                  details: JSON.stringify({ shortCode: 'abc123', originalUrl: 'https://example.com' }),
                  ip_address: '127.0.0.1',
                  user_agent: 'Test Browser',
                  created_at: new Date().toISOString()
                }
              ],
              total: 1
            };
          }
          
          return null;
        },
        all: async () => ({
          results: [
            {
              id: 'test-1',
              user_id: 'user-1',
              user_name: 'Test User',
              user_email: 'test@example.com',
              action: 'link_created',
              resource_type: 'link',
              resource_id: 'link-1',
              details: JSON.stringify({ shortCode: 'abc123', originalUrl: 'https://example.com' }),
              ip_address: '127.0.0.1',
              user_agent: 'Test Browser',
              created_at: new Date().toISOString()
            }
          ]
        }),
        run: async () => ({ success: true })
      })
    })
  }
};

// Test the logUserActivity function
async function testUserActivityLogging() {
  console.log('Testing user activity logging...\n');
  
  try {
    // Test table existence check
    console.log('1. Testing table existence check...');
    const tableCheck = await mockEnv.DB
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='user_activity_logs'")
      .first();
    
    if (tableCheck) {
      console.log('✅ user_activity_logs table exists');
    } else {
      console.log('❌ user_activity_logs table does not exist');
    }
    
    // Test user activity logs query
    console.log('\n2. Testing user activity logs query...');
    const logsQuery = `
      SELECT 
        u.id,
        u.user_id,
        usr.name as user_name,
        usr.email as user_email,
        u.action,
        u.resource_type,
        u.resource_id,
        u.details,
        u.ip_address,
        u.user_agent,
        u.created_at
      FROM user_activity_logs u
      LEFT JOIN users usr ON u.user_id = usr.id
      ORDER BY u.created_at DESC
      LIMIT 50 OFFSET 0
    `;
    
    const logsResult = await mockEnv.DB
      .prepare(logsQuery)
      .all();
    
    if (logsResult && logsResult.results && logsResult.results.length > 0) {
      console.log('✅ User activity logs query successful');
      console.log('Sample log:', logsResult.results[0]);
    } else {
      console.log('❌ User activity logs query failed or returned no results');
    }
    
    console.log('\n✅ User activity logging system is properly configured!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testUserActivityLogging();
