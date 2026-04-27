/**
 * Mappers backend ↔ frontend models.
 *
 * Backend uses Prisma models with backend enum strings (UPPER_SNAKE).
 * Frontend pages were written against the original mockData.ts shapes
 * (lower_snake roles, lower_snake task statuses, etc.).
 *
 * Goal: keep all pages working unchanged. We translate every API response
 * to the frontend shape on the boundary.
 */

import type {
  WorkerProfile, WorkerRole, Task, TaskStatus, TaskType, TaskPriority,
  ASN, ASNItem, InboundStatus,
  Order, OrderItem, OrderStatus,
  RMA, CountTask, ReplenishTask,
  Bin, SKU, Product, Seller, ZoneCode, StorageType,
} from '../data/mockData';

// ───────── role mapping ─────────
// Backend role names → frontend role names
const ROLE_MAP: Record<string, WorkerRole> = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'super_admin',
  WAREHOUSE_MANAGER: 'warehouse_manager',
  SHIFT_SUPERVISOR: 'shift_supervisor',
  RECEIVER: 'receiver',
  QC_INSPECTOR: 'qc_inspector',
  PUTAWAY_OPERATOR: 'putaway',
  PICKER: 'picker',
  PACKER: 'packer',
  SORTER: 'sorter',
  SHIPPING_OPERATOR: 'shipper',
  RETURNS_OPERATOR: 'returns',
  REPLENISHMENT_OPERATOR: 'replenishment',
  INVENTORY_CONTROLLER: 'inventory_controller',
  SELLER: 'super_admin', // sellers don't use Staff App
  COURIER_DISPATCHER: 'shipper',
};

const TASK_STATUS_MAP: Record<string, TaskStatus> = {
  CREATED: 'created', ASSIGNED: 'assigned', ACCEPTED: 'accepted',
  IN_PROGRESS: 'in_progress', WAITING_SCAN: 'waiting_scan',
  WAITING_SUPERVISOR: 'waiting_supervisor', BLOCKED: 'blocked',
  COMPLETED: 'completed', REASSIGNED: 'reassigned',
  CANCELLED: 'cancelled', ESCALATED: 'escalated',
};
const TASK_STATUS_REVERSE: Record<TaskStatus, string> = Object.fromEntries(
  Object.entries(TASK_STATUS_MAP).map(([k, v]) => [v, k])
) as any;

const PRIORITY_MAP: Record<string, TaskPriority> = {
  LOW: 'normal', NORMAL: 'normal', HIGH: 'high', URGENT: 'urgent',
};

const ORDER_STATUS_MAP: Record<string, OrderStatus> = {
  NEW: 'new', INVENTORY_CHECKING: 'inventory_checking', RESERVED: 'reserved',
  RELEASED: 'released', PICKING_ASSIGNED: 'picking_assigned', PICKING: 'picking',
  PICKED: 'picked', PACKING_ASSIGNED: 'packing_assigned', PACKING: 'packing',
  PACKED: 'packed', SORTING: 'sorting', READY_FOR_DISPATCH: 'ready_for_dispatch',
  LOADED: 'loaded', HANDED_TO_COURIER: 'handed_to_courier', IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered', FAILED_DELIVERY: 'failed', RETURNING: 'returning',
  RETURNED: 'returned', CANCELLED: 'cancelled', PROBLEM: 'problem',
};

const ASN_STATUS_MAP: Record<string, InboundStatus> = {
  CREATED: 'expected', EXPECTED: 'expected', ARRIVED: 'arrived',
  RECEIVING: 'receiving', RECEIVED: 'received', CLOSED: 'received',
};

const STORAGE_MAP: Record<string, StorageType> = {
  FOLDED: 'folded', HANGING: 'hanging', SHOES: 'shoes', ACCESSORIES: 'accessories',
};

