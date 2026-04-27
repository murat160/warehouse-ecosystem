/**
 * WMS Admin Panel — router shell.
 *
 * Layout wraps every authenticated route with sidebar + main area.
 * Login page is rendered without sidebar.
 *
 * All pages talk to backend via src/api.ts. No mock data lives here.
 */
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSession } from './lib/auth';
import { Layout } from './components/Layout';

import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { UsersPage } from './pages/UsersPage';
import { RolesPage } from './pages/RolesPage';
import { WarehousesPage } from './pages/WarehousesPage';
import { ZonesPage } from './pages/ZonesPage';
import { LocationsPage } from './pages/LocationsPage';
import { MapPage } from './pages/MapPage';
import { ProductsPage } from './pages/ProductsPage';
import { InventoryPage } from './pages/InventoryPage';
import { OrdersPage } from './pages/OrdersPage';
import { TasksPage } from './pages/TasksPage';
import { ProblemsPage } from './pages/ProblemsPage';
import { AuditPage } from './pages/AuditPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSession();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">Loading session…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<DashboardPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="roles" element={<RolesPage />} />
        <Route path="warehouses" element={<WarehousesPage />} />
        <Route path="zones" element={<ZonesPage />} />
        <Route path="locations" element={<LocationsPage />} />
        <Route path="map" element={<MapPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="problems" element={<ProblemsPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
