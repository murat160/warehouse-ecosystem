import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  Building2, Users, Plus, Search, X, Check, Pencil as Edit2, ChevronDown,
  ChevronRight, UserCheck, UserMinus, Briefcase, MapPin, Clock,
  Mail, Star, Download, Shield, CheckCircle2, Layers,
} from 'lucide-react';
import { ROLE_LABELS, ROLE_COLORS, COLOR_BADGE } from '../../data/rbac-data';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  dept: string;
  position?: string;
  isHead?: boolean;
}

interface Department {
  id: string;
  name: string;
  color: string;
  bg: string;
  icon: string;
  head?: string;
  headId?: string;
  members: TeamMember[];
  location?: string;
  shift?: string;
  maxSize?: number;
}

// ─── Mock data ──────────────────────────────────────────────────────────────────

const AVATAR_GRADIENTS = [
  'from-violet-500 to-purple-700', 'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600', 'from-orange-500 to-amber-600',
  'from-rose-500 to-pink-600', 'from-indigo-500 to-blue-700',
  'from-teal-500 to-green-600', 'from-fuchsia-500 to-violet-600',
];

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('');
}

function avatarGradient(id: string) {
  const idx = parseInt(id, 10) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[isNaN(idx) ? 0 : idx] ?? AVATAR_GRADIENTS[0];
}

const INITIAL_DEPARTMENTS: Department[] = [
  {
    id: 'tech', name: 'Технический отдел', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: '⚙️',
    head: 'Администратор Системы', headId: '1',
    location: 'Москва, офис А', shift: 'Пн–Пт 09:00–18:00', maxSize: 15,
    members: [
      { id: '1', name: 'Администратор Системы', email: 'admin@platform.com', role: 'Admin', dept: 'tech', position: 'Системный администратор', isHead: true },
      { id: 't2', name: 'Попов Сергей', email: 'popov@tech.ru', role: 'PVZOperator', dept: 'tech', position: 'DevOps инженер' },
      { id: 't3', name: 'Власова Анастасия', email: 'vlasova@tech.ru', role: 'QA', dept: 'tech', position: 'QA Engineer' },
    ],
  },
  {
    id: 'finance', name: 'Финансы', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', icon: '💰',
    head: 'Сидоров Петр', headId: '4',
    location: 'Москва, офис Б', shift: 'Пн–Пт 09:00–18:00', maxSize: 8,
    members: [
      { id: '4', name: 'Сидоров Петр', email: 'sidorov@platform.com', role: 'Finance', dept: 'finance', position: 'Финансовый директор', isHead: true },
      { id: 'f2', name: 'Орлова Валентина', email: 'orlova@finance.ru', role: 'Finance', dept: 'finance', position: 'Бухгалтер' },
      { id: 'f3', name: 'Белкин Илья', email: 'belkin@finance.ru', role: 'Finance', dept: 'finance', position: 'Аналитик' },
      { id: 'f4', name: 'Семёнова Диана', email: 'semenova@finance.ru', role: 'Finance', dept: 'finance', position: 'Аудитор' },
    ],
  },
  {
    id: 'support', name: 'Поддержка', color: 'text-green-700', bg: 'bg-green-50 border-green-200', icon: '🎧',
    head: 'Козлова Елена', headId: '5',
    location: 'Москва / Удалённо', shift: 'Сб–Вс 09:00–21:00', maxSize: 20,
    members: [
      { id: '5', name: 'Козлова Елена', email: 'kozlova@platform.com', role: 'Support', dept: 'support', position: 'Руководитель поддержки', isHead: true },
      { id: '12', name: 'Лебедева Ольга', email: 'lebedeva@support.pvz.ru', role: 'Support', dept: 'support', position: 'Агент поддержки' },
      { id: 's3', name: 'Тихонов Антон', email: 'tikhonov@support.ru', role: 'Support', dept: 'support', position: 'Агент поддержки' },
      { id: 's4', name: 'Юдина Кристина', email: 'yudina@support.ru', role: 'Support', dept: 'support', position: 'Агент L2' },
      { id: 's5', name: 'Жуков Геннадий', email: 'zhukov@support.ru', role: 'Support', dept: 'support', position: 'Агент поддержки' },
    ],
  },
  {
    id: 'logistics', name: 'Логистика', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', icon: '🚚',
    head: 'Волкова Ирина', headId: '10',
    location: 'Москва + регионы', shift: 'Пн–Вс 07:00–23:00', maxSize: 30,
    members: [
      { id: '10', name: 'Волкова Ирина', email: 'volkova@logistics.ru', role: 'RegionalManager', dept: 'logistics', position: 'Региональный менеджер', isHead: true },
      { id: '11', name: 'Захаров Роман', email: 'zakharov@courier.com', role: 'Courier', dept: 'logistics', position: 'Старший курьер' },
      { id: 'l3', name: 'Кириллов Павел', email: 'kirillov@courier.com', role: 'Courier', dept: 'logistics', position: 'Курьер' },
      { id: 'l4', name: 'Петенко Олег', email: 'petrenko@courier.com', role: 'Courier', dept: 'logistics', position: 'Курьер' },
    ],
  },
  {
    id: 'hr', name: 'HR / Кадры', color: 'text-pink-700', bg: 'bg-pink-50 border-pink-200', icon: '👥',
    head: 'Иванов Иван', headId: '2',
    location: 'Москва, офис А', shift: 'Пн–Пт 10:00–19:00', maxSize: 5,
    members: [
      { id: '2', name: 'Иванов Иван', email: 'ivanov@platform.com', role: 'RegionalManager', dept: 'hr', position: 'HR Директор', isHead: true },
      { id: 'h2', name: 'Громова Надежда', email: 'gromova@hr.ru', role: 'Support', dept: 'hr', position: 'HR менеджер' },
    ],
  },
  {
    id: 'ops', name: 'Операционный', color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200', icon: '📦',
    head: 'Петрова Мария', headId: '3',
    location: 'Москва + регионы', shift: 'Пн–Сб 08:00–20:00', maxSize: 25,
    members: [
      { id: '3', name: 'Петрова Мария', email: 'petrova@platform.com', role: 'RegionalManager', dept: 'ops', position: 'Операционный директор', isHead: true },
      { id: '6', name: 'Новиков Дмитрий', email: 'novikov@platform.com', role: 'RegionalManager', dept: 'ops', position: 'Менеджер ПВЗ' },
      { id: 'o3', name: 'Щербакова Ксения', email: 'scherbakova@ops.ru', role: 'PVZOperator', dept: 'ops', position: 'Оператор ПВЗ' },
    ],
  },
];

