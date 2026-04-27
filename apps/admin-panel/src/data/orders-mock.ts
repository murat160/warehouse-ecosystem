// =====================================================
// Orders Module — Types & Mock Data
// Professional admin panel for PVZ & delivery network
// =====================================================

export type OrderStatus = 'new' | 'accepted' | 'preparing' | 'ready' | 'pickup_ready' | 'courier_assigned' | 'in_transit' | 'at_pvz' | 'delivered' | 'cancelled' | 'returned';
export type DeliveryType = 'delivery' | 'pickup' | 'pvz';
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'partial_refund';

export interface OrderItem {
  id: string;
  sku: string;
  name: string;
  imageUrl: string;
  qty: number;
  price: number;
  total: number;
}

export interface OrderTimeline {
  id: string;
  status: string;
  time: string;
  actor: string;
  description: string;
}

export interface Order {
  id: string;
  orderNumber: string; // ← главный номер заказа, всегда виден
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  deliveryType: DeliveryType;
  status: OrderStatus;
  total: number;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  itemsCount: number;
  createdAt: string;
  updatedAt: string;
  slaDeadline: string;
  isOverdue: boolean;
  pvzCode: string | null;
  pvzName: string | null;
  courierName: string | null;
  courierId: string | null;
  merchant: string;
  merchantId: string;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  pickupCode: string | null;
  storageCell: string | null;
  deliveryAddress: string | null;
  weight: number; // kg
  items: OrderItem[];
  timeline: OrderTimeline[];
  notes: string;
}

import { PRODUCT_IMAGES } from './product-images';

