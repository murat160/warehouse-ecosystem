import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Search, Plus, Download, Filter, Eye, Pencil as Edit2, Image as ImageIcon,
  CheckCircle2, AlertCircle, Ban, Archive, Send, X, Package,
  Tag, Store, Star,
} from 'lucide-react';
import {
  PRODUCTS, CATEGORIES, PRODUCT_STATUS_CFG,
  getCategoryName, fmtPrice,
  type Product, type ProductStatus,
} from '../../data/products-mock';
import { exportToCsv } from '../../utils/downloads';

type StatusFilter = ProductStatus | 'all' | 'no_photo';

export function ProductsList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [products, setProducts]       = useState<Product[]>(PRODUCTS);
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>(searchParams.get('category') ?? 'all');

  // Sync ?category=… from URL when user comes from Categories page.
  useEffect(() => {
    const c = searchParams.get('category');
    if (c) setCategoryFilter(c);
  }, [searchParams]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewingId, setViewingId]     = useState<string | null>(null);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [photosForId, setPhotosForId] = useState<string | null>(null);

  // Add/Edit form
  const [form, setForm] = useState({ name: '', sku: '', categoryId: 'cat-electronics', price: '', stock: '', merchant: '' });

  const stats = useMemo(() => ({
    total:      products.length,
    active:     products.filter(p => p.status === 'active').length,
    moderation: products.filter(p => p.status === 'moderation').length,
    blocked:    products.filter(p => p.status === 'blocked').length,
    noPhoto:    products.filter(p => p.photoCount === 0).length,
  }), [products]);

  const filtered = useMemo(() => {
    return products.filter(p => {
      const q = search.toLowerCase();
      const matchSearch = !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.merchant.toLowerCase().includes(q) ||
        getCategoryName(p.categoryId).toLowerCase().includes(q);
      const matchCategory = categoryFilter === 'all' || p.categoryId === categoryFilter;
      let matchStatus = true;
      if (statusFilter === 'no_photo') matchStatus = p.photoCount === 0;
      else if (statusFilter !== 'all') matchStatus = p.status === statusFilter;
      return matchSearch && matchCategory && matchStatus;
    });
  }, [products, search, statusFilter, categoryFilter]);

  function setStatus(id: string, status: ProductStatus) {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, status, updatedAt: new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) } : p));
  }

  function openAddModal() {
    setEditingId(null);
    setForm({ name: '', sku: '', categoryId: 'cat-electronics', price: '', stock: '', merchant: '' });
    setShowAddModal(true);
  }

  function openEditModal(p: Product) {
    setEditingId(p.id);
    setForm({ name: p.name, sku: p.sku, categoryId: p.categoryId, price: String(p.price), stock: String(p.stock), merchant: p.merchant });
    setShowAddModal(true);
  }

  function handleSave() {
    const name = form.name.trim();
    if (!name) { toast.error('Введите название товара'); return; }
    if (!form.sku.trim()) { toast.error('Укажите SKU'); return; }
    const price = parseFloat(form.price);
    const stock = parseInt(form.stock, 10);
    if (!Number.isFinite(price) || price < 0) { toast.error('Некорректная цена'); return; }
    if (!Number.isFinite(stock) || stock < 0) { toast.error('Некорректный остаток'); return; }

    const now = new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    if (editingId) {
      setProducts(prev => prev.map(p => p.id === editingId ? { ...p, name, sku: form.sku.trim(), categoryId: form.categoryId, price, stock, merchant: form.merchant.trim() || p.merchant, updatedAt: now } : p));
      toast.success(`Товар обновлён: ${name}`);
    } else {
      setProducts(prev => [{
        id: `p-${Date.now()}`, sku: form.sku.trim(), name, categoryId: form.categoryId,
        merchant: form.merchant.trim() || 'Не указан', merchantId: 'm-new',
        status: 'moderation', price, stock, photoCount: 0, rating: 0, sales: 0,
        createdAt: now, updatedAt: now,
      }, ...prev]);
      toast.success(`Товар создан: ${name}`, { description: 'Статус: На модерации' });
    }
    setShowAddModal(false);
    setEditingId(null);
  }

  const viewing = products.find(p => p.id === viewingId);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Товары</h1>
          <p className="text-sm text-gray-500 mt-0.5">Каталог товаров платформы · {products.length} позиций</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (filtered.length === 0) { toast.info('Нет товаров для экспорта'); return; }
              exportToCsv(filtered as any[], [
                { key: 'sku',         label: 'SKU' },
                { key: 'name',        label: 'Название' },
                { key: 'categoryId',  label: 'Категория' },
                { key: 'merchant',    label: 'Продавец' },
                { key: 'status',      label: 'Статус' },
                { key: 'price',       label: 'Цена' },
                { key: 'stock',       label: 'Остаток' },
                { key: 'photoCount',  label: 'Фото' },
                { key: 'rating',      label: 'Рейтинг' },
                { key: 'sales',       label: 'Продажи' },
                { key: 'updatedAt',   label: 'Обновлён' },
              ], 'products');
              toast.success(`Скачан CSV: ${filtered.length} товаров`);
            }}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm">
            <Download className="w-4 h-4" />Экспорт
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
            <Plus className="w-4 h-4" />Добавить товар
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Всего',           value: stats.total,      bg: 'bg-white border-gray-200',           color: 'text-gray-900',  filter: 'all'        as StatusFilter },
          { label: 'Активные',        value: stats.active,     bg: 'bg-green-50 border-green-200',       color: 'text-green-700', filter: 'active'     as StatusFilter },
          { label: 'На модерации',    value: stats.moderation, bg: 'bg-yellow-50 border-yellow-200',     color: 'text-yellow-700',filter: 'moderation' as StatusFilter },
          { label: 'Заблокированы',   value: stats.blocked,    bg: 'bg-red-50 border-red-200',           color: 'text-red-700',   filter: 'blocked'    as StatusFilter },
          { label: 'Без фото',        value: stats.noPhoto,    bg: 'bg-orange-50 border-orange-200',     color: 'text-orange-700',filter: 'no_photo'   as StatusFilter },
        ].map(stat => {
          const isActive = statusFilter === stat.filter;
          return (
            <button key={stat.label}
              onClick={() => setStatusFilter(isActive ? 'all' : stat.filter)}
              className={`${stat.bg} p-3 rounded-xl border transition-all text-left hover:shadow-md cursor-pointer active:scale-[0.97] ${isActive ? 'ring-2 ring-current ring-offset-1' : 'hover:border-gray-300'}`}
            >
              <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
              <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск по названию, SKU, продавцу, категории..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="all">Все категории</option>
          {CATEGORIES.filter(c => c.parentId).map(c => (
            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as StatusFilter)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="all">Все статусы</option>
          <option value="active">Активные</option>
          <option value="moderation">На модерации</option>
          <option value="blocked">Заблокированы</option>
          <option value="archived">В архиве</option>
          <option value="no_photo">Без фото</option>
        </select>
        {(search || categoryFilter !== 'all' || statusFilter !== 'all') && (
          <button onClick={() => { setSearch(''); setCategoryFilter('all'); setStatusFilter('all'); }}
            className="px-3 py-2 border border-orange-200 bg-orange-50 text-orange-700 rounded-lg text-sm hover:bg-orange-100 flex items-center gap-1.5">
            <X className="w-3.5 h-3.5" />Сбросить
          </button>
        )}
      </div>

      <p className="text-sm text-gray-500">Найдено: <span className="font-semibold text-gray-800">{filtered.length}</span> из {products.length}</p>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Товар</th>
                <th className="text-left px-3 py-3 font-medium text-gray-500 hidden lg:table-cell">Категория</th>
                <th className="text-left px-3 py-3 font-medium text-gray-500 hidden xl:table-cell">Продавец</th>
                <th className="text-right px-3 py-3 font-medium text-gray-500">Цена</th>
                <th className="text-right px-3 py-3 font-medium text-gray-500 hidden lg:table-cell">Остаток</th>
                <th className="text-center px-3 py-3 font-medium text-gray-500 hidden xl:table-cell">Фото</th>
                <th className="text-left px-3 py-3 font-medium text-gray-500">Статус</th>
                <th className="text-center px-3 py-3 font-medium text-gray-500">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(p => {
                const sc = PRODUCT_STATUS_CFG[p.status];
                return (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-xs shrink-0">
                          {p.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <button onClick={() => setViewingId(p.id)} className="font-medium text-gray-900 hover:text-blue-600 text-left">{p.name}</button>
                          <p className="text-xs text-gray-500 mt-0.5 font-mono">{p.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-gray-600 hidden lg:table-cell">
                      <span className="text-xs">{getCategoryName(p.categoryId)}</span>
                    </td>
                    <td className="px-3 py-3 text-gray-600 hidden xl:table-cell">
                      <span className="text-xs">{p.merchant}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="font-medium text-gray-900">{fmtPrice(p.price)}</span>
                    </td>
                    <td className="px-3 py-3 text-right hidden lg:table-cell">
                      <span className={`font-medium ${p.stock === 0 ? 'text-red-600' : p.stock < 20 ? 'text-orange-600' : 'text-gray-700'}`}>{p.stock}</span>
                    </td>
                    <td className="px-3 py-3 text-center hidden xl:table-cell">
                      {p.photoCount > 0
                        ? <span className="inline-flex items-center gap-1 text-xs text-gray-600"><ImageIcon className="w-3 h-3" />{p.photoCount}</span>
                        : <span className="inline-flex items-center gap-1 text-xs text-orange-600"><AlertCircle className="w-3 h-3" />Нет</span>}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${sc.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setViewingId(p.id)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md" title="Открыть карточку"><Eye className="w-3.5 h-3.5" /></button>
                        <button onClick={() => openEditModal(p)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md" title="Редактировать"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setPhotosForId(p.id)} className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-md" title="Фото товара"><ImageIcon className="w-3.5 h-3.5" /></button>
                        {p.status !== 'moderation' && p.status !== 'archived' && (
                          <button onClick={() => { setStatus(p.id, 'moderation'); toast.success(`«${p.name}» отправлен на модерацию`); }} className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-md" title="Отправить на модерацию"><Send className="w-3.5 h-3.5" /></button>
                        )}
                        {p.status === 'blocked' || p.status === 'moderation' ? (
                          <button onClick={() => { setStatus(p.id, 'active'); toast.success(`«${p.name}» активирован`); }} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md" title="Активировать"><CheckCircle2 className="w-3.5 h-3.5" /></button>
                        ) : (
                          <button onClick={() => { setStatus(p.id, 'blocked'); toast.warning(`«${p.name}» заблокирован`); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md" title="Заблокировать"><Ban className="w-3.5 h-3.5" /></button>
                        )}
                        {p.status !== 'archived' && (
                          <button onClick={() => { setStatus(p.id, 'archived'); toast.info(`«${p.name}» в архиве`); }} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md" title="Архивировать"><Archive className="w-3.5 h-3.5" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Package className="w-12 h-12 mb-3" />
            <p className="text-sm">Товары не найдены</p>
            <button onClick={openAddModal} className="text-blue-500 underline text-xs mt-2">Создать новый товар</button>
          </div>
        )}
      </div>

      {/* Add / Edit modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <p className="font-bold text-gray-900">{editingId ? 'Редактировать товар' : 'Новый товар'}</p>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Название *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="iPhone 15 Pro 256 GB" autoFocus
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">SKU *</label>
                <input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
                  placeholder="SKU-001"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Категория</label>
                <select value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {CATEGORIES.filter(c => c.parentId).map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Цена ₽</label>
                <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                  placeholder="9990" min="0"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Остаток</label>
                <input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
                  placeholder="100" min="0"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Продавец</label>
                <input value={form.merchant} onChange={e => setForm(f => ({ ...f, merchant: e.target.value }))}
                  placeholder="ЭлектроМир"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="px-6 py-4 border-t flex gap-3">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Отмена</button>
              <button onClick={handleSave} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold">{editingId ? 'Сохранить' : 'Создать'}</button>
            </div>
          </div>
        </div>
      )}

      {/* View detail modal */}
      {viewing && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm" onClick={() => setViewingId(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <p className="font-bold text-gray-900">{viewing.name}</p>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{viewing.sku}</p>
              </div>
              <button onClick={() => setViewingId(null)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-2 text-sm">
              <div className="flex justify-between border-b border-gray-50 pb-2"><span className="text-gray-500">Категория</span><span className="font-semibold text-gray-900">{getCategoryName(viewing.categoryId)}</span></div>
              <div className="flex justify-between border-b border-gray-50 pb-2"><span className="text-gray-500">Продавец</span><span className="font-semibold text-gray-900">{viewing.merchant}</span></div>
              <div className="flex justify-between border-b border-gray-50 pb-2"><span className="text-gray-500">Цена</span><span className="font-semibold text-gray-900">{fmtPrice(viewing.price)}</span></div>
              <div className="flex justify-between border-b border-gray-50 pb-2"><span className="text-gray-500">Остаток</span><span className="font-semibold text-gray-900">{viewing.stock} шт.</span></div>
              <div className="flex justify-between border-b border-gray-50 pb-2"><span className="text-gray-500">Статус</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${PRODUCT_STATUS_CFG[viewing.status].cls}`}>{PRODUCT_STATUS_CFG[viewing.status].label}</span>
              </div>
              <div className="flex justify-between border-b border-gray-50 pb-2"><span className="text-gray-500">Фото</span><span className="font-semibold text-gray-900">{viewing.photoCount}</span></div>
              <div className="flex justify-between border-b border-gray-50 pb-2"><span className="text-gray-500">Рейтинг</span><span className="font-semibold text-yellow-600 flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-current" />{viewing.rating || '—'}</span></div>
              <div className="flex justify-between border-b border-gray-50 pb-2"><span className="text-gray-500">Продаж</span><span className="font-semibold text-gray-900">{viewing.sales}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Обновлён</span><span className="text-gray-700">{viewing.updatedAt}</span></div>
            </div>
            <div className="px-6 py-4 border-t flex gap-2">
              <button onClick={() => { setViewingId(null); openEditModal(viewing); }} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50 flex items-center justify-center gap-1.5"><Edit2 className="w-3.5 h-3.5" />Редактировать</button>
              <button onClick={() => { setViewingId(null); navigate('/products/media'); }} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5"><ImageIcon className="w-3.5 h-3.5" />Фото</button>
            </div>
          </div>
        </div>
      )}

      {/* Photos modal */}
      {photosForId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm" onClick={() => setPhotosForId(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <p className="font-bold text-gray-900">Фото товара</p>
              <button onClick={() => setPhotosForId(null)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="p-6">
              {(() => {
                const p = products.find(x => x.id === photosForId);
                if (!p) return null;
                return (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-700">{p.name}</p>
                    <div className="p-4 bg-gray-50 rounded-xl text-center">
                      <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">{p.photoCount} фото у товара</p>
                    </div>
                    <Link
                      to={`/products/media`}
                      onClick={() => setPhotosForId(null)}
                      className="block w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold text-center">
                      Открыть медиа-библиотеку
                    </Link>
                    <button
                      onClick={() => {
                        setProducts(prev => prev.map(x => x.id === p.id ? { ...x, photoCount: x.photoCount + 1, updatedAt: new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) } : x));
                        toast.success(`Счётчик фото увеличен (+1) для «${p.name}»`);
                      }}
                      className="w-full py-2 border border-blue-200 text-blue-700 rounded-xl text-sm hover:bg-blue-50 flex items-center justify-center gap-1.5">
                      <Plus className="w-3.5 h-3.5" />Прибавить фото (mock)
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
