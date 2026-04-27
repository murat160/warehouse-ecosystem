import { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, MessageSquare, RotateCcw, AlertTriangle, ShieldAlert, Clock,
  ChevronRight, Send, CheckCircle, XCircle, RefreshCw, User, Headphones,
  Store, Cpu, Paperclip, ImageIcon, ZoomIn, AlertCircle, FileText,
  ArrowUpRight, Lock, Unlock, Settings, UserCheck,
} from 'lucide-react';
import {
  QualityCase, QualityCaseMessage, QualityCaseRefund, QualityCaseAttachment,
} from '../../data/merchants-mock';
import { toast } from 'sonner';

// ─── Types & Config ───────────────────────────────────────────────────────────

type Tab = 'chat' | 'refund' | 'timeline' | 'actions';

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  complaint:  { label: 'Жалоба',        color: 'text-orange-700', bg: 'bg-orange-100', icon: MessageSquare },
  return:     { label: 'Возврат',       color: 'text-blue-700',   bg: 'bg-blue-100',   icon: RotateCcw },
  quality:    { label: 'Качество',      color: 'text-purple-700', bg: 'bg-purple-100', icon: AlertTriangle },
  fraud:      { label: 'Фрод',          color: 'text-red-700',    bg: 'bg-red-100',    icon: ShieldAlert },
  sla_breach: { label: 'SLA нарушение', color: 'text-yellow-700', bg: 'bg-yellow-100', icon: Clock },
};
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  open:          { label: 'Открыт',        color: 'text-blue-700',   bg: 'bg-blue-100' },
  investigating: { label: 'Расследование', color: 'text-orange-700', bg: 'bg-orange-100' },
  resolved:      { label: 'Решён',         color: 'text-green-700',  bg: 'bg-green-100' },
  escalated:     { label: 'Эскалирован',   color: 'text-red-700',    bg: 'bg-red-100' },
};
const REFUND_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:   { label: 'Ожидает одобрения', color: 'text-yellow-700', bg: 'bg-yellow-50',  border: 'border-yellow-200' },
  approved:  { label: 'Одобрен',           color: 'text-blue-700',   bg: 'bg-blue-50',    border: 'border-blue-200' },
  processed: { label: 'Выплачен',          color: 'text-green-700',  bg: 'bg-green-50',   border: 'border-green-200' },
  rejected:  { label: 'Отклонён',          color: 'text-red-700',    bg: 'bg-red-50',     border: 'border-red-200' },
};
const ROLE_CONFIG: Record<string, { bg: string; text: string; label: string; icon: any; side: 'left' | 'right' | 'center' }> = {
  customer: { bg: 'bg-gray-100',   text: 'text-gray-900', label: 'Покупатель',  icon: User,       side: 'left' },
  operator: { bg: 'bg-blue-500',   text: 'text-white',    label: 'Оператор',    icon: Headphones, side: 'right' },
  merchant: { bg: 'bg-purple-100', text: 'text-gray-900', label: 'Продавец',    icon: Store,      side: 'left' },
  system:   { bg: 'bg-transparent',text: 'text-gray-400', label: 'Система',     icon: Cpu,        side: 'center' },
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  case_: QualityCase;
  onClose: () => void;
  onUpdateCase: (id: string, updates: Partial<QualityCase>) => void;
  onAddMessage: (caseId: string, msg: QualityCaseMessage) => void;
  onUpdateRefund: (caseId: string, updates: Partial<QualityCaseRefund>) => void;
  onAddAttachment: (caseId: string, files: File[]) => void;
  onViewAttachment: (attachments: QualityCaseAttachment[], index: number) => void;
}

// ─── Chat Tab ─────────────────────────────────────────────────────────────────

