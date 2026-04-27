import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useAppState, store } from '../hooks/useAppState';
import { TASK_TYPE_EMOJI, TASK_TYPE_LABELS, type TaskType } from '../data/mockData';
import { PriorityBadge, TaskStatusBadge } from '../components/Badges';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';

const TASK_TYPE_ROUTES: Record<TaskType, string> = {
  RECEIVE: '/inbound', QC_CHECK: '/qc', PUTAWAY: '/putaway',
  PICK: '/picking', PACK: '/packing', SORT: '/shipping', LOAD: '/shipping',
  RETURN_CHECK: '/returns', REPACK: '/returns',
  CYCLE_COUNT: '/count', REPLENISHMENT: '/replenishment',
  MOVE_BIN: '/tasks', DAMAGE_CHECK: '/qc', SECURITY_CHECK: '/tasks', DEVICE_ISSUE: '/tasks',
};

export function TasksListPage() {
  useAppState();
  const nav = useNavigate();
  const [filter, setFilter] = useState<'all' | 'urgent' | 'in_progress'>('all');

  const tasks = store.getMyTasks();
  const filtered =
    filter === 'urgent' ? tasks.filter(t => t.priority === 'express' || t.priority === 'urgent')
    : filter === 'in_progress' ? tasks.filter(t => t.status === 'in_progress' || t.status === 'accepted')
    : tasks;

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24">
      <PageHeader title="Мои задачи" subtitle={`Всего: ${tasks.length}`} />

      <div className="px-5 -mt-3 mb-3 flex gap-2 overflow-x-auto">
        <FilterPill active={filter === 'all'}         onClick={() => setFilter('all')}>Все</FilterPill>
        <FilterPill active={filter === 'urgent'}      onClick={() => setFilter('urgent')}>🔴 Срочные</FilterPill>
        <FilterPill active={filter === 'in_progress'} onClick={() => setFilter('in_progress')}>В работе</FilterPill>
      </div>

      <div className="px-5 space-y-2">
        {filtered.length === 0 ? (
          <EmptyState emoji="✅" title="Задач нет" subtitle="Все задачи выполнены или не назначены вам" />
        ) : (
          filtered.map(task => (
            <button
              key={task.id}
              onClick={() => nav(`${TASK_TYPE_ROUTES[task.type]}/${task.id}`)}
              className="w-full bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm active-press"
            >
              <div className="w-12 h-12 rounded-xl bg-[#E0F2FE] flex items-center justify-center text-[24px]">
                {TASK_TYPE_EMOJI[task.type]}
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[14px] text-[#1F2430]" style={{ fontWeight: 700 }}>
                    {TASK_TYPE_LABELS[task.type]}
                  </span>
                  <PriorityBadge priority={task.priority} size="sm" />
                  <TaskStatusBadge status={task.status} size="sm" />
                </div>
                <div className="text-[11px] text-[#6B7280]" style={{ fontWeight: 500 }}>
                  {task.id}
                  {task.deadlineAt && ` · до ${new Date(task.deadlineAt).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}`}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#9CA3AF]" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: any }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded-full text-[12px] whitespace-nowrap"
      style={{
        backgroundColor: active ? '#1F2430' : 'white',
        color: active ? 'white' : '#1F2430',
        fontWeight: 700,
      }}
    >
      {children}
    </button>
  );
}
