/**
 * Foreign Paid Local Delivery — single mock data layer.
 *
 *  Types:
 *    Company, ForeignOrder, SettlementCard, LocalFulfillment, LocalSeller,
 *    SellerSettlement, Supplier, SupplierInvoice, IntercompanyDebt,
 *    SetoffRecord, ForeignDoc, AuditEntry, ForeignSettings.
 *
 *  Each kind has a small mutable in-memory store + helper functions.
 *  Pages keep their own React state for UI but fall back to these
 *  arrays as the source of truth so cross-page navigation stays
 *  consistent (same pattern as products-mock.ts in earlier batches).
 *
 *  Calculations live in `calcSettlement()` so every page that needs
 *  totals uses the same formulas.
 *
 *  This file is intentionally framework-free (no React) so it can be
 *  picked up later by a real backend / API contract.
 */

// ─── Companies ────────────────────────────────────────────────────────────────

export type CompanyRole =
  | 'payment_receiver'
  | 'local_fulfiller'
  | 'supplier'
  | 'service_provider'
  | 'platform_owner';

export interface Company {
  companyId:    string;
  name:         string;
  country:      string;
  currency:     string;     // ISO-4217: PLN / TMT / USD / EUR / TRY / CNY
  role:         CompanyRole;
  bankDetails:  string;     // mock: "PKO BP · IBAN PL00…"
  taxId:        string;     // mock: "PL5252000123"
  status:       'active' | 'inactive' | 'pending';
}

export const COMPANIES: Company[] = [
  { companyId: 'c-pl',  name: 'PVZ Platform Poland Sp. z o.o.', country: 'Польша',         currency: 'PLN', role: 'payment_receiver', bankDetails: 'PKO BP · IBAN PL00 1020 0…', taxId: 'PL5252000123', status: 'active' },
  { companyId: 'c-tm',  name: 'PVZ Turkmen LLC',                country: 'Туркменистан',   currency: 'TMT', role: 'local_fulfiller',  bankDetails: 'TKM Bank · 0040…',           taxId: 'TM-1010-2025',  status: 'active' },
  { companyId: 'c-tm2', name: 'Ashgabat Local Service',         country: 'Туркменистан',   currency: 'TMT', role: 'service_provider', bankDetails: 'TKM Bank · 0078…',           taxId: 'TM-1240-2025',  status: 'active' },
  { companyId: 'c-cn',  name: 'Yiwu Trading Co.',               country: 'Китай',          currency: 'CNY', role: 'supplier',         bankDetails: 'ICBC · 6228 4810 …',         taxId: 'CN91330782…',   status: 'active' },
  { companyId: 'c-tr',  name: 'Istanbul Wholesale',             country: 'Турция',         currency: 'TRY', role: 'supplier',         bankDetails: 'Garanti BBVA · TR21…',       taxId: 'TR4520123456',   status: 'active' },
  { companyId: 'c-eu',  name: 'EU Goods GmbH',                  country: 'Германия',       currency: 'EUR', role: 'supplier',         bankDetails: 'Deutsche Bank · DE89…',      taxId: 'DE12345678901',  status: 'active' },
  { companyId: 'c-platform', name: 'PVZ Platform (Owner)',      country: 'Польша',         currency: 'PLN', role: 'platform_owner',   bankDetails: '—',                          taxId: '—',               status: 'active' },
];

export function getCompany(id: string): Company | undefined {
  return COMPANIES.find(c => c.companyId === id);
}

// ─── Local sellers ────────────────────────────────────────────────────────────

export type SellerType =
  | 'shop' | 'cafe' | 'flower_shop' | 'warehouse' | 'private_supplier' | 'other';

export const SELLER_TYPE_LABELS: Record<SellerType, string> = {
  shop:             'Магазин',
  cafe:             'Кафе',
  flower_shop:      'Цветочный магазин',
  warehouse:        'Склад',
  private_supplier: 'Частный поставщик',
  other:            'Другой',
};

export type SellerStatus = 'active' | 'inactive' | 'pending_verification' | 'blocked';
export type ContractState = 'has' | 'missing' | 'pending';

export interface LocalSeller {
  sellerId:     string;
  name:         string;
  type:         SellerType;
  contactName:  string;
  phone:        string;
  address:      string;
  status:       SellerStatus;
  contract:     ContractState;
  rating:       number;       // 0..5
  qualityScore: number;       // 0..100
  ordersCount:  number;
  totalDue:     number;       // TMT
  totalPaid:    number;       // TMT
  outstanding:  number;       // TMT
  documents:    string[];     // doc ids
  notes?:       string;
  createdAt:    string;
}

