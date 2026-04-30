import type { ReactNode } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';

import { useStore } from './store/useStore';
import { AppShell } from './components/AppShell';
import { RoleGuard } from './components/RoleGuard';

import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ShiftPage } from './pages/ShiftPage';
import { ReceivingPage } from './pages/ReceivingPage';
import { OrdersPage } from './pages/OrdersPage';
import { IssuePage } from './pages/IssuePage';
import { CellsPage } from './pages/CellsPage';
import { SearchPage } from './pages/SearchPage';
import { ReturnsPage } from './pages/ReturnsPage';
import { ProblemsPage } from './pages/ProblemsPage';
import { ScannerPage } from './pages/ScannerPage';
import { HandoffPage } from './pages/HandoffPage';
import { CashPage } from './pages/CashPage';
import { CollectionPage } from './pages/CollectionPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { ChatPage } from './pages/ChatPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';

function AuthGuard({ children }: { children: ReactNode }) {
  const { currentEmployee } = useStore();
  if (!currentEmployee) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<AuthGuard><AppShell /></AuthGuard>}>
          <Route path="/"            element={<DashboardPage />} />
          <Route path="/shift"       element={<RoleGuard perm="view_shift"><ShiftPage /></RoleGuard>} />
          <Route path="/receiving"   element={<RoleGuard perm="receive_batch"><ReceivingPage /></RoleGuard>} />
          <Route path="/orders"      element={<RoleGuard perm="view_orders"><OrdersPage /></RoleGuard>} />
          <Route path="/issue"       element={<RoleGuard perm="issue_to_customer"><IssuePage /></RoleGuard>} />
          <Route path="/cells"       element={<RoleGuard perm="view_orders"><CellsPage /></RoleGuard>} />
          <Route path="/search"      element={<RoleGuard perm="view_orders"><SearchPage /></RoleGuard>} />
          <Route path="/returns"     element={<RoleGuard perm="view_returns"><ReturnsPage /></RoleGuard>} />
          <Route path="/problems"    element={<RoleGuard perm="view_problems"><ProblemsPage /></RoleGuard>} />
          <Route path="/scanner"     element={<RoleGuard perm="use_scanner"><ScannerPage /></RoleGuard>} />
          <Route path="/handoff"     element={<RoleGuard perm="courier_handoff"><HandoffPage /></RoleGuard>} />
          <Route path="/cash"        element={<RoleGuard perm="view_cash"><CashPage /></RoleGuard>} />
          <Route path="/collection"  element={<RoleGuard perm="collection"><CollectionPage /></RoleGuard>} />
          <Route path="/documents"   element={<RoleGuard perm="view_documents"><DocumentsPage /></RoleGuard>} />
          <Route path="/chat"        element={<RoleGuard perm="use_chat"><ChatPage /></RoleGuard>} />
          <Route path="/reports"     element={<RoleGuard perm="view_reports"><ReportsPage /></RoleGuard>} />
          <Route path="/settings"    element={<RoleGuard perm="configure_pvz"><SettingsPage /></RoleGuard>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Toaster position="top-center" toastOptions={{ style: { fontWeight: 600 } }} />
    </>
  );
}
