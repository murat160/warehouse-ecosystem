import { useState } from 'react';
import { ScanLine, Camera, Printer, Check, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useAppState, store, lookupSkuFull } from '../hooks/useAppState';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';
import { PriorityBadge } from '../components/Badges';

export function PackingPage() {
  const state = useAppState();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanMode, setScanMode] = useState<'order' | 'sku'>('order');
  const [scannedItems, setScannedItems] = useState<Set<string>>(new Set());
  const [weight, setWeight] = useState('');
  const [packageType, setPackageType] = useState<string | null>(null);
  const [photoTaken, setPhotoTaken] = useState(false);
  const [labelPrinted, setLabelPrinted] = useState(false);

  const ordersToPack = state.orders.filter(o => o.status === 'picked' || o.status === 'packing');
  const order = selectedOrderId ? state.orders.find(o => o.id === selectedOrderId) : null;

  const reset = () => {
    setSelectedOrderId(null);
    setScannedItems(new Set());
    setWeight('');
    setPackageType(null);
    setPhotoTaken(false);
    setLabelPrinted(false);
    setScanMode('order');
  };

  const handleScan = (code: string) => {
    if (scanMode === 'order') {
      const o = state.orders.find(x => x.id === code || code.includes(x.id));
      if (!o) {
        toast.error('Заказ не найден');
        setScannerOpen(false);
        return;
      }
      setSelectedOrderId(o.id);
      setScanMode('sku');
      setScannerOpen(false);
      toast.success(`Заказ ${o.id}`);
      return;
    }
    if (!order) return;
    const sku = store.findSkuByBarcode(code);
    if (!sku) {
      toast.error('Штрихкод не распознан');
      setScannerOpen(false);
      return;
    }
    const matchItem = order.items.find(i => i.skuId === sku.id);
    if (!matchItem) {
      toast.error('Этого товара нет в заказе!');
      setScannerOpen(false);
      return;
    }
    setScannedItems(prev => new Set([...prev, matchItem.id]));
    toast.success(`Отсканирован: ${sku.id}`);
    setScannerOpen(false);
  };

  const allItemsScanned = order && order.items.every(i => scannedItems.has(i.id));
  const weightNum = parseFloat(weight);
  const weightDelta = order ? Math.abs(weightNum - order.expectedWeightKg) : 0;
  const weightOk = order && !isNaN(weightNum) && weightDelta < 0.1;

  const handlePrintLabel = () => {
    if (!order || !weightOk || !packageType || !photoTaken) return;
    setLabelPrinted(true);
    toast.success('Ярлык напечатан');
  };

  const handleConfirmPack = () => {
    if (!order) return;
    const result = store.packOrder(order.id, weightNum, `PKG-${Math.floor(Math.random()*9000)+1000}`);
    if (result.ok) {
      toast.success('Заказ упакован, передан на отгрузку');
      setTimeout(reset, 800);
    } else {
      toast.error(result.reason || 'Ошибка веса. Эскалировано supervisor.');
      setTimeout(reset, 1500);
    }
  };

  // Список заказов
  if (!order) {
    return (
      <div className="min-h-screen bg-[#F5F6F8] pb-24">
        <PageHeader title="Упаковка" subtitle={`${ordersToPack.length} заказов`} />

        <div className="px-5 -mt-3 mb-3">
          <button
            onClick={() => { setScanMode('order'); setScannerOpen(true); }}
            className="w-full h-14 rounded-2xl bg-[#2EA7E0] text-white flex items-center justify-center gap-2 shadow-md active-press"
            style={{ fontWeight: 800 }}
          >
            <ScanLine className="w-5 h-5" />
            Сканировать заказ
          </button>
        </div>

        <div className="px-5 space-y-2">
          {ordersToPack.length === 0 ? (
            <EmptyState emoji="📦" title="Очередь пуста" subtitle="Все заказы упакованы" />
          ) : (
            ordersToPack.map(o => (
              <button
                key={o.id}
                onClick={() => { setSelectedOrderId(o.id); setScanMode('sku'); }}
                className="w-full bg-white rounded-2xl p-4 shadow-sm active-press text-left"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[14px] text-[#1F2430]" style={{ fontWeight: 800 }}>{o.id}</span>
                  <PriorityBadge priority={o.priority} size="sm" />
                </div>
                <div className="text-[12px] text-[#6B7280]" style={{ fontWeight: 500 }}>
                  {o.customerName} · {o.items.length} позиций · ~{o.expectedWeightKg} кг · {o.recommendedPackage}
                </div>
              </button>
            ))
          )}
        </div>

        <BarcodeScannerModal isOpen={scannerOpen} onClose={() => setScannerOpen(false)} onScan={handleScan} title="Сканировать заказ" />
      </div>
    );
  }

  // Упаковка выбранного заказа
  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24">
      <PageHeader title="Упаковка" subtitle={order.id} onBack={reset} />

      <div className="px-5 -mt-3 space-y-3">
        {/* Чек-лист товаров */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[14px] text-[#1F2430]" style={{ fontWeight: 800 }}>
              1. Сканирование товаров
            </h3>
            <span className="text-[12px] text-[#2EA7E0]" style={{ fontWeight: 700 }}>
              {scannedItems.size}/{order.items.length}
            </span>
          </div>
          <div className="space-y-2 mb-3">
            {order.items.map(it => {
              const full = lookupSkuFull(it.skuId, state.skus, state.products);
              const ok = scannedItems.has(it.id);
              return (
                <div
                  key={it.id}
                  className="flex items-center gap-3 p-2 rounded-xl"
                  style={{ backgroundColor: ok ? '#D1FAE5' : '#F9FAFB' }}
                >
                  <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-[24px]">
                    {full?.product?.photoEmoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-[#1F2430] truncate" style={{ fontWeight: 700 }}>
                      {full?.product?.name}
                    </div>
                    <div className="text-[11px] text-[#6B7280] truncate" style={{ fontWeight: 500 }}>
                      {full?.sku?.color} · {full?.sku?.size} · {it.qty} шт.
                    </div>
                  </div>
                  {ok && <Check className="w-5 h-5 text-[#00D27A]" />}
                </div>
              );
            })}
          </div>
          <button
            onClick={() => { setScanMode('sku'); setScannerOpen(true); }}
            className="w-full h-12 rounded-xl bg-[#2EA7E0] text-white text-[13px] flex items-center justify-center gap-2 active-press"
            style={{ fontWeight: 700 }}
          >
            <ScanLine className="w-4 h-4" />
            Сканировать товар
          </button>
        </div>

        {allItemsScanned && (
          <>
            {/* Вес */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="text-[14px] text-[#1F2430] mb-2" style={{ fontWeight: 800 }}>
                2. Взвешивание
              </h3>
              <div className="bg-[#F9FAFB] rounded-xl p-3 mb-2">
                <div className="text-[11px] text-[#6B7280]" style={{ fontWeight: 600 }}>Ожидаемый вес</div>
                <div className="text-[18px] text-[#1F2430]" style={{ fontWeight: 900 }}>
                  {order.expectedWeightKg} кг
                </div>
              </div>
              <input
                type="number"
                step="0.01"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="Введите фактический вес"
                className="w-full px-3 py-3 rounded-xl border-2 border-[#E5E7EB] focus:border-[#2EA7E0] focus:outline-none text-[14px]"
                style={{ fontWeight: 600 }}
              />
              {weight && (
                <div
                  className="mt-2 px-3 py-2 rounded-xl flex items-center gap-2 text-[13px]"
                  style={{
                    backgroundColor: weightOk ? '#D1FAE5' : '#FEE2E2',
                    color: weightOk ? '#065F46' : '#991B1B',
                    fontWeight: 700,
                  }}
                >
                  {weightOk
                    ? <><Check className="w-4 h-4" /> Вес совпадает (Δ {weightDelta.toFixed(2)} кг)</>
                    : <><AlertTriangle className="w-4 h-4" /> Расхождение {weightDelta.toFixed(2)} кг {'>'} 0.1 кг — supervisor</>
                  }
                </div>
              )}
            </div>

            {/* Тип упаковки */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="text-[14px] text-[#1F2430] mb-2" style={{ fontWeight: 800 }}>
                3. Упаковка
              </h3>
              <div className="text-[11px] text-[#6B7280] mb-2" style={{ fontWeight: 600 }}>
                Рекомендуем: {order.recommendedPackage}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(['BAG-S','BAG-M','BOX-S','BOX-M','BOX-L'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setPackageType(p)}
                    className="h-12 rounded-xl text-[12px] active-press"
                    style={{
                      backgroundColor: packageType === p ? '#2EA7E0' : '#F9FAFB',
                      color: packageType === p ? 'white' : '#1F2430',
                      fontWeight: 700,
                      border: order.recommendedPackage === p && packageType !== p ? '2px solid #2EA7E0' : '2px solid transparent',
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Фото */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="text-[14px] text-[#1F2430] mb-2" style={{ fontWeight: 800 }}>
                4. Фото упаковки
              </h3>
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
                {photoTaken ? '✓ Фото сделано' : 'Сделать фото'}
              </button>
            </div>

            {/* Печать ярлыка */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="text-[14px] text-[#1F2430] mb-2" style={{ fontWeight: 800 }}>
                5. Ярлык доставки
              </h3>
              <button
                onClick={handlePrintLabel}
                disabled={!weightOk || !packageType || !photoTaken}
                className="w-full h-12 rounded-xl flex items-center justify-center gap-2 active-press"
                style={{
                  backgroundColor: labelPrinted ? '#D1FAE5' : '#1F2430',
                  color: labelPrinted ? '#065F46' : 'white',
                  fontWeight: 700,
                  opacity: !weightOk || !packageType || !photoTaken ? 0.4 : 1,
                }}
              >
                <Printer className="w-5 h-5" />
                {labelPrinted ? '✓ Ярлык напечатан' : 'Печать ярлыка'}
              </button>
            </div>

            {labelPrinted && (
              <button
                onClick={handleConfirmPack}
                className="w-full h-14 rounded-2xl bg-[#00D27A] text-white shadow-md active-press"
                style={{ fontWeight: 800 }}
              >
                Завершить упаковку →
              </button>
            )}
          </>
        )}
      </div>

      <BarcodeScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleScan}
        title={scanMode === 'order' ? 'Сканировать заказ' : 'Сканировать товар'}
      />
    </div>
  );
}
