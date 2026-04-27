// ─── Global Compliance Store ──────────────────────────────────────────────────
// Module-level reactive singleton — persists across navigation.
// DocumentsTab (CourierDetail) writes here on upload/replace/delete.
// DocumentCompliance reads from here — always fresh, always in sync.

import {
  COMPLIANCE_DOCS, COMPLIANCE_AUDIT,
  type ComplianceDoc, type ComplianceDocStatus,
  type ComplianceAuditEntry, type ComplianceAuditAction,
  type RejectReason, REJECT_REASONS, daysUntilExpiry,
} from '../data/compliance-mock';
import { addNotification } from './notificationsStore';

export type { ComplianceDoc, ComplianceDocStatus, ComplianceAuditEntry, ComplianceAuditAction, RejectReason };
export { REJECT_REASONS, daysUntilExpiry };

// ─── Source entity type ───────────────────────────────────────────────────────

export type EntityType = 'courier' | 'merchant' | 'pvz' | 'employee';

// ─── Store state (module-level, persists across mounts) ───────────────────────

const _docs: ComplianceDoc[] = [...COMPLIANCE_DOCS];
const _audit: ComplianceAuditEntry[] = [...COMPLIANCE_AUDIT];
const _listeners: Set<() => void> = new Set();

function _notify() {
  _listeners.forEach(fn => fn());
}

