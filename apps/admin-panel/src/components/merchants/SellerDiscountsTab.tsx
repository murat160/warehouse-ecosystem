import { useState, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import {
  Tag, Plus, Pencil as Edit2, Trash2, Check, X, AlertTriangle,
  Shield, Clock, History, Download, RefreshCw,
  ChevronDown, Lock, Info, TrendingUp,
  DollarSign, User, FileText, Save, Store, Globe,
  Search, Calendar, Percent, Package, CheckCircle2,
  Eye, Copy, Bell, ShoppingCart, Zap, Pause, Play,
  Star, Send, BarChart2, Users, ChevronRight,
} from 'lucide-react';
import { SellerDetail, getSellerStores, type SellerStore } from '../../data/merchants-mock';
import { useAuth } from '../../contexts/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

type DiscountType = 'percentage' | 'fixed' | 'free_delivery' | 'bxgy' | 'flash';
type DiscountScope = 'global' | 'store_specific' | 'category' | 'product';
type DiscountStatus = 'active' | 'scheduled' | 'expired' | 'paused' | 'pending_approval';
type SubTab = 'store' | 'global' | 'pending' | 'history';
type ChangeType = 'created' | 'edited' | 'paused' | 'resumed' | 'deleted' | 'approved' | 'rejected';

interface Discount {
  id: string;
  title: string;
  type: DiscountType;
  scope: DiscountScope;
  value: number;
  minOrder: number;
  maxUses?: number;
  usedCount: number;
  storeIds: string[];
  category?: string;
  startDate: string;
  endDate?: string;
  status: DiscountStatus;
  promoCode?: string;
  stackable: boolean;
  createdBy: string;
  createdByRole: string;
  createdAt: string;
  updatedBy?: string;
  updatedByRole?: string;
  updatedAt?: string;
  note?: string;
  isGlobal: boolean;
}

interface PendingChange {
  id: string;
  discountId: string;
  discountTitle: string;
  changeType: ChangeType;
  changedBy: string;
  changedByRole: string;
  changedAt: string;
  storeNames: string[];
  oldValues?: Partial<Discount>;
  newValues?: Partial<Discount>;
  reason: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
}

interface HistoryEntry {
  id: string;
  discountId: string;
  discountTitle: string;
  action: string;
  performedBy: string;
  performedByRole: string;
  performedAt: string;
  details: string;
  ip: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_CFG: Record<DiscountType, { label: string; icon: any; color: string; bg: string }> = {
  percentage:    { label: '% Скидка',         icon: Percent,       color: 'text-blue-700',   bg: 'bg-blue-100' },
  fixed:         { label: '₽ Фиксированная',  icon: DollarSign,    color: 'text-green-700',  bg: 'bg-green-100' },
  free_delivery: { label: 'Бесплатная дост.',  icon: ShoppingCart,  color: 'text-purple-700', bg: 'bg-purple-100' },
  bxgy:          { label: 'Купи X — получи Y', icon: Package,       color: 'text-orange-700', bg: 'bg-orange-100' },
  flash:         { label: 'Флеш-распродажа',   icon: Zap,           color: 'text-red-700',    bg: 'bg-red-100' },
};

const STATUS_CFG: Record<DiscountStatus, { label: string; dot: string; badge: string }> = {
  active:            { label: 'Активна',          dot: 'bg-green-500',   badge: 'bg-green-100 text-green-700' },
  scheduled:         { label: 'Запланирована',     dot: 'bg-blue-400',    badge: 'bg-blue-100 text-blue-700' },
  expired:           { label: 'Истекла',           dot: 'bg-gray-400',    badge: 'bg-gray-100 text-gray-600' },
  paused:            { label: 'Приостановлена',    dot: 'bg-yellow-500',  badge: 'bg-yellow-100 text-yellow-700' },
  pending_approval:  { label: 'На согласовании',   dot: 'bg-orange-500',  badge: 'bg-orange-100 text-orange-700' },
};

const CATEGORIES = [
  'Продукты питания', 'Напитки', 'Молочные продукты', 'Хлебобулочные',
  'Бакалея', 'Мясо и птица', 'Рыба и морепродукты', 'Готовая еда',
  'Кондитерские изделия', 'Фрукты и овощи', 'Замороженные продукты', 'Другое',
];

// ─── Mock data factory ────────────────────────────────────────────────────────

function buildMockDiscounts(stores: SellerStore[]): Discount[] {
  const allIds = stores.map(s => s.id);
  const id0 = allIds[0] ?? 'st-1';
  const id1 = allIds[1] ?? 'st-2';
  return [
    {
      id: 'disc-1', title: 'Скидка на первый заказ', type: 'percentage', scope: 'global', value: 15,
      minOrder: 500, maxUses: 1000, usedCount: 347, storeIds: allIds,
      startDate: '2026-01-01', endDate: '2026-06-30', status: 'active', promoCode: 'FIRST15',
      stackable: false, createdBy: 'Козлова Н.А.', createdByRole: 'Admin', createdAt: '2025-12-28T10:00:00', isGlobal: true,
      note: 'Промо для новых пользователей. Ограничение: 1 раз на аккаунт.',
    },
    {
      id: 'disc-2', title: 'Бесплатная доставка от 800₽', type: 'free_delivery', scope: 'store_specific', value: 0,
      minOrder: 800, usedCount: 892, storeIds: [id0],
      startDate: '2026-02-01', endDate: '2026-12-31', status: 'active',
      stackable: true, createdBy: 'Иванов А.А.', createdByRole: 'Merchant', createdAt: '2026-01-20T14:00:00',
      isGlobal: false, updatedBy: 'Иванов А.А.', updatedByRole: 'Merchant', updatedAt: '2026-02-10T09:15:00',
    },
    {
      id: 'disc-3', title: 'Скидка -200₽ в выходные', type: 'fixed', scope: 'store_specific', value: 200,
      minOrder: 1000, usedCount: 156, storeIds: [id1],
      startDate: '2026-03-01', endDate: '2026-03-31', status: 'scheduled',
      stackable: false, createdBy: 'Петров И.С.', createdByRole: 'Admin', createdAt: '2026-02-25T16:00:00',
      isGlobal: false, note: 'Только суббота и воскресенье.',
    },
    {
      id: 'disc-4', title: 'Флеш-распродажа пятница', type: 'flash', scope: 'category', value: 30,
      minOrder: 300, maxUses: 500, usedCount: 500, storeIds: allIds, category: 'Готовая еда',
      startDate: '2026-02-07', endDate: '2026-02-07', status: 'expired',
      promoCode: 'FLASH30', stackable: false, createdBy: 'Козлова Н.А.', createdByRole: 'Admin', createdAt: '2026-02-05T11:00:00',
      isGlobal: true,
    },
    {
      id: 'disc-5', title: 'Купи 2 — получи 1 в подарок', type: 'bxgy', scope: 'category', value: 0,
      minOrder: 0, usedCount: 0, storeIds: [id0], category: 'Кондитерские изделия',
      startDate: '2026-03-08', status: 'pending_approval',
      stackable: false, createdBy: 'Иванов А.А.', createdByRole: 'Merchant', createdAt: '2026-03-01T10:00:00',
      isGlobal: false, note: 'Акция к 8 марта. Ожидает согласования.',
    },
    {
      id: 'disc-6', title: 'Летняя скидка 10%', type: 'percentage', scope: 'global', value: 10,
      minOrder: 600, usedCount: 0, storeIds: allIds,
      startDate: '2026-06-01', endDate: '2026-08-31', status: 'scheduled',
      stackable: true, createdBy: 'Козлова Н.А.', createdByRole: 'Admin', createdAt: '2026-02-28T09:00:00',
      isGlobal: true,
    },
    {
      id: 'disc-7', title: 'Скидка постоянным клиентам 5%', type: 'percentage', scope: 'store_specific', value: 5,
      minOrder: 1000, usedCount: 2340, storeIds: allIds,
      startDate: '2025-09-01', status: 'paused',
      stackable: true, createdBy: 'Иванов А.А.', createdByRole: 'Merchant', createdAt: '2025-08-25T08:00:00',
      isGlobal: false, note: 'Приостановлена на период инвентаризации.',
      updatedBy: 'Администратор Системы', updatedByRole: 'SuperAdmin', updatedAt: '2026-02-20T12:00:00',
    },
  ];
}

function buildMockPending(discounts: Discount[], stores: SellerStore[]): PendingChange[] {
  const storeMap = Object.fromEntries(stores.map(s => [s.id, s.name]));
  return [
    {
      id: 'pc-1', discountId: 'disc-5', discountTitle: 'Купи 2 — получи 1 в подарок',
      changeType: 'created', changedBy: 'Иванов А.А.', changedByRole: 'Merchant',
      changedAt: '2026-03-01T10:00:00', storeNames: stores.slice(0, 1).map(s => s.name),
      newValues: { value: 0, type: 'bxgy', minOrder: 0, status: 'active' },
      reason: 'Плановая акция к Международному женскому дню 8 марта.',
      approvalStatus: 'pending',
    },
    {
      id: 'pc-2', discountId: 'disc-3', discountTitle: 'Скидка -200₽ в выходные',
      changeType: 'edited', changedBy: 'Петров И.С.', changedByRole: 'Admin',
      changedAt: '2026-02-28T15:30:00', storeNames: stores.slice(1, 2).map(s => s.name),
      oldValues: { value: 150, minOrder: 800 },
      newValues: { value: 200, minOrder: 1000 },
      reason: 'Увеличение суммы скидки и порога заказа для повышения среднего чека.',
      approvalStatus: 'pending',
    },
    {
      id: 'pc-3', discountId: 'disc-7', discountTitle: 'Скидка постоянным клиентам 5%',
      changeType: 'paused', changedBy: 'Администратор Системы', changedByRole: 'SuperAdmin',
      changedAt: '2026-02-20T12:00:00', storeNames: stores.map(s => s.name),
      reason: 'Приостановлена на период плановой инвентаризации (20–28 февраля).',
      approvalStatus: 'approved', reviewedBy: 'Администратор Системы', reviewedAt: '2026-02-20T12:01:00',
    },
  ];
}

function buildMockHistory(discounts: Discount[]): HistoryEntry[] {
  return [
    { id: 'h1', discountId: 'disc-7', discountTitle: 'Скидка постоянным клиентам 5%',
      action: 'paused', performedBy: 'Администратор Системы', performedByRole: 'SuperAdmin',
      performedAt: '2026-02-20T12:00:00', details: 'Скидка приостановлена на период инвентаризации.', ip: '192.168.1.10' },
    { id: 'h2', discountId: 'disc-5', discountTitle: 'Купи 2 — получи 1 в подарок',
      action: 'created', performedBy: 'Иванов А.А.', performedByRole: 'Merchant',
      performedAt: '2026-03-01T10:00:00', details: 'Создана акция "Купи 2 — получи 1". Отправлено на согласование.', ip: '10.0.0.44' },
    { id: 'h3', discountId: 'disc-6', discountTitle: 'Летняя скидка 10%',
      action: 'created', performedBy: 'Козлова Н.А.', performedByRole: 'Admin',
      performedAt: '2026-02-28T09:00:00', details: 'Создана летняя акция 10% на период июнь–август 2026.', ip: '192.168.1.7' },
    { id: 'h4', discountId: 'disc-3', discountTitle: 'Скидка -200₽ в выходные',
      action: 'edited', performedBy: 'Петров И.С.', performedByRole: 'Admin',
      performedAt: '2026-02-28T15:30:00', details: 'Изменено: сумма скидки 150₽ → 200₽; мин. заказ 800₽ → 1000₽.', ip: '192.168.1.3' },
    { id: 'h5', discountId: 'disc-2', discountTitle: 'Бесплатная доставка от 800₽',
      action: 'edited', performedBy: 'Иванов А.А.', performedByRole: 'Merchant',
      performedAt: '2026-02-10T09:15:00', details: 'Изменён порог минимального заказа: 600₽ → 800₽.', ip: '10.0.0.44' },
    { id: 'h6', discountId: 'disc-4', discountTitle: 'Флеш-распродажа пятница',
      action: 'expired', performedBy: 'Система', performedByRole: 'System',
      performedAt: '2026-02-07T23:59:59', details: 'Акция автоматически завершена по дате окончания.', ip: 'system' },
    { id: 'h7', discountId: 'disc-1', discountTitle: 'Скидка на первый заказ',
      action: 'created', performedBy: 'Козлова Н.А.', performedByRole: 'Admin',
      performedAt: '2025-12-28T10:00:00', details: 'Создана стартовая акция FIRST15 для новых пользователей.', ip: '192.168.1.7' },
  ];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function discountValueLabel(d: Discount): string {
  if (d.type === 'percentage' || d.type === 'flash') return `${d.value}%`;
  if (d.type === 'fixed') return `${d.value}₽`;
  if (d.type === 'free_delivery') return '0₽ дост.';
  if (d.type === 'bxgy') return '1 бесплатно';
  return `${d.value}`;
}

// ─── Modals ───────────────────────────────────────────────────────────────────

interface DiscountFormModalProps {
  discount?: Discount | null;
  stores: SellerStore[];
  onSave: (data: Partial<Discount>, reason: string) => void;
  onClose: () => void;
}

function DiscountFormModal({ discount, stores, onSave, onClose }: DiscountFormModalProps) {
  const [title, setTitle] = useState(discount?.title ?? '');
  const [type, setType] = useState<DiscountType>(discount?.type ?? 'percentage');
  const [scope, setScope] = useState<DiscountScope>(discount?.scope ?? 'store_specific');
  const [value, setValue] = useState(String(discount?.value ?? ''));
  const [minOrder, setMinOrder] = useState(String(discount?.minOrder ?? '0'));
  const [maxUses, setMaxUses] = useState(discount?.maxUses ? String(discount.maxUses) : '');
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>(
    discount?.storeIds ?? (stores.length > 0 ? [stores[0].id] : [])
  );
  const [category, setCategory] = useState(discount?.category ?? '');
  const [startDate, setStartDate] = useState(discount?.startDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(discount?.endDate?.slice(0, 10) ?? '');
  const [promoCode, setPromoCode] = useState(discount?.promoCode ?? '');
  const [stackable, setStackable] = useState(discount?.stackable ?? false);
  const [note, setNote] = useState(discount?.note ?? '');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isEdit = !!discount;

  const toggleStore = (id: string) => {
    setSelectedStoreIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = 'Введите название акции';
    if ((type === 'percentage' || type === 'flash') && (isNaN(Number(value)) || Number(value) <= 0 || Number(value) > 100)) e.value = 'Укажите % от 1 до 100';
    if (type === 'fixed' && (isNaN(Number(value)) || Number(value) <= 0)) e.value = 'Укажите корректную сумму';
    if (selectedStoreIds.length === 0 && scope !== 'global') e.stores = 'Выберите хотя бы один магазин';
    if ((scope === 'category' || scope === 'product') && !category) e.category = 'Выберите категорию';
    if (!reason.trim()) e.reason = 'Укажите причину изменения';
    if (!startDate) e.startDate = 'Укажите дату начала';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const data: Partial<Discount> = {
      title: title.trim(),
      type,
      scope,
      value: type === 'free_delivery' || type === 'bxgy' ? 0 : Number(value),
      minOrder: Number(minOrder) || 0,
      maxUses: maxUses ? Number(maxUses) : undefined,
      storeIds: scope === 'global' ? stores.map(s => s.id) : selectedStoreIds,
      category: scope === 'category' || scope === 'product' ? category : undefined,
      startDate,
      endDate: endDate || undefined,
      promoCode: promoCode.trim() || undefined,
      stackable,
      note: note.trim() || undefined,
      isGlobal: scope === 'global',
    };
    onSave(data, reason.trim());
  };

  const inputCls = (err?: string) =>
    `w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${err ? 'border-red-300 bg-red-50' : 'border-gray-200'}`;

  return ReactDOM.createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[999] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[92vh] overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 shrink-0">
            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
              <Tag className="w-4.5 h-4.5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 text-sm">{isEdit ? 'Редактировать акцию' : 'Новая акция / скидка'}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Изменения требуют указания причины и отправляются суперадмину</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors shrink-0">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Название акции *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Например: Скидка на первый заказ" className={inputCls(errors.title)} />
              {errors.title && <p className="text-[10px] text-red-500 mt-1">{errors.title}</p>}
            </div>

            {/* Type */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">Тип скидки *</label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(TYPE_CFG) as DiscountType[]).map(t => {
                  const cfg = TYPE_CFG[t];
                  const Icon = cfg.icon;
                  return (
                    <button key={t} onClick={() => setType(t)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-medium transition-all ${type === t ? `border-blue-500 bg-blue-50 text-blue-700` : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      <Icon className={`w-4 h-4 ${type === t ? 'text-blue-600' : 'text-gray-400'}`} />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Value */}
            {(type === 'percentage' || type === 'fixed' || type === 'flash') && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  {type === 'fixed' ? 'Сумма скидки (₽) *' : 'Размер скидки (%) *'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    {type === 'fixed' ? '₽' : '%'}
                  </span>
                  <input type="number" value={value} onChange={e => setValue(e.target.value)}
                    placeholder={type === 'fixed' ? '200' : '15'}
                    min="0" max={type === 'fixed' ? undefined : 100}
                    className={`${inputCls(errors.value)} pl-7`}
                  />
                </div>
                {errors.value && <p className="text-[10px] text-red-500 mt-1">{errors.value}</p>}
              </div>
            )}

            {/* Scope + Stores */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">Область применения *</label>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {([
                  { v: 'global', label: 'Все магазины', icon: Globe },
                  { v: 'store_specific', label: 'Выбранные магазины', icon: Store },
                  { v: 'category', label: 'Категория', icon: Package },
                  { v: 'product', label: 'Конкретный товар', icon: Tag },
                ] as const).map(opt => {
                  const Icon = opt.icon;
                  return (
                    <button key={opt.v} onClick={() => setScope(opt.v)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border-2 text-xs font-medium transition-all ${scope === opt.v ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      <Icon className={`w-3.5 h-3.5 ${scope === opt.v ? 'text-blue-600' : 'text-gray-400'}`} />
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {/* Store picker */}
              {scope !== 'global' && stores.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Выберите магазины</p>
                  <div className="space-y-1.5">
                    {stores.map(s => (
                      <button key={s.id} onClick={() => toggleStore(s.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all text-sm ${selectedStoreIds.includes(s.id) ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selectedStoreIds.includes(s.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                          {selectedStoreIds.includes(s.id) && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <span className="flex-1 text-left font-medium">{s.name}</span>
                        <span className="text-[10px] text-gray-400">{s.city}</span>
                      </button>
                    ))}
                  </div>
                  {errors.stores && <p className="text-[10px] text-red-500 mt-1">{errors.stores}</p>}
                </div>
              )}

              {/* Category picker */}
              {(scope === 'category' || scope === 'product') && (
                <div className="mt-3">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Категория *</label>
                  <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls(errors.category)}>
                    <option value="">Выберите категорию...</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {errors.category && <p className="text-[10px] text-red-500 mt-1">{errors.category}</p>}
                </div>
              )}
            </div>

            {/* Dates + MinOrder */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Начало *</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputCls(errors.startDate)} />
                {errors.startDate && <p className="text-[10px] text-red-500 mt-1">{errors.startDate}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Конец (необяз.)</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputCls()} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Мин. заказ (₽)</label>
                <input type="number" value={minOrder} onChange={e => setMinOrder(e.target.value)} placeholder="0" min="0" className={inputCls()} />
              </div>
            </div>

            {/* Promo code + max uses */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Промокод (необяз.)</label>
                <input value={promoCode} onChange={e => setPromoCode(e.target.value.toUpperCase())} placeholder="SUMMER20" className={inputCls()} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Макс. использований</label>
                <input type="number" value={maxUses} onChange={e => setMaxUses(e.target.value)} placeholder="Без лимита" min="1" className={inputCls()} />
              </div>
            </div>

            {/* Stackable */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <button onClick={() => setStackable(v => !v)}
                className={`relative w-10 h-5.5 rounded-full transition-colors shrink-0 ${stackable ? 'bg-blue-600' : 'bg-gray-300'}`}
                style={{ height: '22px', width: '40px' }}
              >
                <div className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-all ${stackable ? 'left-5' : 'left-0.5'}`} style={{ width: '18px', height: '18px' }} />
              </button>
              <div>
                <p className="text-xs font-semibold text-gray-700">Суммирование с другими акциями</p>
                <p className="text-[10px] text-gray-500">Если включено, скидка суммируется с другими активными акциями</p>
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Внутренняя заметка</label>
              <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
                placeholder="Условия, исключения, внутренние комментарии..."
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>

            {/* Reason (required) */}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-amber-600" />
                <p className="text-xs font-bold text-amber-800">Причина изменения (обязательно) *</p>
              </div>
              <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
                placeholder="Укажите причину создания/изменения акции. Запись сохраняется в аудит-логе и отправляется суперадмину."
                className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none bg-white ${errors.reason ? 'border-red-300' : 'border-amber-200'}`} />
              {errors.reason && <p className="text-[10px] text-red-500 mt-1">{errors.reason}</p>}
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-6 pb-6 pt-3 border-t border-gray-100 shrink-0">
            <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
              Отмена
            </button>
            <button onClick={handleSave}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
              <Send className="w-4 h-4" />
              {isEdit ? 'Сохранить и отправить на согласование' : 'Создать и отправить'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

// ─── Delete / Pause confirm modal ─────────────────────────────────────────────

interface ConfirmActionModalProps {
  title: string;
  description: string;
  actionLabel: string;
  actionColor: string;
  icon: any;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

function ConfirmActionModal({ title, description, actionLabel, actionColor, icon: Icon, onConfirm, onClose }: ConfirmActionModalProps) {
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');

  const handleConfirm = () => {
    if (!reason.trim()) { setErr('Укажите причину'); return; }
    onConfirm(reason.trim());
  };

  return ReactDOM.createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[999] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${actionColor === 'red' ? 'bg-red-100' : 'bg-yellow-100'}`}>
                <Icon className={`w-5 h-5 ${actionColor === 'red' ? 'text-red-600' : 'text-yellow-600'}`} />
              </div>
              <div>
                <p className="font-bold text-gray-900">{title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{description}</p>
              </div>
              <button onClick={onClose} className="ml-auto p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Причина *</label>
              <textarea value={reason} onChange={e => { setReason(e.target.value); setErr(''); }} rows={3}
                placeholder="Обязательно укажите причину. Будет записано в аудит-лог."
                className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${err ? 'border-red-300' : 'border-gray-200'}`} />
              {err && <p className="text-[10px] text-red-500 mt-1">{err}</p>}
            </div>
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Отмена</button>
              <button onClick={handleConfirm}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${actionColor === 'red' ? 'bg-red-600 hover:bg-red-700' : 'bg-yellow-500 hover:bg-yellow-600'}`}>
                {actionLabel}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

// ─── Approve/Reject modal ─────────────────────────────────────────────────────

function ReviewModal({ change, onDecide, onClose }: {
  change: PendingChange;
  onDecide: (id: string, approved: boolean, note: string) => void;
  onClose: () => void;
}) {
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');

  const handle = (approved: boolean) => {
    if (!approved && !note.trim()) { setErr('Укажите причину отклонения'); return; }
    onDecide(change.id, approved, note.trim());
  };

  const CHANGE_LABELS: Record<string, string> = {
    created: 'Создание', edited: 'Редактирование', paused: 'Приостановка',
    resumed: 'Возобновление', deleted: 'Удаление', approved: 'Одобрение', rejected: 'Отклонение',
  };

  return ReactDOM.createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[999] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }} transition={{ duration: 0.2 }}
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              <p className="font-bold text-gray-900">Согласование изменения</p>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
          </div>
          <div className="p-6 space-y-4">
            <div className="p-4 bg-gray-50 rounded-xl space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Акция</span><span className="font-semibold text-gray-900">{change.discountTitle}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Тип изменения</span><span className="font-semibold">{CHANGE_LABELS[change.changeType] ?? change.changeType}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Кто изменил</span><span className="font-semibold">{change.changedBy}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Роль</span><span className="font-semibold">{change.changedByRole}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Дата</span><span className="font-semibold">{fmtDateTime(change.changedAt)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Магазины</span><span className="font-semibold text-right max-w-[200px]">{change.storeNames.join(', ')}</span></div>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-xs font-semibold text-blue-800 mb-1">Причина изменения:</p>
              <p className="text-sm text-blue-900">{change.reason}</p>
            </div>
            {(change.oldValues || change.newValues) && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-600">Изменения:</p>
                {change.oldValues && Object.keys(change.oldValues).map(key => (
                  <div key={key} className="flex items-center gap-2 text-xs">
                    <span className="text-gray-500 w-24">{key}:</span>
                    <span className="text-red-600 line-through">{String((change.oldValues as any)[key])}</span>
                    <ChevronRight className="w-3 h-3 text-gray-400" />
                    <span className="text-green-700 font-semibold">{String((change.newValues as any)?.[key] ?? '—')}</span>
                  </div>
                ))}
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Комментарий (обязателен при отклонении)</label>
              <textarea value={note} onChange={e => { setNote(e.target.value); setErr(''); }} rows={2}
                placeholder="Комментарий к решению..."
                className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${err ? 'border-red-300' : 'border-gray-200'}`} />
              {err && <p className="text-[10px] text-red-500 mt-1">{err}</p>}
            </div>
            <div className="flex gap-3">
              <button onClick={() => handle(false)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors">
                <X className="w-4 h-4" />Отклонить
              </button>
              <button onClick={() => handle(true)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors">
                <Check className="w-4 h-4" />Одобрить
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

// ─── Discount Card ────────────────────────────────────────────────────────────

function DiscountCard({
  discount, stores, isSuperAdmin, onEdit, onPause, onResume, onDelete,
}: {
  discount: Discount;
  stores: SellerStore[];
  isSuperAdmin: boolean;
  onEdit: (d: Discount) => void;
  onPause: (d: Discount) => void;
  onResume: (d: Discount) => void;
  onDelete: (d: Discount) => void;
}) {
  const type = TYPE_CFG[discount.type];
  const status = STATUS_CFG[discount.status];
  const TypeIcon = type.icon;
  const storeNames = stores.filter(s => discount.storeIds.includes(s.id)).map(s => s.name);
  const usagePercent = discount.maxUses ? Math.round((discount.usedCount / discount.maxUses) * 100) : null;
  const isExpired = discount.status === 'expired';

  return (
    <div className={`bg-white border rounded-xl p-4 hover:shadow-md transition-all ${isExpired ? 'opacity-60' : ''} ${discount.status === 'pending_approval' ? 'border-orange-300 bg-orange-50/30' : 'border-gray-200'}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${type.bg}`}>
            <TypeIcon className={`w-4 h-4 ${type.color}`} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">{discount.title}</p>
            <span className={`text-[10px] font-semibold ${type.color}`}>{type.label}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${status.badge}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>
        </div>
      </div>

      {/* Value + minOrder */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="p-2 bg-gray-50 rounded-lg text-center">
          <p className="text-[10px] text-gray-500 mb-0.5">Размер скидки</p>
          <p className="font-bold text-gray-900">{discountValueLabel(discount)}</p>
        </div>
        <div className="p-2 bg-gray-50 rounded-lg text-center">
          <p className="text-[10px] text-gray-500 mb-0.5">Мин. заказ</p>
          <p className="font-bold text-gray-900">{discount.minOrder > 0 ? `₽${discount.minOrder}` : '—'}</p>
        </div>
      </div>

      {/* Usage */}
      {discount.maxUses && (
        <div className="mb-3">
          <div className="flex justify-between text-[10px] text-gray-500 mb-1">
            <span>Использовано</span>
            <span>{discount.usedCount} / {discount.maxUses}</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${usagePercent! >= 90 ? 'bg-red-500' : usagePercent! >= 70 ? 'bg-orange-500' : 'bg-blue-500'}`}
              style={{ width: `${Math.min(usagePercent!, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Dates + promo code */}
      <div className="flex items-center gap-3 text-[10px] text-gray-500 mb-3 flex-wrap">
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {fmtDate(discount.startDate)}{discount.endDate ? ` — ${fmtDate(discount.endDate)}` : ' → ∞'}
        </span>
        {discount.promoCode && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded font-mono font-semibold">
            {discount.promoCode}
          </span>
        )}
        {discount.stackable && (
          <span className="flex items-center gap-0.5 text-green-600"><Check className="w-2.5 h-2.5" />Сумм.</span>
        )}
      </div>

      {/* Stores */}
      <div className="flex flex-wrap gap-1 mb-3">
        {discount.isGlobal
          ? <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-medium flex items-center gap-1"><Globe className="w-2.5 h-2.5" />Все магазины</span>
          : storeNames.map(n => (
            <span key={n} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium">{n}</span>
          ))
        }
      </div>

      {/* Who changed */}
      {discount.updatedBy && (
        <div className="text-[10px] text-gray-400 mb-3">
          Изм.: <span className="font-medium">{discount.updatedBy}</span> · {discount.updatedAt ? fmtDate(discount.updatedAt) : '—'}
        </div>
      )}

      {/* Actions */}
      {!isExpired && (
        <div className="flex gap-2">
          <button onClick={() => onEdit(discount)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 border border-gray-200 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors">
            <Edit2 className="w-3 h-3" />Изменить
          </button>
          {discount.status === 'paused'
            ? <button onClick={() => onResume(discount)}
                className="flex items-center gap-1 py-1.5 px-2.5 border border-green-200 text-green-700 rounded-lg text-xs font-medium hover:bg-green-50 transition-colors">
                <Play className="w-3 h-3" />
              </button>
            : <button onClick={() => onPause(discount)}
                className="flex items-center gap-1 py-1.5 px-2.5 border border-yellow-200 text-yellow-700 rounded-lg text-xs font-medium hover:bg-yellow-50 transition-colors">
                <Pause className="w-3 h-3" />
              </button>
          }
          {(isSuperAdmin) && (
            <button onClick={() => onDelete(discount)}
              className="flex items-center gap-1 py-1.5 px-2.5 border border-red-200 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50 transition-colors">
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  seller: SellerDetail;
}

export function SellerDiscountsTab({ seller }: Props) {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SuperAdmin';
  const isAdmin = user?.role === 'SuperAdmin' || user?.role === 'Admin';

  const stores = useMemo(() => getSellerStores(seller.id), [seller.id]);
  const idSeqRef = useRef(0);

  const [discounts, setDiscounts] = useState<Discount[]>(() => buildMockDiscounts(stores));
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>(() => buildMockPending(buildMockDiscounts(stores), stores));
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>(() => buildMockHistory(buildMockDiscounts(stores)));

  const [subTab, setSubTab] = useState<SubTab>('store');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: 'pause' | 'resume' | 'delete'; discount: Discount } | null>(null);
  const [reviewingChange, setReviewingChange] = useState<PendingChange | null>(null);

  // Filtered discounts
  const storeDiscounts = useMemo(() =>
    discounts.filter(d => !d.isGlobal && (search ? d.title.toLowerCase().includes(search.toLowerCase()) : true)),
    [discounts, search]
  );
  const globalDiscounts = useMemo(() =>
    discounts.filter(d => d.isGlobal && (search ? d.title.toLowerCase().includes(search.toLowerCase()) : true)),
    [discounts, search]
  );
  const pendingCount = pendingChanges.filter(p => p.approvalStatus === 'pending').length;

  // KPIs
  const activeCount = discounts.filter(d => d.status === 'active').length;
  const globalCount = discounts.filter(d => d.isGlobal).length;
  const totalUsed = discounts.reduce((s, d) => s + d.usedCount, 0);
  const totalSavings = discounts.reduce((s, d) => {
    if (d.type === 'percentage' || d.type === 'flash') return s + d.usedCount * d.minOrder * d.value / 100;
    if (d.type === 'fixed') return s + d.usedCount * d.value;
    return s + d.usedCount * 150;
  }, 0);

  const addToHistory = (action: string, discount: Discount, details: string) => {
    const entry: HistoryEntry = {
      id: `h-${Date.now()}-${++idSeqRef.current}`, discountId: discount.id, discountTitle: discount.title,
      action, performedBy: user?.name ?? 'Администратор', performedByRole: user?.role ?? 'Admin',
      performedAt: new Date().toISOString(), details, ip: '192.168.1.1',
    };
    setHistoryEntries(prev => [entry, ...prev]);
  };

  const handleSaveDiscount = (data: Partial<Discount>, reason: string) => {
    if (editingDiscount) {
      const updated: Discount = {
        ...editingDiscount, ...data,
        status: isAdmin ? 'active' : 'pending_approval',
        updatedBy: user?.name ?? 'Администратор',
        updatedByRole: user?.role ?? 'Admin',
        updatedAt: new Date().toISOString(),
      };
      setDiscounts(prev => prev.map(d => d.id === editingDiscount.id ? updated : d));

      if (!isAdmin) {
        const pc: PendingChange = {
          id: `pc-${Date.now()}-${++idSeqRef.current}`, discountId: editingDiscount.id, discountTitle: updated.title,
          changeType: 'edited', changedBy: user?.name ?? 'Пользователь', changedByRole: user?.role ?? 'Merchant',
          changedAt: new Date().toISOString(), storeNames: stores.filter(s => updated.storeIds.includes(s.id)).map(s => s.name),
          oldValues: { value: editingDiscount.value, minOrder: editingDiscount.minOrder },
          newValues: { value: updated.value, minOrder: updated.minOrder },
          reason, approvalStatus: 'pending',
        };
        setPendingChanges(prev => [pc, ...prev]);
        toast.success('Изменение отправлено на согласование суперадмину', { description: updated.title });
      } else {
        toast.success(`Акция обновлена`, { description: updated.title });
      }
      addToHistory('edited', updated, `Изменено: ${reason}`);
    } else {
      const newDiscount: Discount = {
        id: `disc-${Date.now()}-${++idSeqRef.current}`, ...data as Discount,
        usedCount: 0,
        status: isAdmin ? 'active' : 'pending_approval',
        createdBy: user?.name ?? 'Администратор',
        createdByRole: user?.role ?? 'Admin',
        createdAt: new Date().toISOString(),
      };
      setDiscounts(prev => [...prev, newDiscount]);

      if (!isAdmin) {
        const pc: PendingChange = {
          id: `pc-${Date.now()}-${++idSeqRef.current}`, discountId: newDiscount.id, discountTitle: newDiscount.title,
          changeType: 'created', changedBy: user?.name ?? 'Пользователь', changedByRole: user?.role ?? 'Merchant',
          changedAt: new Date().toISOString(), storeNames: stores.filter(s => newDiscount.storeIds.includes(s.id)).map(s => s.name),
          newValues: { value: newDiscount.value, type: newDiscount.type, status: 'active' },
          reason, approvalStatus: 'pending',
        };
        setPendingChanges(prev => [pc, ...prev]);
        toast.success('Акция создана и отправлена на согласование', { description: newDiscount.title });
      } else {
        toast.success('Акция создана', { description: newDiscount.title });
      }
      addToHistory('created', newDiscount, `Создана: ${reason}`);
    }
    setShowAddModal(false);
    setEditingDiscount(null);
  };

  const handlePauseResume = (discount: Discount, reason: string, isPause: boolean) => {
    const newStatus: DiscountStatus = isPause ? 'paused' : 'active';
    const updated = { ...discount, status: newStatus, updatedBy: user?.name, updatedByRole: user?.role, updatedAt: new Date().toISOString() };
    setDiscounts(prev => prev.map(d => d.id === discount.id ? updated : d));

    if (!isAdmin) {
      const pc: PendingChange = {
        id: `pc-${Date.now()}-${++idSeqRef.current}`, discountId: discount.id, discountTitle: discount.title,
        changeType: isPause ? 'paused' : 'resumed',
        changedBy: user?.name ?? 'Пользователь', changedByRole: user?.role ?? 'Merchant',
        changedAt: new Date().toISOString(), storeNames: stores.filter(s => discount.storeIds.includes(s.id)).map(s => s.name),
        reason, approvalStatus: 'pending',
      };
      setPendingChanges(prev => [pc, ...prev]);
      toast.info(isPause ? 'Приостановка отправлена на согласование' : 'Возобновление отправлено на согласование');
    } else {
      toast.success(isPause ? `Акция приостановлена: ${discount.title}` : `Акция возобновлена: ${discount.title}`);
    }
    addToHistory(isPause ? 'paused' : 'resumed', discount, reason);
    setConfirmAction(null);
  };

  const handleDelete = (discount: Discount, reason: string) => {
    setDiscounts(prev => prev.filter(d => d.id !== discount.id));
    addToHistory('deleted', discount, reason);
    toast.success(`Акция удалена: ${discount.title}`);
    setConfirmAction(null);
  };

  const handleReview = (changeId: string, approved: boolean, note: string) => {
    setPendingChanges(prev => prev.map(p => p.id === changeId ? {
      ...p, approvalStatus: approved ? 'approved' : 'rejected',
      reviewedBy: user?.name, reviewedAt: new Date().toISOString(),
    } : p));
    if (approved) {
      toast.success('Изменение одобрено и применено', { description: note || undefined });
    } else {
      toast.error('Изменение отклонено', { description: note });
    }
    setReviewingChange(null);

    const change = pendingChanges.find(p => p.id === changeId);
    if (change) {
      const disc = discounts.find(d => d.id === change.discountId);
      if (disc) addToHistory(approved ? 'approved' : 'rejected', disc, note || (approved ? 'Одобрено' : 'Отклонено'));
    }
  };

  const ACTION_LABELS: Record<string, string> = {
    created: 'Создана', edited: 'Изменена', paused: 'Приостановлена',
    resumed: 'Возобновлена', deleted: 'Удалена', approved: 'Одобрена', rejected: 'Отклонена', expired: 'Истекла',
  };

  const SUB_TABS: { id: SubTab; label: string; icon: any; count?: number }[] = [
    { id: 'store',   label: 'Акции магазинов', icon: Store },
    { id: 'global',  label: 'Общие акции',     icon: Globe },
    { id: 'pending', label: 'На согласовании', icon: Bell,    count: pendingCount },
    { id: 'history', label: 'История',          icon: History },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-900">Управление скидками и акциями</h3>
          <p className="text-xs text-gray-500 mt-0.5">Все изменения фиксируются в аудит-логе и отправляются суперадмину</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => toast.info('Отчёт по скидкам', { description: 'Экспорт Excel скоро будет доступен' })}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" />Экспорт
          </button>
          <button onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" />Добавить акцию
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Активных акций', value: activeCount, color: 'text-green-600',  bg: 'bg-green-50',  icon: CheckCircle2,  fv: 'seller' as string | null },
          { label: 'Общих акций',    value: globalCount, color: 'text-blue-600',   bg: 'bg-blue-50',   icon: Globe,         fv: 'global' as string | null },
          { label: 'Применений',     value: totalUsed,   color: 'text-purple-600', bg: 'bg-purple-50', icon: ShoppingCart,  fv: null },
          { label: 'Скидок выдано',  value: `₽${Math.round(totalSavings / 1000)}K`, color: 'text-orange-600', bg: 'bg-orange-50', icon: Tag, fv: null },
        ].map(kpi => {
          const KpiIcon = kpi.icon;
          return (
            <button
              key={kpi.label}
              onClick={() => { if (kpi.fv) setSubTab(kpi.fv as any); }}
              className={`${kpi.bg} rounded-xl p-4 flex items-center gap-3 text-left transition-all ${kpi.fv ? 'cursor-pointer hover:shadow-md active:scale-[0.97]' : 'cursor-default'}`}
            >
              <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                <KpiIcon className={`w-4 h-4 ${kpi.color}`} />
              </div>
              <div>
                <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
                <p className="text-[10px] text-gray-500">{kpi.label}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {SUB_TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = subTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setSubTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all relative ${isActive ? 'bg-white shadow text-blue-700' : 'text-gray-600 hover:text-gray-900'}`}>
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-orange-500 text-white rounded-full text-[10px] font-bold leading-none">{tab.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search bar (store/global tabs) */}
      {(subTab === 'store' || subTab === 'global') && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Поиск по названию..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <span className="text-xs text-gray-500">
            {subTab === 'store' ? storeDiscounts.length : globalDiscounts.length} акций
          </span>
        </div>
      )}

      {/* ── Store Discounts Tab ── */}
      {subTab === 'store' && (
        <div>
          {storeDiscounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 border border-dashed border-gray-300 rounded-xl">
              <Tag className="w-12 h-12 mb-3 opacity-20" />
              <p className="font-medium">Акции магазинов не найдены</p>
              <p className="text-xs mt-1">Добавьте первую акцию, нажав «Добавить акцию»</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {storeDiscounts.map(d => (
                <DiscountCard key={d.id} discount={d} stores={stores} isSuperAdmin={isSuperAdmin}
                  onEdit={disc => setEditingDiscount(disc)}
                  onPause={disc => setConfirmAction({ type: 'pause', discount: disc })}
                  onResume={disc => setConfirmAction({ type: 'resume', discount: disc })}
                  onDelete={disc => setConfirmAction({ type: 'delete', discount: disc })}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Global Discounts Tab ── */}
      {subTab === 'global' && (
        <div>
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3 mb-4">
            <Globe className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-blue-800">Общие акции применяются ко всем магазинам продавца</p>
              <p className="text-[10px] text-blue-600 mt-0.5">Изменения требуют согласования суперадмина и фиксируются в аудит-логе.</p>
            </div>
          </div>
          {globalDiscounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 border border-dashed border-gray-300 rounded-xl">
              <Globe className="w-12 h-12 mb-3 opacity-20" />
              <p className="font-medium">Общих акций нет</p>
              <p className="text-xs mt-1">Создайте акцию с областью «Все магазины»</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {globalDiscounts.map(d => (
                <DiscountCard key={d.id} discount={d} stores={stores} isSuperAdmin={isSuperAdmin}
                  onEdit={disc => setEditingDiscount(disc)}
                  onPause={disc => setConfirmAction({ type: 'pause', discount: disc })}
                  onResume={disc => setConfirmAction({ type: 'resume', discount: disc })}
                  onDelete={disc => setConfirmAction({ type: 'delete', discount: disc })}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Pending Approval Tab ── */}
      {subTab === 'pending' && (
        <div className="space-y-3">
          {pendingChanges.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 border border-dashed border-gray-300 rounded-xl">
              <CheckCircle2 className="w-12 h-12 mb-3 opacity-20" />
              <p className="font-medium">Нет изменений на согласовании</p>
            </div>
          ) : (
            pendingChanges.map(pc => {
              const CHANGE_LABELS: Record<string, string> = {
                created: 'Создание', edited: 'Редактирование', paused: 'Приостановка',
                resumed: 'Возобновление', deleted: 'Удаление',
              };
              const isResolved = pc.approvalStatus !== 'pending';
              return (
                <div key={pc.id} className={`bg-white border rounded-xl p-4 ${isResolved ? 'opacity-60' : pc.approvalStatus === 'pending' ? 'border-orange-200' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-semibold text-gray-900 text-sm">{pc.discountTitle}</p>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          pc.approvalStatus === 'pending' ? 'bg-orange-100 text-orange-700' :
                          pc.approvalStatus === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {pc.approvalStatus === 'pending' ? '⏳ Ожидает' : pc.approvalStatus === 'approved' ? '✓ Одобрено' : '✗ Отклонено'}
                        </span>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[10px] font-medium">
                          {CHANGE_LABELS[pc.changeType] ?? pc.changeType}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-xs text-gray-500">
                        <span><User className="w-3 h-3 inline mr-1" />{pc.changedBy} · {pc.changedByRole}</span>
                        <span><Clock className="w-3 h-3 inline mr-1" />{fmtDateTime(pc.changedAt)}</span>
                        <span><Store className="w-3 h-3 inline mr-1" />{pc.storeNames.join(', ')}</span>
                        {pc.reviewedBy && <span><Check className="w-3 h-3 inline mr-1 text-green-600" />Рассмотрел: {pc.reviewedBy}</span>}
                      </div>
                      <div className="mt-2 p-2 bg-gray-50 rounded-lg text-xs text-gray-700">
                        <span className="font-medium text-gray-600">Причина: </span>{pc.reason}
                      </div>
                    </div>
                    {pc.approvalStatus === 'pending' && isSuperAdmin && (
                      <button onClick={() => setReviewingChange(pc)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors shrink-0">
                        <Shield className="w-3.5 h-3.5" />Рассмотреть
                      </button>
                    )}
                    {pc.approvalStatus === 'pending' && !isSuperAdmin && (
                      <span className="text-xs text-gray-400 shrink-0">Ожидает суперадмина</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── History Tab ── */}
      {subTab === 'history' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-gray-500" />
              <p className="font-semibold text-gray-900 text-sm">Аудит-лог изменений</p>
            </div>
            <span className="text-xs text-gray-400">{historyEntries.length} записей</span>
          </div>
          <div className="divide-y divide-gray-50">
            {historyEntries.map(entry => (
              <div key={entry.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                  entry.action === 'created' ? 'bg-green-100' :
                  entry.action === 'deleted' ? 'bg-red-100' :
                  entry.action === 'approved' ? 'bg-green-100' :
                  entry.action === 'rejected' ? 'bg-red-100' :
                  entry.action === 'paused' ? 'bg-yellow-100' : 'bg-blue-100'
                }`}>
                  {entry.action === 'created' && <Plus className="w-3.5 h-3.5 text-green-600" />}
                  {entry.action === 'edited' && <Edit2 className="w-3.5 h-3.5 text-blue-600" />}
                  {entry.action === 'paused' && <Pause className="w-3.5 h-3.5 text-yellow-600" />}
                  {entry.action === 'resumed' && <Play className="w-3.5 h-3.5 text-green-600" />}
                  {entry.action === 'deleted' && <Trash2 className="w-3.5 h-3.5 text-red-600" />}
                  {entry.action === 'approved' && <Check className="w-3.5 h-3.5 text-green-600" />}
                  {entry.action === 'rejected' && <X className="w-3.5 h-3.5 text-red-600" />}
                  {entry.action === 'expired' && <Clock className="w-3.5 h-3.5 text-gray-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 text-sm">{entry.discountTitle}</span>
                    <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium">
                      {ACTION_LABELS[entry.action] ?? entry.action}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">{entry.details}</p>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
                    <span><User className="w-2.5 h-2.5 inline mr-0.5" />{entry.performedBy} · {entry.performedByRole}</span>
                    <span><Clock className="w-2.5 h-2.5 inline mr-0.5" />{fmtDateTime(entry.performedAt)}</span>
                    <span className="font-mono">{entry.ip}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      <AnimatePresence>
        {(showAddModal || editingDiscount) && (
          <DiscountFormModal
            discount={editingDiscount}
            stores={stores}
            onSave={handleSaveDiscount}
            onClose={() => { setShowAddModal(false); setEditingDiscount(null); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmAction && (
          <ConfirmActionModal
            title={
              confirmAction.type === 'delete' ? 'Удалить акцию?' :
              confirmAction.type === 'pause' ? 'Приостановить акцию?' : 'Возобновить акцию?'
            }
            description={`«${confirmAction.discount.title}»`}
            actionLabel={confirmAction.type === 'delete' ? 'Удалить' : confirmAction.type === 'pause' ? 'Приостановить' : 'Возобновить'}
            actionColor={confirmAction.type === 'delete' ? 'red' : 'yellow'}
            icon={confirmAction.type === 'delete' ? Trash2 : confirmAction.type === 'pause' ? Pause : Play}
            onConfirm={reason => {
              if (confirmAction.type === 'delete') handleDelete(confirmAction.discount, reason);
              else handlePauseResume(confirmAction.discount, reason, confirmAction.type === 'pause');
            }}
            onClose={() => setConfirmAction(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {reviewingChange && (
          <ReviewModal change={reviewingChange} onDecide={handleReview} onClose={() => setReviewingChange(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
