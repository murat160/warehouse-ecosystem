/**
 * ForeignOrdersList — table of all foreign_paid_local_delivery orders.
 * Filters · search · settlement card drawer · bulk actions (export CSV).
 *
 * Each row has actions:
 *   - Open Settlement Card (drawer)
 *   - Assign local seller / supplier
 *   - Recalculate financials
 *   - Upload / open documents
 *   - Send for review / Close settlement
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Search, Download, Eye, Receipt, FileText, Calculator, CheckCircle2,
  ArrowRight, Lock, AlertCircle, Filter, Plane, Send,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Locked } from '../../components/rbac/PermissionLock';
import { exportToCsv } from '../../utils/downloads';
import {
  FOREIGN_ORDERS, calcSettlement, fmtMoney,
  PAYMENT_STATUS_LABELS, FULFILLMENT_STATUS_LABELS, SETTLEMENT_STATUS_LABELS,
  LOCAL_SELLERS, SUPPLIERS,
  type ForeignOrder, type PaymentStatus, type FulfillmentStatus, type SettlementStatus,
} from '../../data/foreign-delivery';
import { SettlementDrawer } from './SettlementDrawer';

type StatusFilter = 'all' | 'paid' | 'pending' | 'refunded' | 'cancelled' | 'delivered' | 'under_review';

export function ForeignOrdersList() {
  const { hasPermission } = useAuth();
  const [params, setParams] = useSearchParams();

  const [orders, setOrders]   = useState<ForeignOrder[]>(FOREIGN_ORDERS);
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState<StatusFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(params.get('order'));

  // Sync ?order= query param with selected drawer
  useEffect(() => {
    const o = params.get('order');
    if (o) setSelectedId(o);
  }, [params]);

  if (!hasPermission('foreign_delivery.orders.view') && !hasPermission('foreign_delivery.view')) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <Lock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <h2 className="text-lg font-bold text-gray-900">Доступ ограничен</h2>
        <p className="text-sm text-gray-500 mt-1">Нет права <span className="font-mono">foreign_delivery.orders.view</span></p>
      </div>
    );
  }

  const canManage    = hasPermission('foreign_delivery.orders.manage');
  const canSeeMargin = hasPermission('foreign_delivery.margin.view') || hasPermission('foreign_delivery.financials.view');

  const filtered = useMemo(() => {
    return orders.filter(o => {
      const q = search.toLowerCase();
      const matchSearch = !q
        || o.orderId.toLowerCase().includes(q)
        || o.customerName.toLowerCase().includes(q)
        || o.customerEmail.toLowerCase().includes(q)
        || o.recipientName.toLowerCase().includes(q)
        || o.recipientPhone.toLowerCase().includes(q);
      let matchStatus = true;
      if (filter === 'paid')          matchStatus = o.paymentStatus === 'paid';
      else if (filter === 'pending')  matchStatus = o.paymentStatus === 'pending';
      else if (filter === 'refunded') matchStatus = o.paymentStatus === 'refunded' || o.paymentStatus === 'partially_refunded';
      else if (filter === 'cancelled')   matchStatus = o.fulfillment === 'cancelled';
      else if (filter === 'delivered')   matchStatus = o.fulfillment === 'delivered';
      else if (filter === 'under_review')matchStatus = o.settlement === 'under_review';
      return matchSearch && matchStatus;
    });
  }, [orders, search, filter]);

  function patch(orderId: string, patch: Partial<ForeignOrder>) {
    setOrders(prev => prev.map(o => o.orderId === orderId ? { ...o, ...patch } : o));
    const i = FOREIGN_ORDERS.findIndex(o => o.orderId === orderId);
    if (i >= 0) FOREIGN_ORDERS[i] = { ...FOREIGN_ORDERS[i], ...patch };
  }

  function recalc(o: ForeignOrder) {
    if (!canManage) return;
    const totals = calcSettlement(o);
    toast.success('Финансы пересчитаны', {
      description: `Поляндия → TM: ${fmtMoney(totals.amountPolandOwesTurkmen)} · Маржа: ${fmtMoney(totals.polandMargin, o.paymentCurrency)}`,
    });
  }

  function sendToReview(o: ForeignOrder) {
    if (!canManage) return;
    patch(o.orderId, { settlement: 'under_review' });
    o.audit.unshift({ at: new Date().toLocaleString('ru-RU'), actor: 'Текущий пользователь', role: 'op', action: 'Отправлено на проверку' });
    toast.success(`${o.orderId} отправлен на проверку`);
  }

  function closeSettlement(o: ForeignOrder) {
    if (!canManage) return;
    const totals = calcSettlement(o);
    const willBe: SettlementStatus = totals.remainingDebt <= 0 ? 'settled' : 'partially_settled';
    patch(o.orderId, { settlement: willBe });
    o.audit.unshift({ at: new Date().toLocaleString('ru-RU'), actor: 'Текущий пользователь', role: 'op', action: `Расчёт ${willBe === 'settled' ? 'закрыт' : 'частично закрыт'}` });
    toast.success(`${o.orderId}: ${willBe === 'settled' ? 'закрыт' : 'частично закрыт'}`);
  }

  function exportCsv() {
    if (filtered.length === 0) { toast.info('Нет заказов для экспорта'); return; }
    exportToCsv(filtered.map(o => {
      const t = calcSettlement(o);
      return {
        orderId: o.orderId, createdAt: o.createdAt,
        customerCountry: o.customerCountry, customerName: o.customerName, customerEmail: o.customerEmail, customerPhone: o.customerPhone,
        paymentCurrency: o.paymentCurrency, paymentAmount: o.paymentAmount, paymentProvider: o.paymentProvider,
        paymentStatus: o.paymentStatus,
        recipientName: o.recipientName, recipientPhone: o.recipientPhone, recipientAddress: o.recipientAddress,
        items: o.items.map(i => `${i.qty}× ${i.productName}`).join('; '),
        seller: LOCAL_SELLERS.find(s => s.sellerId === o.localSellerId)?.name ?? '',
        supplier: SUPPLIERS.find(s => s.supplierId === o.supplierId)?.name ?? '',
        localProductCost: o.localProductCost, localDeliveryCost: o.localDeliveryCost,
        packagingCost: o.packagingCost, turkmenCommission: o.turkmenCommission,
        totalLocal: t.totalLocalFulfillmentCost,
        polandOwesTm: t.amountPolandOwesTurkmen,
        supplierPayable: t.supplierPayable,
        polandMargin: t.polandMargin,
        remainingDebt: t.remainingDebt,
        fulfillment: o.fulfillment, settlement: o.settlement,
        documents: o.documents.length,
      };
    }) as any[], [
      { key: 'orderId',          label: 'Order ID' },
      { key: 'createdAt',        label: 'Дата' },
      { key: 'customerCountry',  label: 'Страна клиента' },
      { key: 'customerName',     label: 'Клиент' },
      { key: 'customerEmail',    label: 'Email' },
      { key: 'customerPhone',    label: 'Тел' },
      { key: 'paymentCurrency',  label: 'Валюта' },
      { key: 'paymentAmount',    label: 'Оплата' },
      { key: 'paymentProvider',  label: 'Провайдер' },
      { key: 'paymentStatus',    label: 'Статус оплаты' },
      { key: 'recipientName',    label: 'Получатель' },
      { key: 'recipientPhone',   label: 'Тел получателя' },
      { key: 'recipientAddress', label: 'Адрес' },
      { key: 'items',            label: 'Товары' },
      { key: 'seller',           label: 'Продавец' },
      { key: 'supplier',         label: 'Поставщик' },
      { key: 'localProductCost', label: 'Стоимость товара' },
      { key: 'localDeliveryCost',label: 'Доставка' },
      { key: 'packagingCost',    label: 'Упаковка' },
      { key: 'turkmenCommission',label: 'Комиссия TM' },
      { key: 'totalLocal',       label: 'Итог локально' },
      { key: 'polandOwesTm',     label: 'Долг Польша→TM' },
      { key: 'supplierPayable',  label: 'Долг поставщику' },
      { key: 'polandMargin',     label: 'Маржа Польши' },
      { key: 'remainingDebt',    label: 'Открытый долг' },
      { key: 'fulfillment',      label: 'Исполнение' },
      { key: 'settlement',       label: 'Расчёт' },
      { key: 'documents',        label: 'Документов' },
    ], 'foreign-orders');
    toast.success(`Экспорт: ${filtered.length} заказов`);
  }

  function openCard(orderId: string) {
    setSelectedId(orderId);
    setParams(prev => { const p = new URLSearchParams(prev); p.set('order', orderId); return p; });
  }

  function closeCard() {
    setSelectedId(null);
    setParams(prev => { const p = new URLSearchParams(prev); p.delete('order'); return p; });
  }

  const selected = orders.find(o => o.orderId === selectedId) ?? null;

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">Зарубежные расчёты</p>
          <div className="flex items-center gap-2">
            <Plane className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Зарубежные заказы</h1>
            <span className="px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-[10px] font-mono">foreign_paid_local_delivery</span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">Заказы, оплаченные клиентами за рубежом и исполняемые внутри Туркменистана.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCsv} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm">
            <Download className="w-4 h-4" />Экспорт CSV
          </button>
        </div>
      </div>

      {/* Filter strip */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Поиск: Order ID, клиент, получатель, телефон..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value as StatusFilter)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="all">Все статусы</option>
          <option value="paid">Оплаченные</option>
          <option value="pending">Ожидающие оплаты</option>
          <option value="refunded">Возвраты</option>
          <option value="delivered">Доставлено</option>
          <option value="cancelled">Отменено</option>
          <option value="under_review">На проверке</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/70 border-b border-gray-100">
              <tr>
                <th className="text-left px-3 py-3 font-medium text-gray-500">Order / Клиент</th>
                <th className="text-left px-3 py-3 font-medium text-gray-500 hidden lg:table-cell">Получатель</th>
                <th className="text-right px-3 py-3 font-medium text-gray-500">Оплата</th>
                <th className="text-right px-3 py-3 font-medium text-gray-500 hidden md:table-cell">Локально</th>
                {canSeeMargin && <th className="text-right px-3 py-3 font-medium text-gray-500 hidden xl:table-cell">Маржа</th>}
                <th className="text-right px-3 py-3 font-medium text-gray-500 hidden lg:table-cell">Долг</th>
                <th className="text-left px-3 py-3 font-medium text-gray-500">Статусы</th>
                <th className="text-center px-3 py-3 font-medium text-gray-500">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(o => {
                const totals = calcSettlement(o);
                const ps = PAYMENT_STATUS_LABELS[o.paymentStatus];
                const fs = FULFILLMENT_STATUS_LABELS[o.fulfillment];
                const ss = SETTLEMENT_STATUS_LABELS[o.settlement];
                const seller = LOCAL_SELLERS.find(s => s.sellerId === o.localSellerId);
                return (
                  <tr key={o.orderId} className="hover:bg-gray-50/40 transition-colors">
                    <td className="px-3 py-3">
                      <div className="flex items-start gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-base shrink-0">{o.items[0]?.photoEmoji ?? '📦'}</div>
                        <div className="min-w-0">
                          <button onClick={() => openCard(o.orderId)} className="text-sm font-semibold text-gray-900 hover:text-blue-700 text-left block truncate">{o.orderId}</button>
                          <p className="text-xs text-gray-700 truncate">{o.customerCountry} · {o.customerName}</p>
                          <p className="text-[10px] text-gray-400 truncate">{o.customerEmail} · {o.customerPhone}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{o.createdAt}</p>
                          {o.documents.length === 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-orange-600 mt-1"><AlertCircle className="w-2.5 h-2.5" />нет документов</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 hidden lg:table-cell">
                      <p className="text-xs font-semibold text-gray-800">{o.recipientName}</p>
                      <p className="text-[10px] text-gray-500">{o.recipientPhone}</p>
                      <p className="text-[10px] text-gray-500 truncate max-w-[200px]">{o.recipientAddress}</p>
                      {seller && <p className="text-[10px] text-blue-700 mt-0.5">→ {seller.name}</p>}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <p className="text-sm font-bold text-gray-900">{fmtMoney(o.paymentAmount, o.paymentCurrency)}</p>
                      <p className="text-[10px] text-gray-500">провайдер: {o.paymentProvider}</p>
                      {o.paymentProviderFee > 0 && (
                        <p className="text-[10px] text-gray-500">−{fmtMoney(o.paymentProviderFee, o.paymentCurrency)} fee</p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right hidden md:table-cell">
                      <p className="text-sm font-semibold">{fmtMoney(totals.totalLocalFulfillmentCost)}</p>
                      <p className="text-[10px] text-gray-500">товар + доставка + комиссия</p>
                    </td>
                    {canSeeMargin && (
                      <td className="px-3 py-3 text-right hidden xl:table-cell">
                        <p className={`text-sm font-bold ${totals.polandMargin >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          {fmtMoney(totals.polandMargin, o.paymentCurrency)}
                        </p>
                      </td>
                    )}
                    <td className="px-3 py-3 text-right hidden lg:table-cell">
                      <p className={`text-sm font-bold ${totals.remainingDebt > 0 ? 'text-red-700' : 'text-gray-700'}`}>
                        {fmtMoney(totals.remainingDebt)}
                      </p>
                      <p className="text-[10px] text-gray-500">остаток</p>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className={`inline-flex items-center w-fit px-1.5 py-0 rounded text-[9px] font-bold ${ps.cls}`}>{ps.label}</span>
                        <span className={`inline-flex items-center w-fit px-1.5 py-0 rounded text-[9px] font-bold ${fs.cls}`}>{fs.label}</span>
                        <span className={`inline-flex items-center w-fit px-1.5 py-0 rounded text-[9px] font-bold ${ss.cls}`}>{ss.label}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openCard(o.orderId)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md" title="Карточка расчёта"><Receipt className="w-3.5 h-3.5" /></button>
                        <button onClick={() => openCard(o.orderId)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md" title="Открыть"><Eye className="w-3.5 h-3.5" /></button>
                        <Link to="/foreign-delivery/documents" className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-md" title="Документы"><FileText className="w-3.5 h-3.5" /></Link>
                        <Locked perm="foreign_delivery.orders.manage">
                          <button onClick={() => recalc(o)} disabled={!canManage} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-md" title="Пересчитать"><Calculator className="w-3.5 h-3.5" /></button>
                        </Locked>
                        <Locked perm="foreign_delivery.orders.manage">
                          <button onClick={() => sendToReview(o)} disabled={!canManage} className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-md" title="На проверку"><Send className="w-3.5 h-3.5" /></button>
                        </Locked>
                        <Locked perm="foreign_delivery.orders.manage">
                          <button onClick={() => closeSettlement(o)} disabled={!canManage} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md" title="Закрыть расчёт"><CheckCircle2 className="w-3.5 h-3.5" /></button>
                        </Locked>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-16 text-center text-gray-400">
              <Filter className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Заказов по фильтру не найдено</p>
            </div>
          )}
        </div>
      </div>

      {/* Drawer */}
      {selected && (
        <SettlementDrawer order={selected} onClose={closeCard}
          onPatch={p => patch(selected.orderId, p)} />
      )}
    </div>
  );
}
