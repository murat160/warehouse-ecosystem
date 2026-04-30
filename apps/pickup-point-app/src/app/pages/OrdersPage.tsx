import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search as SearchIcon, Move, Printer, Undo2, AlertTriangle, MessagesSquare, FileText, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useStore, store } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';
import { OrderStatusBadge } from '../components/StatusBadge';
import { Drawer, Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import type { PickupOrder } from '../domain/types';

const FILTERS: { id: string; label: string; match: (o: PickupOrder) => boolean }[] = [
  { id: 'all',      label: 'Все',                match: () => true },
  { id: 'arrived',  label: 'Новые',              match: o => o.status === 'arrived_to_pvz' || o.status === 'receiving' },
  { id: 'stored',   label: 'В ячейке',           match: o => o.status === 'stored' },
  { id: 'ready',    label: 'Готово к выдаче',    match: o => o.status === 'ready_for_pickup' || o.status === 'pickup_code_sent' },
  { id: 'issued',   label: 'Выдано',             match: o => o.status === 'issued' },
  { id: 'expired',  label: 'Просрочено',         match: o => o.status === 'expired_storage' },
  { id: 'return',   label: 'Возврат',            match: o => o.status.startsWith('return') || o.status === 'customer_refused' },
  { id: 'problem',  label: 'Проблема',           match: o => o.status === 'problem' },
  { id: 'expected', label: 'Ожидает',            match: o => o.status === 'expected_to_pvz' },
];

export function OrdersPage() {
  const { orders, cells } = useStore();
  const [params, setParams] = useSearchParams();
  const filter = params.get('filter') ?? 'all';
  const [search, setSearch] = useState('');
  const [drawerOrderId, setDrawerOrderId] = useState<string | null>(null);
  const [moveOpen, setMoveOpen] = useState(false);
  const [problemOpen, setProblemOpen] = useState(false);
  const [problemDesc, setProblemDesc] = useState('');
  const nav = useNavigate();

  const drawerOrder = orders.find(o => o.id === drawerOrderId) ?? null;

  const filtered = useMemo(() => {
    const matcher = FILTERS.find(f => f.id === filter)?.match ?? FILTERS[0].match;
    return orders
      .filter(matcher)
      .filter(o => {
        if (!search.trim()) return true;
        const q = search.trim().toLowerCase();
        return [o.id, o.trackingNumber, o.packageLabel, o.pickupCode, o.customerName, o.customerPhone, o.cellId ?? '']
          .some(v => v.toLowerCase().includes(q));
      });
  }, [orders, filter, search]);

  const setFilter = (id: string) => {
    if (id === 'all') params.delete('filter'); else params.set('filter', id);
    setParams(params, { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      <PageHeader title="Заказы в ПВЗ" subtitle={`${orders.length} всего · ${filtered.length} показано`} />

      <div className="px-5 -mt-5 space-y-3">
        <div className="bg-white rounded-2xl p-3">
          <div className="flex items-center gap-2 mb-3">
            <SearchIcon className="w-4 h-4 text-[#9CA3AF]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск: Order ID / Tracking / Pickup Code / телефон / клиент / ячейка"
              className="flex-1 text-[13px] outline-none"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-3 h-8 rounded-full text-[12px] flex-shrink-0 ${filter === f.id ? 'bg-[#0EA5E9] text-white' : 'bg-[#F3F4F6] text-[#374151]'}`}
                style={{ fontWeight: 700 }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState title="Нет заказов" subtitle="Попробуйте сменить фильтр или поиск" />
        ) : (
          <div className="bg-white rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead className="bg-[#F9FAFB] text-[10px] text-[#6B7280] uppercase">
                  <tr>
                    <th className="text-left px-3 py-2">Order ID</th>
                    <th className="text-left px-3 py-2">Клиент</th>
                    <th className="text-left px-3 py-2">Pickup Code</th>
                    <th className="text-left px-3 py-2">Ячейка</th>
                    <th className="text-left px-3 py-2">Статус</th>
                    <th className="text-left px-3 py-2">Прибыл</th>
                    <th className="text-left px-3 py-2">Срок</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(o => (
                    <tr
                      key={o.id}
                      onClick={() => setDrawerOrderId(o.id)}
                      className="border-t border-[#F3F4F6] hover:bg-[#F9FAFB] cursor-pointer active-press"
                    >
                      <td className="px-3 py-2.5 text-[#1F2430]" style={{ fontWeight: 800 }}>
                        {o.id}
                        <div className="text-[10px] text-[#6B7280] mt-0.5" style={{ fontWeight: 500 }}>{o.trackingNumber}</div>
                      </td>
                      <td className="px-3 py-2.5 text-[#374151]">
                        {o.customerName}
                        <div className="text-[10px] text-[#6B7280] mt-0.5">{o.customerPhone}</div>
                      </td>
                      <td className="px-3 py-2.5 text-[#1F2430]" style={{ fontWeight: 800, fontFamily: 'monospace' }}>{o.pickupCode}</td>
                      <td className="px-3 py-2.5 text-[#374151]" style={{ fontFamily: 'monospace' }}>{o.cellId ?? '—'}</td>
                      <td className="px-3 py-2.5"><OrderStatusBadge status={o.status} /></td>
                      <td className="px-3 py-2.5 text-[#6B7280]">{o.arrivedAt ? fmt(o.arrivedAt) : '—'}</td>
                      <td className="px-3 py-2.5 text-[#6B7280]">{o.storageDeadline ? fmt(o.storageDeadline) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <Drawer
        open={!!drawerOrder}
        onClose={() => setDrawerOrderId(null)}
        title={drawerOrder?.id ?? ''}
        footer={
          drawerOrder ? (
            <>
              <button onClick={() => setDrawerOrderId(null)} className="px-4 h-9 rounded-lg text-[12px] text-[#6B7280] active-press" style={{ fontWeight: 700 }}>Закрыть</button>
              <button
                onClick={() => { nav('/issue?order=' + drawerOrder.id); }}
                className="px-4 h-9 rounded-lg bg-[#22C55E] text-white text-[12px] active-press" style={{ fontWeight: 800 }}
              >
                <CheckCircle2 className="w-3 h-3 inline mr-1" /> К выдаче
              </button>
            </>
          ) : null
        }
      >
        {drawerOrder && (
          <div className="space-y-4">
            <Section title="Основное">
              <Row k="Order ID" v={drawerOrder.id} />
              <Row k="Tracking" v={drawerOrder.trackingNumber} />
              <Row k="Pickup Code" v={<span style={{ fontFamily: 'monospace', fontWeight: 800 }}>{drawerOrder.pickupCode}</span>} />
              <Row k="QR" v={drawerOrder.qr} />
              <Row k="Клиент" v={drawerOrder.customerName} />
              <Row k="Телефон" v={drawerOrder.customerPhone} />
              <Row k="Статус" v={<OrderStatusBadge status={drawerOrder.status} />} />
              <Row k="Прибыл"  v={drawerOrder.arrivedAt ? fmt(drawerOrder.arrivedAt) : '—'} />
              <Row k="Срок хранения" v={drawerOrder.storageDeadline ? fmt(drawerOrder.storageDeadline) : '—'} />
            </Section>

            <Section title="Товар / посылка">
              <Row k="Категория" v={drawerOrder.category ?? '—'} />
              <Row k="Кол-во пакетов" v={drawerOrder.packageCount} />
              <Row k="Вес" v={`${drawerOrder.weight} кг`} />
              <Row k="Размер" v={drawerOrder.size} />
              {drawerOrder.fragile && <Row k="Хрупкое" v={<span className="text-[#EF4444]" style={{ fontWeight: 800 }}>Да</span>} />}
              {drawerOrder.coldChain && <Row k="Cold chain" v={<span className="text-[#0EA5E9]" style={{ fontWeight: 800 }}>Да</span>} />}
            </Section>

            <Section title="Локация">
              <div className="rounded-xl bg-[#F9FAFB] p-3 text-[13px] text-[#1F2430]" style={{ fontFamily: 'monospace', fontWeight: 800 }}>
                {drawerOrder.zone ?? '—'} · {drawerOrder.row ?? '—'} · {drawerOrder.shelf ?? '—'} · {drawerOrder.cellId ?? '—'}
              </div>
            </Section>

            <Section title="Действия">
              <div className="grid grid-cols-2 gap-2">
                <ActionBtn icon={Move} color="#0EA5E9" label="Переместить"
                  onClick={() => setMoveOpen(true)} />
                <ActionBtn icon={Printer} color="#6B7280" label="Печать label"
                  onClick={() => { store.printOrderLabel(drawerOrder.id); toast.success('Label распечатан'); }} />
                <ActionBtn icon={Undo2} color="#F43F5E" label="Создать возврат"
                  onClick={() => {
                    store.createReturn({ orderId: drawerOrder.id, reason: 'wrong_item', description: 'Создан со страницы заказа' });
                    toast.success('Возврат создан');
                    nav('/returns');
                  }} />
                <ActionBtn icon={AlertTriangle} color="#EF4444" label="Создать проблему"
                  onClick={() => setProblemOpen(true)} />
                <ActionBtn icon={MessagesSquare} color="#7C3AED" label="Открыть чат"
                  onClick={() => {
                    const c = store.createChat('order', `По заказу ${drawerOrder.id}`, { orderId: drawerOrder.id });
                    toast.success('Чат создан');
                    nav('/chat?thread=' + c.id);
                  }} />
                <ActionBtn icon={FileText} color="#0369A1" label="Загрузить документ"
                  onClick={() => {
                    store.uploadDocument({ kind: 'proof_of_pickup', title: `Документ ${drawerOrder.id}`, size: '64 KB', orderId: drawerOrder.id });
                    toast.success('Документ загружен');
                  }} />
              </div>
            </Section>

            {drawerOrder.comments.length > 0 && (
              <Section title="Комментарии">
                {drawerOrder.comments.map((c, i) => (
                  <div key={i} className="text-[12px] text-[#374151] rounded-xl bg-[#F9FAFB] p-2">{c}</div>
                ))}
              </Section>
            )}
          </div>
        )}
      </Drawer>

      <Modal
        open={moveOpen}
        onClose={() => setMoveOpen(false)}
        title="Переместить заказ"
        footer={
          <button onClick={() => setMoveOpen(false)} className="px-4 h-9 rounded-lg bg-[#6B7280] text-white text-[12px] active-press" style={{ fontWeight: 700 }}>Закрыть</button>
        }
      >
        <div className="text-[12px] text-[#6B7280] mb-2">Свободные ячейки</div>
        <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
          {cells.filter(c => c.status === 'empty').slice(0, 24).map(c => (
            <button
              key={c.id}
              onClick={() => {
                if (drawerOrder) {
                  store.moveOrder(drawerOrder.id, c.id);
                  toast.success(`Перемещён в ${c.id}`);
                }
                setMoveOpen(false);
              }}
              className="rounded-xl px-3 py-2 text-left active-press"
              style={{ backgroundColor: c.zoneColor + '15' }}
            >
              <div className="text-[12px] text-[#1F2430]" style={{ fontWeight: 800, fontFamily: 'monospace' }}>{c.id}</div>
              <div className="text-[10px] text-[#6B7280]" style={{ fontWeight: 600 }}>{c.size}</div>
            </button>
          ))}
        </div>
      </Modal>

      <Modal
        open={problemOpen}
        onClose={() => setProblemOpen(false)}
        title="Создать проблему"
        footer={
          <>
            <button onClick={() => setProblemOpen(false)} className="px-4 h-9 rounded-lg text-[12px] text-[#6B7280] active-press" style={{ fontWeight: 700 }}>Отмена</button>
            <button
              onClick={() => {
                if (!drawerOrder) return;
                if (!problemDesc.trim()) { toast.error('Опишите проблему'); return; }
                store.createProblem({ type: 'wrong_order', description: problemDesc.trim(), orderId: drawerOrder.id, priority: 'high' });
                toast.success('Проблема создана');
                setProblemDesc('');
                setProblemOpen(false);
              }}
              className="px-4 h-9 rounded-lg bg-[#EF4444] text-white text-[12px] active-press" style={{ fontWeight: 800 }}
            >Создать</button>
          </>
        }
      >
        <textarea
          value={problemDesc}
          onChange={e => setProblemDesc(e.target.value)}
          rows={4}
          placeholder="Опишите ситуацию"
          className="w-full border border-[#E5E7EB] rounded-xl p-3 text-[13px]"
        />
      </Modal>
    </div>
  );
}

function Section({ title, children }: { title: string; children: any }) {
  return (
    <div>
      <div className="text-[11px] uppercase text-[#6B7280] mb-2" style={{ fontWeight: 800 }}>{title}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}
function Row({ k, v }: { k: string; v: any }) {
  return (
    <div className="flex justify-between gap-3 text-[12px]">
      <div className="text-[#6B7280]" style={{ fontWeight: 600 }}>{k}</div>
      <div className="text-[#1F2430]" style={{ fontWeight: 700 }}>{v}</div>
    </div>
  );
}
function ActionBtn({ icon: Icon, color, label, onClick }: { icon: any; color: string; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-xl px-3 py-2 text-left active-press flex items-center gap-2"
      style={{ backgroundColor: color + '15', color, fontWeight: 800 }}>
      <Icon className="w-4 h-4" />
      <div className="text-[12px]">{label}</div>
    </button>
  );
}

function fmt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
}
