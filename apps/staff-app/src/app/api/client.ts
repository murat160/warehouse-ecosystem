/**
 * Typed API client for Staff App.
 * Wraps the shared @wms/shared-types/api-client and exposes a method per
 * backend endpoint that Staff App actually uses.
 *
 * Stage-3 contract: every store mutation goes through here.
 */

import { createApiClient } from '@wms/shared-types/api-client';

export const api = createApiClient();

// ---- Auth ----
export const authApi = {
  login: (employeeId: string, pin: string) => api.login({ employeeId, pin }),
  me: () => api.me(),
  logout: () => api.logout(),
  /** Public — used by LoginPage to render the worker picker before auth. */
  publicWorkers: () => api.get<Array<{ id: string; employeeId: string; fullName: string; roleName: string }>>('/api/auth/workers'),
};

// ---- Catalog ----
export const catalogApi = {
  listSkus: () => api.get<any[]>('/api/skus'),
  listProducts: () => api.get<any[]>('/api/products'),
  skuByBarcode: (bc: string) => api.get<any>(`/api/skus/by-barcode/${encodeURIComponent(bc)}`),
};

// ---- Locations / bins ----
export const locationsApi = {
  list: () => api.get<any[]>('/api/locations'),
  byBarcode: (bc: string) => api.get<any>(`/api/locations/by-barcode/${encodeURIComponent(bc)}`),
};

// ---- Inventory ----
export const inventoryApi = {
  list: (skuId?: string) => api.get<any[]>(`/api/inventory${skuId ? `?skuId=${skuId}` : ''}`),
  adjust: (body: { skuId: string; locationId: string; delta: number; status?: string; reason?: string }) =>
    api.post('/api/inventory/adjust', body),
};

// ---- Tasks ----
export const tasksApi = {
  myTasks: () => api.get<any[]>('/api/tasks?mine=true'),
  all: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get<any[]>(`/api/tasks${qs ? '?' + qs : ''}`);
  },
  byId: (id: string) => api.get<any>(`/api/tasks/${id}`),
  accept: (id: string) => api.post(`/api/tasks/${id}/accept`),
  start: (id: string) => api.post(`/api/tasks/${id}/start`),
  complete: (id: string) => api.post(`/api/tasks/${id}/complete`),
  reportProblem: (id: string, body: { reason: string; notes?: string }) =>
    api.post(`/api/tasks/${id}/problem`, body),
  transition: (id: string, to: string) => api.post(`/api/tasks/${id}/transition`, { to }),
  reassign: (id: string, userId: string) => api.post(`/api/tasks/${id}/reassign`, { userId }),
};

// ---- Inbound ----
export const inboundApi = {
  listASN: () => api.get<any[]>('/api/inbound/asn'),
  asnById: (id: string) => api.get<any>(`/api/inbound/asn/${id}`),
  asnByCode: (code: string) => api.get<any>(`/api/inbound/asn/by-code/${encodeURIComponent(code)}`),
  asnByTask: (taskId: string) => api.get<any>(`/api/inbound/asn/by-task/${taskId}`),
  receive: (body: { asnId: string; items: Array<{ asnItemId: string; receivedQty: number; damaged?: boolean }> }) =>
    api.post('/api/inbound/receive', body),
  qcDecide: (taskId: string, body: { decision: string; notes?: string }) =>
    api.post(`/api/inbound/qc/${taskId}/decide`, body),
  putawayConfirm: (taskId: string, body: { locationBarcode: string; skuBarcode: string; qty: number }) =>
    api.post(`/api/inbound/putaway/${taskId}/confirm`, body),
};

// ---- Orders ----
export const ordersApi = {
  list: () => api.get<any[]>('/api/orders'),
  byId: (id: string) => api.get<any>(`/api/orders/${id}`),
  byCode: (code: string) => api.get<any>(`/api/orders/by-code/${encodeURIComponent(code)}`),
  byTask: (taskId: string) => api.get<any>(`/api/orders/by-task/${taskId}`),
  release: (id: string) => api.post(`/api/orders/${id}/release`),
  cancel: (id: string) => api.post(`/api/orders/${id}/cancel`),
};

// ---- Picking / Packing / Shipping ----
export const pickingApi = {
  list: () => api.get<any[]>('/api/picking'),
  scan: (taskId: string, body: { locationBarcode: string; skuBarcode: string; toteId: string; qty?: number }) =>
    api.post<{ ok: boolean; complete: boolean }>(`/api/picking/${taskId}/scan`, body),
};
export const packingApi = {
  list: () => api.get<any[]>('/api/packing'),
  confirm: (taskId: string, body: { scannedSkuIds: string[]; actualWeightKg: number; packageType?: string }) =>
    api.post<{ ok: boolean; shipTaskId: string }>(`/api/packing/${taskId}/confirm`, body),
};
export const shippingApi = {
  ready: () => api.get<any[]>('/api/shipping/ready'),
  handoff: (body: { orderIds: string[]; courierId: string; vehicleNumber?: string; route?: string }) =>
    api.post('/api/shipping/handoff', body),
};

// ---- Returns ----
export const returnsApi = {
  list: () => api.get<any[]>('/api/returns'),
  create: (body: { orderId: string; reason: string }) => api.post<any>('/api/returns', body),
  receive: (id: string) => api.post(`/api/returns/${id}/receive`),
  decide: (id: string, decision: string) => api.post(`/api/returns/${id}/decide`, { decision }),
};

// ---- Replenishment / Cycle Count / Problems ----
export const replenishmentApi = {
  list: () => api.get<any[]>('/api/replenishment'),
  confirm: (taskId: string) => api.post(`/api/replenishment/${taskId}/confirm`),
};
export const cycleCountApi = {
  list: () => api.get<any[]>('/api/cycle-count'),
  submit: (taskId: string, body: { locationId: string; skuId: string; countedQty: number }) =>
    api.post(`/api/cycle-count/${taskId}/submit`, body),
};
export const problemsApi = {
  list: (status?: string) => api.get<any[]>(`/api/problem-tasks${status ? `?status=${status}` : ''}`),
};

// ---- Scans ----
export interface ScanResult {
  ok: boolean;
  scanType: string;
  value: string;
  entityId: string | null;
  reason: 'NOT_FOUND_OR_BLOCKED' | 'MISMATCH' | null;
}
export const scansApi = {
  scan: (body: {
    scanType: 'BIN' | 'SKU' | 'TOTE' | 'BOX' | 'PALLET' | 'ORDER' | 'COURIER' | 'VEHICLE' | 'DOCK' | 'OTHER';
    value: string;
    taskId?: string;
    expected?: string;
  }) => api.post<ScanResult>('/api/scans', body),
};

// ---- Hardware (mock) ----
export const hardwareApi = {
  weigh: (expectedKg?: number) => api.post<{ weightKg: number }>('/api/hardware/weigh', { expectedKg }),
  print: (labelType: string, payload?: Record<string, unknown>) =>
    api.post<{ labelUrl: string }>('/api/hardware/print', { labelType, payload }),
  photo: () => api.post<{ photoUrl: string }>('/api/hardware/photo'),
};

// ---- Users ----
export const usersApi = {
  list: () => api.get<any[]>('/api/users'),
};
