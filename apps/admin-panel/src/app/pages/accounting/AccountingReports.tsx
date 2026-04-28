import { FileSpreadsheet } from 'lucide-react';
import { ModulePlaceholder } from '../../components/layout/ModulePlaceholder';

export function AccountingReports() {
  return (
    <ModulePlaceholder
      permKey="accounting.reports"
      icon={FileSpreadsheet}
      section="Финансы / Бухгалтерия"
      title="Отчёты бухгалтерии"
      subtitle="Финансовые и налоговые отчёты, доступные бухгалтеру и главному бухгалтеру."
      kpis={[
        { label: 'Готовых отчётов',  value: 24, color: 'green'  },
        { label: 'В работе',         value: 5,  color: 'orange' },
        { label: 'За год',           value: '₽46 млн', color: 'blue' },
        { label: 'Налогов уплачено', value: '₽3.2 млн', color: 'purple' },
      ]}
      columns={[
        { key: 'name',   label: 'Отчёт' },
        { key: 'period', label: 'Период' },
        { key: 'updated',label: 'Обновлён' },
        { key: 'status', label: 'Статус' },
      ]}
      rows={[
        { name: 'Книга продаж',           period: 'Q4 2025',  updated: '01.02.2026', status: 'Готов' },
        { name: 'НДС-декларация',         period: 'Q4 2025',  updated: '03.02.2026', status: 'Подан' },
        { name: 'Сверка с банком',        period: 'Янв 2026', updated: '12.02.2026', status: 'В работе' },
        { name: 'Оборот по контрагентам', period: 'Янв 2026', updated: '14.02.2026', status: 'Готов' },
      ]}
    />
  );
}
