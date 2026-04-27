/**
 * AuthContext — wired to the real backend (/api/auth/login + /api/auth/me).
 *
 * Public API kept identical to the ZIP version so all existing pages
 * keep working untouched:
 *   useAuth() → { user, login, logout, hasPermission, canAccessScope }
 *
 * Behaviour:
 *  - On first mount: if a JWT is in localStorage, restore session via /api/auth/me.
 *  - Until that resolves (or if no token / no backend yet) we keep a
 *    DEMO admin user so the dashboard never renders empty.
 *  - login(email, password): the "email" field is treated as employeeId
 *    by the backend (W-002, W-001, W-204 …). On success the JWT is
 *    persisted in localStorage and the real user replaces the demo one.
 *  - logout(): drops the token, returns to the demo user.
 *
 * The frontend only ever talks to /api (relative path). Vite dev proxy
 * and nginx in production forward /api → backend.
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type Role =
  | 'SuperAdmin'
  | 'Admin'
  | 'RegionalManager'
  | 'PVZOperator'
  | 'Warehouse'
  | 'Courier'
  | 'Finance'
  | 'Support'
  | 'QA'
  | 'Partner'
  | 'Merchant'
  | 'DocumentReviewer'
  | 'ComplianceAdmin'
  | 'LegalReviewer';

export type Scope = {
  type: 'ALL' | 'COUNTRY' | 'REGION' | 'CITY' | 'PVZ' | 'WAREHOUSE' | 'PARTNER' | 'SELF';
  ids?: string[];
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  scope: Scope;
  twoFactorEnabled: boolean;
  permissions: string[];
};

type AuthContextType = {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  canAccessScope: (scopeType: string, scopeId?: string) => boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'wms_jwt';

const DEMO_USER: User = {
  id: 'demo',
  name: 'Администратор Системы',
  email: 'admin@platform.com',
  role: 'Admin',
  scope: { type: 'ALL' },
  twoFactorEnabled: true,
  permissions: ['*'],
};

// Backend RBAC role names → frontend admin-panel Role enum.
function mapBackendRole(name: string): Role {
  switch (name) {
    case 'SUPER_ADMIN':            return 'SuperAdmin';
    case 'ADMIN':                  return 'Admin';
    case 'WAREHOUSE_MANAGER':      return 'Admin';
    case 'SHIFT_SUPERVISOR':       return 'RegionalManager';
    case 'INVENTORY_CONTROLLER':   return 'Warehouse';
    case 'RECEIVER':
    case 'QC_INSPECTOR':
    case 'PUTAWAY_OPERATOR':
    case 'PICKER':
    case 'PACKER':
    case 'SORTER':
    case 'SHIPPING_OPERATOR':
    case 'RETURNS_OPERATOR':
    case 'REPLENISHMENT_OPERATOR': return 'Warehouse';
    case 'SELLER':                 return 'Merchant';
    case 'COURIER_DISPATCHER':     return 'Courier';
    default:                       return 'PVZOperator';
  }
}

function userFromApi(apiUser: any, apiRole: any): User {
  return {
    id: apiUser.id,
    name: apiUser.fullName ?? apiUser.employeeId,
    email: apiUser.email ?? apiUser.employeeId,
    role: mapBackendRole(apiRole?.name ?? apiUser.roleName ?? ''),
    scope: { type: 'ALL' },
    twoFactorEnabled: false,
    permissions: apiRole?.permissions
      ? Object.entries(apiRole.permissions)
          .filter(([, v]) => v)
          .map(([k]) => k === 'all' ? '*' : k)
      : ['*'],
  };
}

async function callApi(path: string, init?: RequestInit) {
  const tok = localStorage.getItem(TOKEN_KEY);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((init?.headers as Record<string, string>) ?? {}),
  };
  if (tok) headers.Authorization = `Bearer ${tok}`;
  const res = await fetch(path, { ...init, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(data?.error ?? res.statusText);
  }
  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Start with the demo user so the UI never flashes empty. The real user
  // replaces it after /api/auth/me resolves (if a token exists).
  const [user, setUser] = useState<User | null>(DEMO_USER);

  useEffect(() => {
    const tok = localStorage.getItem(TOKEN_KEY);
    if (!tok) return;
    callApi('/api/auth/me')
      .then(({ user: u, role }) => setUser(userFromApi(u, role)))
      .catch(() => {
        // bad/expired token — drop it, fall back to demo user
        localStorage.removeItem(TOKEN_KEY);
        setUser(DEMO_USER);
      });
  }, []);

  const login = async (email: string, password: string) => {
    // The form's "email" maps to backend employeeId, "password" to pin.
    const data = await callApi('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ employeeId: email, pin: password }),
    });
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(userFromApi(data.user, data.role));
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(DEMO_USER);
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    return user.permissions.includes('*') || user.permissions.includes(permission);
  };

  const canAccessScope = (scopeType: string, scopeId?: string): boolean => {
    if (!user) return false;
    if (user.scope.type === 'ALL') return true;
    if (user.scope.type === scopeType) {
      if (!scopeId || !user.scope.ids) return true;
      return user.scope.ids.includes(scopeId);
    }
    return false;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, hasPermission, canAccessScope }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
