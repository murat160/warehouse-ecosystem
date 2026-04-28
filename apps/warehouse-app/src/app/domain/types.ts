import type { OrderStatus } from './orderStatus';
import type { Role } from './roles';
import type { ZoneCode } from './zones';

// ───────── Worker ─────────
export type ShiftStatus = 'off' | 'on_shift' | 'on_break';

export interface Worker {
  id: string;
  name: string;
  role: Role;
  shiftStatus: ShiftStatus;
  shiftStart?: string;
  shiftEnd?: string;
  productivity: number; // 0..100
  errorRate: number;    // %
  tasksToday: number;
}

// ───────── Catalog ─────────
export interface Sku {
  sku: string;            // SHOE-00991
  barcode: string;        // 5901234567890
  name: string;           // Nike Air Max Black
  category: string;       // Кроссовки
  sellerArticle?: string; // артикул продавца
  photo: string;          // emoji или URL
  weightKg: number;
  fragile?: boolean;
  defaultZone: ZoneCode;
}

// ───────── Bins ─────────
export type BinStatus = 'active' | 'blocked' | 'maintenance';

export interface Bin {
  id: string;          // A-12-04
  warehouse: string;   // MSK-WH-01
  zone: ZoneCode;      // RED
  row: string;         // R-03
  rack: string;        // S-12
  shelf: string;       // P-04
  cell: string;        // A-12-04
  qrCode: string;      // QR://BIN/A-12-04
  capacity: number;
  occupied: number;
  status: BinStatus;
  blockedReason?: string;
}

// ───────── Order item ─────────
export type ItemStatus = 'pending' | 'scanned_bin' | 'scanned_item' | 'found' | 'damaged' | 'missing';

export interface OrderItem {
  id: string;
  sku: string;
  qty: number;
  pickedQty: number;
  binId: string;          // куда сборщик идёт
  status: ItemStatus;
  comment?: string;
  photos?: string[];
}

// ───────── Order ─────────
export type Priority = 'low' | 'normal' | 'high' | 'urgent';
export type ShipMethod = 'courier' | 'pickup' | 'self';

export interface WarehouseOrder {
  id: string;
  code: string;            // ORD-2026-004512
  customerName: string;
  city: string;
  shipMethod: ShipMethod;
  priority: Priority;
  zone: ZoneCode;          // главная цветная зона заказа
  status: OrderStatus;
  slaDeadline: string;
  items: OrderItem[];
  weightKg?: number;
  packageType?: string;
  packagesCount?: number;
  packagePhoto?: string;
  shippingLabel?: string;
  pickerId?: string;
  packerId?: string;
  sorterId?: string;
  shipperId?: string;
  sortBinId?: string;
  courierId?: string;
  proofPhoto?: string;
  receivedAt: string;
  updatedAt: string;
}

// ───────── Tasks ─────────
export type TaskType = 'PICK' | 'SORT' | 'PACK' | 'HANDOFF'
  | 'RECEIVE' | 'PUTAWAY' | 'COUNT' | 'MOVE' | 'RETURN_CHECK';
export type TaskStatus = 'created' | 'assigned' | 'in_progress' | 'completed' | 'blocked';

export interface Task {
  id: string;
  type: TaskType;
  status: TaskStatus;
  priority: Priority;
  assignedTo?: string;
  orderId?: string;
  binId?: string;
  countId?: string;
  rmaId?: string;
  asnId?: string;
  createdAt: string;
  deadline?: string;
}

// ───────── Inventory ─────────
export interface InventoryRow {
  sku: string;
  totalStock: number;
  reserved: number;
  damaged: number;
  returned: number;
  bins: string[];
}

// ───────── Movement ─────────
export interface Movement {
  id: string;
  sku: string;
  fromBinId: string;
  toBinId: string;
  qty: number;
  reason: string;
  workerId: string;
  createdAt: string;
}

// ───────── Inventory count ─────────
export type CountStatus = 'draft' | 'in_progress' | 'discrepancy_found' | 'under_review' | 'closed';

export interface CountLine {
  binId: string;
  sku: string;
  expectedQty: number;
  countedQty?: number;
  photos?: string[];
}

