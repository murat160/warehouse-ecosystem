import { ZONES, type ZoneCode } from './zones';

export interface SortBin {
  id: string;       // BLUE-07
  color: ZoneCode;
  label: string;    // визуальное имя
  capacity: number;
  occupied: number;
  /** Заказ, привязанный к корзине во время сортировки. */
  orderId?: string;
}

export const MOCK_SORT_BINS: SortBin[] = [
  { id: 'RED-01',    color: 'RED',    label: 'Срочное #1',  capacity: 12, occupied: 0 },
  { id: 'BLUE-07',   color: 'BLUE',   label: 'Электроника', capacity: 12, occupied: 0 },
  { id: 'GREEN-03',  color: 'GREEN',  label: 'Продукты',    capacity: 12, occupied: 0 },
  { id: 'YELLOW-02', color: 'YELLOW', label: 'Одежда',      capacity: 12, occupied: 0 },
  { id: 'PURPLE-01', color: 'PURPLE', label: 'Подарки',     capacity: 8,  occupied: 0 },
  { id: 'ORANGE-04', color: 'ORANGE', label: 'Упаковка',    capacity: 12, occupied: 0 },
];

export function sortBinColor(b: SortBin) {
  return ZONES[b.color];
}
