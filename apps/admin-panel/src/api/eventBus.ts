// ─── Platform Event Bus ───────────────────────────────────────────────────────
// Центральная шина событий. Все приложения публикуют и подписываются через неё.
// Паттерн: publish/subscribe + replay для новых подписчиков.

export type PlatformEventType =
  // Orders
  | 'ORDER_CREATED' | 'ORDER_ACCEPTED' | 'ORDER_ASSIGNED' | 'ORDER_PICKED_UP'
  | 'ORDER_DELIVERED' | 'ORDER_CANCELLED' | 'ORDER_RETURNED'
  // Couriers
  | 'COURIER_ONLINE' | 'COURIER_OFFLINE' | 'COURIER_LOCATION_UPDATED'
  | 'COURIER_ASSIGNED' | 'COURIER_ACTIVATED' | 'COURIER_BLOCKED'
  // Documents
  | 'DOCUMENT_UPLOADED' | 'DOCUMENT_APPROVED' | 'DOCUMENT_REJECTED'
  | 'DOCUMENT_EXPIRED' | 'DOCUMENT_REUPLOAD_REQUESTED'
  // Finance
  | 'PAYMENT_CREATED' | 'PAYMENT_PROCESSED' | 'PAYOUT_INITIATED' | 'PAYOUT_COMPLETED'
  // Users
  | 'USER_REGISTERED' | 'USER_ACTIVATED' | 'USER_BLOCKED' | 'USER_ROLE_CHANGED'
  // Merchants
  | 'MERCHANT_REGISTERED' | 'MERCHANT_VERIFIED' | 'MERCHANT_SUSPENDED'
  // PVZ
  | 'PVZ_OPENED' | 'PVZ_CLOSED' | 'PVZ_CAPACITY_CRITICAL'
  // Chat / Support
  | 'TICKET_CREATED' | 'TICKET_ASSIGNED' | 'TICKET_RESOLVED' | 'TICKET_ESCALATED'
  // System
  | 'CACHE_INVALIDATED' | 'AUDIT_WRITTEN' | 'NOTIFICATION_SENT';

export interface PlatformEvent<T = Record<string, unknown>> {
  id: string;
  type: PlatformEventType;
  source: string;               // service that emitted: 'courier_service', 'document_service', …
  payload: T;
  timestamp: string;
  correlationId?: string;       // for distributed tracing
  userId?: string;
  sessionId?: string;
}

type EventHandler<T = Record<string, unknown>> = (event: PlatformEvent<T>) => void | Promise<void>;

// ── Module-level state (singleton) ───────────────────────────────────────────

const _handlers: Map<PlatformEventType | '*', Set<EventHandler>> = new Map();
const _eventLog: PlatformEvent[] = [];          // last 200 events (in-memory replay)
const MAX_LOG = 200;

let _sessionId = `sess-${Date.now().toString(36)}`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeId() {
  return `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function nowIso() {
  return new Date().toISOString();
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Subscribe to a specific event type, or '*' for all events */
export function on<T = Record<string, unknown>>(
  type: PlatformEventType | '*',
  handler: EventHandler<T>,
): () => void {
  if (!_handlers.has(type)) _handlers.set(type, new Set());
  _handlers.get(type)!.add(handler as EventHandler);
  return () => _handlers.get(type)?.delete(handler as EventHandler);
}

/** Emit an event — runs all matching handlers + wildcard handlers */
export function emit<T = Record<string, unknown>>(
  type: PlatformEventType,
  payload: T,
  meta: { source?: string; userId?: string; correlationId?: string } = {},
): PlatformEvent<T> {
  const event: PlatformEvent<T> = {
    id: makeId(),
    type,
    source: meta.source ?? 'admin_panel',
    payload,
    timestamp: nowIso(),
    correlationId: meta.correlationId ?? makeId(),
    userId: meta.userId,
    sessionId: _sessionId,
  };

  // Append to log
  _eventLog.unshift(event as PlatformEvent);
  if (_eventLog.length > MAX_LOG) _eventLog.pop();

  // Run handlers async (microtask) so emitter doesn't block
  Promise.resolve().then(() => {
    const specific = _handlers.get(type);
    const wildcard = _handlers.get('*');

    specific?.forEach(h => {
      try { h(event as PlatformEvent); } catch (e) { console.error('[EventBus]', type, e); }
    });
    wildcard?.forEach(h => {
      try { h(event as PlatformEvent); } catch (e) { console.error('[EventBus] *', e); }
    });
  });

  return event;
}

/** Get recent event log (for audit / debug) */
export function getEventLog(limit = 50): PlatformEvent[] {
  return _eventLog.slice(0, limit);
}

/** Clear handlers (for testing) */
export function clear() {
  _handlers.clear();
}

export const eventBus = { on, emit, getEventLog, clear };
