import { useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { ModulePlaceholder, type PlaceholderRow } from '../../components/layout/ModulePlaceholder';
import { LegalCaseDrawer } from '../../components/legal/LegalCaseDrawer';
import { useAuth } from '../../contexts/AuthContext';
import {
  LEGAL_CASES, CASE_STATUS_LABELS, type LegalCase,
} from '../../data/legal-mock';

export function LegalDisputes() {
  const { user } = useAuth();
  const [open, setOpen] = useState<LegalCase | null>(null);
  const [, force]       = useState(0);
  const [filter, setFilter] = useState<'all' | 'in_progress' | 'in_court' | 'resolved'>('all');
  const [search, setSearch] = useState('');

  const all = useMemo(() => LEGAL_CASES.filter(c => c.kind === 'dispute'), []);
  const stats = useMemo(() => {
    const totalAmount = all.filter(c => c.status !== 'resolved' && c.status !== 'closed').reduce((s, c) => s + (c.amount ?? 0), 0);
    return {
      in_progress: all.filter(c => c.status === 'in_progress').length,
      in_court:    all.filter(c => c.status === 'in_court').length,
      resolved:    all.filter(c => c.status === 'resolved' || c.status === 'closed').length,
      totalAmount,
    };
  }, [all]);

  const filtered = useMemo(() => all.filter(c => {
    const q = search.toLowerCase();
    const ms = !q || c.number.toLowerCase().includes(q) || (c.partner ?? '').toLowerCase().includes(q) || c.subject.toLowerCase().includes(q);
    if (filter === 'all')      return ms;
    if (filter === 'resolved') return ms && (c.status === 'resolved' || c.status === 'closed');
    return ms && c.status === filter;
  }), [all, filter, search]);

  const rows: PlaceholderRow[] = filtered.map(c => {
    const cs = CASE_STATUS_LABELS[c.status];
    return {
      id: c.caseId, _case: c,
      no: <span className="font-mono font-bold">{c.number}</span>,
      partner: c.partner ?? '—',
      amount: c.amount != null ? <span className="text-right block font-semibold">{c.amount.toLocaleString('ru-RU')} {c.currency}</span> : '—',
      opened: c.startedAt,
      status: <span className={`inline-flex w-fit px-1.5 py-0 rounded text-[10px] font-bold ${cs.cls}`}>{cs.label}</span>,
    };
  });

  function openCreate() {
    const newCase: LegalCase = {
      caseId: `lc-d-${Date.now()}`, kind: 'dispute',
      number: `DSP-${String(all.length + 1).padStart(3, '0')}`,
      date: new Date().toLocaleDateString('ru-RU'),
      subject: 'Новый спор', status: 'open',
      startedAt: new Date().toLocaleDateString('ru-RU'),
      responsible: user?.name, documents: [], comments: [],
      audit: [{ at: new Date().toLocaleString('ru-RU'), actor: user?.name ?? 'op', role: user?.role ?? 'op', action: 'Спор создан' }],
    };
    LEGAL_CASES.unshift(newCase);
    setOpen(newCase);
    toast.success(`Создан: ${newCase.number}`);
  }

  return (
    <>
      <ModulePlaceholder
        permKey="legal.disputes"
        icon={AlertTriangle}
        section="Юридический"
        title="Споры"
        subtitle="Открытые, в суде, урегулированные споры с контрагентами."
        kpis={[
          { label: 'В работе',      value: stats.in_progress, color: 'red',    active: filter === 'in_progress', onClick: () => setFilter(filter === 'in_progress' ? 'all' : 'in_progress') },
          { label: 'В суде',        value: stats.in_court,    color: 'orange', active: filter === 'in_court',    onClick: () => setFilter(filter === 'in_court' ? 'all' : 'in_court') },
          { label: 'Урегулировано', value: stats.resolved,    color: 'green',  active: filter === 'resolved',    onClick: () => setFilter(filter === 'resolved' ? 'all' : 'resolved') },
          { label: 'Сумма исков',   value: `${stats.totalAmount.toLocaleString('ru-RU')} ₽`, color: 'blue' },
        ]}
        columns={[
          { key: 'no',      label: '№' },
          { key: 'partner', label: 'Сторона' },
          { key: 'amount',  label: 'Сумма', align: 'right' },
          { key: 'opened',  label: 'Открыт' },
          { key: 'status',  label: 'Статус' },
        ]}
        rows={rows}
        searchValue={search}
        onSearchChange={setSearch}
        onRowClick={r => setOpen(r._case as LegalCase)}
        onCreate={openCreate}
      />
      {open && <LegalCaseDrawer caseObj={open} onClose={() => setOpen(null)} onChange={() => force(x => x + 1)} />}
    </>
  );
}
