import { TrendingUp } from 'lucide-react';
import { ModulePlaceholder } from '../../components/layout/ModulePlaceholder';

export function BoostPage() {
  return (
    <ModulePlaceholder
      permKey="promotions.boost" icon={TrendingUp} section="Каталог"
      title="Продвигаемые товары"
      subtitle="Sponsored / приоритет фирмы / boost категории / boost поиска."
      kpis={[
        { label: 'Активных',   value: 18, color: 'green' },
        { label: 'Sponsored',  value: 5,  color: 'orange' },
        { label: 'Приоритет фирмы', value: 7, color: 'purple' },
        { label: 'CTR',        value: '4.2%', color: 'blue' },
      ]}
      columns={[
        { key: 'product',  label: 'Товар' },
        { key: 'mode',     label: 'Режим' },
        { key: 'position', label: 'Позиция' },
        { key: 'priority', label: 'Приоритет', align: 'right' as const },
        { key: 'starts',   label: 'С' },
      ]}
      rows={[
        { product: 'iPhone 15 Pro 256 GB',          mode: 'Manual',      position: 'home',    priority: '#1', starts: '01.02.2026' },
        { product: 'Пицца «Маргарита» 30 см',       mode: 'Sponsored',   position: 'sale',    priority: '#1', starts: '10.02.2026' },
        { product: 'PVZ · Брендированный картон XL', mode: 'Company',    position: 'for_you', priority: '#5', starts: '01.02.2026' },
      ]}
    />
  );
}
