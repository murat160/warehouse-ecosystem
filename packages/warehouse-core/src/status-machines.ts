// ============================================================
//  State machines for orders, tasks and RMAs.
//  Used by backend to validate transitions and by frontends to
//  enable/disable buttons.
// ============================================================

import {
  OrderStatus, TaskStatus, ASNStatus, RMAStatus,
} from '@wms/shared-types';

type Transitions<T extends string> = Partial<Record<T, T[]>>;

export const ORDER_TRANSITIONS: Transitions<OrderStatus> = {
  [OrderStatus.NEW]: [OrderStatus.INVENTORY_CHECKING, OrderStatus.CANCELLED],
  [OrderStatus.INVENTORY_CHECKING]: [OrderStatus.RESERVED, OrderStatus.PROBLEM, OrderStatus.CANCELLED],
  [OrderStatus.RESERVED]: [OrderStatus.RELEASED, OrderStatus.CANCELLED],
  [OrderStatus.RELEASED]: [OrderStatus.PICKING_ASSIGNED],
  [OrderStatus.PICKING_ASSIGNED]: [OrderStatus.PICKING],
  [OrderStatus.PICKING]: [OrderStatus.PICKED, OrderStatus.PROBLEM],
  [OrderStatus.PICKED]: [OrderStatus.PACKING_ASSIGNED],
  [OrderStatus.PACKING_ASSIGNED]: [OrderStatus.PACKING],
  [OrderStatus.PACKING]: [OrderStatus.PACKED, OrderStatus.PROBLEM],
  [OrderStatus.PACKED]: [OrderStatus.SORTING],
  [OrderStatus.SORTING]: [OrderStatus.READY_FOR_DISPATCH],
  [OrderStatus.READY_FOR_DISPATCH]: [OrderStatus.LOADED],
  [OrderStatus.LOADED]: [OrderStatus.HANDED_TO_COURIER],
  [OrderStatus.HANDED_TO_COURIER]: [OrderStatus.IN_TRANSIT],
  [OrderStatus.IN_TRANSIT]: [OrderStatus.DELIVERED, OrderStatus.FAILED_DELIVERY],
  [OrderStatus.FAILED_DELIVERY]: [OrderStatus.RETURNING],
  [OrderStatus.RETURNING]: [OrderStatus.RETURNED],
  [OrderStatus.PROBLEM]: [OrderStatus.RESERVED, OrderStatus.CANCELLED],
};

export const TASK_TRANSITIONS: Transitions<TaskStatus> = {
  [TaskStatus.CREATED]: [TaskStatus.ASSIGNED, TaskStatus.CANCELLED],
  [TaskStatus.ASSIGNED]: [TaskStatus.ACCEPTED, TaskStatus.REASSIGNED, TaskStatus.CANCELLED],
  [TaskStatus.ACCEPTED]: [TaskStatus.IN_PROGRESS, TaskStatus.REASSIGNED],
  [TaskStatus.IN_PROGRESS]: [
    TaskStatus.WAITING_SCAN, TaskStatus.WAITING_SUPERVISOR,
    TaskStatus.BLOCKED, TaskStatus.COMPLETED, TaskStatus.ESCALATED,
  ],
  [TaskStatus.WAITING_SCAN]: [TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED],
  [TaskStatus.WAITING_SUPERVISOR]: [TaskStatus.IN_PROGRESS, TaskStatus.REASSIGNED, TaskStatus.CANCELLED],
  [TaskStatus.BLOCKED]: [TaskStatus.IN_PROGRESS, TaskStatus.ESCALATED, TaskStatus.CANCELLED],
  [TaskStatus.ESCALATED]: [TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED],
};

export const ASN_TRANSITIONS: Transitions<ASNStatus> = {
  [ASNStatus.CREATED]: [ASNStatus.EXPECTED, ASNStatus.CLOSED],
  [ASNStatus.EXPECTED]: [ASNStatus.ARRIVED],
  [ASNStatus.ARRIVED]: [ASNStatus.RECEIVING],
  [ASNStatus.RECEIVING]: [ASNStatus.RECEIVED],
  [ASNStatus.RECEIVED]: [ASNStatus.CLOSED],
};

export const RMA_TRANSITIONS: Transitions<RMAStatus> = {
  [RMAStatus.CREATED]: [RMAStatus.IN_TRANSIT, RMAStatus.CLOSED],
  [RMAStatus.IN_TRANSIT]: [RMAStatus.RECEIVED],
  [RMAStatus.RECEIVED]: [RMAStatus.QC_PENDING],
  [RMAStatus.QC_PENDING]: [RMAStatus.DECIDED],
  [RMAStatus.DECIDED]: [RMAStatus.CLOSED],
};

export function canTransition<T extends string>(
  table: Transitions<T>,
  from: T,
  to: T
): boolean {
  return table[from]?.includes(to) ?? false;
}

export function assertTransition<T extends string>(
  table: Transitions<T>,
  from: T,
  to: T,
  entity = 'entity'
): void {
  if (!canTransition(table, from, to)) {
    throw new Error(`Invalid ${entity} transition: ${from} → ${to}`);
  }
}
