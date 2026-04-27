import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { copyToClipboard } from '../../utils/clipboard';
import {
  Search, Plus, Shield, Lock, Pencil as Edit2, X, Check,
  Copy, UserCheck, ToggleLeft, ToggleRight, Download, Link2,
  Clock, Maximize2, Mail, UserMinus, AlertTriangle,
  ShieldCheck, ShieldAlert, Send, Users,
  CheckCircle2, Activity, MapPin, LogIn, Calendar, Fingerprint,
  ChevronRight, Save, Layers, Bell, Zap,
  Building2, FileText, Globe, RefreshCw,
} from 'lucide-react';
import {
  ALL_MODULES, ROLE_DEFAULT_MODULES, SCOPES, ROLE_LABELS, ROLE_COLORS,
  COLOR_BADGE, COLOR_BG, COLOR_ICON, ROLE_DESCRIPTIONS, ROLE_CAPABILITIES,
  INITIAL_USERS, type ManagedUser, type ModuleKey,
} from '../../data/rbac-data';
import { PersonalCabinet } from '../cabinet/PersonalCabinet';

// ─── helpers ─────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  active:    { label: 'Активен',     cls: 'bg-green-100 text-green-700',  dot: 'bg-green-500',  border: 'border-green-200' },
  inactive:  { label: 'Неактивен',   cls: 'bg-gray-100 text-gray-600',    dot: 'bg-gray-400',   border: 'border-gray-200' },
  suspended: { label: 'Заблокирован',cls: 'bg-red-100 text-red-700',      dot: 'bg-red-500',    border: 'border-red-200' },
  invited:   { label: 'Приглашён',   cls: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-400',   border: 'border-blue-200' },
};

const AVATAR_GRADIENTS = [
  'from-violet-500 to-purple-700',
  'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-amber-600',
  'from-rose-500 to-pink-600',
  'from-indigo-500 to-blue-700',
  'from-teal-500 to-green-600',
  'from-fuchsia-500 to-violet-600',
];

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('');
}

function getEffectiveModules(user: ManagedUser): ModuleKey[] {
  if (user.cabinetModules !== null) return user.cabinetModules;
  return ROLE_DEFAULT_MODULES[user.role] ?? [];
}

function avatarGradient(id: string) {
  const idx = parseInt(id) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[isNaN(idx) ? 0 : idx] ?? AVATAR_GRADIENTS[0];
}

interface AuditEntry {
  id: string; action: string; detail: string; time: string; actor: string;
  type: 'info' | 'warn' | 'ok' | 'danger';
}

function buildAuditLog(user: ManagedUser): AuditEntry[] {
  return [
    { id: 'a1', action: 'Вход в систему', detail: `IP: 192.168.1.42 · Chrome 121 · macOS`, time: user.lastLogin !== '—' ? user.lastLogin : '—', actor: user.name, type: 'ok' },
    { id: 'a2', action: 'Изменение роли', detail: `Роль изменена → ${ROLE_LABELS[user.role] ?? user.role}`, time: user.createdAt + ' 09:14', actor: 'Администратор Системы', type: 'info' },
    { id: 'a3', action: 'Аккаунт создан', detail: `Email: ${user.email} · Scope: ${user.scopeType}`, time: user.createdAt + ' 09:00', actor: 'Администратор Системы', type: 'info' },
  ];
}

// ─── Department config ────────────────────────────────────────────────────────

const DEPARTMENTS = [
  { value: 'tech',      label: 'Технический отдел', color: 'bg-blue-100 text-blue-700' },
  { value: 'finance',   label: 'Финансы',            color: 'bg-orange-100 text-orange-700' },
  { value: 'support',   label: 'Поддержка',          color: 'bg-green-100 text-green-700' },
  { value: 'logistics', label: 'Логистика',          color: 'bg-purple-100 text-purple-700' },
  { value: 'hr',        label: 'HR / Кадры',         color: 'bg-pink-100 text-pink-700' },
  { value: 'legal',     label: 'Юридический',        color: 'bg-teal-100 text-teal-700' },
  { value: 'ops',       label: 'Операционный',       color: 'bg-indigo-100 text-indigo-700' },
  { value: 'none',      label: 'Без отдела',         color: 'bg-gray-100 text-gray-600' },
];

const DEPT_DEFAULTS: Record<string, string> = {
  '1': 'tech', '2': 'ops', '3': 'ops', '4': 'finance',
  '5': 'support', '6': 'logistics', '7': 'ops', '8': 'none',
  '9': 'ops', '10': 'ops', '11': 'logistics', '12': 'support',
};

