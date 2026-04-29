import { useSyncExternalStore } from 'react';
import type {
  Worker, Sku, Bin, WarehouseOrder, Task, InventoryRow, Movement,
  CountTask, Asn, ReturnRow, Problem, DocumentRow, Courier,
  AuditEntry, ProblemType, ReturnStatus, ItemStatus, ShiftStatus,
} from '../domain/types';
import type { OrderStatus } from '../domain/orderStatus';
import { NEXT_STATUSES } from '../domain/orderStatus';
import {
  MOCK_WORKERS, MOCK_SKUS, MOCK_BINS, MOCK_ORDERS, MOCK_TASKS,
  MOCK_INVENTORY, MOCK_MOVEMENTS, MOCK_COUNTS, MOCK_ASNS,
  MOCK_RETURNS, MOCK_PROBLEMS, MOCK_DOCUMENTS, MOCK_COURIERS,
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
};

const listeners = new Set<() => void>();
function emit() { listeners.forEach(l => l()); }
function subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; }
function getSnapshot() { return state; }

export function useStore(): State {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

// ───────── helpers ─────────
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
