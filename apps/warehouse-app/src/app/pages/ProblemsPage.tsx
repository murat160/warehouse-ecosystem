import { useState } from 'react';
import { Plus, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useStore, store } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { Modal } from '../components/Modal';
import { PROBLEM_TYPE_LABELS, type ProblemType, type ProblemStatus } from '../domain/types';
import { can, ROLE_LABELS } from '../domain/roles';

const STATUS_LABELS: Record<ProblemStatus, string> = {
  open: 'Открыт', investigating: 'Изучается', escalated: 'Эскалирована', resolved: 'Решён',
};
const STATUS_COLORS: Record<ProblemStatus, { bg: string; fg: string }> = {
  open:          { bg: '#FECACA', fg: '#7F1D1D' },
  investigating: { bg: '#FEF3C7', fg: '#92400E' },
  escalated:     { bg: '#FEE2E2', fg: '#7F1D1D' },
  resolved:      { bg: '#DCFCE7', fg: '#166534' },
};

export function ProblemsPage() {
  const { problems, workers, currentWorker } = useStore();
  const canEscalate = can(currentWorker?.role, 'override_block');
  const canReassign = can(currentWorker?.role, 'reassign_task');

  const [showCreate, setShowCreate] = useState(false);
  const [type, setType] = useState<ProblemType>('item_not_found');
  const [desc, setDesc] = useState('');
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [resolveText, setResolveText] = useState('');

  const create = () => {
    if (!desc.trim()) { toast.error('Опишите проблему'); return; }
    store.createProblem({ type, description: desc });
    toast.success('Проблема создана');
    setShowCreate(false); setDesc(''); setType('item_not_found');
  };

  const resolve = () => {
    if (!resolveId || !resolveText.trim()) { toast.error('Опишите решение'); return; }
    store.resolveProblem(resolveId, resolveText);
    toast.success('Проблема решена');
    setResolveId(null); setResolveText('');
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24 md:pb-8">
      <PageHeader title="Проблемы" subtitle={`Активных: ${problems.filter(p => p.status !== 'resolved').length}`} />

      <div className="px-5 -mt-5">
        <button
          onClick={() => setShowCreate(true)}
          className="w-full h-11 rounded-2xl bg-[#EF4444] text-white flex items-center justify-center gap-2 active-press mb-3"
          style={{ fontWeight: 800 }}
        >
          <Plus className="w-4 h-4" /> Создать проблему
        </button>

        {problems.length === 0 ? (
          <EmptyState emoji="🚧" title="Проблем нет" />
        ) : (
          <div className="space-y-2">
            {problems.map(p => {
              const c = STATUS_COLORS[p.status];
              const reporter = workers.find(w => w.id === p.reportedBy);
              const assignee = p.assignedTo ? workers.find(w => w.id === p.assignedTo) : null;
              return (
                <div key={p.id} className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
                      <span className="text-[14px] text-[#1F2430]" style={{ fontWeight: 800 }}>
                        {PROBLEM_TYPE_LABELS[p.type]}
                      </span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: c.bg, color: c.fg, fontWeight: 800 }}>
                      {STATUS_LABELS[p.status]}
                    </span>
                  </div>
                  <div className="text-[12px] text-[#374151] mb-2" style={{ fontWeight: 500 }}>{p.description}</div>
                  <div className="text-[10px] text-[#9CA3AF] mb-2" style={{ fontWeight: 500 }}>
                    {reporter?.name ?? p.reportedBy}
                    {assignee && ` → ${assignee.name}`}
                    {p.orderId && ` · заказ ${p.orderId}`}
                    {p.binId && ` · ячейка ${p.binId}`}
                    {p.sku && ` · SKU ${p.sku}`}
                    {' · '}{new Date(p.createdAt).toLocaleString('ru')}
                  </div>
                  {p.status !== 'resolved' && (
                    <div className="flex flex-wrap gap-1.5">
                      {canReassign && !p.assignedTo && (
                        <select
                          defaultValue=""
                          onChange={e => { if (e.target.value) { store.assignProblem(p.id, e.target.value); toast('Назначено'); } }}
                          className="px-2 h-9 rounded-lg border-2 border-[#E5E7EB] text-[12px] bg-white"
                          style={{ fontWeight: 600 }}
                        >
                          <option value="">Назначить…</option>
                          {workers.map(w => <option key={w.id} value={w.id}>{w.name} · {ROLE_LABELS[w.role]}</option>)}
                        </select>
                      )}
                      {canEscalate && p.status !== 'escalated' && (
                        <button
                          onClick={() => { store.escalateProblem(p.id); toast('Эскалировано'); }}
                          className="px-3 h-9 rounded-lg bg-[#EF4444] text-white text-[12px] active-press" style={{ fontWeight: 700 }}
                        >Эскалировать</button>
                      )}
                      <button
                        onClick={() => setResolveId(p.id)}
                        className="px-3 h-9 rounded-lg bg-[#00D27A] text-white text-[12px] active-press" style={{ fontWeight: 700 }}
                      >Решить</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        open={showCreate}
        title="Новая проблема"
        onClose={() => setShowCreate(false)}
        footer={<button onClick={create} className="w-full h-11 rounded-xl bg-[#EF4444] text-white active-press" style={{ fontWeight: 800 }}>Создать</button>}
      >
        <div className="text-[12px] text-[#6B7280] mb-2" style={{ fontWeight: 700 }}>Тип</div>
        <div className="space-y-1 mb-3 max-h-60 overflow-y-auto">
          {(Object.keys(PROBLEM_TYPE_LABELS) as ProblemType[]).map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              className="w-full text-left p-2 rounded-xl"
              style={{
                backgroundColor: type === t ? '#FEE2E2' : '#F9FAFB',
                border: type === t ? '2px solid #EF4444' : '2px solid transparent',
                fontWeight: 600,
              }}
            >
              <span className="text-[13px] text-[#1F2430]">{PROBLEM_TYPE_LABELS[t]}</span>
            </button>
          ))}
        </div>
        <div className="text-[12px] text-[#6B7280] mb-1" style={{ fontWeight: 700 }}>Описание</div>
        <textarea
          value={desc}
          onChange={e => setDesc(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 rounded-xl border-2 border-[#E5E7EB] focus:border-[#EF4444] focus:outline-none text-[14px] resize-none"
          style={{ fontWeight: 500 }}
        />
      </Modal>

      <Modal
        open={!!resolveId}
        title={`Решить проблему`}
        onClose={() => { setResolveId(null); setResolveText(''); }}
        footer={<button onClick={resolve} className="w-full h-11 rounded-xl bg-[#00D27A] text-white active-press" style={{ fontWeight: 800 }}>Решить</button>}
      >
        <textarea
          value={resolveText}
          onChange={e => setResolveText(e.target.value)}
          rows={4}
          placeholder="Что было сделано…"
          className="w-full px-3 py-2 rounded-xl border-2 border-[#E5E7EB] focus:border-[#00D27A] focus:outline-none text-[14px] resize-none"
          style={{ fontWeight: 500 }}
        />
      </Modal>
    </div>
  );
}
