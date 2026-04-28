import { useMemo, useState } from 'react';
import { FileText } from 'lucide-react';
import { toast } from 'sonner';
import { ModulePlaceholder, type PlaceholderRow } from '../../components/layout/ModulePlaceholder';
import { LegalCaseDrawer } from '../../components/legal/LegalCaseDrawer';
import { useAuth } from '../../contexts/AuthContext';
import {
  LEGAL_CASES, CASE_STATUS_LABELS,
  type LegalCase,
} from '../../data/legal-mock';

export function LegalContracts() {
  const { hasPermission, user } = useAuth();
  const [open, setOpen] = useState<LegalCase | null>(null);
  const [, force]       = useState(0);
  const [filter, setFilter] = useState<'all' | 'active' | 'pending' | 'expiring' | 'expired'>('all');
  const [search, setSearch] = useState('');

  const all = useMemo(() => LEGAL_CASES.filter(c => c.kind === 'contract'), []);

  const stats = useMemo(() => ({
    active:    all.filter(c => c.status === 'open').length,
    pending:   all.filter(c => c.status === 'pending_signature').length,
    expiring:  all.filter(c => c.status === 'open' && c.expiresAt && new Date(c.expiresAt.split('.').reverse().join('-')) < new Date('2026-04-30')).length,
    expired:   all.filter(c => c.status === 'expired').length,
  }), [all]);

  const filtered = useMemo(() => all.filter(c => {
    const q = search.toLowerCase();
    const ms = !q || c.number.toLowerCase().includes(q) || (c.partner ?? '').toLowerCase().includes(q) || c.subject.toLowerCase().includes(q);
    if (filter === 'all')      return ms;
    if (filter === 'active')   return ms && c.status === 'open';
    if (filter === 'pending')  return ms && c.status === 'pending_signature';
    if (filter === 'expired')  return ms && c.status === 'expired';
    if (filter === 'expiring') return ms && c.status === 'open' && c.expiresAt &&
                                      new Date(c.expiresAt.split('.').reverse().join('-')) < new Date('2026-04-30');
    return ms;
  }), [all, filter, search]);

  const rows: PlaceholderRow[] = filtered.map(c => {
    const cs = CASE_STATUS_LABELS[c.status];
    return {
      id: c.caseId,
      _case: c,
      no: <p className="font-mono font-bold text-gray-900">{c.number}</p>,
      partner: <span className="text-sm">{c.partner}</span>,
      subject: c.subject,
      started: c.startedAt,
      expires: c.expiresAt ?? '—',
      status: <span className={`inline-flex w-fit px-1.5 py-0 rounded text-[10px] font-bold ${cs.cls}`}>{cs.label}</span>,
    };
  });

  function createDraft() {
    if (!hasPermission('legal.contracts.manage') && !hasPermission('legal.contracts.create')) return;
    const id = `lc-c-${Date.now()}`;
    const newCase: LegalCase = {
      caseId: id, kind: 'contract',
      number: `Д-${new Date().getFullYear()}-${String(LEGAL_CASES.filter(x => x.kind === 'contract').length + 1).padStart(3, '0')}`,
      date: new Date().toLocaleDateString('ru-RU'),
      subject: 'Новый договор',
      status: 'draft',
      startedAt: new Date().toLocaleDateString('ru-RU'),
      responsible: user?.name,
      documents: [], comments: [],
      audit: [{ at: new Date().toLocaleString('ru-RU'), actor: user?.name ?? 'op', role: user?.role ?? 'op', action: 'Договор создан как черновик' }],
    };
    LEGAL_CASES.unshift(newCase);
    setOpen(newCase);
    toast.success(`Создан: ${newCase.number}`);
  }

  return (
    <>
      <ModulePlaceholder
        permKey="legal.contracts"
        icon={FileText}
        section="Юридический"
        title="Договоры"
        subtitle="Реестр договоров с продавцами, курьерами, поставщиками, ПВЗ."
        kpis={[
          { label: 'Активных',      value: stats.active,   color: 'green',  active: filter === 'active',   onClick: () => setFilter(filter === 'active'   ? 'all' : 'active')   },
          { label: 'Истекают',      value: stats.expiring, color: 'orange', active: filter === 'expiring', onClick: () => setFilter(filter === 'expiring' ? 'all' : 'expiring') },
          { label: 'На подписании', value: stats.pending,  color: 'blue',   active: filter === 'pending',  onClick: () => setFilter(filter === 'pending'  ? 'all' : 'pending')  },
          { label: 'Истёкших',      value: stats.expired,  color: 'red',    active: filter === 'expired',  onClick: () => setFilter(filter === 'expired'  ? 'all' : 'expired')  },
        ]}
        columns={[
          { key: 'no',      label: '№' },
          { key: 'partner', label: 'Контрагент' },
          { key: 'subject', label: 'Предмет' },
          { key: 'started', label: 'С' },
          { key: 'expires', label: 'По' },
          { key: 'status',  label: 'Статус' },
        ]}
        rows={rows}
        searchValue={search}
        onSearchChange={setSearch}
        onRowClick={r => setOpen(r._case as LegalCase)}
        onCreate={createDraft}
      />
      {open && <LegalCaseDrawer caseObj={open} onClose={() => setOpen(null)} onChange={() => force(x => x + 1)} />}
    </>
  );
}
