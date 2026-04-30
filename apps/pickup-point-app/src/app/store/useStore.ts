import { useSyncExternalStore } from 'react';
import type {
  Employee, Shift, PickupOrder, Cell, CourierBatch, Courier,
  PickupReturn, Problem, CashOperation, Cashbox, Collection,
  PickupDocument, AuditEntry, ChatThread, PvzSettings, OrderStatus,
  ReturnStatus, ProblemType, ProblemPriority, ReturnReason,
  BatchStatus, CellStatus, ChatThreadKind, DocumentKind,
  CashOperationKind, ChatMessage,
} from '../domain/types';
import {
  MOCK_PVZ, MOCK_EMPLOYEES, MOCK_SHIFT, MOCK_ORDERS, MOCK_CELLS,
  MOCK_BATCHES, MOCK_COURIERS, MOCK_RETURNS, MOCK_PROBLEMS,
  MOCK_CASHBOX, MOCK_CASH_OPS, MOCK_COLLECTIONS, MOCK_DOCUMENTS,
  MOCK_AUDIT, MOCK_CHATS,
} from '../domain/mock';

interface State {
  pvz: PvzSettings;
  currentEmployee: Employee | null;
  employees: Employee[];
  shift: Shift;
  orders: PickupOrder[];
  cells: Cell[];
  batches: CourierBatch[];
  couriers: Courier[];
  returns: PickupReturn[];
  problems: Problem[];
  cashbox: Cashbox;
  cashOps: CashOperation[];
  collections: Collection[];
  documents: PickupDocument[];
  audit: AuditEntry[];
  chats: ChatThread[];
}

