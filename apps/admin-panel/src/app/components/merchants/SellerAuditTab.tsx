import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, Filter, FileText, User, Settings, CreditCard, Package,
  Users, Download, ChevronDown, ChevronRight, Clock, Shield,
  AlertTriangle, CheckCircle, Info, Eye, X, Copy, Check,
  RefreshCw, DollarSign, ShoppingBag, Tag, ArrowUpRight,
} from 'lucide-react';
import { getAuditEntries, AuditEntry } from '../../data/merchants-mock';
import { toast } from 'sonner';
import { copyToClipboard } from '../../utils/clipboard';

interface Props { sellerId: string; }

// ─── Config ──────────────────────────────────────────────────────────────────

const ACTION_CONFIG: Record<string, {
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
  severity: 'info' | 'warning' | 'success' | 'neutral';
}> = {
  'product.price_changed':        { label: 'Изменение цены',       icon: Tag,         color: 'text-blue-600',    bg: 'bg-blue-100',    border: 'border-blue-200',    severity: 'info' },
  'product.availability_changed': { label: 'Статус наличия',       icon: Package,     color: 'text-orange-600',  bg: 'bg-orange-100',  border: 'border-orange-200',  severity: 'warning' },
  'ticket.created':               { label: 'Создание тикета',      icon: FileText,    color: 'text-purple-600',  bg: 'bg-purple-100',  border: 'border-purple-200',  severity: 'neutral' },
  'store.status_changed':         { label: 'Статус магазина',      icon: Settings,    color: 'text-yellow-700',  bg: 'bg-yellow-100',  border: 'border-yellow-200',  severity: 'warning' },
  'seller.note_added':            { label: 'Заметка',              icon: FileText,    color: 'text-gray-600',    bg: 'bg-gray-100',    border: 'border-gray-200',    severity: 'neutral' },
  'team.user_invited':            { label: 'Приглашение',          icon: Users,       color: 'text-green-600',   bg: 'bg-green-100',   border: 'border-green-200',   severity: 'success' },
  'payout.approved':              { label: 'Выплата одобрена',     icon: CreditCard,  color: 'text-emerald-600', bg: 'bg-emerald-100', border: 'border-emerald-200', severity: 'success' },
  'export.generated':             { label: 'Экспорт данных',       icon: Download,    color: 'text-indigo-600',  bg: 'bg-indigo-100',  border: 'border-indigo-200',  severity: 'neutral' },
  'seller.blocked':               { label: 'Блокировка',           icon: Shield,      color: 'text-red-600',     bg: 'bg-red-100',     border: 'border-red-200',     severity: 'warning' },
  'seller.unblocked':             { label: 'Разблокировка',        icon: CheckCircle, color: 'text-green-600',   bg: 'bg-green-100',   border: 'border-green-200',   severity: 'success' },
  'payout.hold_placed':           { label: 'Холд выплат',          icon: DollarSign,  color: 'text-purple-600',  bg: 'bg-purple-100',  border: 'border-purple-200',  severity: 'warning' },
  'payout.hold_released':         { label: 'Снятие холда',         icon: DollarSign,  color: 'text-teal-600',    bg: 'bg-teal-100',    border: 'border-teal-200',    severity: 'success' },
  'order.cancelled':              { label: 'Отмена заказа',        icon: ShoppingBag, color: 'text-red-600',     bg: 'bg-red-100',     border: 'border-red-200',     severity: 'warning' },
};

const SEVERITY_COLORS = {
  info:    'bg-blue-50 border-blue-200',
  warning: 'bg-amber-50 border-amber-200',
  success: 'bg-green-50 border-green-200',
  neutral: 'bg-white border-gray-200',
};

const ROLE_LABELS: Record<string, string> = {
  owner:   'Владелец',
  manager: 'Менеджер',
  worker:  'Сотрудник',
  admin:   'Администратор',
  support: 'Поддержка',
  system:  'Система',
  finance: 'Финансы',
};

// ─── Expanded Entry Detail ───────────────────────────────���─────────────────────

