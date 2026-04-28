import { useStore } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import type { TaskStatus, TaskType } from '../domain/types';

const TYPE_LABELS: Record<TaskType, string> = {
  PICK: 'Сборка', PACK: 'Упаковка', HANDOFF: 'Передача',
  RECEIVE: 'Приёмка', PUTAWAY: 'Размещение',
  COUNT: 'Инвентаризация', MOVE: 'Перемещение',
  RETURN_CHECK: 'Возврат',
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  created: 'Создана', assigned: 'Назначена', in_progress: 'В работе',
  completed: 'Готова', blocked: 'Заблокирована',
};

export function TasksPage() {
  const { tasks, currentWorker } = useStore();
  const mine = tasks.filter(t => !t.assignedTo || t.assignedTo === currentWorker?.id);

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24 md:pb-8">
      <PageHeader title="Задачи" subtitle={`Всего: ${mine.length}`} />

      <div className="px-5 -mt-5 space-y-2">
        {mine.length === 0 ? (
          <EmptyState emoji="✅" title="Задач нет" />
        ) : mine.map(t => (
          <div key={t.id} className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[14px] text-[#1F2430]" style={{ fontWeight: 800 }}>
                {TYPE_LABELS[t.type]}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#374151]" style={{ fontWeight: 700 }}>
                {STATUS_LABELS[t.status]}
              </span>
            </div>
            <div className="text-[11px] text-[#6B7280]" style={{ fontWeight: 500 }}>
              {t.id}
              {t.orderId && ` · заказ ${t.orderId}`}
              {t.binId && ` · ячейка ${t.binId}`}
              {' · приоритет '}{t.priority}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
