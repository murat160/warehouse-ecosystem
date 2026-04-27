// ─── Chat Center Mock Data ────────────────────────────────────────────────────

export type ChatChannel = 'support' | 'couriers' | 'merchants' | 'internal' | 'escalated' | 'closed';
export type MessageType = 'text' | 'system' | 'escalation' | 'file' | 'order_ref' | 'image';
export type ConversationStatus = 'open' | 'pending' | 'in_progress' | 'waiting_external' | 'escalated' | 'resolved' | 'closed';
export type AgentRole = 'l1' | 'l2' | 'lead' | 'admin' | 'readonly';
export type Priority = 'low' | 'normal' | 'high' | 'critical';

export interface ChatParticipant {
  id: string;
  name: string;
  avatar: string; // initials
  role: 'client' | 'courier' | 'merchant' | 'support_l1' | 'support_l2' | 'support_lead' | 'admin' | 'bot';
  online: boolean;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: ChatParticipant['role'];
  text?: string;
  type: MessageType;
  timestamp: string;
  read: boolean;
  fileUrl?: string;
  fileName?: string;
  orderRef?: string;
  escalateTo?: string;
  systemText?: string;
  isInternal?: boolean; // Internal agent note — not visible to client
}

export interface Conversation {
  id: string;
  channel: ChatChannel;
  status: ConversationStatus;
  priority: Priority;
  subject: string;
  clientName: string;
  clientId: string;
  clientAvatar: string;
  assignedTo?: string;
  assignedToName?: string;
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
  messages: ChatMessage[];
  tags: string[];
  orderRef?: string;
  linkedEntity?: string; // PVZ id, courier id, etc
  createdAt: string;
  resolvedAt?: string;
  csat?: number; // 1-5
  csatByName?: string;       // Who rated (agent name)
  csatById?: string;         // Who rated (agent ID)
  escalationLevel?: number; // 1=L1, 2=L2, 3=Lead
  resolutionCode?: string;  // Resolution code on close
  resolutionNote?: string;  // Agent summary on close
  waitingFor?: string;      // Who we're waiting for (WAITING_EXTERNAL)
  routedAway?: boolean;     // Conversation forwarded to another agent — removed from sender queue
  routedTo?: string;        // Target agent/department label
  routedAt?: string;        // When routed
}

// ─── Participants ──────────────────────────────────────────────────────────────

export const PARTICIPANTS: Record<string, ChatParticipant> = {
  client1: { id: 'client1', name: 'Александра Морозова', avatar: 'АМ', role: 'client', online: true },
  client2: { id: 'client2', name: 'Дмитрий Соколов', avatar: 'ДС', role: 'client', online: false },
  client3: { id: 'client3', name: 'Наталья Козлова', avatar: 'НК', role: 'client', online: true },
  client4: { id: 'client4', name: 'Иван Петров', avatar: 'ИП', role: 'client', online: true },
  client5: { id: 'client5', name: 'Светлана Новикова', avatar: 'СН', role: 'client', online: false },
  courier1: { id: 'courier1', name: 'Курьер Алексей К.', avatar: 'АК', role: 'courier', online: true },
  courier2: { id: 'courier2', name: 'Курьер Михаил Д.', avatar: 'МД', role: 'courier', online: true },
  courier3: { id: 'courier3', name: 'Курьер Олег В.', avatar: 'ОВ', role: 'courier', online: false },
  merchant1: { id: 'merchant1', name: 'Кафе «Уют»', avatar: 'КУ', role: 'merchant', online: true },
  merchant2: { id: 'merchant2', name: 'Пекарня «Хлеб»', avatar: 'ПХ', role: 'merchant', online: true },
  merchant3: { id: 'merchant3', name: 'TechStore MSK', avatar: 'ТМ', role: 'merchant', online: false },
  l1_agent1: { id: 'l1_agent1', name: 'Козлова Елена (L1)', avatar: 'КЕ', role: 'support_l1', online: true },
  l1_agent2: { id: 'l1_agent2', name: 'Смирнов Антон (L1)', avatar: 'СА', role: 'support_l1', online: true },
  l2_agent1: { id: 'l2_agent1', name: 'Попова Ирина (L2)', avatar: 'ПИ', role: 'support_l2', online: true },
  lead1: { id: 'lead1', name: 'Захаров Виктор (Lead)', avatar: 'ЗВ', role: 'support_lead', online: true },
  admin1: { id: 'admin1', name: 'Администратор Системы', avatar: 'АС', role: 'admin', online: true },
  bot: { id: 'bot', name: 'PVZ Bot', avatar: '🤖', role: 'bot', online: true },
};

// ─── Conversations ─────────────────────────────────────────────────────────────

