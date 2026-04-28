import { Pause, Play, LogOut, Activity, Award, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useStore, store } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';
import { ROLE_LABELS } from '../domain/roles';

export function ShiftPage() {
  const { currentWorker, tasks, orders, audit } = useStore();
  if (!currentWorker) return null;

  const onShift = currentWorker.shiftStatus === 'on_shift';
  const onBreak = currentWorker.shiftStatus === 'on_break';

  const myTasksToday = tasks.filter(t => t.assignedTo === currentWorker.id && t.status === 'completed').length;
  const myOrdersToday = orders.filter(o => o.pickerId === currentWorker.id || o.packerId === currentWorker.id || o.shipperId === currentWorker.id).length;
  const myAudit = audit.filter(a => a.workerId === currentWorker.id).slice(0, 6);

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24 md:pb-8">
      <PageHeader title="Моя смена" subtitle={`${currentWorker.shiftStart ?? '—'} – ${currentWorker.shiftEnd ?? '—'}`} />

      <div className="px-5 -mt-5 space-y-3">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: onShift ? '#00D27A' : onBreak ? '#F59E0B' : '#9CA3AF' }}
            >
              {onShift ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white" />}
            </div>
            <div>
              <div className="text-[16px] text-[#1F2430]" style={{ fontWeight: 800 }}>
                {onShift ? 'Смена в работе' : onBreak ? 'Перерыв' : 'Не на смене'}
              </div>
              <div className="text-[12px] text-[#6B7280]" style={{ fontWeight: 500 }}>
                {currentWorker.name} · {ROLE_LABELS[currentWorker.role]}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => { store.setShift('on_shift'); toast.success('Смена начата'); }}
              className="h-11 rounded-xl bg-[#00D27A] text-white active-press" style={{ fontWeight: 800 }}
            >Начать</button>
            <button
              onClick={() => { store.setShift('on_break'); toast('Перерыв'); }}
              className="h-11 rounded-xl bg-[#F59E0B] text-white active-press" style={{ fontWeight: 800 }}
            >Перерыв</button>
            <button
              onClick={() => { store.setShift('off'); toast('Смена завершена'); }}
              className="h-11 rounded-xl bg-[#1F2430] text-white active-press flex items-center justify-center gap-2" style={{ fontWeight: 800 }}
            ><LogOut className="w-4 h-4" /> Завершить</button>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-[14px] text-[#1F2430] mb-3" style={{ fontWeight: 800 }}>Сегодня</h3>
          <div className="grid grid-cols-3 gap-2">
            <Stat icon={<FileText className="w-3 h-3" />} label="Задач" value={myTasksToday} />
            <Stat icon={<Activity className="w-3 h-3" />} label="Заказов" value={myOrdersToday} />
            <Stat icon={<Award className="w-3 h-3" />} label="Прод-сть" value={`${currentWorker.productivity}%`} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-[14px] text-[#1F2430] mb-3" style={{ fontWeight: 800 }}>Недавние действия</h3>
          {myAudit.length === 0 ? (
            <div className="text-[12px] text-[#6B7280]" style={{ fontWeight: 500 }}>Действий нет</div>
          ) : (
            <div className="space-y-1">
              {myAudit.map(a => (
                <div key={a.id} className="flex items-center justify-between text-[12px]">
                  <span className="text-[#1F2430]" style={{ fontWeight: 700 }}>{a.action}</span>
                  <span className="text-[#6B7280] truncate ml-2 max-w-[60%]" style={{ fontWeight: 500 }}>{a.detail}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: any; label: string; value: number | string }) {
  return (
    <div className="bg-[#F9FAFB] rounded-xl p-3">
      <div className="text-[18px] text-[#1F2430]" style={{ fontWeight: 900 }}>{value}</div>
      <div className="flex items-center gap-1 text-[11px] text-[#6B7280] mt-0.5" style={{ fontWeight: 600 }}>
        {icon} {label}
      </div>
    </div>
  );
}
