import { useState, useMemo, useCallback } from 'react';
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactDOM from 'react-dom';
import {
  ArrowLeft, Download, CheckCircle2, XCircle, AlertTriangle, Clock,
  RefreshCw, CircleAlert, Wallet, Banknote, RotateCcw, Receipt,
  ChevronDown, ChevronUp, Search, Filter, Check, X, Info,
  FileText, Send, Eye, Package, Bike, Store, Building2, Shield,
  Minus, Plus, AlertCircle, TrendingDown, ExternalLink, Copy,
  MoreVertical, ChevronRight, Percent, Ban, Printer, Mail,
  Calendar, BarChart2,
} from 'lucide-react';
import { DocumentViewerModal } from '../../components/ui/DocumentViewer';

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderStatus    = 'completed' | 'cancelled' | 'partially_refunded' | 'refunded';
type PayoutStatus   = 'pending' | 'processing' | 'completed' | 'failed' | 'on_hold';
type PartnerType    = 'courier' | 'merchant' | 'pvz';
type RefundReason   = 'wrong_item' | 'damaged' | 'not_delivered' | 'quality' | 'other' | 'cancel_by_client';

interface OrderItem {
  name: string;
  qty: number;
  price: number;
}

interface PayoutOrder {
  id:           string;
  date:         string;
  time:         string;
  customer:     string;
  phone:        string;
  items:        OrderItem[];
  gross:        number;           // total order amount paid by customer
  commission:   number;           // amount charged as platform fee
  commPct:      number;
  refundAmount: number;           // refund deducted from payout (if any)
  refundReason?: RefundReason;
  net:          number;           // gross - commission - refundAmount (partner receives)
  status:       OrderStatus;
  deliveryZone: string;
  included:     boolean;          // selected for this payout
  paymentMethod: 'card' | 'cash' | 'wallet';
}

