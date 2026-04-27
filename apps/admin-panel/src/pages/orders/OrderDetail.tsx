import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactDOM from 'react-dom';
import {
  ArrowLeft, Package, MapPin, User, CreditCard, MessageSquare,
  FileText, History, AlertCircle, Phone, XCircle, SquarePen as Edit, Truck,
  ShoppingBag, Copy, CheckCircle, Clock, Send, Download, Plus,
  X, Tag, CheckCircle2, RefreshCw, Eye, Printer, ZoomIn, ZoomOut,
  RotateCw, Maximize2, Minimize2, ChevronLeft, ChevronRight, Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getOrderById,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
  formatCurrency,
  type Order,
  type OrderStatus,
} from '../../data/orders-mock';
import { copyToClipboard } from '../../utils/clipboard';
import { DocumentViewerModal, type DocumentRecord, type DocumentContent } from '../../components/ui/DocumentViewer';

type Tab = 'summary' | 'items' | 'timeline' | 'logistics' | 'payments' | 'communications' | 'documents' | 'incidents';

const tabs: { id: Tab; label: string; icon: any }[] = [
  { id: 'summary', label: 'Сводка', icon: Package },
  { id: 'items', label: 'Позиции', icon: Package },
  { id: 'timeline', label: 'История', icon: History },
  { id: 'logistics', label: 'Логистика', icon: MapPin },
  { id: 'payments', label: 'Платежи', icon: CreditCard },
  { id: 'communications', label: 'Коммуникации', icon: MessageSquare },
  { id: 'documents', label: 'Документы', icon: FileText },
  { id: 'incidents', label: 'Инциденты', icon: AlertCircle },
];

const statusBannerConfig: Partial<Record<OrderStatus, { bg: string; border: string; iconBg: string; iconColor: string; textColor: string; subtextColor: string }>> = {
  new: { bg: 'bg-blue-50', border: 'border-blue-200', iconBg: 'bg-blue-100', iconColor: 'text-blue-600', textColor: 'text-blue-900', subtextColor: 'text-blue-700' },
  accepted: { bg: 'bg-blue-50', border: 'border-blue-200', iconBg: 'bg-blue-100', iconColor: 'text-blue-600', textColor: 'text-blue-900', subtextColor: 'text-blue-700' },
  preparing: { bg: 'bg-yellow-50', border: 'border-yellow-200', iconBg: 'bg-yellow-100', iconColor: 'text-yellow-600', textColor: 'text-yellow-900', subtextColor: 'text-yellow-700' },
  ready: { bg: 'bg-green-50', border: 'border-green-200', iconBg: 'bg-green-100', iconColor: 'text-green-600', textColor: 'text-green-900', subtextColor: 'text-green-700' },
  courier_assigned: { bg: 'bg-purple-50', border: 'border-purple-200', iconBg: 'bg-purple-100', iconColor: 'text-purple-600', textColor: 'text-purple-900', subtextColor: 'text-purple-700' },
  in_transit: { bg: 'bg-purple-50', border: 'border-purple-200', iconBg: 'bg-purple-100', iconColor: 'text-purple-600', textColor: 'text-purple-900', subtextColor: 'text-purple-700' },
  at_pvz: { bg: 'bg-green-50', border: 'border-green-200', iconBg: 'bg-green-100', iconColor: 'text-green-600', textColor: 'text-green-900', subtextColor: 'text-green-700' },
  delivered: { bg: 'bg-gray-50', border: 'border-gray-200', iconBg: 'bg-gray-100', iconColor: 'text-gray-600', textColor: 'text-gray-900', subtextColor: 'text-gray-600' },
  cancelled: { bg: 'bg-red-50', border: 'border-red-200', iconBg: 'bg-red-100', iconColor: 'text-red-600', textColor: 'text-red-900', subtextColor: 'text-red-700' },
  returned: { bg: 'bg-orange-50', border: 'border-orange-200', iconBg: 'bg-orange-100', iconColor: 'text-orange-600', textColor: 'text-orange-900', subtextColor: 'text-orange-700' },
};

