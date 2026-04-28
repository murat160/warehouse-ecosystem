import { useState, useEffect } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard, MapPin, Package, Bike, Warehouse, Store,
  DollarSign, MessageSquare, BarChart3, Settings, Shield, Route, Users,
  TrendingUp, TrendingDown, CheckCircle2, AlertCircle, Clock, Zap,
  Scan, Box, Truck, CreditCard, ArrowRight, Star, Activity,
  Bell, ChevronRight, Eye, UserPlus, ShieldCheck, FileText, Download,
  Send, Printer, Navigation, RefreshCw, BarChart2, Timer, ArrowUpRight,
  Inbox, MessageCircle, RotateCcw, Hash, Coffee, X, PlayCircle,
  CheckSquare, AlertTriangle, Package2, Layers, PieChart, Globe,
  BellDot, Trash2, ExternalLink, Check,
} from 'lucide-react';
import {
  getNotifications, markRead, markAllRead, deleteNotification,
  subscribe as subscribeNotifs, unreadCount,
  type InternalNotification, type NotifPriority,
} from '../../store/notificationsStore';
import {
  ALL_MODULES, ROLE_LABELS, ROLE_DEFAULT_MODULES, ROLE_COLORS,
  COLOR_BADGE, COLOR_ICON, type ModuleKey,
} from '../../data/rbac-data';
import { useAuth } from '../../contexts/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface KPI {
  label: string;
  value: string;
  sub: string;
  trend?: 'up' | 'down' | 'neutral';
  trendVal?: string;
  color: string;
  icon: React.ElementType;
  href?: string;
}

interface QuickAction {
  label: string;
  desc: string;
  href: string;
  icon: React.ElementType;
  color: string;
  primary?: boolean;
}

interface Props {
  previewRole?: string;
  previewName?: string;
  previewModules?: ModuleKey[] | null;
  scopeValue?: string;
  onClose?: () => void;
}

// ─── Role-specific KPIs ───────────────────────────────────────────────────────

