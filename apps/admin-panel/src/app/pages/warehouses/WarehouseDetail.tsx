import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft, Package, Truck, Users, History, Settings, Download,
  Search, Plus, AlertCircle, CheckCircle2, Clock, ArrowUpRight,
  ArrowDownLeft, Activity, BarChart2, RefreshCw, X, Check,
  ChevronDown, Warehouse, Grid3X3 as Grid3x3, TrendingUp, Filter, Eye,
  QrCode, Boxes, Layers, ScanLine, RotateCcw, Archive,
  DollarSign, Target, Zap, FileText, Upload, Printer, Shield,
} from 'lucide-react';
import { ChartWrapper } from '../../components/ui/ChartWrapper';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { DocumentViewerModal, type DocumentRecord, type DocumentContent } from '../../components/ui/DocumentViewer';
import ReactDOM from 'react-dom';

// ─── Types ──────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'inventory' | 'inbound' | 'outbound' | 'staff' | 'documents' | 'audit';

interface WarehouseInfo {
  id: string; code: string; name: string; city: string;
  type: 'hub' | 'warehouse' | 'dark_store'; status: 'active' | 'maintenance';
  capacity: number; currentLoad: number;
  address: string; phone: string; manager: string;
  inboundToday: number; outboundToday: number; pickingInProgress: number;
  zones: number; staff: number; temperature: string;
}

interface InventoryItem {
  id: string; sku: string; name: string; category: string;
  qty: number; reserved: number; available: number;
  cell: string; weight: number; lastMovement: string;
}

interface InboundShipment {
  id: string; manifest: string; from: string;
  items: number; status: 'expected' | 'in_progress' | 'completed' | 'overdue';
  expectedAt: string; arrivedAt?: string; operator?: string;
}

interface OutboundTask {
  id: string; orderId: string; customerName: string;
  items: number; destination: string; courier?: string;
  status: 'queued' | 'picking' | 'packed' | 'dispatched';
  priority: 'normal' | 'express' | 'sla_breach';
  createdAt: string;
}

interface StaffMember {
  id: string; name: string; role: string; shift: string;
  zone: string; tasksToday: number; status: 'working' | 'break' | 'offline';
}

