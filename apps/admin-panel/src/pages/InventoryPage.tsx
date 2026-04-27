import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Search } from 'lucide-react';
import { inventoryApi, skusApi, locationsApi } from '../api';
import { PageHeader, PageBody } from '../components/Layout';
import { Table, Badge, type Column } from '../components/Table';
import { Modal, Button, Field, Input, Select } from '../components/Modal';
import { fmtRelative, statusBadgeColor } from '../lib/format';

export function InventoryPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [skus, setSkus] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [adjusting, setAdjusting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [i, s, l] = await Promise.all([
        inventoryApi.list(statusFilter ? { status: statusFilter } : {}), skusApi.list(), locationsApi.list(),
      ]);
      setRows(i); setSkus(s); setLocations(l);
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  }
  useEffect(() => { load(); }, [statusFilter]);

  const filtered = search
    ? rows.filter(r => {
        const sku = skus.find(s => s.id === r.skuId);
        const loc = locations.find(l => l.id === r.locationId);
        const q = search.toLowerCase();
        return sku?.code?.toLowerCase().includes(q) || sku?.barcode?.toLowerCase().includes(q) || loc?.code?.toLowerCase().includes(q);
      })
    : rows;

  const cols: Column<any>[] = [
    { key: 'sku', label: 'SKU', render: r => {
      const sku = skus.find(s => s.id === r.skuId) ?? r.sku;
      return <span className="font-mono text-xs">{sku?.code ?? r.skuId.slice(0, 8)}</span>;
    } },
    { key: 'location', label: 'Location', render: r => {
      const loc = locations.find(l => l.id === r.locationId) ?? r.location;
      return <span className="font-mono text-xs">{loc?.code ?? r.locationId.slice(0, 8)}</span>;
    } },
    { key: 'quantity', label: 'Qty', render: r => <b>{r.quantity}</b> },
    { key: 'reserved', label: 'Reserved', render: r => r.reserved > 0 ? <span className="text-amber-600">{r.reserved}</span> : '0' },
    { key: 'status', label: 'Status', render: r => <Badge className={statusBadgeColor(r.status)}>{r.status}</Badge> },
    { key: 'updatedAt', label: 'Updated', render: r => fmtRelative(r.updatedAt) },
  ];

  return (
    <>
      <PageHeader title="Inventory"
        subtitle={`${rows.length} stock lines`}
        actions={
          <>
            <div className="relative">
              <Search className="absolute left-2.5 top-1.5 w-3.5 h-3.5 text-slate-400" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search SKU/bin" className="pl-8 w-56" />
            </div>
            <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-40 inline-block">
              <option value="">All statuses</option>
              <option value="AVAILABLE">AVAILABLE</option>
              <option value="RESERVED">RESERVED</option>
              <option value="QUARANTINE">QUARANTINE</option>
              <option value="DAMAGED">DAMAGED</option>
            </Select>
            <Button onClick={() => setAdjusting(true)}>Adjust stock</Button>
          </>
        }
      />
      <PageBody><Table rows={filtered} columns={cols} rowKey={r => r.id} loading={loading} /></PageBody>
      {adjusting && <AdjustModal skus={skus} locations={locations} onClose={() => setAdjusting(false)} onSaved={() => { setAdjusting(false); load(); }} />}
    </>
  );
}

function AdjustModal({ skus, locations, onClose, onSaved }: { skus: any[]; locations: any[]; onClose: () => void; onSaved: () => void }) {
  const [skuId, setSkuId] = useState(skus[0]?.id ?? '');
  const [locationId, setLocationId] = useState(locations[0]?.id ?? '');
  const [delta, setDelta] = useState(1);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await inventoryApi.adjust({ skuId, locationId, delta: Number(delta), reason });
      toast.success('Adjusted'); onSaved();
    } catch (e: any) { toast.error(e.message); }
    setBusy(false);
  }

  return (
    <Modal open onClose={onClose} title="Adjust stock"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={busy}>{busy ? '…' : 'Apply'}</Button></>}>
      <div className="space-y-3">
        <Field label="SKU"><Select value={skuId} onChange={e => setSkuId(e.target.value)}>{skus.map(s => <option key={s.id} value={s.id}>{s.code}</option>)}</Select></Field>
        <Field label="Location"><Select value={locationId} onChange={e => setLocationId(e.target.value)}>{locations.map(l => <option key={l.id} value={l.id}>{l.code}</option>)}</Select></Field>
        <Field label="Delta" hint="Positive to add, negative to remove">
          <Input type="number" value={delta} onChange={e => setDelta(Number(e.target.value))} />
        </Field>
        <Field label="Reason"><Input value={reason} onChange={e => setReason(e.target.value)} placeholder="cycle count correction / repack / ..." /></Field>
      </div>
    </Modal>
  );
}
