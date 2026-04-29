import type {
  Worker, Sku, Bin, WarehouseOrder, Task, InventoryRow, Movement,
  CountTask, Asn, ReturnRow, Problem, DocumentRow, Courier,
  Supplier, SupplierMedia, DamageReport, SupplierDispute, EvidenceSend,
  ChatThread,
} from './types';

const now = () => new Date().toISOString();
const inMin = (m: number) => new Date(Date.now() + m * 60_000).toISOString();

export const MOCK_WORKERS: Worker[] = [
  { id: 'W-100', name: 'Соколов В.', role: 'warehouse_admin',      shiftStatus: 'on_shift', shiftStart: '08:00', shiftEnd: '20:00', productivity: 99, errorRate: 0.1, tasksToday: 42 },
  { id: 'W-101', name: 'Захарова Е.', role: 'shift_manager',        shiftStatus: 'on_shift', shiftStart: '09:00', shiftEnd: '18:00', productivity: 96, errorRate: 0.3, tasksToday: 38 },
  { id: 'W-204', name: 'Иванов И.',   role: 'picker',               shiftStatus: 'on_shift', shiftStart: '09:00', shiftEnd: '18:00', productivity: 94, errorRate: 0.6, tasksToday: 27 },
  { id: 'W-205', name: 'Петров П.',   role: 'packer',               shiftStatus: 'on_shift', shiftStart: '09:00', shiftEnd: '18:00', productivity: 91, errorRate: 0.4, tasksToday: 19 },
  { id: 'W-206', name: 'Сидоров С.',  role: 'dispatcher',           shiftStatus: 'on_break', shiftStart: '09:00', shiftEnd: '18:00', productivity: 88, errorRate: 0.2, tasksToday: 11 },
  { id: 'W-301', name: 'Кузнецов А.', role: 'receiver',             shiftStatus: 'on_shift', shiftStart: '07:00', shiftEnd: '16:00', productivity: 92, errorRate: 0.5, tasksToday: 14 },
  { id: 'W-401', name: 'Орлова М.',   role: 'inventory_controller', shiftStatus: 'on_shift', shiftStart: '09:00', shiftEnd: '18:00', productivity: 95, errorRate: 0.2, tasksToday: 6  },
  { id: 'W-501', name: 'Беляев К.',   role: 'returns_operator',     shiftStatus: 'off',                                            productivity: 87, errorRate: 0.7, tasksToday: 0  },
  { id: 'W-700', name: 'Айдар М.',    role: 'warehouse_worker',     shiftStatus: 'on_shift', shiftStart: '09:00', shiftEnd: '18:00', productivity: 90, errorRate: 0.4, tasksToday: 12 },
];

