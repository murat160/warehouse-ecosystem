import { useState, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Phone, MessageSquare, Zap, Warehouse,
  Star, DollarSign, CheckCircle2, Clock, AlertTriangle, XCircle,
  User, Map, Package, BarChart3, FileText, ClipboardList, History,
  MessageCircle, Shield, Wifi, WifiOff, Activity, Truck, Bike,
  ChevronRight, ChevronDown, Send, Bell, Lock, Unlock, RefreshCw,
  Download, Upload, Calendar, TrendingUp, TrendingDown, Award,
  Navigation, Hash, Tag, Info, Eye, PenLine as Edit3, Ban, RotateCcw,
  CheckCircle, X, UserCheck, ShieldAlert,
} from 'lucide-react';
import {
  COURIERS_MOCK, TASK_TYPE_CFG, CONTRACT_LABELS,
  type Courier, type CourierOrder, type WarehouseTask, type DailyFinance,
  type Vehicle, type CourierType, type AuditEntry,
} from '../../data/couriers-mock';
import { ChartWrapper } from '../../components/ui/ChartWrapper';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { DocumentsTab } from './DocumentsTab';
import { CourierChatTab } from './CourierChatTab';
import { CourierTimeReportTab } from './CourierTimeReportTab';
import { toast } from 'sonner';
import { useDetectNestedButtons } from '../../components/debug/useDetectNestedButtons';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; dot: string; bg: string; color: string }> = {
  online:        { label: 'Онлайн',         dot: 'bg-green-500', bg: 'bg-green-50',  color: 'text-green-700' },
  waiting_order: { label: 'Ждёт заказ',     dot: 'bg-blue-400',  bg: 'bg-blue-50',   color: 'text-blue-700' },
  picking_order: { label: 'Забирает',       dot: 'bg-yellow-500',bg: 'bg-yellow-50', color: 'text-yellow-700' },
  delivering:    { label: 'Доставляет',     dot: 'bg-indigo-500',bg: 'bg-indigo-50', color: 'text-indigo-700' },
  on_task:       { label: 'На задании',     dot: 'bg-purple-500',bg: 'bg-purple-50', color: 'text-purple-700' },
  offline:       { label: 'Офлайн',         dot: 'bg-gray-400',  bg: 'bg-gray-100',  color: 'text-gray-600' },
};

const VEHICLE_LABELS: Record<string, string> = {
  bike: '🚲 Велосипед', scooter: '🛵 Скутер', car: '🚗 Автомобиль',
  van: '🚐 Микроавтобус', truck: '🚛 Грузовик', foot: '🚶 Пешком',
};

const ZONES = [
  'ЦАО — Центр', 'САО — Север', 'ЮАО — Юг', 'ЗАО — Запад', 'ВАО — Восток',
  'СВАО — Северо-Восток', 'СЗАО — Северо-Запад', 'ЮВАО — Юго-Восток',
  'ЮЗАО — Юго-Запад', 'ЗелАО — Зеленоград',
];

const ROLES = [
  'Курьер', 'Старший курьер', 'Бригадир', 'Супервизор', 'Логист',
];

const BLOCK_REASONS = [
  'Нарушение правил доставки',
  'Жалобы клиентов',
  'Подозрительная активность',
  'Документы не валидны',
  'Нарушение трудового договора',
  'Другое',
];

function fmt(n: number) { return n.toLocaleString('ru-RU'); }

function now(): string {
  const d = new Date();
  return `${d.toLocaleDateString('ru-RU')} ${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
}

// ─── Portal Modal Wrapper ─────────────────────────────────────────────────────

function PortalModal({ onClose, children, maxW = 'max-w-md' }: {
  onClose: () => void; children: React.ReactNode; maxW?: string;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" />
      <div
        className={`relative bg-white rounded-2xl shadow-2xl w-full ${maxW} overflow-hidden`}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

// ─── Block/Unblock Modal ──────────────────────────────────────────────────────

function BlockModal({ courier, onConfirm, onClose }: {
  courier: Courier;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const isBlocked = courier.blocked;
  const [reason, setReason] = useState(isBlocked ? '' : BLOCK_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    const finalReason = reason === 'Другое' ? customReason.trim() : reason;
    if (!isBlocked && !finalReason) { return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 700));
    onConfirm(finalReason || 'Разблокировка администратором');
  };

  return (
    <PortalModal onClose={onClose}>
      <div className={`px-6 py-4 border-b flex items-center gap-3 ${isBlocked ? 'bg-green-50' : 'bg-red-50'}`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isBlocked ? 'bg-green-100' : 'bg-red-100'}`}>
          {isBlocked ? <Unlock className="w-5 h-5 text-green-600" /> : <Lock className="w-5 h-5 text-red-600" />}
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-gray-900">{isBlocked ? 'Разблокировать курьера' : 'Заблокировать курьера'}</h3>
          <p className="text-xs text-gray-500">{courier.name}</p>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
      </div>

      <div className="p-6 space-y-4">
        {!isBlocked ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Выберите причину блокировки курьера:</p>
            <div className="space-y-2">
              {BLOCK_REASONS.map(r => (
                <label key={r} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:border-red-300 hover:bg-red-50 transition-colors">
                  <input
                    type="radio" name="reason" value={r} checked={reason === r}
                    onChange={() => setReason(r)}
                    className="w-4 h-4 text-red-600"
                  />
                  <span className="text-sm text-gray-700">{r}</span>
                </label>
              ))}
            </div>
            {reason === 'Другое' && (
              <textarea
                value={customReason}
                onChange={e => setCustomReason(e.target.value)}
                placeholder="Укажите причину блокировки..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
              />
            )}
            <div className="flex items-start gap-2 p-3 bg-red-50 rounded-xl border border-red-200">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-xs text-red-700">Курьер не сможет принимать заказы. Активные заказы будут переназначены.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
              <p className="text-sm text-yellow-800 font-medium">Курьер будет разблокирован и получит доступ к приёму заказов.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Комментарий (необязательно)</label>
              <textarea
                value={customReason}
                onChange={e => setCustomReason(e.target.value)}
                placeholder="Причина разблокировки..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
              />
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
            Отмена
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || (!isBlocked && reason === 'Другое' && !customReason.trim())}
            className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${isBlocked ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              isBlocked ? <><Unlock className="w-4 h-4" />Разблокировать</> : <><Lock className="w-4 h-4" />Заблокировать</>
            )}
          </button>
        </div>
      </div>
    </PortalModal>
  );
}

// ─── Change Zone Modal ────────────────────────────────────────────────────────

