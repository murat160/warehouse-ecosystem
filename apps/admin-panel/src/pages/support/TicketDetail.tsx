import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import ReactDOM from 'react-dom';
import {
  ArrowLeft, Send, AlertCircle, Clock, User, MessageSquare,
  CheckCircle2, XCircle, Tag, Link2, Download, Plus,
  ChevronDown, Phone, Mail, Package, MapPin, DollarSign,
  History, Paperclip, X, Check, MoreVertical, FileText, Eye,
} from 'lucide-react';
import { DocumentViewerModal, type DocumentRecord, type DocumentContent } from '../../components/ui/DocumentViewer';

// ─── Types ───────────────────────────────────────────────────────────────────

type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
type MessageRole = 'client' | 'agent' | 'system';

interface TicketMessage {
  id: string;
  role: MessageRole;
  author: string;
  text: string;
  time: string;
  attachments?: string[];
}

interface TicketData {
  id: string;
  subject: string;
  category: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  updatedAt: string;
  assignee: string;
  linkedEntity?: string;
  linkedType?: 'order' | 'pvz' | 'courier';
  client: { name: string; email: string; phone: string };
  messages: TicketMessage[];
  tags: string[];
  sla: string;
  slaBreach: boolean;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const TICKETS: Record<string, TicketData> = {
  '1': {
    id: '1',
    subject: 'Заказ не доставлен вовремя',
    category: 'Заказы',
    status: 'in_progress',
    priority: 'high',
    createdAt: '14.03.2026 10:30',
    updatedAt: '14.03.2026 11:15',
    assignee: 'Поддержка Л.',
    linkedEntity: 'ORD-2026-4512',
    linkedType: 'order',
    client: { name: 'Иванов Пётр Сергеевич', email: 'p.ivanov@mail.ru', phone: '+7 (916) 123-45-67' },
    sla: '14.03.2026 14:30',
    slaBreach: false,
    tags: ['SLA', 'Курьер', 'Задержка'],
    messages: [
      { id: 'm1', role: 'client', author: 'Иванов П.С.', text: 'Заказ не пришел вовремя, прошло уже 2 часа после указанного срока. Курьер не берёт трубку. Когда привезут?', time: '14.03.2026 10:30' },
      { id: 'm2', role: 'agent', author: 'Поддержка Л.', text: 'Добрый день! Проверяем статус вашего заказа. Курьер был в пробке, заказ будет доставлен в течение 30-40 минут. Приносим извинения за неудобство.', time: '14.03.2026 10:35' },
      { id: 'm3', role: 'system', author: 'Система', text: 'Статус заказа ORD-2026-4512 обновлён: «В пути» → курьер в 1.2 км от адреса доставки.', time: '14.03.2026 10:45' },
      { id: 'm4', role: 'client', author: 'Иванов П.С.', text: 'Хорошо, спасибо за информацию. Буду ждать.', time: '14.03.2026 10:47' },
    ],
  },
  '2': {
    id: '2',
    subject: 'ПВЗ переполнен',
    category: 'ПВЗ',
    status: 'open',
    priority: 'critical',
    createdAt: '14.03.2026 09:15',
    updatedAt: '14.03.2026 09:15',
    assignee: 'Не назначен',
    linkedEntity: 'MSK-002',
    linkedType: 'pvz',
    client: { name: 'Оператор ПВЗ MSK-002', email: 'msk002@pvz.ru', phone: '+7 (495) 123-45-68' },
    sla: '14.03.2026 11:15',
    slaBreach: false,
    tags: ['ПВЗ', 'Перегрузка', 'Срочно'],
    messages: [
      { id: 'm1', role: 'client', author: 'Смирнова Е.А.', text: 'Пункт переполнен — 92 из 100 ячеек заняты. Просим прислать транспорт для разгрузки возвратов.', time: '14.03.2026 09:15' },
      { id: 'm2', role: 'system', author: 'Система', text: 'Тикет создан автоматически по порогу загрузки > 90%', time: '14.03.2026 09:15' },
    ],
  },
  '3': {
    id: '3',
    subject: 'Расхождение кассы',
    category: 'Финансы',
    status: 'resolved',
    priority: 'medium',
    createdAt: '13.03.2026 16:20',
    updatedAt: '14.03.2026 09:00',
    assignee: 'Финансист А.',
    linkedEntity: 'MSK-003',
    linkedType: 'pvz',
    client: { name: 'Оператор ПВЗ MSK-003', email: 'msk003@pvz.ru', phone: '+7 (495) 123-45-69' },
    sla: '14.03.2026 16:20',
    slaBreach: false,
    tags: ['Касса', 'Финансы'],
    messages: [
      { id: 'm1', role: 'client', author: 'Оператор ПВЗ', text: 'Обнаружено расхождение кассы на ₽350. Сверка проводилась в 16:00.', time: '13.03.2026 16:20' },
      { id: 'm2', role: 'agent', author: 'Финансист А.', text: 'Принято в работу. Запрашиваем Z-отчёт и лог операций.', time: '13.03.2026 16:45' },
      { id: 'm3', role: 'agent', author: 'Финансист А.', text: 'Расхождение устранено — была ошибка в сдаче при наличной оплате. Касса скорректирована.', time: '14.03.2026 09:00' },
      { id: 'm4', role: 'system', author: 'Система', text: 'Тикет закрыт со статусом «Решён». Причина: ошибка кассира.', time: '14.03.2026 09:00' },
    ],
  },
};

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<TicketStatus, { label: string; color: string; bg: string }> = {
  open:        { label: 'Открыт',   color: 'text-yellow-700', bg: 'bg-yellow-100' },
  in_progress: { label: 'В работе', color: 'text-blue-700',   bg: 'bg-blue-100' },
  resolved:    { label: 'Решён',    color: 'text-green-700',  bg: 'bg-green-100' },
  closed:      { label: 'Закрыт',   color: 'text-gray-600',   bg: 'bg-gray-100' },
};

const PRIORITY_CFG: Record<TicketPriority, { label: string; color: string }> = {
  low:      { label: 'Низкий',    color: 'text-gray-500' },
  medium:   { label: 'Средний',  color: 'text-blue-600' },
  high:     { label: 'Высокий',  color: 'text-orange-600' },
  critical: { label: 'Критичный',color: 'text-red-600' },
};

export function TicketDetail() {
  const { id } = useParams();
  const [message, setMessage] = useState('');
  const [localMsgs, setLocalMsgs] = useState<TicketMessage[]>([]);
  const [status, setStatus] = useState<TicketStatus | null>(null);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<DocumentRecord | null>(null);

  const ticket = TICKETS[id || '1'] ?? TICKETS['1'];
  const currentStatus = status ?? ticket.status;
  const allMessages = [...ticket.messages, ...localMsgs];

  const stCfg = STATUS_CFG[currentStatus];
  const prCfg = PRIORITY_CFG[ticket.priority];

  const handleSend = () => {
    if (!message.trim()) return;
    const newMsg: TicketMessage = {
      id: `new-${Date.now()}`,
      role: 'agent',
      author: 'Вы (Агент)',
      text: message.trim(),
      time: new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    };
    setLocalMsgs(prev => [...prev, newMsg]);
    setMessage('');
    toast.success('Сообщение отправлено');
  };

  const handleStatusChange = (newStatus: TicketStatus) => {
    setStatus(newStatus);
    setShowStatusMenu(false);
    toast.success(`Статус изменён → ${STATUS_CFG[newStatus].label}`);
    const sysMsg: TicketMessage = {
      id: `sys-${Date.now()}`,
      role: 'system',
      author: 'Система',
      text: `Статус тикета изменён: «${STATUS_CFG[currentStatus].label}» → «${STATUS_CFG[newStatus].label}»`,
      time: new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    };
    setLocalMsgs(prev => [...prev, sysMsg]);
  };

  const handleAssign = () => {
    toast.success('Тикет назначен', { description: 'Уведомление отправлено агенту' });
  };

  const handleExport = () => {
    toast.success('Экспорт запущен', { description: `Тикет #${ticket.id} будет скачан в PDF` });
  };

  const handleCall = () => {
    toast.info(`Звонок: ${ticket.client.phone}`, { description: ticket.client.name });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link to="/support/tickets" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">Тикет #{ticket.id}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${stCfg.bg} ${stCfg.color}`}>
                {stCfg.label}
              </span>
              <span className={`text-sm font-semibold ${prCfg.color}`}>
                ● {prCfg.label}
              </span>
            </div>
            <p className="text-gray-500 mt-0.5">{ticket.subject}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm transition-colors">
            <Download className="w-4 h-4" /> PDF
          </button>
          <div className="relative">
            <button
              onClick={() => setShowStatusMenu(v => !v)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm transition-colors"
            >
              Изменить статус <ChevronDown className="w-4 h-4" />
            </button>
            {showStatusMenu && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-10">
                {Object.entries(STATUS_CFG).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => handleStatusChange(key as TicketStatus)}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 first:rounded-t-xl last:rounded-b-xl ${key === currentStatus ? 'font-semibold' : ''}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${cfg.bg.replace('bg-', 'bg-').replace('-100', '-500')}`} />
                    {cfg.label}
                    {key === currentStatus && <Check className="w-3 h-3 ml-auto text-blue-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 flex flex-col">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Переписка</h2>
          </div>

          {/* Messages */}
          <div className="flex-1 p-6 space-y-4 overflow-y-auto max-h-[480px]">
            {allMessages.map(msg => {
              if (msg.role === 'system') {
                return (
                  <div key={msg.id} className="flex justify-center">
                    <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-xs text-gray-500">
                      <History className="w-3.5 h-3.5" />
                      {msg.text}
                      <span className="text-gray-400">· {msg.time.split(' ')[1]}</span>
                    </div>
                  </div>
                );
              }
              const isAgent = msg.role === 'agent';
              return (
                <div key={msg.id} className={`flex gap-3 ${isAgent ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
                    isAgent ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
                  }`}>
                    {msg.author.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className={`flex-1 max-w-[75%] ${isAgent ? 'items-end' : ''}`}>
                    <div className={`rounded-2xl px-4 py-3 ${
                      isAgent ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-gray-100 text-gray-900 rounded-tl-sm'
                    }`}>
                      <p className="text-sm">{msg.text}</p>
                    </div>
                    <p className={`text-xs text-gray-400 mt-1 ${isAgent ? 'text-right' : ''}`}>
                      {msg.author} · {msg.time}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input */}
          {currentStatus !== 'closed' && currentStatus !== 'resolved' && (
            <div className="p-4 border-t border-gray-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Введите сообщение..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <button
                  onClick={() => toast.info('Прикрепить файл', { description: 'Функционал загрузки файлов' })}
                  className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-500 transition-colors"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                <button
                  onClick={handleSend}
                  disabled={!message.trim()}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-200 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
          {(currentStatus === 'resolved' || currentStatus === 'closed') && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <p className="text-sm text-gray-500 text-center">
                Тикет {stCfg.label.toLowerCase()} — переписка завершена.{' '}
                <button onClick={() => handleStatusChange('in_progress')} className="text-blue-600 hover:underline">Открыть снова</button>
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Client info */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Заявитель</h3>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                {ticket.client.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div>
                <p className="font-medium text-gray-900">{ticket.client.name}</p>
                <p className="text-xs text-gray-500">{ticket.client.email}</p>
              </div>
            </div>
            <div className="space-y-2">
              <button onClick={handleCall} className="w-full flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm transition-colors">
                <Phone className="w-4 h-4 text-gray-400" />
                {ticket.client.phone}
              </button>
              <button
                onClick={() => toast.info(`Email: ${ticket.client.email}`)}
                className="w-full flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm transition-colors"
              >
                <Mail className="w-4 h-4 text-gray-400" />
                Написать email
              </button>
            </div>
          </div>

          {/* Details */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Детали тикета</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Категория</span>
                <span className="font-medium text-gray-900">{ticket.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Приоритет</span>
                <span className={`font-semibold ${prCfg.color}`}>{prCfg.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Создан</span>
                <span className="font-medium text-gray-900">{ticket.createdAt}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Обновлён</span>
                <span className="font-medium text-gray-900">{ticket.updatedAt}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">SLA до</span>
                <span className={`font-medium ${ticket.slaBreach ? 'text-red-600' : 'text-gray-900'}`}>{ticket.sla}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Агент</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-gray-900">{ticket.assignee}</span>
                  <button onClick={handleAssign} className="text-xs text-blue-600 hover:underline">изменить</button>
                </div>
              </div>
              {ticket.linkedEntity && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Связанный объект</span>
                  <Link
                    to={ticket.linkedType === 'order' ? `/orders` : ticket.linkedType === 'pvz' ? `/pvz` : `/couriers`}
                    className="font-mono text-blue-600 hover:text-blue-700 text-xs flex items-center gap-1"
                  >
                    {ticket.linkedEntity} <Link2 className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Теги</h3>
              <button
                onClick={() => toast.info('Добавить тег')}
                className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {ticket.tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                  <Tag className="w-3 h-3" />{tag}
                </span>
              ))}
            </div>
          </div>

          {/* Attached documents */}
          {(() => {
            const ticketDocs: DocumentRecord[] = [
              { id: `t${ticket.id}-doc-1`, name: 'Скриншот проблемы', type: 'PNG', size: '0.8 МБ', date: ticket.createdAt.split(' ')[0], status: 'signed',
                content: { title: 'Скриншот проблемы', number: `ATT-${ticket.id}-001`, date: ticket.createdAt.split(' ')[0], organization: 'Вложение тикета',
                  headerFields: [{ label: 'Тикет', value: `#${ticket.id}` }, { label: 'От', value: ticket.client.name }, { label: 'Тип', value: 'Скриншот' }],
                  tableHeaders: ['Параметр', 'Значение'], tableRows: [['Формат', 'PNG'], ['Размер', '0.8 МБ'], ['Загружено', ticket.createdAt]],
                  notes: ['Автоматически прикреплён при создании тикета'] }},
              { id: `t${ticket.id}-doc-2`, name: 'Лог заказа', type: 'PDF', size: '0.3 МБ', date: ticket.updatedAt.split(' ')[0], status: 'signed',
                content: { title: 'Лог событий заказа', subtitle: ticket.linkedEntity || '', number: `LOG-${ticket.id}-001`, date: ticket.updatedAt.split(' ')[0], organization: 'Системный отчёт',
                  headerFields: [{ label: 'Тикет', value: `#${ticket.id}` }, { label: 'Объект', value: ticket.linkedEntity || '—' }],
                  tableHeaders: ['Время', 'Событие', 'Статус'], tableRows: [['09:15', 'Заказ создан', 'OK'], ['09:20', 'Курьер назначен', 'OK'], ['10:00', 'Забран из магазина', 'OK'], ['10:45', 'Задержка в пути', '⚠'], ['11:30', 'Доставлен клиенту', 'OK']],
                  notes: ['Автоматически сгенерирован системой'] }},
              { id: `t${ticket.id}-doc-3`, name: 'Акт решения инцидента', type: 'PDF', size: '0.5 МБ', date: ticket.updatedAt.split(' ')[0], status: currentStatus === 'resolved' || currentStatus === 'closed' ? 'signed' : 'pending',
                content: { title: 'Акт решения инцидента', number: `АКТ-INC-${ticket.id}`, date: ticket.updatedAt.split(' ')[0], organization: 'Служба поддержки',
                  headerFields: [{ label: 'Тикет', value: `#${ticket.id}` }, { label: 'Категория', value: ticket.category }, { label: 'Приоритет', value: PRIORITY_CFG[ticket.priority].label }],
                  tableHeaders: ['Параметр', 'Значение'], tableRows: [['Тема', ticket.subject], ['Заявитель', ticket.client.name], ['Агент', ticket.assignee], ['Создан', ticket.createdAt], ['Обновлён', ticket.updatedAt], ['SLA', ticket.sla]],
                  signatures: [{ role: 'Агент', name: ticket.assignee, signed: currentStatus === 'resolved' || currentStatus === 'closed', date: currentStatus === 'resolved' || currentStatus === 'closed' ? ticket.updatedAt : undefined }] }},
            ];
            return (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 mb-3">Документы</h3>
                <div className="space-y-2">
                  {ticketDocs.map(doc => (
                    <div key={doc.id} className="flex items-center gap-3 p-2.5 hover:bg-gray-50 rounded-lg transition-colors group">
                      <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-red-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                        <p className="text-[10px] text-gray-400">{doc.type} · {doc.size}</p>
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setViewingDoc(doc)} className="p-1.5 hover:bg-blue-50 rounded-lg" title="Просмотреть">
                          <Eye className="w-3.5 h-3.5 text-blue-500" />
                        </button>
                        <button onClick={() => toast.success(`Скачивание: ${doc.name}`)} className="p-1.5 hover:bg-gray-100 rounded-lg" title="Скачать">
                          <Download className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {viewingDoc && ReactDOM.createPortal(
                  <DocumentViewerModal
                    doc={viewingDoc}
                    onClose={() => setViewingDoc(null)}
                    allDocs={ticketDocs}
                    onNavigate={d => setViewingDoc(d)}
                  />,
                  document.body
                )}
              </div>
            );
          })()}

          {/* Quick actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Действия</h3>
            <div className="space-y-2">
              <button
                onClick={() => { handleStatusChange('resolved'); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 text-sm font-medium transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" /> Отметить решённым
              </button>
              <button
                onClick={() => { handleStatusChange('closed'); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 text-sm transition-colors"
              >
                <XCircle className="w-4 h-4" /> Закрыть тикет
              </button>
              <button
                onClick={() => toast.success('Эскалировано', { description: 'Тикет передан старшему менеджеру' })}
                className="w-full flex items-center gap-2 px-3 py-2.5 border border-orange-200 text-orange-700 bg-orange-50 rounded-xl hover:bg-orange-100 text-sm transition-colors"
              >
                <AlertCircle className="w-4 h-4" /> Эскалировать
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
