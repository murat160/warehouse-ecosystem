import { useState } from 'react';
import { Plus, AlertTriangle, Camera, Video, Eye, Send, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { useStore, store } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { MediaPreviewModal, type MediaItem } from '../components/MediaPreviewModal';
import { OwnerCard } from '../components/OwnerCard';
import { SendToSupplierModal } from '../components/SendToSupplierModal';
import { SupplierChatModal } from '../components/SupplierChatModal';
import { InternalChatButton } from '../components/InternalChatButton';
import { MockCallModal } from '../components/MockCallModal';
import { Phone } from 'lucide-react';
import { PROBLEM_TYPE_LABELS, type ProblemType, type ProblemStatus, type EvidenceSendItem } from '../domain/types';
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
  const { problems, workers, currentWorker, skus, suppliers } = useStore();
  const canEscalate = can(currentWorker?.role, 'override_block');
  const canReassign = can(currentWorker?.role, 'reassign_task');

  const [showCreate, setShowCreate] = useState(false);
  const [type, setType] = useState<ProblemType>('item_not_found');
  const [desc, setDesc] = useState('');

  const [resolveId, setResolveId] = useState<string | null>(null);
  const [resolveText, setResolveText] = useState('');
  const [confirmResolve, setConfirmResolve] = useState(false);

  const [media, setMedia] = useState<{ items: MediaItem[]; index: number } | null>(null);
  const [sendFor, setSendFor] = useState<null | { problemId: string; supplierId?: string; sku?: string; items: EvidenceSendItem[] }>(null);
  const [chatThreadId, setChatThreadId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | ProblemStatus>('ALL');
  const [callFor, setCallFor] = useState<string | null>(null);

  const create = () => {
    if (!desc.trim()) { toast.error('Опишите проблему'); return; }
    store.createProblem({ type, description: desc });
    toast.success('Проблема создана');
    setShowCreate(false); setDesc(''); setType('item_not_found');
  };

  const startResolve = () => {
    if (!resolveText.trim()) { toast.error('Опишите решение'); return; }
    setConfirmResolve(true);
  };
  const finishResolve = () => {
    if (!resolveId) return;
    store.resolveProblem(resolveId, resolveText);
    toast.success('Проблема решена');
    setResolveId(null); setResolveText(''); setConfirmResolve(false);
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24 md:pb-8">
      <PageHeader title="Проблемы" subtitle={`Активных: ${problems.filter(p => p.status !== 'resolved').length}`} />

      <div className="px-5 -mt-5">
        <div className="bg-white rounded-2xl p-3 shadow-sm grid grid-cols-4 gap-2 mb-3">
          <FilterPill label="Все"        value={problems.length}                                           active={filter === 'ALL'}            onClick={() => setFilter('ALL')} />
          <FilterPill label="Открыты"    value={problems.filter(p => p.status === 'open').length}          active={filter === 'open'}           onClick={() => setFilter('open')}           color="#7F1D1D" />
          <FilterPill label="Изучаются"  value={problems.filter(p => p.status === 'investigating').length} active={filter === 'investigating'}  onClick={() => setFilter('investigating')}  color="#92400E" />
          <FilterPill label="Решены"     value={problems.filter(p => p.status === 'resolved').length}      active={filter === 'resolved'}       onClick={() => setFilter('resolved')}       color="#166534" />
        </div>

        <button
          onClick={() => setShowCreate(true)}
          className="w-full h-11 rounded-2xl bg-[#EF4444] text-white flex items-center justify-center gap-2 active-press mb-3"
          style={{ fontWeight: 800 }}
        >
          <Plus className="w-4 h-4" /> Создать проблему
        </button>

        {(() => {
          const list = filter === 'ALL' ? problems : problems.filter(p => p.status === filter);
          if (list.length === 0) return <EmptyState emoji="🚧" title="Проблем нет" subtitle="Если что-то пошло не так — создайте проблему здесь." />;
          return (
          <div className="space-y-2">
            {list.map(p => {
              const c = STATUS_COLORS[p.status];
              const reporter = workers.find(w => w.id === p.reportedBy);
              const assignee = p.assignedTo ? workers.find(w => w.id === p.assignedTo) : null;
              const allMedia: MediaItem[] = [
                ...(p.photos ?? []).map((src, i): MediaItem => ({ kind: 'image', src, title: `Фото ${i + 1}`, sku: p.sku, orderId: p.orderId, binId: p.binId, comment: p.description })),
                ...(p.videos ?? []).map((src, i): MediaItem => ({ kind: 'video', src, title: `Видео ${i + 1}`, sku: p.sku, orderId: p.orderId, binId: p.binId, comment: p.description })),
              ];
              const sku = p.sku ? skus.find(s => s.sku === p.sku) : undefined;
              const supplier = sku?.supplierId ? suppliers.find(s => s.id === sku.supplierId) : undefined;
              const sendItems: EvidenceSendItem[] = [
                ...(p.photos ?? []).map((src): EvidenceSendItem => ({ kind: 'image', src, source: 'warehouse', title: 'Фото проблемы' })),
                ...(p.videos ?? []).map((src): EvidenceSendItem => ({ kind: 'video', src, source: 'warehouse', title: 'Видео проблемы' })),
              ];
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

                  {(supplier || sku?.sellerName) && (
                    <div className="mb-2">
                      <OwnerCard
                        supplier={supplier}
                        sellerName={sku?.sellerName}
                        hint={supplier ? `Этот товар принадлежит поставщику ${supplier.name}. Можно отправить ему фото проблемы.` : undefined}
                      />
                    </div>
                  )}

                  {allMedia.length > 0 && (
                    <div className="flex gap-1.5 overflow-x-auto pb-1 mb-2">
                      {allMedia.map((m, i) => (
                        <button
                          key={i}
                          onClick={() => setMedia({ items: allMedia, index: i })}
                          className="w-14 h-14 rounded-lg bg-[#F3F4F6] flex items-center justify-center flex-shrink-0 active-press"
                        >
                          {m.kind === 'video' ? <Video className="w-5 h-5 text-[#1F2430]" /> : <Camera className="w-5 h-5 text-[#1F2430]" />}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    {allMedia.length > 0 && (
                      <button
                        onClick={() => setMedia({ items: allMedia, index: 0 })}
                        className="px-3 h-9 rounded-lg bg-[#1F2430] text-white text-[12px] active-press inline-flex items-center gap-1" style={{ fontWeight: 700 }}
                      ><Eye className="w-3 h-3" /> Смотреть медиа</button>
                    )}
                    {p.status !== 'resolved' && (
                      <>
                        <UploadProblemMedia problemId={p.id} kind="photo" />
                        <UploadProblemMedia problemId={p.id} kind="video" />
                        {supplier && sendItems.length > 0 && (
                          <button
                            onClick={() => setSendFor({ problemId: p.id, supplierId: supplier.id, sku: p.sku, items: sendItems })}
                            className="px-3 h-9 rounded-lg bg-[#0369A1] text-white text-[12px] active-press inline-flex items-center gap-1" style={{ fontWeight: 700 }}
                          ><Send className="w-3 h-3" /> Отправить поставщику</button>
                        )}
                        {supplier && (
                          <button
                            onClick={() => {
                              const id = store.getOrCreateSupplierThread({
                                supplierId: supplier.id, supplierName: supplier.name,
                                linkedTo: { type: 'problem', id: p.id }, sku: p.sku,
                              });
                              setChatThreadId(id);
                            }}
                            className="px-3 h-9 rounded-lg bg-[#0EA5E9] text-white text-[12px] active-press inline-flex items-center gap-1" style={{ fontWeight: 700 }}
                          ><MessageSquare className="w-3 h-3" /> Чат</button>
                        )}
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
                        >Закрыть</button>
                      </>
                    )}
                    <InternalChatButton kind="problem" refId={p.id} title={`Проблема ${p.id}`} priority={p.status === 'escalated' ? 'critical' : 'urgent'} />
                    {p.assignedTo && (
                      <button
                        onClick={() => setCallFor(p.assignedTo!)}
                        className="px-3 h-9 rounded-lg bg-[#10B981] text-white text-[12px] active-press inline-flex items-center gap-1" style={{ fontWeight: 700 }}
                      ><Phone className="w-3 h-3" /> Позвонить</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          );
        })()}
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
        open={!!resolveId && !confirmResolve}
        title="Закрыть проблему"
        onClose={() => { setResolveId(null); setResolveText(''); }}
        footer={<button onClick={startResolve} className="w-full h-11 rounded-xl bg-[#00D27A] text-white active-press" style={{ fontWeight: 800 }}>Далее</button>}
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

      <ConfirmModal
        open={confirmResolve}
        title="Закрыть проблему?"
        message={`Проблема ${resolveId ?? ''} будет помечена как «Решена», а решение зафиксируется в audit.`}
        confirmLabel="Закрыть"
        onConfirm={finishResolve}
        onCancel={() => setConfirmResolve(false)}
      />

      <MediaPreviewModal
        open={!!media}
        items={media?.items ?? []}
        initialIndex={media?.index ?? 0}
        onClose={() => setMedia(null)}
      />

      {sendFor && (
        <SendToSupplierModal
          open={!!sendFor}
          onClose={() => setSendFor(null)}
          defaultSupplierId={sendFor.supplierId}
          availableItems={sendFor.items}
          defaultLinkedTo={{ type: 'problem', id: sendFor.problemId }}
          defaultSku={sendFor.sku}
          defaultComment={`Проблема ${sendFor.problemId}: прошу пояснения по товару ${sendFor.sku ?? ''}.`}
        />
      )}

      <SupplierChatModal
        open={!!chatThreadId}
        threadId={chatThreadId}
        onClose={() => setChatThreadId(null)}
      />

      <MockCallModal open={!!callFor} workerId={callFor} onClose={() => setCallFor(null)} />
    </div>
  );
}

function FilterPill({ label, value, active, onClick, color = '#1F2430' }: { label: string; value: number; active: boolean; onClick: () => void; color?: string }) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-xl p-2 active-press"
      style={{ backgroundColor: active ? color : '#F9FAFB' }}
    >
      <div className="text-[18px]" style={{ fontWeight: 900, color: active ? 'white' : color }}>{value}</div>
      <div className="text-[10px]" style={{ fontWeight: 700, color: active ? 'rgba(255,255,255,0.85)' : '#6B7280' }}>{label}</div>
    </button>
  );
}

function UploadProblemMedia({ problemId, kind }: { problemId: string; kind: 'photo' | 'video' }) {
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const uri = URL.createObjectURL(file);
    store.uploadProblemMedia(problemId, kind, uri);
    toast.success(kind === 'photo' ? 'Фото добавлено' : 'Видео добавлено');
    e.target.value = '';
  };
  const accept = kind === 'photo' ? 'image/*' : 'video/mp4,video/webm';
  const Icon = kind === 'photo' ? Camera : Video;
  return (
    <label
      className="px-3 h-9 rounded-lg text-white text-[12px] active-press inline-flex items-center gap-1 cursor-pointer"
      style={{ backgroundColor: kind === 'photo' ? '#0EA5E9' : '#7C3AED', fontWeight: 700 }}
    >
      <Icon className="w-3 h-3" /> {kind === 'photo' ? 'Добавить фото' : 'Добавить видео'}
      <input type="file" accept={accept} onChange={onChange} className="hidden" />
    </label>
  );
}