const ROLE_KPIS: Record<string, KPI[]> = {
  SuperAdmin: [
    { label: 'Пользователей',   value: '75',      sub: 'в системе',      trend: 'up',      trendVal: '+3 сегодня',       color: 'blue',   icon: Users,       href: '/users' },
    { label: 'Активных ПВЗ',    value: '156',     sub: '98.7% uptime',   trend: 'up',      trendVal: '+2 за неделю',     color: 'green',  icon: MapPin,      href: '/pvz' },
    { label: 'Заказов сегодня', value: '12 847',  sub: 'по всей сети',   trend: 'up',      trendVal: '+8.2%',            color: 'purple', icon: Package,     href: '/orders' },
    { label: 'Выручка сегодня', value: '₽4.2M',  sub: 'по всей сети',   trend: 'up',      trendVal: '+12.1%',           color: 'orange', icon: DollarSign,  href: '/finance' },
  ],
  Admin: [
    { label: 'Активных ПВЗ',    value: '156',     sub: '2 на паузе',     trend: 'neutral', trendVal: 'стабильно',        color: 'blue',   icon: MapPin,      href: '/pvz' },
    { label: 'Заказов сегодня', value: '12 847',  sub: '+8.2% к вчера',  trend: 'up',      trendVal: '+8.2%',            color: 'green',  icon: Package,     href: '/orders' },
    { label: 'Инцидентов',      value: '3',       sub: 'требуют решения',trend: 'down',    trendVal: '-2 за день',       color: 'red',    icon: AlertCircle, href: '/support/tickets' },
    { label: 'Новых польз.',    value: '7',       sub: 'за эту неделю',  trend: 'up',      trendVal: 'за неделю',        color: 'purple', icon: UserPlus,    href: '/users' },
  ],
  RegionalManager: [
    { label: 'ПВЗ в регионе',    value: '24',    sub: '22 активных',        trend: 'neutral', trendVal: 'стабильно',         color: 'blue',   icon: MapPin,       href: '/pvz' },
    { label: 'Заказов сегодня',  value: '1 847', sub: 'по региону',         trend: 'up',      trendVal: '+5.4%',             color: 'green',  icon: Package,      href: '/orders' },
    { label: 'Курьеров в роуте', value: '89',    sub: 'из 102 активных',    trend: 'up',      trendVal: '87% на маршруте',   color: 'purple', icon: Bike,         href: '/couriers' },
    { label: 'Рейтинг региона',  value: '4.82',  sub: 'средний по ПВЗ',     trend: 'up',      trendVal: '+0.03 за месяц',    color: 'orange', icon: Star,         href: '/analytics' },
  ],
  PVZOperator: [
    { label: 'Принято сегодня', value: '43', sub: 'посылок / смену', trend: 'up',      trendVal: '+6 к норме',         color: 'blue',   icon: Package,     href: '/orders' },
    { label: 'Выдано сегодня',  value: '38', sub: 'клиентам',        trend: 'up',      trendVal: 'норма выполнена',    color: 'green',  icon: CheckCircle2,href: '/orders' },
    { label: 'Возвратов',       value: '3',  sub: 'на оформлении',   trend: 'neutral', trendVal: 'в работе',           color: 'orange', icon: RotateCcw,   href: '/orders' },
    { label: 'Очередь сейчас',  value: '2',  sub: 'клиента ждут',    trend: 'down',    trendVal: 'мало',               color: 'purple', icon: Clock,       href: '/pvz' },
  ],
  Finance: [
    { label: 'Выручка сегодня',  value: '₽847K',  sub: 'по всем ПВЗ',      trend: 'up',      trendVal: '+11.4%',            color: 'green',  icon: TrendingUp,  href: '/finance' },
    { label: 'Ожидает выплат',   value: '12',     sub: 'заявок на ₽2.1M',  trend: 'neutral', trendVal: 'на рассмотрении',   color: 'orange', icon: CreditCard,  href: '/finance/payouts' },
    { label: 'Транзакций',       value: '2 341',  sub: 'за сегодня',        trend: 'up',      trendVal: '+3.2%',             color: 'blue',   icon: Activity,    href: '/finance' },
    { label: 'Выручка за месяц', value: '₽18.4M', sub: 'план ₽20M',        trend: 'up',      trendVal: '92% плана',         color: 'purple', icon: BarChart2,   href: '/analytics' },
  ],
  Support: [
    { label: 'Открытых тикетов', value: '8',   sub: 'в моей очереди',    trend: 'down', trendVal: '-3 за день', color: 'blue',   icon: Inbox,       href: '/support/tickets' },
    { label: 'Среднее время',    value: '4 мин',sub: 'первый ответ',     trend: 'up',   trendVal: 'отлично',    color: 'green',  icon: Timer,       href: '/support/tickets' },
    { label: 'Закрыто сегодня',  value: '23',  sub: 'тикета',            trend: 'up',   trendVal: '+5 к норме', color: 'purple', icon: CheckCircle2,href: '/support/tickets' },
    { label: 'Удовлетв. CSAT',   value: '96%', sub: 'за последние 30 д.',trend: 'up',   trendVal: '+2%',        color: 'orange', icon: Star,        href: '/analytics' },
  ],
  Warehouse: [
    { label: 'Позиций на складе',  value: '4 821', sub: 'в 847 ячейках',      trend: 'neutral', trendVal: 'норма',          color: 'blue',   icon: Box,           href: '/warehouses' },
    { label: 'Принято сегодня',    value: '124',   sub: 'единиц',             trend: 'up',      trendVal: '+18 к норме',    color: 'green',  icon: Package,       href: '/warehouses' },
    { label: 'Отгружено',          value: '98',    sub: 'заказов за день',    trend: 'up',      trendVal: 'норма',          color: 'purple', icon: Truck,         href: '/orders' },
    { label: 'Критических нехв.',  value: '5',     sub: 'требуют пополнения', trend: 'down',    trendVal: 'нужно заказать', color: 'red',    icon: AlertTriangle, href: '/warehouses' },
  ],
  Courier: [
    { label: 'Назначено сегодня', value: '14',      sub: 'доставок',      trend: 'neutral', trendVal: 'стандартный день', color: 'blue',   icon: Package,     href: '/orders' },
    { label: 'Выполнено',         value: '9',       sub: 'успешных',      trend: 'up',      trendVal: '64% выполнено',   color: 'green',  icon: CheckCircle2,href: '/orders' },
    { label: 'В пути',            value: '3',       sub: 'доставки',      trend: 'neutral', trendVal: 'в процессе',      color: 'orange', icon: Navigation,  href: '/orders' },
    { label: 'Заработано',        value: '₽2 340',  sub: 'за сегодня',    trend: 'up',      trendVal: '+₽180 к норме',   color: 'purple', icon: DollarSign,  href: '/finance' },
  ],
  Merchant: [
    { label: 'Заказов сегодня',  value: '47',   sub: 'по моим товарам', trend: 'up',      trendVal: '+12%',         color: 'blue',   icon: Package,   href: '/orders' },
    { label: 'Выручка сегодня',  value: '₽84K', sub: 'после комиссии',  trend: 'up',      trendVal: '+8.4%',        color: 'green',  icon: DollarSign,href: '/finance' },
    { label: 'Возвратов',        value: '2',    sub: 'ожидают решения',  trend: 'neutral', trendVal: 'в обработке',  color: 'orange', icon: RotateCcw, href: '/orders' },
    { label: 'Активных товаров', value: '183',  sub: 'в каталоге',       trend: 'up',      trendVal: '+3 добавлено', color: 'purple', icon: Layers,    href: '/merchants' },
  ],
  QA: [
    { label: 'Проверок сегодня',  value: '6',    sub: 'ПВЗ проверено',    trend: 'up',   trendVal: 'план: 5',        color: 'blue',   icon: ShieldCheck, href: '/pvz' },
    { label: 'Нарушений найдено', value: '4',    sub: 'требуют акта',     trend: 'down', trendVal: 'в работе',       color: 'red',    icon: AlertCircle, href: '/compliance' },
    { label: 'Закрыто нарушений', value: '11',   sub: 'за эту неделю',    trend: 'up',   trendVal: '+3 к плану',     color: 'green',  icon: CheckSquare, href: '/compliance' },
    { label: 'Средний балл ПВЗ',  value: '87.4', sub: 'из 100 по сети',   trend: 'up',   trendVal: '+1.2 за месяц',  color: 'purple', icon: Star,        href: '/analytics' },
  ],
  Partner: [
    { label: 'Моих ПВЗ',         value: '3',      sub: '3 активных',    trend: 'neutral', trendVal: 'все работают', color: 'blue',   icon: MapPin,    href: '/pvz' },
    { label: 'Заказов за месяц', value: '1 284',  sub: 'через мои ПВЗ', trend: 'up',      trendVal: '+7.2%',        color: 'green',  icon: Package,   href: '/orders' },
    { label: 'Доход за месяц',   value: '₽124K',  sub: 'агентская доля',trend: 'up',      trendVal: '+₽9K',         color: 'orange', icon: DollarSign,href: '/finance' },
    { label: 'Рейтинг партнёра', value: '4.91',   sub: 'из 5.00',       trend: 'up',      trendVal: '+0.01',        color: 'purple', icon: Star,      href: '/analytics' },
  ],
  // ── New roles (batch 13) ──────────────────────────────────────────────────
  Accountant: [
    { label: 'К сверке',           value: '14',         sub: 'на этой неделе',    trend: 'neutral', trendVal: 'в работе', color: 'orange', icon: AlertCircle, href: '/accounting/reconciliations' },
    { label: 'Налогов к уплате',   value: '₽284K',      sub: 'до 25.02',          trend: 'down',    trendVal: 'срок',     color: 'red',    icon: DollarSign,  href: '/accounting/taxes' },
    { label: 'Готовых отчётов',    value: '24',         sub: 'за период',         trend: 'up',      trendVal: '+6',       color: 'green',  icon: FileText,    href: '/accounting/reports' },
    { label: 'Закрыто за месяц',   value: '₽4.2 млн',   sub: 'операций',          trend: 'up',      trendVal: '+12%',     color: 'blue',   icon: TrendingUp,  href: '/accounting' },
  ],
  ChiefAccountant: [
    { label: 'Утверждений ждут',  value: '8',           sub: 'крупных выплат',    trend: 'neutral', trendVal: 'на проверке', color: 'orange', icon: AlertCircle, href: '/finance/payouts' },
    { label: 'Налоговые отчёты',  value: '3',           sub: 'готовы к подаче',   trend: 'up',      trendVal: 'все ОК',     color: 'green',  icon: FileText,    href: '/accounting/taxes' },
    { label: 'Сверки',            value: '12',          sub: 'закрыты',           trend: 'up',      trendVal: '+4',         color: 'blue',   icon: CheckCircle2,href: '/accounting/reconciliations' },
    { label: 'Финансовый архив',  value: '24 мес.',     sub: 'доступен',           trend: 'neutral', trendVal: 'полный',     color: 'purple', icon: Package,    href: '/accounting/exports' },
  ],
  Lawyer: [
    { label: 'Открытые споры',    value: '6',           sub: '2 в суде',          trend: 'down',    trendVal: '−1',         color: 'red',    icon: AlertTriangle, href: '/legal/disputes' },
    { label: 'Активные договоры', value: '142',         sub: '6 истекают',         trend: 'neutral', trendVal: 'плановое',   color: 'green',  icon: FileText,      href: '/legal/contracts' },
    { label: 'Претензии',         value: '11',          sub: '5 в работе',         trend: 'down',    trendVal: '−2',         color: 'orange', icon: AlertCircle,   href: '/legal/claims' },
    { label: 'Документов',        value: '24',          sub: 'в работе',           trend: 'up',      trendVal: '+3',         color: 'blue',   icon: Package,      href: '/legal/documents' },
  ],
  ComplianceManager: [
    { label: 'На проверке',       value: '18',          sub: 'документов',        trend: 'neutral', trendVal: 'в очереди',  color: 'orange', icon: ShieldCheck,   href: '/compliance' },
    { label: 'Одобрено сегодня',  value: '12',          sub: 'документов',         trend: 'up',      trendVal: '+5',         color: 'green',  icon: CheckCircle2,  href: '/compliance' },
    { label: 'Заблокированных',   value: '2',           sub: 'продавца',           trend: 'down',    trendVal: 'риск',       color: 'red',    icon: AlertTriangle, href: '/merchants' },
    { label: 'Аудит-лог',         value: '524',         sub: 'записи',             trend: 'up',      trendVal: 'за неделю',  color: 'purple', icon: FileText,      href: '/security/audit' },
  ],
  SupportAgent: [
    { label: 'Открытых тикетов',  value: '8',           sub: 'в моей очереди',    trend: 'down',    trendVal: '-3',         color: 'blue',   icon: Inbox,         href: '/support/tickets' },
    { label: 'Активных чатов',    value: '4',           sub: 'идут сейчас',        trend: 'neutral', trendVal: 'в реальном времени', color: 'green', icon: MessageSquare, href: '/chat' },
    { label: 'Эскалаций',         value: '2',           sub: 'к юристу/финансам',  trend: 'neutral', trendVal: 'передано',  color: 'orange', icon: ArrowUpRight,   href: '/legal/complaints' },
    { label: 'CSAT за неделю',    value: '96%',         sub: 'удовлетворённость',  trend: 'up',      trendVal: '+2%',        color: 'purple', icon: Star,           href: '/analytics' },
  ],
  OperationsManager: [
    { label: 'Заказов в работе',  value: '12 847',      sub: 'по сети',            trend: 'up',      trendVal: '+8.2%',     color: 'blue',   icon: Package,       href: '/orders' },
    { label: 'SLA выдержан',      value: '96.4%',       sub: 'за сегодня',         trend: 'up',      trendVal: '+0.4%',     color: 'green',  icon: CheckCircle2,  href: '/logistics' },
    { label: 'Курьеров на маршрутах', value: '89',      sub: 'из 102 активных',   trend: 'neutral', trendVal: 'норма',    color: 'orange', icon: Bike,          href: '/couriers' },
    { label: 'Загрузка складов',   value: '78%',        sub: 'средняя',            trend: 'neutral', trendVal: 'оптимум',  color: 'purple', icon: Warehouse,     href: '/warehouses' },
  ],
  PVZManager: [
    { label: 'Принято за смену',  value: '142',         sub: 'посылок',            trend: 'up',      trendVal: '+12 к норме', color: 'blue',  icon: Package,      href: '/pvz' },
    { label: 'Выдано',            value: '128',         sub: 'клиентам',           trend: 'up',      trendVal: 'норма',     color: 'green',  icon: CheckCircle2, href: '/orders' },
    { label: 'Возвратов',         value: '7',           sub: 'на оформлении',      trend: 'neutral', trendVal: 'в работе', color: 'orange', icon: RotateCcw,    href: '/orders' },
    { label: 'Касса смены',       value: '₽184K',       sub: 'оборот',             trend: 'up',      trendVal: '+8%',      color: 'purple', icon: DollarSign,   href: '/finance' },
  ],
  WarehouseManager: [
    { label: 'Поставок сегодня',  value: '8',           sub: 'единиц',             trend: 'up',      trendVal: '+2',       color: 'blue',  icon: Truck,         href: '/warehouses' },
    { label: 'Отгружено',         value: '184',         sub: 'заказов',            trend: 'up',      trendVal: '+18%',     color: 'green', icon: Package,       href: '/orders' },
    { label: 'Низкий остаток',    value: '12',          sub: 'позиций',            trend: 'down',    trendVal: 'нужно пополнить', color: 'orange', icon: AlertTriangle, href: '/warehouses' },
    { label: 'Персонал смены',    value: '14',          sub: 'на месте',           trend: 'neutral', trendVal: 'норма',    color: 'purple', icon: Users,         href: '/users' },
  ],
  CourierManager: [
    { label: 'Курьеров в смене',  value: '54',          sub: 'на маршрутах',       trend: 'up',     trendVal: '+3',        color: 'blue',  icon: Bike,         href: '/couriers' },
    { label: 'Доставок сегодня',  value: '342',         sub: 'выполнено',          trend: 'up',     trendVal: '+18%',      color: 'green', icon: CheckCircle2, href: '/orders' },
    { label: 'Проблемных',        value: '5',           sub: 'требуют решения',    trend: 'down',   trendVal: '−2',        color: 'orange',icon: AlertCircle,  href: '/support/tickets' },
    { label: 'Средний SLA',       value: '94.2%',       sub: 'на этой неделе',     trend: 'up',     trendVal: '+1.4%',     color: 'purple',icon: Timer,        href: '/logistics' },
  ],
  ProductManager: [
    { label: 'Товаров в каталоге',value: '4 821',       sub: 'активных',           trend: 'up',     trendVal: '+18',       color: 'blue',  icon: Package,      href: '/products' },
    { label: 'На модерации',      value: '14',          sub: 'требуют проверки',   trend: 'neutral',trendVal: 'в очереди', color: 'orange',icon: AlertCircle,  href: '/products' },
    { label: 'Категории',         value: '12',          sub: 'активных',           trend: 'neutral',trendVal: 'стабильно', color: 'green', icon: Layers,       href: '/products/categories' },
    { label: 'Медиа',             value: '14 832',      sub: 'фото и видео',       trend: 'up',     trendVal: '+128',      color: 'purple',icon: Eye,          href: '/products/media' },
  ],
  ShowcaseManager: [
    { label: 'В витрине',         value: '24',          sub: 'товара на главной',  trend: 'neutral',trendVal: 'без изменений', color: 'blue', icon: Star,        href: '/products/showcase' },
    { label: 'Популярные',        value: '18',          sub: 'закреплено',         trend: 'up',     trendVal: '+3',        color: 'green', icon: TrendingUp,   href: '/products/popular' },
    { label: 'Рекомендуемые',     value: '32',          sub: 'активных',           trend: 'up',     trendVal: '+2',        color: 'purple',icon: Star,         href: '/products/recommended' },
    { label: 'Продвижение',       value: '8',           sub: 'кампаний',           trend: 'neutral',trendVal: 'идут',      color: 'orange',icon: Zap,          href: '/products/campaigns' },
  ],
  MarketingManager: [
    { label: 'Акций активных',    value: '8',           sub: 'идут сейчас',        trend: 'up',     trendVal: '+2',        color: 'blue',  icon: Zap,          href: '/products/promotions' },
    { label: 'Скидок',            value: '24',          sub: 'опубликованных',     trend: 'up',     trendVal: '+6',        color: 'green', icon: Hash,         href: '/products/discounts' },
    { label: 'CTR кампаний',      value: '4.2%',        sub: 'за неделю',          trend: 'up',     trendVal: '+0.4%',     color: 'purple',icon: BarChart2,    href: '/reports/marketing' },
    { label: 'Конверсия',         value: '8.7%',        sub: 'из показа в заказ',  trend: 'up',     trendVal: '+1.2%',     color: 'orange',icon: TrendingUp,   href: '/analytics' },
  ],
  SecurityOfficer: [
    { label: 'Активные сессии',   value: '142',         sub: 'пользователей',      trend: 'neutral',trendVal: 'норма',     color: 'blue',  icon: Activity,     href: '/security/center' },
    { label: 'Подозрит. входов',  value: '3',           sub: 'требуют проверки',   trend: 'down',   trendVal: '−2',        color: 'red',   icon: AlertTriangle,href: '/security/center' },
    { label: 'IP-блокировок',     value: '14',          sub: 'активных',           trend: 'neutral',trendVal: 'правила',   color: 'orange',icon: Shield,       href: '/security/center' },
    { label: 'Audit за день',     value: '1 248',       sub: 'событий',            trend: 'up',     trendVal: '+184',      color: 'purple',icon: FileText,     href: '/security/audit' },
  ],
  Analyst: [
    { label: 'Готовых отчётов',   value: '86',          sub: 'за месяц',           trend: 'up',     trendVal: '+18',       color: 'blue',  icon: FileText,     href: '/reports' },
    { label: 'Выгрузок',          value: '142',         sub: 'CSV/XLS',            trend: 'up',     trendVal: '+24',       color: 'green', icon: Download,     href: '/reports' },
    { label: 'Дашборды',          value: '12',          sub: 'обновляются',        trend: 'neutral',trendVal: 'realtime',  color: 'purple',icon: BarChart3,    href: '/analytics' },
    { label: 'Точек данных',      value: '4.2M',        sub: 'обработано',         trend: 'up',     trendVal: '+340K',     color: 'orange',icon: PieChart,     href: '/analytics' },
  ],
  PolandFinance: [
    { label: 'Поступило сегодня', value: '€12 480',     sub: 'PLN+EUR счёт',       trend: 'up',     trendVal: '+18%',      color: 'blue',  icon: DollarSign,   href: '/foreign-delivery/orders' },
    { label: 'Маржа Польши',      value: '€2 184',      sub: 'после расходов',     trend: 'up',     trendVal: '+8%',       color: 'green', icon: TrendingUp,   href: '/foreign-delivery/monthly-settlement' },
    { label: 'Долг → TM',         value: '12 840 TMT',  sub: 'требует расчёта',    trend: 'down',   trendVal: 'стандарт',  color: 'red',   icon: ArrowUpRight, href: '/foreign-delivery/intercompany-debt' },
    { label: 'Открытых заказов',  value: '6',           sub: 'foreign_paid_local', trend: 'neutral',trendVal: 'идут',      color: 'orange',icon: Package,      href: '/foreign-delivery/orders' },
  ],
  TurkmenistanOperator: [
    { label: 'Заказов в работе',   value: '6',          sub: 'на исполнении',       trend: 'up',     trendVal: '+1',        color: 'blue',  icon: Package,      href: '/foreign-delivery/local-fulfillment' },
    { label: 'У продавцов',        value: '5',          sub: 'активных',            trend: 'neutral',trendVal: 'стабильно', color: 'green', icon: Store,        href: '/foreign-delivery/local-sellers' },
    { label: 'Доставлено сегодня', value: '4',          sub: 'заказов',             trend: 'up',     trendVal: '+2',        color: 'purple',icon: Truck,        href: '/foreign-delivery/orders' },
    { label: 'Документов',         value: '12',         sub: 'на загрузке',         trend: 'neutral',trendVal: 'в работе',  color: 'orange',icon: FileText,     href: '/foreign-delivery/documents' },
  ],
  SupplierAccountant: [
    { label: 'Открытых invoices',  value: '3',          sub: 'CN/TR/DE',            trend: 'down',   trendVal: '−1',        color: 'orange',icon: AlertCircle,  href: '/foreign-delivery/supplier-payables' },
    { label: 'Просрочено',         value: '1',          sub: 'инвойс',              trend: 'down',   trendVal: '−2',        color: 'red',   icon: AlertTriangle,href: '/foreign-delivery/supplier-payables' },
    { label: 'Поставщиков',        value: '5',          sub: 'активных',            trend: 'neutral',trendVal: 'стабильно', color: 'blue',  icon: Globe,        href: '/foreign-delivery/suppliers' },
    { label: 'К оплате',           value: '24 800 CNY', sub: 'по всем валютам',     trend: 'neutral',trendVal: 'плановое',  color: 'purple',icon: DollarSign,   href: '/foreign-delivery/supplier-payables' },
  ],
  Customer: [
    { label: 'Покупатель',         value: 'Клиент',     sub: 'preview-режим',       trend: 'neutral',trendVal: 'mobile app',color: 'blue',  icon: Users,        href: '/' },
    { label: 'Информация',         value: 'Mock',       sub: 'кабинет в моб. прил.',trend: 'neutral',trendVal: 'preview',   color: 'gray',  icon: Eye,          href: '/' },
  ],
  Seller: [
    { label: 'Мои товары',         value: '183',        sub: 'в каталоге',          trend: 'up',     trendVal: '+3',        color: 'blue',  icon: Package,      href: '/products' },
    { label: 'Заказы сегодня',     value: '47',         sub: 'по моим товарам',     trend: 'up',     trendVal: '+12%',      color: 'green', icon: Package,      href: '/orders' },
    { label: 'Кабинет продавца',   value: 'Seller Portal', sub: 'полный — там',     trend: 'neutral',trendVal: 'preview',   color: 'gray',  icon: Globe,        href: '/' },
  ],
};

