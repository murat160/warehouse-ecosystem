// Shared mock data for the Products section (admin panel).
// Keeps types + mock arrays in one place so ProductsList / ProductCategories /
// ProductMedia can reference the same dataset.

export type ProductStatus = 'draft' | 'active' | 'moderation' | 'blocked' | 'archived';

export const PRODUCT_STATUS_CFG: Record<ProductStatus, { label: string; cls: string; dot: string }> = {
  draft:      { label: 'Черновик',      cls: 'bg-slate-100 text-slate-700',  dot: 'bg-slate-400'  },
  active:     { label: 'Активный',      cls: 'bg-green-100 text-green-700',  dot: 'bg-green-500'  },
  moderation: { label: 'На модерации',  cls: 'bg-yellow-100 text-yellow-700',dot: 'bg-yellow-500' },
  blocked:    { label: 'Заблокирован',  cls: 'bg-red-100 text-red-700',      dot: 'bg-red-500'    },
  archived:   { label: 'В архиве',      cls: 'bg-gray-100 text-gray-600',    dot: 'bg-gray-400'   },
};

export type ProductAvailability = 'in_stock' | 'low' | 'out' | 'preorder';

export const AVAILABILITY_LABELS: Record<ProductAvailability, { label: string; cls: string }> = {
  in_stock: { label: 'В наличии',    cls: 'bg-green-100 text-green-700'  },
  low:      { label: 'Мало осталось',cls: 'bg-orange-100 text-orange-700'},
  out:      { label: 'Нет в наличии',cls: 'bg-red-100 text-red-700'      },
  preorder: { label: 'Предзаказ',    cls: 'bg-blue-100 text-blue-700'    },
};

export interface ProductDimensions { length?: number; width?: number; height?: number; }
export interface ProductDiscount { percent: number; startDate?: string; endDate?: string; }
export interface ProductShipping {
  delivery?:       boolean;
  pvz?:            boolean;
  pickup?:         boolean;
  fragile?:        boolean;
  needsPackaging?: boolean;
  ageLimit?:       number; // 0 = no limit
}
export interface ProductAttribute { key: string; value: string; }
export interface ProductAuditEntry {
  at:     string;
  actor:  string;
  role:   string;
  action: string;
}

export type ProductOwnerType = 'company' | 'merchant';

/**
 * popularityMode controls SuperAdmin override of automatic popularity ranking.
 *  - 'auto'   — system-driven (default), sorts by sales/revenue/rating.
 *  - 'pinned' — SuperAdmin pinned this product to the popular block (always visible).
 *  - 'hidden' — SuperAdmin hidden from the popular block (never visible there).
 *  - 'manual' — SuperAdmin set manual rank but didn't pin (showcaseRank applied).
 */
export type PopularityMode = 'auto' | 'manual' | 'pinned' | 'hidden';

export interface Product {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  merchant: string;
  merchantId: string;
  /** 'company' = produced by our platform brand; 'merchant' = third-party seller */
  ownerType: ProductOwnerType;
  status: ProductStatus;
  price: number;
  stock: number;
  photoCount: number;
  rating: number;
  sales: number;
  /** Revenue (sales * price snapshot). Pre-computed for popular sorting. */
  revenue: number;
  createdAt: string;
  updatedAt: string;
  /** SuperAdmin override of popular ranking. Default: 'auto'. */
  popularityMode?: PopularityMode;
  /** Manual rank for 'manual' / 'pinned' mode. Lower = higher position. */
  showcaseRank?: number;
  /** Audit: who boosted this product. */
  boostedBy?: string;
  boostedByRole?: string;
  boostedAt?: string;
  boostReason?: string;
  /** Whether the product is visible to customers (independent of status). */
  visibleToCustomers?: boolean;

