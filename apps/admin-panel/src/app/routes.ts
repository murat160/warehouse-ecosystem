import { createBrowserRouter } from "react-router-dom";
import { DashboardLayout } from "./components/layout/DashboardLayout";
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

export const router = createBrowserRouter([
  {
    path: "/",
    Component: DashboardLayout,
    children: [
      { index: true, Component: Dashboard },
      { path: "cabinet", Component: PersonalCabinet },
      { path: "chat", Component: ChatCenter },
      { path: "chat/wallboard", Component: WallBoard },
      { path: "users", Component: UsersList },
      { path: "users/invitations", Component: UsersInvitations },
      { path: "users/teams", Component: UsersTeams },
      { path: "users/cabinets", Component: UsersCabinets },
      { path: "pvz", Component: PVZList },
      { path: "pvz/:id", Component: PVZDetail },
      { path: "pvz/scan", Component: PVZScanTerminal },
      { path: "orders", Component: OrdersList },
      { path: "orders/:id", Component: OrderDetail },
      { path: "orders/report", Component: OrdersReport },
      { path: "couriers", Component: CouriersList },
      { path: "couriers/:id", Component: CourierDetail },
      { path: "compliance", Component: ComplianceCenter },
      { path: "warehouses", Component: WarehousesList },
      { path: "warehouses/:id", Component: WarehouseDetail },
      { path: "logistics", Component: LogisticsDashboard },
      { path: "merchants", Component: MerchantsList },
      { path: "merchants/:id", Component: MerchantDetail },
      { path: "finance", Component: FinanceDashboard },
      { path: "finance/payouts", Component: PayoutsList },
      { path: "finance/payouts/:id", Component: PayoutDetail },
      { path: "finance/refunds", Component: RefundCenter },
      { path: "products/promotions", Component: PromotionsPage },
      { path: "products/discounts", Component: DiscountsPage },
      { path: "approvals", Component: ApprovalCenter },
      { path: "support/tickets", Component: TicketsList },
      { path: "support/tickets/:id", Component: TicketDetail },
      { path: "security/audit", Component: AuditLog },
      { path: "security/rbac", Component: RBACManagement },
      { path: "security/center", Component: SecurityCenter },
      { path: "analytics", Component: Analytics },
      { path: "settings", Component: Settings },
      { path: "system/architecture", Component: ArchitecturePage },
    ],
  },
]);