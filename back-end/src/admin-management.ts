import { Context } from 'hono';
import { generateId, hashAdminPassword, verifyAdminPassword } from './admin-auth-new';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'moderator' | 'analyst';
  permissions: Record<string, string[]>;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface CreateAdminData {
  email: string;
  name: string;
  password: string;
  role: 'admin' | 'moderator' | 'analyst';
  permissions?: Record<string, string[]>;
}

export interface UpdateAdminData {
  name?: string;
  role?: 'admin' | 'moderator' | 'analyst';
  permissions?: Record<string, string[]>;
  is_active?: boolean;
}

// Default role permissions
export const ROLE_PERMISSIONS = {
  super_admin: {
    users: ['read', 'write', 'delete'],
    links: ['read', 'write', 'delete'],
    subscriptions: ['read', 'write', 'delete'],
    analytics: ['read', 'write'],
    system: ['read', 'write', 'delete'],
    admins: ['read', 'write', 'delete'],
  },
  admin: {
    users: ['read', 'write'],
    links: ['read', 'write'],
    subscriptions: ['read', 'write'],
    analytics: ['read', 'write'],
    system: ['read'],
    admins: ['read'],
  },
  moderator: {
    users: ['read'],
    links: ['read', 'write'],
    subscriptions: ['read'],
    analytics: ['read'],
    system: ['read'],
    admins: [],
  },
  analyst: {
    users: ['read'],
    links: ['read'],
    subscriptions: ['read'],
    analytics: ['read', 'write'],
    system: ['read'],
    admins: [],
  },
};

// Admin management functions
export async function getAllAdminUsers(env: any): Promise<AdminUser[]> {
  try {
    const result = await env.DB.prepare(`
      SELECT id, email, name, role, permissions, is_active, last_login_at, created_at, updated_at, created_by
      FROM admin_users
      ORDER BY created_at DESC
    `).all();
    
    return result.results.map((row: any) => ({
      ...row,
      permissions: typeof row.permissions === 'string' ? JSON.parse(row.permissions) : row.permissions,
    }));
  } catch (error) {
    console.error('Error fetching admin users:', error);
    throw new Error('Failed to fetch admin users');
  }
}

export async function getAdminUserById(env: any, id: string): Promise<AdminUser | null> {
  try {
    const result = await env.DB.prepare(`
      SELECT id, email, name, role, permissions, is_active, last_login_at, created_at, updated_at, created_by
      FROM admin_users
      WHERE id = ?
    `).bind(id).first();
    
    if (!result) return null;
    
    return {
      ...result,
      permissions: typeof result.permissions === 'string' ? JSON.parse(result.permissions) : result.permissions,
    };
  } catch (error) {
    console.error('Error fetching admin user:', error);
    throw new Error('Failed to fetch admin user');
  }
}

export async function getAdminUserByEmail(env: any, email: string): Promise<AdminUser | null> {
  try {
    const result = await env.DB.prepare(`
      SELECT id, email, name, role, permissions, is_active, last_login_at, created_at, updated_at, created_by
      FROM admin_users
      WHERE email = ?
    `).bind(email).first();
    
    if (!result) return null;
    
    return {
      ...result,
      permissions: typeof result.permissions === 'string' ? JSON.parse(result.permissions) : result.permissions,
    };
  } catch (error) {
    console.error('Error fetching admin user by email:', error);
    throw new Error('Failed to fetch admin user');
  }
}