function DeptBadge({ dept }: { dept: string }) {
  const cfg = DEPARTMENTS.find(d => d.value === dept) ?? DEPARTMENTS[DEPARTMENTS.length - 1];
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${cfg.color}`}>{cfg.label}</span>;
}

// ─── Login history ────────────────────────────────────────────────────────────

interface UserLoginEvent { id: string; timestamp: string; ip: string; location: string; device: string; status: 'success'|'failed'|'suspicious'; twoFa: boolean; }

function genLoginHistory(): UserLoginEvent[] {
  return [
    { id:'lh1', timestamp:'14.03.2026 09:00', ip:'192.168.1.42', location:'Москва, RU', device:'Chrome 123 / macOS', status:'success', twoFa: true },
    { id:'lh2', timestamp:'13.03.2026 18:22', ip:'192.168.1.42', location:'Москва, RU', device:'Chrome 123 / macOS', status:'success', twoFa: true },
    { id:'lh3', timestamp:'12.03.2026 08:55', ip:'10.0.0.14',    location:'Москва, RU', device:'Safari / iPhone',   status:'success', twoFa: false },
    { id:'lh4', timestamp:'10.03.2026 22:01', ip:'91.234.55.12', location:'Амстердам, NL', device:'Firefox / Linux', status:'suspicious', twoFa: false },
    { id:'lh5', timestamp:'08.03.2026 07:44', ip:'192.168.1.42', location:'Москва, RU', device:'Chrome 123 / macOS', status:'success', twoFa: true },
    { id:'lh6', timestamp:'07.03.2026 17:30', ip:'192.168.1.42', location:'Москва, RU', device:'Chrome 123 / macOS', status:'failed', twoFa: false },
  ];
}

// ─── User documents ───────────────────────────────────────────────────────────

interface UserDoc { id: string; name: string; type: string; uploadedAt: string; status: 'verified'|'pending'|'expired'; }

function genDocuments(userId: string): UserDoc[] {
  return [
    { id:'d1', name:'Паспорт РФ',       type:'Удостоверение личности', uploadedAt:'15.01.2026', status:'verified' },
    { id:'d2', name:'Трудовой договор', type:'Договор',               uploadedAt:'15.01.2026', status:'verified' },
    { id:'d3', name:'NDA соглашение',   type:'Юридический',           uploadedAt:'15.01.2026', status:'verified' },
    { id:'d4', name:'Медосмотр 2026',   type:'Медицинский',           uploadedAt:'10.01.2026', status: parseInt(userId) % 3 === 0 ? 'expired' : 'verified' },
    { id:'d5', name:'ИНН / СНИЛС',      type:'Налоговый',             uploadedAt:'15.01.2026', status:'verified' },
  ];
}

const EXTRA_USERS: ManagedUser[] = [
  { id: '8',  name: 'Козлов Дмитрий',   email: 'd.kozlov@elektromik.ru',  role: 'Merchant',       scopeType: 'SELF',   scopeValue: '', status: 'active',    twoFactorEnabled: false, lastLogin: '10.02.2025 18:00', createdAt: '15.01.2025', cabinetModules: null },
  { id: '9',  name: 'Морозов Андрей',   email: 'morozov@partner.ru',      role: 'Partner',        scopeType: 'PVZ',    scopeValue: 'SPB-003', status: 'active', twoFactorEnabled: true, lastLogin: '13.02.2026 16:22', createdAt: '12.01.2026', cabinetModules: null },
  { id: '10', name: 'Волкова Ирина',    email: 'volkova@logistics.ru',    role: 'RegionalManager',scopeType: 'REGION', scopeValue: 'СПб', status: 'active', twoFactorEnabled: true, lastLogin: '14.02.2026 14:05', createdAt: '08.01.2026', cabinetModules: null },
  { id: '11', name: 'Захаров Роман',    email: 'zakharov@courier.com',    role: 'Courier',        scopeType: 'CITY',   scopeValue: 'Москва', status: 'active', twoFactorEnabled: false, lastLogin: '14.02.2026 08:30', createdAt: '20.01.2026', cabinetModules: null },
  { id: '12', name: 'Лебедева Ольга',   email: 'lebedeva@support.pvz.ru', role: 'Support',        scopeType: 'ALL',    scopeValue: '', status: 'suspended', twoFactorEnabled: false, lastLogin: '05.02.2026 11:00', createdAt: '01.02.2026', cabinetModules: null },
];

const ALL_USERS_INITIAL: ManagedUser[] = [...INITIAL_USERS, ...EXTRA_USERS];

// ─── Badge Components ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ManagedUser['status'] }) {
  const cfg = STATUS_CFG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.cls} ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{cfg.label}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  const color = ROLE_COLORS[role] ?? 'blue';
  const badge = COLOR_BADGE[color] ?? COLOR_BADGE.blue;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${badge}`}>
      <Shield className="w-3 h-3" />{ROLE_LABELS[role] ?? role}
    </span>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

