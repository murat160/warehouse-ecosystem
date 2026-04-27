import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Search, Plus, MessageSquare, AlertCircle, Clock,
  X, ChevronDown, User, Tag, Link2, Filter,
  CheckCircle2, XCircle, RotateCcw, Download,
} from 'lucide-react';
import { exportToCsv } from '../../utils/downloads';

type TicketStatus   = 'open' | 'in_progress' | 'resolved' | 'closed';
type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
type TicketCategory = 'order' | 'pvz' | 'courier' | 'finance' | 'technical';

interface Ticket {
  id: string;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  assignee?: string;
  linkedEntity?: string;
  client: string;
  messages: number;
}

const TICKETS_DATA: Ticket[] = [
  { id: '1', subject: 'Заказ не доставлен вовремя', category: 'order', status: 'in_progress', priority: 'high', createdAt: '14.03.2026 10:30', assignee: 'Поддержка Л.', linkedEntity: 'ORD-2026-4512', client: 'Иванов П.С.', messages: 4 },
  { id: '2', subject: 'ПВЗ переполнен', category: 'pvz', status: 'open', priority: 'critical', createdAt: '14.03.2026 09:15', linkedEntity: 'MSK-002', client: 'Оператор MSK-002', messages: 2 },
  { id: '3', subject: 'Расхождение кассы', category: 'finance', status: 'resolved', priority: 'medium', createdAt: '13.03.2026 16:20', assignee: 'Финансист А.', linkedEntity: 'MSK-003', client: 'Оператор MSK-003', messages: 4 },
  { id: '4', subject: 'Курьер не выходит на связь', category: 'courier', status: 'open', priority: 'high', createdAt: '14.03.2026 11:00', client: 'Диспетчер', messages: 1 },
  { id: '5', subject: 'Ошибка при оплате заказа', category: 'technical', status: 'in_progress', priority: 'medium', createdAt: '13.03.2026 14:45', assignee: 'Тех. поддержка', linkedEntity: 'ORD-2026-4488', client: 'Смирнова Е.В.', messages: 3 },
  { id: '6', subject: 'Заявка на возврат средств', category: 'finance', status: 'open', priority: 'low', createdAt: '12.03.2026 18:00', client: 'Козлов Р.А.', messages: 1 },
];

const STATUS_LABELS: Record<TicketStatus, string> = { open: 'Открыт', in_progress: 'В работе', resolved: 'Решён', closed: 'Закрыт' };
const STATUS_COLORS: Record<TicketStatus, string> = {
  open: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-700',
};
const PRIORITY_COLORS: Record<TicketPriority, string> = {
  low: 'text-gray-500', medium: 'text-blue-600', high: 'text-orange-600', critical: 'text-red-600',
};
const PRIORITY_LABELS: Record<TicketPriority, string> = { low: 'Низкий', medium: 'Средний', high: 'Высокий', critical: 'Критичный' };
const CATEGORY_LABELS: Record<TicketCategory, string> = { order: 'Заказ', pvz: 'ПВЗ', courier: 'Курьер', finance: 'Финансы', technical: 'Техника' };

