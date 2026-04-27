import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, ImageIcon, CheckCircle, Clock, AlertTriangle, EyeOff,
  Package, DollarSign, TrendingUp, Percent, Tag, ShoppingCart,
  BarChart2, Star,
} from 'lucide-react';
import { SellerProduct, AvailabilityStatus, formatCurrency } from '../../data/merchants-mock';

interface Props {
  product: SellerProduct;
  onClose: () => void;
}

const AVAILABILITY_CONFIG: Record<AvailabilityStatus, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  available:             { label: 'В наличии',     color: 'text-green-700',  bg: 'bg-green-100',  border: 'border-green-200', icon: CheckCircle },
  sold_out_today:        { label: 'Нет сегодня',   color: 'text-orange-700', bg: 'bg-orange-100', border: 'border-orange-200', icon: Clock },
  sold_out_indefinitely: { label: 'Нет в наличии', color: 'text-red-700',    bg: 'bg-red-100',    border: 'border-red-200',    icon: AlertTriangle },
  hidden:                { label: 'Скрыт',         color: 'text-gray-600',   bg: 'bg-gray-100',   border: 'border-gray-200',   icon: EyeOff },
};

export function ProductImageLightbox({ product, onClose }: Props) {
  const avail = AVAILABILITY_CONFIG[product.availability];
  const AvailIcon = avail.icon;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  const metrics = [
    { label: 'Продажи 7д',  value: `${product.sales7d} шт`,            icon: Package,      color: 'text-blue-600',    bg: 'bg-blue-50' },
    { label: 'Продажи 30д', value: `${product.sales30d} шт`,           icon: ShoppingCart, color: 'text-indigo-600',  bg: 'bg-indigo-50' },
    { label: 'Выручка 30д', value: formatCurrency(product.revenue30d), icon: DollarSign,   color: 'text-green-600',   bg: 'bg-green-50' },
    { label: 'Конверсия',   value: `${product.conversion}%`,           icon: Percent,      color: 'text-purple-600',  bg: 'bg-purple-50' },
    { label: 'Маржа',       value: product.margin !== null ? `${product.margin}%` : '—', icon: Tag, color: product.margin !== null && product.margin > 20 ? 'text-teal-600' : 'text-orange-600', bg: product.margin !== null && product.margin > 20 ? 'bg-teal-50' : 'bg-orange-50' },
    { label: 'Остаток',     value: product.stock !== null ? `${product.stock} шт` : '—', icon: TrendingUp, color: product.stock === 0 ? 'text-red-600' : 'text-emerald-600', bg: product.stock === 0 ? 'bg-red-50' : 'bg-emerald-50' },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-gray-950/80 backdrop-blur-sm" />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-1 rounded">{product.sku}</span>
              <span className="text-xs text-gray-500">{product.category}</span>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500 hover:text-gray-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
            {/* Left — Image */}
            <div className="md:w-64 shrink-0 bg-gray-50 flex items-center justify-center p-6 border-b md:border-b-0 md:border-r border-gray-100">
              {product.imageUrl ? (
                <motion.img
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full max-h-56 md:max-h-72 object-contain rounded-xl drop-shadow-lg"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center bg-gray-100 rounded-2xl border-2 border-dashed border-gray-200">
                  <ImageIcon className="w-14 h-14 text-gray-300" />
                </div>
              )}
            </div>

            {/* Right — Details */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Title + availability */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 leading-tight">{product.name}</h2>
                <div className="flex items-center gap-3 mt-3 flex-wrap">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border ${avail.bg} ${avail.color} ${avail.border}`}>
                    <AvailIcon className="w-3.5 h-3.5" /> {avail.label}
                  </span>
                  <span className="text-2xl font-bold text-gray-900">₽{product.price.toLocaleString('ru-RU')}</span>
                </div>
              </div>

              {/* Stock notice */}
              {product.stock !== null && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                  product.stock === 0 ? 'bg-red-50 text-red-700 border border-red-100' :
                  product.stock < 5  ? 'bg-orange-50 text-orange-700 border border-orange-100' :
                  'bg-green-50 text-green-700 border border-green-100'
                }`}>
                  <Package className="w-4 h-4 shrink-0" />
                  {product.stock === 0
                    ? 'Товар отсутствует на складе'
                    : product.stock < 5
                    ? `Критически мало: ${product.stock} шт — требуется пополнение`
                    : `На складе: ${product.stock} шт`}
                </div>
              )}

              {/* Metrics grid */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">Показатели продаж</p>
                <div className="grid grid-cols-3 gap-2">
                  {metrics.map(m => {
                    const Icon = m.icon;
                    return (
                      <div key={m.label} className={`p-3 rounded-xl ${m.bg}`}>
                        <Icon className={`w-4 h-4 ${m.color} mb-1.5`} />
                        <p className={`text-base font-bold ${m.color}`}>{m.value}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{m.label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Product details table */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">Информация о товаре</p>
                <div className="bg-gray-50 rounded-xl border border-gray-100 divide-y divide-gray-100 overflow-hidden">
                  {[
                    { label: 'Артикул (SKU)',  value: product.sku },
                    { label: 'Категория',      value: product.category },
                    { label: 'Цена',           value: `₽${product.price.toLocaleString('ru-RU')}` },
                    { label: 'Маржинальность', value: product.margin !== null ? `${product.margin}%` : 'Не указана' },
                    { label: 'Конверсия',      value: `${product.conversion}% из просмотра в заказ` },
                  ].map(row => (
                    <div key={row.label} className="flex items-center px-4 py-2.5 gap-4">
                      <span className="text-xs text-gray-500 w-32 shrink-0">{row.label}</span>
                      <span className="text-sm font-medium text-gray-800">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-gray-50 shrink-0">
            <p className="text-xs text-gray-400">Нажмите <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-mono">Esc</kbd> для закрытия</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Закрыть
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
