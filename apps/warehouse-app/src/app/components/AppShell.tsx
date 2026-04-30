import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Clock, ListTodo, ShoppingCart, Package, ScanLine,
  PackageCheck, Truck, ArrowDownToLine, Boxes, Grid3x3, ClipboardCheck,
  Undo2, AlertTriangle, FileText, BarChart3, LogOut, ListChecks,
  Settings, Move, FileWarning, ShieldAlert, MessagesSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import { useStore, store } from '../store/useStore';
import { ROLE_LABELS } from '../domain/roles';
import { can, type Permission } from '../domain/roles';

interface NavItem { to: string; label: string; icon: any; perm: Permission; }

const NAV: NavItem[] = [
  { to: '/shift',         label: 'Моя смена',          icon: Clock,           perm: 'view_dashboard' },
  { to: '/',              label: 'Dashboard',          icon: LayoutDashboard, perm: 'view_dashboard' },
  { to: '/tasks',         label: 'Задачи',             icon: ListTodo,        perm: 'view_tasks' },
  { to: '/orders',        label: 'Заказы на сборку',   icon: ListChecks,      perm: 'pick' },
  { to: '/picking',       label: 'Сборка',             icon: ShoppingCart,    perm: 'pick' },
  { to: '/sorting',       label: 'Сортировка',         icon: Grid3x3,         perm: 'sort' },
  { to: '/packing',       label: 'Упаковка',           icon: Package,         perm: 'pack' },
  { to: '/ready',         label: 'Готово к выдаче',    icon: PackageCheck,    perm: 'handoff' },
  { to: '/handoff',       label: 'Передача курьеру',   icon: Truck,           perm: 'handoff' },
  { to: '/inbound',       label: 'Приёмка',            icon: ArrowDownToLine, perm: 'receive' },
  { to: '/inventory',     label: 'Остатки',            icon: Boxes,           perm: 'inventory' },
  { to: '/bins',          label: 'Ячейки',             icon: Grid3x3,         perm: 'inventory' },
  { to: '/count',         label: 'Инвентаризация',     icon: ClipboardCheck,  perm: 'count' },
  { to: '/movements',     label: 'Перемещения',        icon: Move,            perm: 'move' },
  { to: '/returns',       label: 'Возвраты',           icon: Undo2,           perm: 'returns' },
  { to: '/problems',      label: 'Проблемы',           icon: AlertTriangle,   perm: 'problems' },
  { to: '/claims',        label: 'Жалобы и доказательства', icon: ShieldAlert, perm: 'claims' },
  { to: '/evidence-log',  label: 'Отправки поставщикам',    icon: FileText,    perm: 'claims' },
  { to: '/supplier-disputes', label: 'Споры с поставщиками', icon: FileWarning, perm: 'supplier_disputes' },
  { to: '/internal-chat', label: 'Внутренний чат',          icon: MessagesSquare, perm: 'view_dashboard' },
  { to: '/scanner',       label: 'Сканер',             icon: ScanLine,        perm: 'scanner' },
  { to: '/documents',     label: 'Документы',          icon: FileText,        perm: 'documents' },
  { to: '/reports',       label: 'Отчёты',             icon: BarChart3,       perm: 'view_reports' },
  { to: '/shift-settings',label: 'Настройки смены',    icon: Settings,        perm: 'configure_shift' },
];

const BOTTOM = [
  { to: '/',              label: 'Главная',  icon: LayoutDashboard },
  { to: '/tasks',         label: 'Задачи',   icon: ListTodo },
  { to: '/internal-chat', label: 'Чат',      icon: MessagesSquare },
  { to: '/scanner',       label: 'Сканер',   icon: ScanLine },
  { to: '/problems',      label: 'Проблемы', icon: AlertTriangle },
];

// Простой sidebar для обычного складчика — задачи + сборка + сканер + проблемы + жалобы + чат + документы.
const WORKER_PATHS = new Set(['/shift', '/tasks', '/picking', '/scanner', '/problems', '/claims', '/internal-chat', '/documents']);

export function AppShell() {
  const { currentWorker, problems, chatThreads } = useStore();
  const nav = useNavigate();
  const role = currentWorker?.role;
  const isSimpleWorker = role === 'warehouse_worker';
  const items = isSimpleWorker
    ? NAV.filter(n => WORKER_PATHS.has(n.to))
    : NAV.filter(n => can(role, n.perm));
  const openProblems = problems.filter(p => p.status !== 'resolved').length;
  const unreadChats = currentWorker
    ? chatThreads.filter(t =>
        t.status !== 'closed' &&
        t.messages.length > 0 &&
        !t.readBy.includes(currentWorker.id) &&
        (t.participantIds.includes(currentWorker.id) || t.assignedTo === currentWorker.id || t.kind === 'shift')
      ).length
    : 0;

  const onLogout = () => {
    store.logout();
    toast('Вы вышли');
    nav('/login');
  };

  return (
    <div className="min-h-screen flex bg-[#F5F6F8]">
      <aside className="hidden md:flex w-64 flex-col bg-white border-r border-[#E5E7EB] sticky top-0 h-screen">
        <div className="px-5 py-4 border-b border-[#F3F4F6]">
          <div className="text-[16px] text-[#1F2430]" style={{ fontWeight: 900 }}>Warehouse App</div>
          <div className="text-[11px] text-[#6B7280] mt-0.5" style={{ fontWeight: 500 }}>
            рабочее приложение склада
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
                {item.to === '/internal-chat' && unreadChats > 0 && (
                  <span className="ml-auto text-[10px] bg-[#7C3AED] text-white rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center" style={{ fontWeight: 800 }}>
                    {unreadChats}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-[#F3F4F6] p-4">
          <div className="text-[12px] text-[#1F2430]" style={{ fontWeight: 700 }}>
            {currentWorker?.name ?? '—'}
          </div>
          <div className="text-[11px] text-[#6B7280] mb-3" style={{ fontWeight: 500 }}>
            {currentWorker?.id ?? ''} · {currentWorker ? ROLE_LABELS[currentWorker.role] : ''}
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

      <header className="md:hidden fixed top-0 left-0 right-0 z-30 bg-[#1F2430] text-white px-4 h-12 flex items-center justify-between">
        <div className="text-[14px]" style={{ fontWeight: 800 }}>Warehouse</div>
        <div className="text-[11px] opacity-70">{currentWorker?.name ?? '—'}</div>
      </header>

      <main className="flex-1 min-w-0 pt-12 md:pt-0">
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
                  isActive ? 'text-[#2EA7E0]' : 'text-[#9CA3AF]'
                }`
              }
              style={({ isActive }) => ({ fontWeight: isActive ? 800 : 600 })}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[10px]">{item.label}</span>
              {item.to === '/problems' && openProblems > 0 && (
                <span className="absolute top-1 right-2 text-[8px] bg-[#EF4444] text-white rounded-full min-w-[14px] h-[14px] px-1 flex items-center justify-center" style={{ fontWeight: 800 }}>
                  {openProblems}
                </span>
              )}
              {item.to === '/internal-chat' && unreadChats > 0 && (
                <span className="absolute top-1 right-2 text-[8px] bg-[#7C3AED] text-white rounded-full min-w-[14px] h-[14px] px-1 flex items-center justify-center" style={{ fontWeight: 800 }}>
                  {unreadChats}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
