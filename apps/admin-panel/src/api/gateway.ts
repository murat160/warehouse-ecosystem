// ─── API Gateway ──────────────────────────────────────────────────────────────
// Single entry point for ALL client requests.
// Courier App, Seller App, PVZ App, Client App, Admin Panel → ALL go through here.
//
// Responsibilities:
//  • Routing → correct microservice
//  • Authentication & RBAC check
//  • Rate limiting (mock)
//  • Request/Response logging
//  • Lazy-loading: coarse resource fetch → fine-grained on demand
//  • Cache-first for read operations

import {
  UserService, CourierService, OrderService,
  DocumentService, FinanceService, ChatService,
  NotificationService, AuditService,
  type ServiceResponse,
} from './services';
import { cache } from './cache';
import { emit, getEventLog, type PlatformEventType } from './eventBus';

// ── Types ─────────────────────────────────────────────────────────────────────

export type AppClient = 'admin_panel' | 'courier_app' | 'seller_app' | 'pvz_app' | 'client_app';

export interface GatewayRequest {
  service: keyof typeof SERVICE_MAP;
  action: string;
  payload?: Record<string, unknown>;
  client?: AppClient;
  userId?: string;
  userRole?: string;
  userLabel?: string;
  lazy?: boolean;             // if true, returns skeleton immediately + triggers background load
}

export interface GatewayResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  code?: number;
  meta: {
    service: string;
    action: string;
    durationMs: number;
    fromCache: boolean;
    traceId: string;
    client: AppClient;
    timestamp: string;
  };
}

// ── Rate limiter (token bucket, mock) ─────────────────────────────────────────

const _rateLimiter: Map<string, { tokens: number; lastRefill: number }> = new Map();
const RATE_LIMIT = 100;         // requests per minute per client
const REFILL_INTERVAL = 60000;  // 1 minute

function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const bucket = _rateLimiter.get(clientId) ?? { tokens: RATE_LIMIT, lastRefill: now };
  const elapsed = now - bucket.lastRefill;
  if (elapsed >= REFILL_INTERVAL) {
    bucket.tokens = RATE_LIMIT;
    bucket.lastRefill = now;
  }
  if (bucket.tokens <= 0) return false;
  bucket.tokens--;
  _rateLimiter.set(clientId, bucket);
  return true;
}

// ── RBAC permission matrix ────────────────────────────────────────────────────

const ROLE_PERMISSIONS: Record<string, Set<string>> = {
  SuperAdmin:       new Set(['*']),
  Admin:            new Set(['user.*', 'courier.*', 'order.*', 'document.*', 'finance.*', 'chat.*', 'notification.*', 'audit.read']),
  DocumentReviewer: new Set(['document.*', 'audit.read', 'notification.send']),
  ComplianceAdmin:  new Set(['document.*', 'user.activate', 'user.block', 'audit.*', 'notification.send']),
  CourierManager:   new Set(['courier.*', 'order.read', 'document.read']),
  FinanceManager:   new Set(['finance.*', 'order.read', 'audit.read']),
  SupportAgent:     new Set(['chat.*', 'order.read', 'notification.send']),
  Courier:          new Set(['order.accept', 'order.deliver', 'courier.setOnline', 'courier.setOffline']),
  Seller:           new Set(['order.read', 'document.upload']),
  PVZOperator:      new Set(['order.read', 'order.accept']),
};

function hasPermission(role: string, service: string, action: string): boolean {
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  if (perms.has('*')) return true;
  const key = `${service}.${action}`;
  const wildcard = `${service}.*`;
  return perms.has(key) || perms.has(wildcard);
}

// ── Service router ────────────────────────────────────────────────────────────

const SERVICE_MAP = {
  user:         UserService,
  courier:      CourierService,
  order:        OrderService,
  document:     DocumentService,
  finance:      FinanceService,
  chat:         ChatService,
  notification: NotificationService,
  audit:        AuditService,
} as const;

// ── Gateway stats ─────────────────────────────────────────────────────────────

