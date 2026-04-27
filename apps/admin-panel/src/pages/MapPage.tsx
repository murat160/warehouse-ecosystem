/**
 * Live Warehouse Map — visualises zones → racks → bins.
 * Click a bin to see what's stored. Refreshes every 15s.
 */
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { warehousesApi, zonesApi, locationsApi, inventoryApi } from '../api';
import { PageHeader, PageBody } from '../components/Layout';
import { Modal, Select, Button } from '../components/Modal';
import { fmtRelative } from '../lib/format';

const ZONE_COLOR: Record<string, string> = {
  INBOUND: '#2EA7E0', QC: '#F59E0B', REPACK: '#A855F7', HANGING: '#EC4899',
  FOLDED: '#06B6D4', SHOES: '#84CC16', ACCESSORIES: '#F97316', HIGH_VALUE: '#7C3AED',
  PICKING: '#10B981', BULK: '#6366F1', PACKING: '#14B8A6', SORTATION: '#0EA5E9',
  OUTBOUND: '#22C55E', RETURNS: '#F43F5E', DAMAGED: '#991B1B', QUARANTINE: '#FBBF24',
  RETURN_TO_VENDOR: '#DC2626',
};

export function MapPage() {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [whId, setWhId] = useState('');
  const [zones, setZones] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBin, setSelectedBin] = useState<any | null>(null);

  async function load() {
    if (!whId) return;
    setLoading(true);
    try {
      const [z, l, i] = await Promise.all([
        zonesApi.list(whId), locationsApi.list(), inventoryApi.list(),
      ]);
      setZones(z);
      setLocations(l.filter(loc => z.some((zz: any) => zz.id === loc.zoneId)));
      setInventory(i);
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  }

  useEffect(() => {
    warehousesApi.list().then(w => { setWarehouses(w); setWhId(w[0]?.id ?? ''); }).catch(e => toast.error(e.message));
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [whId]);

  const grouped = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const loc of locations) {
      const arr = m.get(loc.zoneId) ?? [];
      arr.push(loc); m.set(loc.zoneId, arr);
    }
    return m;
  }, [locations]);

  function utilFor(loc: any): { qty: number; cap: number; pct: number } {
    const items = inventory.filter(i => i.locationId === loc.id);
    const qty = items.reduce((s, i) => s + (i.quantity ?? 0), 0);
    const cap = loc.capacity ?? 100;
    return { qty, cap, pct: cap > 0 ? Math.min(100, Math.round((qty / cap) * 100)) : 0 };
  }

  function color(loc: any): string {
    if (loc.status === 'BLOCKED') return '#EF4444';
    if (loc.status === 'MAINTENANCE') return '#94A3B8';
    const u = utilFor(loc).pct;
    if (u === 0) return '#E2E8F0';
    if (u < 50) return '#86EFAC';
    if (u < 80) return '#FACC15';
    return '#F97316';
  }

  return (
    <>
      <PageHeader title="Live Warehouse Map" subtitle="Updates every 15s · click bin for details"
        actions={
          <Select value={whId} onChange={e => setWhId(e.target.value)} className="w-48 inline-block">
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}
          </Select>
        } />
      <PageBody>
        {loading && <div className="text-sm text-slate-500">Loading…</div>}
        <div className="space-y-6">
          {zones.map(z => {
            const bins = grouped.get(z.id) ?? [];
            return (
              <section key={z.id} className="bg-white rounded-xl border border-slate-200 p-4">
                <header className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded" style={{ background: ZONE_COLOR[z.type] ?? '#94A3B8' }} />
                    <h3 className="font-semibold">{z.code} · {z.name}</h3>
                    <span className="text-xs text-slate-500">{bins.length} bins</span>
                  </div>
                </header>
                {bins.length === 0 ? (
                  <p className="text-xs text-slate-400">No bins in this zone.</p>
                ) : (
                  <div className="grid grid-cols-12 md:grid-cols-20 gap-1.5">
                    {bins.map(b => {
                      const u = utilFor(b);
                      return (
                        <button
                          key={b.id} title={`${b.code}\n${u.qty}/${u.cap}`}
                          onClick={() => setSelectedBin(b)}
                          className="aspect-square rounded text-[9px] flex items-center justify-center font-mono hover:ring-2 hover:ring-slate-400"
                          style={{ background: color(b) }}
                        >
                          {b.bin ?? ''}
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        <footer className="mt-6 flex items-center gap-3 text-xs text-slate-500">
          <Legend color="#E2E8F0" label="Empty" />
          <Legend color="#86EFAC" label="<50%" />
          <Legend color="#FACC15" label="50-80%" />
          <Legend color="#F97316" label=">80%" />
          <Legend color="#EF4444" label="Blocked" />
        </footer>
      </PageBody>

      {selectedBin && (() => {
        const u = utilFor(selectedBin);
        const items = inventory.filter(i => i.locationId === selectedBin.id);
        return (
          <Modal open onClose={() => setSelectedBin(null)} title={selectedBin.code}
            footer={<Button onClick={() => setSelectedBin(null)}>Close</Button>}>
            <div className="space-y-2 text-sm">
              <div><b>Status:</b> {selectedBin.status}</div>
              <div><b>Capacity:</b> {u.qty}/{u.cap} ({u.pct}%)</div>
              <div><b>Barcode:</b> <span className="font-mono">{selectedBin.barcode}</span></div>
              <div className="pt-2 border-t border-slate-200">
                <b>Stock ({items.length} lines):</b>
                {items.length === 0 ? <p className="text-slate-400 text-xs mt-1">Empty</p> : (
                  <ul className="mt-1 text-xs space-y-1">
                    {items.map(i => (
                      <li key={i.id} className="flex justify-between">
                        <span className="font-mono">{i.skuId.slice(0, 8)}…</span>
                        <span>{i.quantity} {i.reserved > 0 && <span className="text-amber-600">({i.reserved} reserved)</span>}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="text-xs text-slate-400">Updated {fmtRelative(items[0]?.updatedAt)}</div>
            </div>
          </Modal>
        );
      })()}
    </>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="w-3 h-3 rounded" style={{ background: color }} />
      {label}
    </span>
  );
}
