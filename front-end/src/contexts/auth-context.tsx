'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { authApi } from '@/lib/api';
import { sessionStorage, SessionData } from '@/lib/session-storage';

interface User {
  id: string;
  email: string;
  name: string;
  tier: 'free' | 'pro' | 'premium';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    checkAuth();
    
    // Set up session refresh on user activity (debounced)
    const handleActivity = () => {
      if (refreshTimeoutRef.current) return;
      
      refreshTimeoutRef.current = setTimeout(() => {
        refreshTimeoutRef.current = null;
        if (sessionStorage.expiresWithin(60 * 60 * 1000)) { // Refresh if expiring within 1 hour
          refreshSession();
        }
      }, 1000); // 1 second debounce
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, handleActivity, true));

    // Cross-tab synchronization
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'auth_session') {
        if (!event.newValue) {
          setUser(null); // Session cleared (logged out) in another tab
        } else {
          const session = sessionStorage.getSession();
          if (session) {
            setUser(session.user);
            localStorage.setItem('auth_token', session.token);
          }
        }
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      events.forEach(event => document.removeEventListener(event, handleActivity, true));
      window.removeEventListener('storage', onStorage);
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  const checkAuth = async () => {
    try {
      const session = sessionStorage.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      // Set token for API calls
      localStorage.setItem('auth_token', session.token);
      setUser(session.user);
    } catch (error) {
      sessionStorage.clearSession();
    } finally {
      setLoading(false);
    }
  };

  const refreshSession = async () => {
    try {
      const session = sessionStorage.getSession();
      if (!session) return;

      const { user: refreshedUser } = await authApi.getMe();
      sessionStorage.setSession(session.token, refreshedUser);
      setUser(refreshedUser);
    } catch (error) {
      logout();
    }
  };

  const login = async (email: string, password: string) => {
    const { user, token } = await authApi.login({ email, password });
    sessionStorage.setSession(token, user);
    localStorage.setItem('auth_token', token);
    setUser(user);
  };

  const register = async (email: string, password: string, name?: string) => {
    const { user, token } = await authApi.register({ email, password, name });
    sessionStorage.setSession(token, user);
    localStorage.setItem('auth_token', token);
    setUser(user);
  };

  const logout = () => {
    authApi.logout();
    sessionStorage.clearSession();
    setUser(null);
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    const session = sessionStorage.getSession();
    if (session) {
      sessionStorage.setSession(session.token, updatedUser);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
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
