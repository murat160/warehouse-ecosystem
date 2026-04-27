/**
 * Tiny API client for Admin Panel.
 *
 * Rules (from project security spec):
 *  - Only relative paths under the /api prefix. No absolute URLs.
 *    No double prefix. No loopback hostnames in client code.
 *  - JWT taken from localStorage("wms_jwt") if present.
 *  - Never logs the token. Never logs PIN.
 *  - Errors are surfaced as ApiError with safe message — UI shows the message,
 *    not the raw stack trace.
 *  - All write methods imply backend-side RBAC; frontend only hides UI affordances.
 */

const TOKEN_KEY = 'wms_jwt';

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (!path.startsWith('/api/')) {
    throw new ApiError(0, 'INVALID_PATH', 'Refusing non-/api path: ' + path);
  }
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const tok = getToken();
  if (tok) headers.Authorization = `Bearer ${tok}`;

  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    // Network down / CORS / typo. Don't leak details.
    throw new ApiError(0, 'NETWORK', 'Сервер недоступен');
  }

  const text = await res.text();
  let data: any = null;
  if (text) {
    try { data = JSON.parse(text); } catch { /* non-JSON response */ }
  }

  if (!res.ok) {
    const code = data?.code ?? `HTTP_${res.status}`;
    const safe =
      res.status === 401 ? 'Сессия истекла. Войдите заново.' :
      res.status === 403 ? 'Недостаточно прав' :
      res.status === 404 ? 'Не найдено' :
      res.status === 422 ? (data?.error ?? 'Неверные данные') :
      res.status >= 500 ? 'Сервер вернул ошибку' :
      (data?.error ?? `Ошибка ${res.status}`);
    throw new ApiError(res.status, code, safe);
  }
  return data as T;
}

export const api = {
  get:    <T>(path: string)             => request<T>('GET',    path),
  post:   <T>(path: string, b?: unknown) => request<T>('POST',   path, b),
  patch:  <T>(path: string, b?: unknown) => request<T>('PATCH',  path, b),
  put:    <T>(path: string, b?: unknown) => request<T>('PUT',    path, b),
  delete: <T>(path: string)             => request<T>('DELETE', path),

  // Token helpers (no logging).
  setToken(t: string)  { try { localStorage.setItem(TOKEN_KEY, t); } catch {} },
  clearToken()         { try { localStorage.removeItem(TOKEN_KEY); } catch {} },
  hasToken()           { return !!getToken(); },
};

// ─── Typed wrappers used by Safety + Devices pages ────────────────────────────

export interface DeviceDto {
  id: string;
  code: string;
  type: 'SCANNER' | 'SCALE' | 'PRINTER' | 'CAMERA' | 'RFID';
  name: string;
  assignedTo: string | null;
  status: 'ACTIVE' | 'OFFLINE' | 'MAINTENANCE';
  lastSeenAt: string | null;
}

export const devicesApi = {
  list: () => api.get<DeviceDto[]>('/api/devices'),
  create: (body: { code: string; name: string; type: DeviceDto['type']; assignedTo?: string | null }) =>
    api.post<DeviceDto>('/api/devices', body),
  heartbeat: (id: string) => api.post(`/api/devices/${id}/heartbeat`),
};

// Incidents: backend module is planned, frontend uses local fallback today.
// Wire-ready: when backend exposes /api/incidents, swap fallback for `api.get(...)`.
export interface IncidentDto {
  id: string;
  type: 'INJURY' | 'DAMAGED_RACK' | 'BLOCKED_AISLE' | 'FORKLIFT_ISSUE'
       | 'FIRE_RISK' | 'WET_FLOOR' | 'EQUIPMENT_FAILURE' | 'SECURITY_ISSUE'
       | 'WRONG_ZONE_ACCESS' | 'HAZARDOUS_ITEM';
  status: 'OPEN' | 'IN_REVIEW' | 'ASSIGNED' | 'RESOLVED' | 'REJECTED' | 'ESCALATED';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  zone: string | null;
  description: string;
  reportedBy: string;
  reportedAt: string;
  assignedTo?: string | null;
  resolvedAt?: string | null;
  notes?: string;
}

export const incidentsApi = {
  async list(): Promise<IncidentDto[]> {
    try { return await api.get<IncidentDto[]>('/api/incidents'); }
    catch { return []; /* backend module not deployed yet — page handles empty state */ }
  },
  async create(body: Omit<IncidentDto, 'id' | 'reportedAt' | 'reportedBy' | 'status'>): Promise<IncidentDto | null> {
    try { return await api.post<IncidentDto>('/api/incidents', body); }
    catch { return null; /* graceful no-op */ }
  },
  async setStatus(id: string, status: IncidentDto['status']): Promise<IncidentDto | null> {
    try { return await api.patch<IncidentDto>(`/api/incidents/${id}/status`, { status }); }
    catch { return null; }
  },
};
