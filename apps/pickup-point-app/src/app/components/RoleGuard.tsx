import type { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { useStore } from '../store/useStore';
import { can, ROLE_LABELS, type Permission } from '../domain/roles';

export function RoleGuard({ perm, children }: { perm: Permission; children: ReactNode }) {
  const { currentEmployee } = useStore();
  if (!can(currentEmployee?.role, perm)) {
    return (
      <div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center px-5">
        <div className="bg-white rounded-2xl p-8 text-center max-w-sm">
          <Lock className="w-10 h-10 text-[#9CA3AF] mx-auto mb-3" />
          <div className="text-[16px] text-[#1F2430]" style={{ fontWeight: 800 }}>Доступ ограничен</div>
          <div className="text-[12px] text-[#6B7280] mt-1" style={{ fontWeight: 500 }}>
            Этот раздел недоступен для роли {currentEmployee ? ROLE_LABELS[currentEmployee.role] : '—'}
          </div>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
