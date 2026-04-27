import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { tasksApi, usersApi } from '../api';
import { PageHeader, PageBody } from '../components/Layout';
import { Table, Badge, type Column } from '../components/Table';
import { Modal, Button, Field, Select } from '../components/Modal';
import { fmtDate, statusBadgeColor } from '../lib/format';

const TYPES = ['','RECEIVE','QC_CHECK','PUTAWAY','PICK','PACK','SORT','LOAD','RETURN_CHECK',
  'REPACK','CYCLE_COUNT','REPLENISHMENT','MOVE_BIN','DAMAGE_CHECK'];
const STATUSES = ['','CREATED','ASSIGNED','ACCEPTED','IN_PROGRESS','WAITING_SCAN',
  'WAITING_SUPERVISOR','BLOCKED','COMPLETED','REASSIGNED','CANCELLED','ESCALATED'];

export function TasksPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [reassign, setReassign] = useState<any | null>(null);

  async function load() {
    setLoading(true);
    try {
      const params: any = {};
      if (type) params.type = type;
      if (status) params.status = status;
      const [t, u] = await Promise.all([tasksApi.list(params), usersApi.list()]);
      setRows(t); setUsers(u);
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  }
  useEffect(() => { load(); }, [type, status]);

  const cols: Column<any>[] = [
    { key: 'code', label: 'Code', render: r => <span className="font-mono">{r.code}</span> },
    { key: 'type', label: 'Type' },
    { key: 'status', label: 'Status', render: r => <Badge className={statusBadgeColor(r.status)}>{r.status}</Badge> },
    { key: 'priority', label: 'Priority' },
    { key: 'assigned', label: 'Assigned to', render: r => r.assignedTo?.fullName ?? <span className="text-slate-400">unassigned</span> },
    { key: 'createdAt', label: 'Created', render: r => fmtDate(r.createdAt) },
    { key: 'actions', label: '', render: r => (
      <Button variant="ghost" onClick={() => setReassign(r)}>Reassign</Button>
    ) },
  ];

  return (
    <>
      <PageHeader title="Tasks" subtitle={`${rows.length} matching · live from /api/tasks`}
        actions={
          <>
            <Select value={type} onChange={e => setType(e.target.value)} className="w-40 inline-block">
              {TYPES.map(t => <option key={t} value={t}>{t || 'All types'}</option>)}
            </Select>
            <Select value={status} onChange={e => setStatus(e.target.value)} className="w-40 inline-block">
              {STATUSES.map(s => <option key={s} value={s}>{s || 'All statuses'}</option>)}
            </Select>
          </>
        }
      />
      <PageBody><Table rows={rows} columns={cols} rowKey={r => r.id} loading={loading} /></PageBody>
      {reassign && <ReassignModal task={reassign} users={users} onClose={() => setReassign(null)} onSaved={() => { setReassign(null); load(); }} />}
    </>
  );
}

function ReassignModal({ task, users, onClose, onSaved }: { task: any; users: any[]; onClose: () => void; onSaved: () => void }) {
  const [userId, setUserId] = useState(users[0]?.id ?? '');
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await tasksApi.reassign(task.id, userId);
      toast.success('Task reassigned'); onSaved();
    } catch (e: any) { toast.error(e.message); }
    setBusy(false);
  }

  return (
    <Modal open onClose={onClose} title={`Reassign ${task.code}`}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={busy}>{busy ? '…' : 'Reassign'}</Button></>}>
      <Field label="New assignee">
        <Select value={userId} onChange={e => setUserId(e.target.value)}>
          {users.map(u => <option key={u.id} value={u.id}>{u.employeeId} — {u.fullName} ({u.roleName})</option>)}
        </Select>
      </Field>
    </Modal>
  );
}
