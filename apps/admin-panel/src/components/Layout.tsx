import { NavLink, Outlet, useNavigate } from 'react-router';
import {
  LayoutDashboard, Users as UsersIcon, Shield, Building2, Map as MapIcon,
  MapPin, Package, ShoppingCart, ListTodo, Boxes, FileText, Activity,
  AlertTriangle, LogOut,
} from 'lucide-react';
import { useSession } from '../lib/auth';

const NAV: Array<{ to: string; label: string; icon: any }> = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/users', label: 'Users', icon: UsersIcon },
  { to: '/roles', label: 'Roles', icon: Shield },
  { to: '/warehouses', label: 'Warehouses', icon: Building2 },
  { to: '/zones', label: 'Zones', icon: MapPin },
  { to: '/locations', label: 'Locations', icon: MapPin },
  { to: '/map', label: 'Live Map', icon: MapIcon },
  { to: '/products', label: 'Products / SKUs', icon: Package },
  { to: '/inventory', label: 'Inventory', icon: Boxes },
  { to: '/orders', label: 'Orders', icon: ShoppingCart },
  { to: '/tasks', label: 'Tasks', icon: ListTodo },
  { to: '/problems', label: 'Problems', icon: AlertTriangle },
  { to: '/audit', label: 'Audit Log', icon: FileText },
];

export function Layout() {
  const { user, role, logout } = useSession();
  const nav = useNavigate();

  if (!user) return <Outlet />; // login page

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-60 bg-slate-900 text-slate-100 flex flex-col">
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="text-xs uppercase tracking-wider text-slate-400">WMS</div>
          <div className="font-bold text-lg">Admin Panel</div>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to} to={to} end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
                  isActive ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800/60'
                }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-800">
          <div className="text-xs text-slate-400">{user.fullName}</div>
          <div className="text-[11px] text-slate-500 mb-2">{role?.name}</div>
          <button
            onClick={() => { logout(); nav('/login'); }}
            className="w-full text-xs flex items-center gap-1 text-slate-300 hover:text-white"
          >
            <LogOut className="w-3 h-3" /> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 bg-slate-50 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">{actions}</div>
    </header>
  );
}

export function PageBody({ children }: { children: React.ReactNode }) {
  return <div className="p-6">{children}</div>;
}
