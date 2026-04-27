/**
 * WMS Core State + Task Engine — Stage 3 (API-backed).
 *
 * Контракт `useAppState()` + `store.*` сохранён один-в-один с предыдущей
 * mock-версией, чтобы все pages работали без правок.
 *
 * Что изменилось внутри:
 * - Login → реальный POST /api/auth/login + GET /api/auth/me.
 * - Bootstrap → грузит из backend: workers, skus, products, locations,
 *   orders, ASNs, returns, tasks, cycle-count, replenishment.
 * - Все мутации (acceptTask, completeTask, putawayItem, packOrder, ...) →
 *   POST/PATCH к API → refetch ресурса → emit.
 * - validateBinScan / validateSkuScan → синхронная проверка кэша + fire-and-forget
 *   POST /api/scans (для audit/problem-task).
 * - reportTaskError → POST /api/tasks/:id/problem.
 * - localStorage хранит только JWT и кеш для быстрого ребута.
 *
 * Геттеры (`store.findSkuByBarcode`, `store.findBin`) остаются синхронными
 * (читают cache), поэтому pages не пришлось делать async.
 */

import { useEffect, useSyncExternalStore } from 'react';
import {
  type WorkerProfile, type Task, type TaskError,
  type ASN, type Order, type RMA, type CountTask, type ReplenishTask,
  type Bin, type SKU, type Product, type Seller, type WarehouseAlert,
  type Incident, type AuditLogEntry, type ShiftKPI,
  ROLE_TASK_TYPES, PRIORITY_CFG, mockShiftKPI,
} from '../data/mockData';

import {
  authApi, usersApi, catalogApi, locationsApi, inventoryApi,
  tasksApi, inboundApi, ordersApi, pickingApi, packingApi, shippingApi,
  returnsApi, replenishmentApi, cycleCountApi, scansApi,
} from '../api/client';
import {
  mapUser, mapTask, mapProduct, mapSku, mapSeller, mapLocation,
  mapAsn, mapOrder, mapRma, mapCountTaskFromTask, mapReplenishFromTask,
  reverseTaskStatus, REVERSE_RMA_DECISION, getBackendUserId,
} from '../api/mappers';

// ═══════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════

interface AppState {
  ready: boolean;
  loading: boolean;
  currentWorker: WorkerProfile | null;
  workers: WorkerProfile[];
  bins: Bin[];
  skus: SKU[];
  products: Product[];
  sellers: Seller[];
  asns: ASN[];
  orders: Order[];
  rmas: RMA[];
  countTasks: CountTask[];
  replenishTasks: ReplenishTask[];
  tasks: Task[];
  alerts: WarehouseAlert[];
  incidents: Incident[];
  auditLog: AuditLogEntry[];
  kpi: ShiftKPI;
  currentShiftId: string;
  /** Last-known set of inventory items, used by mappers to compute bin.currentSku/Units. */
  _inventory: any[];
}

const STORAGE_KEY = 'wms_state_v3';

function emptyState(): AppState {
  return {
    ready: false, loading: false, currentWorker: null,
    workers: [], bins: [], skus: [], products: [], sellers: [],
    asns: [], orders: [], rmas: [], countTasks: [], replenishTasks: [],
    tasks: [], alerts: [], incidents: [], auditLog: [],
    kpi: mockShiftKPI,
    currentShiftId: 'SHIFT-' + new Date().toISOString().slice(0, 10),
    _inventory: [],
  };
}

function loadCached(): AppState {
  if (typeof window === 'undefined') return emptyState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const cached = JSON.parse(raw);
    return { ...emptyState(), ...cached, ready: false, loading: false };
  } catch { return emptyState(); }
}

function saveCache(s: AppState) {
  if (typeof window === 'undefined') return;
  try {
    const { ready: _r, loading: _l, ...rest } = s;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
  } catch { /* ignore quota */ }
}

let state: AppState = loadCached();

const listeners = new Set<() => void>();
function emit() { saveCache(state); listeners.forEach(l => l()); }
function subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l); }
function getSnapshot() { return state; }