export const LOCAL_SELLERS: LocalSeller[] = [
  { sellerId: 's-001', name: 'Магазин «Берекет»',     type: 'shop',             contactName: 'Аман Г.',      phone: '+993 12 444-001', address: 'Ашхабад, ул. Магтымгулы 14',     status: 'active',  contract: 'has',     rating: 4.7, qualityScore: 92, ordersCount: 142, totalDue: 28_400, totalPaid: 25_400, outstanding: 3_000, documents: ['doc-001'], createdAt: '01.01.2026' },
  { sellerId: 's-002', name: 'Цветочный «Гулистан»',  type: 'flower_shop',      contactName: 'Огулджемал М.', phone: '+993 12 444-002', address: 'Ашхабад, проспект Сапармурата 22', status: 'active',  contract: 'has',     rating: 4.9, qualityScore: 96, ordersCount: 56,  totalDue: 14_280, totalPaid: 12_000, outstanding: 2_280, documents: ['doc-002'], createdAt: '15.01.2026' },
  { sellerId: 's-003', name: 'Кафе «Дессерт»',        type: 'cafe',             contactName: 'Сердар Б.',    phone: '+993 12 444-003', address: 'Ашхабад, ул. Атамырата 7',       status: 'active',  contract: 'has',     rating: 4.5, qualityScore: 88, ordersCount: 88,  totalDue: 19_700, totalPaid: 19_700, outstanding: 0,     documents: ['doc-003'], createdAt: '01.02.2026' },
  { sellerId: 's-004', name: 'Электро-склад MSK',      type: 'warehouse',        contactName: 'Махтумкули Р.', phone: '+993 12 444-004', address: 'Ашхабад, ул. Туркменбаши 3',     status: 'active',  contract: 'has',     rating: 4.3, qualityScore: 85, ordersCount: 23,  totalDue: 86_400, totalPaid: 70_000, outstanding: 16_400, documents: [],          createdAt: '10.02.2026' },
  { sellerId: 's-005', name: 'Частный поставщик «А.Тачмурадов»', type: 'private_supplier', contactName: 'А. Тачмурадов', phone: '+993 12 444-005', address: 'Дашогуз, ул. Гарагум 18', status: 'pending_verification', contract: 'pending', rating: 0,   qualityScore: 0,  ordersCount: 4,   totalDue: 4_200,  totalPaid: 0,      outstanding: 4_200, documents: [],          createdAt: '13.02.2026' },
];

// ─── Suppliers ────────────────────────────────────────────────────────────────

export type SupplierKind =
  | 'local_supplier' | 'foreign_supplier' | 'marketplace'
  | 'manufacturer'   | 'wholesaler';

export const SUPPLIER_KIND_LABELS: Record<SupplierKind, string> = {
  local_supplier:    'Локальный',
  foreign_supplier:  'Зарубежный',
  marketplace:       'Маркетплейс',
  manufacturer:      'Производитель',
  wholesaler:        'Оптовик',
};

export type SupplierStatus = 'active' | 'inactive' | 'pending';

export interface Supplier {
  supplierId:   string;
  name:         string;
  country:      string;
  kind:         SupplierKind;
  contact:      string;
  phone:        string;
  email:        string;
  address:      string;
  currency:     string;
  bankDetails:  string;
  taxId:        string;
  status:       SupplierStatus;
  ordersCount:  number;
  outstanding:  number;       // in supplier currency
  documents:    string[];
  notes?:       string;
}

export const SUPPLIERS: Supplier[] = [
  { supplierId: 'sup-001', name: 'Yiwu Trading Co.',        country: 'Китай',        kind: 'wholesaler',       contact: 'Mr Wang',     phone: '+86 579 8550 0001', email: 'orders@yiwu-trading.cn',  address: 'Yiwu, Zhejiang',         currency: 'CNY', bankDetails: 'ICBC · 6228 4810 …',     taxId: 'CN91330782…',   status: 'active',  ordersCount: 14, outstanding: 24_800, documents: ['doc-101'] },
  { supplierId: 'sup-002', name: 'Istanbul Wholesale',      country: 'Турция',       kind: 'foreign_supplier', contact: 'Ali Yıldız',  phone: '+90 212 555 11 22', email: 'sales@istwholesale.tr',  address: 'Istanbul, Laleli',       currency: 'TRY', bankDetails: 'Garanti BBVA · TR21…',   taxId: 'TR4520123456',  status: 'active',  ordersCount: 8,  outstanding: 12_400, documents: ['doc-102'] },
  { supplierId: 'sup-003', name: 'EU Goods GmbH',           country: 'Германия',     kind: 'manufacturer',     contact: 'Hans Weber',  phone: '+49 30 1234 5678',  email: 'eu@eugoods.de',           address: 'Berlin, Mitte',          currency: 'EUR', bankDetails: 'Deutsche Bank · DE89…',  taxId: 'DE12345678901', status: 'active',  ordersCount: 4,  outstanding: 1_840,  documents: [] },
  { supplierId: 'sup-004', name: 'TMT-Goods (Дашогуз)',     country: 'Туркменистан', kind: 'local_supplier',   contact: 'Тагы Б.',     phone: '+993 12 555-001',   email: 'tmt-goods@tm.com',        address: 'Дашогуз, ул. Гарагум 18', currency: 'TMT', bankDetails: 'TKM Bank · 0021…',       taxId: 'TM-2010-2025',  status: 'active',  ordersCount: 11, outstanding: 6_200,  documents: ['doc-103'] },
  { supplierId: 'sup-005', name: 'Ali Express Bulk',        country: 'Китай',        kind: 'marketplace',      contact: 'Auto-bot',    phone: '—',                  email: 'bulk@aliexpress.cn',     address: 'Hangzhou',                currency: 'CNY', bankDetails: '—',                       taxId: '—',              status: 'pending', ordersCount: 1,  outstanding: 480,    documents: [] },
];

// ─── Settlement Card / Foreign Order ──────────────────────────────────────────

export type ForeignOrderType = 'foreign_paid_local_delivery';

export type PaymentStatus =
  | 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, { label: string; cls: string }> = {
  pending:            { label: 'Ожидает',            cls: 'bg-yellow-100 text-yellow-700' },
  paid:               { label: 'Оплачено',           cls: 'bg-green-100 text-green-700'   },
  failed:             { label: 'Ошибка',             cls: 'bg-red-100 text-red-700'       },
  refunded:           { label: 'Возврат полный',     cls: 'bg-rose-100 text-rose-700'     },
  partially_refunded: { label: 'Возврат частичный',  cls: 'bg-orange-100 text-orange-700' },
};

