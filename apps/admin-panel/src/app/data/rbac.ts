/**
 * Single source of truth for RBAC.
 *
 *  - SIDEBAR_MODULES   — every sidebar item (top-level + children) the app supports.
 *  - BASE_PERMS        — generic per-module verbs (view / create / edit / etc).
 *  - SPECIAL_PERMS     — cross-cutting unique permissions (legal.*, accounting.*, ...).
 *  - PREDEFINED_ROLES  — 17 default roles with their permission sets.
 *  - hasPerm(perms, p) — helper that respects the wildcard `*`.
 *
 * The legacy `rbac-data.ts` still exports a few maps used by older pages
 * (UsersList, etc.) — that file now re-builds those maps from PREDEFINED_ROLES
 * so everything stays consistent.
 */

import {
  LayoutDashboard, MapPin, Package, Bike, Warehouse, Store, DollarSign,
  MessageSquare, BarChart3, Settings, Shield, Route, Users, ShieldCheck,
  Megaphone, FileText, Tag, CheckCircle2, ClipboardList, Network, Briefcase,
  Calculator, Scale, FileSpreadsheet, Crown, Sparkles, TrendingUp,
  Image as ImageIcon, Layers, Mail, Building2, ScanLine, Lock, Key,
  Globe, AlertTriangle, LogIn, Monitor, RotateCcw, Wallet, Plane, Receipt,
  HandCoins, Boxes, FileCheck2, GitBranch, Truck, BookOpen,
} from 'lucide-react';

// ─── Sidebar modules ──────────────────────────────────────────────────────────

export interface SidebarChild {
  key:   string;          // permission base key (e.g. 'finance.payouts')
  label: string;
  href:  string;
  icon:  any;
  /** When true, NavLink uses end={true} for exact-match active. */
  exact?: boolean;
  /** Tab-deep-link target (e.g. /security/center?tab=sessions). */
  tab?: string;
  /** Optional badge counter. */
  badge?: number;
}

export interface SidebarModule {
  key:        string;     // permission base key (e.g. 'finance')
  label:      string;
  href:       string;
  icon:       any;
  /** Section heading (groups items in sidebar). */
  section?:   string;
  /** When true, top-level NavLink uses end={true}. */
  exact?:     boolean;
  /** Optional badge counter on the parent. */
  badge?:     number;
  /** Sub-routes; permission is `${child.key}.view` (or just inherits parent). */
  children?:  SidebarChild[];
}

/**
 * Sidebar item ordering follows the layout the user requested.
 * Permission to see an item = `${item.key}.view`, OR wildcard, OR explicit
 * permission match.
 */
