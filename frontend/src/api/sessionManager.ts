import type { AuthResponse } from '../types';

const storageKey = 'quiz_auth_session';

const read = () => {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const write = (val: { token: string | null; user: Record<string, unknown> | null; apiBase?: string }) => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(val));
  } catch {
    /* ignore */
  }
};

export const sessionManager = {
  clear() {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
  },
  save(payload: AuthResponse, apiBase: string) {
    write({ token: payload?.token ?? null, user: payload?.user ?? null, apiBase });
  },
  read
};
