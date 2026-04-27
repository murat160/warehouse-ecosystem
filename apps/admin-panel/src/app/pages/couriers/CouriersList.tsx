import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Search, Plus, Bike, MapPin, Phone, MessageSquare, Zap, Warehouse,
  ChevronRight, X,
} from 'lucide-react';
import { COURIERS_MOCK, type CourierType, type CourierStatus } from '../../data/couriers-mock';

type CourierExtra = (typeof COURIERS_MOCK)[number];

const STATUS_CFG: Record<string, { label: string; dot: string; badge: string }> = {
  online:        { label: 'Онлайн',         dot: 'bg-green-500',  badge: 'bg-green-100 text-green-700' },
  waiting_order: { label: 'Ждёт заказ',     dot: 'bg-blue-400',   badge: 'bg-blue-100 text-blue-700' },
  picking_order: { label: 'Забирает заказ', dot: 'bg-yellow-500', badge: 'bg-yellow-100 text-yellow-700' },
  delivering:    { label: 'Доставляет',     dot: 'bg-indigo-500', badge: 'bg-indigo-100 text-indigo-700' },
  on_task:       { label: 'На задании',     dot: 'bg-purple-500', badge: 'bg-purple-100 text-purple-700' },
  offline:       { label: 'Офлайн',         dot: 'bg-gray-400',   badge: 'bg-gray-100 text-gray-600' },
};

const VEHICLE_LABELS: Record<string, string> = {
  bike: '🚲 Велосипед', scooter: '🛵 Скутер', car: '🚗 Автомобиль',
  van: '🚐 Микроавтобус', truck: '🚛 Грузовик', foot: '🚶 Пешком',
};

