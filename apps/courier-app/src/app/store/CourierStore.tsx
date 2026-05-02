import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import type {
  ChatMessage, ChatThread, CourierProfile, CourierSettings, Order, OrderStatus, ProblemReport, ProblemType,
} from './types';
import { DEFAULT_SETTINGS, TRANSITIONS } from './types';
import { audit } from '../lib/audit';

const DELIVERED_BANNER_MS = 8000;

function generateCustomerCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

// ─── Mock seed ────────────────────────────────────────────────

const seedCourier: CourierProfile = {
  id: 'C-001',
  name: 'Berdymurat Imamov',
  phone: '+993 65 123 456',
  rating: 4.92,
  totalDeliveries: 184,
  vehicle: 'scooter',
};

const seedOffer: Order = {
  id: 'ord_demo_1',
  number: '#820',
  status: 'available',
  pickup: {
    id: 'pp_1',
    type: 'cafe',
    name: 'Mniamciu — Jana Kazimierza',
    address: 'Jana Kazimierza 7/lok 3, 01-248',
    phone: '+48 22 123 4567',
    location: { lat: 52.2297, lng: 20.9844 },
  },
  customer: {
    name: 'B. Ç.',
    phone: '+48 512 345 678',
    address: 'Ostrobramska 73c/u3, 04-175',
    entrance: '2',
    apartment: '17',
    comment: 'Домофон 17, оставить у двери',
    area: 'Praga-Południe',
    location: { lat: 52.1892, lng: 21.0267 },
  },
  items: [
    { id: '1', name: 'Lahmacun', quantity: 1 },
    { id: '2', name: 'Ayran 250ml', quantity: 2 },
    { id: '3', name: 'Baklava', quantity: 1 },
  ],
  payAmount: 34.2,
  payCurrency: 'PLN',
  bonus: 10,
  distanceKm: 11.2,
  etaMinutes: 33,
  pickupReady: false,
  pickupReadyInMinutes: 30,
};

// ─── State / actions ──────────────────────────────────────────

interface State {
  authenticated: boolean;
  courier: CourierProfile | null;
  isOnline: boolean;
  pendingOffer: Order | null;
  activeOrder: Order | null;
  history: Order[];
  earningsToday: number;
  problems: ProblemReport[];
  messages: ChatMessage[];
  settings: CourierSettings;
  initialized: boolean;
  /** Most-recently delivered order — drives the right-top "Delivered" mini card. */
  lastDelivered: Order | null;
  lastDeliveredAt: number | null;
}

type Action =
  | { type: 'HYDRATE'; state: Partial<State> }
  | { type: 'LOGIN'; courier: CourierProfile }
  | { type: 'LOGOUT' }
  | { type: 'SET_ONLINE'; online: boolean }
  | { type: 'SET_OFFER'; offer: Order | null }
  | { type: 'ACCEPT_OFFER'; customerCode: string }
  | { type: 'TRANSITION'; status: OrderStatus }
  | { type: 'SET_PACKAGE_DATA'; count: number; photo?: string; comment?: string }
  | { type: 'SET_PROOF'; photo?: string; code?: string; comment?: string }
  | { type: 'COMPLETE_ORDER'; code: string }
  | { type: 'CLEAR_LAST_DELIVERED' }
  | { type: 'ADD_PROBLEM'; problem: ProblemReport }
  | { type: 'ADD_MESSAGE'; message: ChatMessage }
  | { type: 'MARK_MESSAGES_VIEWED'; channelKey: string }
  | { type: 'UPDATE_SETTINGS'; patch: Partial<CourierSettings> };

const initialState: State = {
  authenticated: false,
  courier: null,
  isOnline: false,
  pendingOffer: null,
  activeOrder: null,
  history: [],
  earningsToday: 0,
  problems: [],
  messages: [],
  settings: DEFAULT_SETTINGS,
  initialized: false,
  lastDelivered: null,
  lastDeliveredAt: null,
};

