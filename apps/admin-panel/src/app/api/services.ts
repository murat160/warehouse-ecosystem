// ─── Platform Microservices (Mock Implementation) ─────────────────────────────
// Each service is a self-contained module with its own business logic.
// In production these would be separate Node.js/Go services behind the Gateway.
// Here they run in-process as a realistic simulation.

import { emit } from './eventBus';
import { cache, invalidateByTag } from './cache';

// ── Shared types ──────────────────────────────────────────────────────────────

export type ServiceResponse<T = unknown> =
  | { ok: true;  data: T;      meta?: Record<string, unknown> }
  | { ok: false; error: string; code: number };

function ok<T>(data: T, meta?: Record<string, unknown>): ServiceResponse<T> {
  return { ok: true, data, meta };
}
function err(error: string, code = 400): ServiceResponse<never> {
  return { ok: false, error, code };
}

// ── Simulated latency (50–150 ms) ────────────────────────────────────────────

function delay(ms = 80) {
  return new Promise<void>(r => setTimeout(r, 40 + Math.random() * ms));
}

// ── Audit entries (in-memory, last 500) ──────────────────────────────────────

export interface AuditEntry {
  id: string;
  service: string;
  action: string;
  userId?: string;
  userLabel?: string;
  entityId?: string;
  entityType?: string;
  details: string;
  meta?: Record<string, unknown>;
  timestamp: string;
  ip?: string;
  correlationId?: string;
}

const _auditLog: AuditEntry[] = [];