// ─── Role-specific quick actions ──────────────────────────────────────────────

const ROLE_ACTIONS: Record<string, QuickAction[]> = {
  SuperAdmin: [
    { label: 'Добавить пользователя', desc: 'Создать аккаунт и выдать роль', href: '/users', icon: UserPlus, color: 'blue', primary: true },
    { label: 'Управление ролями', desc: 'RBAC: роли и разрешения', href: '/security/rbac', icon: Shield, color: 'red' },
    { label: 'Создать ПВЗ', desc: 'Новый пункт выдачи заказов', href: '/pvz', icon: MapPin, color: 'green' },
    { label: 'Журнал аудита', desc: 'Все действия в системе', href: '/security/audit', icon: FileText, color: 'purple' },
    { label: 'Аналитика', desc: 'Сводные отчёты и графики', href: '/analytics', icon: BarChart3, color: 'orange' },
    { label: 'Настройки системы', desc: 'Конфигурация платформы', href: '/settings', icon: Settings, color: 'gray' },
  ],
  Admin: [
    { label: 'Управление ПВЗ', desc: 'Список и статус всех ПВЗ', href: '/pvz', icon: MapPin, color: 'blue', primary: true },
    { label: 'Просмотр заказов', desc: 'Все заказы в системе', href: '/orders', icon: Package, color: 'green' },
    { label: 'Пользователи', desc: 'Управление сотрудниками', href: '/users', icon: Users, color: 'purple' },
    { label: 'Финансы', desc: 'Отчёты и выплаты', href: '/finance', icon: DollarSign, color: 'orange' },
    { label: 'Поддержка', desc: 'Тикеты и обращения', href: '/support/tickets', icon: MessageSquare, color: 'teal' },
    { label: 'Аналитика', desc: 'Да��борды и отчёты', href: '/analytics', icon: BarChart3, color: 'pink' },
  ],
  RegionalManager: [
    { label: 'Мои ПВЗ', desc: 'ПВЗ в моём регионе', href: '/pvz', icon: MapPin, color: 'blue', primary: true },
    { label: 'Заказы региона', desc: 'Все заказы по региону', href: '/orders', icon: Package, color: 'green' },
    { label: 'Курьеры', desc: 'Диспетчеризация курьеров', href: '/couriers', icon: Bike, color: 'orange' },
    { label: 'Аналитика', desc: 'KPI по региону', href: '/analytics', icon: BarChart3, color: 'purple' },
  ],
  PVZOperator: [
    { label: 'Открыть сканер', desc: 'Приёмка, выдача, возврат', href: '/pvz', icon: Scan, color: 'blue', primary: true },
    { label: 'Мои заказы', desc: 'Посылки на сегодня', href: '/orders', icon: Package, color: 'green' },
    { label: 'Касса', desc: 'Финансовые операции смены', href: '/pvz', icon: CreditCard, color: 'orange' },
    { label: 'Печать этикеток', desc: 'Этикетки для отправлений', href: '/pvz', icon: Printer, color: 'gray' },
  ],
  Finance: [
    { label: 'Утвердить выплаты', desc: '12 заявок ожидают', href: '/finance/payouts', icon: CreditCard, color: 'orange', primary: true },
    { label: 'Финансовый отчёт', desc: 'Сводные данные и графики', href: '/finance', icon: BarChart2, color: 'blue' },
    { label: 'Экспорт данных', desc: 'Выгрузка в Excel/CSV', href: '/finance', icon: Download, color: 'green' },
    { label: 'Аналитика', desc: 'Тренды и прогнозы', href: '/analytics', icon: PieChart, color: 'purple' },
  ],
  Support: [
    { label: 'Очередь тикетов', desc: '8 ожидают ответа', href: '/support/tickets', icon: Inbox, color: 'blue', primary: true },
    { label: 'Мои тикеты', desc: 'Назначены лично мне', href: '/support/tickets', icon: MessageCircle, color: 'green' },
    { label: 'Просмотр заказов', desc: 'Поиск по номеру', href: '/orders', icon: Package, color: 'purple' },
    { label: 'База знаний', desc: 'Шаблоны ответов', href: '/support/tickets', icon: FileText, color: 'gray' },
  ],
  Warehouse: [
    { label: 'Принять поставку', desc: 'Оформить новую поставку', href: '/warehouses', icon: Package, color: 'blue', primary: true },
    { label: 'Лист комплектации', desc: 'Собрать заказы на отгрузку', href: '/warehouses', icon: CheckSquare, color: 'green' },
    { label: 'Инвентаризация', desc: 'Сверка остатков', href: '/warehouses', icon: Layers, color: 'orange' },
    { label: 'Отчёт склада', desc: 'Движение товаров', href: '/warehouses', icon: BarChart2, color: 'purple' },
  ],
  Courier: [
    { label: 'Мой маршрут', desc: 'Навигация на сегодня', href: '/orders', icon: Navigation, color: 'blue', primary: true },
    { label: 'Список доставок', desc: '14 назначено на сегодня', href: '/orders', icon: Package, color: 'green' },
    { label: 'Подтвердить вручение', desc: 'Фото + подпись клиента', href: '/orders', icon: CheckCircle2, color: 'orange' },
    { label: 'Сообщить о проблеме', desc: 'Эскалация инцидента', href: '/orders', icon: AlertTriangle, color: 'red' },
  ],
  Merchant: [
    { label: 'Мои заказы', desc: '47 заказов сегодня', href: '/orders', icon: Package, color: 'blue', primary: true },
    { label: 'Мои товары', desc: '183 позиции в каталоге', href: '/merchants', icon: Store, color: 'green' },
    { label: 'Финансы', desc: 'Выручка и выплаты', href: '/finance', icon: DollarSign, color: 'orange' },
    { label: 'Возвраты', desc: '2 ожидают обработки', href: '/orders', icon: RotateCcw, color: 'red' },
  ],
  QA: [
    { label: 'Начать проверку', desc: 'Аудит ПВЗ по чек-листу', href: '/pvz', icon: ShieldCheck, color: 'blue', primary: true },
    { label: 'Список нарушений', desc: '4 активных нарушения', href: '/pvz', icon: AlertCircle, color: 'red' },
    { label: 'Аналитика качества', desc: 'Тренды и сводка', href: '/analytics', icon: BarChart3, color: 'purple' },
    { label: 'Заказы', desc: 'Проверка операций', href: '/orders', icon: Package, color: 'green' },
  ],
  Partner: [
    { label: 'Мои ПВЗ', desc: '3 пункта выдачи', href: '/pvz', icon: MapPin, color: 'blue', primary: true },
    { label: 'Финансовый отчёт', desc: 'Доходы и выплаты', href: '/finance', icon: DollarSign, color: 'green' },
    { label: 'Заказы через мои ПВЗ', desc: 'Операции за период', href: '/orders', icon: Package, color: 'orange' },
    { label: 'Аналитика', desc: 'Производительность', href: '/analytics', icon: BarChart3, color: 'purple' },
  ],
  // ── New roles (batch 13) ──────────────────────────────────────────────────
  Accountant: [
    { label: 'Сверки', desc: 'Подтверждать платежи', href: '/accounting/reconciliations', icon: CheckCircle2, color: 'orange', primary: true },
    { label: 'Налоги', desc: 'Декларации и платёжки', href: '/accounting/taxes', icon: FileText, color: 'red' },
    { label: 'Отчёты', desc: 'Книги, обороты, экспорт', href: '/accounting/reports', icon: BarChart3, color: 'blue' },
    { label: 'Выплаты', desc: 'Подготовка к выплатам', href: '/finance/payouts', icon: DollarSign, color: 'green' },
    { label: 'Возвраты', desc: 'Реестр возвратов', href: '/finance/refunds', icon: RotateCcw, color: 'purple' },
    { label: 'Экспорт', desc: 'CSV/XLS/1C', href: '/accounting/exports', icon: Download, color: 'gray' },
  ],
  ChiefAccountant: [
    { label: 'Утвердить выплаты', desc: 'Крупные операции', href: '/finance/payouts', icon: ShieldCheck, color: 'red', primary: true },
    { label: 'Закрыть месяц', desc: 'Foreign-delivery monthly', href: '/foreign-delivery/monthly-settlement', icon: CheckCircle2, color: 'green' },
    { label: 'Налоги', desc: 'Налоговый архив', href: '/accounting/taxes', icon: FileText, color: 'orange' },
    { label: 'Сверки', desc: 'Подписать акты', href: '/accounting/reconciliations', icon: CheckSquare, color: 'blue' },
    { label: 'Audit', desc: 'Финансовых операций', href: '/security/audit', icon: Shield, color: 'purple' },
    { label: 'Архив отчётов', desc: 'Все периоды', href: '/accounting/exports', icon: Download, color: 'gray' },
  ],
  Lawyer: [
    { label: 'Открытые споры', desc: '6 в работе, 2 в суде', href: '/legal/disputes', icon: AlertTriangle, color: 'red', primary: true },
    { label: 'Договоры', desc: '142 активных', href: '/legal/contracts', icon: FileText, color: 'green' },
    { label: 'Претензии', desc: '11 на рассмотрении', href: '/legal/claims', icon: AlertCircle, color: 'orange' },
    { label: 'Жалобы', desc: 'Из поддержки', href: '/legal/complaints', icon: MessageSquare, color: 'blue' },
    { label: 'Документы', desc: 'Запрос / проверка', href: '/legal/documents', icon: Package, color: 'purple' },
    { label: 'Юр. отчёты', desc: 'Реестры и сводки', href: '/legal/reports', icon: BarChart3, color: 'gray' },
  ],
  ComplianceManager: [
    { label: 'Проверка документов', desc: 'Очередь модерации', href: '/compliance', icon: ShieldCheck, color: 'blue', primary: true },
    { label: 'Продавцы', desc: 'Профили и риски', href: '/merchants', icon: Store, color: 'green' },
    { label: 'Audit log', desc: 'Все события системы', href: '/security/audit', icon: FileText, color: 'purple' },
  ],
  SupportAgent: [
    { label: 'Тикеты', desc: 'Моя очередь', href: '/support/tickets', icon: Inbox, color: 'blue', primary: true },
    { label: 'Чат', desc: 'Активные диалоги', href: '/chat', icon: MessageSquare, color: 'green' },
    { label: 'Жалобы', desc: 'Эскалация в legal', href: '/legal/complaints', icon: AlertTriangle, color: 'orange' },
    { label: 'Заказы', desc: 'Просмотр для клиентов', href: '/orders', icon: Package, color: 'gray' },
  ],
  OperationsManager: [
    { label: 'Заказы', desc: 'Все в работе', href: '/orders', icon: Package, color: 'blue', primary: true },
    { label: 'Курьеры', desc: 'Назначить / маршруты', href: '/couriers', icon: Bike, color: 'green' },
    { label: 'Логистика', desc: 'Дашборд SLA', href: '/logistics', icon: Route, color: 'purple' },
    { label: 'Склады', desc: 'Загрузка', href: '/warehouses', icon: Warehouse, color: 'orange' },
  ],
  PVZManager: [
    { label: 'Сканер', desc: 'Приём / выдача', href: '/pvz/scan', icon: Scan, color: 'blue', primary: true },
    { label: 'Заказы ПВЗ', desc: 'Сегодняшние', href: '/orders', icon: Package, color: 'green' },
    { label: 'Возвраты', desc: 'Оформление', href: '/orders', icon: RotateCcw, color: 'orange' },
  ],
  WarehouseManager: [
    { label: 'Поставки', desc: 'Принять', href: '/warehouses', icon: Truck, color: 'blue', primary: true },
    { label: 'Отгрузка', desc: 'По заказам', href: '/orders', icon: Package, color: 'green' },
    { label: 'Остатки', desc: 'Низкий уровень', href: '/warehouses', icon: AlertTriangle, color: 'orange' },
  ],
  CourierManager: [
    { label: 'Назначить заказ', desc: 'Курьерам', href: '/orders', icon: Send, color: 'blue', primary: true },
    { label: 'Курьеры', desc: 'Все на смене', href: '/couriers', icon: Bike, color: 'green' },
    { label: 'Маршруты', desc: 'Оптимизация', href: '/logistics', icon: Route, color: 'purple' },
  ],
  ProductManager: [
    { label: 'Каталог', desc: 'Все товары', href: '/products', icon: Package, color: 'blue', primary: true },
    { label: 'Категории', desc: 'Дерево категорий', href: '/products/categories', icon: Layers, color: 'green' },
    { label: 'Медиа', desc: 'Фото и видео', href: '/products/media', icon: Eye, color: 'purple' },
    { label: 'Наша фирма', desc: 'PVZ-brand', href: '/products/own', icon: ShieldCheck, color: 'orange' },
  ],
  ShowcaseManager: [
    { label: 'Витрина', desc: 'Первые ряды', href: '/products/showcase', icon: Star, color: 'blue', primary: true },
    { label: 'Популярные', desc: 'Закрепить / убрать', href: '/products/popular', icon: TrendingUp, color: 'green' },
    { label: 'Рекомендации', desc: 'По аудиториям', href: '/products/recommended', icon: Star, color: 'purple' },
    { label: 'Кампании', desc: 'Push + продвижение', href: '/products/campaigns', icon: Zap, color: 'orange' },
  ],
  MarketingManager: [
    { label: 'Акции', desc: 'Создать / редактировать', href: '/products/promotions', icon: Zap, color: 'blue', primary: true },
    { label: 'Скидки', desc: 'Глобальные', href: '/products/discounts', icon: Hash, color: 'green' },
    { label: 'Маркетинг отчёты', desc: 'CTR / конверсия', href: '/reports/marketing', icon: BarChart3, color: 'purple' },
  ],
  SecurityOfficer: [
    { label: 'Центр безопасности', desc: 'Сессии · IP · токены', href: '/security/center', icon: Shield, color: 'blue', primary: true },
    { label: 'Audit log', desc: 'Все события', href: '/security/audit', icon: FileText, color: 'purple' },
    { label: 'RBAC', desc: 'Роли и права', href: '/security/rbac', icon: ShieldCheck, color: 'red' },
  ],
  Analyst: [
    { label: 'Аналитика', desc: 'Дашборды', href: '/analytics', icon: BarChart3, color: 'blue', primary: true },
    { label: 'Отчёты', desc: 'Все категории', href: '/reports', icon: FileText, color: 'green' },
    { label: 'Заказы', desc: 'Read-only', href: '/orders', icon: Package, color: 'purple' },
  ],
  PolandFinance: [
    { label: 'Зарубежные заказы', desc: 'Foreign paid local delivery', href: '/foreign-delivery/orders', icon: Globe, color: 'blue', primary: true },
    { label: 'Settlement Cards', desc: 'По каждому заказу', href: '/foreign-delivery/settlement-cards', icon: FileText, color: 'green' },
    { label: 'Месячный отчёт', desc: 'Маржа Польши', href: '/foreign-delivery/monthly-settlement', icon: BarChart3, color: 'purple' },
    { label: 'Долги между компаниями', desc: 'Польша ↔ TM', href: '/foreign-delivery/intercompany-debt', icon: ArrowUpRight, color: 'orange' },
    { label: 'Экспорт', desc: 'Для бухгалтера', href: '/foreign-delivery/accounting-export', icon: Download, color: 'gray' },
  ],
  TurkmenistanOperator: [
    { label: 'Локальное исполнение', desc: 'Workflow заказов', href: '/foreign-delivery/local-fulfillment', icon: Truck, color: 'blue', primary: true },
    { label: 'Местные продавцы', desc: 'Магазины / склады', href: '/foreign-delivery/local-sellers', icon: Store, color: 'green' },
    { label: 'Расчёты с продавцами', desc: 'Выплаты', href: '/foreign-delivery/seller-settlements', icon: DollarSign, color: 'orange' },
    { label: 'Документы', desc: 'Загрузить / проверить', href: '/foreign-delivery/documents', icon: FileText, color: 'purple' },
  ],
  SupplierAccountant: [
    { label: 'Поставщики', desc: 'CN / TR / DE / TM', href: '/foreign-delivery/suppliers', icon: Globe, color: 'blue', primary: true },
    { label: 'Задолженность', desc: 'Invoice — статусы', href: '/foreign-delivery/supplier-payables', icon: AlertCircle, color: 'red' },
    { label: 'Документы', desc: 'Invoice + проверка', href: '/foreign-delivery/documents', icon: FileText, color: 'orange' },
    { label: 'Экспорт', desc: 'Для бухгалтера', href: '/foreign-delivery/accounting-export', icon: Download, color: 'green' },
  ],
  Customer: [
    { label: 'Mobile App', desc: 'Кабинет покупателя — в моб. прил.', href: '/', icon: Globe, color: 'gray', primary: true },
  ],
  Seller: [
    { label: 'Seller Portal', desc: 'Полный кабинет продавца', href: '/', icon: Globe, color: 'blue', primary: true },
    { label: 'Мои товары', desc: 'Каталог', href: '/products', icon: Package, color: 'green' },
    { label: 'Заказы', desc: 'По моим товарам', href: '/orders', icon: Package, color: 'purple' },
  ],
};