const STORAGE_KEY = 'courier.state.v1';

function loadFromStorage(): Partial<State> | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<State>;
  } catch { return null; }
}

function saveToStorage(state: State) {
  try {
    // We deliberately persist messages — chat history (active + closed) survives reload.
    const persisted: Partial<State> = {
      authenticated: state.authenticated,
      courier: state.courier,
      isOnline: state.isOnline,
      activeOrder: state.activeOrder,
      history: state.history.slice(-50),
      earningsToday: state.earningsToday,
      problems: state.problems.slice(-30),
      messages: state.messages.slice(-500),
      settings: state.settings,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  } catch {}
}

// ─── Chat threads helper ──────────────────────────────────────

function buildChatThreads(state: State): { active: ChatThread[]; closed: ChatThread[] } {
  const lastByChannel = new Map<string, ChatMessage>();
  const unreadByChannel = new Map<string, number>();
  for (const m of state.messages) {
    const cur = lastByChannel.get(m.channelKey);
    if (!cur || cur.createdAt < m.createdAt) lastByChannel.set(m.channelKey, m);
    if (m.from !== 'courier' && m.status !== 'viewed') {
      unreadByChannel.set(m.channelKey, (unreadByChannel.get(m.channelKey) ?? 0) + 1);
    }
  }

  const summary = (m?: ChatMessage): string | undefined => {
    if (!m) return undefined;
    if (m.text) return m.text;
    if (m.photoUrl) return '🖼';
    if (m.videoUrl) return '🎬';
    return undefined;
  };

  const support: ChatThread = {
    channelKey: 'support',
    kind: 'support',
    title: 'support',
    orderId: undefined,
    orderNumber: undefined,
    lastMessageText: summary(lastByChannel.get('support')),
    lastMessageAt: lastByChannel.get('support')?.createdAt,
    unread: unreadByChannel.get('support') ?? 0,
    locked: false,
    closed: false,
  };

  const active: ChatThread[] = [support];
  const closed: ChatThread[] = [];

  if (state.activeOrder) {
    const key = `customer:${state.activeOrder.id}`;
    const isLocked = !['picked_up', 'going_to_customer', 'arrived_at_customer'].includes(state.activeOrder.status);
    active.push({
      channelKey: key,
      kind: 'customer',
      title: state.activeOrder.customer.name,
      orderId: state.activeOrder.id,
      orderNumber: state.activeOrder.number,
      lastMessageText: summary(lastByChannel.get(key)),
      lastMessageAt: lastByChannel.get(key)?.createdAt,
      unread: unreadByChannel.get(key) ?? 0,
      locked: isLocked,
      closed: false,
    });
  }

  for (const o of state.history) {
    const key = `customer:${o.id}`;
    const last = lastByChannel.get(key);
    if (!last) continue; // skip orders that never had a customer chat
    closed.push({
      channelKey: key,
      kind: 'customer',
      title: o.customer.name,
      orderId: o.id,
      orderNumber: o.number,
      lastMessageText: summary(last),
      lastMessageAt: last.createdAt,
      unread: unreadByChannel.get(key) ?? 0,
      locked: false,
      closed: true,
    });
  }

  active.sort((a, b) => (b.lastMessageAt ?? 0) - (a.lastMessageAt ?? 0));
  closed.sort((a, b) => (b.lastMessageAt ?? 0) - (a.lastMessageAt ?? 0));
  return { active, closed };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'HYDRATE':
      return {
        ...state,
        ...action.state,
        settings: { ...DEFAULT_SETTINGS, ...(action.state.settings ?? {}) },
        initialized: true,
      };

    case 'LOGIN':
      return { ...state, authenticated: true, courier: action.courier };

    case 'LOGOUT':
      return { ...initialState, initialized: true };

    case 'SET_ONLINE': {
      const next: State = { ...state, isOnline: action.online };
      // Auto-offer when going online and no active order
      if (action.online && !state.activeOrder && !state.pendingOffer) {
        next.pendingOffer = { ...seedOffer, id: `ord_${Date.now()}` };
      }
      if (!action.online) next.pendingOffer = null;
      return next;
    }

    case 'SET_OFFER':
      return { ...state, pendingOffer: action.offer };

    case 'ACCEPT_OFFER': {
      if (!state.pendingOffer) return state;
      const accepted: Order = {
        ...state.pendingOffer,
        status: 'accepted',
        acceptedAt: Date.now(),
        customerCode: action.customerCode,
      };
      return { ...state, activeOrder: accepted, pendingOffer: null };
    }

    case 'TRANSITION': {
      if (!state.activeOrder) return state;
      const allowed = TRANSITIONS[state.activeOrder.status] ?? [];
      if (!allowed.includes(action.status)) {
        // illegal transition — ignore but log
        audit('store', 'transition.rejected', {
          from: state.activeOrder.status, to: action.status,
        });
        return state;
      }
      return {
        ...state,
        activeOrder: { ...state.activeOrder, status: action.status },
      };
    }

    case 'SET_PACKAGE_DATA': {
      if (!state.activeOrder) return state;
      return {
        ...state,
        activeOrder: {
          ...state.activeOrder,
          packageCount: action.count,
          packagePhotoDataUrl: action.photo,
          packageComment: action.comment,
          status: 'picked_up',
          pickedUpAt: Date.now(),
        },
      };
    }

    case 'SET_PROOF': {
      if (!state.activeOrder) return state;
      return {
        ...state,
        activeOrder: {
          ...state.activeOrder,
          proofPhotoDataUrl: action.photo,
          proofCode: action.code,
          proofComment: action.comment,
        },
      };
    }

    case 'COMPLETE_ORDER': {
      if (!state.activeOrder) return state;
      // Refuse without a matching customer code — courier cannot finalize unilaterally.
      if (!state.activeOrder.customerCode || action.code !== state.activeOrder.customerCode) {
        audit('store', 'order.complete.rejected', {
          reason: 'wrong_code', orderId: state.activeOrder.id,
        });
        return state;
      }
      const completed: Order = {
        ...state.activeOrder,
        status: 'delivered',
        deliveredAt: Date.now(),
        earnings: state.activeOrder.payAmount,
        proofCode: action.code,
      };
      return {
        ...state,
        activeOrder: null,
        history: [completed, ...state.history],
        earningsToday: state.earningsToday + completed.earnings!,
        lastDelivered: completed,
        lastDeliveredAt: Date.now(),
      };
    }

    case 'CLEAR_LAST_DELIVERED':
      return { ...state, lastDelivered: null, lastDeliveredAt: null };

    case 'ADD_PROBLEM':
      return { ...state, problems: [action.problem, ...state.problems] };

    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.message] };

    case 'MARK_MESSAGES_VIEWED':
      return {
        ...state,
        messages: state.messages.map(m =>
          m.channelKey === action.channelKey && m.from !== 'courier' && m.status !== 'viewed'
            ? { ...m, status: 'viewed' }
            : m,
        ),
      };

    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.patch } };

    default:
      return state;
  }
}

