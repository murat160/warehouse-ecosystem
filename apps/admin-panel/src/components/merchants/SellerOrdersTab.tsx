import { useState, useMemo, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, Eye, CheckCircle, Clock, XCircle, Truck, Package,
  RotateCcw, X, MapPin, ShoppingBag, ArrowUpRight, ImageIcon,
  User, Phone, Calendar, CreditCard, AlertTriangle, Layers,
} from 'lucide-react';
import {
  getSellerOrders, SellerOrder, SellerOrderProduct,
  formatCurrency, getFulfillmentLabel,
} from '../../data/merchants-mock';

// ─── Config ───────────────────────────────────────────────────────────────────

interface Props { sellerId: string; }

const ORDER_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; dot: string; icon: any }> = {
  pending:    { label: 'Ожидает',    color: 'text-gray-600',   bg: 'bg-gray-100',   border: 'border-gray-200',   dot: 'bg-gray-400',   icon: Clock },
  preparing:  { label: 'Подготовка', color: 'text-blue-700',   bg: 'bg-blue-50',    border: 'border-blue-200',   dot: 'bg-blue-500',   icon: Package },
  in_transit: { label: 'В доставке', color: 'text-indigo-700', bg: 'bg-indigo-50',  border: 'border-indigo-200', dot: 'bg-indigo-500', icon: Truck },
  delivered:  { label: 'Доставлен',  color: 'text-green-700',  bg: 'bg-green-50',   border: 'border-green-200',  dot: 'bg-green-500',  icon: CheckCircle },
  cancelled:  { label: 'Отменён',    color: 'text-red-700',    bg: 'bg-red-50',     border: 'border-red-200',    dot: 'bg-red-500',    icon: XCircle },
  returned:   { label: 'Возврат',    color: 'text-orange-700', bg: 'bg-orange-50',  border: 'border-orange-200', dot: 'bg-orange-500', icon: RotateCcw },
};
const SLA_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  ok:      { label: 'OK',      color: 'text-green-700',  bg: 'bg-green-100',  dot: 'bg-green-500' },
  warning: { label: 'Риск',   color: 'text-orange-700', bg: 'bg-orange-100', dot: 'bg-orange-500' },
  breach:  { label: 'Нарушен',color: 'text-red-700',    bg: 'bg-red-100',    dot: 'bg-red-500' },
};
const FULFILLMENT_ICONS: Record<string, any> = {
  delivery: Truck, pickup: ShoppingBag, pvz: MapPin, self_delivery: Truck,
};

// ─── Product image stack (same pattern as OrdersList) ─────────────────────────

function ProductImageStack({ products }: { products: SellerOrderProduct[] }) {
  if (!products.length) return null;
  const main = products[0];
  const extra = products.slice(1, 4);
  const more = products.length - 4;

  return (
    <div className="flex items-center shrink-0">
      {/* Main image */}
      <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-gray-50 shrink-0 z-10">
        <img src={main.imageUrl} alt={main.name} className="w-full h-full object-cover" loading="lazy" />
      </div>
      {/* Extra smaller images */}
      {extra.map((p, i) => (
        <div
          key={i}
          className="w-6 h-6 rounded-md overflow-hidden border-2 border-white shadow-sm bg-gray-100 -ml-2 shrink-0"
          style={{ zIndex: 9 - i }}
          title={p.name}
        >
          <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
        </div>
      ))}
      {more > 0 && (
        <div className="w-6 h-6 rounded-md bg-gray-200 border-2 border-white -ml-2 flex items-center justify-center shrink-0" style={{ zIndex: 5 }}>
          <span className="text-[9px] font-bold text-gray-500">+{more}</span>
        </div>
      )}
    </div>
  );
}

// ─── Order Detail Drawer ──────────────────────────────────────────────────────

