import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, Package, Move, AlertTriangle, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useStore, store } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';
import { OrderStatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';

export function SearchPage() {
  const { orders, cells } = useStore();
  const [q, setQ] = useState('');
  const nav = useNavigate();

  const results = useMemo(() => {
    if (!q.trim()) return [];
    const Q = q.trim().toLowerCase();
    return orders.filter(o =>
      [o.id, o.trackingNumber, o.packageLabel, o.pickupCode, o.qr, o.customerName, o.customerPhone, o.cellId ?? '', o.courierBatchId ?? '']
        .some(v => v.toLowerCase().includes(Q))
    );
  }, [orders, q]);

  const moveOrder = (orderId: string) => {
    const free = cells.find(c => c.status === 'empty');
    if (!free) { toast.error('Нет свободных ячеек'); return; }
    store.moveOrder(orderId, free.id);
    toast.success(`Перемещён в ${free.id}`);
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      <PageHeader title="Поиск заказа" subtitle="По Order ID, tracking, pickup code, телефону, клиенту, label, ячейке, batch" />

      <div className="px-5 -mt-5 max-w-3xl mx-auto space-y-3">
        <div className="bg-white rounded-2xl p-3 flex items-center gap-2">
          <SearchIcon className="w-5 h-5 text-[#9CA3AF]" />
          <input
            autoFocus
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Введите запрос"
            className="flex-1 outline-none text-[14px]"
          />
        </div>

        {q.trim().length === 0 && (
          <EmptyState title="Начните поиск" subtitle="Запрос обработает все поля заказа" icon={<SearchIcon className="w-5 h-5" />} />
        )}

        {q.trim().length > 0 && results.length === 0 && (
          <EmptyState title="Ничего не найдено" subtitle="Попробуйте другой запрос" />
        )}

        {results.length > 0 && (
          <div className="space-y-2">
            {results.map(o => (
              <div key={o.id} className="bg-white rounded-2xl p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[13px] text-[#1F2430] truncate" style={{ fontWeight: 800 }}>{o.id}</div>
                    <div className="text-[11px] text-[#6B7280] truncate">{o.trackingNumber} · {o.customerName} · {o.customerPhone}</div>
                    <div className="text-[10px] text-[#6B7280] truncate" style={{ fontFamily: 'monospace' }}>
                      Code {o.pickupCode} · Label {o.packageLabel} · Cell {o.cellId ?? '—'}
                    </div>
                  </div>
                  <OrderStatusBadge status={o.status} />
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Mini icon={Package} color="#0EA5E9" label="Открыть" onClick={() => nav('/orders?filter=all')} />
                  <Mini icon={UserCheck} color="#22C55E" label="Выдать" onClick={() => nav('/issue?order=' + o.id)} />
                  <Mini icon={Move} color="#7C3AED" label="Переместить" onClick={() => moveOrder(o.id)} />
                  <Mini icon={AlertTriangle} color="#EF4444" label="Проблема"
                    onClick={() => {
                      store.createProblem({ type: 'wrong_order', description: 'Создано из поиска', orderId: o.id, priority: 'medium' });
                      toast.success('Проблема создана');
                    }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Mini({ icon: Icon, color, label, onClick }: { icon: any; color: string; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-lg px-3 h-8 active-press flex items-center gap-1 text-[11px]"
      style={{ backgroundColor: color + '15', color, fontWeight: 800 }}>
      <Icon className="w-3 h-3" /> {label}
    </button>
  );
}
