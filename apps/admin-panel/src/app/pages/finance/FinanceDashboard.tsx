import { useState, useMemo, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area,
} from 'recharts';
import {
  DollarSign, TrendingUp, TrendingDown, FileText, CreditCard,
  ArrowUpRight, ArrowDownRight, CheckCircle2, Clock, AlertTriangle,
  RotateCcw, Download, Filter, ChevronRight, Plus, Search,
  Bike, Store, Building2, Shield, RefreshCw, X, Check,
  Wallet, Banknote, Receipt, BarChart2, Activity, Users,
  ExternalLink, Eye, MoreVertical, CircleAlert, Percent,
  ArrowRight, Calendar, ChevronDown, Package, Pencil as Edit2, Save,
  Printer, FileSpreadsheet, Copy, Trash2, ChevronUp, Ban,
  SendHorizontal, SlidersHorizontal,
} from 'lucide-react';
import { ChartWrapper } from '../../components/ui/ChartWrapper';

// ─── Types ────────────────────────────────────────────────────────────────────

type PayoutStatus   = 'pending' | 'processing' | 'completed' | 'failed' | 'on_hold';
type PayoutType     = 'courier' | 'merchant' | 'pvz';
type TransactionType = 'order_payment' | 'payout' | 'refund' | 'commission' | 'fee' | 'adjustment';
type TimeRange      = '1d' | '7d' | '30d' | '90d';

interface Payout {
  id: string;
  type:   PayoutType;
  name:   string;
  amount: number;
  status: PayoutStatus;
  period: string;
  orders: number;
  commission: number;
  createdAt: string;
  processedAt?: string;
  bank?: string;
  bankAccount?: string;
  note?: string;
}

interface Transaction {
  id: string;
  type: TransactionType;
  description: string;
  amount: number;
  direction: 'in' | 'out';
  status: 'completed' | 'pending' | 'failed';
  timestamp: string;
  reference?: string;
  counterparty?: string;
}

