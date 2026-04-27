import { useState } from 'react';
import { useAppState } from '../hooks/useAppState';
import { PageHeader } from '../components/PageHeader';
import { ZONES, type ZoneCode, type Zone } from '../data/mockData';

export function WarehouseMapPage() {
  const state = useAppState();
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [view, setView] = useState<'utilization' | 'activity'>('utilization');

  // Размещение зон на схеме — фиксированный layout 4 колонки
  const layout: { code: ZoneCode; col: number; row: number; w: number; h: number }[] = [
    { code: 'INB', col: 0, row: 0, w: 1, h: 1 },
    { code: 'QC',  col: 1, row: 0, w: 1, h: 1 },
    { code: 'REP', col: 2, row: 0, w: 1, h: 1 },
    { code: 'RET', col: 3, row: 0, w: 1, h: 1 },
    { code: 'HNG', col: 0, row: 1, w: 2, h: 1 },
    { code: 'FLD', col: 2, row: 1, w: 2, h: 1 },
    { code: 'SHS', col: 0, row: 2, w: 1, h: 1 },
    { code: 'ACC', col: 1, row: 2, w: 1, h: 1 },
    { code: 'HVL', col: 2, row: 2, w: 1, h: 1 },
    { code: 'BULK',col: 3, row: 2, w: 1, h: 1 },
    { code: 'RTV', col: 0, row: 3, w: 1, h: 1 },
    { code: 'DAM', col: 1, row: 3, w: 1, h: 1 },
    { code: 'QRT', col: 2, row: 3, w: 1, h: 1 },
    { code: 'PIC', col: 3, row: 3, w: 1, h: 1 },
    { code: 'PCK', col: 0, row: 4, w: 2, h: 1 },
    { code: 'SRT', col: 2, row: 4, w: 1, h: 1 },
    { code: 'OUT', col: 3, row: 4, w: 1, h: 1 },
  ];

  // Сколько задач в каждой зоне
  const tasksInZone = (z: ZoneCode) => state.tasks.filter(t => t.zone === z && t.status !== 'completed').length;

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24">
      <PageHeader title="Карта склада" subtitle="Живая схема WH01" />

      {/* Переключатель отображения */}
      <div className="px-5 -mt-3 mb-3 flex gap-2">
        <button
          onClick={() => setView('utilization')}
          className="flex-1 h-10 rounded-full text-[12px] active-press"
          style={{
            backgroundColor: view === 'utilization' ? '#1F2430' : 'white',
            color: view === 'utilization' ? 'white' : '#1F2430',
            fontWeight: 700,
          }}
        >
          Заполнение
        </button>
        <button
          onClick={() => setView('activity')}
          className="flex-1 h-10 rounded-full text-[12px] active-press"
          style={{
            backgroundColor: view === 'activity' ? '#1F2430' : 'white',
            color: view === 'activity' ? 'white' : '#1F2430',
            fontWeight: 700,
          }}
        >
          Активность
        </button>
      </div>

      {/* Карта */}
      <div className="px-5 mb-3">
        <div className="bg-white rounded-2xl p-3 shadow-sm">
          <div
            className="grid gap-1.5"
            style={{
              gridTemplateColumns: 'repeat(4, 1fr)',
              gridTemplateRows: 'repeat(5, 60px)',
            }}
          >
            {layout.map(item => {
              const zone = ZONES.find(z => z.code === item.code)!;
              const value = view === 'utilization' ? zone.utilization : tasksInZone(zone.code) * 10;
              const intensity = Math.min(value, 100);
              return (
                <button
                  key={item.code}
                  onClick={() => setSelectedZone(zone)}
                  className="rounded-lg flex flex-col items-center justify-center text-center p-1 active-press"
                  style={{
                    gridColumn: `${item.col + 1} / span ${item.w}`,
                    gridRow: `${item.row + 1} / span ${item.h}`,
                    backgroundColor: zone.color + Math.round(intensity * 2.55).toString(16).padStart(2, '0').slice(0, 2),
                    border: `2px solid ${zone.color}`,
                  }}
                >
                  <span className="text-[11px] text-white drop-shadow" style={{ fontWeight: 900 }}>
                    {zone.code}
                  </span>
                  <span className="text-[9px] text-white drop-shadow" style={{ fontWeight: 700 }}>
                    {view === 'utilization' ? `${zone.utilization}%` : `${tasksInZone(zone.code)} задач`}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Шкала */}
          <div className="mt-3 flex items-center gap-2 text-[10px] text-[#6B7280]" style={{ fontWeight: 600 }}>
            <span>Низкая</span>
            <div className="flex-1 h-2 rounded-full" style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.1), rgba(0,0,0,0.6))' }} />
            <span>Высокая</span>
          </div>
        </div>
      </div>

      {/* Список зон */}
      <div className="px-5 mb-3">
        <h3 className="text-[14px] text-[#1F2430] mb-2" style={{ fontWeight: 800 }}>Зоны</h3>
        <div className="grid grid-cols-2 gap-2">
          {ZONES.map(z => (
            <button
              key={z.code}
              onClick={() => setSelectedZone(z)}
              className="bg-white rounded-xl p-3 flex items-center gap-2 shadow-sm active-press text-left"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] text-white"
                style={{ backgroundColor: z.color, fontWeight: 800 }}
              >
                {z.code}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] text-[#1F2430] truncate" style={{ fontWeight: 700 }}>
                  {z.name}
                </div>
                <div className="text-[10px] text-[#6B7280]" style={{ fontWeight: 500 }}>
                  {z.utilization}% заполнено
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Подробности зоны */}
      {selectedZone && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end animate-fade-in"
          onClick={() => setSelectedZone(null)}
        >
          <div
            className="w-full bg-white rounded-t-3xl p-5 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
          >
            <div className="flex justify-center pb-3">
              <div className="w-9 h-1 bg-[#DADADA] rounded-full" />
            </div>
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white"
                style={{ backgroundColor: selectedZone.color, fontWeight: 800 }}
              >
                {selectedZone.code}
              </div>
              <div>
                <div className="text-[18px] text-[#1F2430]" style={{ fontWeight: 900 }}>
                  {selectedZone.name}
                </div>
                <div className="text-[12px] text-[#6B7280]" style={{ fontWeight: 500 }}>
                  {selectedZone.description}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-3">
              <Cell label="Заполнено" value={`${selectedZone.utilization}%`} />
              <Cell label="Ячеек" value={state.bins.filter(b => b.zone === selectedZone.code).length.toString()} />
              <Cell label="Задач" value={tasksInZone(selectedZone.code).toString()} />
            </div>

            {/* Список ячеек */}
            <h4 className="text-[13px] text-[#6B7280] mb-2" style={{ fontWeight: 700 }}>Ячейки</h4>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {state.bins
                .filter(b => b.zone === selectedZone.code)
                .slice(0, 30)
                .map(b => (
                  <div key={b.id} className="bg-[#F9FAFB] rounded-lg px-2 py-1.5 flex items-center justify-between">
                    <span className="text-[10px] text-[#1F2430] font-mono" style={{ fontWeight: 700 }}>
                      {b.id.replace('WH01-' + selectedZone.code + '-', '')}
                    </span>
                    <span className="text-[10px] text-[#6B7280]" style={{ fontWeight: 600 }}>
                      {b.currentUnits}/{b.capacity}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#F9FAFB] rounded-xl p-2">
      <div className="text-[18px] text-[#1F2430]" style={{ fontWeight: 900 }}>{value}</div>
      <div className="text-[10px] text-[#6B7280]" style={{ fontWeight: 600 }}>{label}</div>
    </div>
  );
}
