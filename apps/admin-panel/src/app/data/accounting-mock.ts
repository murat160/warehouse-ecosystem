/**
 * Accounting mock data — reconciliations, reports, exports, taxes.
 * Each kind has its own array but they share the AccountingItem shape
 * so the drawer can render any of them uniformly.
 */

export type AcctKind = 'reconciliation' | 'report' | 'export' | 'tax_doc' | 'invoice';

export const ACCT_KIND_LABELS: Record<AcctKind, string> = {
  reconciliation: 'Сверка',
  report:         'Отчёт',
  export:         'Экспорт',
  tax_doc:        'Налоговый документ',
  invoice:        'Инвойс',
};

export type AcctStatus =
  | 'draft' | 'in_progress' | 'discrepancy' | 'reviewed' | 'closed'
  | 'submitted' | 'paid' | 'overdue' | 'cancelled' | 'ready';

export const ACCT_STATUS_LABELS: Record<AcctStatus, { label: string; cls: string }> = {
  draft:        { label: 'Черновик',     cls: 'bg-slate-100 text-slate-700'   },
  in_progress:  { label: 'В работе',     cls: 'bg-yellow-100 text-yellow-700' },
  discrepancy:  { label: 'Расхождение',  cls: 'bg-orange-100 text-orange-700' },
  reviewed:     { label: 'Проверено',    cls: 'bg-blue-100 text-blue-700'     },
  closed:       { label: 'Закрыто',      cls: 'bg-green-100 text-green-700'   },
  submitted:    { label: 'Подан',        cls: 'bg-blue-100 text-blue-700'     },
  paid:         { label: 'Оплачен',      cls: 'bg-green-100 text-green-700'   },
  overdue:      { label: 'Просрочен',    cls: 'bg-red-100 text-red-700'       },
  cancelled:    { label: 'Отменён',      cls: 'bg-gray-100 text-gray-600'     },
  ready:        { label: 'Готов',        cls: 'bg-green-100 text-green-700'   },
};

export interface AcctAudit { at: string; actor: string; role: string; action: string; }

export interface AcctItem {
  itemId:      string;
  kind:        AcctKind;
  number:      string;
  date:        string;
  partner?:    string;
  subject:     string;
  description?:string;
  period?:     string;
  amount?:     number;
  currency?:   string;
  paid?:       number;
  due?:        number;
  status:      AcctStatus;
  responsible?:string;
  documents:   string[];   // doc ids (LEGAL_DOCS / FOREIGN_DOCS / accounting docs by id)
  audit:       AcctAudit[];
}

const A = (action: string, actor = 'Морозова О.', role = 'ChiefAccountant'): AcctAudit =>
  ({ at: new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }), actor, role, action });

// ─── Reconciliations ──────────────────────────────────────────────────────────

export const RECONCILIATIONS: AcctItem[] = [
  { itemId: 're-001', kind: 'reconciliation', number: 'REC-2026-001', date: '14.02.2026', partner: 'ЭлектроМир',     subject: 'Сверка платежей · январь 2026',  period: 'Янв 2026', amount: 1_240_000, currency: 'RUB', status: 'closed',      responsible: 'Морозова О.', documents: [], audit: [A('Сверка закрыта')] },
  { itemId: 're-002', kind: 'reconciliation', number: 'REC-2026-002', date: '14.02.2026', partner: 'TextileShop',    subject: 'Сверка платежей · январь 2026',  period: 'Янв 2026', amount: 342_100,   currency: 'RUB', status: 'discrepancy', responsible: 'Сидоров П.', documents: [], audit: [A('Расхождение ₽1 200', 'Сидоров П.', 'Accountant')] },
  { itemId: 're-003', kind: 'reconciliation', number: 'REC-2026-003', date: '14.02.2026', partner: 'Кафе «Уют»',     subject: 'Сверка платежей · январь 2026',  period: 'Янв 2026', amount: 89_600,    currency: 'RUB', status: 'in_progress', responsible: 'Сидоров П.', documents: [], audit: [A('Сверка в работе', 'Сидоров П.', 'Accountant')] },
  { itemId: 're-004', kind: 'reconciliation', number: 'REC-2025-098', date: '31.01.2026', partner: 'TechStore MSK',  subject: 'Сверка платежей · декабрь 2025', period: 'Дек 2025', amount: 512_400,   currency: 'RUB', status: 'closed',      responsible: 'Морозова О.', documents: [], audit: [A('Сверка закрыта')] },
];