// ─── Context API ──────────────────────────────────────────────

interface Api {
  state: State;
  login: (phone: string) => void;
  logout: () => void;
  setOnline: (online: boolean) => void;
  acceptOffer: () => void;
  declineOffer: (reason: string) => void;
  transition: (s: OrderStatus) => void;
  setPackageData: (count: number, photo?: string, comment?: string) => void;
  setProof: (data: { photo?: string; code?: string; comment?: string }) => void;
  /** Validates the customer code before flipping to delivered. Returns ok=false on mismatch. */
  completeOrder: (code: string) => { ok: boolean; reason?: 'wrong_code' | 'no_active' };
  clearLastDelivered: () => void;
  reportProblem: (input: { type: ProblemType; description: string; photos: string[]; videos: string[] }) => ProblemReport;
  sendMessage: (channelKey: string, msg: { text?: string; photoUrl?: string; videoUrl?: string }) => ChatMessage;
  markChannelViewed: (channelKey: string) => void;
  channelKeyForActiveCustomer: () => string | null;
  updateSettings: (patch: Partial<CourierSettings>) => void;
  unreadCount: (channelKey: string) => number;
  /** Build a list of chat threads (active and closed) for the chat list page. */
  chatThreads: () => { active: ChatThread[]; closed: ChatThread[] };
}