// ─── Role-specific main widget ─────────────────────────────────────────────────

function OperatorWidget() {
  const ops = [
    { time: '11:32', type: 'accept', label: 'Приёмка', pkg: 'ORD-2026-004821', status: 'ok' },
    { time: '11:18', type: 'issue', label: 'Выдача', pkg: 'ORD-2026-004798', status: 'ok' },
    { time: '11:05', type: 'issue', label: 'Выдача', pkg: 'ORD-2026-004712', status: 'ok' },
    { time: '10:47', type: 'return', label: 'Возврат', pkg: 'ORD-2026-004600', status: 'warn' },
    { time: '10:31', type: 'accept', label: 'Приёмка', pkg: 'ORD-2026-004591', status: 'ok' },
  ];
  const clr = { accept: 'bg-blue-100 text-blue-700', issue: 'bg-green-100 text-green-700', return: 'bg-orange-100 text-orange-700' };
  return (
    <div className="space-y-2">
      {ops.map((op, i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
          <span className="text-xs text-gray-400 w-10 shrink-0">{op.time}</span>
          <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${clr[op.type as keyof typeof clr]}`}>{op.label}</span>
          <span className="text-sm text-gray-700 font-mono flex-1">{op.pkg}</span>
          {op.status === 'warn'
            ? <AlertCircle className="w-4 h-4 text-orange-500" />
            : <CheckCircle2 className="w-4 h-4 text-green-500" />}
        </div>
      ))}
    </div>
  );
}

function FinanceWidget() {
  const days = [
    { d: 'Пн', v: 320 }, { d: 'Вт', v: 480 }, { d: 'Ср', v: 410 },
    { d: 'Чт', v: 560 }, { d: 'Пт', v: 720 }, { d: 'Сб', v: 390 }, { d: 'Вс', v: 847 },
  ];
  const max = Math.max(...days.map(d => d.v));
  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2 h-28">
        {days.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full bg-blue-600 rounded-t-lg transition-all" style={{ height: `${(d.v / max) * 100}%`, opacity: i === days.length - 1 ? 1 : 0.4 + (i / days.length) * 0.6 }} />
            <span className="text-xs text-gray-400">{d.d}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl text-center">
          <p className="text-xs text-orange-600 font-medium">Ожидают утверждения</p>
          <p className="font-bold text-orange-800">12 выплат · ₽2.1M</p>
        </div>
        <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-center">
          <p className="text-xs text-green-600 font-medium">Выплачено за месяц</p>
          <p className="font-bold text-green-800">₽14.3M · 847 пол.</p>
        </div>
      </div>
    </div>
  );
}

function SupportWidget() {
  const tickets = [
    { id: 'TK-4821', title: 'Посылка не найдена в системе', time: '10 мин', priority: 'high' },
    { id: 'TK-4818', title: 'Проблема с оплатой при получении', time: '23 мин', priority: 'medium' },
    { id: 'TK-4815', title: 'Запрос на изменение адреса', time: '45 мин', priority: 'low' },
    { id: 'TK-4811', title: 'Поврежд. упаковка при приёмке', time: '1 ч 12 мин', priority: 'high' },
    { id: 'TK-4809', title: 'Клиент не пришёл за заказом', time: '2 ч 04 мин', priority: 'low' },
  ];
  const pclr = { high: 'bg-red-100 text-red-700', medium: 'bg-orange-100 text-orange-700', low: 'bg-gray-100 text-gray-600' };
  const plbl = { high: 'Срочный', medium: 'Средний', low: 'Низкий' };
  return (
    <div className="space-y-2">
      {tickets.map(t => (
        <Link
          key={t.id}
          to={`/support/tickets/${t.id}`}
          className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
          <span className="text-xs font-mono text-gray-400 w-16 shrink-0">{t.id}</span>
          <p className="text-sm text-gray-700 flex-1 truncate">{t.title}</p>
          <span className={`px-2 py-0.5 rounded-lg text-xs font-medium shrink-0 ${pclr[t.priority as keyof typeof pclr]}`}>
            {plbl[t.priority as keyof typeof plbl]}
          </span>
          <span className="text-xs text-gray-400 shrink-0">{t.time}</span>
        </Link>
      ))}
    </div>
  );
}

function WarehouseWidget() {
  const zones = [
    { label: 'Зона А — Электроника', count: 1240, capacity: 1500, pct: 83 },
    { label: 'Зона Б — Одежда', count: 890, capacity: 1000, pct: 89 },
    { label: 'Зона В — FMCG', count: 2100, capacity: 2500, pct: 84 },
    { label: 'Зона Г — Крупногаб.', count: 591, capacity: 800, pct: 74 },
  ];
  return (
    <div className="space-y-3">
      {zones.map((z, i) => (
        <div key={i}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-700">{z.label}</span>
            <span className="text-sm font-medium text-gray-900">{z.count.toLocaleString()} / {z.capacity.toLocaleString()}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${z.pct > 90 ? 'bg-red-500' : z.pct > 80 ? 'bg-orange-500' : 'bg-green-500'}`}
              style={{ width: `${z.pct}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{z.pct}% заполнено</p>
        </div>
      ))}
    </div>
  );
}

function CourierWidget() {
  const deliveries = [
    { id: 'D-001', addr: 'ул. Ленина, 42', status: 'delivered', time: '09:45' },
    { id: 'D-002', addr: 'пр. Мира, 17', status: 'delivered', time: '10:12' },
    { id: 'D-003', addr: 'ул. Гагарина, 8', status: 'delivered', time: '10:51' },
    { id: 'D-004', addr: 'б-р Победы, 3', status: 'inprogress', time: 'сейчас' },
    { id: 'D-005', addr: 'ул. Садовая, 25', status: 'pending', time: 'ожидает' },
  ];
  const stcfg = {
    delivered: { label: 'Доставлено', cls: 'bg-green-100 text-green-700' },
    inprogress: { label: 'В пути', cls: 'bg-blue-100 text-blue-700' },
    pending: { label: 'Ожидает', cls: 'bg-gray-100 text-gray-600' },
  };
  return (
    <div className="space-y-2">
      {deliveries.map(d => {
        const st = stcfg[d.status as keyof typeof stcfg];
        return (
          <div key={d.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <span className="text-xs font-mono text-gray-400 w-12">{d.id}</span>
            <p className="text-sm text-gray-700 flex-1">{d.addr}</p>
            <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${st.cls}`}>{st.label}</span>
            <span className="text-xs text-gray-400 w-16 text-right">{d.time}</span>
          </div>
        );
      })}
    </div>
  );
}