export type FulfillmentStatus =
  | 'new' | 'accepted' | 'product_prepared' | 'packed'
  | 'handed_to_courier' | 'delivered' | 'cancelled' | 'returned';

export const FULFILLMENT_STATUS_LABELS: Record<FulfillmentStatus, { label: string; cls: string }> = {
  new:               { label: 'Новый',                  cls: 'bg-slate-100 text-slate-700' },
  accepted:          { label: 'Принят',                 cls: 'bg-blue-100 text-blue-700'   },
  product_prepared:  { label: 'Товар куплен',           cls: 'bg-indigo-100 text-indigo-700' },
  packed:            { label: 'Упаковано',              cls: 'bg-purple-100 text-purple-700' },
  handed_to_courier: { label: 'Передан курьеру',        cls: 'bg-orange-100 text-orange-700' },
  delivered:         { label: 'Доставлен',              cls: 'bg-green-100 text-green-700'  },
  cancelled:         { label: 'Отменён',                cls: 'bg-gray-200 text-gray-700'    },
  returned:          { label: 'Возврат',                cls: 'bg-rose-100 text-rose-700'    },
};

export type SettlementStatus =
  | 'open' | 'under_review' | 'partially_settled' | 'settled' | 'disputed' | 'cancelled';

export const SETTLEMENT_STATUS_LABELS: Record<SettlementStatus, { label: string; cls: string }> = {
  open:              { label: 'Открыто',           cls: 'bg-blue-100 text-blue-700'    },
  under_review:      { label: 'На проверке',       cls: 'bg-yellow-100 text-yellow-700' },
  partially_settled: { label: 'Частично закрыто',  cls: 'bg-purple-100 text-purple-700' },
  settled:           { label: 'Закрыто',           cls: 'bg-green-100 text-green-700'   },
  disputed:          { label: 'Спор',              cls: 'bg-orange-100 text-orange-700' },
  cancelled:         { label: 'Отменено',          cls: 'bg-gray-100 text-gray-600'     },
};

export interface OrderItem {
  productName:   string;
  qty:           number;
  categoryName:  string;
  photoEmoji:    string;
  unitCost:      number;       // local TMT
}

export interface AuditEntry {
  at:     string;
  actor:  string;
  role:   string;
  action: string;
}

export interface ForeignOrder {
  orderId:           string;
  type:              ForeignOrderType;
  createdAt:         string;
  // Customer
  customerCountry:   string;
  customerName:      string;
  customerEmail:     string;
  customerPhone:     string;
  // Payment (received by Poland)
  paymentCurrency:   string;
  paymentAmount:     number;
  paymentProvider:   string;       // Stripe / PayU / Przelewy24 / PayPal
  paymentProviderFee:number;       // in payment currency
  refundAmount:      number;       // in payment currency
  paymentStatus:     PaymentStatus;
  // Recipient (in Turkmenistan)
  recipientName:     string;
  recipientPhone:    string;
  recipientAddress:  string;
  deliveryNote?:     string;
  // Items
  items:             OrderItem[];
  // Local fulfillment partners
  localSellerId?:    string;
  supplierId?:       string;
  // Costs (TMT)
  localProductCost:        number;
  localDeliveryCost:       number;
  packagingCost:           number;
  turkmenCommission:       number;
  additionalExpenses:      number;
  supplierProductCost:     number;
  supplierDeliveryCost:    number;
  supplierServiceFee:      number;
  supplierDiscounts:       number;
  supplierRefunds:         number;
  // Settlement state
  alreadySettled:    number;
  setoffAmount:      number;
  paidToTurkmen:     number;
  // Status
  fulfillment:       FulfillmentStatus;
  settlement:        SettlementStatus;
  // Documents
  documents:         string[];     // doc ids
  reviewedBy?:       string;
  closedBy?:         string;
  // Audit
  audit:             AuditEntry[];
}

export interface SettlementTotals {
  totalLocalFulfillmentCost: number;
  amountPolandOwesTurkmen:   number;
  supplierPayable:           number;
  polandMargin:              number;
  remainingDebt:             number;
}

/**
 * Pure formula. Returns all derived totals for one foreign order.
 * Currency: every cost field is assumed to already be in the same
 * currency (TMT for local sums; supplier sums are converted at the
 * configured exchange rate before being passed in).
 */
export function calcSettlement(o: ForeignOrder): SettlementTotals {
  const totalLocalFulfillmentCost =
      o.localProductCost
    + o.localDeliveryCost
    + o.packagingCost
    + o.turkmenCommission
    + o.additionalExpenses;

  const amountPolandOwesTurkmen = totalLocalFulfillmentCost;

  const supplierPayable =
      o.supplierProductCost
    + o.supplierDeliveryCost
    + o.supplierServiceFee
    - o.supplierDiscounts
    - o.supplierRefunds;

  const polandMargin =
      o.paymentAmount
    - o.paymentProviderFee
    - o.refundAmount
    - totalLocalFulfillmentCost
    - supplierPayable;

  const remainingDebt =
      amountPolandOwesTurkmen + supplierPayable
    - o.alreadySettled - o.setoffAmount - o.paidToTurkmen;

  return {
    totalLocalFulfillmentCost,
    amountPolandOwesTurkmen,
    supplierPayable,
    polandMargin,
    remainingDebt,
  };
}

// ─── Mock orders ──────────────────────────────────────────────────────────────

const auditNow = (action: string, actor = 'Супер Админ', role = 'SuperAdmin'): AuditEntry => ({
  at: new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
  actor, role, action,
});

