import { createBrowserRouter, redirect } from "react-router-dom";
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
import { ProductsList } from "./pages/products/ProductsList";
import { ProductCategories } from "./pages/products/ProductCategories";
import { ProductMedia } from "./pages/products/ProductMedia";
import { OwnProducts } from "./pages/products/OwnProducts";
import { PopularProducts } from "./pages/products/PopularProducts";
import { RecommendedProducts } from "./pages/products/RecommendedProducts";
import { ShowcasePage } from "./pages/products/ShowcasePage";
import { ApprovalCenter } from "./pages/approvals/ApprovalCenter";
import { UsersInvitations } from "./pages/users/UsersInvitations";
import { UsersTeams } from "./pages/users/UsersTeams";
import { UsersCabinets } from "./pages/users/UsersCabinets";
// Accounting
import { AccountingDashboard } from "./pages/accounting/AccountingDashboard";
import { AccountingReconciliations } from "./pages/accounting/Reconciliations";
import { AccountingReports } from "./pages/accounting/AccountingReports";
import { AccountingExports } from "./pages/accounting/AccountingExports";
import { AccountingTaxes } from "./pages/accounting/AccountingTaxes";
// Legal
import { LegalDashboard } from "./pages/legal/LegalDashboard";
import { LegalContracts } from "./pages/legal/LegalContracts";
import { LegalClaims } from "./pages/legal/LegalClaims";
import { LegalDisputes } from "./pages/legal/LegalDisputes";
import { LegalComplaints } from "./pages/legal/LegalComplaints";
import { LegalDocuments } from "./pages/legal/LegalDocuments";
import { LegalReports } from "./pages/legal/LegalReports";
// Reports
import {
  ReportsDashboard, ReportsOrders, ReportsFinance, ReportsSellers,
  ReportsCouriers, ReportsPVZ, ReportsWarehouses, ReportsLegal,
  ReportsAccounting, ReportsMarketing,
} from "./pages/reports";
// Finance extensions
import {
  FinanceCommissions, FinanceInvoices, FinanceTaxes, FinanceReports,
} from "./pages/finance/FinanceExtensions";
// Promotions extensions
import { BoostPage } from "./pages/products/BoostPage";
import { CampaignsPage } from "./pages/products/CampaignsPage";
// Foreign Paid Local Delivery
import { ForeignDeliveryDashboard } from "./pages/foreign-delivery/ForeignDeliveryDashboard";
import { ForeignOrdersList } from "./pages/foreign-delivery/ForeignOrdersList";
import { SettlementCardsList } from "./pages/foreign-delivery/SettlementCardsList";
import { DailyRegistry, WeeklyRegistry } from "./pages/foreign-delivery/Registries";
import { MonthlySettlement } from "./pages/foreign-delivery/MonthlySettlement";
import { LocalFulfillment } from "./pages/foreign-delivery/LocalFulfillment";
import { LocalSellers, SellerSettlements } from "./pages/foreign-delivery/Sellers";
import { Suppliers, SupplierPayables } from "./pages/foreign-delivery/Suppliers";
import { IntercompanyDebt, Setoff } from "./pages/foreign-delivery/IntercompanySetoff";
import {
  ForeignDocuments, AccountingExport, ForeignSettingsPage,
} from "./pages/foreign-delivery/DocsExportSettings";

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
      { path: "products", Component: ProductsList },
      { path: "products/own", Component: OwnProducts },
      { path: "products/popular", Component: PopularProducts },
      { path: "products/recommended", Component: RecommendedProducts },
      { path: "products/showcase", Component: ShowcasePage },
      { path: "products/categories", Component: ProductCategories },
      { path: "products/media", Component: ProductMedia },
      { path: "products/promotions", Component: PromotionsPage },
      { path: "products/discounts", Component: DiscountsPage },
      { path: "products/boost", Component: BoostPage },
      { path: "products/campaigns", Component: CampaignsPage },
      // Finance extensions
      { path: "finance/commissions", Component: FinanceCommissions },
      { path: "finance/invoices",    Component: FinanceInvoices    },
      { path: "finance/taxes",       Component: FinanceTaxes       },
      { path: "finance/reports",     Component: FinanceReports     },
      // Accounting
      { path: "accounting",                  Component: AccountingDashboard       },
      { path: "accounting/reconciliations",  Component: AccountingReconciliations },
      { path: "accounting/reports",          Component: AccountingReports         },
      { path: "accounting/exports",          Component: AccountingExports         },
      { path: "accounting/taxes",            Component: AccountingTaxes           },
      // Legal
      { path: "legal",            Component: LegalDashboard  },
      { path: "legal/contracts",  Component: LegalContracts  },
      { path: "legal/claims",     Component: LegalClaims     },
      { path: "legal/disputes",   Component: LegalDisputes   },
      { path: "legal/complaints", Component: LegalComplaints },
      { path: "legal/documents",  Component: LegalDocuments  },
      { path: "legal/reports",    Component: LegalReports    },
      // Foreign Paid Local Delivery
      { path: "foreign-delivery",                       Component: ForeignDeliveryDashboard },
      { path: "foreign-delivery/orders",                Component: ForeignOrdersList        },
      { path: "foreign-delivery/settlement-cards",      Component: SettlementCardsList      },
      { path: "foreign-delivery/daily-registry",        Component: DailyRegistry            },
      { path: "foreign-delivery/weekly-registry",       Component: WeeklyRegistry           },
      { path: "foreign-delivery/monthly-settlement",    Component: MonthlySettlement        },
      { path: "foreign-delivery/local-fulfillment",     Component: LocalFulfillment         },
      { path: "foreign-delivery/local-sellers",         Component: LocalSellers             },
      { path: "foreign-delivery/seller-settlements",    Component: SellerSettlements        },
      { path: "foreign-delivery/suppliers",             Component: Suppliers                },
      { path: "foreign-delivery/supplier-payables",     Component: SupplierPayables         },
      { path: "foreign-delivery/intercompany-debt",     Component: IntercompanyDebt         },
      { path: "foreign-delivery/setoff",                Component: Setoff                   },
      { path: "foreign-delivery/documents",             Component: ForeignDocuments         },
      { path: "foreign-delivery/accounting-export",     Component: AccountingExport         },
      { path: "foreign-delivery/settings",              Component: ForeignSettingsPage      },
      // Reports
      { path: "reports",            Component: ReportsDashboard  },
      { path: "reports/orders",     Component: ReportsOrders     },
      { path: "reports/finance",    Component: ReportsFinance    },
      { path: "reports/sellers",    Component: ReportsSellers    },
      { path: "reports/couriers",   Component: ReportsCouriers   },
      { path: "reports/pvz",        Component: ReportsPVZ        },
      { path: "reports/warehouses", Component: ReportsWarehouses },
      { path: "reports/legal",      Component: ReportsLegal      },
      { path: "reports/accounting", Component: ReportsAccounting },
      { path: "reports/marketing",  Component: ReportsMarketing  },
      { path: "approvals", Component: ApprovalCenter },
      { path: "support/tickets", Component: TicketsList },
      { path: "support/tickets/:id", Component: TicketDetail },
      { path: "security/audit", Component: AuditLog },
      { path: "security/rbac", Component: RBACManagement },
      { path: "security/center", Component: SecurityCenter },
      { path: "analytics", Component: Analytics },
      { path: "settings", Component: Settings },
      { path: "system/architecture", Component: ArchitecturePage },
      // Catch-all: any unknown path under the admin panel → bounce to index.
      // This stops React Router's "404 Not Found" screen from ever showing.
      { path: "*", loader: () => redirect("/") },
    ],
  },
], {
  // basename so this SPA works under nginx alias /admin/.
  // Vite injects BASE_URL = "/admin/" at build time when called with --base=/admin/.
  // Trailing slash is stripped because React Router expects "/admin" (no trailing).
  // Falls back to "/" for plain `vite dev` (where BASE_URL is "/").
  basename: ((import.meta as any).env?.BASE_URL ?? "/").replace(/\/$/, "") || "/",
});