export const MOCK_SKUS: Sku[] = [
  { sku: 'SHOE-00991', barcode: '5901234567890', name: 'Nike Air Max Black', category: 'Кроссовки',  sellerArticle: 'NK-AM-BLK-42', photo: '👟', weightKg: 0.9, defaultZone: 'RED',    supplierId: 'SUP-7711', sellerId: 'SLR-NIKE',     sellerName: 'Nike Store KZ' },
  { sku: 'TS-RED-M',   barcode: '5901234567891', name: 'Футболка красная M', category: 'Одежда',     sellerArticle: 'TR-M-RED',     photo: '👕', weightKg: 0.2, defaultZone: 'YELLOW', supplierId: 'SUP-7720', sellerId: 'SLR-APP',      sellerName: 'KZ Apparel'    },
  { sku: 'JN-BLU-32',  barcode: '5901234567892', name: 'Джинсы синие 32',    category: 'Одежда',     sellerArticle: 'JN-32-BLU',    photo: '👖', weightKg: 0.6, defaultZone: 'YELLOW', supplierId: 'SUP-7720', sellerId: 'SLR-APP',      sellerName: 'KZ Apparel'    },
  { sku: 'PHN-IP15',   barcode: '5901234567893', name: 'iPhone 15 Pro 128',  category: 'Электроника', sellerArticle: 'AP-IP15-128',  photo: '📱', weightKg: 0.4, fragile: true, defaultZone: 'BLUE',  supplierId: 'SUP-7730', sellerId: 'SLR-MOBEL',    sellerName: 'MobEl'         },
  { sku: 'BAG-LV-01',  barcode: '5901234567894', name: 'Сумка Louis V.',     category: 'Аксессуары', sellerArticle: 'LV-BAG-01',    photo: '👜', weightKg: 0.7, defaultZone: 'PURPLE', supplierId: 'SUP-7740', sellerId: 'SLR-LUXBAG',   sellerName: 'Lux Bags KZ'   },
  { sku: 'GRC-MILK',   barcode: '5901234567895', name: 'Молоко 1л',          category: 'Продукты',   sellerArticle: 'MLK-1L',       photo: '🥛', weightKg: 1.0, temperatureControlled: true, defaultZone: 'GREEN', supplierId: 'SUP-7750', sellerId: 'SLR-DAIRY', sellerName: 'AlemDairy' },
  { sku: 'JK-GRY-L',   barcode: '5901234567896', name: 'Куртка серая L',     category: 'Одежда',     sellerArticle: 'JK-L-GRY',     photo: '🧥', weightKg: 1.2, defaultZone: 'YELLOW', supplierId: 'SUP-7720', sellerId: 'SLR-APP',      sellerName: 'KZ Apparel'    },
  { sku: 'GIFT-FLW-1', barcode: '5901234567897', name: 'Букет роз',          category: 'Цветы',      sellerArticle: 'FLW-RZ-1',     photo: '💐', weightKg: 0.5, fragile: true, defaultZone: 'PURPLE', supplierId: 'SUP-7760', sellerId: 'SLR-FLW',      sellerName: 'FlowerHouse'   },
];

export const MOCK_BINS: Bin[] = [
  { id: 'A-12-04', warehouse: 'MSK-WH-01', zone: 'RED',    row: 'R-03', aisle: 'A-02', rack: 'S-12', shelf: 'P-04', cell: 'A-12-04', qrCode: 'QR://BIN/A-12-04', capacity: 60,  occupied: 18, status: 'active' },
  { id: 'A-01-03', warehouse: 'MSK-WH-01', zone: 'YELLOW', row: 'R-01', aisle: 'A-01', rack: 'S-01', shelf: 'P-03', cell: 'A-01-03', qrCode: 'QR://BIN/A-01-03', capacity: 100, occupied: 78, status: 'active' },
  { id: 'B-04-12', warehouse: 'MSK-WH-01', zone: 'YELLOW', row: 'R-04', aisle: 'A-04', rack: 'S-04', shelf: 'P-12', cell: 'B-04-12', qrCode: 'QR://BIN/B-04-12', capacity: 100, occupied: 45, status: 'active' },
  { id: 'C-02-08', warehouse: 'MSK-WH-01', zone: 'BLUE',   row: 'R-02', aisle: 'A-02', rack: 'S-02', shelf: 'P-08', cell: 'C-02-08', qrCode: 'QR://BIN/C-02-08', capacity: 60,  occupied: 60, status: 'active' },
  { id: 'D-01-01', warehouse: 'MSK-WH-01', zone: 'GREEN',  row: 'R-01', aisle: 'A-01', rack: 'S-01', shelf: 'P-01', cell: 'D-01-01', qrCode: 'QR://BIN/D-01-01', capacity: 50,  occupied: 22, status: 'active' },
  { id: 'E-03-02', warehouse: 'MSK-WH-01', zone: 'PURPLE', row: 'R-03', aisle: 'A-03', rack: 'S-03', shelf: 'P-02', cell: 'E-03-02', qrCode: 'QR://BIN/E-03-02', capacity: 40,  occupied: 12, status: 'active' },
  { id: 'F-01-01', warehouse: 'MSK-WH-01', zone: 'GRAY',   row: 'R-01', aisle: 'A-01', rack: 'S-01', shelf: 'P-01', cell: 'F-01-01', qrCode: 'QR://BIN/F-01-01', capacity: 30,  occupied: 5,  status: 'active' },
  { id: 'G-01-01', warehouse: 'MSK-WH-01', zone: 'BLACK',  row: 'R-01', aisle: 'A-01', rack: 'S-01', shelf: 'P-01', cell: 'G-01-01', qrCode: 'QR://BIN/G-01-01', capacity: 20,  occupied: 2,  status: 'active' },
  { id: 'H-01-01', warehouse: 'MSK-WH-01', zone: 'ORANGE', row: 'R-01', aisle: 'A-01', rack: 'S-01', shelf: 'P-01', cell: 'H-01-01', qrCode: 'QR://BIN/H-01-01', capacity: 25,  occupied: 0,  status: 'maintenance', blockedReason: 'Плановый осмотр' },
];

