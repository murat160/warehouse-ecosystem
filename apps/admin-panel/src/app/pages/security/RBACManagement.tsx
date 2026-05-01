/**
 * RBACManagement — single screen to administer roles & permissions.
 *
 * Tabs:
 *  - Roles      — list of roles with search/filter, role detail panel,
 *                 actions (create / edit / copy / disable / delete / export).
 *  - Matrix     — role × permission matrix (one column per role, rows are
 *                 modules with their verbs).
 *  - Assignments — sample list of users, change role inline.
 *  - Audit      — log of role changes (in-memory, persists during session).
 *
 * Built on the registry from data/rbac.ts (PREDEFINED_ROLES + SIDEBAR_MODULES
 * + BASE_VERBS + SPECIAL_PERMS).
 */
import { Fragment, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';
import {
  Plus, Search, Pencil, Copy, Trash2, Ban, CheckCircle2, X, Download,
  ShieldCheck, Shield, Users as UsersIcon, ChevronRight, ChevronDown,
  History, FileText, Eye, Crown, Layers, AlertTriangle, UserCheck,
} from 'lucide-react';
import {
  PREDEFINED_ROLES, SIDEBAR_MODULES, BASE_VERBS, SPECIAL_PERMS,
  permsForModule, APP_SCOPE_LABELS, APP_SCOPE_HOSTS,
  type PredefinedRole, type AppScope,
} from '../../data/rbac';
import { exportToCsv } from '../../utils/downloads';
import { audit as writeAudit } from '../../data/audit-store';
import { useAuth } from '../../contexts/AuthContext';
import { AccessDenied } from '../../components/rbac/AccessDenied';
import { useI18n } from '../../i18n';

type Tab = 'roles' | 'matrix' | 'assignments' | 'audit';

const VERB_LABELS: Record<string, string> = {
  view: 'Просмотр', create: 'Создание', edit: 'Редактирование',
  delete: 'Удаление', archive: 'Архив', export: 'Экспорт',
  approve: 'Одобрение', reject: 'Отклонение', upload: 'Загрузка',
  download: 'Скачивание', manage: 'Управление', assign: 'Назначение',
  block: 'Блокировка', unblock: 'Разблокировка',
  request_documents: 'Запрос документов', resolve: 'Решение',
  audit_view: 'Аудит-лог',
};

const COLOR_BG: Record<string, string> = {
  red:    'bg-red-50 border-red-200', purple: 'bg-purple-50 border-purple-200',
  blue:   'bg-blue-50 border-blue-200', green:  'bg-green-50 border-green-200',
  teal:   'bg-teal-50 border-teal-200', yellow: 'bg-yellow-50 border-yellow-200',
  orange: 'bg-orange-50 border-orange-200', pink:'bg-pink-50 border-pink-200',
  gray:   'bg-gray-50 border-gray-200', indigo: 'bg-indigo-50 border-indigo-200',
  violet: 'bg-violet-50 border-violet-200',
};
const COLOR_DOT: Record<string, string> = {
  red:'bg-red-500',purple:'bg-purple-500',blue:'bg-blue-500',green:'bg-green-500',
  teal:'bg-teal-500',yellow:'bg-yellow-500',orange:'bg-orange-500',pink:'bg-pink-500',
  gray:'bg-gray-500',indigo:'bg-indigo-500',violet:'bg-violet-500',
};
const COLOR_BADGE: Record<string, string> = {
  red:'bg-red-100 text-red-700',purple:'bg-purple-100 text-purple-700',
  blue:'bg-blue-100 text-blue-700',green:'bg-green-100 text-green-700',
  teal:'bg-teal-100 text-teal-700',yellow:'bg-yellow-100 text-yellow-700',
  orange:'bg-orange-100 text-orange-700',pink:'bg-pink-100 text-pink-700',
  gray:'bg-gray-100 text-gray-700',indigo:'bg-indigo-100 text-indigo-700',
  violet:'bg-violet-100 text-violet-700',
};

interface AuditEntry {
  at:     string;
  actor:  string;
  action: string;
}

interface AssignedUser {
  id:    string;
  name:  string;
  email: string;
  role:  string;
}

const INITIAL_USERS: AssignedUser[] = [
  { id: 'u-1', name: 'Карпова Анна',    email: 'karpova@platform.com',    role: 'ShowcaseManager' },
  { id: 'u-2', name: 'Иванов Иван',     email: 'ivanov@platform.com',     role: 'OperationsManager' },
  { id: 'u-3', name: 'Петрова Мария',   email: 'petrova@platform.com',    role: 'PVZManager' },
  { id: 'u-4', name: 'Сидоров Петр',    email: 'sidorov@platform.com',    role: 'Accountant' },
  { id: 'u-5', name: 'Козлова Елена',   email: 'kozlova@platform.com',    role: 'SupportAgent' },
  { id: 'u-6', name: 'Соколов Артём',   email: 'sokolov@platform.com',    role: 'Lawyer' },
  { id: 'u-7', name: 'Морозова Ольга',  email: 'morozova@platform.com',   role: 'ChiefAccountant' },
  { id: 'u-8', name: 'Никитин Денис',   email: 'nikitin@platform.com',    role: 'SecurityOfficer' },
  { id: 'u-9', name: 'Васильева Юлия',  email: 'vasilieva@platform.com',  role: 'MarketingManager' },
  { id: 'u-10', name: 'Лебедев Илья',   email: 'lebedev@platform.com',    role: 'ProductManager' },
  { id: 'u-11', name: 'Осипова Дарья',  email: 'osipova@platform.com',    role: 'Analyst' },
  { id: 'u-12', name: 'Кузнецов Глеб',  email: 'kuznetsov@platform.com',  role: 'WarehouseManager' },
];

function nowStr(): string {
  return new Date().toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RBACManagement() {
  const { hasPermission } = useAuth();
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>('roles');
  const [roles, setRoles] = useState<PredefinedRole[]>(PREDEFINED_ROLES);
  const [users, setUsers] = useState<AssignedUser[]>(INITIAL_USERS);
  const [audit, setAudit] = useState<AuditEntry[]>([
    { at: '14.02.2026 09:00', actor: 'Супер Админ', action: 'Создана роль ShowcaseManager' },
    { at: '12.02.2026 14:30', actor: 'Супер Админ', action: 'Назначена роль Accountant: sidorov@platform.com' },
    { at: '01.02.2026 10:00', actor: 'Супер Админ', action: 'Инициализирована RBAC матрица (17 ролей)' },
  ]);

  const [search, setSearch]                 = useState('');
  const [selectedRole, setSelectedRole]     = useState<PredefinedRole | null>(roles[0] ?? null);
  const [showRoleEditor, setShowRoleEditor] = useState(false);
  const [editing, setEditing]               = useState<PredefinedRole | null>(null);
  const [confirmDelete, setConfirmDelete]   = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set(['products']));

  // ── Filtered roles ────────────────────────────────────────────────────────
  const filteredRoles = useMemo(() => {
    const q = search.toLowerCase();
    return roles.filter(r =>
      !q || r.name.toLowerCase().includes(q) ||
      r.label.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q)
    );
  }, [roles, search]);

  // ── Matrix data ──────────────────────────────────────────────────────────
  const matrixModules = useMemo(() => {
    const result: { key: string; label: string; perms: string[] }[] = [];
    for (const m of SIDEBAR_MODULES) {
      result.push({ key: m.key, label: m.label, perms: permsForModule(m.key) });
      for (const c of m.children ?? []) {
        result.push({ key: c.key, label: `  └ ${c.label}`, perms: permsForModule(c.key) });
      }
    }
    // Special perms group
    result.push({ key: '__special__', label: 'Специальные', perms: [...SPECIAL_PERMS] });
    return result;
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────
  function pushAudit(action: string, category: any = 'role.edit', target = 'system') {
    setAudit(prev => [{ at: nowStr(), actor: 'Супер Админ', action }, ...prev]);
    // Mirror to global audit-store so PersonalCabinet / SecurityAudit see it.
    writeAudit(category, target, action);
  }

  function totalPermsFor(role: PredefinedRole): number {
    if (role.permissions.includes('*')) return Number.POSITIVE_INFINITY;
    return role.permissions.length;
  }

  function isWildcard(role: PredefinedRole): boolean {
    return role.permissions.includes('*');
  }

  function toggleModuleExpansion(key: string) {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function rolePermissionsForModule(role: PredefinedRole, moduleKey: string): string[] {
    if (isWildcard(role)) return permsForModule(moduleKey);
    return role.permissions.filter(p => p.startsWith(moduleKey + '.'));
  }

  // ── Role actions ─────────────────────────────────────────────────────────
  function openCreate() {
    setEditing({
      id: `r-${Date.now()}`, name: 'NewRole', label: 'Новая роль',
      description: '', color: 'blue', isSystem: false, active: true,
      permissions: [], users: 0, appScope: 'admin',
    });
    setShowRoleEditor(true);
  }

  /**
   * Deep-link entry point: navigating here with `?action=create` (e.g. from
   * the Security Center CTA) immediately opens the role editor and then
   * strips the param so the modal doesn't reopen on accidental refresh.
   */
  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      openCreate();
      const next = new URLSearchParams(searchParams);
      next.delete('action');
      setSearchParams(next, { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function openEdit(r: PredefinedRole) {
    setEditing({ ...r, permissions: [...r.permissions] });
    setShowRoleEditor(true);
  }

  function openCopy(r: PredefinedRole) {
    setEditing({
      ...r,
      id: `r-${Date.now()}`,
      name: `${r.name}_Copy`,
      label: `${r.label} (копия)`,
      isSystem: false,
      users: 0,
      permissions: [...r.permissions],
    });
    setShowRoleEditor(true);
  }

  function saveRole() {
    if (!editing) return;
    if (!editing.name.trim()) { toast.error('Введите внутреннее имя роли'); return; }
    if (!editing.label.trim()) { toast.error('Введите отображаемое название'); return; }

    const exists = roles.some(r => r.id === editing.id);
    if (exists) {
      setRoles(prev => prev.map(r => r.id === editing.id ? editing : r));
      pushAudit(`Изменена роль: ${editing.label} (${editing.permissions.length} прав)`);
      toast.success(`Роль обновлена: ${editing.label}`);
    } else {
      setRoles(prev => [...prev, editing]);
      pushAudit(`Создана роль: ${editing.label} (${editing.permissions.length} прав)`);
      toast.success(`Роль создана: ${editing.label}`);
    }
    setSelectedRole(editing);
    setShowRoleEditor(false);
    setEditing(null);
  }

  function toggleActive(r: PredefinedRole) {
    if (r.name === 'SuperAdmin') {
      toast.warning('SuperAdmin нельзя отключить'); return;
    }
    setRoles(prev => prev.map(x => x.id === r.id ? { ...x, active: !x.active } : x));
    pushAudit(`${r.active ? 'Отключена' : 'Включена'} роль: ${r.label}`);
    toast.success(`Роль ${r.active ? 'отключена' : 'включена'}: ${r.label}`);
  }

  function deleteRole(id: string) {
    const r = roles.find(x => x.id === id);
    if (!r) return;
    if (r.isSystem) { toast.error(`Системную роль «${r.label}» нельзя удалить`); return; }
    setRoles(prev => prev.filter(x => x.id !== id));
    if (selectedRole?.id === id) setSelectedRole(roles[0]);
    pushAudit(`Удалена роль: ${r.label}`);
    toast.success(`Роль удалена: ${r.label}`);
    setConfirmDelete(null);
  }

  function exportRolesCsv() {
    exportToCsv(roles.map(r => ({
      name: r.name, label: r.label, description: r.description,
      permissions: r.permissions.join(' | '),
      permsCount: r.permissions.includes('*') ? '∞' : String(r.permissions.length),
      users: String(r.users ?? 0),
      isSystem: r.isSystem ? 'да' : 'нет',
      active: r.active ? 'да' : 'нет',
    })) as any[], [
      { key: 'name',         label: 'Имя'            },
      { key: 'label',        label: 'Название'        },
      { key: 'description',  label: 'Описание'        },
      { key: 'permsCount',   label: 'Прав'            },
      { key: 'users',        label: 'Пользователей'   },
      { key: 'isSystem',     label: 'Системная'       },
      { key: 'active',       label: 'Активна'         },
      { key: 'permissions',  label: 'Permissions'     },
    ], 'rbac-roles');
    toast.success(`Скачан CSV: ${roles.length} ролей`);
  }

  function changeUserRole(userId: string, newRole: string) {
    const u = users.find(x => x.id === userId);
    if (!u) return;
    setUsers(prev => prev.map(x => x.id === userId ? { ...x, role: newRole } : x));
    pushAudit(`Назначена роль ${newRole} → ${u.email}`);
    toast.success(`${u.name}: ${newRole}`);
  }

  // ── Permission editor helpers (inside the role editor modal) ─────────────
  function togglePermission(perm: string) {
    if (!editing) return;
    if (isWildcard(editing)) {
      // can't toggle individual perms when wildcard set
      toast.info('Эта роль имеет полный доступ (*). Снимите wildcard перед отключением отдельных прав.');
      return;
    }
    setEditing({
      ...editing,
      permissions: editing.permissions.includes(perm)
        ? editing.permissions.filter(p => p !== perm)
        : [...editing.permissions, perm],
    });
  }

  function toggleWildcard() {
    if (!editing) return;
    setEditing({ ...editing, permissions: isWildcard(editing) ? [] : ['*'] });
  }

  function toggleAllInModule(moduleKey: string, on: boolean) {
    if (!editing || isWildcard(editing)) return;
    const modPerms = permsForModule(moduleKey);
    setEditing({
      ...editing,
      permissions: on
        ? Array.from(new Set([...editing.permissions, ...modPerms]))
        : editing.permissions.filter(p => !modPerms.includes(p)),
    });
  }

  // ── Render ───────────────────────────────────────────────────────────────
  if (!hasPermission('security.rbac.view')) {
    return <AccessDenied perm="security.rbac.view" path="/admin/security/rbac" />;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <ShieldCheck className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">{t('rbac.title')}</h1>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
              {roles.length} {t('rbac.rolesCount')}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{t('rbac.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportRolesCsv}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm">
            <Download className="w-4 h-4" />{t('rbac.exportCsv')}
          </button>
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm">
            <Plus className="w-4 h-4" />{t('rbac.createRole')}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex flex-wrap gap-1">
          {([
            { id: 'roles',       label: 'Роли',        icon: ShieldCheck },
            { id: 'matrix',      label: 'Матрица',     icon: Layers },
            { id: 'assignments', label: 'Назначения',  icon: UsersIcon },
            { id: 'audit',       label: 'Audit log',   icon: History },
          ] as const).map(t => {
            const isActive = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                  isActive ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}>
                <t.icon className="w-4 h-4" />{t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB: ROLES ─────────────────────────────────────────────────────────── */}
      {tab === 'roles' && (
        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4">
          {/* Left: list */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Поиск роли..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="max-h-[70vh] overflow-y-auto divide-y divide-gray-50">
              {filteredRoles.map(r => {
                const isSelected = selectedRole?.id === r.id;
                return (
                  <button key={r.id} onClick={() => setSelectedRole(r)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                      isSelected ? 'bg-blue-50' : r.active ? '' : 'opacity-60'
                    }`}>
                    <div className="flex items-start gap-2">
                      <span className={`w-2 h-2 rounded-full mt-1.5 ${COLOR_DOT[r.color] ?? 'bg-gray-400'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className={`font-semibold ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>{r.label}</p>
                          {isWildcard(r) && (
                            <span className="px-1.5 py-0 bg-amber-100 text-amber-700 rounded text-[9px] font-bold uppercase tracking-wide flex items-center gap-0.5">
                              <Crown className="w-2.5 h-2.5" />Полный
                            </span>
                          )}
                          {r.isSystem && (
                            <span className="px-1.5 py-0 bg-gray-100 text-gray-600 rounded text-[9px] font-bold uppercase tracking-wide">
                              Sys
                            </span>
                          )}
                          {r.appScope !== 'admin' && (
                            <span className="px-1.5 py-0 bg-purple-100 text-purple-700 rounded text-[9px] font-bold uppercase tracking-wide" title={`Эта роль работает в другом приложении: ${APP_SCOPE_HOSTS[r.appScope]}`}>
                              {APP_SCOPE_LABELS[r.appScope]}
                            </span>
                          )}
                          {!r.active && (
                            <span className="px-1.5 py-0 bg-red-100 text-red-700 rounded text-[9px] font-bold uppercase tracking-wide">
                              Off
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 truncate font-mono">{r.name}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-2">
                          <span><UsersIcon className="w-2.5 h-2.5 inline mr-0.5" />{r.users ?? 0}</span>
                          <span>•</span>
                          <span>{isWildcard(r) ? 'все права' : `${r.permissions.length} прав`}</span>
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
              {filteredRoles.length === 0 && (
                <div className="p-8 text-center text-sm text-gray-400">Роли не найдены</div>
              )}
            </div>
          </div>

          {/* Right: detail */}
          {selectedRole ? (
            <div className={`rounded-xl border ${COLOR_BG[selectedRole.color] ?? 'bg-white border-gray-200'} p-5`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-gray-900">{selectedRole.label}</h2>
                    <span className={`text-xs font-mono px-2 py-0.5 rounded ${COLOR_BADGE[selectedRole.color] ?? 'bg-gray-100 text-gray-700'}`}>
                      {selectedRole.name}
                    </span>
                    {isWildcard(selectedRole) && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 border border-amber-300 text-amber-800 rounded-full text-[10px] font-bold">
                        <Crown className="w-3 h-3" />Полный доступ
                      </span>
                    )}
                    {selectedRole.appScope !== 'admin' && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 border border-purple-300 text-purple-800 rounded-full text-[10px] font-bold">
                        Работает в {APP_SCOPE_LABELS[selectedRole.appScope]}
                      </span>
                    )}
                    {!selectedRole.active && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 border border-red-300 text-red-700 rounded-full text-[10px] font-bold">
                        <Ban className="w-3 h-3" />Отключена
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 mt-1">{selectedRole.description}</p>
                  <p className="text-xs text-gray-500 mt-1.5">
                    <UsersIcon className="w-3 h-3 inline mr-1" />{selectedRole.users ?? 0} пользователей · {' '}
                    {isWildcard(selectedRole) ? '∞' : selectedRole.permissions.length} прав
                    {selectedRole.appScope !== 'admin' && (
                      <> · <span className="font-mono text-purple-700">{APP_SCOPE_HOSTS[selectedRole.appScope]}</span></>
                    )}
                  </p>
                  {selectedRole.appScope !== 'admin' && (
                    <div className="mt-3 px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg text-[11px] text-purple-800 flex items-start gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>
                        Это роль внешнего приложения. Пользователи с ней работают
                        в <span className="font-bold">{APP_SCOPE_LABELS[selectedRole.appScope]}</span>,
                        а не в Admin Panel. Здесь они видны только для управления
                        и preview через «Просмотр как роль».
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => openEdit(selectedRole)} className="p-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg" title="Редактировать">
                    <Pencil className="w-3.5 h-3.5 text-gray-600" />
                  </button>
                  <button onClick={() => openCopy(selectedRole)} className="p-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg" title="Копировать">
                    <Copy className="w-3.5 h-3.5 text-gray-600" />
                  </button>
                  {selectedRole.name !== 'SuperAdmin' && (
                    <button onClick={() => toggleActive(selectedRole)} className={`p-2 border rounded-lg ${selectedRole.active ? 'bg-white border-gray-200 hover:bg-gray-50' : 'bg-green-50 border-green-200 hover:bg-green-100'}`} title={selectedRole.active ? 'Отключить' : 'Включить'}>
                      {selectedRole.active ? <Ban className="w-3.5 h-3.5 text-orange-600" /> : <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />}
                    </button>
                  )}
                  {!selectedRole.isSystem && (
                    <button onClick={() => setConfirmDelete(selectedRole.id)} className="p-2 bg-white border border-red-200 hover:bg-red-50 rounded-lg" title="Удалить">
                      <Trash2 className="w-3.5 h-3.5 text-red-600" />
                    </button>
                  )}
                </div>
              </div>

              {/* Module-grouped permissions */}
              <div className="mt-5 bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                {SIDEBAR_MODULES.map(mod => {
                  const granted = rolePermissionsForModule(selectedRole, mod.key);
                  const total   = permsForModule(mod.key).length;
                  if (granted.length === 0 && !isWildcard(selectedRole)) return null;
                  const isExpanded = expandedModules.has(mod.key);
                  return (
                    <div key={mod.key}>
                      <button onClick={() => toggleModuleExpansion(mod.key)}
                        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 text-left">
                        <mod.icon className="w-4 h-4 text-gray-500 shrink-0" />
                        <span className="text-sm font-semibold text-gray-800">{mod.label}</span>
                        <span className="text-xs text-gray-500 ml-auto">{granted.length}/{total}</span>
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                      </button>
                      {isExpanded && (
                        <div className="px-4 pb-3 flex flex-wrap gap-1">
                          {granted.map(p => {
                            const verb = p.split('.').pop() ?? p;
                            return (
                              <span key={p} className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 border border-green-200 text-green-700 rounded-full text-[10px]">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                {VERB_LABELS[verb] ?? verb}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
                {/* Special perms */}
                {(() => {
                  const specials = isWildcard(selectedRole)
                    ? [...SPECIAL_PERMS]
                    : selectedRole.permissions.filter(p => (SPECIAL_PERMS as readonly string[]).includes(p));
                  if (specials.length === 0) return null;
                  return (
                    <div>
                      <div className="px-4 py-2.5 bg-amber-50/60 flex items-center gap-2">
                        <Crown className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="text-sm font-semibold text-amber-900">Специальные</span>
                        <span className="text-xs text-amber-700 ml-auto">{specials.length} прав</span>
                      </div>
                      <div className="px-4 py-2 flex flex-wrap gap-1">
                        {specials.map(p => (
                          <span key={p} className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-full text-[10px] font-mono">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
              <Shield className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Выберите роль слева</p>
            </div>
          )}
        </div>
      )}

      {/* TAB: MATRIX ────────────────────────────────────────────────────────── */}
      {tab === 'matrix' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50/70 sticky top-0 z-10">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600 sticky left-0 bg-gray-50/70 min-w-[160px]">Раздел / Право</th>
                  {roles.map(r => (
                    <th key={r.id} className="px-2 py-2 text-center font-semibold whitespace-nowrap" title={r.description}>
                      <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${COLOR_BADGE[r.color] ?? 'bg-gray-100 text-gray-700'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${COLOR_DOT[r.color] ?? 'bg-gray-400'}`} />
                        {r.name.length > 14 ? r.name.slice(0, 13) + '…' : r.name}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {matrixModules.map(g => (
                  <Fragment key={g.key}>
                    <tr className="bg-gray-50/40">
                      <td className="px-3 py-1.5 font-bold text-gray-800 sticky left-0 bg-gray-50/40 text-[11px]" colSpan={1 + roles.length}>
                        {g.label}
                      </td>
                    </tr>
                    {g.perms.map(p => {
                      const verb = p.split('.').pop() ?? p;
                      const label = VERB_LABELS[verb] ?? verb;
                      return (
                        <tr key={`${g.key}-${p}`} className="hover:bg-gray-50/40">
                          <td className="px-3 py-1.5 text-gray-700 sticky left-0 bg-white text-[11px] whitespace-nowrap">
                            <span className="text-gray-400 ml-3">{label}</span>
                            <span className="text-gray-300 text-[9px] ml-1 font-mono">{p}</span>
                          </td>
                          {roles.map(r => {
                            const has = isWildcard(r) || r.permissions.includes(p);
                            return (
                              <td key={`${r.id}-${p}`} className="px-2 py-1.5 text-center">
                                {has
                                  ? <span className="inline-block w-3.5 h-3.5 bg-green-500 rounded-sm" />
                                  : <span className="inline-block w-3.5 h-3.5 bg-gray-100 rounded-sm" />
                                }
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: ASSIGNMENTS ───────────────────────────────────────────────────── */}
      {tab === 'assignments' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/70">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Пользователь</th>
                  <th className="text-left px-3 py-3 font-medium text-gray-500">Email</th>
                  <th className="text-left px-3 py-3 font-medium text-gray-500">Текущая роль</th>
                  <th className="text-left px-3 py-3 font-medium text-gray-500">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map(u => {
                  const role = roles.find(r => r.name === u.role);
                  return (
                    <tr key={u.id} className="hover:bg-gray-50/40">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">{u.name}</p>
                      </td>
                      <td className="px-3 py-3 text-gray-700 font-mono text-xs">{u.email}</td>
                      <td className="px-3 py-3">
                        {role ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${COLOR_BADGE[role.color] ?? 'bg-gray-100 text-gray-700'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${COLOR_DOT[role.color] ?? 'bg-gray-400'}`} />
                            {role.label}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <select value={u.role} onChange={e => changeUserRole(u.id, e.target.value)}
                          className="px-2 py-1 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                          {roles.filter(r => r.active).map(r => (
                            <option key={r.id} value={r.name}>{r.label}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: AUDIT ─────────────────────────────────────────────────────────── */}
      {tab === 'audit' && (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
          {audit.length === 0 ? (
            <div className="p-12 text-center text-sm text-gray-400">Журнал пуст</div>
          ) : audit.map((entry, i) => (
            <div key={i} className="px-4 py-3 flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                <UserCheck className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800">{entry.action}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{entry.actor} · {entry.at}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Role editor modal */}
      {showRoleEditor && editing && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowRoleEditor(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex items-center justify-between shrink-0">
              <p className="font-bold text-gray-900">{roles.some(r => r.id === editing.id) ? 'Редактировать роль' : 'Новая роль'}</p>
              <button onClick={() => setShowRoleEditor(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Внутреннее имя *</label>
                  <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })}
                    placeholder="MyCustomRole"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Отображаемое название *</label>
                  <input value={editing.label} onChange={e => setEditing({ ...editing, label: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Описание</label>
                  <input value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Цвет</label>
                  <select value={editing.color} onChange={e => setEditing({ ...editing, color: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {Object.keys(COLOR_BG).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Приложение (appScope)</label>
                  <select value={editing.appScope}
                    onChange={e => setEditing({ ...editing, appScope: e.target.value as AppScope })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {Object.entries(APP_SCOPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-gray-500 mt-1">
                    Admin Panel — управленческая. Остальное — внешние приложения (preview).
                  </p>
                </div>
                <div className="flex items-end gap-2">
                  <button onClick={toggleWildcard}
                    className={`flex-1 px-3 py-2 border rounded-xl text-xs font-semibold transition-colors ${
                      isWildcard(editing) ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}>
                    <Crown className="w-3.5 h-3.5 inline mr-1" />
                    {isWildcard(editing) ? 'Полный доступ (✓)' : 'Дать полный доступ (*)'}
                  </button>
                </div>
              </div>

              {/* Permissions matrix per module */}
              <div className="border-t pt-4">
                <p className="text-xs font-bold text-gray-700 mb-3 flex items-center gap-1.5">
                  <Layers className="w-4 h-4" />Permissions по разделам
                  <span className="text-[10px] text-gray-400 font-normal">
                    {isWildcard(editing) ? 'все права (*)' : `${editing.permissions.length} выбрано`}
                  </span>
                </p>
                <div className="space-y-1">
                  {SIDEBAR_MODULES.map(mod => {
                    const modPerms = permsForModule(mod.key);
                    const granted  = isWildcard(editing) ? modPerms : editing.permissions.filter(p => modPerms.includes(p));
                    const allOn    = granted.length === modPerms.length;
                    return (
                      <details key={mod.key} className="border border-gray-100 rounded-lg" open={granted.length > 0}>
                        <summary className="cursor-pointer flex items-center gap-2 px-3 py-2 hover:bg-gray-50">
                          <mod.icon className="w-4 h-4 text-gray-500" />
                          <span className="text-sm font-semibold text-gray-800 flex-1">{mod.label}</span>
                          <span className="text-xs text-gray-500">{granted.length}/{modPerms.length}</span>
                          <input type="checkbox" checked={allOn}
                            disabled={isWildcard(editing)}
                            onClick={e => e.stopPropagation()}
                            onChange={e => toggleAllInModule(mod.key, e.target.checked)}
                            className="ml-2" />
                        </summary>
                        <div className="px-4 pb-3 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                          {modPerms.map(p => {
                            const verb = p.split('.').pop() ?? p;
                            const checked = isWildcard(editing) || editing.permissions.includes(p);
                            return (
                              <label key={p} className={`flex items-center gap-1.5 text-[11px] px-2 py-1 rounded ${
                                checked ? 'bg-green-50 text-green-800' : 'text-gray-600'
                              }`}>
                                <input type="checkbox" checked={checked}
                                  disabled={isWildcard(editing)}
                                  onChange={() => togglePermission(p)} />
                                {VERB_LABELS[verb] ?? verb}
                              </label>
                            );
                          })}
                        </div>
                      </details>
                    );
                  })}
                  {/* Special perms section */}
                  <details className="border border-amber-200 rounded-lg bg-amber-50/30" open>
                    <summary className="cursor-pointer flex items-center gap-2 px-3 py-2 hover:bg-amber-50/50">
                      <Crown className="w-4 h-4 text-amber-600" />
                      <span className="text-sm font-semibold text-amber-900 flex-1">Специальные permissions</span>
                      <span className="text-xs text-amber-700">
                        {isWildcard(editing) ? SPECIAL_PERMS.length : editing.permissions.filter(p => (SPECIAL_PERMS as readonly string[]).includes(p)).length}/{SPECIAL_PERMS.length}
                      </span>
                    </summary>
                    <div className="px-4 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {SPECIAL_PERMS.map(p => {
                        const checked = isWildcard(editing) || editing.permissions.includes(p);
                        return (
                          <label key={p} className={`flex items-center gap-1.5 text-[11px] px-2 py-1 rounded font-mono ${
                            checked ? 'bg-amber-100 text-amber-900' : 'text-gray-600 hover:bg-amber-50/40'
                          }`}>
                            <input type="checkbox" checked={checked}
                              disabled={isWildcard(editing)}
                              onChange={() => togglePermission(p)} />
                            {p}
                          </label>
                        );
                      })}
                    </div>
                  </details>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex gap-3 shrink-0">
              <button onClick={() => setShowRoleEditor(false)} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">
                Отмена
              </button>
              <button onClick={saveRole} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold">
                {roles.some(r => r.id === editing.id) ? 'Сохранить' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900">Удалить роль?</p>
                <p className="text-sm text-gray-600 mt-1">Это действие необратимо. Пользователи с этой ролью потеряют доступ.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Отмена</button>
              <button onClick={() => deleteRole(confirmDelete)} className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold">Удалить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
