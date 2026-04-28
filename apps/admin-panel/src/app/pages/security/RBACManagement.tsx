import { useState } from 'react';
import {
  Plus, Users, Shield, Lock, Pencil as Edit2, Trash2, X, Check, ChevronDown,
  ChevronRight, Eye, Package, MapPin, Bike, Warehouse, Store, DollarSign,
  MessageSquare, BarChart3, Settings, LayoutDashboard, AlertTriangle,
  Copy, Search, UserCheck, Globe, Building2, Info, ShieldCheck, ShieldAlert,
  ToggleLeft, ToggleRight, Megaphone, ClipboardList, Route, CheckCircle2,
} from 'lucide-react';

// ─── Permission registry ──────────────────────────────────────────────────────

const MODULES = [
  {
    key: 'dashboard', label: 'Главная панель', icon: LayoutDashboard,
    perms: [
      { key: 'dashboard.view', label: 'Просматривать панель' },
      { key: 'dashboard.kpi', label: 'Видеть KPI и метрики' },
      { key: 'dashboard.alerts', label: 'Видеть срочные задачи' },
    ],
  },
  {
    key: 'pvz', label: 'ПВЗ', icon: MapPin,
    perms: [
      { key: 'pvz.view', label: 'Просматривать список ПВЗ' },
      { key: 'pvz.operate', label: 'Сканер: приёмка / выдача / возврат' },
      { key: 'pvz.manage', label: 'Создавать и редактировать ПВЗ' },
      { key: 'pvz.pause', label: 'Ставить ПВЗ на паузу' },
      { key: 'pvz.delete', label: 'Удалять ПВЗ' },
      { key: 'pvz.invite', label: 'Приглашать операторов' },
    ],
  },
  {
    key: 'orders', label: 'Заказы', icon: Package,
    perms: [
      { key: 'orders.view', label: 'Просматривать заказы' },
      { key: 'orders.manage', label: 'Редактировать заказы' },
      { key: 'orders.cancel', label: 'Отменять заказы' },
      { key: 'orders.export', label: 'Экспортировать данные' },
    ],
  },
  {
    key: 'couriers', label: 'Курьеры', icon: Bike,
    perms: [
      { key: 'couriers.view', label: 'Просматривать курьеров' },
      { key: 'couriers.manage', label: 'Управлять курьерами' },
      { key: 'couriers.assign', label: 'Назначать на заказы' },
    ],
  },
  {
    key: 'warehouses', label: 'Склады', icon: Warehouse,
    perms: [
      { key: 'warehouses.view', label: 'Просматривать склады' },
      { key: 'warehouses.manage', label: 'Управлять складами' },
    ],
  },
  {
    key: 'merchants', label: 'Продавцы', icon: Store,
    perms: [
      { key: 'merchants.view',     label: 'Просматривать продавцов' },
      { key: 'merchants.create',   label: 'Создавать (приглашать)' },
      { key: 'merchants.edit',     label: 'Редактировать профиль' },
      { key: 'merchants.delete',   label: 'Блокировать / архивировать' },
      { key: 'merchants.export',   label: 'Экспорт реестра' },
      { key: 'merchants.approve',  label: 'Одобрять новые заявки' },
      { key: 'merchants.finance',  label: 'Финансы продавцов' },
    ],
  },
  {
    key: 'products', label: 'Товары', icon: Package,
    perms: [
      { key: 'products.view',        label: 'Просматривать каталог' },
      { key: 'products.create',      label: 'Создавать товары' },
      { key: 'products.edit',        label: 'Редактировать товары' },
      { key: 'products.delete',      label: 'Архивировать / блокировать' },
      { key: 'products.export',      label: 'Экспорт CSV' },
      { key: 'products.moderate',    label: 'Модерация (approve/reject)' },
      { key: 'products.media',       label: 'Управление фото и медиа' },
      { key: 'products.own',         label: 'Товары нашей фирмы' },
      { key: 'products.categories',  label: 'Управлять категориями' },
    ],
  },
  {
    key: 'popular', label: 'Популярные', icon: Package,
    perms: [
      { key: 'products.popular.view',    label: 'Просматривать популярные' },
      { key: 'products.popular.manage',  label: 'Переключать режим (авто/ручной)' },
      { key: 'products.popular.pin',     label: 'Закреплять товар в популярных' },
      { key: 'products.popular.hide',    label: 'Скрывать из популярных' },
      { key: 'products.popular.reorder', label: 'Менять порядок (поднять/опустить)' },
      { key: 'products.popular.export',  label: 'Экспорт реестра' },
    ],
  },
  {
    key: 'recommended', label: 'Рекомендации', icon: Package,
    perms: [
      { key: 'products.recommended.view',    label: 'Просматривать рекомендации' },
      { key: 'products.recommended.create',  label: 'Создавать рекомендации' },
      { key: 'products.recommended.edit',    label: 'Редактировать слоты' },
      { key: 'products.recommended.pause',   label: 'Включать / выключать' },
      { key: 'products.recommended.delete',  label: 'Удалять слоты' },
      { key: 'products.recommended.reorder', label: 'Менять приоритет' },
      { key: 'products.recommended.audience',label: 'Управлять аудиторией' },
      { key: 'products.recommended.sponsored',label:'Sponsored размещения' },
    ],
  },
  {
    key: 'showcase', label: 'Витрина / Первые ряды', icon: Package,
    perms: [
      { key: 'products.showcase.view',    label: 'Просматривать витрину' },
      { key: 'products.showcase.manage',  label: 'Управлять витриной' },
      { key: 'products.showcase.create',  label: 'Добавлять слоты' },
      { key: 'products.showcase.edit',    label: 'Редактировать слоты' },
      { key: 'products.showcase.pause',   label: 'Включать / выключать слоты' },
      { key: 'products.showcase.delete',  label: 'Удалять слоты' },
      { key: 'products.showcase.reorder', label: 'Менять порядок (#1, #2...)' },
    ],
  },
  {
    key: 'boost', label: 'Boost / Продвижение товаров', icon: Megaphone,
    perms: [
      { key: 'products.boost.company',  label: 'Продвигать товары нашей фирмы' },
      { key: 'products.boost.merchant', label: 'Продвигать товары продавцов' },
      { key: 'products.boost.category', label: 'Boost в категории' },
      { key: 'products.boost.search',   label: 'Boost в поиске' },
      { key: 'products.boost.homepage', label: 'Boost на главной' },
    ],
  },
  {
    key: 'promotions', label: 'Акции / Скидки', icon: Megaphone,
    perms: [
      { key: 'promotions.view',          label: 'Просматривать акции' },
      { key: 'promotions.create',        label: 'Создавать акции' },
      { key: 'promotions.edit',          label: 'Редактировать акции' },
      { key: 'promotions.delete',        label: 'Архивировать' },
      { key: 'promotions.approve',       label: 'Одобрять заявки' },
      { key: 'promotions.export',        label: 'Экспорт' },
      { key: 'promotions.products.manage',label:'Привязывать товары к акциям' },
      { key: 'discounts.products.manage', label: 'Привязывать товары к скидкам' },
    ],
  },
  {
    key: 'logistics', label: 'Логистика', icon: Route,
    perms: [
      { key: 'logistics.view',      label: 'Просматривать дашборд' },
      { key: 'logistics.manage',    label: 'Управлять зонами и маршрутами' },
      { key: 'logistics.export',    label: 'Экспорт' },
    ],
  },
  {
    key: 'compliance', label: 'Проверка документов', icon: ClipboardList,
    perms: [
      { key: 'compliance.view',     label: 'Просматривать документы' },
      { key: 'compliance.approve',  label: 'Одобрять документы' },
      { key: 'compliance.reject',   label: 'Отклонять документы' },
      { key: 'compliance.export',   label: 'Экспорт реестра' },
    ],
  },
  {
    key: 'chat', label: 'Чат-центр', icon: MessageSquare,
    perms: [
      { key: 'chat.view',           label: 'Просматривать диалоги' },
      { key: 'chat.reply',          label: 'Отвечать в чатах' },
      { key: 'chat.assign',         label: 'Назначать агента' },
      { key: 'chat.close',          label: 'Закрывать диалоги' },
    ],
  },
  {
    key: 'approvals', label: 'Центр одобрения', icon: CheckCircle2,
    perms: [
      { key: 'approvals.view',      label: 'Просматривать запросы' },
      { key: 'approvals.approve',   label: 'Одобрять запросы' },
      { key: 'approvals.reject',    label: 'Отклонять запросы' },
      { key: 'approvals.export',    label: 'Экспорт' },
    ],
  },
  {
    key: 'finance', label: 'Финансы', icon: DollarSign,
    perms: [
      { key: 'finance.view', label: 'Просматривать отчёты' },
      { key: 'finance.manage', label: 'Управлять финансами' },
      { key: 'payouts.approve', label: 'Утверждать выплаты' },
      { key: 'finance.export', label: 'Экспортировать данные' },
    ],
  },
  {
    key: 'support', label: 'Поддержка', icon: MessageSquare,
    perms: [
      { key: 'support.view', label: 'Просматривать тикеты' },
      { key: 'support.reply', label: 'Отвечать на тикеты' },
      { key: 'support.close', label: 'Закрывать тикеты' },
    ],
  },
  {
    key: 'analytics', label: 'Аналитика', icon: BarChart3,
    perms: [
      { key: 'analytics.view', label: 'Просматривать аналитику' },
      { key: 'analytics.export', label: 'Экспортировать отчёты' },
    ],
  },
  {
    key: 'security', label: 'Безопасность', icon: Shield,
    perms: [
      { key: 'security.audit', label: 'Журнал аудита' },
      { key: 'security.rbac', label: 'Управление ролями (RBAC)' },
      { key: 'users.manage', label: 'Управление пользователями' },
    ],
  },
  {
    key: 'settings', label: 'Настройки', icon: Settings,
    perms: [
      { key: 'settings.view', label: 'Просматривать настройки' },
      { key: 'settings.manage', label: 'Изменять настройки системы' },
    ],
  },
];