export const MOCK_ORDERS: WarehouseOrder[] = [
  {
    id: 'o1', code: 'ORD-2026-004512', customerName: 'Алия К.', city: 'Алматы',
    shipMethod: 'courier', priority: 'urgent', zone: 'RED',
    status: 'received_by_warehouse', slaDeadline: inMin(120), receivedAt: now(), updatedAt: now(),
    items: [
      { id: 'i1', sku: 'SHOE-00991', qty: 2, pickedQty: 0, binId: 'A-12-04', status: 'pending' },
      { id: 'i2', sku: 'TS-RED-M',   qty: 1, pickedQty: 0, binId: 'A-01-03', status: 'pending' },
    ],
  },
  {
    id: 'o2', code: 'ORD-2026-004513', customerName: 'Марат Б.', city: 'Астана',
    shipMethod: 'pickup', priority: 'high', zone: 'BLUE',
    status: 'picking_in_progress', slaDeadline: inMin(90), receivedAt: now(), updatedAt: now(), pickerId: 'W-204',
    items: [
      { id: 'i3', sku: 'PHN-IP15', qty: 1, pickedQty: 1, binId: 'C-02-08', status: 'found' },
    ],
  },
  {
    id: 'o3', code: 'ORD-2026-004514', customerName: 'Динара С.', city: 'Шымкент',
    shipMethod: 'courier', priority: 'normal', zone: 'PURPLE',
    status: 'sorting', slaDeadline: inMin(180), receivedAt: now(), updatedAt: now(),
    pickerId: 'W-204', sorterId: 'W-205',
    items: [{ id: 'i4', sku: 'BAG-LV-01', qty: 1, pickedQty: 1, binId: 'E-03-02', status: 'found' }],
  },
  {
    id: 'o4', code: 'ORD-2026-004515', customerName: 'Олег Н.', city: 'Караганда',
    shipMethod: 'courier', priority: 'normal', zone: 'YELLOW',
    status: 'packed', slaDeadline: inMin(240), receivedAt: now(), updatedAt: now(),
    pickerId: 'W-204', packerId: 'W-205', weightKg: 1.2, packageType: 'BOX-L', packagesCount: 1,
    items: [{ id: 'i5', sku: 'JK-GRY-L', qty: 1, pickedQty: 1, binId: 'A-01-03', status: 'found' }],
  },
  {
    id: 'o5', code: 'ORD-2026-004516', customerName: 'Жанна Т.', city: 'Алматы',
    shipMethod: 'courier', priority: 'high', zone: 'PURPLE',
    status: 'ready_for_pickup', slaDeadline: inMin(60), receivedAt: now(), updatedAt: now(),
    pickerId: 'W-204', packerId: 'W-205', weightKg: 0.5, packageType: 'BAG-S', packagesCount: 1,
    shippingLabel: 'LBL-998877',
    items: [{ id: 'i6', sku: 'GIFT-FLW-1', qty: 1, pickedQty: 1, binId: 'E-03-02', status: 'found' }],
  },
  {
    id: 'o6', code: 'ORD-2026-004517', customerName: 'Игорь В.', city: 'Алматы',
    shipMethod: 'courier', priority: 'low', zone: 'GREEN',
    status: 'received_by_warehouse', slaDeadline: inMin(360), receivedAt: now(), updatedAt: now(),
    items: [{ id: 'i7', sku: 'GRC-MILK', qty: 6, pickedQty: 0, binId: 'D-01-01', status: 'pending' }],
  },
];

