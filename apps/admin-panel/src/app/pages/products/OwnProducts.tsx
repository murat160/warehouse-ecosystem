import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Search, Plus, Download, Eye, Pencil as Edit2, Image as ImageIcon,
  CheckCircle2, Ban, Archive, Send, ShieldCheck, Building2,
} from 'lucide-react';
import {
  PRODUCTS, CATEGORIES, PRODUCT_STATUS_CFG, MEDIA,
  RECOMMENDATIONS_INITIAL, SHOWCASE_INITIAL,
  getCategoryName, fmtPrice, photosForProduct,
  type Product, type ProductStatus,
} from '../../data/products-mock';
import { exportToCsv } from '../../utils/downloads';
import { ProductPreviewModal } from '../../components/products/ProductPreviewModal';
import { ProductFormDrawer, type ProductFormPayload, type SubmitAction } from '../../components/products/ProductFormDrawer';

type StatusFilter = ProductStatus | 'all' | 'low_stock' | 'no_photo';

export function OwnProducts() {
  const navigate = useNavigate();
  // Only platform-owned products (ownerType === 'company')
  const [products, setProducts] = useState<Product[]>(() => PRODUCTS.filter(p => p.ownerType === 'company'));
  const [search, setSearch]     = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);

  const stats = useMemo(() => ({
    total:      products.length,
    active:     products.filter(p => p.status === 'active').length,
    moderation: products.filter(p => p.status === 'moderation').length,
    draft:      products.filter(p => p.status === 'draft').length,
    noPhoto:    products.filter(p => p.photoCount === 0).length,
    lowStock:   products.filter(p => p.stock > 0 && p.stock < (p.minStock ?? 100)).length,
  }), [products]);

  const filtered = useMemo(() => products.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    const matchCategory = categoryFilter === 'all' || p.categoryId === categoryFilter;
    let matchStatus = true;
    if (statusFilter === 'no_photo')  matchStatus = p.photoCount === 0;
    else if (statusFilter === 'low_stock') matchStatus = p.stock > 0 && p.stock < (p.minStock ?? 100);
    else if (statusFilter !== 'all')  matchStatus = p.status === statusFilter;
    return matchSearch && matchCategory && matchStatus;
  }), [products, search, statusFilter, categoryFilter]);

  function setStatus(id: string, status: ProductStatus) {
    const now = new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    setProducts(prev => prev.map(p => p.id === id ? { ...p, status, updatedAt: now } : p));
    // Mutate global PRODUCTS so cross-page state stays consistent.
    const idx = PRODUCTS.findIndex(p => p.id === id);
    if (idx >= 0) PRODUCTS[idx] = { ...PRODUCTS[idx], status, updatedAt: now };
  }

  function openAdd() {
    setEditingProduct(null);
    setDrawerOpen(true);
  }

  function openEdit(p: Product) {
    setEditingProduct(p);
    setDrawerOpen(true);
  }

  /**
   * Persist a newly-built product across the whole catalogue:
   *  - update local list (instant in /products/own),
   *  - mutate exported PRODUCTS so it appears on next mount in
   *    /products, /products/popular, /products/recommended, /products/showcase,
   *  - mutate MEDIA with new photos/videos so /products/media sees them too,
   *  - if promotion options chosen, push slots into RECOMMENDATIONS_INITIAL /
   *    SHOWCASE_INITIAL.
   */
  function handleSubmit(payload: ProductFormPayload, action: SubmitAction) {
    const { product, newMedia, promotion } = payload;
    const now = new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    // Re-compute revenue (in case sales > 0 in edit mode)
    const finalProduct: Product = { ...product, revenue: product.price * product.sales };

    if (editingProduct) {
      // Edit: replace
      setProducts(prev => prev.map(p => p.id === editingProduct.id ? finalProduct : p));
      const idx = PRODUCTS.findIndex(p => p.id === editingProduct.id);
      if (idx >= 0) PRODUCTS[idx] = finalProduct;
    } else {
      // Create: add to local + global
      setProducts(prev => [finalProduct, ...prev]);
      PRODUCTS.unshift(finalProduct);
    }

    // Add new media
    if (newMedia.length > 0) {
      MEDIA.unshift(...newMedia);
    }

    // Recommendation slot
    if (promotion.addToRecommended) {
      RECOMMENDATIONS_INITIAL.unshift({
        id: `rec-${Date.now()}`,
        productId: finalProduct.id,
        productName: finalProduct.name,
        position: promotion.position,
        priority: promotion.priority,
        startDate: promotion.startDate,
        endDate: promotion.endDate,
        active: true,
        addedBy: 'Супер Админ', addedByRole: 'SuperAdmin',
        addedAt: now,
        mode: 'manual', audience: 'all', audienceValue: '',
      });
    }

    // Showcase slot
    if (promotion.addToShowcase) {
      const homeSlots = SHOWCASE_INITIAL.filter(s => s.location === 'home');
      const nextSlot = (homeSlots.reduce((max, s) => Math.max(max, s.slotNumber), 0)) + 1;
      SHOWCASE_INITIAL.unshift({
        id: `show-${Date.now()}`,
        slotNumber: nextSlot,
        productId: finalProduct.id,
        productName: finalProduct.name,
        location: 'home',
        active: true,
        addedBy: 'Супер Админ', addedByRole: 'SuperAdmin',
        addedAt: now,
      });
    }

    setDrawerOpen(false);
    setEditingProduct(null);

    const desc =
      action === 'draft'             ? 'Статус: Черновик' :
      action === 'moderation'        ? 'Статус: На модерации' :
      action === 'active+showcase'   ? 'Статус: Активен · Добавлен в первые ряды' :
      'Статус: Активен';
    const promos: string[] = [];
    if (promotion.addToPopular)     promos.push('закреплён в популярных');
    if (promotion.addToRecommended) promos.push('добавлен в рекомендации');
    if (promotion.addToShowcase)    promos.push('добавлен в первые ряды');
    const promoLine = promos.length ? ` · ${promos.join(', ')}` : '';

    toast.success(
      editingProduct ? `Товар обновлён: ${finalProduct.name}` : `Товар создан: ${finalProduct.name}`,
      { description: desc + promoLine },
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-amber-500" />
            <h1 className="text-2xl font-bold text-gray-900">Товары нашей фирмы</h1>
            <span className="px-2 py-0.5 bg-gradient-to-r from-amber-100 to-orange-100 border border-amber-300 text-amber-800 rounded-full text-[10px] font-bold uppercase tracking-wider">PVZ Platform</span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">Каталог товаров, произведённых платформой · {products.length} позиций</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (filtered.length === 0) { toast.info('Нет товаров для экспорта'); return; }
              exportToCsv(filtered as any[], [
                { key: 'sku', label: 'SKU' }, { key: 'name', label: 'Название' },
                { key: 'categoryId', label: 'Категория' }, { key: 'status', label: 'Статус' },
                { key: 'price', label: 'Цена' }, { key: 'stock', label: 'Остаток' },
                { key: 'photoCount', label: 'Фото' }, { key: 'rating', label: 'Рейтинг' },
                { key: 'sales', label: 'Продажи' }, { key: 'revenue', label: 'Выручка' },
                { key: 'updatedAt', label: 'Обновлён' },
              ], 'own-products');
              toast.success(`Скачан CSV: ${filtered.length} товаров`);
            }}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm">
            <Download className="w-4 h-4" />Экспорт
          </button>
          <button onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 text-sm font-semibold shadow-sm">
            <Plus className="w-4 h-4" />Добавить товар фирмы
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: 'Всего наших',     value: stats.total,      bg: 'bg-amber-50 border-amber-200',  color: 'text-amber-700', filter: 'all'        as StatusFilter },
          { label: 'Активные',        value: stats.active,     bg: 'bg-green-50 border-green-200',  color: 'text-green-700', filter: 'active'     as StatusFilter },
          { label: 'На модерации',    value: stats.moderation, bg: 'bg-yellow-50 border-yellow-200',color: 'text-yellow-700',filter: 'moderation' as StatusFilter },
          { label: 'Черновики',       value: stats.draft,      bg: 'bg-slate-50 border-slate-200',  color: 'text-slate-700', filter: 'draft'      as StatusFilter },
          { label: 'Без фото',        value: stats.noPhoto,    bg: 'bg-orange-50 border-orange-200',color: 'text-orange-700',filter: 'no_photo'   as StatusFilter },
          { label: 'Низкий остаток',  value: stats.lowStock,   bg: 'bg-red-50 border-red-200',      color: 'text-red-700',   filter: 'low_stock'  as StatusFilter },
        ].map(stat => {
          const isActive = statusFilter === stat.filter;
          return (
            <button key={stat.label}
              onClick={() => setStatusFilter(isActive ? 'all' : stat.filter)}
              className={`${stat.bg} p-3 rounded-xl border transition-all text-left hover:shadow-md cursor-pointer active:scale-[0.97] ${isActive ? 'ring-2 ring-current ring-offset-1' : ''}`}>
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
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по названию, SKU..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
        </div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="all">Все категории</option>
          {CATEGORIES.filter(c => c.parentId).map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
      </div>

      <p className="text-sm text-gray-500">Найдено: <span className="font-semibold text-gray-800">{filtered.length}</span> из {products.length}</p>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Building2 className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Товары не найдены</p>
            <button onClick={openAdd} className="text-blue-600 underline text-xs mt-2">Создать первый</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Товар</th>
                  <th className="text-left px-3 py-3 font-medium text-gray-500 hidden lg:table-cell">Категория</th>
                  <th className="text-right px-3 py-3 font-medium text-gray-500">Цена</th>
                  <th className="text-right px-3 py-3 font-medium text-gray-500 hidden lg:table-cell">Остаток</th>
                  <th className="text-right px-3 py-3 font-medium text-gray-500 hidden xl:table-cell">Продано</th>
                  <th className="text-left px-3 py-3 font-medium text-gray-500">Статус</th>
                  <th className="text-center px-3 py-3 font-medium text-gray-500">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(p => {
                  const sc = PRODUCT_STATUS_CFG[p.status];
                  const photo = photosForProduct(p.id, MEDIA)[0];
                  const lowStock = p.stock > 0 && p.stock < (p.minStock ?? 100);
                  return (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <button onClick={() => setPreviewProduct(p)} className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 shrink-0 bg-gradient-to-br from-amber-400 to-orange-500 hover:ring-2 hover:ring-amber-300 transition-all">
                            {photo ? (
                              photo.url
                                ? <img src={photo.url} alt={p.name} className="w-full h-full object-cover" />
                                : <div className={`w-full h-full ${photo.bg} flex items-center justify-center text-base`}>{photo.emoji}</div>
                            ) : (
                              <span className="text-white text-xs flex w-full h-full items-center justify-center font-bold">{p.name.slice(0, 2).toUpperCase()}</span>
                            )}
                          </button>
                          <div className="min-w-0">
                            <button onClick={() => setPreviewProduct(p)} className="font-medium text-gray-900 hover:text-amber-700 text-left truncate block max-w-[260px]">{p.name}</button>
                            <p className="text-xs text-gray-500 mt-0.5 font-mono">{p.sku}</p>
                            {p.brand && <p className="text-[10px] text-amber-700">{p.brand}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-gray-600 hidden lg:table-cell text-xs">{getCategoryName(p.categoryId)}</td>
                      <td className="px-3 py-3 text-right">
                        <span className="font-medium">{fmtPrice(p.price)}</span>
                        {p.oldPrice && p.oldPrice > p.price && (
                          <p className="text-[10px] text-gray-400 line-through">{fmtPrice(p.oldPrice)}</p>
                        )}
                        {p.discount?.percent ? (
                          <p className="text-[10px] text-rose-600 font-bold">-{p.discount.percent}%</p>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 text-right hidden lg:table-cell">
                        <span className={`font-medium ${p.stock === 0 ? 'text-red-600' : lowStock ? 'text-orange-600' : 'text-gray-700'}`}>{p.stock}</span>
                        {lowStock && <p className="text-[9px] text-orange-600">низкий</p>}
                      </td>
                      <td className="px-3 py-3 text-right hidden xl:table-cell text-gray-600">{p.sales}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${sc.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />{sc.label}
                        </span>
                        {p.visibleToCustomers === false && (
                          <p className="text-[9px] text-gray-500 mt-0.5">скрыт</p>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => setPreviewProduct(p)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md" title="Открыть"><Eye className="w-3.5 h-3.5" /></button>
                          <button onClick={() => openEdit(p)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md" title="Редактировать"><Edit2 className="w-3.5 h-3.5" /></button>
                          <Link to={`/products/media?product=${p.id}`} className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-md" title="Фото товара"><ImageIcon className="w-3.5 h-3.5" /></Link>
                          {p.status !== 'moderation' && p.status !== 'archived' && (
                            <button onClick={() => { setStatus(p.id, 'moderation'); toast.success(`«${p.name}» на модерации`); }} className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-md" title="На модерацию"><Send className="w-3.5 h-3.5" /></button>
                          )}
                          {p.status === 'blocked' || p.status === 'moderation' || p.status === 'draft' ? (
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
        )}
      </div>

      {/* Add/edit drawer */}
      <ProductFormDrawer
        open={drawerOpen}
        initialProduct={editingProduct ?? undefined}
        onClose={() => { setDrawerOpen(false); setEditingProduct(null); }}
        onSubmit={handleSubmit}
      />

      {/* Product preview */}
      {previewProduct && (
        <ProductPreviewModal
          product={previewProduct}
          onClose={() => setPreviewProduct(null)}
          onEdit={p => { setPreviewProduct(null); openEdit(p); }}
          onActivate={p => { setStatus(p.id, 'active'); toast.success(`«${p.name}» активирован`); setPreviewProduct({ ...p, status: 'active' }); }}
          onBlock={p => { setStatus(p.id, 'blocked'); toast.warning(`«${p.name}» заблокирован`); setPreviewProduct({ ...p, status: 'blocked' }); }}
          onArchive={p => { setStatus(p.id, 'archived'); toast.info(`«${p.name}» в архиве`); setPreviewProduct(null); }}
          onAddToShowcase={p => { toast.success(`«${p.name}» добавлен в первые ряды`); navigate('/products/showcase'); }}
          onRecommend={p => { toast.success(`«${p.name}» в рекомендациях`); navigate('/products/recommended'); }}
          onAddPromotion={p => { toast.success(`«${p.name}» в акции`); navigate('/products/promotions'); }}
          onAddDiscount={p => { toast.success(`«${p.name}» в скидке`); navigate('/products/discounts'); }}
          onPinPopular={p => { toast.success(`«${p.name}» закреплён в популярных`); navigate('/products/popular'); }}
        />
      )}
    </div>
  );
}
