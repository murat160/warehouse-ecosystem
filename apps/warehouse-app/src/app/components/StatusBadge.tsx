import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS, type OrderStatus } from '../domain/orderStatus';

export function StatusBadge({ status }: { status: OrderStatus }) {
  const c = ORDER_STATUS_COLORS[status];
  return (
    <span
      className="text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ backgroundColor: c.bg, color: c.fg, fontWeight: 800 }}
    >
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}