export const INITIAL_CONVERSATIONS: Conversation[] = [
  // ── SUPPORT / CLIENTS ──
  {
    id: 'c001', channel: 'support', status: 'in_progress', priority: 'high',
    subject: 'Посылка не найдена в системе — ORD-2026-004821',
    clientName: 'Александра Морозова', clientId: 'client1', clientAvatar: 'АМ',
    assignedTo: 'l1_agent1', assignedToName: 'Козлова Елена',
    lastMessage: 'Сейчас проверяю статус вашей посылки в системе...', lastMessageTime: '11:47',
    unread: 2, tags: ['заказ', 'срочно'], orderRef: 'ORD-2026-004821', createdAt: '14.02.2026 10:30',
    messages: [
      { id: 'm1', conversationId: 'c001', senderId: 'bot', senderName: 'PVZ Bot', senderRole: 'bot',
        type: 'system', systemText: 'Чат начат · ORD-2026-004821 · Приоритет: Высокий', timestamp: '10:30', read: true },
      { id: 'm2', conversationId: 'c001', senderId: 'client1', senderName: 'Александра Морозова', senderRole: 'client',
        text: 'Здравствуйте! Я сделала заказ 3 дня назад, но статус до сих пор «В обработке». Что происходит?', type: 'text', timestamp: '10:31', read: true },
      { id: 'm3', conversationId: 'c001', senderId: 'l1_agent1', senderName: 'Козлова Елена', senderRole: 'support_l1',
        text: 'Добрый день, Александра! Понимаю ваше беспокойство. Уточните, пожалуйста, номер вашего заказа.', type: 'text', timestamp: '10:35', read: true },
      { id: 'm4', conversationId: 'c001', senderId: 'client1', senderName: 'Александра Морозова', senderRole: 'client',
        text: 'ORD-2026-004821', type: 'order_ref', orderRef: 'ORD-2026-004821', timestamp: '10:36', read: true },
      { id: 'm5', conversationId: 'c001', senderId: 'l1_agent1', senderName: 'Козлова Елена', senderRole: 'support_l1',
        text: 'Сейчас проверяю статус вашей посылки в системе...', type: 'text', timestamp: '11:47', read: false },
    ],
  },
  {
    id: 'c002', channel: 'support', status: 'escalated', priority: 'critical',
    subject: 'Требование возврата ₽12 000 — поврежд. товар',
    clientName: 'Дмитрий Соколов', clientId: 'client2', clientAvatar: 'ДС',
    assignedTo: 'l2_agent1', assignedToName: 'Попова Ирина',
    lastMessage: 'Передаю ваш вопрос руководителю отдела для решения.', lastMessageTime: '09:15',
    unread: 0, tags: ['возврат', 'претензия', 'эскалация'], orderRef: 'ORD-2026-003912',
    createdAt: '13.02.2026 16:40', escalationLevel: 2,
    messages: [
      { id: 'm10', conversationId: 'c002', senderId: 'bot', senderName: 'PVZ Bot', senderRole: 'bot',
        type: 'system', systemText: 'Чат начат · ORD-2026-003912', timestamp: '16:40', read: true },
      { id: 'm11', conversationId: 'c002', senderId: 'client2', senderName: 'Дмитрий Соколов', senderRole: 'client',
        text: 'Получил посылку с разбитым экраном! Требую полный возврат 12 000 рублей!', type: 'text', timestamp: '16:41', read: true },
      { id: 'm12', conversationId: 'c002', senderId: 'l1_agent1', senderName: 'Козлова Елена', senderRole: 'support_l1',
        text: 'Дмитрий, приношу искренние извинения за эту ситуацию. Для оформления возврата мне нужна ваша помощь.', type: 'text', timestamp: '16:45', read: true },
      { id: 'm13', conversationId: 'c002', senderId: 'l1_agent1', senderName: 'Козлова Елена', senderRole: 'support_l1',
        type: 'escalation', escalateTo: 'Попова Ирина (L2)', systemText: '⬆️ Эскалировано на L2 — Попова Ирина', timestamp: '16:50', read: true },
      { id: 'm14', conversationId: 'c002', senderId: 'l2_agent1', senderName: 'Попова Ирина', senderRole: 'support_l2',
        text: 'Дмитрий, я руководитель второй линии поддержки. Передаю ваш вопрос руководителю отдела для решения.', type: 'text', timestamp: '09:15', read: true },
    ],
  },
  {
    id: 'c003', channel: 'support', status: 'open', priority: 'normal',
    subject: 'В��прос о режиме работы ПВЗ MSK-014',
    clientName: 'Наталья Козлова', clientId: 'client3', clientAvatar: 'НК',
    assignedTo: undefined, assignedToName: undefined,
    lastMessage: 'Подскажие, работает ли ПВЗ в воскресенье?', lastMessageTime: '11:02',
    unread: 1, tags: ['информация', 'пвз'], createdAt: '14.02.2026 11:00',
    messages: [
      { id: 'm20', conversationId: 'c003', senderId: 'bot', senderName: 'PVZ Bot', senderRole: 'bot',
        type: 'system', systemText: 'Новый чат · ожидает назначения агента', timestamp: '11:00', read: true },
      { id: 'm21', conversationId: 'c003', senderId: 'client3', senderName: 'Наталья Козлова', senderRole: 'client',
        text: 'Подскажите, работает ли ПВЗ на Ленина, 42 в воскресенье?', type: 'text', timestamp: '11:02', read: false },
    ],
  },
  {
    id: 'c004', channel: 'support', status: 'open', priority: 'low',
    subject: 'Как изменить адрес доставки?',
    clientName: 'Иван Петров', clientId: 'client4', clientAvatar: 'ИП',
    assignedTo: 'l1_agent2', assignedToName: 'Смирнов Антон',
    lastMessage: 'Уже перенаправил ваш заказ на новый адрес.', lastMessageTime: '10:55',
    unread: 0, tags: ['адрес', 'заказ'], createdAt: '14.02.2026 10:40',
    messages: [
      { id: 'm30', conversationId: 'c004', senderId: 'client4', senderName: 'Иван Петров', senderRole: 'client',
        text: 'Хочу изменить адрес доставки. Заказ ORD-2026-004750', type: 'text', timestamp: '10:41', read: true },
      { id: 'm31', conversationId: 'c004', senderId: 'l1_agent2', senderName: 'Смирнов Антон', senderRole: 'support_l1',
        text: 'Уже перенаправил ваш заказ на новый адрес. Укажите новый адрес?', type: 'text', timestamp: '10:55', read: true },
    ],
  },
  // ── COURIERS ──
  {
    id: 'c010', channel: 'couriers', status: 'in_progress', priority: 'high',
    subject: 'Курьер Алексей К. — Проблема с доставкой',
    clientName: 'Курьер Алексей К.', clientId: 'courier1', clientAvatar: 'АК',
    assignedTo: 'l1_agent2', assignedToName: 'Смирнов Антон',
    lastMessage: 'Клиент не открывает дверь, что делать?', lastMessageTime: '11:30',
    unread: 3, tags: ['доставка', 'курьер'], linkedEntity: 'ORD-2026-004850',
    createdAt: '14.02.2026 11:25',
    messages: [
      { id: 'm40', conversationId: 'c010', senderId: 'courier1', senderName: 'Курье�� Алексей К.', senderRole: 'courier',
        text: 'Стою у адреса, клиент не отвечает на звонки уже 15 минут', type: 'text', timestamp: '11:25', read: true },
      { id: 'm41', conversationId: 'c010', senderId: 'l1_agent2', senderName: 'Смирнов Антон', senderRole: 'support_l1',
        text: 'Попробуйте позвонить ещё раз и написать SMS. Если не ответит в течение 5 минут — оформите возврат.', type: 'text', timestamp: '11:27', read: true },
      { id: 'm42', conversationId: 'c010', senderId: 'courier1', senderName: 'Курьер Алексей К.', senderRole: 'courier',
        text: 'Клиент не открывает дверь, что делать?', type: 'text', timestamp: '11:30', read: false },
    ],
  },
  {
    id: 'c011', channel: 'couriers', status: 'open', priority: 'normal',
    subject: 'Курьер Михаил Д. — Навигатор не работает',
    clientName: 'Курьер Михаил Д.', clientId: 'courier2', clientAvatar: 'МД',
    assignedTo: undefined,
    lastMessage: 'Навигатор постоянно зависает, не могу найти адрес', lastMessageTime: '10:18',
    unread: 1, tags: ['техника', 'навигация'], createdAt: '14.02.2026 10:15',
    messages: [
      { id: 'm50', conversationId: 'c011', senderId: 'courier2', senderName: 'Курьер Михаил Д.', senderRole: 'courier',
        text: 'Навигатор постоянно зависает, не могу найти адрес ул. Садовая 15', type: 'text', timestamp: '10:18', read: false },
    ],
  },
  // ── MERCHANTS ──
  {
    id: 'c020', channel: 'merchants', status: 'in_progress', priority: 'high',
    subject: 'Кафе «Уют» — Задержка курьера 40 мин',
    clientName: 'Кафе «Уют»', clientId: 'merchant1', clientAvatar: 'КУ',
    assignedTo: 'l1_agent1', assignedToName: 'Козлова Елена',
    lastMessage: 'Еда уже остыла, это недопустимо!', lastMessageTime: '12:05',
    unread: 2, tags: ['кафе', 'задержка', 'партнёр'], linkedEntity: 'ORD-2026-004901',
    createdAt: '14.02.2026 11:50',
    messages: [
      { id: 'm60', conversationId: 'c020', senderId: 'merchant1', senderName: 'Кафе «Уют»', senderRole: 'merchant',
        text: 'Заказ ORD-2026-004901 готов уже 40 минут, курьер до сих пор не приехал!', type: 'text', timestamp: '11:50', read: true },
      { id: 'm61', conversationId: 'c020', senderId: 'l1_agent1', senderName: 'Козлова Елена', senderRole: 'support_l1',
        text: 'Приносим извинения за задержку. Уже связываемся с курьером.', type: 'text', timestamp: '11:52', read: true },
      { id: 'm62', conversationId: 'c020', senderId: 'merchant1', senderName: 'Кафе «Уют»', senderRole: 'merchant',
        text: 'Еда уже остыла, это недопустимо!', type: 'text', timestamp: '12:05', read: false },
    ],
  },
  {
    id: 'c021', channel: 'merchants', status: 'open', priority: 'normal',
    subject: 'TechStore — Комиссия за март',
    clientName: 'TechStore MSK', clientId: 'merchant3', clientAvatar: 'ТМ',
    assignedTo: undefined,
    lastMessage: 'Прошу разъяснить расчёт комиссии за март 2026', lastMessageTime: '09:47',
    unread: 1, tags: ['финансы', 'комиссия'], createdAt: '14.02.2026 09:45',
    messages: [
      { id: 'm70', conversationId: 'c021', senderId: 'merchant3', senderName: 'TechStore MSK', senderRole: 'merchant',
        text: 'Добрый день! В выписке за март обнаружили расхождение — комиссия 12% вместо согласованных 8%. Прошу разъяснить расчёт.', type: 'text', timestamp: '09:47', read: false },
    ],
  },
  // ── INTERNAL ──
  {
    id: 'c030', channel: 'internal', status: 'open', priority: 'normal',
    subject: '🔒 Внутренний: Инцидент ПВЗ MSK-047',
    clientName: 'Захаров Виктор', clientId: 'lead1', clientAvatar: 'ЗВ',
    assignedTo: 'l2_agent1',
    lastMessage: 'Нужен отчёт по инциденту до конца дня', lastMessageTime: '11:00',
    unread: 1, tags: ['инцидент', 'пвз', 'внутренний'], linkedEntity: 'MSK-047',
    createdAt: '14.02.2026 09:00',
    messages: [
      { id: 'm80', conversationId: 'c030', senderId: 'bot', senderName: 'PVZ Bot', senderRole: 'bot',
        type: 'system', systemText: '🔒 Закрытый внутренний чат — только для сотрудников', timestamp: '09:00', read: true },
      { id: 'm81', conversationId: 'c030', senderId: 'lead1', senderName: 'Захаров Виктор', senderRole: 'support_lead',
        text: 'ПВЗ MSK-047 не выходил на связь с 08:30. Кто дежурный?', type: 'text', timestamp: '09:01', read: true },
      { id: 'm82', conversationId: 'c030', senderId: 'l2_agent1', senderName: 'Попова Ирина', senderRole: 'support_l2',
        text: 'Я дежурная, уже пытаюсь дозвониться до оператора.', type: 'text', timestamp: '09:05', read: true },
      { id: 'm83', conversationId: 'c030', senderId: 'lead1', senderName: 'Захаров Виктор', senderRole: 'support_lead',
        text: 'Нужен отчёт по инциденту до конца дня.', type: 'text', timestamp: '11:00', read: false },
    ],
  },
  {
    id: 'c031', channel: 'internal', status: 'open', priority: 'low',
    subject: '🔒 Внутренний: Совещание по KPI февраль',
    clientName: 'Администратор Системы', clientId: 'admin1', clientAvatar: 'АС',
    assignedTo: undefined,
    lastMessage: 'Прикреплю отчёт к 17:00', lastMessageTime: '10:30',
    unread: 0, tags: ['kpi', 'внутренний', 'совещание'],
    createdAt: '14.02.2026 08:00',
    messages: [
      { id: 'm90', conversationId: 'c031', senderId: 'admin1', senderName: 'Администратор Системы', senderRole: 'admin',
        text: 'Коллеги, сегодня в 15:00 совещание по итогам февраля. Прошу подготовить KPI по вашим направлениям.', type: 'text', timestamp: '08:00', read: true },
      { id: 'm91', conversationId: 'c031', senderId: 'lead1', senderName: 'Захаров Виктор', senderRole: 'support_lead',
        text: 'Прикреплю отчёт к 17:00', type: 'text', timestamp: '10:30', read: true },
    ],
  },
  // ── CLOSED ──
  {
    id: 'c040', channel: 'closed', status: 'resolved', priority: 'normal',
    subject: 'Вопрос о стоимости доставки — решён',
    clientName: 'Светлана Новикова', clientId: 'client5', clientAvatar: 'СН',
    assignedTo: 'l1_agent1', assignedToName: 'Козлова Елена',
    lastMessage: 'Спасибо, вопрос решён!', lastMessageTime: '13.02.2026',
    unread: 0, tags: ['доставка', 'тарифы', 'решён'],
    createdAt: '13.02.2026 14:00', resolvedAt: '13.02.2026 14:45',
    csat: 5, csatByName: 'Козлова Елена', csatById: 'l1_agent1',
    resolutionCode: 'SOLVED',
    resolutionNote: 'Клиент уточнил тариф доставки в Подмосковье. Предоставлена актуальная тарифная сетка. Вопрос закрыт полностью, клиент доволен.',
    messages: [
      { id: 'm100', conversationId: 'c040', senderId: 'bot', senderName: 'PVZ Bot', senderRole: 'bot',
        type: 'system', systemText: 'Чат начат · Клиент: Светлана Новикова', timestamp: '14:00', read: true },
      { id: 'm101', conversationId: 'c040', senderId: 'client5', senderName: 'Светлана Новикова', senderRole: 'client',
        text: 'Добрый день! Подскажите, сколько стоит доставка в Подмосковье? У меня посылка примерно 3 кг.', type: 'text', timestamp: '14:01', read: true },
      { id: 'm102', conversationId: 'c040', senderId: 'l1_agent1', senderName: 'Козлова Елена', senderRole: 'support_l1',
        text: 'Добрый день, Светлана! Рада помочь. Доставка в Подмосковье:\n• Зона 1 (до 30 км от МКАД): от ₽250\n• Зона 2 (30–60 км): от ₽350\n• Зона 3 (свыше 60 км): от ₽450\nДля посылки 3 кг наценка +₽30. Куда именно нужна доставка?', type: 'text', timestamp: '14:08', read: true },
      { id: 'm103', conversationId: 'c040', senderId: 'client5', senderName: 'Светлана Новикова', senderRole: 'client',
        text: 'Мне нужно в Химки. Это какая зона?', type: 'text', timestamp: '14:12', read: true },
      { id: 'm104', conversationId: 'c040', senderId: 'l1_agent1', senderName: 'Козлова Елена', senderRole: 'support_l1',
        text: 'Химки — Зона 1 (до 30 км от МКАД). Итого для вашей посылки: ₽280 с учётом веса. Хотите оформить доставку прямо сейчас?', type: 'text', timestamp: '14:15', read: true },
      { id: 'm105', conversationId: 'c040', senderId: 'client5', senderName: 'Светлана Новикова', senderRole: 'client',
        text: 'Нет, пока просто узнаю. Спасибо большое, вопрос решён!', type: 'text', timestamp: '14:44', read: true },
      { id: 'm106', conversationId: 'c040', senderId: 'l1_agent1', senderName: 'Козлова Елена', senderRole: 'support_l1',
        text: 'Пожалуйста, Светлана! Если понадобится оформить — обращайтесь, всегда поможем. Хорошего дня! 😊', type: 'text', timestamp: '14:45', read: true },
      { id: 'm107', conversationId: 'c040', senderId: 'bot', senderName: 'PVZ Bot', senderRole: 'bot',
        type: 'system', systemText: '✅ Чат закрыт · Козлова Елена · SOLVED · CSAT: 5/5', timestamp: '14:45', read: true },
    ],
  },
  {
    id: 'c041', channel: 'closed', status: 'resolved', priority: 'high',
    subject: 'Возврат ₽4 800 — повреждённый товар ORD-2026-003107',
    clientName: 'Иван Петров', clientId: 'client4', clientAvatar: 'ИП',
    assignedTo: 'l2_agent1', assignedToName: 'Попова Ирина',
    lastMessage: 'Деньги получил, спасибо за оперативность.', lastMessageTime: '01.02.2026',
    unread: 0, tags: ['возврат', 'повреждение', 'компенсация', 'решён'],
    createdAt: '01.02.2026 09:15', resolvedAt: '01.02.2026 11:40',
    csat: 4, csatByName: 'Попова Ирина', csatById: 'l2_agent1',
    resolutionCode: 'REFUND_ISSUED',
    resolutionNote: 'Подтверждено повреждение товара по фотографиям клиента. Возврат ₽4 800 оформлен на карту Сбербанк ***4421. Срок зачисления 2–5 рабочих дней. Промокод SORRY200 выдан как компенсация.',
    orderRef: 'ORD-2026-003107',
    messages: [
      { id: 'm200', conversationId: 'c041', senderId: 'bot', senderName: 'PVZ Bot', senderRole: 'bot',
        type: 'system', systemText: 'Обращение по заказу ORD-2026-003107 · Приоритет: Высокий', timestamp: '09:15', read: true },
      { id: 'm201', conversationId: 'c041', senderId: 'client4', senderName: 'Иван Петров', senderRole: 'client',
        text: 'Здравствуйте. Получил посылку — внутри разбита кружка. Заказ ORD-2026-003107. Прошу вернуть деньги.', type: 'text', timestamp: '09:15', read: true },
      { id: 'm202', conversationId: 'c041', senderId: 'client4', senderName: 'Иван Петров', senderRole: 'client',
        text: 'ORD-2026-003107', type: 'order_ref', orderRef: 'ORD-2026-003107', timestamp: '09:16', read: true },
      { id: 'm203', conversationId: 'c041', senderId: 'l1_agent1', senderName: 'Козлова Елена', senderRole: 'support_l1',
        text: 'Иван, добрый день! Приносим извинения. Для оформления возврата пришлите фото повреждённого товара и упаковки.', type: 'text', timestamp: '09:20', read: true },
      { id: 'm204', conversationId: 'c041', senderId: 'client4', senderName: 'Иван Петров', senderRole: 'client',
        text: '[📎 photo_damage_01.jpg — прикреплено]', type: 'text', timestamp: '09:28', read: true },
      { id: 'm205', conversationId: 'c041', senderId: 'client4', senderName: 'Иван Петров', senderRole: 'client',
        text: '[📎 photo_damage_02.jpg — прикреплено]', type: 'text', timestamp: '09:29', read: true },
      { id: 'm206', conversationId: 'c041', senderId: 'l1_agent1', senderName: 'Козлова Елена', senderRole: 'support_l1',
        text: 'Фотографии получила. Я��ное механическое повреждение. Сумма свыше ₽3 000 — нужно согласование L2. Передаю чат коллеге.', type: 'text', timestamp: '09:35', read: true },
      { id: 'm206e', conversationId: 'c041', senderId: 'bot', senderName: 'PVZ Bot', senderRole: 'bot',
        type: 'escalation', escalateTo: 'Попова Ирина (L2)', systemText: '⬆️ Передано на L2 — Попова Ирина (согласование возврата)', timestamp: '09:36', read: true },
      { id: 'm207', conversationId: 'c041', senderId: 'l2_agent1', senderName: 'Попова Ирина', senderRole: 'support_l2',
        text: 'Иван, здравствуйте! Я Ирина, старший специалист. Изучила фото — повреждение очевидное, наша вина. Оформляю возврат ₽4 800. На какую карту вернуть?', type: 'text', timestamp: '09:45', read: true },
      { id: 'm208', conversationId: 'c041', senderId: 'client4', senderName: 'Иван Петров', senderRole: 'client',
        text: 'Сбербанк, карта ***4421', type: 'text', timestamp: '09:50', read: true },
      { id: 'm209', conversationId: 'c041', senderId: 'l2_agent1', senderName: 'Попова Ирина', senderRole: 'support_l2',
        text: 'Принято. Возврат ₽4 800 оформлен на Сбербанк ***4421. Поступит в течение 2–5 рабочих дней. Приносим извинения.', type: 'text', timestamp: '10:02', read: true },
      { id: 'm210', conversationId: 'c041', senderId: 'l2_agent1', senderName: 'Попова Ирина', senderRole: 'support_l2',
        text: 'Также как компенсацию — промокод SORRY200 на ₽200 на следующий заказ. Действует 30 дней.', type: 'text', timestamp: '10:03', read: true },
      { id: 'm210n', conversationId: 'c041', senderId: 'l2_agent1', senderName: 'Попова Ирина', senderRole: 'support_l2',
        text: 'Акт о повреждении сформирован #ACT-2026-0201. Фото переданы в логистику для разбора с перевозчиком.', type: 'text', timestamp: '10:05', read: true, isInternal: true },
      { id: 'm211', conversationId: 'c041', senderId: 'client4', senderName: 'Иван Петров', senderRole: 'client',
        text: 'Деньги получил, спасибо за оперативность.', type: 'text', timestamp: '11:39', read: true },
      { id: 'm212', conversationId: 'c041', senderId: 'bot', senderName: 'PVZ Bot', senderRole: 'bot',
        type: 'system', systemText: '✅ Чат закрыт · Попова Ирина · REFUND_ISSUED · CSAT: 4/5', timestamp: '11:40', read: true },
    ],
  },
  {
    id: 'c042', channel: 'closed', status: 'closed', priority: 'normal',
    subject: 'Курьер Олег В. — Вопрос по переносу смены',
    clientName: 'Курьер Олег В.', clientId: 'courier3', clientAvatar: 'ОВ',
    assignedTo: 'l1_agent2', assignedToName: 'Смирнов Антон',
    lastMessage: 'Понял, спасибо. Всё ок.', lastMessageTime: '20.01.2026',
    unread: 0, tags: ['курьер', 'смена', 'расписание', 'решён'],
    createdAt: '20.01.2026 17:10', resolvedAt: '20.01.2026 17:35',
    csat: 3, csatByName: 'Смирнов Антон', csatById: 'l1_agent2',
    resolutionCode: 'SOLVED',
    resolutionNote: 'Курьер уточнил порядок переноса смены через приложение. Объяснена инструкция шаг за шагом. Нареканий нет.',
    messages: [
      { id: 'm300', conversationId: 'c042', senderId: 'bot', senderName: 'PVZ Bot', senderRole: 'bot',
        type: 'system', systemText: 'Обращение · Курьер Олег В.', timestamp: '17:10', read: true },
      { id: 'm301', conversationId: 'c042', senderId: 'courier3', senderName: 'Курьер Олег В.', senderRole: 'courier',
        text: 'Добрый вечер. Хочу поменять смену на 22 января — семейные обстоятельства. Как в приложении это сделать?', type: 'text', timestamp: '17:10', read: true },
      { id: 'm302', conversationId: 'c042', senderId: 'l1_agent2', senderName: 'Смирнов Антон', senderRole: 'support_l1',
        text: 'Олег, добрый вечер! В приложении Курьер: Главная → Мои смены → выберите 22 января → «Перенести смену». Доступные даты появятся автоматически.', type: 'text', timestamp: '17:18', read: true },
      { id: 'm303', conversationId: 'c042', senderId: 'courier3', senderName: 'Курьер Олег В.', senderRole: 'courier',
        text: 'Смотрю, но показывает только до 21-го. На 23-е и позже нет.', type: 'text', timestamp: '17:22', read: true },
      { id: 'm304', conversationId: 'c042', senderId: 'l1_agent2', senderName: 'Смирнов Антон', senderRole: 'support_l1',
        text: 'Это ограничение: переносить можно только в рамках текущей недели (пн–вс). Попробуйте потянуть список вниз — должно обновиться.', type: 'text', timestamp: '17:26', read: true },
      { id: 'm305', conversationId: 'c042', senderId: 'courier3', senderName: 'Курьер Олег В.', senderRole: 'courier',
        text: 'Обновил — появилось 23-е. Выбрал. Понял, спасибо. Всё ок.', type: 'text', timestamp: '17:34', read: true },
      { id: 'm306', conversationId: 'c042', senderId: 'l1_agent2', senderName: 'Смирнов Антон', senderRole: 'support_l1',
        text: 'Отлично! Перенос подтверждён. Удачной смены 23-го!', type: 'text', timestamp: '17:35', read: true },
      { id: 'm307', conversationId: 'c042', senderId: 'bot', senderName: 'PVZ Bot', senderRole: 'bot',
        type: 'system', systemText: '✅ Чат закрыт · Смирнов Антон · SOLVED · CSAT: 3/5', timestamp: '17:35', read: true },
    ],
  },
  {
    id: 'c043', channel: 'closed', status: 'resolved', priority: 'critical',
    subject: 'Срочно: ПВЗ MSK-014 — сбой сканера, очередь 15 человек',
    clientName: 'Кафе «Уют»', clientId: 'merchant1', clientAvatar: 'КУ',
    assignedTo: 'lead1', assignedToName: 'Захаров Виктор',
    lastMessage: 'Сканер заработал, принимаем посылки в штатном режиме.', lastMessageTime: '05.01.2026',
    unread: 0, tags: ['пвз', 'инцидент', 'сканер', 'критично', 'решён'],
    createdAt: '05.01.2026 08:45', resolvedAt: '05.01.2026 10:20',
    csat: 5, csatByName: 'Захаров Виктор', csatById: 'lead1',
    resolutionCode: 'SOLVED',
    resolutionNote: 'Сбой сканера ПВЗ MSK-014 устранён принудительной перезагрузкой прошивки. Простой 1 ч 35 мин. Уведомлено 12 клиентов. Альтернатива — ПВЗ MSK-019. Инцидент #INC-2026-0105.',
    messages: [
      { id: 'm400', conversationId: 'c043', senderId: 'bot', senderName: 'PVZ Bot', senderRole: 'bot',
        type: 'system', systemText: '🚨 КРИТИЧНЫЙ ИНЦИДЕНТ · ПВЗ MSK-014 · Сбой оборудования', timestamp: '08:45', read: true },
      { id: 'm401', conversationId: 'c043', senderId: 'merchant1', senderName: 'Кафе «Уют»', senderRole: 'merchant',
        text: 'ПВЗ MSK-014 не работает с 08:00! Сканер не берёт штрих-коды. Очередь из 8 человек, все нервничают. Когда починят?', type: 'text', timestamp: '08:45', read: true },
      { id: 'm402', conversationId: 'c043', senderId: 'l2_agent1', senderName: 'Попова Ирина', senderRole: 'support_l2',
        text: 'Приняли в работу! Уже звоним оператору ПВЗ и технику. Дайте 10 минут — сообщим о причине.', type: 'text', timestamp: '08:48', read: true },
      { id: 'm403', conversationId: 'c043', senderId: 'l2_agent1', senderName: 'Попова Ирина', senderRole: 'support_l2',
        text: 'Оператор MSK-014 (Громов А.В.) не отвечает. Пробуем резервный номер. Эскалирую руководителю.', type: 'text', timestamp: '08:52', read: true, isInternal: true },
      { id: 'm403e', conversationId: 'c043', senderId: 'bot', senderName: 'PVZ Bot', senderRole: 'bot',
        type: 'escalation', escalateTo: 'Захаров Виктор (Lead)', systemText: '⬆️ Инцидент эскалирован руководителю — Захаров Виктор', timestamp: '08:53', read: true },
      { id: 'm404', conversationId: 'c043', senderId: 'lead1', senderName: 'Захаров Виктор', senderRole: 'support_lead',
        text: 'Виктор Захаров, руководитель. Взял под личный контроль. Дозвонились до оператора — перезагружает сканер по нашей инструкции. Ещё 15 минут.', type: 'text', timestamp: '09:05', read: true },
      { id: 'm405', conversationId: 'c043', senderId: 'lead1', senderName: 'Захаров Виктор', senderRole: 'support_lead',
        text: 'Техник выехал на объект. Параллельно отправил инструкцию по перезагрузке прошивки. Если не поможет — перейдём на ручной ввод ШК.', type: 'text', timestamp: '09:10', read: true, isInternal: true },
      { id: 'm406', conversationId: 'c043', senderId: 'merchant1', senderName: 'Кафе «Уют»', senderRole: 'merchant',
        text: 'Очередь уже 15 человек. Люди уходят. Это серьёзный урон репутации.', type: 'text', timestamp: '09:30', read: true },
      { id: 'm407', conversationId: 'c043', senderId: 'lead1', senderName: 'Захаров Виктор', senderRole: 'support_lead',
        text: 'Понимаем. Всем клиентам в очереди предложен перенос в ПВЗ MSK-019 (ул. Садовая, 8 — 5 мин пешком). Информируем SMS. Оператор применяет процедуру перезагрузки прошивки прямо сейчас.', type: 'text', timestamp: '09:35', read: true },
      { id: 'm408', conversationId: 'c043', senderId: 'lead1', senderName: 'Захаров Виктор', senderRole: 'support_lead',
        text: 'Компенсация за простой: приоритетный слот для курьеров вашей точки на 7 дней. Формальный акт пришлём на email до конца дня.', type: 'text', timestamp: '09:40', read: true },
      { id: 'm409', conversationId: 'c043', senderId: 'merchant1', senderName: 'Кафе «Уют»', senderRole: 'merchant',
        text: 'Сканер заработал, принимаем посылки в штатном режиме.', type: 'text', timestamp: '10:18', read: true },
      { id: 'm410', conversationId: 'c043', senderId: 'lead1', senderName: 'Захаров Виктор', senderRole: 'support_lead',
        text: 'Отлично! Рады, что устранили. Простой задокументирован #INC-2026-0105. Приоритетный слот активирован. Приносим извинения.', type: 'text', timestamp: '10:20', read: true },
      { id: 'm411', conversationId: 'c043', senderId: 'bot', senderName: 'PVZ Bot', senderRole: 'bot',
        type: 'system', systemText: '✅ Инцидент закрыт · Захаров Виктор · SOLVED · CSAT: 5/5 · Время устранения: 1ч 35мин', timestamp: '10:20', read: true },
    ],
  },
  {
    id: 'c044', channel: 'closed', status: 'closed', priority: 'normal',
    subject: 'Дубликат: повторное обращение по ORD-2026-003912',
    clientName: 'Дмитрий Соколов', clientId: 'client2', clientAvatar: 'ДС',
    assignedTo: 'l1_agent1', assignedToName: 'Козлова Елена',
    lastMessage: 'Понял, буду ждать решения по основному тикету.', lastMessageTime: '10.02.2026',
    unread: 0, tags: ['дубликат', 'возврат'],
    createdAt: '10.02.2026 16:00', resolvedAt: '10.02.2026 16:12',
    csat: undefined, csatByName: undefined,
    resolutionCode: 'DUPLICATE',
    resolutionNote: 'Клиент открыл повторный чат по уже существующему кейсу c002 (ORD-2026-003912). Проинформирован, что обращение в работе у Поповой Ирины (L2). Дубликат закрыт.',
    orderRef: 'ORD-2026-003912',
    messages: [
      { id: 'm500', conversationId: 'c044', senderId: 'client2', senderName: 'Дмитрий Соколов', senderRole: 'client',
        text: 'Никто не отвечает уже 2 дня! Я писал про возврат 12 000 рублей за разбитый экран. Где мои деньги?', type: 'text', timestamp: '16:00', read: true },
      { id: 'm501', conversationId: 'c044', senderId: 'l1_agent1', senderName: 'Козлова Елена', senderRole: 'support_l1',
        text: 'Дмитрий, добрый день! Проверяю... По заказу ORD-2026-003912 уже открыт активный кейс, который ведёт Попова Ирина (L2). Статус: «Эскалировано». Срок ответа: сегодня до 18:00.', type: 'text', timestamp: '16:07', read: true },
      { id: 'm502', conversationId: 'c044', senderId: 'l1_agent1', senderName: 'Козлова Елена', senderRole: 'support_l1',
        text: 'Уведомила Попову Ирину о повторном обращении. Попросила ускорить ответ.', type: 'text', timestamp: '16:08', read: true, isInternal: true },
      { id: 'm503', conversationId: 'c044', senderId: 'client2', senderName: 'Дмитрий Соколов', senderRole: 'client',
        text: 'Понял, буду ждать решения по основному тикету.', type: 'text', timestamp: '16:11', read: true },
      { id: 'm504', conversationId: 'c044', senderId: 'bot', senderName: 'PVZ Bot', senderRole: 'bot',
        type: 'system', systemText: '✅ Закрыт как дубликат · Козлова Елена · DUPLICATE', timestamp: '16:12', read: true },
    ],
  },
];

