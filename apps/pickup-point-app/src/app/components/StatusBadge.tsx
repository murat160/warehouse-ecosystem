import type {
  OrderStatus, ReturnStatus, BatchStatus, ProblemStatus, CellStatus,
  ChatThreadKind,
} from '../domain/types';
import {
  ORDER_STATUS_LABELS, ORDER_STATUS_COLORS,
  RETURN_STATUS_LABELS, BATCH_STATUS_LABELS, CHAT_THREAD_LABELS,
} from '../domain/types';

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] text-white"
      style={{ backgroundColor: ORDER_STATUS_COLORS[status], fontWeight: 700 }}
    >
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}

const RETURN_COLORS: Record<ReturnStatus, string> = {
  created:                '#0EA5E9',
  received_at_pvz:        '#3B82F6',
  inspection:             '#F59E0B',
  waiting_admin_decision: '#A855F7',
  send_to_warehouse:      '#6366F1',
  send_to_seller:         '#6366F1',
  refunded:               '#16A34A',
  rejected:               '#EF4444',
  closed:                 '#6B7280',
};
export function ReturnStatusBadge({ status }: { status: ReturnStatus }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] text-white" style={{ backgroundColor: RETURN_COLORS[status], fontWeight: 700 }}>
      {RETURN_STATUS_LABELS[status]}
    </span>
  );
}

const BATCH_COLORS: Record<BatchStatus, string> = {
  expected:    '#94A3B8',
  arrived:     '#0EA5E9',
  receiving:   '#0EA5E9',
  discrepancy: '#EF4444',
  accepted:    '#16A34A',
  rejected:    '#6B7280',
};
export function BatchStatusBadge({ status }: { status: BatchStatus }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] text-white" style={{ backgroundColor: BATCH_COLORS[status], fontWeight: 700 }}>
      {BATCH_STATUS_LABELS[status]}
    </span>
  );
}

const PROBLEM_COLORS: Record<ProblemStatus, string> = {
  open:        '#EF4444',
  in_progress: '#F59E0B',
  escalated:   '#7C3AED',
  resolved:    '#16A34A',
  rejected:    '#6B7280',
};
const PROBLEM_LABELS: Record<ProblemStatus, string> = {
  open:        'Открыта',
  in_progress: 'В работе',
  escalated:   'Эскалирована',
  resolved:    'Решена',
  rejected:    'Отклонена',
};
export function ProblemStatusBadge({ status }: { status: ProblemStatus }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] text-white" style={{ backgroundColor: PROBLEM_COLORS[status], fontWeight: 700 }}>
      {PROBLEM_LABELS[status]}
    </span>
  );
}

const CELL_COLORS: Record<CellStatus, string> = {
  empty:    '#22C55E',
  occupied: '#0EA5E9',
  reserved: '#A855F7',
  blocked:  '#6B7280',
  damaged:  '#EF4444',
};
const CELL_LABELS: Record<CellStatus, string> = {
  empty:    'Свободна',
  occupied: 'Занята',
  reserved: 'Резерв',
  blocked:  'Заблок.',
  damaged:  'Повреж.',
};
export function CellStatusBadge({ status }: { status: CellStatus }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] text-white" style={{ backgroundColor: CELL_COLORS[status], fontWeight: 700 }}>
      {CELL_LABELS[status]}
    </span>
  );
}

export function ChatKindBadge({ kind }: { kind: ChatThreadKind }) {
  const colors: Record<ChatThreadKind, string> = {
    shift: '#0EA5E9', manager: '#7C3AED', support: '#16A34A',
    order: '#F59E0B', return: '#F43F5E', problem: '#EF4444', courier: '#6366F1',
  };
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] text-white" style={{ backgroundColor: colors[kind], fontWeight: 700 }}>
      {CHAT_THREAD_LABELS[kind]}
    </span>
  );
}
