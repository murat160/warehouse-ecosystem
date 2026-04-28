import { AlertTriangle } from 'lucide-react';
import { ModulePlaceholder } from '../../components/layout/ModulePlaceholder';

export function LegalClaims() {
  return (
    <ModulePlaceholder
      permKey="legal.claims"
      icon={AlertTriangle}
      section="Юридический"
      title="Претензии"
      subtitle="Претензии от продавцов, покупателей, контрагентов."
      kpis={[
        { label: 'Открытые',     value: 11, color: 'orange' },
        { label: 'В работе',     value: 5,  color: 'blue'   },
        { label: 'Удовлетворены',value: 24, color: 'green'  },
        { label: 'Отклонены',    value: 8,  color: 'red'    },
      ]}
      columns={[
        { key: 'no',     label: '№' },
        { key: 'date',   label: 'Дата' },
        { key: 'from',   label: 'От' },
        { key: 'subject',label: 'Предмет' },
        { key: 'status', label: 'Статус' },
      ]}
      rows={[
        { no: 'CL-026', date: '14.02.2026', from: 'ЭлектроМир',   subject: 'Возврат iPhone 15 Pro',  status: 'В работе' },
        { no: 'CL-025', date: '12.02.2026', from: 'Покупатель',   subject: 'Качество доставки',      status: 'Открыта' },
        { no: 'CL-024', date: '10.02.2026', from: 'TextileShop',  subject: 'Срок выплат',            status: 'Удовлетворена' },
      ]}
    />
  );
}
