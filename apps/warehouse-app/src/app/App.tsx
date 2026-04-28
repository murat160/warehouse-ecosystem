import type { ReactNode } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';

import { useStore } from './store/useStore';
import { AppShell } from './components/AppShell';

import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ShiftPage } from './pages/ShiftPage';
import { TasksPage } from './pages/TasksPage';
import { PickingPage } from './pages/PickingPage';
import { PackingPage } from './pages/PackingPage';
import { ScannerPage } from './pages/ScannerPage';
import { ReadyPage } from './pages/ReadyPage';
import { HandoffPage } from './pages/HandoffPage';
import { InboundPage } from './pages/InboundPage';
import { InventoryPage } from './pages/InventoryPage';
import { BinsPage } from './pages/BinsPage';
import { CountPage } from './pages/CountPage';
import { ReturnsPage } from './pages/ReturnsPage';
import { ProblemsPage } from './pages/ProblemsPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { ReportsPage } from './pages/ReportsPage';

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
          <Route path="/"                 element={<DashboardPage />} />
          <Route path="/shift"            element={<ShiftPage />} />
          <Route path="/tasks"            element={<TasksPage />} />
          <Route path="/picking"          element={<PickingPage />} />
          <Route path="/picking/:orderId" element={<PickingPage />} />
          <Route path="/packing"          element={<PackingPage />} />
          <Route path="/packing/:orderId" element={<PackingPage />} />
          <Route path="/scanner"          element={<ScannerPage />} />
          <Route path="/ready"            element={<ReadyPage />} />
          <Route path="/handoff"          element={<HandoffPage />} />
          <Route path="/inbound"          element={<InboundPage />} />
          <Route path="/inventory"        element={<InventoryPage />} />
          <Route path="/bins"             element={<BinsPage />} />
          <Route path="/count"            element={<CountPage />} />
          <Route path="/returns"          element={<ReturnsPage />} />
          <Route path="/problems"         element={<ProblemsPage />} />
          <Route path="/documents"        element={<DocumentsPage />} />
          <Route path="/reports"          element={<ReportsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Toaster position="top-center" toastOptions={{ style: { fontWeight: 600 } }} />
    </>
  );
}
