import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  MapPin,
  ShoppingCart,
  Bike,
  Warehouse,
  Route,
  Store,
  DollarSign,
  MessageSquare,
  Shield,
  BarChart3,
  Settings,
  Bell,
  Search,
  Menu,
  X,
  LogOut,
  User,
  Users,
  Briefcase,
  ScanLine,
  ChevronDown,
  ChevronRight,
  Monitor,
  ClipboardList,
  Network,
  RotateCcw,
  Wallet,
  Megaphone,
  FileText,
  Tag,
  CheckCircle2,
  ShieldCheck,
  Mail,
  Building2,
  Layers,
  Lock,
  LogIn,
  Globe,
  AlertTriangle,
  Key,
  Package,
  Image as ImageIcon,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { unreadCount, subscribe as subscribeNotifs } from '../../store/notificationsStore';
import { NotificationDropdown } from '../ui/NotificationDropdown';
import { ROLE_DEFAULT_MODULES, type ModuleKey } from '../../data/rbac-data';

type NavChild = { name: string; href: string; icon: React.ElementType; moduleKey?: string; tab?: string };
type NavItem = {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  moduleKey?: string;
  end?: boolean;       // exact match only for NavLink active state
  children?: NavChild[];
};

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const [notifCount, setNotifCount] = useState(() => unreadCount());
  const [notifOpen, setNotifOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Distinguish: /products/(categories|media) → "Товары";
  //              /products/(promotions|discounts) → "Продвижение"
  const isPromotionsRoute = (p: string) =>
    p === '/products/promotions' || p === '/products/discounts';
  const isProductsRoute = (p: string) =>
    p === '/products' || p.startsWith('/products/categories') || p.startsWith('/products/media');

  // Track which group is expanded
  const [expandedGroup, setExpandedGroup] = useState<string | null>(() => {
    if (location.pathname.startsWith('/users/')) return 'Пользователи';
    if (location.pathname.startsWith('/chat/wallboard') || location.pathname.startsWith('/support')) {
      return 'Поддержка';
    }
    if (location.pathname.startsWith('/finance/')) return 'Финансы';
    if (isPromotionsRoute(location.pathname)) return 'Продвижение';
    if (isProductsRoute(location.pathname)) return 'Товары';
    if (location.pathname.startsWith('/security/') || location.pathname.startsWith('/approvals')) {
      return 'Безопасность';
    }
    return null;
  });

  // Auto-expand group when location changes
  useEffect(() => {
    if (location.pathname.startsWith('/users/')) {
      setExpandedGroup(g => g === 'Пользователи' ? g : 'Пользователи');
    }
    if (location.pathname.startsWith('/chat/wallboard') || location.pathname.startsWith('/support/tickets')) {
      setExpandedGroup(g => g === 'Поддержка' ? g : 'Поддержка');
    }
    if (location.pathname.startsWith('/finance/')) {
      setExpandedGroup(g => g === 'Финансы' ? g : 'Финансы');
    }
    if (isPromotionsRoute(location.pathname)) {
      setExpandedGroup(g => g === 'Продвижение' ? g : 'Продвижение');
    } else if (isProductsRoute(location.pathname)) {
      setExpandedGroup(g => g === 'Товары' ? g : 'Товары');
    }
    if (location.pathname.startsWith('/security/')) {
      setExpandedGroup(g => g === 'Безопасность' ? g : 'Безопасность');
    }
  }, [location.pathname]);

  useEffect(() => {
    const unsub = subscribeNotifs(() => setNotifCount(unreadCount()));
    return unsub;
  }, []);

  // ── RBAC: determine which modules the current user can access ──────────────
  const canSeeModule = (moduleKey?: string): boolean => {
    if (!moduleKey) return true; // items without moduleKey are always shown
    if (!user) return false;
    // Users with wildcard permissions (demo admin) see everything
    if (user.permissions.includes('*')) return true;
    const allowed = ROLE_DEFAULT_MODULES[user.role] ?? [];
    return allowed.includes(moduleKey as ModuleKey);
  };

  const navigation: NavItem[] = [
    { name: 'Операционная панель', href: '/',               icon: LayoutDashboard, moduleKey: 'dashboard',  end: true },
    {
      name: 'Пользователи',
      href: '/users',
      icon: Users,
      moduleKey: 'users',
      children: [
        { name: 'Все пользователи',    href: '/users',              icon: Users },
        { name: 'Приглашения',         href: '/users/invitations',  icon: Mail },
        { name: 'Команды и отделы',    href: '/users/teams',        icon: Building2 },
        { name: 'Кабинеты и доступ',   href: '/users/cabinets',     icon: Layers },
      ],
    },
    {
      name: 'ПВЗ',
      href: '/pvz',
      icon: MapPin,
      moduleKey: 'pvz',
      children: [
        { name: 'Список ПВЗ',         href: '/pvz',       icon: MapPin },
        { name: 'Терминал сканирования', href: '/pvz/scan', icon: ScanLine },
      ],
    },
    { name: 'Заказы',              href: '/orders',          icon: ShoppingCart,    moduleKey: 'orders',  end: true,
      children: [
        { name: 'Все заказы',       href: '/orders',           icon: ShoppingCart },
        { name: 'Отчёт менеджера',  href: '/orders/report',    icon: FileText },
      ],
    },
    { name: 'Курьеры',             href: '/couriers',        icon: Bike,            moduleKey: 'couriers',   end: true },
    { name: 'Проверка документов', href: '/compliance',      icon: ClipboardList,   moduleKey: 'couriers',   end: true },
    { name: 'Склады',    href: '/warehouses', icon: Warehouse,      moduleKey: 'warehouses' },
    { name: 'Логистика', href: '/logistics',  icon: Route,          moduleKey: 'logistics' },
    { name: 'Продавцы',  href: '/merchants',  icon: Store,          moduleKey: 'merchants' },
    {
      name: 'Товары',
      href: '/products',
      icon: Package,
      moduleKey: 'merchants',
      end: true, // exact match only — sub-routes /products/promotions belong to "Продвижение"
      children: [
        { name: 'Все товары',         href: '/products',            icon: Package },
        { name: 'Категории',          href: '/products/categories', icon: Layers },
        { name: 'Медиа товаров',      href: '/products/media',      icon: ImageIcon },
      ],
    },
    {
      name: 'Продвижение',
      href: '/products/promotions',
      icon: Megaphone,
      moduleKey: 'merchants',
      children: [
        { name: 'Акции и промо',     href: '/products/promotions', icon: Megaphone },
        { name: 'Скидки (глобальные)', href: '/products/discounts',  icon: Tag },
      ],
    },
    {
      name: 'Финансы',
      href: '/finance',
      icon: DollarSign,
      moduleKey: 'finance',
      children: [
        { name: 'Выплаты', href: '/finance/payouts', icon: Wallet },
        { name: 'Возвраты', href: '/finance/refunds', icon: RotateCcw },
      ],
    },
    { name: 'Чат-центр', href: '/chat',       icon: MessageSquare,  moduleKey: 'support', badge: 7, end: true },
    {
      name: 'Поддержка',
      href: '/support/tickets',
      icon: MessageSquare,
      moduleKey: 'support',
      children: [
        { name: 'Wallboard', href: '/chat/wallboard', icon: Monitor },
      ],
    },
    {
      name: 'Безопасность',
      href: '/security/center',
      icon: Shield,
      moduleKey: 'security',
      children: [
        { name: 'Центр безопасности',    href: '/security/center',             icon: Shield },
        { name: 'Журнал аудита',         href: '/security/audit',              icon: FileText },
        { name: 'Роли и права (RBAC)',   href: '/security/rbac',               icon: ShieldCheck },
        { name: 'Политика паролей',      href: '/security/center', tab: 'policies',   icon: Lock },
        { name: 'Сессии и устройства',   href: '/security/center', tab: 'sessions',   icon: Monitor },
        { name: 'Подозрит. входы',       href: '/security/center', tab: 'logins',     icon: LogIn },
        { name: 'IP Access Rules',       href: '/security/center', tab: 'ip',         icon: Globe },
        { name: 'Security Alerts',       href: '/security/center', tab: 'alerts',     icon: AlertTriangle },
        { name: 'Токены и ключи',        href: '/security/center', tab: 'tokens',     icon: Key },
      ],
    },
    { name: 'Центр одобрения', href: '/approvals', icon: CheckCircle2, moduleKey: 'security', badge: 10, end: true },
    { name: 'Аналитика',    href: '/analytics',      icon: BarChart3, moduleKey: 'analytics' },
    { name: 'Настройки',    href: '/settings',       icon: Settings,  moduleKey: 'settings' },
  ];

  // ── System section items (Architecture only — Compliance merged into nav) ──
  const architectureItem: NavItem = {
    name: 'Platform Architecture',
    href: '/system/architecture',
    icon: Network,
    moduleKey: 'settings',
    end: true,
  };

  // Filter regular nav by RBAC
  const filteredNav = navigation.filter(item => canSeeModule(item.moduleKey));

  const SidebarContent = ({ onNavClick }: { onNavClick?: () => void }) => (
    <div style={{ display: 'contents' }}>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {/* Personal cabinet link */}
        <NavLink
          to="/cabinet"
          onClick={onNavClick}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm mb-3 ${
              isActive
                ? 'bg-blue-600 text-white font-semibold'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium'
            }`
          }
        >
          <Briefcase className="w-5 h-5 shrink-0" />
          <span>Мой кабинет</span>
        </NavLink>

        {/* Divider */}
        <div className="border-t border-gray-100 my-2" />

        {filteredNav.map((item) => {
          const hasChildren = item.children && item.children.length > 0;
          const isGroupExpanded = expandedGroup === item.name;
          const isGroupActive = hasChildren && item.children!.some(c => {
            if (c.tab) return location.pathname === c.href && location.search === `?tab=${c.tab}`;
            if (c.href === '/users') return location.pathname === '/users';
            // '/products' is a child of "Товары" group; '/products/promotions' & '/products/discounts'
            // belong to "Продвижение" — match the bare '/products' route exactly so that
            // Promotions/Discounts don't accidentally light up the Товары header.
            if (c.href === '/products') return location.pathname === '/products';
            return location.pathname.startsWith(c.href);
          });

          if (hasChildren) {
            return (
              <div key={item.name}>
                {/* Group header */}
                <div className="flex items-center gap-1">
                  <NavLink
                    to={item.href}
                    end={item.end ?? false}
                    onClick={onNavClick}
                    className={({ isActive }) =>
                      `flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm ${
                        isActive || isGroupActive
                          ? 'bg-blue-50 text-blue-600 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`
                    }
                  >
                    <item.icon className="w-5 h-5 shrink-0" />
                    <span className="flex-1">{item.name}</span>
                  </NavLink>
                  <button
                    onClick={() => setExpandedGroup(isGroupExpanded ? null : item.name)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    title={isGroupExpanded ? 'Свернуть' : 'Развернуть'}
                  >
                    {isGroupExpanded
                      ? <ChevronDown className="w-4 h-4" />
                      : <ChevronRight className="w-4 h-4" />
                    }
                  </button>
                </div>

                {/* Children */}
                {isGroupExpanded && (
                  <div className="mt-0.5 ml-4 pl-3 border-l-2 border-gray-100 space-y-0.5">
                    {item.children!.filter(c => canSeeModule(c.moduleKey)).map((child) => {
                      // Tab-based deep links (e.g., /security/center?tab=sessions)
                      if (child.tab) {
                        const isTabActive =
                          location.pathname === child.href &&
                          location.search === `?tab=${child.tab}`;
                        return (
                          <button
                            key={child.name}
                            onClick={() => {
                              navigate(`${child.href}?tab=${child.tab}`);
                              onNavClick?.();
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm text-left ${
                              isTabActive
                                ? 'bg-blue-50 text-blue-600 font-medium'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            <child.icon className="w-4 h-4 shrink-0" />
                            <span>{child.name}</span>
                          </button>
                        );
                      }
                      // Regular NavLink
                      return (
                        <NavLink
                          key={child.name}
                          to={child.href}
                          end={child.href === '/users' || child.href === '/pvz' || child.href === '/products'}
                          onClick={onNavClick}
                          className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm ${
                              isActive
                                ? 'bg-blue-50 text-blue-600 font-medium'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`
                          }
                        >
                          <child.icon className="w-4 h-4 shrink-0" />
                          <span>{child.name}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          // Regular item
          return (
            <NavLink
              key={item.name}
              to={item.href}
              end={item.end ?? false}
              onClick={onNavClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="flex-1">{item.name}</span>
              {item.badge ? (
                <span className="min-w-[20px] h-5 px-1.5 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {item.badge}
                </span>
              ) : null}
            </NavLink>
          );
        })}

        {/* ── System section — Platform Architecture ── */}
        {canSeeModule('settings') && (
          <div style={{ display: 'contents' }}>
            <div className="border-t border-gray-100 my-2" />
            <p className="px-3 text-[9px] uppercase tracking-widest text-gray-400 font-semibold mb-1">Система</p>
            <NavLink
              to={architectureItem.href}
              end={architectureItem.end}
              onClick={onNavClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm ${
                  isActive
                    ? 'bg-gray-900 text-white font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <Network className="w-5 h-5 shrink-0 text-gray-500" />
              <span className="flex-1">{architectureItem.name}</span>
              <span className="text-[9px] font-semibold px-1.5 py-0.5 bg-gray-900 text-gray-200 rounded-full">API</span>
            </NavLink>
          </div>
        )}
      </nav>

      {/* User info at bottom */}
      {user && (
        <div className="p-4 border-t">
          <NavLink to="/cabinet" onClick={onNavClick} className="flex items-center gap-3 mb-3 p-2 rounded-xl hover:bg-gray-50 transition-colors group">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium shrink-0">
              {user.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-500 group-hover:text-blue-600 transition-colors">{user.role} · Мой кабинет →</p>
            </div>
          </NavLink>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Выйти
          </button>
        </div>
      )}
    </div>
  );

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
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="flex-1 flex items-center gap-4 max-w-2xl mx-auto lg:mx-0 lg:ml-8">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Поиск по заказу, треку, ШК, телефону, ПВЗ..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative" ref={bellRef}>
                <button
                  onClick={() => setNotifOpen(v => !v)}
                  className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  title={notifCount > 0 ? `${notifCount} непрочитанных уведомлений` : 'Уведомления'}
                >
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
              
              {user && (
                <NavLink to="/cabinet"
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors group">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700">{user.role}</span>
                  {user.twoFactorEnabled && (
                    <span className="text-xs text-green-600">2FA</span>
                  )}
                </NavLink>
              )}
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