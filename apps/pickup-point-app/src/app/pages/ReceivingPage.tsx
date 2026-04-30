import { useState } from 'react';
import { ArrowDownToLine, ScanLine, AlertTriangle, CheckCircle2, FileText, X } from 'lucide-react';
import { toast } from 'sonner';
import { useStore, store } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';
import { BatchStatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';

export function ReceivingPage() {
  const { batches, orders } = useStore();
  const [activeId, setActiveId] = useState<string | null>(batches.find(b => b.status !== 'accepted' && b.status !== 'rejected')?.id ?? batches[0]?.id ?? null);
  const [scanInput, setScanInput] = useState('');
  const [discrepancyOpen, setDiscrepancyOpen] = useState(false);
  const [actOpen, setActOpen] = useState(false);
  const [discrepancyKind, setDiscrepancyKind] = useState<'missing' | 'extra' | 'damaged'>('missing');
  const [discrepancyOrderId, setDiscrepancyOrderId] = useState('');
  const [discrepancyNotes, setDiscrepancyNotes] = useState('');

  const batch = batches.find(b => b.id === activeId);
  const expectedOrders = batch ? orders.filter(o => batch.orderIds.includes(o.id)) : [];
  const remaining = batch ? expectedOrders.filter(o => !batch.receivedOrderIds.includes(o.id)) : [];

  const onScan = () => {
    if (!batch || !scanInput.trim()) return;
    const code = scanInput.trim();
    const target = expectedOrders.find(o => o.id === code || o.trackingNumber === code || o.packageLabel === code);
    if (!target) {
      toast.error('Посылка не найдена в партии — возможна лишняя');
      return;
    }
    if (batch.receivedOrderIds.includes(target.id)) {
      toast('Уже принята');
      return;
    }
    store.receivePackage(batch.id, target.id);
    toast.success(`Принято: ${target.id}`);
    setScanInput('');
  };

  const flagDiscrepancy = () => {
    if (!batch || !discrepancyOrderId.trim()) { toast.error('Укажите Order ID'); return; }
    store.flagBatchDiscrepancy(batch.id, discrepancyOrderId.trim(), discrepancyKind, discrepancyNotes.trim() || undefined);
    toast(`Зафиксировано расхождение: ${discrepancyKind}`);
    setDiscrepancyOpen(false);
    setDiscrepancyOrderId('');
    setDiscrepancyNotes('');
  };

  const closeBatch = (accepted: boolean) => {
    if (!batch) return;
    if (accepted && (batch.discrepancyOrderIds.length > 0 || batch.damagedOrderIds.length > 0)) {
      toast.error('Сначала составьте акт расхождения');
      return;
    }
    store.closeBatch(batch.id, accepted);
    toast.success(accepted ? 'Партия принята' : 'Партия отклонена');
  };

  const startReceiving = () => {
    if (!batch) return;
    store.startBatchReceiving(batch.id);
    toast('Приёмка начата');
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      <PageHeader
        title="Приёмка заказов"
        subtitle="От курьеров и со склада"
        right={
          <button
            onClick={() => setActOpen(true)}
            className="px-3 h-9 rounded-lg bg-white text-[#1F2430] text-[12px] active-press"
            style={{ fontWeight: 800 }}
          >
            Акт расхождения
          </button>
        }
      />

      <div className="px-5 -mt-5 grid md:grid-cols-[280px_1fr] gap-4">
        <div className="space-y-2">
          {batches.map(b => (
            <button
              key={b.id}
              onClick={() => setActiveId(b.id)}
              className={`w-full text-left rounded-2xl p-3 active-press transition ${activeId === b.id ? 'bg-white shadow-sm border-2 border-[#0EA5E9]' : 'bg-white border border-[#F3F4F6]'}`}
            >
              <div className="flex items-center justify-between">
                <div className="text-[12px] text-[#1F2430] truncate" style={{ fontWeight: 800 }}>{b.id}</div>
                <BatchStatusBadge status={b.status} />
              </div>
              <div className="text-[11px] text-[#6B7280] mt-1" style={{ fontWeight: 600 }}>{b.courierName} · {b.vehicleNumber ?? '—'}</div>
              <div className="text-[11px] text-[#6B7280] mt-0.5">
                {b.receivedCount} / {b.expectedCount} принято
              </div>
            </button>
          ))}
        </div>

        {batch ? (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[14px] text-[#1F2430]" style={{ fontWeight: 800 }}>{batch.id}</div>
                  <div className="text-[11px] text-[#6B7280] mt-0.5">
                    Курьер: {batch.courierId} · {batch.courierName} {batch.vehicleNumber ? `· ${batch.vehicleNumber}` : ''}
                  </div>
                  {batch.warehouseId && <div className="text-[11px] text-[#6B7280]">Склад: {batch.warehouseId}</div>}
                </div>
                <BatchStatusBadge status={batch.status} />
              </div>

              <div className="grid grid-cols-3 gap-3 mt-3">
                <Mini label="Ожидается" value={batch.expectedCount} color="#94A3B8" />
                <Mini label="Принято"   value={batch.receivedCount} color="#16A34A" />
                <Mini label="Осталось"  value={Math.max(0, batch.expectedCount - batch.receivedCount)} color="#F59E0B" />
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4">
                <input
                  value={scanInput}
                  onChange={e => setScanInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') onScan(); }}
                  placeholder="Сканируйте Order ID / Tracking / PKG"
                  className="border border-[#E5E7EB] rounded-xl px-3 h-10 text-[13px]"
                  autoFocus
                />
                <button
                  onClick={onScan}
                  className="rounded-xl bg-[#0EA5E9] text-white text-[12px] active-press flex items-center justify-center gap-1"
                  style={{ fontWeight: 800 }}
                >
                  <ScanLine className="w-4 h-4" /> Принять
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                {batch.status === 'arrived' && (
                  <button onClick={startReceiving} className="rounded-xl bg-[#0EA5E9]15 px-3 h-9 text-[12px]" style={{ color: '#0EA5E9', fontWeight: 800, backgroundColor: '#0EA5E915' }}>Начать приёмку</button>
                )}
                <button onClick={() => setDiscrepancyOpen(true)} className="rounded-xl px-3 h-9 text-[12px] active-press flex items-center justify-center gap-1" style={{ backgroundColor: '#EF444415', color: '#EF4444', fontWeight: 800 }}>
                  <AlertTriangle className="w-4 h-4" /> Расхождение
                </button>
                <button onClick={() => closeBatch(true)}
                  disabled={batch.status === 'accepted' || batch.status === 'rejected'}
                  className="rounded-xl px-3 h-9 text-[12px] active-press flex items-center justify-center gap-1 disabled:opacity-40"
                  style={{ backgroundColor: '#16A34A15', color: '#16A34A', fontWeight: 800 }}>
                  <CheckCircle2 className="w-4 h-4" /> Принять партию
                </button>
                <button onClick={() => closeBatch(false)}
                  disabled={batch.status === 'accepted' || batch.status === 'rejected'}
                  className="rounded-xl px-3 h-9 text-[12px] active-press flex items-center justify-center gap-1 disabled:opacity-40"
                  style={{ backgroundColor: '#6B728015', color: '#6B7280', fontWeight: 800 }}>
                  <X className="w-4 h-4" /> Отклонить
                </button>
              </div>

              {batch.notes && (
                <div className="mt-3 rounded-xl bg-[#FEF3C7] p-2 text-[11px] text-[#92400E]" style={{ fontWeight: 600 }}>
                  {batch.notes}
                </div>
              )}
              {(batch.discrepancyOrderIds.length > 0 || batch.damagedOrderIds.length > 0) && (
                <div className="mt-3 rounded-xl bg-[#FEE2E2] p-2 text-[11px] text-[#991B1B]" style={{ fontWeight: 600 }}>
                  Расхождения: {batch.discrepancyOrderIds.length}, повреждения: {batch.damagedOrderIds.length}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl p-4">
              <div className="text-[13px] text-[#1F2430] mb-3" style={{ fontWeight: 800 }}>Посылки в партии</div>
              {expectedOrders.length === 0 ? (
                <EmptyState title="Партия пуста" subtitle="Посылки будут отображаться здесь" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[12px]">
                    <thead className="text-[10px] text-[#6B7280] uppercase">
                      <tr>
                        <th className="text-left py-1 pr-2">Order ID</th>
                        <th className="text-left py-1 pr-2">Tracking</th>
                        <th className="text-left py-1 pr-2">Label</th>
                        <th className="text-left py-1 pr-2">Клиент</th>
                        <th className="text-left py-1 pr-2">Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expectedOrders.map(o => {
                        const received = batch.receivedOrderIds.includes(o.id);
                        const damaged = batch.damagedOrderIds.includes(o.id);
                        const discrepancy = batch.discrepancyOrderIds.includes(o.id);
                        return (
                          <tr key={o.id} className="border-t border-[#F3F4F6]">
                            <td className="py-2 pr-2 text-[#1F2430]" style={{ fontWeight: 700 }}>{o.id}</td>
                            <td className="py-2 pr-2 text-[#374151]">{o.trackingNumber}</td>
                            <td className="py-2 pr-2 text-[#374151]">{o.packageLabel}</td>
                            <td className="py-2 pr-2 text-[#374151]">{o.customerName}</td>
                            <td className="py-2 pr-2">
                              {received && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#16A34A] text-white" style={{ fontWeight: 800 }}>принято</span>}
                              {damaged && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EF4444] text-white ml-1" style={{ fontWeight: 800 }}>повреждено</span>}
                              {discrepancy && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F59E0B] text-white ml-1" style={{ fontWeight: 800 }}>расхождение</span>}
                              {!received && !damaged && !discrepancy && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#94A3B8] text-white" style={{ fontWeight: 800 }}>ожидает</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {remaining.length > 0 && (
                <div className="mt-3 text-[11px] text-[#6B7280]">
                  Осталось принять: {remaining.length}
                </div>
              )}
            </div>
          </div>
        ) : (
          <EmptyState title="Нет активных партий" subtitle="Подождите курьера или создайте партию вручную" icon={<ArrowDownToLine className="w-5 h-5" />} />
        )}
      </div>

      <Modal
        open={discrepancyOpen}
        onClose={() => setDiscrepancyOpen(false)}
        title="Расхождение"
        footer={
          <>
            <button onClick={() => setDiscrepancyOpen(false)} className="px-4 h-9 rounded-lg text-[12px] text-[#6B7280] active-press" style={{ fontWeight: 700 }}>Отмена</button>
            <button onClick={flagDiscrepancy} className="px-4 h-9 rounded-lg bg-[#EF4444] text-white text-[12px] active-press" style={{ fontWeight: 800 }}>Зафиксировать</button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {(['missing','extra','damaged'] as const).map(k => (
              <button
                key={k}
                onClick={() => setDiscrepancyKind(k)}
                className={`rounded-xl px-3 h-9 text-[12px] ${discrepancyKind === k ? 'bg-[#EF4444] text-white' : 'bg-[#F3F4F6] text-[#374151]'}`}
                style={{ fontWeight: 800 }}
              >
                {k === 'missing' ? 'Недостача' : k === 'extra' ? 'Лишняя' : 'Повреждение'}
              </button>
            ))}
          </div>
          <input
            placeholder="Order ID"
            value={discrepancyOrderId}
            onChange={e => setDiscrepancyOrderId(e.target.value)}
            className="w-full border border-[#E5E7EB] rounded-xl px-3 h-10 text-[13px]"
          />
          <textarea
            placeholder="Описание (необязательно)"
            value={discrepancyNotes}
            onChange={e => setDiscrepancyNotes(e.target.value)}
            rows={3}
            className="w-full border border-[#E5E7EB] rounded-xl p-3 text-[13px]"
          />
        </div>
      </Modal>

      <Modal
        open={actOpen}
        onClose={() => setActOpen(false)}
        title="Создать акт расхождения"
        footer={
          <>
            <button onClick={() => setActOpen(false)} className="px-4 h-9 rounded-lg text-[12px] text-[#6B7280] active-press" style={{ fontWeight: 700 }}>Отмена</button>
            <button
              onClick={() => {
                if (!batch) return;
                store.uploadDocument({ kind: 'discrepancy_act', title: `Акт расхождения ${batch.id}`, size: '94 KB', batchId: batch.id });
                setActOpen(false);
                toast.success('Акт расхождения создан');
              }}
              className="px-4 h-9 rounded-lg bg-[#0EA5E9] text-white text-[12px] active-press" style={{ fontWeight: 800 }}
            >
              <FileText className="w-3 h-3 inline mr-1" /> Создать
            </button>
          </>
        }
      >
        <div className="text-[13px] text-[#374151]">
          Акт будет привязан к текущей партии {batch?.id ?? '—'} и отправлен в Admin Panel.
        </div>
      </Modal>
    </div>
  );
}

function Mini({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-xl bg-[#F9FAFB] p-2">
      <div className="text-[10px] uppercase" style={{ color, fontWeight: 800 }}>{label}</div>
      <div className="text-[16px] mt-0.5 text-[#1F2430]" style={{ fontWeight: 900 }}>{value}</div>
    </div>
  );
}
