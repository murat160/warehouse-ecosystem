// ─── Internal Notifications Store ────────────────────────────────────────────
// Module-level reactive store — no Zustand needed.
// Both ChatCenter and PersonalCabinet subscribe to the same singleton.

export type NotifType =
  | 'chat_routed'      // Chat forwarded to me / my dept
  | 'chat_mention'     // @mention in internal note
  | 'task_assigned'    // Task explicitly assigned to me
  | 'escalation'       // Chat escalated to my level
  | 'internal_msg'     // New internal channel message
  | 'document_approved'          // Document passed review → user activated
  | 'document_rejected'          // Document rejected → reason sent
  | 'document_expired'           // Document expired → access restricted
  | 'document_reupload_request'; // Request to reupload document sent

export type NotifPriority = 'low' | 'normal' | 'high' | 'critical';

export interface InternalNotification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  fromId: string;
  fromName: string;
  fromRole: string;
  targetDept: string;         // "Финансовый отдел" / "Администрация" etc.
  targetAgentId?: string;     // if routed to a specific agent
  targetAgentName?: string;
  conversationId?: string;
  convSubject?: string;
  priority: NotifPriority;
  createdAt: string;          // human-readable
  read: boolean;
  comment?: string;           // Routing comment from the sender
  channel?: string;           // original chat channel label
}

// ─── Initial mock notifications ───────────────────────────────────────────────

const INITIAL: InternalNotification[] = [
  {
    id: 'n001',
    type: 'chat_routed',
    title: 'Чат перенаправлен: финансовое решение',
    body: 'Требование возврата ₽12 000 — повреждённый товар',
    fromId: 'l1_agent1', fromName: 'Козлова Елена', fromRole: 'Агент L1',
    targetDept: 'Финансовый отдел',
    targetAgentName: 'Громова Анна',
    conversationId: 'c002',
    convSubject: 'Требование возврата ₽12 000 — поврежд. товар',
    priority: 'critical',
    createdAt: '14.02.2026 09:15',
    read: false,
    comment: 'Клиент очень агрессивен. Требует полный возврат. Нужно финансовое решение — я не могу авторизовать сумму > ₽5 000.',
    channel: 'Клиенты',
  },
  {
    id: 'n002',
    type: 'escalation',
    title: 'Эскалация к администратору',
    body: 'Кафе «Уют» — Задержка курьера 40 мин',
    fromId: 'l1_agent2', fromName: 'Смирнов Антон', fromRole: 'Агент L1',
    targetDept: 'Администрция',
    conversationId: 'c020',
    convSubject: 'Кафе «Уют» — Задержка курьера 40 мин',
    priority: 'high',
    createdAt: '14.02.2026 12:10',
    read: false,
    comment: 'Мерчант угрожает разрывом договора. Нужно решение администратора по компенсации и разбору ситуации с логистикой.',
    channel: 'Партнёры',
  },
  {
    id: 'n003',
    type: 'task_assigned',
    title: 'Задача: Проверить расчёт комиссии',
    body: 'TechStore MSK — Комиссия за март',
    fromId: 'lead1', fromName: 'Захаров Виктор', fromRole: 'Руководитель',
    targetDept: 'Финансовый отдел',
    targetAgentName: 'Коваль Пётр',
    conversationId: 'c021',
    convSubject: 'TechStore — Комиссия за март',
    priority: 'normal',
    createdAt: '14.02.2026 10:00',
    read: true,
    comment: 'Нужно сверить расчёт комиссии с договором и дать официальный ответ партнёру. Срок — сегодня до 18:00.',
    channel: 'Партнёры',
  },
  {
    id: 'n004',
    type: 'chat_mention',
    title: '@упоминание в внутренней заметке',
    body: '🔒 Внутренний: Инцидент ПВЗ MSK-047',
    fromId: 'lead1', fromName: 'Захаров Виктор', fromRole: 'Руководитель',
    targetDept: 'Поддержка L2',
    conversationId: 'c030',
    convSubject: '🔒 Внутренний: Инцидент ПВЗ MSK-047',
    priority: 'high',
    createdAt: '14.02.2026 11:00',
    read: true,
    comment: '@Попова Ирина — нужен отчёт по ПВЗ MSK-047 до конца дня. Свяжись с оператором напрямую.',
    channel: 'Внутренний',
  },
];

// ─── Store state ──────────────────────────────────────────────────────────────

const _store: InternalNotification[] = [...INITIAL];
const _listeners: Set<() => void> = new Set();

function _notify() {
  _listeners.forEach(fn => fn());
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getNotifications(): InternalNotification[] {
  return [..._store];
}

export function addNotification(n: InternalNotification): void {
  _store.unshift(n);
  _notify();
}

export function markRead(id: string): void {
  const n = _store.find(x => x.id === id);
  if (n && !n.read) { n.read = true; _notify(); }
}

export function markAllRead(): void {
  let changed = false;
  _store.forEach(n => { if (!n.read) { n.read = true; changed = true; } });
  if (changed) _notify();
}

export function deleteNotification(id: string): void {
  const idx = _store.findIndex(x => x.id === id);
  if (idx !== -1) { _store.splice(idx, 1); _notify(); }
}

export function unreadCount(): number {
  return _store.filter(n => !n.read).length;
}

export function subscribe(fn: () => void): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}