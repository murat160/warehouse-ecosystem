import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useStore, store } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { can } from '../domain/roles';
import type { TaskStatus, TaskType } from '../domain/types';

const TYPE_LABELS: Record<TaskType, string> = {
  PICK: 'Сборка', SORT: 'Сортировка', PACK: 'Упаковка', HANDOFF: 'Передача',
  RECEIVE: 'Приёмка', PUTAWAY: 'Размещение',
  COUNT: 'Инвентаризация', MOVE: 'Перемещение',
  RETURN_CHECK: 'Возврат',
};

const TYPE_ROUTE: Record<TaskType, string> = {
  PICK: '/picking', SORT: '/sorting', PACK: '/packing', HANDOFF: '/handoff',
  RECEIVE: '/inbound', PUTAWAY: '/inbound',
  COUNT: '/count', MOVE: '/movements',
  RETURN_CHECK: '/returns',
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  created: 'Создана', assigned: 'Назначена', in_progress: 'В работе',
  completed: 'Готова', blocked: 'Заблокирована',
};

export function TasksPage() {
  const { tasks, currentWorker } = useStore();
  const nav = useNavigate();
  const [filter, setFilter] = useState<'all' | 'mine' | 'unassigned'>('mine');
  const canCancel = can(currentWorker?.role, 'cancel_task');

  const list = tasks.filter(t => {
    if (filter === 'mine')       return t.assignedTo === currentWorker?.id;
    if (filter === 'unassigned') return !t.assignedTo;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24 md:pb-8">
      <PageHeader title="Задачи" subtitle={`Всего: ${list.length}`} />

      <div className="px-5 -mt-3 mb-3 flex gap-2">
        <Pill active={filter === 'mine'}       onClick={() => setFilter('mine')}>Мои</Pill>
        <Pill active={filter === 'unassigned'} onClick={() => setFilter('unassigned')}>Свободные</Pill>
        <Pill active={filter === 'all'}        onClick={() => setFilter('all')}>Все</Pill>
      </div>

      <div className="px-5 space-y-2">
        {list.length === 0 ? (
          <EmptyState emoji="✅" title="Задач нет" />
        ) : list.map(t => (
          <div key={t.id} className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[14px] text-[#1F2430]" style={{ fontWeight: 800 }}>{TYPE_LABELS[t.type]}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#374151]" style={{ fontWeight: 700 }}>
                {STATUS_LABELS[t.status]}
              </span>
            </div>
            <div className="text-[11px] text-[#6B7280] mb-3" style={{ fontWeight: 500 }}>
              {t.id}
              {t.orderId && ` · заказ ${t.orderId}`}
              {t.binId && ` · ячейка ${t.binId}`}
              {' · '}{t.priority}
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => nav(t.orderId ? `${TYPE_ROUTE[t.type]}/${t.orderId}` : TYPE_ROUTE[t.type])}
                className="px-3 h-9 rounded-lg bg-[#1F2430] text-white text-[12px] active-press" style={{ fontWeight: 700 }}
              >Открыть</button>
              {!t.assignedTo && currentWorker && (
                <button
                  onClick={() => { store.assignTask(t.id, currentWorker.id); toast.success('Принято'); }}
                  className="px-3 h-9 rounded-lg bg-[#0EA5E9] text-white text-[12px] active-press" style={{ fontWeight: 700 }}
                >Принять</button>
              )}
              {t.status === 'assigned' && t.assignedTo === currentWorker?.id && (
                <button
                  onClick={() => { store.startTask(t.id); toast('Задача начата'); }}
                  className="px-3 h-9 rounded-lg bg-[#F59E0B] text-white text-[12px] active-press" style={{ fontWeight: 700 }}
                >В работу</button>
              )}
              {(t.status === 'in_progress') && (
                <button
                  onClick={() => { store.completeTask(t.id); toast.success('Задача готова'); }}
                  className="px-3 h-9 rounded-lg bg-[#00D27A] text-white text-[12px] active-press" style={{ fontWeight: 700 }}
                >Готово</button>
              )}
              {canCancel && t.status !== 'completed' && (
                <button
                  onClick={() => {
                    const reason = prompt('Причина отмены?');
                    if (reason) { store.cancelTask(t.id, reason); toast('Отменено'); }
                  }}
                  className="px-3 h-9 rounded-lg bg-[#EF4444] text-white text-[12px] active-press" style={{ fontWeight: 700 }}
                >Отменить</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="px-4 h-9 rounded-full text-[12px] active-press"
      style={{ backgroundColor: active ? '#1F2430' : 'white', color: active ? 'white' : '#1F2430', fontWeight: 700 }}
    >{children}</button>
  );
}
