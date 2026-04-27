import { useState, useEffect } from 'react';
import { Menu, Bell, Search, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { unreadCount, subscribe as subscribeNotifs } from '../store/notificationsStore';

interface HeaderProps {
  onMenuClick: () => void;
  isSidebarOpen: boolean;
}

export function Header({ onMenuClick, isSidebarOpen }: HeaderProps) {
  const navigate = useNavigate();
  const [notifCount, setNotifCount] = useState(() => unreadCount());

  useEffect(() => {
    const unsub = subscribeNotifs(() => setNotifCount(unreadCount()));
    return unsub;
  }, []);

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu size={24} />
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Поиск..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Notification bell — links to PersonalCabinet → Входящие */}
          <button
            onClick={() => navigate('/cabinet')}
            className="p-2 hover:bg-gray-100 rounded-lg relative transition-colors"
            title={notifCount > 0 ? `${notifCount} непрочитанных уведомлений` : 'Уведомления'}
          >
            <Bell size={20} className={notifCount > 0 ? 'text-violet-600' : 'text-gray-600'} />
            {notifCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-4.5 px-0.5 bg-violet-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {notifCount > 9 ? '9+' : notifCount}
              </span>
            )}
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <User size={20} className="text-white" />
            </div>
            <div>
              <p className="text-sm">Админ</p>
              <p className="text-xs text-gray-500">admin@example.com</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
