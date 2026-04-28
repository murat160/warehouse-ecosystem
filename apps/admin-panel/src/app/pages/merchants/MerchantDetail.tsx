import { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Phone, Mail, MessageSquare, Ban, ShieldAlert, Shield,
  DollarSign, MapPin, Package, ClipboardList, ShoppingCart,
  BarChart3, AlertTriangle, Users, FileText, CheckCircle2,
  Pause, Play, CreditCard, StickyNote, Truck, Eye, ExternalLink,
  X, Send, Paperclip, ChevronDown, Clock, Check, CheckCheck,
  Unlock, ShieldOff, PhoneCall, PhoneMissed, PhoneOff,
  Headphones, Tag, Flag, User, Hash, AlignLeft, Lock,
  ThumbsUp, Smile, MoreHorizontal,
} from 'lucide-react';
import {
  getSellerDetail, getStatusConfig, getRiskConfig, getTypeLabel,
  formatCurrency, formatNumber, formatTime, getFulfillmentLabel
} from '../../data/merchants-mock';
import { SellerOverviewTab }   from '../../components/merchants/SellerOverviewTab';
import { SellerStoresTab }     from '../../components/merchants/SellerStoresTab';
import { SellerProductsTab }   from '../../components/merchants/SellerProductsTab';
import { SellerOrdersTab }     from '../../components/merchants/SellerOrdersTab';
import { SellerPvzTab }        from '../../components/merchants/SellerPvzTab';
import { SellerFinanceTab }    from '../../components/merchants/SellerFinanceTab';
import { SellerAnalyticsTab }  from '../../components/merchants/SellerAnalyticsTab';
import { SellerQualityTab }    from '../../components/merchants/SellerQualityTab';
import { SellerTeamTab }       from '../../components/merchants/SellerTeamTab';
import { SellerAuditTab }      from '../../components/merchants/SellerAuditTab';
import { SellerAccessTab }     from '../../components/merchants/SellerAccessTab';
import { SellerProfileTab }    from '../../components/merchants/SellerProfileTab';
import { SellerCommissionTab } from '../../components/merchants/SellerCommissionTab';
import { SellerDiscountsTab }  from '../../components/merchants/SellerDiscountsTab';
import { toast } from 'sonner';

type Tab = 'overview' | 'profile' | 'stores' | 'products' | 'orders' | 'pvz' | 'finance' | 'commission' | 'discounts' | 'analytics' | 'quality' | 'team' | 'access' | 'audit';

// Типы продавцов быстрой доставки — ПВЗ им не нужен (они работают door-to-door)
const QUICK_DELIVERY_TYPES = new Set(['restaurant', 'cafe', 'grocery', 'bakery', 'flowers', 'beauty', 'gifts']);

const tabs: { id: Tab; label: string; icon: any }[] = [
  { id: 'overview',   label: 'Обзор',               icon: Eye },
  { id: 'profile',    label: 'Профиль и документы',  icon: FileText },
  { id: 'stores',     label: 'Магазины',             icon: MapPin },
  { id: 'products',   label: 'Товары',               icon: Package },
  { id: 'orders',     label: 'Заказы',               icon: ShoppingCart },
  { id: 'pvz',        label: 'ПВЗ и логистика',      icon: Truck },
  { id: 'finance',    label: 'Финансы',              icon: CreditCard },
  { id: 'commission', label: 'Комиссии',             icon: DollarSign },
  { id: 'discounts',  label: 'Скидки и акции',       icon: Tag },
  { id: 'analytics',  label: 'Аналитика',            icon: BarChart3 },
  { id: 'quality',    label: 'Качество',             icon: AlertTriangle },
  { id: 'team',       label: 'Команда',              icon: Users },
  { id: 'access',     label: 'Роли и доступ',         icon: Shield },
  { id: 'audit',      label: 'Аудит',                icon: ClipboardList },
];

