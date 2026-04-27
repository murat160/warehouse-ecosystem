import { prisma } from '../prisma.js';

interface AuditEntry {
  userId?: string | null;
  action: string;
  entity?: string;
  entityId?: string;
  payload?: Record<string, unknown>;
  ipAddress?: string;
}

export async function audit(entry: AuditEntry) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId ?? null,
        action: entry.action,
        entity: entry.entity ?? null,
        entityId: entry.entityId ?? null,
        payload: entry.payload ? JSON.stringify(entry.payload) : null,
        ipAddress: entry.ipAddress ?? null,
      },
    });
  } catch (err) {
    // Audit must never break the request flow.
    console.error('[audit] failed to write audit log', err);
  }
}