  // ── Extended (used by professional product creation form) ──
  barcode?:          string;
  brand?:            string;
  subcategoryId?:    string;
  productType?:      string;          // type label (физический / цифровой / услуга / комплект)
  shortDescription?: string;
  description?:      string;
  tags?:             string[];
  /** Identifier of the photo from MEDIA that is the main one. */
  mainPhotoId?:      string;
  /** Pricing details. */
  oldPrice?:         number;
  costPrice?:        number;
  currency?:         string;          // RUB / KZT / USD ...
  discount?:         ProductDiscount;
  /** Stock & warehouse. */
  minStock?:         number;
  warehouseId?:      string;
  cellLocation?:     string;
  availability?:     ProductAvailability;
  /** Physical specs. */
  weight?:           number;          // grams
  dimensions?:       ProductDimensions;
  color?:            string;
  material?:         string;
  size?:             string;
  country?:          string;
  warranty?:         string;
  customAttributes?: ProductAttribute[];
  /** Shipping flags. */
  shipping?:         ProductShipping;
  /** Audit log of significant changes. */
  audit?:            ProductAuditEntry[];
}

export type RecommendationPosition =
  | 'home' | 'first_rows' | 'for_you' | 'popular_block' | 'sale_of_week'
  | 'category_top' | 'search_boost' | 'merchant_card';

export type RecommendationMode =
  | 'automatic'        // System auto-promotes
  | 'manual'           // SuperAdmin / role manually placed
  | 'sponsored'        // Paid placement
  | 'company_priority';// Company-owned products forced top

export type RecommendationAudience =
  | 'all' | 'by_city' | 'by_category' | 'by_interests'
  | 'new_customers' | 'returning_customers';

export const RECOMMENDATION_AUDIENCE_LABELS: Record<RecommendationAudience, string> = {
  all:                  'Все покупатели',
  by_city:              'По городу',
  by_category:          'По категории',
  by_interests:         'По интересам',
  new_customers:        'Новые клиенты',
  returning_customers:  'Постоянные клиенты',
};

export const RECOMMENDATION_MODE_LABELS: Record<RecommendationMode, string> = {
  automatic:        'Авто',
  manual:           'Ручной',
  sponsored:        'Sponsored',
  company_priority: 'Приоритет фирмы',
};

export interface RecommendationSlot {
  id: string;
  productId: string;
  productName: string;
  position: RecommendationPosition;
  priority: number;            // 1 = highest
  startDate: string;
  endDate: string;
  active: boolean;
  addedBy: string;
  addedByRole: string;
  addedAt: string;
  /** New (batch 9) */
  mode?: RecommendationMode;
  audience?: RecommendationAudience;
  audienceValue?: string; // e.g., city name when audience='by_city'
}

export const RECOMMENDATION_POSITIONS: { id: RecommendationPosition; label: string }[] = [
  { id: 'home',          label: 'Главная страница'      },
  { id: 'first_rows',    label: 'Первые ряды'           },
  { id: 'for_you',       label: 'Рекомендовано для вас' },
  { id: 'popular_block', label: 'Блок «Популярное»'     },
  { id: 'sale_of_week',  label: 'Акция недели'          },
  { id: 'category_top',  label: 'Топ категории'         },
  { id: 'search_boost',  label: 'Boosted search'        },
  { id: 'merchant_card', label: 'Карточка продавца'     },
];

// ─── Showcase (homepage / first-rows) slots ──────────────────────────────────

export type ShowcaseLocation = 'home' | 'category' | 'search' | 'merchant_page' | 'promotion_page';

export const SHOWCASE_LOCATION_LABELS: Record<ShowcaseLocation, string> = {
  home:           'Главная',
  category:       'Категория',
  search:         'Поиск',
  merchant_page:  'Продавец',
  promotion_page: 'Акция',
};

export interface ShowcaseSlot {
  id: string;
  /** Slot # — 1 = first, 2 = second, etc. */
  slotNumber: number;
  productId: string;
  productName: string;
  location: ShowcaseLocation;
  /** locationContext: category id / merchant id / promo id depending on location. */
  locationContext?: string;
  active: boolean;
  addedBy: string;
  addedByRole: string;
  addedAt: string;
}

