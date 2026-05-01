/**
 * TasksList — minimal employee-task management page.
 *
 * In-memory mock store (TASKS array). The same interface will be swapped
 * for an API-backed store once /api/tasks lands; until then, every action
 * here mutates state and toasts so the buttons are never silent.
 *
 * Routes:
 *   /tasks          — list + KPI cards (this page)
 *   /tasks?action=assign  — auto-opens the AssignTaskModal
 *   /tasks/mine     — same list filtered to current user (assignee === user.email)
 */
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Plus, X, ListChecks, AlertTriangle, CheckCircle2, Clock,
  Trash2, User as UserIcon, Search,
} from 'lucide-react';
import { useI18n, type DictKey } from '../../i18n';
import { useAuth } from '../../contexts/AuthContext';

type TaskStatus   = 'open' | 'in_progress' | 'done' | 'overdue';
type TaskPriority = 'low'  | 'normal'      | 'high' | 'urgent';

interface Task {
  id:          string;
  title:       string;
  description: string;
  assignee:    string;       // email or display name
  priority:    TaskPriority;
  type:        string;
  due:         string;       // ISO date "YYYY-MM-DD"
  status:      TaskStatus;
  createdAt:   string;
}

const SEED: Task[] = [
  { id: 't1', title: 'Проверить отгрузку 50 заказов на склад #2', description: 'Сверить ШК и пересчитать целостность упаковки.', assignee: 'ivanov@platform.com', priority: 'high',   type: 'warehouse', due: '2026-05-05', status: 'in_progress', createdAt: '2026-05-01' },
  { id: 't2', title: 'Подписать договоры с 3 продавцами',         description: 'Документы лежат в /legal/contracts.',          assignee: 'sokolov@platform.com', priority: 'urgent', type: 'legal',     due: '2026-05-02', status: 'open',         createdAt: '2026-05-01' },
  { id: 't3', title: 'Подготовить отчёт по выплатам за апрель',   description: 'Бухгалтерия → /finance/reports.',              assignee: 'sidorov@platform.com', priority: 'normal', type: 'finance',   due: '2026-05-10', status: 'open',         createdAt: '2026-04-28' },
];

const PRIORITY_BADGE: Record<TaskPriority, string> = {
  low:    'bg-gray-100 text-gray-600',
  normal: 'bg-blue-50 text-blue-700',
  high:   'bg-orange-50 text-orange-700',
  urgent: 'bg-red-50 text-red-700',
};
const STATUS_BADGE: Record<TaskStatus, string> = {
  open:        'bg-blue-50 text-blue-700',
  in_progress: 'bg-amber-50 text-amber-700',
  done:        'bg-green-50 text-green-700',
  overdue:     'bg-red-50 text-red-700',
};

const ASSIGNEES = [
  'ivanov@platform.com', 'sidorov@platform.com', 'sokolov@platform.com',
  'morozova@platform.com', 'kuznetsov@platform.com', 'lebedev@platform.com',
];

const TASK_TYPES: { id: string; labelKey: DictKey | null; fallback: string }[] = [
  { id: 'warehouse', labelKey: null, fallback: 'Складская' },
  { id: 'finance',   labelKey: null, fallback: 'Финансовая' },
  { id: 'legal',     labelKey: null, fallback: 'Юридическая' },
  { id: 'support',   labelKey: null, fallback: 'Поддержка' },
  { id: 'general',   labelKey: null, fallback: 'Общая' },
];