export const FOREIGN_ORDERS: ForeignOrder[] = [
  {
    orderId: 'FD-2026-001', type: 'foreign_paid_local_delivery',
    createdAt: '14.02.2026 09:12',
    customerCountry: 'Польша', customerName: 'Anna Kowalska',  customerEmail: 'anna.kowalska@gmail.com', customerPhone: '+48 600 111 222',
    paymentCurrency: 'PLN', paymentAmount: 580, paymentProvider: 'Stripe', paymentProviderFee: 17.40, refundAmount: 0, paymentStatus: 'paid',
    recipientName: 'Айна Курбанова', recipientPhone: '+993 12 444-321', recipientAddress: 'Ашхабад, проспект Махтумкули 22, кв 14', deliveryNote: 'Подъезд 2, домофон 14',
    items: [{ productName: 'Букет «21 роза»', qty: 1, categoryName: 'Цветы', photoEmoji: '💐', unitCost: 240 }],
    localSellerId: 's-002', supplierId: undefined,
    localProductCost: 240, localDeliveryCost: 60, packagingCost: 25, turkmenCommission: 80, additionalExpenses: 0,
    supplierProductCost: 0, supplierDeliveryCost: 0, supplierServiceFee: 0, supplierDiscounts: 0, supplierRefunds: 0,
    alreadySettled: 0, setoffAmount: 0, paidToTurkmen: 0,
    fulfillment: 'delivered', settlement: 'under_review',
    documents: ['doc-1001', 'doc-1002'],
    audit: [
      { at: '14.02.2026 09:12', actor: 'Система',         role: 'system',     action: 'Заказ автоматически отмечен как foreign_paid_local_delivery' },
      { at: '14.02.2026 09:30', actor: 'Карпова А.',      role: 'TurkmenistanOperator', action: 'Назначен продавец: Цветочный «Гулистан»' },
      { at: '14.02.2026 10:15', actor: 'Аман Г.',         role: 'LocalCourier', action: 'Заказ доставлен' },
    ],
  },
  {
    orderId: 'FD-2026-002', type: 'foreign_paid_local_delivery',
    createdAt: '14.02.2026 11:40',
    customerCountry: 'Германия', customerName: 'Maximilian Schäfer', customerEmail: 'max.s@gmx.de', customerPhone: '+49 170 8888 555',
    paymentCurrency: 'EUR', paymentAmount: 240, paymentProvider: 'Stripe', paymentProviderFee: 7.20, refundAmount: 0, paymentStatus: 'paid',
    recipientName: 'Бахар Хыдырова', recipientPhone: '+993 12 444-789', recipientAddress: 'Ашхабад, ул. Андалиб 41', deliveryNote: '',
    items: [{ productName: 'Праздничный набор сладостей', qty: 2, categoryName: 'Кафе', photoEmoji: '🎂', unitCost: 350 }],
    localSellerId: 's-003',
    localProductCost: 700, localDeliveryCost: 80, packagingCost: 40, turkmenCommission: 120, additionalExpenses: 0,
    supplierProductCost: 0, supplierDeliveryCost: 0, supplierServiceFee: 0, supplierDiscounts: 0, supplierRefunds: 0,
    alreadySettled: 940, setoffAmount: 0, paidToTurkmen: 0,
    fulfillment: 'delivered', settlement: 'partially_settled',
    documents: ['doc-1003'],
    audit: [
      { at: '14.02.2026 11:41', actor: 'Система',     role: 'system', action: 'Заказ автоматически отмечен как foreign_paid_local_delivery' },
      { at: '14.02.2026 12:30', actor: 'Карпова А.',  role: 'TurkmenistanOperator', action: 'Назначен продавец: Кафе «Дессерт»' },
      { at: '14.02.2026 13:50', actor: 'Сердар Б.',   role: 'LocalCourier', action: 'Заказ доставлен' },
      { at: '14.02.2026 18:00', actor: 'Морозова О.', role: 'ChiefAccountant', action: 'Частичный взаимозачёт 940 TMT' },
    ],
  },
  {
    orderId: 'FD-2026-003', type: 'foreign_paid_local_delivery',
    createdAt: '13.02.2026 15:20',
    customerCountry: 'Польша', customerName: 'Tomasz Nowak', customerEmail: 't.nowak@op.pl', customerPhone: '+48 601 555 444',
    paymentCurrency: 'PLN', paymentAmount: 1240, paymentProvider: 'Przelewy24', paymentProviderFee: 31.00, refundAmount: 0, paymentStatus: 'paid',
    recipientName: 'Меретджан Какаджанов', recipientPhone: '+993 12 444-100', recipientAddress: 'Туркменабат, проспект Махтумкули 5',
    items: [{ productName: 'Электроника · Bluetooth-колонка', qty: 1, categoryName: 'Электроника', photoEmoji: '🔊', unitCost: 0 }],
    localSellerId: 's-004', supplierId: 'sup-002',
    localProductCost: 0, localDeliveryCost: 120, packagingCost: 50, turkmenCommission: 200, additionalExpenses: 0,
    supplierProductCost: 1100, supplierDeliveryCost: 80, supplierServiceFee: 40, supplierDiscounts: 0, supplierRefunds: 0,
    alreadySettled: 0, setoffAmount: 0, paidToTurkmen: 0,
    fulfillment: 'handed_to_courier', settlement: 'open',
    documents: ['doc-1004'],
    audit: [
      { at: '13.02.2026 15:20', actor: 'Система',     role: 'system', action: 'Заказ автоматически отмечен как foreign_paid_local_delivery' },
      { at: '13.02.2026 16:00', actor: 'Карпова А.',  role: 'TurkmenistanOperator', action: 'Назначен поставщик: Istanbul Wholesale' },
    ],
  },
  {
    orderId: 'FD-2026-004', type: 'foreign_paid_local_delivery',
    createdAt: '12.02.2026 10:00',
    customerCountry: 'Польша', customerName: 'Magdalena Wiśniewska', customerEmail: 'm.wisn@onet.pl', customerPhone: '+48 502 333 222',
    paymentCurrency: 'PLN', paymentAmount: 380, paymentProvider: 'PayU', paymentProviderFee: 11.40, refundAmount: 380, paymentStatus: 'refunded',
    recipientName: 'Гульшат Овезова', recipientPhone: '+993 12 444-567', recipientAddress: 'Ашхабад, ул. Гёроглы 14',
    items: [{ productName: 'Праздничный торт', qty: 1, categoryName: 'Кафе', photoEmoji: '🎂', unitCost: 320 }],
    localSellerId: 's-003',
    localProductCost: 0, localDeliveryCost: 0, packagingCost: 0, turkmenCommission: 0, additionalExpenses: 0,
    supplierProductCost: 0, supplierDeliveryCost: 0, supplierServiceFee: 0, supplierDiscounts: 0, supplierRefunds: 0,
    alreadySettled: 0, setoffAmount: 0, paidToTurkmen: 0,
    fulfillment: 'cancelled', settlement: 'cancelled',
    documents: ['doc-1005', 'doc-1006'],
    audit: [
      { at: '12.02.2026 10:01', actor: 'Система',     role: 'system', action: 'Заказ автоматически отмечен как foreign_paid_local_delivery' },
      { at: '12.02.2026 10:25', actor: 'Anna K.',     role: 'Customer', action: 'Запрос на отмену + возврат' },
      { at: '12.02.2026 10:40', actor: 'Сидоров П.',  role: 'PolandFinance', action: 'Возврат оплаты выполнен' },
    ],
  },
  {
    orderId: 'FD-2026-005', type: 'foreign_paid_local_delivery',
    createdAt: '08.02.2026 12:00',
    customerCountry: 'Польша', customerName: 'Piotr Wójcik',         customerEmail: 'p.wojcik@wp.pl',  customerPhone: '+48 600 444 333',
    paymentCurrency: 'PLN', paymentAmount: 920, paymentProvider: 'Stripe', paymentProviderFee: 27.60, refundAmount: 0, paymentStatus: 'paid',
    recipientName: 'Айгуль Бердыева',  recipientPhone: '+993 12 444-001', recipientAddress: 'Ашхабад, ул. Магтымгулы 14',
    items: [{ productName: 'Хозтовары · набор', qty: 1, categoryName: 'Магазин', photoEmoji: '🛒', unitCost: 600 }],
    localSellerId: 's-001',
    localProductCost: 600, localDeliveryCost: 90, packagingCost: 30, turkmenCommission: 130, additionalExpenses: 10,
    supplierProductCost: 0, supplierDeliveryCost: 0, supplierServiceFee: 0, supplierDiscounts: 0, supplierRefunds: 0,
    alreadySettled: 860, setoffAmount: 0, paidToTurkmen: 0,
    fulfillment: 'delivered', settlement: 'settled',
    documents: ['doc-1007', 'doc-1008'],
    reviewedBy: 'Морозова О. (ChiefAccountant)', closedBy: 'Морозова О. (ChiefAccountant)',
    audit: [
      { at: '08.02.2026 12:01', actor: 'Система',     role: 'system', action: 'Заказ автоматически отмечен как foreign_paid_local_delivery' },
      { at: '08.02.2026 14:50', actor: 'Аман Г.',     role: 'LocalCourier', action: 'Заказ доставлен' },
      { at: '10.02.2026 09:00', actor: 'Морозова О.', role: 'ChiefAccountant', action: 'Расчёт закрыт' },
    ],
  },
  {
    orderId: 'FD-2026-006', type: 'foreign_paid_local_delivery',
    createdAt: '14.02.2026 18:42',
    customerCountry: 'Польша', customerName: 'Kasia Mazur', customerEmail: 'k.mazur@gmail.com', customerPhone: '+48 601 200 100',
    paymentCurrency: 'PLN', paymentAmount: 460, paymentProvider: 'Przelewy24', paymentProviderFee: 11.50, refundAmount: 0, paymentStatus: 'pending',
    recipientName: 'Мерет Бердыев', recipientPhone: '+993 12 444-808', recipientAddress: 'Ашхабад, мкр Парахат 3, дом 12',
    items: [{ productName: 'Цветочная композиция', qty: 1, categoryName: 'Цветы', photoEmoji: '💐', unitCost: 220 }],
    localSellerId: 's-002',
    localProductCost: 220, localDeliveryCost: 60, packagingCost: 20, turkmenCommission: 70, additionalExpenses: 0,
    supplierProductCost: 0, supplierDeliveryCost: 0, supplierServiceFee: 0, supplierDiscounts: 0, supplierRefunds: 0,
    alreadySettled: 0, setoffAmount: 0, paidToTurkmen: 0,
    fulfillment: 'new', settlement: 'open',
    documents: [],
    audit: [
      { at: '14.02.2026 18:42', actor: 'Система',     role: 'system', action: 'Заказ создан, оплата в обработке' },
    ],
  },
];

