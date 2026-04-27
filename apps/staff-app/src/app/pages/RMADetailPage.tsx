import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Camera, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useAppState, store, lookupSkuFull } from '../hooks/useAppState';
import { PageHeader } from '../components/PageHeader';
import { RMAStatusBadge } from '../components/Badges';
import { RETURN_REASON_LABELS, type RMA } from '../data/mockData';

const DECISIONS: { id: NonNullable<RMA['inspectionResult']>; label: string; emoji: string; color: string; bg: string }[] = [
  { id: 'resellable', label: 'В продажу',         emoji: '✅', color: '#00D27A', bg: '#D1FAE5' },
  { id: 'cleaning',   label: 'На чистку',          emoji: '🧼', color: '#0EA5E9', bg: '#E0F2FE' },
  { id: 'repack',     label: 'Переупаковка',      emoji: '📦', color: '#A855F7', bg: '#F3E8FF' },
  { id: 'damaged',    label: 'Брак — списать',    emoji: '❌', color: '#EF4444', bg: '#FEE2E2' },
  { id: 'rtv',        label: 'Вернуть продавцу',  emoji: '🔄', color: '#7C3AED', bg: '#F3E8FF' },
  { id: 'dispute',    label: 'Спор',              emoji: '⚖️', color: '#DC2626', bg: '#FEE2E2' },
  { id: 'dispose',    label: 'Утилизация',        emoji: '🗑️', color: '#6B7280', bg: '#F3F4F6' },
];

const CHECKS = [
  'Размер указан верно',
  'Цвет указан верно',
  'Бирка с штрихкодом на месте',
  'Нет пятен и дыр',
  'Нет следов носки',
  'Запах нейтральный',
  'Упаковка пригодна для повторной продажи',
];

export function RMADetailPage() {
  const { id } = useParams();
  const state = useAppState();
  const nav = useNavigate();

  // Stage-3: id is either the RMA code or a RETURN_CHECK task UUID.
  const task = state.tasks.find(t => t.id === id);
  const rmaBackendId = task?.payload.rmaId;
  const rma = rmaBackendId
    ? state.rmas.find(r => (r as any)._backendId === rmaBackendId)
    : state.rmas.find(r => r.id === id);

  const [checks, setChecks] = useState<Set<number>>(new Set());
  const [decision, setDecision] = useState<NonNullable<RMA['inspectionResult']> | null>(null);
  const [notes, setNotes] = useState('');
  const [photoTaken, setPhotoTaken] = useState(false);

  if (!rma) {
    return (
      <div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[16px] text-[#1F2430] mb-3" style={{ fontWeight: 700 }}>Возврат не найден</p>
          <button onClick={() => nav('/returns')} className="text-[14px] text-[#2EA7E0]">Вернуться</button>
        </div>
      </div>
    );
  }

  const firstItem = rma.items[0];
  const full = firstItem ? lookupSkuFull(firstItem.skuId, state.skus, state.products) : null;

  const handleSubmit = () => {
    if (!decision) return;
    store.inspectRMA(rma.id, decision, notes);
    toast.success('Решение принято');
    setTimeout(() => nav('/returns'), 800);
  };

  const toggleCheck = (i: number) => {
    setChecks(prev => {
      const n = new Set(prev);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24">
      <PageHeader title={rma.id} subtitle={rma.customerName} onBack={() => nav('/returns')} />

      <div className="px-5 -mt-3 space-y-3">
        {/* Карточка возврата */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-16 h-16 rounded-xl bg-[#F3F4F6] flex items-center justify-center text-[40px]">
              {full?.product?.photoEmoji || '📦'}
            </div>
            <div className="flex-1">
              <div className="text-[15px] text-[#1F2430]" style={{ fontWeight: 800 }}>
                {full?.product?.name}
              </div>
              <div className="text-[12px] text-[#6B7280]" style={{ fontWeight: 500 }}>
                {full?.sku?.color} · {full?.sku?.size}
              </div>
              <RMAStatusBadge status={rma.status} size="sm" />
            </div>
          </div>
          <div className="bg-[#FEE2E2] rounded-xl p-3">
            <div className="text-[11px] text-[#991B1B]" style={{ fontWeight: 700 }}>Причина возврата</div>
            <div className="text-[14px] text-[#7F1D1D] mt-0.5" style={{ fontWeight: 700 }}>
              {RETURN_REASON_LABELS[rma.reason]}
            </div>
            {rma.reasonText && (
              <div className="text-[12px] text-[#991B1B] mt-1" style={{ fontWeight: 500 }}>
                "{rma.reasonText}"
              </div>
            )}
          </div>
          <div className="text-[11px] text-[#6B7280] mt-2" style={{ fontWeight: 500 }}>
            Заказ-источник: {rma.originalOrderId}
            {rma.receivedAt && ` · принят ${new Date(rma.receivedAt).toLocaleString('ru')}`}
          </div>
        </div>

        {/* Чек-лист проверки */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-[14px] text-[#1F2430] mb-3" style={{ fontWeight: 800 }}>
            Проверка товара
          </h3>
          <div className="space-y-1">
            {CHECKS.map((c, i) => (
              <button
                key={i}
                onClick={() => toggleCheck(i)}
                className="w-full flex items-center gap-2 p-2 rounded-lg active-press text-left"
              >
                <div
                  className="w-5 h-5 rounded-md flex items-center justify-center"
                  style={{
                    backgroundColor: checks.has(i) ? '#00D27A' : 'transparent',
                    border: `2px solid ${checks.has(i) ? '#00D27A' : '#D1D5DB'}`,
                  }}
                >
                  {checks.has(i) && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="text-[13px] text-[#1F2430]" style={{ fontWeight: 500 }}>{c}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Решение */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-[14px] text-[#1F2430] mb-3" style={{ fontWeight: 800 }}>Решение</h3>
          <div className="grid grid-cols-2 gap-2">
            {DECISIONS.map(d => (
              <button
                key={d.id}
                onClick={() => setDecision(d.id)}
                className="h-12 rounded-xl flex items-center justify-center gap-1 text-[12px] active-press"
                style={{
                  backgroundColor: decision === d.id ? d.color : d.bg,
                  color: decision === d.id ? 'white' : d.color,
                  fontWeight: 700,
                }}
              >
                <span>{d.emoji}</span>
                <span>{d.label}</span>
              </button>
            ))}
          </div>
        </div>

        {decision && (
          <>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <button
                onClick={() => setPhotoTaken(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed"
                style={{
                  borderColor: photoTaken ? '#00D27A' : '#D1D5DB',
                  backgroundColor: photoTaken ? '#D1FAE5' : 'transparent',
                  color: photoTaken ? '#065F46' : '#6B7280',
                  fontWeight: 600,
                }}
              >
                <Camera className="w-5 h-5" />
                {photoTaken ? '✓ Фото прикреплено' : 'Сфотографировать товар'}
              </button>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <label className="text-[13px] text-[#6B7280] mb-2 block" style={{ fontWeight: 600 }}>
                Комментарий
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Опишите состояние товара..."
                rows={3}
                className="w-full px-3 py-2 rounded-xl border-2 border-[#E5E7EB] focus:border-[#2EA7E0] focus:outline-none text-[14px] resize-none"
                style={{ fontWeight: 500 }}
              />
            </div>

            <button
              onClick={handleSubmit}
              className="w-full h-14 rounded-2xl bg-[#2EA7E0] text-white shadow-md active-press"
              style={{ fontWeight: 800 }}
            >
              Подтвердить решение
            </button>
          </>
        )}
      </div>
    </div>
  );
}