let state: State = {
  pvz:             MOCK_PVZ,
  currentEmployee: null,
  employees:       MOCK_EMPLOYEES,
  shift:           MOCK_SHIFT,
  orders:          MOCK_ORDERS,
  cells:           MOCK_CELLS,
  batches:         MOCK_BATCHES,
  couriers:        MOCK_COURIERS,
  returns:         MOCK_RETURNS,
  problems:        MOCK_PROBLEMS,
  cashbox:         MOCK_CASHBOX,
  cashOps:         MOCK_CASH_OPS,
  collections:     MOCK_COLLECTIONS,
  documents:       MOCK_DOCUMENTS,
  audit:           MOCK_AUDIT,
  chats:           MOCK_CHATS,
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const getSnapshot = () => state;
const set = (next: Partial<State>) => { state = { ...state, ...next }; emit(); };

export function useStore(): State {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
const nowIso = () => new Date().toISOString();

const audit = (action: string, target?: string, details?: string) => {
  const e = state.currentEmployee;
  const entry: AuditEntry = {
    id: uid('AUD'),
    ts: nowIso(),
    actorId: e?.id ?? 'system',
    actorName: e?.name ?? 'Система',
    action,
    target,
    details,
  };
  set({ audit: [entry, ...state.audit] });
};

export const store = {
  // ───────── auth ─────────
  login(employeeId: string) {
    const emp = state.employees.find(e => e.id === employeeId);
    if (!emp) return false;
    set({ currentEmployee: emp });
    audit('auth.login', emp.id, `Вход в ПВЗ App: ${emp.name}`);
    return true;
  },
  logout() {
    if (state.currentEmployee) audit('auth.logout', state.currentEmployee.id, 'Выход');
    set({ currentEmployee: null });
  },

  // ───────── shift ─────────
  openShift() {
    if (state.shift.status === 'active') return;
    set({ shift: { ...state.shift, status: 'active', openedAt: nowIso(), openedBy: state.currentEmployee?.id } });
    audit('shift.open', state.shift.id, 'Смена открыта');
  },
  pauseShift() {
    if (state.shift.status !== 'active') return;
    set({ shift: { ...state.shift, status: 'paused', pausedAt: nowIso() } });
    audit('shift.pause', state.shift.id, 'Смена на паузе');
  },
  resumeShift() {
    if (state.shift.status !== 'paused') return;
    set({ shift: { ...state.shift, status: 'active' } });
    audit('shift.resume', state.shift.id, 'Смена возобновлена');
  },
  closeShift(force = false): { ok: boolean; reason?: string } {
    if (state.shift.status === 'closed') return { ok: false, reason: 'Смена уже закрыта' };
    if (!force) {
      if (state.cashbox.status === 'open') return { ok: false, reason: 'Касса не закрыта' };
      const openReturns = state.returns.filter(r => r.status === 'received_at_pvz' || r.status === 'inspection');
      if (openReturns.length) return { ok: false, reason: `Не закрыто возвратов: ${openReturns.length}` };
      const openBatches = state.batches.filter(b => b.status === 'arrived' || b.status === 'receiving');
      if (openBatches.length) return { ok: false, reason: `Не закрыто приёмок: ${openBatches.length}` };
      const critical = state.problems.filter(p => p.priority === 'critical' && p.status !== 'resolved' && p.status !== 'escalated');
      if (critical.length) return { ok: false, reason: `Критические проблемы без эскалации: ${critical.length}` };
    }
    set({ shift: { ...state.shift, status: 'closed', closedAt: nowIso(), closedBy: state.currentEmployee?.id } });
    audit('shift.close', state.shift.id, force ? 'Смена закрыта (force)' : 'Смена закрыта');
    return { ok: true };
  },
  addShiftComment(text: string) {
    const c = { id: uid('SC'), authorId: state.currentEmployee?.id ?? 'system', text, createdAt: nowIso() };
    set({ shift: { ...state.shift, comments: [c, ...state.shift.comments] } });
    audit('shift.comment', state.shift.id, text.slice(0, 80));
  },

  // ───────── orders ─────────
  setOrderStatus(orderId: string, status: OrderStatus, details?: string) {
    set({ orders: state.orders.map(o => o.id === orderId ? { ...o, status } : o) });
    audit('order.status', orderId, `→ ${status}${details ? `: ${details}` : ''}`);
  },
  placeOrderInCell(orderId: string, cellId: string) {
    const cell = state.cells.find(c => c.id === cellId);
    if (!cell) return;
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;

    const cells = state.cells.map(c => {
      if (c.id === cellId) return { ...c, status: 'occupied' as CellStatus, orderIds: [...c.orderIds, orderId] };
      if (order.cellId === c.id) return { ...c, orderIds: c.orderIds.filter(x => x !== orderId), status: c.orderIds.length <= 1 ? 'empty' as CellStatus : c.status };
      return c;
    });
    const orders = state.orders.map(o => o.id === orderId
      ? { ...o, cellId, zone: cell.zone, shelf: cell.shelf, row: cell.row, status: 'stored' as OrderStatus }
      : o);
    set({ cells, orders });
    audit('order.placed_in_cell', orderId, `Размещён в ${cellId}`);
  },
  moveOrder(orderId: string, newCellId: string) {
    this.placeOrderInCell(orderId, newCellId);
    audit('order.moved', orderId, `Перемещён в ${newCellId}`);
  },
  markReadyForPickup(orderId: string) {
    set({ orders: state.orders.map(o => o.id === orderId ? { ...o, status: 'ready_for_pickup' as OrderStatus } : o) });
    audit('order.ready', orderId, 'Готов к выдаче');
  },
  sendPickupCode(orderId: string) {
    set({ orders: state.orders.map(o => o.id === orderId ? { ...o, status: 'pickup_code_sent' as OrderStatus } : o) });
    audit('order.code_sent', orderId, 'Pickup code отправлен клиенту');
  },
  issueOrderToCustomer(orderId: string, opts: { codeMatched: boolean; labelMatched: boolean }) {
    if (!opts.codeMatched) return { ok: false, reason: 'Код клиента не совпал' };
    if (!opts.labelMatched) return { ok: false, reason: 'Package label не совпал' };
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return { ok: false, reason: 'Заказ не найден' };
    if (order.status === 'issued') return { ok: false, reason: 'Заказ уже выдан' };

    const cells = state.cells.map(c => order.cellId === c.id
      ? { ...c, orderIds: c.orderIds.filter(x => x !== orderId), status: c.orderIds.length <= 1 ? 'empty' as CellStatus : c.status }
      : c);
    const orders = state.orders.map(o => o.id === orderId
      ? { ...o, status: 'issued' as OrderStatus, cellId: undefined }
      : o);
    const docs: PickupDocument[] = [
      { id: uid('DOC'), kind: 'proof_of_pickup', pvzId: state.pvz.id, title: `Подтверждение выдачи ${orderId}`, status: 'approved', orderId, uploadedBy: state.currentEmployee?.id, uploadedAt: nowIso(), size: '52 KB' },
      ...state.documents,
    ];
    set({
      cells,
      orders,
      documents: docs,
      shift: { ...state.shift, metrics: { ...state.shift.metrics, issued: state.shift.metrics.issued + 1 } },
    });
    audit('order.issued', orderId, 'Выдан клиенту, создан proof_of_pickup');
    return { ok: true };
  },
  customerRefused(orderId: string, reason: string) {
    set({ orders: state.orders.map(o => o.id === orderId ? { ...o, status: 'customer_refused' as OrderStatus } : o) });
    audit('order.customer_refused', orderId, reason);
  },
  addOrderComment(orderId: string, text: string) {
    set({ orders: state.orders.map(o => o.id === orderId ? { ...o, comments: [...o.comments, text] } : o) });
    audit('order.comment', orderId, text.slice(0, 80));
  },
  printOrderLabel(orderId: string) {
    audit('order.label_printed', orderId, 'Распечатан label');
    return `LABEL-${orderId}`;
  },

  // ───────── batches / receiving ─────────
  startBatchReceiving(batchId: string) {
    set({ batches: state.batches.map(b => b.id === batchId ? { ...b, status: 'receiving' as BatchStatus } : b) });
    audit('batch.receive_start', batchId);
  },
  receivePackage(batchId: string, orderId: string) {
    const batch = state.batches.find(b => b.id === batchId);
    if (!batch || batch.receivedOrderIds.includes(orderId)) return;
    const batches = state.batches.map(b => b.id === batchId
      ? { ...b, receivedOrderIds: [...b.receivedOrderIds, orderId], receivedCount: b.receivedCount + 1 }
      : b);
    const orders = state.orders.map(o => o.id === orderId ? { ...o, status: 'arrived_to_pvz' as OrderStatus, courierBatchId: batchId, arrivedAt: nowIso() } : o);
    set({ batches, orders });
    audit('batch.package_received', batchId, `Принята посылка ${orderId}`);
  },
  flagBatchDiscrepancy(batchId: string, orderId: string, kind: 'missing' | 'extra' | 'damaged', notes?: string) {
    const batches = state.batches.map(b => {
      if (b.id !== batchId) return b;
      const list = kind === 'damaged' ? [...b.damagedOrderIds, orderId] : [...b.discrepancyOrderIds, orderId];
      return {
        ...b,
        damagedOrderIds: kind === 'damaged' ? list : b.damagedOrderIds,
        discrepancyOrderIds: kind === 'damaged' ? b.discrepancyOrderIds : list,
        status: 'discrepancy' as BatchStatus,
        notes: notes ?? b.notes,
      };
    });
    set({ batches });
    audit('batch.discrepancy', batchId, `${kind}: ${orderId}${notes ? ` — ${notes}` : ''}`);
  },
  closeBatch(batchId: string, accepted: boolean) {
    set({
      batches: state.batches.map(b => b.id === batchId ? { ...b, status: (accepted ? 'accepted' : 'rejected') as BatchStatus, closedAt: nowIso(), signedBy: state.currentEmployee?.id } : b),
      shift: { ...state.shift, metrics: { ...state.shift.metrics, accepted: state.shift.metrics.accepted + (state.batches.find(b => b.id === batchId)?.receivedCount ?? 0) } },
    });
    audit(accepted ? 'batch.accepted' : 'batch.rejected', batchId);
  },

  // ───────── cells ─────────
  createCell(cell: Omit<Cell, 'orderIds'>) {
    set({ cells: [...state.cells, { ...cell, orderIds: [] }] });
    audit('cell.created', cell.id);
  },
  blockCell(cellId: string, reason: string) {
    set({ cells: state.cells.map(c => c.id === cellId ? { ...c, status: 'blocked' as CellStatus, notes: reason } : c) });
    audit('cell.blocked', cellId, reason);
  },
  unblockCell(cellId: string) {
    set({ cells: state.cells.map(c => c.id === cellId ? { ...c, status: c.orderIds.length ? 'occupied' as CellStatus : 'empty' as CellStatus } : c) });
    audit('cell.unblocked', cellId);
  },
  printCellQr(cellId: string) {
    audit('cell.qr_printed', cellId);
    return `QR-${cellId}`;
  },

  // ───────── returns ─────────
  createReturn(payload: { orderId: string; reason: ReturnReason; description: string }) {
    const order = state.orders.find(o => o.id === payload.orderId);
    const ret: PickupReturn = {
      id: uid('RET'),
      orderId: payload.orderId,
      pvzId: state.pvz.id,
      customerName: order?.customerName ?? '—',
      customerPhone: order?.customerPhone ?? '—',
      reason: payload.reason,
      description: payload.description,
      photos: [], videos: [],
      status: 'created',
      assignedTo: state.currentEmployee?.id,
      createdAt: nowIso(),
      documentIds: [],
    };
    set({
      returns: [ret, ...state.returns],
      orders: state.orders.map(o => o.id === payload.orderId ? { ...o, status: 'return_created' as OrderStatus } : o),
      shift: { ...state.shift, metrics: { ...state.shift.metrics, returns: state.shift.metrics.returns + 1 } },
    });
    audit('return.created', ret.id, `Возврат по ${payload.orderId}: ${payload.reason}`);
    return ret;
  },
  setReturnStatus(returnId: string, status: ReturnStatus, note?: string) {
    set({ returns: state.returns.map(r => r.id === returnId ? { ...r, status, closedAt: status === 'closed' ? nowIso() : r.closedAt } : r) });
    audit('return.status', returnId, `→ ${status}${note ? `: ${note}` : ''}`);
  },
  attachReturnMedia(returnId: string, kind: 'photo' | 'video', name: string) {
    set({
      returns: state.returns.map(r => r.id === returnId
        ? (kind === 'photo' ? { ...r, photos: [...r.photos, name] } : { ...r, videos: [...r.videos, name] })
        : r),
    });
    audit('return.media', returnId, `Загружено ${kind}: ${name}`);
  },

  // ───────── problems ─────────
  createProblem(payload: {
    type: ProblemType; description: string;
    orderId?: string; returnId?: string; batchId?: string;
    priority?: ProblemPriority;
  }) {
    const p: Problem = {
      id: uid('PRB'),
      type: payload.type,
      pvzId: state.pvz.id,
      orderId: payload.orderId,
      returnId: payload.returnId,
      batchId: payload.batchId,
      description: payload.description,
      photos: [], videos: [],
      priority: payload.priority ?? 'medium',
      status: 'open',
      createdBy: state.currentEmployee?.id ?? 'system',
      createdAt: nowIso(),
    };
    set({
      problems: [p, ...state.problems],
      shift: { ...state.shift, metrics: { ...state.shift.metrics, problems: state.shift.metrics.problems + 1 } },
    });
    audit('problem.created', p.id, `${payload.type}: ${payload.description.slice(0, 60)}`);
    return p;
  },
  assignProblem(problemId: string, employeeId: string) {
    set({ problems: state.problems.map(p => p.id === problemId ? { ...p, assignedTo: employeeId, status: 'in_progress' } : p) });
    audit('problem.assigned', problemId, `→ ${employeeId}`);
  },
  escalateProblem(problemId: string) {
    set({ problems: state.problems.map(p => p.id === problemId ? { ...p, status: 'escalated' } : p) });
    audit('problem.escalated', problemId, 'Эскалирован в Admin Panel');
  },
  resolveProblem(problemId: string, resolution: string) {
    set({ problems: state.problems.map(p => p.id === problemId ? { ...p, status: 'resolved', resolvedAt: nowIso(), resolution } : p) });
    audit('problem.resolved', problemId, resolution);
  },
  attachProblemMedia(problemId: string, kind: 'photo' | 'video', name: string) {
    set({
      problems: state.problems.map(p => p.id === problemId
        ? (kind === 'photo' ? { ...p, photos: [...p.photos, name] } : { ...p, videos: [...p.videos, name] })
        : p),
    });
    audit('problem.media', problemId, `${kind}: ${name}`);
  },

  // ───────── cash ─────────
  openCashbox(opening: number) {
    set({ cashbox: { ...state.cashbox, status: 'open', openingBalance: opening, openedAt: nowIso(), cashier: state.currentEmployee?.id } });
    audit('cash.open', state.cashbox.id, `Открытие кассы: ${opening}`);
  },
  closeCashbox(closingBalance: number) {
    set({ cashbox: { ...state.cashbox, status: 'closed', closingBalance, closedAt: nowIso() } });
    audit('cash.close', state.cashbox.id, `Закрытие кассы: ${closingBalance}`);
  },
  addCashOp(kind: CashOperationKind, amount: number, refs?: { orderId?: string; returnId?: string; notes?: string }) {
    const op: CashOperation = {
      id: uid('OP'),
      shiftId: state.shift.id,
      pvzId: state.pvz.id,
      kind, amount,
      orderId: refs?.orderId,
      returnId: refs?.returnId,
      cashier: state.currentEmployee?.id ?? '—',
      createdAt: nowIso(),
      notes: refs?.notes,
    };
    const cb = { ...state.cashbox };
    if (kind === 'cash_in')      cb.cashReceived += amount;
    if (kind === 'card_payment') cb.cardPayments += amount;
    if (kind === 'refund')       cb.refunds += amount;
    if (kind === 'correction')   cb.corrections += amount;
    set({
      cashOps: [op, ...state.cashOps], cashbox: cb,
      shift: { ...state.shift, metrics: { ...state.shift.metrics, cashTotal: cb.cashReceived + cb.cardPayments - cb.refunds + cb.corrections } },
    });
    audit('cash.op', op.id, `${kind}: ${amount}`);
  },

  // ───────── collection ─────────
  requestCollection(amount: number, notes?: string) {
    const c: Collection = {
      id: uid('COL'),
      pvzId: state.pvz.id,
      amount,
      status: 'requested',
      documentIds: [],
      requestedAt: nowIso(),
      notes,
    };
    set({ collections: [c, ...state.collections] });
    audit('collection.requested', c.id, `Запрос инкассации на ${amount}`);
    return c;
  },
  confirmCollection(collectionId: string, collectorName: string, collectorPhone: string) {
    set({
      collections: state.collections.map(c => c.id === collectionId
        ? { ...c, status: 'confirmed', collectorName, collectorPhone, confirmedAt: nowIso() }
        : c),
    });
    audit('collection.confirmed', collectionId, `${collectorName} (${collectorPhone})`);
  },

  // ───────── documents ─────────
  uploadDocument(payload: { kind: DocumentKind; title: string; size: string; orderId?: string; returnId?: string; problemId?: string; batchId?: string }) {
    const d: PickupDocument = {
      id: uid('DOC'),
      pvzId: state.pvz.id,
      kind: payload.kind,
      title: payload.title,
      status: 'pending',
      orderId: payload.orderId,
      returnId: payload.returnId,
      problemId: payload.problemId,
      batchId: payload.batchId,
      uploadedBy: state.currentEmployee?.id,
      uploadedAt: nowIso(),
      size: payload.size,
    };
    set({ documents: [d, ...state.documents] });
    audit('document.upload', d.id, `${payload.kind}: ${payload.title}`);
    return d;
  },
  approveDocument(docId: string) {
    set({ documents: state.documents.map(d => d.id === docId ? { ...d, status: 'approved' } : d) });
    audit('document.approved', docId);
  },
  rejectDocument(docId: string, reason: string) {
    set({ documents: state.documents.map(d => d.id === docId ? { ...d, status: 'rejected' } : d) });
    audit('document.rejected', docId, reason);
  },
  downloadDocument(docId: string) {
    audit('document.downloaded', docId);
    return `download:${docId}`;
  },

  // ───────── reports ─────────
  exportReport(kind: string, format: 'csv' | 'xlsx' | 'pdf') {
    audit('report.export', kind, `format=${format}`);
    return `export:${kind}.${format}`;
  },

  // ───────── chat ─────────
  sendChatMessage(threadId: string, text: string, attachments?: string[]) {
    const m: ChatMessage = {
      id: uid('M'),
      threadId,
      authorId: state.currentEmployee?.id ?? 'system',
      authorName: state.currentEmployee?.name ?? 'Система',
      text,
      attachments,
      createdAt: nowIso(),
      status: 'sent',
    };
    set({
      chats: state.chats.map(c => c.id === threadId
        ? { ...c, messages: [...c.messages, m] }
        : c),
    });
    audit('chat.message', threadId, text.slice(0, 80));
  },
  markChatRead(threadId: string) {
    set({ chats: state.chats.map(c => c.id === threadId ? { ...c, unreadCount: 0 } : c) });
  },
  createChat(kind: ChatThreadKind, title: string, opts?: { orderId?: string; returnId?: string; problemId?: string }) {
    const t: ChatThread = {
      id: uid('CHT'),
      kind, title,
      pvzId: state.pvz.id,
      participantIds: state.currentEmployee ? [state.currentEmployee.id] : [],
      unreadCount: 0,
      messages: [],
      linkedOrderId: opts?.orderId,
      linkedReturnId: opts?.returnId,
      linkedProblemId: opts?.problemId,
      closed: false,
    };
    set({ chats: [t, ...state.chats] });
    audit('chat.created', t.id, title);
    return t;
  },

  // ───────── couriers ─────────
  setCourierStatus(courierId: string, status: Courier['status']) {
    set({ couriers: state.couriers.map(c => c.id === courierId ? { ...c, status } : c) });
    audit('courier.status', courierId, status);
  },

  // ───────── settings ─────────
  updateSettings(patch: Partial<PvzSettings>) {
    set({ pvz: { ...state.pvz, ...patch } });
    audit('settings.update', state.pvz.id, JSON.stringify(patch));
  },

  // ───────── employees ─────────
  setEmployeeShift(employeeId: string, shiftStatus: Employee['shiftStatus']) {
    set({ employees: state.employees.map(e => e.id === employeeId ? { ...e, shiftStatus } : e) });
    audit('employee.shift', employeeId, shiftStatus);
  },
};
