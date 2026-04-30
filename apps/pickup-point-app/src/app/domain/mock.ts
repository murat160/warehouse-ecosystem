import type {
  Employee, Shift, PickupOrder, Cell, CourierBatch, Courier,
  PickupReturn, Problem, CashOperation, Cashbox, Collection,
  PickupDocument, AuditEntry, ChatThread, PvzSettings,
} from './types';

const NOW = new Date('2026-04-30T08:30:00');
const iso = (offsetMin: number) => new Date(NOW.getTime() + offsetMin * 60_000).toISOString();

export const MOCK_PVZ: PvzSettings = {
  id: 'PVZ-001',
  name: 'Ehli Trend ПВЗ · Алматы Центр',
  address: 'г. Алматы, ул. Абая 150, БЦ "Достык", 1 этаж',
  workingHours: '09:00 – 21:00',
  storageLimitDays: 7,
  expiredAfterDays: 14,
  otpEnabled: true,
  qrEnabled: true,
  cashEnabled: true,
  returnsEnabled: true,
  language: 'ru',
  notificationsEnabled: true,
};

export const MOCK_EMPLOYEES: Employee[] = [
  { id: 'PVZ-EMP-001', name: 'Айгерим Касымова',  role: 'pvz_manager',      pvzId: 'PVZ-001', position: 'Руководитель ПВЗ',     avatar: 'А', shiftStatus: 'active',  phone: '+7 701 111 22 33' },
  { id: 'PVZ-EMP-002', name: 'Нурлан Бекжанов',   role: 'pvz_operator',     pvzId: 'PVZ-001', position: 'Оператор ПВЗ',         avatar: 'Н', shiftStatus: 'active',  phone: '+7 707 222 33 44' },
  { id: 'PVZ-EMP-003', name: 'Дамир Сагитов',     role: 'pvz_operator',     pvzId: 'PVZ-001', position: 'Оператор ПВЗ',         avatar: 'Д', shiftStatus: 'paused',  phone: '+7 701 333 44 55' },
  { id: 'PVZ-EMP-004', name: 'Алия Жумабекова',   role: 'returns_operator', pvzId: 'PVZ-001', position: 'Оператор возвратов',   avatar: 'А', shiftStatus: 'active',  phone: '+7 700 444 55 66' },
  { id: 'PVZ-EMP-005', name: 'Ержан Тулебаев',    role: 'cashier',          pvzId: 'PVZ-001', position: 'Кассир',               avatar: 'Е', shiftStatus: 'active',  phone: '+7 702 555 66 77' },
  { id: 'PVZ-EMP-006', name: 'Карина Идрисова',   role: 'handoff_operator', pvzId: 'PVZ-001', position: 'Приём от курьера',     avatar: 'К', shiftStatus: 'not_started', phone: '+7 705 666 77 88' },
];

export const MOCK_SHIFT: Shift = {
  id: 'SHIFT-2026-04-30',
  pvzId: 'PVZ-001',
  date: '2026-04-30',
  status: 'active',
  openedBy: 'PVZ-EMP-001',
  openedAt: iso(-90),
  staffIds: ['PVZ-EMP-001','PVZ-EMP-002','PVZ-EMP-003','PVZ-EMP-004','PVZ-EMP-005'],
  comments: [
    { id: 'SC-1', authorId: 'PVZ-EMP-001', text: 'Открыли смену в 07:00. Ждём 2 курьеров.', createdAt: iso(-90) },
  ],
  metrics: { issued: 47, accepted: 124, returns: 6, problems: 2, cashTotal: 184_500 },
};

