import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Search, Plus, Download, Filter, Eye, Pencil as Edit2, Image as ImageIcon,
  CheckCircle2, AlertCircle, Ban, Archive, Send, X, Package,
  Tag, Store, Star, Video as VideoIcon, Trash2, XCircle, Upload,
  Pin, Crown, Sparkles, Megaphone,
} from 'lucide-react';
import {
  PRODUCTS, CATEGORIES, PRODUCT_STATUS_CFG,
  MEDIA, photosForProduct, videosForProduct, MEDIA_STATUS_CFG,
  getCategoryName, fmtPrice,
  type Product, type ProductStatus, type ProductMediaItem, type MediaStatus,
} from '../../data/products-mock';
import { exportToCsv } from '../../utils/downloads';
import { MediaLightbox } from '../../components/ui/MediaLightbox';

type StatusFilter = ProductStatus | 'all' | 'no_photo';

export function ProductsList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [products, setProducts]       = useState<Product[]>(PRODUCTS);
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>(searchParams.get('category') ?? 'all');
  const [merchantFilter, setMerchantFilter] = useState<string>(searchParams.get('merchant') ?? 'all');

  // Sync ?category=… / ?merchant=… from URL (Categories page, MerchantDetail, PopularProducts → Открыть).
  useEffect(() => {
    const c = searchParams.get('category');
    const m = searchParams.get('merchant');
    if (c) setCategoryFilter(c);
    if (m) setMerchantFilter(m);
  }, [searchParams]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewingId, setViewingId]     = useState<string | null>(null);
  const [editingId, setEditingId]     = useState<string | null>(null);
  // Media state shared by all detail modals + lightbox
  const [mediaState, setMediaState] = useState<ProductMediaItem[]>(MEDIA);
  // Lightbox / video player state
  const [lightbox, setLightbox] = useState<{ items: ProductMediaItem[]; index: number } | null>(null);

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
      const matchMerchant = merchantFilter === 'all' || p.merchantId === merchantFilter;
      let matchStatus = true;
      if (statusFilter === 'no_photo') matchStatus = p.photoCount === 0;
      else if (statusFilter !== 'all') matchStatus = p.status === statusFilter;
      return matchSearch && matchCategory && matchMerchant && matchStatus;
    });
  }, [products, search, statusFilter, categoryFilter, merchantFilter]);

  function setStatus(id: string, status: ProductStatus) {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, status, updatedAt: new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) } : p));
  }

  // ─── Media helpers (photos + videos for the detail modal) ──────────────────

  function bumpProductCount(productId: string, delta: number) {
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, photoCount: Math.max(0, p.photoCount + delta) } : p));
  }

  async function uploadMedia(productId: string, productName: string, file: File, asType: 'image' | 'video') {
    if (asType === 'image' && file.size > 10 * 1024 * 1024) { toast.error('Фото больше 10 MB'); return; }
    if (asType === 'video' && file.size > 50 * 1024 * 1024) { toast.error('Видео больше 50 MB'); return; }
    const dataUrl: string = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result || ''));
      r.onerror = () => rej(r.error);
      r.readAsDataURL(file);
    });
    const sizeKb = Math.max(1, Math.round(file.size / 1024));
    const sizeLabel = sizeKb >= 1024 ? `${(sizeKb / 1024).toFixed(1)} МБ` : `${sizeKb} КБ`;
    const now = new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const newItem: ProductMediaItem = {
      id: `${asType === 'video' ? 'vid' : 'med'}-${Date.now()}`,
      productId, productName, url: dataUrl,
      bg: 'bg-gray-100', emoji: asType === 'video' ? '🎬' : '🖼',
      filename: file.name, sizeLabel, status: 'pending',
      uploadedAt: now, uploader: 'Текущий пользователь',
      mediaType: asType, ...(asType === 'video' ? { videoMimeType: file.type || 'video/mp4' } : {}),
    };
    setMediaState(prev => [newItem, ...prev]);
    if (asType === 'image') bumpProductCount(productId, +1);
    toast.success(`${asType === 'video' ? 'Видео' : 'Фото'} добавлено: ${file.name}`, { description: 'Статус: На проверке' });
  }

  function setMediaStatus(id: string, status: MediaStatus) {
    setMediaState(prev => prev.map(m => m.id === id ? { ...m, status } : m));
    const m = mediaState.find(x => x.id === id);
    if (m) toast.success(`«${m.filename}» → ${MEDIA_STATUS_CFG[status].label}`);
  }

  function deleteMedia(id: string) {
    const m = mediaState.find(x => x.id === id);
    if (!m) return;
    if (!window.confirm(`Удалить «${m.filename}»?`)) return;
    setMediaState(prev => prev.filter(x => x.id !== id));
    if ((m.mediaType ?? 'image') === 'image') bumpProductCount(m.productId, -1);
    toast.success(`Удалено: ${m.filename}`);
  }

  function downloadMedia(m: ProductMediaItem) {
    if (m.url) {
      const a = document.createElement('a');
      a.href = m.url; a.download = m.filename;
      document.body.appendChild(a); a.click(); a.remove();
      toast.success(`Скачан: ${m.filename}`);
      return;
    }
    const text = `Файл: ${m.filename}\nТовар: ${m.productName} (${m.productId})\nТип: ${(m.mediaType ?? 'image') === 'video' ? 'видео' : 'фото'}\nЗагружено: ${m.uploadedAt}\nКем: ${m.uploader}\nРазмер: ${m.sizeLabel}\nСтатус: ${MEDIA_STATUS_CFG[m.status].label}`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${m.filename}.txt`.replace(/[\\/:*?"<>|]/g, '_');
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast.success(`Скачаны метаданные: ${m.filename}.txt`);
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
        ownerType: 'merchant', revenue: 0,
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
        {(search || categoryFilter !== 'all' || statusFilter !== 'all' || merchantFilter !== 'all') && (
          <button onClick={() => { setSearch(''); setCategoryFilter('all'); setStatusFilter('all'); setMerchantFilter('all'); }}
            className="px-3 py-2 border border-orange-200 bg-orange-50 text-orange-700 rounded-lg text-sm hover:bg-orange-100 flex items-center gap-1.5">
            <X className="w-3.5 h-3.5" />Сбросить
          </button>
        )}
      </div>

      {merchantFilter !== 'all' && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl text-sm">
          <span className="text-blue-700">Фильтр по продавцу: <span className="font-mono font-semibold">{merchantFilter}</span></span>
          <button onClick={() => setMerchantFilter('all')} className="ml-auto p-0.5 hover:bg-blue-200 rounded text-blue-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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
                const photos = photosForProduct(p.id, mediaState);
                const firstPhoto = photos[0];
                return (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            if (photos.length > 0) setLightbox({ items: photos, index: 0 });
                            else setViewingId(p.id);
                          }}
                          title={photos.length > 0 ? `Открыть ${photos.length} фото` : 'Нет фото — открыть карточку'}
                          className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-gray-200 hover:ring-2 hover:ring-blue-300 transition-all relative">
                          {firstPhoto ? (
                            firstPhoto.url ? (
                              <img src={firstPhoto.url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className={`w-full h-full ${firstPhoto.bg} flex items-center justify-center text-xl`}>{firstPhoto.emoji}</div>
                            )
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs">
                              {p.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          {photos.length > 1 && (
                            <span className="absolute bottom-0 right-0 bg-black/60 text-white text-[8px] px-1 rounded-tl">
                              +{photos.length - 1}
                            </span>
                          )}
                        </button>
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
                        <button onClick={() => setViewingId(p.id)} className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-md" title="Галерея фото и видео"><ImageIcon className="w-3.5 h-3.5" /></button>
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

      {/* View detail modal — with photo gallery + video block */}
      {viewing && (() => {
        const photos = photosForProduct(viewing.id, mediaState);
        const videos = videosForProduct(viewing.id, mediaState);
        return (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm" onClick={() => setViewingId(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="px-6 py-4 border-b flex items-center justify-between shrink-0">
                <div>
                  <p className="font-bold text-gray-900">{viewing.name}</p>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">{viewing.sku} · {viewing.merchant}</p>
                </div>
                <button onClick={() => setViewingId(null)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* Photo gallery */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4" />Фотографии
                      <span className="text-xs text-gray-400 font-normal">· {photos.length} шт.</span>
                    </p>
                    <label className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer">
                      <Upload className="w-3 h-3" />Добавить фото
                      <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) uploadMedia(viewing.id, viewing.name, f, 'image');
                          e.target.value = '';
                        }} />
                    </label>
                  </div>
                  {photos.length === 0 ? (
                    <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl py-10 text-center">
                      <ImageIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Нет фото</p>
                      <p className="text-xs text-gray-400 mt-1">Загрузите первое фото — оно появится здесь</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {photos.map((m, i) => (
                        <div key={m.id} className="relative group">
                          <button onClick={() => setLightbox({ items: photos, index: i })}
                            className="block w-full aspect-square rounded-xl overflow-hidden border-2 border-gray-200 hover:border-blue-400 transition-all">
                            {m.url ? <img src={m.url} alt={m.filename} className="w-full h-full object-cover" />
                                  : <div className={`w-full h-full ${m.bg} flex items-center justify-center text-3xl`}>{m.emoji}</div>}
                          </button>
                          <span className={`absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${MEDIA_STATUS_CFG[m.status].cls}`}>{MEDIA_STATUS_CFG[m.status].label}</span>
                          {/* Action overlay */}
                          <div className="absolute bottom-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => downloadMedia(m)} className="p-1 bg-white/90 hover:bg-white rounded text-gray-600" title="Скачать"><Download className="w-3 h-3" /></button>
                            {m.status !== 'approved' && (
                              <button onClick={() => setMediaStatus(m.id, 'approved')} className="p-1 bg-green-500 hover:bg-green-600 text-white rounded" title="Одобрить"><CheckCircle2 className="w-3 h-3" /></button>
                            )}
                            {m.status !== 'rejected' && (
                              <button onClick={() => setMediaStatus(m.id, 'rejected')} className="p-1 bg-red-500 hover:bg-red-600 text-white rounded" title="Отклонить"><XCircle className="w-3 h-3" /></button>
                            )}
                            <button onClick={() => deleteMedia(m.id)} className="p-1 bg-gray-500 hover:bg-red-600 text-white rounded" title="Удалить"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Videos */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                      <VideoIcon className="w-4 h-4" />Видео
                      <span className="text-xs text-gray-400 font-normal">· {videos.length} шт.</span>
                    </p>
                    <label className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold cursor-pointer">
                      <Upload className="w-3 h-3" />Загрузить видео
                      <input type="file" accept="video/mp4,video/webm" className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) uploadMedia(viewing.id, viewing.name, f, 'video');
                          e.target.value = '';
                        }} />
                    </label>
                  </div>
                  {videos.length === 0 ? (
                    <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl py-10 text-center">
                      <VideoIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Нет видео</p>
                      <p className="text-xs text-gray-400 mt-1">MP4 или WebM, до 50 MB</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {videos.map((v, i) => (
                        <div key={v.id} className="relative group rounded-xl overflow-hidden border-2 border-gray-200 hover:border-purple-400 transition-all bg-black">
                          <button onClick={() => setLightbox({ items: videos, index: i })}
                            className="block w-full aspect-video relative">
                            {v.url ? (
                              <video src={v.url} className="w-full h-full object-cover" muted preload="metadata" />
                            ) : (
                              <div className={`w-full h-full ${v.bg} flex items-center justify-center text-5xl`}>{v.emoji}</div>
                            )}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                              <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                                <span className="text-purple-600 ml-1">▶</span>
                              </div>
                            </div>
                            <span className={`absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${MEDIA_STATUS_CFG[v.status].cls}`}>{MEDIA_STATUS_CFG[v.status].label}</span>
                          </button>
                          <div className="px-2 py-1.5 bg-white border-t border-gray-200 flex items-center gap-1">
                            <p className="flex-1 text-[10px] text-gray-700 font-mono truncate">{v.filename}</p>
                            <button onClick={() => downloadMedia(v)} className="p-1 hover:bg-gray-100 rounded text-gray-500" title="Скачать"><Download className="w-3 h-3" /></button>
                            {v.status !== 'approved' && (
                              <button onClick={() => setMediaStatus(v.id, 'approved')} className="p-1 hover:bg-green-50 rounded text-green-600" title="Одобрить"><CheckCircle2 className="w-3 h-3" /></button>
                            )}
                            {v.status !== 'rejected' && (
                              <button onClick={() => setMediaStatus(v.id, 'rejected')} className="p-1 hover:bg-red-50 rounded text-red-600" title="Отклонить"><XCircle className="w-3 h-3" /></button>
                            )}
                            <button onClick={() => deleteMedia(v.id)} className="p-1 hover:bg-gray-100 rounded text-gray-500" title="Удалить"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Product info grid */}
                <section className="grid grid-cols-2 gap-2 text-sm">
                  {[
                    ['Категория',     getCategoryName(viewing.categoryId)],
                    ['Продавец',      viewing.merchant],
                    ['Цена',          fmtPrice(viewing.price)],
                    ['Остаток',       `${viewing.stock} шт.`],
                    ['Рейтинг',       viewing.rating ? `★ ${viewing.rating}` : '—'],
                    ['Продаж',        String(viewing.sales)],
                    ['Создан',        viewing.createdAt],
                    ['Обновлён',      viewing.updatedAt],
                  ].map(([k, v]) => (
                    <div key={k as string} className="flex justify-between border-b border-gray-50 pb-2 px-1">
                      <span className="text-gray-500">{k}</span>
                      <span className="font-semibold text-gray-900 text-right text-xs">{v}</span>
                    </div>
                  ))}
                  <div className="col-span-2 flex justify-between border-b border-gray-50 pb-2 px-1">
                    <span className="text-gray-500">Статус</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${PRODUCT_STATUS_CFG[viewing.status].cls}`}>{PRODUCT_STATUS_CFG[viewing.status].label}</span>
                  </div>
                </section>
              </div>

              <div className="px-6 py-3 border-t bg-gray-50 shrink-0 space-y-2">
                {/* Showcase / boost actions (RBAC hook — visible only to roles with the corresponding perms) */}
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => { toast.success(`«${viewing.name}» закреплён в популярных`); navigate('/products/popular'); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-lg text-xs font-semibold">
                    <Pin className="w-3.5 h-3.5" />В популярные
                  </button>
                  <button onClick={() => { toast.success(`«${viewing.name}» добавлен в первые ряды`); navigate('/products/showcase'); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 hover:bg-orange-200 text-orange-800 rounded-lg text-xs font-semibold">
                    <Crown className="w-3.5 h-3.5" />В первые ряды
                  </button>
                  <button onClick={() => { toast.success(`«${viewing.name}» в рекомендациях`); navigate('/products/recommended'); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-lg text-xs font-semibold">
                    <Sparkles className="w-3.5 h-3.5" />Рекомендовать
                  </button>
                  <button onClick={() => { toast.success(`«${viewing.name}» в акции`); navigate('/products/promotions'); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-100 hover:bg-pink-200 text-pink-800 rounded-lg text-xs font-semibold">
                    <Megaphone className="w-3.5 h-3.5" />В акцию
                  </button>
                  <button onClick={() => { toast.success(`«${viewing.name}» в скидку`); navigate('/products/discounts'); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg text-xs font-semibold">
                    <Tag className="w-3.5 h-3.5" />В скидку
                  </button>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => { setViewingId(null); openEditModal(viewing); }} className="flex-1 py-2 border border-gray-200 bg-white rounded-xl text-sm hover:bg-gray-50 flex items-center justify-center gap-1.5"><Edit2 className="w-3.5 h-3.5" />Редактировать</button>
                  <Link to={`/products/media?product=${viewing.id}`} onClick={() => setViewingId(null)}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" />Открыть в медиа-библиотеке
                  </Link>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Lightbox / video player */}
      {lightbox && (
        <MediaLightbox
          items={lightbox.items}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
          onDownload={downloadMedia}
        />
      )}
    </div>
  );
}
