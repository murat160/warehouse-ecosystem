import type { Role } from './roles';

// ───────── Employees ─────────
export type ShiftStatus = 'not_started' | 'active' | 'paused' | 'closed';

export interface Employee {
  id: string;
  name: string;
  role: Role;
  pvzId: string;
  position?: string;
  avatar?: string;
  shiftStatus: ShiftStatus;
  phone?: string;
}

// ───────── Shift ─────────
export interface Shift {
  id: string;
  pvzId: string;
  date: string;
  status: ShiftStatus;
  openedBy?: string;
  openedAt?: string;
  pausedAt?: string;
  closedBy?: string;
  closedAt?: string;
  comments: ShiftComment[];
  /** Закреплённые сотрудники на смене. */
  staffIds: string[];
  metrics: {
    issued: number;
    accepted: number;
    returns: number;
    problems: number;
    cashTotal: number;
  };
}

export interface ShiftComment {
  id: string;
  authorId: string;
  text: string;
  createdAt: string;
}

// ───────── Orders ─────────
export type OrderStatus =
  | 'expected_to_pvz'
  | 'arrived_to_pvz'
  | 'receiving'
  | 'stored'
  | 'ready_for_pickup'
  | 'pickup_code_sent'
  | 'issued'
  | 'customer_refused'
  | 'expired_storage'
  | 'return_created'
  | 'returned_to_warehouse'
  | 'returned_to_seller'
  | 'problem'
  | 'cancelled';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  expected_to_pvz:      'Ожидается',
  arrived_to_pvz:       'Прибыл',
  receiving:            'Приёмка',
  stored:               'В ячейке',
  ready_for_pickup:     'Готов к выдаче',
  pickup_code_sent:     'Код отправлен',
  issued:               'Выдан',
  customer_refused:     'Клиент отказался',
  expired_storage:      'Просрочен',
  return_created:       'Возврат создан',
  returned_to_warehouse:'На склад',
  returned_to_seller:   'Продавцу',
  problem:              'Проблема',
  cancelled:            'Отменён',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  expected_to_pvz:      '#94A3B8',
  arrived_to_pvz:       '#0EA5E9',
  receiving:            '#0EA5E9',
  stored:               '#7C3AED',
  ready_for_pickup:     '#22C55E',
  pickup_code_sent:     '#10B981',
  issued:               '#16A34A',
  customer_refused:     '#F59E0B',
  expired_storage:      '#EF4444',
  return_created:       '#F43F5E',
  returned_to_warehouse:'#6366F1',
  returned_to_seller:   '#6366F1',
  problem:              '#DC2626',
  cancelled:            '#6B7280',
};

export interface PickupOrder {
  id: string;
  trackingNumber: string;
  packageLabel: string;
  customerName: string;
  customerPhone: string;
  pickupCode: string;
  qr: string;
  status: OrderStatus;
  arrivedAt?: string;
  storageDeadline?: string;
  pvzId: string;
  cellId?: string;
  zone?: string;
  shelf?: string;
  row?: string;
  packageCount: number;
  weight: number;
  size: 'small' | 'medium' | 'large' | 'oversized';
  fragile: boolean;
  coldChain: boolean;
  category?: string;
  productPhoto?: string;
  packagePhoto?: string;
  courierBatchId?: string;
  warehouseId?: string;
  comments: string[];
  documentIds: string[];
  paymentRequired?: boolean;
  paymentAmount?: number;
  paymentStatus?: 'unpaid' | 'paid' | 'refunded';
}

// ───────── Cells ─────────
export type CellStatus = 'empty' | 'occupied' | 'reserved' | 'blocked' | 'damaged';
export type CellSize = 'small' | 'medium' | 'large' | 'oversized';

export interface Cell {
  id: string;
  pvzId: string;
  qr: string;
  zone: string;
  zoneColor: string;
  row: string;
  shelf: string;
  size: CellSize;
  status: CellStatus;
  capacity: number;
  orderIds: string[];
  notes?: string;
}

// ───────── Receiving / Batches ─────────
export type BatchStatus =
  | 'expected'
  | 'arrived'
  | 'receiving'
  | 'discrepancy'
  | 'accepted'
  | 'rejected';

