import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Download, Upload, Filter, Package, Eye, EyeOff,
  AlertTriangle, CheckCircle, Clock, ArrowUpDown, ImageIcon,
  ChevronRight, TrendingUp, TrendingDown, X, ZoomIn,
  CalendarClock, Calendar, Bell, ExternalLink, Sparkles, Crown,
  Image as ImageIcon2, Video as VideoIcon,
} from 'lucide-react';
import {
  SellerProduct, AvailabilityStatus,
  formatCurrency, formatNumber
} from '../../data/merchants-mock';
import {
  useSellerProducts,
  getEffectiveExpiryDate,
  calcExpiryInfo,
  formatExpiryDate,
  type ExpiryStatus,
} from '../../store/productsStore';
import { ProductDetailPanel } from './ProductDetailPanel';
import { ProductImageLightbox } from './ProductImageLightbox';
import { toast } from 'sonner';

interface Props { sellerId: string; }

const AVAILABILITY_CONFIG: Record<AvailabilityStatus, { label: string; color: string; bg: string; icon: any }> = {
  available: { label: 'В наличии', color: 'text-green-700', bg: 'bg-green-100', icon: CheckCircle },
  sold_out_today: { label: 'Нет сегодня', color: 'text-orange-700', bg: 'bg-orange-100', icon: Clock },
  sold_out_indefinitely: { label: 'Нет в наличии', color: 'text-red-700', bg: 'bg-red-100', icon: AlertTriangle },
  hidden: { label: 'Скрыт', color: 'text-gray-600', bg: 'bg-gray-100', icon: EyeOff },
};