interface CommissionRate {
  type: string;
  courier: number;
  merchant: number;
  pvz: number;
  minOrder: number;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const REVENUE_DATA = [
  { date: '25.01', gmv: 1234000, revenue: 185100, payouts: 890000, commissions: 185100, refunds: 34200 },
  { date: '26.01', gmv: 1456000, revenue: 218400, payouts: 920000, commissions: 218400, refunds: 28900 },
  { date: '27.01', gmv: 1389000, revenue: 208350, payouts: 950000, commissions: 208350, refunds: 31400 },
  { date: '28.01', gmv: 1567000, revenue: 235050, payouts: 1100000,commissions: 235050, refunds: 42100 },
  { date: '29.01', gmv: 1678000, revenue: 251700, payouts: 1150000,commissions: 251700, refunds: 38700 },
  { date: '30.01', gmv: 1823000, revenue: 273450, payouts: 1210000,commissions: 273450, refunds: 45600 },
  { date: '31.01', gmv: 1912000, revenue: 286800, payouts: 1280000,commissions: 286800, refunds: 51200 },
  { date: '01.02', gmv: 1756000, revenue: 263400, payouts: 1180000,commissions: 263400, refunds: 44100 },
  { date: '02.02', gmv: 1834000, revenue: 275100, payouts: 1230000,commissions: 275100, refunds: 47800 },
  { date: '03.02', gmv: 1948000, revenue: 292200, payouts: 1310000,commissions: 292200, refunds: 53400 },
  { date: '04.02', gmv: 2145000, revenue: 321750, payouts: 1420000,commissions: 321750, refunds: 62100 },
  { date: '05.02', gmv: 2234000, revenue: 335100, payouts: 1480000,commissions: 335100, refunds: 68900 },
  { date: '06.02', gmv: 1987000, revenue: 298050, payouts: 1310000,commissions: 298050, refunds: 55400 },
  { date: '07.02', gmv: 2089000, revenue: 313350, payouts: 1390000,commissions: 313350, refunds: 57200 },
];

const COMMISSION_BREAKDOWN = [
  { name: 'Мерчанты',   value: 62, color: '#8B5CF6' },
  { name: 'Курьеры',    value: 23, color: '#F59E0B' },
  { name: 'ПВЗ',        value: 11, color: '#10B981' },
  { name: 'Сервисный',  value: 4,  color: '#3B82F6' },
];

const PENDING_PAYOUTS: Payout[] = [
  { id: 'pay001', type: 'merchant', name: 'Кафе «Уют»',         amount: 89400,  status: 'pending',    period: '01-07.02', orders: 1234, commission: 15.0, createdAt: '07.02.2026 09:00', bank: 'Сбербанк',  bankAccount: '****3471' },
  { id: 'pay002', type: 'merchant', name: 'Пекарня «Хлеб»',     amount: 54200,  status: 'pending',    period: '01-07.02', orders: 987,  commission: 12.0, createdAt: '07.02.2026 09:00', bank: 'Тинькофф',  bankAccount: '****8823' },
  { id: 'pay003', type: 'courier',  name: 'Алексей К. (KFC)',    amount: 23400,  status: 'processing', period: '04-07.02', orders: 287,  commission: 20.0, createdAt: '07.02.2026 08:00', bank: 'Альфа',     bankAccount: '****1134', note: 'Приоритетная выплата' },
  { id: 'pay004', type: 'courier',  name: 'Михаил Д.',           amount: 19800,  status: 'processing', period: '04-07.02', orders: 241,  commission: 20.0, createdAt: '07.02.2026 08:00', bank: 'Сбербанк',  bankAccount: '****5590' },
  { id: 'pay005', type: 'pvz',      name: 'ПВЗ «Сортировочная»', amount: 12600,  status: 'on_hold',    period: '01-07.02', orders: 456,  commission: 8.0,  createdAt: '07.02.2026 07:00', bank: 'ВТБ',       bankAccount: '****2267', note: 'Требует верификации договора' },
  { id: 'pay006', type: 'merchant', name: 'TechStore MSK',        amount: 178900, status: 'pending',    period: '01-07.02', orders: 756,  commission: 13.0, createdAt: '07.02.2026 09:00', bank: 'Тинькофф',  bankAccount: '****7712' },
  { id: 'pay007', type: 'pvz',      name: 'ПВЗ «Центральный»',   amount: 8900,   status: 'failed',     period: '01-07.02', orders: 312,  commission: 8.0,  createdAt: '06.02.2026 18:00', bank: 'Сбербанк',  bankAccount: '****0043', note: 'Ошибка банковских реквизитов' },
  { id: 'pay008', type: 'merchant', name: 'FreshMarket',          amount: 32400,  status: 'pending',    period: '01-07.02', orders: 623,  commission: 11.0, createdAt: '07.02.2026 09:00', bank: 'Альфа',     bankAccount: '****9981' },
];

const RECENT_TRANSACTIONS: Transaction[] = [
  { id: 't001', type: 'order_payment', description: 'Оплата заказа ORD-2026-004821', amount: 1890, direction: 'in',  status: 'completed', timestamp: '14:32', reference: 'ORD-2026-004821', counterparty: 'Александра Морозова' },
  { id: 't002', type: 'payout',        description: 'Выплата Алексею К. — неделя',    amount: 23400, direction: 'out', status: 'completed', timestamp: '13:15', counterparty: 'Алексей К.' },
  { id: 't003', type: 'refund',        description: 'Возврат ORD-2026-004712',         amount: 2340, direction: 'out', status: 'completed', timestamp: '12:58', reference: 'ORD-2026-004712', counterparty: 'Дмитрий Соколов' },
  { id: 't004', type: 'commission',    description: 'Комиссия с Кафе «Уют» · нед.',   amount: 13410, direction: 'in', status: 'completed', timestamp: '11:00', counterparty: 'Кафе «Уют»' },
  { id: 't005', type: 'order_payment', description: 'Оплата заказа ORD-2026-004890', amount: 3450, direction: 'in',  status: 'completed', timestamp: '10:45', reference: 'ORD-2026-004890', counterparty: 'Наталья Козлова' },
  { id: 't006', type: 'fee',           description: 'Сервисный сбор — агрегация',      amount: 1200, direction: 'in',  status: 'completed', timestamp: '09:30' },
  { id: 't007', type: 'payout',        description: 'Выплата TechStore MSK — неделя',  amount: 178900, direction: 'out', status: 'pending', timestamp: '09:00', counterparty: 'TechStore MSK' },
  { id: 't008', type: 'refund',        description: 'Возврат ORD-2026-004623',         amount: 890,  direction: 'out', status: 'pending', timestamp: '08:45', reference: 'ORD-2026-004623' },
  { id: 't009', type: 'adjustment',    description: 'Корректировка комиссии — ПВЗ Центральный', amount: 450, direction: 'out', status: 'completed', timestamp: '08:20', counterparty: 'ПВЗ «Центральный»' },
  { id: 't010', type: 'commission',    description: 'Комиссия с TechStore MSK · нед.', amount: 23257, direction: 'in', status: 'completed', timestamp: '07:55', counterparty: 'TechStore MSK' },
];

const INITIAL_COMMISSION_RATES: CommissionRate[] = [
  { type: 'Рестораны / еда',    courier: 20, merchant: 15, pvz: 0, minOrder: 500 },
  { type: 'Продукты / FMCG',    courier: 22, merchant: 12, pvz: 0, minOrder: 700 },
  { type: 'Электроника',        courier: 18, merchant: 13, pvz: 8, minOrder: 1000 },
  { type: 'Одежда и аксессуары',courier: 20, merchant: 14, pvz: 8, minOrder: 800 },
  { type: 'Аптека',             courier: 25, merchant: 10, pvz: 6, minOrder: 400 },
  { type: 'ПВЗ-выдача',        courier: 0,  merchant: 0,  pvz: 8, minOrder: 0 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtRub(n: number): string {
  if (n >= 1_000_000) return `₽${(n / 1_000_000).toFixed(2)}М`;
  if (n >= 1_000)     return `₽${(n / 1_000).toFixed(1)}К`;
  return `₽${n.toLocaleString('ru-RU')}`;
}
function fmtRubShort(n: number): string {
  if (n >= 1_000_000) return `₽${(n / 1_000_000).toFixed(1)}М`;
  if (n >= 1_000)     return `₽${(n / 1_000).toFixed(0)}К`;
  return `₽${n}`;
}

const PAYOUT_STATUS_CFG: Record<PayoutStatus, { label: string; bg: string; color: string; dot: string; icon: React.ElementType }> = {
  pending:    { label: 'Ожидает',    bg: 'bg-yellow-50',  color: 'text-yellow-700', dot: 'bg-yellow-400', icon: Clock },
  processing: { label: 'В обработке',bg: 'bg-blue-50',    color: 'text-blue-700',   dot: 'bg-blue-500',   icon: RefreshCw },
  completed:  { label: 'Выполнена',  bg: 'bg-green-50',   color: 'text-green-700',  dot: 'bg-green-500',  icon: CheckCircle2 },
  failed:     { label: 'Ошибка',     bg: 'bg-red-50',     color: 'text-red-700',    dot: 'bg-red-500',    icon: AlertTriangle },
  on_hold:    { label: 'На удержании',bg: 'bg-orange-50', color: 'text-orange-700', dot: 'bg-orange-500', icon: CircleAlert },
};

const TYPE_CFG: Record<PayoutType, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  courier:  { label: 'Курьер',   icon: Bike,      color: 'text-orange-600', bg: 'bg-orange-50' },
  merchant: { label: 'Мерчант',  icon: Store,     color: 'text-purple-600', bg: 'bg-purple-50' },
  pvz:      { label: 'ПВЗ',      icon: Building2, color: 'text-teal-600',   bg: 'bg-teal-50' },
};

const TX_CFG: Record<TransactionType, { label: string; icon: React.ElementType; color: string }> = {
  order_payment: { label: 'Оплата заказа', icon: Package,    color: 'text-blue-600' },
  payout:        { label: 'Выплата',       icon: Wallet,     color: 'text-orange-600' },
  refund:        { label: 'Возврат',       icon: RotateCcw,  color: 'text-red-600' },
  commission:    { label: 'Комиссия',      icon: Percent,    color: 'text-green-600' },
  fee:           { label: 'Сбор',          icon: Receipt,    color: 'text-gray-600' },
  adjustment:    { label: 'Корректировка', icon: Activity,   color: 'text-indigo-600' },
};

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white rounded-xl px-3 py-2.5 shadow-xl text-xs space-y-1 border border-gray-700 min-w-[160px]">
      <p className="text-gray-400 font-medium mb-1.5">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-gray-300">{p.name}:</span>
          <span className="font-bold ml-auto">{fmtRubShort(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

// Sparkline helper: builds an SVG polyline path from a data array
function makeSpark(data: number[]): string {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const W = 80, H = 24;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 2) - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return `M ${pts.join(' L ')}`;
}

const SPARK_GMV  = makeSpark(REVENUE_DATA.map(d => d.gmv));
const SPARK_REV  = makeSpark(REVENUE_DATA.map(d => d.revenue));
const SPARK_PAY  = makeSpark(REVENUE_DATA.map(d => d.payouts));
const SPARK_REF  = makeSpark(REVENUE_DATA.map(d => d.refunds));
const SPARK_PEND = makeSpark([340000,280000,410000,520000,380000,460000,490000,520000,390000,430000,354900,400000,360000,354900]);

function KpiCardSparkline({ d, color }: { d: string; color: string }) {
  const parts = d.split(' ');
  const lastPair = parts[parts.length - 1].split(',');
  const lx = parseFloat(lastPair[0]);
  const ly = parseFloat(lastPair[1]);
  return (
    <div className="mt-2 -mx-1">
      <svg viewBox="0 0 80 24" preserveAspectRatio="none" className="w-full" style={{ height: 26 }}>
        <path d={`${d} V 24 H 0 Z`} fill={color} fillOpacity={0.10} />
        <path d={d} fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={lx} cy={ly} r={2.4} fill={color} />
      </svg>
    </div>
  );
}

function KpiCard({ label, value, sub, trend, icon: Icon, color, bg, spark, sparkColor, onClick }: {
  label: string; value: string; sub?: string; trend?: number;
  icon: React.ElementType; color: string; bg: string;
  spark?: string; sparkColor?: string;
  onClick?: () => void;
}) {
  const up = (trend ?? 0) >= 0;
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`relative bg-white border border-gray-200 rounded-2xl p-4 overflow-hidden group hover:shadow-lg hover:border-gray-300 transition-all duration-200 flex flex-col min-w-0 text-left w-full ${onClick ? 'cursor-pointer active:scale-[0.98]' : 'cursor-default'}`}
    >
      {/* Top row: icon + trend badge */}
      <div className="flex items-start justify-between gap-2 shrink-0">
        <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center shrink-0`}>
          <Icon className={`w-[18px] h-[18px] ${color}`} />
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-0.5 text-[11px] font-bold shrink-0 px-1.5 py-0.5 rounded-lg leading-none ${
            up ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'
          }`}>
            {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {up ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      {/* Value — clamps font size to avoid overflow */}
      <p
        className={`mt-2.5 truncate ${color}`}
        style={{ fontSize: 'clamp(0.95rem, 2vw, 1.35rem)', fontWeight: 900, lineHeight: 1.15 }}
      >
        {value}
      </p>
      {/* Label */}
      <p className="text-[11px] text-gray-500 mt-0.5 truncate leading-snug">{label}</p>
      {/* Sub-label */}
      {sub && <p className="text-[10px] text-gray-400 mt-0.5 truncate">{sub}</p>}
      {/* Mini sparkline */}
      {spark && <KpiCardSparkline d={spark} color={sparkColor ?? '#3b82f6'} />}
      {/* Decorative glow */}
      <div
        className={`pointer-events-none absolute bottom-0 right-0 w-14 h-14 ${bg} rounded-full blur-2xl opacity-0 group-hover:opacity-80 transition-opacity duration-300`}
        style={{ transform: 'translate(30%, 30%)' }}
      />
    </button>
  );
}

// ─── Context Menu (Portal) ─────────────────────────────────────────────────────

function PayoutContextMenu({
  payout, pos, onClose, onApprove, onHold, onRetry, onCancel
}: {
  payout: Payout;
  pos: { x: number; y: number };
  onClose: () => void;
  onApprove: (id: string) => void;
  onHold: (id: string) => void;
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  // Clamp to viewport
  const left = Math.min(pos.x, window.innerWidth - 200);
  const top  = Math.min(pos.y, window.innerHeight - 240);

  const menu = (
    <div
      ref={ref}
      style={{ position: 'fixed', left, top, zIndex: 9999 }}
      className="w-48 bg-white border border-gray-200 rounded-2xl shadow-2xl py-1.5 overflow-hidden"
    >
      <div className="px-3 py-2 border-b border-gray-100 mb-1">
        <p className="text-xs font-semibold text-gray-700 truncate">{payout.name}</p>
        <p className="text-[10px] text-gray-400">{fmtRub(payout.amount)}</p>
      </div>
      <Link
        to={`/finance/payouts/${payout.id}`}
        onClick={onClose}
        className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
      >
        <Eye className="w-3.5 h-3.5" />Открыть детали
      </Link>
      {payout.status === 'pending' && (
        <>
          <button
            onClick={() => { onApprove(payout.id); onClose(); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-green-700 hover:bg-green-50 transition-colors"
          >
            <Check className="w-3.5 h-3.5" />Одобрить
          </button>
          <button
            onClick={() => { onHold(payout.id); onClose(); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-orange-700 hover:bg-orange-50 transition-colors"
          >
            <CircleAlert className="w-3.5 h-3.5" />Заморозить
          </button>
        </>
      )}
      {payout.status === 'failed' && (
        <button
          onClick={() => { onRetry(payout.id); onClose(); }}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-blue-700 hover:bg-blue-50 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />Повторить
        </button>
      )}
      {payout.status === 'on_hold' && (
        <button
          onClick={() => { onApprove(payout.id); onClose(); }}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-green-700 hover:bg-green-50 transition-colors"
        >
          <Check className="w-3.5 h-3.5" />Разблокировать
        </button>
      )}
      <button
        onClick={() => {
          navigator.clipboard.writeText(payout.id).then(() => toast.success('ID скопирован'));
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <Copy className="w-3.5 h-3.5" />Скопировать ID
      </button>
      <div className="border-t border-gray-100 mt-1 pt-1">
        <button
          onClick={() => { onCancel(payout.id); onClose(); }}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
        >
          <Ban className="w-3.5 h-3.5" />Отменить выплату
        </button>
      </div>
    </div>
  );

  return ReactDOM.createPortal(menu, document.body);
}

// ─── Batch Approve Modal (Portal) ─────────────────────────────────────────────

function BatchApproveModal({ count, amount, onConfirm, onCancel }: {
  count: number; amount: number; onConfirm: () => void; onCancel: () => void;
}) {
  const modal = (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 bg-green-100 rounded-xl flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Подтверждение выплат</h3>
            <p className="text-xs text-gray-500 mt-0.5">Массовое одобрение</p>
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Выплат к одобрению:</span>
            <span className="font-bold text-gray-900">{count}</span>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-sm text-gray-600">Итоговая сумма:</span>
            <span className="text-xl font-black text-green-700">{fmtRub(amount)}</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mb-5">
          Все ожидающие выплаты будут переведены в статус «В обработке» и отправлены в банк-эквайе��. Действие необратимо.
        </p>
        <div className="flex items-center gap-2">
          <button onClick={onCancel}
            className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
            Отмена
          </button>
          <button onClick={onConfirm}
            className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2">
            <Check className="w-4 h-4" />Одобрить все
          </button>
        </div>
      </div>
    </div>
  );
  return ReactDOM.createPortal(modal, document.body);
}

// ─── Report Export Modal (Portal) ────────────────────────────────────────────

function ReportExportModal({ onClose, totals }: {
  onClose: () => void;
  totals: { gmv: number; revenue: number; payoutsTotal: number; refunds: number; commissions: number };
}) {
  const [format, setFormat] = useState<'csv' | 'xlsx' | 'pdf'>('csv');
  const [sections, setSections] = useState({ revenue: true, payouts: true, transactions: true, commissions: true });
  const [loading, setLoading] = useState(false);

  function handleExport() {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onClose();
      // Simulate CSV download
      if (format === 'csv') {
        const rows = [
          ['Метрика', 'Значение'],
          ['GMV (14 дней)', fmtRub(totals.gmv)],
          ['Выручка платформы', fmtRub(totals.revenue)],
          ['Выплаты партнёрам', fmtRub(totals.payoutsTotal)],
          ['Возвраты', fmtRub(totals.refunds)],
          ['Комиссии', fmtRub(totals.commissions)],
        ];
        const csv = rows.map(r => r.join(';')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `finance_report_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
      toast.success('Отчёт сформирован и скачан');
    }, 1200);
  }

  const modal = (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Экспорт финансового отчёта</h3>
              <p className="text-xs text-gray-500 mt-0.5">Период: 25.01 — 07.02.2026</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Format */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-500 mb-2">Формат файла</p>
          <div className="flex gap-2">
            {(['csv', 'xlsx', 'pdf'] as const).map(f => (
              <button key={f} onClick={() => setFormat(f)}
                className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                  format === f ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200 text-gray-600 hover:border-blue-300'
                }`}>
                .{f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Sections */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-gray-500 mb-2">Разделы отчёта</p>
          <div className="space-y-2">
            {[
              { key: 'revenue', label: 'Динамика выручки и GMV' },
              { key: 'payouts', label: 'Реестр выплат партнёрам' },
              { key: 'transactions', label: 'Транзакции' },
              { key: 'commissions', label: 'Разбивка комиссий' },
            ].map(s => (
              <label key={s.key} className="flex items-center gap-3 p-2.5 border border-gray-100 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="checkbox"
                  checked={sections[s.key as keyof typeof sections]}
                  onChange={e => setSections(prev => ({ ...prev, [s.key]: e.target.checked }))}
                  className="w-4 h-4 accent-blue-600"
                />
                <span className="text-sm text-gray-700">{s.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="bg-gray-50 rounded-xl p-3.5 mb-5 grid grid-cols-2 gap-2 text-xs">
          <div><span className="text-gray-400">GMV:</span> <span className="font-semibold text-gray-800">{fmtRub(totals.gmv)}</span></div>
          <div><span className="text-gray-400">Выручка:</span> <span className="font-semibold text-gray-800">{fmtRub(totals.revenue)}</span></div>
          <div><span className="text-gray-400">Выплаты:</span> <span className="font-semibold text-gray-800">{fmtRub(totals.payoutsTotal)}</span></div>
          <div><span className="text-gray-400">Возвраты:</span> <span className="font-semibold text-gray-800">{fmtRub(totals.refunds)}</span></div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
            Отмена
          </button>
          <button onClick={handleExport} disabled={loading}
            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2">
            {loading ? (
              <><RefreshCw className="w-4 h-4 animate-spin" />Формирование...</>
            ) : (
              <><Download className="w-4 h-4" />Скачать</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
  return ReactDOM.createPortal(modal, document.body);
}

// ─── Edit Rates Modal (Portal) ────────────────────────────────────────────────

function EditRatesModal({ rates, onClose, onSave }: {
  rates: CommissionRate[];
  onClose: () => void;
  onSave: (updated: CommissionRate[]) => void;
}) {
  const [draft, setDraft] = useState<CommissionRate[]>(rates.map(r => ({ ...r })));
  const [saving, setSaving] = useState(false);

  function update(i: number, field: keyof CommissionRate, val: number) {
    setDraft(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  }

  function handleSave() {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      onSave(draft);
      onClose();
      toast.success('Ставки комиссий обновлены');
    }, 900);
  }

  const modal = (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-purple-50 rounded-xl flex items-center justify-center">
              <Percent className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Редактировать комиссионные ставки</h3>
              <p className="text-xs text-gray-400 mt-0.5">Изменения вступят в силу со следующей расчётной недели</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-center gap-2 text-xs text-amber-700">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Изменение ставок требует одобрения CFO. После сохранения будет создана заявка на согласование.
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left text-xs font-semibold text-gray-500 px-3 py-2.5 rounded-l-xl">Категория</th>
                  <th className="text-center text-xs font-semibold text-orange-600 px-3 py-2.5">Курьер %</th>
                  <th className="text-center text-xs font-semibold text-purple-600 px-3 py-2.5">Мерчант %</th>
                  <th className="text-center text-xs font-semibold text-teal-600 px-3 py-2.5">ПВЗ %</th>
                  <th className="text-center text-xs font-semibold text-gray-500 px-3 py-2.5 rounded-r-xl">Мин. заказ ₽</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {draft.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-3 py-3">
                      <span className="text-sm font-medium text-gray-800">{r.type}</span>
                    </td>
                    {(['courier', 'merchant', 'pvz'] as const).map(field => (
                      <td key={field} className="px-3 py-3">
                        <div className="flex items-center justify-center">
                          <input
                            type="number"
                            min={0}
                            max={50}
                            step={0.5}
                            value={r[field]}
                            onChange={e => update(i, field, parseFloat(e.target.value) || 0)}
                            className={`w-16 text-center border rounded-lg py-1.5 text-sm font-bold focus:outline-none focus:ring-2 transition-colors ${
                              field === 'courier' ? 'border-orange-200 text-orange-700 focus:ring-orange-300 bg-orange-50' :
                              field === 'merchant' ? 'border-purple-200 text-purple-700 focus:ring-purple-300 bg-purple-50' :
                              'border-teal-200 text-teal-700 focus:ring-teal-300 bg-teal-50'
                            } ${r[field] === 0 ? 'opacity-40' : ''}`}
                          />
                        </div>
                      </td>
                    ))}
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center">
                        <input
                          type="number"
                          min={0}
                          step={100}
                          value={r.minOrder}
                          onChange={e => update(i, 'minOrder', parseInt(e.target.value) || 0)}
                          className="w-20 text-center border border-gray-200 rounded-lg py-1.5 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-2">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
            Отмена
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-[2] px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2">
            {saving ? <><RefreshCw className="w-4 h-4 animate-spin" />Сохранение...</> : <><Save className="w-4 h-4" />Отправить на согласование</>}
          </button>
        </div>
      </div>
    </div>
  );
  return ReactDOM.createPortal(modal, document.body);
}

// ─── Payout Row ───────────────────────────────────────────────────────────────

function PayoutRow({
  p, onApprove, onHold, onRetry, onContextMenu
}: {
  p: Payout;
  onApprove: (id: string) => void;
  onHold: (id: string) => void;
  onRetry: (id: string) => void;
  onContextMenu: (payout: Payout, x: number, y: number) => void;
}) {
  const st  = PAYOUT_STATUS_CFG[p.status];
  const tp  = TYPE_CFG[p.type];
  const Icon = tp.icon;
  const StIcon = st.icon;

  return (
    <div className={`flex items-center gap-4 px-4 py-3.5 border-b border-gray-100 hover:bg-gray-50 transition-colors last:border-0 ${p.status === 'failed' ? 'bg-red-50/40' : p.status === 'on_hold' ? 'bg-orange-50/40' : ''}`}>
      <div className={`w-9 h-9 ${tp.bg} rounded-xl flex items-center justify-center shrink-0`}>
        <Icon className={`w-4 h-4 ${tp.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tp.bg} ${tp.color}`}>{tp.label}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400 flex-wrap">
          <span>Период: {p.period}</span>
          <span>·</span>
          <span>{p.orders} заказов</span>
          <span>·</span>
          <span>Комиссия: {p.commission}%</span>
          {p.note && <span className="text-orange-600 font-medium">⚠️ {p.note}</span>}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="font-black text-gray-900">{fmtRub(p.amount)}</p>
        {p.bank && <p className="text-xs text-gray-400 mt-0.5">{p.bank} {p.bankAccount}</p>}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl ${st.bg} ${st.color}`}>
          <StIcon className="w-3 h-3" />
          {st.label}
        </span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {p.status === 'pending' && (
          <div style={{display:'contents'}}>
            <button onClick={() => onApprove(p.id)}
              className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors" title="Одобрить">
              <Check className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onHold(p.id)}
              className="p-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg transition-colors" title="Заморозить">
              <CircleAlert className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {p.status === 'failed' && (
          <button onClick={() => onRetry(p.id)}
            className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors" title="Повторить">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
        <Link
          to={`/finance/payouts/${p.id}`}
          className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
          title="Посмотреть заказы"
        >
          <Eye className="w-3.5 h-3.5" />
        </Link>
        <button
          onClick={e => onContextMenu(p, e.clientX, e.clientY)}
          className="p-2 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
          title="Больше действий"
        >
          <MoreVertical className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function FinanceDashboard() {
  const [payouts, setPayouts] = useState<Payout[]>(PENDING_PAYOUTS);
  const [activeTab, setActiveTab] = useState<'overview' | 'payouts' | 'transactions' | 'rates'>('overview');
  const [payoutFilter, setPayoutFilter] = useState<PayoutStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<PayoutType | 'all'>('all');
  const [search, setSearch] = useState('');
  const [range, setRange] = useState<TimeRange>('14d' as TimeRange);

  // Modal / overlay states
  const [showBatchApprove, setShowBatchApprove] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showEditRates, setShowEditRates] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ payout: Payout; x: number; y: number } | null>(null);

  // Transactions tab state
  const [txSearch, setTxSearch] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState<TransactionType | 'all'>('all');
  const [txDirectionFilter, setTxDirectionFilter] = useState<'all' | 'in' | 'out'>('all');

  // Commission rates (editable)
  const [commissionRates, setCommissionRates] = useState<CommissionRate[]>(INITIAL_COMMISSION_RATES);

  const totals = useMemo(() => ({
    gmv:           REVENUE_DATA.reduce((s, d) => s + d.gmv, 0),
    revenue:       REVENUE_DATA.reduce((s, d) => s + d.revenue, 0),
    payoutsTotal:  REVENUE_DATA.reduce((s, d) => s + d.payouts, 0),
    refunds:       REVENUE_DATA.reduce((s, d) => s + d.refunds, 0),
    commissions:   REVENUE_DATA.reduce((s, d) => s + d.commissions, 0),
  }), []);

  const pendingCount   = payouts.filter(p => p.status === 'pending').length;
  const pendingAmount  = payouts.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0);
  const processingAmount = payouts.filter(p => p.status === 'processing').reduce((s, p) => s + p.amount, 0);
  const failedCount    = payouts.filter(p => p.status === 'failed').length;
  const onHoldCount    = payouts.filter(p => p.status === 'on_hold').length;

  const filteredPayouts = useMemo(() => {
    let list = payouts;
    if (payoutFilter !== 'all') list = list.filter(p => p.status === payoutFilter);
    if (typeFilter !== 'all')   list = list.filter(p => p.type === typeFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q));
    }
    return list;
  }, [payouts, payoutFilter, typeFilter, search]);

  const filteredTransactions = useMemo(() => {
    let list = RECENT_TRANSACTIONS;
    if (txTypeFilter !== 'all')      list = list.filter(t => t.type === txTypeFilter);
    if (txDirectionFilter !== 'all') list = list.filter(t => t.direction === txDirectionFilter);
    if (txSearch) {
      const q = txSearch.toLowerCase();
      list = list.filter(t =>
        t.description.toLowerCase().includes(q) ||
        (t.reference && t.reference.toLowerCase().includes(q)) ||
        (t.counterparty && t.counterparty.toLowerCase().includes(q))
      );
    }
    return list;
  }, [txSearch, txTypeFilter, txDirectionFilter]);

  function approveAll() {
    setPayouts(prev => prev.map(p => p.status === 'pending' ? { ...p, status: 'processing' } : p));
    toast.success(`${pendingCount} выплат отправлено в обработку`);
  }
  function approvePayout(id: string) {
    const p = payouts.find(x => x.id === id);
    setPayouts(prev => prev.map(p => p.id === id ? { ...p, status: 'processing' } : p));
    if (p) toast.success(`Выплата ${p.name} одобрена`);
  }
  function holdPayout(id: string) {
    const p = payouts.find(x => x.id === id);
    setPayouts(prev => prev.map(p => p.id === id ? { ...p, status: 'on_hold' } : p));
    if (p) toast.warning(`Выплата ${p.name} заморожена`);
  }
  function retryPayout(id: string) {
    const p = payouts.find(x => x.id === id);
    setPayouts(prev => prev.map(p => p.id === id ? { ...p, status: 'processing', note: undefined } : p));
    if (p) toast.success(`Повтор выплаты ${p.name} запущен`);
  }
  function cancelPayout(id: string) {
    const p = payouts.find(x => x.id === id);
    setPayouts(prev => prev.filter(p => p.id !== id));
    if (p) toast.error(`Выплата ${p.name} отменена`);
  }

  function exportTransactions() {
    const rows = [
      ['ID', 'Тип', 'Описание', 'Сумма', 'Направление', 'Статус', 'Время'],
      ...filteredTransactions.map(t => [
        t.id, TX_CFG[t.type].label, t.description,
        fmtRub(t.amount), t.direction === 'in' ? 'Приход' : 'Расход',
        t.status, t.timestamp,
      ])
    ];
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Транзакции экспортированы');
  }

  const tabs = [
    { id: 'overview'     as const, label: 'Обзор',       icon: BarChart2 },
    { id: 'payouts'      as const, label: 'Выплаты',     icon: Wallet,   badge: pendingCount },
    { id: 'transactions' as const, label: 'Транзакции',  icon: Activity },
    { id: 'rates'        as const, label: 'Комиссии',    icon: Percent },
  ];

  const txIn  = filteredTransactions.filter(t => t.direction === 'in').reduce((s, t) => s + t.amount, 0);
  const txOut = filteredTransactions.filter(t => t.direction === 'out').reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Финансы</h1>
          <p className="text-sm text-gray-500 mt-0.5">Выплаты, комиссии, транзакции и финансовая отчётность</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowReportModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 rounded-xl text-xs font-medium transition-colors">
            <Download className="w-3.5 h-3.5" />Отчёт
          </button>
          <Link to="/finance/payouts"
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors">
            <Wallet className="w-4 h-4" />Все выплаты
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard
          label="GMV (14 дней)"
          value={fmtRub(totals.gmv)}
          trend={+11.2}
          icon={DollarSign}
          color="text-blue-700"
          bg="bg-blue-50"
          spark={SPARK_GMV}
          sparkColor="#2563eb"
          onClick={() => setActiveTab('overview')}
        />
        <KpiCard
          label="Выручка платформы"
          value={fmtRub(totals.revenue)}
          trend={+13.4}
          icon={TrendingUp}
          color="text-green-700"
          bg="bg-green-50"
          sub={`${+((totals.revenue/totals.gmv)*100).toFixed(1)}% от GMV`}
          spark={SPARK_REV}
          sparkColor="#16a34a"
          onClick={() => setActiveTab('overview')}
        />
        <KpiCard
          label="Выплаты партнёрам"
          value={fmtRub(totals.payoutsTotal)}
          trend={+9.8}
          icon={Banknote}
          color="text-purple-700"
          bg="bg-purple-50"
          spark={SPARK_PAY}
          sparkColor="#7c3aed"
          onClick={() => setActiveTab('payouts')}
        />
        <KpiCard
          label="Ожидают выплаты"
          value={fmtRub(pendingAmount)}
          icon={Clock}
          color="text-yellow-700"
          bg="bg-yellow-50"
          sub={`${pendingCount} выплат`}
          spark={SPARK_PEND}
          sparkColor="#ca8a04"
          onClick={() => { setActiveTab('payouts'); setPayoutFilter('pending'); }}
        />
        <KpiCard
          label="Возвраты за период"
          value={fmtRub(totals.refunds)}
          trend={-3.1}
          icon={RotateCcw}
          color="text-red-700"
          bg="bg-red-50"
          sub={`${+((totals.refunds/totals.gmv)*100).toFixed(2)}% от GMV`}
          spark={SPARK_REF}
          sparkColor="#dc2626"
          onClick={() => setActiveTab('transactions')}
        />
      </div>

      {/* Alert bar */}
      {(failedCount > 0 || onHoldCount > 0) && (
        <div className="flex items-center gap-3 p-3.5 bg-orange-50 border border-orange-200 rounded-2xl flex-wrap">
          <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-orange-800">Требуется внимание</p>
            <p className="text-xs text-orange-600 mt-0.5">
              {failedCount > 0 && `${failedCount} выплат с ошибкой · `}
              {onHoldCount > 0 && `${onHoldCount} на удержании`}
            </p>
          </div>
          <button onClick={() => { setActiveTab('payouts'); setPayoutFilter('failed'); }}
            className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-semibold transition-colors shrink-0">
            Просмотреть
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-sm font-medium transition-colors relative ${
                activeTab === t.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              <Icon className="w-4 h-4" />
              {t.label}
              {t.badge && t.badge > 0 && (
                <span className="bg-yellow-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">{t.badge}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* Revenue Chart */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div>
                <h2 className="font-bold text-gray-900">Динамика выручки и выплат</h2>
                <p className="text-xs text-gray-400 mt-0.5">14 дней · GMV, выручка платформы и выплаты партнёрам</p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                {[{c:'#3B82F6',l:'GMV'},{c:'#10B981',l:'Выручка'},{c:'#F59E0B',l:'Выплаты'},{c:'#EF4444',l:'Возвраты'}].map((x,i) => (
                  <div key={i} className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{background:x.c}} /><span className="text-gray-500">{x.l}</span></div>
                ))}
              </div>
            </div>
            <ChartWrapper height={280}>
              {(w, h) => (
                <BarChart id="finance-revenue-bar" width={w} height={h} data={REVENUE_DATA} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid key="cg" strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis key="xa" dataKey="date" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis key="ya" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v => fmtRubShort(v)} width={52} />
                  <Tooltip key="tt" content={<CustomTooltip />} />
                  <Bar key="bar-gmv"      dataKey="gmv"      fill="#93C5FD" radius={[3,3,0,0]} name="GMV"      maxBarSize={18} isAnimationActive={false} />
                  <Bar key="bar-payouts"  dataKey="payouts"  fill="#A78BFA" radius={[3,3,0,0]} name="Выплаты"  maxBarSize={18} isAnimationActive={false} />
                  <Bar key="bar-revenue"  dataKey="revenue"  fill="#34D399" radius={[3,3,0,0]} name="Выручка"  maxBarSize={18} isAnimationActive={false} />
                  <Bar key="bar-refunds"  dataKey="refunds"  fill="#FCA5A5" radius={[3,3,0,0]} name="Возвраты" maxBarSize={18} isAnimationActive={false} />
                </BarChart>
              )}
            </ChartWrapper>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            {/* Commission Breakdown */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <h2 className="font-bold text-gray-900 mb-4">Структура комиссий</h2>
              <ChartWrapper height={180}>
                {(w, h) => (
                  <PieChart id="finance-commission-pie" width={w} height={h}>
                    <Pie data={COMMISSION_BREAKDOWN} dataKey="value" cx={w/2} cy={h/2} innerRadius={52} outerRadius={76} paddingAngle={3} isAnimationActive={false}>
                      {COMMISSION_BREAKDOWN.map((e, i) => <Cell key={`comm-cell-${e.name}`} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => `${v}%`} contentStyle={{ borderRadius: 10, fontSize: 11 }} />
                  </PieChart>
                )}
              </ChartWrapper>
              <div className="space-y-2 mt-2">
                {COMMISSION_BREAKDOWN.map((d, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                    <span className="text-xs text-gray-600 flex-1">{d.name}</span>
                    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${d.value}%`, background: d.color }} />
                    </div>
                    <span className="text-xs font-bold text-gray-900 w-8 text-right">{d.value}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Payout queue summary */}
            <div className="xl:col-span-2 bg-white border border-gray-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-900">Очередь выплат</h2>
                <button onClick={() => setActiveTab('payouts')}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                  Управлять <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'Ожидют',      val: pendingCount,                  amount: pendingAmount,   status: 'pending',    color: 'text-yellow-700', bg: 'bg-yellow-50' },
                  { label: 'В обработке',  val: payouts.filter(p=>p.status==='processing').length, amount: processingAmount, status: 'processing', color: 'text-blue-700',   bg: 'bg-blue-50' },
                  { label: 'Ошибка',       val: failedCount,                   amount: payouts.filter(p=>p.status==='failed').reduce((s,p)=>s+p.amount,0),   status: 'failed',     color: 'text-red-700',    bg: 'bg-red-50' },
                  { label: 'На удержании', val: onHoldCount,                   amount: payouts.filter(p=>p.status==='on_hold').reduce((s,p)=>s+p.amount,0),   status: 'on_hold',    color: 'text-orange-700', bg: 'bg-orange-50' },
                ].map((s, i) => (
                  <button key={i} onClick={() => { setActiveTab('payouts'); setPayoutFilter(s.status as PayoutStatus); }}
                    className={`p-3.5 ${s.bg} rounded-xl border border-transparent hover:border-gray-300 transition-all text-left`}>
                    <p className={`text-2xl font-black ${s.color}`}>{s.val}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                    <p className={`text-xs font-semibold ${s.color} mt-1`}>{fmtRubShort(s.amount)}</p>
                  </button>
                ))}
              </div>
              {pendingCount > 0 && (
                <div className="flex items-center justify-between p-3.5 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-5 h-5 text-yellow-600 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-yellow-800">{pendingCount} выплат ждут одобрения</p>
                      <p className="text-xs text-yellow-600 mt-0.5">Итого: {fmtRub(pendingAmount)} · SLA: одобрить до 12:00</p>
                    </div>
                  </div>
                  <button onClick={() => setShowBatchApprove(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold transition-colors shrink-0">
                    <Check className="w-3.5 h-3.5" />Одобрить все
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Financial health indicators */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <h2 className="font-bold text-gray-900 mb-4">Финансовые индикаторы здоровья</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Take Rate',         value: `${+((totals.revenue/totals.gmv)*100).toFixed(2)}%`, target: '15%',  ok: true,  desc: 'Доля выручки от GMV' },
                { label: 'Payout Ratio',      value: `${+((totals.payoutsTotal/totals.gmv)*100).toFixed(1)}%`, target: '72%', ok: true,  desc: 'Доля выплат от GMV' },
                { label: 'Refund Rate',       value: `${+((totals.refunds/totals.gmv)*100).toFixed(2)}%`, target: '<3.5%', ok: true, desc: 'Возвраты к GMV' },
                { label: 'Net Margin',        value: `${+((totals.revenue-totals.refunds)/totals.gmv*100).toFixed(2)}%`, target: '12%', ok: false, desc: 'Чистая маржа' },
              ].map((ind, i) => (
                <div key={i} className={`p-4 rounded-xl border ${ind.ok ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-gray-600">{ind.label}</p>
                    {ind.ok
                      ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                      : <AlertTriangle className="w-4 h-4 text-orange-600" />}
                  </div>
                  <p className={`text-2xl font-black ${ind.ok ? 'text-green-700' : 'text-orange-700'}`}>{ind.value}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{ind.desc}</p>
                  <p className={`text-[10px] font-semibold mt-0.5 ${ind.ok ? 'text-green-600' : 'text-orange-600'}`}>
                    Цель: {ind.target}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── PAYOUTS TAB ── */}
      {activeTab === 'payouts' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Поиск по партнёру..."
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-56" />
            </div>
            {/* Status filter */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
              {(['all','pending','processing','completed','failed','on_hold'] as (PayoutStatus|'all')[]).map(s => (
                <button key={s} onClick={() => setPayoutFilter(s)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    payoutFilter === s ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}>
                  {s === 'all' ? 'Все' : PAYOUT_STATUS_CFG[s].label}
                </button>
              ))}
            </div>
            {/* Type filter */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
              {(['all','courier','merchant','pvz'] as (PayoutType|'all')[]).map(t => (
                <button key={t} onClick={() => setTypeFilter(t)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    typeFilter === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}>
                  {t === 'all' ? 'Все типы' : TYPE_CFG[t].label}
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-gray-400">{filteredPayouts.length} выплат</span>
              {pendingCount > 0 && (
                <button onClick={() => setShowBatchApprove(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-colors">
                  <Check className="w-3.5 h-3.5" />Одобрить все ожидающие ({pendingCount})
                </button>
              )}
            </div>
          </div>

          {/* Payout list */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-4 bg-gray-50">
              <span className="text-xs font-semibold text-gray-500 flex-[3]">Партнёр / Реквизиты</span>
              <span className="text-xs font-semibold text-gray-500 flex-1 text-right hidden md:block">Сумма</span>
              <span className="text-xs font-semibold text-gray-500 w-32 hidden lg:block">Статус</span>
              <span className="text-xs font-semibold text-gray-500 w-20">Действие</span>
            </div>
            {filteredPayouts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                <Wallet className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm">Нет выплат</p>
              </div>
            ) : (
              filteredPayouts.map(p => (
                <PayoutRow
                  key={p.id} p={p}
                  onApprove={approvePayout}
                  onHold={holdPayout}
                  onRetry={retryPayout}
                  onContextMenu={(payout, x, y) => setContextMenu({ payout, x, y })}
                />
              ))
            )}
          </div>
          <div className="flex items-center justify-between text-xs text-gray-400 px-1">
            <span>Итого по фильтру: {fmtRub(filteredPayouts.reduce((s, p) => s + p.amount, 0))}</span>
            <Link to="/finance/payouts" className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium">
              Полный реестр выплат <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}

      {/* ── TRANSACTIONS TAB ── */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          {/* Filters row */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input value={txSearch} onChange={e => setTxSearch(e.target.value)}
                placeholder="Поиск транзакции..."
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-56" />
            </div>
            {/* Type filter */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
              {(['all', 'order_payment', 'payout', 'refund', 'commission', 'fee', 'adjustment'] as (TransactionType | 'all')[]).map(t => (
                <button key={t} onClick={() => setTxTypeFilter(t)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    txTypeFilter === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}>
                  {t === 'all' ? 'Все' : TX_CFG[t].label}
                </button>
              ))}
            </div>
            {/* Direction filter */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
              {(['all', 'in', 'out'] as const).map(d => (
                <button key={d} onClick={() => setTxDirectionFilter(d)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    txDirectionFilter === d ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}>
                  {d === 'all' ? 'Всё' : d === 'in' ? '↑ Приход' : '↓ Расход'}
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-gray-400">{filteredTransactions.length} записей</span>
              <button onClick={exportTransactions}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 rounded-xl text-xs font-medium transition-colors">
                <Download className="w-3.5 h-3.5" />Экспорт
              </button>
            </div>
          </div>

          {/* Summary bar */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setTxDirectionFilter(txDirectionFilter === 'in' ? 'all' : 'in')}
              className={`bg-green-50 border rounded-xl p-3.5 text-left transition-all cursor-pointer hover:shadow-md active:scale-[0.97] ${txDirectionFilter === 'in' ? 'border-green-400 ring-2 ring-green-300' : 'border-green-200 hover:border-green-300'}`}
            >
              <p className="text-xs text-gray-500">Приход</p>
              <p className="text-xl font-black text-green-700 mt-0.5">+{fmtRub(txIn)}</p>
            </button>
            <button
              onClick={() => setTxDirectionFilter(txDirectionFilter === 'out' ? 'all' : 'out')}
              className={`bg-red-50 border rounded-xl p-3.5 text-left transition-all cursor-pointer hover:shadow-md active:scale-[0.97] ${txDirectionFilter === 'out' ? 'border-red-400 ring-2 ring-red-300' : 'border-red-200 hover:border-red-300'}`}
            >
              <p className="text-xs text-gray-500">Расход</p>
              <p className="text-xl font-black text-red-700 mt-0.5">−{fmtRub(txOut)}</p>
            </button>
            <button
              onClick={() => { setTxDirectionFilter('all'); setTxTypeFilter('all'); }}
              className={`${txIn - txOut >= 0 ? 'bg-blue-50 border-blue-200 hover:border-blue-300' : 'bg-orange-50 border-orange-200 hover:border-orange-300'} border rounded-xl p-3.5 text-left transition-all cursor-pointer hover:shadow-md active:scale-[0.97]`}
            >
              <p className="text-xs text-gray-500">Нетто</p>
              <p className={`text-xl font-black mt-0.5 ${txIn - txOut >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                {txIn - txOut >= 0 ? '+' : '−'}{fmtRub(Math.abs(txIn - txOut))}
              </p>
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Транзакции</h2>
              <span className="text-xs text-gray-400">{filteredTransactions.length} записей</span>
            </div>
            {filteredTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                <Activity className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm">Нет транзакций по фильтру</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filteredTransactions.map(tx => {
                  const cfg = TX_CFG[tx.type];
                  const Icon = cfg.icon;
                  return (
                    <div key={tx.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        tx.direction === 'in' ? 'bg-green-50' : 'bg-red-50'
                      }`}>
                        <Icon className={`w-4 h-4 ${cfg.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{tx.description}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            tx.type === 'order_payment' ? 'bg-blue-50 text-blue-700' :
                            tx.type === 'payout' ? 'bg-orange-50 text-orange-700' :
                            tx.type === 'refund' ? 'bg-red-50 text-red-700' :
                            tx.type === 'commission' ? 'bg-green-50 text-green-700' :
                            tx.type === 'adjustment' ? 'bg-indigo-50 text-indigo-700' :
                            'bg-gray-50 text-gray-600'
                          }`}>{cfg.label}</span>
                          {tx.counterparty && <span>{tx.counterparty}</span>}
                          {tx.reference && <span className="font-mono text-blue-600">{tx.reference}</span>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`font-bold text-sm ${tx.direction === 'in' ? 'text-green-700' : 'text-red-700'}`}>
                          {tx.direction === 'in' ? '+' : '−'}{fmtRub(tx.amount)}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{tx.timestamp}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${
                        tx.status === 'completed' ? 'bg-green-100 text-green-700' :
                        tx.status === 'pending'   ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {tx.status === 'completed' ? '✓ Выполнено' : tx.status === 'pending' ? '⏳ Обрабатывается' : '✗ Ошибка'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── RATES TAB ── */}
      {activeTab === 'rates' && (
        <div className="space-y-5">
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">Сетка комиссионных ставок</h2>
                <p className="text-xs text-gray-400 mt-0.5">Текущие ставки по категориям партнёров</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Последнее обновление: 07.02.2026</span>
                <button
                  onClick={() => setShowEditRates(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 rounded-xl text-xs font-medium transition-colors">
                  <Edit2 className="w-3.5 h-3.5" />Редактировать
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Категория</th>
                    <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3">Курьер %</th>
                    <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3">Мерчант %</th>
                    <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3">ПВЗ %</th>
                    <th className="text-right text-xs font-semibold text-gray-500 px-5 py-3">Мин. заказ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {commissionRates.map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="text-sm font-medium text-gray-800">{r.type}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {r.courier > 0 ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-orange-50 text-orange-700 text-xs font-bold">{r.courier}%</span>
                        ) : <span className="text-xs text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {r.merchant > 0 ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 text-xs font-bold">{r.merchant}%</span>
                        ) : <span className="text-xs text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {r.pvz > 0 ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 text-xs font-bold">{r.pvz}%</span>
                        ) : <span className="text-xs text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {r.minOrder > 0 ? (
                          <span className="text-sm font-medium text-gray-700">₽{r.minOrder.toLocaleString()}</span>
                        ) : <span className="text-xs text-gray-300">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Commission calculator preview */}
          <div className="bg-gradient-to-br from-blue-900 to-indigo-900 rounded-2xl p-6 text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                <BarChart2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold">Итого за 14 дней</h3>
                <p className="text-xs text-blue-300 mt-0.5">Разбивка комиссий по типам</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { type: 'Мерчанты',  val: totals.commissions * 0.62, pct: 62, color: 'text-purple-300' },
                { type: 'Курьеры',   val: totals.commissions * 0.23, pct: 23, color: 'text-orange-300' },
                { type: 'ПВЗ',       val: totals.commissions * 0.11, pct: 11, color: 'text-teal-300' },
                { type: 'Сервисный', val: totals.commissions * 0.04, pct: 4,  color: 'text-blue-300' },
              ].map((x, i) => (
                <div key={i} className="bg-white/10 rounded-xl p-3.5">
                  <p className={`text-xl font-black ${x.color}`}>{fmtRubShort(x.val)}</p>
                  <p className="text-xs text-blue-300 mt-0.5">{x.type} · {x.pct}%</p>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-sm text-blue-300">Итого комиссионная выручка:</span>
              <span className="text-2xl font-black text-white">{fmtRub(totals.commissions)}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── PORTALS ── */}
      {showBatchApprove && (
        <BatchApproveModal
          count={pendingCount}
          amount={pendingAmount}
          onConfirm={() => { approveAll(); setShowBatchApprove(false); }}
          onCancel={() => setShowBatchApprove(false)}
        />
      )}

      {showReportModal && (
        <ReportExportModal
          totals={totals}
          onClose={() => setShowReportModal(false)}
        />
      )}

      {showEditRates && (
        <EditRatesModal
          rates={commissionRates}
          onClose={() => setShowEditRates(false)}
          onSave={updated => setCommissionRates(updated)}
        />
      )}

      {contextMenu && (
        <PayoutContextMenu
          payout={contextMenu.payout}
          pos={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={() => setContextMenu(null)}
          onApprove={approvePayout}
          onHold={holdPayout}
          onRetry={retryPayout}
          onCancel={cancelPayout}
        />
      )}
    </div>
  );
}
