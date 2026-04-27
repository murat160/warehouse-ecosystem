import { useState, useMemo, useRef, useEffect } from 'react';
import {
  X, MessageSquare, CheckCircle2, AlertTriangle,
  Search, Archive, Inbox, BarChart2, Star,
  RefreshCw, UserCheck, ExternalLink, Lock,
  Send, Check, CheckCheck, Shield,
  Eye, Zap, Users, Timer,
  CircleDot, Wifi, WifiOff, Headphones, Bike, Store,
} from 'lucide-react';
import type { Conversation, ChatMessage, AgentRole, ChatChannel } from '../../data/chat-mock';
import { QUICK_REPLIES } from '../../data/chat-mock';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OperatorProfile {
  id: string;
  name: string;
  email: string;
  role: AgentRole;
  online: boolean;
  avatar: string;
  activeChats: number;
  resolvedToday: number;
  avgResponseTime: string;
  csat: number;
  region?: string;
  lastActivity?: string;
}

interface Props {
  operator: OperatorProfile;
  conversations: Conversation[];
  currentUserRole: AgentRole;     // 'admin' = can monitor/control, else own cabinet
  isMonitorMode?: boolean;        // true = admin is watching this operator
  onClose: () => void;
  onTakeChat?: (convId: string, agentId: string, agentName: string) => void;
  onReassignChat?: (convId: string, agentId: string, agentName: string) => void;
  onSendMessage?: (convId: string, text: string, isInternal?: boolean) => void;
  onNavigateToChat?: (convId: string) => void;
}

// ─── Local Helpers ────────────────────────────────────────────────────────────

const ROLE_CFG: Record<AgentRole, { label: string; color: string; bg: string }> = {
  l1:       { label: 'Оператор L1',  color: 'text-green-700',  bg: 'bg-green-100' },
  l2:       { label: 'Оператор L2',  color: 'text-blue-700',   bg: 'bg-blue-100' },
  lead:     { label: 'Руководитель', color: 'text-purple-700', bg: 'bg-purple-100' },
  admin:    { label: 'Администратор',color: 'text-red-700',    bg: 'bg-red-100' },
  readonly: { label: 'Просмотр',     color: 'text-gray-700',   bg: 'bg-gray-100' },
};

const CH_CFG: Record<ChatChannel, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  support:   { label: 'Клиенты',    icon: Headphones,    color: 'text-blue-600',   bg: 'bg-blue-50' },
  couriers:  { label: 'Курьеры',    icon: Bike,          color: 'text-orange-600', bg: 'bg-orange-50' },
  merchants: { label: 'Партнёры',   icon: Store,         color: 'text-purple-600', bg: 'bg-purple-50' },
  internal:  { label: 'Внутренний', icon: Lock,          color: 'text-gray-600',   bg: 'bg-gray-50' },
  escalated: { label: 'Эскалация',  icon: AlertTriangle, color: 'text-red-600',    bg: 'bg-red-50' },
  closed:    { label: 'Закрыты',    icon: Archive,       color: 'text-gray-400',   bg: 'bg-gray-50' },
};

const STATUS_CFG: Record<string, { label: string; dot: string; color: string }> = {
  open:             { label: 'Открыт',      dot: 'bg-blue-500',   color: 'text-blue-600' },
  pending:          { label: 'Ожидает',     dot: 'bg-yellow-500', color: 'text-yellow-600' },
  in_progress:      { label: 'В работе',    dot: 'bg-green-500',  color: 'text-green-600' },
  waiting_external: { label: 'Ждём',        dot: 'bg-indigo-400', color: 'text-indigo-600' },
  escalated:        { label: 'Эскалирован', dot: 'bg-red-500',    color: 'text-red-600' },
  resolved:         { label: 'Решён',       dot: 'bg-teal-500',   color: 'text-teal-600' },
  closed:           { label: 'Закрыт',      dot: 'bg-gray-400',   color: 'text-gray-500' },
};

