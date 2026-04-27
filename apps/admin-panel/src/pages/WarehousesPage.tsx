import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { warehousesApi } from '../api';
import { PageHeader, PageBody } from '../components/Layout';
import { Table, type Column } from '../components/Table';
import { Modal, Button, Field, Input } from '../components/Modal';

export function WarehousesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null | 'new'>(null);

  async function load() {
    setLoading(true);
    try { setRows(await warehousesApi.list()); } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const cols: Column<any>[] = [
    { key: 'code', label: 'Code', render: r => <span className="font-mono">{r.code}</span> },
    { key: 'name', label: 'Name' },
    { key: 'address', label: 'Address', render: r => r.address ?? '—' },
  ];

  return (
    <>
      <PageHeader title="Warehouses" subtitle={`${rows.length} total`}
        actions={<Button onClick={() => setEditing('new')}><Plus className="inline w-4 h-4 mr-1" />New warehouse</Button>} />
      <PageBody>
        <Table rows={rows} columns={cols} rowKey={r => r.id} loading={loading}
          onRowClick={r => setEditing(r)} />
      </PageBody>
      {editing && (
        <WarehouseModal
          warehouse={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </>
  );
}

function WarehouseModal({ warehouse, onClose, onSaved }: { warehouse: any | null; onClose: () => void; onSaved: () => void }) {
  const [code, setCode] = useState(warehouse?.code ?? '');
  const [name, setName] = useState(warehouse?.name ?? '');
  const [address, setAddress] = useState(warehouse?.address ?? '');
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try {
      if (warehouse) await warehousesApi.update(warehouse.id, { name, address });
      else await warehousesApi.create({ code, name, address });
      toast.success('Saved'); onSaved();
    } catch (e: any) { toast.error(e.message); }
    setBusy(false);
  }
  return (
    <Modal open onClose={onClose} title={warehouse ? `Edit ${warehouse.code}` : 'New warehouse'}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={busy}>{busy ? '…' : 'Save'}</Button></>}>
      <div className="space-y-3">
        <Field label="Code"><Input value={code} onChange={e => setCode(e.target.value)} disabled={!!warehouse} placeholder="WH-01" /></Field>
        <Field label="Name"><Input value={name} onChange={e => setName(e.target.value)} /></Field>
        <Field label="Address"><Input value={address} onChange={e => setAddress(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}
