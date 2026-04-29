import { useState } from 'react';
import { toast } from 'sonner';
import { useStore, store } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { SkuThumb } from '../components/SkuThumb';

export function MovementsPage() {
  const { movements, skus, bins, workers } = useStore();
  const [sku, setSku] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');

  const submit = () => {
    if (!sku || !from || !to) { toast.error('Заполните SKU и ячейки'); return; }
    const q = parseInt(qty, 10);
    if (!q || q <= 0) { toast.error('Количество > 0'); return; }
    if (!reason.trim()) { toast.error('Укажите причину'); return; }
    const r = store.createMovement(sku, from, to, q, reason);
    if (r.ok) {
      toast.success('Перемещение создано');
      setSku(''); setFrom(''); setTo(''); setQty(''); setReason('');
    } else {
      toast.error(r.reason ?? 'Ошибка');
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24 md:pb-8">
      <PageHeader title="Перемещения" subtitle={`Всего: ${movements.length}`} />

      <div className="px-5 -mt-5 space-y-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-2">
          <h3 className="text-[14px] text-[#1F2430]" style={{ fontWeight: 800 }}>Новое перемещение</h3>
          <Sel label="SKU"     value={sku}  onChange={setSku}  options={skus.map(s => ({ value: s.sku, label: `${s.photo} ${s.name} (${s.sku})` }))} />
          <Sel label="Откуда"  value={from} onChange={setFrom} options={bins.map(b => ({ value: b.id, label: `${b.id} · ${b.zone}` }))} />
          <Sel label="Куда"    value={to}   onChange={setTo}   options={bins.map(b => ({ value: b.id, label: `${b.id} · ${b.zone}` }))} />
          <Inp label="Кол-во"  value={qty}    onChange={setQty}    type="number" />
          <Inp label="Причина" value={reason} onChange={setReason} />
          <button onClick={submit} className="w-full h-11 rounded-xl bg-[#0EA5E9] text-white active-press" style={{ fontWeight: 800 }}>
            Переместить
          </button>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-[14px] text-[#1F2430] mb-3" style={{ fontWeight: 800 }}>История</h3>
          {movements.length === 0 ? (
            <EmptyState emoji="🔁" title="Перемещений нет" />
          ) : (
            <div className="space-y-2">
              {movements.map(m => {
                const s = skus.find(x => x.sku === m.sku);
                const w = workers.find(x => x.id === m.workerId);
                return (
                  <div key={m.id} className="bg-[#F9FAFB] rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      {s ? <SkuThumb sku={s} size={32} binId={m.toBinId} /> : <span className="text-[20px]">📦</span>}
                      <div className="text-[13px] text-[#1F2430]" style={{ fontWeight: 800 }}>
                        {s?.name ?? m.sku} ×{m.qty}
                      </div>
                    </div>
                    <div className="text-[11px] text-[#6B7280] font-mono" style={{ fontWeight: 600 }}>
                      {m.fromBinId} → {m.toBinId}
                    </div>
                    <div className="text-[11px] text-[#6B7280]" style={{ fontWeight: 500 }}>
                      {m.reason} · {w?.name ?? m.workerId} · {new Date(m.createdAt).toLocaleString('ru')}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Inp({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <div className="text-[11px] text-[#6B7280] mb-1" style={{ fontWeight: 700 }}>{label}</div>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-xl border-2 border-[#E5E7EB] focus:border-[#0EA5E9] focus:outline-none text-[14px]"
        style={{ fontWeight: 500 }}
      />
    </div>
  );
}

function Sel({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div>
      <div className="text-[11px] text-[#6B7280] mb-1" style={{ fontWeight: 700 }}>{label}</div>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-xl border-2 border-[#E5E7EB] text-[14px]"
        style={{ fontWeight: 600 }}
      >
        <option value="">Выберите…</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
