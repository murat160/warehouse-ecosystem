// ─── Types ──────────────────────────────────────────────────────────────────

export type CourierType = 'fast_delivery' | 'warehouse_delivery';
export type FastStatus = 'online' | 'waiting_order' | 'picking_order' | 'delivering' | 'offline';
export type WarehouseStatus = 'online' | 'on_task' | 'offline';
export type CourierStatus = FastStatus | WarehouseStatus;
export type Vehicle = 'bike' | 'scooter' | 'car' | 'van' | 'truck' | 'foot';
export type TaskType = 'warehouse_pvz' | 'pvz_warehouse' | 'warehouse_client' | 'return';
export type ContractType = 'employment' | 'gig' | 'self_employed';

export interface CourierOrder {
  id: string;
  date: string;
  time: string;
  status: 'completed' | 'cancelled' | 'problem';
  restaurantName: string;
  restaurantAddr: string;
  clientAddr: string;
  distance: number;
  duration: number;
  orderAmount: number;
  courierFee: number;
  tip: number;
  bonus: number;
  fine: number;
  clientRating?: number;
  cancelReason?: string;
  problemDesc?: string;
}

export interface WarehouseTask {
  id: string;
  date: string;
  time: string;
  type: TaskType;
  status: 'pending' | 'in_progress' | 'completed' | 'problem';
  fromName: string;
  fromAddr: string;
  toName: string;
  toAddr: string;
  packages: number;
  items: number;
  weight: number;
  manifest: string;
  fee: number;
  problemDesc?: string;
}

export interface ShiftRecord {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  deliveries: number;
  earnings: number;
  status: 'completed' | 'partial' | 'cancelled';
}

export interface DailyFinance {
  date: string;
  label: string;
  deliveries: number;
  earnings: number;
  tips: number;
  bonuses: number;
  fines: number;
  net: number;
}

export interface CourierDocument {
  id: string;
  type: 'passport' | 'license' | 'insurance' | 'photo' | 'medical' | 'other';
  name: string;
  status: 'valid' | 'expired' | 'pending' | 'missing';
  issuedAt: string;
  expiresAt: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: string;
  action: string;
  field?: string;
  before?: string;
  after?: string;
}

export interface ChatMessage {
  id: string;
  from: 'admin' | 'courier';
  senderName: string;
  text: string;
  time: string;
  read: boolean;
}

export interface Courier {
  id: string;
  courier_type: CourierType;
  name: string;
  phone: string;
  email: string;
  avatar: string;
  status: CourierStatus;
  vehicle: Vehicle;
  zone: string;
  region: string;
  registeredAt: string;
  lastOnline: string;
  rating: number;
  totalOrders: number;
  completedToday: number;
  activeOrders: number;
  cancelRate: number;
  problemRate: number;
  earningsToday: number;
  earningsTotal: number;
  blocked: boolean;
  contractType: ContractType;
  contractStatus: 'active' | 'expired' | 'pending';
  contractDate: string;
  contractExpiry: string;
  gpsLat: number;
  gpsLng: number;
  gpsUpdated: string;
  // Fast delivery
  currentOrderId?: string;
  avgDeliveryMin?: number;
  pickupLat?: number;
  pickupLng?: number;
  deliveryLat?: number;
  deliveryLng?: number;
  currentRestaurant?: string;
  currentClient?: string;
  // Warehouse
  currentTaskId?: string;
  currentTaskType?: TaskType;
  // History
  orders: CourierOrder[];
  tasks: WarehouseTask[];
  shifts: ShiftRecord[];
  dailyFinance: DailyFinance[];
  documents: CourierDocument[];
  auditLog: AuditEntry[];
  chatHistory: ChatMessage[];
}

// ─── Seed-based generator ────────────────────────────────────────────────────

function mkRand(seed: number) {
  let s = (seed * 16807 + 1) % 2147483647;
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}

