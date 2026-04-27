import { useState } from 'react';
import { ScanLine, Check, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useAppState, store, lookupSkuFull } from '../hooks/useAppState';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';

export function PutawayPage() {
  const state = useAppState();
  const [scanMode, setScanMode] = useState<'sku' | 'bin' | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [scannedSku, setScannedSku] = useState<string | null>(null);
  const [scannedBin, setScannedBin] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Активные PUTAWAY задачи
  const tasks = state.tasks.filter(t =>
    t.type === 'PUTAWAY' &&
    t.status !== 'completed' &&
    t.status !== 'cancelled'
  );

  const activeId = activeTaskId || tasks[0]?.id || null;
  const active = activeId ? state.tasks.find(t => t.id === activeId) : null;
  const activeFull = active?.payload.skuId ? lookupSkuFull(active.payload.skuId, state.skus, state.products) : null;

  // Рекомендуемая ячейка по storageType
  const recommendedBin = activeFull?.sku
    ? state.bins.find(b =>
        b.storageType === activeFull.sku.storageType &&
        (b.currentSku === activeFull.sku.id || (!b.currentSku && b.currentUnits < b.capacity * 0.7))
      )
    : null;

  const handleScan = (code: string) => {
    if (!active || !active.payload.skuId) return;

    if (scanMode === 'sku') {
      // Валидация: должен быть SKU из задачи
      const result = store.validateSkuScan(active.id, code, active.payload.skuId);
      if (!result.ok) {
        setErrorMsg(result.errorMessage || 'Ошибка');
        toast.error(result.errorMessage);
        setScanMode(null);
        return;
      }
      setScannedSku(active.payload.skuId);
      setErrorMsg(null);
      toast.success('Товар верный');
    } else if (scanMode === 'bin') {
      const bin = store.findBin(code);
      if (!bin) {
        store.reportTaskError(active.id, { code: 'unreadable_barcode', message: `Ячейка ${code} не найдена` });
        toast.error('Ячейка не найдена');
        setErrorMsg('Ячейка не найдена');
        setScanMode(null);
        return;
      }
      if (bin.status !== 'active') {
        store.reportTaskError(active.id, { code: 'shelf_blocked', message: `Ячейка ${code} заблокирована` });
        toast.error('Ячейка заблокирована');
        setErrorMsg('Ячейка заблокирована');
        setScanMode(null);
        return;
      }
      // Проверяем тип хранения
      if (activeFull?.sku && bin.storageType !== activeFull.sku.storageType) {
        store.reportTaskError(active.id, {
          code: 'wrong_bin',
          message: `Ячейка ${code} (${bin.storageType}) не подходит для ${activeFull.sku.storageType}`,
        });
        toast.error('Тип хранения ячейки не подходит');
        setErrorMsg('Эта ячейка не подходит для этого типа товара');
        setScanMode(null);
        return;
      }
      setScannedBin(code);
      setErrorMsg(null);
      toast.success(`Ячейка ${code}`);
    }
    setScanMode(null);
  };

  const handleConfirm = () => {
    if (!active || !scannedSku || !scannedBin || !active.payload.qty) return;
    const ok = store.putawayItem(active.id, scannedSku, scannedBin, active.payload.qty);
    if (!ok) {
      toast.error('Не удалось разместить');
      return;
    }
    toast.success(`Размещено ${active.payload.qty} шт.`);
    setActiveTaskId(null);
    setScannedSku(null);
    setScannedBin(null);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24">
      <PageHeader title="Размещение" subtitle={`${tasks.length} ожидают`} onBack={() => history.back()} />

      <div className="px-5 -mt-3">
        {!active ? (
          <EmptyState emoji="📦" title="Очередь пуста" subtitle="Нет товаров для размещения" />
        ) : (
          <>
            {errorMsg && (
              <div className="bg-[#FEE2E2] rounded-2xl p-3 mb-3 flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-[#EF4444] flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-[12px] text-[#991B1B]" style={{ fontWeight: 800 }}>
                    Действие заблокировано
                  </div>
                  <div className="text-[12px] text-[#991B1B]" style={{ fontWeight: 500 }}>
                    {errorMsg}
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl p-4 shadow-sm mb-3">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-16 h-16 rounded-xl bg-[#F3F4F6] flex items-center justify-center text-[40px]">
                  {activeFull?.product?.photoEmoji || '📦'}
                </div>
                <div className="flex-1">
                  <div className="text-[15px] text-[#1F2430]" style={{ fontWeight: 800 }}>
                    {activeFull?.product?.name}
                  </div>
                  <div className="text-[12px] text-[#6B7280]" style={{ fontWeight: 500 }}>
                    {activeFull?.sku?.color} · {activeFull?.sku?.size} · {active.payload.qty} шт.
                  </div>
                </div>
              </div>
              {recommendedBin && (
                <div className="bg-[#E0F2FE] rounded-xl p-3">
                  <div className="text-[11px] text-[#0EA5E9]" style={{ fontWeight: 700 }}>💡 Рекомендуем</div>
                  <div className="text-[14px] text-[#1F2430] mt-0.5 font-mono" style={{ fontWeight: 800 }}>
                    {recommendedBin.id}
                  </div>
                  <div className="text-[11px] text-[#6B7280]" style={{ fontWeight: 500 }}>
                    Свободно: {recommendedBin.capacity - recommendedBin.currentUnits} / {recommendedBin.capacity}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
              <Step num={1} label="Отсканировать товар"
                value={scannedSku || ''} done={!!scannedSku}
                onClick={() => setScanMode('sku')}
              />
              <Step num={2} label="Отсканировать ячейку"
                value={scannedBin || ''} done={!!scannedBin}
                onClick={() => scannedSku && setScanMode('bin')}
                disabled={!scannedSku}
              />
            </div>

            {scannedSku && scannedBin && !errorMsg && (
              <button
                onClick={handleConfirm}
                className="w-full h-14 rounded-2xl bg-[#00D27A] text-white shadow-md active-press mt-4"
                style={{ fontWeight: 800 }}
              >
                ✓ Подтвердить размещение
              </button>
            )}

            <div className="text-center mt-4 text-[11px] text-[#9CA3AF]" style={{ fontWeight: 500 }}>
              Подсказка штрихкода: {activeFull?.sku?.barcode}
            </div>
          </>
        )}
      </div>

      <BarcodeScannerModal
        isOpen={scanMode !== null}
        onClose={() => setScanMode(null)}
        onScan={handleScan}
        title={scanMode === 'sku' ? 'Сканировать товар' : 'Сканировать ячейку'}
      />
    </div>
  );
}

function Step({ num, label, value, done, onClick, disabled }: { num: number; label: string; value: string; done: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-3 p-3 rounded-xl active-press text-left"
      style={{
        backgroundColor: done ? '#D1FAE5' : disabled ? '#F9FAFB' : '#E0F2FE',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center"
        style={{ backgroundColor: done ? '#00D27A' : '#2EA7E0' }}
      >
        {done ? <Check className="w-5 h-5 text-white" /> : <span className="text-white text-[16px]" style={{ fontWeight: 800 }}>{num}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] text-[#6B7280]" style={{ fontWeight: 600 }}>{label}</div>
        {value && (
          <div className="text-[13px] text-[#1F2430] truncate font-mono" style={{ fontWeight: 800 }}>
            {value}
          </div>
        )}
      </div>
      {!done && !disabled && <ScanLine className="w-5 h-5 text-[#2EA7E0]" />}
    </button>
  );
}