// ─── Quick reply templates ────────────────────────────────────────────────────

export interface QuickReply {
  id: string;
  label: string;
  text: string;
  channel: ChatChannel | 'all';
}

export const QUICK_REPLIES: QuickReply[] = [
  { id: 'q1', label: 'Приветствие', text: 'Добрый день! Рад помочь вам. Как я могу решить ваш вопрос?', channel: 'all' },
  { id: 'q2', label: 'Проверяем', text: 'Понял вас, уже проверяю информацию по вашему обращению. Дайте мне пару минут.', channel: 'all' },
  { id: 'q3', label: 'Извинение', text: 'Приносим искренние извинения за доставленные неудобства. Мы уже работаем над решением.', channel: 'all' },
  { id: 'q4', label: 'Возврат', text: 'Для оформления возврата мне потребуется номер заказа, фото повреждения и ваши банковские реквизиты.', channel: 'support' },
  { id: 'q5', label: 'Оформить возврат', text: 'Если клиент не открывает дверь в течение 10 минут — сфотографируйте подъезд и оформите возврат в приложении.', channel: 'couriers' },
  { id: 'q6', label: 'Курьер едет', text: 'Курьер уже выехал к вам! Ориентировочное время прибытия — 15-20 минут.', channel: 'merchants' },
  { id: 'q7', label: 'Эскалация', text: 'Ваш вопрос требует привлечения специалиста более высокого уровня. Передаю ваш чат — ответят в течение 15 минут.', channel: 'all' },
  { id: 'q8', label: 'Закрыть чат', text: 'Ваш вопрос решён. Оцените, пожалуйста, качество нашей поддержки от 1 до 5. Спасибо за обращение!', channel: 'all' },
];