export function SellerProductsTab({ sellerId }: Props) {
  const allProducts = useSellerProducts(sellerId);
  const [search, setSearch] = useState('');
  const [availFilter, setAvailFilter] = useState<AvailabilityStatus | 'all'>('all');
  const [expiryFilter, setExpiryFilter] = useState<ExpiryStatus | 'all'>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Store only the ID — the live product is always derived from the store
  const [activeProductId, setActiveProductId] = useState<string | null>(null);
  const [lightboxProductId, setLightboxProductId] = useState<string | null>(null);

  // Always reflect latest store data
  const activeProduct = activeProductId
    ? allProducts.find(p => p.id === activeProductId) ?? null
    : null;
  const lightboxProduct = lightboxProductId
    ? allProducts.find(p => p.id === lightboxProductId) ?? null
    : null;

  const filtered = useMemo(() => {
    return allProducts.filter(p => {
      const q = search.toLowerCase();
      const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
      const matchesAvail = availFilter === 'all' || p.availability === availFilter;
      let matchesExpiry = true;
      if (expiryFilter !== 'all') {
        const expDate = getEffectiveExpiryDate(p);
        if (!expDate) {
          matchesExpiry = false;
        } else {
          const info = calcExpiryInfo(expDate);
          matchesExpiry = info.status === expiryFilter;
        }
      }
      return matchesSearch && matchesAvail && matchesExpiry;
    });
  }, [search, availFilter, expiryFilter, allProducts]);

  const stats = useMemo(() => {
    const total = allProducts.length;
    const available = allProducts.filter(p => p.availability === 'available').length;
    const outOfStock = allProducts.filter(p => p.availability === 'sold_out_today' || p.availability === 'sold_out_indefinitely').length;
    const hidden = allProducts.filter(p => p.availability === 'hidden').length;
    return { total, available, outOfStock, hidden };
  }, [allProducts]);

  // Expiry analytics
  const expiryStats = useMemo(() => {
    const tracked = allProducts.filter(p => {
      const d = getEffectiveExpiryDate(p);
      return d != null;
    });
    const expired       = tracked.filter(p => { const d = getEffectiveExpiryDate(p)!; return calcExpiryInfo(d).status === 'expired'; });
    const expiringSoon  = tracked.filter(p => { const d = getEffectiveExpiryDate(p)!; return calcExpiryInfo(d).status === 'expiring_soon'; });
    const hasAnyIssue   = expired.length + expiringSoon.length > 0;
    return { tracked: tracked.length, expired: expired.length, expiringSoon: expiringSoon.length, hasAnyIssue };
  }, [allProducts]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className={`flex gap-4 ${activeProduct ? 'items-start' : ''}`}>
      {/* ── Main table ── */}
      <div className={`space-y-4 min-w-0 ${activeProduct ? 'flex-1' : 'w-full'}`}>
        {/* SuperAdmin quick-links: jump to platform product views filtered by this merchant */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-3">
          <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-2">SuperAdmin · Сводный доступ к товарам продавца</p>
          <div className="flex flex-wrap gap-2">
            <Link to={`/products?merchant=${encodeURIComponent(sellerId)}`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-200 hover:bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold transition-colors">
              <Package className="w-3.5 h-3.5" />Все товары<ExternalLink className="w-3 h-3 opacity-60" />
            </Link>
            <Link to={`/products/media?merchant=${encodeURIComponent(sellerId)}`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-purple-200 hover:bg-purple-50 text-purple-700 rounded-lg text-xs font-semibold transition-colors">
              <ImageIcon2 className="w-3.5 h-3.5" />Медиа продавца<ExternalLink className="w-3 h-3 opacity-60" />
            </Link>
            <Link to={`/products/popular?merchant=${encodeURIComponent(sellerId)}`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-yellow-200 hover:bg-yellow-50 text-yellow-700 rounded-lg text-xs font-semibold transition-colors">
              <Crown className="w-3.5 h-3.5" />Популярные<ExternalLink className="w-3 h-3 opacity-60" />
            </Link>
            <Link to={`/products/recommended`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-pink-200 hover:bg-pink-50 text-pink-700 rounded-lg text-xs font-semibold transition-colors">
              <Sparkles className="w-3.5 h-3.5" />Рекомендации<ExternalLink className="w-3 h-3 opacity-60" />
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <p className="text-lg font-bold text-gray-900">{stats.total}</p>
            <p className="text-[10px] text-gray-500 uppercase">Всего SKU</p>
          </div>
          <div className="text-center p-2 bg-green-50 rounded-lg">
            <p className="text-lg font-bold text-green-600">{stats.available}</p>
            <p className="text-[10px] text-gray-500 uppercase">В наличии</p>
          </div>
          <div className="text-center p-2 bg-orange-50 rounded-lg">
            <p className="text-lg font-bold text-orange-600">{stats.outOfStock}</p>
            <p className="text-[10px] text-gray-500 uppercase">Нет в наличии</p>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <p className="text-lg font-bold text-gray-500">{stats.hidden}</p>
            <p className="text-[10px] text-gray-500 uppercase">Скрыто</p>
          </div>
        </div>

        {/* Expiry mini-stats (shown only when products have expiry tracking) */}
        {expiryStats.tracked > 0 && (
          <div className="flex items-center gap-3 p-2.5 bg-rose-50/60 border border-rose-100 rounded-xl">
            <CalendarClock className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span className="text-xs text-gray-600 font-medium">Контроль сроков:</span>
            <div className="flex items-center gap-3 flex-1">
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />{expiryStats.tracked} отслеживается
              </span>
              {expiryStats.expiringSoon > 0 && (
                <span className="flex items-center gap-1 text-xs font-semibold text-orange-600">
                  <Clock className="w-3 h-3" />{expiryStats.expiringSoon} истекают скоро
                </span>
              )}
              {expiryStats.expired > 0 && (
                <span className="flex items-center gap-1 text-xs font-semibold text-red-600">
                  <AlertTriangle className="w-3 h-3" />{expiryStats.expired} истекли
                </span>
              )}
              {expiryStats.expiringSoon === 0 && expiryStats.expired === 0 && (
                <span className="flex items-center gap-1 text-xs font-semibold text-green-600">
                  <CheckCircle className="w-3 h-3" />Все в порядке
                </span>
              )}
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Поиск по SKU, названию, категории..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <select value={availFilter} onChange={(e) => setAvailFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">Все статусы</option>
            <option value="available">В наличии</option>
            <option value="sold_out_today">Нет сегодня</option>
            <option value="sold_out_indefinitely">Нет в наличии</option>
            <option value="hidden">Скрыт</option>
          </select>
          {expiryStats.tracked > 0 && (
            <select value={expiryFilter} onChange={(e) => setExpiryFilter(e.target.value as any)}
              className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 ${
                expiryFilter !== 'all' ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-gray-200'
              }`}>
              <option value="all">Все сроки ({expiryStats.tracked} отслеж.)</option>
              <option value="expired">Истёк ({expiryStats.expired})</option>
              <option value="expiring_soon">Истекает скоро ({expiryStats.expiringSoon})</option>
              <option value="ok">В порядке</option>
            </select>
          )}
          <button onClick={() => toast.info('Импорт прайс-листа...')} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
            <Upload className="w-4 h-4" /> Импорт
          </button>
          <button onClick={() => toast.success('Экспорт товаров запущен')} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
            <Download className="w-4 h-4" /> Экспорт
          </button>
        </div>

        {/* Expiry Alert Banner */}
        {expiryStats.hasAnyIssue && (
          <div className={`flex items-start gap-3 p-3.5 rounded-xl border ${
            expiryStats.expired > 0 ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'
          }`}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              expiryStats.expired > 0 ? 'bg-red-100' : 'bg-orange-100'
            }`}>
              <CalendarClock className={`w-4 h-4 ${expiryStats.expired > 0 ? 'text-red-600' : 'text-orange-600'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-bold ${expiryStats.expired > 0 ? 'text-red-800' : 'text-orange-800'}`}>
                {expiryStats.expired > 0 && expiryStats.expiringSoon > 0
                  ? `Проблемы со сроками: ${expiryStats.expired} истёкших + ${expiryStats.expiringSoon} истекают`
                  : expiryStats.expired > 0
                    ? `${expiryStats.expired} ${expiryStats.expired === 1 ? 'товар снят' : 'товара снято'} — срок годности истёк`
                    : `${expiryStats.expiringSoon} ${expiryStats.expiringSoon === 1 ? 'товар истекает' : 'товара истекают'} в ближайшие 3 дня`}
              </p>
              <p className={`text-xs mt-0.5 ${expiryStats.expired > 0 ? 'text-red-600' : 'text-orange-600'}`}>
                {expiryStats.expired > 0
                  ? 'Истёкшие товары автоматически сняты с продажи. Обновите партию.'
                  : 'Уведомления отправлены в центр уведомлений. Обновите поставку.'}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              {expiryStats.expired > 0 && (
                <button
                  onClick={() => setExpiryFilter('expired')}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors">
                  <AlertTriangle className="w-3 h-3" />Истёкшие
                </button>
              )}
              {expiryStats.expiringSoon > 0 && (
                <button
                  onClick={() => setExpiryFilter('expiring_soon')}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold transition-colors">
                  <Bell className="w-3 h-3" />Скоро
                </button>
              )}
            </div>
          </div>
        )}

        {/* Hint banner */}
        {!activeProduct && (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
            Нажмите на строку товара, чтобы открыть детальную аналитику продаж
          </div>
        )}

        {/* Bulk */}
        {selected.size > 0 && (
          <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg text-sm">
            <span className="text-blue-700">Выбрано: {selected.size}</span>
            <button onClick={() => toast.info('Массовое изменение availability')} className="px-2 py-1 bg-white border border-gray-200 rounded text-xs hover:bg-gray-50">Изменить статус</button>
            <button onClick={() => toast.info('Массовое изменение цены')} className="px-2 py-1 bg-white border border-gray-200 rounded text-xs hover:bg-gray-50">Изменить цену</button>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70">
                <th className="w-8 px-2 py-2"><input type="checkbox" className="rounded border-gray-300 text-blue-600" /></th>
                <th className="w-12 px-2 py-2 font-medium text-gray-500">Фото</th>
                <th className="text-left px-2 py-2 font-medium text-gray-500">SKU</th>
                <th className="text-left px-2 py-2 font-medium text-gray-500">Товар</th>
                <th className="text-left px-2 py-2 font-medium text-gray-500 hidden lg:table-cell">Категория</th>
                <th className="text-right px-2 py-2 font-medium text-gray-500">Цена</th>
                <th className="text-center px-2 py-2 font-medium text-gray-500">Статус</th>
                <th className="text-right px-2 py-2 font-medium text-gray-500">Остаток</th>
                <th className="text-right px-2 py-2 font-medium text-gray-500 hidden lg:table-cell">Прод. 7д</th>
                <th className="text-right px-2 py-2 font-medium text-gray-500 hidden lg:table-cell">Выручка 30д</th>
                <th className="text-right px-2 py-2 font-medium text-gray-500 hidden xl:table-cell">Конверсия</th>
                <th className="text-center px-2 py-2 font-medium hidden xl:table-cell">
                  <span className="flex items-center gap-1 justify-center text-rose-500"><CalendarClock className="w-3 h-3" /><span className="text-gray-500">Срок</span></span>
                </th>
                <th className="w-8 px-2 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(product => {
                const ac = AVAILABILITY_CONFIG[product.availability];
                const AIcon = ac.icon;
                const isActive = activeProduct?.id === product.id;
                return (
                  <tr
                    key={product.id}
                    onClick={() => setActiveProductId(prev => prev === product.id ? null : product.id)}
                    className={`cursor-pointer transition-colors ${isActive ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-gray-50/50'}`}
                  >
                    <td className="px-2 py-2.5" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(product.id)} onChange={() => toggleSelect(product.id)} className="rounded border-gray-300 text-blue-600" />
                    </td>
                    <td className="px-2 py-2.5">
                      <div
                        className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 shrink-0 relative group cursor-zoom-in"
                        onClick={e => { e.stopPropagation(); setLightboxProductId(product.id); }}
                      >
                        {product.imageUrl ? (
                          <div style={{display:'contents'}}>
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
                            <div className="absolute inset-0 bg-gray-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <ZoomIn className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-4 h-4 text-gray-400" /></div>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-2.5 text-xs text-gray-500 font-mono">{product.sku}</td>
                    <td className="px-2 py-2.5">
                      <p className="font-medium text-gray-900">{product.name}</p>
                      {isActive && <p className="text-[10px] text-blue-600 mt-0.5">← Детали открыты</p>}
                    </td>
                    <td className="px-2 py-2.5 text-gray-600 hidden lg:table-cell">{product.category}</td>
                    <td className="px-2 py-2.5 text-right font-medium">₽{product.price.toLocaleString()}</td>
                    <td className="px-2 py-2.5 text-center">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${ac.bg} ${ac.color}`}>
                        <AIcon className="w-3 h-3" /> {ac.label}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      <span className={product.stock === 0 ? 'text-red-600 font-medium' : 'text-gray-600'}>
                        {product.stock !== null ? product.stock : '—'}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-right hidden lg:table-cell">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-gray-700 font-medium">{product.sales7d}</span>
                      </div>
                    </td>
                    <td className="px-2 py-2.5 text-right text-gray-600 hidden lg:table-cell">{formatCurrency(product.revenue30d)}</td>
                    <td className="px-2 py-2.5 text-right text-gray-600 hidden xl:table-cell">{product.conversion}%</td>
                    <td className="px-2 py-2.5 text-center hidden xl:table-cell">
                      {(() => {
                        const exDate = getEffectiveExpiryDate(product);
                        if (!exDate) return <span className="text-gray-300 text-[10px]">—</span>;
                        const ei = calcExpiryInfo(exDate);
                        return (
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                            ei.status === 'expired'       ? 'bg-red-100 text-red-700' :
                            ei.status === 'expiring_soon' ? 'bg-orange-100 text-orange-700' :
                            'bg-green-50 text-green-700'
                          }`}>
                            {ei.status === 'expired'
                              ? <AlertTriangle className="w-2.5 h-2.5" />
                              : ei.status === 'expiring_soon'
                                ? <Clock className="w-2.5 h-2.5" />
                                : <CheckCircle className="w-2.5 h-2.5" />}
                            {formatExpiryDate(exDate)}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isActive ? 'rotate-90 text-blue-500' : 'text-gray-300'}`} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Package className="w-10 h-10 mx-auto mb-2" />
            <p className="text-sm">Товары не найдены</p>
          </div>
        )}
      </div>

      {/* ── Product detail side panel ── */}
      {activeProduct && (
        <div className="w-80 shrink-0 sticky top-0 h-[calc(100vh-200px)] rounded-xl border border-gray-200 overflow-hidden shadow-lg">
          <ProductDetailPanel
            product={activeProduct}
            sellerId={sellerId}
            onClose={() => setActiveProductId(null)}
          />
        </div>
      )}

      {/* ── Image lightbox ── */}
      {lightboxProduct && (
        <ProductImageLightbox
          product={lightboxProduct}
          onClose={() => setLightboxProductId(null)}
        />
      )}
    </div>
  );
}