const RESTAURANTS = ['Кафе «Уют»', 'Burger King', 'KFC', 'Pizza House', 'Суши-бар «Токио»', 'Starbucks', 'Shawarma Pro', 'Mama Roma', 'Poke House', 'Dodo Pizza'];
const STREETS_FROM = ['ул. Тверская, 14', 'пр. Мира, 32', 'ул. Арбат, 7', 'Садовая ул., 19', 'ул. Покровка, 4', 'Невский пр., 55', 'ул. Ленина, 22'];
const STREETS_TO = ['ул. Щепкина, 3', 'Проспект Мира, 41', 'ул. Чехова, 8', 'ул. Охотный Ряд, 2', 'ул. Фадеева, 12', 'ул. Грузинская, 5', 'пр. Академика, 18'];
const CANCEL_REASONS = ['Клиент отменил', 'Ресторан закрыт', 'Нет доступа к подъезду', 'Долгое ожидание'];
const PROBLEM_DESCS = ['Клиент не берёт трубку', 'Адрес не найден', 'Повреждённый заказ', 'Недостача в заказе'];

const WH_FROM = ['Склад Центральный', 'ПВЗ-001 Арбат', 'Склад Северный', 'ПВЗ-014 Митино', 'Склад Южный'];
const WH_TO = ['ПВЗ-007 Таганка', 'Склад Восточный', 'ул. Новослободская, 28', 'ПВЗ-022 Люберцы', 'ПВЗ-033 Бутово'];
const TASK_TYPES: TaskType[] = ['warehouse_pvz', 'pvz_warehouse', 'warehouse_client', 'return'];

function genOrders(id: string, count: number): CourierOrder[] {
  const rnd = mkRand(id.charCodeAt(0) * 31 + 7);
  const orders: CourierOrder[] = [];
  for (let i = 0; i < count; i++) {
    const day = Math.floor(rnd() * 30);
    const date = new Date(); date.setDate(date.getDate() - day);
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dateStr = `${dd}.${mm}.${date.getFullYear()}`;
    const h = String(8 + Math.floor(rnd() * 14)).padStart(2, '0');
    const m = String(Math.floor(rnd() * 60)).padStart(2, '0');
    const roll = rnd();
    const status = roll > 0.85 ? 'cancelled' : roll > 0.78 ? 'problem' : 'completed';
    const fee = 120 + Math.floor(rnd() * 180);
    const tip = status === 'completed' ? Math.floor(rnd() * 150) : 0;
    const bonus = status === 'completed' && rnd() > 0.7 ? 50 + Math.floor(rnd() * 100) : 0;
    const fine = status === 'problem' && rnd() > 0.5 ? 100 + Math.floor(rnd() * 200) : 0;
    orders.push({
      id: `ord-${id}-${i}`,
      date: dateStr,
      time: `${h}:${m}`,
      status,
      restaurantName: RESTAURANTS[Math.floor(rnd() * RESTAURANTS.length)],
      restaurantAddr: STREETS_FROM[Math.floor(rnd() * STREETS_FROM.length)],
      clientAddr: STREETS_TO[Math.floor(rnd() * STREETS_TO.length)],
      distance: +(1.2 + rnd() * 8.8).toFixed(1),
      duration: 10 + Math.floor(rnd() * 40),
      orderAmount: 400 + Math.floor(rnd() * 3600),
      courierFee: fee,
      tip,
      bonus,
      fine,
      clientRating: status === 'completed' ? (rnd() > 0.15 ? 5 : rnd() > 0.5 ? 4 : 3) : undefined,
      cancelReason: status === 'cancelled' ? CANCEL_REASONS[Math.floor(rnd() * CANCEL_REASONS.length)] : undefined,
      problemDesc: status === 'problem' ? PROBLEM_DESCS[Math.floor(rnd() * PROBLEM_DESCS.length)] : undefined,
    });
  }
  return orders.sort((a, b) => b.date.localeCompare(a.date));
}

