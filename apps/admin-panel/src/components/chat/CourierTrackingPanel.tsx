import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin, Navigation, Bike, Truck, Zap, Clock, Package,
  Phone, Store, User, AlertTriangle, XCircle, CheckCircle2,
  ArrowUpRight, ChevronRight, RefreshCw, Info,
  Shield, Wifi, Activity, Timer, TrendingUp,
  Building2, Star, DollarSign, Hash,
  ChevronDown, ChevronUp, AlertCircle,
  ZoomIn, ZoomOut, Maximize2, X, Send, MessageSquare,
  LocateFixed, Layers, Eye,
} from 'lucide-react';
import {
  COURIER_TRACKING, geoToSvg, MAP_CENTER, MAP_SCALE,
  type CourierTracking, type CourierActiveOrder,
} from '../../data/courier-tracking-mock';
import type { AgentRole } from '../../data/chat-mock';

// ─── Permissions ──────────────────────────────────────────────────────────────

const CAN_CANCEL: AgentRole[] = ['l2', 'lead', 'admin'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VEHICLE_ICONS: Record<CourierTracking['vehicleType'], React.ElementType> = {
  bicycle: Bike, motorcycle: Zap, car: Truck, foot: User,
};
const VEHICLE_LABELS: Record<CourierTracking['vehicleType'], string> = {
  bicycle: 'Велосипед', motorcycle: 'Мотоцикл', car: 'Автомобиль', foot: 'Пеший',
};

const ORDER_STATUS_CFG = {
  picked_up: { label: 'Забрал',     color: 'text-blue-700',   bg: 'bg-blue-100',   dot: 'bg-blue-500' },
  en_route:  { label: 'В пути',     color: 'text-green-700',  bg: 'bg-green-100',  dot: 'bg-green-500' },
  arriving:  { label: 'Прибывает',  color: 'text-teal-700',   bg: 'bg-teal-100',   dot: 'bg-teal-500' },
  waiting:   { label: 'Ожидает',    color: 'text-yellow-700', bg: 'bg-yellow-100', dot: 'bg-yellow-500' },
  problem:   { label: 'Проблема ⚠', color: 'text-red-700',    bg: 'bg-red-100',    dot: 'bg-red-500' },
};

const MERCHANT_TYPE_ICONS: Record<CourierActiveOrder['merchant']['type'], React.ElementType> = {
  cafe: Store, restaurant: Building2, shop: Package, pharmacy: AlertCircle, pvz: MapPin,
};

// Quick messages for customer
const QUICK_MSG_CUSTOMER = [
  { id: 'q1', label: 'Курьер задерживается', text: 'Здравствуйте! Ваш курьер немного задерживается. Ориентировочное время прибытия — ещё %ETA% минут. Приносим извинения за ожидание.' },
  { id: 'q2', label: 'Курьер у двери', text: 'Ваш курьер уже у вашего адреса. Пожалуйста, спуститесь или откройте дверь.' },
  { id: 'q3', label: 'Позвоните курьеру', text: 'Пожалуйста, ответьте на звонок курьера или позвоните ему по номеру: %PHONE%.' },
  { id: 'q4', label: 'Заказ отменён', text: 'К сожалению, ваш заказ %ORDER% был отменён. Ожидайте возврат средств в течение 1-3 рабочих дней.' },
  { id: 'q5', label: 'Заказ доставлен', text: 'Ваш заказ %ORDER% успешно доставлен. Благодарим за использование нашего сервиса!' },
];

// ─── Battery component ────────────────────────────────────────────────────────

function BatteryBar({ pct }: { pct: number }) {
  const color = pct > 50 ? 'bg-green-500' : pct > 20 ? 'bg-yellow-500' : 'bg-red-500';
  const textColor = pct > 50 ? 'text-green-700' : pct > 20 ? 'text-yellow-700' : 'text-red-700';
  return (
    <div className="flex items-center gap-1.5">
      <div className="relative w-6 h-3 border border-gray-400 rounded-sm p-px">
        <div className={`h-full rounded-sm ${color} transition-all`} style={{ width: `${pct}%` }} />
        <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-2 bg-gray-400 rounded-r" />
      </div>
      <span className={`text-xs font-semibold ${textColor}`}>{pct}%</span>
    </div>
  );
}

// ─── City Map SVG (shared logic) ─────────────────────────────────────────────

interface MapProps {
  tracking: CourierTracking;
  width: number;
  height: number;
  zoom: number;
  showLabels?: boolean;
}

function MapSvg({ tracking, width, height, zoom, showLabels = true }: MapProps) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => (t + 1) % 99), 1000);
    return () => clearInterval(id);
  }, []);

  const scale = MAP_SCALE * zoom;

  const toSvg = (pt: { lat: number; lng: number }) =>
    geoToSvg(pt, MAP_CENTER, width, height, scale);

  const courierPt = toSvg(tracking.location);
  const heading = tracking.heading;

  // Route
  const routePoints = tracking.route.map(toSvg);
  const routeD = routePoints.length > 1
    ? `M ${routePoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')}`
    : '';

  // Order markers
  const orderMarkers = tracking.activeOrders.map((ord, i) => ({
    merchant: toSvg(ord.merchant),
    delivery: toSvg(ord.delivery),
    order: ord, i,
  }));

  // Street grid (adapt step by zoom)
  const gridLines: React.ReactNode[] = [];
  const step = 0.005;
  const range = 0.04 / zoom;
  for (let offset = -range; offset <= range; offset += step) {
    const x = toSvg({ lat: MAP_CENTER.lat, lng: MAP_CENTER.lng + offset }).x;
    if (x >= 0 && x <= width)
      gridLines.push(<line key={`v${offset.toFixed(4)}`} x1={x} y1={0} x2={x} y2={height}
        stroke="#e5e7eb" strokeWidth={Math.abs(offset) < 0.001 ? 2.5 : 1} />);
  }
  for (let offset = -range; offset <= range; offset += step) {
    const y = toSvg({ lat: MAP_CENTER.lat + offset, lng: MAP_CENTER.lng }).y;
    if (y >= 0 && y <= height)
      gridLines.push(<line key={`h${offset.toFixed(4)}`} x1={0} y1={y} x2={width} y2={y}
        stroke="#e5e7eb" strokeWidth={Math.abs(offset) < 0.001 ? 2.5 : 1} />);
  }

  // Diagonal avenues
  gridLines.push(
    <line key="d1" x1={0} y1={height * 0.25} x2={width} y2={height * 0.75}
      stroke="#e5e7eb" strokeWidth={1.5} />,
    <line key="d2" x1={0} y1={height * 0.75} x2={width} y2={height * 0.25}
      stroke="#f3f4f6" strokeWidth={1} />
  );

  // Building blocks
  const blocks: React.ReactNode[] = [];
  const blockColors = ['#f9fafb', '#f3f4f6', '#fafafa', '#f0f4f8'];
  for (let la = -range; la < range; la += step) {
    for (let lo = -range; lo < range; lo += step) {
      const tl = toSvg({ lat: MAP_CENTER.lat + la + step * 0.1, lng: MAP_CENTER.lng + lo + step * 0.1 });
      const br = toSvg({ lat: MAP_CENTER.lat + la + step * 0.9, lng: MAP_CENTER.lng + lo + step * 0.9 });
      if (tl.x > width || br.x < 0 || tl.y > height || br.y < 0) continue;
      const ci = Math.floor(Math.abs(la + lo) * 200) % blockColors.length;
      blocks.push(<rect key={`b${la.toFixed(4)}${lo.toFixed(4)}`}
        x={Math.min(tl.x, br.x)} y={Math.min(tl.y, br.y)}
        width={Math.abs(br.x - tl.x)} height={Math.abs(br.y - tl.y)}
        fill={blockColors[ci]} rx="1" />);
    }
  }

  const pulseR = 14 + (tick % 3) * 5;
  const pulseO = 0.55 - (tick % 3) * 0.18;

  const markerColors = ['#8b5cf6', '#f59e0b', '#10b981'];

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}
      className="w-full h-full" style={{ display: 'block' }}>
      <rect width={width} height={height} fill="#eef2f8" />
      {blocks}
      {gridLines}

      {/* Route */}
      {routeD && <g>
        <path d={routeD} fill="none" stroke="#3b82f6" strokeWidth={3.5}
          strokeDasharray="10 5" strokeLinecap="round" opacity={0.35} />
        <path d={routeD} fill="none" stroke="#93c5fd" strokeWidth={2}
          strokeLinecap="round" opacity={0.4} />
      </g>}

      {/* Order markers */}
      {orderMarkers.map(({ merchant, delivery, order, i }) => {
        const color = markerColors[i % markerColors.length];
        const MIcon = MERCHANT_TYPE_ICONS[order.merchant.type];
        const inView = (p: {x:number;y:number}) => p.x >= -20 && p.x <= width+20 && p.y >= -20 && p.y <= height+20;
        return (
          <g key={`ord_${i}`}>
            {(inView(merchant) || inView(delivery)) &&
              <line x1={merchant.x} y1={merchant.y} x2={delivery.x} y2={delivery.y}
                stroke={color} strokeWidth={1.5} strokeDasharray="5 4" opacity={0.25} />}

            {inView(merchant) && <g>
              <circle cx={merchant.x} cy={merchant.y} r={13} fill={color} opacity={0.12} />
              <circle cx={merchant.x} cy={merchant.y} r={8} fill={color} />
              <text x={merchant.x} y={merchant.y + 1} textAnchor="middle" dominantBaseline="middle"
                fill="white" fontSize="7" fontWeight="bold">M</text>
              {showLabels && zoom >= 1 && <g>
                <rect x={merchant.x + 10} y={merchant.y - 10}
                  width={Math.min(order.merchant.name.length * 5, 80)} height={15}
                  fill="white" rx="3" stroke={color} strokeWidth={0.7} opacity={0.95} />
                <text x={merchant.x + 13} y={merchant.y - 2} fill={color} fontSize="6.5" fontWeight="600">
                  {order.merchant.name.slice(0, 13)}
                </text>
              </g>}
            </g>}

            {inView(delivery) && <g>
              <circle cx={delivery.x} cy={delivery.y} r={11} fill="white" stroke={color} strokeWidth={2.5} />
              <text x={delivery.x} y={delivery.y + 1} textAnchor="middle" dominantBaseline="middle"
                fill={color} fontSize="8" fontWeight="bold">{i + 1}</text>
              {showLabels && zoom >= 1.5 && (
                <text x={delivery.x} y={delivery.y + 16} textAnchor="middle" fill={color}
                  fontSize="6" fontWeight="500">{order.delivery.address.split(',')[0]}</text>
              )}
            </g>}
          </g>
        );
      })}

      {/* Courier pulse */}
      <circle cx={courierPt.x} cy={courierPt.y} r={pulseR}
        fill="none" stroke={tracking.online ? '#3b82f6' : '#9ca3af'}
        strokeWidth={2} opacity={pulseO} />
      <circle cx={courierPt.x} cy={courierPt.y} r={10}
        fill={tracking.online ? '#3b82f6' : '#9ca3af'} opacity={0.15} />

      {/* Direction arrow */}
      {tracking.speed > 2 && (
        <g transform={`translate(${courierPt.x},${courierPt.y}) rotate(${heading})`}>
          <polygon points="0,-20 5,-10 0,-14 -5,-10"
            fill={tracking.online ? '#1d4ed8' : '#6b7280'} opacity={0.9} />
        </g>
      )}

      {/* Courier dot */}
      <circle cx={courierPt.x} cy={courierPt.y} r={9}
        fill={tracking.online ? '#2563eb' : '#9ca3af'} stroke="white" strokeWidth={3} />
      <circle cx={courierPt.x} cy={courierPt.y} r={3} fill="white" />

      {/* Speed pill */}
      {tracking.speed > 0 && (
        <g>
          <rect x={courierPt.x + 13} y={courierPt.y - 16} width={32} height={14} rx="4"
            fill={tracking.online ? '#1d4ed8' : '#6b7280'} />
          <text x={courierPt.x + 29} y={courierPt.y - 8} textAnchor="middle" fill="white"
            fontSize="7" fontWeight="bold">{tracking.speed.toFixed(0)}км/ч</text>
        </g>
      )}

      {/* Compass rose */}
      <g transform={`translate(${width - 26},${height - 26})`}>
        <circle r={14} fill="white" stroke="#d1d5db" strokeWidth={1} opacity={0.95} />
        <text x={0} y={-5} textAnchor="middle" fill="#ef4444" fontSize="7" fontWeight="bold">С</text>
        <text x={0} y={10} textAnchor="middle" fill="#6b7280" fontSize="6">Ю</text>
        <text x={-9} y={3} textAnchor="middle" fill="#6b7280" fontSize="6">З</text>
        <text x={9} y={3} textAnchor="middle" fill="#6b7280" fontSize="6">В</text>
      </g>

      {/* Scale bar */}
      <g transform={`translate(12, ${height - 16})`}>
        <line x1={0} y1={0} x2={44} y2={0} stroke="#9ca3af" strokeWidth={1.5} />
        <line x1={0} y1={-3} x2={0} y2={3} stroke="#9ca3af" strokeWidth={1.5} />
        <line x1={44} y1={-3} x2={44} y2={3} stroke="#9ca3af" strokeWidth={1.5} />
        <text x={22} y={-5} textAnchor="middle" fill="#6b7280" fontSize="6.5">
          ~{Math.round(200 / zoom)}м
        </text>
      </g>

      {/* Coords */}
      {showLabels && (
        <g transform={`translate(12, ${height - 32})`}>
          <rect x={0} y={0} width={110} height={12} rx="3" fill="white" opacity={0.7} />
          <text x={4} y={9} fill="#374151" fontSize="6" fontFamily="monospace">
            {tracking.location.lat.toFixed(5)}, {tracking.location.lng.toFixed(5)}
          </text>
        </g>
      )}
    </svg>
  );
}

