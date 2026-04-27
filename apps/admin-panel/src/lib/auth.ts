/**
 * Minimal session hook — calls /api/auth/me on mount, exposes {user, role, loading, login, logout}.
 * Used by App.tsx to guard routes.
 */
import { useEffect, useState, useCallback } from 'react';
import { authApi } from '../api';

export interface Session {
  user: any | null;
  role: any | null;
  loading: boolean;
}

export function useSession() {
  const [s, setS] = useState<Session>({ user: null, role: null, loading: true });

  const refresh = useCallback(async () => {
    if (!localStorage.getItem('wms_jwt')) {
      setS({ user: null, role: null, loading: false }); return;
    }
    try {
      const me = await authApi.me();
      setS({ user: me.user, role: me.role, loading: false });
    } catch {
      authApi.logout();
      setS({ user: null, role: null, loading: false });
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = useCallback(async (employeeId: string, pin: string) => {
    const res = await authApi.login(employeeId, pin);
    setS({ user: res.user, role: res.role, loading: false });
    return res;
  }, []);

  const logout = useCallback(() => {
    authApi.logout();
    setS({ user: null, role: null, loading: false });
  }, []);

  return { ...s, login, logout, refresh };
}
