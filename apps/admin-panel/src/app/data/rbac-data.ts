// ─── Shared RBAC data — used by both UsersList and RBACManagement ─────────────
//
// IMPORTANT — architectural separation (see docs/ROLES.md):
//
// The roles below fall into two groups:
//
//   1. Admin Panel roles  — log into apps/admin-panel (admin.ehlitrend.com).
//      These are SUPERVISORY positions: SuperAdmin, Admin, OperationsManager,
//      Accountant, Lawyer, ComplianceManager, SellerManager, ProductManager,
//      ShowcaseManager, MarketingManager, SecurityOfficer, SupportAgent,
//      OperationsManager, WarehouseManager (manager — NOT a worker),
//      CourierManager (manager — NOT a worker), PVZManager (manager — NOT
//      an operator), Analyst, ChiefAccountant, PolandFinance,
//      TurkmenistanOperator, SupplierAccountant, RegionalManager,
//      DocumentReviewer, ComplianceAdmin, LegalReviewer, Finance, QA,
//      Support, Admin.
//
//   2. External-app roles — work in their own app on their own subdomain.
//      They appear in this file because UsersList shows ALL users, but
//      they SHOULD NOT be assigned to a person who needs to use Admin Panel
//      as a working tool. Their working interface is elsewhere.
//
//      Courier        → apps/courier-app    (courier.ehlitrend.com)
//      Warehouse      → apps/warehouse-app  (warehouse.ehlitrend.com)
//      Merchant       → apps/seller-app     (partner.ehlitrend.com)
//      PVZOperator    → apps/pickup-point-app (pvz.ehlitrend.com)
//      Customer       → apps/customer-app   (ehlitrend.com)
//      Partner        → apps/seller-app     (partner.ehlitrend.com)
//
// The new registry in `data/rbac.ts` formalises this with `appScope`.

import {
  LayoutDashboard, MapPin, Package, Bike, Warehouse, Store,
  DollarSign, MessageSquare, BarChart3, Settings, Shield, Route, Users,
  ShieldCheck,
} from 'lucide-react';

/**
 * Roles whose working interface lives outside Admin Panel.
 * Use this set to tag/filter users in admin views (badge "External app",
 * disable "Open as user", etc).
 */
export const EXTERNAL_APP_ROLES: Record<string, { app: string; host: string }> = {
  Courier:          { app: 'Courier App',     host: 'courier.ehlitrend.com'   },
  Warehouse:        { app: 'Warehouse App',   host: 'warehouse.ehlitrend.com' },
  WarehouseWorker:  { app: 'Warehouse App',   host: 'warehouse.ehlitrend.com' },
  Merchant:         { app: 'Seller App',      host: 'partner.ehlitrend.com'   },
  Seller:           { app: 'Seller App',      host: 'partner.ehlitrend.com'   },
  Partner:          { app: 'Seller App',      host: 'partner.ehlitrend.com'   },
  PVZOperator:      { app: 'PVZ App',         host: 'pvz.ehlitrend.com'       },
  PickupOperator:   { app: 'PVZ App',         host: 'pvz.ehlitrend.com'       },
  Customer:         { app: 'Customer App',    host: 'ehlitrend.com'           },
};

/** True when the role's working interface is outside Admin Panel. */
export function isExternalAppRole(role: string): boolean {
  return !!EXTERNAL_APP_ROLES[role];
}

// All navigable modules in the system
export const ALL_MODULES = [
  { key: 'dashboard',   label: 'Операционная панель', href: '/',                    icon: LayoutDashboard },
  { key: 'pvz',         label: 'ПВЗ',                  href: '/pvz',                 icon: MapPin },
  { key: 'orders',      label: 'Заказы',               href: '/orders',              icon: Package },
  { key: 'couriers',    label: 'Курьеры',              href: '/couriers',            icon: Bike },
  { key: 'warehouses',  label: 'Склады',               href: '/warehouses',          icon: Warehouse },
  { key: 'logistics',   label: 'Логистика',            href: '/logistics',           icon: Route },
  { key: 'merchants',   label: 'Продавцы',             href: '/merchants',           icon: Store },
  { key: 'finance',     label: 'Финансы',              href: '/finance',             icon: DollarSign },
  { key: 'support',     label: 'Поддержка',            href: '/support/tickets',     icon: MessageSquare },
  { key: 'security',    label: 'Безопасность',         href: '/security/audit',      icon: Shield },
  { key: 'analytics',   label: 'Аналитика',            href: '/analytics',           icon: BarChart3 },
  { key: 'users',       label: 'Пользователи',         href: '/users',               icon: Users },
  { key: 'settings',    label: 'Настройки',            href: '/settings',            icon: Settings },
  { key: 'compliance',  label: 'Compliance Center',    href: '/compliance',          icon: ShieldCheck },
] as const;

