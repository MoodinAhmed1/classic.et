'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '@/lib/api';
import { useRouter, usePathname } from 'next/navigation';

interface User {
  id: string;
  email: string;
  name: string;
  tier: 'free' | 'pro' | 'premium';
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  updateProfile: (data: { name?: string; email?: string }) => Promise<void>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Check authentication status on mount
  useEffect(() => {
    if (!initialized) {
      checkAuth();
    }
  }, [initialized]);

  const checkAuth = async () => {
    try {
      const response = await authApi.getMe();
      setUser(response.user);
      
      // If user is authenticated and on login/register page, redirect to dashboard
      if (response.user && (pathname === '/login' || pathname === '/register')) {
        router.replace('/dashboard');
      }
    } catch (error) {
      // User not authenticated - this is expected for public pages
      setUser(null);
      
      // Only redirect to login if user is on a protected route
      const isProtectedRoute = pathname?.startsWith('/dashboard');
      if (isProtectedRoute && pathname !== '/login') {
        router.replace('/login');
      }
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.login({ email, password });
      setUser(response.user);
      // Don't redirect here - let the calling component handle it
    } catch (error) {
      throw error; // Re-throw so the login component can handle it
    }
  };

  const register = async (email: string, password: string, name?: string) => {
    try {
      const response = await authApi.register({ email, password, name });
      setUser(response.user);
      // Don't redirect here - let the calling component handle it
    } catch (error) {
      throw error; // Re-throw so the register component can handle it
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      // Even if logout fails on server, clear client state
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      router.replace('/login');
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const updateProfile = async (data: { name?: string; email?: string }) => {
    const response = await authApi.updateProfile(data);
    setUser(response.user);
  };

  const updatePassword = async (currentPassword: string, newPassword: string) => {
    await authApi.updatePassword({ currentPassword, newPassword });
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
    updateProfile,
    updatePassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
