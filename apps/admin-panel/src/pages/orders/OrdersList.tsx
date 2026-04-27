import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Search, Download, Eye, AlertCircle, Clock, Package, Truck, MapPin, ShoppingBag } from 'lucide-react';
import {
  ORDERS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  formatCurrency,
  type OrderStatus,
  type DeliveryType,
} from '../../data/orders-mock';

const deliveryTypeLabels: Record<DeliveryType, string> = {
  delivery: 'Доставка',
  pickup: 'Самовывоз',
  pvz: 'ПВЗ',
};

const deliveryTypeIcons: Record<DeliveryType, any> = {
  delivery: Truck,
  pickup: ShoppingBag,
  pvz: MapPin,
};

export function OrdersList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');

  const filteredOrders = useMemo(() => {
    return ORDERS.filter(order => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q ||
        order.orderNumber.toLowerCase().includes(q) ||
        order.customerName.toLowerCase().includes(q) ||
        order.customerPhone.includes(searchQuery) ||
        order.merchant.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

  const stats = useMemo(() => ({
    active: ORDERS.filter(o => !['delivered', 'cancelled', 'returned'].includes(o.status)).length,
    overdue: ORDERS.filter(o => o.isOverdue).length,
    inDelivery: ORDERS.filter(o => ['courier_assigned', 'in_transit'].includes(o.status)).length,
    deliveredToday: ORDERS.filter(o => o.status === 'delivered').length,
  }), []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Заказы</h1>
          <p className="text-gray-500">Управление заказами и доставками</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Активные',          value: stats.active,          color: 'text-blue-600',   bg: 'bg-blue-50',   filter: null         as OrderStatus | null },
          { label: 'Просрочки SLA',     value: stats.overdue,         color: 'text-red-600',    bg: 'bg-red-50',    filter: null         as OrderStatus | null },
          { label: 'В доставке',        value: stats.inDelivery,      color: 'text-purple-600', bg: 'bg-purple-50', filter: 'in_transit' as OrderStatus },
          { label: 'Доставлено сегодня',value: stats.deliveredToday,  color: 'text-green-600',  bg: 'bg-green-50',  filter: 'delivered'  as OrderStatus },
        ].map(stat => (
          <button
            key={stat.label}
            onClick={() => { if (stat.filter) setStatusFilter(statusFilter === stat.filter ? 'all' : stat.filter); else toast.info(stat.label, { description: `${stat.value} заказов` }); }}
            className={`${stat.bg} p-4 rounded-lg border text-left transition-all cursor-pointer hover:shadow-md active:scale-[0.98] ${stat.filter && statusFilter === stat.filter ? 'ring-2 ring-offset-1 ring-current border-current' : 'border-gray-200 hover:border-gray-300'}`}
          >
            <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск по номеру заказа, клиенту, телефону..."
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
            <option value="all">Все статусы</option>
            {Object.entries(ORDER_STATUS_LABELS).map(([status, label]) => (
              <option key={status} value={status}>{label}</option>
            ))}
          </select>
          <button
            onClick={() => toast.success('Экспорт запущен', { description: `${filteredOrders.length} заказов в CSV` })}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="w-5 h-5" />
            Экспорт
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Заказ</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Клиент</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Продавец</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Тип</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Сумма</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SLA</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredOrders.map((order) => {
                const DeliveryIcon = deliveryTypeIcons[order.deliveryType];
                const mainImg = order.items[0]?.imageUrl;
                const extraImgs = order.items.slice(1, 4);
                const moreCount = order.items.length - 4;
                return (
                  <tr key={order.id} className={`hover:bg-gray-50 transition-colors ${order.isOverdue ? 'bg-red-50' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {/* Product images */}
                        {mainImg && (
                          <div className="flex items-center shrink-0">
                            {/* Main (biggest) image */}
                            <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-gray-50 shrink-0 z-10">
                              <img src={mainImg} alt={order.items[0]?.name} className="w-full h-full object-cover" loading="lazy" />
                            </div>
                            {/* Extra images — smaller, overlapping */}
                            {extraImgs.map((item, idx) => (
                              <div
                                key={item.id}
                                className="w-6 h-6 rounded-md overflow-hidden border border-white shadow-sm bg-gray-100 -ml-2 shrink-0"
                                style={{ zIndex: 9 - idx }}
                                title={item.name}
                              >
                                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                              </div>
                            ))}
                            {moreCount > 0 && (
                              <div className="w-6 h-6 rounded-md bg-gray-200 border border-white -ml-2 flex items-center justify-center shrink-0" style={{ zIndex: 5 }}>
                                <span className="text-[9px] font-semibold text-gray-500">+{moreCount}</span>
                              </div>
                            )}
                          </div>
                        )}
                        {/* Order info */}
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
                        <p className="font-medium text-gray-900">{order.customerName}</p>
                        <p className="text-sm text-gray-500">{order.customerPhone.replace(/\d(?=\d{2})/g, (m, i) => i > 8 && i < 14 ? '*' : m)}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Link to={`/merchants/${order.merchantId}`} className="text-sm text-gray-900 hover:text-blue-600">
                        {order.merchant}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <DeliveryIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {deliveryTypeLabels[order.deliveryType]}
                        </span>
                      </div>
                      {order.pvzCode && (
                        <p className="text-xs text-gray-500 mt-0.5">{order.pvzCode}</p>
                      )}
                      {order.courierName && (
                        <p className="text-xs text-gray-500 mt-0.5">{order.courierName}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ORDER_STATUS_COLORS[order.status]}`}>
                        {ORDER_STATUS_LABELS[order.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{formatCurrency(order.total)}</p>
                      <p className="text-sm text-gray-500">{order.itemsCount} поз.</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        {order.isOverdue ? (
                          <div style={{display:'contents'}}>
                            <AlertCircle className="w-4 h-4 text-red-600" />
                            <span className="text-sm text-red-600">Просрочен</span>
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
                        Детали
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    Заказы не найдены
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