interface AuditEntry {
  id: string; time: string; actor: string; action: string; details: string;
  type: 'info' | 'ok' | 'warn' | 'danger';
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const WAREHOUSES: Record<string, WarehouseInfo> = {
  '1': { id: '1', code: 'MSK-WH-01', name: 'Московский хаб', city: 'Москва', type: 'hub', status: 'active', capacity: 10000, currentLoad: 7450, address: 'Промышленная ул., 12', phone: '+7 (495) 800-11-22', manager: 'Соколов В.Д.', inboundToday: 234, outboundToday: 312, pickingInProgress: 45, zones: 6, staff: 28, temperature: '18-22°C' },
  '2': { id: '2', code: 'SPB-WH-01', name: 'Петербургский склад', city: 'Санкт-Петербург', type: 'warehouse', status: 'active', capacity: 5000, currentLoad: 3200, address: 'Складская ул., 7', phone: '+7 (812) 800-33-44', manager: 'Морозова Т.К.', inboundToday: 123, outboundToday: 156, pickingInProgress: 23, zones: 4, staff: 16, temperature: '16-20°C' },
  '3': { id: '3', code: 'MSK-DS-01', name: 'Дарк-стор Центр', city: 'Москва', type: 'dark_store', status: 'active', capacity: 2000, currentLoad: 1890, address: 'Тверская ул., 45', phone: '+7 (495) 800-55-66', manager: 'Крылов А.С.', inboundToday: 89, outboundToday: 134, pickingInProgress: 12, zones: 3, staff: 10, temperature: '2-6°C (охлажд.), 18-22°C' },
};

const INVENTORY: InventoryItem[] = [
  { id: '1', sku: 'SKU-001', name: 'Смартфон Galaxy A54', category: 'Электроника', qty: 120, reserved: 34, available: 86, cell: 'A-01-03', weight: 0.2, lastMovement: '14.03.2026 09:12' },
  { id: '2', sku: 'SKU-002', name: 'Ноутбук ProBook', category: 'Электроника', qty: 45, reserved: 12, available: 33, cell: 'A-02-01', weight: 1.8, lastMovement: '14.03.2026 08:45' },
  { id: '3', sku: 'SKU-003', name: 'Футболка (M)', category: 'Одежда', qty: 340, reserved: 80, available: 260, cell: 'B-01-05', weight: 0.2, lastMovement: '13.03.2026 17:30' },
  { id: '4', sku: 'SKU-004', name: 'Кроссовки Nike 42', category: 'Обувь', qty: 68, reserved: 20, available: 48, cell: 'B-03-02', weight: 0.8, lastMovement: '13.03.2026 16:00' },
  { id: '5', sku: 'SKU-005', name: 'Кофе арабика 1кг', category: 'Продукты', qty: 200, reserved: 45, available: 155, cell: 'C-01-01', weight: 1.0, lastMovement: '14.03.2026 07:20' },
  { id: '6', sku: 'SKU-006', name: 'Наушники TWS', category: 'Электроника', qty: 89, reserved: 30, available: 59, cell: 'A-03-04', weight: 0.1, lastMovement: '14.03.2026 10:30' },
];

const INBOUND: InboundShipment[] = [
  { id: '1', manifest: 'MAN-2026-0312', from: 'Поставщик «ТехМарт»', items: 450, status: 'completed', expectedAt: '14.03.2026 08:00', arrivedAt: '14.03.2026 07:48', operator: 'Иванов С.' },
  { id: '2', manifest: 'MAN-2026-0313', from: 'Маркетплейс WB', items: 234, status: 'in_progress', expectedAt: '14.03.2026 10:00', arrivedAt: '14.03.2026 09:55', operator: 'Козлова А.' },
  { id: '3', manifest: 'MAN-2026-0314', from: 'Поставщик «Текстиль»', items: 800, status: 'expected', expectedAt: '14.03.2026 14:00' },
  { id: '4', manifest: 'MAN-2026-0310', from: 'Возврат ПВЗ MSK-003', items: 23, status: 'overdue', expectedAt: '13.03.2026 18:00' },
];

const OUTBOUND: OutboundTask[] = [
  { id: '1', orderId: 'ORD-2026-4512', customerName: 'Иванов П.С.', items: 3, destination: 'ПВЗ MSK-001', courier: 'Алексеев Д.', status: 'dispatched', priority: 'normal', createdAt: '14.03.2026 07:30' },
  { id: '2', orderId: 'ORD-2026-4523', customerName: 'Смирнова Е.В.', items: 1, destination: 'Доставка курьером', courier: 'Петров В.', status: 'picking', priority: 'express', createdAt: '14.03.2026 09:00' },
  { id: '3', orderId: 'ORD-2026-4534', customerName: 'Козлов Р.А.', items: 5, destination: 'ПВЗ SPB-001', status: 'queued', priority: 'sla_breach', createdAt: '14.03.2026 06:00' },
  { id: '4', orderId: 'ORD-2026-4545', customerName: 'Морозова Т.', items: 2, destination: 'Самовывоз', status: 'packed', priority: 'normal', createdAt: '14.03.2026 08:15' },
];

const STAFF: StaffMember[] = [
  { id: '1', name: 'Иванов Сергей', role: 'Кладовщик', shift: '08:00-20:00', zone: 'A (Электроника)', tasksToday: 45, status: 'working' },
  { id: '2', name: 'Козлова Анна', role: 'Приёмщик', shift: '08:00-20:00', zone: 'Приёмка', tasksToday: 32, status: 'working' },
  { id: '3', name: 'Петров Денис', role: 'Пикер', shift: '08:00-20:00', zone: 'B (Одежда)', tasksToday: 67, status: 'break' },
  { id: '4', name: 'Соколова Мария', role: 'Упаковщик', shift: '08:00-20:00', zone: 'Упаковка', tasksToday: 89, status: 'working' },
  { id: '5', name: 'Белов Андрей', role: 'Кладовщик', shift: '20:00-08:00', zone: 'C (Продукты)', tasksToday: 0, status: 'offline' },
];

const AUDIT: AuditEntry[] = [
  { id: '1', time: '14.03.2026 10:30', actor: 'Козлова А.', action: 'Приёмка MAN-2026-0313', details: '234 позиции · зона Приёмка', type: 'ok' },
  { id: '2', time: '14.03.2026 09:12', actor: 'Иванов С.', action: 'Размещение в ячейку A-01-03', details: 'SKU-001 × 120 шт.', type: 'info' },
  { id: '3', time: '14.03.2026 08:45', actor: 'Соколова М.', action: 'Упаковка заказа ORD-2026-4512', details: 'Курьер: Алексеев Д.', type: 'ok' },
  { id: '4', time: '13.03.2026 18:00', actor: 'Система', action: 'Просрочка поставки MAN-2026-0310', details: 'Возврат ПВЗ MSK-003 не прибыл', type: 'danger' },
  { id: '5', time: '13.03.2026 16:00', actor: 'Морозов А.', action: 'Инвентаризация зоны B', details: 'Обнаружена недостача: 2 SKU-003', type: 'warn' },
];

const THROUGHPUT_DATA = [
  { hour: '06:00', in: 12, out: 8 },
  { hour: '08:00', in: 45, out: 32 },
  { hour: '10:00', in: 67, out: 54 },
  { hour: '12:00', in: 89, out: 78 },
  { hour: '14:00', in: 56, out: 90 },
  { hour: '16:00', in: 34, out: 67 },
  { hour: '18:00', in: 23, out: 45 },
];

const STATUS_IN_CFG: Record<InboundShipment['status'], { label: string; color: string }> = {
  expected:    { label: 'Ожидается', color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'Приёмка',   color: 'bg-yellow-100 text-yellow-700' },
  completed:   { label: 'Принято',   color: 'bg-green-100 text-green-700' },
  overdue:     { label: 'Просрочено',color: 'bg-red-100 text-red-700' },
};

const STATUS_OUT_CFG: Record<OutboundTask['status'], { label: string; color: string }> = {
  queued:     { label: 'В очереди',    color: 'bg-gray-100 text-gray-700' },
  picking:    { label: 'Пикинг',       color: 'bg-yellow-100 text-yellow-700' },
  packed:     { label: 'Упакован',     color: 'bg-blue-100 text-blue-700' },
  dispatched: { label: 'Отправлен',    color: 'bg-green-100 text-green-700' },
};

const PRIORITY_CFG: Record<OutboundTask['priority'], { label: string; color: string }> = {
  normal:     { label: 'Обычный',   color: 'text-gray-500' },
  express:    { label: 'Экспресс',  color: 'text-orange-600' },
  sla_breach: { label: 'SLA!',      color: 'text-red-600' },
};

const STAFF_STATUS_CFG: Record<StaffMember['status'], { label: string; dot: string }> = {
  working: { label: 'Работает',    dot: 'bg-green-500' },
  break:   { label: 'Перерыв',     dot: 'bg-yellow-500' },
  offline: { label: 'Не на смене', dot: 'bg-gray-400' },
};

const AUDIT_TYPE_COLOR: Record<AuditEntry['type'], string> = {
  info:   'bg-blue-100 text-blue-700',
  ok:     'bg-green-100 text-green-700',
  warn:   'bg-yellow-100 text-yellow-700',
  danger: 'bg-red-100 text-red-700',
};

const TYPE_LABELS: Record<string, string> = {
  hub: 'Хаб', warehouse: 'Склад', dark_store: 'Дарк-стор',
};

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: 'overview',   label: 'Обзор',      icon: Activity },
  { id: 'inventory',  label: 'Остатки',    icon: Boxes },
  { id: 'inbound',    label: 'Приёмка',    icon: ArrowDownLeft },
  { id: 'outbound',   label: 'Отгрузка',   icon: ArrowUpRight },
  { id: 'staff',      label: 'Персонал',   icon: Users },
  { id: 'documents',  label: 'Документы',icon: FileText },
  { id: 'audit',      label: 'Аудит',      icon: History },
];

