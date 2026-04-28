/**
 * Цветные зоны склада. Цвет — главный визуальный якорь для сборщика:
 * на карточке товара, на бейдже ячейки, на маршруте сборки и на сортировочной корзине.
 */

export const ZONE_CODES = ['RED', 'BLUE', 'GREEN', 'YELLOW', 'PURPLE', 'GRAY', 'ORANGE', 'BLACK'] as const;
export type ZoneCode = (typeof ZONE_CODES)[number];

export interface Zone {
  code: ZoneCode;
  name: string;
  description: string;
  color: string; // accent (text/border)
  bg: string;    // soft background
  fg: string;    // text on accent
}

export const ZONES: Record<ZoneCode, Zone> = {
  RED:    { code: 'RED',    name: 'Красная зона',    description: 'Срочные / приоритет',  color: '#EF4444', bg: '#FEE2E2', fg: '#7F1D1D' },
  BLUE:   { code: 'BLUE',   name: 'Синяя зона',      description: 'Электроника',          color: '#2563EB', bg: '#DBEAFE', fg: '#1E3A8A' },
  GREEN:  { code: 'GREEN',  name: 'Зелёная зона',    description: 'Продукты / grocery',   color: '#16A34A', bg: '#DCFCE7', fg: '#14532D' },
  YELLOW: { code: 'YELLOW', name: 'Жёлтая зона',     description: 'Одежда',               color: '#CA8A04', bg: '#FEF9C3', fg: '#713F12' },
  PURPLE: { code: 'PURPLE', name: 'Фиолетовая зона', description: 'Подарки / цветы',      color: '#7C3AED', bg: '#EDE9FE', fg: '#4C1D95' },
  GRAY:   { code: 'GRAY',   name: 'Серая зона',      description: 'Возвраты',             color: '#6B7280', bg: '#F3F4F6', fg: '#1F2937' },
  ORANGE: { code: 'ORANGE', name: 'Оранжевая зона',  description: 'Упаковка',             color: '#EA580C', bg: '#FFEDD5', fg: '#7C2D12' },
  BLACK:  { code: 'BLACK',  name: 'Чёрная зона',     description: 'Брак / проблема',      color: '#1F2937', bg: '#E5E7EB', fg: '#111827' },
};

export function zoneOf(code: ZoneCode | string | undefined): Zone {
  return (code && (ZONES as any)[code]) || ZONES.GRAY;
}
