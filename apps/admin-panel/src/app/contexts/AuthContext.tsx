import { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import { PREDEFINED_ROLES, getRoleByName, hasPerm as registryHasPerm } from '../data/rbac';

/**
 * Role union.
 * Includes the 17 predefined roles + a handful of legacy ones still
 * referenced elsewhere (Warehouse, Courier, Finance, QA, Partner, Merchant,
 * RegionalManager, PVZOperator, DocumentReviewer, ComplianceAdmin,
 * LegalReviewer). Legacy roles are kept so existing code doesn't break.
 */
export type Role =
  // Predefined (rbac.ts)
  | 'SuperAdmin' | 'Admin' | 'OperationsManager' | 'PVZManager' | 'WarehouseManager'
  | 'CourierManager' | 'SupportAgent' | 'Accountant' | 'ChiefAccountant'
  | 'Lawyer' | 'ComplianceManager' | 'SellerManager' | 'ProductManager'
  | 'ShowcaseManager' | 'MarketingManager' | 'SecurityOfficer' | 'Analyst'
  // Foreign delivery roles
  | 'PolandFinance' | 'TurkmenistanOperator' | 'SupplierAccountant'
  // Legacy
  | 'RegionalManager' | 'PVZOperator' | 'Warehouse' | 'Courier' | 'Finance'
  | 'Support' | 'QA' | 'Partner' | 'Merchant'
  | 'DocumentReviewer' | 'ComplianceAdmin' | 'LegalReviewer'
  | 'PromotionsManager';

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
  /** True when SuperAdmin is currently impersonating another role for testing. */
  isImpersonating: boolean;
  /** SuperAdmin's real role saved while impersonating. */
  realUser: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  canAccessScope: (scopeType: string, scopeId?: string) => boolean;
  /**
   * Switch to a predefined role for testing. Only available to SuperAdmin
   * (or wildcard `*` permissions). Pass `null` to revert to real role.
   */
  impersonateRole: (roleName: Role | null) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_SUPERADMIN: User = {
  id: '1',
  name: 'Супер Админ',
  email: 'superadmin@platform.com',
  role: 'SuperAdmin',
  scope: { type: 'ALL' },
  twoFactorEnabled: true,
  permissions: ['*'],
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [realUser, setRealUser]   = useState<User | null>(DEMO_SUPERADMIN);
  const [imperRole, setImperRole] = useState<Role | null>(null);

  // The "effective" user — either the real user, or a fake user mirroring
  // a predefined role (for testing). Real user identity is preserved
  // (name/email/scope), only role + permissions change.
  const user = useMemo<User | null>(() => {
    if (!realUser) return null;
    if (!imperRole) return realUser;
    const role = getRoleByName(imperRole);
    return {
      ...realUser,
      role: imperRole,
      permissions: role.permissions,
    };
  }, [realUser, imperRole]);

  const login = async (email: string, _password: string) => {
    setRealUser({ ...DEMO_SUPERADMIN, email });
    setImperRole(null);
  };

  const logout = () => {
    setRealUser(null);
    setImperRole(null);
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    return registryHasPerm(user.permissions, permission);
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

  const impersonateRole = (roleName: Role | null) => {
    if (!realUser) return;
    // Only the real SuperAdmin (or '*') can impersonate.
    const isRealSuper = realUser.role === 'SuperAdmin' || realUser.permissions.includes('*');
    if (!isRealSuper) return;
    if (roleName === null || roleName === realUser.role) {
      setImperRole(null);
    } else {
      // Make sure target exists in PREDEFINED_ROLES; if not, ignore.
      if (PREDEFINED_ROLES.some(r => r.name === roleName)) setImperRole(roleName);
    }
  };

  return (
    <AuthContext.Provider value={{
      user, realUser, isImpersonating: imperRole !== null,
      login, logout, hasPermission, canAccessScope, impersonateRole,
    }}>
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
