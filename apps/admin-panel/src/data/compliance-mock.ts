// ─── Courier Document Compliance — Mock Data ─────────────────────────────────

export type ComplianceDocStatus =
  | 'draft' | 'uploaded' | 'pending_review'
  | 'approved' | 'rejected' | 'expired' | 'replaced' | 'expiring_soon';

export type RejectReason =
  | 'unreadable' | 'wrong_type' | 'expired_doc'
  | 'incomplete' | 'data_mismatch' | 'fraud_suspicion' | 'other';

export type ComplianceAuditAction =
  | 'UPLOAD' | 'REPLACE' | 'APPROVE' | 'REJECT'
  | 'REQUEST_REUPLOAD' | 'DOWNLOAD' | 'EMAIL_SENT' | 'EXPIRY_CHECK' | 'VIEW';

export const REJECT_REASONS: Record<RejectReason, string> = {
  unreadable:      'Нечитаемый файл',
  wrong_type:      'Не тот тип документа',
  expired_doc:     'Истёк срок действия',
  incomplete:      'Неполный документ',
  data_mismatch:   'Несовпадают данные',
  fraud_suspicion: 'Подозрение на подделку',
  other:           'Другое',
};

export interface ReviewerInfo {
  id: string;
  name: string;
  email: string;
  role: 'document_reviewer' | 'courier_compliance_admin' | 'super_admin';
  roleLabel: string;
  avatar: string;
}

export interface ComplianceAuditEntry {
  id: string;
  doc_id: string;
  user: string;
  userLabel: string;
  action: ComplianceAuditAction;
  timestamp: string;
  details: string;
}

export interface ComplianceDoc {
  id: string;
  courier_id: string;
  courier_name: string;
  courier_email: string;
  courier_avatar: string;
  courier_blocked: boolean;
  doc_name: string;
  doc_type: string;
  doc_type_label: string;
  format: string;
  size: string;
  file_url: string;
  uploaded_at: string;
  uploaded_by: string;
  issued_at: string | null;
  expires_at: string | null;
  status: ComplianceDocStatus;
  // Review
  reviewed_by: string | null;
  reviewed_by_label: string | null;
  reviewed_at: string | null;
  reviewer_role: string | null;
  reject_reason: RejectReason | null;
  reject_comment: string | null;
  // Expiry notifications
  notified_60: boolean;
  notified_30: boolean;
  notified_7: boolean;
  notified_1: boolean;
  // Policy
  is_mandatory: boolean;
  blocks_work: boolean;
  // Version
  version: number;
  previewUrl?: string;
}

// ─── Reviewers ────────────────────────────────────────────────────────────────

export const REVIEWERS: ReviewerInfo[] = [
  {
    id: 'rev-001',
    name: 'Анна Петрова',
    email: 'a.petrova@pvz-platform.ru',
    role: 'document_reviewer',
    roleLabel: 'Document Reviewer',
    avatar: 'АП',
  },
  {
    id: 'rev-002',
    name: 'Дмитрий Орлов',
    email: 'd.orlov@pvz-platform.ru',
    role: 'courier_compliance_admin',
    roleLabel: 'Courier Compliance Admin',
    avatar: 'ДО',
  },
  {
    id: 'rev-003',
    name: 'Светлана Иванова',
    email: 's.ivanova@pvz-platform.ru',
    role: 'document_reviewer',
    roleLabel: 'Document Reviewer',
    avatar: 'СИ',
  },
  {
    id: 'rev-004',
    name: 'Алексей Суперадмин',
    email: 'admin@pvz-platform.ru',
    role: 'super_admin',
    roleLabel: 'Super Admin',
    avatar: 'АС',
  },
];

// ─── Mock Documents ───────────────────────────────────────────────────────────

