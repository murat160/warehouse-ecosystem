import { Calculator } from 'lucide-react';
import { ModulePlaceholder } from '../../components/layout/ModulePlaceholder';

export function AccountingTaxes() {
  return (
    <ModulePlaceholder
      permKey="accounting.taxes"
      icon={Calculator}
      section="Финансы / Бухгалтерия"
      title="Налоговые документы"
      subtitle="Декларации, платёжки, переписка с налоговой."
      kpis={[
        { label: 'Подано',          value: 18, color: 'green' },
        { label: 'В работе',        value: 3,  color: 'orange' },
        { label: 'К оплате',        value: '₽284 300', color: 'red' },
        { label: 'Уплачено в Q4',   value: '₽1.8 млн', color: 'blue' },
      ]}
      columns={[
        { key: 'name',   label: 'Документ' },
        { key: 'period', label: 'Период' },
        { key: 'amount', label: 'Сумма', align: 'right' },
        { key: 'status', label: 'Статус' },
      ]}
      rows={[
        { name: 'НДС-декларация',  period: 'Q4 2025', amount: '₽284 300', status: 'Подана' },
        { name: 'Налог на прибыль',period: '2025',    amount: '₽1 120 000', status: 'Готова к подаче' },
        { name: 'Страховые взносы',period: 'Янв 2026',amount: '₽98 600',  status: 'Уплачены' },
      ]}
    />
  );
}