function GeneralWidget({ role }: { role: string }) {
  const alerts = [
    { type: 'warn', msg: 'ПВЗ MSK-047 не вышел на связь 45 мин', time: '11:15' },
    { type: 'info', msg: 'Новый пользователь зарегистрировался: petrova@pvz.ru', time: '10:48' },
    { type: 'ok', msg: 'Плановое обновление системы завершено успешно', time: '09:00' },
    { type: 'warn', msg: 'Задержка выплат по 3 заявкам — требует ручной проверки', time: '08:32' },
    { type: 'ok', msg: 'Резервное копирование данных выполнено (4.2 GB)', time: '04:00' },
  ];
  const acfg = {
    warn: { dot: 'bg-orange-500', bg: 'bg-orange-50', ic: AlertCircle, tc: 'text-orange-600' },
    info: { dot: 'bg-blue-500', bg: 'bg-blue-50', ic: Bell, tc: 'text-blue-600' },
    ok: { dot: 'bg-green-500', bg: 'bg-green-50', ic: CheckCircle2, tc: 'text-green-600' },
  };
  return (
    <div className="space-y-2">
      {alerts.map((a, i) => {
        const cfg = acfg[a.type as keyof typeof acfg];
        const Ic = cfg.ic;
        return (
          <div key={i} className={`flex items-start gap-3 p-3 ${cfg.bg} rounded-xl`}>
            <Ic className={`w-4 h-4 ${cfg.tc} shrink-0 mt-0.5`} />
            <p className="text-sm text-gray-700 flex-1">{a.msg}</p>
            <span className="text-xs text-gray-400 shrink-0">{a.time}</span>
          </div>
        );
      })}
    </div>
  );
}

