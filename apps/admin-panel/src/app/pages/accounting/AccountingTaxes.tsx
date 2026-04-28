import { useMemo, useState } from 'react';
import { Calculator } from 'lucide-react';
import { ModulePlaceholder, type PlaceholderRow } from '../../components/layout/ModulePlaceholder';
import { AccountingItemDrawer } from '../../components/accounting/AccountingItemDrawer';
import {
  TAX_DOCS, ACCT_STATUS_LABELS,
  type AcctItem, type AcctStatus,
} from '../../data/accounting-mock';

export function AccountingTaxes() {
  const [open, setOpen] = useState<AcctItem | null>(null);
  const [, force]       = useState(0);
  const [filter, setFilter] = useState<'all' | AcctStatus>('all');
  const [search, setSearch] = useState('');

  const stats = useMemo(() => ({
    submitted: TAX_DOCS.filter(t => t.status === 'submitted').length,
    paid:      TAX_DOCS.filter(t => t.status === 'paid').length,
    ready:     TAX_DOCS.filter(t => t.status === 'ready').length,
    due:       TAX_DOCS.filter(t => t.status !== 'paid' && t.status !== 'cancelled').reduce((s, t) => s + (t.amount ?? 0), 0),
  }), []);

  const filtered = useMemo(() => TAX_DOCS.filter(t => {
    const q = search.toLowerCase();
    const ms = !q || t.subject.toLowerCase().includes(q) || t.number.toLowerCase().includes(q);
    const mst = filter === 'all' || t.status === filter;
    return ms && mst;
  }), [search, filter]);

  const rows: PlaceholderRow[] = filtered.map(it => {
    const cs = ACCT_STATUS_LABELS[it.status];
    return {
      id: it.itemId, _it: it,
      name:   <p className="font-semibold">{it.subject}</p>,
      period: it.period,
      amount: it.amount != null ? <span className="text-right block font-semibold">{it.amount.toLocaleString('ru-RU')} {it.currency}</span> : '—',
      status: <span className={`inline-flex w-fit px-1.5 py-0 rounded text-[10px] font-bold ${cs.cls}`}>{cs.label}</span>,
    };
  });

  return (
    <>
      <ModulePlaceholder
        permKey="accounting.taxes"
        icon={Calculator}
        section="Финансы / Бухгалтерия"
        title="Налоговые документы"
        subtitle="Декларации, платёжки, переписка с налоговой."
        kpis={[
          { label: 'Подано',     value: stats.submitted, color: 'purple', active: filter === 'submitted', onClick: () => setFilter(filter === 'submitted' ? 'all' : 'submitted') },
          { label: 'Готова',     value: stats.ready,     color: 'orange', active: filter === 'ready',     onClick: () => setFilter(filter === 'ready' ? 'all' : 'ready') },
          { label: 'Уплачено',   value: stats.paid,      color: 'green',  active: filter === 'paid',      onClick: () => setFilter(filter === 'paid' ? 'all' : 'paid') },
          { label: 'К оплате',   value: `${stats.due.toLocaleString('ru-RU')} ₽`, color: 'red' },
        ]}
        columns={[
          { key: 'name',   label: 'Документ' },
          { key: 'period', label: 'Период' },
          { key: 'amount', label: 'Сумма', align: 'right' },
          { key: 'status', label: 'Статус' },
        ]}
        rows={rows}
        searchValue={search}
        onSearchChange={setSearch}
        onRowClick={r => setOpen((r as any)._it as AcctItem)}
        hideCreate
      />
      {open && <AccountingItemDrawer item={open} permKey="accounting.taxes" onClose={() => setOpen(null)} onChange={() => force(x => x + 1)} />}
    </>
  );
}
