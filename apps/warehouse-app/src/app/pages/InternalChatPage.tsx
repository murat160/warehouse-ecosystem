import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Send, Camera, Video, FileText, Phone, ArrowLeft,
  ExternalLink, Info, Users, MessageSquareReply, Smile, Paperclip,
  Mic, Image as ImageIcon, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useStore, store } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { MediaPreviewModal, type MediaItem } from '../components/MediaPreviewModal';
import { Modal } from '../components/Modal';
import { MockCallModal } from '../components/MockCallModal';
import { EmployeeProfileModal } from '../components/EmployeeProfileModal';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import {
  CHAT_THREAD_KIND_LABELS, CHAT_MESSAGE_STATUS_LABELS,
  type ChatThread, type ChatAttachment, type ChatMessageStatus, type ChatAuthor, type Worker,
} from '../domain/types';
import { ROLE_LABELS } from '../domain/roles';
import { useT } from '../i18n';

type EmployeeFilter = 'all' | 'online' | 'my_shift' | 'admins' | 'returns' | 'receiving' | 'picking' | 'packing';

const isUrl = (s: string) => /^(https?:|blob:|data:)/.test(s);

const ONLINE_DOT = (s: 'on_shift' | 'on_break' | 'off') =>
  s === 'on_shift' ? '#10B981' : s === 'on_break' ? '#F59E0B' : '#9CA3AF';

const MESSAGE_STATUS_COLORS: Record<ChatMessageStatus, string> = {
  sent:              '#9CA3AF',
  delivered:         '#0369A1',
  viewed:            '#92400E',
  response_received: '#166534',
};

