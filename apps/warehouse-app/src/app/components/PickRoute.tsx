import type { Bin, OrderItem, Sku } from '../domain/types';
import { LocationBadge } from './LocationBadge';

export interface PickRouteProps {
  items: OrderItem[];
  bins: Bin[];
  skus: Sku[];
}

/**
 * Сортирует позиции заказа по локации (zone → row → aisle → rack → shelf → cell)
 * и показывает прогресс маршрута: текущий шаг, следующий товар, осталось.
 */
export function PickRoute({ items, bins, skus }: PickRouteProps) {
  const route = [...items].sort((a, b) => sortKey(bins, a).localeCompare(sortKey(bins, b)));
  const total = route.length;
  const done = route.filter(i => i.status === 'found').length;
  const current = route.find(i => i.status !== 'found');
  const next = route.find(i => i.status !== 'found' && i.id !== current?.id);
  const currentSku = current ? skus.find(s => s.sku === current.sku) : null;
  const nextSku    = next    ? skus.find(s => s.sku === next.sku)    : null;
  const currentBin = current ? bins.find(b => b.id === current.binId) : null;
  const nextBin    = next    ? bins.find(b => b.id === next.binId)    : null;
  const pct = total === 0 ? 100 : Math.round((done / total) * 100);

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] text-[#6B7280]" style={{ fontWeight: 700 }}>Маршрут сборки</span>
        <span className="text-[12px] text-[#1F2430]" style={{ fontWeight: 800 }}>{done} / {total}</span>
      </div>
      <div className="h-2 bg-[#F3F4F6] rounded-full overflow-hidden mb-3">
        <div className="h-full" style={{ width: `${pct}%`, backgroundColor: '#10B981' }} />
      </div>

      {current ? (
        <div className="bg-[#F9FAFB] rounded-xl p-3 mb-2">
          <div className="text-[10px] text-[#6B7280] mb-1" style={{ fontWeight: 700 }}>СЕЙЧАС</div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[24px]">{currentSku?.photo ?? '📦'}</span>
            <div className="min-w-0">
              <div className="text-[13px] text-[#1F2430] truncate" style={{ fontWeight: 800 }}>{currentSku?.name ?? current.sku}</div>
              <div className="text-[11px] text-[#6B7280] font-mono truncate" style={{ fontWeight: 600 }}>
                {current.sku} · ×{current.qty}
              </div>
            </div>
          </div>
          {currentBin && <LocationBadge bin={currentBin} />}
        </div>
      ) : (
        <div className="text-[13px] text-[#10B981] text-center py-2" style={{ fontWeight: 800 }}>
          ✅ Все позиции собраны
        </div>
      )}

      {next && (
        <div className="bg-[#F3F4F6] rounded-xl p-2 flex items-center gap-2 opacity-80">
          <span className="text-[10px] text-[#6B7280]" style={{ fontWeight: 700 }}>ДАЛЕЕ:</span>
          <span className="text-[18px]">{nextSku?.photo ?? '📦'}</span>
          <span className="text-[11px] text-[#1F2430] truncate flex-1" style={{ fontWeight: 700 }}>{nextSku?.name ?? next.sku}</span>
          {nextBin && <span className="text-[10px] font-mono text-[#374151]" style={{ fontWeight: 700 }}>{nextBin.cell}</span>}
        </div>
      )}
    </div>
  );
}

function sortKey(bins: Bin[], it: OrderItem) {
  const b = bins.find(x => x.id === it.binId);
  if (!b) return 'zzz';
  return `${b.zone}|${b.row}|${b.aisle}|${b.rack}|${b.shelf}|${b.cell}`;
}
