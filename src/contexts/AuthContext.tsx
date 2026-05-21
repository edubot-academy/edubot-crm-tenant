import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { User } from '@/types';
import { authApi } from '@/api/auth';
import { decodeJwt, isTokenExpired } from '@/lib/jwt';
import { setAccessTokenProvider, setAuthTenantIdProvider } from '@/api/client';
import type { AuthBootstrapResponse } from '@/lib/tenant-bootstrap';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  tenantId: string | null;
  isPlatformAdmin: boolean;
  bootstrapData: AuthBootstrapResponse | null;
  login: (email: string, password: string, tenantId?: string | null) => Promise<void>;
  logout: () => void;
  /** Get a valid access token (refreshes automatically if expired). */
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// In-memory access token (never persisted to localStorage)
let accessTokenMemory: string | null = null;

const REFRESH_TOKEN_KEY = 'refresh_token';

function userFromToken(token: string): User | null {
  const payload = decodeJwt(token);
  if (!payload) return null;
  return {
    id: payload.id,
    sub: payload.sub,
    email: payload.email,
    role: payload.role,
  };
}

function tenantIdFromToken(token: string): string | null {
  const payload = decodeJwt(token);
  if (!payload) return null;
  return payload.tenantId || null;
}

function isPlatformAdminFromToken(token: string): boolean {
  const payload = decodeJwt(token);
  if (!payload) return false;
  return payload.role === 'superadmin' && !payload.tenantId;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [bootstrapData, setBootstrapData] = useState<AuthBootstrapResponse | null>(null);
  const refreshPromise = useRef<Promise<string | null> | null>(null);

  // Load bootstrap data after successful authentication
  const loadBootstrapData = useCallback(async (tenantIdOverride?: string) => {
    try {
      const data = await authApi.bootstrap(tenantIdOverride);
      setBootstrapData(data);
    } catch (error) {
      console.error('Bootstrap жүктөө катаасы:', error);
      setBootstrapData(null);
    }
  }, []);

  // On mount, attempt to restore session via refresh token
  useEffect(() => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      setIsLoading(false);
      return;
    }

    authApi.refresh(refreshToken)
      .then(async (tokens) => {
        accessTokenMemory = tokens.accessToken;
        localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
        const restoredUser = userFromToken(tokens.accessToken);
        const restoredTenantId = tenantIdFromToken(tokens.accessToken);
        const restoredIsPlatformAdmin = isPlatformAdminFromToken(tokens.accessToken);
        setUser(restoredUser);
        setTenantId(restoredTenantId);
        setIsPlatformAdmin(restoredIsPlatformAdmin);
        await loadBootstrapData(restoredTenantId ?? (restoredIsPlatformAdmin ? 'platform' : undefined));
      })
      .catch(() => {
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        accessTokenMemory = null;
        setTenantId(null);
        setBootstrapData(null);
      })
      .finally(() => setIsLoading(false));
  }, [loadBootstrapData]);

  const login = useCallback(async (email: string, password: string, tenantId?: string | null) => {
    const tokens = await authApi.login({ email, password }, tenantId);
    accessTokenMemory = tokens.accessToken;
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    const decodedTenantId = tenantIdFromToken(tokens.accessToken);
    const loggedInUser = userFromToken(tokens.accessToken);
    const loggedInIsPlatformAdmin = isPlatformAdminFromToken(tokens.accessToken);
    setUser(loggedInUser);
    setTenantId(decodedTenantId);
    setIsPlatformAdmin(loggedInIsPlatformAdmin);
    await loadBootstrapData(decodedTenantId ?? (loggedInIsPlatformAdmin ? 'platform' : undefined));
  }, [loadBootstrapData]);

  const logout = useCallback(async () => {
    try {
      if (accessTokenMemory) {
        await authApi.logout();
      }
    } catch {
      // best-effort server-side logout
    } finally {
      accessTokenMemory = null;
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      setUser(null);
      setTenantId(null);
      setIsPlatformAdmin(false);
      setBootstrapData(null);
    }
  }, []);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    // If token exists and not expired, return it
    if (accessTokenMemory && !isTokenExpired(accessTokenMemory)) {
      return accessTokenMemory;
    }

    // Deduplicate concurrent refresh calls
    if (refreshPromise.current) {
      return refreshPromise.current;
    }

    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      accessTokenMemory = null;
      setUser(null);
      setTenantId(null);
      return null;
    }

    refreshPromise.current = authApi.refresh(refreshToken)
      .then(async (tokens) => {
        accessTokenMemory = tokens.accessToken;
        localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
        const refreshedUser = userFromToken(tokens.accessToken);
        const refreshedTenantId = tenantIdFromToken(tokens.accessToken);
        const refreshedIsPlatformAdmin = isPlatformAdminFromToken(tokens.accessToken);
        setUser(refreshedUser);
        setTenantId(refreshedTenantId);
        setIsPlatformAdmin(refreshedIsPlatformAdmin);
        await loadBootstrapData(refreshedTenantId ?? (refreshedIsPlatformAdmin ? 'platform' : undefined));
        return tokens.accessToken;
      })
      .catch(() => {
        accessTokenMemory = null;
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        setUser(null);
        setTenantId(null);
        setIsPlatformAdmin(false);
        setBootstrapData(null);
        return null;
      })
      .finally(() => {
        refreshPromise.current = null;
      });

    return refreshPromise.current;
  }, [loadBootstrapData]);

  // Register the token provider with the API client
  useEffect(() => {
    setAccessTokenProvider(getAccessToken);
    setAuthTenantIdProvider(() => tenantId ?? (isPlatformAdmin ? 'platform' : null));
  }, [getAccessToken, isPlatformAdmin, tenantId]);

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, tenantId, isPlatformAdmin, bootstrapData, login, logout, getAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
