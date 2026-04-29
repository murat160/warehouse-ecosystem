import { useEffect, useRef, useState } from 'react';
import { Send, Camera, Video, Eye, MessageSquareReply } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from './Modal';
import { MediaPreviewModal, type MediaItem } from './MediaPreviewModal';
import { useStore, store } from '../store/useStore';
import {
  CHAT_MESSAGE_STATUS_LABELS, SUPPLIER_QUICK_TEMPLATES, RETURN_QUICK_TEMPLATES,
  type ChatAttachment, type ChatThread, type ChatMessageStatus, type ChatAuthor,
} from '../domain/types';

const STATUS_COLORS: Record<ChatMessageStatus, { bg: string; fg: string }> = {
  sent:              { bg: '#F3F4F6', fg: '#374151' },
  delivered:         { bg: '#E0F2FE', fg: '#0369A1' },
  viewed:            { bg: '#FEF3C7', fg: '#92400E' },
  response_received: { bg: '#DCFCE7', fg: '#166534' },
};

const AUTHOR_LABELS: Record<ChatAuthor, string> = {
  warehouse:        'Склад',
  supplier:         'Поставщик',
  admin:            'Admin',
  returns_operator: 'Возвраты',
  support:          'Support',
};

export interface SupplierChatModalProps {
  open: boolean;
  threadId: string | null;
  onClose: () => void;
}

