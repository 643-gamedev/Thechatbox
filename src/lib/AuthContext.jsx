import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import db from '@/api/chatboxClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState({ auth_required: false });

  const checkUserAuth = useCallback(async () => {
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      const currentUser = await db.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setAuthChecked(true);
      return currentUser;
    } catch (error) {
      if (error?.status === 401) {
        setUser(null);
        setIsAuthenticated(false);
        setAuthChecked(true);
        return null;
      }

      setUser(null);
      setIsAuthenticated(false);
      setAuthChecked(true);
      setAuthError({
        type: error?.status === 403 ? 'access_denied' : 'unknown',
        message: error.message || 'Authentication failed',
      });
      return null;
    } finally {
      setIsLoadingAuth(false);
    }
  }, []);

  const checkAppState = useCallback(async () => {
    setIsLoadingPublicSettings(true);
    setAuthError(null);

    try {
      await db.bootstrapDefaultsIfNeeded();
      await checkUserAuth();
    } catch (error) {
      setAuthError({
        type: 'setup_failed',
        message: error.message || 'Failed to initialize application',
      });
    } finally {
      setIsLoadingPublicSettings(false);
    }
  }, [checkUserAuth]);

  useEffect(() => {
    checkAppState();
  }, [checkAppState]);

  useEffect(() => {
    let unsubscribe;
    try {
      unsubscribe = db.auth.onAuthStateChange(async () => {
        await checkUserAuth();
      });
    } catch {
      unsubscribe = null;
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [checkUserAuth]);

  const logout = async (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);

    const redirectUrl = shouldRedirect ? `${window.location.origin}/` : undefined;
    await db.auth.logout(redirectUrl);
  };

  const navigateToLogin = () => {
    db.auth.redirectToLogin(window.location.href);
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
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
