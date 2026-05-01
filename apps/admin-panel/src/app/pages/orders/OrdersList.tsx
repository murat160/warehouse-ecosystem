/**
 * OrdersList — translated to RU/EN/TR/TK via the i18n provider.
 *
 * Mock data (customer/merchant/courier names) is rendered through
 * `useLocalize()`, which transliterates Cyrillic to the active alphabet
 * for non-RU locales. This keeps the demo readable in EN/TR/TK without
 * blowing up the existing mock store with localized objects.
 *
 * KPI cards are real toggle filters: clicking one applies the filter,
 * clicking it again clears it. Only one KPI filter can be active at a
 * time — overdue / active-only / by-status are mutually exclusive.
 */
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { exportToCsv } from '../../utils/downloads';
import {
  Search, Download, Eye, AlertCircle, Clock, Package, Truck, MapPin,
  ShoppingBag, X,
} from 'lucide-react';
import {
  ORDERS,
  formatCurrency,
  type OrderStatus,
  type DeliveryType,
} from '../../data/orders-mock';
import { useI18n, type DictKey } from '../../i18n';
import { useLocalize } from '../../i18n/transliterate';

const DELIVERY_KEYS: Record<DeliveryType, DictKey> = {
  delivery: 'orders.delivery.delivery',
  pickup:   'orders.delivery.pickup',
  pvz:      'orders.delivery.pvz',
};
const DELIVERY_ICONS: Record<DeliveryType, any> = {
  delivery: Truck,
  pickup:   ShoppingBag,
  pvz:      MapPin,
};

const STATUS_KEYS: Record<OrderStatus, DictKey> = {
  new:              'orders.status.new',
  accepted:         'orders.status.accepted',
  preparing:        'orders.status.preparing',
  ready:            'orders.status.ready',
  pickup_ready:     'orders.status.pickup_ready',
  courier_assigned: 'orders.status.courier_assigned',
  in_transit:       'orders.status.in_transit',
  at_pvz:           'orders.status.at_pvz',
  delivered:        'orders.status.delivered',
  cancelled:        'orders.status.cancelled',
  returned:         'orders.status.returned',
};
const STATUS_COLORS: Record<OrderStatus, string> = {
  new: 'bg-blue-100 text-blue-700',
  accepted: 'bg-blue-100 text-blue-700',
  preparing: 'bg-yellow-100 text-yellow-700',
  ready: 'bg-green-100 text-green-700',
  pickup_ready: 'bg-green-100 text-green-700',
  courier_assigned: 'bg-purple-100 text-purple-700',
  in_transit: 'bg-purple-100 text-purple-700',
  at_pvz: 'bg-green-100 text-green-700',
  delivered: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
  returned: 'bg-orange-100 text-orange-700',
};

/** What kind of KPI filter is currently in effect, if any. */
type KpiFilter =
  | { kind: 'none' }
  | { kind: 'active' }
  | { kind: 'overdue' }
  | { kind: 'inDelivery' }    // courier_assigned + in_transit
  | { kind: 'deliveredToday' };

