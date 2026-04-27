import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Truck, AlertTriangle } from 'lucide-react';
import { useAppState, store } from '../hooks/useAppState';
import { type InboundStatus } from '../data/mockData';
import { InboundStatusBadge, RiskBadge } from '../components/Badges';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';

export function InboundListPage() {
  const state = useAppState();
  const nav = useNavigate();
  const [filter, setFilter] = useState<'all' | InboundStatus>('all');

  const filtered = filter === 'all' ? state.asns : state.asns.filter(a => a.status === filter);

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24">
      <PageHeader title="Приёмка" subtitle={`${state.asns.length} поставок · ${state.asns.filter(a => a.status === 'arrived' || a.status === 'docked').length} ожидают`} />

      <div className="px-5 -mt-3 mb-3 flex gap-2 overflow-x-auto">
        <Pill active={filter === 'all'}      onClick={() => setFilter('all')}>Все</Pill>
        <Pill active={filter === 'expected'} onClick={() => setFilter('expected')}>Ожидаются</Pill>
        <Pill active={filter === 'arrived'}  onClick={() => setFilter('arrived')}>Прибыли</Pill>
        <Pill active={filter === 'receiving'}onClick={() => setFilter('receiving')}>В работе</Pill>
        <Pill active={filter === 'received'} onClick={() => setFilter('received')}>Принятые</Pill>
        <Pill active={filter === 'discrepancy'} onClick={() => setFilter('discrepancy')}>Расхождения</Pill>
      </div>

      <div className="px-5 space-y-2">
        {filtered.length === 0 ? (
          <EmptyState emoji="📦" title="Поставок нет" subtitle="С этим фильтром" />
        ) : (
          filtered.map(asn => {
            const seller = store.findSeller(asn.sellerId);
            const totalQty = asn.items.reduce((s, it) => s + it.expectedQty, 0);
            return (
              <button
                key={asn.id}
                onClick={() => nav(`/inbound/${asn.id}`)}
                className="w-full bg-white rounded-2xl p-4 shadow-sm active-press text-left"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-[#E0F2FE] flex items-center justify-center">
                      <Truck className="w-5 h-5 text-[#2EA7E0]" />
                    </div>
                    <div>
                      <div className="text-[14px] text-[#1F2430]" style={{ fontWeight: 800 }}>
                        {asn.id}
                      </div>
                      <div className="text-[11px] text-[#6B7280]" style={{ fontWeight: 500 }}>
                        Манифест: {asn.manifestNo}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#9CA3AF]" />
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3 mb-2">
                  <Cell label="Боксов" value={asn.boxCount.toString()} />
                  <Cell label="Паллет" value={asn.palletCount.toString()} />
                  <Cell label="Единиц" value={totalQty.toString()} />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <InboundStatusBadge status={asn.status} size="sm" />
                  {seller && (
                    <span className="text-[11px] text-[#6B7280]" style={{ fontWeight: 600 }}>
                      {seller.name}
                    </span>
                  )}
                  {seller && <RiskBadge risk={seller.riskScore} />}
                  {asn.dockNo && (
                    <span className="text-[11px] text-[#1F2430]" style={{ fontWeight: 700 }}>
                      🚪 {asn.dockNo}
                    </span>
                  )}
                  {seller?.riskScore === 'high' && (
                    <span className="text-[10px] text-[#EF4444] flex items-center gap-1" style={{ fontWeight: 700 }}>
                      <AlertTriangle className="w-3 h-3" />
                      100% QC
                    </span>
                  )}
                </div>
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

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#F9FAFB] rounded-lg p-2">
      <div className="text-[16px] text-[#1F2430]" style={{ fontWeight: 900 }}>{value}</div>
      <div className="text-[10px] text-[#6B7280]" style={{ fontWeight: 600 }}>{label}</div>
    </div>
  );
}
