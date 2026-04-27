import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
  Clock, Navigation, MapPin, Store, User, Warehouse, Package,
  TrendingUp, TrendingDown, CheckCircle2, AlertTriangle, X,
  ChevronRight, ChevronDown, Plus, PenLine as Edit3, Save, Timer,
  BarChart3, ArrowRight, Zap, Star, Coffee, Building2, Info,
  Download, Filter, Calendar, Minus,
} from 'lucide-react';
import { ChartWrapper } from '../../components/ui/ChartWrapper';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { toast } from 'sonner';
import type { Courier } from '../../data/couriers-mock';

// ─── Types ────────────────────────────────────────────────────────────────────

export type StopType = 'pickup' | 'pvz' | 'warehouse' | 'client' | 'café' | 'other';

export interface RouteStop {
  id: string;
  seq: number;
  type: StopType;
  name: string;
  address: string;
  arrivedAt: string;   // "HH:MM"
  departedAt: string;  // "HH:MM"
  dwellMin: number;    // actual minutes spent
  plannedDwellMin: number; // expected / norm
  enteredManually: boolean;
  note?: string;
}

export interface RouteTrip {
  id: string;
  orderId: string;
  orderNumber: string;
  date: string;          // "ДД.ММ.ГГГГ"
  dayLabel: string;
  startTime: string;     // "HH:MM"
  endTime: string;       // "HH:MM"
  status: 'completed' | 'cancelled' | 'problem';
  // Google ETA vs fact
  googleRouteMin: number;   // pure travel, no stops — Google estimate
  actualRouteMin: number;   // pure travel time (GPS fact)
  totalDurationMin: number; // door-to-door including all stops
  distanceKm: number;
  stops: RouteStop[];
  // Computed
  totalDwellMin: number;
  efficiencyPct: number;     // actualRoute / googleRoute × 100  (100=perfect, >100=slower)
  onTimePct: number;         // totalDuration vs (googleRoute + plannedDwell) × 100
  lateMin: number;           // how many minutes over the planned window
}

// ─── Mock generator ───────────────────────────────────────────────────────────

