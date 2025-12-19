import { createContext, useContext, useMemo, useState, useCallback } from 'react';
import type { AuthResponse } from '../types';

const storageKey = 'quiz_auth_session';
const defaultApiBase = (typeof window !== 'undefined' && window.APP_API_BASE) || 'http://localhost:4000/api';

type SessionState = {
  token: string | null;
  user: Record<string, unknown> | null;
  apiBase: string;
};

type SessionContextValue = {
  session: SessionState;
  setSession: (payload: AuthResponse | null) => void;
  clearSession: () => void;
};

const readSavedSession = (): Partial<SessionState> | null => {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const saved = readSavedSession();
  const [session, setSessionState] = useState<SessionState>({
    token: saved?.token ?? null,
    user: saved?.user ?? null,
    apiBase: saved?.apiBase ?? defaultApiBase
  });

  const persist = useCallback((next: SessionState) => {
    setSessionState(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify({ token: next.token, user: next.user, apiBase: next.apiBase }));
    } catch {
      /* ignore persistence issues */
    }
  }, []);

  const setSession = useCallback((payload: AuthResponse | null) => {
    persist({
      ...session,
      token: payload?.token ?? null,
      user: payload?.user ?? null
    });
  }, [persist, session]);

  const clearSession = useCallback(() => {
    persist({ ...session, token: null, user: null });
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
  }, [persist, session]);

  const value = useMemo(
    () => ({
      session,
      setSession,
      clearSession
    }),
    [session, setSession, clearSession]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return ctx;
}
