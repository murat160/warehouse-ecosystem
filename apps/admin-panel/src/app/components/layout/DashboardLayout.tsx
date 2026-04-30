/**
 * DashboardLayout — main shell with sidebar + header.
 *
 * Sidebar items come from data/rbac.ts (SIDEBAR_MODULES) and are filtered
 * by useAuth().hasPermission(`${item.key}.view`). SuperAdmin sees everything
 * (wildcard '*'). The header includes a role-impersonation switcher so a
 * real SuperAdmin can preview the panel as any predefined role.
 */
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell, Search, Menu, X, LogOut, ChevronDown, ChevronRight, MapPin,
  Briefcase, Shield, Eye,
} from 'lucide-react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { unreadCount, subscribe as subscribeNotifs } from '../../store/notificationsStore';
import { NotificationDropdown } from '../ui/NotificationDropdown';
import {
  SIDEBAR_MODULES, PREDEFINED_ROLES, APP_SCOPE_LABELS,
  type SidebarModule, type SidebarChild,
} from '../../data/rbac';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Group sidebar modules by their `section` field (or 'main' for un-sectioned). */
function groupBySection(modules: SidebarModule[]): { section: string; items: SidebarModule[] }[] {
  const groups: Record<string, SidebarModule[]> = {};
  const order: string[] = [];
  for (const m of modules) {
    const sec = m.section ?? 'main';
    if (!groups[sec]) { groups[sec] = []; order.push(sec); }
    groups[sec].push(m);
  }
  return order.map(s => ({ section: s, items: groups[s] }));
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, realUser, isImpersonating, impersonateRole, logout, hasPermission } = useAuth();
  const [notifCount, setNotifCount] = useState(() => unreadCount());
  const [notifOpen, setNotifOpen] = useState(false);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const roleRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // ── RBAC gate: a sidebar entry is visible only when user has `${key}.view`.
  const canSeeKey = (key?: string): boolean => {
    if (!key) return true;
    return hasPermission(`${key}.view`);
  };

  // Filter modules and their children by RBAC.
  const visibleModules = useMemo<SidebarModule[]>(() => {
    return SIDEBAR_MODULES
      .map(m => ({
        ...m,
        children: m.children?.filter(c => canSeeKey(c.key)),
      }))
      .filter(m => {
        if (canSeeKey(m.key)) return true;
        // Even without parent.view, we keep the parent if any child is visible.
        return (m.children?.length ?? 0) > 0;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.permissions.join(',')]);

  // Track expanded collapsible group
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  // Auto-expand the group whose child route is currently active.
  useEffect(() => {
    const path = location.pathname;
    const search = location.search;
    for (const m of visibleModules) {
      if (!m.children) continue;
      const hit = m.children.some(c => {
        if (c.tab) return path === c.href && search === `?tab=${c.tab}`;
        if (c.exact) return path === c.href;
        return path === c.href || path.startsWith(c.href + '/');
      });
      if (hit && expandedGroup !== m.label) {
        setExpandedGroup(m.label);
        break;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search]);

  useEffect(() => {
    const unsub = subscribeNotifs(() => setNotifCount(unreadCount()));
    return unsub;
  }, []);

  // Close popovers on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (bellRef.current && !bellRef.current.contains(t)) setNotifOpen(false);
      if (roleRef.current && !roleRef.current.contains(t)) setRoleSwitcherOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // Group items by section (Каталог / Финансы / Юридический / Безопасность / Отчётность / Система)
  const groupedSections = useMemo(() => groupBySection(visibleModules), [visibleModules]);

  // ── Sidebar item renderer ────────────────────────────────────────────────
  function renderItem(item: SidebarModule, onNavClick?: () => void) {
    const hasChildren = (item.children?.length ?? 0) > 0;
    const isGroupExpanded = expandedGroup === item.label;
    const isGroupActive = hasChildren && item.children!.some(c => {
      if (c.tab) return location.pathname === c.href && location.search === `?tab=${c.tab}`;
      if (c.exact) return location.pathname === c.href;
      return location.pathname === c.href || location.pathname.startsWith(c.href + '/');
    });

    if (hasChildren) {
      return (
        <div key={item.key}>
          <div className="flex items-center gap-1">
            <NavLink
              to={item.href}
              end={item.exact ?? false}
              onClick={onNavClick}
              className={({ isActive }) =>
                `flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm ${
                  isActive || isGroupActive
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`
              }>
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.badge ? (
                <span className="min-w-[20px] h-5 px-1.5 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {item.badge}
                </span>
              ) : null}
            </NavLink>
            <button
              onClick={() => setExpandedGroup(isGroupExpanded ? null : item.label)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              title={isGroupExpanded ? 'Свернуть' : 'Развернуть'}>
              {isGroupExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
          {isGroupExpanded && (
            <div className="mt-0.5 ml-4 pl-3 border-l-2 border-gray-100 space-y-0.5">
              {item.children!.map(child => renderChild(child, onNavClick))}
            </div>
          )}
        </div>
      );
    }

    return (
      <NavLink
        key={item.key}
        to={item.href}
        end={item.exact ?? false}
        onClick={onNavClick}
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm ${
            isActive ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-100'
          }`
        }>
        <item.icon className="w-5 h-5 shrink-0" />
        <span className="flex-1">{item.label}</span>
        {item.badge ? (
          <span className="min-w-[20px] h-5 px-1.5 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {item.badge}
          </span>
        ) : null}
      </NavLink>
    );
  }

  function renderChild(child: SidebarChild, onNavClick?: () => void) {
    if (child.tab) {
      const isTabActive = location.pathname === child.href && location.search === `?tab=${child.tab}`;
      return (
        <button
          key={child.key + child.tab}
          onClick={() => { navigate(`${child.href}?tab=${child.tab}`); onNavClick?.(); }}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm text-left ${
            isTabActive ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-100'
          }`}>
          <child.icon className="w-4 h-4 shrink-0" />
          <span>{child.label}</span>
        </button>
      );
    }
    return (
      <NavLink
        key={child.key + child.href}
        to={child.href}
        end={child.exact ?? false}
        onClick={onNavClick}
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm ${
            isActive ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-100'
          }`
        }>
        <child.icon className="w-4 h-4 shrink-0" />
        <span>{child.label}</span>
      </NavLink>
    );
  }

  // ── Sidebar content ──────────────────────────────────────────────────────
  const SidebarContent = ({ onNavClick }: { onNavClick?: () => void }) => (
    <div style={{ display: 'contents' }}>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {/* Personal cabinet link (always visible) */}
        <NavLink
          to="/cabinet"
          onClick={onNavClick}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm mb-3 ${
              isActive
                ? 'bg-blue-600 text-white font-semibold'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium'
            }`
          }>
          <Briefcase className="w-5 h-5 shrink-0" />
          <span>Мой кабинет</span>
        </NavLink>

        <div className="border-t border-gray-100 my-2" />

        {groupedSections.map((g, idx) => (
          <div key={g.section}>
            {g.section !== 'main' && (
              <>
                {idx > 0 && <div className="border-t border-gray-100 my-2" />}
                <p className="px-3 mt-2 text-[9px] uppercase tracking-widest text-gray-400 font-semibold mb-1">
                  {g.section}
                </p>
              </>
            )}
            {g.items.map(item => renderItem(item, onNavClick))}
          </div>
        ))}

        {visibleModules.length === 0 && (
          <div className="text-center py-8 text-xs text-gray-400">
            <Shield className="w-6 h-6 mx-auto mb-1 opacity-40" />
            Нет доступных разделов
          </div>
        )}
      </nav>

      {/* User card */}
      {user && (() => {
        const isSuper = user.role === 'SuperAdmin';
        const realIsSuper = realUser?.role === 'SuperAdmin' || realUser?.permissions.includes('*');
        const subtitle = isImpersonating
          ? `Просмотр как: ${user.role}`
          : isSuper
          ? 'Полный доступ · Мой кабинет →'
          : `${user.role} · Мой кабинет →`;
        return (
          <div className="p-4 border-t">
            <NavLink to="/cabinet" onClick={onNavClick} className="flex items-center gap-3 mb-3 p-2 rounded-xl hover:bg-gray-50 transition-colors group">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0 ${
                isSuper && !isImpersonating
                  ? 'bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 ring-2 ring-amber-300/60'
                  : isImpersonating
                  ? 'bg-gradient-to-br from-purple-500 to-indigo-600 ring-2 ring-purple-300/60'
                  : 'bg-gradient-to-br from-blue-500 to-purple-600'
              }`}>
                {(realUser?.name ?? user.name).split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-sm font-medium text-gray-900 truncate">{realUser?.name ?? user.name}</p>
                  {isSuper && !isImpersonating && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-full uppercase tracking-wide leading-none">
                      Super
                    </span>
                  )}
                  {isImpersonating && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-purple-600 text-white rounded-full uppercase tracking-wide leading-none">
                      Test
                    </span>
                  )}
                </div>
                <p className={`text-xs transition-colors group-hover:text-blue-600 ${
                  isSuper && !isImpersonating ? 'text-amber-600 font-semibold'
                  : isImpersonating ? 'text-purple-700 font-semibold'
                  : 'text-gray-500'
                }`}>
                  {subtitle}
                </p>
              </div>
            </NavLink>
            {isImpersonating && realIsSuper && (
              <button
                onClick={() => impersonateRole(null)}
                className="w-full mb-2 flex items-center justify-center gap-2 px-3 py-1.5 text-xs bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-lg font-semibold transition-colors">
                <X className="w-3.5 h-3.5" />Вернуться к SuperAdmin
              </button>
            )}
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <LogOut className="w-4 h-4" />
              Выйти
            </button>
          </div>
        );
      })()}
    </div>
  );

  // ─── Render ──────────────────────────────────────────────────────────────
  const realIsSuper = realUser?.role === 'SuperAdmin' || realUser?.permissions.includes('*');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-gray-900/80" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-72 bg-white border-r flex flex-col">
            <div className="flex h-16 items-center justify-between px-6 border-b bg-gradient-to-r from-blue-600 to-blue-700 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-blue-600" />
                </div>
                <h1 className="text-lg font-bold text-white">PVZ Platform</h1>
              </div>
              <button onClick={() => setSidebarOpen(false)}>
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
            <SidebarContent onNavClick={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col bg-white border-r">
        <div className="flex h-16 items-center px-6 border-b bg-gradient-to-r from-blue-600 to-blue-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-blue-600" />
            </div>
            <h1 className="text-lg font-bold text-white">PVZ Platform</h1>
          </div>
        </div>
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white border-b">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-700">
              <Menu className="w-6 h-6" />
            </button>

            <div className="flex-1 flex items-center gap-4 max-w-2xl mx-auto lg:mx-0 lg:ml-8">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Поиск по заказу, треку, ШК, телефону, ПВЗ..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" />
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Role switcher (visible only for real SuperAdmin) */}
              {realIsSuper && (
                <div className="relative" ref={roleRef}>
                  <button
                    onClick={() => setRoleSwitcherOpen(v => !v)}
                    className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                      isImpersonating
                        ? 'bg-purple-100 hover:bg-purple-200 text-purple-800 border border-purple-300'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-transparent'
                    }`}
                    title="Переключить роль для тестирования">
                    <Eye className="w-4 h-4" />
                    <span>{isImpersonating ? `Test: ${user?.role}` : 'Просмотр как роль'}</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  {roleSwitcherOpen && (
                    <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                      <div className="px-4 py-3 border-b bg-gradient-to-r from-purple-50 to-indigo-50">
                        <p className="text-xs font-bold text-purple-900">Просмотр панели от роли</p>
                        <p className="text-[10px] text-purple-700">SuperAdmin может проверить, что видит каждая роль</p>
                      </div>
                      <div className="max-h-96 overflow-y-auto p-2 space-y-0.5">
                        {isImpersonating && (
                          <button
                            onClick={() => { impersonateRole(null); setRoleSwitcherOpen(false); }}
                            className="w-full text-left px-3 py-2 rounded-lg text-sm bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold flex items-center gap-2 mb-1">
                            <X className="w-3.5 h-3.5" />Вернуться к SuperAdmin
                          </button>
                        )}
                        {/* Admin Panel roles */}
                        <p className="px-3 pt-1 pb-1 text-[9px] uppercase tracking-widest text-gray-400 font-bold">Роли Admin Panel</p>
                        {PREDEFINED_ROLES.filter(r => r.appScope === 'admin').map(r => {
                          const isCurrent = user?.role === r.name;
                          return (
                            <button
                              key={r.id}
                              onClick={() => { impersonateRole(r.name as any); setRoleSwitcherOpen(false); }}
                              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                isCurrent
                                  ? 'bg-blue-50 text-blue-700 font-semibold'
                                  : 'hover:bg-gray-50 text-gray-700'
                              }`}>
                              <p className="font-medium">{r.label}</p>
                              <p className="text-[10px] text-gray-500 truncate">{r.description}</p>
                            </button>
                          );
                        })}
                        {/* External app roles */}
                        <p className="px-3 pt-3 pb-1 text-[9px] uppercase tracking-widest text-purple-700 font-bold">Внешние приложения · preview</p>
                        {PREDEFINED_ROLES.filter(r => r.appScope !== 'admin').map(r => {
                          const isCurrent = user?.role === r.name;
                          return (
                            <button
                              key={r.id}
                              onClick={() => { impersonateRole(r.name as any); setRoleSwitcherOpen(false); }}
                              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                isCurrent
                                  ? 'bg-purple-50 text-purple-800 font-semibold'
                                  : 'hover:bg-purple-50/40 text-gray-700'
                              }`}>
                              <div className="flex items-center gap-1.5">
                                <p className="font-medium">{r.label}</p>
                                <span className="px-1.5 py-0 bg-purple-100 text-purple-700 rounded text-[9px] font-bold uppercase tracking-wide">
                                  {APP_SCOPE_LABELS[r.appScope]}
                                </span>
                              </div>
                              <p className="text-[10px] text-gray-500 truncate">{r.description}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="relative" ref={bellRef}>
                <button
                  onClick={() => setNotifOpen(v => !v)}
                  className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  title={notifCount > 0 ? `${notifCount} непрочитанных уведомлений` : 'Уведомления'}>
                  <Bell className={`w-5 h-5 ${notifCount > 0 ? 'text-violet-600' : ''}`} />
                  {notifCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-0.5 bg-violet-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {notifCount > 9 ? '9+' : notifCount}
                    </span>
                  )}
                </button>
                {notifOpen && (
                  <NotificationDropdown onClose={() => setNotifOpen(false)} />
                )}
              </div>

              {user && (() => {
                const isSuper = user.role === 'SuperAdmin' && !isImpersonating;
                return (
                  <NavLink to="/cabinet"
                    className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors group ${
                      isSuper
                        ? 'bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 hover:from-amber-100 hover:to-orange-100'
                        : isImpersonating
                        ? 'bg-purple-50 border border-purple-300 hover:bg-purple-100'
                        : 'bg-gray-100 hover:bg-blue-50 hover:text-blue-700'
                    }`}>
                    <Shield className={`w-4 h-4 ${isSuper ? 'text-amber-600' : isImpersonating ? 'text-purple-600' : 'text-blue-600'}`} />
                    <span className={`text-sm font-semibold ${
                      isSuper ? 'text-amber-700'
                      : isImpersonating ? 'text-purple-700'
                      : 'text-gray-700 group-hover:text-blue-700'
                    }`}>
                      {isSuper ? 'Супер админ' : user.role}
                    </span>
                    {user.twoFactorEnabled && (
                      <span className="text-xs text-green-600">2FA</span>
                    )}
                  </NavLink>
                );
              })()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