function writeAudit(entry: Omit<AuditEntry, 'id' | 'timestamp'>) {
  const full: AuditEntry = {
    ...entry,
    id: `audit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
    timestamp: new Date().toISOString(),
  };
  _auditLog.unshift(full);
  if (_auditLog.length > 500) _auditLog.pop();
  emit('AUDIT_WRITTEN', { entry: full }, { source: 'audit_service' });
}

// ─────────────────────────────────────────────────────────────────────────────
// USER SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export const UserService = {
  async getUser(id: string, callerRole?: string) {
    await delay(60);
    const cached = cache.get<Record<string, unknown>>(`user:${id}`);
    if (cached) return ok(cached, { fromCache: true });
    // Simulate fetch
    const user = { id, name: `User #${id}`, role: 'courier', status: 'active', createdAt: new Date().toISOString() };
    cache.set(`user:${id}`, user, { ttl: 120, tags: ['users', `user:${id}`] });
    writeAudit({ service: 'user_service', action: 'GET_USER', entityId: id, entityType: 'user', details: `Запрос данных пользователя ${id}`, userId: callerRole });
    return ok(user);
  },

  async activateUser(id: string, callerUserId: string, callerLabel: string) {
    await delay(80);
    invalidateByTag(`user:${id}`);
    writeAudit({ service: 'user_service', action: 'ACTIVATE_USER', entityId: id, entityType: 'user', details: `Пользователь ${id} активирован`, userId: callerUserId, userLabel: callerLabel });
    emit('USER_ACTIVATED', { userId: id, activatedBy: callerUserId }, { source: 'user_service', userId: callerUserId });
    return ok({ id, status: 'active' });
  },

  async blockUser(id: string, reason: string, callerUserId: string, callerLabel: string) {
    await delay(80);
    invalidateByTag(`user:${id}`);
    writeAudit({ service: 'user_service', action: 'BLOCK_USER', entityId: id, entityType: 'user', details: `Пользователь ${id} заблокирован. Причина: ${reason}`, userId: callerUserId, userLabel: callerLabel });
    emit('USER_BLOCKED', { userId: id, reason, blockedBy: callerUserId }, { source: 'user_service', userId: callerUserId });
    return ok({ id, status: 'blocked', reason });
  },

  async changeRole(id: string, newRole: string, callerUserId: string) {
    await delay(70);
    invalidateByTag(`user:${id}`);
    writeAudit({ service: 'user_service', action: 'CHANGE_ROLE', entityId: id, entityType: 'user', details: `Роль пользователя ${id} → ${newRole}`, userId: callerUserId });
    emit('USER_ROLE_CHANGED', { userId: id, newRole, changedBy: callerUserId }, { source: 'user_service' });
    return ok({ id, role: newRole });
  },

  getAuditEntries(limit = 50) {
    return _auditLog.filter(e => e.service === 'user_service').slice(0, limit);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// COURIER SERVICE
// ─────────────────────────────────────────────────────────────────────────────

const _courierOnlineStatus: Map<string, { online: boolean; lat: number; lng: number; updatedAt: string }> = new Map();

export const CourierService = {
  async setOnline(courierId: string, lat: number, lng: number) {
    const status = { online: true, lat, lng, updatedAt: new Date().toISOString() };
    _courierOnlineStatus.set(courierId, status);
    cache.set(`courier:online:${courierId}`, status, { ttl: 15, tags: ['couriers:online'] });
    emit('COURIER_ONLINE', { courierId, lat, lng }, { source: 'courier_service' });
    writeAudit({ service: 'courier_service', action: 'COURIER_ONLINE', entityId: courierId, entityType: 'courier', details: `Курьер ${courierId} вышел онлайн (${lat.toFixed(4)}, ${lng.toFixed(4)})` });
    return ok(status);
  },

  async setOffline(courierId: string) {
    const existing = _courierOnlineStatus.get(courierId);
    if (existing) existing.online = false;
    cache.del(`courier:online:${courierId}`);
    invalidateByTag('couriers:online');
    emit('COURIER_OFFLINE', { courierId }, { source: 'courier_service' });
    writeAudit({ service: 'courier_service', action: 'COURIER_OFFLINE', entityId: courierId, entityType: 'courier', details: `Курьер ${courierId} офлайн` });
    return ok({ courierId, online: false });
  },

  async getActiveCouriers() {
    const cached = cache.get<unknown[]>('couriers:active');
    if (cached) return ok(cached, { fromCache: true });

    await delay(100);
    const active = [..._courierOnlineStatus.entries()]
      .filter(([, s]) => s.online)
      .map(([id, s]) => ({ id, ...s }));

    cache.set('couriers:active', active, { ttl: 15, tags: ['couriers:online'] });
    return ok(active, { count: active.length });
  },

  async assign(courierId: string, orderId: string, dispatcherId: string) {
    await delay(90);
    invalidateByTag('couriers:online');
    writeAudit({ service: 'courier_service', action: 'ASSIGN', entityId: orderId, entityType: 'order', details: `Курьер ${courierId} назначен на заказ ${orderId}`, userId: dispatcherId });
    emit('COURIER_ASSIGNED', { courierId, orderId, assignedBy: dispatcherId }, { source: 'courier_service' });
    return ok({ courierId, orderId, status: 'assigned' });
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ORDER SERVICE
// ─────────────────────────────────────────────────────────────────────────────

const _orderStatuses: Map<string, string> = new Map();

export const OrderService = {
  async createOrder(data: { clientId: string; pvzId: string; items: unknown[]; totalAmount: number }, userId: string) {
    await delay(120);
    const orderId = `ORD-${Date.now().toString(36).toUpperCase()}`;
    _orderStatuses.set(orderId, 'created');
    invalidateByTag('orders:open');
    writeAudit({ service: 'order_service', action: 'CREATE_ORDER', entityId: orderId, entityType: 'order', details: `Создан заказ ${orderId} на сумму ₽${data.totalAmount}`, userId });
    emit('ORDER_CREATED', { orderId, ...data, createdBy: userId }, { source: 'order_service', userId });
    return ok({ orderId, status: 'created', totalAmount: data.totalAmount });
  },

  async acceptOrder(orderId: string, courierId: string) {
    await delay(80);
    _orderStatuses.set(orderId, 'accepted');
    invalidateByTag('orders:open');
    cache.del(`order:${orderId}`);
    writeAudit({ service: 'order_service', action: 'ACCEPT_ORDER', entityId: orderId, entityType: 'order', details: `Заказ ${orderId} принят курьером ${courierId}` });
    emit('ORDER_ACCEPTED', { orderId, courierId }, { source: 'order_service' });
    return ok({ orderId, status: 'accepted', courierId });
  },

  async deliverOrder(orderId: string, courierId: string, proofPhotoUrl?: string) {
    await delay(100);
    _orderStatuses.set(orderId, 'delivered');
    cache.del(`order:${orderId}`);
    invalidateByTag('orders:open');
    writeAudit({ service: 'order_service', action: 'DELIVER_ORDER', entityId: orderId, entityType: 'order', details: `Заказ ${orderId} доставлен. Курьер: ${courierId}` });
    emit('ORDER_DELIVERED', { orderId, courierId, proofPhotoUrl }, { source: 'order_service' });
    // Trigger finance service
    emit('PAYMENT_CREATED', { orderId, courierId }, { source: 'order_service', correlationId: `corr-${orderId}` });
    return ok({ orderId, status: 'delivered' });
  },

  async getOpenOrders() {
    const cached = cache.get<unknown[]>('orders:open');
    if (cached) return ok(cached, { fromCache: true });
    await delay(90);
    const open = [..._orderStatuses.entries()].filter(([, s]) => s === 'created' || s === 'accepted').map(([id, status]) => ({ id, status }));
    cache.set('orders:open', open, { ttl: 20, tags: ['orders:open'] });
    return ok(open);
  },

  getStatus(orderId: string): string {
    return _orderStatuses.get(orderId) ?? 'unknown';
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export const DocumentService = {
  /** Resolve a safe file URL — never exposes internal storage hostnames */
  resolveFileUrl(entityId: string, docId: string, format: string): string {
    // In production: pre-signed S3/GCS URL via Document Service
    // Here: safe placeholder URL that won't cause DNS errors
    return `https://placehold.co/600x800/e2e8f0/475569?text=${encodeURIComponent(`${format.toUpperCase()}: ${docId}`)}`;
  },

  async uploadDocument(data: {
    entityId: string; entityType: string; docName: string; docType: string;
    format: string; size: string; uploadedBy: string;
  }) {
    await delay(150);
    const docId = `doc-${Date.now().toString(36)}`;
    const fileUrl = DocumentService.resolveFileUrl(data.entityId, docId, data.format);
    invalidateByTag(`docs:${data.entityId}`);
    writeAudit({
      service: 'document_service', action: 'UPLOAD',
      entityId: docId, entityType: 'document',
      details: `Загружен «${data.docName}» (${data.format.toUpperCase()}, ${data.size}) — ${data.entityType} ${data.entityId}`,
      userId: data.uploadedBy,
    });
    emit('DOCUMENT_UPLOADED', { docId, ...data, fileUrl }, { source: 'document_service' });
    return ok({ docId, fileUrl, status: 'pending_review' });
  },

  async approveDocument(docId: string, reviewerId: string, reviewerLabel: string) {
    await delay(100);
    writeAudit({
      service: 'document_service', action: 'APPROVE',
      entityId: docId, entityType: 'document',
      details: `Документ ${docId} одобрен`,
      userId: reviewerId, userLabel: reviewerLabel,
    });
    // Event triggers: UserService.activateUser + NotificationService.send + AuditService.write
    emit('DOCUMENT_APPROVED', { docId, reviewerId, reviewerLabel }, { source: 'document_service', userId: reviewerId });
    return ok({ docId, status: 'approved' });
  },

  async rejectDocument(docId: string, reason: string, reviewerId: string, reviewerLabel: string) {
    await delay(100);
    writeAudit({
      service: 'document_service', action: 'REJECT',
      entityId: docId, entityType: 'document',
      details: `Документ ${docId} отклонён: «${reason}»`,
      userId: reviewerId, userLabel: reviewerLabel,
    });
    emit('DOCUMENT_REJECTED', { docId, reason, reviewerId }, { source: 'document_service', userId: reviewerId });
    // Auto-trigger: request reupload
    emit('DOCUMENT_REUPLOAD_REQUESTED', { docId, reason }, { source: 'document_service', correlationId: `rej-${docId}` });
    return ok({ docId, status: 'rejected', reason });
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// FINANCE SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export const FinanceService = {
  async createPayment(orderId: string, amount: number, currency = 'RUB') {
    await delay(120);
    const paymentId = `PAY-${Date.now().toString(36).toUpperCase()}`;
    writeAudit({ service: 'finance_service', action: 'CREATE_PAYMENT', entityId: paymentId, entityType: 'payment', details: `Платёж ${paymentId}: ₽${amount} за заказ ${orderId}` });
    emit('PAYMENT_CREATED', { paymentId, orderId, amount, currency }, { source: 'finance_service' });
    return ok({ paymentId, orderId, amount, currency, status: 'pending' });
  },

  async processPayout(courierId: string, amount: number, period: string, initiatorId: string) {
    await delay(180);
    const payoutId = `PO-${Date.now().toString(36).toUpperCase()}`;
    writeAudit({ service: 'finance_service', action: 'PAYOUT', entityId: payoutId, entityType: 'payout', details: `Выплата ${payoutId}: ₽${amount} курьеру ${courierId} за ${period}`, userId: initiatorId });
    emit('PAYOUT_INITIATED', { payoutId, courierId, amount, period }, { source: 'finance_service' });
    return ok({ payoutId, courierId, amount, status: 'processing' });
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION SERVICE
// ─────────────────────────────────────────────────────────────────────────────

const _notifications: unknown[] = [];

export const NotificationService = {
  async send(to: string, channel: 'push' | 'email' | 'sms' | 'in_app', title: string, body: string, meta?: Record<string, unknown>) {
    await delay(50);
    const notifId = `notif-${Date.now().toString(36)}`;
    const notif = { id: notifId, to, channel, title, body, meta, sentAt: new Date().toISOString(), delivered: true };
    _notifications.unshift(notif);
    if (_notifications.length > 1000) _notifications.pop();
    writeAudit({ service: 'notification_service', action: 'SEND', entityId: notifId, entityType: 'notification', details: `[${channel.toUpperCase()}] → ${to}: «${title}»` });
    emit('NOTIFICATION_SENT', { notifId, to, channel, title }, { source: 'notification_service' });
    return ok(notif);
  },

  getRecent(limit = 20) {
    return _notifications.slice(0, limit);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// CHAT SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export const ChatService = {
  async createTicket(data: { userId: string; subject: string; body: string; priority: string }) {
    await delay(100);
    const ticketId = `TKT-${Date.now().toString(36).toUpperCase()}`;
    writeAudit({ service: 'chat_service', action: 'CREATE_TICKET', entityId: ticketId, entityType: 'ticket', details: `Тикет ${ticketId}: «${data.subject}»`, userId: data.userId });
    emit('TICKET_CREATED', { ticketId, ...data }, { source: 'chat_service' });
    // Auto-notify support team
    await NotificationService.send('support@pvz-platform.ru', 'email', `Новый тикет: ${data.subject}`, data.body, { ticketId, priority: data.priority });
    return ok({ ticketId, status: 'open', priority: data.priority });
  },

  async escalateTicket(ticketId: string, escalatedTo: string, reason: string, agentId: string) {
    await delay(80);
    writeAudit({ service: 'chat_service', action: 'ESCALATE', entityId: ticketId, entityType: 'ticket', details: `Тикет ${ticketId} эскалирован → ${escalatedTo}: ${reason}`, userId: agentId });
    emit('TICKET_ESCALATED', { ticketId, escalatedTo, reason, agentId }, { source: 'chat_service' });
    return ok({ ticketId, status: 'escalated', escalatedTo });
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT SERVICE — public log reader
// ─────────────────────────────────────────────────────────────────────────────

export const AuditService = {
  getAll(limit = 100): AuditEntry[] {
    return _auditLog.slice(0, limit);
  },

  getByService(service: string, limit = 50): AuditEntry[] {
    return _auditLog.filter(e => e.service === service).slice(0, limit);
  },

  getByEntity(entityId: string): AuditEntry[] {
    return _auditLog.filter(e => e.entityId === entityId);
  },

  getStats() {
    const byService: Record<string, number> = {};
    const byAction: Record<string, number> = {};
    for (const e of _auditLog) {
      byService[e.service] = (byService[e.service] ?? 0) + 1;
      byAction[e.action] = (byAction[e.action] ?? 0) + 1;
    }
    return { total: _auditLog.length, byService, byAction };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Event-driven side effects — wired here so services react to each other
// ─────────────────────────────────────────────────────────────────────────────

import { on } from './eventBus';

// DOCUMENT_APPROVED → activate user + send notification
on('DOCUMENT_APPROVED', async (event) => {
  const { docId, reviewerLabel } = event.payload as { docId: string; reviewerLabel: string };
  await NotificationService.send(
    'system',
    'in_app',
    '✅ Документ одобрен',
    `Документ ${docId} проверен и одобрен (${reviewerLabel}). Доступ восстановлен.`,
  );
});

// DOCUMENT_REJECTED → send reupload request notification
on('DOCUMENT_REJECTED', async (event) => {
  const { docId, reason } = event.payload as { docId: string; reason: string };
  await NotificationService.send(
    'system',
    'in_app',
    '❌ Документ отклонён',
    `Документ ${docId} отклонён: «${reason}». Загрузите новый файл.`,
  );
});

// ORDER_DELIVERED → trigger finance payout
on('ORDER_DELIVERED', (event) => {
  const { orderId, courierId } = event.payload as { orderId: string; courierId: string };
  writeAudit({
    service: 'finance_service', action: 'AUTO_PAYMENT_TRIGGER',
    entityId: orderId, entityType: 'order',
    details: `Авто: платёж инициирован после доставки заказа ${orderId} курьером ${courierId}`,
  });
});

// COURIER_ONLINE → invalidate cache + notify dispatcher
on('COURIER_ONLINE', (event) => {
  const { courierId } = event.payload as { courierId: string };
  cache.invalidateByTag('couriers:online');
  writeAudit({
    service: 'courier_service', action: 'CACHE_INVALIDATED',
    entityId: courierId, entityType: 'courier',
    details: `Кэш activeCouriers инвалидирован — ${courierId} онлайн`,
  });
});
