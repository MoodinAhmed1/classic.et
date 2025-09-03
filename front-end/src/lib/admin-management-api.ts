const API_BASE_URL = "https://back-end.xayrix1.workers.dev"

class AdminManagementApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = "AdminManagementApiError"
  }
}

async function adminManagementApiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const config: RequestInit = {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  }

  const url = `${API_BASE_URL}${endpoint}`
  const response = await fetch(url, config)

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
    throw new AdminManagementApiError(response.status, errorData.error || "Request failed")
  }

  return response.json()
}

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
  created_by?: string
}

export interface CreateAdminData {
  email: string
  name: string
  password: string
  role: "admin" | "moderator" | "analyst"
  permissions?: Record<string, string[]>
}

export interface UpdateAdminData {
  name?: string
  role?: "admin" | "moderator" | "analyst"
  permissions?: Record<string, string[]>
  isActive?: boolean
}

// Default role permissions
export const ROLE_PERMISSIONS = {
  super_admin: {
    users: ["read", "write", "delete"],
    links: ["read", "write", "delete"],
    subscriptions: ["read", "write", "delete"],
    analytics: ["read", "write"],
    system: ["read", "write", "delete"],
    admins: ["read", "write", "delete"],
  },
  admin: {
    users: ["read", "write"],
    links: ["read", "write"],
    subscriptions: ["read", "write"],
    analytics: ["read", "write"],
    system: ["read"],
    admins: ["read"],
  },
  moderator: {
    users: ["read"],
    links: ["read", "write"],
    subscriptions: ["read"],
    analytics: ["read"],
    system: ["read"],
    admins: [],
  },
  analyst: {
    users: ["read"],
    links: ["read"],
    subscriptions: ["read"],
    analytics: ["read", "write"],
    system: ["read"],
    admins: [],
  },
}

export const adminManagementApi = {
  // Get all admin users
  getAdminUsers: async (): Promise<{ adminUsers: AdminUser[] }> => {
    return adminManagementApiRequest<{ adminUsers: AdminUser[] }>("/api/admin/users")
  },

  // Create new admin user
  createAdminUser: async (data: CreateAdminData): Promise<{ adminUser: AdminUser }> => {
    return adminManagementApiRequest<{ adminUser: AdminUser }>("/api/admin/users", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  // Update admin user
  updateAdminUser: async (id: string, data: UpdateAdminData): Promise<{ adminUser: AdminUser }> => {
    return adminManagementApiRequest<{ adminUser: AdminUser }>(`/api/admin/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },

  // Delete admin user
  deleteAdminUser: async (id: string): Promise<{ success: boolean }> => {
    return adminManagementApiRequest<{ success: boolean }>(`/api/admin/users/${id}`, {
      method: "DELETE",
    })
  },

  // Toggle admin status
  toggleAdminStatus: async (id: string): Promise<{ success: boolean; isActive: boolean }> => {
    return adminManagementApiRequest<{ success: boolean; isActive: boolean }>(`/api/admin/users/${id}/toggle-status`, {
      method: "PATCH",
    })
  },

  // Change admin password
  changeAdminPassword: async (id: string, newPassword: string): Promise<{ success: boolean }> => {
    return adminManagementApiRequest<{ success: boolean }>(`/api/admin/users/${id}/change-password`, {
      method: "PATCH",
      body: JSON.stringify({ password: newPassword }),
    })
  },

  // Get admin user by ID
  getAdminUserById: async (id: string): Promise<{ adminUser: AdminUser }> => {
    return adminManagementApiRequest<{ adminUser: AdminUser }>(`/api/admin/users/${id}`)
  },

  // Get admin activity logs
  getAdminActivityLogs: async (params?: { 
    limit?: number; 
    offset?: number; 
    adminUserId?: string; 
    action?: string 
  }): Promise<{ logs: any[]; total: number }> => {
    const query = new URLSearchParams()
    if (params?.limit) query.set("limit", params.limit.toString())
    if (params?.offset) query.set("offset", params.offset.toString())
    if (params?.adminUserId) query.set("adminUserId", params.adminUserId)
    if (params?.action) query.set("action", params.action)

    return adminManagementApiRequest<{ logs: any[]; total: number }>(`/api/admin/activity-logs?${query}`)
  },
}

export { AdminManagementApiError }