function OrderDetailDrawer({ order, onClose }: { order: SellerOrder; onClose: () => void }) {
  const sc = ORDER_STATUS_CONFIG[order.status] ?? ORDER_STATUS_CONFIG.pending;
  const sla = SLA_CONFIG[order.slaStatus];
  const StatusIcon = sc.icon;
  const FulfIcon = FULFILLMENT_ICONS[order.fulfillment] ?? Truck;

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);
  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  const products = order.products ?? [];

  const panel = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[200] flex justify-end"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-[2px]" />

        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 340, damping: 34 }}
          className="relative bg-white w-full max-w-[460px] h-full shadow-2xl flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="shrink-0 border-b border-gray-100 px-6 py-5 bg-gradient-to-br from-gray-50 to-white">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Заказ</p>
                <h3 className="font-bold text-gray-900 font-mono">{order.orderCode}</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date(order.date).toLocaleString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-700 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status + SLA badges */}
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${sc.bg} ${sc.color} ${sc.border}`}>
                <StatusIcon className="w-3.5 h-3.5" />{sc.label}
              </span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${sla.bg} ${sla.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${sla.dot}`} />
                SLA: {sla.label}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                <FulfIcon className="w-3 h-3" />{getFulfillmentLabel(order.fulfillment)}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">

            {/* Products section */}
            <div className="px-6 pt-5 pb-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                Состав заказа · {products.length} позиц.
              </p>
              {products.length === 0 ? (
                <div className="flex items-center gap-3 py-4 text-gray-400">
                  <ImageIcon className="w-5 h-5" />
                  <span className="text-sm">Позиции заказа не указаны</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {products.map((p, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                      {/* Image */}
                      <div className="w-14 h-14 rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm shrink-0">
                        <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 leading-snug line-clamp-2">{p.name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-500">×{p.qty}</span>
                          <span className="text-sm font-semibold text-gray-900">₽{p.price.toLocaleString('ru-RU')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="mx-6 border-t border-gray-100" />

            {/* Order meta */}
            <div className="px-6 py-4 space-y-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Детали</p>

              <div className="bg-gray-50 rounded-xl border border-gray-100 divide-y divide-gray-100 overflow-hidden">
                {[
                  { icon: CreditCard, label: 'Сумма заказа',  value: `₽${order.total.toLocaleString('ru-RU')}`, bold: true },
                  { icon: Layers,     label: 'Позиций',        value: `${order.items} шт` },
                  { icon: FulfIcon,   label: 'Исполнение',     value: getFulfillmentLabel(order.fulfillment) },
                  ...(order.pvzName ? [{ icon: MapPin, label: 'ПВЗ', value: order.pvzName }] : []),
                  { icon: Calendar,   label: 'Дата и время',   value: new Date(order.date).toLocaleString('ru-RU') },
                ].map((row, i) => {
                  const Icon = row.icon;
                  return (
                    <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                      <Icon className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="text-xs text-gray-500 w-28 shrink-0">{row.label}</span>
                      <span className={`text-xs ${row.bold ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>{row.value}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Cancel/return reason */}
            {order.cancelReason && (
              <div className="px-6 pb-4">
                <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-red-700 mb-0.5">
                      {order.status === 'returned' ? 'Причина возврата' : 'Причина отмены'}
                    </p>
                    <p className="text-xs text-red-600">{order.cancelReason}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-gray-100 px-6 py-4 bg-gray-50 flex items-center justify-between">
            <p className="text-[10px] text-gray-400">
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-mono">Esc</kbd> — закрыть
            </p>
            <Link
              to={`/orders/${order.id}`}
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-700 text-white text-xs rounded-xl transition-colors"
            >
              Открыть заказ <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return ReactDOM.createPortal(panel, document.body);
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────

export function SellerOrdersTab({ sellerId }: Props) {
  const orders = useMemo(() => getSellerOrders(sellerId), [sellerId]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<SellerOrder | null>(null);

  const filtered = useMemo(() => {
    return orders.filter(o => {
      const q = search.toLowerCase();
      const matchesSearch = !q || o.orderCode.toLowerCase().includes(q) ||
        (o.products ?? []).some(p => p.name.toLowerCase().includes(q));
      const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter, orders]);

  const stats = useMemo(() => ({
    total: orders.length,
    active: orders.filter(o => ['pending', 'preparing', 'in_transit'].includes(o.status)).length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
    returned: orders.filter(o => o.status === 'returned').length,
  }), [orders]);

  const cancelledOrders = filtered.filter(o => o.cancelReason);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-5 gap-2">
        {[
          { label: 'Всего',     value: stats.total,     color: 'text-gray-900',   bg: 'bg-gray-50',    dot: 'bg-gray-400' },
          { label: 'Активных',  value: stats.active,    color: 'text-blue-700',   bg: 'bg-blue-50',    dot: 'bg-blue-500' },
          { label: 'Доставлено',value: stats.delivered, color: 'text-green-700',  bg: 'bg-green-50',   dot: 'bg-green-500' },
          { label: 'Отменено',  value: stats.cancelled, color: 'text-red-700',    bg: 'bg-red-50',     dot: 'bg-red-500' },
          { label: 'Возвраты',  value: stats.returned,  color: 'text-orange-700', bg: 'bg-orange-50',  dot: 'bg-orange-500' },
        ].map((s) => (
          <div key={s.label} className={`text-center p-3 ${s.bg} rounded-xl border border-transparent`}>
            <div className="flex items-center justify-center gap-1.5 mb-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            </div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск по номеру или товару..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="all">Все статусы</option>
          {Object.entries(ORDER_STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/80">
              <th className="text-left px-4 py-3 font-semibold text-gray-500 text-[11px] uppercase tracking-wide">Заказ</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500 text-[11px] uppercase tracking-wide">Дата</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-500 text-[11px] uppercase tracking-wide">Статус</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-500 text-[11px] uppercase tracking-wide">Сумма</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-500 text-[11px] uppercase tracking-wide">Исполнение</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500 text-[11px] uppercase tracking-wide hidden lg:table-cell">ПВЗ</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-500 text-[11px] uppercase tracking-wide">SLA</th>
              <th className="w-10 px-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 bg-white">
            {filtered.map(order => {
              const sc = ORDER_STATUS_CONFIG[order.status] ?? ORDER_STATUS_CONFIG.pending;
              const sla = SLA_CONFIG[order.slaStatus];
              const StatusIcon = sc.icon;
              const FulfIcon = FULFILLMENT_ICONS[order.fulfillment] ?? Truck;
              const products = order.products ?? [];
              const isProblematic = order.status === 'cancelled' || order.status === 'returned';

              return (
                <tr
                  key={order.id}
                  className={`hover:bg-gray-50/60 transition-colors cursor-pointer ${isProblematic ? 'bg-red-50/30' : ''}`}
                  onClick={() => setSelectedOrder(order)}
                >
                  {/* Заказ — images + code */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {/* Product image stack */}
                      {products.length > 0 ? (
                        <ProductImageStack products={products} />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                          <Package className="w-4 h-4 text-gray-300" />
                        </div>
                      )}
                      {/* Order code */}
                      <div>
                        <p className="font-semibold text-gray-900 font-mono text-xs leading-tight">{order.orderCode}</p>
                        {products.length > 0 && (
                          <p className="text-[10px] text-gray-400 mt-0.5 leading-tight line-clamp-1 max-w-[120px]">
                            {products[0].name}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Дата */}
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {new Date(order.date).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </td>

                  {/* Статус */}
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${sc.bg} ${sc.color} ${sc.border}`}>
                      <StatusIcon className="w-3 h-3" />{sc.label}
                    </span>
                  </td>

                  {/* Сумма */}
                  <td className="px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">
                    ₽{order.total.toLocaleString('ru-RU')}
                  </td>

                  {/* Исполнение */}
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                      <FulfIcon className="w-3.5 h-3.5 text-gray-400" />
                      {getFulfillmentLabel(order.fulfillment)}
                    </span>
                  </td>

                  {/* ПВЗ */}
                  <td className="px-4 py-3 text-xs text-gray-500 hidden lg:table-cell">
                    {order.pvzName ? (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-gray-400 shrink-0" />{order.pvzName}
                      </span>
                    ) : '—'}
                  </td>

                  {/* SLA */}
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${sla.bg} ${sla.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sla.dot}`} />
                      {sla.label}
                    </span>
                  </td>

                  {/* Open */}
                  <td className="px-2 py-3 text-center" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Открыть детали"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-16 text-center text-gray-400">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Заказов не найдено</p>
          </div>
        )}
      </div>

      {/* Cancel reasons summary */}
      {cancelledOrders.length > 0 && (
        <div className="bg-red-50 rounded-xl p-4 border border-red-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-xs font-semibold text-red-700">Причины отмен / возвратов</p>
          </div>
          <div className="space-y-1">
            {cancelledOrders.map(o => {
              const products = o.products ?? [];
              return (
                <div key={o.id} className="flex items-start gap-2">
                  {products[0]?.imageUrl && (
                    <img src={products[0].imageUrl} alt="" className="w-5 h-5 rounded object-cover shrink-0 mt-0.5 border border-red-200" />
                  )}
                  <p className="text-xs text-red-600">
                    <span className="font-mono font-medium">{o.orderCode}</span>: {o.cancelReason}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Order detail drawer */}
      {selectedOrder && (
        <OrderDetailDrawer order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}
    </div>
  );
}
