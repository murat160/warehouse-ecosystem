/**
 * UserAccessTab — "Роли и доступ" вкладка профиля сотрудника.
 *
 * Показывает:
 *  - Текущую роль (с возможностью открыть смену роли)
 *  - Inherited permissions (от роли)
 *  - Custom allowed permissions (extraAllow) — toggle
 *  - Custom denied permissions (extraDeny) — toggle
 *  - Кнопки: «Сбросить к роли» / «Скопировать доступ от другого»
 *  - Audit изменений доступа (последние 5 событий)
 */
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Shield, Plus, Minus, RotateCcw, Copy, Layers, Eye, ChevronDown, ChevronRight,
  Check, X, AlertTriangle,
} from 'lucide-react';
import {
  PREDEFINED_ROLES, SIDEBAR_MODULES, BASE_VERBS, SPECIAL_PERMS,
  permsForModule, getRoleByName,
} from '../../data/rbac';
import {
  effectivePermissions, INITIAL_USERS, ROLE_LABELS, ROLE_COLORS, COLOR_BADGE,
  type ManagedUser,
} from '../../data/rbac-data';
import { audit, getAudit } from '../../data/audit-store';
import { useAuth } from '../../contexts/AuthContext';

const VERB_LABELS: Record<string, string> = {
  view: 'Просмотр', create: 'Создание', edit: 'Редактирование',
  delete: 'Удаление', archive: 'Архив', export: 'Экспорт',
  approve: 'Одобрение', reject: 'Отклонение', upload: 'Загрузка',
  download: 'Скачивание', manage: 'Управление', assign: 'Назначение',
  block: 'Блокировка', unblock: 'Разблокировка',
  request_documents: 'Запрос документов', resolve: 'Решение',
  audit_view: 'Аудит-лог',
};

interface Props {
  user:              ManagedUser;
  onOpenChangeRole?: () => void;
}

