import { FileSpreadsheet } from 'lucide-react';
import { ModulePlaceholder } from '../../components/layout/ModulePlaceholder';

export function LegalReports() {
  return (
    <ModulePlaceholder
      permKey="legal.reports"
      icon={FileSpreadsheet}
      section="Юридический"
      title="Юридические отчёты"
      subtitle="Сводные отчёты по спорам, претензиям, договорам, рискам."
      kpis={[
        { label: 'Готовых отчётов', value: 18, color: 'green' },
        { label: 'В работе',        value: 4,  color: 'orange' },
        { label: 'Сумма исков',     value: '₽2.4 млн', color: 'red' },
      ]}
      columns={[
        { key: 'name',   label: 'Отчёт' },
        { key: 'period', label: 'Период' },
        { key: 'updated',label: 'Обновлён' },
        { key: 'status', label: 'Статус' },
      ]}
      rows={[
        { name: 'Реестр споров',          period: 'Q4 2025', updated: '01.02.2026', status: 'Готов' },
        { name: 'Анализ претензий',       period: 'Янв 2026', updated: '12.02.2026', status: 'Готов' },
        { name: 'Истекающие договоры',    period: '2026',    updated: '14.02.2026', status: 'В работе' },
      ]}
    />
  );
}
