import { Lock, TrendingUp, TrendingDown, AlertTriangle, Activity, Users, Package, Clock, BarChart3 } from 'lucide-react';
import { useAppState } from '../hooks/useAppState';
import { PageHeader } from '../components/PageHeader';
import { hasPermission } from '../services/permissions';
import { ZONES, ROLE_LABELS, type WorkerRole } from '../data/mockData';

/**
 * BI/Analytics Dashboard — складская аналитика.
 * Только KPI, ошибки, загруженность зон, сотрудники, заказы, task performance.
 * Никакой VIP-панели или маркетплейса.
 */
export function AnalyticsDashboardPage() {
  const state = useAppState();
  const me = state.currentWorker;

  if (!me || !hasPermission(me.role, 'view_kpi')) {
    return (
      <div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center px-5">
        <div className="text-center">
          <Lock className="w-12 h-12 text-[#9CA3AF] mx-auto mb-3" />
          <p className="text-[16px] text-[#1F2430]" style={{ fontWeight: 700 }}>Доступ ограничен</p>
          <p className="text-[13px] text-[#6B7280] mt-1" style={{ fontWeight: 500 }}>
            BI/Analytics доступен только supervisor и менеджерам
          </p>
        </div>
      </div>
    );
  }

  // Реальные метрики из state
  const allTasks = state.tasks;
  const completedTasks = allTasks.filter(t => t.status === 'completed').length;
  const blockedTasks = allTasks.filter(t => t.status === 'blocked' || t.status === 'escalated').length;
  const errorTasks = allTasks.filter(t => t.errors && t.errors.length > 0);
  const totalErrors = errorTasks.reduce((s, t) => s + (t.errors?.length || 0), 0);

  const onShift = state.workers.filter(w => w.shiftStatus === 'on_shift').length;
  const onBreak = state.workers.filter(w => w.shiftStatus === 'on_break').length;

  const newOrders = state.orders.filter(o => o.status === 'new' || o.status === 'released').length;
  const inProgressOrders = state.orders.filter(o => ['picking','packing','sorting'].includes(o.status)).length;
  const dispatchedOrders = state.orders.filter(o => ['handed_to_courier','in_transit','delivered'].includes(o.status)).length;
  const problemOrders = state.orders.filter(o => o.status === 'problem' || o.status === 'failed').length;

  // По ролям: продуктивность сотрудников
  const productivityByRole: Record<string, { count: number; avg: number }> = {};
  state.workers.forEach(w => {
    if (!productivityByRole[w.role]) productivityByRole[w.role] = { count: 0, avg: 0 };
    productivityByRole[w.role].count++;
    productivityByRole[w.role].avg += w.productivity;
  });
  Object.keys(productivityByRole).forEach(k => {
    productivityByRole[k].avg = Math.round(productivityByRole[k].avg / productivityByRole[k].count);
  });

  // Топ-3 ошибки по типам
  const errorsByCode: Record<string, number> = {};
  errorTasks.forEach(t => {
    t.errors?.forEach(e => {
      errorsByCode[e.code] = (errorsByCode[e.code] || 0) + 1;
    });
  });
  const topErrors = Object.entries(errorsByCode).sort((a, b) => b[1] - a[1]).slice(0, 3);

  // Топ-3 продуктивных сотрудника
  const topPerformers = [...state.workers]
    .filter(w => w.productivity > 0)
    .sort((a, b) => b.productivity - a.productivity)
    .slice(0, 3);

  // Зоны с самой высокой загрузкой
  const overloadedZones = ZONES.filter(z => z.utilization > 70).sort((a, b) => b.utilization - a.utilization);

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24">
      <PageHeader title="BI Dashboard" subtitle="Складская аналитика" />

      <div className="px-5 -mt-3 space-y-3">
        {/* KPI основные */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-[14px] text-[#1F2430] mb-3 flex items-center gap-2" style={{ fontWeight: 800 }}>
            <BarChart3 className="w-4 h-4" />
            KPI смены
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <BigStat label="Заказов / час"        value={state.kpi.ordersPerHour} suffix="" trend="up" />
            <BigStat label="Точность сборки"      value={state.kpi.pickingAccuracy} suffix="%" trend={state.kpi.pickingAccuracy >= 99 ? 'up' : 'down'} />
            <BigStat label="Точность упаковки"    value={state.kpi.packingAccuracy} suffix="%" trend={state.kpi.packingAccuracy >= 99 ? 'up' : 'down'} />
            <BigStat label="Точность инвентаря"   value={state.kpi.inventoryAccuracy} suffix="%" trend={state.kpi.inventoryAccuracy >= 98 ? 'up' : 'down'} />
            <BigStat label="В срок отправлено"    value={state.kpi.onTimeDispatch} suffix="%" trend={state.kpi.onTimeDispatch >= 95 ? 'up' : 'down'} />
            <BigStat label="Загрузка склада"      value={state.kpi.warehouseUtilization} suffix="%" trend="neutral" />
          </div>
        </div>

        {/* Сотрудники */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-[14px] text-[#1F2430] mb-3 flex items-center gap-2" style={{ fontWeight: 800 }}>
            <Users className="w-4 h-4" />
            Сотрудники
          </h3>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <Stat label="На смене"   value={onShift.toString()} color="#00D27A" />
            <Stat label="Перерыв"    value={onBreak.toString()} color="#F59E0B" />
            <Stat label="Не работают" value={(state.workers.length - onShift - onBreak).toString()} color="#9CA3AF" />
          </div>
          <h4 className="text-[12px] text-[#6B7280] mb-2" style={{ fontWeight: 700 }}>Продуктивность по ролям</h4>
          <div className="space-y-1">
            {Object.entries(productivityByRole).map(([role, data]) => (
              <div key={role} className="flex items-center gap-2">
                <span className="text-[11px] text-[#1F2430] w-24 truncate" style={{ fontWeight: 600 }}>
                  {ROLE_LABELS[role as WorkerRole]}
                </span>
                <div className="flex-1 h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
                  <div className="h-full" style={{ width: `${data.avg}%`, backgroundColor: data.avg >= 90 ? '#00D27A' : '#F59E0B' }} />
                </div>
                <span className="text-[11px] text-[#1F2430] w-10 text-right" style={{ fontWeight: 700 }}>
                  {data.avg}%
                </span>
                <span className="text-[10px] text-[#9CA3AF] w-6" style={{ fontWeight: 500 }}>
                  ×{data.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Топ-3 продуктивных */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-[14px] text-[#1F2430] mb-3 flex items-center gap-2" style={{ fontWeight: 800 }}>
            🏆 Топ продуктивных
          </h3>
          <div className="space-y-2">
            {topPerformers.map((w, i) => (
              <div key={w.id} className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px]"
                  style={{ backgroundColor: i === 0 ? '#FBBF24' : i === 1 ? '#9CA3AF' : '#CD7F32', fontWeight: 800 }}
                >
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="text-[13px] text-[#1F2430]" style={{ fontWeight: 700 }}>{w.name}</div>
                  <div className="text-[11px] text-[#6B7280]" style={{ fontWeight: 500 }}>
                    {ROLE_LABELS[w.role]}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[14px] text-[#00D27A]" style={{ fontWeight: 900 }}>{w.productivity}%</div>
                  <div className="text-[10px] text-[#6B7280]" style={{ fontWeight: 600 }}>{w.tasksCompletedToday} задач</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Задачи */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-[14px] text-[#1F2430] mb-3 flex items-center gap-2" style={{ fontWeight: 800 }}>
            <Activity className="w-4 h-4" />
            Производительность задач
          </h3>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <Stat label="Активных"     value={(allTasks.length - completedTasks).toString()} color="#2EA7E0" />
            <Stat label="Завершено"    value={completedTasks.toString()} color="#00D27A" />
            <Stat label="Заблокировано" value={blockedTasks.toString()} color="#EF4444" />
            <Stat label="С ошибками"   value={errorTasks.length.toString()} color="#F59E0B" />
          </div>
          {totalErrors > 0 && (
            <div className="bg-[#FEE2E2] rounded-xl p-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#EF4444] flex-shrink-0" />
              <div className="text-[11px] text-[#991B1B]" style={{ fontWeight: 700 }}>
                Всего ошибок: {totalErrors}
              </div>
            </div>
          )}
        </div>

        {/* Топ ошибок */}
        {topErrors.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-[14px] text-[#1F2430] mb-3 flex items-center gap-2" style={{ fontWeight: 800 }}>
              ⚠️ Топ ошибок
            </h3>
            <div className="space-y-2">
              {topErrors.map(([code, count]) => (
                <div key={code} className="flex items-center gap-2">
                  <span className="text-[12px] text-[#1F2430] flex-1" style={{ fontWeight: 600 }}>{code}</span>
                  <div className="flex-1 h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
                    <div className="h-full bg-[#EF4444]" style={{ width: `${Math.min(100, count * 20)}%` }} />
                  </div>
                  <span className="text-[12px] text-[#EF4444] w-8 text-right" style={{ fontWeight: 800 }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Заказы */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-[14px] text-[#1F2430] mb-3 flex items-center gap-2" style={{ fontWeight: 800 }}>
            <Package className="w-4 h-4" />
            Заказы
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Новых"        value={newOrders.toString()} color="#2EA7E0" />
            <Stat label="В обработке"  value={inProgressOrders.toString()} color="#F59E0B" />
            <Stat label="Отправлено"   value={dispatchedOrders.toString()} color="#00D27A" />
            <Stat label="Проблем"      value={problemOrders.toString()} color="#EF4444" />
          </div>
        </div>

        {/* Загрузка зон */}
        {overloadedZones.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-[14px] text-[#1F2430] mb-3 flex items-center gap-2" style={{ fontWeight: 800 }}>
              📍 Перегруженные зоны
            </h3>
            <div className="space-y-2">
              {overloadedZones.slice(0, 5).map(z => (
                <div key={z.code} className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px]"
                    style={{ backgroundColor: z.color, fontWeight: 800 }}
                  >
                    {z.code}
                  </div>
                  <span className="text-[12px] text-[#1F2430] flex-1" style={{ fontWeight: 600 }}>{z.name}</span>
                  <div className="flex-1 h-2 bg-[#F3F4F6] rounded-full overflow-hidden max-w-[80px]">
                    <div
                      className="h-full"
                      style={{ width: `${z.utilization}%`, backgroundColor: z.utilization > 85 ? '#EF4444' : '#F59E0B' }}
                    />
                  </div>
                  <span
                    className="text-[12px] w-9 text-right"
                    style={{ fontWeight: 800, color: z.utilization > 85 ? '#EF4444' : '#F59E0B' }}
                  >
                    {z.utilization}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-[#F9FAFB] rounded-xl p-2">
      <div className="text-[20px]" style={{ fontWeight: 900, color }}>{value}</div>
      <div className="text-[10px] text-[#6B7280] mt-0.5" style={{ fontWeight: 600 }}>{label}</div>
    </div>
  );
}

function BigStat({ label, value, suffix, trend }: { label: string; value: number; suffix: string; trend: 'up' | 'down' | 'neutral' }) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Activity;
  const color = trend === 'up' ? '#00D27A' : trend === 'down' ? '#EF4444' : '#6B7280';
  return (
    <div className="bg-[#F9FAFB] rounded-xl p-3">
      <div className="flex items-center justify-between mb-1">
        <div className="text-[20px] text-[#1F2430]" style={{ fontWeight: 900 }}>
          {value}{suffix}
        </div>
        <TrendIcon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="text-[11px] text-[#6B7280]" style={{ fontWeight: 600 }}>{label}</div>
    </div>
  );
}
