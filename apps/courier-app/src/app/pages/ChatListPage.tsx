import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft, ChevronRight, Headphones, Lock, MessageCircle, MessagesSquare, User,
} from 'lucide-react';
import { useT } from '../i18n';
import { useCourierStore } from '../store/CourierStore';
import type { ChatThread } from '../store/types';

function relativeTime(ts?: number): string {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return '·';
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export function ChatListPage() {
  const t = useT();
  const navigate = useNavigate();
  const { chatThreads } = useCourierStore();
  const [tab, setTab] = useState<'active' | 'closed'>('active');
  const { active, closed } = chatThreads();
  const list = tab === 'active' ? active : closed;

  return (
    <div className="min-h-full bg-gray-50">
      <header className="bg-white px-4 py-3 sticky top-0 z-10 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full active:bg-gray-100 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-[18px] font-extrabold">{t('chats.title')}</h1>
            <p className="text-xs text-gray-500">{t('chats.subtitle')}</p>
          </div>
          <MessagesSquare className="w-5 h-5 text-gray-400" />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-1 bg-gray-100 rounded-2xl p-1">
          <button
            onClick={() => setTab('active')}
            className={`h-9 rounded-xl text-sm font-bold transition-colors ${
              tab === 'active' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            {t('chats.tab.active')} {active.length > 0 && (
              <span className="ml-1 text-xs text-emerald-600 font-extrabold">{active.length}</span>
            )}
          </button>
          <button
            onClick={() => setTab('closed')}
            className={`h-9 rounded-xl text-sm font-bold transition-colors ${
              tab === 'closed' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            {t('chats.tab.closed')} {closed.length > 0 && (
              <span className="ml-1 text-xs text-gray-500 font-extrabold">{closed.length}</span>
            )}
          </button>
        </div>
      </header>

      <div className="px-3 pt-3 pb-8">
        {list.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center text-gray-500 border border-gray-100">
            <MessageCircle className="w-7 h-7 mx-auto mb-2 text-gray-400" />
            {tab === 'active' ? t('chats.empty_active') : t('chats.empty_closed')}
          </div>
        ) : (
          <ul className="space-y-2">
            {list.map(thread => (
              <li key={thread.channelKey}>
                <ThreadCard thread={thread} onClick={() => navigate(`/chat/${thread.channelKey}`)} />
              </li>
            ))}
          </ul>
        )}

        {tab === 'active' && (
          <p className="text-[11px] text-gray-400 mt-4 text-center">
            {t('chats.support_always')} · {t('chats.customer_after_pickup')}
          </p>
        )}
      </div>
    </div>
  );
}

function ThreadCard({ thread, onClick }: { thread: ChatThread; onClick: () => void }) {
  const t = useT();
  const isSupport = thread.kind === 'support';
  const initials = isSupport
    ? 'S'
    : (thread.title || '?').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
  const accent = isSupport ? 'from-emerald-500 to-teal-600' : 'from-rose-500 to-orange-500';
  const time = relativeTime(thread.lastMessageAt);

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl p-3 active:bg-gray-50 border border-gray-100 flex items-center gap-3 text-left"
    >
      <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${accent} text-white text-sm font-extrabold flex items-center justify-center flex-shrink-0`}>
        {isSupport ? <Headphones className="w-5 h-5" /> : <span>{initials || <User className="w-5 h-5" />}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-extrabold text-[15px] truncate">
            {isSupport ? t('chat.support') : thread.title}
          </span>
          {thread.orderNumber && !thread.locked && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${thread.closed ? 'bg-gray-100 text-gray-600' : 'bg-emerald-100 text-emerald-800'}`}>
              {thread.orderNumber}
            </span>
          )}
          {thread.locked && <Lock className="w-3 h-3 text-amber-500 flex-shrink-0" />}
          <span className="ml-auto text-[11px] text-gray-400 flex-shrink-0">{time}</span>
        </div>
        <div className="text-xs text-gray-500 truncate mt-0.5">
          {thread.locked
            ? t('chats.locked')
            : thread.lastMessageText ?? t('chat.no_messages')}
        </div>
      </div>
      {thread.unread > 0 ? (
        <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex-shrink-0">
          {thread.unread}
        </span>
      ) : (
        <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
      )}
    </button>
  );
}
