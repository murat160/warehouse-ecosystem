import type { AuditEntry } from '../store/types';

const KEY = 'courier.audit';

function safeRead(): AuditEntry[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AuditEntry[]) : [];
  } catch { return []; }
}

function safeWrite(rows: AuditEntry[]) {
  try { window.localStorage.setItem(KEY, JSON.stringify(rows.slice(-200))); } catch {}
}

export function audit(actor: string, action: string, meta?: Record<string, unknown>) {
  const entry: AuditEntry = {
    id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    at: Date.now(),
    actor,
    action,
    meta,
  };
  const rows = safeRead();
  rows.push(entry);
  safeWrite(rows);
  if (typeof console !== 'undefined') console.info('[audit]', action, meta ?? {});
  return entry;
}

export function readAudit(): AuditEntry[] {
  return safeRead();
}