export const ORDERS: Order[] = [
  {
    id: '1',
    orderNumber: 'ORD-2026-000456',
    customerName: 'Иванов Алексей Петрович',
    customerPhone: '+7 (999) 123-45-23',
    customerEmail: 'ivanov@mail.ru',
    deliveryType: 'pvz',
    status: 'at_pvz',
    total: 3450,
    subtotal: 3450,
    deliveryFee: 0,
    discount: 0,
    itemsCount: 3,
    createdAt: '14.02.2026 10:23',
    updatedAt: '14.02.2026 15:30',
    slaDeadline: '14.02.2026 18:00',
    isOverdue: false,
    pvzCode: 'MSK-001',
    pvzName: 'ПВЗ Тверская',
    courierName: null,
    courierId: null,
    merchant: 'Магазин Электроники',
    merchantId: 'slr-001',
    paymentStatus: 'paid',
    paymentMethod: 'Банковская карта •••• 4523',
    pickupCode: '1234',
    storageCell: 'A-42',
    deliveryAddress: null,
    weight: 0.85,
    items: [
      { id: 'oi-1', sku: 'ELEC-001', name: 'Беспроводные наушники TWS', imageUrl: PRODUCT_IMAGES.airpods, qty: 1, price: 2450, total: 2450 },
      { id: 'oi-2', sku: 'ELEC-002', name: 'Зарядное устройство USB-C', imageUrl: PRODUCT_IMAGES.magsafe, qty: 1, price: 500, total: 500 },
      { id: 'oi-3', sku: 'ACC-003', name: 'Чехол силиконовый', imageUrl: PRODUCT_IMAGES.iphone, qty: 1, price: 500, total: 500 },
    ],
    timeline: [
      { id: 't-1', status: 'created', time: '14.02.2026 10:23', actor: 'Система', description: 'Заказ создан' },
      { id: 't-2', status: 'accepted', time: '14.02.2026 10:25', actor: 'Магазин Электроники', description: 'Заказ принят продавцом' },
      { id: 't-3', status: 'preparing', time: '14.02.2026 10:30', actor: 'Магазин Электроники', description: 'Начата сборка заказа' },
      { id: 't-4', status: 'ready', time: '14.02.2026 11:15', actor: 'Магазин Электроники', description: 'Заказ готов к передаче' },
      { id: 't-5', status: 'at_warehouse', time: '14.02.2026 12:30', actor: 'Склад MSK-WH-01', description: 'Принято на склад' },
      { id: 't-6', status: 'shipped_to_pvz', time: '14.02.2026 14:00', actor: 'Склад MSK-WH-01', description: 'Отправлено на ПВЗ MSK-001' },
      { id: 't-7', status: 'at_pvz', time: '14.02.2026 15:30', actor: 'ПВЗ MSK-001 (Иванов И.)', description: 'Принято на ПВЗ, ячейка A-42' },
    ],
    notes: '',
  },
  {
    id: '2',
    orderNumber: 'ORD-2026-000457',
    customerName: 'Петрова Мария Сергеевна',
    customerPhone: '+7 (999) 234-56-45',
    customerEmail: 'petrova@yandex.ru',
    deliveryType: 'delivery',
    status: 'in_transit',
    total: 1250,
    subtotal: 1050,
    deliveryFee: 200,
    discount: 0,
    itemsCount: 1,
    createdAt: '14.02.2026 11:15',
    updatedAt: '14.02.2026 13:10',
    slaDeadline: '14.02.2026 14:30',
    isOverdue: false,
    pvzCode: null,
    pvzName: null,
    courierName: 'Алексей Карпов',
    courierId: 'courier1',
    merchant: 'Ресторан Вкусно',
    merchantId: 'slr-002',
    paymentStatus: 'paid',
    paymentMethod: 'Apple Pay',
    pickupCode: null,
    storageCell: null,
    deliveryAddress: 'Москва, ул. Ленина, д. 42, кв. 15',
    weight: 1.2,
    items: [
      { id: 'oi-4', sku: 'FOOD-001', name: 'Бургер Классик + Фри + Кола', imageUrl: PRODUCT_IMAGES.burger, qty: 1, price: 1050, total: 1050 },
    ],
    timeline: [
      { id: 't-8', status: 'created', time: '14.02.2026 11:15', actor: 'Система', description: 'Заказ создан' },
      { id: 't-9', status: 'accepted', time: '14.02.2026 11:17', actor: 'Ресторан Вкусно', description: 'Заказ принят' },
      { id: 't-10', status: 'preparing', time: '14.02.2026 11:18', actor: 'Ресторан Вкусно', description: 'Готовка начата' },
      { id: 't-11', status: 'ready', time: '14.02.2026 11:40', actor: 'Ресторан Вкусно', description: 'Заказ готов' },
      { id: 't-12', status: 'courier_assigned', time: '14.02.2026 11:42', actor: 'Система', description: 'Назначен курьер: Алексей Карпов' },
      { id: 't-13', status: 'in_transit', time: '14.02.2026 13:10', actor: 'Алексей Карпов', description: 'Курьер в пути' },
    ],
    notes: 'Клиент просил не звонить в дверь',
  },
  {
    id: '3',
    orderNumber: 'ORD-2026-000458',
    customerName: 'Сидоров Игорь Викторович',
    customerPhone: '+7 (999) 345-67-67',
    customerEmail: 'sidorov@gmail.com',
    deliveryType: 'delivery',
    status: 'preparing',
    total: 890,
    subtotal: 690,
    deliveryFee: 200,
    discount: 0,
    itemsCount: 2,
    createdAt: '14.02.2026 11:45',
    updatedAt: '14.02.2026 12:00',
    slaDeadline: '14.02.2026 13:00',
    isOverdue: true,
    pvzCode: null,
    pvzName: null,
    courierName: null,
    courierId: null,
    merchant: 'Кафе Утро',
    merchantId: 'slr-002',
    paymentStatus: 'paid',
    paymentMethod: 'СБП',
    pickupCode: null,
    storageCell: null,
    deliveryAddress: 'Москва, пр. Мира, д. 18',
    weight: 0.6,
    items: [
      { id: 'oi-5', sku: 'FOOD-010', name: 'Капучино большой', imageUrl: PRODUCT_IMAGES.coffee, qty: 1, price: 390, total: 390 },
      { id: 'oi-6', sku: 'FOOD-011', name: 'Круассан с шоколадом', imageUrl: PRODUCT_IMAGES.croissant, qty: 1, price: 300, total: 300 },
    ],
    timeline: [
      { id: 't-14', status: 'created', time: '14.02.2026 11:45', actor: 'Система', description: 'Заказ создан' },
      { id: 't-15', status: 'accepted', time: '14.02.2026 11:47', actor: 'Кафе Утро', description: 'Заказ принят' },
      { id: 't-16', status: 'preparing', time: '14.02.2026 12:00', actor: 'Кафе Утро', description: 'Подготовка заказа' },
    ],
    notes: '',
  },
  {
    id: '4',
    orderNumber: 'ORD-2026-000459',
    customerName: 'Козлова Екатерина Андреевна',
    customerPhone: '+7 (999) 456-78-89',
    customerEmail: 'kozlova@mail.ru',
    deliveryType: 'pvz',
    status: 'delivered',
    total: 5670,
    subtotal: 5670,
    deliveryFee: 0,
    discount: 0,
    itemsCount: 5,
    createdAt: '13.02.2026 16:20',
    updatedAt: '14.02.2026 11:15',
    slaDeadline: '14.02.2026 12:00',
    isOverdue: false,
    pvzCode: 'MSK-002',
    pvzName: 'ПВЗ Арбат',
    courierName: null,
    courierId: null,
    merchant: 'MarketPro',
    merchantId: 'slr-006',
    paymentStatus: 'paid',
    paymentMethod: 'Банковская карта •••• 8901',
    pickupCode: '5678',
    storageCell: 'B-17',
    deliveryAddress: null,
    weight: 3.4,
    items: [
      { id: 'oi-7', sku: 'MKT-001', name: 'Наушники AirPods Pro 2', imageUrl: PRODUCT_IMAGES.airpods, qty: 1, price: 2490, total: 2490 },
      { id: 'oi-8', sku: 'MKT-002', name: 'Зарядное MagSafe', imageUrl: PRODUCT_IMAGES.magsafe, qty: 2, price: 990, total: 1980 },
      { id: 'oi-9', sku: 'MKT-003', name: 'Чехол iPhone 15', imageUrl: PRODUCT_IMAGES.iphone, qty: 1, price: 600, total: 600 },
      { id: 'oi-10', sku: 'MKT-004', name: 'Защитное стекло', imageUrl: PRODUCT_IMAGES.iphone, qty: 1, price: 600, total: 600 },
    ],
    timeline: [
      { id: 't-17', status: 'created', time: '13.02.2026 16:20', actor: 'Система', description: 'Заказ создан' },
      { id: 't-18', status: 'accepted', time: '13.02.2026 16:22', actor: 'MarketPro', description: 'Заказ принят' },
      { id: 't-19', status: 'preparing', time: '13.02.2026 16:30', actor: 'MarketPro', description: 'Начата сборка' },
      { id: 't-20', status: 'ready', time: '13.02.2026 17:45', actor: 'MarketPro', description: 'Заказ собран' },
      { id: 't-21', status: 'at_pvz', time: '13.02.2026 20:10', actor: 'ПВЗ Арбат', description: 'Принято на ПВЗ, ячейка B-17' },
      { id: 't-22', status: 'delivered', time: '14.02.2026 11:15', actor: 'ПВЗ Арбат (Смирнова Е.)', description: 'Выдано клиенту, код 5678' },
    ],
    notes: '',
  },
  {
    id: '5',
    orderNumber: 'ORD-2026-000460',
    customerName: 'Новиков Сергей Дмитриевич',
    customerPhone: '+7 (999) 567-89-12',
    customerEmail: 'novikov@yandex.ru',
    deliveryType: 'pickup',
    status: 'ready',
    total: 2340,
    subtotal: 2340,
    deliveryFee: 0,
    discount: 0,
    itemsCount: 2,
    createdAt: '14.02.2026 12:05',
    updatedAt: '14.02.2026 12:45',
    slaDeadline: '14.02.2026 14:00',
    isOverdue: false,
    pvzCode: null,
    pvzName: null,
    courierName: null,
    courierId: null,
    merchant: 'Пекарня Хлеб',
    merchantId: 'slr-002',
    paymentStatus: 'paid',
    paymentMethod: 'Google Pay',
    pickupCode: '9012',
    storageCell: null,
    deliveryAddress: null,
    weight: 1.1,
    items: [
      { id: 'oi-11', sku: 'FOOD-020', name: 'Торт Наполеон 1кг', imageUrl: PRODUCT_IMAGES.croissant, qty: 1, price: 1540, total: 1540 },
      { id: 'oi-12', sku: 'FOOD-021', name: 'Набор макаронс (12 шт)', imageUrl: PRODUCT_IMAGES.croissant, qty: 1, price: 800, total: 800 },
    ],
    timeline: [
      { id: 't-23', status: 'created', time: '14.02.2026 12:05', actor: 'Система', description: 'Заказ создан' },
      { id: 't-24', status: 'accepted', time: '14.02.2026 12:07', actor: 'Пекарня Хлеб', description: 'Заказ принят' },
      { id: 't-25', status: 'preparing', time: '14.02.2026 12:10', actor: 'Пекарня Хлеб', description: 'Подготовка заказа' },
      { id: 't-26', status: 'ready', time: '14.02.2026 12:45', actor: 'Пекарня Хлеб', description: 'Заказ готов к самовывозу' },
    ],
    notes: '',
  },
  {
    id: '6',
    orderNumber: 'ORD-2026-000461',
    customerName: 'Морозова Анна Владимировна',
    customerPhone: '+7 (999) 678-90-34',
    customerEmail: 'morozova@mail.ru',
    deliveryType: 'delivery',
    status: 'courier_assigned',
    total: 1780,
    subtotal: 1580,
    deliveryFee: 200,
    discount: 0,
    itemsCount: 3,
    createdAt: '14.02.2026 12:30',
    updatedAt: '14.02.2026 13:15',
    slaDeadline: '14.02.2026 15:00',
    isOverdue: false,
    pvzCode: null,
    pvzName: null,
    courierName: 'Иванов Иван',
    courierId: '1',
    merchant: 'Ресторан Суши',
    merchantId: 'slr-002',
    paymentStatus: 'paid',
    paymentMethod: 'Банковская карта •••• 7654',
    pickupCode: null,
    storageCell: null,
    deliveryAddress: 'Москва, ул. Цветочная, д. 7, кв. 3',
    weight: 1.5,
    items: [
      { id: 'oi-13', sku: 'FOOD-030', name: 'Сет Филадельфия (24 шт)', imageUrl: PRODUCT_IMAGES.sushi, qty: 1, price: 890, total: 890 },
      { id: 'oi-14', sku: 'FOOD-031', name: 'Мисо суп', imageUrl: PRODUCT_IMAGES.sushi, qty: 2, price: 290, total: 580 },
      { id: 'oi-15', sku: 'FOOD-032', name: 'Эдамаме', imageUrl: PRODUCT_IMAGES.salad, qty: 1, price: 110, total: 110 },
    ],
    timeline: [
      { id: 't-27', status: 'created', time: '14.02.2026 12:30', actor: 'Система', description: 'Заказ создан' },
      { id: 't-28', status: 'accepted', time: '14.02.2026 12:32', actor: 'Ресторан Суши', description: 'Заказ принят' },
      { id: 't-29', status: 'preparing', time: '14.02.2026 12:35', actor: 'Ресторан Суши', description: 'Готовка начата' },
      { id: 't-30', status: 'ready', time: '14.02.2026 13:00', actor: 'Ресторан Суши', description: 'Заказ готов' },
      { id: 't-31', status: 'courier_assigned', time: '14.02.2026 13:15', actor: 'Система', description: 'Назначен курьер: Иванов И.' },
    ],
    notes: 'Домофон: 73#',
  },
  {
    id: '7',
    orderNumber: 'ORD-2026-000462',
    customerName: 'Белов Дмитрий Олегович',
    customerPhone: '+7 (999) 789-01-56',
    customerEmail: 'belov@gmail.com',
    deliveryType: 'pvz',
    status: 'new',
    total: 89990,
    subtotal: 89990,
    deliveryFee: 0,
    discount: 0,
    itemsCount: 1,
    createdAt: '14.02.2026 13:45',
    updatedAt: '14.02.2026 13:45',
    slaDeadline: '15.02.2026 18:00',
    isOverdue: false,
    pvzCode: 'MSK-001',
    pvzName: 'ПВЗ Тверская',
    courierName: null,
    courierId: null,
    merchant: 'ЭлектроМир',
    merchantId: 'slr-001',
    paymentStatus: 'paid',
    paymentMethod: 'Кредит Тинькофф',
    pickupCode: null,
    storageCell: null,
    deliveryAddress: null,
    weight: 0.4,
    items: [
      { id: 'oi-16', sku: 'ELM-PH-002', name: 'Смартфон iPhone 15', imageUrl: PRODUCT_IMAGES.iphone, qty: 1, price: 89990, total: 89990 },
    ],
    timeline: [
      { id: 't-32', status: 'created', time: '14.02.2026 13:45', actor: 'Система', description: 'Заказ создан' },
    ],
    notes: '',
  },
  {
    id: '8',
    orderNumber: 'ORD-2026-000463',
    customerName: 'Волкова Татьяна Николаевна',
    customerPhone: '+7 (999) 890-12-78',
    customerEmail: 'volkova@yandex.ru',
    deliveryType: 'delivery',
    status: 'cancelled',
    total: 2890,
    subtotal: 2690,
    deliveryFee: 200,
    discount: 0,
    itemsCount: 2,
    createdAt: '14.02.2026 09:00',
    updatedAt: '14.02.2026 09:45',
    slaDeadline: '14.02.2026 12:00',
    isOverdue: false,
    pvzCode: null,
    pvzName: null,
    courierName: null,
    courierId: null,
    merchant: 'FreshMart',
    merchantId: 'slr-003',
    paymentStatus: 'refunded',
    paymentMethod: 'Банковская карта •••• 1234',
    pickupCode: null,
    storageCell: null,
    deliveryAddress: 'Москва, Бульвар Дмитрия Донского, д. 11',
    weight: 4.2,
    items: [
      { id: 'oi-17', sku: 'GRC-001', name: 'Продуктовый набор «Завтрак»', imageUrl: PRODUCT_IMAGES.groceries, qty: 1, price: 1690, total: 1690 },
      { id: 'oi-18', sku: 'GRC-002', name: 'Свежие фрукты ассорти', imageUrl: PRODUCT_IMAGES.groceries, qty: 1, price: 1000, total: 1000 },
    ],
    timeline: [
      { id: 't-33', status: 'created', time: '14.02.2026 09:00', actor: 'Система', description: 'Заказ создан' },
      { id: 't-34', status: 'accepted', time: '14.02.2026 09:05', actor: 'FreshMart', description: 'Заказ принят' },
      { id: 't-35', status: 'cancelled', time: '14.02.2026 09:45', actor: 'Клиент', description: 'Заказ отменён клиентом (передумал)' },
    ],
    notes: 'Причина отмены: клиент передумал',
  },
  {
    id: '9',
    orderNumber: 'ORD-2026-000464',
    customerName: 'Кузнецов Максим Андреевич',
    customerPhone: '+7 (999) 901-23-90',
    customerEmail: 'kuznetsov@mail.ru',
    deliveryType: 'pvz',
    status: 'accepted',
    total: 134990,
    subtotal: 134990,
    deliveryFee: 0,
    discount: 0,
    itemsCount: 1,
    createdAt: '14.02.2026 14:00',
    updatedAt: '14.02.2026 14:05',
    slaDeadline: '16.02.2026 18:00',
    isOverdue: false,
    pvzCode: 'SPB-001',
    pvzName: 'ПВЗ Невский',
    courierName: null,
    courierId: null,
    merchant: 'ЭлектроМир',
    merchantId: 'slr-001',
    paymentStatus: 'paid',
    paymentMethod: 'Рассрочка',
    pickupCode: null,
    storageCell: null,
    deliveryAddress: null,
    weight: 1.6,
    items: [
      { id: 'oi-19', sku: 'ELM-LP-003', name: 'Ноутбук MacBook Air M3', imageUrl: PRODUCT_IMAGES.macbook, qty: 1, price: 134990, total: 134990 },
    ],
    timeline: [
      { id: 't-36', status: 'created', time: '14.02.2026 14:00', actor: 'Система', description: 'Заказ создан' },
      { id: 't-37', status: 'accepted', time: '14.02.2026 14:05', actor: 'ЭлектроМир', description: 'Заказ принят продавцом' },
    ],
    notes: '',
  },
  {
    id: '10',
    orderNumber: 'ORD-2026-000465',
    customerName: 'Соколова Ольга Игоревна',
    customerPhone: '+7 (999) 012-34-12',
    customerEmail: 'sokolova@gmail.com',
    deliveryType: 'delivery',
    status: 'delivered',
    total: 567,
    subtotal: 567,
    deliveryFee: 0,
    discount: 0,
    itemsCount: 1,
    createdAt: '13.02.2026 18:30',
    updatedAt: '13.02.2026 19:45',
    slaDeadline: '13.02.2026 20:00',
    isOverdue: false,
    pvzCode: null,
    pvzName: null,
    courierName: 'Морозова Мария',
    courierId: '6',
    merchant: 'Цветочный Рай',
    merchantId: 'slr-008',
    paymentStatus: 'paid',
    paymentMethod: 'Apple Pay',
    pickupCode: null,
    storageCell: null,
    deliveryAddress: 'Москва, ул. Покровка, д. 25',
    weight: 0.5,
    items: [
      { id: 'oi-20', sku: 'FLW-001', name: 'Букет тюльпанов (7 шт)', imageUrl: PRODUCT_IMAGES.tulips, qty: 1, price: 567, total: 567 },
    ],
    timeline: [
      { id: 't-38', status: 'created', time: '13.02.2026 18:30', actor: 'Система', description: 'Заказ создан' },
      { id: 't-39', status: 'accepted', time: '13.02.2026 18:32', actor: 'Цветочный Рай', description: 'Заказ принят' },
      { id: 't-40', status: 'preparing', time: '13.02.2026 18:35', actor: 'Цветочный Рай', description: 'Формирование букета' },
      { id: 't-41', status: 'ready', time: '13.02.2026 18:55', actor: 'Цветочный Рай', description: 'Заказ готов' },
      { id: 't-42', status: 'courier_assigned', time: '13.02.2026 18:58', actor: 'Система', description: 'Назначен курьер: Морозова М.' },
      { id: 't-43', status: 'in_transit', time: '13.02.2026 19:05', actor: 'Морозова М.', description: 'Курьер в пути' },
      { id: 't-44', status: 'delivered', time: '13.02.2026 19:45', actor: 'Морозова М.', description: 'Доставлено клиенту' },
    ],
    notes: '',
  },
];

