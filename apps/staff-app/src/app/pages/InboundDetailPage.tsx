import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Camera, Plus, Minus, ScanLine, AlertCircle, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useAppState, store, lookupSkuFull } from '../hooks/useAppState';
import { InboundStatusBadge, RiskBadge } from '../components/Badges';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';
import { ProblemModal } from '../components/ProblemModal';

export function InboundDetailPage() {
  const { id } = useParams();
  const state = useAppState();
  const nav = useNavigate();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [problemOpen, setProblemOpen] = useState(false);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, { actual: number; damaged: number }>>({});

  // Stage-3: id is either the ASN code (INB-2026-00045) or a RECEIVE task UUID.
  // Resolve via task.payload.asnId (backend ASN uuid) → match cached ASN by _backendId.
  const task = state.tasks.find(t => t.id === id);
  const asnBackendId = task?.payload.asnId;
  const asn = asnBackendId
    ? state.asns.find(a => (a as any)._backendId === asnBackendId)
    : state.asns.find(a => a.id === id);

  if (!asn) {
    return (
      <div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[16px] text-[#1F2430] mb-3" style={{ fontWeight: 700 }}>Поставка не найдена</p>
          <button onClick={() => nav('/inbound')} className="text-[14px] text-[#2EA7E0]">Вернуться</button>
        </div>
      </div>
    );
  }

  const seller = store.findSeller(asn.sellerId);
  const totalChecked = asn.items.filter(it => it.checked).length;
  const totalItems = asn.items.length;
  const progress = totalItems ? (totalChecked / totalItems) * 100 : 0;

  const inc = (itemId: string, field: 'actual' | 'damaged') => {
    setCounts(prev => ({
      ...prev,
      [itemId]: {
        actual: prev[itemId]?.actual ?? 0,
        damaged: prev[itemId]?.damaged ?? 0,
        [field]: (prev[itemId]?.[field] ?? 0) + 1,
      } as any,
    }));
  };

  const dec = (itemId: string, field: 'actual' | 'damaged') => {
    setCounts(prev => ({
      ...prev,
      [itemId]: {
        actual: prev[itemId]?.actual ?? 0,
        damaged: prev[itemId]?.damaged ?? 0,
        [field]: Math.max(0, (prev[itemId]?.[field] ?? 0) - 1),
      } as any,
    }));
  };

  const confirmItem = (itemId: string) => {
    const c = counts[itemId] || { actual: 0, damaged: 0 };
    store.receiveASNItem(asn.id, itemId, c.actual, c.damaged);
    toast.success('Позиция принята');
  };

  const handleScan = (code: string) => {
    setScannerOpen(false);
    if (code === asn.dockNo) {
      toast.success(`Док ${code} подтверждён`);
      return;
    }
    const sku = store.findSkuByBarcode(code);
    if (!sku) {
      toast.error('Штрихкод не распознан');
      return;
    }
    const matchingItem = asn.items.find(it => it.skuId === sku.id);
    if (!matchingItem) {
      toast.error('Этот товар не из этой поставки');
      return;
    }
    setActiveItemId(matchingItem.id);
    inc(matchingItem.id, 'actual');
    toast.success('+1: ' + sku.id);
  };

  const handleStartReceive = () => {
    if (asn.status === 'expected') {
      store.markASNArrived(asn.id, 'D-AUTO');
    }
    store.startReceiving(asn.id);
    toast.success('Приёмка начата');
  };

  const handleFinish = () => {
    store.finishReceiving(asn.id);
    toast.success('Приёмка завершена. Передано на QC.');
    setTimeout(() => nav('/inbound'), 800);
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24">
      {/* Шапка */}
      <div className="bg-[#1F2430] px-5 pt-12 pb-5 rounded-b-3xl">
        <button onClick={() => nav('/inbound')} className="flex items-center gap-2 text-white/80 mb-3">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-[13px]" style={{ fontWeight: 600 }}>Назад</span>
        </button>
        <h1 className="text-white text-[20px]" style={{ fontWeight: 900 }}>{asn.id}</h1>
        <p className="text-white/60 text-[12px] mt-0.5" style={{ fontWeight: 500 }}>
          Манифест: {asn.manifestNo}
        </p>
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <InboundStatusBadge status={asn.status} />
          {seller && (
            <>
              <span className="text-white/80 text-[12px]" style={{ fontWeight: 600 }}>{seller.name}</span>
              <RiskBadge risk={seller.riskScore} />
            </>
          )}
        </div>
      </div>

      {/* Водитель и транспорт */}
      {asn.driverName && (
        <div className="px-5 mt-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-[13px] text-[#6B7280] mb-2" style={{ fontWeight: 600 }}>Водитель</h3>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[15px] text-[#1F2430]" style={{ fontWeight: 800 }}>{asn.driverName}</div>
                <div className="text-[12px] text-[#6B7280]" style={{ fontWeight: 500 }}>
                  {asn.vehiclePlate}
                  {asn.dockNo && ` · ${asn.dockNo}`}
                </div>
              </div>
              {asn.driverPhone && (
                <a
                  href={`tel:${asn.driverPhone}`}
                  className="w-10 h-10 rounded-full bg-[#00D27A] flex items-center justify-center"
                >
                  <Phone className="w-4 h-4 text-white" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Прогресс */}
      {(asn.status === 'receiving' || asn.status === 'docked') && (
        <div className="px-5 mt-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] text-[#1F2430]" style={{ fontWeight: 700 }}>
                Прогресс приёмки
              </span>
              <span className="text-[13px] text-[#2EA7E0]" style={{ fontWeight: 800 }}>
                {totalChecked} / {totalItems}
              </span>
            </div>
            <div className="h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
              <div className="h-full bg-[#2EA7E0]" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Кнопка начать приёмку */}
      {(asn.status === 'expected' || asn.status === 'arrived' || asn.status === 'docked') && (
        <div className="px-5 mt-3">
          <button
            onClick={handleStartReceive}
            className="w-full h-14 rounded-2xl bg-[#2EA7E0] text-white shadow-md active-press"
            style={{ fontWeight: 800 }}
          >
            ▶ Начать приёмку
          </button>
        </div>
      )}

      {/* Список товаров */}
      <div className="px-5 mt-3">
        <h3 className="text-[15px] text-[#1F2430] mb-2" style={{ fontWeight: 800 }}>
          Товары ({asn.items.length})
        </h3>
        <div className="space-y-2">
          {asn.items.map(item => {
            const full = lookupSkuFull(item.skuId, state.skus, state.products);
            const c = counts[item.id] || { actual: item.actualQty, damaged: item.damagedQty };
            const isActive = activeItemId === item.id;
            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-3 shadow-sm"
                style={{ border: isActive ? '2px solid #2EA7E0' : '2px solid transparent' }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-[#F3F4F6] flex items-center justify-center text-[28px]">
                    {full?.product?.photoEmoji || '📦'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] text-[#1F2430] truncate" style={{ fontWeight: 700 }}>
                      {full?.product?.name || item.skuId}
                    </div>
                    <div className="text-[11px] text-[#6B7280]" style={{ fontWeight: 500 }}>
                      {full?.sku?.color} · {full?.sku?.size} · {full?.sku?.barcode}
                    </div>
                  </div>
                  {item.checked && <Check className="w-5 h-5 text-[#00D27A]" />}
                </div>

                {asn.status === 'receiving' && !item.checked && (
                  <>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <CounterCell label="Принято" expected={item.expectedQty} value={c.actual} onInc={() => inc(item.id, 'actual')} onDec={() => dec(item.id, 'actual')} />
                      <CounterCell label="Брак" value={c.damaged} onInc={() => inc(item.id, 'damaged')} onDec={() => dec(item.id, 'damaged')} damaged />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => confirmItem(item.id)}
                        className="flex-1 h-10 rounded-xl bg-[#00D27A] text-white text-[13px] active-press"
                        style={{ fontWeight: 700 }}
                      >
                        ✓ Подтвердить
                      </button>
                      <button
                        onClick={() => { setActiveItemId(item.id); setProblemOpen(true); }}
                        className="px-3 h-10 rounded-xl bg-[#FEE2E2] text-[#EF4444] text-[13px] active-press"
                        style={{ fontWeight: 700 }}
                      >
                        Проблема
                      </button>
                    </div>
                  </>
                )}

                {item.checked && (
                  <div className="text-[12px] text-[#1F2430]" style={{ fontWeight: 600 }}>
                    Принято: {item.actualQty}/{item.expectedQty}
                    {item.damagedQty > 0 && ` · Брак: ${item.damagedQty}`}
                    {item.actualQty !== item.expectedQty && (
                      <span className="text-[#EF4444] ml-2">⚠ расхождение</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Нижние кнопки */}
      {asn.status === 'receiving' && (
        <div className="px-5 mt-4 space-y-2">
          <button
            onClick={() => setScannerOpen(true)}
            className="w-full h-14 rounded-2xl bg-[#2EA7E0] text-white flex items-center justify-center gap-2 shadow-md active-press"
            style={{ fontWeight: 800 }}
          >
            <ScanLine className="w-5 h-5" />
            Сканировать товар
          </button>
          {totalChecked > 0 && (
            <button
              onClick={handleFinish}
              className="w-full h-14 rounded-2xl bg-[#00D27A] text-white shadow-md active-press"
              style={{ fontWeight: 800 }}
            >
              Завершить приёмку →
            </button>
          )}
        </div>
      )}

      <BarcodeScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleScan}
        title="Сканирование товара"
      />

      <ProblemModal
        isOpen={problemOpen}
        onClose={() => setProblemOpen(false)}
        onSubmit={(code, msg) => {
          store.reportIncident({
            type: 'damage',
            description: `Проблема при приёмке ${asn.id}: ${code} ${msg}`,
            skuId: activeItemId ? asn.items.find(i => i.id === activeItemId)?.skuId : undefined,
            photos: [],
          });
          setProblemOpen(false);
          toast.success('Проблема отправлена supervisor');
        }}
      />
    </div>
  );
}

function CounterCell({ label, value, expected, onInc, onDec, damaged }: { label: string; value: number; expected?: number; onInc: () => void; onDec: () => void; damaged?: boolean }) {
  return (
    <div className="bg-[#F9FAFB] rounded-xl p-2">
      <div className="text-[10px] text-[#6B7280] mb-1" style={{ fontWeight: 600 }}>
        {label}{expected !== undefined && ` (ожидается ${expected})`}
      </div>
      <div className="flex items-center justify-between">
        <button onClick={onDec} className="w-7 h-7 rounded-full bg-white flex items-center justify-center active-press">
          <Minus className="w-3 h-3 text-[#1F2430]" />
        </button>
        <span className="text-[18px]" style={{ fontWeight: 900, color: damaged ? '#EF4444' : '#1F2430' }}>
          {value}
        </span>
        <button onClick={onInc} className="w-7 h-7 rounded-full bg-white flex items-center justify-center active-press">
          <Plus className="w-3 h-3 text-[#1F2430]" />
        </button>
      </div>
    </div>
  );
}