function nowTs() {
  return new Date().toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Public API — read ────────────────────────────────────────────────────────

export function getDocs(): ComplianceDoc[] {
  return [..._docs];
}

export function getAudit(): ComplianceAuditEntry[] {
  return [..._audit];
}

export function subscribe(fn: () => void): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

// ─── Public API — audit ───────────────────────────────────────────────────────

export function addAuditEntry(
  action: ComplianceAuditAction,
  docId: string,
  details: string,
  reviewerEmail = 'system',
  reviewerLabel = 'Система',
) {
  _audit.unshift({
    id: `ca-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    doc_id: docId,
    user: reviewerEmail,
    userLabel: reviewerLabel,
    action,
    timestamp: nowTs(),
    details,
  });
  _notify();
}

// ─── Public API — add document from any section ───────────────────────────────
// Called when courier/merchant/pvz uploads a new document anywhere in the app.

export function addDocToCompliance(doc: {
  id: string;
  entity_id: string;          // courier_id / merchant_id / pvz_id / employee_id
  entity_name: string;
  entity_email: string;
  entity_avatar: string;
  entity_type: EntityType;
  doc_name: string;
  doc_type: string;
  doc_type_label: string;
  format: string;
  size: string;
  file_url: string;
  issued_at: string | null;
  expires_at: string | null;
  is_mandatory?: boolean;
  blocks_work?: boolean;
  previewUrl?: string;
  uploaded_by?: string;
  version?: number;
}): ComplianceDoc {
  // Check if doc with same id already exists → update instead of add
  const existing = _docs.findIndex(d => d.id === doc.id);

  const days = doc.expires_at ? daysUntilExpiry(doc.expires_at) : null;
  let status: ComplianceDocStatus = 'pending_review';
  if (days !== null && days <= 0) status = 'expired';
  else if (days !== null && days <= 30) status = 'expiring_soon';

  const newDoc: ComplianceDoc = {
    id: doc.id,
    courier_id: doc.entity_id,
    courier_name: doc.entity_name,
    courier_email: doc.entity_email,
    courier_avatar: doc.entity_avatar,
    courier_blocked: false,
    doc_name: doc.doc_name,
    doc_type: doc.doc_type,
    doc_type_label: doc.doc_type_label,
    format: doc.format,
    size: doc.size,
    file_url: doc.file_url,
    uploaded_at: nowTs(),
    uploaded_by: doc.uploaded_by ?? 'admin@pvz-platform.ru',
    issued_at: doc.issued_at,
    expires_at: doc.expires_at,
    status,
    reviewed_by: null,
    reviewed_by_label: null,
    reviewed_at: null,
    reviewer_role: null,
    reject_reason: null,
    reject_comment: null,
    notified_60: false,
    notified_30: false,
    notified_7: false,
    notified_1: false,
    is_mandatory: doc.is_mandatory ?? false,
    blocks_work: doc.blocks_work ?? false,
    version: doc.version ?? 1,
    previewUrl: doc.previewUrl,
  };

  if (existing !== -1) {
    _docs[existing] = { ...newDoc, version: (_docs[existing].version ?? 1) + 1 };
  } else {
    _docs.unshift(newDoc);
  }

  addAuditEntry(
    'UPLOAD',
    doc.id,
    `Новый документ «${doc.doc_name}» (${doc.format.toUpperCase()}) от ${doc.entity_name} — ожидает проверки`,
  );

  // Notify global notification bell
  addNotification({
    id: `doc-upload-${doc.id}-${Date.now()}`,
    type: 'document_reupload_request',
    title: `Новый документ: ${doc.doc_name}`,
    body: `${doc.entity_name} · ожидает проверки`,
    fromId: 'system',
    fromName: doc.entity_name,
    fromRole: 'Участник',
    targetDept: 'Compliance',
    priority: 'normal',
    createdAt: nowTs(),
    read: false,
    comment: `Тип: ${doc.doc_type_label} · Формат: ${doc.format.toUpperCase()} · ${doc.size}`,
  });

  _notify();
  return _docs[existing !== -1 ? existing : 0];
}

// ─── Public API — remove document ────────────────────────────────────────────

export function removeDoc(id: string, reviewerLabel = 'Администратор') {
  const idx = _docs.findIndex(d => d.id === id);
  if (idx === -1) return;
  const doc = _docs[idx];
  addAuditEntry('REPLACE', id, `Документ «${doc.doc_name}» удалён. Пользователь: ${reviewerLabel}`);
  _docs.splice(idx, 1);
  _notify();
}

// ─── Public API — approve ─────────────────────────────────────────────────────

export function approveDoc(
  id: string,
  reviewerEmail: string,
  reviewerLabel: string,
  reviewerRole: string,
) {
  const doc = _docs.find(d => d.id === id);
  if (!doc) return;
  doc.status = 'approved';
  doc.courier_blocked = false;
  doc.reviewed_by = reviewerEmail;
  doc.reviewed_by_label = reviewerLabel;
  doc.reviewed_at = nowTs();
  doc.reviewer_role = reviewerRole;
  doc.reject_reason = null;
  doc.reject_comment = null;

  addAuditEntry('APPROVE', id, `«${doc.doc_name}» одобрен — ${doc.courier_name} активирован, ограничения сняты`, reviewerEmail, reviewerLabel);

  addNotification({
    id: `doc-approved-${id}-${Date.now()}`,
    type: 'document_approved',
    title: `Документ одобрен: ${doc.doc_name}`,
    body: `${doc.courier_name} — доступ к работе восстановлен`,
    fromId: reviewerEmail,
    fromName: reviewerLabel,
    fromRole: reviewerRole,
    targetDept: 'Compliance',
    priority: 'normal',
    createdAt: nowTs(),
    read: false,
  });

  _notify();
}

// ─── Public API — reject ──────────────────────────────────────────────────────

export function rejectDoc(
  id: string,
  reason: RejectReason,
  comment: string,
  reviewerEmail: string,
  reviewerLabel: string,
  reviewerRole: string,
) {
  const doc = _docs.find(d => d.id === id);
  if (!doc) return;
  const shouldBlock = doc.is_mandatory && doc.blocks_work;

  doc.status = 'rejected';
  if (shouldBlock) doc.courier_blocked = true;
  doc.reviewed_by = reviewerEmail;
  doc.reviewed_by_label = reviewerLabel;
  doc.reviewed_at = nowTs();
  doc.reviewer_role = reviewerRole;
  doc.reject_reason = reason;
  doc.reject_comment = comment;

  addAuditEntry('REJECT', id,
    `«${doc.doc_name}» отклонён: «${REJECT_REASONS[reason]}»${comment ? ` — ${comment.slice(0, 60)}` : ''}${shouldBlock ? ' [ДОСТУП ОГРАНИЧЕН]' : ''}`,
    reviewerEmail, reviewerLabel,
  );
  addAuditEntry('EMAIL_SENT', id, `Уведомление об отклонении отправлено на ${doc.courier_email}`, reviewerEmail, reviewerLabel);
  addAuditEntry('REQUEST_REUPLOAD', id, `Автозапрос повторной загрузки отправлен ${doc.courier_name}`, 'system', 'Система (авто)');

  addNotification({
    id: `doc-rejected-${id}-${Date.now()}`,
    type: 'document_rejected',
    title: `Документ отклонён: ${doc.doc_name}`,
    body: `${doc.courier_name} — ${REJECT_REASONS[reason]}${shouldBlock ? ' · Работа ограничена' : ''}`,
    fromId: reviewerEmail,
    fromName: reviewerLabel,
    fromRole: reviewerRole,
    targetDept: 'Compliance',
    priority: shouldBlock ? 'critical' : 'high',
    createdAt: nowTs(),
    read: false,
    comment: comment || REJECT_REASONS[reason],
  });

  addNotification({
    id: `doc-reupload-${id}-${Date.now() + 1}`,
    type: 'document_reupload_request',
    title: `Запрос повторной загрузки: ${doc.doc_name}`,
    body: `Автоматически отправлено ${doc.courier_name}`,
    fromId: 'system',
    fromName: 'Система (авто)',
    fromRole: 'AutoAction',
    targetDept: 'Compliance',
    priority: 'normal',
    createdAt: nowTs(),
    read: false,
  });

  _notify();
}

// ─── Public API — update doc status (used by expiry check) ───────────────────

export function updateDocStatus(id: string, status: ComplianceDocStatus, block = false) {
  const doc = _docs.find(d => d.id === id);
  if (!doc) return;
  doc.status = status;
  if (block) doc.courier_blocked = true;
  _notify();
}

// ─── Public API — request reupload ───────────────────────────────────────────

export function requestReupload(id: string, reviewerEmail: string, reviewerLabel: string, message: string) {
  const doc = _docs.find(d => d.id === id);
  if (!doc) return;
  addAuditEntry('REQUEST_REUPLOAD', id, `Запрос повторной загрузки отправлен ${doc.courier_name}`, reviewerEmail, reviewerLabel);
  addAuditEntry('EMAIL_SENT', id, `Email на ${doc.courier_email}: «${message.slice(0, 60)}...»`, reviewerEmail, reviewerLabel);

  addNotification({
    id: `doc-reupload-manual-${id}-${Date.now()}`,
    type: 'document_reupload_request',
    title: `Запрос повторной загрузки: ${doc.doc_name}`,
    body: `Отправлено ${doc.courier_name} · ${doc.courier_email}`,
    fromId: reviewerEmail,
    fromName: reviewerLabel,
    fromRole: 'Reviewer',
    targetDept: 'Compliance',
    priority: 'normal',
    createdAt: nowTs(),
    read: false,
  });

  _notify();
}

// ─── Public API — replace file ────────────────────────────────────────────────

export function replaceDocFile(
  id: string,
  fileName: string,
  fileSize: string,
  reviewerEmail: string,
  reviewerLabel: string,
) {
  const doc = _docs.find(d => d.id === id);
  if (!doc) return;
  const newVersion = (doc.version ?? 1) + 1;
  const ext = fileName.split('.').pop()?.toLowerCase() ?? doc.format;

  doc.doc_name = doc.doc_name.replace(/ \(версия \d+\)$/, '') + ` (версия ${newVersion})`;
  doc.format = ext;
  doc.size = fileSize;
  doc.version = newVersion;
  doc.uploaded_at = nowTs();
  doc.uploaded_by = reviewerEmail;
  doc.status = 'pending_review';
  doc.reviewed_by = null;
  doc.reviewed_by_label = null;
  doc.reviewed_at = null;
  doc.reviewer_role = null;
  doc.reject_reason = null;
  doc.reject_comment = null;

  addAuditEntry('REPLACE', id,
    `Файл заменён «${fileName}» — v${newVersion}, статус → На проверке`,
    reviewerEmail, reviewerLabel,
  );
  _notify();
}

// ─── Auto-expiry check ────────────────────────────────────────────────────────

export function runExpiryCheck(): number {
  let changed = 0;
  for (const doc of _docs) {
    if (!doc.expires_at) continue;
    if (doc.status === 'rejected' || doc.status === 'draft') continue;
    const days = daysUntilExpiry(doc.expires_at);
    if (days === null) continue;

    if (days <= 0 && doc.status !== 'expired') {
      const shouldBlock = doc.is_mandatory && doc.blocks_work;
      doc.status = 'expired';
      if (shouldBlock) doc.courier_blocked = true;

      addAuditEntry('EXPIRY_CHECK', doc.id,
        `«${doc.doc_name}» истёк (${doc.expires_at}) — статус → EXPIRED${shouldBlock ? `. ${doc.courier_name} ограничен в работе` : ''}`,
        'system', 'Система (авто)',
      );

      addNotification({
        id: `doc-exp-${doc.id}-${Date.now()}`,
        type: 'document_expired',
        title: `Документ истёк: ${doc.doc_name}`,
        body: `${doc.courier_name}${shouldBlock ? ' — доступ к работе ограничен' : ''}`,
        fromId: 'system',
        fromName: 'Система',
        fromRole: 'AutoChecker',
        targetDept: 'Compliance',
        priority: shouldBlock ? 'critical' : 'high',
        createdAt: nowTs(),
        read: false,
      });
      changed++;
    } else if (days > 0 && days <= 30 && doc.status === 'approved') {
      doc.status = 'expiring_soon';
      changed++;
    }
  }
  if (changed > 0) _notify();
  return changed;
}
