import { toast } from 'sonner';
import { exportToCsv } from '../../utils/downloads';
import { useState, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Cell, PieChart, Pie,
} from 'recharts';
import {
  MapPin, Truck, Clock, Route as RouteIcon, Bike, Package, AlertTriangle,
  CheckCircle2, ArrowUpRight, ArrowDownRight, RefreshCw,
  Activity, Navigation, Zap, TrendingUp, TrendingDown,
  Users, Timer, Target, Shield, ChevronRight, Search,
  MoreVertical, Eye, X, Check, Plus, Filter, Download,
  Building2, Store, Circle, CircleDot, Radio, Layers,
  Compass, Wind, CloudSnow, Thermometer, Sun, BarChart2,
} from 'lucide-react';
import { ChartWrapper } from '../../components/ui/ChartWrapper';

// ─── Types ────────────────────────────────────────────────────────────────────

type CourierStatus = 'active' | 'idle' | 'on_break' | 'offline' | 'returning';
type DeliveryStatus = 'pickup' | 'in_transit' | 'delivered' | 'failed' | 'returning';
type ZoneStatus = 'good' | 'overloaded' | 'shortage' | 'critical';

interface Courier {
  id: string;
  name: string;
  status: CourierStatus;
  zone: string;
  activeOrders: number;
  completedToday: number;
  avgTime: number;
  lat: number;
  lng: number;
  vehicle: 'bike' | 'ebike' | 'scooter' | 'car';
  battery?: number;
  rating: number;
}

interface DeliveryZone {
  id: string;
  name: string;
  status: ZoneStatus;
  couriers: number;
  couriersNeeded: number;
  activeDeliveries: number;
  avgWaitTime: number;
  successRate: number;
  ordersQueue: number;
}

