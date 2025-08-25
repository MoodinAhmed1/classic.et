import { verify } from "hono/jwt"
import { getCookie } from "hono/cookie"
import type { D1Database } from "workers-types" // Declare D1Database

// Admin user interface
export interface AdminUser {
  id: string
  email: string
  name: string
  role: "super_admin" | "admin" | "moderator"
  permissions: string[]
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

// Password hashing utilities (adapted from existing auth)
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hash = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const hashedPassword = await hashPassword(password)
  return hashedPassword === hash
}

// Generate secure session token
export function generateSessionToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let result = ""
  for (let i = 0; i < 64; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Generate unique ID
export function generateId(): string {
  return crypto.randomUUID()
}

// Admin authentication middleware
export const adminAuthMiddleware = async (c: any, next: any) => {
  const token = getCookie(c, "admin_auth_token")

  if (!token) {
    return c.json({ error: "Unauthorized - Admin access required" }, 401)
  }

  try {
    const payload = await verify(token, c.env.JWT_SECRET)

    // Verify admin user exists and is active
    const admin = (await c.env.DB.prepare(`
      SELECT * FROM admin_users WHERE id = ? AND is_active = true
    `)
      .bind(payload.adminId)
      .first()) as any

    if (!admin) {
      return c.json({ error: "Admin account not found or inactive" }, 401)
    }

    // Parse permissions
    admin.permissions = JSON.parse(admin.permissions)

    c.set("adminUser", admin)
    c.set("jwtPayload", payload)
    await next()
  } catch (err) {
    return c.json({ error: "Invalid or expired admin token" }, 401)
  }
}

// Permission checking middleware
export const requirePermission = (permission: string) => {
  return async (c: any, next: any) => {
    const admin = c.get("adminUser") as AdminUser

    if (!admin) {
      return c.json({ error: "Admin authentication required" }, 401)
    }

    // Super admin has all permissions
    if (admin.role === "super_admin" || admin.permissions.includes("all")) {
      await next()
      return
    }

    // Check specific permission
    if (!admin.permissions.includes(permission)) {
      return c.json(
        {
          error: "Insufficient permissions",
          required: permission,
          current: admin.permissions,
        },
        403,
      )
    }

    await next()
  }
}

// Log admin activity
export async function logAdminActivity(
  db: D1Database,
  adminId: string,
  action: string,
  resourceType: string,
  resourceId?: string,
  details?: any,
  ipAddress?: string,
  userAgent?: string,
): Promise<void> {
  const activityId = generateId()

  await db
    .prepare(`
    INSERT INTO admin_activity_log (
      id, admin_id, action, resource_type, resource_id, details, ip_address, user_agent
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
    .bind(
      activityId,
      adminId,
      action,
      resourceType,
      resourceId || null,
      details ? JSON.stringify(details) : null,
      ipAddress || null,
      userAgent || null,
    )
    .run()
}

// Create admin session
export async function createAdminSession(
  db: D1Database,
  adminId: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<string> {
  const sessionId = generateId()
  const token = generateSessionToken()
  const tokenHash = await hashPassword(token)
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000) // 8 hours

  await db
    .prepare(`
    INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
    .bind(sessionId, adminId, tokenHash, expiresAt.toISOString(), ipAddress || null, userAgent || null)
    .run()

  return token
}

// Clean expired admin sessions
export async function cleanExpiredAdminSessions(db: D1Database): Promise<void> {
  await db
    .prepare(`
    DELETE FROM admin_sessions WHERE expires_at < ?
  `)
    .bind(new Date().toISOString())
    .run()
}

// Get admin by email
export async function getAdminByEmail(db: D1Database, email: string): Promise<AdminUser | null> {
  const admin = (await db
    .prepare(`
    SELECT * FROM admin_users WHERE email = ? AND is_active = true
  `)
    .bind(email)
    .first()) as any

  if (!admin) return null

  return {
    ...admin,
    permissions: JSON.parse(admin.permissions),
  }
}

// Update admin last login
export async function updateAdminLastLogin(db: D1Database, adminId: string): Promise<void> {
  await db
    .prepare(`
    UPDATE admin_users SET last_login_at = ?, updated_at = ? WHERE id = ?
  `)
    .bind(new Date().toISOString(), new Date().toISOString(), adminId)
    .run()
}
