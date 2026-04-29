import { useState } from 'react';
import { MessagesSquare } from 'lucide-react';
import { store } from '../store/useStore';
import { SupplierChatModal } from './SupplierChatModal';
import type { ChatThreadKind, ChatThreadPriority } from '../domain/types';

export interface InternalChatButtonProps {
  /** Тип треда (task/order/problem/dispute/shift/admin/direct). */
  kind: 'task' | 'order' | 'problem' | 'dispute' | 'shift' | 'admin' | 'direct';
  /** Ссылка на сущность (taskId/orderId/problemId/disputeId). */
  refId?: string;
  counterpartyId?: string;     // для direct
  title?: string;
  participantIds?: string[];
  priority?: ChatThreadPriority;
  /** Текст на кнопке (по умолчанию «Внутренний чат»). */
  label?: string;
  /** Размер кнопки. */
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Универсальная кнопка для открытия internal-чата по сущности.
 * Сама создаёт/находит thread через store.getOrCreateInternalThread
 * и открывает SupplierChatModal.
 */
export function InternalChatButton({
  kind, refId, counterpartyId, title, participantIds, priority,
  label = 'Внутренний чат', size = 'sm', className,
}: InternalChatButtonProps) {
  const [threadId, setThreadId] = useState<string | null>(null);

  const open = () => {
    const id = store.getOrCreateInternalThread({
      kind, refId, counterpartyId, title, participantIds, priority,
    });
    setThreadId(id);
  };

  const sz = size === 'md' ? 'h-10 px-4 text-[13px]' : 'h-9 px-3 text-[12px]';

  return (
    <>
      <button
        onClick={open}
        className={`${sz} rounded-lg bg-[#7C3AED] text-white active-press inline-flex items-center gap-1 ${className ?? ''}`}
        style={{ fontWeight: 700 }}
      >
        <MessagesSquare className="w-3 h-3" /> {label}
      </button>
      <SupplierChatModal
        open={!!threadId}
        threadId={threadId}
        onClose={() => setThreadId(null)}
      />
    </>
  );
}