// --- Helper functions ---

export function getOrderById(id: string): Order | undefined {
  return ORDERS.find(o => o.id === id);
}

export function getOrderByNumber(orderNumber: string): Order | undefined {
  return ORDERS.find(o => o.orderNumber === orderNumber);
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'Новый',
  accepted: 'Принят',
  preparing: 'Готовится',
  ready: 'Готов',
  pickup_ready: 'Готов к самовывозу',
  courier_assigned: 'Курьер назначен',
  in_transit: 'В пути',
  at_pvz: 'На ПВЗ',
  delivered: 'Доставлен',
  cancelled: 'Отменён',
  returned: 'Возврат',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  new: 'bg-blue-100 text-blue-700',
  accepted: 'bg-blue-100 text-blue-700',
  preparing: 'bg-yellow-100 text-yellow-700',
  ready: 'bg-green-100 text-green-700',
  pickup_ready: 'bg-green-100 text-green-700',
  courier_assigned: 'bg-purple-100 text-purple-700',
  in_transit: 'bg-purple-100 text-purple-700',
  at_pvz: 'bg-green-100 text-green-700',
  delivered: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
  returned: 'bg-orange-100 text-orange-700',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Ожидает',
  paid: 'Оплачено',
  refunded: 'Возврат',
  partial_refund: 'Частичный возврат',
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  pending: 'text-yellow-600',
  paid: 'text-green-600',
  refunded: 'text-red-600',
  partial_refund: 'text-orange-600',
};

export function formatCurrency(amount: number): string {
  return `₽${amount.toLocaleString('ru-RU')}`;
}