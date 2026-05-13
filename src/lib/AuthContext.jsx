import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { db } from '@/api/base44Client';
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const appPublicSettings = useMemo(() => ({ auth_required: true }), []);

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const authed = await db.auth.isAuthenticated();
      if (!authed) {
        setUser(null);
        setIsAuthenticated(false);
        setAuthError(null);
        return;
      }

      const currentUser = await db.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setAuthError(null);
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
      setAuthError({
        type: 'auth_error',
        message: error.message || 'Failed to check authentication state',
      });
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  };

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      if (!isSupabaseConfigured) {
        setAuthError({
          type: 'config_error',
          message:
            'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.',
        });
      } else {
        setAuthError(null);
      }
      await checkUserAuth();
    } finally {
      setIsLoadingPublicSettings(false);
    }
  };

  useEffect(() => {
    checkAppState();

    if (!supabase) return undefined;
    const { data } = supabase.auth.onAuthStateChange(() => {
      checkUserAuth();
    });

    return () => {
      data?.subscription?.unsubscribe();
    };
  }, []);

  const logout = async (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    await db.auth.logout(shouldRedirect ? window.location.origin : undefined);
  };

  const navigateToLogin = () => {
    window.location.href = window.location.origin;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        appPublicSettings,
        authChecked,
        logout,
        navigateToLogin,
        checkUserAuth,
        checkAppState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
