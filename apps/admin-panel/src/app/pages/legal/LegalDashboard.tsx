import { useMemo, useState } from 'react';
import { Scale } from 'lucide-react';
import { ModulePlaceholder, type PlaceholderRow } from '../../components/layout/ModulePlaceholder';
import { LegalCaseDrawer } from '../../components/legal/LegalCaseDrawer';
import {
  LEGAL_CASES, CASE_KIND_LABELS, CASE_STATUS_LABELS,
  type LegalCase,
} from '../../data/legal-mock';

export function LegalDashboard() {
  const [open, setOpen] = useState<LegalCase | null>(null);
  const [, force]       = useState(0);

  const stats = useMemo(() => ({
    contracts:  LEGAL_CASES.filter(c => c.kind === 'contract'  && c.status !== 'closed' && c.status !== 'expired').length,
    claims:     LEGAL_CASES.filter(c => c.kind === 'claim'     && c.status !== 'closed' && c.status !== 'rejected').length,
    disputes:   LEGAL_CASES.filter(c => c.kind === 'dispute'   && c.status !== 'closed' && c.status !== 'resolved').length,
    docsInWork: LEGAL_CASES.filter(c => c.status === 'awaiting_docs' || c.status === 'in_progress').length,
  }), []);

  // Latest 6 cases across kinds
  const rows: PlaceholderRow[] = useMemo(() => LEGAL_CASES.slice(0, 6).map(c => {
    const cs = CASE_STATUS_LABELS[c.status];
    return {
      id: c.caseId,
      _case: c,
      date: c.date,
      type: <span className="text-xs">{CASE_KIND_LABELS[c.kind]}</span>,
      subject: <p className="font-semibold text-gray-800">{c.partner ? `${c.partner} · ` : ''}<span className="text-gray-600">{c.subject}</span></p>,
      status: <span className={`inline-flex w-fit px-1.5 py-0 rounded text-[10px] font-bold ${cs.cls}`}>{cs.label}</span>,
    };
  }), []);

  return (
    <>
      <ModulePlaceholder
        permKey="legal"
        icon={Scale}
        section="Юридический"
        title="Юридический отдел — сводка"
        subtitle="Договоры, претензии, споры, жалобы, юридические документы и отчёты."
        kpis={[
          { label: 'Открытые споры',     value: stats.disputes,   color: 'red',    href: '/legal/disputes' },
          { label: 'Активные договоры',  value: stats.contracts,  color: 'green',  href: '/legal/contracts' },
          { label: 'Претензии',          value: stats.claims,     color: 'orange', href: '/legal/claims' },
          { label: 'Документов в работе',value: stats.docsInWork, color: 'blue',   href: '/legal/documents' },
        ]}
        columns={[
          { key: 'date',    label: 'Дата' },
          { key: 'type',    label: 'Тип' },
          { key: 'subject', label: 'Предмет' },
          { key: 'status',  label: 'Статус' },
        ]}
        rows={rows}
        onRowClick={r => setOpen(r._case as LegalCase)}
        hideCreate
        note={
          <span>
            Юрист видит этот раздел при разрешении <span className="font-mono">legal.view</span>.
            Юрист не может проводить выплаты или менять финансы.
          </span>
        }
      />
      {open && <LegalCaseDrawer caseObj={open} onClose={() => setOpen(null)} onChange={() => force(x => x + 1)} />}
    </>
  );
}
