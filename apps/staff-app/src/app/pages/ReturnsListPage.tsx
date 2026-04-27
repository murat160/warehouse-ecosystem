import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronRight, RotateCcw } from 'lucide-react';
import { useAppState, store, lookupSkuFull } from '../hooks/useAppState';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { RMAStatusBadge } from '../components/Badges';
import { RETURN_REASON_LABELS, type RMAStatus } from '../data/mockData';

export function ReturnsListPage() {
  const state = useAppState();
  const nav = useNavigate();
  const [filter, setFilter] = useState<'all' | RMAStatus>('all');

  const rmas = filter === 'all' ? state.rmas : state.rmas.filter(r => r.status === filter);

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24">
      <PageHeader title="Возвраты" subtitle={`${state.rmas.length} RMA`} />

      <div className="px-5 -mt-3 mb-3 flex gap-2 overflow-x-auto">
        <Pill active={filter === 'all'}        onClick={() => setFilter('all')}>Все</Pill>
        <Pill active={filter === 'received'}   onClick={() => setFilter('received')}>Принятые</Pill>
        <Pill active={filter === 'inspecting'} onClick={() => setFilter('inspecting')}>На проверке</Pill>
        <Pill active={filter === 'damaged'}    onClick={() => setFilter('damaged')}>Брак</Pill>
      </div>

      <div className="px-5 space-y-2">
        {rmas.length === 0 ? (
          <EmptyState emoji="↩️" title="Возвратов нет" subtitle="С этим фильтром" />
        ) : (
          rmas.map(rma => {
            const firstItem = rma.items[0];
            const full = firstItem ? lookupSkuFull(firstItem.skuId, state.skus, state.products) : null;
            return (
              <button
                key={rma.id}
                onClick={() => nav(`/returns/${rma.id}`)}
                className="w-full bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm active-press text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-[#FFE4E6] flex items-center justify-center">
                  <RotateCcw className="w-6 h-6 text-[#F43F5E]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] text-[#1F2430]" style={{ fontWeight: 800 }}>
                    {rma.id}
                  </div>
                  <div className="text-[12px] text-[#6B7280] truncate" style={{ fontWeight: 500 }}>
                    {rma.customerName} · {RETURN_REASON_LABELS[rma.reason]}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <RMAStatusBadge status={rma.status} size="sm" />
                    {full && (
                      <span className="text-[11px] text-[#1F2430]" style={{ fontWeight: 600 }}>
                        {full.product?.photoEmoji} {full.product?.name}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[#9CA3AF]" />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: any }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-2 rounded-full text-[12px] whitespace-nowrap"
      style={{ backgroundColor: active ? '#1F2430' : 'white', color: active ? 'white' : '#1F2430', fontWeight: 700 }}
    >
      {children}
    </button>
  );
}
