import { useState } from 'react';
import { Camera } from 'lucide-react';
import { toast } from 'sonner';
import { useStore, store } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { Modal } from '../components/Modal';
import type { ReturnStatus } from '../domain/types';

const STATUS_LABELS: Record<ReturnStatus, string> = {
  received:             'Получен',
  inspection:           'Проверка',
  restock:              'В продажу',
  damaged:              'Брак',
  write_off:            'Списание',
  returned_to_supplier: 'Возврат поставщику',
  closed:               'Закрыт',
};

const STATUS_COLORS: Record<ReturnStatus, { bg: string; fg: string }> = {
  received:             { bg: '#FEE2E2', fg: '#991B1B' },
  inspection:           { bg: '#FEF3C7', fg: '#92400E' },
  restock:              { bg: '#DCFCE7', fg: '#166534' },
  damaged:              { bg: '#FECACA', fg: '#7F1D1D' },
  write_off:            { bg: '#E5E7EB', fg: '#374151' },
  returned_to_supplier: { bg: '#E0E7FF', fg: '#3730A3' },
  closed:               { bg: '#F3F4F6', fg: '#374151' },
};

const DECISIONS: ReturnStatus[] = ['restock', 'damaged', 'write_off', 'returned_to_supplier', 'closed'];

export function ReturnsPage() {
  const { returns, skus } = useStore();
  const [decideId, setDecideId] = useState<string | null>(null);
  const [decision, setDecision] = useState<ReturnStatus>('restock');
  const [comment, setComment] = useState('');
  const [photoTaken, setPhoto] = useState(false);

  const submit = () => {
    if (!decideId) return;
    if (!comment.trim()) { toast.error('Опишите решение'); return; }
    store.decideReturn(decideId, decision, comment);
    toast.success(`Решение: ${STATUS_LABELS[decision]}`);
    setDecideId(null); setComment(''); setPhoto(false); setDecision('restock');
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24 md:pb-8">
      <PageHeader title="Возвраты" subtitle={`Активных: ${returns.length}`} />

      <div className="px-5 -mt-5 space-y-2">
        {returns.length === 0 ? (
          <EmptyState emoji="↩️" title="Возвратов нет" />
        ) : returns.map(r => {
          const c = STATUS_COLORS[r.status];
          return (
            <div key={r.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-[14px] text-[#1F2430]" style={{ fontWeight: 800 }}>{r.id}</div>
                  <div className="text-[11px] text-[#6B7280]" style={{ fontWeight: 500 }}>
                    Заказ {r.orderId} · {r.customerName}
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: c.bg, color: c.fg, fontWeight: 800 }}>
                  {STATUS_LABELS[r.status]}
                </span>
              </div>
              <div className="text-[12px] text-[#374151] mb-2" style={{ fontWeight: 600 }}>
                Причина: {r.reason}
              </div>
              <div className="space-y-1 mb-3">
                {r.items.map((it, i) => {
                  const sku = skus.find(s => s.sku === it.sku);
                  return (
                    <div key={i} className="text-[12px] text-[#1F2430] flex items-center gap-2" style={{ fontWeight: 600 }}>
                      <span className="text-[20px]">{sku?.photo ?? '📦'}</span>
                      <span className="flex-1 truncate">{sku?.name ?? it.sku}</span>
                      <span className="text-[#6B7280]">×{it.qty}</span>
                      {it.condition && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: it.condition === 'damaged' ? '#FEE2E2' : it.condition === 'used' ? '#FEF3C7' : '#DCFCE7',
                            color: it.condition === 'damaged' ? '#991B1B' : it.condition === 'used' ? '#92400E' : '#166534',
                            fontWeight: 700,
                          }}
                        >
                          {it.condition === 'damaged' ? 'брак' : it.condition === 'used' ? 'б/у' : 'новое'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              {r.status !== 'closed' && (
                <button
                  onClick={() => setDecideId(r.id)}
                  className="w-full h-9 rounded-lg bg-[#1F2430] text-white text-[12px] active-press" style={{ fontWeight: 700 }}
                >
                  Принять решение
                </button>
              )}
            </div>
          );
        })}
      </div>

      <Modal
        open={!!decideId}
        title={`Решение по ${decideId}`}
        onClose={() => { setDecideId(null); setComment(''); setPhoto(false); }}
        footer={
          <button onClick={submit} className="w-full h-11 rounded-xl bg-[#1F2430] text-white active-press" style={{ fontWeight: 800 }}>
            Подтвердить
          </button>
        }
      >
        <div className="text-[12px] text-[#6B7280] mb-1" style={{ fontWeight: 700 }}>Решение</div>
        <div className="space-y-1 mb-3">
          {DECISIONS.map(d => {
            const c = STATUS_COLORS[d];
            return (
              <button
                key={d}
                onClick={() => setDecision(d)}
                className="w-full text-left p-2 rounded-xl"
                style={{
                  backgroundColor: decision === d ? c.bg : '#F9FAFB',
                  border: decision === d ? `2px solid ${c.fg}` : '2px solid transparent',
                  fontWeight: 700,
                  color: decision === d ? c.fg : '#1F2430',
                }}
              >
                <span className="text-[13px]">{STATUS_LABELS[d]}</span>
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setPhoto(true)}
          className="w-full mb-3 px-4 py-3 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 active-press"
          style={{
            borderColor: photoTaken ? '#00D27A' : '#D1D5DB',
            backgroundColor: photoTaken ? '#D1FAE5' : 'transparent',
            color: photoTaken ? '#065F46' : '#6B7280',
            fontWeight: 700,
          }}
        >
          <Camera className="w-4 h-4" />
          {photoTaken ? '✓ Фото товара' : 'Сделать фото товара'}
        </button>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          rows={3}
          placeholder="Комментарий"
          className="w-full px-3 py-2 rounded-xl border-2 border-[#E5E7EB] focus:border-[#1F2430] focus:outline-none text-[14px] resize-none"
          style={{ fontWeight: 500 }}
        />
      </Modal>
    </div>
  );
}
