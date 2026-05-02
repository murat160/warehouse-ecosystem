import { lazy, Suspense, type ReactNode } from 'react';
import { createMemoryRouter, Navigate, useLocation } from 'react-router';
import { useCourierStore } from './store/CourierStore';

const LoginPage              = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const CourierMap             = lazy(() => import('./pages/CourierMap').then(m => ({ default: m.CourierMap })));
const ProfilePage            = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const HistoryPage            = lazy(() => import('./pages/HistoryPage').then(m => ({ default: m.HistoryPage })));
const EarningsPage           = lazy(() => import('./pages/EarningsPage').then(m => ({ default: m.EarningsPage })));
const OrderDetailsPage       = lazy(() => import('./pages/OrderDetailsPage').then(m => ({ default: m.OrderDetailsPage })));
const SettingsPage           = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const InsurancePage          = lazy(() => import('./pages/InsurancePage').then(m => ({ default: m.InsurancePage })));
const HelpPage               = lazy(() => import('./pages/HelpPage').then(m => ({ default: m.HelpPage })));
const ChatPage               = lazy(() => import('./pages/ChatPage').then(m => ({ default: m.ChatPage })));
const AnalyticsPage          = lazy(() => import('./pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const RewardsPage            = lazy(() => import('./pages/RewardsPage').then(m => ({ default: m.RewardsPage })));
const StatisticsPage         = lazy(() => import('./pages/StatisticsPage').then(m => ({ default: m.StatisticsPage })));
const NewsPage               = lazy(() => import('./pages/NewsPage').then(m => ({ default: m.NewsPage })));
const DeliverySettingsPage   = lazy(() => import('./pages/DeliverySettingsPage').then(m => ({ default: m.DeliverySettingsPage })));
const SupportPage            = lazy(() => import('./pages/SupportPage').then(m => ({ default: m.SupportPage })));

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-full w-full bg-white">
      <div
        className="w-10 h-10 rounded-full border-4 border-emerald-500 border-t-transparent"
        style={{ animation: 'spin 0.8s linear infinite' }}
      />
    </div>
  );
}

function MobileFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-gray-900 flex items-center justify-center">
      <div className="relative w-full max-w-[420px] h-screen max-h-[900px] bg-white overflow-hidden shadow-2xl md:rounded-3xl">
        <Suspense fallback={<LoadingScreen />}>{children}</Suspense>
      </div>
    </div>
  );
}

function AuthGate({ children }: { children: ReactNode }) {
  const { state } = useCourierStore();
  const location = useLocation();

  if (!state.initialized) return <LoadingScreen />;
  if (!state.authenticated) {
    if (location.pathname === '/login') return <>{children}</>;
    return <Navigate to="/login" replace />;
  }
  if (state.authenticated && location.pathname === '/login') return <Navigate to="/" replace />;
  return <>{children}</>;
}

const Frame = (el: ReactNode) => <MobileFrame><AuthGate>{el}</AuthGate></MobileFrame>;

const Login            = () => Frame(<LoginPage />);
const Map              = () => Frame(<CourierMap />);
const Profile          = () => Frame(<ProfilePage />);
const History          = () => Frame(<HistoryPage />);
const Earnings         = () => Frame(<EarningsPage />);
const OrderDetails     = () => Frame(<OrderDetailsPage />);
const Settings         = () => Frame(<SettingsPage />);
const Insurance        = () => Frame(<InsurancePage />);
const Help             = () => Frame(<HelpPage />);
const Chat             = () => Frame(<ChatPage />);
const Analytics        = () => Frame(<AnalyticsPage />);
const Rewards          = () => Frame(<RewardsPage />);
const Statistics       = () => Frame(<StatisticsPage />);
const News             = () => Frame(<NewsPage />);
const DeliverySettings = () => Frame(<DeliverySettingsPage />);
const Support          = () => Frame(<SupportPage />);

export const router = createMemoryRouter(
  [
    { path: '/login',                          Component: Login },
    { path: '/',                               Component: Map },
    { path: '/profile',                        Component: Profile },
    { path: '/history',                        Component: History },
    { path: '/earnings',                       Component: Earnings },
    { path: '/earnings/order/:orderId',        Component: OrderDetails },
    { path: '/settings',                       Component: Settings },
    { path: '/insurance',                      Component: Insurance },
    { path: '/help',                           Component: Help },
    { path: '/chat/:chatId',                   Component: Chat },
    { path: '/support',                        Component: Support },
    { path: '/delivery-settings',              Component: DeliverySettings },
    { path: '/analytics',                      Component: Analytics },
    { path: '/rewards',                        Component: Rewards },
    { path: '/statistics',                     Component: Statistics },
    { path: '/news',                           Component: News },
  ],
  {
    future: {
      v7_startTransition:             true,
      v7_partialHydration:            true,
      v7_fetcherPersist:              true,
      v7_normalizeFormMethod:         true,
      v7_relativeSplatPath:           true,
      v7_skipActionErrorRevalidation: true,
    },
  }
);
