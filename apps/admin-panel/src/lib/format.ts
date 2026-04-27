export function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }); }
  catch { return iso; }
}

export function fmtRelative(iso?: string | null): string {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function statusBadgeColor(status: string): string {
  const s = status.toUpperCase();
  if (s.includes('COMPLETED') || s === 'ACTIVE' || s === 'AVAILABLE' || s === 'DELIVERED') return 'bg-emerald-100 text-emerald-700';
  if (s.includes('PROGRESS') || s.includes('PICKING') || s.includes('PACKING')) return 'bg-amber-100 text-amber-700';
  if (s.includes('BLOCKED') || s.includes('PROBLEM') || s.includes('FAILED') || s.includes('CANCELLED') || s === 'DAMAGED') return 'bg-red-100 text-red-700';
  if (s.includes('WAITING') || s.includes('PENDING')) return 'bg-yellow-100 text-yellow-700';
  if (s.includes('RESERVED') || s.includes('ASSIGNED')) return 'bg-blue-100 text-blue-700';
  return 'bg-slate-100 text-slate-700';
}
