import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Search, Plus, Download, Trash2, Pencil as Edit2, X, Sparkles,
  Calendar, ToggleLeft, ToggleRight, History, User,
} from 'lucide-react';
import {
  RECOMMENDATIONS_INITIAL, RECOMMENDATION_POSITIONS, PRODUCTS,
  type RecommendationSlot,
} from '../../data/products-mock';
import { exportToCsv } from '../../utils/downloads';

interface HistoryEntry {
  at: string;
  actor: string;
  action: string;
}

export function RecommendedProducts() {
  const [recs, setRecs]         = useState<RecommendationSlot[]>(RECOMMENDATIONS_INITIAL);
  const [search, setSearch]     = useState('');
  const [positionFilter, setPositionFilter] = useState<string>('all');
  const [showAdd, setShowAdd]   = useState(false);
  const [editing, setEditing]   = useState<RecommendationSlot | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory]   = useState<HistoryEntry[]>([
    { at: '01.02.2026 10:00', actor: 'Супер Админ',  action: 'Добавлен «iPhone 15 Pro» на главную страницу' },
    { at: '10.02.2026 09:30', actor: 'Карпова А.И.', action: 'Добавлена «Пицца Маргарита» в Акцию недели' },
    { at: '05.02.2026 11:00', actor: 'Иванов И.И.',  action: 'Добавлены «Кроссовки Nike Air 42» в Первые ряды' },
  ]);

  const today = new Date().toLocaleDateString('ru-RU');
  const [form, setForm] = useState({
    productId: PRODUCTS[0]?.id ?? '',
    position: 'home' as RecommendationSlot['position'],
    priority: '1',
    startDate: today,
    endDate: '',
    active: true,
  });

  const filtered = useMemo(() => recs.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.productName.toLowerCase().includes(q) || r.addedBy.toLowerCase().includes(q);
    const matchPos = positionFilter === 'all' || r.position === positionFilter;
    return matchSearch && matchPos;
  }), [recs, search, positionFilter]);

  const stats = useMemo(() => {
    const byPosition: Record<string, number> = {};
    recs.forEach(r => { byPosition[r.position] = (byPosition[r.position] ?? 0) + 1; });
    return { active: recs.filter(r => r.active).length, total: recs.length, byPosition };
  }, [recs]);

  function pushHistory(action: string) {
    setHistory(prev => [{ at: new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }), actor: 'Супер Админ', action }, ...prev]);
  }

  function openAdd() {
    setEditing(null);
    setForm({ productId: PRODUCTS[0]?.id ?? '', position: 'home', priority: '1', startDate: today, endDate: '', active: true });
    setShowAdd(true);
  }

  function openEdit(r: RecommendationSlot) {
    setEditing(r);
    setForm({ productId: r.productId, position: r.position, priority: String(r.priority), startDate: r.startDate, endDate: r.endDate, active: r.active });
    setShowAdd(true);
  }

  function handleSave() {
    const product = PRODUCTS.find(p => p.id === form.productId);
    if (!product) { toast.error('Выберите товар'); return; }
    const priority = parseInt(form.priority, 10);
    if (!Number.isFinite(priority) || priority < 1) { toast.error('Приоритет должен быть >= 1'); return; }

    if (editing) {
      setRecs(prev => prev.map(r => r.id === editing.id ? {
        ...r,
        productId: product.id, productName: product.name,
        position: form.position, priority, startDate: form.startDate, endDate: form.endDate,
        active: form.active,
      } : r));
      pushHistory(`Изменена рекомендация для «${product.name}» (${form.position}, приоритет ${priority})`);
      toast.success(`Рекомендация обновлена: ${product.name}`);
    } else {
      const id = `rec-${Date.now()}`;
      setRecs(prev => [{
        id, productId: product.id, productName: product.name,
        position: form.position, priority, startDate: form.startDate, endDate: form.endDate,
        active: form.active,
        addedBy: 'Супер Админ', addedByRole: 'SuperAdmin',
        addedAt: new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      }, ...prev]);
      pushHistory(`Добавлен «${product.name}» в позицию ${form.position}`);
      toast.success(`Рекомендация создана: ${product.name}`);
    }
    setShowAdd(false);
    setEditing(null);
  }

  function toggleActive(id: string) {
    const r = recs.find(x => x.id === id);
    setRecs(prev => prev.map(x => x.id === id ? { ...x, active: !x.active } : x));
    if (r) {
      pushHistory(`${r.active ? 'Отключена' : 'Включена'} рекомендация для «${r.productName}»`);
      toast.success(`«${r.productName}» ${r.active ? 'отключён' : 'включён'}`);
    }
  }

  function removeRec(id: string) {
    const r = recs.find(x => x.id === id);
    if (!r) return;
    const ok = window.confirm(`Удалить рекомендацию для «${r.productName}»?`);
    if (!ok) return;
    setRecs(prev => prev.filter(x => x.id !== id));
    pushHistory(`Удалена рекомендация для «${r.productName}»`);
    toast.success(`Удалена рекомендация: ${r.productName}`);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-500" />
            <h1 className="text-2xl font-bold text-gray-900">Рекомендуемые товары</h1>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">Внутренние рекомендации платформы — что покупатели увидят первыми. Не путать с акциями (Продвижение).</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowHistory(true)}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm">
            <History className="w-4 h-4" />История
          </button>
          <button
            onClick={() => {
              if (recs.length === 0) { toast.info('Нет рекомендаций для экспорта'); return; }
              exportToCsv(recs as any[], [
                { key: 'id',           label: 'ID' },
                { key: 'productName',  label: 'Товар' },
                { key: 'position',     label: 'Позиция' },
                { key: 'priority',     label: 'Приоритет' },
                { key: 'startDate',    label: 'С' },
                { key: 'endDate',      label: 'По' },
                { key: 'active',       label: 'Активна' },
                { key: 'addedBy',      label: 'Кем добавлена' },
                { key: 'addedByRole',  label: 'Роль' },
                { key: 'addedAt',      label: 'Дата добавления' },
              ], 'recommendations');
              toast.success(`Скачан CSV: ${recs.length} рекомендаций`);
            }}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm">
            <Download className="w-4 h-4" />Экспорт
          </button>
          <button onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold">
            <Plus className="w-4 h-4" />Добавить рекомендацию
          </button>
        </div>
      </div>

      {/* KPI per position */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {RECOMMENDATION_POSITIONS.map(pos => {
          const count = stats.byPosition[pos.id] ?? 0;
          const isActive = positionFilter === pos.id;
          return (
            <button key={pos.id}
              onClick={() => setPositionFilter(isActive ? 'all' : pos.id)}
              className={`p-3 rounded-xl border text-left transition-all hover:shadow-md cursor-pointer active:scale-[0.97] ${isActive ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-300/50' : 'bg-white border-gray-200'}`}>
              <p className="text-xs text-gray-500 mb-1">{pos.label}</p>
              <p className="text-xl font-bold text-purple-700">{count}</p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по товару, автору..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
        <select value={positionFilter} onChange={e => setPositionFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500">
          <option value="all">Все позиции</option>
          {RECOMMENDATION_POSITIONS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Sparkles className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Рекомендации не найдены</p>
            <button onClick={openAdd} className="text-purple-600 underline text-xs mt-2">Создать первую</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Товар</th>
                  <th className="text-left px-3 py-3 font-medium text-gray-500">Позиция</th>
                  <th className="text-center px-3 py-3 font-medium text-gray-500">Приоритет</th>
                  <th className="text-left px-3 py-3 font-medium text-gray-500 hidden lg:table-cell">Период</th>
                  <th className="text-left px-3 py-3 font-medium text-gray-500 hidden xl:table-cell">Кем добавлено</th>
                  <th className="text-center px-3 py-3 font-medium text-gray-500">Активна</th>
                  <th className="text-center px-3 py-3 font-medium text-gray-500">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(r => {
                  const product = PRODUCTS.find(p => p.id === r.productId);
                  const positionLabel = RECOMMENDATION_POSITIONS.find(p => p.id === r.position)?.label ?? r.position;
                  return (
                    <tr key={r.id} className={`hover:bg-gray-50/50 transition-colors ${!r.active ? 'opacity-60' : ''}`}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{r.productName}</p>
                        {product && <p className="text-xs text-gray-500 font-mono">{product.sku}</p>}
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs font-medium">{positionLabel}</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-bold">#{r.priority}</span>
                      </td>
                      <td className="px-3 py-3 hidden lg:table-cell text-xs text-gray-600">
                        <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{r.startDate} — {r.endDate || '∞'}</span>
                      </td>
                      <td className="px-3 py-3 hidden xl:table-cell">
                        <p className="text-xs font-medium text-gray-800">{r.addedBy}</p>
                        <p className="text-[10px] text-gray-500">{r.addedByRole} · {r.addedAt}</p>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button onClick={() => toggleActive(r.id)} title={r.active ? 'Отключить' : 'Включить'}>
                          {r.active ? <ToggleRight className="w-5 h-5 text-green-600" /> : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openEdit(r)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md" title="Редактировать"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => removeRec(r.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md" title="Удалить"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500 px-1">
        <Sparkles className="w-3 h-3 inline mr-1 text-purple-500" />
        Рекомендации показываются покупателям первыми. Для маркетинговых акций со скидками используйте раздел
        {' '}<Link to="/products/promotions" className="text-blue-600 hover:underline">Продвижение</Link>.
      </p>

      {/* Add/Edit modal */}
      {showAdd && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <p className="font-bold text-gray-900">{editing ? 'Редактировать рекомендацию' : 'Новая рекомендация'}</p>
              <button onClick={() => setShowAdd(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Товар *</label>
                <select value={form.productId} onChange={e => setForm(f => ({ ...f, productId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                  {PRODUCTS.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Позиция</label>
                  <select value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value as RecommendationSlot['position'] }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                    {RECOMMENDATION_POSITIONS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Приоритет</label>
                  <input type="number" min="1" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">С</label>
                  <input value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                    placeholder="01.02.2026"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">По (опц.)</label>
                  <input value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                    placeholder="01.05.2026"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
              </div>
              <button onClick={() => setForm(f => ({ ...f, active: !f.active }))}
                className={`w-full py-2 border rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${form.active ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                {form.active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                {form.active ? 'Активна (показывается)' : 'Выключена (скрыта)'}
              </button>
            </div>
            <div className="px-6 py-4 border-t flex gap-3">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Отмена</button>
              <button onClick={handleSave} className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold">{editing ? 'Сохранить' : 'Создать'}</button>
            </div>
          </div>
        </div>
      )}

      {/* History modal */}
      {showHistory && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowHistory(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <p className="font-bold text-gray-900 flex items-center gap-2"><History className="w-4 h-4" />История изменений</p>
              <button onClick={() => setShowHistory(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {history.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8">История пока пуста</p>
              ) : history.map((h, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700">{h.action}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{h.actor} · {h.at}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
