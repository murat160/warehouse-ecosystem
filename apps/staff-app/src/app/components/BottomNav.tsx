import { useNavigate, useLocation } from 'react-router-dom';
import { Home, ListTodo, Map, Boxes, User, Users, AlertTriangle } from 'lucide-react';
import { useAppState } from '../hooks/useAppState';
import { isSupervisorOrAbove } from '../services/permissions';

export function BottomNav() {
  const state = useAppState();
  const nav = useNavigate();
  const loc = useLocation();
  const worker = state.currentWorker;

  if (!worker || loc.pathname === '/login') return null;

  const isSupervisor = isSupervisorOrAbove(worker.role);
  const unreadAlerts = state.alerts.filter(a => !a.read).length;

  // Для supervisor показываем "Команда", для остальных — "Задачи"
  const items = [
    { path: '/',        icon: Home,    label: 'Главная' },
    { path: '/tasks',   icon: ListTodo,label: 'Задачи' },
    isSupervisor
      ? { path: '/supervisor', icon: Users, label: 'Команда' }
      : { path: '/map',        icon: Map,   label: 'Карта' },
    { path: '/inventory', icon: Boxes,  label: 'Остатки' },
    { path: '/settings',  icon: User,   label: 'Профиль' },
  ];

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#F3F4F6] z-40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center">
        {items.map(item => {
          const Icon = item.icon;
          const active = item.path === '/' ? loc.pathname === '/' : loc.pathname.startsWith(item.path);
          return (
            <button
              key={item.path}
              onClick={() => nav(item.path)}
              className="flex-1 py-2 flex flex-col items-center gap-0.5 active-press"
            >
              <div className="relative">
                <Icon
                  className="w-5 h-5"
                  style={{ color: active ? '#2EA7E0' : '#9CA3AF' }}
                />
                {item.path === '/' && unreadAlerts > 0 && (
                  <span className="absolute -top-1 -right-2 min-w-[14px] h-[14px] px-0.5 rounded-full bg-[#EF4444] text-white text-[9px] flex items-center justify-center" style={{ fontWeight: 800 }}>
                    {unreadAlerts}
                  </span>
                )}
              </div>
              <span
                className="text-[10px]"
                style={{ color: active ? '#2EA7E0' : '#9CA3AF', fontWeight: active ? 800 : 600 }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
