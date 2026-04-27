import React, { useState, useEffect, useCallback } from 'react';
import { getDemandMetrics, getTopProducts, getSellerProducts, getProductSalesTrend, formatCurrency, formatNumber } from '../../data/merchants-mock';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { ChartWrapper } from '../ui/ChartWrapper';
import {
  Eye, ShoppingCart, Package, TrendingUp, TrendingDown,
  ChevronRight, BarChart2, ArrowUpRight, ImageIcon,
  ZoomIn, X, ChevronLeft, ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props { sellerId: string; }

// ─── Lightbox ─────────────────────────────────────────────────────────────────

interface LightboxItem {
  name: string;
  category: string;
  imageUrl: string;
  revenue: number;
  orders: number;
  trend: number;
  rank: number;
}

function ProductLightbox({ items, initialIndex, onClose }: {
  items: LightboxItem[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(initialIndex);
  const item = items[idx];
  const trendPos = item.trend > 0;

  const prev = useCallback(() => setIdx(i => (i - 1 + items.length) % items.length), [items.length]);
  const next = useCallback(() => setIdx(i => (i + 1) % items.length), [items.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
  }, [onClose, prev, next]);

  const rankStyle = [
    'bg-yellow-100 text-yellow-700 border-yellow-300',
    'bg-gray-100 text-gray-600 border-gray-300',
    'bg-orange-100 text-orange-600 border-orange-300',
  ][idx] ?? 'bg-gray-50 text-gray-400 border-gray-200';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-gray-950/85 backdrop-blur-md" />

        {/* Close */}
        <button onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center text-white transition-colors">
          <X className="w-5 h-5" />
        </button>

        {/* Nav prev */}
        {items.length > 1 && (
          <button onClick={e => { e.stopPropagation(); prev(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center text-white transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        {items.length > 1 && (
          <button onClick={e => { e.stopPropagation(); next(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center text-white transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        <motion.div
          key={idx}
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: -12 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="relative bg-white rounded-2xl shadow-2xl overflow-hidden max-w-md w-full"
          onClick={e => e.stopPropagation()}
        >
          {/* Image area */}
          <div className="relative bg-gray-100 aspect-square overflow-hidden">
            {item.imageUrl ? (
              <img
                src={item.imageUrl.replace('w=200&h=200', 'w=600&h=600')}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-16 h-16 text-gray-300" />
              </div>
            )}
            {/* Rank badge */}
            <div className={`absolute top-3 left-3 w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold border-2 bg-white shadow-md ${rankStyle}`}>
              #{item.rank}
            </div>
            {/* Trend badge */}
            <div className={`absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold shadow-md ${trendPos ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
              {trendPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {trendPos ? '+' : ''}{item.trend}%
            </div>
          </div>

          {/* Info */}
          <div className="p-5">
            <div className="mb-1">
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{item.category}</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mt-2 leading-tight">{item.name}</h3>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Выручка (30д)</p>
                <p className="text-base font-bold text-gray-900">{formatCurrency(item.revenue)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Заказов (30д)</p>
                <p className="text-base font-bold text-gray-900">{item.orders}</p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
              <span>Средний чек: <span className="font-semibold text-gray-800">₽{Math.round(item.revenue / item.orders).toLocaleString()}</span></span>
              <span className={`flex items-center gap-1 font-semibold ${trendPos ? 'text-green-600' : 'text-red-500'}`}>
                {trendPos ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {trendPos ? '+' : ''}{item.trend}% к прошлому периоду
              </span>
            </div>

            {/* Dots */}
            {items.length > 1 && (
              <div className="flex items-center justify-center gap-1.5 mt-4">
                {items.map((_, i) => (
                  <button key={i} onClick={() => setIdx(i)}
                    className={`transition-all rounded-full ${i === idx ? 'w-5 h-2 bg-blue-600' : 'w-2 h-2 bg-gray-300 hover:bg-gray-400'}`} />
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Keyboard hint */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 text-white/50 text-xs">
          <span>← → навигация</span>
          <span>·</span>
          <span>Esc закрыть</span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

const HOURLY_DATA = [
  { hour: '06', orders: 2 }, { hour: '07', orders: 5 }, { hour: '08', orders: 12 },
  { hour: '09', orders: 18 }, { hour: '10', orders: 28 }, { hour: '11', orders: 45 },
  { hour: '12', orders: 67 }, { hour: '13', orders: 58 }, { hour: '14', orders: 42 },
  { hour: '15', orders: 35 }, { hour: '16', orders: 38 }, { hour: '17', orders: 52 },
  { hour: '18', orders: 72 }, { hour: '19', orders: 85 }, { hour: '20', orders: 64 },
  { hour: '21', orders: 32 }, { hour: '22', orders: 14 }, { hour: '23', orders: 5 },
];

const CATEGORY_DATA = [
  { name: 'Электроника', revenue: 4_634_310, orders: 69, share: 38.2 },
  { name: 'Смартфоны', revenue: 2_159_760, orders: 24, share: 17.8 },
  { name: 'Аксессуары', revenue: 2_467_940, orders: 206, share: 20.3 },
  { name: 'Ноутбуки', revenue: 1_484_890, orders: 11, share: 12.2 },
  { name: 'Умные часы', revenue: 1_199_850, orders: 15, share: 9.9 },
  { name: 'Аудио', revenue: 103_920, orders: 8, share: 0.9 },
];

const STOCKOUT_DATA = [
  { date: '13 фев', rate: 1.8 }, { date: '14 фев', rate: 2.1 }, { date: '15 фев', rate: 1.5 },
  { date: '16 фев', rate: 3.2 }, { date: '17 фев', rate: 5.6 }, { date: '18 фев', rate: 7.8 },
  { date: '19 фев', rate: 8.9 },
];

export function SellerAnalyticsTab({ sellerId }: Props) {
  const metrics = getDemandMetrics(sellerId);
  const topProducts = getTopProducts(sellerId);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const lightboxItems: LightboxItem[] = topProducts.map((p, i) => ({ ...p, rank: i + 1 }));

  const funnelData = metrics.reduce((acc, m) => ({
    views: acc.views + m.views,
    addToCart: acc.addToCart + m.addToCart,
    orders: acc.orders + m.orders,
  }), { views: 0, addToCart: 0, orders: 0 });

  return (
    <div className="space-y-6">
      {/* Demand Funnel */}
      <div>
        <h3 className="font-medium text-gray-900 mb-3">Воронка спроса (7д)</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: Eye,         bg: 'bg-blue-50',   color: 'text-blue-600',   value: formatNumber(funnelData.views),       label: 'Просмотры',  sub: null },
            { icon: ShoppingCart,bg: 'bg-orange-50', color: 'text-orange-600', value: formatNumber(funnelData.addToCart),   label: 'В корзину',  sub: `${((funnelData.addToCart / funnelData.views) * 100).toFixed(1)}% конверсия` },
            { icon: Package,     bg: 'bg-green-50',  color: 'text-green-600',  value: formatNumber(funnelData.orders),      label: 'Заказы',     sub: `${((funnelData.orders / funnelData.addToCart) * 100).toFixed(1)}% конверсия` },
          ].map((card, i) => {
            const CardIcon = card.icon;
            return (
              <button
                key={i}
                onClick={() => toast.info(card.label, { description: `${card.value} за 7 дней${card.sub ? ' · ' + card.sub : ''}` })}
                className={`${card.bg} rounded-xl p-4 text-center cursor-pointer hover:shadow-md active:scale-[0.97] transition-all`}
              >
                <CardIcon className={`w-6 h-6 ${card.color} mx-auto mb-2`} />
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                <p className="text-xs text-gray-500 mt-1">{card.label}</p>
                {card.sub && <p className={`text-[10px] ${card.color} mt-0.5`}>{card.sub}</p>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Demand by hour */}
        <div className="bg-gray-50 rounded-xl p-4 min-w-0">
          <h4 className="font-medium text-gray-900 text-sm mb-3">Заказы по часам (типовой день)</h4>
          <ChartWrapper height={200}>
            {(w, h) => (
              <BarChart key={`hourly-bar-${w}`} width={w} height={h} data={HOURLY_DATA}>
                <CartesianGrid key="cg" strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis key="xa" dataKey="hour" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis key="ya" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <Tooltip key="tt" />
                <Bar key="bar-orders" dataKey="orders" fill="#6366f1" radius={[3, 3, 0, 0]} name="Заказы" />
              </BarChart>
            )}
          </ChartWrapper>
          <p className="text-xs text-gray-500 mt-2">Пиковые часы: 12:00–13:00, 18:00–20:00</p>
        </div>

        {/* Stock-out trend */}
        <div className="bg-gray-50 rounded-xl p-4 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900 text-sm">Динамика stock-out rate (7д)</h4>
            <div className="flex items-center gap-1 text-xs text-red-600">
              <TrendingUp className="w-3 h-3" /> Рост!
            </div>
          </div>
          <ChartWrapper height={200}>
            {(w, h) => (
              <LineChart key={`stockout-line-${w}`} width={w} height={h} data={STOCKOUT_DATA}>
                <CartesianGrid key="cg" strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis key="xa" dataKey="date" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis key="ya" tick={{ fontSize: 11 }} stroke="#9ca3af" unit="%" />
                <Tooltip key="tt" formatter={(v: number) => [`${v}%`, 'Stock-out']} />
                <Line key="ln-rate" type="monotone" dataKey="rate" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444', r: 3 }} name="Stock-out %" />
              </LineChart>
            )}
          </ChartWrapper>
          <div className="flex items-start gap-2 mt-2 p-2 bg-red-50 rounded-lg">
            <TrendingUp className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700">Stock-out rate вырос с 1.8% до 8.9% за неделю. Проверьте наличие товаров и остатки на складе.</p>
          </div>
        </div>
      </div>

      {/* Category Performance */}
      <div className="bg-gray-50 rounded-xl p-4">
        <h4 className="font-medium text-gray-900 text-sm mb-3">Выручка по категориям (30д)</h4>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="min-w-0">
            <ChartWrapper height={200}>
              {(w, h) => (
                <BarChart key={`category-bar-${w}`} width={w} height={h} data={CATEGORY_DATA} layout="vertical">
                  <CartesianGrid key="cg" strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis key="xa" type="number" tick={{ fontSize: 10 }} stroke="#9ca3af" tickFormatter={(v: number) => `₽${(v / 1000000).toFixed(1)}M`} />
                  <YAxis key="ya" dataKey="name" type="category" width={80} tick={{ fontSize: 10 }} stroke="#9ca3af" />
                  <Tooltip key="tt" formatter={(v: number) => [`₽${v.toLocaleString()}`, 'Выручка']} />
                  <Bar key="bar-revenue" dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              )}
            </ChartWrapper>
          </div>
          <div className="space-y-2">
            {CATEGORY_DATA.map((cat, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-white rounded-lg">
                <div>
                  <p className="text-sm text-gray-900">{cat.name}</p>
                  <p className="text-xs text-gray-500">{cat.orders} заказов · {cat.share}% доли</p>
                </div>
                <p className="text-sm font-medium text-gray-900">{formatCurrency(cat.revenue)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Products — enhanced with clickable images & lightbox */}
      <div className="bg-gray-50 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-gray-900 text-sm flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-blue-500" />
            Топ товаров по выручке (30д)
          </h4>
          <span className="text-xs text-gray-400">{topProducts.length} позиций</span>
        </div>

        <div className="space-y-2.5">
          {topProducts.map((p, i) => {
            const maxRev = topProducts[0].revenue;
            const barPct = (p.revenue / maxRev) * 100;
            const trendPositive = p.trend > 0;
            const barColor = ['bg-blue-500', 'bg-indigo-400', 'bg-purple-400'][i] ?? 'bg-gray-300';

            return (
              <div key={i} className="bg-white rounded-xl p-3 border border-gray-100 hover:border-blue-200 transition-all hover:shadow-sm group">
                <div className="flex items-center gap-3">
                  {/* Rank */}
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                    i === 0 ? 'bg-yellow-100 text-yellow-700' :
                    i === 1 ? 'bg-gray-100 text-gray-600' :
                    i === 2 ? 'bg-orange-50 text-orange-600' :
                    'bg-gray-50 text-gray-400'
                  }`}>
                    {i + 1}
                  </div>

                  {/* Clickable Image — larger, with zoom overlay */}
                  <button
                    onClick={() => setLightboxIdx(i)}
                    className="relative w-14 h-14 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shrink-0 group/img hover:border-blue-300 transition-all hover:shadow-md"
                    title="Нажмите для просмотра"
                  >
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="w-full h-full object-cover transition-transform group-hover/img:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 text-gray-300" />
                      </div>
                    )}
                    {/* Zoom overlay on hover */}
                    <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/30 flex items-center justify-center transition-all">
                      <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover/img:opacity-100 transition-all drop-shadow-md" />
                    </div>
                  </button>

                  {/* Name + category */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.category} · {p.orders} заказов</p>
                  </div>

                  {/* Revenue + trend */}
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-gray-900">{formatCurrency(p.revenue)}</p>
                    <div className={`flex items-center gap-0.5 justify-end text-xs font-medium ${trendPositive ? 'text-green-600' : 'text-red-500'}`}>
                      {trendPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {trendPositive ? '+' : ''}{p.trend}%
                    </div>
                  </div>
                </div>

                {/* Revenue bar */}
                <div className="mt-2.5">
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${barPct}%` }} />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-gray-400">
                      {((p.revenue / topProducts.reduce((s, t) => s + t.revenue, 0)) * 100).toFixed(1)}% от выручки топ-5
                    </span>
                    <button
                      onClick={() => setLightboxIdx(i)}
                      className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-0.5 transition-colors"
                    >
                      <ZoomIn className="w-3 h-3" />фото товара
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary row */}
        <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-blue-800">Итого — топ 5 товаров</p>
            <p className="text-xs text-blue-600">{topProducts.reduce((s, p) => s + p.orders, 0)} заказов</p>
          </div>
          <p className="text-sm font-bold text-blue-900">{formatCurrency(topProducts.reduce((s, p) => s + p.revenue, 0))}</p>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <ProductLightbox
          items={lightboxItems}
          initialIndex={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      )}
    </div>
  );
}