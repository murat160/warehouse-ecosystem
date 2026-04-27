/**
 * Admin Panel API client — typed wrapper over shared @wms/shared-types/api-client.
 * One method per backend endpoint we use. All write operations require auth.
 */
import { createApiClient } from '@wms/shared-types/api-client';

export const api = createApiClient();

// --- Auth ---
export const authApi = {
  login: (employeeId: string, pin: string) => api.login({ employeeId, pin }),
  me: () => api.me(),
  logout: () => api.logout(),
};

// --- Reference ---
export const usersApi = {
  list: () => api.get<any[]>('/api/users'),
  byId: (id: string) => api.get<any>(`/api/users/${id}`),
  create: (body: any) => api.post('/api/users', body),
  update: (id: string, body: any) => api.patch(`/api/users/${id}`, body),
  block: (id: string) => api.delete(`/api/users/${id}`),
};
export const rolesApi = {
  list: () => api.get<any[]>('/api/roles'),
};
export const warehousesApi = {
  list: () => api.get<any[]>('/api/warehouses'),
  byId: (id: string) => api.get<any>(`/api/warehouses/${id}`),
  create: (body: any) => api.post('/api/warehouses', body),
  update: (id: string, body: any) => api.patch(`/api/warehouses/${id}`, body),
};
export const zonesApi = {
  list: (warehouseId?: string) => api.get<any[]>(`/api/zones${warehouseId ? `?warehouseId=${warehouseId}` : ''}`),
  byId: (id: string) => api.get<any>(`/api/zones/${id}`),
  create: (body: any) => api.post('/api/zones', body),
};
export const locationsApi = {
  list: (zoneId?: string) => api.get<any[]>(`/api/locations${zoneId ? `?zoneId=${zoneId}` : ''}`),
  byId: (id: string) => api.get<any>(`/api/locations/${id}`),
  byBarcode: (bc: string) => api.get<any>(`/api/locations/by-barcode/${encodeURIComponent(bc)}`),
  create: (body: any) => api.post('/api/locations', body),
  setStatus: (id: string, status: string) => api.patch(`/api/locations/${id}/status`, { status }),
};
export const productsApi = {
  list: () => api.get<any[]>('/api/products'),
  byId: (id: string) => api.get<any>(`/api/products/${id}`),
  create: (body: any) => api.post('/api/products', body),
};
export const skusApi = {
  list: (productId?: string) => api.get<any[]>(`/api/skus${productId ? `?productId=${productId}` : ''}`),
  byId: (id: string) => api.get<any>(`/api/skus/${id}`),
  create: (body: any) => api.post('/api/skus', body),
};
export const inventoryApi = {
  list: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get<any[]>(`/api/inventory${qs ? '?' + qs : ''}`);
  },
  adjust: (body: any) => api.post('/api/inventory/adjust', body),
};
export const ordersApi = {
  list: () => api.get<any[]>('/api/orders'),
  byId: (id: string) => api.get<any>(`/api/orders/${id}`),
  create: (body: any) => api.post<any>('/api/orders', body),
  release: (id: string) => api.post(`/api/orders/${id}/release`),
  cancel: (id: string) => api.post(`/api/orders/${id}/cancel`),
};
export const tasksApi = {
  list: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get<any[]>(`/api/tasks${qs ? '?' + qs : ''}`);
  },
  byId: (id: string) => api.get<any>(`/api/tasks/${id}`),
  create: (body: any) => api.post('/api/tasks', body),
  assign: (id: string, userId: string) => api.post(`/api/tasks/${id}/assign`, { userId }),
  reassign: (id: string, userId: string) => api.post(`/api/tasks/${id}/reassign`, { userId }),
  transition: (id: string, to: string) => api.post(`/api/tasks/${id}/transition`, { to }),
};
export const auditApi = {
  list: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get<any[]>(`/api/audit${qs ? '?' + qs : ''}`);
  },
};
export const kpiApi = {
  dashboard: () => api.get<any>('/api/kpi/dashboard'),
};
export const problemTasksApi = {
  list: (status?: string) => api.get<any[]>(`/api/problem-tasks${status ? `?status=${status}` : ''}`),
  resolve: (id: string, notes?: string) => api.post(`/api/problem-tasks/${id}/resolve`, { notes }),
  escalate: (id: string) => api.post(`/api/problem-tasks/${id}/escalate`),
};