export function CouriersList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CourierStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<CourierType | 'all'>('all');
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [busyOnly, setBusyOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'default' | 'completedToday'>('default');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '', phone: '', vehicle: 'bike', zone: 'Москва ЦАО',
    type: 'fast_delivery', contract: 'gig',
  });
  const [extraCouriers, setExtraCouriers] = useState<CourierExtra[]>([]);

  const allCouriers = useMemo(() => [...extraCouriers, ...COURIERS_MOCK], [extraCouriers]);

  const filtered = useMemo(() => {
    const list = allCouriers.filter(c => {
      const q = search.toLowerCase();
      const matchSearch = c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.zone.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || c.status === statusFilter;
      const matchType = typeFilter === 'all' || c.courier_type === typeFilter;
      const matchOnline = !onlineOnly || c.status !== 'offline';
      const matchBusy = !busyOnly || c.activeOrders > 0;
      return matchSearch && matchStatus && matchType && matchOnline && matchBusy;
    });
    if (sortBy === 'completedToday') {
      return [...list].sort((a, b) => b.completedToday - a.completedToday);
    }
    return list;
  }, [allCouriers, search, statusFilter, typeFilter, onlineOnly, busyOnly, sortBy]);

  const fastCount = allCouriers.filter(c => c.courier_type === 'fast_delivery').length;
  const warehouseCount = allCouriers.filter(c => c.courier_type === 'warehouse_delivery').length;
  const onlineCount = allCouriers.filter(c => c.status !== 'offline').length;
  const busyCount = allCouriers.filter(c => ['delivering', 'on_task', 'picking_order'].includes(c.status)).length;
  const activeOrders = allCouriers.reduce((s, c) => s + c.activeOrders, 0);
  const deliveredToday = allCouriers.reduce((s, c) => s + c.completedToday, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Курьеры</h1>
          <p className="text-gray-500">Управление курьерским флотом · Fast Delivery & Warehouse Delivery</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Добавить курьера
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: 'Онлайн',          value: onlineCount,    color: 'text-green-600',  bg: 'bg-green-50',  action: 'online'    as const },
          { label: 'В работе',         value: busyCount,      color: 'text-blue-600',   bg: 'bg-blue-50',   action: 'busy'      as const },
          { label: 'Активных зад.',    value: activeOrders,   color: 'text-purple-600', bg: 'bg-purple-50', action: 'orders'    as const },
          { label: 'Доставлено сег.',  value: deliveredToday, color: 'text-gray-900',   bg: 'bg-gray-50',   action: 'top-today' as const },
        ].map(stat => {
          const isActive =
            (stat.action === 'online'    && onlineOnly) ||
            (stat.action === 'busy'      && busyOnly) ||
            (stat.action === 'top-today' && sortBy === 'completedToday');
          return (
            <button
              key={stat.label}
              onClick={() => {
                if (stat.action === 'online')    setOnlineOnly(v => !v);
                if (stat.action === 'busy')      setBusyOnly(v => !v);
                if (stat.action === 'orders')    navigate('/orders');
                if (stat.action === 'top-today') setSortBy(s => s === 'completedToday' ? 'default' : 'completedToday');
              }}
              className={`${stat.bg} p-4 rounded-xl border text-left transition-all hover:shadow-md cursor-pointer active:scale-[0.98] ${isActive ? 'ring-2 ring-offset-1 ring-current border-current' : 'border-gray-200'}`}
            >
              <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </button>
          );
        })}
        <button
          onClick={() => setTypeFilter(typeFilter === 'fast_delivery' ? 'all' : 'fast_delivery')}
          className={`p-4 rounded-xl border cursor-pointer transition-all active:scale-[0.98] text-left ${typeFilter === 'fast_delivery' ? 'border-orange-400 bg-orange-50 ring-2 ring-orange-300 ring-offset-1' : 'bg-white border-gray-200 hover:border-orange-300 hover:shadow-md'}`}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Zap className="w-3.5 h-3.5 text-orange-500" />
            <p className="text-xs text-gray-500">Fast Delivery</p>
          </div>
          <p className="text-2xl font-bold text-orange-600">{fastCount}</p>
        </button>
        <button
          onClick={() => setTypeFilter(typeFilter === 'warehouse_delivery' ? 'all' : 'warehouse_delivery')}
          className={`p-4 rounded-xl border cursor-pointer transition-all active:scale-[0.98] text-left ${typeFilter === 'warehouse_delivery' ? 'border-teal-400 bg-teal-50 ring-2 ring-teal-300 ring-offset-1' : 'bg-white border-gray-200 hover:border-teal-300 hover:shadow-md'}`}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Warehouse className="w-3.5 h-3.5 text-teal-500" />
            <p className="text-xs text-gray-500">Warehouse</p>
          </div>
          <p className="text-2xl font-bold text-teal-600">{warehouseCount}</p>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск по имени, телефону, зоне..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as CourierStatus | 'all')}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="all">Все статусы</option>
            <option value="online">Онлайн</option>
            <option value="waiting_order">Ждёт заказ</option>
            <option value="picking_order">Забирает заказ</option>
            <option value="delivering">Доставляет</option>
            <option value="on_task">На задании</option>
            <option value="offline">Офлайн</option>
          </select>
        </div>

        {/* Type toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">Тип курьера:</span>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
            {[
              { v: 'all', label: 'Все', icon: null },
              { v: 'fast_delivery', label: 'Fast Delivery', icon: Zap },
              { v: 'warehouse_delivery', label: 'Warehouse', icon: Warehouse },
            ].map(({ v, label, icon: Icon }) => (
              <button
                key={v}
                onClick={() => setTypeFilter(v as CourierType | 'all')}
                className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors font-medium ${
                  typeFilter === v
                    ? v === 'fast_delivery' ? 'bg-orange-500 text-white' :
                      v === 'warehouse_delivery' ? 'bg-teal-600 text-white' : 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {Icon && <Icon className="w-3 h-3" />}{label}
              </button>
            ))}
          </div>
          {filtered.length !== COURIERS_MOCK.length && (
            <span className="text-xs text-gray-400">Показано: {filtered.length} из {COURIERS_MOCK.length}</span>
          )}
        </div>
      </div>

      {/* Couriers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map(courier => {
          const st = STATUS_CFG[courier.status] ?? STATUS_CFG.offline;
          const isFast = courier.courier_type === 'fast_delivery';

          return (
            <div key={courier.id} className="bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-shadow overflow-hidden">
              {/* Type stripe */}
              <div className={`h-1 ${isFast ? 'bg-gradient-to-r from-orange-400 to-yellow-400' : 'bg-gradient-to-r from-teal-500 to-blue-500'}`} />

              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-base ${isFast ? 'bg-gradient-to-br from-orange-400 to-yellow-500' : 'bg-gradient-to-br from-teal-500 to-blue-600'}`}>
                        {courier.avatar}
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${st.dot}`} />
                    </div>
                    <div>
                      <Link to={`/couriers/${courier.id}`} className="font-semibold text-gray-900 hover:text-blue-600 text-sm leading-tight">
                        {courier.name.split(' ').slice(0, 2).join(' ')}
                      </Link>
                      <p className="text-xs text-gray-500">{courier.phone}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${st.badge}`}>{st.label}</span>
                    <span className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${isFast ? 'bg-orange-50 text-orange-700' : 'bg-teal-50 text-teal-700'}`}>
                      {isFast ? <Zap className="w-2.5 h-2.5" /> : <Warehouse className="w-2.5 h-2.5" />}
                      {isFast ? 'Fast' : 'Warehouse'}
                    </span>
                  </div>
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div>
                    <p className="text-[10px] text-gray-400">Транспорт</p>
                    <p className="text-xs font-medium text-gray-700 mt-0.5">{VEHICLE_LABELS[courier.vehicle]}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">Зона / Регион</p>
                    <p className="text-xs font-medium text-gray-700 mt-0.5">{courier.zone}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">{isFast ? 'Активных' : 'Заданий'}</p>
                    <p className={`text-sm font-bold mt-0.5 ${courier.activeOrders > 0 ? 'text-blue-600' : 'text-gray-400'}`}>{courier.activeOrders}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">Сегодня</p>
                    <p className="text-sm font-bold text-green-600 mt-0.5">{courier.completedToday}</p>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="p-2.5 bg-yellow-50 rounded-lg text-center">
                    <p className="text-[10px] text-yellow-700 mb-0.5">Рейтинг</p>
                    <p className="text-sm font-bold text-yellow-900">⭐ {courier.rating}</p>
                  </div>
                  <div className="p-2.5 bg-green-50 rounded-lg text-center">
                    <p className="text-[10px] text-green-700 mb-0.5">Заработок</p>
                    <p className="text-sm font-bold text-green-900">₽{courier.earningsToday.toLocaleString()}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Link
                    to={`/couriers/${courier.id}`}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
                  >
                    <MapPin className="w-3.5 h-3.5" />Открыть профиль
                    <ChevronRight className="w-3 h-3 ml-auto" />
                  </Link>
                  <a
                    href={`tel:${courier.phone}`}
                    title={`Позвонить: ${courier.phone}`}
                    className="px-3 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                  <Link
                    to={`/chat?with=${encodeURIComponent(courier.id)}&name=${encodeURIComponent(courier.name)}`}
                    title={`Открыть чат с ${courier.name}`}
                    className="px-3 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </Link>
                </div>

                <p className="text-[10px] text-gray-400 mt-2.5 text-center">Онлайн: {courier.lastOnline}</p>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-3 py-16 text-center text-gray-400">
            <Bike className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">Курьеры не найдены</p>
            <p className="text-xs mt-1">Попробуйте изменить фильтры поиска</p>
          </div>
        )}
      </div>

      {/* Add Courier Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-bold text-gray-900">Добавить курьера</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">ФИО *</label>
                <input
                  value={addForm.name}
                  onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Иванов Иван Иванович"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Телефон *</label>
                <input
                  value={addForm.phone}
                  onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+7 (999) 000-00-00"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Тип курьера</label>
                  <select
                    value={addForm.type}
                    onChange={e => setAddForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  >
                    <option value="fast_delivery">Fast Delivery</option>
                    <option value="warehouse_delivery">Warehouse</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Транспорт</label>
                  <select
                    value={addForm.vehicle}
                    onChange={e => setAddForm(f => ({ ...f, vehicle: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  >
                    <option value="bike">Велосипед</option>
                    <option value="scooter">Скутер</option>
                    <option value="car">Автомобиль</option>
                    <option value="foot">Пешком</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Зона</label>
                <input
                  value={addForm.zone}
                  onChange={e => setAddForm(f => ({ ...f, zone: e.target.value }))}
                  placeholder="Москва ЦАО"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Тип договора</label>
                <select
                  value={addForm.contract}
                  onChange={e => setAddForm(f => ({ ...f, contract: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                >
                  <option value="gig">Гиг-контракт</option>
                  <option value="employment">Трудовой договор</option>
                  <option value="self_employed">Самозанятый</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm hover:bg-gray-50 transition-colors">Отмена</button>
                <button
                  onClick={() => {
                    if (!addForm.name || !addForm.phone) { toast.error('Заполните обязательные поля'); return; }
                    const newCourier = {
                      id: `crr-${Date.now()}`,
                      name: addForm.name,
                      phone: addForm.phone,
                      email: '',
                      avatar: addForm.name.split(' ').map(n => n[0] ?? '').join('').slice(0, 2).toUpperCase() || '??',
                      vehicle: addForm.vehicle,
                      zone: addForm.zone,
                      region: addForm.zone,
                      courier_type: addForm.type as CourierType,
                      status: 'offline' as CourierStatus,
                      activeOrders: 0,
                      completedToday: 0,
                      totalOrders: 0,
                      cancelRate: 0,
                      problemRate: 0,
                      rating: 5.0,
                      earningsToday: 0,
                      earningsTotal: 0,
                      blocked: false,
                      contractType: addForm.contract,
                      contractStatus: 'pending',
                      contractDate: new Date().toLocaleDateString('ru-RU'),
                      contractExpiry: '',
                      registeredAt: new Date().toLocaleDateString('ru-RU'),
                      lastOnline: 'только что',
                      gpsLat: 0, gpsLng: 0, gpsUpdated: '',
                      orders: [], tasks: [], shifts: [], dailyFinance: [],
                      documents: [], auditLog: [], chatHistory: [],
                    } as unknown as CourierExtra;
                    setExtraCouriers(prev => [newCourier, ...prev]);
                    setShowAddModal(false);
                    setAddForm({ name: '', phone: '', vehicle: 'bike', zone: 'Москва ЦАО', type: 'fast_delivery', contract: 'gig' });
                    toast.success('Курьер добавлен', { description: `${newCourier.name} — приглашение отправлено в приложение` });
                  }}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  Добавить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}