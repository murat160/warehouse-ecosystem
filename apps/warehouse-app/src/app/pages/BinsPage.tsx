import { useStore } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';

export function BinsPage() {
  const { bins } = useStore();

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24 md:pb-8">
      <PageHeader title="Ячейки" subtitle={`Всего: ${bins.length}`} />

      <div className="px-5 -mt-5 grid grid-cols-2 md:grid-cols-3 gap-3">
        {bins.map(b => {
          const fill = b.capacity > 0 ? Math.round((b.occupied / b.capacity) * 100) : 0;
          const inactive = b.status !== 'active';
          const barColor = inactive
            ? '#9CA3AF'
            : fill >= 90 ? '#EF4444'
            : fill >= 70 ? '#F59E0B'
            : '#10B981';
          return (
            <div key={b.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[14px] text-[#1F2430] font-mono" style={{ fontWeight: 800 }}>
                  {b.code}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#374151]" style={{ fontWeight: 700 }}>
                  {b.zone}
                </span>
              </div>
              <div className="h-2 bg-[#F3F4F6] rounded-full overflow-hidden mb-1">
                <div className="h-full" style={{ width: `${fill}%`, backgroundColor: barColor }} />
              </div>
              <div className="text-[11px] text-[#6B7280]" style={{ fontWeight: 600 }}>
                {b.occupied} / {b.capacity}
                {inactive && ` · ${b.status}`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