function AuditEntryDetail({ entry, onClose }: { entry: AuditEntry; onClose: () => void }) {
  const cfg = ACTION_CONFIG[entry.action] || {
    label: entry.action, icon: FileText, color: 'text-gray-600', bg: 'bg-gray-100', border: 'border-gray-200', severity: 'neutral' as const,
  };
  const Icon = cfg.icon;
  const [copied, setCopied] = useState(false);

  const copyId = () => {
    copyToClipboard(entry.entityId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const rows = [
    { label: 'Событие',     value: entry.action },
    { label: 'Объект',      value: `${entry.entity} · ${entry.entityId}` },
    { label: 'Детали',      value: entry.details },
    { label: 'Инициатор',   value: `${entry.actor} (${ROLE_LABELS[entry.actorRole] || entry.actorRole})` },
    { label: 'IP-адрес',    value: entry.ip },
    { label: 'Timestamp',   value: new Date(entry.timestamp).toLocaleString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${cfg.border} ${cfg.bg}`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${cfg.bg} border ${cfg.border}`}>
              <Icon className={`w-4 h-4 ${cfg.color}`} />
            </div>
            <div>
              <p className={`text-sm font-bold ${cfg.color}`}>{cfg.label}</p>
              <p className="text-[10px] text-gray-500 font-mono">ID: {entry.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/60 rounded-lg transition-colors">
            <X className={`w-4 h-4 ${cfg.color}`} />
          </button>
        </div>

        {/* Details */}
        <div className="p-6 space-y-3">
          <div className="bg-gray-50 rounded-xl border border-gray-100 divide-y divide-gray-100 overflow-hidden">
            {rows.map(r => (
              <div key={r.label} className="flex items-start gap-4 px-4 py-3">
                <span className="text-xs text-gray-400 w-24 shrink-0 pt-0.5">{r.label}</span>
                <span className="text-sm text-gray-800 font-medium flex-1 break-all">{r.value}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button onClick={copyId}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Скопировано' : 'Копировать ID'}
            </button>
            <button onClick={() => { toast.info('Открытие связанного объекта...'); onClose(); }}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              <ArrowUpRight className="w-3.5 h-3.5" />Открыть объект
            </button>
            <div className="flex-1" />
            <button onClick={onClose}
              className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-medium hover:bg-gray-700 transition-colors">
              Закрыть
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SellerAuditTab({ sellerId }: Props) {
  const entries = getAuditEntries(sellerId);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [actorFilter, setActorFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailEntry, setDetailEntry] = useState<AuditEntry | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Unique actions and actors for filter dropdowns
  const uniqueActions = useMemo(() => Array.from(new Set(entries.map(e => e.action))), [entries]);
  const uniqueActors  = useMemo(() => Array.from(new Set(entries.map(e => e.actor))), [entries]);

  const now = new Date();
  const filtered = useMemo(() => {
    return entries.filter(e => {
      const q = search.toLowerCase();
      const matchSearch = !q ||
        e.action.toLowerCase().includes(q) ||
        e.details.toLowerCase().includes(q) ||
        e.actor.toLowerCase().includes(q) ||
        e.entity.toLowerCase().includes(q) ||
        e.entityId.toLowerCase().includes(q);
      const matchAction = actionFilter === 'all' || e.action === actionFilter;
      const matchActor  = actorFilter  === 'all' || e.actor  === actorFilter;
      let matchDate = true;
      if (dateFilter !== 'all') {
        const ts = new Date(e.timestamp);
        const diffH = (now.getTime() - ts.getTime()) / 3600000;
        if (dateFilter === '24h') matchDate = diffH <= 24;
        if (dateFilter === '7d')  matchDate = diffH <= 24 * 7;
        if (dateFilter === '30d') matchDate = diffH <= 24 * 30;
      }
      return matchSearch && matchAction && matchActor && matchDate;
    });
  }, [search, actionFilter, actorFilter, dateFilter, entries]);

  // Stats
  const stats = useMemo(() => {
    const today = entries.filter(e => (now.getTime() - new Date(e.timestamp).getTime()) < 86400000).length;
    const warnings = entries.filter(e => {
      const cfg = ACTION_CONFIG[e.action];
      return cfg?.severity === 'warning';
    }).length;
    return { total: entries.length, today, warnings };
  }, [entries]);

  const handleExport = () => {
    const csv = [
      'Timestamp,Действие,Инициатор,Роль,Объект,ID объекта,Детали,IP',
      ...filtered.map(e => [
        e.timestamp, e.action, e.actor, e.actorRole, e.entity, e.entityId,
        `"${e.details}"`, e.ip,
      ].join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `audit-${sellerId}-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Экспорт аудита: ${filtered.length} записей`);
  };

  const formatAction = (action: string) => ACTION_CONFIG[action]?.label || action;

  return (
    <div className="space-y-4">
      {/* ── Header + Stats ── */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold text-gray-900">Журнал аудита</h3>
          <p className="text-xs text-gray-500 mt-0.5">Все действия по продавцу — append-only, неизменяемый лог</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => toast.success('Журнал обновлён')}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <Download className="w-3.5 h-3.5" />Экспорт CSV
          </button>
        </div>
      </div>

      {/* Stats chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-xl text-xs font-medium text-gray-700">
          <FileText className="w-3.5 h-3.5" />Всего: {stats.total}
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 rounded-xl text-xs font-medium text-blue-700">
          <Clock className="w-3.5 h-3.5" />За 24ч: {stats.today}
        </div>
        {stats.warnings > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 rounded-xl text-xs font-medium text-amber-700">
            <AlertTriangle className="w-3.5 h-3.5" />Предупреждений: {stats.warnings}
          </div>
        )}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 rounded-xl text-xs font-medium text-green-700">
          <Shield className="w-3.5 h-3.5" />Аудит: append-only
        </div>
      </div>

      {/* ── Search + Filters ── */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Поиск по действию, актору, деталям, ID объекта..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-sm font-medium transition-colors ${showFilters ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            <Filter className="w-4 h-4" />Фильтры
            {(actionFilter !== 'all' || actorFilter !== 'all' || dateFilter !== 'all') && (
              <span className="w-2 h-2 bg-blue-600 rounded-full" />
            )}
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-2 pt-1">
                <select value={actionFilter} onChange={e => setActionFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="all">Все действия</option>
                  {uniqueActions.map(a => <option key={a} value={a}>{formatAction(a)}</option>)}
                </select>
                <select value={actorFilter} onChange={e => setActorFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="all">Все инициаторы</option>
                  {uniqueActors.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <select value={dateFilter} onChange={e => setDateFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="all">Все время</option>
                  <option value="24h">Последние 24ч</option>
                  <option value="7d">Последние 7 дней</option>
                  <option value="30d">Последние 30 дней</option>
                </select>
                {(actionFilter !== 'all' || actorFilter !== 'all' || dateFilter !== 'all') && (
                  <button onClick={() => { setActionFilter('all'); setActorFilter('all'); setDateFilter('all'); }}
                    className="flex items-center gap-1 px-3 py-2 bg-gray-100 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-200 transition-colors">
                    <X className="w-3.5 h-3.5" />Сбросить
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Timeline ── */}
      <div className="relative">
        <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-200 z-0" />
        <div className="space-y-3">
          {filtered.map(entry => {
            const cfg = ACTION_CONFIG[entry.action] || {
              label: entry.action, icon: FileText, color: 'text-gray-600', bg: 'bg-gray-100', border: 'border-gray-200', severity: 'neutral' as const,
            };
            const Icon = cfg.icon;
            const isExpanded = expandedId === entry.id;
            const severityBg = SEVERITY_COLORS[cfg.severity];

            return (
              <motion.div key={entry.id} layout className="flex gap-4 relative">
                {/* Icon circle */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 border ${cfg.bg} ${cfg.border}`}>
                  <Icon className={`w-4 h-4 ${cfg.color}`} />
                </div>

                {/* Card */}
                <div className={`flex-1 border rounded-xl overflow-hidden transition-all ${isExpanded ? 'shadow-md' : 'hover:shadow-sm'} ${severityBg}`}>
                  {/* Main row */}
                  <button
                    className="w-full flex items-start justify-between px-4 py-3 text-left"
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-gray-900">{formatAction(entry.action)}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                          {entry.entity}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">#{entry.entityId}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1 leading-relaxed">{entry.details}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-3 shrink-0">
                      <span className="text-xs text-gray-400">
                        {new Date(entry.timestamp).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {/* Actor row always visible */}
                  <div className="flex items-center gap-3 px-4 pb-3 text-xs text-gray-400">
                    {entry.actorRole === 'system'
                      ? <Settings className="w-3.5 h-3.5" />
                      : <User className="w-3.5 h-3.5" />}
                    <span className="font-medium text-gray-600">{entry.actor}</span>
                    <span className="px-1.5 py-0.5 bg-white/80 border border-gray-200 rounded-md text-[10px]">
                      {ROLE_LABELS[entry.actorRole] || entry.actorRole}
                    </span>
                    <span className="ml-auto font-mono">IP: {entry.ip}</span>
                  </div>

                  {/* Expanded detail */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-white/70 rounded-lg p-2.5 border border-gray-100">
                              <p className="text-gray-400 mb-0.5">Полное действие</p>
                              <p className="font-mono text-gray-700 break-all">{entry.action}</p>
                            </div>
                            <div className="bg-white/70 rounded-lg p-2.5 border border-gray-100">
                              <p className="text-gray-400 mb-0.5">Временная метка</p>
                              <p className="font-mono text-gray-700">
                                {new Date(entry.timestamp).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={e => { e.stopPropagation(); setDetailEntry(entry); }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />Детали записи
                            </button>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                copyToClipboard(JSON.stringify(entry, null, 2));
                                toast.success('Запись скопирована в буфер обмена');
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                              <Info className="w-3.5 h-3.5" />Копировать JSON
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium text-gray-500">Нет записей аудита</p>
          <p className="text-xs mt-1">Попробуйте изменить параметры поиска или сбросить фильтры</p>
          {(search || actionFilter !== 'all' || actorFilter !== 'all' || dateFilter !== 'all') && (
            <button onClick={() => { setSearch(''); setActionFilter('all'); setActorFilter('all'); setDateFilter('all'); }}
              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-medium hover:bg-blue-700 transition-colors">
              Сбросить фильтры
            </button>
          )}
        </div>
      )}

      {/* ── Compliance Note ── */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <div className="flex items-start gap-2">
          <Shield className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-gray-700 mb-1">Политика аудита</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              Журнал является <span className="font-semibold">append-only</span> — записи не могут быть изменены или удалены.
              Хранение: минимум <span className="font-semibold">7 лет</span> для финансовых операций.
              Все экспорты и доступ к персональным данным логируются автоматически.
              Экспорт журнала доступен в форматах CSV и JSON.
            </p>
          </div>
        </div>
      </div>

      {/* ── Entry Detail Modal ── */}
      <AnimatePresence>
        {detailEntry && <AuditEntryDetail entry={detailEntry} onClose={() => setDetailEntry(null)} />}
      </AnimatePresence>
    </div>
  );
}