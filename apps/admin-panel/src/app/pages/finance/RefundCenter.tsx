import { useState, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { toast } from 'sonner';
import {
  RotateCcw, Search, CheckCircle2, XCircle, Clock, AlertTriangle,
  RefreshCw, Store, Bike, Building2, X, Check, Eye, Download,
  FileText, Info, User, Shield, UserCheck, UserX, ClipboardList,
  GitBranch, BadgeCheck, Phone, Image as ImageIcon,
} from 'lucide-react';
import { ProductImageViewer, type ProductImage } from '../../components/ui/ProductImageViewer';

type RefundStatus = 'pending' | 'under_review' | 'approved' | 'processing' | 'completed' | 'rejected' | 'disputed';
type RefundReason = 'wrong_item' | 'damaged' | 'not_delivered' | 'quality' | 'other' | 'cancel_by_client' | 'late_delivery' | 'missing_items';
type RefundType   = 'full' | 'partial' | 'delivery_only';
type PartnerType  = 'courier' | 'merchant' | 'pvz';

interface AuditEntry { action: string; actor: string; actorRole: string; at: string; note?: string; }

interface Refund {
  id: string; orderId: string; orderDate: string;
  customer: string; customerPhone: string;
  partnerName: string; partnerType: PartnerType; partnerId: string;
  reason: RefundReason; type: RefundType;
  createdByName: string; createdByRole: string; createdAt: string;
  reviewedByName?: string; reviewedByRole?: string; reviewedAt?: string;
  approvedByName?: string; approvedByRole?: string; approvedAt?: string;
  rejectedByName?: string; rejectedByRole?: string; rejectedAt?: string;
  rejectReason?: string;
  amount: number; orderAmount: number; deliveryAmount: number;
  status: RefundStatus; note?: string;
  productName?: string; productEmoji?: string;
  barcode?: string; sku?: string;
  hasProductImages: boolean; hasDamagePhoto: boolean;
  deductFromPartner: boolean;
  auditTrail: AuditEntry[];
}

const fmt = (n: number) => `₽${n.toLocaleString('ru-RU')}`;

const REFUND_REASONS: Record<RefundReason, { label: string; icon: string }> = {
  wrong_item: { label: 'Не тот товар', icon: '📦' },
  damaged: { label: 'Повреждён при доставке', icon: '💥' },
  not_delivered: { label: 'Не доставлен', icon: '🚫' },
  quality: { label: 'Ненадлежащее качество', icon: '⚠️' },
  other: { label: 'Иная причина', icon: '📝' },
  cancel_by_client: { label: 'Отмена клиентом', icon: '❌' },
  late_delivery: { label: 'Задержка доставки', icon: '⏱️' },
  missing_items: { label: 'Неполная комплектация', icon: '🔍' },
};

const STATUS_CFG: Record<RefundStatus, { label: string; bg: string; color: string; border: string; icon: React.ElementType; step: number }> = {
  pending:      { label: 'Ожидает',          bg: 'bg-yellow-50',  color: 'text-yellow-800', border: 'border-yellow-300', icon: Clock,         step: 0 },
  under_review: { label: 'На проверке',      bg: 'bg-blue-50',    color: 'text-blue-800',   border: 'border-blue-300',   icon: RefreshCw,     step: 1 },
  approved:     { label: 'Одобрен',          bg: 'bg-indigo-50',  color: 'text-indigo-800', border: 'border-indigo-300', icon: CheckCircle2,  step: 2 },
  processing:   { label: 'Переводится',      bg: 'bg-violet-50',  color: 'text-violet-800', border: 'border-violet-300', icon: RefreshCw,     step: 3 },
  completed:    { label: 'Выполнен',         bg: 'bg-green-50',   color: 'text-green-800',  border: 'border-green-300',  icon: BadgeCheck,    step: 4 },
  rejected:     { label: 'Отклонён',         bg: 'bg-red-50',     color: 'text-red-800',    border: 'border-red-300',    icon: XCircle,       step: -1 },
  disputed:     { label: 'Арбитраж',         bg: 'bg-orange-50',  color: 'text-orange-800', border: 'border-orange-300', icon: AlertTriangle, step: -1 },
};

const PT_CFG: Record<PartnerType, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  courier:  { label: 'Курьер',  icon: Bike,      color: 'text-orange-600', bg: 'bg-orange-50' },
  merchant: { label: 'Мерчант', icon: Store,     color: 'text-purple-600', bg: 'bg-purple-50' },
  pvz:      { label: 'ПВЗ',     icon: Building2, color: 'text-teal-600',   bg: 'bg-teal-50'   },
};

const TYPE_CFG: Record<RefundType, { label: string; color: string; bg: string }> = {
  full:          { label: 'Полный возврат',   color: 'text-red-700',   bg: 'bg-red-50'   },
  partial:       { label: 'Частичный',        color: 'text-amber-700', bg: 'bg-amber-50' },
  delivery_only: { label: 'Только доставка', color: 'text-blue-700',  bg: 'bg-blue-50'  },
};

