// ─── PVZ Scan System — Mock Data ─────────────────────────────────────────────

export type PvzOrderStatus =
  | 'in_transit'          // В пути → принять
  | 'at_pvz'              // На ПВЗ → выдать или вернуть
  | 'issued'              // Выдано → ошибка "уже выдан"
  | 'return_processed'    // Возврат оформлен
  | 'courier_transferred' // Передано курьеру
  | 'expired'             // Истёк срок хранения
  | 'wrong_pvz';          // Другой ПВЗ

export type ScanActionType = 'receive' | 'issue' | 'return' | 'courier' | 'search' | 'error' | 'move';

export interface PvzOrderItem {
  name: string;
  qty: number;
  imageUrl?: string;
}

export interface PvzOrder {
  id: string;
  orderNumber: string;        // ORD-2026-XXXXXX
  trackingNumber: string;     // TRK-XXXXXXXXXX
  pickupCode: string;         // 6-digit code
  qrContent: string;          // what QR encodes (same as pickupCode or trackingNumber)
  barcode: string;            // barcode on parcel
  status: PvzOrderStatus;

  // Client
  clientName: string;
  clientPhone: string;
  clientEmail?: string;

  // Merchant
  storeName: string;
  storeCode: string;

  // Logistics
  pvzId: string;
  pvzName: string;
  storageCell: string | null;  // e.g. "A-3-2"
  arrivalDate: string | null;
  storageDaysMax: number;       // max days at PVZ
  storageDeadline: string | null;

  // Items
  items: PvzOrderItem[];
  totalItems: number;
  weight: number; // kg
  dimensions: string; // "30×20×15 см"
  declaredValue: number; // ₽

  // Meta
  comment: string;
  requiresSignature: boolean;
  fragile: boolean;
  isPrepaid: boolean;
  codAmount?: number;           // cash-on-delivery
  returnReason?: string;
  returnPhoto?: string;
  createdAt: string;
  updatedAt: string;

  // Timeline entries
  timeline: Array<{ ts: string; action: string; actor: string; note?: string }>;
}

export interface ScanLogEntry {
  id: string;
  ts: string;
  orderNumber: string | null;
  actor: string;
  action: ScanActionType;
  result: 'ok' | 'error';
  errorType?: string;
  rawInput: string;
  pvzName: string;
}

// ─── Mock orders ──────────────────────────────────────────────────────────────

