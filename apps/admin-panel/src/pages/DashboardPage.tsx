import { useEffect, useState } from 'react';
import { kpiApi, problemTasksApi, ordersApi, tasksApi } from '../api';
import { PageHeader, PageBody } from '../components/Layout';
import { Badge, Table, type Column } from '../components/Table';
import { fmtRelative, statusBadgeColor } from '../lib/format';
import { useNavigate } from 'react-router';

export function DashboardPage() {
  const [kpi, setKpi] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [openTasks, setOpenTasks] = useState<any[]>([]);
  const [problems, setProblems] = useState<any[]>([]);
  const nav = useNavigate();

  useEffect(() => {
    Promise.all([
      kpiApi.dashboard().catch(() => null),
      ordersApi.list().catch(() => []),
      tasksApi.list({ status: 'IN_PROGRESS' }).catch(() => []),
      problemTasksApi.list('OPEN').catch(() => []),
    ]).then(([k, orders, tasks, prob]) => {
      setKpi(k);
      setRecentOrders(orders.slice(0, 8));
      setOpenTasks(tasks.slice(0, 8));
      setProblems(prob);
    });
  }, []);

  const cards = kpi ? [
    { label: 'Orders total', value: kpi.orders, color: 'bg-blue-500' },
    { label: 'Open tasks', value: kpi.openTasks, color: 'bg-amber-500' },
    { label: 'Open problems', value: kpi.problems, color: 'bg-red-500' },
    { label: 'Active workers', value: kpi.activeWorkers, color: 'bg-emerald-500' },
    { label: 'Ready to dispatch', value: kpi.ordersReadyForDispatch, color: 'bg-violet-500' },
  ] : [];

  const orderCols: Column<any>[] = [
    { key: 'code', label: 'Code', render: r => <span className="font-mono">{r.code}</span> },
    { key: 'status', label: 'Status', render: r => <Badge className={statusBadgeColor(r.status)}>{r.status}</Badge> },
    { key: 'priority', label: 'Priority' },
    { key: 'createdAt', label: 'Created', render: r => fmtRelative(r.createdAt) },
  ];

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Real-time warehouse overview" />
      <PageBody>
        <section className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6">
          {cards.map(c => (
            <div key={c.label} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="text-xs uppercase tracking-wider text-slate-500">{c.label}</div>
              <div className="text-3xl font-bold mt-1">{c.value}</div>
              <div className={`mt-2 h-1 w-12 rounded-full ${c.color}`} />
            </div>
          ))}
        </section>

        {problems.length > 0 && (
          <section className="mb-6">
            <h2 className="font-semibold mb-2">Open problems</h2>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              {problems.slice(0, 5).map(p => (
                <div key={p.id} className="text-sm py-1 flex items-center justify-between">
                  <span><span className="font-mono">{p.task?.code}</span> — {p.reason}: {p.notes}</span>
                  <span className="text-xs text-slate-500">{fmtRelative(p.createdAt)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <h2 className="font-semibold mb-2">Recent orders</h2>
            <Table rows={recentOrders} columns={orderCols} rowKey={r => r.id}
              onRowClick={r => nav(`/orders?focus=${r.id}`)} empty="No orders yet" />
          </div>
          <div>
            <h2 className="font-semibold mb-2">In-progress tasks</h2>
            <Table
              rows={openTasks}
              columns={[
                { key: 'code', label: 'Code', render: r => <span className="font-mono">{r.code}</span> },
                { key: 'type', label: 'Type' },
                { key: 'status', label: 'Status', render: r => <Badge className={statusBadgeColor(r.status)}>{r.status}</Badge> },
                { key: 'assigned', label: 'Assignee', render: r => r.assignedTo?.fullName ?? '—' },
              ]}
              rowKey={r => r.id} empty="No tasks in progress"
            />
          </div>
        </section>
      </PageBody>
    </>
  );
}
