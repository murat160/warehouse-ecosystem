import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useStore, store } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { ScanInput } from '../components/ScanInput';
import { StatusBadge } from '../components/StatusBadge';
import { zoneOf } from '../domain/zones';

export function SortingPage() {
  const { orderId } = useParams();
  const { orders, sortBins } = useStore();
  const nav = useNavigate();

  if (!orderId) {
    const queue = orders.filter(o => o.status === 'picked' || o.status === 'sorting');
    return (
      <div className="min-h-screen bg-[#F5F6F8] pb-24 md:pb-8">
        <PageHeader title="Сортировка" subtitle={`В очереди: ${queue.length}`} />
        <div className="px-5 -mt-5 space-y-2">
          {queue.length === 0 ? (
            <EmptyState emoji="🧺" title="Нет заказов на сортировку" />
          ) : queue.map(o => (
            <button key={o.id} onClick={() => nav(`/sorting/${o.id}`)} className="w-full text-left bg-white rounded-2xl p-4 shadow-sm active-press">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[14px] text-[#1F2430]" style={{ fontWeight: 800 }}>{o.code}</div>
                  <div className="text-[11px] text-[#6B7280]" style={{ fontWeight: 500 }}>
                    {o.items.length} поз. · {o.sortBinId ? `корзина ${o.sortBinId}` : 'корзина не назначена'}
                  </div>
                </div>
                <StatusBadge status={o.status} />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const order = orders.find(o => o.id === orderId);
  if (!order) return <div className="p-5"><EmptyState emoji="❓" title="Заказ не найден" /></div>;
  const sb = sortBins.find(b => b.id === order.sortBinId);

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24 md:pb-8">
      <PageHeader title={`Сортировка ${order.code}`} subtitle={`${order.items.length} поз.`} right={<StatusBadge status={order.status} />} />

      <div className="px-5 -mt-5 space-y-3">
        {!sb && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-[14px] text-[#1F2430] mb-3" style={{ fontWeight: 800 }}>Выберите сортировочную корзину</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {sortBins.filter(b => !b.orderId || b.orderId === orderId).map(b => {
                const z = zoneOf(b.color);
                return (
                  <button
                    key={b.id}
                    onClick={() => {
                      const r = store.assignSortBin(orderId, b.id);
                      if (r.ok) toast.success(`Корзина ${b.id}`); else toast.error(r.reason ?? 'Ошибка');
                    }}
                    className="rounded-xl p-3 text-left active-press border-2"
                    style={{ borderColor: z.color, backgroundColor: z.bg }}
                  >
                    <div className="text-[14px] font-mono" style={{ color: z.fg, fontWeight: 800 }}>{b.id}</div>
                    <div className="text-[11px]" style={{ color: z.fg, fontWeight: 600 }}>{b.label}</div>
                    <div className="text-[10px] mt-1" style={{ color: z.fg, fontWeight: 500 }}>
                      {b.occupied}/{b.capacity}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {sb && (
          <>
            <div className="rounded-2xl p-4 border-2" style={{ borderColor: zoneOf(sb.color).color, backgroundColor: zoneOf(sb.color).bg }}>
              <div className="text-[12px]" style={{ color: zoneOf(sb.color).fg, fontWeight: 700 }}>Сортировочная корзина</div>
              <div className="text-[20px] font-mono" style={{ color: zoneOf(sb.color).fg, fontWeight: 900 }}>{sb.id}</div>
              <div className="text-[12px]" style={{ color: zoneOf(sb.color).fg, fontWeight: 600 }}>{sb.label} · {sb.occupied}/{sb.capacity}</div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <ScanInput
                label="Сканируйте товар → корзина"
                onScan={(code) => {
                  const r = store.sortPlaceItem(orderId, sb.id, code);
                  if (r.ok) toast.success('Положено в корзину'); else toast.error(r.reason ?? 'Ошибка');
                }}
              />
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="text-[12px] text-[#6B7280] mb-2" style={{ fontWeight: 700 }}>Состав заказа</h3>
              <div className="space-y-1">
                {order.items.map(it => (
                  <div key={it.id} className="flex items-center justify-between text-[12px]">
                    <span className="text-[#1F2430] font-mono" style={{ fontWeight: 700 }}>{it.sku}</span>
                    <span className="text-[#6B7280]" style={{ fontWeight: 500 }}>×{it.qty}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                const r = store.finishSorting(orderId);
                if (r.ok) { toast.success('Готово к упаковке'); nav('/packing/' + orderId); }
                else toast.error(r.reason ?? 'Ошибка');
              }}
              className="w-full h-12 rounded-xl bg-[#10B981] text-white active-press" style={{ fontWeight: 800 }}
            >
              Передать в упаковку
            </button>
          </>
        )}
      </div>
    </div>
  );
}
