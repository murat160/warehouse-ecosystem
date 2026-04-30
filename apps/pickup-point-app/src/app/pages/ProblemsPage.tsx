import { useState } from 'react';
import { Plus, Camera, Video, Send, CheckCircle2, AlertTriangle, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useStore, store } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';
import { ProblemStatusBadge } from '../components/StatusBadge';
import { Drawer, Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import { PROBLEM_TYPE_LABELS } from '../domain/types';
import type { ProblemType, ProblemPriority } from '../domain/types';

const TYPES = Object.entries(PROBLEM_TYPE_LABELS) as [ProblemType, string][];
const PRIO: { id: ProblemPriority; label: string; color: string }[] = [
  { id: 'low',      label: 'Низкий',      color: '#6B7280' },
  { id: 'medium',   label: 'Средний',     color: '#F59E0B' },
  { id: 'high',     label: 'Высокий',     color: '#EF4444' },
  { id: 'critical', label: 'Критический', color: '#DC2626' },
];

export function ProblemsPage() {
  const { problems, employees } = useStore();
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('open');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolution, setResolution] = useState('');
  const [newP, setNewP] = useState<{ type: ProblemType; description: string; priority: ProblemPriority; orderId?: string }>({
    type: 'damaged_package', description: '', priority: 'medium',
  });

  const filtered = problems.filter(p => {
    if (filter === 'all') return true;
    if (filter === 'resolved') return p.status === 'resolved' || p.status === 'rejected';
    return p.status !== 'resolved' && p.status !== 'rejected';
  });

  const active = problems.find(p => p.id === activeId) ?? null;
  const assignee = active ? employees.find(e => e.id === active.assignedTo) : null;
  const author = active ? employees.find(e => e.id === active.createdBy) : null;

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      <PageHeader
        title="Проблемы"
        subtitle={`${problems.filter(p => p.status !== 'resolved' && p.status !== 'rejected').length} открыто`}
        right={
          <button onClick={() => setCreateOpen(true)} className="px-3 h-9 rounded-lg bg-white text-[#1F2430] text-[12px] active-press flex items-center gap-1" style={{ fontWeight: 800 }}>
            <Plus className="w-3 h-3" /> Новая
          </button>
        }
      />

      <div className="px-5 -mt-5 space-y-3">
        <div className="bg-white rounded-2xl p-2 flex gap-2">
          {(['open','resolved','all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 px-3 h-9 rounded-xl text-[12px] ${filter === f ? 'bg-[#EF4444] text-white' : 'bg-[#F3F4F6] text-[#374151]'}`}
              style={{ fontWeight: 800 }}
            >
              {f === 'open' ? 'Открытые' : f === 'resolved' ? 'Решённые' : 'Все'}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState title="Нет проблем" subtitle="Когда появится проблема, она будет здесь" />
        ) : (
          <div className="space-y-2">
            {filtered.map(p => {
              const prio = PRIO.find(x => x.id === p.priority)!;
              return (
                <button
                  key={p.id}
                  onClick={() => setActiveId(p.id)}
                  className="w-full text-left bg-white rounded-2xl p-3 active-press"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[13px] text-[#1F2430]" style={{ fontWeight: 800 }}>{p.id}</div>
                      <div className="text-[11px] text-[#6B7280] truncate">{PROBLEM_TYPE_LABELS[p.type]}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="px-2 py-0.5 rounded-full text-[10px] text-white" style={{ backgroundColor: prio.color, fontWeight: 800 }}>{prio.label}</span>
                      <ProblemStatusBadge status={p.status} />
                    </div>
                  </div>
                  <div className="text-[11px] text-[#374151] mt-1 line-clamp-2">{p.description}</div>
                  <div className="text-[10px] text-[#9CA3AF] mt-1 flex items-center gap-3">
                    {p.orderId && <span>📦 {p.orderId}</span>}
                    {p.batchId && <span>🚚 {p.batchId}</span>}
                    {p.returnId && <span>↩️ {p.returnId}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Drawer
        open={!!active}
        onClose={() => setActiveId(null)}
        title={active?.id ?? ''}
        footer={
          active ? (
            <>
              <button onClick={() => setActiveId(null)} className="px-3 h-9 rounded-lg text-[12px] text-[#6B7280] active-press" style={{ fontWeight: 700 }}>Закрыть</button>
              <button
                onClick={() => setResolveOpen(true)}
                disabled={active.status === 'resolved'}
                className="px-3 h-9 rounded-lg bg-[#16A34A] text-white text-[12px] active-press disabled:opacity-40" style={{ fontWeight: 800 }}
              >Решить</button>
            </>
          ) : null
        }
      >
        {active && (
          <div className="space-y-4">
            <div className="rounded-xl bg-[#F9FAFB] p-3 text-[12px] space-y-1">
              <Row k="Тип" v={PROBLEM_TYPE_LABELS[active.type]} />
              <Row k="Приоритет" v={PRIO.find(x => x.id === active.priority)?.label ?? active.priority} />
              <Row k="Статус" v={<ProblemStatusBadge status={active.status} />} />
              <Row k="Создал" v={author?.name ?? active.createdBy} />
              <Row k="Назначен" v={assignee?.name ?? '—'} />
              <Row k="Создана" v={fmt(active.createdAt)} />
              {active.resolvedAt && <Row k="Решена" v={fmt(active.resolvedAt)} />}
              {active.orderId && <Row k="Заказ" v={active.orderId} />}
              {active.batchId && <Row k="Партия" v={active.batchId} />}
              {active.returnId && <Row k="Возврат" v={active.returnId} />}
            </div>

            <div>
              <div className="text-[12px] text-[#6B7280] mb-2 uppercase" style={{ fontWeight: 800 }}>Описание</div>
              <div className="text-[13px] text-[#374151]">{active.description}</div>
            </div>

            {active.resolution && (
              <div>
                <div className="text-[12px] text-[#6B7280] mb-2 uppercase" style={{ fontWeight: 800 }}>Решение</div>
                <div className="text-[13px] text-[#16A34A] rounded-xl bg-[#16A34A10] p-3" style={{ fontWeight: 600, backgroundColor: '#16A34A15' }}>{active.resolution}</div>
              </div>
            )}

            <div>
              <div className="text-[12px] text-[#6B7280] mb-2 uppercase" style={{ fontWeight: 800 }}>Медиа</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { store.attachProblemMedia(active.id, 'photo', `prb-photo-${Date.now()}.jpg`); toast.success('Фото загружено'); }}
                  className="rounded-xl px-3 h-10 active-press flex items-center justify-center gap-1 text-[12px]"
                  style={{ backgroundColor: '#0EA5E915', color: '#0EA5E9', fontWeight: 800 }}
                >
                  <Camera className="w-4 h-4" /> Добавить фото
                </button>
                <button
                  onClick={() => { store.attachProblemMedia(active.id, 'video', `prb-video-${Date.now()}.mp4`); toast.success('Видео загружено'); }}
                  className="rounded-xl px-3 h-10 active-press flex items-center justify-center gap-1 text-[12px]"
                  style={{ backgroundColor: '#7C3AED15', color: '#7C3AED', fontWeight: 800 }}
                >
                  <Video className="w-4 h-4" /> Записать видео
                </button>
              </div>
              {(active.photos.length + active.videos.length > 0) && (
                <div className="mt-2 text-[11px] text-[#6B7280]">
                  Загружено: фото — {active.photos.length}, видео — {active.videos.length}
                </div>
              )}
            </div>

            <div>
              <div className="text-[12px] text-[#6B7280] mb-2 uppercase" style={{ fontWeight: 800 }}>Действия</div>
              <div className="grid grid-cols-2 gap-2">
                <Action color="#7C3AED" label="Назначить"   icon={UserPlus}     onClick={() => setAssignOpen(true)} />
                <Action color="#A855F7" label="Эскалировать" icon={Send}        onClick={() => { store.escalateProblem(active.id); toast('Эскалировано в Admin Panel'); }} />
                <Action color="#16A34A" label="Решить"       icon={CheckCircle2} onClick={() => setResolveOpen(true)} />
                <Action color="#0369A1" label="Отчёт"        icon={AlertTriangle} onClick={() => {
                  store.uploadDocument({ kind: 'problem_report', title: `Отчёт по ${active.id}`, size: '76 KB', problemId: active.id });
                  toast.success('Отчёт сформирован');
                }} />
              </div>
            </div>
          </div>
        )}
      </Drawer>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Создать проблему"
        footer={
          <>
            <button onClick={() => setCreateOpen(false)} className="px-4 h-9 rounded-lg text-[12px] text-[#6B7280] active-press" style={{ fontWeight: 700 }}>Отмена</button>
            <button
              onClick={() => {
                if (!newP.description.trim()) { toast.error('Опишите проблему'); return; }
                store.createProblem({ ...newP, description: newP.description.trim() });
                toast.success('Проблема создана');
                setNewP({ type: 'damaged_package', description: '', priority: 'medium' });
                setCreateOpen(false);
              }}
              className="px-4 h-9 rounded-lg bg-[#EF4444] text-white text-[12px] active-press" style={{ fontWeight: 800 }}
            >Создать</button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Тип">
            <select value={newP.type} onChange={e => setNewP({ ...newP, type: e.target.value as ProblemType })}
              className="w-full border border-[#E5E7EB] rounded-xl h-10 px-2 text-[13px]">
              {TYPES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="Приоритет">
            <div className="grid grid-cols-4 gap-1">
              {PRIO.map(p => (
                <button
                  key={p.id}
                  onClick={() => setNewP({ ...newP, priority: p.id })}
                  className={`rounded-lg h-9 text-[11px] ${newP.priority === p.id ? 'text-white' : 'text-[#374151]'}`}
                  style={{ backgroundColor: newP.priority === p.id ? p.color : '#F3F4F6', fontWeight: 800 }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Order ID (необязательно)">
            <input value={newP.orderId ?? ''} onChange={e => setNewP({ ...newP, orderId: e.target.value || undefined })}
              placeholder="ORD-..." className="w-full border border-[#E5E7EB] rounded-xl h-10 px-3 text-[13px]" style={{ fontFamily: 'monospace' }} />
          </Field>
          <Field label="Описание">
            <textarea value={newP.description} onChange={e => setNewP({ ...newP, description: e.target.value })} rows={3}
              className="w-full border border-[#E5E7EB] rounded-xl p-3 text-[13px]" />
          </Field>
        </div>
      </Modal>

      <Modal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title="Назначить ответственного"
        footer={
          <button onClick={() => setAssignOpen(false)} className="px-4 h-9 rounded-lg bg-[#6B7280] text-white text-[12px] active-press" style={{ fontWeight: 800 }}>Отмена</button>
        }
      >
        <div className="space-y-2">
          {employees.map(e => (
            <button
              key={e.id}
              onClick={() => {
                if (!active) return;
                store.assignProblem(active.id, e.id);
                toast.success(`Назначено: ${e.name}`);
                setAssignOpen(false);
              }}
              className="w-full text-left rounded-xl bg-[#F9FAFB] p-3 active-press flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-full bg-[#E0F2FE] flex items-center justify-center text-[#0369A1] text-[14px]" style={{ fontWeight: 900 }}>
                {e.avatar ?? e.name.charAt(0)}
              </div>
              <div>
                <div className="text-[13px] text-[#1F2430]" style={{ fontWeight: 800 }}>{e.name}</div>
                <div className="text-[11px] text-[#6B7280]">{e.id}</div>
              </div>
            </button>
          ))}
        </div>
      </Modal>

      <Modal
        open={resolveOpen}
        onClose={() => setResolveOpen(false)}
        title="Решить проблему"
        footer={
          <>
            <button onClick={() => setResolveOpen(false)} className="px-4 h-9 rounded-lg text-[12px] text-[#6B7280] active-press" style={{ fontWeight: 700 }}>Отмена</button>
            <button
              onClick={() => {
                if (!active || !resolution.trim()) { toast.error('Опишите решение'); return; }
                store.resolveProblem(active.id, resolution.trim());
                toast.success('Проблема решена');
                setResolution('');
                setResolveOpen(false);
                setActiveId(null);
              }}
              className="px-4 h-9 rounded-lg bg-[#16A34A] text-white text-[12px] active-press" style={{ fontWeight: 800 }}
            >Сохранить</button>
          </>
        }
      >
        <textarea value={resolution} onChange={e => setResolution(e.target.value)} rows={4} placeholder="Что было сделано"
          className="w-full border border-[#E5E7EB] rounded-xl p-3 text-[13px]" />
      </Modal>
    </div>
  );
}

function Row({ k, v }: { k: string; v: any }) {
  return (
    <div className="flex justify-between gap-2">
      <div className="text-[#6B7280]" style={{ fontWeight: 600 }}>{k}</div>
      <div className="text-[#1F2430]" style={{ fontWeight: 700 }}>{v}</div>
    </div>
  );
}
function Action({ color, label, onClick, icon: Icon }: { color: string; label: string; onClick: () => void; icon?: any }) {
  return (
    <button onClick={onClick} className="rounded-xl px-3 h-9 active-press flex items-center justify-center gap-1 text-[12px]"
      style={{ backgroundColor: color + '15', color, fontWeight: 800 }}>
      {Icon && <Icon className="w-3 h-3" />} {label}
    </button>
  );
}
function Field({ label, children }: { label: string; children: any }) {
  return (
    <label className="block">
      <div className="text-[10px] text-[#6B7280] uppercase mb-1" style={{ fontWeight: 800 }}>{label}</div>
      {children}
    </label>
  );
}
function fmt(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
}
