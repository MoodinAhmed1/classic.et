import { verify } from "hono/jwt"
import { getCookie } from "hono/cookie"

// Admin user interface
export interface AdminUser {
  id: string
  email: string
  name: string
  role: "super_admin" | "admin" | "moderator" | "analyst"
  // Permissions stored as JSON object: { resource: string[] actions }
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

// Password hashing utilities (adapted from existing auth)
// --- Admin password hashing (PBKDF2 with SHA-256) with legacy SHA-256 fallback ---
const PBKDF2_ITERATIONS = 150000

// Import the regular hashPassword function for session tokens
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16)
  }
  return bytes
}

export async function hashAdminPasswordPBKDF2(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), { name: "PBKDF2" }, false, ["deriveBits"])
  const derivedBits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: PBKDF2_ITERATIONS },
    keyMaterial,
    256,
  )
  const saltHex = toHex(salt.buffer)
  const hashHex = toHex(derivedBits)
  return `pbkdf2$${PBKDF2_ITERATIONS}$${saltHex}$${hashHex}`
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
  scheme: "pbkdf2" | "sha256" | "unknown"
}> {
  if (storedHash.startsWith("pbkdf2$")) {
    const parts = storedHash.split("$")
    if (parts.length !== 4) return { valid: false, scheme: "unknown" }
    const iterations = Number(parts[1]) || PBKDF2_ITERATIONS
    const saltHex = parts[2]
    const expectedHex = parts[3]

    const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), { name: "PBKDF2" }, false, ["deriveBits"])
    const derivedBits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt: fromHex(saltHex), iterations },
      keyMaterial,
      256,
    )
    const actualHex = toHex(derivedBits)
    return { valid: actualHex === expectedHex, scheme: "pbkdf2" }
  }

  if (isLegacySha256Hash(storedHash)) {
    const actual = await sha256Hex(password)
    return { valid: actual === storedHash, scheme: "sha256" }
  }

  return { valid: false, scheme: "unknown" }
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
  // Custom UUID v4 generator for Cloudflare Workers compatibility
  const chars = '0123456789abcdef';
  let uuid = '';
  
  // Generate 8-4-4-4-12 format
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      uuid += '-';
    } else if (i === 14) {
      uuid += '4'; // Version 4
    } else if (i === 19) {
      uuid += chars.charAt((Math.random() * 4) | 8); // Variant bits
    } else {
      uuid += chars.charAt((Math.random() * 16) | 0);
    }
  }
  
  return uuid;
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

    // Parse permissions, normalize to object
    try {
      const parsed = JSON.parse(admin.permissions)
      admin.permissions = Array.isArray(parsed) ? {} : parsed
    } catch {
      admin.permissions = {}
    }

    c.set("adminUser", admin)
    c.set("jwtPayload", payload)
    await next()
  } catch (err) {
    return c.json({ error: "Invalid or expired admin token" }, 401)
  }
}

// Permission checking middleware
export const requirePermission = (resource: string, action: string) => {
  return async (c: any, next: any) => {
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
    const resourcePermissions = admin.permissions[resource as keyof typeof admin.permissions]
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
    INSERT INTO admin_activity_logs (
      id, admin_user_id, action, resource, details, ip_address, user_agent
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
    .bind(
      activityId,
      adminId,
      action,
      resourceType,
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