export function WarehouseDetail() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [invSearch, setInvSearch] = useState('');
  const [showAddTask, setShowAddTask] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<DocumentRecord | null>(null);

  const wh = WAREHOUSES[id || '1'] ?? WAREHOUSES['1'];
  const loadPct = Math.round((wh.currentLoad / wh.capacity) * 100);

  const filteredInv = INVENTORY.filter(i =>
    i.sku.toLowerCase().includes(invSearch.toLowerCase()) ||
    i.name.toLowerCase().includes(invSearch.toLowerCase()) ||
    i.category.toLowerCase().includes(invSearch.toLowerCase())
  );

  const handleExport = () => {
    toast.success('Экспорт данных запущен', { description: `Файл будет готов через несколько секунд` });
  };

  const handleRefresh = () => {
    toast.success('Данные обновлены', { description: 'Синхронизация WMS выполнена' });
  };

  const handleStartPicking = (taskId: string) => {
    toast.success(`Пикинг начат`, { description: `Задание ${taskId} передано на исполнение` });
  };

  const handleReceiveShipment = (manifest: string) => {
    toast.success(`Приёмка начата`, { description: `Поставка ${manifest} передана оператору` });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link to="/warehouses" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{wh.name}</h1>
              <span className="px-2.5 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                Активен
              </span>
              <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                {TYPE_LABELS[wh.type]}
              </span>
            </div>
            <p className="text-gray-500 mt-0.5">{wh.code} · {wh.city} · {wh.address}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleRefresh} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm">
            <RefreshCw className="w-4 h-4" /> Обновить
          </button>
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm">
            <Download className="w-4 h-4" /> Экспорт
          </button>
          <button onClick={() => setShowAddTask(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
            <Plus className="w-4 h-4" /> Задание
          </button>
        </div>
      </div>

      {/* Quick KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {[
          { label: 'Загрузка', value: `${loadPct}%`, sub: `${wh.currentLoad} / ${wh.capacity}`, color: loadPct >= 90 ? 'text-red-600' : loadPct >= 75 ? 'text-orange-600' : 'text-green-600', icon: Layers },
          { label: 'Приёмка сег.', value: wh.inboundToday, sub: 'позиций', color: 'text-blue-600', icon: ArrowDownLeft },
          { label: 'Отгрузка сег.', value: wh.outboundToday, sub: 'заказов', color: 'text-purple-600', icon: ArrowUpRight },
          { label: 'Пикинг', value: wh.pickingInProgress, sub: 'волн активно', color: 'text-orange-600', icon: ScanLine },
          { label: 'Зоны', value: wh.zones, sub: 'активных', color: 'text-teal-600', icon: Grid3x3 },
          { label: 'Персонал', value: wh.staff, sub: 'сотрудников', color: 'text-gray-900', icon: Users },
        ].map((kpi, i) => (
          <div key={i} className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon className="w-4 h-4 text-gray-400" />
              <p className="text-xs text-gray-500">{kpi.label}</p>
            </div>
            <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="border-b border-gray-200 overflow-x-auto">
          <nav className="flex -mb-px">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-4 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
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

        <div className="p-6">
          {/* ── OVERVIEW ── */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Throughput chart */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Поток товаров сегодня</h3>
                  <ChartWrapper height={220}>
                    {(w, h) => (
                      <BarChart width={w} height={h} data={THROUGHPUT_DATA}>
                        <CartesianGrid key="cg" strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis key="xa" dataKey="hour" style={{ fontSize: '11px' }} />
                        <YAxis key="ya" style={{ fontSize: '11px' }} />
                        <Tooltip key="tt" contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }} />
                        <Bar key="bar-in" dataKey="in" fill="#3B82F6" name="Приёмка" radius={[3, 3, 0, 0]} />
                        <Bar key="bar-out" dataKey="out" fill="#10B981" name="Отгрузка" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    )}
                  </ChartWrapper>
                </div>

                {/* Info cards */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 mb-4">Информация о складе</h3>
                  {[
                    { label: 'Управляющий', value: wh.manager },
                    { label: 'Телефон', value: wh.phone },
                    { label: 'Адрес', value: wh.address + ', ' + wh.city },
                    { label: 'Температурный режим', value: wh.temperature },
                    { label: 'Тип объекта', value: TYPE_LABELS[wh.type] },
                  ].map(row => (
                    <div key={row.label} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
                      <span className="text-sm text-gray-500">{row.label}</span>
                      <span className="text-sm font-medium text-gray-900">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Load bar */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Загрузка склада</span>
                  <span className={`text-sm font-bold ${loadPct >= 90 ? 'text-red-600' : loadPct >= 75 ? 'text-orange-600' : 'text-green-600'}`}>
                    {loadPct}% ({wh.currentLoad} / {wh.capacity} мест)
                  </span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${loadPct >= 90 ? 'bg-red-500' : loadPct >= 75 ? 'bg-orange-400' : 'bg-green-500'}`}
                    style={{ width: `${loadPct}%` }}
                  />
                </div>
                {loadPct >= 85 && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-orange-700 bg-orange-50 border border-orange-200 px-3 py-2 rounded-lg">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    Высокая загрузка — рекомендуется ускорить отгрузку
                  </div>
                )}
              </div>

              {/* Recent alerts */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Последние события</h3>
                <div className="space-y-2">
                  {AUDIT.slice(0, 4).map(entry => (
                    <div key={entry.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${AUDIT_TYPE_COLOR[entry.type]}`}>
                        {entry.type === 'ok' ? 'OK' : entry.type === 'warn' ? 'WARN' : entry.type === 'danger' ? 'ERR' : 'INFO'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{entry.action}</p>
                        <p className="text-xs text-gray-500">{entry.actor} · {entry.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── INVENTORY ── */}
          {activeTab === 'inventory' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h3 className="font-semibold text-gray-900">Остатки на складе</h3>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Поиск по SKU, названию..."
                      value={invSearch}
                      onChange={e => setInvSearch(e.target.value)}
                      className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm transition-colors">
                    <Download className="w-4 h-4" /> Экспорт
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['SKU', 'Наименование', 'Категория', 'Всего', 'Рез-но', 'Доступно', 'Ячейка', 'Последнее движение'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredInv.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-mono text-blue-600">{item.sku}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{item.category}</td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900">{item.qty}</td>
                        <td className="px-4 py-3 text-sm text-orange-600">{item.reserved}</td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-bold ${item.available < 20 ? 'text-red-600' : 'text-green-600'}`}>
                            {item.available}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-700">{item.cell}</td>
                        <td className="px-4 py-3 text-xs text-gray-400">{item.lastMovement}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── INBOUND ── */}
          {activeTab === 'inbound' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Приёмка — {new Date().toLocaleDateString('ru-RU')}</h3>
                <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm transition-colors">
                  <Download className="w-4 h-4" /> Экспорт
                </button>
              </div>
              <div className="space-y-3">
                {INBOUND.map(ship => {
                  const cfg = STATUS_IN_CFG[ship.status];
                  return (
                    <div key={ship.id} className={`p-4 border rounded-xl ${ship.status === 'overdue' ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}>
                      <div className="flex items-start justify-between flex-wrap gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900 font-mono">{ship.manifest}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                          </div>
                          <p className="text-sm text-gray-600">{ship.from}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>📦 {ship.items} поз.</span>
                            <span>⏰ Ожид.: {ship.expectedAt}</span>
                            {ship.arrivedAt && <span>✅ Прибыл: {ship.arrivedAt}</span>}
                            {ship.operator && <span>👤 {ship.operator}</span>}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {ship.status === 'expected' && (
                            <button
                              onClick={() => handleReceiveShipment(ship.manifest)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                            >
                              <ScanLine className="w-3.5 h-3.5" /> Принять
                            </button>
                          )}
                          {ship.status === 'in_progress' && (
                            <button onClick={() => { import('sonner').then(m => m.toast.info(`Поставка ${ship.id} — открыть детали`)); }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500 text-white rounded-lg text-sm hover:bg-yellow-600 transition-colors">
                              <Activity className="w-3.5 h-3.5" /> В процессе
                            </button>
                          )}
                          {ship.status === 'overdue' && (
                            <button
                              onClick={() => toast.error('Инцидент создан', { description: `Просрочка поставки ${ship.manifest} — передано в поддержку` })}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
                            >
                              <AlertCircle className="w-3.5 h-3.5" /> Эскалировать
                            </button>
                          )}
                          <button
                            onClick={() => toast.info('Детали поставки', { description: `${ship.manifest}: ${ship.items} позиций от «${ship.from}»` })}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── OUTBOUND ── */}
          {activeTab === 'outbound' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Задания на отгрузку</h3>
                <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm transition-colors">
                  <Download className="w-4 h-4" /> Экспорт
                </button>
              </div>
              <div className="space-y-3">
                {OUTBOUND.map(task => {
                  const stCfg = STATUS_OUT_CFG[task.status];
                  const prCfg = PRIORITY_CFG[task.priority];
                  return (
                    <div key={task.id} className={`p-4 border rounded-xl bg-white ${task.priority === 'sla_breach' ? 'border-red-300' : 'border-gray-200'}`}>
                      <div className="flex items-start justify-between flex-wrap gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-semibold text-blue-600 font-mono text-sm">{task.orderId}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${stCfg.color}`}>{stCfg.label}</span>
                            <span className={`text-xs font-semibold ${prCfg.color}`}>{prCfg.label}</span>
                          </div>
                          <p className="text-sm text-gray-900">{task.customerName} · {task.items} поз.</p>
                          <p className="text-xs text-gray-500 mt-1">→ {task.destination}{task.courier ? ` · Курьер: ${task.courier}` : ''}</p>
                          <p className="text-xs text-gray-400 mt-0.5">Создан: {task.createdAt}</p>
                        </div>
                        <div className="flex gap-2">
                          {task.status === 'queued' && (
                            <button
                              onClick={() => handleStartPicking(task.orderId)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                            >
                              <Zap className="w-3.5 h-3.5" /> Начать пикинг
                            </button>
                          )}
                          {task.status === 'picking' && (
                            <button
                              onClick={() => toast.success('Статус обновлён', { description: `${task.orderId} → Упакован` })}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" /> Упаковано
                            </button>
                          )}
                          {task.status === 'packed' && (
                            <button
                              onClick={() => toast.success('Передано курьеру', { description: `${task.orderId} готов к отправке` })}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors"
                            >
                              <Truck className="w-3.5 h-3.5" /> Передать
                            </button>
                          )}
                          <button
                            onClick={() => toast.info('Детали задания', { description: `${task.orderId}: ${task.items} поз. → ${task.destination}` })}
                            className="p-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── STAFF ── */}
          {activeTab === 'staff' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Персонал склада</h3>
                <button
                  onClick={() => toast.success('Приглашение отправлено', { description: 'Ссылка для регистрации выслана на email' })}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Добавить сотрудника
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {STAFF.map(member => {
                  const stCfg = STAFF_STATUS_CFG[member.status];
                  return (
                    <div key={member.id} className="p-4 border border-gray-200 rounded-xl bg-white">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                            {member.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${stCfg.dot}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900">{member.name}</p>
                          <p className="text-xs text-gray-500">{member.role} · {member.zone}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          member.status === 'working' ? 'bg-green-100 text-green-700' :
                          member.status === 'break' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-500'
                        }`}>{stCfg.label}</span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-gray-400">Смена</p>
                          <p className="font-medium text-gray-700">{member.shift}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Задания сег.</p>
                          <p className="font-bold text-gray-900">{member.tasksToday}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => toast.info(`Профиль: ${member.name}`, { description: `Роль: ${member.role} · Зона: ${member.zone}` })}
                          className="flex-1 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Профиль
                        </button>
                        <button
                          onClick={() => toast.success(`Сообщение отправлено`, { description: `Уведомление для ${member.name}` })}
                          className="flex-1 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Написать
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── DOCUMENTS ── */}
          {activeTab === 'documents' && (() => {
            const WH_DOCS: DocumentRecord[] = [
              { id: 'wh-doc-1', name: 'Договор аренды склада', type: 'PDF', size: '2.4 МБ', date: '01.01.2026', status: 'signed', number: 'ДА-2026-001', signedBy: 'Соколов В.Д.', signedAt: '28.12.2025',
                content: { title: 'Договор аренды складского помещения', number: 'ДА-2026-001', date: '01.01.2026', organization: 'ООО «Лог-Хаб»',
                  headerFields: [{ label: 'Арендодатель', value: 'ООО «Промплощадка»' }, { label: 'Арендатор', value: 'ООО «Лог-Хаб»' }, { label: 'Площадь', value: '4 500 м²' }, { label: 'Срок', value: '01.01.2026 — 31.12.2028' }],
                  tableHeaders: ['Помещение', 'Площадь, м²', 'Ставка, руб/м²', 'Сумма в месяц'],
                  tableRows: [['Основной зал', '3 200', '850', '2 720 000'], ['Зона приёмки', '600', '900', '540 000'], ['Офис склада', '200', '1 200', '240 000'], ['Парковка', '500', '300', '150 000']],
                  totalRow: ['Итого', '4 500', '—', '3 650 000'],
                  signatures: [{ role: 'Арендодатель', name: 'Козлов П.Р.', signed: true, date: '28.12.2025' }, { role: 'Арендатор', name: 'Соколов В.Д.', signed: true, date: '28.12.2025' }],
                  stamp: 'Печать ООО «Лог-Хаб»', qrCode: true } },
              { id: 'wh-doc-2', name: 'Лицензия на складскую деятельность', type: 'PDF', size: '1.1 МБ', date: '15.06.2025', status: 'signed', number: 'ЛС-2025-4412', signedBy: 'Роспотребнадзор', signedAt: '15.06.2025',
                content: { title: 'Лицензия на складскую деятельность', number: 'ЛС-2025-4412', date: '15.06.2025', organization: 'Роспотребнадзор',
                  headerFields: [{ label: 'Выдана', value: 'ООО «Лог-Хаб»' }, { label: 'ИНН', value: '7701234567' }, { label: 'Действует до', value: '15.06.2030' }],
                  notes: ['Разрешается хранение товаров народного потребления категорий A–D.', 'Запрещается хранение химически опасных и взрывчатых веществ.'],
                  signatures: [{ role: 'Начальник отдела', name: 'Фёдоров И.А.', signed: true, date: '15.06.2025' }], stamp: 'Печать Роспотребнадзора', qrCode: true } },
              { id: 'wh-doc-3', name: 'Акт пожарной проверки', type: 'PDF', size: '0.8 МБ', date: '10.02.2026', status: 'signed', number: 'АПП-2026-087', signedBy: 'МЧС, Иванов К.В.', signedAt: '10.02.2026',
                content: { title: 'Акт проверки требований пожарной безопасности', number: 'АПП-2026-087', date: '10.02.2026', organization: 'Управление МЧС по г. Москве',
                  headerFields: [{ label: 'Объект', value: `${wh.name} (${wh.code})` }, { label: 'Адрес', value: `${wh.address}, ${wh.city}` }, { label: 'Результат', value: 'Соответствует' }],
                  tableHeaders: ['Требование', 'Статус', 'Замечания'],
                  tableRows: [['Огнетушители', 'OK', 'В наличии, срок годности до 2028'], ['Пожарная сигнализация', 'OK', 'Исправна, проверена 08.02.2026'], ['Эвакуационные выходы', 'OK', 'Свободны, обозначены'], ['Спринклерная система', 'OK', 'Исправна'], ['Огнеупорные перегородки', 'OK', 'Зоны A–C разделены']],
                  signatures: [{ role: 'Инспектор МЧС', name: 'Иванов К.В.', signed: true, date: '10.02.2026' }, { role: 'Управляющий склада', name: wh.manager, signed: true, date: '10.02.2026' }],
                  stamp: 'Печать МЧС', qrCode: true } },
              { id: 'wh-doc-4', name: 'Полис страхования имущества', type: 'PDF', size: '1.5 МБ', date: '01.03.2026', status: 'signed', number: 'СП-2026-11234', signedBy: 'АО «Ингосстрах»', signedAt: '01.03.2026',
                content: { title: 'Полис страхования складского имущества', number: 'СП-2026-11234', date: '01.03.2026', organization: 'АО «Ингосстрах»',
                  headerFields: [{ label: 'Страхователь', value: 'ООО «Лог-Хаб»' }, { label: 'Объект', value: wh.name }, { label: 'Период', value: '01.03.2026 — 28.02.2027' }, { label: 'Сумма покрытия', value: '150 000 000 руб.' }],
                  tableHeaders: ['Риск', 'Лимит, руб.', 'Франшиза'],
                  tableRows: [['Пожар', '150 000 000', '500 000'], ['Затопление', '50 000 000', '200 000'], ['Кража/Грабёж', '80 000 000', '300 000'], ['Стихийные бедствия', '100 000 000', '1 000 000']],
                  signatures: [{ role: 'Страховщик', name: 'Петрова Н.С.', signed: true, date: '01.03.2026' }, { role: 'Страхователь', name: 'Соколов В.Д.', signed: true, date: '01.03.2026' }],
                  stamp: 'Печать АО «Ингосстрах»', qrCode: true } },
              { id: 'wh-doc-5', name: 'Акт инвентаризации Q1 2026', type: 'PDF', size: '3.2 МБ', date: '31.03.2026', status: 'pending', number: 'АИ-2026-Q1',
                content: { title: 'Акт инвентаризации за Q1 2026', subtitle: 'Плановая квартальная инвентаризация', number: 'АИ-2026-Q1', date: '31.03.2026', organization: 'ООО «Лог-Хаб»',
                  headerFields: [{ label: 'Склад', value: `${wh.name} (${wh.code})` }, { label: 'Период', value: '01.01.2026 — 31.03.2026' }, { label: 'Комиссия', value: '3 чел.' }],
                  tableHeaders: ['Зона', 'Учёт, ед.', 'Факт, ед.', 'Расхождение', 'Сумма расхожд.'],
                  tableRows: [['A (Электроника)', '1 245', '1 243', '-2', '-18 400'], ['B (Одежда)', '3 890', '3 888', '-2', '-3 200'], ['C (Продукты)', '2 100', '2 100', '0', '0'], ['D (Разное)', '980', '981', '+1', '+450']],
                  totalRow: ['Итого', '8 215', '8 212', '-3', '-21 150'],
                  footerFields: [{ label: 'Комментарий', value: 'Расхождение в пределах нормы (0.04%). Рекомендация: провести точечную проверку зоны A.' }],
                  signatures: [{ role: 'Председатель комиссии', name: wh.manager, signed: false }, { role: 'Кладовщик', name: 'Иванов С.', signed: false }] } },
              { id: 'wh-doc-6', name: 'Сертификат температурного режима', type: 'PDF', size: '0.6 МБ', date: '20.01.2026', status: 'signed', number: 'СТР-2026-003', signedBy: 'ООО «Термоконтроль»', signedAt: '20.01.2026',
                content: { title: 'Сертификат соответствия температурного режима', number: 'СТР-2026-003', date: '20.01.2026', organization: 'ООО «Термоконтроль»',
                  headerFields: [{ label: 'Объект', value: wh.name }, { label: 'Замеры', value: '6 точек · 72 часа' }, { label: 'Результат', value: 'Соответствует ГОСТ' }],
                  tableHeaders: ['Зона', 'Норма, °C', 'Факт (мин)', 'Факт (макс)', 'Статус'],
                  tableRows: [['Основной зал', '18–22', '18.2', '21.8', 'OK'], ['Зона охлаждения', '2–6', '2.4', '5.7', 'OK'], ['Зона приёмки', '15–25', '16.1', '23.4', 'OK']],
                  signatures: [{ role: 'Инженер', name: 'Смирнов Д.А.', signed: true, date: '20.01.2026' }], stamp: 'Печать ООО «Термоконтроль»', qrCode: true } },
            ];

            const DOC_STATUS_CFG: Record<string, { label: string; cls: string }> = {
              signed: { label: 'Подписан', cls: 'bg-green-100 text-green-700' },
              pending: { label: 'Ожидает', cls: 'bg-yellow-100 text-yellow-700' },
              draft: { label: 'Черновик', cls: 'bg-gray-100 text-gray-600' },
              expired: { label: 'Истёк', cls: 'bg-red-100 text-red-700' },
            };

            return (
              <WarehouseDocumentsTab
                docs={WH_DOCS}
                statusCfg={DOC_STATUS_CFG}
                onView={setViewingDoc}
                onExport={handleExport}
              />
            );
          })()}

          {/* ── AUDIT ── */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Журнал операций</h3>
                <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm transition-colors">
                  <Download className="w-4 h-4" /> Экспорт
                </button>
              </div>
              <div className="space-y-2">
                {AUDIT.map(entry => (
                  <div key={entry.id} className="flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-xl">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold shrink-0 mt-0.5 ${AUDIT_TYPE_COLOR[entry.type]}`}>
                      {entry.type === 'ok' ? 'OK' : entry.type === 'warn' ? 'WARN' : entry.type === 'danger' ? 'ERROR' : 'INFO'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">{entry.action}</p>
                        <span className="text-xs text-gray-400 shrink-0 ml-4">{entry.time}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{entry.details} · {entry.actor}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Document Viewer Portal */}
      {viewingDoc && ReactDOM.createPortal(
        <DocumentViewerModal doc={viewingDoc} onClose={() => setViewingDoc(null)} />,
        document.body
      )}

      {/* Add Task Modal */}
      {showAddTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowAddTask(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-bold text-gray-900">Создать задание</h2>
              <button onClick={() => setShowAddTask(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Тип задания</label>
                <select className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white">
                  <option>Пикинг заказа</option>
                  <option>Приёмка товара</option>
                  <option>Инвентаризация зоны</option>
                  <option>Перемещение товара</option>
                  <option>Возврат поставщику</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Исполнитель</label>
                <select className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white">
                  {STAFF.filter(s => s.status !== 'offline').map(s => (
                    <option key={s.id}>{s.name} ({s.role})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Зона / Ячейка</label>
                <input className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="A-01-03" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Приоритет</label>
                <select className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white">
                  <option>Обычный</option>
                  <option>Высокий</option>
                  <option>Экспресс</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowAddTask(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                  Отмена
                </button>
                <button
                  onClick={() => {
                    setShowAddTask(false);
                    toast.success('Задание создано', { description: 'Исполнитель получил уведомление' });
                  }}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700 transition-colors font-semibold"
                >
                  Создать
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Documents Tab Component ────────────────────────────────────────────────

type WarehouseDocumentsTabProps = {
  docs: DocumentRecord[];
  statusCfg: Record<string, { label: string; cls: string }>;
  onView: (doc: DocumentRecord) => void;
  onExport: () => void;
};

function WarehouseDocumentsTab({ docs, statusCfg, onView, onExport }: WarehouseDocumentsTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Документы склада</h3>
          <p className="text-xs text-gray-500 mt-0.5">{docs.length} документов · {docs.filter(d => d.status === 'signed').length} подписано</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onExport} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm transition-colors">
            <Download className="w-4 h-4" /> Экспорт
          </button>
          <button onClick={() => toast.success('Загрузка документа', { description: 'Выберите файл для загрузки' })}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm transition-colors">
            <Upload className="w-4 h-4" /> Загрузить
          </button>
        </div>
      </div>
      <div className="flex gap-3 flex-wrap">
        {Object.entries(statusCfg).map(([key, cfg]) => {
          const count = docs.filter(d => d.status === key).length;
          if (!count) return null;
          return (
            <span key={key} className={`px-3 py-1 rounded-full text-xs font-medium ${cfg.cls}`}>
              {cfg.label}: {count}
            </span>
          );
        })}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Документ', 'Номер', 'Дата', 'Размер', 'Статус', 'Подписант', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {docs.map(doc => {
              const sc = statusCfg[doc.status] || statusCfg.signed;
              return (
                <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="text-sm font-medium text-gray-900">{doc.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-600">{doc.number || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{doc.date}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{doc.size}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${sc.cls}`}>{sc.label}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{doc.signedBy || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => onView(doc)}
                        className="p-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors" title="Просмотр">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => toast.success('Скачивание...', { description: doc.name })}
                        className="p-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors" title="Скачать">
                        <Download className="w-4 h-4" />
                      </button>
                      <button onClick={() => toast.success('Печать...', { description: doc.name })}
                        className="p-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors" title="Печать">
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}