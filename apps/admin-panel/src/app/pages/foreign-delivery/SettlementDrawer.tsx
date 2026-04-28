/**
 * SettlementDrawer — full Order Settlement Card.
 *
 * Opens as a right-side drawer (portal). Shows everything required for
 * a single foreign order: customer payment, refunds, local seller,
 * supplier, costs (5 lines), supplier costs (3 lines), totals, margin,
 * remaining debt, documents, audit log.
 *
 * Editable fields are gated by `foreign_delivery.settlement_cards.manage`.
 * Margin is hidden when user lacks `foreign_delivery.margin.view`.
 */
import { useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  X, Calculator, FileText, Upload, Download, CheckCircle2, History,
  Edit2, Save, Receipt, Building2, Boxes, Truck, Package, AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Locked } from '../../components/rbac/PermissionLock';
import {
  calcSettlement, fmtMoney, LOCAL_SELLERS, SUPPLIERS,
  PAYMENT_STATUS_LABELS, FULFILLMENT_STATUS_LABELS, SETTLEMENT_STATUS_LABELS,
  FOREIGN_DOCS, DOC_KIND_LABELS, DOC_STATUS_LABELS,
  type ForeignOrder, type AuditEntry,
} from '../../data/foreign-delivery';

interface Props {
  order:    ForeignOrder;
  onClose:  () => void;
  onPatch:  (patch: Partial<ForeignOrder>) => void;
}

const NUM_FIELDS = [
  { key: 'localProductCost',     label: 'Стоимость товара (TMT)' },
  { key: 'localDeliveryCost',    label: 'Доставка (TMT)' },
  { key: 'packagingCost',        label: 'Упаковка (TMT)' },
  { key: 'turkmenCommission',    label: 'Комиссия TM (TMT)' },
  { key: 'additionalExpenses',   label: 'Доп. расходы (TMT)' },
  { key: 'supplierProductCost',  label: 'Поставщик: стоимость' },
  { key: 'supplierDeliveryCost', label: 'Поставщик: доставка' },
  { key: 'supplierServiceFee',   label: 'Поставщик: сервис' },
  { key: 'supplierDiscounts',    label: 'Поставщик: скидки' },
  { key: 'supplierRefunds',      label: 'Поставщик: возвраты' },
  { key: 'paymentProviderFee',   label: 'Комиссия платёжки' },
  { key: 'refundAmount',         label: 'Сумма возврата клиенту' },
  { key: 'alreadySettled',       label: 'Уже оплачено' },
  { key: 'setoffAmount',         label: 'Закрыто взаимозачётом' },
  { key: 'paidToTurkmen',        label: 'Перечислено в TM' },
] as const;

function nowAudit(action: string, actor = 'Текущий пользователь', role = 'op'): AuditEntry {
  return { at: new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }), actor, role, action };
}

