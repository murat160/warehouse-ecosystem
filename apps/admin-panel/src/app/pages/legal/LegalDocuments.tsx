import { ClipboardList } from 'lucide-react';
import { ModulePlaceholder } from '../../components/layout/ModulePlaceholder';

export function LegalDocuments() {
  return (
    <ModulePlaceholder
      permKey="legal.documents"
      icon={ClipboardList}
      section="Юридический"
      title="Юридические документы"
      subtitle="Уставные, лицензии, документы продавцов, ПВЗ, складов."
      kpis={[
        { label: 'Всего',           value: 248, color: 'blue'   },
        { label: 'Истекают в 30 дн', value: 12, color: 'orange' },
        { label: 'Просрочено',      value: 3,   color: 'red'    },
        { label: 'Запросов отправлено', value: 18, color: 'purple' },
      ]}
      columns={[
        { key: 'name',   label: 'Документ' },
        { key: 'owner',  label: 'Владелец' },
        { key: 'expires',label: 'Действует до' },
        { key: 'status', label: 'Статус' },
      ]}
      rows={[
        { name: 'Устав ООО',                 owner: 'PVZ Platform',    expires: 'бессрочно',   status: 'Активен' },
        { name: 'Свидетельство ИНН',        owner: 'PVZ Platform',    expires: 'бессрочно',   status: 'Активен' },
        { name: 'Лицензия на алкоголь',     owner: 'Кафе «Уют»',      expires: '01.06.2026',   status: 'Действует' },
        { name: 'СЭС-заключение',           owner: 'Пекарня «Хлеб»',  expires: '01.03.2026',   status: 'Истекает' },
      ]}
    />
  );
}
