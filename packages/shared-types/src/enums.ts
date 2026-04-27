// ============================================================
//  Enums shared between backend (Prisma) and all frontends.
//  Keep in sync with backend/api/prisma/schema.prisma.
// ============================================================

export const RoleName = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  WAREHOUSE_MANAGER: 'WAREHOUSE_MANAGER',
  SHIFT_SUPERVISOR: 'SHIFT_SUPERVISOR',
  RECEIVER: 'RECEIVER',
  QC_INSPECTOR: 'QC_INSPECTOR',
  PUTAWAY_OPERATOR: 'PUTAWAY_OPERATOR',
  PICKER: 'PICKER',
  PACKER: 'PACKER',
  SORTER: 'SORTER',
  SHIPPING_OPERATOR: 'SHIPPING_OPERATOR',
  RETURNS_OPERATOR: 'RETURNS_OPERATOR',
  REPLENISHMENT_OPERATOR: 'REPLENISHMENT_OPERATOR',
  INVENTORY_CONTROLLER: 'INVENTORY_CONTROLLER',
  SELLER: 'SELLER',
  COURIER_DISPATCHER: 'COURIER_DISPATCHER',
} as const;
export type RoleName = typeof RoleName[keyof typeof RoleName];

export const UserStatus = {
  ACTIVE: 'ACTIVE',
  BLOCKED: 'BLOCKED',
  ON_BREAK: 'ON_BREAK',
  OFFLINE: 'OFFLINE',
} as const;
export type UserStatus = typeof UserStatus[keyof typeof UserStatus];

export const ZoneType = {
  INBOUND: 'INBOUND',
  QC: 'QC',
  REPACK: 'REPACK',
  HANGING: 'HANGING',
  FOLDED: 'FOLDED',
  SHOES: 'SHOES',
  ACCESSORIES: 'ACCESSORIES',
  HIGH_VALUE: 'HIGH_VALUE',
  RETURN_TO_VENDOR: 'RETURN_TO_VENDOR',
  DAMAGED: 'DAMAGED',
  QUARANTINE: 'QUARANTINE',
  PICKING: 'PICKING',
  BULK: 'BULK',
  PACKING: 'PACKING',
  SORTATION: 'SORTATION',
  OUTBOUND: 'OUTBOUND',
  RETURNS: 'RETURNS',
} as const;
export type ZoneType = typeof ZoneType[keyof typeof ZoneType];

export const StorageType = {
  FOLDED: 'FOLDED',
  HANGING: 'HANGING',
  SHOES: 'SHOES',
  ACCESSORIES: 'ACCESSORIES',
} as const;
export type StorageType = typeof StorageType[keyof typeof StorageType];

export const InventoryStatus = {
  AVAILABLE: 'AVAILABLE',
  RESERVED: 'RESERVED',
  QUARANTINE: 'QUARANTINE',
  DAMAGED: 'DAMAGED',
  RETURN_PENDING: 'RETURN_PENDING',
} as const;
export type InventoryStatus = typeof InventoryStatus[keyof typeof InventoryStatus];

export const LocationStatus = {
  ACTIVE: 'ACTIVE',
  BLOCKED: 'BLOCKED',
  MAINTENANCE: 'MAINTENANCE',
} as const;
export type LocationStatus = typeof LocationStatus[keyof typeof LocationStatus];

export const ASNStatus = {
  CREATED: 'CREATED',
  EXPECTED: 'EXPECTED',
  ARRIVED: 'ARRIVED',
  RECEIVING: 'RECEIVING',
  RECEIVED: 'RECEIVED',
  CLOSED: 'CLOSED',
} as const;
export type ASNStatus = typeof ASNStatus[keyof typeof ASNStatus];