export const MOCK_CELLS: Cell[] = (() => {
  const out: Cell[] = [];
  const zones = [
    { name: 'BLUE',   color: '#0EA5E9' },
    { name: 'GREEN',  color: '#22C55E' },
    { name: 'YELLOW', color: '#F59E0B' },
    { name: 'RED',    color: '#EF4444' },
  ];
  zones.forEach((z) => {
    for (let r = 1; r <= 3; r++) {
      for (let s = 1; s <= 4; s++) {
        for (let c = 1; c <= 6; c++) {
          const id = `${z.name}-R${String(r).padStart(2, '0')}-S${String(s).padStart(2, '0')}-C${String(c).padStart(2, '0')}`;
          const status = Math.random() < 0.45 ? 'occupied' : Math.random() < 0.05 ? 'blocked' : 'empty';
          out.push({
            id,
            pvzId: 'PVZ-001',
            qr: `QR-${id}`,
            zone: z.name,
            zoneColor: z.color,
            row: `R-${String(r).padStart(2, '0')}`,
            shelf: `S-${String(s).padStart(2, '0')}`,
            size: c <= 2 ? 'small' : c <= 4 ? 'medium' : c === 5 ? 'large' : 'oversized',
            status,
            capacity: 1,
            orderIds: [],
          });
        }
      }
    }
  });
  return out;
})();

const cellsAvailable = MOCK_CELLS.filter(c => c.status === 'occupied');
const pickCell = (i: number) => cellsAvailable[i % cellsAvailable.length];

