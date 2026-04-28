import { useMemo, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { ModulePlaceholder, type PlaceholderRow } from '../../components/layout/ModulePlaceholder';
import { AccountingItemDrawer } from '../../components/accounting/AccountingItemDrawer';
import {
  RECONCILIATIONS, ACCT_STATUS_LABELS,
  type AcctItem, type AcctStatus,
} from '../../data/accounting-mock';

export function AccountingReconciliations() {
  const [open, setOpen] = useState<AcctItem | null>(null);
  const [, force]       = useState(0);
  const [filter, setFilter] = useState<'all' | AcctStatus>('all');
  const [search, setSearch] = useState('');

  const stats = useMemo(() => ({
    open:        RECONCILIATIONS.filter(r => r.status === 'in_progress').length,
    closed:      RECONCILIATIONS.filter(r => r.status === 'closed' || r.status === 'reviewed').length,
    discrepancy: RECONCILIATIONS.filter(r => r.status === 'discrepancy').length,
    sum:         RECONCILIATIONS.reduce((s, r) => s + (r.amount ?? 0), 0),
  }), []);

  const filtered = useMemo(() => RECONCILIATIONS.filter(r => {
    const q = search.toLowerCase();
    const ms = !q || r.number.toLowerCase().includes(q) || (r.partner ?? '').toLowerCase().includes(q);
    const mst = filter === 'all' || r.status === filter;
    return ms && mst;
  }), [search, filter]);

  const rows: PlaceholderRow[] = filtered.map(it => {
    const cs = ACCT_STATUS_LABELS[it.status];
    return {
      id: it.itemId, _it: it,
      period:  it.period,
      partner: it.partner,
      docs:    `${it.documents.length} док.`,
      amount:  it.amount != null ? <span className="text-right block font-semibold">{it.amount.toLocaleString('ru-RU')} {it.currency}</span> : '—',
      status:  <span className={`inline-flex w-fit px-1.5 py-0 rounded text-[10px] font-bold ${cs.cls}`}>{cs.label}</span>,
    };
  });

  return (
    <>
      <ModulePlaceholder
        permKey="accounting.reconciliations"
        icon={CheckCircle2}
        section="Финансы / Бухгалтерия"
        title="Сверки"
        subtitle="Сверка платежей с продавцами, банком, налоговой."
        kpis={[
          { label: 'В работе',     value: stats.open,        color: 'orange', active: filter === 'in_progress', onClick: () => setFilter(filter === 'in_progress' ? 'all' : 'in_progress') },
          { label: 'Подтверждены', value: stats.closed,      color: 'green',  active: filter === 'closed' || filter === 'reviewed', onClick: () => setFilter(filter === 'closed' ? 'all' : 'closed') },
          { label: 'Расхождения',  value: stats.discrepancy, color: 'red',    active: filter === 'discrepancy', onClick: () => setFilter(filter === 'discrepancy' ? 'all' : 'discrepancy') },
          { label: 'Сумма',        value: `${stats.sum.toLocaleString('ru-RU')} ₽`, color: 'blue' },
        ]}
        columns={[
          { key: 'period',  label: 'Период' },
          { key: 'partner', label: 'Контрагент' },
          { key: 'docs',    label: 'Документы' },
          { key: 'amount',  label: 'Сумма', align: 'right' },
          { key: 'status',  label: 'Статус' },
        ]}
        rows={rows}
        searchValue={search}
        onSearchChange={setSearch}
        onRowClick={r => setOpen((r as any)._it as AcctItem)}
        hideCreate
      />
      {open && <AccountingItemDrawer item={open} permKey="accounting.reconciliations" onClose={() => setOpen(null)} onChange={() => force(x => x + 1)} />}
    </>
  );
}
