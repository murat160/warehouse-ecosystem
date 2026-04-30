import { useState } from 'react';
import { ArrowUpFromLine, FileText, Plus, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useStore, store } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import type { CollectionStatus } from '../domain/types';

const STATUS_LABEL: Record<CollectionStatus, string> = {
  requested:   'Запрошена',
  prepared:    'Подготовлена',
  collected:   'Собрана',
  confirmed:   'Подтверждена',
  discrepancy: 'Расхождение',
};
const STATUS_COLOR: Record<CollectionStatus, string> = {
  requested:   '#F59E0B',
  prepared:    '#0EA5E9',
  collected:   '#7C3AED',
  confirmed:   '#16A34A',
  discrepancy: '#EF4444',
};

export function CollectionPage() {
  const { collections, cashbox } = useStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState<string | null>(null);
  const [amount, setAmount] = useState(String(Math.max(0, cashbox.openingBalance + cashbox.cashReceived - cashbox.refunds)));
  const [notes, setNotes] = useState('');
  const [collector, setCollector] = useState({ name: '', phone: '' });

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      <PageHeader
        title="Инкассация"
        subtitle={`${collections.length} запросов`}
        right={
          <button onClick={() => setCreateOpen(true)} className="px-3 h-9 rounded-lg bg-white text-[#1F2430] text-[12px] active-press flex items-center gap-1" style={{ fontWeight: 800 }}>
            <Plus className="w-3 h-3" /> Запросить
          </button>
        }
      />

      <div className="px-5 -mt-5 space-y-2">
        {collections.length === 0 ? (
          <EmptyState title="Нет инкассаций" subtitle="Запросите инкассацию когда касса наполнится" icon={<ArrowUpFromLine className="w-5 h-5" />} />
        ) : collections.map(c => (
          <div key={c.id} className="bg-white rounded-2xl p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[13px] text-[#1F2430]" style={{ fontWeight: 800 }}>{c.id}</div>
                <div className="text-[11px] text-[#6B7280]">Запрошена {fmt(c.requestedAt)}{c.confirmedAt ? ` · подтверждена ${fmt(c.confirmedAt)}` : ''}</div>
                {c.collectorName && <div className="text-[11px] text-[#374151] mt-1">Инкассатор: {c.collectorName}{c.collectorPhone ? ` · ${c.collectorPhone}` : ''}</div>}
                {c.notes && <div className="text-[11px] text-[#374151] mt-1">{c.notes}</div>}
              </div>
              <div className="text-right">
                <div className="text-[16px] text-[#1F2430]" style={{ fontWeight: 900 }}>{c.amount.toLocaleString('ru-RU')} ₸</div>
                <span className="text-[10px] px-2 py-0.5 rounded-full text-white inline-block mt-1" style={{ backgroundColor: STATUS_COLOR[c.status], fontWeight: 800 }}>
                  {STATUS_LABEL[c.status]}
                </span>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {c.status === 'requested' && (
                <button onClick={() => setConfirmOpen(c.id)} className="rounded-lg px-3 h-9 text-[12px] active-press flex items-center gap-1"
                  style={{ backgroundColor: '#16A34A15', color: '#16A34A', fontWeight: 800 }}>
                  <CheckCircle2 className="w-3 h-3" /> Подтвердить передачу
                </button>
              )}
              <button
                onClick={() => {
                  store.uploadDocument({ kind: 'collection_report', title: `Отчёт инкассации ${c.id}`, size: '64 KB' });
                  toast.success('Документ загружен');
                }}
                className="rounded-lg px-3 h-9 text-[12px] active-press flex items-center gap-1"
                style={{ backgroundColor: '#0369A115', color: '#0369A1', fontWeight: 800 }}
              >
                <FileText className="w-3 h-3" /> Документ
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Запрос инкассации"
        footer={
          <>
            <button onClick={() => setCreateOpen(false)} className="px-4 h-9 rounded-lg text-[12px] text-[#6B7280] active-press" style={{ fontWeight: 700 }}>Отмена</button>
            <button
              onClick={() => {
                const v = Number(amount);
                if (!Number.isFinite(v) || v <= 0) { toast.error('Сумма обязательна'); return; }
                store.requestCollection(v, notes.trim() || undefined);
                toast.success('Запрос инкассации создан');
                setCreateOpen(false);
                setNotes('');
              }}
              className="px-4 h-9 rounded-lg bg-[#0EA5E9] text-white text-[12px] active-press" style={{ fontWeight: 800 }}
            >Запросить</button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Сумма (₸)">
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} autoFocus className="w-full border border-[#E5E7EB] rounded-xl h-10 px-3 text-[14px]" />
          </Field>
          <Field label="Комментарий (необязательно)">
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full border border-[#E5E7EB] rounded-xl p-3 text-[13px]" />
          </Field>
        </div>
      </Modal>

      <Modal
        open={!!confirmOpen}
        onClose={() => setConfirmOpen(null)}
        title="Подтверждение передачи"
        footer={
          <>
            <button onClick={() => setConfirmOpen(null)} className="px-4 h-9 rounded-lg text-[12px] text-[#6B7280] active-press" style={{ fontWeight: 700 }}>Отмена</button>
            <button
              onClick={() => {
                if (!confirmOpen) return;
                if (!collector.name.trim() || !collector.phone.trim()) { toast.error('Введите данные инкассатора'); return; }
                store.confirmCollection(confirmOpen, collector.name.trim(), collector.phone.trim());
                store.uploadDocument({ kind: 'collection_report', title: `Отчёт инкассации ${confirmOpen}`, size: '72 KB' });
                toast.success('Инкассация подтверждена');
                setConfirmOpen(null);
                setCollector({ name: '', phone: '' });
              }}
              className="px-4 h-9 rounded-lg bg-[#16A34A] text-white text-[12px] active-press" style={{ fontWeight: 800 }}
            >Подтвердить</button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="ФИО инкассатора">
            <input value={collector.name} onChange={e => setCollector({ ...collector, name: e.target.value })} className="w-full border border-[#E5E7EB] rounded-xl h-10 px-3 text-[13px]" />
          </Field>
          <Field label="Телефон">
            <input value={collector.phone} onChange={e => setCollector({ ...collector, phone: e.target.value })} className="w-full border border-[#E5E7EB] rounded-xl h-10 px-3 text-[13px]" />
          </Field>
        </div>
      </Modal>
    </div>
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
