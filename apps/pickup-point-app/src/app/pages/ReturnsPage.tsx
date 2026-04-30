import { useState } from 'react';
import { Camera, Video, AlertTriangle, FileText, Send, CheckCircle2, XCircle, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useStore, store } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';
import { ReturnStatusBadge } from '../components/StatusBadge';
import { Modal, Drawer } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import type { ReturnReason, ReturnStatus } from '../domain/types';

const REASONS: { id: ReturnReason; label: string }[] = [
  { id: 'damaged',          label: 'Повреждён' },
  { id: 'wrong_item',       label: 'Не тот товар' },
  { id: 'incomplete',       label: 'Неполный' },
  { id: 'customer_refusal', label: 'Отказ клиента' },
  { id: 'not_picked_up',    label: 'Не забрали' },
  { id: 'quality',          label: 'Качество' },
  { id: 'other',            label: 'Другое' },
];

export function ReturnsPage() {
  const { returns: rets, orders, employees } = useStore();
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('open');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newRet, setNewRet] = useState<{ orderId: string; reason: ReturnReason; description: string }>({ orderId: '', reason: 'wrong_item', description: '' });
  const [photoOpen, setPhotoOpen] = useState(false);
  const [photoName, setPhotoName] = useState('');

  const filtered = rets.filter(r => {
    if (filter === 'all') return true;
    if (filter === 'open') return r.status !== 'closed' && r.status !== 'rejected';
    return r.status === 'closed' || r.status === 'rejected';
  });

  const active = rets.find(r => r.id === activeId) ?? null;
  const activeOrder = active ? orders.find(o => o.id === active.orderId) : null;
  const assignee = active ? employees.find(e => e.id === active.assignedTo) : null;

  const setStatus = (s: ReturnStatus) => {
    if (!active) return;
    store.setReturnStatus(active.id, s);
    toast.success(`Статус: ${s}`);
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      <PageHeader
        title="Возвраты"
        subtitle={`${rets.length} всего · ${rets.filter(r => r.status !== 'closed').length} открыто`}
        right={
          <button onClick={() => setCreateOpen(true)} className="px-3 h-9 rounded-lg bg-white text-[#1F2430] text-[12px] active-press flex items-center gap-1" style={{ fontWeight: 800 }}>
            <Plus className="w-3 h-3" /> Новый
          </button>
        }
      />

      <div className="px-5 -mt-5 space-y-3">
        <div className="bg-white rounded-2xl p-2 flex gap-2">
          {(['open','closed','all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 px-3 h-9 rounded-xl text-[12px] ${filter === f ? 'bg-[#0EA5E9] text-white' : 'bg-[#F3F4F6] text-[#374151]'}`}
              style={{ fontWeight: 800 }}
            >
              {f === 'open' ? 'Открытые' : f === 'closed' ? 'Закрытые' : 'Все'}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState title="Нет возвратов" subtitle="Когда клиент вернёт товар, заявка появится здесь" />
        ) : (
          <div className="space-y-2">
            {filtered.map(r => (
              <button
                key={r.id}
                onClick={() => setActiveId(r.id)}
                className="w-full text-left bg-white rounded-2xl p-3 active-press"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[13px] text-[#1F2430]" style={{ fontWeight: 800 }}>{r.id}</div>
                    <div className="text-[11px] text-[#6B7280] truncate">
                      {r.customerName} · {r.orderId}
                    </div>
                  </div>
                  <ReturnStatusBadge status={r.status} />
                </div>
                <div className="text-[11px] text-[#374151] mt-1 line-clamp-1">{r.description}</div>
                <div className="text-[10px] text-[#9CA3AF] mt-1 flex items-center gap-3">
                  <span>{REASONS.find(x => x.id === r.reason)?.label}</span>
                  {r.photos.length > 0 && <span>📸 {r.photos.length}</span>}
                  {r.videos.length > 0 && <span>🎬 {r.videos.length}</span>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <Drawer
        open={!!active}
        onClose={() => setActiveId(null)}
        title={active?.id ?? ''}
        footer={
          active ? (
            <>
              <button onClick={() => setActiveId(null)} className="px-3 h-9 rounded-lg text-[12px] text-[#6B7280] active-press" style={{ fontWeight: 700 }}>Закрыть</button>
              <button
                onClick={() => {
                  store.setReturnStatus(active.id, 'closed');
                  toast.success('Возврат закрыт');
                  setActiveId(null);
                }}
                className="px-3 h-9 rounded-lg bg-[#16A34A] text-white text-[12px] active-press" style={{ fontWeight: 800 }}
              >Закрыть возврат</button>
            </>
          ) : null
        }
      >
        {active && (
          <div className="space-y-4">
            <div className="rounded-xl bg-[#F9FAFB] p-3 text-[12px] space-y-1">
              <Row k="Клиент" v={active.customerName} />
              <Row k="Телефон" v={active.customerPhone} />
              <Row k="Заказ" v={active.orderId} />
              <Row k="Причина" v={REASONS.find(r => r.id === active.reason)?.label ?? active.reason} />
              <Row k="Создан" v={fmt(active.createdAt)} />
              <Row k="Ответственный" v={assignee?.name ?? '—'} />
              <Row k="Статус" v={<ReturnStatusBadge status={active.status} />} />
            </div>

            <div>
              <div className="text-[12px] text-[#6B7280] mb-2 uppercase" style={{ fontWeight: 800 }}>Описание</div>
              <div className="text-[13px] text-[#374151]">{active.description}</div>
            </div>

            <div>
              <div className="text-[12px] text-[#6B7280] mb-2 uppercase" style={{ fontWeight: 800 }}>Медиа</div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { setPhotoName(''); setPhotoOpen(true); }} className="rounded-xl px-3 h-10 active-press flex items-center justify-center gap-1 text-[12px]" style={{ backgroundColor: '#0EA5E915', color: '#0EA5E9', fontWeight: 800 }}>
                  <Camera className="w-4 h-4" /> Добавить фото
                </button>
                <button onClick={() => {
                  store.attachReturnMedia(active.id, 'video', `video-${Date.now()}.mp4`);
                  toast.success('Видео загружено');
                }} className="rounded-xl px-3 h-10 active-press flex items-center justify-center gap-1 text-[12px]" style={{ backgroundColor: '#7C3AED15', color: '#7C3AED', fontWeight: 800 }}>
                  <Video className="w-4 h-4" /> Записать видео
                </button>
              </div>
              {(active.photos.length + active.videos.length > 0) && (
                <div className="mt-2 text-[11px] text-[#6B7280]">
                  Загружено: фото — {active.photos.length}, видео — {active.videos.length}
                </div>
              )}
            </div>

            <div>
              <div className="text-[12px] text-[#6B7280] mb-2 uppercase" style={{ fontWeight: 800 }}>Действия</div>
              <div className="grid grid-cols-2 gap-2">
                <Action color="#F59E0B" label="На осмотр"           onClick={() => setStatus('inspection')} />
                <Action color="#A855F7" label="Решение админа"      onClick={() => setStatus('waiting_admin_decision')} />
                <Action color="#6366F1" label="На склад"             onClick={() => setStatus('send_to_warehouse')} />
                <Action color="#6366F1" label="Продавцу"             onClick={() => setStatus('send_to_seller')} />
                <Action color="#16A34A" label="Возврат денег"        icon={CheckCircle2} onClick={() => {
                  setStatus('refunded');
                  if (activeOrder?.paymentAmount) {
                    store.addCashOp('refund', activeOrder.paymentAmount, { returnId: active.id });
                  }
                }} />
                <Action color="#EF4444" label="Отказать"             icon={XCircle} onClick={() => setStatus('rejected')} />
                <Action color="#0369A1" label="Документ возврата"    icon={FileText} onClick={() => {
                  store.uploadDocument({ kind: 'return_doc', title: `Документ ${active.id}`, size: '88 KB', returnId: active.id });
                  toast.success('Документ загружен');
                }} />
                <Action color="#EF4444" label="Создать проблему"     icon={AlertTriangle} onClick={() => {
                  store.createProblem({ type: 'damaged_package', description: `По возврату ${active.id}`, returnId: active.id, priority: 'high' });
                  toast.success('Проблема создана');
                }} />
                <Action color="#7C3AED" label="Запросить решение"    icon={Send} onClick={() => {
                  setStatus('waiting_admin_decision');
                }} />
              </div>
            </div>
          </div>
        )}
      </Drawer>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Новый возврат"
        footer={
          <>
            <button onClick={() => setCreateOpen(false)} className="px-4 h-9 rounded-lg text-[12px] text-[#6B7280] active-press" style={{ fontWeight: 700 }}>Отмена</button>
            <button
              onClick={() => {
                if (!newRet.orderId.trim()) { toast.error('Order ID обязателен'); return; }
                if (!newRet.description.trim()) { toast.error('Описание обязательно'); return; }
                if (!orders.some(o => o.id === newRet.orderId.trim())) { toast.error('Заказ не найден'); return; }
                store.createReturn({ orderId: newRet.orderId.trim(), reason: newRet.reason, description: newRet.description.trim() });
                toast.success('Возврат создан');
                setNewRet({ orderId: '', reason: 'wrong_item', description: '' });
                setCreateOpen(false);
              }}
              className="px-4 h-9 rounded-lg bg-[#0EA5E9] text-white text-[12px] active-press" style={{ fontWeight: 800 }}
            >Создать</button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Order ID">
            <input value={newRet.orderId} onChange={e => setNewRet({ ...newRet, orderId: e.target.value })} placeholder="ORD-..."
              className="w-full border border-[#E5E7EB] rounded-xl h-10 px-3 text-[13px]" style={{ fontFamily: 'monospace' }} />
          </Field>
          <Field label="Причина">
            <select value={newRet.reason} onChange={e => setNewRet({ ...newRet, reason: e.target.value as ReturnReason })}
              className="w-full border border-[#E5E7EB] rounded-xl h-10 px-2 text-[13px]">
              {REASONS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </Field>
          <Field label="Описание">
            <textarea value={newRet.description} onChange={e => setNewRet({ ...newRet, description: e.target.value })} rows={3}
              className="w-full border border-[#E5E7EB] rounded-xl p-3 text-[13px]" />
          </Field>
        </div>
      </Modal>

      <Modal
        open={photoOpen}
        onClose={() => setPhotoOpen(false)}
        title="Загрузить фото"
        footer={
          <>
            <button onClick={() => setPhotoOpen(false)} className="px-4 h-9 rounded-lg text-[12px] text-[#6B7280] active-press" style={{ fontWeight: 700 }}>Отмена</button>
            <button
              onClick={() => {
                if (!active) return;
                const name = photoName.trim() || `photo-${Date.now()}.jpg`;
                store.attachReturnMedia(active.id, 'photo', name);
                toast.success('Фото загружено');
                setPhotoOpen(false);
                setPhotoName('');
              }}
              className="px-4 h-9 rounded-lg bg-[#0EA5E9] text-white text-[12px] active-press" style={{ fontWeight: 800 }}
            >Загрузить</button>
          </>
        }
      >
        <div className="rounded-xl bg-[#F9FAFB] p-4 text-center text-[12px] text-[#6B7280]">
          [Mock] Здесь была бы камера / file picker
        </div>
        <div className="mt-3">
          <input value={photoName} onChange={e => setPhotoName(e.target.value)} placeholder="Имя файла (необязательно)"
            className="w-full border border-[#E5E7EB] rounded-xl h-10 px-3 text-[13px]" />
        </div>
      </Modal>
    </div>
  );
}

function Row({ k, v }: { k: string; v: any }) {
  return (
    <div className="flex justify-between gap-2">
      <div className="text-[#6B7280]" style={{ fontWeight: 600 }}>{k}</div>
      <div className="text-[#1F2430]" style={{ fontWeight: 700 }}>{v}</div>
    </div>
  );
}
function Action({ color, label, onClick, icon: Icon }: { color: string; label: string; onClick: () => void; icon?: any }) {
  return (
    <button onClick={onClick} className="rounded-xl px-3 h-9 active-press flex items-center justify-center gap-1 text-[12px]"
      style={{ backgroundColor: color + '15', color, fontWeight: 800 }}>
      {Icon && <Icon className="w-3 h-3" />} {label}
    </button>
  );
}
function Field({ label, children }: { label: string; children: any }) {
  return (
    <label className="block">
      <div className="text-[10px] text-[#6B7280] uppercase mb-1" style={{ fontWeight: 800 }}>{label}</div>
      {children}
    </label>
  );
}
function fmt(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
}