export const MOCK_ORDERS: PickupOrder[] = [
  {
    id: 'ORD-2026-10001', trackingNumber: 'EHL-1A2B3C4', packageLabel: 'PKG-10001-1',
    customerName: 'Динара Ж***ова', customerPhone: '+7 (***) ***-22-13',
    pickupCode: '482910', qr: 'QR-PICK-482910', status: 'ready_for_pickup',
    arrivedAt: iso(-180), storageDeadline: iso(60 * 24 * 5),
    pvzId: 'PVZ-001', cellId: pickCell(0).id, zone: pickCell(0).zone, shelf: pickCell(0).shelf, row: pickCell(0).row,
    packageCount: 1, weight: 0.6, size: 'small', fragile: false, coldChain: false,
    category: 'Одежда', courierBatchId: 'BATCH-2026-04-30-A',
    comments: [], documentIds: [],
  },
  {
    id: 'ORD-2026-10002', trackingNumber: 'EHL-2B3C4D5', packageLabel: 'PKG-10002-1',
    customerName: 'Алмат Б***ев', customerPhone: '+7 (***) ***-44-19',
    pickupCode: '739104', qr: 'QR-PICK-739104', status: 'stored',
    arrivedAt: iso(-220), storageDeadline: iso(60 * 24 * 4),
    pvzId: 'PVZ-001', cellId: pickCell(1).id, zone: pickCell(1).zone, shelf: pickCell(1).shelf, row: pickCell(1).row,
    packageCount: 2, weight: 2.1, size: 'medium', fragile: false, coldChain: false,
    category: 'Обувь', courierBatchId: 'BATCH-2026-04-30-A',
    comments: ['Клиент предупредил, заберёт после 18:00'], documentIds: [],
    paymentRequired: true, paymentAmount: 18_900, paymentStatus: 'unpaid',
  },
  {
    id: 'ORD-2026-10003', trackingNumber: 'EHL-3C4D5E6', packageLabel: 'PKG-10003-1',
    customerName: 'Сауле К***ва', customerPhone: '+7 (***) ***-77-91',
    pickupCode: '108374', qr: 'QR-PICK-108374', status: 'ready_for_pickup',
    arrivedAt: iso(-90), storageDeadline: iso(60 * 24 * 6),
    pvzId: 'PVZ-001', cellId: pickCell(2).id, zone: pickCell(2).zone, shelf: pickCell(2).shelf, row: pickCell(2).row,
    packageCount: 1, weight: 0.4, size: 'small', fragile: true, coldChain: false,
    category: 'Аксессуары', courierBatchId: 'BATCH-2026-04-30-A',
    comments: [], documentIds: [],
  },
  {
    id: 'ORD-2026-10004', trackingNumber: 'EHL-4D5E6F7', packageLabel: 'PKG-10004-1',
    customerName: 'Тимур Ж***ов', customerPhone: '+7 (***) ***-12-04',
    pickupCode: '569012', qr: 'QR-PICK-569012', status: 'expired_storage',
    arrivedAt: iso(-60 * 24 * 16), storageDeadline: iso(-60 * 24 * 2),
    pvzId: 'PVZ-001', cellId: pickCell(3).id, zone: pickCell(3).zone, shelf: pickCell(3).shelf, row: pickCell(3).row,
    packageCount: 1, weight: 1.1, size: 'medium', fragile: false, coldChain: false,
    category: 'Одежда', courierBatchId: 'BATCH-2026-04-23-B',
    comments: ['Клиент не отвечает, передать обратно курьеру'], documentIds: [],
  },
  {
    id: 'ORD-2026-10005', trackingNumber: 'EHL-5E6F7G8', packageLabel: 'PKG-10005-1',
    customerName: 'Молдир А***ва', customerPhone: '+7 (***) ***-39-50',
    pickupCode: '301945', qr: 'QR-PICK-301945', status: 'arrived_to_pvz',
    arrivedAt: iso(-15),
    pvzId: 'PVZ-001',
    packageCount: 1, weight: 0.8, size: 'small', fragile: false, coldChain: false,
    category: 'Косметика', courierBatchId: 'BATCH-2026-04-30-B',
    comments: [], documentIds: [],
  },
  {
    id: 'ORD-2026-10006', trackingNumber: 'EHL-6F7G8H9', packageLabel: 'PKG-10006-1',
    customerName: 'Ерлан С***ов', customerPhone: '+7 (***) ***-65-72',
    pickupCode: '127845', qr: 'QR-PICK-127845', status: 'expected_to_pvz',
    pvzId: 'PVZ-001',
    packageCount: 1, weight: 0.5, size: 'small', fragile: false, coldChain: false,
    category: 'Книги',
    comments: [], documentIds: [],
  },
  {
    id: 'ORD-2026-10007', trackingNumber: 'EHL-7G8H9I0', packageLabel: 'PKG-10007-1',
    customerName: 'Гульнара М***ва', customerPhone: '+7 (***) ***-23-87',
    pickupCode: '836514', qr: 'QR-PICK-836514', status: 'issued',
    arrivedAt: iso(-60 * 24 * 2), storageDeadline: iso(60 * 24 * 5),
    pvzId: 'PVZ-001',
    packageCount: 1, weight: 1.5, size: 'medium', fragile: false, coldChain: false,
    category: 'Одежда',
    comments: [], documentIds: ['DOC-PROOF-10007'],
  },
  {
    id: 'ORD-2026-10008', trackingNumber: 'EHL-8H9I0J1', packageLabel: 'PKG-10008-1',
    customerName: 'Аскар Т***в', customerPhone: '+7 (***) ***-99-11',
    pickupCode: '492073', qr: 'QR-PICK-492073', status: 'problem',
    arrivedAt: iso(-60 * 24), storageDeadline: iso(60 * 24 * 6),
    pvzId: 'PVZ-001', cellId: pickCell(4).id, zone: pickCell(4).zone, shelf: pickCell(4).shelf, row: pickCell(4).row,
    packageCount: 2, weight: 3.4, size: 'large', fragile: true, coldChain: false,
    category: 'Обувь',
    comments: ['Повреждение упаковки при приёмке'], documentIds: [],
  },
  {
    id: 'ORD-2026-10009', trackingNumber: 'EHL-9I0J1K2', packageLabel: 'PKG-10009-1',
    customerName: 'Ляйла С***ва', customerPhone: '+7 (***) ***-12-34',
    pickupCode: '745201', qr: 'QR-PICK-745201', status: 'return_created',
    arrivedAt: iso(-60 * 24 * 3), storageDeadline: iso(60 * 24 * 4),
    pvzId: 'PVZ-001',
    packageCount: 1, weight: 0.9, size: 'medium', fragile: false, coldChain: false,
    category: 'Одежда',
    comments: ['Клиент вернул при получении'], documentIds: ['DOC-RET-10009'],
  },
  {
    id: 'ORD-2026-10010', trackingNumber: 'EHL-0J1K2L3', packageLabel: 'PKG-10010-1',
    customerName: 'Берик А***в', customerPhone: '+7 (***) ***-78-19',
    pickupCode: '658192', qr: 'QR-PICK-658192', status: 'pickup_code_sent',
    arrivedAt: iso(-30), storageDeadline: iso(60 * 24 * 7),
    pvzId: 'PVZ-001', cellId: pickCell(5).id, zone: pickCell(5).zone, shelf: pickCell(5).shelf, row: pickCell(5).row,
    packageCount: 1, weight: 0.7, size: 'small', fragile: false, coldChain: false,
    category: 'Электроника',
    comments: [], documentIds: [],
  },
];