export type ModuleKey = typeof ALL_MODULES[number]['key'];

// Role → default modules mapping
//
// Note: this is a *legacy* helper kept for screens that don't read the new
// rbac.ts registry yet (UsersList, UsersCabinets, ...). The DashboardLayout
// no longer reads this map directly — it uses hasPermission() instead.
export const ROLE_DEFAULT_MODULES: Record<string, ModuleKey[]> = {
  SuperAdmin:        ['dashboard','pvz','orders','couriers','warehouses','logistics','merchants','finance','support','security','analytics','users','settings','compliance'],
  Admin:             ['dashboard','pvz','orders','couriers','warehouses','merchants','finance','support','analytics','users','compliance'],
  RegionalManager:   ['dashboard','pvz','orders','couriers','analytics'],
  PVZOperator:       ['pvz','orders'],
  Warehouse:         ['warehouses','orders'],
  Courier:           ['orders'],
  Finance:           ['dashboard','finance','merchants','analytics'],
  Support:           ['orders','support'],
  QA:                ['dashboard','pvz','orders','analytics'],
  Partner:           ['pvz','orders','finance'],
  Merchant:          ['orders','merchants'],
  DocumentReviewer:  ['dashboard','compliance'],
  ComplianceAdmin:   ['dashboard','compliance','security','users'],
  LegalReviewer:     ['compliance'],
  // ── 17 new predefined roles ────────────────────────────────────────────────
  OperationsManager: ['dashboard','pvz','orders','couriers','warehouses','logistics','analytics'],
  PVZManager:        ['pvz','orders','users'],
  WarehouseManager:  ['warehouses','orders'],
  CourierManager:    ['couriers','orders','logistics','support'],
  SupportAgent:      ['support','orders','users'],
  Accountant:        ['dashboard','finance','merchants','analytics'],
  ChiefAccountant:   ['dashboard','finance','merchants','analytics','users'],
  Lawyer:            ['compliance','merchants','analytics'],
  ComplianceManager: ['compliance','merchants','users','security','analytics'],
  SellerManager:     ['merchants','analytics','users'],
  ProductManager:    ['merchants','analytics'],
  ShowcaseManager:   ['merchants','analytics'],
  MarketingManager:  ['merchants','analytics'],
  SecurityOfficer:   ['security','users','analytics'],
  Analyst:           ['dashboard','analytics','orders'],
  PromotionsManager: ['merchants','analytics'],
};

// Scopes
export const SCOPES = [
  { value: 'ALL',       label: 'Вся сеть',    desc: 'Доступ ко всем объектам' },
  { value: 'COUNTRY',   label: 'Страна',       desc: 'В пределах одной страны' },
  { value: 'REGION',    label: 'Регион',       desc: 'В пределах региона' },
  { value: 'CITY',      label: 'Город',        desc: 'Только один город' },
  { value: 'PVZ',       label: 'Один ПВЗ',    desc: 'Только один ПВЗ' },
  { value: 'WAREHOUSE', label: 'Склад',        desc: 'Только один склад' },
  { value: 'SELF',      label: 'Себя',         desc: 'Только свои данные' },
];

// Role display names
export const ROLE_LABELS: Record<string, string> = {
  SuperAdmin:        'Супер-администратор',
  Admin:             'Администратор',
  RegionalManager:   'Региональный менеджер',
  PVZOperator:       'Оператор ПВЗ',
  Warehouse:         'Кладовщик',
  Courier:           'Курьер',
  Finance:           'Финансист',
  Support:           'Агент поддержки',
  QA:                'Контроль качества',
  Partner:           'Партнёр',
  Merchant:          'Мерчант',
  DocumentReviewer:  'Document Reviewer',
  ComplianceAdmin:   'Compliance Admin',
  LegalReviewer:     'Legal Reviewer',
  OperationsManager: 'Операционный менеджер',
  PVZManager:        'Менеджер ПВЗ',
  WarehouseManager:  'Менеджер склада',
  CourierManager:    'Менеджер курьеров',
  SupportAgent:      'Поддержка',
  Accountant:        'Бухгалтер',
  ChiefAccountant:   'Главный бухгалтер',
  Lawyer:            'Юрист',
  ComplianceManager: 'Compliance manager',
  SellerManager:     'Менеджер продавцов',
  ProductManager:    'Product manager',
  ShowcaseManager:   'Менеджер витрины',
  MarketingManager:  'Маркетинг-менеджер',
  SecurityOfficer:   'Офицер безопасности',
  Analyst:           'Аналитик',
  PromotionsManager: 'Менеджер акций',
};

