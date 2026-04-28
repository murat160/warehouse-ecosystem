import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Clock, ListTodo, ShoppingCart, Package,
  ScanLine, PackageCheck, Truck, ArrowDownToLine, Boxes,
  Grid3x3, ClipboardCheck, Undo2, AlertTriangle, FileText, BarChart3,
  LogOut,
} from 'lucide-react';
import { toast } from 'sonner';
import { useStore, store } from '../store/useStore';

const NAV = [
  { to: '/',          label: 'Дашборд',           icon: LayoutDashboard },
  { to: '/shift',     label: 'Смена',             icon: Clock },
  { to: '/tasks',     label: 'Задачи',            icon: ListTodo },
  { to: '/picking',   label: 'Сборка',            icon: ShoppingCart },
  { to: '/packing',   label: 'Упаковка',          icon: Package },
  { to: '/scanner',   label: 'Сканер',            icon: ScanLine },
  { to: '/ready',     label: 'Готово к выдаче',   icon: PackageCheck },
  { to: '/handoff',   label: 'Передача курьеру',  icon: Truck },
  { to: '/inbound',   label: 'Приёмка',           icon: ArrowDownToLine },
  { to: '/inventory', label: 'Остатки',           icon: Boxes },
  { to: '/bins',      label: 'Ячейки',            icon: Grid3x3 },
  { to: '/count',     label: 'Инвентаризация',    icon: ClipboardCheck },
  { to: '/returns',   label: 'Возвраты',          icon: Undo2 },
  { to: '/problems',  label: 'Проблемы',          icon: AlertTriangle },
  { to: '/documents', label: 'Документы',         icon: FileText },
  { to: '/reports',   label: 'Отчёты',            icon: BarChart3 },
];

const BOTTOM = [
  { to: '/',          label: 'Главная',  icon: LayoutDashboard },
  { to: '/tasks',     label: 'Задачи',   icon: ListTodo },
  { to: '/scanner',   label: 'Сканер',   icon: ScanLine },
  { to: '/inventory', label: 'Остатки',  icon: Boxes },
  { to: '/reports',   label: 'Отчёты',   icon: BarChart3 },
];

export function AppShell() {
  const { currentWorker } = useStore();
  const nav = useNavigate();

  const onLogout = () => {
    store.logout();
    toast('Вы вышли');
    nav('/login');
  };

  return (
    <div className="min-h-screen flex bg-[#F5F6F8]">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex w-60 flex-col bg-white border-r border-[#E5E7EB] sticky top-0 h-screen">
        <div className="px-5 py-4 border-b border-[#F3F4F6]">
          <div className="text-[16px] text-[#1F2430]" style={{ fontWeight: 900 }}>Warehouse App</div>
          <div className="text-[11px] text-[#6B7280] mt-0.5" style={{ fontWeight: 500 }}>
            рабочее приложение склада
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {NAV.map(item => {
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
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-[#F3F4F6] p-4">
          <div className="text-[12px] text-[#1F2430]" style={{ fontWeight: 700 }}>
            {currentWorker?.name ?? '—'}
          </div>
          <div className="text-[11px] text-[#6B7280] mb-3" style={{ fontWeight: 500 }}>
            {currentWorker?.id ?? ''} · {currentWorker?.role ?? ''}
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 text-[12px] text-[#EF4444] active-press"
            style={{ fontWeight: 700 }}
          >
            <LogOut className="w-4 h-4" />
            Выйти
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 bg-[#1F2430] text-white px-4 h-12 flex items-center justify-between">
        <div className="text-[14px]" style={{ fontWeight: 800 }}>Warehouse</div>
        <div className="text-[11px] opacity-70">{currentWorker?.name ?? '—'}</div>
      </header>

      {/* Main */}
      <main className="flex-1 min-w-0 pt-12 md:pt-0">
        <Outlet />
      </main>

      {/* Mobile bottom bar */}
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
                `flex flex-col items-center justify-center py-2 gap-0.5 ${
                  isActive ? 'text-[#2EA7E0]' : 'text-[#9CA3AF]'
                }`
              }
              style={({ isActive }) => ({ fontWeight: isActive ? 800 : 600 })}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[10px]">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