export const SIDEBAR_MODULES: SidebarModule[] = [
  // ── Operational ──
  { key: 'dashboard', label: 'Операционная панель', href: '/', icon: LayoutDashboard, exact: true },
  {
    key: 'users', label: 'Пользователи', href: '/users', icon: Users,
    children: [
      { key: 'users',              label: 'Все пользователи',  href: '/users',              icon: Users, exact: true },
      { key: 'users.invitations',  label: 'Приглашения',       href: '/users/invitations',  icon: Mail },
      { key: 'users.teams',        label: 'Команды и отделы',  href: '/users/teams',        icon: Building2 },
      { key: 'users.cabinets',     label: 'Кабинеты и доступ', href: '/users/cabinets',     icon: Layers },
    ],
  },
  {
    key: 'pvz', label: 'ПВЗ', href: '/pvz', icon: MapPin,
    children: [
      { key: 'pvz',         label: 'Список ПВЗ',           href: '/pvz',      icon: MapPin, exact: true },
      // Preview-only inside admin-panel; real terminal lives in apps/pickup-point-app
      { key: 'pvz.scan',    label: 'Терминал ПВЗ (preview)', href: '/pvz/scan', icon: ScanLine },
    ],
  },
  {
    key: 'orders', label: 'Заказы', href: '/orders', icon: Package,
    exact: true,
    children: [
      { key: 'orders',         label: 'Все заказы',      href: '/orders',         icon: Package, exact: true },
      { key: 'orders.report',  label: 'Отчёт менеджера', href: '/orders/report',  icon: FileText },
    ],
  },
  { key: 'couriers',   label: 'Курьеры',              href: '/couriers',   icon: Bike,          exact: true },
  { key: 'compliance', label: 'Проверка документов', href: '/compliance', icon: ClipboardList, exact: true },
  { key: 'warehouses', label: 'Склады',               href: '/warehouses', icon: Warehouse },
  { key: 'logistics',  label: 'Логистика',            href: '/logistics',  icon: Route },
  { key: 'merchants',  label: 'Продавцы',             href: '/merchants',  icon: Store },

  // ── Catalog / commerce ──
  {
    key: 'products', label: 'Товары', href: '/products', icon: Package,
    section: 'Каталог',
    exact: true,
    children: [
      { key: 'products',              label: 'Все товары',            href: '/products',             icon: Package, exact: true },
      { key: 'products.own',          label: 'Товары нашей фирмы',    href: '/products/own',         icon: ShieldCheck },
      { key: 'products.popular',      label: 'Популярные',            href: '/products/popular',     icon: TrendingUp },
      { key: 'products.recommended',  label: 'Рекомендуемые',         href: '/products/recommended', icon: Sparkles },
      { key: 'products.showcase',     label: 'Витрина / Первые ряды', href: '/products/showcase',    icon: Crown },
      { key: 'products.categories',   label: 'Категории',             href: '/products/categories',  icon: Layers },
      { key: 'products.media',        label: 'Медиа товаров',         href: '/products/media',       icon: ImageIcon },
    ],
  },
  {
    key: 'promotions', label: 'Продвижение', href: '/products/promotions', icon: Megaphone,
    section: 'Каталог',
    children: [
      { key: 'promotions',           label: 'Акции и промо',  href: '/products/promotions', icon: Megaphone },
      { key: 'discounts',            label: 'Скидки',         href: '/products/discounts',  icon: Tag },
      { key: 'promotions.boost',     label: 'Продвигаемые',   href: '/products/boost',      icon: TrendingUp },
      { key: 'promotions.campaigns', label: 'Кампании',       href: '/products/campaigns',  icon: Sparkles },
    ],
  },

  // ── Finance & accounting ──
  {
    key: 'finance', label: 'Финансы', href: '/finance', icon: DollarSign,
    section: 'Финансы',
    children: [
      { key: 'finance',           label: 'Сводка',          href: '/finance',           icon: DollarSign, exact: true },
      { key: 'finance.payouts',   label: 'Выплаты',          href: '/finance/payouts',   icon: Wallet },
      { key: 'finance.refunds',   label: 'Возвраты',         href: '/finance/refunds',   icon: RotateCcw },
      { key: 'finance.commissions',label:'Комиссии',         href: '/finance/commissions',icon: TrendingUp },
      { key: 'finance.invoices',  label: 'Инвойсы',          href: '/finance/invoices',  icon: FileText },
      { key: 'finance.taxes',     label: 'Налоги',           href: '/finance/taxes',     icon: Calculator },
      { key: 'finance.reports',   label: 'Финансовые отчёты',href:'/finance/reports',    icon: FileSpreadsheet },
    ],
  },
  {
    key: 'accounting', label: 'Бухгалтерия', href: '/accounting', icon: Calculator,
    section: 'Финансы',
    children: [
      { key: 'accounting',                label: 'Сводка',                  href: '/accounting',              icon: Calculator, exact: true },
      { key: 'accounting.reconciliations',label: 'Сверки',                  href: '/accounting/reconciliations', icon: CheckCircle2 },
      { key: 'accounting.reports',        label: 'Отчёты бухгалтерии',      href: '/accounting/reports',      icon: FileSpreadsheet },
      { key: 'accounting.exports',        label: 'Экспорт для бухгалтера', href: '/accounting/exports',      icon: FileText },
      { key: 'accounting.taxes',          label: 'Налоговые документы',     href: '/accounting/taxes',        icon: Calculator },
    ],
  },

  // ── Legal ──
  {
    key: 'legal', label: 'Юридический отдел', href: '/legal', icon: Scale,
    section: 'Юридический',
    children: [
      { key: 'legal',                label: 'Сводка',                href: '/legal',                icon: Scale, exact: true },
      { key: 'legal.contracts',      label: 'Договоры',              href: '/legal/contracts',      icon: FileText },
      { key: 'legal.claims',         label: 'Претензии',             href: '/legal/claims',         icon: AlertTriangle },
      { key: 'legal.disputes',       label: 'Споры',                 href: '/legal/disputes',       icon: AlertTriangle },
      { key: 'legal.complaints',     label: 'Жалобы',                href: '/legal/complaints',     icon: MessageSquare },
      { key: 'legal.documents',      label: 'Юридические документы',href: '/legal/documents',      icon: ClipboardList },
      { key: 'legal.reports',        label: 'Юридические отчёты',   href: '/legal/reports',        icon: FileSpreadsheet },
    ],
  },

  // ── Communication ──
  { key: 'chat',     label: 'Чат-центр', href: '/chat', icon: MessageSquare, exact: true, badge: 7 },
  {
    key: 'support', label: 'Поддержка', href: '/support/tickets', icon: MessageSquare,
    children: [
      { key: 'support',           label: 'Тикеты',     href: '/support/tickets', icon: MessageSquare, exact: true },
      { key: 'support.wallboard', label: 'Wallboard',  href: '/chat/wallboard',  icon: Monitor },
    ],
  },

  // ── Security / approvals ──
  {
    key: 'security', label: 'Безопасность', href: '/security/center', icon: Shield,
    section: 'Безопасность',
    children: [
      { key: 'security',           label: 'Центр безопасности',  href: '/security/center',         icon: Shield },
      { key: 'security.audit',     label: 'Журнал аудита',       href: '/security/audit',          icon: FileText },
      { key: 'security.rbac',      label: 'Роли и права',         href: '/security/rbac',           icon: ShieldCheck },
      { key: 'security.sessions',  label: 'Сессии и устройства', href: '/security/center', tab: 'sessions', icon: Monitor },
      { key: 'security.logins',    label: 'Подозрит. входы',      href: '/security/center', tab: 'logins',   icon: LogIn },
      { key: 'security.ip',        label: 'IP Access Rules',      href: '/security/center', tab: 'ip',       icon: Globe },
      { key: 'security.alerts',    label: 'Security Alerts',      href: '/security/center', tab: 'alerts',   icon: AlertTriangle },
      { key: 'security.tokens',    label: 'Токены и ключи',       href: '/security/center', tab: 'tokens',   icon: Key },
      { key: 'security.policies',  label: 'Политика паролей',     href: '/security/center', tab: 'policies', icon: Lock },
    ],
  },
  { key: 'approvals', label: 'Центр одобрения', href: '/approvals', icon: CheckCircle2, exact: true, badge: 10 },

  // ── Foreign Paid Local Delivery ──
  {
    key: 'foreign_delivery', label: 'Зарубежная оплата', href: '/foreign-delivery', icon: Plane,
    section: 'Зарубежные расчёты',
    children: [
      { key: 'foreign_delivery',                       label: 'Обзор',                          href: '/foreign-delivery',                       icon: Plane, exact: true },
      { key: 'foreign_delivery.orders',                label: 'Зарубежные заказы',              href: '/foreign-delivery/orders',                icon: Package },
      { key: 'foreign_delivery.settlement_cards',      label: 'Карточки расчёта',               href: '/foreign-delivery/settlement-cards',      icon: Receipt },
      { key: 'foreign_delivery.daily_registry',        label: 'Дневной реестр',                 href: '/foreign-delivery/daily-registry',        icon: ClipboardList },
      { key: 'foreign_delivery.weekly_registry',       label: 'Недельный реестр',               href: '/foreign-delivery/weekly-registry',       icon: ClipboardList },
      { key: 'foreign_delivery.monthly',               label: 'Ежемесячный отчёт',              href: '/foreign-delivery/monthly-settlement',    icon: FileSpreadsheet },
      { key: 'foreign_delivery.local_fulfillment',     label: 'Локальное исполнение',          href: '/foreign-delivery/local-fulfillment',     icon: Truck },
      { key: 'foreign_delivery.local_sellers',         label: 'Местные продавцы',               href: '/foreign-delivery/local-sellers',         icon: Store },
      { key: 'foreign_delivery.seller_settlements',    label: 'Расчёты с продавцами',           href: '/foreign-delivery/seller-settlements',    icon: HandCoins },
      { key: 'foreign_delivery.suppliers',             label: 'Поставщики',                     href: '/foreign-delivery/suppliers',             icon: Boxes },
      { key: 'foreign_delivery.supplier_payables',     label: 'Задолженность поставщикам',      href: '/foreign-delivery/supplier-payables',     icon: Receipt },
      { key: 'foreign_delivery.intercompany_debt',     label: 'Задолженность между компаниями', href: '/foreign-delivery/intercompany-debt',     icon: Building2 },
      { key: 'foreign_delivery.setoff',                label: 'Взаимозачёт',                    href: '/foreign-delivery/setoff',                icon: GitBranch },
      { key: 'foreign_delivery.documents',             label: 'Документы',                      href: '/foreign-delivery/documents',             icon: FileCheck2 },
      { key: 'foreign_delivery.accounting_export',     label: 'Экспорт для бухгалтера',         href: '/foreign-delivery/accounting-export',     icon: BookOpen },
      { key: 'foreign_delivery.settings',              label: 'Настройки расчётов',             href: '/foreign-delivery/settings',              icon: Settings },
    ],
  },

  // ── Reports & analytics ──
  { key: 'analytics', label: 'Аналитика', href: '/analytics', icon: BarChart3, section: 'Отчётность' },
  {
    key: 'reports', label: 'Отчёты', href: '/reports', icon: FileSpreadsheet,
    section: 'Отчётность',
    children: [
      { key: 'reports',            label: 'Сводка',              href: '/reports',           icon: FileSpreadsheet, exact: true },
      { key: 'reports.orders',     label: 'Заказы',              href: '/reports/orders',     icon: Package },
      { key: 'reports.finance',    label: 'Финансы',             href: '/reports/finance',    icon: DollarSign },
      { key: 'reports.sellers',    label: 'Продавцы',            href: '/reports/sellers',    icon: Store },
      { key: 'reports.couriers',   label: 'Курьеры',             href: '/reports/couriers',   icon: Bike },
      { key: 'reports.pvz',        label: 'ПВЗ',                 href: '/reports/pvz',        icon: MapPin },
      { key: 'reports.warehouses', label: 'Склады',              href: '/reports/warehouses', icon: Warehouse },
      { key: 'reports.legal',      label: 'Юридические',         href: '/reports/legal',      icon: Scale },
      { key: 'reports.accounting', label: 'Бухгалтерские',       href: '/reports/accounting', icon: Calculator },
      { key: 'reports.marketing',  label: 'Маркетинг',           href: '/reports/marketing',  icon: Megaphone },
    ],
  },

  // ── System ──
  { key: 'settings',     label: 'Системные настройки', href: '/settings',           icon: Settings, section: 'Система' },
  { key: 'audit',        label: 'Audit log',            href: '/security/audit',     icon: FileText, section: 'Система' },
  { key: 'architecture', label: 'Platform Architecture',href: '/system/architecture',icon: Network,  section: 'Система', exact: true },
];

