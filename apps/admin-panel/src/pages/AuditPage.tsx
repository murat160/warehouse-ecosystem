import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { auditApi } from '../api';
import { PageHeader, PageBody } from '../components/Layout';
import { Table, type Column } from '../components/Table';
import { Input, Select } from '../components/Modal';
import { fmtDate } from '../lib/format';

export function AuditPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [entity, setEntity] = useState('');
  const [limit, setLimit] = useState('100');

  async function load() {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit };
      if (entity) params.entity = entity;
      setRows(await auditApi.list(params));
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  }
  useEffect(() => { load(); }, [entity, limit]);

  const cols: Column<any>[] = [
    { key: 'time', label: 'Time', render: r => <span className="text-xs">{fmtDate(r.createdAt)}</span> },
    { key: 'user', label: 'User', render: r => r.user?.fullName ?? <span className="text-slate-400">system</span> },
    { key: 'action', label: 'Action', render: r => <code className="text-xs">{r.action}</code> },
    { key: 'entity', label: 'Entity', render: r => r.entity ? <span className="text-xs"><b>{r.entity}</b> {r.entityId?.slice(0, 8)}…</span> : '—' },
    { key: 'payload', label: 'Payload', render: r => r.payload
      ? <pre className="text-[10px] text-slate-500 max-w-xs overflow-x-auto">{JSON.stringify(r.payload, null, 0)}</pre>
      : '—' },
  ];

  return (
    <>
      <PageHeader title="Audit Log" subtitle="Server-side immutable record of every mutation"
        actions={
          <>
            <Input value={entity} onChange={e => setEntity(e.target.value)} placeholder="filter by entity (Task / Order…)" className="w-56" />
            <Select value={limit} onChange={e => setLimit(e.target.value)} className="w-24 inline-block">
              {['50','100','250','500','1000'].map(n => <option key={n}>{n}</option>)}
            </Select>
          </>
        } />
      <PageBody><Table rows={rows} columns={cols} rowKey={r => r.id} loading={loading} /></PageBody>
    </>
  );
}
