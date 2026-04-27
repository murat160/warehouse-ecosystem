/**
 * Admin Panel API helper.
 *
 * Rules (project security spec):
 *  - Only relative paths under the /api prefix.
 *  - JWT taken from localStorage("wms_jwt") if present, sent as
 *    Authorization: Bearer <token>.
 *  - Never logs the token. Never logs PIN.
 *  - Maps HTTP errors to safe Russian-language messages — no stack
 *    trace leakage to the UI.
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
    throw new ApiError(0, 'INVALID_PATH', 'Refusing non-/api path');
  }
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const tok = getToken();
  if (tok) headers.Authorization = `Bearer ${tok}`;

  let res: Response;
  try {
    res = await fetch(path, {
      method, headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Сервер недоступен');
  }

  const text = await res.text();
  let data: any = null;
  if (text) { try { data = JSON.parse(text); } catch {} }

  if (!res.ok) {
    const safe =
      res.status === 401 ? 'Сессия истекла. Войдите заново.' :
      res.status === 403 ? 'Недостаточно прав' :
      res.status === 404 ? 'Не найдено' :
      res.status === 422 ? (data?.error ?? 'Неверные данные') :
      res.status >= 500  ? 'Сервер вернул ошибку' :
                           (data?.error ?? `Ошибка ${res.status}`);
    throw new ApiError(res.status, data?.code ?? `HTTP_${res.status}`, safe);
  }
  return data as T;
}

export const api = {
  get:    <T>(path: string)             => request<T>('GET',    path),
  post:   <T>(path: string, b?: unknown) => request<T>('POST',   path, b),
  patch:  <T>(path: string, b?: unknown) => request<T>('PATCH',  path, b),
  delete: <T>(path: string)             => request<T>('DELETE', path),
  setToken(t: string) { try { localStorage.setItem(TOKEN_KEY, t); } catch {} },
  clearToken()        { try { localStorage.removeItem(TOKEN_KEY); } catch {} },
  hasToken()          { return !!getToken(); },
};

// ── Typed wrappers used by Dashboard and login flow ──────────────────────────

export interface KpiDashboardDto {
  orders: number;
  openTasks: number;
  problems: number;
  activeWorkers: number;
  ordersReadyForDispatch: number;
  generatedAt: string;
}

export const kpiApi = {
  /**
   * Dashboard counters from backend. On any error returns null so the
   * UI shows mock data instead of breaking — design rule: no broken cards.
   */
  async dashboard(): Promise<KpiDashboardDto | null> {
    try { return await api.get<KpiDashboardDto>('/api/kpi/dashboard'); }
    catch { return null; }
  },
};
