import { Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useStore, store } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { StatusBadge } from '../components/StatusBadge';
import { ZoneBadge } from '../components/ZoneBadge';

export function ReadyPage() {
  const { orders } = useStore();
  const nav = useNavigate();
  const queue = orders.filter(o => o.status === 'packed' || o.status === 'ready_for_pickup');

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24 md:pb-8">
      <PageHeader title="Готово к выдаче" subtitle={`Заказов: ${queue.length}`} />
      <div className="px-5 -mt-5 space-y-2">
        {queue.length === 0 ? (
          <EmptyState emoji="✅" title="Нет заказов" />
        ) : queue.map(o => (
          <div key={o.id} className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-[14px] text-[#1F2430]" style={{ fontWeight: 800 }}>{o.code}</div>
                <div className="text-[11px] text-[#6B7280]" style={{ fontWeight: 500 }}>
                  {o.customerName} · {o.city}
                  {o.weightKg !== undefined && ` · ${o.weightKg} кг`}
                  {o.packagesCount && ` · ${o.packagesCount} пак.`}
                </div>
              </div>
              <StatusBadge status={o.status} />
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              <ZoneBadge zone={o.zone} />
              {o.shippingLabel && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E0E7FF] text-[#3730A3] font-mono" style={{ fontWeight: 800 }}>
                  {o.shippingLabel}
                </span>
              )}
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#374151]" style={{ fontWeight: 700 }}>
                SLA {new Date(o.slaDeadline).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
              </span>
              {o.courierId && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F3E8FF] text-[#6B21A8]" style={{ fontWeight: 700 }}>
                  {o.courierId}
                </span>
              )}
            </div>

            <div className="flex gap-2 flex-wrap">
              {o.status === 'packed' && (
                <button
                  onClick={() => { const r = store.markReady(o.id); if (r.ok) toast.success('Готов к выдаче'); else toast.error(r.reason ?? 'Ошибка'); }}
                  className="px-3 h-9 rounded-lg bg-[#22C55E] text-white text-[12px] active-press" style={{ fontWeight: 700 }}
                >Перевести в "Готов"</button>
              )}
              {o.status === 'ready_for_pickup' && (
                <button
                  onClick={() => nav('/handoff')}
                  className="px-3 h-9 rounded-lg bg-[#7C3AED] text-white text-[12px] active-press" style={{ fontWeight: 700 }}
                >Передать курьеру</button>
              )}
              {o.shippingLabel && (
                <button
                  onClick={() => { store.reprintLabel(o.id); toast(`Перепечатка ${o.shippingLabel}`); }}
                  className="px-3 h-9 rounded-lg bg-[#F3F4F6] text-[#374151] text-[12px] active-press inline-flex items-center gap-1" style={{ fontWeight: 700 }}
                >
                  <Printer className="w-3 h-3" /> Label
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
