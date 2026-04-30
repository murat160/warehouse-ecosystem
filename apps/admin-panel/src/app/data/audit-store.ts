/**
 * Lightweight in-memory audit log shared by RBAC, Users, and access-preview.
 *
 * Pages append entries via pushAudit(...); RBACManagement / SecurityAudit
 * read getAudit() for display. No persistence — resets on page reload,
 * same convention as the rest of the mock layer.
 */

export type AuditCategory =
  | 'role.create' | 'role.edit' | 'role.copy' | 'role.disable' | 'role.delete' | 'role.assign'
  | 'user.create' | 'user.edit' | 'user.block' | 'user.unblock' | 'user.delete'
  | 'user.role.change' | 'user.access.change' | 'user.access.copy' | 'user.access.reset'
  | 'user.perm.add'  | 'user.perm.remove'
  | 'user.doc.upload' | 'user.doc.approve' | 'user.doc.reject' | 'user.doc.download'
  | 'access.preview' | 'access.denied' | 'cabinet.change';

export interface AuditEvent {
  at:        string;
  actor:     string;
  actorRole: string;
  category:  AuditCategory;
  target?:   string;        // user / role being acted on
  detail?:   string;
}

const EVENTS: AuditEvent[] = [
  { at: '14.02.2026 09:00', actor: 'Супер Админ', actorRole: 'SuperAdmin', category: 'role.create',  target: 'ShowcaseManager', detail: 'Создана роль ShowcaseManager' },
  { at: '12.02.2026 14:30', actor: 'Супер Админ', actorRole: 'SuperAdmin', category: 'user.role.change', target: 'sidorov@platform.com', detail: 'Назначена роль Accountant' },
  { at: '01.02.2026 10:00', actor: 'Супер Админ', actorRole: 'SuperAdmin', category: 'role.create',  target: 'system', detail: 'Инициализирована RBAC матрица (17 ролей)' },
];

type Listener = () => void;
const listeners: Set<Listener> = new Set();

function nowStr(): string {
  return new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function pushAudit(event: Omit<AuditEvent, 'at'> & { at?: string }): AuditEvent {
  const e: AuditEvent = { at: event.at ?? nowStr(), ...event };
  EVENTS.unshift(e);
  for (const l of listeners) l();
  return e;
}

export function getAudit(): AuditEvent[] {
  return EVENTS;
}

export function subscribeAudit(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function audit(category: AuditCategory, target: string, detail: string,
                      actor = 'Супер Админ', actorRole = 'SuperAdmin') {
  return pushAudit({ category, target, detail, actor, actorRole });
}
