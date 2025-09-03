// New Admin Authentication API Client
// This replaces the old admin-api.ts for authentication purposes

export interface AdminUser {
  id: string
  email: string
  name: string
  role: "super_admin" | "admin" | "moderator" | "analyst"
  permissions: Record<string, string[]>
  isActive: boolean
  lastLoginAt?: string
  createdAt: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface LoginResponse {
  adminUser: AdminUser
}

export interface LogoutResponse {
  success: boolean
}

export interface MeResponse {
  adminUser: AdminUser
}

export class AdminAuthApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message)
    this.name = 'AdminAuthApiError'
  }
}

// Base API request function
async function adminAuthApiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://back-end.xayrix1.workers.dev'
  const url = `${baseUrl}${endpoint}`

  const defaultOptions: RequestInit = {
    credentials: 'include', // Include cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  }

  try {
    const response = await fetch(url, defaultOptions)

    if (!response.ok) {
      let errorMessage = 'Unknown error'
      let errorCode: string | undefined

      try {
        const errorData = await response.json()
        errorMessage = errorData.error || errorMessage
        errorCode = errorData.code
      } catch {
        // If we can't parse the error response, use the status text
        errorMessage = response.statusText || `HTTP ${response.status}`
      }

      throw new AdminAuthApiError(errorMessage, response.status, errorCode)
    }

    return await response.json()
  } catch (error) {
    if (error instanceof AdminAuthApiError) {
      throw error
    }
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new AdminAuthApiError('Network error - unable to connect to server', 0, 'NETWORK_ERROR')
    }
    
    throw new AdminAuthApiError(
      error instanceof Error ? error.message : 'Unknown error occurred',
      0,
      'UNKNOWN_ERROR'
    )
  }
}

// Admin Authentication API
export const adminAuthApi = {
  // Login with email and password
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    return adminAuthApiRequest<LoginResponse>('/api/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
  },

  // Logout (clears the auth cookie)
  async logout(): Promise<LogoutResponse> {
    return adminAuthApiRequest<LogoutResponse>('/api/admin/auth/logout', {
      method: 'POST',
    })
  },

  // Get current admin user info
  async getMe(): Promise<MeResponse> {
    return adminAuthApiRequest<MeResponse>('/api/admin/auth/me')
  },

  // Check if user is authenticated (returns boolean)
  async isAuthenticated(): Promise<boolean> {
    try {
      await this.getMe()
      return true
    } catch (error) {
      return false
    }
  },

  // Get auth token from cookies (for debugging)
  getAuthToken(): string | null {
    if (typeof document === 'undefined') return null
    
    const cookies = document.cookie.split(';')
    const authCookie = cookies.find(cookie => 
      cookie.trim().startsWith('admin_auth_token=')
    )
    
    if (authCookie) {
      return authCookie.split('=')[1]
    }
    
    return null
  },

  // Clear auth token (for debugging)
  clearAuthToken(): void {
    if (typeof document === 'undefined') return
    
    document.cookie = 'admin_auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
  }
}

// Utility function to handle common auth errors
export function handleAuthError(error: unknown): string {
  if (error instanceof AdminAuthApiError) {
    switch (error.status) {
      case 401:
        return 'Invalid credentials or session expired. Please login again.'
      case 403:
        return 'Access denied. You do not have permission to perform this action.'
      case 404:
        return 'Authentication service not found. Please contact support.'
      case 500:
        return 'Server error. Please try again later.'
      case 0:
        if (error.code === 'NETWORK_ERROR') {
          return 'Network error. Please check your connection and try again.'
        }
        return 'Connection error. Please try again.'
      default:
        return error.message || 'An unexpected error occurred.'
    }
  }
  
  if (error instanceof Error) {
    return error.message
  }
  
  return 'An unknown error occurred.'
}
