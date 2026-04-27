import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  Layers, Search, X, Check, Pencil as Edit2, Shield, ChevronDown, Download,
  Globe, CheckCircle2, AlertTriangle, MapPin,
} from 'lucide-react';
import {
  ALL_MODULES, ROLE_DEFAULT_MODULES, SCOPES, ROLE_LABELS, ROLE_COLORS,
  COLOR_BADGE, INITIAL_USERS, type ManagedUser, type ModuleKey,
} from '../../data/rbac-data';

// ─── Extended mock ──────────────────────────────────────────────────────────────

const EXTRA_USERS: ManagedUser[] = [
  { id: '8',  name: 'Козлов Дмитрий',   email: 'd.kozlov@elektromik.ru',  role: 'Merchant',        scopeType: 'SELF',      scopeValue: '',       status: 'active',    twoFactorEnabled: false, lastLogin: '10.02.2025 18:00', createdAt: '15.01.2025', cabinetModules: null },
  { id: '9',  name: 'Морозов Андрей',   email: 'morozov@partner.ru',      role: 'Partner',         scopeType: 'PVZ',       scopeValue: 'SPB-003',status: 'active',    twoFactorEnabled: true,  lastLogin: '13.02.2026 16:22', createdAt: '12.01.2026', cabinetModules: null },
  { id: '10', name: 'Волкова Ирина',    email: 'volkova@logistics.ru',    role: 'RegionalManager', scopeType: 'REGION',    scopeValue: 'СПб',    status: 'active',    twoFactorEnabled: true,  lastLogin: '14.02.2026 14:05', createdAt: '08.01.2026', cabinetModules: null },
  { id: '11', name: 'Захаров Роман',    email: 'zakharov@courier.com',    role: 'Courier',         scopeType: 'CITY',      scopeValue: 'Москва', status: 'active',    twoFactorEnabled: false, lastLogin: '14.02.2026 08:30', createdAt: '20.01.2026', cabinetModules: null },
  { id: '12', name: 'Лебедева Ольга',   email: 'lebedeva@support.pvz.ru', role: 'Support',         scopeType: 'ALL',       scopeValue: '',       status: 'suspended', twoFactorEnabled: false, lastLogin: '05.02.2026 11:00', createdAt: '01.02.2026', cabinetModules: null },
];

const ALL_USERS: ManagedUser[] = [...INITIAL_USERS, ...EXTRA_USERS];

// ─── Helpers ───────────────────────────────────────────────────────────────────

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

function getEffectiveModules(user: ManagedUser): ModuleKey[] {
  if (user.cabinetModules !== null) return user.cabinetModules;
  return ROLE_DEFAULT_MODULES[user.role] ?? [];
}

const SCOPE_COLORS: Record<string, string> = {
  ALL:       'bg-green-100 text-green-700',
  COUNTRY:   'bg-blue-100 text-blue-700',
  REGION:    'bg-indigo-100 text-indigo-700',
  CITY:      'bg-purple-100 text-purple-700',
  PVZ:       'bg-orange-100 text-orange-700',
  WAREHOUSE: 'bg-amber-100 text-amber-700',
  SELF:      'bg-gray-100 text-gray-600',
};

// ─── Edit Cabinet Modal ─────────────────────────────────────────────────────────