// ─── Mock chat messages ──────────────────────────────────────────────────────
const MOCK_MESSAGES = [
  { id: 'm1', from: 'seller', name: 'Иванов А.', text: 'Добрый день! Когда будет зачислена выплата за прошлый месяц?', ts: '2026-02-19T10:12:00', read: true },
  { id: 'm2', from: 'admin',  name: 'Вы',        text: 'Здравствуйте! Выплата запланирована на 22 февраля согласно расписанию.', ts: '2026-02-19T10:18:00', read: true },
  { id: 'm3', from: 'seller', name: 'Иванов А.', text: 'Понял, спасибо. Ещё вопрос — почему часть заказов ORD-2026-001822 перешла в статус "задержка"?', ts: '2026-02-19T10:21:00', read: true },
  { id: 'm4', from: 'admin',  name: 'Вы',        text: 'Смотрю ситуацию. На ПВЗ "Тверская" была пробка, курьер задержался. Тикет уже создан.', ts: '2026-02-19T10:35:00', read: true },
  { id: 'm5', from: 'seller', name: 'Иванов А.', text: 'Ок, жду решения. Заранее благодарю!', ts: '2026-02-19T10:37:00', read: false },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function useEscClose(onClose: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);
}

function ModalBackdrop({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
      {children}
    </div>
  );
}

// ─── Call Modal ───────────────────────────────────────────────────────────────
function CallModal({ phone, name, onClose }: { phone: string; name: string; onClose: () => void }) {
  useEscClose(onClose);
  const [outcome, setOutcome] = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [logged, setLogged] = useState(false);

  const handleLog = () => {
    if (!outcome) { toast.error('Выберите результат звонка'); return; }
    toast.success('Звонок записан в аудит-лог продавца');
    setLogged(true);
    setTimeout(onClose, 1200);
  };

  return (
    <ModalBackdrop onClose={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center">
                <PhoneCall className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white/80 text-xs">Исходящий звонок</p>
                <p className="text-white font-bold">{name}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
          <a href={`tel:${phone}`} className="mt-4 flex items-center justify-center gap-2 w-full py-3 bg-white rounded-xl font-bold text-green-700 hover:bg-green-50 transition-colors">
            <Phone className="w-5 h-5" />
            {phone}
          </a>
        </div>

        {/* Log form */}
        <div className="p-6 space-y-4">
          <p className="text-sm font-bold text-gray-700">Записать результат звонка</p>

          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'answered',   label: 'Дозвонился',    icon: PhoneCall,   color: 'green' },
              { value: 'no_answer',  label: 'Не ответил',    icon: PhoneMissed, color: 'yellow' },
              { value: 'voicemail',  label: 'Голос. почта',  icon: PhoneOff,    color: 'gray' },
            ].map(opt => {
              const Icon = opt.icon;
              const sel = outcome === opt.value;
              return (
                <button key={opt.value} onClick={() => setOutcome(opt.value)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-xs font-medium ${
                    sel ? `border-${opt.color}-400 bg-${opt.color}-50 text-${opt.color}-700`
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}>
                  <Icon className={`w-4 h-4 ${sel ? `text-${opt.color}-600` : 'text-gray-400'}`} />
                  {opt.label}
                </button>
              );
            })}
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600">Длительность (мин)</label>
            <input type="number" min="0" max="120" value={duration} onChange={e => setDuration(e.target.value)}
              placeholder="Например: 5"
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600">Заметка по звонку</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              placeholder="Что обсудили, договорённости..."
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Отмена</button>
            <button onClick={handleLog} disabled={logged}
              className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5">
              {logged ? <span style={{display:'contents'}}><Check className="w-4 h-4" />Записано</span> : 'Записать в аудит'}
            </button>
          </div>
        </div>
      </motion.div>
    </ModalBackdrop>
  );
}