// Привяжем заказы к ячейкам.
MOCK_ORDERS.forEach(o => {
  if (o.cellId) {
    const cell = MOCK_CELLS.find(c => c.id === o.cellId);
    if (cell && !cell.orderIds.includes(o.id)) cell.orderIds.push(o.id);
  }
});

export const MOCK_BATCHES: CourierBatch[] = [
  {
    id: 'BATCH-2026-04-30-A', pvzId: 'PVZ-001',
    courierId: 'CRR-001', courierName: 'Болат Ж.', vehicleNumber: '012 ABC 02',
    warehouseId: 'WH-001', expectedCount: 12, receivedCount: 12,
    arrivedAt: iso(-240), closedAt: iso(-200),
    status: 'accepted',
    orderIds: ['ORD-2026-10001','ORD-2026-10002','ORD-2026-10003','ORD-2026-10009'],
    receivedOrderIds: ['ORD-2026-10001','ORD-2026-10002','ORD-2026-10003','ORD-2026-10009'],
    discrepancyOrderIds: [], damagedOrderIds: [],
    signedBy: 'PVZ-EMP-001',
  },
  {
    id: 'BATCH-2026-04-30-B', pvzId: 'PVZ-001',
    courierId: 'CRR-002', courierName: 'Сергей К.', vehicleNumber: '345 DEF 02',
    warehouseId: 'WH-001', expectedCount: 8, receivedCount: 7,
    arrivedAt: iso(-30),
    status: 'discrepancy',
    orderIds: ['ORD-2026-10005','ORD-2026-10006','ORD-2026-10010'],
    receivedOrderIds: ['ORD-2026-10005','ORD-2026-10010'],
    discrepancyOrderIds: ['ORD-2026-10006'], damagedOrderIds: [],
    notes: 'Не хватает 1 посылки, фиксируем расхождение',
  },
  {
    id: 'BATCH-2026-04-30-C', pvzId: 'PVZ-001',
    courierId: 'CRR-003', courierName: 'Мадина Б.', vehicleNumber: '678 GHI 02',
    expectedCount: 5, receivedCount: 0,
    arrivedAt: iso(60),
    status: 'expected',
    orderIds: [], receivedOrderIds: [], discrepancyOrderIds: [], damagedOrderIds: [],
  },
];

export const MOCK_COURIERS: Courier[] = [
  { id: 'CRR-001', name: 'Болат Ж.',   phone: '+7 701 555 11 22', vehicleNumber: '012 ABC 02', status: 'completed',  pvzId: 'PVZ-001', purpose: 'inbound',         arrivedAt: iso(-240) },
  { id: 'CRR-002', name: 'Сергей К.',  phone: '+7 707 555 22 33', vehicleNumber: '345 DEF 02', status: 'arrived',    pvzId: 'PVZ-001', purpose: 'inbound',         arrivedAt: iso(-30),  batchId: 'BATCH-2026-04-30-B' },
  { id: 'CRR-003', name: 'Мадина Б.',  phone: '+7 700 555 33 44', vehicleNumber: '678 GHI 02', status: 'en_route_in', pvzId: 'PVZ-001', purpose: 'inbound',         expectedAt: iso(60),  batchId: 'BATCH-2026-04-30-C' },
  { id: 'CRR-004', name: 'Тимур О.',   phone: '+7 702 555 44 55', vehicleNumber: '901 JKL 02', status: 'en_route_in', pvzId: 'PVZ-001', purpose: 'returns_pickup',  expectedAt: iso(120) },
  { id: 'CRR-005', name: 'Диас С.',    phone: '+7 705 555 55 66',                                  status: 'idle',       pvzId: 'PVZ-001', purpose: 'expired_pickup',  expectedAt: iso(180) },
];

