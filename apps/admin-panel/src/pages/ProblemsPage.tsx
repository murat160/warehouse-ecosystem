import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { problemTasksApi } from '../api';
import { PageHeader, PageBody } from '../components/Layout';
import { Table, Badge, type Column } from '../components/Table';
import { Button, Select } from '../components/Modal';
import { fmtRelative, statusBadgeColor } from '../lib/format';

export function ProblemsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [filter, setFilter] = useState('OPEN');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try { setRows(await problemTasksApi.list(filter || undefined)); }
    catch (e: any) { toast.error(e.message); }
    setLoading(false);
  }
  useEffect(() => { load(); }, [filter]);

  async function resolve(id: string) {
    try { await problemTasksApi.resolve(id); toast.success('Resolved'); load(); }
    catch (e: any) { toast.error(e.message); }
  }
  async function escalate(id: string) {
    try { await problemTasksApi.escalate(id); toast.success('Escalated'); load(); }
    catch (e: any) { toast.error(e.message); }
  }

  const cols: Column<any>[] = [
    { key: 'task', label: 'Task', render: r => <span className="font-mono">{r.task?.code ?? '—'}</span> },
    { key: 'reason', label: 'Reason', render: r => <Badge className="bg-red-100 text-red-700">{r.reason}</Badge> },
    { key: 'notes', label: 'Notes', render: r => <span className="text-xs text-slate-600">{r.notes ?? '—'}</span> },
    { key: 'reportedBy', label: 'Reporter', render: r => r.reportedBy?.fullName ?? '—' },
    { key: 'status', label: 'Status', render: r => <Badge className={statusBadgeColor(r.status)}>{r.status}</Badge> },
    { key: 'createdAt', label: 'Reported', render: r => fmtRelative(r.createdAt) },
    { key: 'actions', label: '', render: r => r.status === 'OPEN' && (
      <div className="flex gap-1">
        <Button variant="ghost" onClick={() => resolve(r.id)}>Resolve</Button>
        <Button variant="ghost" onClick={() => escalate(r.id)}>Escalate</Button>
      </div>
    ) },
  ];

  return (
    <>
      <PageHeader title="Problem tasks" subtitle={`${rows.length} matching`}
        actions={
          <Select value={filter} onChange={e => setFilter(e.target.value)} className="w-40 inline-block">
            <option value="">All</option>
            <option value="OPEN">OPEN</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="ESCALATED">ESCALATED</option>
          </Select>
        } />
      <PageBody><Table rows={rows} columns={cols} rowKey={r => r.id} loading={loading} empty="No problems" /></PageBody>
    </>
  );
}