export const SHOWCASE_INITIAL: ShowcaseSlot[] = [
  { id: 'show-001', slotNumber: 1, productId: 'p-001', productName: 'iPhone 15 Pro 256 GB',          location: 'home', active: true,  addedBy: 'Супер Админ',  addedByRole: 'SuperAdmin',           addedAt: '01.02.2026 10:00' },
  { id: 'show-002', slotNumber: 2, productId: 'p-008', productName: 'Пицца «Маргарита» 30 см',       location: 'home', active: true,  addedBy: 'Карпова А.И.', addedByRole: 'Showcase Manager',     addedAt: '10.02.2026 09:30' },
  { id: 'show-003', slotNumber: 3, productId: 'p-006', productName: 'Кроссовки Nike Air 42',         location: 'home', active: true,  addedBy: 'Иванов И.И.',  addedByRole: 'Manager',              addedAt: '05.02.2026 11:00' },
  { id: 'show-004', slotNumber: 4, productId: 'p-c01', productName: 'PVZ · Брендированный картон',   location: 'home', active: false, addedBy: 'Супер Админ',  addedByRole: 'SuperAdmin',           addedAt: '01.02.2026 10:30' },
];

export interface ProductCategory {
  id: string;
  name: string;
  parentId?: string | null;
  active: boolean;
  icon: string;
  createdAt: string;
}

export type MediaStatus = 'approved' | 'pending' | 'rejected';
export type MediaType   = 'image' | 'video';

export const MEDIA_STATUS_CFG: Record<MediaStatus, { label: string; cls: string }> = {
  approved: { label: 'Одобрено',   cls: 'bg-green-100 text-green-700'   },
  pending:  { label: 'На проверке',cls: 'bg-yellow-100 text-yellow-700' },
  rejected: { label: 'Отклонено',  cls: 'bg-red-100 text-red-700'       },
};

export interface ProductMediaItem {
  id: string;
  productId: string;
  productName: string;
  /** data: URL or empty string for placeholder. */
  url: string;
  /** Tailwind bg-class for placeholder if url is empty. */
  bg: string;
  emoji: string;
  filename: string;
  sizeLabel: string;
  status: MediaStatus;
  uploadedAt: string;
  uploader: string;
  /** 'image' (default) or 'video'. */
  mediaType?: MediaType;
  /** MIME type for videos: video/mp4, video/webm. */
  videoMimeType?: string;
}

// ─── Categories ──────────────────────────────────────────────────────────────

export const CATEGORIES: ProductCategory[] = [
  { id: 'cat-electronics', name: 'Электроника',          parentId: null, active: true,  icon: '📱', createdAt: '01.01.2026' },
  { id: 'cat-phones',      name: 'Смартфоны',            parentId: 'cat-electronics', active: true,  icon: '📱', createdAt: '01.01.2026' },
  { id: 'cat-laptops',     name: 'Ноутбуки',             parentId: 'cat-electronics', active: true,  icon: '💻', createdAt: '01.01.2026' },
  { id: 'cat-audio',       name: 'Аудио',                parentId: 'cat-electronics', active: true,  icon: '🎧', createdAt: '01.01.2026' },
  { id: 'cat-clothing',    name: 'Одежда',               parentId: null, active: true,  icon: '👕', createdAt: '01.01.2026' },
  { id: 'cat-shoes',       name: 'Обувь',                parentId: 'cat-clothing',    active: true,  icon: '👟', createdAt: '01.01.2026' },
  { id: 'cat-bags',        name: 'Сумки и аксессуары',   parentId: 'cat-clothing',    active: true,  icon: '👜', createdAt: '01.01.2026' },
  { id: 'cat-food',        name: 'Продукты',             parentId: null, active: true,  icon: '🥑', createdAt: '01.01.2026' },
  { id: 'cat-restaurant',  name: 'Готовая еда',          parentId: 'cat-food',        active: true,  icon: '🍕', createdAt: '01.01.2026' },
  { id: 'cat-grocery',     name: 'Бакалея',              parentId: 'cat-food',        active: true,  icon: '🛒', createdAt: '01.01.2026' },
  { id: 'cat-pharmacy',    name: 'Аптека',               parentId: null, active: true,  icon: '💊', createdAt: '01.01.2026' },
  { id: 'cat-flowers',     name: 'Цветы и подарки',      parentId: null, active: false, icon: '💐', createdAt: '15.01.2026' },
];

// ─── Products ────────────────────────────────────────────────────────────────

// COMPANY_MERCHANT_ID identifies products of our own brand (the platform itself).
export const COMPANY_MERCHANT_ID = 'm-platform';

