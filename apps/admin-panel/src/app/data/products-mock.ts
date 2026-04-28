// Shared mock data for the Products section (admin panel).
// Keeps types + mock arrays in one place so ProductsList / ProductCategories /
// ProductMedia can reference the same dataset.

export type ProductStatus = 'active' | 'moderation' | 'blocked' | 'archived';

export const PRODUCT_STATUS_CFG: Record<ProductStatus, { label: string; cls: string; dot: string }> = {
  active:     { label: 'Активный',      cls: 'bg-green-100 text-green-700',  dot: 'bg-green-500'  },
  moderation: { label: 'На модерации',  cls: 'bg-yellow-100 text-yellow-700',dot: 'bg-yellow-500' },
  blocked:    { label: 'Заблокирован',  cls: 'bg-red-100 text-red-700',      dot: 'bg-red-500'    },
  archived:   { label: 'В архиве',      cls: 'bg-gray-100 text-gray-600',    dot: 'bg-gray-400'   },
};

export interface Product {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  merchant: string;
  merchantId: string;
  status: ProductStatus;
  price: number;
  stock: number;
  photoCount: number;
  rating: number;
  sales: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  parentId?: string | null;
  active: boolean;
  icon: string;
  createdAt: string;
}

export type MediaStatus = 'approved' | 'pending' | 'rejected';

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

