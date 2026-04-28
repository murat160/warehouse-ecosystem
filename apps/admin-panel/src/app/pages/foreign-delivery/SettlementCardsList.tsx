/**
 * SettlementCardsList — list view of all settlement cards.
 * Each row = one foreign order's settlement summary; click to open drawer.
 */
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Receipt, ArrowRight, Lock, Download, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  FOREIGN_ORDERS, calcSettlement, fmtMoney, SETTLEMENT_STATUS_LABELS,
  type ForeignOrder, type SettlementStatus,
} from '../../data/foreign-delivery';
import { exportToCsv } from '../../utils/downloads';
import { toast } from 'sonner';
import { SettlementDrawer } from './SettlementDrawer';

export function SettlementCardsList() {
  const { hasPermission } = useAuth();
  const canView = hasPermission('foreign_delivery.settlement_cards.view') || hasPermission('foreign_delivery.view');

  const [orders, setOrders]   = useState<ForeignOrder[]>(FOREIGN_ORDERS);
  const [search, setSearch]   = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SettlementStatus>('all');
  const [openId, setOpenId]   = useState<string | null>(null);
  const canSeeMargin = hasPermission('foreign_delivery.margin.view') || hasPermission('foreign_delivery.financials.view');

  const filtered = useMemo(() => orders.filter(o => {
    const q = search.toLowerCase();
    const matchSearch = !q || o.orderId.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || o.settlement === statusFilter;
    return matchSearch && matchStatus;
  }), [orders, search, statusFilter]);

  const stats = useMemo(() => ({
    open:              orders.filter(o => o.settlement === 'open').length,
    under_review:      orders.filter(o => o.settlement === 'under_review').length,
    partially_settled: orders.filter(o => o.settlement === 'partially_settled').length,
    settled:           orders.filter(o => o.settlement === 'settled').length,
  }), [orders]);

  function patch(id: string, p: Partial<ForeignOrder>) {
    setOrders(prev => prev.map(x => x.orderId === id ? { ...x, ...p } : x));
    const i = FOREIGN_ORDERS.findIndex(o => o.orderId === id);
    if (i >= 0) FOREIGN_ORDERS[i] = { ...FOREIGN_ORDERS[i], ...p };
  }

  function exportCsv() {
    if (filtered.length === 0) { toast.info('Нет карточек'); return; }
    exportToCsv(filtered.map(o => {
      const t = calcSettlement(o);
      return {
        orderId: o.orderId, paymentAmount: o.paymentAmount,
        paymentCurrency: o.paymentCurrency,
        totalLocal: t.totalLocalFulfillmentCost,
        polandOwesTm: t.amountPolandOwesTurkmen,
        supplierPayable: t.supplierPayable,
        polandMargin: t.polandMargin,
        remainingDebt: t.remainingDebt,
        settlement: o.settlement,
      };
    }) as any[], [
      { key: 'orderId',         label: 'Order ID' },
      { key: 'paymentAmount',   label: 'Оплата' },
      { key: 'paymentCurrency', label: 'Валюта' },
      { key: 'totalLocal',      label: 'Локально' },
      { key: 'polandOwesTm',    label: 'Долг П→TM' },
      { key: 'supplierPayable', label: 'Долг поставщику' },
      { key: 'polandMargin',    label: 'Маржа Польши' },
      { key: 'remainingDebt',   label: 'Открытый долг' },
      { key: 'settlement',      label: 'Статус' },
    ], 'settlement-cards');
    toast.success(`Экспорт: ${filtered.length} карточек`);
  }

  if (!canView) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <Lock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <h2 className="text-lg font-bold text-gray-900">Доступ ограничен</h2>
      </div>
    );
  }

  const open = orders.find(o => o.orderId === openId);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">Зарубежные расчёты</p>
          <div className="flex items-center gap-2">
            <Receipt className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Карточки расчёта</h1>
            <span className="px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-[10px] font-mono">{orders.length} карточек</span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">По каждому зарубежному заказу — отдельная карточка с расчётом, документами и audit.</p>
        </div>
        <button onClick={exportCsv} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm">
          <Download className="w-4 h-4" />Экспорт CSV
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button onClick={() => setStatusFilter('open')}
          className={`p-3 rounded-xl border text-left transition-all hover:shadow-md cursor-pointer active:scale-[0.97] ${statusFilter === 'open' ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200' : 'bg-white border-gray-200'}`}>
          <p className="text-xs text-gray-500 mb-1">Открыто</p>
          <p className="text-xl font-bold text-blue-700">{stats.open}</p>
        </button>
        <button onClick={() => setStatusFilter('under_review')}
          className={`p-3 rounded-xl border text-left transition-all hover:shadow-md ${statusFilter === 'under_review' ? 'bg-yellow-50 border-yellow-300 ring-2 ring-yellow-200' : 'bg-white border-gray-200'}`}>
          <p className="text-xs text-gray-500 mb-1">На проверке</p>
          <p className="text-xl font-bold text-yellow-700">{stats.under_review}</p>
        </button>
        <button onClick={() => setStatusFilter('partially_settled')}
          className={`p-3 rounded-xl border text-left transition-all hover:shadow-md ${statusFilter === 'partially_settled' ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-200' : 'bg-white border-gray-200'}`}>
          <p className="text-xs text-gray-500 mb-1">Частично закрыто</p>
          <p className="text-xl font-bold text-purple-700">{stats.partially_settled}</p>
        </button>
        <button onClick={() => setStatusFilter('settled')}
          className={`p-3 rounded-xl border text-left transition-all hover:shadow-md ${statusFilter === 'settled' ? 'bg-green-50 border-green-300 ring-2 ring-green-200' : 'bg-white border-gray-200'}`}>
          <p className="text-xs text-gray-500 mb-1">Закрыто</p>
          <p className="text-xl font-bold text-green-700">{stats.settled}</p>
        </button>
      </div>

      {/* Filter */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по Order ID, клиенту..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        {statusFilter !== 'all' && (
          <button onClick={() => setStatusFilter('all')} className="px-3 py-2 bg-orange-50 border border-orange-200 text-orange-700 rounded-lg text-sm">
            Сбросить фильтр
          </button>
        )}
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(o => {
          const t = calcSettlement(o);
          const ss = SETTLEMENT_STATUS_LABELS[o.settlement];
          return (
            <button key={o.orderId} onClick={() => setOpenId(o.orderId)}
              className="bg-white rounded-xl border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all text-left">
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900">{o.orderId}</p>
                  <p className="text-xs text-gray-500">{o.customerName} · {o.createdAt}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ss.cls}`}>{ss.label}</span>
              </div>
              <div className="p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Оплата клиента</span><span className="font-bold">{fmtMoney(o.paymentAmount, o.paymentCurrency)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Локально</span><span>{fmtMoney(t.totalLocalFulfillmentCost)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Польша → TM</span><span className="text-blue-700 font-semibold">{fmtMoney(t.amountPolandOwesTurkmen)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Долг поставщику</span><span>{fmtMoney(t.supplierPayable)}</span></div>
                {canSeeMargin && (
                  <div className="flex justify-between border-t pt-1 mt-1">
                    <span className="text-gray-500">Маржа Польши</span>
                    <span className={`font-bold ${t.polandMargin >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fmtMoney(t.polandMargin, o.paymentCurrency)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-1">
                  <span className="text-gray-500">Открытый долг</span>
                  <span className={`font-bold ${t.remainingDebt > 0 ? 'text-red-700' : 'text-green-700'}`}>{fmtMoney(t.remainingDebt)}</span>
                </div>
                {o.documents.length === 0 && (
                  <p className="text-[10px] text-orange-600 mt-1 flex items-center gap-1"><AlertCircle className="w-2.5 h-2.5" />Без документов</p>
                )}
                <p className="text-[10px] text-blue-600 hover:underline mt-2 flex items-center gap-1">Открыть карточку <ArrowRight className="w-3 h-3" /></p>
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="md:col-span-2 py-16 text-center text-gray-400">
            <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Карточек не найдено</p>
          </div>
        )}
      </div>

      {open && <SettlementDrawer order={open} onClose={() => setOpenId(null)} onPatch={p => patch(open.orderId, p)} />}
    </div>
  );
}
