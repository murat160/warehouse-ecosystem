/**
 * @wms/api-client
 *
 * Single fetch-based API client used by every frontend app
 * (admin-panel, customer-app, seller-app, courier-app, staff-app,
 * pickup-point-app, supervisor-panel).
 *
 * Rules (enforced by CI greps + code review):
 *  - Only relative paths under the /api prefix.
 *    No localhost. No 127.0.0.1. No /api/api.
 *  - JWT taken from localStorage("wms_jwt") if present, sent as
 *    Authorization: Bearer <token>.
 *  - Never logs the token. Never logs PIN.
 *  - Mobile builds get an absolute URL only via VITE_API_URL at build
 *    time (the bundle still has no hard-coded host in source).
 */

import type { LoginRequest, LoginResponse, ApiError } from '@wms/shared-types';

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

const TOKEN_KEY = 'wms_jwt';

export interface ApiClientConfig {
  /** Override base URL. Web builds leave this empty (relative /api). */
  baseUrl?: string;
  getToken?: () => string | null;
  setToken?: (token: string | null) => void;
}

export function createApiClient(config: ApiClientConfig = {}) {
  const baseUrl =
    config.baseUrl ??
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) ??
    '';

  const getToken =
    config.getToken ??
    (() => (typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null));

  const setToken =
    config.setToken ??
    ((token: string | null) => {
      if (typeof localStorage === 'undefined') return;
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    });

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (!path.startsWith('/api/')) {
      throw new ApiClientError(0, 'INVALID_PATH',
        'API client refuses non-/api path: ' + path);
    }
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    let res: Response;
    try {
      res = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new ApiClientError(0, 'NETWORK', 'Сервер недоступен');
    }

    const text = await res.text();
    const data = text ? safeJson(text) : null;

    if (!res.ok) {
      const err = data as ApiError | null;
      throw new ApiClientError(
        res.status,
        err?.code ?? `HTTP_${res.status}`,
        err?.error ?? safeStatusMessage(res.status),
        err?.details
      );
    }
    return data as T;
  }

  return {
    get baseUrl() { return baseUrl; },
    getToken,
    setToken,

    get:    <T>(path: string)             => request<T>('GET',    path),
    post:   <T>(path: string, b?: unknown) => request<T>('POST',   path, b),
    patch:  <T>(path: string, b?: unknown) => request<T>('PATCH',  path, b),
    put:    <T>(path: string, b?: unknown) => request<T>('PUT',    path, b),
    delete: <T>(path: string)             => request<T>('DELETE', path),

    // Auth helpers ─────────────────────────────────────────
    async login(req: LoginRequest): Promise<LoginResponse> {
      const res = await request<LoginResponse>('POST', '/api/auth/login', req);
      setToken(res.token);
      return res;
    },
    logout() { setToken(null); },
    me() { return request<LoginResponse>('GET', '/api/auth/me'); },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

function safeJson(text: string): unknown {
  try { return JSON.parse(text); } catch { return null; }
}

function safeStatusMessage(status: number): string {
  if (status === 401) return 'Сессия истекла. Войдите заново.';
  if (status === 403) return 'Недостаточно прав';
  if (status === 404) return 'Не найдено';
  if (status === 422) return 'Неверные данные';
  if (status >= 500)  return 'Сервер вернул ошибку';
  return `Ошибка ${status}`;
}
