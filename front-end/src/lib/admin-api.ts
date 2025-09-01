const API_BASE_URL = "https://back-end.xayrix1.workers.dev"
class AdminApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = "AdminApiError"
  }
}

async function adminApiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const config: RequestInit = {
    credentials: "include", // Critical: enables cookies to be sent/received
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  }

  const base = API_BASE_URL
  if (!base) {
    throw new Error("API base URL not configured. Set NEXT_PUBLIC_API_BASE_URL in your frontend environment.")
  }
  const url = `${base}${endpoint}`
  const response = await fetch(url, config)

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
    throw new AdminApiError(response.status, errorData.error || "Request failed")
  }

  return response.json()
}

// Admin Auth API
export const adminApi = {
  login: async (data: { email: string; password: string }) => {
    return adminApiRequest<{ adminUser: any }>("/api/admin/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  logout: async () => {
    await adminApiRequest<{ success: boolean }>("/api/admin/auth/logout", {
      method: "POST",
    })
  },

  getMe: async () => {
    return adminApiRequest<{ adminUser: any }>("/api/admin/auth/me")
  },

  // Admin User Management
  getAdminUsers: async () => {
    return adminApiRequest<{ adminUsers: any[] }>("/api/admin/users")
  },

  createAdminUser: async (data: {
    email: string
    name: string
    password: string
    role: string
    permissions: object
  }) => {
    return adminApiRequest<{ adminUser: any }>("/api/admin/users", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  updateAdminUser: async (
    id: string,
    data: {
      name?: string
      role?: string
      permissions?: object
      isActive?: boolean
    },
  ) => {
    return adminApiRequest<{ adminUser: any }>(`/api/admin/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },

  deleteAdminUser: async (id: string) => {
    return adminApiRequest<{ success: boolean }>(`/api/admin/users/${id}`, {
      method: "DELETE",
    })
  },

  toggleAdminStatus: async (id: string) => {
    return adminApiRequest<{ success: boolean; isActive: boolean }>(`/api/admin/users/${id}/toggle-status`, {
      method: "PATCH",
    })
  },

  // User Management
  getUsers: async (params?: { limit?: number; offset?: number; search?: string; tier?: string }) => {
    const query = new URLSearchParams()
    if (params?.limit) query.set("limit", params.limit.toString())
    if (params?.offset) query.set("offset", params.offset.toString())
    if (params?.search) query.set("search", params.search)
    if (params?.tier) query.set("tier", params.tier)

    return adminApiRequest<{
      users: any[]
      total: number
      pagination: { limit: number; offset: number; hasMore: boolean }
    }>(`/api/admin/users/regular?${query}`)
  },

  createUser: async (data: {
    email: string
    name: string
    password: string
    tier: string
  }) => {
    return adminApiRequest<{ user: any }>("/api/admin/users/regular", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  getUserById: async (id: string) => {
    return adminApiRequest<{ user: any }>(`/api/admin/users/regular/${id}`)
  },

  updateUser: async (
    id: string,
    data: {
      name?: string
      email?: string
      tier?: string
      subscriptionStatus?: string
    },
  ) => {
    return adminApiRequest<{ user: any }>(`/api/admin/users/regular/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },

  deleteUser: async (id: string) => {
    return adminApiRequest<{ success: boolean }>(`/api/admin/users/regular/${id}`, {
      method: "DELETE",
    })
  },

  // Link Management
  getLinks: async (params?: { limit?: number; offset?: number; search?: string; userId?: string }) => {
    const query = new URLSearchParams()
    if (params?.limit) query.set("limit", params.limit.toString())
    if (params?.offset) query.set("offset", params.offset.toString())
    if (params?.search) query.set("search", params.search)
    if (params?.userId) query.set("userId", params.userId)

    return adminApiRequest<{
      links: any[]
      total: number
      pagination: { limit: number; offset: number; hasMore: boolean }
    }>(`/api/admin/links?${query}`)
  },

  updateLink: async (
    id: string,
    data: {
      title?: string
      isActive?: boolean
      expiresAt?: string | null
    },
  ) => {
    return adminApiRequest<{ link: any }>(`/api/admin/links/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },

  deleteLink: async (id: string) => {
    return adminApiRequest<{ success: boolean }>(`/api/admin/links/${id}`, {
      method: "DELETE",
    })
  },

  // Analytics
  getSystemAnalytics: async (days = 30) => {
    return adminApiRequest<{
      overview: {
        totalUsers: number
        totalLinks: number
        totalClicks: number
        activeUsers: number
      }
      usersByTier: { [key: string]: number }
      linksByDate: { [key: string]: number }
      clicksByDate: { [key: string]: number }
      topLinks: any[]
      recentActivity: any[]
      recentUsers: any[]
      revenue: { total: number; monthly: number; yearly: number }
      deviceStats: any[]
      browserStats: any[]
      countryStats: any[]
      pendingPayments: number
    }>(`/api/admin/analytics/system?days=${days}`)
  },
 


  // Subscription Management
  getSubscriptions: async (params?: { limit?: number; offset?: number; status?: string }) => {
    const query = new URLSearchParams()
    if (params?.limit) query.set("limit", params.limit.toString())
    if (params?.offset) query.set("offset", params.offset.toString())
    if (params?.status) query.set("status", params.status)

    return adminApiRequest<{
      subscriptions: any[]
      total: number
      revenue: { total: number; monthly: number; yearly: number }
    }>(`/api/admin/subscriptions?${query}`)
  },

  getTransactions: async (params?: { limit?: number; offset?: number; status?: string }) => {
    const query = new URLSearchParams()
    if (params?.limit) query.set("limit", params.limit.toString())
    if (params?.offset) query.set("offset", params.offset.toString())
    if (params?.status) query.set("status", params.status)

    return adminApiRequest<{
      transactions: any[]
      total: number
      pagination: { limit: number; offset: number; hasMore: boolean }
    }>(`/api/admin/transactions?${query}`)
  },

  // Subscription Plans Management
  getSubscriptionPlans: async () => {
    return adminApiRequest<{
      plans: any[]
    }>('/api/admin/subscription-plans')
  },

  updateSubscriptionPlan: async (id: string, data: any) => {
    return adminApiRequest<{
      plan: any
    }>(`/api/admin/subscription-plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  createSubscriptionPlan: async (data: any) => {
    return adminApiRequest<{
      plan: any
    }>('/api/admin/subscription-plans', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  deleteSubscriptionPlan: async (id: string) => {
    return adminApiRequest<{
      success: boolean
      message: string
    }>(`/api/admin/subscription-plans/${id}`, {
      method: 'DELETE',
    })
  },

  downloadTransactions: async (format: 'csv' | 'json' = 'csv') => {
    return adminApiRequest<Response>(`/api/admin/transactions/download?format=${format}`)
  },

  refundTransaction: async (id: string) => {
    return adminApiRequest<{ transaction: any }>(`/api/admin/transactions/${id}/refund`, {
      method: 'POST',
    })
  },

  verifyTransaction: async (txRef: string) => {
    return adminApiRequest<{ transaction: any; chapa: any }>(`/api/admin/transactions/${encodeURIComponent(txRef)}/verify`, {
      method: 'POST',
    })
  },

  // System Settings
  getSettings: async () => {
    return adminApiRequest<{ settings: any[] }>("/api/admin/settings")
  },

  updateSetting: async (key: string, value: string) => {
    return adminApiRequest<{ setting: any }>(`/api/admin/settings/${key}`, {
      method: "PUT",
      body: JSON.stringify({ value }),
    })
  },

  getSystemSettings: async () => {
    return adminApiRequest<{ settings: any }>("/api/admin/settings/system")
  },

  updateSystemSettings: async (settings: any) => {
    return adminApiRequest<{ success: boolean }>("/api/admin/settings/system", {
      method: "PUT",
      body: JSON.stringify(settings),
    })
  },

  // Activity Logs
  getActivityLogs: async (params?: { limit?: number; offset?: number; adminUserId?: string; action?: string }) => {
    const query = new URLSearchParams()
    if (params?.limit) query.set("limit", params.limit.toString())
    if (params?.offset) query.set("offset", params.offset.toString())
    if (params?.adminUserId) query.set("adminUserId", params.adminUserId)
    if (params?.action) query.set("action", params.action)

    return adminApiRequest<{
      logs: any[]
      total: number
    }>(`/api/admin/activity-logs?${query}`)
  },

  // User Activity Logs
  getUserActivityLogs: async (params?: { limit?: number; offset?: number; userId?: string; action?: string; resourceType?: string }) => {
    const query = new URLSearchParams()
    if (params?.limit) query.set("limit", params.limit.toString())
    if (params?.offset) query.set("offset", params.offset.toString())
    if (params?.userId) query.set("userId", params.userId)
    if (params?.action) query.set("action", params.action)
    if (params?.resourceType) query.set("resourceType", params.resourceType)

    return adminApiRequest<{
      logs: any[]
      total: number
      pagination: { limit: number; offset: number; hasMore: boolean }
    }>(`/api/admin/user-activity-logs?${query}`)
  },

  // Notifications
  getNotifications: async () => {
    return adminApiRequest<{ notifications: any[] }>("/api/admin/notifications")
  },

  markNotificationRead: async (id: string) => {
    return adminApiRequest<{ success: boolean }>(`/api/admin/notifications/${id}/read`, {
      method: "PUT",
    })
  },
}

export { AdminApiError }
