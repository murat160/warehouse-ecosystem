import { useMemo, useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { ModulePlaceholder, type PlaceholderRow } from '../../components/layout/ModulePlaceholder';
import { AccountingItemDrawer } from '../../components/accounting/AccountingItemDrawer';
import {
  ACCT_REPORTS, ACCT_STATUS_LABELS,
  type AcctItem, type AcctStatus,
} from '../../data/accounting-mock';

export function AccountingReports() {
  const [open, setOpen] = useState<AcctItem | null>(null);
  const [, force]       = useState(0);
  const [filter, setFilter] = useState<'all' | AcctStatus>('all');
  const [search, setSearch] = useState('');

  const stats = useMemo(() => ({
    ready:       ACCT_REPORTS.filter(r => r.status === 'ready').length,
    submitted:   ACCT_REPORTS.filter(r => r.status === 'submitted').length,
    in_progress: ACCT_REPORTS.filter(r => r.status === 'in_progress').length,
    total:       ACCT_REPORTS.length,
  }), []);

  const filtered = useMemo(() => ACCT_REPORTS.filter(r => {
    const q = search.toLowerCase();
    const ms = !q || r.subject.toLowerCase().includes(q) || (r.period ?? '').toLowerCase().includes(q);
    const mst = filter === 'all' || r.status === filter;
    return ms && mst;
  }), [search, filter]);

  const rows: PlaceholderRow[] = filtered.map(it => {
    const cs = ACCT_STATUS_LABELS[it.status];
    return {
      id: it.itemId, _it: it,
      name:    <p className="font-semibold">{it.subject}</p>,
      period:  it.period,
      updated: it.date,
      status:  <span className={`inline-flex w-fit px-1.5 py-0 rounded text-[10px] font-bold ${cs.cls}`}>{cs.label}</span>,
    };
  });

  return (
    <>
      <ModulePlaceholder
        permKey="accounting.reports"
        icon={FileSpreadsheet}
        section="Финансы / Бухгалтерия"
        title="Отчёты бухгалтерии"
        subtitle="Финансовые и налоговые отчёты, доступные бухгалтеру и главному бухгалтеру."
        kpis={[
          { label: 'Всего',     value: stats.total,       color: 'blue',  active: filter === 'all',         onClick: () => setFilter('all') },
          { label: 'Готовы',    value: stats.ready,       color: 'green', active: filter === 'ready',       onClick: () => setFilter(filter === 'ready' ? 'all' : 'ready') },
          { label: 'Поданы',    value: stats.submitted,   color: 'purple',active: filter === 'submitted',   onClick: () => setFilter(filter === 'submitted' ? 'all' : 'submitted') },
          { label: 'В работе',  value: stats.in_progress, color: 'orange',active: filter === 'in_progress', onClick: () => setFilter(filter === 'in_progress' ? 'all' : 'in_progress') },
        ]}
        columns={[
          { key: 'name',    label: 'Отчёт' },
          { key: 'period',  label: 'Период' },
          { key: 'updated', label: 'Обновлён' },
          { key: 'status',  label: 'Статус' },
        ]}
        rows={rows}
        searchValue={search}
        onSearchChange={setSearch}
        onRowClick={r => setOpen((r as any)._it as AcctItem)}
        hideCreate
      />
      {open && <AccountingItemDrawer item={open} permKey="accounting.reports" onClose={() => setOpen(null)} onChange={() => force(x => x + 1)} />}
    </>
  );
}
