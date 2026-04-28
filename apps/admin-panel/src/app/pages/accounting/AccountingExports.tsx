import { FileText } from 'lucide-react';
import { ModulePlaceholder } from '../../components/layout/ModulePlaceholder';

export function AccountingExports() {
  return (
    <ModulePlaceholder
      permKey="accounting.exports"
      icon={FileText}
      section="Финансы / Бухгалтерия"
      title="Экспорт для бухгалтера"
      subtitle="CSV / XLS / 1С-выгрузки за выбранный период."
      kpis={[
        { label: 'Шаблонов',     value: 12, color: 'blue' },
        { label: 'Сделано выгрузок', value: 86, color: 'green' },
        { label: 'Запланировано',value: 4,  color: 'orange' },
      ]}
      columns={[
        { key: 'name',   label: 'Выгрузка' },
        { key: 'format', label: 'Формат' },
        { key: 'period', label: 'Период' },
        { key: 'date',   label: 'Дата запроса' },
      ]}
      rows={[
        { name: 'Платежи продавцам',     format: 'CSV',   period: 'Янв 2026', date: '12.02.2026' },
        { name: 'Платежи курьерам',      format: 'XLS',   period: 'Янв 2026', date: '12.02.2026' },
        { name: 'Возвраты',              format: 'CSV',   period: 'Q4 2025',  date: '31.01.2026' },
        { name: 'Книга покупок (1С)',    format: '1C',    period: 'Q4 2025',  date: '15.01.2026' },
      ]}
    />
  );
}