interface PartnerInfo {
  id:          string;
  name:        string;
  type:        PartnerType;
  legalName:   string;
  inn:         string;
  bank:        string;
  bankAccount: string;
  bik:         string;
  avatar:      string;
  rating:      number;
  email:       string;
  phone:       string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const REFUND_REASONS: Record<RefundReason, string> = {
  wrong_item:      'Не тот товар',
  damaged:         'Повреждён при доставке',
  not_delivered:   'Не доставлен',
  quality:         'Ненадлежащее качество',
  other:           'Иная причина',
  cancel_by_client:'Отмена клиентом',
};

const PARTNERS: Record<string, PartnerInfo> = {
  'pay001': { id: 'merch-001', name: 'Кафе «Уют»',          type: 'merchant', legalName: 'ООО «Уют»',          inn: '7712345678', bank: 'Сбербанк',  bankAccount: '40702810300123003471', bik: '044525225', avatar: '🍕', rating: 4.8, email: 'finance@cafe-uyut.ru',   phone: '+7 495 123-44-55' },
  'pay002': { id: 'merch-002', name: 'Пекарня «Хлеб»',      type: 'merchant', legalName: 'ИП Петров А.В.',      inn: '771298765432', bank: 'Тинькофф', bankAccount: '40802810700000008823', bik: '044525974', avatar: '🥖', rating: 4.9, email: 'pay@pek-hleb.ru',        phone: '+7 495 222-33-44' },
  'pay003': { id: 'crr-001',   name: 'Алексей К. (KFC)',     type: 'courier',  legalName: 'Ковалёв А.В.',        inn: '771123456789', bank: 'Альфа',    bankAccount: '40817810500000001134', bik: '044525593', avatar: '🚴', rating: 4.7, email: 'alexey.k@pvz.ru',       phone: '+7 916 444-55-66' },
  'pay004': { id: 'crr-002',   name: 'Михаил Д.',            type: 'courier',  legalName: 'Дмитриев М.С.',       inn: '771987654321', bank: 'Сбербанк', bankAccount: '40817810300000005590', bik: '044525225', avatar: '🛵', rating: 4.5, email: 'mikhail.d@pvz.ru',      phone: '+7 916 111-22-33' },
  'pay005': { id: 'pvz-001',   name: 'ПВЗ «Сортировочная»',  type: 'pvz',      legalName: 'ООО «ПВЗ-Сервис»',   inn: '7712000001',  bank: 'ВТБ',       bankAccount: '40702810023000002267', bik: '044525187', avatar: '📦', rating: 4.3, email: 'pvz-sort@pvz.ru',      phone: '+7 495 999-00-11' },
  'pay006': { id: 'merch-006', name: 'TechStore MSK',         type: 'merchant', legalName: 'ООО «ТехСтор»',      inn: '7712000006',  bank: 'Тинькофф', bankAccount: '40702810700000007712', bik: '044525974', avatar: '💻', rating: 4.6, email: 'fin@techstore.ru',      phone: '+7 495 777-88-99' },
  'pay007': { id: 'pvz-002',   name: 'ПВЗ «Центральный»',    type: 'pvz',      legalName: 'ИП Иванов П.С.',      inn: '7712000007',  bank: 'Сбербанк', bankAccount: '40802810300000000043', bik: '044525225', avatar: '🏪', rating: 4.1, email: 'pvz-central@pvz.ru',   phone: '+7 495 111-00-99' },
  'pay008': { id: 'merch-008', name: 'FreshMarket',           type: 'merchant', legalName: 'ООО «Фреш»',          inn: '7712000008',  bank: 'Альфа',    bankAccount: '40702810500000009981', bik: '044525593', avatar: '🥬', rating: 4.7, email: 'accounting@fresh.ru',  phone: '+7 495 555-66-77' },
};

function generateOrders(payoutId: string, partner: PartnerInfo): PayoutOrder[] {
  const counts: Record<string, number> = {
    pay001: 18, pay002: 14, pay003: 22, pay004: 17,
    pay005: 25, pay006: 11, pay007: 12, pay008: 20,
  };
  const count = counts[payoutId] ?? 12;
  const commPct = partner.type === 'courier' ? 20 : partner.type === 'pvz' ? 8 : 15;
  const zones   = ['Центр', 'Север', 'Запад', 'Восток', 'Юг'];
  const names   = ['Александра М.','Дмитрий К.','Наталья В.','Сергей П.','Анна Л.','Иван Т.','Мария С.','Олег Р.','Елена Ж.','Павел Н.','Светлана К.','Артём Б.'];
  const foods   = [['Пицца Маргарита','Кока-кола 0.5л'],['Бургер классик','Картофель фри','Кофе'],['Суши-сет "Токио"','Мисо-суп'],['Паста карбонара','Тирамису'],['Шаурма XL','Домашний лимонад'],['Лосось на гриле','Салат цезарь','Десерт'],['Стейк рибай','Картофель по-деревенски'],['Роллы "Филадельфия"','Гунканы'],['Бизнес-ланч №3','Сок апельсиновый'],['Шашлык из курицы','Лаваш','Соус'],['Пельмени домашние','Борщ','Хлеб'],['Морепродукты микс','Белое вино 200мл']];
  const reasons: RefundReason[] = ['wrong_item','damaged','not_delivered','quality','cancel_by_client'];
  const methods: PayoutOrder['paymentMethod'][] = ['card','card','card','wallet','cash'];

  return Array.from({ length: count }, (_, i) => {
    const foodSet   = foods[i % foods.length];
    const items: OrderItem[] = foodSet.map(f => ({
      name: f,
      qty:  Math.floor(Math.random() * 2) + 1,
      price: Math.floor(Math.random() * 800) + 200,
    }));
    const gross = items.reduce((s, it) => s + it.price * it.qty, 0);
    const commission = Math.round(gross * commPct / 100);
    const hasRefund  = i < 3 && partner.type === 'merchant'; // first 3 orders of merchants have partial refunds
    const refundAmount = hasRefund ? Math.round(gross * 0.3) : 0;
    const net   = gross - commission - refundAmount;
    const day   = String(1 + (i % 7)).padStart(2, '0');
    const hour  = String(9 + (i % 13)).padStart(2, '0');
    const min   = String((i * 7) % 60).padStart(2, '0');
    const statuses: OrderStatus[] = ['completed','completed','completed','completed','completed','completed','completed','completed','partially_refunded','refunded','completed','cancelled'];
    const status = hasRefund ? (refundAmount > gross * 0.5 ? 'refunded' : 'partially_refunded') : statuses[i % statuses.length];

    return {
      id:           `ORD-2026-${String(4800 + i).padStart(6, '0')}`,
      date:         `${day}.02.2026`,
      time:         `${hour}:${min}`,
      customer:     names[i % names.length],
      phone:        `+7 9${String(10 + i).padStart(2,'0')} ${String(100+i*3).padStart(3,'0')}-${String(10+i).padStart(2,'0')}-${String(20+i).padStart(2,'0')}`,
      items,
      gross,
      commission,
      commPct,
      refundAmount,
      refundReason: hasRefund ? reasons[i % reasons.length] : undefined,
      net,
      status,
      deliveryZone: zones[i % zones.length],
      included:     status !== 'cancelled',
      paymentMethod: methods[i % methods.length],
    };
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtRub(n: number): string {
  return `₽${n.toLocaleString('ru-RU')}`;
}

const ORDER_STATUS_CFG: Record<OrderStatus, { label: string; bg: string; color: string; dot: string }> = {
  completed:          { label: 'Выполнен',        bg: 'bg-green-50',  color: 'text-green-700',  dot: 'bg-green-500' },
  cancelled:          { label: 'Отменён',          bg: 'bg-gray-100',  color: 'text-gray-500',   dot: 'bg-gray-400' },
  partially_refunded: { label: 'Частичный возврат',bg: 'bg-amber-50',  color: 'text-amber-700',  dot: 'bg-amber-500' },
  refunded:           { label: 'Возврат',          bg: 'bg-red-50',    color: 'text-red-700',    dot: 'bg-red-500' },
};

const PAYOUT_STATUS_CFG: Record<PayoutStatus, { label: string; bg: string; color: string; icon: React.ElementType }> = {
  pending:    { label: 'Ожидает',     bg: 'bg-yellow-50',  color: 'text-yellow-700', icon: Clock },
  processing: { label: 'В обработке', bg: 'bg-blue-50',    color: 'text-blue-700',   icon: RefreshCw },
  completed:  { label: 'Выполнена',   bg: 'bg-green-50',   color: 'text-green-700',  icon: CheckCircle2 },
  failed:     { label: 'Ошибка',      bg: 'bg-red-50',     color: 'text-red-700',    icon: AlertTriangle },
  on_hold:    { label: 'На удержании',bg: 'bg-orange-50',  color: 'text-orange-700', icon: CircleAlert },
};

const PARTNER_TYPE_CFG: Record<PartnerType, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  courier:  { label: 'Курьер',  icon: Bike,      color: 'text-orange-600', bg: 'bg-orange-50' },
  merchant: { label: 'Мерчант', icon: Store,     color: 'text-purple-600', bg: 'bg-purple-50' },
  pvz:      { label: 'ПВЗ',     icon: Building2, color: 'text-teal-600',   bg: 'bg-teal-50' },
};

// ─── Approval Modal ───────────────────────────────────────────────────────────

function ApproveModal({ onConfirm, onClose, netAmount }: {
  onConfirm: () => void;
  onClose: () => void;
  netAmount: number;
}) {
  const [comment, setComment] = useState('');
  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Подтверждение выплаты</h2>
              <p className="text-xs text-gray-500 mt-0.5">Финансовое подразделение · RBAC: FINANCE_APPROVE</p>
            </div>
          </div>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
            <p className="text-xs text-green-600">Сумма к выплате</p>
            <p className="text-3xl font-black text-green-700 mt-1">{fmtRub(netAmount)}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Комментарий (необязательно)</label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={3}
              placeholder="Комментарий для журнала аудита..."
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
          </div>
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl">
            <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-blue-700">После одобрения выплата поступит в банк в течение 1 рабочего дня. Действие фиксируется в журнале аудита.</p>
          </div>
        </div>
        <div className="px-6 py-4 border-t flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Отмена</button>
          <button onClick={() => { onConfirm(); onClose(); }} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold transition-colors">
            <Check className="w-4 h-4" />Одобрить
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Hold Modal ───────────────────────────────────────────────────────────────

function HoldModal({ onConfirm, onClose }: { onConfirm: (reason: string) => void; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const reasons = ['Требует верификации реквизитов','Подозрительная активность','Ожидание решения по спору','Технические работы банка','Запрос документов','Иная причина'];
  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center"><CircleAlert className="w-5 h-5 text-orange-600" /></div>
          <div>
            <h2 className="font-bold text-gray-900">Заморозить выплату</h2>
            <p className="text-xs text-gray-500 mt-0.5">Укажите причину для журнала аудита</p>
          </div>
        </div>
        <div className="px-6 py-5 space-y-3">
          {reasons.map(r => (
            <button key={r} onClick={() => setReason(r)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 border rounded-xl text-sm text-left transition-all ${reason === r ? 'border-orange-400 bg-orange-50 text-orange-800' : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}>
              <div className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${reason === r ? 'border-orange-500 bg-orange-500' : 'border-gray-300'}`} />
              {r}
            </button>
          ))}
        </div>
        <div className="px-6 py-4 border-t flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Отмена</button>
          <button disabled={!reason} onClick={() => { onConfirm(reason); onClose(); }} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-colors">
            <CircleAlert className="w-4 h-4" />Заморозить
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Reject Modal ─────────────────────────────────────────────────────────────

function RejectModal({ onConfirm, onClose }: { onConfirm: (reason: string) => void; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const reasons = ['Ошибка в банковских реквизитах','Нарушение договора','Документы не предоставлены','Превышение лимита','Арест счёта партнёра','Мошенническая активность'];
  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center"><XCircle className="w-5 h-5 text-red-600" /></div>
          <div>
            <h2 className="font-bold text-gray-900">Отклонить выплату</h2>
            <p className="text-xs text-gray-500">Укажите причину для партнёра</p>
          </div>
        </div>
        <div className="px-6 py-5 space-y-3">
          {reasons.map(r => (
            <button key={r} onClick={() => setReason(r)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 border rounded-xl text-sm text-left transition-all ${reason === r ? 'border-red-400 bg-red-50 text-red-800' : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}>
              <div className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${reason === r ? 'border-red-500 bg-red-500' : 'border-gray-300'}`} />
              {r}
            </button>
          ))}
        </div>
        <div className="px-6 py-4 border-t flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Отмена</button>
          <button disabled={!reason} onClick={() => { onConfirm(reason); onClose(); }} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-colors">
            <XCircle className="w-4 h-4" />Отклонить
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Order Row ────────────────────────────────────────────────────────────────

function OrderRow({
  order, onToggle, expanded, onExpand,
}: {
  order: PayoutOrder;
  onToggle: (id: string) => void;
  expanded: boolean;
  onExpand: (id: string) => void;
}) {
  const sc = ORDER_STATUS_CFG[order.status];
  const isCancelled = order.status === 'cancelled';

  return (
    <>
      <tr className={`border-b border-gray-100 hover:bg-gray-50/60 transition-colors group ${!order.included || isCancelled ? 'opacity-50' : ''}`}>
        {/* Checkbox */}
        <td className="pl-4 pr-2 py-3.5 w-10">
          <button
            onClick={() => onToggle(order.id)}
            disabled={isCancelled}
            className={`w-4.5 h-4.5 rounded flex items-center justify-center border-2 transition-colors shrink-0 ${
              isCancelled ? 'border-gray-200 bg-gray-100 cursor-not-allowed' :
              order.included ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white hover:border-blue-400'
            }`}
            style={{ width: 18, height: 18, minWidth: 18 }}
          >
            {order.included && !isCancelled && <Check className="w-2.5 h-2.5 text-white" />}
          </button>
        </td>

        {/* Order ID + date */}
        <td className="px-3 py-3.5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onExpand(order.id)}
              className="flex items-center gap-1.5 group/id"
            >
              <span className="font-mono text-xs font-bold text-blue-700 group-hover/id:text-blue-800">{order.id}</span>
              {expanded ? <ChevronUp className="w-3 h-3 text-gray-400" /> : <ChevronDown className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100" />}
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5">{order.date} · {order.time} · {order.deliveryZone}</p>
        </td>

        {/* Customer */}
        <td className="px-3 py-3.5 hidden md:table-cell">
          <p className="text-xs font-medium text-gray-800">{order.customer}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{order.paymentMethod === 'card' ? '💳 Карта' : order.paymentMethod === 'cash' ? '💵 Наличные' : '👛 Кошелёк'}</p>
        </td>

        {/* Items preview */}
        <td className="px-3 py-3.5 hidden lg:table-cell">
          <p className="text-xs text-gray-600 truncate max-w-[180px]">{order.items.map(i => i.name).join(', ')}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{order.items.length} позиц.</p>
        </td>

        {/* Gross */}
        <td className="px-3 py-3.5 text-right">
          <p className="text-sm font-bold text-gray-900">{fmtRub(order.gross)}</p>
        </td>

        {/* Commission */}
        <td className="px-3 py-3.5 text-right hidden sm:table-cell">
          <p className="text-xs font-semibold text-red-600">−{fmtRub(order.commission)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{order.commPct}%</p>
        </td>

        {/* Refund */}
        <td className="px-3 py-3.5 text-right hidden sm:table-cell">
          {order.refundAmount > 0 ? (
            <div>
              <p className="text-xs font-semibold text-red-600">−{fmtRub(order.refundAmount)}</p>
              <p className="text-[10px] text-red-400 mt-0.5">{order.refundReason ? REFUND_REASONS[order.refundReason].slice(0, 14) + '…' : 'Возврат'}</p>
            </div>
          ) : (
            <span className="text-[10px] text-gray-300">—</span>
          )}
        </td>

        {/* Net to partner */}
        <td className="px-3 py-3.5 text-right">
          <p className={`text-sm font-black ${order.included && !isCancelled ? 'text-green-700' : 'text-gray-400'}`}>
            {fmtRub(order.net)}
          </p>
        </td>

        {/* Status */}
        <td className="px-3 py-3.5 pr-4">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${sc.bg} ${sc.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
            {sc.label}
          </span>
        </td>
      </tr>

      {/* Expanded order details */}
      {expanded && (
        <tr className="bg-blue-50/30 border-b border-blue-100">
          <td colSpan={9} className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Items list */}
              <div>
                <p className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-blue-500" />
                  Состав заказа
                </p>
                <div className="space-y-1.5">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-xs text-gray-700 py-1 border-b border-blue-100 last:border-0">
                      <span>{item.name} × {item.qty}</span>
                      <span className="font-semibold">{fmtRub(item.price * item.qty)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial breakdown */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-blue-500" />
                  Финансовый расчёт
                </p>
                {[
                  { label: 'Сумма заказа', val: order.gross, color: 'text-gray-900' },
                  { label: `Комиссия платформы (${order.commPct}%)`, val: -order.commission, color: 'text-red-600' },
                  ...(order.refundAmount > 0 ? [{ label: `Возврат клиенту (${order.refundReason ? REFUND_REASONS[order.refundReason] : 'Возврат'})`, val: -order.refundAmount, color: 'text-red-600' }] : []),
                  { label: 'Итого партнёру', val: order.net, color: 'text-green-700' },
                ].map((row, i) => (
                  <div key={i} className={`flex items-center justify-between text-xs py-1 ${i === (order.refundAmount > 0 ? 3 : 2) ? 'border-t border-blue-200 pt-2 font-bold' : ''} ${row.color}`}>
                    <span>{row.label}</span>
                    <span className="font-semibold">{row.val >= 0 ? fmtRub(row.val) : `−${fmtRub(Math.abs(row.val))}`}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2 pt-2">
                  <p className="text-[10px] text-gray-400">Клиент: {order.customer} · {order.phone}</p>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Daily Breakdown ──────────────────────────────────────────────────────────

interface DayReport { date: string; dayLabel: string; orders: number; gross: number; commission: number; refunds: number; net: number; cancelled: number; }

function buildDailyReport(orders: PayoutOrder[]): DayReport[] {
  const byDate = new Map<string, DayReport>();
  const dayNames: Record<string, string> = { '01.02.2026': 'Вс', '02.02.2026': 'Пн', '03.02.2026': 'Вт', '04.02.2026': 'Ср', '05.02.2026': 'Чт', '06.02.2026': 'Пт', '07.02.2026': 'Сб' };
  for (const o of orders) {
    if (!byDate.has(o.date)) byDate.set(o.date, { date: o.date, dayLabel: dayNames[o.date] ?? '', orders: 0, gross: 0, commission: 0, refunds: 0, net: 0, cancelled: 0 });
    const day = byDate.get(o.date)!;
    if (o.status === 'cancelled') { day.cancelled++; continue; }
    day.orders++; day.gross += o.gross; day.commission += o.commission; day.refunds += o.refundAmount; day.net += o.net;
  }
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function DailyBreakdown({ orders }: { orders: PayoutOrder[] }) {
  const days = buildDailyReport(orders);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const maxNet = Math.max(...days.map(d => d.net), 1);
  return (
    <div className="space-y-4">
      {/* Mini bar chart */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <p className="text-xs font-bold text-gray-700 mb-3 flex items-center gap-2"><BarChart2 className="w-4 h-4 text-blue-500" />Динамика выплаты по дням</p>
        <div className="flex items-end gap-2 h-20">
          {days.map(d => (
            <button key={d.date} onClick={() => setExpandedDay(p => p === d.date ? null : d.date)}
              className="flex-1 flex flex-col items-center gap-1 group">
              <div className="flex-1 w-full flex items-end">
                <div className={`w-full rounded-t-lg transition-all ${expandedDay === d.date ? 'bg-blue-600' : 'bg-blue-200 group-hover:bg-blue-400'}`}
                  style={{ height: `${Math.max(10, Math.round(d.net / maxNet * 100))}%` }} title={fmtRub(d.net)} />
              </div>
              <span className="text-[9px] text-gray-500">{d.dayLabel}</span>
              <span className="text-[9px] text-gray-400">{d.date.slice(0, 5)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase">Дата</th>
              <th className="px-3 py-3 text-right text-[10px] font-bold text-gray-500 uppercase">Заказов</th>
              <th className="px-3 py-3 text-right text-[10px] font-bold text-gray-500 uppercase hidden sm:table-cell">Брутто</th>
              <th className="px-3 py-3 text-right text-[10px] font-bold text-gray-500 uppercase hidden sm:table-cell">Комиссия</th>
              <th className="px-3 py-3 text-right text-[10px] font-bold text-gray-500 uppercase hidden md:table-cell">Возвраты</th>
              <th className="px-3 py-3 text-right text-[10px] font-bold text-gray-500 uppercase">К выплате</th>
              <th className="px-3 py-3 w-10" />
            </tr>
          </thead>
          <tbody>
            {days.map(d => {
              const dayOrders = orders.filter(o => o.date === d.date && o.status !== 'cancelled');
              const isOpen = expandedDay === d.date;
              return (
                <React.Fragment key={d.date}>
                  <tr className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${isOpen ? 'bg-blue-50/40' : ''}`}
                    onClick={() => setExpandedDay(p => p === d.date ? null : d.date)}>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0"><Calendar className="w-4 h-4 text-blue-600" /></div>
                        <div>
                          <p className="text-xs font-bold text-gray-900">{d.date} <span className="text-gray-400 font-normal">({d.dayLabel})</span></p>
                          {d.cancelled > 0 && <p className="text-[10px] text-orange-500">{d.cancelled} отменён</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-right"><span className="text-sm font-bold text-gray-800">{d.orders}</span></td>
                    <td className="px-3 py-3.5 text-right hidden sm:table-cell"><span className="text-xs text-gray-700">{fmtRub(d.gross)}</span></td>
                    <td className="px-3 py-3.5 text-right hidden sm:table-cell"><span className="text-xs text-red-600">−{fmtRub(d.commission)}</span></td>
                    <td className="px-3 py-3.5 text-right hidden md:table-cell">
                      {d.refunds > 0 ? <span className="text-xs text-amber-600">−{fmtRub(d.refunds)}</span> : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-3.5 text-right"><span className="text-sm font-black text-green-700">{fmtRub(d.net)}</span></td>
                    <td className="px-3 py-3.5 text-center">{isOpen ? <ChevronUp className="w-4 h-4 text-gray-400 mx-auto" /> : <ChevronDown className="w-4 h-4 text-gray-400 mx-auto" />}</td>
                  </tr>
                  {isOpen && (
                    <tr key={`${d.date}-exp`}>
                      <td colSpan={7} className="bg-blue-50/20 border-b border-blue-100 px-0 py-0">
                        <div className="px-5 py-3 space-y-1.5">
                          <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Заказы за {d.date}</p>
                          {dayOrders.map(o => (
                            <div key={o.id} className="flex items-center gap-3 p-2.5 bg-white border border-gray-100 rounded-xl text-[11px]">
                              <span className="font-mono font-bold text-blue-700 shrink-0">{o.id}</span>
                              <span className="text-gray-400 shrink-0">{o.time}</span>
                              <span className="text-gray-700 flex-1 truncate">{o.customer}</span>
                              <span className="text-gray-600 hidden sm:block shrink-0">{fmtRub(o.gross)}</span>
                              <span className="text-red-500 hidden sm:block shrink-0">−{fmtRub(o.commission)}</span>
                              {o.refundAmount > 0 && <span className="text-amber-600 shrink-0">−{fmtRub(o.refundAmount)}</span>}
                              <span className="font-black text-green-700 shrink-0">{fmtRub(o.net)}</span>
                              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${o.status === 'completed' ? 'bg-green-500' : 'bg-amber-400'}`} />
                            </div>
                          ))}
                          <div className="flex items-center justify-between pt-2 border-t border-blue-100 text-xs font-medium">
                            <span className="text-gray-500">Итого:</span>
                            <div className="flex items-center gap-4">
                              <span className="text-gray-600">{fmtRub(d.gross)}</span>
                              <span className="text-red-600">−{fmtRub(d.commission)}</span>
                              {d.refunds > 0 && <span className="text-amber-600">−{fmtRub(d.refunds)}</span>}
                              <span className="font-black text-green-700">{fmtRub(d.net)}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot className="bg-gray-50 border-t-2 border-gray-200">
            <tr>
              <td className="px-4 py-3.5 font-black text-gray-900 text-xs">ИТОГО за период</td>
              <td className="px-3 py-3.5 text-right font-bold text-gray-900 text-xs">{days.reduce((s, d) => s + d.orders, 0)}</td>
              <td className="px-3 py-3.5 text-right font-bold text-gray-700 text-xs hidden sm:table-cell">{fmtRub(days.reduce((s, d) => s + d.gross, 0))}</td>
              <td className="px-3 py-3.5 text-right font-bold text-red-600 text-xs hidden sm:table-cell">−{fmtRub(days.reduce((s, d) => s + d.commission, 0))}</td>
              <td className="px-3 py-3.5 text-right font-bold text-amber-600 text-xs hidden md:table-cell">−{fmtRub(days.reduce((s, d) => s + d.refunds, 0))}</td>
              <td className="px-3 py-3.5 text-right font-black text-green-700 text-sm">{fmtRub(days.reduce((s, d) => s + d.net, 0))}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PayoutDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const payoutId = id ?? 'pay001';
  const partner  = PARTNERS[payoutId] ?? PARTNERS['pay001'];
  const tc       = PARTNER_TYPE_CFG[partner.type];
  const TypeIcon = tc.icon;

  const [orders, setOrders]               = useState<PayoutOrder[]>(() => generateOrders(payoutId, partner));
  const [expandedId, setExpandedId]       = useState<string | null>(null);
  const [activeTab, setActiveTab]         = useState<'orders' | 'daily' | 'documents'>('orders');
  const [search, setSearch]               = useState('');
  const [statusFilter, setStatusFilter]   = useState<OrderStatus | 'all'>('all');
  const [payoutStatus, setPayoutStatus]   = useState<PayoutStatus>('pending');
  const [showApprove, setShowApprove]     = useState(false);
  const [viewingPayoutDoc, setViewingPayoutDoc] = useState<any>(null);
  const [showHold, setShowHold]           = useState(false);
  const [showReject, setShowReject]       = useState(false);
  const [toast, setToast]                 = useState<string | null>(null);
  const [selectAllMode, setSelectAllMode] = useState(true);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const toggleOrder = useCallback((ordId: string) => {
    setOrders(prev => prev.map(o => o.id === ordId ? { ...o, included: !o.included } : o));
  }, []);

  const toggleAll = () => {
    const newVal = !selectAllMode;
    setSelectAllMode(newVal);
    setOrders(prev => prev.map(o => o.status === 'cancelled' ? o : { ...o, included: newVal }));
  };

  // Filter
  const filtered = useMemo(() => {
    let list = orders;
    if (statusFilter !== 'all') list = list.filter(o => o.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(o => o.id.toLowerCase().includes(q) || o.customer.toLowerCase().includes(q));
    }
    return list;
  }, [orders, statusFilter, search]);

  // Summary calculations (across ALL orders, not just filtered)
  const summary = useMemo(() => {
    const included  = orders.filter(o => o.included);
    const totalGross    = included.reduce((s, o) => s + o.gross, 0);
    const totalComm     = included.reduce((s, o) => s + o.commission, 0);
    const totalRefunds  = included.reduce((s, o) => s + o.refundAmount, 0);
    const totalNet      = included.reduce((s, o) => s + o.net, 0);
    const refundOrders  = orders.filter(o => o.refundAmount > 0);
    return {
      totalOrders: orders.length,
      includedOrders: included.length,
      excludedOrders: orders.filter(o => !o.included).length,
      totalGross,
      totalComm,
      totalRefunds,
      totalNet,
      refundOrdersCount: refundOrders.length,
      cancelledOrders: orders.filter(o => o.status === 'cancelled').length,
    };
  }, [orders]);

  const psc = PAYOUT_STATUS_CFG[payoutStatus];
  const PscIcon = psc.icon;

  // Status counts for filter badges
  const statusCounts = useMemo(() => ({
    all: orders.length,
    completed: orders.filter(o => o.status === 'completed').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
    partially_refunded: orders.filter(o => o.status === 'partially_refunded').length,
    refunded: orders.filter(o => o.status === 'refunded').length,
  }), [orders]);

  return (
    <div className="space-y-5 pb-10">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => navigate('/finance')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          <ArrowLeft className="w-4 h-4" />Финансы
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
        <span className="text-sm text-gray-700 font-medium">Выплата #{payoutId}</span>
        <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${psc.bg} ${psc.color}`}>
          <PscIcon className="w-3 h-3" />{psc.label}
        </span>
      </div>

      {/* ── Partner Card + Summary KPIs ── */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        {/* Partner Info */}
        <div className="xl:col-span-1 bg-white border border-gray-200 rounded-2xl p-5 flex flex-col gap-4">
          {/* Avatar + name */}
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 ${tc.bg} rounded-2xl flex items-center justify-center text-2xl shrink-0`}>
              {partner.avatar}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-gray-900 truncate">{partner.name}</p>
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${tc.bg} ${tc.color}`}>
                <TypeIcon className="w-2.5 h-2.5" />{tc.label}
              </span>
            </div>
          </div>
          {/* Details */}
          <div className="space-y-2 text-xs border-t border-gray-100 pt-3">
            {[
              { l: 'Юр. лицо',   v: partner.legalName },
              { l: 'ИНН',        v: partner.inn },
              { l: 'Банк',       v: partner.bank },
              { l: 'Счёт',       v: `****${partner.bankAccount.slice(-4)}` },
              { l: 'БИК',        v: partner.bik },
              { l: 'Email',      v: partner.email },
              { l: 'Телефон',    v: partner.phone },
            ].map(({ l, v }) => (
              <div key={l} className="flex items-start gap-2">
                <span className="text-gray-400 min-w-[60px] shrink-0">{l}</span>
                <span className="text-gray-800 font-medium break-all">{v}</span>
              </div>
            ))}
          </div>
          {/* Rating */}
          <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl border border-gray-100">
            <span className="text-yellow-500">★</span>
            <span className="text-sm font-bold text-gray-800">{partner.rating}</span>
            <span className="text-xs text-gray-400">рейтинг партнёра</span>
          </div>
        </div>

        {/* KPI Summary */}
        <div className="xl:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: 'Включённых заказов',     val: `${summary.includedOrders} / ${summary.totalOrders}`, sub: `Исключено: ${summary.excludedOrders}`, color: 'text-blue-700',   bg: 'bg-blue-50',   icon: Package },
            { label: 'Общий оборот (брутто)',  val: fmtRub(summary.totalGross),   sub: 'Сумма оплат клиентами',  color: 'text-gray-800',   bg: 'bg-gray-50',   icon: Banknote },
            { label: 'Комиссия платформы',     val: fmtRub(summary.totalComm),    sub: `${orders[0]?.commPct ?? 0}% от оборота`,       color: 'text-red-700',    bg: 'bg-red-50',    icon: Percent },
            { label: 'Возвраты покупателей',   val: fmtRub(summary.totalRefunds), sub: `${summary.refundOrdersCount} заказов с возвратом`, color: 'text-amber-700', bg: 'bg-amber-50', icon: RotateCcw },
            { label: 'Отменённые заказы',      val: summary.cancelledOrders,      sub: 'Не включены в выплату',  color: 'text-gray-500',   bg: 'bg-gray-50',   icon: Ban },
            { label: '💰 Итого к выплате',     val: fmtRub(summary.totalNet),     sub: 'Брутто − комиссия − возвраты', color: 'text-green-700', bg: 'bg-green-50', icon: Wallet },
          ].map((k, i) => {
            const KIcon = k.icon;
            return (
              <div key={i} className={`${k.bg} border border-gray-200 rounded-2xl p-4 flex flex-col gap-1`}>
                <div className="flex items-center gap-2">
                  <KIcon className={`w-4 h-4 ${k.color} opacity-70`} />
                  <p className="text-[11px] text-gray-500">{k.label}</p>
                </div>
                <p className={`text-xl font-black ${k.color}`}>{k.val}</p>
                <p className="text-[10px] text-gray-400">{k.sub}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Calculation Banner ── */}
      <div className="flex items-center gap-4 p-4 bg-gray-900 rounded-2xl flex-wrap">
        <div className="flex items-center gap-2 text-white">
          <Receipt className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-400">Брутто</span>
          <span className="font-bold">{fmtRub(summary.totalGross)}</span>
        </div>
        <Minus className="w-3.5 h-3.5 text-gray-500 shrink-0" />
        <div className="flex items-center gap-2 text-red-400">
          <Percent className="w-3.5 h-3.5" />
          <span className="text-xs">Комиссия</span>
          <span className="font-bold">{fmtRub(summary.totalComm)}</span>
        </div>
        {summary.totalRefunds > 0 && (
          <>
            <Minus className="w-3.5 h-3.5 text-gray-500 shrink-0" />
            <div className="flex items-center gap-2 text-amber-400">
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="text-xs">Возвраты</span>
              <span className="font-bold">{fmtRub(summary.totalRefunds)}</span>
            </div>
          </>
        )}
        <div className="ml-auto flex items-center gap-3">
          <span className="text-gray-400 text-xs">= ИТОГО К ВЫПЛАТЕ</span>
          <span className="text-2xl font-black text-green-400">{fmtRub(summary.totalNet)}</span>
        </div>
      </div>

      {/* ── Tab selector ── */}
      <div className="flex items-center gap-1 border-b border-gray-200 bg-white rounded-t-2xl overflow-hidden border border-gray-200">
        <button onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-medium transition-colors ${activeTab === 'orders' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          <Package className="w-4 h-4" />Список заказов
        </button>
        <button onClick={() => setActiveTab('daily')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-medium transition-colors ${activeTab === 'daily' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          <Calendar className="w-4 h-4" />Отчёт по дням
        </button>
        <button onClick={() => setActiveTab('documents')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-medium transition-colors ${activeTab === 'documents' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          <FileText className="w-4 h-4" />Документы
        </button>
      </div>

      {/* ── Daily Tab ── */}
      {activeTab === 'daily' && (
        <DailyBreakdown orders={orders} />
      )}

      {/* ── Documents Tab ── */}
      {activeTab === 'documents' && (() => {
        const payoutDocs = [
          { id: `pd-1`, name: 'Акт выполненных работ', number: `АВР-${payoutId}`, date: '14.03.2026', size: '1.2 МБ', status: payoutStatus === 'completed' ? 'signed' as const : 'pending' as const, type: 'PDF',
            signedBy: payoutStatus === 'completed' ? partner.name : undefined, signedAt: payoutStatus === 'completed' ? '14.03.2026' : undefined,
            content: { title: 'Акт выполненных работ', number: `АВР-${payoutId}`, date: '14.03.2026', organization: partner.legalName,
              headerFields: [{ label: 'Исполнитель', value: partner.legalName }, { label: 'ИНН', value: partner.inn }, { label: 'Заказчик', value: 'ООО «Лог-Хаб»' }, { label: 'Период', value: '01.03.2026 — 14.03.2026' }],
              tableHeaders: ['Услуга', 'Кол-во', 'Стоимость', 'Сумма'],
              tableRows: [['Выполнение заказов', `${summary.totalOrders}`, `${fmtRub(summary.totalGross / summary.totalOrders)}`, fmtRub(summary.totalGross)], ['Комиссия платформы', '—', '—', `- ${fmtRub(summary.totalCommission)}`], ['Возвраты', `${summary.refundedOrders}`, '—', `- ${fmtRub(summary.totalRefunds)}`]],
              totalRow: ['Итого к выплате', '', '', fmtRub(summary.totalNet)],
              signatures: [{ role: 'Заказчик', name: 'Директор ООО «Лог-Хаб»', signed: payoutStatus === 'completed', date: payoutStatus === 'completed' ? '14.03.2026' : undefined }, { role: 'Исполнитель', name: partner.name, signed: payoutStatus === 'completed', date: payoutStatus === 'completed' ? '14.03.2026' : undefined }],
              stamp: 'Печать ООО «Лог-Хаб»', qrCode: true } },
          { id: `pd-2`, name: 'Платёжное поручение', number: `ПП-${payoutId}`, date: '14.03.2026', size: '0.8 МБ', status: payoutStatus === 'completed' ? 'signed' as const : 'draft' as const, type: 'PDF',
            content: { title: 'Платёжное поручение', number: `ПП-${payoutId}`, date: '14.03.2026', organization: 'ООО «Лог-Хаб»',
              headerFields: [{ label: 'Плательщик', value: 'ООО «Лог-Хаб»' }, { label: 'Получатель', value: partner.legalName }, { label: 'ИНН получателя', value: partner.inn }, { label: 'Банк', value: partner.bank }, { label: 'Р/с', value: partner.bankAccount }, { label: 'БИК', value: partner.bik }, { label: 'Сумма', value: fmtRub(summary.totalNet) }],
              notes: ['Назначение платежа: Оплата по акту АВР-' + payoutId + ' за выполненные услуги доставки. НДС не облагается.'],
              signatures: [{ role: 'Директор', name: 'Петров И.С.', signed: payoutStatus === 'completed', date: payoutStatus === 'completed' ? '14.03.2026' : undefined }] } },
          { id: `pd-3`, name: 'Счёт-фактура', number: `СФ-${payoutId}`, date: '14.03.2026', size: '0.9 МБ', status: payoutStatus === 'completed' ? 'signed' as const : 'pending' as const, type: 'PDF',
            content: { title: 'Счёт-фактура', number: `СФ-${payoutId}`, date: '14.03.2026', organization: partner.legalName,
              headerFields: [{ label: 'Продавец', value: partner.legalName }, { label: 'Покупатель', value: 'ООО «Лог-Хаб»' }, { label: 'ИНН продавца', value: partner.inn }],
              tableHeaders: ['Наименование', 'Кол-во', 'Цена', 'Стоимость', 'НДС'],
              tableRows: [['Услуги доставки', `${summary.includedOrders}`, `${fmtRub(summary.totalNet / summary.includedOrders)}`, fmtRub(summary.totalNet), 'Без НДС']],
              totalRow: ['Итого', '', '', fmtRub(summary.totalNet), '0'],
              signatures: [{ role: 'Руководитель', name: partner.name, signed: payoutStatus === 'completed' }] } },
        ];

        const DOC_STATUS: Record<string, { label: string; cls: string }> = {
          signed: { label: 'Подписан', cls: 'bg-green-100 text-green-700' },
          pending: { label: 'Ожидает', cls: 'bg-yellow-100 text-yellow-700' },
          draft: { label: 'Черновик', cls: 'bg-gray-100 text-gray-600' },
        };

        return (
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Документы выплаты</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{payoutDocs.length} документов</p>
                </div>
                <button onClick={() => showToast('Экспорт пакета документов запущен')}
                  className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm transition-colors">
                  <Download className="w-4 h-4" /> Скачать пакет
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['Документ', 'Номер', 'Дата', 'Статус', ''].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {payoutDocs.map(doc => {
                      const sc = DOC_STATUS[doc.status] || DOC_STATUS.draft;
                      return (
                        <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                              <span className="text-sm font-medium text-gray-900">{doc.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm font-mono text-gray-600">{doc.number}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{doc.date}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${sc.cls}`}>{sc.label}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <button onClick={() => setViewingPayoutDoc(doc)}
                                className="p-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors" title="Просмотр">
                                <Eye className="w-4 h-4" />
                              </button>
                              <button onClick={() => showToast(`Скачивание: ${doc.name}`)}
                                className="p-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors" title="Скачать">
                                <Download className="w-4 h-4" />
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
          </div>
        );
      })()}

      {/* ── Orders Table ── */}
      {activeTab === 'orders' && (
      <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        {/* Table controls */}
        <div className="px-4 py-3.5 border-b border-gray-100 flex items-center gap-3 flex-wrap bg-gray-50">
          <div className="flex items-center gap-2 font-bold text-gray-900">
            <Package className="w-4 h-4 text-blue-600" />
            Заказы за период 01–07.02.2026
          </div>

          <div className="flex items-center gap-1 ml-auto">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Поиск заказа..."
                className="pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-40"
              />
            </div>

            {/* Status filter */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
              {([
                { id: 'all' as const, label: 'Все', count: statusCounts.all },
                { id: 'completed' as const, label: 'Выполнен', count: statusCounts.completed },
                { id: 'partially_refunded' as const, label: '⚡ Возврат', count: statusCounts.partially_refunded },
                { id: 'refunded' as const, label: 'Возврат', count: statusCounts.refunded },
                { id: 'cancelled' as const, label: 'Отменён', count: statusCounts.cancelled },
              ]).filter(f => f.count > 0).map(f => (
                <button key={f.id} onClick={() => setStatusFilter(f.id)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${statusFilter === f.id ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                  {f.label}
                  <span className={`text-[9px] font-bold px-1 py-0.5 rounded-full ${statusFilter === f.id ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'}`}>{f.count}</span>
                </button>
              ))}
            </div>

            {/* Select all toggle */}
            <button onClick={toggleAll}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-xs font-medium text-gray-600 rounded-xl transition-colors">
              {selectAllMode ? <><X className="w-3 h-3" />Снять все</> : <><Check className="w-3 h-3" />Выбрать все</>}
            </button>

            {/* Export */}
            <button className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-xs font-medium text-gray-600 rounded-xl transition-colors">
              <Download className="w-3.5 h-3.5" />XLS
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="pl-4 pr-2 py-3 w-10">
                  <button
                    onClick={toggleAll}
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${selectAllMode ? 'border-blue-600 bg-blue-600' : 'border-gray-300'}`}
                    style={{ width: 18, height: 18, minWidth: 18 }}
                  >
                    {selectAllMode && <Check className="w-2.5 h-2.5 text-white" />}
                  </button>
                </th>
                <th className="px-3 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide">Заказ</th>
                <th className="px-3 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide hidden md:table-cell">Клиент</th>
                <th className="px-3 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Состав</th>
                <th className="px-3 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wide">Брутто</th>
                <th className="px-3 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Комиссия</th>
                <th className="px-3 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Возврат</th>
                <th className="px-3 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wide">К выплате</th>
                <th className="px-3 py-3 pr-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide">Статус</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-gray-400">
                    <Package className="w-10 h-10 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">Нет заказов по фильтру</p>
                  </td>
                </tr>
              ) : (
                filtered.map(order => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    onToggle={toggleOrder}
                    expanded={expandedId === order.id}
                    onExpand={id => setExpandedId(prev => prev === id ? null : id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        <div className="px-4 py-3.5 border-t border-gray-100 bg-gray-50 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>Показано: {filtered.length} из {orders.length}</span>
            <span className="w-px h-3 bg-gray-300" />
            <span>Включено в выплату: <span className="font-bold text-blue-700">{summary.includedOrders}</span></span>
            <span className="w-px h-3 bg-gray-300" />
            <span>Исключено: <span className="font-bold text-gray-600">{summary.excludedOrders}</span></span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-gray-500">Итого к выплате (выбранные):</span>
            <span className="font-black text-green-700 text-base">{fmtRub(summary.totalNet)}</span>
          </div>
        </div>
      </div>

      {/* ── Refund Breakdown Panel ── */}
      {summary.refundOrdersCount > 0 && (
        <div className="bg-white border border-amber-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-amber-100 bg-amber-50 flex items-center gap-3">
            <RotateCcw className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="flex-1">
              <p className="font-bold text-amber-900">Возвраты покупателей — влияют на сумму выплаты</p>
              <p className="text-xs text-amber-600 mt-0.5">{summary.refundOrdersCount} заказов с возвратами · Итого удержано: {fmtRub(summary.totalRefunds)}</p>
            </div>
            <span className="text-xs font-bold text-amber-700 bg-amber-100 px-3 py-1.5 rounded-xl">
              Удержано: −{fmtRub(summary.totalRefunds)}
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {orders.filter(o => o.refundAmount > 0).map(o => (
              <div key={o.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                <div className="w-8 h-8 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
                  <RotateCcw className="w-4 h-4 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-700">{o.id}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${ORDER_STATUS_CFG[o.status].bg} ${ORDER_STATUS_CFG[o.status].color}`}>
                      {ORDER_STATUS_CFG[o.status].label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {o.date} · {o.customer} · {o.refundReason ? REFUND_REASONS[o.refundReason] : 'Причина не указана'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-500">Заказ: {fmtRub(o.gross)}</p>
                  <p className="text-sm font-bold text-red-600">Возврат: −{fmtRub(o.refundAmount)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button className="p-1.5 hover:bg-green-50 text-green-600 rounded-lg transition-colors" title="Одобрить возврат">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors" title="Оспорить возврат">
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <button className="p-1.5 hover:bg-gray-100 text-gray-400 rounded-lg transition-colors">
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
      )} {/* end activeTab === 'orders' */}

      {/* ── Sticky Action Bar ── */}
      <div className="sticky bottom-0 bg-white border border-gray-200 rounded-2xl shadow-lg p-4 flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500">Итого к выплате · {summary.includedOrders} заказов выбрано</p>
          <p className="text-2xl font-black text-gray-900">{fmtRub(summary.totalNet)}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Save selection */}
          <button
            onClick={() => showToast('✅ Состав выплаты сохранён')}
            className="flex items-center gap-1.5 px-3 py-2.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-xl text-sm font-medium transition-colors"
          >
            <FileText className="w-4 h-4" />Сохранить состав
          </button>

          {/* Print */}
          <button className="flex items-center gap-1.5 px-3 py-2.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 rounded-xl text-sm font-medium transition-colors">
            <Printer className="w-4 h-4" />Акт
          </button>

          {/* Email partner */}
          <button onClick={() => showToast(`📧 Уведомление отправлено на ${partner.email}`)}
            className="flex items-center gap-1.5 px-3 py-2.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 rounded-xl text-sm font-medium transition-colors">
            <Mail className="w-4 h-4" />Email партнёру
          </button>

          {/* Hold */}
          {payoutStatus === 'pending' && (
            <button onClick={() => setShowHold(true)}
              className="flex items-center gap-1.5 px-3 py-2.5 border border-orange-300 text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-xl text-sm font-medium transition-colors">
              <CircleAlert className="w-4 h-4" />Заморозить
            </button>
          )}

          {/* Reject */}
          {(payoutStatus === 'pending' || payoutStatus === 'on_hold') && (
            <button onClick={() => setShowReject(true)}
              className="flex items-center gap-1.5 px-3 py-2.5 border border-red-300 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl text-sm font-medium transition-colors">
              <XCircle className="w-4 h-4" />Отклонить
            </button>
          )}

          {/* Approve */}
          {(payoutStatus === 'pending' || payoutStatus === 'on_hold') && (
            <button
              onClick={() => setShowApprove(true)}
              disabled={summary.includedOrders === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-colors shadow-sm shadow-green-200"
            >
              <CheckCircle2 className="w-4 h-4" />
              Одобрить выплату {fmtRub(summary.totalNet)}
            </button>
          )}

          {payoutStatus === 'processing' && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl text-sm font-bold text-blue-700">
              <RefreshCw className="w-4 h-4 animate-spin" />В обработке…
            </div>
          )}
          {payoutStatus === 'completed' && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-200 rounded-xl text-sm font-bold text-green-700">
              <CheckCircle2 className="w-4 h-4" />Выплачено
            </div>
          )}
          {payoutStatus === 'failed' && (
            <button onClick={() => setPayoutStatus('pending')}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-colors">
              <RefreshCw className="w-4 h-4" />Повторить
            </button>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {showApprove && (
        <ApproveModal
          netAmount={summary.totalNet}
          onConfirm={() => { setPayoutStatus('processing'); showToast(`✅ Выплата ${fmtRub(summary.totalNet)} одобрена и отправлена в банк`); setTimeout(() => setPayoutStatus('completed'), 3000); }}
          onClose={() => setShowApprove(false)}
        />
      )}
      {showHold && (
        <HoldModal
          onConfirm={(reason) => { setPayoutStatus('on_hold'); showToast(`⚠️ Выплата заморожена: ${reason}`); }}
          onClose={() => setShowHold(false)}
        />
      )}
      {showReject && (
        <RejectModal
          onConfirm={(reason) => { setPayoutStatus('failed'); showToast(`❌ Выплата отклонена: ${reason}`); }}
          onClose={() => setShowReject(false)}
        />
      )}

      {/* ── Document Viewer ── */}
      {viewingPayoutDoc && ReactDOM.createPortal(
        <DocumentViewerModal doc={viewingPayoutDoc} onClose={() => setViewingPayoutDoc(null)} />,
        document.body
      )}

      {/* ── Toast ── */}
      {toast && ReactDOM.createPortal(
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] px-5 py-3 bg-gray-900 text-white text-sm font-medium rounded-2xl shadow-2xl whitespace-nowrap">
          {toast}
        </div>,
        document.body
      )}
    </div>
  );
}
