// =====================================================
// Merchants/Sellers Module — Types & Mock Data
// Professional admin panel for PVZ & delivery network
// =====================================================

// --- Enums & Types ---

export type SellerStatus = 'active' | 'paused' | 'blocked' | 'pending' | 'on_hold';
export type SellerType = 'restaurant' | 'retail' | 'darkstore' | 'marketplace' | 'cafe' | 'grocery' | 'gifts' | 'auto_parts' | 'pharmacy' | 'electronics' | 'clothing' | 'flowers' | 'bakery' | 'beauty';
export type RiskLevel = 'low' | 'medium' | 'high';
export type FulfillmentType = 'delivery' | 'pickup' | 'pvz' | 'self_delivery';
export type AvailabilityStatus = 'available' | 'sold_out_today' | 'sold_out_indefinitely' | 'hidden';
export type StoreStatus = 'online' | 'offline' | 'busy' | 'closed';
export type PayoutStatus = 'pending' | 'approved' | 'paid' | 'on_hold' | 'rejected';
export type TicketPriority = 'p1' | 'p2' | 'p3' | 'p4';
export type TicketStatus = 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';

export interface SellerSummary {
  id: string;
  sellerCode: string;
  legalName: string;
  displayName: string;
  sellerType: SellerType;
  status: SellerStatus;
  riskLevel: RiskLevel;
  verified: boolean;
  payoutHold: boolean;
  regions: string[];
  cities: string[];
  storesCount: number;
  skuCount: number;
  gmv7d: number;
  gmv30d: number;
  orders7d: number;
  orders30d: number;
  ordersSuccess7d: number;
  cancellations7d: number;
  cancelRate7d: number;
  topCancelReason: string;
  stockOutRate: number;
  avgAcceptTime: number; // seconds
  assignedPvzCount: number;
  assignedPvzNames: string[];
  primaryPhone: string;
  primaryEmail: string;
  lastActivity: string;
  lastOrderDate: string;
  fulfillmentType: FulfillmentType;
  commissionRate: number;
  rating: number;
  createdAt: string;
}

export interface SellerDetail extends SellerSummary {
  primaryContactName: string;
  billingEmail: string;
  taxId: string;
  bankAccount: string;
  timezone: string;
  notesInternal: string;
  serviceAreas: string[];
  commissionPlanId: string;
  commissionPlanName: string;
  avgPrepTime: number;
  avgDeliveryTime: number;
  returnRate: number;
  disputeRate: number;
  slaComplianceRate: number;
  totalRevenue: number;
  platformEarnings: number;
  pendingPayouts: number;
}

export interface SellerStore {
  id: string;
  name: string;
  address: string;
  city: string;
  status: StoreStatus;
  workingHours: string;
  phone: string;
  ordersToday: number;
  avgPrepTime: number;
  rating: number;
  serviceZone: string;
  menuItems: StoreMenuItem[];
}

export interface StoreMenuItem {
  id: string;
  name: string;
  imageUrl: string;
  price: number;
  inStock: boolean;
}

export interface SellerProduct {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  imageUrl: string;
  availability: AvailabilityStatus;
  stock: number | null;
  sales7d: number;
  sales30d: number;
  revenue30d: number;
  conversion: number;
  margin: number | null;
  expiryDate?: string | null;      // ISO YYYY-MM-DD — for perishable goods
  hasExpiryTracking?: boolean;     // whether this SKU type requires expiry tracking
}

export interface SellerOrderProduct {
  name: string;
  imageUrl: string;
  price: number;
  qty: number;
}

export interface SellerOrder {
  id: string;
  orderCode: string;
  date: string;
  status: string;
  total: number;
  items: number;
  fulfillment: FulfillmentType;
  pvzName: string | null;
  slaStatus: 'ok' | 'warning' | 'breach';
  cancelReason: string | null;
  products?: SellerOrderProduct[];
}

export interface PvzLink {
  id: string;
  pvzCode: string;
  pvzName: string;
  city: string;
  priority: number;
  maxDaily: number;
  currentDaily: number;
  slaHours: number;
  status: 'active' | 'paused' | 'removed';
  linkedAt: string;
  inventory: PvzInventoryItem[];
}

export interface PvzInventoryItem {
  id: string;
  sku: string;
  name: string;
  imageUrl: string;
  qty: number;
  awaitingPickup: number;
}

export interface SellerPayout {
  id: string;
  payoutCode: string;
  period: string;
  amount: number;
  commission: number;
  netAmount: number;
  status: PayoutStatus;
  createdAt: string;
  paidAt: string | null;
  documentsCount: number;
}

export interface SellerTicket {
  id: string;
  ticketCode: string;
  subject: string;
  priority: TicketPriority;
  status: TicketStatus;
  category: string;
  createdAt: string;
  updatedAt: string;
  assignee: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'manager' | 'worker';
  status: 'active' | 'invited' | 'disabled';
  lastLogin: string | null;
  twoFactorEnabled: boolean;
  addedAt: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  ip: string;
}

export interface DemandMetric {
  date: string;
  views: number;
  addToCart: number;
  orders: number;
  revenue: number;
  cancels: number;
}

export interface TopProduct {
  name: string;
  category: string;
  imageUrl: string;
  revenue: number;
  orders: number;
  trend: number; // percent change
}