// ─── Reports ──────────────────────────────────────────────────────────────────

export const ACCT_REPORTS: AcctItem[] = [
  { itemId: 'r-001', kind: 'report', number: 'BOOK-SALES-Q4', date: '01.02.2026', subject: 'Книга продаж',        period: 'Q4 2025',  status: 'ready',     responsible: 'Морозова О.', documents: [], audit: [A('Отчёт готов')] },
  { itemId: 'r-002', kind: 'report', number: 'NDS-Q4-2025',    date: '03.02.2026', subject: 'НДС-декларация',      period: 'Q4 2025',  status: 'submitted', responsible: 'Морозова О.', documents: [], audit: [A('Подана в ФНС')] },
  { itemId: 'r-003', kind: 'report', number: 'BANK-RECON-JAN', date: '12.02.2026', subject: 'Сверка с банком',     period: 'Янв 2026', status: 'in_progress',responsible: 'Сидоров П.', documents: [], audit: [A('Загружены выписки', 'Сидоров П.', 'Accountant')] },
  { itemId: 'r-004', kind: 'report', number: 'TURNOVER-JAN',   date: '14.02.2026', subject: 'Оборот по контрагентам', period: 'Янв 2026', status: 'ready',  responsible: 'Морозова О.', documents: [], audit: [A('Отчёт готов')] },
];

// ─── Exports ──────────────────────────────────────────────────────────────────

export const ACCT_EXPORTS: AcctItem[] = [
  { itemId: 'e-001', kind: 'export', number: 'EXP-PAYOUTS-MERCH-JAN', date: '12.02.2026', subject: 'Платежи продавцам',     period: 'Янв 2026', status: 'ready', documents: [], audit: [A('Выгрузка готова')] },
  { itemId: 'e-002', kind: 'export', number: 'EXP-PAYOUTS-COURIER-JAN', date: '12.02.2026', subject: 'Платежи курьерам',     period: 'Янв 2026', status: 'ready', documents: [], audit: [A('Выгрузка готова')] },
  { itemId: 'e-003', kind: 'export', number: 'EXP-REFUNDS-Q4',         date: '31.01.2026', subject: 'Возвраты',              period: 'Q4 2025',  status: 'ready', documents: [], audit: [A('Выгрузка готова')] },
  { itemId: 'e-004', kind: 'export', number: 'EXP-1C-PURCHASE-Q4',     date: '15.01.2026', subject: 'Книга покупок (1С)',    period: 'Q4 2025',  status: 'ready', documents: [], audit: [A('Выгрузка готова')] },
];

// ─── Tax docs ─────────────────────────────────────────────────────────────────

export const TAX_DOCS: AcctItem[] = [
  { itemId: 't-001', kind: 'tax_doc', number: 'NDS-Q4-2025', date: '03.02.2026', subject: 'НДС-декларация',     period: 'Q4 2025',  amount: 284_300, currency: 'RUB', status: 'submitted', responsible: 'Морозова О.', documents: [], audit: [A('Подана в ФНС')] },
  { itemId: 't-002', kind: 'tax_doc', number: 'INC-TAX-2025',date: '01.02.2026', subject: 'Налог на прибыль',   period: '2025',     amount: 1_120_000, currency: 'RUB', status: 'ready',  responsible: 'Морозова О.', documents: [], audit: [A('Готова к подаче')] },
  { itemId: 't-003', kind: 'tax_doc', number: 'INS-JAN-2026',date: '14.02.2026', subject: 'Страховые взносы',   period: 'Янв 2026', amount: 98_600,  currency: 'RUB', status: 'paid',   responsible: 'Сидоров П.', documents: [], audit: [A('Уплачены', 'Сидоров П.', 'Accountant')] },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function pushAudit(it: AcctItem, action: string, actor = 'Текущий', role = 'op') {
  it.audit.unshift({
    at: new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    actor, role, action,
  });
}
