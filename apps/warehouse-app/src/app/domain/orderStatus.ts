/**
 * Контракт статусов заказа на стороне Warehouse App.
 * Эти статусы Warehouse App ставит сам — Admin Panel читает.
 */

export const ORDER_STATUS = [
  'received_by_warehouse',
  'picking_assigned',
  'picking_in_progress',
  'picked',
  'packing_in_progress',
  'packed',
  'ready_for_pickup',
  'handed_to_courier',
] as const;

export type OrderStatus = (typeof ORDER_STATUS)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  received_by_warehouse: 'Принят складом',
  picking_assigned:      'Назначена сборка',
  picking_in_progress:   'Сборка',
  picked:                'Собран',
  packing_in_progress:   'Упаковка',
  packed:                'Упакован',
  ready_for_pickup:      'Готов к выдаче',
  handed_to_courier:     'Передан курьеру',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, { bg: string; fg: string }> = {
  received_by_warehouse: { bg: '#E0F2FE', fg: '#0369A1' },
  picking_assigned:      { bg: '#FEF3C7', fg: '#B45309' },
  picking_in_progress:   { bg: '#FED7AA', fg: '#9A3412' },
  picked:                { bg: '#D1FAE5', fg: '#065F46' },
  packing_in_progress:   { bg: '#E0E7FF', fg: '#3730A3' },
  packed:                { bg: '#DBEAFE', fg: '#1E40AF' },
  ready_for_pickup:      { bg: '#DCFCE7', fg: '#166534' },
  handed_to_courier:     { bg: '#F3E8FF', fg: '#6B21A8' },
};

/** Допустимые переходы — backend будет валидировать тот же список. */
export const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  received_by_warehouse: ['picking_assigned'],
  picking_assigned:      ['picking_in_progress'],
  picking_in_progress:   ['picked'],
  picked:                ['packing_in_progress'],
  packing_in_progress:   ['packed'],
  packed:                ['ready_for_pickup'],
  ready_for_pickup:      ['handed_to_courier'],
  handed_to_courier:     [],
};