// ─── Permissions ──────────────────────────────────────────────────────────────

/** Generic verbs — combine with a module key (e.g. 'orders.view'). */
export const BASE_VERBS = [
  'view', 'create', 'edit', 'delete', 'archive', 'export', 'approve',
  'reject', 'upload', 'download', 'manage', 'assign', 'block', 'unblock',
  'request_documents', 'resolve', 'audit_view',
] as const;

/** Cross-cutting / unique permissions that don't fit `${module}.${verb}`. */
export const SPECIAL_PERMS = [
  // Roles
  'roles.create', 'roles.edit', 'roles.assign', 'roles.delete',
  'superadmin.audit.view',
  // Accounting
  'accounting.view',
  'accounting.payouts.approve', 'accounting.payouts.hold',
  'accounting.invoices.manage',
  'accounting.taxes.view',
  'accounting.reports.export',
  // Legal
  'legal.view',
  'legal.contracts.manage',
  'legal.claims.manage',
  'legal.disputes.resolve',
  'legal.documents.request',
  'legal.reports.export',
  // Catalog
  'products.showcase.manage',
  'products.recommended.manage',
  'products.popular.manage',
  'products.boost.company',
  'products.boost.merchant',
  'products.media.approve',
  'products.media.reject',
  'promotions.products.manage',
  'discounts.products.manage',
  // Security
  'security.sessions.terminate',
  'security.ip.block',
  'security.tokens.rotate',
  'security.sso.manage',
  // ── Foreign Paid Local Delivery ──
  'foreign_delivery.view',
  'foreign_delivery.orders.view',
  'foreign_delivery.orders.manage',
  'foreign_delivery.settlement_cards.view',
  'foreign_delivery.settlement_cards.manage',
  'foreign_delivery.daily_registry.view',
  'foreign_delivery.daily_registry.export',
  'foreign_delivery.weekly_registry.view',
  'foreign_delivery.weekly_registry.export',
  'foreign_delivery.monthly.view',
  'foreign_delivery.monthly.generate',
  'foreign_delivery.monthly.close',
  'foreign_delivery.monthly.override',
  'foreign_delivery.financials.view',
  'foreign_delivery.margin.view',
  'foreign_delivery.local_fulfillment.view',
  'foreign_delivery.local_fulfillment.manage',
  'foreign_delivery.local_sellers.view',
  'foreign_delivery.local_sellers.manage',
  'foreign_delivery.seller_settlements.view',
  'foreign_delivery.seller_settlements.manage',
  'foreign_delivery.suppliers.view',
  'foreign_delivery.suppliers.manage',
  'foreign_delivery.supplier_payables.view',
  'foreign_delivery.supplier_payables.manage',
  'foreign_delivery.intercompany_debt.view',
  'foreign_delivery.setoff.view',
  'foreign_delivery.setoff.confirm',
  'foreign_delivery.documents.view',
  'foreign_delivery.documents.upload',
  'foreign_delivery.documents.approve',
  'foreign_delivery.documents.download',
  'foreign_delivery.accounting_export',
  'foreign_delivery.settings.manage',
] as const;

