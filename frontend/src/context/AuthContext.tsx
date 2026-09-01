import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import * as api from '../api/endpoints';
import { getAccessToken, hasSession, onSessionCleared, setTokens } from '../api/client';
import type { UserProfile } from '../api/types';

interface AuthContextValue {
  user: UserProfile | null;
  initializing: boolean;
  login: (email: string, password: string, recaptchaToken: string) => Promise<void>;
  register: (name: string, email: string, password: string, recaptchaToken: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = onSessionCleared(() => setUser(null));
    return unsubscribe;
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function restore() {
      if (!hasSession() || !getAccessToken()) {
        setInitializing(false);
        return;
      }
      try {
        const profile = await api.getMe();
        if (!cancelled) setUser(profile);
      } catch {
        // session invalid or expired past refresh — stay logged out
      } finally {
        if (!cancelled) setInitializing(false);
      }
    }
    void restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string, recaptchaToken: string) => {
    const session = await api.login({ email, password, recaptchaToken });
    setTokens({ accessToken: session.accessToken, refreshToken: session.refreshToken });
    setUser(session.user);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, recaptchaToken: string) => {
    const session = await api.register({ name, email, password, recaptchaToken });
    setTokens({ accessToken: session.accessToken, refreshToken: session.refreshToken });
    setUser(session.user);
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('demotech.refreshToken');
    if (refreshToken) {
      try {
        // Must run before clearing tokens — it needs the still-valid access
        // token to authenticate the call that revokes the refresh token.
        await api.logout(refreshToken);
      } catch {
        // best-effort — the client-side session is cleared either way below
      }
    }
    setTokens(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, initializing, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- colocating the hook with its provider is intentional
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
