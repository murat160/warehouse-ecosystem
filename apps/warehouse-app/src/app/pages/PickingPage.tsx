import { toast } from 'sonner';
import { useStore, store } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { StatusBadge } from '../components/StatusBadge';

export function PickingPage() {
  const { orders } = useStore();
  const queue = orders.filter(o =>
    o.status === 'received_by_warehouse' ||
    o.status === 'picking_assigned' ||
    o.status === 'picking_in_progress'
  );

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24 md:pb-8">
      <PageHeader title="Сборка" subtitle={`В очереди: ${queue.length}`} />

      <div className="px-5 -mt-5 space-y-2">
        {queue.length === 0 ? (
          <EmptyState emoji="🛒" title="Нет заказов на сборку" />
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
            <div className="text-[12px] text-[#374151] mb-3" style={{ fontWeight: 500 }}>
              {o.items.length} {pluralize(o.items.length, 'позиция', 'позиции', 'позиций')}
            </div>

            {o.status === 'received_by_warehouse' && (
              <button
                className="w-full h-10 rounded-xl bg-[#F59E0B] text-white active-press"
                style={{ fontWeight: 700 }}
                onClick={() => {
                  const r = store.advanceOrder(o.id, 'picking_assigned');
                  if (r.ok) toast.success('Сборка назначена');
                  else toast.error(r.reason ?? 'Ошибка');
                }}
              >
                Назначить сборку
              </button>
            )}
            {o.status === 'picking_assigned' && (
              <button
                className="w-full h-10 rounded-xl bg-[#F59E0B] text-white active-press"
                style={{ fontWeight: 700 }}
                onClick={() => {
                  const r = store.advanceOrder(o.id, 'picking_in_progress');
                  if (r.ok) toast.success('Сборка начата');
                  else toast.error(r.reason ?? 'Ошибка');
                }}
              >
                Начать сборку
              </button>
            )}
            {o.status === 'picking_in_progress' && (
              <button
                className="w-full h-10 rounded-xl bg-[#10B981] text-white active-press"
                style={{ fontWeight: 700 }}
                onClick={() => {
                  const r = store.advanceOrder(o.id, 'picked');
                  if (r.ok) toast.success('Заказ собран');
                  else toast.error(r.reason ?? 'Ошибка');
                }}
              >
                Завершить сборку
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function pluralize(n: number, one: string, few: string, many: string) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}
