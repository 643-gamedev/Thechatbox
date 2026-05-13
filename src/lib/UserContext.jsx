
import React, { createContext, useContext, useState, useEffect } from 'react';

import { getGuestSession, clearGuestSession } from '@/lib/guestSession';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const isAuth = await db.auth.isAuthenticated();
        if (isAuth) {
          const user = await db.auth.me();
          setCurrentUser(user);
          setIsGuest(false);
          setLoading(false);
          return;
        }
      } catch {
        // fall through to guest/local session handling
      }
      const guest = getGuestSession();
      if (guest) {
        setCurrentUser(guest);
        setIsGuest(true);
        setLoading(false);
        return;
      }
      setCurrentUser(null);
      setLoading(false);
    }
    init();
  }, []);

  const refreshUser = async () => {
    if (isGuest) return;
    try {
      const user = await db.auth.me();
      setCurrentUser(user);
    } catch {
      setCurrentUser(null);
    }
  };

  const loginAsGuest = (session) => {
    setCurrentUser(session);
    setIsGuest(true);
  };

  const logout = () => {
    clearGuestSession();
    setCurrentUser(null);
    setIsGuest(false);
    db.auth.logout(window.location.origin);
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
