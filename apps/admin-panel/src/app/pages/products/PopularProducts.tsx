import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Search, Download, Eye, Image as ImageIcon, TrendingUp, DollarSign,
  Star, AlertTriangle, ArrowDown, ArrowUp, ExternalLink, Crown, Plus,
} from 'lucide-react';
import {
  PRODUCTS, getCategoryName, fmtPrice, PRODUCT_STATUS_CFG,
  type Product,
} from '../../data/products-mock';
import { exportToCsv } from '../../utils/downloads';

type SortField = 'sales' | 'revenue' | 'rating' | 'stock';

export function PopularProducts() {
  const navigate = useNavigate();
  const [sortField, setSortField] = useState<SortField>('sales');
  const [sortDir, setSortDir]     = useState<'desc' | 'asc'>('desc');
  const [search, setSearch]       = useState('');
  // Filter applied via KPI card click
  const [kpiFilter, setKpiFilter] = useState<'all' | 'low_stock' | 'no_photo'>('all');
  const [recommended, setRecommended] = useState<Set<string>>(new Set());

  // Take all NON-archived products and sort by chosen metric.
  const sorted = useMemo(() => {
    const live = PRODUCTS.filter(p => p.status !== 'archived' && p.sales > 0);
    return [...live].sort((a, b) => {
      const av = a[sortField], bv = b[sortField];
      return sortDir === 'desc' ? (bv as number) - (av as number) : (av as number) - (bv as number);
    });
  }, [sortField, sortDir]);

  const popular = sorted; // top across all metrics

  const stats = useMemo(() => {
    const top = [...PRODUCTS].sort((a, b) => b.sales - a.sales)[0];
    const topRev = [...PRODUCTS].sort((a, b) => b.revenue - a.revenue)[0];
    const highRated = [...PRODUCTS].filter(p => p.rating > 0).sort((a, b) => b.rating - a.rating)[0];
    return {
      topSeller:   top,
      topRevenue:  topRev,
      highRated:   highRated,
      lowStock:    PRODUCTS.filter(p => p.sales > 0 && p.stock > 0 && p.stock < 20).length,
      noPhoto:     PRODUCTS.filter(p => p.sales > 0 && p.photoCount === 0).length,
    };
  }, []);

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
    setRecommended(prev => new Set(prev).add(p.id));
    toast.success(`«${p.name}» добавлен в рекомендации`, { description: 'Откройте /products/recommended для управления' });
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

      {/* Sort + search */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по товару, продавцу..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
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
      </div>

      <p className="text-sm text-gray-500">Показано: <span className="font-semibold text-gray-800">{filtered.length}</span> · Сортировка: {sortField} {sortDir === 'desc' ? '↓' : '↑'}</p>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((p, idx) => {
          const sc = PRODUCT_STATUS_CFG[p.status];
          const isRecommended = recommended.has(p.id);
          return (
            <div key={p.id} className="bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow overflow-hidden">
              <div className="aspect-[16/9] bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center relative">
                <span className="absolute top-2 left-2 px-2 py-0.5 bg-yellow-400 text-yellow-900 rounded-full text-[10px] font-bold flex items-center gap-1">
                  <Crown className="w-3 h-3" />#{idx + 1}
                </span>
                <span className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-medium ${sc.cls}`}>{sc.label}</span>
                <span className="text-6xl">{getCategoryName(p.categoryId).match(/^[\p{Emoji}]/u) ? getCategoryName(p.categoryId)[0] : '📦'}</span>
              </div>
              <div className="p-4 space-y-2">
                <div>
                  <p className="font-semibold text-gray-900 truncate">{p.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{p.merchant} · <span className="font-mono">{p.sku}</span></p>
                </div>
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
                <div className="flex items-center gap-1 pt-2">
                  <button onClick={() => navigate(`/products?merchant=${encodeURIComponent(p.merchantId)}`)} className="flex-1 py-1.5 border border-gray-200 rounded-md text-xs hover:bg-gray-50 flex items-center justify-center gap-1">
                    <Eye className="w-3 h-3" />Открыть
                  </button>
                  <Link to="/products/media" className="flex-1 py-1.5 border border-gray-200 rounded-md text-xs hover:bg-gray-50 flex items-center justify-center gap-1">
                    <ImageIcon className="w-3 h-3" />Фото
                  </Link>
                  {isRecommended ? (
                    <span className="flex-1 py-1.5 bg-green-100 text-green-700 rounded-md text-xs flex items-center justify-center gap-1 font-semibold">
                      ✓ В рекомендациях
                    </span>
                  ) : (
                    <button onClick={() => recommendProduct(p)} className="flex-1 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-md text-xs flex items-center justify-center gap-1 font-semibold">
                      <Plus className="w-3 h-3" />Рекомендовать
                    </button>
                  )}
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
    </div>
  );
}