const SCOPES = [
  { value: 'ALL', label: 'Вся сеть', desc: 'Доступ ко всем объектам системы' },
  { value: 'COUNTRY', label: 'Страна', desc: 'Доступ в пределах одной страны' },
  { value: 'REGION', label: 'Регион', desc: 'Доступ в пределах региона/города' },
  { value: 'CITY', label: 'Город', desc: 'Только объекты в одном городе' },
  { value: 'PVZ', label: 'Один ПВЗ', desc: 'Только один конкретный ПВЗ' },
  { value: 'WAREHOUSE', label: 'Склад', desc: 'Только один склад' },
  { value: 'SELF', label: 'Себя', desc: 'Только собственные данные' },
];

// ─── Role definitions ─────────────────────────────────────────────────────────

interface RoleDef {
  id: string;
  name: string;
  label: string;
  description: string;
  users: number;
  permissions: string[];
  scope: string;
  color: string;
  isSystem: boolean;
  dashboardModules: string[]; // what tabs appear in personal cabinet
}

const INITIAL_ROLES: RoleDef[] = [
  {
    id: '1', name: 'SuperAdmin', label: 'Супер-администратор',
    description: 'Полный доступ ко всей системе. Создаёт роли, управляет правами.',
    users: 2, permissions: ['*'], scope: 'ALL', color: 'red', isSystem: true,
    dashboardModules: ['dashboard', 'pvz', 'orders', 'couriers', 'warehouses', 'merchants', 'finance', 'support', 'analytics', 'security', 'settings'],
  },
  {
    id: '2', name: 'Admin', label: 'Администратор',
    description: 'Управляет ПВЗ, заказами, пользователями. Не может менять роли.',
    users: 5,
    permissions: ['dashboard.view', 'dashboard.kpi', 'dashboard.alerts', 'pvz.view', 'pvz.manage', 'pvz.pause', 'pvz.invite', 'orders.view', 'orders.manage', 'orders.cancel', 'couriers.view', 'couriers.manage', 'couriers.assign', 'warehouses.view', 'warehouses.manage', 'merchants.view', 'finance.view', 'analytics.view', 'support.view', 'support.reply', 'users.manage'],
    scope: 'ALL', color: 'purple', isSystem: true,
    dashboardModules: ['dashboard', 'pvz', 'orders', 'couriers', 'warehouses', 'merchants', 'finance', 'analytics', 'support', 'security'],
  },
  {
    id: '3', name: 'RegionalManager', label: 'Региональный менеджер',
    description: 'Управляет ПВЗ и заказами в своём регионе.',
    users: 12,
    permissions: ['dashboard.view', 'dashboard.kpi', 'pvz.view', 'pvz.manage', 'pvz.pause', 'orders.view', 'orders.manage', 'couriers.view', 'couriers.assign', 'analytics.view', 'support.view'],
    scope: 'REGION', color: 'blue', isSystem: true,
    dashboardModules: ['dashboard', 'pvz', 'orders', 'couriers', 'analytics'],
  },
  {
    id: '4', name: 'PVZOperator', label: 'Оператор ПВЗ',
    description: 'Работает с одним ПВЗ: сканер, приёмка, выдача, чат.',
    users: 45,
    permissions: ['pvz.view', 'pvz.operate', 'orders.view'],
    scope: 'PVZ', color: 'green', isSystem: true,
    dashboardModules: ['pvz', 'orders'],
  },
  {
    id: '5', name: 'Finance', label: 'Финансист',
    description: 'Доступ к финансовым отчётам и выплатам.',
    users: 3,
    permissions: ['dashboard.view', 'dashboard.kpi', 'finance.view', 'finance.manage', 'payouts.approve', 'finance.export', 'merchants.finance', 'analytics.view'],
    scope: 'ALL', color: 'orange', isSystem: true,
    dashboardModules: ['dashboard', 'finance', 'merchants', 'analytics'],
  },
  {
    id: '6', name: 'Support', label: 'Агент поддержки',
    description: 'Работает с тикетами клиентов и просматривает заказы.',
    users: 8,
    permissions: ['orders.view', 'support.view', 'support.reply', 'support.close'],
    scope: 'ALL', color: 'teal', isSystem: true,
    dashboardModules: ['orders', 'support'],
  },
  {
    id: '7', name: 'ShowcaseManager', label: 'Менеджер витрины',
    description: 'Управляет витриной (первые ряды), популярными и рекомендуемыми товарами. Делегируется SuperAdmin.',
    users: 1,
    permissions: [
      'dashboard.view', 'products.view',
      'products.popular.view',     'products.popular.manage', 'products.popular.pin',
      'products.popular.hide',     'products.popular.reorder', 'products.popular.export',
      'products.recommended.view', 'products.recommended.create', 'products.recommended.edit',
      'products.recommended.pause','products.recommended.delete', 'products.recommended.reorder',
      'products.recommended.audience',
      'products.showcase.view',    'products.showcase.manage', 'products.showcase.create',
      'products.showcase.edit',    'products.showcase.pause',  'products.showcase.delete',
      'products.showcase.reorder',
      'products.boost.company',    'products.boost.merchant', 'products.boost.category',
      'products.boost.search',     'products.boost.homepage',
    ],
    scope: 'ALL', color: 'yellow', isSystem: false,
    dashboardModules: ['dashboard', 'products', 'popular', 'recommended', 'showcase', 'boost'],
  },
  {
    id: '8', name: 'PromotionsManager', label: 'Менеджер акций',
    description: 'Создаёт и ведёт акции и скидки, привязывает к ним товары.',
    users: 2,
    permissions: [
      'dashboard.view', 'products.view',
      'promotions.view', 'promotions.create', 'promotions.edit', 'promotions.delete',
      'promotions.export', 'promotions.products.manage', 'discounts.products.manage',
    ],
    scope: 'ALL', color: 'pink', isSystem: false,
    dashboardModules: ['dashboard', 'products', 'promotions'],
  },
];

