import { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import { PREDEFINED_ROLES, getRoleByName, hasPerm as registryHasPerm } from '../data/rbac';
import { INITIAL_USERS, effectivePermissions, type ManagedUser } from '../data/rbac-data';
import { audit as writeAudit } from '../data/audit-store';

/**
 * Role union.
 */
export type Role =
  // Predefined (rbac.ts)
  | 'SuperAdmin' | 'Admin' | 'OperationsManager' | 'PVZManager' | 'WarehouseManager'
  | 'CourierManager' | 'SupportAgent' | 'Accountant' | 'ChiefAccountant'
  | 'Lawyer' | 'ComplianceManager' | 'SellerManager' | 'ProductManager'
  | 'ShowcaseManager' | 'MarketingManager' | 'SecurityOfficer' | 'Analyst'
  // Foreign delivery roles
  | 'PolandFinance' | 'TurkmenistanOperator' | 'SupplierAccountant'
  // External / preview roles
  | 'Customer' | 'Seller' | 'PickupOperator' | 'WarehouseWorker'
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
  /** True when SuperAdmin is currently impersonating something (role or user). */
  isImpersonating: boolean;
  /** Kind of current impersonation (for UI badge). */
  impersonationKind: 'role' | 'user' | null;
  /** SuperAdmin's real user, kept while impersonating. */
  realUser: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  canAccessScope: (scopeType: string, scopeId?: string) => boolean;
  /** Impersonate a predefined role for testing. */
  impersonateRole: (roleName: Role | null) => void;
  /** Impersonate a specific employee (uses their custom-allow / custom-deny). */
  impersonateUser: (userId: string | null) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_SUPERADMIN: User = {
  id: 'su-1',
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
  const [imperUserId, setImperUserId] = useState<string | null>(null);

  // The "effective" user — either the real user, or a fake user mirroring
  // a predefined role / a specific employee. Real user identity is
  // preserved (name/email/scope) only when impersonating a role; when
  // impersonating a user, name/email switch to that user's profile.
  const user = useMemo<User | null>(() => {
    if (!realUser) return null;

    // Impersonate user (preview-as-employee) takes priority.
    if (imperUserId) {
      const u: ManagedUser | undefined = INITIAL_USERS.find(x => x.id === imperUserId);
      if (u) {
        const baseRole = getRoleByName(u.role);
        const eff = effectivePermissions(baseRole.permissions, u.extraAllow, u.extraDeny);
        return {
          id:    u.id,
          name:  u.name,
          email: u.email,
          role:  u.role as Role,
          scope: { type: (u.scopeType as Scope['type']) ?? 'SELF' },
          twoFactorEnabled: !!u.twoFactorEnabled,
          permissions: eff,
        };
      }
    }

    if (imperRole) {
      const role = getRoleByName(imperRole);
      return {
        ...realUser,
        role: imperRole,
        permissions: role.permissions,
      };
    }

    return realUser;
  }, [realUser, imperRole, imperUserId]);

  const login = async (email: string, _password: string) => {
    setRealUser({ ...DEMO_SUPERADMIN, email });
    setImperRole(null);
    setImperUserId(null);
  };

  const logout = () => {
    setRealUser(null);
    setImperRole(null);
    setImperUserId(null);
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
    const isRealSuper = realUser.role === 'SuperAdmin' || realUser.permissions.includes('*');
    if (!isRealSuper) return;
    setImperUserId(null); // role-impersonation overrides user-impersonation
    if (roleName === null || roleName === realUser.role) {
      setImperRole(null);
    } else {
      if (PREDEFINED_ROLES.some(r => r.name === roleName)) {
        setImperRole(roleName);
        writeAudit('access.preview', roleName, `Просмотр панели от роли «${roleName}»`,
                   realUser.name, realUser.role);
      }
    }
  };

  const impersonateUser = (userId: string | null) => {
    if (!realUser) return;
    const isRealSuper = realUser.role === 'SuperAdmin' || realUser.permissions.includes('*');
    if (!isRealSuper) return;
    setImperRole(null);
    if (userId === null) {
      setImperUserId(null);
    } else {
      const u = INITIAL_USERS.find(x => x.id === userId);
      if (u) {
        setImperUserId(userId);
        writeAudit('access.preview', u.email, `Просмотр от имени сотрудника «${u.name}» (${u.role})`,
                   realUser.name, realUser.role);
      }
    }
  };

  const impersonationKind: 'role' | 'user' | null =
    imperUserId ? 'user' : imperRole ? 'role' : null;

  return (
    <AuthContext.Provider value={{
      user, realUser,
      isImpersonating: impersonationKind !== null,
      impersonationKind,
      login, logout, hasPermission, canAccessScope,
      impersonateRole, impersonateUser,
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