export const MOCK_TASKS: Task[] = [
  { id: 'T-001', type: 'PICK',    status: 'in_progress', priority: 'high',   assignedTo: 'W-204', orderId: 'o2', createdAt: now(), deadline: inMin(60) },
  { id: 'T-002', type: 'SORT',    status: 'created',     priority: 'normal',                       orderId: 'o3', createdAt: now() },
  { id: 'T-003', type: 'PACK',    status: 'created',     priority: 'normal',                       orderId: 'o3', createdAt: now() },
  { id: 'T-004', type: 'HANDOFF', status: 'created',     priority: 'normal',                       orderId: 'o5', createdAt: now() },
  { id: 'T-005', type: 'RECEIVE', status: 'created',     priority: 'normal', assignedTo: 'W-301',                  asnId: 'a1',  createdAt: now() },
  { id: 'T-006', type: 'COUNT',   status: 'assigned',    priority: 'low',    assignedTo: 'W-401',                  countId: 'c1', createdAt: now() },
];

export const MOCK_INVENTORY: InventoryRow[] = [
  { sku: 'SHOE-00991', totalStock: 36, reserved: 4,  damaged: 1, returned: 0, bins: ['A-12-04'] },
  { sku: 'TS-RED-M',   totalStock: 124,reserved: 8,  damaged: 0, returned: 2, bins: ['A-01-03'] },
  { sku: 'JN-BLU-32',  totalStock: 65, reserved: 4,  damaged: 1, returned: 1, bins: ['B-04-12'] },
  { sku: 'PHN-IP15',   totalStock: 18, reserved: 2,  damaged: 0, returned: 0, bins: ['C-02-08'] },
  { sku: 'BAG-LV-01',  totalStock: 12, reserved: 1,  damaged: 0, returned: 0, bins: ['E-03-02'] },
  { sku: 'GRC-MILK',   totalStock: 480,reserved: 12, damaged: 4, returned: 0, bins: ['D-01-01'] },
  { sku: 'JK-GRY-L',   totalStock: 9,  reserved: 1,  damaged: 0, returned: 0, bins: ['A-01-03'] },
  { sku: 'GIFT-FLW-1', totalStock: 14, reserved: 1,  damaged: 0, returned: 0, bins: ['E-03-02'] },
];

export const MOCK_MOVEMENTS: Movement[] = [
  { id: 'M-001', sku: 'SHOE-00991', fromBinId: 'A-12-04', toBinId: 'A-01-03', qty: 5, reason: 'Перенос приоритета', workerId: 'W-401', createdAt: now() },
];

export const MOCK_COUNTS: CountTask[] = [
  {
    id: 'c1', zone: 'YELLOW', assignedTo: 'W-401', status: 'in_progress', createdAt: now(),
    lines: [
      { binId: 'A-01-03', sku: 'TS-RED-M',  expectedQty: 124 },
      { binId: 'B-04-12', sku: 'JN-BLU-32', expectedQty: 65, countedQty: 64 },
    ],
  },
];

export const MOCK_SUPPLIERS: Supplier[] = [
  { id: 'SUP-7711', name: 'ТОО SneakerHub',     contactPerson: 'Алмас Б.',   phone: '+7 700 111 2233', email: 'sneakers@hub.kz',     contractStatus: 'active',  notifyChannel: 'email'  },
  { id: 'SUP-7720', name: 'KZ Apparel Co.',     contactPerson: 'Айгерим К.', phone: '+7 700 444 5566', email: 'orders@kzapparel.kz', contractStatus: 'active',  notifyChannel: 'email'  },
  { id: 'SUP-7730', name: 'Mobile Electronics', contactPerson: 'Тимур Н.',   phone: '+7 700 777 8899', email: 'b2b@mobel.kz',        contractStatus: 'on_hold', notifyChannel: 'portal' },
  { id: 'SUP-7740', name: 'Lux Bags Distrib.',  contactPerson: 'Дина С.',    phone: '+7 700 222 3344', email: 'wh@luxbags.kz',       contractStatus: 'active',  notifyChannel: 'email'  },
  { id: 'SUP-7750', name: 'AlemDairy LLP',      contactPerson: 'Ержан К.',   phone: '+7 700 555 6677', email: 'logistics@alem.kz',   contractStatus: 'active',  notifyChannel: 'phone'  },
  { id: 'SUP-7760', name: 'FlowerHouse',        contactPerson: 'Эмине Б.',   phone: '+7 700 888 9900', email: 'fh@flowers.kz',       contractStatus: 'expired', notifyChannel: 'email'  },
];

