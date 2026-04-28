/**
 * Legal mock data — single source for /admin/legal/* pages.
 *
 * Holds 4 collections (contracts, claims, disputes, complaints) + a
 * documents pool + audit log. Each collection has a `kind` so a single
 * <LegalCaseDrawer> can render any of them.
 *
 * In-memory mutable arrays are shared across pages so an action on one
 * page (e.g. mark contract as expired) reflects on /legal/reports next
 * mount — same convention as products-mock and foreign-delivery.
 */

export type CaseKind = 'contract' | 'claim' | 'dispute' | 'complaint';

export const CASE_KIND_LABELS: Record<CaseKind, string> = {
  contract:  'Договор',
  claim:     'Претензия',
  dispute:   'Спор',
  complaint: 'Жалоба',
};

export type CaseStatus =
  | 'draft' | 'open' | 'in_progress' | 'awaiting_docs'
  | 'pending_signature' | 'in_court' | 'resolved' | 'closed' | 'rejected' | 'expired';

export const CASE_STATUS_LABELS: Record<CaseStatus, { label: string; cls: string }> = {
  draft:             { label: 'Черновик',           cls: 'bg-slate-100 text-slate-700' },
  open:              { label: 'Открыто',            cls: 'bg-blue-100 text-blue-700'   },
  in_progress:       { label: 'В работе',           cls: 'bg-yellow-100 text-yellow-700' },
  awaiting_docs:     { label: 'Ждут документы',     cls: 'bg-orange-100 text-orange-700' },
  pending_signature: { label: 'На подписании',      cls: 'bg-indigo-100 text-indigo-700' },
  in_court:          { label: 'В суде',             cls: 'bg-red-100 text-red-700'       },
  resolved:          { label: 'Урегулировано',      cls: 'bg-green-100 text-green-700'   },
  closed:            { label: 'Закрыто',            cls: 'bg-green-100 text-green-700'   },
  rejected:          { label: 'Отклонено',          cls: 'bg-rose-100 text-rose-700'     },
  expired:           { label: 'Истёк',              cls: 'bg-gray-100 text-gray-600'     },
};

export type DocStatus = 'missing' | 'uploaded' | 'verified' | 'rejected';

export const LEGAL_DOC_STATUS: Record<DocStatus, { label: string; cls: string }> = {
  missing:  { label: 'Не загружен', cls: 'bg-gray-100 text-gray-600'    },
  uploaded: { label: 'Загружен',    cls: 'bg-blue-100 text-blue-700'    },
  verified: { label: 'Проверен',    cls: 'bg-green-100 text-green-700'  },
  rejected: { label: 'Отклонён',    cls: 'bg-red-100 text-red-700'      },
};

export type DocKind =
  | 'contract' | 'amendment' | 'invoice' | 'claim_letter' | 'response_letter'
  | 'court_filing' | 'court_decision' | 'evidence_photo' | 'evidence_doc'
  | 'merchant_doc' | 'customer_doc' | 'order_doc' | 'act' | 'note';

export const LEGAL_DOC_KIND_LABELS: Record<DocKind, string> = {
  contract:        'Договор',
  amendment:       'Доп. соглашение',
  invoice:         'Инвойс',
  claim_letter:    'Претензионное письмо',
  response_letter: 'Ответ на претензию',
  court_filing:    'Судебная подача',
  court_decision:  'Решение суда',
  evidence_photo:  'Фото-доказательство',
  evidence_doc:    'Документ-доказательство',
  merchant_doc:    'Документ продавца',
  customer_doc:    'Документ клиента',
  order_doc:       'Документ заказа',
  act:             'Акт',
  note:            'Служебная записка',
};

export interface LegalDoc {
  docId:      string;
  caseId?:    string;
  kind:       DocKind;
  filename:   string;
  uploadedBy: string;
  uploadedAt: string;
  status:     DocStatus;
  /** Mock: data URL, http URL, or empty (placeholder). */
  url:        string;
  comment?:   string;
}

export interface CaseAudit {
  at:     string;
  actor:  string;
  role:   string;
  action: string;
}

export interface CaseComment {
  at:     string;
  actor:  string;
  role:   string;
  text:   string;
}

