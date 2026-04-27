import { useState, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import {
  Megaphone, Search, CheckCircle2, XCircle, Clock, Eye,
  Store, MapPin, Bike, Star, TrendingUp, Download, Filter,
  Calendar, Check, X, Info, AlertTriangle, Package,
  Image, BadgePercent, Zap, Target, BarChart2, DollarSign,
  ChevronRight, FileText, Shield, RefreshCw, ClipboardList,
  UserCheck, UserX, GitBranch, ArrowUpRight, Plus, Layers,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type PromoStatus   = 'pending' | 'under_review' | 'approved' | 'active' | 'paused' | 'rejected' | 'expired';
type PromoType     = 'featured_listing' | 'banner' | 'push_notification' | 'category_top' | 'discount_badge' | 'homepage_block';
type PartnerType   = 'merchant' | 'pvz';

interface PromoAuditEntry {
  action:    string;
  actor:     string;
  actorRole: string;
  at:        string;
  note?:     string;
}

interface Promotion {
  id:            string;
  partnerId:     string;
  partnerName:   string;
  partnerType:   PartnerType;
  partnerCity:   string;
  productName:   string;
  productImage:  string;
  category:      string;
  type:          PromoType;
  status:        PromoStatus;
  budget:        number;       // ₽ budget requested
  dailyBudget:   number;
  duration:      number;       // days
  startDate:     string;
  endDate:       string;
  targeting:     string[];
  expectedReach: number;
  expectedCtr:   number;
  description:   string;
  // Audit
  createdByName: string;
  createdByRole: string;
  createdAt:     string;
  reviewedByName?: string;
  reviewedByRole?: string;
  reviewedAt?:   string;
  approvedByName?: string;
  approvedByRole?: string;
  approvedAt?:   string;
  rejectedByName?: string;
  rejectedByRole?: string;
  rejectedAt?:   string;
  rejectReason?: string;
  auditTrail:    PromoAuditEntry[];
  // Stats (if active)
  impressions?:  number;
  clicks?:       number;
  conversions?:  number;
  spent?:        number;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_PROMOTIONS: Promotion[] = [
  {
    id: 'PROMO-001', partnerId: 'merch-001', partnerName: 'Кафе «Уют»', partnerType: 'merchant', partnerCity: 'Москва',
    productName: 'Пицца «Маргарита» XL', productImage: '🍕', category: 'Еда и рестораны',
    type: 'featured_listing', status: 'pending', budget: 12000, dailyBudget: 1200, duration: 10,
    startDate: '10.02.2026', endDate: '20.02.2026',
    targeting: ['Центр Москвы', '25-45 лет', 'Обеденное время'],
    expectedReach: 45000, expectedCtr: 3.8,
    description: 'Продвижение флагманского продукта в разделе "Популярное". Акция выходного дня + обед.',
    createdByName: 'Менеджер Яковлев А.', createdByRole: 'Менеджер партнёра',
    createdAt: '07.02.2026 10:15',
    reviewedByName: 'Оператор Сергеева Н.', reviewedByRole: 'Менеджер продвижений',
    reviewedAt: '07.02.2026 12:00',
    auditTrail: [
      { action: 'Заявка подана', actor: 'Менеджер Яковлев А.', actorRole: 'Менеджер партнёра', at: '07.02.2026 10:15', note: 'Подано через личный кабинет партнёра' },
      { action: 'Заявка на проверке', actor: 'Оператор Сергеева Н.', actorRole: 'Менеджер продвижений', at: '07.02.2026 12:00', note: 'Проверка контента и бюджета' },
    ],
  },
  {
    id: 'PROMO-002', partnerId: 'merch-006', partnerName: 'TechStore MSK', partnerType: 'merchant', partnerCity: 'Москва',
    productName: 'Наушники Sony WH-1000XM5', productImage: '🎧', category: 'Электроника',
    type: 'banner', status: 'approved', budget: 45000, dailyBudget: 4500, duration: 10,
    startDate: '08.02.2026', endDate: '18.02.2026',
    targeting: ['Москва', 'Аудитория гаджетов', '20-40 лет'],
    expectedReach: 120000, expectedCtr: 2.1,
    description: 'Баннер на главной странице. Акция к 14 февраля — скидка 15%.',
    createdByName: 'Марина Кострова', createdByRole: 'Менеджер TechStore',
    createdAt: '05.02.2026 09:00',
    reviewedByName: 'Оператор Сергеева Н.', reviewedByRole: 'Менеджер продвижений',
    reviewedAt: '05.02.2026 14:00',
    approvedByName: 'Руководитель Дмитриев К.', approvedByRole: 'Руководитель отдела маркетинга',
    approvedAt: '06.02.2026 09:30',
    auditTrail: [
      { action: 'Заявка подана', actor: 'Марина Кострова', actorRole: 'Менеджер TechStore', at: '05.02.2026 09:00' },
      { action: 'Контент проверен', actor: 'Оператор Сергеева Н.', actorRole: 'Менеджер продвижений', at: '05.02.2026 14:00', note: 'Баннер соответствует гайдлайнам' },
      { action: 'Одобрено', actor: 'Руководитель Дмитриев К.', actorRole: 'Руководитель маркетинга', at: '06.02.2026 09:30', note: 'Бюджет подтверждён, запуск 08.02' },
    ],
    impressions: 89000, clicks: 1870, conversions: 340, spent: 38700,
  },
  {
    id: 'PROMO-003', partnerId: 'merch-002', partnerName: 'Пекарня «Хлеб»', partnerType: 'merchant', partnerCity: 'Москва',
    productName: 'Набор выпечки "Утро"', productImage: '🥐', category: 'Еда и рестораны',
    type: 'push_notification', status: 'active', budget: 8000, dailyBudget: 800, duration: 10,
    startDate: '07.02.2026', endDate: '17.02.2026',
    targeting: ['Утренние заказы', '7:00–10:00', 'В радиусе 2 км'],
    expectedReach: 25000, expectedCtr: 5.2,
    description: 'Push-уведомление в утренние часы с промо-кодом MORNING15 на скидку 15%.',
    createdByName: 'ИП Петров А.В.', createdByRole: 'Владелец',
    createdAt: '04.02.2026 18:00',
    reviewedByName: 'Оператор Сергеева Н.', reviewedByRole: 'Менеджер продвижений',
    reviewedAt: '05.02.2026 09:00',
    approvedByName: 'Руководитель Дмитриев К.', approvedByRole: 'Руководитель маркетинга',
    approvedAt: '06.02.2026 10:00',
    auditTrail: [
      { action: 'Заявка подана', actor: 'ИП Петров А.В.', actorRole: 'Владелец', at: '04.02.2026 18:00' },
      { action: 'Одобрено', actor: 'Руководитель Дмитриев К.', actorRole: 'Руководитель маркетинга', at: '06.02.2026 10:00' },
      { action: 'Рекламная кампания активирована', actor: 'Система', actorRole: 'Рекламная платформа', at: '07.02.2026 07:00' },
    ],
    impressions: 21400, clicks: 1113, conversions: 287, spent: 5600,
  },
  {
    id: 'PROMO-004', partnerId: 'merch-008', partnerName: 'FreshMarket', partnerType: 'merchant', partnerCity: 'Москва',
    productName: 'Фрукты и овощи — сезонные', productImage: '🥦', category: 'Продукты',
    type: 'category_top', status: 'pending', budget: 18000, dailyBudget: 1800, duration: 10,
    startDate: '12.02.2026', endDate: '22.02.2026',
    targeting: ['Мос��ва', 'Семьи', 'Покупатели продуктов'],
    expectedReach: 70000, expectedCtr: 4.1,
    description: 'Закрепление вверху категории "Продукты питания". Акция на свежие овощи и фрукты.',
    createdByName: 'Директор Павлова И.', createdByRole: 'Коммерческий директор FreshMarket',
    createdAt: '07.02.2026 11:30',
    auditTrail: [
      { action: 'Заявка подана', actor: 'Директор Павлова И.', actorRole: 'Коммерческий директор', at: '07.02.2026 11:30', note: 'Запрос на приоритетное размещение в категории' },
    ],
  },
  {
    id: 'PROMO-005', partnerId: 'pvz-001', partnerName: 'ПВЗ «Сортировочная»', partnerType: 'pvz', partnerCity: 'Москва',
    productName: 'Реклама ПВЗ в районе', productImage: '📦', category: 'Пункты выдачи',
    type: 'featured_listing', status: 'rejected', budget: 6000, dailyBudget: 600, duration: 10,
    startDate: '05.02.2026', endDate: '15.02.2026',
    targeting: ['Юг Москвы', 'Жители района'],
    expectedReach: 15000, expectedCtr: 1.8,
    description: 'Выделение ПВЗ в списке пунктов выдачи при выборе маршрута.',
    createdByName: 'Управляющий Сидоров В.', createdByRole: 'Управляющий ПВЗ',
    createdAt: '02.02.2026 16:00',
    reviewedByName: 'Оператор Сергеева Н.', reviewedByRole: 'Менеджер продвижений',
    reviewedAt: '03.02.2026 09:00',
    rejectedByName: 'Руководитель Дмитриев К.', rejectedByRole: 'Руководитель маркетинга',
    rejectedAt: '03.02.2026 11:00',
    rejectReason: 'Бюджет недостаточен для выбранного формата. Минимальный бюджет для featured listing — ₽10 000.',
    auditTrail: [
      { action: 'Заявка подана', actor: 'Управляющий Сидоров В.', actorRole: 'Управляющий ПВЗ', at: '02.02.2026 16:00' },
      { action: 'Проверено', actor: 'Оператор Сергеева Н.', actorRole: 'Менеджер продвижений', at: '03.02.2026 09:00', note: 'Бюджет ниже минимального' },
      { action: 'Отклонено', actor: 'Руководитель Дмитриев К.', actorRole: 'Руководитель маркетинга', at: '03.02.2026 11:00', note: 'Минимум ₽10 000 для данного формата' },
      { action: 'Партнёр уведомлён', actor: 'Система', actorRole: 'Нотификации', at: '03.02.2026 11:01' },
    ],
  },
  {
    id: 'PROMO-006', partnerId: 'merch-001', partnerName: 'Кафе «Уют»', partnerType: 'merchant', partnerCity: 'Москва',
    productName: 'Новогоднее меню 2026', productImage: '🎄', category: 'Еда и рестораны',
    type: 'homepage_block', status: 'expired', budget: 30000, dailyBudget: 2000, duration: 15,
    startDate: '25.01.2026', endDate: '09.02.2026',
    targeting: ['Вся Москва', 'Праздничные заказы'],
    expectedReach: 200000, expectedCtr: 2.9,
    description: 'Блок на главной странице в период новогодних акций.',
    createdByName: 'Менеджер Яковлев А.', createdByRole: 'Менеджер партнёра',
    createdAt: '20.01.2026 10:00',
    approvedByName: 'Руководитель Дмитриев К.', approvedByRole: 'Руководитель маркетинга',
    approvedAt: '22.01.2026 09:00',
    auditTrail: [
      { action: 'Заявка подана', actor: 'Менеджер Яковлев А.', actorRole: 'Менеджер партнёра', at: '20.01.2026 10:00' },
      { action: 'Одобрено', actor: 'Руководитель Дмитриев К.', actorRole: 'Руководитель маркетинга', at: '22.01.2026 09:00' },
      { action: 'Кампания активирована', actor: 'Система', actorRole: 'Рекламная платформа', at: '25.01.2026 00:00' },
      { action: 'Кампания завершена', actor: 'Система', actorRole: 'Рекламная платформа', at: '09.02.2026 23:59' },
    ],
    impressions: 198000, clicks: 5742, conversions: 1210, spent: 30000,
  },
];

// ─── Config ───────────────────────────────────────────────────────────────────

const fmt = (n: number) => `₽${n.toLocaleString('ru-RU')}`;
const fmtK = (n: number) => n >= 1000 ? `${(n/1000).toFixed(1)}K` : String(n);

const STATUS_CFG: Record<PromoStatus, { label: string; bg: string; color: string; border: string; icon: React.ElementType }> = {
  pending:      { label: 'Ожидает',      bg: 'bg-yellow-50',  color: 'text-yellow-800', border: 'border-yellow-300', icon: Clock },
  under_review: { label: 'На проверке',  bg: 'bg-blue-50',    color: 'text-blue-800',   border: 'border-blue-300',   icon: RefreshCw },
  approved:     { label: 'Одобрено',     bg: 'bg-indigo-50',  color: 'text-indigo-800', border: 'border-indigo-300', icon: CheckCircle2 },
  active:       { label: 'Активно',      bg: 'bg-green-50',   color: 'text-green-800',  border: 'border-green-300',  icon: Zap },
  paused:       { label: 'Приостановлено',bg: 'bg-gray-100',  color: 'text-gray-700',   border: 'border-gray-300',   icon: Clock },
  rejected:     { label: 'Отклонено',    bg: 'bg-red-50',     color: 'text-red-800',    border: 'border-red-300',    icon: XCircle },
  expired:      { label: 'Завершено',    bg: 'bg-gray-50',    color: 'text-gray-600',   border: 'border-gray-200',   icon: CheckCircle2 },
};

const TYPE_CFG: Record<PromoType, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  featured_listing:   { label: 'Топ листинга',   icon: Star,           color: 'text-yellow-600', bg: 'bg-yellow-50' },
  banner:             { label: 'Баннер',          icon: Image,          color: 'text-blue-600',   bg: 'bg-blue-50' },
  push_notification:  { label: 'Push-уведомление',icon: Megaphone,      color: 'text-purple-600', bg: 'bg-purple-50' },
  category_top:       { label: 'Топ категории',   icon: Target,         color: 'text-orange-600', bg: 'bg-orange-50' },
  discount_badge:     { label: 'Бейдж скидки',    icon: BadgePercent,   color: 'text-red-600',    bg: 'bg-red-50' },
  homepage_block:     { label: 'Блок на главной', icon: Layers,         color: 'text-indigo-600', bg: 'bg-indigo-50' },
};

// ─── Detail Drawer ────────────────────────────────────────────────────────────

function PromoDetailDrawer({ promo, onClose, onApprove, onReject }: {
  promo: Promotion;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const sc  = STATUS_CFG[promo.status];
  const tc  = TYPE_CFG[promo.type];
  const ScIcon = sc.icon;
  const TcIcon = tc.icon;
  const isPending = promo.status === 'pending' || promo.status === 'under_review';
  const hasStats  = promo.impressions !== undefined;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm" />
      <div className="ml-auto relative bg-white w-full max-w-[580px] h-full overflow-y-auto shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b sticky top-0 bg-white z-10 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-black text-gray-900">{promo.id}</span>
              <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${sc.bg} ${sc.color} ${sc.border}`}>
                <ScIcon className="w-3 h-3" />{sc.label}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{promo.partnerName} · {promo.category}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors shrink-0">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 divide-y divide-gray-100">
          {/* Product */}
          <div className="px-6 py-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center text-4xl shrink-0">{promo.productImage}</div>
              <div>
                <p className="font-bold text-gray-900">{promo.productName}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg ${tc.bg} ${tc.color}`}>
                    <TcIcon className="w-3.5 h-3.5" />{tc.label}
                  </span>
                  <span className="text-xs text-gray-400">{promo.category}</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">{promo.description}</p>
              </div>
            </div>
          </div>

          {/* Stats (if active/expired) */}
          {hasStats && (
            <div className="px-6 py-4">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Результаты кампании</p>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { l: 'Показов', v: fmtK(promo.impressions!), color: 'text-blue-700' },
                  { l: 'Кликов', v: fmtK(promo.clicks!), color: 'text-purple-700' },
                  { l: 'Заказов', v: fmtK(promo.conversions!), color: 'text-green-700' },
                  { l: 'Потрачено', v: fmt(promo.spent!), color: 'text-orange-700' },
                ].map((s, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-xl text-center border border-gray-100">
                    <p className="text-[10px] text-gray-400">{s.l}</p>
                    <p className={`font-black mt-0.5 ${s.color}`}>{s.v}</p>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                <span>CTR: <span className="font-bold text-gray-800">{promo.clicks && promo.impressions ? (promo.clicks/promo.impressions*100).toFixed(2) : '—'}%</span></span>
                <span>·</span>
                <span>CR: <span className="font-bold text-gray-800">{promo.conversions && promo.clicks ? (promo.conversions/promo.clicks*100).toFixed(1) : '—'}%</span></span>
                <span>·</span>
                <span>CPA: <span className="font-bold text-gray-800">{promo.conversions && promo.spent ? fmt(Math.round(promo.spent/promo.conversions)) : '—'}</span></span>
              </div>
            </div>
          )}

          {/* Budget & schedule */}
          <div className="px-6 py-4 grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Бюджет</p>
              <div className="p-3.5 bg-gray-50 border border-gray-100 rounded-xl space-y-1.5">
                <div className="flex justify-between text-xs"><span className="text-gray-500">Общий бюджет</span><span className="font-bold">{fmt(promo.budget)}</span></div>
                <div className="flex justify-between text-xs"><span className="text-gray-500">Дневной лимит</span><span className="font-bold">{fmt(promo.dailyBudget)}</span></div>
                <div className="flex justify-between text-xs"><span className="text-gray-500">Длительность</span><span className="font-bold">{promo.duration} дней</span></div>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Прогноз</p>
              <div className="p-3.5 bg-gray-50 border border-gray-100 rounded-xl space-y-1.5">
                <div className="flex justify-between text-xs"><span className="text-gray-500">Охват</span><span className="font-bold">{fmtK(promo.expectedReach)}</span></div>
                <div className="flex justify-between text-xs"><span className="text-gray-500">Ожид. CTR</span><span className="font-bold">{promo.expectedCtr}%</span></div>
                <div className="flex justify-between text-xs"><span className="text-gray-500">Период</span><span className="font-bold">{promo.startDate} – {promo.endDate}</span></div>
              </div>
            </div>
          </div>

          {/* Targeting */}
          <div className="px-6 py-4">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Таргетинг</p>
            <div className="flex flex-wrap gap-2">
              {promo.targeting.map((t, i) => (
                <span key={i} className="px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-full text-xs text-blue-700 font-medium">{t}</span>
              ))}
            </div>
          </div>

          {/* Audit Trail */}
          <div className="px-6 py-4">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <GitBranch className="w-3.5 h-3.5 text-blue-500" />История согласования
            </p>
            <div className="grid grid-cols-1 gap-2 mb-4">
              <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl bg-gray-50">
                <ClipboardList className="w-4 h-4 text-blue-600 shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400">Подал заявку</p>
                  <p className="text-xs font-bold text-gray-900">{promo.createdByName}</p>
                  <p className="text-[10px] text-gray-500">{promo.createdByRole} · {promo.createdAt}</p>
                </div>
              </div>
              {promo.reviewedByName && (
                <div className="flex items-center gap-3 p-3 border border-blue-100 rounded-xl bg-blue-50">
                  <Eye className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <p className="text-[10px] text-blue-500">Проверил</p>
                    <p className="text-xs font-bold text-blue-900">{promo.reviewedByName}</p>
                    <p className="text-[10px] text-blue-600">{promo.reviewedByRole} · {promo.reviewedAt}</p>
                  </div>
                </div>
              )}
              {promo.approvedByName && (
                <div className="flex items-center gap-3 p-3 border border-green-200 rounded-xl bg-green-50">
                  <UserCheck className="w-4 h-4 text-green-600 shrink-0" />
                  <div>
                    <p className="text-[10px] text-green-600">Одобрил</p>
                    <p className="text-xs font-bold text-green-900">{promo.approvedByName}</p>
                    <p className="text-[10px] text-green-700">{promo.approvedByRole} · {promo.approvedAt}</p>
                  </div>
                </div>
              )}
              {promo.rejectedByName && (
                <div className="flex items-center gap-3 p-3 border border-red-200 rounded-xl bg-red-50">
                  <UserX className="w-4 h-4 text-red-600 shrink-0" />
                  <div>
                    <p className="text-[10px] text-red-500">Отклонил</p>
                    <p className="text-xs font-bold text-red-900">{promo.rejectedByName}</p>
                    <p className="text-[10px] text-red-600">{promo.rejectedByRole} · {promo.rejectedAt}</p>
                    {promo.rejectReason && <p className="text-[11px] text-red-700 mt-1">{promo.rejectReason}</p>}
                  </div>
                </div>
              )}
            </div>
            {/* Full timeline */}
            <div className="border border-gray-100 rounded-xl p-4">
              <div className="relative">
                <div className="absolute left-3.5 top-0 bottom-0 w-px bg-gray-200" />
                <div className="space-y-3">
                  {promo.auditTrail.map((entry, i) => (
                    <div key={i} className="relative flex gap-3">
                      <div className={`relative z-10 w-7 h-7 rounded-full border-2 border-white shadow-sm flex items-center justify-center shrink-0 ${i === promo.auditTrail.length - 1 ? 'bg-blue-600' : 'bg-white border-gray-300'}`}>
                        <div className={`w-2 h-2 rounded-full ${i === promo.auditTrail.length - 1 ? 'bg-white' : 'bg-gray-400'}`} />
                      </div>
                      <div className="flex-1 pt-0.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-bold text-gray-900">{entry.action}</p>
                          <span className="text-[10px] text-gray-400 shrink-0">{entry.at}</span>
                        </div>
                        <p className="text-[11px] text-gray-600 mt-0.5">{entry.actor} · <span className="text-gray-400">{entry.actorRole}</span></p>
                        {entry.note && <p className="text-[10px] text-gray-400 italic mt-0.5">{entry.note}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          {isPending && (
            <div className="px-6 py-4">
              <p className="text-xs font-bold text-gray-700 mb-3">Требуется решение</p>
              <div className="flex gap-2">
                <button onClick={() => { onApprove(); onClose(); }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold transition-colors">
                  <CheckCircle2 className="w-4 h-4" />Одобрить
                </button>
                <button onClick={() => { onReject(); onClose(); }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-colors">
                  <XCircle className="w-4 h-4" />Отклонить
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function PromotionsPage() {
  const [promos, setPromos]             = useState<Promotion[]>(MOCK_PROMOTIONS);
  const [statusFilter, setStatusFilter] = useState<PromoStatus | 'all'>('all');
  const [typeFilter, setTypeFilter]     = useState<PromoType | 'all'>('all');
  const [search, setSearch]             = useState('');
  const [viewing, setViewing]           = useState<Promotion | null>(null);
  const [approvingId, setApprovingId]   = useState<string | null>(null);
  const [rejectingId, setRejectingId]   = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [toast, setToast]               = useState<string | null>(null);

  const showToast = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500); }, []);

  const summary = useMemo(() => ({
    pending:  promos.filter(p => p.status === 'pending' || p.status === 'under_review').length,
    active:   promos.filter(p => p.status === 'active').length,
    approved: promos.filter(p => p.status === 'approved').length,
    rejected: promos.filter(p => p.status === 'rejected').length,
    budgetActive: promos.filter(p => p.status === 'active').reduce((s,p) => s + p.budget, 0),
    budgetPending: promos.filter(p => p.status === 'pending' || p.status === 'under_review').reduce((s,p) => s + p.budget, 0),
    totalImpressions: promos.reduce((s,p) => s + (p.impressions ?? 0), 0),
  }), [promos]);

  const filtered = useMemo(() => {
    let list = promos;
    if (statusFilter !== 'all') {
      if (statusFilter === 'pending') list = list.filter(p => p.status === 'pending' || p.status === 'under_review');
      else list = list.filter(p => p.status === statusFilter);
    }
    if (typeFilter !== 'all') list = list.filter(p => p.type === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.id.toLowerCase().includes(q) || p.partnerName.toLowerCase().includes(q) || p.productName.toLowerCase().includes(q));
    }
    return list;
  }, [promos, statusFilter, typeFilter, search]);

  const doApprove = (id: string) => {
    const now = new Date().toLocaleString('ru-RU', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
    setPromos(prev => prev.map(p => p.id === id ? {
      ...p,
      status: 'approved' as PromoStatus,
      approvedByName: 'Администратор Системы',
      approvedByRole: 'Руководитель маркетинга',
      approvedAt: now,
      auditTrail: [...p.auditTrail, { action: 'Одобрено', actor: 'Администратор Системы', actorRole: 'Руководитель маркетинга', at: now }],
    } : p));
    showToast('✅ Продвижение одобрено. Партнёр получит уведомление.');
  };

  const doReject = (id: string, reason: string) => {
    const now = new Date().toLocaleString('ru-RU', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
    setPromos(prev => prev.map(p => p.id === id ? {
      ...p,
      status: 'rejected' as PromoStatus,
      rejectedByName: 'Администратор Системы',
      rejectedByRole: 'Руководитель маркетинга',
      rejectedAt: now,
      rejectReason: reason,
      auditTrail: [...p.auditTrail, { action: 'Отклонено', actor: 'Администратор Системы', actorRole: 'Руководитель маркетинга', at: now, note: reason }],
    } : p));
    showToast('❌ Продвижение отклонено. Партнёр получит уведомление.');
  };

  const REJECT_REASONS = [
    'Бюджет ниже минимального',
    'Содержание не соответствует гайдлайнам',
    'Дублирует активную кампанию',
    'Категория не поддерживается для данного формата',
    'Партнёр не прошёл верификацию',
    'Целевая аудитория некорректно определена',
  ];

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Продвижение товаров</h1>
          <p className="text-sm text-gray-500 mt-0.5">Управление рекламными кампаниями мерчантов и ПВЗ · Согласование и аудит</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (filtered.length === 0) { showToast('Нет кампаний для экспорта'); return; }
              const header = '"ID";"Партнёр";"Тип партнёра";"Тип акции";"Название";"Бюджет";"Статус";"Создана";"Кем создана"';
              const body = filtered.map(p => [
                p.id, p.partnerName, p.partnerType, p.type, p.title, p.budget, p.status, p.createdAt, p.createdByName,
              ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
              const csv = '﻿' + header + '\n' + body;
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = `promotions-${new Date().toISOString().slice(0,10)}.csv`;
              document.body.appendChild(a); a.click(); a.remove();
              URL.revokeObjectURL(url);
              showToast(`Скачан CSV: ${filtered.length} кампаний`);
            }}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 rounded-xl text-xs font-medium transition-colors">
            <Download className="w-3.5 h-3.5" />Экспорт
          </button>
          <button
            onClick={() => {
              const title = window.prompt('Название кампании');
              if (!title || !title.trim()) return;
              const budgetStr = window.prompt('Бюджет (₽)', '50000');
              const budget = parseInt(budgetStr ?? '0', 10);
              if (!Number.isFinite(budget) || budget <= 0) { showToast('❌ Некорректный бюджет'); return; }
              const now = new Date().toLocaleString('ru-RU', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
              setPromos(prev => [{
                id: `PROMO-${Date.now()}`,
                partnerName: 'Текущий пользователь', partnerType: 'merchant', partnerId: 'me',
                type: 'banner', title: title.trim(), description: '',
                productName: title.trim(), budget,
                status: 'pending',
                createdByName: 'Администратор Системы', createdByRole: 'Руководитель маркетинга', createdAt: now,
                impressions: 0, clicks: 0, ctr: 0,
                auditTrail: [{ action: 'Заявка создана', actor: 'Администратор Системы', actorRole: 'Руководитель маркетинга', at: now }],
              } as Promotion, ...prev]);
              showToast(`Кампания «${title.trim()}» создана. Статус: На проверке`);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors">
            <Plus className="w-4 h-4" />Новая кампания
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3">
        {([
          { label: 'Ожидают одобрения',      v: summary.pending,              color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200', sub: fmt(summary.budgetPending),              fv: 'pending'   },
          { label: 'Одобрено (ожид. запуска)',v: summary.approved,             color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200', sub: 'Готовы к запуску',                      fv: 'approved'  },
          { label: 'Активных кампаний',      v: summary.active,               color: 'text-green-700',  bg: 'bg-green-50 border-green-200',   sub: fmt(summary.budgetActive),               fv: 'active'    },
          { label: 'Отклонено',              v: summary.rejected,             color: 'text-red-700',    bg: 'bg-red-50 border-red-200',       sub: 'Требуют доработки',                     fv: 'rejected'  },
          { label: 'Всего кампаний',         v: promos.length,                color: 'text-gray-800',   bg: 'bg-white border-gray-200',       sub: 'За период',                             fv: 'all'       },
          { label: 'Показов всего',          v: fmtK(summary.totalImpressions),color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200',     sub: 'По активным и завершённым',             fv: null as null},
          { label: 'Активный бюджет',        v: fmt(summary.budgetActive),    color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', sub: 'Текущий расход',                        fv: null as null},
        ]).map((k, i) => {
          const isActive = k.fv !== null && statusFilter === k.fv;
          return (
            <button
              key={i}
              onClick={() => { if (k.fv === null) return; setStatusFilter(statusFilter === k.fv ? 'all' : k.fv as any); }}
              className={`border rounded-2xl p-4 text-left transition-all ${k.bg} ${k.fv !== null ? 'cursor-pointer hover:shadow-md active:scale-[0.97]' : 'cursor-default'} ${isActive ? 'ring-2 ring-offset-1 shadow-sm' : ''}`}
            >
              <p className="text-[10px] text-gray-500 leading-tight">{k.label}</p>
              <p className={`text-xl font-black mt-1 ${k.color}`}>{k.v}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{k.sub}</p>
            </button>
          );
        })}
      </div>

      {/* Alert */}
      {summary.pending > 0 && (
        <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-300 rounded-2xl">
          <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center shrink-0">
            <Megaphone className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-yellow-900">{summary.pending} кампаний ожидают вашего одобрения</p>
            <p className="text-xs text-yellow-700 mt-0.5">Запрошенный бюджет: <span className="font-bold">{fmt(summary.budgetPending)}</span> · SLA: рассмотреть в течение 24 ч.</p>
          </div>
          <button onClick={() => setStatusFilter('pending')}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-xl text-xs font-bold transition-colors shrink-0">
            Рассмотреть
          </button>
        </div>
      )}

      {/* Main list */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        {/* Filters */}
        <div className="px-4 py-3.5 border-b border-gray-100 bg-gray-50 flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Кампания, партнёр, товар..."
              className="pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-52" />
          </div>
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1">
            {([
              { id: 'all' as const, label: 'Все' },
              { id: 'pending' as const, label: '⏳ Ожидает' },
              { id: 'approved' as const, label: '✓ Одобрено' },
              { id: 'active' as const, label: '⚡ Активно' },
              { id: 'rejected' as const, label: '✗ Отклонено' },
              { id: 'expired' as const, label: 'Завершено' },
            ]).map(f => (
              <button key={f.id} onClick={() => setStatusFilter(f.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${statusFilter === f.id ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-800'}`}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="ml-auto text-xs text-gray-400">{filtered.length} кампаний</div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide">Кампания / Товар</th>
                <th className="px-3 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide">Партнёр</th>
                <th className="px-3 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide hidden md:table-cell">Формат</th>
                <th className="px-3 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wide">Бюджет</th>
                <th className="px-3 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Период</th>
                <th className="px-3 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide hidden xl:table-cell">
                  <span className="flex items-center gap-1"><ClipboardList className="w-3 h-3" />Подал заявку</span>
                </th>
                <th className="px-3 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide hidden xl:table-cell">
                  <span className="flex items-center gap-1"><UserCheck className="w-3 h-3" />Одобрил / Отклонил</span>
                </th>
                <th className="px-3 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide">Статус</th>
                <th className="px-3 py-3 pr-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide">Действия</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <Megaphone className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                    <p className="text-sm text-gray-400">Нет кампаний по фильтру</p>
                  </td>
                </tr>
              ) : filtered.map(p => {
                const sc  = STATUS_CFG[p.status];
                const tc  = TYPE_CFG[p.type];
                const ScIcon = sc.icon;
                const TcIcon = tc.icon;
                const isPending = p.status === 'pending' || p.status === 'under_review';
                const hasStats = p.impressions !== undefined;

                return (
                  <tr key={p.id} className={`border-b border-gray-100 hover:bg-gray-50/80 transition-colors ${isPending ? 'border-l-2 border-l-yellow-400' : ''}`}>
                    <td className="px-4 py-3.5">
                      <button onClick={() => setViewing(p)} className="text-left group/id">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{p.productImage}</span>
                          <div>
                            <p className="text-xs font-bold text-gray-900 group-hover/id:text-blue-700 transition-colors">{p.productName}</p>
                            <p className="font-mono text-[10px] text-gray-400">{p.id}</p>
                          </div>
                        </div>
                      </button>
                    </td>
                    <td className="px-3 py-3.5">
                      <p className="text-xs font-semibold text-gray-800">{p.partnerName}</p>
                      <p className="text-[10px] text-gray-400">{p.partnerCity}</p>
                    </td>
                    <td className="px-3 py-3.5 hidden md:table-cell">
                      <span className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-lg w-fit ${tc.bg} ${tc.color}`}>
                        <TcIcon className="w-3.5 h-3.5" />{tc.label}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-right">
                      <p className="text-sm font-black text-gray-900">{fmt(p.budget)}</p>
                      <p className="text-[10px] text-gray-400">{fmt(p.dailyBudget)}/день</p>
                    </td>
                    <td className="px-3 py-3.5 hidden lg:table-cell">
                      <p className="text-xs text-gray-700">{p.startDate}</p>
                      <p className="text-[10px] text-gray-400">→ {p.endDate}</p>
                    </td>
                    {/* WHO SUBMITTED */}
                    <td className="px-3 py-3.5 hidden xl:table-cell">
                      <div className="flex items-start gap-1.5">
                        <ClipboardList className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-gray-800">{p.createdByName}</p>
                          <p className="text-[10px] text-gray-400">{p.createdByRole}</p>
                          <p className="text-[10px] text-gray-300">{p.createdAt}</p>
                        </div>
                      </div>
                    </td>
                    {/* WHO APPROVED/REJECTED */}
                    <td className="px-3 py-3.5 hidden xl:table-cell">
                      {p.approvedByName ? (
                        <div className="flex items-start gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-green-800">{p.approvedByName}</p>
                            <p className="text-[10px] text-green-600">{p.approvedByRole}</p>
                            <p className="text-[10px] text-gray-300">{p.approvedAt}</p>
                          </div>
                        </div>
                      ) : p.rejectedByName ? (
                        <div className="flex items-start gap-1.5">
                          <UserX className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-red-700">{p.rejectedByName}</p>
                            <p className="text-[10px] text-red-400">{p.rejectedByRole}</p>
                            <p className="text-[10px] text-gray-300">{p.rejectedAt}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-gray-300" />
                          <span className="text-[11px] text-gray-400 italic">Ожидает</span>
                        </div>
                      )}
                    </td>
                    {/* Status */}
                    <td className="px-3 py-3.5">
                      <span className={`flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1.5 rounded-xl border w-fit ${sc.bg} ${sc.color} ${sc.border}`}>
                        <ScIcon className="w-3 h-3" />{sc.label}
                      </span>
                      {hasStats && (
                        <p className="text-[10px] text-gray-400 mt-1">{fmtK(p.impressions!)} показов</p>
                      )}
                    </td>
                    {/* Actions */}
                    <td className="px-3 py-3.5 pr-4">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setViewing(p)}
                          className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors" title="Подробнее">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {isPending && (
                          <>
                            <button onClick={() => doApprove(p.id)}
                              className="p-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors" title="Одобрить">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => { setRejectReason(''); setRejectingId(p.id); }}
                              className="p-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors" title="Отклонить">
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        {p.status === 'active' && (
                          <button onClick={() => {
                            const now = new Date().toLocaleString('ru-RU', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
                            setPromos(prev => prev.map(x => x.id === p.id ? { ...x, status: 'paused' as PromoStatus, auditTrail: [...x.auditTrail, { action: 'Приостановлено', actor: 'Администратор Системы', actorRole: 'Руководитель маркетинга', at: now }] } : x));
                            showToast(`Кампания «${p.title}» приостановлена`);
                          }}
                            className="p-1.5 bg-orange-100 hover:bg-orange-200 text-orange-600 rounded-lg transition-colors" title="Приостановить">
                            <Clock className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-500 flex-wrap gap-2">
          <span>{filtered.length} кампаний · Бюджет: <span className="font-bold text-gray-800">{fmt(filtered.reduce((s,p)=>s+p.budget,0))}</span></span>
          <span>Активный охват: <span className="font-bold text-blue-700">{fmtK(filtered.filter(p=>p.status==='active').reduce((s,p)=>s+(p.impressions??0),0))} показов</span></span>
        </div>
      </div>

      {/* Reject Modal */}
      {rejectingId && (
        ReactDOM.createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setRejectingId(null)}>
            <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="px-6 py-5 border-b flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center"><XCircle className="w-5 h-5 text-red-600" /></div>
                <div>
                  <h2 className="font-bold text-gray-900">Отклонить продвижение</h2>
                  <p className="text-xs text-gray-500">Выберите причину для партнёра</p>
                </div>
              </div>
              <div className="px-6 py-5 space-y-2">
                {REJECT_REASONS.map(r => (
                  <button key={r} onClick={() => setRejectReason(r)}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 border rounded-xl text-xs text-left transition-all ${rejectReason === r ? 'border-red-400 bg-red-50 text-red-800' : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}>
                    <div className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 ${rejectReason === r ? 'border-red-500 bg-red-500' : 'border-gray-300'}`} />
                    {r}
                  </button>
                ))}
              </div>
              <div className="px-6 py-4 bg-gray-50 border-t flex gap-3">
                <button onClick={() => setRejectingId(null)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-white transition-colors">Отмена</button>
                <button disabled={!rejectReason} onClick={() => { doReject(rejectingId, rejectReason); setRejectingId(null); }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-colors">
                  <XCircle className="w-4 h-4" />Отклонить
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      )}

      {/* Drawer */}
      {viewing && (
        <PromoDetailDrawer
          promo={viewing}
          onClose={() => setViewing(null)}
          onApprove={() => { doApprove(viewing.id); setViewing(null); }}
          onReject={() => { setViewing(null); setRejectReason(''); setRejectingId(viewing.id); }}
        />
      )}

      {/* Toast */}
      {toast && ReactDOM.createPortal(
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] px-5 py-3 bg-gray-900 text-white text-sm font-medium rounded-2xl shadow-2xl">
          {toast}
        </div>,
        document.body
      )}
    </div>
  );
}
