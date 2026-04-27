import { useState } from 'react';
import { ChevronRight, Plus, Minus, AlertTriangle, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useAppState, store } from '../hooks/useAppState';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { COUNT_TYPE_LABELS } from '../data/mockData';

export function CycleCountPage() {
  const state = useAppState();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [counted, setCounted] = useState<number>(0);

  const tasks = state.countTasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
  const active = activeId ? state.countTasks.find(t => t.id === activeId) : null;
  const activeBin = active ? state.bins.find(b => b.id === active.binId) : null;
  const sku = activeBin?.currentSku ? state.skus.find(s => s.id === activeBin.currentSku) : null;
  const product = sku ? state.products.find(p => p.id === sku.productId) : null;

  const handleSubmit = () => {
    if (!active) return;
    // Stage-3: active.id is the backend task UUID; pass it directly.
    store.submitCount(active.id, counted);
    const diff = counted - active.expectedQty;
    if (diff === 0) {
      toast.success('✓ Совпало! Расхождений нет.');
    } else {
      toast.error(`Расхождение: ${diff > 0 ? '+' : ''}${diff} шт. Эскалировано supervisor.`);
    }
    setActiveId(null);
    setCounted(0);
  };

  if (active) {
    return (
      <div className="min-h-screen bg-[#F5F6F8] pb-24">
        <PageHeader title="Инвентаризация" subtitle={COUNT_TYPE_LABELS[active.type]} onBack={() => { setActiveId(null); setCounted(0); }} />

        <div className="px-5 -mt-3 space-y-3">
          {/* Адрес ячейки */}
          <div className="bg-[#1F2430] rounded-2xl p-5">
            <div className="text-[11px] text-white/60 mb-1" style={{ fontWeight: 600 }}>
              Перейти к ячейке
            </div>
            <div className="text-[18px] text-white font-mono" style={{ fontWeight: 900 }}>
              {active.binId}
            </div>
          </div>

          {/* Товар (показываем что лежит) */}
          {product && sku && (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-xl bg-[#F3F4F6] flex items-center justify-center text-[40px]">
                  {product.photoEmoji}
                </div>
                <div className="flex-1">
                  <div className="text-[15px] text-[#1F2430]" style={{ fontWeight: 800 }}>
                    {product.name}
                  </div>
                  <div className="text-[12px] text-[#6B7280]" style={{ fontWeight: 500 }}>
                    {sku.color} · {sku.size}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Blind counter */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="text-[12px] text-[#6B7280] mb-1 text-center" style={{ fontWeight: 600 }}>
              ⚠️ Считайте «вслепую» — ожидаемое количество скрыто
            </div>
            <div className="text-[14px] text-[#1F2430] mb-3 text-center" style={{ fontWeight: 700 }}>
              Сколько штук в ячейке?
            </div>
            <div className="flex items-center justify-center gap-4 my-4">
              <button
                onClick={() => setCounted(Math.max(0, counted - 1))}
                className="w-12 h-12 rounded-full bg-[#F3F4F6] flex items-center justify-center active-press"
              >
                <Minus className="w-6 h-6 text-[#1F2430]" />
              </button>
              <input
                type="number"
                value={counted}
                onChange={(e) => setCounted(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-32 h-20 text-center text-[40px] bg-[#F9FAFB] rounded-2xl outline-none"
                style={{ fontWeight: 900 }}
              />
              <button
                onClick={() => setCounted(counted + 1)}
                className="w-12 h-12 rounded-full bg-[#F3F4F6] flex items-center justify-center active-press"
              >
                <Plus className="w-6 h-6 text-[#1F2430]" />
              </button>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            className="w-full h-14 rounded-2xl bg-[#2EA7E0] text-white shadow-md active-press"
            style={{ fontWeight: 800 }}
          >
            Подтвердить количество
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24">
      <PageHeader title="Инвентаризация" subtitle={`${tasks.length} ячеек к подсчёту`} />

      {/* Завершённые с расхождениями */}
      {state.countTasks.some(t => t.status === 'discrepancy') && (
        <div className="px-5 -mt-3 mb-3">
          <div className="bg-[#FEE2E2] rounded-2xl p-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-[#EF4444] flex-shrink-0" />
            <div className="flex-1">
              <div className="text-[13px] text-[#991B1B]" style={{ fontWeight: 800 }}>
                {state.countTasks.filter(t => t.status === 'discrepancy').length} расхождений
              </div>
              <div className="text-[11px] text-[#991B1B]" style={{ fontWeight: 500 }}>
                Требуется проверка supervisor
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="px-5 -mt-3 space-y-2">
        {tasks.length === 0 ? (
          <EmptyState emoji="✅" title="Все подсчёты выполнены" subtitle="" />
        ) : (
          tasks.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveId(t.id)}
              className="w-full bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm active-press text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-[#F3E8FF] flex items-center justify-center text-[24px]">
                📊
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] text-[#1F2430] font-mono truncate" style={{ fontWeight: 800 }}>
                  {t.binId}
                </div>
                <div className="text-[11px] text-[#6B7280]" style={{ fontWeight: 500 }}>
                  {COUNT_TYPE_LABELS[t.type]}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#9CA3AF]" />
            </button>
          ))
        )}

        {/* Завершённые */}
        {state.countTasks.filter(t => t.status === 'completed' || t.status === 'discrepancy').map(t => (
          <div key={t.id} className="bg-white rounded-2xl p-3 flex items-center gap-3 opacity-70">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: t.status === 'completed' ? '#D1FAE5' : '#FEE2E2' }}
            >
              {t.status === 'completed' ? <Check className="w-5 h-5 text-[#00D27A]" /> : <AlertTriangle className="w-5 h-5 text-[#EF4444]" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] text-[#1F2430] font-mono truncate" style={{ fontWeight: 700 }}>
                {t.binId}
              </div>
              <div className="text-[11px] text-[#6B7280]" style={{ fontWeight: 500 }}>
                Подсчитано: {t.countedQty} (ожидалось {t.expectedQty})
                {t.difference !== undefined && t.difference !== 0 && (
                  <span className="text-[#EF4444] ml-1" style={{ fontWeight: 700 }}>
                    {t.difference > 0 ? '+' : ''}{t.difference}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
