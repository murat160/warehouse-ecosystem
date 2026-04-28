import { CheckCircle2 } from 'lucide-react';
import { ModulePlaceholder } from '../../components/layout/ModulePlaceholder';

export function AccountingReconciliations() {
  return (
    <ModulePlaceholder
      permKey="accounting.reconciliations"
      icon={CheckCircle2}
      section="Финансы / Бухгалтерия"
      title="Сверки"
      subtitle="Сверка платежей с продавцами, банком, налоговой."
      kpis={[
        { label: 'Открытые сверки', value: 9,   color: 'orange' },
        { label: 'Подтверждённые',  value: 142, color: 'green' },
        { label: 'Расхождения',     value: 3,   color: 'red'   },
        { label: 'Сумма',           value: '₽5.8 млн', color: 'blue' },
      ]}
      columns={[
        { key: 'period', label: 'Период' },
        { key: 'partner', label: 'Контрагент' },
        { key: 'docs',   label: 'Документы' },
        { key: 'amount', label: 'Сумма', align: 'right' },
        { key: 'status', label: 'Статус' },
      ]}
      rows={[
        { period: 'Янв 2026', partner: 'ЭлектроМир',      docs: '12 шт.', amount: '₽1 240 000', status: 'Подтверждено' },
        { period: 'Янв 2026', partner: 'TextileShop',     docs: '8 шт.',  amount: '₽342 100',   status: 'Расхождение ₽1 200' },
        { period: 'Янв 2026', partner: 'Кафе «Уют»',      docs: '15 шт.', amount: '₽89 600',    status: 'В работе' },
        { period: 'Дек 2025', partner: 'TechStore MSK',   docs: '6 шт.',  amount: '₽512 400',   status: 'Закрыто' },
      ]}
    />
  );
}
