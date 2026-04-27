import { useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import {
  Tag, Plus, Pencil as Edit2, Trash2, Check, X, Search, Globe,
  Shield, Clock, History, Download, Percent, DollarSign,
  ShoppingCart, Zap, Package, Store, Users, ChevronDown,
  Calendar, Send, Pause, Play, CheckCircle2, Bell, Filter,
  TrendingUp, BarChart2, Eye, Copy, Star, FileText, User,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { exportToCsv } from '../../utils/downloads';

// ─── Types ────────────────────────────────────────────────────────────────────

type GDiscountType = 'percentage' | 'fixed' | 'free_delivery' | 'flash' | 'bxgy';
type GDiscountStatus = 'active' | 'scheduled' | 'expired' | 'paused' | 'pending_approval';
type TargetType = 'all_stores' | 'category' | 'merchant_type' | 'selected_merchants';

interface GlobalDiscount {
  id: string;
  title: string;
  type: GDiscountType;
  value: number;
  minOrder: number;
  maxUses?: number;
  usedCount: number;
  targetType: TargetType;
  targetIds?: string[];          // merchant IDs or category names
  merchantTypes?: string[];
  categories?: string[];
  startDate: string;
  endDate?: string;
  status: GDiscountStatus;
  promoCode?: string;
  stackable: boolean;
  priority: number;              // 1 = highest
  createdBy: string;
  createdByRole: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
  note?: string;
  pendingApprovals: number;
}

interface PendingApproval {
  id: string;
  discountId: string;
  discountTitle: string;
  changeType: 'created' | 'edited' | 'paused' | 'deleted';
  changedBy: string;
  changedByRole: string;
  changedAt: string;
  reason: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
}

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_CFG: Record<GDiscountType, { label: string; icon: any; color: string; bg: string }> = {
  percentage:    { label: '% Скидка',         icon: Percent,      color: 'text-blue-700',   bg: 'bg-blue-100' },
  fixed:         { label: '₽ Фиксированная',  icon: DollarSign,   color: 'text-green-700',  bg: 'bg-green-100' },
  free_delivery: { label: 'Бесплатная дост.', icon: ShoppingCart, color: 'text-purple-700', bg: 'bg-purple-100' },
  flash:         { label: 'Флеш-акция',       icon: Zap,          color: 'text-red-700',    bg: 'bg-red-100' },
  bxgy:          { label: 'Купи X — получи Y', icon: Package,     color: 'text-orange-700', bg: 'bg-orange-100' },
};

const STATUS_CFG: Record<GDiscountStatus, { label: string; dot: string; badge: string }> = {
  active:           { label: 'Активна',       dot: 'bg-green-500',  badge: 'bg-green-100 text-green-700' },
  scheduled:        { label: 'Запланирована', dot: 'bg-blue-400',   badge: 'bg-blue-100 text-blue-700' },
  expired:          { label: 'Истекла',       dot: 'bg-gray-400',   badge: 'bg-gray-100 text-gray-600' },
  paused:           { label: 'Приостановлена',dot: 'bg-yellow-500', badge: 'bg-yellow-100 text-yellow-700' },
  pending_approval: { label: 'На согласовании', dot: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700' },
};

const TARGET_CFG: Record<TargetType, { label: string; icon: any }> = {
  all_stores:         { label: 'Все магазины',     icon: Globe },
  category:           { label: 'По категории',     icon: Package },
  merchant_type:      { label: 'Тип продавца',     icon: Store },
  selected_merchants: { label: 'Выбранные продавцы', icon: Users },
};

const MERCHANT_TYPES = ['restaurant', 'grocery', 'retail', 'pharmacy', 'electronics', 'clothing', 'bakery', 'cafe', 'beauty', 'gifts'];
const MERCHANT_TYPE_LABELS: Record<string, string> = {
  restaurant: 'Рестораны', grocery: 'Продукты (Слабс)', retail: 'Ритейл', pharmacy: 'Аптеки',
  electronics: 'Электроника', clothing: 'Одежда', bakery: 'Выпечка', cafe: 'Кафе', beauty: 'Красота', gifts: 'Подарки',
};
const CATEGORIES = ['Готовая еда', 'Продукты питания', 'Напитки', 'Молочные продукты', 'Хлебобулочные', 'Кондитерские изделия', 'Мясо и птица', 'Фрукты и овощи', 'Бакалея', 'Другое'];

// ─── Mock data ────────────────────────────────────────────────────────────────

const INITIAL_DISCOUNTS: GlobalDiscount[] = [
  {
    id: 'gd-1', title: 'Скидка на первый заказ — Все продавцы',
    type: 'percentage', value: 15, minOrder: 500, maxUses: 5000, usedCount: 2134,
    targetType: 'all_stores', startDate: '2026-01-01', endDate: '2026-06-30',
    status: 'active', promoCode: 'FIRST15', stackable: false, priority: 1,
    createdBy: 'Козлова Н.А.', createdByRole: 'Admin', createdAt: '2025-12-20T10:00:00',
    note: 'Промо для новых пользователей. 1 использование на ак��аунт.', pendingApprovals: 0,
  },
  {
    id: 'gd-2', title: 'Бесплатная доставка — Продукты (Слабс)',
    type: 'free_delivery', value: 0, minOrder: 700, usedCount: 8921,
    targetType: 'merchant_type', merchantTypes: ['grocery'],
    startDate: '2026-02-01', status: 'active', stackable: true, priority: 2,
    createdBy: 'Петров И.С.', createdByRole: 'Admin', createdAt: '2026-01-25T14:00:00',
    pendingApprovals: 0,
  },
  {
    id: 'gd-3', title: 'Флеш пятница -25% рестораны',
    type: 'flash', value: 25, minOrder: 400, maxUses: 2000, usedCount: 2000,
    targetType: 'merchant_type', merchantTypes: ['restaurant', 'cafe'],
    startDate: '2026-02-07', endDate: '2026-02-07', status: 'expired',
    promoCode: 'FLASH25', stackable: false, priority: 3,
    createdBy: 'Козлова Н.А.', createdByRole: 'Admin', createdAt: '2026-02-05T09:00:00',
    pendingApprovals: 0,
  },
  {
    id: 'gd-4', title: 'Летняя скидка 10% — Все',
    type: 'percentage', value: 10, minOrder: 600, usedCount: 0,
    targetType: 'all_stores', startDate: '2026-06-01', endDate: '2026-08-31',
    status: 'scheduled', stackable: true, priority: 4,
    createdBy: 'Козлова Н.А.', createdByRole: 'Admin', createdAt: '2026-02-28T09:00:00',
    pendingApprovals: 0,
  },
  {
    id: 'gd-5', title: 'Скидка 300₽ на аптеки',
    type: 'fixed', value: 300, minOrder: 1500, usedCount: 432,
    targetType: 'merchant_type', merchantTypes: ['pharmacy'],
    startDate: '2026-03-01', endDate: '2026-04-30', status: 'scheduled',
    stackable: false, priority: 5,
    createdBy: 'Петров И.С.', createdByRole: 'Admin', createdAt: '2026-02-27T16:00:00',
    pendingApprovals: 1,
  },
  {
    id: 'gd-6', title: 'Купи 2 получи 1 — Выпечка',
    type: 'bxgy', value: 0, minOrder: 0, usedCount: 0,
    targetType: 'category', categories: ['Хлебобулочные', 'Кондитерские изделия'],
    startDate: '2026-03-08', status: 'pending_approval', stackable: false, priority: 6,
    createdBy: 'Иванов А.А.', createdByRole: 'Merchant', createdAt: '2026-03-01T11:00:00',
    note: 'К 8 марта. Ожидает согласования суперадмина.', pendingApprovals: 1,
  },
];

const INITIAL_PENDING: PendingApproval[] = [
  {
    id: 'pa-1', discountId: 'gd-5', discountTitle: 'Скидка 300₽ на аптеки',
    changeType: 'edited', changedBy: 'Петров И.С.', changedByRole: 'Admin',
    changedAt: '2026-02-27T16:00:00', reason: 'Увеличение порога минимального заказа с 1000₽ до 1500₽ для повышения среднего чека.',
    approvalStatus: 'pending',
  },
  {
    id: 'pa-2', discountId: 'gd-6', discountTitle: 'Купи 2 получи 1 — Выпечка',
    changeType: 'created', changedBy: 'Иванов А.А.', changedByRole: 'Merchant',
    changedAt: '2026-03-01T11:00:00', reason: 'Акция к 8 марта для категории хлебобулочных изделий.',
    approvalStatus: 'pending',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function valueLabel(d: GlobalDiscount) {
  if (d.type === 'percentage' || d.type === 'flash') return `${d.value}%`;
  if (d.type === 'fixed') return `${d.value}₽`;
  if (d.type === 'free_delivery') return 'Бесплатно';
  return '1 бесплатно';
}

// ─── Add/Edit Modal ───────────────────────────────────────────────────────────

function DiscountModal({ discount, onSave, onClose }: {
  discount?: GlobalDiscount | null;
  onSave: (data: Partial<GlobalDiscount>, reason: string) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(discount?.title ?? '');
  const [type, setType] = useState<GDiscountType>(discount?.type ?? 'percentage');
  const [value, setValue] = useState(String(discount?.value ?? ''));
  const [minOrder, setMinOrder] = useState(String(discount?.minOrder ?? '0'));
  const [maxUses, setMaxUses] = useState(discount?.maxUses ? String(discount.maxUses) : '');
  const [targetType, setTargetType] = useState<TargetType>(discount?.targetType ?? 'all_stores');
  const [selectedMerchantTypes, setSelectedMerchantTypes] = useState<string[]>(discount?.merchantTypes ?? []);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(discount?.categories ?? []);
  const [startDate, setStartDate] = useState(discount?.startDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(discount?.endDate?.slice(0, 10) ?? '');
  const [promoCode, setPromoCode] = useState(discount?.promoCode ?? '');
  const [stackable, setStackable] = useState(discount?.stackable ?? false);
  const [priority, setPriority] = useState(String(discount?.priority ?? '5'));
  const [note, setNote] = useState(discount?.note ?? '');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isEdit = !!discount;

  const toggleMerchantType = (t: string) => setSelectedMerchantTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  const toggleCategory = (c: string) => setSelectedCategories(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = 'Введите название';
    if ((type === 'percentage' || type === 'flash') && (isNaN(Number(value)) || Number(value) <= 0 || Number(value) > 100)) e.value = 'Укажите % от 1 до 100';
    if (type === 'fixed' && (isNaN(Number(value)) || Number(value) <= 0)) e.value = 'Укажите сумму';
    if (targetType === 'merchant_type' && selectedMerchantTypes.length === 0) e.target = 'Выберите тип продавца';
    if (targetType === 'category' && selectedCategories.length === 0) e.target = 'Выберите категории';
    if (!reason.trim()) e.reason = 'Укажите причину (аудит-лог)';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      title: title.trim(), type, value: ['free_delivery', 'bxgy'].includes(type) ? 0 : Number(value),
      minOrder: Number(minOrder) || 0, maxUses: maxUses ? Number(maxUses) : undefined,
      targetType, merchantTypes: targetType === 'merchant_type' ? selectedMerchantTypes : undefined,
      categories: targetType === 'category' ? selectedCategories : undefined,
      startDate, endDate: endDate || undefined,
      promoCode: promoCode.trim().toUpperCase() || undefined, stackable,
      priority: Number(priority) || 5, note: note.trim() || undefined,
    }, reason.trim());
  };

  const inputCls = (err?: string) =>
    `w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${err ? 'border-red-300 bg-red-50' : 'border-gray-200'}`;

  return ReactDOM.createPortal(
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[999] flex items-center justify-center p-4" onClick={onClose}>
        <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" />
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[92vh] overflow-hidden"
          onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 shrink-0">
            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
              <Globe className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 text-sm">{isEdit ? 'Редактировать общую акцию' : 'Новая общая акция'}</p>
              <p className="text-[10px] text-gray-400">Применяется ко всем продавцам или выбранной группе</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors shrink-0"><X className="w-4 h-4 text-gray-500" /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Название акции *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Например: Бесплатная доставка для продуктов" className={inputCls(errors.title)} />
              {errors.title && <p className="text-[10px] text-red-500 mt-1">{errors.title}</p>}
            </div>

            {/* Type */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">Тип акции *</label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(TYPE_CFG) as [GDiscountType, typeof TYPE_CFG[GDiscountType]][]).map(([t, cfg]) => {
                  const Icon = cfg.icon;
                  return (
                    <button key={t} onClick={() => setType(t)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-medium transition-all ${type === t ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      <Icon className={`w-4 h-4 ${type === t ? 'text-blue-600' : 'text-gray-400'}`} />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Value */}
            {!['free_delivery', 'bxgy'].includes(type) && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  {type === 'fixed' ? 'Сумма скидки (₽) *' : 'Размер скидки (%) *'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{type === 'fixed' ? '₽' : '%'}</span>
                  <input type="number" value={value} onChange={e => setValue(e.target.value)}
                    placeholder={type === 'fixed' ? '300' : '15'} min="0" max={type === 'fixed' ? undefined : 100}
                    className={`${inputCls(errors.value)} pl-7`} />
                </div>
                {errors.value && <p className="text-[10px] text-red-500 mt-1">{errors.value}</p>}
              </div>
            )}

            {/* Target */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">Кому применяется *</label>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {(Object.entries(TARGET_CFG) as [TargetType, typeof TARGET_CFG[TargetType]][]).map(([t, cfg]) => {
                  const Icon = cfg.icon;
                  return (
                    <button key={t} onClick={() => setTargetType(t)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border-2 text-xs font-medium transition-all ${targetType === t ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      <Icon className={`w-3.5 h-3.5 ${targetType === t ? 'text-blue-600' : 'text-gray-400'}`} />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>

              {targetType === 'merchant_type' && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Тип продавца</p>
                  <div className="flex flex-wrap gap-2">
                    {MERCHANT_TYPES.map(mt => (
                      <button key={mt} onClick={() => toggleMerchantType(mt)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${selectedMerchantTypes.includes(mt) ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                        {MERCHANT_TYPE_LABELS[mt] ?? mt}
                      </button>
                    ))}
                  </div>
                  {errors.target && <p className="text-[10px] text-red-500 mt-1">{errors.target}</p>}
                </div>
              )}

              {targetType === 'category' && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Категории товаров</p>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map(cat => (
                      <button key={cat} onClick={() => toggleCategory(cat)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${selectedCategories.includes(cat) ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                        {cat}
                      </button>
                    ))}
                  </div>
                  {errors.target && <p className="text-[10px] text-red-500 mt-1">{errors.target}</p>}
                </div>
              )}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Начало *</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputCls()} />
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

            {/* Promo + max uses + priority */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Промокод</label>
                <input value={promoCode} onChange={e => setPromoCode(e.target.value.toUpperCase())} placeholder="SUMMER20" className={inputCls()} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Макс. использований</label>
                <input type="number" value={maxUses} onChange={e => setMaxUses(e.target.value)} placeholder="Без лимита" min="1" className={inputCls()} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Приоритет (1=высший)</label>
                <input type="number" value={priority} onChange={e => setPriority(e.target.value)} placeholder="5" min="1" max="10" className={inputCls()} />
              </div>
            </div>

            {/* Stackable */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <button onClick={() => setStackable(v => !v)}
                className={`relative rounded-full transition-colors shrink-0 ${stackable ? 'bg-blue-600' : 'bg-gray-300'}`}
                style={{ width: '40px', height: '22px' }}>
                <div className={`absolute top-0.5 bg-white rounded-full shadow transition-all`}
                  style={{ width: '18px', height: '18px', left: stackable ? '20px' : '2px' }} />
              </button>
              <div>
                <p className="text-xs font-semibold text-gray-700">Суммирование с другими акциями</p>
                <p className="text-[10px] text-gray-500">Скидка суммируется с другими активными акциями</p>
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Внутренняя заметка</label>
              <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
                placeholder="Условия, исключения, внутренние комментарии..."
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>

            {/* Reason */}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-amber-600" />
                <p className="text-xs font-bold text-amber-800">Причина изменения (обязательно) *</p>
              </div>
              <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
                placeholder="Укажите причину. Сохранится в аудит-логе."
                className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none bg-white ${errors.reason ? 'border-red-300' : 'border-amber-200'}`} />
              {errors.reason && <p className="text-[10px] text-red-500 mt-1">{errors.reason}</p>}
            </div>
          </div>

          <div className="flex gap-3 px-6 pb-6 pt-3 border-t border-gray-100 shrink-0">
            <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Отмена</button>
            <button onClick={handleSave}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
              <Send className="w-4 h-4" />
              {isEdit ? 'Сохранить изменения' : 'Создать акцию'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

// ─── Discount Card ────────────────────────────────────────────────────────────

function GDiscountCard({ discount, isSuperAdmin, onEdit, onPause, onResume, onDelete }: {
  discount: GlobalDiscount;
  isSuperAdmin: boolean;
  onEdit: (d: GlobalDiscount) => void;
  onPause: (d: GlobalDiscount) => void;
  onResume: (d: GlobalDiscount) => void;
  onDelete: (d: GlobalDiscount) => void;
}) {
  const type = TYPE_CFG[discount.type];
  const status = STATUS_CFG[discount.status];
  const target = TARGET_CFG[discount.targetType];
  const TypeIcon = type.icon;
  const TargetIcon = target.icon;
  const usagePercent = discount.maxUses ? Math.round((discount.usedCount / discount.maxUses) * 100) : null;
  const isExpired = discount.status === 'expired';

  const targetLabel = useMemo(() => {
    if (discount.targetType === 'all_stores') return 'Все магазины';
    if (discount.targetType === 'merchant_type') return (discount.merchantTypes ?? []).map(t => MERCHANT_TYPE_LABELS[t] ?? t).join(', ');
    if (discount.targetType === 'category') return (discount.categories ?? []).join(', ');
    return 'Выбранные продацы';
  }, [discount]);

  return (
    <div className={`bg-white border rounded-xl p-4 hover:shadow-md transition-all ${isExpired ? 'opacity-60' : ''} ${discount.status === 'pending_approval' ? 'border-orange-300 bg-orange-50/20' : 'border-gray-200'}`}>
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
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${status.badge}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />{status.label}
          </span>
          <span className="text-[10px] text-gray-400">P{discount.priority}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="p-2 bg-gray-50 rounded-lg text-center">
          <p className="text-[10px] text-gray-500 mb-0.5">Скидка</p>
          <p className="font-bold text-gray-900 text-sm">{valueLabel(discount)}</p>
        </div>
        <div className="p-2 bg-gray-50 rounded-lg text-center">
          <p className="text-[10px] text-gray-500 mb-0.5">Мин. заказ</p>
          <p className="font-bold text-gray-900 text-sm">{discount.minOrder > 0 ? `₽${discount.minOrder}` : '—'}</p>
        </div>
      </div>

      {/* Usage bar */}
      {discount.maxUses && (
        <div className="mb-3">
          <div className="flex justify-between text-[10px] text-gray-500 mb-1">
            <span>Использовано</span><span>{discount.usedCount.toLocaleString()} / {discount.maxUses.toLocaleString()}</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${usagePercent! >= 90 ? 'bg-red-500' : usagePercent! >= 70 ? 'bg-orange-500' : 'bg-blue-500'}`}
              style={{ width: `${Math.min(usagePercent!, 100)}%` }} />
          </div>
        </div>
      )}

      {/* Target + dates */}
      <div className="flex flex-wrap gap-2 mb-3 text-[10px]">
        <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium">
          <TargetIcon className="w-2.5 h-2.5" />{targetLabel}
        </span>
        {discount.promoCode && (
          <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full font-mono font-semibold">{discount.promoCode}</span>
        )}
        {discount.stackable && <span className="flex items-center gap-0.5 text-green-600 px-1"><Check className="w-2.5 h-2.5" />Сумм.</span>}
      </div>

      <div className="flex items-center gap-3 text-[10px] text-gray-500 mb-3">
        <Calendar className="w-3 h-3 shrink-0" />
        <span>{fmtDate(discount.startDate)}{discount.endDate ? ` — ${fmtDate(discount.endDate)}` : ' → ∞'}</span>
      </div>

      {/* Pending badge */}
      {discount.pendingApprovals > 0 && (
        <div className="flex items-center gap-1.5 text-[10px] text-orange-700 bg-orange-50 rounded-lg px-2 py-1 mb-2">
          <Bell className="w-3 h-3" />{discount.pendingApprovals} ожидает согласования
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
            ? <button onClick={() => onResume(discount)} className="flex items-center gap-1 py-1.5 px-2.5 border border-green-200 text-green-700 rounded-lg text-xs hover:bg-green-50 transition-colors"><Play className="w-3 h-3" /></button>
            : <button onClick={() => onPause(discount)} className="flex items-center gap-1 py-1.5 px-2.5 border border-yellow-200 text-yellow-700 rounded-lg text-xs hover:bg-yellow-50 transition-colors"><Pause className="w-3 h-3" /></button>
          }
          {isSuperAdmin && (
            <button onClick={() => onDelete(discount)} className="flex items-center gap-1 py-1.5 px-2.5 border border-red-200 text-red-600 rounded-lg text-xs hover:bg-red-50 transition-colors"><Trash2 className="w-3 h-3" /></button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function DiscountsPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SuperAdmin';
  const isAdmin = user?.role === 'SuperAdmin' || user?.role === 'Admin';

  const [discounts, setDiscounts] = useState<GlobalDiscount[]>(INITIAL_DISCOUNTS);
  const [pending, setPending] = useState<PendingApproval[]>(INITIAL_PENDING);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<GDiscountStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<GDiscountType | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<GlobalDiscount | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'history'>('all');

  const filtered = useMemo(() => discounts.filter(d => {
    const q = search.toLowerCase();
    const matchSearch = !q || d.title.toLowerCase().includes(q) || (d.promoCode?.toLowerCase() ?? '').includes(q);
    const matchStatus = statusFilter === 'all' || d.status === statusFilter;
    const matchType = typeFilter === 'all' || d.type === typeFilter;
    return matchSearch && matchStatus && matchType;
  }), [discounts, search, statusFilter, typeFilter]);

  const pendingCount = pending.filter(p => p.approvalStatus === 'pending').length;

  const kpis = useMemo(() => ({
    active: discounts.filter(d => d.status === 'active').length,
    total: discounts.length,
    usedTotal: discounts.reduce((s, d) => s + d.usedCount, 0),
    savings: discounts.reduce((s, d) => {
      if (d.type === 'percentage' || d.type === 'flash') return s + d.usedCount * (d.minOrder || 500) * d.value / 100;
      if (d.type === 'fixed') return s + d.usedCount * d.value;
      return s + d.usedCount * 200;
    }, 0),
  }), [discounts]);

  const handleSaveDiscount = (data: Partial<GlobalDiscount>, reason: string) => {
    if (editingDiscount) {
      setDiscounts(prev => prev.map(d => d.id === editingDiscount.id ? {
        ...d, ...data, updatedBy: user?.name, updatedAt: new Date().toISOString(),
      } : d));
      toast.success('Акция обновлена', { description: reason });
    } else {
      const nd: GlobalDiscount = {
        id: `gd-${Date.now()}`, ...data as GlobalDiscount, usedCount: 0,
        status: isAdmin ? 'active' : 'pending_approval',
        createdBy: user?.name ?? 'Администратор', createdByRole: user?.role ?? 'Admin',
        createdAt: new Date().toISOString(), pendingApprovals: 0,
      };
      setDiscounts(prev => [...prev, nd]);
      toast.success('Акция создана', { description: nd.title });
    }
    setShowAddModal(false);
    setEditingDiscount(null);
  };

  const handlePause = (d: GlobalDiscount) => {
    setDiscounts(prev => prev.map(x => x.id === d.id ? { ...x, status: 'paused', updatedBy: user?.name, updatedAt: new Date().toISOString() } : x));
    toast.success(`Акция приостановлена: ${d.title}`);
  };
  const handleResume = (d: GlobalDiscount) => {
    setDiscounts(prev => prev.map(x => x.id === d.id ? { ...x, status: 'active', updatedBy: user?.name, updatedAt: new Date().toISOString() } : x));
    toast.success(`Акция возобновлена: ${d.title}`);
  };
  const handleDelete = (d: GlobalDiscount) => {
    setDiscounts(prev => prev.filter(x => x.id !== d.id));
    toast.success(`Акция удалена: ${d.title}`);
  };

  const handleApprove = (paId: string, approved: boolean) => {
    setPending(prev => prev.map(p => p.id === paId ? { ...p, approvalStatus: approved ? 'approved' : 'rejected' } : p));
    const pa = pending.find(p => p.id === paId);
    if (pa && approved) {
      setDiscounts(prev => prev.map(d => d.id === pa.discountId ? { ...d, status: 'active', pendingApprovals: Math.max(0, d.pendingApprovals - 1) } : d));
    }
    toast.success(approved ? '✓ Изменение одобрено' : '✗ Изменение отклонено');
  };

  const TABS = [
    { id: 'all', label: 'Все акции', icon: Tag },
    { id: 'pending', label: 'На согласовании', icon: Bell, count: pendingCount },
    { id: 'history', label: 'История', icon: History },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Общие скидки и акции</h1>
          <p className="text-gray-500 text-sm mt-0.5">Платформенные акции для всех продавцов или выбранных сегментов</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (filtered.length === 0) { toast.info('Нет акций для экспорта'); return; }
              exportToCsv(filtered as any[], [
                { key: 'id',          label: 'ID' },
                { key: 'title',       label: 'Название' },
                { key: 'type',        label: 'Тип' },
                { key: 'value',       label: 'Значение' },
                { key: 'minOrder',    label: 'Мин. заказ' },
                { key: 'usedCount',   label: 'Применений' },
                { key: 'maxUses',     label: 'Лимит' },
                { key: 'status',      label: 'Статус' },
                { key: 'startDate',   label: 'Начало' },
                { key: 'endDate',     label: 'Окончание' },
                { key: 'promoCode',   label: 'Промокод' },
                { key: 'createdBy',   label: 'Кем создана' },
              ], 'discounts');
              toast.success(`Скачан CSV: ${filtered.length} акций`);
            }}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" />Экспорт
          </button>
          <button onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" />Создать акцию
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {([
          { label: 'Активных акций', value: kpis.active,                             color: 'text-green-600',  bg: 'bg-green-50',  icon: CheckCircle2, fv: 'active'   as GDiscountStatus | 'all' | null },
          { label: 'Всего акций',    value: kpis.total,                              color: 'text-blue-600',   bg: 'bg-blue-50',   icon: Tag,          fv: 'all'      as GDiscountStatus | 'all' | null },
          { label: 'Применений',     value: kpis.usedTotal.toLocaleString(),         color: 'text-purple-600', bg: 'bg-purple-50', icon: ShoppingCart, fv: null       as GDiscountStatus | 'all' | null },
          { label: 'Выдано скидок',  value: `₽${Math.round(kpis.savings / 1000)}K`, color: 'text-orange-600', bg: 'bg-orange-50', icon: TrendingUp,   fv: null       as GDiscountStatus | 'all' | null },
        ]).map(kpi => {
          const KpiIcon = kpi.icon;
          const isActive = kpi.fv !== null && statusFilter === kpi.fv;
          return (
            <button
              key={kpi.label}
              onClick={() => { if (kpi.fv === null) return; setStatusFilter(statusFilter === kpi.fv ? 'all' : kpi.fv as any); }}
              className={`${kpi.bg} rounded-xl p-4 flex items-center gap-3 border border-transparent text-left transition-all ${kpi.fv !== null ? 'cursor-pointer hover:shadow-md active:scale-[0.97]' : 'cursor-default'} ${isActive ? 'ring-2 ring-offset-1 shadow-sm border-current' : ''}`}
            >
              <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                <KpiIcon className={`w-5 h-5 ${kpi.color}`} />
              </div>
              <div>
                <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
                <p className="text-[10px] text-gray-500">{kpi.label}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive ? 'bg-white shadow text-blue-700' : 'text-gray-600 hover:text-gray-900'}`}>
              <Icon className="w-3.5 h-3.5" />{tab.label}
              {'count' in tab && tab.count! > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-orange-500 text-white rounded-full text-[10px] font-bold leading-none">{tab.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* All discounts tab */}
      {activeTab === 'all' && (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Поиск по названию или промокоду..."
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="all">Все статусы</option>
              <option value="active">Активные</option>
              <option value="scheduled">Запланированные</option>
              <option value="paused">Приостановленные</option>
              <option value="expired">Истекшие</option>
              <option value="pending_approval">На согласовании</option>
            </select>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="all">Все типы</option>
              <option value="percentage">% Скидка</option>
              <option value="fixed">₽ Скидка</option>
              <option value="free_delivery">Бесплатная доставка</option>
              <option value="flash">Флеш-акция</option>
              <option value="bxgy">Купи X получи Y</option>
            </select>
            <span className="text-sm text-gray-500 self-center">{filtered.length} акций</span>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 border border-dashed border-gray-300 rounded-xl">
              <Globe className="w-12 h-12 mb-3 opacity-20" />
              <p className="font-medium">Акции не найдены</p>
              <p className="text-xs mt-1">Попробуйте изменить фильтры или создайте новую акцию</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(d => (
                <GDiscountCard key={d.id} discount={d} isSuperAdmin={isSuperAdmin}
                  onEdit={disc => setEditingDiscount(disc)}
                  onPause={handlePause}
                  onResume={handleResume}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Pending tab */}
      {activeTab === 'pending' && (
        <div className="space-y-3">
          {pending.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 border border-dashed border-gray-300 rounded-xl">
              <CheckCircle2 className="w-12 h-12 mb-3 opacity-20" />
              <p className="font-medium">Нет изменений на согласовании</p>
            </div>
          ) : (
            pending.map(pa => (
              <div key={pa.id} className={`bg-white border rounded-xl p-4 ${pa.approvalStatus === 'pending' ? 'border-orange-200' : 'opacity-60 border-gray-200'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-semibold text-gray-900 text-sm">{pa.discountTitle}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        pa.approvalStatus === 'pending' ? 'bg-orange-100 text-orange-700' :
                        pa.approvalStatus === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {pa.approvalStatus === 'pending' ? '⏳ Ожидает' : pa.approvalStatus === 'approved' ? '✓ Одобрено' : '✗ Отклонено'}
                      </span>
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[10px]">
                        {pa.changeType === 'created' ? 'Создание' : pa.changeType === 'edited' ? 'Редактирование' : pa.changeType === 'paused' ? 'Приостановка' : 'Удаление'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs text-gray-500 mb-2">
                      <span><User className="w-3 h-3 inline mr-1" />{pa.changedBy} · {pa.changedByRole}</span>
                      <span><Clock className="w-3 h-3 inline mr-1" />{fmtDateTime(pa.changedAt)}</span>
                    </div>
                    <div className="p-2 bg-gray-50 rounded-lg text-xs text-gray-700">
                      <span className="font-medium">Причина: </span>{pa.reason}
                    </div>
                  </div>
                  {pa.approvalStatus === 'pending' && isSuperAdmin && (
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => handleApprove(pa.id, false)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors">
                        <X className="w-3 h-3" />Отклонить
                      </button>
                      <button onClick={() => handleApprove(pa.id, true)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors">
                        <Check className="w-3 h-3" />Одобрить
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* History tab */}
      {activeTab === 'history' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-gray-500" />
              <p className="font-semibold text-gray-900 text-sm">Аудит-лог платформенных акций</p>
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {[
              { disc: 'Купи 2 получи 1 — Выпечка',       action: 'created', by: 'Иванов А.А.',           role: 'Merchant',    at: '2026-03-01T11:00:00', details: 'Создана и отправлена на согласование.' },
              { disc: 'Летняя скидка 10%',                 action: 'created', by: 'Козлова Н.А.',          role: 'Admin',       at: '2026-02-28T09:00:00', details: 'Создана на период июнь–август 2026.' },
              { disc: 'Скидка 300₽ на аптеки',            action: 'edited',  by: 'Петров И.С.',           role: 'Admin',       at: '2026-02-27T16:00:00', details: 'Мин. заказ 1000₽ → 1500₽. Ожидает согласования.' },
              { disc: 'Флеш пятница -25% рестораны',      action: 'expired', by: 'Система',               role: 'System',      at: '2026-02-07T23:59:59', details: 'Автоматически завершена по дате окончания.' },
              { disc: 'Бесплатная доставка — Продукты',   action: 'created', by: 'Петров И.С.',           role: 'Admin',       at: '2026-01-25T14:00:00', details: 'Акция для сегмента Продукты (Слабс) создана.' },
              { disc: 'Скидка на первый заказ',            action: 'created', by: 'Козлова Н.А.',          role: 'Admin',       at: '2025-12-20T10:00:00', details: 'Стартовое промо FIRST15 для новых пользователей.' },
            ].map((entry, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${entry.action === 'created' ? 'bg-green-100' : entry.action === 'expired' ? 'bg-gray-100' : 'bg-blue-100'}`}>
                  {entry.action === 'created' && <Plus className="w-3.5 h-3.5 text-green-600" />}
                  {entry.action === 'edited' && <Edit2 className="w-3.5 h-3.5 text-blue-600" />}
                  {entry.action === 'expired' && <Clock className="w-3.5 h-3.5 text-gray-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 text-sm">{entry.disc}</span>
                    <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium">
                      {entry.action === 'created' ? 'Создана' : entry.action === 'edited' ? 'Изменена' : 'Истекла'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">{entry.details}</p>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
                    <span><User className="w-2.5 h-2.5 inline mr-0.5" />{entry.by} · {entry.role}</span>
                    <span><Clock className="w-2.5 h-2.5 inline mr-0.5" />{fmtDateTime(entry.at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {(showAddModal || editingDiscount) && (
          <DiscountModal discount={editingDiscount} onSave={handleSaveDiscount} onClose={() => { setShowAddModal(false); setEditingDiscount(null); }} />
        )}
      </AnimatePresence>
    </div>
  );
}