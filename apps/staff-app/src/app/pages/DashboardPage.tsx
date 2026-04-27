import { useNavigate } from 'react-router-dom';
import { Bell, Pause, Play, AlertTriangle, ChevronRight, Map, Package, ShoppingCart, RotateCcw, BarChart3, Truck, ScanLine, PackageCheck, Boxes } from 'lucide-react';
import { toast } from 'sonner';
import { useAppState, store } from '../hooks/useAppState';
import { ROLE_LABELS, ROLE_TASK_TYPES, TASK_TYPE_EMOJI, TASK_TYPE_LABELS, isManagerRole, type TaskType } from '../data/mockData';
import { PriorityBadge } from '../components/Badges';
import { hasPermission, isSupervisorOrAbove } from '../services/permissions';
import { Users, ClipboardList, Box } from 'lucide-react';

const TASK_TYPE_ROUTES: Record<TaskType, string> = {
  RECEIVE: '/inbound',
  QC_CHECK: '/qc',
  PUTAWAY: '/putaway',
  PICK: '/picking',
  PACK: '/packing',
  SORT: '/shipping',
  LOAD: '/shipping',
  RETURN_CHECK: '/returns',
  REPACK: '/returns',
  CYCLE_COUNT: '/count',
  REPLENISHMENT: '/replenishment',
  MOVE_BIN: '/tasks',
  DAMAGE_CHECK: '/qc',
  SECURITY_CHECK: '/tasks',
  DEVICE_ISSUE: '/tasks',
};

const TYPE_ICONS: Record<TaskType, any> = {
  RECEIVE: Package, QC_CHECK: PackageCheck, PUTAWAY: Boxes, PICK: ShoppingCart,
  PACK: Package, SORT: Truck, LOAD: Truck, RETURN_CHECK: RotateCcw, REPACK: Package,
  CYCLE_COUNT: BarChart3, REPLENISHMENT: Boxes, MOVE_BIN: Boxes,
  DAMAGE_CHECK: AlertTriangle, SECURITY_CHECK: AlertTriangle, DEVICE_ISSUE: AlertTriangle,
};

