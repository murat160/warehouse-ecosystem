import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Monitor, Users, MessageSquare, AlertTriangle, CheckCircle2,
  Clock, Hourglass, ArrowUpRight, RefreshCw, Activity,
  Inbox, Star, Timer, TrendingUp,
  Headphones, Bike, Store, Lock, Archive,
  ChevronRight, Shield, Filter, X,
  Wifi, WifiOff, Coffee, BarChart2,
  UserCheck, Bell, Phone, Mail, Eye, Hash,
  ThumbsDown, FileText, Tag, Calendar,
  ChevronDown, BarChart3, Info,
  Send, Paperclip, BookOpen, PenLine,
  UserPlus, Search, AlertCircle,
  CheckSquare, RotateCcw, ChevronUp, Image as ImageIcon,
} from 'lucide-react';
import {
  INITIAL_CONVERSATIONS,
  type Conversation, type ChatMessage, type ChatChannel, type AgentRole, type Priority,
} from '../../data/chat-mock';
import { emit } from '../../api/eventBus';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface AgentStatus {
  id: string;
  name: string;
  avatar: string;
  role: AgentRole;
  roleName: string;
  status: 'online' | 'break' | 'busy' | 'offline';
  activeChats: number;
  resolvedToday: number;
  avgResponseMin: number;
  csat: number;
  email: string;
  lastActivity: string;
}

interface ResolvedChat {
  id: string;
  agentId: string;
  clientName: string;
  subject: string;
  channel: ChatChannel;
  priority: Priority;
  closedAt: string;
  duration: number;
  csat?: number;
  resolutionCode: string;
  resolutionNote: string;
  orderRef?: string;
}

interface AuditEntry {
  id: string;
  convId: string;
  action: string;
  details: string;
  ts: string;
  actor: string;
}

// ─── Mock Resolved Chats ───────────────────────────────────────────────────────

const RESOLVED_CHATS: ResolvedChat[] = [
  { id: 'r001', agentId: 'l1_agent1', clientName: 'Дмитрий Соколов', subject: 'Не пришёл заказ #РТ-009', channel: 'support', priority: 'high', closedAt: '08:12', duration: 14, csat: 5, resolutionCode: 'REDELIVERY', resolutionNote: 'Организована повторная доставка.', orderRef: 'РТ-009' },
  { id: 'r002', agentId: 'l1_agent1', clientName: 'Светлана Новикова', subject: 'Вопрос по возврату', channel: 'support', priority: 'normal', closedAt: '08:41', duration: 9, csat: 5, resolutionCode: 'REFUND', resolutionNote: 'Возврат оформлен.' },
  { id: 'r003', agentId: 'l1_agent1', clientName: 'Кафе «Уют»', subject: 'Не отображается меню', channel: 'merchants', priority: 'high', closedAt: '09:05', duration: 22, csat: 4, resolutionCode: 'TECH_FIX', resolutionNote: 'Передали в тех. отдел.' },
  { id: 'r004', agentId: 'l1_agent1', clientName: 'Иван Петров', subject: 'Курьер не нашёл адрес', channel: 'support', priority: 'normal', closedAt: '09:33', duration: 7, csat: 5, resolutionCode: 'COURIER_REDIRECT', resolutionNote: 'Уточнили адрес.' },
  { id: 'r005', agentId: 'l1_agent1', clientName: 'Наталья Козлова', subject: 'Двойное списание', channel: 'support', priority: 'critical', closedAt: '10:02', duration: 18, csat: 5, resolutionCode: 'REFUND', resolutionNote: 'Инициирован возврат.' },
  { id: 'r006', agentId: 'l1_agent1', clientName: 'Пекарня «Хлеб»', subject: 'Вопросы интеграции', channel: 'merchants', priority: 'normal', closedAt: '10:28', duration: 31, csat: 4, resolutionCode: 'ESCALATED_RESOLVED', resolutionNote: 'Переведено к L2, решено.' },
  { id: 'r007', agentId: 'l1_agent1', clientName: 'Александра Морозова', subject: 'Изменение адреса', channel: 'support', priority: 'normal', closedAt: '10:55', duration: 5, csat: 5, resolutionCode: 'ADDRESS_CHANGE', resolutionNote: 'Адрес изменён.' },
  { id: 'r008', agentId: 'l1_agent1', clientName: 'TechStore MSK', subject: 'Задержка выплат', channel: 'merchants', priority: 'high', closedAt: '11:14', duration: 12, resolutionCode: 'FINANCE_SENT', resolutionNote: 'Заявка в финансовый отдел.' },
  { id: 'r009', agentId: 'l1_agent1', clientName: 'Курьер Алексей К.', subject: 'Навигация в приложении', channel: 'couriers', priority: 'high', closedAt: '11:28', duration: 8, csat: 5, resolutionCode: 'APP_RESTART', resolutionNote: 'Перезапуск решил проблему.' },
  { id: 'r010', agentId: 'l1_agent1', clientName: 'Иван Петров', subject: 'Статус не обновляется', channel: 'support', priority: 'low', closedAt: '11:39', duration: 4, csat: 5, resolutionCode: 'SYSTEM_SYNC', resolutionNote: 'Статус синхронизирован.' },
  { id: 'r011', agentId: 'l1_agent1', clientName: 'Курьер Михаил Д.', subject: 'Расчёт бонусов', channel: 'couriers', priority: 'normal', closedAt: '11:44', duration: 6, csat: 4, resolutionCode: 'EXPLAINED', resolutionNote: 'Условия разъяснены.' },
  { id: 'r012', agentId: 'l1_agent1', clientName: 'Светлана Новикова', subject: 'Промокод не работает', channel: 'support', priority: 'low', closedAt: '11:46', duration: 3, csat: 5, resolutionCode: 'PROMO_FIXED', resolutionNote: 'Промокод применён.' },
  { id: 'r013', agentId: 'l1_agent2', clientName: 'Александра Морозова', subject: 'Жалоба на упаковку', channel: 'support', priority: 'normal', closedAt: '08:20', duration: 11, csat: 4, resolutionCode: 'COMPLAINT_REG', resolutionNote: 'Жалоба зарегистрирована.' },
  { id: 'r014', agentId: 'l1_agent2', clientName: 'Дмитрий Соколов', subject: 'Ошибка при заказе', channel: 'support', priority: 'high', closedAt: '08:55', duration: 16, csat: 5, resolutionCode: 'ORDER_RECREATE', resolutionNote: 'Заказ переоформлен.' },
  { id: 'r021', agentId: 'l2_agent1', clientName: 'Пекарня «Хлеб»', subject: 'Юридический вопрос', channel: 'merchants', priority: 'high', closedAt: '08:30', duration: 42, csat: 5, resolutionCode: 'LEGAL_REVIEW', resolutionNote: 'Согласовано с юристами.' },
  { id: 'r026', agentId: 'lead1', clientName: 'Сеть «Ромашка»', subject: 'Переговоры о расширении', channel: 'merchants', priority: 'high', closedAt: '09:00', duration: 60, csat: 5, resolutionCode: 'AGREEMENT', resolutionNote: 'Соглашение подписано.' },
  { id: 'r029', agentId: 'fin1', clientName: 'Кафе «Уют»', subject: 'Задержка отчёта', channel: 'merchants', priority: 'normal', closedAt: '09:45', duration: 18, csat: 4, resolutionCode: 'REPORT_SENT', resolutionNote: 'Отчёт отправлен.' },
  { id: 'r031', agentId: 'log1', clientName: 'Курьер Михаил Д.', subject: 'Маршрут с задержками', channel: 'couriers', priority: 'normal', closedAt: '08:50', duration: 10, csat: 5, resolutionCode: 'ROUTE_OPTIMIZED', resolutionNote: 'Маршрут пересчитан.' },
];

// ─── Mock Agents ───────────────────────────────────────────────────────────────

const WALL_AGENTS: AgentStatus[] = [
  { id: 'l1_agent1', name: 'Козлова Елена', avatar: 'КЕ', role: 'l1', roleName: 'L1 Агент', status: 'online', activeChats: 4, resolvedToday: 12, avgResponseMin: 3, csat: 4.9, email: 'kozlova@platform.com', lastActivity: '11:47' },
  { id: 'l1_agent2', name: 'Смирнов Антон', avatar: 'СА', role: 'l1', roleName: 'L1 Агент', status: 'online', activeChats: 3, resolvedToday: 8, avgResponseMin: 5, csat: 4.7, email: 'smirnov@platform.com', lastActivity: '11:44' },
  { id: 'l2_agent1', name: 'Попова Ирина', avatar: 'ПИ', role: 'l2', roleName: 'L2 Агент', status: 'busy', activeChats: 2, resolvedToday: 5, avgResponseMin: 8, csat: 4.8, email: 'popova@platform.com', lastActivity: '11:38' },
  { id: 'lead1', name: 'Захаров Виктор', avatar: 'ЗВ', role: 'lead', roleName: 'Руководитель', status: 'online', activeChats: 1, resolvedToday: 3, avgResponseMin: 2, csat: 5.0, email: 'zakharov@platform.com', lastActivity: '11:45' },
  { id: 'fin1', name: 'Громова Анна', avatar: 'ГА', role: 'l2', roleName: 'Финансовый отдел', status: 'break', activeChats: 0, resolvedToday: 2, avgResponseMin: 12, csat: 4.6, email: 'gromova@platform.com', lastActivity: '11:20' },
  { id: 'log1', name: 'Орлов Сергей', avatar: 'ОС', role: 'l1', roleName: 'Логистика', status: 'online', activeChats: 1, resolvedToday: 4, avgResponseMin: 6, csat: 4.5, email: 'orlov@platform.com', lastActivity: '11:41' },
  { id: 'pvz1', name: 'Лебедева Мария', avatar: 'ЛМ', role: 'l1', roleName: 'Отдел ПВЗ', status: 'offline', activeChats: 0, resolvedToday: 0, avgResponseMin: 0, csat: 4.3, email: 'lebedeva@platform.com', lastActivity: '09:00' },
];

