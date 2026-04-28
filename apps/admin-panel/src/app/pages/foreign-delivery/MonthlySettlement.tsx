/**
 * MonthlySettlement — assembles a monthly report from settlement cards.
 * Three states: open · under_review · closed.
 * Closed months are read-only unless SuperAdmin overrides with reason.
 */
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  FileSpreadsheet, Lock, Send, CheckCircle2, AlertTriangle, Download,
  Unlock, Receipt, ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Locked } from '../../components/rbac/PermissionLock';
import {
  FOREIGN_ORDERS, calcSettlement, fmtMoney, dateToNum, aggregateOrders,
  LOCAL_SELLERS, SUPPLIERS,
} from '../../data/foreign-delivery';
import { exportToCsv } from '../../utils/downloads';

type MonthStatus = 'open' | 'under_review' | 'closed';

interface MonthlyState {
  month:  string;            // 'Февраль 2026'
  status: MonthStatus;
  closedBy?:    string;
  closedAt?:    string;
  overrideBy?:  string;
  overrideAt?:  string;
  overrideReason?: string;
}

const INITIAL: MonthlyState[] = [
  { month: 'Январь 2026',   status: 'closed', closedBy: 'Морозова О.', closedAt: '05.02.2026 18:00' },
  { month: 'Февраль 2026',  status: 'under_review' },
];

function monthFromDate(d: string): string {
  const [, mm, yyyy] = d.split('.');
  const months = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  return `${months[Number(mm) - 1]} ${yyyy}`;
}

