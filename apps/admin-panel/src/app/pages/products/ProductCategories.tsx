import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Search, Plus, Pencil as Edit2, Trash2, Download, X,
  Tag, Eye, ToggleLeft, ToggleRight, Folder, FolderOpen, Package,
} from 'lucide-react';
import {
  CATEGORIES, PRODUCTS,
  type ProductCategory,
} from '../../data/products-mock';
import { exportToCsv } from '../../utils/downloads';

export function ProductCategories() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<ProductCategory[]>(CATEGORIES);
  const [search, setSearch]         = useState('');
  const [showAdd, setShowAdd]       = useState(false);
  const [editing, setEditing]       = useState<ProductCategory | null>(null);
  const [form, setForm]             = useState({ name: '', icon: '📦', parentId: '', active: true });
  const [expandedParents, setExpandedParents] = useState<Set<string>>(() => new Set(CATEGORIES.filter(c => !c.parentId).map(c => c.id)));

  const productCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    PRODUCTS.forEach(p => { counts[p.categoryId] = (counts[p.categoryId] ?? 0) + 1; });
    return counts;
  }, []);

  const totalForCategory = (catId: string): number => {
    let total = productCounts[catId] ?? 0;
    categories.filter(c => c.parentId === catId).forEach(c => { total += productCounts[c.id] ?? 0; });
    return total;
  };

  const parents = useMemo(() => categories.filter(c => !c.parentId), [categories]);
  const childrenOf = (parentId: string) => categories.filter(c => c.parentId === parentId);

  const filteredParents = useMemo(() => {
    if (!search.trim()) return parents;
    const q = search.toLowerCase();
    return parents.filter(p => {
      if (p.name.toLowerCase().includes(q)) return true;
      return childrenOf(p.id).some(c => c.name.toLowerCase().includes(q));
    });
  }, [parents, search]);

  function openAdd(parentId?: string) {
    setEditing(null);
    setForm({ name: '', icon: '📦', parentId: parentId ?? '', active: true });
    setShowAdd(true);
  }

  function openEdit(c: ProductCategory) {
    setEditing(c);
    setForm({ name: c.name, icon: c.icon, parentId: c.parentId ?? '', active: c.active });
    setShowAdd(true);
  }

  function handleSave() {
    const name = form.name.trim();
    if (!name) { toast.error('Введите название категории'); return; }
    if (editing) {
      setCategories(prev => prev.map(c => c.id === editing.id ? { ...c, name, icon: form.icon, parentId: form.parentId || null, active: form.active } : c));
      toast.success(`Категория обновлена: ${name}`);
    } else {
      setCategories(prev => [...prev, {
        id: `cat-${Date.now()}`, name, icon: form.icon, parentId: form.parentId || null,
        active: form.active, createdAt: new Date().toLocaleDateString('ru-RU'),
      }]);
      toast.success(`Категория создана: ${name}`);
    }
    setShowAdd(false);
    setEditing(null);
  }

  function toggleActive(id: string) {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, active: !c.active } : c));
    const c = categories.find(x => x.id === id);
    if (c) toast.success(`Категория «${c.name}» ${c.active ? 'выключена' : 'включена'}`);
  }

  function archiveCategory(id: string) {
    const cnt = productCounts[id] ?? 0;
    if (cnt > 0) {
      const ok = window.confirm(`В категории ${cnt} товаров. Удалить категорию из дерева?`);
      if (!ok) return;
    }
    const c = categories.find(x => x.id === id);
    setCategories(prev => prev.filter(x => x.id !== id && x.parentId !== id));
    toast.success(`Категория «${c?.name ?? id}» удалена`);
  }

  function toggleExpand(id: string) {
    setExpandedParents(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Категории товаров</h1>
          <p className="text-sm text-gray-500 mt-0.5">Дерево категорий · {categories.length} категорий, {parents.length} корневых</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (categories.length === 0) { toast.info('Нет категорий для экспорта'); return; }
              const rows = categories.map(c => ({
                id: c.id, name: c.name, parentName: c.parentId ? (categories.find(p => p.id === c.parentId)?.name ?? '') : '—',
                active: c.active ? 'Да' : 'Нет', productsCount: productCounts[c.id] ?? 0, createdAt: c.createdAt,
              }));
              exportToCsv(rows as any[], [
                { key: 'id',            label: 'ID' },
                { key: 'name',          label: 'Название' },
                { key: 'parentName',    label: 'Родительская' },
                { key: 'active',        label: 'Активна' },
                { key: 'productsCount', label: 'Товаров' },
                { key: 'createdAt',     label: 'Создана' },
              ], 'categories');
              toast.success(`Скачан CSV: ${categories.length} категорий`);
            }}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm">
            <Download className="w-4 h-4" />Экспорт
          </button>
          <button onClick={() => openAdd()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
            <Plus className="w-4 h-4" />Добавить категорию
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 relative">
        <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Поиск по названию категории..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>

      {/* Tree */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filteredParents.length === 0 && (
          <div className="py-12 text-center text-gray-400">
            <Tag className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Категории не найдены</p>
          </div>
        )}
        {filteredParents.map(parent => {
          const children = childrenOf(parent.id);
          const isExpanded = expandedParents.has(parent.id);
          const total = totalForCategory(parent.id);
          return (
            <div key={parent.id} className="border-b border-gray-50 last:border-0">
              {/* Parent row */}
              <div className={`flex items-center gap-3 px-4 py-3 ${parent.active ? '' : 'opacity-60'} hover:bg-gray-50 transition-colors`}>
                <button onClick={() => toggleExpand(parent.id)} className="p-1 text-gray-400 hover:text-gray-700 rounded">
                  {isExpanded ? <FolderOpen className="w-4 h-4" /> : <Folder className="w-4 h-4" />}
                </button>
                <span className="text-xl shrink-0">{parent.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900">{parent.name}</p>
                    {!parent.active && <span className="px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded text-[10px] font-medium">Выключена</span>}
                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-semibold">{total} товаров</span>
                    <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded text-[10px] font-semibold">{children.length} подкатегорий</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">ID: <span className="font-mono">{parent.id}</span> · создана {parent.createdAt}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => navigate(`/products?category=${parent.id}`)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md" title="Товары категории"><Eye className="w-3.5 h-3.5" /></button>
                  <button onClick={() => openAdd(parent.id)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md" title="Добавить подкатегорию"><Plus className="w-3.5 h-3.5" /></button>
                  <button onClick={() => openEdit(parent)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md" title="Редактировать"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => toggleActive(parent.id)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md" title={parent.active ? 'Выключить' : 'Включить'}>
                    {parent.active ? <ToggleRight className="w-4 h-4 text-green-600" /> : <ToggleLeft className="w-4 h-4" />}
                  </button>
                  <button onClick={() => archiveCategory(parent.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md" title="Удалить"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              {/* Children */}
              {isExpanded && children.length > 0 && (
                <div className="bg-gray-50/40">
                  {children.map(child => {
                    const cnt = productCounts[child.id] ?? 0;
                    return (
                      <div key={child.id} className={`flex items-center gap-3 pl-12 pr-4 py-2.5 ${child.active ? '' : 'opacity-60'} hover:bg-gray-50 transition-colors`}>
                        <span className="text-base shrink-0">{child.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-gray-800">{child.name}</p>
                            {!child.active && <span className="px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded text-[10px] font-medium">Выключена</span>}
                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-semibold">{cnt} товаров</span>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-0.5 font-mono">{child.id}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => navigate(`/products?category=${child.id}`)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md" title="Товары"><Eye className="w-3.5 h-3.5" /></button>
                          <button onClick={() => openEdit(child)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md" title="Редактировать"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => toggleActive(child.id)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md" title={child.active ? 'Выключить' : 'Включить'}>
                            {child.active ? <ToggleRight className="w-4 h-4 text-green-600" /> : <ToggleLeft className="w-4 h-4" />}
                          </button>
                          <button onClick={() => archiveCategory(child.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md" title="Удалить"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add / Edit modal */}
      {showAdd && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <p className="font-bold text-gray-900">{editing ? 'Редактировать категорию' : 'Новая категория'}</p>
              <button onClick={() => setShowAdd(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Название *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Электроника" autoFocus
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Иконка (emoji)</label>
                  <input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value.slice(0, 4) }))}
                    placeholder="📦"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Активность</label>
                  <button onClick={() => setForm(f => ({ ...f, active: !f.active }))}
                    className={`w-full px-3 py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${form.active ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-gray-50 border border-gray-200 text-gray-500'}`}>
                    {form.active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                    {form.active ? 'Включена' : 'Выключена'}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Родительская категория</label>
                <select value={form.parentId} onChange={e => setForm(f => ({ ...f, parentId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">— Без родительской (корневая)</option>
                  {parents.filter(p => !editing || p.id !== editing.id).map(p => (
                    <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex gap-3">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Отмена</button>
              <button onClick={handleSave} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold">{editing ? 'Сохранить' : 'Создать'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
