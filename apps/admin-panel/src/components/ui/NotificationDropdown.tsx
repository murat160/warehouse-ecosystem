import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, BellDot, Check, Trash2, ExternalLink,
  Send, ArrowUpRight, CheckSquare, MessageCircle,
  ChevronRight, X, FileCheck, FileX, FileWarning, FileUp,
} from 'lucide-react';
import {
  getNotifications, markRead, markAllRead, deleteNotification,
  subscribe as subscribeNotifs, unreadCount,
  type InternalNotification, type NotifPriority,
} from '../../store/notificationsStore';

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_CFG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string; border: string }> = {
  chat_routed:              { label: 'Перенаправлено',   icon: Send,          color: 'text-violet-700', bg: 'bg-violet-50',  border: 'border-violet-200' },
  chat_mention:             { label: '@Упоминание',       icon: Bell,          color: 'text-blue-700',   bg: 'bg-blue-50',    border: 'border-blue-200' },
  task_assigned:            { label: 'Задача',            icon: CheckSquare,   color: 'text-teal-700',   bg: 'bg-teal-50',    border: 'border-teal-200' },
  escalation:               { label: 'Эскалация',         icon: ArrowUpRight,  color: 'text-red-700',    bg: 'bg-red-50',     border: 'border-red-200' },
  internal_msg:             { label: 'Внутреннее',        icon: MessageCircle, color: 'text-gray-700',   bg: 'bg-gray-50',    border: 'border-gray-200' },
  document_approved:        { label: 'Документ одобрен',  icon: FileCheck,     color: 'text-green-700',  bg: 'bg-green-50',   border: 'border-green-200' },
  document_rejected:        { label: 'Документ отклонён', icon: FileX,         color: 'text-red-700',    bg: 'bg-red-50',     border: 'border-red-200' },
  document_expired:         { label: 'Документ истёк',    icon: FileWarning,   color: 'text-amber-700',  bg: 'bg-amber-50',   border: 'border-amber-200' },
  document_reupload_request:{ label: 'Запрос загрузки',   icon: FileUp,        color: 'text-blue-700',   bg: 'bg-blue-50',    border: 'border-blue-200' },
};

const PRIORITY_DOT: Record<NotifPriority, string> = {
  low: 'bg-gray-400', normal: 'bg-blue-400', high: 'bg-orange-500', critical: 'bg-red-500',
};

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
}

export function NotificationDropdown({ onClose }: Props) {
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState<InternalNotification[]>(() => getNotifications());
  const panelRef = useRef<HTMLDivElement>(null);

  // Reactive store subscription
  useEffect(() => {
    const unsub = subscribeNotifs(() => setNotifs(getNotifications()));
    return unsub;
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const unread = notifs.filter(n => !n.read).length;
  const preview = notifs.slice(0, 6);

  function handleOpenNotif(n: InternalNotification) {
    markRead(n.id);
    onClose();
    navigate('/cabinet');
  }

  function handleGoToInbox() {
    onClose();
    navigate('/cabinet');
  }

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden"
      style={{ maxHeight: 'min(520px, calc(100vh - 80px))' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-violet-600 to-indigo-600">
        <div className="flex items-center gap-2">
          <BellDot className="w-4 h-4 text-white" />
          <span className="font-semibold text-white text-sm">Уведомления</span>
          {unread > 0 && (
            <span className="min-w-[20px] h-5 px-1.5 bg-white/25 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {unread}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unread > 0 && (
            <button
              onClick={() => markAllRead()}
              className="flex items-center gap-1 px-2 py-1 text-xs text-white/80 hover:text-white hover:bg-white/15 rounded-lg transition-colors"
              title="Прочитать все"
            >
              <Check className="w-3.5 h-3.5" />
              Прочитать все
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors text-white/80 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notification list */}
      <div className="overflow-y-auto" style={{ maxHeight: '380px' }}>
        {preview.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
              <Bell className="w-7 h-7 opacity-30" />
            </div>
            <p className="text-sm font-medium">Нет уведомлений</p>
            <p className="text-xs mt-0.5 opacity-60">Всё под контролем</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {preview.map(n => {
              const cfg = TYPE_CFG[n.type] ?? TYPE_CFG.chat_routed;
              const Icon = cfg.icon;
              return (
                <div
                  key={n.id}
                  className={`group relative flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer ${
                    n.read ? 'bg-white hover:bg-gray-50' : `${cfg.bg} hover:brightness-[0.97]`
                  }`}
                  onClick={() => handleOpenNotif(n)}
                >
                  {/* Unread dot */}
                  {!n.read && (
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-violet-500 rounded-full" />
                  )}

                  {/* Type icon */}
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${cfg.bg} ${cfg.border}`}>
                    <Icon className={`w-3.5 h-3.5 ${n.read ? 'text-gray-400' : cfg.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-1.5 justify-between">
                      <p className={`text-sm leading-snug truncate ${n.read ? 'text-gray-700' : 'font-semibold text-gray-900'}`}>
                        {n.title}
                      </p>
                      <span className={`shrink-0 w-2 h-2 rounded-full mt-1.5 ${PRIORITY_DOT[n.priority]}`} title={`Приоритет: ${n.priority}`} />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {n.fromName} · {n.targetDept}
                    </p>
                    <p className="text-xs text-gray-400">{n.createdAt}</p>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={e => { e.stopPropagation(); deleteNotification(n.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 text-gray-300 hover:text-red-400 rounded-lg transition-all shrink-0 mt-0.5"
                    title="Удалить"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}

            {notifs.length > 6 && (
              <div className="px-4 py-2 bg-gray-50 text-center">
                <p className="text-xs text-gray-400">+ ещё {notifs.length - 6} уведомлений</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
        <button
          onClick={handleGoToInbox}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-white border border-gray-200 hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700 rounded-xl text-sm font-medium text-gray-700 transition-all"
        >
          <ExternalLink className="w-4 h-4" />
          Открыть полный почтовый ящик
          <ChevronRight className="w-3.5 h-3.5 ml-auto" />
        </button>
      </div>
    </div>
  );
}