export function MonthlySettlement() {
  const { hasPermission, user } = useAuth();
  if (!hasPermission('foreign_delivery.monthly.view')) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <Lock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <h2 className="text-lg font-bold text-gray-900">Доступ ограничен</h2>
      </div>
    );
  }

  const canGenerate = hasPermission('foreign_delivery.monthly.generate');
  const canClose    = hasPermission('foreign_delivery.monthly.close');
  const canOverride = hasPermission('foreign_delivery.monthly.override') || user?.permissions.includes('*');
  const canSeeMargin = hasPermission('foreign_delivery.margin.view') || hasPermission('foreign_delivery.financials.view');

  const [months, setMonths] = useState<MonthlyState[]>(INITIAL);
  const [selected, setSelected] = useState<string>(INITIAL[1]?.month ?? INITIAL[0].month);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');

  // Group orders by month
  const ordersByMonth = useMemo(() => {
    const map = new Map<string, typeof FOREIGN_ORDERS>();
    for (const o of FOREIGN_ORDERS) {
      const m = monthFromDate(o.createdAt.slice(0, 10));
      const arr = map.get(m) ?? [];
      arr.push(o);
      map.set(m, arr);
    }
    return map;
  }, []);

  const m = months.find(x => x.month === selected) ?? months[0];
  const orders = ordersByMonth.get(m.month) ?? [];
  const stats = aggregateOrders(orders);

  // Per-seller aggregation
  const sellerStats = useMemo(() => {
    const map = new Map<string, { sellerId: string; name: string; ordersCount: number; total: number }>();
    for (const o of orders) {
      if (!o.localSellerId) continue;
      const s = LOCAL_SELLERS.find(x => x.sellerId === o.localSellerId);
      if (!s) continue;
      const v = map.get(o.localSellerId) ?? { sellerId: o.localSellerId, name: s.name, ordersCount: 0, total: 0 };
      v.ordersCount++;
      v.total += calcSettlement(o).totalLocalFulfillmentCost;
      map.set(o.localSellerId, v);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [orders]);

  // Per-supplier aggregation
  const supplierStats = useMemo(() => {
    const map = new Map<string, { supplierId: string; name: string; ordersCount: number; total: number }>();
    for (const o of orders) {
      if (!o.supplierId) continue;
      const s = SUPPLIERS.find(x => x.supplierId === o.supplierId);
      if (!s) continue;
      const v = map.get(o.supplierId) ?? { supplierId: o.supplierId, name: s.name, ordersCount: 0, total: 0 };
      v.ordersCount++;
      v.total += calcSettlement(o).supplierPayable;
      map.set(o.supplierId, v);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [orders]);

  function patchMonth(p: Partial<MonthlyState>) {
    setMonths(prev => prev.map(x => x.month === selected ? { ...x, ...p } : x));
  }

  function generate() {
    if (!canGenerate) return;
    toast.success(`${m.month}: отчёт сгенерирован из ${orders.length} карточек`);
  }

  function sendForReview() {
    if (!canGenerate || m.status !== 'open') return;
    patchMonth({ status: 'under_review' });
    toast.success(`${m.month}: отправлено на проверку`);
  }

  function closeMonth() {
    if (!canClose || m.status === 'closed') return;
    const now = new Date().toLocaleString('ru-RU');
    patchMonth({ status: 'closed', closedBy: user?.name ?? '—', closedAt: now });
    toast.success(`${m.month} закрыт`);
  }

  function applyOverride() {
    if (!canOverride || !overrideReason.trim()) {
      toast.error('Укажите причину override'); return;
    }
    const now = new Date().toLocaleString('ru-RU');
    patchMonth({ status: 'open', overrideBy: user?.name ?? '—', overrideAt: now, overrideReason });
    setOverrideOpen(false);
    setOverrideReason('');
    toast.warning(`${m.month}: открыт SuperAdmin override`);
  }

  function exportCsv() {
    if (orders.length === 0) { toast.info('Нет заказов'); return; }
    exportToCsv(orders.map(o => {
      const t = calcSettlement(o);
      return {
        orderId: o.orderId, date: o.createdAt,
        paymentAmount: o.paymentAmount, paymentCurrency: o.paymentCurrency,
        totalLocal: t.totalLocalFulfillmentCost,
        polandOwesTm: t.amountPolandOwesTurkmen,
        supplierPayable: t.supplierPayable,
        polandMargin: t.polandMargin,
        remainingDebt: t.remainingDebt,
        settlement: o.settlement,
      };
    }) as any[], [
      { key: 'orderId', label: 'Order' }, { key: 'date', label: 'Дата' },
      { key: 'paymentAmount', label: 'Оплата' }, { key: 'paymentCurrency', label: 'Валюта' },
      { key: 'totalLocal', label: 'Локально' }, { key: 'polandOwesTm', label: 'Польша→TM' },
      { key: 'supplierPayable', label: 'Поставщик' }, { key: 'polandMargin', label: 'Маржа' },
      { key: 'remainingDebt', label: 'Открытый долг' }, { key: 'settlement', label: 'Статус' },
    ], `monthly-${m.month.replace(' ', '-')}`);
    toast.success(`Экспорт: ${orders.length} строк`);
  }

  const isClosed = m.status === 'closed';
  const overrideActive = m.status === 'open' && m.overrideBy;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">Зарубежные расчёты</p>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Ежемесячный отчёт</h1>
            <span className="px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-[10px] font-mono">foreign_delivery.monthly</span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">Собирается из Settlement Cards. Закрытый месяц защищён от изменений.</p>
        </div>
        <select value={selected} onChange={e => setSelected(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm">
          {months.map(x => <option key={x.month} value={x.month}>{x.month}</option>)}
        </select>
      </div>

      {/* Status banner */}
      <div className={`rounded-xl border p-4 flex items-center justify-between gap-3 ${
        m.status === 'closed' ? 'bg-green-50 border-green-200'
        : m.status === 'under_review' ? 'bg-yellow-50 border-yellow-200'
        : 'bg-blue-50 border-blue-200'
      }`}>
        <div className="flex items-center gap-3">
          {m.status === 'closed' ? <Lock className="w-5 h-5 text-green-700" />
           : m.status === 'under_review' ? <AlertTriangle className="w-5 h-5 text-yellow-700" />
           : <Receipt className="w-5 h-5 text-blue-700" />}
          <div>
            <p className="font-bold text-gray-900">
              {m.status === 'closed' ? 'Месяц закрыт' : m.status === 'under_review' ? 'На проверке' : 'Открыт'}
            </p>
            {m.closedAt && <p className="text-xs text-gray-600">Закрыл: {m.closedBy} · {m.closedAt}</p>}
            {overrideActive && (
              <p className="text-xs text-rose-700 mt-0.5">
                <Unlock className="w-3 h-3 inline mr-0.5" />Override: {m.overrideBy} · {m.overrideAt} · «{m.overrideReason}»
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {m.status === 'open' && (
            <Locked perm="foreign_delivery.monthly.generate">
              <button onClick={generate} disabled={!canGenerate} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs hover:bg-gray-50 disabled:opacity-50">
                <Receipt className="w-3.5 h-3.5" />Сгенерировать
              </button>
            </Locked>
          )}
          {m.status === 'open' && (
            <Locked perm="foreign_delivery.monthly.generate">
              <button onClick={sendForReview} disabled={!canGenerate} className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-lg text-xs font-semibold disabled:opacity-50">
                <Send className="w-3.5 h-3.5" />На проверку
              </button>
            </Locked>
          )}
          {m.status === 'under_review' && (
            <Locked perm="foreign_delivery.monthly.close">
              <button onClick={closeMonth} disabled={!canClose} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50">
                <CheckCircle2 className="w-3.5 h-3.5" />Закрыть месяц
              </button>
            </Locked>
          )}
          {m.status === 'closed' && canOverride && (
            <button onClick={() => setOverrideOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg text-xs font-semibold">
              <Unlock className="w-3.5 h-3.5" />Override (SuperAdmin)
            </button>
          )}
          <button onClick={exportCsv} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 bg-white hover:bg-gray-50 rounded-lg text-xs">
            <Download className="w-3.5 h-3.5" />Экспорт
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl border bg-blue-50 border-blue-200">
          <p className="text-xs text-blue-700 mb-1">Всего заказов</p>
          <p className="text-xl font-bold text-blue-700">{orders.length}</p>
        </div>
        <div className="p-3 rounded-xl border bg-green-50 border-green-200">
          <p className="text-xs text-green-700 mb-1">Оплат поступило</p>
          <p className="text-xl font-bold text-green-700">{fmtMoney(stats.totalPayments, 'PLN')}</p>
        </div>
        <div className="p-3 rounded-xl border bg-orange-50 border-orange-200">
          <p className="text-xs text-orange-700 mb-1">Локально</p>
          <p className="text-xl font-bold text-orange-700">{fmtMoney(stats.totalLocal)}</p>
        </div>
        <div className="p-3 rounded-xl border bg-rose-50 border-rose-200">
          <p className="text-xs text-rose-700 mb-1">Долг поставщикам</p>
          <p className="text-xl font-bold text-rose-700">{fmtMoney(stats.debtSuppliers)}</p>
        </div>
        <div className="p-3 rounded-xl border bg-purple-50 border-purple-200">
          <p className="text-xs text-purple-700 mb-1">Закрыто взаимозачётом</p>
          <p className="text-xl font-bold text-purple-700">{fmtMoney(stats.settledByOffset)}</p>
        </div>
        <div className="p-3 rounded-xl border bg-red-50 border-red-200">
          <p className="text-xs text-red-700 mb-1">Открытый долг</p>
          <p className="text-xl font-bold text-red-700">{fmtMoney(stats.openDebt)}</p>
        </div>
        {canSeeMargin && (
          <div className="p-3 rounded-xl border bg-amber-50 border-amber-200">
            <p className="text-xs text-amber-700 mb-1">Маржа Польши</p>
            <p className={`text-xl font-bold ${stats.totalMargin >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fmtMoney(stats.totalMargin, 'PLN')}</p>
          </div>
        )}
        <div className="p-3 rounded-xl border bg-gray-50 border-gray-200">
          <p className="text-xs text-gray-700 mb-1">Доставлено / отмен / возврат</p>
          <p className="text-xl font-bold text-gray-900">{stats.delivered} / {stats.cancelled} / {stats.returned}</p>
        </div>
      </div>

      {/* Sellers + Suppliers tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b">
            <p className="font-bold text-gray-900 text-sm">Местные продавцы</p>
          </div>
          {sellerStats.length === 0 ? <p className="p-6 text-center text-xs text-gray-400">Нет данных</p> : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50/70">
                <tr><th className="text-left px-3 py-2 font-medium text-gray-500 text-xs">Продавец</th><th className="text-right px-3 py-2 font-medium text-gray-500 text-xs">Заказов</th><th className="text-right px-3 py-2 font-medium text-gray-500 text-xs">Сумма</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sellerStats.map(s => (
                  <tr key={s.sellerId}>
                    <td className="px-3 py-2"><Link to="/foreign-delivery/local-sellers" className="text-blue-700 hover:underline">{s.name}</Link></td>
                    <td className="px-3 py-2 text-right">{s.ordersCount}</td>
                    <td className="px-3 py-2 text-right font-semibold">{fmtMoney(s.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b">
            <p className="font-bold text-gray-900 text-sm">Поставщики</p>
          </div>
          {supplierStats.length === 0 ? <p className="p-6 text-center text-xs text-gray-400">Нет данных</p> : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50/70">
                <tr><th className="text-left px-3 py-2 font-medium text-gray-500 text-xs">Поставщик</th><th className="text-right px-3 py-2 font-medium text-gray-500 text-xs">Заказов</th><th className="text-right px-3 py-2 font-medium text-gray-500 text-xs">Долг</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {supplierStats.map(s => (
                  <tr key={s.supplierId}>
                    <td className="px-3 py-2"><Link to="/foreign-delivery/suppliers" className="text-blue-700 hover:underline">{s.name}</Link></td>
                    <td className="px-3 py-2 text-right">{s.ordersCount}</td>
                    <td className="px-3 py-2 text-right font-semibold">{fmtMoney(s.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Lock note */}
      {isClosed && !overrideActive && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-800 flex items-center gap-2">
          <Lock className="w-4 h-4" />
          Месяц закрыт. Изменения возможны только через SuperAdmin override.
        </div>
      )}

      {/* Override modal */}
      {overrideOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm" onClick={() => setOverrideOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                <Unlock className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <p className="font-bold text-gray-900">SuperAdmin Override</p>
                <p className="text-xs text-gray-500 mt-0.5">Откроет закрытый месяц для редактирования. Запишется в audit.</p>
              </div>
            </div>
            <textarea value={overrideReason} onChange={e => setOverrideReason(e.target.value)}
              placeholder="Причина override (обязательно)..." rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 mb-3" />
            <div className="flex gap-2">
              <button onClick={() => setOverrideOpen(false)} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Отмена</button>
              <button onClick={applyOverride} className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold">Применить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