export const BATCH_STATUS_LABELS: Record<BatchStatus, string> = {
  expected:    'Ожидается',
  arrived:     'Прибыл',
  receiving:   'Приёмка',
  discrepancy: 'Расхождение',
  accepted:    'Принят',
  rejected:    'Отклонён',
};

export interface CourierBatch {
  id: string;
  pvzId: string;
  courierId: string;
  courierName: string;
  vehicleNumber?: string;
  warehouseId?: string;
  expectedCount: number;
  receivedCount: number;
  arrivedAt: string;
  closedAt?: string;
  status: BatchStatus;
  orderIds: string[];
  receivedOrderIds: string[];
  discrepancyOrderIds: string[];
  damagedOrderIds: string[];
  notes?: string;
  signedBy?: string;
}

// ───────── Couriers ─────────
export interface Courier {
  id: string;
  name: string;
  phone: string;
  vehicleNumber?: string;
  status: 'idle' | 'en_route_in' | 'arrived' | 'en_route_out' | 'completed';
  pvzId: string;
  /** Что курьер делает на ПВЗ: привёз / забирает возвраты / забирает просроченные. */
  purpose: 'inbound' | 'returns_pickup' | 'expired_pickup';
  expectedAt?: string;
  arrivedAt?: string;
  batchId?: string;
}

// ───────── Returns ─────────
export type ReturnReason =
  | 'damaged'
  | 'wrong_item'
  | 'incomplete'
  | 'customer_refusal'
  | 'not_picked_up'
  | 'quality'
  | 'other';

export type ReturnStatus =
  | 'created'
  | 'received_at_pvz'
  | 'inspection'
  | 'waiting_admin_decision'
  | 'send_to_warehouse'
  | 'send_to_seller'
  | 'refunded'
  | 'rejected'
  | 'closed';

export const RETURN_STATUS_LABELS: Record<ReturnStatus, string> = {
  created:                 'Создан',
  received_at_pvz:         'Принят в ПВЗ',
  inspection:              'Осмотр',
  waiting_admin_decision:  'Ждёт решения',
  send_to_warehouse:       'На склад',
  send_to_seller:          'Продавцу',
  refunded:                'Возврат денег',
  rejected:                'Отказан',
  closed:                  'Закрыт',
};

export interface PickupReturn {
  id: string;
  orderId: string;
  pvzId: string;
  customerName: string;
  customerPhone: string;
  reason: ReturnReason;
  description: string;
  photos: string[];
  videos: string[];
  status: ReturnStatus;
  assignedTo?: string;
  createdAt: string;
  closedAt?: string;
  documentIds: string[];
  refundAmount?: number;
}

// ───────── Problems ─────────
export type ProblemType =
  | 'customer_check_failed'
  | 'wrong_order'
  | 'order_not_found'
  | 'damaged_package'
  | 'opened_package'
  | 'shortage'
  | 'extra_package'
  | 'courier_incomplete'
  | 'qr_unreadable'
  | 'customer_refused'
  | 'expired_storage'
  | 'customer_conflict'
  | 'cash_mismatch'
  | 'technical';

export const PROBLEM_TYPE_LABELS: Record<ProblemType, string> = {
  customer_check_failed: 'Клиент не прошёл проверку',
  wrong_order:           'Не тот заказ',
  order_not_found:       'Заказ не найден',
  damaged_package:       'Повреждена посылка',
  opened_package:        'Посылка вскрыта',
  shortage:              'Недостача',
  extra_package:         'Лишняя посылка',
  courier_incomplete:    'Курьер привёз не всё',
  qr_unreadable:         'QR не читается',
  customer_refused:      'Клиент отказался',
  expired_storage:       'Просрочка',
  customer_conflict:     'Конфликт с клиентом',
  cash_mismatch:         'Расхождение в кассе',
  technical:             'Техническая ошибка',
};

export type ProblemStatus = 'open' | 'in_progress' | 'escalated' | 'resolved' | 'rejected';
export type ProblemPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Problem {
  id: string;
  type: ProblemType;
  pvzId: string;
  orderId?: string;
  returnId?: string;
  batchId?: string;
  description: string;
  photos: string[];
  videos: string[];
  priority: ProblemPriority;
  status: ProblemStatus;
  assignedTo?: string;
  createdBy: string;
  createdAt: string;
  resolvedAt?: string;
  resolution?: string;
}

