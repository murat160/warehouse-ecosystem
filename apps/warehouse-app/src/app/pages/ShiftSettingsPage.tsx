import { useState } from 'react';
import { toast } from 'sonner';
import { useStore, store } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';
import { ROLE_LABELS } from '../domain/roles';

export function ShiftSettingsPage() {
  const { currentWorker, workers, tasks } = useStore();
  if (!currentWorker) return null;

  const [start, setStart] = useState(currentWorker.shiftStart ?? '09:00');
  const [end,   setEnd]   = useState(currentWorker.shiftEnd ?? '18:00');
  const onShiftWorkers = workers.filter(w => w.shiftStatus === 'on_shift' || w.shiftStatus === 'on_break');
  const unassigned = tasks.filter(t => !t.assignedTo && t.status !== 'completed');

  const savePlan = () => {
    if (!start || !end) { toast.error('Заполните время смены'); return; }
    store.setShiftPlan(start, end);
    toast.success('План смены обновлён');
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24 md:pb-8">
      <PageHeader title="Настройки смены" subtitle="Распределение задач и план смены" />

      <div className="px-5 -mt-5 space-y-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-[14px] text-[#1F2430] mb-3" style={{ fontWeight: 800 }}>План смены</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Field label="Начало" value={start} onChange={setStart} />
            <Field label="Конец"  value={end}   onChange={setEnd}   />
          </div>
          <button onClick={savePlan} className="w-full h-10 rounded-xl bg-[#0EA5E9] text-white active-press" style={{ fontWeight: 800 }}>
            Сохранить план
          </button>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-[14px] text-[#1F2430] mb-3" style={{ fontWeight: 800 }}>Распределение задач</h3>
          {unassigned.length === 0 ? (
            <div className="text-[12px] text-[#6B7280]" style={{ fontWeight: 500 }}>Все задачи распределены</div>
          ) : unassigned.map(t => (
            <div key={t.id} className="flex items-center gap-2 mb-2">
              <div className="flex-1">
                <div className="text-[13px] text-[#1F2430]" style={{ fontWeight: 700 }}>{t.id} · {t.type}</div>
                <div className="text-[11px] text-[#6B7280]" style={{ fontWeight: 500 }}>
                  {t.orderId ? `заказ ${t.orderId}` : t.binId ? `ячейка ${t.binId}` : '—'} · {t.priority}
                </div>
              </div>
              <select
                className="px-2 py-2 rounded-lg border-2 border-[#E5E7EB] text-[12px] bg-white"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    store.assignTask(t.id, e.target.value);
                    toast.success('Назначено');
                  }
                }}
              >
                <option value="">Назначить…</option>
                {onShiftWorkers.map(w => (
                  <option key={w.id} value={w.id}>{w.name} · {ROLE_LABELS[w.role]}</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-[14px] text-[#1F2430] mb-3" style={{ fontWeight: 800 }}>На смене</h3>
          <div className="space-y-1">
            {onShiftWorkers.map(w => (
              <div key={w.id} className="flex items-center justify-between text-[12px]">
                <span className="text-[#1F2430]" style={{ fontWeight: 700 }}>{w.name}</span>
                <span className="text-[#6B7280]" style={{ fontWeight: 500 }}>
                  {ROLE_LABELS[w.role]} · {w.shiftStatus}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="text-[11px] text-[#6B7280] mb-1" style={{ fontWeight: 700 }}>{label}</div>
      <input
        type="time"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-xl border-2 border-[#E5E7EB] focus:border-[#0EA5E9] focus:outline-none text-[14px]"
        style={{ fontWeight: 600 }}
      />
    </div>
  );
}