// ───────── User → WorkerProfile ─────────
export function mapUser(u: any): WorkerProfile {
  return {
    id: u.employeeId,                    // pages use employee ID as the worker key
    badgeId: u.employeeId,
    name: u.fullName,
    pin: '',                             // never exposed by API
    role: ROLE_MAP[u.roleName ?? u.role?.name] ?? 'picker',
    warehouseCode: 'WH01',
    warehouseName: 'Главный склад',
    zone: undefined,
    shiftStatus: u.status === 'ON_BREAK' ? 'on_break'
                : u.status === 'OFFLINE' ? 'off' : 'on_shift',
    shiftPlanned: { start: '09:00', end: '18:00' },
    productivity: 95, errorRate: 0.5, tasksCompletedToday: 0,
    // Carry the real DB id so we can call /api/tasks?assignedToId=...
    _backendId: u.id,
  } as any;
}

// Helper: lookup worker by either employeeId (frontend id) or backend uuid
export function getBackendUserId(w: WorkerProfile | null): string | null {
  return (w as any)?._backendId ?? null;
}

// ───────── Task ─────────
/** Build the payload object the way pages expect (asnId, orderId, skuId, ...). */
function parsePayload(raw: string | null | undefined): Record<string, any> {
  if (!raw) return {};
  if (typeof raw === 'object') return raw as any;
  try { return JSON.parse(raw); } catch { return {}; }
}

const TYPE_MAP: Record<string, TaskType> = {
  RECEIVE: 'RECEIVE', QC_CHECK: 'QC_CHECK', PUTAWAY: 'PUTAWAY',
  PICK: 'PICK', PACK: 'PACK', SORT: 'SORT', LOAD: 'LOAD',
  RETURN_CHECK: 'RETURN_CHECK', REPACK: 'REPACK',
  CYCLE_COUNT: 'CYCLE_COUNT', REPLENISHMENT: 'REPLENISHMENT',
  MOVE_BIN: 'MOVE_BIN', DAMAGE_CHECK: 'DAMAGE_CHECK',
  SECURITY_CHECK: 'SECURITY_CHECK', DEVICE_ISSUE: 'DEVICE_ISSUE',
};

export function mapTask(t: any): Task {
  const payload = parsePayload(t.payload);
  return {
    id: t.id,                                 // backend uuid; pages now use this directly
    type: TYPE_MAP[t.type] ?? 'PICK',
    priority: PRIORITY_MAP[t.priority] ?? 'normal',
    status: TASK_STATUS_MAP[t.status] ?? 'created',
    assignedTo: t.assignedTo?.employeeId,
    zone: undefined,
    createdAt: t.createdAt,
    deadlineAt: t.deadlineAt ?? undefined,
    startedAt: t.startedAt ?? undefined,
    completedAt: t.completedAt ?? undefined,
    payload: {
      asnId:     payload.asnId,
      asnItemId: payload.asnItemId,
      skuId:     payload.skuId,
      qty:       payload.qty,
      orderId:   t.orderId ?? payload.orderId,
      toteId:    payload.toteId,
      packageId: payload.packageId,
      courierId: payload.courierId,
      routeId:   payload.routeId,
      rmaId:     payload.rmaId,
      binId:     payload.binId ?? payload.locationId,
      fromBinId: payload.fromLocationId ?? payload.fromBinId,
      toBinId:   payload.toLocationId ?? payload.toBinId,
    },
    errors: undefined, photos: undefined, notes: undefined,
  };
}

export const reverseTaskStatus = (s: TaskStatus): string => TASK_STATUS_REVERSE[s] ?? 'CREATED';

// ───────── Catalog ─────────
export function mapProduct(p: any): Product {
  return {
    id: p.id,
    name: p.name,
    brand: p.brand ?? '',
    category: p.category ?? '',
    gender: (p.gender ?? 'unisex').toLowerCase(),
    season: (p.season ?? 'all').toLowerCase(),
    material: p.material ?? undefined,
    country: p.country ?? undefined,
    sellerId: p.sellerId ?? '',
    description: p.description ?? undefined,
    photoEmoji: emojiForCategory(p.category),
  } as Product;
}

