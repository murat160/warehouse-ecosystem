import { useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import {
  CheckCircle2, XCircle, AlertTriangle,
  Tag, UserPlus, Shield, Package,
  Eye, Search, RefreshCw, Download,
  Check, X, Info, Zap,
  ThumbsUp,
  FileText, Wallet, Bike, Star,
  ZoomIn, ZoomOut, Send as SendIcon,
  Phone, Mail, MapPin, CreditCard, TrendingUp,
  Hash, ExternalLink,
  Printer, Copy,
} from 'lucide-react';

const ImageIcon = Package;

// ─── Types ────────────────────────────────────────────────────────────────────

type ApprovalCategory = 'discount' | 'payout' | 'user' | 'role' | 'promotion' | 'refund';
type ApprovalStatus   = 'pending' | 'approved' | 'rejected';
type Priority         = 'critical' | 'high' | 'normal' | 'low';

interface OrderLine {
  sku: string;
  name: string;
  qty: number;
  price: number;
  image?: string;
}

interface CourierProfile {
  name: string;
  phone: string;
  email: string;
  photo?: string;
  rating: number;
  deliveries: number;
  region: string;
  vehicle: string;
  bankName: string;
  bankAccount: string;
  weeklyStats: { week: string; orders: number; earnings: number }[];
  dailyStats: { day: string; orders: number; earnings: number }[];
}

interface DocumentRef {
  name: string;
  type: string;
  size: string;
  url?: string;
}

interface ApprovalItem {
  id:          string;
  category:    ApprovalCategory;
  title:       string;
  description: string;
  detail?:     string;
  requestedBy: string;
  requestedAt: string;
  amount?:     number;
  priority:    Priority;
  status:      ApprovalStatus;
  merchantId?: string;
  merchantName?: string;
  storeCount?: number;
  tags?:       string[];
  note?:       string;
  // Enhanced fields
  photos?:     string[];
  orderLines?: OrderLine[];
  orderId?:    string;
  courierProfile?: CourierProfile;
  documents?:  DocumentRef[];
  productPhotos?: string[];
  refundReason?: string;
  customerName?: string;
  customerPhone?: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const INITIAL_ITEMS: ApprovalItem[] = [
  // --- Discounts ---
  {
    id: 'D-001', category: 'discount', priority: 'high', status: 'pending',
    title: 'Скидка 25% на все кроссовки Nike',
    description: 'Продавец запрашивает глобальную скидку 25% на категорию «Кроссовки Nike» на 14 дней',
    detail: 'Период: 14.03–28.03.2026 · Тип: Процентная · Мин. заказ: ₽2000',
    requestedBy: 'ООО «FreshMart»', requestedAt: '13.03.2026 14:22',
    merchantName: 'FreshMart', storeCount: 4,
    tags: ['flash', 'кроссовки', 'Nike'],
    productPhotos: [
      'https://images.unsplash.com/photo-1631984564919-1f6b2313a71c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzbmVha2VycyUyMHNob2VzJTIwcHJvZHVjdHxlbnwxfHx8fDE3NzY3NTc5ODV8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    ],
    documents: [
      { name: 'Коммерческое_предложение.pdf', type: 'PDF', size: '1.2 MB' },
      { name: 'Список_SKU_Nike.xlsx', type: 'XLSX', size: '340 KB' },
    ],
    orderLines: [
      { sku: 'NK-AF1-001', name: 'Nike Air Force 1 Low', qty: 120, price: 12990, image: 'https://images.unsplash.com/photo-1631984564919-1f6b2313a71c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzbmVha2VycyUyMHNob2VzJTIwcHJvZHVjdHxlbnwxfHx8fDE3NzY3NTc5ODV8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' },
      { sku: 'NK-DK2-004', name: 'Nike Dunk Low Retro', qty: 85, price: 11490 },
      { sku: 'NK-AM90-012', name: 'Nike Air Max 90', qty: 64, price: 14990 },
    ],
  },
  {
    id: 'D-002', category: 'discount', priority: 'normal', status: 'pending',
    title: 'Промокод SUMMER10 — 10% на всё',
    description: 'Запрос на промокод со скидкой 10% для летней кампании',
    detail: 'Период: 01.04–30.06.2026 · Тип: Промокод · Макс. использований: 500',
    requestedBy: 'Александр Смирнов (менеджер)',  requestedAt: '13.03.2026 11:05',
    merchantName: 'TopStyle', storeCount: 2,
    tags: ['промокод', 'сезонная'],
    documents: [
      { name: 'Маркетинг_план_лето.pdf', type: 'PDF', size: '2.1 MB' },
    ],
  },
  {
    id: 'D-003', category: 'discount', priority: 'critical', status: 'pending',
    title: 'Скидка 40% — финальная распродажа склада',
    description: 'Срочный запрос на ликвидацию складских остатков. Скидка 40% на 800+ SKU',
    detail: 'Период: Сегодня–20.03.2026 · Тип: Фиксированный % · 847 товаров',
    requestedBy: 'Склад MSK-WH-02', requestedAt: '13.03.2026 09:47',
    merchantName: 'Логистик Плюс', storeCount: 1,
    tags: ['срочно', 'ликвидация'],
    productPhotos: [
      'https://images.unsplash.com/photo-1773125929765-99d4d67e831d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3YXJlaG91c2UlMjBib3hlcyUyMGludmVudG9yeXxlbnwxfHx8fDE3NzY3NjAyODl8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    ],
    documents: [
      { name: 'Остатки_склада_MSK-WH-02.xlsx', type: 'XLSX', size: '890 KB' },
      { name: 'Акт_инвентаризации.pdf', type: 'PDF', size: '3.4 MB' },
    ],
  },
  // --- Promotions ---
  {
    id: 'PR-001', category: 'promotion', priority: 'high', status: 'pending',
    title: 'Акция «Купи 2, получи 1 бесплатно»',
    description: 'Мерчант просит запустить BxGy-акцию на бытовую химию в период праздников',
    detail: 'Период: 20.03–25.03.2026 · Категория: Бытовая химия · 3 магазина',
    requestedBy: 'ООО «CleanHome»', requestedAt: '12.03.2026 18:30',
    merchantName: 'CleanHome', storeCount: 3,
    tags: ['bxgy', 'праздники'],
    productPhotos: [
      'https://images.unsplash.com/photo-1758887262204-a49092d85f15?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjbGVhbmluZyUyMHByb2R1Y3RzJTIwaG91c2Vob2xkfGVufDF8fHx8MTc3Njc2MDI5MHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    ],
    orderLines: [
      { sku: 'CH-001', name: 'Средство для мытья посуды Fairy 900мл', qty: 300, price: 289 },
      { sku: 'CH-002', name: 'Стиральный порошок Ariel 3кг', qty: 200, price: 649 },
      { sku: 'CH-003', name: 'Кондиционер Lenor 1.8л', qty: 250, price: 399 },
    ],
    documents: [
      { name: 'Условия_акции_BxGy.pdf', type: 'PDF', size: '520 KB' },
    ],
  },
  // --- Payouts ---
  {
    id: 'PAY-001', category: 'payout', priority: 'critical', status: 'pending',
    title: 'Выплата курьеру — Иванов И.И.',
    description: 'Ожидает одобрения выплата за период 01–13 марта 2026',
    detail: 'Банк: Сбербанк · Счёт: ****4312 · Период: 14 дней',
    requestedBy: 'Система выплат', requestedAt: '13.03.2026 00:00',
    amount: 47300, tags: ['курьер'],
    courierProfile: {
      name: 'Иванов Иван Иванович',
      phone: '+7 (916) 555-12-34',
      email: 'ivanov@courier.ru',
      photo: 'https://images.unsplash.com/photo-1764745223157-64f76610cb3c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3VyaWVyJTIwZGVsaXZlcnklMjBiaWtlJTIwcmlkZXJ8ZW58MXx8fHwxNzc2NzYwMjg4fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      rating: 4.8,
      deliveries: 1247,
      region: 'Москва, ЦАО',
      vehicle: 'Велосипед',
      bankName: 'Сбербанк',
      bankAccount: '****4312',
      weeklyStats: [
        { week: '24 фев — 02 мар', orders: 68, earnings: 18200 },
        { week: '03 мар — 09 мар', orders: 72, earnings: 19500 },
        { week: '10 мар — 13 мар', orders: 35, earnings: 9600 },
      ],
      dailyStats: [
        { day: '10.03', orders: 9, earnings: 2400 },
        { day: '11.03', orders: 11, earnings: 3100 },
        { day: '12.03', orders: 8, earnings: 2200 },
        { day: '13.03', orders: 7, earnings: 1900 },
      ],
    },
    documents: [
      { name: 'Акт_выполненных_работ.pdf', type: 'PDF', size: '180 KB' },
      { name: 'Реестр_доставок_01-13.03.xlsx', type: 'XLSX', size: '420 KB' },
    ],
  },
  {
    id: 'PAY-002', category: 'payout', priority: 'high', status: 'pending',
    title: 'Выплата ПВЗ — MSK-PVZ-007',
    description: 'Ежемесячная выплата оператору ПВЗ за февраль',
    detail: 'Банк: Т-Банк · Счёт: ****8821 · 143 операции',
    requestedBy: 'Система выплат', requestedAt: '13.03.2026 00:00',
    amount: 89200, tags: ['ПВЗ'],
    documents: [
      { name: 'Реестр_операций_февраль.xlsx', type: 'XLSX', size: '1.1 MB' },
      { name: 'Акт_сверки_MSK-PVZ-007.pdf', type: 'PDF', size: '290 KB' },
    ],
  },
  {
    id: 'PAY-003', category: 'payout', priority: 'normal', status: 'pending',
    title: 'Выплата мерчанту — ИП Казаков А.Р.',
    description: 'Плановая выплата за реализованные товары в феврале',
    detail: 'Банк: ВТБ · Счёт: ****3301 · 234 заказа',
    requestedBy: 'Система выплат', requestedAt: '12.03.2026 22:10',
    amount: 324800, tags: ['мерчант'],
    documents: [
      { name: 'Счёт-фактура_02-2026.pdf', type: 'PDF', size: '450 KB' },
      { name: 'Реестр_продаж.xlsx', type: 'XLSX', size: '780 KB' },
    ],
  },
  // --- Users ---
  {
    id: 'U-001', category: 'user', priority: 'normal', status: 'pending',
    title: 'Новый оператор ПВЗ — Смирнова Е.А.',
    description: 'Приглашение на роль «Оператор ПВЗ» для ПВЗ MSK-PVZ-002. Ожидает подтверждения владельца',
    detail: 'Email: smirnova@pvz.ru · ПВЗ: MSK-002 · Добавил: Иванов И.',
    requestedBy: 'Иванов И. (RegionalManager)', requestedAt: '14.03.2026 08:15',
    tags: ['оператор', 'ПВЗ'],
    documents: [
      { name: 'Заявление_на_приём.pdf', type: 'PDF', size: '120 KB' },
    ],
  },
  {
    id: 'U-002', category: 'user', priority: 'high', status: 'pending',
    title: 'Повышение роли — Козлов А.В.',
    description: 'Запрос на повышение роли с «Оператор ПВЗ» до «Региональный менеджер» (Санкт-Петербург)',
    detail: 'Текущая роль: PVZOperator · Новая роль: RegionalManager · Регион: СПб',
    requestedBy: 'Сидоров П. (Admin)', requestedAt: '13.03.2026 17:44',
    tags: ['повышение', 'роль'],
  },
  // --- Roles ---
  {
    id: 'R-001', category: 'role', priority: 'critical', status: 'pending',
    title: 'Новая роль «Merchandise Manager»',
    description: 'Запрос на создание кастомной роли с доступом к товарам, скидкам и аналитике продаж',
    detail: 'Разрешения: merchants.view, products.manage, analytics.view, discounts.approve',
    requestedBy: 'Администратор Системы', requestedAt: '13.03.2026 10:00',
    tags: ['новая роль', 'RBAC'],
    documents: [
      { name: 'Матрица_разрешений.pdf', type: 'PDF', size: '200 KB' },
    ],
  },
  // --- Refunds ---
  {
    id: 'REF-001', category: 'refund', priority: 'high', status: 'pending',
    title: 'Возврат ₽8 400 — заказ #ORD-8821',
    description: 'Клиент: Анна К. Причина: товар не соответствует описанию. Поддержка рекомендует одобрить',
    detail: 'Метод: На карту Visa ****4412 · Заказ от 09.03.2026 · Продавец: FreshMart',
    requestedBy: 'Агент поддержки Козлова Е.', requestedAt: '13.03.2026 13:15',
    amount: 8400, tags: ['возврат'],
    refundReason: 'Товар не соответствует описанию на сайте. Цвет отличается от заявленного.',
    customerName: 'Анна Кузнецова',
    customerPhone: '+7 (903) 111-22-33',
    orderId: 'ORD-8821',
    photos: [
      'https://images.unsplash.com/photo-1545591841-4a97f1da8d1f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYW1hZ2VkJTIwcGFja2FnZSUyMGRlbGl2ZXJ5JTIwcmV0dXJufGVufDF8fHx8MTc3Njc2MDI4N3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    ],
    orderLines: [
      { sku: 'NK-AF1-001', name: 'Nike Air Force 1 Low (White)', qty: 1, price: 8400, image: 'https://images.unsplash.com/photo-1631984564919-1f6b2313a71c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzbmVha2VycyUyMHNob2VzJTIwcHJvZHVjdHxlbnwxfHx8fDE3NzY3NTc5ODV8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' },
    ],
    documents: [
      { name: 'Заявление_на_возврат.pdf', type: 'PDF', size: '95 KB' },
      { name: 'Фото_товара_клиент.jpg', type: 'JPG', size: '2.3 MB' },
    ],
  },
];

// ─── Config ───────────────────────────────────────────────────────────────────

const CAT_CFG: Record<ApprovalCategory, {
  label: string; icon: React.ElementType;
  color: string; bg: string; border: string; dot: string;
}> = {
  discount:  { label: 'Скидка',     icon: Tag,        color: 'text-purple-700', bg: 'bg-purple-50',  border: 'border-purple-200', dot: 'bg-purple-500'  },
  promotion: { label: 'Акция',      icon: Zap,        color: 'text-orange-700', bg: 'bg-orange-50',  border: 'border-orange-200', dot: 'bg-orange-500'  },
  payout:    { label: 'Выплата',    icon: Wallet,     color: 'text-blue-700',   bg: 'bg-blue-50',    border: 'border-blue-200',   dot: 'bg-blue-500'    },
  user:      { label: 'Пользователь', icon: UserPlus, color: 'text-green-700',  bg: 'bg-green-50',   border: 'border-green-200',  dot: 'bg-green-500'   },
  role:      { label: 'Роль',       icon: Shield,     color: 'text-red-700',    bg: 'bg-red-50',     border: 'border-red-200',    dot: 'bg-red-500'     },
  refund:    { label: 'Возврат',    icon: RefreshCw,  color: 'text-teal-700',   bg: 'bg-teal-50',    border: 'border-teal-200',   dot: 'bg-teal-500'    },
};

const PRIORITY_CFG: Record<Priority, { label: string; badge: string; dot: string }> = {
  critical: { label: 'Критично',   badge: 'bg-red-100 text-red-700',    dot: 'bg-red-500'    },
  high:     { label: 'Высокий',    badge: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  normal:   { label: 'Обычный',   badge: 'bg-gray-100 text-gray-600',   dot: 'bg-gray-400'   },
  low:      { label: 'Низкий',    badge: 'bg-blue-50 text-blue-600',    dot: 'bg-blue-400'   },
};

function fmtRub(n: number) {
  if (n >= 1_000_000) return `₽${(n / 1_000_000).toFixed(2)}М`;
  if (n >= 1_000)     return `₽${(n / 1_000).toFixed(1)}К`;
  return `₽${n.toLocaleString('ru-RU')}`;
}

function fmtRubFull(n: number) {
  return `₽${n.toLocaleString('ru-RU')}`;
}

// ─── Image Lightbox (Portal) ──────────────────────────────────────────────────

function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const [zoom, setZoom] = useState(1);
  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = src;
    a.download = alt || 'image';
    a.target = '_blank';
    a.click();
    toast.success('Загрузка начата');
  };
  const handleSend = () => {
    toast.success('Ссылка скопирована для отправки');
  };

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80" onClick={onClose}>
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <button onClick={(e) => { e.stopPropagation(); setZoom(z => Math.max(0.5, z - 0.25)); }}
          className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center text-white hover:bg-white/30 transition-colors">
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-white text-xs font-mono bg-white/20 backdrop-blur-sm px-2 py-1 rounded-lg">{Math.round(zoom * 100)}%</span>
        <button onClick={(e) => { e.stopPropagation(); setZoom(z => Math.min(3, z + 0.25)); }}
          className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center text-white hover:bg-white/30 transition-colors">
          <ZoomIn className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-white/20" />
        <button onClick={(e) => { e.stopPropagation(); handleDownload(); }}
          className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center text-white hover:bg-white/30 transition-colors">
          <Download className="w-4 h-4" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); handleSend(); }}
          className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center text-white hover:bg-white/30 transition-colors">
          <SendIcon className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-white/20" />
        <button onClick={onClose}
          className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center text-white hover:bg-white/30 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="max-w-[90vw] max-h-[85vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <img
          src={src}
          alt={alt}
          className="rounded-lg shadow-2xl transition-transform duration-200"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
        />
      </div>
    </div>
  );
  return ReactDOM.createPortal(modal, document.body);
}

// ─── Confirm Modal (Portal) ───────────────────────────────────────────────────

function ConfirmModal({
  action, item, comment, onComment, onConfirm, onCancel,
}: {
  action: 'approve' | 'reject';
  item: ApprovalItem;
  comment: string;
  onComment: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const isApprove = action === 'approve';
  const cfg = CAT_CFG[item.category];
  const Icon = cfg.icon;

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className={`px-5 py-4 ${isApprove ? 'bg-green-50 border-b border-green-100' : 'bg-red-50 border-b border-red-100'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isApprove ? 'bg-green-100' : 'bg-red-100'}`}>
              {isApprove
                ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                : <XCircle className="w-5 h-5 text-red-600" />
              }
            </div>
            <div>
              <p className={`font-bold ${isApprove ? 'text-green-800' : 'text-red-800'}`}>
                {isApprove ? 'Одобрить запрос?' : 'Отклонить запрос?'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{item.title}</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          <div className={`flex items-start gap-2.5 p-3 rounded-xl ${cfg.bg} border ${cfg.border}`}>
            <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${cfg.color}`} />
            <div className="text-xs text-gray-700">
              <p className="font-medium">{item.description}</p>
              {item.detail && <p className="text-gray-500 mt-0.5">{item.detail}</p>}
              {item.amount && (
                <p className="font-bold mt-1" style={{ color: 'inherit' }}>Сумма: {fmtRub(item.amount)}</p>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
              {isApprove ? 'Комментарий (необязательно)' : 'Причина отклонения *'}
            </label>
            <textarea
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder={isApprove ? 'Добавьте примечание...' : 'Укажите причину отклонения...'}
              value={comment}
              onChange={e => onComment(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex items-center gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={onConfirm}
            className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-bold text-white transition-colors ${
              isApprove ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {isApprove
              ? <><Check className="w-4 h-4" />Одобрить</>
              : <><X className="w-4 h-4" />Отклонить</>
            }
          </button>
        </div>
      </div>
    </div>
  );
  return ReactDOM.createPortal(modal, document.body);
}

// ─── Photo Gallery Section ────────────────────────────────────────────────────

function PhotoGallery({ photos, label, onOpenLightbox }: { photos: string[]; label: string; onOpenLightbox: (src: string) => void }) {
  if (!photos || photos.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <ImageIcon className="w-3.5 h-3.5" />{label}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {photos.map((p, i) => (
          <div key={i} className="relative group rounded-xl overflow-hidden border border-gray-200 cursor-pointer aspect-square"
            onClick={() => onOpenLightbox(p)}>
            <img src={p} alt={`${label} ${i + 1}`} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
                <div className="w-8 h-8 bg-white/90 rounded-lg flex items-center justify-center">
                  <ZoomIn className="w-4 h-4 text-gray-700" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Documents Section ────────────────────────────────────────────────────────

function DocumentsSection({ documents }: { documents: DocumentRef[] }) {
  if (!documents || documents.length === 0) return null;
  const getIcon = (type: string) => {
    if (type === 'PDF') return <FileText className="w-4 h-4 text-red-500" />;
    if (type === 'XLSX' || type === 'XLS') return <FileText className="w-4 h-4 text-green-600" />;
    if (type === 'JPG' || type === 'PNG') return <ImageIcon className="w-4 h-4 text-blue-500" />;
    return <FileText className="w-4 h-4 text-gray-500" />;
  };

  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <FileText className="w-3.5 h-3.5" />Документы
      </p>
      <div className="space-y-1.5">
        {documents.map((doc, i) => (
          <div key={i} className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors group">
            {getIcon(doc.type)}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-800 truncate">{doc.name}</p>
              <p className="text-[10px] text-gray-400">{doc.type} · {doc.size}</p>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => toast.success(`Скачивание: ${doc.name}`)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                <Download className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => toast.success(`Открыто: ${doc.name}`)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => toast.success(`Ссылка скопирована: ${doc.name}`)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                <SendIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Order Lines Section ──────────────────────────────────────────────────────

function OrderLinesSection({ lines, onOpenLightbox }: { lines: OrderLine[]; onOpenLightbox: (src: string) => void }) {
  if (!lines || lines.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <Package className="w-3.5 h-3.5" />Товары
      </p>
      <div className="space-y-2">
        {lines.map((line, i) => (
          <div key={i} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl border border-gray-100">
            {line.image ? (
              <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 shrink-0 cursor-pointer group relative"
                onClick={() => onOpenLightbox(line.image!)}>
                <img src={line.image} alt={line.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <ZoomIn className="w-3 h-3 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ) : (
              <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center shrink-0">
                <Package className="w-5 h-5 text-gray-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-800 truncate">{line.name}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">SKU: {line.sku} · Кол-во: {line.qty}</p>
            </div>
            <span className="text-xs font-bold text-gray-700 shrink-0">{fmtRubFull(line.price)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Courier Profile Section ──────────────────────────────────────────────────

function CourierProfileSection({ profile, onOpenLightbox }: { profile: CourierProfile; onOpenLightbox: (src: string) => void }) {
  const [statsView, setStatsView] = useState<'daily' | 'weekly'>('weekly');
  const stats = statsView === 'weekly' ? profile.weeklyStats : profile.dailyStats;

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
        <Bike className="w-3.5 h-3.5" />Профиль курьера
      </p>

      {/* Profile card */}
      <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
        {profile.photo ? (
          <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-white shadow-sm shrink-0 cursor-pointer"
            onClick={() => onOpenLightbox(profile.photo!)}>
            <img src={profile.photo} alt={profile.name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-14 h-14 rounded-xl bg-blue-200 flex items-center justify-center shrink-0">
            <Bike className="w-6 h-6 text-blue-600" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900">{profile.name}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="flex items-center gap-0.5 text-[11px] text-amber-600 font-semibold">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />{profile.rating}
            </span>
            <span className="text-[11px] text-gray-400">·</span>
            <span className="text-[11px] text-gray-500">{profile.deliveries} доставок</span>
          </div>
        </div>
      </div>

      {/* Contact + Details */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2.5 bg-gray-50 rounded-xl">
          <div className="flex items-center gap-1.5 mb-1">
            <Phone className="w-3 h-3 text-gray-400" />
            <span className="text-[10px] text-gray-400">Телефон</span>
          </div>
          <p className="text-xs font-medium text-gray-800">{profile.phone}</p>
        </div>
        <div className="p-2.5 bg-gray-50 rounded-xl">
          <div className="flex items-center gap-1.5 mb-1">
            <Mail className="w-3 h-3 text-gray-400" />
            <span className="text-[10px] text-gray-400">Email</span>
          </div>
          <p className="text-xs font-medium text-gray-800 truncate">{profile.email}</p>
        </div>
        <div className="p-2.5 bg-gray-50 rounded-xl">
          <div className="flex items-center gap-1.5 mb-1">
            <MapPin className="w-3 h-3 text-gray-400" />
            <span className="text-[10px] text-gray-400">Регион</span>
          </div>
          <p className="text-xs font-medium text-gray-800">{profile.region}</p>
        </div>
        <div className="p-2.5 bg-gray-50 rounded-xl">
          <div className="flex items-center gap-1.5 mb-1">
            <Bike className="w-3 h-3 text-gray-400" />
            <span className="text-[10px] text-gray-400">Транспорт</span>
          </div>
          <p className="text-xs font-medium text-gray-800">{profile.vehicle}</p>
        </div>
        <div className="p-2.5 bg-gray-50 rounded-xl col-span-2">
          <div className="flex items-center gap-1.5 mb-1">
            <CreditCard className="w-3 h-3 text-gray-400" />
            <span className="text-[10px] text-gray-400">Банковские реквизиты</span>
          </div>
          <p className="text-xs font-medium text-gray-800">{profile.bankName} · Счёт: {profile.bankAccount}</p>
        </div>
      </div>

      {/* Stats */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" />Статистика
          </p>
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setStatsView('daily')}
              className={`px-2 py-1 text-[10px] font-semibold rounded-md transition-colors ${statsView === 'daily' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
            >По дням</button>
            <button
              onClick={() => setStatsView('weekly')}
              className={`px-2 py-1 text-[10px] font-semibold rounded-md transition-colors ${statsView === 'weekly' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
            >По неделям</button>
          </div>
        </div>
        <div className="space-y-1.5">
          {stats.map((s, i) => (
            <div key={i} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-[11px] text-gray-600 font-medium">{statsView === 'weekly' ? s.week : s.day}</span>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-gray-500">{s.orders} заказов</span>
                <span className="text-xs font-bold text-gray-800">{fmtRubFull(s.earnings)}</span>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between p-2.5 bg-blue-50 rounded-xl border border-blue-100">
            <span className="text-[11px] text-blue-700 font-bold">Итого</span>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-blue-600 font-medium">{stats.reduce((a, s) => a + s.orders, 0)} заказов</span>
              <span className="text-xs font-black text-blue-700">{fmtRubFull(stats.reduce((a, s) => a + s.earnings, 0))}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Detail Drawer (Portal) ───────────────────────────────────────────────────

function DetailDrawer({ item, onClose, onApprove, onReject }: {
  item: ApprovalItem;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const cfg = CAT_CFG[item.category];
  const Icon = cfg.icon;
  const prio = PRIORITY_CFG[item.priority];
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [sendEmail, setSendEmail] = useState('');

  const handlePrint = () => toast.success('Подготовка к печати...');
  const handleExport = () => toast.success('Экспорт данных...');

  const drawer = (
    <div className="fixed inset-0 z-[8000] flex" style={{ background: 'rgba(0,0,0,0.35)' }} onClick={onClose}>
      <div className="ml-auto w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-start gap-3 shrink-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
            <Icon className={`w-5 h-5 ${cfg.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${prio.badge}`}>{prio.label}</span>
              <span className="text-[10px] text-gray-400">{item.id}</span>
            </div>
            <p className="text-sm font-bold text-gray-900 mt-1 leading-snug">{item.title}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-5 py-2 border-b border-gray-50 flex items-center gap-1.5 shrink-0">
          <button onClick={handlePrint}
            className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
            <Printer className="w-3.5 h-3.5" />Печать
          </button>
          <button onClick={handleExport}
            className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
            <Download className="w-3.5 h-3.5" />Экспорт
          </button>
          <button onClick={() => setSendModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
            <SendIcon className="w-3.5 h-3.5" />Отправить
          </button>
          <button onClick={() => { navigator.clipboard.writeText(`${item.id}: ${item.title}`); toast.success('Скопировано'); }}
            className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
            <Copy className="w-3.5 h-3.5" />Копировать
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 p-5 space-y-4 overflow-y-auto">
          {/* Description */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Описание</p>
            <p className="text-sm text-gray-800">{item.description}</p>
          </div>

          {/* Details */}
          {item.detail && (
            <div className={`p-3.5 rounded-xl ${cfg.bg} border ${cfg.border}`}>
              <div className="flex items-start gap-2">
                <Info className={`w-4 h-4 shrink-0 mt-0.5 ${cfg.color}`} />
                <p className="text-xs text-gray-700">{item.detail}</p>
              </div>
            </div>
          )}

          {/* Amount */}
          {item.amount && (
            <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-xs text-gray-500 font-medium">Сумма</span>
              <span className="text-lg font-black text-gray-900">{fmtRubFull(item.amount)}</span>
            </div>
          )}

          {/* ── Category-specific: Refund ── */}
          {item.category === 'refund' && (
            <>
              {item.refundReason && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-xs font-semibold text-amber-700 mb-1 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />Причина возврата
                  </p>
                  <p className="text-xs text-amber-800">{item.refundReason}</p>
                </div>
              )}
              {(item.customerName || item.customerPhone) && (
                <div className="grid grid-cols-2 gap-2">
                  {item.customerName && (
                    <div className="p-2.5 bg-gray-50 rounded-xl">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Клиент</p>
                      <p className="text-xs font-semibold text-gray-800 mt-0.5">{item.customerName}</p>
                    </div>
                  )}
                  {item.customerPhone && (
                    <div className="p-2.5 bg-gray-50 rounded-xl">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Телефон</p>
                      <p className="text-xs font-semibold text-gray-800 mt-0.5">{item.customerPhone}</p>
                    </div>
                  )}
                </div>
              )}
              {item.orderId && (
                <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-blue-600 font-medium flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5" />Заказ: {item.orderId}
                    </span>
                    <Link to={`/orders/${item.orderId}`} className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5">
                      Открыть <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              )}
              <PhotoGallery photos={item.photos || []} label="Фото возврата" onOpenLightbox={setLightboxSrc} />
            </>
          )}

          {/* ── Category-specific: Payout (Courier) ── */}
          {item.category === 'payout' && item.courierProfile && (
            <CourierProfileSection profile={item.courierProfile} onOpenLightbox={setLightboxSrc} />
          )}

          {/* ── Category-specific: Discount / Promotion — Product Photos & Lines ── */}
          {(item.category === 'discount' || item.category === 'promotion') && (
            <>
              <PhotoGallery photos={item.productPhotos || []} label="Фото товаров" onOpenLightbox={setLightboxSrc} />
            </>
          )}

          {/* Order lines for any category */}
          <OrderLinesSection lines={item.orderLines || []} onOpenLightbox={setLightboxSrc} />

          {/* Documents for any category */}
          <DocumentsSection documents={item.documents || []} />

          {/* Meta info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Запросил</p>
              <p className="text-xs font-semibold text-gray-800 mt-0.5">{item.requestedBy}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Дата запроса</p>
              <p className="text-xs font-semibold text-gray-800 mt-0.5">{item.requestedAt}</p>
            </div>
            {item.merchantName && (
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Мерчант</p>
                <p className="text-xs font-semibold text-gray-800 mt-0.5">{item.merchantName}</p>
              </div>
            )}
            {item.storeCount !== undefined && (
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Магазинов</p>
                <p className="text-xs font-semibold text-gray-800 mt-0.5">{item.storeCount}</p>
              </div>
            )}
          </div>

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Метки</p>
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map(t => (
                  <span key={t} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-lg text-[11px] font-medium">#{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* Category-specific notices */}
          {item.category === 'role' && (
            <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">После одобрения роль появится в <strong>Управлении RBAC</strong> и её можно будет редактировать.</p>
            </div>
          )}
          {item.category === 'user' && (
            <div className="flex items-start gap-2.5 p-3.5 bg-blue-50 border border-blue-200 rounded-xl">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800">После одобрения пользователю будет выслано письмо-активация и он получит доступ к системе с указанной ролью.</p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-5 border-t border-gray-100 flex gap-2 shrink-0">
          <button
            onClick={onReject}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-sm font-semibold transition-colors"
          >
            <XCircle className="w-4 h-4" />Отклонить
          </button>
          <button
            onClick={onApprove}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />Одобрить
          </button>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxSrc && (
        <ImageLightbox src={lightboxSrc} alt="Просмотр" onClose={() => setLightboxSrc(null)} />
      )}

      {/* Send Modal */}
      {sendModalOpen && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setSendModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="font-bold text-gray-900 flex items-center gap-2"><SendIcon className="w-4 h-4 text-blue-600" />Отправить данные</p>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Email получателя</label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="email@example.com"
                  value={sendEmail}
                  onChange={e => setSendEmail(e.target.value)}
                />
              </div>
              <p className="text-xs text-gray-400">Будут отправлены все детали запроса {item.id}, включая вложения.</p>
            </div>
            <div className="px-5 pb-5 flex items-center gap-2 justify-end">
              <button onClick={() => setSendModalOpen(false)}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                Отмена
              </button>
              <button onClick={() => { setSendModalOpen(false); toast.success(`Отправлено на ${sendEmail || 'email'}`); setSendEmail(''); }}
                className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors">
                <SendIcon className="w-4 h-4" />Отправить
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
  return ReactDOM.createPortal(drawer, document.body);
}

// ─── Approval Card ────────────────────────────────────────────────────────────

function ApprovalCard({
  item,
  onApprove,
  onReject,
  onViewDetail,
}: {
  item: ApprovalItem;
  onApprove: () => void;
  onReject: () => void;
  onViewDetail: () => void;
}) {
  const cfg = CAT_CFG[item.category];
  const prio = PRIORITY_CFG[item.priority];
  const Icon = cfg.icon;

  return (
    <div className={`bg-white border rounded-2xl overflow-hidden hover:shadow-md transition-all duration-150 group ${
      item.priority === 'critical' ? 'border-red-200 ring-1 ring-red-100' : 'border-gray-200'
    }`}>
      {/* Priority stripe */}
      <div className={`h-1 w-full ${prio.dot}`} />

      <div className="p-4">
        {/* Top row */}
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
            <Icon className={`w-4.5 h-4.5 ${cfg.color}`} style={{ width: 18, height: 18 }} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${prio.badge}`}>{prio.label}</span>
              <span className="text-[10px] text-gray-400 ml-auto whitespace-nowrap">{item.id}</span>
            </div>
            <p className="text-sm font-bold text-gray-900 leading-snug truncate">{item.title}</p>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-gray-600 mt-2 line-clamp-2 leading-relaxed">{item.description}</p>

        {/* Detail snippet */}
        {item.detail && (
          <p className="text-[11px] text-gray-400 mt-1 truncate">{item.detail}</p>
        )}

        {/* Amount badge */}
        {item.amount && (
          <div className="mt-2">
            <span className="inline-block px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold">
              {fmtRub(item.amount)}
            </span>
          </div>
        )}

        {/* Attachments indicator */}
        {((item.photos && item.photos.length > 0) || (item.documents && item.documents.length > 0) || (item.productPhotos && item.productPhotos.length > 0)) && (
          <div className="flex items-center gap-2 mt-2">
            {(item.photos && item.photos.length > 0 || item.productPhotos && item.productPhotos.length > 0) && (
              <span className="flex items-center gap-1 text-[10px] text-gray-400">
                <ImageIcon className="w-3 h-3" />{(item.photos?.length || 0) + (item.productPhotos?.length || 0)} фото
              </span>
            )}
            {item.documents && item.documents.length > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-gray-400">
                <FileText className="w-3 h-3" />{item.documents.length} док.
              </span>
            )}
          </div>
        )}

        {/* Meta */}
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-50">
          <span className="text-[11px] text-gray-400 truncate flex-1">
            <span className="font-medium text-gray-600">{item.requestedBy}</span>
            {' · '}{item.requestedAt}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-2.5">
          <button
            onClick={onViewDetail}
            className="flex items-center gap-1 px-2.5 py-1.5 border border-gray-200 text-gray-500 hover:bg-gray-50 rounded-lg text-xs font-medium transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />Детали
          </button>
          <div className="flex-1" />
          <button
            onClick={onReject}
            className="flex items-center gap-1 px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold transition-colors"
          >
            <X className="w-3.5 h-3.5" />Отклонить
          </button>
          <button
            onClick={onApprove}
            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-colors"
          >
            <Check className="w-3.5 h-3.5" />Одобрить
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── History Row ──────────────────────────────────────────────────────────────

function HistoryRow({ item }: { item: ApprovalItem }) {
  const cfg = CAT_CFG[item.category];
  const Icon = cfg.icon;
  const isApproved = item.status === 'approved';

  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.bg}`}>
        <Icon className={`w-4 h-4 ${cfg.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{item.title}</p>
        <p className="text-xs text-gray-400 mt-0.5">{item.requestedAt} · {item.requestedBy}</p>
      </div>
      <span className={`shrink-0 flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
        isApproved ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
      }`}>
        {isApproved ? <><Check className="w-3 h-3" />Одобрено</> : <><X className="w-3 h-3" />Отклонено</>}
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ApprovalCenter() {
  const [items, setItems] = useState<ApprovalItem[]>(INITIAL_ITEMS);
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [categoryFilter, setCategoryFilter] = useState<ApprovalCategory | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');
  const [search, setSearch] = useState('');

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState<{
    action: 'approve' | 'reject'; item: ApprovalItem; comment: string;
  } | null>(null);

  // Detail drawer state
  const [detailItem, setDetailItem] = useState<ApprovalItem | null>(null);

  const pending = items.filter(i => i.status === 'pending');
  const history = items.filter(i => i.status !== 'pending');

  const filteredPending = useMemo(() => {
    let list = pending;
    if (categoryFilter !== 'all') list = list.filter(i => i.category === categoryFilter);
    if (priorityFilter !== 'all') list = list.filter(i => i.priority === priorityFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(i =>
        i.title.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.requestedBy.toLowerCase().includes(q)
      );
    }
    const ORDER: Priority[] = ['critical', 'high', 'normal', 'low'];
    return [...list].sort((a, b) => ORDER.indexOf(a.priority) - ORDER.indexOf(b.priority));
  }, [pending, categoryFilter, priorityFilter, search]);

  const counts = useMemo(() => {
    const c: Partial<Record<ApprovalCategory | 'all', number>> = { all: pending.length };
    pending.forEach(i => { c[i.category] = (c[i.category] ?? 0) + 1; });
    return c;
  }, [pending]);

  const criticalCount = pending.filter(i => i.priority === 'critical').length;

  // ── Actions ──

  function startApprove(item: ApprovalItem) {
    setDetailItem(null);
    setConfirmModal({ action: 'approve', item, comment: '' });
  }
  function startReject(item: ApprovalItem) {
    setDetailItem(null);
    setConfirmModal({ action: 'reject', item, comment: '' });
  }

  function confirmAction() {
    if (!confirmModal) return;
    const { action, item } = confirmModal;
    setItems(prev =>
      prev.map(i => i.id === item.id ? { ...i, status: action === 'approve' ? 'approved' : 'rejected' } : i)
    );
    if (action === 'approve') {
      toast.success(`✅ Запрос одобрен: ${item.title}`);
    } else {
      toast.error(`❌ Запрос отклонён: ${item.title}`);
    }
    setConfirmModal(null);
  }

  function approveAll() {
    const targets = filteredPending;
    setItems(prev => prev.map(i =>
      targets.some(t => t.id === i.id) ? { ...i, status: 'approved' } : i
    ));
    toast.success(`✅ Одобрено ${targets.length} запросов`);
  }

  const catTabs: { key: ApprovalCategory | 'all'; label: string }[] = [
    { key: 'all',       label: 'Все' },
    { key: 'discount',  label: 'Скидки' },
    { key: 'promotion', label: 'Акции' },
    { key: 'payout',    label: 'Выплаты' },
    { key: 'user',      label: 'Пользователи' },
    { key: 'role',      label: 'Роли' },
    { key: 'refund',    label: 'Возвраты' },
  ];

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Центр одобрения</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Запросы на согласование · {pending.length} ожидают · {history.length} обработано
          </p>
        </div>
        <div className="flex items-center gap-2">
          {filteredPending.length > 1 && activeTab === 'pending' && (
            <button
              onClick={approveAll}
              className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold transition-colors"
            >
              <ThumbsUp className="w-4 h-4" />Одобрить все ({filteredPending.length})
            </button>
          )}
          <Link
            to="/security/rbac"
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 rounded-xl text-xs font-medium transition-colors"
          >
            <Shield className="w-3.5 h-3.5" />Управление ролями
          </Link>
        </div>
      </div>

      {/* Critical alert */}
      {criticalCount > 0 && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
          <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-red-800">
              {criticalCount} критическ{criticalCount === 1 ? 'ий' : 'их'} запрос{criticalCount === 1 ? '' : criticalCount < 5 ? 'а' : 'ов'} требу{criticalCount === 1 ? 'ет' : 'ют'} немедленного решения
            </p>
            <p className="text-xs text-red-600 mt-0.5">Рекомендуется обработать в первую очередь</p>
          </div>
          <button
            onClick={() => { setCategoryFilter('all'); setPriorityFilter('critical'); setActiveTab('pending'); }}
            className="shrink-0 flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />Показать
          </button>
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {(['discount', 'promotion', 'payout', 'user', 'role', 'refund'] as ApprovalCategory[]).map(cat => {
          const cfg = CAT_CFG[cat];
          const Icon = cfg.icon;
          const count = counts[cat] ?? 0;
          return (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat === categoryFilter ? 'all' : cat)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all text-center ${
                categoryFilter === cat
                  ? `${cfg.bg} ${cfg.border} shadow-sm ring-1 ring-current ring-opacity-20`
                  : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${cfg.bg}`}>
                <Icon className={`w-4 h-4 ${cfg.color}`} />
              </div>
              <span className={`text-lg font-black ${count > 0 ? cfg.color : 'text-gray-300'}`}>{count}</span>
              <span className="text-[10px] text-gray-500 leading-tight">{cfg.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {[
          { id: 'pending' as const, label: `Ожидают (${pending.length})` },
          { id: 'history' as const, label: `История (${history.length})` },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'pending' && (
        <>
          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                placeholder="Поиск..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="flex gap-1 flex-wrap">
              {catTabs.map(t => (
                <button
                  key={t.key}
                  onClick={() => setCategoryFilter(t.key)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    categoryFilter === t.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {t.label}
                  {t.key !== 'all' && (counts[t.key as ApprovalCategory] ?? 0) > 0 && (
                    <span className={`ml-1 ${categoryFilter === t.key ? 'text-blue-200' : 'text-gray-400'}`}>
                      {counts[t.key as ApprovalCategory]}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <select
              className="px-2.5 py-1.5 border border-gray-200 rounded-xl text-xs font-medium text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value as Priority | 'all')}
            >
              <option value="all">Все приоритеты</option>
              <option value="critical">Критично</option>
              <option value="high">Высокий</option>
              <option value="normal">Обычный</option>
              <option value="low">Низкий</option>
            </select>
          </div>

          {/* Cards grid */}
          {filteredPending.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mb-3">
                <CheckCircle2 className="w-7 h-7 text-green-500" />
              </div>
              <p className="text-gray-700 font-bold">Нет запросов для обработки</p>
              <p className="text-sm text-gray-400 mt-1">Все запросы обработаны. Отличная работа!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredPending.map(item => (
                <ApprovalCard
                  key={item.id}
                  item={item}
                  onApprove={() => startApprove(item)}
                  onReject={() => startReject(item)}
                  onViewDetail={() => setDetailItem(item)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'history' && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">История решений</p>
            <span className="text-xs text-gray-400">{history.length} записей</span>
          </div>
          <div className="px-5 divide-y divide-gray-50">
            {history.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">История пуста</p>
            ) : (
              history.map(item => <HistoryRow key={item.id} item={item} />)
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {confirmModal && (
        <ConfirmModal
          action={confirmModal.action}
          item={confirmModal.item}
          comment={confirmModal.comment}
          onComment={v => setConfirmModal(m => m ? { ...m, comment: v } : null)}
          onConfirm={confirmAction}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      {detailItem && (
        <DetailDrawer
          item={detailItem}
          onClose={() => setDetailItem(null)}
          onApprove={() => startApprove(detailItem)}
          onReject={() => startReject(detailItem)}
        />
      )}
    </div>
  );
}