const mk = (
  base: Omit<Product, 'revenue' | 'ownerType'> & Partial<Pick<Product, 'ownerType'>>,
): Product => ({
  ownerType: base.ownerType ?? (base.merchantId === COMPANY_MERCHANT_ID ? 'company' : 'merchant'),
  revenue: base.price * base.sales,
  ...base,
});

export const PRODUCTS: Product[] = [
  mk({ id: 'p-001', sku: 'SKU-PHN-001', name: 'iPhone 15 Pro 256 GB',           categoryId: 'cat-phones',     merchant: 'ЭлектроМир',      merchantId: 'm-001', status: 'active',     price: 89990,  stock: 45,  photoCount: 5, rating: 4.8, sales: 234, createdAt: '15.01.2026 10:00', updatedAt: '14.02.2026 09:00' }),
  mk({ id: 'p-002', sku: 'SKU-PHN-002', name: 'Samsung Galaxy S24 Ultra',       categoryId: 'cat-phones',     merchant: 'ЭлектроМир',      merchantId: 'm-001', status: 'active',     price: 109990, stock: 12,  photoCount: 4, rating: 4.7, sales: 189, createdAt: '20.01.2026 11:00', updatedAt: '14.02.2026 10:00' }),
  mk({ id: 'p-003', sku: 'SKU-LAP-001', name: 'MacBook Pro 14" M3',             categoryId: 'cat-laptops',    merchant: 'ЭлектроМир',      merchantId: 'm-001', status: 'active',     price: 199990, stock: 8,   photoCount: 3, rating: 4.9, sales: 156, createdAt: '10.01.2026 09:30', updatedAt: '13.02.2026 14:00' }),
  mk({ id: 'p-004', sku: 'SKU-AUD-001', name: 'AirPods Pro 2',                  categoryId: 'cat-audio',      merchant: 'ЭлектроМир',      merchantId: 'm-001', status: 'active',     price: 22990,  stock: 78,  photoCount: 2, rating: 4.6, sales: 445, createdAt: '12.01.2026 12:00', updatedAt: '14.02.2026 11:00' }),
  mk({ id: 'p-005', sku: 'SKU-CLO-001', name: 'Хлопковая футболка (M)',         categoryId: 'cat-clothing',   merchant: 'TextileShop',     merchantId: 'm-002', status: 'moderation', price: 1990,   stock: 340, photoCount: 0, rating: 0,   sales: 0,   createdAt: '14.02.2026 09:30', updatedAt: '14.02.2026 09:30' }),
  mk({ id: 'p-006', sku: 'SKU-SHO-001', name: 'Кроссовки Nike Air 42',          categoryId: 'cat-shoes',      merchant: 'SportZone',       merchantId: 'm-003', status: 'active',     price: 9990,   stock: 68,  photoCount: 6, rating: 4.5, sales: 289, createdAt: '01.02.2026 14:00', updatedAt: '13.02.2026 16:00' }),
  mk({ id: 'p-007', sku: 'SKU-BAG-001', name: 'Кожаный рюкзак',                 categoryId: 'cat-bags',       merchant: 'TextileShop',     merchantId: 'm-002', status: 'active',     price: 12990,  stock: 23,  photoCount: 4, rating: 4.4, sales: 167, createdAt: '05.02.2026 11:00', updatedAt: '13.02.2026 12:00' }),
  mk({ id: 'p-008', sku: 'SKU-FOO-001', name: 'Пицца «Маргарита» 30 см',        categoryId: 'cat-restaurant', merchant: 'Кафе «Уют»',      merchantId: 'm-004', status: 'active',     price: 590,    stock: 0,   photoCount: 1, rating: 4.7, sales: 1234,createdAt: '10.01.2026 08:00', updatedAt: '14.02.2026 12:30' }),
  mk({ id: 'p-009', sku: 'SKU-FOO-002', name: 'Бургер двойной говяжий',         categoryId: 'cat-restaurant', merchant: 'Кафе «Уют»',      merchantId: 'm-004', status: 'blocked',    price: 450,    stock: 0,   photoCount: 0, rating: 3.2, sales: 89,  createdAt: '20.01.2026 10:00', updatedAt: '12.02.2026 18:00' }),
  mk({ id: 'p-010', sku: 'SKU-GRO-001', name: 'Молоко 3.2% 1л',                 categoryId: 'cat-grocery',    merchant: 'FreshMart',       merchantId: 'm-005', status: 'active',     price: 89,     stock: 230, photoCount: 1, rating: 4.5, sales: 456, createdAt: '15.01.2026 09:00', updatedAt: '14.02.2026 09:30' }),
  mk({ id: 'p-011', sku: 'SKU-GRO-002', name: 'Хлеб «Бородинский»',             categoryId: 'cat-grocery',    merchant: 'Пекарня «Хлеб»',  merchantId: 'm-006', status: 'active',     price: 65,     stock: 87,  photoCount: 2, rating: 4.6, sales: 678, createdAt: '12.01.2026 07:00', updatedAt: '14.02.2026 08:00' }),
  mk({ id: 'p-012', sku: 'SKU-PHA-001', name: 'Парацетамол 500 мг',             categoryId: 'cat-pharmacy',   merchant: 'Аптека-24',       merchantId: 'm-007', status: 'active',     price: 95,     stock: 540, photoCount: 1, rating: 4.8, sales: 234, createdAt: '08.01.2026 09:00', updatedAt: '13.02.2026 10:00' }),
  mk({ id: 'p-013', sku: 'SKU-FLO-001', name: 'Букет «Весенний» 21 роза',       categoryId: 'cat-flowers',    merchant: 'ЦветочныйРай',    merchantId: 'm-008', status: 'archived',   price: 4990,   stock: 0,   photoCount: 0, rating: 4.2, sales: 45,  createdAt: '01.01.2026 12:00', updatedAt: '10.02.2026 12:00' }),
  mk({ id: 'p-014', sku: 'SKU-PHN-003', name: 'Xiaomi Redmi Note 13',           categoryId: 'cat-phones',     merchant: 'TechStore MSK',   merchantId: 'm-009', status: 'moderation', price: 19990,  stock: 100, photoCount: 0, rating: 0,   sales: 0,   createdAt: '14.02.2026 08:00', updatedAt: '14.02.2026 08:00' }),
  mk({ id: 'p-015', sku: 'SKU-AUD-002', name: 'JBL Charge 5 портативная',       categoryId: 'cat-audio',      merchant: 'TechStore MSK',   merchantId: 'm-009', status: 'active',     price: 14990,  stock: 35,  photoCount: 4, rating: 4.6, sales: 178, createdAt: '20.01.2026 14:00', updatedAt: '13.02.2026 17:00' }),
  // ── Own-brand (platform-owned) products ──
  mk({ id: 'p-c01', sku: 'PVZ-MERCH-001', name: 'PVZ Platform · Брендированный картон XL', categoryId: 'cat-bags',     merchant: 'PVZ Platform',  merchantId: COMPANY_MERCHANT_ID, status: 'active',     price: 290,   stock: 1500, photoCount: 3, rating: 4.7, sales: 980, createdAt: '01.01.2026 10:00', updatedAt: '14.02.2026 12:00' }),
  mk({ id: 'p-c02', sku: 'PVZ-MERCH-002', name: 'PVZ Platform · Скотч с логотипом',         categoryId: 'cat-bags',     merchant: 'PVZ Platform',  merchantId: COMPANY_MERCHANT_ID, status: 'active',     price: 120,   stock: 3200, photoCount: 2, rating: 4.6, sales: 1450, createdAt: '01.01.2026 10:00', updatedAt: '14.02.2026 12:00' }),
  mk({ id: 'p-c03', sku: 'PVZ-PRINT-001', name: 'Этикетки термо 58×40 (рулон 1000)',        categoryId: 'cat-bags',     merchant: 'PVZ Platform',  merchantId: COMPANY_MERCHANT_ID, status: 'active',     price: 380,   stock: 540,  photoCount: 1, rating: 4.5, sales: 320, createdAt: '01.01.2026 10:00', updatedAt: '14.02.2026 12:00' }),
  mk({ id: 'p-c04', sku: 'PVZ-MERCH-003', name: 'PVZ Platform · Униформа курьера (M)',      categoryId: 'cat-clothing', merchant: 'PVZ Platform',  merchantId: COMPANY_MERCHANT_ID, status: 'moderation', price: 2490,  stock: 80,   photoCount: 0, rating: 0,   sales: 0,   createdAt: '10.02.2026 12:00', updatedAt: '14.02.2026 08:00' }),
  mk({ id: 'p-c05', sku: 'PVZ-PRINT-002', name: 'Стикеры «Хрупкое» (100 шт)',               categoryId: 'cat-bags',     merchant: 'PVZ Platform',  merchantId: COMPANY_MERCHANT_ID, status: 'active',     price: 180,   stock: 920,  photoCount: 1, rating: 4.4, sales: 215, createdAt: '15.01.2026 10:00', updatedAt: '13.02.2026 17:00' }),
];

