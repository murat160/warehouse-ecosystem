import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import type { ProblemType, ProblemStatus } from '../domain/types';

const TYPE_LABELS: Record<ProblemType, string> = {
  damage: 'Повреждение', missing: 'Недостача', wrong_sku: 'Не тот товар',
  scanner_fail: 'Сбой сканера', other: 'Другое',
};

const STATUS_LABELS: Record<ProblemStatus, string> = {
  open: 'Открыт', investigating: 'Изучается', resolved: 'Решён',
};

export function ProblemsPage() {
  const { problems, workers } = useStore();
  const active = problems.filter(p => p.status !== 'resolved').length;

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24 md:pb-8">
      <PageHeader title="Проблемы" subtitle={`Активных: ${active}`} />

      <div className="px-5 -mt-5">
        <button
          onClick={() => toast('Форма будет подключена к /api/problems')}
          className="w-full h-11 rounded-2xl bg-[#EF4444] text-white flex items-center justify-center gap-2 active-press mb-3"
          style={{ fontWeight: 700 }}
        >
          <Plus className="w-4 h-4" /> Создать проблему
        </button>

        {problems.length === 0 ? (
          <EmptyState emoji="🚧" title="Проблем нет" />
        ) : (
          <div className="space-y-2">
            {problems.map(p => {
              const reporter = workers.find(w => w.id === p.reportedBy);
              return (
                <div key={p.id} className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[14px] text-[#1F2430]" style={{ fontWeight: 800 }}>
                      {TYPE_LABELS[p.type]}
                    </span>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E]"
                      style={{ fontWeight: 700 }}
                    >
                      {STATUS_LABELS[p.status]}
                    </span>
                  </div>
                  <div className="text-[12px] text-[#374151] mb-1" style={{ fontWeight: 500 }}>
                    {p.description}
                  </div>
                  <div className="text-[10px] text-[#9CA3AF]" style={{ fontWeight: 500 }}>
                    {reporter?.name ?? p.reportedBy} · {new Date(p.createdAt).toLocaleString('ru')}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