function EditCabinetModal({ user, onSave, onClose }: {
  user: ManagedUser;
  onSave: (userId: string, mods: ModuleKey[] | null, scopeType: string, scopeValue: string) => void;
  onClose: () => void;
}) {
  const [useRoleDefaults, setUseRoleDefaults] = useState(user.cabinetModules === null);
  const [mods, setMods] = useState<ModuleKey[]>([...(user.cabinetModules ?? ROLE_DEFAULT_MODULES[user.role] ?? [])]);
  const [scopeType, setScopeType] = useState(user.scopeType);
  const [scopeValue, setScopeValue] = useState(user.scopeValue);

  function toggleMod(key: ModuleKey) {
    setMods(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  }

  function handleSave() {
    onSave(user.id, useRoleDefaults ? null : mods, scopeType, scopeValue);
    toast.success('Настройки кабинета обновлены');
    onClose();
  }

  const activeMods = useRoleDefaults ? (ROLE_DEFAULT_MODULES[user.role] ?? []) : mods;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 10 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 bg-gradient-to-br ${avatarGradient(user.id)} rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0`}>
              {initials(user.name)}
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-sm">{user.name}</h2>
              <p className="text-xs text-gray-400">{user.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Scope */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Область доступа (Scope)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600 font-medium block mb-1.5">Тип</label>
                <select value={scopeType} onChange={e => setScopeType(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {SCOPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              {scopeType !== 'ALL' && scopeType !== 'SELF' && (
                <div>
                  <label className="text-xs text-gray-600 font-medium block mb-1.5">Объект</label>
                  <input value={scopeValue} onChange={e => setScopeValue(e.target.value)}
                    placeholder={scopeType === 'PVZ' ? 'MSK-001' : 'Москва'}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              )}
            </div>
          </div>

          {/* Modules */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Разделы кабинета</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{useRoleDefaults ? 'По умолчанию роли' : 'Кастомный набор'}</span>
                <button onClick={() => setUseRoleDefaults(v => !v)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${useRoleDefaults ? 'bg-gray-300' : 'bg-blue-600'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${useRoleDefaults ? 'left-0.5' : 'left-5'}`} />
                </button>
              </div>
            </div>
            <div className={`grid grid-cols-3 gap-1.5 transition-opacity ${useRoleDefaults ? 'opacity-60 pointer-events-none' : ''}`}>
              {ALL_MODULES.map(mod => {
                const active = activeMods.includes(mod.key as ModuleKey);
                const Icon = mod.icon;
                return (
                  <button key={mod.key} onClick={() => { if (!useRoleDefaults) toggleMod(mod.key as ModuleKey); }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-xs transition-all ${active ? 'border-blue-400 bg-blue-50 text-blue-800' : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200'}`}>
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-blue-600' : 'text-gray-300'}`} />
                    <span className="truncate flex-1 text-left">{mod.label}</span>
                    {active && !useRoleDefaults && <Check className="w-2.5 h-2.5 text-blue-500 shrink-0" />}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-400 mt-2">{activeMods.length} из {ALL_MODULES.length} разделов активно</p>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
          <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">Отмена</button>
          <button onClick={handleSave}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
            <Check className="w-4 h-4" />Сохранить
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function UsersCabinets() {
  const [users, setUsers] = useState<ManagedUser[]>(ALL_USERS);
  const [search, setSearch] = useState('');
  const [scopeFilter, setScopeFilter] = useState('all');
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
    const matchScope = scopeFilter === 'all' || u.scopeType === scopeFilter;
    return matchSearch && matchScope;
  }), [users, search, scopeFilter]);

  const stats = useMemo(() => ({
    custom: users.filter(u => u.cabinetModules !== null).length,
    byRole: users.filter(u => u.cabinetModules === null).length,
    scopeAll: users.filter(u => u.scopeType === 'ALL').length,
    scopePvz: users.filter(u => u.scopeType === 'PVZ').length,
  }), [users]);

  function handleSave(userId: string, mods: ModuleKey[] | null, scopeType: string, scopeValue: string) {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, cabinetModules: mods, scopeType, scopeValue } : u));
  }

  const scopeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach(u => { counts[u.scopeType] = (counts[u.scopeType] ?? 0) + 1; });
    return counts;
  }, [users]);

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Кабинеты и доступ</h1>
          <p className="text-sm text-gray-500 mt-0.5">Управление Scope и разделами личных кабинетов · {users.length} пользователей</p>
        </div>
        <button onClick={() => { import('sonner').then(m => m.toast.success(`Экспортировано кабинетов: ${users.length}`)); }}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
          <Download className="w-4 h-4" />Экспорт
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'По умолчанию роли',  val: stats.byRole,   color: 'text-green-700',  bg: 'bg-green-50 border-green-200',  icon: Shield,  scopeVal: null   as string | null },
          { label: 'Кастомный набор',    val: stats.custom,   color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200',  icon: Layers,  scopeVal: null },
          { label: 'Scope ALL (вся сеть)',val: stats.scopeAll, color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200',    icon: Globe,   scopeVal: 'ALL'  as string | null },
          { label: 'Scope PVZ',          val: stats.scopePvz, color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', icon: MapPin,  scopeVal: 'PVZ'  as string | null },
        ].map(s => {
          const Icon = s.icon;
          return (
            <button
              key={s.label}
              onClick={() => {
                if (s.scopeVal) setScopeFilter(scopeFilter === s.scopeVal ? 'all' : s.scopeVal);
                else toast.info(s.label, { description: `${s.val} пользователей` });
              }}
              className={`flex items-center gap-3 p-4 rounded-2xl border text-left transition-all cursor-pointer hover:shadow-md active:scale-[0.97] ${s.bg} ${s.scopeVal && scopeFilter === s.scopeVal ? 'ring-2 ring-offset-1 shadow-sm' : ''}`}
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

      {/* Scope distribution */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <p className="text-sm font-bold text-gray-900 mb-3">Распределение по Scope</p>
        <div className="flex flex-wrap gap-2">
          {SCOPES.map(s => {
            const count = scopeCounts[s.value] ?? 0;
            if (!count) return null;
            return (
              <div key={s.value}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${SCOPE_COLORS[s.value] ?? 'bg-gray-100 text-gray-600'} border-transparent`}>
                <Globe className="w-3.5 h-3.5" />
                <span className="text-xs font-semibold">{s.label}</span>
                <span className="text-xs font-black bg-white/60 px-1.5 py-0.5 rounded-lg">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-52 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по имени, email, роли..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
        </div>
        <select value={scopeFilter} onChange={e => setScopeFilter(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700">
          <option value="all">Все Scope</option>
          {SCOPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        {(search || scopeFilter !== 'all') && (
          <button onClick={() => { setSearch(''); setScopeFilter('all'); }}
            className="px-4 py-2.5 border border-orange-200 bg-orange-50 text-orange-700 rounded-xl text-sm font-medium hover:bg-orange-100 transition-colors flex items-center gap-1.5">
            <X className="w-3.5 h-3.5" />Сбросить
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Пользователь', 'Роль', 'Scope', 'Разделы кабинета', 'Тип доступа', ''].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(user => {
              const mods = getEffectiveModules(user);
              const isCustom = user.cabinetModules !== null;
              const isExpanded = expandedId === user.id;
              const roleBadge = COLOR_BADGE[ROLE_COLORS[user.role] ?? 'blue'] ?? COLOR_BADGE.blue;
              const scopeColor = SCOPE_COLORS[user.scopeType] ?? 'bg-gray-100 text-gray-600';

              return (
                <React.Fragment key={user.id}>
                  <tr className={`hover:bg-gray-50 transition-colors ${isExpanded ? 'bg-blue-50/30' : ''}`}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 bg-gradient-to-br ${avatarGradient(user.id)} rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                          {initials(user.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                          <p className="text-xs text-gray-400 truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${roleBadge}`}>
                        <Shield className="w-2.5 h-2.5" />{ROLE_LABELS[user.role] ?? user.role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col gap-0.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${scopeColor} w-fit`}>
                          <Globe className="w-2.5 h-2.5" />{user.scopeType}
                        </span>
                        {user.scopeValue && <span className="text-[10px] font-mono text-gray-400">{user.scopeValue}</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(mods.length / ALL_MODULES.length) * 100}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-gray-700">{mods.length} / {ALL_MODULES.length}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold ${isCustom ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                        {isCustom
                          ? <span className="inline-flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Кастомный</span>
                          : <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />По роли</span>}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setExpandedId(isExpanded ? null : user.id)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title="Показать модули">
                          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        <button onClick={() => setEditingUser(user)}
                          className="p-1.5 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded-lg transition-colors" title="Редактировать">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {/* Expanded modules row */}
                  {isExpanded && (
                    <tr>
                      <td colSpan={6} className="px-5 pb-4 bg-blue-50/20">
                        <div className="pt-2">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Доступные разделы</p>
                          <div className="flex flex-wrap gap-1.5">
                            {ALL_MODULES.map(mod => {
                              const active = mods.includes(mod.key as ModuleKey);
                              const Icon = mod.icon;
                              return (
                                <span key={mod.key}
                                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border ${active ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-gray-100 bg-gray-50 text-gray-400 opacity-60'}`}>
                                  <Icon className="w-3 h-3" />{mod.label}
                                  {active && <Check className="w-2.5 h-2.5 text-blue-500" />}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-16 text-center">
                  <Layers className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">Нет пользователей по выбранным критериям</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      <AnimatePresence>
        {editingUser && (
          <EditCabinetModal
            user={editingUser}
            onSave={handleSave}
            onClose={() => setEditingUser(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}