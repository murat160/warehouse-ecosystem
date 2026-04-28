import { ClipboardCheck } from 'lucide-react';
import { useStore } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';

export function CountPage() {
  const { tasks } = useStore();
  const counts = tasks.filter(t => t.type === 'COUNT');

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24 md:pb-8">
      <PageHeader
        title="Инвентаризация"
        subtitle={`Задач: ${counts.length}`}
        right={<ClipboardCheck className="w-5 h-5 text-white/70" />}
      />
      <div className="px-5 -mt-5 space-y-2">
        {counts.length === 0 ? (
          <EmptyState emoji="📊" title="Нет задач инвентаризации" />
        ) : counts.map(t => (
          <div key={t.id} className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="text-[14px] text-[#1F2430]" style={{ fontWeight: 800 }}>{t.id}</div>
            <div className="text-[11px] text-[#6B7280]" style={{ fontWeight: 500 }}>
              Ячейка {t.binId ?? '—'} · приоритет {t.priority} · {t.status}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
