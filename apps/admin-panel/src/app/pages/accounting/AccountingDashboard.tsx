import { useMemo, useState } from 'react';
import { Calculator } from 'lucide-react';
import { ModulePlaceholder, type PlaceholderRow } from '../../components/layout/ModulePlaceholder';
import { AccountingItemDrawer } from '../../components/accounting/AccountingItemDrawer';
import {
  RECONCILIATIONS, ACCT_REPORTS, TAX_DOCS, ACCT_STATUS_LABELS,
  type AcctItem,
} from '../../data/accounting-mock';

export function AccountingDashboard() {
  const [open, setOpen] = useState<{ item: AcctItem; permKey: string } | null>(null);
  const [, force] = useState(0);

  const stats = useMemo(() => {
    const recOpen = RECONCILIATIONS.filter(r => r.status === 'in_progress' || r.status === 'discrepancy').length;
    const taxDue  = TAX_DOCS.filter(t => t.status === 'ready').reduce((s, t) => s + (t.amount ?? 0), 0);
    const reportsReady = ACCT_REPORTS.filter(r => r.status === 'ready').length;
    return { recOpen, taxDue, reportsReady };
  }, []);

  // Combine top items from all 3 collections
  const rows: PlaceholderRow[] = useMemo(() => {
    const all = [
      ...RECONCILIATIONS.map(it => ({ it, perm: 'accounting.reconciliations' })),
      ...ACCT_REPORTS.map(it => ({ it, perm: 'accounting.reports' })),
      ...TAX_DOCS.map(it => ({ it, perm: 'accounting.taxes' })),
    ];
    return all.slice(0, 6).map(({ it, perm }) => {
      const cs = ACCT_STATUS_LABELS[it.status];
      return {
        id: it.itemId, _it: it, _perm: perm,
        date: it.date,
        oper: <p className="text-sm font-semibold">{it.subject}</p>,
        amount: it.amount != null ? <span className="text-right block font-bold">{it.amount.toLocaleString('ru-RU')} {it.currency ?? ''}</span> : '—',
        status: <span className={`inline-flex w-fit px-1.5 py-0 rounded text-[10px] font-bold ${cs.cls}`}>{cs.label}</span>,
      };
    });
  }, []);

  return (
    <>
      <ModulePlaceholder
        permKey="accounting"
        icon={Calculator}
        section="Финансы"
        title="Бухгалтерия — сводка"
        subtitle="Сверки, выплаты, инвойсы, налоги, отчёты для бухгалтерии."
        kpis={[
          { label: 'К сверке',           value: stats.recOpen,                          color: 'orange', href: '/accounting/reconciliations' },
          { label: 'Налогов к уплате',   value: `${stats.taxDue.toLocaleString('ru-RU')} ₽`, color: 'red',  href: '/accounting/taxes' },
          { label: 'Готовых отчётов',    value: stats.reportsReady,                     color: 'green',  href: '/accounting/reports' },
          { label: 'Экспорт',            value: 'CSV/XLS',                              color: 'blue',   href: '/accounting/exports' },
        ]}
        columns={[
          { key: 'date',   label: 'Дата' },
          { key: 'oper',   label: 'Операция' },
          { key: 'amount', label: 'Сумма', align: 'right' },
          { key: 'status', label: 'Статус' },
        ]}
        rows={rows}
        onRowClick={r => setOpen({ item: (r as any)._it as AcctItem, permKey: (r as any)._perm as string })}
        hideCreate
        note="Бухгалтер: accounting.view. Главный бухгалтер дополнительно может утверждать крупные выплаты (accounting.payouts.approve)."
      />
      {open && <AccountingItemDrawer item={open.item} permKey={open.permKey} onClose={() => setOpen(null)} onChange={() => force(x => x + 1)} />}
    </>
  );
}
