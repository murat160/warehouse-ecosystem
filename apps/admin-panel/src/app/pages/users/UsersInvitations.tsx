import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { copyToClipboard } from '../../utils/clipboard';
import {
  Mail, Plus, Search, X, Check, Copy, RefreshCw, Trash2, Clock,
  Send, Link2, Shield, CheckCircle2, AlertTriangle, ChevronDown,
  Download, Filter, Zap, UserCheck, Eye,
} from 'lucide-react';
import { ROLE_LABELS, ROLE_COLORS, COLOR_BADGE, SCOPES } from '../../data/rbac-data';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Invitation {
  id: string;
  email: string;
  name: string;
  role: string;
  scopeType: string;
  scopeValue: string;
  invitedBy: string;
  sentAt: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  token: string;
  resendCount: number;
}

// ─── Mock Data ─────────────────────────────────────────────────────────────────

const MOCK_INVITATIONS: Invitation[] = [
  { id: 'inv1', email: 'petrov@pvz.ru',        name: 'Петров Алексей',      role: 'PVZOperator',    scopeType: 'PVZ',    scopeValue: 'MSK-007', invitedBy: 'Администратор Системы', sentAt: '14.03.2026 10:30', expiresAt: '17.03.2026 10:30', status: 'pending',  token: 'INV-A3F8B2', resendCount: 0 },
  { id: 'inv2', email: 'novak@courier.com',     name: 'Новак Дмитрий',       role: 'Courier',        scopeType: 'CITY',   scopeValue: 'Москва',  invitedBy: 'Иванов Иван',           sentAt: '13.03.2026 14:15', expiresAt: '16.03.2026 14:15', status: 'pending',  token: 'INV-C9D4E1', resendCount: 1 },
  { id: 'inv3', email: 'sorokina@finance.ru',   name: 'Сорокина Анна',       role: 'Finance',        scopeType: 'ALL',    scopeValue: '',        invitedBy: 'Администратор Системы', sentAt: '12.03.2026 09:00', expiresAt: '15.03.2026 09:00', status: 'expired',  token: 'INV-F2A7C3', resendCount: 0 },
  { id: 'inv4', email: 'gusev@warehouse.ru',    name: 'Гусев Игорь',         role: 'Warehouse',      scopeType: 'WAREHOUSE', scopeValue: 'WH-01', invitedBy: 'Иванов Иван',          sentAt: '10.03.2026 16:45', expiresAt: '13.03.2026 16:45', status: 'accepted', token: 'INV-B1E5D9', resendCount: 0 },
  { id: 'inv5', email: 'kuznecov@support.ru',   name: 'Кузнецов Роман',      role: 'Support',        scopeType: 'ALL',    scopeValue: '',        invitedBy: 'Администратор Системы', sentAt: '09.03.2026 11:20', expiresAt: '12.03.2026 11:20', status: 'accepted', token: 'INV-G8K3L1', resendCount: 0 },
  { id: 'inv6', email: 'stepanova@merchant.ru', name: 'Степанова Мария',     role: 'Merchant',       scopeType: 'SELF',   scopeValue: '',        invitedBy: 'Иванов Иван',           sentAt: '08.03.2026 13:55', expiresAt: '11.03.2026 13:55', status: 'revoked',  token: 'INV-M2N7P4', resendCount: 2 },
  { id: 'inv7', email: 'nikitin@pvz.ru',        name: 'Никитин Вячеслав',    role: 'RegionalManager',scopeType: 'REGION', scopeValue: 'Урал',   invitedBy: 'Администратор Системы', sentAt: '14.03.2026 08:00', expiresAt: '17.03.2026 08:00', status: 'pending',  token: 'INV-T5Q8R2', resendCount: 0 },
  { id: 'inv8', email: 'frolova@qa.ru',         name: 'Фролова Светлана',    role: 'QA',             scopeType: 'ALL',    scopeValue: '',        invitedBy: 'Администратор Системы', sentAt: '14.03.2026 07:45', expiresAt: '17.03.2026 07:45', status: 'pending',  token: 'INV-V3X1Y7', resendCount: 0 },
];