export const COMPLIANCE_DOCS: ComplianceDoc[] = [
  // ── Pending Review ──
  {
    id: 'cd-001', courier_id: 'crr-001', courier_name: 'Алексей Смирнов', courier_email: 'smirnov@pvz.ru', courier_avatar: 'АС', courier_blocked: false,
    doc_name: 'Паспорт РФ — разворот', doc_type: 'passport', doc_type_label: 'Паспорт',
    format: 'pdf', size: '1.2 МБ', file_url: 'https://placehold.co/600x800/e2e8f0/475569?text=PDF',
    uploaded_at: '09.03.2026 14:22', uploaded_by: 'smirnov@pvz.ru',
    issued_at: '15.07.2019', expires_at: '15.07.2029',
    status: 'pending_review',
    reviewed_by: null, reviewed_by_label: null, reviewed_at: null, reviewer_role: null,
    reject_reason: null, reject_comment: null,
    notified_60: false, notified_30: false, notified_7: false, notified_1: false,
    is_mandatory: true, blocks_work: true, version: 1,
  },
  {
    id: 'cd-002', courier_id: 'crr-001', courier_name: 'Алексей Смирнов', courier_email: 'smirnov@pvz.ru', courier_avatar: 'АС', courier_blocked: false,
    doc_name: 'Медицинская справка', doc_type: 'medical', doc_type_label: 'Мед. справка',
    format: 'jpg', size: '0.8 МБ', file_url: 'https://placehold.co/600x800/e2e8f0/475569?text=JPG',
    uploaded_at: '09.03.2026 14:25', uploaded_by: 'smirnov@pvz.ru',
    issued_at: '01.02.2026', expires_at: '01.02.2027',
    status: 'pending_review',
    reviewed_by: null, reviewed_by_label: null, reviewed_at: null, reviewer_role: null,
    reject_reason: null, reject_comment: null,
    notified_60: false, notified_30: false, notified_7: false, notified_1: false,
    is_mandatory: true, blocks_work: false, version: 1,
  },
  {
    id: 'cd-003', courier_id: 'crr-002', courier_name: 'Мария Козлова', courier_email: 'kozlova@pvz.ru', courier_avatar: 'МК', courier_blocked: false,
    doc_name: 'Страховой полис ОСАГО', doc_type: 'insurance', doc_type_label: 'Страховка',
    format: 'pdf', size: '2.1 МБ', file_url: 'https://placehold.co/600x800/e2e8f0/475569?text=PDF',
    uploaded_at: '08.03.2026 09:10', uploaded_by: 'kozlova@pvz.ru',
    issued_at: '01.01.2026', expires_at: '01.01.2027',
    status: 'pending_review',
    reviewed_by: null, reviewed_by_label: null, reviewed_at: null, reviewer_role: null,
    reject_reason: null, reject_comment: null,
    notified_60: false, notified_30: false, notified_7: false, notified_1: false,
    is_mandatory: true, blocks_work: true, version: 2,
  },
  {
    id: 'cd-004', courier_id: 'crr-003', courier_name: 'Иван Новиков', courier_email: 'novikov@pvz.ru', courier_avatar: 'ИН', courier_blocked: false,
    doc_name: 'ВУ категории B', doc_type: 'license', doc_type_label: 'Водит. удост.',
    format: 'jpg', size: '0.6 МБ', file_url: 'https://placehold.co/600x800/e2e8f0/475569?text=JPG',
    uploaded_at: '08.03.2026 11:40', uploaded_by: 'novikov@pvz.ru',
    issued_at: '12.09.2018', expires_at: '12.09.2028',
    status: 'pending_review',
    reviewed_by: null, reviewed_by_label: null, reviewed_at: null, reviewer_role: null,
    reject_reason: null, reject_comment: null,
    notified_60: false, notified_30: false, notified_7: false, notified_1: false,
    is_mandatory: true, blocks_work: true, version: 1,
  },
  {
    id: 'cd-005', courier_id: 'crr-004', courier_name: 'Ольга Федорова', courier_email: 'fedorova@pvz.ru', courier_avatar: 'ОФ', courier_blocked: false,
    doc_name: 'Трудовой договор ГПД', doc_type: 'contract', doc_type_label: 'Договор',
    format: 'pdf', size: '1.8 МБ', file_url: 'https://placehold.co/600x800/e2e8f0/475569?text=PDF',
    uploaded_at: '07.03.2026 16:55', uploaded_by: 'hr@pvz-platform.ru',
    issued_at: '01.03.2026', expires_at: '01.03.2027',
    status: 'pending_review',
    reviewed_by: null, reviewed_by_label: null, reviewed_at: null, reviewer_role: null,
    reject_reason: null, reject_comment: null,
    notified_60: false, notified_30: false, notified_7: false, notified_1: false,
    is_mandatory: true, blocks_work: false, version: 1,
  },
  // ── Approved ──
  {
    id: 'cd-006', courier_id: 'crr-005', courier_name: 'Дмитрий Воронов', courier_email: 'voronov@pvz.ru', courier_avatar: 'ДВ', courier_blocked: false,
    doc_name: 'Паспорт РФ', doc_type: 'passport', doc_type_label: 'Паспорт',
    format: 'pdf', size: '1.1 МБ', file_url: 'https://placehold.co/600x800/e2e8f0/475569?text=PDF',
    uploaded_at: '01.03.2026 10:00', uploaded_by: 'voronov@pvz.ru',
    issued_at: '20.04.2020', expires_at: '20.04.2030',
    status: 'approved',
    reviewed_by: 'a.petrova@pvz-platform.ru', reviewed_by_label: 'Анна Петрова', reviewed_at: '02.03.2026 11:30', reviewer_role: 'Document Reviewer',
    reject_reason: null, reject_comment: null,
    notified_60: false, notified_30: false, notified_7: false, notified_1: false,
    is_mandatory: true, blocks_work: true, version: 1,
  },
  {
    id: 'cd-007', courier_id: 'crr-006', courier_name: 'Светлана Морозова', courier_email: 'morozova@pvz.ru', courier_avatar: 'СМ', courier_blocked: false,
    doc_name: 'ВУ категории B+C', doc_type: 'license', doc_type_label: 'Водит. удост.',
    format: 'jpg', size: '0.9 МБ', file_url: 'https://placehold.co/600x800/e2e8f0/475569?text=JPG',
    uploaded_at: '25.02.2026 08:45', uploaded_by: 'morozova@pvz.ru',
    issued_at: '05.06.2017', expires_at: '05.06.2027',
    status: 'approved',
    reviewed_by: 'd.orlov@pvz-platform.ru', reviewed_by_label: 'Дмитрий Орлов', reviewed_at: '26.02.2026 09:15', reviewer_role: 'Compliance Admin',
    reject_reason: null, reject_comment: null,
    notified_60: false, notified_30: false, notified_7: false, notified_1: false,
    is_mandatory: true, blocks_work: true, version: 1,
  },
  // ── Rejected ──
  {
    id: 'cd-008', courier_id: 'crr-007', courier_name: 'Андрей Лебедев', courier_email: 'lebedev@pvz.ru', courier_avatar: 'АЛ', courier_blocked: false,
    doc_name: 'Медицинская справка', doc_type: 'medical', doc_type_label: 'Мед. справка',
    format: 'jpg', size: '0.3 МБ', file_url: 'https://placehold.co/600x800/e2e8f0/475569?text=JPG',
    uploaded_at: '04.03.2026 13:20', uploaded_by: 'lebedev@pvz.ru',
    issued_at: '01.01.2025', expires_at: '01.01.2026',
    status: 'rejected',
    reviewed_by: 'a.petrova@pvz-platform.ru', reviewed_by_label: 'Анна Петрова', reviewed_at: '05.03.2026 10:45', reviewer_role: 'Document Reviewer',
    reject_reason: 'expired_doc', reject_comment: 'Срок справки истёк 01.01.2026. Необходимо предоставить актуальный документ за 2026 год.',
    notified_60: true, notified_30: true, notified_7: true, notified_1: false,
    is_mandatory: true, blocks_work: false, version: 1,
  },
  {
    id: 'cd-009', courier_id: 'crr-008', courier_name: 'Елена Захарова', courier_email: 'zaharova@pvz.ru', courier_avatar: 'ЕЗ', courier_blocked: false,
    doc_name: 'Паспорт РФ — копия', doc_type: 'passport', doc_type_label: 'Паспорт',
    format: 'jpg', size: '0.2 МБ', file_url: 'https://placehold.co/600x800/e2e8f0/475569?text=JPG',
    uploaded_at: '03.03.2026 17:10', uploaded_by: 'zaharova@pvz.ru',
    issued_at: null, expires_at: '10.11.2028',
    status: 'rejected',
    reviewed_by: 's.ivanova@pvz-platform.ru', reviewed_by_label: 'Светлана Иванова', reviewed_at: '04.03.2026 09:00', reviewer_role: 'Document Reviewer',
    reject_reason: 'unreadable', reject_comment: 'Изображение слишком тёмное, серия и номер нечитаемы. Загрузите чёткое фото при хорошем освещении.',
    notified_60: false, notified_30: false, notified_7: false, notified_1: false,
    is_mandatory: true, blocks_work: true, version: 1,
  },
  {
    id: 'cd-010', courier_id: 'crr-009', courier_name: 'Павел Николаев', courier_email: 'nikolaev@pvz.ru', courier_avatar: 'ПН', courier_blocked: false,
    doc_name: 'Страховой полис', doc_type: 'insurance', doc_type_label: 'Страховка',
    format: 'pdf', size: '1.4 МБ', file_url: 'https://placehold.co/600x800/e2e8f0/475569?text=PDF',
    uploaded_at: '02.03.2026 12:00', uploaded_by: 'nikolaev@pvz.ru',
    issued_at: '01.01.2026', expires_at: '31.12.2026',
    status: 'rejected',
    reviewed_by: 'd.orlov@pvz-platform.ru', reviewed_by_label: 'Дмитрий Орлов', reviewed_at: '03.03.2026 14:20', reviewer_role: 'Compliance Admin',
    reject_reason: 'data_mismatch', reject_comment: 'ФИО в полисе не совпадает с данными курьера. Уточните документ у страховой компании.',
    notified_60: false, notified_30: false, notified_7: false, notified_1: false,
    is_mandatory: true, blocks_work: true, version: 1,
  },
  // ── Expiring Soon ──
  {
    id: 'cd-011', courier_id: 'crr-010', courier_name: 'Наталья Кузнецова', courier_email: 'kuznetsova@pvz.ru', courier_avatar: 'НК', courier_blocked: false,
    doc_name: 'ВУ категории B', doc_type: 'license', doc_type_label: 'Водит. удост.',
    format: 'pdf', size: '0.7 МБ', file_url: 'https://placehold.co/600x800/e2e8f0/475569?text=PDF',
    uploaded_at: '15.01.2026 09:00', uploaded_by: 'kuznetsova@pvz.ru',
    issued_at: '20.03.2016', expires_at: '20.03.2026',
    status: 'expiring_soon',
    reviewed_by: 'a.petrova@pvz-platform.ru', reviewed_by_label: 'Анна Петрова', reviewed_at: '16.01.2026 10:00', reviewer_role: 'Document Reviewer',
    reject_reason: null, reject_comment: null,
    notified_60: true, notified_30: true, notified_7: false, notified_1: false,
    is_mandatory: true, blocks_work: true, version: 1,
  },
  {
    id: 'cd-012', courier_id: 'crr-011', courier_name: 'Роман Степанов', courier_email: 'stepanov@pvz.ru', courier_avatar: 'РС', courier_blocked: false,
    doc_name: 'Медицинская справка', doc_type: 'medical', doc_type_label: 'Мед. справка',
    format: 'pdf', size: '0.5 МБ', file_url: 'https://placehold.co/600x800/e2e8f0/475569?text=PDF',
    uploaded_at: '10.02.2026 14:30', uploaded_by: 'stepanov@pvz.ru',
    issued_at: '10.02.2025', expires_at: '25.03.2026',
    status: 'expiring_soon',
    reviewed_by: 's.ivanova@pvz-platform.ru', reviewed_by_label: 'Светлана Иванова', reviewed_at: '11.02.2026 09:00', reviewer_role: 'Document Reviewer',
    reject_reason: null, reject_comment: null,
    notified_60: true, notified_30: true, notified_7: false, notified_1: false,
    is_mandatory: true, blocks_work: false, version: 1,
  },
  // ── Expired ──
  {
    id: 'cd-013', courier_id: 'crr-012', courier_name: 'Виктор Антонов', courier_email: 'antonov@pvz.ru', courier_avatar: 'ВА', courier_blocked: true,
    doc_name: 'Паспорт РФ', doc_type: 'passport', doc_type_label: 'Паспорт',
    format: 'pdf', size: '1.3 МБ', file_url: 'https://placehold.co/600x800/e2e8f0/475569?text=PDF',
    uploaded_at: '01.06.2023 10:00', uploaded_by: 'antonov@pvz.ru',
    issued_at: '01.06.2013', expires_at: '01.06.2023',
    status: 'expired',
    reviewed_by: 'd.orlov@pvz-platform.ru', reviewed_by_label: 'Дмитрий Орлов', reviewed_at: '02.06.2023 11:00', reviewer_role: 'Compliance Admin',
    reject_reason: null, reject_comment: null,
    notified_60: true, notified_30: true, notified_7: true, notified_1: true,
    is_mandatory: true, blocks_work: true, version: 1,
  },
  {
    id: 'cd-014', courier_id: 'crr-013', courier_name: 'Юлия Семёнова', courier_email: 'semenova@pvz.ru', courier_avatar: 'ЮС', courier_blocked: false,
    doc_name: 'Страховой полис', doc_type: 'insurance', doc_type_label: 'Страховка',
    format: 'pdf', size: '1.0 МБ', file_url: 'https://placehold.co/600x800/e2e8f0/475569?text=PDF',
    uploaded_at: '01.01.2025 09:00', uploaded_by: 'semenova@pvz.ru',
    issued_at: '01.01.2025', expires_at: '01.01.2026',
    status: 'expired',
    reviewed_by: 'a.petrova@pvz-platform.ru', reviewed_by_label: 'Анна Петрова', reviewed_at: '02.01.2025 10:00', reviewer_role: 'Document Reviewer',
    reject_reason: null, reject_comment: null,
    notified_60: true, notified_30: true, notified_7: true, notified_1: true,
    is_mandatory: true, blocks_work: true, version: 1,
  },
  // ── Replaced ──
  {
    id: 'cd-015', courier_id: 'crr-014', courier_name: 'Артём Фролов', courier_email: 'frolov@pvz.ru', courier_avatar: 'АФ', courier_blocked: false,
    doc_name: 'Мед. справка (версия 2)', doc_type: 'medical', doc_type_label: 'Мед. справка',
    format: 'pdf', size: '0.9 МБ', file_url: 'https://placehold.co/600x800/e2e8f0/475569?text=PDF',
    uploaded_at: '06.03.2026 08:15', uploaded_by: 'frolov@pvz.ru',
    issued_at: '01.03.2026', expires_at: '01.03.2027',
    status: 'pending_review',
    reviewed_by: null, reviewed_by_label: null, reviewed_at: null, reviewer_role: null,
    reject_reason: null, reject_comment: null,
    notified_60: false, notified_30: false, notified_7: false, notified_1: false,
    is_mandatory: true, blocks_work: false, version: 2,
  },
];