// ─── Documents ────────────────────────────────────────────────────────────────

export type DocStatus = 'missing' | 'uploaded' | 'verified' | 'rejected';

export const DOC_STATUS_LABELS: Record<DocStatus, { label: string; cls: string }> = {
  missing:  { label: 'Не загружен', cls: 'bg-gray-100 text-gray-600'    },
  uploaded: { label: 'Загружен',    cls: 'bg-blue-100 text-blue-700'    },
  verified: { label: 'Проверен',    cls: 'bg-green-100 text-green-700'  },
  rejected: { label: 'Отклонён',    cls: 'bg-red-100 text-red-700'      },
};

export type DocKind =
  | 'customer_invoice' | 'fulfillment_report' | 'seller_purchase_proof'
  | 'supplier_invoice' | 'delivery_proof'     | 'delivery_photo'
  | 'refund_doc'       | 'monthly_report'      | 'setoff_act'
  | 'admin_note';

export const DOC_KIND_LABELS: Record<DocKind, string> = {
  customer_invoice:      'Инвойс клиенту от Польши',
  fulfillment_report:    'Локальный отчёт исполнения',
  seller_purchase_proof: 'Подтверждение покупки у продавца',
  supplier_invoice:      'Invoice поставщика',
  delivery_proof:        'Подтверждение доставки',
  delivery_photo:        'Фото доставки',
  refund_doc:            'Документ возврата',
  monthly_report:        'Месячный отчёт',
  setoff_act:            'Акт взаимозачёта',
  admin_note:            'Комментарий администратора',
};