function getStatusBannerDescription(order: Order): string {
  switch (order.status) {
    case 'new': return 'Ожидает подтверждения продавцом';
    case 'accepted': return `Принят продавцом: ${order.merchant}`;
    case 'preparing': return `Подготовка: ${order.merchant}`;
    case 'ready': return order.deliveryType === 'pickup' ? `Готов к самовывозу. Код: ${order.pickupCode}` : 'Готов к передаче';
    case 'courier_assigned': return `Назначен курьер: ${order.courierName}`;
    case 'in_transit': return `Курьер ${order.courierName} в пути → ${order.deliveryAddress || order.pvzName}`;
    case 'at_pvz': return `ПВЗ: ${order.pvzName} (${order.pvzCode}) • Ячейка: ${order.storageCell} • Код выдачи: ${order.pickupCode}`;
    case 'delivered': return 'Заказ успешно доставлен';
    case 'cancelled': return `Заказ отменён. ${order.notes || ''}`;
    case 'returned': return 'Оформлен возврат';
    default: return '';
  }
}

const deliveryTypeLabels = {
  delivery: 'Доставка курьером',
  pickup: 'Самовывоз',
  pvz: 'Доставка на ПВЗ',
};

const deliveryTypeIcons = {
  delivery: Truck,
  pickup: ShoppingBag,
  pvz: MapPin,
};

