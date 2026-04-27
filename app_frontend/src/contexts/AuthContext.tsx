'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, AUTH_EXPIRED_EVENT } from '@/lib/api';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  username: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const USERNAME_KEY = 'lumina_username';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const token = api.getToken();
    setIsAuthenticated(!!token);
    if (typeof window !== 'undefined') {
      setUsername(localStorage.getItem(USERNAME_KEY));
    }
    setIsLoading(false);
  }, []);

  // Listen for 401s from the API client and drop back to the auth screen.
  // Without this, a stale token in localStorage will let users skip past
  // the login page and land on an empty home view.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onExpired = () => {
      setIsAuthenticated(false);
      setUsername(null);
      localStorage.removeItem(USERNAME_KEY);
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    await api.login(username, password);
    setIsAuthenticated(true);
    setUsername(username);
    if (typeof window !== 'undefined') localStorage.setItem(USERNAME_KEY, username);
  }, []);

  const register = useCallback(async (email: string, username: string, password: string) => {
    await api.register(email, username, password);
  }, []);

  const logout = useCallback(() => {
    api.logout();
    setIsAuthenticated(false);
    setUsername(null);
    if (typeof window !== 'undefined') localStorage.removeItem(USERNAME_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, username, login, register, logout }}>
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