export function OrdersList() {
  const { t } = useI18n();
  const localize = useLocalize();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [kpi, setKpi] = useState<KpiFilter>({ kind: 'none' });

  /** Apply / toggle a KPI filter. Picking the same one twice clears it. */
  function selectKpi(target: KpiFilter['kind']) {
    setKpi(prev => prev.kind === target ? { kind: 'none' } : { kind: target } as KpiFilter);
    // Picking a KPI clears the explicit status dropdown so the chip text
    // matches what the user actually sees in the table.
    setStatusFilter('all');
  }

  const filteredOrders = useMemo(() => {
    return ORDERS.filter(order => {
      const q = searchQuery.toLowerCase();
      // Customer name search must hit both Cyrillic source and the
      // transliterated form, so EN-mode users typing "Ivanov" still find
      // "Иванов".
      const localizedName = localize(order.customerName).toLowerCase();
      const matchesSearch = !q ||
        order.orderNumber.toLowerCase().includes(q) ||
        order.customerName.toLowerCase().includes(q) ||
        localizedName.includes(q) ||
        order.customerPhone.includes(searchQuery) ||
        localize(order.merchant).toLowerCase().includes(q) ||
        order.merchant.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

      let matchesKpi = true;
      if (kpi.kind === 'active')          matchesKpi = !['delivered','cancelled','returned'].includes(order.status);
      else if (kpi.kind === 'overdue')    matchesKpi = order.isOverdue;
      else if (kpi.kind === 'inDelivery') matchesKpi = ['courier_assigned','in_transit'].includes(order.status);
      else if (kpi.kind === 'deliveredToday') matchesKpi = order.status === 'delivered';

      return matchesSearch && matchesStatus && matchesKpi;
    });
  }, [searchQuery, statusFilter, kpi, localize]);

  const stats = useMemo(() => ({
    active:         ORDERS.filter(o => !['delivered','cancelled','returned'].includes(o.status)).length,
    overdue:        ORDERS.filter(o => o.isOverdue).length,
    inDelivery:     ORDERS.filter(o => ['courier_assigned','in_transit'].includes(o.status)).length,
    deliveredToday: ORDERS.filter(o => o.status === 'delivered').length,
  }), []);

  /**
   * KPI card config. `kpiKey` decides the toggle. The card is fully
   * keyboard-accessible (it's a real <button>), and its visual "active"
   * state mirrors `kpi.kind`.
   */
  const KPI_CARDS: Array<{
    kpiKey: KpiFilter['kind'];
    labelKey: DictKey;
    value: number;
    color: string; bg: string; ring: string;
  }> = [
    { kpiKey: 'active',         labelKey: 'orders.kpi.active',         value: stats.active,         color: 'text-blue-600',   bg: 'bg-blue-50',    ring: 'ring-blue-300'   },
    { kpiKey: 'overdue',        labelKey: 'orders.kpi.overdue',        value: stats.overdue,        color: 'text-red-600',    bg: 'bg-red-50',     ring: 'ring-red-300'    },
    { kpiKey: 'inDelivery',     labelKey: 'orders.kpi.inDelivery',     value: stats.inDelivery,     color: 'text-purple-600', bg: 'bg-purple-50',  ring: 'ring-purple-300' },
    { kpiKey: 'deliveredToday', labelKey: 'orders.kpi.deliveredToday', value: stats.deliveredToday, color: 'text-green-600',  bg: 'bg-green-50',   ring: 'ring-green-300'  },
  ];

  const activeKpiLabel = kpi.kind === 'none' ? null : t(KPI_CARDS.find(c => c.kpiKey === kpi.kind)!.labelKey);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('orders.title')}</h1>
          <p className="text-gray-500">{t('orders.subtitle')}</p>
        </div>
      </div>

      {/* Stats / KPI cards — real toggle filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {KPI_CARDS.map(card => {
          const isActive = kpi.kind === card.kpiKey;
          const label = t(card.labelKey);
          return (
            <button
              key={card.kpiKey}
              onClick={() => selectKpi(card.kpiKey)}
              aria-pressed={isActive}
              aria-label={label}
              className={`${card.bg} p-4 rounded-lg border text-left transition-all cursor-pointer hover:shadow-md focus:outline-none focus-visible:ring-2 ${card.ring} active:scale-[0.98] ${isActive ? `ring-2 ring-offset-1 ${card.ring} border-current` : 'border-gray-200 hover:border-gray-300'}`}
            >
              <p className="text-sm text-gray-500 mb-1">{label}</p>
              <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            </button>
          );
        })}
      </div>

      {/* Active filter chip */}
      {activeKpiLabel && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-sm">
            <span className="font-semibold">{t('orders.activeFilter')}:</span>
            <span>{activeKpiLabel}</span>
            <button
              onClick={() => setKpi({ kind: 'none' })}
              aria-label={t('orders.clearFilter')}
              className="p-0.5 rounded-full hover:bg-blue-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('orders.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'all')}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{t('orders.allStatuses')}</option>
            {(Object.keys(STATUS_KEYS) as OrderStatus[]).map(status => (
              <option key={status} value={status}>{t(STATUS_KEYS[status])}</option>
            ))}
          </select>
          <button
            onClick={() => {
              if (filteredOrders.length === 0) { toast.info(t('toast.exportEmpty')); return; }
              exportToCsv(filteredOrders as any[], [
                { key: 'id',            label: 'ID' },
                { key: 'customerName',  label: t('orders.col.customer') },
                { key: 'customerPhone', label: 'Phone' },
                { key: 'merchant',      label: t('orders.col.merchant') },
                { key: 'status',        label: t('orders.col.status') },
                { key: 'total',         label: t('orders.col.total') },
                { key: 'createdAt',     label: 'Created' },
              ], 'orders');
              toast.success(`${t('toast.exported')}: ${filteredOrders.length}`);
            }}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="w-5 h-5" />
            {t('orders.export')}
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('orders.col.order')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('orders.col.customer')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('orders.col.merchant')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('orders.col.type')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('orders.col.status')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('orders.col.total')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('orders.col.sla')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('orders.col.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredOrders.map((order) => {
                const DeliveryIcon = DELIVERY_ICONS[order.deliveryType];
                const mainImg = order.items[0]?.imageUrl;
                const extraImgs = order.items.slice(1, 4);
                const moreCount = order.items.length - 4;
                return (
                  <tr key={order.id} className={`hover:bg-gray-50 transition-colors ${order.isOverdue ? 'bg-red-50' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {mainImg && (
                          <div className="flex items-center shrink-0">
                            <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-gray-50 shrink-0 z-10">
                              <img src={mainImg} alt={localize(order.items[0]?.name)} className="w-full h-full object-cover" loading="lazy" />
                            </div>
                            {extraImgs.map((item, idx) => (
                              <div
                                key={item.id}
                                className="w-6 h-6 rounded-md overflow-hidden border border-white shadow-sm bg-gray-100 -ml-2 shrink-0"
                                style={{ zIndex: 9 - idx }}
                                title={localize(item.name)}
                              >
                                <img src={item.imageUrl} alt={localize(item.name)} className="w-full h-full object-cover" loading="lazy" />
                              </div>
                            ))}
                            {moreCount > 0 && (
                              <div className="w-6 h-6 rounded-md bg-gray-200 border border-white -ml-2 flex items-center justify-center shrink-0" style={{ zIndex: 5 }}>
                                <span className="text-[9px] font-semibold text-gray-500">+{moreCount}</span>
                              </div>
                            )}
                          </div>
                        )}
                        <div>
                          <Link to={`/orders/${order.id}`} className="font-medium text-blue-600 hover:text-blue-700 font-mono text-sm">
                            {order.orderNumber}
                          </Link>
                          <p className="text-sm text-gray-500">{order.createdAt}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{localize(order.customerName)}</p>
                        <p className="text-sm text-gray-500">{order.customerPhone.replace(/\d(?=\d{2})/g, (m, i) => i > 8 && i < 14 ? '*' : m)}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Link to={`/merchants/${order.merchantId}`} className="text-sm text-gray-900 hover:text-blue-600">
                        {localize(order.merchant)}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <DeliveryIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {t(DELIVERY_KEYS[order.deliveryType])}
                        </span>
                      </div>
                      {order.pvzCode && (
                        <p className="text-xs text-gray-500 mt-0.5">{order.pvzCode}</p>
                      )}
                      {order.courierName && (
                        <p className="text-xs text-gray-500 mt-0.5">{localize(order.courierName)}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                        {t(STATUS_KEYS[order.status])}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{formatCurrency(order.total)}</p>
                      <p className="text-sm text-gray-500">{order.itemsCount} {t('orders.itemsShort')}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        {order.isOverdue ? (
                          <div style={{display:'contents'}}>
                            <AlertCircle className="w-4 h-4 text-red-600" />
                            <span className="text-sm text-red-600">{t('orders.overdue')}</span>
                          </div>
                        ) : order.status === 'delivered' || order.status === 'cancelled' ? (
                          <span className="text-sm text-gray-400">—</span>
                        ) : (
                          <div style={{display:'contents'}}>
                            <Clock className="w-4 h-4 text-green-600" />
                            <span className="text-sm text-gray-600">{order.slaDeadline.split(' ')[1]}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/orders/${order.id}`}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        {t('orders.detail')}
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    {t('orders.empty')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