export function useAppState() {
  // First mount: try /me to restore session
  useEffect(() => {
    if (state.ready || state.loading) return;
    if (typeof window === 'undefined') return;
    const tok = localStorage.getItem('wms_jwt');
    if (!tok) { state = { ...state, ready: true }; emit(); return; }
    state = { ...state, loading: true }; emit();
    authApi.me()
      .then(({ user }) => bootstrap(user))
      .catch(() => {
        authApi.logout();
        state = { ...emptyState(), ready: true };
        emit();
      });
  }, []);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

// ═══════════════════════════════════════════════════════════
// BOOTSTRAP — fetch all reference data after login
// ═══════════════════════════════════════════════════════════

async function bootstrap(meUser: any) {
  state = { ...state, loading: true, currentWorker: mapUser(meUser) };
  emit();
  try {
    const [workers, skus, products, locations, inventory, orders, asns, returns_, myTasks, cycleCounts, replenishments] =
      await Promise.all([
        usersApi.list().catch(() => []),
        catalogApi.listSkus().catch(() => []),
        catalogApi.listProducts().catch(() => []),
        locationsApi.list().catch(() => []),
        inventoryApi.list().catch(() => []),
        ordersApi.list().catch(() => []),
        inboundApi.listASN().catch(() => []),
        returnsApi.list().catch(() => []),
        tasksApi.myTasks().catch(() => []),
        cycleCountApi.list().catch(() => []),
        replenishmentApi.list().catch(() => []),
      ]);

    state = {
      ...state,
      ready: true, loading: false,
      currentWorker: mapUser(meUser),
      workers: workers.map(mapUser),
      skus: skus.map(mapSku),
      products: products.map(mapProduct),
      sellers: dedupSellers(products.map((p: any) => p.seller).filter(Boolean)).map(mapSeller),
      bins: locations.map((l: any) => mapLocation(l, inventory)),
      _inventory: inventory,
      orders: orders.map((o: any) => mapOrder(o, locations)),
      asns: asns.map(mapAsn),
      rmas: returns_.map(mapRma),
      tasks: myTasks.map(mapTask),
      countTasks: cycleCounts.map(mapCountTaskFromTask),
      replenishTasks: replenishments.map(mapReplenishFromTask),
    };
    emit();
  } catch (err) {
    console.error('[wms] bootstrap failed:', err);
    state = { ...state, loading: false, ready: true };
    emit();
  }
}

function dedupSellers(arr: any[]): any[] {
  const seen = new Set<string>();
  return arr.filter(x => x && !seen.has(x.id) && (seen.add(x.id), true));
}

// Refetch helpers — called after every mutation
async function refetchTasks() {
  try {
    const [tasks, orders] = await Promise.all([tasksApi.myTasks(), ordersApi.list()]);
    state = { ...state, tasks: tasks.map(mapTask), orders: orders.map((o: any) => mapOrder(o)) };
    emit();
  } catch { /* offline tolerant */ }
}
async function refetchOrders() {
  try {
    const orders = await ordersApi.list();
    state = { ...state, orders: orders.map((o: any) => mapOrder(o)) };
    emit();
  } catch {}
}
async function refetchAsns() {
  try { const asns = await inboundApi.listASN(); state = { ...state, asns: asns.map(mapAsn) }; emit(); } catch {}
}
async function refetchReturns() {
  try { const r = await returnsApi.list(); state = { ...state, rmas: r.map(mapRma) }; emit(); } catch {}
}
async function refetchInventoryAndBins() {
  try {
    const [inv, locs] = await Promise.all([inventoryApi.list(), locationsApi.list()]);
    state = { ...state, _inventory: inv, bins: locs.map((l: any) => mapLocation(l, inv)) };
    emit();
  } catch {}
}

// ═══════════════════════════════════════════════════════════
// AUDIT (local only — backend writes its own)
// ═══════════════════════════════════════════════════════════

function localAudit(action: string, details: string, extra?: { taskId?: string; binId?: string; skuId?: string }) {
  if (!state.currentWorker) return;
  const entry: AuditLogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    workerId: state.currentWorker.id,
    workerName: state.currentWorker.name,
    action, details,
    timestamp: new Date().toISOString(),
    ...extra,
  };
  state = { ...state, auditLog: [entry, ...state.auditLog].slice(0, 500) };
}

