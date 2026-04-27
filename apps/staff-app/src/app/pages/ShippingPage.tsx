import { useState } from 'react';
import { ScanLine, Truck, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useAppState, store } from '../hooks/useAppState';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';
import { PriorityBadge } from '../components/Badges';

export function ShippingPage() {
  const state = useAppState();
  const [tab, setTab] = useState<'sort' | 'load'>('sort');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanFor, setScanFor] = useState<'courier' | 'vehicle' | null>(null);
  const [courierId, setCourierId] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');

  const ordersToSort = state.orders.filter(o => o.status === 'packed');
  const ordersToLoad = state.orders.filter(o => o.status === 'ready_for_dispatch' || o.status === 'loaded');

  // Группируем по zone
  const byZone: Record<string, typeof ordersToSort> = {};
  ordersToSort.forEach(o => {
    if (!byZone[o.destinationZone]) byZone[o.destinationZone] = [];
    byZone[o.destinationZone].push(o);
  });

  const handleScan = (code: string) => {
    if (scanFor === 'courier') {
      setCourierId(code);
      toast.success(`Курьер: ${code}`);
    } else if (scanFor === 'vehicle') {
      setVehiclePlate(code);
      toast.success(`ТС: ${code}`);
    }
    setScannerOpen(false);
    setScanFor(null);
  };

  const handleLoad = () => {
    if (!selectedOrderId || !courierId || !vehiclePlate) return;
    store.loadOrder(selectedOrderId, courierId, vehiclePlate);
    toast.success('Заказ передан курьеру');
    setSelectedOrderId(null);
    setCourierId('');
    setVehiclePlate('');
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24">
      <PageHeader title="Отправка" subtitle={`Sort: ${ordersToSort.length} · Load: ${ordersToLoad.length}`} />

      <div className="px-5 -mt-3 mb-3 flex gap-2">
        <button
          onClick={() => setTab('sort')}
          className="flex-1 h-10 rounded-full text-[13px] active-press"
          style={{
            backgroundColor: tab === 'sort' ? '#1F2430' : 'white',
            color: tab === 'sort' ? 'white' : '#1F2430',
            fontWeight: 700,
          }}
        >
          🔀 Сортировка
        </button>
        <button
          onClick={() => setTab('load')}
          className="flex-1 h-10 rounded-full text-[13px] active-press"
          style={{
            backgroundColor: tab === 'load' ? '#1F2430' : 'white',
            color: tab === 'load' ? 'white' : '#1F2430',
            fontWeight: 700,
          }}
        >
          🚚 Погрузка
        </button>
      </div>

      {tab === 'sort' && (
        <div className="px-5 space-y-3">
          {Object.keys(byZone).length === 0 ? (
            <EmptyState emoji="🔀" title="Очередь пуста" subtitle="Нет заказов на сортировку" />
          ) : (
            Object.entries(byZone).map(([zone, orders]) => (
              <div key={zone} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[14px] text-[#1F2430]" style={{ fontWeight: 800 }}>
                    📍 {zone}
                  </h3>
                  <span className="text-[12px] text-[#2EA7E0]" style={{ fontWeight: 700 }}>
                    {orders.length} заказов
                  </span>
                </div>
                <div className="space-y-1">
                  {orders.map(o => (
                    <div key={o.id} className="flex items-center gap-2 p-2 rounded-lg bg-[#F9FAFB]">
                      <span className="text-[12px] text-[#1F2430] flex-1 truncate" style={{ fontWeight: 700 }}>
                        {o.id} · {o.customerName}
                      </span>
                      <PriorityBadge priority={o.priority} size="sm" />
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    orders.forEach(o => store.markOrderReadyForDispatch(o.id));
                    toast.success(`Зона ${zone} готова к отправке`);
                  }}
                  className="w-full mt-3 h-10 rounded-xl bg-[#00D27A] text-white text-[13px] active-press"
                  style={{ fontWeight: 700 }}
                >
                  ✓ Готово к отправке
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'load' && (
        <div className="px-5">
          {selectedOrderId ? (
            <div className="space-y-3">
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="text-[15px] text-[#1F2430] mb-1" style={{ fontWeight: 800 }}>
                  Передача курьеру
                </div>
                <div className="text-[12px] text-[#6B7280]" style={{ fontWeight: 500 }}>
                  Заказ {selectedOrderId}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="text-[14px] text-[#1F2430] mb-2" style={{ fontWeight: 800 }}>
                  Сканировать ID курьера
                </h3>
                {courierId ? (
                  <div className="bg-[#D1FAE5] rounded-xl p-3 flex items-center gap-2">
                    <Check className="w-5 h-5 text-[#00D27A]" />
                    <span className="text-[14px] text-[#065F46]" style={{ fontWeight: 800 }}>
                      {courierId}
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={() => { setScanFor('courier'); setScannerOpen(true); }}
                    className="w-full h-12 rounded-xl bg-[#2EA7E0] text-white text-[13px] flex items-center justify-center gap-2 active-press"
                    style={{ fontWeight: 700 }}
                  >
                    <ScanLine className="w-4 h-4" />
                    Сканировать
                  </button>
                )}
              </div>

              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="text-[14px] text-[#1F2430] mb-2" style={{ fontWeight: 800 }}>
                  Сканировать номер ТС
                </h3>
                {vehiclePlate ? (
                  <div className="bg-[#D1FAE5] rounded-xl p-3 flex items-center gap-2">
                    <Check className="w-5 h-5 text-[#00D27A]" />
                    <span className="text-[14px] text-[#065F46]" style={{ fontWeight: 800 }}>
                      {vehiclePlate}
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={() => { setScanFor('vehicle'); setScannerOpen(true); }}
                    disabled={!courierId}
                    className="w-full h-12 rounded-xl bg-[#2EA7E0] text-white text-[13px] flex items-center justify-center gap-2 active-press"
                    style={{ fontWeight: 700, opacity: courierId ? 1 : 0.4 }}
                  >
                    <ScanLine className="w-4 h-4" />
                    Сканировать
                  </button>
                )}
              </div>

              {courierId && vehiclePlate && (
                <button
                  onClick={handleLoad}
                  className="w-full h-14 rounded-2xl bg-[#00D27A] text-white shadow-md active-press"
                  style={{ fontWeight: 800 }}
                >
                  ✓ Передать курьеру
                </button>
              )}

              <button
                onClick={() => { setSelectedOrderId(null); setCourierId(''); setVehiclePlate(''); }}
                className="w-full h-10 text-[13px] text-[#6B7280]"
                style={{ fontWeight: 600 }}
              >
                Отмена
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {ordersToLoad.length === 0 ? (
                <EmptyState emoji="🚚" title="Очередь пуста" subtitle="Нет готовых к погрузке" />
              ) : (
                ordersToLoad.map(o => (
                  <button
                    key={o.id}
                    onClick={() => setSelectedOrderId(o.id)}
                    className="w-full bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm active-press"
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#D1FAE5] flex items-center justify-center">
                      <Truck className="w-6 h-6 text-[#00D27A]" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-[14px] text-[#1F2430]" style={{ fontWeight: 800 }}>
                        {o.id}
                      </div>
                      <div className="text-[11px] text-[#6B7280]" style={{ fontWeight: 500 }}>
                        {o.customerName} · {o.destinationZone}
                      </div>
                    </div>
                    <PriorityBadge priority={o.priority} size="sm" />
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      <BarcodeScannerModal
        isOpen={scannerOpen}
        onClose={() => { setScannerOpen(false); setScanFor(null); }}
        onScan={handleScan}
        title={scanFor === 'courier' ? 'ID курьера' : 'Номер ТС'}
      />
    </div>
  );
}