// ───────── Cash / Collection ─────────
export type CashOperationKind = 'cash_in' | 'card_payment' | 'refund' | 'correction' | 'opening' | 'closing';

export interface CashOperation {
  id: string;
  shiftId: string;
  pvzId: string;
  kind: CashOperationKind;
  amount: number;
  orderId?: string;
  returnId?: string;
  cashier: string;
  createdAt: string;
  notes?: string;
}

export interface Cashbox {
  id: string;
  pvzId: string;
  shiftId: string;
  status: 'open' | 'closed';
  openingBalance: number;
  cashReceived: number;
  cardPayments: number;
  refunds: number;
  corrections: number;
  closingBalance?: number;
  cashier?: string;
  openedAt?: string;
  closedAt?: string;
}

export type CollectionStatus = 'requested' | 'prepared' | 'collected' | 'confirmed' | 'discrepancy';

export interface Collection {
  id: string;
  pvzId: string;
  amount: number;
  status: CollectionStatus;
  collectorName?: string;
  collectorPhone?: string;
  documentIds: string[];
  requestedAt: string;
  confirmedAt?: string;
  notes?: string;
}

// ───────── Documents ─────────
export type DocumentKind =
  | 'batch_acceptance'
  | 'discrepancy_act'
  | 'proof_of_pickup'
  | 'return_doc'
  | 'damage_report'
  | 'cash_report'
  | 'collection_report'
  | 'shift_report'
  | 'problem_report'
  | 'customer_refusal';

export const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = {
  batch_acceptance:  'Акт приёмки',
  discrepancy_act:   'Акт расхождения',
  proof_of_pickup:   'Подтверждение выдачи',
  return_doc:        'Документ возврата',
  damage_report:     'Акт повреждения',
  cash_report:       'Кассовый отчёт',
  collection_report: 'Отчёт инкассации',
  shift_report:      'Отчёт смены',
  problem_report:    'Отчёт по проблеме',
  customer_refusal:  'Отказ клиента',
};

export type DocumentStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'expired';

export interface PickupDocument {
  id: string;
  kind: DocumentKind;
  pvzId: string;
  title: string;
  status: DocumentStatus;
  orderId?: string;
  returnId?: string;
  problemId?: string;
  batchId?: string;
  uploadedBy?: string;
  uploadedAt: string;
  expiresAt?: string;
  url?: string;
  size?: string;
}

// ───────── Audit ─────────
export interface AuditEntry {
  id: string;
  ts: string;
  actorId: string;
  actorName: string;
  action: string;
  target?: string;
  details?: string;
}

// ───────── Chat ─────────
export type ChatThreadKind =
  | 'shift'
  | 'manager'
  | 'support'
  | 'order'
  | 'return'
  | 'problem'
  | 'courier';

export const CHAT_THREAD_LABELS: Record<ChatThreadKind, string> = {
  shift:   'Чат смены',
  manager: 'Менеджер ПВЗ',
  support: 'Поддержка',
  order:   'По заказу',
  return:  'По возврату',
  problem: 'По проблеме',
  courier: 'С курьером',
};

export type ChatMessageStatus = 'sent' | 'delivered' | 'viewed';

export interface ChatMessage {
  id: string;
  threadId: string;
  authorId: string;
  authorName: string;
  text: string;
  attachments?: string[];
  createdAt: string;
  status: ChatMessageStatus;
}

export interface ChatThread {
  id: string;
  kind: ChatThreadKind;
  title: string;
  pvzId: string;
  participantIds: string[];
  unreadCount: number;
  messages: ChatMessage[];
  linkedOrderId?: string;
  linkedReturnId?: string;
  linkedProblemId?: string;
  closed: boolean;
}

// ───────── PVZ Settings ─────────
export interface PvzSettings {
  id: string;
  name: string;
  address: string;
  workingHours: string;
  storageLimitDays: number;
  expiredAfterDays: number;
  otpEnabled: boolean;
  qrEnabled: boolean;
  cashEnabled: boolean;
  returnsEnabled: boolean;
  language: 'ru' | 'kk' | 'en';
  notificationsEnabled: boolean;
}
