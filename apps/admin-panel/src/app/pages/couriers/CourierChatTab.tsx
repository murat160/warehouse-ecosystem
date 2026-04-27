import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Mail, X, CheckCircle2, XCircle, Clock, MessageCircle,
  Paperclip, Download, Shield, Plus, ChevronRight, Filter,
  Phone, AlertTriangle,
} from 'lucide-react';
import type { Courier } from '../../data/couriers-mock';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChatStatus = 'open' | 'waiting' | 'closed';
export type SenderType = 'admin' | 'courier' | 'system';
export type ChatActionType =
  | 'CHAT_CREATED' | 'MESSAGE_SENT' | 'CHAT_CLOSED'
  | 'EMAIL_SENT' | 'ATTACHMENT_SENT' | 'CHAT_REOPENED';

export interface ChatAttachment {
  name: string;
  size: string;
  type: 'pdf' | 'jpg' | 'png' | 'docx' | 'zip';
}

export interface ChatMessage {
  message_id: string;
  chat_id: string;
  sender_type: SenderType;
  sender_id: string;
  message_text: string;
  attachments: ChatAttachment[];
  created_at: string;
}

export interface ChatRecord {
  chat_id: string;
  courier_id: string;
  created_by: string;
  created_at: string;
  status: ChatStatus;
  closed_at?: string;
  closed_by?: string;
  messages: ChatMessage[];
}