// ─── Recommendation slots ────────────────────────────────────────────────────

export const RECOMMENDATIONS_INITIAL: RecommendationSlot[] = [
  { id: 'rec-001', productId: 'p-001', productName: 'iPhone 15 Pro 256 GB',     position: 'home',          priority: 1, startDate: '01.02.2026', endDate: '01.05.2026', active: true,  addedBy: 'Супер Админ',  addedByRole: 'SuperAdmin', addedAt: '01.02.2026 10:00' },
  { id: 'rec-002', productId: 'p-008', productName: 'Пицца «Маргарита» 30 см',  position: 'sale_of_week',  priority: 1, startDate: '10.02.2026', endDate: '17.02.2026', active: true,  addedBy: 'Карпова А.И.', addedByRole: 'Marketing',  addedAt: '10.02.2026 09:30' },
  { id: 'rec-003', productId: 'p-006', productName: 'Кроссовки Nike Air 42',    position: 'first_rows',    priority: 2, startDate: '05.02.2026', endDate: '05.03.2026', active: true,  addedBy: 'Иванов И.И.',  addedByRole: 'Manager',    addedAt: '05.02.2026 11:00' },
  { id: 'rec-004', productId: 'p-011', productName: 'Хлеб «Бородинский»',       position: 'popular_block', priority: 3, startDate: '01.02.2026', endDate: '01.03.2026', active: false, addedBy: 'Карпова А.И.', addedByRole: 'Marketing',  addedAt: '01.02.2026 12:00' },
  { id: 'rec-005', productId: 'p-c01', productName: 'PVZ · Брендированный картон XL', position: 'for_you', priority: 5, startDate: '01.02.2026', endDate: '01.06.2026', active: true,  addedBy: 'Супер Админ',  addedByRole: 'SuperAdmin', addedAt: '01.02.2026 10:30' },
];

