import { useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Search, Download, CheckCircle2, Clock, XCircle, AlertTriangle,
  RefreshCw, Eye, MoreVertical, Bike, Store, Building2,
  CircleAlert, Check, Filter, ChevronLeft, ChevronRight,
  Wallet, ArrowUpRight, ArrowDownRight, FileSpreadsheet,
  Ban, Copy, SlidersHorizontal, X, ArrowLeft,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'on_hold';
type PartnerType  = 'pvz' | 'courier' | 'merchant';

interface Payout {
  id: string;
  partner: string;
  partnerType: PartnerType;
  amount: number;
  commission: number;
  orders: number;
  period: string;
  status: PayoutStatus;
  createdAt: string;
  processedAt?: string;
  bank: string;
  bankAccount: string;
  note?: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const ALL_PAYOUTS: Payout[] = [
  { id: 'pay001', partner: 'Кафе «Уют»',              partnerType: 'merchant', amount: 89400,  commission: 15.0, orders: 1234, period: '01-07.02', status: 'pending',    createdAt: '07.02.2026', bank: 'Сбербанк',  bankAccount: '****3471' },
  { id: 'pay002', partner: 'Пекарня «Хлеб»',          partnerType: 'merchant', amount: 54200,  commission: 12.0, orders: 987,  period: '01-07.02', status: 'pending',    createdAt: '07.02.2026', bank: 'Тинькофф',  bankAccount: '****8823' },
  { id: 'pay003', partner: 'Алексей К. (KFC)',         partnerType: 'courier',  amount: 23400,  commission: 20.0, orders: 287,  period: '04-07.02', status: 'processing', createdAt: '07.02.2026', processedAt: '07.02.2026 08:12', bank: 'Альфа',     bankAccount: '****1134', note: 'Приоритетная выплата' },
  { id: 'pay004', partner: 'Михаил Д.',                partnerType: 'courier',  amount: 19800,  commission: 20.0, orders: 241,  period: '04-07.02', status: 'processing', createdAt: '07.02.2026', processedAt: '07.02.2026 08:05', bank: 'Сбербанк',  bankAccount: '****5590' },
  { id: 'pay005', partner: 'ПВЗ «Сортировочная»',     partnerType: 'pvz',      amount: 12600,  commission: 8.0,  orders: 456,  period: '01-07.02', status: 'on_hold',    createdAt: '07.02.2026', bank: 'ВТБ',       bankAccount: '****2267', note: 'Требует верификации договора' },
  { id: 'pay006', partner: 'TechStore MSK',            partnerType: 'merchant', amount: 178900, commission: 13.0, orders: 756,  period: '01-07.02', status: 'pending',    createdAt: '07.02.2026', bank: 'Тинькофф',  bankAccount: '****7712' },
  { id: 'pay007', partner: 'ПВЗ «Центральный»',       partnerType: 'pvz',      amount: 8900,   commission: 8.0,  orders: 312,  period: '01-07.02', status: 'failed',     createdAt: '06.02.2026', bank: 'Сбербанк',  bankAccount: '****0043', note: 'Ошибка банковских реквизитов' },
  { id: 'pay008', partner: 'FreshMarket',              partnerType: 'merchant', amount: 32400,  commission: 11.0, orders: 623,  period: '01-07.02', status: 'pending',    createdAt: '07.02.2026', bank: 'Альфа',     bankAccount: '****9981' },
  { id: 'pay009', partner: 'Сергей В.',                partnerType: 'courier',  amount: 17200,  commission: 20.0, orders: 198,  period: '01-07.02', status: 'completed',  createdAt: '06.02.2026', processedAt: '06.02.2026 14:30', bank: 'Сбербанк',  bankAccount: '****4412' },
  { id: 'pay010', partner: 'ПВЗ «Авиамоторная»',      partnerType: 'pvz',      amount: 21300,  commission: 8.0,  orders: 789,  period: '01-07.02', status: 'completed',  createdAt: '06.02.2026', processedAt: '06.02.2026 14:28', bank: 'ВТБ',       bankAccount: '****6631' },
  { id: 'pay011', partner: 'Ресторан «Токио»',         partnerType: 'merchant', amount: 67800,  commission: 15.0, orders: 543,  period: '01-07.02', status: 'completed',  createdAt: '06.02.2026', processedAt: '06.02.2026 14:15', bank: 'Тинькофф',  bankAccount: '****3309' },
  { id: 'pay012', partner: 'Наталья К.',               partnerType: 'courier',  amount: 14600,  commission: 20.0, orders: 176,  period: '01-07.02', status: 'completed',  createdAt: '06.02.2026', processedAt: '06.02.2026 14:10', bank: 'Альфа',     bankAccount: '****8871' },
  { id: 'pay013', partner: 'DrugStore «Фарма+»',       partnerType: 'merchant', amount: 41200,  commission: 10.0, orders: 892,  period: '01-07.02', status: 'on_hold',    createdAt: '05.02.2026', bank: 'Сбербанк',  bankAccount: '****1120', note: 'Ожидание документов KYC' },
  { id: 'pay014', partner: 'ПВЗ «Проспект Мира»',     partnerType: 'pvz',      amount: 18700,  commission: 8.0,  orders: 612,  period: '25-31.01', status: 'completed',  createdAt: '01.02.2026', processedAt: '01.02.2026 12:00', bank: 'ВТБ',       bankAccount: '****9944' },
  { id: 'pay015', partner: 'Иван П.',                  partnerType: 'courier',  amount: 22100,  commission: 20.0, orders: 267,  period: '25-31.01', status: 'failed',     createdAt: '01.02.2026', bank: 'Тинькофф',  bankAccount: '****5577', note: 'Заблокированная карта' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtRub(n: number): string {
  if (n >= 1_000_000) return `₽${(n / 1_000_000).toFixed(2)}М`;
  if (n >= 1_000)     return `₽${(n / 1_000).toFixed(1)}К`;
  return `₽${n.toLocaleString('ru-RU')}`;
}

const STATUS_CFG: Record<PayoutStatus, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  pending:    { label: 'Ожидает',     bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
  processing: { label: 'Обработка',   bg: 'bg-blue-100',   text: 'text-blue-800',   icon: RefreshCw },
  completed:  { label: 'Выполнена',   bg: 'bg-green-100',  text: 'text-green-800',  icon: CheckCircle2 },
  failed:     { label: 'Ошибка',      bg: 'bg-red-100',    text: 'text-red-800',    icon: AlertTriangle },
  on_hold:    { label: 'Удержание',   bg: 'bg-orange-100', text: 'text-orange-800', icon: CircleAlert },
};

const PARTNER_CFG: Record<PartnerType, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  courier:  { label: 'Курьер',   icon: Bike,      color: 'text-orange-600', bg: 'bg-orange-50' },
  merchant: { label: 'Мерчант',  icon: Store,     color: 'text-purple-600', bg: 'bg-purple-50' },
  pvz:      { label: 'ПВЗ',      icon: Building2, color: 'text-teal-600',   bg: 'bg-teal-50' },
};

const PAGE_SIZE = 8;

// ─── Context Menu Portal ───────────────────────────────────────────────────────

function RowContextMenu({
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
  const left = Math.min(pos.x, window.innerWidth - 210);
  const top  = Math.min(pos.y, window.innerHeight - 260);

  const menu = (
    <>
      <div className="fixed inset-0 z-[9998]" onClick={onClose} />
      <div style={{ position: 'fixed', left, top, zIndex: 9999 }}
        className="w-52 bg-white border border-gray-200 rounded-2xl shadow-2xl py-1.5 overflow-hidden">
        <div className="px-3 py-2 border-b border-gray-100 mb-1">
          <p className="text-xs font-semibold text-gray-700 truncate">{payout.partner}</p>
          <p className="text-[10px] text-gray-400">{fmtRub(payout.amount)} · {payout.period}</p>
        </div>
        <Link to={`/finance/payouts/${payout.id}`} onClick={onClose}
          className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors">
          <Eye className="w-3.5 h-3.5" />Открыть детали
        </Link>
        {(payout.status === 'pending' || payout.status === 'on_hold') && (
          <button onClick={() => { onApprove(payout.id); onClose(); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-green-700 hover:bg-green-50 transition-colors">
            <Check className="w-3.5 h-3.5" />{payout.status === 'on_hold' ? 'Разблокировать' : 'Одобрить'}
          </button>
        )}
        {payout.status === 'pending' && (
          <button onClick={() => { onHold(payout.id); onClose(); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-orange-700 hover:bg-orange-50 transition-colors">
            <CircleAlert className="w-3.5 h-3.5" />Заморозить
          </button>
        )}
        {payout.status === 'failed' && (
          <button onClick={() => { onRetry(payout.id); onClose(); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-blue-700 hover:bg-blue-50 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />Повторить
          </button>
        )}
        <button onClick={() => {
          navigator.clipboard.writeText(payout.id).then(() => toast.success('ID скопирован'));
          onClose();
        }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
          <Copy className="w-3.5 h-3.5" />Скопировать ID
        </button>
        <div className="border-t border-gray-100 mt-1 pt-1">
          <button onClick={() => { onCancel(payout.id); onClose(); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
            <Ban className="w-3.5 h-3.5" />Отменить
          </button>
        </div>
      </div>
    </>
  );
  return ReactDOM.createPortal(menu, document.body);
}

// ─── Export Modal Portal ───────────────────────────────────────────────────────

function ExportModal({ payouts, onClose }: { payouts: Payout[]; onClose: () => void }) {
  const [loading, setLoading] = useState(false);

  function doExport() {
    setLoading(true);
    setTimeout(() => {
      const rows = [
        ['ID', 'Партнёр', 'Тип', 'Период', 'Сумма', 'Комиссия%', 'Заказов', 'Статус', 'Банк', 'Счёт', 'Создано'],
        ...payouts.map(p => [
          p.id, p.partner, PARTNER_CFG[p.partnerType].label,
          p.period, fmtRub(p.amount), p.commission + '%', p.orders,
          STATUS_CFG[p.status].label, p.bank, p.bankAccount, p.createdAt,
        ])
      ];
      const csv = rows.map(r => r.join(';')).join('\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payouts_${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setLoading(false);
      onClose();
      toast.success(`Экспортировано ${payouts.length} выплат`);
    }, 900);
  }

  const modal = (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Экспорт выплат</h3>
              <p className="text-xs text-gray-400 mt-0.5">{payouts.length} записей выбрано</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="bg-gray-50 rounded-xl p-3.5 mb-4 space-y-1.5 text-xs">
          {[
            { label: 'Формат', val: 'CSV (UTF-8 BOM)' },
            { label: 'Записей', val: payouts.length.toString() },
            { label: 'Сумма', val: fmtRub(payouts.reduce((s, p) => s + p.amount, 0)) },
          ].map((r, i) => (
            <div key={i} className="flex justify-between">
              <span className="text-gray-400">{r.label}:</span>
              <span className="font-semibold text-gray-700">{r.val}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
            Отмена
          </button>
          <button onClick={doExport} disabled={loading}
            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2">
            {loading ? <><RefreshCw className="w-4 h-4 animate-spin" />...</> : <><Download className="w-4 h-4" />Скачать CSV</>}
          </button>
        </div>
      </div>
    </div>
  );
  return ReactDOM.createPortal(modal, document.body);
}

// ─── Batch Confirm Modal ───────────────────────────────────────────────────────

function BatchConfirmModal({ ids, payouts, action, onConfirm, onCancel }: {
  ids: string[];
  payouts: Payout[];
  action: 'approve' | 'hold' | 'cancel';
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const selected = payouts.filter(p => ids.includes(p.id));
  const total = selected.reduce((s, p) => s + p.amount, 0);
  const ACTION_CFG = {
    approve: { label: 'Одобрить', desc: 'Выплаты будут отправлены в банк-эквайер.', btn: 'bg-green-600 hover:bg-green-700', icon: Check },
    hold:    { label: 'Заморозить', desc: 'Выплаты будут переведены в статус «На удержании».', btn: 'bg-orange-600 hover:bg-orange-700', icon: CircleAlert },
    cancel:  { label: 'Отменить', desc: 'Выплаты будут безвозвратно отменены.', btn: 'bg-red-600 hover:bg-red-700', icon: Ban },
  };
  const cfg = ACTION_CFG[action];
  const ActionIcon = cfg.icon;

  const modal = (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 bg-gray-100 rounded-xl flex items-center justify-center">
            <ActionIcon className="w-6 h-6 text-gray-700" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">{cfg.label} выплаты ({ids.length})</h3>
            <p className="text-xs text-gray-500 mt-0.5">Массовое действие</p>
          </div>
        </div>
        <div className="bg-gray-50 rounded-xl p-3.5 mb-3 flex justify-between text-sm">
          <span className="text-gray-500">Итоговая сумма:</span>
          <span className="font-black text-gray-900">{fmtRub(total)}</span>
        </div>
        <p className="text-xs text-gray-400 mb-5">{cfg.desc} Это действие применится к {ids.length} выплатам.</p>
        <div className="flex gap-2">
          <button onClick={onCancel}
            className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
            Отмена
          </button>
          <button onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 ${cfg.btn} text-white rounded-xl text-sm font-bold transition-colors`}>
            Подтвердить
          </button>
        </div>
      </div>
    </div>
  );
  return ReactDOM.createPortal(modal, document.body);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PayoutsList() {
  const [payouts, setPayouts] = useState<Payout[]>(ALL_PAYOUTS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PayoutStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<PartnerType | 'all'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [contextMenu, setContextMenu] = useState<{ payout: Payout; x: number; y: number } | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [batchAction, setBatchAction] = useState<{ action: 'approve' | 'hold' | 'cancel' } | null>(null);

  // ── Filtering ──
  const filtered = useMemo(() => {
    let list = payouts;
    if (statusFilter !== 'all') list = list.filter(p => p.status === statusFilter);
    if (typeFilter !== 'all')   list = list.filter(p => p.partnerType === typeFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.partner.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.bank.toLowerCase().includes(q)
      );
    }
    return list;
  }, [payouts, statusFilter, typeFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // KPI
  const kpi = useMemo(() => ({
    pending:    { count: payouts.filter(p => p.status === 'pending').length,    amount: payouts.filter(p => p.status === 'pending').reduce((s,p) => s+p.amount,0) },
    processing: { count: payouts.filter(p => p.status === 'processing').length, amount: payouts.filter(p => p.status === 'processing').reduce((s,p) => s+p.amount,0) },
    completed:  { count: payouts.filter(p => p.status === 'completed').length,  amount: payouts.filter(p => p.status === 'completed').reduce((s,p) => s+p.amount,0) },
    failed:     { count: payouts.filter(p => p.status === 'failed').length,     amount: payouts.filter(p => p.status === 'failed').reduce((s,p) => s+p.amount,0) },
    on_hold:    { count: payouts.filter(p => p.status === 'on_hold').length,    amount: payouts.filter(p => p.status === 'on_hold').reduce((s,p) => s+p.amount,0) },
  }), [payouts]);

  // ── Selection ──
  const allPageSelected = paginated.length > 0 && paginated.every(p => selectedIds.includes(p.id));
  function toggleSelectAll() {
    if (allPageSelected) {
      setSelectedIds(prev => prev.filter(id => !paginated.find(p => p.id === id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...paginated.map(p => p.id)])]);
    }
  }
  function toggleSelect(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  // ── Actions ──
  function approvePayout(id: string) {
    const p = payouts.find(x => x.id === id);
    setPayouts(prev => prev.map(x => x.id === id ? { ...x, status: 'processing', processedAt: new Date().toLocaleString('ru-RU') } : x));
    setSelectedIds(prev => prev.filter(x => x !== id));
    if (p) toast.success(`Выплата ${p.partner} одобрена`);
  }
  function holdPayout(id: string) {
    const p = payouts.find(x => x.id === id);
    setPayouts(prev => prev.map(x => x.id === id ? { ...x, status: 'on_hold' } : x));
    setSelectedIds(prev => prev.filter(x => x !== id));
    if (p) toast.warning(`Выплата ${p.partner} заморожена`);
  }
  function retryPayout(id: string) {
    const p = payouts.find(x => x.id === id);
    setPayouts(prev => prev.map(x => x.id === id ? { ...x, status: 'processing', note: undefined } : x));
    setSelectedIds(prev => prev.filter(x => x !== id));
    if (p) toast.success(`Повтор выплаты ${p.partner} запущен`);
  }
  function cancelPayout(id: string) {
    const p = payouts.find(x => x.id === id);
    setPayouts(prev => prev.filter(x => x.id !== id));
    setSelectedIds(prev => prev.filter(x => x !== id));
    if (p) toast.error(`Выплата ${p.partner} отменена`);
  }

  function executeBatchAction(action: 'approve' | 'hold' | 'cancel') {
    const ids = [...selectedIds];
    if (action === 'approve') {
      ids.forEach(id => approvePayout(id));
      toast.success(`Одобрено ${ids.length} выплат`);
    } else if (action === 'hold') {
      ids.forEach(id => holdPayout(id));
      toast.warning(`Заморожено ${ids.length} выплат`);
    } else {
      ids.forEach(id => cancelPayout(id));
      toast.error(`Отменено ${ids.length} выплат`);
    }
    setSelectedIds([]);
    setBatchAction(null);
  }

  // Reset page on filter change
  function setStatusFilterWithReset(v: PayoutStatus | 'all') { setStatusFilter(v); setPage(1); setSelectedIds([]); }
  function setTypeFilterWithReset(v: PartnerType | 'all')    { setTypeFilter(v);   setPage(1); setSelectedIds([]); }

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link to="/finance"
            className="p-2 hover:bg-gray-100 text-gray-500 hover:text-gray-700 rounded-xl transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Реестр выплат</h1>
            <p className="text-sm text-gray-500 mt-0.5">Все выплаты партнёрам — мерчанты, курьеры, ПВЗ</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowExport(true)}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 rounded-xl text-xs font-medium transition-colors">
            <Download className="w-3.5 h-3.5" />Экспорт
          </button>
          <Link to="/finance"
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors">
            <Wallet className="w-4 h-4" />Финансы
          </Link>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(Object.entries(kpi) as [PayoutStatus, { count: number; amount: number }][]).map(([status, val]) => {
          const cfg = STATUS_CFG[status];
          const Icon = cfg.icon;
          return (
            <button key={status} onClick={() => setStatusFilterWithReset(statusFilter === status ? 'all' : status)}
              className={`p-3.5 rounded-2xl border-2 text-left transition-all ${
                statusFilter === status
                  ? 'border-blue-400 bg-blue-50 shadow-sm'
                  : 'border-gray-100 bg-white hover:border-gray-300'
              }`}>
              <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.bg} ${cfg.text} mb-2`}>
                <Icon className="w-3 h-3" />
                {cfg.label}
              </div>
              <p className="text-xl font-black text-gray-900">{val.count}</p>
              <p className="text-xs text-gray-400 mt-0.5">{fmtRub(val.amount)}</p>
            </button>
          );
        })}
      </div>

      {/* Filters + Batch toolbar */}
      <div className="space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Поиск по партнёру, банку, ID..."
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-64" />
          </div>
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            {(['all','pending','processing','completed','failed','on_hold'] as (PayoutStatus|'all')[]).map(s => (
              <button key={s} onClick={() => setStatusFilterWithReset(s)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  statusFilter === s ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {s === 'all' ? 'Все' : STATUS_CFG[s].label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            {(['all','courier','merchant','pvz'] as (PartnerType|'all')[]).map(t => (
              <button key={t} onClick={() => setTypeFilterWithReset(t)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  typeFilter === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {t === 'all' ? 'Все типы' : PARTNER_CFG[t].label}
              </button>
            ))}
          </div>
          <span className="ml-auto text-xs text-gray-400">{filtered.length} из {payouts.length}</span>
        </div>

        {/* Batch action bar */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-2xl flex-wrap">
            <span className="text-sm font-semibold text-blue-800">
              Выбрано: {selectedIds.length} · {fmtRub(payouts.filter(p => selectedIds.includes(p.id)).reduce((s,p) => s+p.amount, 0))}
            </span>
            <div className="flex items-center gap-2 ml-auto">
              <button onClick={() => setBatchAction({ action: 'approve' })}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-colors">
                <Check className="w-3.5 h-3.5" />Одобрить
              </button>
              <button onClick={() => setBatchAction({ action: 'hold' })}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-colors">
                <CircleAlert className="w-3.5 h-3.5" />Заморозить
              </button>
              <button onClick={() => setBatchAction({ action: 'cancel' })}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl text-xs font-bold transition-colors">
                <Ban className="w-3.5 h-3.5" />Отменить
              </button>
              <button onClick={() => setSelectedIds([])}
                className="p-1.5 text-blue-400 hover:text-blue-700 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[40px_2fr_1fr_1fr_1fr_120px_100px] items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500">
          <div className="flex items-center justify-center">
            <input type="checkbox" checked={allPageSelected} onChange={toggleSelectAll}
              className="w-4 h-4 accent-blue-600 rounded cursor-pointer" />
          </div>
          <span>Партнёр</span>
          <span>Период / Заказов</span>
          <span>Сумма</span>
          <span>Статус</span>
          <span>Банк</span>
          <span className="text-right">Действия</span>
        </div>

        {paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <Wallet className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm font-medium">Нет выплат по фильтру</p>
            <button onClick={() => { setStatusFilter('all'); setTypeFilter('all'); setSearch(''); }}
              className="mt-3 text-xs text-blue-600 hover:text-blue-700 font-medium">
              Сбросить фильтры
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {paginated.map(p => {
              const st = STATUS_CFG[p.status];
              const pt = PARTNER_CFG[p.partnerType];
              const PIcon = pt.icon;
              const StIcon = st.icon;
              const isSelected = selectedIds.includes(p.id);

              return (
                <div key={p.id}
                  className={`grid grid-cols-[40px_2fr_1fr_1fr_1fr_120px_100px] items-center gap-2 px-4 py-3.5 transition-colors ${
                    isSelected ? 'bg-blue-50' : p.status === 'failed' ? 'bg-red-50/30' : p.status === 'on_hold' ? 'bg-orange-50/30' : 'hover:bg-gray-50'
                  }`}>
                  {/* Checkbox */}
                  <div className="flex items-center justify-center">
                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(p.id)}
                      className="w-4 h-4 accent-blue-600 rounded cursor-pointer" />
                  </div>

                  {/* Partner */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 ${pt.bg} rounded-xl flex items-center justify-center shrink-0`}>
                      <PIcon className={`w-4 h-4 ${pt.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{p.partner}</p>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${pt.bg} ${pt.color}`}>{pt.label}</span>
                        {p.note && <span className="text-[10px] text-orange-600 font-medium truncate max-w-[120px]">⚠ {p.note}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Period */}
                  <div>
                    <p className="text-xs font-medium text-gray-700">{p.period}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{p.orders} заказов · {p.commission}%</p>
                  </div>

                  {/* Amount */}
                  <div>
                    <p className="font-black text-gray-900">{fmtRub(p.amount)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Создано: {p.createdAt}</p>
                  </div>

                  {/* Status */}
                  <div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold ${st.bg} ${st.text}`}>
                      <StIcon className="w-3 h-3" />
                      {st.label}
                    </span>
                    {p.processedAt && (
                      <p className="text-[10px] text-gray-400 mt-1">{p.processedAt}</p>
                    )}
                  </div>

                  {/* Bank */}
                  <div>
                    <p className="text-xs font-medium text-gray-700">{p.bank}</p>
                    <p className="text-xs text-gray-400 mt-0.5 font-mono">{p.bankAccount}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1">
                    {p.status === 'pending' && (
                      <>
                        <button onClick={() => approvePayout(p.id)}
                          className="p-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors" title="Одобрить">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => holdPayout(p.id)}
                          className="p-1.5 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg transition-colors" title="Заморозить">
                          <CircleAlert className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    {p.status === 'failed' && (
                      <button onClick={() => retryPayout(p.id)}
                        className="p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors" title="Повторить">
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <Link to={`/finance/payouts/${p.id}`}
                      className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors" title="Детали">
                      <Eye className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      onClick={e => setContextMenu({ payout: p, x: e.clientX, y: e.clientY })}
                      className="p-1.5 hover:bg-gray-100 text-gray-400 rounded-lg transition-colors">
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination + Summary */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="text-xs text-gray-400">
          {filtered.length > 0 && (
            <>Страница {page} из {totalPages} · Итого по фильтру: <span className="font-semibold text-gray-700">{fmtRub(filtered.reduce((s,p) => s+p.amount,0))}</span></>
          )}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
              className="p-2 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(pg => (
              <button key={pg} onClick={() => setPage(pg)}
                className={`w-9 h-9 rounded-xl text-sm font-medium transition-colors ${
                  pg === page ? 'bg-blue-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}>
                {pg}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
              className="p-2 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* ── PORTALS ── */}
      {contextMenu && (
        <RowContextMenu
          payout={contextMenu.payout}
          pos={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={() => setContextMenu(null)}
          onApprove={approvePayout}
          onHold={holdPayout}
          onRetry={retryPayout}
          onCancel={cancelPayout}
        />
      )}

      {showExport && (
        <ExportModal
          payouts={selectedIds.length > 0 ? payouts.filter(p => selectedIds.includes(p.id)) : filtered}
          onClose={() => setShowExport(false)}
        />
      )}

      {batchAction && (
        <BatchConfirmModal
          ids={selectedIds}
          payouts={payouts}
          action={batchAction.action}
          onConfirm={() => executeBatchAction(batchAction.action)}
          onCancel={() => setBatchAction(null)}
        />
      )}
    </div>
  );
}
