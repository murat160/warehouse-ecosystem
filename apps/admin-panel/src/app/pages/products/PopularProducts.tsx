import { useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Search, Download, Eye, Image as ImageIcon, TrendingUp, DollarSign,
  Star, AlertTriangle, ArrowDown, ArrowUp, ExternalLink, Crown, Plus,
  Pin, EyeOff, Sparkles,
} from 'lucide-react';
import {
  PRODUCTS, getCategoryName, fmtPrice, PRODUCT_STATUS_CFG, photosForProduct, MEDIA,
  type Product, type PopularityMode,
} from '../../data/products-mock';
import { exportToCsv } from '../../utils/downloads';
import { ProductPreviewModal } from '../../components/products/ProductPreviewModal';

type SortField = 'sales' | 'revenue' | 'rating' | 'stock';
type ListMode  = 'auto' | 'manual';

export function PopularProducts() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const merchantFilter = searchParams.get('merchant');
  const [products, setProducts]   = useState<Product[]>(PRODUCTS);
  const [listMode, setListMode]   = useState<ListMode>('auto');
  const [sortField, setSortField] = useState<SortField>('sales');
  const [sortDir, setSortDir]     = useState<'desc' | 'asc'>('desc');
  const [search, setSearch]       = useState('');
  const [kpiFilter, setKpiFilter] = useState<'all' | 'low_stock' | 'no_photo'>('all');
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);

  function patchProduct(id: string, patch: Partial<Product>) {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
  }

  function pinProduct(p: Product) {
    const isPinned = p.popularityMode === 'pinned';
    const now = new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    patchProduct(p.id, isPinned
      ? { popularityMode: 'auto', boostedBy: undefined, boostedByRole: undefined, boostedAt: undefined, boostReason: undefined }
      : { popularityMode: 'pinned', boostedBy: 'Супер Админ', boostedByRole: 'SuperAdmin', boostedAt: now, boostReason: 'Закреплён вручную' });
    toast.success(isPinned ? `«${p.name}» откреплён` : `«${p.name}» закреплён в популярных`);
  }

  function hideProduct(p: Product) {
    const isHidden = p.popularityMode === 'hidden';
    const now = new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    patchProduct(p.id, isHidden
      ? { popularityMode: 'auto', boostedBy: undefined, boostedAt: undefined }
      : { popularityMode: 'hidden', boostedBy: 'Супер Админ', boostedByRole: 'SuperAdmin', boostedAt: now, boostReason: 'Скрыт из популярных' });
    toast.success(isHidden ? `«${p.name}» снова в популярных` : `«${p.name}» скрыт из популярных`);
  }

  function setRank(p: Product, newRank: number) {
    patchProduct(p.id, { popularityMode: 'manual', showcaseRank: newRank, boostedBy: 'Супер Админ', boostedByRole: 'SuperAdmin', boostedAt: new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) });
  }

  // Sort logic — auto mode uses metric; manual mode shows pinned first, then by showcaseRank/popularityMode.
  const sorted = useMemo(() => {
    const live = products.filter(p => p.status !== 'archived' && p.popularityMode !== 'hidden' && (merchantFilter ? p.merchantId === merchantFilter : true) && p.sales > 0);
    if (listMode === 'manual') {
      return [...live].sort((a, b) => {
        // Pinned first
        if (a.popularityMode === 'pinned' && b.popularityMode !== 'pinned') return -1;
        if (b.popularityMode === 'pinned' && a.popularityMode !== 'pinned') return  1;
        // Then by showcaseRank ascending
        const ra = a.showcaseRank ?? Number.POSITIVE_INFINITY;
        const rb = b.showcaseRank ?? Number.POSITIVE_INFINITY;
        if (ra !== rb) return ra - rb;
        // Fallback by sales
        return b.sales - a.sales;
      });
    }
    return [...live].sort((a, b) => {
      const av = a[sortField], bv = b[sortField];
      return sortDir === 'desc' ? (bv as number) - (av as number) : (av as number) - (bv as number);
    });
  }, [products, listMode, sortField, sortDir, merchantFilter]);

  const popular = sorted;

  const stats = useMemo(() => {
    const top = [...products].sort((a, b) => b.sales - a.sales)[0];
    const topRev = [...products].sort((a, b) => b.revenue - a.revenue)[0];
    const highRated = [...products].filter(p => p.rating > 0).sort((a, b) => b.rating - a.rating)[0];
    return {
      topSeller:   top,
      topRevenue:  topRev,
      highRated:   highRated,
      lowStock:    products.filter(p => p.sales > 0 && p.stock > 0 && p.stock < 20).length,
      noPhoto:     products.filter(p => p.sales > 0 && p.photoCount === 0).length,
      pinned:      products.filter(p => p.popularityMode === 'pinned').length,
      hidden:      products.filter(p => p.popularityMode === 'hidden').length,
    };
  }, [products]);

  const filtered = useMemo(() => {
    return popular.filter(p => {
      const q = search.toLowerCase();
      const matchSearch = !q || p.name.toLowerCase().includes(q) || p.merchant.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
      let matchKpi = true;
      if (kpiFilter === 'low_stock') matchKpi = p.stock > 0 && p.stock < 20;
      else if (kpiFilter === 'no_photo') matchKpi = p.photoCount === 0;
      return matchSearch && matchKpi;
    });
  }, [popular, search, kpiFilter]);

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortField(field); setSortDir('desc'); }
  }

  function recommendProduct(p: Product) {
    toast.success(`«${p.name}» добавлен в рекомендации`, { description: 'Откройте /products/recommended для управления (роль с products.recommended.create)' });
    navigate('/products/recommended');
  }

  function moveRank(p: Product, dir: -1 | 1) {
    // Find neighbour in current sorted list (manual mode) and swap ranks.
    const list = popular;
    const idx = list.findIndex(x => x.id === p.id);
    const swapIdx = idx + dir;
    if (idx < 0 || swapIdx < 0 || swapIdx >= list.length) return;
    const me = list[idx], other = list[swapIdx];
    const myRank    = me.showcaseRank ?? idx + 1;
    const otherRank = other.showcaseRank ?? swapIdx + 1;
    setRank(me,    otherRank);
    setRank(other, myRank);
    toast.success(`«${me.name}» ${dir === -1 ? 'поднят выше' : 'опущен ниже'}`);
  }

  const SortIcon = ({ f }: { f: SortField }) => {
    if (sortField !== f) return <ArrowDown className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100" />;
    return sortDir === 'desc' ? <ArrowDown className="w-3 h-3 text-blue-600" /> : <ArrowUp className="w-3 h-3 text-blue-600" />;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Crown className="w-6 h-6 text-yellow-500" />
            <h1 className="text-2xl font-bold text-gray-900">Популярные товары</h1>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">Лидеры по продажам, выручке и рейтингу · {popular.length} позиций с продажами</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (filtered.length === 0) { toast.info('Нет товаров для экспорта'); return; }
              exportToCsv(filtered as any[], [
                { key: 'sku', label: 'SKU' }, { key: 'name', label: 'Название' },
                { key: 'merchant', label: 'Продавец' }, { key: 'price', label: 'Цена' },
                { key: 'stock', label: 'Остаток' }, { key: 'sales', label: 'Продано' },
                { key: 'revenue', label: 'Выручка' }, { key: 'rating', label: 'Рейтинг' },
              ], 'popular-products');
              toast.success(`Скачан CSV: ${filtered.length} товаров`);
            }}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm">
            <Download className="w-4 h-4" />Экспорт
          </button>
          <Link to="/products"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold">
            <ExternalLink className="w-4 h-4" />Открыть в товарах
          </Link>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <button onClick={() => setKpiFilter('all')}
          className={`p-3 rounded-xl border text-left transition-all hover:shadow-md cursor-pointer active:scale-[0.97] ${kpiFilter === 'all' ? 'bg-yellow-50 border-yellow-300 ring-2 ring-yellow-300/50' : 'bg-white border-gray-200'}`}>
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3 text-yellow-600" />Топ продаж</p>
          <p className="text-sm font-bold text-yellow-700 truncate">{stats.topSeller?.name ?? '—'}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">{stats.topSeller?.sales ?? 0} продаж</p>
        </button>
        <button onClick={() => setKpiFilter('all')}
          className={`p-3 rounded-xl border text-left transition-all hover:shadow-md cursor-pointer active:scale-[0.97] ${kpiFilter === 'all' ? 'bg-green-50 border-green-300' : 'bg-white border-gray-200'}`}>
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><DollarSign className="w-3 h-3 text-green-600" />Самая выручка</p>
          <p className="text-sm font-bold text-green-700 truncate">{stats.topRevenue?.name ?? '—'}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">{stats.topRevenue ? fmtPrice(stats.topRevenue.revenue) : '—'}</p>
        </button>
        <button onClick={() => setKpiFilter('all')}
          className={`p-3 rounded-xl border text-left transition-all hover:shadow-md cursor-pointer active:scale-[0.97] ${kpiFilter === 'all' ? 'bg-purple-50 border-purple-300' : 'bg-white border-gray-200'}`}>
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Star className="w-3 h-3 text-purple-600" />Высокий рейтинг</p>
          <p className="text-sm font-bold text-purple-700 truncate">{stats.highRated?.name ?? '—'}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">★ {stats.highRated?.rating ?? '—'}</p>
        </button>
        <button onClick={() => setKpiFilter(kpiFilter === 'low_stock' ? 'all' : 'low_stock')}
          className={`p-3 rounded-xl border text-left transition-all hover:shadow-md cursor-pointer active:scale-[0.97] ${kpiFilter === 'low_stock' ? 'bg-red-50 border-red-300 ring-2 ring-red-300/50' : 'bg-white border-gray-200'}`}>
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-red-600" />Мало осталось</p>
          <p className="text-2xl font-bold text-red-700">{stats.lowStock}</p>
        </button>
        <button onClick={() => setKpiFilter(kpiFilter === 'no_photo' ? 'all' : 'no_photo')}
          className={`p-3 rounded-xl border text-left transition-all hover:shadow-md cursor-pointer active:scale-[0.97] ${kpiFilter === 'no_photo' ? 'bg-orange-50 border-orange-300 ring-2 ring-orange-300/50' : 'bg-white border-gray-200'}`}>
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><ImageIcon className="w-3 h-3 text-orange-600" />Без фото</p>
          <p className="text-2xl font-bold text-orange-700">{stats.noPhoto}</p>
        </button>
      </div>

      {/* Mode toggle */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {([
            { v: 'auto'   as ListMode, label: 'Авто (по метрикам)' },
            { v: 'manual' as ListMode, label: 'Ручной (SuperAdmin)' },
          ]).map(({ v, label }) => (
            <button key={v} onClick={() => setListMode(v)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${listMode === v ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по товару, продавцу..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        {listMode === 'auto' && (
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {([
              { f: 'sales'   as const, label: 'Продажи'  },
              { f: 'revenue' as const, label: 'Выручка'  },
              { f: 'rating'  as const, label: 'Рейтинг'  },
              { f: 'stock'   as const, label: 'Остаток'  },
            ]).map(({ f, label }) => (
              <button key={f} onClick={() => toggleSort(f)}
                className={`group flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${sortField === f ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}>
                {label}<SortIcon f={f} />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500 px-1">
        <span>Показано: <span className="font-semibold text-gray-800">{filtered.length}</span> · Режим: <span className="font-semibold">{listMode === 'auto' ? 'авто' : 'ручной'}</span></span>
        <span className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1"><Pin className="w-3 h-3 text-yellow-600" />Закреплено: <span className="font-bold">{stats.pinned}</span></span>
          <span className="flex items-center gap-1"><EyeOff className="w-3 h-3 text-gray-400" />Скрыто: <span className="font-bold">{stats.hidden}</span></span>
        </span>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((p, idx) => {
          const sc = PRODUCT_STATUS_CFG[p.status];
          const photo = photosForProduct(p.id, MEDIA)[0];
          const isPinned = p.popularityMode === 'pinned';
          const isHidden = p.popularityMode === 'hidden';
          const rank = p.showcaseRank ?? idx + 1;
          return (
            <div key={p.id} className={`bg-white rounded-xl border ${isPinned ? 'border-yellow-300 ring-2 ring-yellow-200/50' : isHidden ? 'border-gray-300 opacity-60' : 'border-gray-200'} hover:shadow-md transition-all overflow-hidden flex flex-col`}>
              <button onClick={() => setPreviewProduct(p)} className="aspect-[16/9] bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center relative w-full overflow-hidden group">
                {photo ? (
                  photo.url
                    ? <img src={photo.url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    : <div className={`w-full h-full ${photo.bg} flex items-center justify-center text-6xl`}>{photo.emoji}</div>
                ) : (
                  <span className="text-6xl">📦</span>
                )}
                <span className={`absolute top-2 left-2 px-2 py-0.5 ${isPinned ? 'bg-yellow-400 text-yellow-900' : 'bg-white/90 text-gray-800'} rounded-full text-[10px] font-bold flex items-center gap-1 shadow-sm`}>
                  {isPinned ? <Pin className="w-3 h-3" /> : <Crown className="w-3 h-3" />}#{rank}
                </span>
                <span className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-medium ${sc.cls}`}>{sc.label}</span>
                {isHidden && (
                  <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-gray-700 text-white rounded-full text-[10px] font-bold flex items-center gap-1">
                    <EyeOff className="w-3 h-3" />Скрыт
                  </span>
                )}
                {p.boostedBy && (
                  <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-amber-500 text-white rounded-full text-[10px] font-bold flex items-center gap-1 shadow">
                    <Sparkles className="w-3 h-3" />Boost
                  </span>
                )}
              </button>
              <div className="p-4 space-y-2 flex-1 flex flex-col">
                <button onClick={() => setPreviewProduct(p)} className="text-left">
                  <p className="font-semibold text-gray-900 truncate hover:text-blue-700">{p.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{p.merchant} · <span className="font-mono">{p.sku}</span></p>
                </button>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-yellow-50 rounded-lg">
                    <p className="text-[10px] text-gray-500">Продаж</p>
                    <p className="text-sm font-bold text-yellow-700">{p.sales}</p>
                  </div>
                  <div className="p-2 bg-green-50 rounded-lg">
                    <p className="text-[10px] text-gray-500">Выручка</p>
                    <p className="text-sm font-bold text-green-700">{fmtPrice(p.revenue)}</p>
                  </div>
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <p className="text-[10px] text-gray-500">Рейтинг</p>
                    <p className="text-sm font-bold text-purple-700">{p.rating ? `★ ${p.rating}` : '—'}</p>
                  </div>
                </div>
                {p.boostedBy && (
                  <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 truncate" title={`${p.boostedBy} (${p.boostedByRole}) · ${p.boostedAt}`}>
                    <Sparkles className="w-2.5 h-2.5 inline mr-1" />{p.boostedBy} · {p.boostedAt}
                  </p>
                )}
                <div className="flex-1" />
                {/* Manual reorder (only in manual mode) */}
                {listMode === 'manual' && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => moveRank(p, -1)} disabled={idx === 0}
                      className="flex-1 py-1.5 border border-gray-200 rounded-md text-xs hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1">
                      <ArrowUp className="w-3 h-3" />Выше
                    </button>
                    <button onClick={() => moveRank(p, +1)} disabled={idx === filtered.length - 1}
                      className="flex-1 py-1.5 border border-gray-200 rounded-md text-xs hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1">
                      <ArrowDown className="w-3 h-3" />Ниже
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <button onClick={() => setPreviewProduct(p)} className="flex-1 py-1.5 border border-gray-200 rounded-md text-xs hover:bg-gray-50 flex items-center justify-center gap-1" title="Открыть превью">
                    <Eye className="w-3 h-3" />Превью
                  </button>
                  <button onClick={() => pinProduct(p)} className={`py-1.5 px-2.5 rounded-md text-xs flex items-center justify-center gap-1 ${isPinned ? 'bg-yellow-200 hover:bg-yellow-300 text-yellow-900' : 'bg-yellow-50 hover:bg-yellow-100 text-yellow-800 border border-yellow-200'}`} title={isPinned ? 'Открепить' : 'Закрепить'}>
                    <Pin className="w-3 h-3" />
                  </button>
                  <button onClick={() => hideProduct(p)} className={`py-1.5 px-2.5 rounded-md text-xs flex items-center justify-center gap-1 ${isHidden ? 'bg-gray-300 hover:bg-gray-400 text-gray-900' : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200'}`} title={isHidden ? 'Показать' : 'Скрыть'}>
                    <EyeOff className="w-3 h-3" />
                  </button>
                  <button onClick={() => recommendProduct(p)} className="py-1.5 px-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-md text-xs flex items-center justify-center gap-1" title="В рекомендации">
                    <Sparkles className="w-3 h-3" />
                  </button>
                  <button onClick={() => { toast.success(`«${p.name}» добавлен в первые ряды`, { description: 'Откройте /products/showcase для размещения' }); navigate('/products/showcase'); }}
                    className="py-1.5 px-2.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-md text-xs flex items-center justify-center gap-1" title="В первые ряды">
                    <Crown className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-3 py-16 text-center text-gray-400">
            <Crown className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Популярные товары не найдены</p>
          </div>
        )}
      </div>

      {/* Preview modal */}
      {previewProduct && (
        <ProductPreviewModal
          product={previewProduct}
          onClose={() => setPreviewProduct(null)}
          onPinPopular={p => { pinProduct(p); setPreviewProduct({ ...p, popularityMode: p.popularityMode === 'pinned' ? 'auto' : 'pinned' }); }}
          onHidePopular={p => { hideProduct(p); setPreviewProduct({ ...p, popularityMode: p.popularityMode === 'hidden' ? 'auto' : 'hidden' }); }}
          onAddToShowcase={p => { toast.success(`«${p.name}» добавлен в первые ряды`); navigate('/products/showcase'); }}
          onRecommend={recommendProduct}
          onAddPromotion={p => { toast.success(`«${p.name}» добавлен в акции`); navigate('/products/promotions'); }}
          onAddDiscount={p => { toast.success(`«${p.name}» добавлен в скидки`); navigate('/products/discounts'); }}
          onEdit={p => { toast.info(`Редактирование «${p.name}»`); navigate('/products'); }}
        />
      )}
    </div>
  );
}