export const PVZ_ORDERS: PvzOrder[] = [
  {
    id: 'po-001',
    orderNumber: 'ORD-2026-018441',
    trackingNumber: 'TRK-4829105673',
    pickupCode: '847291',
    qrContent: '847291',
    barcode: '4829105673',
    status: 'in_transit',
    clientName: 'Алексей Петров',
    clientPhone: '+7 (985) 123-45-67',
    clientEmail: 'a.petrov@mail.ru',
    storeName: 'ЭлектроМир',
    storeCode: 'SLR-001',
    pvzId: '1',
    pvzName: 'ПВЗ Тверская',
    storageCell: null,
    arrivalDate: null,
    storageDaysMax: 7,
    storageDeadline: null,
    items: [
      { name: 'Наушники Sony WH-1000XM5', qty: 1, imageUrl: 'https://images.unsplash.com/photo-1761005654142-819960af0658?w=200&q=80' },
      { name: 'Кабель USB-C 2м', qty: 2 },
    ],
    totalItems: 2,
    weight: 0.8,
    dimensions: '25×18×10 см',
    declaredValue: 24990,
    comment: 'Хрупкое! Не переворачивать.',
    requiresSignature: true,
    fragile: true,
    isPrepaid: true,
    createdAt: '2026-03-05T10:30:00',
    updatedAt: '2026-03-06T14:12:00',
    timeline: [
      { ts: '2026-03-05T10:30:00', action: 'Заказ создан', actor: 'Система' },
      { ts: '2026-03-05T14:00:00', action: 'Передан в доставку', actor: 'Склад' },
      { ts: '2026-03-06T14:12:00', action: 'В пути к ПВЗ', actor: 'Курьер Иванов' },
    ],
  },
  {
    id: 'po-002',
    orderNumber: 'ORD-2026-017822',
    trackingNumber: 'TRK-3917284651',
    pickupCode: '562034',
    qrContent: '562034',
    barcode: '3917284651',
    status: 'at_pvz',
    clientName: 'Мария Соколова',
    clientPhone: '+7 (916) 234-56-78',
    clientEmail: 'm.sokolova@gmail.com',
    storeName: 'Мир Подарков',
    storeCode: 'SLR-011',
    pvzId: '1',
    pvzName: 'ПВЗ Тверская',
    storageCell: 'B-2-4',
    arrivalDate: '2026-03-04T11:30:00',
    storageDaysMax: 7,
    storageDeadline: '2026-03-11T11:30:00',
    items: [
      { name: 'Набор подарочный «Уют»', qty: 1, imageUrl: 'https://images.unsplash.com/photo-1637590957181-8893af2a8344?w=200&q=80' },
      { name: 'Открытка именная', qty: 1 },
    ],
    totalItems: 2,
    weight: 0.5,
    dimensions: '20×15×10 см',
    declaredValue: 3490,
    comment: '',
    requiresSignature: false,
    fragile: false,
    isPrepaid: true,
    createdAt: '2026-03-02T09:00:00',
    updatedAt: '2026-03-04T11:30:00',
    timeline: [
      { ts: '2026-03-02T09:00:00', action: 'Заказ создан', actor: 'Система' },
      { ts: '2026-03-03T16:00:00', action: 'Передан в доставку', actor: 'Склад' },
      { ts: '2026-03-04T11:30:00', action: 'Принят на ПВЗ', actor: 'Смирнов К.', note: 'Ячейка B-2-4' },
    ],
  },
  {
    id: 'po-003',
    orderNumber: 'ORD-2026-017100',
    trackingNumber: 'TRK-2810937465',
    pickupCode: '391047',
    qrContent: '391047',
    barcode: '2810937465',
    status: 'at_pvz',
    clientName: 'Дмитрий Козлов',
    clientPhone: '+7 (903) 345-67-89',
    storeName: 'АвтоДетали Плюс',
    storeCode: 'SLR-012',
    pvzId: '1',
    pvzName: 'ПВЗ Тверская',
    storageCell: 'C-1-1',
    arrivalDate: '2026-02-28T09:00:00',
    storageDaysMax: 7,
    storageDeadline: '2026-03-07T09:00:00',
    items: [
      { name: 'Фильтр масляный Bosch', qty: 2, imageUrl: 'https://images.unsplash.com/photo-1771279393955-1184b58333af?w=200&q=80' },
      { name: 'Прокладка головки блока', qty: 1 },
    ],
    totalItems: 3,
    weight: 2.1,
    dimensions: '35×25×20 см',
    declaredValue: 8750,
    comment: 'Наложенный платёж! Взять 8750₽.',
    requiresSignature: true,
    fragile: false,
    isPrepaid: false,
    codAmount: 8750,
    createdAt: '2026-02-26T13:00:00',
    updatedAt: '2026-02-28T09:00:00',
    timeline: [
      { ts: '2026-02-26T13:00:00', action: 'Заказ создан', actor: 'Система' },
      { ts: '2026-02-27T10:00:00', action: 'Передан в доставку', actor: 'Склад' },
      { ts: '2026-02-28T09:00:00', action: 'Принят на ПВЗ', actor: 'Смирнов К.', note: 'Ячейка C-1-1' },
    ],
  },
  {
    id: 'po-004',
    orderNumber: 'ORD-2026-016500',
    trackingNumber: 'TRK-1920384756',
    pickupCode: '104857',
    qrContent: '104857',
    barcode: '1920384756',
    status: 'issued',
    clientName: 'Анна Новикова',
    clientPhone: '+7 (926) 456-78-90',
    storeName: 'МодаСтиль',
    storeCode: 'SLR-014',
    pvzId: '1',
    pvzName: 'ПВЗ Тверская',
    storageCell: null,
    arrivalDate: '2026-03-01T12:00:00',
    storageDaysMax: 7,
    storageDeadline: '2026-03-08T12:00:00',
    items: [{ name: 'Платье летнее (р.46)', qty: 1, imageUrl: 'https://images.unsplash.com/photo-1602303894456-398ce544d90b?w=200&q=80' }],
    totalItems: 1,
    weight: 0.3,
    dimensions: '30×25×5 см',
    declaredValue: 4200,
    comment: '',
    requiresSignature: false,
    fragile: false,
    isPrepaid: true,
    createdAt: '2026-02-28T08:00:00',
    updatedAt: '2026-03-03T15:30:00',
    timeline: [
      { ts: '2026-02-28T08:00:00', action: 'Заказ создан', actor: 'Система' },
      { ts: '2026-03-01T12:00:00', action: 'Принят на ПВЗ', actor: 'Смирнов К.', note: 'Ячейка A-1-3' },
      { ts: '2026-03-03T15:30:00', action: 'Выдан клиенту', actor: 'Смирнов К.', note: 'Код подтверждён: 104857' },
    ],
  },
  {
    id: 'po-005',
    orderNumber: 'ORD-2026-015900',
    trackingNumber: 'TRK-0918273645',
    pickupCode: '739182',
    qrContent: '739182',
    barcode: '0918273645',
    status: 'return_processed',
    clientName: 'Сергей Морозов',
    clientPhone: '+7 (977) 567-89-01',
    storeName: 'ЭлектроМир',
    storeCode: 'SLR-001',
    pvzId: '1',
    pvzName: 'ПВЗ Тверская',
    storageCell: null,
    arrivalDate: '2026-02-25T10:00:00',
    storageDaysMax: 7,
    storageDeadline: '2026-03-04T10:00:00',
    items: [{ name: 'Смартфон Xiaomi 14', qty: 1, imageUrl: 'https://images.unsplash.com/photo-1560677519-9e47f8731d07?w=200&q=80' }],
    totalItems: 1,
    weight: 0.4,
    dimensions: '18×10×4 см',
    declaredValue: 52000,
    comment: '',
    requiresSignature: true,
    fragile: true,
    isPrepaid: true,
    returnReason: 'Клиент не явился в срок',
    createdAt: '2026-02-23T11:00:00',
    updatedAt: '2026-03-05T09:00:00',
    timeline: [
      { ts: '2026-02-23T11:00:00', action: 'Заказ создан', actor: 'Система' },
      { ts: '2026-02-25T10:00:00', action: 'Принят на ПВЗ', actor: 'Смирнов К.' },
      { ts: '2026-03-04T10:00:00', action: 'Срок хранения истёк', actor: 'Система' },
      { ts: '2026-03-05T09:00:00', action: 'Возврат оформлен', actor: 'Смирнов К.', note: 'Причина: клиент не явился' },
    ],
  },
  {
    id: 'po-006',
    orderNumber: 'ORD-2026-019010',
    trackingNumber: 'TRK-5738291047',
    pickupCode: '628374',
    qrContent: '628374',
    barcode: '5738291047',
    status: 'in_transit',
    clientName: 'Елена Белова',
    clientPhone: '+7 (999) 678-90-12',
    storeName: 'ФармаПоинт',
    storeCode: 'SLR-013',
    pvzId: '1',
    pvzName: 'ПВЗ Тверская',
    storageCell: null,
    arrivalDate: null,
    storageDaysMax: 5,
    storageDeadline: null,
    items: [
      { name: 'Витамины Centrum', qty: 2, imageUrl: 'https://images.unsplash.com/photo-1704650311329-fb978a50e5e6?w=200&q=80' },
      { name: 'Бинт эластичный', qty: 3 },
    ],
    totalItems: 5,
    weight: 0.6,
    dimensions: '22×16×8 см',
    declaredValue: 2890,
    comment: 'Медикаменты — хранить при t° 15-25°C',
    requiresSignature: false,
    fragile: false,
    isPrepaid: true,
    createdAt: '2026-03-06T07:00:00',
    updatedAt: '2026-03-07T08:30:00',
    timeline: [
      { ts: '2026-03-06T07:00:00', action: 'Заказ создан', actor: 'Система' },
      { ts: '2026-03-06T12:00:00', action: 'Передан в доставку', actor: 'Склад' },
      { ts: '2026-03-07T08:30:00', action: 'В пути к ПВЗ', actor: 'Курьер Жуков' },
    ],
  },
  {
    id: 'po-007',
    orderNumber: 'ORD-2026-018000',
    trackingNumber: 'TRK-6482910573',
    pickupCode: '415829',
    qrContent: '415829',
    barcode: '6482910573',
    status: 'expired',
    clientName: 'Игорь Васильев',
    clientPhone: '+7 (916) 789-01-23',
    storeName: 'ПродМаркет',
    storeCode: 'SLR-010',
    pvzId: '1',
    pvzName: 'ПВЗ Тверская',
    storageCell: 'A-2-1',
    arrivalDate: '2026-02-27T14:00:00',
    storageDaysMax: 7,
    storageDeadline: '2026-03-06T14:00:00',
    items: [
      { name: 'Кофе Lavazza 1кг', qty: 2, imageUrl: 'https://images.unsplash.com/photo-1558330677-0c0d26190651?w=200&q=80' },
      { name: 'Чай Twinings (уп.)', qty: 1 },
    ],
    totalItems: 3,
    weight: 2.2,
    dimensions: '30×20×15 см',
    declaredValue: 3200,
    comment: '',
    requiresSignature: false,
    fragile: false,
    isPrepaid: true,
    createdAt: '2026-02-25T10:00:00',
    updatedAt: '2026-03-07T00:01:00',
    timeline: [
      { ts: '2026-02-25T10:00:00', action: 'Заказ создан', actor: 'Система' },
      { ts: '2026-02-27T14:00:00', action: 'Принят на ПВЗ', actor: 'Смирнов К.', note: 'Ячейка A-2-1' },
      { ts: '2026-03-06T14:00:00', action: 'Срок хранения истёк', actor: 'Система' },
    ],
  },
  {
    id: 'po-008',
    orderNumber: 'ORD-2026-017500',
    trackingNumber: 'TRK-7392018465',
    pickupCode: '903715',
    qrContent: '903715',
    barcode: '7392018465',
    status: 'at_pvz',
    clientName: 'Наталья Кириллова',
    clientPhone: '+7 (985) 890-12-34',
    clientEmail: 'n.kirillova@yandex.ru',
    storeName: 'МодаСтиль',
    storeCode: 'SLR-014',
    pvzId: '2',                   // Wrong PVZ — should be at Arbot
    pvzName: 'ПВЗ Арбат',
    storageCell: 'D-1-3',
    arrivalDate: '2026-03-03T10:00:00',
    storageDaysMax: 7,
    storageDeadline: '2026-03-10T10:00:00',
    items: [{ name: 'Куртка зимняя (р.48)', qty: 1, imageUrl: 'https://images.unsplash.com/photo-1760533091973-1262bf57d244?w=200&q=80' }],
    totalItems: 1,
    weight: 1.2,
    dimensions: '50×40×10 см',
    declaredValue: 8900,
    comment: '',
    requiresSignature: false,
    fragile: false,
    isPrepaid: true,
    createdAt: '2026-03-01T11:00:00',
    updatedAt: '2026-03-03T10:00:00',
    timeline: [
      { ts: '2026-03-01T11:00:00', action: 'Заказ создан', actor: 'Система' },
      { ts: '2026-03-03T10:00:00', action: 'Принят на ПВЗ', actor: 'Петрова А.', note: 'ПВЗ Арбат, ячейка D-1-3' },
    ],
  },
  {
    id: 'po-009',
    orderNumber: 'ORD-2026-019500',
    trackingNumber: 'TRK-8182736450',
    pickupCode: '284716',
    qrContent: '284716',
    barcode: '8182736450',
    status: 'expired',
    clientName: 'Виктор Зайцев',
    clientPhone: '+7 (903) 123-99-55',
    storeName: 'ТехноПлюс',
    storeCode: 'SLR-007',
    pvzId: '1',
    pvzName: 'ПВЗ Тверская',
    storageCell: 'B-1-2',
    arrivalDate: '2026-02-26T09:00:00',
    storageDaysMax: 7,
    storageDeadline: '2026-03-05T09:00:00',
    items: [
      { name: 'Планшет Lenovo Tab P11', qty: 1, imageUrl: 'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=200&q=80' },
      { name: 'Чехол-книжка', qty: 1 },
    ],
    totalItems: 2,
    weight: 0.7,
    dimensions: '28×18×8 см',
    declaredValue: 21500,
    comment: '',
    requiresSignature: true,
    fragile: false,
    isPrepaid: true,
    createdAt: '2026-02-24T10:00:00',
    updatedAt: '2026-03-06T00:01:00',
    timeline: [
      { ts: '2026-02-24T10:00:00', action: 'Заказ создан', actor: 'Система' },
      { ts: '2026-02-26T09:00:00', action: 'Принят на ПВЗ', actor: 'Смирнов К.', note: 'Ячейка B-1-2' },
      { ts: '2026-03-05T09:00:00', action: 'Срок хранения истёк', actor: 'Система' },
    ],
  },
  {
    id: 'po-010',
    orderNumber: 'ORD-2026-019800',
    trackingNumber: 'TRK-9271836540',
    pickupCode: '539047',
    qrContent: '539047',
    barcode: '9271836540',
    status: 'at_pvz',
    clientName: 'Ксения Романова',
    clientPhone: '+7 (916) 555-44-33',
    clientEmail: 'k.romanova@mail.ru',
    storeName: 'КосмоШоп',
    storeCode: 'SLR-019',
    pvzId: '1',
    pvzName: 'ПВЗ Тверская',
    storageCell: 'A-3-2',
    arrivalDate: '2026-03-05T13:00:00',
    storageDaysMax: 7,
    storageDeadline: '2026-03-12T13:00:00',
    items: [
      { name: 'Парфюм Chanel Chance 100мл', qty: 1, imageUrl: 'https://images.unsplash.com/photo-1541643600914-78b084683702?w=200&q=80' },
      { name: 'Крем увлажняющий', qty: 2 },
    ],
    totalItems: 3,
    weight: 0.4,
    dimensions: '20×15×8 см',
    declaredValue: 12800,
    comment: 'Хрупкое! Духи.',
    requiresSignature: false,
    fragile: true,
    isPrepaid: true,
    createdAt: '2026-03-03T15:00:00',
    updatedAt: '2026-03-05T13:00:00',
    timeline: [
      { ts: '2026-03-03T15:00:00', action: 'Заказ создан', actor: 'Система' },
      { ts: '2026-03-04T18:00:00', action: 'Передан в доставку', actor: 'Склад' },
      { ts: '2026-03-05T13:00:00', action: 'Принят на ПВЗ', actor: 'Смирнов К.', note: 'Ячейка A-3-2' },
    ],
  },
];