export interface LegalCase {
  caseId:        string;
  kind:          CaseKind;
  number:        string;
  date:          string;
  /** Linked entity (counterparty / merchant / customer). */
  partner?:      string;
  partnerType?:  'merchant' | 'customer' | 'supplier' | 'courier';
  partnerId?:    string;
  /** Linked order/invoice. */
  orderId?:      string;
  subject:       string;
  description?:  string;
  /** TMT-equivalent for disputes/claims/contracts. */
  amount?:       number;
  currency?:     string;
  status:        CaseStatus;
  startedAt:     string;
  expiresAt?:    string;          // contracts
  closedAt?:     string;
  responsible?:  string;          // assigned lawyer
  documents:     string[];
  comments:      CaseComment[];
  audit:         CaseAudit[];
}

// ─── Documents pool ───────────────────────────────────────────────────────────

export const LEGAL_DOCS: LegalDoc[] = [
  { docId: 'lg-doc-001', caseId: 'lc-c-001', kind: 'contract',         filename: 'D-2026-001.pdf',         uploadedBy: 'Соколов А. (Lawyer)', uploadedAt: '01.01.2026 10:00', status: 'verified', url: '' },
  { docId: 'lg-doc-002', caseId: 'lc-c-014', kind: 'contract',         filename: 'D-2026-014.pdf',         uploadedBy: 'Соколов А. (Lawyer)', uploadedAt: '15.01.2026 11:00', status: 'verified', url: '' },
  { docId: 'lg-doc-003', caseId: 'lc-c-027', kind: 'amendment',        filename: 'D-2026-027-add.pdf',     uploadedBy: 'Карпова А. (Manager)', uploadedAt: '01.02.2026 14:00', status: 'uploaded', url: '' },
  { docId: 'lg-doc-004', caseId: 'lc-cl-026', kind: 'claim_letter',    filename: 'CL-026.pdf',             uploadedBy: 'ЭлектроМир',           uploadedAt: '14.02.2026 09:00', status: 'uploaded', url: '' },
  { docId: 'lg-doc-005', caseId: 'lc-cl-026', kind: 'evidence_photo',   filename: 'iphone-defect.jpg',     uploadedBy: 'ЭлектроМир',           uploadedAt: '14.02.2026 09:05', status: 'uploaded', url: '' },
  { docId: 'lg-doc-006', caseId: 'lc-d-014', kind: 'court_filing',     filename: 'court-filing-014.pdf',  uploadedBy: 'Соколов А. (Lawyer)', uploadedAt: '01.02.2026 16:00', status: 'verified', url: '' },
  { docId: 'lg-doc-007', caseId: 'lc-d-013', kind: 'court_filing',     filename: 'court-filing-013.pdf',  uploadedBy: 'Соколов А. (Lawyer)', uploadedAt: '15.01.2026 17:00', status: 'verified', url: '' },
  { docId: 'lg-doc-008', caseId: 'lc-d-013', kind: 'evidence_doc',     filename: 'transactions.xlsx',      uploadedBy: 'Морозова О. (Acc)',    uploadedAt: '17.01.2026 10:30', status: 'verified', url: '' },
  { docId: 'lg-doc-009', caseId: 'lc-cm-098', kind: 'note',             filename: 'note-098.txt',          uploadedBy: 'Поддержка',            uploadedAt: '14.02.2026 10:00', status: 'uploaded', url: '' },
  { docId: 'lg-doc-010', caseId: 'lc-c-098', kind: 'merchant_doc',     filename: 'TS-MSK-license.pdf',    uploadedBy: 'TechStore MSK',        uploadedAt: '15.05.2025 09:00', status: 'verified', url: '' },
];

// ─── Cases ────────────────────────────────────────────────────────────────────

const A = (action: string, actor = 'Соколов А.', role = 'Lawyer'): CaseAudit =>
  ({ at: new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }), actor, role, action });