// ─── Member Row ────────────────────────────────────────────────────────────────

function MemberRow({ member, onRemove, canRemove }: { member: TeamMember; onRemove: () => void; canRemove: boolean }) {
  const roleBadge = COLOR_BADGE[ROLE_COLORS[member.role] ?? 'blue'] ?? COLOR_BADGE.blue;
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 group transition-colors">
      <div className={`w-8 h-8 bg-gradient-to-br ${avatarGradient(member.id)} rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0`}>
        {initials(member.name)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-gray-900 truncate">{member.name}</p>
          {member.isHead && <Star className="w-3 h-3 text-amber-500 fill-amber-400 shrink-0" title="Руководитель" />}
        </div>
        <p className="text-xs text-gray-400 truncate">{member.position ?? ROLE_LABELS[member.role] ?? member.role}</p>
      </div>
      <span className={`hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${roleBadge} shrink-0`}>
        <Shield className="w-2.5 h-2.5" />{ROLE_LABELS[member.role] ?? member.role}
      </span>
      {canRemove && (
        <button onClick={onRemove}
          className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-100 text-red-500 rounded-lg transition-all shrink-0"
          title="Убрать из отдела">
          <UserMinus className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// ─── Department Card ───────────────────────────────────────────────────────────

function DeptCard({ dept, onUpdate }: { dept: Department; onUpdate: (d: Department) => void }) {
  const [expanded, setExpanded] = useState(false);
  const occupancy = Math.round((dept.members.length / (dept.maxSize ?? 20)) * 100);

  function removeMember(memberId: string) {
    const head = dept.members.find(m => m.isHead);
    if (head?.id === memberId) { toast.error('Нельзя удалить руководителя отдела'); return; }
    onUpdate({ ...dept, members: dept.members.filter(m => m.id !== memberId) });
    toast.success('Сотрудник удалён из отдела');
  }

  return (
    <div className={`bg-white border rounded-2xl overflow-hidden transition-all ${expanded ? 'shadow-md' : 'hover:shadow-sm hover:border-gray-300'} border-gray-200`}>
      {/* Header */}
      <button className="w-full flex items-center gap-4 px-5 py-4 text-left" onClick={() => setExpanded(e => !e)}>
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl ${dept.bg} border shrink-0`}>
          {dept.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900">{dept.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">{dept.members.length} / {dept.maxSize ?? '∞'} сотрудников</p>
        </div>
        {/* Occupancy bar */}
        <div className="hidden sm:block w-24 shrink-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-400">Заполненность</span>
            <span className={`text-[10px] font-bold ${occupancy > 85 ? 'text-red-600' : 'text-gray-600'}`}>{occupancy}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${occupancy > 85 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${occupancy}%` }} />
          </div>
        </div>
        {dept.head && (
          <div className="hidden md:block shrink-0 text-right">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Руководитель</p>
            <p className="text-xs font-semibold text-gray-700 truncate max-w-[120px]">{dept.head.split(' ')[0]} {dept.head.split(' ')[1]?.[0]}.</p>
          </div>
        )}
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-gray-100">
              {/* Meta info */}
              <div className="flex flex-wrap gap-4 py-3 mb-2">
                {dept.location && (
                  <span className="flex items-center gap-1.5 text-xs text-gray-500">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />{dept.location}
                  </span>
                )}
                {dept.shift && (
                  <span className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />{dept.shift}
                  </span>
                )}
              </div>
              {/* Members */}
              <div className="space-y-0.5">
                {dept.members.map(member => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    canRemove={!member.isHead}
                    onRemove={() => removeMember(member.id)}
                  />
                ))}
              </div>
              {/* Add member stub */}
              <button
                onClick={() => toast.info('Выберите пользователя из списка и назначьте его в отдел')}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-200 hover:border-blue-400 text-gray-400 hover:text-blue-600 rounded-xl text-xs font-semibold transition-colors">
                <Plus className="w-3.5 h-3.5" />Добавить сотрудника
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function UsersTeams() {
  const [departments, setDepartments] = useState<Department[]>(INITIAL_DEPARTMENTS);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');

  const filteredDepts = useMemo(() =>
    departments.filter(d =>
      !search || d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.members.some(m => m.name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase()))
    ), [departments, search]);

  const totalStats = useMemo(() => ({
    totalDepts: departments.length,
    totalMembers: departments.reduce((s, d) => s + d.members.length, 0),
    withoutDept: 0,
    heads: departments.filter(d => d.head).length,
  }), [departments]);

  function handleUpdate(updated: Department) {
    setDepartments(prev => prev.map(d => d.id === updated.id ? updated : d));
  }

  function handleCreateDept() {
    if (!newDeptName.trim()) { toast.error('Введите название отдела'); return; }
    const icons = ['📌', '🏢', '🔧', '📊', '🎯'];
    setDepartments(prev => [...prev, {
      id: String(Date.now()), name: newDeptName.trim(),
      color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200',
      icon: icons[Math.floor(Math.random() * icons.length)],
      members: [], maxSize: 10,
    }]);
    setNewDeptName('');
    setShowCreate(false);
    toast.success(`Отдел «${newDeptName.trim()}» создан`);
  }

  const statCards = [
    { label: 'Отделов',      val: totalStats.totalDepts,   color: 'text-blue-700',  bg: 'bg-blue-50 border-blue-200',   icon: Building2, onClick: () => setShowCreate(true) },
    { label: 'Сотрудников',  val: totalStats.totalMembers, color: 'text-green-700', bg: 'bg-green-50 border-green-200', icon: Users,     onClick: () => setSearch('') },
    { label: 'Руководителей',val: totalStats.heads,        color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: Star,      onClick: () => setSearch('') },
    { label: 'Без отдела',   val: totalStats.withoutDept,  color: 'text-gray-600',  bg: 'bg-gray-50 border-gray-200',   icon: UserCheck, onClick: null as null | (() => void) },
  ];

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Команды и отделы</h1>
          <p className="text-sm text-gray-500 mt-0.5">Организационная структура · {totalStats.totalDepts} отделов · {totalStats.totalMembers} сотрудников</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" />Экспорт
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors shadow-sm">
            <Plus className="w-4 h-4" />Создать отдел
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map(s => {
          const Icon = s.icon;
          return (
            <button
              key={s.label}
              onClick={() => s.onClick && s.onClick()}
              className={`flex items-center gap-3 p-4 rounded-2xl border text-left transition-all ${s.bg} ${s.onClick ? 'cursor-pointer hover:shadow-md active:scale-[0.97]' : 'cursor-default'}`}
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

      {/* Create new dept inline */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-3"
          >
            <Building2 className="w-5 h-5 text-blue-600 shrink-0" />
            <input
              autoFocus
              value={newDeptName}
              onChange={e => setNewDeptName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateDept(); if (e.key === 'Escape') setShowCreate(false); }}
              placeholder="Название нового отдела..."
              className="flex-1 px-4 py-2 border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
            <button onClick={handleCreateDept}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5">
              <Check className="w-4 h-4" />Создать
            </button>
            <button onClick={() => setShowCreate(false)}
              className="p-2 hover:bg-blue-100 rounded-xl transition-colors">
              <X className="w-4 h-4 text-blue-600" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по отделу или сотруднику..."
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
      </div>

      {/* Department cards */}
      <div className="space-y-3">
        {filteredDepts.map(dept => (
          <DeptCard key={dept.id} dept={dept} onUpdate={handleUpdate} />
        ))}
        {filteredDepts.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Нет отделов по выбранному критерию</p>
          </div>
        )}
      </div>

      {/* Org chart summary */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-4 h-4 text-blue-600" />
          <p className="text-sm font-bold text-gray-900">Сводка по отделам</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Отдел', 'Руководитель', 'Сотрудников', 'Заполненность', 'График'].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {departments.map(dept => {
                const pct = Math.round((dept.members.length / (dept.maxSize ?? 20)) * 100);
                return (
                  <tr key={dept.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{dept.icon}</span>
                        <span className={`text-xs font-bold ${dept.color}`}>{dept.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-700">{dept.head ?? '—'}</td>
                    <td className="px-3 py-3 text-xs font-bold text-gray-900">{dept.members.length} / {dept.maxSize ?? '∞'}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${pct > 85 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className={`text-xs font-semibold ${pct > 85 ? 'text-red-600' : 'text-gray-600'}`}>{pct}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-500">{dept.shift ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}