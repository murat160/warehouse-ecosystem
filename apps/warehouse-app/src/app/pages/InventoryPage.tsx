import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { ZoneBadge } from '../components/ZoneBadge';
import { SkuThumb } from '../components/SkuThumb';
import { ZONE_CODES, type ZoneCode } from '../domain/zones';

export function InventoryPage() {
  const { inventory, skus, bins } = useStore();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [zone, setZone] = useState<ZoneCode | 'ALL'>('ALL');
  const [cat, setCat] = useState<string>('ALL');

  const categories = Array.from(new Set(skus.map(s => s.category)));

  const rows = inventory.filter(i => {
    const sku = skus.find(s => s.sku === i.sku);
    if (!sku) return false;
    if (q) {
      const n = q.toLowerCase();
      if (!sku.sku.toLowerCase().includes(n)
        && !sku.name.toLowerCase().includes(n)
        && !sku.barcode.toLowerCase().includes(n)) return false;
    }
    if (zone !== 'ALL') {
      const inZone = i.bins.some(bid => bins.find(b => b.id === bid)?.zone === zone);
      if (!inZone) return false;
    }
    if (cat !== 'ALL' && sku.category !== cat) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24 md:pb-8">
      <PageHeader title="Остатки" subtitle={`Позиций: ${inventory.length}`} />

      <div className="px-5 -mt-5">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Поиск по SKU, названию или штрихкоду"
          className="w-full px-3 py-3 rounded-xl border-2 border-[#E5E7EB] focus:border-[#2EA7E0] focus:outline-none text-[14px] mb-2"
          style={{ fontWeight: 500 }}
        />
        <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
          <Pill active={zone === 'ALL'} onClick={() => setZone('ALL')}>Все зоны</Pill>
          {ZONE_CODES.map(z => (
            <Pill key={z} active={zone === z} onClick={() => setZone(z)}>{z}</Pill>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
          <Pill active={cat === 'ALL'} onClick={() => setCat('ALL')}>Все категории</Pill>
          {categories.map(c => (
            <Pill key={c} active={cat === c} onClick={() => setCat(c)}>{c}</Pill>
          ))}
        </div>

        {rows.length === 0 ? (
          <EmptyState emoji="📦" title="Ничего не найдено" />
        ) : (
          <div className="space-y-2">
            {rows.map(i => {
              const sku = skus.find(s => s.sku === i.sku)!;
              const firstBin = bins.find(b => b.id === i.bins[0]);
              return (
                <div key={i.sku} className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <SkuThumb sku={sku} size={56} binId={firstBin?.id} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] text-[#1F2430] truncate" style={{ fontWeight: 800 }}>{sku.name}</div>
                      <div className="text-[11px] text-[#6B7280] font-mono truncate" style={{ fontWeight: 600 }}>
                        {sku.sku} · BC {sku.barcode}
                      </div>
                      <div className="text-[11px] text-[#6B7280] mt-1" style={{ fontWeight: 500 }}>{sku.category}</div>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {firstBin && <ZoneBadge zone={firstBin.zone} binId={firstBin.id} />}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[20px] text-[#1F2430]" style={{ fontWeight: 900 }}>{i.totalStock - i.reserved}</div>
                      <div className="text-[10px] text-[#6B7280]" style={{ fontWeight: 600 }}>доступно</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 mt-3 text-center">
                    <Mini label="Всего"     value={i.totalStock} />
                    <Mini label="Резерв"    value={i.reserved}  />
                    <Mini label="Брак"      value={i.damaged}   />
                    <Mini label="Возвраты"  value={i.returned}  />
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => nav('/movements')}
                      className="flex-1 h-9 rounded-lg bg-[#0EA5E9] text-white text-[12px] active-press" style={{ fontWeight: 700 }}
                    >Переместить</button>
                    <button
                      onClick={() => nav('/count')}
                      className="flex-1 h-9 rounded-lg bg-[#7C3AED] text-white text-[12px] active-press" style={{ fontWeight: 700 }}
                    >Инвентаризация</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[#F9FAFB] rounded-md p-1.5">
      <div className="text-[14px] text-[#1F2430]" style={{ fontWeight: 800 }}>{value}</div>
      <div className="text-[9px] text-[#6B7280]" style={{ fontWeight: 600 }}>{label}</div>
    </div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="px-3 h-8 rounded-full text-[11px] whitespace-nowrap active-press"
      style={{ backgroundColor: active ? '#1F2430' : 'white', color: active ? 'white' : '#1F2430', fontWeight: 700 }}
    >{children}</button>
  );
}
