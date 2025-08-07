// Secure session storage utility
// Can use either localStorage (persistent) or sessionStorage (tab-only)

export interface SessionData {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    tier: 'free' | 'pro' | 'premium';
  };
  expiresAt: number;
}

const SESSION_KEY = 'auth_session';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Use sessionStorage for better security (clears on tab close)
// Set to false to use localStorage for persistence across browser sessions
const USE_SESSION_STORAGE = false;

const getStorage = () => USE_SESSION_STORAGE ? sessionStorage : localStorage;

export const sessionStorage = {
  getSession: (): SessionData | null => {
    try {
      const storage = getStorage();
      const session = storage.getItem(SESSION_KEY);
      if (!session) return null;
      
      const sessionData: SessionData = JSON.parse(session);
      if (Date.now() > sessionData.expiresAt) {
        storage.removeItem(SESSION_KEY);
        return null;
      }
      
      return sessionData;
    } catch {
      return null;
    }
  },

  setSession: (token: string, user: SessionData['user']) => {
    const sessionData: SessionData = {
      token,
      user,
      expiresAt: Date.now() + SESSION_DURATION
    };
    const storage = getStorage();
    storage.setItem(SESSION_KEY, JSON.stringify(sessionData));
  },

  clearSession: () => {
    const storage = getStorage();
    storage.removeItem(SESSION_KEY);
    localStorage.removeItem('auth_token'); // Always clear auth_token from localStorage
  },

  getToken: (): string | null => {
    const session = sessionStorage.getSession();
    return session?.token || null;
  },

  isExpired: (): boolean => {
    const session = sessionStorage.getSession();
    return !session || Date.now() > session.expiresAt;
  },

  getTimeRemaining: (): number => {
    const session = sessionStorage.getSession();
    if (!session) return 0;
    return Math.max(0, session.expiresAt - Date.now());
  },

  // Check if session expires within given time (in milliseconds)
  expiresWithin: (timeMs: number): boolean => {
    const session = sessionStorage.getSession();
    if (!session) return true;
    return Date.now() > session.expiresAt - timeMs;
  }
}; 