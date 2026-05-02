import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft, BarChart2, Clock, MapPin, Package, Star, TrendingUp, Wallet,
} from 'lucide-react';
import { useT } from '../i18n';
import type { TKey } from '../i18n';
import { useCourierStore } from '../store/CourierStore';

const DAY_KEYS: TKey[] = [
  'analytics.day.mon', 'analytics.day.tue', 'analytics.day.wed',
  'analytics.day.thu', 'analytics.day.fri', 'analytics.day.sat', 'analytics.day.sun',
];

function startOfWeek(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d.getTime();
}

export function AnalyticsPage() {
  const t = useT();
  const navigate = useNavigate();
  const { state } = useCourierStore();

  const stats = useMemo(() => {
    const history = state.history;
    const total = history.length;
    const totalIncome = history.reduce((s, o) => s + (o.earnings ?? 0), 0);
    const avgIncome = total > 0 ? totalIncome / total : 0;
    const avgDistance = total > 0 ? history.reduce((s, o) => s + o.distanceKm, 0) / total : 0;
    const avgTime = total > 0 ? history.reduce((s, o) => s + o.etaMinutes, 0) / total : 0;
    const rating = state.courier?.rating ?? 0;
    const cancelRate = 0;
    const lateRate = 0;
    const weeklyGoal = 50;
    const weekStart = startOfWeek();
    const weekHistory = history.filter(o => (o.deliveredAt ?? 0) >= weekStart);
    const completedThisWeek = weekHistory.length;

    const byDay = new Array(7).fill(0) as number[];
    for (const o of weekHistory) {
      const d = new Date(o.deliveredAt ?? 0);
      const idx = (d.getDay() + 6) % 7;
      byDay[idx] += 1;
    }
    const maxDay = Math.max(1, ...byDay);
    return {
      total, avgIncome, avgDistance, avgTime, rating, cancelRate, lateRate,
      weeklyGoal, completedThisWeek, byDay, maxDay,
    };
  }, [state.history, state.courier]);

  const goalPct = Math.min(100, (stats.completedThisWeek / stats.weeklyGoal) * 100);

  return (
    <div className="min-h-full bg-gray-50">
      <header className="bg-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10 border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full active:bg-gray-100 flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-[18px] font-extrabold">{t('analytics.title')}</h1>
          <p className="text-xs text-gray-500">{t('analytics.subtitle')}</p>
        </div>
      </header>

      <div className="px-4 pt-3 space-y-3 pb-8">
        <section className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-4 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide opacity-80">{t('analytics.weekly_goal')}</div>
              <div className="text-[28px] font-extrabold leading-none mt-1">
                {stats.completedThisWeek}<span className="text-base font-bold opacity-80">/{stats.weeklyGoal}</span>
              </div>
            </div>
            <TrendingUp className="w-8 h-8 opacity-70" />
          </div>
          <div className="mt-3 h-2 rounded-full bg-white/25 overflow-hidden">
            <div className="h-full bg-white" style={{ width: `${goalPct}%` }} />
          </div>
          <div className="mt-1 text-xs opacity-90">{t('analytics.completed_this_week')}: {stats.completedThisWeek}</div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <Kpi icon={<Package className="w-4 h-4" />} label={t('analytics.kpi.deliveries')} value={String(stats.total)} />
          <Kpi icon={<Wallet className="w-4 h-4" />} label={t('analytics.kpi.avg_income')} value={`${stats.avgIncome.toFixed(1)} ${t('units.currency')}`} />
          <Kpi icon={<MapPin className="w-4 h-4" />} label={t('analytics.kpi.avg_distance')} value={`${stats.avgDistance.toFixed(1)} ${t('units.km')}`} />
          <Kpi icon={<Clock className="w-4 h-4" />} label={t('analytics.kpi.avg_time')} value={`${stats.avgTime.toFixed(0)} ${t('units.min')}`} />
          <Kpi icon={<Star className="w-4 h-4 text-yellow-500 fill-yellow-300" />} label={t('analytics.kpi.rating')} value={stats.rating.toFixed(2)} />
          <Kpi icon={<BarChart2 className="w-4 h-4" />} label={t('analytics.kpi.cancel_rate')} value={`${stats.cancelRate.toFixed(1)} %`} />
        </section>

        <section className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">{t('analytics.week_chart')}</div>
          {stats.byDay.every(v => v === 0) ? (
            <div className="text-sm text-gray-500 py-4 text-center">{t('analytics.no_data')}</div>
          ) : (
            <div className="flex items-end justify-between gap-2 h-28">
              {stats.byDay.map((v, idx) => {
                const h = (v / stats.maxDay) * 100;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-emerald-100 rounded-t-md flex items-end" style={{ height: '100%' }}>
                      <div className="w-full bg-emerald-500 rounded-t-md transition-all" style={{ height: `${h}%` }} />
                    </div>
                    <div className="text-[10px] font-bold text-gray-500">{t(DAY_KEYS[idx])}</div>
                    <div className="text-[10px] font-extrabold text-gray-900">{v}</div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-3">
      <div className="text-gray-400 mb-1">{icon}</div>
      <div className="text-[18px] font-extrabold text-gray-900 leading-none">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-gray-500 mt-1">{label}</div>
    </div>
  );
}