const Ctx = createContext<Api | null>(null);

export function CourierStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Hydrate on mount
  useEffect(() => {
    const persisted = loadFromStorage();
    dispatch({ type: 'HYDRATE', state: persisted ?? {} });
  }, []);

  // Persist
  useEffect(() => {
    if (state.initialized) saveToStorage(state);
  }, [state]);

  // Auto-clear the "Delivered" right-top mini card after the banner timeout.
  useEffect(() => {
    if (!state.lastDeliveredAt) return;
    const elapsed = Date.now() - state.lastDeliveredAt;
    const remaining = Math.max(0, DELIVERED_BANNER_MS - elapsed);
    const timer = window.setTimeout(() => dispatch({ type: 'CLEAR_LAST_DELIVERED' }), remaining);
    return () => window.clearTimeout(timer);
  }, [state.lastDeliveredAt]);

  // Seed support response on first login
  useEffect(() => {
    if (state.authenticated && state.messages.length === 0) {
      dispatch({
        type: 'ADD_MESSAGE',
        message: {
          id: `msg_seed_${Date.now()}`,
          channelKey: 'support',
          from: 'support',
          text: 'Здравствуйте! Я оператор поддержки. Напишите, если нужна помощь по заказу.',
          status: 'delivered',
          createdAt: Date.now(),
        },
      });
    }
  }, [state.authenticated, state.messages.length]);

  const api = useMemo<Api>(() => ({
    state,
    login: (phone: string) => {
      const courier: CourierProfile = { ...seedCourier, phone };
      audit(courier.id, 'auth.login', { phone });
      dispatch({ type: 'LOGIN', courier });
    },
    logout: () => {
      if (state.courier) audit(state.courier.id, 'auth.logout');
      dispatch({ type: 'LOGOUT' });
    },
    setOnline: (online: boolean) => {
      audit(state.courier?.id ?? 'unknown', online ? 'shift.online' : 'shift.offline');
      dispatch({ type: 'SET_ONLINE', online });
    },
    acceptOffer: () => {
      if (!state.pendingOffer) return;
      const code = state.pendingOffer.customerCode ?? generateCustomerCode();
      audit(state.courier?.id ?? 'unknown', 'order.accept', { id: state.pendingOffer.id, codeIssued: true });
      // Demo aid: in a real app this code would only live in the customer's phone
      // — without a backend the courier needs a way to test the flow, so we log it.
      if (typeof console !== 'undefined') {
        console.info('[demo] customer confirmation code for order', state.pendingOffer.number, '=', code);
      }
      dispatch({ type: 'ACCEPT_OFFER', customerCode: code });
      dispatch({ type: 'TRANSITION', status: 'going_to_pickup' });
    },
    declineOffer: (reason: string) => {
      if (state.pendingOffer) audit(state.courier?.id ?? 'unknown', 'order.decline', { id: state.pendingOffer.id, reason });
      dispatch({ type: 'SET_OFFER', offer: null });
      // Re-offer after a moment if still online
      setTimeout(() => {
        if (state.isOnline) {
          dispatch({
            type: 'SET_OFFER',
            offer: { ...seedOffer, id: `ord_${Date.now()}`, status: 'available' },
          });
        }
      }, 4000);
    },
    transition: (s: OrderStatus) => {
      audit(state.courier?.id ?? 'unknown', 'order.transition', { to: s });
      dispatch({ type: 'TRANSITION', status: s });
    },
    setPackageData: (count, photo, comment) => {
      audit(state.courier?.id ?? 'unknown', 'order.package_count', { count });
      dispatch({ type: 'SET_PACKAGE_DATA', count, photo, comment });
    },
    setProof: ({ photo, code, comment }) => {
      dispatch({ type: 'SET_PROOF', photo, code, comment });
    },
    completeOrder: (code: string) => {
      if (!state.activeOrder) return { ok: false, reason: 'no_active' as const };
      if (!state.activeOrder.customerCode || code !== state.activeOrder.customerCode) {
        audit(state.courier?.id ?? 'unknown', 'order.complete.wrong_code', { id: state.activeOrder.id });
        dispatch({ type: 'COMPLETE_ORDER', code }); // reducer will reject + log; dispatch for symmetry
        return { ok: false, reason: 'wrong_code' as const };
      }
      audit(state.courier?.id ?? 'unknown', 'order.delivered', { id: state.activeOrder.id, codeUsed: true });
      dispatch({ type: 'COMPLETE_ORDER', code });
      return { ok: true };
    },
    clearLastDelivered: () => dispatch({ type: 'CLEAR_LAST_DELIVERED' }),
    reportProblem: (input) => {
      const problem: ProblemReport = {
        id: `prb_${Date.now()}`,
        orderId: state.activeOrder?.id ?? 'no_order',
        type: input.type,
        description: input.description,
        photos: input.photos,
        videos: input.videos,
        status: 'open',
        createdAt: Date.now(),
      };
      audit(state.courier?.id ?? 'unknown', 'problem.report', {
        type: input.type, photos: input.photos.length, videos: input.videos.length,
      });
      dispatch({ type: 'ADD_PROBLEM', problem });
      dispatch({ type: 'TRANSITION', status: 'problem' });
      // Auto-message support
      const msg: ChatMessage = {
        id: `msg_${Date.now()}`,
        channelKey: 'support',
        from: 'courier',
        text: `Сообщил проблему: ${input.type}. ${input.description}`,
        status: 'sent',
        createdAt: Date.now(),
      };
      dispatch({ type: 'ADD_MESSAGE', message: msg });
      // Simulated support reply
      setTimeout(() => {
        dispatch({
          type: 'ADD_MESSAGE',
          message: {
            id: `msg_sup_${Date.now()}`,
            channelKey: 'support',
            from: 'support',
            text: 'Принято. Сейчас разберёмся и свяжемся с вами.',
            status: 'delivered',
            createdAt: Date.now(),
          },
        });
      }, 1200);
      return problem;
    },
    sendMessage: (channelKey, msg) => {
      const message: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        channelKey,
        from: 'courier',
        text: msg.text,
        photoUrl: msg.photoUrl,
        videoUrl: msg.videoUrl,
        status: 'sent',
        createdAt: Date.now(),
      };
      dispatch({ type: 'ADD_MESSAGE', message });
      return message;
    },
    markChannelViewed: (channelKey) => dispatch({ type: 'MARK_MESSAGES_VIEWED', channelKey }),
    channelKeyForActiveCustomer: () => state.activeOrder ? `customer:${state.activeOrder.id}` : null,
    updateSettings: (patch) => {
      audit(state.courier?.id ?? 'unknown', 'settings.update', { patch });
      dispatch({ type: 'UPDATE_SETTINGS', patch });
    },
    unreadCount: (channelKey) =>
      state.messages.filter(m => m.channelKey === channelKey && m.from !== 'courier' && m.status !== 'viewed').length,
    chatThreads: () => buildChatThreads(state),
  }), [state]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useCourierStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCourierStore must be used inside <CourierStoreProvider>');
  return ctx;
}

// Helpers
export function isCustomerInfoUnlocked(status: OrderStatus | undefined): boolean {
  if (!status) return false;
  return ['picked_up', 'going_to_customer', 'arrived_at_customer', 'delivered'].includes(status);
}
