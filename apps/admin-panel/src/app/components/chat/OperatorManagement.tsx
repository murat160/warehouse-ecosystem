import { useState, useMemo } from 'react';
import {
  X, Users, Shield, Layers, Search, Pencil as Edit2, Lock, Unlock,
  KeyRound, ChevronDown, Check, AlertTriangle, CheckCircle2,
  Archive, Wifi, WifiOff, User, MoreVertical,
  Eye, MessageSquare, ArrowUpRight, BarChart2, Download,
  RefreshCw, UserPlus, Copy, Info, Link, Monitor,
  ShieldCheck, AlertCircle, Bike, Store, Package,
  RotateCcw, Zap, Save, History,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type FullRole =
  | 'ChatAdmin'
  | 'Supervisor'
  | 'OperatorL1'
  | 'OperatorL2'
  | 'OperatorL3'
  | 'QA'
  | 'Audit'
  | 'RegionalManager';

export type OperatorStatus = 'online' | 'offline' | 'blocked' | 'archived';

export type ChatPermission =
  | 'view_chats'
  | 'reply'
  | 'close'
  | 'escalate'
  | 'analytics'
  | 'export'
  | 'manage_operators'
  | 'reassign'
  | 'internal_notes'
  | 'macros';

export interface ManagedOperator {
  id: string;
  name: string;
  email: string;
  role: FullRole;
  status: OperatorStatus;
  activeChats: number;
  region: string;
  lastActivity: string;
  avatar: string;
  queues: string[];
  resolvedToday: number;
  csat: number;
}

export interface ChatQueue {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
  channels: string[];
  assignedRoles: FullRole[];
  activeCount: number;
  pendingCount: number;
  color: string;
  bg: string;
  border: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: string;
  action: string;
  target: string;
  detail: string;
  severity: 'info' | 'warning' | 'critical';
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_CFG: Record<FullRole, {
  label: string; short: string; description: string;
  color: string; bg: string; border: string; level: number;
}> = {
  ChatAdmin:       { label: 'Chat Admin',        short: 'CA',   description: 'Полное управление системой чатов, операторами и очередями', color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-300',    level: 0 },
  Supervisor:      { label: 'Супервизор',         short: 'SUP',  description: 'Мониторинг команды, переназначение чатов, отчёты',         color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-300', level: 1 },
  RegionalManager: { label: 'Рег. менеджер',      short: 'RM',   description: 'Управление операторами своего региона',                    color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-300', level: 2 },
  OperatorL3:      { label: 'Оператор L3',        short: 'L3',   description: 'Сложные кейсы, финальное решение, право закрытия',         color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-300',   level: 3 },
  OperatorL2:      { label: 'Оператор L2',        short: 'L2',   description: 'Эскалированные чаты, право отмены заказа',                 color: 'text-teal-700',   bg: 'bg-teal-50',   border: 'border-teal-300',   level: 4 },
  OperatorL1:      { label: 'Оператор L1',        short: 'L1',   description: 'Входящие обращения, базовая поддержка',                    color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-300',  level: 5 },
  QA:              { label: 'QA / Контроль',      short: 'QA',   description: 'Прослушивание и аудит диалогов, оценка качества',         color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-300', level: 6 },
  Audit:           { label: 'Аудит',              short: 'AUD',  description: 'Только чтение аудит-журнала и статистики',                 color: 'text-gray-700',   bg: 'bg-gray-50',   border: 'border-gray-300',   level: 7 },
};

const PERMISSION_CFG: Record<ChatPermission, { label: string; icon: React.ElementType; desc: string }> = {
  view_chats:       { label: 'Просмотр чатов',      icon: Eye,           desc: 'Видеть назначенные чаты' },
  reply:            { label: 'Ответ клиенту',        icon: MessageSquare, desc: 'Отвечать в чатах' },
  close:            { label: 'Закрытие кейса',       icon: CheckCircle2,  desc: 'Закрывать и разрешать чаты' },
  escalate:         { label: 'Эскалация',            icon: ArrowUpRight,  desc: 'Эскалировать чат вверх по уровням' },
  analytics:        { label: 'Аналитика',            icon: BarChart2,     desc: 'Просматривать отчёты и метрики' },
  export:           { label: 'Экспорт данных',       icon: Download,      desc: 'Выгружать данные и историю' },
  manage_operators: { label: 'Управл. опер��торами',  icon: Users,         desc: 'Создавать, редактировать, блокировать' },
  reassign:         { label: 'Переназначение',       icon: RefreshCw,     desc: 'Переназначать чаты внутри команды' },
  internal_notes:   { label: 'Внутренние заметки',   icon: Lock,          desc: 'Писать заметки, невидимые клиенту' },
  macros:           { label: 'Макросы',              icon: Zap,           desc: 'Использовать шаблоны ответов' },
};

const ROLE_PERMISSIONS: Record<FullRole, ChatPermission[]> = {
  ChatAdmin:       ['view_chats', 'reply', 'close', 'escalate', 'analytics', 'export', 'manage_operators', 'reassign', 'internal_notes', 'macros'],
  Supervisor:      ['view_chats', 'reply', 'close', 'escalate', 'analytics', 'export', 'reassign', 'internal_notes', 'macros'],
  RegionalManager: ['view_chats', 'analytics', 'export', 'reassign'],
  OperatorL3:      ['view_chats', 'reply', 'close', 'escalate', 'internal_notes', 'macros'],
  OperatorL2:      ['view_chats', 'reply', 'close', 'escalate', 'internal_notes', 'macros'],
  OperatorL1:      ['view_chats', 'reply', 'escalate', 'internal_notes', 'macros'],
  QA:              ['view_chats', 'analytics', 'internal_notes'],
  Audit:           ['view_chats', 'analytics', 'export'],
};

const INITIAL_OPERATORS: ManagedOperator[] = [
  { id: 'op1',  name: 'Администратор Системы',  email: 'admin@platform.com',   role: 'ChatAdmin',       status: 'online',   activeChats: 0,  region: 'Все',      lastActivity: '2 мин назад',   avatar: 'АС', queues: ['clients','couriers','merchants','returns','delivery','internal'], resolvedToday: 0,  csat: 0 },
  { id: 'op2',  name: 'Захаров Виктор',          email: 'zakharov@platform.com', role: 'Supervisor',      status: 'online',   activeChats: 1,  region: 'Москва',   lastActivity: '5 мин назад',   avatar: 'ЗВ', queues: ['clients','couriers','merchants','escalated'], resolvedToday: 3,  csat: 5.0 },
  { id: 'op3',  name: 'Попова Ирина',            email: 'popova@platform.com',   role: 'OperatorL2',      status: 'online',   activeChats: 2,  region: 'Москва',   lastActivity: '1 мин назад',   avatar: 'ПИ', queues: ['clients','escalated'], resolvedToday: 5,  csat: 4.8 },
  { id: 'op4',  name: 'Козлова Елена',           email: 'kozlova@platform.com',  role: 'OperatorL1',      status: 'online',   activeChats: 4,  region: 'Москва',   lastActivity: '< 1 мин',       avatar: 'КЕ', queues: ['clients','returns'], resolvedToday: 12, csat: 4.9 },
  { id: 'op5',  name: 'Смирнов Антон',           email: 'smirnov@platform.com',  role: 'OperatorL1',      status: 'online',   activeChats: 3,  region: 'Москва',   lastActivity: '3 мин назад',   avatar: 'СА', queues: ['clients'], resolvedToday: 8,  csat: 4.7 },
  { id: 'op6',  name: 'Фёдорова Мария',          email: 'fedorova@platform.com', role: 'OperatorL2',      status: 'offline',  activeChats: 0,  region: 'СПб',      lastActivity: '2 ч назад',     avatar: 'ФМ', queues: ['couriers','escalated'], resolvedToday: 0,  csat: 4.6 },
  { id: 'op7',  name: 'Никитин Сергей',          email: 'nikitin@platform.com',  role: 'OperatorL3',      status: 'offline',  activeChats: 0,  region: 'СПб',      lastActivity: '1 ч назад',     avatar: 'НС', queues: ['merchants','delivery','escalated'], resolvedToday: 0,  csat: 4.9 },
  { id: 'op8',  name: 'Орлова Светлана',         email: 'orlova@platform.com',   role: 'QA',              status: 'online',   activeChats: 0,  region: 'Москва',   lastActivity: '10 мин назад',  avatar: 'ОС', queues: [], resolvedToday: 0,  csat: 0 },
  { id: 'op9',  name: 'Петров Алексей',          email: 'petrov@platform.com',   role: 'OperatorL1',      status: 'blocked',  activeChats: 0,  region: 'Казань',   lastActivity: '3 дн назад',    avatar: 'ПА', queues: [], resolvedToday: 0,  csat: 3.2 },
  { id: 'op10', name: 'Лебедева Анна',           email: 'lebedeva@platform.com', role: 'RegionalManager', status: 'online',   activeChats: 0,  region: 'Казань',   lastActivity: '15 мин назад',  avatar: 'ЛА', queues: ['clients','couriers'], resolvedToday: 0,  csat: 0 },
  { id: 'op11', name: 'Волков Дмитрий',          email: 'volkov@platform.com',   role: 'Audit',           status: 'archived', activeChats: 0,  region: 'Все',      lastActivity: '30 дн назад',   avatar: 'ВД', queues: [], resolvedToday: 0,  csat: 0 },
];

const QUEUES: ChatQueue[] = [
  { id: 'clients',   name: 'Клиенты',         icon: User,        description: 'Входящие обращения от клиентов',          channels: ['support'], assignedRoles: ['OperatorL1','OperatorL2','OperatorL3','Supervisor'], activeCount: 12, pendingCount: 5,  color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200' },
  { id: 'couriers',  name: 'Курьеры',         icon: Bike,        description: 'Обращения и вопросы от курьеров',          channels: ['couriers'], assignedRoles: ['OperatorL1','OperatorL2','Supervisor'], activeCount: 4,  pendingCount: 2,  color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
  { id: 'merchants', name: 'Продавцы',        icon: Store,       description: 'Вопросы мерчантов и партнёров',           channels: ['merchants'], assignedRoles: ['OperatorL2','OperatorL3','Supervisor'], activeCount: 3,  pendingCount: 1,  color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
  { id: 'returns',   name: 'Возвраты',        icon: RotateCcw,   description: 'Обработка возвратов и рекламаций',        channels: ['support'], assignedRoles: ['OperatorL1','OperatorL2'], activeCount: 7,  pendingCount: 3,  color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  { id: 'delivery',  name: 'Проблемы доставки', icon: Package,   description: 'Задержки, потери, повреждения',           channels: ['support','couriers'], assignedRoles: ['OperatorL2','OperatorL3','Supervisor'], activeCount: 5,  pendingCount: 4,  color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200' },
  { id: 'internal',  name: 'Внутренний',      icon: Lock,        description: 'Внутренние коммуникации команды',         channels: ['internal'], assignedRoles: ['ChatAdmin','Supervisor','RegionalManager'], activeCount: 2,  pendingCount: 0,  color: 'text-gray-700',   bg: 'bg-gray-50',   border: 'border-gray-200' },
  { id: 'escalated', name: 'Эскалации',       icon: AlertTriangle, description: 'Эскалированные критичные кейсы',       channels: ['escalated'], assignedRoles: ['OperatorL2','OperatorL3','Supervisor','ChatAdmin'], activeCount: 3,  pendingCount: 1,  color: 'text-rose-700',   bg: 'bg-rose-50',   border: 'border-rose-200' },
];

const INITIAL_AUDIT: AuditEntry[] = [
  { id: 'a1', timestamp: '07.03.2026 14:22', actorName: 'Администратор Системы', actorRole: 'ChatAdmin', action: 'Смена роли',        target: 'Козлова Елена',  detail: 'OperatorL1 → OperatorL2', severity: 'warning' },
  { id: 'a2', timestamp: '07.03.2026 13:47', actorName: 'Администратор Системы', actorRole: 'ChatAdmin', action: 'Блокировка',        target: 'Петров Алексей', detail: 'Причина: нарушение регламента',              severity: 'critical' },
  { id: 'a3', timestamp: '07.03.2026 12:15', actorName: 'Администратор Системы', actorRole: 'ChatAdmin', action: 'Сброс пароля',      target: 'Смирнов Антон',  detail: 'Сгенерирован временный пароль',              severity: 'info' },
  { id: 'a4', timestamp: '06.03.2026 18:03', actorName: 'Захаров Виктор',        actorRole: 'Supervisor', action: 'Переназначение',   target: 'Чат #conv_4',    detail: 'Козлова Елена → Попова Ирина',               severity: 'info' },
  { id: 'a5', timestamp: '06.03.2026 16:41', actorName: 'Администратор Системы', actorRole: 'ChatAdmin', action: 'Создан оператор',   target: 'Орлова Светлана', detail: 'Роль: QA, Регион: Москва',                  severity: 'info' },
  { id: 'a6', timestamp: '06.03.2026 10:00', actorName: 'Администратор Системы', actorRole: 'ChatAdmin', action: 'Изменение очереди', target: 'Клиенты',        detail: 'Добавлена роль OperatorL3',                  severity: 'info' },
];

const REGIONS = ['Все', 'Москва', 'СПб', 'Казань', 'Новосибирск', 'Екатеринбург'];

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function generateInviteLink(email: string, role: FullRole) {
  const token = btoa(`${email}:${role}:${Date.now()}`).replace(/=/g, '').slice(0, 24);
  return `https://admin.platform.ru/invite/${token}`;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<OperatorStatus, { label: string; color: string; bg: string; dot: string; icon: React.ElementType }> = {
  online:   { label: 'Онлайн',     color: 'text-green-700',  bg: 'bg-green-50',  dot: 'bg-green-500',  icon: Wifi },
  offline:  { label: 'Оффлайн',   color: 'text-gray-600',   bg: 'bg-gray-50',   dot: 'bg-gray-400',   icon: WifiOff },
  blocked:  { label: 'Заблокирован', color: 'text-red-700',  bg: 'bg-red-50',    dot: 'bg-red-500',    icon: Lock },
  archived: { label: 'Архив',      color: 'text-gray-400',   bg: 'bg-gray-100',  dot: 'bg-gray-300',   icon: Archive },
};

function StatusBadge({ status }: { status: OperatorStatus }) {
  const cfg = STATUS_CFG[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function RoleBadge({ role }: { role: FullRole }) {
  const cfg = ROLE_CFG[role];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
      {cfg.short}
    </span>
  );
}

// ─── Edit Operator Modal ───────────────────────────────────────────────────────

function EditOperatorModal({ op, onClose, onSave, auditLog }: {
  op: ManagedOperator;
  onClose: () => void;
  onSave: (updated: ManagedOperator, auditEntry: AuditEntry) => void;
  auditLog: (e: AuditEntry) => void;
}) {
  const [name, setName] = useState(op.name);
  const [email, setEmail] = useState(op.email);
  const [role, setRole] = useState<FullRole>(op.role);
  const [region, setRegion] = useState(op.region);
  const [queues, setQueues] = useState<string[]>(op.queues);
  const [generatedPwd, setGeneratedPwd] = useState('');

  const allQueues = QUEUES.map(q => q.id);

  function toggleQueue(qid: string) {
    setQueues(prev => prev.includes(qid) ? prev.filter(id => id !== qid) : [...prev, qid]);
  }

  function handleSave() {
    const updated: ManagedOperator = { ...op, name, email, role, region, queues };
    const entry: AuditEntry = {
      id: `audit_${Date.now()}`, timestamp: new Date().toLocaleString('ru-RU'),
      actorName: 'Администратор Системы', actorRole: 'ChatAdmin',
      action: 'Редактирование оператора', target: op.name,
      detail: `Роль: ${role}, Регион: ${region}`,
      severity: role !== op.role ? 'warning' : 'info',
    };
    onSave(updated, entry);
    onClose();
  }

  function handleResetPwd() {
    const pwd = generatePassword();
    setGeneratedPwd(pwd);
    auditLog({
      id: `audit_${Date.now()}`, timestamp: new Date().toLocaleString('ru-RU'),
      actorName: 'Администратор Системы', actorRole: 'ChatAdmin',
      action: 'Сброс пароля', target: op.name,
      detail: 'Сгенерирован новый временный пароль', severity: 'info',
    });
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white text-sm font-bold">{op.avatar}</div>
            <div>
              <h2 className="font-bold text-gray-900">Редактировать оператора</h2>
              <p className="text-xs text-gray-500">{op.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-4 h-4 text-gray-500" /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Имя</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="mt-1.5 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {/* Email */}
          <div>
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)}
              className="mt-1.5 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {/* Role */}
          <div>
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Роль</label>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {(Object.keys(ROLE_CFG) as FullRole[]).map(r => {
                const cfg = ROLE_CFG[r];
                const active = role === r;
                return (
                  <button key={r} onClick={() => setRole(r)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-all ${active ? `${cfg.bg} ${cfg.border} ${cfg.color}` : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}>
                    <span className={`text-xs font-bold w-8 shrink-0 ${active ? cfg.color : 'text-gray-500'}`}>{cfg.short}</span>
                    <span className="text-xs truncate">{cfg.label}</span>
                    {active && <Check className="w-3.5 h-3.5 ml-auto shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
          {/* Region */}
          <div>
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Регион</label>
            <select value={region} onChange={e => setRegion(e.target.value)}
              className="mt-1.5 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          {/* Queues */}
          <div>
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Очереди</label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {QUEUES.map(q => {
                const active = queues.includes(q.id);
                return (
                  <button key={q.id} onClick={() => toggleQueue(q.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all ${active ? `${q.bg} ${q.border} ${q.color}` : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                    {active && <Check className="w-3 h-3" />}
                    {q.name}
                  </button>
                );
              })}
            </div>
          </div>
          {/* Password reset */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-700">Сброс пароля</span>
              <button onClick={handleResetPwd}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors">
                <KeyRound className="w-3.5 h-3.5" />Сгенерировать
              </button>
            </div>
            {generatedPwd && (
              <div className="flex items-center gap-2 mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                <code className="text-xs font-mono text-yellow-800 flex-1">{generatedPwd}</code>
                <button onClick={() => { navigator.clipboard.writeText(generatedPwd); }}
                  className="p-1 hover:bg-yellow-100 rounded">
                  <Copy className="w-3.5 h-3.5 text-yellow-700" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors">Отмена</button>
          <button onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors">
            <Save className="w-4 h-4" />Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Create Operator Modal ─────────────────────────────────────────────────────

function CreateOperatorModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (op: ManagedOperator, entry: AuditEntry) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<FullRole>('OperatorL1');
  const [region, setRegion] = useState('Москва');
  const [queues, setQueues] = useState<string[]>(['clients']);
  const [pwd] = useState(generatePassword());
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false);
  const inviteLink = email ? generateInviteLink(email, role) : '';

  function handleCreate() {
    if (!name.trim() || !email.trim()) return;
    const initials = name.trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const newOp: ManagedOperator = {
      id: `op_${Date.now()}`, name: name.trim(), email: email.trim(), role, status: 'offline',
      activeChats: 0, region, lastActivity: 'Никогда', avatar: initials, queues,
      resolvedToday: 0, csat: 0,
    };
    const entry: AuditEntry = {
      id: `audit_${Date.now()}`, timestamp: new Date().toLocaleString('ru-RU'),
      actorName: 'Администратор Системы', actorRole: 'ChatAdmin',
      action: 'Создан оператор', target: name.trim(),
      detail: `Роль: ${ROLE_CFG[role].label}, Регион: ${region}`, severity: 'info',
    };
    onCreate(newOp, entry);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-bold text-gray-900 flex items-center gap-2"><UserPlus className="w-5 h-5 text-blue-600" />Новый оператор</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Полное имя *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Иванов Иван Иванович"
                className="mt-1.5 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Email *</label>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="ivan@platform.com" type="email"
                className="mt-1.5 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Роль</label>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {(Object.keys(ROLE_CFG) as FullRole[]).map(r => {
                const cfg = ROLE_CFG[r];
                const active = role === r;
                return (
                  <button key={r} onClick={() => setRole(r)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-all ${active ? `${cfg.bg} ${cfg.border} ${cfg.color}` : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}>
                    <span className="text-xs font-bold w-8 shrink-0">{cfg.short}</span>
                    <span className="text-xs truncate">{cfg.label}</span>
                    {active && <Check className="w-3.5 h-3.5 ml-auto shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Регион</label>
            <select value={region} onChange={e => setRegion(e.target.value)}
              className="mt-1.5 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              {REGIONS.filter(r => r !== 'Все').map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Очереди</label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {QUEUES.map(q => {
                const active = queues.includes(q.id);
                return (
                  <button key={q.id}
                    onClick={() => setQueues(prev => prev.includes(q.id) ? prev.filter(id => id !== q.id) : [...prev, q.id])}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all ${active ? `${q.bg} ${q.border} ${q.color}` : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                    {active && <Check className="w-3 h-3" />}
                    {q.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
            <p className="text-xs font-semibold text-yellow-800 mb-1">Временный пароль</p>
            <div className="flex items-center gap-2">
              <code className="text-xs font-mono text-yellow-900 flex-1">{pwd}</code>
              <button onClick={() => navigator.clipboard.writeText(pwd)} className="p-1.5 hover:bg-yellow-100 rounded-lg">
                <Copy className="w-3.5 h-3.5 text-yellow-700" />
              </button>
            </div>
            <p className="text-xs text-yellow-600 mt-1">Передайте пароль оператору по защищённому каналу</p>
          </div>
          {/* Invite link */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-semibold text-blue-800 flex items-center gap-1.5">
                <Link className="w-3.5 h-3.5" />Ссылка-приглашение
              </p>
              <button
                onClick={() => { if (inviteLink) { navigator.clipboard.writeText(inviteLink); setInviteLinkCopied(true); setTimeout(() => setInviteLinkCopied(false), 2000); } }}
                disabled={!email.trim()}
                className="flex items-center gap-1 px-2.5 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {inviteLinkCopied ? <span className="flex items-center gap-1"><Check className="w-3 h-3" />Скопировано!</span> : <span className="flex items-center gap-1"><Copy className="w-3 h-3" />Копировать</span>}
              </button>
            </div>
            <p className="text-xs text-blue-600 font-mono truncate">{email ? inviteLink : 'Введите email для генерации ссылки'}</p>
            <p className="text-xs text-blue-500 mt-1">Ссылка действует 24 часа · оператор задаст свой пароль при первом входе</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors">Отмена</button>
          <button onClick={handleCreate} disabled={!name.trim() || !email.trim()}
            className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            <UserPlus className="w-4 h-4" />Создать
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Block / Unblock Confirm ──────────────────────────────────────────────────

function BlockConfirmModal({ op, onClose, onConfirm }: {
  op: ManagedOperator;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const isBlocking = op.status !== 'blocked';
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className={`px-6 pt-6 pb-4 ${isBlocking ? 'text-center' : ''}`}>
          {isBlocking ? (
            <div style={{ display: 'contents' }}>
              <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Lock className="w-7 h-7 text-red-600" />
              </div>
              <h2 className="font-bold text-gray-900 text-lg">Заблокировать оператора?</h2>
              <p className="text-sm text-gray-500 mt-1">
                <span className="font-medium text-gray-700">{op.name}</span> потеряет доступ. Все активные чаты ({op.activeChats}) будут переназначены.
              </p>
            </div>
          ) : (
            <div style={{ display: 'contents' }}>
              <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2"><Unlock className="w-5 h-5 text-green-600" />Разблокировать оператора</h2>
              <p className="text-sm text-gray-500 mt-1"><span className="font-medium text-gray-700">{op.name}</span> получит доступ к системе.</p>
            </div>
          )}
          {isBlocking && (
            <div className="mt-4 text-left">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Причина *</label>
              <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
                placeholder="Укажите причину блокировки..."
                className="mt-1.5 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-100">Отмена</button>
          <button onClick={() => onConfirm(reason)} disabled={isBlocking && !reason.trim()}
            className={`flex items-center gap-2 px-5 py-2 text-sm font-medium text-white rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${isBlocking ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>
            {isBlocking ? <span className="flex items-center gap-2"><Lock className="w-4 h-4" />Заблокировать</span> : <span className="flex items-center gap-2"><Unlock className="w-4 h-4" />Разблокировать</span>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Monitoring Tab ───────────────────────────────────────────────────────────

const PRIORITY_DOT_MAP: Record<string, string> = {
  critical: 'bg-red-500', high: 'bg-orange-500', normal: 'bg-blue-400', low: 'bg-gray-400',
};

const MOCK_OP_CHATS: Record<string, { clientName: string; subject: string; channel: string; elapsed: string; priority: string }[]> = {
  op4: [
    { clientName: 'Мария Петрова',  subject: 'Задержка доставки',  channel: 'Клиенты',   elapsed: '12 мин', priority: 'high' },
    { clientName: 'Сергей Иванов',  subject: 'Вопрос по заказу',   channel: 'Клиенты',   elapsed: '3 мин',  priority: 'normal' },
    { clientName: 'Анна Ким',       subject: 'Возврат товара',      channel: 'Возвраты',  elapsed: '28 мин', priority: 'high' },
    { clientName: 'Дмитрий Волков', subject: 'Не пришёл заказ',    channel: 'Клиенты',   elapsed: '45 мин', priority: 'critical' },
  ],
  op5: [
    { clientName: 'Роман Захаров',  subject: 'Ошибка оплаты',      channel: 'Клиенты',   elapsed: '7 мин',  priority: 'normal' },
    { clientName: 'Юлия Смирнова',  subject: 'Изменить адрес',      channel: 'Клиенты',   elapsed: '15 мин', priority: 'normal' },
    { clientName: 'Николай Попов',  subject: 'Курьер не звонит',    channel: 'Клиенты',   elapsed: '2 мин',  priority: 'normal' },
  ],
  op3: [
    { clientName: 'Александр Ли',   subject: 'Проблема с заказом',  channel: 'Эскалация', elapsed: '22 мин', priority: 'critical' },
    { clientName: 'Галина Орлова',  subject: 'Требует компенсацию', channel: 'Эскалация', elapsed: '55 мин', priority: 'critical' },
  ],
  op2: [
    { clientName: 'Рустам Назаров', subject: 'Технический вопрос',  channel: 'Внутренний', elapsed: '5 мин', priority: 'normal' },
  ],
  op8: [], op10: [],
};

function MonitoringTab({ operators }: { operators: ManagedOperator[] }) {
  const [selectedOp, setSelectedOp] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const onlineOps = operators.filter(o => o.status === 'online');
  const offlineOps = operators.filter(o => o.status === 'offline');

  const filtered = useMemo(() => {
    if (!search) return onlineOps;
    const q = search.toLowerCase();
    return onlineOps.filter(o => o.name.toLowerCase().includes(q) || o.role.toLowerCase().includes(q));
  }, [onlineOps, search]);

  const totalChats = onlineOps.reduce((s, o) => s + (MOCK_OP_CHATS[o.id]?.length ?? 0), 0);
  const totalCritical = onlineOps.reduce((s, o) => s + (MOCK_OP_CHATS[o.id]?.filter(c => c.priority === 'critical').length ?? 0), 0);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: operator list */}
      <div className="w-72 border-r border-gray-100 flex flex-col overflow-hidden shrink-0">
        <div className="p-3 border-b border-gray-100 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск оператора..."
              className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div className="px-3 py-2 border-b border-gray-100 bg-gray-50 shrink-0 flex items-center gap-3">
          <span className="flex items-center gap-1 text-xs text-green-600 font-medium"><span className="w-2 h-2 rounded-full bg-green-500" />{onlineOps.length} онлайн</span>
          <span className="text-gray-300">·</span>
          <span className="text-xs text-gray-400">{offlineOps.length} оффлайн</span>
          {totalCritical > 0 && (
            <span className="ml-auto flex items-center gap-1 text-xs text-red-600 font-semibold"><AlertTriangle className="w-3 h-3" />{totalCritical} крит.</span>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map(op => {
            const roleCfg = ROLE_CFG[op.role];
            const chats = MOCK_OP_CHATS[op.id] ?? [];
            const hasCritical = chats.some(c => c.priority === 'critical');
            const isSelected = selectedOp === op.id;
            return (
              <button key={op.id} onClick={() => setSelectedOp(isSelected ? null : op.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 border-b border-gray-100 text-left transition-all hover:bg-gray-50 ${isSelected ? 'bg-blue-50 border-l-2 border-l-blue-600' : 'border-l-2 border-l-transparent'}`}>
                <div className="relative shrink-0">
                  <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">{op.avatar}</div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white bg-green-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-gray-900 truncate">{op.name}</p>
                    {hasCritical && <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />}
                  </div>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${roleCfg.bg} ${roleCfg.color}`}>{roleCfg.label}</span>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-bold ${chats.length > 0 ? 'text-blue-600' : 'text-gray-300'}`}>{chats.length}</p>
                  <p className="text-xs text-gray-400">чатов</p>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Monitor className="w-10 h-10 mb-2 text-gray-200" />
              <p className="text-xs">Нет онлайн операторов</p>
            </div>
          )}
        </div>
      </div>

      {/* Right: detail or overview */}
      <div className="flex-1 overflow-y-auto">
        {!selectedOp ? (
          <div className="p-5 space-y-5">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Онлайн операторов', value: onlineOps.length, color: 'text-green-600', bg: 'bg-green-50', icon: Wifi },
                { label: 'Активных чатов',    value: totalChats,        color: 'text-blue-600',  bg: 'bg-blue-50',  icon: MessageSquare },
                { label: 'Критичных кейсов',  value: totalCritical,     color: 'text-red-600',   bg: 'bg-red-50',   icon: AlertTriangle },
              ].map((s, i) => {
                const Icon = s.icon;
                return (
                  <button key={i}
                    onClick={() => toast.info(s.label, { description: `Текущее значение: ${s.value}` })}
                    className={`p-4 rounded-xl ${s.bg} flex items-center gap-3 text-left w-full cursor-pointer hover:shadow-sm active:scale-[0.97] transition-all`}>
                    <Icon className={`w-6 h-6 ${s.color} shrink-0`} />
                    <div>
                      <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-xs text-gray-500">{s.label}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Все активные чаты</p>
            <div className="space-y-3">
              {onlineOps.map(op => {
                const chats = MOCK_OP_CHATS[op.id] ?? [];
                if (chats.length === 0) return null;
                return (
                  <div key={op.id} className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0">{op.avatar}</div>
                      <p className="text-sm font-semibold text-gray-900">{op.name}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${ROLE_CFG[op.role].bg} ${ROLE_CFG[op.role].color} font-medium`}>{ROLE_CFG[op.role].label}</span>
                      <button onClick={() => setSelectedOp(op.id)} className="ml-auto text-xs text-blue-600 hover:underline">Подробнее →</button>
                    </div>
                    <div className="space-y-1.5">
                      {chats.map((c, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-100">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT_MAP[c.priority]}`} />
                          <span className="text-xs font-medium text-gray-800 truncate flex-1">{c.clientName}</span>
                          <span className="text-xs text-gray-400 truncate hidden sm:block">{c.subject}</span>
                          <span className="text-xs text-gray-400 shrink-0 font-mono">{c.elapsed}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          (() => {
            const op = operators.find(o => o.id === selectedOp);
            if (!op) return null;
            const chats = MOCK_OP_CHATS[selectedOp] ?? [];
            const roleCfg = ROLE_CFG[op.role];
            return (
              <div className="p-5 space-y-5">
                <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl">
                  <div className="w-14 h-14 rounded-xl bg-blue-500 flex items-center justify-center text-white text-xl font-bold shrink-0">{op.avatar}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-bold text-white text-lg">{op.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded font-semibold ${roleCfg.bg} ${roleCfg.color}`}>{roleCfg.label}</span>
                    </div>
                    <p className="text-sm text-gray-400">{op.email} · {op.region}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-xs text-green-400"><Wifi className="w-3 h-3" />Онлайн · {op.lastActivity}</span>
                      <span className="text-xs text-gray-500">CSAT {op.csat > 0 ? `${op.csat}⭐` : '—'}</span>
                    </div>
                  </div>
                  <div className="text-center bg-white/10 rounded-xl px-4 py-2 shrink-0">
                    <p className="text-2xl font-bold text-white">{chats.length}</p>
                    <p className="text-xs text-gray-400">чатов</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Очереди</p>
                  <div className="flex flex-wrap gap-2">
                    {op.queues.length > 0 ? op.queues.map(q => (
                      <span key={q} className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs rounded-xl font-medium">{q}</span>
                    )) : <span className="text-xs text-gray-400 italic">Нет очередей</span>}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Активные чаты ({chats.length})</p>
                  {chats.length === 0 ? (
                    <p className="text-sm text-gray-400 italic text-center py-8">Нет активных чатов</p>
                  ) : (
                    <div className="space-y-2">
                      {chats.map((c, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl">
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${PRIORITY_DOT_MAP[c.priority]}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900">{c.clientName}</p>
                            <p className="text-xs text-gray-500 truncate">{c.subject}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-lg">{c.channel}</span>
                            <p className="text-xs text-gray-400 mt-0.5 font-mono">{c.elapsed}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
}

// ─── Operators Tab ────────────────────────────────────────────────────────────

function OperatorsTab({ operators, onEdit, onBlock, onCreate, onArchive }: {
  operators: ManagedOperator[];
  onEdit: (op: ManagedOperator) => void;
  onBlock: (op: ManagedOperator) => void;
  onArchive: (op: ManagedOperator) => void;
  onCreate: () => void;
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OperatorStatus | 'all'>('all');
  const [roleFilter, setRoleFilter] = useState<FullRole | 'all'>('all');
  const [regionFilter, setRegionFilter] = useState('Все');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = operators;
    if (statusFilter !== 'all') list = list.filter(o => o.status === statusFilter);
    if (roleFilter !== 'all') list = list.filter(o => o.role === roleFilter);
    if (regionFilter !== 'Все') list = list.filter(o => o.region === regionFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(o => o.name.toLowerCase().includes(q) || o.email.toLowerCase().includes(q));
    }
    return list;
  }, [operators, statusFilter, roleFilter, regionFilter, search]);

  const counts = useMemo(() => {
    const m: Record<string, number> = { all: operators.length };
    operators.forEach(o => { m[o.status] = (m[o.status] ?? 0) + 1; });
    return m;
  }, [operators]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="px-6 py-4 border-b border-gray-100 shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {(['all', 'online', 'offline', 'blocked', 'archived'] as const).map(s => {
              const cfg = s === 'all' ? null : STATUS_CFG[s];
              const active = statusFilter === s;
              return (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                  {s !== 'all' && <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-white' : cfg!.dot}`} />}
                  {s === 'all' ? 'Все' : cfg!.label}
                  <span className={`text-[10px] font-bold px-1 rounded-full ${active ? 'bg-white/20' : 'bg-gray-100 text-gray-500'}`}>
                    {counts[s] ?? 0}
                  </span>
                </button>
              );
            })}
          </div>
          <button onClick={onCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium">
            <UserPlus className="w-4 h-4" />Добавить оператора
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по имени или email..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value as FullRole | 'all')}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            <option value="all">Все роли</option>
            {(Object.keys(ROLE_CFG) as FullRole[]).map(r => <option key={r} value={r}>{ROLE_CFG[r].label}</option>)}
          </select>
          <select value={regionFilter} onChange={e => setRegionFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
            <tr>
              {['#', 'О��ератор', 'Роль', 'Статус', 'Чаты', 'Регион', 'Последняя активность', ''].map((h, i) => (
                <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-16 text-center text-gray-400">Операторы не найдены</td></tr>
            ) : filtered.map((op, idx) => {
              const roleCfg = ROLE_CFG[op.role];
              const isBlocked = op.status === 'blocked';
              const isArchived = op.status === 'archived';
              return (
                <tr key={op.id} className={`hover:bg-gray-50 transition-colors ${isBlocked ? 'opacity-60' : ''} ${isArchived ? 'opacity-40' : ''}`}>
                  <td className="px-4 py-3 text-xs text-gray-400 font-mono">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${isBlocked ? 'bg-red-400' : isArchived ? 'bg-gray-300' : 'bg-blue-500'}`}>
                        {op.avatar}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{op.name}</p>
                        <p className="text-xs text-gray-400">{op.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${roleCfg.bg} ${roleCfg.color} border ${roleCfg.border}`}>
                      {roleCfg.short} <span className="ml-1 hidden xl:inline">{roleCfg.label}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={op.status} /></td>
                  <td className="px-4 py-3">
                    {op.activeChats > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-200">
                        <MessageSquare className="w-3 h-3" />{op.activeChats}
                      </span>
                    ) : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{op.region}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{op.lastActivity}</td>
                  <td className="px-4 py-3">
                    <div className="relative flex items-center gap-1">
                      {!isArchived && (
                        <div style={{ display: 'contents' }}>
                          <button onClick={() => onEdit(op)}
                            className="p-1.5 hover:bg-blue-50 hover:text-blue-600 text-gray-400 rounded-lg transition-colors" title="Редактировать">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => onBlock(op)}
                            className={`p-1.5 rounded-lg transition-colors ${isBlocked ? 'hover:bg-green-50 hover:text-green-600 text-gray-400' : 'hover:bg-red-50 hover:text-red-600 text-gray-400'}`}
                            title={isBlocked ? 'Разблокировать' : 'Заблокировать'}>
                            {isBlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={() => {
                            setOpenMenuId(openMenuId === op.id ? null : op.id);
                          }} className="p-1.5 hover:bg-gray-100 text-gray-400 rounded-lg transition-colors">
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                          {openMenuId === op.id && (
                            <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-xl shadow-xl z-20 w-44 py-1" onClick={() => setOpenMenuId(null)}>
                              <button onClick={() => onEdit(op)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50">
                                <Edit2 className="w-3.5 h-3.5 text-blue-500" />Редактировать
                              </button>
                              <button onClick={() => { import('sonner').then(m => m.toast.success(`Ссылка для сброса пароля отправлена ${op.name}`)); setOpenMenuId(null); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50">
                                <KeyRound className="w-3.5 h-3.5 text-yellow-500" />Сбросить пароль
                              </button>
                              <div className="border-t border-gray-100 my-1" />
                              <button onClick={() => onArchive(op)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50">
                                <Archive className="w-3.5 h-3.5" />В архив
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      {isArchived && (
                        <span className="text-xs text-gray-300 italic">Архив</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Roles & Permissions Tab ──────────────────────────────────────────────────

function RolesTab({ operators }: { operators: ManagedOperator[] }) {
  const [selected, setSelected] = useState<FullRole>('ChatAdmin');
  const [editedPerms, setEditedPerms] = useState<Record<FullRole, ChatPermission[]>>({ ...ROLE_PERMISSIONS });
  const [saved, setSaved] = useState(false);

  const roleCfg = ROLE_CFG[selected];
  const allPermissions: ChatPermission[] = ['view_chats', 'reply', 'close', 'escalate', 'analytics', 'export', 'manage_operators', 'reassign', 'internal_notes', 'macros'];

  function togglePerm(perm: ChatPermission) {
    if (selected === 'ChatAdmin') return; // ChatAdmin always has all perms
    setEditedPerms(prev => ({
      ...prev,
      [selected]: prev[selected].includes(perm)
        ? prev[selected].filter(p => p !== perm)
        : [...prev[selected], perm],
    }));
    setSaved(false);
  }

  const opCount = (role: FullRole) => operators.filter(o => o.role === role && o.status !== 'archived').length;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Role list */}
      <div className="w-64 border-r border-gray-100 overflow-y-auto shrink-0">
        <div className="p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Роли системы</p>
          <div className="space-y-1">
            {(Object.keys(ROLE_CFG) as FullRole[]).sort((a, b) => ROLE_CFG[a].level - ROLE_CFG[b].level).map(role => {
              const cfg = ROLE_CFG[role];
              const isActive = selected === role;
              const cnt = opCount(role);
              return (
                <button key={role} onClick={() => setSelected(role)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${isActive ? `${cfg.bg} border ${cfg.border}` : 'hover:bg-gray-50 border border-transparent'}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold border ${isActive ? `${cfg.bg} ${cfg.color} ${cfg.border}` : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                    {cfg.short}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isActive ? cfg.color : 'text-gray-700'}`}>{cfg.label}</p>
                    <p className="text-xs text-gray-400">{cnt} оп.</p>
                  </div>
                  {isActive && <ChevronDown className={`w-3.5 h-3.5 -rotate-90 ${cfg.color} shrink-0`} />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Permissions panel */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className={`px-2.5 py-1 rounded-lg text-sm font-bold border ${roleCfg.bg} ${roleCfg.color} ${roleCfg.border}`}>{roleCfg.short}</span>
              <h3 className="font-bold text-gray-900 text-lg">{roleCfg.label}</h3>
              {selected === 'ChatAdmin' && <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full font-medium">Суперправа</span>}
            </div>
            <p className="text-sm text-gray-500">{roleCfg.description}</p>
          </div>
          <div className="flex items-center gap-2">
            {saved && <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle2 className="w-3.5 h-3.5" />Сохранено</span>}
            {selected !== 'ChatAdmin' && (
              <button onClick={() => setSaved(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium">
                <Save className="w-4 h-4" />Сохранить
              </button>
            )}
          </div>
        </div>

        {/* Operators with this role */}
        <div className="flex items-center gap-2 mb-5 p-3 bg-gray-50 rounded-xl border border-gray-200">
          <Users className="w-4 h-4 text-gray-400 shrink-0" />
          <p className="text-xs text-gray-600">
            <span className="font-medium">{opCount(selected)}</span> операторов с этой ролью:&nbsp;
            <span className="text-gray-500">
              {operators.filter(o => o.role === selected && o.status !== 'archived').map(o => o.name.split(' ')[0]).join(', ') || '—'}
            </span>
          </p>
        </div>

        {/* Permissions matrix */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Права доступа</p>
          {allPermissions.map(perm => {
            const cfg = PERMISSION_CFG[perm];
            const Icon = cfg.icon;
            const isAdmin = selected === 'ChatAdmin';
            const hasPerm = isAdmin || editedPerms[selected]?.includes(perm);
            return (
              <button key={perm}
                onClick={() => !isAdmin && togglePerm(perm)}
                disabled={isAdmin}
                className={`flex items-center gap-4 p-3.5 rounded-xl border text-left w-full transition-all ${hasPerm ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'} ${!isAdmin ? 'cursor-pointer hover:shadow-sm active:scale-[0.98]' : 'cursor-default'}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${hasPerm ? 'bg-green-100' : 'bg-gray-100'}`}>
                  <Icon className={`w-4 h-4 ${hasPerm ? 'text-green-600' : 'text-gray-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${hasPerm ? 'text-gray-900' : 'text-gray-500'}`}>{cfg.label}</p>
                  <p className="text-xs text-gray-400">{cfg.desc}</p>
                </div>
                <div className={`w-5 h-5 rounded-md flex items-center justify-center border-2 transition-all shrink-0 ${hasPerm ? 'bg-green-500 border-green-500' : 'border-gray-300 bg-white'}`}>
                  {hasPerm && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </div>
              </button>
            );
          })}
        </div>

        {selected === 'ChatAdmin' && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
            <Info className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700">ChatAdmin обладает всеми правами без исключения. Редактирование прав этой роли недоступно.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Queues Tab ───────────────────────────────────────────────────────────────

function QueuesTab({ operators }: { operators: ManagedOperator[] }) {
  const [queues, setQueues] = useState<ChatQueue[]>(QUEUES);
  const [selected, setSelected] = useState<string>(QUEUES[0].id);
  const [editingRoles, setEditingRoles] = useState(false);
  const [draftRoles, setDraftRoles] = useState<FullRole[]>([]);

  const queue = queues.find(q => q.id === selected)!;
  const assignedOps = operators.filter(o =>
    o.status !== 'archived' && o.queues.includes(selected)
  );

  function startEdit() {
    setDraftRoles([...queue.assignedRoles]);
    setEditingRoles(true);
  }
  function saveRoles() {
    setQueues(prev => prev.map(q => q.id === selected ? { ...q, assignedRoles: draftRoles } : q));
    setEditingRoles(false);
  }
  function toggleRole(role: FullRole) {
    setDraftRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Queue list */}
      <div className="w-56 border-r border-gray-100 overflow-y-auto shrink-0">
        <div className="p-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 px-1">Очереди чатов</p>
          <div className="space-y-1">
            {queues.map(q => {
              const Icon = q.icon;
              const isActive = selected === q.id;
              return (
                <button key={q.id} onClick={() => { setSelected(q.id); setEditingRoles(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${isActive ? `${q.bg} border ${q.border}` : 'hover:bg-gray-50 border border-transparent'}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isActive ? q.bg : 'bg-gray-100'}`}>
                    <Icon className={`w-4 h-4 ${isActive ? q.color : 'text-gray-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isActive ? q.color : 'text-gray-700'}`}>{q.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs text-gray-400">{q.activeCount} акт.</span>
                      {q.pendingCount > 0 && (
                        <span className="text-xs px-1 bg-red-100 text-red-600 rounded font-medium">{q.pendingCount}</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Queue detail */}
      <div className="flex-1 overflow-y-auto p-6">
        {queue && (
          <div style={{ display: 'contents' }}>
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${queue.bg} border ${queue.border}`}>
                  <queue.icon className={`w-6 h-6 ${queue.color}`} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{queue.name}</h3>
                  <p className="text-sm text-gray-500">{queue.description}</p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: 'Активных чатов', value: queue.activeCount, color: 'text-blue-600',   bg: 'bg-blue-50' },
                { label: 'Ожидают',        value: queue.pendingCount, color: 'text-orange-600', bg: 'bg-orange-50' },
                { label: 'Операторов',     value: assignedOps.length, color: 'text-green-600',  bg: 'bg-green-50' },
              ].map((s, i) => (
                <button
                  key={i}
                  onClick={() => toast.info(s.label, { description: `${s.value} · очередь «${queue.name}»` })}
                  className={`p-3 rounded-xl ${s.bg} text-center cursor-pointer hover:shadow-md active:scale-[0.97] transition-all`}
                >
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </button>
              ))}
            </div>

            {/* Channels */}
            <div className="mb-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Каналы очереди</p>
              <div className="flex gap-2">
                {queue.channels.map(ch => (
                  <span key={ch} className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-xl border border-gray-200">
                    {ch}
                  </span>
                ))}
              </div>
            </div>

            {/* Roles */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Роли в очереди</p>
                {editingRoles ? (
                  <div className="flex gap-2">
                    <button onClick={() => setEditingRoles(false)} className="px-3 py-1 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Отмена</button>
                    <button onClick={saveRoles} className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      <Save className="w-3 h-3" />Сохранить
                    </button>
                  </div>
                ) : (
                  <button onClick={startEdit} className="flex items-center gap-1 px-3 py-1 text-xs text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50">
                    <Edit2 className="w-3 h-3" />Изменить
                  </button>
                )}
              </div>
              {editingRoles ? (
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(ROLE_CFG) as FullRole[]).map(role => {
                    const cfg = ROLE_CFG[role];
                    const active = draftRoles.includes(role);
                    return (
                      <button key={role} onClick={() => toggleRole(role)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${active ? `${cfg.bg} ${cfg.border}` : 'border-gray-200 hover:border-gray-300'}`}>
                        <div className={`w-2 h-2 rounded-full ${active ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <span className={`text-xs font-medium ${active ? cfg.color : 'text-gray-600'}`}>{cfg.label}</span>
                        {active && <Check className="w-3 h-3 ml-auto text-green-500 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {queue.assignedRoles.map(role => (
                    <RoleBadge key={role} role={role} />
                  ))}
                </div>
              )}
            </div>

            {/* Assigned operators */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Операторы в очереди ({assignedOps.length})
              </p>
              {assignedOps.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Нет назначенных операторов</p>
              ) : (
                <div className="space-y-2">
                  {assignedOps.map(op => (
                    <div key={op.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${op.status === 'online' ? 'bg-green-500' : op.status === 'blocked' ? 'bg-red-400' : 'bg-gray-400'}`}>
                        {op.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{op.name}</p>
                        <p className="text-xs text-gray-400">{ROLE_CFG[op.role].label} · {op.region}</p>
                      </div>
                      <StatusBadge status={op.status} />
                      {op.activeChats > 0 && (
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                          {op.activeChats} чат{op.activeChats > 1 ? 'а' : ''}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Audit Tab ────────────────────────────────────────────────────────────────

function AuditTab({ entries }: { entries: AuditEntry[] }) {
  const SEV_CFG = {
    info:     { color: 'text-blue-600',  bg: 'bg-blue-50',  icon: Info },
    warning:  { color: 'text-orange-600',bg: 'bg-orange-50',icon: AlertTriangle },
    critical: { color: 'text-red-600',   bg: 'bg-red-50',   icon: AlertCircle },
  };
  return (
    <div className="p-6 overflow-y-auto h-full">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Аудит-журнал действий</p>
      <div className="space-y-2">
        {entries.map(e => {
          const sev = SEV_CFG[e.severity];
          const Icon = sev.icon;
          return (
            <div key={e.id} className={`flex items-start gap-3 p-3.5 rounded-xl border ${e.severity === 'critical' ? 'bg-red-50 border-red-200' : e.severity === 'warning' ? 'bg-orange-50 border-orange-100' : 'bg-white border-gray-100'}`}>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${sev.bg}`}>
                <Icon className={`w-3.5 h-3.5 ${sev.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-semibold text-gray-800">{e.action}</span>
                  <span className="text-xs text-gray-400">→</span>
                  <span className="text-sm text-gray-700">{e.target}</span>
                </div>
                <p className="text-xs text-gray-500">{e.detail}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-400">{e.timestamp}</span>
                  <span className="text-xs text-gray-300">·</span>
                  <span className="text-xs text-gray-500">{e.actorName}</span>
                  <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">{e.actorRole}</span>
                </div>
              </div>
            </div>
          );
        })}
        {entries.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <ShieldCheck className="w-12 h-12 mx-auto mb-3 text-gray-200" />
            <p>Нет записей в журнале</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface OperatorManagementProps {
  onClose: () => void;
}

export function OperatorManagement({ onClose }: OperatorManagementProps) {
  const [activeTab, setActiveTab] = useState<'operators' | 'roles' | 'queues' | 'monitor' | 'audit'>('operators');
  const [operators, setOperators] = useState<ManagedOperator[]>(INITIAL_OPERATORS);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>(INITIAL_AUDIT);
  const [editingOp, setEditingOp] = useState<ManagedOperator | null>(null);
  const [blockingOp, setBlockingOp] = useState<ManagedOperator | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  function pushAudit(entry: AuditEntry) {
    setAuditLog(prev => [entry, ...prev]);
  }

  function handleEdit(op: ManagedOperator) {
    setEditingOp(op);
  }

  function handleSaveEdit(updated: ManagedOperator, entry: AuditEntry) {
    setOperators(prev => prev.map(o => o.id === updated.id ? updated : o));
    pushAudit(entry);
    setEditingOp(null);
  }

  function handleBlock(op: ManagedOperator) {
    setBlockingOp(op);
  }

  function handleBlockConfirm(reason: string) {
    if (!blockingOp) return;
    const isBlocking = blockingOp.status !== 'blocked';
    const newStatus: OperatorStatus = isBlocking ? 'blocked' : 'online';

    setOperators(prev => prev.map(o => o.id === blockingOp!.id
      ? { ...o, status: newStatus, activeChats: isBlocking ? 0 : o.activeChats }
      : o));

    pushAudit({
      id: `audit_${Date.now()}`, timestamp: new Date().toLocaleString('ru-RU'),
      actorName: 'Администратор Системы', actorRole: 'ChatAdmin',
      action: isBlocking ? 'Блокировка' : 'Разблокировка',
      target: blockingOp!.name,
      detail: isBlocking ? `Причина: ${reason}. Чатов переназначено: ${blockingOp!.activeChats}` : 'Доступ восстановлен',
      severity: isBlocking ? 'critical' : 'warning',
    });
    setBlockingOp(null);
  }

  function handleArchive(op: ManagedOperator) {
    setOperators(prev => prev.map(o => o.id === op.id ? { ...o, status: 'archived' } : o));
    pushAudit({
      id: `audit_${Date.now()}`, timestamp: new Date().toLocaleString('ru-RU'),
      actorName: 'Администратор Системы', actorRole: 'ChatAdmin',
      action: 'Архивирование', target: op.name, detail: 'Оператор переведён в архив',
      severity: 'warning',
    });
  }

  function handleCreate(op: ManagedOperator, entry: AuditEntry) {
    setOperators(prev => [op, ...prev]);
    pushAudit(entry);
  }

  const onlineCount = operators.filter(o => o.status === 'online').length;

  const tabs: { id: typeof activeTab; label: string; icon: React.ElementType; count?: number; danger?: boolean }[] = [
    { id: 'operators', label: 'Операторы',   icon: Users,            count: operators.filter(o => o.status !== 'archived').length },
    { id: 'monitor',   label: 'Мониторинг',  icon: Monitor, count: onlineCount },
    { id: 'roles',     label: 'Роли и права', icon: Shield },
    { id: 'queues',    label: 'Очереди',     icon: Layers,           count: QUEUES.length },
    { id: 'audit',     label: 'Аудит',       icon: History,          count: auditLog.length },
  ];

  const online = operators.filter(o => o.status === 'online').length;
  const blocked = operators.filter(o => o.status === 'blocked').length;
  const total = operators.filter(o => o.status !== 'archived').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-900 to-gray-800 rounded-t-2xl shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white text-lg">Управление операторами</h1>
              <p className="text-xs text-gray-400">Chat Admin · Полный доступ</p>
            </div>
            <div className="flex items-center gap-3 ml-4">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-900/40 border border-green-700/50 rounded-xl">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <span className="text-xs text-green-400 font-medium">{online} онлайн</span>
              </div>
              {blocked > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-900/40 border border-red-700/50 rounded-xl">
                  <Lock className="w-3 h-3 text-red-400" />
                  <span className="text-xs text-red-400 font-medium">{blocked} заблок.</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-700/40 border border-gray-600/50 rounded-xl">
                <Users className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-400 font-medium">{total} всего</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-200 bg-gray-50 shrink-0">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${isActive ? 'bg-white shadow-sm text-blue-700 border border-gray-200' : 'text-gray-600 hover:bg-white/60'}`}>
                <Icon className="w-4 h-4 shrink-0" />
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'}`}>{tab.count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'operators' && (
            <OperatorsTab
              operators={operators}
              onEdit={handleEdit}
              onBlock={handleBlock}
              onArchive={handleArchive}
              onCreate={() => setShowCreate(true)}
            />
          )}
          {activeTab === 'monitor' && <MonitoringTab operators={operators} />}
          {activeTab === 'roles' && <RolesTab operators={operators} />}
          {activeTab === 'queues' && <QueuesTab operators={operators} />}
          {activeTab === 'audit' && <AuditTab entries={auditLog} />}
        </div>
      </div>

      {/* Sub-modals — rendered at root level of this overlay */}
      {editingOp && (
        <EditOperatorModal
          op={editingOp}
          onClose={() => setEditingOp(null)}
          onSave={handleSaveEdit}
          auditLog={pushAudit}
        />
      )}
      {blockingOp && (
        <BlockConfirmModal
          op={blockingOp}
          onClose={() => setBlockingOp(null)}
          onConfirm={handleBlockConfirm}
        />
      )}
      {showCreate && (
        <CreateOperatorModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}
