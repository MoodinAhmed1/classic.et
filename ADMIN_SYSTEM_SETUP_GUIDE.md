# Admin System Setup Guide

This guide will help you set up and test the complete admin system for your URL shortener application.

## 🚀 Quick Start

### 1. Run the Database Migration

First, apply the latest migration to fix any table inconsistencies:

```bash
wrangler d1 execute classic-et --file migrations/0019_fix_admin_system_tables.sql
```

### 2. Test the Admin System

Run the test script to verify everything is working:

```bash
node test-admin-system.js
```

### 3. Access the Admin Panel

- **URL**: `/admin`
- **Default Credentials**: 
  - Email: `admin@yoursite.com`
  - Password: `admin123`

## 🏗️ System Architecture

### Database Tables

- **`admin_users`** - Admin user accounts with roles and permissions
- **`admin_activity_logs`** - Audit trail for admin actions
- **`user_activity_logs`** - User activity tracking
- **`system_settings`** - Configurable system parameters

### Admin Roles & Permissions

#### Super Admin
- Full access to all features
- Can manage other admin users
- Can modify system settings
- Can view all analytics and data

#### Admin
- User management (read/write)
- Link management (read/write)
- Subscription management (read/write)
- Analytics access (read/write)
- System settings (read only)

#### Moderator
- User management (read only)
- Link management (read/write)
- Subscription management (read only)
- Analytics access (read only)

#### Analyst
- User management (read only)
- Link management (read only)
- Subscription management (read only)
- Analytics access (read/write)

## 🔧 API Endpoints

### Authentication
- `POST /api/admin/auth/login` - Admin login
- `GET /api/admin/auth/me` - Get current admin user
- `POST /api/admin/auth/logout` - Admin logout

### User Management
- `GET /api/admin/users/regular` - List regular users
- `POST /api/admin/users/regular` - Create new user
- `PUT /api/admin/users/regular/:id` - Update user
- `DELETE /api/admin/users/regular/:id` - Delete user
- `GET /api/admin/users/regular/:id` - Get user by ID

### Admin Management
- `GET /api/admin/users` - List admin users
- `POST /api/admin/users` - Create admin user
- `PUT /api/admin/users/:id` - Update admin user
- `DELETE /api/admin/users/:id` - Delete admin user
- `PATCH /api/admin/users/:id/toggle-status` - Toggle admin status
- `PATCH /api/admin/users/:id/change-password` - Change admin password

### System Settings
- `GET /api/admin/settings/system` - Get all system settings
- `PUT /api/admin/settings/system` - Update multiple settings
- `GET /api/admin/settings/:key` - Get individual setting
- `PUT /api/admin/settings/:key` - Update individual setting

### Analytics & Monitoring
- `GET /api/admin/analytics/system` - System-wide analytics
- `GET /api/admin/activity-logs` - Admin activity logs
- `GET /api/admin/user-activity-logs` - User activity logs

### Content Management
- `GET /api/admin/links` - List all links
- `PUT /api/admin/links/:id` - Update link
- `DELETE /api/admin/links/:id` - Delete link

### Subscription Management
- `GET /api/admin/subscriptions` - List subscriptions
- `GET /api/admin/subscription-plans` - List subscription plans
- `PUT /api/admin/subscription-plans/:id` - Update plan
- `POST /api/admin/subscription-plans` - Create plan
- `DELETE /api/admin/subscription-plans/:id` - Delete plan

### Payment Management
- `GET /api/admin/transactions` - List payment transactions
- `POST /api/admin/transactions/:id/refund` - Process refund
- `POST /api/admin/transactions/:txRef/verify` - Verify Chapa transaction
- `GET /api/admin/transactions/download` - Download transactions

## 🎯 Key Features

### 1. Role-Based Access Control
- Granular permissions for different admin roles
- Secure access to sensitive operations
- Audit trail for all admin actions

### 2. System Configuration
- Configurable site settings
- Email service configuration
- Payment gateway settings
- Security parameters

### 3. User Management
- Create, edit, and delete users
- Manage subscription tiers
- Monitor user activity
- Bulk operations support

### 4. Analytics & Reporting
- System-wide analytics dashboard
- User behavior tracking
- Revenue and subscription metrics
- Export capabilities

### 5. Content Moderation
- Link management and moderation
- Spam detection and prevention
- Content filtering options

## 🔒 Security Features

### Authentication
- JWT-based authentication
- HttpOnly cookies for security
- Session timeout management
- Password hashing with SHA-256

### Authorization
- Role-based permissions
- Resource-level access control
- Action-level permissions
- Admin privilege escalation prevention

### Audit Logging
- Complete admin action tracking
- User activity monitoring
- IP address and user agent logging
- Immutable audit trail

## 🧪 Testing

### Manual Testing Checklist

- [ ] Admin login/logout
- [ ] User management operations
- [ ] System settings updates
- [ ] Analytics dashboard access
- [ ] Permission enforcement
- [ ] Activity logging
- [ ] Error handling

### API Testing

Use tools like Postman or curl to test the endpoints:

```bash
# Test admin login
curl -X POST https://your-backend.com/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@yoursite.com","password":"admin123"}'

# Test getting system settings
curl -X GET https://your-backend.com/api/admin/settings/system \
  -H "Cookie: admin_auth_token=YOUR_TOKEN"
```

## 🚨 Troubleshooting

### Common Issues

1. **Admin tables not found**
   - Run the migration: `wrangler d1 execute classic-et --file migrations/0019_fix_admin_system_tables.sql`

2. **Permission denied errors**
   - Check admin role and permissions
   - Verify JWT token is valid
   - Check if admin account is active

3. **System settings not loading**
   - Verify `system_settings` table exists
   - Check if default settings are inserted
   - Verify admin has read permissions

4. **Activity logging not working**
   - Check table names match (`admin_activity_logs`, not `admin_activity_log`)
   - Verify foreign key constraints
   - Check database permissions

### Debug Commands

```bash
# Check database schema
wrangler d1 execute classic-et --command "SELECT name FROM sqlite_master WHERE type='table'"

# Check admin users
wrangler d1 execute classic-et --command "SELECT * FROM admin_users"

# Check system settings
wrangler d1 execute classic-et --command "SELECT * FROM system_settings"

# Check activity logs
wrangler d1 execute classic-et --command "SELECT * FROM admin_activity_logs LIMIT 5"
```

## 📚 Next Steps

1. **Customize Settings**: Update default system settings for your needs
2. **Add Admin Users**: Create additional admin accounts with appropriate roles
3. **Configure Integrations**: Set up email and payment service credentials
4. **Monitor Usage**: Use the analytics dashboard to track system performance
5. **Security Review**: Regularly review admin permissions and activity logs

## 🆘 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Run the test script: `node test-admin-system.js`
3. Review the database schema and migrations
4. Check the browser console and network tab for errors
5. Verify all environment variables are set correctly

---

**Note**: This admin system is designed to be production-ready with proper security measures. Always change the default admin password and review security settings before deploying to production.
