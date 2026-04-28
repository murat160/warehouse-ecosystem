/**
 * ForeignDeliveryDashboard — overview for /admin/foreign-delivery.
 * Shows KPI strip, status alerts, and top-debt lists.
 * KPI cards are clickable: each links to the relevant subsection.
 */
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Plane, Receipt, AlertTriangle, FileText, DollarSign, TrendingUp,
  Building2, Boxes, Truck, RotateCcw, ChevronRight, Lock,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  FOREIGN_ORDERS, LOCAL_SELLERS, SUPPLIERS, SUPPLIER_INVOICES,
  aggregateOrders, calcSettlement, fmtMoney,
  PAYMENT_STATUS_LABELS, SETTLEMENT_STATUS_LABELS,
} from '../../data/foreign-delivery';

interface KpiCardProps {
  label:    string;
  value:    string | number;
  hint?:    string;
  to:       string;
  icon:     any;
  color:    'blue' | 'green' | 'red' | 'orange' | 'purple' | 'amber' | 'gray' | 'rose';
}

const KPI_COLOR: Record<KpiCardProps['color'], string> = {
  blue:   'bg-blue-50 border-blue-200 text-blue-700',
  green:  'bg-green-50 border-green-200 text-green-700',
  red:    'bg-red-50 border-red-200 text-red-700',
  orange: 'bg-orange-50 border-orange-200 text-orange-700',
  purple: 'bg-purple-50 border-purple-200 text-purple-700',
  amber:  'bg-amber-50 border-amber-200 text-amber-700',
  gray:   'bg-white border-gray-200 text-gray-700',
  rose:   'bg-rose-50 border-rose-200 text-rose-700',
};

function KpiCard({ label, value, hint, to, icon: Icon, color }: KpiCardProps) {
  return (
    <Link to={to} className={`p-4 rounded-xl border transition-all hover:shadow-md cursor-pointer active:scale-[0.97] ${KPI_COLOR[color]}`}>
      <div className="flex items-start gap-2">
        <Icon className="w-5 h-5 shrink-0 mt-0.5 opacity-80" />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider opacity-70">{label}</p>
          <p className="text-xl font-bold mt-0.5">{value}</p>
          {hint && <p className="text-[10px] opacity-70 mt-0.5">{hint}</p>}
        </div>
      </div>
    </Link>
  );
}

