const API_BASE_URL = 'https://back-end.xayrix1.workers.dev';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RegisterResponse {
  success: boolean;
  message: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    tier: 'free' | 'pro' | 'premium';
    emailVerified: boolean;
  };
  requiresVerification: boolean;
}

interface VerificationResponse {
  success: boolean;
  message: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    tier: 'free' | 'pro' | 'premium';
    emailVerified: boolean;
  };
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
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    const apiError = new ApiError(response.status, errorData.error || 'Request failed');

    // Add custom flags if present in the error response
    if (errorData.requiresVerification) {
      (apiError as any).requiresVerification = true;
      (apiError as any).email = errorData.email;
    }

    throw apiError;
  }

  return response.json();
}

// Auth API - Updated for cookie-based authentication with password reset
export const authApi = {
  register: async (data: { email: string; password: string; name?: string }) => {
    const result = await apiRequest<RegisterResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    return result;
  },
 
  verifyEmail: async (data : {email: string, code: string}) => {
    return apiRequest<VerificationResponse>('/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  resendVerification: async ({ email }: { email: string }) => {
    return apiRequest<{ success: boolean; message: string }>(
      '/api/auth/resend-verification',
      {
        method: 'POST',
        body: JSON.stringify({ email }),
      }
    );
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

// Global Analytics API
export const globalAnalyticsApi = {
  getGlobalAnalytics: async (days = 30) => {
    return apiRequest<{
      links: Array<{
        id: string;
        shortCode: string;
        title: string | null;
        clickCount: number;
        createdAt: string;
        clicksInPeriod: number;
      }>;
      clicksByDate: { [key: string]: number };
      clicksByCountry: { [key: string]: number };
      clicksByDevice: { [key: string]: number };
      clicksByBrowser: { [key: string]: number };
      totalClicks: number;
      restrictions: {
        canSeeFullAnalytics: boolean;
        canSeeAdvancedCharts: boolean;
        topCountriesHidden: number;
        browsersHidden: boolean;
        devicesHidden: boolean;
      };
      usage: {
        visitorCap: { current: number; limit: number | null; percentage: number };
        newVisitorsSinceLastVisit: number;
      };
    }>(`/api/analytics/global?days=${days}`);
  },
};

// Subscription API
export const subscriptionApi = {
  getPlans: async () => {
    return apiRequest<{
      plans: Array<{
        id: string;
        name: string;
        tier: 'free' | 'pro' | 'premium';
        priceMonthly: number;
        priceYearly: number;
        features: string[];
        limits: {
          links_per_month: number;
          analytics_retention_days: number;
          team_members: number;
        };
      }>;
    }>('/api/subscription/plans');
  },

  getCurrent: async () => {
    return apiRequest<{
      user: {
        id: string;
        email: string;
        name: string;
        tier: 'free' | 'pro' | 'premium';
        subscriptionStatus: 'active' | 'canceled' | 'past_due' | 'unpaid';
        subscriptionId?: string;
        currentPeriodStart?: string;
        currentPeriodEnd?: string;
        cancelAtPeriodEnd: boolean;
        createdAt: string;
        updatedAt: string;
      };
      plan: {
        id: string;
        name: string;
        tier: 'free' | 'pro' | 'premium';
        priceMonthly: number;
        priceYearly: number;
        features: string[];
        limits: {
          links_per_month: number;
          analytics_retention_days: number;
          team_members: number;
        };
      };
    }>('/api/subscription/current');
  },

  getUsage: async () => {
    return apiRequest<{
      current: {
        id: string;
        user_id: string;
        month: string;
        links_created: number;
        analytics_events: number;
        created_at: string;
        updated_at: string;
      };
      plan: {
        id: string;
        name: string;
        tier: 'free' | 'pro' | 'premium';
        priceMonthly: number;
        priceYearly: number;
        features: string[];
        limits: {
          links_per_month: number;
          analytics_retention_days: number;
          team_members: number;
        };
      };
      limits: {
        links: { current: number; limit: number; percentage: number };
        visitors: { current: number; limit: number | null; percentage: number };
      };
    }>('/api/subscription/usage');
  },
};

export { ApiError };
