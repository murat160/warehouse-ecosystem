import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Camera } from 'lucide-react';
import { toast } from 'sonner';
import { useStore, store } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { StatusBadge } from '../components/StatusBadge';
import { ItemCard } from '../components/ItemCard';

const PACKAGE_TYPES = ['BAG-S', 'BAG-M', 'BAG-L', 'BOX-S', 'BOX-M', 'BOX-L', 'PALLET'];

export function PackingPage() {
  const { orderId } = useParams();
  const { orders, skus, bins } = useStore();
  const nav = useNavigate();

  if (!orderId) {
    const queue = orders.filter(o => o.status === 'picked' || o.status === 'packing_in_progress' || o.status === 'sorting');
    return (
      <div className="min-h-screen bg-[#F5F6F8] pb-24 md:pb-8">
        <PageHeader title="Упаковка" subtitle={`В очереди: ${queue.length}`} />
        <div className="px-5 -mt-5 space-y-2">
          {queue.length === 0 ? <EmptyState emoji="📦" title="Нет заказов на упаковку" /> : queue.map(o => (
            <button key={o.id} onClick={() => nav(`/packing/${o.id}`)} className="w-full text-left bg-white rounded-2xl p-4 shadow-sm active-press">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[14px] text-[#1F2430]" style={{ fontWeight: 800 }}>{o.code}</div>
                  <div className="text-[11px] text-[#6B7280]" style={{ fontWeight: 500 }}>{o.customerName} · {o.items.length} поз.</div>
                </div>
                <StatusBadge status={o.status} />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return <PackingDetail orderId={orderId} skus={skus} bins={bins} orders={orders} nav={nav} />;
}

function PackingDetail({ orderId, skus, bins, orders, nav }: any) {
  const order = orders.find((o: any) => o.id === orderId);
  const [weight, setWeight]   = useState(order?.weightKg ? String(order.weightKg) : '');
  const [pkgType, setPkg]     = useState(order?.packageType ?? 'BOX-M');
  const [count, setCount]     = useState(String(order?.packagesCount ?? 1));
  const [photoTaken, setPhoto] = useState(false);
  const [scanned, setScanned] = useState<string[]>(order?.items.map((i: any) => i.sku) ?? []);

  if (!order) return <div className="p-5"><EmptyState emoji="❓" title="Заказ не найден" /></div>;

  const start = () => { store.startPacking(orderId); toast('Упаковка начата'); };
  const pack = () => {
    if (scanned.length < order.items.length) { toast.error('Проверьте все товары'); return; }
    const w = parseFloat(weight);
    if (!w || w <= 0) { toast.error('Укажите вес'); return; }
    const c = parseInt(count, 10);
    if (!c || c < 1) { toast.error('Кол-во пакетов'); return; }
    const r = store.packOrder(orderId, { weightKg: w, packageType: pkgType, packagesCount: c, photo: photoTaken ? `mock://pkg/${order.code}.jpg` : undefined });
    if (r.ok) { toast.success('Упаковано, label создан'); nav('/ready'); }
    else toast.error(r.reason ?? 'Ошибка');
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24 md:pb-8">
      <PageHeader title={`Упаковка ${order.code}`} subtitle={`${order.customerName} · ${order.items.length} поз.`} right={<StatusBadge status={order.status} />} />

      <div className="px-5 -mt-5 space-y-3">
        {order.status === 'picked' && (
          <button onClick={start} className="w-full h-11 rounded-xl bg-[#10B981] text-white active-press" style={{ fontWeight: 800 }}>
            Начать упаковку
          </button>
        )}

        <div className="space-y-2">
          {order.items.map((it: any) => {
            const sku = skus.find((s: any) => s.sku === it.sku);
            return (
              <ItemCard
                key={it.id}
                item={it}
                sku={sku}
                bin={bins.find((b: any) => b.id === it.binId)}
                orderCode={order.code}
                size="sm"
                urgent={order.priority === 'urgent'}
                right={
                  <button
                    onClick={() => setScanned(s => s.includes(it.sku) ? s.filter(x => x !== it.sku) : [...s, it.sku])}
                    className="w-full h-10 rounded-xl text-white active-press text-[12px]"
                    style={{ backgroundColor: scanned.includes(it.sku) ? '#00D27A' : '#9CA3AF', fontWeight: 800 }}
                  >
                    {scanned.includes(it.sku) ? '✓ Проверен' : 'Отметить как проверен'}
                  </button>
                }
              />
            );
          })}
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <h3 className="text-[14px] text-[#1F2430]" style={{ fontWeight: 800 }}>Параметры упаковки</h3>
          <div>
            <div className="text-[11px] text-[#6B7280] mb-1" style={{ fontWeight: 700 }}>Тип</div>
            <div className="grid grid-cols-4 gap-1.5">
              {PACKAGE_TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => setPkg(t)}
                  className="h-9 rounded-lg text-[11px] active-press"
                  style={{ backgroundColor: pkgType === t ? '#1F2430' : '#F3F4F6', color: pkgType === t ? 'white' : '#374151', fontWeight: 800 }}
                >{t}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Вес (кг)" value={weight} onChange={setWeight} type="number" />
            <Field label="Пакетов" value={count}  onChange={setCount}  type="number" />
          </div>
          <button
            onClick={() => setPhoto(true)}
            className="w-full px-4 py-3 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 active-press"
            style={{
              borderColor: photoTaken ? '#00D27A' : '#D1D5DB',
              backgroundColor: photoTaken ? '#D1FAE5' : 'transparent',
              color: photoTaken ? '#065F46' : '#6B7280',
              fontWeight: 700,
            }}
          >
            <Camera className="w-4 h-4" />
            {photoTaken ? '✓ Фото упаковки' : 'Сделать фото упаковки'}
          </button>
          <button onClick={pack} className="w-full h-12 rounded-xl bg-[#22C55E] text-white active-press" style={{ fontWeight: 800 }}>
            Закрыть упаковку → Готов к выдаче
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <div className="text-[11px] text-[#6B7280] mb-1" style={{ fontWeight: 700 }}>{label}</div>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-xl border-2 border-[#E5E7EB] focus:border-[#10B981] focus:outline-none text-[14px]"
        style={{ fontWeight: 600 }}
      />
    </div>
  );
}
