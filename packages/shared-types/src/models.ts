// ============================================================
//  Domain models — DTOs returned by the API and consumed by apps.
//  Mirror Prisma models but trimmed to client-safe shape.
// ============================================================

import type {
  RoleName, UserStatus, ZoneType, StorageType, InventoryStatus,
  LocationStatus, ASNStatus, OrderStatus, Priority, TaskType,
  TaskStatus, RMAStatus, RMADecision, ProblemReason,
} from './enums';

export interface User {
  id: string;
  employeeId: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  roleId: string;
  roleName: RoleName;
  warehouseId: string | null;
  zoneId: string | null;
  status: UserStatus;
  shift: string | null;
  createdAt: string;
}

export interface Role {
  id: string;
  name: RoleName;
  permissions: Record<string, boolean>;
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  address: string | null;
}

export interface Zone {
  id: string;
  code: string;
  name: string;
  type: ZoneType;
  warehouseId: string;
}

export interface Location {
  id: string;
  code: string;
  barcode: string;
  zoneId: string;
  aisle: string | null;
  rack: string | null;
  section: string | null;
  shelf: string | null;
  bin: string | null;
  capacity: number | null;
  status: LocationStatus;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  brand: string | null;
  category: string | null;
  gender: string | null;
  season: string | null;
  material: string | null;
  country: string | null;
  description: string | null;
  sellerId: string | null;
}

export interface SKU {
  id: string;
  code: string;
  barcode: string;
  productId: string;
  color: string | null;
  size: string | null;
  weight: number | null;
  storageType: StorageType;
}

export interface InventoryItem {
  id: string;
  skuId: string;
  locationId: string;
  quantity: number;
  reserved: number;
  status: InventoryStatus;
  updatedAt: string;
}

export interface Seller {
  id: string;
  code: string;
  name: string;
  email: string | null;
}

export interface ASN {
  id: string;
  code: string;
  sellerId: string;
  status: ASNStatus;
  expectedDate: string | null;
  vehicleNumber: string | null;
  driverInfo: string | null;
  boxCount: number | null;
  createdAt: string;
}

export interface ASNItem {
  id: string;
  asnId: string;
  skuId: string;
  expectedQty: number;
  receivedQty: number;
  status: string;
}

export interface Order {
  id: string;
  code: string;
  status: OrderStatus;
  customerName: string | null;
  customerPhone: string | null;
  shippingAddr: string | null;
  city: string | null;
  zone: string | null;
  priority: Priority;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  skuId: string;
  quantity: number;
  picked: number;
  packed: number;
}

export interface Task {
  id: string;
  code: string;
  type: TaskType;
  status: TaskStatus;
  priority: Priority;
  assignedToId: string | null;
  orderId: string | null;
  payload: Record<string, unknown>;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface ProblemTask {
  id: string;
  taskId: string;
  reason: ProblemReason;
  notes: string | null;
  reportedBy: string;
  resolvedBy: string | null;
  resolvedAt: string | null;
  status: 'OPEN' | 'RESOLVED' | 'ESCALATED';
  createdAt: string;
}

export interface RMA {
  id: string;
  code: string;
  orderId: string;
  reason: string;
  status: RMAStatus;
  decision: RMADecision | null;
  receivedAt: string | null;
  decidedAt: string | null;
  decidedBy: string | null;
  createdAt: string;
}

export interface ScanLog {
  id: string;
  userId: string;
  scanType: string;
  value: string;
  taskId: string | null;
  result: 'OK' | 'ERROR';
  errorCode: string | null;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  payload: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface Device {
  id: string;
  code: string;
  type: string;
  name: string;
  assignedTo: string | null;
  status: string;
  lastSeenAt: string | null;
}

// API request shapes
export interface LoginRequest {
  employeeId: string;
  pin: string;
}

export interface LoginResponse {
  token: string;
  user: User;
  role: Role;
}

export interface ApiError {
  error: string;
  code: string;
  details?: unknown;
}
