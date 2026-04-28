/**
 * 12 статусов заказа на стороне Warehouse App.
 * Warehouse App — единственный, кто пишет эти статусы. Admin Panel читает.
 */

export const ORDER_STATUS = [
  'received_by_warehouse',
  'picking_assigned',
  'picking_in_progress',
  'picked',
  'sorting',
  'packing_in_progress',
  'packed',
  'ready_for_pickup',
  'handed_to_courier',
  'cancelled',
  'returned',
  'problem',
] as const;

export type OrderStatus = (typeof ORDER_STATUS)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  received_by_warehouse: 'Принят складом',
  picking_assigned:      'Назначена сборка',
  picking_in_progress:   'Сборка',
  picked:                'Собран',
  sorting:               'Сортировка',
  packing_in_progress:   'Упаковка',
  packed:                'Упакован',
  ready_for_pickup:      'Готов к выдаче',
  handed_to_courier:     'Передан курьеру',
  cancelled:             'Отменён',
  returned:              'Возврат',
  problem:               'Проблема',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, { bg: string; fg: string }> = {
  received_by_warehouse: { bg: '#E0F2FE', fg: '#0369A1' },
  picking_assigned:      { bg: '#FEF3C7', fg: '#B45309' },
  picking_in_progress:   { bg: '#FED7AA', fg: '#9A3412' },
  picked:                { bg: '#D1FAE5', fg: '#065F46' },
  sorting:               { bg: '#CFFAFE', fg: '#155E75' },
  packing_in_progress:   { bg: '#E0E7FF', fg: '#3730A3' },
  packed:                { bg: '#DBEAFE', fg: '#1E40AF' },
  ready_for_pickup:      { bg: '#DCFCE7', fg: '#166534' },
  handed_to_courier:     { bg: '#F3E8FF', fg: '#6B21A8' },
  cancelled:             { bg: '#F3F4F6', fg: '#374151' },
  returned:              { bg: '#FEE2E2', fg: '#991B1B' },
  problem:               { bg: '#FECACA', fg: '#7F1D1D' },
};

/**
 * Допустимые переходы. Кроме happy-path, любой статус может уйти в `problem`,
 * а ранние статусы — в `cancelled`. Backend должен валидировать тот же список.
 */
export const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  received_by_warehouse: ['picking_assigned', 'cancelled', 'problem'],
  picking_assigned:      ['picking_in_progress', 'cancelled', 'problem'],
  picking_in_progress:   ['picked', 'problem'],
  picked:                ['sorting', 'problem'],
  sorting:               ['packing_in_progress', 'problem'],
  packing_in_progress:   ['packed', 'problem'],
  packed:                ['ready_for_pickup', 'problem'],
  ready_for_pickup:      ['handed_to_courier', 'problem'],
  handed_to_courier:     ['returned'],
  cancelled:             [],
  returned:              [],
  problem:               ['received_by_warehouse', 'cancelled'],
};

export const ACTIVE_STATUSES: OrderStatus[] = [
  'received_by_warehouse', 'picking_assigned', 'picking_in_progress',
  'picked', 'sorting', 'packing_in_progress', 'packed',
];