export const COMPLIANCE_AUDIT: ComplianceAuditEntry[] = [
  { id: 'ca-001', doc_id: 'cd-006', user: 'a.petrova@pvz-platform.ru', userLabel: 'Анна Петрова', action: 'APPROVE', timestamp: '02.03.2026 11:30', details: 'Паспорт РФ одобрен — документ читаем, данные совпадают' },
  { id: 'ca-002', doc_id: 'cd-008', user: 'a.petrova@pvz-platform.ru', userLabel: 'Анна Петрова', action: 'REJECT', timestamp: '05.03.2026 10:45', details: 'Мед. справка отклонена: «Истёк срок действия»' },
  { id: 'ca-003', doc_id: 'cd-009', user: 's.ivanova@pvz-platform.ru', userLabel: 'Светлана Иванова', action: 'REJECT', timestamp: '04.03.2026 09:00', details: 'Паспорт отклонён: «Нечитаемый файл» — тёмное фото' },
  { id: 'ca-004', doc_id: 'cd-010', user: 'd.orlov@pvz-platform.ru', userLabel: 'Дмитрий Орлов', action: 'REJECT', timestamp: '03.03.2026 14:20', details: 'Страховой полис отклонён: «Несовпадают данные»' },
  { id: 'ca-005', doc_id: 'cd-011', user: 'system', userLabel: 'Система', action: 'EXPIRY_CHECK', timestamp: '08.03.2026 00:00', details: 'Уведомление за 30 дней отправлено: ВУ курьера Кузнецовой истекает 20.03.2026' },
  { id: 'ca-006', doc_id: 'cd-007', user: 'd.orlov@pvz-platform.ru', userLabel: 'Дмитрий Орлов', action: 'APPROVE', timestamp: '26.02.2026 09:15', details: 'ВУ одобрено — документ действителен до 05.06.2027' },
  { id: 'ca-007', doc_id: 'cd-008', user: 'a.petrova@pvz-platform.ru', userLabel: 'Анна Петрова', action: 'REQUEST_REUPLOAD', timestamp: '05.03.2026 10:50', details: 'Курьеру Лебедеву отправлено уведомление — загрузите актуальную справку 2026' },
  { id: 'ca-008', doc_id: 'cd-013', user: 'system', userLabel: 'Система', action: 'EXPIRY_CHECK', timestamp: '01.03.2026 00:00', details: 'Паспорт курьера Антонова истёк 01.06.2023 — статус изменён на EXPIRED, работа ограничена' },
];

// ─── KPIs helper ─────────────────────────────────────────────────────────────

export function getComplianceKPIs(docs: ComplianceDoc[]) {
  return {
    pending:       docs.filter(d => d.status === 'pending_review').length,
    approved:      docs.filter(d => d.status === 'approved').length,
    rejected:      docs.filter(d => d.status === 'rejected').length,
    expiring_soon: docs.filter(d => d.status === 'expiring_soon').length,
    expired:       docs.filter(d => d.status === 'expired').length,
    blocked:       docs.filter(d => d.courier_blocked).length,
    total:         docs.length,
    mandatoryFail: docs.filter(d => d.is_mandatory && (d.status === 'rejected' || d.status === 'expired')).length,
  };
}

// ─── Expiry notification thresholds ──────────────────────────────────────────

export const EXPIRY_THRESHOLDS = [60, 30, 7, 1]; // days before expiry

export function daysUntilExpiry(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const parts = expiresAt.split('.');
  if (parts.length !== 3) return null;
  const d = new Date(+parts[2], +parts[1] - 1, +parts[0]);
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}
