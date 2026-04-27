import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
  X, MapPin, Phone, Clock, Star, Package, TrendingUp,
  AlertTriangle, CheckCircle, EyeOff, Search, Filter,
  ShoppingCart, BarChart2, ChevronRight, Wifi, WifiOff,
  Loader2, XCircle, ImageIcon, ArrowUpRight, DollarSign,
  Pencil as Edit2, ChevronDown, ZoomIn, Save, Check, TrendingDown,
  Calendar, RefreshCw, Tag, Plus, Percent, Zap, Pause, Play, Trash2, Globe,
} from 'lucide-react';
import {
  getStoreProducts, formatCurrency,
  type SellerStore, type StoreProduct, type AvailabilityStatus,
} from '../../data/merchants-mock';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { ChartWrapper } from '../ui/ChartWrapper';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';

// ─── Availability config ───────────────────────────────────────────────────────

const AVAIL_CFG: Record<AvailabilityStatus, { label: string; color: string; bg: string; dot: string; borderColor: string }> = {
  available:             { label: 'В наличии',     color: 'text-green-700',  bg: 'bg-green-100',  dot: 'bg-green-500',  borderColor: 'border-green-300' },
  sold_out_today:        { label: 'Нет сегодня',   color: 'text-orange-700', bg: 'bg-orange-100', dot: 'bg-orange-500', borderColor: 'border-orange-300' },
  sold_out_indefinitely: { label: 'Нет в наличии', color: 'text-red-700',    bg: 'bg-red-100',    dot: 'bg-red-500',    borderColor: 'border-red-300' },
  hidden:                { label: 'Скрыт',          color: 'text-gray-500',   bg: 'bg-gray-100',   dot: 'bg-gray-400',   borderColor: 'border-gray-300' },
};

const AVAIL_ORDER: AvailabilityStatus[] = ['available', 'sold_out_today', 'sold_out_indefinitely', 'hidden'];

const STORE_STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  online:  { label: 'Онлайн',   color: 'text-green-700',  bg: 'bg-green-100',  icon: Wifi },
  offline: { label: 'Офлайн',   color: 'text-gray-600',   bg: 'bg-gray-100',   icon: WifiOff },
  busy:    { label: 'Загружен', color: 'text-orange-700', bg: 'bg-orange-100', icon: Loader2 },
  closed:  { label: 'Закрыт',   color: 'text-red-700',    bg: 'bg-red-100',    icon: XCircle },
};

// ─── Edit Product Modal ──────────────────────────────────────────────────��──────

interface EditProductModalProps {
  product: StoreProduct;
  onSave: (updated: Partial<StoreProduct>) => void;
  onClose: () => void;
}

