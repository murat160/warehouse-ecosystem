import { AlertTriangle } from 'lucide-react';
import { ModulePlaceholder } from '../../components/layout/ModulePlaceholder';

export function LegalDisputes() {
  return (
    <ModulePlaceholder
      permKey="legal.disputes"
      icon={AlertTriangle}
      section="Юридический"
      title="Споры"
      subtitle="Открытые, в суде, урегулированные споры с контрагентами."
      kpis={[
        { label: 'В работе',  value: 6,  color: 'red'    },
        { label: 'В суде',    value: 2,  color: 'orange' },
        { label: 'Урегулировано', value: 18, color: 'green' },
        { label: 'Сумма исков', value: '₽2.4 млн', color: 'blue' },
      ]}
      columns={[
        { key: 'no',     label: '№' },
        { key: 'partner',label: 'Сторона' },
        { key: 'amount', label: 'Сумма', align: 'right' },
        { key: 'opened', label: 'Открыт' },
        { key: 'status', label: 'Статус' },
      ]}
      rows={[
        { no: 'DSP-014', partner: 'Кафе «Уют»',     amount: '₽120 000', opened: '01.02.2026', status: 'В работе' },
        { no: 'DSP-013', partner: 'TechStore MSK',  amount: '₽540 000', opened: '15.01.2026', status: 'В суде' },
        { no: 'DSP-012', partner: 'Покупатель #C-23145', amount: '₽12 800', opened: '20.01.2026', status: 'Урегулировано' },
      ]}
    />
  );
}