export interface QualityCaseAttachment {
  id: string;
  url: string;
  label: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface QualityCaseMessage {
  id: string;
  senderName: string;
  senderRole: 'customer' | 'operator' | 'merchant' | 'system';
  text: string;
  sentAt: string;
}

export interface QualityCaseRefund {
  id: string;
  amount: number;
  status: 'pending' | 'approved' | 'processed' | 'rejected';
  method: string;
  bankDetails?: string;
  requestedAt: string;
  processedAt?: string;
  approvedBy?: string;
  rejectReason?: string;
}

export interface QualityCase {
  id: string;
  caseCode: string;
  type: 'complaint' | 'return' | 'quality' | 'fraud' | 'sla_breach';
  subject: string;
  status: 'open' | 'investigating' | 'resolved' | 'escalated';
  priority: TicketPriority;
  createdAt: string;
  resolution: string | null;
  amount: number | null;
  attachments?: QualityCaseAttachment[];
  messages?: QualityCaseMessage[];
  refund?: QualityCaseRefund;
  assignedOperator?: { name: string; role: string };
  customerName?: string;
  customerPhone?: string;
  orderRef?: string;
}

// ─── Product analytics types ───────────────────────────────────────────────────

export interface ProductSalesTrend {
  date: string;
  sales: number;
  revenue: number;
  views: number;
  cartAdds: number;
}

export interface StoreProduct extends SellerProduct {
  ordersToday: number;
  revenueToday: number;
  storeId: string;
}

// --- Mock Data ---

import { PRODUCT_IMAGES } from './product-images';

export const SELLERS: SellerSummary[] = [
  {
    id: 'slr-001',
    sellerCode: 'SLR-001',
    legalName: 'ООО «ЭлектроМир»',
    displayName: 'ЭлектроМир',
    sellerType: 'retail',
    status: 'active',
    riskLevel: 'low',
    verified: true,
    payoutHold: false,
    regions: ['Центральный'],
    cities: ['Москва', 'Подольск'],
    storesCount: 4,
    skuCount: 2345,
    gmv7d: 1_856_400,
    gmv30d: 7_234_500,
    orders7d: 412,
    orders30d: 1_678,
    ordersSuccess7d: 398,
    cancellations7d: 14,
    cancelRate7d: 3.4,
    topCancelReason: 'Нет товара',
    stockOutRate: 2.1,
    avgAcceptTime: 45,
    assignedPvzCount: 3,
    assignedPvzNames: ['ПВЗ Тверская', 'ПВЗ Арбат', 'ПВЗ Бутово'],
    primaryPhone: '+7 (495) 111-22-33',
    primaryEmail: 'ops@elektromir.ru',
    lastActivity: '2026-02-19T14:32:00',
    lastOrderDate: '2026-02-19T14:15:00',
    fulfillmentType: 'pvz',
    commissionRate: 12,
    rating: 4.8,
    createdAt: '2024-06-15',
  },
  {
    id: 'slr-002',
    sellerCode: 'SLR-002',
    legalName: 'ИП Иванов А.С.',
    displayName: 'Вкусно и Быстро',
    sellerType: 'restaurant',
    status: 'active',
    riskLevel: 'low',
    verified: true,
    payoutHold: false,
    regions: ['Центральный'],
    cities: ['Москва'],
    storesCount: 2,
    skuCount: 89,
    gmv7d: 945_600,
    gmv30d: 3_678_900,
    orders7d: 834,
    orders30d: 3_456,
    ordersSuccess7d: 812,
    cancellations7d: 22,
    cancelRate7d: 2.6,
    topCancelReason: 'Нет ингредиентов',
    stockOutRate: 5.6,
    avgAcceptTime: 32,
    assignedPvzCount: 0,
    assignedPvzNames: [],
    primaryPhone: '+7 (495) 222-33-44',
    primaryEmail: 'info@vkusnobystro.ru',
    lastActivity: '2026-02-19T15:01:00',
    lastOrderDate: '2026-02-19T14:58:00',
    fulfillmentType: 'delivery',
    commissionRate: 18,
    rating: 4.9,
    createdAt: '2024-03-10',
  },
  {
    id: 'slr-003',
    sellerCode: 'SLR-003',
    legalName: 'ООО «ФрешМарт»',
    displayName: 'FreshMart',
    sellerType: 'darkstore',
    status: 'active',
    riskLevel: 'medium',
    verified: true,
    payoutHold: false,
    regions: ['Центральный', 'Северо-Западный'],
    cities: ['Москва', 'Санкт-Петербург'],
    storesCount: 6,
    skuCount: 4_567,
    gmv7d: 3_456_000,
    gmv30d: 14_230_000,
    orders7d: 2_345,
    orders30d: 9_876,
    ordersSuccess7d: 2_198,
    cancellations7d: 147,
    cancelRate7d: 6.3,
    topCancelReason: 'Просроченные товары',
    stockOutRate: 8.9,
    avgAcceptTime: 18,
    assignedPvzCount: 5,
    assignedPvzNames: ['ПВЗ Тверская', 'ПВЗ Невский', 'ПВЗ Арбат', 'ПВЗ Лубянка', 'ПВЗ Василеостровский'],
    primaryPhone: '+7 (495) 333-44-55',
    primaryEmail: 'support@freshmart.ru',
    lastActivity: '2026-02-19T15:10:00',
    lastOrderDate: '2026-02-19T15:08:00',
    fulfillmentType: 'delivery',
    commissionRate: 15,
    rating: 4.5,
    createdAt: '2024-01-20',
  },
  {
    id: 'slr-004',
    sellerCode: 'SLR-004',
    legalName: 'ООО «Кофемания Сеть»',
    displayName: 'Кофемания',
    sellerType: 'restaurant',
    status: 'paused',
    riskLevel: 'low',
    verified: true,
    payoutHold: false,
    regions: ['Центральный'],
    cities: ['Москва'],
    storesCount: 3,
    skuCount: 67,
    gmv7d: 0,
    gmv30d: 1_245_000,
    orders7d: 0,
    orders30d: 1_023,
    ordersSuccess7d: 0,
    cancellations7d: 0,
    cancelRate7d: 0,
    topCancelReason: '-',
    stockOutRate: 0,
    avgAcceptTime: 0,
    assignedPvzCount: 1,
    assignedPvzNames: ['ПВЗ Арбат'],
    primaryPhone: '+7 (495) 444-55-66',
    primaryEmail: 'admin@coffemania.ru',
    lastActivity: '2026-02-14T18:00:00',
    lastOrderDate: '2026-02-14T17:45:00',
    fulfillmentType: 'pickup',
    commissionRate: 20,
    rating: 4.7,
    createdAt: '2024-09-01',
  },
  {
    id: 'slr-005',
    sellerCode: 'SLR-005',
    legalName: 'ИП Петров К.В.',
    displayName: 'ТехноСток',
    sellerType: 'retail',
    status: 'blocked',
    riskLevel: 'high',
    verified: false,
    payoutHold: true,
    regions: ['Уральский'],
    cities: ['Екатеринбург'],
    storesCount: 1,
    skuCount: 456,
    gmv7d: 0,
    gmv30d: 234_500,
    orders7d: 0,
    orders30d: 87,
    ordersSuccess7d: 0,
    cancellations7d: 0,
    cancelRate7d: 14.2,
    topCancelReason: 'Подозрение на фрод',
    stockOutRate: 34.5,
    avgAcceptTime: 0,
    assignedPvzCount: 1,
    assignedPvzNames: ['ПВЗ Ленина'],
    primaryPhone: '+7 (343) 555-66-77',
    primaryEmail: 'info@technostock.ru',
    lastActivity: '2026-02-10T12:00:00',
    lastOrderDate: '2026-02-10T11:34:00',
    fulfillmentType: 'pvz',
    commissionRate: 12,
    rating: 3.2,
    createdAt: '2025-11-15',
  },
  {
    id: 'slr-006',
    sellerCode: 'SLR-006',
    legalName: 'ООО «МаркетПро»',
    displayName: 'MarketPro',
    sellerType: 'marketplace',
    status: 'active',
    riskLevel: 'low',
    verified: true,
    payoutHold: false,
    regions: ['Центральный', 'Северо-Западный', 'Уральский'],
    cities: ['Москва', 'Санкт-Петербург', 'Екатеринбург', 'Казань'],
    storesCount: 12,
    skuCount: 15_234,
    gmv7d: 8_456_000,
    gmv30d: 34_567_000,
    orders7d: 5_678,
    orders30d: 23_456,
    ordersSuccess7d: 5_534,
    cancellations7d: 144,
    cancelRate7d: 2.5,
    topCancelReason: 'Клиент передумал',
    stockOutRate: 1.2,
    avgAcceptTime: 12,
    assignedPvzCount: 8,
    assignedPvzNames: ['ПВЗ Тверская', 'ПВЗ Арбат', 'ПВЗ Невский', 'ПВЗ Ленина'],
    primaryPhone: '+7 (495) 666-77-88',
    primaryEmail: 'admin@marketpro.ru',
    lastActivity: '2026-02-19T15:12:00',
    lastOrderDate: '2026-02-19T15:11:00',
    fulfillmentType: 'pvz',
    commissionRate: 10,
    rating: 4.9,
    createdAt: '2023-08-01',
  },
  {
    id: 'slr-007',
    sellerCode: 'SLR-007',
    legalName: 'ООО «Суши Мастер»',
    displayName: 'Суши Мастер',
    sellerType: 'restaurant',
    status: 'pending',
    riskLevel: 'medium',
    verified: false,
    payoutHold: false,
    regions: ['Северо-Западный'],
    cities: ['Санкт-Петербург'],
    storesCount: 1,
    skuCount: 0,
    gmv7d: 0,
    gmv30d: 0,
    orders7d: 0,
    orders30d: 0,
    ordersSuccess7d: 0,
    cancellations7d: 0,
    cancelRate7d: 0,
    topCancelReason: '-',
    stockOutRate: 0,
    avgAcceptTime: 0,
    assignedPvzCount: 0,
    assignedPvzNames: [],
    primaryPhone: '+7 (812) 777-88-99',
    primaryEmail: 'apply@sushimaster.ru',
    lastActivity: '2026-02-18T10:00:00',
    lastOrderDate: '-',
    fulfillmentType: 'delivery',
    commissionRate: 18,
    rating: 0,
    createdAt: '2026-02-18',
  },
  {
    id: 'slr-008',
    sellerCode: 'SLR-008',
    legalName: 'ИП Сидорова М.А.',
    displayName: 'Цветочный Рай',
    sellerType: 'flowers',
    status: 'active',
    riskLevel: 'low',
    verified: true,
    payoutHold: false,
    regions: ['Центральный'],
    cities: ['Москва'],
    storesCount: 2,
    skuCount: 312,
    gmv7d: 567_000,
    gmv30d: 2_234_000,
    orders7d: 189,
    orders30d: 756,
    ordersSuccess7d: 184,
    cancellations7d: 5,
    cancelRate7d: 2.6,
    topCancelReason: 'Нет цветов',
    stockOutRate: 4.3,
    avgAcceptTime: 28,
    assignedPvzCount: 2,
    assignedPvzNames: ['ПВЗ Тверская', 'ПВЗ Лубянка'],
    primaryPhone: '+7 (495) 888-99-00',
    primaryEmail: 'orders@flowerparadise.ru',
    lastActivity: '2026-02-19T13:45:00',
    lastOrderDate: '2026-02-19T13:30:00',
    fulfillmentType: 'delivery',
    commissionRate: 14,
    rating: 4.6,
    createdAt: '2025-03-20',
  },
  {
    id: 'slr-009',
    sellerCode: 'SLR-009',
    legalName: 'ООО «КофеХаус»',
    displayName: 'КофеХаус',
    sellerType: 'cafe',
    status: 'active',
    riskLevel: 'low',
    verified: true,
    payoutHold: false,
    regions: ['Центральный'],
    cities: ['Москва'],
    storesCount: 5,
    skuCount: 74,
    gmv7d: 423_000,
    gmv30d: 1_678_000,
    orders7d: 934,
    orders30d: 3_789,
    ordersSuccess7d: 921,
    cancellations7d: 13,
    cancelRate7d: 1.4,
    topCancelReason: 'Занято место',
    stockOutRate: 0.8,
    avgAcceptTime: 15,
    assignedPvzCount: 0,
    assignedPvzNames: [],
    primaryPhone: '+7 (495) 100-20-30',
    primaryEmail: 'ops@coffeehouse.ru',
    lastActivity: '2026-02-19T16:10:00',
    lastOrderDate: '2026-02-19T16:05:00',
    fulfillmentType: 'delivery',
    commissionRate: 16,
    rating: 4.7,
    createdAt: '2024-04-01',
  },
  {
    id: 'slr-010',
    sellerCode: 'SLR-010',
    legalName: 'ООО «ПродМаркет»',
    displayName: 'ПродМаркет',
    sellerType: 'grocery',
    status: 'active',
    riskLevel: 'low',
    verified: true,
    payoutHold: false,
    regions: ['Центральный', 'Северо-Западный'],
    cities: ['Москва', 'Санкт-Петербург'],
    storesCount: 8,
    skuCount: 4_210,
    gmv7d: 2_345_000,
    gmv30d: 9_234_000,
    orders7d: 2_134,
    orders30d: 8_456,
    ordersSuccess7d: 2_098,
    cancellations7d: 36,
    cancelRate7d: 1.7,
    topCancelReason: 'Нет товара',
    stockOutRate: 3.1,
    avgAcceptTime: 20,
    assignedPvzCount: 4,
    assignedPvzNames: ['ПВЗ Арбат', 'ПВЗ Невский'],
    primaryPhone: '+7 (495) 200-30-40',
    primaryEmail: 'info@prodmarket.ru',
    lastActivity: '2026-02-19T15:55:00',
    lastOrderDate: '2026-02-19T15:50:00',
    fulfillmentType: 'delivery',
    commissionRate: 11,
    rating: 4.5,
    createdAt: '2023-11-10',
  },
  {
    id: 'slr-011',
    sellerCode: 'SLR-011',
    legalName: 'ИП Козлова Д.В.',
    displayName: 'Мир Подарков',
    sellerType: 'gifts',
    status: 'active',
    riskLevel: 'low',
    verified: true,
    payoutHold: false,
    regions: ['Центральный'],
    cities: ['Москва'],
    storesCount: 3,
    skuCount: 1_890,
    gmv7d: 678_000,
    gmv30d: 2_567_000,
    orders7d: 312,
    orders30d: 1_245,
    ordersSuccess7d: 308,
    cancellations7d: 4,
    cancelRate7d: 1.3,
    topCancelReason: 'Нет в наличии',
    stockOutRate: 2.9,
    avgAcceptTime: 35,
    assignedPvzCount: 2,
    assignedPvzNames: ['ПВЗ Тверская', 'ПВЗ Арбат'],
    primaryPhone: '+7 (495) 300-40-50',
    primaryEmail: 'orders@mirpodarkov.ru',
    lastActivity: '2026-02-19T14:20:00',
    lastOrderDate: '2026-02-19T14:15:00',
    fulfillmentType: 'pvz',
    commissionRate: 15,
    rating: 4.8,
    createdAt: '2025-01-15',
  },
  {
    id: 'slr-012',
    sellerCode: 'SLR-012',
    legalName: 'ООО «АвтоДетали Плюс»',
    displayName: 'АвтоДетали Плюс',
    sellerType: 'auto_parts',
    status: 'active',
    riskLevel: 'low',
    verified: true,
    payoutHold: false,
    regions: ['Центральный', 'Приволжский'],
    cities: ['Москва', 'Нижний Новгород'],
    storesCount: 4,
    skuCount: 12_450,
    gmv7d: 1_890_000,
    gmv30d: 7_345_000,
    orders7d: 567,
    orders30d: 2_234,
    ordersSuccess7d: 548,
    cancellations7d: 19,
    cancelRate7d: 3.4,
    topCancelReason: 'Ошибка в заказе',
    stockOutRate: 4.7,
    avgAcceptTime: 60,
    assignedPvzCount: 3,
    assignedPvzNames: ['ПВЗ Бутово', 'ПВЗ Тверская'],
    primaryPhone: '+7 (495) 400-50-60',
    primaryEmail: 'sales@autodetalplus.ru',
    lastActivity: '2026-02-19T13:30:00',
    lastOrderDate: '2026-02-19T13:20:00',
    fulfillmentType: 'pvz',
    commissionRate: 9,
    rating: 4.4,
    createdAt: '2024-02-28',
  },
  {
    id: 'slr-013',
    sellerCode: 'SLR-013',
    legalName: 'ООО «ФармаПоинт»',
    displayName: 'ФармаПоинт',
    sellerType: 'pharmacy',
    status: 'active',
    riskLevel: 'low',
    verified: true,
    payoutHold: false,
    regions: ['Центральный'],
    cities: ['Москва', 'Подольск'],
    storesCount: 6,
    skuCount: 3_560,
    gmv7d: 1_234_000,
    gmv30d: 4_890_000,
    orders7d: 1_023,
    orders30d: 4_120,
    ordersSuccess7d: 1_010,
    cancellations7d: 13,
    cancelRate7d: 1.3,
    topCancelReason: 'Нет рецепта',
    stockOutRate: 1.9,
    avgAcceptTime: 18,
    assignedPvzCount: 5,
    assignedPvzNames: ['ПВЗ Тверская', 'ПВЗ Арбат', 'ПВЗ Бутово'],
    primaryPhone: '+7 (495) 500-60-70',
    primaryEmail: 'pharmacy@farmapoint.ru',
    lastActivity: '2026-02-19T16:00:00',
    lastOrderDate: '2026-02-19T15:58:00',
    fulfillmentType: 'delivery',
    commissionRate: 8,
    rating: 4.9,
    createdAt: '2024-01-20',
  },
  {
    id: 'slr-014',
    sellerCode: 'SLR-014',
    legalName: 'ООО «МодаСтиль»',
    displayName: 'МодаСтиль',
    sellerType: 'clothing',
    status: 'active',
    riskLevel: 'medium',
    verified: true,
    payoutHold: false,
    regions: ['Центральный', 'Уральский'],
    cities: ['Москва', 'Екатеринбург'],
    storesCount: 3,
    skuCount: 5_670,
    gmv7d: 987_000,
    gmv30d: 3_890_000,
    orders7d: 423,
    orders30d: 1_678,
    ordersSuccess7d: 400,
    cancellations7d: 23,
    cancelRate7d: 5.4,
    topCancelReason: 'Размер не подошёл',
    stockOutRate: 6.8,
    avgAcceptTime: 90,
    assignedPvzCount: 2,
    assignedPvzNames: ['ПВЗ Арбат'],
    primaryPhone: '+7 (495) 600-70-80',
    primaryEmail: 'shop@modastyle.ru',
    lastActivity: '2026-02-19T12:30:00',
    lastOrderDate: '2026-02-19T12:25:00',
    fulfillmentType: 'pvz',
    commissionRate: 13,
    rating: 4.3,
    createdAt: '2024-09-05',
  },
  {
    id: 'slr-015',
    sellerCode: 'SLR-015',
    legalName: 'ИП Федорова К.С.',
    displayName: 'Булочная №1',
    sellerType: 'bakery',
    status: 'active',
    riskLevel: 'low',
    verified: true,
    payoutHold: false,
    regions: ['Центральный'],
    cities: ['Москва'],
    storesCount: 2,
    skuCount: 56,
    gmv7d: 234_000,
    gmv30d: 912_000,
    orders7d: 678,
    orders30d: 2_712,
    ordersSuccess7d: 669,
    cancellations7d: 9,
    cancelRate7d: 1.3,
    topCancelReason: 'Распродано',
    stockOutRate: 2.4,
    avgAcceptTime: 10,
    assignedPvzCount: 0,
    assignedPvzNames: [],
    primaryPhone: '+7 (495) 700-80-90',
    primaryEmail: 'order@bulochna1.ru',
    lastActivity: '2026-02-19T11:45:00',
    lastOrderDate: '2026-02-19T11:40:00',
    fulfillmentType: 'pickup',
    commissionRate: 18,
    rating: 4.9,
    createdAt: '2025-06-01',
  },
  {
    id: 'slr-016',
    sellerCode: 'SLR-016',
    legalName: 'ООО «БьютиЛюкс»',
    displayName: 'БьютиЛюкс',
    sellerType: 'beauty',
    status: 'paused',
    riskLevel: 'low',
    verified: true,
    payoutHold: false,
    regions: ['Центральный'],
    cities: ['Москва'],
    storesCount: 2,
    skuCount: 890,
    gmv7d: 0,
    gmv30d: 1_230_000,
    orders7d: 0,
    orders30d: 489,
    ordersSuccess7d: 0,
    cancellations7d: 0,
    cancelRate7d: 0,
    topCancelReason: '—',
    stockOutRate: 0,
    avgAcceptTime: 0,
    assignedPvzCount: 1,
    assignedPvzNames: ['ПВЗ Лубянка'],
    primaryPhone: '+7 (495) 800-90-10',
    primaryEmail: 'hello@beautylux.ru',
    lastActivity: '2026-02-10T09:00:00',
    lastOrderDate: '2026-02-10T08:55:00',
    fulfillmentType: 'delivery',
    commissionRate: 17,
    rating: 4.6,
    createdAt: '2025-04-12',
  },
];

// --- Detail mock data getters ---

export function getSellerDetail(id: string): SellerDetail {
  const summary = SELLERS.find(s => s.id === id) || SELLERS[0];
  return {
    ...summary,
    primaryContactName: 'Иванов Алексей Сергеевич',
    billingEmail: 'billing@' + summary.displayName.toLowerCase().replace(/\s+/g, '') + '.ru',
    taxId: '7707123456',
    bankAccount: 'BY20OLMP31350000001000000933',
    timezone: 'Europe/Moscow',
    notesInternal: summary.riskLevel === 'high' ? 'Подозрение в мошенничестве. Расследование #INV-2026-014 в процессе.' : '',
    serviceAreas: summary.cities,
    commissionPlanId: 'plan-' + summary.commissionRate,
    commissionPlanName: `Стандарт ${summary.commissionRate}%`,
    avgPrepTime: summary.sellerType === 'restaurant' ? 22 : 45,
    avgDeliveryTime: 38,
    returnRate: 1.8,
    disputeRate: 0.4,
    slaComplianceRate: 96.2,
    totalRevenue: summary.gmv30d * 6,
    platformEarnings: Math.round(summary.gmv30d * 6 * summary.commissionRate / 100),
    pendingPayouts: Math.round(summary.gmv30d * 0.3 * (100 - summary.commissionRate) / 100),
  };
}

export function getSellerStores(id: string): SellerStore[] {
  return [
    { id: 'st-1', name: 'Основной магазин', address: 'ул. Тверская, 15', city: 'Москва', status: 'online', workingHours: '09:00–21:00', phone: '+7 (495) 111-22-33', ordersToday: 34, avgPrepTime: 25, rating: 4.8, serviceZone: 'ЦАО', menuItems: [
      { id: 'mi-1', name: 'Телевизор Samsung 55"', imageUrl: PRODUCT_IMAGES['tv'], price: 54990, inStock: true },
      { id: 'mi-2', name: 'Смартфон iPhone 15', imageUrl: PRODUCT_IMAGES['iphone'], price: 89990, inStock: true },
      { id: 'mi-3', name: 'Ноутбук MacBook Air M3', imageUrl: PRODUCT_IMAGES['macbook'], price: 134990, inStock: false },
      { id: 'mi-4', name: 'Наушники AirPods Pro 2', imageUrl: PRODUCT_IMAGES['airpods'], price: 24990, inStock: true },
      { id: 'mi-5', name: 'Apple Watch Ultra 2', imageUrl: PRODUCT_IMAGES['watch'], price: 79990, inStock: true },
      { id: 'mi-6', name: 'Зарядное устройство MagSafe', imageUrl: PRODUCT_IMAGES['magsafe'], price: 4990, inStock: true },
      { id: 'mi-7', name: 'iPad Pro 12.9"', imageUrl: PRODUCT_IMAGES['ipad'], price: 109990, inStock: false },
      { id: 'mi-8', name: 'JBL Charge 5', imageUrl: PRODUCT_IMAGES['jbl'], price: 12990, inStock: true },
    ] },
    { id: 'st-2', name: 'Филиал Юг', address: 'ул. Профсоюзная, 78', city: 'Москва', status: 'online', workingHours: '10:00–22:00', phone: '+7 (495) 111-22-34', ordersToday: 28, avgPrepTime: 30, rating: 4.6, serviceZone: 'ЮЗАО', menuItems: [
      { id: 'mi-9', name: 'Смартфон iPhone 15', imageUrl: PRODUCT_IMAGES['iphone'], price: 89990, inStock: true },
      { id: 'mi-10', name: 'Наушники AirPods Pro 2', imageUrl: PRODUCT_IMAGES['airpods'], price: 24990, inStock: true },
      { id: 'mi-11', name: 'Apple Watch Ultra 2', imageUrl: PRODUCT_IMAGES['watch'], price: 79990, inStock: true },
    ] },
    { id: 'st-3', name: 'Филиал Подольск', address: 'пр. Ленина, 12', city: 'Подольск', status: 'offline', workingHours: '10:00–20:00', phone: '+7 (496) 333-44-55', ordersToday: 0, avgPrepTime: 0, rating: 4.5, serviceZone: 'Подольск', menuItems: [
      { id: 'mi-12', name: 'Телевизор Samsung 55"', imageUrl: PRODUCT_IMAGES['tv'], price: 54990, inStock: true },
      { id: 'mi-13', name: 'Зарядное устройство MagSafe', imageUrl: PRODUCT_IMAGES['magsafe'], price: 4990, inStock: false },
    ] },
    { id: 'st-4', name: 'Экспресс-точка', address: 'ТЦ Метрополис, 3 этаж', city: 'Москва', status: 'busy', workingHours: '10:00–22:00', phone: '+7 (495) 111-22-35', ordersToday: 56, avgPrepTime: 18, rating: 4.9, serviceZone: 'САО', menuItems: [
      { id: 'mi-14', name: 'Смартфон iPhone 15', imageUrl: PRODUCT_IMAGES['iphone'], price: 89990, inStock: true },
      { id: 'mi-15', name: 'Наушники AirPods Pro 2', imageUrl: PRODUCT_IMAGES['airpods'], price: 24990, inStock: true },
      { id: 'mi-16', name: 'JBL Charge 5', imageUrl: PRODUCT_IMAGES['jbl'], price: 12990, inStock: true },
      { id: 'mi-17', name: 'Зарядное устройство MagSafe', imageUrl: PRODUCT_IMAGES['magsafe'], price: 4990, inStock: true },
    ] },
  ];
}

export function getSellerProducts(id: string): SellerProduct[] {
  // ── Flower shop — perishable goods with expiry tracking (today = 2026-03-07) ──
  if (id === 'slr-008') {
    return [
      { id: 'fl-001', sku: 'FLW-RS-001', name: 'Розы красные 25 шт.', category: 'Розы', price: 3490, imageUrl: PRODUCT_IMAGES['roses_red'], availability: 'available', stock: 18, sales7d: 34, sales30d: 112, revenue30d: 390_880, conversion: 6.2, margin: 38, expiryDate: '2026-03-07', hasExpiryTracking: true },
      { id: 'fl-002', sku: 'FLW-RS-002', name: 'Розы микс 51 шт.', category: 'Розы', price: 6990, imageUrl: PRODUCT_IMAGES['roses'], availability: 'available', stock: 12, sales7d: 21, sales30d: 78, revenue30d: 545_220, conversion: 5.4, margin: 40, expiryDate: '2026-03-09', hasExpiryTracking: true },
      { id: 'fl-003', sku: 'FLW-TL-001', name: 'Тюльпаны 15 шт.', category: 'Тюльпаны', price: 1890, imageUrl: PRODUCT_IMAGES['tulips'], availability: 'available', stock: 45, sales7d: 67, sales30d: 234, revenue30d: 442_260, conversion: 9.1, margin: 42, expiryDate: '2026-03-10', hasExpiryTracking: true },
      { id: 'fl-004', sku: 'FLW-TL-002', name: 'Тюльпаны микс 25 шт.', category: 'Тюльпаны', price: 2990, imageUrl: PRODUCT_IMAGES['tulips_mix'], availability: 'available', stock: 30, sales7d: 45, sales30d: 167, revenue30d: 499_330, conversion: 7.8, margin: 41, expiryDate: '2026-03-10', hasExpiryTracking: true },
      { id: 'fl-005', sku: 'FLW-OR-001', name: 'Орхидея в горшке', category: 'Орхидеи', price: 2490, imageUrl: PRODUCT_IMAGES['orchid'], availability: 'available', stock: 8, sales7d: 12, sales30d: 43, revenue30d: 107_070, conversion: 3.4, margin: 35, expiryDate: '2026-03-17', hasExpiryTracking: true },
      { id: 'fl-006', sku: 'FLW-PN-001', name: 'Пионы 9 шт.', category: 'Пионы', price: 4590, imageUrl: PRODUCT_IMAGES['peony'], availability: 'available', stock: 6, sales7d: 9, sales30d: 32, revenue30d: 146_880, conversion: 4.2, margin: 36, expiryDate: '2026-03-14', hasExpiryTracking: true },
      { id: 'fl-007', sku: 'FLW-CH-001', name: 'Хризантемы 15 шт.', category: 'Хризантемы', price: 2190, imageUrl: PRODUCT_IMAGES['chrysanthemum'], availability: 'available', stock: 22, sales7d: 18, sales30d: 64, revenue30d: 140_160, conversion: 5.8, margin: 39, expiryDate: '2026-03-12', hasExpiryTracking: true },
      { id: 'fl-008', sku: 'FLW-LI-001', name: 'Лилии белые 7 шт.', category: 'Лилии', price: 3290, imageUrl: PRODUCT_IMAGES['lily'], availability: 'available', stock: 14, sales7d: 16, sales30d: 55, revenue30d: 180_950, conversion: 4.9, margin: 37, expiryDate: '2026-03-13', hasExpiryTracking: true },
      { id: 'fl-009', sku: 'FLW-SF-001', name: 'Подсолнухи 11 шт.', category: 'Подсолнухи', price: 2690, imageUrl: PRODUCT_IMAGES['sunflower'], availability: 'available', stock: 35, sales7d: 28, sales30d: 98, revenue30d: 263_620, conversion: 6.7, margin: 43, expiryDate: '2026-03-08', hasExpiryTracking: true },
      { id: 'fl-010', sku: 'FLW-LV-001', name: 'Лаванда 30 стеблей', category: 'Лаванда', price: 1590, imageUrl: PRODUCT_IMAGES['lavender'], availability: 'available', stock: 40, sales7d: 23, sales30d: 84, revenue30d: 133_560, conversion: 7.3, margin: 44, expiryDate: '2026-03-19', hasExpiryTracking: true },
      { id: 'fl-011', sku: 'FLW-BQ-001', name: 'Авторский букет «Весна»', category: 'Авторские букеты', price: 8990, imageUrl: PRODUCT_IMAGES['peony'], availability: 'available', stock: 5, sales7d: 8, sales30d: 29, revenue30d: 260_710, conversion: 2.8, margin: 45, expiryDate: '2026-03-09', hasExpiryTracking: true },
      { id: 'fl-012', sku: 'FLW-BQ-002', name: 'Букет «День рождения»', category: 'Авторские букеты', price: 5490, imageUrl: PRODUCT_IMAGES['roses_red'], availability: 'sold_out_today', stock: 0, sales7d: 11, sales30d: 41, revenue30d: 225_090, conversion: 3.9, margin: 42, expiryDate: null, hasExpiryTracking: false },
    ];
  }

  // ── Default electronics products ──
  return [
    { id: 'p-1', sku: 'ELM-TV-001', name: 'Телевизор Samsung 55"', category: 'Электроника', price: 54990, imageUrl: PRODUCT_IMAGES['tv'], availability: 'available', stock: 23, sales7d: 12, sales30d: 45, revenue30d: 2_474_550, conversion: 3.2, margin: 18 },
    { id: 'p-2', sku: 'ELM-PH-002', name: 'Смартфон iPhone 15', category: 'Смартфоны', price: 89990, imageUrl: PRODUCT_IMAGES['iphone'], availability: 'available', stock: 8, sales7d: 6, sales30d: 24, revenue30d: 2_159_760, conversion: 4.5, margin: 12 },
    { id: 'p-3', sku: 'ELM-LP-003', name: 'Ноутбук MacBook Air M3', category: 'Ноутбуки', price: 134990, imageUrl: PRODUCT_IMAGES['macbook'], availability: 'sold_out_today', stock: 0, sales7d: 3, sales30d: 11, revenue30d: 1_484_890, conversion: 2.8, margin: 10 },
    { id: 'p-4', sku: 'ELM-HP-004', name: 'Наушники AirPods Pro 2', category: 'Аксессуары', price: 24990, imageUrl: PRODUCT_IMAGES['airpods'], availability: 'available', stock: 45, sales7d: 18, sales30d: 72, revenue30d: 1_799_280, conversion: 5.1, margin: 22 },
    { id: 'p-5', sku: 'ELM-WA-005', name: 'Apple Watch Ultra 2', category: 'Умные часы', price: 79990, imageUrl: PRODUCT_IMAGES['watch'], availability: 'available', stock: 5, sales7d: 4, sales30d: 15, revenue30d: 1_199_850, conversion: 2.1, margin: 14 },
    { id: 'p-6', sku: 'ELM-CH-006', name: 'Зарядное устройство MagSafe', category: 'Аксессуары', price: 4990, imageUrl: PRODUCT_IMAGES['magsafe'], availability: 'available', stock: 120, sales7d: 34, sales30d: 134, revenue30d: 668_660, conversion: 8.7, margin: 35 },
    { id: 'p-7', sku: 'ELM-TB-007', name: 'iPad Pro 12.9"', category: 'Планшеты', price: 109990, imageUrl: PRODUCT_IMAGES['ipad'], availability: 'sold_out_indefinitely', stock: 0, sales7d: 0, sales30d: 5, revenue30d: 549_950, conversion: 1.2, margin: 11 },
    { id: 'p-8', sku: 'ELM-SP-008', name: 'JBL Charge 5', category: 'Аудио', price: 12990, imageUrl: PRODUCT_IMAGES['jbl'], availability: 'hidden', stock: 3, sales7d: 0, sales30d: 8, revenue30d: 103_920, conversion: 1.8, margin: 25 },
  ];
}

export function getSellerOrders(_id: string): SellerOrder[] {
  return [
    { id: 'o-1', orderCode: 'ORD-2026-4521', date: '2026-02-19T14:15:00', status: 'delivered', total: 54990, items: 1, fulfillment: 'pvz', pvzName: 'ПВЗ Тверская', slaStatus: 'ok', cancelReason: null,
      products: [{ name: 'Наушники AirPods Pro 2', imageUrl: PRODUCT_IMAGES['airpods'], price: 54990, qty: 1 }] },
    { id: 'o-2', orderCode: 'ORD-2026-4520', date: '2026-02-19T13:42:00', status: 'in_transit', total: 89990, items: 1, fulfillment: 'delivery', pvzName: null, slaStatus: 'ok', cancelReason: null,
      products: [{ name: 'Смартфон iPhone 15', imageUrl: PRODUCT_IMAGES['iphone'], price: 89990, qty: 1 }] },
    { id: 'o-3', orderCode: 'ORD-2026-4519', date: '2026-02-19T12:30:00', status: 'preparing', total: 29980, items: 2, fulfillment: 'pvz', pvzName: 'ПВЗ Арбат', slaStatus: 'warning', cancelReason: null,
      products: [
        { name: 'Зарядное MagSafe', imageUrl: PRODUCT_IMAGES['magsafe'], price: 9990, qty: 1 },
        { name: 'JBL Charge 5', imageUrl: PRODUCT_IMAGES['jbl'], price: 19990, qty: 1 },
      ] },
    { id: 'o-4', orderCode: 'ORD-2026-4518', date: '2026-02-19T11:15:00', status: 'delivered', total: 159980, items: 2, fulfillment: 'pvz', pvzName: 'ПВЗ Тверская', slaStatus: 'ok', cancelReason: null,
      products: [
        { name: 'Ноутбук MacBook Air M3', imageUrl: PRODUCT_IMAGES['macbook'], price: 139990, qty: 1 },
        { name: 'Apple Watch Ultra 2', imageUrl: PRODUCT_IMAGES['watch'], price: 19990, qty: 1 },
      ] },
    { id: 'o-5', orderCode: 'ORD-2026-4517', date: '2026-02-19T10:00:00', status: 'cancelled', total: 134990, items: 1, fulfillment: 'delivery', pvzName: null, slaStatus: 'breach', cancelReason: 'Нет товара на складе',
      products: [{ name: 'Ноутбук MacBook Air M3', imageUrl: PRODUCT_IMAGES['macbook'], price: 134990, qty: 1 }] },
    { id: 'o-6', orderCode: 'ORD-2026-4516', date: '2026-02-18T18:30:00', status: 'delivered', total: 24990, items: 1, fulfillment: 'pickup', pvzName: null, slaStatus: 'ok', cancelReason: null,
      products: [{ name: 'Наушники AirPods Pro 2', imageUrl: PRODUCT_IMAGES['airpods'], price: 24990, qty: 1 }] },
    { id: 'o-7', orderCode: 'ORD-2026-4515', date: '2026-02-18T16:00:00', status: 'returned', total: 79990, items: 1, fulfillment: 'pvz', pvzName: 'ПВЗ Бутово', slaStatus: 'ok', cancelReason: 'Товар не соответствует описанию',
      products: [{ name: 'Apple Watch Ultra 2', imageUrl: PRODUCT_IMAGES['watch'], price: 79990, qty: 1 }] },
    { id: 'o-8', orderCode: 'ORD-2026-4514', date: '2026-02-18T14:00:00', status: 'delivered', total: 4990, items: 1, fulfillment: 'pvz', pvzName: 'ПВЗ Тверская', slaStatus: 'ok', cancelReason: null,
      products: [{ name: 'Зарядное MagSafe', imageUrl: PRODUCT_IMAGES['charger'], price: 4990, qty: 1 }] },
  ];
}

export function getSellerPvzLinks(_id: string): PvzLink[] {
  return [
    { id: 'pl-1', pvzCode: 'MSK-001', pvzName: 'ПВЗ Тверская', city: 'Москва', priority: 1, maxDaily: 100, currentDaily: 34, slaHours: 24, status: 'active', linkedAt: '2024-07-01', inventory: [
      { id: 'inv-1', sku: 'ELM-TV-001', name: 'Телевизор Samsung 55"', imageUrl: PRODUCT_IMAGES['tv'], qty: 23, awaitingPickup: 0 },
      { id: 'inv-2', sku: 'ELM-PH-002', name: 'Смартфон iPhone 15', imageUrl: PRODUCT_IMAGES['iphone'], qty: 8, awaitingPickup: 0 },
      { id: 'inv-3', sku: 'ELM-LP-003', name: 'Ноутбук MacBook Air M3', imageUrl: PRODUCT_IMAGES['macbook'], qty: 0, awaitingPickup: 0 },
      { id: 'inv-4', sku: 'ELM-HP-004', name: 'Наушники AirPods Pro 2', imageUrl: PRODUCT_IMAGES['airpods'], qty: 45, awaitingPickup: 0 },
      { id: 'inv-5', sku: 'ELM-WA-005', name: 'Apple Watch Ultra 2', imageUrl: PRODUCT_IMAGES['watch'], qty: 5, awaitingPickup: 0 },
      { id: 'inv-6', sku: 'ELM-CH-006', name: 'Зарядное устройство MagSafe', imageUrl: PRODUCT_IMAGES['magsafe'], qty: 120, awaitingPickup: 0 },
      { id: 'inv-7', sku: 'ELM-TB-007', name: 'iPad Pro 12.9"', imageUrl: PRODUCT_IMAGES['ipad'], qty: 0, awaitingPickup: 0 },
      { id: 'inv-8', sku: 'ELM-SP-008', name: 'JBL Charge 5', imageUrl: PRODUCT_IMAGES['jbl'], qty: 3, awaitingPickup: 0 },
    ] },
    { id: 'pl-2', pvzCode: 'MSK-002', pvzName: 'ПВЗ Арбат', city: 'Москва', priority: 2, maxDaily: 80, currentDaily: 28, slaHours: 24, status: 'active', linkedAt: '2024-07-15', inventory: [
      { id: 'inv-9', sku: 'ELM-PH-002', name: 'Смартфон iPhone 15', imageUrl: PRODUCT_IMAGES['iphone'], qty: 5, awaitingPickup: 2 },
      { id: 'inv-10', sku: 'ELM-HP-004', name: 'Наушники AirPods Pro 2', imageUrl: PRODUCT_IMAGES['airpods'], qty: 18, awaitingPickup: 3 },
      { id: 'inv-11', sku: 'ELM-CH-006', name: 'Зарядное устройство MagSafe', imageUrl: PRODUCT_IMAGES['magsafe'], qty: 42, awaitingPickup: 1 },
    ] },
    { id: 'pl-3', pvzCode: 'MSK-005', pvzName: 'ПВЗ Бутово', city: 'Москва', priority: 3, maxDaily: 50, currentDaily: 12, slaHours: 48, status: 'active', linkedAt: '2025-01-10', inventory: [
      { id: 'inv-12', sku: 'ELM-WA-005', name: 'Apple Watch Ultra 2', imageUrl: PRODUCT_IMAGES['watch'], qty: 3, awaitingPickup: 1 },
      { id: 'inv-13', sku: 'ELM-SP-008', name: 'JBL Charge 5', imageUrl: PRODUCT_IMAGES['jbl'], qty: 7, awaitingPickup: 0 },
    ] },
    { id: 'pl-4', pvzCode: 'MSK-003', pvzName: 'ПВЗ Лубянка', city: 'Москва', priority: 4, maxDaily: 60, currentDaily: 0, slaHours: 24, status: 'paused', linkedAt: '2024-08-20', inventory: [] },
  ];
}

export function getSellerPayouts(_id: string): SellerPayout[] {
  return [
    { id: 'pay-1', payoutCode: 'PAY-2026-0219', period: '12–18 фев 2026', amount: 1_856_400, commission: 222_768, netAmount: 1_633_632, status: 'pending', createdAt: '2026-02-19', paidAt: null, documentsCount: 3 },
    { id: 'pay-2', payoutCode: 'PAY-2026-0212', period: '5–11 фев 2026', amount: 1_723_000, commission: 206_760, netAmount: 1_516_240, status: 'approved', createdAt: '2026-02-12', paidAt: null, documentsCount: 3 },
    { id: 'pay-3', payoutCode: 'PAY-2026-0205', period: '29 янв – 4 фев 2026', amount: 1_934_200, commission: 232_104, netAmount: 1_702_096, status: 'paid', createdAt: '2026-02-05', paidAt: '2026-02-07', documentsCount: 4 },
    { id: 'pay-4', payoutCode: 'PAY-2026-0129', period: '22–28 янв 2026', amount: 1_567_800, commission: 188_136, netAmount: 1_379_664, status: 'paid', createdAt: '2026-01-29', paidAt: '2026-01-31', documentsCount: 4 },
    { id: 'pay-5', payoutCode: 'PAY-2026-0122', period: '15–21 янв 2026', amount: 1_845_600, commission: 221_472, netAmount: 1_624_128, status: 'paid', createdAt: '2026-01-22', paidAt: '2026-01-24', documentsCount: 4 },
  ];
}

export function getSellerTickets(_id: string): SellerTicket[] {
  return [
    { id: 'tk-1', ticketCode: 'TKT-2026-089', subject: 'Задержка доставки партии на ПВЗ Тверская', priority: 'p2', status: 'in_progress', category: 'Логистика', createdAt: '2026-02-19T10:00:00', updatedAt: '2026-02-19T14:00:00', assignee: 'Петров И.' },
    { id: 'tk-2', ticketCode: 'TKT-2026-087', subject: 'Расхождение в инвентаризации', priority: 'p3', status: 'open', category: 'Операции', createdAt: '2026-02-18T16:00:00', updatedAt: '2026-02-18T16:00:00', assignee: 'Не назначен' },
    { id: 'tk-3', ticketCode: 'TKT-2026-082', subject: 'Запрос на изменение комиссии', priority: 'p4', status: 'resolved', category: 'Финансы', createdAt: '2026-02-15T09:00:00', updatedAt: '2026-02-17T11:00:00', assignee: 'Козлова Н.' },
  ];
}

export function getTeamMembers(_id: string): TeamMember[] {
  return [
    { id: 'tm-1', name: 'Иванов Алексей', email: 'a.ivanov@elektromir.ru', role: 'owner', status: 'active', lastLogin: '2026-02-19T14:30:00', twoFactorEnabled: true, addedAt: '2024-06-15' },
    { id: 'tm-2', name: 'Смирнова Елена', email: 'e.smirnova@elektromir.ru', role: 'manager', status: 'active', lastLogin: '2026-02-19T12:00:00', twoFactorEnabled: true, addedAt: '2024-07-01' },
    { id: 'tm-3', name: 'Козлов Дмитрий', email: 'd.kozlov@elektromir.ru', role: 'worker', status: 'active', lastLogin: '2026-02-18T18:00:00', twoFactorEnabled: false, addedAt: '2025-01-15' },
    { id: 'tm-4', name: 'Новикова Анна', email: 'a.novikova@elektromir.ru', role: 'worker', status: 'invited', lastLogin: null, twoFactorEnabled: false, addedAt: '2026-02-17' },
  ];
}

export function getAuditEntries(_id: string): AuditEntry[] {
  return [
    { id: 'a-1', timestamp: '2026-02-19T14:32:00', actor: 'Смирнова Е.', actorRole: 'manager', action: 'product.price_changed', entity: 'Product', entityId: 'ELM-TV-001', details: 'Цена: 52 990 → 54 990 ₽', ip: '195.24.xxx.xxx' },
    { id: 'a-2', timestamp: '2026-02-19T12:15:00', actor: 'Система', actorRole: 'system', action: 'product.availability_changed', entity: 'Product', entityId: 'ELM-LP-003', details: 'available → sold_out_today (остаток = 0)', ip: '-' },
    { id: 'a-3', timestamp: '2026-02-19T10:00:00', actor: 'Петров И.', actorRole: 'support', action: 'ticket.created', entity: 'Ticket', entityId: 'TKT-2026-089', details: 'Задержка доставки партии на ПВЗ Тверская', ip: '10.0.xxx.xxx' },
    { id: 'a-4', timestamp: '2026-02-18T18:00:00', actor: 'Иванов А.', actorRole: 'owner', action: 'store.status_changed', entity: 'Store', entityId: 'st-3', details: 'online → offline (причина: ремонт)', ip: '85.31.xxx.xxx' },
    { id: 'a-5', timestamp: '2026-02-18T16:00:00', actor: 'Козлова Н.', actorRole: 'admin', action: 'seller.note_added', entity: 'Seller', entityId: 'slr-001', details: 'Добавлена внутренняя заметка', ip: '10.0.xxx.xxx' },
    { id: 'a-6', timestamp: '2026-02-17T14:00:00', actor: 'Иванов А.', actorRole: 'owner', action: 'team.user_invited', entity: 'TeamMember', entityId: 'tm-4', details: 'Приглашена Новикова Анна (worker)', ip: '85.31.xxx.xxx' },
    { id: 'a-7', timestamp: '2026-02-15T11:00:00', actor: 'Финансовый отдел', actorRole: 'finance', action: 'payout.approved', entity: 'Payout', entityId: 'PAY-2026-0205', details: 'Выплата 1 702 096 ₽ утверждена', ip: '10.0.xxx.xxx' },
    { id: 'a-8', timestamp: '2026-02-14T09:00:00', actor: 'Система', actorRole: 'system', action: 'export.generated', entity: 'Export', entityId: 'EXP-001', details: 'Экспорт KPI за 30 дней (XLSX)', ip: '-' },
  ];
}

export function getDemandMetrics(_id: string): DemandMetric[] {
  const base = [
    { date: '13 фев', views: 3450, addToCart: 890, orders: 234, revenue: 1_234_000, cancels: 8 },
    { date: '14 фев', views: 4120, addToCart: 1100, orders: 312, revenue: 1_856_000, cancels: 12 },
    { date: '15 фев', views: 3890, addToCart: 980, orders: 278, revenue: 1_567_000, cancels: 6 },
    { date: '16 фев', views: 3200, addToCart: 820, orders: 245, revenue: 1_345_000, cancels: 9 },
    { date: '17 фев', views: 4560, addToCart: 1200, orders: 345, revenue: 1_987_000, cancels: 11 },
    { date: '18 фев', views: 4890, addToCart: 1350, orders: 389, revenue: 2_234_000, cancels: 14 },
    { date: '19 фев', views: 5120, addToCart: 1420, orders: 412, revenue: 1_856_400, cancels: 14 },
  ];
  return base;
}

export function getTopProducts(_id: string): TopProduct[] {
  return [
    { name: 'Телевизор Samsung 55"', category: 'Электроника', imageUrl: PRODUCT_IMAGES['tv'], revenue: 2_474_550, orders: 45, trend: 12.3 },
    { name: 'Смартфон iPhone 15', category: 'Смартфоны', imageUrl: PRODUCT_IMAGES['iphone'], revenue: 2_159_760, orders: 24, trend: 8.5 },
    { name: 'Наушники AirPods Pro 2', category: 'Аксессуары', imageUrl: PRODUCT_IMAGES['airpods'], revenue: 1_799_280, orders: 72, trend: 15.2 },
    { name: 'Ноутбук MacBook Air M3', category: 'Ноутбуки', imageUrl: PRODUCT_IMAGES['macbook'], revenue: 1_484_890, orders: 11, trend: -3.1 },
    { name: 'Apple Watch Ultra 2', category: 'Умные часы', imageUrl: PRODUCT_IMAGES['watch'], revenue: 1_199_850, orders: 15, trend: 5.7 },
  ];
}

export function getQualityCases(_id: string): QualityCase[] {
  return [
    {
      id: 'qc-1', caseCode: 'QC-2026-041', type: 'complaint',
      subject: 'Товар не соответствует описанию (ORD-2026-4515)',
      status: 'investigating', priority: 'p2', createdAt: '2026-02-18T16:00:00', resolution: null, amount: 79990,
      orderRef: 'ORD-2026-4515', customerName: 'Сергей Михайлов', customerPhone: '+7 (925) 441-12-90',
      assignedOperator: { name: 'Анна Соколова', role: 'Старший оператор QC' },
      refund: {
        id: 'ref-1', amount: 79990, status: 'pending',
        method: 'Оригинальный способ оплаты', bankDetails: 'Банковская карта •••• 7731',
        requestedAt: '2026-02-18T17:00:00',
      },
      attachments: [
        { id: 'att-1a', url: 'https://images.unsplash.com/photo-1631856952982-7db18c2bdca4?w=800&h=600&fit=crop', label: 'Фото от покупателя — не тот товар', uploadedAt: '2026-02-18T16:45:00', uploadedBy: 'Покупатель' },
        { id: 'att-1b', url: 'https://images.unsplash.com/photo-1560340841-eefc7aa04432?w=800&h=600&fit=crop', label: 'Фото коробки при получении', uploadedAt: '2026-02-18T16:47:00', uploadedBy: 'Покупатель' },
      ],
      messages: [
        { id: 'm1-1', senderName: 'Сергей Михайлов', senderRole: 'customer', text: 'Добрый день! Получил заказ ORD-2026-4515, но товар полностью не соответствует описанию. Заказывал наушники TWS Pro, а пришли обычные проводные. Требую возврат ₽79 990.', sentAt: '2026-02-18T16:00:00' },
        { id: 'm1-2', senderName: 'Система', senderRole: 'system', text: 'Кейс QC-2026-041 открыт. Назначен оператор: Анна Соколова.', sentAt: '2026-02-18T16:05:00' },
        { id: 'm1-3', senderName: 'Анна Соколова', senderRole: 'operator', text: 'Здравствуйте, Сергей! Ваша жалоба принята в обработку. Мы начали расследование. Прикрепите, пожалуйста, фотографии полученного товара — это ускорит рассмотрение.', sentAt: '2026-02-18T16:15:00' },
        { id: 'm1-4', senderName: 'Сергей Михайлов', senderRole: 'customer', text: 'Прикрепил 2 фотографии. На фото видно: нет маркировки TWS Pro, коробка другого цвета, внутри обычная гарнитура с проводом.', sentAt: '2026-02-18T16:47:00' },
        { id: 'm1-5', senderName: 'Магазин Электроники', senderRole: 'merchant', text: 'Добрый день. Проверили комплектацию. Произошла пересортица при сборке заказа — оператор склада допустил ошибку. Готовы урегулировать.', sentAt: '2026-02-19T09:00:00' },
        { id: 'm1-6', senderName: 'Анна Соколова', senderRole: 'operator', text: 'Продавец подтвердил ошибку. Запрос на возврат ₽79 990 передан в финансовый отдел. Ожидайте решение в течение 1–2 рабочих дней.', sentAt: '2026-02-19T10:30:00' },
      ],
    },
    {
      id: 'qc-2', caseCode: 'QC-2026-038', type: 'return',
      subject: 'Возврат повреждённого товара (ORD-2026-4498)',
      status: 'resolved', priority: 'p3', createdAt: '2026-02-16T10:00:00', resolution: 'Полный возврат средств', amount: 24990,
      orderRef: 'ORD-2026-4498', customerName: 'Елена Романова', customerPhone: '+7 (916) 882-33-44',
      assignedOperator: { name: 'Дмитрий Орлов', role: 'Оператор QC' },
      refund: {
        id: 'ref-2', amount: 24990, status: 'processed',
        method: 'Банковская карта', bankDetails: 'Банковская карта •••• 4523',
        requestedAt: '2026-02-16T10:45:00',
        processedAt: '2026-02-16T15:00:00',
        approvedBy: 'Дмитрий Орлов',
      },
      attachments: [
        { id: 'att-2a', url: 'https://images.unsplash.com/photo-1742463413520-2037d86df1d7?w=800&h=600&fit=crop', label: 'Повреждение при доставке', uploadedAt: '2026-02-16T10:30:00', uploadedBy: 'Покупатель' },
        { id: 'att-2b', url: 'https://images.unsplash.com/photo-1612576409873-ce53b7f3d21d?w=800&h=600&fit=crop', label: 'Упаковка вскрыта', uploadedAt: '2026-02-16T10:32:00', uploadedBy: 'Покупатель' },
        { id: 'att-2c', url: 'https://images.unsplash.com/photo-1560340841-eefc7aa04432?w=800&h=600&fit=crop', label: 'Акт возврата — скан', uploadedAt: '2026-02-16T14:00:00', uploadedBy: 'Оператор QC' },
      ],
      messages: [
        { id: 'm2-1', senderName: 'Елена Романова', senderRole: 'customer', text: 'Получила посылку в повреждённом виде. Упаковка вскрыта, товар поцарапан. Хочу оформить возврат на ₽24 990.', sentAt: '2026-02-16T10:00:00' },
        { id: 'm2-2', senderName: 'Система', senderRole: 'system', text: 'Кейс QC-2026-038 открыт. Назначен оператор: Дмитрий Орлов.', sentAt: '2026-02-16T10:02:00' },
        { id: 'm2-3', senderName: 'Дмитрий Орлов', senderRole: 'operator', text: 'Здравствуйте, Елена! Жалоба зарегистрирована. Для оформления возврата прикрепите фотографии повреждений и упаковки.', sentAt: '2026-02-16T10:20:00' },
        { id: 'm2-4', senderName: 'Елена Романова', senderRole: 'customer', text: 'Прикрепила 2 фото: видно что коробка вскрыта по периметру, на товаре царапины вдоль корпуса.', sentAt: '2026-02-16T10:32:00' },
        { id: 'm2-5', senderName: 'Дмитрий Орлов', senderRole: 'operator', text: 'Фотографии получены. Повреждения при транспортировке подтверждены. Оформляю полный возврат ₽24 990 на вашу карту.', sentAt: '2026-02-16T11:00:00' },
        { id: 'm2-6', senderName: 'Система', senderRole: 'system', text: 'Возврат одобрен оператором Дмитрий Орлов. Сумма: ₽24 990. Передан в обработку.', sentAt: '2026-02-16T11:05:00' },
        { id: 'm2-7', senderName: 'Система', senderRole: 'system', text: 'Возврат обработан. Средства ₽24 990 зачислены на карту •••• 4523. Ожидайте 1–3 рабочих дня. Кейс закрыт.', sentAt: '2026-02-16T15:00:00' },
      ],
    },
    {
      id: 'qc-3', caseCode: 'QC-2026-035', type: 'sla_breach',
      subject: 'Превышение SLA подготовки 3 заказов подряд',
      status: 'resolved', priority: 'p3', createdAt: '2026-02-14T14:00:00', resolution: 'Предупреждение, штраф не назначен', amount: null,
      assignedOperator: { name: 'Иван Петров', role: 'Оператор QC' },
      attachments: [],
      messages: [
        { id: 'm3-1', senderName: 'Система', senderRole: 'system', text: 'Автоматически зафиксировано нарушение SLA: 3 заказа подряд превысили лимит 30 минут. Средняя задержка — 52 мин. Кейс QC-2026-035 открыт.', sentAt: '2026-02-14T14:00:00' },
        { id: 'm3-2', senderName: 'Иван Петров', senderRole: 'operator', text: 'Кейс принят. Связался с магазином для выяснения причин задержки.', sentAt: '2026-02-14T14:30:00' },
        { id: 'm3-3', senderName: 'Магазин Электроники', senderRole: 'merchant', text: 'В этот день у нас были технические проблемы с принтером чеков — пришлось оформлять вручную. Приносим извинения, проблема устранена.', sentAt: '2026-02-14T15:00:00' },
        { id: 'm3-4', senderName: 'Иван Петров', senderRole: 'operator', text: 'Магазин предоставил объяснение. Штраф не назначается — первичное нарушение. Вынесено официальное предупреждение. Кейс закрывается.', sentAt: '2026-02-14T16:00:00' },
        { id: 'm3-5', senderName: 'Система', senderRole: 'system', text: 'Статус изменён на «Решён». Предупреждение зафиксировано в профиле продавца.', sentAt: '2026-02-14T16:00:00' },
      ],
    },
    {
      id: 'qc-4', caseCode: 'QC-2026-029', type: 'quality',
      subject: 'Систематические жалобы на упаковку (5 случаев за неделю)',
      status: 'open', priority: 'p2', createdAt: '2026-02-12T09:00:00', resolution: null, amount: null,
      assignedOperator: { name: 'Мария Кузнецова', role: 'Аналитик QA' },
      attachments: [
        { id: 'att-4a', url: 'https://images.unsplash.com/photo-1612576409873-ce53b7f3d21d?w=800&h=600&fit=crop', label: 'Пример плохой упаковки #1', uploadedAt: '2026-02-12T09:15:00', uploadedBy: 'Оператор QC' },
      ],
      messages: [
        { id: 'm4-1', senderName: 'Система', senderRole: 'system', text: 'Паттерн-аналитика: зафиксировано 5 жалоб на качество упаковки за 7 дней (08–12 февраля). Автоматически открыт кейс QC-2026-029.', sentAt: '2026-02-12T09:00:00' },
        { id: 'm4-2', senderName: 'Мария Кузнецова', senderRole: 'operator', text: 'Кейс принят в работу. Анализирую паттерн жалоб. Отправила продавцу запрос на аудит процесса упаковки и предоставление фотоотчёта.', sentAt: '2026-02-12T09:30:00' },
        { id: 'm4-3', senderName: 'Магазин Электроники', senderRole: 'merchant', text: 'Запрос получили. Проведём внутреннюю проверку процесса упаковки. Ответим в течение 48 часов.', sentAt: '2026-02-12T11:00:00' },
      ],
    },
  ];
}

// Helper formatters
export function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `₽${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `₽${(value / 1_000).toFixed(0)}K`;
  return `₽${value.toLocaleString('ru-RU')}`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString('ru-RU');
}

export function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}с`;
  return `${Math.floor(seconds / 60)}м ${seconds % 60}с`;
}

