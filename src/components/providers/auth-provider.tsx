'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { AuthUser } from '@/types/auth.types';
import type { UserPermissionKey } from '@/lib/config/roles';
import { useToast } from '@/components/providers/toast-provider';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  login: (staffId: string, password: string) => Promise<{ mfaRequired?: boolean; mfaTicket?: string } | void>;
  verifyMfa: (mfaTicket: string, code?: string, recoveryCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasPermission: (permission: UserPermissionKey) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { addToast } = useToast();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Keep a ref of current user to safely check previous auth state during async operations
  const userRef = useRef<AuthUser | null>(null);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Fetch current session details on mount or reload
  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      if (res.ok) {
        const body = await res.json();
        if (body.success && body.data?.user) {
          setUser(body.data.user);
          return;
        }
      }

      // If user was previously authenticated and token check failed (e.g. session revoked), force immediate logout
      if (userRef.current !== null) {
        setUser(null);
        addToast({
          type: 'error',
          title: 'Session Revoked',
          message: 'Your active session was terminated or revoked. Please log in again.',
        });
        router.push('/login?reason=session_revoked');
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [router, addToast]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Active Background Session Revocation Check (Polling & Tab Visibility)
  useEffect(() => {
    if (!user) return;

    // Check session validity every 10 seconds in background
    const intervalId = setInterval(() => {
      refreshUser();
    }, 10000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshUser();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [user, refreshUser]);

  const login = async (staffId: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId, password }),
      });
      const body = await res.json();

      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Invalid Staff ID or password');
      }

      if (body.data?.mfaRequired) {
        setIsLoading(false);
        return {
          mfaRequired: true,
          mfaTicket: body.data.mfaTicket,
        };
      }

      setUser(body.data.user);
    } catch (error) {
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyMfa = async (mfaTicket: string, code?: string, recoveryCode?: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mfaTicket, code, recoveryCode }),
      });
      const body = await res.json();

      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Invalid verification code');
      }

      setUser(body.data.user);
    } catch (error) {
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      // Logout errors are non-critical
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  };

  /**
   * Check if the current user has a specific permission.
   * Super admins always return true.
   */
  const hasPermission = useCallback((permission: UserPermissionKey): boolean => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    return !!user.permissions?.[permission];
  }, [user]);

  const isSuperAdmin = user?.role === 'super_admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isSuperAdmin,
        login,
        verifyMfa,
        logout,
        refreshUser,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
