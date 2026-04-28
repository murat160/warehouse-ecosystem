import { toast } from 'sonner';
import { useStore, store } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { StatusBadge } from '../components/StatusBadge';

export function HandoffPage() {
  const { orders } = useStore();
  const queue = orders.filter(o => o.status === 'ready_for_pickup' || o.status === 'handed_to_courier');
  const ready = queue.filter(o => o.status === 'ready_for_pickup');

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24 md:pb-8">
      <PageHeader title="Передача курьеру" subtitle={`К выдаче: ${ready.length}`} />

      <div className="px-5 -mt-5 space-y-2">
        {queue.length === 0 ? (
          <EmptyState emoji="🚚" title="Нет заказов" />
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
            {o.status === 'ready_for_pickup' && (
              <button
                className="w-full h-10 rounded-xl bg-[#7C3AED] text-white active-press"
                style={{ fontWeight: 700 }}
                onClick={() => {
                  const r = store.advanceOrder(o.id, 'handed_to_courier');
                  if (r.ok) toast.success('Передан курьеру');
                  else toast.error(r.reason ?? 'Ошибка');
                }}
              >
                Передать курьеру
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