const COLOR_OPTIONS = ['red', 'purple', 'blue', 'green', 'orange', 'teal', 'yellow', 'pink'];
const COLOR_CLASSES: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  red:    { bg: 'bg-red-100',    text: 'text-red-600',    border: 'border-red-200',    badge: 'bg-red-100 text-red-700' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-700' },
  blue:   { bg: 'bg-blue-100',   text: 'text-blue-600',   border: 'border-blue-200',   badge: 'bg-blue-100 text-blue-700' },
  green:  { bg: 'bg-green-100',  text: 'text-green-600',  border: 'border-green-200',  badge: 'bg-green-100 text-green-700' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-700' },
  teal:   { bg: 'bg-teal-100',   text: 'text-teal-600',   border: 'border-teal-200',   badge: 'bg-teal-100 text-teal-700' },
  yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600', border: 'border-yellow-200', badge: 'bg-yellow-100 text-yellow-700' },
  pink:   { bg: 'bg-pink-100',   text: 'text-pink-600',   border: 'border-pink-200',   badge: 'bg-pink-100 text-pink-700' },
};

function clr(color: string) {
  return COLOR_CLASSES[color] || COLOR_CLASSES.blue;
}

function countGranted(perms: string[]): number {
  if (perms.includes('*')) return MODULES.reduce((s, m) => s + m.perms.length, 0);
  return perms.length;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function RBACManagement() {
  const [roles, setRoles] = useState<RoleDef[]>(INITIAL_ROLES);
  const [selectedRole, setSelectedRole] = useState<RoleDef | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleDef | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'roles' | 'matrix'>('roles');
  const [searchPerms, setSearchPerms] = useState('');

  // Form state
  const [form, setForm] = useState({
    name: '', label: '', description: '', scope: 'ALL', color: 'blue', permissions: [] as string[],
  });
  const [expandedModules, setExpandedModules] = useState<string[]>(MODULES.map(m => m.key));

  const openCreate = () => {
    setEditingRole(null);
    setForm({ name: '', label: '', description: '', scope: 'ALL', color: 'blue', permissions: [] });
    setExpandedModules(MODULES.map(m => m.key));
    setShowModal(true);
  };

  const openEdit = (role: RoleDef) => {
    setEditingRole(role);
    setForm({
      name: role.name, label: role.label, description: role.description,
      scope: role.scope, color: role.color,
      permissions: role.permissions.includes('*') ? MODULES.flatMap(m => m.perms.map(p => p.key)) : [...role.permissions],
    });
    setExpandedModules(MODULES.map(m => m.key));
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditingRole(null); };

  const togglePerm = (key: string) => {
    setForm(f => ({
      ...f, permissions: f.permissions.includes(key)
        ? f.permissions.filter(p => p !== key)
        : [...f.permissions, key],
    }));
  };

  const toggleModule = (moduleKey: string, allPerms: string[]) => {
    const all = allPerms.every(p => form.permissions.includes(p));
    setForm(f => ({
      ...f, permissions: all
        ? f.permissions.filter(p => !allPerms.includes(p))
        : [...new Set([...f.permissions, ...allPerms])],
    }));
  };

  const selectAllPerms = () => {
    setForm(f => ({ ...f, permissions: MODULES.flatMap(m => m.perms.map(p => p.key)) }));
  };
  const clearAllPerms = () => setForm(f => ({ ...f, permissions: [] }));

  const saveRole = () => {
    if (!form.name.trim() || !form.label.trim()) return;
    const modulesWithAccess = MODULES.filter(m => m.perms.some(p => form.permissions.includes(p))).map(m => m.key);
    if (editingRole) {
      setRoles(prev => prev.map(r => r.id === editingRole.id
        ? { ...r, ...form, dashboardModules: modulesWithAccess }
        : r));
      if (selectedRole?.id === editingRole.id) {
        setSelectedRole(prev => prev ? { ...prev, ...form, dashboardModules: modulesWithAccess } : null);
      }
    } else {
      const newRole: RoleDef = {
        id: String(Date.now()), ...form,
        users: 0, isSystem: false,
        dashboardModules: modulesWithAccess,
      };
      setRoles(prev => [...prev, newRole]);
    }
    closeModal();
  };

  const deleteRole = (id: string) => {
    setRoles(prev => prev.filter(r => r.id !== id));
    if (selectedRole?.id === id) setSelectedRole(null);
    setShowDeleteConfirm(null);
  };

  const totalUsers = roles.reduce((s, r) => s + r.users, 0);
  const totalPerms = MODULES.reduce((s, m) => s + m.perms.length, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Управление RBAC</h1>
          <p className="text-gray-500">Роли, разрешения и личные кабинеты · {roles.length} ролей · {totalUsers} пользователей</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
          <Plus className="w-5 h-5" />Создать роль
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(['roles', 'matrix'] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'roles' ? 'Роли и разрешения' : 'Матрица доступа'}
          </button>
        ))}
      </div>

      {/* ══════════ ROLES VIEW ══════════ */}
      {activeTab === 'roles' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: role cards */}
          <div className="lg:col-span-2 space-y-3">
            {roles.map(role => {
              const c = clr(role.color);
              const granted = countGranted(role.permissions);
              const isSelected = selectedRole?.id === role.id;
              return (
                <div key={role.id}
                  onClick={() => setSelectedRole(isSelected ? null : role)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setSelectedRole(isSelected ? null : role)}
                  className={`bg-white rounded-xl border-2 p-5 cursor-pointer transition-all hover:shadow-md text-left w-full active:scale-[0.98] ${isSelected ? `${c.border} shadow-md` : 'border-gray-200'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-10 h-10 ${c.bg} rounded-xl flex items-center justify-center shrink-0`}>
                        <Shield className={`w-5 h-5 ${c.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900">{role.label}</span>
                          <span className={`px-2 py-0.5 text-xs rounded-full font-mono font-medium ${c.badge}`}>{role.name}</span>
                          {role.isSystem && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-500">Системная</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5 truncate">{role.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={e => { e.stopPropagation(); openEdit(role); }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {!role.isSystem && (
                        <button onClick={e => { e.stopPropagation(); setShowDeleteConfirm(role.id); }}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-3 flex-wrap">
                    <span className="flex items-center gap-1 text-sm text-gray-500">
                      <Users className="w-3.5 h-3.5" />{role.users} польз.
                    </span>
                    <span className="flex items-center gap-1 text-sm text-gray-500">
                      <Globe className="w-3.5 h-3.5" />Scope: <span className="font-medium text-gray-700">{role.scope}</span>
                    </span>
                    <span className="flex items-center gap-1 text-sm text-gray-500">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {role.permissions.includes('*')
                        ? <span className="text-red-600 font-medium">Все права (*)</span>
                        : <span>{granted} из {totalPerms} прав</span>
                      }
                    </span>
                    {/* Permission chips */}
                    <div className="flex flex-wrap gap-1 mt-1 w-full">
                      {role.permissions.includes('*')
                        ? <span className="px-2 py-0.5 bg-red-50 text-red-700 text-xs rounded font-mono">*</span>
                        : role.permissions.slice(0, 5).map(p => (
                          <span key={p} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded font-mono">{p}</span>
                        ))
                      }
                      {!role.permissions.includes('*') && role.permissions.length > 5 && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">+{role.permissions.length - 5}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: role detail / cabinet preview */}
          <div className="space-y-4">
            {selectedRole ? (
              <div style={{display:'contents'}}>
                {/* Permissions detail */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 text-sm">Права: {selectedRole.label}</h3>
                    <button onClick={() => openEdit(selectedRole)}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                      <Edit2 className="w-3 h-3" />Изменить
                    </button>
                  </div>
                  <div className="p-3 space-y-2 max-h-72 overflow-y-auto">
                    {MODULES.map(mod => {
                      const granted = selectedRole.permissions.includes('*')
                        ? mod.perms.map(p => p.key)
                        : mod.perms.filter(p => selectedRole.permissions.includes(p.key));
                      if (granted.length === 0) return null;
                      const Icon = mod.icon;
                      return (
                        <div key={mod.key} className="p-2.5 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Icon className="w-3.5 h-3.5 text-gray-500" />
                            <span className="text-xs font-semibold text-gray-700">{mod.label}</span>
                            <span className="text-xs text-gray-400">({granted.length}/{mod.perms.length})</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {granted.map(pk => {
                              const p = mod.perms.find(x => x.key === pk);
                              return p ? (
                                <span key={pk} className="text-xs px-1.5 py-0.5 bg-white border border-gray-200 text-gray-600 rounded flex items-center gap-0.5">
                                  <Check className="w-2.5 h-2.5 text-green-500" />{p.label}
                                </span>
                              ) : null;
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Personal cabinet preview */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                      <Eye className="w-4 h-4 text-gray-400" />Личный кабинет
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">Какие разделы видит пользователь с этой ролью</p>
                  </div>
                  <div className="p-3">
                    <div className="bg-gray-900 rounded-xl p-3 space-y-0.5">
                      {MODULES.map(mod => {
                        const hasAccess = selectedRole.dashboardModules.includes(mod.key);
                        const Icon = mod.icon;
                        return (
                          <div key={mod.key} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs ${hasAccess ? 'text-white' : 'text-gray-600 opacity-40 line-through'}`}>
                            <Icon className="w-3.5 h-3.5 shrink-0" />
                            <span>{mod.label}</span>
                            {hasAccess && <Check className="w-3 h-3 text-green-400 ml-auto" />}
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                      <Info className="w-3 h-3" />Scope: {SCOPES.find(s => s.value === selectedRole.scope)?.label} — {SCOPES.find(s => s.value === selectedRole.scope)?.desc}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Shield className="w-6 h-6 text-gray-300" />
                </div>
                <p className="font-medium text-gray-500 text-sm">Выберите роль</p>
                <p className="text-xs text-gray-400 mt-1">Кликните на любую роль слева,<br/>чтобы увидеть детали и превью кабинета</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════ MATRIX VIEW ══════════ */}
      {activeTab === 'matrix' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <h3 className="font-semibold text-gray-900">Матрица прав доступа</h3>
            <div className="relative ml-auto">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input value={searchPerms} onChange={e => setSearchPerms(e.target.value)}
                placeholder="Найти право..."
                className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 w-48" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-gray-600 font-semibold w-56 sticky left-0 bg-gray-50 z-10">Право / Модуль</th>
                  {roles.map(r => (
                    <th key={r.id} className="px-3 py-3 text-center min-w-[100px]">
                      <div className={`inline-flex flex-col items-center gap-0.5`}>
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${clr(r.color).badge}`}>{r.name}</span>
                        <span className="text-gray-400 text-xs">{r.users} польз.</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {MODULES.map(mod => {
                  const filteredPerms = mod.perms.filter(p =>
                    !searchPerms || p.label.toLowerCase().includes(searchPerms.toLowerCase()) || p.key.toLowerCase().includes(searchPerms.toLowerCase())
                  );
                  if (filteredPerms.length === 0) return null;
                  const Icon = mod.icon;
                  return [
                    // Module header row
                    <tr key={`hdr-${mod.key}`} className="bg-gray-50/70">
                      <td className="px-4 py-2 font-semibold text-gray-700 sticky left-0 bg-gray-50/70 z-10" colSpan={1}>
                        <div className="flex items-center gap-1.5">
                          <Icon className="w-3.5 h-3.5 text-gray-500" />{mod.label}
                        </div>
                      </td>
                      {roles.map(r => <td key={r.id} className="px-3 py-2" />)}
                    </tr>,
                    // Permission rows
                    ...filteredPerms.map(perm => (
                      <tr key={perm.key} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-4 py-2 sticky left-0 bg-white z-10 hover:bg-blue-50/30">
                          <div>
                            <p className="text-gray-700">{perm.label}</p>
                            <p className="text-gray-400 font-mono text-xs">{perm.key}</p>
                          </div>
                        </td>
                        {roles.map(r => {
                          const has = r.permissions.includes('*') || r.permissions.includes(perm.key);
                          return (
                            <td key={r.id} className="px-3 py-2 text-center">
                              {has
                                ? <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                                    <Check className="w-3.5 h-3.5 text-green-600" />
                                  </div>
                                : <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                                    <X className="w-3 h-3 text-gray-300" />
                                  </div>
                              }
                            </td>
                          );
                        })}
                      </tr>
                    )),
                  ];
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SoD notice */}
      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-yellow-900">Separation of Duties (SoD)</p>
            <p className="text-sm text-yellow-700 mt-1">
              Критические финансовые операции требуют двухэтапного подтверждения: один пользователь создаёт, другой утверждает. Права <code className="font-mono text-xs bg-yellow-100 px-1 py-0.5 rounded">payouts.approve</code> и <code className="font-mono text-xs bg-yellow-100 px-1 py-0.5 rounded">finance.manage</code> не могут быть у одного пользователя без 2FA.
            </p>
          </div>
        </div>
      </div>

      {/* ══════════ CREATE / EDIT MODAL ══════════ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {editingRole ? `Редактировать роль: ${editingRole.label}` : 'Создать новую роль'}
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Задайте название, scope и разрешения. Личный кабинет формируется автоматически.
                </p>
              </div>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-6">
                {/* Basic info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Системное имя роли *</label>
                    <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value.replace(/\s/g, '')}))}
                      placeholder="MyCustomRole"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono" />
                    <p className="text-xs text-gray-400 mt-1">Без пробелов, латиницей</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Отображаемое название *</label>
                    <input value={form.label} onChange={e => setForm(f => ({...f, label: e.target.value}))}
                      placeholder="Менеджер по городу"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Описание роли</label>
                    <input value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}
                      placeholder="Краткое описание что может делать этот пользователь"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  </div>
                </div>

                {/* Scope */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Область видимости (Scope)</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {SCOPES.map(s => (
                      <button key={s.value} onClick={() => setForm(f => ({...f, scope: s.value}))}
                        className={`p-3 border-2 rounded-xl text-left transition-all ${form.scope === s.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <p className={`text-sm font-semibold ${form.scope === s.value ? 'text-blue-700' : 'text-gray-800'}`}>{s.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-tight">{s.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Цвет роли</label>
                  <div className="flex gap-2 flex-wrap">
                    {COLOR_OPTIONS.map(c => (
                      <button key={c} onClick={() => setForm(f => ({...f, color: c}))}
                        className={`w-8 h-8 rounded-full border-4 transition-all ${clr(c).bg} ${form.color === c ? 'border-gray-700 scale-110' : 'border-transparent'}`} />
                    ))}
                  </div>
                </div>

                {/* Permissions */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-semibold text-gray-700">
                      Разрешения <span className="text-gray-400 font-normal">({form.permissions.length} из {totalPerms})</span>
                    </label>
                    <div className="flex gap-2">
                      <button onClick={selectAllPerms} className="text-xs text-blue-600 hover:text-blue-700 font-medium">Все</button>
                      <span className="text-gray-300">|</span>
                      <button onClick={clearAllPerms} className="text-xs text-gray-500 hover:text-gray-700 font-medium">Сбросить</button>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {MODULES.map(mod => {
                      const Icon = mod.icon;
                      const modPermsKeys = mod.perms.map(p => p.key);
                      const checkedCount = modPermsKeys.filter(k => form.permissions.includes(k)).length;
                      const allChecked = checkedCount === mod.perms.length;
                      const isExpanded = expandedModules.includes(mod.key);

                      return (
                        <div key={mod.key} className="border border-gray-200 rounded-xl overflow-hidden">
                          {/* Module header */}
                          <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors">
                            <input type="checkbox" checked={allChecked} onChange={() => toggleModule(mod.key, modPermsKeys)}
                              className="w-4 h-4 rounded text-blue-600 cursor-pointer" />
                            <button onClick={() => setExpandedModules(prev =>
                              prev.includes(mod.key) ? prev.filter(k => k !== mod.key) : [...prev, mod.key]
                            )} className="flex-1 flex items-center gap-2 text-left">
                              <Icon className="w-4 h-4 text-gray-500 shrink-0" />
                              <span className="text-sm font-semibold text-gray-700">{mod.label}</span>
                              <span className="text-xs text-gray-400 ml-auto">{checkedCount}/{mod.perms.length}</span>
                              {isExpanded
                                ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                                : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
                            </button>
                          </div>
                          {/* Permission list */}
                          {isExpanded && (
                            <div className="divide-y divide-gray-50">
                              {mod.perms.map(perm => (
                                <label key={perm.key} className="flex items-start gap-3 px-4 py-2.5 hover:bg-blue-50/30 cursor-pointer transition-colors">
                                  <input type="checkbox" checked={form.permissions.includes(perm.key)}
                                    onChange={() => togglePerm(perm.key)}
                                    className="w-4 h-4 rounded text-blue-600 mt-0.5 cursor-pointer" />
                                  <div className="flex-1">
                                    <p className="text-sm text-gray-800">{perm.label}</p>
                                    <p className="text-xs text-gray-400 font-mono">{perm.key}</p>
                                  </div>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Cabinet preview */}
                <div className="bg-gray-900 rounded-xl p-4">
                  <p className="text-xs text-gray-400 mb-3 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" />Превью личного кабинета для этой роли
                  </p>
                  <div className="grid grid-cols-2 gap-1">
                    {MODULES.map(mod => {
                      const hasAny = mod.perms.some(p => form.permissions.includes(p.key));
                      const Icon = mod.icon;
                      return (
                        <div key={mod.key} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs ${hasAny ? 'text-white' : 'text-gray-600 opacity-30'}`}>
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span>{mod.label}</span>
                          {hasAny && <Check className="w-3 h-3 text-green-400 ml-auto" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-gray-200 shrink-0">
              <button onClick={closeModal} className="px-6 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-sm font-medium transition-colors">
                Отмена
              </button>
              <button onClick={saveRole} disabled={!form.name.trim() || !form.label.trim()}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 text-sm">
                <ShieldCheck className="w-4 h-4" />
                {editingRole ? 'Сохранить изменения' : 'Создать роль'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-900/60" onClick={() => setShowDeleteConfirm(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <ShieldAlert className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Удалить роль?</h3>
                <p className="text-sm text-gray-500">Это действие нельзя отменить</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-5 p-3 bg-red-50 rounded-lg border border-red-200">
              Все пользователи с этой ролью потеряют доступ. Убедитесь, что сначала перевел их на другую роль.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl font-medium text-sm transition-colors">
                Отмена
              </button>
              <button onClick={() => deleteRole(showDeleteConfirm)} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2">
                <Trash2 className="w-4 h-4" />Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}