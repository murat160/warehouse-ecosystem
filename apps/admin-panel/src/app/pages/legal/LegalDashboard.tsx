import { Scale } from 'lucide-react';
import { ModulePlaceholder } from '../../components/layout/ModulePlaceholder';

export function LegalDashboard() {
  return (
    <ModulePlaceholder
      permKey="legal"
      icon={Scale}
      section="Юридический"
      title="Юридический отдел — сводка"
      subtitle="Договоры, претензии, споры, жалобы, юридические документы и отчёты."
      kpis={[
        { label: 'Открытые споры',     value: 6,  color: 'red'    },
        { label: 'Активные договоры',  value: 142, color: 'green' },
        { label: 'Претензии',          value: 11, color: 'orange' },
        { label: 'Документов в работе',value: 24, color: 'blue'   },
      ]}
      columns={[
        { key: 'date',   label: 'Дата' },
        { key: 'type',   label: 'Тип' },
        { key: 'subject',label: 'Предмет' },
        { key: 'status', label: 'Статус' },
      ]}
      rows={[
        { date: '14.02.2026', type: 'Спор',      subject: 'Кафе «Уют» — задержка выплаты', status: 'В работе' },
        { date: '13.02.2026', type: 'Договор',   subject: 'TechStore MSK — оферта 2026',   status: 'На подписании' },
        { date: '12.02.2026', type: 'Претензия', subject: 'ЭлектроМир — возврат iPhone',   status: 'Передано юристу' },
        { date: '10.02.2026', type: 'Жалоба',    subject: 'Жалоба покупателя #C-23145',    status: 'Закрыто' },
      ]}
      note="Юрист видит этот раздел при разрешении legal.view. Юрист не может проводить выплаты или менять финансы."
    />
  );
}
