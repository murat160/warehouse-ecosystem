import type {
  Worker, WarehouseOrder, Task, Bin,
  InventoryRow, ReturnRow, ProblemRow, DocumentRow,
} from './types';

const now = () => new Date().toISOString();

export const MOCK_WORKERS: Worker[] = [
  { id: 'W-204', name: 'Иванов И.',  role: 'picker',  shiftStatus: 'on_shift', shiftStart: '09:00', shiftEnd: '18:00' },
  { id: 'W-205', name: 'Петров П.',  role: 'packer',  shiftStatus: 'on_shift', shiftStart: '09:00', shiftEnd: '18:00' },
  { id: 'W-206', name: 'Сидоров С.', role: 'shipper', shiftStatus: 'on_break', shiftStart: '09:00', shiftEnd: '18:00' },
  { id: 'M-001', name: 'Соколов В.', role: 'manager', shiftStatus: 'on_shift', shiftStart: '08:00', shiftEnd: '20:00' },
];

export const MOCK_ORDERS: WarehouseOrder[] = [
  {
    id: 'o1', code: 'ORD-2026-4512', customerName: 'Алия К.', city: 'Алматы',
    status: 'received_by_warehouse', receivedAt: now(), updatedAt: now(),
    items: [
      { id: 'i1', sku: 'TS-RED-M',  name: 'Футболка красная M', qty: 2, pickedQty: 0, binId: 'A-01-03' },
      { id: 'i2', sku: 'JN-BLU-32', name: 'Джинсы синие 32',    qty: 1, pickedQty: 0, binId: 'B-04-12' },
    ],
  },
  {
    id: 'o2', code: 'ORD-2026-4513', customerName: 'Марат Б.', city: 'Астана',
    status: 'picking_in_progress', receivedAt: now(), updatedAt: now(), pickerId: 'W-204',
    items: [
      { id: 'i3', sku: 'SH-BLK-42', name: 'Кроссовки чёрные 42', qty: 1, pickedQty: 1, binId: 'C-02-08' },
    ],
  },
  {
    id: 'o3', code: 'ORD-2026-4514', customerName: 'Динара С.', city: 'Шымкент',
    status: 'packed', receivedAt: now(), updatedAt: now(),
    pickerId: 'W-204', packerId: 'W-205', weightKg: 0.6, packageType: 'BAG-M',
    items: [{ id: 'i4', sku: 'AC-BAG-01', name: 'Сумка', qty: 1, pickedQty: 1 }],
  },
  {
    id: 'o4', code: 'ORD-2026-4515', customerName: 'Олег Н.', city: 'Караганда',
    status: 'ready_for_pickup', receivedAt: now(), updatedAt: now(),
    pickerId: 'W-204', packerId: 'W-205', weightKg: 1.2, packageType: 'BOX-L',
    items: [{ id: 'i5', sku: 'JK-GRY-L', name: 'Куртка серая L', qty: 1, pickedQty: 1 }],
  },
];

export const MOCK_TASKS: Task[] = [
  { id: 'T-001', type: 'PICK',    status: 'in_progress', priority: 'high',   assignedTo: 'W-204', orderId: 'o2', createdAt: now() },
  { id: 'T-002', type: 'PACK',    status: 'created',     priority: 'normal',                       orderId: 'o3', createdAt: now() },
  { id: 'T-003', type: 'HANDOFF', status: 'created',     priority: 'normal',                       orderId: 'o4', createdAt: now() },
  { id: 'T-004', type: 'RECEIVE', status: 'created',     priority: 'normal',                                       createdAt: now() },
  { id: 'T-005', type: 'COUNT',   status: 'assigned',    priority: 'low',                          binId:   'A-01-03', createdAt: now() },
];

export const MOCK_BINS: Bin[] = [
  { id: 'b1', code: 'A-01-03', zone: 'FLD', capacity: 100, occupied: 78, status: 'active' },
  { id: 'b2', code: 'B-04-12', zone: 'FLD', capacity: 100, occupied: 45, status: 'active' },
  { id: 'b3', code: 'C-02-08', zone: 'SHS', capacity: 60,  occupied: 60, status: 'active' },
  { id: 'b4', code: 'D-01-01', zone: 'HNG', capacity: 50,  occupied: 0,  status: 'maintenance' },
  { id: 'b5', code: 'A-02-01', zone: 'ACC', capacity: 80,  occupied: 32, status: 'active' },
];

export const MOCK_INVENTORY: InventoryRow[] = [
  { sku: 'TS-RED-M',  name: 'Футболка красная M',   qty: 124, reserved: 8, bins: ['A-01-03'] },
  { sku: 'JN-BLU-32', name: 'Джинсы синие 32',      qty: 65,  reserved: 4, bins: ['B-04-12'] },
  { sku: 'SH-BLK-42', name: 'Кроссовки чёрные 42',  qty: 18,  reserved: 2, bins: ['C-02-08'] },
  { sku: 'AC-BAG-01', name: 'Сумка',                qty: 42,  reserved: 1, bins: ['A-02-01'] },
  { sku: 'JK-GRY-L',  name: 'Куртка серая L',       qty: 9,   reserved: 1, bins: ['A-02-01'] },
];

export const MOCK_RETURNS: ReturnRow[] = [
  { id: 'RMA-001', orderId: 'ORD-2026-4490', reason: 'Не подошёл размер', status: 'received',   receivedAt: now() },
  { id: 'RMA-002', orderId: 'ORD-2026-4491', reason: 'Брак',              status: 'inspecting', receivedAt: now() },
];

export const MOCK_PROBLEMS: ProblemRow[] = [
  { id: 'P-001', type: 'damage', description: 'Коробка повреждена при разгрузке', reportedBy: 'W-204', createdAt: now(), status: 'open' },
];

export const MOCK_DOCUMENTS: DocumentRow[] = [
  { id: 'D-001', type: 'TORG-12',     number: 'ТОРГ-12 №1843',           createdAt: now() },
  { id: 'D-002', type: 'manifest',    number: 'Манифест MAN-2026-0313',  createdAt: now() },
  { id: 'D-003', type: 'route_sheet', number: 'Маршрутный лист RT-104',  createdAt: now() },
];
