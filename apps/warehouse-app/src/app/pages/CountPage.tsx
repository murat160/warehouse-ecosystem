import { useState } from 'react';
import { toast } from 'sonner';
import { useStore, store } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { Modal } from '../components/Modal';
import { ZoneBadge } from '../components/ZoneBadge';
import { ZONE_CODES, type ZoneCode } from '../domain/zones';
import type { CountStatus } from '../domain/types';

const STATUS_LABELS: Record<CountStatus, string> = {
  draft: 'Черновик', in_progress: 'В работе',
  discrepancy_found: 'Расхождение', under_review: 'На проверке', closed: 'Закрыто',
};

export function CountPage() {
  const { counts, workers, currentWorker } = useStore();
  const [openId, setOpenId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [zone, setZone] = useState<ZoneCode>('YELLOW');
  const [assignee, setAssignee] = useState(currentWorker?.id ?? '');

  const submitCreate = () => {
    if (!assignee) { toast.error('Назначьте сотрудника'); return; }
    const id = store.createCount(zone, assignee);
    toast.success(`Создана инвентаризация ${id}`);
    setShowCreate(false);
    setOpenId(id);
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24 md:pb-8">
      <PageHeader title="Инвентаризация" subtitle={`Задач: ${counts.length}`} />

      <div className="px-5 -mt-5">
        <button
          onClick={() => setShowCreate(true)}
          className="w-full h-11 rounded-2xl bg-[#7C3AED] text-white mb-3 active-press" style={{ fontWeight: 800 }}
        >+ Создать инвентаризацию</button>

        <div className="space-y-2">
          {counts.length === 0 ? (
            <EmptyState emoji="📊" title="Инвентаризаций нет" />
          ) : counts.map(c => (
            <div key={c.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-[14px] text-[#1F2430]" style={{ fontWeight: 800 }}>{c.id}</div>
                  <div className="text-[11px] text-[#6B7280]" style={{ fontWeight: 500 }}>
                    {c.lines.length} строк · {workers.find(w => w.id === c.assignedTo)?.name ?? '—'}
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#374151]" style={{ fontWeight: 800 }}>
                  {STATUS_LABELS[c.status]}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                <ZoneBadge zone={c.zone} />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setOpenId(c.id === openId ? null : c.id)}
                  className="px-3 h-9 rounded-lg bg-[#1F2430] text-white text-[12px] active-press" style={{ fontWeight: 700 }}
                >{openId === c.id ? 'Скрыть' : 'Открыть'}</button>
                {c.status !== 'closed' && c.status !== 'discrepancy_found' && (
                  <button
                    onClick={() => { store.closeCount(c.id); toast('Инвентаризация закрыта'); }}
                    className="px-3 h-9 rounded-lg bg-[#10B981] text-white text-[12px] active-press" style={{ fontWeight: 700 }}
                  >Закрыть</button>
                )}
              </div>

              {openId === c.id && (
                <div className="mt-3 space-y-1.5">
                  {c.lines.map((l, i) => (
                    <CountLineRow key={i} countId={c.id} line={l} disabled={c.status === 'closed'} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <Modal
        open={showCreate}
        title="Создать инвентаризацию"
        onClose={() => setShowCreate(false)}
        footer={
          <button onClick={submitCreate} className="w-full h-11 rounded-xl bg-[#7C3AED] text-white active-press" style={{ fontWeight: 800 }}>
            Создать
          </button>
        }
      >
        <div className="text-[12px] text-[#6B7280] mb-1" style={{ fontWeight: 700 }}>Зона</div>
        <div className="grid grid-cols-4 gap-1.5 mb-3">
          {ZONE_CODES.map(z => (
            <button
              key={z}
              onClick={() => setZone(z)}
              className="h-9 rounded-lg text-[11px] active-press"
              style={{ backgroundColor: zone === z ? '#7C3AED' : '#F3F4F6', color: zone === z ? 'white' : '#374151', fontWeight: 800 }}
            >{z}</button>
          ))}
        </div>
        <div className="text-[12px] text-[#6B7280] mb-1" style={{ fontWeight: 700 }}>Сотрудник</div>
        <select
          value={assignee}
          onChange={e => setAssignee(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border-2 border-[#E5E7EB] text-[14px]"
          style={{ fontWeight: 600 }}
        >
          <option value="">Выберите…</option>
          {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </Modal>
    </div>
  );
}

function CountLineRow({ countId, line, disabled }: { countId: string; line: any; disabled: boolean }) {
  const [v, setV] = useState(line.countedQty !== undefined ? String(line.countedQty) : '');
  const submit = () => {
    const n = parseInt(v, 10);
    if (isNaN(n)) { toast.error('Введите число'); return; }
    store.submitCountLine(countId, line.binId, line.sku, n);
    toast(`Учтено: ${line.binId}/${line.sku} = ${n}`);
  };
  const diff = line.countedQty !== undefined ? line.countedQty - line.expectedQty : 0;
  return (
    <div className="bg-[#F9FAFB] rounded-lg p-2 flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <div className="text-[12px] text-[#1F2430] font-mono truncate" style={{ fontWeight: 700 }}>
          {line.binId} · {line.sku}
        </div>
        <div className="text-[10px] text-[#6B7280]" style={{ fontWeight: 500 }}>
          ожидалось {line.expectedQty}
          {line.countedQty !== undefined && (
            <span style={{ color: diff === 0 ? '#10B981' : '#EF4444', fontWeight: 700 }}>
              {' '}· факт {line.countedQty} ({diff >= 0 ? '+' : ''}{diff})
            </span>
          )}
        </div>
      </div>
      {!disabled && (
        <>
          <input
            type="number"
            value={v}
            onChange={e => setV(e.target.value)}
            placeholder="факт"
            className="w-16 px-2 py-1 rounded border-2 border-[#E5E7EB] text-[12px] text-center"
            style={{ fontWeight: 700 }}
          />
          <button
            onClick={submit}
            className="h-8 px-3 rounded-lg bg-[#7C3AED] text-white text-[11px] active-press" style={{ fontWeight: 700 }}
          >Учесть</button>
        </>
      )}
    </div>
  );
}