// Role descriptions for UI
export const ROLE_DESCRIPTIONS: Record<string, string> = {
  SuperAdmin:       'Полный доступ к системе. Управляет ролями, пользователями и безопасностью.',
  Admin:            'Управляет ПВЗ, заказами, курьерами и пользователями на уровне сети.',
  RegionalManager:  'Отвечает за ПВЗ и курьеров в своём регионе. Видит аналитику и операции.',
  PVZOperator:      'Работает на конкретном ПВЗ: приёмка, выдача, возвраты, сканер.',
  Warehouse:        'Управляет складом: поступления, отгрузки, инвентаризация.',
  Courier:          'Принимает и выполняет доставки. Видит только свои маршруты.',
  Finance:          'Контролирует финансы: выручку, выплаты, транзакции, отчёты.',
  Support:          'Обрабатывает тикеты клиентов, ведёт чаты, закрывает обращения.',
  QA:               'Проверяет качество работы ПВЗ, составляет акты и предписания.',
  Partner:          'Партнёр сети: видит свои ПВЗ, доход, финансовую отчётность.',
  Merchant:         'Продавец: управляет товарами, видит свои заказы и выручку.',
  DocumentReviewer: 'Проверяет документы курьеров, продавцов, ПВЗ и сотрудников. Одобряет/отклоняет/запрашивает.',
  ComplianceAdmin:  'Полный доступ к Document Compliance Center. Управляет проверяющими, настройками политик.',
  LegalReviewer:    'Юридический рецензент. Проверяет договоры, лицензии и регуляторные документы.',
};

// Role key capabilities
export const ROLE_CAPABILITIES: Record<string, string[]> = {
  SuperAdmin:       ['Создание и удаление ролей (RBAC)', 'Управление всеми пользователями', 'Доступ к журналу аудита', 'Системные настройки'],
  Admin:            ['Управление сетью ПВЗ', 'Контроль заказов и курьеров', 'Приглашение операторов', 'Финансовые отчёты'],
  RegionalManager:  ['ПВЗ и курьеры в своём регионе', 'Аналитика по региону', 'Управление расписанием', 'Эскалация инцидентов'],
  PVZOperator:      ['Сканер: приёмка / выдача / возврат', 'Кассовые операции', 'Журнал смены', 'Фото-фиксация товаров'],
  Warehouse:        ['Приём поставок', 'Отгрузка заказов', 'Инвентаризация', 'Управление ячейками'],
  Courier:          ['Список доставок на день', 'Подтверждение вручения', 'Навигация по маршруту', 'Сообщить о проблеме'],
  Finance:          ['Финансовая отчётность', 'Утверждение выплат', 'Сверка транзакций', 'Экспорт данных'],
  Support:          ['Очередь тикетов', 'Чат с клиентами', 'Просмотр заказов', 'Статистика обращений'],
  QA:               ['Аудит ПВЗ', 'Проверка качества', 'Составление актов', 'Аналитика по инцидентам'],
  Partner:          ['Управление своими ПВЗ', 'Финансовый отчёт', 'Просмотр заказов', 'Аналитика партнёра'],
  Merchant:         ['Мои заказы', 'Управление товарами', 'Выручка и статистика', 'Возвраты'],
  DocumentReviewer: ['Просмотр всех документов', 'Одобрение / отклонение', 'Запрос повторной загрузки', 'Аудит-лог'],
  ComplianceAdmin:  ['Полный Compliance Center', 'Управление проверяющими', 'Политики истечения', 'Экспорт и отчёты'],
  LegalReviewer:    ['Проверка юр. документов', 'Договоры и лицензии', 'Аудит-лог действий', 'Email уведомления'],
};

export const ROLE_COLORS: Record<string, string> = {
  SuperAdmin:       'red',
  Admin:            'purple',
  RegionalManager:  'blue',
  PVZOperator:      'green',
  Warehouse:        'teal',
  Courier:          'yellow',
  Finance:          'orange',
  Support:          'blue',
  QA:               'pink',
  Partner:          'gray',
  Merchant:         'green',
  DocumentReviewer: 'indigo',
  ComplianceAdmin:  'violet',
  LegalReviewer:    'teal',
};

