import { FileText } from 'lucide-react';
import { ModulePlaceholder } from '../../components/layout/ModulePlaceholder';

export function LegalContracts() {
  return (
    <ModulePlaceholder
      permKey="legal.contracts"
      icon={FileText}
      section="Юридический"
      title="Договоры"
      subtitle="Реестр договоров с продавцами, курьерами, поставщиками, ПВЗ."
      kpis={[
        { label: 'Активных',   value: 142, color: 'green'  },
        { label: 'Истекают',   value: 6,   color: 'orange' },
        { label: 'На подписании', value: 4, color: 'blue'  },
        { label: 'Расторгнутых', value: 18, color: 'red'   },
      ]}
      columns={[
        { key: 'no',       label: '№' },
        { key: 'partner',  label: 'Контрагент' },
        { key: 'subject',  label: 'Предмет' },
        { key: 'started',  label: 'С' },
        { key: 'expires',  label: 'По' },
        { key: 'status',   label: 'Статус' },
      ]}
      rows={[
        { no: 'Д-2026-001', partner: 'ЭлектроМир',     subject: 'Оферта',           started: '01.01.2026', expires: '31.12.2026', status: 'Активен' },
        { no: 'Д-2026-014', partner: 'TextileShop',    subject: 'Оферта',           started: '15.01.2026', expires: '15.01.2027', status: 'Активен' },
        { no: 'Д-2026-027', partner: 'Кафе «Уют»',     subject: 'Доп. соглашение',   started: '01.02.2026', expires: '—',         status: 'На подписании' },
        { no: 'Д-2025-098', partner: 'TechStore MSK',  subject: 'Оферта',           started: '15.05.2025', expires: '15.03.2026', status: 'Истекает' },
      ]}
    />
  );
}