export interface ForeignDoc {
  docId:        string;
  orderId?:     string;
  kind:         DocKind;
  filename:     string;
  uploadedBy:   string;
  uploadedAt:   string;
  status:       DocStatus;
  comment?:     string;
  /** Mock: data URL or empty string. */
  url:          string;
}

export const FOREIGN_DOCS: ForeignDoc[] = [
  { docId: 'doc-1001', orderId: 'FD-2026-001', kind: 'customer_invoice',      filename: 'invoice-FD-2026-001.pdf',  uploadedBy: 'Sidorov P. (PolandFinance)',     uploadedAt: '14.02.2026 09:15', status: 'verified',  url: '' },
  { docId: 'doc-1002', orderId: 'FD-2026-001', kind: 'delivery_photo',         filename: 'delivery-001.jpg',         uploadedBy: 'Аман Г. (LocalCourier)',         uploadedAt: '14.02.2026 10:18', status: 'verified',  url: '' },
  { docId: 'doc-1003', orderId: 'FD-2026-002', kind: 'fulfillment_report',    filename: 'fulfillment-002.pdf',      uploadedBy: 'Карпова А. (TurkmenistanOperator)', uploadedAt: '14.02.2026 13:00', status: 'uploaded',  url: '' },
  { docId: 'doc-1004', orderId: 'FD-2026-003', kind: 'supplier_invoice',     filename: 'IST-INV-2026-008.pdf',     uploadedBy: 'Ali Yıldız (Supplier)',          uploadedAt: '13.02.2026 16:30', status: 'uploaded',  url: '' },
  { docId: 'doc-1005', orderId: 'FD-2026-004', kind: 'refund_doc',            filename: 'refund-FD-2026-004.pdf',    uploadedBy: 'Sidorov P. (PolandFinance)',     uploadedAt: '12.02.2026 10:42', status: 'verified',  url: '' },
  { docId: 'doc-1006', orderId: 'FD-2026-004', kind: 'admin_note',            filename: 'note.txt',                  uploadedBy: 'Супер Админ',                    uploadedAt: '12.02.2026 11:00', status: 'verified',  url: '' },
  { docId: 'doc-1007', orderId: 'FD-2026-005', kind: 'fulfillment_report',    filename: 'fulfillment-005.pdf',       uploadedBy: 'Карпова А. (TurkmenistanOperator)', uploadedAt: '08.02.2026 15:00', status: 'verified',  url: '' },
  { docId: 'doc-1008', orderId: 'FD-2026-005', kind: 'delivery_photo',         filename: 'delivery-005.jpg',          uploadedBy: 'Аман Г. (LocalCourier)',         uploadedAt: '08.02.2026 14:55', status: 'verified',  url: '' },
];

// ─── Supplier invoices / payables ─────────────────────────────────────────────

export type PayableStatus =
  | 'not_due' | 'pending' | 'partially_paid' | 'paid' | 'overdue' | 'disputed' | 'cancelled';

export const PAYABLE_STATUS_LABELS: Record<PayableStatus, { label: string; cls: string }> = {
  not_due:        { label: 'Срок не наступил', cls: 'bg-gray-100 text-gray-600'    },
  pending:        { label: 'Ожидает оплаты',   cls: 'bg-blue-100 text-blue-700'    },
  partially_paid: { label: 'Частично оплачен', cls: 'bg-purple-100 text-purple-700' },
  paid:           { label: 'Оплачен',          cls: 'bg-green-100 text-green-700'   },
  overdue:        { label: 'Просрочен',        cls: 'bg-red-100 text-red-700'       },
  disputed:       { label: 'Спор',             cls: 'bg-orange-100 text-orange-700' },
  cancelled:      { label: 'Отменён',          cls: 'bg-gray-200 text-gray-700'     },
};

export interface SupplierInvoice {
  invoiceId:    string;
  supplierId:   string;
  orderId?:     string;
  number:       string;        // INV-IST-2026-008
  date:         string;
  currency:     string;
  amount:       number;
  paid:         number;
  dueDate:      string;
  invoiceDoc:   string;        // doc id
  invoiceState: DocStatus;
  status:       PayableStatus;
  notes?:       string;
}

