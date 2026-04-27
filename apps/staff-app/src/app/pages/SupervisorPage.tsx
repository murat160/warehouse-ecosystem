import { useState } from 'react';
import { Users, AlertTriangle, Clock, ChevronRight, X, ArrowRightLeft, Lock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAppState, store } from '../hooks/useAppState';
import { ROLE_LABELS, TASK_TYPE_LABELS, TASK_TYPE_EMOJI, type WorkerProfile, PRIORITY_CFG } from '../data/mockData';
import { PageHeader } from '../components/PageHeader';
import { PriorityBadge, TaskStatusBadge } from '../components/Badges';
import { hasPermission } from '../services/permissions';

export function SupervisorPage() {
  const state = useAppState();
  const me = state.currentWorker;
  const [tab, setTab] = useState<'workers' | 'problems' | 'tasks'>('workers');
  const [selectedWorker, setSelectedWorker] = useState<WorkerProfile | null>(null);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);

  if (!me || !hasPermission(me.role, 'view_all_workers')) {
    return (
      <div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center px-5">
        <div className="text-center">
          <Lock className="w-12 h-12 text-[#9CA3AF] mx-auto mb-3" />
          <p className="text-[16px] text-[#1F2430]" style={{ fontWeight: 700 }}>Доступ ограничен</p>
          <p className="text-[13px] text-[#6B7280] mt-1" style={{ fontWeight: 500 }}>
            Раздел доступен только supervisor и менеджерам
          </p>
        </div>
      </div>
    );
  }

  const otherWorkers = state.workers.filter(w => w.id !== me.id);
  const onShiftWorkers = otherWorkers.filter(w => w.shiftStatus === 'on_shift');

  // Проблемные задачи: blocked, escalated, errors
  const problemTasks = state.tasks.filter(t =>
    t.status === 'blocked' || t.status === 'escalated' || t.status === 'waiting_supervisor' || (t.errors && t.errors.length > 0)
  );

  const allActiveTasks = state.tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled');

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24">
      <PageHeader title="Supervisor" subtitle={`Смена · ${onShiftWorkers.length} на смене`} />

      {/* Сводка */}
      <div className="px-5 -mt-3 mb-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm grid grid-cols-3 gap-2">
          <Stat value={onShiftWorkers.length.toString()} label="На смене" color="#00D27A" />
          <Stat value={problemTasks.length.toString()} label="Проблем" color="#EF4444" />
          <Stat value={allActiveTasks.length.toString()} label="Задач" color="#2EA7E0" />
        </div>
      </div>

      <div className="px-5 mb-3 flex gap-2">
        <Tab active={tab === 'workers'} onClick={() => setTab('workers')}>
          <Users className="w-4 h-4" />
          Сотрудники
        </Tab>
        <Tab active={tab === 'problems'} onClick={() => setTab('problems')}>
          <AlertTriangle className="w-4 h-4" />
          Проблемы
          {problemTasks.length > 0 && (
            <span className="bg-[#EF4444] text-white text-[10px] rounded-full px-1.5 py-0.5" style={{ fontWeight: 800 }}>
              {problemTasks.length}
            </span>
          )}
        </Tab>
        <Tab active={tab === 'tasks'} onClick={() => setTab('tasks')}>
          <Clock className="w-4 h-4" />
          Задачи
        </Tab>
      </div>

      {tab === 'workers' && (
        <div className="px-5 space-y-2">
          {otherWorkers.map(w => {
            const myActiveTasks = state.tasks.filter(t => t.assignedTo === w.id && t.status !== 'completed').length;
            return (
              <button
                key={w.id}
                onClick={() => setSelectedWorker(w)}
                className="w-full bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm active-press text-left"
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-[#E0F2FE] flex items-center justify-center text-[#2EA7E0] text-[18px]" style={{ fontWeight: 800 }}>
                    {w.name[0]}
                  </div>
                  <div
                    className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white"
                    style={{ backgroundColor: w.shiftStatus === 'on_shift' ? '#00D27A' : w.shiftStatus === 'on_break' ? '#F59E0B' : '#9CA3AF' }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] text-[#1F2430] truncate" style={{ fontWeight: 800 }}>
                    {w.name}
                  </div>
                  <div className="text-[12px] text-[#6B7280]" style={{ fontWeight: 500 }}>
                    {ROLE_LABELS[w.role]} · {w.zone || '—'}
                  </div>
                  <div className="text-[11px] text-[#1F2430] mt-1" style={{ fontWeight: 600 }}>
                    Задач: {myActiveTasks} · Прод-сть: {w.productivity}% · Ошибки: {w.errorRate}%
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[#9CA3AF]" />
              </button>
            );
          })}
        </div>
      )}

      {tab === 'problems' && (
        <div className="px-5 space-y-2">
          {problemTasks.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center">
              <CheckCircle className="w-12 h-12 text-[#00D27A] mx-auto mb-2" />
              <p className="text-[14px] text-[#1F2430]" style={{ fontWeight: 700 }}>
                Проблем нет
              </p>
              <p className="text-[12px] text-[#6B7280]" style={{ fontWeight: 500 }}>
                Все задачи в работе
              </p>
            </div>
          ) : (
            problemTasks.map(t => {
              const worker = t.assignedTo ? state.workers.find(w => w.id === t.assignedTo) : null;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedTask(t.id)}
                  className="w-full bg-white rounded-2xl p-4 shadow-sm active-press text-left border-l-4"
                  style={{ borderColor: '#EF4444' }}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[18px]">{TASK_TYPE_EMOJI[t.type]}</span>
                      <span className="text-[14px] text-[#1F2430]" style={{ fontWeight: 800 }}>
                        {TASK_TYPE_LABELS[t.type]}
                      </span>
                    </div>
                    <PriorityBadge priority={t.priority} size="sm" />
                  </div>
                  <div className="text-[12px] text-[#6B7280] mb-1" style={{ fontWeight: 500 }}>
                    {t.id} · {worker?.name || 'Не назначена'}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <TaskStatusBadge status={t.status} size="sm" />
                    {t.notes && (
                      <span className="text-[11px] text-[#EF4444]" style={{ fontWeight: 600 }}>
                        {t.notes}
                      </span>
                    )}
                  </div>
                  {t.errors && t.errors.length > 0 && (
                    <div className="mt-2 bg-[#FEE2E2] rounded-lg p-2 text-[11px] text-[#991B1B]" style={{ fontWeight: 600 }}>
                      ⚠ Ошибок: {t.errors.length}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}

      {tab === 'tasks' && (
        <div className="px-5 space-y-2">
          {allActiveTasks
            .sort((a,b) => PRIORITY_CFG[a.priority].rank - PRIORITY_CFG[b.priority].rank)
            .map(t => {
              const worker = t.assignedTo ? state.workers.find(w => w.id === t.assignedTo) : null;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedTask(t.id)}
                  className="w-full bg-white rounded-2xl p-3 flex items-center gap-3 shadow-sm active-press text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#F3F4F6] flex items-center justify-center text-[20px]">
                    {TASK_TYPE_EMOJI[t.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-[#1F2430] truncate" style={{ fontWeight: 700 }}>
                      {TASK_TYPE_LABELS[t.type]}
                    </div>
                    <div className="text-[11px] text-[#6B7280] truncate" style={{ fontWeight: 500 }}>
                      {worker ? worker.name : 'Свободна'} · {t.id}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <PriorityBadge priority={t.priority} size="sm" />
                    <TaskStatusBadge status={t.status} size="sm" />
                  </div>
                </button>
              );
            })}
        </div>
      )}

      {/* Modal: детали сотрудника */}
      {selectedWorker && (
        <WorkerDetailModal worker={selectedWorker} onClose={() => setSelectedWorker(null)} />
      )}

      {/* Modal: управление задачей */}
      {selectedTask && (
        <TaskActionModal
          taskId={selectedTask}
          onClose={() => setSelectedTask(null)}
          canBlock={hasPermission(me.role, 'block_task')}
          canReassign={hasPermission(me.role, 'reassign_task')}
          canForceComplete={hasPermission(me.role, 'force_complete_task')}
        />
      )}
    </div>
  );
}

function Stat({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="bg-[#F9FAFB] rounded-xl p-3">
      <div className="text-[22px]" style={{ fontWeight: 900, color }}>{value}</div>
      <div className="text-[10px] text-[#6B7280] mt-0.5" style={{ fontWeight: 600 }}>{label}</div>
    </div>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: any }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 h-10 rounded-full text-[12px] flex items-center justify-center gap-1 active-press"
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

function WorkerDetailModal({ worker, onClose }: { worker: WorkerProfile; onClose: () => void }) {
  const state = useAppState();
  const tasks = state.tasks.filter(t => t.assignedTo === worker.id && t.status !== 'completed');
  const completedToday = state.tasks.filter(t => t.assignedTo === worker.id && t.status === 'completed').length;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end animate-fade-in" onClick={onClose}>
      <div
        className="w-full bg-white rounded-t-3xl p-5 animate-slide-up max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
      >
        <div className="flex justify-center pb-3">
          <div className="w-9 h-1 bg-[#DADADA] rounded-full" />
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-16 h-16 rounded-full bg-[#E0F2FE] flex items-center justify-center text-[#2EA7E0] text-[28px]" style={{ fontWeight: 900 }}>
            {worker.name[0]}
          </div>
          <div className="flex-1">
            <div className="text-[18px] text-[#1F2430]" style={{ fontWeight: 900 }}>{worker.name}</div>
            <div className="text-[12px] text-[#6B7280]" style={{ fontWeight: 500 }}>
              {ROLE_LABELS[worker.role]} · {worker.badgeId}
            </div>
            <div className="text-[11px]" style={{ fontWeight: 700, color: worker.shiftStatus === 'on_shift' ? '#00D27A' : '#9CA3AF' }}>
              {worker.shiftStatus === 'on_shift' ? '● На смене' : worker.shiftStatus === 'on_break' ? '● Перерыв' : '○ Не на смене'}
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-[#F3F4F6] flex items-center justify-center">
            <X className="w-5 h-5 text-[#1F2430]" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <Cell value={worker.productivity + '%'} label="Прод-сть" good />
          <Cell value={worker.errorRate.toFixed(1) + '%'} label="Ошибки" bad={worker.errorRate > 1.5} />
          <Cell value={completedToday.toString()} label="Готово" />
        </div>

        <h4 className="text-[13px] text-[#6B7280] mb-2" style={{ fontWeight: 700 }}>
          Активные задачи ({tasks.length})
        </h4>
        <div className="space-y-1">
          {tasks.length === 0 ? (
            <div className="bg-[#F9FAFB] rounded-xl p-3 text-center text-[12px] text-[#6B7280]" style={{ fontWeight: 500 }}>
              Нет активных задач
            </div>
          ) : (
            tasks.map(t => (
              <div key={t.id} className="bg-[#F9FAFB] rounded-xl p-2 flex items-center gap-2">
                <span className="text-[18px]">{TASK_TYPE_EMOJI[t.type]}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] text-[#1F2430] truncate" style={{ fontWeight: 700 }}>
                    {TASK_TYPE_LABELS[t.type]}
                  </div>
                  <div className="text-[11px] text-[#6B7280] truncate" style={{ fontWeight: 500 }}>
                    {t.id}
                  </div>
                </div>
                <TaskStatusBadge status={t.status} size="sm" />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function TaskActionModal({ taskId, onClose, canBlock, canReassign, canForceComplete }: {
  taskId: string; onClose: () => void;
  canBlock: boolean; canReassign: boolean; canForceComplete: boolean;
}) {
  const state = useAppState();
  const task = state.tasks.find(t => t.id === taskId);
  const [reassignTo, setReassignTo] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  if (!task) return null;

  const eligibleWorkers = state.workers.filter(w =>
    w.shiftStatus === 'on_shift' && w.id !== task.assignedTo
  );

  const handleBlock = () => {
    store.blockTask(task.id, reason || 'Заблокирована supervisor');
    toast.success('Задача заблокирована');
    onClose();
  };

  const handleReassign = () => {
    if (!reassignTo) return;
    store.reassignTask(task.id, reassignTo);
    toast.success('Задача переназначена');
    onClose();
  };

  const handleForceComplete = () => {
    store.completeTask(task.id);
    toast.success('Задача принудительно завершена');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end animate-fade-in" onClick={onClose}>
      <div
        className="w-full bg-white rounded-t-3xl p-5 animate-slide-up max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
      >
        <div className="flex justify-center pb-3">
          <div className="w-9 h-1 bg-[#DADADA] rounded-full" />
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-[#F3F4F6] flex items-center justify-center text-[28px]">
            {TASK_TYPE_EMOJI[task.type]}
          </div>
          <div className="flex-1">
            <div className="text-[16px] text-[#1F2430]" style={{ fontWeight: 800 }}>
              {TASK_TYPE_LABELS[task.type]}
            </div>
            <div className="text-[11px] text-[#6B7280]" style={{ fontWeight: 500 }}>
              {task.id}
            </div>
          </div>
          <TaskStatusBadge status={task.status} size="sm" />
        </div>

        {task.errors && task.errors.length > 0 && (
          <div className="bg-[#FEE2E2] rounded-xl p-3 mb-3">
            <div className="text-[11px] text-[#991B1B] mb-1" style={{ fontWeight: 700 }}>Ошибки:</div>
            {task.errors.map(e => (
              <div key={e.id} className="text-[12px] text-[#7F1D1D]" style={{ fontWeight: 500 }}>
                · {e.code}: {e.message}
              </div>
            ))}
          </div>
        )}

        {canReassign && eligibleWorkers.length > 0 && (
          <div className="mb-4">
            <h4 className="text-[13px] text-[#6B7280] mb-2" style={{ fontWeight: 700 }}>
              Переназначить на:
            </h4>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {eligibleWorkers.map(w => (
                <button
                  key={w.id}
                  onClick={() => setReassignTo(w.id)}
                  className="w-full flex items-center gap-2 p-2 rounded-xl active-press text-left"
                  style={{
                    backgroundColor: reassignTo === w.id ? '#E0F2FE' : '#F9FAFB',
                    border: reassignTo === w.id ? '2px solid #2EA7E0' : '2px solid transparent',
                  }}
                >
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[12px]" style={{ fontWeight: 800, color: '#2EA7E0' }}>
                    {w.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] text-[#1F2430] truncate" style={{ fontWeight: 700 }}>{w.name}</div>
                    <div className="text-[10px] text-[#6B7280] truncate" style={{ fontWeight: 500 }}>{ROLE_LABELS[w.role]}</div>
                  </div>
                </button>
              ))}
            </div>
            {reassignTo && (
              <button
                onClick={handleReassign}
                className="w-full h-12 rounded-xl bg-[#2EA7E0] text-white mt-2 flex items-center justify-center gap-2 active-press"
                style={{ fontWeight: 700 }}
              >
                <ArrowRightLeft className="w-4 h-4" />
                Переназначить
              </button>
            )}
          </div>
        )}

        {canBlock && (
          <div className="mb-3">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Причина блокировки (опц.)"
              rows={2}
              className="w-full px-3 py-2 rounded-xl border-2 border-[#E5E7EB] focus:border-[#EF4444] focus:outline-none text-[13px] resize-none mb-2"
              style={{ fontWeight: 500 }}
            />
            <button
              onClick={handleBlock}
              className="w-full h-11 rounded-xl bg-[#EF4444] text-white active-press"
              style={{ fontWeight: 700 }}
            >
              🚫 Заблокировать задачу
            </button>
          </div>
        )}

        {canForceComplete && (
          <button
            onClick={handleForceComplete}
            className="w-full h-11 rounded-xl bg-[#00D27A] text-white active-press"
            style={{ fontWeight: 700 }}
          >
            ✓ Принудительно завершить
          </button>
        )}
      </div>
    </div>
  );
}

function Cell({ value, label, good, bad }: { value: string; label: string; good?: boolean; bad?: boolean }) {
  return (
    <div className="bg-[#F9FAFB] rounded-xl p-2">
      <div className="text-[18px]" style={{ fontWeight: 900, color: bad ? '#EF4444' : good ? '#00D27A' : '#1F2430' }}>{value}</div>
      <div className="text-[10px] text-[#6B7280] mt-0.5" style={{ fontWeight: 600 }}>{label}</div>
    </div>
  );
}
