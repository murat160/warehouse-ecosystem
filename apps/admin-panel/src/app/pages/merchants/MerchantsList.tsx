import { useState, useMemo, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, Plus, Download, Filter, Phone, Mail, MessageSquare,
  Eye, ShieldAlert, Pause, Ban, ChevronDown, ChevronUp, X,
  Store, CheckCircle2, AlertTriangle, Clock, TrendingUp,
  TrendingDown, MoreHorizontal, ArrowUpDown, Package,
  UtensilsCrossed, ShoppingCart, Zap, Globe, Coffee, Apple,
  Gift, Car, Pill, Shirt, Flower2, Croissant, Sparkles,
  Building2, ChevronRight, Save, User, MapPin, CreditCard,
  FileText, Percent, Truck, Check,
} from 'lucide-react';
import {
  SELLERS, SellerSummary, SellerStatus, SellerType, RiskLevel, FulfillmentType,
  getStatusConfig, getRiskConfig, getTypeLabel, formatCurrency, formatNumber, formatTime, getFulfillmentLabel,
} from '../../data/merchants-mock';
import { toast } from 'sonner';
import { PreciseLocationPicker } from '../../components/location/PreciseLocationPicker';
import {
  emptyLocation, isLocationUsable, assertCanActivate,
  type Location,
} from '../../data/location';
import { useI18n } from '../../i18n';

// ─── Types ────────────────────────────────────────────────────────────────────

type SortField = 'displayName' | 'gmv30d' | 'orders30d' | 'cancelRate7d' | 'stockOutRate' | 'rating' | 'lastOrderDate';
type SortDir = 'asc' | 'desc';

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORY_TABS: { type: SellerType | 'all'; label: string; icon: any; color: string }[] = [
  { type: 'all',         label: 'Все',          icon: Store,           color: 'text-gray-600' },
  { type: 'restaurant',  label: 'Рестораны',    icon: UtensilsCrossed, color: 'text-red-500' },
  { type: 'cafe',        label: 'Кафе',         icon: Coffee,          color: 'text-amber-600' },
  { type: 'grocery',     label: 'Продукты',     icon: Apple,           color: 'text-green-600' },
  { type: 'bakery',      label: 'Выпечка',      icon: Croissant,       color: 'text-orange-500' },
  { type: 'gifts',       label: 'Подарки',      icon: Gift,            color: 'text-pink-500' },
  { type: 'auto_parts',  label: 'Запчасти',     icon: Car,             color: 'text-slate-600' },
  { type: 'pharmacy',    label: 'Аптеки',       icon: Pill,            color: 'text-emerald-600' },
  { type: 'electronics', label: 'Электроника',  icon: Zap,             color: 'text-blue-600' },
  { type: 'clothing',    label: 'Одежда',       icon: Shirt,           color: 'text-violet-600' },
  { type: 'flowers',     label: 'Цветы',        icon: Flower2,         color: 'text-rose-500' },
  { type: 'beauty',      label: 'Красота',      icon: Sparkles,        color: 'text-fuchsia-600' },
  { type: 'retail',      label: 'Ритейл',       icon: ShoppingCart,    color: 'text-indigo-600' },
  { type: 'darkstore',   label: 'Дарк-стор',    icon: Package,         color: 'text-gray-700' },
  { type: 'marketplace', label: 'Маркетплейс',  icon: Globe,           color: 'text-cyan-600' },
];

// ─── Modal helpers ─────────────────────────────────────────────────────────────

function useEscClose(onClose: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);
}

// ─── Create Seller Modal ──────────────────────────────────────────────────────

/**
 * 5-step wizard. Step 2 ("Точка") is the new map step — required when the
 * operator picks status='active'. For status='pending' the location step
 * is encouraged but not blocking, since pending sellers don't go live.
 */
const STEPS = ['Основное', 'Контакты', 'Точка', 'Тарифы', 'Итог'];