export function UserAccessTab({ user, onOpenChangeRole }: Props) {
  const { user: actor, impersonateUser } = useAuth();
  const [, force] = useState(0);
  const [openMods, setOpenMods] = useState<Set<string>>(new Set(['products', 'finance']));
  const [showCopy, setShowCopy] = useState(false);
  const [search, setSearch] = useState('');

  const role = getRoleByName(user.role);
  const isWildcard = role.permissions.includes('*');

  const allow = user.extraAllow ?? [];
  const deny  = user.extraDeny  ?? [];
  const effective = useMemo(() => effectivePermissions(role.permissions, allow, deny),
                            [role.permissions, allow, deny]);

  function toggleMod(key: string) {
    setOpenMods(prev => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key); else n.add(key);
      return n;
    });
  }

  function addAllow(perm: string) {
    if (!user.extraAllow) user.extraAllow = [];
    if (!user.extraAllow.includes(perm)) user.extraAllow.push(perm);
    user.extraDeny = (user.extraDeny ?? []).filter(p => p !== perm);
    audit('user.perm.add', user.email, `Дополнительно разрешено: ${perm}`,
          actor?.name, actor?.role);
    force(x => x + 1);
    toast.success(`+ ${perm}`);
  }

  function addDeny(perm: string) {
    if (!user.extraDeny) user.extraDeny = [];
    if (!user.extraDeny.includes(perm)) user.extraDeny.push(perm);
    user.extraAllow = (user.extraAllow ?? []).filter(p => p !== perm);
    audit('user.perm.remove', user.email, `Запрещено: ${perm}`,
          actor?.name, actor?.role);
    force(x => x + 1);
    toast.success(`− ${perm}`);
  }

  function clearOverride(perm: string) {
    user.extraAllow = (user.extraAllow ?? []).filter(p => p !== perm);
    user.extraDeny  = (user.extraDeny  ?? []).filter(p => p !== perm);
    audit('user.access.change', user.email, `Override снят с ${perm}`,
          actor?.name, actor?.role);
    force(x => x + 1);
  }

  function resetToRole() {
    user.extraAllow = [];
    user.extraDeny  = [];
    audit('user.access.reset', user.email, `Доступ сброшен к роли ${user.role}`,
          actor?.name, actor?.role);
    force(x => x + 1);
    toast.success('Доступ сброшен к роли');
  }

  function copyFrom(srcUserId: string) {
    const src = INITIAL_USERS.find(u => u.id === srcUserId);
    if (!src) return;
    user.extraAllow = [...(src.extraAllow ?? [])];
    user.extraDeny  = [...(src.extraDeny  ?? [])];
    audit('user.access.copy', user.email,
          `Скопирован custom-доступ от ${src.email}`, actor?.name, actor?.role);
    force(x => x + 1);
    setShowCopy(false);
    toast.success(`Доступ скопирован от ${src.name}`);
  }

  function previewAs() {
    impersonateUser(user.id);
    toast.success(`Просмотр от имени ${user.name}`);
  }

  // Audit events related to this user
  const userAudit = useMemo(() => getAudit().filter(e => e.target === user.email).slice(0, 6), []);

  return (
    <div className="p-4 space-y-4">
      {/* Current role */}
      <section className="bg-blue-50 border border-blue-200 rounded-xl p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-blue-700 font-bold">Текущая роль</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${COLOR_BADGE[ROLE_COLORS[user.role] ?? 'blue']}`}>
                <Shield className="w-3 h-3 inline mr-1" />
                {ROLE_LABELS[user.role] ?? user.role}
              </span>
              {user.position && <span className="text-xs text-gray-600">{user.position}</span>}
              {user.department && <span className="text-[11px] text-gray-500">· {user.department}</span>}
            </div>
            <p className="text-[11px] text-gray-600 mt-1">
              Базовых прав: {isWildcard ? '∞' : role.permissions.length} ·
              Эффективных: <span className="font-bold">{effective.includes('*') ? '∞' : effective.length}</span>
              {(allow.length > 0 || deny.length > 0) && (
                <span className="ml-2 text-amber-700 font-semibold">
                  · custom (+{allow.length} / −{deny.length})
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-col gap-1.5 shrink-0">
            <button onClick={onOpenChangeRole}
              className="flex items-center gap-1 px-2 py-1 bg-white border border-blue-300 hover:bg-blue-100 text-blue-700 rounded text-[11px] font-semibold">
              <Layers className="w-3 h-3" />Сменить
            </button>
            <button onClick={previewAs}
              className="flex items-center gap-1 px-2 py-1 bg-violet-100 hover:bg-violet-200 text-violet-700 rounded text-[11px] font-semibold">
              <Eye className="w-3 h-3" />Preview
            </button>
          </div>
        </div>
      </section>

      {/* Quick actions */}
      <section className="grid grid-cols-2 gap-2">
        <button onClick={resetToRole} disabled={allow.length + deny.length === 0}
          className="flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 hover:bg-gray-50 disabled:opacity-50 rounded-lg text-xs font-semibold text-gray-700">
          <RotateCcw className="w-3.5 h-3.5" />Сбросить к роли
        </button>
        <button onClick={() => setShowCopy(v => !v)}
          className="flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 hover:bg-gray-50 rounded-lg text-xs font-semibold text-gray-700">
          <Copy className="w-3.5 h-3.5" />Скопировать от другого
        </button>
      </section>

      {showCopy && (
        <section className="bg-white border border-gray-200 rounded-xl p-3">
          <p className="text-xs font-bold text-gray-700 mb-2">Выберите сотрудника-источник</p>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {INITIAL_USERS.filter(u => u.id !== user.id).map(u => (
              <button key={u.id} onClick={() => copyFrom(u.id)}
                className="w-full text-left px-2.5 py-1.5 hover:bg-blue-50 rounded text-xs flex items-center justify-between">
                <span>{u.name} · <span className="text-gray-500">{ROLE_LABELS[u.role] ?? u.role}</span></span>
                <span className="text-[10px] text-gray-400">+{u.extraAllow?.length ?? 0} / −{u.extraDeny?.length ?? 0}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Custom-overrides summary */}
      {(allow.length > 0 || deny.length > 0) && (
        <section className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-[10px] uppercase font-bold text-amber-800 mb-2">Custom overrides</p>
          {allow.length > 0 && (
            <div className="mb-2">
              <p className="text-[10px] font-semibold text-green-700 mb-1">+ Дополнительно разрешено ({allow.length})</p>
              <div className="flex flex-wrap gap-1">
                {allow.map(p => (
                  <span key={p} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-100 text-green-800 rounded text-[10px] font-mono">
                    {p}
                    <button onClick={() => clearOverride(p)} className="hover:text-red-600"><X className="w-2.5 h-2.5" /></button>
                  </span>
                ))}
              </div>
            </div>
          )}
          {deny.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-rose-700 mb-1">− Запрещено ({deny.length})</p>
              <div className="flex flex-wrap gap-1">
                {deny.map(p => (
                  <span key={p} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-rose-100 text-rose-800 rounded text-[10px] font-mono">
                    {p}
                    <button onClick={() => clearOverride(p)} className="hover:text-red-600"><X className="w-2.5 h-2.5" /></button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Permission matrix per module */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-gray-700">Permission matrix</p>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Поиск permission..."
            className="px-2 py-1 border border-gray-200 rounded text-xs w-40" />
        </div>
        <div className="space-y-1">
          {SIDEBAR_MODULES.map(mod => {
            const isOpen = openMods.has(mod.key);
            const modPerms = permsForModule(mod.key);
            const visible = !search || modPerms.some(p => p.toLowerCase().includes(search.toLowerCase()));
            if (!visible && !search.toLowerCase().startsWith(mod.key.toLowerCase())) return null;

            const grantedCount = modPerms.filter(p => effective.includes('*') || effective.includes(p)).length;

            return (
              <div key={mod.key} className="border border-gray-100 rounded-lg overflow-hidden">
                <button onClick={() => toggleMod(mod.key)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left">
                  {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                  <mod.icon className="w-3.5 h-3.5 text-gray-500" />
                  <span className="text-xs font-semibold text-gray-800 flex-1">{mod.label}</span>
                  <span className="text-[10px] text-gray-500">{grantedCount}/{modPerms.length}</span>
                </button>
                {isOpen && (
                  <div className="px-3 pb-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {modPerms.map(p => {
                      const verb = p.split('.').pop() ?? p;
                      const fromRole = isWildcard || role.permissions.includes(p);
                      const isAllowed = effective.includes('*') || effective.includes(p);
                      const isExtraAllow = allow.includes(p);
                      const isExtraDeny  = deny.includes(p);
                      return (
                        <div key={p} className={`flex items-center gap-2 px-2 py-1 rounded text-[11px] ${
                          isExtraDeny  ? 'bg-rose-50' :
                          isExtraAllow ? 'bg-green-50' :
                          isAllowed    ? 'bg-gray-50'  :
                          'bg-white'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            isAllowed ? (fromRole ? 'bg-blue-500' : 'bg-green-500') : 'bg-gray-300'
                          }`} />
                          <span className="flex-1 truncate" title={p}>{VERB_LABELS[verb] ?? verb}</span>
                          {isExtraAllow && <span className="text-[9px] text-green-700 font-bold">+custom</span>}
                          {isExtraDeny  && <span className="text-[9px] text-rose-700 font-bold">−deny</span>}
                          {!isWildcard && (
                            <div className="flex gap-0.5 shrink-0">
                              {!isAllowed && (
                                <button onClick={() => addAllow(p)} title="Дать право" className="p-0.5 hover:bg-green-100 rounded"><Plus className="w-2.5 h-2.5 text-green-700" /></button>
                              )}
                              {isAllowed && (
                                <button onClick={() => addDeny(p)} title="Запретить" className="p-0.5 hover:bg-rose-100 rounded"><Minus className="w-2.5 h-2.5 text-rose-700" /></button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Special perms group */}
          <div className="border border-amber-200 rounded-lg overflow-hidden">
            <button onClick={() => toggleMod('__special__')}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-amber-50/40 text-left bg-amber-50/30">
              {openMods.has('__special__') ? <ChevronDown className="w-3.5 h-3.5 text-amber-600" /> : <ChevronRight className="w-3.5 h-3.5 text-amber-600" />}
              <span className="text-xs font-semibold text-amber-900 flex-1">Специальные permissions</span>
              <span className="text-[10px] text-amber-700">{SPECIAL_PERMS.length}</span>
            </button>
            {openMods.has('__special__') && (
              <div className="px-3 pb-2 space-y-0.5">
                {SPECIAL_PERMS.filter(p => !search || p.includes(search.toLowerCase())).map(p => {
                  const fromRole = isWildcard || role.permissions.includes(p);
                  const isAllowed = effective.includes('*') || effective.includes(p);
                  const isExtraAllow = allow.includes(p);
                  const isExtraDeny  = deny.includes(p);
                  return (
                    <div key={p} className={`flex items-center gap-2 px-2 py-1 rounded text-[11px] ${
                      isExtraDeny ? 'bg-rose-50' : isExtraAllow ? 'bg-green-50' : isAllowed ? 'bg-gray-50' : 'bg-white'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isAllowed ? (fromRole ? 'bg-blue-500' : 'bg-green-500') : 'bg-gray-300'}`} />
                      <span className="flex-1 font-mono">{p}</span>
                      {isExtraAllow && <span className="text-[9px] text-green-700 font-bold">+custom</span>}
                      {isExtraDeny  && <span className="text-[9px] text-rose-700 font-bold">−deny</span>}
                      {!isWildcard && (
                        <div className="flex gap-0.5 shrink-0">
                          {!isAllowed && <button onClick={() => addAllow(p)} className="p-0.5 hover:bg-green-100 rounded"><Plus className="w-2.5 h-2.5 text-green-700" /></button>}
                          {isAllowed && <button onClick={() => addDeny(p)} className="p-0.5 hover:bg-rose-100 rounded"><Minus className="w-2.5 h-2.5 text-rose-700" /></button>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Recent audit */}
      {userAudit.length > 0 && (
        <section>
          <p className="text-xs font-bold text-gray-700 mb-2">Audit изменений доступа</p>
          <div className="space-y-1">
            {userAudit.map((e, i) => (
              <div key={i} className="px-2 py-1.5 bg-gray-50 rounded text-[11px]">
                <p className="text-gray-800">{e.detail}</p>
                <p className="text-[9px] text-gray-500">{e.actor} · {e.actorRole} · {e.at}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {isWildcard && (
        <section className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>SuperAdmin имеет полный доступ (*). Custom permissions для этой роли не применяются.</span>
        </section>
      )}
    </div>
  );
}