export const OrderStatus = {
  NEW: 'NEW',
  INVENTORY_CHECKING: 'INVENTORY_CHECKING',
  RESERVED: 'RESERVED',
  RELEASED: 'RELEASED',
  PICKING_ASSIGNED: 'PICKING_ASSIGNED',
  PICKING: 'PICKING',
  PICKED: 'PICKED',
  PACKING_ASSIGNED: 'PACKING_ASSIGNED',
  PACKING: 'PACKING',
  PACKED: 'PACKED',
  SORTING: 'SORTING',
  READY_FOR_DISPATCH: 'READY_FOR_DISPATCH',
  LOADED: 'LOADED',
  HANDED_TO_COURIER: 'HANDED_TO_COURIER',
  IN_TRANSIT: 'IN_TRANSIT',
  DELIVERED: 'DELIVERED',
  FAILED_DELIVERY: 'FAILED_DELIVERY',
  RETURNING: 'RETURNING',
  RETURNED: 'RETURNED',
  CANCELLED: 'CANCELLED',
  PROBLEM: 'PROBLEM',
} as const;
export type OrderStatus = typeof OrderStatus[keyof typeof OrderStatus];

export const Priority = {
  LOW: 'LOW',
  NORMAL: 'NORMAL',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const;
export type Priority = typeof Priority[keyof typeof Priority];

export const TaskType = {
  RECEIVE: 'RECEIVE',
  QC_CHECK: 'QC_CHECK',
  PUTAWAY: 'PUTAWAY',
  PICK: 'PICK',
  PACK: 'PACK',
  SORT: 'SORT',
  LOAD: 'LOAD',
  RETURN_CHECK: 'RETURN_CHECK',
  REPACK: 'REPACK',
  CYCLE_COUNT: 'CYCLE_COUNT',
  REPLENISHMENT: 'REPLENISHMENT',
  MOVE_BIN: 'MOVE_BIN',
  DAMAGE_CHECK: 'DAMAGE_CHECK',
  SECURITY_CHECK: 'SECURITY_CHECK',
  DEVICE_ISSUE: 'DEVICE_ISSUE',
} as const;
export type TaskType = typeof TaskType[keyof typeof TaskType];

export const TaskStatus = {
  CREATED: 'CREATED',
  ASSIGNED: 'ASSIGNED',
  ACCEPTED: 'ACCEPTED',
  IN_PROGRESS: 'IN_PROGRESS',
  WAITING_SCAN: 'WAITING_SCAN',
  WAITING_SUPERVISOR: 'WAITING_SUPERVISOR',
  BLOCKED: 'BLOCKED',
  COMPLETED: 'COMPLETED',
  REASSIGNED: 'REASSIGNED',
  CANCELLED: 'CANCELLED',
  ESCALATED: 'ESCALATED',
} as const;
export type TaskStatus = typeof TaskStatus[keyof typeof TaskStatus];

export const RMAStatus = {
  CREATED: 'CREATED',
  IN_TRANSIT: 'IN_TRANSIT',
  RECEIVED: 'RECEIVED',
  QC_PENDING: 'QC_PENDING',
  DECIDED: 'DECIDED',
  CLOSED: 'CLOSED',
} as const;
export type RMAStatus = typeof RMAStatus[keyof typeof RMAStatus];

export const RMADecision = {
  RESELLABLE: 'RESELLABLE',
  REPACK_NEEDED: 'REPACK_NEEDED',
  CLEANING_NEEDED: 'CLEANING_NEEDED',
  DAMAGED: 'DAMAGED',
  RETURN_TO_SELLER: 'RETURN_TO_SELLER',
  CUSTOMER_DISPUTE: 'CUSTOMER_DISPUTE',
  SELLER_DISPUTE: 'SELLER_DISPUTE',
  DISPOSAL: 'DISPOSAL',
} as const;
export type RMADecision = typeof RMADecision[keyof typeof RMADecision];

export const ProblemReason = {
  SKU_NOT_FOUND: 'SKU_NOT_FOUND',
  WRONG_SKU: 'WRONG_SKU',
  WRONG_SIZE: 'WRONG_SIZE',
  WRONG_COLOR: 'WRONG_COLOR',
  DAMAGED: 'DAMAGED',
  LOCATION_BLOCKED: 'LOCATION_BLOCKED',
  WEIGHT_MISMATCH: 'WEIGHT_MISMATCH',
  COUNT_MISMATCH: 'COUNT_MISMATCH',
  OTHER: 'OTHER',
} as const;
export type ProblemReason = typeof ProblemReason[keyof typeof ProblemReason];