export function ForeignDeliveryDashboard() {
  const { hasPermission } = useAuth();

  if (!hasPermission('foreign_delivery.view')) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <Lock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <h2 className="text-lg font-bold text-gray-900">Доступ ограничен</h2>
        <p className="text-sm text-gray-500 mt-1">Нет права <span className="font-mono">foreign_delivery.view</span></p>
      </div>
    );
  }

  const stats = useMemo(() => aggregateOrders(FOREIGN_ORDERS), []);
  const supplierOpen = SUPPLIER_INVOICES.filter(i => i.status !== 'paid' && i.status !== 'cancelled');
  const sellerOpenOutstanding = LOCAL_SELLERS.reduce((s, x) => s + x.outstanding, 0);

  // Top 5 outstanding sellers / suppliers
  const topSellers = [...LOCAL_SELLERS].filter(s => s.outstanding > 0).sort((a, b) => b.outstanding - a.outstanding).slice(0, 5);
  const topSuppliers = [...SUPPLIERS].filter(s => s.outstanding > 0).sort((a, b) => b.outstanding - a.outstanding).slice(0, 5);

  const recentOrders = [...FOREIGN_ORDERS].slice(0, 5);

  // Visibility of margin (Poland) is gated by foreign_delivery.margin.view
  const canSeeMargin = hasPermission('foreign_delivery.margin.view') || hasPermission('foreign_delivery.financials.view');

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">Зарубежные расчёты</p>
          <div className="flex items-center gap-2">
            <Plane className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Foreign Paid Local Delivery</h1>
            <span className="px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono">
              foreign_delivery
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Оплата за рубежом · исполнение в Туркменистане. {FOREIGN_ORDERS.length} заказов в системе.
          </p>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <KpiCard color="blue"   icon={Plane}        label="Зарубежных заказов"        value={FOREIGN_ORDERS.length}                               to="/foreign-delivery/orders"                hint="за всё время" />
        <KpiCard color="green"  icon={DollarSign}   label="Оплат поступило"           value={fmtMoney(stats.totalPayments, 'PLN')}                to="/foreign-delivery/orders"                hint="на польский счёт" />
        <KpiCard color="orange" icon={Truck}        label="Локальные расходы"         value={fmtMoney(stats.totalLocal)}                          to="/foreign-delivery/local-fulfillment"     hint="товар + доставка + комиссия" />
        {canSeeMargin && (
          <KpiCard color="amber"  icon={TrendingUp} label="Маржа Польши"            value={fmtMoney(stats.totalMargin, 'PLN')}                  to="/foreign-delivery/monthly-settlement"    hint={canSeeMargin ? 'до взаимозачёта' : 'нет права'} />
        )}
        <KpiCard color="red"    icon={Building2}    label="Долг Польша → TM"         value={fmtMoney(stats.polandOwesTm)}                        to="/foreign-delivery/intercompany-debt"     hint="всего" />
        <KpiCard color="rose"   icon={Receipt}      label="Долг продавцам"            value={fmtMoney(sellerOpenOutstanding)}                     to="/foreign-delivery/seller-settlements"    hint={`${LOCAL_SELLERS.filter(s=>s.outstanding>0).length} продавцов`} />
        <KpiCard color="rose"   icon={Boxes}        label="Долг поставщикам"          value={`${supplierOpen.length} инвойсов`}                   to="/foreign-delivery/supplier-payables"     hint={`${SUPPLIERS.filter(s=>s.outstanding>0).length} поставщиков`} />
        <KpiCard color="purple" icon={RotateCcw}    label="Закрыто взаимозачётом"    value={fmtMoney(stats.settledByOffset)}                     to="/foreign-delivery/setoff"                hint="за всё время" />
        <KpiCard color="red"    icon={AlertTriangle}label="Открытый долг"             value={fmtMoney(stats.openDebt)}                            to="/foreign-delivery/intercompany-debt"     hint="требует расчёта" />
        <KpiCard color="orange" icon={FileText}     label="Без документов"            value={stats.withoutDocs}                                   to="/foreign-delivery/documents"             hint="заказов" />
        <KpiCard color="amber"  icon={Receipt}      label="На проверке"               value={stats.underReview}                                   to="/foreign-delivery/settlement-cards"      hint="settlement cards" />
        <KpiCard color="gray"   icon={RotateCcw}    label="Отменено / возврат"        value={stats.refundedOrCancelled}                           to="/foreign-delivery/orders"                hint="заказов" />
      </div>

      {/* Status row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Recent orders */}
        <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <p className="font-bold text-gray-900 text-sm flex items-center gap-2"><Plane className="w-4 h-4 text-blue-600" />Последние зарубежные заказы</p>
            <Link to="/foreign-delivery/orders" className="text-xs text-blue-600 hover:underline flex items-center gap-1">Открыть все<ChevronRight className="w-3 h-3" /></Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentOrders.map(o => {
              const totals = calcSettlement(o);
              const ps = PAYMENT_STATUS_LABELS[o.paymentStatus];
              const ss = SETTLEMENT_STATUS_LABELS[o.settlement];
              return (
                <Link key={o.orderId} to={`/foreign-delivery/orders?order=${o.orderId}`} className="px-4 py-2.5 hover:bg-gray-50/60 flex items-start gap-3">
                  <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center text-base shrink-0">{o.items[0]?.photoEmoji ?? '📦'}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{o.orderId} · {o.customerName}</p>
                    <p className="text-xs text-gray-500 truncate">→ {o.recipientName} · {o.recipientAddress}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-1.5 py-0 rounded text-[9px] font-bold ${ps.cls}`}>{ps.label}</span>
                      <span className={`px-1.5 py-0 rounded text-[9px] font-bold ${ss.cls}`}>{ss.label}</span>
                      <span className="text-[10px] text-gray-400">{o.createdAt}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-gray-900">{fmtMoney(o.paymentAmount, o.paymentCurrency)}</p>
                    {canSeeMargin && (
                      <p className={`text-[11px] ${totals.polandMargin >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        маржа {fmtMoney(totals.polandMargin, o.paymentCurrency)}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Top defaulters */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b">
              <p className="font-bold text-gray-900 text-sm flex items-center gap-2"><Receipt className="w-4 h-4 text-rose-600" />Топ продавцов · долг</p>
            </div>
            <div className="divide-y divide-gray-50">
              {topSellers.length === 0 ? (
                <p className="text-xs text-gray-400 px-4 py-6 text-center">Нет открытых долгов перед продавцами</p>
              ) : topSellers.map(s => (
                <Link key={s.sellerId} to="/foreign-delivery/seller-settlements" className="px-4 py-2 hover:bg-gray-50 flex justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-900 truncate">{s.name}</p>
                    <p className="text-[10px] text-gray-500">{s.ordersCount} заказов</p>
                  </div>
                  <p className="text-xs font-bold text-rose-700 shrink-0">{fmtMoney(s.outstanding)}</p>
                </Link>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b">
              <p className="font-bold text-gray-900 text-sm flex items-center gap-2"><Boxes className="w-4 h-4 text-orange-600" />Топ поставщиков · долг</p>
            </div>
            <div className="divide-y divide-gray-50">
              {topSuppliers.length === 0 ? (
                <p className="text-xs text-gray-400 px-4 py-6 text-center">Нет открытых invoice'ов</p>
              ) : topSuppliers.map(s => (
                <Link key={s.supplierId} to="/foreign-delivery/supplier-payables" className="px-4 py-2 hover:bg-gray-50 flex justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-900 truncate">{s.name}</p>
                    <p className="text-[10px] text-gray-500">{s.country} · {s.ordersCount} заказов</p>
                  </div>
                  <p className="text-xs font-bold text-orange-700 shrink-0">{fmtMoney(s.outstanding, s.currency)}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          <span className="font-semibold">Автоматическое определение:</span> заказ становится <span className="font-mono bg-white px-1 rounded">foreign_paid_local_delivery</span>,
          если страна клиента <span className="font-semibold">не</span> Туркменистан, а адрес доставки — <span className="font-semibold">Туркменистан</span>.
          Правила можно изменить в <Link to="/foreign-delivery/settings" className="underline">Настройках расчётов</Link>.
        </p>
      </div>
    </div>
  );
}
