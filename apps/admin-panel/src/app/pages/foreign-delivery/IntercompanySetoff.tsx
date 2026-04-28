/**
 * IntercompanyDebt + Setoff pages.
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Building2, GitBranch, Lock, Download, CheckCircle2, X,
  History, ArrowRight, AlertTriangle, FileText,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Locked } from '../../components/rbac/PermissionLock';
import {
  FOREIGN_ORDERS, SETOFFS, calcSettlement, fmtMoney, dateToNum,
  type SetoffRecord,
} from '../../data/foreign-delivery';

// ─── IntercompanyDebt ────────────────────────────────────────────────────────

export function IntercompanyDebt() {
  const { hasPermission } = useAuth();
  if (!hasPermission('foreign_delivery.intercompany_debt.view')) {
    return <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center"><Lock className="w-12 h-12 mx-auto mb-3 text-gray-300" /><h2 className="text-lg font-bold text-gray-900">Доступ ограничен</h2></div>;
  }

  const data = useMemo(() => FOREIGN_ORDERS.map(o => {
    const t = calcSettlement(o);
    return { o, t };
  }), []);

  const totals = useMemo(() => {
    let polandOwes = 0, supplierDebt = 0, settled = 0, paid = 0, open = 0, disputed = 0, cancelled = 0;
    for (const { o, t } of data) {
      polandOwes  += t.amountPolandOwesTurkmen;
      supplierDebt+= t.supplierPayable;
      settled     += o.setoffAmount;
      paid        += o.paidToTurkmen + o.alreadySettled;
      open        += Math.max(0, t.remainingDebt);
      if (o.settlement === 'disputed') disputed += t.amountPolandOwesTurkmen;
      if (o.settlement === 'cancelled') cancelled += t.amountPolandOwesTurkmen;
    }
    return { polandOwes, supplierDebt, settled, paid, open, disputed, cancelled, balance: polandOwes - settled - paid };
  }, [data]);

  // Group by day / week / month for the breakdown table
  const byDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const { o, t } of data) {
      const day = o.createdAt.slice(0, 10);
      map.set(day, (map.get(day) ?? 0) + t.amountPolandOwesTurkmen);
    }
    return Array.from(map.entries()).sort((a, b) => dateToNum(b[0]) - dateToNum(a[0]));
  }, [data]);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">Зарубежные расчёты</p>
        <div className="flex items-center gap-2">
          <Building2 className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Задолженность между компаниями</h1>
        </div>
        <p className="text-sm text-gray-500 mt-0.5">Польша ↔ Туркменистан · в разрезе заказов / дней / месяцев.</p>
      </div>

      {/* Headline */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-3">
            <p className="text-[10px] text-blue-700 uppercase font-bold">Польша должна Туркменистану</p>
            <p className="text-2xl font-bold text-blue-700">{fmtMoney(totals.polandOwes)}</p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <p className="text-[10px] text-purple-700 uppercase font-bold">Закрыто взаимозачётом</p>
            <p className="text-2xl font-bold text-purple-700">{fmtMoney(totals.settled)}</p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <p className="text-[10px] text-red-700 uppercase font-bold">Открытый долг</p>
            <p className="text-2xl font-bold text-red-700">{fmtMoney(totals.open)}</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-white/60 rounded-lg p-2.5 flex justify-between"><span>Долг поставщикам</span><span className="font-bold">{fmtMoney(totals.supplierDebt)}</span></div>
          <div className="bg-white/60 rounded-lg p-2.5 flex justify-between"><span>Спорные суммы</span><span className="font-bold text-orange-700">{fmtMoney(totals.disputed)}</span></div>
          <div className="bg-white/60 rounded-lg p-2.5 flex justify-between"><span>Отменённые</span><span className="font-bold text-gray-500">{fmtMoney(totals.cancelled)}</span></div>
        </div>
      </div>

      {/* By day */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b">
          <p className="font-bold text-gray-900 text-sm">По дням</p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50/70">
            <tr><th className="text-left px-3 py-2 font-medium text-gray-500 text-xs">День</th><th className="text-right px-3 py-2 font-medium text-gray-500 text-xs">Сумма (Польша→TM)</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {byDay.map(([day, sum]) => (
              <tr key={day} className="hover:bg-gray-50/40">
                <td className="px-3 py-2">{day}</td>
                <td className="px-3 py-2 text-right font-bold">{fmtMoney(sum)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Per-order list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b">
          <p className="font-bold text-gray-900 text-sm">По заказам</p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50/70">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-500 text-xs">Order</th>
              <th className="text-right px-3 py-2 font-medium text-gray-500 text-xs">Долг</th>
              <th className="text-right px-3 py-2 font-medium text-gray-500 text-xs">Закрыто</th>
              <th className="text-right px-3 py-2 font-medium text-gray-500 text-xs">Остаток</th>
              <th className="text-center px-3 py-2 font-medium text-gray-500 text-xs">→</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.map(({ o, t }) => (
              <tr key={o.orderId} className="hover:bg-gray-50/40">
                <td className="px-3 py-2"><Link to={`/foreign-delivery/orders?order=${o.orderId}`} className="text-blue-700 hover:underline">{o.orderId}</Link></td>
                <td className="px-3 py-2 text-right">{fmtMoney(t.amountPolandOwesTurkmen)}</td>
                <td className="px-3 py-2 text-right text-purple-700">{fmtMoney(o.setoffAmount + o.paidToTurkmen)}</td>
                <td className="px-3 py-2 text-right">
                  <span className={`font-bold ${t.remainingDebt > 0 ? 'text-red-700' : 'text-green-700'}`}>{fmtMoney(t.remainingDebt)}</span>
                </td>
                <td className="px-3 py-2 text-center">
                  <Link to={`/foreign-delivery/orders?order=${o.orderId}`} className="p-1 inline-block text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Setoff ──────────────────────────────────────────────────────────────────

export function Setoff() {
  const { hasPermission, user } = useAuth();
  if (!hasPermission('foreign_delivery.setoff.view')) {
    return <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center"><Lock className="w-12 h-12 mx-auto mb-3 text-gray-300" /><h2 className="text-lg font-bold text-gray-900">Доступ ограничен</h2></div>;
  }
  const canConfirm = hasPermission('foreign_delivery.setoff.confirm');

  const [setoffs, setSetoffs] = useState<SetoffRecord[]>(SETOFFS);

  function confirm(id: string) {
    if (!canConfirm) return;
    setSetoffs(prev => prev.map(s => s.setoffId === id ? {
      ...s, status: 'confirmed',
      confirmedBy: user?.name ?? '—',
      confirmedAt: new Date().toLocaleString('ru-RU'),
      audit: [{ at: new Date().toLocaleString('ru-RU'), actor: user?.name ?? '—', role: user?.role ?? 'op', action: 'Подтверждено и закрыто актом' }, ...s.audit],
    } : s));
    toast.success('Взаимозачёт подтверждён');
  }

  function cancel(id: string) {
    if (!canConfirm) return;
    setSetoffs(prev => prev.map(s => s.setoffId === id ? { ...s, status: 'cancelled' } : s));
    toast.warning('Взаимозачёт отменён');
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">Зарубежные расчёты</p>
        <div className="flex items-center gap-2">
          <GitBranch className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Взаимозачёт</h1>
        </div>
        <p className="text-sm text-gray-500 mt-0.5">Поляк должен TM (исполнение) · TM должен Польше (IT/SaaS/бренд) · взаимозачёт + остаток.</p>
      </div>

      <div className="space-y-4">
        {setoffs.map(s => (
          <div key={s.setoffId} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div>
                <p className="font-bold text-gray-900">{s.period}</p>
                <p className="text-xs text-gray-500 font-mono">{s.setoffId}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                s.status === 'confirmed'      ? 'bg-green-100 text-green-700'
                : s.status === 'pending_review' ? 'bg-yellow-100 text-yellow-700'
                : s.status === 'cancelled'     ? 'bg-gray-100 text-gray-600'
                : 'bg-blue-100 text-blue-700'
              }`}>
                {s.status === 'confirmed' ? 'Подтверждён' : s.status === 'pending_review' ? 'На проверке' : s.status === 'cancelled' ? 'Отменён' : 'Черновик'}
              </span>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
              <div className="bg-blue-50 rounded-lg p-2.5">
                <p className="text-[10px] text-blue-700 uppercase">Польша → TM</p>
                <p className="text-lg font-bold text-blue-700">{fmtMoney(s.polandOwesTm)}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-2.5">
                <p className="text-[10px] text-purple-700 uppercase">TM → Польша (IT/SaaS)</p>
                <p className="text-lg font-bold text-purple-700">{fmtMoney(s.tmOwesPoland)}</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-2.5">
                <p className="text-[10px] text-amber-700 uppercase">Сумма взаимозачёта</p>
                <p className="text-lg font-bold text-amber-700">{fmtMoney(s.setoffAmount)}</p>
              </div>
              <div className="bg-rose-50 rounded-lg p-2.5">
                <p className="text-[10px] text-rose-700 uppercase">Остаток</p>
                <p className="text-lg font-bold text-rose-700">{fmtMoney(s.netRemaining)}</p>
              </div>
            </div>
            {s.confirmedBy && (
              <div className="px-4 py-2 bg-green-50 border-t border-green-200 flex items-center gap-2 text-xs text-green-800">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Подтвердил: {s.confirmedBy} · {s.confirmedAt}
                {s.actDoc && <button className="ml-auto text-green-700 hover:underline flex items-center gap-1"><FileText className="w-3 h-3" />Скачать акт</button>}
              </div>
            )}
            <div className="px-4 py-3 bg-gray-50 border-t flex flex-wrap gap-2">
              {s.status === 'pending_review' && canConfirm && (
                <>
                  <button onClick={() => confirm(s.setoffId)} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold">
                    <CheckCircle2 className="w-3 h-3" />Подтвердить
                  </button>
                  <button onClick={() => cancel(s.setoffId)} className="flex items-center gap-1 px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg text-xs font-semibold">
                    <X className="w-3 h-3" />Отменить
                  </button>
                </>
              )}
              <Locked perm="foreign_delivery.documents.download">
                <button className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 bg-white hover:bg-gray-50 rounded-lg text-xs">
                  <Download className="w-3 h-3" />Скачать акт
                </button>
              </Locked>
            </div>
            <div className="px-4 py-3 border-t">
              <p className="text-[10px] uppercase font-bold text-gray-500 mb-1 flex items-center gap-1"><History className="w-3 h-3" />Audit history</p>
              <div className="space-y-1">
                {s.audit.map((a, i) => (
                  <p key={i} className="text-xs text-gray-700"><span className="font-semibold">{a.actor}</span> ({a.role}) · {a.at} · {a.action}</p>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
