# Admin Management System

This document describes the new admin management system that has been completely rebuilt from scratch to provide a robust, secure, and maintainable solution for managing admin users.

## Overview

The admin management system consists of:
- **Backend Module**: `back-end/src/admin-management.ts` - Core business logic
- **Frontend API Client**: `front-end/src/lib/admin-management-api.ts` - API communication
- **Frontend Context**: `front-end/src/contexts/admin-management-context.tsx` - State management
- **Frontend Page**: `front-end/src/app/admin/admins/page.tsx` - User interface

## Features

### ✅ Admin User Management
- Create new admin users with predefined roles
- Update existing admin user information
- Delete admin users (with safety checks)
- Toggle admin user status (active/inactive)
- Change admin passwords

### ✅ Role-Based Access Control
- **Super Admin**: Full access to all features
- **Admin**: Manage users, links, subscriptions, analytics
- **Moderator**: Read users, manage links, read analytics
- **Analyst**: Read users, links, subscriptions, manage analytics

### ✅ Permission System
- Granular permissions for each resource (users, links, subscriptions, analytics, system, admins)
- Actions: read, write, delete
- Automatic permission assignment based on role
- Custom permission overrides

### ✅ Security Features
- PBKDF2 password hashing with SHA-256
- Session-based authentication
- Activity logging for all admin actions
- Prevention of self-deletion and self-deactivation
- Protection of super admin accounts

## Architecture

### Backend Structure

```
admin-management.ts
├── Interfaces (AdminUser, CreateAdminData, UpdateAdminData)
├── Role permissions definitions
├── CRUD operations (create, read, update, delete)
├── Status management (toggle active/inactive)
├── Password management
├── Activity logging
└── Permission utilities
```

### Frontend Structure

```
admin-management-api.ts
├── API client functions
├── Type definitions
├── Error handling
└── Request/response interfaces

admin-management-context.tsx
├── State management
├── CRUD operations
├── Loading states
├── Error handling
└── Toast notifications

page.tsx
├── User interface
├── Forms and dialogs
├── Data display
├── Search and filtering
└── Action handlers
```

## API Endpoints

### Admin Users
- `GET /api/admin/users` - List all admin users
- `POST /api/admin/users` - Create new admin user
- `PUT /api/admin/users/:id` - Update admin user
- `DELETE /api/admin/users/:id` - Delete admin user
- `PATCH /api/admin/users/:id/toggle-status` - Toggle admin status
- `PATCH /api/admin/users/:id/change-password` - Change admin password

### Authentication
- `POST /api/admin/auth/login` - Admin login
- `POST /api/admin/auth/logout` - Admin logout
- `GET /api/admin/auth/me` - Get current admin user

## Database Schema

The system uses the existing `admin_users` table with the following structure:

```sql
CREATE TABLE admin_users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'moderator', 'analyst')),
  permissions JSON NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_login_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT,
  FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL
);
```

## Usage Examples

### Creating an Admin User

```typescript
const newAdmin = await createAdmin({
  email: 'moderator@example.com',
  name: 'John Doe',
  password: 'securepassword123',
  role: 'moderator'
});
```

### Updating an Admin User

```typescript
const updatedAdmin = await updateAdmin(adminId, {
  name: 'Jane Doe',
  role: 'admin',
  isActive: true
});
```

### Toggling Admin Status

```typescript
const result = await toggleAdminStatus(adminId);
console.log('New status:', result.is_active);
```

## Security Considerations

### Password Security
- Passwords are hashed using PBKDF2 with 150,000 iterations
- SHA-256 fallback for legacy compatibility
- Salt is randomly generated for each password

### Access Control
- All admin operations require authentication
- Permission-based access control
- Role-based restrictions
- Prevention of privilege escalation

### Audit Logging
- All admin actions are logged
- Includes user agent and IP address
- Timestamp and resource tracking
- Non-blocking logging (failures don't affect operations)

## Error Handling

The system provides comprehensive error handling:

- **Validation Errors**: Missing required fields, invalid data
- **Business Logic Errors**: Cannot delete super admin, cannot self-delete
- **Database Errors**: Connection issues, constraint violations
- **Permission Errors**: Insufficient privileges for operations

## Testing

A test script is provided at `back-end/test-admin-management.js` to verify the API endpoints:

```bash
cd back-end
node test-admin-management.js
```

## Migration from Old System

The new system is designed to be a drop-in replacement:

1. **No database changes required** - Uses existing schema
2. **Backward compatible** - Maintains existing API contracts
3. **Enhanced functionality** - Adds new features without breaking changes
4. **Improved error handling** - Better user experience and debugging

## Troubleshooting

### Common Issues

1. **Permission Denied**: Check if user has required permissions for the operation
2. **Cannot Delete Super Admin**: Super admin accounts are protected from deletion
3. **Self-Deletion Prevention**: Users cannot delete their own accounts
4. **Last Admin Protection**: Cannot delete the last active admin user

### Debug Mode

Enable debug logging by setting environment variables:
```bash
DEBUG_ADMIN_MANAGEMENT=true
```

## Future Enhancements

- [ ] Admin activity dashboard
- [ ] Bulk admin operations
- [ ] Admin user templates
- [ ] Advanced permission management
- [ ] Admin user analytics
- [ ] Two-factor authentication
- [ ] Admin user groups

## Support

For issues or questions about the admin management system:

1. Check the error logs in the browser console
2. Verify database connectivity
3. Ensure proper authentication
4. Check permission settings
5. Review the activity logs for failed operations

---

**Note**: This system replaces the previous admin management implementation completely. All functionality has been rebuilt with improved security, error handling, and maintainability.