export function TicketsList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | 'all'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>(TICKETS_DATA);

  // Create form
  const [form, setForm] = useState({
    subject: '', category: 'order' as TicketCategory, priority: 'medium' as TicketPriority,
    client: '', linkedEntity: '', description: '',
  });

  const filtered = tickets.filter(t => {
    const q = searchQuery.toLowerCase();
    const matchSearch = t.subject.toLowerCase().includes(q) || t.client.toLowerCase().includes(q) || (t.linkedEntity || '').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    return matchSearch && matchStatus && matchPriority;
  });

  const stats = {
    open: tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    critical: tickets.filter(t => t.priority === 'critical').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
  };

  const handleCreate = () => {
    if (!form.subject.trim()) {
      toast.error('Укажите тему тикета');
      return;
    }
    const newTicket: Ticket = {
      id: String(Date.now()),
      subject: form.subject,
      category: form.category,
      priority: form.priority,
      status: 'open',
      createdAt: new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      client: form.client || 'Администратор',
      linkedEntity: form.linkedEntity || undefined,
      messages: 1,
    };
    setTickets(prev => [newTicket, ...prev]);
    setShowCreateModal(false);
    setForm({ subject: '', category: 'order', priority: 'medium', client: '', linkedEntity: '', description: '' });
    toast.success('Тикет создан', { description: `#${newTicket.id} — ${newTicket.subject}` });
  };

  const handleExport = () => {
    if (filtered.length === 0) { toast.info('Нет тикетов для экспорта'); return; }
    exportToCsv(filtered as any[], [
      { key: 'id',           label: 'ID' },
      { key: 'subject',      label: 'Тема' },
      { key: 'category',     label: 'Категория' },
      { key: 'status',       label: 'Статус' },
      { key: 'priority',     label: 'Приоритет' },
      { key: 'client',       label: 'Клиент' },
      { key: 'assignee',     label: 'Агент' },
      { key: 'linkedEntity', label: 'Связан с' },
      { key: 'messages',     label: 'Сообщений' },
      { key: 'createdAt',    label: 'Создан' },
    ], 'tickets');
    toast.success(`Скачан CSV: ${filtered.length} тикетов`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Тикеты поддержки</h1>
          <p className="text-gray-500">Управление обращениями · {filtered.length} из {tickets.length}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm transition-colors">
            <Download className="w-4 h-4" /> Экспорт
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" /> Создать тикет
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Открытые',  value: stats.open,        color: 'text-yellow-600', bg: 'bg-yellow-50', filter: 'open'        as TicketStatus | null },
          { label: 'В работе',  value: stats.in_progress, color: 'text-blue-600',   bg: 'bg-blue-50',   filter: 'in_progress' as TicketStatus | null },
          { label: 'Критичные', value: stats.critical,    color: 'text-red-600',    bg: 'bg-red-50',    filter: null },
          { label: 'Решённые',  value: stats.resolved,    color: 'text-green-600',  bg: 'bg-green-50',  filter: 'resolved'    as TicketStatus | null },
        ].map(stat => (
          <button
            key={stat.label}
            onClick={() => { if (stat.filter) setStatusFilter(statusFilter === stat.filter ? 'all' : stat.filter); }}
            className={`${stat.bg} p-4 rounded-xl border text-left transition-all cursor-pointer hover:shadow-md active:scale-[0.97] ${
              stat.filter && statusFilter === stat.filter ? 'border-current ring-2 ring-offset-1' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск по теме, клиенту, объекту..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as TicketStatus | 'all')}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
          >
            <option value="all">Все статусы</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value as TicketPriority | 'all')}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
          >
            <option value="all">Все приоритеты</option>
            {Object.entries(PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>

      {/* Tickets list */}
      <div className="space-y-3">
        {filtered.map(ticket => (
          <Link
            key={ticket.id}
            to={`/support/tickets/${ticket.id}`}
            className={`block bg-white p-5 rounded-xl border hover:shadow-md transition-all ${
              ticket.priority === 'critical' ? 'border-red-200' : 'border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className={`text-xs font-bold ${PRIORITY_COLORS[ticket.priority]}`}>
                    ● {PRIORITY_LABELS[ticket.priority]}
                  </span>
                  <h3 className="font-semibold text-gray-900">{ticket.subject}</h3>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[ticket.status]}`}>
                    {STATUS_LABELS[ticket.status]}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                  <span className="font-mono text-gray-400">#{ticket.id}</span>
                  <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{CATEGORY_LABELS[ticket.category]}</span>
                  <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{ticket.client}</span>
                  {ticket.linkedEntity && (
                    <span className="flex items-center gap-1 text-blue-600">
                      <Link2 className="w-3.5 h-3.5" />{ticket.linkedEntity}
                    </span>
                  )}
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{ticket.createdAt}</span>
                  {ticket.assignee && <span>• {ticket.assignee}</span>}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-1 text-gray-400 text-sm">
                  <MessageSquare className="w-4 h-4" />
                  <span>{ticket.messages}</span>
                </div>
              </div>
            </div>
          </Link>
        ))}

        {filtered.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 text-gray-200" />
            <p className="text-gray-500">Тикеты не найдены</p>
            <p className="text-sm text-gray-400 mt-1">Попробуйте изменить фильтры</p>
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-bold text-gray-900">Создать тикет поддержки</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Тема обращения *</label>
                <input
                  value={form.subject}
                  onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  placeholder="Кратко опишите проблему..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Категория</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value as TicketCategory }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Приоритет</label>
                  <select
                    value={form.priority}
                    onChange={e => setForm(f => ({ ...f, priority: e.target.value as TicketPriority }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  >
                    {Object.entries(PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Клиент / Заявитель</label>
                <input
                  value={form.client}
                  onChange={e => setForm(f => ({ ...f, client: e.target.value }))}
                  placeholder="Имя или email..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Связанный объект (необяз.)</label>
                <input
                  value={form.linkedEntity}
                  onChange={e => setForm(f => ({ ...f, linkedEntity: e.target.value }))}
                  placeholder="ORD-2026-XXXX / MSK-001 / ..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Описание</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="Подробное описание проблемы..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCreateModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                  Отмена
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!form.subject.trim()}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:bg-gray-200 disabled:cursor-not-allowed transition-colors"
                >
                  Со��дать тикет
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}