function getEvidenceImages(refund: Refund): ProductImage[] {
  const e = refund.productEmoji ?? '📦';
  if (refund.reason === 'damaged') return [
    { id: '1', url: '', label: 'Фото повреждения — упаковка',   isDamage: true,  annotation: 'Мятая коробка',    emoji: e,    bg: 'bg-red-100'    },
    { id: '2', url: '', label: 'Фото повреждения — содержимое', isDamage: true,  annotation: 'Повреждён товар',  emoji: '💥', bg: 'bg-orange-100' },
    { id: '3', url: '', label: 'Общий вид',                                                                      emoji: e,    bg: 'bg-gray-100'   },
  ];
  if (refund.reason === 'wrong_item') return [
    { id: '1', url: '', label: 'Полученный товар',  annotation: 'Чужой заказ', emoji: '❓', bg: 'bg-yellow-100' },
    { id: '2', url: '', label: 'Этикетка упаковки',                             emoji: '🏷️', bg: 'bg-blue-100'   },
    { id: '3', url: '', label: 'Содержимое',                                    emoji: e,    bg: 'bg-gray-100'   },
  ];
  if (refund.reason === 'missing_items') return [
    { id: '1', url: '', label: 'Полученный заказ', emoji: e,    bg: 'bg-amber-100' },
    { id: '2', url: '', label: 'Чек / накладная',  emoji: '🧾', bg: 'bg-gray-100'  },
  ];
  if (refund.reason === 'quality') return [
    { id: '1', url: '', label: 'Дефект товара', isDamage: true, annotation: 'Дефект', emoji: e,    bg: 'bg-red-100'  },
    { id: '2', url: '', label: 'Вид товара',                                           emoji: e,    bg: 'bg-gray-100' },
    { id: '3', url: '', label: 'Документ',                                             emoji: '📄', bg: 'bg-blue-100' },
  ];
  return [{ id: '1', url: '', label: 'Фото товара', emoji: e, bg: 'bg-gray-100' }];
}

