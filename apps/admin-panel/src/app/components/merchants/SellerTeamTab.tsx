import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  UserPlus, Shield, ShieldCheck, User, MoreHorizontal,
  Mail, Clock, CheckCircle, AlertTriangle,
  Calendar, Lock, Unlock, Trash2, Pencil as Edit2, Send, X,
  Key, Activity, LogIn, Check, ShieldAlert,
  Fingerprint, UserMinus, MessageSquare, RefreshCw,
} from 'lucide-react';
import { getTeamMembers, TeamMember } from '../../data/merchants-mock';
import { toast } from 'sonner';

interface Props { sellerId: string; }

// ─── Config ───────────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ElementType; desc: string }> = {
  owner:   { label: 'Владелец',  color: 'text-purple-700', bg: 'bg-purple-100', border: 'border-purple-200', icon: ShieldCheck, desc: 'Полный доступ, включая финансы и управление командой' },
  manager: { label: 'Менеджер', color: 'text-blue-700',   bg: 'bg-blue-100',   border: 'border-blue-200',   icon: Shield,      desc: 'Товары, магазины, заказы и аналитика без финансов' },
  worker:  { label: 'Сотрудник', color: 'text-gray-700',  bg: 'bg-gray-100',   border: 'border-gray-200',   icon: User,        desc: 'Просмотр заказов и управление наличием товаров' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  active:   { label: 'Активен',      color: 'text-green-700',  bg: 'bg-green-100',  border: 'border-green-200',  dot: 'bg-green-500' },
  invited:  { label: 'Приглашён',    color: 'text-yellow-700', bg: 'bg-yellow-100', border: 'border-yellow-200', dot: 'bg-yellow-500' },
  disabled: { label: 'Заблокирован', color: 'text-red-700',    bg: 'bg-red-100',    border: 'border-red-200',    dot: 'bg-red-500' },
};

const ROLE_PERMISSIONS: Record<string, string[]> = {
  owner:   ['Все операции', 'Финансы и выплаты', 'Управление командой', 'Настройки продавца', 'Магазины и товары', 'Заказы и аналитика'],
  manager: ['Товары и каталог', 'Магазины', 'Заказы', 'Аналитика (без финансов)', 'Тикеты поддержки'],
  worker:  ['Просмотр заказов', 'Изменение наличия товаров', 'Просмотр каталога'],
};

const AVATAR_GRADIENTS = [
  'from-blue-500 to-purple-600',
  'from-green-500 to-teal-600',
  'from-orange-500 to-red-600',
  'from-pink-500 to-rose-600',
  'from-indigo-500 to-blue-600',
  'from-amber-500 to-orange-600',
];

function getGradient(id: string) {
  return AVATAR_GRADIENTS[id.charCodeAt(id.length - 1) % AVATAR_GRADIENTS.length];
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2);
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

