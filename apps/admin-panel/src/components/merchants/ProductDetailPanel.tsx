import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, TrendingUp, TrendingDown, BarChart2, DollarSign,
  Package, Eye, ShoppingCart, ArrowUpRight, Store,
  ChevronRight, ImageIcon, Tag, Percent,
  CheckCircle, AlertTriangle, EyeOff, Clock,
  Pencil as Edit2, Scissors, RefreshCw, Save, ChevronDown,
  Minus, Plus, Check, ZoomIn, CalendarClock, Trash2, Calendar,
} from 'lucide-react';
import {
  AreaChart, Area,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import {
  getProductSalesTrend, getSellerStores, formatCurrency,
  type SellerProduct, type AvailabilityStatus,
} from '../../data/merchants-mock';
import {
  updateProductPrice,
  updateProductAvailability,
  updateProductStock,
  applyProductDiscount,
  getProductOverride,
  setProductExpiryDate,
  getEffectiveExpiryDate,
  calcExpiryInfo,
  formatExpiryDate,
  useLiveProduct,
} from '../../store/productsStore';
import { toast } from 'sonner';
import { ChartWrapper } from '../ui/ChartWrapper';
import { ProductImageLightbox } from './ProductImageLightbox';

// ─── Config ───────────────────────────────────────────────────────────────────

const AVAIL_CFG: Record<AvailabilityStatus, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  available:             { label: 'В наличии',     color: 'text-green-700',  bg: 'bg-green-100',  border: 'border-green-200',  icon: CheckCircle },
  sold_out_today:        { label: 'Нет сегодня',   color: 'text-orange-700', bg: 'bg-orange-100', border: 'border-orange-200', icon: Clock },
  sold_out_indefinitely: { label: 'Нет в наличии', color: 'text-red-700',    bg: 'bg-red-100',    border: 'border-red-200',    icon: AlertTriangle },
  hidden:                { label: 'Скрыт',          color: 'text-gray-500',  bg: 'bg-gray-100',   border: 'border-gray-200',   icon: EyeOff },
};

// ─── Tooltip ─────────────────────────────────────────────────────────────────

function SalesChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-bold text-gray-800 mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
          {p.name}: <span className="font-semibold">{p.dataKey === 'revenue' ? formatCurrency(p.value) : p.value.toLocaleString('ru-RU')}</span>
        </p>
      ))}
    </div>
  );
}

// ─── Price Edit Modal ─────────────────────────────────────────────────────────