function emojiForCategory(cat?: string): string {
  if (!cat) return '📦';
  const c = cat.toLowerCase();
  if (c.includes('shirt') || c.includes('tshirt') || c.includes('t-shirt')) return '👕';
  if (c.includes('hoodie') || c.includes('coat') || c.includes('jacket')) return '🧥';
  if (c.includes('shoe') || c.includes('sneaker')) return '👟';
  if (c.includes('dress')) return '👗';
  if (c.includes('blouse')) return '👚';
  if (c.includes('bag')) return '👜';
  return '📦';
}

export function mapSku(s: any): SKU {
  return {
    id: s.id,
    productId: s.productId,
    barcode: s.barcode,
    color: s.color ?? '',
    size: s.size ?? '',
    weightKg: s.weight ?? 0.2,
    dimensionsCm: { l: 30, w: 20, h: 3 },
    storageType: STORAGE_MAP[s.storageType] ?? 'folded',
    status: 'available',
  } as SKU;
}

export function mapSeller(s: any): Seller {
  return {
    id: s.id, name: s.name, rating: 4.5, defectRate: 0.5, riskScore: 'low',
  };
}

// ───────── Locations → Bins ─────────
export function mapLocation(loc: any, inventory?: any[]): Bin {
  // Try to find the SKU & qty actually on this bin
  const inv = inventory?.find(i => i.locationId === loc.id && i.status === 'AVAILABLE');
  return {
    id: loc.code,                  // pages use the human code as bin.id
    warehouse: 'WH01',
    zone: (loc.zone?.code ?? 'BULK') as ZoneCode,
    aisle: loc.aisle ?? 'A01',
    rack: loc.rack ?? 'R01',
    section: loc.section ?? undefined,
    shelf: loc.shelf ?? 'S01',
    bin: loc.bin ?? 'B01',
    storageType: storageFromZone(loc.zone?.code),
    capacity: loc.capacity ?? 100,
    currentUnits: inv?.quantity ?? 0,
    currentSku: inv?.sku?.id ?? inv?.skuId,
    status: loc.status === 'BLOCKED' ? 'blocked'
          : loc.status === 'MAINTENANCE' ? 'maintenance' : 'active',
    lastCountAt: undefined,
    lastMovementAt: inv?.updatedAt,
    _backendId: loc.id,
  } as any;
}

function storageFromZone(code?: string): StorageType {
  switch (code) {
    case 'HNG': return 'hanging';
    case 'SHS': return 'shoes';
    case 'ACC': return 'accessories';
    case 'FLD':
    default:    return 'folded';
  }
}

// ───────── ASN ─────────
export function mapAsnItem(it: any): ASNItem {
  return {
    id: it.id,
    skuId: it.sku?.id ?? it.skuId,
    expectedQty: it.expectedQty ?? 0,
    actualQty: it.receivedQty ?? 0,
    damagedQty: 0,
    checked: it.status !== 'PENDING',
    qcStatus: it.status === 'RECEIVED' ? 'pending' : undefined,
    notes: undefined,
  };
}

export function mapAsn(a: any): ASN {
  return {
    id: a.code ?? a.id,
    manifestNo: a.code ?? a.id,
    sellerId: a.seller?.id ?? a.sellerId,
    expectedAt: a.expectedDate ?? a.createdAt,
    arrivedAt: undefined,
    dockNo: undefined,
    status: ASN_STATUS_MAP[a.status] ?? 'expected',
    items: (a.items ?? []).map(mapAsnItem),
    driverName: a.driverInfo ?? undefined,
    driverPhone: undefined,
    vehiclePlate: a.vehicleNumber ?? undefined,
    boxCount: a.boxCount ?? 0,
    palletCount: 0,
    _backendId: a.id,
  } as any;
}

// ───────── Order ─────────
export function mapOrderItem(it: any, locations?: any[]): OrderItem {
  // Pick the location with the most stock for this SKU (best-effort)
  const loc = it.sku?.inventory?.[0]?.location?.code
            ?? locations?.find(l => (l.inventory ?? []).some((inv: any) => inv.skuId === it.skuId))?.code
            ?? 'WH01-FLD-A01-R01-B-S01-B01';
  return {
    id: it.id,
    skuId: it.sku?.id ?? it.skuId,
    qty: it.quantity,
    pickedQty: it.picked ?? 0,
    binId: loc,
  };
}

