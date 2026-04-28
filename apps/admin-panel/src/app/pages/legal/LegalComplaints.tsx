import { useMemo, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { ModulePlaceholder, type PlaceholderRow } from '../../components/layout/ModulePlaceholder';
import { LegalCaseDrawer } from '../../components/legal/LegalCaseDrawer';
import { useAuth } from '../../contexts/AuthContext';
import {
  LEGAL_CASES, CASE_STATUS_LABELS, type LegalCase,
} from '../../data/legal-mock';

export function LegalComplaints() {
  const { user } = useAuth();
  const [open, setOpen] = useState<LegalCase | null>(null);
  const [, force]       = useState(0);
  const [filter, setFilter] = useState<'all' | 'open' | 'in_progress' | 'closed'>('all');
  const [search, setSearch] = useState('');

  const all = useMemo(() => LEGAL_CASES.filter(c => c.kind === 'complaint'), []);
  const stats = useMemo(() => ({
    open:        all.filter(c => c.status === 'open').length,
    in_progress: all.filter(c => c.status === 'in_progress' || c.status === 'awaiting_docs').length,
    closed:      all.filter(c => c.status === 'closed' || c.status === 'resolved').length,
  }), [all]);

  const filtered = useMemo(() => all.filter(c => {
    const q = search.toLowerCase();
    const ms = !q || c.number.toLowerCase().includes(q) || (c.partner ?? '').toLowerCase().includes(q) || c.subject.toLowerCase().includes(q);
    if (filter === 'all') return ms;
    if (filter === 'closed')      return ms && (c.status === 'closed' || c.status === 'resolved');
    if (filter === 'in_progress') return ms && (c.status === 'in_progress' || c.status === 'awaiting_docs');
    return ms && c.status === filter;
  }), [all, filter, search]);

  const rows: PlaceholderRow[] = filtered.map(c => {
    const cs = CASE_STATUS_LABELS[c.status];
    return {
      id: c.caseId, _case: c,
      no: <span className="font-mono font-bold">{c.number}</span>,
      date: c.date,
      from: c.partner ?? '—',
      subject: c.subject,
      status: <span className={`inline-flex w-fit px-1.5 py-0 rounded text-[10px] font-bold ${cs.cls}`}>{cs.label}</span>,
    };
  });

  function openCreate() {
    const newCase: LegalCase = {
      caseId: `lc-cm-${Date.now()}`, kind: 'complaint',
      number: `CMP-${String(all.length + 1).padStart(3, '0')}`,
      date: new Date().toLocaleDateString('ru-RU'),
      subject: 'Новая жалоба', status: 'open',
      startedAt: new Date().toLocaleDateString('ru-RU'),
      responsible: user?.name, documents: [], comments: [],
      audit: [{ at: new Date().toLocaleString('ru-RU'), actor: user?.name ?? 'op', role: user?.role ?? 'op', action: 'Жалоба создана' }],
    };
    LEGAL_CASES.unshift(newCase);
    setOpen(newCase);
    toast.success(`Создана: ${newCase.number}`);
  }

  return (
    <>
      <ModulePlaceholder
        permKey="legal.complaints"
        icon={MessageSquare}
        section="Юридический"
        title="Жалобы"
        subtitle="Жалобы покупателей и контрагентов, требующие юридической оценки."
        kpis={[
          { label: 'Открытые', value: stats.open,        color: 'orange', active: filter === 'open',        onClick: () => setFilter(filter === 'open' ? 'all' : 'open') },
          { label: 'В работе', value: stats.in_progress, color: 'blue',   active: filter === 'in_progress', onClick: () => setFilter(filter === 'in_progress' ? 'all' : 'in_progress') },
          { label: 'Закрытые', value: stats.closed,      color: 'green',  active: filter === 'closed',      onClick: () => setFilter(filter === 'closed' ? 'all' : 'closed') },
        ]}
        columns={[
          { key: 'no',      label: '№' },
          { key: 'date',    label: 'Дата' },
          { key: 'from',    label: 'От' },
          { key: 'subject', label: 'Предмет' },
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
