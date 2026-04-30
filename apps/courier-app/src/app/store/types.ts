export type OrderStatus =
  | 'available'
  | 'accepted'
  | 'going_to_pickup'
  | 'arrived_at_pickup'
  | 'package_count_required'
  | 'picked_up'
  | 'going_to_customer'
  | 'arrived_at_customer'
  | 'delivered'
  | 'problem'
  | 'support_required';

export const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  available:               ['accepted'],
  accepted:                ['going_to_pickup', 'support_required'],
  going_to_pickup:         ['arrived_at_pickup', 'problem', 'support_required'],
  arrived_at_pickup:       ['package_count_required', 'problem', 'support_required'],
  package_count_required:  ['picked_up', 'problem', 'support_required'],
  picked_up:               ['going_to_customer', 'problem', 'support_required'],
  going_to_customer:       ['arrived_at_customer', 'problem', 'support_required'],
  arrived_at_customer:     ['delivered', 'problem', 'support_required'],
  delivered:               [],
  problem:                 ['support_required', 'going_to_pickup', 'going_to_customer'],
  support_required:        ['going_to_pickup', 'going_to_customer', 'delivered'],
};

export interface CourierProfile {
  id: string;
  name: string;
  avatarUrl?: string;
  phone: string;
  rating: number;
  totalDeliveries: number;
  vehicle: 'bike' | 'scooter' | 'car' | 'foot';
}

export interface PickupPoint {
  id: string;
  type: 'cafe' | 'restaurant' | 'shop' | 'seller';
  name: string;
  address: string;
  phone?: string;
  location: { lat: number; lng: number };
}

export interface CustomerInfo {
  name: string;
  phone: string;
  address: string;
  entrance?: string;
  apartment?: string;
  comment?: string;
  area?: string;
  location: { lat: number; lng: number };
}

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
}

export interface Order {
  id: string;
  number: string;
  status: OrderStatus;
  pickup: PickupPoint;
  customer: CustomerInfo;
  items: OrderItem[];
  payAmount: number;
  payCurrency: string;
  bonus: number;
  distanceKm: number;
  etaMinutes: number;
  pickupReady: boolean;
  pickupReadyInMinutes?: number;
  packageCount?: number;
  packagePhotoDataUrl?: string;
  packageComment?: string;
  proofPhotoDataUrl?: string;
  proofCode?: string;
  proofComment?: string;
  acceptedAt?: number;
  pickedUpAt?: number;
  deliveredAt?: number;
  earnings?: number;
}

export type ProblemType =
  | 'cafe_not_ready' | 'damaged' | 'wrong_order' | 'wrong_address'
  | 'customer_no_response' | 'customer_refused' | 'cant_find_address'
  | 'delay' | 'transport' | 'payment' | 'other';

export interface ProblemReport {
  id: string;
  orderId: string;
  type: ProblemType;
  description: string;
  photos: string[];
  videos: string[];
  status: 'open' | 'resolved';
  createdAt: number;
}

export type ChatChannel = 'support' | { customerOrderId: string };

export type ChatStatus = 'sent' | 'delivered' | 'viewed';

export interface ChatMessage {
  id: string;
  channelKey: string; // 'support' or 'customer:<orderId>'
  from: 'courier' | 'support' | 'customer';
  text?: string;
  photoUrl?: string;
  videoUrl?: string;
  status: ChatStatus;
  createdAt: number;
}

export interface AuditEntry {
  id: string;
  at: number;
  actor: string;
  action: string;
  meta?: Record<string, unknown>;
}

export interface CourierSettings {
  notifications: boolean;
}

export const DEFAULT_SETTINGS: CourierSettings = {
  notifications: true,
};
