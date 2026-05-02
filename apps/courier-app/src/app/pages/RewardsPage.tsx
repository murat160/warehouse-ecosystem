import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Gift, Shield, Target, Trophy, Zap } from 'lucide-react';
import { useT } from '../i18n';
import type { TKey } from '../i18n';
import { useCourierStore } from '../store/CourierStore';

interface Mission {
  id: string;
  titleKey: TKey;
  rewardPoints: number;
  progress: number;
  total: number;
}

function levelFromDeliveries(total: number): { name: TKey; current: number; nextAt: number; nextName: TKey } {
  if (total < 50)   return { name: 'rewards.level.bronze',   current: total, nextAt: 50,   nextName: 'rewards.level.silver' };
  if (total < 150)  return { name: 'rewards.level.silver',   current: total, nextAt: 150,  nextName: 'rewards.level.gold' };
  if (total < 300)  return { name: 'rewards.level.gold',     current: total, nextAt: 300,  nextName: 'rewards.level.platinum' };
  return { name: 'rewards.level.platinum', current: total, nextAt: total, nextName: 'rewards.level.platinum' };
}

export function RewardsPage() {
  const t = useT();
  const navigate = useNavigate();
  const { state } = useCourierStore();

  const totalDeliveries = (state.courier?.totalDeliveries ?? 0) + state.history.length;

  const lvl = useMemo(() => levelFromDeliveries(totalDeliveries), [totalDeliveries]);
  const remaining = Math.max(0, lvl.nextAt - lvl.current);
  const pct = Math.min(100, (lvl.current / Math.max(1, lvl.nextAt)) * 100);
  const points = totalDeliveries * 25;

  const bonuses: { key: string; titleKey: TKey; descKey: TKey; icon: React.ReactNode }[] = [
    { key: 'peak',  titleKey: 'rewards.bonus.peak_hours',  descKey: 'rewards.bonus.peak_hours_desc',  icon: <Zap className="w-5 h-5 text-amber-500" /> },
    { key: 'level', titleKey: 'rewards.bonus.level_bonus', descKey: 'rewards.bonus.level_bonus_desc', icon: <Trophy className="w-5 h-5 text-rose-500" /> },
    { key: 'ins',   titleKey: 'rewards.bonus.insurance',   descKey: 'rewards.bonus.insurance_desc',   icon: <Shield className="w-5 h-5 text-sky-500" /> },
  ];

  const missions: Mission[] = [
    { id: 'orders', titleKey: 'rewards.mission.orders',       rewardPoints: 100, progress: Math.min(20, totalDeliveries), total: 20 },
    { id: 'streak', titleKey: 'rewards.mission.streak',       rewardPoints: 150, progress: 3,  total: 5 },
    { id: 'rating', titleKey: 'rewards.mission.rating',       rewardPoints: 200, progress: Math.round((state.courier?.rating ?? 0) * 10), total: 50 },
    { id: 'zero',   titleKey: 'rewards.mission.zero_cancels', rewardPoints: 75,  progress: 7,  total: 7 },
  ];

  return (
    <div className="min-h-full bg-gray-50">
      <header className="bg-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10 border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full active:bg-gray-100 flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-[18px] font-extrabold">{t('rewards.title')}</h1>
          <p className="text-xs text-gray-500">{t('rewards.subtitle')}</p>
        </div>
      </header>

      <div className="px-4 pt-3 space-y-3 pb-8">
        <section className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl p-4 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide opacity-90">{t('rewards.level')}</div>
              <div className="text-[28px] font-extrabold leading-none mt-1">{t(lvl.name)}</div>
            </div>
            <Trophy className="w-9 h-9 opacity-90" />
          </div>
          <div className="mt-3 h-2 rounded-full bg-white/25 overflow-hidden">
            <div className="h-full bg-white" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-1 flex items-center justify-between text-xs opacity-95">
            <span>{points} {t('rewards.points')}</span>
            <span>{t('rewards.next_level')}: {t(lvl.nextName)} · {remaining} {t('rewards.points_to_next')}</span>
          </div>
        </section>

        <section>
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 px-1 mb-2">{t('rewards.active_bonuses')}</div>
          <ul className="space-y-2">
            {bonuses.map(b => (
              <li key={b.key} className="bg-white rounded-2xl border border-gray-100 p-3 flex items-center gap-3">
                {b.icon}
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-extrabold text-gray-900">{t(b.titleKey)}</div>
                  <div className="text-xs text-gray-500">{t(b.descKey)}</div>
                </div>
                <Gift className="w-4 h-4 text-gray-300" />
              </li>
            ))}
          </ul>
        </section>

        <section>
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 px-1 mb-2">{t('rewards.missions')}</div>
          <ul className="space-y-2">
            {missions.map(m => {
              const pct2 = Math.min(100, (m.progress / m.total) * 100);
              return (
                <li key={m.id} className="bg-white rounded-2xl border border-gray-100 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="w-4 h-4 text-emerald-500" />
                    <span className="text-[14px] font-extrabold text-gray-900 flex-1 truncate">{t(m.titleKey)}</span>
                    <span className="text-[12px] font-bold text-emerald-600">+{m.rewardPoints}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${pct2}%` }} />
                  </div>
                  <div className="text-[11px] text-gray-500 mt-1">{m.progress} / {m.total}</div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
