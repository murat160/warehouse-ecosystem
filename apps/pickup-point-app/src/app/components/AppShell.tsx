import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Clock, ArrowDownToLine, Package, ScanLine,
  Grid3x3, Search, Undo2, AlertTriangle, Truck, Wallet,
  ArrowUpFromLine, FileText, MessagesSquare, BarChart3, Settings,
  LogOut, PackageCheck, UserCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { useStore, store } from '../store/useStore';
import { ROLE_LABELS, can, type Permission } from '../domain/roles';

interface NavItem { to: string; label: string; icon: any; perm: Permission; }

const NAV: NavItem[] = [
  { to: '/',            label: 'Dashboard',          icon: LayoutDashboard, perm: 'view_dashboard' },
  { to: '/shift',       label: 'Моя смена',          icon: Clock,            perm: 'view_shift' },
  { to: '/receiving',   label: 'Приёмка заказов',    icon: ArrowDownToLine,  perm: 'receive_batch' },
  { to: '/orders',      label: 'Заказы в ПВЗ',       icon: Package,          perm: 'view_orders' },
  { to: '/issue',       label: 'Выдача клиенту',     icon: UserCheck,        perm: 'issue_to_customer' },
  { to: '/cells',       label: 'Ячейки / Полки',     icon: Grid3x3,          perm: 'view_orders' },
  { to: '/search',      label: 'Поиск заказа',       icon: Search,           perm: 'view_orders' },
  { to: '/returns',     label: 'Возвраты',           icon: Undo2,            perm: 'view_returns' },
  { to: '/problems',    label: 'Проблемы',           icon: AlertTriangle,    perm: 'view_problems' },
  { to: '/scanner',     label: 'Сканер',             icon: ScanLine,         perm: 'use_scanner' },
  { to: '/handoff',     label: 'Курьеры / Передача', icon: Truck,            perm: 'courier_handoff' },
  { to: '/cash',        label: 'Касса',              icon: Wallet,           perm: 'view_cash' },
  { to: '/collection',  label: 'Инкассация',         icon: ArrowUpFromLine,  perm: 'collection' },
  { to: '/documents',   label: 'Документы',          icon: FileText,         perm: 'view_documents' },
  { to: '/chat',        label: 'Чат',                icon: MessagesSquare,   perm: 'use_chat' },
  { to: '/reports',     label: 'Отчёты',             icon: BarChart3,        perm: 'view_reports' },
  { to: '/settings',    label: 'Настройки ПВЗ',      icon: Settings,         perm: 'configure_pvz' },
];

const BOTTOM = [
  { to: '/',         label: 'Главная',  icon: LayoutDashboard },
  { to: '/scanner',  label: 'Сканер',   icon: ScanLine },
  { to: '/issue',    label: 'Выдача',   icon: PackageCheck },
  { to: '/returns',  label: 'Возвраты', icon: Undo2 },
  { to: '/chat',     label: 'Чат',      icon: MessagesSquare },
];

