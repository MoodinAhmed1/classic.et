"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { adminAuthApi, type AdminUser } from "@/lib/admin-auth-api"
import { useRouter, usePathname } from "next/navigation"

// AdminUser interface is now imported from admin-auth-api

interface AdminAuthContextType {
  admin: AdminUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  updateAdmin: (user: AdminUser) => void
  checkAuth: () => Promise<void>
  hasPermission: (resource: string, action: string) => boolean
  canAccessRoute: (route: string) => boolean
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined)

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // Check authentication status on mount
  useEffect(() => {
    if (!initialized) {
      checkAuth()
    }
  }, [initialized])

  const checkAuth = async () => {
    try {
      const response = await adminAuthApi.getMe()
      setAdmin(response.adminUser)

      // If admin is authenticated and on login page, do not auto-redirect
      // Let the login page handle navigation after explicit login
    } catch (error) {
      // Admin not authenticated
      setAdmin(null)

      // Only redirect to login if admin is on a protected route
      const isProtectedRoute = pathname?.startsWith("/admin") && pathname !== "/admin/login"
      if (isProtectedRoute) {
        router.replace("/admin/login")
      }
    } finally {
      setLoading(false)
      setInitialized(true)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const response = await adminAuthApi.login({ email, password })
      setAdmin(response.adminUser)
      // Don't redirect here - let the calling component handle it
    } catch (error) {
      throw error // Re-throw so the login component can handle it
    }
  }

  const logout = async () => {
    try {
      await adminAuthApi.logout()
    } catch (error) {
      // Even if logout fails on server, clear client state
      console.error("Admin logout error:", error)
    } finally {
      setAdmin(null)
      router.replace("/admin/login")
      // Also clear the auth token from cookies
      adminAuthApi.clearAuthToken()
    }
  }

  const updateAdmin = (updatedUser: AdminUser) => {
    setAdmin(updatedUser)
  }

  const hasPermission = (resource: string, action: string): boolean => {
    if (!admin) return false

    // Super admin has all permissions
    if (admin.role === "super_admin") return true

    // Check specific permissions
    const resourcePermissions = admin.permissions[resource as keyof typeof admin.permissions]
    return resourcePermissions?.includes(action) || false
  }

  const canAccessRoute = (route: string): boolean => {
    if (!admin) return false

    // Super admin can access everything
    if (admin.role === "super_admin") return true

    // Define route permissions
    const routePermissions: Record<string, { resource: string; action: string }> = {
      "/admin": { resource: "system", action: "read" },
      "/admin/users": { resource: "users", action: "read" },
      "/admin/links": { resource: "links", action: "read" },
      "/admin/analytics": { resource: "analytics", action: "read" },
      "/admin/subscriptions": { resource: "subscriptions", action: "read" },
      "/admin/payments": { resource: "subscriptions", action: "read" },
      "/admin/system": { resource: "system", action: "read" },
      "/admin/notifications": { resource: "system", action: "read" },
      "/admin/admins": { resource: "admins", action: "read" },
      "/admin/settings": { resource: "system", action: "write" },
    }

    const permission = routePermissions[route]
    if (!permission) return false

    return hasPermission(permission.resource, permission.action)
  }

  const value = {
    admin,
    loading,
    login,
    logout,
    updateAdmin,
    checkAuth,
    hasPermission,
    canAccessRoute,
  }

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext)
  if (context === undefined) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider")
  }
  return context
}