export const COLOR_BADGE: Record<string, string> = {
  red:    'bg-red-100 text-red-700',
  purple: 'bg-purple-100 text-purple-700',
  blue:   'bg-blue-100 text-blue-700',
  green:  'bg-green-100 text-green-700',
  teal:   'bg-teal-100 text-teal-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  orange: 'bg-orange-100 text-orange-700',
  pink:   'bg-pink-100 text-pink-700',
  gray:   'bg-gray-100 text-gray-700',
  indigo: 'bg-indigo-100 text-indigo-700',
  violet: 'bg-violet-100 text-violet-700',
};

export const COLOR_BG: Record<string, string> = {
  red:    'bg-red-50 border-red-200',
  purple: 'bg-purple-50 border-purple-200',
  blue:   'bg-blue-50 border-blue-200',
  green:  'bg-green-50 border-green-200',
  teal:   'bg-teal-50 border-teal-200',
  yellow: 'bg-yellow-50 border-yellow-200',
  orange: 'bg-orange-50 border-orange-200',
  pink:   'bg-pink-50 border-pink-200',
  gray:   'bg-gray-50 border-gray-200',
  indigo: 'bg-indigo-50 border-indigo-200',
  violet: 'bg-violet-50 border-violet-200',
};

export const COLOR_ICON: Record<string, string> = {
  red:    'bg-red-100 text-red-600',
  purple: 'bg-purple-100 text-purple-600',
  blue:   'bg-blue-100 text-blue-600',
  green:  'bg-green-100 text-green-600',
  teal:   'bg-teal-100 text-teal-600',
  yellow: 'bg-yellow-100 text-yellow-600',
  orange: 'bg-orange-100 text-orange-600',
  pink:   'bg-pink-100 text-pink-600',
  gray:   'bg-gray-100 text-gray-600',
  indigo: 'bg-indigo-100 text-indigo-600',
  violet: 'bg-violet-100 text-violet-600',
};

// User type (extended)
export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  scopeType: string;
  scopeValue: string;
  status: 'active' | 'inactive' | 'suspended' | 'invited';
  twoFactorEnabled: boolean;
  lastLogin: string;
  createdAt: string;
  cabinetModules: ModuleKey[] | null;
  notes?: string;
}

export const INITIAL_USERS: ManagedUser[] = [
  {
    id: '1', name: 'Администратор Системы', email: 'admin@platform.com',
    role: 'Admin', scopeType: 'ALL', scopeValue: '',
    status: 'active', twoFactorEnabled: true,
    lastLogin: '14.02.2026 12:30', createdAt: '01.01.2026',
    cabinetModules: null,
  },
  {
    id: '2', name: 'Иванов Иван', email: 'ivanov@platform.com',
    role: 'RegionalManager', scopeType: 'REGION', scopeValue: 'Москва',
    status: 'active', twoFactorEnabled: true,
    lastLogin: '14.02.2026 11:45', createdAt: '15.01.2026',
    cabinetModules: ['dashboard', 'pvz', 'orders', 'couriers', 'analytics', 'support'],
  },
  {
    id: '3', name: 'Петрова Мария', email: 'petrova@platform.com',
    role: 'PVZOperator', scopeType: 'PVZ', scopeValue: 'MSK-001',
    status: 'active', twoFactorEnabled: false,
    lastLogin: '14.02.2026 10:20', createdAt: '20.01.2026',
    cabinetModules: null,
  },
  {
    id: '4', name: 'Сидоров Петр', email: 'sidorov@platform.com',
    role: 'Finance', scopeType: 'ALL', scopeValue: '',
    status: 'active', twoFactorEnabled: true,
    lastLogin: '14.02.2026 09:15', createdAt: '10.01.2026',
    cabinetModules: null,
  },
  {
    id: '5', name: 'Козлова Елена', email: 'kozlova@platform.com',
    role: 'Support', scopeType: 'REGION', scopeValue: 'Москва, МО',
    status: 'active', twoFactorEnabled: true,
    lastLogin: '13.02.2026 18:30', createdAt: '25.01.2026',
    cabinetModules: ['orders', 'support', 'analytics'],
  },
  {
    id: '6', name: 'Новиков Сергей', email: 'novikov@platform.com',
    role: 'Warehouse', scopeType: 'WAREHOUSE', scopeValue: 'MSK-WH-01',
    status: 'inactive', twoFactorEnabled: false,
    lastLogin: '10.02.2026 14:00', createdAt: '05.02.2026',
    cabinetModules: null,
  },
  {
    id: '7', name: 'Смирнова Екатерина', email: 'smirnova@platform.com',
    role: 'PVZOperator', scopeType: 'PVZ', scopeValue: 'MSK-002',
    status: 'invited', twoFactorEnabled: false,
    lastLogin: '—', createdAt: '14.02.2026',
    cabinetModules: null,
  },
];