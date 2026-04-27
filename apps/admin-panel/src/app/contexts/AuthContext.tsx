import { createContext, useContext, useState, ReactNode } from 'react';

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
  // ── Compliance roles ──
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

export function AuthProvider({ children }: { children: ReactNode }) {
  // Демо-пользователь для демонстрации
  const [user, setUser] = useState<User | null>({
    id: '1',
    name: 'Администратор Системы',
    email: 'admin@platform.com',
    role: 'Admin',
    scope: { type: 'ALL' },
    twoFactorEnabled: true,
    permissions: ['*'], // все права для демо
  });

  const login = async (email: string, password: string) => {
    // Демо-реализация
    setUser({
      id: '1',
      name: 'Администратор Системы',
      email,
      role: 'Admin',
      scope: { type: 'ALL' },
      twoFactorEnabled: true,
      permissions: ['*'],
    });
  };

  const logout = () => {
    setUser(null);
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