function mkRand(seed: number) {
  let s = (seed * 16807 + 1) % 2147483647;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

const STOP_PLACES: Record<StopType, string[]> = {
  pickup:    ['Кафе «Уют»', 'Burger King', 'KFC', 'Pizza House', 'Суши «Токио»', 'Poke House', 'Mama Roma', 'Starbucks'],
  pvz:       ['ПВЗ Тверская', 'ПВЗ Арбат', 'ПВЗ Митино', 'ПВЗ Люберцы', 'ПВЗ Сокольники'],
  warehouse: ['Склад Центральный', 'Склад Северный', 'Склад Южный'],
  client:    ['ул. Щепкина, 3', 'пр. Мира, 41', 'ул. Чехова, 8', 'ул. Фадеева, 12', 'ул. Грузинская, 5'],
  café:      ['Шаурма Pro', 'Кофейня «Утро»', 'Блинная у вокзала'],
  other:     ['Заправка', 'Парковка у склада', 'Ожидание клиента у подъезда'],
};

const PLANNED_DWELL: Record<StopType, number> = {
  pickup: 5, pvz: 4, warehouse: 8, client: 3, café: 0, other: 2,
};

const TYPE_LABEL: Record<StopType, string> = {
  pickup:    'Заведение',
  pvz:       'ПВЗ',
  warehouse: 'Склад',
  client:    'Клиент',
  café:      'Кафе/перерыв',
  other:     'Прочее',
};

const TYPE_COLOR: Record<StopType, { bg: string; text: string; icon: React.ElementType }> = {
  pickup:    { bg: 'bg-orange-50 border-orange-200',  text: 'text-orange-700', icon: Store },
  pvz:       { bg: 'bg-blue-50 border-blue-200',      text: 'text-blue-700',   icon: Package },
  warehouse: { bg: 'bg-teal-50 border-teal-200',      text: 'text-teal-700',   icon: Warehouse },
  client:    { bg: 'bg-green-50 border-green-200',    text: 'text-green-700',  icon: User },
  café:      { bg: 'bg-amber-50 border-amber-200',    text: 'text-amber-700',  icon: Coffee },
  other:     { bg: 'bg-gray-50 border-gray-200',      text: 'text-gray-600',   icon: MapPin },
};

function addMin(base: string, min: number): string {
  const [h, m] = base.split(':').map(Number);
  const total = h * 60 + m + min;
  const hh = String(Math.floor(total / 60) % 24).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

function diffMin(a: string, b: string): number {
  const [ah, am] = a.split(':').map(Number);
  const [bh, bm] = b.split(':').map(Number);
  return (bh * 60 + bm) - (ah * 60 + am);
}

export function generateTimeReport(courierId: string, isFast: boolean, count = 20): RouteTrip[] {
  const rnd = mkRand(courierId.charCodeAt(0) * 53 + 17);
  const trips: RouteTrip[] = [];

  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(rnd() * 14);
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const date = `${dd}.${mm}.${d.getFullYear()}`;
    const DAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const dayLabel = DAYS[d.getDay()];

    const h = 8 + Math.floor(rnd() * 12);
    const startTime = `${String(h).padStart(2, '0')}:${String(Math.floor(rnd() * 60)).padStart(2, '0')}`;

    const googleRouteMin = 8 + Math.floor(rnd() * 22); // 8–30 min Google ETA (pure travel)
    const distanceKm = +(1.5 + rnd() * 7.5).toFixed(1);

    // Actual route time vs Google
    const effBase = 0.85 + rnd() * 0.6;  // 0.85–1.45 multiplier
    const actualRouteMin = Math.round(googleRouteMin * effBase);
    const efficiencyPct = Math.round((actualRouteMin / googleRouteMin) * 100);

    // Generate stops
    const stopTypes: StopType[] = isFast
      ? (['pickup', 'client'] as StopType[])
      : ([rnd() > 0.4 ? 'warehouse' : 'pvz', rnd() > 0.6 ? 'pvz' : 'client'] as StopType[]);

    // Random extra stops
    if (rnd() > 0.75) stopTypes.splice(1, 0, 'café');
    if (rnd() > 0.85) stopTypes.push('other');

    let cursor = startTime;
    // First travel leg
    cursor = addMin(cursor, Math.round(actualRouteMin * 0.45));

    const stops: RouteStop[] = stopTypes.map((type, idx) => {
      const places = STOP_PLACES[type];
      const name = places[Math.floor(rnd() * places.length)];
      const addr = STOP_PLACES.client[Math.floor(rnd() * STOP_PLACES.client.length)];
      const arrivedAt = cursor;
      const planned = PLANNED_DWELL[type];
      const variance = -2 + Math.floor(rnd() * 12); // -2 to +10 extra min
      const dwellMin = Math.max(1, planned + variance);
      const departedAt = addMin(arrivedAt, dwellMin);
      cursor = addMin(departedAt, Math.round(actualRouteMin * (0.55 / stopTypes.length)));

      return {
        id: `stp-${courierId}-${i}-${idx}`,
        seq: idx + 1,
        type,
        name,
        address: addr,
        arrivedAt,
        departedAt,
        dwellMin,
        plannedDwellMin: planned,
        enteredManually: type === 'client' || type === 'café',
        note: type === 'client' && variance > 5 ? 'Долго открывали дверь' : type === 'café' ? 'Обеденный перерыв' : undefined,
      };
    });

    const totalDwellMin = stops.reduce((s, st) => s + st.dwellMin, 0);
    const totalDurationMin = actualRouteMin + totalDwellMin;
    const endTime = addMin(startTime, totalDurationMin);

    const plannedTotal = googleRouteMin + stops.reduce((s, st) => s + st.plannedDwellMin, 0);
    const lateMin = Math.max(0, totalDurationMin - plannedTotal);
    const onTimePct = Math.round((plannedTotal / totalDurationMin) * 100);

    const roll = rnd();
    const status = roll > 0.9 ? 'problem' : roll > 0.85 ? 'cancelled' : 'completed';

    trips.push({
      id: `trip-${courierId}-${i}`,
      orderId: `ord-${courierId}-${i}`,
      orderNumber: `ORD-2026-${String(10000 + i * 137 + courierId.charCodeAt(0)).slice(-5)}`,
      date,
      dayLabel,
      startTime,
      endTime,
      status,
      googleRouteMin,
      actualRouteMin,
      totalDurationMin,
      distanceKm,
      stops,
      totalDwellMin,
      efficiencyPct,
      onTimePct,
      lateMin,
    });
  }

  return trips.sort((a, b) => {
    const [ad, am, ay] = a.date.split('.').map(Number);
    const [bd, bm, by] = b.date.split('.').map(Number);
    return new Date(by, bm - 1, bd).getTime() - new Date(ay, am - 1, ad).getTime();
  });
}

// ─── Helper functions ─────────────────────────────────────────────────────────

function fmtDur(min: number): string {
  if (min < 60) return `${min} мин`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}ч ${m}м` : `${h}ч`;
}

function effColor(pct: number): string {
  if (pct <= 105) return 'text-green-600';
  if (pct <= 120) return 'text-yellow-600';
  return 'text-red-600';
}
function effBg(pct: number): string {
  if (pct <= 105) return 'bg-green-50 border-green-200';
  if (pct <= 120) return 'bg-yellow-50 border-yellow-200';
  return 'bg-red-50 border-red-200';
}
function effLabel(pct: number): string {
  if (pct <= 100) return '🏆 Опережает';
  if (pct <= 105) return '✅ В норме';
  if (pct <= 120) return '⚠️ Небольшая задержка';
  return '🔴 Значительная задержка';
}

// ─── Gantt-style timeline for one trip ───────────────────────────────────────

function TripTimeline({ trip }: { trip: RouteTrip }) {
  const totalMin = trip.totalDurationMin;
  if (totalMin === 0) return null;

  // Build segments: [travel, stop, travel, stop, ...]
  type Seg = { label: string; min: number; kind: 'travel' | StopType; note?: string };
  const segs: Seg[] = [];

  // Travel to first stop
  const firstStopArrival = trip.stops[0]?.arrivedAt ?? trip.endTime;
  const travelToFirst = diffMin(trip.startTime, firstStopArrival);
  if (travelToFirst > 0) segs.push({ label: 'Маршрут', min: travelToFirst, kind: 'travel' });

  trip.stops.forEach((stop, idx) => {
    segs.push({ label: stop.name, min: stop.dwellMin, kind: stop.type, note: stop.note });
    const nextArrival = trip.stops[idx + 1]?.arrivedAt ?? trip.endTime;
    const travelMin = diffMin(stop.departedAt, nextArrival);
    if (travelMin > 0) segs.push({ label: 'Маршрут', min: travelMin, kind: 'travel' });
  });

  const SEG_COLORS: Record<string, string> = {
    travel:    'bg-blue-400',
    pickup:    'bg-orange-400',
    pvz:       'bg-blue-600',
    warehouse: 'bg-teal-500',
    client:    'bg-green-500',
    café:      'bg-amber-400',
    other:     'bg-gray-400',
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1 h-8 rounded-xl overflow-hidden border border-gray-200">
        {segs.map((seg, i) => {
          const widthPct = (seg.min / totalMin) * 100;
          return (
            <div
              key={i}
              className={`h-full ${SEG_COLORS[seg.kind] ?? 'bg-gray-300'} flex items-center justify-center transition-all`}
              style={{ width: `${widthPct}%`, minWidth: seg.min > 1 ? '2px' : '0px' }}
              title={`${seg.label}: ${fmtDur(seg.min)}`}
            >
              {widthPct > 8 && (
                <span className="text-[9px] text-white font-bold truncate px-1">{fmtDur(seg.min)}</span>
              )}
            </div>
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {[...new Set(segs.map(s => s.kind))].map(kind => (
          <span key={kind} className="flex items-center gap-1 text-[10px] text-gray-500">
            <span className={`w-2.5 h-2.5 rounded-sm ${SEG_COLORS[kind] ?? 'bg-gray-300'}`} />
            {kind === 'travel' ? 'Движение' : TYPE_LABEL[kind as StopType] ?? kind}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Trip Detail Modal ────────────────────────────────────────────────────────

function TripDetailModal({ trip, onClose, onSaveStop }: {
  trip: RouteTrip;
  onClose: () => void;
  onSaveStop: (tripId: string, stopId: string, dwellMin: number, note: string) => void;
}) {
  const [editingStop, setEditingStop] = useState<string | null>(null);
  const [editDwell, setEditDwell] = useState(0);
  const [editNote, setEditNote] = useState('');

  function startEdit(stop: RouteStop) {
    setEditingStop(stop.id);
    setEditDwell(stop.dwellMin);
    setEditNote(stop.note ?? '');
  }

  function saveEdit(stop: RouteStop) {
    onSaveStop(trip.id, stop.id, editDwell, editNote);
    setEditingStop(null);
    toast.success('Время остановки обновлено', { description: stop.name });
  }

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b shrink-0 ${
          trip.status === 'completed' ? 'bg-green-50' : trip.status === 'problem' ? 'bg-red-50' : 'bg-gray-50'
        }`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900">{trip.orderNumber}</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  trip.status === 'completed' ? 'bg-green-100 text-green-700' :
                  trip.status === 'problem' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {trip.status === 'completed' ? 'Выполнен' : trip.status === 'problem' ? 'Проблема' : 'Отменён'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {trip.date} ({trip.dayLabel}) · {trip.startTime} → {trip.endTime} · {trip.distanceKm} км
              </p>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg shrink-0">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Timeline visual */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Временная шкала рейса</p>
            <TripTimeline trip={trip} />
          </div>

          {/* Time summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { l: 'Google ETA', v: fmtDur(trip.googleRouteMin), sub: 'расчётное движение', c: 'bg-gray-50 border-gray-200 text-gray-700' },
              { l: 'Фактич. движение', v: fmtDur(trip.actualRouteMin), sub: `${trip.efficiencyPct}% vs Google`, c: `${effBg(trip.efficiencyPct)} ${effColor(trip.efficiencyPct)}` },
              { l: 'Всего стоянки', v: fmtDur(trip.totalDwellMin), sub: `${trip.stops.length} остановок`, c: 'bg-amber-50 border-amber-200 text-amber-700' },
              { l: 'Весь рейс', v: fmtDur(trip.totalDurationMin), sub: trip.lateMin > 0 ? `+${trip.lateMin} мин сверх нормы` : 'В норме', c: trip.lateMin > 0 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700' },
            ].map(item => (
              <div key={item.l} className={`p-3 rounded-xl border text-center ${item.c}`}>
                <p className="text-lg font-black">{item.v}</p>
                <p className="text-[10px] font-semibold mt-0.5 opacity-70">{item.l}</p>
                <p className="text-[9px] opacity-50 mt-0.5">{item.sub}</p>
              </div>
            ))}
          </div>

          {/* Stops detail */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Остановки и задержки</p>
            <div className="space-y-2">
              {trip.stops.map((stop) => {
                const cfg = TYPE_COLOR[stop.type];
                const Icon = cfg.icon;
                const isLate = stop.dwellMin > stop.plannedDwellMin + 2;
                const isEditing = editingStop === stop.id;

                return (
                  <div key={stop.id} className={`p-3 rounded-xl border ${cfg.bg}`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${cfg.bg}`}>
                        <Icon className={`w-4 h-4 ${cfg.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{stop.name}</p>
                            <p className="text-[10px] text-gray-500">{stop.address}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${cfg.bg} ${cfg.text}`}>
                              {TYPE_LABEL[stop.type]}
                            </span>
                          </div>
                        </div>

                        {/* Times row */}
                        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-600">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {stop.arrivedAt} → {stop.departedAt}
                          </span>
                          <span className="text-gray-400">·</span>
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <button onClick={() => setEditDwell(Math.max(0, editDwell - 1))} className="w-5 h-5 bg-gray-200 rounded flex items-center justify-center hover:bg-gray-300">
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-10 text-center font-bold text-gray-800">{editDwell} мин</span>
                              <button onClick={() => setEditDwell(editDwell + 1)} className="w-5 h-5 bg-gray-200 rounded flex items-center justify-center hover:bg-gray-300">
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <span className={`font-semibold ${isLate ? 'text-red-600' : 'text-gray-700'}`}>
                              {fmtDur(stop.dwellMin)}
                              {isLate && ` (+${stop.dwellMin - stop.plannedDwellMin} мин)`}
                            </span>
                          )}
                          <span className="text-gray-400">норма: {stop.plannedDwellMin} мин</span>
                        </div>

                        {/* Edit mode */}
                        {isEditing && (
                          <div className="mt-2 space-y-2">
                            <input
                              value={editNote}
                              onChange={e => setEditNote(e.target.value)}
                              placeholder="Комментарий (необязательно)"
                              className="w-full text-xs px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEditingStop(null)}
                                className="flex-1 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
                              >Отмена</button>
                              <button
                                onClick={() => saveEdit(stop)}
                                className="flex-1 py-1.5 text-xs bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 flex items-center justify-center gap-1"
                              >
                                <Save className="w-3 h-3" />Сохранить
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Note */}
                        {!isEditing && stop.note && (
                          <p className="text-[10px] text-gray-500 mt-1 italic">💬 {stop.note}</p>
                        )}

                        {/* Manual entry badge */}
                        {stop.enteredManually && !isEditing && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] text-blue-600 mt-0.5">
                            <Edit3 className="w-2.5 h-2.5" />введено вручную
                          </span>
                        )}
                      </div>

                      {/* Edit button */}
                      {!isEditing && (
                        <button
                          onClick={() => startEdit(stop)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors shrink-0"
                          title="Редактировать время"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Manual Time Entry Modal (for new stop) ────────────────────────────────

function AddStopModal({ onClose, onAdd }: {
  onClose: () => void;
  onAdd: (stop: Omit<RouteStop, 'id' | 'seq'>) => void;
}) {
  const [type, setType] = useState<StopType>('client');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [arrivedAt, setArrivedAt] = useState('');
  const [departedAt, setDepartedAt] = useState('');
  const [note, setNote] = useState('');

  const dwellMin = arrivedAt && departedAt ? Math.max(0, diffMin(arrivedAt, departedAt)) : 0;

  function handleAdd() {
    if (!name || !arrivedAt || !departedAt) {
      toast.error('Заполните обязательные поля');
      return;
    }
    onAdd({
      type, name, address,
      arrivedAt, departedAt,
      dwellMin,
      plannedDwellMin: PLANNED_DWELL[type],
      enteredManually: true,
      note: note || undefined,
    });
    onClose();
  }

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b bg-blue-50">
          <div>
            <h3 className="font-bold text-gray-900">Добавить остановку вручную</h3>
            <p className="text-xs text-gray-500 mt-0.5">Курьер вводит фактическое время нахождения</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Type */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Тип остановки</label>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.entries(TYPE_LABEL) as [StopType, string][]).map(([k, l]) => {
                const cfg = TYPE_COLOR[k];
                const Icon = cfg.icon;
                return (
                  <button
                    key={k}
                    onClick={() => setType(k)}
                    className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl border text-[10px] font-semibold transition-all ${
                      type === k ? `${cfg.bg} ${cfg.text} ring-2 ring-offset-1 ring-blue-400` : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${type === k ? cfg.text : 'text-gray-400'}`} />
                    {l}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Name + Address */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Название *</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={STOP_PLACES[type][0]}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Адрес</label>
              <input
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="ул. Примерная, 1"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Прибыл *</label>
              <input
                type="time"
                value={arrivedAt}
                onChange={e => setArrivedAt(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Отбыл *</label>
              <input
                type="time"
                value={departedAt}
                onChange={e => setDepartedAt(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          {/* Computed dwell */}
          {dwellMin > 0 && (
            <div className={`flex items-center gap-2 p-2.5 rounded-xl border ${dwellMin > PLANNED_DWELL[type] + 2 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
              <Timer className={`w-4 h-4 shrink-0 ${dwellMin > PLANNED_DWELL[type] + 2 ? 'text-red-500' : 'text-green-600'}`} />
              <p className={`text-sm font-bold ${dwellMin > PLANNED_DWELL[type] + 2 ? 'text-red-700' : 'text-green-700'}`}>
                Время стоянки: {fmtDur(dwellMin)}
                {dwellMin > PLANNED_DWELL[type] + 2 && ` (+${dwellMin - PLANNED_DWELL[type]} мин сверх нормы)`}
              </p>
            </div>
          )}

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Причина задержки / Комментарий</label>
            <input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Необязательно"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50">Отмена</button>
            <button onClick={handleAdd} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 flex items-center justify-center gap-1.5">
              <Save className="w-4 h-4" />Сохранить
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Main Tab Component ───────────────────────────────────────────────────────

export function CourierTimeReportTab({ courier }: { courier: Courier }) {
  const isFast = courier.courier_type === 'fast_delivery';

  const [trips, setTrips] = useState<RouteTrip[]>(() =>
    generateTimeReport(courier.id, isFast, 20)
  );
  const [selectedTrip, setSelectedTrip] = useState<RouteTrip | null>(null);
  const [showAddStop, setShowAddStop] = useState(false);
  const [addStopTripId, setAddStopTripId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'problem'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'eff' | 'late'>('date');

  // ── Aggregate stats ───────────────────────────────────────────────────────

  const completed = trips.filter(t => t.status === 'completed');
  const avgEff = completed.length
    ? Math.round(completed.reduce((s, t) => s + t.efficiencyPct, 0) / completed.length)
    : 0;
  const avgDwell = completed.length
    ? Math.round(completed.reduce((s, t) => s + t.totalDwellMin, 0) / completed.length)
    : 0;
  const avgRoute = completed.length
    ? Math.round(completed.reduce((s, t) => s + t.actualRouteMin, 0) / completed.length)
    : 0;
  const avgTotal = completed.length
    ? Math.round(completed.reduce((s, t) => s + t.totalDurationMin, 0) / completed.length)
    : 0;
  const lateTrips = completed.filter(t => t.lateMin > 0).length;
  const lateRate = completed.length ? Math.round((lateTrips / completed.length) * 100) : 0;

  // Stop type breakdown
  const stopBreakdown = (Object.keys(TYPE_LABEL) as StopType[]).map(type => {
    const stops = trips.flatMap(t => t.stops.filter(s => s.type === type));
    const avgDwellForType = stops.length
      ? Math.round(stops.reduce((s, st) => s + st.dwellMin, 0) / stops.length)
      : 0;
    const overNorm = stops.filter(s => s.dwellMin > s.plannedDwellMin + 2).length;
    return { type, label: TYPE_LABEL[type], count: stops.length, avgDwellForType, overNorm };
  }).filter(s => s.count > 0);

  // Chart data (per day efficiency)
  const chartData = completed
    .reduce<{ date: string; eff: number; route: number; dwell: number; total: number; count: number }[]>((acc, t) => {
      const existing = acc.find(a => a.date === t.date.slice(0, 5));
      if (existing) {
        existing.eff = Math.round((existing.eff * existing.count + t.efficiencyPct) / (existing.count + 1));
        existing.route = Math.round((existing.route * existing.count + t.actualRouteMin) / (existing.count + 1));
        existing.dwell = Math.round((existing.dwell * existing.count + t.totalDwellMin) / (existing.count + 1));
        existing.total = Math.round((existing.total * existing.count + t.totalDurationMin) / (existing.count + 1));
        existing.count++;
      } else {
        acc.push({ date: t.date.slice(0, 5), eff: t.efficiencyPct, route: t.actualRouteMin, dwell: t.totalDwellMin, total: t.totalDurationMin, count: 1 });
      }
      return acc;
    }, [])
    .sort((a, b) => {
      const [ad, am] = a.date.split('.').map(Number);
      const [bd, bm] = b.date.split('.').map(Number);
      return am !== bm ? am - bm : ad - bd;
    })
    .slice(-10);

  // ── Mutations ─────────────────────────────────────────────────────────────

  function handleSaveStop(tripId: string, stopId: string, dwellMin: number, note: string) {
    setTrips(prev => prev.map(t => {
      if (t.id !== tripId) return t;
      const stops = t.stops.map(s =>
        s.id === stopId ? { ...s, dwellMin, note: note || undefined, enteredManually: true } : s
      );
      const totalDwellMin = stops.reduce((s, st) => s + st.dwellMin, 0);
      const totalDurationMin = t.actualRouteMin + totalDwellMin;
      const plannedTotal = t.googleRouteMin + stops.reduce((s, st) => s + st.plannedDwellMin, 0);
      const lateMin = Math.max(0, totalDurationMin - plannedTotal);
      return { ...t, stops, totalDwellMin, totalDurationMin, lateMin };
    }));
    // Update selected trip if open
    if (selectedTrip?.id === tripId) {
      setSelectedTrip(prev => {
        if (!prev) return null;
        const stops = prev.stops.map(s =>
          s.id === stopId ? { ...s, dwellMin, note: note || undefined, enteredManually: true } : s
        );
        const totalDwellMin = stops.reduce((s, st) => s + st.dwellMin, 0);
        const totalDurationMin = prev.actualRouteMin + totalDwellMin;
        const plannedTotal = prev.googleRouteMin + stops.reduce((s, st) => s + st.plannedDwellMin, 0);
        return { ...prev, stops, totalDwellMin, totalDurationMin, lateMin: Math.max(0, totalDurationMin - plannedTotal) };
      });
    }
  }

  function handleAddStop(tripId: string, stop: Omit<RouteStop, 'id' | 'seq'>) {
    setTrips(prev => prev.map(t => {
      if (t.id !== tripId) return t;
      const newStop: RouteStop = {
        ...stop,
        id: `stp-manual-${Date.now()}`,
        seq: t.stops.length + 1,
      };
      const stops = [...t.stops, newStop];
      const totalDwellMin = stops.reduce((s, st) => s + st.dwellMin, 0);
      const totalDurationMin = t.actualRouteMin + totalDwellMin;
      const plannedTotal = t.googleRouteMin + stops.reduce((s, st) => s + st.plannedDwellMin, 0);
      const lateMin = Math.max(0, totalDurationMin - plannedTotal);
      return { ...t, stops, totalDwellMin, totalDurationMin, lateMin };
    }));
    toast.success('Остановка добавлена', { description: stop.name });
  }

  // ── Sorted/filtered list ──────────────────────────────────────────────────

  const filtered = trips
    .filter(t => statusFilter === 'all' || t.status === statusFilter)
    .sort((a, b) => {
      if (sortBy === 'eff') return a.efficiencyPct - b.efficiencyPct;
      if (sortBy === 'late') return b.lateMin - a.lateMin;
      // default date (newest first — already sorted by generation)
      return 0;
    });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── KPI Summary row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'Эффективность маршрута',
            value: `${avgEff}%`,
            sub: avgEff <= 105 ? '✅ vs Google ETA' : `⚠️ +${avgEff - 100}% vs Google`,
            c: effBg(avgEff),
            tc: effColor(avgEff),
          },
          {
            label: 'Ср. время движения',
            value: fmtDur(avgRoute),
            sub: `Google ≈ ${Math.round(completed.reduce((s,t)=>s+t.googleRouteMin,0)/(completed.length||1))} мин`,
            c: 'bg-blue-50 border-blue-200',
            tc: 'text-blue-700',
          },
          {
            label: 'Ср. время стоянок',
            value: fmtDur(avgDwell),
            sub: `${stopBreakdown.length} типов остановок`,
            c: 'bg-amber-50 border-amber-200',
            tc: 'text-amber-700',
          },
          {
            label: 'Просрочки',
            value: `${lateRate}%`,
            sub: `${lateTrips} из ${completed.length} рейсов`,
            c: lateRate > 30 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200',
            tc: lateRate > 30 ? 'text-red-700' : 'text-green-700',
          },
        ].map(kpi => (
          <div key={kpi.label} className={`p-4 rounded-xl border ${kpi.c}`}>
            <p className={`text-2xl font-black ${kpi.tc}`}>{kpi.value}</p>
            <p className={`text-xs font-semibold mt-0.5 ${kpi.tc} opacity-80`}>{kpi.label}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Two-column: chart + stop breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Efficiency chart */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <p className="text-sm font-semibold text-gray-800">Эффективность по дням</p>
            <span className="text-[10px] text-gray-400 ml-auto">% от Google ETA (100% = идеально)</span>
          </div>
          <div className="p-4">
            <ChartWrapper height={180} className="rounded-lg overflow-hidden">
              {(w, h) => (
                <LineChart width={w} height={h} data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} domain={[80, 160]} />
                  <ReferenceLine y={100} stroke="#22c55e" strokeDasharray="4 4" label={{ value: 'Google', fontSize: 8, fill: '#22c55e' }} />
                  <ReferenceLine y={120} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Норма', fontSize: 8, fill: '#f59e0b' }} />
                  <Tooltip
                    formatter={(v: number) => [`${v}%`, 'Эффективность']}
                    contentStyle={{ fontSize: 11 }}
                  />
                  <Line type="monotone" dataKey="eff" stroke="#2563eb" strokeWidth={2} dot={{ r: 3, fill: '#2563eb' }} />
                </LineChart>
              )}
            </ChartWrapper>
          </div>
        </div>

        {/* Stop breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
            <MapPin className="w-4 h-4 text-amber-500" />
            <p className="text-sm font-semibold text-gray-800">Среднее время по типу остановки</p>
          </div>
          <div className="p-4">
            <ChartWrapper height={180} className="rounded-lg overflow-hidden">
              {(w, h) => (
                <BarChart
                  width={w} height={h}
                  data={stopBreakdown.map(s => ({ name: s.label, ср: s.avgDwellForType, норма: PLANNED_DWELL[s.type] }))}
                  margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 8 }} />
                  <YAxis tick={{ fontSize: 9 }} unit=" м" />
                  <Tooltip formatter={(v: number, name: string) => [`${v} мин`, name]} contentStyle={{ fontSize: 11 }} />
                  <Bar dataKey="норма" fill="#e5e7eb" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="ср" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                </BarChart>
              )}
            </ChartWrapper>
            <div className="flex items-center gap-4 justify-center mt-2">
              <span className="flex items-center gap-1 text-[10px] text-gray-500"><span className="w-2.5 h-2.5 bg-gray-200 rounded-sm" />Норматив</span>
              <span className="flex items-center gap-1 text-[10px] text-gray-500"><span className="w-2.5 h-2.5 bg-amber-400 rounded-sm" />Фактически</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stop type stats table ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
          <Timer className="w-4 h-4 text-purple-500" />
          <p className="text-sm font-semibold text-gray-800">Детализация по типам остановок</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Тип', 'Остановок', 'Ср. стоянка', 'Норматив', 'Превышений', 'Статус'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-gray-500 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stopBreakdown.map(s => {
                const cfg = TYPE_COLOR[s.type];
                const Icon = cfg.icon;
                const isOver = s.avgDwellForType > PLANNED_DWELL[s.type] + 2;
                const overPct = s.count > 0 ? Math.round((s.overNorm / s.count) * 100) : 0;
                return (
                  <tr key={s.type} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center border ${cfg.bg}`}>
                          <Icon className={`w-3 h-3 ${cfg.text}`} />
                        </div>
                        <span className="font-semibold text-gray-800">{s.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-medium">{s.count}</td>
                    <td className="px-4 py-3">
                      <span className={`font-bold ${isOver ? 'text-red-600' : 'text-green-600'}`}>
                        {fmtDur(s.avgDwellForType)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{fmtDur(PLANNED_DWELL[s.type])}</td>
                    <td className="px-4 py-3">
                      {s.overNorm > 0
                        ? <span className="text-red-600 font-semibold">{s.overNorm} ({overPct}%)</span>
                        : <span className="text-green-600">—</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        isOver ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'
                      }`}>
                        {isOver ? '⚠️ Превышение' : '✅ В норме'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Trip list ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 flex-wrap">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-blue-500" />
            <p className="text-sm font-semibold text-gray-800">Хронология рейсов</p>
          </div>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            {/* Status filter */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
              {([['all', 'Все'], ['completed', 'Выполненные'], ['problem', 'С проблемами']] as const).map(([v, l]) => (
                <button key={v} onClick={() => setStatusFilter(v)}
                  className={`px-3 py-1.5 font-medium transition-colors ${statusFilter === v ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                  {l}
                </button>
              ))}
            </div>
            {/* Sort */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as typeof sortBy)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="date">По дате</option>
              <option value="eff">По эффективности</option>
              <option value="late">По задержке</option>
            </select>
          </div>
        </div>

        <div className="divide-y divide-gray-50">
          {filtered.slice(0, 15).map(trip => {
            const eff = trip.efficiencyPct;
            return (
              <div
                key={trip.id}
                className="p-4 hover:bg-gray-50 transition-colors cursor-pointer group"
                onClick={() => setSelectedTrip(trip)}
              >
                <div className="flex items-start gap-3">
                  {/* Status dot */}
                  <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                    trip.status === 'completed' ? 'bg-green-500' :
                    trip.status === 'problem' ? 'bg-red-500' : 'bg-gray-400'
                  }`} />

                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Header row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-gray-900">{trip.orderNumber}</span>
                      <span className="text-xs text-gray-400">{trip.date} ({trip.dayLabel})</span>
                      <span className="text-xs text-gray-400">{trip.startTime} → {trip.endTime}</span>
                      <span className="text-xs text-gray-500 ml-auto">{trip.distanceKm} км</span>
                    </div>

                    {/* Timeline bar (compact) */}
                    <TripTimeline trip={trip} />

                    {/* Metrics row */}
                    <div className="flex items-center gap-4 flex-wrap">
                      {/* Google vs actual */}
                      <div className="flex items-center gap-1.5 text-xs">
                        <Navigation className="w-3 h-3 text-gray-400" />
                        <span className="text-gray-500">Google: {trip.googleRouteMin} мин</span>
                        <ArrowRight className="w-3 h-3 text-gray-300" />
                        <span className={`font-bold ${effColor(eff)}`}>{trip.actualRouteMin} мин ({eff}%)</span>
                      </div>

                      {/* Dwell */}
                      <div className="flex items-center gap-1.5 text-xs">
                        <MapPin className="w-3 h-3 text-amber-400" />
                        <span className="text-gray-500">Стоянки:</span>
                        <span className="font-medium text-amber-700">{fmtDur(trip.totalDwellMin)}</span>
                        <span className="text-gray-400">({trip.stops.length} ост.)</span>
                      </div>

                      {/* Late */}
                      {trip.lateMin > 0 && (
                        <div className="flex items-center gap-1 text-xs text-red-600">
                          <AlertTriangle className="w-3 h-3" />
                          <span className="font-semibold">+{trip.lateMin} мин просрочки</span>
                        </div>
                      )}

                      {/* Efficiency badge */}
                      <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full border ${effBg(eff)} ${effColor(eff)}`}>
                        {effLabel(eff)}
                      </span>
                    </div>

                    {/* Stops chips */}
                    <div className="flex flex-wrap gap-1">
                      {trip.stops.map(stop => {
                        const cfg = TYPE_COLOR[stop.type];
                        const Icon = cfg.icon;
                        const isLate = stop.dwellMin > stop.plannedDwellMin + 2;
                        return (
                          <span
                            key={stop.id}
                            className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-lg border ${cfg.bg} ${cfg.text} ${isLate ? 'ring-1 ring-red-400' : ''}`}
                            title={`${stop.name}: ${stop.dwellMin} мин (норма ${stop.plannedDwellMin} мин)`}
                          >
                            <Icon className="w-2.5 h-2.5" />
                            {stop.name.length > 12 ? stop.name.slice(0, 12) + '…' : stop.name}
                            · {stop.dwellMin} м
                            {isLate && <AlertTriangle className="w-2.5 h-2.5 text-red-500" />}
                            {stop.enteredManually && <Edit3 className="w-2.5 h-2.5 text-blue-400" />}
                          </span>
                        );
                      })}

                      {/* Add stop button */}
                      <button
                        onClick={e => { e.stopPropagation(); setAddStopTripId(trip.id); setShowAddStop(true); }}
                        className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-lg border border-dashed border-blue-300 text-blue-500 hover:bg-blue-50 transition-colors"
                      >
                        <Plus className="w-2.5 h-2.5" />добавить
                      </button>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 shrink-0 mt-1 transition-colors" />
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <Navigation className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-400">Рейсов не найдено</p>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {selectedTrip && (
        <TripDetailModal
          trip={selectedTrip}
          onClose={() => setSelectedTrip(null)}
          onSaveStop={handleSaveStop}
        />
      )}

      {showAddStop && addStopTripId && (
        <AddStopModal
          onClose={() => { setShowAddStop(false); setAddStopTripId(null); }}
          onAdd={stop => handleAddStop(addStopTripId, stop)}
        />
      )}
    </div>
  );
}