function PriceEditModal({ product, onClose }: { product: SellerProduct; onClose: () => void }) {
  const [newPrice, setNewPrice] = useState(String(product.price));
  const [reason, setReason] = useState('');

  const parsed = parseFloat(newPrice.replace(/\s/g, ''));
  const diff = parsed - product.price;
  const diffPct = product.price > 0 ? ((diff / product.price) * 100).toFixed(1) : '0';

  const handleSave = () => {
    if (!parsed || parsed <= 0) { toast.error('Введите корректную цену'); return; }
    if (!reason) { toast.error('Укажите причину изменения цены'); return; }
    updateProductPrice(product.id, parsed, reason);
    toast.success(`Цена ${product.name} изменена: ₽${product.price.toLocaleString()} → ₽${parsed.toLocaleString()}. Событие product.price_changed записано.`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-blue-600" />
            </div>
            <p className="font-bold text-gray-900 text-sm">Изменить цену</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
        </div>

        <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600">
          <p className="font-mono">{product.sku}</p>
          <p className="font-medium text-gray-800 mt-0.5 truncate">{product.name}</p>
          <p className="mt-1">Текущая цена: <span className="font-bold text-gray-900">₽{product.price.toLocaleString()}</span></p>
        </div>

        {/* Price input */}
        <div>
          <label className="text-xs font-medium text-gray-600">Новая цена (₽) *</label>
          <div className="flex items-center gap-2 mt-1">
            <button onClick={() => setNewPrice(v => String(Math.max(1, (parseFloat(v) || 0) - 100)))}
              className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 shrink-0">
              <Minus className="w-3.5 h-3.5" />
            </button>
            <input type="number" value={newPrice} onChange={e => setNewPrice(e.target.value)} min="1"
              className="flex-1 text-center px-3 py-2 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button onClick={() => setNewPrice(v => String((parseFloat(v) || 0) + 100))}
              className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 shrink-0">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          {!isNaN(parsed) && parsed !== product.price && (
            <p className={`text-xs mt-1.5 font-medium ${diff > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {diff > 0 ? '+' : ''}₽{diff.toLocaleString()} ({diff > 0 ? '+' : ''}{diffPct}%)
            </p>
          )}
        </div>

        {/* Reason */}
        <div>
          <label className="text-xs font-medium text-gray-600">Причина изменения *</label>
          <select value={reason} onChange={e => setReason(e.target.value)}
            className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Выберите причину...</option>
            <option value="market_adjust">Корректировка под рынок</option>
            <option value="promo">Акция / промо</option>
            <option value="cost_change">Изменение себестоимости</option>
            <option value="seller_request">Запрос продавца</option>
            <option value="error_fix">Исправление ошибки</option>
            <option value="other">Другое</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Отмена</button>
          <button onClick={handleSave} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5">
            <Save className="w-3.5 h-3.5" />Сохранить
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Discount Modal ───────────────────────────────────────────────────────────

function DiscountModal({ product, onClose }: { product: SellerProduct; onClose: () => void }) {
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [duration, setDuration] = useState('');
  const [reason, setReason] = useState('');

  const parsedVal = parseFloat(discountValue) || 0;
  const discountedPrice = discountType === 'percent'
    ? Math.round(product.price * (1 - parsedVal / 100))
    : Math.round(product.price - parsedVal);
  const validDiscount = parsedVal > 0 && discountedPrice > 0;

  const handleApply = () => {
    if (!validDiscount) { toast.error('Введите корректный размер скидки'); return; }
    if (!duration) { toast.error('Укажите срок действия скидки'); return; }
    applyProductDiscount(product.id, discountType, parsedVal, duration, reason);
    toast.success(
      `Скидка применена: ${product.name} — ₽${product.price.toLocaleString()} → ₽${discountedPrice.toLocaleString()} (${discountType === 'percent' ? `-${parsedVal}%` : `-₽${parsedVal}`}). Действует ${duration}.`
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <Scissors className="w-4 h-4 text-orange-600" />
            </div>
            <p className="font-bold text-gray-900 text-sm">Добавить скидку</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
        </div>

        <div className="bg-orange-50 rounded-xl p-3 text-xs">
          <p className="font-mono text-gray-500">{product.sku}</p>
          <p className="font-medium text-gray-800 mt-0.5 truncate">{product.name}</p>
          <p className="mt-1 text-gray-600">Текущая цена: <span className="font-bold text-gray-900">₽{product.price.toLocaleString()}</span></p>
        </div>

        {/* Type toggle */}
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1.5 block">Тип скидки</label>
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            {[{ v: 'percent' as const, l: 'Процент (%)' }, { v: 'fixed' as const, l: 'Сумма (₽)' }].map(o => (
              <button key={o.v} onClick={() => setDiscountType(o.v)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${discountType === o.v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {o.l}
              </button>
            ))}
          </div>
        </div>

        {/* Value */}
        <div>
          <label className="text-xs font-medium text-gray-600">
            Размер скидки {discountType === 'percent' ? '(%)' : '(₽)'} *
          </label>
          <div className="flex items-center gap-2 mt-1">
            <button onClick={() => setDiscountValue(v => String(Math.max(0, (parseFloat(v) || 0) - (discountType === 'percent' ? 5 : 100))))}
              className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 shrink-0">
              <Minus className="w-3.5 h-3.5 text-gray-600" />
            </button>
            <input type="number" value={discountValue} onChange={e => setDiscountValue(e.target.value)} min="0"
              max={discountType === 'percent' ? '99' : String(product.price - 1)}
              placeholder={discountType === 'percent' ? 'Например: 15' : 'Например: 500'}
              className="flex-1 text-center px-3 py-2 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500" />
            <button onClick={() => setDiscountValue(v => String((parseFloat(v) || 0) + (discountType === 'percent' ? 5 : 100)))}
              className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 shrink-0">
              <Plus className="w-3.5 h-3.5 text-gray-600" />
            </button>
          </div>
          {validDiscount && (
            <div className="mt-2 flex items-center justify-between bg-orange-50 border border-orange-100 rounded-xl px-3 py-2">
              <span className="text-xs text-gray-500">Цена со скидкой:</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 line-through">₽{product.price.toLocaleString()}</span>
                <span className="text-sm font-bold text-orange-700">₽{discountedPrice.toLocaleString()}</span>
                <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-bold">
                  -{discountType === 'percent' ? `${parsedVal}%` : `₽${parsedVal}`}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Duration */}
        <div>
          <label className="text-xs font-medium text-gray-600">Срок действия *</label>
          <select value={duration} onChange={e => setDuration(e.target.value)}
            className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
            <option value="">Выберите срок...</option>
            <option value="1 день">1 день</option>
            <option value="3 дня">3 дня</option>
            <option value="7 дней">7 дней</option>
            <option value="14 дней">14 дней</option>
            <option value="30 дней">30 дней</option>
            <option value="до ручной отмены">До ручной отмены</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Отмена</button>
          <button onClick={handleApply}
            className="flex-1 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-medium hover:bg-orange-700 transition-colors flex items-center justify-center gap-1.5">
            <Scissors className="w-3.5 h-3.5" />Применить скидку
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Availability Edit Modal ──────────────────────────────────────────────────

function AvailabilityModal({ current, productId, productName, onClose }: { current: AvailabilityStatus; productId: string; productName: string; onClose: (v?: AvailabilityStatus) => void }) {
  const [selected, setSelected] = useState<AvailabilityStatus>(current);

  const options: { v: AvailabilityStatus; desc: string }[] = [
    { v: 'available',             desc: 'Товар доступен для заказа во всех магазинах' },
    { v: 'sold_out_today',        desc: 'Недоступен только сегодня, завтра восстановится' },
    { v: 'sold_out_indefinitely', desc: 'Недоступен до ручного восстановления' },
    { v: 'hidden',                desc: 'Скрыт из каталога (не виден покупателям)' },
  ];

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" onClick={() => onClose()}>
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="font-bold text-gray-900 text-sm">Статус наличия</p>
          <button onClick={() => onClose()} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <p className="text-xs text-gray-500 -mt-2 truncate">{productName}</p>

        <div className="space-y-2">
          {options.map(opt => {
            const cfg = AVAIL_CFG[opt.v];
            const Icon = cfg.icon;
            const isSel = selected === opt.v;
            return (
              <button key={opt.v} onClick={() => setSelected(opt.v)}
                className={`w-full flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${isSel ? `${cfg.border} ${cfg.bg}` : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}>
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isSel ? cfg.color : 'text-gray-400'}`} />
                <div>
                  <p className={`text-xs font-bold ${isSel ? cfg.color : 'text-gray-700'}`}>{cfg.label}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{opt.desc}</p>
                </div>
                {isSel && <Check className={`w-4 h-4 ml-auto shrink-0 ${cfg.color}`} />}
              </button>
            );
          })}
        </div>

        <div className="flex gap-2">
          <button onClick={() => onClose()} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Отмена</button>
          <button onClick={() => { updateProductAvailability(productId, selected); onClose(selected); toast.success(`Статус изменён: ${AVAIL_CFG[selected].label}. Событие product.availability_changed записано.`); }}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5">
            <Check className="w-3.5 h-3.5" />Применить
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Stock Edit Modal ────────────────────────────────────────────────────────

function StockEditModal({ product, onClose }: { product: SellerProduct; onClose: () => void }) {
  const [stock, setStock] = useState(String(product.stock ?? 0));
  const [reason, setReason] = useState('');

  const handleSave = () => {
    const v = parseInt(stock);
    if (isNaN(v) || v < 0) { toast.error('Введите корректное количество'); return; }
    updateProductStock(product.id, v, reason);
    toast.success(`Остаток обновлён: ${product.name} — ${v} шт. Событие product.stock_updated записано.`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xs p-5 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="font-bold text-gray-900 text-sm">Обновить остаток</p>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Количество (шт)</label>
          <div className="flex items-center gap-2 mt-1">
            <button onClick={() => setStock(v => String(Math.max(0, parseInt(v) - 1)))}
              className="w-9 h-9 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 shrink-0">
              <Minus className="w-3.5 h-3.5 text-gray-600" />
            </button>
            <input type="number" value={stock} onChange={e => setStock(e.target.value)} min="0"
              className="flex-1 text-center px-3 py-2 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button onClick={() => setStock(v => String((parseInt(v) || 0) + 1))}
              className="w-9 h-9 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 shrink-0">
              <Plus className="w-3.5 h-3.5 text-gray-600" />
            </button>
          </div>
          {product.stock !== null && (
            <p className="text-[10px] text-gray-400 mt-1">Текущий остаток: {product.stock} шт</p>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">Отмена</button>
          <button onClick={handleSave} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-1.5">
            <Save className="w-3.5 h-3.5" />Сохранить
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Expiry Date Modal ────────────────────────────────────────────────────────

function ExpiryDateModal({ product, onClose }: { product: SellerProduct; onClose: () => void }) {
  const currentExpiry = getEffectiveExpiryDate(product);
  const [dateValue, setDateValue] = useState(currentExpiry ?? '');
  const [saving, setSaving] = useState(false);

  const info = dateValue ? calcExpiryInfo(dateValue) : null;

  const handleSave = () => {
    if (!dateValue) { toast.error('Выберите дату срока годности'); return; }
    setSaving(true);
    setTimeout(() => {
      setProductExpiryDate(product.id, product.name, dateValue);
      const info2 = calcExpiryInfo(dateValue);
      if (info2.status === 'expired') {
        toast.error(`Срок годности уже истёк! Товар «${product.name}» снят с продажи.`, { duration: 5000 });
      } else if (info2.status === 'expiring_soon') {
        toast.warning(`Срок годности «${product.name}» истекает через ${info2.daysLeft} дн.! Уведомление отправлено.`, { duration: 4000 });
      } else {
        toast.success(`Срок годности установлен: ${formatExpiryDate(dateValue)}`);
      }
      setSaving(false);
      onClose();
    }, 400);
  };

  const handleClear = () => {
    setProductExpiryDate(product.id, product.name, null);
    toast.info(`Срок годности для «${product.name}» удалён`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-rose-100 rounded-xl flex items-center justify-center shrink-0">
            <CalendarClock className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Срок годности</h3>
            <p className="text-xs text-gray-500 truncate max-w-[200px]">{product.name}</p>
          </div>
          <button onClick={onClose} className="ml-auto p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Дата окончания срока годности</label>
            <input
              type="date"
              value={dateValue}
              onChange={e => setDateValue(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent"
            />
          </div>

          {/* Preview */}
          {info && (
            <div className={`p-3 rounded-xl border text-xs ${
              info.status === 'expired'       ? 'bg-red-50 border-red-200 text-red-700' :
              info.status === 'expiring_soon' ? 'bg-orange-50 border-orange-200 text-orange-700' :
              'bg-green-50 border-green-200 text-green-700'
            }`}>
              <div className="flex items-center gap-2">
                {info.status === 'expired'
                  ? <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  : info.status === 'expiring_soon'
                    ? <Clock className="w-3.5 h-3.5 shrink-0" />
                    : <CheckCircle className="w-3.5 h-3.5 shrink-0" />}
                <span className="font-semibold">
                  {info.status === 'expired'
                    ? `Срок истёк ${Math.abs(info.daysLeft)} дн. назад — товар будет снят с продажи`
                    : info.status === 'expiring_soon'
                      ? info.daysLeft === 0
                        ? 'Срок годности истекает сегодня! Будет отправлено уведомление'
                        : `Истекает через ${info.daysLeft} дн. — уведомление за 3 дня`
                      : `В порядке — осталось ${info.daysLeft} дн.`}
                </span>
              </div>
              {info.status !== 'ok' && (
                <p className="mt-1 text-[10px] opacity-80 ml-5">
                  {info.status === 'expired'
                    ? 'Статус «Нет в наличии» будет установлен автоматически'
                    : 'Уведомление отправлено в центр уведомлений'}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            {currentExpiry && (
              <button onClick={handleClear}
                className="flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-xs font-medium transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Удалить
              </button>
            )}
            <button onClick={handleSave} disabled={saving || !dateValue}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors">
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  product: SellerProduct;
  sellerId: string;
  onClose: () => void;
}

export function ProductDetailPanel({ product, sellerId, onClose }: Props) {
  const trend = useMemo(() => getProductSalesTrend(product.id), [product.id]);
  const stores = useMemo(() => getSellerStores(sellerId), [sellerId]);

  // No local availability state — always read from live product prop
  const [showPriceModal,    setShowPriceModal]    = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showAvailModal,    setShowAvailModal]    = useState(false);
  const [showStockModal,    setShowStockModal]    = useState(false);
  const [showLightbox,      setShowLightbox]      = useState(false);
  const [showExpiryModal,   setShowExpiryModal]   = useState(false);

  // Compute expiry info from store (live)
  const effectiveExpiryDate = getEffectiveExpiryDate(product);
  const expiryInfo = effectiveExpiryDate ? calcExpiryInfo(effectiveExpiryDate) : null;

  // Which stores carry this product
  const storesWithProduct = useMemo(() =>
    stores.filter(s => s.menuItems.some(m => m.name === product.name)),
    [stores, product.name],
  );

  const avail = AVAIL_CFG[product.availability];
  const AvailIcon = avail.icon;

  // 7d totals from trend
  const trend7d = useMemo(() => {
    const totalViews = trend.reduce((s, d) => s + d.views, 0);
    const totalCartAdds = trend.reduce((s, d) => s + d.cartAdds, 0);
    const totalSales = trend.reduce((s, d) => s + d.sales, 0);
    const totalRevenue = trend.reduce((s, d) => s + d.revenue, 0);
    return {
      totalSales, totalRevenue, totalViews, totalCartAdds,
      cartConversion: totalViews > 0 ? ((totalCartAdds / totalViews) * 100).toFixed(1) : '0',
      orderConversion: totalCartAdds > 0 ? ((totalSales / totalCartAdds) * 100).toFixed(1) : '0',
    };
  }, [trend]);

  const todaySales = trend[trend.length - 1]?.sales ?? 0;
  const yesterdaySales = trend[trend.length - 2]?.sales ?? 0;
  const salesTrend = yesterdaySales > 0
    ? (((todaySales - yesterdaySales) / yesterdaySales) * 100).toFixed(1) : '0';
  const trendPositive = todaySales >= yesterdaySales;

  return (
    <div style={{display:'contents'}}>
      <div className="flex flex-col h-full bg-white border-l border-gray-200 overflow-hidden">
        {/* ── Header ── */}
        <div className="flex items-start gap-3 px-4 py-3 border-b border-gray-200 shrink-0 bg-white">
          {/* Clickable thumbnail */}
          <div
            className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shrink-0 relative group cursor-zoom-in"
            onClick={() => product.imageUrl && setShowLightbox(true)}
          >
            {product.imageUrl ? (
              <div style={{display:'contents'}}>
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gray-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ZoomIn className="w-3 h-3 text-white" />
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-5 h-5 text-gray-300" /></div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 leading-tight">{product.name}</p>
            <p className="text-[10px] text-gray-400 font-mono mt-0.5">{product.sku} · {product.category}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors shrink-0">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* ── Scrollable content ── */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Availability + Price block ── */}
          <div className="px-4 pt-4 pb-3 border-b border-gray-100">
            <div className="flex items-center justify-between">
              {/* Clickable availability badge */}
              <button onClick={() => setShowAvailModal(true)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all hover:shadow-sm ${avail.bg} ${avail.color} ${avail.border}`}>
                <AvailIcon className="w-3 h-3" />{avail.label}
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>
              {/* Price + stock click to edit */}
              <div className="text-right">
                <button onClick={() => setShowPriceModal(true)}
                  className="group flex items-center gap-1 text-lg font-bold text-gray-900 hover:text-blue-600 transition-colors">
                  ₽{product.price.toLocaleString()}
                  <Edit2 className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-400 transition-colors" />
                </button>
                {product.stock !== null && (
                  <button onClick={() => setShowStockModal(true)}
                    className={`text-xs font-medium transition-colors hover:underline ${product.stock === 0 ? 'text-red-600' : product.stock < 5 ? 'text-orange-600' : 'text-gray-500'}`}>
                    {product.stock === 0 ? 'Нет в наличии' : `Остаток: ${product.stock} шт`}
                  </button>
                )}
              </div>
            </div>

            {/* Quick action chips */}
            <div className="flex gap-1.5 mt-3 flex-wrap">
              <button onClick={() => setShowPriceModal(true)}
                className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 border border-blue-100 hover:bg-blue-100 rounded-lg text-[10px] font-medium text-blue-700 transition-colors">
                <DollarSign className="w-3 h-3" />Изменить цену
              </button>
              <button onClick={() => setShowDiscountModal(true)}
                className="flex items-center gap-1 px-2.5 py-1 bg-orange-50 border border-orange-100 hover:bg-orange-100 rounded-lg text-[10px] font-medium text-orange-700 transition-colors">
                <Scissors className="w-3 h-3" />Скидка
              </button>
              <button onClick={() => setShowAvailModal(true)}
                className="flex items-center gap-1 px-2.5 py-1 bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded-lg text-[10px] font-medium text-gray-700 transition-colors">
                <RefreshCw className="w-3 h-3" />Статус
              </button>
              {product.stock !== null && (
                <button onClick={() => setShowStockModal(true)}
                  className="flex items-center gap-1 px-2.5 py-1 bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded-lg text-[10px] font-medium text-gray-700 transition-colors">
                  <Package className="w-3 h-3" />Остаток
                </button>
              )}
            </div>
          </div>

          {/* ── Key metrics ── */}
          <div className="px-4 pt-3 pb-3 border-b border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">Ключевые метрики</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Продажи 7д',  value: `${trend7d.totalSales} шт`,       icon: Package,      color: 'text-blue-600',    bg: 'bg-blue-50',    trend: `${salesTrend}%`, trendUp: trendPositive },
                { label: 'Выручка 7д',  value: formatCurrency(trend7d.totalRevenue), icon: DollarSign, color: 'text-green-600',   bg: 'bg-green-50',   trend: null, trendUp: true },
                { label: 'Выручка 30д', value: formatCurrency(product.revenue30d),   icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', trend: null, trendUp: true },
                { label: 'Продажи 30д', value: `${product.sales30d} шт`,          icon: ShoppingCart, color: 'text-indigo-600',  bg: 'bg-indigo-50',  trend: null, trendUp: true },
                { label: 'Конверсия',   value: `${product.conversion}%`,          icon: Percent,      color: 'text-purple-600',  bg: 'bg-purple-50',  trend: null, trendUp: true },
                {
                  label: 'Маржа', value: product.margin !== null ? `${product.margin}%` : '—', icon: Tag,
                  color: product.margin !== null && product.margin > 20 ? 'text-teal-600' : 'text-orange-600',
                  bg:    product.margin !== null && product.margin > 20 ? 'bg-teal-50'   : 'bg-orange-50',
                  trend: null, trendUp: true,
                },
              ].map(m => {
                const Icon = m.icon;
                return (
                  <div key={m.label} className={`p-2.5 rounded-xl ${m.bg}`}>
                    <div className="flex items-center justify-between mb-1">
                      <Icon className={`w-3.5 h-3.5 ${m.color}`} />
                      {m.trend && (
                        <span className={`flex items-center gap-0.5 text-[10px] font-semibold ${m.trendUp ? 'text-green-600' : 'text-red-500'}`}>
                          {m.trendUp ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}{m.trend}
                        </span>
                      )}
                    </div>
                    <p className={`text-sm font-bold ${m.color}`}>{m.value}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{m.label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Demand Funnel ── */}
          <div className="px-4 pt-3 pb-3 border-b border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />Воронка спроса (7д)
            </p>
            <div className="space-y-2">
              {[
                { label: 'Просмотры', value: trend7d.totalViews,    color: 'bg-blue-500',   pct: 100 },
                { label: 'В корзину', value: trend7d.totalCartAdds, color: 'bg-orange-500', pct: trend7d.totalViews > 0 ? (trend7d.totalCartAdds / trend7d.totalViews) * 100 : 0, conv: `${trend7d.cartConversion}%` },
                { label: 'Заказы',    value: trend7d.totalSales,    color: 'bg-green-500',  pct: trend7d.totalCartAdds > 0 ? (trend7d.totalSales / trend7d.totalCartAdds) * 100 : 0, conv: `${trend7d.orderConversion}%` },
              ].map(s => (
                <div key={s.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">{s.label}</span>
                    <div className="flex items-center gap-2">
                      {(s as any).conv && <span className="text-[10px] text-gray-400">{(s as any).conv} конверсия</span>}
                      <span className="text-xs font-bold text-gray-800">{s.value.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${s.color} rounded-full transition-all`} style={{ width: `${Math.max(2, s.pct)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Sales trend chart ── */}
          <div className="px-4 pt-3 pb-3 border-b border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <BarChart2 className="w-3.5 h-3.5" />Продажи по дням (7д)
            </p>
            <div className="h-28">
              <ChartWrapper height={112}>
                {(w, h) => (
                  <AreaChart width={w} height={h} data={trend} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`salesGrad-${product.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="#d1d5db" tickLine={false} />
                    <YAxis tick={{ fontSize: 9 }} stroke="#d1d5db" tickLine={false} axisLine={false} />
                    <Tooltip content={<SalesChartTooltip />} />
                    <Area dataKey="sales" name="Продажи" stroke="#3b82f6" strokeWidth={2} fill={`url(#salesGrad-${product.id})`} dot={false} />
                  </AreaChart>
                )}
              </ChartWrapper>
            </div>
          </div>

          {/* ── Available in stores ── */}
          <div className="px-4 pt-3 pb-3 border-b border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5" />Наличие по магазинам ({storesWithProduct.length || stores.length})
            </p>
            {stores.length === 0 ? (
              <p className="text-xs text-gray-400">Нет данных о магазинах</p>
            ) : (
              <div className="space-y-1.5">
                {(storesWithProduct.length > 0 ? storesWithProduct : stores).map(s => {
                  const item = s.menuItems.find(m => m.name === product.name);
                  const inStock = item?.inStock ?? (s.status === 'online');
                  return (
                    <div key={s.id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${s.status === 'online' ? 'bg-green-500' : s.status === 'busy' ? 'bg-orange-500' : 'bg-gray-400'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">{s.name}</p>
                        <p className="text-[10px] text-gray-400">{s.city} · {s.serviceZone}</p>
                      </div>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${inStock ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {inStock ? 'Есть' : 'Нет'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Expiry Date (for perishable goods) ── */}
          {product.hasExpiryTracking !== false && (
            <div className="px-4 pt-3 pb-3 border-b border-gray-100">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5" />Срок годности
              </p>
              <button
                onClick={() => setShowExpiryModal(true)}
                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all hover:shadow-sm ${
                  !expiryInfo
                    ? 'bg-gray-50 border-gray-200 hover:border-gray-300'
                    : expiryInfo.status === 'expired'
                      ? 'bg-red-50 border-red-200 hover:border-red-300'
                      : expiryInfo.status === 'expiring_soon'
                        ? 'bg-orange-50 border-orange-200 hover:border-orange-300'
                        : 'bg-green-50 border-green-200 hover:border-green-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {!expiryInfo ? (
                    <Calendar className="w-4 h-4 text-gray-400" />
                  ) : expiryInfo.status === 'expired' ? (
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  ) : expiryInfo.status === 'expiring_soon' ? (
                    <Clock className="w-4 h-4 text-orange-600" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  )}
                  <div className="text-left">
                    {!expiryInfo ? (
                      <p className="text-xs font-medium text-gray-500">Нажмите, чтобы установить</p>
                    ) : (
                      <div style={{display:'contents'}}>
                        <p className={`text-xs font-bold ${
                          expiryInfo.status === 'expired' ? 'text-red-700' :
                          expiryInfo.status === 'expiring_soon' ? 'text-orange-700' : 'text-green-700'
                        }`}>
                          {formatExpiryDate(expiryInfo.date)}
                        </p>
                        <p className={`text-[10px] mt-0.5 ${
                          expiryInfo.status === 'expired' ? 'text-red-500' :
                          expiryInfo.status === 'expiring_soon' ? 'text-orange-500' : 'text-green-500'
                        }`}>
                          {expiryInfo.status === 'expired'
                            ? `Истёк ${Math.abs(expiryInfo.daysLeft)} дн. назад — снят с продажи`
                            : expiryInfo.status === 'expiring_soon'
                              ? expiryInfo.daysLeft === 0 ? 'Истекает сегодня!'
                              : `Истекает через ${expiryInfo.daysLeft} дн.`
                            : `В норме · осталось ${expiryInfo.daysLeft} дн.`}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                </div>
              </button>
            </div>
          )}

          {/* ── Actions ── */}
          <div className="px-4 py-3 space-y-1.5">
            <button onClick={() => setShowPriceModal(true)}
              className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-200 rounded-xl hover:bg-blue-50 hover:border-blue-200 text-left transition-colors group">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-medium text-gray-700 group-hover:text-blue-700">Изменить цену</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-400" />
            </button>
            <button onClick={() => setShowDiscountModal(true)}
              className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-200 rounded-xl hover:bg-orange-50 hover:border-orange-200 text-left transition-colors group">
              <div className="flex items-center gap-2">
                <Scissors className="w-4 h-4 text-orange-500" />
                <span className="text-xs font-medium text-gray-700 group-hover:text-orange-700">Добавить скидку</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-orange-400" />
            </button>
            <button onClick={() => setShowAvailModal(true)}
              className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-100 text-left transition-colors group">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-gray-500" />
                <span className="text-xs font-medium text-gray-700">Изменить статус наличия</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            </button>
            {(product.hasExpiryTracking === true || product.expiryDate !== undefined) && (
              <button onClick={() => setShowExpiryModal(true)}
                className="w-full flex items-center justify-between px-3 py-2.5 border border-rose-200 rounded-xl hover:bg-rose-50 hover:border-rose-300 text-left transition-colors group">
                <div className="flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-rose-500" />
                  <span className="text-xs font-medium text-gray-700 group-hover:text-rose-700">Срок годности</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-rose-400" />
              </button>
            )}
            <button onClick={() => toast.success(`Открыта полная аналитика: ${product.name}`)}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-left transition-colors">
              <span className="text-xs font-bold text-white">Полная аналитика</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-blue-200" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {showLightbox && <ProductImageLightbox product={product} onClose={() => setShowLightbox(false)} />}
        {showPriceModal && <PriceEditModal product={product} onClose={() => setShowPriceModal(false)} />}
        {showDiscountModal && <DiscountModal product={product} onClose={() => setShowDiscountModal(false)} />}
        {showAvailModal && (
          <AvailabilityModal
            current={product.availability}
            productId={product.id}
            productName={product.name}
            onClose={(_v) => { setShowAvailModal(false); }}
          />
        )}
        {showStockModal && <StockEditModal product={product} onClose={() => setShowStockModal(false)} />}
        {showExpiryModal && <ExpiryDateModal product={product} onClose={() => setShowExpiryModal(false)} />}
      </AnimatePresence>
    </div>
  );
}