function MerchantWidget() {
  const orders = [
    { id: 'ORD-2026-004821', product: 'iPhone 15 Pro Max 256GB', status: 'delivery', amount: '₽89 990' },
    { id: 'ORD-2026-004815', product: 'AirPods Pro 2nd Gen', status: 'pvz', amount: '₽19 990' },
    { id: 'ORD-2026-004799', product: 'MacBook Air M3', status: 'delivered', amount: '₽124 990' },
    { id: 'ORD-2026-004781', product: 'Samsung Galaxy S24', status: 'delivery', amount: '₽74 990' },
    { id: 'ORD-2026-004762', product: 'Sony WH-1000XM5', status: 'return', amount: '₽29 990' },
  ];
  const scfg = {
    delivery: { label: 'В доставке', cls: 'bg-blue-100 text-blue-700' },
    pvz: { label: 'В ПВЗ', cls: 'bg-purple-100 text-purple-700' },
    delivered: { label: 'Доставлен', cls: 'bg-green-100 text-green-700' },
    return: { label: 'Возврат', cls: 'bg-red-100 text-red-700' },
  };
  return (
    <div className="space-y-2">
      {orders.map(o => {
        const st = scfg[o.status as keyof typeof scfg];
        return (
          <div key={o.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-mono text-gray-400">{o.id}</p>
              <p className="text-sm text-gray-700 truncate">{o.product}</p>
            </div>
            <span className={`px-2 py-0.5 rounded-lg text-xs font-medium shrink-0 ${st.cls}`}>{st.label}</span>
            <span className="text-sm font-semibold text-gray-900 shrink-0">{o.amount}</span>
          </div>
        );
      })}
    </div>
  );
}

const WIDGET_TITLE: Record<string, string> = {
  SuperAdmin: 'Системные события и оповещения',
  Admin: 'Системные события и оповещения',
  RegionalManager: 'Активность региона',
  PVZOperator: 'Операции текущей смены',
  Finance: 'Выручка за 7 дней (тыс. ₽)',
  Support: 'Очередь тикетов — ожидают ответа',
  Warehouse: 'Загрузка складских зон',
  Courier: 'Мои доставки на сегодня',
  Merchant: 'Последние заказы',
  QA: 'Активность региона',
  Partner: 'Активность ПВЗ',
};

function RoleWidget({ role }: { role: string }) {
  if (role === 'PVZOperator') return <OperatorWidget />;
  if (role === 'Finance') return <FinanceWidget />;
  if (role === 'Support') return <SupportWidget />;
  if (role === 'Warehouse') return <WarehouseWidget />;
  if (role === 'Courier') return <CourierWidget />;
  if (role === 'Merchant') return <MerchantWidget />;
  return <GeneralWidget role={role} />;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KPICard({ kpi }: { kpi: KPI }) {
  const Icon = kpi.icon;
  const ic = COLOR_ICON[kpi.color] ?? COLOR_ICON.blue;
  const trendCls = kpi.trend === 'up' ? 'text-green-600' : kpi.trend === 'down' ? 'text-red-600' : 'text-gray-500';
  const TrendIcon = kpi.trend === 'up' ? TrendingUp : kpi.trend === 'down' ? TrendingDown : Activity;
  const inner = (
    <>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 ${ic} rounded-xl flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
        {kpi.trend && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trendCls}`}>
            <TrendIcon className="w-3 h-3" />
            <span>{kpi.trendVal}</span>
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
      <p className="text-sm font-medium text-gray-600 mt-0.5">{kpi.label}</p>
      <p className="text-xs text-gray-400">{kpi.sub}</p>
    </>
  );
  if (kpi.href) {
    return (
      <NavLink to={kpi.href} className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-lg hover:border-blue-200 transition-all active:scale-[0.97] block">
        {inner}
      </NavLink>
    );
  }
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-all">
      {inner}
    </div>
  );
}

// ─── Action Card ──────────────────────────────────────────────────────────────

function ActionCard({ action }: { action: QuickAction }) {
  const Icon = action.icon;
  const ic = COLOR_ICON[action.color] ?? COLOR_ICON.blue;
  return (
    <NavLink to={action.href}
      className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all hover:shadow-sm group ${
        action.primary
          ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700'
          : 'bg-white border-gray-200 hover:border-blue-300'
      }`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${action.primary ? 'bg-white/20' : ic}`}>
        <Icon className={`w-4 h-4 ${action.primary ? 'text-white' : ''}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${action.primary ? 'text-white' : 'text-gray-900'}`}>{action.label}</p>
        <p className={`text-xs truncate ${action.primary ? 'text-blue-100' : 'text-gray-400'}`}>{action.desc}</p>
      </div>
      <ChevronRight className={`w-4 h-4 shrink-0 ${action.primary ? 'text-blue-200' : 'text-gray-300 group-hover:text-blue-500'}`} />
    </NavLink>
  );
}

// ─── Internal Inbox Widget ────────────────────────────────────────────────────

const NOTIF_TYPE_CFG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string; border: string }> = {
  chat_routed:   { label: 'Перенаправлено',   icon: Send,          color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200' },
  chat_mention:  { label: '@Упоминание',       icon: Bell,          color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200' },
  task_assigned: { label: 'Задача назначена',  icon: CheckSquare,   color: 'text-teal-700',   bg: 'bg-teal-50',   border: 'border-teal-200' },
  escalation:    { label: 'Эскалация',         icon: ArrowUpRight,  color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200' },
  internal_msg:  { label: 'Внутреннее сообщ.', icon: MessageCircle, color: 'text-gray-700',   bg: 'bg-gray-50',   border: 'border-gray-200' },
};

const PRIORITY_DOT: Record<NotifPriority, string> = {
  low: 'bg-gray-400', normal: 'bg-blue-400', high: 'bg-orange-500', critical: 'bg-red-500',
};
const PRIORITY_LABEL: Record<NotifPriority, string> = {
  low: 'Низкий', normal: 'Обычный', high: 'Высокий', critical: 'Критичный',
};

function InternalInboxWidget() {
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState<InternalNotification[]>(getNotifications);
  const [filter, setFilter] = useState<'all' | 'unread' | 'routed' | 'tasks'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Reactive: re-render on store updates
  useEffect(() => {
    const unsub = subscribeNotifs(() => setNotifs(getNotifications()));
    return unsub;
  }, []);

  const filtered = notifs.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'routed') return n.type === 'chat_routed' || n.type === 'escalation';
    if (filter === 'tasks') return n.type === 'task_assigned';
    return true;
  });

  const unread = notifs.filter(n => !n.read).length;

  function handleOpen(notif: InternalNotification) {
    markRead(notif.id);
    setExpandedId(expandedId === notif.id ? null : notif.id);
  }

  function handleGoToChat(notif: InternalNotification) {
    markRead(notif.id);
    navigate('/chat');
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <BellDot className="w-5 h-5 text-violet-600" />
          <span className="font-semibold text-gray-900">Внутренние уведомления</span>
          {unread > 0 && (
            <span className="min-w-[22px] h-5 px-1 bg-violet-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {unread}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <button onClick={markAllRead}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
              <Check className="w-3.5 h-3.5" />Прочитать все
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {([
          ['all', 'Все', notifs.length],
          ['unread', 'Непрочитанные', unread],
          ['routed', 'Перенаправлено', notifs.filter(n => n.type === 'chat_routed' || n.type === 'escalation').length],
          ['tasks', 'Задачи', notifs.filter(n => n.type === 'task_assigned').length],
        ] as [typeof filter, string, number][]).map(([t, l, count]) => (
          <button key={t} onClick={() => setFilter(t)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {l}
            {count > 0 && (
              <span className={`min-w-[18px] h-4 px-0.5 rounded-full text-xs font-bold flex items-center justify-center ${
                filter === t ? 'bg-violet-100 text-violet-700' : 'bg-gray-200 text-gray-600'
              }`}>{count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Notifications list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
            <Bell className="w-8 h-8 opacity-30" />
          </div>
          <p className="text-sm font-medium">Нет уведомлений</p>
          <p className="text-xs mt-1 opacity-60">Здесь появятся задачи и сообщения от коллег</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(notif => {
            const tcfg = NOTIF_TYPE_CFG[notif.type] ?? NOTIF_TYPE_CFG.chat_routed;
            const TypeIcon = tcfg.icon;
            const isExpanded = expandedId === notif.id;

            return (
              <div key={notif.id}
                className={`rounded-2xl border-2 transition-all overflow-hidden ${
                  notif.read
                    ? 'border-gray-200 bg-white'
                    : `${tcfg.border} ${tcfg.bg}`
                }`}>
                {/* Main row */}
                <button
                  onClick={() => handleOpen(notif)}
                  className="w-full text-left p-4 flex items-start gap-3">
                  {/* Type icon */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    notif.read ? 'bg-gray-100' : tcfg.bg
                  } border ${notif.read ? 'border-gray-200' : tcfg.border}`}>
                    <TypeIcon className={`w-4 h-4 ${notif.read ? 'text-gray-400' : tcfg.color}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap">
                      <p className={`text-sm flex-1 truncate ${notif.read ? 'text-gray-700' : 'font-semibold text-gray-900'}`}>
                        {notif.title}
                      </p>
                      {!notif.read && (
                        <div className="w-2 h-2 bg-violet-500 rounded-full shrink-0 mt-1.5" />
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${tcfg.bg} ${tcfg.color} border ${tcfg.border} font-medium`}>
                        {tcfg.label}
                      </span>
                      <span className={`flex items-center gap-1 text-xs ${PRIORITY_DOT[notif.priority] === 'bg-red-500' ? 'text-red-600' : PRIORITY_DOT[notif.priority] === 'bg-orange-500' ? 'text-orange-600' : 'text-gray-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[notif.priority]}`} />
                        {PRIORITY_LABEL[notif.priority]}
                      </span>
                      <span className="text-xs text-gray-400">· {notif.targetDept}</span>
                    </div>

                    <p className="text-xs text-gray-500 mt-1 truncate">
                      от {notif.fromName} · {notif.fromRole} · {notif.createdAt}
                    </p>
                  </div>

                  <ChevronRight className={`w-4 h-4 text-gray-300 shrink-0 mt-1 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
                    {/* Chat subject */}
                    {notif.convSubject && (
                      <div className="flex items-start gap-2.5 pt-3">
                        <MessageSquare className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-400">Чат / обращение</p>
                          <p className="text-sm font-medium text-gray-800 mt-0.5">{notif.convSubject}</p>
                          {notif.channel && (
                            <p className="text-xs text-gray-400 mt-0.5">Канал: {notif.channel}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Routing target */}
                    <div className="flex items-start gap-2.5">
                      <Send className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-400">Кому направлено</p>
                        <p className="text-sm font-medium text-gray-800 mt-0.5">
                          {notif.targetDept}
                          {notif.targetAgentName && ` → ${notif.targetAgentName}`}
                        </p>
                      </div>
                    </div>

                    {/* Comment */}
                    {notif.comment && (
                      <div className={`p-3 rounded-xl border ${tcfg.border} ${tcfg.bg}`}>
                        <p className={`text-xs font-semibold ${tcfg.color} mb-1`}>Комментарий от {notif.fromName}:</p>
                        <p className="text-sm text-gray-800 leading-relaxed">{notif.comment}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-1">
                      {notif.conversationId && (
                        <button onClick={() => handleGoToChat(notif)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-semibold transition-colors">
                          <ExternalLink className="w-3.5 h-3.5" />Открыть чат
                        </button>
                      )}
                      <button onClick={() => { markRead(notif.id); setExpandedId(null); }}
                        className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-medium transition-colors">
                        <Check className="w-3.5 h-3.5 text-green-600" />Принято
                      </button>
                      <button onClick={() => deleteNotification(notif.id)}
                        className="ml-auto p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-xl transition-colors"
                        title="Удалить уведомление">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Info note */}
      <div className="flex items-start gap-3 p-4 bg-indigo-50 border border-indigo-200 rounded-2xl">
        <Shield className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-indigo-900">Внутренний канал уведомлений</p>
          <p className="text-xs text-indigo-700 mt-0.5 leading-relaxed">
            Здесь отображаются задачи и обращения, перенаправленные вам или вашему отделу из чат-центра.
            Вы можете просмотреть контекст и перейти напрямую в чат.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PersonalCabinet({ previewRole, previewName, previewModules, scopeValue, onClose }: Props) {
  const { user } = useAuth();
  const [tab, setTab] = useState<'home' | 'access' | 'inbox'>('home');
  const [notifCount, setNotifCount] = useState(() => unreadCount());
  const [widgetKey, setWidgetKey] = useState(0);
  const [widgetRefreshedAt, setWidgetRefreshedAt] = useState<Date | null>(null);

  // Reactive: re-count unread when store changes
  useEffect(() => {
    const unsub = subscribeNotifs(() => setNotifCount(unreadCount()));
    return unsub;
  }, []);

  const role = previewRole ?? user?.role ?? 'Admin';
  const firstName = (previewName ?? user?.name ?? 'Пользователь').split(' ').slice(0, 2).join(' ');
  const isPreview = !!previewRole;

  const kpis = ROLE_KPIS[role] ?? ROLE_KPIS.Admin;
  const actions = ROLE_ACTIONS[role] ?? ROLE_ACTIONS.Admin;
  const effectiveModules: ModuleKey[] = previewModules !== undefined
    ? (previewModules ?? ROLE_DEFAULT_MODULES[role] ?? [])
    : (ROLE_DEFAULT_MODULES[role] ?? []);

  const roleColor = ROLE_COLORS[role] ?? 'blue';
  const roleBadge = COLOR_BADGE[roleColor] ?? COLOR_BADGE.blue;
  const roleLabel = ROLE_LABELS[role] ?? role;

  const now = new Date();
  const timeStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="space-y-6">
      {/* Preview banner */}
      {isPreview && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-200 rounded-full flex items-center justify-center">
              <Eye className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <p className="font-semibold text-amber-900">Режим превью</p>
              <p className="text-sm text-amber-700">Так будет выглядеть личный кабинет для роли «{roleLabel}»</p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-2 hover:bg-amber-200 rounded-xl transition-colors shrink-0">
              <X className="w-5 h-5 text-amber-700" />
            </button>
          )}
        </div>
      )}

      {/* Welcome header */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-6 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-12" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-blue-200 text-sm mb-1 capitalize">{dateStr} · {timeStr}</p>
            <h1 className="text-2xl font-bold mb-1">Добро пожаловать, {firstName}!</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${roleBadge}`}>{roleLabel}</span>
              {scopeValue && (
                <span className="flex items-center gap-1 text-blue-200 text-sm">
                  <Globe className="w-3.5 h-3.5" />{scopeValue}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="text-right">
              <p className="text-blue-200 text-xs mb-1">Доступных разделов</p>
              <p className="text-4xl font-bold">{effectiveModules.length}</p>
              <p className="text-blue-200 text-xs">из {ALL_MODULES.length}</p>
            </div>
            {notifCount > 0 && (
              <button
                onClick={() => setTab('inbox')}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-sm font-semibold text-white transition-colors">
                <BellDot className="w-4 h-4 text-violet-300" />
                {notifCount} непрочитанных
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button onClick={() => setTab('home')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'home' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          Мой кабинет
        </button>
        <button onClick={() => setTab('inbox')}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'inbox' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          Входящие
          {notifCount > 0 && (
            <span className={`min-w-[20px] h-5 px-1 rounded-full text-xs font-bold flex items-center justify-center ${
              tab === 'inbox' ? 'bg-violet-600 text-white' : 'bg-violet-100 text-violet-700'
            }`}>{notifCount}</span>
          )}
        </button>
        <button onClick={() => setTab('access')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'access' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          Мои доступы
        </button>
      </div>

      {tab === 'inbox' && <InternalInboxWidget />}

      {tab === 'home' && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map(kpi => <KPICard key={kpi.label} kpi={kpi} />)}
          </div>

          {/* Quick actions */}
          <div>
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" />Быстрые действия
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {actions.map(a => <ActionCard key={a.label} action={a} />)}
            </div>
          </div>

          {/* Main widget */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">{WIDGET_TITLE[role] ?? 'Активность'}</h2>
              <button
                onClick={() => {
                  setWidgetKey(k => k + 1);
                  const t = new Date();
                  setWidgetRefreshedAt(t);
                  import('sonner').then(m => m.toast.success('Виджет обновлён', { description: `Перерисовано в ${t.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` }));
                }}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 transition-colors">
                <RefreshCw className="w-3.5 h-3.5" />Обновить{widgetRefreshedAt && <span className="text-[10px] text-gray-400 ml-1">{widgetRefreshedAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>}
              </button>
            </div>
            <div className="p-5" key={widgetKey}>
              <RoleWidget role={role} />
            </div>
          </div>
        </>
      )}

      {tab === 'access' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Разделы системы, доступные для роли «{roleLabel}»</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ALL_MODULES.map(mod => {
              const hasAccess = effectiveModules.includes(mod.key as ModuleKey);
              const Icon = mod.icon;
              return (
                <div key={mod.key}
                  className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                    hasAccess
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-gray-100 bg-gray-50 opacity-50'
                  }`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${hasAccess ? 'bg-blue-100' : 'bg-gray-200'}`}>
                    <Icon className={`w-5 h-5 ${hasAccess ? 'text-blue-600' : 'text-gray-400'}`} />
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-semibold ${hasAccess ? 'text-blue-900' : 'text-gray-400'}`}>{mod.label}</p>
                    <p className="text-xs text-gray-400">{mod.href}</p>
                  </div>
                  {hasAccess
                    ? (
                      <NavLink to={mod.href}
                        className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1">
                        Открыть<ChevronRight className="w-3 h-3" />
                      </NavLink>
                    )
                    : <span className="text-xs text-gray-400 px-3 py-1.5">Нет доступа</span>
                  }
                </div>
              );
            })}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-blue-900">Нужен доступ к другому разделу?</p>
              <p className="text-sm text-blue-700 mt-1">
                Обратитесь к вашему администратору — он может расширить список доступных страниц для вашего аккаунта индивидуально.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
