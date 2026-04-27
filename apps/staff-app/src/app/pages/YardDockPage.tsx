import { useState } from 'react';
import { Truck, ParkingMeter, ArrowRight, X, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { useAppState, store } from '../hooks/useAppState';
import { PageHeader } from '../components/PageHeader';
import { type ASN } from '../data/mockData';

export function YardDockPage() {
  const state = useAppState();
  const [selectedAsn, setSelectedAsn] = useState<ASN | null>(null);
  const [chosenDock, setChosenDock] = useState<string | null>(null);

  // 6 доков
  const docks = ['D-01', 'D-02', 'D-03', 'D-04', 'D-05', 'D-06'];
  const dockUsage: Record<string, ASN | null> = {};
  docks.forEach(d => {
    dockUsage[d] = state.asns.find(a => a.dockNo === d && a.status !== 'received') || null;
  });

  // Грузовики в yard (прибыли но без dock)
  const yardTrucks = state.asns.filter(a => a.status === 'arrived' && !a.dockNo);
  // Ожидаемые
  const expectedTrucks = state.asns.filter(a => a.status === 'expected');

  const handleAssignDock = () => {
    if (!selectedAsn || !chosenDock) return;
    if (dockUsage[chosenDock]) {
      toast.error(`Док ${chosenDock} занят`);
      return;
    }
    store.markASNArrived(selectedAsn.id, chosenDock);
    toast.success(`${selectedAsn.id} → ${chosenDock}`);
    setSelectedAsn(null);
    setChosenDock(null);
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24">
      <PageHeader title="Yard & Dock" subtitle={`${docks.length} доков · ${yardTrucks.length} в yard`} />

      {/* Доки */}
      <div className="px-5 -mt-3 mb-3">
        <h3 className="text-[14px] text-[#1F2430] mb-2" style={{ fontWeight: 800 }}>
          🚪 Доки
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {docks.map(d => {
            const used = dockUsage[d];
            return (
              <div
                key={d}
                className="bg-white rounded-2xl p-3 shadow-sm"
                style={{ border: used ? '2px solid #EF4444' : '2px solid #00D27A' }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[14px] text-[#1F2430]" style={{ fontWeight: 800 }}>{d}</span>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: used ? '#FEE2E2' : '#D1FAE5',
                      color: used ? '#991B1B' : '#065F46',
                      fontWeight: 700,
                    }}
                  >
                    {used ? 'Занят' : 'Свободен'}
                  </span>
                </div>
                {used ? (
                  <div className="text-[11px] text-[#1F2430]" style={{ fontWeight: 600 }}>
                    {used.id}
                    <div className="text-[10px] text-[#6B7280]" style={{ fontWeight: 500 }}>
                      {used.driverName} · {used.vehiclePlate}
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-[#9CA3AF] italic" style={{ fontWeight: 500 }}>
                    Готов к приёму
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Yard (прибыли, ожидают док) */}
      {yardTrucks.length > 0 && (
        <div className="px-5 mb-3">
          <h3 className="text-[14px] text-[#1F2430] mb-2 flex items-center gap-2" style={{ fontWeight: 800 }}>
            <ParkingMeter className="w-4 h-4" />
            В yard ({yardTrucks.length})
          </h3>
          <div className="space-y-2">
            {yardTrucks.map(asn => (
              <button
                key={asn.id}
                onClick={() => setSelectedAsn(asn)}
                className="w-full bg-white rounded-2xl p-3 flex items-center gap-3 shadow-sm active-press text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] flex items-center justify-center">
                  <Truck className="w-5 h-5 text-[#F59E0B]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-[#1F2430]" style={{ fontWeight: 700 }}>
                    {asn.id} · {asn.vehiclePlate}
                  </div>
                  <div className="text-[11px] text-[#6B7280] truncate" style={{ fontWeight: 500 }}>
                    {asn.driverName} · {asn.boxCount} боксов
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#9CA3AF]" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Ожидаемые */}
      <div className="px-5">
        <h3 className="text-[14px] text-[#1F2430] mb-2" style={{ fontWeight: 800 }}>
          ⏰ Ожидаются ({expectedTrucks.length})
        </h3>
        <div className="space-y-2">
          {expectedTrucks.map(asn => (
            <div key={asn.id} className="bg-white rounded-2xl p-3 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-[#F3F4F6] flex items-center justify-center">
                <Truck className="w-5 h-5 text-[#9CA3AF]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-[#1F2430]" style={{ fontWeight: 700 }}>
                  {asn.id}
                </div>
                <div className="text-[11px] text-[#6B7280]" style={{ fontWeight: 500 }}>
                  {new Date(asn.expectedAt).toLocaleString('ru')} · {asn.vehiclePlate || '—'}
                </div>
              </div>
              {asn.driverPhone && (
                <a href={`tel:${asn.driverPhone}`} className="w-9 h-9 rounded-full bg-[#00D27A] flex items-center justify-center">
                  <Phone className="w-4 h-4 text-white" />
                </a>
              )}
            </div>
          ))}
          {expectedTrucks.length === 0 && (
            <div className="bg-white rounded-2xl p-6 text-center text-[12px] text-[#6B7280]" style={{ fontWeight: 500 }}>
              Поставок не ожидается
            </div>
          )}
        </div>
      </div>

      {/* Modal: назначить док */}
      {selectedAsn && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end animate-fade-in" onClick={() => setSelectedAsn(null)}>
          <div
            className="w-full bg-white rounded-t-3xl p-5 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
          >
            <div className="flex justify-center pb-3">
              <div className="w-9 h-1 bg-[#DADADA] rounded-full" />
            </div>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-[18px] text-[#1F2430]" style={{ fontWeight: 900 }}>
                  Назначить док
                </h3>
                <p className="text-[12px] text-[#6B7280] mt-0.5" style={{ fontWeight: 500 }}>
                  {selectedAsn.id} · {selectedAsn.vehiclePlate}
                </p>
              </div>
              <button onClick={() => setSelectedAsn(null)} className="w-9 h-9 rounded-full bg-[#F3F4F6] flex items-center justify-center">
                <X className="w-5 h-5 text-[#1F2430]" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {docks.map(d => {
                const isFree = !dockUsage[d];
                return (
                  <button
                    key={d}
                    disabled={!isFree}
                    onClick={() => setChosenDock(d)}
                    className="h-16 rounded-xl active-press flex flex-col items-center justify-center"
                    style={{
                      backgroundColor: chosenDock === d ? '#2EA7E0' : isFree ? '#D1FAE5' : '#FEE2E2',
                      color: chosenDock === d ? 'white' : isFree ? '#065F46' : '#991B1B',
                      fontWeight: 800,
                      opacity: !isFree ? 0.6 : 1,
                    }}
                  >
                    <div className="text-[16px]">{d}</div>
                    <div className="text-[10px]">{isFree ? 'свободен' : 'занят'}</div>
                  </button>
                );
              })}
            </div>

            {chosenDock && (
              <button
                onClick={handleAssignDock}
                className="w-full h-12 rounded-xl bg-[#2EA7E0] text-white active-press"
                style={{ fontWeight: 800 }}
              >
                Назначить {chosenDock}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
