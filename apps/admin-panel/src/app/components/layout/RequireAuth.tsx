/**
 * Route guard. Wraps DashboardLayout so the entire admin shell requires
 * a valid JWT session. While /api/auth/me is in flight we show a tiny
 * loader so nothing flickers; on no-token we Navigate to /login.
 */
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function RequireAuth({ children }: { children?: React.ReactNode }) {
  const { status } = useAuth();
  const loc = useLocation();

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-500">Загрузка сессии…</div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  }

  return <>{children ?? <Outlet />}</>;
}
