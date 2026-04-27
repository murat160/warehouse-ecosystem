import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Check, ScanLine, AlertCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useAppState, store, lookupSkuFull } from '../hooks/useAppState';
import { PriorityBadge } from '../components/Badges';
import { PageHeader } from '../components/PageHeader';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';
import { ProblemModal } from '../components/ProblemModal';

export function PickingDetailPage() {
  const { id } = useParams();
  const state = useAppState();
  const nav = useNavigate();

  // Stage-3: id from URL is the backend task UUID; resolve it → order via task.payload.orderId
  const task = state.tasks.find(t => t.id === id);
  const orderBackendId = task?.payload.orderId;
  const order = orderBackendId
    ? state.orders.find(o => (o as any)._backendId === orderBackendId)
    : state.orders.find(o => o.id === id);

  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState<'bin' | 'sku' | 'tote' | null>(null);
  const [scanned, setScanned] = useState<Record<string, { bin?: boolean; sku?: boolean; tote?: boolean }>>({});
  const [problemOpen, setProblemOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!order) {
    return (
      <div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[16px] text-[#1F2430] mb-3" style={{ fontWeight: 700 }}>Заказ не найден</p>
          <button onClick={() => nav('/picking')} className="text-[14px] text-[#2EA7E0]">Вернуться</button>
        </div>
      </div>
    );
  }

  const activeItem = activeItemId
    ? order.items.find(i => i.id === activeItemId)
    : order.items.find(i => i.pickedQty < i.qty);
  const taskId = task?.id ?? '';

  const handleScan = (code: string) => {
    if (!activeItem) return;
    const itemKey = activeItem.id;

    if (scanMode === 'bin') {
      const result = store.validateBinScan(taskId, code, activeItem.binId);
      if (!result.ok) {
        setErrorMsg(result.errorMessage || 'Ошибка скана');
        toast.error(result.errorMessage || 'Не та ячейка');
        setScanMode(null);
        return;
      }
      setScanned(prev => ({ ...prev, [itemKey]: { ...prev[itemKey], bin: true } }));
      setErrorMsg(null);
      toast.success('Ячейка верная');
    } else if (scanMode === 'sku') {
      const result = store.validateSkuScan(taskId, code, activeItem.skuId);
      if (!result.ok) {
        setErrorMsg(result.errorMessage || 'Ошибка скана');
        toast.error(result.errorMessage || 'Не тот товар');
        setScanMode(null);
        return;
      }
      setScanned(prev => ({ ...prev, [itemKey]: { ...prev[itemKey], sku: true } }));
      setErrorMsg(null);
      toast.success('Товар верный');
    } else if (scanMode === 'tote') {
      setScanned(prev => ({ ...prev, [itemKey]: { ...prev[itemKey], tote: true } }));
      // Подтверждаем сбор позиции — двигаем товар из ячейки
      store.pickItem(order.id, activeItem.id, activeItem.qty);
      setErrorMsg(null);
      toast.success('Позиция собрана');
    }
    setScanMode(null);
  };

  const handleStart = () => {
    if (order.status === 'released') {
      store.startPicking(order.id);
    }
  };

  const handleFinish = () => {
    store.finishPicking(order.id);
    toast.success('Заказ собран. Передан на упаковку.');
    setTimeout(() => nav('/picking'), 800);
  };

  const allDone = order.items.every(i => i.pickedQty >= i.qty);
  const itemKey = activeItem?.id || '';
  const itemScans = scanned[itemKey] || {};

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24">
      <PageHeader title={order.id} subtitle={`${order.customerName} · ${order.destinationCity}`} onBack={() => nav('/picking')} />

      <div className="px-5 -mt-3 space-y-3">
        {errorMsg && (
          <div className="bg-[#FEE2E2] rounded-2xl p-3 flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-[#EF4444] flex-shrink-0" />
            <div className="flex-1">
              <div className="text-[12px] text-[#991B1B]" style={{ fontWeight: 800 }}>
                Действие заблокировано
              </div>
              <div className="text-[12px] text-[#991B1B]" style={{ fontWeight: 500 }}>
                {errorMsg}
              </div>
              <div className="text-[11px] text-[#7F1D1D] mt-1" style={{ fontWeight: 500 }}>
                Ошибка зарегистрирована. Попробуйте ещё раз или сообщите supervisor.
              </div>
            </div>
          </div>
        )}

        {/* Инфо заказа */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <PriorityBadge priority={order.priority} />
            <span className="text-[12px] text-[#6B7280]" style={{ fontWeight: 600 }}>
              Дедлайн: {new Date(order.deadlineAt).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2">
            <Cell label="Позиций" value={order.items.length.toString()} />
            <Cell label="Собрано" value={`${order.items.filter(i => i.pickedQty >= i.qty).length}/${order.items.length}`} />
            <Cell label="Тоут" value={`TOTE-${order.id.slice(-4)}`} />
          </div>
        </div>

        {order.status === 'released' && (
          <button
            onClick={handleStart}
            className="w-full h-14 rounded-2xl bg-[#2EA7E0] text-white shadow-md active-press"
            style={{ fontWeight: 800 }}
          >
            ▶ Начать сборку
          </button>
        )}

        {/* Активная позиция */}
        {activeItem && order.status !== 'released' && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            {(() => {
              const full = lookupSkuFull(activeItem.skuId, state.skus, state.products);
              return (
                <>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-16 h-16 rounded-xl bg-[#F3F4F6] flex items-center justify-center text-[40px]">
                      {full?.product?.photoEmoji}
                    </div>
                    <div className="flex-1">
                      <div className="text-[15px] text-[#1F2430]" style={{ fontWeight: 800 }}>
                        {full?.product?.name}
                      </div>
                      <div className="text-[12px] text-[#6B7280]" style={{ fontWeight: 500 }}>
                        {full?.sku?.color} · {full?.sku?.size} · {activeItem.qty} шт.
                      </div>
                      <div className="text-[10px] text-[#9CA3AF] mt-0.5 font-mono" style={{ fontWeight: 500 }}>
                        Штрихкод: {full?.sku?.barcode}
                      </div>
                    </div>
                  </div>
                  <div className="bg-[#1F2430] rounded-xl p-3 mb-3">
                    <div className="text-[11px] text-white/60 mb-0.5" style={{ fontWeight: 600 }}>Адрес ячейки</div>
                    <div className="text-[16px] text-white font-mono" style={{ fontWeight: 900 }}>
                      {activeItem.binId}
                    </div>
                  </div>
                </>
              );
            })()}

            <div className="space-y-2">
              <Step num={1} label="Сканируйте ячейку"
                value={itemScans.bin ? activeItem.binId : ''}
                done={!!itemScans.bin}
                onClick={() => setScanMode('bin')}
              />
              <Step num={2} label="Сканируйте товар"
                value={itemScans.sku ? lookupSkuFull(activeItem.skuId, state.skus, state.products)?.sku?.barcode || '' : ''}
                done={!!itemScans.sku}
                disabled={!itemScans.bin}
                onClick={() => setScanMode('sku')}
              />
              <Step num={3} label="Положите в тоут"
                value={itemScans.tote ? 'OK' : ''}
                done={!!itemScans.tote}
                disabled={!itemScans.sku}
                onClick={() => setScanMode('tote')}
              />
            </div>

            <button
              onClick={() => setProblemOpen(true)}
              className="w-full mt-3 py-2 rounded-xl bg-[#FEE2E2] text-[#EF4444] text-[13px] flex items-center justify-center gap-2 active-press"
              style={{ fontWeight: 700 }}
            >
              <AlertCircle className="w-4 h-4" />
              Сообщить проблему
            </button>
          </div>
        )}

        {/* Список всех позиций */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-[14px] text-[#1F2430] mb-2" style={{ fontWeight: 800 }}>Все позиции</h3>
          <div className="space-y-2">
            {order.items.map(it => {
              const full = lookupSkuFull(it.skuId, state.skus, state.products);
              const done = it.pickedQty >= it.qty;
              return (
                <button
                  key={it.id}
                  onClick={() => !done && setActiveItemId(it.id)}
                  className="w-full flex items-center gap-3 p-2 rounded-xl active-press text-left"
                  style={{ backgroundColor: done ? '#D1FAE5' : '#F9FAFB' }}
                >
                  <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-[24px]">
                    {full?.product?.photoEmoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-[#1F2430] truncate" style={{ fontWeight: 700 }}>
                      {full?.product?.name}
                    </div>
                    <div className="text-[11px] text-[#6B7280] truncate" style={{ fontWeight: 500 }}>
                      {full?.sku?.color} · {full?.sku?.size}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[13px]" style={{ fontWeight: 800, color: done ? '#00D27A' : '#1F2430' }}>
                      {it.pickedQty}/{it.qty}
                    </div>
                    {done && <Check className="w-4 h-4 text-[#00D27A] ml-auto" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {allDone && (
          <button
            onClick={handleFinish}
            className="w-full h-14 rounded-2xl bg-[#00D27A] text-white shadow-md active-press"
            style={{ fontWeight: 800 }}
          >
            Завершить сборку →
          </button>
        )}
      </div>

      <BarcodeScannerModal
        isOpen={scanMode !== null}
        onClose={() => setScanMode(null)}
        onScan={handleScan}
        title={
          scanMode === 'bin' ? 'Сканировать ячейку'
          : scanMode === 'sku' ? 'Сканировать товар'
          : 'Сканировать тоут'
        }
      />

      <ProblemModal
        isOpen={problemOpen}
        onClose={() => setProblemOpen(false)}
        onSubmit={(code, msg) => {
          store.reportTaskError(taskId, { code, message: msg });
          store.escalateTask(taskId, `Picking ${order.id}: ${code} ${msg}`);
          toast.success('Проблема отправлена supervisor');
          setProblemOpen(false);
        }}
      />
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#F9FAFB] rounded-lg p-2">
      <div className="text-[14px] text-[#1F2430] truncate" style={{ fontWeight: 800 }}>{value}</div>
      <div className="text-[10px] text-[#6B7280]" style={{ fontWeight: 600 }}>{label}</div>
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
        className="w-9 h-9 rounded-full flex items-center justify-center"
        style={{ backgroundColor: done ? '#00D27A' : '#2EA7E0' }}
      >
        {done ? <Check className="w-5 h-5 text-white" /> : <span className="text-white text-[14px]" style={{ fontWeight: 800 }}>{num}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] text-[#6B7280]" style={{ fontWeight: 600 }}>{label}</div>
        {value && <div className="text-[12px] text-[#1F2430] truncate font-mono" style={{ fontWeight: 700 }}>{value}</div>}
      </div>
      {!done && !disabled && <ScanLine className="w-5 h-5 text-[#2EA7E0]" />}
    </button>
  );
}