const MOCK_REFUNDS: Refund[] = [
  {
    id: 'REF-2026-001', orderId: 'ORD-2026-004712', orderDate: '06.02.2026',
    customer: 'Дмитрий Соколов', customerPhone: '+7 916 111-22-33',
    partnerName: 'Кафе «Уют»', partnerType: 'merchant', partnerId: 'merch-001',
    reason: 'wrong_item', type: 'full',
    createdByName: 'Карпова А.И.', createdByRole: 'Оператор поддержки', createdAt: '06.02.2026 15:42',
    reviewedByName: 'Смирнов Д.К.', reviewedByRole: 'Старший оператор', reviewedAt: '06.02.2026 16:10',
    amount: 2340, orderAmount: 2340, deliveryAmount: 250, status: 'pending',
    note: 'Клиент получил чужой заказ.',
    productName: 'Пицца «Маргарита»', productEmoji: '🍕',
    hasProductImages: true, hasDamagePhoto: false, deductFromPartner: true,
    auditTrail: [
      { action: 'Заявка создана', actor: 'Карпова А.И.', actorRole: 'Оператор поддержки', at: '06.02.2026 15:42', note: 'Клиент обратился через чат' },
      { action: 'Заявка проверена', actor: 'Смирнов Д.К.', actorRole: 'Старший оператор', at: '06.02.2026 16:10', note: 'Фото подтверждает несоответствие' },
      { action: 'Передана в финотдел', actor: 'Система', actorRole: 'AutoRoute', at: '06.02.2026 16:11' },
    ],
  },
  {
    id: 'REF-2026-002', orderId: 'ORD-2026-004623', orderDate: '05.02.2026',
    customer: 'Наталья Козлова', customerPhone: '+7 916 444-55-66',
    partnerName: 'Пекарня «Хлеб»', partnerType: 'merchant', partnerId: 'merch-002',
    reason: 'damaged', type: 'partial',
    createdByName: 'Клиент (приложение)', createdByRole: 'Мобильное приложение', createdAt: '05.02.2026 18:10',
    reviewedByName: 'Карпова А.И.', reviewedByRole: 'Оператор поддержки', reviewedAt: '05.02.2026 18:45',
    approvedByName: 'Петренко В.С.', approvedByRole: 'Финансовый менеджер', approvedAt: '06.02.2026 10:00',
    amount: 890, orderAmount: 1890, deliveryAmount: 200, status: 'approved',
    note: 'Торт помят при доставке.',
    productName: 'Торт «Наполеон»', productEmoji: '🎂',
    hasProductImages: true, hasDamagePhoto: true, deductFromPartner: true,
    auditTrail: [
      { action: 'Заявка создана', actor: 'Клиент (приложение)', actorRole: 'Мобильное приложение', at: '05.02.2026 18:10', note: 'Клиент загрузил фото через приложение' },
      { action: 'Проверено', actor: 'Карпова А.И.', actorRole: 'Оператор поддержки', at: '05.02.2026 18:45', note: 'Фото подтверждает повреждение' },
      { action: 'Одобрено', actor: 'Петренко В.С.', actorRole: 'Финансовый менеджер', at: '06.02.2026 10:00', note: '₽890 одобрены. Удержание с партнёра.' },
    ],
  },
  {
    id: 'REF-2026-003', orderId: 'ORD-2026-004801', orderDate: '07.02.2026',
    customer: 'Сергей Петров', customerPhone: '+7 916 777-88-99',
    partnerName: 'Алексей К.', partnerType: 'courier', partnerId: 'crr-001',
    reason: 'not_delivered', type: 'full',
    createdByName: 'Иванова Т.Р.', createdByRole: 'Оператор поддержки', createdAt: '07.02.2026 09:15',
    reviewedByName: 'Смирнов Д.К.', reviewedByRole: 'Старший оператор', reviewedAt: '07.02.2026 09:50',
    amount: 1750, orderAmount: 1500, deliveryAmount: 250, status: 'under_review',
    note: 'Курьер отметил доставленным, клиент отрицает получение.',
    productName: 'Бургер-сет', productEmoji: '🍔',
    hasProductImages: false, hasDamagePhoto: false, deductFromPartner: true,
    auditTrail: [
      { action: 'Заявка создана', actor: 'Иванова Т.Р.', actorRole: 'Оператор поддержки', at: '07.02.2026 09:15', note: 'Клиент позвонил на горячую линию' },
      { action: 'GPS-трек запрошен', actor: 'Система', actorRole: 'GPS Monitor', at: '07.02.2026 09:16' },
      { action: 'Передано на проверку', actor: 'Смирнов Д.К.', actorRole: 'Старший оператор', at: '07.02.2026 09:50', note: 'Анализ GPS-трека' },
    ],
  },
  {
    id: 'REF-2026-004', orderId: 'ORD-2026-004655', orderDate: '05.02.2026',
    customer: 'Александра Морозова', customerPhone: '+7 926 000-11-22',
    partnerName: 'TechStore MSK', partnerType: 'merchant', partnerId: 'merch-006',
    reason: 'quality', type: 'full',
    createdByName: 'Клиент (приложение)', createdByRole: 'Мобильное приложение', createdAt: '06.02.2026 11:20',
    reviewedByName: 'Иванова Т.Р.', reviewedByRole: 'Оператор поддержки', reviewedAt: '06.02.2026 12:00',
    approvedByName: 'Петренко В.С.', approvedByRole: 'Финансовый менеджер', approvedAt: '07.02.2026 09:00',
    amount: 8900, orderAmount: 8900, deliveryAmount: 300, status: 'processing',
    note: 'Наушники пришли без документов, одна чашка не работает.',
    productName: 'Наушники Sony WH-1000XM5', productEmoji: '🎧',
    barcode: '4905524964882', sku: 'SON-WH1000-XM5-BK',
    hasProductImages: true, hasDamagePhoto: true, deductFromPartner: false,
    auditTrail: [
      { action: 'Заявка создана', actor: 'Клиент (приложение)', actorRole: 'Мобильное приложение', at: '06.02.2026 11:20' },
      { action: 'Запрошен комментарий партнёра', actor: 'Иванова Т.Р.', actorRole: 'Оператор поддержки', at: '06.02.2026 12:00' },
      { action: 'Партнёр подтвердил брак', actor: 'TechStore MSK', actorRole: 'Партнёр', at: '06.02.2026 16:30' },
      { action: 'Одобрено', actor: 'Петренко В.С.', actorRole: 'Финансовый менеджер', at: '07.02.2026 09:00' },
      { action: 'Перевод инициирован', actor: 'Система', actorRole: 'Платёжный шлюз', at: '07.02.2026 09:01' },
    ],
  },
  {
    id: 'REF-2026-005', orderId: 'ORD-2026-004590', orderDate: '04.02.2026',
    customer: 'Иван Тихонов', customerPhone: '+7 916 999-00-11',
    partnerName: 'FreshMarket', partnerType: 'merchant', partnerId: 'merch-008',
    reason: 'missing_items', type: 'partial',
    createdByName: 'К��иент (приложение)', createdByRole: 'Мобильное приложение', createdAt: '04.02.2026 20:30',
    reviewedByName: 'Карпова А.И.', reviewedByRole: 'Оператор поддержки', reviewedAt: '04.02.2026 21:00',
    approvedByName: 'Луценко М.В.', approvedByRole: 'Финансовый менеджер', approvedAt: '05.02.2026 09:00',
    amount: 450, orderAmount: 2100, deliveryAmount: 180, status: 'completed',
    productName: 'Набор продуктов', productEmoji: '🥦',
    barcode: '4600521006498', sku: 'FM-SET-VEG-01',
    hasProductImages: true, hasDamagePhoto: false, deductFromPartner: true,
    auditTrail: [
      { action: 'Заявка создана', actor: 'Клиент (приложение)', actorRole: 'Мобильное приложение', at: '04.02.2026 20:30', note: 'Отсутствовал соус и хлеб' },
      { action: 'Проверено', actor: 'Карпова А.И.', actorRole: 'Оператор поддержки', at: '04.02.2026 21:00' },
      { action: 'Одобрено', actor: 'Луценко М.В.', actorRole: 'Финансовый менеджер', at: '05.02.2026 09:00', note: '₽450 одобрены. Удержание с FreshMarket.' },
      { action: 'Средства зачислены', actor: 'Система', actorRole: 'Платёжный шлюз', at: '05.02.2026 09:05' },
    ],
  },
  {
    id: 'REF-2026-006', orderId: 'ORD-2026-004480', orderDate: '02.02.2026',
    customer: 'Олег Романов', customerPhone: '+7 916 222-33-44',
    partnerName: 'Кафе «Уют»', partnerType: 'merchant', partnerId: 'merch-001',
    reason: 'late_delivery', type: 'delivery_only',
    createdByName: 'Смирнов Д.К.', createdByRole: 'Старший оператор', createdAt: '02.02.2026 21:15',
    amount: 280, orderAmount: 1800, deliveryAmount: 280, status: 'disputed',
    note: 'Доставка опоздала на 52 мин. Партнёр оспаривает.',
    hasProductImages: false, hasDamagePhoto: false, deductFromPartner: false,
    auditTrail: [
      { action: 'Заявка создана', actor: 'Смирнов Д.К.', actorRole: 'Старший оператор', at: '02.02.2026 21:15' },
      { action: 'Партнёр оспорил', actor: 'Кафе «Уют»', actorRole: 'Партнёр', at: '03.02.2026 09:00' },
      { action: 'Открыт арбитраж', actor: 'Луценко М.В.', actorRole: 'Финансовый менеджер', at: '03.02.2026 10:00' },
    ],
  },
  {
    id: 'REF-2026-007', orderId: 'ORD-2026-004410', orderDate: '01.02.2026',
    customer: 'Елена Жукова', customerPhone: '+7 926 555-66-77',
    partnerName: 'Михаил Д.', partnerType: 'courier', partnerId: 'crr-002',
    reason: 'damaged', type: 'partial',
    createdByName: 'Администратор', createdByRole: 'Суперадмин', createdAt: '01.02.2026 16:00',
    approvedByName: 'Петренко В.С.', approvedByRole: 'Финансовый менеджер', approvedAt: '02.02.2026 10:00',
    amount: 640, orderAmount: 2300, deliveryAmount: 220, status: 'completed',
    productName: 'Торт «Прага»', productEmoji: '🍰',
    hasProductImages: true, hasDamagePhoto: true, deductFromPartner: true,
    auditTrail: [
      { action: 'Заявка создана (admin)', actor: 'Администратор', actorRole: 'Суперадмин', at: '01.02.2026 16:00' },
      { action: 'Одобрено', actor: 'Петренко В.С.', actorRole: 'Финансовый менеджер', at: '02.02.2026 10:00', note: '₽640 удержано с курьера' },
      { action: 'Средства зачислены', actor: 'Система', actorRole: 'Платёжный шлюз', at: '02.02.2026 10:02' },
    ],
  },
];

