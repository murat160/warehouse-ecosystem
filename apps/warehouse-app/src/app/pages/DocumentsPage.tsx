import { Download } from 'lucide-react';
import { useStore } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import type { DocumentType } from '../domain/types';

const TYPE_LABELS: Record<DocumentType, string> = {
  'TORG-12':         'ТОРГ-12',
  'manifest':        'Манифест поставки',
  'route_sheet':     'Маршрутный лист',
  'discrepancy_act': 'Акт расхождения',
};

export function DocumentsPage() {
  const { documents } = useStore();

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24 md:pb-8">
      <PageHeader title="Документы" subtitle={`Всего: ${documents.length}`} />
      <div className="px-5 -mt-5 space-y-2">
        {documents.length === 0 ? (
          <EmptyState emoji="📄" title="Документов нет" />
        ) : documents.map(d => (
          <div key={d.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-[14px] text-[#1F2430] truncate" style={{ fontWeight: 800 }}>
                {d.number}
              </div>
              <div className="text-[11px] text-[#6B7280] truncate" style={{ fontWeight: 500 }}>
                {TYPE_LABELS[d.type]} · {new Date(d.createdAt).toLocaleString('ru')}
              </div>
            </div>
            <button className="w-9 h-9 rounded-full bg-[#F3F4F6] flex items-center justify-center active-press flex-shrink-0">
              <Download className="w-4 h-4 text-[#374151]" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
