import { useNavigate } from 'react-router';
import { ChevronRight, Clock } from 'lucide-react';
import { useAppState } from '../hooks/useAppState';
import { PriorityBadge, OrderStatusBadge } from '../components/Badges';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { PRIORITY_CFG } from '../data/mockData';

export function PickingListPage() {
  const state = useAppState();
  const nav = useNavigate();

  const orders = state.orders
    .filter(o => o.status === 'released' || o.status === 'picking_assigned' || o.status === 'picking')
    .sort((a, b) => PRIORITY_CFG[a.priority].rank - PRIORITY_CFG[b.priority].rank);

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24">
      <PageHeader title="Сборка заказов" subtitle={`${orders.length} активных`} />

      <div className="px-5 -mt-3 space-y-2">
        {orders.length === 0 ? (
          <EmptyState emoji="✅" title="Нет заказов" subtitle="Все заказы обработаны" />
        ) : (
          orders.map(order => {
            const totalQty = order.items.reduce((s, i) => s + i.qty, 0);
            const minutesLeft = Math.floor((new Date(order.deadlineAt).getTime() - Date.now()) / 60000);
            return (
              <button
                key={order.id}
                onClick={() => nav(`/picking/${order.id}`)}
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
                  <ChevronRight className="w-5 h-5 text-[#9CA3AF]" />
                </div>

                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <PriorityBadge priority={order.priority} size="sm" />
                  <OrderStatusBadge status={order.status} size="sm" />
                  <span className="text-[11px] text-[#1F2430]" style={{ fontWeight: 600 }}>
                    {order.items.length} позиций · {totalQty} шт.
                  </span>
                </div>

                <div className="flex items-center gap-1 text-[11px]" style={{ fontWeight: 600 }}>
                  <Clock className="w-3 h-3" style={{ color: minutesLeft < 30 ? '#EF4444' : '#6B7280' }} />
                  <span style={{ color: minutesLeft < 30 ? '#EF4444' : '#6B7280' }}>
                    {minutesLeft > 0 ? `${minutesLeft} мин до дедлайна` : `Просрочено на ${-minutesLeft} мин`}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