function CreateSellerModal({ onClose, onCreated }: { onClose: () => void; onCreated: (s: SellerSummary) => void }) {
  useEscClose(onClose);
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 0 — Basic
  const [displayName, setDisplayName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [sellerType, setSellerType] = useState<SellerType>('retail');
  const [fulfillment, setFulfillment] = useState<FulfillmentType>('delivery');
  const [status, setStatus]     = useState<SellerStatus>('pending');

  // Step 1 — Contacts
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [cities, setCities] = useState('');
  const [regions, setRegions] = useState('');

  // Step 2 — Location (new)
  const [sellerLocation, setSellerLocation] = useState<Location>(emptyLocation());

  // Step 3 — Tariffs
  const [taxId, setTaxId]       = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [commission, setCommission] = useState('12');
  const [notesInternal, setNotesInternal] = useState('');

  function validateStep(): string | null {
    if (step === 0) {
      if (!displayName.trim()) return 'Укажите отображаемое название';
      if (!legalName.trim()) return 'Укажите юридическое название';
    }
    if (step === 1) {
      if (!contactName.trim()) return 'Укажите контактное лицо';
      if (!phone.trim()) return 'Укажите телефон';
      if (!email.trim() || !email.includes('@')) return 'Укажите корректный email';
      if (!cities.trim()) return 'Укажите хотя бы один город';
    }
    if (step === 2) {
      // Activation gate: if the operator chose status='active', a confirmed
      // location is mandatory. Pending/paused sellers can still proceed.
      if (status === 'active') {
        const err = assertCanActivate(sellerLocation, 'seller');
        if (err) return t(err as any);
      }
    }
    if (step === 3) {
      if (!taxId.trim()) return 'Укажите ИНН';
      const comm = parseFloat(commission);
      if (isNaN(comm) || comm < 0 || comm > 50) return 'Комиссия от 0 до 50%';
    }
    return null;
  }

  function next() {
    const err = validateStep();
    if (err) { toast.error(err); return; }
    setStep(s => s + 1);
  }

  async function create() {
    setSaving(true);
    await new Promise(r => setTimeout(r, 800));

    const now = new Date().toISOString();
    const id = `slr-${String(Date.now()).slice(-6)}`;
    const code = `SLR-${String(SELLERS.length + 1).padStart(3, '0')}`;

    const newSeller: SellerSummary = {
      id, sellerCode: code,
      legalName: legalName.trim(),
      displayName: displayName.trim(),
      sellerType,
      status,
      riskLevel: 'low',
      verified: false,
      payoutHold: false,
      regions: regions.split(',').map(s => s.trim()).filter(Boolean),
      cities: cities.split(',').map(s => s.trim()).filter(Boolean),
      storesCount: 0,
      skuCount: 0,
      gmv7d: 0, gmv30d: 0,
      orders7d: 0, orders30d: 0,
      ordersSuccess7d: 0,
      cancellations7d: 0,
      cancelRate7d: 0,
      topCancelReason: '—',
      stockOutRate: 0,
      avgAcceptTime: 0,
      assignedPvzCount: 0,
      assignedPvzNames: [],
      primaryPhone: phone.trim(),
      primaryEmail: email.trim(),
      lastActivity: now,
      lastOrderDate: '-',
      fulfillmentType: fulfillment,
      commissionRate: parseFloat(commission) || 12,
      rating: 0,
      createdAt: now.slice(0, 10),
    };

    setSaving(false);
    onCreated(newSeller);
    toast.success(`Продавец «${displayName}» (${code}) создан! Статус: На проверке.`);
    onClose();
  }

  const cat = CATEGORY_TABS.find(c => c.type === sellerType);
  const CatIcon = cat?.icon ?? Store;

  return ReactDOM.createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
                <Plus className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Создать продавца</p>
                <p className="text-xs text-gray-500">Шаг {step + 1} из {STEPS.length}: {STEPS[step]}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Step indicator */}
          <div className="shrink-0 flex items-center px-6 py-3 border-b border-gray-100 gap-0">
            {STEPS.map((label, i) => (
              <div key={i} className="flex items-center flex-1">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  i === step ? 'bg-blue-100 text-blue-700' :
                  i < step   ? 'text-green-600' : 'text-gray-400'
                }`}>
                  {i < step
                    ? <Check className="w-3.5 h-3.5" />
                    : <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center text-[10px] ${i === step ? 'border-blue-500 text-blue-600' : 'border-gray-300 text-gray-400'}`}>{i + 1}</span>
                  }
                  {label}
                </div>
                {i < STEPS.length - 1 && <div className={`flex-1 h-px mx-1 ${i < step ? 'bg-green-300' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

            {/* ── STEP 0: Basic ── */}
            {step === 0 && (
              <div style={{display:'contents'}}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Отображаемое название *</label>
                    <input value={displayName} onChange={e => setDisplayName(e.target.value)}
                      placeholder="Например: ЭлектроМир"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Юридическое название *</label>
                    <input value={legalName} onChange={e => setLegalName(e.target.value)}
                      placeholder="ООО «…» или ИП …"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-2">Категория / тип *</label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {CATEGORY_TABS.filter(c => c.type !== 'all').map(cat => {
                      const Icon = cat.icon;
                      const sel = sellerType === cat.type;
                      return (
                        <button key={cat.type} onClick={() => setSellerType(cat.type as SellerType)}
                          className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-xs font-medium ${
                            sel ? `border-blue-400 bg-blue-50 ${cat.color}` : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                          }`}>
                          <Icon className={`w-5 h-5 ${sel ? cat.color : 'text-gray-400'}`} />
                          {cat.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Исполнение заказов</label>
                    <select value={fulfillment} onChange={e => setFulfillment(e.target.value as FulfillmentType)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                      <option value="delivery">Доставка курьером</option>
                      <option value="pickup">Самовывоз</option>
                      <option value="pvz">ПВЗ</option>
                      <option value="self_delivery">Собственная доставка</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Начальный статус</label>
                    <select value={status} onChange={e => setStatus(e.target.value as SellerStatus)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                      <option value="pending">На проверке</option>
                      <option value="active">Активен</option>
                      <option value="paused">Пауза</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 1: Contacts ── */}
            {step === 1 && (
              <div style={{display:'contents'}}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Контактное лицо *</label>
                    <input value={contactName} onChange={e => setContactName(e.target.value)}
                      placeholder="Иванов Иван Иванович"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Телефон *</label>
                    <input value={phone} onChange={e => setPhone(e.target.value)}
                      placeholder="+7 (495) 000-00-00"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email (операционный) *</label>
                  <input value={email} onChange={e => setEmail(e.target.value)}
                    type="email" placeholder="ops@company.ru"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Города работы *</label>
                    <input value={cities} onChange={e => setCities(e.target.value)}
                      placeholder="Москва, Санкт-Петербург"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    <p className="text-[10px] text-gray-400 mt-1">Через запятую</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Регионы</label>
                    <input value={regions} onChange={e => setRegions(e.target.value)}
                      placeholder="Центральный"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    <p className="text-[10px] text-gray-400 mt-1">Через запятую</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 2: Precise location ── */}
            {step === 2 && (
              <div style={{display:'contents'}}>
                <PreciseLocationPicker
                  value={sellerLocation}
                  onChange={setSellerLocation}
                  mode="seller"
                  cityHint={cities.split(',')[0]?.trim()}
                  required={status === 'active'}
                />
              </div>
            )}

            {/* ── STEP 3: Tariffs ── */}
            {step === 3 && (
              <div style={{display:'contents'}}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">ИНН *</label>
                    <input value={taxId} onChange={e => setTaxId(e.target.value)}
                      placeholder="7707123456"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Расчётный счёт</label>
                    <input value={bankAccount} onChange={e => setBankAccount(e.target.value)}
                      placeholder="BY20OLMP..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Ставка комиссии (%) *</label>
                  <div className="flex items-center gap-3">
                    <input value={commission} onChange={e => setCommission(e.target.value)}
                      type="number" min="0" max="50" step="0.5"
                      className="w-32 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    <div className="flex gap-2">
                      {[8, 10, 12, 15, 18].map(v => (
                        <button key={v} onClick={() => setCommission(String(v))}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${commission === String(v) ? 'bg-blue-100 border-blue-400 text-blue-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                          {v}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Внутренняя заметка</label>
                  <textarea value={notesInternal} onChange={e => setNotesInternal(e.target.value)}
                    rows={3} placeholder="Примечания при создании, источник лида, договорённости..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
                </div>
              </div>
            )}

            {/* ── STEP 4: Summary ── */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white shrink-0">
                    <CatIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{displayName || '—'}</p>
                    <p className="text-xs text-gray-500">{legalName}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-[10px] font-semibold">На проверке</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: Store, label: 'Категория', value: getTypeLabel(sellerType) },
                    { icon: Truck, label: 'Исполнение', value: getFulfillmentLabel(fulfillment) },
                    { icon: User, label: 'Контакт', value: contactName },
                    { icon: Phone, label: 'Телефон', value: phone },
                    { icon: Mail, label: 'Email', value: email },
                    { icon: MapPin, label: 'Города', value: cities },
                    { icon: FileText, label: 'ИНН', value: taxId || '—' },
                    { icon: Percent, label: 'Комиссия', value: `${commission}%` },
                  ].map(row => {
                    const Icon = row.icon;
                    return (
                      <div key={row.label} className="flex items-start gap-2.5 p-3 bg-gray-50 rounded-xl">
                        <Icon className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[10px] text-gray-400 uppercase">{row.label}</p>
                          <p className="text-xs font-semibold text-gray-800 truncate">{row.value || '—'}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-xs text-yellow-700">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  После создания продавец получит статус «На проверке». Не забудьте загрузить документы в карточке.
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
            <button onClick={() => step === 0 ? onClose() : setStep(s => s - 1)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 border border-gray-200 bg-white rounded-xl hover:bg-gray-50 transition-colors">
              {step === 0 ? <span style={{display:'contents'}}><X className="w-3.5 h-3.5" />Отмена</span> : <span style={{display:'contents'}}><ChevronDown className="w-3.5 h-3.5 rotate-90" />Назад</span>}
            </button>

            {step < STEPS.length - 1 ? (
              <button onClick={next}
                className="flex items-center gap-1.5 px-5 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors">
                Далее <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button onClick={create} disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2 text-sm text-white bg-green-600 hover:bg-green-700 disabled:opacity-60 rounded-xl transition-colors">
                {saving
                  ? <span style={{display:'contents'}}><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Создание…</span>
                  : <span style={{display:'contents'}}><Check className="w-3.5 h-3.5" />Создать продавца</span>}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function MerchantsList() {
  const [searchQuery, setSearchQuery]         = useState('');
  const [categoryTab, setCategoryTab]         = useState<SellerType | 'all'>('all');
  const [statusFilter, setStatusFilter]       = useState<SellerStatus | 'all'>('all');
  const [typeFilter, setTypeFilter]           = useState<SellerType | 'all'>('all');
  const [riskFilter, setRiskFilter]           = useState<RiskLevel | 'all'>('all');
  const [regionFilter, setRegionFilter]       = useState<string>('all');
  const [fulfillmentFilter, setFulfillmentFilter] = useState<FulfillmentType | 'all'>('all');
  const [problemsOnly, setProblemsOnly]       = useState(false);
  const navigate = useNavigate();
  const [showFilters, setShowFilters]         = useState(false);
  const [sortField, setSortField]             = useState<SortField>('gmv30d');
  const [sortDir, setSortDir]                 = useState<SortDir>('desc');
  const [selected, setSelected]               = useState<Set<string>>(new Set());
  const [showExportMenu, setShowExportMenu]   = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [extraSellers, setExtraSellers]       = useState<SellerSummary[]>([]);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, SellerStatus>>({});
  const [managerByseller, setManagerBySeller] = useState<Record<string, string>>({});
  const [bulkAction, setBulkAction]           = useState<null | { kind: 'manager' }>(null);
  const [managerInput, setManagerInput]       = useState('');

  const allSellers = useMemo(() => {
    const list = [...SELLERS, ...extraSellers];
    return list.map(s => statusOverrides[s.id] ? { ...s, status: statusOverrides[s.id] } : s);
  }, [extraSellers, statusOverrides]);

  const allRegions = useMemo(() => {
    const r = new Set<string>();
    allSellers.forEach(s => s.regions.forEach(reg => r.add(reg)));
    return Array.from(r);
  }, [allSellers]);

  // Category tab counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allSellers.length };
    allSellers.forEach(s => {
      counts[s.sellerType] = (counts[s.sellerType] ?? 0) + 1;
    });
    return counts;
  }, [allSellers]);

  const filtered = useMemo(() => {
    let result = allSellers.filter(s => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q ||
        s.displayName.toLowerCase().includes(q) ||
        s.sellerCode.toLowerCase().includes(q) ||
        s.legalName.toLowerCase().includes(q) ||
        s.primaryEmail.toLowerCase().includes(q) ||
        s.cities.some(c => c.toLowerCase().includes(q));
      const matchesCategory    = categoryTab === 'all' || s.sellerType === categoryTab;
      const matchesStatus      = statusFilter === 'all' || s.status === statusFilter;
      const matchesType        = typeFilter === 'all' || s.sellerType === typeFilter;
      const matchesRisk        = riskFilter === 'all' || s.riskLevel === riskFilter;
      const matchesRegion      = regionFilter === 'all' || s.regions.includes(regionFilter);
      const matchesFulfillment = fulfillmentFilter === 'all' || s.fulfillmentType === fulfillmentFilter;
      const matchesProblems    = !problemsOnly || s.cancelRate7d > 5 || s.stockOutRate > 5 || s.riskLevel === 'high';
      return matchesSearch && matchesCategory && matchesStatus && matchesType && matchesRisk && matchesRegion && matchesFulfillment && matchesProblems;
    });

    result.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];
      if (sortField === 'lastOrderDate') {
        aVal = new Date(a.lastOrderDate).getTime() || 0;
        bVal = new Date(b.lastOrderDate).getTime() || 0;
      }
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [allSellers, searchQuery, categoryTab, statusFilter, typeFilter, riskFilter, regionFilter, fulfillmentFilter, problemsOnly, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };
  const toggleSelect = (id: string) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleAll = () => {
    setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map(s => s.id)));
  };
  const handleExport = (format: string) => {
    const content = filtered.map(s =>
      `${s.sellerCode}\t${s.displayName}\t${s.legalName}\t${getTypeLabel(s.sellerType)}\t${s.cities.join(', ')}\t${s.primaryEmail}\t${s.primaryPhone}\t${s.gmv30d}\t${s.orders30d}\t${s.cancelRate7d}%\t${s.rating}`
    ).join('\n');
    const header = `Код\tНазвание\tЮр.лицо\tТип\tГорода\tEmail\tТелефон\tGMV30д\tЗаказы30д\tОтмены%\tРейтинг`;
    const blob = new Blob([header + '\n' + content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sellers_export_${new Date().toISOString().slice(0, 10)}.${format.toLowerCase()}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Экспорт ${format} запущен (${filtered.length} записей)`);
    setShowExportMenu(false);
  };

  const stats = useMemo(() => {
    const active      = allSellers.filter(s => s.status === 'active').length;
    const totalGmv    = allSellers.reduce((sum, s) => sum + s.gmv30d, 0);
    const totalOrders = allSellers.reduce((sum, s) => sum + s.orders30d, 0);
    const avgCancel   = allSellers.filter(s => s.status === 'active').reduce((sum, s) => sum + s.cancelRate7d, 0) / (active || 1);
    const problems    = allSellers.filter(s => s.cancelRate7d > 5 || s.stockOutRate > 5 || s.riskLevel === 'high').length;
    return { active, total: allSellers.length, totalGmv, totalOrders, avgCancel: avgCancel.toFixed(1), problems };
  }, [allSellers]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Продавцы</h1>
          <p className="text-sm text-gray-500 mt-0.5">Реестр продавцов и управление партнёрами платформы</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              <Download className="w-4 h-4" />Экспорт
            </button>
            {showExportMenu && (
              <div style={{display:'contents'}}>
                <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-40">
                  {['CSV', 'XLSX', 'PDF'].map(f => (
                    <button key={f} onClick={() => handleExport(f)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">{f}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />Создать продавца
          </button>
        </div>
      </div>

      {/* Summary KPI Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'Всего продавцов', value: String(stats.total),            sub: `${stats.active} активных`,         color: 'text-gray-900',   bg: 'bg-white',     action: 'reset'    },
          { label: 'GMV (30д)',       value: formatCurrency(stats.totalGmv), sub: '+12.4%',                           color: 'text-blue-700',   bg: 'bg-blue-50',   action: 'finance'  },
          { label: 'Заказы (30д)',    value: formatNumber(stats.totalOrders),sub: '+8.2%',                            color: 'text-green-700',  bg: 'bg-green-50',  action: 'orders'   },
          { label: 'Ср. отмены (7д)', value: `${stats.avgCancel}%`,          sub: '+0.3%',                            color: 'text-gray-900',   bg: 'bg-white',     action: 'refunds'  },
          { label: 'Проблемные',      value: String(stats.problems),         sub: 'высокие отмены/stock-out',         color: 'text-orange-600', bg: 'bg-orange-50', action: 'problems' },
        ].map(stat => (
          <button
            key={stat.label}
            onClick={() => {
              switch (stat.action) {
                case 'reset':
                  // Visible: clears all filters, list snaps to full set.
                  setCategoryTab('all'); setStatusFilter('all'); setTypeFilter('all');
                  setSearchQuery(''); setRiskFilter('all'); setRegionFilter('all');
                  setFulfillmentFilter('all'); setProblemsOnly(false);
                  break;
                case 'finance':  navigate('/finance');          break;
                case 'orders':   navigate('/orders');           break;
                case 'refunds':  navigate('/finance/refunds');  break;
                case 'problems': setProblemsOnly(v => !v);      break;
              }
            }}
            className={`${stat.bg} p-3 rounded-xl border transition-all text-left hover:shadow-md active:scale-[0.97] cursor-pointer ${
              stat.action === 'problems' && problemsOnly ? 'border-orange-400 ring-2 ring-orange-200 ring-offset-1' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
            <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.sub}</p>
          </button>
        ))}
      </div>

      {/* ── Category Tabs ── */}
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORY_TABS.map(cat => {
            const Icon = cat.icon;
            const count = categoryCounts[cat.type] ?? 0;
            const active = categoryTab === cat.type;
            if (cat.type !== 'all' && count === 0) return null;
            return (
              <button
                key={cat.type}
                onClick={() => setCategoryTab(cat.type)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                  active
                    ? `bg-blue-50 border border-blue-200 ${cat.color}`
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? cat.color : 'text-gray-400'}`} />
                {cat.label}
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                  active ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск по названию, коду, email, городу..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">Все статусы</option>
            <option value="active">Активен</option>
            <option value="paused">Пауза</option>
            <option value="blocked">Заблокирован</option>
            <option value="pending">На проверке</option>
            <option value="on_hold">Холд выплат</option>
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">Все категории</option>
            {CATEGORY_TABS.filter(c => c.type !== 'all').map(c => (
              <option key={c.type} value={c.type}>{c.label}</option>
            ))}
          </select>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors ${showFilters ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 hover:bg-gray-50'}`}
          >
            <Filter className="w-4 h-4" />Ещё
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100">
            <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value as any)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="all">Все уровни риска</option>
              <option value="low">Низкий</option>
              <option value="medium">Средний</option>
              <option value="high">Высокий</option>
            </select>
            <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="all">Все регионы</option>
              {allRegions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select value={fulfillmentFilter} onChange={(e) => setFulfillmentFilter(e.target.value as any)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="all">Все каналы</option>
              <option value="delivery">Доставка</option>
              <option value="pickup">Самовывоз</option>
              <option value="pvz">ПВЗ</option>
              <option value="self_delivery">Свой курьер</option>
            </select>
            <label className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm cursor-pointer hover:bg-gray-50">
              <input type="checkbox" checked={problemsOnly} onChange={(e) => setProblemsOnly(e.target.checked)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              Только проблемные
            </label>
          </div>
        )}
      </div>

      {/* Bulk Actions Bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
          <span className="text-sm text-blue-700">Выбрано: {selected.size}</span>
          <div className="h-4 w-px bg-blue-200" />
          <button
            onClick={() => {
              const ids = Array.from(selected);
              setStatusOverrides(prev => {
                const next = { ...prev };
                ids.forEach(id => { next[id] = 'paused'; });
                return next;
              });
              toast.success(`Поставлено на паузу: ${ids.length}`, { description: 'Статус продавцов изменён в списке' });
              setSelected(new Set());
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
            <Pause className="w-3.5 h-3.5" /> Пауза
          </button>
          <button
            onClick={() => { setBulkAction({ kind: 'manager' }); setManagerInput(''); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
            Назначить менеджера
          </button>
          <button
            onClick={() => {
              const ids = Array.from(selected).join(',');
              navigate(`/support/tickets?from=merchant_bulk&ids=${encodeURIComponent(ids)}`);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
            <MessageSquare className="w-3.5 h-3.5" /> Тикет
          </button>
          <button onClick={() => setSelected(new Set())} className="ml-auto p-1 text-blue-400 hover:text-blue-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Manager assign modal */}
      {bulkAction?.kind === 'manager' && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm" onClick={() => setBulkAction(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <p className="font-bold text-gray-900">Назначить менеджера ({selected.size} продавцов)</p>
              <button onClick={() => setBulkAction(null)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-3">
              <label className="block text-xs font-semibold text-gray-600 mb-1">ФИО менеджера</label>
              <input
                value={managerInput}
                onChange={e => setManagerInput(e.target.value)}
                placeholder="Иванов И.И."
                autoFocus
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-2 flex-wrap pt-1">
                {['Иванов И.И.', 'Петров А.С.', 'Сидорова О.В.'].map(m => (
                  <button key={m} onClick={() => setManagerInput(m)}
                    className="px-2.5 py-1 border border-gray-200 rounded-lg text-xs hover:bg-gray-50">{m}</button>
                ))}
              </div>
            </div>
            <div className="px-6 py-4 border-t flex gap-3">
              <button onClick={() => setBulkAction(null)} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Отмена</button>
              <button
                onClick={() => {
                  if (!managerInput.trim()) { toast.error('Введите ФИО менеджера'); return; }
                  const ids = Array.from(selected);
                  setManagerBySeller(prev => {
                    const next = { ...prev };
                    ids.forEach(id => { next[id] = managerInput.trim(); });
                    return next;
                  });
                  toast.success(`Менеджер назначен: ${managerInput.trim()}`, { description: `Продавцов: ${ids.length}` });
                  setBulkAction(null);
                  setSelected(new Set());
                }}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold">Назначить</button>
            </div>
          </div>
        </div>
      )}

      {/* Result count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Найдено: <span className="font-semibold text-gray-800">{filtered.length}</span> из {allSellers.length}
          {categoryTab !== 'all' && <span className="ml-2 text-xs text-blue-600">· {CATEGORY_TABS.find(c => c.type === categoryTab)?.label}</span>}
        </p>
        {(categoryTab !== 'all' || statusFilter !== 'all' || searchQuery) && (
          <button onClick={() => { setCategoryTab('all'); setStatusFilter('all'); setTypeFilter('all'); setSearchQuery(''); setRiskFilter('all'); setRegionFilter('all'); setFulfillmentFilter('all'); setProblemsOnly(false); }}
            className="text-xs text-blue-600 hover:underline flex items-center gap-1">
            <X className="w-3 h-3" />Сбросить фильтры
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70">
                <th className="w-10 px-3 py-3">
                  <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                </th>
                <th className="text-left px-3 py-3 font-medium text-gray-500">
                  <button onClick={() => toggleSort('displayName')} className="flex items-center gap-1 hover:text-gray-700">
                    Продавец <SortIcon field="displayName" />
                  </button>
                </th>
                <th className="text-left px-3 py-3 font-medium text-gray-500 hidden xl:table-cell">Категория</th>
                <th className="text-left px-3 py-3 font-medium text-gray-500 hidden lg:table-cell">Регион</th>
                <th className="text-center px-3 py-3 font-medium text-gray-500 hidden xl:table-cell">
                  <span title="Магазинов / SKU">Маг/SKU</span>
                </th>
                <th className="text-right px-3 py-3 font-medium text-gray-500">
                  <button onClick={() => toggleSort('gmv30d')} className="flex items-center gap-1 ml-auto hover:text-gray-700">
                    GMV 30д <SortIcon field="gmv30d" />
                  </button>
                </th>
                <th className="text-right px-3 py-3 font-medium text-gray-500 hidden lg:table-cell">
                  <button onClick={() => toggleSort('orders30d')} className="flex items-center gap-1 ml-auto hover:text-gray-700">
                    Заказы 30д <SortIcon field="orders30d" />
                  </button>
                </th>
                <th className="text-right px-3 py-3 font-medium text-gray-500 hidden xl:table-cell">
                  <button onClick={() => toggleSort('cancelRate7d')} className="flex items-center gap-1 ml-auto hover:text-gray-700">
                    Отмены% <SortIcon field="cancelRate7d" />
                  </button>
                </th>
                <th className="text-right px-3 py-3 font-medium text-gray-500 hidden 2xl:table-cell">
                  <button onClick={() => toggleSort('stockOutRate')} className="flex items-center gap-1 ml-auto hover:text-gray-700">
                    StockOut% <SortIcon field="stockOutRate" />
                  </button>
                </th>
                <th className="text-center px-3 py-3 font-medium text-gray-500 hidden 2xl:table-cell">ПВЗ</th>
                <th className="text-right px-3 py-3 font-medium text-gray-500 hidden xl:table-cell">
                  <button onClick={() => toggleSort('rating')} className="flex items-center gap-1 ml-auto hover:text-gray-700">
                    Рейтинг <SortIcon field="rating" />
                  </button>
                </th>
                <th className="text-center px-3 py-3 font-medium text-gray-500">Контакты</th>
                <th className="text-center px-3 py-3 font-medium text-gray-500 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((seller) => {
                const sc = getStatusConfig(seller.status);
                const rc = getRiskConfig(seller.riskLevel);
                const catCfg = CATEGORY_TABS.find(c => c.type === seller.sellerType);
                const CatIcon = catCfg?.icon ?? Store;
                return (
                  <tr key={seller.id} className={`hover:bg-gray-50/50 transition-colors ${selected.has(seller.id) ? 'bg-blue-50/30' : ''}`}>
                    <td className="px-3 py-3">
                      <input type="checkbox" checked={selected.has(seller.id)} onChange={() => toggleSelect(seller.id)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3 min-w-[200px]">
                        <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-xs shrink-0">
                          {seller.displayName.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Link to={`/merchants/${seller.id}`} className="font-medium text-gray-900 hover:text-blue-600 truncate">
                              {seller.displayName}
                            </Link>
                            {seller.verified && <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${sc.bg} ${sc.color}`}>{sc.label}</span>
                            {seller.payoutHold && <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700">Холд</span>}
                            {seller.riskLevel !== 'low' && <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${rc.bg} ${rc.color}`}>{rc.label}</span>}
                          </div>
                          <p className="text-xs text-gray-500 truncate mt-0.5">{seller.sellerCode} · {seller.cities.join(', ')}</p>
                          {managerByseller[seller.id] && (
                            <p className="text-[10px] text-blue-600 truncate mt-0.5 flex items-center gap-1">
                              <User className="w-2.5 h-2.5" />Менеджер: {managerByseller[seller.id]}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 hidden xl:table-cell">
                      <div className="flex items-center gap-1.5">
                        <CatIcon className={`w-3.5 h-3.5 shrink-0 ${catCfg?.color ?? 'text-gray-400'}`} />
                        <span className="text-xs text-gray-600">{getTypeLabel(seller.sellerType)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-gray-600 hidden lg:table-cell">
                      <span className="text-xs">{seller.regions.join(', ')}</span>
                    </td>
                    <td className="px-3 py-3 text-center text-gray-600 hidden xl:table-cell">
                      <span className="text-xs">{seller.storesCount}/{formatNumber(seller.skuCount)}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="font-medium text-gray-900">{formatCurrency(seller.gmv30d)}</span>
                      {seller.gmv7d > 0 && <p className="text-[10px] text-gray-400 mt-0.5">7д: {formatCurrency(seller.gmv7d)}</p>}
                    </td>
                    <td className="px-3 py-3 text-right text-gray-600 hidden lg:table-cell">
                      <span>{formatNumber(seller.orders30d)}</span>
                      <p className="text-[10px] text-gray-400 mt-0.5">7д: {formatNumber(seller.orders7d)}</p>
                    </td>
                    <td className="px-3 py-3 text-right hidden xl:table-cell">
                      <span className={`font-medium ${seller.cancelRate7d > 5 ? 'text-red-600' : seller.cancelRate7d > 3 ? 'text-orange-600' : 'text-gray-600'}`}>
                        {seller.cancelRate7d}%
                      </span>
                      {seller.cancelRate7d > 0 && <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[80px]">{seller.topCancelReason}</p>}
                    </td>
                    <td className="px-3 py-3 text-right hidden 2xl:table-cell">
                      <span className={`font-medium ${seller.stockOutRate > 5 ? 'text-red-600' : seller.stockOutRate > 2 ? 'text-orange-600' : 'text-gray-600'}`}>
                        {seller.stockOutRate}%
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center hidden 2xl:table-cell">
                      <span className="text-xs text-gray-600">{seller.assignedPvzCount}</span>
                    </td>
                    <td className="px-3 py-3 text-right hidden xl:table-cell">
                      {seller.rating > 0 ? (
                        <span className={`font-medium ${seller.rating >= 4.5 ? 'text-green-600' : seller.rating >= 4.0 ? 'text-yellow-600' : 'text-red-600'}`}>
                          ★ {seller.rating}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <a href={`tel:${seller.primaryPhone}`}
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors" title={seller.primaryPhone}>
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                        <a href={`mailto:${seller.primaryEmail}`}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title={seller.primaryEmail}>
                          <Mail className="w-3.5 h-3.5" />
                        </a>
                        <button onClick={() => toast.info('Открыт чат')} className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors" title="Чат">
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <Link to={`/merchants/${seller.id}`} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors inline-flex" title="Открыть карточку">
                        <Eye className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Store className="w-12 h-12 mb-3" />
            <p className="text-sm">Продавцы не найдены</p>
            <p className="text-xs mt-1">Попробуйте зменить параметры или <button onClick={() => setShowCreateModal(true)} className="text-blue-500 underline">создайте нового</button></p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateSellerModal
          onClose={() => setShowCreateModal(false)}
          onCreated={s => setExtraSellers(prev => [s, ...prev])}
        />
      )}
    </div>
  );
}