export interface ChatAuditEntry {
  action_id: string;
  user_id: string;
  action_type: ChatActionType;
  timestamp: string;
  details: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nowTs() {
  return new Date().toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function nowTime() {
  return new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function buildChats(courier: Courier): ChatRecord[] {
  const initial: ChatMessage[] = courier.chatHistory.map(m => ({
    message_id: m.id,
    chat_id: `chat-${courier.id}-1`,
    sender_type: m.from as SenderType,
    sender_id: m.from === 'admin' ? 'admin@pvz-platform.ru' : courier.id,
    message_text: m.text,
    attachments: [],
    created_at: m.time,
  }));

  return [
    {
      chat_id: `chat-${courier.id}-1`,
      courier_id: courier.id,
      created_by: 'admin@pvz-platform.ru',
      created_at: '05.03.2026 09:00',
      status: 'open',
      messages: initial,
    },
    {
      chat_id: `chat-${courier.id}-2`,
      courier_id: courier.id,
      created_by: 'admin@pvz-platform.ru',
      created_at: '01.03.2026 14:00',
      status: 'closed',
      closed_at: '01.03.2026 15:30',
      closed_by: 'Смирнов Антон',
      messages: [
        { message_id: 'old-1', chat_id: `chat-${courier.id}-2`, sender_type: 'admin', sender_id: 'admin@pvz-platform.ru', message_text: 'Добрый день! Пожалуйста, предоставьте обновлённую медицинскую справку.', attachments: [], created_at: '14:05' },
        { message_id: 'old-2', chat_id: `chat-${courier.id}-2`, sender_type: 'courier', sender_id: courier.id, message_text: 'Хорошо, загружу сегодня вечером.', attachments: [], created_at: '14:22' },
        { message_id: 'old-3', chat_id: `chat-${courier.id}-2`, sender_type: 'system', sender_id: 'system', message_text: 'Чат закрыт администратором Смирнов Антон. 01.03.2026 15:30', attachments: [], created_at: '15:30' },
      ],
    },
    {
      chat_id: `chat-${courier.id}-3`,
      courier_id: courier.id,
      created_by: 'system',
      created_at: '20.02.2026 08:00',
      status: 'closed',
      closed_at: '20.02.2026 09:15',
      closed_by: 'Козлова Елена',
      messages: [
        { message_id: 'sys-1', chat_id: `chat-${courier.id}-3`, sender_type: 'system', sender_id: 'system', message_text: 'Автоматическое уведомление: плановая проверка транспорта назначена на 21.02.2026.', attachments: [], created_at: '08:00' },
        { message_id: 'sys-2', chat_id: `chat-${courier.id}-3`, sender_type: 'courier', sender_id: courier.id, message_text: 'Принято, буду на точке в 10:00.', attachments: [], created_at: '08:32' },
        { message_id: 'sys-3', chat_id: `chat-${courier.id}-3`, sender_type: 'admin', sender_id: 'elena@pvz-platform.ru', message_text: 'Отлично, ждём вас. Возьмите с собой страховой полис.', attachments: [{ name: 'Инструкция_проверки.pdf', size: '0.8 МБ', type: 'pdf' }], created_at: '08:45' },
        { message_id: 'sys-4', chat_id: `chat-${courier.id}-3`, sender_type: 'system', sender_id: 'system', message_text: 'Чат закрыт администратором Козлова Елена.', attachments: [], created_at: '09:15' },
      ],
    },
  ];
}

function buildChatAudit(courierId: string): ChatAuditEntry[] {
  return [
    { action_id: 'ca1', user_id: 'admin@pvz-platform.ru', action_type: 'CHAT_CREATED', timestamp: '05.03.2026 09:00', details: `Создан чат с курьером ${courierId}` },
    { action_id: 'ca2', user_id: 'admin@pvz-platform.ru', action_type: 'MESSAGE_SENT', timestamp: '05.03.2026 09:14', details: 'Отправлено сообщение: «Добрый день! Проверьте, пожалуйста, накладную МН-2024031.»' },
    { action_id: 'ca3', user_id: 'admin@pvz-platform.ru', action_type: 'EMAIL_SENT', timestamp: '03.03.2026 10:00', details: `Email-уведомление отправлено курьеру ${courierId}` },
    { action_id: 'ca4', user_id: 'Смирнов Антон', action_type: 'CHAT_CLOSED', timestamp: '01.03.2026 15:30', details: `Чат chat-${courierId}-2 закрыт. Причина: Вопрос решён.` },
    { action_id: 'ca5', user_id: 'Козлова Елена', action_type: 'CHAT_CLOSED', timestamp: '20.02.2026 09:15', details: `Чат chat-${courierId}-3 закрыт. Причина: Автоматическое уведомление обработано.` },
  ];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const STATUS_CFG: Record<ChatStatus, { label: string; badge: string; dot: string }> = {
  open:    { label: 'Открыт',   badge: 'bg-green-100 text-green-700',  dot: 'bg-green-500' },
  waiting: { label: 'Ожидание', badge: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  closed:  { label: 'Закрыт',   badge: 'bg-gray-100 text-gray-600',    dot: 'bg-gray-400' },
};

const SENDER_LABELS: Record<SenderType, string> = {
  admin: 'Администратор',
  courier: 'Курьер',
  system: 'Система',
};

const ACTION_LABELS: Record<ChatActionType, string> = {
  CHAT_CREATED:    '💬 Чат создан',
  MESSAGE_SENT:    '✉️ Сообщение',
  CHAT_CLOSED:     '🔒 Чат закрыт',
  EMAIL_SENT:      '📧 Email отправлен',
  ATTACHMENT_SENT: '📎 Файл отправлен',
  CHAT_REOPENED:   '🔓 Чат открыт',
};

type FilterType = 'all' | 'open' | 'waiting' | 'closed';

// ─── Main Component ───────────────────────────────────────────────────────────

export function CourierChatTab({ courier }: { courier: Courier }) {
  const [chats, setChats] = useState<ChatRecord[]>(() => buildChats(courier));
  const [audit, setAudit] = useState<ChatAuditEntry[]>(() => buildChatAudit(courier.id));
  const [activeChatId, setActiveChatId] = useState<string>(`chat-${courier.id}-1`);
  const [filter, setFilter] = useState<FilterType>('all');
  const [input, setInput] = useState('');
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [closeReason, setCloseReason] = useState('');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [showExport, setShowExport] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showAudit, setShowAudit] = useState(false);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const activeChat = chats.find(c => c.chat_id === activeChatId) ?? chats[0];

  const filteredChats = chats.filter(c => {
    if (filter === 'all') return true;
    return c.status === filter;
  });

  const addAudit = useCallback((type: ChatActionType, details: string) => {
    setAudit(prev => [{
      action_id: `ca-${Date.now()}`,
      user_id: 'admin@pvz-platform.ru',
      action_type: type,
      timestamp: nowTs(),
      details,
    }, ...prev]);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => {
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, [activeChatId, chats]);

  // ── Handlers ──

  const sendMessage = (text?: string, attachments: ChatAttachment[] = []) => {
    const msgText = text ?? input.trim();
    if (!msgText && attachments.length === 0) return;
    const newMsg: ChatMessage = {
      message_id: `msg-${Date.now()}`,
      chat_id: activeChat.chat_id,
      sender_type: 'admin',
      sender_id: 'admin@pvz-platform.ru',
      message_text: msgText,
      attachments,
      created_at: nowTime(),
    };
    setChats(prev => prev.map(c =>
      c.chat_id === activeChat.chat_id
        ? { ...c, messages: [...c.messages, newMsg], status: c.status === 'waiting' ? 'open' : c.status }
        : c
    ));
    addAudit('MESSAGE_SENT', `Сообщение в чат ${activeChat.chat_id}: «${msgText.substring(0, 60)}${msgText.length > 60 ? '…' : ''}»`);
    if (attachments.length > 0) {
      addAudit('ATTACHMENT_SENT', `Отправлен файл: ${attachments[0].name} в чат ${activeChat.chat_id}`);
    }
    setInput('');
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  const handleAttach = () => {
    // Simulate attaching a file
    const fakeAttachment: ChatAttachment = {
      name: ['Документ.pdf', 'Фото.jpg', 'Инструкция.docx', 'Отчёт.pdf'][Math.floor(Math.random() * 4)],
      size: `${(Math.random() * 2 + 0.2).toFixed(1)} МБ`,
      type: 'pdf',
    };
    setAttachmentPreview(fakeAttachment.name);
    setTimeout(() => {
      sendMessage(input.trim() || 'Файл во вложении', [fakeAttachment]);
      setAttachmentPreview(null);
    }, 500);
  };

  const handleCloseChat = () => {
    const ts = nowTs();
    const sysMsg: ChatMessage = {
      message_id: `sys-close-${Date.now()}`,
      chat_id: activeChat.chat_id,
      sender_type: 'system',
      sender_id: 'system',
      message_text: `Чат закрыт администратором. ${closeReason ? `Причина: ${closeReason}` : ''} ${ts}`,
      attachments: [],
      created_at: nowTime(),
    };
    setChats(prev => prev.map(c =>
      c.chat_id === activeChat.chat_id
        ? { ...c, status: 'closed', closed_at: ts, closed_by: 'Администратор', messages: [...c.messages, sysMsg] }
        : c
    ));
    addAudit('CHAT_CLOSED', `Чат ${activeChat.chat_id} закрыт. Причина: ${closeReason || 'не указана'}. chat_status=closed`);
    showToast('🔒 Чат закрыт');
    setShowCloseConfirm(false);
    setCloseReason('');
  };

  const handleNewChat = () => {
    const newId = `chat-${courier.id}-${Date.now()}`;
    const sysMsg: ChatMessage = {
      message_id: `sys-open-${Date.now()}`,
      chat_id: newId,
      sender_type: 'system',
      sender_id: 'system',
      message_text: `Чат открыт администратором. ${nowTs()}`,
      attachments: [],
      created_at: nowTime(),
    };
    const newChat: ChatRecord = {
      chat_id: newId,
      courier_id: courier.id,
      created_by: 'admin@pvz-platform.ru',
      created_at: nowTs(),
      status: 'open',
      messages: [sysMsg],
    };
    setChats(prev => [newChat, ...prev]);
    setActiveChatId(newId);
    addAudit('CHAT_CREATED', `Создан новый чат ${newId} с курьером ${courier.id}`);
    showToast('💬 Новый чат создан');
  };

  const handleSendEmail = () => {
    addAudit('EMAIL_SENT', `Email отправлен курьеру ${courier.email}. Тема: «${emailSubject}»`);
    showToast(`📧 Email отправлен на ${courier.email}`);
    setShowEmailModal(false);
    setEmailSubject('');
    setEmailBody('');
  };

  const handleExport = (format: 'pdf' | 'csv' | 'txt') => {
    const msgs = activeChat.messages;
    let content = '';
    if (format === 'txt' || format === 'csv') {
      if (format === 'csv') {
        content = 'message_id,sender_type,sender_id,message_text,created_at\n';
        content += msgs.map(m =>
          `"${m.message_id}","${m.sender_type}","${m.sender_id}","${m.message_text.replace(/"/g, '""')}","${m.created_at}"`
        ).join('\n');
      } else {
        content = `=== Экспорт чата ${activeChat.chat_id} ===\n`;
        content += `Курьер: ${courier.name} (${courier.id})\n`;
        content += `Дата создания: ${activeChat.created_at}\n`;
        content += `Статус: ${STATUS_CFG[activeChat.status].label}\n\n`;
        content += msgs.map(m =>
          `[${m.created_at}] ${SENDER_LABELS[m.sender_type]}: ${m.message_text}${m.attachments.length > 0 ? ` [Вложение: ${m.attachments[0].name}]` : ''}`
        ).join('\n');
      }
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-${activeChat.chat_id}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    }
    showToast(`📥 Чат экспортирован в ${format.toUpperCase()}`);
    setShowExport(false);
  };

  if (!activeChat) return null;
  const isActive = activeChat.status !== 'closed';
  const sc = STATUS_CFG[activeChat.status];

  return (
    <div className="space-y-4">

      {/* Top controls */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Filter */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
          {(['all', 'open', 'waiting', 'closed'] as FilterType[]).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 font-medium transition-colors ${filter === f ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              {f === 'all' ? 'Все' : f === 'open' ? 'Открытые' : f === 'waiting' ? 'Ожидание' : 'Закрытые'}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleNewChat}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />Новый чат
          </button>
        </div>
      </div>

      <div className="flex gap-4 h-[540px]">

        {/* Chat list sidebar */}
        <div className="w-56 shrink-0 flex flex-col gap-1.5 overflow-y-auto pr-0.5">
          {filteredChats.map(c => {
            const cs = STATUS_CFG[c.status];
            const lastMsg = c.messages[c.messages.length - 1];
            return (
              <button
                key={c.chat_id}
                onClick={() => setActiveChatId(c.chat_id)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${activeChatId === c.chat_id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${cs.dot}`} />
                  <span className="text-[10px] font-semibold text-gray-700 truncate">{c.chat_id.replace(`chat-${courier.id}-`, 'Чат #')}</span>
                  <span className={`ml-auto text-[9px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 ${cs.badge}`}>{cs.label}</span>
                </div>
                <p className="text-[10px] text-gray-500 truncate">{lastMsg?.message_text ?? '—'}</p>
                <p className="text-[9px] text-gray-400 mt-0.5">{c.created_at}</p>
              </button>
            );
          })}
        </div>

        {/* Active chat area */}
        <div className="flex-1 min-w-0 flex flex-col rounded-xl border border-gray-200 overflow-hidden">

          {/* Chat header */}
          <div className="px-4 py-3 border-b bg-gray-50 flex items-center gap-2 flex-wrap shrink-0">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${sc.dot}`} />
              <p className="text-xs font-semibold text-gray-800">{activeChat.chat_id.replace(`chat-${courier.id}-`, 'Чат #')}</p>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${sc.badge}`}>{sc.label}</span>
            </div>
            {activeChat.closed_at && (
              <span className="text-[10px] text-gray-400">Закрыт: {activeChat.closed_at} · {activeChat.closed_by}</span>
            )}
            <div className="ml-auto flex items-center gap-1.5">
              <button
                onClick={() => setShowExport(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-[10px] font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <Download className="w-3 h-3" />Экспорт
              </button>
              <button
                onClick={() => { setShowEmailModal(true); setEmailSubject(`Переписка с курьером ${courier.name}`); setEmailBody(`Уважаемый(ая) ${courier.name.split(' ')[0]},\n\nВо вложении направляем историю переписки.\n\nС уважением,\nАдминистрация PVZ Platform`); }}
                className="flex items-center gap-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-[10px] font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <Mail className="w-3 h-3" />Email
              </button>
              {isActive && (
                <button
                  onClick={() => setShowCloseConfirm(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 border border-red-200 text-red-600 rounded-lg text-[10px] font-medium hover:bg-red-50 transition-colors"
                >
                  <XCircle className="w-3 h-3" />Закрыть чат
                </button>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {activeChat.messages.map(msg => {
              if (msg.sender_type === 'system') {
                return (
                  <div key={msg.message_id} className="flex justify-center">
                    <div className="bg-gray-200 text-gray-600 text-[10px] px-3 py-1.5 rounded-full max-w-[80%] text-center">
                      🔔 {msg.message_text}
                    </div>
                  </div>
                );
              }
              const isAdmin = msg.sender_type === 'admin';
              return (
                <div key={msg.message_id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                  {!isAdmin && (
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 mr-2 bg-gradient-to-br ${courier.courier_type === 'fast_delivery' ? 'from-orange-400 to-yellow-500' : 'from-teal-500 to-blue-600'}`}>
                      {courier.avatar}
                    </div>
                  )}
                  <div className="flex flex-col gap-1 max-w-[70%]">
                    <div className={`px-3.5 py-2.5 rounded-2xl text-sm shadow-sm ${
                      isAdmin
                        ? 'bg-blue-600 text-white rounded-tr-sm'
                        : 'bg-white text-gray-900 rounded-tl-sm border border-gray-200'
                    }`}>
                      <p className="leading-relaxed">{msg.message_text}</p>
                      {msg.attachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {msg.attachments.map((att, i) => (
                            <div key={i} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium ${isAdmin ? 'bg-blue-500/40 text-blue-100' : 'bg-gray-100 text-gray-600'}`}>
                              <Paperclip className="w-2.5 h-2.5 shrink-0" />
                              {att.name} · {att.size}
                            </div>
                          ))}
                        </div>
                      )}
                      <p className={`text-[10px] mt-1 ${isAdmin ? 'text-blue-200' : 'text-gray-400'}`}>
                        {msg.created_at} · {msg.sender_id}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>

          {/* Input */}
          {isActive ? (
            <div className="px-3 py-3 border-t bg-white flex gap-2 items-end shrink-0">
              {attachmentPreview && (
                <div className="absolute bottom-16 left-3 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1 text-[10px] text-blue-700 flex items-center gap-1">
                  <Paperclip className="w-2.5 h-2.5" />{attachmentPreview}
                </div>
              )}
              <button
                onClick={handleAttach}
                title="Прикрепить файл"
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors shrink-0"
              >
                <Paperclip className="w-4 h-4 text-gray-400" />
              </button>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Введите сообщение... (Enter — отправить, Shift+Enter — перенос строки)"
                rows={2}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim()}
                className="px-3 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 transition-colors flex items-center gap-1.5 text-sm font-medium shrink-0 self-end"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="px-4 py-3 border-t bg-gray-50 flex items-center gap-2 shrink-0">
              <AlertTriangle className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="text-xs text-gray-400">Чат закрыт. Создайте новый чат для переписки.</span>
              <button onClick={handleNewChat} className="ml-auto text-xs text-blue-600 font-medium hover:text-blue-800 flex items-center gap-1">
                <Plus className="w-3 h-3" />Новый чат
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Audit log */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowAudit(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-xs font-semibold text-gray-600"
        >
          <span className="flex items-center gap-2"><Shield className="w-3.5 h-3.5" />Аудит-лог чата ({audit.length})</span>
          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showAudit ? 'rotate-90' : ''}`} />
        </button>
        {showAudit && (
          <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
            {audit.map(a => (
              <div key={a.action_id} className="flex items-start gap-3 px-4 py-3">
                <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 text-xs">
                  {a.action_type === 'EMAIL_SENT' ? '📧' : a.action_type === 'CHAT_CLOSED' ? '🔒' : a.action_type === 'CHAT_CREATED' ? '💬' : a.action_type === 'ATTACHMENT_SENT' ? '📎' : '✉️'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-700">{ACTION_LABELS[a.action_type]}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{a.details}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{a.timestamp} · {a.user_id}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── MODALS ── */}

      {/* Close chat confirm */}
      {showCloseConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowCloseConfirm(false)}>
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b bg-red-50 flex items-center gap-3">
              <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center"><XCircle className="w-4 h-4 text-red-600" /></div>
              <h3 className="font-bold text-gray-900 text-sm">Закрыть чат?</h3>
              <button onClick={() => setShowCloseConfirm(false)} className="ml-auto p-1.5 hover:bg-gray-200 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-gray-600">
                Действие установит <code className="bg-gray-100 px-1 rounded text-xs">chat_status = closed</code> и сохранит <code className="bg-gray-100 px-1 rounded text-xs">closed_at</code> / <code className="bg-gray-100 px-1 rounded text-xs">closed_by</code>.
              </p>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Причина закрытия (необязательно)</label>
                <input
                  value={closeReason}
                  onChange={e => setCloseReason(e.target.value)}
                  placeholder="Например: Вопрос решён"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 text-sm"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowCloseConfirm(false)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Отмена</button>
                <button onClick={handleCloseChat} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors">Закрыть чат</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowEmailModal(false)}>
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b bg-green-50 flex items-center gap-3">
              <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center"><Mail className="w-4 h-4 text-green-600" /></div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Отправить email курьеру</h3>
                <p className="text-[10px] text-gray-500">{courier.email}</p>
              </div>
              <button onClick={() => setShowEmailModal(false)} className="ml-auto p-1.5 hover:bg-gray-200 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
                <Paperclip className="w-3.5 h-3.5 shrink-0" />
                <span className="font-medium">Вложение: история чата {activeChat.chat_id} ({activeChat.messages.length} сообщений)</span>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Кому</label>
                <input value={courier.email} readOnly className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Тема</label>
                <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Текст письма</label>
                <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} rows={4} className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none" />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowEmailModal(false)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Отмена</button>
                <button onClick={handleSendEmail} className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors">
                  <Send className="w-3.5 h-3.5" />Отправить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export modal */}
      {showExport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowExport(false)}>
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b bg-gray-50 flex items-center gap-3">
              <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center"><Download className="w-4 h-4 text-gray-600" /></div>
              <h3 className="font-bold text-gray-900 text-sm">Экспорт переписки</h3>
              <button onClick={() => setShowExport(false)} className="ml-auto p-1.5 hover:bg-gray-200 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-2">
              <p className="text-xs text-gray-500 mb-3">Выберите формат для экспорта чата <strong>{activeChat.chat_id.replace(`chat-${courier.id}-`, 'Чат #')}</strong> ({activeChat.messages.length} сообщений):</p>
              {[
                { fmt: 'pdf' as const, label: '📄 PDF', desc: 'Оформленный отчёт', note: '(симуляция)' },
                { fmt: 'csv' as const, label: '📊 CSV', desc: 'Для Excel / аналитики', note: 'скачивание' },
                { fmt: 'txt' as const, label: '📝 TXT', desc: 'Простой текст', note: 'скачивание' },
              ].map(({ fmt, label, desc, note }) => (
                <button
                  key={fmt}
                  onClick={() => handleExport(fmt)}
                  className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/30 transition-all text-left"
                >
                  <div className="text-2xl">{label.split(' ')[0]}</div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{label.split(' ')[1]}</p>
                    <p className="text-[10px] text-gray-500">{desc} · {note}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                </button>
              ))}
              <button onClick={() => setShowExport(false)} className="w-full px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors mt-1">Отмена</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] px-4 py-3 bg-gray-900 text-white text-sm rounded-xl shadow-xl flex items-center gap-2 max-w-sm">
          <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
          {toast}
        </div>
      )}
    </div>
  );
}
