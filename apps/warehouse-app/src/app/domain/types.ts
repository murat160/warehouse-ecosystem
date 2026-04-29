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
  photos?: string[];      // дополнительные фото товара
  weightKg: number;
  fragile?: boolean;
  temperatureControlled?: boolean; // требует холодного хранения
  defaultZone: ZoneCode;
  /** Поставщик/владелец товара по умолчанию (resolved через mock и проявляется в карточках). */
  supplierId?: string;
  /** Селлер/мерчант, продающий товар (если отличается от supplier). */
  sellerId?: string;
  sellerName?: string;
}

// ───────── Bins ─────────
export type BinStatus = 'active' | 'blocked' | 'maintenance';

export interface Bin {
  id: string;          // A-12-04
  warehouse: string;   // MSK-WH-01
  zone: ZoneCode;      // RED
  row: string;         // R-03
  aisle: string;       // A-02
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
  supplierId: string;
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

export type MediaRequest = 'photo_requested' | 'video_requested' | 'media_uploaded';

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
  /** Фото товара до возврата / после возврата / повреждения. */
  photosBefore?: string[];
  photosAfter?: string[];
  photosDamage?: string[];
  /** Видео клиента и проверки склада. */
  videoFromCustomer?: string;
  videoFromInspection?: string;
  comment?: string;
  /** Запросы у клиента: photo_requested / video_requested / media_uploaded. */
  mediaRequest?: MediaRequest;
  /** Связь с поставщиком/селлером и поставкой. */
  supplierId?: string;
  sellerName?: string;
  invoiceNumber?: string;
  asnId?: string;
  linkedDisputeId?: string;
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
  videos?: string[];
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

// ───────── Suppliers ─────────
export type SupplierContractStatus = 'active' | 'on_hold' | 'expired';

export const SUPPLIER_CONTRACT_LABELS: Record<SupplierContractStatus, string> = {
  active:  'Договор активен',
  on_hold: 'Договор на паузе',
  expired: 'Договор истёк',
};

export interface Supplier {
  id: string;            // SUP-7711
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  contractStatus?: SupplierContractStatus;
  /** Канал для отправки доказательств. */
  notifyChannel?: 'email' | 'phone' | 'portal';
}

// ───────── Supplier media ─────────
export type SupplierMediaStatus = 'received' | 'under_review' | 'approved' | 'rejected' | 'mismatch';

export const SUPPLIER_MEDIA_STATUS_LABELS: Record<SupplierMediaStatus, string> = {
  received:     'Получено',
  under_review: 'На проверке',
  approved:     'Одобрено',
  rejected:     'Отклонено',
  mismatch:     'Не совпадает',
};

export interface SupplierMedia {
  id: string;
  supplierId: string;
  supplierName: string;
  productName: string;
  sku: string;
  barcode?: string;
  asnId?: string;
  invoiceNumber?: string;
  expectedQty: number;
  photos: string[];
  videos: string[];
  description: string;
  supplierComment?: string;
  warehouseComment?: string;
  uploadedAt: string;
  status: SupplierMediaStatus;
  reviewedBy?: string;
}

// ───────── Damage report ─────────
export type DamageType =
  | 'broken' | 'scratched' | 'wet' | 'opened_package' | 'missing_parts'
  | 'expired' | 'wrong_item' | 'wrong_quantity' | 'other';

export const DAMAGE_TYPE_LABELS: Record<DamageType, string> = {
  broken:         'Сломан',
  scratched:      'Поцарапан',
  wet:            'Намок',
  opened_package: 'Вскрыта упаковка',
  missing_parts:  'Не хватает частей',
  expired:        'Просрочен',
  wrong_item:     'Не тот товар',
  wrong_quantity: 'Не то количество',
  other:          'Другое',
};

export type DamageReportStatus = 'draft' | 'sent_to_review' | 'approved' | 'rejected';

export interface DamageReport {
  id: string;                     // DMG-...
  asnId?: string;
  asnItemId?: string;
  supplierId?: string;
  supplierName?: string;
  invoiceNumber?: string;
  sku: string;
  damageType: DamageType;
  damagedQty: number;
  description: string;
  photos: string[];
  videos: string[];
  reportedBy: string;
  createdAt: string;
  status: DamageReportStatus;
  reviewerId?: string;
  reviewedAt?: string;
}

// ───────── Supplier dispute ─────────
export type DisputeReason =
  | 'damaged_goods' | 'missing_quantity' | 'wrong_product' | 'quality_issue'
  | 'expired_goods' | 'price_mismatch' | 'document_missing';

export const DISPUTE_REASON_LABELS: Record<DisputeReason, string> = {
  damaged_goods:    'Повреждённый товар',
  missing_quantity: 'Недостача',
  wrong_product:    'Не тот товар',
  quality_issue:    'Качество',
  expired_goods:    'Просрочен',
  price_mismatch:   'Расхождение цены',
  document_missing: 'Нет документа',
};

export type DisputeStatus =
  | 'draft' | 'sent_to_supplier' | 'supplier_response_waiting'
  | 'accepted' | 'rejected' | 'resolved' | 'escalated';

export const DISPUTE_STATUS_LABELS: Record<DisputeStatus, string> = {
  draft:                     'Черновик',
  sent_to_supplier:          'Отправлен поставщику',
  supplier_response_waiting: 'Ждём ответ',
  accepted:                  'Принят поставщиком',
  rejected:                  'Отклонён',
  resolved:                  'Решён',
  escalated:                 'Эскалирован',
};

export interface SupplierDispute {
  id: string;
  supplierId: string;
  supplierName: string;
  invoiceNumber?: string;
  asnId?: string;
  sku: string;
  reason: DisputeReason;
  description: string;
  damagedQty?: number;
  claimedAmount?: number;
  status: DisputeStatus;
  responsibleEmployeeId?: string;
  warehousePhotos: string[];
  warehouseVideos: string[];
  supplierMediaId?: string;       // ссылка на supplier media, если есть
  damageReportId?: string;        // ссылка на damage report
  supplierResponse?: string;
  createdAt: string;
  sentAt?: string;
  resolvedAt?: string;
}

// ───────── Evidence sends (журнал отправок поставщику) ─────────
export type EvidenceSendStatus = 'draft' | 'sent_to_supplier' | 'supplier_viewed' | 'response_received' | 'closed';

export const EVIDENCE_SEND_STATUS_LABELS: Record<EvidenceSendStatus, string> = {
  draft:             'Черновик',
  sent_to_supplier:  'Отправлено',
  supplier_viewed:   'Поставщик увидел',
  response_received: 'Получен ответ',
  closed:            'Закрыто',
};

export type EvidenceLinkedTarget =
  | { type: 'return';  id: string }
  | { type: 'asn';     id: string; asnItemId?: string }
  | { type: 'damage';  id: string }
  | { type: 'dispute'; id: string }
  | { type: 'problem'; id: string };

export interface EvidenceSendItem {
  kind: 'image' | 'video';
  src: string;
  /** Откуда взято: чтобы видно было «фото склада» / «видео клиента». */
  source: 'customer' | 'supplier' | 'warehouse' | 'courier' | 'return' | 'receiving';
  title?: string;
}

export interface EvidenceSend {
  id: string;                       // ES-…
  supplierId: string;
  supplierName: string;
  supplierContact?: string;
  channel: 'email' | 'phone' | 'portal';
  comment: string;
  items: EvidenceSendItem[];
  status: EvidenceSendStatus;
  sentBy: string;
  sentAt: string;
  viewedAt?: string;
  responseAt?: string;
  responseText?: string;
  closedAt?: string;
  linkedTo?: EvidenceLinkedTarget;
  invoiceNumber?: string;
  sku?: string;
}

// ───────── Partial receive (детальная приёмка) ─────────
export type PartialReceiveReason =
  | 'damaged' | 'missing_quantity' | 'wrong_item' | 'wrong_barcode'
  | 'package_opened' | 'expired' | 'other';

export const PARTIAL_RECEIVE_REASON_LABELS: Record<PartialReceiveReason, string> = {
  damaged:          'Повреждение',
  missing_quantity: 'Недостача',
  wrong_item:       'Не тот товар',
  wrong_barcode:    'Не тот штрихкод',
  package_opened:   'Упаковка вскрыта',
  expired:          'Просрочен',
  other:            'Другое',
};

export interface PartialReceiveLine {
  asnItemId: string;
  sku: string;
  expectedQty: number;
  receivedQty: number;
  damagedQty: number;
  missingQty: number;
  reason: PartialReceiveReason;
  comment?: string;
  photos: string[];
  videos: string[];
}

// ───────── Supplier chat ─────────
export type ChatMessageStatus = 'sent' | 'delivered' | 'viewed' | 'response_received';

export const CHAT_MESSAGE_STATUS_LABELS: Record<ChatMessageStatus, string> = {
  sent:              'Отправлено',
  delivered:         'Доставлено',
  viewed:            'Прочитано',
  response_received: 'Получен ответ',
};

export type ChatAuthor = 'warehouse' | 'supplier' | 'admin' | 'returns_operator' | 'support';

export interface ChatAttachment {
  kind: 'image' | 'video';
  src: string;
  title?: string;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  author: ChatAuthor;
  authorName: string;
  text: string;
  attachments: ChatAttachment[];
  sentAt: string;
  status: ChatMessageStatus;
}

export type ChatThreadKind = 'supplier' | 'return';

export interface ChatThread {
  id: string;                                    // CT-…
  kind: ChatThreadKind;
  /** Для supplier-чата — supplierId; для return-чата всё равно может быть. */
  supplierId?: string;
  supplierName?: string;
  /** Для return-чата (общение по возврату). */
  rmaId?: string;
  /** Привязка к источнику. */
  linkedTo?: EvidenceLinkedTarget;
  invoiceNumber?: string;
  sku?: string;
  messages: ChatMessage[];
  createdAt: string;
  /** Для return-чата: с кем складчик ведёт диалог (поставщик / admin / support). */
  participants?: ChatAuthor[];
}

export const SUPPLIER_QUICK_TEMPLATES: string[] = [
  'Товар пришёл повреждённым, приложили фото/видео.',
  'Количество не совпадает с invoice.',
  'Просим подтвердить замену/компенсацию.',
  'Просим объяснение по расхождению.',
  'Возврат связан с вашим товаром, нужна проверка.',
];

export const RETURN_QUICK_TEMPLATES: string[] = [
  'Получили возврат, начинаем проверку.',
  'Прошу прислать дополнительное фото.',
  'Прошу прислать видео распаковки.',
  'Возврат принят в продажу.',
  'Возврат отправлен поставщику.',
];

// ───────── Evidence sources (общая категория для viewer) ─────────
export type EvidenceSource = 'customer' | 'supplier' | 'warehouse' | 'courier' | 'return' | 'receiving';

export const EVIDENCE_SOURCE_LABELS: Record<EvidenceSource, string> = {
  customer:  'Клиент',
  supplier:  'Поставщик',
  warehouse: 'Склад',
  courier:   'Курьер',
  return:    'Возврат',
  receiving: 'Приёмка',
};

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
