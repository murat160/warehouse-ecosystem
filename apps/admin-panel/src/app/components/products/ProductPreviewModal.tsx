/**
 * ProductPreviewModal — reusable rich preview for a Product.
 * Used by ProductsList / OwnProducts / PopularProducts / RecommendedProducts /
 * ShowcasePage / SellerProductsTab / Promotions / Discounts.
 *
 * Sourced data:
 *  - photos / videos pulled from a media array passed in (or defaults to MEDIA).
 *  - merchant / category names resolved by helpers.
 *
 * All actions are optional callbacks. If a callback is not provided, the
 * corresponding button is hidden — this is also the hook for RBAC: the parent
 * decides which buttons to expose based on the current user's permissions.
 */
import { useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import { Link } from 'react-router-dom';
import {
  X, Image as ImageIcon, Video as VideoIcon, Upload, Download,
  Pencil as Edit2, Star, Crown, Sparkles, Megaphone, Tag, Layers,
  Pin, EyeOff, Ban, CheckCircle2, Archive, ExternalLink, Store, ShieldCheck,
} from 'lucide-react';
import {
  MEDIA, photosForProduct, videosForProduct, getCategoryName, fmtPrice,
  PRODUCT_STATUS_CFG, MEDIA_STATUS_CFG, COMPANY_MERCHANT_ID,
  type Product, type ProductMediaItem,
} from '../../data/products-mock';
import { MediaLightbox } from '../ui/MediaLightbox';

export interface ProductPreviewActions {
  onEdit?:           (p: Product) => void;
  onAddPhoto?:       (p: Product, file: File, dataUrl: string) => void;
  onAddVideo?:       (p: Product, file: File, dataUrl: string) => void;
  onDownloadMedia?:  (m: ProductMediaItem) => void;
  onActivate?:       (p: Product) => void;
  onBlock?:          (p: Product) => void;
  onArchive?:        (p: Product) => void;
  onPinPopular?:     (p: Product) => void;
  onHidePopular?:    (p: Product) => void;
  onAddToShowcase?:  (p: Product) => void;
  onRecommend?:      (p: Product) => void;
  onAddPromotion?:   (p: Product) => void;
  onAddDiscount?:    (p: Product) => void;
}

interface Props extends ProductPreviewActions {
  product: Product;
  media?: ProductMediaItem[];
  onClose: () => void;
}

function readDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result || ''));
    r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });
}

