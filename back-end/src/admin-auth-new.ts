import { verify } from "hono/jwt"
import { getCookie } from "hono/cookie"

// Admin user interface
export interface AdminUser {
  id: string
  email: string
  name: string
  role: "super_admin" | "admin" | "moderator" | "analyst"
  permissions: Record<string, string[]>
  is_active: boolean
  last_login_at?: string
  created_at: string
  updated_at: string
}

// Admin session interface
export interface AdminSession {
  id: string
  admin_id: string
  token_hash: string
  expires_at: string
  ip_address?: string
  user_agent?: string
  created_at: string
}

// Utility functions
export function generateId(): string {
  const uuid = crypto.randomUUID()
  return uuid;
}

// Password hashing utilities (Simple SHA-256)
function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

export async function hashAdminPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password)
  const digest = await crypto.subtle.digest("SHA-256", data)
  return toHex(digest)
}

export function isLegacySha256Hash(hash: string): boolean {
  return /^[a-f0-9]{64}$/i.test(hash)
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest("SHA-256", data)
  return toHex(digest)
}

export async function verifyAdminPassword(password: string, storedHash: string): Promise<{
  valid: boolean
  scheme: "sha256" | "unknown"
}> {
  if (isLegacySha256Hash(storedHash)) {
    const actualHash = await sha256Hex(password)
    return { valid: actualHash === storedHash, scheme: "sha256" }
  }
  return { valid: false, scheme: "unknown" }
}

// Database operations
export async function getAdminByEmail(db: any, email: string): Promise<AdminUser | null> {
  try {
    const admin = await db.prepare(`
      SELECT * FROM admin_users WHERE email = ? AND is_active = true
    `).bind(email).first() as any

    if (!admin) return null

    // Parse permissions
    let permissions = {}
    try {
      permissions = JSON.parse(admin.permissions || '{}')
    } catch {
      permissions = {}
    }

    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      permissions,
      is_active: admin.is_active,
      last_login_at: admin.last_login_at,
      created_at: admin.created_at,
      updated_at: admin.updated_at
    }
  } catch (error) {
    console.error('Error getting admin by email:', error)
    return null
  }
}

export async function getAdminById(db: any, id: string): Promise<AdminUser | null> {
  try {
    const admin = await db.prepare(`
      SELECT * FROM admin_users WHERE id = ? AND is_active = true
    `).bind(id).first() as any

    if (!admin) return null

    // Parse permissions
    let permissions = {}
    try {
      permissions = JSON.parse(admin.permissions || '{}')
    } catch {
      permissions = {}
    }

    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      permissions,
      is_active: admin.is_active,
      last_login_at: admin.last_login_at,
      created_at: admin.created_at,
      updated_at: admin.updated_at
    }
  } catch (error) {
    console.error('Error getting admin by ID:', error)
    return null
  }
}

export async function updateAdminLastLogin(db: any, adminId: string): Promise<void> {
  try {
    await db.prepare(`
      UPDATE admin_users SET last_login_at = datetime('now') WHERE id = ?
    `).bind(adminId).run()
  } catch (error) {
    console.error('Error updating admin last login:', error)
  }
}

// Admin authentication middleware
export const adminAuthMiddleware = async (c: any, next: any) => {
  try {
    const token = getCookie(c, "admin_auth_token")

    if (!token) {
      return c.json({ error: "Unauthorized - Admin access required" }, 401)
    }

    const payload = await verify(token, c.env.JWT_SECRET)

    // Verify admin user exists and is active
    const admin = await getAdminById(c.env.DB, payload.adminId as string)

    if (!admin) {
      return c.json({ error: "Admin account not found or inactive" }, 401)
    }

    c.set("adminUser", admin)
    c.set("jwtPayload", payload)
    await next()
  } catch (err) {
    console.error('Admin auth middleware error:', err)
    return c.json({ error: "Invalid or expired admin token" }, 401)
  }
}

// Permission checking middleware
export const requirePermission = (resource: string, action: string) => {
  return async (c: any, next: any) => {
    try {
      const admin = c.get("adminUser") as AdminUser

      if (!admin) {
        return c.json({ error: "Admin authentication required" }, 401)
      }

      // Super admin has all permissions
      if (admin.role === "super_admin") {
        await next()
        return
      }

      // Check specific permission
      const resourcePermissions = admin.permissions[resource]
      const allowed = Array.isArray(resourcePermissions) && resourcePermissions.includes(action)
      
      if (!allowed) {
        return c.json(
          {
            error: "Insufficient permissions",
            required: { resource, action },
            current: admin.permissions,
          },
          403,
        )
      }

      await next()
    } catch (error) {
      console.error('Permission check error:', error)
      return c.json({ error: "Permission check failed" }, 500)
    }
  }
}

// Log admin activity
export async function logAdminActivity(
  db: any,
  adminId: string,
  action: string,
  resourceType: string,
  resourceId?: string,
  details?: any,
  ipAddress?: string,
  userAgent?: string,
): Promise<void> {
  try {
    const activityId = generateId()

    await db
      .prepare(`
      INSERT INTO admin_activity_logs (
        id, admin_user_id, action, resource, resource_id, details, ip_address, user_agent, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `)
      .bind(
        activityId,
        adminId,
        action,
        resourceType,
        resourceId || null,
        details ? JSON.stringify(details) : null,
        ipAddress || null,
        userAgent || null
      )
      .run()
  } catch (error) {
    console.error('Error logging admin activity:', error)
  }
}

// Log user activity
export async function logUserActivity(
  db: any,
  userId: string,
  action: string,
  resourceType: string,
  resourceId?: string,
  details?: any,
  ipAddress?: string,
  userAgent?: string,
): Promise<void> {
  try {
    const activityId = generateId()

    await db
      .prepare(`
      INSERT INTO user_activity_logs (
        id, user_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `)
      .bind(
        activityId,
        userId,
        action,
        resourceType,
        resourceId || null,
        details ? JSON.stringify(details) : null,
        ipAddress || null,
        userAgent || null
      )
      .run()
  } catch (error) {
    console.error('Error logging user activity:', error)
  }
}