export const MOCK_RETURNS: PickupReturn[] = [
  {
    id: 'RET-2026-2001', orderId: 'ORD-2026-10009', pvzId: 'PVZ-001',
    customerName: 'Ляйла С***ва', customerPhone: '+7 (***) ***-12-34',
    reason: 'wrong_item', description: 'Не тот размер обуви',
    photos: [], videos: [],
    status: 'received_at_pvz', assignedTo: 'PVZ-EMP-004',
    createdAt: iso(-180), documentIds: ['DOC-RET-10009'],
  },
  {
    id: 'RET-2026-2002', orderId: 'ORD-2026-10008', pvzId: 'PVZ-001',
    customerName: 'Аскар Т***в', customerPhone: '+7 (***) ***-99-11',
    reason: 'damaged', description: 'Повреждение упаковки и товара',
    photos: ['photo-damage-1.jpg','photo-damage-2.jpg'], videos: [],
    status: 'inspection', assignedTo: 'PVZ-EMP-004',
    createdAt: iso(-60), documentIds: [],
  },
  {
    id: 'RET-2026-2003', orderId: 'ORD-2026-10004', pvzId: 'PVZ-001',
    customerName: 'Тимур Ж***ов', customerPhone: '+7 (***) ***-12-04',
    reason: 'not_picked_up', description: 'Просрочка хранения, отправляем обратно',
    photos: [], videos: [],
    status: 'waiting_admin_decision', assignedTo: 'PVZ-EMP-001',
    createdAt: iso(-300), documentIds: [],
  },
];

export const MOCK_PROBLEMS: Problem[] = [
  {
    id: 'PRB-2026-3001', type: 'damaged_package', pvzId: 'PVZ-001',
    orderId: 'ORD-2026-10008',
    description: 'Посылка прибыла со вмятиной на коробке. Содержимое целое визуально.',
    photos: ['prb-1-1.jpg'], videos: [],
    priority: 'medium', status: 'in_progress',
    assignedTo: 'PVZ-EMP-001', createdBy: 'PVZ-EMP-002',
    createdAt: iso(-120),
  },
  {
    id: 'PRB-2026-3002', type: 'shortage', pvzId: 'PVZ-001',
    batchId: 'BATCH-2026-04-30-B',
    description: 'Курьер привёз 7 заказов вместо 8. Не хватает ORD-2026-10006.',
    photos: [], videos: [],
    priority: 'high', status: 'escalated',
    assignedTo: 'PVZ-EMP-001', createdBy: 'PVZ-EMP-006',
    createdAt: iso(-25),
  },
];

export const MOCK_CASHBOX: Cashbox = {
  id: 'CASH-2026-04-30',
  pvzId: 'PVZ-001',
  shiftId: 'SHIFT-2026-04-30',
  status: 'open',
  openingBalance: 50_000,
  cashReceived: 124_500,
  cardPayments: 60_000,
  refunds: 8_900,
  corrections: 0,
  cashier: 'PVZ-EMP-005',
  openedAt: iso(-90),
};

export const MOCK_CASH_OPS: CashOperation[] = [
  { id: 'OP-1', shiftId: 'SHIFT-2026-04-30', pvzId: 'PVZ-001', kind: 'opening',      amount: 50_000, cashier: 'PVZ-EMP-005', createdAt: iso(-90) },
  { id: 'OP-2', shiftId: 'SHIFT-2026-04-30', pvzId: 'PVZ-001', kind: 'cash_in',      amount: 18_900, orderId: 'ORD-2026-10002', cashier: 'PVZ-EMP-005', createdAt: iso(-60) },
  { id: 'OP-3', shiftId: 'SHIFT-2026-04-30', pvzId: 'PVZ-001', kind: 'card_payment', amount: 60_000, orderId: 'ORD-2026-10001', cashier: 'PVZ-EMP-005', createdAt: iso(-50) },
  { id: 'OP-4', shiftId: 'SHIFT-2026-04-30', pvzId: 'PVZ-001', kind: 'refund',       amount: 8_900,  returnId: 'RET-2026-2001', cashier: 'PVZ-EMP-005', createdAt: iso(-40) },
  { id: 'OP-5', shiftId: 'SHIFT-2026-04-30', pvzId: 'PVZ-001', kind: 'cash_in',      amount: 105_600, cashier: 'PVZ-EMP-005', createdAt: iso(-30) },
];