// ─── Chat Panel ───────────────────────────────────────────────────────────────
function ChatPanel({ seller, onClose }: { seller: any; onClose: () => void }) {
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  useEscClose(onClose);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = () => {
    if (!text.trim()) return;
    setMessages(prev => [...prev, {
      id: `m${Date.now()}`, from: 'admin', name: 'Вы', text: text.trim(),
      ts: new Date().toISOString(), read: true,
    }]);
    setText('');
  };

  const handleKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  return (
    <div style={{display:'contents'}}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-gray-900/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="fixed right-0 top-0 h-full z-50 w-full max-w-md bg-white shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-200 shrink-0">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0">
            {seller.displayName.slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 truncate">{seller.displayName}</p>
            <p className="text-xs text-gray-500">{seller.primaryEmail}</p>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-xs text-gray-500">Online</span>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg ml-1">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.map(msg => {
            const isMe = msg.from === 'admin';
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[78%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  {!isMe && <p className="text-[10px] text-gray-400 px-1">{msg.name}</p>}
                  <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isMe ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}>
                    {msg.text}
                  </div>
                  <div className={`flex items-center gap-1 px-1 ${isMe ? 'justify-end' : ''}`}>
                    <span className="text-[10px] text-gray-400">
                      {new Date(msg.ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isMe && (msg.read ? <CheckCheck className="w-3 h-3 text-blue-400" /> : <Check className="w-3 h-3 text-gray-400" />)}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Quick replies */}
        <div className="px-5 pb-2 flex gap-2 flex-wrap shrink-0">
          {['Выплата обработана ✓', 'Уточняю информацию...', 'Тикет создан'].map(t => (
            <button key={t} onClick={() => setText(t)}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-xs text-gray-600 transition-colors">
              {t}
            </button>
          ))}
        </div>

        {/* Compose */}
        <div className="px-5 pb-5 pt-2 border-t border-gray-100 shrink-0">
          <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-2xl p-2">
            <textarea value={text} onChange={e => setText(e.target.value)} onKeyDown={handleKey}
              placeholder="Написать сообщение... (Enter — отправить)"
              rows={2}
              className="flex-1 bg-transparent text-sm resize-none focus:outline-none text-gray-700 placeholder-gray-400 px-2 py-1" />
            <button onClick={send} disabled={!text.trim()}
              className="shrink-0 w-9 h-9 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-xl flex items-center justify-center transition-colors">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Email Modal ──────────────────────────────────────────────────────────────
function EmailModal({ seller, onClose }: { seller: any; onClose: () => void }) {
  useEscClose(onClose);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState('normal');
  const [template, setTemplate] = useState('');

  const TEMPLATES: Record<string, { subject: string; body: string }> = {
    docs: {
      subject: 'Запрос документов для верификации',
      body: `Уважаемый партнёр,\n\nПросим предоставить следующие документы для завершения верификации вашего аккаунта:\n• ИНН / ОГРН / выписка из ЕГРЮЛ\n• Паспорт директора / доверенность\n• Банковские реквизиты\n\nС уважением,\nКоманда ${seller.displayName}`,
    },
    hold: {
      subject: 'Уведомление о холде выплат',
      body: `Уважаемый партнёр,\n\nИнформируем вас о том, что выплаты по вашему аккаунту временно приостановлены для проведения плановой проверки.\n\nСроки: до 5 рабочих дней.\nПо вопросам: support@pvzplatform.ru\n\nС уважением,\nФинансовый отдел`,
    },
    quality: {
      subject: 'Предупреждение о нарушениях качества',
      body: `Уважаемый партнёр,\n\nОбращаем ваше внимание на ухудшение показателей качества:\n• Процент отмен > 8% (норма < 5%)\n• Среднее время подтверждения > 30 мин\n\nПросим принять меры в течение 7 дней.\n\nС уважением,\nОтдел контроля качества`,
    },
  };

  const applyTemplate = (key: string) => {
    if (!key) return;
    const t = TEMPLATES[key];
    setSubject(t.subject);
    setBody(t.body);
    setTemplate(key);
  };

  const handleSend = () => {
    if (!subject.trim() || !body.trim()) { toast.error('Заполните тему и текст письма'); return; }
    toast.success(`Письмо отправлено: ${seller.primaryEmail}`);
    onClose();
  };

  return (
    <ModalBackdrop onClose={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Mail className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">Новое письмо</p>
              <p className="text-xs text-gray-500">→ {seller.primaryEmail}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
        </div>

        <div className="p-6 space-y-4">
          {/* Template */}
          <div>
            <label className="text-xs font-medium text-gray-600">Шаблон (необязательно)</label>
            <select value={template} onChange={e => applyTemplate(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">— Без шаблона —</option>
              <option value="docs">Запрос документов</option>
              <option value="hold">Уведомление о холде</option>
              <option value="quality">Предупреждение о качестве</option>
            </select>
          </div>

          {/* Fields */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Кому</label>
              <input type="text" value={seller.primaryEmail} readOnly
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-600" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Тема *</label>
              <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
                placeholder="Тема письма..."
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-600">Текст *</label>
                <span className="text-[10px] text-gray-400">{body.length}/5000</span>
              </div>
              <textarea value={body} onChange={e => setBody(e.target.value)} rows={7}
                placeholder="Текст письма..."
                maxLength={5000}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
          </div>

          {/* Priority */}
          <div className="flex items-center gap-2">
            <Flag className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-600">Приоритет:</span>
            {[
              { v: 'low', l: 'Низкий', c: 'text-gray-600 bg-gray-100' },
              { v: 'normal', l: 'Обычный', c: 'text-blue-600 bg-blue-100' },
              { v: 'high', l: 'Высокий', c: 'text-orange-600 bg-orange-100' },
              { v: 'urgent', l: 'Срочный', c: 'text-red-600 bg-red-100' },
            ].map(p => (
              <button key={p.v} onClick={() => setPriority(p.v)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${priority === p.v ? p.c : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>
                {p.l}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Отмена</button>
            <button onClick={handleSend} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5">
              <Send className="w-4 h-4" />Отправить
            </button>
          </div>
        </div>
      </motion.div>
    </ModalBackdrop>
  );
}

// ─── Ticket Modal ─────────────────────────────────────────────────────────────
function TicketModal({ seller, onClose }: { seller: any; onClose: () => void }) {
  useEscClose(onClose);
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [assignee, setAssignee] = useState('');

  const handleCreate = () => {
    if (!category || !priority || !subject.trim()) { toast.error('Заполните категорию, приоритет и тему'); return; }
    const code = `TKT-2026-${String(Math.floor(Math.random() * 900) + 100).padStart(3, '0')}`;
    toast.success(`Тикет ${code} создан и назначен. Событие ticket.created записано в аудит.`);
    onClose();
  };

  return (
    <ModalBackdrop onClose={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <ClipboardList className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">Создать тикет</p>
              <p className="text-xs text-gray-500">{seller.displayName} · {seller.sellerCode}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Категория *</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
                <option value="">Выберите...</option>
                <option value="technical">Технический</option>
                <option value="finance">Финансовый</option>
                <option value="operations">Операции</option>
                <option value="quality">Качество</option>
                <option value="compliance">Соответствие</option>
                <option value="other">Другое</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Приоритет *</label>
              <select value={priority} onChange={e => setPriority(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
                <option value="">Выберите...</option>
                <option value="p1">🔴 P1 — Критический</option>
                <option value="p2">🟠 P2 — Высокий</option>
                <option value="p3">🟡 P3 — Средний</option>
                <option value="p4">🟢 P4 — Низкий</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600">Тема *</label>
            <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
              placeholder="Краткое описание проблемы..."
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600">Описание</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4}
              placeholder="Подробное описание, шаги воспроизведения, ссылки на заказы..."
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none" />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600">Назначить</label>
            <select value={assignee} onChange={e => setAssignee(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
              <option value="">Не назначен (автораспределение)</option>
              <option value="kozlova">Козлова Н. — Клиентский сервис</option>
              <option value="petrov">Петров И. — Поддержка продавцов</option>
              <option value="finance">Финансовый отдел</option>
              <option value="tech">Технический отдел</option>
            </select>
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Отмена</button>
            <button onClick={handleCreate} className="flex-1 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-medium hover:bg-orange-700 transition-colors flex items-center justify-center gap-1.5">
              <ClipboardList className="w-4 h-4" />Создать тикет
            </button>
          </div>
        </div>
      </motion.div>
    </ModalBackdrop>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function MerchantDetail() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // Action modal states
  const [showCallModal,    setShowCallModal]    = useState(false);
  const [showChatPanel,    setShowChatPanel]    = useState(false);
  const [showEmailModal,   setShowEmailModal]   = useState(false);
  const [showTicketModal,  setShowTicketModal]  = useState(false);
  const [showNoteModal,    setShowNoteModal]    = useState(false);
  const [showBlockModal,   setShowBlockModal]   = useState(false);
  const [showUnblockModal, setShowUnblockModal] = useState(false);
  const [showHoldModal,    setShowHoldModal]    = useState(false);
  const [showUnholdModal,  setShowUnholdModal]  = useState(false);

  // Local toggle states
  const [isBlocked, setIsBlocked] = useState(false);
  const [isHolded,  setIsHolded]  = useState(false);

  // Form states
  const [blockReason,   setBlockReason]   = useState('');
  const [unblockReason, setUnblockReason] = useState('');
  const [holdReason,    setHoldReason]    = useState('');
  const [unholdReason,  setUnholdReason]  = useState('');
  const [noteText,      setNoteText]      = useState('');

  const seller = getSellerDetail(id || 'slr-001');
  const sc = getStatusConfig(isBlocked ? 'blocked' : seller.status);
  const rc = getRiskConfig(seller.riskLevel);

  // Скрыть вкладку ПВЗ для продавцов быстрой доставки
  const hasPvz = !QUICK_DELIVERY_TYPES.has(seller.sellerType);
  const visibleTabs = tabs.filter(t => t.id !== 'pvz' || hasPvz);
  // Если активна вкладка ПВЗ у продавца без ПВЗ — сбросить на обзор
  const safeTab: Tab = (!hasPvz && activeTab === 'pvz') ? 'overview' : activeTab;

  // ── Handlers ──
  const handleBlock = () => {
    if (!blockReason) { toast.error('Выберите причину блокировки'); return; }
    setIsBlocked(true);
    toast.success(`Продавец ${seller.displayName} заблокирован. Событие seller.status_changed записано в аудит.`);
    setShowBlockModal(false);
    setBlockReason('');
  };
  const handleUnblock = () => {
    if (!unblockReason.trim()) { toast.error('Укажите причину разблокировки'); return; }
    setIsBlocked(false);
    toast.success(`Продавец ${seller.displayName} разблокирован. Событие seller.status_changed записано в аудит.`);
    setShowUnblockModal(false);
    setUnblockReason('');
  };
  const handleHold = () => {
    if (!holdReason) { toast.error('Укажите причину холда'); return; }
    setIsHolded(true);
    toast.success(`Выплаты для ${seller.displayName} поставлены на холд. Ожидает SoD-подтверждения.`);
    setShowHoldModal(false);
    setHoldReason('');
  };
  const handleUnhold = () => {
    if (!unholdReason.trim()) { toast.error('Укажите причину снятия холда'); return; }
    setIsHolded(false);
    toast.success(`Холд выплат снят для ${seller.displayName}. Событие payout.hold_released записано.`);
    setShowUnholdModal(false);
    setUnholdReason('');
  };
  const handleAddNote = () => {
    if (!noteText.trim()) { toast.error('Введите текст заметки'); return; }
    toast.success('Внутренняя заметка добавлена и записана в аудит.');
    setShowNoteModal(false);
    setNoteText('');
  };

  return (
    <div className="space-y-5">
      {/* Back + Header */}
      <div className="flex items-start gap-4">
        <Link to="/merchants" className="p-2 hover:bg-gray-100 rounded-lg transition-colors mt-0.5 shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            {/* Left: Info */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">{seller.displayName}</h1>
                {seller.verified && <CheckCircle2 className="w-5 h-5 text-blue-500" />}
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${sc.bg} ${sc.color}`}>{isBlocked ? 'Заблокирован' : sc.label}</span>
                {isHolded && <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">Холд выплат</span>}
                {seller.riskLevel !== 'low' && (
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${rc.bg} ${rc.color} flex items-center gap-1`}>
                    <ShieldAlert className="w-3 h-3" /> Риск: {rc.label}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 flex-wrap">
                <span>{seller.sellerCode}</span><span>·</span>
                <span>{seller.legalName}</span><span>·</span>
                <span>{getTypeLabel(seller.sellerType)}</span><span>·</span>
                <span>{seller.cities.join(', ')}</span><span>·</span>
                <span>Комиссия: {seller.commissionRate}%</span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                <span>{seller.primaryContactName}</span><span>·</span>
                <span>{seller.primaryPhone}</span><span>·</span>
                <span>{seller.primaryEmail}</span>
              </div>
            </div>

            {/* Right: Quick Actions */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {/* Call */}
              <button onClick={() => setShowCallModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-300 transition-colors text-sm text-gray-700">
                <Phone className="w-4 h-4 text-green-600" /> Звонок
              </button>
              {/* Chat */}
              <button onClick={() => setShowChatPanel(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-colors text-sm text-gray-700">
                <MessageSquare className="w-4 h-4 text-purple-600" /> Чат
              </button>
              {/* Email */}
              <button onClick={() => setShowEmailModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors text-sm text-gray-700">
                <Mail className="w-4 h-4 text-blue-600" /> Письмо
              </button>

              <div className="h-6 w-px bg-gray-200 hidden sm:block" />

              {/* Note */}
              <button onClick={() => setShowNoteModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-yellow-50 hover:border-yellow-300 transition-colors text-sm text-gray-700">
                <StickyNote className="w-4 h-4 text-yellow-600" /> Заметка
              </button>
              {/* Ticket */}
              <button onClick={() => setShowTicketModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-orange-50 hover:border-orange-300 transition-colors text-sm text-gray-700">
                <ClipboardList className="w-4 h-4 text-orange-600" /> Тикет
              </button>

              <div className="h-6 w-px bg-gray-200 hidden sm:block" />

              {/* Hold / Unhold toggle */}
              {isHolded ? (
                <button onClick={() => setShowUnholdModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-purple-300 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors text-sm text-purple-700 font-medium">
                  <Unlock className="w-4 h-4" /> Снять холд
                </button>
              ) : (
                <button onClick={() => setShowHoldModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-colors text-sm text-gray-700">
                  <DollarSign className="w-4 h-4 text-purple-600" /> Холд
                </button>
              )}

              {/* Block / Unblock toggle */}
              {isBlocked ? (
                <button onClick={() => setShowUnblockModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-green-300 bg-green-50 rounded-lg hover:bg-green-100 transition-colors text-sm text-green-700 font-medium">
                  <Unlock className="w-4 h-4" /> Разблокировать
                </button>
              ) : (
                <button onClick={() => setShowBlockModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 rounded-lg hover:bg-red-50 hover:border-red-400 transition-colors text-sm text-red-600">
                  <Ban className="w-4 h-4" /> Блок
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Blocked / Holded alert banners */}
      <AnimatePresence>
        {isBlocked && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-3 p-4 bg-red-50 border border-red-300 rounded-xl">
            <Ban className="w-5 h-5 text-red-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold text-red-800">Продавец заблокирован</p>
              <p className="text-xs text-red-600 mt-0.5">Все заказы остановлены, каталог скрыт. Нажмите «Разблокировать» для восстановления доступа.</p>
            </div>
            <button onClick={() => setShowUnblockModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-red-300 rounded-xl text-sm font-medium text-red-700 hover:bg-red-50 transition-colors shrink-0">
              <Unlock className="w-3.5 h-3.5" />Разблокировать
            </button>
          </motion.div>
        )}
        {isHolded && !isBlocked && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-3 p-4 bg-purple-50 border border-purple-300 rounded-xl">
            <DollarSign className="w-5 h-5 text-purple-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold text-purple-800">Выплаты на холде</p>
              <p className="text-xs text-purple-600 mt-0.5">Выплаты заморожены до ручного снятия холда. Требуется SoD-подтверждение.</p>
            </div>
            <button onClick={() => setShowUnholdModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-purple-300 rounded-xl text-sm font-medium text-purple-700 hover:bg-purple-50 transition-colors shrink-0">
              <Unlock className="w-3.5 h-3.5" />Снять холд
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: 'GMV 30д',   value: formatCurrency(seller.gmv30d), color: '' },
          { label: 'Заказы 30д', value: formatNumber(seller.orders30d), color: '' },
          { label: 'Ср. чек',   value: seller.orders30d > 0 ? formatCurrency(Math.round(seller.gmv30d / seller.orders30d)) : '—', color: '' },
          { label: 'Отмены 7д', value: `${seller.cancelRate7d}%`, color: seller.cancelRate7d > 5 ? 'text-red-600' : '' },
          { label: 'Возвраты',  value: `${seller.returnRate}%`, color: '' },
          { label: 'StockOut',  value: `${seller.stockOutRate}%`, color: seller.stockOutRate > 5 ? 'text-red-600' : '' },
          { label: 'Confirm',   value: seller.avgAcceptTime > 0 ? formatTime(seller.avgAcceptTime) : '—', color: '' },
          { label: 'SLA',       value: `${seller.slaComplianceRate}%`, color: seller.slaComplianceRate < 95 ? 'text-orange-600' : 'text-green-600' },
        ].map((kpi, i) => (
          <div key={i} className="bg-white p-3 rounded-lg border border-gray-200 text-center">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">{kpi.label}</p>
            <p className={`text-lg font-bold mt-0.5 ${kpi.color || 'text-gray-900'}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Internal note alert */}
      {seller.notesInternal && (
        <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
          <StickyNote className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-800">Внутренняя заметка</p>
            <p className="text-sm text-yellow-700 mt-0.5">{seller.notesInternal}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="border-b border-gray-200 overflow-x-auto">
          <nav className="flex -mb-px">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                    safeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}>
                  <Icon className="w-4 h-4" />{tab.label}
                </button>
              );
            })}
          </nav>
        </div>
        <div className="p-5">
          {safeTab === 'overview'   && <SellerOverviewTab  sellerId={seller.id} seller={seller} />}
          {safeTab === 'profile'    && <SellerProfileTab   seller={seller} />}
          {safeTab === 'stores'     && <SellerStoresTab    sellerId={seller.id} />}
          {safeTab === 'products'   && <SellerProductsTab  sellerId={seller.id} />}
          {safeTab === 'orders'     && <SellerOrdersTab    sellerId={seller.id} />}
          {safeTab === 'pvz'        && hasPvz && <SellerPvzTab sellerId={seller.id} />}
          {safeTab === 'finance'     && <SellerFinanceTab    sellerId={seller.id} seller={seller} onNavigateToCommission={() => setActiveTab('commission')} />}
          {safeTab === 'commission'  && <SellerCommissionTab sellerId={seller.id} seller={seller} />}
          {safeTab === 'discounts'   && <SellerDiscountsTab  seller={seller} />}
          {safeTab === 'analytics'   && <SellerAnalyticsTab  sellerId={seller.id} />}
          {safeTab === 'quality'    && <SellerQualityTab   sellerId={seller.id} />}
          {safeTab === 'team'       && <SellerTeamTab      sellerId={seller.id} />}
          {safeTab === 'access'     && <SellerAccessTab    seller={seller} />}
          {safeTab === 'audit'      && <SellerAuditTab     sellerId={seller.id} />}
        </div>
      </div>

      {/* ═══ MODALS ═══ */}
      <AnimatePresence>
        {/* Call */}
        {showCallModal && <CallModal phone={seller.primaryPhone} name={seller.primaryContactName} onClose={() => setShowCallModal(false)} />}

        {/* Chat */}
        {showChatPanel && <ChatPanel seller={seller} onClose={() => setShowChatPanel(false)} />}

        {/* Email */}
        {showEmailModal && <EmailModal seller={seller} onClose={() => setShowEmailModal(false)} />}

        {/* Ticket */}
        {showTicketModal && <TicketModal seller={seller} onClose={() => setShowTicketModal(false)} />}

        {/* Note */}
        {showNoteModal && (
          <ModalBackdrop onClose={() => setShowNoteModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center"><StickyNote className="w-4 h-4 text-yellow-600" /></div>
                  <h3 className="font-bold text-gray-900">Внутренняя заметка</h3>
                </div>
                <button onClick={() => setShowNoteModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
              </div>
              <p className="text-xs text-gray-500">Заметка видна только сотрудникам платформы. Записывается в аудит-лог.</p>
              <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
                placeholder="Текст заметки..."
                rows={5} maxLength={5000}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none" />
              <p className="text-xs text-gray-400 text-right">{noteText.length}/5000</p>
              <div className="flex gap-2">
                <button onClick={() => setShowNoteModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Отмена</button>
                <button onClick={handleAddNote} className="flex-1 py-2.5 bg-yellow-500 text-white rounded-xl text-sm font-medium hover:bg-yellow-600 transition-colors">Сохранить</button>
              </div>
            </motion.div>
          </ModalBackdrop>
        )}

        {/* Block */}
        {showBlockModal && (
          <ModalBackdrop onClose={() => setShowBlockModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center"><Ban className="w-5 h-5 text-red-600" /></div>
                <div>
                  <h3 className="font-bold text-gray-900">Блокировка продавца</h3>
                  <p className="text-sm text-gray-500">{seller.displayName} ({seller.sellerCode})</p>
                </div>
                <button onClick={() => setShowBlockModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg ml-auto"><X className="w-4 h-4 text-gray-500" /></button>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                Блокировка приведёт к: <strong>остановке всех заказов</strong>, скрытию каталога, уведомлению продавца. Действие записывается в аудит-лог и требует подтверждения.
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Причина блокировки *</label>
                <select value={blockReason} onChange={e => setBlockReason(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                  <option value="">Выберите причину...</option>
                  <option value="fraud_suspected">Подозрение в мошенничестве</option>
                  <option value="quality_violations">Систематические нарушения качества</option>
                  <option value="policy_violation">Нарушение политики платформы</option>
                  <option value="seller_request">По запросу продавца</option>
                  <option value="financial_issues">Финансовые проблемы</option>
                  <option value="document_issues">Проблемы с документами</option>
                  <option value="other">Другое</option>
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowBlockModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Отмена</button>
                <button onClick={handleBlock} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-1.5">
                  <Ban className="w-4 h-4" />Заблокировать
                </button>
              </div>
            </motion.div>
          </ModalBackdrop>
        )}

        {/* Unblock */}
        {showUnblockModal && (
          <ModalBackdrop onClose={() => setShowUnblockModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center"><Unlock className="w-5 h-5 text-green-600" /></div>
                <div>
                  <h3 className="font-bold text-gray-900">Разблокировка продавца</h3>
                  <p className="text-sm text-gray-500">{seller.displayName} ({seller.sellerCode})</p>
                </div>
                <button onClick={() => setShowUnblockModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg ml-auto"><X className="w-4 h-4 text-gray-500" /></button>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700">
                После разблокировки продавец снова сможет принимать заказы. Каталог будет восстановлен. Действие записывается в аудит-лог.
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Причина разблокировки *</label>
                <textarea value={unblockReason} onChange={e => setUnblockReason(e.target.value)}
                  placeholder="Опишите причину снятия блокировки..."
                  rows={3}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowUnblockModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Отмена</button>
                <button onClick={handleUnblock} className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-1.5">
                  <Unlock className="w-4 h-4" />Разблокировать
                </button>
              </div>
            </motion.div>
          </ModalBackdrop>
        )}

        {/* Hold */}
        {showHoldModal && (
          <ModalBackdrop onClose={() => setShowHoldModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center"><DollarSign className="w-5 h-5 text-purple-600" /></div>
                <div>
                  <h3 className="font-bold text-gray-900">Холд выплат</h3>
                  <p className="text-sm text-gray-500">{seller.displayName} ({seller.sellerCode})</p>
                </div>
                <button onClick={() => setShowHoldModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg ml-auto"><X className="w-4 h-4 text-gray-500" /></button>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-sm text-purple-700">
                Выплаты будут заморожены до ручного снятия холда. Требуется <strong>SoD-подтверждение</strong> вторым лицом. Продавец получит уведомление.
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Причина холда *</label>
                <select value={holdReason} onChange={e => setHoldReason(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="">Выберите причину...</option>
                  <option value="chargeback">Расследование чарджбэка</option>
                  <option value="fraud_review">Проверка на фрод</option>
                  <option value="quality_review">Проверка качества</option>
                  <option value="document_verification">Верификация документов</option>
                  <option value="tax_compliance">Налоговая проверка</option>
                  <option value="other">Другое</option>
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowHoldModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Отмена</button>
                <button onClick={handleHold} className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-1.5">
                  <Lock className="w-4 h-4" />Поставить на холд
                </button>
              </div>
            </motion.div>
          </ModalBackdrop>
        )}

        {/* Unhold */}
        {showUnholdModal && (
          <ModalBackdrop onClose={() => setShowUnholdModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center"><Unlock className="w-5 h-5 text-teal-600" /></div>
                <div>
                  <h3 className="font-bold text-gray-900">Снятие холда выплат</h3>
                  <p className="text-sm text-gray-500">{seller.displayName} ({seller.sellerCode})</p>
                </div>
                <button onClick={() => setShowUnholdModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg ml-auto"><X className="w-4 h-4 text-gray-500" /></button>
              </div>
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 text-sm text-teal-700">
                Выплаты будут возобновлены по расписанию. Действие фиксируется как <code className="bg-teal-100 px-1 rounded text-[11px]">payout.hold_released</code> в аудит-логе.
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Основание для снятия *</label>
                <textarea value={unholdReason} onChange={e => setUnholdReason(e.target.value)}
                  placeholder="Опишите основание для снятия холда..."
                  rows={3}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowUnholdModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Отмена</button>
                <button onClick={handleUnhold} className="flex-1 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700 transition-colors flex items-center justify-center gap-1.5">
                  <Unlock className="w-4 h-4" />Снять холд
                </button>
              </div>
            </motion.div>
          </ModalBackdrop>
        )}
      </AnimatePresence>
    </div>
  );
}