function EditProductModal({ product, onSave, onClose }: EditProductModalProps) {
  const [name, setName] = useState(product.name);
  const [price, setPrice] = useState(String(product.price));
  const [stock, setStock] = useState(String(product.stock ?? ''));
  const [availability, setAvailability] = useState<AvailabilityStatus>(product.availability);
  const [showAvailPicker, setShowAvailPicker] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
  }, [onClose]);

  function handleSave() {
    const parsedPrice = parseInt(price.replace(/\D/g, ''), 10);
    const parsedStock = stock === '' ? null : parseInt(stock, 10);
    if (!name.trim()) { toast.error('Введите название товара'); return; }
    if (isNaN(parsedPrice) || parsedPrice <= 0) { toast.error('Укажите корректную цену'); return; }
    onSave({ name: name.trim(), price: parsedPrice, stock: parsedStock, availability });
    toast.success(`Товар «${name.trim()}» обновлён ✓`);
    onClose();
  }

  const availCfg = AVAIL_CFG[availability];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
              {product.imageUrl
                ? <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-4 h-4 text-gray-300" /></div>}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Редактировать товар</p>
              <p className="text-[10px] text-gray-400 font-mono">{product.sku}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Название товара</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Название товара"
            />
          </div>

          {/* Price + Stock */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Цена (₽)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₽</span>
                <input
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  className="w-full pl-7 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                  type="number"
                  min="0"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Остаток (шт)</label>
              <input
                value={stock}
                onChange={e => setStock(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="—"
                type="number"
                min="0"
              />
            </div>
          </div>

          {/* Availability */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Статус наличия</label>
            <div className="relative">
              <button
                onClick={() => setShowAvailPicker(v => !v)}
                className={`w-full flex items-center justify-between px-3 py-2.5 border rounded-xl text-sm transition-colors ${availCfg.borderColor} ${availCfg.bg}`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${availCfg.dot}`} />
                  <span className={`font-medium ${availCfg.color}`}>{availCfg.label}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showAvailPicker ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {showAvailPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-10"
                  >
                    {AVAIL_ORDER.map(key => {
                      const cfg = AVAIL_CFG[key];
                      return (
                        <button
                          key={key}
                          onClick={() => { setAvailability(key); setShowAvailPicker(false); }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left ${availability === key ? 'bg-blue-50' : ''}`}
                        >
                          <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                          <span className={`text-sm font-medium ${cfg.color}`}>{cfg.label}</span>
                          {availability === key && <Check className="w-3.5 h-3.5 text-blue-600 ml-auto" />}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Image preview */}
          {product.imageUrl && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div className="w-14 h-14 rounded-lg overflow-hidden border border-gray-200 shrink-0">
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-700">Изображение товара</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Фото загружено ✓</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2.5 px-5 pb-5">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors">
            Отмена
          </button>
          <button
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            <Save className="w-4 h-4" /> Сохранить
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Full Analytics Modal ───────────────────────────────────────────────────────

// Date helpers
function toISO(d: Date): string { return d.toISOString().slice(0, 10); }
function fromISO(s: string): Date { const [y, m, dd] = s.split('-').map(Number); return new Date(y, m - 1, dd); }
function diffDays(a: Date, b: Date): number { return Math.round((b.getTime() - a.getTime()) / 86400000); }
function fmtDMY(d: Date): string { return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}`; }
function fmtFull(d: Date): string { return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getFullYear()).slice(2)}`; }

function generateDailyData(product: StoreProduct, startDate: Date, endDate: Date) {
  const days = diffDays(startDate, endDate) + 1;
  const dailyBase = product.sales30d / 30;
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const weekdayMult = [0.6,1.0,1.05,1.1,1.15,1.2,0.8][date.getDay()];
    const seed = date.getDate() * 7 + date.getMonth() * 31;
    const wave = Math.sin(seed * 0.7) * 0.35 + Math.cos(seed * 1.3) * 0.2;
    const sales = Math.max(0, Math.round(dailyBase * weekdayMult * (1 + wave)));
    return { date, label: fmtDMY(date), fullLabel: fmtFull(date), sales, revenue: sales * product.price };
  });
}

const PRESETS = [{ label: '7д', days: 7 }, { label: '14д', days: 14 }, { label: '30д', days: 30 }, { label: '90д', days: 90 }];

function FullAnalyticsModal({ product, onClose }: { product: StoreProduct; onClose: () => void }) {
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const todayISO = toISO(today);
  const default30 = useMemo(() => { const d = new Date(today); d.setDate(d.getDate()-29); return d; }, [today]);

  const [startISO, setStartISO] = useState(toISO(default30));
  const [endISO, setEndISO] = useState(todayISO);
  const [activePreset, setActivePreset] = useState<number|null>(30);
  const [dateError, setDateError] = useState('');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
  }, [onClose]);

  function applyPreset(days: number) {
    const s = new Date(today); s.setDate(s.getDate() - (days - 1));
    setStartISO(toISO(s)); setEndISO(todayISO); setActivePreset(days); setDateError('');
  }
  function handleStartChange(val: string) {
    setStartISO(val); setActivePreset(null);
    setDateError(val && endISO && fromISO(val) > fromISO(endISO) ? 'Начало не может быть позже конца' : '');
  }
  function handleEndChange(val: string) {
    setEndISO(val); setActivePreset(null);
    setDateError(startISO && val && fromISO(startISO) > fromISO(val) ? 'Конец не может быть раньше начала' : '');
  }

  const computed = useMemo(() => {
    if (!startISO || !endISO || dateError) return null;
    const s = fromISO(startISO), e = fromISO(endISO);
    if (s > e) return null;
    const data = generateDailyData(product, s, e);
    const totalSales = data.reduce((a,d) => a+d.sales, 0);
    const totalRevenue = data.reduce((a,d) => a+d.revenue, 0);
    const avgDailySales = data.length > 0 ? totalSales / data.length : 0;
    const peakDay = data.length > 0 ? data.reduce((best,d) => d.sales > best.sales ? d : best, data[0]) : null;
    const days = diffDays(s, e) + 1;
    const rangeLabel = `${fmtFull(s)} — ${fmtFull(e)} (${days} дн.)`;
    const tickInterval = data.length <= 14 ? 0 : data.length <= 31 ? 3 : data.length <= 60 ? 6 : 14;
    return { data, totalSales, totalRevenue, avgDailySales, peakDay, rangeLabel, tickInterval };
  }, [startISO, endISO, dateError, product]);

  const avail = AVAIL_CFG[product.availability];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
              {product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" /> : <ImageIcon className="w-5 h-5 text-gray-300 m-auto" />}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">{product.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-[10px] text-gray-400 font-mono">{product.sku}</p>
                <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${avail.bg} ${avail.color}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${avail.dot}`} />{avail.label}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        {/* Date range picker */}
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/70 shrink-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 gap-0.5">
              {PRESETS.map(p => (
                <button key={p.days} onClick={() => applyPreset(p.days)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activePreset === p.days ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>
                  {p.label}
                </button>
              ))}
            </div>
            <span className="text-gray-300">|</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500 font-semibold">С</span>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                <input type="date" value={startISO} max={endISO || todayISO}
                  onChange={e => handleStartChange(e.target.value)}
                  className="pl-8 pr-2 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-36" />
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500 font-semibold">По</span>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                <input type="date" value={endISO} min={startISO} max={todayISO}
                  onChange={e => handleEndChange(e.target.value)}
                  className="pl-8 pr-2 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-36" />
              </div>
            </div>
            {activePreset !== 30 && (
              <button onClick={() => applyPreset(30)} title="Сбросить к 30 дням"
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {dateError
            ? <p className="text-[10px] text-red-500 mt-1.5 flex items-center gap-1"><XCircle className="w-3 h-3" />{dateError}</p>
            : computed?.rangeLabel ? <p className="text-[10px] text-gray-400 mt-1">{computed.rangeLabel}</p> : null}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* KPI */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Цена', value: `₽${product.price.toLocaleString()}`, color: 'text-gray-900', bg: 'bg-gray-50', sub: 'розничная' },
              { label: 'Продажи', value: computed ? `${computed.totalSales} шт` : '—', color: 'text-blue-700', bg: 'bg-blue-50', sub: 'за период' },
              { label: 'Конверсия', value: `${product.conversion}%`, color: 'text-purple-700', bg: 'bg-purple-50', sub: 'просм→покупка' },
              { label: 'Маржа', value: product.margin !== null ? `${product.margin}%` : '—', color: product.margin !== null && product.margin > 20 ? 'text-green-700' : 'text-orange-600', bg: product.margin !== null && product.margin > 20 ? 'bg-green-50' : 'bg-orange-50', sub: 'чистая' },
            ].map(m => (
              <div key={m.label} className={`p-3 rounded-xl ${m.bg} text-center`}>
                <p className={`text-base font-bold ${m.color}`}>{m.value}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{m.label}</p>
                <p className="text-[9px] text-gray-400">{m.sub}</p>
              </div>
            ))}
          </div>

          {!computed ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Calendar className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">Выберите корректный период</p>
              <p className="text-xs mt-1">Укажите дату начала и дату окончания</p>
            </div>
          ) : (
            <div style={{display:'contents'}}>
              {/* Sales chart */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-blue-500" />
                    <p className="text-xs font-bold text-gray-800">Продажи по дням</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">{computed.totalSales} шт</span>
                    {computed.peakDay && <span className="text-[10px] text-gray-500 hidden sm:block">пик: {computed.peakDay.fullLabel} ({computed.peakDay.sales} шт)</span>}
                  </div>
                </div>
                <ChartWrapper height={140}>
                  {(w, h) => (
                    <AreaChart width={w} height={h} data={computed.data}>
                      <defs>
                        <linearGradient id={`gs-${product.id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="label" tick={{ fontSize: 9 }} stroke="#9ca3af" interval={computed.tickInterval} />
                      <YAxis tick={{ fontSize: 9 }} stroke="#9ca3af" width={24} />
                      <Tooltip labelFormatter={(_l, p) => (p?.[0]?.payload as any)?.fullLabel ?? _l} formatter={(v: number) => [`${v} шт`, 'Продажи']} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                      <Area type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2} fill={`url(#gs-${product.id})`} dot={computed.data.length <= 14 ? { r: 3, fill: '#3b82f6' } : false} activeDot={{ r: 5 }} />
                    </AreaChart>
                  )}
                </ChartWrapper>
              </div>

              {/* Revenue chart */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-500" />
                    <p className="text-xs font-bold text-gray-800">Выручка по дням</p>
                  </div>
                  <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">{formatCurrency(computed.totalRevenue)}</span>
                </div>
                <ChartWrapper height={120}>
                  {(w, h) => (
                    <AreaChart width={w} height={h} data={computed.data}>
                      <defs>
                        <linearGradient id={`gr-${product.id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="label" tick={{ fontSize: 9 }} stroke="#9ca3af" interval={computed.tickInterval} />
                      <YAxis tick={{ fontSize: 9 }} stroke="#9ca3af" width={42} tickFormatter={(v: number) => `₽${(v/1000).toFixed(0)}к`} />
                      <Tooltip labelFormatter={(_l, p) => (p?.[0]?.payload as any)?.fullLabel ?? _l} formatter={(v: number) => [`₽${v.toLocaleString()}`, 'Выручка']} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                      <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fill={`url(#gr-${product.id})`} dot={computed.data.length <= 14 ? { r: 3, fill: '#10b981' } : false} activeDot={{ r: 5 }} />
                    </AreaChart>
                  )}
                </ChartWrapper>
              </div>

              {/* Summary KPIs */}
              <div className="grid grid-cols-4 gap-3">
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-center">
                  <p className="text-[10px] text-blue-500 uppercase tracking-wide mb-1">Продаж за период</p>
                  <p className="text-sm font-bold text-blue-800">{computed.totalSales} шт</p>
                </div>
                <div className="p-3 bg-green-50 border border-green-100 rounded-xl text-center">
                  <p className="text-[10px] text-green-500 uppercase tracking-wide mb-1">Выручка</p>
                  <p className="text-sm font-bold text-green-800">{formatCurrency(computed.totalRevenue)}</p>
                </div>
                <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl text-center">
                  <p className="text-[10px] text-purple-500 uppercase tracking-wide mb-1">Ср. в день</p>
                  <p className="text-sm font-bold text-purple-800">{computed.avgDailySales.toFixed(1)} шт</p>
                </div>
                <div className="p-3 bg-orange-50 border border-orange-100 rounded-xl text-center">
                  <p className="text-[10px] text-orange-500 uppercase tracking-wide mb-1">Ср. чек</p>
                  <p className="text-sm font-bold text-orange-800">
                    {computed.totalSales > 0 ? `₽${Math.round(computed.totalRevenue / computed.totalSales).toLocaleString()}` : '—'}
                  </p>
                </div>
              </div>

              {/* Day-by-day table (≤31 days) */}
              {computed.data.length <= 31 && (
                <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-white">
                    <p className="text-xs font-bold text-gray-800">Детализация по дням</p>
                    <span className="text-[10px] text-gray-400">{computed.data.length} дн.</span>
                  </div>
                  <div className="max-h-52 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-gray-50 border-b border-gray-100 z-10">
                        <tr>
                          <th className="text-left px-4 py-2 text-[10px] text-gray-500 font-semibold uppercase tracking-wide">Дата</th>
                          <th className="text-right px-4 py-2 text-[10px] text-gray-500 font-semibold uppercase tracking-wide">Продажи</th>
                          <th className="text-right px-4 py-2 text-[10px] text-gray-500 font-semibold uppercase tracking-wide">Выручка</th>
                        </tr>
                      </thead>
                      <tbody>
                        {computed.data.map((row, i) => {
                          const isPeak = computed.peakDay?.label === row.label;
                          return (
                            <tr key={i} className={`border-b border-gray-100 last:border-0 ${isPeak ? 'bg-blue-50' : 'hover:bg-white'} transition-colors`}>
                              <td className="px-4 py-2 text-gray-600">
                                <div className="flex items-center gap-2">
                                  {row.fullLabel}
                                  {isPeak && <span className="text-[9px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-semibold">ПИК</span>}
                                </div>
                              </td>
                              <td className="px-4 py-2 text-right font-semibold text-blue-700">{row.sales} шт</td>
                              <td className="px-4 py-2 text-right font-semibold text-green-700">{formatCurrency(row.revenue)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Availability picker inline ─────────────────────────────────────────────────

function AvailabilityPicker({
  current,
  onChange,
  onClose,
}: {
  current: AvailabilityStatus;
  onChange: (a: AvailabilityStatus) => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-20"
    >
      <div className="px-3 py-2 border-b border-gray-100">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Изменить статус</p>
      </div>
      {AVAIL_ORDER.map(key => {
        const cfg = AVAIL_CFG[key];
        const isActive = current === key;
        return (
          <button
            key={key}
            onClick={() => { onChange(key); onClose(); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left ${isActive ? 'bg-blue-50' : ''}`}
          >
            <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
            <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
            {isActive && <Check className="w-3.5 h-3.5 text-blue-600 ml-auto" />}
          </button>
        );
      })}
    </motion.div>
  );
}

// ─── Product analytics panel (right panel inside drawer) ──────────────────────

function ProductAnalyticsPanel({
  product,
  onClose,
  onEdit,
  onAvailChange,
}: {
  product: StoreProduct;
  onClose: () => void;
  onEdit: () => void;
  onAvailChange: (a: AvailabilityStatus) => void;
}) {
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showAvailPicker, setShowAvailPicker] = useState(false);
  const avail = AVAIL_CFG[product.availability];

  const metrics = [
    { label: 'Цена',        value: `₽${product.price.toLocaleString()}`,  color: 'text-gray-900',   bg: 'bg-gray-50' },
    { label: 'Остаток',     value: product.stock !== null ? `${product.stock} шт` : '—', color: product.stock === 0 ? 'text-red-600' : 'text-gray-900', bg: 'bg-gray-50' },
    { label: 'Продажи 7д',  value: `${product.sales7d} шт`,  color: 'text-blue-600',  bg: 'bg-blue-50' },
    { label: 'Продажи 30д', value: `${product.sales30d} шт`, color: 'text-blue-600',  bg: 'bg-blue-50' },
    { label: 'Выручка 30д', value: formatCurrency(product.revenue30d), color: 'text-green-700', bg: 'bg-green-50' },
    { label: 'Конверсия',   value: `${product.conversion}%`, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Маржа',       value: product.margin !== null ? `${product.margin}%` : '—', color: product.margin !== null && product.margin > 20 ? 'text-green-700' : 'text-orange-600', bg: 'bg-gray-50' },
    { label: 'Заказы сег.', value: `${product.ordersToday}`, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  return (
    <div className="border-l border-gray-200 bg-white flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 shrink-0">
        <div className="w-7 h-7 bg-gray-100 rounded-lg overflow-hidden shrink-0">
          {product.imageUrl && <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-gray-900 truncate">{product.name}</p>
          <p className="text-[10px] text-gray-400 font-mono">{product.sku}</p>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors shrink-0">
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Availability badge */}
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${avail.bg} ${avail.color}`}>
            <div className={`w-2 h-2 rounded-full ${avail.dot}`} />{avail.label}
          </span>
          <span className="text-xs text-gray-400">{product.category}</span>
        </div>

        {/* Product image large */}
        <div className="h-40 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 relative group">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-12 h-12 text-gray-300" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <ZoomIn className="w-8 h-8 text-white drop-shadow-lg" />
          </div>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 gap-2">
          {metrics.map(m => (
            <div key={m.label} className={`p-2.5 rounded-xl ${m.bg}`}>
              <p className={`text-sm font-bold ${m.color}`}>{m.value}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{m.label}</p>
            </div>
          ))}
        </div>

        {/* Sales this week sparkline */}
        <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <BarChart2 className="w-3.5 h-3.5 text-blue-600" />
            <p className="text-xs font-bold text-blue-800">Продажи 7д</p>
          </div>
          <div className="flex items-end gap-1.5 h-12">
            {[
              product.sales7d ? Math.max(1, product.sales7d - 6) : 0,
              product.sales7d ? Math.max(1, product.sales7d - 4) : 0,
              product.sales7d ? Math.max(1, product.sales7d - 5) : 0,
              product.sales7d ? Math.max(1, product.sales7d - 3) : 0,
              product.sales7d ? Math.max(1, product.sales7d - 2) : 0,
              product.sales7d ? Math.max(1, product.sales7d - 1) : 0,
              product.sales7d,
            ].map((v, i) => {
              const max = product.sales7d || 1;
              const pct = (v / max) * 100;
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-t transition-all ${i === 6 ? 'bg-blue-600' : 'bg-blue-300'}`}
                  style={{ height: `${Math.max(8, pct)}%` }}
                  title={`${v} шт`}
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-blue-400">13 фев</span>
            <span className="text-[9px] text-blue-600 font-bold">Сегодня: {product.sales7d} шт</span>
          </div>
        </div>

        {/* Revenue this month */}
        <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-100 rounded-xl">
          <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
            <DollarSign className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-green-800">{formatCurrency(product.revenue30d)}</p>
            <p className="text-xs text-green-600">Выручка за 30 дней</p>
          </div>
          <div className="ml-auto flex items-center gap-1 text-green-600">
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">+{product.conversion}%</span>
          </div>
        </div>

        {/* ── Quick actions — NOW FUNCTIONAL ── */}
        <div className="space-y-1.5">
          {/* Edit product */}
          <button
            onClick={onEdit}
            className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-left transition-colors group"
          >
            <div className="flex items-center gap-2">
              <Edit2 className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600" />
              <span className="text-xs font-medium text-gray-700">Редактировать товар</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          </button>

          {/* Change availability */}
          <div className="relative">
            <button
              onClick={() => setShowAvailPicker(v => !v)}
              className={`w-full flex items-center justify-between px-3 py-2.5 border rounded-xl text-left transition-colors group ${
                showAvailPicker ? `${avail.bg} ${avail.borderColor}` : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${avail.dot}`} />
                <span className="text-xs font-medium text-gray-700">Изменить наличие</span>
                <span className={`text-[10px] font-semibold ${avail.color}`}>{avail.label}</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showAvailPicker ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {showAvailPicker && (
                <div className="absolute bottom-full left-0 right-0 mb-1 z-20">
                  <AvailabilityPicker
                    current={product.availability}
                    onChange={onAvailChange}
                    onClose={() => setShowAvailPicker(false)}
                  />
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Full analytics */}
          <button
            onClick={() => setShowAnalytics(true)}
            className="w-full flex items-center justify-between px-3 py-2.5 bg-blue-600 hover:bg-blue-700 border border-blue-600 rounded-xl text-left transition-colors group"
          >
            <div className="flex items-center gap-2">
              <BarChart2 className="w-3.5 h-3.5 text-blue-100" />
              <span className="text-xs font-semibold text-white">Полная аналитика товара</span>
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 text-blue-200" />
          </button>
        </div>
      </div>

      {/* Full analytics modal */}
      <AnimatePresence>
        {showAnalytics && (
          <FullAnalyticsModal product={product} onClose={() => setShowAnalytics(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Product card ──────────────────────────────────────────────────────────────

function ProductCard({ product, onSelect }: { product: StoreProduct; onSelect: (p: StoreProduct) => void }) {
  const avail = AVAIL_CFG[product.availability];
  const isUnavailable = product.availability !== 'available';

  return (
    <button
      onClick={() => onSelect(product)}
      className={`group text-left w-full border rounded-xl overflow-hidden transition-all hover:shadow-md hover:border-blue-300 ${
        isUnavailable ? 'opacity-75 border-gray-200 bg-gray-50/50' : 'border-gray-200 bg-white hover:bg-blue-50/20'
      }`}
    >
      <div className="relative h-36 bg-gray-100 overflow-hidden">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-10 h-10 text-gray-300" />
          </div>
        )}
        <div className={`absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${avail.bg} ${avail.color}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${avail.dot}`} />{avail.label}
        </div>
        {product.ordersToday > 0 && (
          <div className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
            <ShoppingCart className="w-2.5 h-2.5" />{product.ordersToday}
          </div>
        )}
        <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/5 transition-colors flex items-end justify-end p-2 opacity-0 group-hover:opacity-100">
          <div className="flex items-center gap-1 bg-white/90 rounded-lg px-2 py-1 text-xs text-blue-600 font-medium shadow-sm">
            Аналитика <ChevronRight className="w-3 h-3" />
          </div>
        </div>
      </div>

      <div className="p-3">
        <p className={`text-xs font-bold leading-snug line-clamp-2 mb-1.5 ${isUnavailable ? 'text-gray-500' : 'text-gray-900'}`}>{product.name}</p>
        <p className="text-[10px] text-gray-400 font-mono mb-2">{product.sku} · {product.category}</p>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-sm font-bold ${isUnavailable ? 'text-gray-400' : 'text-gray-900'}`}>₽{product.price.toLocaleString()}</span>
          {product.stock !== null && (
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
              product.stock === 0 ? 'bg-red-100 text-red-700' :
              product.stock < 5 ? 'bg-orange-100 text-orange-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {product.stock === 0 ? 'Нет' : `${product.stock} шт`}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <div className="p-1.5 bg-gray-50 rounded-lg text-center">
            <p className="text-[11px] font-bold text-blue-600">{product.sales7d}</p>
            <p className="text-[9px] text-gray-400">Продажи 7д</p>
          </div>
          <div className="p-1.5 bg-gray-50 rounded-lg text-center">
            <p className="text-[11px] font-bold text-green-600">{formatCurrency(product.revenue30d)}</p>
            <p className="text-[9px] text-gray-400">Выручка 30д</p>
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── Main Drawer ──────────────────────────────────────────────────────────────

interface StoreDetailDrawerProps {
  store: SellerStore;
  sellerId: string;
  onClose: () => void;
}

// ─── Store-level discount types ───────────────────────────────────────────────

type StoreDiscountType = 'percentage' | 'fixed' | 'free_delivery' | 'flash';
type StoreDiscountStatus = 'active' | 'paused' | 'expired' | 'scheduled';

interface StoreLocalDiscount {
  id: string;
  title: string;
  type: StoreDiscountType;
  value: number;
  minOrder: number;
  endDate?: string;
  promoCode?: string;
  status: StoreDiscountStatus;
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
}

const STORE_TYPE_CFG: Record<StoreDiscountType, { label: string; color: string; bg: string }> = {
  percentage:    { label: '% Скидка',        color: 'text-blue-700',   bg: 'bg-blue-100' },
  fixed:         { label: '₽ Скидка',        color: 'text-green-700',  bg: 'bg-green-100' },
  free_delivery: { label: 'Бесплатная дост.', color: 'text-purple-700', bg: 'bg-purple-100' },
  flash:         { label: 'Флеш',            color: 'text-red-700',    bg: 'bg-red-100' },
};

function buildStoreDiscounts(storeId: string): StoreLocalDiscount[] {
  return [
    { id: `sd-${storeId}-1`, title: 'Скидка выходного дня', type: 'percentage', value: 10, minOrder: 500,
      endDate: '2026-06-30', status: 'active', createdBy: 'Менеджер магазина', createdAt: '2026-02-01T10:00:00' },
    { id: `sd-${storeId}-2`, title: 'Бесплатная доставка от 700₽', type: 'free_delivery', value: 0, minOrder: 700,
      status: 'active', createdBy: 'Иванов А.А.', createdAt: '2026-01-15T09:00:00', updatedBy: 'Администратор Системы' },
    { id: `sd-${storeId}-3`, title: 'Флеш -20% (завершена)', type: 'flash', value: 20, minOrder: 0,
      endDate: '2026-02-07', promoCode: 'FLASH20', status: 'expired', createdBy: 'Козлова Н.А.', createdAt: '2026-02-05T11:00:00' },
  ];
}

function StoreDiscountsPanel({ store }: { store: SellerStore }) {
  const [discounts, setDiscounts] = useState<StoreLocalDiscount[]>(() => buildStoreDiscounts(store.id));
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', type: 'percentage' as StoreDiscountType, value: '', minOrder: '', endDate: '', promoCode: '', reason: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { toast: t } = { toast: (msg: string, opts?: any) => {} }; // use import

  const validateForm = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = 'Введите название';
    if (form.type !== 'free_delivery' && (!form.value || isNaN(Number(form.value)) || Number(form.value) <= 0)) e.value = 'Укажите размер скидки';
    if (!form.reason.trim()) e.reason = 'Укажите причину (аудит-лог)';
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleAdd = () => {
    if (!validateForm()) return;
    const nd: StoreLocalDiscount = {
      id: `sd-${Date.now()}`, title: form.title.trim(), type: form.type,
      value: Number(form.value) || 0, minOrder: Number(form.minOrder) || 0,
      endDate: form.endDate || undefined, promoCode: form.promoCode.toUpperCase() || undefined,
      status: 'active', createdBy: 'Администратор Системы', createdAt: new Date().toISOString(),
    };
    setDiscounts(prev => [...prev, nd]);
    setShowAdd(false);
    setForm({ title: '', type: 'percentage', value: '', minOrder: '', endDate: '', promoCode: '', reason: '' });
    import('sonner').then(m => m.toast.success(`Скидка добавлена: ${nd.title}`, { description: 'Отправлено на согласование суперадмину' })).catch(() => {});
  };

  const handleToggle = (id: string, isPause: boolean) => {
    setDiscounts(prev => prev.map(d => d.id === id ? { ...d, status: isPause ? 'paused' : 'active', updatedBy: 'Администратор Системы' } : d));
    import('sonner').then(m => m.toast.success(isPause ? 'Скидка приостановлена' : 'Скидка возобновлена')).catch(() => {});
  };

  const handleDelete = (id: string) => {
    setDiscounts(prev => prev.filter(d => d.id !== id));
    import('sonner').then(m => m.toast.success('Скидка удалена из магазина')).catch(() => {});
  };

  const inputCls = (err?: string) =>
    `w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${err ? 'border-red-300 bg-red-50' : 'border-gray-200'}`;

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-700">Скидки этого магазина ({discounts.filter(d => d.status !== 'expired').length} активных)</p>
        <button onClick={() => setShowAdd(v => !v)}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors">
          <Plus className="w-3 h-3" />{showAdd ? 'Отмена' : 'Добавить'}
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
          <p className="text-xs font-bold text-blue-800 flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" />Новая скидка магазина</p>
          <div>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Название акции *" className={inputCls(formErrors.title)} />
            {formErrors.title && <p className="text-[10px] text-red-500 mt-0.5">{formErrors.title}</p>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as StoreDiscountType }))}
              className={inputCls()}>
              <option value="percentage">% Скидка</option>
              <option value="fixed">₽ Скидка</option>
              <option value="free_delivery">Бесплатная дост.</option>
              <option value="flash">Флеш-акция</option>
            </select>
            {form.type !== 'free_delivery' && (
              <div>
                <input type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                  placeholder={form.type === 'fixed' ? 'Сумма ₽' : 'Процент %'} min="0"
                  className={inputCls(formErrors.value)} />
                {formErrors.value && <p className="text-[10px] text-red-500 mt-0.5">{formErrors.value}</p>}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" value={form.minOrder} onChange={e => setForm(f => ({ ...f, minOrder: e.target.value }))}
              placeholder="Мин. заказ ₽" min="0" className={inputCls()} />
            <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
              className={inputCls()} />
          </div>
          <input value={form.promoCode} onChange={e => setForm(f => ({ ...f, promoCode: e.target.value.toUpperCase() }))}
            placeholder="Промокод (необязательно)" className={inputCls()} />
          <div>
            <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} rows={2}
              placeholder="Причина (обязательно — для аудит-лога и согласования суперадмина) *"
              className={`${inputCls(formErrors.reason)} resize-none`} />
            {formErrors.reason && <p className="text-[10px] text-red-500 mt-0.5">{formErrors.reason}</p>}
          </div>
          <button onClick={handleAdd}
            className="w-full flex items-center justify-center gap-1.5 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors">
            <Plus className="w-3 h-3" />Добавить и отправить на согласование
          </button>
        </div>
      )}

      {/* Discount list */}
      {discounts.map(d => {
        const cfg = STORE_TYPE_CFG[d.type];
        const isExpired = d.status === 'expired';
        return (
          <div key={d.id} className={`bg-white border rounded-xl p-3 ${isExpired ? 'opacity-55' : ''} ${d.status === 'paused' ? 'border-yellow-200' : 'border-gray-200'}`}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                    d.status === 'active' ? 'bg-green-100 text-green-700' :
                    d.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                    d.status === 'expired' ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-700'
                  }`}>{d.status === 'active' ? 'Активна' : d.status === 'paused' ? 'Пауза' : d.status === 'expired' ? 'Истекла' : 'Запланирована'}</span>
                </div>
                <p className="font-semibold text-gray-900 text-xs mt-1">{d.title}</p>
                <div className="flex items-center gap-3 mt-0.5 text-[10px] text-gray-500 flex-wrap">
                  <span>{d.type !== 'free_delivery' ? (d.type === 'fixed' ? `${d.value}₽` : `${d.value}%`) : 'Бесплатно'}</span>
                  {d.minOrder > 0 && <span>· от ₽{d.minOrder}</span>}
                  {d.endDate && <span>· до {new Date(d.endDate).toLocaleDateString('ru-RU')}</span>}
                  {d.promoCode && <span className="font-mono px-1 bg-purple-50 text-purple-700 rounded">{d.promoCode}</span>}
                </div>
                {d.updatedBy && <p className="text-[10px] text-gray-400 mt-0.5">Изм.: {d.updatedBy}</p>}
              </div>
              {!isExpired && (
                <div className="flex gap-1 shrink-0">
                  {d.status === 'paused'
                    ? <button onClick={() => handleToggle(d.id, false)} className="p-1.5 border border-green-200 text-green-600 rounded-lg hover:bg-green-50 transition-colors" title="Возобновить"><Play className="w-3 h-3" /></button>
                    : <button onClick={() => handleToggle(d.id, true)} className="p-1.5 border border-yellow-200 text-yellow-600 rounded-lg hover:bg-yellow-50 transition-colors" title="Приостановить"><Pause className="w-3 h-3" /></button>
                  }
                  <button onClick={() => handleDelete(d.id)} className="p-1.5 border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition-colors" title="Удалить"><Trash2 className="w-3 h-3" /></button>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {discounts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <Tag className="w-10 h-10 mb-2 opacity-20" />
          <p className="text-xs">Нет скидок для этого магазина</p>
        </div>
      )}
    </div>
  );
}

export function StoreDetailDrawer({ store, sellerId, onClose }: StoreDetailDrawerProps) {
  const [drawerTab, setDrawerTab] = useState<'products' | 'discounts'>('products');
  const [search, setSearch] = useState('');
  const [availFilter, setAvailFilter] = useState<AvailabilityStatus | 'all'>('all');
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null);
  const [editingProduct, setEditingProduct] = useState<StoreProduct | null>(null);
  // Local overrides for product data (editing, availability changes)
  const [productOverrides, setProductOverrides] = useState<Record<string, Partial<StoreProduct>>>({});

  const baseProducts = useMemo(() => getStoreProducts(store.id, sellerId), [store.id, sellerId]);
  const products: StoreProduct[] = useMemo(() =>
    baseProducts.map(p => ({ ...p, ...(productOverrides[p.id] ?? {}) })),
    [baseProducts, productOverrides]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter(p => {
      const matchSearch = !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
      const matchAvail = availFilter === 'all' || p.availability === availFilter;
      return matchSearch && matchAvail;
    });
  }, [products, search, availFilter]);

  const stats = useMemo(() => ({
    total: products.length,
    available: products.filter(p => p.availability === 'available').length,
    outOfStock: products.filter(p => p.availability !== 'available' && p.availability !== 'hidden').length,
    hidden: products.filter(p => p.availability === 'hidden').length,
    ordersToday: products.reduce((s, p) => s + p.ordersToday, 0),
    revenueToday: products.reduce((s, p) => s + p.revenueToday, 0),
  }), [products]);

  // Get the live version of selected product (with overrides applied)
  const liveSelectedProduct = selectedProduct
    ? products.find(p => p.id === selectedProduct.id) ?? selectedProduct
    : null;

  function applyOverride(productId: string, override: Partial<StoreProduct>) {
    setProductOverrides(prev => ({ ...prev, [productId]: { ...(prev[productId] ?? {}), ...override } }));
    // Update selectedProduct if it's the one being changed
    if (selectedProduct?.id === productId) {
      setSelectedProduct(prev => prev ? { ...prev, ...override } : null);
    }
  }

  function handleAvailChange(productId: string, avail: AvailabilityStatus) {
    applyOverride(productId, { availability: avail });
    const product = products.find(p => p.id === productId);
    const cfg = AVAIL_CFG[avail];
    toast.success(`«${product?.name}» → ${cfg.label}`);
  }

  const sc = STORE_STATUS_CFG[store.status] ?? STORE_STATUS_CFG.offline;
  const StatusIcon = sc.icon;

  return (
    <div style={{display:'contents'}}>
      {/* Overlay */}
      <div className="fixed inset-0 z-50 flex">
        <div className="absolute inset-0 bg-gray-900/50" onClick={onClose} />

        <div className="relative ml-auto h-full flex bg-white shadow-2xl" style={{ width: liveSelectedProduct ? '900px' : '560px', maxWidth: '98vw' }}>

          {/* ── Left: Store catalog ── */}
          <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
            {/* Header */}
            <div className="flex items-start gap-3 px-5 py-4 border-b border-gray-200 bg-white shrink-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-bold text-gray-900">{store.name}</h2>
                  <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sc.bg} ${sc.color}`}>
                    <StatusIcon className="w-3 h-3" />{sc.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{store.city}, {store.address}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{store.workingHours}</span>
                  <a href={`tel:${store.phone.replace(/\s|\(|\)|-/g, '')}`} className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                    <Phone className="w-3 h-3" />{store.phone}
                  </a>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors shrink-0">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Tab switcher */}
            <div className="flex items-center gap-1 px-5 py-2 border-b border-gray-200 bg-gray-50/40 shrink-0">
              <button
                onClick={() => setDrawerTab('products')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${drawerTab === 'products' ? 'bg-white shadow text-blue-700' : 'text-gray-600 hover:text-gray-900'}`}>
                <Package className="w-3 h-3" />Товары
              </button>
              <button
                onClick={() => setDrawerTab('discounts')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${drawerTab === 'discounts' ? 'bg-white shadow text-blue-700' : 'text-gray-600 hover:text-gray-900'}`}>
                <Tag className="w-3 h-3" />Скидки
              </button>
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-5 divide-x divide-gray-100 border-b border-gray-200 bg-gray-50/60 shrink-0">
              {[
                { label: 'Заказы',        value: store.ordersToday,                                               color: 'text-blue-700',  sub: 'сегодня' },
                { label: 'Ср. подготовка',value: store.avgPrepTime > 0 ? `${store.avgPrepTime}м` : '—',           color: 'text-gray-700',  sub: '' },
                { label: 'Рейтинг',       value: `★ ${store.rating}`,                                            color: 'text-yellow-600', sub: '' },
                { label: 'В наличии',     value: `${stats.available}/${stats.total}`,                             color: 'text-green-700', sub: 'SKU' },
                { label: 'Нет в наличии', value: stats.outOfStock,                                                color: stats.outOfStock > 0 ? 'text-red-600' : 'text-gray-700', sub: 'позиций' },
              ].map(s => (
                <div key={s.label} className="flex flex-col items-center py-3 px-2">
                  <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-[10px] text-gray-400 text-center">{s.label}</p>
                  {s.sub && <p className="text-[9px] text-gray-300">{s.sub}</p>}
                </div>
              ))}
            </div>

            {/* Discounts panel */}
            {drawerTab === 'discounts' && <StoreDiscountsPanel store={store} />}

            {/* Toolbar (products only) */}
            {drawerTab === 'products' && <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 shrink-0">
              <div className="flex-1 relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Поиск по SKU, названию, категории..."
                  className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={availFilter}
                onChange={e => setAvailFilter(e.target.value as any)}
                className="px-2.5 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 shrink-0"
              >
                <option value="all">Все статусы</option>
                <option value="available">В наличии</option>
                <option value="sold_out_today">Нет сегодня</option>
                <option value="sold_out_indefinitely">Нет в наличии</option>
                <option value="hidden">Скрыт</option>
              </select>
            </div>}

            {/* Product count */}
            {drawerTab === 'products' && <div className="px-4 py-2 shrink-0">
              <p className="text-xs text-gray-500">
                {filtered.length === products.length
                  ? `${products.length} товаров`
                  : `${filtered.length} из ${products.length} товаров`}
                {liveSelectedProduct && <span className="ml-2 text-blue-600">· выбрано: <span className="font-medium">{liveSelectedProduct.name}</span></span>}
              </p>
            </div>}

            {/* Product grid */}
            {drawerTab === 'products' && <div className="flex-1 overflow-y-auto px-4 pb-4">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <Package className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-sm">Товары не найдены</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                  {filtered.map(product => (
                    <div
                      key={product.id}
                      className={`transition-all ${liveSelectedProduct?.id === product.id ? 'ring-2 ring-blue-500 rounded-xl' : ''}`}
                    >
                      <ProductCard
                        product={product}
                        onSelect={p => setSelectedProduct(prev => prev?.id === p.id ? null : p)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>}
          </div>

          {/* ── Right: Product analytics panel ── */}
          {liveSelectedProduct && drawerTab === 'products' && (
            <div className="w-72 shrink-0 h-full overflow-hidden flex flex-col border-l border-gray-200">
              <ProductAnalyticsPanel
                product={liveSelectedProduct}
                onClose={() => setSelectedProduct(null)}
                onEdit={() => setEditingProduct(liveSelectedProduct)}
                onAvailChange={avail => handleAvailChange(liveSelectedProduct.id, avail)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Edit product modal (rendered above drawer at z-300) */}
      <AnimatePresence>
        {editingProduct && (
          <EditProductModal
            product={editingProduct}
            onSave={updated => applyOverride(editingProduct.id, updated)}
            onClose={() => setEditingProduct(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}