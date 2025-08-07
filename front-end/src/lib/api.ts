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
  const token = localStorage.getItem('auth_token');
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
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

// Auth API
export const authApi = {
  register: async (data: { email: string; password: string; name?: string }) => {
    const result = await apiRequest<{ token: string; user: any }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    localStorage.setItem('auth_token', result.token);
    return result;
  },

  login: async (data: { email: string; password: string }) => {
    const result = await apiRequest<{ token: string; user: any }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    localStorage.setItem('auth_token', result.token);
    return result;
  },

  logout: () => {
    localStorage.removeItem('auth_token');
  },

  getMe: async () => {
    return apiRequest<{ user: any }>('/api/auth/me');
  },
};

// Links API
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
// hello commit

// Domains API
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
};

export { ApiError };