export async function createAdminUser(env: any, data: CreateAdminData, createdBy: string): Promise<AdminUser> {
  try {
    // Check if email already exists
    const existingAdmin = await getAdminUserByEmail(env, data.email);
    if (existingAdmin) {
      throw new Error('Admin user with this email already exists');
    }

    const id = generateId();
    const passwordHash = await hashAdminPassword(data.password);
    const permissions = data.permissions || ROLE_PERMISSIONS[data.role];
    const now = new Date().toISOString();

    await env.DB.prepare(`
      INSERT INTO admin_users (id, email, name, password_hash, role, permissions, is_active, created_at, updated_at, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      data.email,
      data.name,
      passwordHash,
      data.role,
      JSON.stringify(permissions),
      true,
      now,
      now,
      createdBy
    ).run();

    // Log the activity
    await logAdminActivity(env, {
      admin_id: createdBy,
      action: 'admin_created',
      resource_type: 'admin',
      resource_id: id,
      details: { email: data.email, role: data.role },
    });

    return {
      id,
      email: data.email,
      name: data.name,
      role: data.role,
      permissions,
      is_active: true,
      created_at: now,
      updated_at: now,
      created_by: createdBy,
    };
  } catch (error) {
    console.error('Error creating admin user:', error);
    throw error;
  }
}

export async function updateAdminUser(env: any, id: string, data: UpdateAdminData, updatedBy: string): Promise<AdminUser> {
  try {
    const existingAdmin = await getAdminUserById(env, id);
    if (!existingAdmin) {
      throw new Error('Admin user not found');
    }

    const updateFields: string[] = [];
    const bindValues: any[] = [];

    if (data.name !== undefined) {
      updateFields.push('name = ?');
      bindValues.push(data.name);
    }

    if (data.role !== undefined) {
      updateFields.push('role = ?');
      bindValues.push(data.role);
    }

    if (data.permissions !== undefined) {
      updateFields.push('permissions = ?');
      bindValues.push(JSON.stringify(data.permissions));
    }

    if (data.is_active !== undefined) {
      updateFields.push('is_active = ?');
      bindValues.push(data.is_active);
    }

    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }

    updateFields.push('updated_at = ?');
    bindValues.push(new Date().toISOString());

    bindValues.push(id);

    await env.DB.prepare(`
      UPDATE admin_users
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `).bind(...bindValues).run();

    // Log the activity
    await logAdminActivity(env, {
      admin_id: updatedBy,
      action: 'admin_updated',
      resource_type: 'admin',
      resource_id: id,
      details: data,
    });

    // Return updated admin user
    const updatedAdmin = await getAdminUserById(env, id);
    if (!updatedAdmin) {
      throw new Error('Failed to fetch updated admin user');
    }

    return updatedAdmin;
  } catch (error) {
    console.error('Error updating admin user:', error);
    throw error;
  }
}

export async function deleteAdminUser(env: any, id: string, deletedBy: string): Promise<void> {
  try {
    const existingAdmin = await getAdminUserById(env, id);
    if (!existingAdmin) {
      throw new Error('Admin user not found');
    }

    // Prevent deletion of super admin
    if (existingAdmin.role === 'super_admin') {
      throw new Error('Cannot delete super admin user');
    }

    // Prevent self-deletion
    if (id === deletedBy) {
      throw new Error('Cannot delete your own account');
    }

    // Check if this is the last admin
    const allAdmins = await getAllAdminUsers(env);
    const activeAdmins = allAdmins.filter(admin => admin.is_active && admin.id !== id);
    if (activeAdmins.length === 0) {
      throw new Error('Cannot delete the last active admin user');
    }

    await env.DB.prepare(`
      DELETE FROM admin_users
      WHERE id = ?
    `).bind(id).run();

    // Log the activity
    await logAdminActivity(env, {
      admin_id: deletedBy,
      action: 'admin_deleted',
      resource_type: 'admin',
      resource_id: id,
      details: { email: existingAdmin.email, role: existingAdmin.role },
    });
  } catch (error) {
    console.error('Error deleting admin user:', error);
    throw error;
  }
}

export async function toggleAdminStatus(env: any, id: string, toggledBy: string): Promise<{ is_active: boolean }> {
  try {
    const existingAdmin = await getAdminUserById(env, id);
    if (!existingAdmin) {
      throw new Error('Admin user not found');
    }

    // Prevent deactivating super admin
    if (existingAdmin.role === 'super_admin' && existingAdmin.is_active) {
      throw new Error('Cannot deactivate super admin user');
    }

    // Prevent self-deactivation
    if (id === toggledBy && existingAdmin.is_active) {
      throw new Error('Cannot deactivate your own account');
    }

    const newStatus = !existingAdmin.is_active;

    await env.DB.prepare(`
      UPDATE admin_users
      SET is_active = ?, updated_at = ?
      WHERE id = ?
    `).bind(newStatus, new Date().toISOString(), id).run();

    // Log the activity
    await logAdminActivity(env, {
      admin_id: toggledBy,
      action: 'admin_status_toggled',
      resource_type: 'admin',
      resource_id: id,
      details: { 
        previous_status: existingAdmin.is_active, 
        new_status: newStatus,
        email: existingAdmin.email 
      },
    });

    return { is_active: newStatus };
  } catch (error) {
    console.error('Error toggling admin status:', error);
    throw error;
  }
}

export async function changeAdminPassword(env: any, id: string, newPassword: string, changedBy: string): Promise<void> {
  try {
    const existingAdmin = await getAdminUserById(env, id);
    if (!existingAdmin) {
      throw new Error('Admin user not found');
    }

    const passwordHash = await hashAdminPassword(newPassword);

    await env.DB.prepare(`
      UPDATE admin_users
      SET password_hash = ?, updated_at = ?
      WHERE id = ?
    `).bind(passwordHash, new Date().toISOString(), id).run();

    // Log the activity
    await logAdminActivity(env, {
      admin_id: changedBy,
      action: 'admin_password_changed',
      resource_type: 'admin',
      resource_id: id,
      details: { email: existingAdmin.email },
    });
  } catch (error) {
    console.error('Error changing admin password:', error);
    throw error;
  }
}

// Activity logging function
async function logAdminActivity(env: any, data: {
  admin_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: any;
}): Promise<void> {
  try {
    const id = generateId();
    const now = new Date().toISOString();

    await env.DB.prepare(`
      INSERT INTO admin_activity_logs (id, admin_user_id, action, resource, resource_id, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      data.admin_id,
      data.action,
      data.resource_type,
      data.resource_id || null,
      JSON.stringify(data.details || {}),
      now
    ).run();
  } catch (error) {
    console.error('Error logging admin activity:', error);
    // Don't throw error for logging failures
  }
}

// Permission checking utilities
export function hasPermission(userPermissions: Record<string, string[]>, resource: string, action: string): boolean {
  const resourcePermissions = userPermissions[resource];
  if (!resourcePermissions) return false;
  
  return resourcePermissions.includes(action);
}

export function canManageAdmins(userRole: string, userPermissions: Record<string, string[]>): boolean {
  if (userRole === 'super_admin') return true;
  return hasPermission(userPermissions, 'admins', 'write');
}

export function canDeleteAdmins(userRole: string, userPermissions: Record<string, string[]>): boolean {
  if (userRole === 'super_admin') return true;
  return hasPermission(userPermissions, 'admins', 'delete');
}