export function TasksList({ onlyMine = false }: { onlyMine?: boolean }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [tasks, setTasks]       = useState<Task[]>(SEED);
  const [showAssign, setShowAssign] = useState(false);
  const [search, setSearch]     = useState('');
  const [form, setForm] = useState({
    title: '', description: '', assignee: ASSIGNEES[0], priority: 'normal' as TaskPriority,
    type: 'general', due: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
  });

  // Deep-link: /tasks?action=assign auto-opens the modal.
  useEffect(() => {
    if (searchParams.get('action') === 'assign') {
      setShowAssign(true);
      const next = new URLSearchParams(searchParams);
      next.delete('action');
      setSearchParams(next, { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const visible = useMemo(() => {
    let list = tasks;
    if (onlyMine && user?.email) list = list.filter(x => x.assignee === user.email);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(x =>
      x.title.toLowerCase().includes(q) ||
      x.assignee.toLowerCase().includes(q) ||
      x.description.toLowerCase().includes(q)
    );
    return list;
  }, [tasks, onlyMine, user?.email, search]);

  const stats = useMemo(() => ({
    total:   tasks.length,
    open:    tasks.filter(t => t.status === 'open' || t.status === 'in_progress').length,
    overdue: tasks.filter(t => t.status === 'overdue').length,
    done:    tasks.filter(t => t.status === 'done').length,
  }), [tasks]);

  function submit() {
    const title = form.title.trim();
    if (!title) { toast.error(t('toast.error')); return; }
    const newTask: Task = {
      id: `t-${Date.now()}`,
      title,
      description: form.description.trim(),
      assignee:    form.assignee,
      priority:    form.priority,
      type:        form.type,
      due:         form.due,
      status:      'open',
      createdAt:   new Date().toISOString().slice(0, 10),
    };
    setTasks(prev => [newTask, ...prev]);
    setShowAssign(false);
    setForm(f => ({ ...f, title: '', description: '' }));
    toast.success(t('tasks.toast.assigned'));
  }

  function close(id: string) {
    setTasks(prev => prev.map(x => x.id === id ? { ...x, status: 'done' } : x));
    toast.success(t('tasks.toast.markedDone'));
  }
  function remove(id: string) {
    setTasks(prev => prev.filter(x => x.id !== id));
    toast.success(t('tasks.toast.deleted'));
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-900">{t('tasks.title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t('tasks.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowAssign(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors">
          <Plus className="w-4 h-4" />{t('tasks.assign')}
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([
          { labelKey: 'tasks.kpi.total',   icon: ListChecks,    color: 'text-blue-600 bg-blue-50',     value: stats.total },
          { labelKey: 'tasks.kpi.open',    icon: Clock,         color: 'text-amber-600 bg-amber-50',   value: stats.open },
          { labelKey: 'tasks.kpi.overdue', icon: AlertTriangle, color: 'text-red-600 bg-red-50',       value: stats.overdue },
          { labelKey: 'tasks.kpi.done',    icon: CheckCircle2,  color: 'text-green-600 bg-green-50',   value: stats.done },
        ] as Array<{ labelKey: DictKey; icon: any; color: string; value: number }>).map(kpi => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.labelKey}
              className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${kpi.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-black text-gray-900">{kpi.value}</p>
                <p className="text-xs text-gray-500">{t(kpi.labelKey)}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder={t('common.search')}
          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
      </div>

      {/* List */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {[
                t('tasks.col.title'),
                t('tasks.col.assignee'),
                t('tasks.col.priority'),
                t('tasks.col.due'),
                t('tasks.col.status'),
                t('common.actions'),
              ].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {visible.map(task => (
              <tr key={task.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-800">{task.title}</p>
                  {task.description && <p className="text-xs text-gray-400 truncate max-w-md">{task.description}</p>}
                </td>
                <td className="px-4 py-3 text-xs text-gray-600 flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-gray-400" />{task.assignee}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${PRIORITY_BADGE[task.priority]}`}>
                    {t(`tasks.priority.${task.priority}` as DictKey)}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{task.due}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_BADGE[task.status]}`}>
                    {t(`tasks.status.${task.status}` as DictKey)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {task.status !== 'done' && (
                      <button onClick={() => close(task.id)}
                        className="px-2 py-1 text-xs border border-green-200 text-green-700 rounded-lg hover:bg-green-50">
                        {t('tasks.action.markDone')}
                      </button>
                    )}
                    <button onClick={() => remove(task.id)}
                      title={t('tasks.action.delete')}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400">
            <ListChecks className="w-10 h-10 mx-auto opacity-30 mb-2" />
            {t('tasks.empty')}
          </div>
        )}
      </div>

      {/* Assign modal */}
      {showAssign && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowAssign(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <p className="font-bold text-gray-900">{t('tasks.modal.title')}</p>
              <button onClick={() => setShowAssign(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{t('tasks.field.title')}</label>
                <input autoFocus value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{t('tasks.field.description')}</label>
                <textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{t('tasks.field.assignee')}</label>
                  <select value={form.assignee} onChange={e => setForm(f => ({ ...f, assignee: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {ASSIGNEES.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{t('tasks.field.priority')}</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as TaskPriority }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {(['low','normal','high','urgent'] as TaskPriority[]).map(p =>
                      <option key={p} value={p}>{t(`tasks.priority.${p}` as DictKey)}</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{t('tasks.field.type')}</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {TASK_TYPES.map(tp => <option key={tp.id} value={tp.id}>{tp.fallback}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{t('tasks.field.due')}</label>
                  <input type="date" value={form.due} onChange={e => setForm(f => ({ ...f, due: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex gap-3">
              <button onClick={() => setShowAssign(false)} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">{t('common.cancel')}</button>
              <button onClick={submit} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold">{t('common.create')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Convenience wrapper for /tasks/mine — pre-filters to current user. */
export function MyTasks() {
  return <TasksList onlyMine />;
}