export function AppShell() {
  const { currentEmployee, problems, chats, returns: rets } = useStore();
  const nav = useNavigate();
  const role = currentEmployee?.role;
  const items = NAV.filter(n => can(role, n.perm));
  const openProblems = problems.filter(p => p.status !== 'resolved' && p.status !== 'rejected').length;
  const unread = chats.reduce((s, c) => s + (c.unreadCount || 0), 0);
  const openReturns = rets.filter(r => r.status !== 'closed' && r.status !== 'refunded' && r.status !== 'rejected').length;

  const onLogout = () => {
    store.logout();
    toast('Вы вышли из системы');
    nav('/login');
  };

  return (
    <div className="min-h-screen flex bg-[#F5F6F8]">
      <aside className="hidden md:flex w-64 flex-col bg-white border-r border-[#E5E7EB] sticky top-0 h-screen">
        <div className="px-5 py-4 border-b border-[#F3F4F6]">
          <div className="text-[16px] text-[#1F2430]" style={{ fontWeight: 900 }}>Ehli Trend PVZ</div>
          <div className="text-[11px] text-[#6B7280] mt-0.5" style={{ fontWeight: 500 }}>
            Пункт выдачи заказов
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {items.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-5 py-2 text-[13px] active-press ${
                    isActive ? 'bg-[#E0F2FE] text-[#0369A1]' : 'text-[#374151] hover:bg-[#F9FAFB]'
                  }`
                }
                style={({ isActive }) => ({ fontWeight: isActive ? 800 : 600 })}
              >
                <Icon className="w-4 h-4" />
                {item.label}
                {item.to === '/problems' && openProblems > 0 && (
                  <span className="ml-auto text-[10px] bg-[#EF4444] text-white rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center" style={{ fontWeight: 800 }}>
                    {openProblems}
                  </span>
                )}
                {item.to === '/chat' && unread > 0 && (
                  <span className="ml-auto text-[10px] bg-[#7C3AED] text-white rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center" style={{ fontWeight: 800 }}>
                    {unread}
                  </span>
                )}
                {item.to === '/returns' && openReturns > 0 && (
                  <span className="ml-auto text-[10px] bg-[#F43F5E] text-white rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center" style={{ fontWeight: 800 }}>
                    {openReturns}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-[#F3F4F6] p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-full bg-[#E0F2FE] flex items-center justify-center text-[#0369A1] text-[16px]" style={{ fontWeight: 900 }}>
              {currentEmployee?.avatar ?? currentEmployee?.name.charAt(0) ?? '?'}
            </div>
            <div className="min-w-0">
              <div className="text-[12px] text-[#1F2430] truncate" style={{ fontWeight: 700 }}>
                {currentEmployee?.name ?? '—'}
              </div>
              <div className="text-[11px] text-[#6B7280] truncate" style={{ fontWeight: 500 }}>
                {currentEmployee ? ROLE_LABELS[currentEmployee.role] : ''}
              </div>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 text-[12px] text-[#EF4444] active-press"
            style={{ fontWeight: 700 }}
          >
            <LogOut className="w-4 h-4" /> Выйти
          </button>
        </div>
      </aside>

      <header className="md:hidden fixed top-0 left-0 right-0 z-30 bg-[#1F2430] text-white px-3 h-12 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-[14px]" style={{ fontWeight: 900 }}>
            {currentEmployee?.avatar ?? currentEmployee?.name.charAt(0) ?? 'E'}
          </div>
          <div className="text-left">
            <div className="text-[12px] truncate max-w-[180px]" style={{ fontWeight: 800 }}>
              {currentEmployee?.name ?? 'Ehli Trend PVZ'}
            </div>
            <div className="text-[10px] opacity-70 truncate max-w-[180px]">
              {currentEmployee ? ROLE_LABELS[currentEmployee.role] : 'Пункт выдачи'}
            </div>
          </div>
        </div>
        <button onClick={onLogout} aria-label="Выйти" className="active-press"><LogOut className="w-4 h-4" /></button>
      </header>

      <main className="flex-1 min-w-0 pt-12 md:pt-0 pb-16 md:pb-0">
        <Outlet />
      </main>

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-[#F3F4F6] grid grid-cols-5"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {BOTTOM.map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-2 gap-0.5 relative ${
                  isActive ? 'text-[#0EA5E9]' : 'text-[#9CA3AF]'
                }`
              }
              style={({ isActive }) => ({ fontWeight: isActive ? 800 : 600 })}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[10px]">{item.label}</span>
              {item.to === '/returns' && openReturns > 0 && (
                <span className="absolute top-1 right-2 text-[8px] bg-[#F43F5E] text-white rounded-full min-w-[14px] h-[14px] px-1 flex items-center justify-center" style={{ fontWeight: 800 }}>
                  {openReturns}
                </span>
              )}
              {item.to === '/chat' && unread > 0 && (
                <span className="absolute top-1 right-2 text-[8px] bg-[#7C3AED] text-white rounded-full min-w-[14px] h-[14px] px-1 flex items-center justify-center" style={{ fontWeight: 800 }}>
                  {unread}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