function genTasks(id: string, count: number): WarehouseTask[] {
  const rnd = mkRand(id.charCodeAt(0) * 53 + 11);
  const tasks: WarehouseTask[] = [];
  for (let i = 0; i < count; i++) {
    const day = Math.floor(rnd() * 30);
    const date = new Date(); date.setDate(date.getDate() - day);
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dateStr = `${dd}.${mm}.${date.getFullYear()}`;
    const h = String(7 + Math.floor(rnd() * 12)).padStart(2, '0');
    const m = String(Math.floor(rnd() * 60)).padStart(2, '0');
    const type = TASK_TYPES[Math.floor(rnd() * TASK_TYPES.length)];
    const roll = rnd();
    const status = roll > 0.92 ? 'problem' : roll > 0.08 ? 'completed' : 'pending';
    tasks.push({
      id: `task-${id}-${i}`,
      date: dateStr,
      time: `${h}:${m}`,
      type,
      status,
      fromName: WH_FROM[Math.floor(rnd() * WH_FROM.length)],
      fromAddr: STREETS_FROM[Math.floor(rnd() * STREETS_FROM.length)],
      toName: WH_TO[Math.floor(rnd() * WH_TO.length)],
      toAddr: STREETS_TO[Math.floor(rnd() * STREETS_TO.length)],
      packages: 1 + Math.floor(rnd() * 24),
      items: 1 + Math.floor(rnd() * 80),
      weight: +(0.5 + rnd() * 49.5).toFixed(1),
      manifest: `МН-${2024000 + Math.floor(rnd() * 9999)}`,
      fee: 200 + Math.floor(rnd() * 600),
      problemDesc: status === 'problem' ? 'Адресат отсутствует, оставлено уведомление' : undefined,
    });
  }
  return tasks.sort((a, b) => b.date.localeCompare(a.date));
}

function genShifts(id: string): ShiftRecord[] {
  const rnd = mkRand(id.charCodeAt(0) * 17 + 3);
  const shifts: ShiftRecord[] = [];
  for (let i = 0; i < 14; i++) {
    const day = new Date(); day.setDate(day.getDate() - i);
    const dd = String(day.getDate()).padStart(2, '0');
    const mm = String(day.getMonth() + 1).padStart(2, '0');
    const dateStr = `${dd}.${mm}.${day.getFullYear()}`;
    const startH = 7 + Math.floor(rnd() * 4);
    const dur = 6 + rnd() * 6;
    const endH = startH + Math.floor(dur);
    const deliveries = Math.floor(5 + rnd() * 20);
    const earnings = deliveries * (100 + Math.floor(rnd() * 100));
    const roll = rnd();
    shifts.push({
      id: `sh-${id}-${i}`,
      date: dateStr,
      startTime: `${String(startH).padStart(2, '0')}:${String(Math.floor(rnd() * 60)).padStart(2, '0')}`,
      endTime: `${String(Math.min(endH, 23)).padStart(2, '0')}:${String(Math.floor(rnd() * 60)).padStart(2, '0')}`,
      durationHours: +dur.toFixed(1),
      deliveries,
      earnings,
      status: roll > 0.93 ? 'cancelled' : roll > 0.85 ? 'partial' : 'completed',
    });
  }
  return shifts;
}

function genDailyFinance(id: string): DailyFinance[] {
  const rnd = mkRand(id.charCodeAt(0) * 29 + 5);
  const DAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const result: DailyFinance[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const deliveries = Math.floor(3 + rnd() * 18);
    const earnings = deliveries * (110 + Math.floor(rnd() * 80));
    const tips = Math.floor(rnd() * 300);
    const bonuses = rnd() > 0.6 ? Math.floor(50 + rnd() * 200) : 0;
    const fines = rnd() > 0.85 ? Math.floor(100 + rnd() * 300) : 0;
    result.push({
      date: `${dd}.${mm}.${d.getFullYear()}`,
      label: DAYS[d.getDay()],
      deliveries,
      earnings,
      tips,
      bonuses,
      fines,
      net: earnings + tips + bonuses - fines,
    });
  }
  return result;
}