export const PRODUCTS: Product[] = [
  { id: 'p-001', sku: 'SKU-PHN-001', name: 'iPhone 15 Pro 256 GB',           categoryId: 'cat-phones',     merchant: 'ЭлектроМир',      merchantId: 'm-001', status: 'active',     price: 89990,  stock: 45,  photoCount: 5, rating: 4.8, sales: 234, createdAt: '15.01.2026 10:00', updatedAt: '14.02.2026 09:00' },
  { id: 'p-002', sku: 'SKU-PHN-002', name: 'Samsung Galaxy S24 Ultra',       categoryId: 'cat-phones',     merchant: 'ЭлектроМир',      merchantId: 'm-001', status: 'active',     price: 109990, stock: 12,  photoCount: 4, rating: 4.7, sales: 189, createdAt: '20.01.2026 11:00', updatedAt: '14.02.2026 10:00' },
  { id: 'p-003', sku: 'SKU-LAP-001', name: 'MacBook Pro 14" M3',             categoryId: 'cat-laptops',    merchant: 'ЭлектроМир',      merchantId: 'm-001', status: 'active',     price: 199990, stock: 8,   photoCount: 3, rating: 4.9, sales: 156, createdAt: '10.01.2026 09:30', updatedAt: '13.02.2026 14:00' },
  { id: 'p-004', sku: 'SKU-AUD-001', name: 'AirPods Pro 2',                  categoryId: 'cat-audio',      merchant: 'ЭлектроМир',      merchantId: 'm-001', status: 'active',     price: 22990,  stock: 78,  photoCount: 2, rating: 4.6, sales: 445, createdAt: '12.01.2026 12:00', updatedAt: '14.02.2026 11:00' },
  { id: 'p-005', sku: 'SKU-CLO-001', name: 'Хлопковая футболка (M)',         categoryId: 'cat-clothing',   merchant: 'TextileShop',     merchantId: 'm-002', status: 'moderation', price: 1990,   stock: 340, photoCount: 0, rating: 0,   sales: 0,   createdAt: '14.02.2026 09:30', updatedAt: '14.02.2026 09:30' },
  { id: 'p-006', sku: 'SKU-SHO-001', name: 'Кроссовки Nike Air 42',          categoryId: 'cat-shoes',      merchant: 'SportZone',       merchantId: 'm-003', status: 'active',     price: 9990,   stock: 68,  photoCount: 6, rating: 4.5, sales: 289, createdAt: '01.02.2026 14:00', updatedAt: '13.02.2026 16:00' },
  { id: 'p-007', sku: 'SKU-BAG-001', name: 'Кожаный рюкзак',                 categoryId: 'cat-bags',       merchant: 'TextileShop',     merchantId: 'm-002', status: 'active',     price: 12990,  stock: 23,  photoCount: 4, rating: 4.4, sales: 167, createdAt: '05.02.2026 11:00', updatedAt: '13.02.2026 12:00' },
  { id: 'p-008', sku: 'SKU-FOO-001', name: 'Пицца «Маргарита» 30 см',        categoryId: 'cat-restaurant', merchant: 'Кафе «Уют»',      merchantId: 'm-004', status: 'active',     price: 590,    stock: 0,   photoCount: 1, rating: 4.7, sales: 1234,createdAt: '10.01.2026 08:00', updatedAt: '14.02.2026 12:30' },
  { id: 'p-009', sku: 'SKU-FOO-002', name: 'Бургер двойной говяжий',         categoryId: 'cat-restaurant', merchant: 'Кафе «Уют»',      merchantId: 'm-004', status: 'blocked',    price: 450,    stock: 0,   photoCount: 0, rating: 3.2, sales: 89,  createdAt: '20.01.2026 10:00', updatedAt: '12.02.2026 18:00' },
  { id: 'p-010', sku: 'SKU-GRO-001', name: 'Молоко 3.2% 1л',                 categoryId: 'cat-grocery',    merchant: 'FreshMart',       merchantId: 'm-005', status: 'active',     price: 89,     stock: 230, photoCount: 1, rating: 4.5, sales: 456, createdAt: '15.01.2026 09:00', updatedAt: '14.02.2026 09:30' },
  { id: 'p-011', sku: 'SKU-GRO-002', name: 'Хлеб «Бородинский»',             categoryId: 'cat-grocery',    merchant: 'Пекарня «Хлеб»',  merchantId: 'm-006', status: 'active',     price: 65,     stock: 87,  photoCount: 2, rating: 4.6, sales: 678, createdAt: '12.01.2026 07:00', updatedAt: '14.02.2026 08:00' },
  { id: 'p-012', sku: 'SKU-PHA-001', name: 'Парацетамол 500 мг',             categoryId: 'cat-pharmacy',   merchant: 'Аптека-24',       merchantId: 'm-007', status: 'active',     price: 95,     stock: 540, photoCount: 1, rating: 4.8, sales: 234, createdAt: '08.01.2026 09:00', updatedAt: '13.02.2026 10:00' },
  { id: 'p-013', sku: 'SKU-FLO-001', name: 'Букет «Весенний» 21 роза',       categoryId: 'cat-flowers',    merchant: 'ЦветочныйРай',    merchantId: 'm-008', status: 'archived',   price: 4990,   stock: 0,   photoCount: 0, rating: 4.2, sales: 45,  createdAt: '01.01.2026 12:00', updatedAt: '10.02.2026 12:00' },
  { id: 'p-014', sku: 'SKU-PHN-003', name: 'Xiaomi Redmi Note 13',           categoryId: 'cat-phones',     merchant: 'TechStore MSK',   merchantId: 'm-009', status: 'moderation', price: 19990,  stock: 100, photoCount: 0, rating: 0,   sales: 0,   createdAt: '14.02.2026 08:00', updatedAt: '14.02.2026 08:00' },
  { id: 'p-015', sku: 'SKU-AUD-002', name: 'JBL Charge 5 портативная',       categoryId: 'cat-audio',      merchant: 'TechStore MSK',   merchantId: 'm-009', status: 'active',     price: 14990,  stock: 35,  photoCount: 4, rating: 4.6, sales: 178, createdAt: '20.01.2026 14:00', updatedAt: '13.02.2026 17:00' },
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
];

export function getCategoryName(id: string): string {
  return CATEGORIES.find(c => c.id === id)?.name ?? id;
}

export function fmtPrice(n: number): string {
  return `₽${n.toLocaleString('ru-RU')}`;
}