export function OrderDetail() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<Tab>('summary');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [documentViewer, setDocumentViewer] = useState<DocumentRecord | null>(null);

  const order = getOrderById(id || '');

  if (!order) {
    return (
      <div className="space-y-6">
        <Link to="/orders" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700">
          <ArrowLeft className="w-4 h-4" /> К списку заказов
        </Link>
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Заказ не найден</h2>
          <p className="text-gray-500">Заказ с ID «{id}» не существует</p>
        </div>
      </div>
    );
  }

  const banner = statusBannerConfig[order.status] || statusBannerConfig.new!;

  const handleCopyPickupCode = () => {
    if (order.pickupCode) {
      copyToClipboard(order.pickupCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const isTerminal = order.status === 'delivered' || order.status === 'cancelled' || order.status === 'returned';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link to="/orders" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 font-mono">{order.orderNumber}</h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ORDER_STATUS_COLORS[order.status]}`}>
                {ORDER_STATUS_LABELS[order.status]}
              </span>
              {order.isOverdue && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                  <AlertCircle className="w-3 h-3" /> SLA просрочен
                </span>
              )}
            </div>
            <p className="text-gray-500 mt-0.5">
              <Link to={`/merchants/${order.merchantId}`} className="hover:text-blue-600">{order.merchant}</Link>
              {' '} • {order.createdAt}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm">
            <Phone className="w-4 h-4" />
            Позвонить
          </button>
          {!isTerminal && (
            <div style={{display:'contents'}}>
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm">
                <Edit className="w-4 h-4" />
                Изменить
              </button>
              <button
                onClick={() => setShowCancelModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                <XCircle className="w-4 h-4" />
                Отменить
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Status Banner */}
      <div className={`${banner.bg} border ${banner.border} p-4 rounded-lg`}>
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 ${banner.iconBg} rounded-full flex items-center justify-center flex-shrink-0`}>
            <Package className={`w-6 h-6 ${banner.iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-medium ${banner.textColor}`}>{ORDER_STATUS_LABELS[order.status]}</p>
            <p className={`text-sm ${banner.subtextColor}`}>{getStatusBannerDescription(order)}</p>
          </div>
          {!isTerminal && (
            <div className="text-right flex-shrink-0">
              <p className={`text-sm ${banner.subtextColor}`}>SLA до {order.slaDeadline}</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-4 h-4 text-gray-400" />
            <p className="text-sm text-gray-500">Клиент</p>
          </div>
          <p className="font-medium text-gray-900">{order.customerName}</p>
          <p className="text-sm text-gray-500">{order.customerPhone}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          {(() => {
            const DIcon = deliveryTypeIcons[order.deliveryType];
            return (
              <div style={{display:'contents'}}>
                <div className="flex items-center gap-2 mb-2">
                  <DIcon className="w-4 h-4 text-gray-400" />
                  <p className="text-sm text-gray-500">Доставка</p>
                </div>
                <p className="font-medium text-gray-900">{deliveryTypeLabels[order.deliveryType]}</p>
                <p className="text-sm text-gray-500">{order.pvzName || order.deliveryAddress || 'Самовывоз из магазина'}</p>
              </div>
            );
          })()}
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-4 h-4 text-gray-400" />
            <p className="text-sm text-gray-500">Оплата</p>
          </div>
          <p className={`font-medium ${PAYMENT_STATUS_COLORS[order.paymentStatus]}`}>
            {PAYMENT_STATUS_LABELS[order.paymentStatus]}
          </p>
          <p className="text-sm text-gray-500">{order.paymentMethod}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-gray-400" />
            <p className="text-sm text-gray-500">Итого</p>
          </div>
          <p className="font-medium text-gray-900 text-lg">{formatCurrency(order.total)}</p>
          <p className="text-sm text-gray-500">{order.itemsCount} поз. • {order.weight} кг</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="border-b border-gray-200 overflow-x-auto">
          <nav className="flex -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'summary' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Информация о заказе</h3>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  <div>
                    <dt className="text-sm text-gray-500">Номер заказа</dt>
                    <dd className="font-medium text-gray-900 font-mono">{order.orderNumber}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Создан</dt>
                    <dd className="font-medium text-gray-900">{order.createdAt}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Обновлён</dt>
                    <dd className="font-medium text-gray-900">{order.updatedAt}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Продавец</dt>
                    <dd>
                      <Link to={`/merchants/${order.merchantId}`} className="font-medium text-blue-600 hover:text-blue-700">
                        {order.merchant}
                      </Link>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">SLA дедлайн</dt>
                    <dd className={`font-medium ${order.isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                      {order.slaDeadline}
                      {order.isOverdue && <span className="ml-2 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Просрочен</span>}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Вес</dt>
                    <dd className="font-medium text-gray-900">{order.weight} кг</dd>
                  </div>
                  {order.deliveryAddress && (
                    <div className="md:col-span-2">
                      <dt className="text-sm text-gray-500">Адрес доставки</dt>
                      <dd className="font-medium text-gray-900">{order.deliveryAddress}</dd>
                    </div>
                  )}
                  {order.notes && (
                    <div className="md:col-span-2">
                      <dt className="text-sm text-gray-500">Примечания</dt>
                      <dd className="font-medium text-gray-900 bg-yellow-50 px-3 py-2 rounded-lg border border-yellow-200">{order.notes}</dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Financial breakdown */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Финансовая сводка</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Подытог</span>
                    <span className="text-gray-900">{formatCurrency(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Доставка</span>
                    <span className="text-gray-900">{order.deliveryFee === 0 ? 'Бесплатно' : formatCurrency(order.deliveryFee)}</span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Скидка</span>
                      <span className="text-green-600">−{formatCurrency(order.discount)}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 pt-2 flex justify-between">
                    <span className="font-semibold text-gray-900">Итого</span>
                    <span className="font-bold text-gray-900">{formatCurrency(order.total)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'items' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Состав заказа ({order.items.length} поз.)</h3>
              <div className="space-y-3">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{formatCurrency(item.total)}</p>
                      <p className="text-sm text-gray-500">{item.qty} × {formatCurrency(item.price)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Подытог ({order.items.length} поз.)</span>
                    <span>{formatCurrency(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Доставка</span>
                    <span>{order.deliveryFee === 0 ? 'Бесплатно' : formatCurrency(order.deliveryFee)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-100">
                    <span className="font-semibold text-gray-900">Итого:</span>
                    <span className="font-bold text-gray-900 text-lg">{formatCurrency(order.total)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">История статусов</h3>
              <div className="space-y-0">
                {order.timeline.map((event, idx) => (
                  <div key={event.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        idx === order.timeline.length - 1 ? 'bg-blue-600' : 'bg-blue-100'
                      }`}>
                        <div className={`w-3 h-3 rounded-full ${
                          idx === order.timeline.length - 1 ? 'bg-white' : 'bg-blue-600'
                        }`} />
                      </div>
                      {idx < order.timeline.length - 1 && (
                        <div className="w-0.5 h-full bg-gray-200 min-h-[24px]" />
                      )}
                    </div>
                    <div className="flex-1 pb-6">
                      <p className="font-medium text-gray-900">{event.description}</p>
                      <p className="text-sm text-gray-500 mt-1">{event.actor} • {event.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'logistics' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Логистическая информация</h3>

              {order.deliveryType === 'pvz' && order.pvzName && (
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <p className="text-sm text-gray-500">Пункт выдачи</p>
                  </div>
                  <p className="font-medium text-gray-900">{order.pvzName} ({order.pvzCode})</p>
                  {order.storageCell && (
                    <p className="text-sm text-gray-500 mt-1">Ячейка хранения: <span className="font-mono font-medium text-gray-900">{order.storageCell}</span></p>
                  )}
                </div>
              )}

              {order.deliveryType === 'delivery' && order.deliveryAddress && (
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <p className="text-sm text-gray-500">Адрес доставки</p>
                  </div>
                  <p className="font-medium text-gray-900">{order.deliveryAddress}</p>
                </div>
              )}

              {order.courierName && (
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Truck className="w-4 h-4 text-gray-400" />
                    <p className="text-sm text-gray-500">Курьер</p>
                  </div>
                  <p className="font-medium text-gray-900">{order.courierName}</p>
                  {order.courierId && (
                    <Link to={`/couriers/${order.courierId}`} className="text-sm text-blue-600 hover:text-blue-700">
                      Профиль курьера →
                    </Link>
                  )}
                </div>
              )}

              {order.pickupCode && (
                <div className="p-4 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-500 mb-2">Код выдачи</p>
                  <div className="flex items-center gap-3">
                    <p className="text-3xl font-bold text-gray-900 font-mono tracking-widest">{order.pickupCode}</p>
                    <button
                      onClick={handleCopyPickupCode}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Копировать код"
                    >
                      {copiedCode ? <CheckCircle className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5 text-gray-400" />}
                    </button>
                  </div>
                </div>
              )}

              <div className="p-4 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Вес отправления</p>
                <p className="font-medium text-gray-900">{order.weight} кг</p>
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Платёжная информация</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Статус оплаты</p>
                  <p className={`font-medium ${PAYMENT_STATUS_COLORS[order.paymentStatus]}`}>
                    {PAYMENT_STATUS_LABELS[order.paymentStatus]}
                  </p>
                </div>
                <div className="p-4 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Способ оплаты</p>
                  <p className="font-medium text-gray-900">{order.paymentMethod}</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Подытог</span>
                  <span className="text-gray-900">{formatCurrency(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Доставка</span>
                  <span className="text-gray-900">{order.deliveryFee === 0 ? 'Бесплатно' : formatCurrency(order.deliveryFee)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Скидка</span>
                    <span className="text-green-600">−{formatCurrency(order.discount)}</span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-2 flex justify-between">
                  <span className="font-semibold text-gray-900">Итого</span>
                  <span className="font-bold text-gray-900">{formatCurrency(order.total)}</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'communications' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Коммуникации с клиентом</h3>

              {/* Message history */}
              <div className="space-y-4 max-h-80 overflow-y-auto">
                {[
                  { id: 'm1', type: 'sms', text: 'Ваш заказ принят. Ожидайте доставки.', time: order.createdAt, direction: 'out' },
                  { id: 'm2', type: 'push', text: 'Курьер назначен и уже едет к вам!', time: order.updatedAt, direction: 'out' },
                  { id: 'm3', type: 'call', text: 'Входящий звонок (пропущен)', time: order.updatedAt, direction: 'in' },
                ].map(msg => (
                  <div key={msg.id} className={`flex gap-3 ${msg.direction === 'out' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold ${msg.direction === 'out' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
                      {msg.type === 'call' ? '📞' : msg.type === 'sms' ? '💬' : '🔔'}
                    </div>
                    <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${msg.direction === 'out' ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-gray-100 text-gray-900 rounded-tl-sm'}`}>
                      {msg.text}
                      <p className={`text-xs mt-1 ${msg.direction === 'out' ? 'text-blue-200' : 'text-gray-400'}`}>{msg.time}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Send message */}
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-700 mb-3">Отправить сообщение клиенту</p>
                <div className="flex gap-2 mb-2">
                  {['SMS', 'Push', 'Email'].map(ch => (
                    <button key={ch} onClick={() => toast.success(`${ch} отправлен`, { description: `Клиент: ${order.customerName}` })}
                      className="flex-1 py-2 border border-gray-200 rounded-lg text-sm hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors font-medium">
                      {ch}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" placeholder="Введите сообщение..." className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  <button onClick={() => toast.success('Сообщение отправлено')} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"><Send className="w-4 h-4" /></button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => toast.info('Звонок клиенту', { description: order.customerPhone })} className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm transition-colors"><Phone className="w-4 h-4" /> Позвонить</button>
                <button onClick={() => toast.success('История чата открыта')} className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm transition-colors"><MessageSquare className="w-4 h-4" /> Чат-история</button>
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">Документы по заказу</h3>
                <button onClick={() => toast.success('Документ создан')} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"><Plus className="w-4 h-4" /> Добавить</button>
              </div>
              <div className="space-y-3">
                {[
                  { id: 'd1', name: 'Товарная накладная', type: 'PDF', size: '124 КБ', date: order.createdAt, status: 'signed' },
                  { id: 'd2', name: 'Акт передачи курьеру', type: 'PDF', size: '87 КБ', date: order.updatedAt, status: 'signed' },
                  { id: 'd3', name: 'Чек оплаты', type: 'PDF', size: '45 КБ', date: order.createdAt, status: 'signed' },
                  ...(order.status === 'returned' ? [{ id: 'd4', name: 'Акт возврата', type: 'PDF', size: '93 КБ', date: order.updatedAt, status: 'pending' as const }] : []),
                ].map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-red-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{doc.name}</p>
                        <p className="text-xs text-gray-500">{doc.type} · {doc.size} · {doc.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${doc.status === 'signed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {doc.status === 'signed' ? '✓ Подписан' : '⏳ Ожидает'}
                      </span>
                      <button onClick={() => toast.success(`Скачивание: ${doc.name}`)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title="Скачать"><Download className="w-4 h-4 text-gray-400" /></button>
                      <button onClick={() => setDocumentViewer(doc)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title="Просмотреть"><Eye className="w-4 h-4 text-gray-400" /></button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button onClick={() => toast.success('Печать запущена')} className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm transition-colors">🖨️ Распечатать все</button>
                <button onClick={() => toast.success('Все документы скачаны')} className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm transition-colors"><Download className="w-4 h-4" /> Скачать ZIP</button>
              </div>
            </div>
          )}

          {activeTab === 'incidents' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">Инциденты по заказу</h3>
                <button onClick={() => toast.success('Инцидент создан', { description: `Связан с ${order.orderNumber}` })} className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"><Plus className="w-4 h-4" /> Создать</button>
              </div>
              {order.isOverdue ? (
                <div className="space-y-3">
                  <div className="p-4 border border-red-200 bg-red-50 rounded-xl">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-red-900">Просрочка SLA доставки</p>
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">Открыт</span>
                        </div>
                        <p className="text-sm text-red-700 mt-1">Заказ не доставлен в срок. Дедлайн: {order.slaDeadline}</p>
                        <p className="text-xs text-red-500 mt-2">Автоматически создан · {order.updatedAt}</p>
                        <div className="flex gap-2 mt-3">
                          <button onClick={() => toast.success('Инцидент эскалирован')} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs hover:bg-red-700 transition-colors">Эскалировать</button>
                          <button onClick={() => toast.success('Инцидент закрыт')} className="px-3 py-1.5 border border-red-300 text-red-700 rounded-lg text-xs hover:bg-red-100 transition-colors">Закрыть</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-400" />
                  <p className="font-medium text-gray-700">Инцидентов нет</p>
                  <p className="text-sm text-gray-400 mt-1">Заказ выполняется без нарушений</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Отменить заказ</h3>
            <p className="text-sm text-gray-500 mb-1 font-mono">{order.orderNumber}</p>
            <p className="text-gray-600 mb-4">
              Текущий статус: {ORDER_STATUS_LABELS[order.status]}. Отмена требует подтверждения и указания причины.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Причина отмены
              </label>
              <select className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>Запрос клиента</option>
                <option>Товар поврежден</option>
                <option>Ошибка адреса</option>
                <option>Fraud hold</option>
                <option>Нет товара на складе</option>
                <option>Другое</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Комментарий (обязательно)
              </label>
              <textarea
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Подробное описание причины отмены..."
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Закрыть
              </button>
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  toast.success('Заказ отменён', { description: order.orderNumber });
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Подтвердить отмену
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {documentViewer && (() => {
        const orderDocs: DocumentRecord[] = [
          { id: 'd1', name: 'Товарная накладная', type: 'PDF', size: '124 КБ', date: order.createdAt, status: 'signed', signedBy: 'Администратор', signedAt: order.createdAt, number: `ТН-${order.orderNumber.replace('#','').replace('ORD-','')}`, content: {
            title: 'ТОВАРНАЯ НАКЛАДНАЯ', number: `ТН-${order.orderNumber.replace('#','').replace('ORD-','')}`, date: order.createdAt,
            organization: 'ООО «ПВЗ Платформа» · ИНН 7712345678 · КПП 771201001',
            headerFields: [
              { label: 'Поставщик', value: order.merchant },
              { label: 'Покупатель', value: order.customerName },
              { label: 'Основание', value: `Заказ ${order.orderNumber} от ${order.createdAt}` },
            ],
            tableHeaders: ['№', 'Наименование', 'Ед.', 'Кол-во', 'Цена', 'Сумма'],
            tableRows: order.items.map((item, i) => [
              `${i+1}`, item.name, 'шт.', `${item.qty}`, formatCurrency(item.price), formatCurrency(item.total)
            ]),
            totalRow: ['', 'Итого', '', `${order.items.reduce((s,i)=>s+i.qty,0)}`, '', formatCurrency(order.subtotal)],
            footerFields: [
              { label: 'Доставка', value: order.deliveryFee === 0 ? 'Бесплатно' : formatCurrency(order.deliveryFee) },
              ...(order.discount > 0 ? [{ label: 'Скидка', value: `−${formatCurrency(order.discount)}` }] : []),
              { label: 'Итого к оплате', value: formatCurrency(order.total) },
              { label: 'Способ оплаты', value: order.paymentMethod },
            ],
            signatures: [
              { role: 'Отправитель', name: order.merchant, signed: true, date: order.createdAt },
              { role: 'Получатель', name: order.customerName, signed: order.status === 'delivered', date: order.status === 'delivered' ? order.updatedAt : undefined },
            ],
            qrCode: true,
          }},
          { id: 'd2', name: 'Акт передачи курьеру', type: 'PDF', size: '87 КБ', date: order.updatedAt, status: 'signed', signedBy: order.courierName || 'Курьер', signedAt: order.updatedAt, number: `АПК-${order.orderNumber.replace('#','').replace('ORD-','')}`, content: {
            title: 'АКТ ПЕРЕДАЧИ ОТПРАВЛЕНИЯ КУРЬЕРУ', number: `АПК-${order.orderNumber.replace('#','').replace('ORD-','')}`, date: order.updatedAt,
            organization: 'ООО «ПВЗ Платформа»',
            headerFields: [
              { label: 'Заказ', value: order.orderNumber },
              { label: 'Курьер', value: order.courierName || 'Не назначен' },
              { label: 'Склад отправления', value: order.pvzName || 'Центральный склад' },
              { label: 'Адрес доставки', value: order.deliveryAddress || order.pvzName || 'Самовывоз' },
              { label: 'Вес отправления', value: `${order.weight} кг` },
            ],
            tableHeaders: ['№', 'Позиция', 'Кол-во', 'Состояние'],
            tableRows: order.items.map((item, i) => [`${i+1}`, item.name, `${item.qty} шт.`, 'Без повреждений']),
            notes: [
              'Отправление принято курьером в надлежащем состоянии.',
              `SLA доставки: ${order.slaDeadline}`,
              'При обнаружении повреждений — немедленно уведомить диспетчера.',
            ],
            signatures: [
              { role: 'Кладовщик', name: 'Петров А.С.', signed: true, date: order.updatedAt },
              { role: 'Курьер', name: order.courierName || 'Курьер', signed: true, date: order.updatedAt },
            ],
            qrCode: true,
          }},
          { id: 'd3', name: 'Чек оплаты', type: 'PDF', size: '45 КБ', date: order.createdAt, status: 'signed', signedBy: 'Платёжная система', signedAt: order.createdAt, number: `ЧК-${order.orderNumber.replace('#','').replace('ORD-','')}`, content: {
            title: 'КАССОВЫЙ ЧЕК', subtitle: 'Электронный документ', number: `ЧК-${order.orderNumber.replace('#','').replace('ORD-','')}`, date: order.createdAt,
            organization: 'ООО «ПВЗ Платформа» · ИНН 7712345678',
            tableHeaders: ['Позиция', 'Кол-во', 'Цена', 'Сумма'],
            tableRows: order.items.map(item => [item.name, `${item.qty}`, formatCurrency(item.price), formatCurrency(item.total)]),
            totalRow: ['Итого', '', '', formatCurrency(order.total)],
            footerFields: [
              { label: 'Способ оплаты', value: order.paymentMethod },
              { label: 'Статус', value: PAYMENT_STATUS_LABELS[order.paymentStatus] },
              { label: 'Покупатель', value: order.customerName },
              { label: 'ФД', value: `${Math.floor(Math.random()*9000000000)+1000000000}` },
              { label: 'ФП', value: `${Math.floor(Math.random()*9000000000)+1000000000}` },
            ],
            qrCode: true,
          }},
        ];
        if (order.status === 'returned') {
          orderDocs.push({ id: 'd4', name: 'Акт возврата', type: 'PDF', size: '93 КБ', date: order.updatedAt, status: 'pending', number: `АВ-${order.orderNumber.replace('#','').replace('ORD-','')}`, content: {
            title: 'АКТ ВОЗВРАТА ТОВАРА', number: `АВ-${order.orderNumber.replace('#','').replace('ORD-','')}`, date: order.updatedAt,
            organization: 'ООО «ПВЗ Платформа»',
            headerFields: [
              { label: 'Заказ', value: order.orderNumber },
              { label: 'Клиент', value: order.customerName },
              { label: 'Продавец', value: order.merchant },
              { label: 'Причина возврата', value: 'По заявлению клиента' },
            ],
            tableHeaders: ['№', 'Позиция', 'Кол-во', 'Сумма возврата', 'Состояние'],
            tableRows: order.items.map((item, i) => [`${i+1}`, item.name, `${item.qty} шт.`, formatCurrency(item.total), 'Без повреждений']),
            totalRow: ['', 'Итого к возврату', '', formatCurrency(order.total), ''],
            notes: [
              'Товар принят обратно в надлежащем состоянии.',
              'Возврат денежных средств будет произведён в течение 10 рабочих дней.',
            ],
            signatures: [
              { role: 'Администратор', name: 'Администратор ПВЗ', signed: false },
              { role: 'Клиент', name: order.customerName, signed: false },
            ],
          }});
        }
        const currentDoc = orderDocs.find(d => d.id === documentViewer.id) || documentViewer;
        return (
          <DocumentViewerModal
            doc={currentDoc}
            onClose={() => setDocumentViewer(null)}
            allDocs={orderDocs}
            onNavigate={(d) => setDocumentViewer(d)}
          />
        );
      })()}
    </div>
  );
}