import { useMemo, useState } from 'react';
import { FileText } from 'lucide-react';
import { toast } from 'sonner';
import { ModulePlaceholder, type PlaceholderRow } from '../../components/layout/ModulePlaceholder';
import { AccountingItemDrawer } from '../../components/accounting/AccountingItemDrawer';
import { exportToCsv } from '../../utils/downloads';
import {
  ACCT_EXPORTS, ACCT_STATUS_LABELS,
  type AcctItem,
} from '../../data/accounting-mock';

function downloadAsTxt(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

export function AccountingExports() {
  const [open, setOpen] = useState<AcctItem | null>(null);
  const [, force]       = useState(0);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => ACCT_EXPORTS.filter(e => {
    const q = search.toLowerCase();
    return !q || e.subject.toLowerCase().includes(q) || e.number.toLowerCase().includes(q);
  }), [search]);

  function downloadExport(it: AcctItem, format: 'CSV' | 'XLS' | '1C') {
    if (format === 'CSV') {
      exportToCsv([{
        number: it.number, subject: it.subject, period: it.period ?? '',
        status: ACCT_STATUS_LABELS[it.status].label,
      }] as any[], [
        { key: 'number',  label: '№' },
        { key: 'subject', label: 'Предмет' },
        { key: 'period',  label: 'Период' },
        { key: 'status',  label: 'Статус' },
      ], it.number);
    } else {
      downloadAsTxt(`${it.number}.${format.toLowerCase()}.txt`,
        `# ${it.subject}\nПериод: ${it.period}\nФормат: ${format}\n\n(Mock — будет реальный файл после интеграции backend.)`);
    }
    toast.success(`Скачан: ${it.number} · ${format}`);
  }

  const rows: PlaceholderRow[] = filtered.map(it => {
    const cs = ACCT_STATUS_LABELS[it.status];
    return {
      id: it.itemId, _it: it,
      name:   <p className="font-semibold">{it.subject}</p>,
      number: <span className="font-mono text-xs">{it.number}</span>,
      period: it.period,
      date:   it.date,
      formats: (
        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
          <button onClick={() => downloadExport(it, 'CSV')} className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[10px] font-bold border border-blue-200">CSV</button>
          <button onClick={() => downloadExport(it, 'XLS')} className="px-2 py-0.5 bg-green-50 hover:bg-green-100 text-green-700 rounded text-[10px] font-bold border border-green-200">XLS</button>
          <button onClick={() => downloadExport(it, '1C')}  className="px-2 py-0.5 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded text-[10px] font-bold border border-orange-200">1C</button>
        </div>
      ),
      status: <span className={`inline-flex w-fit px-1.5 py-0 rounded text-[10px] font-bold ${cs.cls}`}>{cs.label}</span>,
    };
  });

  return (
    <>
      <ModulePlaceholder
        permKey="accounting.exports"
        icon={FileText}
        section="Финансы / Бухгалтерия"
        title="Экспорт для бухгалтера"
        subtitle="CSV / XLS / 1С-выгрузки за выбранный период."
        kpis={[
          { label: 'Шаблонов',          value: ACCT_EXPORTS.length, color: 'blue' },
          { label: 'Сделано выгрузок',  value: 86,                  color: 'green' },
          { label: 'Запланировано',     value: 4,                   color: 'orange' },
        ]}
        columns={[
          { key: 'name',    label: 'Выгрузка' },
          { key: 'number',  label: '№' },
          { key: 'period',  label: 'Период' },
          { key: 'date',    label: 'Запрошен' },
          { key: 'formats', label: 'Скачать' },
          { key: 'status',  label: 'Статус' },
        ]}
        rows={rows}
        searchValue={search}
        onSearchChange={setSearch}
        onRowClick={r => setOpen((r as any)._it as AcctItem)}
        hideCreate
        note="Клик по строке — открыть карточку. Кнопки в колонке «Скачать» — скачивают файл сразу."
      />
      {open && <AccountingItemDrawer item={open} permKey="accounting.exports" onClose={() => setOpen(null)} onChange={() => force(x => x + 1)} />}
    </>
  );
}
