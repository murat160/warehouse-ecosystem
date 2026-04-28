import { toast } from 'sonner';
import { useStore, store } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { StatusBadge } from '../components/StatusBadge';

export function PackingPage() {
  const { orders } = useStore();
  const queue = orders.filter(o => o.status === 'picked' || o.status === 'packing_in_progress');

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24 md:pb-8">
      <PageHeader title="Упаковка" subtitle={`В очереди: ${queue.length}`} />

      <div className="px-5 -mt-5 space-y-2">
        {queue.length === 0 ? (
          <EmptyState emoji="📦" title="Нет заказов на упаковку" />
        ) : queue.map(o => (
          <div key={o.id} className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-[14px] text-[#1F2430]" style={{ fontWeight: 800 }}>{o.code}</div>
                <div className="text-[11px] text-[#6B7280]" style={{ fontWeight: 500 }}>
                  {o.customerName} · {o.city}
                </div>
              </div>
              <StatusBadge status={o.status} />
            </div>

            {o.status === 'picked' && (
              <button
                className="w-full h-10 rounded-xl bg-[#10B981] text-white active-press"
                style={{ fontWeight: 700 }}
                onClick={() => {
                  const r = store.advanceOrder(o.id, 'packing_in_progress');
                  if (r.ok) toast.success('Упаковка начата');
                  else toast.error(r.reason ?? 'Ошибка');
                }}
              >
                Начать упаковку
              </button>
            )}
            {o.status === 'packing_in_progress' && (
              <button
                className="w-full h-10 rounded-xl bg-[#22C55E] text-white active-press"
                style={{ fontWeight: 700 }}
                onClick={() => {
                  const r = store.advanceOrder(o.id, 'packed');
                  if (r.ok) toast.success('Заказ упакован');
                  else toast.error(r.reason ?? 'Ошибка');
                }}
              >
                Закрыть упаковку
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
