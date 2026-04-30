import { useState } from 'react';
import { Truck, Camera, FileText, CheckCircle2, AlertTriangle, ArrowDownToLine, Undo2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useStore, store } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import type { Courier } from '../domain/types';

const PURPOSE: Record<Courier['purpose'], { label: string; color: string; icon: any }> = {
  inbound:         { label: 'Везёт заказы',     color: '#0EA5E9', icon: ArrowDownToLine },
  returns_pickup:  { label: 'Забирает возвраты', color: '#F43F5E', icon: Undo2 },
  expired_pickup:  { label: 'Забирает просрочки', color: '#F59E0B', icon: Clock },
};

const STATUS_LABEL: Record<Courier['status'], string> = {
  idle:        'Ожидает',
  en_route_in: 'В пути',
  arrived:     'Прибыл',
  en_route_out:'Уехал',
  completed:   'Завершён',
};

export function HandoffPage() {
  const { couriers, batches, returns: rets, orders } = useStore();
  const [active, setActive] = useState<Courier | null>(null);
  const [signOpen, setSignOpen] = useState(false);
  const [photoTaken, setPhotoTaken] = useState(false);

  const expectedReturns = rets.filter(r => r.status === 'send_to_warehouse' || r.status === 'send_to_seller');
  const expiredOrders = orders.filter(o => o.status === 'expired_storage');

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      <PageHeader title="Курьеры / Передача" subtitle={`${couriers.length} курьеров`} />

      <div className="px-5 -mt-5 grid md:grid-cols-[1fr_360px] gap-4">
        <div className="space-y-2">
          {couriers.length === 0 && <EmptyState title="Нет курьеров" subtitle="Сегодня никого не ожидается" icon={<Truck className="w-5 h-5" />} />}
          {couriers.map(c => {
            const p = PURPOSE[c.purpose];
            const Icon = p.icon;
            return (
              <button
                key={c.id}
                onClick={() => setActive(c)}
                className="w-full text-left bg-white rounded-2xl p-3 active-press"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: p.color + '20' }}>
                      <Icon className="w-5 h-5" style={{ color: p.color }} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] text-[#1F2430] truncate" style={{ fontWeight: 800 }}>{c.name}</div>
                      <div className="text-[11px] text-[#6B7280] truncate">{c.id} · {c.phone}{c.vehicleNumber ? ` · ${c.vehicleNumber}` : ''}</div>
                      <div className="text-[10px]" style={{ color: p.color, fontWeight: 700 }}>{p.label}</div>
                    </div>
                  </div>
                  <div className="text-[10px] px-2 py-0.5 rounded-full text-white"
                    style={{
                      backgroundColor: c.status === 'completed' ? '#16A34A'
                        : c.status === 'arrived' ? '#0EA5E9'
                        : c.status === 'en_route_in' ? '#F59E0B'
                        : '#6B7280',
                      fontWeight: 800,
                    }}>
                    {STATUS_LABEL[c.status]}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl p-4 h-fit">
          <div className="text-[12px] text-[#6B7280] uppercase mb-2" style={{ fontWeight: 800 }}>На передачу</div>
          <div className="space-y-2">
            <Pill color="#F43F5E" label="Возвраты на склад/продавцу" value={expectedReturns.length} />
            <Pill color="#F59E0B" label="Просроченные заказы" value={expiredOrders.length} />
            <Pill color="#0EA5E9" label="Ожидаемых партий" value={batches.filter(b => b.status === 'expected').length} />
          </div>
          <div className="mt-3 grid gap-2">
            <button
              onClick={() => {
                if (expectedReturns.length === 0) { toast('Нет возвратов на передачу'); return; }
                expectedReturns.forEach(r => store.setReturnStatus(r.id, 'closed'));
                toast.success(`Передано возвратов: ${expectedReturns.length}`);
              }}
              className="rounded-xl bg-[#F43F5E15] text-[#F43F5E] px-3 h-10 active-press text-[12px]" style={{ fontWeight: 800 }}
            >
              Передать все возвраты
            </button>
            <button
              onClick={() => {
                if (expiredOrders.length === 0) { toast('Нет просроченных'); return; }
                expiredOrders.forEach(o => store.setOrderStatus(o.id, 'returned_to_warehouse', 'Передано курьеру (просрочка)'));
                toast.success(`Передано: ${expiredOrders.length}`);
              }}
              className="rounded-xl bg-[#F59E0B15] text-[#F59E0B] px-3 h-10 active-press text-[12px]" style={{ fontWeight: 800 }}
            >
              Передать все просрочки
            </button>
          </div>
        </div>
      </div>

      <Modal
        open={!!active}
        onClose={() => setActive(null)}
        title={active ? `Курьер ${active.id}` : ''}
        wide
        footer={
          active ? (
            <>
              <button onClick={() => setActive(null)} className="px-4 h-9 rounded-lg text-[12px] text-[#6B7280] active-press" style={{ fontWeight: 700 }}>Закрыть</button>
              <button
                onClick={() => setSignOpen(true)}
                disabled={active.status === 'completed'}
                className="px-4 h-9 rounded-lg bg-[#16A34A] text-white text-[12px] active-press disabled:opacity-40" style={{ fontWeight: 800 }}
              >
                <CheckCircle2 className="w-3 h-3 inline mr-1" /> Подписать передачу
              </button>
            </>
          ) : null
        }
      >
        {active && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <Cube k="Курьер" v={active.name} />
              <Cube k="Телефон" v={active.phone} />
              <Cube k="Машина" v={active.vehicleNumber ?? '—'} />
              <Cube k="Статус" v={STATUS_LABEL[active.status]} />
              <Cube k="Цель" v={PURPOSE[active.purpose].label} />
              <Cube k="Прибытие" v={active.arrivedAt ? fmt(active.arrivedAt) : active.expectedAt ? fmt(active.expectedAt) : '—'} />
            </div>

            {active.purpose === 'inbound' && (
              <InboundFlow batchId={active.batchId} />
            )}
            {active.purpose === 'returns_pickup' && (
              <ReturnsHandoff />
            )}
            {active.purpose === 'expired_pickup' && (
              <ExpiredHandoff />
            )}

            <div className="grid grid-cols-3 gap-2 text-[11px]">
              <button
                onClick={() => { setPhotoTaken(true); toast.success('Фото передачи сохранено'); }}
                className="rounded-xl px-3 h-9 active-press flex items-center justify-center gap-1"
                style={{ backgroundColor: '#0EA5E915', color: '#0EA5E9', fontWeight: 800 }}
              >
                <Camera className="w-3 h-3" /> {photoTaken ? 'Фото ✓' : 'Сделать фото'}
              </button>
              <button
                onClick={() => {
                  store.setCourierStatus(active.id, 'arrived');
                  toast.success('Прибытие отмечено');
                  setActive({ ...active, status: 'arrived' });
                }}
                className="rounded-xl px-3 h-9 active-press flex items-center justify-center gap-1"
                style={{ backgroundColor: '#F59E0B15', color: '#F59E0B', fontWeight: 800 }}
              >
                Отметить прибытие
              </button>
              <button
                onClick={() => {
                  store.createProblem({
                    type: 'courier_incomplete',
                    description: `Проблема с курьером ${active.name}`,
                    priority: 'high',
                  });
                  toast.success('Проблема создана');
                }}
                className="rounded-xl px-3 h-9 active-press flex items-center justify-center gap-1"
                style={{ backgroundColor: '#EF444415', color: '#EF4444', fontWeight: 800 }}
              >
                <AlertTriangle className="w-3 h-3" /> Проблема
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={signOpen}
        onClose={() => setSignOpen(false)}
        title="Подписать передачу"
        footer={
          <>
            <button onClick={() => setSignOpen(false)} className="px-4 h-9 rounded-lg text-[12px] text-[#6B7280] active-press" style={{ fontWeight: 700 }}>Отмена</button>
            <button
              onClick={() => {
                if (!active) return;
                store.setCourierStatus(active.id, 'completed');
                store.uploadDocument({
                  kind: active.purpose === 'inbound' ? 'batch_acceptance' : 'proof_of_pickup',
                  title: `Передача ${active.id}`,
                  size: '76 KB',
                  batchId: active.batchId,
                });
                toast.success('Передача подписана');
                setSignOpen(false);
                setActive(null);
              }}
              className="px-4 h-9 rounded-lg bg-[#16A34A] text-white text-[12px] active-press" style={{ fontWeight: 800 }}
            >
              <FileText className="w-3 h-3 inline mr-1" /> Подписать
            </button>
          </>
        }
      >
        <div className="rounded-xl bg-[#F9FAFB] p-3 text-[12px] text-[#374151]">
          Будет создан акт передачи и закрыта работа с курьером.
        </div>
      </Modal>
    </div>
  );
}

function InboundFlow({ batchId }: { batchId?: string }) {
  const { batches } = useStore();
  const batch = batches.find(b => b.id === batchId);
  if (!batch) return <div className="text-[12px] text-[#6B7280]">Партия не привязана</div>;
  return (
    <div className="rounded-xl bg-[#0EA5E915] p-3 text-[12px]">
      <div className="text-[#0369A1]" style={{ fontWeight: 800 }}>Партия {batch.id}</div>
      <div className="text-[#374151] mt-1">{batch.receivedCount}/{batch.expectedCount} принято · статус {batch.status}</div>
    </div>
  );
}
function ReturnsHandoff() {
  const { returns: rets } = useStore();
  const list = rets.filter(r => r.status === 'send_to_warehouse' || r.status === 'send_to_seller');
  return (
    <div className="rounded-xl bg-[#F43F5E15] p-3 text-[12px]">
      <div className="text-[#F43F5E]" style={{ fontWeight: 800 }}>Возвраты к передаче: {list.length}</div>
      <div className="text-[#374151] mt-1">{list.map(r => r.id).join(', ') || '—'}</div>
    </div>
  );
}
function ExpiredHandoff() {
  const { orders } = useStore();
  const list = orders.filter(o => o.status === 'expired_storage');
  return (
    <div className="rounded-xl bg-[#F59E0B15] p-3 text-[12px]">
      <div className="text-[#F59E0B]" style={{ fontWeight: 800 }}>Просроченные заказы: {list.length}</div>
      <div className="text-[#374151] mt-1">{list.map(o => o.id).join(', ') || '—'}</div>
    </div>
  );
}

function Pill({ color, label, value }: { color: string; label: string; value: number | string }) {
  return (
    <div className="rounded-xl p-2 flex items-center justify-between" style={{ backgroundColor: color + '15' }}>
      <div className="text-[11px]" style={{ color, fontWeight: 700 }}>{label}</div>
      <div className="text-[14px]" style={{ color, fontWeight: 900 }}>{value}</div>
    </div>
  );
}
function Cube({ k, v }: { k: string; v: any }) {
  return (
    <div className="rounded-xl bg-[#F9FAFB] p-2">
      <div className="text-[10px] text-[#6B7280] uppercase" style={{ fontWeight: 800 }}>{k}</div>
      <div className="text-[12px] text-[#1F2430] mt-0.5" style={{ fontWeight: 800 }}>{v}</div>
    </div>
  );
}
function fmt(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
}