// ─── Chat roles & permissions ─────────────────────────────────────────────────

export interface AgentPermissions {
  canReply: boolean;
  canAssign: boolean;
  canEscalate: boolean;
  canClose: boolean;
  canViewInternal: boolean;
  canAddInternal: boolean;
  canViewAll: boolean;
  canManageAgents: boolean;
}

export const AGENT_ROLES: Record<AgentRole, AgentPermissions> = {
  l1: {
    canReply: true, canAssign: false, canEscalate: true, canClose: true,
    canViewInternal: true, canAddInternal: true, canViewAll: false, canManageAgents: false,
  },
  l2: {
    canReply: true, canAssign: true, canEscalate: true, canClose: true,
    canViewInternal: true, canAddInternal: true, canViewAll: true, canManageAgents: false,
  },
  lead: {
    canReply: true, canAssign: true, canEscalate: true, canClose: true,
    canViewInternal: true, canAddInternal: true, canViewAll: true, canManageAgents: true,
  },
  admin: {
    canReply: true, canAssign: true, canEscalate: true, canClose: true,
    canViewInternal: true, canAddInternal: true, canViewAll: true, canManageAgents: true,
  },
  readonly: {
    canReply: false, canAssign: false, canEscalate: false, canClose: false,
    canViewInternal: false, canAddInternal: false, canViewAll: true, canManageAgents: false,
  },
};