import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Clock, ListTodo, ShoppingCart, Package, ScanLine,
  PackageCheck, Truck, ArrowDownToLine, Boxes, Grid3x3, ClipboardCheck,
  Undo2, AlertTriangle, FileText, BarChart3, LogOut, ListChecks,
  Settings, Move, FileWarning, ShieldAlert, MessagesSquare,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useStore, store } from '../store/useStore';
import { ROLE_LABELS } from '../domain/roles';
import { can, type Permission } from '../domain/roles';
import { useT } from '../i18n';
import { LanguageSwitcher } from './LanguageSwitcher';
import { EmployeeProfileModal } from './EmployeeProfileModal';

interface NavItem { to: string; key: string; icon: any; perm: Permission; }

const NAV: NavItem[] = [
  { to: '/shift',         key: 'nav.shift',          icon: Clock,           perm: 'view_dashboard' },
  { to: '/',              key: 'nav.dashboard',      icon: LayoutDashboard, perm: 'view_dashboard' },
  { to: '/tasks',         key: 'nav.tasks',          icon: ListTodo,        perm: 'view_tasks' },
  { to: '/orders',        key: 'nav.orders',         icon: ListChecks,      perm: 'pick' },
  { to: '/picking',       key: 'nav.picking',        icon: ShoppingCart,    perm: 'pick' },
  { to: '/sorting',       key: 'nav.sorting',        icon: Grid3x3,         perm: 'sort' },
  { to: '/packing',       key: 'nav.packing',        icon: Package,         perm: 'pack' },
  { to: '/ready',         key: 'nav.ready',          icon: PackageCheck,    perm: 'handoff' },
  { to: '/handoff',       key: 'nav.handoff',        icon: Truck,           perm: 'handoff' },
  { to: '/inbound',       key: 'nav.inbound',        icon: ArrowDownToLine, perm: 'receive' },
  { to: '/inventory',     key: 'nav.inventory',      icon: Boxes,           perm: 'inventory' },
  { to: '/bins',          key: 'nav.bins',           icon: Grid3x3,         perm: 'inventory' },
  { to: '/count',         key: 'nav.count',          icon: ClipboardCheck,  perm: 'count' },
  { to: '/movements',     key: 'nav.movements',      icon: Move,            perm: 'move' },
  { to: '/returns',       key: 'nav.returns',        icon: Undo2,           perm: 'returns' },
  { to: '/problems',      key: 'nav.problems',       icon: AlertTriangle,   perm: 'problems' },
  { to: '/claims',        key: 'nav.claims',         icon: ShieldAlert,     perm: 'claims' },
  { to: '/evidence-log',  key: 'nav.evidenceLog',    icon: FileText,        perm: 'claims' },
  { to: '/supplier-disputes', key: 'nav.disputes',   icon: FileWarning,     perm: 'supplier_disputes' },
  { to: '/internal-chat', key: 'nav.chat',           icon: MessagesSquare,  perm: 'view_dashboard' },
  { to: '/scanner',       key: 'nav.scanner',        icon: ScanLine,        perm: 'scanner' },
  { to: '/documents',     key: 'nav.documents',      icon: FileText,        perm: 'documents' },
  { to: '/reports',       key: 'nav.reports',        icon: BarChart3,       perm: 'view_reports' },
  { to: '/shift-settings',key: 'nav.shiftSettings',  icon: Settings,        perm: 'configure_shift' },
];

const BOTTOM = [
  { to: '/',              key: 'nav.home',     icon: LayoutDashboard },
  { to: '/tasks',         key: 'nav.tasks',    icon: ListTodo },
  { to: '/internal-chat', key: 'nav.chat',     icon: MessagesSquare },
  { to: '/scanner',       key: 'nav.scanner',  icon: ScanLine },
  { to: '/problems',      key: 'nav.problems', icon: AlertTriangle },
];

const isUrl = (s: string) => /^(https?:|blob:|data:)/.test(s);

