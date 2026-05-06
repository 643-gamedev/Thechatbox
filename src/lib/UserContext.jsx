import React, { createContext, useContext, useState, useEffect } from 'react';
import db from '@/api/chatboxClient';

import { getGuestSession, clearGuestSession } from '@/lib/guestSession';
import { useAuth } from '@/lib/AuthContext';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const { user: authUser, isAuthenticated, isLoadingAuth, checkUserAuth } = useAuth();

  const [currentUser, setCurrentUser] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoadingAuth) {
      setLoading(true);
      return;
    }

    if (isAuthenticated && authUser) {
      setCurrentUser(authUser);
      setIsGuest(false);
      setLoading(false);
      return;
    }

    const guest = getGuestSession();
    if (guest) {
      setCurrentUser(guest);
      setIsGuest(true);
      setLoading(false);
      return;
    }

    setCurrentUser(null);
    setIsGuest(false);
    setLoading(false);
  }, [authUser, isAuthenticated, isLoadingAuth]);

  const refreshUser = async () => {
    if (isGuest) return;
    const user = await checkUserAuth();
    if (user) {
      setCurrentUser(user);
      setIsGuest(false);
    }
  };

  const loginAsGuest = (session) => {
    setCurrentUser(session);
    setIsGuest(true);
  };

  const logout = async () => {
    clearGuestSession();
    setCurrentUser(null);
    setIsGuest(false);

    if (isAuthenticated) {
      await db.auth.logout(`${window.location.origin}/`);
    }
  };

  const isMod = currentUser && !isGuest && (currentUser.role === 'admin' || currentUser.role === 'mod' || currentUser.role === 'owner');
  const isOwnerAccount = currentUser && !isGuest && (currentUser.role === 'admin' || currentUser.role === 'owner');

  return (
    <UserContext.Provider value={{ currentUser, isGuest, loading, loginAsGuest, logout, isMod, isOwnerAccount, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
