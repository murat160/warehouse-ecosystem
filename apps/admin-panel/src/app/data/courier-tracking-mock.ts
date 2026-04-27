// ─── Courier Real-Time Tracking Mock Data ─────────────────────────────────────

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface CourierActiveOrder {
  orderId: string;
  orderNumber: string;
  status: 'picked_up' | 'en_route' | 'arriving' | 'waiting' | 'problem';
  /** Merchant/cafe the order came from */
  merchant: {
    id: string;
    name: string;
    type: 'cafe' | 'restaurant' | 'shop' | 'pharmacy' | 'pvz';
    address: string;
    phone: string;
    lat: number;
    lng: number;
  };
  /** Where to deliver */
  delivery: {
    address: string;
    customerName: string;
    customerPhone: string;
    lat: number;
    lng: number;
    floor?: number;
    comment?: string;
  };
  /** Money */
  total: number;
  itemsCount: number;
  weight: number; // kg
  paymentMethod: string;
  pickupTime: string;   // when courier picked it up
  slaDeadline: string;  // must deliver by
  isOverdue: boolean;
  distanceLeft: number; // km
  etaMinutes: number;
}

export interface CourierTracking {
  courierId: string;
  courierName: string;
  courierPhone: string;
  avatar: string;
  vehicleType: 'bicycle' | 'motorcycle' | 'car' | 'foot';
  vehiclePlate?: string;
  // live location
  location: GeoPoint;
  heading: number;     // degrees 0-360
  speed: number;       // km/h
  accuracy: number;    // meters
  battery: number;     // %
  appVersion: string;
  lastSeen: string;
  online: boolean;
  // shift
  shiftStart: string;
  deliveredToday: number;
  earningsToday: number;
  rating: number;
  // active orders (max 3)
  activeOrders: CourierActiveOrder[];
  // route polyline (simplified, array of points)
  route: GeoPoint[];
}

// ─── Mock city grid: approximate Moscow center coordinates ────────────────────
// We offset everything slightly for visual variety

export const COURIER_TRACKING: Record<string, CourierTracking> = {
  courier1: {
    courierId: 'courier1',
    courierName: 'Алексей Карпов',
    courierPhone: '+7 (916) 234-56-78',
    avatar: 'АК',
    vehicleType: 'bicycle',
    location: { lat: 55.7558, lng: 37.6173 },
    heading: 42,
    speed: 18,
    accuracy: 8,
    battery: 74,
    appVersion: '3.14.2',
    lastSeen: '11:47:23',
    online: true,
    shiftStart: '08:00',
    deliveredToday: 7,
    earningsToday: 1840,
    rating: 4.9,
    activeOrders: [
      {
        orderId: '2',
        orderNumber: 'ORD-2026-000457',
        status: 'problem',
        merchant: {
          id: 'slr-002',
          name: 'Ресторан «Вкусно»',
          type: 'restaurant',
          address: 'ул. Тверская, 12',
          phone: '+7 (495) 100-20-30',
          lat: 55.7600,
          lng: 37.6100,
        },
        delivery: {
          address: 'ул. Ленина, д. 42, кв. 15',
          customerName: 'Петрова Мария Сергеевна',
          customerPhone: '+7 (999) 234-56-45',
          lat: 55.7530,
          lng: 37.6240,
          floor: 5,
          comment: 'Не звонить в дверь',
        },
        total: 1250,
        itemsCount: 1,
        weight: 1.2,
        paymentMethod: 'Apple Pay',
        pickupTime: '11:40',
        slaDeadline: '12:10',
        isOverdue: false,
        distanceLeft: 0.8,
        etaMinutes: 4,
      },
    ],
    route: [
      { lat: 55.7600, lng: 37.6100 },
      { lat: 55.7590, lng: 37.6120 },
      { lat: 55.7575, lng: 37.6140 },
      { lat: 55.7558, lng: 37.6173 },
      { lat: 55.7545, lng: 37.6210 },
      { lat: 55.7530, lng: 37.6240 },
    ],
  },

  courier2: {
    courierId: 'courier2',
    courierName: 'Михаил Данилов',
    courierPhone: '+7 (916) 345-67-89',
    avatar: 'МД',
    vehicleType: 'motorcycle',
    vehiclePlate: 'М 123 АВ 77',
    location: { lat: 55.7620, lng: 37.6080 },
    heading: 195,
    speed: 0,
    accuracy: 12,
    battery: 45,
    appVersion: '3.14.2',
    lastSeen: '10:18:05',
    online: true,
    shiftStart: '09:00',
    deliveredToday: 4,
    earningsToday: 1020,
    rating: 4.7,
    activeOrders: [],
    route: [],
  },

  courier3: {
    courierId: 'courier3',
    courierName: 'Олег Васильев',
    courierPhone: '+7 (916) 456-78-90',
    avatar: 'ОВ',
    vehicleType: 'car',
    vehiclePlate: 'А 456 ВС 77',
    location: { lat: 55.7490, lng: 37.6310 },
    heading: 310,
    speed: 32,
    accuracy: 5,
    battery: 88,
    appVersion: '3.13.9',
    lastSeen: '11:45:01',
    online: false,
    shiftStart: '07:00',
    deliveredToday: 11,
    earningsToday: 2750,
    rating: 4.8,
    activeOrders: [],
    route: [],
  },
};

// ─── Map config (for our SVG renderer) ────────────────────────────────────────

export const MAP_CENTER: GeoPoint = { lat: 55.7558, lng: 37.6173 };
export const MAP_SCALE = 8000; // pixels per degree

/** Convert geo coords to SVG pixel coords relative to center */
export function geoToSvg(
  point: GeoPoint,
  center: GeoPoint,
  svgWidth: number,
  svgHeight: number,
  scale: number = MAP_SCALE,
): { x: number; y: number } {
  const x = svgWidth / 2 + (point.lng - center.lng) * scale;
  const y = svgHeight / 2 - (point.lat - center.lat) * scale;
  return { x, y };
}
