import { useState, useRef, useEffect, useMemo } from 'react';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare, Send, Search, Plus, X, ChevronRight,
  AlertTriangle, Check, CheckCheck, Clock, User, Users, Bike, Store,
  Lock, MoreVertical, ArrowUpRight, Tag, Star,
  Shield, RefreshCw, Paperclip,
  AlertCircle, CheckCircle2, Archive, Inbox,
  Headphones,
  UserPlus, Bell, Copy, Trash2, Pencil as Edit2, Flag,
  BarChart2, Timer,
  Package, ZapIcon, Info, ChevronDown,
  Phone, MapPin, CreditCard, FileText, Activity,
  TrendingUp, TrendingDown, Circle, Layers,
  Building2, ShoppingBag, ExternalLink, RotateCcw,
  CheckSquare, XCircle, Truck, Box, LogIn,
  ClipboardList, History, Settings, Eye, Hash, Navigation,
  SlidersHorizontal, Hourglass, PencilLine, ChevronUp,
  KeyRound, UserCog, UserX, ShieldCheck, Power, MailOpen, UserCheck,
  Monitor,
} from 'lucide-react';
import {
  INITIAL_CONVERSATIONS, QUICK_REPLIES, AGENT_ROLES, PARTICIPANTS,
  type Conversation, type ChatMessage, type ChatChannel, type AgentRole, type Priority,
} from '../../data/chat-mock';
import { ORDERS, type Order, type OrderStatus } from '../../data/orders-mock';
import { CourierTrackingPanel } from '../../components/chat/CourierTrackingPanel';
import { CourierReassignPanel } from '../../components/chat/CourierReassignPanel';
import { OperatorManagement } from '../../components/chat/OperatorManagement';
import { OperatorCabinetModal, type OperatorProfile } from '../../components/chat/OperatorCabinetModal';
import type { CourierActiveOrder } from '../../data/courier-tracking-mock';
import { EscalateRoutingModal } from '../../components/chat/EscalateRoutingModal';

// Map courier clientId → tracking id
const COURIER_ID_MAP: Record<string, string> = {
  courier1: 'courier1',
  courier2: 'courier2',
  courier3: 'courier3',
};