// ─── Config ────────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  pending:  { label: 'Ожидание',    cls: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-500',   border: 'border-blue-200' },
  accepted: { label: 'Принято',     cls: 'bg-green-100 text-green-700', dot: 'bg-green-500',  border: 'border-green-200' },
  expired:  { label: 'Истёк',       cls: 'bg-red-100 text-red-700',     dot: 'bg-red-500',    border: 'border-red-200' },
  revoked:  { label: 'Отозвано',    cls: 'bg-gray-100 text-gray-600',   dot: 'bg-gray-400',   border: 'border-gray-200' },
};

// ─── New Invitation Modal ──────────────────────────────────────────────────────

function NewInvitationModal({ onSave, onClose }: {
  onSave: (inv: Invitation) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<'form' | 'done'>('form');
  const [form, setForm] = useState({ email: '', name: '', role: 'PVZOperator', scopeType: 'PVZ', scopeValue: '' });
  const [generated, setGenerated] = useState<{ link: string; token: string } | null>(null);
  const [copied, setCopied] = useState(false);

  function handleSubmit() {
    if (!form.email.trim() || !form.email.includes('@')) { toast.error('Введите корректный email'); return; }
    if (!form.name.trim()) { toast.error('Введите имя сотрудника'); return; }
    const token = 'INV-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    const link = `https://platform.pvz.ru/invite?token=${token}&email=${encodeURIComponent(form.email)}&role=${form.role}`;
    const now = new Date();
    const exp = new Date(now.getTime() + 72 * 60 * 60 * 1000);
    const fmt = (d: Date) => d.toLocaleDateString('ru-RU') + ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    setGenerated({ link, token });
    onSave({
      id: String(Date.now()), email: form.email, name: form.name, role: form.role,
      scopeType: form.scopeType, scopeValue: form.scopeValue, invitedBy: 'Администратор Системы',
      sentAt: fmt(now), expiresAt: fmt(exp), status: 'pending', token, resendCount: 0,
    });
    setStep('done');
  }

  function handleCopy() {
    if (generated) { copyToClipboard(generated.link); setCopied(true); setTimeout(() => setCopied(false), 2500); }
  }

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
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
              <Send className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-sm">Новое приглашение</h2>
              <p className="text-xs text-gray-400">Ссылка действует 72 часа</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'done' && generated ? (
            <div className="space-y-5">
              <div className="text-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 14 }}
                  className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </motion.div>
                <p className="font-bold text-gray-900">Приглашение создано!</p>
                <p className="text-sm text-gray-400 mt-0.5">{form.email}</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                <p className="text-xs font-semibold text-blue-800 mb-2 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" />После перехода по ссылке сотрудник:</p>
                {['Создаёт пароль для своего аккаунта', 'Настраивает 2FA (рекомендовано)', `Получает роль «${ROLE_LABELS[form.role] ?? form.role}» · Scope: ${form.scopeType}`].map((s, i) => (
                  <div key={i} className="flex items-start gap-2 mt-1.5">
                    <div className="w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">{i + 1}</div>
                    <p className="text-xs text-blue-800">{s}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5 text-blue-600" />Ссылка-приглашение</p>
                <div className="flex gap-2">
                  <div className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono text-[11px] text-gray-700 overflow-x-auto whitespace-nowrap">
                    {generated.link}
                  </div>
                  <button onClick={handleCopy}
                    className={`px-3 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 shrink-0 transition-all ${copied ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                    {copied ? <><Check className="w-3.5 h-3.5" />Скопировано</> : <><Copy className="w-3.5 h-3.5" />Копировать</>}
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5 flex items-center gap-1"><Clock className="w-3 h-3" />Токен: {generated.token} · Истекает через 72 часа</p>
              </div>
              <button onClick={onClose} className="w-full py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Закрыть</button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email приглашаемого *</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="user@company.ru"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Имя и фамилия *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Иванов Иван"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Роль</label>
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Scope</label>
                  <select value={form.scopeType} onChange={e => setForm(f => ({ ...f, scopeType: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {SCOPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                {form.scopeType !== 'ALL' && form.scopeType !== 'SELF' && (
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Объект ({form.scopeType})</label>
                    <input value={form.scopeValue} onChange={e => setForm(f => ({ ...f, scopeValue: e.target.value }))}
                      placeholder={form.scopeType === 'PVZ' ? 'MSK-001' : 'Москва'}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">Отмена</button>
                <button onClick={handleSubmit}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
                  <Send className="w-4 h-4" />Создать приглашение
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function UsersInvitations() {
  const [invitations, setInvitations] = useState<Invitation[]>(MOCK_INVITATIONS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Invitation['status']>('all');
  const [showNewModal, setShowNewModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => invitations.filter(inv => {
    const q = search.toLowerCase();
    const matchSearch = !q || inv.email.toLowerCase().includes(q) || inv.name.toLowerCase().includes(q) || inv.role.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchSearch && matchStatus;
  }), [invitations, search, statusFilter]);

  const stats = useMemo(() => ({
    pending: invitations.filter(i => i.status === 'pending').length,
    accepted: invitations.filter(i => i.status === 'accepted').length,
    expired: invitations.filter(i => i.status === 'expired').length,
    revoked: invitations.filter(i => i.status === 'revoked').length,
    sentToday: invitations.filter(i => i.sentAt.startsWith('14.03.2026')).length,
  }), [invitations]);

  function handleCopyLink(inv: Invitation) {
    const link = `https://platform.pvz.ru/invite?token=${inv.token}&email=${encodeURIComponent(inv.email)}&role=${inv.role}`;
    copyToClipboard(link);
    setCopiedId(inv.id);
    setTimeout(() => setCopiedId(null), 2500);
    toast.success('Ссылка скопирована');
  }

  function handleResend(id: string) {
    setInvitations(prev => prev.map(i => i.id === id ? { ...i, resendCount: i.resendCount + 1, sentAt: '14.03.2026 14:35' } : i));
    toast.success('Приглашение отправлено повторно');
  }

  function handleRevoke(id: string) {
    setInvitations(prev => prev.map(i => i.id === id ? { ...i, status: 'revoked' } : i));
    toast.success('Приглашение отозвано');
  }

  function handleDelete(id: string) {
    setInvitations(prev => prev.filter(i => i.id !== id));
    toast.success('Запись удалена');
  }

  function handleSaveNew(inv: Invitation) {
    setInvitations(prev => [inv, ...prev]);
    toast.success(`Приглашение отправлено → ${inv.email}`);
  }

  const statCards = [
    { label: 'Ожидает ответа',   val: stats.pending,  color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200',   icon: Clock,         filterStatus: 'pending'  as Invitation['status'] | null },
    { label: 'Отправлено сегодня',val: stats.sentToday,color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200',icon: Send,          filterStatus: null },
    { label: 'Принято',          val: stats.accepted, color: 'text-green-700',  bg: 'bg-green-50 border-green-200', icon: CheckCircle2,  filterStatus: 'accepted' as Invitation['status'] | null },
    { label: 'Истекло',          val: stats.expired,  color: 'text-red-700',    bg: 'bg-red-50 border-red-200',     icon: AlertTriangle, filterStatus: 'expired'  as Invitation['status'] | null },
  ];

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Приглашения</h1>
          <p className="text-sm text-gray-500 mt-0.5">Управление ссылками-приглашениями · {invitations.length} всего</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" />Экспорт
          </button>
          <button onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors shadow-sm">
            <Plus className="w-4 h-4" />Новое приглашение
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map(s => {
          const Icon = s.icon;
          const isActive = s.filterStatus !== null && statusFilter === s.filterStatus;
          return (
            <button
              key={s.label}
              onClick={() => {
                if (!s.filterStatus) return;
                setStatusFilter(statusFilter === s.filterStatus ? 'all' : s.filterStatus);
              }}
              className={`flex items-center gap-3 p-4 rounded-2xl border text-left transition-all ${s.bg} ${s.filterStatus ? 'cursor-pointer hover:shadow-md active:scale-[0.97]' : 'cursor-default'} ${isActive ? 'ring-2 ring-offset-1 shadow-md' : ''}`}
            >
              <div className="w-9 h-9 bg-white rounded-xl border border-white/60 flex items-center justify-center shadow-sm shrink-0">
                <Icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <div>
                <p className={`text-2xl font-black ${s.color}`}>{s.val}</p>
                <p className="text-[10px] text-gray-500">{s.label}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex-1 min-w-52 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по email, имени, роли..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {([['all', 'Все'], ['pending', 'Ожидание'], ['accepted', 'Принято'], ['expired', 'Истёк'], ['revoked', 'Отозвано']] as const).map(([val, label]) => (
            <button key={val} onClick={() => setStatusFilter(val)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${statusFilter === val ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        <AnimatePresence>
          {filtered.map(inv => {
            const statusCfg = STATUS_CFG[inv.status];
            const roleBadge = COLOR_BADGE[ROLE_COLORS[inv.role] ?? 'blue'] ?? COLOR_BADGE.blue;
            const isExpanded = expandedId === inv.id;
            const canAct = inv.status === 'pending' || inv.status === 'expired';

            return (
              <motion.div key={inv.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-gray-300 hover:shadow-sm transition-all">
                <div className="flex items-center gap-4 px-5 py-4">
                  {/* Avatar */}
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4 text-blue-600" />
                  </div>

                  {/* Name / email */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-gray-900">{inv.name}</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${roleBadge}`}>
                        <Shield className="w-2.5 h-2.5" />{ROLE_LABELS[inv.role] ?? inv.role}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{inv.email}</p>
                  </div>

                  {/* Scope */}
                  <div className="hidden sm:block shrink-0">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Scope</p>
                    <p className="text-xs font-mono font-semibold text-gray-700">{inv.scopeType}{inv.scopeValue ? ` · ${inv.scopeValue}` : ''}</p>
                  </div>

                  {/* Sent / Expires */}
                  <div className="hidden md:block shrink-0">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Отправлено</p>
                    <p className="text-xs text-gray-700">{inv.sentAt.split(' ')[0]}</p>
                  </div>
                  <div className="hidden lg:block shrink-0">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Истекает</p>
                    <p className={`text-xs font-medium ${inv.status === 'expired' ? 'text-red-600' : 'text-gray-700'}`}>{inv.expiresAt.split(' ')[0]}</p>
                  </div>

                  {/* Status */}
                  <span className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${statusCfg.cls} ${statusCfg.border}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />{statusCfg.label}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setExpandedId(isExpanded ? null : inv.id)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Подробнее">
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    {canAct && (
                      <>
                        <button onClick={() => handleCopyLink(inv)}
                          className={`p-2 rounded-lg transition-colors ${copiedId === inv.id ? 'bg-green-100 text-green-600' : 'hover:bg-blue-50 text-gray-400 hover:text-blue-600'}`}
                          title="Скопировать ссылку">
                          {copiedId === inv.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <button onClick={() => handleResend(inv.id)}
                          className="p-2 hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 rounded-lg transition-colors" title="Отправить повторно">
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleRevoke(inv.id)}
                          className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-colors" title="Отозвать">
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {(inv.status === 'expired' || inv.status === 'revoked') && (
                      <button onClick={() => handleDelete(inv.id)}
                        className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-colors" title="Удалить">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded detail */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-4 pt-0 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-4 mt-0">
                        {[
                          { label: 'Токен', value: inv.token, mono: true },
                          { label: 'Отправил', value: inv.invitedBy, mono: false },
                          { label: 'Повторных отправок', value: String(inv.resendCount), mono: false },
                          { label: 'Истекает', value: inv.expiresAt, mono: false },
                        ].map(row => (
                          <div key={row.label} className="pt-3">
                            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">{row.label}</p>
                            <p className={`text-xs text-gray-800 ${row.mono ? 'font-mono font-bold' : 'font-medium'}`}>{row.value}</p>
                          </div>
                        ))}
                        {canAct && (
                          <div className="col-span-2 sm:col-span-4 pt-2">
                            <div className="flex flex-wrap gap-2">
                              <button onClick={() => handleCopyLink(inv)}
                                className="flex items-center gap-1.5 px-3 py-1.5 border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-semibold transition-colors">
                                <Link2 className="w-3.5 h-3.5" />Скопировать ссылку
                              </button>
                              <button onClick={() => handleResend(inv.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-semibold transition-colors">
                                <Send className="w-3.5 h-3.5" />Отправить повторно
                              </button>
                              <button onClick={() => handleRevoke(inv.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 rounded-xl text-xs font-semibold transition-colors">
                                <X className="w-3.5 h-3.5" />Отозвать
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Mail className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Нет приглашений по выбранным критериям</p>
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showNewModal && (
          <NewInvitationModal onSave={handleSaveNew} onClose={() => setShowNewModal(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}