// ─── Media (sample initial set) ──────────────────────────────────────────────

export const MEDIA: ProductMediaItem[] = [
  { id: 'med-001', productId: 'p-001', productName: 'iPhone 15 Pro',           url: '', bg: 'bg-blue-100',  emoji: '📱', filename: 'iphone15pro-front.jpg',  sizeLabel: '1.2 МБ', status: 'approved', uploadedAt: '15.01.2026 10:00', uploader: 'ЭлектроМир' },
  { id: 'med-002', productId: 'p-001', productName: 'iPhone 15 Pro',           url: '', bg: 'bg-blue-100',  emoji: '📱', filename: 'iphone15pro-back.jpg',   sizeLabel: '1.4 МБ', status: 'approved', uploadedAt: '15.01.2026 10:01', uploader: 'ЭлектроМир' },
  { id: 'med-003', productId: 'p-002', productName: 'Galaxy S24 Ultra',        url: '', bg: 'bg-violet-100',emoji: '📱', filename: 'galaxy-s24-front.jpg',   sizeLabel: '1.1 МБ', status: 'approved', uploadedAt: '20.01.2026 11:30', uploader: 'ЭлектроМир' },
  { id: 'med-004', productId: 'p-005', productName: 'Хлопковая футболка',      url: '', bg: 'bg-amber-100', emoji: '👕', filename: 'tshirt-front.jpg',       sizeLabel: '0.8 МБ', status: 'pending',  uploadedAt: '14.02.2026 09:30', uploader: 'TextileShop' },
  { id: 'med-005', productId: 'p-006', productName: 'Кроссовки Nike Air',      url: '', bg: 'bg-orange-100',emoji: '👟', filename: 'nike-air-side.jpg',      sizeLabel: '1.0 МБ', status: 'approved', uploadedAt: '01.02.2026 14:00', uploader: 'SportZone' },
  { id: 'med-006', productId: 'p-007', productName: 'Кожаный рюкзак',          url: '', bg: 'bg-amber-100', emoji: '👜', filename: 'backpack.jpg',           sizeLabel: '1.3 МБ', status: 'approved', uploadedAt: '05.02.2026 11:00', uploader: 'TextileShop' },
  { id: 'med-007', productId: 'p-008', productName: 'Пицца «Маргарита»',       url: '', bg: 'bg-red-100',   emoji: '🍕', filename: 'margherita.jpg',         sizeLabel: '0.9 МБ', status: 'approved', uploadedAt: '10.01.2026 08:30', uploader: 'Кафе «Уют»' },
  { id: 'med-008', productId: 'p-014', productName: 'Xiaomi Redmi Note 13',    url: '', bg: 'bg-blue-100',  emoji: '📱', filename: 'xiaomi-front.jpg',       sizeLabel: '1.0 МБ', status: 'pending',  uploadedAt: '14.02.2026 08:30', uploader: 'TechStore MSK' },
  { id: 'med-009', productId: 'p-009', productName: 'Бургер двойной говяжий',  url: '', bg: 'bg-amber-100', emoji: '🍔', filename: 'burger-old.jpg',         sizeLabel: '0.7 МБ', status: 'rejected', uploadedAt: '20.01.2026 10:00', uploader: 'Кафе «Уют»' },
  { id: 'med-010', productId: 'p-015', productName: 'JBL Charge 5',            url: '', bg: 'bg-purple-100',emoji: '🔊', filename: 'jbl-charge-5.jpg',       sizeLabel: '1.1 МБ', status: 'approved', uploadedAt: '20.01.2026 14:30', uploader: 'TechStore MSK' },
  // ── Videos (placeholder, no real source) ──
  { id: 'vid-001', productId: 'p-001', productName: 'iPhone 15 Pro',           url: '', bg: 'bg-blue-200',  emoji: '🎬', filename: 'iphone15pro-demo.mp4',  sizeLabel: '8.4 МБ', status: 'approved', uploadedAt: '15.01.2026 10:30', uploader: 'ЭлектроМир',       mediaType: 'video', videoMimeType: 'video/mp4' },
  { id: 'vid-002', productId: 'p-006', productName: 'Кроссовки Nike Air',     url: '', bg: 'bg-orange-200',emoji: '🎬', filename: 'nike-360.webm',         sizeLabel: '5.2 МБ', status: 'approved', uploadedAt: '01.02.2026 14:30', uploader: 'SportZone',        mediaType: 'video', videoMimeType: 'video/webm' },
  { id: 'vid-003', productId: 'p-008', productName: 'Пицца «Маргарита»',      url: '', bg: 'bg-red-200',   emoji: '🎬', filename: 'margherita-cooking.mp4',sizeLabel: '12.1 МБ',status: 'pending',  uploadedAt: '14.02.2026 10:00', uploader: 'Кафе «Уют»',       mediaType: 'video', videoMimeType: 'video/mp4' },
  { id: 'vid-004', productId: 'p-014', productName: 'Xiaomi Redmi Note 13',   url: '', bg: 'bg-blue-200',  emoji: '🎬', filename: 'xiaomi-unbox.mp4',      sizeLabel: '7.8 МБ', status: 'pending',  uploadedAt: '14.02.2026 09:00', uploader: 'TechStore MSK',    mediaType: 'video', videoMimeType: 'video/mp4' },
];

// Helper: filter media by product
export function mediaForProduct(productId: string, all: ProductMediaItem[] = MEDIA): ProductMediaItem[] {
  return all.filter(m => m.productId === productId);
}
export function photosForProduct(productId: string, all: ProductMediaItem[] = MEDIA): ProductMediaItem[] {
  return all.filter(m => m.productId === productId && (m.mediaType ?? 'image') === 'image');
}
export function videosForProduct(productId: string, all: ProductMediaItem[] = MEDIA): ProductMediaItem[] {
  return all.filter(m => m.productId === productId && m.mediaType === 'video');
}

export function getCategoryName(id: string): string {
  return CATEGORIES.find(c => c.id === id)?.name ?? id;
}

export function fmtPrice(n: number): string {
  return `₽${n.toLocaleString('ru-RU')}`;
}
