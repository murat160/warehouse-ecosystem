import { useSyncExternalStore } from 'react';
import type {
  Worker, Sku, Bin, WarehouseOrder, Task, InventoryRow, Movement,
  CountTask, Asn, ReturnRow, Problem, DocumentRow, Courier,
  AuditEntry, ProblemType, ReturnStatus, ItemStatus, ShiftStatus,
  Supplier, SupplierMedia, SupplierMediaStatus,
  DamageReport, DamageType,
  SupplierDispute, DisputeReason, DisputeStatus,
  EvidenceSend, EvidenceSendItem, EvidenceLinkedTarget,
  ChatThread, ChatMessage, ChatAuthor, ChatAttachment, ChatThreadKind,
  ChatThreadStatus, ChatThreadPriority,
  PartialReceiveLine,
} from '../domain/types';
import type { OrderStatus } from '../domain/orderStatus';
import { NEXT_STATUSES } from '../domain/orderStatus';
import {
  MOCK_WORKERS, MOCK_SKUS, MOCK_BINS, MOCK_ORDERS, MOCK_TASKS,
  MOCK_INVENTORY, MOCK_MOVEMENTS, MOCK_COUNTS, MOCK_ASNS,
  MOCK_RETURNS, MOCK_PROBLEMS, MOCK_DOCUMENTS, MOCK_COURIERS,
  MOCK_SUPPLIERS, MOCK_SUPPLIER_MEDIA, MOCK_DAMAGE_REPORTS, MOCK_SUPPLIER_DISPUTES,
  MOCK_EVIDENCE_SENDS, MOCK_CHAT_THREADS,
} from '../domain/mock';
import { MOCK_SORT_BINS, type SortBin } from '../domain/sortBins';

interface State {
  currentWorker: Worker | null;
  workers: Worker[];
  skus: Sku[];
  bins: Bin[];
  orders: WarehouseOrder[];
  tasks: Task[];
  inventory: InventoryRow[];
  movements: Movement[];
  counts: CountTask[];
  asns: Asn[];
  returns: ReturnRow[];
  problems: Problem[];
  documents: DocumentRow[];
  couriers: Courier[];
  sortBins: SortBin[];
  audit: AuditEntry[];
  suppliers: Supplier[];
  supplierMedia: SupplierMedia[];
  damageReports: DamageReport[];
  supplierDisputes: SupplierDispute[];
  evidenceSends: EvidenceSend[];
  chatThreads: ChatThread[];
  /** Журнал scanner-проверок: блокировки и нужные override-ы. */
  scanBlocks: ScanBlock[];
}

export interface ScanBlock {
  id: string;
  reason: string;
  context: string;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

let state: State = {
  currentWorker: null,
  workers:   MOCK_WORKERS,
  skus:      MOCK_SKUS,
  bins:      MOCK_BINS,
  orders:    MOCK_ORDERS,
  tasks:     MOCK_TASKS,
  inventory: MOCK_INVENTORY,
  movements: MOCK_MOVEMENTS,
  counts:    MOCK_COUNTS,
  asns:      MOCK_ASNS,
  returns:   MOCK_RETURNS,
  problems:  MOCK_PROBLEMS,
  documents: MOCK_DOCUMENTS,
  couriers:  MOCK_COURIERS,
  sortBins:  MOCK_SORT_BINS,
  audit:     [],
  suppliers:        MOCK_SUPPLIERS,
  supplierMedia:    MOCK_SUPPLIER_MEDIA,
  damageReports:    MOCK_DAMAGE_REPORTS,
  supplierDisputes: MOCK_SUPPLIER_DISPUTES,
  evidenceSends:    MOCK_EVIDENCE_SENDS,
  chatThreads:      MOCK_CHAT_THREADS,
  scanBlocks:       [],
};

const listeners = new Set<() => void>();
function emit() { listeners.forEach(l => l()); }
function subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; }
function getSnapshot() { return state; }

