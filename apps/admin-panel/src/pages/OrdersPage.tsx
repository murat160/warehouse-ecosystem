import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { ordersApi, skusApi } from '../api';
import { PageHeader, PageBody } from '../components/Layout';
import { Table, Badge, type Column } from '../components/Table';
import { Modal, Button, Field, Input, Select } from '../components/Modal';
import { fmtDate, statusBadgeColor } from '../lib/format';

export function OrdersPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [skus, setSkus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState<any | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [o, s] = await Promise.all([ordersApi.list(), skusApi.list()]);
      setRows(o); setSkus(s);
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const cols: Column<any>[] = [
    { key: 'code', label: 'Code', render: r => <span className="font-mono">{r.code}</span> },
    { key: 'status', label: 'Status', render: r => <Badge className={statusBadgeColor(r.status)}>{r.status}</Badge> },
    { key: 'priority', label: 'Priority' },
    { key: 'customerName', label: 'Customer', render: r => r.customerName ?? '—' },
    { key: 'city', label: 'City', render: r => r.city ?? '—' },
    { key: 'items', label: 'Items', render: r => r._count?.items ?? '—' },
    { key: 'createdAt', label: 'Created', render: r => fmtDate(r.createdAt) },
  ];

  async function openDetail(row: any) {
    try { setDetail(await ordersApi.byId(row.id)); }
    catch (e: any) { toast.error(e.message); }
  }

  return (
    <>
      <PageHeader title="Orders" subtitle={`${rows.length} total`}
        actions={<Button onClick={() => setCreating(true)}><Plus className="inline w-4 h-4 mr-1" />New order</Button>} />
      <PageBody><Table rows={rows} columns={cols} rowKey={r => r.id} loading={loading} onRowClick={openDetail} /></PageBody>
      {creating && <NewOrderModal skus={skus} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load(); }} />}
      {detail && <OrderDetailModal order={detail} skus={skus} onClose={() => setDetail(null)} onAction={() => { setDetail(null); load(); }} />}
    </>
  );
}

function NewOrderModal({ skus, onClose, onSaved }: { skus: any[]; onClose: () => void; onSaved: () => void }) {
  const [customerName, setCustomerName] = useState('');
  const [city, setCity] = useState('');
  const [priority, setPriority] = useState('NORMAL');
  const [lines, setLines] = useState<Array<{ skuId: string; quantity: number }>>([{ skuId: skus[0]?.id ?? '', quantity: 1 }]);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await ordersApi.create({
        customerName, city, priority,
        items: lines.filter(l => l.skuId && l.quantity > 0),
      });
      toast.success('Order created'); onSaved();
    } catch (e: any) { toast.error(e.message); }
    setBusy(false);
  }

  return (
    <Modal open onClose={onClose} title="New order" width="max-w-xl"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={busy}>{busy ? '…' : 'Create'}</Button></>}>
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <Field label="Customer"><Input value={customerName} onChange={e => setCustomerName(e.target.value)} /></Field>
          <Field label="City"><Input value={city} onChange={e => setCity(e.target.value)} /></Field>
          <Field label="Priority">
            <Select value={priority} onChange={e => setPriority(e.target.value)}>
              <option>LOW</option><option>NORMAL</option><option>HIGH</option><option>URGENT</option>
            </Select>
          </Field>
        </div>
        <div>
          <span className="block text-xs font-medium text-slate-600 mb-1">Items</span>
          {lines.map((l, i) => (
            <div key={i} className="flex gap-2 mb-1">
              <Select value={l.skuId} onChange={e => setLines(p => p.map((x, j) => j === i ? { ...x, skuId: e.target.value } : x))}>
                {skus.map(s => <option key={s.id} value={s.id}>{s.code}</option>)}
              </Select>
              <Input type="number" value={l.quantity} className="w-20"
                onChange={e => setLines(p => p.map((x, j) => j === i ? { ...x, quantity: Number(e.target.value) } : x))} />
              <Button variant="ghost" onClick={() => setLines(p => p.filter((_, j) => j !== i))}>×</Button>
            </div>
          ))}
          <Button variant="secondary" onClick={() => setLines(p => [...p, { skuId: skus[0]?.id ?? '', quantity: 1 }])}>+ Add line</Button>
        </div>
      </div>
    </Modal>
  );
}

function OrderDetailModal({ order, skus, onClose, onAction }: { order: any; skus: any[]; onClose: () => void; onAction: () => void }) {
  const [busy, setBusy] = useState(false);
  async function release() {
    setBusy(true);
    try { await ordersApi.release(order.id); toast.success('Released → picking'); onAction(); }
    catch (e: any) { toast.error(e.message); }
    setBusy(false);
  }
  async function cancel() {
    if (!confirm('Cancel this order?')) return;
    setBusy(true);
    try { await ordersApi.cancel(order.id); toast.success('Cancelled'); onAction(); }
    catch (e: any) { toast.error(e.message); }
    setBusy(false);
  }
  const canRelease = ['NEW', 'INVENTORY_CHECKING', 'PROBLEM'].includes(order.status);
  const canCancel = !['DELIVERED', 'CANCELLED'].includes(order.status);

  return (
    <Modal open onClose={onClose} title={`Order ${order.code}`} width="max-w-2xl"
      footer={
        <>
          {canCancel && <Button variant="danger" onClick={cancel} disabled={busy}>Cancel order</Button>}
          {canRelease && <Button onClick={release} disabled={busy}>Release to picking</Button>}
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </>
      }>
      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <div><b>Status:</b> <Badge className={statusBadgeColor(order.status)}>{order.status}</Badge></div>
          <div><b>Priority:</b> {order.priority}</div>
          <div><b>Customer:</b> {order.customerName ?? '—'}</div>
          <div><b>City:</b> {order.city ?? '—'}</div>
          <div><b>Created:</b> {fmtDate(order.createdAt)}</div>
          <div><b>Updated:</b> {fmtDate(order.updatedAt)}</div>
        </div>
        <div>
          <b>Items:</b>
          <table className="w-full mt-2 text-xs">
            <thead><tr className="text-left text-slate-500"><th>SKU</th><th>Qty</th><th>Picked</th><th>Packed</th></tr></thead>
            <tbody>
              {(order.items ?? []).map((it: any) => (
                <tr key={it.id} className="border-t border-slate-100">
                  <td className="font-mono py-1">{skus.find(s => s.id === it.skuId)?.code ?? it.skuId.slice(0, 8)}</td>
                  <td>{it.quantity}</td>
                  <td>{it.picked}</td>
                  <td>{it.packed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <b>Tasks ({(order.tasks ?? []).length}):</b>
          <ul className="text-xs mt-1 space-y-1">
            {(order.tasks ?? []).map((t: any) => (
              <li key={t.id} className="flex justify-between">
                <span className="font-mono">{t.code} · {t.type}</span>
                <Badge className={statusBadgeColor(t.status)}>{t.status}</Badge>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Modal>
  );
}