// ─── Storage cell helpers ────────────────────────────────────────────────────

export const STORAGE_CELLS: string[] = [
  'A-1-1','A-1-2','A-1-3','A-1-4',
  'A-2-1','A-2-2','A-2-3','A-2-4',
  'A-3-1','A-3-2','A-3-3','A-3-4',
  'B-1-1','B-1-2','B-1-3','B-1-4',
  'B-2-1','B-2-2','B-2-3','B-2-4',
  'B-3-1','B-3-2','B-3-3','B-3-4',
  'C-1-1','C-1-2','C-1-3',
  'C-2-1','C-2-2','C-2-3',
  'D-1-1','D-1-2','D-1-3',
];

// Already occupied cells
export const OCCUPIED_CELLS = new Set(['B-2-4','C-1-1','A-2-1','D-1-3','B-1-2','A-3-2']);

// ─── Lookup function ──────────────────────────────────────────────────────────

export type SearchError =
  | 'not_found'
  | 'already_issued'
  | 'wrong_pvz'
  | 'storage_expired'
  | 'return_processed';

export interface SearchResult {
  order?: PvzOrder;
  error?: SearchError;
}

export function searchPvzOrder(query: string, currentPvzId = '1'): SearchResult {
  const q = query.trim().toLowerCase();
  if (!q) return { error: 'not_found' };

  const order = PVZ_ORDERS.find(o =>
    o.orderNumber.toLowerCase().includes(q) ||
    o.trackingNumber.toLowerCase().includes(q) ||
    o.pickupCode === q ||
    o.barcode === q ||
    o.qrContent === q ||
    o.clientPhone.replace(/\D/g, '').includes(q.replace(/\D/g, '')) ||
    o.clientName.toLowerCase().includes(q)
  );

  if (!order) return { error: 'not_found' };

  if (order.status === 'issued')               return { error: 'already_issued', order };
  if (order.status === 'return_processed')     return { error: 'return_processed', order };
  if (order.status === 'courier_transferred')  return { error: 'return_processed', order };
  if (order.status === 'expired')              return { error: 'storage_expired', order };
  if (order.pvzId !== currentPvzId)           return { error: 'wrong_pvz', order };

  return { order };
}

