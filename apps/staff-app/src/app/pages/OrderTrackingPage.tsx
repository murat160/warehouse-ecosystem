import { useState } from 'react';
import { Search, Package, Check } from 'lucide-react';
import { useAppState, lookupSkuFull } from '../hooks/useAppState';
import { PageHeader } from '../components/PageHeader';
import { OrderStatusBadge, PriorityBadge } from '../components/Badges';
import { ORDER_STATUS_CFG, type Order, type OrderStatus } from '../data/mockData';

const ORDER_TIMELINE: OrderStatus[] = [
  'new', 'reserved', 'released', 'picking', 'picked',
  'packing', 'packed', 'sorting', 'ready_for_dispatch',
  'handed_to_courier', 'in_transit', 'delivered',
];

export function OrderTrackingPage() {
  const state = useAppState();
  const [query, setQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const filtered = state.orders.filter(o => {
    if (!query) return true;
    const q = query.toLowerCase();
    return o.id.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q);
  });

  if (selectedOrder) {
    return <OrderDetailView order={selectedOrder} onClose={() => setSelectedOrder(null)} />;
  }

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24">
      <PageHeader title="Трекинг заказов" subtitle={`${state.orders.length} заказов`} />

      <div className="px-5 -mt-3 mb-3">
        <div className="bg-white rounded-2xl p-2 flex items-center gap-2 shadow-sm">
          <Search className="w-5 h-5 text-[#9CA3AF] ml-2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по ID или имени..."
            className="flex-1 outline-none text-[14px]"
            style={{ fontWeight: 500 }}
          />
        </div>
      </div>

      <div className="px-5 space-y-2">
        {filtered.map(order => {
          const stageIdx = ORDER_TIMELINE.indexOf(order.status);
          const progress = stageIdx >= 0 ? Math.round((stageIdx / (ORDER_TIMELINE.length - 1)) * 100) : 0;
          return (
            <button
              key={order.id}
              onClick={() => setSelectedOrder(order)}
              className="w-full bg-white rounded-2xl p-4 shadow-sm active-press text-left"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="text-[14px] text-[#1F2430]" style={{ fontWeight: 800 }}>
                    {order.id}
                  </div>
                  <div className="text-[11px] text-[#6B7280]" style={{ fontWeight: 500 }}>
                    {order.customerName} · {order.destinationCity}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <PriorityBadge priority={order.priority} size="sm" />
                  <OrderStatusBadge status={order.status} size="sm" />
                </div>
              </div>
              <div className="h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
                <div
                  className="h-full"
                  style={{
                    width: `${progress}%`,
                    backgroundColor: order.status === 'delivered' ? '#00D27A' : order.status === 'failed' || order.status === 'problem' ? '#EF4444' : '#2EA7E0',
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function OrderDetailView({ order, onClose }: { order: Order; onClose: () => void }) {
  const state = useAppState();

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24">
      <PageHeader title={order.id} subtitle={`${order.customerName}`} onBack={onClose} />

      <div className="px-5 -mt-3 space-y-3">
        {/* Информация */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <PriorityBadge priority={order.priority} />
            <OrderStatusBadge status={order.status} />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3 text-[12px]">
            <Info label="Город" value={order.destinationCity} />
            <Info label="Зона" value={order.destinationZone} />
            <Info label="Тип" value={order.customerType === 'merchant' ? 'B2B' : 'Клиент'} />
            <Info label="Дедлайн" value={new Date(order.deadlineAt).toLocaleString('ru', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })} />
            <Info label="Вес ожид." value={`${order.expectedWeightKg} кг`} />
            <Info label="Упаковка" value={order.recommendedPackage} />
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-[14px] text-[#1F2430] mb-3" style={{ fontWeight: 800 }}>
            Путь заказа
          </h3>
          <div className="space-y-2">
            {ORDER_TIMELINE.map((stage, i) => {
              const cfg = ORDER_STATUS_CFG[stage];
              const currentIdx = ORDER_TIMELINE.indexOf(order.status);
              const isPast = i < currentIdx;
              const isCurrent = i === currentIdx;
              const isFuture = i > currentIdx;
              return (
                <div key={stage} className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{
                      backgroundColor: isPast ? '#00D27A' : isCurrent ? cfg.color : '#E5E7EB',
                    }}
                  >
                    {isPast ? (
                      <Check className="w-4 h-4 text-white" />
                    ) : (
                      <span className="text-white text-[11px]" style={{ fontWeight: 800 }}>{i + 1}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div
                      className="text-[13px]"
                      style={{
                        fontWeight: isCurrent ? 800 : 600,
                        color: isFuture ? '#9CA3AF' : '#1F2430',
                      }}
                    >
                      {cfg.label}
                    </div>
                  </div>
                  {isCurrent && (
                    <span className="text-[10px] text-[#2EA7E0]" style={{ fontWeight: 700 }}>
                      ⏵ ТЕКУЩИЙ
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Товары */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-[14px] text-[#1F2430] mb-3" style={{ fontWeight: 800 }}>
            Товары ({order.items.length})
          </h3>
          <div className="space-y-2">
            {order.items.map(it => {
              const full = lookupSkuFull(it.skuId, state.skus, state.products);
              const done = it.pickedQty >= it.qty;
              return (
                <div key={it.id} className="bg-[#F9FAFB] rounded-xl p-2 flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-[24px]">
                    {full?.product?.photoEmoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] text-[#1F2430] truncate" style={{ fontWeight: 700 }}>
                      {full?.product?.name}
                    </div>
                    <div className="text-[10px] text-[#6B7280] truncate font-mono" style={{ fontWeight: 500 }}>
                      {it.binId}
                    </div>
                  </div>
                  <div className="text-[12px]" style={{ fontWeight: 800, color: done ? '#00D27A' : '#1F2430' }}>
                    {it.pickedQty}/{it.qty}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Дополнительные данные */}
        {(order.actualWeightKg || order.toteId || order.packageId || order.courierId) && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-[14px] text-[#1F2430] mb-2" style={{ fontWeight: 800 }}>
              Параметры
            </h3>
            <div className="space-y-1 text-[12px]" style={{ fontWeight: 500 }}>
              {order.toteId && <div className="flex justify-between"><span className="text-[#6B7280]">Тоут:</span><span className="text-[#1F2430]" style={{ fontWeight: 700 }}>{order.toteId}</span></div>}
              {order.packageId && <div className="flex justify-between"><span className="text-[#6B7280]">Упаковка:</span><span className="text-[#1F2430]" style={{ fontWeight: 700 }}>{order.packageId}</span></div>}
              {order.actualWeightKg && <div className="flex justify-between"><span className="text-[#6B7280]">Факт. вес:</span><span className="text-[#1F2430]" style={{ fontWeight: 700 }}>{order.actualWeightKg} кг</span></div>}
              {order.courierId && <div className="flex justify-between"><span className="text-[#6B7280]">Курьер:</span><span className="text-[#1F2430]" style={{ fontWeight: 700 }}>{order.courierId}</span></div>}
              {order.routeId && <div className="flex justify-between"><span className="text-[#6B7280]">ТС:</span><span className="text-[#1F2430]" style={{ fontWeight: 700 }}>{order.routeId}</span></div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] text-[#6B7280]" style={{ fontWeight: 600 }}>{label}</div>
      <div className="text-[13px] text-[#1F2430]" style={{ fontWeight: 700 }}>{value}</div>
    </div>
  );
}