function ConfirmDialog({ title, message, confirmLabel, confirmCls, onConfirm, onCancel }: {
  title: string; message: string; confirmLabel: string; confirmCls?: string;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 mt-1">{message}</p>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={onCancel} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Отмена</button>
          <button onClick={onConfirm} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${confirmCls ?? 'bg-red-600 hover:bg-red-700'}`}>{confirmLabel}</button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Change Role Modal ────────────────────────────────────────────────────────

function ChangeRoleModal({ user, onSave, onClose }: {
  user: ManagedUser;
  onSave: (role: string, scope: string, scopeVal: string) => void;
  onClose: () => void;
}) {
  const [role, setRole] = useState(user.role);
  const [scopeType, setScopeType] = useState(user.scopeType);
  const [scopeValue, setScopeValue] = useState(user.scopeValue);

  const color = ROLE_COLORS[role] ?? 'blue';
  const bgCls = COLOR_BG[color] ?? COLOR_BG.blue;
  const icCls = COLOR_ICON[color] ?? COLOR_ICON.blue;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 10 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900">Изменить роль</h2>
            <p className="text-xs text-gray-400 mt-0.5">{user.name} · {user.email}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Выберите роль</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(ROLE_LABELS).map(([key, label]) => {
                const c = ROLE_COLORS[key] ?? 'blue';
                const ic = COLOR_ICON[c] ?? COLOR_ICON.blue;
                const isActive = role === key;
                return (
                  <button key={key} onClick={() => setRole(key)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 text-left transition-all ${isActive ? `border-blue-400 bg-blue-50` : 'border-gray-100 hover:border-gray-200 bg-gray-50'}`}>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isActive ? ic : 'bg-gray-200 text-gray-400'}`}>
                      <Shield className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-semibold truncate ${isActive ? 'text-blue-800' : 'text-gray-700'}`}>{label}</p>
                      <p className="text-[10px] text-gray-400 font-mono">{key}</p>
                    </div>
                    {isActive && <CheckCircle2 className="w-4 h-4 ml-auto shrink-0 text-blue-600" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={`rounded-xl border p-4 ${bgCls}`}>
            <p className="font-semibold text-sm text-gray-900 mb-1">{ROLE_LABELS[role] ?? role}</p>
            <p className="text-xs text-gray-600">{ROLE_DESCRIPTIONS[role] ?? ''}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5 block">Scope</label>
              <select value={scopeType} onChange={e => setScopeType(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {SCOPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            {scopeType !== 'ALL' && scopeType !== 'SELF' && (
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5 block">Объект</label>
                <input value={scopeValue} onChange={e => setScopeValue(e.target.value)}
                  placeholder={scopeType === 'PVZ' ? 'MSK-001' : 'Москва'}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Отмена</button>
          <button onClick={() => { onSave(role, scopeType, scopeValue); onClose(); }}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
            <Save className="w-4 h-4" />Сохранить роль
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Send Email Modal ─────────────────────────────────────────────────────────

function SendEmailModal({ user, onClose }: { user: ManagedUser; onClose: () => void }) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sent, setSent] = useState(false);

  const templates = [
    { label: 'Настроить 2FA',     s: 'Настройка двухфакторной аутентификации',           b: `Уважаемый(ая) ${user.name.split(' ')[0]},\n\nПросим настроить 2FA в течение 3 дней.\nВойдите в кабинет → Настройки → Безопасность → 2FA.\n\nС уважением,\nАдминистрация платформы` },
    { label: 'Обновить пароль',   s: 'Обновите пароль к вашему аккаунту',                b: `Уважаемый(ая) ${user.name.split(' ')[0]},\n\nВ соответствии с политикой безопасности обновите пароль в течение 3 дней.\n\nС уважением,\nАдминистрация платформы` },
    { label: 'Уведомление о роли',s: `Ваша роль: ${ROLE_LABELS[user.role] ?? user.role}`,b: `Уважаемый(ая) ${user.name.split(' ')[0]},\n\nВаша роль — «${ROLE_LABELS[user.role]}». Scope: ${user.scopeType}${user.scopeValue ? ' · ' + user.scopeValue : ''}.\n\nС уважением,\nАдминистрация платформы` },
    { label: 'Предупреждение',    s: 'Важное уведомление о вашем аккаунте',              b: `Уважаемый(ая) ${user.name.split(' ')[0]},\n\nПросим ознакомиться с обновлёнными правилами в личном кабинете.\n\nС уважением,\nАдминистрация платформы` },
  ];

  const handleSend = () => {
    if (!subject.trim()) { toast.error('Укажите тему письма'); return; }
    if (!body.trim()) { toast.error('Введите текст письма'); return; }
    setSent(true);
    setTimeout(() => { toast.success(`Письмо отправлено → ${user.email}`); onClose(); }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 10 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg"
        onClick={e => e.stopPropagation()}
      >
        {sent ? (
          <div className="p-12 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 14 }}
              className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </motion.div>
            <p className="font-bold text-gray-900 text-lg">Письмо отправлено!</p>
            <p className="text-sm text-gray-400 mt-1">{user.email}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Mail className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 text-sm">Отправить письмо</h2>
                  <p className="text-xs text-gray-400">{user.name} · {user.email}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Шаблоны</p>
                <div className="flex flex-wrap gap-2">
                  {templates.map(t => (
                    <button key={t.label} onClick={() => { setSubject(t.s); setBody(t.b); }}
                      className="px-3 py-1.5 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium transition-colors">
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Кому</label>
                <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
                  <div className={`w-6 h-6 bg-gradient-to-br ${avatarGradient(user.id)} rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                    {initials(user.name)}
                  </div>
                  <span className="text-sm text-gray-700">{user.name}</span>
                  <span className="text-gray-400">·</span>
                  <span className="text-sm text-blue-600">{user.email}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Тема *</label>
                <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Тема письма..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Текст *</label>
                <textarea value={body} onChange={e => setBody(e.target.value)} rows={6} placeholder="Текст письма..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">Отмена</button>
              <button onClick={handleSend}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
                <Send className="w-4 h-4" />Отправить
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

// ─── Add / Edit User Modal ────────────────────────────────────────────────────

function AddEditModal({ mode, user, onSave, onClose }: {
  mode: 'add' | 'edit'; user?: ManagedUser | null;
  onSave: (data: Partial<ManagedUser> & { mode: 'add' | 'edit' }) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: user?.name ?? '', email: user?.email ?? '',
    role: user?.role ?? 'PVZOperator', scopeType: user?.scopeType ?? 'PVZ',
    scopeValue: user?.scopeValue ?? '',
    status: user?.status ?? ('active' as ManagedUser['status']),
    twoFactorEnabled: user?.twoFactorEnabled ?? false,
    notes: user?.notes ?? '',
    useRoleDefaults: user?.cabinetModules === null || !user,
    cabinetModules: [...(user?.cabinetModules ?? ROLE_DEFAULT_MODULES['PVZOperator'] ?? [])] as ModuleKey[],
  });
  const [step, setStep] = useState<'form' | 'done'>('form');
  const [inviteLink, setInviteLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  const color = ROLE_COLORS[form.role] ?? 'blue';
  const bgCls = COLOR_BG[color] ?? COLOR_BG.blue;

  function handleRoleChange(role: string) {
    setForm(f => ({ ...f, role, cabinetModules: [...(ROLE_DEFAULT_MODULES[role] ?? [])], useRoleDefaults: true }));
  }

  function handleSubmit() {
    if (!form.name.trim()) { toast.error('Введите имя пользователя'); return; }
    if (!form.email.trim() || !form.email.includes('@')) { toast.error('Введите корректный email'); return; }
    const finalModules = form.useRoleDefaults ? null : form.cabinetModules;
    onSave({ mode, ...form, cabinetModules: finalModules });
    if (mode === 'add') {
      const token = Math.random().toString(36).slice(2, 10).toUpperCase();
      setInviteLink(`https://platform.pvz.ru/invite?token=${token}&email=${encodeURIComponent(form.email)}&role=${form.role}`);
      setStep('done');
    } else {
      toast.success('Данные пользователя обновлены');
      onClose();
    }
  }

  function copyLink() {
    copyToClipboard(inviteLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 10 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="font-bold text-gray-900">{mode === 'add' ? 'Добавить пользователя' : `Редактировать: ${user?.name}`}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{mode === 'add' ? 'Заполните данные и отправьте приглашение' : 'Обновите данные пользователя'}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {step === 'done' ? (
            <div className="p-8 space-y-5">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="font-bold text-gray-900 text-lg">Пользователь добавлен!</h3>
                <p className="text-sm text-gray-500 mt-1">Ссылка-приглашение создана. Отправьте её сотруднику.</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
                <p className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2"><Zap className="w-4 h-4" />После перехода по ссылке:</p>
                <div className="space-y-2">
                  {[`Сотрудник создаёт пароль для ${form.email}`, 'Настройка 2FA (Google Authenticator)', `Роль «${ROLE_LABELS[form.role]}» · Scope: ${form.scopeType}${form.scopeValue ? ' → ' + form.scopeValue : ''}`, `${form.useRoleDefaults ? 'Стандартные разделы роли' : form.cabinetModules.length + ' кастомных разделов'}`, 'Вы получите уведомление о первом входе'].map((s, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{i + 1}</div>
                      <p className="text-sm text-blue-800">{s}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2"><Link2 className="w-4 h-4 text-blue-600" />Ссылка для регистрации</p>
                <div className="flex gap-2">
                  <div className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-mono text-xs text-gray-700 overflow-x-auto whitespace-nowrap">{inviteLink}</div>
                  <button onClick={copyLink}
                    className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shrink-0 transition-all ${linkCopied ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                    {linkCopied ? <><Check className="w-4 h-4" />Скопировано</> : <><Copy className="w-4 h-4" />Копировать</>}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1.5"><Clock className="w-3 h-3" />Ссылка активна 72 часа</p>
              </div>
              <button onClick={onClose} className="w-full py-3 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl font-medium transition-colors">Закрыть</button>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              <section>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">1</span>Данные пользователя
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Имя и фамилия *</label>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Иванов Иван Иванович"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email *</label>
                    <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="user@platform.com"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  {mode === 'edit' && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">Статус</label>
                      <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as ManagedUser['status'] }))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="active">Активен</option><option value="inactive">Неактивен</option>
                        <option value="suspended">Заблокирован</option><option value="invited">Приглашён</option>
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Заметки</label>
                    <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Дополнительная информация"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Отдел</label>
                    <select value={(form as any).department ?? 'none'} onChange={e => setForm(f => ({ ...f, department: e.target.value } as any))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {DEPARTMENTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer pb-2">
                      <input type="checkbox" checked={form.twoFactorEnabled} onChange={e => setForm(f => ({ ...f, twoFactorEnabled: e.target.checked }))} className="w-4 h-4 rounded accent-blue-600" />
                      <span className="text-sm text-gray-700">Обязательная 2FA</span>
                    </label>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">2</span>Роль и область доступа
                </h3>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Роль *</label>
                    <select value={form.role} onChange={e => handleRoleChange(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Scope</label>
                    <select value={form.scopeType} onChange={e => setForm(f => ({ ...f, scopeType: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {SCOPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className={`rounded-xl border p-3 ${bgCls}`}>
                  <p className="text-xs font-semibold text-gray-800">{ROLE_LABELS[form.role] ?? form.role}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{ROLE_DESCRIPTIONS[form.role] ?? ''}</p>
                </div>
                {form.scopeType !== 'ALL' && form.scopeType !== 'SELF' && (
                  <div className="mt-3">
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Объект ({form.scopeType})</label>
                    <input value={form.scopeValue} onChange={e => setForm(f => ({ ...f, scopeValue: e.target.value }))}
                      placeholder={form.scopeType === 'PVZ' ? 'MSK-001' : 'Москва'}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                )}
              </section>

              <section>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-2">
                  <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">3</span>Личный кабинет — разделы
                </h3>
                <p className="text-xs text-gray-400 mb-3 ml-7">Какие страницы увидит пользователь после входа</p>
                <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl mb-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{form.useRoleDefaults ? 'По умолчанию роли' : 'Кастомный набор'}</p>
                    <p className="text-xs text-gray-400">{form.useRoleDefaults ? `${ROLE_DEFAULT_MODULES[form.role]?.length ?? 0} разделов автоматически` : `${form.cabinetModules.length} разделов вручную`}</p>
                  </div>
                  <button onClick={() => setForm(f => ({ ...f, useRoleDefaults: !f.useRoleDefaults }))}
                    className={`relative w-12 h-6 rounded-full transition-colors ${form.useRoleDefaults ? 'bg-gray-300' : 'bg-blue-600'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.useRoleDefaults ? 'left-1' : 'left-7'}`} />
                  </button>
                </div>
                <div className={`transition-opacity ${form.useRoleDefaults ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="grid grid-cols-3 gap-2">
                    {ALL_MODULES.map(mod => {
                      const active = (form.useRoleDefaults ? (ROLE_DEFAULT_MODULES[form.role] ?? []) : form.cabinetModules).includes(mod.key as ModuleKey);
                      const Icon = mod.icon;
                      return (
                        <button key={mod.key}
                          onClick={() => { if (form.useRoleDefaults) return; const cur = form.cabinetModules; setForm(f => ({ ...f, cabinetModules: active ? cur.filter(k => k !== mod.key) : [...cur, mod.key as ModuleKey] })); }}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-xs transition-all ${active ? 'border-blue-400 bg-blue-50 text-blue-800' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'}`}>
                          <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-blue-600' : 'text-gray-400'}`} />
                          <span className="truncate flex-1 text-left">{mod.label}</span>
                          {active ? <Check className="w-3 h-3 text-blue-600 shrink-0" /> : <div className="w-3 h-3 rounded border-2 border-gray-300 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>

        {step !== 'done' && (
          <div className="flex gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
            <button onClick={onClose} className="px-6 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">Отмена</button>
            <button onClick={handleSubmit} disabled={!form.name.trim() || !form.email.trim()}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-white rounded-xl font-semibold flex items-center justify-center gap-2 text-sm transition-colors">
              <UserCheck className="w-4 h-4" />{mode === 'add' ? 'Создать и отправить приглашение' : 'Сохранить изменения'}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── User Detail Panel (NO own modals — all lifted to UsersList) ───────────────

interface DetailPanelProps {
  user: ManagedUser;
  onClose: () => void;
  onOpenChangeRole: () => void;
  onOpenSendEmail: () => void;
  onOpenRequest2FA: () => void;
  onOpenBlock: () => void;
  onOpenDelete: () => void;
  onEdit: () => void;
  onPreview: () => void;
}

function UserDetailPanel({ user, onClose, onOpenChangeRole, onOpenSendEmail, onOpenRequest2FA, onOpenBlock, onOpenDelete, onEdit, onPreview }: DetailPanelProps) {
  const [tab, setTab] = useState<'overview' | 'access' | 'dept' | 'history' | 'docs'>('overview');
  const mods = getEffectiveModules(user);
  const isCustom = user.cabinetModules !== null;
  const auditLog = useMemo(() => buildAuditLog(user), [user.id]);
  const loginHistory = useMemo(() => genLoginHistory(), [user.id]);
  const documents = useMemo(() => genDocuments(user.id), [user.id]);
  const dept = DEPT_DEFAULTS[user.id] ?? 'none';

  const TABS = [
    { id: 'overview' as const,  label: 'Обзор',    icon: Users },
    { id: 'access' as const,    label: 'Доступы',  icon: Shield },
    { id: 'dept' as const,      label: 'Отдел',    icon: Building2 },
    { id: 'history' as const,   label: 'Входы',    icon: LogIn },
    { id: 'docs' as const,      label: 'Документы',icon: FileText },
  ];

  const auditTypeCfg = {
    ok:     { bg: 'bg-green-50',  ic: CheckCircle2, tc: 'text-green-600' },
    info:   { bg: 'bg-blue-50',   ic: Bell,         tc: 'text-blue-600' },
    warn:   { bg: 'bg-orange-50', ic: AlertTriangle, tc: 'text-orange-600' },
    danger: { bg: 'bg-red-50',    ic: ShieldAlert,  tc: 'text-red-600' },
  };

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Header gradient */}
      <div className={`relative px-5 pt-5 pb-4 bg-gradient-to-br ${avatarGradient(user.id)} shrink-0`}>
        <button onClick={onClose} className="absolute top-3 right-3 w-7 h-7 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors">
          <X className="w-3.5 h-3.5 text-white" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 bg-white/25 rounded-2xl flex items-center justify-center text-white text-xl font-bold shrink-0 border-2 border-white/40">
            {initials(user.name)}
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold text-base leading-tight truncate">{user.name}</p>
            <p className="text-white/80 text-xs mt-0.5 truncate">{user.email}</p>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full font-medium">{ROLE_LABELS[user.role] ?? user.role}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CFG[user.status].cls}`}>{STATUS_CFG[user.status].label}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick action bar — all call parent callbacks, NO internal modals */}
      <div className="flex items-center gap-1 px-4 py-2.5 border-b border-gray-100 bg-white shrink-0">
        {[
          { icon: Shield,      label: 'Роль',     fn: onOpenChangeRole, hover: 'hover:bg-blue-50 group-hover:text-blue-600' },
          { icon: Mail,        label: 'Письмо',   fn: onOpenSendEmail,  hover: 'hover:bg-purple-50 group-hover:text-purple-600' },
          { icon: Fingerprint, label: '2FA',      fn: onOpenRequest2FA, hover: 'hover:bg-emerald-50 group-hover:text-emerald-600' },
          { icon: Edit2,       label: 'Изменить', fn: onEdit,           hover: 'hover:bg-gray-100 group-hover:text-gray-700' },
          { icon: Maximize2,   label: 'Кабинет',  fn: onPreview,        hover: 'hover:bg-indigo-50 group-hover:text-indigo-600' },
        ].map(({ icon: Icon, label, fn, hover }) => (
          <button key={label} onClick={fn} className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl transition-colors group ${hover}`}>
            <Icon className="w-4 h-4 text-gray-400 group-hover:inherit" />
            <span className="text-[10px] text-gray-400 font-medium">{label}</span>
          </button>
        ))}
        <button onClick={onOpenBlock} className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl hover:bg-orange-50 transition-colors group">
          {user.status === 'suspended' ? <ToggleLeft className="w-4 h-4 text-orange-500" /> : <ToggleRight className="w-4 h-4 text-gray-400 group-hover:text-orange-600" />}
          <span className="text-[10px] text-gray-400 font-medium">{user.status === 'suspended' ? 'Разблок.' : 'Блок.'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-gray-100 px-4 shrink-0 bg-white">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-3 text-xs font-semibold border-b-2 transition-colors ${active ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
              <Icon className="w-3.5 h-3.5" />{t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'overview' && (
          <div className="p-4 space-y-3">
            <div className="space-y-1.5">
              {[
                { icon: Mail,     label: 'Email',          value: user.email },
                { icon: Calendar, label: 'Создан',         value: user.createdAt },
                { icon: LogIn,    label: 'Последний вход', value: user.lastLogin },
                { icon: MapPin,   label: 'Scope',          value: `${user.scopeType}${user.scopeValue ? ' · ' + user.scopeValue : ''}` },
                { icon: Lock,     label: '2FA',            value: user.twoFactorEnabled ? '✓ Включена' : '✗ Отключена', color: user.twoFactorEnabled ? 'text-green-600' : 'text-red-600' },
              ].map(row => {
                const Icon = row.icon;
                return (
                  <div key={row.label} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="w-7 h-7 bg-white rounded-lg border border-gray-200 flex items-center justify-center shrink-0">
                      <Icon className="w-3.5 h-3.5 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">{row.label}</p>
                      <p className={`text-xs font-medium truncate ${(row as any).color ?? 'text-gray-800'}`}>{row.value}</p>
                    </div>
                  </div>
                );
              })}
              {user.notes && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-[10px] text-amber-600 uppercase tracking-wide mb-0.5">Заметка</p>
                  <p className="text-xs text-amber-800">{user.notes}</p>
                </div>
              )}
            </div>

            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Возможности роли</p>
              <div className="space-y-1">
                {(ROLE_CAPABILITIES[user.role] ?? []).map((cap, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-gray-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />{cap}
                  </div>
                ))}
              </div>
            </div>

            {!user.twoFactorEnabled && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-red-700">Не настроена — риск безопасности</p>
                  <button onClick={onOpenRequest2FA} className="text-xs text-red-600 underline mt-0.5 hover:text-red-800">Запросить 2FA</button>
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-gray-100">
              <button onClick={onOpenDelete}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-red-600 hover:bg-red-50 rounded-xl text-xs font-semibold transition-colors border border-red-200">
                <UserMinus className="w-3.5 h-3.5" />Убрать из команды
              </button>
            </div>
          </div>
        )}

        {tab === 'access' && (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-gray-700">Разделы личного кабинета</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isCustom ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                {isCustom ? 'Custom' : 'По роли'}
              </span>
            </div>
            <p className="text-xs text-gray-400">{mods.length} из {ALL_MODULES.length} разделов доступно</p>
            <div className="grid grid-cols-2 gap-1.5">
              {ALL_MODULES.map(mod => {
                const active = mods.includes(mod.key as ModuleKey);
                const Icon = mod.icon;
                return (
                  <div key={mod.key} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs border ${active ? 'border-blue-200 bg-blue-50' : 'border-gray-100 bg-gray-50 opacity-50'}`}>
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span className={`truncate ${active ? 'text-blue-800 font-medium' : 'text-gray-500'}`}>{mod.label}</span>
                    {active && <Check className="w-3 h-3 text-blue-500 ml-auto shrink-0" />}
                  </div>
                );
              })}
            </div>
            <button onClick={onEdit}
              className="w-full py-2.5 border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />Настроить разделы
            </button>
          </div>
        )}

        {tab === 'audit' && (
          <div className="p-4 space-y-2">
            <p className="text-xs font-bold text-gray-700 mb-3">Последние события</p>
            {auditLog.map(entry => {
              const cfg = auditTypeCfg[entry.type];
              const Icon = cfg.ic;
              return (
                <div key={entry.id} className={`p-3 rounded-xl ${cfg.bg}`}>
                  <div className="flex items-start gap-2">
                    <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${cfg.tc}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold ${cfg.tc}`}>{entry.action}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{entry.detail}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-gray-400">{entry.time}</span>
                        <span className="text-[10px] text-gray-400">· {entry.actor}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-center">
              <p className="text-xs text-gray-400">Полный аудит-лог доступен в</p>
              <button className="text-xs text-blue-600 font-medium hover:underline">Журнале безопасности →</button>
            </div>
          </div>
        )}

        {tab === 'dept' && (
          <div className="p-4 space-y-4">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Текущий отдел</p>
              <DeptBadge dept={dept} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Сменить отдел</p>
              <div className="grid grid-cols-2 gap-1.5">
                {DEPARTMENTS.map(d => (
                  <button key={d.value}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-xs transition-all text-left ${dept === d.value ? 'border-blue-400 bg-blue-50' : 'border-gray-100 hover:border-gray-200 bg-gray-50'}`}
                    onClick={() => { toast.success(`Отдел изменён: ${d.label}`); }}>
                    <Building2 className={`w-3.5 h-3.5 shrink-0 ${dept === d.value ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span className={`font-medium truncate ${dept === d.value ? 'text-blue-800' : 'text-gray-700'}`}>{d.label}</span>
                    {dept === d.value && <CheckCircle2 className="w-3 h-3 text-blue-600 ml-auto shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">Информация</p>
              <div className="space-y-1">
                <p className="text-xs text-gray-600"><span className="font-medium">Руководитель:</span> Иванов Иван (RegionalManager)</p>
                <p className="text-xs text-gray-600"><span className="font-medium">Команда:</span> 8 человек</p>
                <p className="text-xs text-gray-600"><span className="font-medium">Смена:</span> Утренняя (08:00–20:00)</p>
              </div>
            </div>
          </div>
        )}

        {tab === 'history' && (
          <div className="p-4 space-y-2">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-gray-700">История входов</p>
              <button className="text-[10px] text-blue-600 hover:underline flex items-center gap-1">
                <RefreshCw className="w-3 h-3" />Обновить
              </button>
            </div>
            {loginHistory.map(event => {
              const statusCfg = {
                success:    { dot: 'bg-green-500', text: 'text-green-700', label: 'Успешно' },
                failed:     { dot: 'bg-red-500',   text: 'text-red-700',   label: 'Ошибка' },
                suspicious: { dot: 'bg-orange-500',text: 'text-orange-700',label: 'Подозрит.' },
              }[event.status];
              return (
                <div key={event.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                  <div className="flex items-start gap-2">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${statusCfg.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-xs font-semibold ${statusCfg.text}`}>{statusCfg.label}</p>
                        {event.twoFa && <span className="text-[9px] font-bold px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">2FA</span>}
                        <span className="text-[10px] text-gray-400 ml-auto">{event.timestamp}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-3 mt-0.5">
                        <span className="text-[10px] text-gray-500 font-mono">{event.ip}</span>
                        <span className="text-[10px] text-gray-500 flex items-center gap-0.5"><Globe className="w-2.5 h-2.5" />{event.location}</span>
                        <span className="text-[10px] text-gray-500">{event.device}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'docs' && (
          <div className="p-4 space-y-2">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-gray-700">Связанные документы</p>
              <button className="text-[10px] text-blue-600 hover:underline flex items-center gap-1">
                <Activity className="w-3 h-3" />Запросить
              </button>
            </div>
            {documents.map(doc => {
              const cfg = {
                verified: { badge: 'bg-green-100 text-green-700', label: 'Верифицирован', icon: CheckCircle2 },
                pending:  { badge: 'bg-yellow-100 text-yellow-700', label: 'На проверке',  icon: Clock },
                expired:  { badge: 'bg-red-100 text-red-700',       label: 'Истёк',        icon: AlertTriangle },
              }[doc.status];
              const CfgIcon = cfg.icon;
              return (
                <div key={doc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                  <div className="w-8 h-8 bg-white rounded-lg border border-gray-200 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{doc.name}</p>
                    <p className="text-[10px] text-gray-400">{doc.type} · {doc.uploadedAt}</p>
                  </div>
                  <span className={`shrink-0 flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                    <CfgIcon className="w-3 h-3" />{cfg.label}
                  </span>
                </div>
              );
            })}
            <button className="w-full py-2.5 border-2 border-dashed border-gray-300 hover:border-blue-400 text-gray-500 hover:text-blue-600 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />Загрузить документ
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function UsersList() {
  const [users, setUsers] = useState<ManagedUser[]>(ALL_USERS_INITIAL);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [addEditModal, setAddEditModal] = useState<{ mode: 'add' | 'edit'; user?: ManagedUser } | null>(null);
  const [cabinetPreview, setCabinetPreview] = useState<ManagedUser | null>(null);

  // Modal states — all at root level to avoid transform clipping
  const [roleModal, setRoleModal] = useState<ManagedUser | null>(null);
  const [emailModal, setEmailModal] = useState<ManagedUser | null>(null);
  const [request2FAModal, setRequest2FAModal] = useState<ManagedUser | null>(null);
  const [blockModal, setBlockModal] = useState<ManagedUser | null>(null);
  const [deleteModal, setDeleteModal] = useState<ManagedUser | null>(null);

  // Always read live data
  const selectedUser = selectedUserId ? users.find(u => u.id === selectedUserId) ?? null : null;

  const filtered = useMemo(() => users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const matchStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchSearch && matchRole && matchStatus;
  }), [users, search, roleFilter, statusFilter]);

  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    invited: users.filter(u => u.status === 'invited').length,
    twofa: users.filter(u => u.twoFactorEnabled).length,
    suspended: users.filter(u => u.status === 'suspended').length,
  }), [users]);

  function changeRole(userId: string, role: string, scopeType: string, scopeValue: string) {
    setUsers(p => p.map(u => u.id === userId ? { ...u, role, scopeType, scopeValue } : u));
  }
  function toggle2FA(userId: string) {
    setUsers(p => p.map(u => u.id === userId ? { ...u, twoFactorEnabled: !u.twoFactorEnabled } : u));
  }
  function toggleStatus(userId: string) {
    setUsers(p => p.map(u => u.id === userId ? { ...u, status: u.status === 'suspended' ? 'active' : 'suspended' } : u));
  }
  function deleteUser(userId: string) {
    setUsers(p => p.filter(u => u.id !== userId));
    if (selectedUserId === userId) setSelectedUserId(null);
  }
  function handleSaveUser(data: Partial<ManagedUser> & { mode: 'add' | 'edit' }) {
    const { mode, ...rest } = data;
    if (mode === 'add') {
      setUsers(p => [...p, {
        id: String(Date.now()), name: rest.name ?? '', email: rest.email ?? '',
        role: rest.role ?? 'PVZOperator', scopeType: rest.scopeType ?? 'PVZ',
        scopeValue: rest.scopeValue ?? '', status: 'invited',
        twoFactorEnabled: rest.twoFactorEnabled ?? false,
        lastLogin: '—', createdAt: new Date().toLocaleDateString('ru-RU'),
        cabinetModules: rest.cabinetModules ?? null, notes: rest.notes ?? '',
      }]);
    } else if (addEditModal?.user) {
      setUsers(p => p.map(u => u.id === addEditModal.user!.id ? { ...u, ...rest } : u));
    }
  }

  const statCards = [
    { label: 'Всего',        val: stats.total,     color: 'text-gray-900',   icon: Users,        bg: 'bg-gray-50 border-gray-200',     filterStatus: null as string | null },
    { label: 'Активных',     val: stats.active,    color: 'text-green-700',  icon: CheckCircle2, bg: 'bg-green-50 border-green-200',   filterStatus: 'active' },
    { label: 'Приглашены',   val: stats.invited,   color: 'text-blue-700',   icon: Send,         bg: 'bg-blue-50 border-blue-200',     filterStatus: 'invited' },
    { label: 'С 2FA',        val: stats.twofa,     color: 'text-purple-700', icon: ShieldCheck,  bg: 'bg-purple-50 border-purple-200', filterStatus: null },
    { label: 'Заблокировано',val: stats.suspended, color: 'text-red-700',    icon: ShieldAlert,  bg: 'bg-red-50 border-red-200',       filterStatus: 'suspended' },
  ];

  return (
    <div className="flex flex-col h-full min-h-0" style={{ height: 'calc(100vh - 64px)' }}>
      {/* ── Top bar ── */}
      <div className="px-6 py-5 border-b border-gray-100 bg-white shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Пользователи</h1>
            <p className="text-sm text-gray-400 mt-0.5">Управление доступом и личными кабинетами · {stats.total} сотрудников</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                // Frontend CSV export of currently filtered users.
                const rows = filtered;
                if (rows.length === 0) {
                  toast.info('Нет пользователей для экспорта');
                  return;
                }
                const headers = ['ID', 'Email', 'Имя', 'Роль', 'Статус', 'Отдел', 'Последний вход'];
                const csv = [
                  headers.join(','),
                  ...rows.map(u => [
                    u.id, u.email, u.name, u.role, u.status, (u as any).department ?? '', (u as any).lastLogin ?? '',
                  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')),
                ].join('\n');
                const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
                document.body.appendChild(a); a.click(); a.remove();
                URL.revokeObjectURL(url);
                toast.success(`Экспортировано: ${rows.length} пользователей`);
              }}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <Download className="w-4 h-4" />Экспорт
            </button>
            <button onClick={() => setAddEditModal({ mode: 'add' })}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors shadow-sm">
              <Plus className="w-4 h-4" />Добавить пользователя
            </button>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-3 mb-4">
          {statCards.map(s => {
            const Icon = s.icon;
            const isActive = s.filterStatus !== null && statusFilter === s.filterStatus;
            return (
              <button
                key={s.label}
                onClick={() => {
                  if (!s.filterStatus) return;
                  setStatusFilter((statusFilter === s.filterStatus ? 'all' : s.filterStatus) as any);
                }}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${s.bg} ${s.filterStatus ? 'cursor-pointer hover:shadow-md active:scale-[0.97]' : 'cursor-default'} ${isActive ? 'ring-2 ring-offset-1 shadow-sm' : ''}`}
              >
                <div className="w-8 h-8 bg-white rounded-lg border border-white/60 flex items-center justify-center shrink-0 shadow-sm">
                  <Icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <div>
                  <p className={`text-xl font-bold ${s.color}`}>{s.val}</p>
                  <p className="text-[10px] text-gray-500">{s.label}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-52 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по имени или email..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
          </div>
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700">
            <option value="all">Все роли</option>
            {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700">
            <option value="all">Все статусы</option>
            <option value="active">Активен</option><option value="invited">Приглашён</option>
            <option value="inactive">Неактивен</option><option value="suspended">Заблокирован</option>
          </select>
          {(search || roleFilter !== 'all' || statusFilter !== 'all') && (
            <button onClick={() => { setSearch(''); setRoleFilter('all'); setStatusFilter('all'); }}
              className="px-4 py-2.5 border border-orange-200 bg-orange-50 text-orange-700 rounded-xl text-sm font-medium hover:bg-orange-100 transition-colors flex items-center gap-1.5">
              <X className="w-3.5 h-3.5" />Сбросить
            </button>
          )}
        </div>
      </div>

      {/* ── Main: table + detail panel ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
              <tr>
                {['Пользователь', 'Роль', 'Отдел', 'Scope', 'Кабинет', 'Статус', '2FA', 'Последний вход', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-12 text-center">
                  <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 font-medium">Пользователи не найдены</p>
                </td></tr>
              ) : filtered.map(user => {
                const sc = STATUS_CFG[user.status];
                const mods = getEffectiveModules(user);
                const isCustom = user.cabinetModules !== null;
                const isSelected = selectedUserId === user.id;
                return (
                  <tr key={user.id} onClick={() => setSelectedUserId(isSelected ? null : user.id)}
                    className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/80' : 'hover:bg-gray-50/70'}`}
                    style={isSelected ? { borderLeft: '3px solid #2563eb' } : {}}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 bg-gradient-to-br ${avatarGradient(user.id)} rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0`}>
                          {initials(user.name)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{user.name}</p>
                          <p className="text-xs text-gray-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4"><RoleBadge role={user.role} /></td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-gray-700 font-medium">{user.scopeType}</p>
                      {user.scopeValue && <p className="text-xs text-gray-400">{user.scopeValue}</p>}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        {mods.slice(0, 3).map(mk => { const mod = ALL_MODULES.find(m => m.key === mk); if (!mod) return null; const Icon = mod.icon; return <Icon key={mk} className="w-3.5 h-3.5 text-gray-400" />; })}
                        {mods.length > 3 && <span className="text-[10px] text-gray-400">+{mods.length - 3}</span>}
                        {isCustom ? <span className="ml-1 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold">custom</span>
                          : <span className="ml-1 text-[10px] text-gray-400">default</span>}
                      </div>
                    </td>
                    <td className="px-5 py-4"><StatusBadge status={user.status} /></td>
                    <td className="px-5 py-4">
                      {user.twoFactorEnabled
                        ? <span className="flex items-center gap-1 text-green-600 text-xs font-semibold"><Lock className="w-3.5 h-3.5" />Вкл</span>
                        : <span className="flex items-center gap-1 text-red-400 text-xs font-medium"><ShieldAlert className="w-3.5 h-3.5" />Выкл</span>}
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-500 whitespace-nowrap">{user.lastLogin}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-0.5 justify-end" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setAddEditModal({ mode: 'edit', user })} title="Редактировать" className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setEmailModal(user)} title="Письмо" className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"><Mail className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setCabinetPreview(user)} title="Кабинет" className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Maximize2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setSelectedUserId(isSelected ? null : user.id)} title="Детали"
                          className={`p-1.5 rounded-lg transition-colors ${isSelected ? 'text-blue-600 bg-blue-100' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`}>
                          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isSelected ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Detail panel — NO overflow-hidden on motion.div, just border */}
        <AnimatePresence>
          {selectedUser && (
            <motion.div
              key={selectedUser.id}
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 340, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="border-l border-gray-200 bg-white shrink-0"
              style={{ minWidth: 340, maxWidth: 340 }}
            >
              <UserDetailPanel
                user={selectedUser}
                onClose={() => setSelectedUserId(null)}
                onOpenChangeRole={() => setRoleModal(selectedUser)}
                onOpenSendEmail={() => setEmailModal(selectedUser)}
                onOpenRequest2FA={() => setRequest2FAModal(selectedUser)}
                onOpenBlock={() => setBlockModal(selectedUser)}
                onOpenDelete={() => setDeleteModal(selectedUser)}
                onEdit={() => setAddEditModal({ mode: 'edit', user: selectedUser })}
                onPreview={() => setCabinetPreview(selectedUser)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Security notice */}
      <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 shrink-0">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Shield className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span>2FA обязательна для: SuperAdmin, Admin, Finance · Все изменения ролей логируются в аудит · Custom-кабинет переопределяет настройки роли</span>
        </div>
      </div>

      {/* ════ ALL MODALS AT ROOT — no transform parent clipping ════ */}
      <AnimatePresence>
        {addEditModal && (
          <AddEditModal mode={addEditModal.mode} user={addEditModal.user} onSave={handleSaveUser} onClose={() => setAddEditModal(null)} />
        )}
        {emailModal && (
          <SendEmailModal user={emailModal} onClose={() => setEmailModal(null)} />
        )}
        {roleModal && (
          <ChangeRoleModal user={roleModal} onSave={(role, scope, scopeVal) => { changeRole(roleModal.id, role, scope, scopeVal); toast.success(`Роль изменена: ${roleModal.name} → ${ROLE_LABELS[role] ?? role}`); }} onClose={() => setRoleModal(null)} />
        )}
        {request2FAModal && (
          <ConfirmDialog
            title={request2FAModal.twoFactorEnabled ? 'Отключить 2FA?' : 'Запросить настройку 2FA'}
            message={request2FAModal.twoFactorEnabled
              ? `Двухфакторная аутентификация будет отключена для ${request2FAModal.name}.`
              : `${request2FAModal.name} получит запрос по email с инструкцией по настройке 2FA через Google Authenticator.`}
            confirmLabel={request2FAModal.twoFactorEnabled ? 'Отключить 2FA' : 'Запросить 2FA'}
            confirmCls={request2FAModal.twoFactorEnabled ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'}
            onConfirm={() => { toggle2FA(request2FAModal.id); setRequest2FAModal(null); toast.success(request2FAModal.twoFactorEnabled ? `2FA отключена: ${request2FAModal.name}` : `Запрос 2FA отправлен → ${request2FAModal.email}`); }}
            onCancel={() => setRequest2FAModal(null)}
          />
        )}
        {blockModal && (
          <ConfirmDialog
            title={blockModal.status === 'suspended' ? 'Разблокировать пользователя?' : 'Заблокировать пользователя?'}
            message={blockModal.status === 'suspended'
              ? `${blockModal.name} снова сможет войти в систему.`
              : `${blockModal.name} потеряет доступ немедленно. Активные сессии будут закрыты.`}
            confirmLabel={blockModal.status === 'suspended' ? 'Разблокировать' : 'Заблокировать'}
            confirmCls={blockModal.status === 'suspended' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'}
            onConfirm={() => { toggleStatus(blockModal.id); setBlockModal(null); toast.success(blockModal.status === 'suspended' ? `Разблокирован: ${blockModal.name}` : `Заблокирован: ${blockModal.name}`); }}
            onCancel={() => setBlockModal(null)}
          />
        )}
        {deleteModal && (
          <ConfirmDialog
            title="Убрать из команды?"
            message={`Аккаунт ${deleteModal.name} будет деактивирован. Данные сохранятся в архиве.`}
            confirmLabel="Убрать из команды"
            onConfirm={() => { deleteUser(deleteModal.id); setDeleteModal(null); toast.success(`${deleteModal.name} удалён из команды`); }}
            onCancel={() => setDeleteModal(null)}
          />
        )}
      </AnimatePresence>

      {/* Cabinet preview */}
      <AnimatePresence>
        {cabinetPreview && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col">
            <div className="flex items-center justify-between px-6 py-3 bg-gray-900 border-b border-gray-700 shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 bg-gradient-to-br ${avatarGradient(cabinetPreview.id)} rounded-xl flex items-center justify-center text-white text-sm font-bold`}>
                  {initials(cabinetPreview.name)}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{cabinetPreview.name}</p>
                  <p className="text-gray-400 text-xs">{cabinetPreview.email}</p>
                </div>
                <RoleBadge role={cabinetPreview.role} />
              </div>
              <button onClick={() => setCabinetPreview(null)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-xl transition-colors">
                <X className="w-4 h-4" />Закрыть превью
              </button>
            </div>
            <div className="flex-1 overflow-y-auto bg-gray-50">
              <div className="max-w-5xl mx-auto px-6 py-6">
                <PersonalCabinet previewRole={cabinetPreview.role} previewName={cabinetPreview.name}
                  previewModules={cabinetPreview.cabinetModules}
                  scopeValue={`${cabinetPreview.scopeType}${cabinetPreview.scopeValue ? ' · ' + cabinetPreview.scopeValue : ''}`}
                  onClose={() => setCabinetPreview(null)} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