function genDocuments(type: CourierType): CourierDocument[] {
  const today = new Date();
  const fmt = (d: Date) => `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
  const addYears = (d: Date, y: number) => { const r = new Date(d); r.setFullYear(r.getFullYear() + y); return r; };
  const docs: CourierDocument[] = [
    { id: 'd1', type: 'passport', name: 'Паспорт РФ', status: 'valid', issuedAt: fmt(new Date(2018,5,15)), expiresAt: fmt(addYears(today, 10)) },
    { id: 'd2', type: 'photo', name: 'Фото профиля', status: 'valid', issuedAt: fmt(new Date(2024,0,10)), expiresAt: '—' },
    { id: 'd3', type: 'medical', name: 'Медицинская справка', status: 'valid', issuedAt: fmt(new Date(2024,3,1)), expiresAt: fmt(addYears(today, 1)) },
  ];
  if (type === 'fast_delivery') {
    docs.push({ id: 'd4', type: 'insurance', name: 'Страхование ОСАГО', status: 'valid', issuedAt: fmt(new Date(2024,0,1)), expiresAt: fmt(addYears(today, 1)) });
  } else {
    docs.push({ id: 'd4', type: 'license', name: 'Водительское удостоверение', status: 'valid', issuedAt: fmt(new Date(2019,8,20)), expiresAt: fmt(addYears(today, 8)) });
    docs.push({ id: 'd5', type: 'insurance', name: 'Страховой полис ТС', status: 'valid', issuedAt: fmt(new Date(2024,2,15)), expiresAt: fmt(addYears(today, 1)) });
    docs.push({ id: 'd6', type: 'other', name: 'Допуск к складским операциям', status: 'valid', issuedAt: fmt(new Date(2024,0,5)), expiresAt: fmt(addYears(today, 2)) });
  }
  return docs;
}

function genAudit(name: string): AuditEntry[] {
  return [
    { id: 'a1', timestamp: '09.03.2026 10:14', actor: 'Захаров Виктор', actorRole: 'Руководитель', action: 'Просмотр профиля курьера', },
    { id: 'a2', timestamp: '07.03.2026 14:32', actor: 'Смирнов Антон', actorRole: 'Администратор', action: 'Изменение зоны доставки', field: 'zone', before: 'Центр', after: 'Север' },
    { id: 'a3', timestamp: '05.03.2026 09:05', actor: 'Козлова Елена', actorRole: 'Супервайзер', action: 'Отправлено уведомление', field: 'notification', after: 'Напоминание о плановой поверке транспорта' },
    { id: 'a4', timestamp: '01.03.2026 16:48', actor: 'Системный процесс', actorRole: 'System', action: 'Обновлён статус контракта', field: 'contractStatus', before: 'pending', after: 'active' },
    { id: 'a5', timestamp: '28.02.2026 11:00', actor: 'Захаров Виктор', actorRole: 'Руководитель', action: 'Изменён тип транспорта', field: 'vehicle', before: 'bike', after: 'scooter' },
  ];
}

function genChat(courierName: string): ChatMessage[] {
  return [
    { id: 'cm1', from: 'admin', senderName: 'Администратор', text: 'Добрый день! Проверьте, пожалуйста, накладную МН-2024031.', time: '09:14', read: true },
    { id: 'cm2', from: 'courier', senderName: courierName, text: 'Добрый день, проверил — всё в порядке, накладная подписана.', time: '09:22', read: true },
    { id: 'cm3', from: 'admin', senderName: 'Администратор', text: 'Отлично, спасибо! Можете выдвигаться на следующую точку.', time: '09:23', read: true },
    { id: 'cm4', from: 'courier', senderName: courierName, text: 'Понял, уже в пути.', time: '09:24', read: true },
    { id: 'cm5', from: 'admin', senderName: 'Администратор', text: 'Напоминаю: сегодня плановая инвентаризация в 17:00 на складе Центральный.', time: '11:02', read: false },
  ];
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

export const COURIERS_MOCK: Courier[] = [
  {
    id: '1', courier_type: 'fast_delivery', name: 'Иванов Иван Сергеевич', phone: '+7 (999) 111-11-11',
    email: 'ivanov@pvz-platform.ru', avatar: 'ИИ', status: 'delivering', vehicle: 'bike',
    zone: 'Центр', region: 'Москва', registeredAt: '12.04.2023', lastOnline: '1 мин назад',
    rating: 4.9, totalOrders: 1847, completedToday: 12, activeOrders: 1,
    cancelRate: 2.1, problemRate: 1.4, earningsToday: 2340, earningsTotal: 187600,
    blocked: false, contractType: 'gig', contractStatus: 'active',
    contractDate: '12.04.2023', contractExpiry: '12.04.2027',
    gpsLat: 55.7558, gpsLng: 37.6173, gpsUpdated: '1 мин назад',
    currentOrderId: 'ord-1-0', avgDeliveryMin: 22,
    pickupLat: 55.7620, pickupLng: 37.6050,
    deliveryLat: 55.7490, deliveryLng: 37.6310,
    currentRestaurant: 'Burger King, ул. Тверская, 14',
    currentClient: 'ул. Щепкина, 3',
    orders: genOrders('1', 40), tasks: [], shifts: genShifts('1'),
    dailyFinance: genDailyFinance('1'), documents: genDocuments('fast_delivery'),
    auditLog: genAudit('Иванов Иван'), chatHistory: genChat('Иванов И.'),
  },
  {
    id: '2', courier_type: 'fast_delivery', name: 'Петров Пётр Алексеевич', phone: '+7 (999) 222-22-22',
    email: 'petrov@pvz-platform.ru', avatar: 'ПП', status: 'waiting_order', vehicle: 'car',
    zone: 'Север', region: 'Москва', registeredAt: '02.08.2022', lastOnline: '2 мин назад',
    rating: 4.7, totalOrders: 2310, completedToday: 8, activeOrders: 0,
    cancelRate: 3.5, problemRate: 2.1, earningsToday: 1560, earningsTotal: 234500,
    blocked: false, contractType: 'self_employed', contractStatus: 'active',
    contractDate: '02.08.2022', contractExpiry: '02.08.2026',
    gpsLat: 55.7820, gpsLng: 37.5950, gpsUpdated: '2 мин назад',
    avgDeliveryMin: 27,
    orders: genOrders('2', 35), tasks: [], shifts: genShifts('2'),
    dailyFinance: genDailyFinance('2'), documents: genDocuments('fast_delivery'),
    auditLog: genAudit('Петров Пётр'), chatHistory: genChat('Петров П.'),
  },
  {
    id: '3', courier_type: 'fast_delivery', name: 'Сидорова Мария Игоревна', phone: '+7 (999) 333-33-33',
    email: 'sidorova@pvz-platform.ru', avatar: 'СМ', status: 'picking_order', vehicle: 'scooter',
    zone: 'Юг', region: 'Москва', registeredAt: '19.01.2024', lastOnline: '30 сек назад',
    rating: 4.8, totalOrders: 980, completedToday: 15, activeOrders: 1,
    cancelRate: 1.8, problemRate: 0.9, earningsToday: 2910, earningsTotal: 98200,
    blocked: false, contractType: 'gig', contractStatus: 'active',
    contractDate: '19.01.2024', contractExpiry: '19.01.2028',
    gpsLat: 55.7200, gpsLng: 37.6400, gpsUpdated: '30 сек назад',
    currentOrderId: 'ord-3-0', avgDeliveryMin: 19,
    pickupLat: 55.7250, pickupLng: 37.6350,
    deliveryLat: 55.7150, deliveryLng: 37.6500,
    currentRestaurant: 'Суши-бар «Токио», пр. Мира, 32',
    currentClient: 'ул. Чехова, 8',
    orders: genOrders('3', 28), tasks: [], shifts: genShifts('3'),
    dailyFinance: genDailyFinance('3'), documents: genDocuments('fast_delivery'),
    auditLog: genAudit('Сидорова Мария'), chatHistory: genChat('Сидорова М.'),
  },
  {
    id: '4', courier_type: 'fast_delivery', name: 'Козлов Константин Владимирович', phone: '+7 (999) 444-44-44',
    email: 'kozlov@pvz-platform.ru', avatar: 'КК', status: 'offline', vehicle: 'bike',
    zone: 'Восток', region: 'Москва', registeredAt: '07.11.2023', lastOnline: '1 ч назад',
    rating: 4.6, totalOrders: 1250, completedToday: 10, activeOrders: 0,
    cancelRate: 4.2, problemRate: 2.8, earningsToday: 1950, earningsTotal: 125000,
    blocked: false, contractType: 'gig', contractStatus: 'active',
    contractDate: '07.11.2023', contractExpiry: '07.11.2027',
    gpsLat: 55.7650, gpsLng: 37.7200, gpsUpdated: '1 ч назад',
    avgDeliveryMin: 31,
    orders: genOrders('4', 32), tasks: [], shifts: genShifts('4'),
    dailyFinance: genDailyFinance('4'), documents: genDocuments('fast_delivery'),
    auditLog: genAudit('Козлов Константин'), chatHistory: genChat('Козлов К.'),
  },
  {
    id: '5', courier_type: 'fast_delivery', name: 'Новиков Николай Дмитриевич', phone: '+7 (999) 555-55-55',
    email: 'novikov@pvz-platform.ru', avatar: 'НН', status: 'online', vehicle: 'bike',
    zone: 'Запад', region: 'Москва', registeredAt: '14.06.2024', lastOnline: '5 мин назад',
    rating: 4.9, totalOrders: 620, completedToday: 6, activeOrders: 0,
    cancelRate: 1.1, problemRate: 0.5, earningsToday: 1170, earningsTotal: 62400,
    blocked: false, contractType: 'gig', contractStatus: 'active',
    contractDate: '14.06.2024', contractExpiry: '14.06.2028',
    gpsLat: 55.7500, gpsLng: 37.5200, gpsUpdated: '5 мин назад',
    avgDeliveryMin: 24,
    orders: genOrders('5', 20), tasks: [], shifts: genShifts('5'),
    dailyFinance: genDailyFinance('5'), documents: genDocuments('fast_delivery'),
    auditLog: genAudit('Новиков Николай'), chatHistory: genChat('Новиков Н.'),
  },
  {
    id: '6', courier_type: 'fast_delivery', name: 'Морозова Анна Викторовна', phone: '+7 (999) 666-66-66',
    email: 'morozova@pvz-platform.ru', avatar: 'МА', status: 'delivering', vehicle: 'car',
    zone: 'Центр', region: 'Москва', registeredAt: '28.09.2021', lastOnline: '1 мин назад',
    rating: 5.0, totalOrders: 3410, completedToday: 14, activeOrders: 1,
    cancelRate: 0.8, problemRate: 0.4, earningsToday: 3120, earningsTotal: 341000,
    blocked: false, contractType: 'employment', contractStatus: 'active',
    contractDate: '28.09.2021', contractExpiry: '28.09.2026',
    gpsLat: 55.7600, gpsLng: 37.6100, gpsUpdated: '1 мин назад',
    currentOrderId: 'ord-6-0', avgDeliveryMin: 18,
    pickupLat: 55.7650, pickupLng: 37.6000,
    deliveryLat: 55.7540, deliveryLng: 37.6200,
    currentRestaurant: 'Dodo Pizza, Садовая ул., 19',
    currentClient: 'ул. Охотный Ряд, 2',
    orders: genOrders('6', 45), tasks: [], shifts: genShifts('6'),
    dailyFinance: genDailyFinance('6'), documents: genDocuments('fast_delivery'),
    auditLog: genAudit('Морозова Анна'), chatHistory: genChat('Морозова А.'),
  },
  // ── Warehouse Delivery ──
  {
    id: '7', courier_type: 'warehouse_delivery', name: 'Кузнецов Дмитрий Андреевич', phone: '+7 (999) 777-77-77',
    email: 'kuznetsov@pvz-platform.ru', avatar: 'КД', status: 'on_task', vehicle: 'van',
    zone: 'Центр', region: 'Москва', registeredAt: '03.03.2022', lastOnline: '4 мин назад',
    rating: 4.8, totalOrders: 1540, completedToday: 8, activeOrders: 1,
    cancelRate: 1.2, problemRate: 0.8, earningsToday: 3200, earningsTotal: 308000,
    blocked: false, contractType: 'employment', contractStatus: 'active',
    contractDate: '03.03.2022', contractExpiry: '03.03.2027',
    gpsLat: 55.7480, gpsLng: 37.6250, gpsUpdated: '4 мин назад',
    currentTaskId: 'task-7-0', currentTaskType: 'warehouse_pvz',
    pickupLat: 55.7400, pickupLng: 37.6100,
    deliveryLat: 55.7550, deliveryLng: 37.6400,
    orders: [], tasks: genTasks('7', 30), shifts: genShifts('7'),
    dailyFinance: genDailyFinance('7'), documents: genDocuments('warehouse_delivery'),
    auditLog: genAudit('Кузнецов Дмитрий'), chatHistory: genChat('Кузнецов Д.'),
  },
  {
    id: '8', courier_type: 'warehouse_delivery', name: 'Фёдорова Анастасия Романовна', phone: '+7 (999) 888-88-88',
    email: 'fedorova@pvz-platform.ru', avatar: 'ФА', status: 'online', vehicle: 'truck',
    zone: 'Север', region: 'Московская обл.', registeredAt: '17.07.2023', lastOnline: '10 мин назад',
    rating: 4.6, totalOrders: 870, completedToday: 5, activeOrders: 0,
    cancelRate: 2.0, problemRate: 1.5, earningsToday: 2800, earningsTotal: 174000,
    blocked: false, contractType: 'employment', contractStatus: 'active',
    contractDate: '17.07.2023', contractExpiry: '17.07.2027',
    gpsLat: 55.8100, gpsLng: 37.5700, gpsUpdated: '10 мин назад',
    orders: [], tasks: genTasks('8', 22), shifts: genShifts('8'),
    dailyFinance: genDailyFinance('8'), documents: genDocuments('warehouse_delivery'),
    auditLog: genAudit('Фёдорова Анастасия'), chatHistory: genChat('Фёдорова А.'),
  },
  {
    id: '9', courier_type: 'warehouse_delivery', name: 'Орлов Вячеслав Петрович', phone: '+7 (999) 999-99-99',
    email: 'orlov@pvz-platform.ru', avatar: 'ОВ', status: 'on_task', vehicle: 'van',
    zone: 'Юг', region: 'Москва', registeredAt: '22.11.2022', lastOnline: '2 мин назад',
    rating: 4.9, totalOrders: 2100, completedToday: 10, activeOrders: 1,
    cancelRate: 0.9, problemRate: 1.1, earningsToday: 4100, earningsTotal: 420000,
    blocked: false, contractType: 'employment', contractStatus: 'active',
    contractDate: '22.11.2022', contractExpiry: '22.11.2026',
    gpsLat: 55.6900, gpsLng: 37.6600, gpsUpdated: '2 мин назад',
    currentTaskId: 'task-9-0', currentTaskType: 'return',
    pickupLat: 55.6950, pickupLng: 37.6500,
    deliveryLat: 55.6850, deliveryLng: 37.6750,
    orders: [], tasks: genTasks('9', 35), shifts: genShifts('9'),
    dailyFinance: genDailyFinance('9'), documents: genDocuments('warehouse_delivery'),
    auditLog: genAudit('Орлов Вячеслав'), chatHistory: genChat('Орлов В.'),
  },
  {
    id: '10', courier_type: 'warehouse_delivery', name: 'Павлова Юлия Николаевна', phone: '+7 (999) 100-10-10',
    email: 'pavlova@pvz-platform.ru', avatar: 'ПЮ', status: 'offline', vehicle: 'car',
    zone: 'Восток', region: 'Москва', registeredAt: '05.02.2024', lastOnline: '2 ч назад',
    rating: 4.5, totalOrders: 540, completedToday: 0, activeOrders: 0,
    cancelRate: 3.0, problemRate: 2.2, earningsToday: 0, earningsTotal: 54000,
    blocked: false, contractType: 'gig', contractStatus: 'active',
    contractDate: '05.02.2024', contractExpiry: '05.02.2028',
    gpsLat: 55.7700, gpsLng: 37.7100, gpsUpdated: '2 ч назад',
    orders: [], tasks: genTasks('10', 18), shifts: genShifts('10'),
    dailyFinance: genDailyFinance('10'), documents: genDocuments('warehouse_delivery'),
    auditLog: genAudit('Павлова Юлия'), chatHistory: genChat('Павлова Ю.'),
  },
];

export const TASK_TYPE_CFG: Record<TaskType, { label: string; color: string; bg: string }> = {
  warehouse_pvz:    { label: 'Склад → ПВЗ',     color: 'text-blue-700',   bg: 'bg-blue-50' },
  pvz_warehouse:    { label: 'ПВЗ → Склад',     color: 'text-purple-700', bg: 'bg-purple-50' },
  warehouse_client: { label: 'Склад → Клиент',  color: 'text-green-700',  bg: 'bg-green-50' },
  return:           { label: 'Возврат',          color: 'text-orange-700', bg: 'bg-orange-50' },
};

export const CONTRACT_LABELS: Record<ContractType, string> = {
  employment: 'Трудовой договор',
  gig: 'Договор ГПХ',
  self_employed: 'Самозанятость',
};