export type BaseVerb     = typeof BASE_VERBS[number];
export type SpecialPerm  = typeof SPECIAL_PERMS[number];

/** Build the per-module permission list (e.g. for the RBAC matrix). */
export function permsForModule(moduleKey: string): string[] {
  return BASE_VERBS.map(v => `${moduleKey}.${v}`);
}

// ─── Predefined roles ─────────────────────────────────────────────────────────

/**
 * Which app a role belongs to.
 *
 * IMPORTANT — architectural rule:
 *  - 'admin'   → the user logs into apps/admin-panel (admin.ehlitrend.com).
 *  - any other → the user logs into the corresponding app on its own
 *    subdomain (courier.*, warehouse.*, partner.*, pvz.*, ehlitrend.com).
 *    Admin Panel never exposes the working interface of those roles —
 *    it only manages / supervises them.
 *  - 'preview' is a dev convenience: SuperAdmin can impersonate this role
 *    inside Admin Panel to *see what would be visible* in another app,
 *    without that user actually working from Admin Panel.
 */
export type AppScope =
  | 'admin' | 'courier' | 'warehouse' | 'seller' | 'pickup' | 'customer'
  | 'preview';

export const APP_SCOPE_LABELS: Record<AppScope, string> = {
  admin:     'Admin Panel',
  courier:   'Courier App',
  warehouse: 'Warehouse App',
  seller:    'Seller App',
  pickup:    'PVZ App',
  customer:  'Customer App',
  preview:   'Preview',
};

export const APP_SCOPE_HOSTS: Record<AppScope, string> = {
  admin:     'admin.ehlitrend.com',
  courier:   'courier.ehlitrend.com',
  warehouse: 'warehouse.ehlitrend.com',
  seller:    'partner.ehlitrend.com',
  pickup:    'pvz.ehlitrend.com',
  customer:  'ehlitrend.com',
  preview:   '—',
};

export interface PredefinedRole {
  id:          string;
  /** Identifier used in user.role + URL params. */
  name:        string;
  label:       string;
  description: string;
  /** Tailwind color name (red/purple/blue/...). */
  color:       string;
  /** True for built-in, non-deletable roles. */
  isSystem:    boolean;
  /** When true, the role is currently active and assignable. */
  active:      boolean;
  /** Permission set. Use ['*'] for wildcard (SuperAdmin). */
  permissions: string[];
  /** Default user count (used as a non-functional badge in RBAC list). */
  users?:      number;
  /**
   * Which app this role logs into. See AppScope.
   * Roles where appScope !== 'admin' are listed in Admin Panel for
   * supervision/preview, but the user actually works in another app.
   */
  appScope:    AppScope;
}

/**
 * Helper to expand verbs into a list of permissions for a module.
 *  m('orders', 'view', 'edit') → ['orders.view', 'orders.edit']
 *  m('orders')                  → all base verbs for 'orders'
 */
const m = (mod: string, ...verbs: BaseVerb[]): string[] =>
  verbs.length === 0 ? permsForModule(mod) : verbs.map(v => `${mod}.${v}`);

