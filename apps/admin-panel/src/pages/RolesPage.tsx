import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { rolesApi } from '../api';
import { PageHeader, PageBody } from '../components/Layout';
import { Table, type Column } from '../components/Table';

export function RolesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    rolesApi.list().then(setRows).catch(e => toast.error(e.message)).finally(() => setLoading(false));
  }, []);
  const cols: Column<any>[] = [
    { key: 'name', label: 'Name', render: r => <span className="font-mono">{r.name}</span> },
    { key: 'permissions', label: 'Permissions', render: r => (
      <span className="text-xs text-slate-500">{Object.keys(r.permissions).filter(k => r.permissions[k]).join(', ') || '—'}</span>
    ) },
  ];
  return (
    <>
      <PageHeader title="Roles" subtitle={`${rows.length} system roles. Stage 4 read-only; CRUD in Stage 5.`} />
      <PageBody><Table rows={rows} columns={cols} rowKey={r => r.id} loading={loading} /></PageBody>
    </>
  );
}
