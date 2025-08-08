const API_BASE_URL = 'https://back-end.xayrix1.workers.dev';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const config: RequestInit = {
    credentials: 'include', // Critical: enables cookies to be sent/received
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };
 
  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new ApiError(response.status, error.error || 'Request failed');
  }

  return response.json();
}

// Auth API - Updated for cookie-based authentication with password reset
export const authApi = {
  register: async (data: { email: string; password: string; name?: string }) => {
    const result = await apiRequest<{ user: any }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    return result;
  },

  login: async (data: { email: string; password: string }) => {
    const result = await apiRequest<{ user: any }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    return result;
  },

  logout: async () => {
    await apiRequest<{ success: boolean }>('/api/auth/logout', {
      method: 'POST',
    });
  },

  forgotPassword: async (data: { email: string }) => {
    console.log('Sending forgot password request for email:', data.email);
    return apiRequest<{ success: boolean; message: string; debug?: any }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  resetPassword: async (data: { token: string; password: string }) => {
    return apiRequest<{ success: boolean; message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  getMe: async () => {
    return apiRequest<{ user: any }>('/api/auth/me');
  },

  updateProfile: async (data: { name?: string; email?: string }) => {
    return apiRequest<{ user: any; message: string }>('/api/auth/update-profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  updatePassword: async (data: { currentPassword: string; newPassword: string }) => {
    return apiRequest<{ message: string }>('/api/auth/update-password', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

// Links API - Updated to use cookie authentication
export const linksApi = {
  create: async (data: {
    originalUrl: string;
    customCode?: string;
    title?: string;
    expiresAt?: string;
  }) => {
    return apiRequest<{
      id: string;
      shortCode: string;
      originalUrl: string;
      title: string | null;
      clickCount: number;
      createdAt: string;
      isActive: boolean;
    }>('/api/links', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getAll: async (params?: { limit?: number; offset?: number }) => {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.offset) query.set('offset', params.offset.toString());
    
    return apiRequest<{
      links: Array<{
        id: string;
        shortCode: string;
        originalUrl: string;
        title: string | null;
        clickCount: number;
        createdAt: string;
        isActive: boolean;
        expiresAt: string | null;
      }>;
    }>(`/api/links?${query}`);
  },

  getById: async (id: string) => {
    return apiRequest<{
      id: string;
      shortCode: string;
      originalUrl: string;
      title: string | null;
      clickCount: number;
      createdAt: string;
      isActive: boolean;
      expiresAt: string | null;
    }>(`/api/links/${id}`);
  },

  update: async (id: string, data: {
    title?: string;
    isActive?: boolean;
    expiresAt?: string | null;
  }) => {
    return apiRequest<{ success: boolean }>(`/api/links/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string) => {
    return apiRequest<{ success: boolean }>(`/api/links/${id}`, {
      method: 'DELETE',
    });
  },

  getAnalytics: async (id: string, days = 30) => {
    return apiRequest<{
      clicksByDate: { [key: string]: number };
      clicksByCountry: { [key: string]: number };
      clicksByDevice: { [key: string]: number };
      clicksByBrowser: { [key: string]: number };
      clicksByReferrer: { [key: string]: number };
      totalClicks: number;
    }>(`/api/links/${id}/analytics?days=${days}`);
  },
};

// Domains API - Updated to use cookie authentication
export const domainsApi = {
  create: async (data: { domain: string }) => {
    return apiRequest<{
      id: string;
      domain: string;
      isVerified: boolean;
      verificationToken: string;
    }>('/api/domains', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getAll: async () => {
    return apiRequest<{
      domains: Array<{
        id: string;
        domain: string;
        isVerified: boolean;
        verificationToken: string;
        createdAt: string;
      }>;
    }>('/api/domains');
  },

  verify: async (id: string) => {
    return apiRequest<{ success: boolean; message: string }>(`/api/domains/${id}/verify`, {
      method: 'POST',
    });
  },

  delete: async (id: string) => {
    return apiRequest<{ success: boolean }>(`/api/domains/${id}`, {
      method: 'DELETE',
    });
  },
};

export { ApiError };
