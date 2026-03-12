import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { login as apiLogin, fetchMe, setAuthToken, requestFarmerOtp as apiRequestFarmerOtp, verifyFarmerOtp as apiVerifyFarmerOtp } from '@/lib/api';
import { clearAuth, loadAuth, saveAuth } from '@/auth-storage';

type User = { id: string; email: string; role: string; tenant_id: string | null };

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  hydrated: boolean;
  login: (email: string, password: string, role: 'FARMER' | 'FIELD_OFFICER') => Promise<void>;
  loginWithFarmerOtp: (mobile: string, otp: string) => Promise<void>;
  requestFarmerOtp: (mobile: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // On app start, rehydrate auth state from secure storage so process death
  // (common on Android) does not look like a logout.
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const { token, user: storedUser } = await loadAuth();
      if (!isMounted) return;
      if (token && storedUser) {
        setAuthToken(token);
        setUser(storedUser);
      } else {
        setAuthToken(null);
        setUser(null);
      }
      setHydrated(true);
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const loadUser = useCallback(async () => {
    try {
      const { user: u } = await fetchMe();
      setUser(u);
    } catch {
      setUser(null);
      setAuthToken(null);
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string, role: 'FARMER' | 'FIELD_OFFICER') => {
      setIsLoading(true);
      try {
        const data = await apiLogin(email, password, role);
        setAuthToken(data.token);
        setUser(data.user);
         await saveAuth(data.token, data.user);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const requestFarmerOtp = useCallback(async (mobile: string) => {
    await apiRequestFarmerOtp(mobile);
  }, []);

  const loginWithFarmerOtp = useCallback(
    async (mobile: string, otp: string) => {
      setIsLoading(true);
      try {
        const data = await apiVerifyFarmerOtp(mobile, otp);
        setAuthToken(data.token);
        setUser(data.user);
        await saveAuth(data.token, data.user);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const logout = useCallback(() => {
    setAuthToken(null);
    setUser(null);
    clearAuth().catch(() => {});
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        hydrated,
        login,
        loginWithFarmerOtp,
        requestFarmerOtp,
        logout,
        loadUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
