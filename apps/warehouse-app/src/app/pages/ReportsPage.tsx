import { useStore } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';
import { ORDER_STATUS, ORDER_STATUS_LABELS } from '../domain/orderStatus';

export function ReportsPage() {
  const { orders, tasks, workers } = useStore();

  const byStatus = ORDER_STATUS.map(s => ({
    status: s,
    count: orders.filter(o => o.status === s).length,
  }));

  const byTaskStatus = {
    created:     tasks.filter(t => t.status === 'created').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed:   tasks.filter(t => t.status === 'completed').length,
    blocked:     tasks.filter(t => t.status === 'blocked').length,
  };

  const onShift = workers.filter(w => w.shiftStatus === 'on_shift').length;

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24 md:pb-8">
      <PageHeader title="Отчёты" subtitle="Сводка по складу" />

      <div className="px-5 -mt-5 space-y-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-[14px] text-[#1F2430] mb-3" style={{ fontWeight: 800 }}>
            Заказы по статусам
          </h3>
          <div className="space-y-1">
            {byStatus.map(b => (
              <div key={b.status} className="flex items-center justify-between text-[12px]">
                <span className="text-[#374151]" style={{ fontWeight: 600 }}>
                  {ORDER_STATUS_LABELS[b.status]}
                </span>
                <span className="text-[#1F2430]" style={{ fontWeight: 800 }}>{b.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-[14px] text-[#1F2430] mb-3" style={{ fontWeight: 800 }}>Задачи</h3>
          <div className="grid grid-cols-2 gap-2">
            <Cell label="Созданы"        value={byTaskStatus.created} />
            <Cell label="В работе"       value={byTaskStatus.in_progress} />
            <Cell label="Готовы"         value={byTaskStatus.completed} />
            <Cell label="Заблокированы"  value={byTaskStatus.blocked} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-[14px] text-[#1F2430] mb-3" style={{ fontWeight: 800 }}>Сотрудники</h3>
          <div className="grid grid-cols-2 gap-2">
            <Cell label="На смене" value={onShift} />
            <Cell label="Всего"    value={workers.length} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[#F9FAFB] rounded-xl p-3">
      <div className="text-[18px] text-[#1F2430]" style={{ fontWeight: 900 }}>{value}</div>
      <div className="text-[11px] text-[#6B7280] mt-0.5" style={{ fontWeight: 600 }}>{label}</div>
    </div>
  );
}