interface DeliveryRoute {
  id: string;
  courierId: string;
  courierName: string;
  stops: number;
  completedStops: number;
  eta: string;
  distance: number;
  status: 'active' | 'delayed' | 'completed';
  delay?: number;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const COURIERS: Courier[] = [
  { id: 'c1',  name: 'Алексей К.',    status: 'active',    zone: 'ЦАО',       activeOrders: 3, completedToday: 12, avgTime: 28, lat: 55.75,  lng: 37.61,  vehicle: 'bike',    rating: 4.9 },
  { id: 'c2',  name: 'Михаил Д.',     status: 'active',    zone: 'СВАО',      activeOrders: 2, completedToday: 9,  avgTime: 31, lat: 55.82,  lng: 37.69,  vehicle: 'scooter', rating: 4.7 },
  { id: 'c3',  name: 'Олег В.',       status: 'idle',      zone: 'САО',       activeOrders: 0, completedToday: 7,  avgTime: 25, lat: 55.80,  lng: 37.55,  vehicle: 'bike',    battery: 72, rating: 4.8 },
  { id: 'c4',  name: 'Иван С.',       status: 'active',    zone: 'ЦАО',       activeOrders: 4, completedToday: 15, avgTime: 22, lat: 55.74,  lng: 37.63,  vehicle: 'ebike',   battery: 45, rating: 4.9 },
  { id: 'c5',  name: 'Сергей П.',     status: 'on_break',  zone: 'ВАО',       activeOrders: 0, completedToday: 8,  avgTime: 35, lat: 55.78,  lng: 37.78,  vehicle: 'scooter', rating: 4.5 },
  { id: 'c6',  name: 'Дмитрий Р.',   status: 'active',    zone: 'ЮЗАО',      activeOrders: 3, completedToday: 11, avgTime: 29, lat: 55.67,  lng: 37.55,  vehicle: 'car',     rating: 4.8 },
  { id: 'c7',  name: 'Артём Н.',      status: 'returning', zone: 'ЮАО',       activeOrders: 1, completedToday: 6,  avgTime: 38, lat: 55.65,  lng: 37.63,  vehicle: 'bike',    rating: 4.6 },
  { id: 'c8',  name: 'Тимур К.',      status: 'offline',   zone: '—',         activeOrders: 0, completedToday: 0,  avgTime: 0,  lat: 55.71,  lng: 37.58,  vehicle: 'ebike',   battery: 10, rating: 4.4 },
  { id: 'c9',  name: 'Владимир А.',   status: 'active',    zone: 'СЗАО',      activeOrders: 2, completedToday: 10, avgTime: 26, lat: 55.79,  lng: 37.45,  vehicle: 'scooter', rating: 4.7 },
  { id: 'c10', name: 'Евгений Б.',    status: 'active',    zone: 'ЗАО',       activeOrders: 3, completedToday: 13, avgTime: 24, lat: 55.72,  lng: 37.48,  vehicle: 'car',     rating: 4.9 },
];

const ZONES: DeliveryZone[] = [
  { id: 'z1', name: 'ЦАО — Центр',       status: 'overloaded', couriers: 8,  couriersNeeded: 12, activeDeliveries: 89,  avgWaitTime: 42, successRate: 91.2, ordersQueue: 34 },
  { id: 'z2', name: 'СВАО — Марьина Роща', status: 'good',     couriers: 12, couriersNeeded: 10, activeDeliveries: 67,  avgWaitTime: 28, successRate: 95.8, ordersQueue: 8 },
  { id: 'z3', name: 'САО — Тимирязевский', status: 'shortage', couriers: 3,  couriersNeeded: 7,  activeDeliveries: 41,  avgWaitTime: 56, successRate: 88.4, ordersQueue: 22 },
  { id: 'z4', name: 'ВАО — Сокольники',   status: 'good',     couriers: 9,  couriersNeeded: 8,  activeDeliveries: 54,  avgWaitTime: 31, successRate: 94.1, ordersQueue: 5 },
  { id: 'z5', name: 'ЮЗАО — Ленинский',   status: 'good',     couriers: 7,  couriersNeeded: 7,  activeDeliveries: 48,  avgWaitTime: 33, successRate: 93.7, ordersQueue: 11 },
  { id: 'z6', name: 'ЮАО — Чертаново',    status: 'critical', couriers: 2,  couriersNeeded: 8,  activeDeliveries: 37,  avgWaitTime: 78, successRate: 82.1, ordersQueue: 45 },
  { id: 'z7', name: 'СЗАО — Строгино',    status: 'good',     couriers: 6,  couriersNeeded: 6,  activeDeliveries: 32,  avgWaitTime: 27, successRate: 96.3, ordersQueue: 3 },
  { id: 'z8', name: 'ЗАО — Кунцево',      status: 'good',     couriers: 8,  couriersNeeded: 7,  activeDeliveries: 43,  avgWaitTime: 29, successRate: 95.1, ordersQueue: 6 },
];

const ROUTES_DATA: DeliveryRoute[] = [
  { id: 'r1', courierId: 'c1',  courierName: 'Алексей К.',  stops: 5, completedStops: 3, eta: '14:45', distance: 12.4, status: 'active' },
  { id: 'r2', courierId: 'c2',  courierName: 'Михаил Д.',   stops: 4, completedStops: 2, eta: '15:10', distance: 9.8,  status: 'active' },
  { id: 'r3', courierId: 'c4',  courierName: 'Иван С.',     stops: 6, completedStops: 4, eta: '14:30', distance: 8.2,  status: 'active' },
  { id: 'r4', courierId: 'c6',  courierName: 'Дмитрий Р.', stops: 4, completedStops: 1, eta: '15:45', distance: 14.1, status: 'delayed', delay: 18 },
  { id: 'r5', courierId: 'c7',  courierName: 'Артём Н.',   stops: 3, completedStops: 2, eta: '14:55', distance: 7.6,  status: 'active' },
  { id: 'r6', courierId: 'c9',  courierName: 'Владимир А.',stops: 5, completedStops: 3, eta: '15:05', distance: 11.3, status: 'active' },
  { id: 'r7', courierId: 'c10', courierName: 'Евгений Б.', stops: 7, completedStops: 5, eta: '14:40', distance: 13.7, status: 'delayed', delay: 9 },
];

const THROUGHPUT_HOURLY = [
  { hour: '08',  delivered: 45,  failed: 3,  queue: 67  },
  { hour: '09',  delivered: 89,  failed: 5,  queue: 112 },
  { hour: '10',  delivered: 134, failed: 8,  queue: 178 },
  { hour: '11',  delivered: 167, failed: 9,  queue: 203 },
  { hour: '12',  delivered: 212, failed: 14, queue: 289 },
  { hour: '13',  delivered: 243, failed: 16, queue: 312 },
  { hour: '14',  delivered: 198, failed: 11, queue: 267 },
];

const VEHICLE_MIX = [
  { name: 'Велосипед',  value: 34, color: '#3B82F6', fill: '#3B82F6' },
  { name: 'E-байк',     value: 28, color: '#10B981', fill: '#10B981' },
  { name: 'Самокат',    value: 24, color: '#F59E0B', fill: '#F59E0B' },
  { name: 'Автомобиль', value: 14, color: '#8B5CF6', fill: '#8B5CF6' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const COURIER_STATUS_CFG: Record<CourierStatus, { label: string; color: string; bg: string; dot: string }> = {
  active:    { label: 'В доставке', color: 'text-green-700',  bg: 'bg-green-50',  dot: 'bg-green-500' },
  idle:      { label: 'Свободен',   color: 'text-blue-700',   bg: 'bg-blue-50',   dot: 'bg-blue-400' },
  on_break:  { label: 'Перерыв',    color: 'text-yellow-700', bg: 'bg-yellow-50', dot: 'bg-yellow-400' },
  offline:   { label: 'Офлайн',     color: 'text-gray-500',   bg: 'bg-gray-50',   dot: 'bg-gray-300' },
  returning: { label: 'Возврат',    color: 'text-indigo-700', bg: 'bg-indigo-50', dot: 'bg-indigo-400' },
};

const ZONE_CFG: Record<ZoneStatus, { label: string; color: string; bg: string; border: string; dot: string }> = {
  good:       { label: 'Норма',       color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200', dot: 'bg-green-500' },
  overloaded: { label: 'Перегрузка',  color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200',dot: 'bg-orange-500' },
  shortage:   { label: 'Нехватка',    color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200',dot: 'bg-yellow-400' },
  critical:   { label: 'Критично',    color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200',   dot: 'bg-red-500' },
};

const VEHICLE_ICON: Record<string, string> = {
  bike: '🚲', ebike: '⚡', scooter: '🛵', car: '🚗',
};

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white rounded-xl px-3 py-2.5 shadow-xl text-xs space-y-1 border border-gray-700">
      <p className="text-gray-400 font-medium mb-1.5">{label}:00</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-gray-300">{p.name}:</span>
          <span className="font-bold ml-auto">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function LogisticsDashboard() {
  const [tab, setTab] = useState<'overview' | 'couriers' | 'zones' | 'routes'>('overview');
  const [courierSearch, setCourierSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CourierStatus | 'all'>('all');
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [zones, setZones]       = useState(ZONES);
  const [routes, setRoutes]     = useState<DeliveryRoute[]>(ROUTES_DATA);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);
  const [viewingRoute, setViewingRoute] = useState<DeliveryRoute | null>(null);

  const stats = useMemo(() => {
    const activeCouriers = COURIERS.filter(c => c.status === 'active').length;
    const idleCouriers   = COURIERS.filter(c => c.status === 'idle').length;
    const totalOrders    = COURIERS.reduce((s, c) => s + c.activeOrders, 0);
    const totalDelivered = COURIERS.reduce((s, c) => s + c.completedToday, 0);
    const criticalZones  = zones.filter(z => z.status === 'critical' || z.status === 'shortage').length;
    const avgWaitTime    = Math.round(zones.reduce((s, z) => s + z.avgWaitTime, 0) / zones.length);
    const delayedRoutes  = routes.filter(r => r.status === 'delayed').length;
    return { activeCouriers, idleCouriers, totalOrders, totalDelivered, criticalZones, avgWaitTime, delayedRoutes };
  }, [zones, routes]);

  const filteredCouriers = useMemo(() => {
    let list = COURIERS;
    if (statusFilter !== 'all') list = list.filter(c => c.status === statusFilter);
    if (courierSearch) {
      const q = courierSearch.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || c.zone.toLowerCase().includes(q));
    }
    return list;
  }, [statusFilter, courierSearch]);

  const tabs = [
    { id: 'overview' as const, label: 'Обзор',    icon: BarChart2 },
    { id: 'couriers' as const, label: 'Курьеры',  icon: Bike, badge: stats.activeCouriers },
    { id: 'zones'    as const, label: 'Зоны',     icon: MapPin, badge: stats.criticalZones > 0 ? stats.criticalZones : undefined, badgeCritical: true },
    { id: 'routes'   as const, label: 'Маршруты', icon: RouteIcon, badge: stats.delayedRoutes > 0 ? stats.delayedRoutes : undefined, badgeCritical: true },
  ];

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Логистика</h1>
          <p className="text-sm text-gray-500 mt-0.5">Мониторинг флота, зон и маршрутов в реальном времени</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-xl text-xs font-semibold text-green-700">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />Live
          </div>
          <button
            onClick={() => {
              setRefreshedAt(new Date());
              toast.success('Данные обновлены', { description: 'Синхронизация с флотом выполнена' });
            }}
            title={refreshedAt ? `Обновлено в ${refreshedAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : undefined}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 rounded-xl text-xs font-medium transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />Обновить{refreshedAt && <span className="text-[10px] text-gray-400 ml-1">{refreshedAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>}
          </button>
          <button
            onClick={() => {
              exportToCsv(COURIERS as any[], [
                { key: 'id',             label: 'ID' },
                { key: 'name',           label: 'Имя' },
                { key: 'phone',          label: 'Телефон' },
                { key: 'zone',           label: 'Зона' },
                { key: 'status',         label: 'Статус' },
                { key: 'activeOrders',   label: 'Активные заказы' },
                { key: 'completedToday', label: 'Доставлено сегодня' },
                { key: 'rating',         label: 'Рейтинг' },
              ], 'couriers-logistics');
              toast.success(`Скачан CSV: ${COURIERS.length} курьеров`);
            }}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 rounded-xl text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5" />Экспорт
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        {([
          { label: 'Активных курьеров', value: stats.activeCouriers, total: COURIERS.length, color: 'text-green-700', bg: 'bg-green-50', icon: Bike,         tabTarget: 'couriers' as const },
          { label: 'Свободных',         value: stats.idleCouriers,   total: COURIERS.length, color: 'text-blue-700',  bg: 'bg-blue-50',  icon: Users,        tabTarget: 'couriers' as const },
          { label: 'Активных заказов',  value: stats.totalOrders,    total: null,            color: 'text-orange-700',bg: 'bg-orange-50',icon: Package,      tabTarget: 'overview' as const },
          { label: 'Доставлено сегодня',value: stats.totalDelivered, total: null,            color: 'text-teal-700',  bg: 'bg-teal-50',  icon: CheckCircle2, tabTarget: 'overview' as const },
          { label: 'Активных маршрутов',value: ROUTES_DATA.filter(r=>r.status!=='completed').length, total: null, color: 'text-purple-700', bg: 'bg-purple-50', icon: RouteIcon, tabTarget: 'routes' as const },
          { label: 'Ср. ожидание',      value: `${stats.avgWaitTime} мин`, total: null,      color: stats.avgWaitTime > 40 ? 'text-red-700' : 'text-gray-700', bg: stats.avgWaitTime > 40 ? 'bg-red-50' : 'bg-gray-50', icon: Clock, tabTarget: 'overview' as const },
          { label: 'Проблемных зон',    value: stats.criticalZones,  total: zones.length,   color: stats.criticalZones > 0 ? 'text-red-700' : 'text-green-700', bg: stats.criticalZones > 0 ? 'bg-red-50' : 'bg-green-50', icon: AlertTriangle, tabTarget: 'zones' as const },
        ] as const).map((s, i) => {
          const Icon = s.icon;
          return (
            <button
              key={i}
              onClick={() => setTab(s.tabTarget)}
              className={`bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-3 text-left hover:shadow-md hover:border-blue-200 transition-all active:scale-[0.98] cursor-pointer ${tab === s.tabTarget ? 'ring-2 ring-blue-200 border-blue-300' : ''}`}
            >
              <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center shrink-0`}>
                <Icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <div className="min-w-0">
                <p className={`font-black text-lg leading-tight ${s.color}`}>
                  {s.value}{s.total !== null ? `/${s.total}` : ''}
                </p>
                <p className="text-[10px] text-gray-400 leading-tight mt-0.5">{s.label}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Alerts */}
      {stats.criticalZones > 0 && (
        <div className="flex items-center gap-3 p-3.5 bg-red-50 border border-red-200 rounded-2xl">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-red-800">Критическая ситуация в {stats.criticalZones} зонах!</p>
            <p className="text-xs text-red-600 mt-0.5">
              {zones.filter(z => z.status === 'critical').map(z => z.name).join(' · ')} — требуется перераспределение курьеров
            </p>
          </div>
          <button onClick={() => setTab('zones')}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors shrink-0">
            Управлять зонами
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-sm font-medium transition-colors ${
                tab === t.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              <Icon className="w-4 h-4" />
              {t.label}
              {t.badge !== undefined && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                  t.badgeCritical ? 'bg-red-500 text-white' : 'bg-blue-100 text-blue-700'
                }`}>{t.badge}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === 'overview' && (
        <div className="space-y-5">
          {/* Charts row */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            {/* Throughput chart */}
            <div className="xl:col-span-2 bg-white border border-gray-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-bold text-gray-900">Пропускная способность по часам</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Доставки, сбои и очередь за сегодня</p>
                </div>
              </div>
              {/* Custom CSS grouped bar chart — avoids recharts duplicate-key bug with multiple Bar series */}
              {(() => {
                const maxVal = Math.max(...THROUGHPUT_HOURLY.map(d => Math.max(d.delivered, d.queue)));
                return (
                  <div className="h-60 flex flex-col">
                    <div className="flex items-end gap-1.5 flex-1 px-1">
                      {THROUGHPUT_HOURLY.map((d) => (
                        <div key={d.hour} className="flex-1 flex items-end gap-0.5 h-full">
                          <div className="flex-1 flex flex-col justify-end gap-0.5">
                            <div className="rounded-t-sm bg-emerald-500 transition-all" style={{ height: `${(d.delivered / maxVal) * 100}%` }} title={`Доставлено: ${d.delivered}`} />
                          </div>
                          <div className="flex-1 flex flex-col justify-end">
                            <div className="rounded-t-sm bg-red-400 transition-all" style={{ height: `${(d.failed / maxVal) * 100}%` }} title={`Сбои: ${d.failed}`} />
                          </div>
                          <div className="flex-1 flex flex-col justify-end">
                            <div className="rounded-t-sm bg-blue-300 transition-all" style={{ height: `${(d.queue / maxVal) * 100}%` }} title={`В очереди: ${d.queue}`} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 px-1">
                      {THROUGHPUT_HOURLY.map((d) => (
                        <div key={d.hour} className="flex-1 text-center text-[9px] text-gray-400">{d.hour}:00</div>
                      ))}
                    </div>
                  </div>
                );
              })()}
              <div className="flex items-center gap-4 mt-3 text-xs">
                {[{c:'bg-emerald-500',l:'Доставлено'},{c:'bg-red-400',l:'Сбои'},{c:'bg-blue-300',l:'В очереди'}].map((x,i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-sm ${x.c}`} />
                    <span className="text-gray-500">{x.l}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Vehicle mix */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <h2 className="font-bold text-gray-900 mb-4">Состав флота</h2>
              <ChartWrapper height={180}>
                {(w, h) => (
                  <PieChart width={w} height={h}>
                    <Pie
                      data={VEHICLE_MIX}
                      dataKey="value"
                      cx={w/2}
                      cy={h/2}
                      innerRadius={50}
                      outerRadius={74}
                      paddingAngle={3}
                      isAnimationActive={false}
                    />
                    <Tooltip formatter={(v: any) => `${v}%`} contentStyle={{ borderRadius: 10, fontSize: 11 }} />
                  </PieChart>
                )}
              </ChartWrapper>
              <div className="space-y-2 mt-2">
                {VEHICLE_MIX.map((v, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-sm">{VEHICLE_ICON[v.name === 'Велосипед' ? 'bike' : v.name === 'E-байк' ? 'ebike' : v.name === 'Самокат' ? 'scooter' : 'car']}</span>
                    <span className="text-xs text-gray-600 flex-1">{v.name}</span>
                    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${v.value}%`, background: v.color }} />
                    </div>
                    <span className="text-xs font-bold text-gray-900 w-8 text-right">{v.value}%</span>
                  </div>
                ))}
              </div>
              {/* Fleet health */}
              <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-2 text-center">
                {[
                  { label: 'Онлайн', value: COURIERS.filter(c=>c.status!=='offline').length, color: 'text-green-600' },
                  { label: 'Офайн', value: COURIERS.filter(c=>c.status==='offline').length,  color: 'text-gray-500' },
                ].map((s,i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-2">
                    <p className={`font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-[10px] text-gray-400">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Map placeholder + Zone status summary */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            {/* Map */}
            <div className="xl:col-span-2 bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-blue-600" />
                  <h2 className="font-bold text-gray-900">Карта курьеров — Москва</h2>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="flex items-center gap-1 text-green-600"><div className="w-2 h-2 bg-green-500 rounded-full" />{stats.activeCouriers} в доставке</span>
                  <span className="flex items-center gap-1 text-blue-600"><div className="w-2 h-2 bg-blue-400 rounded-full" />{stats.idleCouriers} свободны</span>
                </div>
              </div>
              {/* Map visualization (grid-based heatmap) */}
              <div className="relative bg-slate-50 h-72 overflow-hidden">
                {/* Grid background */}
                <div className="absolute inset-0" style={{
                  backgroundImage: 'linear-gradient(#E5E7EB 1px, transparent 1px), linear-gradient(90deg, #E5E7EB 1px, transparent 1px)',
                  backgroundSize: '40px 40px',
                }} />
                {/* Zone heat circles */}
                {[
                  { x: '48%', y: '44%', r: 60, status: 'overloaded', label: 'ЦАО', couriers: 8 },
                  { x: '62%', y: '25%', r: 45, status: 'good',       label: 'СВАО',couriers: 12 },
                  { x: '42%', y: '22%', r: 40, status: 'shortage',   label: 'САО', couriers: 3 },
                  { x: '72%', y: '40%', r: 40, status: 'good',       label: 'ВАО', couriers: 9 },
                  { x: '38%', y: '65%', r: 42, status: 'good',       label: 'ЮЗАО',couriers: 7 },
                  { x: '55%', y: '75%', r: 38, status: 'critical',   label: 'ЮАО', couriers: 2 },
                  { x: '25%', y: '35%', r: 36, status: 'good',       label: 'СЗАО',couriers: 6 },
                  { x: '28%', y: '55%', r: 38, status: 'good',       label: 'ЗАО', couriers: 8 },
                ].map((z, i) => {
                  const colors: Record<string, string> = {
                    good: 'rgba(16,185,129,0.15)',
                    overloaded: 'rgba(249,115,22,0.2)',
                    shortage: 'rgba(234,179,8,0.2)',
                    critical: 'rgba(239,68,68,0.25)',
                  };
                  const borderColors: Record<string, string> = {
                    good: '#10B981', overloaded: '#F97316', shortage: '#EAB308', critical: '#EF4444',
                  };
                  return (
                    <div key={i} className="absolute flex items-center justify-center"
                      style={{
                        left: z.x, top: z.y,
                        width: z.r * 2, height: z.r * 2,
                        transform: 'translate(-50%,-50%)',
                        background: colors[z.status],
                        border: `2px solid ${borderColors[z.status]}`,
                        borderRadius: '50%',
                      }}>
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-gray-700">{z.label}</p>
                        <p className="text-[9px] text-gray-500">{z.couriers} кур.</p>
                      </div>
                    </div>
                  );
                })}
                {/* Courier dots */}
                {COURIERS.filter(c => c.status !== 'offline').slice(0, 8).map((c, i) => {
                  const positions = [
                    { x: '50%', y: '42%' }, { x: '63%', y: '28%' }, { x: '44%', y: '24%' },
                    { x: '52%', y: '48%' }, { x: '68%', y: '45%' }, { x: '40%', y: '68%' },
                    { x: '56%', y: '78%' }, { x: '27%', y: '38%' },
                  ];
                  const pos = positions[i];
                  const dotColor: Record<CourierStatus, string> = {
                    active: '#10B981', idle: '#3B82F6', on_break: '#F59E0B', offline: '#9CA3AF', returning: '#8B5CF6',
                  };
                  return (
                    <div key={c.id} className="absolute w-4 h-4 rounded-full border-2 border-white shadow-md flex items-center justify-center"
                      style={{ left: pos.x, top: pos.y, transform: 'translate(-50%,-50%)', background: dotColor[c.status] }}
                      title={c.name}>
                    </div>
                  );
                })}
                {/* Legend */}
                <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-xl p-2.5 border border-gray-200 shadow-sm">
                  <div className="space-y-1">
                    {[
                      { c: '#10B981', l: 'Норма' },
                      { c: '#F97316', l: 'Перегрузка' },
                      { c: '#EAB308', l: 'Нехватка' },
                      { c: '#EF4444', l: 'Критично' },
                    ].map((x, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[10px] text-gray-600">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: x.c }} />
                        {x.l}
                      </div>
                    ))}
                  </div>
                </div>
                {/* Integration notice */}
                <div className="absolute top-3 right-3 bg-blue-50 border border-blue-200 rounded-xl px-2.5 py-1.5 text-[10px] text-blue-700 font-medium">
                  Интеграция: Яндекс.Карты API
                </div>
              </div>
            </div>

            {/* Zone alerts */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-900">Статус зон</h2>
                <button onClick={() => setTab('zones')} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                  Все зоны →
                </button>
              </div>
              <div className="space-y-2.5">
                {[...zones].sort((a, b) => {
                  const p: Record<ZoneStatus, number> = { critical: 0, shortage: 1, overloaded: 2, good: 3 };
                  return p[a.status] - p[b.status];
                }).slice(0, 6).map((z, i) => {
                  const cfg = ZONE_CFG[z.status];
                  const coverage = Math.round((z.couriers / z.couriersNeeded) * 100);
                  return (
                    <div key={i} className={`p-3 rounded-xl border ${cfg.border} ${cfg.bg}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                          <p className="text-xs font-semibold text-gray-800 truncate">{z.name}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${cfg.bg} ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500">
                        <span>{z.couriers}/{z.couriersNeeded} курьеров</span>
                        <span>·</span>
                        <span>⏱ {z.avgWaitTime} мин</span>
                      </div>
                      <div className="mt-1.5 h-1.5 bg-white/60 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            coverage >= 100 ? 'bg-green-500' : coverage >= 70 ? 'bg-yellow-400' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(coverage, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── COURIERS TAB ── */}
      {tab === 'couriers' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input value={courierSearch} onChange={e => setCourierSearch(e.target.value)}
                placeholder="Поиск по имени или зоне..."
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-56" />
            </div>
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
              {(['all','active','idle','on_break','returning','offline'] as (CourierStatus|'all')[]).map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    statusFilter === s ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}>
                  {s === 'all' ? 'Все' : COURIER_STATUS_CFG[s].label}
                </button>
              ))}
            </div>
            <span className="text-xs text-gray-400 ml-auto">{filteredCouriers.length} курьеров</span>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 grid grid-cols-12 gap-4 text-xs font-semibold text-gray-500">
              <span className="col-span-3">Курьер</span>
              <span className="col-span-2">Статус</span>
              <span className="col-span-1 text-center">Заказы</span>
              <span className="col-span-1 text-center">Сегодня</span>
              <span className="col-span-2 text-center">Ср. время</span>
              <span className="col-span-1 text-center">Рейтинг</span>
              <span className="col-span-2">Транспорт</span>
            </div>
            <div className="divide-y divide-gray-50">
              {filteredCouriers.map(c => {
                const stCfg = COURIER_STATUS_CFG[c.status];
                return (
                  <div key={c.id} className={`grid grid-cols-12 gap-4 items-center px-4 py-3 hover:bg-gray-50 transition-colors ${c.status === 'offline' ? 'opacity-60' : ''}`}>
                    <div className="col-span-3">
                      <div className="flex items-center gap-2.5">
                        <div className="relative w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {c.name.slice(0,2)}
                          <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${stCfg.dot}`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{c.name}</p>
                          <p className="text-xs text-gray-400">{c.zone}</p>
                        </div>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg ${stCfg.bg} ${stCfg.color}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${stCfg.dot}`} />
                        {stCfg.label}
                      </span>
                    </div>
                    <div className="col-span-1 text-center">
                      {c.activeOrders > 0 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">{c.activeOrders}</span>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </div>
                    <div className="col-span-1 text-center">
                      <span className="text-sm font-semibold text-teal-700">{c.completedToday}</span>
                    </div>
                    <div className="col-span-2 text-center">
                      {c.avgTime > 0 ? (
                        <span className={`text-xs font-semibold ${c.avgTime > 35 ? 'text-red-600' : c.avgTime > 28 ? 'text-orange-600' : 'text-green-600'}`}>
                          {c.avgTime} мин
                        </span>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </div>
                    <div className="col-span-1 text-center">
                      <span className="text-xs font-bold text-orange-600">{c.rating}⭐</span>
                    </div>
                    <div className="col-span-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{VEHICLE_ICON[c.vehicle]}</span>
                        {c.battery !== undefined && (
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                            c.battery > 50 ? 'bg-green-100 text-green-700' :
                            c.battery > 20 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>{c.battery}%⚡</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── ZONES TAB ── */}
      {tab === 'zones' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...zones].sort((a, b) => {
              const p: Record<ZoneStatus, number> = { critical: 0, shortage: 1, overloaded: 2, good: 3 };
              return p[a.status] - p[b.status];
            }).map(z => {
              const cfg = ZONE_CFG[z.status];
              const coverage = Math.round((z.couriers / z.couriersNeeded) * 100);
              return (
                <div key={z.id} className={`bg-white border rounded-2xl p-5 ${z.status === 'critical' ? 'border-red-300 shadow-md shadow-red-50' : 'border-gray-200'}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot} ${z.status === 'critical' ? 'animate-pulse' : ''}`} />
                        <h3 className="font-bold text-gray-900">{z.name}</h3>
                      </div>
                      <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                    </div>
                    {(z.status === 'critical' || z.status === 'shortage') && (
                      <button
                        onClick={() => {
                          const need = z.couriersNeeded - z.couriers;
                          setZones(prev => prev.map(x => x.id === z.id
                            ? { ...x, couriers: x.couriersNeeded, status: 'normal', avgWaitTime: Math.max(15, x.avgWaitTime - 10) }
                            : x));
                          toast.success(`Зона ${z.name}: ${need} курьеров направлено`, { description: 'Покрытие восстановлено до 100%' });
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors">
                        <Navigation className="w-3 h-3" />Перенаправить
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      { label: 'Курьеров', value: `${z.couriers}/${z.couriersNeeded}`, color: coverage >= 100 ? 'text-green-700' : coverage >= 70 ? 'text-yellow-700' : 'text-red-700' },
                      { label: 'Доставок', value: z.activeDeliveries, color: 'text-blue-700' },
                      { label: 'Очередь',  value: z.ordersQueue, color: z.ordersQueue > 20 ? 'text-red-700' : 'text-gray-700' },
                    ].map((s, i) => (
                      <div key={i} className="text-center p-2.5 bg-gray-50 rounded-xl">
                        <p className={`font-black text-lg ${s.color}`}>{s.value}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-500">Покрытие курьерами</span>
                        <span className={`font-bold ${coverage >= 100 ? 'text-green-600' : coverage >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>{coverage}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${coverage >= 100 ? 'bg-green-500' : coverage >= 70 ? 'bg-yellow-400' : 'bg-red-500'}`}
                          style={{ width: `${Math.min(coverage, 100)}%` }} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Ср. ожидание: <span className={`font-bold ml-1 ${z.avgWaitTime > 50 ? 'text-red-600' : z.avgWaitTime > 35 ? 'text-orange-600' : 'text-green-600'}`}>{z.avgWaitTime} мин</span></span>
                      <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Успех: <span className="font-bold ml-1 text-gray-800">{z.successRate}%</span></span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ROUTES TAB ── */}
      {tab === 'routes' && (
        <div className="space-y-4">
          {stats.delayedRoutes > 0 && (
            <div className="p-3.5 bg-orange-50 border border-orange-200 rounded-xl flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0" />
              <p className="text-sm font-medium text-orange-800">
                {stats.delayedRoutes} маршрутов с задержкой — требуют оперативного вмешательства
              </p>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Активные маршруты</h2>
              <span className="text-xs text-gray-400">{routes.filter(r=>r.status!=='completed').length} активных</span>
            </div>
            <div className="divide-y divide-gray-50">
              {routes.map(r => (
                <div key={r.id} className={`px-5 py-4 hover:bg-gray-50 transition-colors ${r.status === 'delayed' ? 'bg-orange-50/40' : ''}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        r.status === 'delayed' ? 'bg-orange-100' : 'bg-blue-50'
                      }`}>
                        <RouteIcon className={`w-4 h-4 ${r.status === 'delayed' ? 'text-orange-600' : 'text-blue-600'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-900">{r.courierName}</p>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            r.status === 'delayed' ? 'bg-orange-100 text-orange-700' :
                            r.status === 'active' ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {r.status === 'delayed' ? `⚠️ Задержка +${r.delay} мин` : r.status === 'active' ? '▶ Активен' : '✓ Завершён'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {r.stops} остановок · {r.distance} км · ETA: {r.eta}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {r.status === 'delayed' && (
                        <button
                          onClick={() => {
                            setRoutes(prev => prev.map(x => x.id === r.id ? { ...x, status: 'active', delay: 0 } : x));
                            toast.success(`Маршрут перестроен`, { description: `Оптимальный маршрут для ${r.courierName} рассчитан, задержка снята` });
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-semibold transition-colors">
                          <Navigation className="w-3 h-3" />Перестроить
                        </button>
                      )}
                      <button
                        onClick={() => setViewingRoute(r)}
                        className="p-1.5 hover:bg-gray-100 text-gray-400 rounded-lg">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-3 ml-12">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-gray-500">{r.completedStops} из {r.stops} остановок</span>
                      <span className="text-gray-500">{Math.round((r.completedStops/r.stops)*100)}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${r.status === 'delayed' ? 'bg-orange-500' : 'bg-blue-500'}`}
                        style={{ width: `${(r.completedStops/r.stops)*100}%` }} />
                    </div>
                    {/* Stop indicators */}
                    <div className="flex items-center gap-1 mt-1.5">
                      {Array.from({ length: r.stops }, (_, i) => (
                        <div key={i} className={`flex-1 h-1 rounded-full ${
                          i < r.completedStops
                            ? r.status === 'delayed' ? 'bg-orange-400' : 'bg-blue-500'
                            : 'bg-gray-200'
                        }`} />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Route efficiency summary */}
          <div className="bg-gradient-to-br from-slate-900 to-blue-950 rounded-2xl p-5 text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
                <Target className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-bold">Эффективность маршрутизации</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Ср. остановок/маршрут', value: (ROUTES_DATA.reduce((s,r)=>s+r.stops,0)/ROUTES_DATA.length).toFixed(1), icon: MapPin },
                { label: 'Ср. дистанция',          value: `${(ROUTES_DATA.reduce((s,r)=>s+r.distance,0)/ROUTES_DATA.length).toFixed(1)} км`, icon: RouteIcon },
                { label: 'Маршрутов с задержкой',  value: `${stats.delayedRoutes}/${ROUTES_DATA.length}`, icon: AlertTriangle },
                { label: 'Выполнено за сегодня',   value: '89', icon: CheckCircle2 },
              ].map((s, i) => {
                const Icon = s.icon;
                return (
                  <button
                    key={i}
                    onClick={() => { setTab('routes'); toast.info(s.label, { description: String(s.value) }); }}
                    className="bg-white/10 rounded-xl p-3.5 text-left cursor-pointer hover:bg-white/20 active:scale-[0.97] transition-all"
                  >
                    <Icon className="w-4 h-4 text-blue-300 mb-2" />
                    <p className="text-xl font-black text-white">{s.value}</p>
                    <p className="text-[10px] text-blue-300 mt-0.5">{s.label}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {viewingRoute && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm" onClick={() => setViewingRoute(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <p className="font-bold text-gray-900">Маршрут {viewingRoute.courierId}</p>
              <button onClick={() => setViewingRoute(null)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-2 text-sm">
              <div className="flex justify-between border-b border-gray-50 pb-2"><span className="text-gray-500">Курьер</span><span className="font-semibold text-gray-900">{viewingRoute.courierName}</span></div>
              <div className="flex justify-between border-b border-gray-50 pb-2"><span className="text-gray-500">Остановки</span><span className="font-semibold text-gray-900">{viewingRoute.completedStops} / {viewingRoute.stops}</span></div>
              <div className="flex justify-between border-b border-gray-50 pb-2"><span className="text-gray-500">Дистанция</span><span className="font-semibold text-gray-900">{viewingRoute.distance} км</span></div>
              <div className="flex justify-between border-b border-gray-50 pb-2"><span className="text-gray-500">ETA</span><span className="font-semibold text-gray-900">{viewingRoute.eta}</span></div>
              <div className="flex justify-between border-b border-gray-50 pb-2"><span className="text-gray-500">Статус</span><span className="font-semibold text-gray-900">{viewingRoute.status === 'delayed' ? `Задержка +${viewingRoute.delay} мин` : viewingRoute.status === 'active' ? 'Активен' : 'Завершён'}</span></div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end">
              <button onClick={() => setViewingRoute(null)} className="py-2 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold">Закрыть</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}