// Простой sidebar для обычного складчика — задачи + сборка + сканер + проблемы + жалобы + чат + документы.
const WORKER_PATHS = new Set(['/shift', '/tasks', '/picking', '/scanner', '/problems', '/claims', '/internal-chat', '/documents']);

export function AppShell() {
  const t = useT();
  const { currentWorker, problems, chatThreads } = useStore();
  const nav = useNavigate();
  const role = currentWorker?.role;
  const isSimpleWorker = role === 'warehouse_worker';
  const [profileOpen, setProfileOpen] = useState(false);
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
        <div className="px-5 py-4 border-b border-[#F3F4F6] flex items-start justify-between gap-2">
          <div>
            <div className="text-[16px] text-[#1F2430]" style={{ fontWeight: 900 }}>{t('app.title')}</div>
            <div className="text-[11px] text-[#6B7280] mt-0.5" style={{ fontWeight: 500 }}>
              {t('app.subtitle')}
            </div>
          </div>
          <div className="text-[#1F2430]">
            <LanguageSwitcher />
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
                {t(item.key)}
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
          <button
            onClick={() => setProfileOpen(true)}
            className="w-full flex items-center gap-2 mb-3 active-press text-left"
          >
            <div className="w-9 h-9 rounded-full bg-[#E0F2FE] flex items-center justify-center text-[18px] overflow-hidden flex-shrink-0">
              {currentWorker?.avatar
                ? (isUrl(currentWorker.avatar)
                    ? <img src={currentWorker.avatar} alt={currentWorker.name} className="w-full h-full object-cover" />
                    : <span>{currentWorker.avatar}</span>)
                : <span className="text-[#0369A1]" style={{ fontWeight: 900 }}>{currentWorker?.name.charAt(0) ?? '?'}</span>}
            </div>
            <div className="min-w-0">
              <div className="text-[12px] text-[#1F2430] truncate" style={{ fontWeight: 700 }}>
                {currentWorker?.name ?? '—'}
              </div>
              <div className="text-[11px] text-[#6B7280] truncate" style={{ fontWeight: 500 }}>
                {currentWorker?.position ?? (currentWorker ? ROLE_LABELS[currentWorker.role] : '')}
              </div>
            </div>
          </button>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 text-[12px] text-[#EF4444] active-press"
            style={{ fontWeight: 700 }}
          >
            <LogOut className="w-4 h-4" /> {t('common.you')} →
          </button>
        </div>
      </aside>

      <header className="md:hidden fixed top-0 left-0 right-0 z-30 bg-[#1F2430] text-white px-3 h-12 flex items-center justify-between">
        <button onClick={() => setProfileOpen(true)} className="flex items-center gap-2 active-press">
          <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-[14px] overflow-hidden">
            {currentWorker?.avatar
              ? (isUrl(currentWorker.avatar)
                  ? <img src={currentWorker.avatar} alt={currentWorker.name} className="w-full h-full object-cover" />
                  : <span>{currentWorker.avatar}</span>)
              : <span style={{ fontWeight: 900 }}>{currentWorker?.name.charAt(0) ?? '?'}</span>}
          </div>
          <div className="text-left min-w-0">
            <div className="text-[12px] truncate" style={{ fontWeight: 800 }}>
              {currentWorker?.name ?? t('app.title')}
            </div>
            <div className="text-[10px] opacity-70 truncate">
              {currentWorker?.position ?? t('app.subtitle')}
            </div>
          </div>
        </button>
        <LanguageSwitcher />
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
              <span className="text-[10px]">{t(item.key)}</span>
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

      <EmployeeProfileModal
        open={profileOpen}
        workerId={currentWorker?.id ?? null}
        onClose={() => setProfileOpen(false)}
        onMessage={() => { setProfileOpen(false); nav('/internal-chat'); }}
        onCall={() => { setProfileOpen(false); }}
        editable
      />
    </div>
  );
}