const _stats = {
  totalRequests: 0,
  rateLimited: 0,
  unauthorized: 0,
  errors: 0,
  byService: {} as Record<string, number>,
  byClient: {} as Record<string, number>,
};

// ── Main gateway function ─────────────────────────────────────────────────────

export async function gatewayRequest<T = unknown>(req: GatewayRequest): Promise<GatewayResponse<T>> {
  const traceId = `trace-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const t0 = performance.now();
  const client = req.client ?? 'admin_panel';
  const role = req.userRole ?? 'Admin';

  _stats.totalRequests++;
  _stats.byService[req.service] = (_stats.byService[req.service] ?? 0) + 1;
  _stats.byClient[client] = (_stats.byClient[client] ?? 0) + 1;

  const makeMeta = (fromCache = false) => ({
    service: req.service,
    action: req.action,
    durationMs: Math.round(performance.now() - t0),
    fromCache,
    traceId,
    client,
    timestamp: new Date().toISOString(),
  });

  // ── Rate limit ────────────────────────────────────────────────────────────
  if (!checkRateLimit(`${client}:${req.userId ?? 'anon'}`)) {
    _stats.rateLimited++;
    return { ok: false, error: 'Rate limit exceeded. Retry after 60s.', code: 429, meta: makeMeta() };
  }

  // ── RBAC ─────────────────────────────────────────────────────────────────
  if (!hasPermission(role, req.service, req.action)) {
    _stats.unauthorized++;
    return { ok: false, error: `Access denied: role '${role}' cannot perform '${req.service}.${req.action}'`, code: 403, meta: makeMeta() };
  }

  // ── Route to service ──────────────────────────────────────────────────────
  const service = SERVICE_MAP[req.service] as Record<string, Function>;
  const method = service?.[req.action];

  if (typeof method !== 'function') {
    _stats.errors++;
    return { ok: false, error: `Unknown action '${req.action}' on service '${req.service}'`, code: 404, meta: makeMeta() };
  }

  try {
    const p = req.payload ?? {};
    const result: ServiceResponse<T> = await method.call(service, ...Object.values(p)) as ServiceResponse<T>;
    const fromCache = !!(result as { meta?: { fromCache?: boolean } }).meta?.fromCache;

    if (!result.ok) {
      _stats.errors++;
      return { ok: false, error: result.error, code: result.code, meta: makeMeta(fromCache) };
    }

    return { ok: true, data: result.data, meta: makeMeta(fromCache) };
  } catch (e: unknown) {
    _stats.errors++;
    const msg = e instanceof Error ? e.message : 'Internal service error';
    return { ok: false, error: msg, code: 500, meta: makeMeta() };
  }
}

// ── Convenience wrappers ──────────────────────────────────────────────────────

export const gateway = {
  request: gatewayRequest,

  /** Lazy-load pattern: returns placeholder immediately, fetches real data async */
  async lazyLoad<T>(
    cacheKey: string,
    fetcher: () => Promise<T>,
    options: { ttl?: number; tags?: string[] } = {},
  ): Promise<{ data: T | null; loading: boolean; fromCache: boolean }> {
    const cached = cache.get<T>(cacheKey);
    if (cached !== null) return { data: cached, loading: false, fromCache: true };

    // Kick off async load
    const promise = fetcher().then(data => {
      cache.set(cacheKey, data, options);
      return data;
    });

    return { data: null, loading: true, fromCache: false };
  },

  getStats() {
    return { ..._stats, cacheStats: cache.getStats() };
  },

  getEventLog,

  emit<T extends Record<string, unknown>>(type: PlatformEventType, payload: T) {
    return emit(type, payload, { source: 'admin_panel' });
  },
};

// ── Monitoring snapshot ───────────────────────────────────────────────────────

export function getGatewaySnapshot() {
  return {
    uptime: Date.now(),
    stats: _stats,
    cache: cache.getStats(),
    audit: AuditService.getStats(),
    recentEvents: getEventLog(10),
  };
}
