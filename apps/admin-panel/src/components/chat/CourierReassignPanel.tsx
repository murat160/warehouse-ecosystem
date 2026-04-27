import React, { useState } from 'react';
import {
  Bike, Truck, Zap, User, Phone, Star, Activity,
  AlertTriangle, ArrowUpRight, CheckCircle2, XCircle,
  RefreshCw, UserCheck, Wifi, WifiOff, Package,
  ChevronRight, Navigation, Shield, LocateFixed,
  Clock, RotateCcw,
} from 'lucide-react';
import {
  COURIER_TRACKING, type CourierTracking,
} from '../../data/courier-tracking-mock';
import type { AgentRole } from '../../data/chat-mock';
import type { Order } from '../../data/orders-mock';

// ─── Role permissions ──────────────────────────────────────────────────────────

const CAN_REASSIGN: AgentRole[] = ['l2', 'lead', 'admin'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VEHICLE_LABELS: Record<CourierTracking['vehicleType'], string> = {
  bicycle: 'Велосипед', motorcycle: 'Мотоцикл', car: 'Автомобиль', foot: 'Пеший',
};

const VEHICLE_ICONS: Record<CourierTracking['vehicleType'], React.ElementType> = {
  bicycle: Bike, motorcycle: Zap, car: Truck, foot: User,
};

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface CourierReassignCallbacks {
  onReassign: (orderId: string, courierId: string, courierName: string, note: string) => void;
  onUnassign: (orderId: string, note: string) => void;
  onEscalateReassign: (orderId: string, reason: string) => void;
}

interface Props extends CourierReassignCallbacks {
  order: Order;
  /** effective courier id (may be overridden locally after reassign) */
  courierId: string | null;
  courierName: string | null;
  agentRole: AgentRole;
}

// ─── Sub-component: Courier info card ─────────────────────────────────────────

function CourierInfoCard({ tracking, compact = false }: { tracking: CourierTracking; compact?: boolean }) {
  const VIcon = VEHICLE_ICONS[tracking.vehicleType];
  const online = tracking.online;

  return (
    <div className={`border rounded-xl overflow-hidden ${online ? 'border-orange-200' : 'border-red-200 bg-red-50/20'}`}>
      {/* Header row */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 bg-white">
        <div className="relative shrink-0">
          <div className="w-9 h-9 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
            {tracking.avatar}
          </div>
          <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${online ? 'bg-green-500' : 'bg-red-500'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-xs font-bold text-gray-900">{tracking.courierName}</p>
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${online ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
              {online ? '● Онлайн' : '● Офлайн'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <VIcon className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-500">{VEHICLE_LABELS[tracking.vehicleType]}</span>
            {tracking.vehiclePlate && <span className="text-xs text-gray-400">· {tracking.vehiclePlate}</span>}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="flex items-center gap-0.5 justify-end">
            <Star className="w-3 h-3 text-yellow-500" />
            <span className="text-xs font-bold text-gray-700">{tracking.rating}</span>
          </div>
          <p className="text-xs text-gray-400">{tracking.activeOrders.length} зак.</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 border-t border-gray-100">
        {/* Speed */}
        <div className="flex flex-col items-center py-2 border-r border-gray-100">
          <Activity className="w-3 h-3 text-blue-500 mb-0.5" />
          <p className="text-xs font-bold text-gray-800">{tracking.speed.toFixed(0)} км/ч</p>
          <p className="text-xs text-gray-400">Скорость</p>
        </div>
        {/* Last seen */}
        <div className="flex flex-col items-center py-2 border-r border-gray-100">
          {online
            ? <Wifi className="w-3 h-3 text-green-500 mb-0.5" />
            : <WifiOff className="w-3 h-3 text-red-400 mb-0.5" />
          }
          <p className="text-xs font-bold text-gray-800">{tracking.lastSeen}</p>
          <p className="text-xs text-gray-400">Сеть</p>
        </div>
        {/* Phone */}
        <div className="flex flex-col items-center py-2">
          <Phone className="w-3 h-3 text-gray-400 mb-0.5" />
          <a
            href={`tel:${tracking.courierPhone}`}
            className="text-xs font-semibold text-blue-600 hover:underline truncate max-w-[70px]"
            title={tracking.courierPhone}
          >
            Позвонить
          </a>
          <p className="text-xs text-gray-400">Связь</p>
        </div>
      </div>

      {/* Location row */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-t border-gray-100">
        <LocateFixed className="w-3.5 h-3.5 text-blue-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500">
            <span className="font-mono">{tracking.location.lat.toFixed(5)}, {tracking.location.lng.toFixed(5)}</span>
            <span className="mx-1.5 text-gray-300">·</span>
            <span>±{tracking.accuracy}м</span>
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Navigation className="w-3 h-3 text-orange-400" style={{ transform: `rotate(${tracking.heading}deg)` }} />
          <span className="text-xs text-gray-500">{tracking.heading}°</span>
        </div>
      </div>

      {/* Battery */}
      {!compact && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-t border-gray-100 bg-white">
          <div className="flex items-center gap-1.5">
            <div className="relative w-5 h-2.5 border border-gray-400 rounded-sm p-px">
              <div
                className={`h-full rounded-sm ${tracking.battery > 50 ? 'bg-green-500' : tracking.battery > 20 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${tracking.battery}%` }}
              />
            </div>
            <span className={`text-xs font-medium ${tracking.battery > 50 ? 'text-green-700' : tracking.battery > 20 ? 'text-yellow-700' : 'text-red-700'}`}>
              {tracking.battery}%
            </span>
          </div>
          <span className="text-gray-200">|</span>
          <span className="text-xs text-gray-400">Доставлено: {tracking.deliveredToday} · Выручка: ₽{tracking.earningsToday.toLocaleString()}</span>
        </div>
      )}

      {/* Offline warning */}
      {!online && (
        <div className="flex items-start gap-2 px-3 py-2 bg-red-50 border-t border-red-200">
          <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs text-red-700">
            Курьер вне сети. Рекомендуется <span className="font-semibold">переназначить заказ</span>.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Sub-component: Available courier picker ──────────────────────────────────

function CourierPicker({
  currentCourierId,
  selected,
  onSelect,
}: {
  currentCourierId: string | null;
  selected: CourierTracking | null;
  onSelect: (c: CourierTracking) => void;
}) {
  const available = Object.values(COURIER_TRACKING).filter(
    c => c.courierId !== currentCourierId && c.activeOrders.length < 3,
  );

  if (available.length === 0) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-center">
        <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-xs font-medium text-gray-600">Нет доступных курьеров</p>
        <p className="text-xs text-gray-400 mt-0.5">Все курьеры офлайн или перегружены</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 max-h-52 overflow-y-auto pr-0.5">
      {available.map(c => {
        const VIcon = VEHICLE_ICONS[c.vehicleType];
        const isSelected = selected?.courierId === c.courierId;
        const loadColor = c.activeOrders.length === 0
          ? 'text-green-600 bg-green-50'
          : c.activeOrders.length === 1
            ? 'text-yellow-600 bg-yellow-50'
            : 'text-orange-600 bg-orange-50';

        return (
          <button
            key={c.courierId}
            onClick={() => onSelect(c)}
            className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl border-2 transition-all text-left ${
              isSelected
                ? 'border-blue-500 bg-blue-50 shadow-sm'
                : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50'
            }`}
          >
            <div className="relative shrink-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${c.online ? 'bg-orange-500' : 'bg-gray-400'}`}>
                {c.avatar}
              </div>
              <div className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-white ${c.online ? 'bg-green-500' : 'bg-gray-400'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-xs font-bold text-gray-900 truncate">{c.courierName}</p>
                {!c.online && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-1 py-0.5 rounded">офлайн</span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <VIcon className="w-3 h-3 text-gray-400 shrink-0" />
                <span className="text-xs text-gray-500">{VEHICLE_LABELS[c.vehicleType]}</span>
                <span className="text-gray-200">·</span>
                <div className="flex items-center gap-0.5">
                  <Star className="w-2.5 h-2.5 text-yellow-500" />
                  <span className="text-xs font-medium text-gray-600">{c.rating}</span>
                </div>
              </div>
            </div>
            <div className="shrink-0 flex flex-col items-end gap-1">
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${loadColor}`}>
                {c.activeOrders.length} зак.
              </span>
              <ChevronRight className={`w-4 h-4 transition-colors ${isSelected ? 'text-blue-500' : 'text-gray-300'}`} />
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function CourierReassignPanel({
  order,
  courierId,
  courierName,
  agentRole,
  onReassign,
  onUnassign,
  onEscalateReassign,
}: Props) {
  type Mode = 'idle' | 'unassign_confirm' | 'manual_list' | 'reassign_confirm';
  const [mode, setMode] = useState<Mode>('idle');
  const [selectedCourier, setSelectedCourier] = useState<CourierTracking | null>(null);
  const [escalateReason, setEscalateReason] = useState('');
  const [result, setResult] = useState<'unassigned' | 'reassigned' | null>(null);
  const [resultName, setResultName] = useState('');

  const canReassign = CAN_REASSIGN.includes(agentRole);
  const tracking = courierId ? (COURIER_TRACKING[courierId] ?? null) : null;

  // ── Result states ──
  if (result === 'unassigned') {
    return (
      <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
            <RotateCcw className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-green-800">Курьер откреплён</p>
            <p className="text-xs text-green-700 mt-0.5">Заказ передан на авто-диспетчеризацию. Система найдёт нового курьера.</p>
          </div>
        </div>
      </div>
    );
  }

  if (result === 'reassigned') {
    return (
      <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
            <UserCheck className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-green-800">Курьер переназначен</p>
            <p className="text-xs text-green-700 mt-0.5">{resultName} принял заказ {order.orderNumber}</p>
          </div>
        </div>
      </div>
    );
  }

  // ── No courier assigned yet ──
  if (!courierId) {
    return (
      <div className="flex items-center gap-2.5 p-3 bg-gray-50 border border-dashed border-gray-300 rounded-xl">
        <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
          <Bike className="w-4 h-4 text-gray-400" />
        </div>
        <div>
          <p className="text-xs font-medium text-gray-600">Курьер не назначен</p>
          <p className="text-xs text-gray-400 mt-0.5">Авто-диспетчер ищет свободного курьера</p>
        </div>
        <div className="ml-auto shrink-0">
          <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
            Поиск
          </div>
        </div>
      </div>
    );
  }

  // ── Tracking not found in COURIER_TRACKING (non-tracked courier) ──
  if (!tracking) {
    return (
      <div className="flex items-center gap-2.5 p-3 bg-gray-50 border border-gray-200 rounded-xl">
        <Bike className="w-4 h-4 text-gray-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-700">{courierName ?? 'Курьер назначен'}</p>
          <p className="text-xs text-gray-400 mt-0.5">Геолокация недоступна · ID: {courierId}</p>
        </div>
      </div>
    );
  }

  // ─── Handlers ──────────────────────────────────────────────────────────────

  function handleUnassign() {
    const note = `Курьер ${tracking!.courierName} откреплён от заказа ${order.orderNumber} службой поддержки. Авто-диспетч.`;
    onUnassign(order.id, note);
    setResult('unassigned');
    setMode('idle');
  }

  function handleReassign() {
    if (!selectedCourier) return;
    const note = `Заказ ${order.orderNumber} переназначен с ${tracking!.courierName} → ${selectedCourier.courierName}`;
    onReassign(order.id, selectedCourier.courierId, selectedCourier.courierName, note);
    setResultName(selectedCourier.courierName);
    setResult('reassigned');
    setMode('idle');
    setSelectedCourier(null);
  }

  function handleEscalate() {
    const reason = escalateReason.trim() || `Требуется переназначение курьера для заказа ${order.orderNumber}`;
    onEscalateReassign(order.id, reason);
    setEscalateReason('');
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">

      {/* Current courier card */}
      <CourierInfoCard tracking={tracking} />

      {/* ── Role-based action section ── */}
      {canReassign ? (
        <div className="space-y-2.5">

          {/* ── IDLE: Two main action buttons ── */}
          {mode === 'idle' && (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMode('unassign_confirm')}
                className="flex items-center justify-center gap-1.5 py-2.5 border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-xl text-xs font-semibold transition-colors"
              >
                <XCircle className="w-3.5 h-3.5 shrink-0" />Открепить
              </button>
              <button
                onClick={() => setMode('manual_list')}
                className="flex items-center justify-center gap-1.5 py-2.5 border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 shrink-0" />Переназначить
              </button>
            </div>
          )}

          {/* ── UNASSIGN CONFIRM ── */}
          {mode === 'unassign_confirm' && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-orange-800">Открепить курьера?</p>
                  <p className="text-xs text-orange-700 mt-1 leading-snug">
                    <span className="font-semibold">{tracking.courierName}</span> будет уведомлён об отмене назначения.
                    Заказ <span className="font-mono font-semibold">{order.orderNumber}</span> вернётся
                    в очередь авто-диспетчеризации.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setMode('idle')}
                  className="flex-1 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl text-xs font-medium transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleUnassign}
                  className="flex-1 flex items-center justify-center gap-1 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />Открепить
                </button>
              </div>
            </div>
          )}

          {/* ── MANUAL LIST: Courier picker ── */}
          {mode === 'manual_list' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                  Выберите нового курьера
                </p>
                <button
                  onClick={() => { setMode('idle'); setSelectedCourier(null); }}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Назад
                </button>
              </div>

              <CourierPicker
                currentCourierId={courierId}
                selected={selectedCourier}
                onSelect={setSelectedCourier}
              />

              <button
                onClick={() => selectedCourier && setMode('reassign_confirm')}
                disabled={!selectedCourier}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl text-xs font-bold transition-colors"
              >
                <UserCheck className="w-3.5 h-3.5" />
                {selectedCourier ? `Назначить — ${selectedCourier.courierName}` : 'Выберите курьера'}
              </button>
            </div>
          )}

          {/* ── REASSIGN CONFIRM ── */}
          {mode === 'reassign_confirm' && selectedCourier && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
              <p className="text-xs font-bold text-blue-800 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" />Подтвердите переназначение
              </p>

              {/* From → To */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 p-2 bg-white/80 border border-gray-200 rounded-xl">
                  <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {tracking.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500">Откреплять</p>
                    <p className="text-xs font-semibold text-gray-700">{tracking.courierName}</p>
                  </div>
                  <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                </div>
                <div className="flex items-center gap-2 p-2 bg-blue-100/60 border border-blue-200 rounded-xl">
                  <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {selectedCourier.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-blue-600">Назначать</p>
                    <p className="text-xs font-bold text-blue-900">{selectedCourier.courierName}</p>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Star className="w-3 h-3 text-yellow-500" />
                    <span className="text-xs font-semibold text-gray-600">{selectedCourier.rating}</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-blue-700 leading-snug">
                Оба курьера получат push-уведомление. Действие записывается в аудит-лог.
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => setMode('manual_list')}
                  className="flex-1 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl text-xs font-medium transition-colors"
                >
                  Назад
                </button>
                <button
                  onClick={handleReassign}
                  className="flex-1 flex items-center justify-center gap-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />Подтвердить
                </button>
              </div>
            </div>
          )}
        </div>

      ) : (
        /* ── L1 ESCALATE SECTION ── */
        <div className="space-y-2.5">
          <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl">
            <Shield className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 leading-snug">
              Роль <span className="font-semibold">L1</span> не имеет права переназначать курьеров.
              Используйте эскалацию — агент L2/Руководитель примет решение.
            </p>
          </div>
          <div className="space-y-1.5">
            <textarea
              value={escalateReason}
              onChange={e => setEscalateReason(e.target.value)}
              rows={2}
              placeholder={`Причина: курьер не отвечает / задерживает заказ ${order.orderNumber}...`}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none bg-white placeholder-gray-400"
            />
            <button
              onClick={handleEscalate}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-colors"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />Эскалировать переназначение
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
