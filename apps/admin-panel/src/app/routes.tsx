import { createBrowserRouter } from "react-router-dom";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { RequireAuth } from "./components/layout/RequireAuth";
import { LoginPage } from "./pages/auth/LoginPage";
import { Dashboard } from "./pages/Dashboard";
import { UsersList } from "./pages/users/UsersList";
import { PersonalCabinet } from "./pages/cabinet/PersonalCabinet";
import { ChatCenter } from "./pages/chat/ChatCenter";
import { WallBoard } from "./pages/chat/WallBoard";
import { PVZList } from "./pages/pvz/PVZList";
import { PVZDetail } from "./pages/pvz/PVZDetail";
import { PVZScanTerminal } from "./pages/pvz/PVZScanTerminal";
import { OrdersList } from "./pages/orders/OrdersList";
import { OrderDetail } from "./pages/orders/OrderDetail";
import { OrdersReport } from "./pages/orders/OrdersReport";
import { CouriersList } from "./pages/couriers/CouriersList";
import { CourierDetail } from "./pages/couriers/CourierDetail";
import { WarehousesList } from "./pages/warehouses/WarehousesList";
import { WarehouseDetail } from "./pages/warehouses/WarehouseDetail";
import { LogisticsDashboard } from "./pages/logistics/LogisticsDashboard";
import { MerchantsList } from "./pages/merchants/MerchantsList";
import { MerchantDetail } from "./pages/merchants/MerchantDetail";
import { FinanceDashboard } from "./pages/finance/FinanceDashboard";
import { PayoutsList } from "./pages/finance/PayoutsList";
import { PayoutDetail } from "./pages/finance/PayoutDetail";
import { RefundCenter } from "./pages/finance/RefundCenter";
import { TicketsList } from "./pages/support/TicketsList";
import { TicketDetail } from "./pages/support/TicketDetail";
import { AuditLog } from "./pages/security/AuditLog";
import { RBACManagement } from "./pages/security/RBACManagement";
import { SecurityCenter } from "./pages/security/SecurityCenter";
import { Analytics } from "./pages/Analytics";
import { Settings } from "./pages/Settings";
import { ComplianceCenter } from "./pages/compliance/ComplianceCenter";
import { ArchitecturePage } from "./pages/system/ArchitecturePage";
import { PromotionsPage } from "./pages/products/PromotionsPage";
import { DiscountsPage } from "./pages/products/DiscountsPage";
import { ApprovalCenter } from "./pages/approvals/ApprovalCenter";
import { UsersInvitations } from "./pages/users/UsersInvitations";
import { UsersTeams } from "./pages/users/UsersTeams";
import { UsersCabinets } from "./pages/users/UsersCabinets";

// /login renders without the dashboard shell. The rest of the admin
// panel is wrapped in RequireAuth → DashboardLayout, so unauthenticated
// users are bounced to /login while we wait for /api/auth/me.
export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: <RequireAuth><DashboardLayout /></RequireAuth>,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "cabinet", element: <PersonalCabinet /> },
      { path: "chat", element: <ChatCenter /> },
      { path: "chat/wallboard", element: <WallBoard /> },
      { path: "users", element: <UsersList /> },
      { path: "users/invitations", element: <UsersInvitations /> },
      { path: "users/teams", element: <UsersTeams /> },
      { path: "users/cabinets", element: <UsersCabinets /> },
      { path: "pvz", element: <PVZList /> },
      { path: "pvz/:id", element: <PVZDetail /> },
      { path: "pvz/scan", element: <PVZScanTerminal /> },
      { path: "orders", element: <OrdersList /> },
      { path: "orders/:id", element: <OrderDetail /> },
      { path: "orders/report", element: <OrdersReport /> },
      { path: "couriers", element: <CouriersList /> },
      { path: "couriers/:id", element: <CourierDetail /> },
      { path: "compliance", element: <ComplianceCenter /> },
      { path: "warehouses", element: <WarehousesList /> },
      { path: "warehouses/:id", element: <WarehouseDetail /> },
      { path: "logistics", element: <LogisticsDashboard /> },
      { path: "merchants", element: <MerchantsList /> },
      { path: "merchants/:id", element: <MerchantDetail /> },
      { path: "finance", element: <FinanceDashboard /> },
      { path: "finance/payouts", element: <PayoutsList /> },
      { path: "finance/payouts/:id", element: <PayoutDetail /> },
      { path: "finance/refunds", element: <RefundCenter /> },
      { path: "products/promotions", element: <PromotionsPage /> },
      { path: "products/discounts", element: <DiscountsPage /> },
      { path: "approvals", element: <ApprovalCenter /> },
      { path: "support/tickets", element: <TicketsList /> },
      { path: "support/tickets/:id", element: <TicketDetail /> },
      { path: "security/audit", element: <AuditLog /> },
      { path: "security/rbac", element: <RBACManagement /> },
      { path: "security/center", element: <SecurityCenter /> },
      { path: "analytics", element: <Analytics /> },
      { path: "settings", element: <Settings /> },
      { path: "system/architecture", element: <ArchitecturePage /> },
    ],
  },
], {
  // basename "/admin/" so the SPA works behind nginx at https://<host>/admin/
  basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/',
});
