import {
  PRIORITY_CFG, TASK_STATUS_CFG, INBOUND_STATUS_CFG, ORDER_STATUS_CFG, RMA_STATUS_CFG,
  type TaskPriority, type TaskStatus, type InboundStatus, type OrderStatus, type RMAStatus,
} from '../data/mockData';

interface BadgeProps {
  label: string;
  color: string;
  bg: string;
  emoji?: string;
  size?: 'sm' | 'md';
}

function Badge({ label, color, bg, emoji, size = 'md' }: BadgeProps) {
  const padding = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full ${padding}`}
      style={{ backgroundColor: bg, color, fontWeight: 700 }}
    >
      {emoji && <span>{emoji}</span>}
      <span>{label}</span>
    </span>
  );
}

export function PriorityBadge({ priority, size }: { priority: TaskPriority; size?: 'sm' | 'md' }) {
  const cfg = PRIORITY_CFG[priority];
  return <Badge label={cfg.label} color={cfg.color} bg={cfg.bg} emoji={cfg.emoji} size={size} />;
}

export function TaskStatusBadge({ status, size }: { status: TaskStatus; size?: 'sm' | 'md' }) {
  const cfg = TASK_STATUS_CFG[status];
  return <Badge label={cfg.label} color={cfg.color} bg={cfg.bg} size={size} />;
}

export function InboundStatusBadge({ status, size }: { status: InboundStatus; size?: 'sm' | 'md' }) {
  const cfg = INBOUND_STATUS_CFG[status];
  return <Badge label={cfg.label} color={cfg.color} bg={cfg.bg} size={size} />;
}

export function OrderStatusBadge({ status, size }: { status: OrderStatus; size?: 'sm' | 'md' }) {
  const cfg = ORDER_STATUS_CFG[status];
  return <Badge label={cfg.label} color={cfg.color} bg={cfg.bg} size={size} />;
}

export function RMAStatusBadge({ status, size }: { status: RMAStatus; size?: 'sm' | 'md' }) {
  const cfg = RMA_STATUS_CFG[status];
  return <Badge label={cfg.label} color={cfg.color} bg={cfg.bg} size={size} />;
}

export function RiskBadge({ risk }: { risk: 'low' | 'medium' | 'high' }) {
  const cfg = {
    low:    { color: '#00D27A', bg: '#D1FAE5', label: 'Низкий риск' },
    medium: { color: '#F59E0B', bg: '#FEF3C7', label: 'Средний риск' },
    high:   { color: '#EF4444', bg: '#FEE2E2', label: 'Высокий риск' },
  }[risk];
  return <Badge label={cfg.label} color={cfg.color} bg={cfg.bg} size="sm" />;
}