export const MOCK_ASNS: Asn[] = [
  {
    id: 'a1', supplierId: 'SUP-7711', supplierName: 'ТОО SneakerHub', invoiceNumber: 'INV-7711',
    expectedAt: inMin(-30), status: 'arrived',
    items: [
      { id: 'ai1', sku: 'SHOE-00991', expectedQty: 20, receivedQty: 0, damagedQty: 0, binId: 'A-12-04' },
      { id: 'ai2', sku: 'JN-BLU-32',  expectedQty: 30, receivedQty: 0, damagedQty: 0, binId: 'B-04-12' },
    ],
  },
  {
    id: 'a2', supplierId: 'SUP-7730', supplierName: 'Mobile Electronics', invoiceNumber: 'INV-7820',
    expectedAt: inMin(-60), status: 'discrepancy',
    items: [
      { id: 'ai3', sku: 'PHN-IP15', expectedQty: 5, receivedQty: 4, damagedQty: 1, binId: 'C-02-08' },
    ],
  },
];

export const MOCK_SUPPLIER_MEDIA: SupplierMedia[] = [
  {
    id: 'SM-001', supplierId: 'SUP-7711', supplierName: 'ТОО SneakerHub',
    productName: 'Nike Air Max Black', sku: 'SHOE-00991', barcode: '5901234567890',
    asnId: 'a1', invoiceNumber: 'INV-7711', expectedQty: 20,
    photos: ['mock://supplier/SHOE-00991/box-1.jpg', 'mock://supplier/SHOE-00991/box-2.jpg'],
    videos: ['mock://supplier/SHOE-00991/unbox.mp4'],
    description: 'Партия 20 пар, упакованы в индивидуальные коробки. Pre-shipment видео распаковки.',
    supplierComment: 'Все пары запечатаны, состояние новое.',
    uploadedAt: now(), status: 'under_review',
  },
  {
    id: 'SM-002', supplierId: 'SUP-7730', supplierName: 'Mobile Electronics',
    productName: 'iPhone 15 Pro 128', sku: 'PHN-IP15', barcode: '5901234567893',
    asnId: 'a2', invoiceNumber: 'INV-7820', expectedQty: 5,
    photos: ['mock://supplier/PHN-IP15/sealed-1.jpg'],
    videos: [],
    description: '5 шт., запечатаны фабричной плёнкой.',
    uploadedAt: now(), status: 'mismatch',
    warehouseComment: 'Одна коробка вскрыта при приёмке — расхождение.',
  },
];

export const MOCK_DAMAGE_REPORTS: DamageReport[] = [
  {
    id: 'DMG-001', asnId: 'a2', asnItemId: 'ai3',
    supplierId: 'SUP-7730', supplierName: 'Mobile Electronics', invoiceNumber: 'INV-7820',
    sku: 'PHN-IP15', damageType: 'opened_package', damagedQty: 1,
    description: 'Коробка вскрыта, плёнка нарушена.',
    photos: ['mock://damage/DMG-001/photo-1.jpg'],
    videos: [],
    reportedBy: 'W-301', createdAt: now(), status: 'sent_to_review',
  },
];

export const MOCK_SUPPLIER_DISPUTES: SupplierDispute[] = [
  {
    id: 'DSP-001', supplierId: 'SUP-7730', supplierName: 'Mobile Electronics',
    invoiceNumber: 'INV-7820', asnId: 'a2', sku: 'PHN-IP15',
    reason: 'damaged_goods', description: 'Одна единица пришла с вскрытой упаковкой.',
    damagedQty: 1, claimedAmount: 850,
    status: 'sent_to_supplier', responsibleEmployeeId: 'W-301',
    warehousePhotos: ['mock://dispute/DSP-001/wh-1.jpg'], warehouseVideos: [],
    supplierMediaId: 'SM-002', damageReportId: 'DMG-001',
    createdAt: now(), sentAt: now(),
  },
];