// ─── Format helpers ───────────────────────────────────────────────────────────

export function getStatusLabel(status: PvzOrderStatus): { label: string; color: string; bg: string; border: string } {
  const map: Record<PvzOrderStatus, { label: string; color: string; bg: string; border: string }> = {
    in_transit:           { label: 'В пути',              color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200' },
    at_pvz:               { label: 'На ПВЗ',              color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200' },
    issued:               { label: 'Выдано',              color: 'text-gray-600',   bg: 'bg-gray-100',  border: 'border-gray-200' },
    return_processed:     { label: 'Возврат оформлен',   color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
    courier_transferred:  { label: 'Передано курьеру',   color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
    expired:              { label: 'Срок истёк',          color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200' },
    wrong_pvz:            { label: 'Другой ПВЗ',          color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200' },
  };
  return map[status];
}

export function getErrorMessage(err: SearchError): { title: string; desc: string; icon: string } {
  const map: Record<SearchError, { title: string; desc: string; icon: string }> = {
    not_found:        { title: 'Заказ не найден',            desc: 'Проверьте номер заказа, штрихкод или код выдачи', icon: '🔍' },
    already_issued:   { title: 'Заказ уже выдан',            desc: 'Этот заказ был выдан клиенту ранее',              icon: '✅' },
    wrong_pvz:        { title: 'Заказ в другом ПВЗ',         desc: 'Посылка хранится в другом пункте выдачи',         icon: '📍' },
    storage_expired:  { title: 'Истёк срок хранения',        desc: 'Срок хранения на ПВЗ истёк — нужно оформить возврат', icon: '⏰' },
    return_processed: { title: 'Операция уже выполнена',     desc: 'Возврат оформлен или посылка передана курьеру',    icon: '↩️' },
  };
  return map[err];
}

export const RETURN_REASONS = [
  'Клиент не явился в срок',
  'Клиент отказался от заказа',
  'Повреждение товара при доставке',
  'Несоответствие товара описанию',
  'Ошибка в заказе (не тот товар/размер)',
  'Претензия к качеству',
  'Дублирующий заказ',
  'Другая причина',
];