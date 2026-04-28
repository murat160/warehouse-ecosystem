import { Pause, Play, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useStore, store } from '../store/useStore';
import { PageHeader } from '../components/PageHeader';

export function ShiftPage() {
  const { currentWorker } = useStore();
  if (!currentWorker) return null;

  const onShift = currentWorker.shiftStatus === 'on_shift';
  const onBreak = currentWorker.shiftStatus === 'on_break';

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24 md:pb-8">
      <PageHeader title="Смена" subtitle={`${currentWorker.shiftStart ?? '—'} – ${currentWorker.shiftEnd ?? '—'}`} />

      <div className="px-5 -mt-5">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: onShift ? '#00D27A' : onBreak ? '#F59E0B' : '#9CA3AF' }}
            >
              {onShift ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white" />}
            </div>
            <div>
              <div className="text-[16px] text-[#1F2430]" style={{ fontWeight: 800 }}>
                {onShift ? 'Смена в работе' : onBreak ? 'Перерыв' : 'Не на смене'}
              </div>
              <div className="text-[12px] text-[#6B7280]" style={{ fontWeight: 500 }}>
                {currentWorker.name} · {currentWorker.role}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => { store.setShift('on_shift'); toast.success('Смена начата'); }}
              className="h-11 rounded-xl bg-[#00D27A] text-white active-press"
              style={{ fontWeight: 800 }}
            >
              Начать
            </button>
            <button
              onClick={() => { store.setShift('on_break'); toast('Перерыв'); }}
              className="h-11 rounded-xl bg-[#F59E0B] text-white active-press"
              style={{ fontWeight: 800 }}
            >
              Перерыв
            </button>
            <button
              onClick={() => { store.setShift('off'); toast('Смена завершена'); }}
              className="h-11 rounded-xl bg-[#1F2430] text-white active-press flex items-center justify-center gap-2"
              style={{ fontWeight: 800 }}
            >
              <LogOut className="w-4 h-4" /> Завершить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
