import { Sparkles } from 'lucide-react';
import { ModulePlaceholder } from '../../components/layout/ModulePlaceholder';

export function CampaignsPage() {
  return (
    <ModulePlaceholder
      permKey="promotions.campaigns" icon={Sparkles} section="Каталог"
      title="Кампании"
      subtitle="Многоэтапные маркетинговые кампании: акции + скидки + push-уведомления."
      kpis={[
        { label: 'Активных',  value: 8,  color: 'green' },
        { label: 'Запланировано', value: 4, color: 'blue' },
        { label: 'Завершено', value: 24, color: 'gray' },
        { label: 'Продаж',    value: '+18%', color: 'purple' },
      ]}
      columns={[
        { key: 'name',     label: 'Кампания' },
        { key: 'starts',   label: 'С' },
        { key: 'ends',     label: 'По' },
        { key: 'budget',   label: 'Бюджет', align: 'right' as const },
        { key: 'status',   label: 'Статус' },
      ]}
      rows={[
        { name: '14 февраля',          starts: '10.02.2026', ends: '14.02.2026', budget: '₽120 000', status: 'Активна' },
        { name: 'Весенняя распродажа', starts: '01.03.2026', ends: '15.03.2026', budget: '₽340 000', status: 'Запланирована' },
        { name: 'Чёрная пятница',      starts: '24.11.2025', ends: '30.11.2025', budget: '₽890 000', status: 'Завершена' },
      ]}
    />
  );
}