function pushAlert(alert: Omit<WarehouseAlert, 'id' | 'createdAt' | 'read'>) {
  const a: WarehouseAlert = {
    ...alert, id: `al-${Date.now()}`, createdAt: new Date().toISOString(), read: false,
  };
  state = { ...state, alerts: [a, ...state.alerts].slice(0, 50) };
}

// ═══════════════════════════════════════════════════════════
// ScanResult shape (kept identical to old contract)
// ═══════════════════════════════════════════════════════════
export interface ScanResult {
  ok: boolean;
  errorCode?: TaskError['code'];
  errorMessage?: string;
}

function backendAsnId(asnCode: string): string | null {
  const a = state.asns.find(x => x.id === asnCode);
  return (a as any)?._backendId ?? null;
}
function backendRmaId(rmaCode: string): string | null {
  const r = state.rmas.find(x => x.id === rmaCode);
  return (r as any)?._backendId ?? null;
}

// ═══════════════════════════════════════════════════════════
// PUBLIC STORE API
// ═══════════════════════════════════════════════════════════

export const store = {
  // ── Auth ───────────────────────────────────────────
  async login(workerId: string, pin: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await authApi.login(workerId, pin);
      await bootstrap(res.user);
      localAudit('LOGIN', `Вход: ${res.user.fullName}`);
      emit();
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Ошибка входа' };
    }
  },

  logout() {
    if (state.currentWorker) localAudit('LOGOUT', `Выход: ${state.currentWorker.name}`);
    authApi.logout();
    state = { ...emptyState(), ready: true };
    emit();
  },

  setShiftStatus(status: WorkerProfile['shiftStatus']) {
    if (!state.currentWorker) return;
    const updated: WorkerProfile = {
      ...state.currentWorker,
      shiftStatus: status,
      shiftStartedAt: status === 'on_shift' && !state.currentWorker.shiftStartedAt
        ? new Date().toISOString() : state.currentWorker.shiftStartedAt,
    };
    state = {
      ...state, currentWorker: updated,
      workers: state.workers.map(w => w.id === updated.id ? updated : w),
    };
    localAudit('SHIFT_STATUS', `Статус смены: ${status}`);
    emit();
  },

  // ── Tasks ──────────────────────────────────────────
  getMyTasks(): Task[] {
    if (!state.currentWorker) return [];
    const allowedTypes = ROLE_TASK_TYPES[state.currentWorker.role];
    return state.tasks
      .filter(t => allowedTypes.includes(t.type))
      .filter(t => !t.assignedTo || t.assignedTo === state.currentWorker!.id)
      .filter(t => t.status !== 'completed' && t.status !== 'cancelled')
      .sort((a, b) => {
        const r = PRIORITY_CFG[a.priority].rank - PRIORITY_CFG[b.priority].rank;
        if (r !== 0) return r;
        if (a.deadlineAt && b.deadlineAt) return new Date(a.deadlineAt).getTime() - new Date(b.deadlineAt).getTime();
        return 0;
      });
  },

  getAllActiveTasks(): Task[] {
    return state.tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled');
  },

  getProblemTasks(): Task[] {
    return state.tasks.filter(t =>
      t.status === 'blocked' || t.status === 'escalated' || t.status === 'waiting_supervisor'
    );
  },

  async acceptTask(taskId: string) {
    try { await tasksApi.accept(taskId); localAudit('TASK_ACCEPT', `Принята задача ${taskId}`, { taskId }); await refetchTasks(); }
    catch (e) { console.warn('[acceptTask]', e); }
  },

  async startTask(taskId: string) {
    try { await tasksApi.start(taskId); localAudit('TASK_START', `Начата задача ${taskId}`, { taskId }); await refetchTasks(); }
    catch (e) { console.warn('[startTask]', e); }
  },

  async completeTask(taskId: string) {
    try { await tasksApi.complete(taskId); localAudit('TASK_COMPLETE', `Завершена ${taskId}`, { taskId }); await refetchTasks(); }
    catch (e) { console.warn('[completeTask]', e); }
  },

  async blockTask(taskId: string, reason: string) {
    try {
      await tasksApi.transition(taskId, 'BLOCKED');
      pushAlert({ type: 'sla_breach', title: `Задача ${taskId} заблокирована`, description: reason, priority: 'high' });
      localAudit('TASK_BLOCK', `Задача ${taskId} заблокирована: ${reason}`, { taskId });
      await refetchTasks();
    } catch (e) { console.warn('[blockTask]', e); }
  },

  async escalateTask(taskId: string, reason: string) {
    try {
      await tasksApi.transition(taskId, 'ESCALATED');
      pushAlert({ type: 'sla_breach', title: `Эскалация ${taskId}`, description: reason, priority: 'high', actionLabel: 'Открыть', actionLink: '/supervisor' });
      localAudit('TASK_ESCALATE', `Эскалация ${taskId}: ${reason}`, { taskId });
      await refetchTasks();
    } catch (e) { console.warn('[escalateTask]', e); }
  },

  async reassignTask(taskId: string, newWorkerEmployeeId: string) {
    const target = state.workers.find(w => w.id === newWorkerEmployeeId);
    const backendUserId = getBackendUserId(target ?? null);
    if (!backendUserId) return;
    try { await tasksApi.reassign(taskId, backendUserId); localAudit('TASK_REASSIGN', `Задача ${taskId} → ${newWorkerEmployeeId}`, { taskId }); await refetchTasks(); }
    catch (e) { console.warn('[reassignTask]', e); }
  },

  /** Reports a problem to backend (creates problem-task) and updates UI alerts. */
  async reportTaskError(taskId: string | null, error: Omit<TaskError, 'id' | 'createdAt'>) {
    pushAlert({ type: 'qc_alert', title: 'Ошибка на складе', description: `${error.code}: ${error.message}`, priority: 'high' });
    if (taskId) {
      try {
        await tasksApi.reportProblem(taskId, { reason: error.code.toUpperCase(), notes: error.message });
        await refetchTasks();
      } catch (e) { console.warn('[reportTaskError]', e); }
    }
    localAudit('TASK_ERROR', `${error.code}: ${error.message}${taskId ? ' (задача ' + taskId + ')' : ''}`, { taskId: taskId || undefined });
    emit();
  },

  // ── Scan validation (sync with cache + async backend log) ──
  validateBinScan(taskId: string, scannedCode: string, expectedBinId: string): ScanResult {
    scansApi.scan({ scanType: 'BIN', value: scannedCode, taskId, expected: expectedBinId }).catch(() => {});
    if (scannedCode === expectedBinId) {
      localAudit('SCAN_BIN_OK', `Ячейка ${scannedCode}`, { taskId, binId: scannedCode });
      emit();
      return { ok: true };
    }
    void this.reportTaskError(taskId, {
      code: 'wrong_bin', message: `Отсканирована ${scannedCode}, ожидалась ${expectedBinId}`,
    });
    return { ok: false, errorCode: 'wrong_bin', errorMessage: `Не та ячейка. Ожидалась ${expectedBinId}` };
  },

  validateSkuScan(taskId: string, scannedCode: string, expectedSkuId: string): ScanResult {
    const sku = state.skus.find(s => s.id === scannedCode || s.barcode === scannedCode);
    scansApi.scan({ scanType: 'SKU', value: scannedCode, taskId, expected: expectedSkuId }).catch(() => {});
    if (!sku) {
      void this.reportTaskError(taskId, { code: 'unreadable_barcode', message: `Штрихкод ${scannedCode} не найден` });
      return { ok: false, errorCode: 'unreadable_barcode', errorMessage: 'Штрихкод не распознан' };
    }
    if (sku.id !== expectedSkuId) {
      void this.reportTaskError(taskId, { code: 'wrong_sku', message: `Отсканирован ${sku.id}, ожидался ${expectedSkuId}` });
      return { ok: false, errorCode: 'wrong_sku', errorMessage: `Не тот товар. Ожидался ${expectedSkuId}` };
    }
    localAudit('SCAN_SKU_OK', `Товар ${sku.id}`, { taskId, skuId: sku.id });
    emit();
    return { ok: true };
  },

  // ── ASN / Receiving ─────────────────────────────────
  markASNArrived(asnCode: string, dockNo: string) {
    state = {
      ...state,
      asns: state.asns.map(a => a.id === asnCode ? { ...a, status: 'docked', dockNo, arrivedAt: new Date().toISOString() } : a),
    };
    localAudit('ASN_DOCKED', `Поставка ${asnCode} у ${dockNo}`); emit();
  },

  startReceiving(asnCode: string) {
    state = { ...state, asns: state.asns.map(a => a.id === asnCode ? { ...a, status: 'receiving' } : a) };
    localAudit('RECEIVE_START', `Начата приёмка ${asnCode}`); emit();
  },

  receiveASNItem(asnCode: string, itemId: string, actualQty: number, damagedQty: number) {
    state = {
      ...state,
      asns: state.asns.map(a => a.id === asnCode ? {
        ...a,
        items: a.items.map(it => it.id === itemId
          ? { ...it, actualQty, damagedQty, checked: true, qcStatus: 'pending' as const } : it),
      } : a),
    };
    localAudit('RECEIVE_ITEM_DRAFT', `Принят черновик ${itemId}: ${actualQty} шт. (брак: ${damagedQty})`);
    emit();
  },

  async finishReceiving(asnCode: string) {
    const asn = state.asns.find(a => a.id === asnCode);
    if (!asn) return;
    const backendId = backendAsnId(asnCode);
    if (!backendId) return;
    try {
      await inboundApi.receive({
        asnId: backendId,
        items: asn.items.map(it => ({
          asnItemId: it.id, receivedQty: it.actualQty, damaged: it.damagedQty > 0,
        })),
      });
      const hasDiscrepancy = asn.items.some(it => it.actualQty !== it.expectedQty || it.damagedQty > 0);
      if (hasDiscrepancy) pushAlert({ type: 'discrepancy', title: `Расхождение в ${asnCode}`, description: 'Факт ≠ заявленное', priority: 'high' });
      localAudit('RECEIVE_FINISH', `Приёмка ${asnCode} завершена. Расхождение: ${hasDiscrepancy ? 'ДА' : 'нет'}`);
      await Promise.all([refetchAsns(), refetchTasks()]);
    } catch (e: any) {
      console.warn('[finishReceiving]', e);
      pushAlert({ type: 'qc_alert', title: `Не удалось закрыть ${asnCode}`, description: e?.message ?? 'API error', priority: 'high' });
    }
  },

  // ── QC ──────────────────────────────────────────────
  async qcDecision(asnCode: string, itemId: string, decision: 'passed' | 'failed' | 'quarantine' | 'repack', notes?: string) {
    const asnBackendId = backendAsnId(asnCode);
    const task = state.tasks.find(t => t.type === 'QC_CHECK' && t.payload.asnId === asnBackendId && t.payload.asnItemId === itemId);
    if (!task) {
      console.warn('[qcDecision] no QC task for', asnCode, itemId);
      return;
    }
    const map: Record<string, string> = { passed: 'QC_PASSED', failed: 'QC_FAILED', quarantine: 'QUARANTINE', repack: 'REPACK_NEEDED' };
    try {
      await inboundApi.qcDecide(task.id, { decision: map[decision], notes });
      localAudit('QC_DECISION', `${itemId}: ${decision}${notes ? ' — ' + notes : ''}`);
      await Promise.all([refetchTasks(), refetchAsns()]);
    } catch (e) { console.warn('[qcDecision]', e); }
  },

  // ── Putaway ─────────────────────────────────────────
  async putawayItem(taskId: string, skuId: string, binId: string, qty: number): Promise<boolean> {
    const sku = state.skus.find(s => s.id === skuId);
    const bin = state.bins.find(b => b.id === binId);
    if (!sku || !bin) return false;
    try {
      await inboundApi.putawayConfirm(taskId, {
        locationBarcode: bin.id, skuBarcode: sku.barcode, qty,
      });
      localAudit('PUTAWAY', `${skuId} → ${binId}: ${qty} шт.`, { binId, skuId, taskId });
      await Promise.all([refetchTasks(), refetchInventoryAndBins()]);
      return true;
    } catch (e) { console.warn('[putawayItem]', e); return false; }
  },

  // ── Picking ─────────────────────────────────────────
  async startPicking(orderCode: string) {
    const order = state.orders.find(o => o.id === orderCode);
    const task = order
      ? state.tasks.find(t => t.type === 'PICK' && t.payload.orderId === (order as any)._backendId)
      : null;
    if (task) await store.startTask(task.id);
    localAudit('PICK_START', `Начата сборка ${orderCode}`);
  },

  /** Pick one item via real backend scan endpoint. */
  async pickItem(orderCode: string, itemId: string, qty: number) {
    const order = state.orders.find(o => o.id === orderCode);
    if (!order) return;
    const item = order.items.find(i => i.id === itemId);
    if (!item) return;
    const sku = state.skus.find(s => s.id === item.skuId);
    const bin = state.bins.find(b => b.id === item.binId);
    if (!sku || !bin) return;
    const task = state.tasks.find(t => t.type === 'PICK' && t.payload.orderId === (order as any)._backendId);
    if (!task) return;
    try {
      const res = await pickingApi.scan(task.id, {
        locationBarcode: bin.id, skuBarcode: sku.barcode, toteId: `TOTE-${order.id.slice(-4)}`, qty,
      });
      localAudit('PICK_ITEM', `Заказ ${orderCode}: ${itemId} собран (${qty})`, { skuId: item.skuId, binId: item.binId });
      await Promise.all([refetchTasks(), refetchOrders(), refetchInventoryAndBins()]);
      if (res.complete) localAudit('PICK_DONE', `Заказ ${orderCode} собран`);
    } catch (e) { console.warn('[pickItem]', e); }
  },

  /** Compatibility: backend auto-completes; we just refetch. */
  async finishPicking(orderCode: string) {
    await Promise.all([refetchTasks(), refetchOrders()]);
    localAudit('PICK_DONE', `Заказ ${orderCode} завершён`);
  },

  // ── Packing ─────────────────────────────────────────
  async packOrder(orderCode: string, actualWeightKg: number, _packageId: string): Promise<{ ok: boolean; reason?: string }> {
    const order = state.orders.find(o => o.id === orderCode);
    if (!order) return { ok: false, reason: 'Заказ не найден' };
    const task = state.tasks.find(t => t.type === 'PACK' && t.payload.orderId === (order as any)._backendId);
    if (!task) return { ok: false, reason: 'Задача упаковки не найдена' };
    const scannedSkuIds = order.items.map(i => i.skuId);
    try {
      await packingApi.confirm(task.id, { scannedSkuIds, actualWeightKg, packageType: order.recommendedPackage });
      localAudit('PACK_DONE', `Заказ ${orderCode} упакован (вес ${actualWeightKg} кг)`);
      await Promise.all([refetchTasks(), refetchOrders()]);
      return { ok: true };
    } catch (e: any) {
      const msg = e?.message ?? 'Ошибка упаковки';
      pushAlert({ type: 'qc_alert', title: `Упаковка ${orderCode}`, description: msg, priority: 'high', actionLink: '/orders' });
      localAudit('PACK_FAIL', `${orderCode}: ${msg}`);
      await refetchTasks();
      return { ok: false, reason: msg };
    }
  },

  // ── Shipping / Loading ──────────────────────────────
  async loadOrder(orderCode: string, courierId: string, vehiclePlate: string) {
    const order = state.orders.find(o => o.id === orderCode);
    if (!order) return;
    try {
      await shippingApi.handoff({ orderIds: [(order as any)._backendId], courierId, vehicleNumber: vehiclePlate });
      localAudit('LOAD', `Заказ ${orderCode} → курьер ${courierId} (${vehiclePlate})`);
      await refetchOrders();
    } catch (e) { console.warn('[loadOrder]', e); }
  },

  markOrderReadyForDispatch(orderCode: string) {
    state = { ...state, orders: state.orders.map(o => o.id === orderCode ? { ...o, status: 'ready_for_dispatch' } : o) };
    localAudit('SORT_READY', `${orderCode} готов к отправке`); emit();
  },

  // ── Returns ─────────────────────────────────────────
  async inspectRMA(rmaCode: string, decision: NonNullable<RMA['inspectionResult']>, notes: string) {
    const backendId = backendRmaId(rmaCode);
    if (!backendId) return;
    try {
      await returnsApi.decide(backendId, REVERSE_RMA_DECISION[decision]);
      localAudit('RMA_INSPECT', `${rmaCode}: ${decision}${notes ? ' — ' + notes : ''}`);
      await refetchReturns();
    } catch (e) { console.warn('[inspectRMA]', e); }
  },

  // ── Cycle Count ─────────────────────────────────────
  async submitCount(taskId: string, countedQty: number) {
    const ct = state.countTasks.find(c => c.id === taskId);
    if (!ct) return;
    const sku = ct.skuId ? state.skus.find(s => s.id === ct.skuId) : null;
    const bin = state.bins.find(b => b.id === ct.binId);
    if (!sku || !bin) {
      console.warn('[submitCount] missing sku or bin'); return;
    }
    try {
      await cycleCountApi.submit(taskId, {
        locationId: (bin as any)._backendId, skuId: sku.id, countedQty,
      });
      localAudit('COUNT_SUBMIT', `${ct.binId}: ${countedQty}`);
      await refetchTasks();
    } catch (e) { console.warn('[submitCount]', e); }
  },

  // ── Replenishment ───────────────────────────────────
  async completeReplenishment(taskId: string) {
    try {
      await replenishmentApi.confirm(taskId);
      localAudit('REPLENISH', `Задача ${taskId} завершена`);
      await Promise.all([refetchTasks(), refetchInventoryAndBins()]);
    } catch (e) { console.warn('[completeReplenishment]', e); }
  },

  // ── Incidents (local only — backend module: TODO Stage-4) ──
  reportIncident(incident: Omit<Incident, 'id' | 'createdAt' | 'reportedBy' | 'status'>) {
    if (!state.currentWorker) return;
    const newIncident: Incident = {
      ...incident, id: `INC-${Date.now()}`, createdAt: new Date().toISOString(),
      reportedBy: state.currentWorker.id, status: 'open',
    };
    state = { ...state, incidents: [newIncident, ...state.incidents] };
    pushAlert({ type: 'incident', title: `Инцидент ${newIncident.id}`, description: incident.description, priority: 'medium', actionLink: '/incidents' });
    localAudit('INCIDENT', `Создан: ${newIncident.type} — ${newIncident.description}`);
    emit();
  },

  resolveIncident(incidentId: string) {
    state = { ...state, incidents: state.incidents.map(i => i.id === incidentId ? { ...i, status: 'resolved' } : i) };
    localAudit('INCIDENT_RESOLVED', `Инцидент ${incidentId} решён`); emit();
  },

  // ── Alerts (local UI state) ─────────────────────────
  markAlertRead(alertId: string) {
    state = { ...state, alerts: state.alerts.map(a => a.id === alertId ? { ...a, read: true } : a) };
    emit();
  },
  markAllAlertsRead() {
    state = { ...state, alerts: state.alerts.map(a => ({ ...a, read: true })) };
    emit();
  },

  // ── Dev reset ───────────────────────────────────────
  resetState() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('wms_jwt');
    }
    state = emptyState(); state.ready = true; emit();
  },

  // ── Sync getters (cache lookups) ────────────────────
  findSkuByBarcode(code: string) { return state.skus.find(s => s.barcode === code || s.id === code); },
  findBin(binId: string) { return state.bins.find(b => b.id === binId); },
  findProduct(productId: string) { return state.products.find(p => p.id === productId); },
  findSeller(sellerId: string) { return state.sellers.find(s => s.id === sellerId); },
};

// Utility: full SKU + product join (kept identical to old contract)
export function lookupSkuFull(skuId: string, skus: SKU[], products: Product[]) {
  const sku = skus.find(s => s.id === skuId);
  if (!sku) return null;
  const product = products.find(p => p.id === sku.productId);
  return { sku, product };
}

// Re-export for any page that needs to build status transitions.
export { reverseTaskStatus };