export function InternalChatPage() {
  const t = useT();
  const { chatThreads, workers, currentWorker } = useStore();
  const [tab, setTab] = useState<'employees' | 'threads'>('employees');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<EmployeeFilter>('all');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [callFor, setCallFor] = useState<string | null>(null);
  const [profileFor, setProfileFor] = useState<string | null>(null);

  // Open employee → ensure direct thread exists, switch active to that
  const openEmployee = (workerId: string) => {
    if (!currentWorker) return;
    if (workerId === currentWorker.id) {
      setProfileFor(workerId);
      return;
    }
    const tid = store.getOrCreateInternalThread({
      kind: 'direct', counterpartyId: workerId,
      title: workers.find(w => w.id === workerId)?.name,
    });
    setActiveId(tid);
  };

  const openThread = (id: string) => {
    setActiveId(id);
    if (currentWorker) store.markThreadRead(id);
  };

  // Filter employees
  const filteredEmployees = useMemo(() => {
    return workers.filter(w => {
      if (currentWorker && w.id === currentWorker.id && filter !== 'all') return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = `${w.name} ${w.position ?? ''} ${ROLE_LABELS[w.role]} ${w.id}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      switch (filter) {
        case 'online':    return w.shiftStatus === 'on_shift';
        case 'my_shift':  return w.shiftStart === currentWorker?.shiftStart;
        case 'admins':    return w.role === 'warehouse_admin' || w.role === 'shift_manager';
        case 'returns':   return w.role === 'returns_operator';
        case 'receiving': return w.role === 'receiver';
        case 'picking':   return w.role === 'picker' || w.role === 'warehouse_worker';
        case 'packing':   return w.role === 'packer';
        default: return true;
      }
    });
  }, [workers, filter, search, currentWorker]);

  const filteredThreads = useMemo(() => {
    return chatThreads.filter(thr => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = [thr.title, thr.supplierName, thr.id, thr.orderId, thr.rmaId, thr.problemId, thr.disputeId, thr.taskId]
          .filter(Boolean).join(' ').toLowerCase();
        const inMessages = thr.messages.some(m => m.text.toLowerCase().includes(q));
        if (!hay.includes(q) && !inMessages) return false;
      }
      return true;
    }).sort((a, b) => (b.lastMessageAt ?? b.createdAt).localeCompare(a.lastMessageAt ?? a.createdAt));
  }, [chatThreads, search]);

  const active: ChatThread | undefined = activeId ? chatThreads.find(thr => thr.id === activeId) : undefined;
  const counterparty = active?.kind === 'direct' && currentWorker
    ? workers.find(w => w.id !== currentWorker.id && active.participantIds.includes(w.id))
    : undefined;

  const headerEmployee: Worker | undefined = counterparty ?? (active?.kind === 'direct' && active.participantIds[0]
    ? workers.find(w => w.id === active.participantIds[0]) : undefined);

  const onCallActive = () => {
    if (counterparty) setCallFor(counterparty.id);
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24 md:pb-8">
      <PageHeader
        title={t('chat.title')}
        subtitle={`${chatThreads.length} ${t('chat.tabThreads').toLowerCase()} · ${workers.length} ${t('chat.tabEmployees').toLowerCase()}`}
        right={<LanguageSwitcher />}
      />

      <div className="px-3 md:px-5 -mt-5">
        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-3">

          {/* LEFT PANEL: list */}
          <div className={`bg-white rounded-2xl shadow-sm overflow-hidden ${activeId ? 'hidden lg:flex' : 'flex'} flex-col`} style={{ minHeight: 0 }}>
            <div className="p-3 border-b border-[#F3F4F6]">
              <div className="flex gap-1 mb-2">
                <TabBtn active={tab === 'employees'} onClick={() => setTab('employees')} icon={<Users className="w-3.5 h-3.5" />}>
                  {t('chat.tabEmployees')}
                </TabBtn>
                <TabBtn active={tab === 'threads'} onClick={() => setTab('threads')} icon={<MessageSquareReply className="w-3.5 h-3.5" />}>
                  {t('chat.tabThreads')}
                </TabBtn>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={tab === 'employees' ? t('chat.searchEmployees') : t('chat.searchThreads')}
                  className="w-full pl-8 pr-2 py-2 rounded-lg border-2 border-[#E5E7EB] focus:border-[#7C3AED] focus:outline-none text-[13px]"
                  style={{ fontWeight: 500 }}
                />
              </div>
              {tab === 'employees' && (
                <div className="flex gap-1 overflow-x-auto pb-1 mt-2">
                  {(['all','online','my_shift','admins','returns','receiving','picking','packing'] as EmployeeFilter[]).map(f => (
                    <FilterPill key={f} active={filter === f} onClick={() => setFilter(f)}>
                      {t(`chat.filter${capitalize(f === 'my_shift' ? 'MyShift' : f)}`)}
                    </FilterPill>
                  ))}
                </div>
              )}
            </div>

            <ul className="flex-1 overflow-y-auto max-h-[60vh] divide-y divide-[#F3F4F6]">
              {tab === 'employees' ? (
                filteredEmployees.length === 0 ? (
                  <EmptyItem>{t('common.empty')}</EmptyItem>
                ) : filteredEmployees.map(w => {
                  // Найти существующий direct thread с этим сотрудником, чтобы взять unread/last message
                  const directThr = chatThreads.find(thr => thr.kind === 'direct'
                    && thr.participantIds.includes(w.id)
                    && (currentWorker ? thr.participantIds.includes(currentWorker.id) : true));
                  const last = directThr?.messages[directThr.messages.length - 1];
                  const unread = directThr && currentWorker && !directThr.readBy.includes(currentWorker.id);
                  return (
                    <li key={w.id}>
                      <button
                        onClick={() => openEmployee(w.id)}
                        className="w-full text-left p-3 active-press"
                        style={{ backgroundColor: directThr?.id === activeId ? '#F3E8FF' : 'transparent' }}
                      >
                        <div className="flex items-start gap-3">
                          <Avatar w={w} size={44} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[13px] text-[#1F2430] truncate" style={{ fontWeight: unread ? 900 : 700 }}>
                                {w.name} {currentWorker && w.id === currentWorker.id && <span className="text-[10px] text-[#9CA3AF]" style={{ fontWeight: 600 }}>· {t('common.you')}</span>}
                              </span>
                              {unread && <span className="w-2 h-2 rounded-full bg-[#7C3AED] flex-shrink-0" />}
                            </div>
                            <div className="text-[11px] text-[#6B7280] truncate" style={{ fontWeight: 500 }}>
                              {w.position ?? ROLE_LABELS[w.role]}
                            </div>
                            {last && (
                              <div className="text-[11px] text-[#9CA3AF] truncate mt-0.5" style={{ fontWeight: 500 }}>
                                {last.author === 'warehouse' && currentWorker?.id === last.threadId ? `${t('common.you')}: ` : ''}
                                {last.text || (last.attachments[0]?.kind === 'image' ? '🖼' : last.attachments[0]?.kind === 'video' ? '🎬' : '📄')}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })
              ) : (
                filteredThreads.length === 0 ? (
                  <EmptyItem>{t('common.empty')}</EmptyItem>
                ) : filteredThreads.map(thr => {
                  const last = thr.messages[thr.messages.length - 1];
                  const unread = currentWorker && !thr.readBy.includes(currentWorker.id);
                  return (
                    <li key={thr.id}>
                      <button
                        onClick={() => openThread(thr.id)}
                        className="w-full text-left p-3 active-press"
                        style={{ backgroundColor: thr.id === activeId ? '#F3E8FF' : 'transparent' }}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[13px] text-[#1F2430] truncate" style={{ fontWeight: unread ? 900 : 700 }}>
                            {threadTitle(thr)}
                          </span>
                          {unread && <span className="w-2 h-2 rounded-full bg-[#7C3AED] flex-shrink-0" />}
                        </div>
                        <div className="text-[10px] text-[#9CA3AF] mb-1" style={{ fontWeight: 700 }}>
                          {CHAT_THREAD_KIND_LABELS[thr.kind]}
                        </div>
                        <div className="text-[11px] text-[#6B7280] truncate" style={{ fontWeight: 500 }}>
                          {last ? `${last.authorName}: ${last.text || '📎'}` : t('common.empty')}
                        </div>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>

          {/* RIGHT PANEL: messages */}
          <div className={`bg-white rounded-2xl shadow-sm flex flex-col ${activeId ? 'flex' : 'hidden lg:flex'}`} style={{ minHeight: '60vh' }}>
            {active ? (
              <ThreadView
                key={active.id}
                thread={active}
                onBack={() => setActiveId(null)}
                onCall={onCallActive}
                onProfile={() => headerEmployee && setProfileFor(headerEmployee.id)}
                headerEmployee={headerEmployee}
              />
            ) : (
              <div className="m-auto p-10 text-center">
                <EmptyState emoji="💬" title={t('chat.empty')} />
              </div>
            )}
          </div>
        </div>
      </div>

      <MockCallModal open={!!callFor} workerId={callFor} onClose={() => setCallFor(null)} />
      <EmployeeProfileModal
        open={!!profileFor}
        workerId={profileFor}
        onClose={() => setProfileFor(null)}
        onMessage={(wid) => { setProfileFor(null); openEmployee(wid); }}
        onCall={(wid) => { setProfileFor(null); setCallFor(wid); }}
      />
    </div>
  );
}

function ThreadView({ thread, onBack, onCall, onProfile, headerEmployee }: {
  thread: ChatThread; onBack?: () => void; onCall: () => void; onProfile: () => void;
  headerEmployee?: Worker;
}) {
  const t = useT();
  const nav = useNavigate();
  const { workers } = useStore();
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [media, setMedia] = useState<{ items: MediaItem[]; index: number } | null>(null);
  const [showRespond, setShowRespond] = useState(false);
  const [respondAs, setRespondAs] = useState<ChatAuthor>('admin');
  const [respondText, setRespondText] = useState('');
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [thread.messages.length]);

  const dot = headerEmployee ? ONLINE_DOT(headerEmployee.shiftStatus) : '#9CA3AF';

  const objectLinks: { label: string; to: string }[] = [];
  if (thread.orderId)   objectLinks.push({ label: `#${thread.orderId}`,   to: `/picking/${thread.orderId}` });
  if (thread.taskId)    objectLinks.push({ label: thread.taskId,           to: '/tasks' });
  if (thread.problemId) objectLinks.push({ label: thread.problemId,        to: '/problems' });
  if (thread.disputeId) objectLinks.push({ label: thread.disputeId,        to: '/supplier-disputes' });
  if (thread.rmaId)     objectLinks.push({ label: thread.rmaId,            to: '/returns' });
  if (thread.asnId)     objectLinks.push({ label: thread.asnId,            to: '/inbound' });

  const onAttach = (e: React.ChangeEvent<HTMLInputElement>, kind: 'image' | 'video' | 'document') => {
    const files = e.target.files;
    if (!files) return;
    setAttachments(prev => [...prev, ...Array.from(files).map(f => ({ kind, src: URL.createObjectURL(f), title: f.name }))]);
    e.target.value = '';
  };

  const send = () => {
    const r = store.sendChatMessage(thread.id, text, attachments);
    if (!r.ok) { toast.error(r.reason ?? 'Error'); return; }
    setText(''); setAttachments([]);
  };

  const submitResponse = () => {
    if (!respondText.trim()) { toast.error('Empty'); return; }
    store.receiveChatResponse(thread.id, respondAs, respondAs === 'supplier' ? 'Supplier' : respondAs, respondText);
    setShowRespond(false); setRespondText('');
  };

  return (
    <>
      {/* Header */}
      <header className="px-3 py-3 border-b border-[#F3F4F6] flex items-center gap-2 sticky top-0 bg-white z-10">
        {onBack && (
          <button onClick={onBack} className="lg:hidden w-9 h-9 rounded-full bg-[#F3F4F6] flex items-center justify-center active-press" aria-label={t('action.back')}>
            <ArrowLeft className="w-4 h-4 text-[#1F2430]" />
          </button>
        )}
        <button onClick={onProfile} className="flex items-center gap-2 min-w-0 flex-1 text-left active-press">
          {headerEmployee
            ? <Avatar w={headerEmployee} size={40} />
            : <div className="w-10 h-10 rounded-full bg-[#F3E8FF] flex items-center justify-center text-[18px]">💬</div>}
          <div className="min-w-0">
            <div className="text-[14px] text-[#1F2430] truncate" style={{ fontWeight: 800 }}>
              {headerEmployee?.name ?? threadTitle(thread)}
            </div>
            <div className="text-[11px] truncate flex items-center gap-1" style={{ fontWeight: 600 }}>
              {headerEmployee && (
                <>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dot }} />
                  <span className="text-[#6B7280]">{headerEmployee.position ?? ROLE_LABELS[headerEmployee.role]}</span>
                </>
              )}
              {!headerEmployee && (
                <span className="text-[#6B7280]">{CHAT_THREAD_KIND_LABELS[thread.kind]}</span>
              )}
            </div>
          </div>
        </button>
        {headerEmployee && (
          <button onClick={onCall} className="w-10 h-10 rounded-full bg-[#10B981] text-white flex items-center justify-center active-press" aria-label={t('action.call')}>
            <Phone className="w-4 h-4" />
          </button>
        )}
        <button onClick={onProfile} className="w-10 h-10 rounded-full bg-[#F3F4F6] flex items-center justify-center active-press" aria-label={t('chat.openProfile')}>
          <Info className="w-4 h-4 text-[#1F2430]" />
        </button>
      </header>

      {objectLinks.length > 0 && (
        <div className="px-3 pt-2 flex flex-wrap gap-1">
          {objectLinks.map((link, i) => (
            <button
              key={i}
              onClick={() => nav(link.to)}
              className="text-[10px] px-2 py-0.5 rounded-full bg-[#E0F2FE] text-[#0369A1] inline-flex items-center gap-1 active-press"
              style={{ fontWeight: 800 }}
            >
              <ExternalLink className="w-3 h-3" /> {link.label}
            </button>
          ))}
        </div>
      )}

      {/* Messages — bubbles, WhatsApp-like */}
      <div
        className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[55vh] lg:max-h-[60vh]"
        style={{ background: 'linear-gradient(180deg, #F5F6F8 0%, #ECEEF2 100%)' }}
      >
        {thread.messages.length === 0 ? (
          <div className="text-[12px] text-[#6B7280] text-center py-8" style={{ fontWeight: 500 }}>
            —
          </div>
        ) : thread.messages.map(m => {
          const mine = m.author === 'warehouse';
          const author = workers.find(w => w.name === m.authorName);
          const items: MediaItem[] = m.attachments.filter(a => a.kind !== 'document')
            .map(a => ({ kind: a.kind as 'image' | 'video', src: a.src, title: a.title }));
          const docs = m.attachments.filter(a => a.kind === 'document');
          return (
            <div key={m.id} className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
              {!mine && author && <Avatar w={author} size={28} />}
              <div
                className={`max-w-[80%] rounded-2xl p-2.5 ${mine ? 'bg-[#7C3AED] text-white rounded-br-md' : 'bg-white text-[#1F2430] rounded-bl-md shadow-sm'}`}
                style={{ fontWeight: 500 }}
              >
                {!mine && (
                  <div className="text-[10px] mb-0.5" style={{ color: '#7C3AED', fontWeight: 800 }}>
                    {m.authorName}
                  </div>
                )}
                {m.text && <div className="text-[13px] whitespace-pre-wrap">{m.text}</div>}
                {items.length > 0 && (
                  <button
                    onClick={() => setMedia({ items, index: 0 })}
                    className="mt-2 text-[11px] inline-flex items-center gap-1 px-2 h-7 rounded-md"
                    style={{
                      backgroundColor: mine ? 'rgba(255,255,255,0.18)' : '#1F2430',
                      color: 'white', fontWeight: 700,
                    }}
                  >🖼 {items.length}</button>
                )}
                {docs.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {docs.map((d, i) => (
                      <a
                        key={i} href={d.src} download={d.title ?? `doc-${i}`}
                        className="text-[11px] inline-flex items-center gap-1 px-2 h-6 rounded-md"
                        style={{ backgroundColor: mine ? 'rgba(255,255,255,0.18)' : '#1F2430', color: 'white', fontWeight: 700 }}
                      >
                        <FileText className="w-3 h-3" /> {d.title ?? `doc-${i}`}
                      </a>
                    ))}
                  </div>
                )}
                <div className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${mine ? 'text-white/80' : 'text-[#9CA3AF]'}`} style={{ fontWeight: 600 }}>
                  <span>{new Date(m.sentAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                  {mine && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-current opacity-50" />
                      <span style={{ color: mine ? 'white' : MESSAGE_STATUS_COLORS[m.status] }}>
                        {CHAT_MESSAGE_STATUS_LABELS[m.status][0].toUpperCase()}
                      </span>
                      {m.status === 'sent' && (
                        <button onClick={() => store.markChatMessageStatus(thread.id, m.id, 'delivered')} className="underline opacity-70">→D</button>
                      )}
                      {m.status === 'delivered' && (
                        <button onClick={() => store.markChatMessageStatus(thread.id, m.id, 'viewed')} className="underline opacity-70">→V</button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Composer — WhatsApp-style */}
      <Composer
        text={text}
        setText={setText}
        attachments={attachments}
        setAttachments={setAttachments}
        onSend={send}
        onAttach={onAttach}
        onRecordVoice={() => toast(t('chat.voiceMockToast'))}
      />

      <Modal open={showRespond} onClose={() => { setShowRespond(false); setRespondText(''); }} title={t('action.confirm')}
        footer={<button onClick={submitResponse} className="w-full h-11 rounded-xl bg-[#10B981] text-white active-press" style={{ fontWeight: 800 }}>{t('action.save')}</button>}>
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
          className="w-full px-3 py-2 rounded-xl border-2 border-[#E5E7EB] focus:border-[#10B981] focus:outline-none text-[14px] resize-none"
          style={{ fontWeight: 500 }}
        />
      </Modal>

      <MediaPreviewModal open={!!media} items={media?.items ?? []} initialIndex={media?.index ?? 0} onClose={() => setMedia(null)} />
    </>
  );
}

function Avatar({ w, size = 36 }: { w: Worker; size?: number }) {
  const dot = ONLINE_DOT(w.shiftStatus);
  return (
    <div className="relative flex-shrink-0">
      <div
        className="rounded-full bg-[#E0F2FE] flex items-center justify-center overflow-hidden"
        style={{ width: size, height: size, fontSize: Math.round(size * 0.5) }}
      >
        {w.avatar
          ? (isUrl(w.avatar)
              ? <img src={w.avatar} alt={w.name} className="w-full h-full object-cover" />
              : <span>{w.avatar}</span>)
          : <span className="text-[#0369A1]" style={{ fontWeight: 900 }}>{w.name.charAt(0)}</span>}
      </div>
      <span
        className="absolute bottom-0 right-0 rounded-full border-2 border-white"
        style={{ width: Math.max(8, size * 0.25), height: Math.max(8, size * 0.25), backgroundColor: dot }}
      />
    </div>
  );
}

function threadTitle(thr: ChatThread) {
  if (thr.title) return thr.title;
  if (thr.kind === 'supplier') return `Supplier · ${thr.supplierName ?? ''}`;
  if (thr.kind === 'return')   return `Return · ${thr.rmaId ?? ''}`;
  if (thr.kind === 'task')     return `Task · ${thr.taskId ?? ''}`;
  if (thr.kind === 'order')    return `Order · ${thr.orderId ?? ''}`;
  if (thr.kind === 'problem')  return `Problem · ${thr.problemId ?? ''}`;
  if (thr.kind === 'dispute')  return `Dispute · ${thr.disputeId ?? ''}`;
  return CHAT_THREAD_KIND_LABELS[thr.kind];
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function TabBtn({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 h-9 rounded-lg text-[12px] active-press inline-flex items-center justify-center gap-1.5"
      style={{
        backgroundColor: active ? '#1F2430' : '#F3F4F6',
        color: active ? 'white' : '#1F2430',
        fontWeight: 800,
      }}
    >
      {icon}
      {children}
    </button>
  );
}

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="px-2.5 h-7 rounded-full text-[11px] whitespace-nowrap active-press"
      style={{
        backgroundColor: active ? '#7C3AED' : 'white',
        color: active ? 'white' : '#1F2430',
        border: '1px solid #E5E7EB',
        fontWeight: 700,
      }}
    >{children}</button>
  );
}

function EmptyItem({ children }: { children: React.ReactNode }) {
  return <li className="p-6 text-center text-[12px] text-[#6B7280]" style={{ fontWeight: 500 }}>{children}</li>;
}

function Composer({
  text, setText, attachments, setAttachments, onSend, onAttach, onRecordVoice,
}: {
  text: string;
  setText: (v: string) => void;
  attachments: ChatAttachment[];
  setAttachments: React.Dispatch<React.SetStateAction<ChatAttachment[]>>;
  onSend: () => void;
  onAttach: (e: React.ChangeEvent<HTMLInputElement>, kind: 'image' | 'video' | 'document') => void;
  onRecordVoice: () => void;
}) {
  const t = useT();
  const [attachOpen, setAttachOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const photoRef = useRef<HTMLInputElement | null>(null);
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLInputElement | null>(null);
  const docRef = useRef<HTMLInputElement | null>(null);

  const hasContent = text.trim().length > 0 || attachments.length > 0;

  const onEmoji = (emoji: string) => {
    setText(`${text}${emoji}`);
    setEmojiOpen(false);
  };

  return (
    <div className="border-t border-[#F3F4F6] bg-white">
      {attachments.length > 0 && (
        <div className="flex gap-2 overflow-x-auto p-3 pb-0">
          {attachments.map((a, i) => (
            <div key={i} className="relative flex-shrink-0">
              <div
                className="w-16 h-16 rounded-xl bg-[#F3F4F6] flex items-center justify-center text-[22px]"
                title={a.title}
              >
                {a.kind === 'image' ? '📷' : a.kind === 'video' ? '🎬' : '📄'}
              </div>
              <button
                onClick={() => setAttachments(prev => prev.filter((_, k) => k !== i))}
                aria-label={t('chat.removeAttach')}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#EF4444] text-white flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 p-2 md:p-3">
        <div className="flex items-center gap-1 pb-1">
          <CircleBtn onClick={() => setEmojiOpen(o => !o)} aria-label={t('chat.attachEmoji')}>
            <Smile className="w-5 h-5 text-[#6B7280]" />
          </CircleBtn>
          <CircleBtn onClick={() => setAttachOpen(true)} aria-label={t('chat.attachTitle')}>
            <Paperclip className="w-5 h-5 text-[#6B7280]" />
          </CircleBtn>
          <CircleBtn onClick={() => cameraRef.current?.click()} aria-label={t('chat.attachCamera')}>
            <Camera className="w-5 h-5 text-[#6B7280]" />
          </CircleBtn>
        </div>

        <div className="flex-1 min-w-0 relative">
          {emojiOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-lg border border-[#E5E7EB] p-2 grid grid-cols-8 gap-1 max-h-32 overflow-y-auto">
              {['👍','✅','❌','📦','🔥','⚠️','📸','🎬','📄','🙂','👌','🚚','🆗','❤️','😊','💪','🙏','🤝','💬','📍','🔍','🟢','🟡','🔴'].map(em => (
                <button
                  key={em}
                  onClick={() => onEmoji(em)}
                  className="text-[20px] hover:bg-[#F3F4F6] rounded p-1 active-press"
                >{em}</button>
              ))}
            </div>
          )}
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
            placeholder={t('chat.placeholder')}
            rows={1}
            className="w-full resize-none px-4 py-2.5 rounded-3xl border-2 border-[#E5E7EB] focus:border-[#7C3AED] focus:outline-none text-[14px] max-h-32"
            style={{ fontWeight: 500 }}
          />
        </div>

        {hasContent ? (
          <button
            onClick={onSend}
            aria-label={t('chat.sendMessage')}
            className="w-11 h-11 rounded-full bg-[#7C3AED] text-white flex items-center justify-center active-press flex-shrink-0"
            style={{ boxShadow: '0 4px 12px rgba(124,58,237,0.35)' }}
          >
            <Send className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={onRecordVoice}
            aria-label={t('chat.recordVoice')}
            className="w-11 h-11 rounded-full bg-[#10B981] text-white flex items-center justify-center active-press flex-shrink-0"
            style={{ boxShadow: '0 4px 12px rgba(16,185,129,0.35)' }}
          >
            <Mic className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* hidden file inputs */}
      <input ref={photoRef}  type="file" accept="image/*"           multiple onChange={(e) => onAttach(e, 'image')} className="hidden" />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={(e) => onAttach(e, 'image')} className="hidden" />
      <input ref={videoRef}  type="file" accept="video/mp4,video/webm" multiple onChange={(e) => onAttach(e, 'video')} className="hidden" />
      <input ref={docRef}    type="file" accept=".pdf,.doc,.docx,.xlsx,.csv,.txt" multiple onChange={(e) => onAttach(e, 'document')} className="hidden" />

      {/* Bottom-sheet attach */}
      <Modal open={attachOpen} onClose={() => setAttachOpen(false)} title={t('chat.attachTitle')} size="sm">
        <div className="grid grid-cols-2 gap-3 py-2">
          <AttachBtn
            color="#0EA5E9"
            icon={<ImageIcon className="w-6 h-6 text-white" />}
            label={t('chat.attachPhoto')}
            onClick={() => { setAttachOpen(false); photoRef.current?.click(); }}
          />
          <AttachBtn
            color="#7C3AED"
            icon={<Camera className="w-6 h-6 text-white" />}
            label={t('chat.attachCamera')}
            onClick={() => { setAttachOpen(false); cameraRef.current?.click(); }}
          />
          <AttachBtn
            color="#EF4444"
            icon={<Video className="w-6 h-6 text-white" />}
            label={t('chat.attachVideo')}
            onClick={() => { setAttachOpen(false); videoRef.current?.click(); }}
          />
          <AttachBtn
            color="#374151"
            icon={<FileText className="w-6 h-6 text-white" />}
            label={t('chat.attachDoc')}
            onClick={() => { setAttachOpen(false); docRef.current?.click(); }}
          />
        </div>
      </Modal>
    </div>
  );
}

function CircleBtn({ children, onClick, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      onClick={onClick}
      className="w-10 h-10 rounded-full hover:bg-[#F3F4F6] flex items-center justify-center active-press flex-shrink-0"
    >
      {children}
    </button>
  );
}

function AttachBtn({ color, icon, label, onClick }: { color: string; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl p-4 flex flex-col items-center justify-center gap-2 active-press"
      style={{ backgroundColor: '#F9FAFB' }}
    >
      <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: color }}>
        {icon}
      </div>
      <span className="text-[12px] text-[#1F2430]" style={{ fontWeight: 700 }}>{label}</span>
    </button>
  );
}
