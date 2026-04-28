import { zoneOf, type ZoneCode } from '../domain/zones';

export interface ZoneBadgeProps {
  zone: ZoneCode | string;
  binId?: string;
  showName?: boolean;
  size?: 'sm' | 'md';
}

export function ZoneBadge({ zone, binId, showName = true, size = 'sm' }: ZoneBadgeProps) {
  const z = zoneOf(zone as any);
  const px = size === 'md' ? 'px-3 py-1.5 text-[12px]' : 'px-2 py-1 text-[10px]';
  return (
    <span
      className={`${px} rounded-full inline-flex items-center gap-1.5 whitespace-nowrap`}
      style={{ backgroundColor: z.bg, color: z.fg, fontWeight: 800 }}
    >
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: z.color }} />
      {showName && z.name}
      {binId && <span className="font-mono opacity-90">· {binId}</span>}
    </span>
  );
}
