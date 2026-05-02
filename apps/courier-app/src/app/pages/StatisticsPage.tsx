import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Activity, ArrowLeft, MapPin, XCircle } from 'lucide-react';
import { useT } from '../i18n';
import { useCourierStore } from '../store/CourierStore';

function dateKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDay(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
}

export function StatisticsPage() {
  const t = useT();
  const navigate = useNavigate();
  const { state } = useCourierStore();

  const daily = useMemo(() => {
    const map = new Map<string, { ts: number; deliveries: number; income: number; etaSum: number }>();
    for (const o of state.history) {
      const k = dateKey(o.deliveredAt ?? Date.now());
      const cur = map.get(k) ?? { ts: o.deliveredAt ?? Date.now(), deliveries: 0, income: 0, etaSum: 0 };
      cur.deliveries += 1;
      cur.income += o.earnings ?? 0;
      cur.etaSum += o.etaMinutes;
      map.set(k, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.ts - a.ts).slice(0, 7);
  }, [state.history]);

  const zones = useMemo(() => {
    const map = new Map<string, { deliveries: number; incomeSum: number; etaSum: number }>();
    for (const o of state.history) {
      const k = o.customer.area ?? '—';
      const cur = map.get(k) ?? { deliveries: 0, incomeSum: 0, etaSum: 0 };
      cur.deliveries += 1;
      cur.incomeSum += o.earnings ?? 0;
      cur.etaSum += o.etaMinutes;
      map.set(k, cur);
    }
    return Array.from(map.entries()).map(([zone, v]) => ({
      zone, deliveries: v.deliveries,
      avgIncome: v.deliveries ? v.incomeSum / v.deliveries : 0,
      avgTime: v.deliveries ? v.etaSum / v.deliveries : 0,
    })).sort((a, b) => b.deliveries - a.deliveries).slice(0, 6);
  }, [state.history]);

  const acceptance = state.history.length > 0 ? 100 : 0;

  return (
    <div className="min-h-full bg-gray-50">
      <header className="bg-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10 border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full active:bg-gray-100 flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-[18px] font-extrabold">{t('statistics.title')}</h1>
          <p className="text-xs text-gray-500">{t('statistics.subtitle')}</p>
        </div>
      </header>

      <div className="px-4 pt-3 space-y-3 pb-8">
        <section className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
          <Activity className="w-5 h-5 text-emerald-500" />
          <div className="flex-1">
            <div className="text-xs font-bold uppercase tracking-wide text-gray-500">{t('statistics.acceptance')}</div>
            <div className="text-[20px] font-extrabold text-gray-900">{acceptance.toFixed(0)} %</div>
          </div>
        </section>

        <section>
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 px-1 mb-2">{t('statistics.daily')}</div>
          {daily.length === 0 ? (
            <div className="bg-white rounded-2xl p-4 text-sm text-gray-500 border border-gray-100 text-center">{t('analytics.no_data')}</div>
          ) : (
            <ul className="space-y-2">
              {daily.map(d => (
                <li key={d.ts} className="bg-white rounded-2xl border border-gray-100 p-3 flex items-center justify-between">
                  <div>
                    <div className="text-[14px] font-extrabold text-gray-900">{formatDay(d.ts)}</div>
                    <div className="text-[11px] text-gray-500">
                      {d.deliveries} {t('statistics.deliveries')} · {(d.etaSum / 60).toFixed(1)} {t('statistics.hours')}
                    </div>
                  </div>
                  <div className="text-emerald-600 font-extrabold">{d.income.toFixed(2)} {t('units.currency')}</div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 px-1 mb-2">{t('statistics.zones')}</div>
          {zones.length === 0 ? (
            <div className="bg-white rounded-2xl p-4 text-sm text-gray-500 border border-gray-100 text-center">{t('analytics.no_data')}</div>
          ) : (
            <ul className="space-y-2">
              {zones.map(z => (
                <li key={z.zone} className="bg-white rounded-2xl border border-gray-100 p-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-rose-500" />
                    <span className="font-extrabold text-[14px] flex-1">{z.zone}</span>
                    <span className="text-[12px] text-gray-500">{z.deliveries}</span>
                  </div>
                  <div className="mt-1 flex justify-between text-[11px] text-gray-500">
                    <span>{t('statistics.income')}: <b className="text-gray-900">{z.avgIncome.toFixed(1)} {t('units.currency')}</b></span>
                    <span>{t('analytics.kpi.avg_time')}: <b className="text-gray-900">{z.avgTime.toFixed(0)} {t('units.min')}</b></span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 px-1 mb-2">{t('statistics.reject_history')}</div>
          <div className="bg-white rounded-2xl p-4 text-sm text-gray-500 border border-gray-100 text-center flex items-center justify-center gap-2">
            <XCircle className="w-4 h-4 text-emerald-500" />
            {t('statistics.no_rejects')}
          </div>
        </section>
      </div>
    </div>
  );
}
