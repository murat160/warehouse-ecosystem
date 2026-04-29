import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useStore, store } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { ItemCard } from '../components/ItemCard';
import { ScanInput } from '../components/ScanInput';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { ZoneBadge } from '../components/ZoneBadge';
import type { OrderItem } from '../domain/types';

export function PickingPage() {
  const { orderId } = useParams();
  const { orders, skus, bins } = useStore();
  const nav = useNavigate();

  if (!orderId) {
    const queue = orders.filter(o =>
      o.status === 'picking_assigned' || o.status === 'picking_in_progress' || o.status === 'received_by_warehouse'
    );
    return (
      <div className="min-h-screen bg-[#F5F6F8] pb-24 md:pb-8">
        <PageHeader title="Сборка" subtitle={`В очереди: ${queue.length}`} />
        <div className="px-5 -mt-5 space-y-2">
          {queue.length === 0 ? (
            <EmptyState emoji="🛒" title="Нет заказов на сборку" />
          ) : queue.map(o => (
            <button key={o.id} onClick={() => nav(`/picking/${o.id}`)} className="w-full text-left bg-white rounded-2xl p-4 shadow-sm active-press">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-[14px] text-[#1F2430]" style={{ fontWeight: 800 }}>{o.code}</div>
                  <div className="text-[11px] text-[#6B7280]" style={{ fontWeight: 500 }}>{o.customerName} · {o.city}</div>
                </div>
                <StatusBadge status={o.status} />
              </div>
              <div className="flex flex-wrap gap-1.5">
                <ZoneBadge zone={o.zone} />
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#374151]" style={{ fontWeight: 700 }}>
                  {o.items.length} поз.
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const order = orders.find(o => o.id === orderId);
  if (!order) {
    return (
      <div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center px-5">
        <EmptyState emoji="❓" title="Заказ не найден" />
      </div>
    );
  }

  const remaining = order.items.filter(i => i.status !== 'found');
  const allDone = remaining.length === 0;

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24 md:pb-8">
      <PageHeader
        title={`Сборка ${order.code}`}
        subtitle={`${order.customerName} · ${order.city} · ${order.items.length} поз.`}
        right={<StatusBadge status={order.status} />}
      />

      <div className="px-5 -mt-5">
        <div className="bg-white rounded-2xl p-3 shadow-sm mb-3 flex items-center gap-2">
          <ZoneBadge zone={order.zone} size="md" />
          {order.status === 'received_by_warehouse' && (
            <button
              onClick={() => { store.startPicking(orderId); toast('Сборка начата'); }}
              className="ml-auto px-3 h-9 rounded-lg bg-[#F59E0B] text-white text-[12px] active-press" style={{ fontWeight: 700 }}
            >
              Назначить и начать
            </button>
          )}
          {allDone && order.status === 'picking_in_progress' && (
            <button
              onClick={() => {
                const r = store.finishPicking(orderId);
                if (r.ok) { toast.success('Сборка завершена'); nav('/sorting/' + orderId); }
                else toast.error(r.reason ?? 'Ошибка');
              }}
              className="ml-auto px-3 h-9 rounded-lg bg-[#00D27A] text-white text-[12px] active-press" style={{ fontWeight: 700 }}
            >
              Завершить → Сортировка
            </button>
          )}
        </div>

        <div className="space-y-3">
          {order.items.map(it => (
            <ItemRow key={it.id} orderId={orderId} item={it}
              sku={skus.find(s => s.sku === it.sku)!}
              bin={bins.find(b => b.id === it.binId)}
              orderCode={order.code}
              urgent={order.priority === 'urgent'}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ItemRow({ orderId, item, sku, bin, orderCode, urgent }: { orderId: string; item: OrderItem; sku: any; bin: any; orderCode: string; urgent?: boolean }) {
  const [showActions, setShowActions] = useState<null | 'comment' | 'damaged' | 'missing'>(null);
  const [text, setText] = useState('');

  const handleScanBin = (code: string) => {
    const r = store.pickScanBin(orderId, item.id, code);
    if (r.ok) toast.success('Ячейка верная'); else toast.error(r.reason ?? 'Ошибка');
  };
  const handleScanItem = (code: string) => {
    const r = store.pickScanItem(orderId, item.id, code);
    if (r.ok) toast.success('Товар верный'); else toast.error(r.reason ?? 'Ошибка');
  };
  const handleConfirm = () => {
    const r = store.pickConfirmItem(orderId, item.id, item.qty);
    if (r.ok) toast.success(`Найдено ×${item.qty}`); else toast.error(r.reason ?? 'Ошибка');
  };

  const submitText = () => {
    if (!showActions) return;
    if (!text.trim()) { toast.error('Введите текст'); return; }
    if (showActions === 'comment')      store.pickAddComment(orderId, item.id, text);
    else if (showActions === 'damaged') store.pickMarkDamaged(orderId, item.id, text);
    else if (showActions === 'missing') store.pickMarkMissing(orderId, item.id, text);
    toast(showActions === 'comment' ? 'Комментарий сохранён' : 'Проблема создана');
    setShowActions(null); setText('');
  };

  return (
    <>
      <ItemCard item={item} sku={sku} bin={bin} orderCode={orderCode} size="lg" urgent={urgent} right={
        item.status === 'found' ? null : (
          <div className="space-y-2">
            <ScanInput
              label={item.status === 'pending' ? `1. Ячейка: ${item.binId}` : item.status === 'scanned_bin' ? '2. Товар' : '3. Подтверждение'}
              placeholder={item.status === 'pending' ? item.binId : item.status === 'scanned_bin' ? sku.barcode : '—'}
              onScan={(c) => item.status === 'pending' ? handleScanBin(c) : handleScanItem(c)}
              buttonText={item.status === 'pending' ? 'Ячейка' : 'Товар'}
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                disabled={item.status !== 'scanned_item'}
                onClick={handleConfirm}
                className="h-10 rounded-xl text-white active-press text-[12px] disabled:opacity-50"
                style={{ backgroundColor: '#00D27A', fontWeight: 800 }}
              >Найдено ×{item.qty}</button>
              <button
                onClick={() => setShowActions('missing')}
                className="h-10 rounded-xl text-white active-press text-[12px]"
                style={{ backgroundColor: '#EF4444', fontWeight: 800 }}
              >Не найдено</button>
              <button
                onClick={() => setShowActions('damaged')}
                className="h-10 rounded-xl text-white active-press text-[12px]"
                style={{ backgroundColor: '#F59E0B', fontWeight: 800 }}
              >Повреждён</button>
              <button
                onClick={() => setShowActions('comment')}
                className="h-10 rounded-xl text-[12px] active-press"
                style={{ backgroundColor: '#F3F4F6', color: '#1F2430', fontWeight: 800 }}
              >Комментарий</button>
            </div>
          </div>
        )
      } />

      <Modal
        open={!!showActions}
        title={showActions === 'comment' ? 'Комментарий' : showActions === 'damaged' ? 'Повреждение' : 'Не найден'}
        onClose={() => { setShowActions(null); setText(''); }}
        footer={
          <button onClick={submitText} className="w-full h-11 rounded-xl bg-[#1F2430] text-white active-press" style={{ fontWeight: 800 }}>
            Сохранить
          </button>
        }
      >
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={4}
          placeholder="Опишите подробнее…"
          className="w-full px-3 py-2 rounded-xl border-2 border-[#E5E7EB] focus:border-[#1F2430] focus:outline-none text-[14px] resize-none"
          style={{ fontWeight: 500 }}
        />
      </Modal>
    </>
  );
}