// ─── Full-screen Map Modal ────────────────────────────────────────────────────

function FullscreenMapModal({
  tracking,
  zoom,
  onZoomIn,
  onZoomOut,
  onClose,
}: {
  tracking: CourierTracking;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 800, h: 520 });

  useEffect(() => {
    function measure() {
      if (containerRef.current) {
        const r = containerRef.current.getBoundingClientRect();
        setDims({ w: Math.floor(r.width), h: Math.floor(r.height) });
      }
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-gray-900/80">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
            {tracking.avatar}
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">{tracking.courierName}</p>
            <p className="text-xs text-gray-400">
              <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${tracking.online ? 'bg-green-500' : 'bg-gray-400'}`} />
              {tracking.online ? 'Онлайн · ' : 'Офлайн · '}{tracking.speed.toFixed(0)} км/ч · ±{tracking.accuracy}м
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 border border-gray-200 rounded-xl overflow-hidden">
            <button onClick={onZoomOut} disabled={zoom <= 0.5}
              className="px-3 py-1.5 hover:bg-gray-50 disabled:opacity-30 text-gray-700 transition-colors border-r border-gray-200">
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="px-3 py-1.5 text-sm font-mono text-gray-600 min-w-[3rem] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button onClick={onZoomIn} disabled={zoom >= 4}
              className="px-3 py-1.5 hover:bg-gray-50 disabled:opacity-30 text-gray-700 transition-colors border-l border-gray-200">
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
          <button onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-700 text-sm font-medium">
            <X className="w-4 h-4" />Закрыть
          </button>
        </div>
      </div>

      {/* Map fills remainder */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        {dims.w > 0 && dims.h > 0 && (
          <MapSvg tracking={tracking} width={dims.w} height={dims.h} zoom={zoom} showLabels={true} />
        )}

        {/* Live badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 bg-white/95 rounded-xl border border-gray-200 shadow-lg">
          <div className={`w-2 h-2 rounded-full ${tracking.online ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          <span className="text-sm font-semibold text-gray-800">{tracking.online ? 'LIVE' : 'OFFLINE'}</span>
        </div>

        {/* Order legend */}
        {tracking.activeOrders.length > 0 && (
          <div className="absolute top-3 right-3 bg-white/95 rounded-xl border border-gray-200 shadow-lg p-3 max-w-xs">
            <p className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Активные заказы</p>
            {tracking.activeOrders.map((ord, i) => {
              const colors = ['text-purple-600', 'text-amber-600', 'text-emerald-600'];
              const bgColors = ['bg-purple-100', 'bg-amber-100', 'bg-emerald-100'];
              const MIcon = MERCHANT_TYPE_ICONS[ord.merchant.type];
              const cfg = ORDER_STATUS_CFG[ord.status];
              return (
                <div key={ord.orderId} className="flex items-start gap-2.5 py-2 border-b border-gray-100 last:border-0">
                  <div className={`w-6 h-6 rounded-full ${bgColors[i % 3]} flex items-center justify-center shrink-0`}>
                    <span className={`text-xs font-bold ${colors[i % 3]}`}>{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-800 font-mono">{ord.orderNumber}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <MIcon className={`w-3 h-3 ${colors[i % 3]}`} />
                      <p className="text-xs text-gray-600 truncate">{ord.merchant.name}</p>
                    </div>
                    <p className="text-xs text-gray-400 truncate">{ord.delivery.address.split(',')[0]}</p>
                    <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full mt-0.5 ${cfg.bg} ${cfg.color}`}>
                      <span className={`w-1 h-1 rounded-full ${cfg.dot}`} />{cfg.label}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-gray-800">{ord.etaMinutes} мин</p>
                    <p className="text-xs text-gray-400">{ord.distanceLeft} км</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Speed & direction overlay */}
        <div className="absolute bottom-4 left-3 flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-2 bg-white/95 rounded-xl border border-gray-200 shadow">
            <Navigation className="w-4 h-4 text-blue-500" style={{ transform: `rotate(${tracking.heading}deg)` }} />
            <span className="text-sm font-bold text-gray-800">{tracking.speed.toFixed(0)} км/ч</span>
            <span className="text-gray-300">|</span>
            <span className="text-xs text-gray-500">{tracking.heading}°</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-2 bg-white/95 rounded-xl border border-gray-200 shadow">
            <Wifi className={`w-4 h-4 ${tracking.accuracy < 10 ? 'text-green-500' : 'text-yellow-500'}`} />
            <span className="text-xs text-gray-600">±{tracking.accuracy}м</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Customer Message Composer ────────────────────────────────────────────────

function CustomerMessageComposer({
  order,
  onSend,
  onClose,
}: {
  order: CourierActiveOrder;
  onSend: (to: string, text: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);

  function handleQuick(template: string) {
    const filled = template
      .replace('%ETA%', order.etaMinutes.toString())
      .replace('%PHONE%', order.merchant.phone)
      .replace('%ORDER%', order.orderNumber);
    setText(filled);
  }

  function handleSend() {
    if (!text.trim()) return;
    onSend(order.delivery.customerName, text.trim());
    setSent(true);
    setTimeout(() => { setSent(false); setText(''); onClose(); }, 1200);
  }

  return (
    <div className="border border-blue-200 bg-blue-50 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-blue-100 border-b border-blue-200">
        <MessageSquare className="w-3.5 h-3.5 text-blue-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-blue-900">Сообщение клиенту</p>
          <p className="text-xs text-blue-600 truncate">{order.delivery.customerName} · {order.delivery.customerPhone}</p>
        </div>
        <button onClick={onClose} className="p-0.5 hover:bg-blue-200 rounded">
          <X className="w-3.5 h-3.5 text-blue-500" />
        </button>
      </div>

      {/* Quick templates */}
      <div className="px-3 py-2 border-b border-blue-200">
        <p className="text-xs text-blue-600 mb-1.5 font-medium">Быстрые шаблоны:</p>
        <div className="flex flex-wrap gap-1">
          {QUICK_MSG_CUSTOMER.map(q => (
            <button key={q.id} onClick={() => handleQuick(q.text)}
              className="text-xs px-2 py-1 bg-white border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors">
              {q.label}
            </button>
          ))}
        </div>
      </div>

      {/* Textarea */}
      <div className="p-3 space-y-2">
        <textarea value={text} onChange={e => setText(e.target.value)} rows={3}
          placeholder="Напишите сообщение клиенту..."
          className="w-full px-3 py-2 border border-blue-200 rounded-xl bg-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
        <div className="flex items-center gap-2">
          <button onClick={onClose}
            className="flex-1 py-2 border border-gray-200 bg-white text-gray-600 rounded-xl text-xs font-medium hover:bg-gray-50">
            Отмена
          </button>
          <button onClick={handleSend} disabled={!text.trim() || sent}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 text-white rounded-xl text-xs font-bold transition-colors">
            {sent ? <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" />Отправлено!</span>
                   : <span className="flex items-center gap-1.5"><Send className="w-3.5 h-3.5" />Отправить</span>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Order Card ────────────────────────────────────────────────────────────────

function OrderCard({
  order, index, agentRole, onCancel, onEscalateCancel, onSendToCustomer,
}: {
  order: CourierActiveOrder;
  index: number;
  agentRole: AgentRole;
  onCancel: (order: CourierActiveOrder) => void;
  onEscalateCancel: (order: CourierActiveOrder) => void;
  onSendToCustomer: (customerName: string, text: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showMessageComposer, setShowMessageComposer] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const cfg = ORDER_STATUS_CFG[order.status];
  const canCancel = CAN_CANCEL.includes(agentRole);
  const MIcon = MERCHANT_TYPE_ICONS[order.merchant.type];
  const borderColors = ['border-l-blue-500', 'border-l-purple-500', 'border-l-amber-500'];
  const numColors = ['bg-blue-500', 'bg-purple-500', 'bg-amber-500'];

  return (
    <div className={`border border-gray-200 rounded-xl overflow-hidden border-l-4 ${borderColors[index % 3]}`}>
      {/* Collapse header */}
      <button onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-white hover:bg-gray-50 transition-colors text-left">
        <div className={`w-5 h-5 rounded-full ${numColors[index % 3]} flex items-center justify-center shrink-0 text-white text-xs font-bold`}>
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-800 font-mono">{order.orderNumber}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.color}`}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${cfg.dot} mr-1`} />{cfg.label}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <MIcon className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-500 truncate">{order.merchant.name}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {order.isOverdue && (
            <span className="flex items-center gap-0.5 text-xs text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full border border-red-200">
              <AlertTriangle className="w-3 h-3" />SLA
            </span>
          )}
          <span className="text-xs font-semibold text-gray-600">{order.etaMinutes} мин</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2.5 bg-gray-50/50">
          {/* Merchant block */}
          <div className="flex items-start gap-2 p-2.5 bg-purple-50 border border-purple-200 rounded-xl">
            <div className="w-7 h-7 bg-purple-500 rounded-lg flex items-center justify-center shrink-0">
              <MIcon className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-xs font-bold text-purple-900">{order.merchant.name}</p>
                <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded capitalize">{order.merchant.type}</span>
              </div>
              <p className="text-xs text-purple-700 mt-0.5 truncate">{order.merchant.address}</p>
              <a href={`tel:${order.merchant.phone}`}
                className="flex items-center gap-1 text-xs text-purple-600 mt-0.5 hover:text-purple-800">
                <Phone className="w-3 h-3" />{order.merchant.phone}
              </a>
            </div>
          </div>

          {/* Customer block */}
          <div className="flex items-start gap-2 p-2.5 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-blue-900">{order.delivery.customerName}</p>
              <p className="text-xs text-blue-700 mt-0.5 leading-snug">
                {order.delivery.address}
                {order.delivery.floor && ` · эт. ${order.delivery.floor}`}
              </p>
              <a href={`tel:${order.delivery.customerPhone}`}
                className="flex items-center gap-1 text-xs text-blue-600 mt-0.5 hover:text-blue-800">
                <Phone className="w-3 h-3" />{order.delivery.customerPhone}
              </a>
              {order.delivery.comment && (
                <p className="text-xs text-blue-400 italic mt-0.5">«{order.delivery.comment}»</p>
              )}
            </div>
            {/* Quick call/msg */}
            <button onClick={() => setShowMessageComposer(p => !p)}
              title="Написать клиенту"
              className={`p-1.5 rounded-lg transition-colors shrink-0 ${showMessageComposer ? 'bg-blue-200 text-blue-700' : 'bg-white border border-blue-200 text-blue-500 hover:bg-blue-100'}`}>
              <MessageSquare className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Customer message composer */}
          {showMessageComposer && (
            <CustomerMessageComposer
              order={order}
              onSend={onSendToCustomer}
              onClose={() => setShowMessageComposer(false)}
            />
          )}

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { label: 'Сумма',   value: `₽${order.total.toLocaleString()}`, icon: DollarSign },
              { label: 'Товаров', value: `${order.itemsCount} шт·${order.weight}кг`, icon: Package },
              { label: 'До SLA',  value: order.slaDeadline.split(' ')[1] ?? order.slaDeadline, icon: Timer },
            ].map(d => {
              const Icon = d.icon;
              return (
                <div key={d.label} className="p-2 bg-white border border-gray-200 rounded-xl text-center">
                  <Icon className="w-3.5 h-3.5 text-gray-400 mx-auto mb-0.5" />
                  <p className="text-xs font-bold text-gray-800 truncate">{d.value}</p>
                  <p className="text-xs text-gray-400">{d.label}</p>
                </div>
              );
            })}
          </div>

          {/* Route metrics */}
          <div className="flex items-center gap-3 text-xs text-gray-600 px-3 py-2 bg-white border border-gray-200 rounded-xl">
            <Navigation className="w-3.5 h-3.5 text-green-500 shrink-0" />
            <span>Осталось <span className="font-bold text-gray-800">{order.distanceLeft} км</span></span>
            <span className="text-gray-200">|</span>
            <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span>ETA <span className="font-bold text-gray-800">{order.etaMinutes} мин</span></span>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500 px-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            Забрал в <span className="font-medium">{order.pickupTime}</span>
            <span className="ml-auto text-gray-400">{order.paymentMethod}</span>
          </div>

          {/* Cancel / escalate */}
          {!showCancelConfirm ? (
            <div className="flex gap-2">
              {canCancel ? (
                <button onClick={() => setShowCancelConfirm(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-50 border border-red-200 hover:bg-red-100 text-red-700 rounded-xl text-xs font-semibold transition-colors">
                  <XCircle className="w-3.5 h-3.5" />Отменить заказ
                </button>
              ) : (
                <button onClick={() => onEscalateCancel(order)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-orange-50 border border-orange-200 hover:bg-orange-100 text-orange-700 rounded-xl text-xs font-semibold transition-colors">
                  <ArrowUpRight className="w-3.5 h-3.5" />Эскалировать для отмены
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2 p-3 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <p className="text-xs font-bold text-red-800">Подтвердите отмену</p>
              </div>
              <p className="text-xs text-red-700 font-mono">{order.orderNumber} · {order.merchant.name}</p>
              <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} rows={2}
                placeholder="Обязательно укажите причину отмены..."
                className="w-full px-2.5 py-2 text-xs border border-red-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 resize-none bg-white" />
              <div className="flex gap-2">
                <button onClick={() => { setShowCancelConfirm(false); setCancelReason(''); }}
                  className="flex-1 py-1.5 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-medium">
                  Назад
                </button>
                <button
                  onClick={() => { if (cancelReason.trim()) { onCancel(order); setShowCancelConfirm(false); setCancelReason(''); } }}
                  disabled={!cancelReason.trim()}
                  className="flex-1 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-200 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors">
                  <XCircle className="w-3.5 h-3.5" />Отменить
                </button>
              </div>
            </div>
          )}

          {!canCancel && (
            <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl">
              <Shield className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                Ваша роль <span className="font-semibold">(L1)</span> не может отменять заказы.
                «Эскалировать» — передаст чат агенту L2/Руководителю с правом отмены.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Courier Tracking Panel ─────────────────────────────────────────────

interface CourierTrackingPanelProps {
  courierId: string;
  agentRole: AgentRole;
  onCancelOrder: (order: CourierActiveOrder, reason: string) => void;
  onEscalateForCancel: (order: CourierActiveOrder) => void;
  onSendToCustomer?: (customerName: string, text: string) => void;
}

export function CourierTrackingPanel({
  courierId, agentRole, onCancelOrder, onEscalateForCancel, onSendToCustomer,
}: CourierTrackingPanelProps) {
  const [tracking, setTracking] = useState<CourierTracking | null>(
    COURIER_TRACKING[courierId] ?? null
  );
  const [tab, setTab] = useState<'map' | 'orders' | 'info'>('map');
  const [zoom, setZoom] = useState(1);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapDims, setMapDims] = useState({ w: 300, h: 190 });

  useEffect(() => {
    function measure() {
      if (mapContainerRef.current) {
        const r = mapContainerRef.current.getBoundingClientRect();
        if (r.width > 0 && r.height > 0)
          setMapDims({ w: Math.floor(r.width), h: Math.floor(r.height) });
      }
    }
    measure();
    const ro = new ResizeObserver(measure);
    if (mapContainerRef.current) ro.observe(mapContainerRef.current);
    return () => ro.disconnect();
  }, [tab]);

  // Simulate live tracking
  useEffect(() => {
    if (!tracking?.online) return;
    const id = setInterval(() => {
      setTracking(prev => {
        if (!prev) return prev;
        const jitter = () => (Math.random() - 0.5) * 0.00018;
        return {
          ...prev,
          location: { lat: prev.location.lat + jitter(), lng: prev.location.lng + jitter() },
          speed: Math.max(0, Math.min(60, prev.speed + (Math.random() - 0.5) * 3)),
          lastSeen: new Date().toLocaleTimeString('ru-RU'),
        };
      });
    }, 3500);
    return () => clearInterval(id);
  }, [tracking?.online]);

  if (!tracking) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center text-gray-400 p-4">
        <Bike className="w-10 h-10 mb-2 opacity-30" />
        <p className="text-sm">Данные курьера не найдены</p>
        <p className="text-xs mt-1 opacity-60 font-mono">ID: {courierId}</p>
      </div>
    );
  }

  const VIcon = VEHICLE_ICONS[tracking.vehicleType];
  const canCancel = CAN_CANCEL.includes(agentRole);

  function handleCancel(order: CourierActiveOrder) {
    onCancelOrder(order, 'Отменено службой поддержки');
    setTracking(prev => prev ? {
      ...prev, activeOrders: prev.activeOrders.filter(o => o.orderId !== order.orderId),
    } : prev);
  }

  function handleSendToCustomer(customerName: string, text: string) {
    onSendToCustomer?.(customerName, text);
  }

  const zoomStep = 0.5;
  const doZoomIn  = () => setZoom(z => Math.min(4, parseFloat((z + zoomStep).toFixed(1))));
  const doZoomOut = () => setZoom(z => Math.max(0.5, parseFloat((z - zoomStep).toFixed(1))));

  return (
    <div style={{ display: 'contents' }}>
      <div className="flex flex-col h-full overflow-hidden">
        {/* ── Courier header ── */}
        <div className="px-3 py-3 bg-white border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="relative shrink-0">
              <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                {tracking.avatar}
              </div>
              <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${tracking.online ? 'bg-green-500' : 'bg-gray-400'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-sm font-bold text-gray-900">{tracking.courierName}</p>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${tracking.online ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {tracking.online ? '● Онлайн' : '○ Офлайн'}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <VIcon className="w-3 h-3 text-orange-500" />
                  {VEHICLE_LABELS[tracking.vehicleType]}
                  {tracking.vehiclePlate && ` · ${tracking.vehiclePlate}`}
                </span>
                <BatteryBar pct={tracking.battery} />
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="flex items-center gap-1 justify-end">
                <Star className="w-3 h-3 text-yellow-500" />
                <span className="text-xs font-bold text-gray-800">{tracking.rating}</span>
              </div>
              <p className="text-xs text-gray-400">{tracking.deliveredToday} сег.</p>
            </div>
          </div>
          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-1.5 mt-2.5">
            {[
              { label: 'Скорость',  value: `${tracking.speed.toFixed(0)} км/ч`, color: 'text-blue-600',   icon: Activity },
              { label: 'Заработок', value: `₽${tracking.earningsToday.toLocaleString()}`, color: 'text-green-600', icon: TrendingUp },
              { label: 'Активных',  value: `${tracking.activeOrders.length} зак.`, color: 'text-orange-600', icon: Package },
            ].map(s => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="flex items-center gap-1.5 p-2 bg-gray-50 rounded-lg border border-gray-200">
                  <Icon className={`w-3.5 h-3.5 ${s.color} shrink-0`} />
                  <div className="min-w-0">
                    <p className={`text-xs font-bold ${s.color} truncate`}>{s.value}</p>
                    <p className="text-xs text-gray-400">{s.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-gray-200 bg-white shrink-0 px-3">
          {[
            { id: 'map',    label: 'Карта',                         icon: MapPin },
            { id: 'orders', label: `Заказы (${tracking.activeOrders.length})`, icon: Package },
            { id: 'info',   label: 'Инфо',                          icon: Info },
          ].map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
                className={`flex items-center gap-1.5 py-2.5 px-3 text-xs font-medium border-b-2 transition-colors ${
                  tab === t.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>
                <Icon className="w-3.5 h-3.5" />{t.label}
              </button>
            );
          })}
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto">

          {/* ── MAP TAB ── */}
          {tab === 'map' && (
            <div className="p-3 space-y-2.5">
              {/* Map container */}
              <div className="relative">
                <div ref={mapContainerRef} className="rounded-xl overflow-hidden border border-gray-200" style={{ height: 195 }}>
                  <MapSvg tracking={tracking} width={mapDims.w} height={195} zoom={zoom} showLabels={zoom > 0.7} />
                </div>

                {/* LIVE badge */}
                <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 bg-white/90 rounded-full border border-gray-200 shadow-sm">
                  <div className={`w-1.5 h-1.5 rounded-full ${tracking.online ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                  <span className="text-xs font-bold text-gray-700">{tracking.online ? 'LIVE' : 'OFF'}</span>
                </div>

                {/* Zoom controls */}
                <div className="absolute top-2 right-2 flex flex-col gap-0.5">
                  <button onClick={doZoomIn} disabled={zoom >= 4}
                    className="w-7 h-7 bg-white border border-gray-200 rounded-t-lg flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 shadow-sm">
                    <ZoomIn className="w-3.5 h-3.5 text-gray-700" />
                  </button>
                  <button onClick={doZoomOut} disabled={zoom <= 0.5}
                    className="w-7 h-7 bg-white border border-gray-200 rounded-b-lg flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 shadow-sm border-t-0">
                    <ZoomOut className="w-3.5 h-3.5 text-gray-700" />
                  </button>
                </div>

                {/* Fullscreen button */}
                <button onClick={() => setShowFullscreen(true)}
                  className="absolute bottom-2 right-2 w-7 h-7 bg-white border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-50 shadow-sm">
                  <Maximize2 className="w-3.5 h-3.5 text-gray-600" />
                </button>

                {/* Zoom level indicator */}
                <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-white/80 rounded text-xs text-gray-500 border border-gray-200">
                  ×{zoom.toFixed(1)}
                </div>
              </div>

              {/* Coordinates & direction */}
              <div className="grid grid-cols-2 gap-1.5">
                <div className="flex items-center gap-1.5 px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-xl">
                  <LocateFixed className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-gray-700 truncate">{tracking.location.lat.toFixed(4)}, {tracking.location.lng.toFixed(4)}</p>
                    <p className="text-xs text-gray-400">±{tracking.accuracy}м GPS</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-xl">
                  <Navigation className="w-3.5 h-3.5 text-green-500 shrink-0"
                    style={{ transform: `rotate(${tracking.heading}deg)` }} />
                  <div>
                    <p className="text-xs font-semibold text-gray-700">{tracking.speed.toFixed(0)} км/ч</p>
                    <p className="text-xs text-gray-400">{tracking.heading}° · смена {tracking.shiftStart}</p>
                  </div>
                </div>
              </div>

              {/* Route legend */}
              {tracking.activeOrders.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-1.5">Точки маршрута:</p>
                  {tracking.activeOrders.map((ord, i) => {
                    const colors = ['text-purple-600', 'text-amber-600', 'text-emerald-600'];
                    const MIcon = MERCHANT_TYPE_ICONS[ord.merchant.type];
                    return (
                      <div key={ord.orderId} className="flex items-center gap-2 py-1.5 border-b border-gray-100 last:border-0">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                          i===0 ? 'bg-purple-100' : i===1 ? 'bg-amber-100' : 'bg-emerald-100'
                        }`}>
                          <span className={`text-xs font-bold ${colors[i % 3]}`}>{i + 1}</span>
                        </div>
                        <MIcon className={`w-3 h-3 ${colors[i % 3]} shrink-0`} />
                        <span className={`text-xs font-medium ${colors[i % 3]} truncate`}>{ord.merchant.name}</span>
                        <ChevronRight className="w-3 h-3 text-gray-300 shrink-0" />
                        <span className="text-xs text-gray-400 truncate">{ord.delivery.address.split(',')[0]}</span>
                        <span className="ml-auto shrink-0 text-xs font-medium text-gray-600">{ord.etaMinutes}м</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── ORDERS TAB ── */}
          {tab === 'orders' && (
            <div className="p-3 space-y-3">
              {tracking.activeOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
                  <Package className="w-10 h-10 mb-2 opacity-25" />
                  <p className="text-sm">Нет активных заказов</p>
                  <p className="text-xs mt-1 opacity-60">Курьер свободен</p>
                </div>
              ) : tracking.activeOrders.map((ord, i) => (
                <OrderCard
                  key={ord.orderId} order={ord} index={i} agentRole={agentRole}
                  onCancel={handleCancel}
                  onEscalateCancel={onEscalateForCancel}
                  onSendToCustomer={handleSendToCustomer}
                />
              ))}

              {!canCancel && tracking.activeOrders.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-start gap-2">
                    <Shield className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-amber-800">Полномочия L1</p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        Отмена → только L2, Руководитель, Администратор.
                        Нажмите «Эскалировать» — чат мгновенно передаётся уполномоченному.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── INFO TAB ── */}
          {tab === 'info' && (
            <div className="p-3 space-y-2">
              {[
                { label: 'ID курьера',          value: tracking.courierId,            icon: Hash },
                { label: 'Телефон',             value: tracking.courierPhone,         icon: Phone },
                { label: 'Транспорт',           value: VEHICLE_LABELS[tracking.vehicleType], icon: VIcon },
                tracking.vehiclePlate && { label: 'Гос. номер',   value: tracking.vehiclePlate,   icon: Truck },
                { label: 'Версия приложения',   value: tracking.appVersion,          icon: Wifi },
                { label: 'Начало смены',        value: tracking.shiftStart,          icon: Clock },
                { label: 'Доставлено сегодня',  value: `${tracking.deliveredToday} заказов`, icon: CheckCircle2 },
                { label: 'Заработок сегодня',   value: `₽${tracking.earningsToday.toLocaleString()}`, icon: DollarSign },
                { label: 'Рейтинг',             value: `${tracking.rating} / 5.0 ⭐`, icon: Star },
                { label: 'Последняя активность',value: tracking.lastSeen,            icon: RefreshCw },
              ].filter(Boolean).map((item: any, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="flex items-center gap-2.5 p-2.5 bg-gray-50 border border-gray-200 rounded-xl">
                    <Icon className="w-4 h-4 text-gray-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400">{item.label}</p>
                      <p className="text-xs font-semibold text-gray-800 mt-0.5">{item.value}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Fullscreen Map Modal ── */}
      {showFullscreen && (
        <FullscreenMapModal
          tracking={tracking}
          zoom={zoom}
          onZoomIn={doZoomIn}
          onZoomOut={doZoomOut}
          onClose={() => setShowFullscreen(false)}
        />
      )}
    </div>
  );
}