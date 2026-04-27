import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { zonesApi, warehousesApi } from '../api';
import { PageHeader, PageBody } from '../components/Layout';
import { Table, Badge, type Column } from '../components/Table';
import { Modal, Button, Field, Input, Select } from '../components/Modal';

const ZONE_TYPES = ['INBOUND','QC','REPACK','HANGING','FOLDED','SHOES','ACCESSORIES','HIGH_VALUE',
  'RETURN_TO_VENDOR','DAMAGED','QUARANTINE','PICKING','BULK','PACKING','SORTATION','OUTBOUND','RETURNS'];

export function ZonesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [whFilter, setWhFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [z, w] = await Promise.all([zonesApi.list(whFilter || undefined), warehousesApi.list()]);
      setRows(z); setWarehouses(w);
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  }
  useEffect(() => { load(); }, [whFilter]);

  const cols: Column<any>[] = [
    { key: 'code', label: 'Code', render: r => <span className="font-mono">{r.code}</span> },
    { key: 'name', label: 'Name' },
    { key: 'type', label: 'Type', render: r => <Badge>{r.type}</Badge> },
    { key: 'warehouseId', label: 'Warehouse', render: r => warehouses.find(w => w.id === r.warehouseId)?.code ?? '—' },
  ];

  return (
    <>
      <PageHeader title="Zones" subtitle={`${rows.length} zones`}
        actions={
          <>
            <Select value={whFilter} onChange={e => setWhFilter(e.target.value)} className="w-40 inline-block">
              <option value="">All warehouses</option>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.code}</option>)}
            </Select>
            <Button onClick={() => setCreating(true)}><Plus className="inline w-4 h-4 mr-1" />New zone</Button>
          </>
        } />
      <PageBody><Table rows={rows} columns={cols} rowKey={r => r.id} loading={loading} /></PageBody>
      {creating && <ZoneModal warehouses={warehouses} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load(); }} />}
    </>
  );
}

function ZoneModal({ warehouses, onClose, onSaved }: { warehouses: any[]; onClose: () => void; onSaved: () => void }) {
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? '');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('FOLDED');
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try { await zonesApi.create({ warehouseId, code, name, type }); toast.success('Zone created'); onSaved(); }
    catch (e: any) { toast.error(e.message); }
    setBusy(false);
  }
  return (
    <Modal open onClose={onClose} title="New zone"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={busy}>{busy ? '…' : 'Save'}</Button></>}>
      <div className="space-y-3">
        <Field label="Warehouse">
          <Select value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}
          </Select>
        </Field>
        <Field label="Code"><Input value={code} onChange={e => setCode(e.target.value)} placeholder="FLD" /></Field>
        <Field label="Name"><Input value={name} onChange={e => setName(e.target.value)} placeholder="Folded clothing" /></Field>
        <Field label="Type">
          <Select value={type} onChange={e => setType(e.target.value)}>
            {ZONE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
        </Field>
      </div>
    </Modal>
  );
}
