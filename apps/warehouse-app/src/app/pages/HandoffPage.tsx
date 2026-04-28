import { useState } from 'react';
import { Camera } from 'lucide-react';
import { toast } from 'sonner';
import { useStore, store } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { ScanInput } from '../components/ScanInput';
import { StatusBadge } from '../components/StatusBadge';

export function HandoffPage() {
  const { orders, couriers } = useStore();
  const ready = orders.filter(o => o.status === 'ready_for_pickup');
  const handed = orders.filter(o => o.status === 'handed_to_courier').slice(0, 5);

  const [courierId, setCourierId] = useState('');
  const [orderCode, setOrderCode] = useState('');
  const [proof, setProof] = useState(false);

  const courier = couriers.find(c => c.id === courierId);
  const order = orders.find(o => o.code === orderCode || o.id === orderCode);

  const confirm = () => {
    if (!courier) { toast.error('Сканируйте курьера'); return; }
    if (!order)   { toast.error('Сканируйте заказ');   return; }
    if (order.status !== 'ready_for_pickup') { toast.error('Заказ не готов к выдаче'); return; }
    const r = store.handoffToCourier(order.id, courier.id, proof ? `mock://proof/${order.code}.jpg` : undefined);
    if (r.ok) { toast.success(`${order.code} → ${courier.name}`); setCourierId(''); setOrderCode(''); setProof(false); }
    else toast.error(r.reason ?? 'Ошибка');
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24 md:pb-8">
      <PageHeader title="Передача курьеру" subtitle={`К выдаче: ${ready.length}`} />

      <div className="px-5 -mt-5 space-y-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <h3 className="text-[14px] text-[#1F2430]" style={{ fontWeight: 800 }}>1. Курьер</h3>
          <ScanInput label="ID курьера" placeholder="CR-104" onScan={setCourierId} buttonText="Курьер" />
          {courier ? (
            <div className="bg-[#F3E8FF] rounded-xl p-3">
              <div className="text-[14px] text-[#6B21A8]" style={{ fontWeight: 800 }}>{courier.name}</div>
              <div className="text-[11px] text-[#6B21A8]" style={{ fontWeight: 600 }}>
                {courier.id} · {courier.phone} · {courier.vehiclePlate}
              </div>
            </div>
          ) : courierId ? (
            <div className="text-[12px] text-[#EF4444]" style={{ fontWeight: 700 }}>
              Курьер {courierId} не найден
            </div>
          ) : null}

          <h3 className="text-[14px] text-[#1F2430] mt-4" style={{ fontWeight: 800 }}>2. Заказ</h3>
          <ScanInput label="Код заказа" placeholder="ORD-2026-…" onScan={setOrderCode} buttonText="Заказ" />
          {order ? (
            <div className="bg-[#DCFCE7] rounded-xl p-3 flex items-center justify-between">
              <div>
                <div className="text-[14px] text-[#166534]" style={{ fontWeight: 800 }}>{order.code}</div>
                <div className="text-[11px] text-[#166534]" style={{ fontWeight: 600 }}>
                  {order.customerName} · {order.packagesCount ?? 1} пак. · {order.weightKg ?? 0} кг
                </div>
              </div>
              <StatusBadge status={order.status} />
            </div>
          ) : orderCode ? (
            <div className="text-[12px] text-[#EF4444]" style={{ fontWeight: 700 }}>
              Заказ {orderCode} не найден
            </div>
          ) : null}

          <h3 className="text-[14px] text-[#1F2430] mt-4" style={{ fontWeight: 800 }}>3. Proof</h3>
          <button
            onClick={() => setProof(true)}
            className="w-full px-4 py-3 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 active-press"
            style={{
              borderColor: proof ? '#00D27A' : '#D1D5DB',
              backgroundColor: proof ? '#D1FAE5' : 'transparent',
              color: proof ? '#065F46' : '#6B7280',
              fontWeight: 700,
            }}
          >
            <Camera className="w-4 h-4" />
            {proof ? '✓ Фото-подтверждение' : 'Сделать фото / подпись'}
          </button>

          <button onClick={confirm} className="w-full h-12 rounded-xl bg-[#7C3AED] text-white active-press" style={{ fontWeight: 800 }}>
            Передать курьеру
          </button>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-[14px] text-[#1F2430] mb-3" style={{ fontWeight: 800 }}>Готовы к выдаче</h3>
          {ready.length === 0 ? (
            <div className="text-[12px] text-[#6B7280]" style={{ fontWeight: 500 }}>Нет</div>
          ) : ready.map(o => (
            <button
              key={o.id}
              onClick={() => setOrderCode(o.code)}
              className="w-full text-left flex items-center justify-between py-2 border-b border-[#F3F4F6] last:border-0 active-press"
            >
              <div>
                <div className="text-[13px] text-[#1F2430]" style={{ fontWeight: 700 }}>{o.code}</div>
                <div className="text-[11px] text-[#6B7280]" style={{ fontWeight: 500 }}>
                  {o.customerName} · {o.packagesCount ?? 1} пак.
                </div>
              </div>
              <StatusBadge status={o.status} />
            </button>
          ))}
        </div>

        {handed.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-[14px] text-[#1F2430] mb-3" style={{ fontWeight: 800 }}>Недавно переданы</h3>
            {handed.map(o => (
              <div key={o.id} className="flex items-center justify-between py-2 border-b border-[#F3F4F6] last:border-0 text-[12px]">
                <span className="text-[#1F2430]" style={{ fontWeight: 700 }}>{o.code}</span>
                <span className="text-[#6B7280]" style={{ fontWeight: 500 }}>{o.courierId ?? '—'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
