import type { Bin } from '../domain/types';
import { zoneOf } from '../domain/zones';

export interface LocationBadgeProps {
  bin: Bin;
  variant?: 'short' | 'full';
}

/** Цветной бейдж локации.
 *  short: `RED · R-03 · A-02 · S-12 · P-04 · A-12-04`
 *  full:  `MSK-WH-01 / RED / Row R-03 / Aisle A-02 / Rack S-12 / Shelf P-04 / Cell A-12-04`
 */
export function LocationBadge({ bin, variant = 'short' }: LocationBadgeProps) {
  const z = zoneOf(bin.zone);

  if (variant === 'full') {
    return (
      <span
        className="text-[11px] font-mono inline-block px-2 py-1 rounded-md"
        style={{ backgroundColor: z.bg, color: z.fg, fontWeight: 700 }}
      >
        {bin.warehouse} / {z.code} / Row {bin.row} / Aisle {bin.aisle} / Rack {bin.rack} / Shelf {bin.shelf} / Cell {bin.cell}
      </span>
    );
  }

  return (
    <span
      className="text-[10px] font-mono inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ backgroundColor: z.bg, color: z.fg, fontWeight: 800 }}
    >
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: z.color }} />
      {z.code} · {bin.row} · {bin.aisle} · {bin.rack} · {bin.shelf} · {bin.cell}
    </span>
  );
}