export function getStatusConfig(status: SellerStatus) {
  const map: Record<SellerStatus, { label: string; color: string; bg: string }> = {
    active: { label: 'Активен', color: 'text-green-700', bg: 'bg-green-100' },
    paused: { label: 'Пауза', color: 'text-orange-700', bg: 'bg-orange-100' },
    blocked: { label: 'Заблокирован', color: 'text-red-700', bg: 'bg-red-100' },
    pending: { label: 'На проверке', color: 'text-blue-700', bg: 'bg-blue-100' },
    on_hold: { label: 'Холд выплат', color: 'text-purple-700', bg: 'bg-purple-100' },
  };
  return map[status];
}

export function getRiskConfig(risk: RiskLevel) {
  const map: Record<RiskLevel, { label: string; color: string; bg: string }> = {
    low: { label: 'Низкий', color: 'text-green-700', bg: 'bg-green-50' },
    medium: { label: 'Средний', color: 'text-yellow-700', bg: 'bg-yellow-50' },
    high: { label: 'Высокий', color: 'text-red-700', bg: 'bg-red-50' },
  };
  return map[risk];
}

export function getTypeLabel(type: SellerType): string {
  const map: Record<SellerType, string> = {
    restaurant:  'Ресторан',
    retail:      'Ритейл',
    darkstore:   'Дарк-стор',
    marketplace: 'Маркетплейс',
    cafe:        'Кафе',
    grocery:     'Продукты',
    gifts:       'Подарки',
    auto_parts:  'Запчасти',
    pharmacy:    'Аптека',
    electronics: 'Электроника',
    clothing:    'Одежда',
    flowers:     'Цветы',
    bakery:      'Выпечка',
    beauty:      'Красота',
  };
  return map[type] ?? type;
}

