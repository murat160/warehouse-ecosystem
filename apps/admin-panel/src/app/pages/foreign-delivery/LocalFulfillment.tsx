/**
 * LocalFulfillment — workflow for executing foreign orders inside Turkmenistan.
 * Status: new → accepted → product_prepared → packed → handed_to_courier → delivered.
 * Each card shows: who buys / who packs / who delivers, costs, photo proof, comments.
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Truck, Lock, Receipt, Camera, Check, ArrowRight, MessageSquare,
  Package, Boxes, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Locked } from '../../components/rbac/PermissionLock';
import {
  FOREIGN_ORDERS, calcSettlement, fmtMoney, LOCAL_SELLERS,
  FULFILLMENT_STATUS_LABELS,
  type ForeignOrder, type FulfillmentStatus,
} from '../../data/foreign-delivery';

const FLOW: FulfillmentStatus[] = [
  'new', 'accepted', 'product_prepared', 'packed', 'handed_to_courier', 'delivered',
];

const NEXT_LABELS: Partial<Record<FulfillmentStatus, string>> = {
  new:               'Принять',
  accepted:          'Товар куплен',
  product_prepared:  'Упаковано',
  packed:            'Передать курьеру',
  handed_to_courier: 'Подтвердить доставку',
};

function nextStatus(s: FulfillmentStatus): FulfillmentStatus | null {
  const i = FLOW.indexOf(s);
  if (i < 0 || i === FLOW.length - 1) return null;
  return FLOW[i + 1];
}

export function LocalFulfillment() {
  const { hasPermission } = useAuth();
  if (!hasPermission('foreign_delivery.local_fulfillment.view')) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <Lock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <h2 className="text-lg font-bold text-gray-900">Доступ ограничен</h2>
      </div>
    );
  }
  const canManage = hasPermission('foreign_delivery.local_fulfillment.manage');

  const [orders, setOrders] = useState<ForeignOrder[]>(FOREIGN_ORDERS);
  const [filter, setFilter] = useState<'all' | FulfillmentStatus>('all');

  const counts = useMemo(() => {
    const map: Record<FulfillmentStatus | 'all', number> = {
      all: orders.length, new: 0, accepted: 0, product_prepared: 0,
      packed: 0, handed_to_courier: 0, delivered: 0, cancelled: 0, returned: 0,
    };
    for (const o of orders) (map as any)[o.fulfillment]++;
    return map;
  }, [orders]);

  const filtered = useMemo(() => {
    if (filter === 'all') return orders;
    return orders.filter(o => o.fulfillment === filter);
  }, [orders, filter]);

  function advance(o: ForeignOrder) {
    if (!canManage) return;
    const next = nextStatus(o.fulfillment);
    if (!next) return;
    setOrders(prev => prev.map(x => x.orderId === o.orderId ? { ...x, fulfillment: next } : x));
    const i = FOREIGN_ORDERS.findIndex(x => x.orderId === o.orderId);
    if (i >= 0) FOREIGN_ORDERS[i].fulfillment = next;
    o.audit.unshift({ at: new Date().toLocaleString('ru-RU'), actor: 'Текущий пользователь', role: 'op', action: `Статус: ${FULFILLMENT_STATUS_LABELS[next].label}` });
    toast.success(`${o.orderId}: ${FULFILLMENT_STATUS_LABELS[next].label}`);
  }

  function cancel(o: ForeignOrder) {
    if (!canManage) return;
    setOrders(prev => prev.map(x => x.orderId === o.orderId ? { ...x, fulfillment: 'cancelled' } : x));
    const i = FOREIGN_ORDERS.findIndex(x => x.orderId === o.orderId);
    if (i >= 0) FOREIGN_ORDERS[i].fulfillment = 'cancelled';
    toast.success(`${o.orderId}: отменён`);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">Зарубежные расчёты</p>
          <div className="flex items-center gap-2">
            <Truck className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Локальное исполнение</h1>
            <span className="px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-[10px] font-mono">{orders.length} заказов</span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">Workflow: купить → упаковать → передать курьеру → доставить.</p>
        </div>
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 hover:bg-gray-50'}`}>
          Все ({counts.all})
        </button>
        {FLOW.concat(['cancelled', 'returned'] as FulfillmentStatus[]).map(s => {
          const cfg = FULFILLMENT_STATUS_LABELS[s];
          const c = (counts as any)[s] as number;
          return (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${filter === s ? `${cfg.cls} border-current` : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
              {cfg.label} ({c})
            </button>
          );
        })}
      </div>

      {/* Order cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(o => {
          const t = calcSettlement(o);
          const fs = FULFILLMENT_STATUS_LABELS[o.fulfillment];
          const seller = LOCAL_SELLERS.find(s => s.sellerId === o.localSellerId);
          const next = nextStatus(o.fulfillment);
          return (
            <div key={o.orderId} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <div>
                  <Link to={`/foreign-delivery/orders?order=${o.orderId}`} className="font-bold text-gray-900 hover:text-blue-700">{o.orderId}</Link>
                  <p className="text-[10px] text-gray-500">{o.createdAt}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${fs.cls}`}>{fs.label}</span>
              </div>
              <div className="p-4 space-y-2 text-sm">
                <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded">
                  <span className="text-lg">{o.items[0]?.photoEmoji ?? '📦'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{o.items[0]?.productName}</p>
                    <p className="text-[10px] text-gray-500">{o.items.reduce((s, i) => s + i.qty, 0)} шт.</p>
                  </div>
                </div>
                <div className="text-xs space-y-1">
                  <p><span className="text-gray-500">Получатель:</span> <span className="font-semibold">{o.recipientName}</span></p>
                  <p className="text-gray-500 truncate">{o.recipientAddress}</p>
                  {seller && <p><span className="text-gray-500">Продавец:</span> <span className="text-blue-700">{seller.name}</span></p>}
                </div>
                <div className="grid grid-cols-3 gap-1 text-[10px] text-center">
                  <div className="p-1.5 bg-blue-50 rounded">
                    <p className="text-gray-500">Товар</p>
                    <p className="font-semibold">{o.localProductCost}</p>
                  </div>
                  <div className="p-1.5 bg-orange-50 rounded">
                    <p className="text-gray-500">Доставка</p>
                    <p className="font-semibold">{o.localDeliveryCost}</p>
                  </div>
                  <div className="p-1.5 bg-purple-50 rounded">
                    <p className="text-gray-500">Упаковка</p>
                    <p className="font-semibold">{o.packagingCost}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-gray-50">
                  <p className="text-xs text-gray-500">Локально итого</p>
                  <p className="text-sm font-bold">{fmtMoney(t.totalLocalFulfillmentCost)}</p>
                </div>
                {next && canManage && (
                  <button onClick={() => advance(o)}
                    className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1">
                    <ArrowRight className="w-3 h-3" />{NEXT_LABELS[o.fulfillment]}
                  </button>
                )}
                {!next && o.fulfillment === 'delivered' && (
                  <Link to={`/foreign-delivery/orders?order=${o.orderId}`}
                    className="w-full py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 border border-green-200">
                    <Check className="w-3 h-3" />Доставлен · открыть карточку
                  </Link>
                )}
                {canManage && o.fulfillment !== 'delivered' && o.fulfillment !== 'cancelled' && (
                  <button onClick={() => cancel(o)}
                    className="w-full py-1 text-[10px] text-red-600 hover:bg-red-50 rounded">
                    Отменить
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="md:col-span-2 lg:col-span-3 py-16 text-center text-gray-400">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Нет заказов в этой категории</p>
          </div>
        )}
      </div>
    </div>
  );
}
