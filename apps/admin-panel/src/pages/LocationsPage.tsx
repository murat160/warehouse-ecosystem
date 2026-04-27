import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Search } from 'lucide-react';
import { locationsApi, zonesApi } from '../api';
import { PageHeader, PageBody } from '../components/Layout';
import { Table, Badge, type Column } from '../components/Table';
import { Modal, Button, Field, Input, Select } from '../components/Modal';
import { statusBadgeColor } from '../lib/format';

export function LocationsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [zoneFilter, setZoneFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [l, z] = await Promise.all([locationsApi.list(zoneFilter || undefined), zonesApi.list()]);
      setRows(l); setZones(z);
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  }
  useEffect(() => { load(); }, [zoneFilter]);

  const filtered = search
    ? rows.filter(r => r.code.toLowerCase().includes(search.toLowerCase()) || r.barcode.toLowerCase().includes(search.toLowerCase()))
    : rows;

  async function setStatus(id: string, status: string) {
    try { await locationsApi.setStatus(id, status); toast.success(`Status: ${status}`); load(); }
    catch (e: any) { toast.error(e.message); }
  }

  const cols: Column<any>[] = [
    { key: 'code', label: 'Code', render: r => <span className="font-mono text-xs">{r.code}</span> },
    { key: 'zone', label: 'Zone', render: r => zones.find(z => z.id === r.zoneId)?.code ?? '—' },
    { key: 'capacity', label: 'Capacity', render: r => r.capacity ?? '—' },
    { key: 'status', label: 'Status', render: r => <Badge className={statusBadgeColor(r.status)}>{r.status}</Badge> },
    { key: 'actions', label: '', render: r => (
      <div className="flex gap-1">
        {r.status !== 'BLOCKED' && <Button variant="ghost" onClick={() => setStatus(r.id, 'BLOCKED')}>Block</Button>}
        {r.status !== 'ACTIVE' && <Button variant="ghost" onClick={() => setStatus(r.id, 'ACTIVE')}>Activate</Button>}
      </div>
    ) },
  ];

  return (
    <>
      <PageHeader title="Locations / Bins" subtitle={`${rows.length} bins`}
        actions={
          <>
            <div className="relative">
              <Search className="absolute left-2.5 top-1.5 w-3.5 h-3.5 text-slate-400" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search code/barcode" className="pl-8 w-56" />
            </div>
            <Select value={zoneFilter} onChange={e => setZoneFilter(e.target.value)} className="w-40 inline-block">
              <option value="">All zones</option>
              {zones.map(z => <option key={z.id} value={z.id}>{z.code}</option>)}
            </Select>
            <Button onClick={() => setCreating(true)}><Plus className="inline w-4 h-4 mr-1" />New bin</Button>
          </>
        } />
      <PageBody><Table rows={filtered} columns={cols} rowKey={r => r.id} loading={loading} /></PageBody>
      {creating && <LocationModal zones={zones} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load(); }} />}
    </>
  );
}

function LocationModal({ zones, onClose, onSaved }: { zones: any[]; onClose: () => void; onSaved: () => void }) {
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? '');
  const [code, setCode] = useState('');
  const [barcode, setBarcode] = useState('');
  const [aisle, setAisle] = useState('');
  const [rack, setRack] = useState('');
  const [shelf, setShelf] = useState('');
  const [bin, setBin] = useState('');
  const [capacity, setCapacity] = useState(100);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await locationsApi.create({ zoneId, code, barcode: barcode || code, aisle, rack, shelf, bin, capacity: Number(capacity) || undefined });
      toast.success('Bin created'); onSaved();
    } catch (e: any) { toast.error(e.message); }
    setBusy(false);
  }

  return (
    <Modal open onClose={onClose} title="New bin"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={busy}>{busy ? '…' : 'Save'}</Button></>}>
      <div className="space-y-3">
        <Field label="Zone"><Select value={zoneId} onChange={e => setZoneId(e.target.value)}>{zones.map(z => <option key={z.id} value={z.id}>{z.code} — {z.name}</option>)}</Select></Field>
        <Field label="Code" hint="Human-readable, e.g. WH01-FLD-A04-R12-S03-B08"><Input value={code} onChange={e => setCode(e.target.value)} /></Field>
        <Field label="Barcode" hint="Defaults to Code if empty"><Input value={barcode} onChange={e => setBarcode(e.target.value)} /></Field>
        <div className="grid grid-cols-4 gap-2">
          <Field label="Aisle"><Input value={aisle} onChange={e => setAisle(e.target.value)} /></Field>
          <Field label="Rack"><Input value={rack} onChange={e => setRack(e.target.value)} /></Field>
          <Field label="Shelf"><Input value={shelf} onChange={e => setShelf(e.target.value)} /></Field>
          <Field label="Bin"><Input value={bin} onChange={e => setBin(e.target.value)} /></Field>
        </div>
        <Field label="Capacity"><Input type="number" value={capacity} onChange={e => setCapacity(Number(e.target.value))} /></Field>
      </div>
    </Modal>
  );
}
