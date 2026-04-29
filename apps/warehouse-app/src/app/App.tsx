import type { ReactNode } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';

import { useStore } from './store/useStore';
import { AppShell } from './components/AppShell';
import { RoleGuard } from './components/RoleGuard';

import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ShiftPage } from './pages/ShiftPage';
import { ShiftSettingsPage } from './pages/ShiftSettingsPage';
import { TasksPage } from './pages/TasksPage';
import { OrdersPage } from './pages/OrdersPage';
import { PickingPage } from './pages/PickingPage';
import { SortingPage } from './pages/SortingPage';
import { PackingPage } from './pages/PackingPage';
import { ScannerPage } from './pages/ScannerPage';
import { ReadyPage } from './pages/ReadyPage';
import { HandoffPage } from './pages/HandoffPage';
import { InboundPage } from './pages/InboundPage';
import { InventoryPage } from './pages/InventoryPage';
import { BinsPage } from './pages/BinsPage';
import { CountPage } from './pages/CountPage';
import { MovementsPage } from './pages/MovementsPage';
import { ReturnsPage } from './pages/ReturnsPage';
import { ProblemsPage } from './pages/ProblemsPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { ReportsPage } from './pages/ReportsPage';
import { ClaimsPage } from './pages/ClaimsPage';
import { SupplierDisputesPage } from './pages/SupplierDisputesPage';
import { EvidenceLogPage } from './pages/EvidenceLogPage';

function AuthGuard({ children }: { children: ReactNode }) {
  const { currentWorker } = useStore();
  if (!currentWorker) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<AuthGuard><AppShell /></AuthGuard>}>
          <Route path="/"                  element={<DashboardPage />} />
          <Route path="/shift"             element={<ShiftPage />} />
          <Route path="/shift-settings"    element={<RoleGuard perm="configure_shift"><ShiftSettingsPage /></RoleGuard>} />
          <Route path="/tasks"             element={<TasksPage />} />
          <Route path="/orders"            element={<RoleGuard perm="pick"><OrdersPage /></RoleGuard>} />
          <Route path="/picking"           element={<RoleGuard perm="pick"><PickingPage /></RoleGuard>} />
          <Route path="/picking/:orderId"  element={<RoleGuard perm="pick"><PickingPage /></RoleGuard>} />
          <Route path="/sorting"           element={<RoleGuard perm="sort"><SortingPage /></RoleGuard>} />
          <Route path="/sorting/:orderId"  element={<RoleGuard perm="sort"><SortingPage /></RoleGuard>} />
          <Route path="/packing"           element={<RoleGuard perm="pack"><PackingPage /></RoleGuard>} />
          <Route path="/packing/:orderId"  element={<RoleGuard perm="pack"><PackingPage /></RoleGuard>} />
          <Route path="/scanner"           element={<RoleGuard perm="scanner"><ScannerPage /></RoleGuard>} />
          <Route path="/ready"             element={<RoleGuard perm="handoff"><ReadyPage /></RoleGuard>} />
          <Route path="/handoff"           element={<RoleGuard perm="handoff"><HandoffPage /></RoleGuard>} />
          <Route path="/inbound"           element={<RoleGuard perm="receive"><InboundPage /></RoleGuard>} />
          <Route path="/inventory"         element={<RoleGuard perm="inventory"><InventoryPage /></RoleGuard>} />
          <Route path="/bins"              element={<RoleGuard perm="inventory"><BinsPage /></RoleGuard>} />
          <Route path="/count"             element={<RoleGuard perm="count"><CountPage /></RoleGuard>} />
          <Route path="/movements"         element={<RoleGuard perm="move"><MovementsPage /></RoleGuard>} />
          <Route path="/returns"           element={<RoleGuard perm="returns"><ReturnsPage /></RoleGuard>} />
          <Route path="/problems"          element={<RoleGuard perm="problems"><ProblemsPage /></RoleGuard>} />
          <Route path="/documents"         element={<RoleGuard perm="documents"><DocumentsPage /></RoleGuard>} />
          <Route path="/reports"           element={<RoleGuard perm="view_reports"><ReportsPage /></RoleGuard>} />
          <Route path="/claims"            element={<RoleGuard perm="claims"><ClaimsPage /></RoleGuard>} />
          <Route path="/supplier-disputes" element={<RoleGuard perm="supplier_disputes"><SupplierDisputesPage /></RoleGuard>} />
          <Route path="/evidence-log"      element={<RoleGuard perm="claims"><EvidenceLogPage /></RoleGuard>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Toaster position="top-center" toastOptions={{ style: { fontWeight: 600 } }} />
    </>
  );
}