// ─── Quick Reply Templates ─────────────────────────────────────────────────────

const QUICK_TEMPLATES = [
  { id: 't1', label: 'Приветствие', text: 'Добрый день! Меня зовут Администратор Системы. Чем могу помочь?' },
  { id: 't2', label: 'Проверяю', text: 'Пожалуйста, подождите — я проверяю информацию по вашему запросу.' },
  { id: 't3', label: 'Нужны данные', text: 'Для уточнения информации укажите, пожалуйста, номер заказа или телефон.' },
  { id: 't4', label: 'Эскалация', text: 'Ваш запрос требует участия специалиста более высокого уровня. Передаю кейс.' },
  { id: 't5', label: 'Решено', text: 'Проблема успешно решена. Если остались вопросы — всегда готовы помочь!' },
  { id: 't6', label: 'Ожидание клиента', text: 'Мы ждём вашего ответа. Если не получим его в течение 24 часов, кейс будет закрыт.' },
];

// ─── Config ────────────────────────────────────────────────────────────────────

const CHANNEL_CFG: Record<ChatChannel, { label: string; icon: React.ElementType; color: string; bg: string; border: string }> = {
  support:   { label: 'Клиенты',    icon: Headphones, color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200' },
  couriers:  { label: 'Курьеры',    icon: Bike,       color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  merchants: { label: 'Партнёры',   icon: Store,      color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  internal:  { label: 'Внутренний', icon: Lock,       color: 'text-gray-600',   bg: 'bg-gray-50',   border: 'border-gray-200' },
  escalated: { label: 'Эскалация',  icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50',    border: 'border-red-200' },
  closed:    { label: 'Закрытые',   icon: Archive,    color: 'text-gray-400',   bg: 'bg-gray-50',   border: 'border-gray-200' },
};

const PRIORITY_CFG: Record<Priority, { label: string; dot: string; color: string; bg: string }> = {
  low:      { label: 'Низкий',    dot: 'bg-gray-400',   color: 'text-gray-500',   bg: 'bg-gray-100' },
  normal:   { label: 'Обычный',   dot: 'bg-blue-400',   color: 'text-blue-600',   bg: 'bg-blue-50' },
  high:     { label: 'Высокий',   dot: 'bg-orange-500', color: 'text-orange-600', bg: 'bg-orange-50' },
  critical: { label: 'Критичный', dot: 'bg-red-500',    color: 'text-red-600',    bg: 'bg-red-50' },
};

const STATUS_CFG: Record<AgentStatus['status'], { label: string; dot: string; bg: string; color: string; icon: React.ElementType }> = {
  online:  { label: 'Онлайн',  dot: 'bg-green-500', bg: 'bg-green-50',  color: 'text-green-700',  icon: Wifi },
  busy:    { label: 'Занят',   dot: 'bg-amber-500', bg: 'bg-amber-50',  color: 'text-amber-700',  icon: Activity },
  break:   { label: 'Перерыв', dot: 'bg-blue-400',  bg: 'bg-blue-50',   color: 'text-blue-600',   icon: Coffee },
  offline: { label: 'Офлайн',  dot: 'bg-gray-400',  bg: 'bg-gray-100',  color: 'text-gray-500',   icon: WifiOff },
};

const CONV_STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  open:             { label: 'Открыт',     color: 'text-blue-700',   bg: 'bg-blue-100' },
  pending:          { label: 'Ожидает',    color: 'text-yellow-700', bg: 'bg-yellow-100' },
  in_progress:      { label: 'В работе',   color: 'text-green-700',  bg: 'bg-green-100' },
  waiting_external: { label: 'Ждём ответа', color: 'text-purple-700', bg: 'bg-purple-100' },
  escalated:        { label: 'Эскалация',  color: 'text-red-700',    bg: 'bg-red-100' },
  resolved:         { label: 'Решён',      color: 'text-teal-700',   bg: 'bg-teal-100' },
  closed:           { label: 'Закрыт',     color: 'text-gray-600',   bg: 'bg-gray-100' },
};

const ROLE_COLOR: Record<AgentRole, string> = {
  l1:       'bg-green-100 text-green-700',
  l2:       'bg-blue-100 text-blue-700',
  lead:     'bg-purple-100 text-purple-700',
  admin:    'bg-red-100 text-red-700',
  readonly: 'bg-gray-100 text-gray-600',
};

const SLA_CFG: Record<'ok'|'warn'|'danger'|'critical', { color: string; bg: string; border: string; dot: string; label: string }> = {
  ok:       { color: 'text-gray-400',   bg: 'bg-gray-50',   border: 'border-gray-200',   dot: 'bg-gray-400',   label: 'В норме' },
  warn:     { color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-300', dot: 'bg-yellow-500', label: 'Внимание' },
  danger:   { color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-300', dot: 'bg-orange-500', label: 'Критично' },
  critical: { color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-300',    dot: 'bg-red-500',    label: 'SLA нарушен' },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function parseDate(str: string): Date {
  const [d, t = '00:00'] = str.split(' ');
  const [day, mon, yr] = d.split('.');
  const [h, m] = t.split(':');
  return new Date(+yr, +mon - 1, +day, +h, +m);
}

function elapsedMin(createdAt: string): number {
  return Math.max(0, Math.floor((Date.now() - parseDate(createdAt).getTime()) / 60000));
}

function formatElapsed(mins: number): string {
  if (mins < 60) return `${mins} мин`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} ч ${mins % 60} мин`;
  return `${Math.floor(h / 24)} дн`;
}

function slaLevel(mins: number): 'ok' | 'warn' | 'danger' | 'critical' {
  if (mins > 120) return 'critical';
  if (mins > 60)  return 'danger';
  if (mins > 30)  return 'warn';
  return 'ok';
}

function nowTime(): string {
  return new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

// ─── Full Chat Modal ───────────────────────────────────────────────────────────

interface FullChatModalProps {
  initialConvId: string;
  conversations: Conversation[];
  auditLog: AuditEntry[];
  onSendMessage: (convId: string, text: string, isInternal: boolean) => void;
  onAssign: (convId: string) => void;
  onCloseCase: (convId: string) => void;
  onEscalate: (convId: string) => void;
  onTransfer: (convId: string, agentId: string, agentName: string) => void;
  onReopen: (convId: string) => void;
  onClose: () => void;
}

function FullChatModal({
  initialConvId, conversations, auditLog,
  onSendMessage, onAssign, onCloseCase, onEscalate, onTransfer, onReopen, onClose,
}: FullChatModalProps) {
  const [selectedId, setSelectedId] = useState(initialConvId);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageText, setMessageText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [attachedFile, setAttachedFile] = useState<string | null>(null);
  const [liveSec, setLiveSec] = useState(0);
  const [showDetails, setShowDetails] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Live SLA timer every second
  useEffect(() => {
    const id = setInterval(() => setLiveSec(s => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const conv = conversations.find(c => c.id === selectedId);
  const elapsed = conv ? elapsedMin(conv.createdAt) : 0;
  const lvl = slaLevel(elapsed);
  const slaCfg = SLA_CFG[lvl];
  const agent = conv ? WALL_AGENTS.find(a => a.id === conv.assignedTo) : null;
  const pr = conv ? PRIORITY_CFG[conv.priority] : null;
  const ch = conv ? CHANNEL_CFG[conv.channel] : null;
  const convStatusCfg = conv ? (CONV_STATUS_LABELS[conv.status] ?? CONV_STATUS_LABELS.open) : null;

  const filteredConvs = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return conversations.filter(c => {
      if (!q) return true;
      return (
        c.clientName.toLowerCase().includes(q) ||
        c.subject.toLowerCase().includes(q) ||
        (c.orderRef?.toLowerCase().includes(q)) ||
        (c.id?.toLowerCase().includes(q)) ||
        (c.assignedToName?.toLowerCase().includes(q))
      );
    });
  }, [conversations, searchQuery]);

  useEffect(() => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, [selectedId, conv?.messages?.length]);

  const handleSend = () => {
    if ((!messageText.trim() && !attachedFile) || !conv) return;
    const text = messageText.trim() || (attachedFile ? `[Файл: ${attachedFile}]` : '');
    onSendMessage(conv.id, text, isInternal);
    setMessageText('');
    setAttachedFile(null);
    setIsInternal(false);
    setShowTemplates(false);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setAttachedFile(file.name);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) setAttachedFile(file.name);
  };

  const convAudit = auditLog.filter(a => a.convId === selectedId).slice(-5).reverse();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-blue-600 to-indigo-600 shrink-0">
          <div className="flex items-center gap-3">
            <Monitor className="w-5 h-5 text-white" />
            <div>
              <h2 className="font-bold text-white">Чат-центр</h2>
              <p className="text-xs text-blue-200">{conversations.filter(c => !['resolved','closed'].includes(c.status)).length} активных · Wallboard</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Body: 3 panels */}
        <div className="flex flex-1 min-h-0">

          {/* ── Left: Conversation List ── */}
          <div className="w-64 shrink-0 border-r flex flex-col bg-gray-50">
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Поиск по email, заказу, ID..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredConvs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-gray-400 text-xs">
                  <MessageSquare className="w-8 h-8 mb-2 opacity-30" />
                  Ничего не найдено
                </div>
              ) : (
                filteredConvs.map(c => {
                  const ch2 = CHANNEL_CFG[c.channel];
                  const ChIcon2 = ch2.icon;
                  const elapsed2 = elapsedMin(c.createdAt);
                  const lvl2 = slaLevel(elapsed2);
                  const slaCfg2 = SLA_CFG[lvl2];
                  const isActive = c.id === selectedId;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedId(c.id)}
                      className={`w-full text-left px-3 py-2.5 border-b border-gray-100 transition-colors ${isActive ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-white'}`}
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${ch2.bg} border ${ch2.border}`}>
                          <ChIcon2 className={`w-3 h-3 ${ch2.color}`} />
                        </div>
                        <p className={`text-xs truncate flex-1 ${c.unread > 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                          {c.clientName}
                        </p>
                        {c.unread > 0 && (
                          <span className="min-w-[16px] h-4 px-1 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shrink-0">
                            {c.unread}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 truncate pl-8">{c.subject}</p>
                      <div className="flex items-center justify-between mt-0.5 pl-8">
                        <span className={`text-[10px] font-medium ${slaCfg2.color}`}>{formatElapsed(elapsed2)}</span>
                        {!c.assignedTo && <span className="text-[10px] text-yellow-700 bg-yellow-100 px-1 rounded font-medium">Своб.</span>}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* ── Center: Message Thread ── */}
          <div className="flex-1 flex flex-col min-w-0">
            {!conv ? (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>Выберите чат из списка</p>
                </div>
              </div>
            ) : (
              <>
                {/* Conversation header */}
                <div className="px-4 py-2.5 border-b bg-white shrink-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-gray-900 text-sm truncate">{conv.clientName}</p>
                        {conv.orderRef && (
                          <span className="text-xs font-mono bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">{conv.orderRef}</span>
                        )}
                        {convStatusCfg && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${convStatusCfg.bg} ${convStatusCfg.color}`}>
                            {convStatusCfg.label}
                          </span>
                        )}
                        {pr && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${pr.bg} ${pr.color}`}>{pr.label}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{conv.subject}</p>
                    </div>
                    <div className={`flex items-center gap-1 text-xs font-bold ${slaCfg.color} shrink-0`}>
                      <Clock className="w-3.5 h-3.5" />
                      {formatElapsed(elapsed)}
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div
                  className={`flex-1 overflow-y-auto p-4 space-y-3 ${dragOver ? 'bg-blue-50 border-2 border-dashed border-blue-400' : ''}`}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                >
                  {dragOver && (
                    <div className="flex items-center justify-center py-8 text-blue-500 text-sm font-medium">
                      <Paperclip className="w-5 h-5 mr-2" />Отпустите файл для прикрепления
                    </div>
                  )}
                  {(conv.messages ?? []).map(msg => {
                    const isClient = ['client', 'courier', 'merchant'].includes(msg.senderRole);
                    const isBot = msg.senderRole === 'bot';
                    const isSystem = msg.type === 'system' || msg.type === 'escalation';

                    if (isSystem || isBot) {
                      return (
                        <div key={msg.id} className="flex justify-center">
                          <div className="bg-gray-100 rounded-full px-3 py-1 text-xs text-gray-500 flex items-center gap-1.5 max-w-sm text-center">
                            <Shield className="w-3 h-3 text-gray-400 shrink-0" />
                            {msg.systemText ?? msg.text}
                            <span className="text-gray-400 ml-1 shrink-0">{msg.timestamp}</span>
                          </div>
                        </div>
                      );
                    }

                    if (msg.isInternal) {
                      return (
                        <div key={msg.id} className="flex justify-center">
                          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 max-w-md">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Lock className="w-3 h-3 text-amber-600" />
                              <span className="text-[10px] font-bold text-amber-700">ВНУТРЕННЯЯ ЗАМЕТКА</span>
                              <span className="text-[10px] text-amber-500 ml-auto">{msg.timestamp}</span>
                            </div>
                            <p className="text-xs text-amber-800">{msg.text}</p>
                            <p className="text-[10px] text-amber-600 mt-0.5">{msg.senderName}</p>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={msg.id} className={`flex gap-2 ${isClient ? 'justify-start' : 'justify-end'}`}>
                        {isClient && (
                          <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600 shrink-0 mt-1">
                            {msg.senderName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                        )}
                        <div className={`max-w-[70%] rounded-2xl px-3 py-2 ${isClient ? 'bg-white border border-gray-200' : 'bg-blue-600 text-white'}`}>
                          {!isClient && (
                            <p className="text-[10px] text-blue-200 mb-0.5">{msg.senderName}</p>
                          )}
                          {msg.type === 'order_ref' ? (
                            <div className="flex items-center gap-1.5">
                              <Tag className="w-3 h-3" />
                              <span className="text-xs font-mono">{msg.orderRef ?? msg.text}</span>
                            </div>
                          ) : (
                            <p className="text-xs leading-relaxed">{msg.text}</p>
                          )}
                          <p className={`text-[10px] mt-1 ${isClient ? 'text-gray-400' : 'text-blue-200'}`}>{msg.timestamp}</p>
                        </div>
                        {!isClient && (
                          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-700 shrink-0 mt-1">
                            АС
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Attached file indicator */}
                {attachedFile && (
                  <div className="px-4 py-2 border-t bg-blue-50 flex items-center gap-2 shrink-0">
                    <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-xs text-blue-700 flex-1 truncate">{attachedFile}</span>
                    <button onClick={() => setAttachedFile(null)} className="p-0.5 hover:bg-blue-200 rounded">
                      <X className="w-3.5 h-3.5 text-blue-600" />
                    </button>
                  </div>
                )}

                {/* Templates panel */}
                {showTemplates && (
                  <div className="border-t bg-gray-50 p-3 shrink-0">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold text-gray-600 flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />Шаблоны</p>
                      <button onClick={() => setShowTemplates(false)}><X className="w-3.5 h-3.5 text-gray-400" /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {QUICK_TEMPLATES.map(t => (
                        <button
                          key={t.id}
                          onClick={() => { setMessageText(t.text); setShowTemplates(false); textareaRef.current?.focus(); }}
                          className="text-left px-3 py-2 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                        >
                          <p className="text-xs font-semibold text-gray-700">{t.label}</p>
                          <p className="text-[10px] text-gray-400 truncate mt-0.5">{t.text.slice(0, 50)}…</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input area */}
                <div className="border-t bg-white p-3 shrink-0">
                  <div className={`rounded-xl border-2 transition-colors ${isInternal ? 'border-amber-300 bg-amber-50' : 'border-gray-200 focus-within:border-blue-400'}`}>
                    <textarea
                      ref={textareaRef}
                      value={messageText}
                      onChange={e => setMessageText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      rows={2}
                      placeholder={isInternal ? '🔒 Внутренняя заметка (не видна клиенту)…' : 'Напишите сообщение… (Enter — отправить, Shift+Enter — новая строка)'}
                      className={`w-full px-3 pt-2 pb-1 text-sm resize-none focus:outline-none rounded-t-xl ${isInternal ? 'bg-amber-50 placeholder-amber-500' : 'bg-white'}`}
                    />
                    <div className="flex items-center gap-1.5 px-2 pb-2">
                      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        title="Прикрепить файл"
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { setAttachedFile('screenshot.png'); }}
                        title="Прикрепить скриншот"
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
                      >
                        <ImageIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setShowTemplates(p => !p)}
                        title="Шаблоны сообщений"
                        className={`p-1.5 rounded-lg transition-colors ${showTemplates ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'}`}
                      >
                        <BookOpen className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setIsInternal(p => !p)}
                        title="Внутренняя заметка"
                        className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium ${isInternal ? 'bg-amber-100 text-amber-700' : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'}`}
                      >
                        <PenLine className="w-4 h-4" />
                        {isInternal && 'Заметка'}
                      </button>
                      <div className="flex-1" />
                      <button
                        onClick={handleSend}
                        disabled={!messageText.trim() && !attachedFile}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 disabled:bg-gray-300 text-white rounded-lg text-xs font-semibold transition-colors hover:bg-blue-700"
                      >
                        <Send className="w-3.5 h-3.5" />Отправить
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── Right: Case Details & Actions ── */}
          {conv && (
            <div className="w-72 shrink-0 border-l flex flex-col bg-gray-50 overflow-y-auto">
              <div className="px-4 py-3 border-b bg-white">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Детали кейса</p>
                  <button onClick={() => setShowDetails(p => !p)} className="p-1 hover:bg-gray-100 rounded">
                    {showDetails ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 font-mono mt-0.5">{conv.id}</p>
              </div>

              <div className="p-3 space-y-3 flex-1">
                {/* SLA Block */}
                <div className={`rounded-xl border p-3 ${slaCfg.bg} ${slaCfg.border}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Clock className={`w-4 h-4 ${slaCfg.color}`} />
                      <span className={`font-bold text-sm ${slaCfg.color}`}>{formatElapsed(elapsed)}</span>
                    </div>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${slaCfg.bg} ${slaCfg.color} border ${slaCfg.border}`}>
                      {slaCfg.label}
                    </span>
                  </div>
                  {lvl === 'critical' && (
                    <div className="flex items-center gap-1 mt-2 text-red-600 text-xs font-medium animate-pulse">
                      <AlertTriangle className="w-3.5 h-3.5" />SLA нарушен — требуется действие
                    </div>
                  )}
                </div>

                {/* Status + Priority */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white rounded-lg border border-gray-200 p-2 text-center">
                    {convStatusCfg && (
                      <span className={`text-xs font-semibold ${convStatusCfg.color}`}>{convStatusCfg.label}</span>
                    )}
                    <p className="text-[10px] text-gray-400 mt-0.5">Статус</p>
                  </div>
                  {pr && (
                    <div className={`rounded-lg border p-2 text-center ${pr.bg}`}>
                      <span className={`text-xs font-semibold ${pr.color}`}>{pr.label}</span>
                      <p className="text-[10px] text-gray-400 mt-0.5">Приоритет</p>
                    </div>
                  )}
                </div>

                {/* Assigned Agent */}
                <div className="bg-white rounded-xl border border-gray-200 p-3">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <UserCheck className="w-3 h-3 text-blue-500" />Оператор
                  </p>
                  {agent ? (
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs ${agent.status === 'offline' ? 'bg-gray-400' : 'bg-blue-600'}`}>
                        {agent.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate">{agent.name}</p>
                        <div className="flex items-center gap-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${STATUS_CFG[agent.status].dot}`} />
                          <span className={`text-[10px] ${STATUS_CFG[agent.status].color}`}>{STATUS_CFG[agent.status].label}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-2">
                      <div className="flex items-center gap-1.5 text-yellow-700 text-xs font-medium mb-2">
                        <AlertCircle className="w-3.5 h-3.5" />Не назначен
                      </div>
                      <button
                        onClick={() => onAssign(conv.id)}
                        className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-xs font-semibold transition-colors"
                      >
                        <UserPlus className="w-3.5 h-3.5" />Взять в работу
                      </button>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="bg-white rounded-xl border border-gray-200 p-3">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Действия</p>
                  <div className="space-y-1.5">
                    {!conv.assignedTo && (
                      <button
                        onClick={() => onAssign(conv.id)}
                        className="w-full flex items-center gap-2 px-2.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors"
                      >
                        <UserPlus className="w-3.5 h-3.5" />Взять в свою работу
                      </button>
                    )}
                    {!['resolved','closed'].includes(conv.status) && (
                      <>
                        <button
                          onClick={() => setShowTransfer(p => !p)}
                          className="w-full flex items-center gap-2 px-2.5 py-2 border border-gray-200 hover:bg-gray-50 rounded-lg text-xs font-medium text-gray-700 transition-colors"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5 text-purple-500" />Передать оператору
                        </button>
                        {showTransfer && (
                          <div className="border border-gray-200 rounded-lg overflow-hidden">
                            {WALL_AGENTS.filter(a => a.status !== 'offline' && a.id !== conv.assignedTo).map(a => (
                              <button
                                key={a.id}
                                onClick={() => { onTransfer(conv.id, a.id, a.name); setShowTransfer(false); }}
                                className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-0 flex items-center gap-2 transition-colors"
                              >
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white bg-blue-600`}>
                                  {a.avatar.slice(0,1)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-gray-800 truncate">{a.name}</p>
                                  <p className="text-[10px] text-gray-400">{a.roleName} · {a.activeChats} чатов</p>
                                </div>
                                <div className={`w-1.5 h-1.5 rounded-full ${STATUS_CFG[a.status].dot} shrink-0`} />
                              </button>
                            ))}
                          </div>
                        )}
                        <button
                          onClick={() => onEscalate(conv.id)}
                          className="w-full flex items-center gap-2 px-2.5 py-2 border border-orange-200 hover:bg-orange-50 rounded-lg text-xs font-medium text-orange-700 transition-colors"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />Эскалировать
                        </button>
                        <button
                          onClick={() => onCloseCase(conv.id)}
                          className="w-full flex items-center gap-2 px-2.5 py-2 border border-green-200 hover:bg-green-50 rounded-lg text-xs font-medium text-green-700 transition-colors"
                        >
                          <CheckSquare className="w-3.5 h-3.5" />Закрыть кейс
                        </button>
                      </>
                    )}
                    {['resolved','closed'].includes(conv.status) && (
                      <button
                        onClick={() => onReopen(conv.id)}
                        className="w-full flex items-center gap-2 px-2.5 py-2 border border-blue-200 hover:bg-blue-50 rounded-lg text-xs font-medium text-blue-700 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />Переоткрыть
                      </button>
                    )}
                  </div>
                </div>

                {/* Tags */}
                {conv.tags.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-3">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Tag className="w-3 h-3" />Теги
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {conv.tags.map(t => (
                        <span key={t} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{t}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Meta */}
                <div className="bg-white rounded-xl border border-gray-200 p-3">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Мета</p>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Создан:</span>
                      <span className="font-medium text-gray-700">{conv.createdAt}</span>
                    </div>
                    {conv.orderRef && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Заказ:</span>
                        <span className="font-mono font-medium text-blue-600">{conv.orderRef}</span>
                      </div>
                    )}
                    {conv.linkedEntity && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Связан с:</span>
                        <span className="font-medium text-indigo-600">{conv.linkedEntity}</span>
                      </div>
                    )}
                    {ch && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Канал:</span>
                        <span className={`font-medium ${ch.color}`}>{ch.label}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-400">Сообщений:</span>
                      <span className="font-medium text-gray-700">{conv.messages?.length ?? 0}</span>
                    </div>
                  </div>
                </div>

                {/* Audit log for this case */}
                {convAudit.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-3">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Shield className="w-3 h-3 text-blue-400" />Журнал действий
                    </p>
                    <div className="space-y-1.5">
                      {convAudit.map(a => (
                        <div key={a.id} className="text-[10px]">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-gray-700">{a.action}</span>
                            <span className="text-gray-400">{a.ts}</span>
                          </div>
                          <p className="text-gray-400 truncate">{a.details}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Resolved Chat Row ─────────────────────────────────────────────────────────

function ResolvedChatRow({ chat }: { chat: ResolvedChat }) {
  const ch = CHANNEL_CFG[chat.channel];
  const ChIcon = ch.icon;
  const pr = PRIORITY_CFG[chat.priority];

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${ch.bg} ${ch.border}`}>
        <ChIcon className={`w-4 h-4 ${ch.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-900 truncate">{chat.clientName}</p>
          {chat.orderRef && <span className="text-xs font-mono text-blue-600">{chat.orderRef}</span>}
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 ${pr.bg} ${pr.color}`}>{pr.label}</span>
        </div>
        <p className="text-xs text-gray-600 truncate mt-0.5">{chat.subject}</p>
        <p className="text-xs text-gray-400 mt-1 italic truncate">Итог: {chat.resolutionNote}</p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">{chat.resolutionCode}</span>
          <span className="text-[10px] text-gray-400 flex items-center gap-0.5"><Clock className="w-3 h-3" />{chat.duration} мин</span>
          <span className="text-[10px] text-gray-400 flex items-center gap-0.5"><Calendar className="w-3 h-3" />{chat.closedAt}</span>
        </div>
      </div>
      <div className="shrink-0 text-right">
        {chat.csat !== undefined ? (
          <div className={`flex items-center gap-0.5 justify-end font-bold text-sm ${chat.csat >= 4 ? 'text-green-600' : chat.csat >= 3 ? 'text-yellow-600' : 'text-red-600'}`}>
            <Star className="w-3.5 h-3.5" />{chat.csat}
          </div>
        ) : (
          <span className="text-xs text-gray-300">—</span>
        )}
        <p className="text-[10px] text-gray-400 mt-0.5">CSAT</p>
      </div>
    </div>
  );
}

// ─── Agent Detail Modal ────────────────────────────────────────────────────────

function AgentDetailModal({ agent, activeConvs, onClose, onOpenChat }: {
  agent: AgentStatus; activeConvs: Conversation[]; onClose: () => void; onOpenChat: (id: string) => void;
}) {
  const [tab, setTab] = useState<'overview' | 'resolved' | 'active'>('overview');
  const st = STATUS_CFG[agent.status];
  const StIcon = st.icon;
  const resolvedChats = RESOLVED_CHATS.filter(c => c.agentId === agent.id);

  const avgCsat = resolvedChats.filter(c => c.csat !== undefined).length
    ? (resolvedChats.filter(c => c.csat !== undefined).reduce((s, c) => s + (c.csat ?? 0), 0) / resolvedChats.filter(c => c.csat !== undefined).length).toFixed(1)
    : '—';
  const totalTime = resolvedChats.reduce((s, c) => s + c.duration, 0);
  const avgTime = resolvedChats.length ? Math.round(totalTime / resolvedChats.length) : 0;

  const byChannel = Object.entries(
    resolvedChats.reduce<Record<string, number>>((acc, c) => {
      acc[c.channel] = (acc[c.channel] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  const tabs = [
    { key: 'overview', label: 'Обзор', icon: BarChart3 },
    { key: 'resolved', label: `Закрытые (${resolvedChats.length})`, icon: CheckCircle2 },
    { key: 'active', label: `Активные (${activeConvs.length})`, icon: MessageSquare },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 flex items-start justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-lg ${agent.status === 'offline' ? 'bg-gray-400' : 'bg-blue-600'}`}>
                {agent.avatar}
              </div>
              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${st.dot}`} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">{agent.name}</h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLOR[agent.role]}`}>{agent.roleName}</span>
                <span className={`text-xs flex items-center gap-1 ${st.color}`}>
                  <StIcon className="w-3 h-3" />{st.label}
                  {agent.status !== 'offline' && <span className="text-gray-400">· {agent.lastActivity}</span>}
                </span>
              </div>
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-1"><Mail className="w-3 h-3" />{agent.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors shrink-0">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="flex border-b px-6 gap-1">
          {tabs.map(t => {
            const TIcon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-3 py-3 text-xs font-medium border-b-2 transition-colors -mb-px ${tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                <TIcon className="w-3.5 h-3.5" />{t.label}
              </button>
            );
          })}
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          {tab === 'overview' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Активных чатов', value: agent.activeChats, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
                  { label: 'Закрыто сегодня', value: resolvedChats.length, color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
                  { label: 'Ср. время', value: avgTime > 0 ? `${avgTime} мин` : '—', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
                  { label: 'CSAT', value: avgCsat !== '—' ? `${avgCsat} ★` : '—', color: agent.csat >= 4.5 ? 'text-green-700' : 'text-orange-700', bg: 'bg-yellow-50 border-yellow-200' },
                ].map(s => (
                  <button key={s.label}
                    onClick={() => toast.info(s.label, { description: `${agent.name}: ${s.value}` })}
                    className={`rounded-xl border p-3 text-center cursor-pointer hover:shadow-sm active:scale-[0.97] transition-all ${s.bg}`}
                  >
                    <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
                  </button>
                ))}
              </div>
              {byChannel.length > 0 && (
                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <BarChart2 className="w-3.5 h-3.5 text-blue-500" />Закрыто по каналам
                  </p>
                  <div className="space-y-2">
                    {byChannel.map(([ch, cnt]) => {
                      const cfg = CHANNEL_CFG[ch as ChatChannel];
                      const ChIcon = cfg.icon;
                      const pct = Math.round((cnt / resolvedChats.length) * 100);
                      return (
                        <div key={ch}>
                          <div className="flex items-center justify-between mb-1">
                            <div className={`flex items-center gap-1.5 text-xs ${cfg.color}`}>
                              <ChIcon className="w-3 h-3" />{cfg.label}
                            </div>
                            <span className="text-xs font-bold text-gray-700">{cnt} <span className="text-gray-400 font-normal">({pct}%)</span></span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${ch === 'support' ? 'bg-blue-500' : ch === 'couriers' ? 'bg-orange-500' : ch === 'merchants' ? 'bg-purple-500' : 'bg-gray-500'}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="rounded-xl border border-gray-200 p-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-green-500" />Итоги смены
                </p>
                <div className="space-y-2">
                  {[
                    { label: 'Общее время обработки', value: `${totalTime} мин` },
                    { label: 'Ср. время на чат', value: avgTime > 0 ? `${avgTime} мин` : '—' },
                    { label: 'Ср. время ответа', value: agent.avgResponseMin > 0 ? `${agent.avgResponseMin} мин` : '—' },
                    { label: 'Рейтинг CSAT', value: avgCsat !== '—' ? `${avgCsat}/5` : '—' },
                  ].map(r => (
                    <div key={r.label} className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">{r.label}</span>
                      <span className="font-bold text-gray-700">{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'resolved' && (
            <div className="space-y-2">
              {resolvedChats.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Archive className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-sm">Нет закрытых чатов за сегодня</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-gray-500">{resolvedChats.length} закрытых за сегодня</p>
                    <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />Все решены
                    </div>
                  </div>
                  {resolvedChats.map(chat => <ResolvedChatRow key={chat.id} chat={chat} />)}
                </>
              )}
            </div>
          )}

          {tab === 'active' && (
            <div className="space-y-2">
              {activeConvs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <MessageSquare className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-sm">Нет активных чатов</p>
                </div>
              ) : (
                activeConvs.map(conv => {
                  const ch = CHANNEL_CFG[conv.channel];
                  const ChIcon = ch.icon;
                  const pr = PRIORITY_CFG[conv.priority];
                  const elapsed = elapsedMin(conv.createdAt);
                  const slaCfg = SLA_CFG[slaLevel(elapsed)];

                  return (
                    <button
                      key={conv.id}
                      onClick={() => { onClose(); onOpenChat(conv.id); }}
                      className="w-full flex items-start gap-3 p-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all text-left"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${ch.bg} ${ch.border}`}>
                        <ChIcon className={`w-4 h-4 ${ch.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-900 truncate">{conv.clientName}</p>
                          {conv.orderRef && <span className="text-xs font-mono text-blue-600">{conv.orderRef}</span>}
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${pr.bg} ${pr.color}`}>{pr.label}</span>
                        </div>
                        <p className="text-xs text-gray-600 truncate mt-0.5">{conv.subject}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={`text-xs font-bold ${slaCfg.color}`}>{formatElapsed(elapsed)}</p>
                        <p className={`text-[10px] ${slaCfg.color}`}>{slaCfg.label}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t bg-gray-50 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors">
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Stat Detail Modal ─────────────────────────────────────────────────────────

function StatDetailModal({ title, conversations, onClose, onOpenChat, emptyText = 'Нет данных' }: {
  title: string; conversations: Conversation[]; onClose: () => void; onOpenChat: (id: string) => void; emptyText?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-500" />{title}
            <span className="text-sm font-normal text-gray-500">({conversations.length})</span>
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <CheckCircle2 className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm">{emptyText}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {conversations.map(conv => {
                const ch = CHANNEL_CFG[conv.channel];
                const ChIcon = ch.icon;
                const pr = PRIORITY_CFG[conv.priority];
                const elapsed = elapsedMin(conv.createdAt);
                const slaCfg = SLA_CFG[slaLevel(elapsed)];
                return (
                  <button
                    key={conv.id}
                    onClick={() => { onClose(); onOpenChat(conv.id); }}
                    className="w-full flex items-start gap-3 px-5 py-3.5 hover:bg-blue-50 transition-colors text-left"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${ch.bg} ${ch.border}`}>
                      <ChIcon className={`w-3.5 h-3.5 ${ch.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900 truncate">{conv.clientName}</p>
                        {conv.orderRef && <span className="text-xs font-mono text-blue-600">{conv.orderRef}</span>}
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 ${pr.bg} ${pr.color}`}>{pr.label}</span>
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{conv.subject}</p>
                      {conv.assignedToName
                        ? <span className="text-xs text-green-600 flex items-center gap-0.5 mt-0.5"><UserCheck className="w-3 h-3" />{conv.assignedToName}</span>
                        : <span className="text-xs text-yellow-700 mt-0.5">Не назначен</span>
                      }
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`text-xs font-bold ${slaCfg.color}`}>{formatElapsed(elapsed)}</p>
                      <p className={`text-[10px] ${slaCfg.color}`}>{slaCfg.label}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 shrink-0 self-center" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="px-6 py-3 border-t bg-gray-50 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors">
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Agent Card ────────────────────────────────────────────────────────────────

function AgentCard({ agent, convCount, onClick }: { agent: AgentStatus; convCount: number; onClick: () => void }) {
  const st = STATUS_CFG[agent.status];
  const StIcon = st.icon;
  const isOffline = agent.status === 'offline';

  return (
    <button
      onClick={onClick}
      className={`w-full bg-white rounded-2xl border-2 p-4 flex flex-col gap-3 transition-all text-left ${isOffline ? 'border-gray-200 opacity-60 cursor-default' : 'border-gray-200 hover:border-blue-300 hover:shadow-md cursor-pointer'}`}
    >
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm ${isOffline ? 'bg-gray-400' : 'bg-blue-600'}`}>
            {agent.avatar}
          </div>
          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${st.dot}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">{agent.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${ROLE_COLOR[agent.role]}`}>{agent.roleName}</span>
          </div>
          <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${st.color}`}>
            <StIcon className="w-3 h-3" />{st.label}
            {agent.status !== 'offline' && <span className="text-gray-400 font-normal">· {agent.lastActivity}</span>}
          </div>
        </div>
        {!isOffline && <Eye className="w-3.5 h-3.5 text-gray-300 shrink-0 mt-0.5" />}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className={`p-2 rounded-xl text-center border ${agent.activeChats > 0 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
          <p className={`text-lg font-bold ${agent.activeChats > 0 ? 'text-blue-700' : 'text-gray-400'}`}>{agent.activeChats}</p>
          <p className="text-[10px] text-gray-500">чатов сейчас</p>
        </div>
        <div className="p-2 rounded-xl text-center bg-green-50 border border-green-200">
          <p className="text-lg font-bold text-green-700">{agent.resolvedToday}</p>
          <p className="text-[10px] text-gray-500">закрыто сег.</p>
        </div>
      </div>

      {agent.status !== 'offline' && (
        <div className="flex items-center justify-between text-xs text-gray-500 border-t border-gray-100 pt-2">
          <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-500" />CSAT {agent.csat > 0 ? `${agent.csat}/5` : '—'}</span>
          <span className="flex items-center gap-1"><Timer className="w-3 h-3 text-blue-400" />{agent.avgResponseMin > 0 ? `${agent.avgResponseMin} мин` : '—'}</span>
          {convCount > 0 && (
            <span className="flex items-center gap-1 text-violet-600 font-semibold"><MessageSquare className="w-3 h-3" />{convCount} в оч.</span>
          )}
        </div>
      )}
    </button>
  );
}

// ─── SLA Row ───────────────────────────────────────────────────────────────────

function SLARow({ conv, elapsed, onClick }: { conv: Conversation; elapsed: number; onClick: () => void }) {
  const lvl = slaLevel(elapsed);
  const slaCfg = SLA_CFG[lvl];
  const ch = CHANNEL_CFG[conv.channel];
  const ChIcon = ch.icon;
  const pr = PRIORITY_CFG[conv.priority];

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all hover:shadow-sm group ${slaCfg.border} ${slaCfg.bg}`}
    >
      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${slaCfg.dot} ${lvl === 'critical' ? 'animate-pulse' : ''}`} />
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${ch.bg} border ${ch.border}`}>
        <ChIcon className={`w-4 h-4 ${ch.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <p className="text-sm font-semibold text-gray-900 truncate">{conv.clientName}</p>
          {conv.orderRef && <span className="text-xs font-mono text-blue-600 shrink-0">{conv.orderRef}</span>}
        </div>
        <p className="text-xs text-gray-500 truncate">{conv.subject}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {conv.assignedToName
            ? <span className="text-xs text-green-600 flex items-center gap-0.5"><UserCheck className="w-3 h-3" />{conv.assignedToName}</span>
            : <span className="text-xs text-yellow-700 bg-yellow-100 px-1.5 py-0.5 rounded-full font-medium">Не назначен</span>
          }
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${pr.bg} ${pr.color}`}>{pr.label}</span>
          {conv.status === 'escalated' && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-medium flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3" />L{conv.escalationLevel}
            </span>
          )}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className={`flex items-center gap-1 font-bold text-sm ${slaCfg.color}`}>
          {lvl === 'critical' ? <AlertTriangle className="w-3.5 h-3.5" /> : lvl === 'danger' ? <Hourglass className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
          {formatElapsed(elapsed)}
        </div>
        <p className={`text-[10px] font-semibold ${slaCfg.color}`}>{slaCfg.label}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 shrink-0 transition-colors" />
    </button>
  );
}

// ─── Channel Distribution ──────────────────────────────────────────────────────

function ChannelBar({ conversations, filterChannel, onFilter }: {
  conversations: Conversation[]; filterChannel: ChatChannel | 'all'; onFilter: (ch: ChatChannel | 'all') => void;
}) {
  const active = conversations.filter(c => !['resolved', 'closed'].includes(c.status));
  const total = active.length || 1;
  const channels: ChatChannel[] = ['support', 'couriers', 'merchants', 'internal', 'escalated'];
  const counts = channels.map(ch => ({
    ch, count: active.filter(c => c.channel === ch || (ch === 'escalated' && c.status === 'escalated')).length,
  })).filter(x => x.count > 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
        <BarChart2 className="w-3.5 h-3.5 text-blue-500" />Загрузка по каналам
        {filterChannel !== 'all' && (
          <button onClick={() => onFilter('all')} className="ml-auto text-blue-500 hover:text-blue-700 flex items-center gap-0.5">
            <X className="w-3 h-3" />сброс
          </button>
        )}
      </p>
      <div className="space-y-2.5">
        {counts.map(({ ch, count }) => {
          const cfg = CHANNEL_CFG[ch];
          const ChIcon = cfg.icon;
          const pct = Math.round((count / total) * 100);
          const isSelected = filterChannel === ch;
          return (
            <button
              key={ch}
              onClick={() => onFilter(isSelected ? 'all' : ch)}
              className={`w-full text-left transition-all rounded-lg p-1 -m-1 ${isSelected ? 'ring-2 ring-blue-400 bg-blue-50' : 'hover:bg-gray-50'}`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className={`flex items-center gap-1.5 text-xs ${cfg.color}`}><ChIcon className="w-3 h-3" />{cfg.label}</div>
                <span className="text-xs font-bold text-gray-700">{count} <span className="text-gray-400 font-normal">({pct}%)</span></span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${ch === 'support' ? 'bg-blue-500' : ch === 'couriers' ? 'bg-orange-500' : ch === 'merchants' ? 'bg-purple-500' : ch === 'internal' ? 'bg-gray-500' : 'bg-red-500'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main WallBoard ────────────────────────────────────────────────────────────

export function WallBoard() {
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);
  const [agents] = useState<AgentStatus[]>(WALL_AGENTS);
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [filterSLA, setFilterSLA] = useState<'all' | 'warn' | 'danger' | 'critical'>('all');
  const [filterChannel, setFilterChannel] = useState<ChatChannel | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showOffline, setShowOffline] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const lastRefresh = useRef(new Date());

  // Modal state
  const [selectedAgent, setSelectedAgent] = useState<AgentStatus | null>(null);
  const [chatConvId, setChatConvId] = useState<string | null>(null);
  const [statModal, setStatModal] = useState<{ title: string; convs: Conversation[] } | null>(null);

  // Live tick every 15s for SLA recalculation
  useEffect(() => {
    const id = setInterval(() => {
      setTick(t => t + 1);
      lastRefresh.current = new Date();
    }, 15_000);
    return () => clearInterval(id);
  }, []);

  // Simulate real-time events
  useEffect(() => {
    const events = [
      { delay: 8000, type: 'MESSAGE_RECEIVED', convId: 'c003', text: 'Есть ли скидки для постоянных клиентов?' },
      { delay: 20000, type: 'CASE_ESCALATED', convId: 'c005', text: '' },
    ];
    const timers = events.map(({ delay, type, convId, text }) =>
      setTimeout(() => {
        if (type === 'MESSAGE_RECEIVED' && text) {
          handleSendMessage(convId, text, false, 'Клиент');
        }
        emit('TICKET_ASSIGNED', { convId, event: type });
        setTick(t => t + 1);
      }, delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const timeStr = useCallback(() =>
    lastRefresh.current.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    [tick],
  );

  // ── Audit helpers ──
  const addAudit = useCallback((entry: Omit<AuditEntry, 'id' | 'ts' | 'actor'>) => {
    setAuditLog(prev => [{
      ...entry,
      id: `a_${Date.now()}`,
      ts: nowTime(),
      actor: 'Администратор Системы',
    }, ...prev].slice(0, 200));
  }, []);

  // ── Mutations ──
  const handleSendMessage = useCallback((convId: string, text: string, isInternal: boolean, senderOverride?: string) => {
    const newMsg: ChatMessage = {
      id: `m_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      conversationId: convId,
      senderId: senderOverride ? convId : 'admin1',
      senderName: senderOverride ?? 'Администратор Системы',
      senderRole: senderOverride ? 'client' : 'admin',
      text,
      type: 'text',
      timestamp: nowTime(),
      read: true,
      isInternal,
    };
    setConversations(prev => prev.map(c => c.id === convId ? {
      ...c,
      messages: [...(c.messages ?? []), newMsg],
      lastMessage: text,
      lastMessageTime: newMsg.timestamp,
      unread: senderOverride ? (c.unread + 1) : 0,
    } : c));
    if (!senderOverride) {
      addAudit({ convId, action: isInternal ? 'Внутренняя заметка' : 'Сообщение отправлено', details: text.slice(0, 80) });
      emit('TICKET_ASSIGNED', { convId, text });
    }
  }, [addAudit]);

  const handleAssign = useCallback((convId: string) => {
    setConversations(prev => prev.map(c => c.id === convId ? {
      ...c, assignedTo: 'admin1', assignedToName: 'Администратор Системы', status: 'in_progress',
    } : c));
    addAudit({ convId, action: 'Взят в работу', details: 'Кейс назначен на Администратор Системы' });
    emit('TICKET_ASSIGNED', { convId });
  }, [addAudit]);

  const handleCloseCase = useCallback((convId: string) => {
    setConversations(prev => prev.map(c => c.id === convId ? {
      ...c, status: 'resolved', resolvedAt: new Date().toLocaleString('ru-RU'),
    } : c));
    addAudit({ convId, action: 'Кейс закрыт', details: 'Статус изменён на resolved' });
    emit('TICKET_RESOLVED', { convId });
  }, [addAudit]);

  const handleEscalate = useCallback((convId: string) => {
    setConversations(prev => prev.map(c => c.id === convId ? {
      ...c, status: 'escalated', priority: 'critical', escalationLevel: (c.escalationLevel ?? 1) + 1,
    } : c));
    addAudit({ convId, action: 'Эскалирован', details: 'Кейс эскалирован, приоритет → Критичный' });
    emit('TICKET_ESCALATED', { convId });
  }, [addAudit]);

  const handleTransfer = useCallback((convId: string, agentId: string, agentName: string) => {
    setConversations(prev => prev.map(c => c.id === convId ? {
      ...c, assignedTo: agentId, assignedToName: agentName, status: 'in_progress',
      routedTo: agentName, routedAt: nowTime(),
    } : c));
    addAudit({ convId, action: 'Передан оператору', details: `Передан: ${agentName}` });
  }, [addAudit]);

  const handleReopen = useCallback((convId: string) => {
    setConversations(prev => prev.map(c => c.id === convId ? {
      ...c, status: 'open', resolvedAt: undefined,
    } : c));
    addAudit({ convId, action: 'Переоткрыт', details: 'Кейс переоткрыт' });
  }, [addAudit]);

  const handleRefresh = () => {
    setTick(t => t + 1);
    lastRefresh.current = new Date();
    addAudit({ convId: 'global', action: 'Обновление данных', details: 'Wallboard обновлён вручную' });
  };

  // ── Derived data ──
  const active = useMemo(() =>
    conversations.filter(c => !c.routedAway && !['resolved', 'closed'].includes(c.status)),
    [conversations, tick],
  );

  const withElapsed = useMemo(() =>
    active.map(c => ({ c, elapsed: elapsedMin(c.createdAt) })).sort((a, b) => b.elapsed - a.elapsed),
    [active, tick],
  );

  const slaAlerts = useMemo(() => withElapsed.filter(({ elapsed }) => slaLevel(elapsed) !== 'ok'), [withElapsed]);

  const filteredQueue = useMemo(() => {
    let list = withElapsed;
    // Global search
    if (globalSearch) {
      const q = globalSearch.toLowerCase();
      list = list.filter(({ c }) =>
        c.clientName.toLowerCase().includes(q) ||
        c.subject.toLowerCase().includes(q) ||
        (c.orderRef?.toLowerCase().includes(q)) ||
        (c.id.toLowerCase().includes(q)) ||
        (c.assignedToName?.toLowerCase().includes(q)) ||
        (c.linkedEntity?.toLowerCase().includes(q))
      );
    }
    if (filterStatus !== 'all') list = list.filter(({ c }) => c.status === filterStatus);
    if (filterSLA !== 'all') list = list.filter(({ elapsed }) => slaLevel(elapsed) === filterSLA);
    if (filterChannel !== 'all') list = list.filter(({ c }) => c.channel === filterChannel);
    return list;
  }, [withElapsed, filterSLA, filterChannel, filterStatus, globalSearch]);

  const stats = useMemo(() => ({
    totalActive: active.length,
    open:        active.filter(c => c.status === 'open').length,
    inProgress:  active.filter(c => c.status === 'in_progress').length,
    waiting:     active.filter(c => c.status === 'waiting_external').length,
    escalated:   active.filter(c => c.status === 'escalated').length,
    unassigned:  active.filter(c => !c.assignedTo).length,
    slaBreached: slaAlerts.filter(({ elapsed }) => slaLevel(elapsed) === 'critical').length,
    onlineAgents: agents.filter(a => a.status === 'online').length,
    avgCsat: (() => {
      const cs = agents.filter(a => a.csat > 0);
      return cs.length ? (cs.reduce((s, a) => s + a.csat, 0) / cs.length).toFixed(1) : '—';
    })(),
    totalResolved: agents.reduce((s, a) => s + a.resolvedToday, 0),
  }), [active, slaAlerts, agents, tick]);

  const visibleAgents = showOffline ? agents : agents.filter(a => a.status !== 'offline');

  type KpiCard = { label: string; value: number | string; icon: React.ElementType; color: string; statusFilter?: string; onClick: () => void };
  const kpiCards: KpiCard[] = [
    { label: 'Всего активных', value: stats.totalActive, icon: MessageSquare, color: 'blue', statusFilter: 'all',
      onClick: () => { setFilterStatus('all'); setStatModal({ title: 'Все активные чаты', convs: active }); } },
    { label: 'Открытых', value: stats.open, icon: Inbox, color: 'indigo', statusFilter: 'open',
      onClick: () => { setFilterStatus('open'); setStatModal({ title: 'Открытые чаты', convs: active.filter(c => c.status === 'open') }); } },
    { label: 'В работе', value: stats.inProgress, icon: Activity, color: 'green', statusFilter: 'in_progress',
      onClick: () => { setFilterStatus('in_progress'); setStatModal({ title: 'Чаты в работе', convs: active.filter(c => c.status === 'in_progress') }); } },
    { label: 'Ждём', value: stats.waiting, icon: Hourglass, color: 'purple', statusFilter: 'waiting_external',
      onClick: () => { setFilterStatus('waiting_external'); setStatModal({ title: 'Ожидают ответа клиента', convs: active.filter(c => c.status === 'waiting_external') }); } },
    { label: 'Эскалаций', value: stats.escalated, icon: ArrowUpRight, color: 'red', statusFilter: 'escalated',
      onClick: () => { setFilterStatus('escalated'); setStatModal({ title: 'Эскалированные чаты', convs: active.filter(c => c.status === 'escalated') }); } },
    { label: 'Не назначены', value: stats.unassigned, icon: Bell, color: 'yellow',
      onClick: () => setStatModal({ title: 'Не назначенные чаты', convs: active.filter(c => !c.assignedTo) }) },
    { label: 'Решено сег.', value: stats.totalResolved, icon: CheckCircle2, color: 'teal',
      onClick: () => setStatModal({ title: 'Закрытые чаты (итого)', convs: [] }) },
    { label: 'CSAT средний', value: `${stats.avgCsat}⭐`, icon: Star, color: 'orange',
      onClick: () => setStatModal({ title: 'Чаты с оценками CSAT', convs: active.filter(c => c.csat !== undefined) }) },
  ];

  return (
    <div className="space-y-6 -mx-4 sm:-mx-6 lg:-mx-8 -my-4 sm:-my-6 lg:-my-8 p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shrink-0">
            <Monitor className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 text-lg">Supervisor Wallboard</h1>
            <p className="text-xs text-gray-400 flex items-center gap-1.5">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />Live
              </span>
              · Обновлено в {timeStr()} · {stats.onlineAgents} операторов онлайн
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Global search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Email, телефон, заказ, ID..."
              value={globalSearch}
              onChange={e => setGlobalSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 border border-gray-200 bg-white rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 w-52"
            />
            {globalSearch && (
              <button onClick={() => setGlobalSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>

          {stats.slaBreached > 0 && (
            <button
              onClick={() => { setFilterSLA('critical'); }}
              className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-300 rounded-xl text-red-700 text-xs font-bold animate-pulse hover:animate-none hover:bg-red-100 transition-colors"
            >
              <AlertTriangle className="w-4 h-4" />
              {stats.slaBreached} SLA нарушен{stats.slaBreached > 1 ? 'о' : ''}
            </button>
          )}
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 bg-white hover:bg-gray-50 rounded-xl text-xs font-medium text-gray-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />Обновить
          </button>
          <button
            onClick={() => navigate('/chat')}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />Чат-центр
          </button>
        </div>
      </div>

      {/* ── KPI Stats (clickable) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {kpiCards.map(s => {
          const Icon = s.icon;
          const isActive = s.statusFilter && s.statusFilter !== 'all' && filterStatus === s.statusFilter;
          return (
            <button
              key={s.label}
              onClick={s.onClick}
              className={`bg-white rounded-2xl border p-3 text-center transition-all hover:shadow-md cursor-pointer ${
                isActive ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-300' :
                s.label === 'Эскалаций' && stats.escalated > 0 ? 'border-red-300 bg-red-50 hover:border-red-400' :
                'border-gray-200 hover:border-blue-300'
              }`}
            >
              <Icon className={`w-4 h-4 mx-auto mb-1.5 ${
                s.color === 'blue' ? 'text-blue-600' : s.color === 'green' ? 'text-green-600' :
                s.color === 'orange' ? 'text-orange-600' : s.color === 'red' ? 'text-red-600' :
                s.color === 'purple' ? 'text-purple-600' : s.color === 'teal' ? 'text-teal-600' :
                s.color === 'indigo' ? 'text-indigo-600' : s.color === 'yellow' ? 'text-yellow-600' : 'text-gray-600'
              }`} />
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
              <p className="text-[10px] text-gray-500 leading-tight mt-0.5">{s.label}</p>
            </button>
          );
        })}
      </div>

      {/* ── Body ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* ── Left: Agents + Channel dist ── */}
        <div className="xl:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              Операторы
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">{stats.onlineAgents} онлайн</span>
            </h2>
            <button
              onClick={() => setShowOffline(p => !p)}
              className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${showOffline ? 'border-gray-300 bg-gray-100 text-gray-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
            >
              {showOffline ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
              {showOffline ? 'Скрыть офлайн' : 'Показать офлайн'}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {visibleAgents.map(agent => {
              const convCount = active.filter(c => c.assignedTo === agent.id).length;
              return (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  convCount={convCount}
                  onClick={() => agent.status !== 'offline' && setSelectedAgent(agent)}
                />
              );
            })}
          </div>

          <ChannelBar conversations={conversations} filterChannel={filterChannel} onFilter={ch => setFilterChannel(ch)} />

          {/* Quick stats */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-green-500" />Итоги смены
            </p>
            <div className="space-y-2.5">
              {[
                { label: 'Обработано всего', value: `${stats.totalResolved} тикетов`, color: 'text-teal-700' },
                { label: 'Ср. время ответа', value: '4.2 мин', color: 'text-blue-700' },
                { label: 'Уникальных клиентов', value: '31', color: 'text-purple-700' },
                { label: 'Эскалаций за день', value: String(stats.escalated), color: 'text-red-700' },
                { label: 'CSAT > 4.5', value: `${agents.filter(a => a.csat >= 4.5).length} из ${agents.filter(a => a.csat > 0).length} операторов`, color: 'text-orange-700' },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">{r.label}</span>
                  <span className={`font-bold ${r.color}`}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent audit */}
          {auditLog.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-blue-500" />Последние действия
              </p>
              <div className="space-y-2">
                {auditLog.slice(0, 5).map(a => (
                  <div key={a.id} className="text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-700">{a.action}</span>
                      <span className="text-gray-400">{a.ts}</span>
                    </div>
                    <p className="text-gray-400 truncate">{a.details}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right: SLA + Queue + Leaderboard ── */}
        <div className="xl:col-span-2 space-y-4">

          {/* SLA Alerts */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 bg-gradient-to-r from-red-50 to-orange-50">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <h2 className="font-bold text-gray-900 text-sm">SLA Alerts</h2>
                {slaAlerts.length > 0 && (
                  <span className="min-w-[22px] h-5 px-1 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {slaAlerts.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs">
                {(['critical', 'danger', 'warn'] as const).map(lvl => {
                  const cfg = SLA_CFG[lvl];
                  const cnt = withElapsed.filter(({ elapsed }) => slaLevel(elapsed) === lvl).length;
                  return (
                    <button
                      key={lvl}
                      onClick={() => setFilterSLA(filterSLA === lvl ? 'all' : lvl)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg border transition-colors ${cfg.bg} ${cfg.color} ${cfg.border} ${filterSLA === lvl ? 'ring-2 ring-offset-1 ring-current' : 'hover:opacity-80'}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label} <span className="font-bold">{cnt}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-4 space-y-2 max-h-[280px] overflow-y-auto">
              {slaAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-gray-400">
                  <CheckCircle2 className="w-10 h-10 mb-2 text-green-300" />
                  <p className="text-sm font-medium text-gray-600">Все чаты в SLA-норме</p>
                  <p className="text-xs mt-1">Нет обращений с превышением времени ответа</p>
                </div>
              ) : (
                slaAlerts.map(({ c, elapsed }) => (
                  <SLARow key={c.id} conv={c} elapsed={elapsed} onClick={() => setChatConvId(c.id)} />
                ))
              )}
            </div>
          </div>

          {/* Active Queue */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Inbox className="w-4 h-4 text-blue-600" />
                <h2 className="font-bold text-gray-900 text-sm">Активная очередь</h2>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                  {filteredQueue.length} из {withElapsed.length}
                </span>
                {filterStatus !== 'all' && (
                  <button onClick={() => setFilterStatus('all')} className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-0.5">
                    <X className="w-3 h-3" />сброс фильтра
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-gray-400" />
                <select
                  value={filterSLA}
                  onChange={e => setFilterSLA(e.target.value as typeof filterSLA)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                >
                  <option value="all">Все SLA</option>
                  <option value="warn">Внимание (30+)</option>
                  <option value="danger">Критично (60+)</option>
                  <option value="critical">Нарушен (120+)</option>
                </select>
                <select
                  value={filterChannel}
                  onChange={e => setFilterChannel(e.target.value as typeof filterChannel)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                >
                  <option value="all">Все каналы</option>
                  <option value="support">Клиенты</option>
                  <option value="couriers">Курьеры</option>
                  <option value="merchants">Партнёры</option>
                  <option value="internal">Внутренний</option>
                </select>
                {(filterSLA !== 'all' || filterChannel !== 'all') && (
                  <button onClick={() => { setFilterSLA('all'); setFilterChannel('all'); }} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                    <X className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                )}
              </div>
            </div>

            <div className="divide-y divide-gray-100 max-h-[420px] overflow-y-auto">
              {filteredQueue.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center text-gray-400">
                  <MessageSquare className="w-10 h-10 mb-2 opacity-20" />
                  <p className="text-sm">Нет чатов по фильтру</p>
                </div>
              ) : (
                filteredQueue.map(({ c, elapsed }) => {
                  const ch = CHANNEL_CFG[c.channel];
                  const ChIcon = ch.icon;
                  const pr = PRIORITY_CFG[c.priority];
                  const lvl = slaLevel(elapsed);
                  const slaCfg = SLA_CFG[lvl];
                  const assigned = WALL_AGENTS.find(a => a.id === c.assignedTo);

                  return (
                    <button
                      key={c.id}
                      onClick={() => setChatConvId(c.id)}
                      className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-blue-50 transition-colors text-left group"
                    >
                      <div className={`w-2 h-2 rounded-full shrink-0 ${slaCfg.dot} ${lvl === 'critical' ? 'animate-pulse' : ''}`} />
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${ch.bg} border ${ch.border}`}>
                        <ChIcon className={`w-3.5 h-3.5 ${ch.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className={`text-sm truncate ${c.unread > 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                            {c.clientName}
                          </p>
                          {c.unread > 0 && (
                            <span className="min-w-[18px] h-4 px-1 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shrink-0">
                              {c.unread}
                            </span>
                          )}
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 ${pr.bg} ${pr.color}`}>{pr.label}</span>
                        </div>
                        <p className="text-xs text-gray-500 truncate">{c.subject}</p>
                        {c.orderRef && <span className="text-[10px] font-mono text-blue-500">{c.orderRef}</span>}
                      </div>
                      <div className="shrink-0 text-right hidden sm:block">
                        {assigned ? (
                          <div className="flex items-center gap-1.5">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${assigned.status === 'online' ? 'bg-green-600' : 'bg-gray-500'}`}>
                              {assigned.avatar.slice(0, 1)}
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-700">{assigned.name.split(' ')[0]}</p>
                              <div className={`w-1.5 h-1.5 rounded-full mx-auto ${STATUS_CFG[assigned.status].dot}`} />
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full font-medium">Свободный</span>
                        )}
                      </div>
                      <div className="shrink-0 min-w-[70px] text-right">
                        <p className={`text-xs font-bold ${slaCfg.color}`}>{formatElapsed(elapsed)}</p>
                        <p className={`text-[10px] ${slaCfg.color}`}>{slaCfg.label}</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-500 shrink-0 transition-colors" />
                    </button>
                  );
                })
              )}
            </div>

            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                {stats.unassigned > 0 && <span className="text-yellow-700 font-semibold">{stats.unassigned} не назначен{stats.unassigned > 1 ? 'о' : ''} · </span>}
                {stats.escalated > 0 && <span className="text-red-700 font-semibold">{stats.escalated} эскалаций · </span>}
                Всего {active.length} активных
              </p>
              <button
                onClick={() => navigate('/chat')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors"
              >
                <MessageSquare className="w-3 h-3" />Открыть чат-центр
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Agent Performance Leaderboard */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-200">
              <Star className="w-4 h-4 text-yellow-500" />
              <h2 className="font-bold text-gray-900 text-sm">Производительность операторов — сегодня</h2>
              <span className="text-xs text-gray-400 ml-auto">Клик → профиль оператора</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-5 py-2.5 text-gray-500 font-semibold">#</th>
                    <th className="text-left px-3 py-2.5 text-gray-500 font-semibold">Оператор</th>
                    <th className="text-center px-3 py-2.5 text-gray-500 font-semibold">Статус</th>
                    <th className="text-center px-3 py-2.5 text-gray-500 font-semibold">Чаты</th>
                    <th className="text-center px-3 py-2.5 text-gray-500 font-semibold">Закрыто</th>
                    <th className="text-center px-3 py-2.5 text-gray-500 font-semibold">Ср. ответ</th>
                    <th className="text-center px-3 py-2.5 text-gray-500 font-semibold">CSAT</th>
                  </tr>
                </thead>
                <tbody>
                  {[...agents]
                    .filter(a => a.csat > 0 || a.resolvedToday > 0)
                    .sort((a, b) => b.resolvedToday - a.resolvedToday || b.csat - a.csat)
                    .map((agent, i) => {
                      const st = STATUS_CFG[agent.status];
                      return (
                        <tr
                          key={agent.id}
                          onClick={() => agent.status !== 'offline' && setSelectedAgent(agent)}
                          className={`border-b border-gray-50 transition-colors ${agent.status !== 'offline' ? 'hover:bg-blue-50 cursor-pointer' : ''}`}
                        >
                          <td className="px-5 py-3 font-bold text-gray-400">
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-[10px] ${agent.status === 'offline' ? 'bg-gray-400' : 'bg-blue-600'}`}>
                                {agent.avatar}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900 whitespace-nowrap">{agent.name}</p>
                                <p className="text-gray-400 text-[10px]">{agent.roleName}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${st.bg} ${st.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{st.label}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center font-bold text-blue-700">{agent.activeChats}</td>
                          <td className="px-3 py-3 text-center font-bold text-green-700">{agent.resolvedToday}</td>
                          <td className="px-3 py-3 text-center text-gray-700">
                            {agent.avgResponseMin > 0 ? `${agent.avgResponseMin} мин` : '—'}
                          </td>
                          <td className="px-3 py-3 text-center">
                            {agent.csat > 0 ? (
                              <span className={`font-bold ${agent.csat >= 4.8 ? 'text-green-700' : agent.csat >= 4.5 ? 'text-yellow-700' : 'text-orange-700'}`}>
                                {agent.csat} ⭐
                              </span>
                            ) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>

      {/* ── Modals (root level, outside motion.div) ── */}

      {chatConvId && (
        <FullChatModal
          initialConvId={chatConvId}
          conversations={conversations}
          auditLog={auditLog}
          onSendMessage={(convId, text, isInternal) => handleSendMessage(convId, text, isInternal)}
          onAssign={handleAssign}
          onCloseCase={handleCloseCase}
          onEscalate={handleEscalate}
          onTransfer={handleTransfer}
          onReopen={handleReopen}
          onClose={() => setChatConvId(null)}
        />
      )}

      {selectedAgent && (
        <AgentDetailModal
          agent={selectedAgent}
          activeConvs={active.filter(c => c.assignedTo === selectedAgent.id)}
          onClose={() => setSelectedAgent(null)}
          onOpenChat={(id) => { setSelectedAgent(null); setChatConvId(id); }}
        />
      )}

      {statModal && (
        <StatDetailModal
          title={statModal.title}
          conversations={statModal.convs}
          onClose={() => setStatModal(null)}
          onOpenChat={(id) => { setStatModal(null); setChatConvId(id); }}
          emptyText="Нет данных по этой категории"
        />
      )}
    </div>
  );
}