function ZoneModal({ currentZone, onConfirm, onClose }: {
  currentZone: string; onConfirm: (zone: string) => void; onClose: () => void;
}) {
  const [selected, setSelected] = useState(currentZone);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (selected === currentZone) { onClose(); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 500));
    onConfirm(selected);
  };

  return (
    <PortalModal onClose={onClose}>
      <div className="px-6 py-4 border-b bg-blue-50 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-900">Изменить зону доставки</h3>
          <p className="text-xs text-gray-500">Текущая: {currentZone}</p>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
      </div>
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-1">
          {ZONES.map(z => (
            <label key={z} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${selected === z ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/40'}`}>
              <input type="radio" name="zone" value={z} checked={selected === z} onChange={() => setSelected(z)} className="w-4 h-4 text-blue-600" />
              <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="text-sm text-gray-700">{z}</span>
            </label>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Отмена</button>
          <button onClick={handleConfirm} disabled={loading} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4" />Сохранить</>}
          </button>
        </div>
      </div>
    </PortalModal>
  );
}

// ─── Change Courier Type Modal ────────────────────────────────────────────────

function CourierTypeModal({ currentType, onConfirm, onClose }: {
  currentType: CourierType; onConfirm: (type: CourierType) => void; onClose: () => void;
}) {
  const [selected, setSelected] = useState<CourierType>(currentType);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    onConfirm(selected);
  };

  return (
    <PortalModal onClose={onClose}>
      <div className="px-6 py-4 border-b bg-orange-50 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-900">Изменить тип курьера</h3>
          <p className="text-xs text-gray-500">Текущий: {currentType === 'fast_delivery' ? 'Fast Delivery' : 'Warehouse Delivery'}</p>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
      </div>
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-1 gap-3">
          <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-colors ${selected === 'fast_delivery' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-orange-300'}`}>
            <input type="radio" name="type" value="fast_delivery" checked={selected === 'fast_delivery'} onChange={() => setSelected('fast_delivery')} className="w-4 h-4 text-orange-500" />
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center"><Zap className="w-5 h-5 text-orange-600" /></div>
              <div>
                <p className="font-semibold text-gray-900">Fast Delivery</p>
                <p className="text-xs text-gray-500">Доставка еды, товаров из ресторанов и магазинов</p>
              </div>
            </div>
          </label>
          <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-colors ${selected === 'warehouse_delivery' ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-teal-300'}`}>
            <input type="radio" name="type" value="warehouse_delivery" checked={selected === 'warehouse_delivery'} onChange={() => setSelected('warehouse_delivery')} className="w-4 h-4 text-teal-500" />
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-100 flex items-center justify-center"><Warehouse className="w-5 h-5 text-teal-600" /></div>
              <div>
                <p className="font-semibold text-gray-900">Warehouse Delivery</p>
                <p className="text-xs text-gray-500">Перевозки между складами, ПВЗ и клиентами</p>
              </div>
            </div>
          </label>
        </div>

        {selected !== currentType && (
          <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-xl border border-yellow-200">
            <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
            <p className="text-xs text-yellow-700">Смена типа курьера повлияет на доступные задания и финансовую модель. Активные заказы будут сохранены.</p>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Отмена</button>
          <button onClick={handleConfirm} disabled={loading || selected === currentType} className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:cursor-not-allowed">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4" />Применить</>}
          </button>
        </div>
      </div>
    </PortalModal>
  );
}

// ─── Change Vehicle Modal ─────────────────────────────────────────────────────

function VehicleModal({ currentVehicle, onConfirm, onClose }: {
  currentVehicle: Vehicle; onConfirm: (v: Vehicle) => void; onClose: () => void;
}) {
  const [selected, setSelected] = useState<Vehicle>(currentVehicle);
  const [loading, setLoading] = useState(false);

  const vehicles: { key: Vehicle; label: string; icon: string }[] = [
    { key: 'bike',    label: 'Велосипед',    icon: '🚲' },
    { key: 'scooter', label: 'Скутер',       icon: '🛵' },
    { key: 'car',     label: 'Автомобиль',   icon: '🚗' },
    { key: 'van',     label: 'Микроавтобус', icon: '🚐' },
    { key: 'truck',   label: 'Грузовик',     icon: '🚛' },
    { key: 'foot',    label: 'Пешком',       icon: '🚶' },
  ];

  const handleConfirm = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 500));
    onConfirm(selected);
  };

  return (
    <PortalModal onClose={onClose}>
      <div className="px-6 py-4 border-b bg-purple-50 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-900">Изменить транспортное средство</h3>
          <p className="text-xs text-gray-500">Текущее: {VEHICLE_LABELS[currentVehicle]}</p>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
      </div>
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {vehicles.map(v => (
            <label key={v.key} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${selected === v.key ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/30'}`}>
              <input type="radio" name="vehicle" value={v.key} checked={selected === v.key} onChange={() => setSelected(v.key)} className="w-4 h-4 text-purple-600" />
              <span className="text-lg">{v.icon}</span>
              <span className="text-sm font-medium text-gray-700">{v.label}</span>
            </label>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Отмена</button>
          <button onClick={handleConfirm} disabled={loading || selected === currentVehicle} className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:cursor-not-allowed">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4" />Сохранить</>}
          </button>
        </div>
      </div>
    </PortalModal>
  );
}

// ─── Assign Role Modal ────────────────────────────────────────────────────────

function RoleModal({ currentRole, onConfirm, onClose }: {
  currentRole: string; onConfirm: (role: string) => void; onClose: () => void;
}) {
  const [selected, setSelected] = useState(currentRole || ROLES[0]);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 500));
    onConfirm(selected);
  };

  return (
    <PortalModal onClose={onClose}>
      <div className="px-6 py-4 border-b bg-indigo-50 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-900">Назначить роль</h3>
          <p className="text-xs text-gray-500">Текущая: {currentRole || 'Курьер'}</p>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
      </div>
      <div className="p-6 space-y-4">
        <div className="space-y-2">
          {ROLES.map(r => (
            <label key={r} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${selected === r ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/40'}`}>
              <input type="radio" name="role" value={r} checked={selected === r} onChange={() => setSelected(r)} className="w-4 h-4 text-indigo-600" />
              <UserCheck className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="text-sm text-gray-700">{r}</span>
            </label>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Отмена</button>
          <button onClick={handleConfirm} disabled={loading} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><UserCheck className="w-4 h-4" />Назначить</>}
          </button>
        </div>
      </div>
    </PortalModal>
  );
}

// ─── Send Notification Modal ──────────────────────────────────────────────────

const NOTIFICATION_TYPES = [
  { value: 'info', label: 'Информационное', color: 'bg-blue-100 text-blue-700' },
  { value: 'warning', label: 'Предупреждение', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'urgent', label: 'Срочное', color: 'bg-red-100 text-red-700' },
  { value: 'bonus', label: 'Бонус / поощрение', color: 'bg-green-100 text-green-700' },
];

const NOTIFICATION_TEMPLATES = [
  'Проверьте документы в личном кабинете.',
  'Ваш рейтинг снизился. Пожалуйста, соблюдайте стандарты доставки.',
  'Вам начислен бонус за высокие показатели.',
  'Пожалуйста, свяжитесь с диспетчером.',
  'Обновление условий договора. Ознакомьтесь в приложении.',
];

function NotificationModal({ courierName, onConfirm, onClose }: {
  courierName: string; onConfirm: (type: string, text: string) => void; onClose: () => void;
}) {
  const [type, setType] = useState('info');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!text.trim()) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    onConfirm(type, text);
  };

  return (
    <PortalModal onClose={onClose} maxW="max-w-lg">
      <div className="px-6 py-4 border-b bg-yellow-50 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-900">Отправить уведомление</h3>
          <p className="text-xs text-gray-500">Получатель: {courierName}</p>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
      </div>
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Тип уведомления</label>
          <div className="grid grid-cols-2 gap-2">
            {NOTIFICATION_TYPES.map(t => (
              <label key={t.value} className={`flex items-center gap-2 p-2.5 rounded-xl border-2 cursor-pointer transition-colors ${type === t.value ? 'border-blue-500' : 'border-gray-200 hover:border-gray-300'}`}>
                <input type="radio" name="notifType" value={t.value} checked={type === t.value} onChange={() => setType(t.value)} className="w-3.5 h-3.5" />
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${t.color}`}>{t.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Шаблоны</label>
          <div className="flex flex-wrap gap-1">
            {NOTIFICATION_TEMPLATES.map(tpl => (
              <button key={tpl} onClick={() => setText(tpl)}
                className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs transition-colors text-left">
                {tpl.substring(0, 35)}…
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Текст сообщения *</label>
          <textarea
            value={text} onChange={e => setText(e.target.value)}
            placeholder="Введите текст уведомления..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none"
          />
          <p className="text-xs text-gray-400 mt-1">{text.length} символов</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Отмена</button>
          <button onClick={handleConfirm} disabled={loading || !text.trim()} className="flex-1 py-2.5 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-300 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:cursor-not-allowed">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><Bell className="w-4 h-4" />Отправить</>}
          </button>
        </div>
      </div>
    </PortalModal>
  );
}

// ─── Disable Shift Modal ──────────────────────────────────────────────────────

function DisableShiftModal({ courierName, onConfirm, onClose }: {
  courierName: string; onConfirm: (reason: string) => void; onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    onConfirm(reason.trim() || 'Принудительное завершение смены');
  };

  return (
    <PortalModal onClose={onClose}>
      <div className="px-6 py-4 border-b bg-gray-100 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-900">Отключить смену</h3>
          <p className="text-xs text-gray-500">{courierName}</p>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
      </div>
      <div className="p-6 space-y-4">
        <div className="p-4 bg-orange-50 rounded-xl border border-orange-200 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-orange-800">Принудительное завершение смены</p>
            <p className="text-xs text-orange-700 mt-1">Курьер будет переведён в статус «Офлайн». Активные задания будут переназначены диспетчером.</p>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Причина (необязательно)</label>
          <textarea
            value={reason} onChange={e => setReason(e.target.value)}
            placeholder="Укажите причину отключения смены..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none"
          />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Отмена</button>
          <button onClick={handleConfirm} disabled={loading} className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><Ban className="w-4 h-4" />Отключить смену</>}
          </button>
        </div>
      </div>
    </PortalModal>
  );
}

// ─── Live Map (SVG, ResizeObserver pattern) ───────────────────────────────────

function LiveMap({ courier }: { courier: Courier }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  const H = 280;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const raf = requestAnimationFrame(() => setW(el.clientWidth));
    const ro = new ResizeObserver(() => requestAnimationFrame(() => setW(el.clientWidth)));
    ro.observe(el);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  const isFast = courier.courier_type === 'fast_delivery';
  const LAT_MIN = 55.68, LAT_MAX = 55.83, LNG_MIN = 37.49, LNG_MAX = 37.74;
  const toX = (lng: number) => w > 0 ? ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * w : 0;
  const toY = (lat: number) => H > 0 ? ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * H : 0;

  const cx = toX(courier.gpsLng);
  const cy = toY(courier.gpsLat);
  const pkX = courier.pickupLat ? toX(courier.pickupLng!) : null;
  const pkY = courier.pickupLat ? toY(courier.pickupLat) : null;
  const dlX = courier.deliveryLat ? toX(courier.deliveryLng!) : null;
  const dlY = courier.deliveryLat ? toY(courier.deliveryLat) : null;

  const hLines = [0.15, 0.3, 0.45, 0.6, 0.75, 0.88];
  const vLines = [0.12, 0.27, 0.42, 0.57, 0.72, 0.87];

  return (
    <div ref={containerRef} className="relative w-full rounded-xl overflow-hidden border border-gray-200 bg-slate-100">
      {w > 0 && (
        <svg width={w} height={H} className="block">
          <rect width={w} height={H} fill="#e8edf2" />
          <rect x={w * 0.42} y={H * 0.28} width={w * 0.16} height={H * 0.22} fill="#bbf7d0" rx={5} opacity={0.8} />
          <text x={w * 0.5} y={H * 0.4} textAnchor="middle" fontSize={10} fill="#16a34a" fontWeight={600}>Парк</text>
          {hLines.map((r, i) => (
            <rect key={`h${i}`} x={0} y={H * r - 6} width={w} height={12} fill="white" opacity={0.75} />
          ))}
          {vLines.map((r, i) => (
            <rect key={`v${i}`} x={w * r - 6} y={0} width={12} height={H} fill="white" opacity={0.75} />
          ))}
          {[
            [0.14,0.17,0.11,0.11],[0.27,0.17,0.13,0.11],[0.44,0.17,0.11,0.09],
            [0.59,0.17,0.11,0.11],[0.75,0.17,0.1,0.11],
            [0.14,0.32,0.11,0.11],[0.27,0.32,0.13,0.11],[0.75,0.32,0.1,0.11],
            [0.14,0.47,0.11,0.11],[0.27,0.47,0.13,0.11],[0.44,0.47,0.11,0.11],[0.59,0.47,0.11,0.11],[0.75,0.47,0.1,0.11],
            [0.14,0.63,0.11,0.1],[0.27,0.63,0.13,0.1],[0.44,0.63,0.11,0.1],[0.59,0.63,0.11,0.1],[0.75,0.63,0.1,0.1],
            [0.14,0.76,0.11,0.1],[0.27,0.76,0.13,0.1],[0.44,0.76,0.11,0.1],[0.59,0.76,0.11,0.1],[0.75,0.76,0.1,0.1],
          ].map(([bx, by, bw, bh], i) => (
            <rect key={i} x={w*bx} y={H*by} width={w*bw} height={H*bh} fill="#cdd5df" rx={3} />
          ))}

          {pkX !== null && dlX !== null && (
            <polyline
              points={`${pkX},${pkY} ${cx},${cy} ${dlX},${dlY}`}
              fill="none"
              stroke={isFast ? '#f97316' : '#0ea5e9'}
              strokeWidth={3}
              strokeDasharray={isFast ? '10,5' : '0'}
              opacity={0.85}
            />
          )}

          {pkX !== null && (
            <g>
              <circle cx={pkX} cy={pkY!} r={10} fill={isFast ? '#ef4444' : '#f59e0b'} />
              <text x={pkX} y={pkY! + 4} textAnchor="middle" fontSize={10} fill="white" fontWeight={700}>
                {isFast ? 'R' : 'O'}
              </text>
              <rect x={pkX! - 28} y={pkY! - 28} width={56} height={14} fill="white" rx={3} opacity={0.9} />
              <text x={pkX} y={pkY! - 18} textAnchor="middle" fontSize={8} fill="#374151">
                {isFast ? 'Ресторан' : 'Откуда'}
              </text>
            </g>
          )}

          {dlX !== null && (
            <g>
              <circle cx={dlX} cy={dlY!} r={10} fill="#22c55e" />
              <text x={dlX} y={dlY! + 4} textAnchor="middle" fontSize={10} fill="white" fontWeight={700}>
                {isFast ? 'C' : 'P'}
              </text>
              <rect x={dlX! - 24} y={dlY! - 28} width={48} height={14} fill="white" rx={3} opacity={0.9} />
              <text x={dlX} y={dlY! - 18} textAnchor="middle" fontSize={8} fill="#374151">
                {isFast ? 'Клиент' : 'Куда'}
              </text>
            </g>
          )}

          <circle cx={cx} cy={cy} r={18} fill="#2563eb" opacity={0.15}>
            <animate attributeName="r" values="8;22;8" dur="2.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.2;0;0.2" dur="2.5s" repeatCount="indefinite" />
          </circle>
          <circle cx={cx} cy={cy} r={9} fill="#2563eb" stroke="white" strokeWidth={2.5} />
          <text x={cx} y={cy + 4} textAnchor="middle" fontSize={9} fill="white" fontWeight={700}>
            {courier.courier_type === 'fast_delivery' ? '⚡' : '📦'}
          </text>

          <rect x={4} y={H - 20} width={180} height={16} fill="black" opacity={0.35} rx={3} />
          <text x={8} y={H - 8} fontSize={9} fill="white">
            {courier.gpsLat.toFixed(4)}°N {courier.gpsLng.toFixed(4)}°E · {courier.gpsUpdated}
          </text>

          <rect x={w - 120} y={4} width={116} height={pkX !== null ? 52 : 22} fill="white" rx={4} opacity={0.9} />
          <circle cx={w - 108} cy={14} r={5} fill="#2563eb" />
          <text x={w - 100} y={18} fontSize={9} fill="#374151">Курьер</text>
          {pkX !== null && (
            <g>
              <circle cx={w - 108} cy={30} r={5} fill={isFast ? '#ef4444' : '#f59e0b'} />
              <text x={w - 100} y={34} fontSize={9} fill="#374151">{isFast ? 'Ресторан' : 'Откуда'}</text>
              <circle cx={w - 108} cy={46} r={5} fill="#22c55e" />
              <text x={w - 100} y={50} fontSize={9} fill="#374151">{isFast ? 'Клиент' : 'Куда'}</text>
            </g>
          )}
        </svg>
      )}

      <div className="absolute top-3 left-3 flex flex-col gap-1.5">
        <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm ${STATUS_CFG[courier.status]?.bg} ${STATUS_CFG[courier.status]?.color}`}>
          <span className={`w-2 h-2 rounded-full ${STATUS_CFG[courier.status]?.dot} ${courier.status !== 'offline' ? 'animate-pulse' : ''}`} />
          {STATUS_CFG[courier.status]?.label}
        </div>
        <div className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs text-gray-700 shadow-sm">
          Обн.: {courier.gpsUpdated}
        </div>
      </div>
    </div>
  );
}

// ─── Finance Bar Chart ────────────────────────────────────────────────────────

type FinPeriod = 'week' | '2weeks';

function FinanceChart({ data }: { data: DailyFinance[] }) {
  const [period, setPeriod] = useState<FinPeriod>('week');
  const [field, setField] = useState<'net' | 'earnings' | 'tips' | 'bonuses'>('net');

  const slice = period === 'week' ? data.slice(-7) : data;

  const total = slice.reduce((s, d) => s + d[field], 0);
  const totalDeliveries = slice.reduce((s, d) => s + d.deliveries, 0);
  const totalFines = slice.reduce((s, d) => s + d.fines, 0);

  const FIELD_COLORS: Record<string, string> = { net: '#2563eb', earnings: '#16a34a', tips: '#f59e0b', bonuses: '#8b5cf6' };
  const color = FIELD_COLORS[field];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
          {(['week', '2weeks'] as FinPeriod[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 font-medium transition-colors ${period === p ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              {p === 'week' ? '7 дней' : '14 дней'}
            </button>
          ))}
        </div>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
          {([['net','Чистый'], ['earnings','Заработок'], ['tips','Чаевые'], ['bonuses','Бонусы']] as [typeof field, string][]).map(([f, lbl]) => (
            <button key={f} onClick={() => setField(f)}
              className={`px-3 py-1.5 font-medium transition-colors ${field === f ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
          <p className="text-lg font-bold text-blue-700">₽{fmt(total)}</p>
          <p className="text-[10px] text-blue-600 mt-0.5">Итого за период</p>
        </div>
        <div className="bg-green-50 rounded-xl p-3 text-center border border-green-100">
          <p className="text-lg font-bold text-green-700">{totalDeliveries}</p>
          <p className="text-[10px] text-green-600 mt-0.5">Доставок</p>
        </div>
        <div className={`rounded-xl p-3 text-center border ${totalFines > 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
          <p className={`text-lg font-bold ${totalFines > 0 ? 'text-red-600' : 'text-gray-400'}`}>₽{fmt(totalFines)}</p>
          <p className={`text-[10px] mt-0.5 ${totalFines > 0 ? 'text-red-500' : 'text-gray-400'}`}>Штрафы</p>
        </div>
      </div>

      <ChartWrapper height={200} className="rounded-xl border border-gray-100 overflow-hidden">
        {(w, h) => (
          <BarChart key={`${period}-${field}`} width={w} height={h} data={slice} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis key="x-axis" dataKey="date" tickFormatter={(v: string) => v.substring(0, 5)} tick={{ fontSize: 10 }} />
            <YAxis key="y-axis" tick={{ fontSize: 10 }} domain={[0, 'auto']} allowDuplicatedCategory={false} />
            <Tooltip
              key="tooltip"
              formatter={(v: number) => [`₽${fmt(v)}`, field]}
              labelFormatter={(_: string, payload: any[]) => payload?.[0]?.payload?.date ?? ''}
            />
            <Bar key={`bar-${field}`} dataKey={field} radius={[4, 4, 0, 0]} fill={color} />
          </BarChart>
        )}
      </ChartWrapper>

      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-2.5 text-gray-500 font-semibold">Дата</th>
              <th className="text-center px-3 py-2.5 text-gray-500 font-semibold">Доставок</th>
              <th className="text-center px-3 py-2.5 text-gray-500 font-semibold">Заработок</th>
              <th className="text-center px-3 py-2.5 text-gray-500 font-semibold">Чаевые</th>
              <th className="text-center px-3 py-2.5 text-gray-500 font-semibold">Бонусы</th>
              <th className="text-center px-3 py-2.5 text-gray-500 font-semibold">Штрафы</th>
              <th className="text-center px-3 py-2.5 text-gray-500 font-semibold">Чистый</th>
            </tr>
          </thead>
          <tbody>
            {[...slice].reverse().map(d => (
              <tr key={d.date} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-2.5 font-medium text-gray-700">{d.date} <span className="text-gray-400">{d.label}</span></td>
                <td className="px-3 py-2.5 text-center font-medium text-blue-700">{d.deliveries}</td>
                <td className="px-3 py-2.5 text-center text-gray-700">₽{fmt(d.earnings)}</td>
                <td className="px-3 py-2.5 text-center text-yellow-700">{d.tips > 0 ? `₽${fmt(d.tips)}` : '—'}</td>
                <td className="px-3 py-2.5 text-center text-purple-700">{d.bonuses > 0 ? `₽${fmt(d.bonuses)}` : '—'}</td>
                <td className="px-3 py-2.5 text-center text-red-600">{d.fines > 0 ? `-₽${fmt(d.fines)}` : '—'}</td>
                <td className="px-3 py-2.5 text-center font-bold text-blue-700">₽{fmt(d.net)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Orders Tab (Fast Delivery) ───────────────────────────────────────────────

function OrdersTab({ orders }: { orders: CourierOrder[] }) {
  const [statusF, setStatusF] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<CourierOrder | null>(null);

  const filtered = orders.filter(o => statusF === 'all' || o.status === statusF);

  return (
    <div style={{display:'contents'}}>
      <div className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
            {[['all','Все'], ['completed','Выполненные'], ['cancelled','Отменённые'], ['problem','Проблемные']].map(([v, l]) => (
              <button key={v} onClick={() => setStatusF(v)}
                className={`px-3 py-1.5 font-medium transition-colors ${statusF === v ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                {l}
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-400">{filtered.length} заказов</span>
        </div>

        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-2.5 text-gray-500 font-semibold">Заказ / Дата</th>
                <th className="text-left px-3 py-2.5 text-gray-500 font-semibold">Ресторан → Клиент</th>
                <th className="text-center px-3 py-2.5 text-gray-500 font-semibold">Км / мин</th>
                <th className="text-center px-3 py-2.5 text-gray-500 font-semibold">Заработок</th>
                <th className="text-center px-3 py-2.5 text-gray-500 font-semibold">CSAT</th>
                <th className="text-center px-3 py-2.5 text-gray-500 font-semibold">Статус</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 50).map(o => (
                <tr key={o.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelectedOrder(o)}>
                  <td className="px-4 py-3">
                    <p className="font-mono font-semibold text-gray-800">{o.id.replace('ord-', '#')}</p>
                    <p className="text-gray-400">{o.date} {o.time}</p>
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-medium text-gray-700 truncate max-w-[160px]">{o.restaurantName}</p>
                    <p className="text-gray-400 truncate max-w-[160px]">{o.clientAddr}</p>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <p className="font-medium text-gray-700">{o.distance} км</p>
                    <p className="text-gray-400">{o.duration} мин</p>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <p className="font-bold text-green-700">₽{fmt(o.courierFee)}</p>
                    {o.tip > 0 && <p className="text-yellow-600">+₽{o.tip} 🎁</p>}
                    {o.fine > 0 && <p className="text-red-500">-₽{o.fine}</p>}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {o.clientRating ? <span className="font-medium text-yellow-700">{'⭐'.repeat(o.clientRating)}</span> : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      o.status === 'completed' ? 'bg-green-100 text-green-700' :
                      o.status === 'cancelled' ? 'bg-gray-100 text-gray-600' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {o.status === 'completed' ? 'Выполнен' : o.status === 'cancelled' ? 'Отменён' : 'Проблема'}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedOrder && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={() => setSelectedOrder(null)}>
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className={`px-6 py-4 border-b ${selectedOrder.status === 'completed' ? 'bg-green-50' : selectedOrder.status === 'cancelled' ? 'bg-gray-50' : 'bg-red-50'}`}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Заказ {selectedOrder.id.replace('ord-', '#')}</h3>
                <button onClick={() => setSelectedOrder(null)} className="p-1.5 hover:bg-gray-200 rounded-lg"><XCircle className="w-4 h-4 text-gray-500" /></button>
              </div>
              <p className="text-sm text-gray-500">{selectedOrder.date} в {selectedOrder.time}</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { l: 'Ресторан', v: selectedOrder.restaurantName },
                  { l: 'Адрес ресторана', v: selectedOrder.restaurantAddr },
                  { l: 'Адрес клиента', v: selectedOrder.clientAddr },
                  { l: 'Стоимость заказа', v: `₽${fmt(selectedOrder.orderAmount)}` },
                  { l: 'Расстояние', v: `${selectedOrder.distance} км` },
                  { l: 'Время доставки', v: `${selectedOrder.duration} мин` },
                  { l: 'Заработок курьера', v: `₽${fmt(selectedOrder.courierFee)}` },
                  { l: 'Чаевые', v: selectedOrder.tip > 0 ? `₽${fmt(selectedOrder.tip)}` : '—' },
                  { l: 'Бонус', v: selectedOrder.bonus > 0 ? `₽${fmt(selectedOrder.bonus)}` : '—' },
                  { l: 'Штраф', v: selectedOrder.fine > 0 ? `₽${fmt(selectedOrder.fine)}` : '—' },
                  { l: 'Оценка клиента', v: selectedOrder.clientRating ? '⭐'.repeat(selectedOrder.clientRating) : '—' },
                  { l: 'Статус', v: selectedOrder.status === 'completed' ? 'Выполнен' : selectedOrder.status === 'cancelled' ? 'Отменён' : 'Проблема' },
                ].map(({ l, v }) => (
                  <div key={l}>
                    <p className="text-[10px] text-gray-400">{l}</p>
                    <p className="text-sm font-medium text-gray-800 mt-0.5">{v}</p>
                  </div>
                ))}
              </div>
              {selectedOrder.cancelReason && (
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                  <p className="text-xs font-semibold text-gray-600">Причина отмены:</p>
                  <p className="text-sm text-gray-700 mt-1">{selectedOrder.cancelReason}</p>
                </div>
              )}
              {selectedOrder.problemDesc && (
                <div className="bg-red-50 rounded-xl p-3 border border-red-200">
                  <p className="text-xs font-semibold text-red-600">Описание проблемы:</p>
                  <p className="text-sm text-red-700 mt-1">{selectedOrder.problemDesc}</p>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ─── Tasks Tab (Warehouse) ────────────────────────────────────────────────────

function TasksTab({ tasks }: { tasks: WarehouseTask[] }) {
  const [statusF, setStatusF] = useState<string>('all');
  const [selectedTask, setSelectedTask] = useState<WarehouseTask | null>(null);

  const filtered = tasks.filter(t => statusF === 'all' || t.status === statusF);

  return (
    <div style={{display:'contents'}}>
      <div className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
            {[['all','Все'], ['completed','Выполненные'], ['pending','Ожидание'], ['in_progress','В работе'], ['problem','Проблемные']].map(([v, l]) => (
              <button key={v} onClick={() => setStatusF(v)}
                className={`px-3 py-1.5 font-medium transition-colors ${statusF === v ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                {l}
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-400">{filtered.length} задач</span>
        </div>

        <div className="space-y-2">
          {filtered.slice(0, 40).map(task => {
            const tc = TASK_TYPE_CFG[task.type];
            return (
              <button key={task.id} onClick={() => setSelectedTask(task)}
                className="w-full flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all text-left">
                <div className={`px-2.5 py-1.5 rounded-xl text-xs font-bold shrink-0 ${tc.bg} ${tc.color}`}>{tc.label}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900">{task.fromName}</p>
                    <ChevronRight className="w-3 h-3 text-gray-400" />
                    <p className="text-sm font-semibold text-gray-900">{task.toName}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                    <span className="flex items-center gap-1"><Package className="w-3 h-3" />{task.packages} мест, {task.items} товаров</span>
                    <span>{task.weight} кг</span>
                    <span className="font-mono text-blue-600">{task.manifest}</span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">{task.date} {task.time}</p>
                </div>
                <div className="shrink-0 text-right">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    task.status === 'completed' ? 'bg-green-100 text-green-700' :
                    task.status === 'pending' ? 'bg-gray-100 text-gray-600' :
                    task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {task.status === 'completed' ? 'Выполнено' : task.status === 'pending' ? 'Ожидание' : task.status === 'in_progress' ? 'В работе' : 'Проблема'}
                  </span>
                  <p className="text-xs font-bold text-green-700 mt-1">₽{fmt(task.fee)}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedTask && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={() => setSelectedTask(null)}>
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b bg-blue-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900">Задача {selectedTask.id.replace('task-', '#')}</h3>
                <p className="text-sm text-gray-500">{selectedTask.date} в {selectedTask.time}</p>
              </div>
              <button onClick={() => setSelectedTask(null)} className="p-1.5 hover:bg-gray-200 rounded-lg"><XCircle className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className={`inline-flex px-3 py-1 rounded-xl text-sm font-bold ${TASK_TYPE_CFG[selectedTask.type].bg} ${TASK_TYPE_CFG[selectedTask.type].color}`}>
                {TASK_TYPE_CFG[selectedTask.type].label}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { l: 'Откуда (название)', v: selectedTask.fromName },
                  { l: 'Откуда (адрес)', v: selectedTask.fromAddr },
                  { l: 'Куда (название)', v: selectedTask.toName },
                  { l: 'Куда (адрес)', v: selectedTask.toAddr },
                  { l: 'Мест / Товаров', v: `${selectedTask.packages} / ${selectedTask.items}` },
                  { l: 'Вес', v: `${selectedTask.weight} кг` },
                  { l: 'Накладная', v: selectedTask.manifest },
                  { l: 'Вознаграждение', v: `₽${fmt(selectedTask.fee)}` },
                ].map(({ l, v }) => (
                  <div key={l}>
                    <p className="text-[10px] text-gray-400">{l}</p>
                    <p className="text-sm font-medium text-gray-800 mt-0.5">{v}</p>
                  </div>
                ))}
              </div>
              {selectedTask.problemDesc && (
                <div className="bg-red-50 rounded-xl p-3 border border-red-200">
                  <p className="text-xs font-semibold text-red-600">Проблема:</p>
                  <p className="text-sm text-red-700 mt-1">{selectedTask.problemDesc}</p>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ─── Stats Tab ────────────────────────────────────────────────────────────────

function StatsTab({ courier }: { courier: Courier }) {
  const completedOrders = courier.orders.filter(o => o.status === 'completed');
  const cancelledOrders = courier.orders.filter(o => o.status === 'cancelled');
  const problemOrders = courier.orders.filter(o => o.status === 'problem');
  const csatOrders = completedOrders.filter(o => o.clientRating !== undefined);
  const avgCsat = csatOrders.length ? (csatOrders.reduce((s, o) => s + (o.clientRating ?? 0), 0) / csatOrders.length).toFixed(2) : '—';
  const avgDuration = completedOrders.length ? Math.round(completedOrders.reduce((s, o) => s + o.duration, 0) / completedOrders.length) : 0;
  const totalEarned = courier.dailyFinance.reduce((s, d) => s + d.net, 0);

  const completedTasks = courier.tasks.filter(t => t.status === 'completed');
  const problemTasks = courier.tasks.filter(t => t.status === 'problem');

  const isFast = courier.courier_type === 'fast_delivery';

  const kpis = isFast ? [
    { label: 'Всего заказов (30 дн.)', value: courier.orders.length, sub: '', color: 'blue' },
    { label: 'Выполнено', value: completedOrders.length, sub: `${courier.orders.length > 0 ? Math.round(completedOrders.length / courier.orders.length * 100) : 0}%`, color: 'green' },
    { label: 'Отменено', value: cancelledOrders.length, sub: `${courier.cancelRate}% cancellation rate`, color: 'red' },
    { label: 'Проблемные', value: problemOrders.length, sub: `${courier.problemRate}% problem rate`, color: 'orange' },
    { label: 'Ср. время доставки', value: avgDuration > 0 ? `${avgDuration} мин` : '—', sub: '', color: 'purple' },
    { label: 'Ср. оценка CSAT', value: avgCsat, sub: `из ${csatOrders.length} оценок`, color: 'yellow' },
    { label: 'Заработано (14 дн.)', value: `₽${fmt(totalEarned)}`, sub: '', color: 'teal' },
    { label: 'Всего за всё время', value: `₽${fmt(courier.earningsTotal)}`, sub: `${courier.totalOrders} заказов`, color: 'indigo' },
  ] : [
    { label: 'Всего задач (30 дн.)', value: courier.tasks.length, sub: '', color: 'blue' },
    { label: 'Выполнено', value: completedTasks.length, sub: `${courier.tasks.length > 0 ? Math.round(completedTasks.length / courier.tasks.length * 100) : 0}%`, color: 'green' },
    { label: 'Проблемные', value: problemTasks.length, sub: `${courier.problemRate}% problem rate`, color: 'red' },
    { label: 'Общий вес (кг)', value: courier.tasks.reduce((s, t) => s + t.weight, 0).toFixed(0), sub: 'за 30 дней', color: 'orange' },
    { label: 'Общий объём (мест)', value: courier.tasks.reduce((s, t) => s + t.packages, 0), sub: 'за 30 дней', color: 'purple' },
    { label: 'Товаров перевезено', value: courier.tasks.reduce((s, t) => s + t.items, 0), sub: 'за 30 дней', color: 'yellow' },
    { label: 'Заработано (14 дн.)', value: `₽${fmt(totalEarned)}`, sub: '', color: 'teal' },
    { label: 'Всего за всё время', value: `₽${fmt(courier.earningsTotal)}`, sub: `${courier.totalOrders} задач`, color: 'indigo' },
  ];

  const COLOR_MAP: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700', green: 'bg-green-50 border-green-200 text-green-700',
    red: 'bg-red-50 border-red-200 text-red-700', orange: 'bg-orange-50 border-orange-200 text-orange-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700', yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    teal: 'bg-teal-50 border-teal-200 text-teal-700', indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map((k, i) => (
          <button
            key={k.label}
            onClick={() => toast.info(k.label, { description: `${k.value}${k.sub ? ' · ' + k.sub : ''}` })}
            className={`rounded-xl border p-4 text-left transition-all cursor-pointer hover:shadow-md active:scale-[0.97] ${COLOR_MAP[k.color]}`}
          >
            <p className="text-xl font-bold">{k.value}</p>
            <p className="text-xs font-semibold mt-0.5 opacity-80">{k.label}</p>
            {k.sub && <p className="text-[10px] opacity-60 mt-0.5">{k.sub}</p>}
          </button>
        ))}
      </div>

      {isFast && csatOrders.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 text-yellow-500" />Оценки от клиентов
          </p>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map(score => {
              const cnt = csatOrders.filter(o => o.clientRating === score).length;
              const pct = csatOrders.length ? Math.round(cnt / csatOrders.length * 100) : 0;
              return (
                <div key={score} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-3">{score}</span>
                  <Star className="w-3 h-3 text-yellow-400 shrink-0" />
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${score >= 4 ? 'bg-green-500' : score === 3 ? 'bg-yellow-400' : 'bg-red-400'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 w-6 text-right">{cnt}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main CourierDetail ───────────────────────────────────────────────────────

type Tab = 'profile' | 'map' | 'orders' | 'finance' | 'stats' | 'timereport' | 'documents' | 'contract' | 'history' | 'chat' | 'audit';

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'profile',    label: 'Профиль',        icon: User },
  { key: 'map',        label: 'Карта',           icon: Map },
  { key: 'orders',     label: 'Заказы/Задачи',   icon: Package },
  { key: 'finance',    label: 'Финансы',         icon: DollarSign },
  { key: 'stats',      label: 'Статистика',      icon: BarChart3 },
  { key: 'timereport', label: 'Хронометраж',     icon: Clock },
  { key: 'documents',  label: 'Документы',       icon: FileText },
  { key: 'contract',   label: 'Контракт',        icon: ClipboardList },
  { key: 'history',    label: 'История',         icon: History },
  { key: 'chat',       label: 'Чат',             icon: MessageCircle },
  { key: 'audit',      label: 'Аудит',           icon: Shield },
];

type ActiveModal = 'block' | 'zone' | 'type' | 'vehicle' | 'role' | 'notification' | 'shift' | null;

export function CourierDetail() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>('profile');
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Mutable local courier state (deep copy from mock)
  const [courierData, setCourierData] = useState<Courier>(() => {
    const found = COURIERS_MOCK.find(c => c.id === id) ?? COURIERS_MOCK[0];
    return { ...found };
  });

  // Role label (not in Courier type, managed locally)
  const [courierRole, setCourierRole] = useState('Курьер');

  // 🔍 Runtime nested-button detector — remove after diagnosis
  useDetectNestedButtons(`CourierDetail[tab=${tab}]`);

  const isFast = courierData.courier_type === 'fast_delivery';
  const st = STATUS_CFG[courierData.status] ?? STATUS_CFG.offline;

  function addAuditEntry(action: string, field?: string, before?: string, after?: string) {
    const entry: AuditEntry = {
      id: `audit-${Date.now()}`,
      timestamp: now(),
      actor: 'Администратор',
      actorRole: 'Admin',
      action,
      field,
      before,
      after,
    };
    setCourierData(prev => ({
      ...prev,
      auditLog: [entry, ...prev.auditLog],
    }));
  }

  function showSuccess(msg: string) {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 4000);
  }

  // ── Action handlers ──────────────────────────────────────────────────────────

  const handleBlock = (reason: string) => {
    const newBlocked = !courierData.blocked;
    const before = courierData.blocked ? 'Заблокирован' : 'Активен';
    const after = newBlocked ? 'Заблокирован' : 'Активен';
    setCourierData(prev => ({ ...prev, blocked: newBlocked }));
    addAuditEntry(
      newBlocked ? `Курьер заблокирован. Причина: ${reason}` : `Курьер разблокирован. Комментарий: ${reason}`,
      'blocked', before, after
    );
    setActiveModal(null);
    toast[newBlocked ? 'error' : 'success'](
      newBlocked ? `Курьер заблокирован` : `Курьер разблокирован`,
      { description: reason }
    );
    showSuccess(newBlocked ? `✓ ${courierData.name} заблокирован` : `✓ ${courierData.name} разблокирован`);
  };

  const handleZone = (zone: string) => {
    const before = courierData.zone;
    setCourierData(prev => ({ ...prev, zone }));
    addAuditEntry('Изменена зона доставки', 'zone', before, zone);
    setActiveModal(null);
    toast.success('Зона доставки изменена', { description: `${before} → ${zone}` });
    showSuccess(`✓ Зона изменена на «${zone}»`);
  };

  const handleCourierType = (type: CourierType) => {
    const before = courierData.courier_type === 'fast_delivery' ? 'Fast Delivery' : 'Warehouse Delivery';
    const after = type === 'fast_delivery' ? 'Fast Delivery' : 'Warehouse Delivery';
    setCourierData(prev => ({ ...prev, courier_type: type }));
    addAuditEntry('Изменён тип курьера', 'courier_type', before, after);
    setActiveModal(null);
    toast.success('Тип курьера изменён', { description: `${before} → ${after}` });
    showSuccess(`✓ Тип курьера изменён на «${after}»`);
  };

  const handleVehicle = (vehicle: Vehicle) => {
    const before = VEHICLE_LABELS[courierData.vehicle];
    const after = VEHICLE_LABELS[vehicle];
    setCourierData(prev => ({ ...prev, vehicle }));
    addAuditEntry('Изменён транспорт', 'vehicle', before, after);
    setActiveModal(null);
    toast.success('Транспортное средство изменено', { description: `${before} → ${after}` });
    showSuccess(`✓ Транспорт изменён на «${after}»`);
  };

  const handleRole = (role: string) => {
    const before = courierRole;
    setCourierRole(role);
    addAuditEntry('Изменена роль', 'role', before, role);
    setActiveModal(null);
    toast.success('Роль назначена', { description: `${courierData.name} → ${role}` });
    showSuccess(`✓ Роль изменена на «${role}»`);
  };

  const handleNotification = (type: string, text: string) => {
    const typeLabels: Record<string, string> = { info: 'Информационное', warning: 'Предупреждение', urgent: 'Срочное', bonus: 'Бонус' };
    addAuditEntry(`Отправлено уведомление (${typeLabels[type] ?? type}): ${text.substring(0, 60)}${text.length > 60 ? '…' : ''}`);
    setActiveModal(null);
    toast.success('Уведомление отправлено', { description: text.substring(0, 60) });
    showSuccess('✓ Уведомление отправлено курьеру');
  };

  const handleShiftDisable = (reason: string) => {
    const before = STATUS_CFG[courierData.status]?.label ?? courierData.status;
    setCourierData(prev => ({ ...prev, status: 'offline' }));
    addAuditEntry(`Смена принудительно завершена. ${reason}`, 'status', before, 'Офлайн');
    setActiveModal(null);
    toast.warning('Смена завершена принудительно', { description: reason });
    showSuccess('✓ Смена завершена, курьер переведён в офлайн');
  };

  return (
    <div className="space-y-5">
      {/* Back + header */}
      <div className="flex items-center gap-4 flex-wrap">
        <Link to="/couriers" className="p-2 hover:bg-gray-100 rounded-lg transition-colors shrink-0">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative shrink-0">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-lg ${isFast ? 'bg-gradient-to-br from-orange-400 to-yellow-500' : 'bg-gradient-to-br from-teal-500 to-blue-600'}`}>
              {courierData.avatar}
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white ${st.dot}`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900 truncate">{courierData.name}</h1>
              <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold ${isFast ? 'bg-orange-100 text-orange-700' : 'bg-teal-100 text-teal-700'}`}>
                {isFast ? <Zap className="w-3 h-3" /> : <Warehouse className="w-3 h-3" />}
                {isFast ? 'Fast Delivery' : 'Warehouse Delivery'}
              </span>
              {courierData.blocked && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">🔒 Заблокирован</span>}
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap mt-0.5">
              <span>ID: #{courierData.id}</span>
              <span>{courierData.phone}</span>
              <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${st.bg} ${st.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{st.label}
              </span>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2 shrink-0">
          <a href={`tel:${courierData.phone}`} className="flex items-center gap-1.5 px-3 py-2 bg-green-100 text-green-700 rounded-xl text-sm font-medium hover:bg-green-200 transition-colors">
            <Phone className="w-4 h-4" />Звонок
          </a>
          <button onClick={() => setTab('chat')} className="flex items-center gap-1.5 px-3 py-2 bg-blue-100 text-blue-700 rounded-xl text-sm font-medium hover:bg-blue-200 transition-colors">
            <MessageCircle className="w-4 h-4" />Чат
          </button>
        </div>
      </div>

      {/* Action success toast */}
      {actionSuccess && (
        <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-medium">
          <CheckCircle2 className="w-4 h-4" />{actionSuccess}
        </div>
      )}

      {/* Tab bar */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex overflow-x-auto border-b border-gray-200 scrollbar-hide">
          {TABS.map(t => {
            const TIcon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors -mb-px ${
                  tab === t.key ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <TIcon className="w-3.5 h-3.5" />{t.label}
                {t.key === 'chat' && <span className="min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">2</span>}
                {t.key === 'audit' && courierData.auditLog.length > 0 && (
                  <span className="min-w-[16px] h-4 px-0.5 bg-blue-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {Math.min(courierData.auditLog.length, 99)}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="p-5">

          {/* ── ПРОФИЛЬ ── */}
          {tab === 'profile' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-5">
                {/* Main info */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {[
                    { l: 'ФИО', v: courierData.name },
                    { l: 'ID курьера', v: `#${courierData.id}` },
                    { l: 'Телефон', v: courierData.phone },
                    { l: 'Email', v: courierData.email },
                    { l: 'Тип курьера', v: isFast ? 'Fast Delivery' : 'Warehouse Delivery' },
                    { l: 'Транспорт', v: VEHICLE_LABELS[courierData.vehicle] },
                    { l: 'Зона', v: courierData.zone },
                    { l: 'Регион', v: courierData.region },
                    { l: 'Дата регистрации', v: courierData.registeredAt },
                    { l: 'Последний онлайн', v: courierData.lastOnline },
                    { l: 'Тип контракта', v: CONTRACT_LABELS[courierData.contractType] },
                    { l: 'Статус контракта', v: courierData.contractStatus === 'active' ? '✅ Активный' : '❌ Не активен' },
                  ].map(({ l, v }) => (
                    <div key={l} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                      <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">{l}</p>
                      <p className="text-sm font-semibold text-gray-800 mt-0.5 break-all">{v}</p>
                    </div>
                  ))}
                </div>

                {/* KPI strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { bg: 'bg-yellow-50 border-yellow-200', color: 'text-yellow-700', sub: 'text-yellow-600', value: `⭐ ${courierData.rating}`, label: 'Рейтинг', tab: 'stats' },
                    { bg: 'bg-green-50 border-green-200',   color: 'text-green-700',  sub: 'text-green-600',  value: courierData.totalOrders.toLocaleString(), label: 'Всего заказов', tab: 'orders' },
                    { bg: 'bg-blue-50 border-blue-200',     color: 'text-blue-700',   sub: 'text-blue-600',   value: `${courierData.cancelRate}%`, label: 'Отмен', tab: 'orders' },
                    { bg: `${courierData.problemRate > 2 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`, color: `${courierData.problemRate > 2 ? 'text-red-600' : 'text-gray-700'}`, sub: `${courierData.problemRate > 2 ? 'text-red-500' : 'text-gray-500'}`, value: `${courierData.problemRate}%`, label: 'Проблем', tab: 'stats' },
                  ].map((k, i) => (
                    <button
                      key={i}
                      onClick={() => setTab(k.tab as any)}
                      className={`rounded-xl p-3 text-center border cursor-pointer hover:shadow-md active:scale-[0.97] transition-all ${k.bg}`}
                    >
                      <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
                      <p className={`text-xs mt-0.5 ${k.sub}`}>{k.label}</p>
                    </button>
                  ))}
                </div>

                {/* Fast delivery current order */}
                {isFast && courierData.currentOrderId && (
                  <div className="bg-indigo-50 rounded-xl border border-indigo-200 p-4">
                    <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" />Текущий заказ
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] text-indigo-500">Ресторан</p>
                        <p className="text-sm font-semibold text-indigo-900 mt-0.5">{courierData.currentRestaurant}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-indigo-500">Клиент</p>
                        <p className="text-sm font-semibold text-indigo-900 mt-0.5">{courierData.currentClient}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-indigo-500">Ср. время доставки</p>
                        <p className="text-sm font-semibold text-indigo-900 mt-0.5">{courierData.avgDeliveryMin} мин</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-indigo-500">GPS обновлено</p>
                        <p className="text-sm font-semibold text-indigo-900 mt-0.5">{courierData.gpsUpdated}</p>
                      </div>
                    </div>
                    <button onClick={() => setTab('map')} className="mt-3 flex items-center gap-1.5 text-xs text-indigo-600 font-semibold hover:text-indigo-800 transition-colors">
                      <Navigation className="w-3.5 h-3.5" />Посмотреть на карте <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Warehouse current task */}
                {!isFast && courierData.currentTaskId && (
                  <div className="bg-purple-50 rounded-xl border border-purple-200 p-4">
                    <p className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Warehouse className="w-3.5 h-3.5" />Текущее задание
                    </p>
                    <div className="flex items-center gap-2">
                      {courierData.currentTaskType && (
                        <span className={`px-2.5 py-1 rounded-lg text-sm font-bold ${TASK_TYPE_CFG[courierData.currentTaskType].bg} ${TASK_TYPE_CFG[courierData.currentTaskType].color}`}>
                          {TASK_TYPE_CFG[courierData.currentTaskType].label}
                        </span>
                      )}
                      <button onClick={() => setTab('map')} className="flex items-center gap-1.5 text-xs text-purple-600 font-semibold hover:text-purple-800 ml-auto">
                        <Navigation className="w-3.5 h-3.5" />На карте <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Admin actions */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Управление курьером</p>
                <div className="space-y-2">
                  <button
                    onClick={() => setActiveModal('block')}
                    className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                      courierData.blocked
                        ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                        : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                    }`}
                  >
                    {courierData.blocked ? '🔓 Разблокировать' : '🔒 Заблокировать'}
                  </button>
                  <button
                    onClick={() => setActiveModal('zone')}
                    className="w-full text-left px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                  >
                    📍 Изменить зону
                  </button>
                  <button
                    onClick={() => setActiveModal('type')}
                    className="w-full text-left px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100"
                  >
                    🔄 Изменить тип курьера
                  </button>
                  <button
                    onClick={() => setActiveModal('vehicle')}
                    className="w-full text-left px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                  >
                    🚗 Изменить транспорт
                  </button>
                  <button
                    onClick={() => setActiveModal('role')}
                    className="w-full text-left px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                  >
                    👤 Назначить роль
                  </button>
                  <button
                    onClick={() => setActiveModal('notification')}
                    className="w-full text-left px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100"
                  >
                    🔔 Отправить уведомление
                  </button>
                  <button
                    onClick={() => setActiveModal('shift')}
                    disabled={courierData.status === 'offline'}
                    className="w-full text-left px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ⛔ Отключить смену
                    {courierData.status === 'offline' && <span className="text-xs text-gray-400 ml-2">(офлайн)</span>}
                  </button>
                </div>

                {/* Courier role badge */}
                <div className="bg-indigo-50 rounded-xl border border-indigo-100 px-4 py-3">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Текущая роль</p>
                  <p className="text-sm font-semibold text-indigo-700 mt-0.5 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5" />{courierRole}
                  </p>
                </div>

                {/* Today summary */}
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mt-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Сегодня</p>
                  <div className="space-y-2">
                    {[
                      { l: 'Выполнено', v: courierData.completedToday, c: 'text-green-700' },
                      { l: 'Активных', v: courierData.activeOrders, c: 'text-blue-700' },
                      { l: 'Заработок', v: `₽${fmt(courierData.earningsToday)}`, c: 'text-gray-900' },
                    ].map(r => (
                      <div key={r.l} className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">{r.l}</span>
                        <span className={`font-bold ${r.c}`}>{r.v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── КАРТА ── */}
          {tab === 'map' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-blue-500" />Live Map — {courierData.name.split(' ')[0]}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">GPS: {courierData.gpsLat.toFixed(4)}°N, {courierData.gpsLng.toFixed(4)}°E · Обн. {courierData.gpsUpdated}</p>
                </div>
                <button onClick={() => { import('sonner').then(m => m.toast.success('GPS-координаты курьера обновлены')); }}
                  className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                  <RefreshCw className="w-3.5 h-3.5" />Обновить
                </button>
              </div>
              <LiveMap courier={courierData} />
              {isFast && courierData.currentRestaurant && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-red-50 rounded-xl p-3 border border-red-200">
                    <p className="text-[10px] text-red-500 font-semibold uppercase tracking-wide">📍 Точка А — Ресторан</p>
                    <p className="text-sm font-semibold text-red-800 mt-1">{courierData.currentRestaurant}</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-3 border border-green-200">
                    <p className="text-[10px] text-green-500 font-semibold uppercase tracking-wide">📍 Точка Б — Клиент</p>
                    <p className="text-sm font-semibold text-green-800 mt-1">{courierData.currentClient}</p>
                  </div>
                </div>
              )}
              {!isFast && courierData.currentTaskType && (
                <div className="bg-purple-50 rounded-xl p-3 border border-purple-200">
                  <p className="text-[10px] text-purple-500 font-semibold uppercase tracking-wide">Текущее задание</p>
                  <p className="text-sm font-semibold text-purple-800 mt-1">{TASK_TYPE_CFG[courierData.currentTaskType].label}</p>
                </div>
              )}
            </div>
          )}

          {/* ── ЗАКАЗЫ / ЗАДАЧИ ── */}
          {tab === 'orders' && (
            isFast ? <OrdersTab orders={courierData.orders} /> : <TasksTab tasks={courierData.tasks} />
          )}

          {/* ── ФИНАНСЫ ── */}
          {tab === 'finance' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { l: 'Сегодня',  v: `₽${fmt(courierData.earningsToday)}`, c: 'text-blue-700 bg-blue-50 border-blue-200',      toTab: null as string | null },
                  { l: 'Всего',    v: `₽${fmt(courierData.earningsTotal)}`, c: 'text-green-700 bg-green-50 border-green-200',   toTab: null as string | null },
                  { l: 'Отмены',   v: `${courierData.cancelRate}%`,          c: 'text-orange-700 bg-orange-50 border-orange-200', toTab: 'orders' as string | null },
                  { l: 'Проблемы', v: `${courierData.problemRate}%`,          c: 'text-red-600 bg-red-50 border-red-200',          toTab: 'stats' as string | null },
                ].map(r => (
                  <button
                    key={r.l}
                    onClick={() => { if (r.toTab) setTab(r.toTab as any); else toast.info(r.l, { description: r.v }); }}
                    className={`rounded-xl border p-4 text-center cursor-pointer hover:shadow-md active:scale-[0.97] transition-all ${r.c}`}
                  >
                    <p className="text-xl font-bold">{r.v}</p>
                    <p className="text-[10px] font-semibold mt-0.5 opacity-80">{r.l}</p>
                  </button>
                ))}
              </div>
              <FinanceChart data={courierData.dailyFinance} />
            </div>
          )}

          {/* ── СТАТИСТИКА ── */}
          {tab === 'stats' && <StatsTab courier={courierData} />}

          {/* ── ХРОНОМЕТРАЖ ── */}
          {tab === 'timereport' && <CourierTimeReportTab courier={courierData} />}

          {/* ── ДОКУМЕНТЫ ── */}
          {tab === 'documents' && <DocumentsTab courier={courierData} />}

          {/* ── КОНТРАКТ ── */}
          {tab === 'contract' && (
            <div className="space-y-5">
              <div className={`rounded-2xl border p-5 ${courierData.contractStatus === 'active' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${courierData.contractStatus === 'active' ? 'bg-green-100' : 'bg-red-100'}`}>
                    <ClipboardList className={`w-5 h-5 ${courierData.contractStatus === 'active' ? 'text-green-600' : 'text-red-600'}`} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{CONTRACT_LABELS[courierData.contractType]}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${courierData.contractStatus === 'active' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                      {courierData.contractStatus === 'active' ? '✅ Активный' : '❌ Истёк'}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { l: 'Дата заключения', v: courierData.contractDate },
                    { l: 'Действует до', v: courierData.contractExpiry },
                    { l: 'Тип занятости', v: CONTRACT_LABELS[courierData.contractType] },
                    { l: 'Статус', v: courierData.contractStatus === 'active' ? 'Активный' : 'Не активен' },
                  ].map(({ l, v }) => (
                    <div key={l}>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">{l}</p>
                      <p className="text-sm font-semibold text-gray-900 mt-0.5">{v}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => { import('sonner').then(m => m.toast.success(`Контракт по ${courierData.name} скачивается`)); }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
                  <Download className="w-4 h-4" />Скачать контракт
                </button>
                <button onClick={() => { import('sonner').then(m => m.toast.info('Обновление контракта', { description: 'Загрузите новый PDF — старая версия архивируется автоматически' })); }}
                  className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                  <Edit3 className="w-4 h-4" />Обновить контракт
                </button>
              </div>
            </div>
          )}

          {/* ── ИСТОРИЯ СМЕН ── */}
          {tab === 'history' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">Последние {courierData.shifts.length} смен</p>
              {courierData.shifts.map((shift, i) => (
                <div key={shift.id} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:shadow-sm transition-all">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                    shift.status === 'completed' ? 'bg-green-100 text-green-700' :
                    shift.status === 'partial' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                  }`}>{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900">{shift.date}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        shift.status === 'completed' ? 'bg-green-100 text-green-700' :
                        shift.status === 'partial' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {shift.status === 'completed' ? 'Завершена' : shift.status === 'partial' ? 'Частичная' : 'Отменена'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{shift.startTime} — {shift.endTime} ({shift.durationHours} ч)</span>
                      <span className="flex items-center gap-1"><Package className="w-3 h-3" />{shift.deliveries} доставок</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-green-700">₽{fmt(shift.earnings)}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">за смену</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── ЧАТ ── */}
          {tab === 'chat' && <CourierChatTab courier={courierData} />}

          {/* ── АУДИТ ── */}
          {tab === 'audit' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Журнал административных действий</p>
                <span className="text-xs text-gray-400">{courierData.auditLog.length} записей</span>
              </div>
              {courierData.auditLog.map(entry => (
                <div key={entry.id} className="flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-200">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900">{entry.actor}</p>
                      <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded font-medium">{entry.actorRole}</span>
                    </div>
                    <p className="text-sm text-gray-700 mt-0.5">{entry.action}</p>
                    {entry.field && (
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                        <span className="font-medium text-gray-600">{entry.field}:</span>
                        {entry.before && <span className="line-through text-red-500">{entry.before}</span>}
                        {entry.before && entry.after && <ChevronRight className="w-3 h-3" />}
                        {entry.after && <span className="text-green-600 font-medium">{entry.after}</span>}
                      </p>
                    )}
                    <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />{entry.timestamp}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

      {/* ── ACTION MODALS (portaled to body) ── */}
      {activeModal === 'block' && (
        <BlockModal courier={courierData} onConfirm={handleBlock} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'zone' && (
        <ZoneModal currentZone={courierData.zone} onConfirm={handleZone} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'type' && (
        <CourierTypeModal currentType={courierData.courier_type} onConfirm={handleCourierType} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'vehicle' && (
        <VehicleModal currentVehicle={courierData.vehicle} onConfirm={handleVehicle} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'role' && (
        <RoleModal currentRole={courierRole} onConfirm={handleRole} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'notification' && (
        <NotificationModal courierName={courierData.name} onConfirm={handleNotification} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'shift' && (
        <DisableShiftModal courierName={courierData.name} onConfirm={handleShiftDisable} onClose={() => setActiveModal(null)} />
      )}
    </div>
  );
}
