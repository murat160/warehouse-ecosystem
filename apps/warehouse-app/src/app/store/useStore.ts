import { useSyncExternalStore } from 'react';
import type {
  Worker, WarehouseOrder, Task, Bin,
  InventoryRow, ReturnRow, ProblemRow, DocumentRow, ShiftStatus,
} from '../domain/types';
import type { OrderStatus } from '../domain/orderStatus';
import { NEXT_STATUSES } from '../domain/orderStatus';
import {
  MOCK_WORKERS, MOCK_ORDERS, MOCK_TASKS, MOCK_BINS,
  MOCK_INVENTORY, MOCK_RETURNS, MOCK_PROBLEMS, MOCK_DOCUMENTS,
} from '../domain/mock';

interface State {
  currentWorker: Worker | null;
  workers: Worker[];
  orders: WarehouseOrder[];
  tasks: Task[];
  bins: Bin[];
  inventory: InventoryRow[];
  returns: ReturnRow[];
  problems: ProblemRow[];
  documents: DocumentRow[];
}

let state: State = {
  currentWorker: null,
  workers: MOCK_WORKERS,
  orders: MOCK_ORDERS,
  tasks: MOCK_TASKS,
  bins: MOCK_BINS,
  inventory: MOCK_INVENTORY,
  returns: MOCK_RETURNS,
  problems: MOCK_PROBLEMS,
  documents: MOCK_DOCUMENTS,
};

const listeners = new Set<() => void>();
function emit() { listeners.forEach(l => l()); }
function subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; }
function getSnapshot() { return state; }

export function useStore(): State {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export const store = {
  login(workerId: string): boolean {
    const w = state.workers.find(x => x.id === workerId);
    if (!w) return false;
    state = { ...state, currentWorker: w };
    emit();
    return true;
  },

  logout(): void {
    state = { ...state, currentWorker: null };
    emit();
  },

  setShift(status: ShiftStatus): void {
    if (!state.currentWorker) return;
    const updated: Worker = { ...state.currentWorker, shiftStatus: status };
    state = {
      ...state,
      currentWorker: updated,
      workers: state.workers.map(w => w.id === updated.id ? updated : w),
    };
    emit();
  },

  /** Перевести заказ в следующий допустимый статус. Backend валидирует тот же список. */
  advanceOrder(orderId: string, to: OrderStatus): { ok: boolean; reason?: string } {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return { ok: false, reason: 'Заказ не найден' };
    const allowed = NEXT_STATUSES[order.status];
    if (!allowed.includes(to)) {
      return { ok: false, reason: `Недопустимый переход: ${order.status} → ${to}` };
    }
    state = {
      ...state,
      orders: state.orders.map(o => o.id === orderId
        ? { ...o, status: to, updatedAt: new Date().toISOString() }
        : o),
    };
    emit();
    return { ok: true };
  },
};
