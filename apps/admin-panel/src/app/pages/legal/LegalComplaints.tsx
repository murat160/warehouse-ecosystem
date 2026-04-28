import { MessageSquare } from 'lucide-react';
import { ModulePlaceholder } from '../../components/layout/ModulePlaceholder';

export function LegalComplaints() {
  return (
    <ModulePlaceholder
      permKey="legal.complaints"
      icon={MessageSquare}
      section="Юридический"
      title="Жалобы"
      subtitle="Жалобы покупателей и контрагентов, требующие юридической оценки."
      kpis={[
        { label: 'Открытые',  value: 14, color: 'orange' },
        { label: 'В работе',  value: 7,  color: 'blue' },
        { label: 'Закрытые',  value: 56, color: 'green' },
      ]}
      columns={[
        { key: 'no',     label: '№' },
        { key: 'date',   label: 'Дата' },
        { key: 'from',   label: 'От' },
        { key: 'subject',label: 'Предмет' },
        { key: 'status', label: 'Статус' },
      ]}
      rows={[
        { no: 'CMP-098', date: '14.02.2026', from: 'Покупатель',  subject: 'Качество товара', status: 'Открыта' },
        { no: 'CMP-097', date: '12.02.2026', from: 'TextileShop', subject: 'Удержание выплат', status: 'В работе' },
      ]}
    />
  );
}