export interface CountTask {
  id: string;
  zone: ZoneCode;
  assignedTo?: string;
  status: CountStatus;
  lines: CountLine[];
  createdAt: string;
  closedAt?: string;
}

// ───────── ASN / Inbound ─────────
export type AsnStatus = 'expected' | 'arrived' | 'receiving' | 'received' | 'discrepancy' | 'closed';

export interface AsnItem {
  id: string;
  sku: string;
  expectedQty: number;
  receivedQty: number;
  damagedQty: number;
  binId?: string;
  photos?: string[];
}

export interface Asn {
  id: string;
  supplierName: string;
  invoiceNumber: string;
  invoiceUrl?: string;
  expectedAt: string;
  arrivedAt?: string;
  status: AsnStatus;
  items: AsnItem[];
}

// ───────── Returns ─────────
export type ReturnStatus = 'received' | 'inspection' | 'restock' | 'damaged'
  | 'write_off' | 'returned_to_supplier' | 'closed';

export interface ReturnItem {
  sku: string;
  qty: number;
  photos?: string[];
  condition?: 'new' | 'used' | 'damaged';
}

export interface ReturnRow {
  id: string;
  orderId: string;
  customerName: string;
  reason: string;
  items: ReturnItem[];
  status: ReturnStatus;
  decision?: ReturnStatus;
  receivedAt: string;
  closedAt?: string;
  inspectorId?: string;
}

// ───────── Problems ─────────
export type ProblemType =
  | 'item_not_found' | 'wrong_bin' | 'wrong_item'
  | 'short_qty' | 'damaged' | 'damaged_packaging'
  | 'sla_breach' | 'courier_no_show' | 'label_print_fail'
  | 'count_discrepancy' | 'other';

export const PROBLEM_TYPE_LABELS: Record<ProblemType, string> = {
  item_not_found:    'Товар не найден',
  wrong_bin:         'Не та ячейка',
  wrong_item:        'Не тот товар',
  short_qty:         'Недостача',
  damaged:           'Брак',
  damaged_packaging: 'Повреждена упаковка',
  sla_breach:        'Просрочен SLA',
  courier_no_show:   'Курьер не пришёл',
  label_print_fail:  'Label не печатается',
  count_discrepancy: 'Расхождение инвентаризации',
  other:             'Другое',
};

export type ProblemStatus = 'open' | 'investigating' | 'escalated' | 'resolved';

export interface Problem {
  id: string;
  type: ProblemType;
  description: string;
  reportedBy: string;
  assignedTo?: string;
  status: ProblemStatus;
  orderId?: string;
  binId?: string;
  sku?: string;
  photos?: string[];
  comments: string[];
  createdAt: string;
  resolvedAt?: string;
}

// ───────── Documents ─────────
export type DocumentType =
  | 'invoice' | 'receiving_act' | 'discrepancy_act' | 'damage_photo'
  | 'shipping_label' | 'packing_slip' | 'courier_handoff_proof'
  | 'return_inspection' | 'inventory_report';

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  invoice:               'Invoice поставки',
  receiving_act:         'Акт приёмки',
  discrepancy_act:       'Акт расхождения',
  damage_photo:          'Фото брака',
  shipping_label:        'Shipping label',
  packing_slip:          'Packing slip',
  courier_handoff_proof: 'Proof выдачи курьеру',
  return_inspection:     'Return inspection',
  inventory_report:      'Inventory report',
};

export type DocumentStatus = 'pending' | 'approved' | 'rejected';

export interface DocumentRow {
  id: string;
  type: DocumentType;
  number: string;
  orderId?: string;
  asnId?: string;
  rmaId?: string;
  status: DocumentStatus;
  uploadedBy?: string;
  createdAt: string;
}

// ───────── Couriers ─────────
export interface Courier {
  id: string;        // CR-104
  name: string;
  phone: string;
  vehiclePlate: string;
}

// ───────── Audit ─────────
export interface AuditEntry {
  id: string;
  action: string;     // PICK_START, SCAN_BIN_OK, RETURN_DECIDE, ...
  workerId: string;
  workerName: string;
  role: Role;
  orderId?: string;
  binId?: string;
  sku?: string;
  taskId?: string;
  rmaId?: string;
  asnId?: string;
  detail: string;
  timestamp: string;
}