// Mock contact phones for couriers and merchants
const COURIER_PHONES: Record<string, string> = {
  courier1: '+7 (916) 234-56-78',
  courier2: '+7 (925) 345-67-89',
  courier3: '+7 (903) 456-78-90',
};
const MERCHANT_PHONES: Record<string, string> = {
  merchant1: '+7 (495) 123-45-67',
  merchant2: '+7 (495) 234-56-78',
  merchant3: '+7 (495) 345-67-89',
};
function getCourierPhone(courierId: string | null): string {
  if (!courierId) return '+7 (900) 000-00-00';
  return COURIER_PHONES[courierId] ?? '+7 (900) 000-00-00';
}
function getMerchantPhone(merchantId: string): string {
  return MERCHANT_PHONES[merchantId] ?? '+7 (495) 000-00-00';
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface SupportAction {
  id: string;
  agentId: string;
  agentName: string;
  agentRole: string;
  action: 'status_change' | 'note_added' | 'escalated' | 'assigned' | 'closed' | 'reopened' | 'viewed';
  orderRef?: string;
  fromStatus?: string;
  toStatus?: string;
  note?: string;
  timestamp: string;
  conversationId: string;
}

interface AgentProfile {
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
}

// ─── Mock Agents ──────────────────────────────────────────────────────────────

const AGENTS: AgentProfile[] = [
  { id: 'l1_agent1', name: 'Козлова Елена',   email: 'kozlova@platform.com',  role: 'l1',   online: true,  avatar: 'КЕ', activeChats: 4, resolvedToday: 12, avgResponseTime: '3 мин', csat: 4.9 },
  { id: 'l1_agent2', name: 'Смирнов Антон',   email: 'smirnov@platform.com',  role: 'l1',   online: true,  avatar: 'СА', activeChats: 3, resolvedToday: 8,  avgResponseTime: '5 мин', csat: 4.7 },
  { id: 'l2_agent1', name: 'Попова Ирина',    email: 'popova@platform.com',   role: 'l2',   online: true,  avatar: 'ПИ', activeChats: 2, resolvedToday: 5,  avgResponseTime: '8 мин', csat: 4.8 },
  { id: 'lead1',     name: 'Захаров Виктор',  email: 'zakharov@platform.com', role: 'lead', online: true,  avatar: 'ЗВ', activeChats: 1, resolvedToday: 3,  avgResponseTime: '2 мин', csat: 5.0 },
  { id: 'admin1',    name: 'Администратор Системы', email: 'admin@platform.com', role: 'admin', online: true, avatar: 'АС', activeChats: 0, resolvedToday: 0, avgResponseTime: '—', csat: 0 },
];

const CURRENT_AGENT: AgentProfile = AGENTS[4]; // Admin demo
const CURRENT_AGENT_ROLE: AgentRole = 'admin';

// ─── Config ───────────────────────────────────────────────────────────────────

const CHANNEL_CFG: Record<ChatChannel, {
  label: string; icon: React.ElementType; color: string; bg: string;
  border: string; badge: string;
}> = {
  support:   { label: 'Клиенты',    icon: Headphones,      color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200',  badge: 'bg-blue-100 text-blue-700' },
  couriers:  { label: 'Курьеры',    icon: Bike,            color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-700' },
  merchants: { label: 'Партнёры',   icon: Store,           color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-700' },
  internal:  { label: 'Внутренний', icon: Lock,            color: 'text-gray-700',   bg: 'bg-gray-50',   border: 'border-gray-300',  badge: 'bg-gray-200 text-gray-700' },
  escalated: { label: 'Эскалация',  icon: AlertTriangle,   color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200',   badge: 'bg-red-100 text-red-700' },
  closed:    { label: 'Закрытые',   icon: Archive,         color: 'text-gray-400',   bg: 'bg-gray-50',   border: 'border-gray-200',  badge: 'bg-gray-100 text-gray-500' },
};

const PRIORITY_CFG: Record<Priority, { label: string; color: string; dot: string; bg: string }> = {
  low:      { label: 'Низкий',    color: 'text-gray-500',   dot: 'bg-gray-400',    bg: 'bg-gray-100' },
  normal:   { label: 'Обычный',   color: 'text-blue-600',   dot: 'bg-blue-400',    bg: 'bg-blue-50' },
  high:     { label: 'Высокий',   color: 'text-orange-600', dot: 'bg-orange-500',  bg: 'bg-orange-50' },
  critical: { label: 'Критичный', color: 'text-red-600',    dot: 'bg-red-500',     bg: 'bg-red-50' },
};

const CONV_STATUS_CFG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  open:             { label: 'Открыт',          color: 'text-blue-600',   bg: 'bg-blue-50',    dot: 'bg-blue-500' },
  pending:          { label: 'Ожидает',          color: 'text-yellow-600', bg: 'bg-yellow-50',  dot: 'bg-yellow-500' },
  in_progress:      { label: 'В работе',         color: 'text-green-600',  bg: 'bg-green-50',   dot: 'bg-green-500' },
  waiting_external: { label: 'Ждём партнёра',    color: 'text-indigo-600', bg: 'bg-indigo-50',  dot: 'bg-indigo-400' },
  escalated:        { label: 'Эскалирован',      color: 'text-red-600',    bg: 'bg-red-50',     dot: 'bg-red-500' },
  resolved:         { label: 'Решён',            color: 'text-teal-600',   bg: 'bg-teal-50',    dot: 'bg-teal-500' },
  closed:           { label: 'Закрыт',           color: 'text-gray-500',   bg: 'bg-gray-50',    dot: 'bg-gray-400' },
};

// ─── Resolution Codes ─────────────────────────────────────────────────────────

const RESOLUTION_CODES: { code: string; label: string; desc: string; icon: React.ElementType; color: string; bg: string; border: string }[] = [
  { code: 'SOLVED',        label: 'Вопрос решён',           desc: 'Клиент получил ответ, вопрос закрыт полностью',       icon: CheckCircle2,   color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-300' },
  { code: 'REFUND_ISSUED', label: 'Возврат / комп��нсация',  desc: 'Оформлен возврат средств или выдана компенсация',      icon: CreditCard,     color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-300' },
  { code: 'DUPLICATE',     label: 'Дубликат обращения',     desc: 'Этот вопрос уже решался в другом чате',                icon: Copy,           color: 'text-gray-700',   bg: 'bg-gray-50',   border: 'border-gray-300' },
  { code: 'NO_RESPONSE',   label: 'Клиент не ответил',      desc: 'Клиент не выходил на связь более 24 часов',            icon: Clock,          color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-300' },
  { code: 'ESCALATED_EXT', label: 'Передано внешней службе',desc: 'Вопрос требует решения на стороне партнёра или курьера',icon: ArrowUpRight,   color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-300' },
  { code: 'REJECTED',      label: 'Отклонено',              desc: 'Нарушение правил или невозможно выполнить запрос',      icon: XCircle,        color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-300' },
];

// ─── Waiting-for options ─────────�����────────────────────────────────────────────

const WAITING_FOR_OPTIONS: { id: string; label: string; desc: string; icon: React.ElementType }[] = [
  { id: 'courier',  label: 'Курьер',             desc: 'Ждём действий или ответа курьера',   icon: Bike },
  { id: 'merchant', label: 'Партнёр / Мерчант',  desc: 'Ждём ответа/документов от магазина', icon: Store },
  { id: 'pvz',      label: 'Оператор ПВЗ',       desc: 'Ждём подтверждения или фото с ПВЗ',  icon: Package },
  { id: 'external', label: 'Внешняя служба',      desc: 'Банк, служба доставки, с��стема',     icon: ExternalLink },
];

// Order statuses available to support agents
const ORDER_STATUSES: { value: OrderStatus; label: string; icon: React.ElementType; color: string; bg: string }[] = [
  { value: 'new',              label: 'Новый',              icon: Clock,           color: 'text-gray-600',   bg: 'bg-gray-100' },
  { value: 'accepted',        label: 'Принят',             icon: Check,           color: 'text-blue-600',   bg: 'bg-blue-100' },
  { value: 'preparing',       label: 'Готовится',          icon: Settings,        color: 'text-yellow-600', bg: 'bg-yellow-100' },
  { value: 'ready',           label: 'Готов',              icon: CheckSquare,     color: 'text-teal-600',   bg: 'bg-teal-100' },
  { value: 'courier_assigned',label: 'Курьер назначен',    icon: Bike,            color: 'text-indigo-600', bg: 'bg-indigo-100' },
  { value: 'in_transit',      label: 'В пути',             icon: Truck,           color: 'text-blue-600',   bg: 'bg-blue-100' },
  { value: 'at_pvz',          label: 'На ПВЗ',             icon: MapPin,          color: 'text-purple-600', bg: 'bg-purple-100' },
  { value: 'pickup_ready',    label: 'Готов к самовывозу', icon: Box,             color: 'text-purple-600', bg: 'bg-purple-100' },
  { value: 'delivered',       label: 'Доставлен',          icon: CheckCircle2,    color: 'text-green-600',  bg: 'bg-green-100' },
  { value: 'returned',        label: 'Возврат',            icon: RotateCcw,       color: 'text-orange-600', bg: 'bg-orange-100' },
  { value: 'cancelled',       label: 'Отменён',            icon: XCircle,         color: 'text-red-600',    bg: 'bg-red-100' },
];

const ROLE_COLORS: Record<string, string> = {
  client:       'bg-blue-500',
  courier:      'bg-orange-500',
  merchant:     'bg-purple-500',
  support_l1:   'bg-green-600',
  support_l2:   'bg-teal-600',
  support_lead: 'bg-indigo-600',
  admin:        'bg-red-600',
  bot:          'bg-gray-500',
};

const AGENT_ROLE_CFG: Record<AgentRole, { label: string; color: string; bg: string }> = {
  l1:       { label: 'L1 Агент',      color: 'text-green-700',  bg: 'bg-green-100' },
  l2:       { label: 'L2 Агент',      color: 'text-blue-700',   bg: 'bg-blue-100' },
  lead:     { label: 'Руководитель',  color: 'text-purple-700', bg: 'bg-purple-100' },
  admin:    { label: 'Администратор', color: 'text-red-700',    bg: 'bg-red-100' },
  readonly: { label: 'Просмотр',      color: 'text-gray-700',   bg: 'bg-gray-100' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isMineRole(role: ChatMessage['senderRole']) {
  return ['support_l1','support_l2','support_lead','admin'].includes(role);
}

function getOrderStatusCfg(s: OrderStatus) {
  return ORDER_STATUSES.find(o => o.value === s) ?? ORDER_STATUSES[0];
}

function now() {
  return new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function nowFull() {
  return new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ─── SLA / Elapsed helpers ─────���──────────────────────────────────────────────

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
  if (h < 24) return `${h} ч`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} дн`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w} нед`;
  const mo = Math.floor(d / 30);
  return `${mo} мес`;
}

const RU_MONTHS = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];

function formatAbsDate(dateStr: string): string {
  if (!dateStr) return '';
  const [d, t = ''] = dateStr.split(' ');
  const [day, mon, yr] = d.split('.');
  const m = RU_MONTHS[(+mon - 1)] ?? '';
  return `${+day} ${m} ${yr}${t ? `, ${t}` : ''}`;
}

function relativeDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const [d] = dateStr.split(' ');
    const [day, mon, yr] = d.split('.');
    const target = new Date(+yr, +mon - 1, +day);
    const today = new Date(); today.setHours(0,0,0,0);
    const diff = Math.round((today.getTime() - target.getTime()) / 86400000);
    if (diff === 0) return 'сегодня';
    if (diff === 1) return 'вчера';
    if (diff < 7) return `${diff} дня назад`;
    const w = Math.floor(diff / 7);
    if (w < 5) return `${w} ${w === 1 ? 'неделю' : 'недели'} назад`;
    const mo = Math.floor(diff / 30);
    return `${mo} ${mo === 1 ? 'месяц' : mo < 5 ? 'месяца' : 'месяцев'} назад`;
  } catch { return ''; }
}
function slaColor(mins: number, status: string): string {
  if (status === 'resolved' || status === 'closed') return 'text-gray-400';
  if (mins > 120) return 'text-red-500';
  if (mins > 60) return 'text-orange-500';
  if (mins > 30) return 'text-yellow-600';
  return 'text-gray-400';
}
function slaIcon(mins: number, status: string): React.ElementType {
  if (status === 'resolved' || status === 'closed') return Clock;
  if (mins > 120) return AlertTriangle;
  if (mins > 60) return Hourglass;
  return Clock;
}

// Extract order numbers from text
function extractOrderRefs(text: string): string[] {
  const matches = text.match(/ORD-\d{4}-\d{6}/g) ?? [];
  return [...new Set(matches)];
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, color, size = 'md', online }: { name: string; color?: string; size?: 'xs' | 'sm' | 'md' | 'lg'; online?: boolean }) {
  const sz = { xs: 'w-6 h-6 text-xs', sm: 'w-8 h-8 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base' }[size];
  const bg = color ?? 'bg-gray-500';
  return (
    <div className={`relative shrink-0 ${sz} ${bg} rounded-full flex items-center justify-center text-white font-semibold`}>
      {name.slice(0, 2)}
      {online !== undefined && (
        <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${online ? 'bg-green-500' : 'bg-gray-300'}`} />
      )}
    </div>
  );
}

// ─── Order Status Badge ────────────────────────────────────────────────────────

function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const cfg = getOrderStatusCfg(status);
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
      <Icon className="w-3 h-3" />{cfg.label}
    </span>
  );
}

// ─── Support Action Log Item ───────────────────────────────────────────────────

function ActionLogItem({ action }: { action: SupportAction }) {
  const icons: Record<SupportAction['action'], React.ElementType> = {
    status_change: Activity, note_added: FileText, escalated: ArrowUpRight,
    assigned: UserPlus, closed: CheckCircle2, reopened: RefreshCw, viewed: Eye,
  };
  const colors: Record<SupportAction['action'], string> = {
    status_change: 'bg-blue-100 text-blue-600', note_added: 'bg-gray-100 text-gray-600',
    escalated: 'bg-red-100 text-red-600', assigned: 'bg-purple-100 text-purple-600',
    closed: 'bg-green-100 text-green-600', reopened: 'bg-yellow-100 text-yellow-600',
    viewed: 'bg-gray-50 text-gray-400',
  };
  const labels: Record<SupportAction['action'], string> = {
    status_change: 'Статус изменён', note_added: 'Заметка добавлена',
    escalated: 'Эскалировано', assigned: 'Назначен агент',
    closed: 'Чат закрыт', reopened: 'Чат переоткрыт', viewed: 'Просмотрено',
  };
  const Icon = icons[action.action];

  return (
    <div className="flex items-start gap-2.5 py-2.5 border-b border-gray-100 last:border-0">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${colors[action.action]}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-gray-800">{action.agentName}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${AGENT_ROLE_CFG[action.agentRole as AgentRole]?.bg ?? 'bg-gray-100'} ${AGENT_ROLE_CFG[action.agentRole as AgentRole]?.color ?? 'text-gray-600'}`}>
            {AGENT_ROLE_CFG[action.agentRole as AgentRole]?.label ?? action.agentRole}
          </span>
        </div>
        <p className="text-xs text-gray-600 mt-0.5">{labels[action.action]}</p>
        {action.action === 'status_change' && action.fromStatus && action.toStatus && (
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-xs text-gray-400">{getOrderStatusCfg(action.fromStatus as OrderStatus).label}</span>
            <ChevronRight className="w-3 h-3 text-gray-300" />
            <span className="text-xs font-medium text-blue-700">{getOrderStatusCfg(action.toStatus as OrderStatus).label}</span>
            {action.orderRef && <span className="text-xs text-gray-400 font-mono">· {action.orderRef}</span>}
          </div>
        )}
        {action.note && <p className="text-xs text-gray-500 mt-1 italic">«{action.note}»</p>}
        <p className="text-xs text-gray-400 mt-0.5">{action.timestamp}</p>
      </div>
    </div>
  );
}

// ─── Order Panel ──────────────────────────────────────────────────────────────

function OrderPanel({
  order,
  agentRole,
  conversationId,
  onStatusChange,
  onActionLogged,
  onCourierReassign,
  onSendMessage,
}: {
  order: Order;
  agentRole: AgentRole;
  conversationId: string;
  onStatusChange: (orderId: string, newStatus: OrderStatus, note: string) => void;
  onActionLogged: (action: SupportAction) => void;
  onCourierReassign?: (orderId: string, courierId: string | null, courierName: string | null, note: string) => void;
  onSendMessage?: (text: string, isInternal?: boolean) => void;
}) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'info' | 'items' | 'timeline'>('info');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [showCourierCallModal, setShowCourierCallModal] = useState(false);
  const [showCourierMsgModal, setShowCourierMsgModal] = useState(false);
  const [showMerchantCallModal, setShowMerchantCallModal] = useState(false);
  const [showMerchantMsgModal, setShowMerchantMsgModal] = useState(false);
  const [contactMsgText, setContactMsgText] = useState('');
  const [newStatus, setNewStatus] = useState<OrderStatus>(order.status);
  const [statusNote, setStatusNote] = useState('');
  const [saving, setSaving] = useState(false);
  // Local courier override (after reassign/unassign, before parent state refreshes)
  const [courierOverride, setCourierOverride] = useState<{ id: string | null; name: string | null } | null>(null);
  const effectiveCourierId = courierOverride !== null ? courierOverride.id : order.courierId;
  const effectiveCourierName = courierOverride !== null ? courierOverride.name : order.courierName;
  const perms = AGENT_ROLES[agentRole];
  const statusCfg = getOrderStatusCfg(order.status);
  const StatusIcon = statusCfg.icon;

  function handleStatusChange() {
    if (newStatus === order.status) return;
    setSaving(true);
    setTimeout(() => {
      onStatusChange(order.id, newStatus, statusNote);
      onActionLogged({
        id: `act_${Date.now()}`,
        agentId: CURRENT_AGENT.id,
        agentName: CURRENT_AGENT.name,
        agentRole: CURRENT_AGENT.role,
        action: 'status_change',
        orderRef: order.orderNumber,
        fromStatus: order.status,
        toStatus: newStatus,
        note: statusNote,
        timestamp: nowFull(),
        conversationId,
      });
      setSaving(false);
      setShowStatusModal(false);
      setStatusNote('');
    }, 600);
  }

  const tabs = [
    { id: 'info', label: 'Заказ' },
    { id: 'items', label: `Состав (${order.items.length})` },
    { id: 'timeline', label: 'История' },
  ] as const;

  return (
    <div className="flex flex-col h-full">
      {/* Order header */}
      <div className="p-4 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Заказ</p>
            <p className="font-bold text-gray-900 font-mono text-sm">{order.orderNumber}</p>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>
        {/* Merchant/cafe info */}
        <div className="flex items-center gap-2 p-2.5 bg-purple-50 border border-purple-200 rounded-xl mb-3">
          <Store className="w-4 h-4 text-purple-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-purple-900 truncate">{order.merchant}</p>
            <p className="text-xs text-purple-600">Продавец · ID: {order.merchantId}</p>
          </div>
          {perms.canReply && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => { setContactMsgText(''); setShowMerchantMsgModal(true); }}
                title="Написать партнёру"
                className="p-1.5 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-700 transition-colors">
                <MessageSquare className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setShowMerchantCallModal(true)}
                title="Позвонить партнёру"
                className="p-1.5 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 transition-colors">
                <Phone className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
        {/* Customer */}
        <div className="flex items-center gap-2 p-2.5 bg-gray-50 border border-gray-200 rounded-xl">
          <User className="w-4 h-4 text-gray-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-800 truncate">{order.customerName}</p>
            <p className="text-xs text-gray-500">{order.customerPhone}</p>
          </div>
          {order.isOverdue && (
            <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200 shrink-0">
              <AlertTriangle className="w-3 h-3" />SLA
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white shrink-0 px-4">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`py-2.5 px-3 text-xs font-medium border-b-2 transition-colors ${
              tab === t.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'info' && (
          <div className="p-4 space-y-3">
            {/* Basic info rows */}
            {[
              { label: 'Сумма заказа', value: `₽${order.total.toLocaleString()}`, icon: CreditCard },
              { label: 'Оплата', value: `${order.paymentStatus === 'paid' ? '✅ Оплачен' : '⏳ Ожидает'} · ${order.paymentMethod}`, icon: CreditCard },
              { label: 'Тип доставки', value: order.deliveryType === 'pvz' ? 'Самовывоз ПВЗ' : order.deliveryType === 'delivery' ? 'Курьер' : 'Самовывоз', icon: Truck },
              order.pvzName && { label: 'ПВЗ', value: `${order.pvzName} (${order.pvzCode})`, icon: MapPin },
              order.storageCell && { label: 'Ячейка', value: order.storageCell, icon: Box },
              order.pickupCode && { label: 'Код выдачи', value: order.pickupCode, icon: Hash },
              order.deliveryAddress && { label: 'Адрес', value: order.deliveryAddress, icon: MapPin },
              { label: 'Соз��ан', value: order.createdAt, icon: Clock },
              { label: 'SLA дедлайн', value: order.slaDeadline, icon: Timer },
              order.notes && { label: 'Заметки', value: order.notes, icon: FileText },
            ].filter(Boolean).map((item: any, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="flex items-start gap-2.5">
                  <Icon className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400">{item.label}</p>
                    <p className="text-xs font-medium text-gray-800 mt-0.5 break-words">{item.value}</p>
                  </div>
                </div>
              );
            })}

            {/* ── Courier Section (delivery orders) ── */}
            {order.deliveryType === 'delivery' && (
              <div className="pt-1 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Bike className="w-3.5 h-3.5 text-orange-500" />Курьер
                  </p>
                  {effectiveCourierId && effectiveCourierName && perms.canReply && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setContactMsgText(''); setShowCourierMsgModal(true); }}
                        title="Написать курьеру"
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-xs font-medium transition-colors">
                        <MessageSquare className="w-3 h-3" />Написать
                      </button>
                      <button
                        onClick={() => setShowCourierCallModal(true)}
                        title="Позвонить курьеру"
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 text-xs font-medium transition-colors">
                        <Phone className="w-3 h-3" />Звонок
                      </button>
                    </div>
                  )}
                </div>
                <CourierReassignPanel
                  order={order}
                  courierId={effectiveCourierId}
                  courierName={effectiveCourierName}
                  agentRole={agentRole}
                  onReassign={(orderId, newCourierId, newCourierName, note) => {
                    setCourierOverride({ id: newCourierId, name: newCourierName });
                    onCourierReassign?.(orderId, newCourierId, newCourierName, note);
                    onActionLogged({
                      id: `act_reassign_${Date.now()}`,
                      agentId: CURRENT_AGENT.id,
                      agentName: CURRENT_AGENT.name,
                      agentRole: CURRENT_AGENT.role,
                      action: 'status_change',
                      orderRef: order.orderNumber,
                      fromStatus: order.status,
                      toStatus: 'courier_assigned',
                      note,
                      timestamp: nowFull(),
                      conversationId,
                    });
                  }}
                  onUnassign={(orderId, note) => {
                    setCourierOverride({ id: null, name: null });
                    onCourierReassign?.(orderId, null, null, note);
                    onActionLogged({
                      id: `act_unassign_${Date.now()}`,
                      agentId: CURRENT_AGENT.id,
                      agentName: CURRENT_AGENT.name,
                      agentRole: CURRENT_AGENT.role,
                      action: 'status_change',
                      orderRef: order.orderNumber,
                      fromStatus: order.status,
                      toStatus: 'ready',
                      note,
                      timestamp: nowFull(),
                      conversationId,
                    });
                  }}
                  onEscalateReassign={(_orderId, reason) => {
                    onActionLogged({
                      id: `act_esc_reassign_${Date.now()}`,
                      agentId: CURRENT_AGENT.id,
                      agentName: CURRENT_AGENT.name,
                      agentRole: CURRENT_AGENT.role,
                      action: 'escalated',
                      orderRef: order.orderNumber,
                      note: `Эскалация переназначения курьера: ${reason}`,
                      timestamp: nowFull(),
                      conversationId,
                    });
                  }}
                />
              </div>
            )}
          </div>
        )}

        {tab === 'items' && (
          <div className="p-4 space-y-2">
            {order.items.map(item => (
              <div key={item.id} className="flex items-center gap-3 p-2.5 bg-gray-50 border border-gray-200 rounded-xl">
                <div className="w-10 h-10 bg-gray-200 rounded-lg shrink-0 overflow-hidden">
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">{item.name}</p>
                  <p className="text-xs text-gray-400">{item.qty} шт. · ₽{item.price.toLocaleString()}</p>
                </div>
                <p className="text-xs font-bold text-gray-900 shrink-0">₽{item.total.toLocaleString()}</p>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 border-t border-gray-200 mt-2">
              <span className="text-xs text-gray-500">Итого</span>
              <span className="text-sm font-bold text-gray-900">₽{order.total.toLocaleString()}</span>
            </div>
          </div>
        )}

        {tab === 'timeline' && (
          <div className="p-4">
            <div className="relative">
              <div className="absolute left-3.5 top-3 bottom-3 w-px bg-gray-200" />
              <div className="space-y-3">
                {order.timeline.map((t, i) => (
                  <div key={t.id} className="flex items-start gap-3 relative">
                    <div className="w-7 h-7 bg-white border-2 border-blue-400 rounded-full flex items-center justify-center shrink-0 z-10">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    </div>
                    <div className="flex-1 pb-1">
                      <p className="text-xs font-semibold text-gray-800">{t.description}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{t.actor} · {t.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      {perms.canReply && (
        <div className="p-4 border-t border-gray-200 bg-gray-50 shrink-0 space-y-2">
          <button
            onClick={() => { setNewStatus(order.status); setShowStatusModal(true); }}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors">
            <Activity className="w-4 h-4" />Изменить статус заказа
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setShowCallModal(true)}
              className="flex items-center justify-center gap-1.5 py-2 border border-gray-200 bg-white hover:bg-green-50 hover:border-green-300 text-gray-700 hover:text-green-700 rounded-xl text-xs font-medium transition-colors">
              <Phone className="w-3.5 h-3.5" />Позвонить
            </button>
            <button
              onClick={() => navigate(`/orders/${order.id}`)}
              className="flex items-center justify-center gap-1.5 py-2 border border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-300 text-gray-700 hover:text-blue-700 rounded-xl text-xs font-medium transition-colors">
              <ExternalLink className="w-3.5 h-3.5" />Открыть заказ
            </button>
          </div>
        </div>
      )}

      {/* Call Modal */}
      {showCallModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-900/60" onClick={() => setShowCallModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gradient-to-r from-green-600 to-emerald-600 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                  <Phone className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-white">Позвонить клиент��</p>
                  <p className="text-xs text-green-100">{order.customerName}</p>
                </div>
              </div>
              <button onClick={() => setShowCallModal(false)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                  <User className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{order.customerName}</p>
                  <p className="text-lg font-mono font-bold text-green-700 mt-0.5">{order.customerPhone}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Заказ: {order.orderNumber}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <Shield className="w-4 h-4 text-blue-600 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-blue-900">Звонок буде�� ��аписан в аудит-лог</p>
                  <p className="text-xs text-blue-700">{CURRENT_AGENT.name} · {nowFull()}</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-5 py-4 border-t border-gray-200">
              <button onClick={() => setShowCallModal(false)} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Отмена</button>
              <a
                href={`tel:${order.customerPhone}`}
                onClick={() => {
                  onActionLogged({
                    id: `act_call_${Date.now()}`,
                    agentId: CURRENT_AGENT.id,
                    agentName: CURRENT_AGENT.name,
                    agentRole: CURRENT_AGENT.role,
                    action: 'note_added',
                    orderRef: order.orderNumber,
                    note: `Исходящий звонок клиенту ${order.customerName} (${order.customerPhone})`,
                    timestamp: nowFull(),
                    conversationId,
                  });
                  setShowCallModal(false);
                }}
                className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-md shadow-green-100">
                <Phone className="w-4 h-4" />Набрать {order.customerPhone}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── Courier Call Modal ── */}
      {showCourierCallModal && effectiveCourierId && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-900/60" onClick={() => setShowCourierCallModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gradient-to-r from-orange-500 to-orange-600 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                  <Bike className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-white">Позвонить курьеру</p>
                  <p className="text-xs text-orange-100">{effectiveCourierName}</p>
                </div>
              </div>
              <button onClick={() => setShowCourierCallModal(false)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-200 rounded-xl">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center shrink-0">
                  <Bike className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{effectiveCourierName}</p>
                  <p className="text-lg font-mono font-bold text-orange-700 mt-0.5">{getCourierPhone(effectiveCourierId)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Заказ: {order.orderNumber}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <Shield className="w-4 h-4 text-blue-600 shrink-0" />
                <p className="text-xs text-blue-700">Звонок будет записан в аудит-лог · {CURRENT_AGENT.name}</p>
              </div>
            </div>
            <div className="flex gap-3 px-5 py-4 border-t border-gray-200">
              <button onClick={() => setShowCourierCallModal(false)} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Отмена</button>
              <a href={`tel:${getCourierPhone(effectiveCourierId)}`}
                onClick={() => {
                  onActionLogged({ id: `act_call_c_${Date.now()}`, agentId: CURRENT_AGENT.id, agentName: CURRENT_AGENT.name, agentRole: CURRENT_AGENT.role, action: 'note_added', orderRef: order.orderNumber, note: `Исходящий звонок курьеру ${effectiveCourierName} (${getCourierPhone(effectiveCourierId)})`, timestamp: nowFull(), conversationId });
                  onSendMessage?.(`📞 Звонок курьеру ${effectiveCourierName} (${getCourierPhone(effectiveCourierId)}) по заказу ${order.orderNumber}`, true);
                  setShowCourierCallModal(false);
                }}
                className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-md shadow-orange-100">
                <Phone className="w-4 h-4" />Набрать {getCourierPhone(effectiveCourierId)}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── Courier Message Modal ── */}
      {showCourierMsgModal && effectiveCourierName && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-900/60" onClick={() => setShowCourierMsgModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gradient-to-r from-orange-500 to-amber-500 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                  <Bike className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-white">Написать курьеру</p>
                  <p className="text-xs text-orange-100">{effectiveCourierName} · {order.orderNumber}</p>
                </div>
              </div>
              <button onClick={() => setShowCourierMsgModal(false)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-xl">
                <div className="w-9 h-9 bg-orange-100 rounded-full flex items-center justify-center shrink-0">
                  <Bike className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-800">{effectiveCourierName}</p>
                  <p className="text-xs text-orange-600">{getCourierPhone(effectiveCourierId)}</p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Сообщение курьеру</label>
                <textarea value={contactMsgText} onChange={e => setContactMsgText(e.target.value)} rows={3}
                  placeholder={`Например: Клиент ${order.customerName} ждёт вас. Пожалуйста, позвоните ему перед приездом...`}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
              </div>
              <div className="flex items-center gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-700">Действие зафиксируется как внутренняя заметка в аудит-логе чата</p>
              </div>
            </div>
            <div className="flex gap-3 px-5 py-4 border-t border-gray-200">
              <button onClick={() => setShowCourierMsgModal(false)} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">Отмена</button>
              <button
                onClick={() => {
                  if (!contactMsgText.trim()) return;
                  const note = `📨 Сообщение курьеру ${effectiveCourierName}: «${contactMsgText.trim()}» · Заказ ${order.orderNumber}`;
                  onSendMessage?.(note, true);
                  onActionLogged({ id: `act_msg_courier_${Date.now()}`, agentId: CURRENT_AGENT.id, agentName: CURRENT_AGENT.name, agentRole: CURRENT_AGENT.role, action: 'note_added', orderRef: order.orderNumber, note, timestamp: nowFull(), conversationId });
                  setContactMsgText('');
                  setShowCourierMsgModal(false);
                }}
                disabled={!contactMsgText.trim()}
                className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-md shadow-orange-100">
                <Send className="w-4 h-4" />Отправить курьеру
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Merchant Call Modal ── */}
      {showMerchantCallModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-900/60" onClick={() => setShowMerchantCallModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-violet-600 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                  <Store className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-white">Позвонить партнёру</p>
                  <p className="text-xs text-purple-200">{order.merchant}</p>
                </div>
              </div>
              <button onClick={() => setShowMerchantCallModal(false)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3 p-4 bg-purple-50 border border-purple-200 rounded-xl">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center shrink-0">
                  <Store className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{order.merchant}</p>
                  <p className="text-lg font-mono font-bold text-purple-700 mt-0.5">{getMerchantPhone(order.merchantId)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Заказ: {order.orderNumber}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <Shield className="w-4 h-4 text-blue-600 shrink-0" />
                <p className="text-xs text-blue-700">Звонок будет записан в аудит-лог · {CURRENT_AGENT.name}</p>
              </div>
            </div>
            <div className="flex gap-3 px-5 py-4 border-t border-gray-200">
              <button onClick={() => setShowMerchantCallModal(false)} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Отмена</button>
              <a href={`tel:${getMerchantPhone(order.merchantId)}`}
                onClick={() => {
                  onActionLogged({ id: `act_call_m_${Date.now()}`, agentId: CURRENT_AGENT.id, agentName: CURRENT_AGENT.name, agentRole: CURRENT_AGENT.role, action: 'note_added', orderRef: order.orderNumber, note: `Исходящий звонок партнёру ${order.merchant} (${getMerchantPhone(order.merchantId)})`, timestamp: nowFull(), conversationId });
                  onSendMessage?.(`📞 Звонок партнёру ${order.merchant} (${getMerchantPhone(order.merchantId)}) по заказу ${order.orderNumber}`, true);
                  setShowMerchantCallModal(false);
                }}
                className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-md shadow-purple-100">
                <Phone className="w-4 h-4" />Набрать {getMerchantPhone(order.merchantId)}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── Merchant Message Modal ── */}
      {showMerchantMsgModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-900/60" onClick={() => setShowMerchantMsgModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                  <Store className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-white">Написать партнёру</p>
                  <p className="text-xs text-purple-200">{order.merchant} · {order.orderNumber}</p>
                </div>
              </div>
              <button onClick={() => setShowMerchantMsgModal(false)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-200 rounded-xl">
                <div className="w-9 h-9 bg-purple-100 rounded-full flex items-center justify-center shrink-0">
                  <Store className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-800">{order.merchant}</p>
                  <p className="text-xs text-purple-600">{getMerchantPhone(order.merchantId)}</p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Сообщение партнёру</label>
                <textarea value={contactMsgText} onChange={e => setContactMsgText(e.target.value)} rows={3}
                  placeholder={`Например: По заказу ${order.orderNumber} — уточните статус готовности ��люд...`}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none" />
              </div>
              <div className="flex items-center gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-700">Действие зафиксируется как внутренняя заметка в аудит-логе чата</p>
              </div>
            </div>
            <div className="flex gap-3 px-5 py-4 border-t border-gray-200">
              <button onClick={() => setShowMerchantMsgModal(false)} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">Отмена</button>
              <button
                onClick={() => {
                  if (!contactMsgText.trim()) return;
                  const note = `📨 Сообщение партнёру ${order.merchant}: «${contactMsgText.trim()}» · Заказ ${order.orderNumber}`;
                  onSendMessage?.(note, true);
                  onActionLogged({ id: `act_msg_merchant_${Date.now()}`, agentId: CURRENT_AGENT.id, agentName: CURRENT_AGENT.name, agentRole: CURRENT_AGENT.role, action: 'note_added', orderRef: order.orderNumber, note, timestamp: nowFull(), conversationId });
                  setContactMsgText('');
                  setShowMerchantMsgModal(false);
                }}
                disabled={!contactMsgText.trim()}
                className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-md shadow-purple-100">
                <Send className="w-4 h-4" />Отправить партнёру
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-900/60" onClick={() => setShowStatusModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div>
                <h3 className="font-bold text-gray-900">Изменить статус заказа</h3>
                <p className="text-xs text-gray-400 mt-0.5 font-mono">{order.orderNumber} · {order.merchant}</p>
              </div>
              <button onClick={() => setShowStatusModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-4">
              {/* Current status */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div>
                  <p className="text-xs text-gray-400">Текущий статус</p>
                  <OrderStatusBadge status={order.status} />
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 mx-1" />
                <div>
                  <p className="text-xs text-gray-400">Новый статус</p>
                  <OrderStatusBadge status={newStatus} />
                </div>
              </div>

              {/* Status grid */}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">Выберите новый статус</p>
                <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto">
                  {ORDER_STATUSES.map(s => {
                    const Icon = s.icon;
                    const selected = newStatus === s.value;
                    const isCurrent = order.status === s.value;
                    return (
                      <button key={s.value} onClick={() => setNewStatus(s.value)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-xs transition-all ${
                          selected ? 'border-blue-500 bg-blue-50 text-blue-800' :
                          isCurrent ? 'border-gray-300 bg-gray-50 text-gray-500 opacity-60' :
                          'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}>
                        <Icon className={`w-3.5 h-3.5 shrink-0 ${selected ? 'text-blue-600' : s.color}`} />
                        <span className="truncate">{s.label}</span>
                        {selected && <Check className="w-3 h-3 text-blue-600 ml-auto shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Причина / комментарий <span className="text-gray-400 font-normal">(обязательно для аудита)</span>
                </label>
                <textarea value={statusNote} onChange={e => setStatusNote(e.target.value)} rows={2}
                  placeholder="Например: клиент подтвердил получение по телефону..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none" />
              </div>

              {/* Agent info */}
              <div className="flex items-center gap-2.5 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <Shield className="w-4 h-4 text-blue-600 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-blue-900">Действие будет записано:</p>
                  <p className="text-xs text-blue-700">{CURRENT_AGENT.name} · {AGENT_ROLE_CFG[CURRENT_AGENT.role].label} · {nowFull()}</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-5 py-4 border-t border-gray-200">
              <button onClick={() => setShowStatusModal(false)} className="px-5 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-sm font-medium">Отмена</button>
              <button
                onClick={handleStatusChange}
                disabled={newStatus === order.status || !statusNote.trim() || saving}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors">
                {saving ? <span className="flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" />Сохранение...</span> : <span className="flex items-center gap-2"><Check className="w-4 h-4" />Применить изменение</span>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Order Lookup ─────────────────────────────────────────────────────────────

function OrderLookup({
  agentRole,
  conversationId,
  initialRef,
  onStatusChange,
  onActionLogged,
  onCourierReassign,
  onSendMessage,
}: {
  agentRole: AgentRole;
  conversationId: string;
  initialRef?: string;
  onStatusChange: (orderId: string, newStatus: OrderStatus, note: string) => void;
  onActionLogged: (action: SupportAction) => void;
  onCourierReassign?: (orderId: string, courierId: string | null, courierName: string | null, note: string) => void;
  onSendMessage?: (text: string, isInternal?: boolean) => void;
}) {
  const [query, setQuery] = useState(initialRef ?? '');
  const [foundOrder, setFoundOrder] = useState<Order | null>(() =>
    initialRef ? (ORDERS.find(o => o.orderNumber === initialRef || o.id === initialRef) ?? null) : null
  );
  const [notFound, setNotFound] = useState(false);

  function search() {
    const q = query.trim().toUpperCase();
    const order = ORDERS.find(o => o.orderNumber.toUpperCase().includes(q) || o.id === q);
    if (order) {
      setFoundOrder(order);
      setNotFound(false);
      onActionLogged({
        id: `act_view_${Date.now()}`,
        agentId: CURRENT_AGENT.id,
        agentName: CURRENT_AGENT.name,
        agentRole: CURRENT_AGENT.role,
        action: 'viewed',
        orderRef: order.orderNumber,
        timestamp: nowFull(),
        conversationId,
      });
    } else {
      setFoundOrder(null);
      setNotFound(true);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="p-3 border-b border-gray-200 bg-white shrink-0">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
              placeholder="ORD-2026-000456..."
              className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>
          <button onClick={search}
            className="px-3 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-xs font-medium shrink-0">
            Найти
          </button>
        </div>
      </div>

      {!foundOrder && !notFound && (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4 text-gray-400">
          <Package className="w-10 h-10 mb-2 opacity-30" />
          <p className="text-sm">Введите номер заказа</p>
          <p className="text-xs mt-1 opacity-70">Например: ORD-2026-000456</p>
        </div>
      )}

      {notFound && (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4 text-gray-400">
          <XCircle className="w-10 h-10 mb-2 text-red-300" />
          <p className="text-sm text-gray-600">Заказ не найден</p>
          <p className="text-xs mt-1">Проверьте номер и попробуйте снова</p>
        </div>
      )}

      {foundOrder && (
        <div className="flex-1 overflow-hidden">
          <OrderPanel
            order={foundOrder}
            agentRole={agentRole}
            conversationId={conversationId}
            onStatusChange={onStatusChange}
            onActionLogged={onActionLogged}
            onCourierReassign={onCourierReassign}
            onSendMessage={onSendMessage}
          />
        </div>
      )}
    </div>
  );
}

// ─── Date Separator ───────────────────────────────────────────────────────────

function DateSeparator({ dateStr, label }: { dateStr: string; label?: string }) {
  const text = label ?? (dateStr ? `${formatAbsDate(dateStr)} · ${relativeDate(dateStr)}` : '');
  return (
    <div className="flex items-center gap-3 my-3 px-1 select-none">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-[10px] font-medium text-gray-400 bg-white px-2 py-0.5 rounded-full border border-gray-200 whitespace-nowrap shrink-0">
        {text}
      </span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  );
}

// ─── Closed Chat Summary Card ─────────────────────────────────────────────────

function ClosedChatSummary({ conv, resolutionCodes }: {
  conv: Conversation;
  resolutionCodes: typeof RESOLUTION_CODES;
}) {
  const rc = resolutionCodes.find(r => r.code === conv.resolutionCode);
  const RcIcon = rc?.icon ?? CheckCircle2;
  const csatStars = conv.csat ?? 0;

  return (
    <div className="mx-4 my-5 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 flex items-center gap-2.5">
        <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
          <Archive className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white">Чат закрыт</p>
          <p className="text-xs text-teal-100">
            {conv.resolvedAt ? formatAbsDate(conv.resolvedAt) : '—'}
            {conv.resolvedAt ? ` · ${relativeDate(conv.resolvedAt)}` : ''}
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="flex items-center gap-0.5">
            {[1,2,3,4,5].map(n => (
              <span key={n} className={`text-base leading-none ${csatStars >= n ? 'text-yellow-300' : 'text-white/20'}`}>★</span>
            ))}
          </div>
          <p className="text-[10px] text-teal-100 mt-0.5">
            {csatStars > 0 ? `${csatStars}/5 · CSAT` : 'Без оценки'}
          </p>
        </div>
      </div>

      {/* Resolution code */}
      {rc && (
        <div className={`px-4 py-3 border-b border-gray-100 flex items-start gap-3 ${rc.bg}`}>
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${rc.border}`}>
            <RcIcon className={`w-4 h-4 ${rc.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-bold ${rc.color}`}>{rc.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{rc.desc}</p>
          </div>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border shrink-0 ${rc.bg} ${rc.color} ${rc.border}`}>
            {conv.resolutionCode}
          </span>
        </div>
      )}

      {/* Resolution note */}
      {conv.resolutionNote && (
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <FileText className="w-3 h-3" />Резюме оператора
          </p>
          <p className="text-sm text-gray-700 leading-relaxed italic">«{conv.resolutionNote}»</p>
        </div>
      )}

      {/* CSAT block */}
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Star className="w-3 h-3" />Оценка CSAT
        </p>
        {csatStars > 0 ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {[1,2,3,4,5].map(n => (
                <span key={n} className={`text-xl leading-none ${csatStars >= n ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
              ))}
            </div>
            <div>
              <span className={`text-sm font-bold ${csatStars >= 5 ? 'text-green-600' : csatStars >= 4 ? 'text-teal-600' : csatStars >= 3 ? 'text-yellow-600' : 'text-red-600'}`}>
                {csatStars}/5
              </span>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {csatStars === 5 ? 'Отлично' : csatStars === 4 ? 'Хорошо' : csatStars === 3 ? 'Нормально' : csatStars === 2 ? 'Плохо' : 'Очень плохо'}
              </p>
            </div>
            {conv.csatByName && (
              <div className="ml-auto text-right">
                <p className="text-[10px] text-gray-400">Оценил</p>
                <p className="text-xs font-semibold text-gray-700">{conv.csatByName}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic">Клиент не оставил оценку</p>
        )}
      </div>

      {/* Operator who handled */}
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <UserCheck className="w-3 h-3" />Оператор
        </p>
        {conv.assignedToName ? (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
              {conv.assignedToName.slice(0,2)}
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-800">{conv.assignedToName}</p>
              <p className="text-[10px] text-gray-400">Вёл этот чат</p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic">Не назначен</p>
        )}
      </div>

      {/* Metadata grid */}
      <div className="px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-2">
        {[
          { label: 'Создан', value: conv.createdAt ? formatAbsDate(conv.createdAt) : '—' },
          { label: 'Закрыт', value: conv.resolvedAt ? formatAbsDate(conv.resolvedAt) : '—' },
          { label: 'Канал', value: CHANNEL_CFG[conv.channel]?.label ?? conv.channel },
          { label: 'Приоритет', value: PRIORITY_CFG[conv.priority]?.label ?? conv.priority },
          ...(conv.orderRef ? [{ label: 'Заказ', value: conv.orderRef }] : []),
          ...(conv.tags.length > 0 ? [{ label: 'Теги', value: conv.tags.join(', ') }] : []),
        ].map(({ label, value }) => (
          <div key={label}>
            <p className="text-[10px] text-gray-400 font-medium">{label}</p>
            <p className="text-xs text-gray-700 font-medium truncate">{value}</p>
          </div>
        ))}
      </div>

      {/* Read-only notice */}
      <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center gap-2">
        <Lock className="w-3 h-3 text-gray-400 shrink-0" />
        <p className="text-[10px] text-gray-400">Чат закрыт — только просмотр истории</p>
      </div>
    </div>
  );
}

// ─── Conversation List Item ───────────────────────────────────────────────────

function ConvItem({ conv, selected, onClick, onTake, onResolve, showResolveBtn }: {
  conv: Conversation; selected: boolean; onClick: () => void;
  onTake?: () => void; onResolve?: () => void; showResolveBtn?: boolean;
}) {
  const pr = PRIORITY_CFG[conv.priority];
  const st = CONV_STATUS_CFG[conv.status];
  const ch = CHANNEL_CFG[conv.channel];
  const ChIcon = ch.icon;

  return (
    <div className={`w-full text-left border-b border-gray-100 transition-all hover:bg-gray-50 ${selected ? 'bg-blue-50 border-l-[3px] border-l-blue-500' : ''}`}>
    {/* Unassigned "Take" banner */}
    {!conv.assignedTo && !['resolved','closed'].includes(conv.status) && onTake && (
      <div className="flex items-center gap-2 px-4 pt-2.5 pb-0">
        <span className="flex-1 text-xs text-yellow-700 font-medium flex items-center gap-1">
          <Users className="w-3 h-3" />Свободный чат
        </span>
        <button onClick={e => { e.stopPropagation(); onTake(); }}
          className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors shrink-0">
          <UserCheck className="w-3 h-3" />Взять
        </button>
      </div>
    )}
    {/* My Queue — quick "Завершить" action */}
    {showResolveBtn && onResolve && !['resolved','closed'].includes(conv.status) && (
      <div className="flex items-center gap-2 px-4 pt-2.5 pb-0">
        <span className="flex-1 text-xs text-teal-700 font-medium flex items-center gap-1">
          <UserCheck className="w-3 h-3" />Вы ведёте
        </span>
        <button
          onClick={e => { e.stopPropagation(); onResolve(); }}
          className="flex items-center gap-1 px-2 py-1 bg-teal-600 text-white rounded-lg text-xs font-semibold hover:bg-teal-700 transition-colors shrink-0"
        >
          <CheckCircle2 className="w-3 h-3" />Завершить
        </button>
      </div>
    )}
    <button onClick={onClick} className="w-full text-left px-4 py-3.5">
      <div className="flex items-start gap-2.5">
        <Avatar name={conv.clientAvatar} color={ROLE_COLORS[PARTICIPANTS[conv.clientId]?.role ?? 'client']}
          online={PARTICIPANTS[conv.clientId]?.online} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className={`text-sm flex-1 truncate ${conv.unread > 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
              {conv.clientName}
            </p>
            <span className="text-xs text-gray-400 shrink-0">
              {['resolved','closed'].includes(conv.status) && conv.resolvedAt
                ? relativeDate(conv.resolvedAt)
                : conv.lastMessageTime}
            </span>
          </div>
          <p className="text-xs text-gray-500 truncate mb-1.5 leading-snug">{conv.subject}</p>
          <div className="flex items-center gap-1 flex-wrap">
            <span className={`inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded ${ch.badge}`}>
              <ChIcon className="w-2.5 h-2.5" />{ch.label}
            </span>
            <span className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${st.bg} ${st.color}`}>
              <div className={`w-1 h-1 rounded-full ${st.dot}`} />{st.label}
            </span>
            {conv.priority !== 'normal' && (
              <span className={`text-xs font-medium ${pr.color}`}>
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${pr.dot} mr-0.5`} />{pr.label}
              </span>
            )}
            {conv.unread > 0 && (
              <span className="ml-auto shrink-0 min-w-[18px] h-4.5 px-1 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {conv.unread}
              </span>
            )}
            {conv.escalationLevel && (
              <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                <ArrowUpRight className="w-2.5 h-2.5" />L{conv.escalationLevel}
              </span>
            )}
            {/* Waiting-for indicator */}
            {conv.status === 'waiting_external' && conv.waitingFor && (
              <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 truncate max-w-[120px]"
                title={conv.waitingFor}>
                <Hourglass className="w-2.5 h-2.5 shrink-0" />
                <span className="truncate">{conv.waitingFor}</span>
              </span>
            )}
            {/* SLA elapsed timer */}
            {conv.status !== 'resolved' && conv.status !== 'closed' && (() => {
              const mins = elapsedMin(conv.createdAt);
              const col = slaColor(mins, conv.status);
              const SlaIco = slaIcon(mins, conv.status);
              return (
                <span className={`ml-auto flex items-center gap-0.5 text-[10px] font-medium ${col}`} title={`Открыт ${formatElapsed(mins)} назад`}>
                  <SlaIco className="w-2.5 h-2.5" />{formatElapsed(mins)}
                </span>
              );
            })()}
          </div>
        </div>
      </div>
    </button>
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const mine = isMineRole(msg.senderRole);

  // ── Internal agent note ─────────────────────────────────────��─────────────
  if (msg.isInternal) {
    return (
      <div className="flex items-start gap-2.5 mb-3 group">
        <div className="w-7 h-7 bg-amber-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
          <Lock className="w-3.5 h-3.5 text-amber-600" />
        </div>
        <div className="flex-1 max-w-[80%] px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-2xl rounded-tl-sm">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-xs font-semibold text-amber-800">{msg.senderName}</span>
            <span className="text-[10px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide flex items-center gap-0.5">
              <Lock className="w-2.5 h-2.5" />Внутренняя заметка
            </span>
            <span className="text-xs text-amber-400 ml-auto">{msg.timestamp}</span>
          </div>
          <p className="text-sm text-amber-900 leading-relaxed">{msg.text}</p>
        </div>
      </div>
    );
  }

  if (msg.type === 'system' || msg.type === 'escalation') {
    return (
      <div className="flex justify-center my-3">
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs max-w-sm text-center ${
          msg.type === 'escalation' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-gray-100 text-gray-500'
        }`}>
          {msg.type === 'escalation' ? <ArrowUpRight className="w-3.5 h-3.5 shrink-0" /> : <Info className="w-3.5 h-3.5 shrink-0" />}
          {msg.systemText ?? msg.text}
          <span className="opacity-50">· {msg.timestamp}</span>
        </div>
      </div>
    );
  }

  if (msg.type === 'order_ref') {
    return (
      <div className={`flex ${mine ? 'justify-end' : 'justify-start'} mb-3`}>
        <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-2xl text-sm text-blue-700">
          <Package className="w-4 h-4 shrink-0" />
          <span className="font-mono font-semibold">{msg.orderRef}</span>
          <span className="text-xs text-blue-400">{msg.timestamp}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-end gap-2 mb-3 ${mine ? 'flex-row-reverse' : ''}`}>
      {!mine && (
        <div className={`w-7 h-7 ${ROLE_COLORS[msg.senderRole] ?? 'bg-gray-400'} rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0`}>
          {msg.senderName.slice(0, 2)}
        </div>
      )}
      <div className={`max-w-[72%] flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
        {!mine && <p className="text-xs text-gray-400 mb-1 ml-1">{msg.senderName}</p>}
        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          mine ? 'bg-blue-600 text-white rounded-br-sm'
               : msg.senderRole === 'bot' ? 'bg-gray-100 text-gray-500 italic text-xs'
               : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
        }`}>
          {msg.text}
        </div>
        <div className={`flex items-center gap-1 mt-1 ${mine ? 'flex-row-reverse' : ''}`}>
          <span className="text-xs text-gray-400">{msg.timestamp}</span>
          {mine && (msg.read ? <CheckCheck className="w-3.5 h-3.5 text-blue-400" /> : <Check className="w-3.5 h-3.5 text-gray-300" />)}
        </div>
      </div>
    </div>
  );
}

// ─── Waiting External Modal ───────────────────────────────────────────────────

function WaitingModal({
  conv, onConfirm, onClose,
}: {
  conv: Conversation;
  onConfirm: (waitingFor: string) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState('');
  const [custom, setCustom] = useState('');
  const ch = CHANNEL_CFG[conv.channel];
  const ChIcon = ch.icon;

  const label = selected
    ? WAITING_FOR_OPTIONS.find(o => o.id === selected)!.label + (custom.trim() ? ` — ${custom.trim()}` : '')
    : '';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
              <Hourglass className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-white">Ждём партнёра</p>
              <p className="text-xs text-indigo-200">{conv.clientName} · <ChIcon className="inline w-3 h-3 mr-0.5" />{ch.label}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-gray-500 leading-relaxed">
            Статус обращения изменится на <span className="font-semibold text-indigo-700">«Ждём партнёра»</span>.
            SLA-таймер продолжит работу. Укажите, кого ожидаем — это попадёт в аудит-лог.
          </p>

          <div className="space-y-2">
            {WAITING_FOR_OPTIONS.map(o => {
              const Icon = o.icon;
              const sel = selected === o.id;
              return (
                <button key={o.id} onClick={() => setSelected(o.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                    sel ? 'border-indigo-500 bg-indigo-50 ring-2 ring-offset-1 ring-indigo-300' : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${sel ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                    <Icon className={`w-4 h-4 ${sel ? 'text-indigo-600' : 'text-gray-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold leading-tight ${sel ? 'text-indigo-800' : 'text-gray-700'}`}>{o.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{o.desc}</p>
                  </div>
                  {sel && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                </button>
              );
            })}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Уточнение <span className="text-gray-400 font-normal">(необязательно)</span>
            </label>
            <input
              value={custom} onChange={e => setCustom(e.target.value)}
              placeholder="Например: ждём фото повреждения от курьера..."
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2.5 p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
            <Shield className="w-4 h-4 text-indigo-600 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-indigo-900">Записано в аудит-лог</p>
              <p className="text-xs text-indigo-700">{CURRENT_AGENT.name} · {nowFull()}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-gray-200 shrink-0">
          <button onClick={onClose}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
            Отмена
          </button>
          <button onClick={() => selected && onConfirm(label)}
            disabled={!selected}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors shadow-md shadow-indigo-100">
            <Hourglass className="w-4 h-4" />Поставить на ожидание
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Chat Window ──────────────────────────────────────��───────────────────────

function ChatWindow({
  conv, agentRole, actionLog,
  onSend, onEscalate, onCloseConv, onAssign, onReopen, onStatusChange, onActionLogged,
  onCancelCourierOrder, onEscalateCourierCancel, onCourierReassign, onChangePriority,
  onSetWaiting, onResumeWaiting, onRoute,
  agentsList,
}: {
  conv: Conversation; agentRole: AgentRole; actionLog: SupportAction[];
  onSend: (text: string, isInternal?: boolean) => void;
  onEscalate: () => void;
  onCloseConv: () => void;
  onAssign: (agentId: string) => void;
  onReopen: () => void;
  onStatusChange: (orderId: string, status: OrderStatus, note: string) => void;
  onActionLogged: (action: SupportAction) => void;
  onCancelCourierOrder: (order: CourierActiveOrder, reason: string) => void;
  onEscalateCourierCancel: (order: CourierActiveOrder) => void;
  onCourierReassign?: (orderId: string, courierId: string | null, courierName: string | null, note: string) => void;
  onChangePriority?: (priority: Priority) => void;
  onSetWaiting?: () => void;
  onResumeWaiting?: () => void;
  onRoute?: (opts: { agentId?: string; agentName?: string; deptLabel: string; systemText: string }) => void;
  agentsList?: (AgentProfile & { active?: boolean })[];
}) {
  const isCourierConv = conv.channel === 'couriers';
  const courierId = COURIER_ID_MAP[conv.clientId] ?? null;

  const [text, setText] = useState('');
  const [isNoteMode, setIsNoteMode] = useState(false);
  const [showQuick, setShowQuick] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [showPriority, setShowPriority] = useState(false);
  const [showRoutingModal, setShowRoutingModal] = useState(false);
  const [rightPanel, setRightPanel] = useState<'order' | 'courier' | 'log' | null>(
    isCourierConv && courierId ? 'courier' : conv.orderRef ? 'order' : null
  );
  const bottomRef = useRef<HTMLDivElement>(null);
  const perms = AGENT_ROLES[agentRole];
  const ch = CHANNEL_CFG[conv.channel];
  const st = CONV_STATUS_CFG[conv.status];
  const isClosed = conv.status === 'resolved' || conv.status === 'closed';
  const ChIcon = ch.icon;

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [conv.messages.length]);

  // Detect order refs in all messages
  const allOrderRefs = useMemo(() => {
    const refs = new Set<string>();
    conv.messages.forEach(m => {
      if (m.type === 'order_ref' && m.orderRef) refs.add(m.orderRef);
      if (m.text) extractOrderRefs(m.text).forEach(r => refs.add(r));
    });
    if (conv.orderRef) refs.add(conv.orderRef);
    return [...refs];
  }, [conv.messages, conv.orderRef]);

  function handleSend() {
    if (!text.trim() || !perms.canReply) return;
    onSend(text.trim(), isNoteMode);
    setText('');
    setShowQuick(false);
  }

  const quickFiltered = QUICK_REPLIES.filter(q => q.channel === conv.channel || q.channel === 'all');
  const agents = (agentsList ?? AGENTS).filter(a => a.id !== CURRENT_AGENT.id && a.active !== false);
  const convActionLog = actionLog.filter(a => a.conversationId === conv.id);

  return (
    <div className="flex h-full min-w-0">
      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-4 py-3 bg-white border-b border-gray-200 shrink-0">
          <div className="flex items-start gap-3">
            <Avatar name={conv.clientAvatar}
              color={ROLE_COLORS[PARTICIPANTS[conv.clientId]?.role ?? 'client']}
              online={PARTICIPANTS[conv.clientId]?.online} size="md" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-gray-900 text-sm">{conv.clientName}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${ch.badge}`}>
                  <ChIcon className="inline w-2.5 h-2.5 mr-0.5" />{ch.label}
                </span>
                <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${st.bg} ${st.color}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{st.label}
                </span>
                {/* Priority badge + change dropdown */}
                {perms.canAssign ? (
                  <div className="relative">
                    <button onClick={() => setShowPriority(p => !p)}
                      className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border transition-colors ${PRIORITY_CFG[conv.priority].bg} ${PRIORITY_CFG[conv.priority].color} hover:opacity-80`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_CFG[conv.priority].dot}`} />
                      {PRIORITY_CFG[conv.priority].label}
                      <ChevronDown className="w-3 h-3 opacity-60" />
                    </button>
                    {showPriority && (
                      <div className="absolute left-0 top-7 z-30 w-44 bg-white border border-gray-200 rounded-xl shadow-xl py-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 py-1.5">Приоритет</p>
                        {(['low','normal','high','critical'] as Priority[]).map(p => {
                          const cfg = PRIORITY_CFG[p];
                          return (
                            <button key={p} onClick={() => { onChangePriority?.(p); setShowPriority(false); }}
                              className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left ${conv.priority === p ? 'font-semibold' : ''}`}>
                              <span className={`w-2 h-2 rounded-full ${cfg.dot} shrink-0`} />
                              <span className={`text-xs ${cfg.color}`}>{cfg.label}</span>
                              {conv.priority === p && <Check className="w-3 h-3 text-gray-400 ml-auto" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : conv.priority !== 'normal' ? (
                  <span className={`text-xs font-semibold ${PRIORITY_CFG[conv.priority].color}`}>
                    {PRIORITY_CFG[conv.priority].label}
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                <p className="text-xs text-gray-400 truncate">{conv.subject}</p>
                {conv.assignedToName && (
                  <span className="text-xs text-green-600 flex items-center gap-0.5">
                    <User className="w-3 h-3" />{conv.assignedToName}
                  </span>
                )}
                {allOrderRefs.length > 0 && (
                  <button onClick={() => setRightPanel(rightPanel === 'order' ? null : 'order')}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                    <Package className="w-3 h-3" />{allOrderRefs[0]}
                  </button>
                )}
              </div>
            </div>
            {/* Actions */}
            <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
              {/* Right panel toggles */}
              {isCourierConv && courierId && (
                <button onClick={() => setRightPanel(rightPanel === 'courier' ? null : 'courier')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors border ${
                    rightPanel === 'courier' ? 'border-orange-300 bg-orange-50 text-orange-700' : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                  }`}>
                  <Navigation className="w-3.5 h-3.5" />Слежение
                </button>
              )}
              <button onClick={() => setRightPanel(rightPanel === 'order' ? null : 'order')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors border ${
                  rightPanel === 'order' ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                }`}>
                <Package className="w-3.5 h-3.5" />Заказ
              </button>
              <button onClick={() => setRightPanel(rightPanel === 'log' ? null : 'log')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors border ${
                  rightPanel === 'log' ? 'border-purple-300 bg-purple-50 text-purple-700' : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                }`}>
                <History className="w-3.5 h-3.5" />Лог
                {convActionLog.length > 0 && <span className="w-4 h-4 bg-purple-600 text-white text-xs rounded-full flex items-center justify-center">{convActionLog.length}</span>}
              </button>
              {/* Assign */}
              {perms.canAssign && !isClosed && (
                <div className="relative">
                  <button onClick={() => setShowAssign(p => !p)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-medium text-gray-700">
                    <UserPlus className="w-3.5 h-3.5" />Назначить
                  </button>
                  {showAssign && (
                    <div className="absolute right-0 top-9 z-20 w-52 bg-white border border-gray-200 rounded-xl shadow-xl py-1">
                      {agents.map(a => (
                        <button key={a.id} onClick={() => { onAssign(a.id); setShowAssign(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left">
                          <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0">{a.avatar}</div>
                          <div>
                            <p className="text-xs font-medium text-gray-800">{a.name}</p>
                            <p className="text-xs text-gray-400">{AGENT_ROLE_CFG[a.role].label} · {a.activeChats} чатов</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {perms.canEscalate && !isClosed && conv.status !== 'escalated' && (
                <button onClick={onEscalate}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 border border-orange-200 bg-orange-50 hover:bg-orange-100 rounded-xl text-xs font-medium text-orange-700">
                  <ArrowUpRight className="w-3.5 h-3.5" />Эскалация
                </button>
              )}
              {/* Route / Forward to department */}
              {perms.canReply && !isClosed && (
                <button onClick={() => setShowRoutingModal(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 border border-violet-200 bg-violet-50 hover:bg-violet-100 rounded-xl text-xs font-medium text-violet-700">
                  <Send className="w-3.5 h-3.5" />Переслать
                </button>
              )}
              {/* Waiting External status */}
              {perms.canReply && !isClosed && conv.status !== 'waiting_external' && (
                <button
                  title="Поставить статус «Ждём ответа партнёра»"
                  onClick={() => onSetWaiting?.()}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 rounded-xl text-xs font-medium text-indigo-700">
                  <Hourglass className="w-3.5 h-3.5" />Ждём
                </button>
              )}
              {/* Resume from waiting */}
              {perms.canReply && !isClosed && conv.status === 'waiting_external' && (
                <button
                  title="Возобновить работу по кейсу"
                  onClick={() => onResumeWaiting?.()}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 border border-green-200 bg-green-50 hover:bg-green-100 rounded-xl text-xs font-medium text-green-700">
                  <RefreshCw className="w-3.5 h-3.5" />Возобновить
                </button>
              )}
              {perms.canClose && !isClosed && (
                <button onClick={onCloseConv}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 border border-green-200 bg-green-50 hover:bg-green-100 rounded-xl text-xs font-medium text-green-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />Закрыть
                </button>
              )}
              {isClosed && perms.canAssign && (
                <button onClick={onReopen}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 border border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-xl text-xs font-medium text-blue-700">
                  <RefreshCw className="w-3.5 h-3.5" />Переоткрыть
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 bg-gray-50/60">
          {/* Date separator: conversation start */}
          {conv.createdAt && (
            <DateSeparator dateStr={conv.createdAt} label={`Начало · ${formatAbsDate(conv.createdAt)} · ${relativeDate(conv.createdAt)}`} />
          )}
          {conv.messages.map((msg, idx) => {
            // Insert date separator when day changes between messages
            const prev = conv.messages[idx - 1];
            let sep: React.ReactNode = null;
            if (prev && msg.timestamp && prev.timestamp) {
              // Compare just HH:MM — if current is earlier than prev, assume day rolled over
              const [ph, pm] = prev.timestamp.split(':').map(Number);
              const [ch2, cm] = msg.timestamp.split(':').map(Number);
              if (ch2 * 60 + cm < ph * 60 + pm - 60) {
                sep = <DateSeparator key={`sep_${msg.id}`} dateStr="" label="— следующий день —" />;
              }
            }
            return (
              <div key={msg.id} style={{ display: 'contents' }}>
                {sep}
                <MessageBubble msg={msg} />
              </div>
            );
          })}
          {/* Closed chat full summary */}
          {isClosed && (
            <div style={{ display: 'contents' }}>
              {conv.resolvedAt && (
                <DateSeparator dateStr={conv.resolvedAt} label={`Закрыт · ${formatAbsDate(conv.resolvedAt)} · ${relativeDate(conv.resolvedAt)}`} />
              )}
              <ClosedChatSummary conv={conv} resolutionCodes={RESOLUTION_CODES} />
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Waiting-external banner */}
        {conv.status === 'waiting_external' && (
          <div className="px-4 py-2 bg-indigo-50 border-t border-indigo-200 shrink-0">
            <div className="flex items-center gap-2 text-xs text-indigo-700 flex-wrap">
              <Hourglass className="w-3.5 h-3.5 shrink-0 text-indigo-500 animate-pulse" />
              <span className="font-semibold">Ждём:</span>
              <span className="flex-1">{conv.waitingFor ?? 'Ответа партнёра'}</span>
              <span className="text-indigo-400 text-[10px] shrink-0">SLA идёт · {formatElapsed(elapsedMin(conv.createdAt))}</span>
              {perms.canReply && (
                <button onClick={() => onResumeWaiting?.()}
                  className="shrink-0 flex items-center gap-1 px-2 py-0.5 bg-white border border-indigo-300 text-indigo-700 hover:bg-indigo-50 rounded-lg text-xs font-medium transition-colors">
                  <RefreshCw className="w-3 h-3" />Возобновить
                </button>
              )}
            </div>
          </div>
        )}

        {/* Escalation path */}
        {conv.escalationLevel && conv.status === 'escalated' && (
          <div className="px-4 py-2 bg-red-50 border-t border-red-200 shrink-0">
            <div className="flex items-center gap-2 text-xs text-red-700 flex-wrap">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Путь эскалации:</span>
              {['L1 (Первая линия)', 'L2 (Вторая линия)', 'Руководитель'].slice(0, conv.escalationLevel).map((s, i, arr) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight className="w-3 h-3 opacity-50" />}
                  <span className={i === arr.length - 1 ? 'font-bold' : 'opacity-60'}>{s}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Quick replies */}
        {showQuick && !isClosed && (
          <div className="px-4 py-2.5 bg-white border-t border-gray-200 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Быст��ые ответы</p>
              <button onClick={() => setShowQuick(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-3.5 h-3.5 text-gray-400" /></button>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {quickFiltered.map(q => (
                <button key={q.id} onClick={() => { setText(q.text); setShowQuick(false); }}
                  className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs rounded-xl hover:bg-blue-100 transition-colors text-left">
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        {!isClosed && perms.canReply && (
          <div className={`px-4 py-3 border-t shrink-0 transition-colors ${isNoteMode ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'}`}>
            {/* Note mode banner */}
            {isNoteMode && (
              <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-amber-100 border border-amber-200 rounded-xl">
                <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-800 font-medium flex-1">Режим внутренней заметки — клиент не увидит это сообщение</p>
                <button onClick={() => setIsNoteMode(false)} className="p-0.5 hover:bg-amber-200 rounded text-amber-600"><X className="w-3.5 h-3.5" /></button>
              </div>
            )}
            <div className="flex items-end gap-2">
              <div className={`flex-1 border rounded-2xl px-4 py-2.5 focus-within:ring-2 transition-all ${
                isNoteMode
                  ? 'bg-amber-50 border-amber-300 focus-within:ring-amber-300 focus-within:border-amber-400'
                  : 'bg-gray-50 border-gray-200 focus-within:ring-blue-500 focus-within:border-blue-400'
              }`}>
                <textarea value={text} onChange={e => setText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder={isNoteMode ? "Внутренняя заметка для команды (не видна клиенту)..." : "Напишите сообщение... (Enter — отправить)"}
                  rows={text.split('\n').length > 2 ? 3 : 1}
                  className={`w-full bg-transparent outline-none resize-none text-sm ${isNoteMode ? 'text-amber-900 placeholder-amber-400' : 'text-gray-800 placeholder-gray-400'}`} />
                <div className="flex items-center gap-2 mt-1.5">
                  <button onClick={() => setShowQuick(p => !p)}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 transition-colors">
                    <ZapIcon className="w-3.5 h-3.5" />Шаблоны
                  </button>
                  <button onClick={() => { import('sonner').then(m => m.toast.info('Прикрепить файл', { description: 'Поддерживаются PNG/JPG/PDF до 10 MB' })); }}
                    className="p-0.5 text-gray-400 hover:text-gray-600 rounded transition-colors" title="Прикрепить файл">
                    <Paperclip className="w-3.5 h-3.5" />
                  </button>
                  {/* Internal note toggle */}
                  <button onClick={() => setIsNoteMode(p => !p)}
                    title={isNoteMode ? 'Обычное сообщение' : 'Добавить внутреннюю заметку'}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium transition-colors ${
                      isNoteMode ? 'bg-amber-200 text-amber-800' : 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'
                    }`}>
                    <Lock className="w-3 h-3" />
                    {isNoteMode ? 'Заметка' : 'Заметка'}
                  </button>
                  <div className="ml-auto flex items-center gap-2 text-xs text-gray-400">
                    <Shield className="w-3 h-3" />{CURRENT_AGENT.name}
                  </div>
                </div>
              </div>
              <button onClick={handleSend} disabled={!text.trim()}
                className={`w-11 h-11 disabled:bg-gray-200 text-white rounded-2xl flex items-center justify-center transition-colors shrink-0 ${
                  isNoteMode ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'
                }`}>
                {isNoteMode ? <PencilLine className="w-4 h-4" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
        {isClosed && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-center shrink-0">
            <p className="text-xs text-gray-400">Чат закрыт · Только просмотр</p>
          </div>
        )}
      </div>

      {/* ── Routing Modal (at root portal level inside ChatWindow) ── */}
      {showRoutingModal && (
        <EscalateRoutingModal
          conv={conv}
          fromAgent={{
            id: CURRENT_AGENT.id,
            name: CURRENT_AGENT.name,
            role: CURRENT_AGENT.role,
            roleLabelFull: AGENT_ROLE_CFG[CURRENT_AGENT.role].label,
          }}
          onConfirm={({ deptLabel, agentId, agentName, comment, systemText }) => {
            const targetLabel = agentName ? `${deptLabel} → ${agentName}` : deptLabel;
            // Internal note with routing comment (visible only to agents)
            const noteText = `📋 Комме��тарий для ${targetLabel}: ${comment}`;
            onSend(noteText, true);
            onActionLogged({
              id: `act_route_${Date.now()}`,
              agentId: CURRENT_AGENT.id,
              agentName: CURRENT_AGENT.name,
              agentRole: CURRENT_AGENT.role,
              action: 'escalated',
              note: `Перенаправлено → ${targetLabel}: ${comment.slice(0, 80)}`,
              timestamp: nowFull(),
              conversationId: conv.id,
            });
            setShowRoutingModal(false);
            // Notify parent — parent will add system message + reassign + auto-navigate
            onRoute?.({ agentId, agentName, deptLabel, systemText });
          }}
          onClose={() => setShowRoutingModal(false)}
        />
      )}

      {/* ── Right panel: Courier / Order / Log ── */}
      {rightPanel && (
        <div className={`${rightPanel === 'courier' ? 'w-[340px]' : 'w-80'} border-l border-gray-200 bg-white flex flex-col shrink-0 overflow-hidden transition-all`}>
          {/* Panel header */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-gray-50 shrink-0">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              {rightPanel === 'courier' && <span className="flex items-center gap-1.5"><Navigation className="w-3.5 h-3.5 text-orange-500" /><span className="text-xs font-semibold text-gray-700">Слежение за курьером</span></span>}
              {rightPanel === 'order'   && <span className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5 text-blue-500" /><span className="text-xs font-semibold text-gray-700">Информация о заказе</span></span>}
              {rightPanel === 'log'     && <span className="flex items-center gap-1.5"><History className="w-3.5 h-3.5 text-purple-500" /><span className="text-xs font-semibold text-gray-700">Аудит-лог</span></span>}
            </div>
            {/* Quick switch tabs */}
            <div className="flex items-center gap-0.5">
              {isCourierConv && courierId && (
                <button onClick={() => setRightPanel('courier')} title="Слежение"
                  className={`p-1.5 rounded-lg transition-colors ${rightPanel === 'courier' ? 'bg-orange-100 text-orange-600' : 'text-gray-400 hover:bg-gray-100'}`}>
                  <Navigation className="w-3.5 h-3.5" />
                </button>
              )}
              <button onClick={() => setRightPanel('order')} title="Заказ"
                className={`p-1.5 rounded-lg transition-colors ${rightPanel === 'order' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-100'}`}>
                <Package className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setRightPanel('log')} title="Аудит"
                className={`p-1.5 rounded-lg transition-colors ${rightPanel === 'log' ? 'bg-purple-100 text-purple-600' : 'text-gray-400 hover:bg-gray-100'}`}>
                <History className="w-3.5 h-3.5" />
              </button>
              <div className="w-px h-4 bg-gray-200 mx-1" />
              <button onClick={() => setRightPanel(null)} title="Закрыть"
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            {/* ── COURIER TRACKING ── */}
            {rightPanel === 'courier' && courierId && (
              <CourierTrackingPanel
                courierId={courierId}
                agentRole={agentRole}
                onCancelOrder={(order) => {
                  onCancelCourierOrder(order, 'Отменено службой поддержки');
                  // Post system message to chat
                  onSend(`📦 Заказ ${order.orderNumber} (${order.merchant.name}) — ОТМЕНЁН службой поддержки`);
                  onActionLogged({
                    id: `act_cancel_${Date.now()}`,
                    agentId: CURRENT_AGENT.id,
                    agentName: CURRENT_AGENT.name,
                    agentRole: CURRENT_AGENT.role,
                    action: 'status_change',
                    orderRef: order.orderNumber,
                    fromStatus: 'in_transit',
                    toStatus: 'cancelled',
                    note: 'Отменено из чата курьера',
                    timestamp: nowFull(),
                    conversationId: conv.id,
                  });
                }}
                onEscalateForCancel={(order) => {
                  onEscalateCourierCancel(order);
                  onActionLogged({
                    id: `act_esc_cancel_${Date.now()}`,
                    agentId: CURRENT_AGENT.id,
                    agentName: CURRENT_AGENT.name,
                    agentRole: CURRENT_AGENT.role,
                    action: 'escalated',
                    orderRef: order.orderNumber,
                    note: `Запрос на отмену заказа ${order.orderNumber} — передан агенту L2`,
                    timestamp: nowFull(),
                    conversationId: conv.id,
                  });
                }}
                onSendToCustomer={(customerName, text) => {
                  onSend(`💬 Сообщение клиенту [${customerName}]: ${text}`);
                  onActionLogged({
                    id: `act_msg_${Date.now()}`,
                    agentId: CURRENT_AGENT.id,
                    agentName: CURRENT_AGENT.name,
                    agentRole: CURRENT_AGENT.role,
                    action: 'note_added',
                    note: `Написано клиенту ${customerName}`,
                    timestamp: nowFull(),
                    conversationId: conv.id,
                  });
                }}
              />
            )}
            {/* ── ORDER LOOKUP ── */}
            {rightPanel === 'order' && (
              <OrderLookup
                agentRole={agentRole}
                conversationId={conv.id}
                initialRef={allOrderRefs[0]}
                onStatusChange={onStatusChange}
                onActionLogged={onActionLogged}
                onCourierReassign={onCourierReassign}
                onSendMessage={onSend}
              />
            )}
            {/* ── AUDIT LOG ── */}
            {rightPanel === 'log' && (
              <div className="h-full overflow-y-auto">
                {convActionLog.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-center text-gray-400 px-4">
                    <ClipboardList className="w-8 h-8 mb-2 opacity-30" />
                    <p className="text-sm">Нет действий</p>
                    <p className="text-xs mt-1 opacity-70">История действий агентов по этому чату</p>
                  </div>
                ) : (
                  <div className="p-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Аудит · {convActionLog.length} записей
                    </p>
                    {convActionLog.slice().reverse().map(a => <ActionLogItem key={a.id} action={a} />)}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Agent Cabinet Modal ──────────────────────────────────────────────────────

function AgentCabinetModal({
  agent, currentUserRole, onClose, onRoleChange, onToggleActive, onResetPassword,
}: {
  agent: AgentProfile & { active?: boolean };
  currentUserRole: AgentRole;
  onClose: () => void;
  onRoleChange?: (agentId: string, newRole: AgentRole) => void;
  onToggleActive?: (agentId: string) => void;
  onResetPassword?: (agentId: string) => string;
}) {
  const isAdmin = currentUserRole === 'admin';
  const isAdminOrLead = currentUserRole === 'admin' || currentUserRole === 'lead';
  const roleCfg = AGENT_ROLE_CFG[agent.role];
  const agentPerms = AGENT_ROLES[agent.role];
  const [showRoleChange, setShowRoleChange] = useState(false);
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [copied, setCopied] = useState(false);
  const isActive = agent.active !== false;

  const ESCALATION_TEXT: Record<AgentRole, string[]> = {
    l1: ['✅ Принимает входящие обращения первой линии', '✅ Может эскалировать на L2', '❌ Нельзя закрывать критичные чаты'],
    l2: ['✅ Принимает эскалации от L1', '✅ Закрывает чаты и назначает агентов', '✅ Видит внутренние каналы', '✅ Эскалирует на руководителя'],
    lead: ['✅ Финальный уровень эскалации', '✅ Видит все чаты и статистику', '✅ Управляет назначением агентов'],
    admin: ['✅ Полный доступ ко всем функциям', '✅ Управление ролями и командой', '✅ Просмотр всего аудит-лога', '✅ Создание и деактивация операторов'],
    readonly: ['👁 Только просмотр всех чатов', '✅ Доступ к аналитике и логам', '❌ Не может писать сообщения'],
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className={`px-6 py-5 rounded-t-2xl ${isActive ? 'bg-gradient-to-br from-blue-600 to-indigo-700' : 'bg-gradient-to-br from-gray-500 to-gray-700'} text-white shrink-0`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="relative w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-2xl font-bold">
                {agent.avatar}
                {!isActive && (
                  <div className="absolute inset-0 bg-gray-900/40 rounded-2xl flex items-center justify-center">
                    <UserX className="w-5 h-5 text-white/80" />
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-lg">{agent.name}</h2>
                  {!isActive && <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">Деактивирован</span>}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/20">{roleCfg.label}</span>
                  <div className={`flex items-center gap-1 text-xs ${agent.online && isActive ? 'text-green-300' : 'text-gray-300'}`}>
                    <div className={`w-2 h-2 rounded-full ${agent.online && isActive ? 'bg-green-400' : 'bg-gray-400'}`} />
                    {agent.online && isActive ? 'Онлайн' : 'Офлайн'}
                  </div>
                </div>
                <p className="text-blue-200 text-xs mt-0.5">{agent.email}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Активных', value: agent.activeChats, color: 'text-blue-600' },
              { label: 'Закрыто сег.', value: agent.resolvedToday, color: 'text-green-600' },
              { label: 'Ср. ответ', value: agent.avgResponseTime, color: 'text-orange-600' },
              { label: 'CSAT', value: agent.csat ? `${agent.csat}⭐` : '—', color: 'text-purple-600' },
            ].map(s => (
              <div key={s.label} className="text-center p-3 bg-gray-50 rounded-xl border border-gray-200">
                <p className={`font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Admin Management Panel */}
          {isAdminOrLead && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-4">
              <h3 className="text-sm font-bold text-amber-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600" />Управление оператором
                <span className="ml-auto text-xs font-normal text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                  {isAdmin ? 'Только Администратор' : 'Руководитель'}
                </span>
              </h3>
              {/* Change Role — admin only */}
              {isAdmin && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-amber-800">Роль оператора</p>
                    <button onClick={() => setShowRoleChange(p => !p)}
                      className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 font-medium underline underline-offset-2">
                      <UserCog className="w-3.5 h-3.5" />{showRoleChange ? 'Скрыть' : 'Изменить роль'}
                    </button>
                  </div>
                  {showRoleChange ? (
                    <div className="space-y-1.5">
                      {(['l1','l2','lead','admin','readonly'] as AgentRole[]).map(r => {
                        const cfg = AGENT_ROLE_CFG[r];
                        const isCurrent = agent.role === r;
                        return (
                          <button key={r}
                            onClick={() => { if (!isCurrent) { onRoleChange?.(agent.id, r); setShowRoleChange(false); } }}
                            disabled={isCurrent}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 text-left transition-all ${
                              isCurrent ? 'border-amber-400 bg-amber-100 cursor-default' : 'border-gray-200 bg-white hover:border-amber-300 hover:bg-amber-50'
                            }`}>
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${isCurrent ? cfg.bg : 'bg-gray-100'} ${isCurrent ? cfg.color : 'text-gray-400'}`}>
                              {r === 'l1' ? 'L1' : r === 'l2' ? 'L2' : r === 'lead' ? '★' : r === 'admin' ? '⚙' : '👁'}
                            </div>
                            <p className={`flex-1 text-xs font-semibold ${isCurrent ? 'text-amber-800' : 'text-gray-700'}`}>{cfg.label}</p>
                            {isCurrent ? <span className="text-xs text-amber-700 font-semibold shrink-0">Текущая</span> : <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${roleCfg.bg} ${roleCfg.color} text-xs font-semibold`}>{roleCfg.label}</span>
                  )}
                </div>
              )}
              {/* Reset Password */}
              <div className="border-t border-amber-200 pt-3">
                <p className="text-xs font-semibold text-amber-800 mb-2">Сброс пароля</p>
                {newPassword ? (
                  <div className="p-3 bg-white border-2 border-green-300 rounded-xl">
                    <p className="text-xs text-green-700 font-semibold mb-1.5 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />Новый пароль — передайте оператору через защищённый канал:
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono font-bold text-gray-900 tracking-wider">{newPassword}</code>
                      <button onClick={() => { navigator.clipboard.writeText(newPassword).catch(()=>{}); setCopied(true); setTimeout(()=>setCopied(false),2000); }}
                        className={`p-2 rounded-lg border transition-colors ${copied ? 'bg-green-100 border-green-300 text-green-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-amber-700 mt-1.5">⚠️ Пароль показан только один раз</p>
                  </div>
                ) : (
                  <button onClick={() => setNewPassword(onResetPassword?.(agent.id) ?? generatePassword())}
                    className="flex items-center gap-2 px-3 py-2 border border-amber-300 bg-white hover:bg-amber-50 text-amber-700 rounded-xl text-xs font-medium transition-colors">
                    <KeyRound className="w-3.5 h-3.5" />Сбросить и выдать новый пароль
                  </button>
                )}
              </div>
              {/* Deactivate */}
              <div className="border-t border-amber-200 pt-3">
                <p className="text-xs font-semibold text-amber-800 mb-2">Статус аккаунта</p>
                {confirmDeactivate ? (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-xs text-red-700 font-medium mb-2">
                      {isActive ? 'Деактивировать? Оператор потеряет доступ.' : 'Активировать? Оператор снова получит доступ.'}
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => setConfirmDeactivate(false)} className="flex-1 py-1.5 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50">Отмена</button>
                      <button onClick={() => { onToggleActive?.(agent.id); setConfirmDeactivate(false); onClose(); }}
                        className={`flex-1 py-1.5 ${isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white rounded-lg text-xs font-bold transition-colors`}>
                        {isActive ? 'Деактивировать' : 'Активировать'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDeactivate(true)}
                    className={`flex items-center gap-2 px-3 py-2 border rounded-xl text-xs font-medium transition-colors ${
                      isActive ? 'border-red-200 bg-white hover:bg-red-50 text-red-600' : 'border-green-200 bg-white hover:bg-green-50 text-green-600'
                    }`}>
                    <Power className="w-3.5 h-3.5" />{isActive ? 'Деактивировать оператора' : 'Активировать оператора'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Permissions */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600" />Права в чат-центре
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Отвечать в чате', val: agentPerms.canReply },
                { label: 'Эскалировать', val: agentPerms.canEscalate },
                { label: 'Закрывать чаты', val: agentPerms.canClose },
                { label: 'Назначать агентов', val: agentPerms.canAssign },
                { label: 'Видеть все чаты', val: agentPerms.canViewAll },
                { label: 'Внутренние чаты', val: agentPerms.canViewInternal },
              ].map(p => (
                <div key={p.label} className={`flex items-center gap-2.5 p-2.5 rounded-xl border ${p.val ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                  {p.val
                    ? <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                    : <XCircle className="w-4 h-4 text-gray-300 shrink-0" />}
                  <span className={`text-xs font-medium ${p.val ? 'text-green-800' : 'text-gray-500'}`}>{p.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Escalation role */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-sm font-semibold text-blue-900 mb-2">Роль в эскалации</p>
            <div className="text-xs text-blue-700 space-y-1.5">
              {(ESCALATION_TEXT[agent.role] ?? []).map((line, i) => <p key={i}>{line}</p>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Generate Password helper ──────────────────────────────────────────────────

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ─── Create Operator Modal ─────────────────────────────────────────────────────

function CreateOperatorModal({
  onClose, onCreate,
}: {
  onClose: () => void;
  onCreate: (agent: AgentProfile) => void;
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AgentRole>('l1');
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<{ name: string; email: string; password: string; role: AgentRole } | null>(null);
  const [copied, setCopied] = useState(false);

  const name = `${lastName} ${firstName}`.trim();
  const avatar = [lastName[0], firstName[0]].filter(Boolean).join('').toUpperCase() || '??';
  const roleCfg = AGENT_ROLE_CFG[role];

  const ROLE_DESCRIPTIONS: Record<AgentRole, { desc: string; perms: string[] }> = {
    l1: { desc: 'Принимает входящие обращения от клиентов, курьеров, мерчантов.', perms: ['Отвечать в чате', 'Эскалировать на L2', 'Видеть свои чаты'] },
    l2: { desc: 'Принимает эскалации от L1, решает сложные вопросы.', perms: ['Все права L1', 'Закрывать чаты', 'Назначать агентов', 'Внутренние каналы'] },
    lead: { desc: 'Управляет командой, видит все чаты и статистику команды.', perms: ['Все права L2', 'Видеть все чаты', 'Финальная эскалация'] },
    admin: { desc: 'Полный доступ: управление операторами, ролями, аудит-лог.', perms: ['Все права', 'Создание операторов', 'Смена ролей', 'Полный аудит'] },
    readonly: { desc: 'Только просмотр: все чаты и логи, без возможности отвечать.', perms: ['Просмотр всех чатов', 'Аналитика', 'Нельзя писать'] },
  };

  function handleCreate() {
    if (!firstName || !lastName || !email || saving) return;
    setSaving(true);
    const password = generatePassword();
    setTimeout(() => {
      const newAgent: AgentProfile = {
        id: `agent_${Date.now()}`,
        name, email, role,
        online: false, avatar,
        activeChats: 0, resolvedToday: 0,
        avgResponseTime: '—', csat: 0,
      };
      onCreate(newAgent);
      setSaving(false);
      setCreated({ name, email, password, role });
    }, 700);
  }

  if (created) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col">
          <div className="px-6 py-5 bg-gradient-to-br from-green-600 to-emerald-600 rounded-t-2xl text-white text-center">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <h2 className="font-bold text-lg">Оператор создан!</h2>
            <p className="text-green-100 text-sm mt-0.5">{created.name} · {AGENT_ROLE_CFG[created.role].label}</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl">
              <p className="text-xs font-bold text-amber-900 mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />Временный пароль — передайте лично или через защищённый канал:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2.5 bg-white border border-amber-300 rounded-lg text-base font-mono font-bold text-gray-900 tracking-wider">{created.password}</code>
                <button
                  onClick={() => { navigator.clipboard.writeText(created.password).catch(()=>{}); setCopied(true); setTimeout(()=>setCopied(false),2000); }}
                  className={`p-2.5 rounded-lg border transition-colors ${copied ? 'bg-green-100 border-green-300 text-green-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-amber-700 mt-2">Пароль отображается один раз — скопируйте его сейчас.</p>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700 space-y-1">
              <p className="font-semibold text-blue-900">Данные для входа:</p>
              <p>Email: <span className="font-mono">{created.email}</span></p>
              <p>Временный пароль: <span className="font-mono">{created.password}</span></p>
              <p>Роль: {AGENT_ROLE_CFG[created.role].label}</p>
            </div>
          </div>
          <div className="px-6 py-4 border-t border-gray-200">
            <button onClick={onClose} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors">Готово</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Новый оператор</h2>
              <p className="text-xs text-gray-400">Пароль генерируется автоматически · только Администратор</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {(firstName || lastName) && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0">{avatar}</div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full inline-flex mt-0.5 ${roleCfg.bg} ${roleCfg.color} font-medium`}>{roleCfg.label}</span>
              </div>
            </div>
          )}
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Личные данные</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Фамилия *</label>
                <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Иванов"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Имя *</label>
                <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Алексей"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Рабочий email *</label>
              <div className="relative">
                <MailOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="operator@platform.com"
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Роль и права доступа</h3>
            <div className="space-y-2">
              {(['l1','l2','lead','admin','readonly'] as AgentRole[]).map(r => {
                const cfg = AGENT_ROLE_CFG[r];
                const info = ROLE_DESCRIPTIONS[r];
                const sel = role === r;
                return (
                  <button key={r} onClick={() => setRole(r)}
                    className={`w-full flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                      sel ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${sel ? cfg.bg : 'bg-gray-100'} ${sel ? cfg.color : 'text-gray-400'}`}>
                      {r === 'l1' ? 'L1' : r === 'l2' ? 'L2' : r === 'lead' ? '★' : r === 'admin' ? '⚙' : '👁'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-semibold ${sel ? 'text-blue-800' : 'text-gray-700'}`}>{cfg.label}</p>
                        {sel && <Check className="w-4 h-4 text-blue-600 ml-auto shrink-0" />}
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{info.desc}</p>
                      {sel && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {info.perms.map(p => <span key={p} className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">{p}</span>)}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">
            <KeyRound className="w-5 h-5 text-gray-400 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-gray-700">Пароль генерируется автоматически</p>
              <p className="text-xs text-gray-400 mt-0.5">12 символов · буквы + цифры + спецсимволы. Показывается один раз.</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 p-3 bg-blue-50 border border-blue-200 rounded-xl">
            <Shield className="w-4 h-4 text-blue-600 shrink-0" />
            <p className="text-xs text-blue-700">Создаётся: <span className="font-semibold">{CURRENT_AGENT.name}</span> · {AGENT_ROLE_CFG[CURRENT_AGENT.role].label} · {nowFull()}</p>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-200 shrink-0">
          <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-sm font-medium">Отмена</button>
          <button onClick={handleCreate} disabled={!firstName || !lastName || !email || saving}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors">
            {saving ? <span className="flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" />Создание...</span> : <span className="flex items-center gap-2"><UserPlus className="w-4 h-4" />Создать оператора</span>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Resolution Modal ──────────────────────────────────────────────────────��──

function ResolutionModal({
  conv, onConfirm, onClose,
}: {
  conv: Conversation;
  onConfirm: (code: string, note: string, csat?: number) => void;
  onClose: () => void;
}) {
  const [code, setCode] = useState('');
  const [note, setNote] = useState('');
  const [csat, setCsat] = useState<number | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const ch = CHANNEL_CFG[conv.channel];
  const ChIcon = ch.icon;

  async function handleConfirm() {
    if (!code || !note.trim()) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    onConfirm(code, note.trim(), csat);
  }

  const rc = RESOLUTION_CODES.find(r => r.code === code);

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
      <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0 bg-gradient-to-r from-teal-600 to-green-600 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-white">Закрыть обращение</p>
              <p className="text-xs text-green-100">{conv.clientName} · <ChIcon className="inline w-3 h-3 mr-0.5" />{ch.label}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Case preview */}
          <div className="flex items-start gap-3 p-3.5 bg-gray-50 border border-gray-200 rounded-xl">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${ch.bg}`}>
              <ChIcon className={`w-4 h-4 ${ch.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{conv.subject}</p>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400 flex-wrap">
                {conv.orderRef && <span className="font-mono text-blue-600">{conv.orderRef}</span>}
                <span>{conv.createdAt}</span>
                <span>·</span>
                <span>{formatElapsed(elapsedMin(conv.createdAt))} в работе</span>
              </div>
            </div>
          </div>

          {/* Resolution code */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-bold shrink-0">1</div>
              <label className="text-sm font-bold text-gray-800 uppercase tracking-wide">Код резолюции</label>
              <span className="text-red-500 font-bold">*</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {RESOLUTION_CODES.map(r => {
                const Icon = r.icon;
                const sel = code === r.code;
                return (
                  <button key={r.code} onClick={() => setCode(r.code)}
                    className={`flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                      sel ? `${r.border} ${r.bg} ring-2 ring-offset-1 ring-teal-400` : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${sel ? r.bg : 'bg-gray-100'}`}>
                      <Icon className={`w-4 h-4 ${sel ? r.color : 'text-gray-400'}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-semibold leading-tight ${sel ? r.color : 'text-gray-700'}`}>{r.label}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">{r.desc}</p>
                    </div>
                    {sel && (
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${r.bg} border ${r.border}`}>
                        <Check className={`w-2.5 h-2.5 ${r.color}`} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Summary */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-6 h-6 rounded-full ${code ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-500'} flex items-center justify-center text-xs font-bold shrink-0 transition-colors`}>2</div>
              <label className="text-sm font-bold text-gray-800 uppercase tracking-wide">Резюме для аудит-лога</label>
              <span className="text-red-500 font-bold">*</span>
            </div>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
              placeholder="Кратко опишите, как был решён вопрос. Эта запись останется в аудит-логе навсегда."
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 resize-none transition-colors" />
          </div>

          {/* CSAT (optional) */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-6 h-6 rounded-full ${note.trim() ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-500'} flex items-center justify-center text-xs font-bold shrink-0 transition-colors`}>3</div>
              <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">CSAT <span className="text-gray-400 font-normal normal-case text-xs">(оценка работы оператора)</span></label>
            </div>
            {/* Operator + Rater attribution */}
            <div className="flex items-center gap-2 mb-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {(conv.assignedToName ?? 'НА').slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{conv.assignedToName ?? 'Оператор не назначен'}</p>
                  <p className="text-[10px] text-gray-400">Оператор, обработавший обращение</p>
                </div>
              </div>
              <div className="h-6 w-px bg-gray-200 shrink-0" />
              <div className="flex items-center gap-1.5 shrink-0 text-[10px] text-gray-500">
                <User className="w-3 h-3 text-teal-500" />
                <span>Оценивает: <span className="font-semibold text-gray-700">{CURRENT_AGENT.name}</span></span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setCsat(csat === n ? undefined : n)}
                  className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center text-lg transition-all ${
                    csat !== undefined && n <= csat ? 'border-yellow-400 bg-yellow-50 text-yellow-500' : 'border-gray-200 bg-white text-gray-300 hover:border-yellow-300'
                  }`}>
                  ⭐
                </button>
              ))}
              {csat && <span className="text-sm text-gray-500 ml-1">{csat}/5</span>}
            </div>
          </div>

          {/* Audit info */}
          <div className="flex items-center gap-2.5 p-3 bg-teal-50 border border-teal-200 rounded-xl">
            <Shield className="w-4 h-4 text-teal-600 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-teal-900">Будет записано в аудит-лог</p>
              <p className="text-xs text-teal-700">{CURRENT_AGENT.name} · {AGENT_ROLE_CFG[CURRENT_AGENT.role].label} · {nowFull()}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-200 shrink-0 bg-gray-50 rounded-b-2xl space-y-2">
          {(!code || !note.trim()) && (
            <div className="flex items-center gap-2 p-2.5 bg-orange-50 border border-orange-200 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />
              <p className="text-xs text-orange-700 font-medium">
                {!code ? 'Выберите код резолюции' : 'Добавьте резюме для аудит-лога'}
              </p>
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-3 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors">Отмена</button>
            <button onClick={handleConfirm} disabled={saving || !code || !note.trim()}
              className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-white rounded-xl text-sm font-black transition-colors flex items-center justify-center gap-2 shadow-md shadow-teal-100">
              {saving
                ? <span className="flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" />Закрытие...</span>
                : rc
                  ? <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />Закрыть — {rc.label}</span>
                  : <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />Закрыть чат</span>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Team Panel ────────────────────────────────────────────────────────────────

function TeamPanel({ onViewAgent, agents: agentList }: { onViewAgent: (a: AgentProfile) => void; agents: (AgentProfile & { active?: boolean })[] }) {
  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      <div>
        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-600" />Команда поддержки
        </h3>
        <div className="space-y-2">
          {agentList.filter(a => a.role !== 'admin').map(a => {
            const roleCfg = AGENT_ROLE_CFG[a.role];
            return (
              <button key={a.id} onClick={() => onViewAgent(a)}
                className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 hover:bg-blue-50 hover:border-blue-200 transition-all text-left group">
                <div className="w-9 h-9 bg-gray-400 rounded-full flex items-center justify-center text-white text-sm font-semibold relative shrink-0">
                  {a.avatar}
                  <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${a.online ? 'bg-green-500' : 'bg-gray-300'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-800 truncate">{a.name}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${roleCfg.bg} ${roleCfg.color}`}>{roleCfg.label}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                    <span>{a.activeChats} чатов</span>
                    <span>·</span>
                    <span>{a.resolvedToday} закрыто</span>
                    {a.csat > 0 && <span className="flex items-center gap-1"><span>·</span><span>{a.csat}⭐</span></span>}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 shrink-0" />
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
          <ArrowUpRight className="w-4 h-4 text-orange-500" />Правила эскалации
        </h3>
        <div className="space-y-1.5">
          {[
            { from: 'Клиент обращается', to: 'L1 — авто', color: 'bg-green-100 text-green-700' },
            { from: 'L1 не решил / 30 мин', to: 'L2 — авто/ручная', color: 'bg-blue-100 text-blue-700' },
            { from: 'L2 не решил / 2 ч', to: 'Руководитель — ручная', color: 'bg-purple-100 text-purple-700' },
            { from: 'Претензия / возврат', to: 'Руководитель — авто', color: 'bg-red-100 text-red-700' },
          ].map((e, i) => (
            <div key={i} className="flex items-center gap-2 text-xs p-2.5 bg-gray-50 rounded-xl">
              <div className="w-5 h-5 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center font-bold shrink-0">{i+1}</div>
              <span className="text-gray-500 flex-1">{e.from}</span>
              <span className={`px-2 py-0.5 rounded-full font-semibold shrink-0 ${e.color}`}>{e.to}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-purple-600" />Статистика дня
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Обработано', val: '23', color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Ср. ответ', val: '4 мин', color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'CSAT', val: '4.8 ⭐', color: 'text-orange-600', bg: 'bg-orange-50' },
            { label: 'Эскалаций', val: '2', color: 'text-red-600', bg: 'bg-red-50' },
          ].map(s => (
            <div key={s.label} className={`p-3 ${s.bg} rounded-xl border border-gray-200 text-center`}>
              <p className={`font-bold ${s.color}`}>{s.val}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── New Chat Modal ────────────────────────────────────────────────────────────

function NewChatModal({
  onClose, onCreate, existingConversations, onNavigateExisting,
}: {
  onClose: () => void;
  onCreate: (c: Conversation) => void;
  existingConversations: Conversation[];
  onNavigateExisting: (convId: string) => void;
}) {
  const [channel, setChannel] = useState<ChatChannel>('support');
  const [subject, setSubject] = useState('');
  const [clientName, setClientName] = useState('');
  const [priority, setPriority] = useState<Priority>('normal');
  const [message, setMessage] = useState('');
  const [orderRef, setOrderRef] = useState('');
  const [duplicateConv, setDuplicateConv] = useState<Conversation | null>(null);

  // Check for existing open case with same orderRef
  useEffect(() => {
    if (!orderRef.trim()) { setDuplicateConv(null); return; }
    const ref = orderRef.trim().toUpperCase();
    const existing = existingConversations.find(c =>
      c.orderRef?.toUpperCase() === ref &&
      c.status !== 'resolved' && c.status !== 'closed'
    );
    setDuplicateConv(existing ?? null);
  }, [orderRef, existingConversations]);

  function handleCreate() {
    if (!subject || !clientName || !message) return;
    const id = `c${Date.now()}`;
    const inits = clientName.split(' ').map(n => n[0]).slice(0, 2).join('');
    const ts = now();
    const newConv: Conversation = {
      id, channel, status: 'open', priority, subject,
      clientName, clientId: 'new_' + id, clientAvatar: inits,
      lastMessage: message, lastMessageTime: ts,
      unread: 0, tags: [], createdAt: nowFull(),
      orderRef: orderRef || undefined,
      messages: [
        { id: 'm_s1', conversationId: id, senderId: 'bot', senderName: 'PVZ Bot', senderRole: 'bot',
          type: 'system', systemText: `Чат создан · ${CHANNEL_CFG[channel].label} · ${PRIORITY_CFG[priority].label}`, timestamp: ts, read: true },
        ...(orderRef ? [{ id: 'm_s2', conversationId: id, senderId: 'bot', senderName: 'PVZ Bot', senderRole: 'bot' as const,
          type: 'order_ref' as const, orderRef, timestamp: ts, read: true }] : []),
        { id: 'm_s3', conversationId: id, senderId: CURRENT_AGENT.id, senderName: CURRENT_AGENT.name, senderRole: 'admin' as const,
          text: message, type: 'text' as const, timestamp: ts, read: true },
      ],
    };
    onCreate(newConv);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <h2 className="font-bold text-gray-900">Новый чат</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Channel */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Канал</label>
            <div className="grid grid-cols-4 gap-2">
              {(['support','couriers','merchants','internal'] as ChatChannel[]).map(ch => {
                const cfg = CHANNEL_CFG[ch];
                const Icon = cfg.icon;
                return (
                  <button key={ch} onClick={() => setChannel(ch)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${channel === ch ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <Icon className={`w-5 h-5 ${channel === ch ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span className={`text-xs font-medium ${channel === ch ? 'text-blue-700' : 'text-gray-600'}`}>{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Тема *</label>
              <input value={subject} onChange={e => setSubject(e.target.value)}
                placeholder="Кратко о вопросе"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Контакт *</label>
              <input value={clientName} onChange={e => setClientName(e.target.value)}
                placeholder="Имя / кафе / ID курьера"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Номер заказа</label>
              <input value={orderRef} onChange={e => setOrderRef(e.target.value)}
                placeholder="ORD-2026-000456"
                className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 text-sm font-mono ${
                  duplicateConv ? 'border-orange-400 focus:ring-orange-400' : 'border-gray-200 focus:ring-blue-500'
                }`} />
              {/* One-case-per-order warning */}
              {duplicateConv && (
                <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-xl">
                  <div className="flex items-start gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-orange-800">Активный чат уже существует!</p>
                      <p className="text-xs text-orange-700 mt-0.5">Принцип «один кейс на заказ»: по этому заказу уже открыт чат.</p>
                      <p className="text-xs text-orange-600 mt-1 font-mono">{duplicateConv.subject}</p>
                    </div>
                  </div>
                  <button onClick={() => { onNavigateExisting(duplicateConv.id); onClose(); }}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold transition-colors">
                    <MessageSquare className="w-3.5 h-3.5" />Открыть существующий чат
                  </button>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Приоритет</label>
              <select value={priority} onChange={e => setPriority(e.target.value as Priority)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                {(['low','normal','high','critical'] as Priority[]).map(p => (
                  <option key={p} value={p}>{PRIORITY_CFG[p].label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Первое сообщение *</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3}
              placeholder="Опишите ситуацию..."
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none" />
          </div>
          <div className="flex items-center gap-2.5 p-3 bg-blue-50 border border-blue-200 rounded-xl">
            <Shield className="w-4 h-4 text-blue-600 shrink-0" />
            <p className="text-xs text-blue-700">Чат будет создан от имени: <span className="font-semibold">{CURRENT_AGENT.name}</span> · {AGENT_ROLE_CFG[CURRENT_AGENT.role].label}</p>
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-gray-200 shrink-0">
          <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-sm font-medium">Отмена</button>
          <button onClick={handleCreate} disabled={!subject || !clientName || !message || !!duplicateConv}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors">
            <MessageSquare className="w-4 h-4" />{duplicateConv ? 'Откройте существующий чат' : 'Начать чат'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatsBar({
  conversations,
  activeStatus,
  onFilter,
}: {
  conversations: Conversation[];
  activeStatus: string;
  onFilter: (status: string) => void;
}) {
  // Exclude routedAway from all stats — they're no longer in this agent's queue
  const active = conversations.filter(c => !c.routedAway);
  const stats: { label: string; val: number; color: string; hoverBg: string; activeBg: string; icon: React.ElementType; filterKey: string }[] = [
    { label: 'Открытых',     val: active.filter(c => c.status === 'open').length,            color: 'text-blue-600',   hoverBg: 'hover:bg-blue-50',   activeBg: 'bg-blue-50 ring-1 ring-blue-300',   icon: Inbox,         filterKey: 'open' },
    { label: 'В работе',     val: active.filter(c => c.status === 'in_progress').length,      color: 'text-green-600',  hoverBg: 'hover:bg-green-50',  activeBg: 'bg-green-50 ring-1 ring-green-300', icon: MessageSquare, filterKey: 'in_progress' },
    { label: 'Не назначены', val: active.filter(c => !c.assignedTo && c.status !== 'resolved' && c.status !== 'closed').length, color: 'text-yellow-600', hoverBg: 'hover:bg-yellow-50', activeBg: 'bg-yellow-50 ring-1 ring-yellow-300', icon: UserPlus, filterKey: 'unassigned' },
    { label: 'Ждём',         val: active.filter(c => c.status === 'waiting_external').length, color: 'text-indigo-600', hoverBg: 'hover:bg-indigo-50', activeBg: 'bg-indigo-50 ring-1 ring-indigo-300', icon: Hourglass, filterKey: 'waiting_external' },
    { label: 'Эскалаций',    val: active.filter(c => c.status === 'escalated').length,        color: 'text-red-600',    hoverBg: 'hover:bg-red-50',    activeBg: 'bg-red-50 ring-1 ring-red-300',     icon: AlertTriangle, filterKey: 'escalated' },
    { label: 'Непрочит.',    val: active.reduce((s, c) => s + c.unread, 0),                   color: 'text-orange-600', hoverBg: 'hover:bg-orange-50', activeBg: 'bg-orange-50 ring-1 ring-orange-300', icon: Bell,        filterKey: 'unread' },
    { label: 'Решено',       val: active.filter(c => ['resolved','closed'].includes(c.status)).length, color: 'text-teal-600', hoverBg: 'hover:bg-teal-50', activeBg: 'bg-teal-50 ring-1 ring-teal-300', icon: CheckCircle2, filterKey: 'resolved' },
  ];
  return (
    <div className="flex items-center gap-1 px-3 py-2 bg-white border-b border-gray-200 overflow-x-auto shrink-0">
      {stats.map((s, i) => {
        const Icon = s.icon;
        const isActive = activeStatus === s.filterKey;
        return (
          <button key={s.label} onClick={() => onFilter(isActive ? 'all_s' : s.filterKey)}
            title={`Фильтр: ${s.label}`}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs shrink-0 transition-all ${
              isActive ? s.activeBg : `${s.hoverBg} bg-transparent`
            }`}>
            <Icon className={`w-3.5 h-3.5 ${s.color}`} />
            <span className={`font-bold ${s.color}`}>{s.val}</span>
            <span className="text-gray-400">{s.label}</span>
            {i < stats.length - 1 && <div className="w-px h-3 bg-gray-200 ml-1" />}
          </button>
        );
      })}
      <div className="ml-auto flex items-center gap-2 shrink-0 pl-2 border-l border-gray-200">
        <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />3 онлайн
        </div>
        <div className="text-xs text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-200">CSAT 4.8 ⭐</div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function ChatCenter() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [orders, setOrders] = useState<Order[]>(ORDERS);
  const [agents, setAgents] = useState<(AgentProfile & { active?: boolean })[]>(AGENTS);
  const [actionLog, setActionLog] = useState<SupportAction[]>([]);
  const [activeChannel, setActiveChannel] = useState<ChatChannel | 'all' | 'mine'>('all');
  const [activeStatus, setActiveStatus] = useState<string>('all_s');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [showTeam, setShowTeam] = useState(false);
  const [viewingAgent, setViewingAgent] = useState<AgentProfile | null>(null);
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [showWaitingModal, setShowWaitingModal] = useState(false);
  const [showOperatorMgmt, setShowOperatorMgmt] = useState(false);
  const [cabinetOperator, setCabinetOperator] = useState<OperatorProfile | null>(null);
  const agentRole = CURRENT_AGENT_ROLE;
  const perms = AGENT_ROLES[agentRole];

  const selected = useMemo(() => conversations.find(c => c.id === selectedId) ?? null, [conversations, selectedId]);

  const filtered = useMemo(() => {
    let list = conversations;
    if (!perms.canViewInternal) list = list.filter(c => c.channel !== 'internal');
    // Always exclude routedAway conversations — they have been handed to another agent
    list = list.filter(c => !c.routedAway);
    if (activeChannel === 'mine') {
      // My Queue: only conversations assigned to current agent
      list = list.filter(c => c.assignedTo === CURRENT_AGENT.id);
    } else if (activeChannel === 'all') {
      list = list.filter(c => c.channel !== 'closed');
      // In default 'all' view, hide resolved/closed unless explicitly filtered
      if (activeStatus === 'all_s') {
        list = list.filter(c => !['resolved', 'closed'].includes(c.status));
      }
    } else {
      list = list.filter(c => c.channel === activeChannel);
    }
    // Status quick filter
    if (activeStatus === 'open')             list = list.filter(c => c.status === 'open');
    else if (activeStatus === 'in_progress') list = list.filter(c => c.status === 'in_progress');
    else if (activeStatus === 'unassigned')  list = list.filter(c => !c.assignedTo && c.status !== 'resolved' && c.status !== 'closed');
    else if (activeStatus === 'waiting_external') list = list.filter(c => c.status === 'waiting_external');
    else if (activeStatus === 'escalated')   list = list.filter(c => c.status === 'escalated');
    else if (activeStatus === 'unread')      list = list.filter(c => c.unread > 0);
    else if (activeStatus === 'resolved')    list = list.filter(c => ['resolved', 'closed'].includes(c.status));
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c => c.clientName.toLowerCase().includes(q) || c.subject.toLowerCase().includes(q) || (c.orderRef ?? '').toLowerCase().includes(q));
    }
    const po: Record<Priority, number> = { critical: 0, high: 1, normal: 2, low: 3 };
    return list.sort((a, b) => po[a.priority] - po[b.priority] || b.unread - a.unread);
  }, [conversations, activeChannel, activeStatus, search, perms]);

  const chUnread = useMemo(() => {
    const m: Record<string, number> = { all: 0, mine: 0 };
    conversations.forEach(c => {
      if (!c.routedAway) {
        m[c.channel] = (m[c.channel] ?? 0) + c.unread;
        m.all += c.unread;
        if (c.assignedTo === CURRENT_AGENT.id) m.mine += c.unread;
      }
    });
    return m;
  }, [conversations]);

  const chCount = useMemo(() => {
    const m: Record<string, number> = { all: 0, mine: 0 };
    conversations.forEach(c => {
      if (c.status !== 'resolved' && c.status !== 'closed' && !c.routedAway) {
        m[c.channel] = (m[c.channel] ?? 0) + 1;
        m.all += 1;
        if (c.assignedTo === CURRENT_AGENT.id) m.mine += 1;
      }
    });
    return m;
  }, [conversations]);

  // Auto-select first
  useEffect(() => {
    if (!selectedId && filtered.length) setSelectedId(filtered[0].id);
  }, []);

  function sendMessage(text: string, isInternal = false) {
    if (!selectedId) return;
    const ts = now();
    const msg: ChatMessage = {
      id: `m_${Date.now()}`, conversationId: selectedId,
      senderId: CURRENT_AGENT.id, senderName: CURRENT_AGENT.name, senderRole: 'admin',
      text, type: 'text', timestamp: ts, read: true,
      isInternal,
    };
    setConversations(prev => prev.map(c => c.id !== selectedId ? c : {
      ...c, messages: [...c.messages, msg],
      lastMessage: isInternal ? `🔒 ${text}` : text,
      lastMessageTime: ts, unread: 0,
      status: c.status === 'open' ? 'in_progress' : c.status,
    }));
    if (isInternal) {
      setActionLog(prev => [...prev, {
        id: `act_note_${Date.now()}`, agentId: CURRENT_AGENT.id, agentName: CURRENT_AGENT.name,
        agentRole: CURRENT_AGENT.role, action: 'note_added', note: text.slice(0, 80),
        timestamp: nowFull(), conversationId: selectedId,
      }]);
    }
  }

  function escalate() {
    if (!selectedId || !selected) return;
    const ts = now();
    const curLevel = selected.escalationLevel ?? 1;
    const nextLevel = Math.min(curLevel + 1, 3);
    const targets = ['L2 — Попова Ирина', 'Руководитель — Захаров Виктор'];
    const escalateTo = targets[curLevel - 1] ?? targets[1];
    const sysMsg: ChatMessage = {
      id: `m_esc_${Date.now()}`, conversationId: selectedId,
      senderId: 'bot', senderName: 'PVZ Bot', senderRole: 'bot',
      type: 'escalation', escalateTo, systemText: `⬆️ Эскалировано → ${escalateTo}`,
      timestamp: ts, read: true,
    };
    const agMsg: ChatMessage = {
      id: `m_esc_a_${Date.now()}`, conversationId: selectedId,
      senderId: CURRENT_AGENT.id, senderName: CURRENT_AGENT.name, senderRole: 'admin',
      text: QUICK_REPLIES.find(q => q.label === 'Эскалация')?.text ?? 'Передаём ваш вопрос специалисту более высо��ого уровня.',
      type: 'text', timestamp: ts, read: true,
    };
    setConversations(prev => prev.map(c => c.id !== selectedId ? c : {
      ...c, status: 'escalated', escalationLevel: nextLevel,
      messages: [...c.messages, sysMsg, agMsg], lastMessage: agMsg.text!, lastMessageTime: ts,
    }));
    setActionLog(prev => [...prev, {
      id: `act_${Date.now()}`, agentId: CURRENT_AGENT.id, agentName: CURRENT_AGENT.name,
      agentRole: CURRENT_AGENT.role, action: 'escalated', timestamp: nowFull(), conversationId: selectedId,
    }]);
  }

  function closeConv() {
    // Show resolution modal instead of closing directly
    setShowResolutionModal(true);
  }

  function closeConvWithResolution(code: string, note: string, csat?: number) {
    if (!selectedId) return;
    const ts = now();
    const rc = RESOLUTION_CODES.find(r => r.code === code);
    const msg: ChatMessage = {
      id: `m_close_${Date.now()}`, conversationId: selectedId,
      senderId: 'bot', senderName: 'PVZ Bot', senderRole: 'bot',
      type: 'system',
      systemText: `✅ Чат закрыт · ${rc?.label ?? code} · ${note.slice(0, 60)}${note.length > 60 ? '...' : ''}`,
      timestamp: ts, read: true,
    };
    // Find next active conversation BEFORE state update
    const nextConv = filtered.find(c =>
      c.id !== selectedId && !['resolved', 'closed'].includes(c.status)
    );
    setConversations(prev => prev.map(c => c.id !== selectedId ? c : {
      ...c, status: 'resolved', resolvedAt: ts, resolutionCode: code, resolutionNote: note,
      csat: csat ?? c.csat,
      csatByName: csat !== undefined ? CURRENT_AGENT.name : c.csatByName,
      csatById: csat !== undefined ? CURRENT_AGENT.id : c.csatById,
      messages: [...c.messages, msg],
      lastMessage: `✅ Закрыт: ${rc?.label ?? code}`, lastMessageTime: ts, unread: 0,
    }));
    setActionLog(prev => [...prev, {
      id: `act_${Date.now()}`, agentId: CURRENT_AGENT.id, agentName: CURRENT_AGENT.name,
      agentRole: CURRENT_AGENT.role, action: 'closed',
      note: `${rc?.label ?? code}: ${note}`,
      timestamp: nowFull(), conversationId: selectedId!,
    }]);
    setShowResolutionModal(false);
    // Auto-navigate to next open conversation
    setSelectedId(nextConv?.id ?? null);
  }

  function assignAgent(agentId: string) {
    const a = agents.find(ag => ag.id === agentId);
    if (!a || !selectedId) return;
    const ts = now();
    const sysMsg: ChatMessage = {
      id: `m_assign_${Date.now()}`, conversationId: selectedId,
      senderId: 'bot', senderName: 'PVZ Bot', senderRole: 'bot',
      type: 'system',
      systemText: `👤 Назначен → ${a.name} (${AGENT_ROLE_CFG[a.role].label})`,
      timestamp: ts, read: true,
    };
    setConversations(prev => prev.map(c => c.id !== selectedId ? c : {
      ...c,
      assignedTo: agentId,
      assignedToName: a.name,
      status: c.status === 'open' ? 'in_progress' : c.status,
      messages: [...c.messages, sysMsg],
      lastMessage: sysMsg.systemText!,
      lastMessageTime: ts,
    }));
    setActionLog(prev => [...prev, {
      id: `act_${Date.now()}`, agentId: CURRENT_AGENT.id, agentName: CURRENT_AGENT.name,
      agentRole: CURRENT_AGENT.role, action: 'assigned', note: `Назначен: ${a.name}`,
      timestamp: nowFull(), conversationId: selectedId,
    }]);
  }

  function reopenConv() {
    if (!selectedId) return;
    const ts = now();
    const msg: ChatMessage = {
      id: `m_reopen_${Date.now()}`, conversationId: selectedId,
      senderId: 'bot', senderName: 'PVZ Bot', senderRole: 'bot',
      type: 'system', systemText: '🔄 Чат переоткрыт', timestamp: ts, read: true,
    };
    setConversations(prev => prev.map(c => c.id !== selectedId ? c : {
      ...c, status: 'in_progress', resolvedAt: undefined, messages: [...c.messages, msg],
    }));
    setActionLog(prev => [...prev, {
      id: `act_${Date.now()}`, agentId: CURRENT_AGENT.id, agentName: CURRENT_AGENT.name,
      agentRole: CURRENT_AGENT.role, action: 'reopened', timestamp: nowFull(), conversationId: selectedId!,
    }]);
  }

  function changePriority(priority: Priority) {
    if (!selectedId) return;
    setConversations(prev => prev.map(c => c.id !== selectedId ? c : { ...c, priority }));
    setActionLog(prev => [...prev, {
      id: `act_pri_${Date.now()}`, agentId: CURRENT_AGENT.id, agentName: CURRENT_AGENT.name,
      agentRole: CURRENT_AGENT.role, action: 'note_added',
      note: `Приоритет изменён → ${PRIORITY_CFG[priority].label}`,
      timestamp: nowFull(), conversationId: selectedId,
    }]);
  }

  function setWaitingExternal(waitingFor: string) {
    if (!selectedId) return;
    const ts = now();
    const sysMsg: ChatMessage = {
      id: `m_wait_${Date.now()}`, conversationId: selectedId,
      senderId: 'bot', senderName: 'PVZ Bot', senderRole: 'bot',
      type: 'system',
      systemText: `⏳ Статус «Ждём партнёра» · ${waitingFor} · ${CURRENT_AGENT.name}`,
      timestamp: ts, read: true,
    };
    setConversations(prev => prev.map(c => c.id !== selectedId ? c : {
      ...c, status: 'waiting_external', waitingFor,
      messages: [...c.messages, sysMsg],
      lastMessage: `⏳ Ждём: ${waitingFor}`, lastMessageTime: ts,
    }));
    setActionLog(prev => [...prev, {
      id: `act_wait_${Date.now()}`, agentId: CURRENT_AGENT.id, agentName: CURRENT_AGENT.name,
      agentRole: CURRENT_AGENT.role, action: 'status_change',
      fromStatus: 'in_progress', toStatus: 'waiting_external',
      note: `Ждём: ${waitingFor}`,
      timestamp: nowFull(), conversationId: selectedId,
    }]);
    setShowWaitingModal(false);
  }

  function resumeWaiting() {
    if (!selectedId) return;
    const ts = now();
    const sysMsg: ChatMessage = {
      id: `m_resume_${Date.now()}`, conversationId: selectedId,
      senderId: 'bot', senderName: 'PVZ Bot', senderRole: 'bot',
      type: 'system',
      systemText: `▶️ Работа возобновлена · ${CURRENT_AGENT.name}`,
      timestamp: ts, read: true,
    };
    setConversations(prev => prev.map(c => c.id !== selectedId ? c : {
      ...c, status: 'in_progress', waitingFor: undefined,
      messages: [...c.messages, sysMsg],
      lastMessage: '▶️ Работа возобновлена', lastMessageTime: ts,
    }));
    setActionLog(prev => [...prev, {
      id: `act_resume_${Date.now()}`, agentId: CURRENT_AGENT.id, agentName: CURRENT_AGENT.name,
      agentRole: CURRENT_AGENT.role, action: 'status_change',
      fromStatus: 'waiting_external', toStatus: 'in_progress',
      note: 'Ожидание завершено, работа возобновлена',
      timestamp: nowFull(), conversationId: selectedId,
    }]);
  }

  function handleOrderStatusChange(orderId: string, newStatus: OrderStatus, note: string) {
    if (!selectedId) return;
    // Update order
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o;
      const newTimeline = [...o.timeline, {
        id: `t_sup_${Date.now()}`, status: newStatus, time: nowFull(),
        actor: `${CURRENT_AGENT.name} (${AGENT_ROLE_CFG[CURRENT_AGENT.role].label})`,
        description: `Статус изменён службой поддержки${note ? `: ${note}` : ''}`,
      }];
      return { ...o, status: newStatus, updatedAt: nowFull(), timeline: newTimeline };
    }));
    // Post system message to chat
    const foundOrder = orders.find(o => o.id === orderId);
    if (foundOrder) {
      const ts = now();
      const statusCfg = getOrderStatusCfg(newStatus);
      const sysMsg: ChatMessage = {
        id: `m_ord_${Date.now()}`, conversationId: selectedId,
        senderId: 'bot', senderName: 'PVZ Bot', senderRole: 'bot',
        type: 'system',
        systemText: `📦 Статус заказа ${foundOrder.orderNumber} → ${statusCfg.label}`,
        timestamp: ts, read: true,
      };
      setConversations(prev => prev.map(c => c.id !== selectedId ? c : {
        ...c, messages: [...c.messages, sysMsg],
        lastMessage: sysMsg.systemText!, lastMessageTime: ts,
      }));
    }
  }

  function handleCourierReassign(orderId: string, courierId: string | null, courierName: string | null, note: string) {
    // Update order state
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o;
      const newStatus: OrderStatus = courierId ? 'courier_assigned' : 'ready';
      const newTimeline = [...o.timeline, {
        id: `t_reassign_${Date.now()}`,
        status: newStatus,
        time: nowFull(),
        actor: `${CURRENT_AGENT.name} (${AGENT_ROLE_CFG[CURRENT_AGENT.role].label})`,
        description: note,
      }];
      return { ...o, courierId, courierName, status: newStatus, updatedAt: nowFull(), timeline: newTimeline };
    }));
    // Post system message to active conversation
    if (selectedId) {
      const ts = now();
      const icon = courierId ? '🔄' : '📋';
      const sysMsg: ChatMessage = {
        id: `m_reassign_${Date.now()}`, conversationId: selectedId,
        senderId: 'bot', senderName: 'PVZ Bot', senderRole: 'bot',
        type: 'system', systemText: `${icon} ${note}`, timestamp: ts, read: true,
      };
      setConversations(prev => prev.map(c => c.id !== selectedId ? c : {
        ...c, messages: [...c.messages, sysMsg], lastMessage: sysMsg.systemText!, lastMessageTime: ts,
      }));
    }
  }

  function addConversation(conv: Conversation) {
    setConversations(p => [conv, ...p]);
    setSelectedId(conv.id);
  }

  function addActionLog(action: SupportAction) {
    setActionLog(prev => [...prev, action]);
  }

  function handleRoute(opts: { agentId?: string; agentName?: string; deptLabel: string; systemText: string }) {
    if (!selectedId) return;
    const ts = now();
    const targetLabel = opts.agentName ? `${opts.deptLabel} → ${opts.agentName}` : opts.deptLabel;
    // System message visible in chat history
    const sysMsg: ChatMessage = {
      id: `m_routed_sys_${Date.now()}`, conversationId: selectedId,
      senderId: 'bot', senderName: 'PVZ Bot', senderRole: 'bot',
      type: 'system',
      systemText: `${opts.systemText} · ${CURRENT_AGENT.name}`,
      timestamp: ts, read: true,
    };
    // Find next active conversation to auto-navigate to
    const nextConv = filtered.find(c =>
      c.id !== selectedId && !['resolved', 'closed'].includes(c.status)
    );
    // Reassign the conversation to the target agent, mark as pending AND routedAway
    // routedAway=true causes it to be filtered out of all active views — it belongs to the target now
    setConversations(prev => prev.map(c => c.id !== selectedId ? c : {
      ...c,
      assignedTo: opts.agentId,
      assignedToName: opts.agentName,
      status: 'pending' as const,
      routedAway: true,
      routedTo: targetLabel,
      routedAt: nowFull(),
      messages: [...c.messages, sysMsg],
      lastMessage: sysMsg.systemText!, lastMessageTime: ts, unread: 0,
    }));
    addActionLog({
      id: `act_routed_sys_${Date.now()}`, agentId: CURRENT_AGENT.id, agentName: CURRENT_AGENT.name,
      agentRole: CURRENT_AGENT.role, action: 'assigned',
      note: `Перенаправлено → ${targetLabel}`,
      timestamp: nowFull(), conversationId: selectedId,
    });
    // Auto-navigate away — this chat is now someone else's responsibility
    setSelectedId(nextConv?.id ?? null);
  }

  function handleCancelCourierOrder(order: CourierActiveOrder, reason: string) {
    if (!selectedId) return;
    const ts = now();
    const sysMsg: ChatMessage = {
      id: `m_cancel_${Date.now()}`, conversationId: selectedId,
      senderId: 'bot', senderName: 'PVZ Bot', senderRole: 'bot',
      type: 'system',
      systemText: `❌ Заказ ${order.orderNumber} (${order.merchant.name}) ОТМЕНЁН · ${CURRENT_AGENT.name} · ${AGENT_ROLE_CFG[CURRENT_AGENT.role].label}`,
      timestamp: ts, read: true,
    };
    setConversations(prev => prev.map(c => c.id !== selectedId ? c : {
      ...c, messages: [...c.messages, sysMsg], lastMessage: sysMsg.systemText!, lastMessageTime: ts,
    }));
  }

  function handleEscalateCourierCancel(order: CourierActiveOrder) {
    if (!selectedId || !selected) return;
    const ts = now();
    const curLevel = selected.escalationLevel ?? 1;
    const nextLevel = Math.min(curLevel + 1, 3);
    const targets = ['L2 — Попова Ирина (право отмены)', 'Руководитель — Захаров Виктор'];
    const escalateTo = targets[curLevel - 1] ?? targets[1];
    const escMsg: ChatMessage = {
      id: `m_esc_cancel_${Date.now()}`, conversationId: selectedId,
      senderId: 'bot', senderName: 'PVZ Bot', senderRole: 'bot',
      type: 'escalation',
      systemText: `⬆️ Запрос на отмену заказа ${order.orderNumber} → ${escalateTo}`,
      timestamp: ts, read: true,
    };
    const agMsg: ChatMessage = {
      id: `m_esc_cancel_a_${Date.now()}`, conversationId: selectedId,
      senderId: CURRENT_AGENT.id, senderName: CURRENT_AGENT.name, senderRole: 'admin',
      text: `Для отмены заказа ${order.orderNumber} (${order.merchant.name}) у меня нет полномочий. Передаю чат агенту с правом отмены — ${escalateTo}. Ожидайте, Алексей.`,
      type: 'text', timestamp: ts, read: true,
    };
    setConversations(prev => prev.map(c => c.id !== selectedId ? c : {
      ...c, status: 'escalated', escalationLevel: nextLevel,
      messages: [...c.messages, escMsg, agMsg],
      lastMessage: agMsg.text!, lastMessageTime: ts,
    }));
    setActionLog(prev => [...prev, {
      id: `act_esc_cancel_${Date.now()}`, agentId: CURRENT_AGENT.id, agentName: CURRENT_AGENT.name,
      agentRole: CURRENT_AGENT.role, action: 'escalated',
      orderRef: order.orderNumber,
      note: `Запрос на отмену заказа — нет прав L1`,
      timestamp: nowFull(), conversationId: selectedId,
    }]);
  }

  const channels: Array<ChatChannel | 'all' | 'mine'> = ['mine', 'all', 'support', 'couriers', 'merchants', 'internal', 'escalated', 'closed'];

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] -mx-4 sm:-mx-6 lg:-mx-8 -my-4 sm:-my-6 lg:-my-8 overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900">Чат-центр</h1>
            <p className="text-xs text-gray-400">{CURRENT_AGENT.name} · {AGENT_ROLE_CFG[CURRENT_AGENT.role].label}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {perms.canManageOperators && (
            <button onClick={() => setShowOperatorMgmt(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 bg-red-50 text-red-700 rounded-xl text-xs font-medium hover:bg-red-100 transition-colors">
              <Shield className="w-3.5 h-3.5" />Операторы
            </button>
          )}
          {(agentRole === 'admin' || agentRole === 'lead') && (
            <button
              onClick={() => navigate('/chat/wallboard')}
              title="Supervisor Wallboard — мониторинг очереди и операторов"
              className="flex items-center gap-1.5 px-3 py-1.5 border border-indigo-200 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-medium hover:bg-indigo-100 transition-colors">
              <Monitor className="w-3.5 h-3.5" />Wallboard
            </button>
          )}
          <button onClick={() => setShowTeam(p => !p)}
            className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-xs font-medium transition-colors ${showTeam ? 'border-purple-300 bg-purple-50 text-purple-700' : 'border-gray-200 hover:bg-gray-50 text-gray-700'}`}>
            <Users className="w-3.5 h-3.5" />Команда
          </button>
          {perms.canReply && (
            <button onClick={() => setShowNewChat(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium text-sm">
              <Plus className="w-4 h-4" />Новый чат
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <StatsBar
        conversations={conversations}
        activeStatus={activeStatus}
        onFilter={status => {
          setActiveStatus(status);
          if (status !== 'all_s') setActiveChannel('all'); // reset channel filter on status click
        }}
      />

      {/* Body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Conversation list */}
        <div className="w-[280px] flex flex-col border-r border-gray-200 bg-white shrink-0 overflow-hidden">
          {/* Channel tabs */}
          <div className="px-3 pt-3 pb-2 border-b border-gray-100 shrink-0">
            <div className="flex flex-wrap gap-1">
              {channels.map(ch => {
                if (ch === 'internal' && !perms.canViewInternal) return null;
                const isMine = ch === 'mine';
                const isAll = ch === 'all';
                const cfg = (isAll || isMine) ? null : CHANNEL_CFG[ch as ChatChannel];
                const Icon = isMine ? UserCheck : isAll ? Inbox : cfg!.icon;
                const label = isMine ? 'Мои чаты' : isAll ? 'Все' : cfg!.label;
                const u = chUnread[ch] ?? 0;
                const cnt = chCount[ch] ?? 0;
                const isActive = activeChannel === ch;
                return (
                  <button
                    key={ch}
                    onClick={() => setActiveChannel(ch as typeof activeChannel)}
                    className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isMine
                        ? isActive
                          ? 'bg-teal-600 text-white'
                          : 'bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100'
                        : isActive
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Icon className="w-3 h-3 shrink-0" />
                    <span>{label}</span>
                    {cnt > 0 && (
                      <span className={`min-w-[14px] h-3.5 px-0.5 rounded-full text-xs font-bold flex items-center justify-center ${
                        isActive ? 'bg-white/30 text-white' : isMine ? 'bg-teal-200 text-teal-800' : 'bg-gray-300 text-gray-700'
                      }`}>{cnt}</span>
                    )}
                    {u > 0 && <span className="min-w-[14px] h-3.5 px-0.5 rounded-full text-xs font-bold flex items-center justify-center bg-red-500 text-white">{u}</span>}
                  </button>
                );
              })}
            </div>
          </div>
          {/* Status quick-filter chips */}
          <div className="px-3 py-2 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-thin">
              {([
                { id: 'all_s',           label: 'Все',         dot: 'bg-gray-400' },
                { id: 'unassigned',      label: '! Своб.',     dot: 'bg-yellow-500' },
                { id: 'in_progress',     label: 'В работе',    dot: 'bg-green-500' },
                { id: 'waiting_external',label: 'Ждём',        dot: 'bg-indigo-500' },
                { id: 'escalated',       label: 'Эскалац.',    dot: 'bg-red-500' },
                { id: 'resolved',        label: 'Решены',      dot: 'bg-teal-500' },
              ] as { id: string; label: string; dot: string }[]).map(s => {
                const active = activeStatus === s.id;
                return (
                  <button key={s.id} onClick={() => setActiveStatus(s.id)}
                    className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                      active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-white' : s.dot} shrink-0`} />
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search */}
          <div className="px-3 py-2 border-b border-gray-100 shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Поиск чатов или заказов..."
                className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center px-4">
                <MessageSquare className="w-8 h-8 text-gray-200 mb-2" />
                {activeChannel === 'mine'
                  ? <p className="text-sm text-gray-400">У вас нет активных чатов</p>
                  : <p className="text-sm text-gray-400">Нет чатов</p>
                }
              </div>
            ) : (
              <div style={{ display: 'contents' }}>
                {/* My Queue header banner */}
                {activeChannel === 'mine' && (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-teal-50 border-b border-teal-100">
                    <UserCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <p className="text-xs text-teal-700 font-medium flex-1">
                      Ваша очередь · <span className="font-bold">{filtered.length}</span> {filtered.length === 1 ? 'чат' : filtered.length < 5 ? 'чата' : 'чатов'}
                    </p>
                    <span className="text-[10px] text-teal-500">Кнопка «Завершить» закрывает кейс</span>
                  </div>
                )}
                {filtered.map(c => (
                  <ConvItem key={c.id} conv={c} selected={selectedId === c.id}
                    onClick={() => {
                      setSelectedId(c.id);
                      setConversations(prev => prev.map(x => x.id === c.id ? { ...x, unread: 0 } : x));
                    }}
                    onTake={activeChannel !== 'mine' ? () => {
                      setConversations(prev => prev.map(x => x.id === c.id
                        ? { ...x, assignedTo: CURRENT_AGENT.id, assignedToName: CURRENT_AGENT.name, status: 'in_progress' }
                        : x));
                      setSelectedId(c.id);
                      addActionLog({ id: `act_take_${Date.now()}`, agentId: CURRENT_AGENT.id, agentName: CURRENT_AGENT.name, agentRole: CURRENT_AGENT.role, action: 'assigned', note: `Взят оператором`, timestamp: nowFull(), conversationId: c.id });
                    } : undefined}
                    showResolveBtn={activeChannel === 'mine'}
                    onResolve={activeChannel === 'mine' ? () => {
                      setSelectedId(c.id);
                      setShowResolutionModal(true);
                    } : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat window */}
        <div className="flex-1 overflow-hidden min-w-0">
          {selected ? (
            <ChatWindow
              key={selected.id}
              conv={selected}
              agentRole={agentRole}
              actionLog={actionLog}
              onSend={sendMessage}
              onEscalate={escalate}
              onCloseConv={closeConv}
              onAssign={assignAgent}
              onReopen={reopenConv}
              onStatusChange={handleOrderStatusChange}
              onActionLogged={addActionLog}
              onCancelCourierOrder={handleCancelCourierOrder}
              onEscalateCourierCancel={handleEscalateCourierCancel}
              onCourierReassign={handleCourierReassign}
              onChangePriority={changePriority}
              onSetWaiting={() => setShowWaitingModal(true)}
              onResumeWaiting={resumeWaiting}
              onRoute={handleRoute}
              agentsList={agents}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8 bg-gray-50 h-full">
              <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mb-4">
                <MessageSquare className="w-10 h-10 text-blue-300" />
              </div>
              <p className="font-semibold text-gray-600 mb-1">Выберите чат</p>
              <p className="text-sm text-gray-400">Кликните на диалог слева или создайте новый</p>
              {perms.canReply && (
                <button onClick={() => setShowNewChat(true)}
                  className="mt-5 flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium text-sm">
                  <Plus className="w-4 h-4" />Новый чат
                </button>
              )}
            </div>
          )}
        </div>

        {/* Team panel */}
        {showTeam && (
          <div className="w-72 border-l border-gray-200 bg-white overflow-hidden flex flex-col shrink-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
              <h2 className="font-semibold text-gray-900 text-sm">Команда</h2>
              <button onClick={() => setShowTeam(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <TeamPanel
                onViewAgent={a => {
                  // Open full cabinet modal
                  setCabinetOperator({
                    id: a.id, name: a.name, email: a.email,
                    role: a.role, online: a.online, avatar: a.avatar,
                    activeChats: a.activeChats, resolvedToday: a.resolvedToday,
                    avgResponseTime: a.avgResponseTime, csat: a.csat,
                  });
                }}
                agents={agents}
              />
            </div>
          </div>
        )}
      </div>

      {/* Modals — always at root level, outside motion/animation wrappers */}
      {showNewChat && (
        <NewChatModal
          onClose={() => setShowNewChat(false)}
          onCreate={addConversation}
          existingConversations={conversations}
          onNavigateExisting={id => { setSelectedId(id); setShowNewChat(false); }}
        />
      )}
      {viewingAgent && (
        <AgentCabinetModal
          agent={agents.find(a => a.id === viewingAgent.id) ?? viewingAgent}
          currentUserRole={agentRole}
          onClose={() => setViewingAgent(null)}
          onRoleChange={(agentId, newRole) => {
            setAgents(prev => prev.map(a => a.id === agentId ? { ...a, role: newRole } : a));
            setViewingAgent(prev => prev && prev.id === agentId ? { ...prev, role: newRole } : prev);
          }}
          onToggleActive={(agentId) => {
            setAgents(prev => prev.map(a => a.id === agentId ? { ...a, active: a.active !== false ? false : true } : a));
          }}
          onResetPassword={(_agentId) => generatePassword()}
        />
      )}
      {showResolutionModal && selected && (
        <ResolutionModal
          conv={selected}
          onConfirm={closeConvWithResolution}
          onClose={() => setShowResolutionModal(false)}
        />
      )}
      {showWaitingModal && selected && (
        <WaitingModal
          conv={selected}
          onConfirm={setWaitingExternal}
          onClose={() => setShowWaitingModal(false)}
        />
      )}
      {showOperatorMgmt && (
        <OperatorManagement onClose={() => setShowOperatorMgmt(false)} />
      )}
      {cabinetOperator && (
        <OperatorCabinetModal
          operator={cabinetOperator}
          conversations={conversations}
          currentUserRole={agentRole}
          isMonitorMode={agentRole === 'admin' && cabinetOperator.id !== CURRENT_AGENT.id}
          onClose={() => setCabinetOperator(null)}
          onTakeChat={(convId, agentId, agentName) => {
            const ts = now();
            const sysMsg: ChatMessage = {
              id: `m_take_${Date.now()}`, conversationId: convId,
              senderId: 'bot', senderName: 'PVZ Bot', senderRole: 'bot',
              type: 'system',
              systemText: `👤 Чат взят в работу → ${agentName}`,
              timestamp: ts, read: true,
            };
            setConversations(prev => prev.map(c => c.id !== convId ? c : {
              ...c, assignedTo: agentId, assignedToName: agentName, status: 'in_progress',
              messages: [...c.messages, sysMsg], lastMessage: sysMsg.systemText!, lastMessageTime: ts,
            }));
            addActionLog({ id: `act_take_${Date.now()}`, agentId, agentName, agentRole: cabinetOperator.role, action: 'assigned', note: 'Взят из личного кабинета', timestamp: nowFull(), conversationId: convId });
          }}
          onReassignChat={(convId) => {
            const ts = now();
            const conv = conversations.find(c => c.id === convId);
            const prevName = conv?.assignedToName ?? 'агента';
            const sysMsg: ChatMessage = {
              id: `m_unassign_${Date.now()}`, conversationId: convId,
              senderId: 'bot', senderName: 'PVZ Bot', senderRole: 'bot',
              type: 'system',
              systemText: `🔄 Чат снят с ${prevName} → в очередь · ${CURRENT_AGENT.name}`,
              timestamp: ts, read: true,
            };
            setConversations(prev => prev.map(c => c.id !== convId ? c : {
              ...c, assignedTo: undefined, assignedToName: undefined, status: 'open',
              messages: [...c.messages, sysMsg], lastMessage: sysMsg.systemText!, lastMessageTime: ts,
            }));
            addActionLog({ id: `act_reassign_${Date.now()}`, agentId: CURRENT_AGENT.id, agentName: CURRENT_AGENT.name, agentRole: CURRENT_AGENT.role, action: 'assigned', note: `Переназначен администратором (снято с ${prevName})`, timestamp: nowFull(), conversationId: convId });
          }}
          onSendMessage={(convId, text, isInternal) => {
            const ts = now();
            const msg: { id: string; conversationId: string; senderId: string; senderName: string; senderRole: 'support_l1' | 'support_l2' | 'support_lead' | 'admin'; text: string; type: 'text'; timestamp: string; read: boolean; isInternal?: boolean } = {
              id: `m_cab_${Date.now()}`, conversationId: convId,
              senderId: cabinetOperator.id, senderName: cabinetOperator.name,
              senderRole: cabinetOperator.role === 'admin' ? 'admin' : cabinetOperator.role === 'lead' ? 'support_lead' : cabinetOperator.role === 'l2' ? 'support_l2' : 'support_l1',
              text, type: 'text', timestamp: ts, read: true, isInternal,
            };
            setConversations(prev => prev.map(c => c.id !== convId ? c : {
              ...c, messages: [...c.messages, msg], lastMessage: isInternal ? `🔒 ${text}` : text, lastMessageTime: ts,
            }));
          }}
          onNavigateToChat={(convId) => { setSelectedId(convId); setCabinetOperator(null); }}
        />
      )}
    </div>
  );
}