export const PREDEFINED_ROLES: PredefinedRole[] = [
  {
    id: 'r-superadmin', name: 'SuperAdmin', label: 'Супер-администратор',
    description: 'Полный доступ ко всему: видит все разделы, создаёт роли, управляет правами.',
    color: 'red', isSystem: true, active: true, users: 2, appScope: 'admin',
    permissions: ['*'],
  },
  {
    id: 'r-admin', name: 'Admin', label: 'Администратор',
    description: 'Управляет операционными разделами: пользователи, заказы, ПВЗ, курьеры, склады, продавцы, поддержка.',
    color: 'purple', isSystem: true, active: true, users: 5, appScope: 'admin',
    permissions: [
      ...m('dashboard', 'view'),
      ...m('users', 'view', 'create', 'edit', 'block', 'unblock', 'assign'),
      ...m('users.invitations', 'view', 'create'),
      ...m('users.teams', 'view', 'edit'),
      ...m('users.cabinets', 'view', 'edit'),
      ...m('orders', 'view', 'edit', 'export'),
      ...m('pvz', 'view', 'manage'),
      ...m('couriers', 'view', 'manage', 'assign'),
      ...m('warehouses', 'view', 'manage'),
      ...m('merchants', 'view', 'edit'),
      ...m('support', 'view', 'create', 'edit', 'resolve'),
      ...m('chat', 'view', 'edit'),
      ...m('analytics', 'view'),
      ...m('reports', 'view', 'export'),
      ...m('approvals', 'view', 'approve', 'reject'),
      ...m('compliance', 'view'),
    ],
  },
  {
    id: 'r-ops', name: 'OperationsManager', label: 'Операционный менеджер',
    description: 'Контроль операций: заказы, ПВЗ, курьеры, склады, логистика, SLA.',
    color: 'blue', isSystem: true, active: true, users: 6, appScope: 'admin',
    permissions: [
      ...m('dashboard', 'view'),
      ...m('pvz', 'view'),
      ...m('orders', 'view', 'edit', 'export'),
      ...m('couriers', 'view', 'assign'),
      ...m('warehouses', 'view'),
      ...m('logistics', 'view', 'manage'),
      ...m('analytics', 'view'),
      ...m('reports', 'view'),
    ],
  },
  {
    id: 'r-pvz', name: 'PVZManager', label: 'Менеджер ПВЗ',
    description: 'Управляет ПВЗ: смена, приёмка, выдача, кассa, персонал, аудит ПВЗ.',
    color: 'green', isSystem: true, active: true, users: 14, appScope: 'admin',
    permissions: [
      ...m('pvz', 'view', 'edit', 'manage', 'audit_view'),
      ...m('pvz.scan', 'view'),
      ...m('orders', 'view', 'edit'),
      ...m('users.teams', 'view'),
    ],
  },
  {
    id: 'r-warehouse', name: 'WarehouseManager', label: 'Менеджер склада',
    description: 'Поставки, отгрузки, остатки, персонал склада, складские отчёты.',
    color: 'teal', isSystem: true, active: true, users: 8, appScope: 'admin',
    permissions: [
      ...m('warehouses', 'view', 'edit', 'manage', 'export'),
      ...m('orders', 'view'),
      ...m('reports.warehouses', 'view', 'export'),
    ],
  },
  {
    id: 'r-couriers', name: 'CourierManager', label: 'Менеджер курьеров',
    description: 'Назначение заказов, маршруты, контроль доставки.',
    color: 'yellow', isSystem: true, active: true, users: 4, appScope: 'admin',
    permissions: [
      ...m('couriers', 'view', 'manage', 'assign'),
      ...m('orders', 'view', 'edit'),
      ...m('logistics', 'view'),
      ...m('support', 'view', 'create'),
      ...m('reports.couriers', 'view', 'export'),
    ],
  },
  {
    id: 'r-support', name: 'SupportAgent', label: 'Поддержка',
    description: 'Чаты, тикеты, эскалация, запросы фото/документов.',
    color: 'pink', isSystem: true, active: true, users: 12, appScope: 'admin',
    permissions: [
      ...m('chat', 'view', 'edit'),
      ...m('support', 'view', 'create', 'edit', 'resolve'),
      ...m('orders', 'view'),
      ...m('users', 'view'),
    ],
  },
  {
    id: 'r-accountant', name: 'Accountant', label: 'Бухгалтер',
    description: 'Бухгалтерия, финансы, выплаты, возвраты, комиссии, инвойсы, налоги.',
    color: 'orange', isSystem: true, active: true, users: 3, appScope: 'admin',
    permissions: [
      ...m('accounting', 'view', 'edit', 'export'),
      ...m('accounting.reconciliations', 'view', 'edit', 'export'),
      ...m('accounting.reports', 'view', 'export'),
      ...m('accounting.exports', 'view', 'download'),
      ...m('accounting.taxes', 'view'),
      ...m('finance', 'view'),
      ...m('finance.payouts',     'view'),
      ...m('finance.refunds',     'view'),
      ...m('finance.commissions', 'view'),
      ...m('finance.invoices',    'view'),
      ...m('finance.reports',     'view', 'export'),
      ...m('reports', 'view'),
      ...m('reports.finance',     'view', 'export'),
      ...m('reports.accounting',  'view', 'export'),
      'accounting.view',
      'accounting.payouts.approve',
      'accounting.payouts.hold',
      'accounting.invoices.manage',
      'accounting.taxes.view',
      'accounting.reports.export',
      // Foreign delivery — accountant view + monthly + accounting export
      ...m('foreign_delivery', 'view'),
      ...m('foreign_delivery.monthly', 'view', 'export'),
      ...m('foreign_delivery.daily_registry'),
      ...m('foreign_delivery.weekly_registry'),
      ...m('foreign_delivery.intercompany_debt', 'view'),
      ...m('foreign_delivery.documents', 'view', 'download'),
      ...m('foreign_delivery.accounting_export', 'view', 'download'),
      'foreign_delivery.view',
      'foreign_delivery.monthly.view', 'foreign_delivery.monthly.generate',
      'foreign_delivery.daily_registry.view', 'foreign_delivery.daily_registry.export',
      'foreign_delivery.weekly_registry.view','foreign_delivery.weekly_registry.export',
      'foreign_delivery.intercompany_debt.view',
      'foreign_delivery.documents.view',       'foreign_delivery.documents.download',
      'foreign_delivery.accounting_export',
    ],
  },
  {
    id: 'r-chiefacc', name: 'ChiefAccountant', label: 'Главный бухгалтер',
    description: 'Бухгалтер + утверждение крупных выплат, налоговые отчёты, сверки, аудит финансовых действий.',
    color: 'orange', isSystem: true, active: true, users: 1, appScope: 'admin',
    permissions: [
      // Inherits accountant perms
      ...m('accounting'),
      ...m('accounting.reconciliations'),
      ...m('accounting.reports'),
      ...m('accounting.exports'),
      ...m('accounting.taxes'),
      ...m('finance', 'view', 'export'),
      ...m('finance.payouts',     'view', 'approve'),
      ...m('finance.refunds',     'view'),
      ...m('finance.commissions', 'view', 'edit'),
      ...m('finance.invoices',    'view', 'edit'),
      ...m('finance.taxes',       'view', 'edit'),
      ...m('finance.reports',     'view', 'export'),
      ...m('reports', 'view', 'export'),
      ...m('reports.finance',     'view', 'export'),
      ...m('reports.accounting',  'view', 'export'),
      'accounting.view',
      'accounting.payouts.approve', 'accounting.payouts.hold',
      'accounting.invoices.manage', 'accounting.taxes.view',
      'accounting.reports.export',
      'audit.view',
      'superadmin.audit.view',
      // Foreign delivery — chief accountant has full financials + setoff confirmation
      ...m('foreign_delivery'),
      ...m('foreign_delivery.monthly', 'view', 'generate', 'export', 'manage'),
      ...m('foreign_delivery.daily_registry'),
      ...m('foreign_delivery.weekly_registry'),
      ...m('foreign_delivery.intercompany_debt'),
      ...m('foreign_delivery.setoff', 'view', 'edit', 'manage'),
      ...m('foreign_delivery.supplier_payables', 'view'),
      ...m('foreign_delivery.documents'),
      ...m('foreign_delivery.accounting_export'),
      'foreign_delivery.view',
      'foreign_delivery.financials.view', 'foreign_delivery.margin.view',
      'foreign_delivery.daily_registry.view',  'foreign_delivery.daily_registry.export',
      'foreign_delivery.weekly_registry.view', 'foreign_delivery.weekly_registry.export',
      'foreign_delivery.monthly.view', 'foreign_delivery.monthly.generate', 'foreign_delivery.monthly.close',
      'foreign_delivery.intercompany_debt.view',
      'foreign_delivery.setoff.view', 'foreign_delivery.setoff.confirm',
      'foreign_delivery.supplier_payables.view',
      'foreign_delivery.documents.view', 'foreign_delivery.documents.upload', 'foreign_delivery.documents.approve',
      'foreign_delivery.documents.download',
      'foreign_delivery.accounting_export',
    ],
  },
  {
    id: 'r-lawyer', name: 'Lawyer', label: 'Юрист',
    description: 'Договоры, претензии, споры, жалобы, документы продавцов, юридические отчёты.',
    color: 'indigo', isSystem: true, active: true, users: 2, appScope: 'admin',
    permissions: [
      ...m('legal', 'view', 'edit', 'export'),
      ...m('legal.contracts',  'view', 'create', 'edit', 'archive'),
      ...m('legal.claims',     'view', 'create', 'edit', 'resolve'),
      ...m('legal.disputes',   'view', 'edit', 'resolve'),
      ...m('legal.complaints', 'view', 'edit', 'resolve'),
      ...m('legal.documents',  'view', 'request_documents', 'upload'),
      ...m('legal.reports',    'view', 'export'),
      ...m('merchants', 'view'),
      ...m('reports.legal', 'view', 'export'),
      'legal.view',
      'legal.contracts.manage',
      'legal.claims.manage',
      'legal.disputes.resolve',
      'legal.documents.request',
      'legal.reports.export',
      // Lawyer can view documents/setoff acts but cannot move money
      ...m('foreign_delivery', 'view'),
      ...m('foreign_delivery.documents', 'view', 'download'),
      ...m('foreign_delivery.setoff', 'view'),
      'foreign_delivery.view',
      'foreign_delivery.documents.view', 'foreign_delivery.documents.download',
      'foreign_delivery.setoff.view',
    ],
  },
  {
    id: 'r-compliance', name: 'ComplianceManager', label: 'Compliance manager',
    description: 'Проверка документов, продавцы, audit log, compliance отчёты.',
    color: 'violet', isSystem: true, active: true, users: 2, appScope: 'admin',
    permissions: [
      ...m('compliance', 'view', 'approve', 'reject', 'request_documents', 'export'),
      ...m('merchants', 'view', 'block', 'unblock'),
      ...m('users', 'view'),
      ...m('audit', 'view'),
      ...m('reports', 'view'),
    ],
  },
  {
    id: 'r-sellers', name: 'SellerManager', label: 'Менеджер продавцов',
    description: 'Открытие профилей, статусы, документы, рейтинги, экспорт списка продавцов.',
    color: 'teal', isSystem: true, active: true, users: 3, appScope: 'admin',
    permissions: [
      ...m('merchants', 'view', 'edit', 'export', 'block', 'unblock', 'request_documents'),
      ...m('products', 'view'),
      ...m('orders', 'view'),
      ...m('reports.sellers', 'view', 'export'),
    ],
  },
  {
    id: 'r-products', name: 'ProductManager', label: 'Product manager',
    description: 'Каталог: добавление, редактирование, медиа, категории, модерация.',
    color: 'blue', isSystem: true, active: true, users: 4, appScope: 'admin',
    permissions: [
      ...m('products', 'view', 'create', 'edit', 'archive', 'export'),
      ...m('products.own',         'view', 'create', 'edit', 'archive'),
      ...m('products.categories',  'view', 'create', 'edit'),
      ...m('products.media',       'view', 'upload', 'approve', 'reject'),
      'products.media.approve',
      'products.media.reject',
    ],
  },
  {
    id: 'r-showcase', name: 'ShowcaseManager', label: 'Менеджер витрины',
    description: 'Витрина / первые ряды, рекомендуемые, популярные, продвижение, audit.',
    color: 'yellow', isSystem: true, active: true, users: 1, appScope: 'admin',
    permissions: [
      ...m('products', 'view'),
      ...m('products.popular',     'view', 'manage'),
      ...m('products.recommended', 'view', 'create', 'edit', 'manage'),
      ...m('products.showcase',    'view', 'create', 'edit', 'manage'),
      ...m('promotions', 'view'),
      'products.showcase.manage',
      'products.recommended.manage',
      'products.popular.manage',
      'products.boost.company',
      'products.boost.merchant',
    ],
  },
  {
    id: 'r-marketing', name: 'MarketingManager', label: 'Маркетинг-менеджер',
    description: 'Акции, скидки, рекомендуемые, отчёты маркетинга.',
    color: 'pink', isSystem: true, active: true, users: 2, appScope: 'admin',
    permissions: [
      ...m('promotions', 'view', 'create', 'edit', 'archive', 'export'),
      ...m('discounts',  'view', 'create', 'edit', 'archive'),
      ...m('promotions.boost',     'view', 'edit', 'manage'),
      ...m('promotions.campaigns', 'view', 'create', 'edit'),
      ...m('products.recommended', 'view', 'create', 'edit'),
      ...m('reports.marketing', 'view', 'export'),
      'promotions.products.manage',
      'discounts.products.manage',
    ],
  },
  {
    id: 'r-security', name: 'SecurityOfficer', label: 'Офицер безопасности',
    description: 'Сессии, IP, токены, SSO, audit log, security report.',
    color: 'red', isSystem: true, active: true, users: 1, appScope: 'admin',
    permissions: [
      ...m('security', 'view', 'edit', 'export'),
      ...m('security.audit',    'view', 'export'),
      ...m('security.sessions', 'view'),
      ...m('security.logins',   'view'),
      ...m('security.ip',       'view', 'edit'),
      ...m('security.alerts',   'view'),
      ...m('security.tokens',   'view', 'edit'),
      ...m('security.policies', 'view', 'edit'),
      ...m('audit', 'view'),
      'security.sessions.terminate',
      'security.ip.block',
      'security.tokens.rotate',
      'security.sso.manage',
    ],
  },
  {
    id: 'r-analyst', name: 'Analyst', label: 'Аналитик',
    description: 'Аналитика, отчёты, заказы (read-only), финансы (read-only при разрешении).',
    color: 'gray', isSystem: true, active: true, users: 3, appScope: 'admin',
    permissions: [
      ...m('analytics', 'view', 'export'),
      ...m('reports', 'view', 'export'),
      ...m('reports.orders',     'view', 'export'),
      ...m('reports.finance',    'view', 'export'),
      ...m('reports.sellers',    'view', 'export'),
      ...m('reports.couriers',   'view', 'export'),
      ...m('reports.pvz',        'view', 'export'),
      ...m('reports.warehouses', 'view', 'export'),
      ...m('reports.marketing',  'view', 'export'),
      ...m('orders', 'view'),
      ...m('dashboard', 'view'),
    ],
  },
  // ── Foreign-delivery specific roles ────────────────────────────────────────
  {
    id: 'r-poland-fin', name: 'PolandFinance', label: 'Польша · Финансы',
    description: 'Видит оплату клиента, маржу Польши, долги перед TM/поставщиками. Экспорт отчётов.',
    color: 'blue', isSystem: true, active: true, users: 2, appScope: 'admin',
    permissions: [
      ...m('dashboard', 'view'),
      ...m('foreign_delivery'),
      ...m('foreign_delivery.orders'),
      ...m('foreign_delivery.settlement_cards'),
      ...m('foreign_delivery.daily_registry'),
      ...m('foreign_delivery.weekly_registry'),
      ...m('foreign_delivery.monthly', 'view', 'export'),
      ...m('foreign_delivery.intercompany_debt', 'view', 'export'),
      ...m('foreign_delivery.setoff', 'view'),
      ...m('foreign_delivery.documents', 'view', 'download'),
      ...m('foreign_delivery.accounting_export', 'view', 'download'),
      'foreign_delivery.view',
      'foreign_delivery.orders.view',
      'foreign_delivery.settlement_cards.view',
      'foreign_delivery.financials.view',
      'foreign_delivery.margin.view',
      'foreign_delivery.daily_registry.view', 'foreign_delivery.daily_registry.export',
      'foreign_delivery.weekly_registry.view','foreign_delivery.weekly_registry.export',
      'foreign_delivery.monthly.view',         'foreign_delivery.monthly.generate',
      'foreign_delivery.intercompany_debt.view',
      'foreign_delivery.setoff.view',
      'foreign_delivery.documents.view',       'foreign_delivery.documents.download',
      'foreign_delivery.accounting_export',
    ],
  },
  {
    id: 'r-tm-ops', name: 'TurkmenistanOperator', label: 'Туркменистан · Оператор',
    description: 'Видит локальное исполнение, продавцов, доставку, упаковку. Не видит маржу Польши без отдельного права.',
    color: 'green', isSystem: true, active: true, users: 4, appScope: 'admin',
    permissions: [
      ...m('dashboard', 'view'),
      ...m('foreign_delivery', 'view'),
      ...m('foreign_delivery.orders', 'view', 'edit'),
      ...m('foreign_delivery.settlement_cards', 'view'),
      ...m('foreign_delivery.local_fulfillment'),
      ...m('foreign_delivery.local_sellers'),
      ...m('foreign_delivery.seller_settlements', 'view'),
      ...m('foreign_delivery.documents', 'view', 'upload', 'download'),
      'foreign_delivery.view',
      'foreign_delivery.orders.view',  'foreign_delivery.orders.manage',
      'foreign_delivery.settlement_cards.view',
      'foreign_delivery.local_fulfillment.view',
      'foreign_delivery.local_fulfillment.manage',
      'foreign_delivery.local_sellers.view',
      'foreign_delivery.local_sellers.manage',
      'foreign_delivery.seller_settlements.view',
      'foreign_delivery.documents.view', 'foreign_delivery.documents.upload',
      'foreign_delivery.documents.download',
    ],
  },
  {
    id: 'r-supp-acc', name: 'SupplierAccountant', label: 'Бухгалтер по поставщикам',
    description: 'Видит поставщиков, invoices, отмечает оплаты, готовит отчёты по supplier-payables.',
    color: 'orange', isSystem: true, active: true, users: 1, appScope: 'admin',
    permissions: [
      ...m('dashboard', 'view'),
      ...m('foreign_delivery', 'view'),
      ...m('foreign_delivery.suppliers'),
      ...m('foreign_delivery.supplier_payables'),
      ...m('foreign_delivery.documents', 'view', 'upload', 'download'),
      ...m('foreign_delivery.accounting_export', 'view', 'download'),
      'foreign_delivery.view',
      'foreign_delivery.suppliers.view',
      'foreign_delivery.suppliers.manage',
      'foreign_delivery.supplier_payables.view',
      'foreign_delivery.supplier_payables.manage',
      'foreign_delivery.documents.view', 'foreign_delivery.documents.upload',
      'foreign_delivery.documents.download',
      'foreign_delivery.accounting_export',
    ],
  },
  // ── External-app roles (preview-only inside Admin Panel) ──────────────────
  //
  // These roles do NOT belong to Admin Panel. The user with one of these
  // roles works in their own app (courier-app / customer-app / seller-app
  // / pickup-point-app / warehouse-app). They appear in Admin Panel only
  // so SuperAdmin can:
  //   1. Manage them (assign/disable, see audit) from /admin/users.
  //   2. Impersonate them via "Просмотр как роль" to verify what their
  //      app *would* show — but the real working interface is elsewhere.
  //
  // Permissions are intentionally minimal: dashboard.view + the few
  // read-only modules an external user could glimpse if they accidentally
  // hit /admin/. Admin Panel never replaces their app.
  {
    id: 'r-courier', name: 'Courier', label: 'Курьер',
    description: 'Работает в Courier App (courier.ehlitrend.com). В Admin Panel — preview / управление.',
    color: 'yellow', isSystem: true, active: true, users: 0, appScope: 'courier',
    permissions: [
      ...m('dashboard', 'view'),
      ...m('orders', 'view'),
    ],
  },
  {
    id: 'r-customer', name: 'Customer', label: 'Покупатель',
    description: 'Работает в Customer App (ehlitrend.com). В Admin Panel — preview только.',
    color: 'gray', isSystem: true, active: true, users: 0, appScope: 'customer',
    permissions: [],
  },
  {
    id: 'r-seller', name: 'Seller', label: 'Продавец / Партнёр',
    description: 'Работает в Seller App (partner.ehlitrend.com). В Admin Panel — preview / управление.',
    color: 'green', isSystem: true, active: true, users: 0, appScope: 'seller',
    permissions: [
      ...m('dashboard', 'view'),
      ...m('products', 'view'),
      ...m('orders', 'view'),
    ],
  },
  {
    id: 'r-pvz-op', name: 'PickupOperator', label: 'Оператор ПВЗ',
    description: 'Работает в Pickup-Point App (pvz.ehlitrend.com). В Admin Panel — preview / управление.',
    color: 'green', isSystem: true, active: true, users: 0, appScope: 'pickup',
    permissions: [
      ...m('dashboard', 'view'),
      ...m('orders', 'view'),
    ],
  },
  {
    id: 'r-wh-worker', name: 'WarehouseWorker', label: 'Складчик',
    description: 'Работает в Warehouse App (warehouse.ehlitrend.com). В Admin Panel — preview / управление.',
    color: 'teal', isSystem: true, active: true, users: 0, appScope: 'warehouse',
    permissions: [
      ...m('dashboard', 'view'),
      ...m('warehouses', 'view'),
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns true when the user's permissions include `perm`, or '*'. */
export function hasPerm(perms: string[], perm: string): boolean {
  if (!perm) return true;
  if (perms.includes('*')) return true;
  return perms.includes(perm);
}

/** Returns true when the user can see (i.e. has `${moduleKey}.view`) the module. */
export function canSeeModuleByPerms(perms: string[], moduleKey?: string): boolean {
  if (!moduleKey) return true;
  if (perms.includes('*')) return true;
  return perms.includes(`${moduleKey}.view`);
}

/**
 * Look up a predefined role by name (case-sensitive). Returns SuperAdmin
 * as a fallback so callers always get something.
 */
export function getRoleByName(name: string): PredefinedRole {
  return PREDEFINED_ROLES.find(r => r.name === name)
      ?? PREDEFINED_ROLES[0];
}

export const ROLE_NAMES = PREDEFINED_ROLES.map(r => r.name);

/**
 * Aggregate all permissions referenced by all built-in roles + the registry.
 * Useful for building the matrix in RBACManagement.
 */
export function allKnownPermissions(): string[] {
  const set = new Set<string>(SPECIAL_PERMS);
  for (const m of SIDEBAR_MODULES) {
    permsForModule(m.key).forEach(p => set.add(p));
    for (const c of m.children ?? []) permsForModule(c.key).forEach(p => set.add(p));
  }
  for (const r of PREDEFINED_ROLES) for (const p of r.permissions) if (p !== '*') set.add(p);
  return Array.from(set).sort();
}