export const MOCK_RETURNS: ReturnRow[] = [
  {
    id: 'RMA-001', orderId: 'ORD-2026-004490', customerName: 'Аяна С.', reason: 'Не подошёл размер',
    status: 'received', receivedAt: now(),
    items: [{ sku: 'SHOE-00991', qty: 1, condition: 'new' }],
    photosBefore: ['mock://rma/001/before-1.jpg'],
    comment: 'Клиент сообщил, что размер мал.',
    supplierId: 'SUP-7711', sellerName: 'Nike Store KZ',
  },
  {
    id: 'RMA-002', orderId: 'ORD-2026-004491', customerName: 'Денис К.', reason: 'Брак',
    status: 'inspection', receivedAt: now(),
    items: [{ sku: 'PHN-IP15', qty: 1, condition: 'damaged' }],
    photosBefore: ['mock://rma/002/before-1.jpg'],
    photosDamage: ['mock://rma/002/damage-1.jpg', 'mock://rma/002/damage-2.jpg'],
    videoFromCustomer: 'mock://rma/002/customer.mp4',
    comment: 'Экран с трещиной — клиент прислал видео распаковки.',
    supplierId: 'SUP-7730', sellerName: 'MobEl', invoiceNumber: 'INV-7820', asnId: 'a2',
  },
];

export const MOCK_PROBLEMS: Problem[] = [
  {
    id: 'P-001', type: 'damaged', description: 'Коробка повреждена при разгрузке',
    reportedBy: 'W-204', status: 'open', binId: 'A-12-04', sku: 'SHOE-00991',
    comments: [], createdAt: now(),
  },
];

export const MOCK_DOCUMENTS: DocumentRow[] = [
  { id: 'D-001', type: 'invoice',         number: 'INV-7711',          asnId: 'a1', status: 'approved', createdAt: now() },
  { id: 'D-002', type: 'shipping_label',  number: 'LBL-998877',        orderId: 'o5', status: 'approved', createdAt: now() },
  { id: 'D-003', type: 'inventory_report',number: 'RPT-2026-04-28-A',  status: 'pending', createdAt: now() },
  { id: 'D-004', type: 'damage_photo',    number: 'DMG-PHOTO-001',     asnId: 'a2', status: 'pending', createdAt: now() },
];

export const MOCK_EVIDENCE_SENDS: EvidenceSend[] = [
  {
    id: 'ES-0001', supplierId: 'SUP-7730', supplierName: 'Mobile Electronics',
    supplierContact: 'b2b@mobel.kz', channel: 'email',
    comment: 'Поставка INV-7820: вскрытая коробка iPhone 15. Прошу объяснение.',
    items: [
      { kind: 'image', src: 'mock://damage/DMG-001/photo-1.jpg', source: 'receiving', title: 'Фото повреждения' },
    ],
    status: 'sent_to_supplier', sentBy: 'W-301',
    sentAt: now(),
    invoiceNumber: 'INV-7820', sku: 'PHN-IP15',
    linkedTo: { type: 'asn', id: 'a2', asnItemId: 'ai3' },
  },
];

export const MOCK_CHAT_THREADS: ChatThread[] = [
  {
    id: 'CT-0001', kind: 'supplier',
    supplierId: 'SUP-7730', supplierName: 'Mobile Electronics',
    invoiceNumber: 'INV-7820', sku: 'PHN-IP15',
    linkedTo: { type: 'asn', id: 'a2', asnItemId: 'ai3' },
    createdAt: now(),
    messages: [
      {
        id: 'CM-1', threadId: 'CT-0001',
        author: 'warehouse', authorName: 'Кузнецов А.',
        text: 'По поставке INV-7820: одна коробка вскрыта. Прилагаем фото.',
        attachments: [{ kind: 'image', src: 'mock://damage/DMG-001/photo-1.jpg', title: 'Фото повреждения' }],
        sentAt: now(), status: 'sent',
      },
    ],
  },
];

export const MOCK_COURIERS: Courier[] = [
  { id: 'CR-104', name: 'Айдар А.',  phone: '+7 700 123 4567', vehiclePlate: 'A 777 AA' },
  { id: 'CR-205', name: 'Тимур Б.',  phone: '+7 700 765 4321', vehiclePlate: 'B 555 BB' },
  { id: 'CR-309', name: 'Кайрат В.', phone: '+7 700 999 8877', vehiclePlate: 'C 333 CC' },
];