export const SUPPLIER_INVOICES: SupplierInvoice[] = [
  { invoiceId: 'si-001', supplierId: 'sup-002', orderId: 'FD-2026-003', number: 'IST-INV-2026-008', date: '13.02.2026', currency: 'TRY', amount: 14_200, paid: 0,      dueDate: '28.02.2026', invoiceDoc: 'doc-1004', invoiceState: 'uploaded', status: 'pending'        },
  { invoiceId: 'si-002', supplierId: 'sup-001',                       number: 'YW-2026-114',       date: '01.02.2026', currency: 'CNY', amount: 24_800, paid: 12_000, dueDate: '20.02.2026', invoiceDoc: 'doc-101',  invoiceState: 'verified', status: 'partially_paid' },
  { invoiceId: 'si-003', supplierId: 'sup-003',                       number: 'EU-G-2026-3',       date: '20.01.2026', currency: 'EUR', amount: 1_840,  paid: 0,      dueDate: '20.02.2026', invoiceDoc: '',         invoiceState: 'missing',  status: 'overdue'        },
  { invoiceId: 'si-004', supplierId: 'sup-004',                       number: 'TMT-2026-014',      date: '08.02.2026', currency: 'TMT', amount: 6_200,  paid: 6_200,  dueDate: '15.02.2026', invoiceDoc: 'doc-103',  invoiceState: 'verified', status: 'paid'           },
];

// ─── Seller settlements ───────────────────────────────────────────────────────

export interface SellerPaymentEntry {
  date:    string;
  amount:  number;        // TMT
  method:  string;        // 'Cash' | 'Bank' | 'Setoff' | …
  proof?:  string;        // doc id
  note?:   string;
}

export interface SellerSettlement {
  sellerId:        string;
  period:          string;
  ordersCount:     number;
  ordersCompleted: number;
  ordersCancelled: number;
  ordersReturned:  number;
  totalDue:        number;
  totalPaid:       number;
  outstanding:     number;
  documents:       string[];
  payments:        SellerPaymentEntry[];
}

export const SELLER_SETTLEMENTS: SellerSettlement[] = [
  {
    sellerId: 's-001', period: 'Февраль 2026',
    ordersCount: 14, ordersCompleted: 13, ordersCancelled: 1, ordersReturned: 0,
    totalDue: 8_400, totalPaid: 5_400, outstanding: 3_000,
    documents: ['doc-1007', 'doc-1008'],
    payments: [
      { date: '03.02.2026', amount: 3_000, method: 'Bank',   note: 'Аванс' },
      { date: '11.02.2026', amount: 2_400, method: 'Cash',   note: 'Промежуточная оплата' },
    ],
  },
  {
    sellerId: 's-002', period: 'Февраль 2026',
    ordersCount: 8, ordersCompleted: 7, ordersCancelled: 0, ordersReturned: 1,
    totalDue: 4_280, totalPaid: 2_000, outstanding: 2_280,
    documents: ['doc-1001'],
    payments: [
      { date: '07.02.2026', amount: 2_000, method: 'Bank',   note: 'Аванс' },
    ],
  },
  {
    sellerId: 's-003', period: 'Февраль 2026',
    ordersCount: 11, ordersCompleted: 10, ordersCancelled: 1, ordersReturned: 0,
    totalDue: 9_700, totalPaid: 9_700, outstanding: 0,
    documents: ['doc-1003'],
    payments: [
      { date: '10.02.2026', amount: 9_700, method: 'Bank',   note: 'Закрыто' },
    ],
  },
  {
    sellerId: 's-004', period: 'Февраль 2026',
    ordersCount: 3, ordersCompleted: 3, ordersCancelled: 0, ordersReturned: 0,
    totalDue: 16_400, totalPaid: 0, outstanding: 16_400,
    documents: [],
    payments: [],
  },
];

// ─── Intercompany debt + setoff ───────────────────────────────────────────────

export interface SetoffRecord {
  setoffId:       string;
  period:         string;
  polandOwesTm:   number;     // TMT
  tmOwesPoland:   number;     // TMT (IT/SaaS/brand fees)
  setoffAmount:   number;     // TMT (min of two)
  netRemaining:   number;     // TMT
  confirmedBy?:   string;
  confirmedAt?:   string;
  actDoc?:        string;     // doc id
  status:         'draft' | 'pending_review' | 'confirmed' | 'cancelled';
  audit:          AuditEntry[];
}

export const SETOFFS: SetoffRecord[] = [
  {
    setoffId: 'so-2026-01', period: 'Январь 2026',
    polandOwesTm: 18_400, tmOwesPoland: 6_200,
    setoffAmount: 6_200, netRemaining: 12_200,
    confirmedBy: 'Морозова О. (ChiefAccountant)', confirmedAt: '03.02.2026 14:00',
    actDoc: 'doc-set-001', status: 'confirmed',
    audit: [
      { at: '01.02.2026 09:00', actor: 'Сидоров П.',  role: 'PolandFinance',    action: 'Сформирован взаимозачёт за январь' },
      { at: '03.02.2026 14:00', actor: 'Морозова О.', role: 'ChiefAccountant',  action: 'Подтверждено, акт подписан' },
    ],
  },
  {
    setoffId: 'so-2026-02', period: 'Февраль 2026',
    polandOwesTm: 12_840, tmOwesPoland: 4_500,
    setoffAmount: 4_500, netRemaining: 8_340,
    status: 'pending_review',
    audit: [
      { at: '14.02.2026 18:50', actor: 'Сидоров П.',  role: 'PolandFinance', action: 'Сформирован взаимозачёт за февраль' },
    ],
  },
];

// ─── Settings ─────────────────────────────────────────────────────────────────