// ─── Audit Timeline ───────────────────────────────────────────────────────────
function AuditTimeline({ entries }: { entries: AuditEntry[] }) {
  const rc: Record<string, string> = {
    'Оператор поддержки': 'bg-blue-100 text-blue-700', 'Старший оператор': 'bg-indigo-100 text-indigo-700',
    'Финансовый менеджер': 'bg-green-100 text-green-700', 'Суперадмин': 'bg-red-100 text-red-700',
    'Мобильное приложение': 'bg-gray-100 text-gray-600', 'Платёжный шлюз': 'bg-purple-100 text-purple-700',
    'GPS Monitor': 'bg-teal-100 text-teal-700', 'Партнёр': 'bg-orange-100 text-orange-700',
    'AutoRoute': 'bg-gray-100 text-gray-600',
  };
  return (
    <div className="relative">
      <div className="absolute left-3.5 top-0 bottom-0 w-px bg-gray-200" />
      <div className="space-y-0">
        {entries.map((e, i) => (
          <div key={i} className="relative flex gap-3 pb-4 last:pb-0">
            <div className={`relative z-10 w-7 h-7 rounded-full border-2 border-white shadow-sm flex items-center justify-center shrink-0 mt-0.5 ${i === entries.length - 1 ? 'bg-blue-600' : 'bg-white border-gray-300'}`}>
              <div className={`w-2 h-2 rounded-full ${i === entries.length - 1 ? 'bg-white' : 'bg-gray-400'}`} />
            </div>
            <div className="flex-1 pt-0.5">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <p className="text-xs font-bold text-gray-900">{e.action}</p>
                <span className="text-[10px] text-gray-400 shrink-0">{e.at}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-700">{e.actor}</span>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${rc[e.actorRole] ?? 'bg-gray-100 text-gray-600'}`}>{e.actorRole}</span>
              </div>
              {e.note && <p className="text-[11px] text-gray-500 mt-1 italic">{e.note}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────
function ConfirmModal({ title, description, icon: Icon, iconBg, confirmLabel, confirmBg, onConfirm, onClose, children }: {
  title: string; description: string; icon: React.ElementType; iconBg: string;
  confirmLabel: string; confirmBg: string; onConfirm: () => void; onClose: () => void; children?: React.ReactNode;
}) {
  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b flex items-center gap-3">
          <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center shrink-0`}><Icon className="w-5 h-5" /></div>
          <div><h2 className="font-bold text-gray-900">{title}</h2><p className="text-xs text-gray-500 mt-0.5">{description}</p></div>
        </div>
        <div className="px-6 py-5 space-y-4">{children}</div>
        <div className="px-6 py-4 bg-gray-50 border-t flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-white">Отмена</button>
          <button onClick={() => { onConfirm(); onClose(); }} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 ${confirmBg} text-white rounded-xl text-sm font-bold transition-colors`}>
            <Icon className="w-4 h-4" />{confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────
function RefundDetailDrawer({ refund, onClose, onApprove, onReject }: {
  refund: Refund; onClose: () => void;
  onApprove: (r: Refund) => void; onReject: (r: Refund) => void;
}) {
  const [tab, setTab] = useState<'info' | 'images' | 'audit'>('info');
  const sc  = STATUS_CFG[refund.status];
  const ptc = PT_CFG[refund.partnerType];
  const tc  = TYPE_CFG[refund.type];
  const ScIcon = sc.icon;
  const pct = Math.round(refund.amount / refund.orderAmount * 100);
  const isPending = refund.status === 'pending' || refund.status === 'under_review';
  const evidenceImages = getEvidenceImages(refund);
  const steps = [{ label: 'Заявка', step: 0 }, { label: 'Проверка', step: 1 }, { label: 'Одобрение', step: 2 }, { label: 'Перевод', step: 3 }, { label: 'Выполнен', step: 4 }];

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm" />
      <div className="ml-auto relative bg-white w-full max-w-[600px] h-full flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b bg-white sticky top-0 z-10 flex items-center gap-3 shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-black text-gray-900">{refund.id}</span>
              <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${sc.bg} ${sc.color} ${sc.border}`}>
                <ScIcon className="w-3 h-3" />{sc.label}
              </span>
              {refund.hasDamagePhoto && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-red-600 rounded-full text-[10px] font-bold text-white">
                  <AlertTriangle className="w-2.5 h-2.5" />Фото повреждения
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5 font-mono">{refund.orderId} · {refund.orderDate}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl shrink-0"><X className="w-4 h-4 text-gray-500" /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-white shrink-0">
          {[{ id: 'info' as const, label: 'Информация' }, { id: 'images' as const, label: `📷 Фото${refund.hasProductImages ? ` (${evidenceImages.length})` : ''}` }, { id: 'audit' as const, label: '📋 Журнал' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* ── INFO ── */}
          {tab === 'info' && (
            <div className="divide-y divide-gray-100">
              {/* Progress */}
              {sc.step >= 0 && (
                <div className="px-6 py-4">
                  <div className="flex items-center">
                    {steps.map((s, i) => {
                      const done = sc.step > s.step, active = sc.step === s.step;
                      return (
                        <div key={i} className="flex items-center flex-1 last:flex-none">
                          <div className="flex flex-col items-center gap-1">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${done ? 'bg-green-600 border-green-600 text-white' : active ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 text-gray-400'}`}>
                              {done ? '✓' : s.step + 1}
                            </div>
                            <span className={`text-[9px] font-medium whitespace-nowrap ${active ? 'text-blue-700' : done ? 'text-green-700' : 'text-gray-400'}`}>{s.label}</span>
                          </div>
                          {i < steps.length - 1 && <div className={`flex-1 h-0.5 mx-1 mb-3.5 ${done ? 'bg-green-500' : 'bg-gray-200'}`} />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Product */}
              {refund.productName && (
                <div className="px-6 py-4">
                  <div className="flex items-center gap-3 p-3.5 border border-gray-200 rounded-xl">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-2xl shrink-0">{refund.productEmoji ?? '📦'}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900">{refund.productName}</p>
                      {refund.sku && <p className="text-xs text-gray-500 font-mono mt-0.5">SKU: {refund.sku}</p>}
                      {refund.barcode && <p className="text-xs text-gray-400 font-mono">Баркод: {refund.barcode}</p>}
                    </div>
                    {refund.hasProductImages && (
                      <button onClick={() => setTab('images')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-xl text-xs font-semibold text-blue-700 hover:bg-blue-100 shrink-0">
                        <ImageIcon className="w-3.5 h-3.5" />Фото
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Amounts */}
              <div className="px-6 py-4 grid grid-cols-3 gap-3">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-[10px] text-gray-400">Сумма заказа</p>
                  <p className="font-bold text-gray-900 mt-0.5">{fmt(refund.orderAmount)}</p>
                </div>
                <div className="p-3 bg-red-50 rounded-xl border border-red-200">
                  <p className="text-[10px] text-red-500">Возврат</p>
                  <p className="font-black text-red-700 mt-0.5">{fmt(refund.amount)}</p>
                  <p className="text-[10px] text-red-400 mt-0.5">{pct}% заказа</p>
                </div>
                <div className={`p-3 rounded-xl border ${refund.deductFromPartner ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}`}>
                  <p className={`text-[10px] ${refund.deductFromPartner ? 'text-orange-500' : 'text-green-500'}`}>{refund.deductFromPartner ? 'Удержание' : 'За счёт платформы'}</p>
                  <p className={`font-bold mt-0.5 ${refund.deductFromPartner ? 'text-orange-700' : 'text-green-700'}`}>{refund.deductFromPartner ? fmt(refund.amount) : '₽0'}</p>
                </div>
              </div>

              {/* Reason */}
              <div className="px-6 py-4">
                <div className="flex items-start gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
                  <span className="text-2xl shrink-0">{REFUND_REASONS[refund.reason].icon}</span>
                  <div>
                    <p className="text-sm font-bold text-amber-900">{REFUND_REASONS[refund.reason].label}</p>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${TYPE_CFG[refund.type].bg} ${TYPE_CFG[refund.type].color} inline-block mt-1`}>{TYPE_CFG[refund.type].label}</span>
                    {refund.note && <p className="text-[11px] text-amber-700 mt-1.5 italic">{refund.note}</p>}
                  </div>
                </div>
              </div>

              {/* Chain */}
              <div className="px-6 py-4 space-y-2">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2 mb-3"><GitBranch className="w-3.5 h-3.5 text-blue-500" />Цепочка согласования</p>
                {[
                  { l: 'Оформил', n: refund.createdByName, r: refund.createdByRole, t: refund.createdAt, Icon: ClipboardList, bg: 'bg-gray-50 border-gray-200', tc: 'text-gray-900' },
                  refund.reviewedByName ? { l: 'Проверил', n: refund.reviewedByName!, r: refund.reviewedByRole!, t: refund.reviewedAt!, Icon: Eye, bg: 'bg-blue-50 border-blue-100', tc: 'text-blue-900' } : null,
                  refund.approvedByName ? { l: 'Одобрил', n: refund.approvedByName!, r: refund.approvedByRole!, t: refund.approvedAt!, Icon: UserCheck, bg: 'bg-green-50 border-green-200', tc: 'text-green-900' } : null,
                  refund.rejectedByName ? { l: 'Отклонил', n: refund.rejectedByName!, r: refund.rejectedByRole!, t: refund.rejectedAt!, Icon: UserX, bg: 'bg-red-50 border-red-200', tc: 'text-red-900' } : null,
                ].filter(Boolean).map((row, i) => {
                  const { l, n, r: role, t, Icon: I, bg, tc: textC } = row!;
                  return (
                    <div key={i} className={`flex items-center gap-3 p-3 border rounded-xl ${bg}`}>
                      <I className="w-4 h-4 text-gray-500 shrink-0" />
                      <div><p className="text-[10px] text-gray-400">{l}</p><p className={`text-xs font-bold ${textC}`}>{n}</p><p className="text-[10px] text-gray-400">{role} · {t}</p></div>
                    </div>
                  );
                })}
                {refund.rejectedByName && refund.rejectReason && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl"><p className="text-[10px] font-bold text-red-700 mb-1">Причина отклонения</p><p className="text-xs text-red-600">{refund.rejectReason}</p></div>
                )}
              </div>

              {/* Parties */}
              <div className="px-6 py-4 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Клиент</p>
                  <div className="p-3.5 border border-gray-100 rounded-xl">
                    <p className="text-xs font-bold text-gray-900">{refund.customer}</p>
                    <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-1"><Phone className="w-3 h-3" />{refund.customerPhone}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Партнёр</p>
                  <div className="p-3.5 border border-gray-100 rounded-xl">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-gray-900">{refund.partnerName}</p>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${ptc.bg} ${ptc.color} font-bold`}>{ptc.label}</span>
                    </div>
                    <p className="text-[11px] text-gray-400 font-mono mt-1">{refund.partnerId}</p>
                  </div>
                </div>
              </div>

              {isPending && (
                <div className="px-6 py-4">
                  <p className="text-xs font-bold text-gray-700 mb-3">Требуется решение финансового отдела</p>
                  <div className="flex gap-2">
                    <button onClick={() => { onApprove(refund); onClose(); }} className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold transition-colors">
                      <CheckCircle2 className="w-4 h-4" />Одобрить
                    </button>
                    <button onClick={() => { onReject(refund); onClose(); }} className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-colors">
                      <XCircle className="w-4 h-4" />Отклонить
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── IMAGES ── */}
          {tab === 'images' && (
            <div className="px-6 py-5">
              {refund.hasProductImages ? (
                <ProductImageViewer
                  images={evidenceImages}
                  productName={refund.productName ?? 'Товар'}
                  barcode={refund.barcode}
                  sku={refund.sku}
                  hasDamage={refund.hasDamagePhoto}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <ImageIcon className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm font-medium">Фотографии не прикреплены</p>
                  <p className="text-xs mt-1 text-center">Клиент не загрузил фото или тип возврата не требует доказательств</p>
                  <button onClick={() => toast.success('Запрос на фото отправлен клиенту')}
                    className="mt-4 flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-50">
                    <ImageIcon className="w-3.5 h-3.5" />Запросить фото у клиента
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── AUDIT ── */}
          {tab === 'audit' && (
            <div className="px-6 py-5">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-4">Полный журнал событий</p>
              <AuditTimeline entries={refund.auditTrail} />
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────
function RefundRow({ r, onApprove, onReject, onView }: {
  r: Refund; onApprove: () => void; onReject: () => void; onView: () => void;
}) {
  const sc  = STATUS_CFG[r.status];
  const ptc = PT_CFG[r.partnerType];
  const tc  = TYPE_CFG[r.type];
  const ScIcon = sc.icon;
  const reason = REFUND_REASONS[r.reason];
  const isPending  = r.status === 'pending' || r.status === 'under_review';
  const isDisputed = r.status === 'disputed';

  return (
    <tr className={`border-b border-gray-100 hover:bg-gray-50/80 transition-colors ${isPending ? 'border-l-2 border-l-yellow-400' : isDisputed ? 'border-l-2 border-l-orange-400' : ''}`}>
      <td className="px-4 py-3.5">
        <button onClick={onView} className="text-left">
          <p className="font-mono text-xs font-bold text-blue-700 hover:text-blue-900">{r.id}</p>
          <p className="font-mono text-[10px] text-gray-400 mt-0.5">{r.orderId}</p>
        </button>
      </td>
      <td className="px-3 py-3.5">
        <div className="flex items-center gap-2">
          <button onClick={onView} className={`relative w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 border-2 hover:scale-110 transition-transform ${r.hasDamagePhoto ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
            {r.productEmoji ?? '📦'}
            {r.hasDamagePhoto && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-white" />}
          </button>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-800 truncate max-w-[100px]">{r.productName ?? r.partnerName}</p>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${ptc.bg} ${ptc.color}`}>{ptc.label}</span>
          </div>
        </div>
      </td>
      <td className="px-3 py-3.5 hidden md:table-cell">
        <p className="text-xs font-medium text-gray-800">{r.customer}</p>
        <p className="text-[10px] text-gray-400 mt-0.5">{r.orderDate}</p>
      </td>
      <td className="px-3 py-3.5 hidden lg:table-cell">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{reason.icon}</span>
          <div>
            <p className="text-xs text-gray-700">{reason.label}</p>
            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${tc.bg} ${tc.color}`}>{tc.label}</span>
          </div>
        </div>
      </td>
      <td className="px-3 py-3.5 text-right whitespace-nowrap">
        <p className="text-sm font-black text-red-700">−{fmt(r.amount)}</p>
        <p className="text-[10px] text-gray-400 mt-0.5">из {fmt(r.orderAmount)}</p>
      </td>
      <td className="px-3 py-3.5 hidden xl:table-cell">
        <div className="flex items-start gap-1.5">
          <ClipboardList className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-gray-800">{r.createdByName}</p>
            <p className="text-[10px] text-gray-400">{r.createdByRole}</p>
            <p className="text-[10px] text-gray-300">{r.createdAt}</p>
          </div>
        </div>
      </td>
      <td className="px-3 py-3.5 hidden xl:table-cell">
        {r.approvedByName ? (
          <div className="flex items-start gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-green-800">{r.approvedByName}</p>
              <p className="text-[10px] text-green-600">{r.approvedByRole} · {r.approvedAt}</p>
            </div>
          </div>
        ) : r.rejectedByName ? (
          <div className="flex items-start gap-1.5">
            <UserX className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-red-700">{r.rejectedByName}</p>
              <p className="text-[10px] text-red-400">{r.rejectedByRole}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-gray-300" />
            <span className="text-[11px] text-gray-400 italic">Ожидает</span>
          </div>
        )}
      </td>
      <td className="px-3 py-3.5 whitespace-nowrap">
        <span className={`flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1.5 rounded-xl border w-fit ${sc.bg} ${sc.color} ${sc.border}`}>
          <ScIcon className="w-3 h-3" />{sc.label}
        </span>
      </td>
      <td className="px-3 py-3.5 pr-4">
        <div className="flex items-center gap-1">
          <button onClick={onView} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors" title="Детали"><Eye className="w-3.5 h-3.5" /></button>
          {isPending && <>
            <button onClick={onApprove} className="p-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors" title="Одобрить"><Check className="w-3.5 h-3.5" /></button>
            <button onClick={onReject} className="p-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors" title="Отклонить"><XCircle className="w-3.5 h-3.5" /></button>
          </>}
          {isDisputed && <button onClick={onApprove} className="p-1.5 bg-orange-100 hover:bg-orange-200 text-orange-600 rounded-lg transition-colors" title="Арбитраж"><Shield className="w-3.5 h-3.5" /></button>}
        </div>
      </td>
    </tr>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function RefundCenter() {
  const [refunds, setRefunds]           = useState<Refund[]>(MOCK_REFUNDS);
  const [statusFilter, setStatusFilter] = useState<RefundStatus | 'all'>('all');
  const [typeFilter, setTypeFilter]     = useState<RefundType | 'all'>('all');
  const [search, setSearch]             = useState('');
  const [viewing, setViewing]           = useState<Refund | null>(null);
  const [approvingId, setApprovingId]   = useState<string | null>(null);
  const [rejectingId, setRejectingId]   = useState<string | null>(null);
  const [deductToggle, setDeductToggle] = useState(true);
  const [rejectReason, setRejectReason] = useState('');
  const [toast, setToast]               = useState<string | null>(null);

  const showToast = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500); }, []);

  const summary = useMemo(() => ({
    total: refunds.length,
    pending: refunds.filter(r => r.status === 'pending' || r.status === 'under_review').length,
    completed: refunds.filter(r => r.status === 'completed').length,
    rejected: refunds.filter(r => r.status === 'rejected').length,
    disputed: refunds.filter(r => r.status === 'disputed').length,
    pendingAmt: refunds.filter(r => r.status === 'pending' || r.status === 'under_review').reduce((s, r) => s + r.amount, 0),
    totalAmt: refunds.filter(r => r.status !== 'rejected').reduce((s, r) => s + r.amount, 0),
    deductAmt: refunds.filter(r => r.deductFromPartner && ['approved','processing','completed'].includes(r.status)).reduce((s, r) => s + r.amount, 0),
    withDamage: refunds.filter(r => r.hasDamagePhoto).length,
  }), [refunds]);

  const filtered = useMemo(() => {
    let list = refunds;
    if (statusFilter !== 'all') {
      if (statusFilter === 'pending') list = list.filter(r => r.status === 'pending' || r.status === 'under_review');
      else list = list.filter(r => r.status === statusFilter);
    }
    if (typeFilter !== 'all') list = list.filter(r => r.type === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r => r.id.toLowerCase().includes(q) || r.orderId.toLowerCase().includes(q) || r.customer.toLowerCase().includes(q) || r.partnerName.toLowerCase().includes(q) || (r.productName ?? '').toLowerCase().includes(q) || (r.barcode ?? '').includes(q));
    }
    return list;
  }, [refunds, statusFilter, typeFilter, search]);

  const doApprove = (id: string, deduct: boolean) => {
    const now = new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    setRefunds(prev => prev.map(r => r.id === id ? { ...r, status: 'approved', deductFromPartner: deduct, approvedByName: 'Администратор', approvedByRole: 'Финансовый менеджер', approvedAt: now, auditTrail: [...r.auditTrail, { action: 'Одобрено', actor: 'Администратор', actorRole: 'Финансовый менеджер', at: now }] } : r));
    showToast('✅ Возврат одобрен. Средства будут зачислены клиенту.');
  };

  const doReject = (id: string, reason: string) => {
    const now = new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    setRefunds(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected', rejectedByName: 'Администратор', rejectedByRole: 'Финансовый менеджер', rejectedAt: now, rejectReason: reason, auditTrail: [...r.auditTrail, { action: 'Отклонено', actor: 'Администратор', actorRole: 'Финансовый менеджер', at: now, note: reason }] } : r));
    showToast('❌ Возврат отклонён. Клиент получит SMS-уведомление.');
  };

  const approvingRefund = refunds.find(r => r.id === approvingId);
  const rejectingRefund = refunds.find(r => r.id === rejectingId);
  const REJECT_REASONS = ['Отмена после начала доставки (п. 5.3)', 'Нарушены условия договора', 'Возврат не обоснован', 'Прошёл срок подачи (72 ч.)', 'Товар был использован клиентом', 'Дубликат заявки'];

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Центр возвратов</h1>
          <p className="text-sm text-gray-500 mt-0.5">Управление возвратами · Финансовый отдел · Фото доказательства · Баркоды · Полный аудит</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => toast.success('Экспорт возвратов в CSV запущен')}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 rounded-xl text-xs font-medium transition-colors"><Download className="w-3.5 h-3.5" />Экспорт</button>
          <button onClick={() => toast.info('Отчёт по возвратам', { description: 'Готовится сводный отчёт за выбранный период' })}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 rounded-xl text-xs font-medium transition-colors"><FileText className="w-3.5 h-3.5" />Отчёт</button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-7 gap-3">
        {([
          { label: 'Всего заявок',         v: summary.total,          color: 'text-gray-900',   bg: 'bg-white border-gray-200',       sub: 'За период',             fv: 'all' },
          { label: 'Ожидают решения',      v: summary.pending,        color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200', sub: fmt(summary.pendingAmt), fv: 'pending' },
          { label: 'Выполнено',            v: summary.completed,      color: 'text-green-700',  bg: 'bg-green-50 border-green-200',   sub: 'Зачислено клиентам',    fv: 'completed' },
          { label: 'Отклонено',            v: summary.rejected,       color: 'text-red-700',    bg: 'bg-red-50 border-red-200',       sub: 'Уведомлены',            fv: 'rejected' },
          { label: 'Арбитраж',             v: summary.disputed,       color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', sub: 'Требуют решения',       fv: 'disputed' },
          { label: 'Фото повреждений',     v: summary.withDamage,     color: 'text-rose-700',   bg: 'bg-rose-50 border-rose-200',     sub: 'С доказательствами',   fv: null as null },
          { label: 'Удержано с партнёров', v: fmt(summary.deductAmt), color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', sub: 'Из выплат',             fv: null as null },
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

      {summary.pending > 0 && (
        <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-300 rounded-2xl">
          <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center shrink-0"><AlertTriangle className="w-5 h-5 text-white" /></div>
          <div className="flex-1">
            <p className="text-sm font-bold text-yellow-900">{summary.pending} заявок ждут решения финансового отдела</p>
            <p className="text-xs text-yellow-700 mt-0.5">SLA: 24 ч. · Сумма: <span className="font-bold">{fmt(summary.pendingAmt)}</span></p>
          </div>
          <button onClick={() => setStatusFilter('pending')} className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-xl text-xs font-bold transition-colors shrink-0">Рассмотреть</button>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-4 py-3.5 border-b border-gray-100 bg-gray-50 flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Заявка, заказ, товар, баркод..."
              className="pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-52" />
          </div>
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1">
            {([{id:'all',l:'Все'},{id:'pending',l:'⏳ Ожидает'},{id:'approved',l:'✓ Одобрен'},{id:'completed',l:'✅ Выполнен'},{id:'rejected',l:'✗ Отклонён'},{id:'disputed',l:'⚡ Арбитраж'}] as {id:any,l:string}[]).map(f => (
              <button key={f.id} onClick={() => setStatusFilter(f.id)} className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${statusFilter === f.id ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-800'}`}>{f.l}</button>
            ))}
          </div>
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1">
            {([{id:'all',l:'Все'},{id:'full',l:'Полный'},{id:'partial',l:'Частичный'},{id:'delivery_only',l:'Доставка'}] as {id:any,l:string}[]).map(f => (
              <button key={f.id} onClick={() => setTypeFilter(f.id)} className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${typeFilter === f.id ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-800'}`}>{f.l}</button>
            ))}
          </div>
          <div className="ml-auto text-xs text-gray-400">{filtered.length} · <span className="font-bold text-red-700">{fmt(filtered.reduce((s, r) => s + r.amount, 0))}</span></div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide">Заявка / Заказ</th>
                <th className="px-3 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide">Товар / Партнёр</th>
                <th className="px-3 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide hidden md:table-cell">Клиент</th>
                <th className="px-3 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Причина</th>
                <th className="px-3 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wide">Сумма</th>
                <th className="px-3 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide hidden xl:table-cell"><span className="flex items-center gap-1"><ClipboardList className="w-3 h-3" />Оформил</span></th>
                <th className="px-3 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide hidden xl:table-cell"><span className="flex items-center gap-1"><UserCheck className="w-3 h-3" />Одобрил / Отклонил</span></th>
                <th className="px-3 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide">Статус</th>
                <th className="px-3 py-3 pr-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide">Действия</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="py-16 text-center"><RotateCcw className="w-10 h-10 mx-auto mb-2 text-gray-200" /><p className="text-sm text-gray-400">Нет заявок по фильтру</p></td></tr>
              ) : filtered.map(r => (
                <RefundRow key={r.id} r={r}
                  onApprove={() => { setDeductToggle(r.deductFromPartner); setApprovingId(r.id); }}
                  onReject={() => { setRejectReason(''); setRejectingId(r.id); }}
                  onView={() => setViewing(r)} />
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3.5 border-t border-gray-100 bg-gray-50 flex items-center justify-between flex-wrap gap-2 text-xs">
          <span className="text-gray-500">Показано: <span className="font-bold text-gray-700">{filtered.length}</span> из {refunds.length}</span>
          <div className="flex items-center gap-6">
            <span className="text-gray-500">Возвраты: <span className="font-black text-red-700">{fmt(filtered.reduce((s, r) => s + r.amount, 0))}</span></span>
            <span className="text-gray-500">Удержать с партнёров: <span className="font-black text-orange-700">{fmt(filtered.filter(r => r.deductFromPartner).reduce((s, r) => s + r.amount, 0))}</span></span>
          </div>
        </div>
      </div>

      {approvingRefund && (
        <ConfirmModal title="Одобрить возврат" description={`${approvingRefund.id} · ${fmt(approvingRefund.amount)}`}
          icon={CheckCircle2} iconBg="bg-green-100" confirmLabel="Одобрить" confirmBg="bg-green-600 hover:bg-green-700"
          onConfirm={() => doApprove(approvingRefund.id, deductToggle)} onClose={() => setApprovingId(null)}>
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex justify-between items-center">
            <div><p className="text-xs text-green-600">Сумма к возврату</p><p className="text-2xl font-black text-green-700">{fmt(approvingRefund.amount)}</p></div>
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </div>
          <div className="p-4 border border-gray-200 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <div><p className="text-xs font-bold text-gray-800">Удержать с партнёра</p><p className="text-[11px] text-gray-500 mt-0.5">{approvingRefund.partnerName}</p></div>
              <button onClick={() => setDeductToggle(!deductToggle)} className={`relative w-10 h-5 rounded-full transition-colors ${deductToggle ? 'bg-blue-600' : 'bg-gray-300'}`}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${deductToggle ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
            {deductToggle && <p className="text-[11px] text-blue-700 bg-blue-50 border border-blue-100 rounded-lg p-2">{fmt(approvingRefund.amount)} вычтено из выплаты «{approvingRefund.partnerName}»</p>}
          </div>
          <p className="text-[11px] text-gray-400 flex items-center gap-1.5"><Info className="w-3.5 h-3.5 shrink-0" />Ваше имя запишется в журнал аудита как «Одобрил»</p>
        </ConfirmModal>
      )}

      {rejectingRefund && (
        <ConfirmModal title="Отклонить возврат" description={`${rejectingRefund.id} · ${fmt(rejectingRefund.amount)}`}
          icon={XCircle} iconBg="bg-red-100" confirmLabel="Отклонить" confirmBg={rejectReason ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-300 cursor-not-allowed'}
          onConfirm={() => rejectReason && doReject(rejectingRefund.id, rejectReason)} onClose={() => setRejectingId(null)}>
          <div className="space-y-2">
            {REJECT_REASONS.map(reason => (
              <button key={reason} onClick={() => setRejectReason(reason)}
                className={`w-full flex items-center gap-2 px-3 py-2.5 border rounded-xl text-xs text-left transition-all ${rejectReason === reason ? 'border-red-400 bg-red-50 text-red-800' : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}>
                <div className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 ${rejectReason === reason ? 'border-red-500 bg-red-500' : 'border-gray-300'}`} />
                {reason}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-gray-400 flex items-center gap-1.5"><Info className="w-3.5 h-3.5 shrink-0" />Ваше имя запишется в журнал аудита как «Отклонил»</p>
        </ConfirmModal>
      )}

      {viewing && <RefundDetailDrawer refund={viewing} onClose={() => setViewing(null)}
        onApprove={(r) => { setViewing(null); setDeductToggle(r.deductFromPartner); setApprovingId(r.id); }}
        onReject={(r) => { setViewing(null); setRejectReason(''); setRejectingId(r.id); }} />}

      {toast && ReactDOM.createPortal(
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] px-5 py-3 bg-gray-900 text-white text-sm font-medium rounded-2xl shadow-2xl">{toast}</div>,
        document.body
      )}
    </div>
  );
}
