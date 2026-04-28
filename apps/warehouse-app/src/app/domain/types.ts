import type { OrderStatus } from './orderStatus';

export type WorkerRole = 'picker' | 'packer' | 'shipper' | 'receiver' | 'inventory' | 'manager';
export type ShiftStatus = 'off' | 'on_shift' | 'on_break';

export interface Worker {
  id: string;
  name: string;
  role: WorkerRole;
  shiftStatus: ShiftStatus;
  shiftStart?: string;
  shiftEnd?: string;
}

export interface OrderItem {
  id: string;
  sku: string;
  name: string;
  qty: number;
  pickedQty: number;
  binId?: string;
}

export interface WarehouseOrder {
  id: string;
  code: string;
  customerName: string;
  city: string;
  status: OrderStatus;
  items: OrderItem[];
  weightKg?: number;
  packageType?: string;
  courierId?: string;
  pickerId?: string;
  packerId?: string;
  shipperId?: string;
  receivedAt: string;
  updatedAt: string;
}

export type TaskType =
  | 'PICK' | 'PACK' | 'HANDOFF'
  | 'RECEIVE' | 'PUTAWAY'
  | 'COUNT' | 'MOVE'
  | 'RETURN_CHECK';

export type TaskStatus = 'created' | 'assigned' | 'in_progress' | 'completed' | 'blocked';
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Task {
  id: string;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  assignedTo?: string;
  orderId?: string;
  binId?: string;
  createdAt: string;
  deadline?: string;
}

export interface Bin {
  id: string;
  code: string;
  zone: string;
  capacity: number;
  occupied: number;
  status: 'active' | 'blocked' | 'maintenance';
}

export interface InventoryRow {
  sku: string;
  name: string;
  qty: number;
  reserved: number;
  bins: string[];
}

export interface ReturnRow {
  id: string;
  orderId: string;
  reason: string;
  status: 'expected' | 'received' | 'inspecting' | 'closed';
  receivedAt?: string;
}

export type ProblemType = 'damage' | 'missing' | 'wrong_sku' | 'scanner_fail' | 'other';
export type ProblemStatus = 'open' | 'investigating' | 'resolved';

export interface ProblemRow {
  id: string;
  type: ProblemType;
  description: string;
  reportedBy: string;
  createdAt: string;
  status: ProblemStatus;
}

export type DocumentType = 'TORG-12' | 'manifest' | 'route_sheet' | 'discrepancy_act';

export interface DocumentRow {
  id: string;
  type: DocumentType;
  number: string;
  createdAt: string;
  url?: string;
}
