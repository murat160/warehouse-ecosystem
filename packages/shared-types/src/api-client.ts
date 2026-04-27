// ============================================================
//  Thin fetch-based API client used by every frontend app.
//  - Reads VITE_API_URL at build time, falls back to localhost.
//  - Handles JWT auth via localStorage.
//  - Throws ApiClientError on non-2xx for ergonomic try/catch.
// ============================================================

import type { LoginRequest, LoginResponse, ApiError } from './models';

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
  baseUrl?: string;
  getToken?: () => string | null;
  setToken?: (token: string | null) => void;
}

export function createApiClient(config: ApiClientConfig = {}) {
  const baseUrl =
    config.baseUrl ??
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) ??
    'http://localhost:4000';

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
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();
    const data = text ? JSON.parse(text) : null;

    if (!res.ok) {
      const err = data as ApiError;
      throw new ApiClientError(res.status, err?.code ?? 'UNKNOWN', err?.error ?? res.statusText, err?.details);
    }
    return data as T;
  }

  return {
    get baseUrl() { return baseUrl; },
    getToken,
    setToken,

    get: <T>(path: string) => request<T>('GET', path),
    post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
    patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
    put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
    delete: <T>(path: string) => request<T>('DELETE', path),

    // ---- Auth helpers ----
    async login(req: LoginRequest): Promise<LoginResponse> {
      const res = await request<LoginResponse>('POST', '/api/auth/login', req);
      setToken(res.token);
      return res;
    },
    logout() {
      setToken(null);
    },
    async me() {
      return request<LoginResponse>('GET', '/api/auth/me');
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