function ConfirmDialog({ title, message, confirmLabel, confirmCls, icon: Icon, onConfirm, onCancel }: {
  title: string; message: string; confirmLabel: string;
  confirmCls?: string; icon?: React.ElementType;
  onConfirm: () => void; onCancel: () => void;
}) {
  const Ic = Icon ?? AlertTriangle;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-gray-950/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
            <Ic className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 mt-1">{message}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Отмена</button>
          <button onClick={onConfirm} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${confirmCls ?? 'bg-red-600 hover:bg-red-700'}`}>{confirmLabel}</button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Change Role Modal ────────────────────────────────────────────────────────

function ChangeRoleModal({ member, onSave, onClose }: {
  member: TeamMember;
  onSave: (newRole: 'owner' | 'manager' | 'worker') => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<'owner' | 'manager' | 'worker'>(member.role);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-gray-950/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900">Изменить роль</h3>
            <p className="text-xs text-gray-400 mt-0.5">{member.name} · {member.email}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-3">
          {(Object.keys(ROLE_CONFIG) as ('owner' | 'manager' | 'worker')[]).map(role => {
            const cfg = ROLE_CONFIG[role];
            const Icon = cfg.icon;
            const isSelected = selected === role;
            const isCurrent = member.role === role;
            return (
              <button key={role} onClick={() => setSelected(role)}
                className={`w-full flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${isSelected ? `${cfg.border} ${cfg.bg}` : 'border-gray-100 hover:border-gray-200 bg-gray-50 hover:bg-gray-100'}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? `${cfg.bg} ${cfg.color}` : 'bg-white border border-gray-200 text-gray-400'}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-bold ${isSelected ? cfg.color : 'text-gray-800'}`}>{cfg.label}</p>
                    {isCurrent && <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full font-semibold">текущая</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{cfg.desc}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {ROLE_PERMISSIONS[role].slice(0, 3).map(p => (
                      <span key={p} className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${isSelected ? `${cfg.bg} ${cfg.color}` : 'bg-gray-200 text-gray-600'}`}>{p}</span>
                    ))}
                    {ROLE_PERMISSIONS[role].length > 3 && (
                      <span className="text-[10px] text-gray-400">+{ROLE_PERMISSIONS[role].length - 3} ещё</span>
                    )}
                  </div>
                </div>
                {isSelected && <Check className={`w-5 h-5 shrink-0 ${cfg.color}`} />}
              </button>
            );
          })}

          {selected !== member.role && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
              <p className="font-semibold">Изменение: {ROLE_CONFIG[member.role].label} → {ROLE_CONFIG[selected].label}</p>
              <p className="mt-0.5">Пользователь получит уведомление по email. Изменение вступит в силу немедленно.</p>
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Отмена</button>
          <button
            onClick={() => { onSave(selected); onClose(); }}
            disabled={selected === member.role}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <Shield className="w-4 h-4" />Сохранить роль
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Send Email Modal ─────────────────────────────────────────────────────────

function SendEmailModal({ member, onClose }: { member: TeamMember; onClose: () => void }) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sent, setSent] = useState(false);

  const rc = ROLE_CONFIG[member.role];

  const templates = [
    {
      label: 'Запрос 2FA',
      subject: 'Пожалуйста, настройте двухфакторную аутентификацию',
      body: `Уважаемый(ая) ${member.name.split(' ')[0]},\n\nПросим вас настроить двухфакторную аутентификацию (2FA) для вашего аккаунта. Это обязательное требование безопасности.\n\nДля настройки войдите в личный кабинет → Настройки → Безопасность → 2FA.\n\nС уважением,\nАдминистрация платформы`,
    },
    {
      label: 'Уведомление о роли',
      subject: `Ваа роль в системе: ${rc?.label}`,
      body: `Уважаемый(ая) ${member.name.split(' ')[0]},\n\nВаша роль — «${rc?.label}». Вам доступны следующие функции:\n${ROLE_PERMISSIONS[member.role].map(p => `• ${p}`).join('\n')}\n\nС уважением,\nАдминистрация платформы`,
    },
    {
      label: 'Предупреждение',
      subject: 'Важное уведомление о вашем аккаунте',
      body: `Уважаемый(ая) ${member.name.split(' ')[0]},\n\nОбращаем ваше внимание на необходимость соблюдения регламента работы.\n\nПожалуйста, ознакомьтесь с обновлёнными правилами в личном кабинете.\n\nС уважением,\nАдминистрация платформы`,
    },
    {
      label: 'Обновление пароля',
      subject: 'Требуется обновление пароля',
      body: `Уважаемый(ая) ${member.name.split(' ')[0]},\n\nВ соответствии с политикой безопасности, ваш пароль необходимо обновить. Пожалуйста, смените пароль в течение 3 дней.\n\nС уважением,\nАдминистрация платформы`,
    },
  ];

  const handleSend = () => {
    if (!subject.trim()) { toast.error('Укажите тему письма'); return; }
    if (!body.trim()) { toast.error('Введите текст письма'); return; }
    setSent(true);
    setTimeout(() => {
      toast.success(`Письмо отправлено → ${member.email}`);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-gray-950/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg"
        onClick={e => e.stopPropagation()}
      >
        {sent ? (
          <div className="p-12 text-center">
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 14 }}
              className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <Check className="w-8 h-8 text-green-600" />
            </motion.div>
            <p className="font-bold text-gray-900 text-lg">Письмо отправлено!</p>
            <p className="text-sm text-gray-400 mt-1">{member.email}</p>
          </div>
        ) : (
          <div style={{display:'contents'}}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Mail className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Отправить письмо</h3>
                  <p className="text-xs text-gray-400">{member.name} · {member.email}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Templates */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Шаблоны</p>
                <div className="flex flex-wrap gap-2">
                  {templates.map(t => (
                    <button key={t.label}
                      onClick={() => { setSubject(t.subject); setBody(t.body); }}
                      className="px-3 py-1.5 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium transition-colors">
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Кому</label>
                <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
                  <div className={`w-6 h-6 bg-gradient-to-br ${getGradient(member.id)} rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                    {getInitials(member.name)}
                  </div>
                  <span className="text-sm text-gray-700">{member.name}</span>
                  <span className="text-gray-400">·</span>
                  <span className="text-sm text-blue-600">{member.email}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Тема *</label>
                <input value={subject} onChange={e => setSubject(e.target.value)}
                  placeholder="Тема письма..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Текст *</label>
                <textarea value={body} onChange={e => setBody(e.target.value)} rows={6}
                  placeholder="Текст письма..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Отмена</button>
              <button onClick={handleSend}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
                <Send className="w-4 h-4" />Отправить письмо
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── Invite Modal ─────────────────────────────────────────────────────────────

function InviteModal({ onInvite, onClose }: {
  onInvite: (email: string, name: string, role: 'owner' | 'manager' | 'worker') => void;
  onClose: () => void;
}) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'owner' | 'manager' | 'worker'>('manager');
  const [message, setMessage] = useState('');
  const [step, setStep] = useState<'form' | 'sent'>('form');

  const rc = ROLE_CONFIG[role];

  const handleSend = () => {
    if (!email.trim() || !email.includes('@')) { toast.error('Введите корректный email'); return; }
    if (!name.trim()) { toast.error('Введите имя сотрудника'); return; }
    onInvite(email, name, role);
    setStep('sent');
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-gray-950/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg"
        onClick={e => e.stopPropagation()}
      >
        {step === 'sent' ? (
          <div className="p-10 text-center">
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 14 }}
              className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <CheckCircle className="w-8 h-8 text-green-600" />
            </motion.div>
            <h3 className="font-bold text-gray-900 text-lg">Приглашение отправлено!</h3>
            <p className="text-sm text-gray-500 mt-1">{email}</p>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-4 text-left">
              <p className="text-xs font-semibold text-blue-800 mb-2">Что произойдёт дальше:</p>
              <div className="space-y-1.5">
                {[
                  `${name} получит письмо на ${email}`,
                  'Пройдёт по ссылке и создаст пароль',
                  `Получит роль «${rc.label}» с доступами`,
                  'Вы получите уведомление о первом входе',
                ].map((s, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">{i + 1}</div>
                    <p className="text-xs text-blue-800">{s}</p>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={onClose}
              className="mt-5 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors">
              Закрыть
            </button>
          </div>
        ) : (
          <div style={{display:'contents'}}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900">Пригласить пользователя</h3>
                <p className="text-xs text-gray-400 mt-0.5">Новый участник получит email с ссылкой для регистрации</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Contact info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Имя и фамилия *</label>
                  <input value={name} onChange={e => setName(e.target.value)}
                    placeholder="Иванов Иван"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="user@company.com"
                      className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              </div>

              {/* Role selection — ALL roles */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Роль *</label>
                <div className="space-y-2">
                  {(Object.keys(ROLE_CONFIG) as ('owner' | 'manager' | 'worker')[]).map(r => {
                    const cfg = ROLE_CONFIG[r];
                    const Icon = cfg.icon;
                    const isSelected = role === r;
                    return (
                      <button key={r} onClick={() => setRole(r)}
                        className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${isSelected ? `${cfg.border} ${cfg.bg}` : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? `${cfg.bg} ${cfg.color}` : 'bg-gray-100 text-gray-400'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-semibold ${isSelected ? cfg.color : 'text-gray-800'}`}>{cfg.label}</p>
                          <p className="text-xs text-gray-500">{cfg.desc}</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-300'}`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Permissions preview */}
              <div className={`rounded-xl border p-3 ${rc.bg} ${rc.border}`}>
                <p className={`text-xs font-semibold ${rc.color} mb-2`}>Доступы роли «{rc.label}»:</p>
                <div className="flex flex-wrap gap-1.5">
                  {ROLE_PERMISSIONS[role].map(p => (
                    <span key={p} className={`flex items-center gap-1 px-2 py-0.5 bg-white rounded-lg text-xs border ${rc.border} ${rc.color}`}>
                      <CheckCircle className="w-3 h-3" />{p}
                    </span>
                  ))}
                </div>
              </div>

              {/* Optional message */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Сообщение в письме (необязательно)</label>
                <textarea value={message} onChange={e => setMessage(e.target.value)} rows={2}
                  placeholder="Добавьте персональное сообщение для нового сотрудника..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Отмена</button>
              <button onClick={handleSend}
                disabled={!email.trim() || !name.trim()}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
                <Send className="w-4 h-4" />Отправить приглашение
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── Member Detail Modal ───────────────────────────────────────────────────────

function MemberDetailModal({ member, onClose, onChangeRole, onToggle2FA, onToggleStatus, onDelete, onSendEmail }: {
  member: TeamMember;
  onClose: () => void;
  onChangeRole: (newRole: 'owner' | 'manager' | 'worker') => void;
  onToggle2FA: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
  onSendEmail: () => void;
}) {
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showBlock, setShowBlock] = useState(false);
  const [show2FA, setShow2FA] = useState(false);

  const rc = ROLE_CONFIG[member.role] || ROLE_CONFIG.worker;
  const sc = STATUS_CONFIG[member.status] || STATUS_CONFIG.active;
  const RIcon = rc.icon;
  const permissions = ROLE_PERMISSIONS[member.role] || [];
  const gradient = getGradient(member.id);
  const initials = getInitials(member.name);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && !showRoleModal && !showDelete && !showBlock && !show2FA) onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose, showRoleModal, showDelete, showBlock, show2FA]);

  return (
    <div style={{display:'contents'}}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-gray-950/75 backdrop-blur-sm" />
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header gradient */}
          <div className={`bg-gradient-to-r ${gradient} px-6 pt-6 pb-14 relative`}>
            <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors">
              <X className="w-4 h-4 text-white" />
            </button>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-white text-2xl font-bold border-2 border-white/30">
                {initials}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{member.name}</h2>
                <p className="text-white/80 text-sm mt-0.5">{member.email}</p>
              </div>
            </div>
          </div>

          {/* Overlapping badges */}
          <div className="flex items-center gap-2 px-6 -mt-6 mb-4 flex-wrap">
            <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold shadow-md border ${rc.bg} ${rc.color} ${rc.border}`}>
              <RIcon className="w-3.5 h-3.5" />{rc.label}
            </span>
            <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold shadow-md border ${sc.bg} ${sc.color} ${sc.border}`}>
              <span className={`w-2 h-2 rounded-full ${sc.dot}`} />{sc.label}
            </span>
            {member.twoFactorEnabled ? (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold shadow-md border bg-emerald-100 text-emerald-700 border-emerald-200">
                <Key className="w-3.5 h-3.5" />2FA
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold shadow-md border bg-orange-100 text-orange-700 border-orange-200">
                <AlertTriangle className="w-3.5 h-3.5" />Нет 2FA
              </span>
            )}
          </div>

          {/* Info rows */}
          <div className="px-6 space-y-4">
            <div className="bg-gray-50 rounded-xl border border-gray-100 divide-y divide-gray-100 overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3">
                <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Email</p>
                  <p className="text-sm font-medium text-gray-800">{member.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 px-4 py-3">
                <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Дата добавления</p>
                  <p className="text-sm font-medium text-gray-800">
                    {new Date(member.addedAt).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 px-4 py-3">
                <LogIn className="w-4 h-4 text-gray-400 shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Последний вход</p>
                  <p className="text-sm font-medium text-gray-800">
                    {member.lastLogin
                      ? new Date(member.lastLogin).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : 'Ещё не входил'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 px-4 py-3">
                <Key className="w-4 h-4 text-gray-400 shrink-0" />
                <div className="flex-1">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Двухфакторная аутентификация</p>
                  <p className={`text-sm font-medium ${member.twoFactorEnabled ? 'text-green-700' : 'text-orange-700'}`}>
                    {member.twoFactorEnabled ? '✓ Включена' : '✗ Не настроена — риск безопасности'}
                  </p>
                </div>
                {!member.twoFactorEnabled && (
                  <button onClick={() => setShow2FA(true)}
                    className="text-xs bg-orange-100 text-orange-700 hover:bg-orange-200 px-2.5 py-1 rounded-lg font-medium transition-colors shrink-0">
                    Запросить
                  </button>
                )}
              </div>
            </div>

            {/* Permissions */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Права доступа ({rc.label})</p>
              <div className="flex flex-wrap gap-1.5">
                {permissions.map(p => (
                  <span key={p} className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
                    <CheckCircle className="w-3 h-3 shrink-0" />{p}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Actions footer */}
          <div className="px-6 py-4 mt-4 border-t border-gray-100 flex flex-wrap items-center gap-2">
            {member.role !== 'owner' && (
              <button
                onClick={() => setShowRoleModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />Изменить роль
              </button>
            )}
            <button
              onClick={() => { onClose(); setTimeout(onSendEmail, 100); }}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />Отправить письмо
            </button>
            {!member.twoFactorEnabled && (
              <button
                onClick={() => setShow2FA(true)}
                className="flex items-center gap-1.5 px-3 py-2 border border-orange-200 rounded-xl text-xs font-medium text-orange-700 hover:bg-orange-50 transition-colors"
              >
                <Fingerprint className="w-3.5 h-3.5" />Запросить 2FA
              </button>
            )}
            {member.status === 'active' && member.role !== 'owner' && (
              <button
                onClick={() => setShowBlock(true)}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700 transition-colors"
              >
                <Lock className="w-3.5 h-3.5" />Заблокировать
              </button>
            )}
            {member.status === 'disabled' && (
              <button
                onClick={() => { onToggleStatus(); onClose(); toast.success(`${member.name} разблокирован`); }}
                className="flex items-center gap-1.5 px-3 py-2 border border-green-200 rounded-xl text-xs font-medium text-green-700 hover:bg-green-50 transition-colors"
              >
                <Unlock className="w-3.5 h-3.5" />Разблокировать
              </button>
            )}
            {member.role !== 'owner' && (
              <button
                onClick={() => setShowDelete(true)}
                className="flex items-center gap-1.5 px-3 py-2 border border-red-200 rounded-xl text-xs font-medium text-red-700 hover:bg-red-50 transition-colors ml-auto"
              >
                <UserMinus className="w-3.5 h-3.5" />Удалить из команды
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Sub-modals */}
      <AnimatePresence>
        {showRoleModal && (
          <ChangeRoleModal
            member={member}
            onSave={(newRole) => {
              onChangeRole(newRole);
              toast.success(`Роль изменена: ${member.name} → ${ROLE_CONFIG[newRole].label}`);
              onClose();
            }}
            onClose={() => setShowRoleModal(false)}
          />
        )}
        {show2FA && (
          <ConfirmDialog
            title="Запросить настройку 2FA"
            message={`${member.name} получит письмо с инструкцией по настройке двухфакторной аутентификации через Google Authenticator.`}
            confirmLabel="Отправить запрос"
            confirmCls="bg-orange-600 hover:bg-orange-700"
            icon={Fingerprint}
            onConfirm={() => {
              onToggle2FA();
              setShow2FA(false);
              toast.success(`Запрос 2FA отправлен → ${member.email}`);
              onClose();
            }}
            onCancel={() => setShow2FA(false)}
          />
        )}
        {showBlock && (
          <ConfirmDialog
            title="Заблокировать пользователя?"
            message={`${member.name} потеряет доступ немедленно. Активные сессии будут закрыты. Вы сможете разблокировать в любое время.`}
            confirmLabel="Заблокировать"
            confirmCls="bg-orange-600 hover:bg-orange-700"
            icon={Lock}
            onConfirm={() => {
              onToggleStatus();
              setShowBlock(false);
              toast.success(`Пользователь заблокирован: ${member.name}`);
              onClose();
            }}
            onCancel={() => setShowBlock(false)}
          />
        )}
        {showDelete && (
          <ConfirmDialog
            title="Удалить из команды?"
            message={`Доступ ${member.name} будет отозван немедленно. Это действие нельзя отменить без повторного приглашения.`}
            confirmLabel="Удалить из команды"
            icon={UserMinus}
            onConfirm={() => {
              onDelete();
              setShowDelete(false);
              toast.success(`${member.name} удалён из команды`);
              onClose();
            }}
            onCancel={() => setShowDelete(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Action Dropdown ──────────────────────────────────────────────────────────

function MemberActionsMenu({ member, onViewDetail, onEdit, onEmail, on2FA, onBlock, onDelete }: {
  member: TeamMember;
  onViewDetail: () => void;
  onEdit: () => void;
  onEmail: () => void;
  on2FA: () => void;
  onBlock: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const actions = [
    { icon: Activity, label: 'Просмотреть профиль', fn: () => { onViewDetail(); setOpen(false); } },
    ...(member.role !== 'owner' ? [
      { icon: Edit2, label: 'Изменить роль', fn: () => { onEdit(); setOpen(false); } },
    ] : []),
    { icon: Mail, label: 'Написать письмо', fn: () => { onEmail(); setOpen(false); } },
    ...(!member.twoFactorEnabled ? [
      { icon: Fingerprint, label: 'Запросить 2FA', fn: () => { on2FA(); setOpen(false); } },
    ] : []),
    ...(member.status === 'active' && member.role !== 'owner' ? [
      { icon: Lock, label: 'Заблокировать', fn: () => { onBlock(); setOpen(false); }, danger: true },
    ] : []),
    ...(member.status === 'disabled' ? [
      { icon: Unlock, label: 'Разблокировать', fn: () => { onBlock(); setOpen(false); } },
    ] : []),
    ...(member.role !== 'owner' ? [
      { icon: UserMinus, label: 'Удалить из команды', fn: () => { onDelete(); setOpen(false); }, danger: true },
    ] : []),
  ];

  return (
    <div ref={ref} className="relative">
      <button onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        className={`p-1.5 rounded-lg transition-colors ${open ? 'bg-gray-200 text-gray-700' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}>
        <MoreHorizontal className="w-4 h-4" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-8 z-50 bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 min-w-[200px]"
            onClick={e => e.stopPropagation()}
          >
            {actions.map((a, i) => {
              const Icon = a.icon;
              return (
                <button key={i} onClick={a.fn}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${(a as any).danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'}`}>
                  <Icon className="w-3.5 h-3.5 shrink-0" />{a.label}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SellerTeamTab({ sellerId }: Props) {
  // Local state — changes persist within the session
  const [members, setMembers] = useState<TeamMember[]>(() => getTeamMembers(sellerId));
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [emailMember, setEmailMember] = useState<TeamMember | null>(null);
  const [roleEditMember, setRoleEditMember] = useState<TeamMember | null>(null);

  // ── Member actions ──
  function changeRole(id: string, newRole: 'owner' | 'manager' | 'worker') {
    setMembers(prev => prev.map(m => m.id === id ? { ...m, role: newRole } : m));
  }

  function toggle2FA(id: string) {
    setMembers(prev => prev.map(m => m.id === id ? { ...m, twoFactorEnabled: !m.twoFactorEnabled } : m));
  }

  function toggleStatus(id: string) {
    setMembers(prev => prev.map(m => m.id === id
      ? { ...m, status: m.status === 'disabled' ? 'active' : 'disabled' }
      : m
    ));
  }

  function deleteMember(id: string) {
    setMembers(prev => prev.filter(m => m.id !== id));
    if (selectedMember?.id === id) setSelectedMember(null);
  }

  function handleInvite(email: string, name: string, role: 'owner' | 'manager' | 'worker') {
    const newMember: TeamMember = {
      id: `tm-${Date.now()}`,
      name,
      email,
      role,
      status: 'invited',
      lastLogin: null,
      twoFactorEnabled: false,
      addedAt: new Date().toISOString().split('T')[0],
    };
    setMembers(prev => [...prev, newMember]);
    toast.success(`Приглашение отправлено: ${email} (${ROLE_CONFIG[role].label})`);
  }

  const activeCount = members.filter(m => m.status === 'active').length;
  const invitedCount = members.filter(m => m.status === 'invited').length;
  const no2faCount = members.filter(m => !m.twoFactorEnabled).length;

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold text-gray-900">Команда продавца</h3>
          <p className="text-xs text-gray-500 mt-0.5">Управление доступом пользователей продавца (Access Management)</p>
        </div>
        <button onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
          <UserPlus className="w-4 h-4" /> Пригласить
        </button>
      </div>

      {/* ── Summary chips ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-xl text-xs font-medium text-gray-700">
          <User className="w-3.5 h-3.5" />Всего: {members.length}
        </span>
        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 rounded-xl text-xs font-medium text-green-700">
          <Activity className="w-3.5 h-3.5" />Активны: {activeCount}
        </span>
        {invitedCount > 0 && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-100 rounded-xl text-xs font-medium text-yellow-700">
            <Send className="w-3.5 h-3.5" />Приглашено: {invitedCount}
          </span>
        )}
        {no2faCount > 0 && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 rounded-xl text-xs font-medium text-orange-700 cursor-pointer hover:bg-orange-200 transition-colors"
            title="Нажмите, чтобы найти пользователей без 2FA">
            <AlertTriangle className="w-3.5 h-3.5" />Бе 2FA: {no2faCount}
          </span>
        )}
      </div>

      {/* ── Members list ── */}
      <div className="space-y-2">
        {members.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <User className="w-10 h-10 mx-auto mb-3 text-gray-200" />
            <p className="font-medium">Нет участников команды</p>
            <p className="text-sm mt-1">Пригласите первого сотрудника</p>
          </div>
        )}
        {members.map(member => {
          const rc = ROLE_CONFIG[member.role] || ROLE_CONFIG.worker;
          const sc = STATUS_CONFIG[member.status] || STATUS_CONFIG.active;
          const RIcon = rc.icon;
          const gradient = getGradient(member.id);
          const initials = getInitials(member.name);

          return (
            <motion.div
              key={member.id}
              layout
              whileHover={{ y: -1 }}
              transition={{ duration: 0.15 }}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:shadow-md hover:border-gray-300 transition-all cursor-pointer bg-white"
              onClick={() => setSelectedMember(member)}
            >
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm`}>
                  {initials}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900">{member.name}</p>
                    <span className={`flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${rc.bg} ${rc.color} ${rc.border}`}>
                      <RIcon className="w-3 h-3" /> {rc.label}
                    </span>
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${sc.bg} ${sc.color} ${sc.border}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />{sc.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                    <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{member.email}</span>
                    {member.lastLogin ? (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Вход: {new Date(member.lastLogin).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-gray-400 italic">
                        <Clock className="w-3 h-3" />Ещё не входил
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      С {new Date(member.addedAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right side */}
              <div className="flex items-center gap-3 shrink-0" onClick={e => e.stopPropagation()}>
                {member.twoFactorEnabled ? (
                  <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                    <CheckCircle className="w-3.5 h-3.5" />2FA
                  </span>
                ) : (
                  <button
                    onClick={() => { toggle2FA(member.id); toast.info(`Запрос 2FA отправлен → ${member.email}`); }}
                    className="flex items-center gap-1 text-xs text-orange-600 font-medium hover:text-orange-800 transition-colors"
                    title="Нажмите, чтобы запросить 2FA">
                    <AlertTriangle className="w-3.5 h-3.5" />Нет 2FA
                  </button>
                )}
                <MemberActionsMenu
                  member={member}
                  onViewDetail={() => setSelectedMember(member)}
                  onEdit={() => setRoleEditMember(member)}
                  onEmail={() => setEmailMember(member)}
                  on2FA={() => { toggle2FA(member.id); toast.info(`Запрос 2FA отправлен → ${member.email}`); }}
                  onBlock={() => { toggleStatus(member.id); toast.success(member.status === 'disabled' ? `${member.name} разблокирован` : `${member.name} заблокирован`); }}
                  onDelete={() => { deleteMember(member.id); toast.success(`${member.name} удалён из команды`); }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── RBAC Info ── */}
      <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
        <p className="text-xs font-bold text-blue-800 mb-2">Иерархия ролей продавца</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {Object.entries(ROLE_CONFIG).map(([key, cfg]) => {
            const Icon = cfg.icon;
            return (
              <div key={key} className={`flex items-start gap-2 p-2.5 rounded-lg border ${cfg.bg} ${cfg.border}`}>
                <Icon className={`w-4 h-4 ${cfg.color} shrink-0 mt-0.5`} />
                <div>
                  <p className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</p>
                  <p className="text-[10px] text-gray-600 mt-0.5">{ROLE_PERMISSIONS[key].slice(0, 2).join(', ')}…</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {selectedMember && (
          <MemberDetailModal
            key={selectedMember.id}
            member={selectedMember}
            onClose={() => setSelectedMember(null)}
            onChangeRole={(newRole) => changeRole(selectedMember.id, newRole)}
            onToggle2FA={() => toggle2FA(selectedMember.id)}
            onToggleStatus={() => toggleStatus(selectedMember.id)}
            onDelete={() => deleteMember(selectedMember.id)}
            onSendEmail={() => setEmailMember(selectedMember)}
          />
        )}
        {emailMember && (
          <SendEmailModal key={`email-${emailMember.id}`} member={emailMember} onClose={() => setEmailMember(null)} />
        )}
        {roleEditMember && (
          <ChangeRoleModal
            key={`role-${roleEditMember.id}`}
            member={roleEditMember}
            onSave={(newRole) => {
              changeRole(roleEditMember.id, newRole);
              toast.success(`Роль изменена: ${roleEditMember.name} → ${ROLE_CONFIG[newRole].label}`);
            }}
            onClose={() => setRoleEditMember(null)}
          />
        )}
        {showInviteModal && (
          <InviteModal onInvite={handleInvite} onClose={() => setShowInviteModal(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}