export function mapOrder(o: any, locations?: any[]): Order {
  // Compute expectedWeightKg from items
  const expectedWeightKg = (o.items ?? []).reduce((sum: number, it: any) => {
    const w = it.sku?.weight ?? 0;
    return sum + w * (it.quantity ?? 0);
  }, 0);
  return {
    id: o.code ?? o.id,
    customerName: o.customerName ?? 'Customer',
    customerType: 'customer',
    customerCity: o.city ?? '',
    destinationCity: o.city ?? '',
    deliveryZone: o.zone ?? '',
    deadlineAt: o.updatedAt,
    createdAt: o.createdAt,
    items: (o.items ?? []).map((it: any) => mapOrderItem(it, locations)),
    status: ORDER_STATUS_MAP[o.status] ?? 'new',
    priority: PRIORITY_MAP[o.priority] ?? 'normal',
    expectedWeightKg: Math.round(expectedWeightKg * 100) / 100,
    actualWeightKg: undefined,
    recommendedPackage: 'BAG-M',
    packageId: undefined,
    packedPhotoUrl: undefined,
    courierId: undefined,
    routeId: undefined,
    paymentMethod: 'cashless',
    _backendId: o.id,
  } as any;
}

// ───────── RMA ─────────
const RMA_DECISION_MAP: Record<string, NonNullable<RMA['inspectionResult']>> = {
  RESELLABLE: 'resellable', REPACK_NEEDED: 'repack', DAMAGED: 'damaged',
  RETURN_TO_SELLER: 'rtv', SELLER_DISPUTE: 'dispute', CUSTOMER_DISPUTE: 'dispute',
  DISPOSAL: 'dispose', CLEANING_NEEDED: 'repack',
};
export const REVERSE_RMA_DECISION: Record<NonNullable<RMA['inspectionResult']>, string> = {
  resellable: 'RESELLABLE', repack: 'REPACK_NEEDED', damaged: 'DAMAGED',
  rtv: 'RETURN_TO_SELLER', dispute: 'SELLER_DISPUTE', dispose: 'DISPOSAL',
};

export function mapRma(r: any): RMA {
  return {
    id: r.code ?? r.id,
    orderId: r.orderId ?? '',
    customerName: '',
    receivedAt: r.receivedAt ?? undefined,
    items: [],
    reason: r.reason,
    status: r.status === 'DECIDED' ? (RMA_DECISION_MAP[r.decision] ?? 'inspecting')
          : r.status === 'RECEIVED' ? 'received'
          : r.status === 'QC_PENDING' ? 'inspecting'
          : 'expected',
    inspectionResult: r.decision ? RMA_DECISION_MAP[r.decision] : undefined,
    inspectionNotes: undefined,
    _backendId: r.id,
  } as any;
}

// ───────── Tasks for cycle-count / replenishment helpers ─────────
export function mapCountTaskFromTask(t: any): CountTask {
  const payload = parsePayload(t.payload);
  return {
    id: t.id,
    binId: payload.locationId ?? '',
    skuId: payload.skuId,
    expectedQty: payload.expectedQty ?? 0,
    type: 'normal',
    status: t.status === 'COMPLETED' ? 'completed' : 'pending',
    createdAt: t.createdAt,
  } as CountTask;
}

export function mapReplenishFromTask(t: any): ReplenishTask {
  const payload = parsePayload(t.payload);
  return {
    id: t.id,
    skuId: payload.skuId ?? '',
    fromBinId: payload.fromLocationId ?? '',
    toBinId: payload.toLocationId ?? '',
    qty: payload.qty ?? 0,
    priority: PRIORITY_MAP[t.priority] ?? 'normal',
    status: t.status === 'COMPLETED' ? 'completed' : 'pending',
    createdAt: t.createdAt,
  } as ReplenishTask;
}
