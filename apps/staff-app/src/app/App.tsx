import { Routes, Route, Navigate } from 'react-router';
import { Toaster } from 'sonner';
import { useAppState } from './hooks/useAppState';
import { BottomNav } from './components/BottomNav';

import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { TasksListPage } from './pages/TasksListPage';

import { InboundListPage } from './pages/InboundListPage';
import { InboundDetailPage } from './pages/InboundDetailPage';
import { QCPage } from './pages/QCPage';
import { PutawayPage } from './pages/PutawayPage';

import { PickingListPage } from './pages/PickingListPage';
import { PickingDetailPage } from './pages/PickingDetailPage';
import { PackingPage } from './pages/PackingPage';
import { ShippingPage } from './pages/ShippingPage';

import { ReturnsListPage } from './pages/ReturnsListPage';
import { RMADetailPage } from './pages/RMADetailPage';

import { CycleCountPage } from './pages/CycleCountPage';
import { ReplenishmentPage } from './pages/ReplenishmentPage';
import { InventoryPage } from './pages/InventoryPage';

import { WarehouseMapPage } from './pages/WarehouseMapPage';
import { YardDockPage } from './pages/YardDockPage';
import { OrderTrackingPage } from './pages/OrderTrackingPage';

import { AlertsPage } from './pages/AlertsPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { IncidentsPage } from './pages/IncidentsPage';
import { SettingsPage } from './pages/SettingsPage';

import { SupervisorPage } from './pages/SupervisorPage';
import { WorkersAdminPage } from './pages/WorkersAdminPage';
import { AnalyticsDashboardPage } from './pages/AnalyticsDashboardPage';

/**
 * AuthGuard — если не залогинен, отправляем на /login.
 */
function AuthGuard({ children }: { children: any }) {
  const state = useAppState();
  if (!state.currentWorker) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export function App() {
  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected */}
        <Route path="/"            element={<AuthGuard><DashboardPage /></AuthGuard>} />
        <Route path="/tasks"       element={<AuthGuard><TasksListPage /></AuthGuard>} />

        {/* Inbound */}
        <Route path="/inbound"     element={<AuthGuard><InboundListPage /></AuthGuard>} />
        <Route path="/inbound/:id" element={<AuthGuard><InboundDetailPage /></AuthGuard>} />
        <Route path="/qc"          element={<AuthGuard><QCPage /></AuthGuard>} />
        <Route path="/qc/:id"      element={<AuthGuard><QCPage /></AuthGuard>} />
        <Route path="/putaway"     element={<AuthGuard><PutawayPage /></AuthGuard>} />
        <Route path="/putaway/:id" element={<AuthGuard><PutawayPage /></AuthGuard>} />

        {/* Outbound */}
        <Route path="/picking"      element={<AuthGuard><PickingListPage /></AuthGuard>} />
        <Route path="/picking/:id"  element={<AuthGuard><PickingDetailPage /></AuthGuard>} />
        <Route path="/packing"      element={<AuthGuard><PackingPage /></AuthGuard>} />
        <Route path="/packing/:id"  element={<AuthGuard><PackingPage /></AuthGuard>} />
        <Route path="/shipping"     element={<AuthGuard><ShippingPage /></AuthGuard>} />
        <Route path="/shipping/:id" element={<AuthGuard><ShippingPage /></AuthGuard>} />

        {/* Returns */}
        <Route path="/returns"     element={<AuthGuard><ReturnsListPage /></AuthGuard>} />
        <Route path="/returns/:id" element={<AuthGuard><RMADetailPage /></AuthGuard>} />

        {/* Inventory */}
        <Route path="/count"          element={<AuthGuard><CycleCountPage /></AuthGuard>} />
        <Route path="/count/:id"      element={<AuthGuard><CycleCountPage /></AuthGuard>} />
        <Route path="/replenishment"  element={<AuthGuard><ReplenishmentPage /></AuthGuard>} />
        <Route path="/inventory"      element={<AuthGuard><InventoryPage /></AuthGuard>} />

        {/* Map / Yard / Orders */}
        <Route path="/map"      element={<AuthGuard><WarehouseMapPage /></AuthGuard>} />
        <Route path="/yard"     element={<AuthGuard><YardDockPage /></AuthGuard>} />
        <Route path="/orders"   element={<AuthGuard><OrderTrackingPage /></AuthGuard>} />

        {/* Notifications */}
        <Route path="/alerts"     element={<AuthGuard><AlertsPage /></AuthGuard>} />
        <Route path="/audit"      element={<AuthGuard><AuditLogPage /></AuthGuard>} />
        <Route path="/incidents"  element={<AuthGuard><IncidentsPage /></AuthGuard>} />
        <Route path="/settings"   element={<AuthGuard><SettingsPage /></AuthGuard>} />

        {/* Supervisor / Manager */}
        <Route path="/supervisor" element={<AuthGuard><SupervisorPage /></AuthGuard>} />
        <Route path="/admin/workers" element={<AuthGuard><WorkersAdminPage /></AuthGuard>} />
        <Route path="/analytics" element={<AuthGuard><AnalyticsDashboardPage /></AuthGuard>} />

        {/* fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <BottomNav />

      <Toaster
        position="top-center"
        toastOptions={{
          style: { fontWeight: 600 },
        }}
      />
    </div>
  );
}