export function DashboardPage() {
  const state = useAppState();
  const nav = useNavigate();
  const worker = state.currentWorker;
  if (!worker) return null;

  const myTasks = store.getMyTasks();
  const unreadAlerts = state.alerts.filter(a => !a.read).length;
  const allowedTypes = ROLE_TASK_TYPES[worker.role];
  const isManager = isManagerRole(worker.role);

  const toggleShift = () => {
    if (worker.shiftStatus === 'on_shift') {
      store.setShiftStatus('on_break');
      toast('Перерыв начат');
    } else {
      store.setShiftStatus('on_shift');
      toast.success('Смена начата');
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24">
      {/* Шапка */}
      <div className="bg-[#1F2430] px-5 pt-12 pb-6 rounded-b-3xl">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-white/60 text-[12px]" style={{ fontWeight: 500 }}>
              Здравствуйте,
            </p>
            <h1 className="text-white text-[22px]" style={{ fontWeight: 900 }}>
              {worker.name.split(' ')[0]}
            </h1>
            <p className="text-white/50 text-[12px] mt-0.5" style={{ fontWeight: 500 }}>
              {ROLE_LABELS[worker.role]} · {worker.warehouseCode}
            </p>
          </div>
          <button
            onClick={() => nav('/alerts')}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center relative"
          >
            <Bell className="w-5 h-5 text-white" />
            {unreadAlerts > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#EF4444] text-white text-[10px] flex items-center justify-center" style={{ fontWeight: 800 }}>
                {unreadAlerts}
              </span>
            )}
          </button>
        </div>

        {/* Кнопка смены */}
        <button
          onClick={toggleShift}
          className="w-full bg-white/10 rounded-2xl p-3 flex items-center justify-between active-press"
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: worker.shiftStatus === 'on_shift' ? '#00D27A' : '#F59E0B',
              }}
            >
              {worker.shiftStatus === 'on_shift'
                ? <Pause className="w-5 h-5 text-white" />
                : <Play className="w-5 h-5 text-white" />}
            </div>
            <div className="text-left">
              <div className="text-white text-[14px]" style={{ fontWeight: 700 }}>
                {worker.shiftStatus === 'on_shift' ? 'Смена в работе' : worker.shiftStatus === 'on_break' ? 'Перерыв' : 'Не на смене'}
              </div>
              <div className="text-white/60 text-[11px]" style={{ fontWeight: 500 }}>
                План: {worker.shiftPlanned.start} – {worker.shiftPlanned.end}
              </div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-white/60" />
        </button>
      </div>

      {/* KPI блок (только для управленцев) */}
      {isManager && (
        <div className="px-5 -mt-3 mb-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-[15px] text-[#1F2430] mb-3" style={{ fontWeight: 800 }}>
              📊 KPI смены
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <KpiCell label="Заказов/час" value={state.kpi.ordersPerHour.toString()} good />
              <KpiCell label="Точность сборки" value={state.kpi.pickingAccuracy.toFixed(1) + '%'} good />
              <KpiCell label="В срок" value={state.kpi.onTimeDispatch.toFixed(1) + '%'} good />
              <KpiCell label="Задержки" value={state.kpi.delayedOrders.toString()} bad />
              <KpiCell label="Загрузка склада" value={state.kpi.warehouseUtilization + '%'} />
              <KpiCell label="На смене" value={`${state.kpi.staffOnline}/${state.kpi.totalStaff}`} />
            </div>
          </div>
        </div>
      )}

      {/* Мои задачи (по приоритету) */}
      <div className="px-5 mt-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[16px] text-[#1F2430]" style={{ fontWeight: 800 }}>
            Мои задачи ({myTasks.length})
          </h2>
          <button onClick={() => nav('/tasks')} className="text-[12px] text-[#2EA7E0]" style={{ fontWeight: 700 }}>
            Все →
          </button>
        </div>

        {myTasks.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center">
            <div className="text-[40px] mb-2">✅</div>
            <p className="text-[14px] text-[#6B7280]" style={{ fontWeight: 600 }}>
              Все задачи выполнены
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {myTasks.slice(0, 4).map((task) => {
              const Icon = TYPE_ICONS[task.type];
              return (
                <button
                  key={task.id}
                  onClick={() => nav(`${TASK_TYPE_ROUTES[task.type]}/${task.id}`)}
                  className="w-full bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm active-press"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#E0F2FE] flex items-center justify-center">
                    <Icon className="w-6 h-6 text-[#2EA7E0]" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[14px] text-[#1F2430]" style={{ fontWeight: 700 }}>
                        {TASK_TYPE_EMOJI[task.type]} {TASK_TYPE_LABELS[task.type]}
                      </span>
                      <PriorityBadge priority={task.priority} size="sm" />
                    </div>
                    <div className="text-[12px] text-[#6B7280]" style={{ fontWeight: 500 }}>
                      {task.id}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#9CA3AF]" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Быстрый доступ к разделам */}
      <div className="px-5 mt-5">
        <h2 className="text-[16px] text-[#1F2430] mb-3" style={{ fontWeight: 800 }}>
          Быстрый доступ
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {allowedTypes.includes('RECEIVE') && (
            <QuickCard icon={Package} label="Приёмка" subtitle={`${state.asns.filter(a => a.status !== 'received').length} активных`} onClick={() => nav('/inbound')} color="#2EA7E0" />
          )}
          {allowedTypes.includes('QC_CHECK') && (
            <QuickCard icon={PackageCheck} label="Контроль" subtitle="QC очередь" onClick={() => nav('/qc')} color="#A855F7" />
          )}
          {allowedTypes.includes('PUTAWAY') && (
            <QuickCard icon={Boxes} label="Размещение" subtitle="Putaway" onClick={() => nav('/putaway')} color="#06B6D4" />
          )}
          {allowedTypes.includes('PICK') && (
            <QuickCard icon={ShoppingCart} label="Сборка" subtitle={`${state.orders.filter(o => o.status === 'released' || o.status === 'picking').length} заказов`} onClick={() => nav('/picking')} color="#F59E0B" />
          )}
          {allowedTypes.includes('PACK') && (
            <QuickCard icon={Package} label="Упаковка" subtitle={`${state.orders.filter(o => o.status === 'picked').length} ожидает`} onClick={() => nav('/packing')} color="#10B981" />
          )}
          {allowedTypes.includes('LOAD') && (
            <QuickCard icon={Truck} label="Отправка" subtitle="Shipping" onClick={() => nav('/shipping')} color="#22C55E" />
          )}
          {allowedTypes.includes('RETURN_CHECK') && (
            <QuickCard icon={RotateCcw} label="Возвраты" subtitle={`${state.rmas.filter(r => r.status === 'received' || r.status === 'inspecting').length} новых`} onClick={() => nav('/returns')} color="#F43F5E" />
          )}
          {allowedTypes.includes('CYCLE_COUNT') && (
            <QuickCard icon={BarChart3} label="Инвентаризация" subtitle="Cycle Count" onClick={() => nav('/count')} color="#7C3AED" />
          )}
          {allowedTypes.includes('REPLENISHMENT') && (
            <QuickCard icon={Boxes} label="Пополнение" subtitle="Replenishment" onClick={() => nav('/replenishment')} color="#0EA5E9" />
          )}
          <QuickCard icon={Map} label="Карта склада" subtitle="Live map" onClick={() => nav('/map')} color="#6366F1" />
          <QuickCard icon={ScanLine} label="Остатки" subtitle="Inventory" onClick={() => nav('/inventory')} color="#14B8A6" />
          <QuickCard icon={ClipboardList} label="Заказы" subtitle="Трекинг" onClick={() => nav('/orders')} color="#F59E0B" />
          {isSupervisorOrAbove(worker.role) && (
            <>
              <QuickCard icon={Users} label="Команда" subtitle="Сотрудники" onClick={() => nav('/supervisor')} color="#7C3AED" />
              <QuickCard icon={Box} label="Yard / Dock" subtitle="Грузовики" onClick={() => nav('/yard')} color="#0EA5E9" />
            </>
          )}
          {hasPermission(worker.role, 'view_kpi') && (
            <QuickCard icon={ClipboardList} label="Аналитика" subtitle="BI Dashboard" onClick={() => nav('/analytics')} color="#7C3AED" />
          )}
          {hasPermission(worker.role, 'manage_workers') && (
            <QuickCard icon={Users} label="Все сотрудники" subtitle="Admin" onClick={() => nav('/admin/workers')} color="#DC2626" />
          )}
          {hasPermission(worker.role, 'view_audit_log') && (
            <QuickCard icon={ClipboardList} label="Журнал" subtitle="Audit log" onClick={() => nav('/audit')} color="#6B7280" />
          )}
          <QuickCard icon={AlertTriangle} label="Инциденты" subtitle="Incidents" onClick={() => nav('/incidents')} color="#EF4444" />
        </div>
      </div>
    </div>
  );
}

function KpiCell({ label, value, good, bad }: { label: string; value: string; good?: boolean; bad?: boolean }) {
  return (
    <div className="bg-[#F9FAFB] rounded-xl p-3">
      <div
        className="text-[20px]"
        style={{
          fontWeight: 900,
          color: bad ? '#EF4444' : good ? '#00D27A' : '#1F2430',
        }}
      >
        {value}
      </div>
      <div className="text-[11px] text-[#6B7280] mt-0.5" style={{ fontWeight: 600 }}>
        {label}
      </div>
    </div>
  );
}

function QuickCard({ icon: Icon, label, subtitle, onClick, color }: { icon: any; label: string; subtitle: string; onClick: () => void; color: string }) {
  return (
    <button onClick={onClick} className="bg-white rounded-2xl p-4 flex flex-col items-start gap-2 shadow-sm active-press text-left">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + '20' }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div className="text-[14px] text-[#1F2430]" style={{ fontWeight: 700 }}>
        {label}
      </div>
      <div className="text-[11px] text-[#6B7280]" style={{ fontWeight: 500 }}>
        {subtitle}
      </div>
    </button>
  );
}