export function ProductPreviewModal({
  product, media, onClose,
  onEdit, onAddPhoto, onAddVideo, onDownloadMedia,
  onActivate, onBlock, onArchive,
  onPinPopular, onHidePopular, onAddToShowcase, onRecommend,
  onAddPromotion, onAddDiscount,
}: Props) {
  const allMedia = media ?? MEDIA;
  const photos = useMemo(() => photosForProduct(product.id, allMedia), [product.id, allMedia]);
  const videos = useMemo(() => videosForProduct(product.id, allMedia), [product.id, allMedia]);
  const [lightbox, setLightbox] = useState<{ items: ProductMediaItem[]; index: number } | null>(null);

  const sc = PRODUCT_STATUS_CFG[product.status];
  const isCompany = product.merchantId === COMPANY_MERCHANT_ID || product.ownerType === 'company';

  async function handleFile(kind: 'image' | 'video', file: File) {
    const dataUrl = await readDataUrl(file);
    if (kind === 'image' && onAddPhoto) onAddPhoto(product, file, dataUrl);
    if (kind === 'video' && onAddVideo) onAddVideo(product, file, dataUrl);
  }

  const node = (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/65 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start gap-3 px-6 py-4 border-b shrink-0">
          <div className="w-12 h-12 rounded-xl overflow-hidden border border-gray-200 shrink-0 bg-gray-100">
            {photos[0] ? (
              photos[0].url
                ? <img src={photos[0].url} alt="" className="w-full h-full object-cover" />
                : <div className={`w-full h-full ${photos[0].bg} flex items-center justify-center text-2xl`}>{photos[0].emoji}</div>
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                {product.name.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-gray-900 truncate">{product.name}</p>
              <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${sc.cls}`}>{sc.label}</span>
              {isCompany && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-amber-100 to-orange-100 border border-amber-300 text-amber-800 rounded-full text-[10px] font-bold">
                  <ShieldCheck className="w-3 h-3" />Наша фирма
                </span>
              )}
              {product.popularityMode === 'pinned' && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-[10px] font-bold">
                  <Pin className="w-3 h-3" />Закреплён
                </span>
              )}
              {product.popularityMode === 'hidden' && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full text-[10px] font-bold">
                  <EyeOff className="w-3 h-3" />Скрыт из популярных
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5 font-mono">{product.sku}</p>
            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
              <Store className="w-3 h-3" />{product.merchant}
              <span className="text-gray-300">·</span>
              <Layers className="w-3 h-3" />{getCategoryName(product.categoryId)}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg shrink-0"><X className="w-4 h-4 text-gray-500" /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Photos gallery */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4" />Фотографии
                <span className="text-xs text-gray-400 font-normal">· {photos.length} шт.</span>
              </p>
              {onAddPhoto && (
                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer">
                  <Upload className="w-3 h-3" />Добавить фото
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFile('image', f); e.target.value = ''; }} />
                </label>
              )}
            </div>
            {photos.length === 0 ? (
              <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl py-8 text-center">
                <ImageIcon className="w-8 h-8 text-gray-300 mx-auto mb-1" />
                <p className="text-xs text-gray-500">Нет фото</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {photos.map((m, i) => (
                  <button key={m.id} onClick={() => setLightbox({ items: photos, index: i })}
                    className="block w-full aspect-square rounded-lg overflow-hidden border border-gray-200 hover:border-blue-400 transition-all relative">
                    {m.url ? <img src={m.url} alt={m.filename} className="w-full h-full object-cover" />
                          : <div className={`w-full h-full ${m.bg} flex items-center justify-center text-2xl`}>{m.emoji}</div>}
                    <span className={`absolute top-0.5 left-0.5 px-1 py-0 rounded text-[8px] font-bold ${MEDIA_STATUS_CFG[m.status].cls}`}>{MEDIA_STATUS_CFG[m.status].label}</span>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Videos */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                <VideoIcon className="w-4 h-4" />Видео
                <span className="text-xs text-gray-400 font-normal">· {videos.length} шт.</span>
              </p>
              {onAddVideo && (
                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold cursor-pointer">
                  <Upload className="w-3 h-3" />Добавить видео
                  <input type="file" accept="video/mp4,video/webm" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFile('video', f); e.target.value = ''; }} />
                </label>
              )}
            </div>
            {videos.length === 0 ? (
              <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl py-8 text-center">
                <VideoIcon className="w-8 h-8 text-gray-300 mx-auto mb-1" />
                <p className="text-xs text-gray-500">Нет видео</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {videos.map((v, i) => (
                  <button key={v.id} onClick={() => setLightbox({ items: videos, index: i })}
                    className="block w-full aspect-video rounded-lg overflow-hidden border border-gray-200 hover:border-purple-400 transition-all relative bg-black">
                    {v.url
                      ? <video src={v.url} className="w-full h-full object-cover" muted preload="metadata" />
                      : <div className={`w-full h-full ${v.bg} flex items-center justify-center text-4xl`}>{v.emoji}</div>}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40">
                      <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center"><span className="text-purple-600 ml-0.5">▶</span></div>
                    </div>
                    <span className={`absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${MEDIA_STATUS_CFG[v.status].cls}`}>{MEDIA_STATUS_CFG[v.status].label}</span>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Info grid */}
          <section className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
            {[
              ['Цена',     fmtPrice(product.price)],
              ['Остаток',  `${product.stock} шт.`],
              ['Продано',  String(product.sales)],
              ['Выручка',  fmtPrice(product.revenue)],
              ['Рейтинг',  product.rating ? `★ ${product.rating}` : '—'],
              ['Фото',     String(product.photoCount)],
              ['Создан',   product.createdAt],
              ['Обновлён', product.updatedAt],
              ['ID',       product.id],
            ].map(([k, v]) => (
              <div key={k as string} className="flex justify-between border-b border-gray-50 pb-2 px-1">
                <span className="text-gray-500 text-xs">{k}</span>
                <span className="font-semibold text-gray-900 text-xs text-right truncate ml-2 max-w-[60%]">{v}</span>
              </div>
            ))}
          </section>

          {/* Boost audit (if any) */}
          {product.boostedBy && (
            <section className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm">
              <p className="text-xs font-bold text-amber-800 mb-1 flex items-center gap-1.5"><Crown className="w-3.5 h-3.5" />Управление витриной</p>
              <p className="text-xs text-amber-700">
                Закреплён <span className="font-semibold">{product.boostedBy}</span> ({product.boostedByRole}) · {product.boostedAt}
                {product.boostReason && <> · «{product.boostReason}»</>}
              </p>
            </section>
          )}
        </div>

        {/* Footer actions — buttons render only if their callback exists. */}
        <div className="border-t bg-gray-50 px-6 py-3 shrink-0">
          <div className="flex flex-wrap gap-2">
            {onEdit && (
              <button onClick={() => onEdit(product)} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold">
                <Edit2 className="w-3.5 h-3.5" />Редактировать
              </button>
            )}
            {onPinPopular && (
              <button onClick={() => onPinPopular(product)} className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-lg text-xs font-semibold">
                <Pin className="w-3.5 h-3.5" />{product.popularityMode === 'pinned' ? 'Открепить' : 'Закрепить в популярных'}
              </button>
            )}
            {onHidePopular && (
              <button onClick={() => onHidePopular(product)} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs font-semibold">
                <EyeOff className="w-3.5 h-3.5" />{product.popularityMode === 'hidden' ? 'Показать' : 'Скрыть из популярных'}
              </button>
            )}
            {onAddToShowcase && (
              <button onClick={() => onAddToShowcase(product)} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 hover:bg-orange-200 text-orange-800 rounded-lg text-xs font-semibold">
                <Crown className="w-3.5 h-3.5" />В первые ряды
              </button>
            )}
            {onRecommend && (
              <button onClick={() => onRecommend(product)} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-lg text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />В рекомендации
              </button>
            )}
            {onAddPromotion && (
              <button onClick={() => onAddPromotion(product)} className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-100 hover:bg-pink-200 text-pink-800 rounded-lg text-xs font-semibold">
                <Megaphone className="w-3.5 h-3.5" />В акцию
              </button>
            )}
            {onAddDiscount && (
              <button onClick={() => onAddDiscount(product)} className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg text-xs font-semibold">
                <Tag className="w-3.5 h-3.5" />В скидку
              </button>
            )}
            <div className="ml-auto flex flex-wrap gap-2">
              {onActivate && product.status !== 'active' && (
                <button onClick={() => onActivate(product)} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-800 rounded-lg text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />Активировать
                </button>
              )}
              {onBlock && product.status !== 'blocked' && (
                <button onClick={() => onBlock(product)} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-xs font-semibold">
                  <Ban className="w-3.5 h-3.5" />Заблокировать
                </button>
              )}
              {onArchive && product.status !== 'archived' && (
                <button onClick={() => onArchive(product)} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold">
                  <Archive className="w-3.5 h-3.5" />В архив
                </button>
              )}
              <Link to={`/merchants/${product.merchantId}`} onClick={onClose}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold">
                <ExternalLink className="w-3.5 h-3.5" />Продавец
              </Link>
              <Link to={`/products/media?product=${product.id}`} onClick={onClose}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold">
                <ImageIcon className="w-3.5 h-3.5" />Медиа
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <MediaLightbox
          items={lightbox.items}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
          onDownload={onDownloadMedia}
        />
      )}
    </div>
  );

  return ReactDOM.createPortal(node, document.body);
}
