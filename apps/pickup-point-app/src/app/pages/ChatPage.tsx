import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Send, Phone, Paperclip, MessageSquarePlus, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useStore, store } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';
import { ChatKindBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import type { ChatThreadKind } from '../domain/types';
import { CHAT_THREAD_LABELS } from '../domain/types';

export function ChatPage() {
  const { chats, currentEmployee } = useStore();
  const [params, setParams] = useSearchParams();
  const initial = params.get('thread');
  const [activeId, setActiveId] = useState<string | null>(initial ?? chats[0]?.id ?? null);
  const [text, setText] = useState('');
  const [callOpen, setCallOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newChat, setNewChat] = useState<{ kind: ChatThreadKind; title: string }>({ kind: 'support', title: '' });
  const bottomRef = useRef<HTMLDivElement>(null);

  const active = chats.find(c => c.id === activeId) ?? null;

  useEffect(() => {
    if (active) {
      store.markChatRead(active.id);
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [active?.id, active?.messages.length]);

  useEffect(() => {
    if (activeId) params.set('thread', activeId); else params.delete('thread');
    setParams(params, { replace: true });
  }, [activeId]);

  const send = () => {
    if (!active || !text.trim()) return;
    store.sendChatMessage(active.id, text.trim());
    setText('');
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      <PageHeader
        title="Чат"
        subtitle={`${chats.length} тредов`}
        right={
          <button onClick={() => setCreateOpen(true)} className="px-3 h-9 rounded-lg bg-white text-[#1F2430] text-[12px] active-press flex items-center gap-1" style={{ fontWeight: 800 }}>
            <MessageSquarePlus className="w-3 h-3" /> Новый чат
          </button>
        }
      />

      <div className="px-5 -mt-5 grid md:grid-cols-[320px_1fr] gap-3 h-[calc(100vh-180px)] md:h-[calc(100vh-120px)]">
        <div className="bg-white rounded-2xl p-2 overflow-y-auto">
          <div className="space-y-1">
            {chats.map(c => (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={`w-full text-left rounded-xl p-3 active-press ${activeId === c.id ? 'bg-[#E0F2FE]' : 'hover:bg-[#F9FAFB]'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[12px] text-[#1F2430] truncate" style={{ fontWeight: 800 }}>{c.title}</div>
                  {c.unreadCount > 0 && (
                    <span className="text-[10px] bg-[#EF4444] text-white rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center" style={{ fontWeight: 800 }}>
                      {c.unreadCount}
                    </span>
                  )}
                </div>
                <div className="mt-1"><ChatKindBadge kind={c.kind} /></div>
                <div className="text-[10px] text-[#6B7280] mt-1 truncate">
                  {c.messages[c.messages.length - 1]?.text ?? 'Нет сообщений'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {active ? (
          <div className="bg-white rounded-2xl flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-[#F3F4F6] flex items-center justify-between">
              <div>
                <div className="text-[14px] text-[#1F2430]" style={{ fontWeight: 800 }}>{active.title}</div>
                <div className="text-[10px] text-[#6B7280]">{active.participantIds.length} участников</div>
              </div>
              <div className="flex items-center gap-2">
                <ChatKindBadge kind={active.kind} />
                <button onClick={() => setCallOpen(true)} className="w-8 h-8 rounded-full bg-[#16A34A15] text-[#16A34A] flex items-center justify-center active-press" title="Позвонить">
                  <Phone className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#F9FAFB]">
              {active.messages.length === 0 && <div className="text-center text-[12px] text-[#6B7280] mt-8">Нет сообщений. Начните разговор</div>}
              {active.messages.map(m => {
                const isMe = m.authorId === currentEmployee?.id;
                return (
                  <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${isMe ? 'bg-[#0EA5E9] text-white' : 'bg-white text-[#1F2430] border border-[#F3F4F6]'}`}>
                      {!isMe && <div className="text-[10px] mb-0.5 opacity-70" style={{ fontWeight: 800 }}>{m.authorName}</div>}
                      <div className="text-[13px]" style={{ fontWeight: 500 }}>{m.text}</div>
                      <div className={`text-[9px] mt-1 text-right ${isMe ? 'text-white/70' : 'text-[#9CA3AF]'}`}>
                        {fmt(m.createdAt)} · {m.status === 'viewed' ? '✓✓' : m.status === 'delivered' ? '✓✓' : '✓'}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <div className="px-3 py-2 border-t border-[#F3F4F6] flex items-end gap-2">
              <div className="flex gap-1">
                <button
                  onClick={() => { store.sendChatMessage(active.id, '[Файл прикреплён]', ['file.pdf']); toast.success('Файл прикреплён'); }}
                  className="w-9 h-9 rounded-full text-[#6B7280] hover:bg-[#F3F4F6] flex items-center justify-center active-press"
                  title="Прикрепить файл"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { store.sendChatMessage(active.id, '[Фото]', ['photo.jpg']); toast.success('Фото прикреплено'); }}
                  className="w-9 h-9 rounded-full text-[#6B7280] hover:bg-[#F3F4F6] flex items-center justify-center active-press"
                  title="Прикрепить фото"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>
              </div>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                rows={1}
                placeholder="Сообщение"
                className="flex-1 border border-[#E5E7EB] rounded-2xl px-3 py-2 text-[13px] resize-none max-h-[120px]"
              />
              <button
                onClick={send}
                disabled={!text.trim()}
                className="w-9 h-9 rounded-full bg-[#0EA5E9] text-white flex items-center justify-center active-press disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            <div className="px-3 pb-2 flex flex-wrap gap-1">
              {['Принято', 'Спасибо', 'Сделаю', 'Жду'].map(t => (
                <button
                  key={t}
                  onClick={() => { store.sendChatMessage(active.id, t); }}
                  className="rounded-full px-2 h-7 text-[10px] bg-[#F3F4F6] text-[#374151] active-press"
                  style={{ fontWeight: 700 }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState title="Выберите чат" subtitle="Или создайте новый" />
        )}
      </div>

      <Modal
        open={callOpen}
        onClose={() => setCallOpen(false)}
        title="Звонок"
        footer={
          <button
            onClick={() => { setCallOpen(false); toast('Звонок завершён'); }}
            className="px-4 h-9 rounded-lg bg-[#EF4444] text-white text-[12px] active-press" style={{ fontWeight: 800 }}
          >Завершить</button>
        }
      >
        <div className="text-center py-6">
          <div className="w-16 h-16 rounded-full bg-[#16A34A20] flex items-center justify-center mx-auto mb-3">
            <Phone className="w-7 h-7 text-[#16A34A]" />
          </div>
          <div className="text-[14px] text-[#1F2430]" style={{ fontWeight: 800 }}>Идёт вызов…</div>
          <div className="text-[12px] text-[#6B7280] mt-1">{active?.title}</div>
        </div>
      </Modal>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Новый чат"
        footer={
          <>
            <button onClick={() => setCreateOpen(false)} className="px-4 h-9 rounded-lg text-[12px] text-[#6B7280] active-press" style={{ fontWeight: 700 }}>Отмена</button>
            <button
              onClick={() => {
                if (!newChat.title.trim()) { toast.error('Введите название'); return; }
                const c = store.createChat(newChat.kind, newChat.title.trim());
                setActiveId(c.id);
                setNewChat({ kind: 'support', title: '' });
                setCreateOpen(false);
                toast.success('Чат создан');
              }}
              className="px-4 h-9 rounded-lg bg-[#0EA5E9] text-white text-[12px] active-press" style={{ fontWeight: 800 }}
            >Создать</button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Тип">
            <select value={newChat.kind} onChange={e => setNewChat({ ...newChat, kind: e.target.value as ChatThreadKind })}
              className="w-full border border-[#E5E7EB] rounded-xl h-10 px-2 text-[13px]">
              {(Object.entries(CHAT_THREAD_LABELS) as [ChatThreadKind, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </Field>
          <Field label="Название">
            <input value={newChat.title} onChange={e => setNewChat({ ...newChat, title: e.target.value })}
              className="w-full border border-[#E5E7EB] rounded-xl h-10 px-3 text-[13px]" placeholder="Например: По заказу ORD-..." />
          </Field>
        </div>
      </Modal>
    </div>
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
  return new Date(iso).toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}