export function getFulfillmentLabel(type: FulfillmentType): string {
  const map: Record<FulfillmentType, string> = {
    delivery: 'Доставка',
    pickup: 'Самовывоз',
    pvz: 'ПВЗ',
    self_delivery: 'Свой курьер',
  };
  return map[type];
}

export function getProductSalesTrend(productId: string): ProductSalesTrend[] {
  const TRENDS: Record<string, ProductSalesTrend[]> = {
    'p-1': [
      { date: '13 фев', sales: 6, revenue: 329940, views: 234, cartAdds: 18 },
      { date: '14 фев', sales: 8, revenue: 439920, views: 312, cartAdds: 24 },
      { date: '15 фев', sales: 5, revenue: 274950, views: 278, cartAdds: 15 },
      { date: '16 фев', sales: 7, revenue: 384930, views: 245, cartAdds: 20 },
      { date: '17 фев', sales: 9, revenue: 494910, views: 345, cartAdds: 28 },
      { date: '18 фев', sales: 10, revenue: 549900, views: 389, cartAdds: 32 },
      { date: '19 фев', sales: 12, revenue: 659880, views: 412, cartAdds: 38 },
    ],
    'p-2': [
      { date: '13 фев', sales: 3, revenue: 269970, views: 180, cartAdds: 12 },
      { date: '14 фев', sales: 4, revenue: 359960, views: 220, cartAdds: 16 },
      { date: '15 фев', sales: 3, revenue: 269970, views: 195, cartAdds: 11 },
      { date: '16 фев', sales: 2, revenue: 179980, views: 160, cartAdds: 9 },
      { date: '17 фев', sales: 5, revenue: 449950, views: 240, cartAdds: 19 },
      { date: '18 фев', sales: 6, revenue: 539940, views: 280, cartAdds: 22 },
      { date: '19 фев', sales: 6, revenue: 539940, views: 298, cartAdds: 24 },
    ],
    'p-3': [
      { date: '13 фев', sales: 2, revenue: 269980, views: 145, cartAdds: 8 },
      { date: '14 фев', sales: 2, revenue: 269980, views: 167, cartAdds: 9 },
      { date: '15 фев', sales: 1, revenue: 134990, views: 134, cartAdds: 5 },
      { date: '16 фев', sales: 2, revenue: 269980, views: 122, cartAdds: 7 },
      { date: '17 фев', sales: 3, revenue: 404970, views: 156, cartAdds: 11 },
      { date: '18 фев', sales: 1, revenue: 134990, views: 140, cartAdds: 6 },
      { date: '19 фев', sales: 0, revenue: 0, views: 98, cartAdds: 3 },
    ],
    'p-4': [
      { date: '13 фев', sales: 10, revenue: 249900, views: 445, cartAdds: 56 },
      { date: '14 фев', sales: 12, revenue: 299880, views: 512, cartAdds: 68 },
      { date: '15 фев', sales: 9, revenue: 224910, views: 478, cartAdds: 52 },
      { date: '16 фев', sales: 8, revenue: 199920, views: 398, cartAdds: 45 },
      { date: '17 фев', sales: 14, revenue: 349860, views: 567, cartAdds: 78 },
      { date: '18 фев', sales: 16, revenue: 399840, views: 623, cartAdds: 89 },
      { date: '19 фев', sales: 18, revenue: 449820, views: 678, cartAdds: 95 },
    ],
    'p-5': [
      { date: '13 фев', sales: 2, revenue: 159980, views: 198, cartAdds: 9 },
      { date: '14 фев', sales: 3, revenue: 239970, views: 245, cartAdds: 14 },
      { date: '15 фев', sales: 2, revenue: 159980, views: 212, cartAdds: 10 },
      { date: '16 фев', sales: 1, revenue: 79990, views: 178, cartAdds: 7 },
      { date: '17 фев', sales: 3, revenue: 239970, views: 256, cartAdds: 13 },
      { date: '18 фев', sales: 4, revenue: 319960, views: 289, cartAdds: 17 },
      { date: '19 фев', sales: 4, revenue: 319960, views: 312, cartAdds: 18 },
    ],
    'p-6': [
      { date: '13 фев', sales: 18, revenue: 89820, views: 678, cartAdds: 89 },
      { date: '14 фев', sales: 22, revenue: 109780, views: 789, cartAdds: 112 },
      { date: '15 фев', sales: 16, revenue: 79840, views: 645, cartAdds: 78 },
      { date: '16 фев', sales: 14, revenue: 69860, views: 598, cartAdds: 67 },
      { date: '17 фев', sales: 24, revenue: 119760, views: 834, cartAdds: 134 },
      { date: '18 фев', sales: 28, revenue: 139720, views: 912, cartAdds: 145 },
      { date: '19 фев', sales: 34, revenue: 169660, views: 978, cartAdds: 167 },
    ],
    'p-7': [
      { date: '13 фев', sales: 1, revenue: 109990, views: 89, cartAdds: 4 },
      { date: '14 фев', sales: 1, revenue: 109990, views: 102, cartAdds: 5 },
      { date: '15 фев', sales: 1, revenue: 109990, views: 95, cartAdds: 4 },
      { date: '16 фев', sales: 1, revenue: 109990, views: 78, cartAdds: 3 },
      { date: '17 фев', sales: 1, revenue: 109990, views: 98, cartAdds: 5 },
      { date: '18 фев', sales: 0, revenue: 0, views: 67, cartAdds: 2 },
      { date: '19 фев', sales: 0, revenue: 0, views: 45, cartAdds: 1 },
    ],
    'p-8': [
      { date: '13 фев', sales: 1, revenue: 12990, views: 112, cartAdds: 6 },
      { date: '14 фев', sales: 2, revenue: 25980, views: 145, cartAdds: 9 },
      { date: '15 фев', sales: 1, revenue: 12990, views: 134, cartAdds: 7 },
      { date: '16 фев', sales: 1, revenue: 12990, views: 98, cartAdds: 5 },
      { date: '17 фев', sales: 2, revenue: 25980, views: 156, cartAdds: 10 },
      { date: '18 фев', sales: 1, revenue: 12990, views: 134, cartAdds: 6 },
      { date: '19 фев', sales: 0, revenue: 0, views: 89, cartAdds: 3 },
    ],
  };
  if (TRENDS[productId]) return TRENDS[productId];
  // generic fallback — deterministic from productId hash
  const seed = productId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const dates = ['13 фев', '14 фев', '15 фев', '16 фев', '17 фев', '18 фев', '19 фев'];
  return dates.map((date, i) => ({
    date,
    sales: Math.max(1, ((seed + i * 7) % 15)),
    revenue: Math.max(50000, ((seed + i * 13) % 400000) + 30000),
    views: Math.max(80, ((seed + i * 11) % 500) + 50),
    cartAdds: Math.max(5, ((seed + i * 5) % 60) + 5),
  }));
}