function ChatTab({ case_, onSend }: { case_: QualityCase; onSend: (text: string) => void }) {
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const messages = case_.messages ?? [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  function send() {
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText('');
  }

  const isResolved = case_.status === 'resolved';

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm">
            <MessageSquare className="w-8 h-8 mb-2 opacity-40" />
            Переписка пуста
          </div>
        )}
        {messages.map((msg) => {
          const rc = ROLE_CONFIG[msg.senderRole] ?? ROLE_CONFIG.system;
          const RIcon = rc.icon;

          if (msg.senderRole === 'system') {
            return (
              <div key={msg.id} className="flex items-center gap-2 justify-center">
                <div className="h-px flex-1 bg-gray-100" />
                <span className="text-[10px] text-gray-400 shrink-0 text-center px-1">{msg.text}</span>
                <div className="h-px flex-1 bg-gray-100" />
              </div>
            );
          }

          const isRight = rc.side === 'right';
          return (
            <div key={msg.id} className={`flex gap-2 ${isRight ? 'flex-row-reverse' : 'flex-row'}`}>
              {/* Avatar */}
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isRight ? 'bg-blue-500' : msg.senderRole === 'merchant' ? 'bg-purple-100' : 'bg-gray-200'}`}>
                <RIcon className={`w-3.5 h-3.5 ${isRight ? 'text-white' : msg.senderRole === 'merchant' ? 'text-purple-600' : 'text-gray-500'}`} />
              </div>
              {/* Bubble */}
              <div className={`max-w-[75%] ${isRight ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                <div className="flex items-center gap-1.5">
                  {!isRight && <span className="text-[10px] font-semibold text-gray-500">{msg.senderName}</span>}
                  {isRight && <span className="text-[10px] font-semibold text-gray-500">{msg.senderName}</span>}
                </div>
                <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                  isRight ? 'bg-blue-500 text-white rounded-tr-sm' :
                  msg.senderRole === 'merchant' ? 'bg-purple-50 text-gray-800 border border-purple-100 rounded-tl-sm' :
                  'bg-gray-100 text-gray-800 rounded-tl-sm'
                }`}>
                  {msg.text}
                </div>
                <span className="text-[9px] text-gray-400">{fmtTime(msg.sentAt)}</span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!isResolved ? (
        <div className="border-t border-gray-100 px-4 py-3 bg-white">
          <div className="flex gap-2 items-end">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Написать сообщение... (Enter — отправить)"
              className="flex-1 resize-none border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[60px] max-h-[120px]"
            />
            <button
              onClick={send}
              disabled={!text.trim()}
              className="p-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 text-white rounded-xl transition-colors shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
          <p className="text-xs text-gray-400 text-center flex items-center justify-center gap-1">
            <Lock className="w-3 h-3" /> Кейс закрыт — переписка заблокирована
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Refund Tab ───────────────────────────────────────────────────────────────

function RefundTab({
  case_,
  onApprove,
  onReject,
  onProcess,
}: {
  case_: QualityCase;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onProcess: () => void;
}) {
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const refund = case_.refund;

  if (!refund) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
        <RefreshCw className="w-8 h-8 opacity-40" />
        <p className="text-sm">Запрос на возврат не создан</p>
        <button
          onClick={() => toast.info('Создание запроса на возврат...')}
          className="mt-2 px-4 py-2 bg-blue-500 text-white text-sm rounded-xl hover:bg-blue-600 transition-colors"
        >
          Создать запрос
        </button>
      </div>
    );
  }

  const sc = REFUND_STATUS_CONFIG[refund.status];

  return (
    <div className="p-4 space-y-4">
      {/* Refund card */}
      <div className={`border ${sc.border} ${sc.bg} rounded-xl p-4 space-y-3`}>
        {/* Status */}
        <div className="flex items-center justify-between">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${sc.border} ${sc.color} ${sc.bg}`}>
            {sc.label}
          </span>
          <span className="text-xs text-gray-400 font-mono">{refund.id}</span>
        </div>

        {/* Amount */}
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold text-gray-900">₽{refund.amount.toLocaleString('ru-RU')}</span>
        </div>

        {/* Details grid */}
        <div className="bg-white/60 rounded-xl border border-white divide-y divide-gray-100">
          {[
            { label: 'Способ возврата', value: refund.method },
            { label: 'Реквизиты', value: refund.bankDetails ?? '—' },
            { label: 'Запрошен', value: fmtTime(refund.requestedAt) },
            ...(refund.approvedBy ? [{ label: 'Одобрил', value: refund.approvedBy }] : []),
            ...(refund.processedAt ? [{ label: 'Выплачен', value: fmtTime(refund.processedAt) }] : []),
            ...(refund.rejectReason ? [{ label: 'Причина отклонения', value: refund.rejectReason }] : []),
          ].map(row => (
            <div key={row.label} className="flex items-start px-3 py-2 gap-3">
              <span className="text-xs text-gray-500 w-36 shrink-0">{row.label}</span>
              <span className="text-xs font-medium text-gray-800">{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions based on status */}
      {refund.status === 'pending' && !rejectMode && (
        <div className="flex gap-3">
          <button
            onClick={onApprove}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-500 hover:bg-green-600 text-white text-sm rounded-xl transition-colors"
          >
            <CheckCircle className="w-4 h-4" /> Одобрить возврат
          </button>
          <button
            onClick={() => setRejectMode(true)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 text-sm rounded-xl border border-red-200 transition-colors"
          >
            <XCircle className="w-4 h-4" /> Отклонить
          </button>
        </div>
      )}

      {refund.status === 'pending' && rejectMode && (
        <div className="space-y-3 border border-red-200 bg-red-50 rounded-xl p-3">
          <p className="text-sm font-medium text-red-700">Причина отклонения</p>
          <textarea
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            placeholder="Укажите причину отклонения возврата..."
            className="w-full text-sm border border-red-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none min-h-[80px] bg-white"
          />
          <div className="flex gap-2">
            <button
              onClick={() => { onReject(rejectReason); setRejectMode(false); setRejectReason(''); }}
              disabled={!rejectReason.trim()}
              className="flex-1 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-200 text-white text-sm rounded-xl transition-colors"
            >
              Подтвердить отклонение
            </button>
            <button
              onClick={() => { setRejectMode(false); setRejectReason(''); }}
              className="px-4 py-2 border border-gray-200 text-sm rounded-xl hover:bg-gray-50 transition-colors"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {refund.status === 'approved' && (
        <button
          onClick={onProcess}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-xl transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Обработать выплату
        </button>
      )}

      {(refund.status === 'processed' || refund.status === 'rejected') && (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-200">
          {refund.status === 'processed'
            ? <span style={{display:'contents'}}><CheckCircle className="w-4 h-4 text-green-500 shrink-0" /><span className="text-sm text-gray-600">Средства успешно выплачены покупателю</span></span>
            : <span style={{display:'contents'}}><XCircle className="w-4 h-4 text-red-500 shrink-0" /><span className="text-sm text-gray-600">Возврат отклонён и закрыт</span></span>
          }
        </div>
      )}

      {/* Order link */}
      {case_.orderRef && (
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-200">
          <FileText className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="text-xs text-gray-500">Заказ:</span>
          <span className="text-xs font-mono font-medium text-blue-600">{case_.orderRef}</span>
        </div>
      )}
    </div>
  );
}

// ─── Timeline Tab ─────────────────────────────────────────────────────────────

function TimelineTab({ case_ }: { case_: QualityCase }) {
  const messages = case_.messages ?? [];
  const events = [
    { id: 'ev-open', icon: AlertCircle, color: 'text-blue-500', bg: 'bg-blue-50 border-blue-200', label: 'Кейс открыт', time: case_.createdAt, text: `${case_.caseCode} · Тип: ${TYPE_CONFIG[case_.type]?.label}` },
    ...messages.filter(m => m.senderRole !== 'system').map(m => ({
      id: m.id,
      icon: ROLE_CONFIG[m.senderRole]?.icon ?? MessageSquare,
      color: m.senderRole === 'operator' ? 'text-blue-500' : m.senderRole === 'merchant' ? 'text-purple-500' : 'text-gray-500',
      bg: m.senderRole === 'operator' ? 'bg-blue-50 border-blue-200' : m.senderRole === 'merchant' ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200',
      label: m.senderName,
      time: m.sentAt,
      text: m.text.length > 80 ? m.text.slice(0, 80) + '…' : m.text,
    })),
    ...(case_.refund ? [{
      id: 'ev-refund',
      icon: RefreshCw,
      color: case_.refund.status === 'processed' ? 'text-green-500' : case_.refund.status === 'rejected' ? 'text-red-500' : 'text-yellow-500',
      bg: case_.refund.status === 'processed' ? 'bg-green-50 border-green-200' : case_.refund.status === 'rejected' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200',
      label: `Возврат: ${REFUND_STATUS_CONFIG[case_.refund.status]?.label}`,
      time: case_.refund.processedAt ?? case_.refund.requestedAt,
      text: `₽${case_.refund.amount.toLocaleString('ru-RU')} · ${case_.refund.method}`,
    }] : []),
    ...(case_.status === 'resolved' ? [{
      id: 'ev-resolved',
      icon: CheckCircle,
      color: 'text-green-500',
      bg: 'bg-green-50 border-green-200',
      label: 'Кейс закрыт',
      time: case_.createdAt,
      text: case_.resolution ?? 'Решён',
    }] : []),
  ].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  return (
    <div className="p-4 overflow-y-auto">
      <div className="relative">
        <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-gray-100" />
        <div className="space-y-4">
          {events.map(ev => {
            const Icon = ev.icon;
            return (
              <div key={ev.id} className="flex gap-3 relative">
                <div className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 z-10 ${ev.bg}`}>
                  <Icon className={`w-3.5 h-3.5 ${ev.color}`} />
                </div>
                <div className="flex-1 pb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800">{ev.label}</span>
                    <span className="text-[10px] text-gray-400">{fmtTime(ev.time)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{ev.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Actions Tab ──────────────────────────────────────────────────────────────

function ActionsTab({
  case_,
  onUpdateStatus,
  onAddNote,
  onEscalate,
  onResolve,
  onAssign,
}: {
  case_: QualityCase;
  onUpdateStatus: (s: string) => void;
  onAddNote: (text: string) => void;
  onEscalate: () => void;
  onResolve: (r: string) => void;
  onAssign: (name: string) => void;
}) {
  const [note, setNote] = useState('');
  const [resolution, setResolution] = useState('');
  const [assignee, setAssignee] = useState(case_.assignedOperator?.name ?? '');
  const [showResolveForm, setShowResolveForm] = useState(false);

  const OPERATORS = ['Анна Соколова', 'Дмитрий Орлов', 'Иван Петров', 'Мария Кузнецова', 'Ольга Смирнова'];

  return (
    <div className="p-4 space-y-5 overflow-y-auto">

      {/* Status change */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Статус кейса</p>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(STATUS_CONFIG).map(([status, sc]) => (
            <button
              key={status}
              onClick={() => { onUpdateStatus(status); toast.success(`Статус изменён на «${sc.label}»`); }}
              disabled={case_.status === status}
              className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                case_.status === status
                  ? `${sc.bg} ${sc.color} border-current opacity-100 ring-2 ring-offset-1 ring-current/30`
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
              }`}
            >
              {sc.label}
            </button>
          ))}
        </div>
      </div>

      {/* Assign operator */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Ответственный оператор</p>
        <div className="flex gap-2">
          <select
            value={assignee}
            onChange={e => setAssignee(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">— Не назначен —</option>
            {OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
          </select>
          <button
            onClick={() => { onAssign(assignee); toast.success(`Назначен: ${assignee || 'снят'}`); }}
            className="px-3 py-2 bg-blue-500 text-white text-sm rounded-xl hover:bg-blue-600 transition-colors shrink-0"
          >
            <UserCheck className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Internal note */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Внутренняя заметка</p>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Добавить внутреннюю заметку (видна только операторам)..."
          className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[72px]"
        />
        <button
          onClick={() => { if (note.trim()) { onAddNote(note); setNote(''); toast.success('Заметка добавлена'); } }}
          disabled={!note.trim()}
          className="w-full py-2 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-200 text-white text-sm rounded-xl transition-colors"
        >
          Сохранить заметку
        </button>
      </div>

      {/* Resolve form */}
      {!showResolveForm ? (
        <div className="flex gap-2">
          <button
            onClick={onEscalate}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-red-200 bg-red-50 text-red-600 text-sm rounded-xl hover:bg-red-100 transition-colors"
          >
            <ArrowUpRight className="w-4 h-4" /> Эскалировать
          </button>
          <button
            onClick={() => setShowResolveForm(true)}
            disabled={case_.status === 'resolved'}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-green-200 bg-green-50 text-green-700 text-sm rounded-xl hover:bg-green-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <CheckCircle className="w-4 h-4" /> Закрыть кейс
          </button>
        </div>
      ) : (
        <div className="space-y-2 border border-green-200 bg-green-50 rounded-xl p-3">
          <p className="text-sm font-medium text-green-700">Резолюция</p>
          <input
            value={resolution}
            onChange={e => setResolution(e.target.value)}
            placeholder="Опишите решение по кейсу..."
            className="w-full text-sm border border-green-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
          />
          <div className="flex gap-2">
            <button
              onClick={() => { onResolve(resolution); setShowResolveForm(false); }}
              disabled={!resolution.trim()}
              className="flex-1 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-200 text-white text-sm rounded-xl transition-colors"
            >
              Закрыть кейс
            </button>
            <button
              onClick={() => setShowResolveForm(false)}
              className="px-4 py-2 border border-gray-200 text-sm rounded-xl hover:bg-gray-50"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function CaseDetailPanel({
  case_,
  onClose,
  onUpdateCase,
  onAddMessage,
  onUpdateRefund,
  onAddAttachment,
  onViewAttachment,
}: Props) {
  const [tab, setTab] = useState<Tab>('chat');
  const fileRef = useRef<HTMLInputElement>(null);
  const msgSeqRef = useRef(0);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const tc = TYPE_CONFIG[case_.type] ?? TYPE_CONFIG.complaint;
  const sc = STATUS_CONFIG[case_.status] ?? STATUS_CONFIG.open;
  const TIcon = tc.icon;
  const atts = case_.attachments ?? [];
  const hasRefund = !!case_.refund;

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: 'chat',     label: 'Переписка', badge: (case_.messages ?? []).filter(m => m.senderRole !== 'system').length },
    { id: 'refund',   label: 'Возврат' },
    { id: 'timeline', label: 'Хронология' },
    { id: 'actions',  label: 'Действия' },
  ];

  function handleSendMessage(text: string) {
    const msg: QualityCaseMessage = {
      id: `msg-${Date.now()}-${++msgSeqRef.current}`,
      senderName: 'Оператор',
      senderRole: 'operator',
      text,
      sentAt: new Date().toISOString(),
    };
    onAddMessage(case_.id, msg);
    toast.success('Сообщение отправлено');
  }

  function handleApproveRefund() {
    onUpdateRefund(case_.id, { status: 'approved', approvedBy: 'Оператор' });
    const sysMsg: QualityCaseMessage = {
      id: `sys-${Date.now()}-${++msgSeqRef.current}`,
      senderName: 'Система',
      senderRole: 'system',
      text: `Возврат одобрен оператором. Сумма: ₽${case_.refund?.amount.toLocaleString('ru-RU')}. Передан в обработку.`,
      sentAt: new Date().toISOString(),
    };
    onAddMessage(case_.id, sysMsg);
    toast.success('Возврат одобрен ✓');
  }

  function handleRejectRefund(reason: string) {
    onUpdateRefund(case_.id, { status: 'rejected', rejectReason: reason });
    const sysMsg: QualityCaseMessage = {
      id: `sys-${Date.now()}-${++msgSeqRef.current}`,
      senderName: 'Система',
      senderRole: 'system',
      text: `Возврат отклонён. Причина: ${reason}`,
      sentAt: new Date().toISOString(),
    };
    onAddMessage(case_.id, sysMsg);
    toast.error('Возврат отклонён');
  }

  function handleProcessRefund() {
    onUpdateRefund(case_.id, { status: 'processed', processedAt: new Date().toISOString() });
    const sysMsg: QualityCaseMessage = {
      id: `sys-${Date.now()}-${++msgSeqRef.current}`,
      senderName: 'Система',
      senderRole: 'system',
      text: `Возврат обработан. Средства ₽${case_.refund?.amount.toLocaleString('ru-RU')} переданы на выплату по реквизитам: ${case_.refund?.bankDetails ?? '—'}.`,
      sentAt: new Date().toISOString(),
    };
    onAddMessage(case_.id, sysMsg);
    toast.success('Выплата обработана ✓');
  }

  function handleAddNote(text: string) {
    const msg: QualityCaseMessage = {
      id: `note-${Date.now()}-${++msgSeqRef.current}`,
      senderName: '[Внутренняя заметка] Оператор',
      senderRole: 'operator',
      text: `📋 ${text}`,
      sentAt: new Date().toISOString(),
    };
    onAddMessage(case_.id, msg);
  }

  function handleEscalate() {
    onUpdateCase(case_.id, { status: 'escalated' });
    const msg: QualityCaseMessage = {
      id: `sys-${Date.now()}-${++msgSeqRef.current}`,
      senderName: 'Система',
      senderRole: 'system',
      text: 'Кейс эскалирован на уровень Senior QC / Compliance.',
      sentAt: new Date().toISOString(),
    };
    onAddMessage(case_.id, msg);
    toast.warning('Кейс эскалирован');
  }

  function handleResolve(resolution: string) {
    onUpdateCase(case_.id, { status: 'resolved', resolution });
    const msg: QualityCaseMessage = {
      id: `sys-${Date.now()}-${++msgSeqRef.current}`,
      senderName: 'Система',
      senderRole: 'system',
      text: `Кейс закрыт. Резолюция: ${resolution}`,
      sentAt: new Date().toISOString(),
    };
    onAddMessage(case_.id, msg);
    toast.success('Кейс закрыт ✓');
  }

  function handleAssign(name: string) {
    onUpdateCase(case_.id, { assignedOperator: name ? { name, role: 'Оператор QC' } : undefined });
  }

  function handleAttachFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).filter(f => f.type.startsWith('image/'));
    if (files.length) { onAddAttachment(case_.id, files); }
    e.target.value = '';
  }

  const panel = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[200] flex justify-end"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-[2px]" />

        {/* Panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          className="relative bg-white w-full max-w-[520px] h-full shadow-2xl flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div className="shrink-0 border-b border-gray-100 px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                {/* Badges */}
                <div className="flex items-center gap-1.5 flex-wrap mb-2">
                  <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${tc.bg} ${tc.color}`}>
                    <TIcon className="w-3 h-3" />{tc.label}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                    case_.priority === 'p1' ? 'bg-red-100 text-red-700' :
                    case_.priority === 'p2' ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>{case_.priority.toUpperCase()}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${sc.bg} ${sc.color}`}>{sc.label}</span>
                  {hasRefund && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700">
                      Возврат · ₽{case_.refund!.amount.toLocaleString('ru-RU')}
                    </span>
                  )}
                </div>
                {/* Case code */}
                <p className="text-xs font-mono text-gray-400">{case_.caseCode}</p>
                <p className="text-sm font-semibold text-gray-900 leading-snug mt-0.5">{case_.subject}</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-gray-700 shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customer + Operator info */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              {case_.customerName && (
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-2.5 py-1.5">
                  <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-400">Покупатель</p>
                    <p className="text-xs font-medium text-gray-700 truncate">{case_.customerName}</p>
                    {case_.customerPhone && <p className="text-[10px] text-gray-500">{case_.customerPhone}</p>}
                  </div>
                </div>
              )}
              {case_.assignedOperator && (
                <div className="flex items-center gap-2 bg-blue-50 rounded-lg px-2.5 py-1.5">
                  <Headphones className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-blue-400">Оператор</p>
                    <p className="text-xs font-medium text-blue-700 truncate">{case_.assignedOperator.name}</p>
                    <p className="text-[10px] text-blue-500">{case_.assignedOperator.role}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Attachments strip ── */}
          {atts.length > 0 && (
            <div className="shrink-0 border-b border-gray-100 px-5 py-2.5">
              <div className="flex items-center gap-2">
                <Paperclip className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <div className="flex gap-1.5 flex-wrap">
                  {atts.map((att, i) => (
                    <button
                      key={att.id}
                      onClick={() => onViewAttachment(atts, i)}
                      className="relative group w-10 h-10 rounded-lg overflow-hidden border border-gray-200 hover:border-blue-400 transition-all shrink-0"
                      title={att.label}
                    >
                      <img src={att.url} alt={att.label} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                        <ZoomIn className="w-3 h-3 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  ))}
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="w-10 h-10 rounded-lg border-2 border-dashed border-gray-200 hover:border-blue-400 flex items-center justify-center text-gray-400 hover:text-blue-500 transition-all"
                    title="Добавить фото"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleAttachFiles} />
                </div>
              </div>
            </div>
          )}

          {/* ── Tabs ── */}
          <div className="shrink-0 border-b border-gray-100 px-5">
            <div className="flex">
              {tabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                    tab === t.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t.label}
                  {t.badge !== undefined && t.badge > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${tab === t.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                      {t.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ── Tab content ── */}
          <div className="flex-1 overflow-hidden">
            {tab === 'chat' && (
              <ChatTab case_={case_} onSend={handleSendMessage} />
            )}
            {tab === 'refund' && (
              <div className="h-full overflow-y-auto">
                <RefundTab
                  case_={case_}
                  onApprove={handleApproveRefund}
                  onReject={handleRejectRefund}
                  onProcess={handleProcessRefund}
                />
              </div>
            )}
            {tab === 'timeline' && (
              <div className="h-full overflow-y-auto">
                <TimelineTab case_={case_} />
              </div>
            )}
            {tab === 'actions' && (
              <div className="h-full overflow-y-auto">
                <ActionsTab
                  case_={case_}
                  onUpdateStatus={s => onUpdateCase(case_.id, { status: s as any })}
                  onAddNote={handleAddNote}
                  onEscalate={handleEscalate}
                  onResolve={handleResolve}
                  onAssign={handleAssign}
                />
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return ReactDOM.createPortal(panel, document.body);
}
