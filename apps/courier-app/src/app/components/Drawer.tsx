import {
  X, User, Wallet, History, Shield, Settings, MessageCircle, MessagesSquare,
  HelpCircle, ChevronRight, BarChart3, Gift, TrendingUp, Newspaper, Bike, LogOut, Star,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { useT } from '../i18n';
import { useCourierStore } from '../store/CourierStore';
import { LanguageSwitcher } from './LanguageSwitcher';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Drawer({ isOpen, onClose }: DrawerProps) {
  const navigate = useNavigate();
  const t = useT();
  const { state, logout } = useCourierStore();

  const items = [
    { icon: User,           label: t('courier.profile'),       path: '/profile' },
    { icon: History,        label: t('courier.history'),       path: '/history' },
    { icon: Wallet,         label: t('courier.earnings'),      path: '/earnings' },
    { icon: MessagesSquare, label: t('chats.title'),           path: '/chats' },
    { icon: BarChart3,      label: t('menu.analytics'),        path: '/analytics' },
    { icon: Gift,           label: t('menu.rewards'),          path: '/rewards' },
    { icon: TrendingUp,     label: t('menu.statistics'),       path: '/statistics' },
    { icon: Shield,         label: t('courier.documents'),     path: '/insurance' },
    { icon: Settings,       label: t('courier.settings'),      path: '/settings' },
    { icon: Bike,           label: t('menu.delivery_settings'), path: '/delivery-settings' },
    { icon: Newspaper,      label: t('menu.news'),             path: '/news' },
    { icon: HelpCircle,     label: t('settings.about'),        path: '/help' },
    { icon: MessageCircle,  label: t('support.title'),         path: '/support' },
  ];

  const totalDeliveries = (state.courier?.totalDeliveries ?? 0) + state.history.length;

  const go = (path: string) => { navigate(path); onClose(); };
  const handleLogout = () => { logout(); onClose(); navigate('/login', { replace: true }); };

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />}
      <div
        className={`fixed top-0 left-0 h-full w-[85%] max-w-sm bg-white z-50 shadow-xl transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="px-5 pt-6 pb-4 border-b border-gray-100">
            <div className="flex items-start justify-between gap-3">
              <button onClick={() => go('/profile')} className="flex items-start gap-3 flex-1 text-left">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center font-extrabold">
                  {state.courier?.name.split(' ').map(s => s[0]).slice(0, 2).join('') ?? 'C'}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-extrabold text-gray-900 truncate">{state.courier?.name ?? '—'}</h2>
                  <p className={`text-sm font-semibold ${state.isOnline ? 'text-emerald-600' : 'text-gray-500'}`}>
                    {state.isOnline ? t('courier.online') : t('courier.offline')}
                  </p>
                </div>
              </button>
              <button onClick={onClose} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Performance block — pulled live from store, not static. */}
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <button onClick={() => go('/profile')} className="bg-amber-50 rounded-2xl p-2 active:bg-amber-100">
                <div className="text-[16px] font-extrabold text-amber-700 inline-flex items-center gap-1 justify-center">
                  <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                  {(state.courier?.rating ?? 0).toFixed(2)}
                </div>
                <div className="text-[10px] uppercase tracking-wide text-gray-500">{t('courier.rating')}</div>
              </button>
              <button onClick={() => go('/history')} className="bg-emerald-50 rounded-2xl p-2 active:bg-emerald-100">
                <div className="text-[16px] font-extrabold text-emerald-700">{totalDeliveries}</div>
                <div className="text-[10px] uppercase tracking-wide text-gray-500">{t('courier.deliveries')}</div>
              </button>
              <button onClick={() => go('/earnings')} className="bg-sky-50 rounded-2xl p-2 active:bg-sky-100">
                <div className="text-[16px] font-extrabold text-sky-700">{state.earningsToday.toFixed(0)}</div>
                <div className="text-[10px] uppercase tracking-wide text-gray-500">{t('earnings.today')}</div>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {items.map((item, i) => (
              <button
                key={i}
                onClick={() => go(item.path)}
                className="w-full flex items-center gap-3 px-5 py-4 active:bg-gray-50 border-b border-gray-50"
              >
                <item.icon className="w-5 h-5 text-gray-700" />
                <span className="flex-1 text-left text-gray-900">{item.label}</span>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            ))}
            <div className="p-4">
              <LanguageSwitcher variant="list" />
            </div>
            <div className="px-4 pb-4">
              <button
                onClick={handleLogout}
                className="w-full h-12 rounded-2xl bg-white border border-rose-200 text-rose-600 font-bold flex items-center justify-center gap-2 active:bg-rose-50"
              >
                <LogOut className="w-4 h-4" />
                {t('courier.logout')}
              </button>
            </div>
          </div>

          <div className="px-5 py-4 border-t border-gray-100">
            <p className="text-xs text-gray-400">v0.3.0 · Express Courier</p>
          </div>
        </div>
      </div>
    </>
  );
}
