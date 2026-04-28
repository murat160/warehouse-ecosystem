import { useMemo } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { ModulePlaceholder, type PlaceholderRow } from '../../components/layout/ModulePlaceholder';
import { exportToCsv } from '../../utils/downloads';
import {
  LEGAL_CASES, CASE_KIND_LABELS, CASE_STATUS_LABELS,
} from '../../data/legal-mock';

interface ReportRow {
  id: string;
  name:   string;
  period: string;
  kind:   'contracts' | 'claims' | 'disputes' | 'complaints' | 'all';
  generatedAt: string;
}

const REPORTS: ReportRow[] = [
  { id: 'r-2026-01', name: 'Реестр споров',          period: 'Q4 2025',  kind: 'disputes',   generatedAt: '01.02.2026' },
  { id: 'r-2026-02', name: 'Анализ претензий',       period: 'Янв 2026', kind: 'claims',     generatedAt: '12.02.2026' },
  { id: 'r-2026-03', name: 'Истекающие договоры',    period: '2026',     kind: 'contracts',  generatedAt: '14.02.2026' },
  { id: 'r-2026-04', name: 'Жалобы покупателей',     period: 'Янв 2026', kind: 'complaints', generatedAt: '12.02.2026' },
];

function downloadReport(r: ReportRow) {
  let cases = LEGAL_CASES;
  if (r.kind !== 'all') {
    const map: any = { contracts: 'contract', claims: 'claim', disputes: 'dispute', complaints: 'complaint' };
    cases = cases.filter(c => c.kind === map[r.kind]);
  }
  exportToCsv(cases.map(c => ({
    number: c.number, kind: CASE_KIND_LABELS[c.kind], subject: c.subject,
    partner: c.partner ?? '', status: CASE_STATUS_LABELS[c.status].label,
    started: c.startedAt, closed: c.closedAt ?? '',
    amount: c.amount ?? '', currency: c.currency ?? '',
  })) as any[], [
    { key: 'number',   label: '№' },
    { key: 'kind',     label: 'Тип' },
    { key: 'subject',  label: 'Предмет' },
    { key: 'partner',  label: 'Сторона' },
    { key: 'status',   label: 'Статус' },
    { key: 'started',  label: 'Открыто' },
    { key: 'closed',   label: 'Закрыто' },
    { key: 'amount',   label: 'Сумма' },
    { key: 'currency', label: 'Валюта' },
  ], r.id);
  toast.success(`Скачан: ${r.name}`);
}

export function LegalReports() {
  const stats = useMemo(() => ({
    total:    REPORTS.length,
    inWork:   2,
    sumIsk:   LEGAL_CASES.filter(c => c.kind === 'dispute').reduce((s, c) => s + (c.amount ?? 0), 0),
  }), []);

  const rows: PlaceholderRow[] = REPORTS.map(r => ({
    id: r.id, _r: r,
    name:    <p className="font-semibold">{r.name}</p>,
    period:  r.period,
    kind:    <span className="text-xs text-gray-600">{r.kind}</span>,
    generatedAt: r.generatedAt,
  }));

  return (
    <ModulePlaceholder
      permKey="legal.reports"
      icon={FileSpreadsheet}
      section="Юридический"
      title="Юридические отчёты"
      subtitle="Сводные отчёты по спорам, претензиям, договорам, рискам."
      kpis={[
        { label: 'Готовых отчётов', value: stats.total,                                color: 'green',  href: '/legal/reports' },
        { label: 'В работе',        value: stats.inWork,                               color: 'orange' },
        { label: 'Сумма исков',     value: `${stats.sumIsk.toLocaleString('ru-RU')} ₽`, color: 'red',    href: '/legal/disputes' },
      ]}
      columns={[
        { key: 'name',        label: 'Отчёт' },
        { key: 'period',      label: 'Период' },
        { key: 'kind',        label: 'Категория' },
        { key: 'generatedAt', label: 'Сформирован' },
      ]}
      rows={rows}
      onRowClick={r => downloadReport((r as any)._r as ReportRow)}
      hideCreate
      note="Клик по строке — скачать отчёт CSV."
    />
  );
}
