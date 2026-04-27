/**
 * AuthContext — wired to backend (/api/auth/login + /api/auth/me).
 *
 * Public API kept compatible with the ZIP version so all 7 consumer
 * components keep working untouched:
 *   useAuth() → { user, login, logout, hasPermission, canAccessScope }
 *
 * Added (non-breaking):
 *   useAuth().status → 'loading' | 'authenticated' | 'unauthenticated'
 *   used by RequireAuth in routes.ts and by LoginPage to redirect.
 *
 * Behaviour:
 *  - On first mount: try /api/auth/me with the JWT in localStorage.
 *  - login(email, password): "email" maps to backend employeeId,
 *    "password" to PIN. JWT persisted in localStorage on success.
 *  - logout(): drops the token, status flips to 'unauthenticated'.
 *  - Errors never leak stack traces. Token never logged.
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '../lib/api';

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

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type AuthContextType = {
  user: User | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  canAccessScope: (scopeType: string, scopeId?: string) => boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    if (!api.hasToken()) {
      setStatus('unauthenticated');
      return;
    }
    api.get<{ user: any; role: any }>('/api/auth/me')
      .then(({ user: u, role }) => {
        setUser(userFromApi(u, role));
        setStatus('authenticated');
      })
      .catch(() => {
        api.clearToken();
        setStatus('unauthenticated');
      });
  }, []);

  const login = async (email: string, password: string) => {
    const data = await api.post<{ token: string; user: any; role: any }>(
      '/api/auth/login', { employeeId: email, pin: password }
    );
    api.setToken(data.token);
    setUser(userFromApi(data.user, data.role));
    setStatus('authenticated');
  };

  const logout = () => {
    api.clearToken();
    setUser(null);
    setStatus('unauthenticated');
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
    <AuthContext.Provider value={{ user, status, login, logout, hasPermission, canAccessScope }}>
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