export const MOCK_COLLECTIONS: Collection[] = [
  {
    id: 'COL-2026-04-29', pvzId: 'PVZ-001',
    amount: 245_000, status: 'confirmed',
    collectorName: 'Марат К.', collectorPhone: '+7 701 999 88 77',
    documentIds: ['DOC-COL-04-29'],
    requestedAt: iso(-60 * 24 - 60), confirmedAt: iso(-60 * 24),
  },
  {
    id: 'COL-2026-04-30', pvzId: 'PVZ-001',
    amount: 175_600, status: 'requested',
    documentIds: [],
    requestedAt: iso(-15),
    notes: 'Подготовить к 18:00',
  },
];

export const MOCK_DOCUMENTS: PickupDocument[] = [
  { id: 'DOC-BATCH-A',     kind: 'batch_acceptance',  pvzId: 'PVZ-001', title: 'Акт приёмки BATCH-2026-04-30-A',         status: 'approved', batchId: 'BATCH-2026-04-30-A', uploadedBy: 'PVZ-EMP-001', uploadedAt: iso(-200), size: '124 KB' },
  { id: 'DOC-DISCREP-B',   kind: 'discrepancy_act',   pvzId: 'PVZ-001', title: 'Акт расхождения BATCH-2026-04-30-B',     status: 'pending',  batchId: 'BATCH-2026-04-30-B', uploadedBy: 'PVZ-EMP-006', uploadedAt: iso(-25),  size: '89 KB' },
  { id: 'DOC-PROOF-10007', kind: 'proof_of_pickup',   pvzId: 'PVZ-001', title: 'Подтверждение выдачи ORD-2026-10007',    status: 'approved', orderId: 'ORD-2026-10007',     uploadedBy: 'PVZ-EMP-002', uploadedAt: iso(-60 * 24 * 1.5), size: '56 KB' },
  { id: 'DOC-RET-10009',   kind: 'return_doc',        pvzId: 'PVZ-001', title: 'Документ возврата RET-2026-2001',         status: 'approved', returnId: 'RET-2026-2001',     uploadedBy: 'PVZ-EMP-004', uploadedAt: iso(-180), size: '102 KB' },
  { id: 'DOC-DAMAGE-2002', kind: 'damage_report',     pvzId: 'PVZ-001', title: 'Акт повреждения RET-2026-2002',           status: 'pending',  returnId: 'RET-2026-2002',     uploadedBy: 'PVZ-EMP-004', uploadedAt: iso(-55),  size: '210 KB' },
  { id: 'DOC-CASH-04-29',  kind: 'cash_report',       pvzId: 'PVZ-001', title: 'Кассовый отчёт 29.04.2026',               status: 'approved', uploadedBy: 'PVZ-EMP-005', uploadedAt: iso(-60 * 24), size: '45 KB' },
  { id: 'DOC-COL-04-29',   kind: 'collection_report', pvzId: 'PVZ-001', title: 'Отчёт инкассации 29.04.2026',             status: 'approved', uploadedBy: 'PVZ-EMP-001', uploadedAt: iso(-60 * 24), size: '67 KB' },
];

export const MOCK_AUDIT: AuditEntry[] = [
  { id: 'AUD-1',  ts: iso(-90),  actorId: 'PVZ-EMP-001', actorName: 'Айгерим К.', action: 'shift.open',           target: 'SHIFT-2026-04-30',  details: 'Открыла смену в 07:00' },
  { id: 'AUD-2',  ts: iso(-200), actorId: 'PVZ-EMP-006', actorName: 'Карина И.',  action: 'batch.receive',         target: 'BATCH-2026-04-30-A',details: 'Приняла 12 заказов от Болат Ж.' },
  { id: 'AUD-3',  ts: iso(-180), actorId: 'PVZ-EMP-002', actorName: 'Нурлан Б.',  action: 'order.placed_in_cell',  target: 'ORD-2026-10001',    details: 'Размещён в BLUE-R01-S01' },
  { id: 'AUD-4',  ts: iso(-90),  actorId: 'PVZ-EMP-002', actorName: 'Нурлан Б.',  action: 'order.issued',          target: 'ORD-2026-10007',    details: 'Выдан клиенту по pickup_code' },
  { id: 'AUD-5',  ts: iso(-60),  actorId: 'PVZ-EMP-005', actorName: 'Ержан Т.',   action: 'cash.in',                target: 'OP-2',              details: 'Принята наличная оплата 18 900 ₸' },
  { id: 'AUD-6',  ts: iso(-25),  actorId: 'PVZ-EMP-006', actorName: 'Карина И.',  action: 'problem.created',       target: 'PRB-2026-3002',     details: 'Курьер привёз не всё (BATCH-2026-04-30-B)' },
  { id: 'AUD-7',  ts: iso(-180), actorId: 'PVZ-EMP-004', actorName: 'Алия Ж.',    action: 'return.created',        target: 'RET-2026-2001',     details: 'Принят возврат: не тот размер' },
];