export type ExpenseType =
  | 'product_cost' | 'delivery' | 'packaging' | 'commission'
  | 'storage' | 'photo_video' | 'urgent_fee' | 'gift_wrap' | 'other';

export const EXPENSE_TYPE_LABELS: Record<ExpenseType, string> = {
  product_cost: 'Стоимость товара',
  delivery:     'Доставка',
  packaging:    'Упаковка',
  commission:   'Комиссия',
  storage:      'Хранение',
  photo_video:  'Фото/видео',
  urgent_fee:   'Срочная доставка',
  gift_wrap:    'Подарочная упаковка',
  other:        'Другое',
};

export interface ForeignSettings {
  defaultTurkmenCommission: number;     // TMT
  defaultPackagingCost:     number;     // TMT
  defaultDeliveryCost:      number;     // TMT
  settlementCurrency:       string;     // 'TMT'
  exchangeRates:            Record<string, number>; // X → TMT
  paymentProviderFeePct:    number;     // %
  allowedPaymentCurrencies: string[];
  rounding:                 'up' | 'down' | 'nearest';
  dailyRegistryCloseHour:   number;     // 0-23 UTC+5
  weeklyRegistryCloseDow:   number;     // 0=Sun
  monthlyCloseDay:          number;     // day of month
  expenseTypes:             ExpenseType[];
  sellerTypes:              SellerType[];
  supplierKinds:            SupplierKind[];
  companies:                string[];   // company ids
  /** Auto-detection rules. */
  foreignDetection: {
    enabled:               boolean;
    customerCountriesNot:  string[];     // country must NOT be …
    deliveryCountryIs:     string;       // delivery must BE …
  };
}

export const FOREIGN_SETTINGS: ForeignSettings = {
  defaultTurkmenCommission: 100,
  defaultPackagingCost:     30,
  defaultDeliveryCost:      80,
  settlementCurrency:       'TMT',
  exchangeRates: {
    PLN: 0.92, EUR: 4.0, USD: 3.7, TRY: 0.12, CNY: 0.51, TMT: 1,
  },
  paymentProviderFeePct: 3,
  allowedPaymentCurrencies: ['PLN', 'EUR', 'USD'],
  rounding: 'nearest',
  dailyRegistryCloseHour: 23,
  weeklyRegistryCloseDow: 0,
  monthlyCloseDay: 5,
  expenseTypes: ['product_cost', 'delivery', 'packaging', 'commission', 'storage', 'photo_video', 'urgent_fee', 'gift_wrap', 'other'],
  sellerTypes:  ['shop', 'cafe', 'flower_shop', 'warehouse', 'private_supplier', 'other'],
  supplierKinds:['local_supplier', 'foreign_supplier', 'marketplace', 'manufacturer', 'wholesaler'],
  companies:    COMPANIES.map(c => c.companyId),
  foreignDetection: {
    enabled: true,
    customerCountriesNot: ['Туркменистан'],
    deliveryCountryIs:    'Туркменистан',
  },
};

// ─── Aggregations ─────────────────────────────────────────────────────────────

export function aggregateOrders(orders: ForeignOrder[]) {
  let totalPayments = 0, totalLocal = 0, totalSupplier = 0, totalMargin = 0;
  let polandOwesTm  = 0, debtSuppliers = 0, debtSellers = 0, settledByOffset = 0, openDebt = 0;
  let withoutDocs   = 0, underReview = 0, refundedOrCancelled = 0;
  let delivered = 0, cancelled = 0, returned = 0, totalRefunds = 0;

  for (const o of orders) {
    const t = calcSettlement(o);
    totalPayments += o.paymentAmount;
    totalLocal    += t.totalLocalFulfillmentCost;
    totalSupplier += t.supplierPayable;
    totalMargin   += t.polandMargin;
    polandOwesTm  += t.amountPolandOwesTurkmen;
    debtSuppliers += t.supplierPayable;
    settledByOffset += o.setoffAmount;
    openDebt      += Math.max(0, t.remainingDebt);
    totalRefunds  += o.refundAmount;

    if (o.documents.length === 0)        withoutDocs++;
    if (o.settlement === 'under_review') underReview++;
    if (o.settlement === 'cancelled' || o.fulfillment === 'cancelled') refundedOrCancelled++;
    if (o.fulfillment === 'delivered')   delivered++;
    if (o.fulfillment === 'cancelled')   cancelled++;
    if (o.fulfillment === 'returned')    returned++;
  }
  // Sellers debt = sum of outstanding across LOCAL_SELLERS
  for (const s of LOCAL_SELLERS) debtSellers += s.outstanding;

  return {
    totalPayments, totalLocal, totalSupplier, totalMargin,
    polandOwesTm, debtSuppliers, debtSellers, settledByOffset, openDebt,
    withoutDocs, underReview, refundedOrCancelled,
    delivered, cancelled, returned, totalRefunds,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Currency format. Keeps two decimals when not a whole number. */
export function fmtMoney(amount: number, ccy = 'TMT'): string {
  const isInt = Math.abs(amount - Math.round(amount)) < 0.01;
  return `${ccy} ${isInt ? Math.round(amount) : amount.toFixed(2)}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** Human-readable date (DD.MM.YYYY) → number for sorting. */
export function dateToNum(d: string): number {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})/.exec(d);
  if (!m) return 0;
  return Number(`${m[3]}${m[2]}${m[1]}`);
}

/** Push an audit entry to an order in-place (mock store mutation). */
export function pushAudit(o: ForeignOrder, action: string, actor = 'Супер Админ', role = 'SuperAdmin'): void {
  o.audit.unshift(auditNow(action, actor, role));
}
