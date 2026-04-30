import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

export function EmptyState({
  title, subtitle, icon, action,
}: { title: string; subtitle?: string; icon?: ReactNode; action?: ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-8 text-center">
      <div className="w-12 h-12 rounded-full bg-[#F3F4F6] mx-auto flex items-center justify-center mb-3 text-[#9CA3AF]">
        {icon ?? <Inbox className="w-5 h-5" />}
      </div>
      <div className="text-[14px] text-[#1F2430]" style={{ fontWeight: 800 }}>{title}</div>
      {subtitle && <div className="text-[12px] text-[#6B7280] mt-1" style={{ fontWeight: 500 }}>{subtitle}</div>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