export function getStoreProducts(storeId: string, sellerId: string): StoreProduct[] {
  const stores = getSellerStores(sellerId);
  const store = stores.find(s => s.id === storeId);
  const allProducts = getSellerProducts(sellerId);
  if (!store || store.menuItems.length === 0) return [];

  const storeDayStats: Record<string, number> = {
    'st-1': 34, 'st-2': 28, 'st-3': 0, 'st-4': 56,
  };
  const todayOrders = storeDayStats[storeId] ?? 10;

  return store.menuItems.map((item, idx) => {
    const matched = allProducts.find(p => p.name === item.name);
    const share = (idx % 4 === 0) ? 0.18 : (idx % 3 === 0) ? 0.14 : (idx % 2 === 0) ? 0.10 : 0.08;
    const ordersToday = item.inStock ? Math.max(0, Math.round(todayOrders * share * (1 + (idx % 3) * 0.2))) : 0;
    return {
      id: matched?.id ?? `sp-${storeId}-${idx}`,
      sku: matched?.sku ?? `SKU-${storeId.toUpperCase()}-${String(idx + 1).padStart(3, '0')}`,
      name: item.name,
      category: matched?.category ?? 'Разное',
      price: item.price,
      imageUrl: item.imageUrl,
      availability: item.inStock ? 'available' : (idx % 3 === 0 ? 'sold_out_today' : 'sold_out_indefinitely'),
      stock: matched?.stock ?? (item.inStock ? (idx + 1) * 7 : 0),
      sales7d: matched?.sales7d ?? (item.inStock ? (idx + 1) * 3 : 0),
      sales30d: matched?.sales30d ?? (item.inStock ? (idx + 1) * 11 : 0),
      revenue30d: matched?.revenue30d ?? item.price * (item.inStock ? (idx + 1) * 8 : 0),
      conversion: matched?.conversion ?? parseFloat((2.5 + (idx % 5) * 0.8).toFixed(1)),
      margin: matched?.margin ?? (12 + (idx % 6) * 3),
      ordersToday,
      revenueToday: ordersToday * item.price,
      storeId,
    } as StoreProduct;
  });
}