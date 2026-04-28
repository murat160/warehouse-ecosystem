/**
 * Daily / Weekly registries.
 * Both reuse the same aggregation: filter orders by date range, sum
 * the same things, render KPI strip + per-day table.
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Download, Calendar, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { exportToCsv } from '../../utils/downloads';
import { toast } from 'sonner';
import {
  FOREIGN_ORDERS, calcSettlement, fmtMoney, dateToNum, aggregateOrders,
  PAYMENT_STATUS_LABELS, SETTLEMENT_STATUS_LABELS,
} from '../../data/foreign-delivery';

function dateOf(s: string): string { return s.slice(0, 10); }
function isoDay(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
}

interface RegistryProps {
  permKey: 'foreign_delivery.daily_registry' | 'foreign_delivery.weekly_registry';
  title:   string;
  subtitle:string;
  windowDays: number;     // 1 or 7
}

function Registry({ permKey, title, subtitle, windowDays }: RegistryProps) {
  const { hasPermission } = useAuth();
  if (!hasPermission(`${permKey}.view`)) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <Lock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <h2 className="text-lg font-bold text-gray-900">Доступ ограничен</h2>
        <p className="text-sm text-gray-500 mt-1">Нет права <span className="font-mono">{permKey}.view</span></p>
      </div>
    );
  }
  const canExport = hasPermission(`${permKey}.export`);
  const canSeeMargin = hasPermission('foreign_delivery.margin.view') || hasPermission('foreign_delivery.financials.view');

  // Default: most recent date in mock dataset
  const allDates = [...new Set(FOREIGN_ORDERS.map(o => dateOf(o.createdAt)))].sort((a, b) => dateToNum(b) - dateToNum(a));
  const [endDate, setEndDate] = useState<string>(allDates[0] ?? isoDay(new Date()));

  // Build window
  const { startDate, periodOrders } = useMemo(() => {
    const end = endDate;
    // Compute start from end backwards windowDays - 1
    const [d, m, y] = end.split('.').map(Number);
    const dEnd = new Date(y, m - 1, d);
    const dStart = new Date(y, m - 1, d - (windowDays - 1));
    const start = isoDay(dStart);
    const startN = dateToNum(start), endN = dateToNum(end);
    const filtered = FOREIGN_ORDERS.filter(o => {
      const od = dateToNum(dateOf(o.createdAt));
      return od >= startN && od <= endN;
    });
    return { startDate: start, periodOrders: filtered };
  }, [endDate, windowDays]);

  const stats = useMemo(() => aggregateOrders(periodOrders), [periodOrders]);

  // Per-day breakdown
  const byDay = useMemo(() => {
    const map = new Map<string, typeof periodOrders>();
    for (const o of periodOrders) {
      const k = dateOf(o.createdAt);
      const arr = map.get(k) ?? [];
      arr.push(o);
      map.set(k, arr);
    }
    return Array.from(map.entries())
      .sort((a, b) => dateToNum(b[0]) - dateToNum(a[0]))
      .map(([day, orders]) => ({ day, orders, totals: aggregateOrders(orders) }));
  }, [periodOrders]);

  function exportCsv() {
    if (!canExport) return;
    if (periodOrders.length === 0) { toast.info('За период нет заказов'); return; }
    exportToCsv(periodOrders.map(o => {
      const t = calcSettlement(o);
      return {
        date: o.createdAt, orderId: o.orderId,
        customer: o.customerName, country: o.customerCountry,
        recipient: o.recipientName,
        paymentAmount: o.paymentAmount, paymentCurrency: o.paymentCurrency,
        totalLocal: t.totalLocalFulfillmentCost,
        polandOwesTm: t.amountPolandOwesTurkmen,
        margin: t.polandMargin,
        remainingDebt: t.remainingDebt,
        fulfillment: o.fulfillment, settlement: o.settlement,
      };
    }) as any[], [
      { key: 'date', label: 'Дата' }, { key: 'orderId', label: 'Order ID' },
      { key: 'customer', label: 'Клиент' }, { key: 'country', label: 'Страна' },
      { key: 'recipient', label: 'Получатель' },
      { key: 'paymentAmount', label: 'Оплата' }, { key: 'paymentCurrency', label: 'Валюта' },
      { key: 'totalLocal', label: 'Локально' }, { key: 'polandOwesTm', label: 'Польша→TM' },
      { key: 'margin', label: 'Маржа' }, { key: 'remainingDebt', label: 'Открытый долг' },
      { key: 'fulfillment', label: 'Исполнение' }, { key: 'settlement', label: 'Расчёт' },
    ], windowDays === 1 ? 'daily-registry' : 'weekly-registry');
    toast.success(`Экспорт: ${periodOrders.length} заказов`);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">Зарубежные расчёты</p>
          <div className="flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            <span className="px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-[10px] font-mono">{permKey}</span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input type="text" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="w-24 outline-none" placeholder="дд.мм.гггг" />
          </div>
          <button onClick={exportCsv} disabled={!canExport}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm">
            <Download className="w-4 h-4" />Экспорт
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 flex items-center gap-2">
        Период: <span className="font-bold">{startDate}</span> → <span className="font-bold">{endDate}</span>
        · {periodOrders.length} заказов
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl border bg-blue-50 border-blue-200">
          <p className="text-xs text-blue-700 mb-1">Оплат поступило</p>
          <p className="text-xl font-bold text-blue-700">{fmtMoney(stats.totalPayments, 'PLN')}</p>
        </div>
        <div className="p-3 rounded-xl border bg-orange-50 border-orange-200">
          <p className="text-xs text-orange-700 mb-1">Локальные расходы</p>
          <p className="text-xl font-bold text-orange-700">{fmtMoney(stats.totalLocal)}</p>
        </div>
        <div className="p-3 rounded-xl border bg-red-50 border-red-200">
          <p className="text-xs text-red-700 mb-1">Польша → TM</p>
          <p className="text-xl font-bold text-red-700">{fmtMoney(stats.polandOwesTm)}</p>
        </div>
        {canSeeMargin && (
          <div className="p-3 rounded-xl border bg-amber-50 border-amber-200">
            <p className="text-xs text-amber-700 mb-1">Маржа Польши</p>
            <p className={`text-xl font-bold ${stats.totalMargin >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fmtMoney(stats.totalMargin, 'PLN')}</p>
          </div>
        )}
        <div className="p-3 rounded-xl border bg-rose-50 border-rose-200">
          <p className="text-xs text-rose-700 mb-1">Долг продавцам</p>
          <p className="text-xl font-bold text-rose-700">{fmtMoney(stats.debtSellers)}</p>
        </div>
        <div className="p-3 rounded-xl border bg-rose-50 border-rose-200">
          <p className="text-xs text-rose-700 mb-1">Долг поставщикам</p>
          <p className="text-xl font-bold text-rose-700">{fmtMoney(stats.debtSuppliers)}</p>
        </div>
        <div className="p-3 rounded-xl border bg-green-50 border-green-200">
          <p className="text-xs text-green-700 mb-1">Доставлено</p>
          <p className="text-xl font-bold text-green-700">{stats.delivered}</p>
        </div>
        <div className="p-3 rounded-xl border bg-gray-50 border-gray-200">
          <p className="text-xs text-gray-700 mb-1">Возвраты / отмены</p>
          <p className="text-xl font-bold text-gray-700">{stats.cancelled + stats.returned}</p>
        </div>
      </div>

      {windowDays === 7 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b">
            <p className="font-bold text-gray-900 text-sm">Итоги по дням</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50/70 border-b border-gray-100">
              <tr>
                <th className="text-left px-3 py-2.5 font-medium text-gray-500">День</th>
                <th className="text-right px-3 py-2.5 font-medium text-gray-500">Заказов</th>
                <th className="text-right px-3 py-2.5 font-medium text-gray-500">Оплат</th>
                <th className="text-right px-3 py-2.5 font-medium text-gray-500">Локально</th>
                <th className="text-right px-3 py-2.5 font-medium text-gray-500">Польша→TM</th>
                {canSeeMargin && <th className="text-right px-3 py-2.5 font-medium text-gray-500">Маржа</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {byDay.map(b => (
                <tr key={b.day} className="hover:bg-gray-50/40">
                  <td className="px-3 py-2 font-semibold">{b.day}</td>
                  <td className="px-3 py-2 text-right">{b.orders.length}</td>
                  <td className="px-3 py-2 text-right">{fmtMoney(b.totals.totalPayments, 'PLN')}</td>
                  <td className="px-3 py-2 text-right">{fmtMoney(b.totals.totalLocal)}</td>
                  <td className="px-3 py-2 text-right">{fmtMoney(b.totals.polandOwesTm)}</td>
                  {canSeeMargin && <td className="px-3 py-2 text-right">{fmtMoney(b.totals.totalMargin, 'PLN')}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Orders table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b">
          <p className="font-bold text-gray-900 text-sm">Заказы за период</p>
        </div>
        {periodOrders.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Нет заказов за выбранный период</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50/70 border-b border-gray-100">
              <tr>
                <th className="text-left px-3 py-2.5 font-medium text-gray-500">Order ID</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-500">Клиент / Получатель</th>
                <th className="text-right px-3 py-2.5 font-medium text-gray-500">Оплата</th>
                <th className="text-right px-3 py-2.5 font-medium text-gray-500">Польша→TM</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-500">Документы</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-500">Статус</th>
                <th className="text-center px-3 py-2.5 font-medium text-gray-500">→</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {periodOrders.map(o => {
                const t = calcSettlement(o);
                const ps = PAYMENT_STATUS_LABELS[o.paymentStatus];
                const ss = SETTLEMENT_STATUS_LABELS[o.settlement];
                return (
                  <tr key={o.orderId} className="hover:bg-gray-50/40">
                    <td className="px-3 py-2">
                      <p className="font-semibold">{o.orderId}</p>
                      <p className="text-[10px] text-gray-500">{o.createdAt}</p>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <p>{o.customerName} ({o.customerCountry})</p>
                      <p className="text-gray-500">→ {o.recipientName}</p>
                    </td>
                    <td className="px-3 py-2 text-right font-semibold">{fmtMoney(o.paymentAmount, o.paymentCurrency)}</td>
                    <td className="px-3 py-2 text-right">{fmtMoney(t.amountPolandOwesTurkmen)}</td>
                    <td className="px-3 py-2">
                      {o.documents.length === 0 ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-orange-600"><AlertCircle className="w-2.5 h-2.5" />нет</span>
                      ) : (
                        <span className="text-[10px] text-gray-500">{o.documents.length} док.</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center w-fit px-1.5 py-0 rounded text-[9px] font-bold ${ps.cls}`}>{ps.label}</span>
                      <span className={`ml-1 inline-flex items-center w-fit px-1.5 py-0 rounded text-[9px] font-bold ${ss.cls}`}>{ss.label}</span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Link to={`/foreign-delivery/orders?order=${o.orderId}`} className="p-1.5 inline-block text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md">
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function DailyRegistry() {
  return <Registry permKey="foreign_delivery.daily_registry"
    title="Дневной реестр"
    subtitle="Все зарубежные заказы за выбранный день."
    windowDays={1} />;
}

export function WeeklyRegistry() {
  return <Registry permKey="foreign_delivery.weekly_registry"
    title="Недельный реестр"
    subtitle="Все зарубежные заказы за выбранную неделю с разбивкой по дням."
    windowDays={7} />;
}
