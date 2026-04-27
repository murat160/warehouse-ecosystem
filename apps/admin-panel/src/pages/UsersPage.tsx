import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { usersApi, rolesApi, warehousesApi } from '../api';
import { PageHeader, PageBody } from '../components/Layout';
import { Table, Badge, type Column } from '../components/Table';
import { Modal, Button, Field, Input, Select } from '../components/Modal';
import { fmtDate, statusBadgeColor } from '../lib/format';

export function UsersPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; user?: any } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [u, r, w] = await Promise.all([usersApi.list(), rolesApi.list(), warehousesApi.list()]);
      setRows(u); setRoles(r); setWarehouses(w);
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const cols: Column<any>[] = [
    { key: 'employeeId', label: 'ID', render: r => <span className="font-mono">{r.employeeId}</span> },
    { key: 'fullName', label: 'Name' },
    { key: 'roleName', label: 'Role', render: r => <Badge>{r.roleName}</Badge> },
    { key: 'status', label: 'Status', render: r => <Badge className={statusBadgeColor(r.status)}>{r.status}</Badge> },
    { key: 'createdAt', label: 'Created', render: r => fmtDate(r.createdAt) },
  ];

  return (
    <>
      <PageHeader title="Users" subtitle={`${rows.length} total`}
        actions={<Button onClick={() => setModal({ mode: 'create' })}><Plus className="inline w-4 h-4 mr-1" />New user</Button>} />
      <PageBody>
        <Table
          rows={rows} columns={cols} rowKey={r => r.id}
          onRowClick={r => setModal({ mode: 'edit', user: r })}
          loading={loading} empty="No users yet"
        />
      </PageBody>
      {modal && (
        <UserModal
          mode={modal.mode} user={modal.user} roles={roles} warehouses={warehouses}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </>
  );
}

function UserModal({ mode, user, roles, warehouses, onClose, onSaved }: {
  mode: 'create' | 'edit'; user?: any; roles: any[]; warehouses: any[]; onClose: () => void; onSaved: () => void;
}) {
  const [employeeId, setEmployeeId] = useState(user?.employeeId ?? '');
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [pin, setPin] = useState('');
  const [roleId, setRoleId] = useState(user?.roleId ?? roles[0]?.id ?? '');
  const [warehouseId, setWarehouseId] = useState(user?.warehouseId ?? warehouses[0]?.id ?? '');
  const [status, setStatus] = useState(user?.status ?? 'ACTIVE');
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      if (mode === 'create') {
        await usersApi.create({ employeeId, pin, fullName, roleId, warehouseId });
        toast.success('User created');
      } else {
        await usersApi.update(user.id, { fullName, roleId, warehouseId, status });
        toast.success('User updated');
      }
      onSaved();
    } catch (e: any) { toast.error(e.message); }
    setBusy(false);
  }

  async function block() {
    if (!confirm('Block this user?')) return;
    try { await usersApi.block(user.id); toast.success('User blocked'); onSaved(); }
    catch (e: any) { toast.error(e.message); }
  }

  return (
    <Modal open onClose={onClose} title={mode === 'create' ? 'Create user' : `Edit ${user.employeeId}`}
      footer={
        <>
          {mode === 'edit' && <Button variant="danger" onClick={block}>Block</Button>}
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
        </>
      }>
      <div className="space-y-3">
        <Field label="Employee ID">
          <Input value={employeeId} onChange={e => setEmployeeId(e.target.value)} disabled={mode === 'edit'} placeholder="W-204" />
        </Field>
        <Field label="Full name">
          <Input value={fullName} onChange={e => setFullName(e.target.value)} />
        </Field>
        {mode === 'create' && (
          <Field label="PIN" hint="Min 4 chars. Stored hashed.">
            <Input type="password" value={pin} onChange={e => setPin(e.target.value)} />
          </Field>
        )}
        <Field label="Role">
          <Select value={roleId} onChange={e => setRoleId(e.target.value)}>
            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </Select>
        </Field>
        <Field label="Warehouse">
          <Select value={warehouseId ?? ''} onChange={e => setWarehouseId(e.target.value || null)}>
            <option value="">(none)</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}
          </Select>
        </Field>
        {mode === 'edit' && (
          <Field label="Status">
            <Select value={status} onChange={e => setStatus(e.target.value)}>
              <option value="ACTIVE">ACTIVE</option>
              <option value="ON_BREAK">ON_BREAK</option>
              <option value="OFFLINE">OFFLINE</option>
              <option value="BLOCKED">BLOCKED</option>
            </Select>
          </Field>
        )}
      </div>
    </Modal>
  );
}