export const MOCK_CHATS: ChatThread[] = [
  {
    id: 'CHT-SHIFT', kind: 'shift', title: 'Смена 30.04.2026',
    pvzId: 'PVZ-001',
    participantIds: ['PVZ-EMP-001','PVZ-EMP-002','PVZ-EMP-003','PVZ-EMP-004','PVZ-EMP-005'],
    unreadCount: 2, closed: false,
    messages: [
      { id: 'M1', threadId: 'CHT-SHIFT', authorId: 'PVZ-EMP-001', authorName: 'Айгерим К.', text: 'Доброе утро! Сегодня ожидаются 3 курьера.', createdAt: iso(-90), status: 'viewed' },
      { id: 'M2', threadId: 'CHT-SHIFT', authorId: 'PVZ-EMP-002', authorName: 'Нурлан Б.', text: 'Принял первый рейс, всё ок.', createdAt: iso(-200), status: 'viewed' },
      { id: 'M3', threadId: 'CHT-SHIFT', authorId: 'PVZ-EMP-006', authorName: 'Карина И.', text: 'BATCH-2026-04-30-B пришёл с расхождением — фиксирую.', createdAt: iso(-25), status: 'delivered' },
    ],
  },
  {
    id: 'CHT-MGR', kind: 'manager', title: 'Менеджер ПВЗ',
    pvzId: 'PVZ-001',
    participantIds: ['PVZ-EMP-001','PVZ-EMP-002'],
    unreadCount: 0, closed: false,
    messages: [
      { id: 'M4', threadId: 'CHT-MGR', authorId: 'PVZ-EMP-001', authorName: 'Айгерим К.', text: 'Если проблем будет много — пиши сразу мне.', createdAt: iso(-300), status: 'viewed' },
    ],
  },
  {
    id: 'CHT-SUP', kind: 'support', title: 'Поддержка Ehli Trend',
    pvzId: 'PVZ-001',
    participantIds: ['PVZ-EMP-001'],
    unreadCount: 1, closed: false,
    messages: [
      { id: 'M5', threadId: 'CHT-SUP', authorId: 'SUP', authorName: 'Поддержка', text: 'Здравствуйте! Получили эскалацию по PRB-2026-3002, разбираемся.', createdAt: iso(-15), status: 'delivered' },
    ],
  },
  {
    id: 'CHT-PRB-3002', kind: 'problem', title: 'PRB-2026-3002 — недостача',
    pvzId: 'PVZ-001',
    participantIds: ['PVZ-EMP-001','PVZ-EMP-006'],
    linkedProblemId: 'PRB-2026-3002',
    unreadCount: 0, closed: false,
    messages: [
      { id: 'M6', threadId: 'CHT-PRB-3002', authorId: 'PVZ-EMP-006', authorName: 'Карина И.', text: 'Курьер расписался в акте расхождения.', createdAt: iso(-20), status: 'viewed' },
    ],
  },
  {
    id: 'CHT-RET-2002', kind: 'return', title: 'RET-2026-2002 — повреждение',
    pvzId: 'PVZ-001',
    participantIds: ['PVZ-EMP-001','PVZ-EMP-004'],
    linkedReturnId: 'RET-2026-2002',
    unreadCount: 1, closed: false,
    messages: [
      { id: 'M7', threadId: 'CHT-RET-2002', authorId: 'PVZ-EMP-004', authorName: 'Алия Ж.', text: 'Загрузила 2 фото повреждения, жду решения.', createdAt: iso(-50), status: 'delivered' },
    ],
  },
];