export function useStore(): State {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

// ───────── helpers ─────────
const PARTIAL_REASON_FALLBACK: Record<PartialReceiveLine['reason'], string> = {
  damaged:          'Повреждение при приёмке',
  missing_quantity: 'Расхождение по количеству',
  wrong_item:       'Не тот товар',
  wrong_barcode:    'Не тот штрихкод',
  package_opened:   'Упаковка вскрыта',
  expired:          'Просрочен',
  other:            'Другое расхождение',
};

function audit(action: string, detail: string, extra: Partial<AuditEntry> = {}) {
  const w = state.currentWorker;
  if (!w) return;
  const e: AuditEntry = {
    id: `LOG-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    action, detail,
    workerId: w.id, workerName: w.name, role: w.role,
    timestamp: new Date().toISOString(),
    ...extra,
  };
  state = { ...state, audit: [e, ...state.audit].slice(0, 500) };
}

function patchOrder(orderId: string, fn: (o: WarehouseOrder) => WarehouseOrder): boolean {
  const o = state.orders.find(x => x.id === orderId);
  if (!o) return false;
  state = {
    ...state,
    orders: state.orders.map(x => x.id === orderId ? { ...fn(x), updatedAt: new Date().toISOString() } : x),
  };
  return true;
}

function patchItem(orderId: string, itemId: string, fn: (it: WarehouseOrder['items'][number]) => WarehouseOrder['items'][number]) {
  patchOrder(orderId, o => ({ ...o, items: o.items.map(it => it.id === itemId ? fn(it) : it) }));
}

// ───────── public store ─────────
export const store = {
  // ── Auth ──
  login(workerId: string): boolean {
    const w = state.workers.find(x => x.id === workerId);
    if (!w) return false;
    state = { ...state, currentWorker: w };
    audit('LOGIN', `Вход: ${w.name} (${w.role})`);
    emit();
    return true;
  },

  logout(): void {
    audit('LOGOUT', 'Выход из системы');
    state = { ...state, currentWorker: null };
    emit();
  },

  // ── Shift ──
  setShift(s: ShiftStatus): void {
    if (!state.currentWorker) return;
    const updated: Worker = { ...state.currentWorker, shiftStatus: s };
    state = {
      ...state,
      currentWorker: updated,
      workers: state.workers.map(w => w.id === updated.id ? updated : w),
    };
    audit('SHIFT_STATUS', `Статус смены: ${s}`);
    emit();
  },

  setShiftPlan(start: string, end: string): void {
    if (!state.currentWorker) return;
    const updated: Worker = { ...state.currentWorker, shiftStart: start, shiftEnd: end };
    state = {
      ...state,
      currentWorker: updated,
      workers: state.workers.map(w => w.id === updated.id ? updated : w),
    };
    audit('SHIFT_PLAN', `План смены: ${start}–${end}`);
    emit();
  },

  // ── Order status (general, validated) ──
  advanceOrder(orderId: string, to: OrderStatus): { ok: boolean; reason?: string } {
    const o = state.orders.find(x => x.id === orderId);
    if (!o) return { ok: false, reason: 'Заказ не найден' };
    if (!NEXT_STATUSES[o.status].includes(to)) {
      return { ok: false, reason: `Недопустимый переход ${o.status} → ${to}` };
    }
    patchOrder(orderId, x => ({ ...x, status: to }));
    audit('ORDER_STATUS', `${o.code}: ${o.status} → ${to}`, { orderId });
    emit();
    return { ok: true };
  },

  cancelOrder(orderId: string, reason: string): { ok: boolean; reason?: string } {
    const o = state.orders.find(x => x.id === orderId);
    if (!o) return { ok: false, reason: 'Заказ не найден' };
    if (!NEXT_STATUSES[o.status].includes('cancelled')) {
      return { ok: false, reason: `Заказ нельзя отменить из статуса ${o.status}` };
    }
    patchOrder(orderId, x => ({ ...x, status: 'cancelled' }));
    audit('ORDER_CANCEL', `${o.code} отменён: ${reason}`, { orderId });
    emit();
    return { ok: true };
  },

  // ── Tasks ──
  assignTask(taskId: string, workerId: string) {
    state = { ...state, tasks: state.tasks.map(t => t.id === taskId ? { ...t, assignedTo: workerId, status: 'assigned' as const } : t) };
    audit('TASK_ASSIGN', `Задача ${taskId} → ${workerId}`, { taskId });
    emit();
  },
  reassignTask(taskId: string, workerId: string) {
    state = { ...state, tasks: state.tasks.map(t => t.id === taskId ? { ...t, assignedTo: workerId } : t) };
    audit('TASK_REASSIGN', `Задача ${taskId} переназначена → ${workerId}`, { taskId });
    emit();
  },
  startTask(taskId: string) {
    state = { ...state, tasks: state.tasks.map(t => t.id === taskId ? { ...t, status: 'in_progress' as const } : t) };
    audit('TASK_START', `Задача ${taskId} начата`, { taskId });
    emit();
  },
  completeTask(taskId: string) {
    state = { ...state, tasks: state.tasks.map(t => t.id === taskId ? { ...t, status: 'completed' as const } : t) };
    audit('TASK_DONE', `Задача ${taskId} завершена`, { taskId });
    emit();
  },
  cancelTask(taskId: string, reason: string) {
    state = { ...state, tasks: state.tasks.map(t => t.id === taskId ? { ...t, status: 'blocked' as const } : t) };
    audit('TASK_CANCEL', `Задача ${taskId} отменена: ${reason}`, { taskId });
    emit();
  },

  // ── Picking ──
  startPicking(orderId: string) {
    const o = state.orders.find(x => x.id === orderId);
    if (!o) return;
    if (o.status === 'received_by_warehouse') {
      this.advanceOrder(orderId, 'picking_assigned');
    }
    if (state.orders.find(x => x.id === orderId)?.status === 'picking_assigned') {
      this.advanceOrder(orderId, 'picking_in_progress');
    }
    patchOrder(orderId, x => ({ ...x, pickerId: state.currentWorker?.id }));
    audit('PICK_START', `Начата сборка ${o.code}`, { orderId });
    emit();
  },

  /** Scan ячейки для конкретной строки заказа. */
  pickScanBin(orderId: string, itemId: string, scannedBin: string): { ok: boolean; reason?: string } {
    const o = state.orders.find(x => x.id === orderId);
    const it = o?.items.find(i => i.id === itemId);
    if (!o || !it) return { ok: false, reason: 'Позиция не найдена' };
    if (scannedBin !== it.binId) {
      this._pushProblem('wrong_bin', `Сканирована ${scannedBin}, ожидалась ${it.binId}`, { orderId, sku: it.sku, binId: it.binId });
      audit('SCAN_BIN_FAIL', `Не та ячейка: ${scannedBin} ≠ ${it.binId}`, { orderId, binId: it.binId, sku: it.sku });
      emit();
      return { ok: false, reason: `Не та ячейка. Нужна ${it.binId}` };
    }
    patchItem(orderId, itemId, i => ({ ...i, status: 'scanned_bin' as ItemStatus }));
    audit('SCAN_BIN_OK', `Ячейка ${scannedBin} OK`, { orderId, binId: scannedBin, sku: it.sku });
    emit();
    return { ok: true };
  },

  /** Scan штрихкода товара для конкретной строки. */
  pickScanItem(orderId: string, itemId: string, scannedCode: string): { ok: boolean; reason?: string } {
    const o = state.orders.find(x => x.id === orderId);
    const it = o?.items.find(i => i.id === itemId);
    if (!o || !it) return { ok: false, reason: 'Позиция не найдена' };
    const sku = state.skus.find(s => s.sku === scannedCode || s.barcode === scannedCode);
    if (!sku) {
      this._pushProblem('item_not_found', `Штрихкод ${scannedCode} не найден`, { orderId, sku: it.sku });
      audit('SCAN_ITEM_FAIL', `Штрихкод ${scannedCode} не распознан`, { orderId, sku: it.sku });
      emit();
      return { ok: false, reason: 'Штрихкод не распознан' };
    }
    if (sku.sku !== it.sku) {
      this._pushProblem('wrong_item', `Сканирован ${sku.sku}, ожидался ${it.sku}`, { orderId, sku: it.sku });
      audit('SCAN_ITEM_FAIL', `Не тот товар: ${sku.sku} ≠ ${it.sku}`, { orderId, sku: it.sku });
      emit();
      return { ok: false, reason: `Не тот товар. Нужен ${it.sku}` };
    }
    patchItem(orderId, itemId, i => ({ ...i, status: 'scanned_item' as ItemStatus }));
    audit('SCAN_ITEM_OK', `Товар ${sku.sku} OK`, { orderId, sku: sku.sku });
    emit();
    return { ok: true };
  },

  /** Подтвердить набранное количество и закрыть строку как found. */
  pickConfirmItem(orderId: string, itemId: string, qty: number): { ok: boolean; reason?: string } {
    const o = state.orders.find(x => x.id === orderId);
    const it = o?.items.find(i => i.id === itemId);
    if (!o || !it) return { ok: false, reason: 'Позиция не найдена' };
    if (qty !== it.qty) {
      this._pushProblem('short_qty', `Количество ${qty} ≠ ${it.qty} (${it.sku})`, { orderId, sku: it.sku });
      audit('PICK_QTY_MISMATCH', `${it.sku}: ${qty} ≠ ${it.qty}`, { orderId, sku: it.sku });
      emit();
      return { ok: false, reason: `Количество не совпадает (нужно ${it.qty})` };
    }
    patchItem(orderId, itemId, i => ({ ...i, pickedQty: qty, status: 'found' as ItemStatus }));
    audit('PICK_ITEM', `${it.sku} найден ×${qty}`, { orderId, sku: it.sku });
    emit();
    return { ok: true };
  },

  pickMarkDamaged(orderId: string, itemId: string, comment: string) {
    patchItem(orderId, itemId, i => ({ ...i, status: 'damaged' as ItemStatus, comment }));
    const it = state.orders.find(o => o.id === orderId)?.items.find(i => i.id === itemId);
    this._pushProblem('damaged', `${it?.sku} помечен как брак: ${comment}`, { orderId, sku: it?.sku });
    audit('PICK_DAMAGED', `${it?.sku}: ${comment}`, { orderId, sku: it?.sku });
    emit();
  },

  pickMarkMissing(orderId: string, itemId: string, comment: string) {
    patchItem(orderId, itemId, i => ({ ...i, status: 'missing' as ItemStatus, comment }));
    const it = state.orders.find(o => o.id === orderId)?.items.find(i => i.id === itemId);
    this._pushProblem('item_not_found', `${it?.sku}: ${comment}`, { orderId, sku: it?.sku });
    audit('PICK_MISSING', `${it?.sku}: ${comment}`, { orderId, sku: it?.sku });
    emit();
  },

  pickAddComment(orderId: string, itemId: string, comment: string) {
    patchItem(orderId, itemId, i => ({ ...i, comment }));
    audit('PICK_COMMENT', `Комментарий к позиции: ${comment}`, { orderId });
    emit();
  },

  /** Завершить сборку. Блокируется, если есть pending/missing/damaged. */
  finishPicking(orderId: string): { ok: boolean; reason?: string } {
    const o = state.orders.find(x => x.id === orderId);
    if (!o) return { ok: false, reason: 'Заказ не найден' };
    const bad = o.items.filter(i => i.status !== 'found');
    if (bad.length > 0) {
      return { ok: false, reason: `Не все позиции собраны (${bad.length} осталось)` };
    }
    return this.advanceOrder(orderId, 'picked');
  },

  // ── Sorting ──
  assignSortBin(orderId: string, sortBinId: string): { ok: boolean; reason?: string } {
    const sb = state.sortBins.find(b => b.id === sortBinId);
    if (!sb) return { ok: false, reason: 'Корзина не найдена' };
    if (sb.orderId && sb.orderId !== orderId) return { ok: false, reason: 'Корзина занята другим заказом' };
    state = {
      ...state,
      sortBins: state.sortBins.map(b => b.id === sortBinId ? { ...b, orderId } : b),
    };
    patchOrder(orderId, o => ({ ...o, sortBinId, sorterId: state.currentWorker?.id }));
    if (state.orders.find(o => o.id === orderId)?.status === 'picked') {
      this.advanceOrder(orderId, 'sorting');
    }
    audit('SORT_ASSIGN', `Заказ → корзина ${sortBinId}`, { orderId });
    emit();
    return { ok: true };
  },

  sortPlaceItem(orderId: string, sortBinId: string, scannedCode: string): { ok: boolean; reason?: string } {
    const o = state.orders.find(x => x.id === orderId);
    if (!o) return { ok: false, reason: 'Заказ не найден' };
    if (o.sortBinId !== sortBinId) {
      this._pushProblem('wrong_bin', `Корзина ${sortBinId} не для этого заказа`, { orderId });
      audit('SORT_FAIL', `Не та корзина для ${o.code}`, { orderId });
      emit();
      return { ok: false, reason: 'Не та корзина' };
    }
    const sku = state.skus.find(s => s.sku === scannedCode || s.barcode === scannedCode);
    const inOrder = sku && o.items.some(i => i.sku === sku.sku);
    if (!inOrder) {
      this._pushProblem('wrong_item', `Товар ${scannedCode} не из заказа ${o.code}`, { orderId });
      audit('SORT_FAIL', `Чужой товар ${scannedCode} в ${o.code}`, { orderId });
      emit();
      return { ok: false, reason: 'Товар не из этого заказа' };
    }
    state = { ...state, sortBins: state.sortBins.map(b => b.id === sortBinId ? { ...b, occupied: b.occupied + 1 } : b) };
    audit('SORT_PLACE', `${sku!.sku} → ${sortBinId}`, { orderId, sku: sku!.sku });
    emit();
    return { ok: true };
  },

  finishSorting(orderId: string): { ok: boolean; reason?: string } {
    return this.advanceOrder(orderId, 'packing_in_progress');
  },

  // ── Packing ──
  startPacking(orderId: string) {
    const o = state.orders.find(x => x.id === orderId);
    if (!o) return;
    if (o.status === 'sorting') this.advanceOrder(orderId, 'packing_in_progress');
    patchOrder(orderId, x => ({ ...x, packerId: state.currentWorker?.id }));
    audit('PACK_START', `Упаковка ${o.code}`, { orderId });
    emit();
  },

  packOrder(orderId: string, opts: { weightKg: number; packageType: string; packagesCount: number; photo?: string }): { ok: boolean; reason?: string } {
    const o = state.orders.find(x => x.id === orderId);
    if (!o) return { ok: false, reason: 'Заказ не найден' };
    if (opts.weightKg <= 0) return { ok: false, reason: 'Укажите вес' };
    if (opts.packagesCount < 1) return { ok: false, reason: 'Укажите кол-во пакетов' };
    const label = `LBL-${Date.now().toString().slice(-6)}`;
    patchOrder(orderId, x => ({
      ...x,
      weightKg: opts.weightKg,
      packageType: opts.packageType,
      packagesCount: opts.packagesCount,
      packagePhoto: opts.photo,
      shippingLabel: label,
    }));
    state = {
      ...state,
      documents: [{
        id: `D-${Date.now()}`, type: 'shipping_label', number: label,
        orderId, status: 'approved', createdAt: new Date().toISOString(),
        uploadedBy: state.currentWorker?.id,
      }, ...state.documents],
    };
    const r = this.advanceOrder(orderId, 'packed');
    if (!r.ok) return r;
    audit('PACK_DONE', `${o.code} упакован, label ${label}, ${opts.weightKg}кг`, { orderId });
    emit();
    return { ok: true };
  },

  reprintLabel(orderId: string) {
    const o = state.orders.find(x => x.id === orderId);
    if (!o?.shippingLabel) return;
    audit('LABEL_REPRINT', `Перепечатка label ${o.shippingLabel}`, { orderId });
    emit();
  },

  markReady(orderId: string) {
    const r = this.advanceOrder(orderId, 'ready_for_pickup');
    if (r.ok) audit('READY', 'Заказ готов к выдаче', { orderId });
    return r;
  },

  // ── Handoff ──
  handoffToCourier(orderId: string, courierId: string, proofPhoto?: string): { ok: boolean; reason?: string } {
    const o = state.orders.find(x => x.id === orderId);
    const c = state.couriers.find(x => x.id === courierId);
    if (!o) return { ok: false, reason: 'Заказ не найден' };
    if (!c) return { ok: false, reason: 'Курьер не найден' };
    patchOrder(orderId, x => ({ ...x, courierId, shipperId: state.currentWorker?.id, proofPhoto }));
    state = {
      ...state,
      documents: [{
        id: `D-${Date.now()}`, type: 'courier_handoff_proof',
        number: `HND-${o.code}-${c.id}`,
        orderId, status: 'approved',
        uploadedBy: state.currentWorker?.id,
        createdAt: new Date().toISOString(),
      }, ...state.documents],
    };
    const r = this.advanceOrder(orderId, 'handed_to_courier');
    if (!r.ok) return r;
    audit('HANDOFF', `${o.code} → ${c.name} (${c.vehiclePlate})`, { orderId });
    emit();
    return { ok: true };
  },

  // ── Receiving ──
  receiveAsnItem(asnId: string, itemId: string, receivedQty: number, damagedQty: number) {
    state = {
      ...state,
      asns: state.asns.map(a => a.id === asnId ? {
        ...a,
        status: 'receiving',
        items: a.items.map(it => it.id === itemId ? { ...it, receivedQty, damagedQty } : it),
      } : a),
    };
    audit('RECEIVE_ITEM', `ASN ${asnId}/${itemId}: ${receivedQty} (брак ${damagedQty})`, { asnId });
    emit();
  },

  finishReceiving(asnId: string) {
    const a = state.asns.find(x => x.id === asnId);
    if (!a) return;
    const hasMismatch = a.items.some(it => it.receivedQty !== it.expectedQty || it.damagedQty > 0);
    state = {
      ...state,
      asns: state.asns.map(x => x.id === asnId ? { ...x, status: hasMismatch ? 'discrepancy' : 'received', arrivedAt: new Date().toISOString() } : x),
      documents: [
        {
          id: `D-${Date.now()}`,
          type: hasMismatch ? 'discrepancy_act' : 'receiving_act',
          number: hasMismatch ? `ACT-DISC-${asnId}` : `ACT-RCV-${asnId}`,
          asnId, status: 'pending',
          uploadedBy: state.currentWorker?.id,
          createdAt: new Date().toISOString(),
        },
        ...state.documents,
      ],
    };
    if (hasMismatch) {
      this._pushProblem('count_discrepancy', `Расхождение по поставке ${a.invoiceNumber}`, { asnId });
    }
    audit(hasMismatch ? 'RECEIVE_DISCREPANCY' : 'RECEIVE_OK', `Поставка ${a.invoiceNumber} закрыта`, { asnId });
    emit();
  },

  uploadInvoice(asnId: string) {
    state = { ...state, asns: state.asns.map(a => a.id === asnId ? { ...a, invoiceUrl: `mock://invoice/${asnId}.pdf` } : a) };
    audit('UPLOAD', `Invoice загружен для ${asnId}`, { asnId });
    emit();
  },

  // ── Movements ──
  createMovement(sku: string, fromBinId: string, toBinId: string, qty: number, reason: string): { ok: boolean; reason?: string } {
    if (!state.bins.find(b => b.id === fromBinId)) return { ok: false, reason: 'Источник не найден' };
    if (!state.bins.find(b => b.id === toBinId))   return { ok: false, reason: 'Назначение не найдено' };
    if (qty <= 0) return { ok: false, reason: 'Количество должно быть > 0' };
    const m: Movement = {
      id: `M-${Date.now()}`,
      sku, fromBinId, toBinId, qty, reason,
      workerId: state.currentWorker?.id ?? 'system',
      createdAt: new Date().toISOString(),
    };
    state = {
      ...state,
      movements: [m, ...state.movements],
      bins: state.bins.map(b =>
        b.id === fromBinId ? { ...b, occupied: Math.max(0, b.occupied - qty) }
        : b.id === toBinId ? { ...b, occupied: b.occupied + qty }
        : b),
    };
    audit('MOVE', `${sku} ${fromBinId} → ${toBinId} ×${qty} (${reason})`, { sku, binId: toBinId });
    emit();
    return { ok: true };
  },

  // ── Bins ──
  blockBin(binId: string, reason: string) {
    state = { ...state, bins: state.bins.map(b => b.id === binId ? { ...b, status: 'blocked', blockedReason: reason } : b) };
    audit('BIN_BLOCK', `Ячейка ${binId} заблокирована: ${reason}`, { binId });
    emit();
  },
  unblockBin(binId: string) {
    state = { ...state, bins: state.bins.map(b => b.id === binId ? { ...b, status: 'active', blockedReason: undefined } : b) };
    audit('BIN_UNBLOCK', `Ячейка ${binId} активна`, { binId });
    emit();
  },

  // ── Counts ──
  createCount(zone: CountTask['zone'], assigneeId: string): string {
    const id = `c${Date.now()}`;
    const zoneBins = state.bins.filter(b => b.zone === zone);
    const lines = zoneBins.flatMap(b =>
      state.inventory.filter(inv => inv.bins.includes(b.id)).map(inv => ({
        binId: b.id, sku: inv.sku, expectedQty: inv.totalStock,
      }))
    );
    const ct: CountTask = {
      id, zone, assignedTo: assigneeId, status: 'in_progress', lines,
      createdAt: new Date().toISOString(),
    };
    state = { ...state, counts: [ct, ...state.counts] };
    audit('COUNT_CREATE', `Инвентаризация по зоне ${zone}, ${lines.length} строк`, { taskId: id });
    emit();
    return id;
  },

  submitCountLine(countId: string, binId: string, sku: string, countedQty: number) {
    state = {
      ...state,
      counts: state.counts.map(c => c.id !== countId ? c : {
        ...c,
        lines: c.lines.map(l => l.binId === binId && l.sku === sku ? { ...l, countedQty } : l),
      }),
    };
    audit('COUNT_LINE', `${countId}: ${binId}/${sku} = ${countedQty}`, { taskId: countId, binId, sku });
    emit();
  },

  closeCount(countId: string) {
    const c = state.counts.find(x => x.id === countId);
    if (!c) return;
    const hasDiscrepancy = c.lines.some(l => l.countedQty !== undefined && l.countedQty !== l.expectedQty);
    state = {
      ...state,
      counts: state.counts.map(x => x.id === countId ? { ...x, status: hasDiscrepancy ? 'discrepancy_found' : 'closed', closedAt: new Date().toISOString() } : x),
      documents: [{
        id: `D-${Date.now()}`, type: 'inventory_report',
        number: `RPT-${countId}`, status: hasDiscrepancy ? 'pending' : 'approved',
        uploadedBy: state.currentWorker?.id,
        createdAt: new Date().toISOString(),
      }, ...state.documents],
    };
    if (hasDiscrepancy) this._pushProblem('count_discrepancy', `Расхождение по инвентаризации ${countId}`, { taskId: countId });
    audit(hasDiscrepancy ? 'COUNT_DISCREPANCY' : 'COUNT_CLOSED', `Инвентаризация ${countId} закрыта`, { taskId: countId });
    emit();
  },

  // ── Returns ──
  decideReturn(rmaId: string, decision: ReturnStatus, comment: string) {
    state = {
      ...state,
      returns: state.returns.map(r => r.id === rmaId ? { ...r, status: decision, decision, closedAt: decision === 'closed' ? new Date().toISOString() : r.closedAt, inspectorId: state.currentWorker?.id, comment: comment || r.comment } : r),
    };
    state = {
      ...state,
      documents: [{
        id: `D-${Date.now()}`, type: 'return_inspection',
        number: `INS-${rmaId}`, rmaId, status: 'approved',
        uploadedBy: state.currentWorker?.id,
        createdAt: new Date().toISOString(),
      }, ...state.documents],
    };
    const action = decision === 'restock' ? 'RETURN_RESTOCK'
      : decision === 'write_off' ? 'RETURN_WRITE_OFF'
      : decision === 'damaged'   ? 'RETURN_DAMAGED'
      : decision === 'returned_to_supplier' ? 'RETURN_TO_SUPPLIER'
      : 'RETURN_DECIDE';
    audit(action, `${rmaId}: ${decision} — ${comment}`, { rmaId });
    emit();
  },

  requestReturnPhoto(rmaId: string) {
    state = {
      ...state,
      returns: state.returns.map(r => r.id === rmaId ? { ...r, mediaRequest: 'photo_requested' } : r),
    };
    audit('RETURN_REQUEST_PHOTO', `Запрошено фото у клиента: ${rmaId}`, { rmaId });
    emit();
  },

  requestReturnVideo(rmaId: string) {
    state = {
      ...state,
      returns: state.returns.map(r => r.id === rmaId ? { ...r, mediaRequest: 'video_requested' } : r),
    };
    audit('RETURN_REQUEST_VIDEO', `Запрошено видео у клиента: ${rmaId}`, { rmaId });
    emit();
  },

  uploadReturnMedia(rmaId: string, kind: 'photo_before' | 'photo_after' | 'photo_damage' | 'video_inspection', uri: string) {
    state = {
      ...state,
      returns: state.returns.map(r => {
        if (r.id !== rmaId) return r;
        if (kind === 'photo_before') return { ...r, photosBefore: [...(r.photosBefore ?? []), uri], mediaRequest: 'media_uploaded' };
        if (kind === 'photo_after')  return { ...r, photosAfter:  [...(r.photosAfter  ?? []), uri], mediaRequest: 'media_uploaded' };
        if (kind === 'photo_damage') return { ...r, photosDamage: [...(r.photosDamage ?? []), uri], mediaRequest: 'media_uploaded' };
        return { ...r, videoFromInspection: uri, mediaRequest: 'media_uploaded' };
      }),
    };
    audit('RETURN_MEDIA_UPLOAD', `${rmaId}: загружено ${kind}`, { rmaId });
    emit();
  },

  // ── Problems ──
  _pushProblem(type: ProblemType, description: string, ctx: { orderId?: string; binId?: string; sku?: string; asnId?: string; rmaId?: string; taskId?: string } = {}) {
    const p: Problem = {
      id: `P-${Date.now()}`,
      type, description, status: 'open',
      reportedBy: state.currentWorker?.id ?? 'system',
      orderId: ctx.orderId, binId: ctx.binId, sku: ctx.sku,
      photos: [], comments: [],
      createdAt: new Date().toISOString(),
    };
    state = { ...state, problems: [p, ...state.problems] };
  },

  createProblem(input: { type: ProblemType; description: string; orderId?: string; binId?: string; sku?: string; photos?: string[] }) {
    const p: Problem = {
      id: `P-${Date.now()}`,
      type: input.type, description: input.description, status: 'open',
      reportedBy: state.currentWorker?.id ?? 'system',
      orderId: input.orderId, binId: input.binId, sku: input.sku,
      photos: input.photos ?? [], comments: [],
      createdAt: new Date().toISOString(),
    };
    state = { ...state, problems: [p, ...state.problems] };
    audit('PROBLEM_CREATE', `${input.type}: ${input.description}`, { orderId: input.orderId, binId: input.binId, sku: input.sku });
    emit();
    return p.id;
  },

  assignProblem(problemId: string, workerId: string) {
    state = { ...state, problems: state.problems.map(p => p.id === problemId ? { ...p, assignedTo: workerId, status: 'investigating' } : p) };
    audit('PROBLEM_ASSIGN', `Проблема ${problemId} → ${workerId}`);
    emit();
  },

  escalateProblem(problemId: string) {
    state = { ...state, problems: state.problems.map(p => p.id === problemId ? { ...p, status: 'escalated' } : p) };
    audit('PROBLEM_ESCALATE', `Проблема ${problemId} эскалирована`);
    emit();
  },

  resolveProblem(problemId: string, comment: string) {
    state = { ...state, problems: state.problems.map(p => p.id === problemId ? { ...p, status: 'resolved', resolvedAt: new Date().toISOString(), comments: [...p.comments, comment] } : p) };
    audit('PROBLEM_RESOLVE', `Проблема ${problemId} решена: ${comment}`);
    emit();
  },

  uploadProblemMedia(problemId: string, kind: 'photo' | 'video', uri: string) {
    state = {
      ...state,
      problems: state.problems.map(p => p.id !== problemId ? p
        : kind === 'photo' ? { ...p, photos: [...(p.photos ?? []), uri] }
        :                    { ...p, videos: [...(p.videos ?? []), uri] }),
    };
    audit(kind === 'photo' ? 'PROBLEM_PHOTO_UPLOAD' : 'PROBLEM_VIDEO_UPLOAD', `Проблема ${problemId}: ${kind}`);
    emit();
  },

  viewMedia(context: string) {
    audit('MEDIA_VIEW', context);
    emit();
  },

  // ── Supplier media ──────────────────────────────────
  reviewSupplierMedia(id: string, decision: SupplierMediaStatus, comment: string) {
    state = {
      ...state,
      supplierMedia: state.supplierMedia.map(m =>
        m.id === id
          ? { ...m, status: decision, warehouseComment: comment || m.warehouseComment, reviewedBy: state.currentWorker?.id }
          : m),
    };
    const action = decision === 'approved' ? 'SUP_MEDIA_APPROVE'
      : decision === 'rejected' ? 'SUP_MEDIA_REJECT'
      : decision === 'mismatch' ? 'SUP_MEDIA_MISMATCH'
      : 'SUP_MEDIA_REVIEW';
    audit(action, `${id}: ${decision}${comment ? ' — ' + comment : ''}`);
    emit();
  },

  // ── Damage report ───────────────────────────────────
  createDamageReport(input: {
    asnId?: string; asnItemId?: string; supplierId?: string; supplierName?: string;
    invoiceNumber?: string; sku: string; damageType: DamageType; damagedQty: number;
    description: string; photos: string[]; videos: string[];
  }): string {
    const id = `DMG-${Date.now()}`;
    const r: DamageReport = {
      id,
      asnId: input.asnId, asnItemId: input.asnItemId,
      supplierId: input.supplierId, supplierName: input.supplierName,
      invoiceNumber: input.invoiceNumber, sku: input.sku,
      damageType: input.damageType, damagedQty: input.damagedQty,
      description: input.description, photos: input.photos, videos: input.videos,
      reportedBy: state.currentWorker?.id ?? 'system',
      createdAt: new Date().toISOString(),
      status: 'sent_to_review',
    };
    state = {
      ...state,
      damageReports: [r, ...state.damageReports],
      documents: [
        {
          id: `D-${Date.now()}`, type: 'damage_photo',
          number: `DMG-PHOTO-${id.slice(-6)}`,
          asnId: input.asnId, status: 'pending',
          uploadedBy: state.currentWorker?.id,
          createdAt: new Date().toISOString(),
        },
        ...state.documents,
      ],
    };
    // Авто-проблема
    this._pushProblem('damaged', `${input.sku}: ${input.description}`, { sku: input.sku, asnId: input.asnId });
    // Если есть ASN-позиция — отметим повреждение
    if (input.asnId && input.asnItemId) {
      state = {
        ...state,
        asns: state.asns.map(a => a.id !== input.asnId ? a : {
          ...a,
          status: 'discrepancy' as const,
          items: a.items.map(it => it.id === input.asnItemId
            ? { ...it, damagedQty: it.damagedQty + input.damagedQty }
            : it),
        }),
      };
    }
    audit('DAMAGE_REPORT', `${id}: ${input.damageType} ×${input.damagedQty} (${input.sku})`, { sku: input.sku, asnId: input.asnId });
    emit();
    return id;
  },

  // ── Supplier dispute ────────────────────────────────
  createSupplierDispute(input: {
    supplierId: string; supplierName: string; invoiceNumber?: string; asnId?: string;
    sku: string; reason: DisputeReason; description: string;
    damagedQty?: number; claimedAmount?: number;
    supplierMediaId?: string; damageReportId?: string;
  }): string {
    const id = `DSP-${Date.now()}`;
    const d: SupplierDispute = {
      id,
      supplierId: input.supplierId, supplierName: input.supplierName,
      invoiceNumber: input.invoiceNumber, asnId: input.asnId, sku: input.sku,
      reason: input.reason, description: input.description,
      damagedQty: input.damagedQty, claimedAmount: input.claimedAmount,
      status: 'draft',
      responsibleEmployeeId: state.currentWorker?.id,
      warehousePhotos: [], warehouseVideos: [],
      supplierMediaId: input.supplierMediaId, damageReportId: input.damageReportId,
      createdAt: new Date().toISOString(),
    };
    state = { ...state, supplierDisputes: [d, ...state.supplierDisputes] };
    audit('DISPUTE_CREATE', `${id}: ${input.reason} (${input.sku}, ${input.supplierName})`, { sku: input.sku, asnId: input.asnId });
    emit();
    return id;
  },

  changeDisputeStatus(id: string, status: DisputeStatus) {
    const stamps: Partial<SupplierDispute> = {};
    if (status === 'sent_to_supplier') stamps.sentAt = new Date().toISOString();
    if (status === 'resolved' || status === 'rejected' || status === 'accepted') stamps.resolvedAt = new Date().toISOString();
    state = { ...state, supplierDisputes: state.supplierDisputes.map(d => d.id === id ? { ...d, status, ...stamps } : d) };
    audit('DISPUTE_STATUS', `${id}: → ${status}`);
    emit();
  },

  addDisputeResponse(id: string, response: string) {
    state = {
      ...state,
      supplierDisputes: state.supplierDisputes.map(d =>
        d.id === id
          ? { ...d, supplierResponse: response, status: d.status === 'sent_to_supplier' ? 'supplier_response_waiting' : d.status }
          : d),
    };
    audit('DISPUTE_RESPONSE', `${id}: ${response}`);
    emit();
  },

  uploadDisputeMedia(id: string, kind: 'photo' | 'video', uri: string) {
    state = {
      ...state,
      supplierDisputes: state.supplierDisputes.map(d => d.id !== id ? d
        : kind === 'photo'
          ? { ...d, warehousePhotos: [...d.warehousePhotos, uri] }
          : { ...d, warehouseVideos: [...d.warehouseVideos, uri] }),
    };
    audit(kind === 'photo' ? 'DISPUTE_PHOTO_UPLOAD' : 'DISPUTE_VIDEO_UPLOAD', `${id}: ${kind} загружен`);
    emit();
  },

  // ── Scanner validation ──────────────────────────────
  /** Универсальная проверка скана. Возвращает ok + причину при mismatch. Пишет audit и при необходимости создаёт scan-block. */
  scanValidate(input: {
    type: 'BIN' | 'ITEM' | 'ORDER' | 'PACKAGE' | 'COURIER' | 'RETURN' | 'INVOICE' | 'ASN';
    value: string;
    expected?: string;
    /** Контекст для сообщения и audit. */
    context?: string;
    /** Если true — при ошибке создаётся scan-block, который требует override Shift Manager / Admin. */
    blockOnFail?: boolean;
  }): { ok: boolean; reason?: string; blockId?: string } {
    const { type, value, expected, context, blockOnFail } = input;
    let ok = false;
    let detail = '';

    switch (type) {
      case 'BIN': {
        const b = state.bins.find(x => x.id === value || x.qrCode.endsWith(value));
        ok = !!b && (!expected || b.id === expected);
        detail = ok ? `BIN ${b!.id}` : `BIN ${value} не найден или ≠ ${expected ?? ''}`;
        break;
      }
      case 'ITEM': {
        const sku = state.skus.find(x => x.sku === value || x.barcode === value);
        ok = !!sku && (!expected || sku.sku === expected);
        detail = ok ? `ITEM ${sku!.sku}` : `ITEM ${value} не найден или ≠ ${expected ?? ''}`;
        break;
      }
      case 'ORDER':
      case 'PACKAGE': {
        const o = state.orders.find(x => x.code === value || x.shippingLabel === value);
        ok = !!o && (!expected || o.code === expected);
        detail = ok ? `ORDER ${o!.code}` : `${type} ${value} не найден или ≠ ${expected ?? ''}`;
        break;
      }
      case 'COURIER': {
        const c = state.couriers.find(x => x.id === value);
        ok = !!c;
        detail = ok ? `COURIER ${c!.id}` : `COURIER ${value} не найден`;
        break;
      }
      case 'RETURN': {
        const r = state.returns.find(x => x.id === value);
        ok = !!r;
        detail = ok ? `RMA ${r!.id}` : `RMA ${value} не найден`;
        break;
      }
      case 'INVOICE':
      case 'ASN': {
        const a = state.asns.find(x => x.invoiceNumber === value || x.id === value);
        ok = !!a;
        detail = ok ? `ASN ${a!.id} (${a!.invoiceNumber})` : `${type} ${value} не найден`;
        break;
      }
    }

    if (ok) {
      audit(`SCAN_${type}_OK`, `${detail}${context ? ' · ' + context : ''}`);
      emit();
      return { ok: true };
    }

    audit(`SCAN_${type}_FAIL`, `${detail}${context ? ' · ' + context : ''}`);
    let blockId: string | undefined;
    if (blockOnFail) {
      blockId = `BLOCK-${Date.now()}`;
      const b: ScanBlock = {
        id: blockId, reason: detail, context: context ?? '',
        createdAt: new Date().toISOString(),
      };
      state = { ...state, scanBlocks: [b, ...state.scanBlocks] };
      audit('SCAN_BLOCK', `${b.id}: ${detail}`);
    }
    emit();
    return { ok: false, reason: detail, blockId };
  },

  // ── Evidence sends ──────────────────────────────────
  sendEvidence(input: {
    supplierId: string;
    items: EvidenceSendItem[];
    comment: string;
    linkedTo?: EvidenceLinkedTarget;
    invoiceNumber?: string;
    sku?: string;
  }): { ok: boolean; id?: string; reason?: string } {
    const sup = state.suppliers.find(s => s.id === input.supplierId);
    if (!sup) return { ok: false, reason: 'Поставщик не найден' };
    if (input.items.length === 0) return { ok: false, reason: 'Выберите хотя бы один файл' };
    const id = `ES-${Date.now()}`;
    const e: EvidenceSend = {
      id,
      supplierId: sup.id, supplierName: sup.name,
      supplierContact: sup.email ?? sup.phone,
      channel: sup.notifyChannel ?? 'email',
      comment: input.comment,
      items: input.items,
      status: 'sent_to_supplier',
      sentBy: state.currentWorker?.id ?? 'system',
      sentAt: new Date().toISOString(),
      linkedTo: input.linkedTo,
      invoiceNumber: input.invoiceNumber,
      sku: input.sku,
    };
    state = { ...state, evidenceSends: [e, ...state.evidenceSends] };
    audit('EVIDENCE_SEND', `${id}: → ${sup.name} (${e.items.length} файлов)`, {
      sku: input.sku, asnId: input.linkedTo?.type === 'asn' ? input.linkedTo.id : undefined,
      rmaId: input.linkedTo?.type === 'return' ? input.linkedTo.id : undefined,
    });
    emit();
    return { ok: true, id };
  },

  markEvidenceViewed(id: string) {
    state = {
      ...state,
      evidenceSends: state.evidenceSends.map(e => e.id === id
        ? { ...e, status: 'supplier_viewed', viewedAt: new Date().toISOString() }
        : e),
    };
    audit('EVIDENCE_VIEWED', `${id}: поставщик увидел`);
    emit();
  },

  addEvidenceResponse(id: string, text: string) {
    state = {
      ...state,
      evidenceSends: state.evidenceSends.map(e => e.id === id
        ? { ...e, status: 'response_received', responseAt: new Date().toISOString(), responseText: text }
        : e),
    };
    audit('EVIDENCE_RESPONSE', `${id}: ${text}`);
    emit();
  },

  closeEvidenceSend(id: string) {
    state = {
      ...state,
      evidenceSends: state.evidenceSends.map(e => e.id === id
        ? { ...e, status: 'closed', closedAt: new Date().toISOString() }
        : e),
    };
    audit('EVIDENCE_CLOSE', `${id}: закрыт`);
    emit();
  },

  // ── Inbound: partial / block batch ──────────────────
  partialReceiveAsn(asnId: string): { ok: boolean; reason?: string } {
    const a = state.asns.find(x => x.id === asnId);
    if (!a) return { ok: false, reason: 'Поставка не найдена' };
    state = {
      ...state,
      asns: state.asns.map(x => x.id !== asnId ? x : {
        ...x,
        status: 'discrepancy',
        items: x.items.map(it => ({
          ...it,
          // принимаем только good — без damaged
          receivedQty: Math.max(0, it.expectedQty - it.damagedQty),
        })),
      }),
    };
    state = {
      ...state,
      documents: [{
        id: `D-${Date.now()}`, type: 'discrepancy_act',
        number: `ACT-PARTIAL-${asnId}`, asnId, status: 'pending',
        uploadedBy: state.currentWorker?.id,
        createdAt: new Date().toISOString(),
      }, ...state.documents],
    };
    audit('RECEIVE_PARTIAL', `Частичная приёмка ${a.invoiceNumber}: только good-units`, { asnId });
    emit();
    return { ok: true };
  },

  /**
   * Полная детализированная частичная приёмка по всем позициям ASN:
   *   - good idёт в available stock (asn.items[i].receivedQty)
   *   - damaged идёт в damaged stock + создаётся damage report (по line)
   *   - missing фиксируется в discrepancy_act
   *   - медиа прикрепляются к asn-items, аудит на каждый шаг
   */
  partialReceiveAsnDetailed(asnId: string, lines: PartialReceiveLine[]): { ok: boolean; reason?: string; damageReportIds: string[] } {
    const a = state.asns.find(x => x.id === asnId);
    if (!a) return { ok: false, reason: 'Поставка не найдена', damageReportIds: [] };

    const damageReportIds: string[] = [];
    let damagedTotal = 0, missingTotal = 0, receivedTotal = 0;

    state = {
      ...state,
      asns: state.asns.map(x => x.id !== asnId ? x : {
        ...x,
        status: 'discrepancy',
        items: x.items.map(it => {
          const line = lines.find(l => l.asnItemId === it.id);
          if (!line) return it;
          receivedTotal += line.receivedQty;
          damagedTotal  += line.damagedQty;
          missingTotal  += line.missingQty;
          return {
            ...it,
            receivedQty: line.receivedQty,
            damagedQty:  line.damagedQty,
            photos: [...(it.photos ?? []), ...line.photos],
          };
        }),
      }),
    };

    // Создаём по damage report на каждую damaged-позицию
    for (const line of lines) {
      if (line.damagedQty > 0) {
        const id = `DMG-${Date.now()}-${line.asnItemId}`;
        damageReportIds.push(id);
        const dr: DamageReport = {
          id,
          asnId, asnItemId: line.asnItemId,
          supplierId: a.supplierId, supplierName: a.supplierName,
          invoiceNumber: a.invoiceNumber, sku: line.sku,
          damageType: line.reason === 'expired' ? 'expired'
                    : line.reason === 'package_opened' ? 'opened_package'
                    : line.reason === 'wrong_item' ? 'wrong_item'
                    : line.reason === 'wrong_barcode' ? 'wrong_item'
                    : 'broken',
          damagedQty: line.damagedQty,
          description: line.comment ?? PARTIAL_REASON_FALLBACK[line.reason],
          photos: line.photos, videos: line.videos,
          reportedBy: state.currentWorker?.id ?? 'system',
          createdAt: new Date().toISOString(),
          status: 'sent_to_review',
        };
        state = { ...state, damageReports: [dr, ...state.damageReports] };
        audit('DAMAGE_REPORT', `${id}: ${line.reason} ×${line.damagedQty} (${line.sku})`, { sku: line.sku, asnId });
      }
    }

    state = {
      ...state,
      documents: [
        {
          id: `D-${Date.now()}`, type: 'discrepancy_act',
          number: `ACT-PARTIAL-${asnId}`, asnId, status: 'pending',
          uploadedBy: state.currentWorker?.id,
          createdAt: new Date().toISOString(),
        },
        ...state.documents,
      ],
    };

    audit('RECEIVE_PARTIAL_DETAILED', `${a.invoiceNumber}: принято ${receivedTotal}, брак ${damagedTotal}, недостача ${missingTotal}`, { asnId });
    emit();
    return { ok: true, damageReportIds };
  },

  blockAsnBatch(asnId: string, reason: string) {
    state = {
      ...state,
      asns: state.asns.map(x => x.id === asnId ? { ...x, status: 'discrepancy' } : x),
    };
    this._pushProblem('damaged', `Партия ${asnId} заблокирована: ${reason}`, { asnId });
    audit('BATCH_BLOCK', `Партия ${asnId} заблокирована: ${reason}`, { asnId });
    emit();
  },

  /** Запрос дополнительных медиа у клиента/поставщика по target. */
  requestAdditionalMedia(target: { type: 'return' | 'asn' | 'damage' | 'dispute'; id: string }, mediaType: 'photo' | 'video') {
    if (target.type === 'return') {
      if (mediaType === 'photo') this.requestReturnPhoto(target.id);
      else                       this.requestReturnVideo(target.id);
      return;
    }
    audit('MEDIA_REQUEST_EXTRA', `${target.type}/${target.id}: запрошено доп. ${mediaType}`);
    emit();
  },

  // ── Chat threads ────────────────────────────────────
  getOrCreateSupplierThread(input: {
    supplierId: string; supplierName: string;
    linkedTo?: EvidenceLinkedTarget;
    invoiceNumber?: string; sku?: string;
  }): string {
    const found = state.chatThreads.find(t =>
      t.kind === 'supplier' && t.supplierId === input.supplierId &&
      JSON.stringify(t.linkedTo) === JSON.stringify(input.linkedTo)
    );
    if (found) return found.id;
    const id = `CT-${Date.now()}`;
    const w = state.currentWorker;
    const t: ChatThread = {
      id, kind: 'supplier',
      supplierId: input.supplierId, supplierName: input.supplierName,
      linkedTo: input.linkedTo,
      invoiceNumber: input.invoiceNumber, sku: input.sku,
      messages: [],
      createdAt: new Date().toISOString(),
      participantIds: w ? [w.id, 'supplier'] : ['supplier'],
      participants: ['warehouse', 'supplier'],
      priority: 'normal', status: 'open',
      readBy: w ? [w.id] : [],
    };
    state = { ...state, chatThreads: [t, ...state.chatThreads] };
    audit('CHAT_OPEN', `Открыт чат с ${input.supplierName}${input.invoiceNumber ? ' · ' + input.invoiceNumber : ''}`);
    emit();
    return id;
  },

  getOrCreateReturnThread(input: {
    rmaId: string;
    supplierId?: string; supplierName?: string;
  }): string {
    const found = state.chatThreads.find(t => t.kind === 'return' && t.rmaId === input.rmaId);
    if (found) return found.id;
    const id = `CT-${Date.now()}`;
    const w = state.currentWorker;
    const t: ChatThread = {
      id, kind: 'return',
      rmaId: input.rmaId,
      supplierId: input.supplierId, supplierName: input.supplierName,
      linkedTo: { type: 'return', id: input.rmaId },
      messages: [],
      createdAt: new Date().toISOString(),
      participantIds: w ? [w.id, 'supplier', 'admin', 'support'] : ['supplier', 'admin', 'support'],
      participants: ['warehouse', 'admin', 'returns_operator', 'supplier', 'support'],
      priority: 'normal', status: 'open',
      readBy: w ? [w.id] : [],
    };
    state = { ...state, chatThreads: [t, ...state.chatThreads] };
    audit('CHAT_OPEN', `Открыт чат по возврату ${input.rmaId}`);
    emit();
    return id;
  },

  /**
   * Универсальный internal-thread. Идемпотентно по (kind, refId) или (kind, title).
   * kind='direct' требует counterpartyId.
   */
  getOrCreateInternalThread(input: {
    kind: 'direct' | 'task' | 'order' | 'problem' | 'dispute' | 'shift' | 'admin';
    refId?: string;
    counterpartyId?: string;       // для kind='direct'
    title?: string;
    participantIds?: string[];
    priority?: ChatThreadPriority;
  }): string {
    const w = state.currentWorker;
    // Найти existing
    const matches = (t: ChatThread) => {
      if (t.kind !== input.kind) return false;
      if (input.kind === 'task'    && t.taskId    === input.refId) return true;
      if (input.kind === 'order'   && t.orderId   === input.refId) return true;
      if (input.kind === 'problem' && t.problemId === input.refId) return true;
      if (input.kind === 'dispute' && t.disputeId === input.refId) return true;
      if (input.kind === 'shift'   && t.title     === (input.title ?? '')) return true;
      if (input.kind === 'admin'   && t.participantIds.includes(input.counterpartyId ?? 'admin')) return true;
      if (input.kind === 'direct') {
        return !!(w && input.counterpartyId
          && t.participantIds.includes(w.id)
          && t.participantIds.includes(input.counterpartyId));
      }
      return false;
    };
    const found = state.chatThreads.find(matches);
    if (found) return found.id;

    const id = `CT-${Date.now()}`;
    const participants = new Set(input.participantIds ?? []);
    if (w) participants.add(w.id);
    if (input.counterpartyId) participants.add(input.counterpartyId);

    const t: ChatThread = {
      id, kind: input.kind,
      title: input.title,
      taskId:    input.kind === 'task'    ? input.refId : undefined,
      orderId:   input.kind === 'order'   ? input.refId : undefined,
      problemId: input.kind === 'problem' ? input.refId : undefined,
      disputeId: input.kind === 'dispute' ? input.refId : undefined,
      messages: [],
      createdAt: new Date().toISOString(),
      participantIds: Array.from(participants),
      participants: ['warehouse', 'admin'],
      priority: input.priority ?? 'normal',
      status: 'open',
      readBy: w ? [w.id] : [],
    };
    state = { ...state, chatThreads: [t, ...state.chatThreads] };
    audit('INTERNAL_CHAT_OPEN', `${input.kind}: ${input.title ?? input.refId ?? input.counterpartyId ?? ''}`);
    emit();
    return id;
  },

  changeThreadStatus(threadId: string, status: ChatThreadStatus) {
    state = {
      ...state,
      chatThreads: state.chatThreads.map(t => t.id === threadId ? { ...t, status } : t),
    };
    audit('CHAT_STATUS_CHANGE', `${threadId}: → ${status}`);
    emit();
  },

  changeThreadPriority(threadId: string, priority: ChatThreadPriority) {
    state = {
      ...state,
      chatThreads: state.chatThreads.map(t => t.id === threadId ? { ...t, priority } : t),
    };
    audit('CHAT_PRIORITY_CHANGE', `${threadId}: → ${priority}`);
    emit();
  },

  assignChatThread(threadId: string, workerId: string) {
    state = {
      ...state,
      chatThreads: state.chatThreads.map(t => t.id === threadId
        ? { ...t, assignedTo: workerId, participantIds: t.participantIds.includes(workerId) ? t.participantIds : [...t.participantIds, workerId] }
        : t),
    };
    audit('CHAT_ASSIGN', `${threadId}: → ${workerId}`);
    emit();
  },

  markThreadRead(threadId: string) {
    const w = state.currentWorker;
    if (!w) return;
    state = {
      ...state,
      chatThreads: state.chatThreads.map(t => t.id === threadId
        ? { ...t, readBy: t.readBy.includes(w.id) ? t.readBy : [...t.readBy, w.id] }
        : t),
    };
    emit();
  },

  sendChatMessage(threadId: string, text: string, attachments: ChatAttachment[] = []): { ok: boolean; reason?: string } {
    if (!text.trim() && attachments.length === 0) return { ok: false, reason: 'Пустое сообщение' };
    const w = state.currentWorker;
    const now = new Date().toISOString();
    const m: ChatMessage = {
      id: `CM-${Date.now()}`,
      threadId,
      author: 'warehouse',
      authorName: w?.name ?? 'Склад',
      text: text.trim(),
      attachments,
      sentAt: now,
      status: 'sent',
    };
    state = {
      ...state,
      chatThreads: state.chatThreads.map(t =>
        t.id === threadId
          ? {
              ...t,
              messages: [...t.messages, m],
              lastMessageAt: now,
              // Сбрасываем readBy: прочитал только отправитель, остальным теперь unread
              readBy: w ? [w.id] : [],
              status: t.status === 'closed' ? 'open' : 'waiting_response',
            }
          : t),
    };
    audit('CHAT_SEND', `${threadId}: ${text.slice(0, 60)}${text.length > 60 ? '…' : ''}`);
    emit();
    return { ok: true };
  },

  markChatMessageStatus(threadId: string, messageId: string, status: ChatMessage['status']) {
    state = {
      ...state,
      chatThreads: state.chatThreads.map(t => t.id !== threadId ? t : {
        ...t,
        messages: t.messages.map(m => m.id === messageId ? { ...m, status } : m),
      }),
    };
    audit('CHAT_STATUS', `${threadId}/${messageId}: ${status}`);
    emit();
  },

  receiveChatResponse(threadId: string, author: ChatAuthor, authorName: string, text: string) {
    const m: ChatMessage = {
      id: `CM-${Date.now()}`,
      threadId, author, authorName,
      text, attachments: [],
      sentAt: new Date().toISOString(),
      status: 'response_received',
    };
    state = {
      ...state,
      chatThreads: state.chatThreads.map(t => t.id !== threadId ? t : {
        ...t,
        messages: [
          // Помечаем последнее наше сообщение как "response_received"
          ...t.messages.map(x => x.author === 'warehouse' && x === t.messages[t.messages.length - 1]
            ? { ...x, status: 'response_received' as const } : x),
          m,
        ],
      }),
    };
    audit('CHAT_RESPONSE', `${threadId}: получен ответ (${authorName})`);
    emit();
  },

  /** Override блокировки сканирования — может только override_block-роль. */
  overrideScanBlock(blockId: string, comment: string): { ok: boolean; reason?: string } {
    if (!state.currentWorker) return { ok: false, reason: 'Не авторизован' };
    state = {
      ...state,
      scanBlocks: state.scanBlocks.map(b =>
        b.id === blockId
          ? { ...b, resolvedAt: new Date().toISOString(), resolvedBy: state.currentWorker?.id }
          : b),
    };
    audit('SCAN_BLOCK_OVERRIDE', `${blockId}: ${comment}`);
    emit();
    return { ok: true };
  },

  // ── Documents ──
  approveDocument(id: string) {
    state = { ...state, documents: state.documents.map(d => d.id === id ? { ...d, status: 'approved' } : d) };
    audit('DOC_APPROVE', `Документ ${id} одобрен`);
    emit();
  },
  rejectDocument(id: string) {
    state = { ...state, documents: state.documents.map(d => d.id === id ? { ...d, status: 'rejected' } : d) };
    audit('DOC_REJECT', `Документ ${id} отклонён`);
    emit();
  },
  uploadDocument(input: { type: DocumentRow['type']; number: string; orderId?: string; asnId?: string; rmaId?: string }) {
    const d: DocumentRow = {
      id: `D-${Date.now()}`,
      type: input.type, number: input.number,
      orderId: input.orderId, asnId: input.asnId, rmaId: input.rmaId,
      status: 'pending',
      uploadedBy: state.currentWorker?.id,
      createdAt: new Date().toISOString(),
    };
    state = { ...state, documents: [d, ...state.documents] };
    audit('DOC_UPLOAD', `Загружен ${input.type}: ${input.number}`);
    emit();
  },

  // ── Util ──
  resetAll() {
    state = { ...state, audit: [] };
    emit();
  },
};
