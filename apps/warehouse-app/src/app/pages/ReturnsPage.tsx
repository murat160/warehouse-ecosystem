import { useStore } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import type { ReturnRow } from '../domain/types';

const STATUS_LABELS: Record<ReturnRow['status'], string> = {
  expected: 'Ожидается', received: 'Получен', inspecting: 'Проверка', closed: 'Закрыт',
};

const STATUS_COLORS: Record<ReturnRow['status'], { bg: string; fg: string }> = {
  expected:   { bg: '#F3F4F6', fg: '#374151' },
  received:   { bg: '#FEE2E2', fg: '#991B1B' },
  inspecting: { bg: '#FEF3C7', fg: '#92400E' },
  closed:     { bg: '#D1FAE5', fg: '#065F46' },
};

export function ReturnsPage() {
  const { returns } = useStore();
  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24 md:pb-8">
      <PageHeader title="Возвраты" subtitle={`Активных: ${returns.length}`} />
      <div className="px-5 -mt-5 space-y-2">
        {returns.length === 0 ? (
          <EmptyState emoji="↩️" title="Возвратов нет" />
        ) : returns.map(r => {
          const c = STATUS_COLORS[r.status];
          return (
            <div key={r.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[14px] text-[#1F2430]" style={{ fontWeight: 800 }}>{r.id}</span>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: c.bg, color: c.fg, fontWeight: 700 }}
                >
                  {STATUS_LABELS[r.status]}
                </span>
              </div>
              <div className="text-[12px] text-[#6B7280]" style={{ fontWeight: 500 }}>
                Заказ {r.orderId} · {r.reason}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