export const LEGAL_CASES: LegalCase[] = [
  // ── Contracts ───────────────────────────────────────────────────────────────
  {
    caseId: 'lc-c-001', kind: 'contract', number: 'Д-2026-001', date: '01.01.2026',
    partner: 'ЭлектроМир', partnerType: 'merchant', partnerId: 'm-001',
    subject: 'Оферта на размещение товаров',
    description: 'Базовый договор с продавцом ЭлектроМир. Комиссия 7.5%, выплаты 7-го числа.',
    amount: 0, currency: 'RUB',
    status: 'pending_signature', startedAt: '01.01.2026', expiresAt: '31.12.2026',
    responsible: 'Соколов А.',
    documents: ['lg-doc-001'],
    comments: [{ at: '02.01.2026 11:00', actor: 'Соколов А.', role: 'Lawyer', text: 'Согласовали комиссию 7.5%. Жду подписи продавца.' }],
    audit: [A('Создан договор', 'Соколов А.', 'Lawyer')],
  },
  {
    caseId: 'lc-c-014', kind: 'contract', number: 'Д-2026-014', date: '15.01.2026',
    partner: 'TextileShop', partnerType: 'merchant', partnerId: 'm-002',
    subject: 'Оферта на размещение товаров',
    description: 'Стандартный шаблон. Комиссия 9%.',
    status: 'open', startedAt: '15.01.2026', expiresAt: '15.01.2027',
    responsible: 'Соколов А.',
    documents: ['lg-doc-002'],
    comments: [],
    audit: [A('Договор подписан', 'Соколов А.', 'Lawyer')],
  },
  {
    caseId: 'lc-c-027', kind: 'contract', number: 'Д-2026-027', date: '01.02.2026',
    partner: 'Кафе «Уют»', partnerType: 'merchant', partnerId: 'm-004',
    subject: 'Доп. соглашение о фото-съёмке',
    description: 'Включает услугу фото-съёмки блюд.',
    status: 'pending_signature', startedAt: '01.02.2026',
    responsible: 'Соколов А.',
    documents: ['lg-doc-003'],
    comments: [{ at: '02.02.2026 09:00', actor: 'Карпова А.', role: 'Manager', text: 'Запросили подпись у партнёра.' }],
    audit: [A('Создано доп. соглашение', 'Карпова А.', 'Manager')],
  },
  {
    caseId: 'lc-c-098', kind: 'contract', number: 'Д-2025-098', date: '15.05.2025',
    partner: 'TechStore MSK', partnerType: 'merchant', partnerId: 'm-009',
    subject: 'Оферта',
    status: 'expired', startedAt: '15.05.2025', expiresAt: '15.03.2026',
    responsible: 'Соколов А.',
    documents: ['lg-doc-010'],
    comments: [],
    audit: [A('Договор подписан', 'Соколов А.', 'Lawyer')],
  },
  // ── Claims ──────────────────────────────────────────────────────────────────
  {
    caseId: 'lc-cl-026', kind: 'claim', number: 'CL-026', date: '14.02.2026',
    partner: 'ЭлектроМир', partnerType: 'merchant', partnerId: 'm-001',
    orderId: 'p-001',
    subject: 'Возврат iPhone 15 Pro · брак',
    description: 'Покупатель утверждает дефект экрана. Продавец просит возмещение.',
    amount: 89990, currency: 'RUB',
    status: 'in_progress', startedAt: '14.02.2026',
    responsible: 'Соколов А.',
    documents: ['lg-doc-004', 'lg-doc-005'],
    comments: [{ at: '14.02.2026 09:30', actor: 'Соколов А.', role: 'Lawyer', text: 'Запросил отчёт сервисного центра.' }],
    audit: [A('Претензия зарегистрирована', 'Соколов А.')],
  },
  {
    caseId: 'lc-cl-025', kind: 'claim', number: 'CL-025', date: '12.02.2026',
    partner: 'Покупатель #C-23145', partnerType: 'customer', partnerId: 'c-23145',
    subject: 'Качество доставки',
    status: 'open', startedAt: '12.02.2026',
    documents: [], comments: [], audit: [A('Претензия открыта', 'Поддержка', 'Support')],
  },
  {
    caseId: 'lc-cl-024', kind: 'claim', number: 'CL-024', date: '10.02.2026',
    partner: 'TextileShop', partnerType: 'merchant', partnerId: 'm-002',
    subject: 'Срок выплат',
    amount: 18000, currency: 'RUB',
    status: 'resolved', startedAt: '10.02.2026', closedAt: '12.02.2026',
    responsible: 'Соколов А.',
    documents: [], comments: [], audit: [A('Претензия удовлетворена', 'Соколов А.')],
  },
  // ── Disputes ────────────────────────────────────────────────────────────────
  {
    caseId: 'lc-d-014', kind: 'dispute', number: 'DSP-014', date: '01.02.2026',
    partner: 'Кафе «Уют»', partnerType: 'merchant', partnerId: 'm-004',
    subject: 'Задержка выплаты',
    description: 'Партнёр оспаривает удержание выплаты за январь 2026.',
    amount: 120000, currency: 'RUB',
    status: 'in_progress', startedAt: '01.02.2026',
    responsible: 'Соколов А.',
    documents: ['lg-doc-006'],
    comments: [{ at: '02.02.2026 14:00', actor: 'Соколов А.', role: 'Lawyer', text: 'Подготовил позицию по удержанию. Переговоры назначены.' }],
    audit: [A('Спор открыт', 'Морозова О.', 'ChiefAccountant'), A('Назначен ответственный')],
  },
  {
    caseId: 'lc-d-013', kind: 'dispute', number: 'DSP-013', date: '15.01.2026',
    partner: 'TechStore MSK', partnerType: 'merchant', partnerId: 'm-009',
    subject: 'Брак партии товара',
    description: '54 устройства с дефектом. Продавец отказывается возмещать.',
    amount: 540000, currency: 'RUB',
    status: 'in_court', startedAt: '15.01.2026',
    responsible: 'Соколов А.',
    documents: ['lg-doc-007', 'lg-doc-008'],
    comments: [{ at: '20.01.2026 10:00', actor: 'Соколов А.', role: 'Lawyer', text: 'Иск подан в Арбитражный суд Москвы.' }],
    audit: [A('Спор открыт'), A('Иск подан', 'Соколов А.')],
  },
  {
    caseId: 'lc-d-012', kind: 'dispute', number: 'DSP-012', date: '20.01.2026',
    partner: 'Покупатель #C-23145', partnerType: 'customer',
    subject: 'Спор по доставке',
    amount: 12800, currency: 'RUB',
    status: 'resolved', startedAt: '20.01.2026', closedAt: '24.01.2026',
    responsible: 'Соколов А.',
    documents: [], comments: [], audit: [A('Урегулировано в досудебном порядке')],
  },
  // ── Complaints ──────────────────────────────────────────────────────────────
  {
    caseId: 'lc-cm-098', kind: 'complaint', number: 'CMP-098', date: '14.02.2026',
    partner: 'Покупатель Иванова И.', partnerType: 'customer',
    subject: 'Качество товара (iPhone 15 Pro)',
    description: 'Покупатель жалуется на царапины. Просит замену.',
    status: 'open', startedAt: '14.02.2026',
    documents: ['lg-doc-009'], comments: [], audit: [A('Жалоба создана', 'Поддержка', 'Support')],
  },
  {
    caseId: 'lc-cm-097', kind: 'complaint', number: 'CMP-097', date: '12.02.2026',
    partner: 'TextileShop', partnerType: 'merchant', partnerId: 'm-002',
    subject: 'Удержание выплат',
    status: 'in_progress', startedAt: '12.02.2026',
    responsible: 'Соколов А.',
    documents: [], comments: [], audit: [A('Жалоба передана юристу', 'Поддержка', 'Support')],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function casesByKind(kind: CaseKind) {
  return LEGAL_CASES.filter(c => c.kind === kind);
}

export function getCase(caseId: string): LegalCase | undefined {
  return LEGAL_CASES.find(c => c.caseId === caseId);
}

export function getDoc(docId: string): LegalDoc | undefined {
  return LEGAL_DOCS.find(d => d.docId === docId);
}

export function pushAudit(c: LegalCase, action: string, actor = 'Текущий пользователь', role = 'op') {
  c.audit.unshift({
    at: new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    actor, role, action,
  });
}

export function pushComment(c: LegalCase, text: string, actor = 'Текущий пользователь', role = 'op') {
  c.comments.unshift({
    at: new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    actor, role, text,
  });
}