export function SupplierChatModal({ open, threadId, onClose }: SupplierChatModalProps) {
  const { chatThreads } = useStore();
  const thread: ChatThread | undefined = threadId ? chatThreads.find(t => t.id === threadId) : undefined;
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [media, setMedia] = useState<{ items: MediaItem[]; index: number } | null>(null);
  const [showRespond, setShowRespond] = useState(false);
  const [respondAs, setRespondAs] = useState<ChatAuthor>('supplier');
  const [respondText, setRespondText] = useState('');
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open && endRef.current) endRef.current.scrollIntoView({ block: 'end' });
  }, [open, thread?.messages.length]);

  useEffect(() => {
    if (!open) {
      setText(''); setAttachments([]); setShowRespond(false); setRespondText('');
    }
  }, [open]);

  if (!thread) return null;

  const templates = thread.kind === 'return' ? RETURN_QUICK_TEMPLATES : SUPPLIER_QUICK_TEMPLATES;

  const onAttach = (e: React.ChangeEvent<HTMLInputElement>, kind: 'image' | 'video') => {
    const files = e.target.files;
    if (!files) return;
    const adds: ChatAttachment[] = Array.from(files).map(f => ({
      kind, src: URL.createObjectURL(f), title: f.name,
    }));
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
    const name = AUTHOR_LABELS[respondAs];
    store.receiveChatResponse(thread.id, respondAs, name, respondText);
    toast.success('Ответ записан');
    setShowRespond(false); setRespondText('');
  };

  return (
    <>
      <Modal
        open={open} onClose={onClose} size="lg"
        title={thread.kind === 'return'
          ? `Чат по возврату · ${thread.rmaId ?? ''}`
          : `Чат с поставщиком · ${thread.supplierName ?? ''}`}
        footer={
          <div className="space-y-2">
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {templates.map((t, i) => (
                <button
                  key={i}
                  onClick={() => setText(t)}
                  className="px-2 h-7 rounded-full text-[10px] whitespace-nowrap bg-[#F3F4F6] text-[#374151] active-press"
                  style={{ fontWeight: 700 }}
                >{t.length > 28 ? t.slice(0, 28) + '…' : t}</button>
              ))}
            </div>

            {attachments.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {attachments.map((a, i) => (
                  <button
                    key={i}
                    onClick={() => setAttachments(prev => prev.filter((_, k) => k !== i))}
                    className="text-[10px] px-2 py-1 rounded bg-[#E0E7FF] text-[#3730A3]" style={{ fontWeight: 700 }}
                  >
                    {a.kind === 'image' ? '📷' : '🎬'} {a.title ?? ''} ✕
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Сообщение поставщику…"
                className="flex-1 px-3 py-2 rounded-xl border-2 border-[#E5E7EB] focus:border-[#3730A3] focus:outline-none text-[14px]"
                style={{ fontWeight: 500 }}
              />
              <label className="h-10 px-3 rounded-xl bg-[#0EA5E9] text-white active-press inline-flex items-center cursor-pointer">
                <Camera className="w-4 h-4" />
                <input type="file" accept="image/*" multiple onChange={(e) => onAttach(e, 'image')} className="hidden" />
              </label>
              <label className="h-10 px-3 rounded-xl bg-[#7C3AED] text-white active-press inline-flex items-center cursor-pointer">
                <Video className="w-4 h-4" />
                <input type="file" accept="video/mp4,video/webm" multiple onChange={(e) => onAttach(e, 'video')} className="hidden" />
              </label>
              <button
                onClick={send}
                className="h-10 px-4 rounded-xl bg-[#3730A3] text-white active-press inline-flex items-center gap-1"
                style={{ fontWeight: 800 }}
              ><Send className="w-4 h-4" /> Отправить</button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowRespond(true)}
                className="flex-1 h-9 rounded-lg bg-[#F3F4F6] text-[#1F2430] text-[12px] active-press inline-flex items-center justify-center gap-1"
                style={{ fontWeight: 700 }}
              >
                <MessageSquareReply className="w-3 h-3" /> Записать ответ {thread.kind === 'return' ? 'участника' : 'поставщика'}
              </button>
            </div>
          </div>
        }
      >
        <div className="bg-[#F9FAFB] rounded-md p-2 mb-3 text-[11px]" style={{ fontWeight: 600 }}>
          {thread.supplierName && <>Поставщик: <b>{thread.supplierName}</b><br /></>}
          {thread.invoiceNumber && <>Invoice: {thread.invoiceNumber}<br /></>}
          {thread.sku && <>SKU: <span className="font-mono">{thread.sku}</span><br /></>}
          {thread.rmaId && <>Возврат: <b>{thread.rmaId}</b></>}
        </div>

        {thread.messages.length === 0 ? (
          <div className="text-[12px] text-[#6B7280] text-center py-8" style={{ fontWeight: 500 }}>
            Начните диалог — выберите шаблон ниже или напишите свой текст.
          </div>
        ) : (
          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {thread.messages.map(m => {
              const mine = m.author === 'warehouse';
              const c = STATUS_COLORS[m.status];
              const items: MediaItem[] = m.attachments.map(a => ({ kind: a.kind, src: a.src, title: a.title }));
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl p-2.5 ${mine ? 'bg-[#3730A3] text-white' : 'bg-[#F3F4F6] text-[#1F2430]'}`}
                    style={{ fontWeight: 500 }}
                  >
                    <div className="text-[10px] opacity-70 mb-1" style={{ fontWeight: 700 }}>
                      {m.authorName} · {AUTHOR_LABELS[m.author]} · {new Date(m.sentAt).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {m.text && <div className="text-[13px] whitespace-pre-wrap">{m.text}</div>}
                    {m.attachments.length > 0 && (
                      <button
                        onClick={() => setMedia({ items, index: 0 })}
                        className="mt-2 text-[11px] inline-flex items-center gap-1 px-2 h-7 rounded-md"
                        style={{
                          backgroundColor: mine ? 'rgba(255,255,255,0.15)' : '#1F2430',
                          color: mine ? 'white' : 'white',
                          fontWeight: 700,
                        }}
                      >
                        <Eye className="w-3 h-3" /> {m.attachments.length} файл(ов)
                      </button>
                    )}
                    {mine && (
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ ...c, fontWeight: 800 }}>
                          {CHAT_MESSAGE_STATUS_LABELS[m.status]}
                        </span>
                        {m.status === 'sent' && (
                          <button
                            onClick={() => store.markChatMessageStatus(thread.id, m.id, 'delivered')}
                            className="text-[9px] underline opacity-70"
                          >→ delivered</button>
                        )}
                        {m.status === 'delivered' && (
                          <button
                            onClick={() => store.markChatMessageStatus(thread.id, m.id, 'viewed')}
                            className="text-[9px] underline opacity-70"
                          >→ viewed</button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
        )}
      </Modal>

      <Modal
        open={showRespond}
        onClose={() => { setShowRespond(false); setRespondText(''); }}
        title="Записать ответ"
        footer={<button onClick={submitResponse} className="w-full h-11 rounded-xl bg-[#10B981] text-white active-press" style={{ fontWeight: 800 }}>Сохранить</button>}
      >
        {thread.kind === 'return' && (
          <>
            <div className="text-[11px] text-[#6B7280] mb-1" style={{ fontWeight: 700 }}>Кто ответил</div>
            <div className="grid grid-cols-2 gap-1.5 mb-3">
              {(['supplier','admin','returns_operator','support'] as ChatAuthor[]).map(a => (
                <button
                  key={a}
                  onClick={() => setRespondAs(a)}
                  className="h-9 rounded-lg text-[12px] active-press"
                  style={{
                    backgroundColor: respondAs === a ? '#10B981' : '#F3F4F6',
                    color: respondAs === a ? 'white' : '#1F2430',
                    fontWeight: 700,
                  }}
                >{AUTHOR_LABELS[a]}</button>
              ))}
            </div>
          </>
        )}
        <div className="text-[11px] text-[#6B7280] mb-1" style={{ fontWeight: 700 }}>Ответ</div>
        <textarea
          rows={4}
          value={respondText}
          onChange={e => setRespondText(e.target.value)}
          placeholder="Что ответили…"
          className="w-full px-3 py-2 rounded-xl border-2 border-[#E5E7EB] focus:border-[#10B981] focus:outline-none text-[14px] resize-none"
          style={{ fontWeight: 500 }}
        />
      </Modal>

      <MediaPreviewModal
        open={!!media}
        items={media?.items ?? []}
        initialIndex={media?.index ?? 0}
        onClose={() => setMedia(null)}
      />
    </>
  );
}