function now() {
  return new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function isMineMsg(role: ChatMessage['senderRole'], opId: string, senderId: string) {
  return senderId === opId || ['support_l1','support_l2','support_lead','admin'].includes(role);
}

// ─── Conversation Row ─────────────────────────────────────────────────────────

function ConvRow({ conv, selected, onClick, isMonitor, operatorId }: {
  conv: Conversation;
  selected: boolean;
  onClick: () => void;
  isMonitor: boolean;
  operatorId?: string;
}) {
  const ch = CH_CFG[conv.channel];
  const Icon = ch.icon;
  const st = STATUS_CFG[conv.status] ?? STATUS_CFG.open;
  const isActive = !['resolved','closed'].includes(conv.status);
  // Reassigned away from this operator (admin monitor mode)
  const isReassigned = operatorId && conv.assignedTo && conv.assignedTo !== operatorId;

  return (
    <button onClick={onClick}
      className={`w-full flex items-start gap-3 px-3 py-3 text-left border-b border-gray-100 transition-all hover:bg-gray-50 ${selected ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'border-l-2 border-l-transparent'} ${isReassigned ? 'opacity-60' : ''}`}>
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${ch.bg}`}>
        <Icon className={`w-4 h-4 ${ch.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-semibold text-gray-900 truncate">{conv.clientName}</p>
          {conv.unread > 0 && (
            <span className="min-w-[18px] px-1 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center shrink-0">{conv.unread}</span>
          )}
        </div>
        <p className="text-xs text-gray-500 truncate">{conv.lastMessage}</p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <span className={`w-1.5 h-1.5 rounded-full ${st.dot} shrink-0`} />
          <span className={`text-xs ${st.color}`}>{st.label}</span>
          {conv.orderRef && <span className="text-xs text-gray-400 font-mono truncate">· {conv.orderRef}</span>}
          {isReassigned && (
            <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-medium shrink-0">
              → {conv.assignedToName ?? 'другой агент'}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="text-xs text-gray-400">{conv.lastMessageTime}</span>
        {isMonitor && !isActive && <Archive className="w-3 h-3 text-gray-300" />}
        {isMonitor && isActive && !isReassigned && <CircleDot className="w-3 h-3 text-green-500" />}
      </div>
    </button>
  );
}

// ─── Mini Chat View ───────────────────────────────────────────────────────────

function MiniChatView({ conv, operatorId, isMonitor, canReply, onSend, onGoToMainChat }: {
  conv: Conversation;
  operatorId: string;
  isMonitor: boolean;
  canReply: boolean;
  onSend: (text: string, isInternal?: boolean) => void;
  onGoToMainChat: () => void;
}) {
  const [text, setText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [showMacros, setShowMacros] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isClosed = ['resolved','closed'].includes(conv.status);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conv.messages.length]);

  function handleSend() {
    const t = text.trim();
    if (!t) return;
    onSend(t, isInternal);
    setText('');
    setIsInternal(false);
  }

  const ch = CH_CFG[conv.channel];
  const ChIcon = ch.icon;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Chat header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0 ${ch.bg}`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-white/80 border border-white`}>
            <ChIcon className={`w-4.5 h-4.5 ${ch.color}`} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">{conv.clientName}</p>
            <p className="text-xs text-gray-500 truncate">{conv.subject}</p>
          </div>
        </div>
        <button onClick={onGoToMainChat}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/80 border border-gray-200 text-gray-600 rounded-xl text-xs font-medium hover:bg-white transition-colors shrink-0">
          <ExternalLink className="w-3.5 h-3.5" />Открыть
        </button>
      </div>

      {/* Monitor banner */}
      {isMonitor && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-200 shrink-0">
          <Eye className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-700 font-medium">Режим мониторинга · вы наблюдаете чужой чат</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {conv.messages.map(msg => {
          if (msg.type === 'system' || msg.type === 'escalation') {
            return (
              <div key={msg.id} className="flex justify-center">
                <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
                  {msg.systemText ?? msg.escalateTo}
                </span>
              </div>
            );
          }
          const isMine = isMineMsg(msg.senderRole, operatorId, msg.senderId);
          const isInternalMsg = msg.isInternal;
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} gap-2`}>
              {!isMine && (
                <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center text-xs font-semibold text-white shrink-0 mt-1">
                  {msg.senderName.slice(0,2)}
                </div>
              )}
              <div className={`max-w-[75%] ${isMine ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                {!isMine && <span className="text-xs text-gray-400 ml-1">{msg.senderName}</span>}
                <div className={`px-3 py-2 rounded-xl text-sm ${
                  isInternalMsg
                    ? 'bg-yellow-50 border border-yellow-200 text-yellow-900 italic'
                    : isMine
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-800'
                }`}>
                  {isInternalMsg && <Lock className="w-3 h-3 inline mr-1 text-yellow-600" />}
                  {msg.text}
                </div>
                <div className={`flex items-center gap-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <span className="text-[10px] text-gray-400">{msg.timestamp}</span>
                  {isMine && (msg.read ? <CheckCheck className="w-3 h-3 text-blue-400" /> : <Check className="w-3 h-3 text-gray-300" />)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {canReply && !isClosed && !isMonitor && (
        <div className="border-t border-gray-200 bg-white shrink-0">
          {isInternal && (
            <div className="flex items-center gap-2 px-4 pt-2">
              <Lock className="w-3.5 h-3.5 text-yellow-600" />
              <span className="text-xs text-yellow-700 font-medium">Внутренняя заметка — клиент не увидит</span>
              <button onClick={() => setIsInternal(false)} className="ml-auto text-xs text-gray-400 hover:text-gray-600">Отмена</button>
            </div>
          )}
          {/* Quick replies */}
          {showMacros && (
            <div className="px-3 pt-2 flex flex-wrap gap-1.5 max-h-28 overflow-y-auto border-t border-gray-100">
              {QUICK_REPLIES.slice(0,6).map(q => (
                <button key={q.id} onClick={() => { setText(q.text); setShowMacros(false); }}
                  className="px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl text-xs font-medium hover:bg-blue-100 transition-colors">
                  {q.label}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2 p-3">
            <div className="flex flex-col gap-1 shrink-0">
              <button onClick={() => setShowMacros(p => !p)} title="Макросы"
                className={`p-2 rounded-xl transition-colors ${showMacros ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-400'}`}>
                <Zap className="w-4 h-4" />
              </button>
              <button onClick={() => setIsInternal(p => !p)} title="Внутренняя заметка"
                className={`p-2 rounded-xl transition-colors ${isInternal ? 'bg-yellow-100 text-yellow-700' : 'hover:bg-gray-100 text-gray-400'}`}>
                <Lock className="w-4 h-4" />
              </button>
            </div>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              rows={2}
              placeholder={isInternal ? 'Внутренняя заметка...' : 'Сообщение клиенту...'}
              className={`flex-1 px-3 py-2 text-sm border rounded-xl resize-none focus:outline-none focus:ring-2 transition-colors ${
                isInternal ? 'bg-yellow-50 border-yellow-300 focus:ring-yellow-400' : 'bg-gray-50 border-gray-200 focus:ring-blue-500'
              }`}
            />
            <button onClick={handleSend} disabled={!text.trim()}
              className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      {(isClosed || isMonitor) && (
        <div className={`px-4 py-2.5 text-center text-xs border-t border-gray-200 shrink-0 ${isMonitor ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-400'}`}>
          {isMonitor ? '👁 Режим мониторинга — вы не можете писать в чужой чат' : '✅ Чат закрыт · только просмотр'}
        </div>
      )}
    </div>
  );
}

// ─── Stats Tab ────────────────────────────────────────────────────────────────

function StatsView({ operator, conversations }: { operator: OperatorProfile; conversations: Conversation[] }) {
  const active = conversations.filter(c => !['resolved','closed'].includes(c.status));
  const resolved = conversations.filter(c => ['resolved','closed'].includes(c.status));
  const roleCfg = ROLE_CFG[operator.role];

  const channelBreakdown = useMemo(() => {
    const m: Record<string, number> = {};
    conversations.forEach(c => { m[c.channel] = (m[c.channel] ?? 0) + 1; });
    return Object.entries(m).sort((a,b) => b[1]-a[1]);
  }, [conversations]);

  return (
    <div className="p-5 space-y-5 overflow-y-auto h-full">
      {/* Profile card */}
      <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-xl font-bold shrink-0">
          {operator.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-gray-900 text-lg">{operator.name}</h3>
            <div className={`w-2 h-2 rounded-full ${operator.online ? 'bg-green-500' : 'bg-gray-300'}`} />
          </div>
          <p className="text-sm text-gray-500 mb-1">{operator.email}</p>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${roleCfg.bg} ${roleCfg.color}`}>{roleCfg.label}</span>
            {operator.region && <span className="text-xs text-gray-400">· {operator.region}</span>}
          </div>
        </div>
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Активных чатов', value: active.length, color: 'text-blue-600', bg: 'bg-blue-50', icon: MessageSquare },
          { label: 'Закрыто сегодня', value: operator.resolvedToday, color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle2 },
          { label: 'Ср. время ответа', value: operator.avgResponseTime, color: 'text-indigo-600', bg: 'bg-indigo-50', icon: Timer },
          { label: 'CSAT оценка', value: operator.csat > 0 ? `${operator.csat} ⭐` : '—', color: 'text-orange-600', bg: 'bg-orange-50', icon: Star },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className={`p-4 rounded-xl ${s.bg} flex items-center gap-3`}>
              <Icon className={`w-5 h-5 ${s.color} shrink-0`} />
              <div>
                <p className={`font-bold text-lg ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Channel breakdown */}
      {channelBreakdown.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Разбивка по каналам</p>
          <div className="space-y-2">
            {channelBreakdown.map(([ch, cnt]) => {
              const cfg = CH_CFG[ch as ChatChannel];
              if (!cfg) return null;
              const Icon = cfg.icon;
              const pct = Math.round((cnt / conversations.length) * 100);
              return (
                <div key={ch} className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${cfg.bg}`}>
                    <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-0.5">
                      <span className="text-xs text-gray-700">{cfg.label}</span>
                      <span className="text-xs font-semibold text-gray-900">{cnt}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent activity */}
      {resolved.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Последние закрытые</p>
          <div className="space-y-2">
            {resolved.slice(0, 5).map(c => (
              <div key={c.id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                <CheckCircle2 className="w-4 h-4 text-teal-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">{c.clientName}</p>
                  <p className="text-xs text-gray-400 truncate">{c.subject}</p>
                </div>
                {c.orderRef && <span className="text-xs text-gray-400 font-mono shrink-0">{c.orderRef}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function OperatorCabinetModal({
  operator, conversations, currentUserRole, isMonitorMode = false,
  onClose, onTakeChat, onReassignChat, onSendMessage, onNavigateToChat,
}: Props) {
  const [activeTab, setActiveTab] = useState<'active' | 'history' | 'stats'>('active');
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [localMessages, setLocalMessages] = useState<Record<string, ChatMessage[]>>({});
  const [notification, setNotification] = useState<{ text: string; type: 'info' | 'warning' } | null>(null);

  const isAdmin = currentUserRole === 'admin' || currentUserRole === 'lead';

  // Conversations owned by this operator
  const myConvs = useMemo(() => conversations.filter(c =>
    c.assignedTo === operator.id || c.assignedToName === operator.name
  ), [conversations, operator]);

  // Unassigned convs (visible for "take" action)
  const unassignedConvs = useMemo(() =>
    conversations.filter(c => !c.assignedTo && !['resolved','closed'].includes(c.status)),
    [conversations]);

  const activeConvs = useMemo(() => {
    let list = isAdmin ? conversations : myConvs;
    list = list.filter(c => !['resolved','closed'].includes(c.status));
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c => c.clientName.toLowerCase().includes(q) || c.subject.toLowerCase().includes(q));
    }
    return list.sort((a, b) => b.unread - a.unread);
  }, [conversations, myConvs, isAdmin, search]);

  const historyConvs = useMemo(() => {
    let list = isAdmin ? conversations : myConvs;
    list = list.filter(c => ['resolved','closed'].includes(c.status));
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c => c.clientName.toLowerCase().includes(q) || c.subject.toLowerCase().includes(q));
    }
    return list;
  }, [conversations, myConvs, isAdmin, search]);

  const displayList = activeTab === 'active' ? activeConvs : historyConvs;

  // Select first by default when switching tabs
  useEffect(() => {
    if (!selectedConvId && displayList.length > 0) setSelectedConvId(displayList[0].id);
  }, [activeTab]);

  // ── Reactive: handle when selected conv changes status/assignment ──────────
  useEffect(() => {
    if (!selectedConvId) return;

    const conv = conversations.find(c => c.id === selectedConvId);
    if (!conv) {
      // Conv no longer exists — select next in current list
      setSelectedConvId(displayList[0]?.id ?? null);
      return;
    }

    const isClosed = ['resolved', 'closed'].includes(conv.status);

    if (activeTab === 'active') {
      if (isClosed) {
        // Chat was closed — switch to history tab so the agent can see the resolved chat
        setActiveTab('history');
        setNotification({ text: '✅ Чат закрыт и перемещён в историю', type: 'info' });
        setTimeout(() => setNotification(null), 3500);
        // selectedConvId stays so we immediately see the just-closed chat in history
      } else if (!isAdmin) {
        // Check if this conv is still assigned to our operator
        const stillMine =
          conv.assignedTo === operator.id ||
          conv.assignedToName === operator.name;
        if (!stillMine) {
          // Reassigned to another operator — remove from list, select next active
          const newAssignee = conv.assignedToName ?? 'другого агента';
          setNotification({ text: `🔄 Чат переназначен → ${newAssignee}`, type: 'warning' });
          setTimeout(() => setNotification(null), 3500);
          const nextActive = activeConvs.find(c => c.id !== selectedConvId);
          setSelectedConvId(nextActive?.id ?? null);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations]);

  const selectedConv = useMemo(() => {
    const base = conversations.find(c => c.id === selectedConvId);
    if (!base) return null;
    const extra = localMessages[base.id];
    if (!extra) return base;
    return { ...base, messages: [...base.messages, ...extra] };
  }, [conversations, selectedConvId, localMessages]);

  function handleSend(text: string, isInternal = false) {
    if (!selectedConvId) return;
    const msg: ChatMessage = {
      id: `m_cab_${Date.now()}`, conversationId: selectedConvId,
      senderId: operator.id, senderName: operator.name,
      senderRole: operator.role === 'l1' ? 'support_l1' : operator.role === 'l2' ? 'support_l2' : 'support_lead',
      text, type: 'text', timestamp: now(), read: true, isInternal,
    };
    setLocalMessages(prev => ({
      ...prev, [selectedConvId]: [...(prev[selectedConvId] ?? []), msg],
    }));
    onSendMessage?.(selectedConvId, text, isInternal);
  }

  const roleCfg = ROLE_CFG[operator.role];
  const canReplyInCabinet = !isMonitorMode && (currentUserRole !== 'readonly');

  const tabs: { id: typeof activeTab; label: string; count: number }[] = [
    { id: 'active',  label: 'Активные',   count: activeConvs.length },
    { id: 'history', label: 'Закрытые',   count: historyConvs.length },
    { id: 'stats',   label: 'Статистика', count: 0 },
  ];

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-3.5 border-b border-gray-200 shrink-0 ${isMonitorMode ? 'bg-gradient-to-r from-amber-700 to-orange-700' : 'bg-gradient-to-r from-gray-900 to-gray-800'}`}>
          <div className="flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 ${operator.online ? 'bg-green-600' : 'bg-gray-600'}`}>
              {operator.avatar}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-white">{operator.name}</h1>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${roleCfg.bg} ${roleCfg.color}`}>{roleCfg.label}</span>
                {isMonitorMode && (
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-amber-400/30 text-amber-200 rounded-full border border-amber-400/40">
                    <Eye className="w-3 h-3" />Мониторинг
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <span className={`flex items-center gap-1 text-xs ${operator.online ? 'text-green-400' : 'text-gray-400'}`}>
                  {operator.online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                  {operator.online ? 'Онлайн' : 'Оффлайн'}
                </span>
                <span className="text-xs text-gray-400">·</span>
                <span className="text-xs text-gray-400">{operator.email}</span>
                {operator.region && <span className="flex items-center gap-1"><span className="text-xs text-gray-400">·</span><span className="text-xs text-gray-400">{operator.region}</span></span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2.5 mr-2">
              <div className="text-center">
                <p className="text-lg font-bold text-white">{activeConvs.length}</p>
                <p className="text-[10px] text-gray-400">акт. чатов</p>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div className="text-center">
                <p className="text-lg font-bold text-white">{operator.resolvedToday}</p>
                <p className="text-[10px] text-gray-400">закрыто</p>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div className="text-center">
                <p className="text-lg font-bold text-white">{operator.csat > 0 ? `${operator.csat}⭐` : '—'}</p>
                <p className="text-[10px] text-gray-400">CSAT</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
              <X className="w-5 h-5 text-gray-300" />
            </button>
          </div>
        </div>

        {/* Notification toast */}
        {notification && (
          <div className={`flex items-center gap-2.5 px-5 py-2.5 shrink-0 border-b text-sm font-medium transition-all ${
            notification.type === 'warning'
              ? 'bg-orange-50 border-orange-200 text-orange-800'
              : 'bg-green-50 border-green-200 text-green-800'
          }`}>
            <div className={`w-2 h-2 rounded-full shrink-0 animate-pulse ${notification.type === 'warning' ? 'bg-orange-500' : 'bg-green-500'}`} />
            {notification.text}
            <button onClick={() => setNotification(null)} className="ml-auto p-0.5 opacity-60 hover:opacity-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left: list */}
          <div className="w-72 border-r border-gray-200 flex flex-col shrink-0 overflow-hidden">
            {/* Tabs */}
            <div className="flex px-2 pt-2 pb-0 border-b border-gray-100 shrink-0 gap-1">
              {tabs.map(t => (
                <button key={t.id} onClick={() => { setActiveTab(t.id); setSelectedConvId(null); }}
                  className={`flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-t-xl text-xs font-medium transition-all border-b-2 ${activeTab === t.id ? 'text-blue-700 border-blue-600 bg-blue-50' : 'text-gray-500 border-transparent hover:text-gray-700'}`}>
                  {t.label}
                  {t.count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === t.id ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>{t.count}</span>
                  )}
                </button>
              ))}
            </div>

            {activeTab !== 'stats' && (
              <div style={{ display: 'contents' }}>
                {/* Search */}
                <div className="px-3 py-2 border-b border-gray-100 shrink-0">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                      placeholder="Поиск..." className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>

                {/* Unassigned (take) — shown in active tab for operators */}
                {activeTab === 'active' && !isAdmin && unassignedConvs.length > 0 && (
                  <div className="px-3 py-2 border-b border-gray-100 bg-yellow-50 shrink-0">
                    <p className="text-xs font-semibold text-yellow-800 mb-1.5 flex items-center gap-1">
                      <Inbox className="w-3.5 h-3.5" />{unassignedConvs.length} свободных чатов
                    </p>
                    <div className="space-y-1.5">
                      {unassignedConvs.slice(0, 3).map(c => (
                        <div key={c.id} className="flex items-center gap-2 p-2 bg-white rounded-xl border border-yellow-200">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-800 truncate">{c.clientName}</p>
                            <p className="text-xs text-gray-400 truncate">{c.channel}</p>
                          </div>
                          <button onClick={() => onTakeChat?.(c.id, operator.id, operator.name)}
                            className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors shrink-0">
                            <UserCheck className="w-3 h-3" />Взять
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* List */}
                <div className="flex-1 overflow-y-auto">
                  {displayList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-gray-400 px-4 text-center">
                      {activeTab === 'active'
                        ? <Inbox className="w-10 h-10 mb-2 text-gray-200" />
                        : <Archive className="w-10 h-10 mb-2 text-gray-200" />}
                      <p className="text-sm font-medium text-gray-500 mt-1">
                        {activeTab === 'active' ? 'Нет активных чатов' : 'История пуста'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {activeTab === 'active'
                          ? 'Все чаты обработаны или переназначены'
                          : 'Закрытые чаты появятся здесь'}
                      </p>
                    </div>
                  ) : displayList.map(c => (
                    <ConvRow key={c.id} conv={c}
                      selected={selectedConvId === c.id}
                      onClick={() => setSelectedConvId(c.id)}
                      isMonitor={isMonitorMode || isAdmin}
                      operatorId={operator.id}
                    />
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'stats' && (
              <div className="flex-1 overflow-hidden">
                <StatsView operator={operator} conversations={isAdmin ? conversations : myConvs} />
              </div>
            )}
          </div>

          {/* Right: chat view or stats */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'stats' ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <BarChart2 className="w-16 h-16 mx-auto mb-3 text-gray-200" />
                  <p className="text-sm">Статистика отображается в левой панели</p>
                </div>
              </div>
            ) : selectedConv ? (
              <MiniChatView
                conv={selectedConv}
                operatorId={operator.id}
                isMonitor={isMonitorMode || (isAdmin && selectedConv.assignedTo !== operator.id && !['resolved','closed'].includes(selectedConv.status))}
                canReply={canReplyInCabinet && !['resolved','closed'].includes(selectedConv.status)}
                onSend={handleSend}
                onGoToMainChat={() => { onNavigateToChat?.(selectedConv.id); onClose(); }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <MessageSquare className="w-14 h-14 mb-3 text-gray-200" />
                <p className="text-sm font-medium text-gray-500">
                  {activeTab === 'active' ? 'Нет активных чатов' : 'Выберите чат из истории'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {activeTab === 'active'
                    ? 'Возьмите свободный чат или дождитесь назначения'
                    : 'Кликните на диалог в списке слева'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action bar for monitor/admin */}
        {isMonitorMode && selectedConv && (
          <div className={`flex items-center gap-3 px-5 py-3 border-t shrink-0 ${['resolved','closed'].includes(selectedConv.status) ? 'border-gray-200 bg-gray-50' : 'border-amber-200 bg-amber-50'}`}>
            <Shield className={`w-4 h-4 shrink-0 ${['resolved','closed'].includes(selectedConv.status) ? 'text-gray-400' : 'text-amber-700'}`} />
            <span className={`text-xs font-medium flex-1 ${['resolved','closed'].includes(selectedConv.status) ? 'text-gray-500' : 'text-amber-700'}`}>
              {['resolved','closed'].includes(selectedConv.status)
                ? `✅ Закрыт${selectedConv.resolvedAt ? ` · ${selectedConv.resolvedAt}` : ''}`
                : 'Действия администратора над чатом'}
            </span>
            {!['resolved','closed'].includes(selectedConv.status) && (
              <button onClick={() => onReassignChat?.(selectedConv.id, operator.id, operator.name)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-300 text-amber-800 rounded-xl text-xs font-semibold hover:bg-amber-100 transition-colors">
                <RefreshCw className="w-3.5 h-3.5" />Переназначить
              </button>
            )}
            <button onClick={() => { onNavigateToChat?.(selectedConv.id); onClose(); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${['resolved','closed'].includes(selectedConv.status) ? 'bg-gray-600 hover:bg-gray-700 text-white' : 'bg-amber-700 hover:bg-amber-800 text-white'}`}>
              <ExternalLink className="w-3.5 h-3.5" />Открыть в чат-центре
            </button>
          </div>
        )}
      </div>
    </div>
  );
}