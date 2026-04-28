import { ArrowDownToLine } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';

export function InboundPage() {
  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24 md:pb-8">
      <PageHeader
        title="Приёмка"
        subtitle="Входящие поставки от продавцов"
        right={<ArrowDownToLine className="w-5 h-5 text-white/70" />}
      />
      <div className="px-5 -mt-5">
        <EmptyState
          emoji="📥"
          title="Поставки появятся здесь"
          subtitle="ASN передаются из admin-panel; статусы пишутся обратно после приёмки"
        />
      </div>
    </div>
  );
}