export function SettlementDrawer({ order, onClose, onPatch }: Props) {
  const { hasPermission, user } = useAuth();
  const canManage    = hasPermission('foreign_delivery.settlement_cards.manage')
                    || hasPermission('foreign_delivery.orders.manage');
  const canSeeMargin = hasPermission('foreign_delivery.margin.view')
                    || hasPermission('foreign_delivery.financials.view');
  const canApproveDoc= hasPermission('foreign_delivery.documents.approve');
  const canUpload    = hasPermission('foreign_delivery.documents.upload');
  const canDownload  = hasPermission('foreign_delivery.documents.download');

  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState<Record<string, number>>(() =>
    Object.fromEntries(NUM_FIELDS.map(f => [f.key, (order as any)[f.key] as number]))
  );

  const totals = useMemo(() => calcSettlement(order), [order]);

  const seller = LOCAL_SELLERS.find(s => s.sellerId === order.localSellerId);
  const supplier = SUPPLIERS.find(s => s.supplierId === order.supplierId);
  const docs = FOREIGN_DOCS.filter(d => order.documents.includes(d.docId));

  const ps = PAYMENT_STATUS_LABELS[order.paymentStatus];
  const fs = FULFILLMENT_STATUS_LABELS[order.fulfillment];
  const ss = SETTLEMENT_STATUS_LABELS[order.settlement];

  function recalc() {
    onPatch({}); // triggers re-render of totals via parent state update path
    toast.success('Финансы пересчитаны', {
      description: `Польша → TM: ${fmtMoney(totals.amountPolandOwesTurkmen)} · Маржа: ${fmtMoney(totals.polandMargin, order.paymentCurrency)}`,
    });
  }

  function saveEdits() {
    if (!canManage) return;
    const patch: Partial<ForeignOrder> = {};
    for (const f of NUM_FIELDS) {
      if (draft[f.key] !== (order as any)[f.key]) {
        (patch as any)[f.key] = Number(draft[f.key]) || 0;
      }
    }
    if (Object.keys(patch).length === 0) { setEditing(false); return; }
    order.audit.unshift(nowAudit('Изменены суммы расчёта', user?.name ?? 'op', user?.role ?? 'op'));
    onPatch(patch);
    setEditing(false);
    toast.success('Сохранено');
  }

  function setStatus(s: typeof order.settlement, label: string) {
    if (!canManage) return;
    order.audit.unshift(nowAudit(`Статус расчёта: ${label}`, user?.name ?? 'op', user?.role ?? 'op'));
    onPatch({ settlement: s });
    toast.success(`${order.orderId}: ${label}`);
  }

  function markPaid() {
    if (!canManage) return;
    const patch: Partial<ForeignOrder> = {
      paidToTurkmen: order.paidToTurkmen + Math.max(0, totals.remainingDebt),
      settlement: 'settled',
    };
    order.audit.unshift(nowAudit('Расчёт закрыт (оплачено)', user?.name ?? 'op', user?.role ?? 'op'));
    onPatch(patch);
    toast.success(`${order.orderId}: оплачено`);
  }

  function applySetoff() {
    if (!canManage) return;
    const patch: Partial<ForeignOrder> = {
      setoffAmount: order.setoffAmount + Math.max(0, totals.remainingDebt),
      settlement: 'settled',
    };
    order.audit.unshift(nowAudit('Закрыто взаимозачётом', user?.name ?? 'op', user?.role ?? 'op'));
    onPatch(patch);
    toast.success(`${order.orderId}: закрыто взаимозачётом`);
  }

  const node = (
    <div className="fixed inset-0 z-[200] flex items-stretch justify-end bg-gray-900/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white shadow-2xl w-full max-w-3xl flex flex-col h-full" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b shrink-0 flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-gray-500 font-mono uppercase tracking-wider">Settlement Card</p>
            <p className="font-bold text-gray-900 truncate">{order.orderId}</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <span className={`px-1.5 py-0 rounded text-[9px] font-bold ${ps.cls}`}>{ps.label}</span>
              <span className={`px-1.5 py-0 rounded text-[9px] font-bold ${fs.cls}`}>{fs.label}</span>
              <span className={`px-1.5 py-0 rounded text-[9px] font-bold ${ss.cls}`}>{ss.label}</span>
              <span className="text-[10px] text-gray-400">{order.createdAt}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg" title="Закрыть"><X className="w-4 h-4 text-gray-500" /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Customer + payment */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <p className="text-[10px] uppercase font-bold text-blue-700 mb-1">Клиент платил Польше</p>
              <p className="text-sm font-bold text-gray-900">{order.customerName}</p>
              <p className="text-xs text-gray-700">{order.customerCountry} · {order.customerEmail}</p>
              <p className="text-xs text-gray-700">{order.customerPhone}</p>
              <p className="text-2xl font-bold text-blue-700 mt-2">{fmtMoney(order.paymentAmount, order.paymentCurrency)}</p>
              <p className="text-[10px] text-gray-500">провайдер: {order.paymentProvider} · комиссия {fmtMoney(order.paymentProviderFee, order.paymentCurrency)}</p>
              {order.refundAmount > 0 && (
                <p className="text-xs text-rose-700 mt-1">Возврат: −{fmtMoney(order.refundAmount, order.paymentCurrency)}</p>
              )}
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-3">
              <p className="text-[10px] uppercase font-bold text-green-700 mb-1">Получатель в Туркменистане</p>
              <p className="text-sm font-bold text-gray-900">{order.recipientName}</p>
              <p className="text-xs text-gray-700">{order.recipientPhone}</p>
              <p className="text-xs text-gray-700">{order.recipientAddress}</p>
              {order.deliveryNote && <p className="text-[10px] text-gray-500 mt-1 italic">«{order.deliveryNote}»</p>}
            </div>
          </section>

          {/* Items */}
          <section>
            <p className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5"><Package className="w-3.5 h-3.5" />Товары</p>
            <div className="space-y-1">
              {order.items.map((it, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg text-sm">
                  <span className="text-lg">{it.photoEmoji}</span>
                  <span className="flex-1">{it.qty}× {it.productName}</span>
                  <span className="text-gray-500 text-xs">{it.categoryName}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Local seller / supplier */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-3">
              <p className="text-[10px] uppercase font-bold text-gray-500 mb-1 flex items-center gap-1"><Truck className="w-3 h-3" />Локальный продавец</p>
              {seller ? (
                <Link to="/foreign-delivery/local-sellers" className="block">
                  <p className="text-sm font-bold text-gray-900">{seller.name}</p>
                  <p className="text-xs text-gray-500">{seller.address}</p>
                  <p className="text-[10px] text-gray-500">★ {seller.rating} · {seller.qualityScore}/100 · {seller.ordersCount} заказов</p>
                </Link>
              ) : (
                <p className="text-xs text-gray-400">Не назначен</p>
              )}
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-3">
              <p className="text-[10px] uppercase font-bold text-gray-500 mb-1 flex items-center gap-1"><Boxes className="w-3 h-3" />Поставщик</p>
              {supplier ? (
                <Link to="/foreign-delivery/suppliers" className="block">
                  <p className="text-sm font-bold text-gray-900">{supplier.name}</p>
                  <p className="text-xs text-gray-500">{supplier.country} · {supplier.contact}</p>
                  <p className="text-[10px] text-gray-500">{supplier.email}</p>
                </Link>
              ) : (
                <p className="text-xs text-gray-400">Не назначен</p>
              )}
            </div>
          </section>

          {/* Costs */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5"><Calculator className="w-3.5 h-3.5" />Расходы и расчёт</p>
              {canManage && !editing && (
                <button onClick={() => setEditing(true)} className="flex items-center gap-1 px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded text-xs">
                  <Edit2 className="w-3 h-3" />Изменить
                </button>
              )}
              {editing && (
                <button onClick={saveEdits} className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs">
                  <Save className="w-3 h-3" />Сохранить
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {NUM_FIELDS.map(f => {
                const cur = (order as any)[f.key] as number;
                const drf = draft[f.key];
                if (editing) {
                  return (
                    <label key={f.key} className="flex items-center gap-2 text-xs px-2 py-1.5 bg-gray-50 rounded">
                      <span className="flex-1 text-gray-600">{f.label}</span>
                      <input type="number" value={drf}
                        onChange={e => setDraft(d => ({ ...d, [f.key]: Number(e.target.value) }))}
                        className="w-24 px-2 py-0.5 border border-gray-300 rounded text-right" />
                    </label>
                  );
                }
                return (
                  <div key={f.key} className="flex items-center gap-2 text-xs px-2 py-1.5 bg-gray-50 rounded">
                    <span className="flex-1 text-gray-600">{f.label}</span>
                    <span className="font-semibold text-gray-900">{cur}</span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Totals */}
          <section className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
            <p className="text-[10px] uppercase font-bold text-blue-700 mb-3">Итоги расчёта</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-white rounded-lg p-2.5">
                <p className="text-[10px] text-gray-500 uppercase">Локальные расходы (всего)</p>
                <p className="text-lg font-bold text-gray-900">{fmtMoney(totals.totalLocalFulfillmentCost)}</p>
              </div>
              <div className="bg-white rounded-lg p-2.5">
                <p className="text-[10px] text-gray-500 uppercase">Польша → Туркменистан</p>
                <p className="text-lg font-bold text-blue-700">{fmtMoney(totals.amountPolandOwesTurkmen)}</p>
              </div>
              <div className="bg-white rounded-lg p-2.5">
                <p className="text-[10px] text-gray-500 uppercase">Долг поставщику</p>
                <p className="text-lg font-bold text-orange-700">{fmtMoney(totals.supplierPayable)}</p>
              </div>
              <div className="bg-white rounded-lg p-2.5">
                <p className="text-[10px] text-gray-500 uppercase">{canSeeMargin ? 'Маржа Польши' : 'Маржа Польши (нет права)'}</p>
                <p className={`text-lg font-bold ${canSeeMargin ? (totals.polandMargin >= 0 ? 'text-green-700' : 'text-red-700') : 'text-gray-300'}`}>
                  {canSeeMargin ? fmtMoney(totals.polandMargin, order.paymentCurrency) : '****'}
                </p>
              </div>
            </div>
            <div className="mt-3 bg-white rounded-lg p-2.5 flex items-center justify-between">
              <span className="text-xs text-gray-600">Открытый остаток долга</span>
              <span className={`text-xl font-bold ${totals.remainingDebt > 0 ? 'text-red-700' : 'text-green-700'}`}>
                {fmtMoney(totals.remainingDebt)}
              </span>
            </div>
            <p className="text-[10px] text-gray-500 mt-2">
              Уже оплачено: {fmtMoney(order.alreadySettled)} · Взаимозачёт: {fmtMoney(order.setoffAmount)} · Перечислено: {fmtMoney(order.paidToTurkmen)}
            </p>
          </section>

          {/* Documents */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" />Документы ({docs.length})</p>
              <Locked perm="foreign_delivery.documents.upload">
                <button disabled={!canUpload} className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded text-xs">
                  <Upload className="w-3 h-3" />Загрузить
                </button>
              </Locked>
            </div>
            {docs.length === 0 ? (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-xs text-orange-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />Документов нет — заказ помечен «без документов»
              </div>
            ) : (
              <div className="space-y-1">
                {docs.map(d => {
                  const ds = DOC_STATUS_LABELS[d.status];
                  return (
                    <div key={d.docId} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg text-xs">
                      <FileText className="w-3.5 h-3.5 text-gray-500" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 truncate">{d.filename}</p>
                        <p className="text-[10px] text-gray-500 truncate">{DOC_KIND_LABELS[d.kind]} · {d.uploadedBy} · {d.uploadedAt}</p>
                      </div>
                      <span className={`px-1.5 py-0 rounded text-[9px] font-bold ${ds.cls}`}>{ds.label}</span>
                      {canDownload && <button className="p-1 hover:bg-gray-200 rounded text-gray-500" title="Скачать"><Download className="w-3 h-3" /></button>}
                      {canApproveDoc && d.status !== 'verified' && (
                        <button className="p-1 hover:bg-green-100 text-green-700 rounded" title="Одобрить"><CheckCircle2 className="w-3 h-3" /></button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Audit history */}
          <section>
            <p className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5"><History className="w-3.5 h-3.5" />Audit history ({order.audit.length})</p>
            <div className="space-y-1">
              {order.audit.map((e, i) => (
                <div key={i} className="px-3 py-2 bg-gray-50 rounded-lg text-xs">
                  <p className="text-gray-800">{e.action}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{e.actor} <span className="font-mono">({e.role})</span> · {e.at}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Footer actions */}
        <div className="border-t bg-gray-50 px-6 py-3 shrink-0">
          <div className="flex flex-wrap gap-2">
            <Locked perm="foreign_delivery.orders.manage">
              <button onClick={recalc} disabled={!canManage} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 text-gray-700 rounded-lg text-xs font-semibold">
                <Calculator className="w-3.5 h-3.5" />Пересчитать
              </button>
            </Locked>
            <Locked perm="foreign_delivery.settlement_cards.manage">
              <button onClick={() => setStatus('under_review', 'На проверке')} disabled={!canManage} className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-100 hover:bg-yellow-200 disabled:opacity-50 text-yellow-800 rounded-lg text-xs font-semibold">
                Отметить «На проверке»
              </button>
            </Locked>
            <Locked perm="foreign_delivery.settlement_cards.manage">
              <button onClick={applySetoff} disabled={!canManage} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 hover:bg-purple-200 disabled:opacity-50 text-purple-800 rounded-lg text-xs font-semibold">
                Закрыть взаимозачётом
              </button>
            </Locked>
            <Locked perm="foreign_delivery.settlement_cards.manage">
              <button onClick={markPaid} disabled={!canManage} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />Отметить оплачено
              </button>
            </Locked>
          </div>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(node, document.body);
}
