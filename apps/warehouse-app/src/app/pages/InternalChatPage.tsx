import { useMemo, useState } from 'react';
import { Search, Send, Camera, Video, FileText, MessageSquareReply, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { useStore, store } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { MediaPreviewModal, type MediaItem } from '../components/MediaPreviewModal';
import { Modal } from '../components/Modal';
import { MockCallModal } from '../components/MockCallModal';
import {
  CHAT_THREAD_KIND_LABELS, CHAT_THREAD_STATUS_LABELS, CHAT_THREAD_PRIORITY_LABELS,
  CHAT_MESSAGE_STATUS_LABELS,
  type ChatThread, type ChatThreadKind, type ChatThreadStatus,
  type ChatAttachment, type ChatMessageStatus, type ChatThreadPriority, type ChatAuthor,
} from '../domain/types';
import { ROLE_LABELS } from '../domain/roles';

const TYPE_FILTERS: ChatThreadKind[] = ['supplier', 'return', 'task', 'order', 'problem', 'dispute', 'shift', 'admin', 'direct'];
const STATUS_FILTERS: ChatThreadStatus[] = ['open', 'waiting_response', 'resolved', 'closed'];

const STATUS_COLORS: Record<ChatThreadStatus, { bg: string; fg: string }> = {
  open:             { bg: '#DCFCE7', fg: '#166534' },
  waiting_response: { bg: '#FEF3C7', fg: '#92400E' },
  resolved:         { bg: '#E0F2FE', fg: '#0369A1' },
  closed:           { bg: '#F3F4F6', fg: '#374151' },
};

const PRIORITY_COLORS: Record<ChatThreadPriority, { bg: string; fg: string }> = {
  normal:   { bg: '#F3F4F6', fg: '#374151' },
  urgent:   { bg: '#FED7AA', fg: '#9A3412' },
  critical: { bg: '#FECACA', fg: '#7F1D1D' },
};

const MESSAGE_STATUS_COLORS: Record<ChatMessageStatus, { bg: string; fg: string }> = {
  sent:              { bg: '#F3F4F6', fg: '#374151' },
  delivered:         { bg: '#E0F2FE', fg: '#0369A1' },
  viewed:            { bg: '#FEF3C7', fg: '#92400E' },
  response_received: { bg: '#DCFCE7', fg: '#166534' },
};

export function InternalChatPage() {
  const { chatThreads, currentWorker, workers } = useStore();
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<ChatThreadKind | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<ChatThreadStatus | 'ALL'>('ALL');
  const [onlyMine, setOnlyMine] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [callFor, setCallFor] = useState<string | null>(null);
  const [showAssign, setShowAssign] = useState(false);
  const [showPriority, setShowPriority] = useState(false);

  const filtered = useMemo(() => {
    return chatThreads.filter(t => {
      if (onlyMine && currentWorker && !t.participantIds.includes(currentWorker.id) && t.assignedTo !== currentWorker.id) return false;
      if (kindFilter !== 'ALL' && t.kind !== kindFilter) return false;
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = [t.title, t.supplierName, t.id, t.orderId, t.rmaId, t.problemId, t.disputeId, t.taskId].filter(Boolean).join(' ').toLowerCase();
        const inMessages = t.messages.some(m => m.text.toLowerCase().includes(q));
        if (!hay.includes(q) && !inMessages) return false;
      }
      return true;
    }).sort((a, b) => (b.lastMessageAt ?? b.createdAt).localeCompare(a.lastMessageAt ?? a.createdAt));
  }, [chatThreads, kindFilter, statusFilter, onlyMine, search, currentWorker]);

  const active: ChatThread | undefined = activeId ? chatThreads.find(t => t.id === activeId) : undefined;

  const openThread = (t: ChatThread) => {
    setActiveId(t.id);
    if (currentWorker && !t.readBy.includes(currentWorker.id)) store.markThreadRead(t.id);
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24 md:pb-8">
      <PageHeader title="Внутренний чат" subtitle={`Тредов: ${chatThreads.length}`} />

      <div className="px-5 -mt-5">
        <div className="bg-white rounded-2xl p-3 shadow-sm mb-3">
          <div className="flex items-center gap-2 mb-2">
            <Search className="w-4 h-4 text-[#9CA3AF]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск по тредам и сообщениям"
              className="flex-1 px-2 py-2 rounded-lg border-2 border-[#E5E7EB] focus:border-[#7C3AED] focus:outline-none text-[13px]"
              style={{ fontWeight: 500 }}
            />
            <label className="text-[12px] text-[#1F2430] inline-flex items-center gap-1.5" style={{ fontWeight: 700 }}>
              <input type="checkbox" checked={onlyMine} onChange={e => setOnlyMine(e.target.checked)} className="accent-[#7C3AED]" />
              Только мои
            </label>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 mb-1.5">
            <Pill active={kindFilter === 'ALL'} onClick={() => setKindFilter('ALL')}>Все типы</Pill>
            {TYPE_FILTERS.map(k => (
              <Pill key={k} active={kindFilter === k} onClick={() => setKindFilter(k)}>
                {CHAT_THREAD_KIND_LABELS[k]}
              </Pill>
            ))}
          </div>
          <div className="flex gap-1.5 overflow-x-auto">
            <Pill active={statusFilter === 'ALL'} onClick={() => setStatusFilter('ALL')}>Все статусы</Pill>
            {STATUS_FILTERS.map(s => (
              <Pill key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)} color={STATUS_COLORS[s]}>
                {CHAT_THREAD_STATUS_LABELS[s]}
              </Pill>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-3">
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {filtered.length === 0 ? (
              <EmptyState emoji="💬" title="Нет тредов" subtitle="Откройте чат из любой карточки заказа/задачи/спора." />
            ) : (
              <ul className="divide-y divide-[#F3F4F6] max-h-[60vh] overflow-y-auto">
                {filtered.map(t => {
                  const last = t.messages[t.messages.length - 1];
                  const sc = STATUS_COLORS[t.status];
                  const pc = PRIORITY_COLORS[t.priority];
                  const unread = currentWorker && !t.readBy.includes(currentWorker.id);
                  return (
                    <li key={t.id}>
                      <button
                        onClick={() => openThread(t)}
                        className="w-full text-left p-3 active-press"
                        style={{ backgroundColor: t.id === activeId ? '#F3E8FF' : 'transparent' }}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[13px] text-[#1F2430] truncate" style={{ fontWeight: unread ? 900 : 700 }}>
                            {threadTitle(t)}
                          </span>
                          {unread && <span className="w-2 h-2 rounded-full bg-[#EF4444] flex-shrink-0" />}
                        </div>
                        <div className="flex items-center gap-1 mb-1 flex-wrap">
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#F3F4F6] text-[#374151]" style={{ fontWeight: 700 }}>
                            {CHAT_THREAD_KIND_LABELS[t.kind]}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ ...sc, fontWeight: 800 }}>
                            {CHAT_THREAD_STATUS_LABELS[t.status]}
                          </span>
                          {t.priority !== 'normal' && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ ...pc, fontWeight: 800 }}>
                              {CHAT_THREAD_PRIORITY_LABELS[t.priority]}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#6B7280] truncate" style={{ fontWeight: 500 }}>
                          {last ? `${last.authorName}: ${last.text}` : 'Сообщений нет'}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm">
            {active ? (
              <ThreadPanel
                key={active.id}
                thread={active}
                onCallParticipant={(workerId) => setCallFor(workerId)}
                onAssign={() => setShowAssign(true)}
                onChangePriority={() => setShowPriority(true)}
              />
            ) : (
              <div className="p-10">
                <EmptyState emoji="💬" title="Выберите тред" subtitle="Слева список — нажмите, чтобы прочитать историю." />
              </div>
            )}
          </div>
        </div>
      </div>

      <MockCallModal open={!!callFor} workerId={callFor} onClose={() => setCallFor(null)} />

      {active && (
        <>
          <Modal open={showAssign} onClose={() => setShowAssign(false)} title="Назначить ответственного">
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {workers.map(w => (
                <button
                  key={w.id}
                  onClick={() => { store.assignChatThread(active.id, w.id); toast.success(`Назначен: ${w.name}`); setShowAssign(false); }}
                  className="w-full text-left p-2 rounded-xl text-[13px]"
                  style={{
                    backgroundColor: active.assignedTo === w.id ? '#E0E7FF' : '#F9FAFB',
                    border: active.assignedTo === w.id ? '2px solid #3730A3' : '2px solid transparent',
                    fontWeight: 700,
                  }}
                >
                  {w.name} · <span className="text-[#6B7280]" style={{ fontWeight: 500 }}>{ROLE_LABELS[w.role]}</span>
                </button>
              ))}
            </div>
          </Modal>

          <Modal open={showPriority} onClose={() => setShowPriority(false)} title="Приоритет">
            <div className="space-y-1">
              {(Object.keys(CHAT_THREAD_PRIORITY_LABELS) as ChatThreadPriority[]).map(p => (
                <button
                  key={p}
                  onClick={() => { store.changeThreadPriority(active.id, p); toast(`Приоритет: ${CHAT_THREAD_PRIORITY_LABELS[p]}`); setShowPriority(false); }}
                  className="w-full text-left p-2 rounded-xl text-[13px]"
                  style={{
                    backgroundColor: active.priority === p ? PRIORITY_COLORS[p].bg : '#F9FAFB',
                    color: PRIORITY_COLORS[p].fg,
                    fontWeight: 700,
                  }}
                >{CHAT_THREAD_PRIORITY_LABELS[p]}</button>
              ))}
            </div>
          </Modal>
        </>
      )}
    </div>
  );
}

function threadTitle(t: ChatThread) {
  if (t.title) return t.title;
  if (t.kind === 'supplier') return `С поставщиком · ${t.supplierName ?? ''}`;
  if (t.kind === 'return')   return `Возврат · ${t.rmaId ?? ''}`;
  if (t.kind === 'task')     return `Задача · ${t.taskId ?? ''}`;
  if (t.kind === 'order')    return `Заказ · ${t.orderId ?? ''}`;
  if (t.kind === 'problem')  return `Проблема · ${t.problemId ?? ''}`;
  if (t.kind === 'dispute')  return `Спор · ${t.disputeId ?? ''}`;
  return CHAT_THREAD_KIND_LABELS[t.kind];
}

function ThreadPanel({ thread, onCallParticipant, onAssign, onChangePriority }: {
  thread: ChatThread;
  onCallParticipant: (workerId: string) => void;
  onAssign: () => void;
  onChangePriority: () => void;
}) {
  const { workers } = useStore();
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [media, setMedia] = useState<{ items: MediaItem[]; index: number } | null>(null);
  const [showRespond, setShowRespond] = useState(false);
  const [respondAs, setRespondAs] = useState<ChatAuthor>('admin');
  const [respondText, setRespondText] = useState('');

  const onAttach = (e: React.ChangeEvent<HTMLInputElement>, kind: 'image' | 'video' | 'document') => {
    const files = e.target.files;
    if (!files) return;
    const adds: ChatAttachment[] = Array.from(files).map(f => ({ kind, src: URL.createObjectURL(f), title: f.name }));
    setAttachments(prev => [...prev, ...adds]);
    e.target.value = '';
  };

  const send = () => {
    const r = store.sendChatMessage(thread.id, text, attachments);
    if (!r.ok) { toast.error(r.reason ?? 'Ошибка'); return; }
    toast.success('Отправлено');
    setText(''); setAttachments([]);
  };

  const submitResponse = () => {
    if (!respondText.trim()) { toast.error('Введите ответ'); return; }
    store.receiveChatResponse(thread.id, respondAs, respondAs === 'admin' ? 'Admin' : respondAs, respondText);
    toast.success('Ответ записан');
    setShowRespond(false); setRespondText('');
  };

  const sc = STATUS_COLORS[thread.status];
  const pc = PRIORITY_COLORS[thread.priority];
  const otherWorkers = thread.participantIds
    .map(id => workers.find(w => w.id === id)).filter((w): w is NonNullable<typeof w> => !!w);

  return (
    <>
      <div className="p-4 border-b border-[#F3F4F6]">
        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
          <div className="text-[15px] text-[#1F2430]" style={{ fontWeight: 800 }}>
            {threadTitle(thread)}
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ ...sc, fontWeight: 800 }}>
              {CHAT_THREAD_STATUS_LABELS[thread.status]}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ ...pc, fontWeight: 800 }}>
              {CHAT_THREAD_PRIORITY_LABELS[thread.priority]}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-wrap text-[10px] text-[#6B7280]" style={{ fontWeight: 600 }}>
          {otherWorkers.slice(0, 4).map(w => (
            <button
              key={w.id}
              onClick={() => onCallParticipant(w.id)}
              className="px-2 py-0.5 rounded-full bg-[#F3F4F6] hover:bg-[#E5E7EB] inline-flex items-center gap-1"
              title="Позвонить"
            >
              <Phone className="w-3 h-3" />
              {w.name}
            </button>
          ))}
          {otherWorkers.length > 4 && <span>+{otherWorkers.length - 4}</span>}
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          <button onClick={() => store.changeThreadStatus(thread.id, 'resolved')} className="px-2 h-7 rounded bg-[#10B981] text-white text-[10px] active-press" style={{ fontWeight: 700 }}>Mark resolved</button>
          <button onClick={() => store.changeThreadStatus(thread.id, 'open')}     className="px-2 h-7 rounded bg-[#0EA5E9] text-white text-[10px] active-press" style={{ fontWeight: 700 }}>Reopen</button>
          <button onClick={onChangePriority}                                       className="px-2 h-7 rounded bg-[#F59E0B] text-white text-[10px] active-press" style={{ fontWeight: 700 }}>Приоритет</button>
          <button onClick={onAssign}                                               className="px-2 h-7 rounded bg-[#7C3AED] text-white text-[10px] active-press" style={{ fontWeight: 700 }}>Назначить</button>
          <button onClick={() => setShowRespond(true)}                             className="px-2 h-7 rounded bg-[#374151] text-white text-[10px] active-press inline-flex items-center gap-1" style={{ fontWeight: 700 }}>
            <MessageSquareReply className="w-3 h-3" /> Записать ответ
          </button>
        </div>
      </div>

      <div className="p-4 space-y-2 max-h-[40vh] overflow-y-auto">
        {thread.messages.length === 0 ? (
          <div className="text-[12px] text-[#6B7280] text-center py-6" style={{ fontWeight: 500 }}>
            Сообщений нет — напишите первое.
          </div>
        ) : thread.messages.map(m => {
          const mine = m.author === 'warehouse';
          const items: MediaItem[] = m.attachments
            .filter(a => a.kind !== 'document')
            .map(a => ({ kind: a.kind as 'image' | 'video', src: a.src, title: a.title }));
          const docs = m.attachments.filter(a => a.kind === 'document');
          const ms = MESSAGE_STATUS_COLORS[m.status];
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl p-2.5 ${mine ? 'bg-[#7C3AED] text-white' : 'bg-[#F3F4F6] text-[#1F2430]'}`}>
                <div className="text-[10px] opacity-70 mb-1" style={{ fontWeight: 700 }}>
                  {m.authorName} · {new Date(m.sentAt).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
                </div>
                {m.text && <div className="text-[13px] whitespace-pre-wrap" style={{ fontWeight: 500 }}>{m.text}</div>}
                {items.length > 0 && (
                  <button
                    onClick={() => setMedia({ items, index: 0 })}
                    className="mt-2 text-[11px] inline-flex items-center gap-1 px-2 h-7 rounded-md"
                    style={{ backgroundColor: mine ? 'rgba(255,255,255,0.15)' : '#1F2430', color: 'white', fontWeight: 700 }}
                  >🖼 {items.length}</button>
                )}
                {docs.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {docs.map((d, i) => (
                      <a key={i} href={d.src} download={d.title ?? `doc-${i}`} className="text-[11px] inline-flex items-center gap-1 px-2 h-6 rounded-md" style={{ backgroundColor: mine ? 'rgba(255,255,255,0.15)' : '#1F2430', color: 'white', fontWeight: 700 }}>
                        <FileText className="w-3 h-3" /> {d.title ?? `doc-${i}`}
                      </a>
                    ))}
                  </div>
                )}
                {mine && (
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ ...ms, fontWeight: 800 }}>
                      {CHAT_MESSAGE_STATUS_LABELS[m.status]}
                    </span>
                    {m.status === 'sent' && (
                      <button onClick={() => store.markChatMessageStatus(thread.id, m.id, 'delivered')} className="text-[9px] underline opacity-70">→ delivered</button>
                    )}
                    {m.status === 'delivered' && (
                      <button onClick={() => store.markChatMessageStatus(thread.id, m.id, 'viewed')} className="text-[9px] underline opacity-70">→ viewed</button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-3 border-t border-[#F3F4F6]">
        {attachments.length > 0 && (
          <div className="flex gap-1 flex-wrap mb-2">
            {attachments.map((a, i) => (
              <button key={i} onClick={() => setAttachments(prev => prev.filter((_, k) => k !== i))}
                className="text-[10px] px-2 py-1 rounded bg-[#E0E7FF] text-[#3730A3]" style={{ fontWeight: 700 }}>
                {a.kind === 'image' ? '📷' : a.kind === 'video' ? '🎬' : '📄'} {a.title} ✕
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Сообщение…"
            className="flex-1 px-3 py-2 rounded-xl border-2 border-[#E5E7EB] focus:border-[#7C3AED] focus:outline-none text-[14px]"
            style={{ fontWeight: 500 }}
          />
          <label className="h-10 px-3 rounded-xl bg-[#0EA5E9] text-white inline-flex items-center cursor-pointer">
            <Camera className="w-4 h-4" />
            <input type="file" accept="image/*" multiple onChange={(e) => onAttach(e, 'image')} className="hidden" />
          </label>
          <label className="h-10 px-3 rounded-xl bg-[#7C3AED] text-white inline-flex items-center cursor-pointer">
            <Video className="w-4 h-4" />
            <input type="file" accept="video/mp4,video/webm" multiple onChange={(e) => onAttach(e, 'video')} className="hidden" />
          </label>
          <label className="h-10 px-3 rounded-xl bg-[#374151] text-white inline-flex items-center cursor-pointer">
            <FileText className="w-4 h-4" />
            <input type="file" accept=".pdf,.doc,.docx,.xlsx,.csv,.txt" multiple onChange={(e) => onAttach(e, 'document')} className="hidden" />
          </label>
          <button onClick={send} className="h-10 px-4 rounded-xl bg-[#7C3AED] text-white active-press inline-flex items-center gap-1" style={{ fontWeight: 800 }}>
            <Send className="w-4 h-4" /> Отправить
          </button>
        </div>
      </div>

      <Modal open={showRespond} onClose={() => { setShowRespond(false); setRespondText(''); }} title="Записать ответ"
        footer={<button onClick={submitResponse} className="w-full h-11 rounded-xl bg-[#10B981] text-white active-press" style={{ fontWeight: 800 }}>Сохранить</button>}>
        <div className="text-[11px] text-[#6B7280] mb-1" style={{ fontWeight: 700 }}>От кого ответ</div>
        <div className="grid grid-cols-2 gap-1.5 mb-3">
          {(['supplier','admin','returns_operator','support'] as ChatAuthor[]).map(a => (
            <button key={a} onClick={() => setRespondAs(a)}
              className="h-9 rounded-lg text-[12px] active-press"
              style={{ backgroundColor: respondAs === a ? '#10B981' : '#F3F4F6', color: respondAs === a ? 'white' : '#1F2430', fontWeight: 700 }}
            >{a}</button>
          ))}
        </div>
        <textarea
          rows={4} value={respondText} onChange={e => setRespondText(e.target.value)}
          placeholder="Что ответили…"
          className="w-full px-3 py-2 rounded-xl border-2 border-[#E5E7EB] focus:border-[#10B981] focus:outline-none text-[14px] resize-none"
          style={{ fontWeight: 500 }}
        />
      </Modal>

      <MediaPreviewModal open={!!media} items={media?.items ?? []} initialIndex={media?.index ?? 0} onClose={() => setMedia(null)} />
    </>
  );
}

function Pill({ active, onClick, children, color }: { active: boolean; onClick: () => void; children: React.ReactNode; color?: { bg: string; fg: string } }) {
  return (
    <button
      onClick={onClick}
      className="px-3 h-8 rounded-full text-[11px] whitespace-nowrap active-press"
      style={{
        backgroundColor: active ? (color?.bg ?? '#1F2430') : 'white',
        color: active ? (color?.fg ?? 'white') : '#1F2430',
        border: '1px solid #E5E7EB',
        fontWeight: 700,
      }}
    >{children}</button>
  );
}
