'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export interface UserSession {
  id: string;
  phone: string;
  fullName: string;
  roles: string[];
  isNewUser?: boolean;
  customer?: { fullName: string; email?: string | null } | null;
  driver?: { id?: string; fullName: string; status: string; isVerifiedByAdmin: boolean } | null;
}

interface AuthContextType {
  user: UserSession | null;
  loading: boolean;
  authenticated: boolean;
  login: (userData: UserSession, token?: string) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  authenticated: false,
  login: () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Read local cache first for zero-flicker UI
    try {
      const cached = localStorage.getItem('kandy_user');
      if (cached) {
        setUser(JSON.parse(cached));
      }
    } catch (e) {}

    // 2. Fetch /api/auth/me EXACTLY ONCE globally
    let isMounted = true;
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted) return;
        if (data?.authenticated && data?.user) {
          setUser(data.user);
          localStorage.setItem('kandy_user', JSON.stringify(data.user));
        } else {
          setUser(null);
          localStorage.removeItem('kandy_user');
          localStorage.removeItem('kandy_token');
        }
      })
      .catch(() => {
        if (isMounted) {
          setUser(null);
          localStorage.removeItem('kandy_user');
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback((userData: UserSession, token?: string) => {
    setUser(userData);
    localStorage.setItem('kandy_user', JSON.stringify(userData));
    if (token) {
      localStorage.setItem('kandy_token', token);
      document.cookie = `kandy_session=${token}; path=/; max-age=2592000`;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
    localStorage.removeItem('kandy_user');
    localStorage.removeItem('kandy_token');
    document.cookie = 'kandy_session=; path=/; max-age=0';
    setUser(null);
    window.location.href = '/';
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
          localStorage.setItem('kandy_user', JSON.stringify(data.user));
        }
      }
    } catch (e) {}
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authenticated: !!user,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
