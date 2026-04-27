import { ScanLine, Check, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAppState, store, lookupSkuFull } from '../hooks/useAppState';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { PriorityBadge } from '../components/Badges';

export function ReplenishmentPage() {
  const state = useAppState();
  const tasks = state.replenishTasks.filter(t => t.status === 'pending' || t.status === 'in_progress');

  const handleComplete = (taskId: string) => {
    // Stage-3: taskId is now the backend task UUID
    store.completeReplenishment(taskId);
    toast.success('Пополнение выполнено');
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24">
      <PageHeader title="Пополнение" subtitle={`${tasks.length} задач`} />

      <div className="px-5 -mt-3 space-y-2">
        {tasks.length === 0 ? (
          <EmptyState emoji="✅" title="Всё пополнено" subtitle="Pick-зоны заполнены" />
        ) : (
          tasks.map(t => {
            const full = lookupSkuFull(t.skuId, state.skus, state.products);
            return (
              <div key={t.id} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-[#F3F4F6] flex items-center justify-center text-[28px]">
                    {full?.product?.photoEmoji || '📦'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] text-[#1F2430] truncate" style={{ fontWeight: 800 }}>
                      {full?.product?.name}
                    </div>
                    <div className="text-[12px] text-[#6B7280]" style={{ fontWeight: 500 }}>
                      {full?.sku?.color} · {full?.sku?.size} · {t.qty} шт.
                    </div>
                  </div>
                  <PriorityBadge priority={t.priority} size="sm" />
                </div>

                <div className="bg-[#FEF3C7] rounded-xl p-2 mb-3 text-[11px] text-[#92400E]" style={{ fontWeight: 600 }}>
                  ⚠️ {t.reason}
                </div>

                <div className="flex items-center gap-2 text-[12px] mb-3">
                  <div className="flex-1 bg-[#F9FAFB] rounded-lg p-2">
                    <div className="text-[10px] text-[#6B7280]" style={{ fontWeight: 600 }}>Откуда</div>
                    <div className="text-[12px] text-[#1F2430] font-mono truncate" style={{ fontWeight: 700 }}>
                      {t.fromBinId}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#9CA3AF]" />
                  <div className="flex-1 bg-[#F9FAFB] rounded-lg p-2">
                    <div className="text-[10px] text-[#6B7280]" style={{ fontWeight: 600 }}>Куда</div>
                    <div className="text-[12px] text-[#1F2430] font-mono truncate" style={{ fontWeight: 700 }}>
                      {t.toBinId}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleComplete(t.id)}
                  className="w-full h-12 rounded-xl bg-[#00D27A] text-white text-[13px] flex items-center justify-center gap-2 active-press"
                  style={{ fontWeight: 700 }}
                >
                  <Check className="w-4 h-4" />
                  Подтвердить пополнение
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
