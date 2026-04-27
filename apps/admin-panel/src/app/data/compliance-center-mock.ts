// ─── Global Document Compliance Center — Mock Data ────────────────────────────
// Aggregates documents from ALL platform sources:
// Couriers (Fast Delivery), Couriers (Warehouse), Sellers, PVZ, Employees

import { ComplianceDocStatus, RejectReason, REJECT_REASONS, daysUntilExpiry } from './compliance-mock';
export { REJECT_REASONS, daysUntilExpiry };
export type { ComplianceDocStatus, RejectReason };

// ─── Owner Types ──────────────────────────────────────────────────────────────

export type OwnerType =
  | 'COURIER_FAST'
  | 'COURIER_WAREHOUSE'
  | 'SELLER'
  | 'PVZ'
  | 'EMPLOYEE';

export const OWNER_TYPE_LABELS: Record<OwnerType, string> = {
  COURIER_FAST:      'Курьер (Fast)',
  COURIER_WAREHOUSE: 'Курьер (Склад)',
  SELLER:            'Продавец',
  PVZ:               'ПВЗ',
  EMPLOYEE:          'Сотрудник',
};

export const OWNER_TYPE_COLORS: Record<OwnerType, { bg: string; text: string; border: string; dot: string }> = {
  COURIER_FAST:      { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   dot: 'bg-blue-400' },
  COURIER_WAREHOUSE: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-400' },
  SELLER:            { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  dot: 'bg-green-400' },
  PVZ:               { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-400' },
  EMPLOYEE:          { bg: 'bg-gray-100',  text: 'text-gray-700',   border: 'border-gray-300',   dot: 'bg-gray-400' },
};

// ─── Document Schema ──────────────────────────────────────────────────────────

export interface GlobalComplianceDoc {
  id: string;
  // ── Owner ─────────────────────────────────────────────────────────────────
  owner_type:    OwnerType;
  owner_id:      string;
  owner_name:    string;
  owner_email:   string;
  owner_avatar:  string;   // 2-letter initials
  owner_blocked: boolean;
  // ── Document ──────────────────────────────────────────────────────────────
  doc_name:       string;
  doc_type:       string;
  doc_type_label: string;
  file_url:       string;
  file_type:      string;  // pdf | jpg | png | webp | docx | zip
  size:           string;
  // ── Lifecycle ─────────────────────────────────────────────────────────────
  uploaded_by: string;     // email of uploader
  uploaded_at: string;
  issued_at:   string | null;
  expires_at:  string | null;
  status:      ComplianceDocStatus;
  // ── Review ────────────────────────────────────────────────────────────────
  reviewed_by:       string | null;
  reviewed_by_label: string | null;
  reviewed_at:       string | null;
  reviewer_role:     string | null;
  review_comment:    string | null;
  reject_reason:     RejectReason | null;
  reject_comment:    string | null;
  // ── Policy ────────────────────────────────────────────────────────────────
  is_mandatory: boolean;
  blocks_work:  boolean;
  // ── Version ───────────────────────────────────────────────────────────────
  version: number;
  // ── Notifications sent ────────────────────────────────────────────────────
  notified_60: boolean;
  notified_30: boolean;
  notified_7:  boolean;
  notified_1:  boolean;
  // ── Preview (base64 data URL — persists across navigation) ───────────────
  previewUrl?: string;
}

// ─── Audit Schema ─────────────────────────────────────────────────────────────

export type GlobalAuditAction =
  | 'UPLOAD' | 'REPLACE' | 'APPROVE' | 'REJECT'
  | 'REQUEST_REUPLOAD' | 'DOWNLOAD' | 'EMAIL_SENT'
  | 'EXPIRY_CHECK' | 'VIEW' | 'DELETE' | 'STATUS_CHANGE';

export interface GlobalAuditEntry {
  id:         string;
  doc_id:     string;
  owner_type: OwnerType;
  owner_name: string;
  user:       string;
  userLabel:  string;
  action:     GlobalAuditAction;
  timestamp:  string;
  details:    string;
}

// ─── Global Compliance Documents ─────────────────────────────────────────────

export const GLOBAL_COMPLIANCE_DOCS: GlobalComplianceDoc[] = [

  // ════════════════════════════════════════════════════════════════════════════
  // COURIER_FAST — Fast Delivery couriers
  // ════════════════════════════════════════════════════════════════════════════

  {
    id: 'gc-001',
    owner_type: 'COURIER_FAST', owner_id: 'crr-f01',
    owner_name: 'Сергей Волков', owner_email: 'volkov@pvz.ru', owner_avatar: 'СВ', owner_blocked: false,
    doc_name: 'Паспорт РФ — разворот', doc_type: 'passport', doc_type_label: 'Паспорт',
    file_url: 'https://placehold.co/600x800/e2e8f0/475569?text=PDF',
    file_type: 'pdf', size: '1.2 МБ',
    uploaded_by: 'volkov@pvz.ru', uploaded_at: '10.03.2026 09:15',
    issued_at: '12.06.2020', expires_at: '12.06.2030',
    status: 'pending_review',
    reviewed_by: null, reviewed_by_label: null, reviewed_at: null, reviewer_role: null,
    review_comment: null, reject_reason: null, reject_comment: null,
    is_mandatory: true, blocks_work: true, version: 1,
    notified_60: false, notified_30: false, notified_7: false, notified_1: false,
  },
  {
    id: 'gc-002',
    owner_type: 'COURIER_FAST', owner_id: 'crr-f02',
    owner_name: 'Анна Морозова', owner_email: 'morozova@pvz.ru', owner_avatar: 'АМ', owner_blocked: false,
    doc_name: 'Водительское удостоверение кат. B', doc_type: 'license', doc_type_label: 'Водит. удост.',
    file_url: 'https://placehold.co/600x800/e2e8f0/475569?text=JPG',
    file_type: 'jpg', size: '0.7 МБ',
    uploaded_by: 'morozova@pvz.ru', uploaded_at: '09.03.2026 14:40',
    issued_at: '05.09.2019', expires_at: '05.09.2029',
    status: 'pending_review',
    reviewed_by: null, reviewed_by_label: null, reviewed_at: null, reviewer_role: null,
    review_comment: null, reject_reason: null, reject_comment: null,
    is_mandatory: true, blocks_work: true, version: 1,
    notified_60: false, notified_30: false, notified_7: false, notified_1: false,
  },
  {
    id: 'gc-003',
    owner_type: 'COURIER_FAST', owner_id: 'crr-f03',
    owner_name: 'Дмитрий Антонов', owner_email: 'antonov.d@pvz.ru', owner_avatar: 'ДА', owner_blocked: false,
    doc_name: 'Медицинская справка', doc_type: 'medical', doc_type_label: 'Мед. справка',
    file_url: 'https://placehold.co/600x800/e2e8f0/475569?text=PDF',
    file_type: 'pdf', size: '0.8 МБ',
    uploaded_by: 'antonov.d@pvz.ru', uploaded_at: '01.02.2026 10:00',
    issued_at: '28.01.2026', expires_at: '28.01.2027',
    status: 'approved',
    reviewed_by: 'a.petrova@pvz-platform.ru', reviewed_by_label: 'Анна Петрова',
    reviewed_at: '03.02.2026 11:20', reviewer_role: 'Document Reviewer',
    review_comment: 'Справка актуальна, данные совпадают', reject_reason: null, reject_comment: null,
    is_mandatory: true, blocks_work: false, version: 1,
    notified_60: false, notified_30: false, notified_7: false, notified_1: false,
  },
  {
    id: 'gc-004',
    owner_type: 'COURIER_FAST', owner_id: 'crr-f04',
    owner_name: 'Ольга Белова', owner_email: 'belova@pvz.ru', owner_avatar: 'ОБ', owner_blocked: false,
    doc_name: 'Страховой полис ОСАГО', doc_type: 'insurance', doc_type_label: 'Страховка',
    file_url: 'https://placehold.co/600x800/e2e8f0/475569?text=JPG',
    file_type: 'jpg', size: '0.3 МБ',
    uploaded_by: 'belova@pvz.ru', uploaded_at: '05.03.2026 16:00',
    issued_at: '01.01.2026', expires_at: '01.01.2027',
    status: 'rejected',
    reviewed_by: 'd.orlov@pvz-platform.ru', reviewed_by_label: 'Дмитрий Орлов',
    reviewed_at: '06.03.2026 09:30', reviewer_role: 'Compliance Admin',
    review_comment: null,
    reject_reason: 'unreadable',
    reject_comment: 'Изображение нечёткое, полис нечитаем. Загрузите чёткое фото или скан.',
    is_mandatory: true, blocks_work: true, version: 1,
    notified_60: false, notified_30: false, notified_7: false, notified_1: false,
  },
  {
    id: 'gc-005',
    owner_type: 'COURIER_FAST', owner_id: 'crr-f05',
    owner_name: 'Игорь Смирнов', owner_email: 'smirnov.i@pvz.ru', owner_avatar: 'ИС', owner_blocked: false,
    doc_name: 'Водительское удостоверение кат. B', doc_type: 'license', doc_type_label: 'Водит. удост.',
    file_url: 'https://placehold.co/600x800/e2e8f0/475569?text=PDF',
    file_type: 'pdf', size: '0.6 МБ',
    uploaded_by: 'smirnov.i@pvz.ru', uploaded_at: '15.01.2026 08:00',
    issued_at: '18.03.2016', expires_at: '18.03.2026',
    status: 'expiring_soon',
    reviewed_by: 'a.petrova@pvz-platform.ru', reviewed_by_label: 'Анна Петрова',
    reviewed_at: '16.01.2026 10:00', reviewer_role: 'Document Reviewer',
    review_comment: 'Одобрено, но истекает 18.03.2026', reject_reason: null, reject_comment: null,
    is_mandatory: true, blocks_work: true, version: 1,
    notified_60: true, notified_30: true, notified_7: false, notified_1: false,
  },
  {
    id: 'gc-006',
    owner_type: 'COURIER_FAST', owner_id: 'crr-f06',
    owner_name: 'Татьяна Громова', owner_email: 'gromova@pvz.ru', owner_avatar: 'ТГ', owner_blocked: true,
    doc_name: 'Паспорт РФ', doc_type: 'passport', doc_type_label: 'Паспорт',
    file_url: 'https://placehold.co/600x800/e2e8f0/475569?text=PDF',
    file_type: 'pdf', size: '1.5 МБ',
    uploaded_by: 'gromova@pvz.ru', uploaded_at: '01.12.2022 10:00',
    issued_at: '01.12.2012', expires_at: '01.12.2022',
    status: 'expired',
    reviewed_by: 's.ivanova@pvz-platform.ru', reviewed_by_label: 'Светлана Иванова',
    reviewed_at: '02.12.2022 12:00', reviewer_role: 'Document Reviewer',
    review_comment: null, reject_reason: null, reject_comment: null,
    is_mandatory: true, blocks_work: true, version: 1,
    notified_60: true, notified_30: true, notified_7: true, notified_1: true,
  },
  {
    id: 'gc-007',
    owner_type: 'COURIER_FAST', owner_id: 'crr-f07',
    owner_name: 'Максим Кириллов', owner_email: 'kirillov@pvz.ru', owner_avatar: 'МК', owner_blocked: false,
    doc_name: 'Трудовой договор ГПД', doc_type: 'contract', doc_type_label: 'Договор',
    file_url: 'https://placehold.co/600x800/e2e8f0/475569?text=PDF',
    file_type: 'pdf', size: '1.9 МБ',
    uploaded_by: 'hr@pvz-platform.ru', uploaded_at: '01.03.2026 09:00',
    issued_at: '01.03.2026', expires_at: '01.03.2027',
    status: 'pending_review',
    reviewed_by: null, reviewed_by_label: null, reviewed_at: null, reviewer_role: null,
    review_comment: null, reject_reason: null, reject_comment: null,
    is_mandatory: true, blocks_work: false, version: 1,
    notified_60: false, notified_30: false, notified_7: false, notified_1: false,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // COURIER_WAREHOUSE — Warehouse / склад couriers
  // ════════════════════════════════════════════════════════════════════════════

  {
    id: 'gc-008',
    owner_type: 'COURIER_WAREHOUSE', owner_id: 'crr-w01',
    owner_name: 'Алексей Николаев', owner_email: 'nikolaev.a@pvz.ru', owner_avatar: 'АН', owner_blocked: false,
    doc_name: 'Паспорт РФ — разворот', doc_type: 'passport', doc_type_label: 'Паспорт',
    file_url: 'https://placehold.co/600x800/e2e8f0/475569?text=PDF',
    file_type: 'pdf', size: '1.1 МБ',
    uploaded_by: 'nikolaev.a@pvz.ru', uploaded_at: '11.03.2026 08:30',
    issued_at: '20.08.2021', expires_at: '20.08.2031',
    status: 'pending_review',
    reviewed_by: null, reviewed_by_label: null, reviewed_at: null, reviewer_role: null,
    review_comment: null, reject_reason: null, reject_comment: null,
    is_mandatory: true, blocks_work: true, version: 1,
    notified_60: false, notified_30: false, notified_7: false, notified_1: false,
  },
  {
    id: 'gc-009',
    owner_type: 'COURIER_WAREHOUSE', owner_id: 'crr-w02',
    owner_name: 'Михаил Зайцев', owner_email: 'zaitsev@pvz.ru', owner_avatar: 'МЗ', owner_blocked: false,
    doc_name: 'Справка об отсутствии судимости', doc_type: 'criminal_check', doc_type_label: 'Справка',
    file_url: 'https://placehold.co/600x800/e2e8f0/475569?text=PDF',
    file_type: 'pdf', size: '0.5 МБ',
    uploaded_by: 'zaitsev@pvz.ru', uploaded_at: '15.02.2026 11:00',
    issued_at: '10.02.2026', expires_at: '10.02.2027',
    status: 'approved',
    reviewed_by: 'd.orlov@pvz-platform.ru', reviewed_by_label: 'Дмитрий Орлов',
    reviewed_at: '16.02.2026 14:00', reviewer_role: 'Compliance Admin',
    review_comment: 'Справка актуальна, оригинал получен', reject_reason: null, reject_comment: null,
    is_mandatory: true, blocks_work: true, version: 1,
    notified_60: false, notified_30: false, notified_7: false, notified_1: false,
  },
  {
    id: 'gc-010',
    owner_type: 'COURIER_WAREHOUSE', owner_id: 'crr-w03',
    owner_name: 'Ирина Попова', owner_email: 'popova@pvz.ru', owner_avatar: 'ИП', owner_blocked: false,
    doc_name: 'Водительское удостоверение кат. C', doc_type: 'license', doc_type_label: 'Водит. удост.',
    file_url: 'https://placehold.co/600x800/e2e8f0/475569?text=JPG',
    file_type: 'jpg', size: '0.9 МБ',
    uploaded_by: 'popova@pvz.ru', uploaded_at: '20.01.2026 09:00',
    issued_at: '14.05.2015', expires_at: '25.03.2026',
    status: 'expiring_soon',
    reviewed_by: 'a.petrova@pvz-platform.ru', reviewed_by_label: 'Анна Петрова',
    reviewed_at: '21.01.2026 10:00', reviewer_role: 'Document Reviewer',
    review_comment: null, reject_reason: null, reject_comment: null,
    is_mandatory: true, blocks_work: true, version: 1,
    notified_60: true, notified_30: true, notified_7: false, notified_1: false,
  },
  {
    id: 'gc-011',
    owner_type: 'COURIER_WAREHOUSE', owner_id: 'crr-w04',
    owner_name: 'Руслан Темиров', owner_email: 'temirov@pvz.ru', owner_avatar: 'РТ', owner_blocked: false,
    doc_name: 'Мед. справка (допуск к складу)', doc_type: 'medical', doc_type_label: 'Мед. справка',
    file_url: 'https://placehold.co/600x800/e2e8f0/475569?text=PDF',
    file_type: 'pdf', size: '0.7 МБ',
    uploaded_by: 'temirov@pvz.ru', uploaded_at: '05.03.2026 13:00',
    issued_at: '01.03.2026', expires_at: '01.03.2027',
    status: 'pending_review',
    reviewed_by: null, reviewed_by_label: null, reviewed_at: null, reviewer_role: null,
    review_comment: null, reject_reason: null, reject_comment: null,
    is_mandatory: true, blocks_work: false, version: 1,
    notified_60: false, notified_30: false, notified_7: false, notified_1: false,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // SELLER — Merchants / Продавцы
  // ════════════════════════════════════════════════════════════════════════════

  {
    id: 'gc-012',
    owner_type: 'SELLER', owner_id: 'slr-008',
    owner_name: 'ИП Цветочный Рай', owner_email: 'flowers@pvz.ru', owner_avatar: 'ЦР', owner_blocked: false,
    doc_name: 'Свидетельство о регистрации ИП', doc_type: 'registration', doc_type_label: 'Рег. свидетельство',
    file_url: 'https://placehold.co/600x800/e2e8f0/475569?text=PDF',
    file_type: 'pdf', size: '1.4 МБ',
    uploaded_by: 'flowers@pvz.ru', uploaded_at: '10.03.2026 11:00',
    issued_at: '15.06.2019', expires_at: null,
    status: 'pending_review',
    reviewed_by: null, reviewed_by_label: null, reviewed_at: null, reviewer_role: null,
    review_comment: null, reject_reason: null, reject_comment: null,
    is_mandatory: true, blocks_work: true, version: 1,
    notified_60: false, notified_30: false, notified_7: false, notified_1: false,
  },
  {
    id: 'gc-013',
    owner_type: 'SELLER', owner_id: 'slr-001',
    owner_name: 'TechStore MSK', owner_email: 'tech@techstore.ru', owner_avatar: 'ТС', owner_blocked: false,
    doc_name: 'Договор оферты платформы', doc_type: 'contract', doc_type_label: 'Договор',
    file_url: 'https://placehold.co/600x800/e2e8f0/475569?text=PDF',
    file_type: 'pdf', size: '2.2 МБ',
    uploaded_by: 'legal@pvz-platform.ru', uploaded_at: '01.01.2026 10:00',
    issued_at: '01.01.2026', expires_at: '01.01.2027',
    status: 'approved',
    reviewed_by: 'a.petrova@pvz-platform.ru', reviewed_by_label: 'Анна Петрова',
    reviewed_at: '02.01.2026 14:00', reviewer_role: 'Document Reviewer',
    review_comment: 'Договор подписан обеими сторонами', reject_reason: null, reject_comment: null,
    is_mandatory: true, blocks_work: false, version: 3,
    notified_60: false, notified_30: false, notified_7: false, notified_1: false,
  },
  {
    id: 'gc-014',
    owner_type: 'SELLER', owner_id: 'slr-005',
    owner_name: 'АО Мода+', owner_email: 'moda@modaplus.ru', owner_avatar: 'М+', owner_blocked: false,
    doc_name: 'Лицензия на торговлю', doc_type: 'license', doc_type_label: 'Лицензия',
    file_url: 'https://placehold.co/600x800/e2e8f0/475569?text=DOCX',
    file_type: 'docx', size: '0.4 МБ',
    uploaded_by: 'moda@modaplus.ru', uploaded_at: '07.03.2026 15:30',
    issued_at: '01.06.2023', expires_at: '01.06.2026',
    status: 'rejected',
    reviewed_by: 'd.orlov@pvz-platform.ru', reviewed_by_label: 'Дмитрий Орлов',
    reviewed_at: '08.03.2026 10:00', reviewer_role: 'Compliance Admin',
    review_comment: null,
    reject_reason: 'incomplete',
    reject_comment: 'Лицензия не содержит перечень разрешённых видов деятельности. Предоставьте полный документ.',
    is_mandatory: true, blocks_work: true, version: 1,
    notified_60: false, notified_30: false, notified_7: false, notified_1: false,
  },
  {
    id: 'gc-015',
    owner_type: 'SELLER', owner_id: 'slr-003',
    owner_name: 'Кофейная Фея', owner_email: 'coffee@feya.ru', owner_avatar: 'КФ', owner_blocked: false,
    doc_name: 'Сертификат СЭС (общепит)', doc_type: 'sanitary', doc_type_label: 'Сертификат СЭС',
    file_url: 'https://placehold.co/600x800/e2e8f0/475569?text=PDF',
    file_type: 'pdf', size: '1.0 МБ',
    uploaded_by: 'coffee@feya.ru', uploaded_at: '01.01.2025 09:00',
    issued_at: '01.01.2025', expires_at: '01.01.2026',
    status: 'expired',
    reviewed_by: 's.ivanova@pvz-platform.ru', reviewed_by_label: 'Светлана Иванова',
    reviewed_at: '02.01.2025 11:00', reviewer_role: 'Document Reviewer',
    review_comment: null, reject_reason: null, reject_comment: null,
    is_mandatory: true, blocks_work: true, version: 1,
    notified_60: true, notified_30: true, notified_7: true, notified_1: true,
  },
  {
    id: 'gc-016',
    owner_type: 'SELLER', owner_id: 'slr-010',
    owner_name: 'ООО СтройМатериалы', owner_email: 'stroy@sm.ru', owner_avatar: 'СМ', owner_blocked: false,
    doc_name: 'Договор поставки', doc_type: 'supply_contract', doc_type_label: 'Дог. поставки',
    file_url: 'https://placehold.co/600x800/e2e8f0/475569?text=PDF',
    file_type: 'pdf', size: '3.1 МБ',
    uploaded_by: 'stroy@sm.ru', uploaded_at: '08.03.2026 16:00',
    issued_at: '01.03.2026', expires_at: '01.03.2027',
    status: 'pending_review',
    reviewed_by: null, reviewed_by_label: null, reviewed_at: null, reviewer_role: null,
    review_comment: null, reject_reason: null, reject_comment: null,
    is_mandatory: false, blocks_work: false, version: 1,
    notified_60: false, notified_30: false, notified_7: false, notified_1: false,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // PVZ — Pickup & Delivery Points
  // ════════════════════════════════════════════════════════════════════════════

  {
    id: 'gc-017',
    owner_type: 'PVZ', owner_id: 'pvz-msk-001',
    owner_name: 'ПВЗ MSK-001 (Тверская)', owner_email: 'msk001@pvz.ru', owner_avatar: 'П1', owner_blocked: false,
    doc_name: 'Санитарно-эпидем. заключение', doc_type: 'sanitary', doc_type_label: 'СЭЗ',
    file_url: 'https://placehold.co/600x800/e2e8f0/475569?text=PDF',
    file_type: 'pdf', size: '0.9 МБ',
    uploaded_by: 'msk001@pvz.ru', uploaded_at: '09.03.2026 10:00',
    issued_at: '01.03.2026', expires_at: '01.03.2027',
    status: 'pending_review',
    reviewed_by: null, reviewed_by_label: null, reviewed_at: null, reviewer_role: null,
    review_comment: null, reject_reason: null, reject_comment: null,
    is_mandatory: true, blocks_work: true, version: 2,
    notified_60: false, notified_30: false, notified_7: false, notified_1: false,
  },
  {
    id: 'gc-018',
    owner_type: 'PVZ', owner_id: 'pvz-msk-002',
    owner_name: 'ПВЗ MSK-002 (Арбат)', owner_email: 'msk002@pvz.ru', owner_avatar: 'П2', owner_blocked: false,
    doc_name: 'Договор аренды помещения', doc_type: 'lease', doc_type_label: 'Договор аренды',
    file_url: 'https://placehold.co/600x800/e2e8f0/475569?text=PDF',
    file_type: 'pdf', size: '2.8 МБ',
    uploaded_by: 'admin@pvz-platform.ru', uploaded_at: '01.01.2026 09:00',
    issued_at: '01.01.2026', expires_at: '01.01.2027',
    status: 'approved',
    reviewed_by: 'd.orlov@pvz-platform.ru', reviewed_by_label: 'Дмитрий Орлов',
    reviewed_at: '02.01.2026 12:00', reviewer_role: 'Compliance Admin',
    review_comment: 'Договор действителен, соответствует стандартам', reject_reason: null, reject_comment: null,
    is_mandatory: true, blocks_work: false, version: 1,
    notified_60: false, notified_30: false, notified_7: false, notified_1: false,
  },
  {
    id: 'gc-019',
    owner_type: 'PVZ', owner_id: 'pvz-spb-003',
    owner_name: 'ПВЗ SPB-003 (Невский)', owner_email: 'spb003@pvz.ru', owner_avatar: 'СП', owner_blocked: false,
    doc_name: 'Лицензия на деятельность', doc_type: 'license', doc_type_label: 'Лицензия',
    file_url: 'https://placehold.co/600x800/e2e8f0/475569?text=PDF',
    file_type: 'pdf', size: '1.3 МБ',
    uploaded_by: 'spb003@pvz.ru', uploaded_at: '01.02.2026 08:00',
    issued_at: '01.04.2024', expires_at: '28.03.2026',
    status: 'expiring_soon',
    reviewed_by: 'a.petrova@pvz-platform.ru', reviewed_by_label: 'Анна Петрова',
    reviewed_at: '02.02.2026 09:00', reviewer_role: 'Document Reviewer',
    review_comment: null, reject_reason: null, reject_comment: null,
    is_mandatory: true, blocks_work: true, version: 1,
    notified_60: true, notified_30: true, notified_7: false, notified_1: false,
  },
  {
    id: 'gc-020',
    owner_type: 'PVZ', owner_id: 'pvz-msk-004',
    owner_name: 'ПВЗ MSK-004 (Дмитровская)', owner_email: 'msk004@pvz.ru', owner_avatar: 'П4', owner_blocked: false,
    doc_name: 'Сертификат пожарной безопасности', doc_type: 'fire_safety', doc_type_label: 'Пожар. сертификат',
    file_url: 'https://placehold.co/600x800/e2e8f0/475569?text=PDF',
    file_type: 'pdf', size: '0.6 МБ',
    uploaded_by: 'admin@pvz-platform.ru', uploaded_at: '10.03.2026 15:00',
    issued_at: '05.03.2026', expires_at: '05.03.2027',
    status: 'pending_review',
    reviewed_by: null, reviewed_by_label: null, reviewed_at: null, reviewer_role: null,
    review_comment: null, reject_reason: null, reject_comment: null,
    is_mandatory: true, blocks_work: false, version: 1,
    notified_60: false, notified_30: false, notified_7: false, notified_1: false,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // EMPLOYEE — Internal platform employees
  // ════════════════════════════════════════════════════════════════════════════

  {
    id: 'gc-021',
    owner_type: 'EMPLOYEE', owner_id: 'emp-001',
    owner_name: 'Козлова Елена', owner_email: 'kozlova@platform.com', owner_avatar: 'КЕ', owner_blocked: false,
    doc_name: 'Трудовой договор', doc_type: 'contract', doc_type_label: 'Договор',
    file_url: 'https://placehold.co/600x800/e2e8f0/475569?text=PDF',
    file_type: 'pdf', size: '1.7 МБ',
    uploaded_by: 'hr@pvz-platform.ru', uploaded_at: '25.01.2026 09:00',
    issued_at: '25.01.2026', expires_at: '25.01.2027',
    status: 'approved',
    reviewed_by: 'a.petrova@pvz-platform.ru', reviewed_by_label: 'Анна Петрова',
    reviewed_at: '26.01.2026 10:00', reviewer_role: 'Document Reviewer',
    review_comment: 'Договор подписан, копии в архиве', reject_reason: null, reject_comment: null,
    is_mandatory: true, blocks_work: false, version: 1,
    notified_60: false, notified_30: false, notified_7: false, notified_1: false,
  },
  {
    id: 'gc-022',
    owner_type: 'EMPLOYEE', owner_id: 'emp-004',
    owner_name: 'Сидоров Петр', owner_email: 'sidorov@platform.com', owner_avatar: 'СП', owner_blocked: false,
    doc_name: 'NDA / Соглашение о конфиденциальности', doc_type: 'nda', doc_type_label: 'NDA',
    file_url: 'https://placehold.co/600x800/e2e8f0/475569?text=PDF',
    file_type: 'pdf', size: '0.5 МБ',
    uploaded_by: 'sidorov@platform.com', uploaded_at: '10.03.2026 11:30',
    issued_at: '10.01.2026', expires_at: null,
    status: 'pending_review',
    reviewed_by: null, reviewed_by_label: null, reviewed_at: null, reviewer_role: null,
    review_comment: null, reject_reason: null, reject_comment: null,
    is_mandatory: true, blocks_work: false, version: 2,
    notified_60: false, notified_30: false, notified_7: false, notified_1: false,
  },
  {
    id: 'gc-023',
    owner_type: 'EMPLOYEE', owner_id: 'emp-006',
    owner_name: 'Новиков Сергей', owner_email: 'novikov@platform.com', owner_avatar: 'НС', owner_blocked: false,
    doc_name: 'Паспорт (копия для архива)', doc_type: 'passport', doc_type_label: 'Паспорт',
    file_url: 'https://placehold.co/600x800/e2e8f0/475569?text=JPG',
    file_type: 'jpg', size: '0.8 МБ',
    uploaded_by: 'novikov@platform.com', uploaded_at: '05.02.2026 14:00',
    issued_at: '10.10.2018', expires_at: '10.10.2028',
    status: 'rejected',
    reviewed_by: 'd.orlov@pvz-platform.ru', reviewed_by_label: 'Дмитрий Орлов',
    reviewed_at: '06.02.2026 09:30', reviewer_role: 'Compliance Admin',
    review_comment: null,
    reject_reason: 'data_mismatch',
    reject_comment: 'ФИО в паспорте не совпадает с HR-системой. Уточните данные.',
    is_mandatory: true, blocks_work: false, version: 1,
    notified_60: false, notified_30: false, notified_7: false, notified_1: false,
  },
  {
    id: 'gc-024',
    owner_type: 'EMPLOYEE', owner_id: 'emp-003',
    owner_name: 'Петрова Мария', owner_email: 'petrova@platform.com', owner_avatar: 'ПМ', owner_blocked: false,
    doc_name: 'Медицинская книжка', doc_type: 'medical', doc_type_label: 'Мед. книжка',
    file_url: 'https://placehold.co/600x800/e2e8f0/475569?text=PDF',
    file_type: 'pdf', size: '1.1 МБ',
    uploaded_by: 'hr@pvz-platform.ru', uploaded_at: '20.01.2026 10:00',
    issued_at: '10.01.2025', expires_at: '20.03.2026',
    status: 'expiring_soon',
    reviewed_by: 'a.petrova@pvz-platform.ru', reviewed_by_label: 'Анна Петрова',
    reviewed_at: '21.01.2026 11:00', reviewer_role: 'Document Reviewer',
    review_comment: null, reject_reason: null, reject_comment: null,
    is_mandatory: true, blocks_work: false, version: 1,
    notified_60: true, notified_30: true, notified_7: false, notified_1: false,
  },
];

// ─── Audit Log (initial entries) ────────────────────────────────────────────

export const GLOBAL_COMPLIANCE_AUDIT: GlobalAuditEntry[] = [
  {
    id: 'ga-001', doc_id: 'gc-003', owner_type: 'COURIER_FAST', owner_name: 'Дмитрий Антонов',
    user: 'a.petrova@pvz-platform.ru', userLabel: 'Анна Петрова',
    action: 'APPROVE', timestamp: '03.02.2026 11:20',
    details: 'Мед. справка курьера Антонова Д. одобрена — документ читаем, данные совпадают',
  },
  {
    id: 'ga-002', doc_id: 'gc-004', owner_type: 'COURIER_FAST', owner_name: 'Ольга Белова',
    user: 'd.orlov@pvz-platform.ru', userLabel: 'Дмитрий Орлов',
    action: 'REJECT', timestamp: '06.03.2026 09:30',
    details: 'Страховой полис Беловой О. отклонён: «Нечитаемый файл»',
  },
  {
    id: 'ga-003', doc_id: 'gc-004', owner_type: 'COURIER_FAST', owner_name: 'Ольга Белова',
    user: 'd.orlov@pvz-platform.ru', userLabel: 'Дмитрий Орлов',
    action: 'EMAIL_SENT', timestamp: '06.03.2026 09:31',
    details: 'Уведомление об отклонении отправлено на belova@pvz.ru',
  },
  {
    id: 'ga-004', doc_id: 'gc-005', owner_type: 'COURIER_FAST', owner_name: 'Игорь Смирнов',
    user: 'system', userLabel: 'Система',
    action: 'EXPIRY_CHECK', timestamp: '09.02.2026 00:00',
    details: 'ВУ курьера Смирнова И. истекает 18.03.2026 — уведомление за 30 дней отправлено',
  },
  {
    id: 'ga-005', doc_id: 'gc-013', owner_type: 'SELLER', owner_name: 'TechStore MSK',
    user: 'a.petrova@pvz-platform.ru', userLabel: 'Анна Петрова',
    action: 'APPROVE', timestamp: '02.01.2026 14:00',
    details: 'Договор оферты TechStore MSK одобрен — оригиналы получены',
  },
  {
    id: 'ga-006', doc_id: 'gc-014', owner_type: 'SELLER', owner_name: 'АО Мода+',
    user: 'd.orlov@pvz-platform.ru', userLabel: 'Дмитрий Орлов',
    action: 'REJECT', timestamp: '08.03.2026 10:00',
    details: 'Лицензия АО Мода+ отклонена: «Неполный документ»',
  },
  {
    id: 'ga-007', doc_id: 'gc-015', owner_type: 'SELLER', owner_name: 'Кофейная Фея',
    user: 'system', userLabel: 'Система',
    action: 'STATUS_CHANGE', timestamp: '02.01.2026 00:00',
    details: 'Сертификат СЭС «Кофейная Фея» истёк 01.01.2026 — статус изменён на EXPIRED, работа ограничена',
  },
  {
    id: 'ga-008', doc_id: 'gc-018', owner_type: 'PVZ', owner_name: 'ПВЗ MSK-002',
    user: 'd.orlov@pvz-platform.ru', userLabel: 'Дмитрий Орлов',
    action: 'APPROVE', timestamp: '02.01.2026 12:00',
    details: 'Договор аренды ПВЗ MSK-002 одобрен — договор действителен',
  },
  {
    id: 'ga-009', doc_id: 'gc-019', owner_type: 'PVZ', owner_name: 'ПВЗ SPB-003',
    user: 'system', userLabel: 'Система',
    action: 'EXPIRY_CHECK', timestamp: '09.02.2026 00:00',
    details: 'Лицензия ПВЗ SPB-003 истекает 28.03.2026 — уведомление за 30 дней отправлено',
  },
  {
    id: 'ga-010', doc_id: 'gc-021', owner_type: 'EMPLOYEE', owner_name: 'Козлова Елена',
    user: 'a.petrova@pvz-platform.ru', userLabel: 'Анна Петрова',
    action: 'APPROVE', timestamp: '26.01.2026 10:00',
    details: 'Трудовой договор Козловой Е. одобрен — копии в архиве',
  },
  {
    id: 'ga-011', doc_id: 'gc-023', owner_type: 'EMPLOYEE', owner_name: 'Новиков Сергей',
    user: 'd.orlov@pvz-platform.ru', userLabel: 'Дмитрий Орлов',
    action: 'REJECT', timestamp: '06.02.2026 09:30',
    details: 'Паспорт Новикова С. отклонён: «Несовпадают данные» — ФИО расходится с HR-системой',
  },
];

// ─── KPIs helper ──────────────────────────────────────────────────────────────

export function getGlobalKPIs(docs: GlobalComplianceDoc[]) {
  return {
    total:         docs.length,
    pending:       docs.filter(d => d.status === 'pending_review').length,
    approved:      docs.filter(d => d.status === 'approved').length,
    rejected:      docs.filter(d => d.status === 'rejected').length,
    expiring_soon: docs.filter(d => d.status === 'expiring_soon').length,
    expired:       docs.filter(d => d.status === 'expired').length,
    blocked:       docs.filter(d => d.owner_blocked).length,
    mandatoryFail: docs.filter(d => d.is_mandatory && (d.status === 'rejected' || d.status === 'expired')).length,
    byOwner: {
      COURIER_FAST:      docs.filter(d => d.owner_type === 'COURIER_FAST').length,
      COURIER_WAREHOUSE: docs.filter(d => d.owner_type === 'COURIER_WAREHOUSE').length,
      SELLER:            docs.filter(d => d.owner_type === 'SELLER').length,
      PVZ:               docs.filter(d => d.owner_type === 'PVZ').length,
      EMPLOYEE:          docs.filter(d => d.owner_type === 'EMPLOYEE').length,
    },
  };
}