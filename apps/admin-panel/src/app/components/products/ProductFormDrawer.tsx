/**
 * ProductFormDrawer — professional drawer for creating / editing a Product.
 *
 * Tabs: Основное · Фото · Видео · Цена · Склад · Характеристики · Доставка ·
 *       Статус · Продвижение.
 *
 * The drawer is "controlled" via `value` / `onChange` (the parent owns the
 * draft). On submit it calls `onSubmit(payload, action)` where action tells
 * which submit button was pressed: 'draft' | 'moderation' | 'active' |
 * 'active+showcase'.
 *
 * Photos / videos are produced into ProductMediaItem objects so the parent
 * can append them to the global MEDIA array.
 */
import { useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import {
  X, Image as ImageIcon, Video as VideoIcon, Upload, Trash2,
  Star, AlertCircle, Plus, Eye, Sparkles, Package, Tag, Truck,
  Warehouse, ListTree, Megaphone, ShieldCheck, BadgeCheck,
  FileText, Layers, Crown,
} from 'lucide-react';
import {
  CATEGORIES, COMPANY_MERCHANT_ID, AVAILABILITY_LABELS, RECOMMENDATION_POSITIONS,
  type Product, type ProductMediaItem, type ProductAttribute,
  type ProductAvailability, type ProductShipping, type RecommendationPosition,
} from '../../data/products-mock';
import { MediaLightbox } from '../ui/MediaLightbox';
import { ProductPreviewModal } from './ProductPreviewModal';

export type SubmitAction = 'draft' | 'moderation' | 'active' | 'active+showcase';

export interface ProductFormPayload {
  product: Product;
  newMedia: ProductMediaItem[];     // photos + videos that need to be appended to MEDIA
  promotion: {
    addToPopular:     boolean;
    addToRecommended: boolean;
    addToShowcase:    boolean;
    position:         RecommendationPosition;
    priority:         number;
    startDate:        string;
    endDate:          string;
  };
}

interface Props {
  open: boolean;
  initialProduct?: Partial<Product>;
  onClose: () => void;
  onSubmit: (payload: ProductFormPayload, action: SubmitAction) => void;
}

type Tab =
  | 'main' | 'photos' | 'videos' | 'price' | 'stock'
  | 'specs' | 'shipping' | 'status' | 'promo';

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: 'main',     label: 'Основное',         icon: Package    },
  { id: 'photos',   label: 'Фото',             icon: ImageIcon  },
  { id: 'videos',   label: 'Видео',            icon: VideoIcon  },
  { id: 'price',    label: 'Цена',             icon: Tag        },
  { id: 'stock',    label: 'Склад',            icon: Warehouse  },
  { id: 'specs',    label: 'Характеристики',   icon: ListTree   },
  { id: 'shipping', label: 'Доставка',         icon: Truck      },
  { id: 'status',   label: 'Статус',           icon: ShieldCheck},
  { id: 'promo',    label: 'Продвижение',      icon: Megaphone  },
];

const PRODUCT_TYPES = ['Физический', 'Цифровой', 'Услуга', 'Комплект', 'Расходник'] as const;
const CURRENCIES    = ['₽ RUB', '₸ KZT', '$ USD', '€ EUR'] as const;

interface DraftMedia {
  id:        string;
  filename:  string;
  sizeLabel: string;
  url:       string;
  mimeType:  string;
  /** image / video */
  kind:      'image' | 'video';
}

function readDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result || ''));
    r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });
}

function fmtSize(bytes: number): string {
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} КБ`;
  return `${(kb / 1024).toFixed(1)} МБ`;
}

function nowStr(): string {
  return new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function todayStr(): string {
  return new Date().toLocaleDateString('ru-RU');
}

// ─── Small helpers ───────────────────────────────────────────────────────────

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1">
      <AlertCircle className="w-3 h-3" />{msg}
    </p>
  );
}

function inputCls(hasErr: boolean) {
  return `w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 ${hasErr ? 'border-red-300 focus:ring-red-400 bg-red-50/30' : 'border-gray-200 focus:ring-amber-500'}`;
}

// ─── Main ────────────────────────────────────────────────────────────────────

export function ProductFormDrawer({ open, initialProduct, onClose, onSubmit }: Props) {
  const [tab, setTab] = useState<Tab>('main');

  // ── Form state ──
  const [name, setName]                 = useState(initialProduct?.name ?? '');
  const [sku, setSku]                   = useState(initialProduct?.sku ?? '');
  const [barcode, setBarcode]           = useState(initialProduct?.barcode ?? '');
  const [brand, setBrand]               = useState(initialProduct?.brand ?? 'PVZ Platform');
  const [categoryId, setCategoryId]     = useState(initialProduct?.categoryId ?? 'cat-bags');
  const [subcategoryId, setSubcategory] = useState(initialProduct?.subcategoryId ?? '');
  const [productType, setProductType]   = useState(initialProduct?.productType ?? 'Физический');
  const [shortDesc, setShortDesc]       = useState(initialProduct?.shortDescription ?? '');
  const [description, setDescription]   = useState(initialProduct?.description ?? '');
  const [tagsStr, setTagsStr]           = useState((initialProduct?.tags ?? []).join(', '));

  // photos
  const [photos, setPhotos]             = useState<DraftMedia[]>([]);
  const [mainPhotoId, setMainPhotoId]   = useState<string | undefined>(undefined);
  const [lightbox, setLightbox]         = useState<{ items: ProductMediaItem[]; index: number } | null>(null);

  // videos
  const [videos, setVideos]             = useState<DraftMedia[]>([]);

  // pricing
  const [price, setPrice]               = useState(initialProduct?.price?.toString() ?? '');
  const [oldPrice, setOldPrice]         = useState(initialProduct?.oldPrice?.toString() ?? '');
  const [costPrice, setCostPrice]       = useState(initialProduct?.costPrice?.toString() ?? '');
  const [currency, setCurrency]         = useState(initialProduct?.currency ?? '₽ RUB');
  const [discountPercent, setDiscountPercent] = useState(initialProduct?.discount?.percent?.toString() ?? '');
  const [discountStart, setDiscountStart] = useState(initialProduct?.discount?.startDate ?? '');
  const [discountEnd, setDiscountEnd]   = useState(initialProduct?.discount?.endDate ?? '');

  // stock
  const [stock, setStock]               = useState(initialProduct?.stock?.toString() ?? '');
  const [minStock, setMinStock]         = useState(initialProduct?.minStock?.toString() ?? '10');
  const [warehouseId, setWarehouseId]   = useState(initialProduct?.warehouseId ?? 'wh-msk-01');
  const [cellLocation, setCellLocation] = useState(initialProduct?.cellLocation ?? '');
  const [availability, setAvailability] = useState<ProductAvailability>(initialProduct?.availability ?? 'in_stock');

  // specs
  const [weight, setWeight]             = useState(initialProduct?.weight?.toString() ?? '');
  const [dimL, setDimL]                 = useState(initialProduct?.dimensions?.length?.toString() ?? '');
  const [dimW, setDimW]                 = useState(initialProduct?.dimensions?.width?.toString()  ?? '');
  const [dimH, setDimH]                 = useState(initialProduct?.dimensions?.height?.toString() ?? '');
  const [color, setColor]               = useState(initialProduct?.color ?? '');
  const [material, setMaterial]         = useState(initialProduct?.material ?? '');
  const [size, setSize]                 = useState(initialProduct?.size ?? '');
  const [country, setCountry]           = useState(initialProduct?.country ?? 'Россия');
  const [warranty, setWarranty]         = useState(initialProduct?.warranty ?? '');
  const [attrs, setAttrs]               = useState<ProductAttribute[]>(initialProduct?.customAttributes ?? []);

  // shipping
  const [shipping, setShipping]         = useState<ProductShipping>(initialProduct?.shipping ?? {
    delivery: true, pvz: true, pickup: true, fragile: false, needsPackaging: true, ageLimit: 0,
  });

  // status / visibility
  const [statusChoice, setStatusChoice] = useState<'draft' | 'moderation'>('moderation');
  const [visible, setVisible]           = useState<boolean>(initialProduct?.visibleToCustomers ?? true);

  // promotion
  const [addToPopular,     setAddToPopular]     = useState(false);
  const [addToRecommended, setAddToRecommended] = useState(false);
  const [addToShowcase,    setAddToShowcase]    = useState(false);
  const [promoPriority,    setPromoPriority]    = useState('1');
  const [promoPosition,    setPromoPosition]    = useState<RecommendationPosition>('home');
  const [promoStart,       setPromoStart]       = useState(todayStr());
  const [promoEnd,         setPromoEnd]         = useState('');

  // preview
  const [showPreview, setShowPreview] = useState(false);

  // ── Derived ──
  const margin = useMemo(() => {
    const p = parseFloat(price);
    const c = parseFloat(costPrice);
    if (!Number.isFinite(p) || !Number.isFinite(c) || c <= 0) return null;
    return Math.round(((p - c) / p) * 100);
  }, [price, costPrice]);

  const photoFileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  // ── Validation ──
  const errors: Partial<Record<'name' | 'sku' | 'categoryId' | 'price' | 'stock', string>> = {};
  if (!name.trim()) errors.name = 'Введите название товара';
  if (!sku.trim())  errors.sku  = 'Укажите SKU';
  if (!categoryId)  errors.categoryId = 'Выберите категорию';
  const priceNum = parseFloat(price);
  if (!price.trim() || !Number.isFinite(priceNum) || priceNum < 0) errors.price = 'Некорректная цена';
  const stockNum = parseInt(stock, 10);
  if (!stock.trim() || !Number.isFinite(stockNum) || stockNum < 0) errors.stock = 'Некорректный остаток';

  const hasErrors = Object.keys(errors).length > 0;
  const photoWarning = photos.length === 0; // Just a warning, not blocking

  // ── Photo / video uploaders ──
  async function handlePhotoUpload(files: FileList) {
    const items: DraftMedia[] = [];
    for (const f of Array.from(files)) {
      if (!/^image\/(png|jpe?g|webp)$/i.test(f.type)) continue;
      if (f.size > 10 * 1024 * 1024) continue;
      const url = await readDataUrl(f);
      const id = `med-new-${Date.now()}-${items.length}`;
      items.push({ id, filename: f.name, sizeLabel: fmtSize(f.size), url, mimeType: f.type, kind: 'image' });
    }
    if (items.length) {
      setPhotos(prev => {
        const next = [...prev, ...items];
        if (!mainPhotoId && next[0]) setMainPhotoId(next[0].id);
        return next;
      });
    }
  }

  async function handleVideoUpload(files: FileList) {
    const items: DraftMedia[] = [];
    for (const f of Array.from(files)) {
      if (!/^video\/(mp4|webm)$/i.test(f.type)) continue;
      if (f.size > 50 * 1024 * 1024) continue;
      const url = await readDataUrl(f);
      const id = `vid-new-${Date.now()}-${items.length}`;
      items.push({ id, filename: f.name, sizeLabel: fmtSize(f.size), url, mimeType: f.type, kind: 'video' });
    }
    if (items.length) setVideos(prev => [...prev, ...items]);
  }

  function removePhoto(id: string) {
    setPhotos(prev => {
      const next = prev.filter(p => p.id !== id);
      if (mainPhotoId === id) setMainPhotoId(next[0]?.id);
      return next;
    });
  }

  function removeVideo(id: string) {
    setVideos(prev => prev.filter(v => v.id !== id));
  }

  // ── Build draft Product (used by Preview + onSubmit) ──
  function buildPayload(action: SubmitAction): ProductFormPayload {
    const productId = initialProduct?.id ?? `p-c${Date.now()}`;
    const now = nowStr();
    const finalStatus =
      action === 'draft'        ? 'draft'      :
      action === 'moderation'   ? 'moderation' :
      'active'; // active or active+showcase

    const newMedia: ProductMediaItem[] = [
      ...photos.map(ph => ({
        id: ph.id, productId, productName: name,
        url: ph.url, bg: 'bg-gray-100', emoji: '🖼',
        filename: ph.filename, sizeLabel: ph.sizeLabel,
        status: finalStatus === 'active' ? ('approved' as const) : ('pending' as const),
        uploadedAt: now, uploader: 'Супер Админ',
        mediaType: 'image' as const,
      })),
      ...videos.map(vd => ({
        id: vd.id, productId, productName: name,
        url: vd.url, bg: 'bg-gray-100', emoji: '🎬',
        filename: vd.filename, sizeLabel: vd.sizeLabel,
        status: finalStatus === 'active' ? ('approved' as const) : ('pending' as const),
        uploadedAt: now, uploader: 'Супер Админ',
        mediaType: 'video' as const,
        videoMimeType: vd.mimeType,
      })),
    ];

    const product: Product = {
      id: productId,
      sku: sku.trim(),
      name: name.trim(),
      categoryId,
      merchant: 'PVZ Platform',
      merchantId: COMPANY_MERCHANT_ID,
      ownerType: 'company',
      status: finalStatus,
      price: Number.isFinite(priceNum) ? priceNum : 0,
      stock: Number.isFinite(stockNum) ? stockNum : 0,
      photoCount: photos.length,
      rating: initialProduct?.rating ?? 0,
      sales:  initialProduct?.sales  ?? 0,
      revenue: 0,
      createdAt: initialProduct?.createdAt ?? now,
      updatedAt: now,
      visibleToCustomers: visible,
      // extended
      barcode: barcode.trim() || undefined,
      brand:   brand.trim()   || undefined,
      subcategoryId: subcategoryId || undefined,
      productType,
      shortDescription: shortDesc.trim() || undefined,
      description:      description.trim() || undefined,
      tags: tagsStr.split(',').map(t => t.trim()).filter(Boolean),
      mainPhotoId,
      oldPrice:  oldPrice  ? parseFloat(oldPrice)  : undefined,
      costPrice: costPrice ? parseFloat(costPrice) : undefined,
      currency,
      discount: discountPercent ? {
        percent: parseFloat(discountPercent) || 0,
        startDate: discountStart || undefined,
        endDate:   discountEnd   || undefined,
      } : undefined,
      minStock: minStock ? parseInt(minStock, 10) : undefined,
      warehouseId, cellLocation: cellLocation.trim() || undefined,
      availability,
      weight: weight ? parseFloat(weight) : undefined,
      dimensions: (dimL || dimW || dimH) ? {
        length: dimL ? parseFloat(dimL) : undefined,
        width:  dimW ? parseFloat(dimW) : undefined,
        height: dimH ? parseFloat(dimH) : undefined,
      } : undefined,
      color: color.trim() || undefined,
      material: material.trim() || undefined,
      size: size.trim() || undefined,
      country: country.trim() || undefined,
      warranty: warranty.trim() || undefined,
      customAttributes: attrs.length ? attrs : undefined,
      shipping,
      audit: [{
        at: now, actor: 'Супер Админ', role: 'SuperAdmin',
        action: action === 'draft' ? 'Создан как черновик' :
                action === 'moderation' ? 'Создан и отправлен на модерацию' :
                action === 'active' ? 'Создан и активирован' :
                'Создан и добавлен в первые ряды',
      }],
      popularityMode: addToPopular ? 'pinned' : 'auto',
      boostedBy:     addToPopular ? 'Супер Админ' : undefined,
      boostedByRole: addToPopular ? 'SuperAdmin'  : undefined,
      boostedAt:     addToPopular ? now           : undefined,
      boostReason:   addToPopular ? 'Закреплён при создании' : undefined,
    };

    return {
      product, newMedia,
      promotion: {
        addToPopular, addToRecommended,
        addToShowcase: addToShowcase || action === 'active+showcase',
        position: promoPosition,
        priority: parseInt(promoPriority, 10) || 1,
        startDate: promoStart, endDate: promoEnd,
      },
    };
  }

  function trySubmit(action: SubmitAction) {
    if (action !== 'draft' && hasErrors) {
      // Move to first tab containing an error
      if (errors.name || errors.sku || errors.categoryId) setTab('main');
      else if (errors.price) setTab('price');
      else if (errors.stock) setTab('stock');
      return;
    }
    const payload = buildPayload(action);
    onSubmit(payload, action);
  }

  if (!open) return null;

  // Photo media items adapted for ProductPreviewModal / lightbox
  const previewMedia: ProductMediaItem[] = [
    ...photos.map(ph => ({
      id: ph.id, productId: 'preview', productName: name || 'Без названия',
      url: ph.url, bg: 'bg-gray-100', emoji: '🖼',
      filename: ph.filename, sizeLabel: ph.sizeLabel, status: 'pending' as const,
      uploadedAt: nowStr(), uploader: 'Супер Админ', mediaType: 'image' as const,
    })),
    ...videos.map(vd => ({
      id: vd.id, productId: 'preview', productName: name || 'Без названия',
      url: vd.url, bg: 'bg-gray-100', emoji: '🎬',
      filename: vd.filename, sizeLabel: vd.sizeLabel, status: 'pending' as const,
      uploadedAt: nowStr(), uploader: 'Супер Админ', mediaType: 'video' as const, videoMimeType: vd.mimeType,
    })),
  ];

  const previewProduct: Product = {
    ...buildPayload('moderation').product,
    id: 'preview',
  };

  // ─── Render ──────────────────────────────────────────────────────────────
  const node = (
    <div className="fixed inset-0 z-[200] flex items-stretch justify-end bg-gray-900/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white shadow-2xl w-full max-w-3xl flex flex-col h-full animate-in slide-in-from-right duration-200" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b shrink-0 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 truncate">{initialProduct?.id ? 'Редактирование товара фирмы' : 'Новый товар фирмы'}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">PVZ Platform · ownerType=company · Полная карточка товара</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg" title="Закрыть">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b bg-gray-50/70 shrink-0 overflow-x-auto">
          <div className="flex">
            {TABS.map(t => {
              const Icon = t.icon;
              const isActive = t.id === tab;
              const hasErr =
                (t.id === 'main'  && (errors.name || errors.sku || errors.categoryId)) ||
                (t.id === 'price' && errors.price) ||
                (t.id === 'stock' && errors.stock);
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`shrink-0 flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors relative ${isActive ? 'border-amber-500 text-amber-700 bg-white' : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-white/60'}`}>
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                  {hasErr && <span className="w-1.5 h-1.5 rounded-full bg-red-500 ml-0.5" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* ─── MAIN ─── */}
          {tab === 'main' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Название товара *</label>
                  <input value={name} onChange={e => setName(e.target.value)} autoFocus
                    placeholder="PVZ Platform · Брендированный картон XL"
                    className={inputCls(!!errors.name)} />
                  <FieldError msg={errors.name} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">SKU *</label>
                  <input value={sku} onChange={e => setSku(e.target.value)}
                    placeholder="PVZ-MERCH-006"
                    className={inputCls(!!errors.sku) + ' font-mono'} />
                  <FieldError msg={errors.sku} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Штрихкод (barcode)</label>
                  <input value={barcode} onChange={e => setBarcode(e.target.value)}
                    placeholder="4607034780012"
                    className={inputCls(false) + ' font-mono'} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Бренд</label>
                  <input value={brand} onChange={e => setBrand(e.target.value)}
                    className={inputCls(false)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Тип товара</label>
                  <select value={productType} onChange={e => setProductType(e.target.value)}
                    className={inputCls(false) + ' bg-white'}>
                    {PRODUCT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Категория *</label>
                  <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
                    className={inputCls(!!errors.categoryId) + ' bg-white'}>
                    {CATEGORIES.filter(c => c.parentId).map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </select>
                  <FieldError msg={errors.categoryId} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Подкатегория</label>
                  <input value={subcategoryId} onChange={e => setSubcategory(e.target.value)}
                    placeholder="Опционально"
                    className={inputCls(false)} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Краткое описание</label>
                <input value={shortDesc} onChange={e => setShortDesc(e.target.value)}
                  placeholder="2-3 строки, видимы в карточке списка"
                  className={inputCls(false)} maxLength={200} />
                <p className="text-[10px] text-gray-400 mt-1">{shortDesc.length}/200</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Полное описание</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={6}
                  placeholder="Подробное описание товара. Ключевые особенности, состав, применение..."
                  className={inputCls(false) + ' resize-none'} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Теги (через запятую)</label>
                <input value={tagsStr} onChange={e => setTagsStr(e.target.value)}
                  placeholder="новинка, эко, премиум, для офиса"
                  className={inputCls(false)} />
                {tagsStr && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {tagsStr.split(',').map(t => t.trim()).filter(Boolean).map((t, i) => (
                      <span key={i} className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-full text-[10px]">#{t}</span>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ─── PHOTOS ─── */}
          {tab === 'photos' && (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4" />Фотографии товара
                    <span className="text-xs text-gray-400 font-normal">· {photos.length} шт.</span>
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">PNG / JPG / WebP, до 10 МБ. Кликните по фото — выбрать главное; Lightbox — ещё раз.</p>
                </div>
                <label className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold cursor-pointer shrink-0">
                  <Upload className="w-3.5 h-3.5" />Добавить фото
                  <input ref={photoFileInputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden"
                    onChange={e => { if (e.target.files) handlePhotoUpload(e.target.files); e.target.value = ''; }} />
                </label>
              </div>
              {photoWarning && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>Товар можно создать без фото, но он будет помечен «Без фото» и не попадёт в популярные / рекомендации без главной фотографии.</p>
                </div>
              )}
              {photos.length === 0 ? (
                <label className="block bg-gray-50 border-2 border-dashed border-gray-200 hover:border-amber-300 hover:bg-amber-50/30 rounded-xl py-12 text-center cursor-pointer transition-colors">
                  <ImageIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Нет фото · Кликните, чтобы загрузить</p>
                  <p className="text-[10px] text-gray-400 mt-1">или перетащите файлы</p>
                  <input type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden"
                    onChange={e => { if (e.target.files) handlePhotoUpload(e.target.files); e.target.value = ''; }} />
                </label>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {photos.map((ph, idx) => {
                    const isMain = mainPhotoId === ph.id;
                    return (
                      <div key={ph.id} className={`relative rounded-xl overflow-hidden border-2 group ${isMain ? 'border-amber-500 ring-2 ring-amber-200' : 'border-gray-200'}`}>
                        <button onClick={() => {
                          // Single click → set as main; double click handled via second button
                          setMainPhotoId(ph.id);
                        }} className="block w-full aspect-square bg-gray-100">
                          <img src={ph.url} alt={ph.filename} className="w-full h-full object-cover" />
                        </button>
                        {isMain && (
                          <span className="absolute top-1 left-1 flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-500 text-white rounded text-[9px] font-bold">
                            <Star className="w-2.5 h-2.5" />Главное
                          </span>
                        )}
                        <div className="absolute bottom-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setLightbox({ items: previewMedia.filter(m => m.mediaType === 'image'), index: photos.findIndex(p => p.id === ph.id) })}
                            className="p-1 bg-white/90 hover:bg-white rounded text-gray-600" title="Открыть">
                            <Eye className="w-3 h-3" />
                          </button>
                          <button onClick={() => removePhoto(ph.id)}
                            className="p-1 bg-red-500 hover:bg-red-600 text-white rounded" title="Удалить">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="px-1.5 py-1 bg-white border-t text-[9px] text-gray-600 truncate">{ph.filename}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ─── VIDEOS ─── */}
          {tab === 'videos' && (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                    <VideoIcon className="w-4 h-4" />Видео товара
                    <span className="text-xs text-gray-400 font-normal">· {videos.length} шт.</span>
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">MP4 / WebM, до 50 МБ. Превью с проигрывателем.</p>
                </div>
                <label className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold cursor-pointer shrink-0">
                  <Upload className="w-3.5 h-3.5" />Добавить видео
                  <input ref={videoFileInputRef} type="file" accept="video/mp4,video/webm" multiple className="hidden"
                    onChange={e => { if (e.target.files) handleVideoUpload(e.target.files); e.target.value = ''; }} />
                </label>
              </div>
              {videos.length === 0 ? (
                <label className="block bg-gray-50 border-2 border-dashed border-gray-200 hover:border-purple-300 hover:bg-purple-50/30 rounded-xl py-12 text-center cursor-pointer transition-colors">
                  <VideoIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Видео не добавлено · Кликните, чтобы загрузить</p>
                  <p className="text-[10px] text-gray-400 mt-1">MP4 или WebM, до 50 МБ</p>
                  <input type="file" accept="video/mp4,video/webm" multiple className="hidden"
                    onChange={e => { if (e.target.files) handleVideoUpload(e.target.files); e.target.value = ''; }} />
                </label>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {videos.map(vd => (
                    <div key={vd.id} className="rounded-xl overflow-hidden border-2 border-gray-200 bg-black relative group">
                      <video src={vd.url} controls className="w-full aspect-video bg-black" preload="metadata" />
                      <div className="px-2 py-1.5 bg-white border-t flex items-center gap-2">
                        <p className="flex-1 text-[10px] text-gray-700 font-mono truncate">{vd.filename}</p>
                        <span className="text-[10px] text-gray-400">{vd.sizeLabel}</span>
                        <button onClick={() => removeVideo(vd.id)} className="p-1 hover:bg-red-50 text-red-600 rounded" title="Удалить">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ─── PRICE ─── */}
          {tab === 'price' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Цена *</label>
                  <input type="number" min="0" value={price} onChange={e => setPrice(e.target.value)}
                    placeholder="990" className={inputCls(!!errors.price)} />
                  <FieldError msg={errors.price} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Старая цена</label>
                  <input type="number" min="0" value={oldPrice} onChange={e => setOldPrice(e.target.value)}
                    placeholder="1490" className={inputCls(false)} />
                  <p className="text-[10px] text-gray-400 mt-1">Зачёркивается в карточке</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Себестоимость</label>
                  <input type="number" min="0" value={costPrice} onChange={e => setCostPrice(e.target.value)}
                    placeholder="450" className={inputCls(false)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Валюта</label>
                  <select value={currency} onChange={e => setCurrency(e.target.value)}
                    className={inputCls(false) + ' bg-white'}>
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2 flex items-end">
                  {margin !== null && (
                    <div className="w-full px-3 py-2 bg-green-50 border border-green-200 rounded-xl">
                      <p className="text-[10px] text-green-600 font-semibold">МАРЖА (расчётно)</p>
                      <p className="text-lg font-bold text-green-700">{margin}%</p>
                    </div>
                  )}
                  {margin === null && (
                    <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-500">
                      Маржа считается, если указаны цена и себестоимость
                    </div>
                  )}
                </div>
              </div>
              <div className="border-t border-dashed pt-5 mt-2">
                <p className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-rose-500" />Скидка
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Скидка, %</label>
                    <input type="number" min="0" max="99" value={discountPercent} onChange={e => setDiscountPercent(e.target.value)}
                      placeholder="0" className={inputCls(false)} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">С даты</label>
                    <input value={discountStart} onChange={e => setDiscountStart(e.target.value)}
                      placeholder="дд.мм.гггг" className={inputCls(false)} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">По дату</label>
                    <input value={discountEnd} onChange={e => setDiscountEnd(e.target.value)}
                      placeholder="дд.мм.гггг" className={inputCls(false)} />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ─── STOCK ─── */}
          {tab === 'stock' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Остаток *</label>
                  <input type="number" min="0" value={stock} onChange={e => setStock(e.target.value)}
                    placeholder="100" className={inputCls(!!errors.stock)} />
                  <FieldError msg={errors.stock} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Минимальный остаток</label>
                  <input type="number" min="0" value={minStock} onChange={e => setMinStock(e.target.value)}
                    placeholder="10" className={inputCls(false)} />
                  <p className="text-[10px] text-gray-400 mt-1">Бейдж «Низкий остаток» появится автоматически</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Склад</label>
                  <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)}
                    className={inputCls(false) + ' bg-white'}>
                    <option value="wh-msk-01">Москва · Главный (МСК-01)</option>
                    <option value="wh-msk-02">Москва · Юг (МСК-02)</option>
                    <option value="wh-spb-01">Санкт-Петербург · СПБ-01</option>
                    <option value="wh-ekb-01">Екатеринбург · ЕКБ-01</option>
                    <option value="wh-aty-01">Алматы · ATY-01</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Ячейка склада</label>
                  <input value={cellLocation} onChange={e => setCellLocation(e.target.value)}
                    placeholder="A-12-03" className={inputCls(false) + ' font-mono'} />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">Статус наличия</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(Object.keys(AVAILABILITY_LABELS) as ProductAvailability[]).map(av => {
                    const cfg = AVAILABILITY_LABELS[av];
                    const isActive = availability === av;
                    return (
                      <button key={av} onClick={() => setAvailability(av)}
                        className={`p-2.5 rounded-xl border text-xs font-medium transition-all ${isActive ? `${cfg.cls} border-current ring-2 ring-current/30` : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
                {parseInt(stock, 10) > 0 && parseInt(minStock, 10) > 0 && parseInt(stock, 10) < parseInt(minStock, 10) && (
                  <p className="mt-2 text-[11px] text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-2 py-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Остаток меньше минимального — товар будет помечен «Низкий остаток»
                  </p>
                )}
              </div>
            </>
          )}

          {/* ─── SPECS ─── */}
          {tab === 'specs' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Вес (г)</label>
                  <input type="number" min="0" value={weight} onChange={e => setWeight(e.target.value)}
                    placeholder="500" className={inputCls(false)} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Длина (см)</label>
                    <input type="number" min="0" value={dimL} onChange={e => setDimL(e.target.value)} className={inputCls(false)} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Ширина</label>
                    <input type="number" min="0" value={dimW} onChange={e => setDimW(e.target.value)} className={inputCls(false)} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Высота</label>
                    <input type="number" min="0" value={dimH} onChange={e => setDimH(e.target.value)} className={inputCls(false)} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Цвет</label>
                  <input value={color} onChange={e => setColor(e.target.value)} placeholder="Чёрный" className={inputCls(false)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Материал</label>
                  <input value={material} onChange={e => setMaterial(e.target.value)} placeholder="Картон / хлопок / металл" className={inputCls(false)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Размер</label>
                  <input value={size} onChange={e => setSize(e.target.value)} placeholder="M / 42 / 30 см" className={inputCls(false)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Страна производства</label>
                  <input value={country} onChange={e => setCountry(e.target.value)} className={inputCls(false)} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Гарантия</label>
                  <input value={warranty} onChange={e => setWarranty(e.target.value)} placeholder="12 месяцев" className={inputCls(false)} />
                </div>
              </div>
              <div className="border-t border-dashed pt-5 mt-2">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-blue-500" />Дополнительные характеристики
                  </p>
                  <button onClick={() => setAttrs(a => [...a, { key: '', value: '' }])}
                    className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold">
                    <Plus className="w-3 h-3" />Добавить характеристику
                  </button>
                </div>
                {attrs.length === 0 ? (
                  <p className="text-[11px] text-gray-400 italic">Нажмите «Добавить характеристику», чтобы создать пары ключ-значение (например, «Объём памяти» — «256 ГБ»).</p>
                ) : (
                  <div className="space-y-2">
                    {attrs.map((a, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input value={a.key} onChange={e => setAttrs(prev => prev.map((x, j) => j === i ? { ...x, key: e.target.value } : x))}
                          placeholder="Название" className={inputCls(false) + ' flex-1'} />
                        <input value={a.value} onChange={e => setAttrs(prev => prev.map((x, j) => j === i ? { ...x, value: e.target.value } : x))}
                          placeholder="Значение" className={inputCls(false) + ' flex-1'} />
                        <button onClick={() => setAttrs(prev => prev.filter((_, j) => j !== i))}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg shrink-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ─── SHIPPING ─── */}
          {tab === 'shipping' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: 'delivery'      as const, label: 'Доступен для доставки', desc: 'Курьер привезёт по адресу' },
                  { key: 'pvz'           as const, label: 'Доступен для ПВЗ',     desc: 'Самовывоз из пункта выдачи' },
                  { key: 'pickup'        as const, label: 'Доступен для самовывоза', desc: 'Из магазина / склада' },
                  { key: 'fragile'       as const, label: 'Хрупкий товар',        desc: 'Стикер «Хрупкое» при упаковке' },
                  { key: 'needsPackaging'as const, label: 'Требует упаковки',     desc: 'Дополнительная защитная упаковка' },
                ].map(opt => {
                  const checked = !!(shipping as any)[opt.key];
                  return (
                    <button key={opt.key} type="button"
                      onClick={() => setShipping(s => ({ ...s, [opt.key]: !checked }))}
                      className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-colors ${checked ? 'bg-amber-50 border-amber-300' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 ${checked ? 'bg-amber-500 border-amber-500' : 'border-gray-300'}`}>
                        {checked && <BadgeCheck className="w-3 h-3 text-white" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800">{opt.label}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">{opt.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Возрастное ограничение, лет</label>
                <input type="number" min="0" max="21" value={shipping.ageLimit ?? 0}
                  onChange={e => setShipping(s => ({ ...s, ageLimit: parseInt(e.target.value, 10) || 0 }))}
                  placeholder="0 — без ограничений"
                  className={inputCls(false) + ' max-w-xs'} />
                <p className="text-[10px] text-gray-400 mt-1">Например, 18 для алкоголя, 16 для энергетиков</p>
              </div>
            </>
          )}

          {/* ─── STATUS ─── */}
          {tab === 'status' && (
            <>
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">Стартовый статус при создании</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button onClick={() => setStatusChoice('draft')}
                    className={`p-3 rounded-xl border text-left transition-all ${statusChoice === 'draft' ? 'bg-slate-50 border-slate-400 ring-2 ring-slate-300' : 'bg-white border-gray-200'}`}>
                    <p className="text-sm font-bold text-gray-800 flex items-center gap-1.5"><FileText className="w-4 h-4 text-slate-500" />Черновик</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Не виден покупателям, можно дорабатывать</p>
                  </button>
                  <button onClick={() => setStatusChoice('moderation')}
                    className={`p-3 rounded-xl border text-left transition-all ${statusChoice === 'moderation' ? 'bg-yellow-50 border-yellow-400 ring-2 ring-yellow-200' : 'bg-white border-gray-200'}`}>
                    <p className="text-sm font-bold text-gray-800 flex items-center gap-1.5"><BadgeCheck className="w-4 h-4 text-yellow-600" />На модерацию</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Будет проверен модератором перед публикацией</p>
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 mt-2">
                  Кнопки <span className="font-semibold">«Создать»</span>, <span className="font-semibold">«Создать и активировать»</span>, <span className="font-semibold">«Создать и в витрину»</span> внизу формы переопределяют этот выбор.
                </p>
              </div>
              <div className="border-t border-dashed pt-4 mt-2">
                <p className="text-xs font-semibold text-gray-600 mb-2">Видимость для покупателей</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setVisible(true)}
                    className={`p-3 rounded-xl border text-left transition-all ${visible ? 'bg-green-50 border-green-400 ring-2 ring-green-200' : 'bg-white border-gray-200'}`}>
                    <p className="text-sm font-bold text-gray-800 flex items-center gap-1.5"><Eye className="w-4 h-4 text-green-600" />Показывать</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Виден после активации</p>
                  </button>
                  <button onClick={() => setVisible(false)}
                    className={`p-3 rounded-xl border text-left transition-all ${!visible ? 'bg-gray-100 border-gray-400 ring-2 ring-gray-200' : 'bg-white border-gray-200'}`}>
                    <p className="text-sm font-bold text-gray-800 flex items-center gap-1.5"><X className="w-4 h-4 text-gray-600" />Скрыть</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Только для администратора</p>
                  </button>
                </div>
              </div>
              <div className="border-t border-dashed pt-4 mt-2 space-y-1 text-[11px] text-gray-600 bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p><span className="font-semibold">ownerType:</span> <span className="font-mono">company</span> (товар нашей фирмы)</p>
                <p><span className="font-semibold">merchantId:</span> <span className="font-mono">{COMPANY_MERCHANT_ID}</span> (PVZ Platform)</p>
                <p><span className="font-semibold">brand:</span> <span className="font-mono">{brand || '—'}</span></p>
              </div>
            </>
          )}

          {/* ─── PROMO ─── */}
          {tab === 'promo' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button onClick={() => setAddToPopular(v => !v)}
                  className={`p-3 rounded-xl border text-left transition-all ${addToPopular ? 'bg-yellow-50 border-yellow-400 ring-2 ring-yellow-200' : 'bg-white border-gray-200'}`}>
                  <p className="text-sm font-bold text-gray-800 flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-yellow-600" />Закрепить в популярных</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">popularityMode → pinned</p>
                </button>
                <button onClick={() => setAddToRecommended(v => !v)}
                  className={`p-3 rounded-xl border text-left transition-all ${addToRecommended ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-200' : 'bg-white border-gray-200'}`}>
                  <p className="text-sm font-bold text-gray-800 flex items-center gap-1.5"><Megaphone className="w-4 h-4 text-purple-600" />В рекомендации</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Создать слот в /products/recommended</p>
                </button>
                <button onClick={() => setAddToShowcase(v => !v)}
                  className={`p-3 rounded-xl border text-left transition-all ${addToShowcase ? 'bg-orange-50 border-orange-400 ring-2 ring-orange-200' : 'bg-white border-gray-200'}`}>
                  <p className="text-sm font-bold text-gray-800 flex items-center gap-1.5"><Crown className="w-4 h-4 text-orange-600" />В первые ряды</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Создать слот в /products/showcase</p>
                </button>
              </div>
              {(addToPopular || addToRecommended || addToShowcase) && (
                <div className="border-t border-dashed pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Позиция показа</label>
                    <select value={promoPosition} onChange={e => setPromoPosition(e.target.value as RecommendationPosition)}
                      className={inputCls(false) + ' bg-white'}>
                      {RECOMMENDATION_POSITIONS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Приоритет</label>
                    <input type="number" min="1" value={promoPriority} onChange={e => setPromoPriority(e.target.value)}
                      className={inputCls(false)} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Период · С</label>
                    <input value={promoStart} onChange={e => setPromoStart(e.target.value)}
                      placeholder="дд.мм.гггг" className={inputCls(false)} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Период · По</label>
                    <input value={promoEnd} onChange={e => setPromoEnd(e.target.value)}
                      placeholder="дд.мм.гггг (опц.)" className={inputCls(false)} />
                  </div>
                  <div className="sm:col-span-2 text-[11px] text-gray-600 bg-blue-50 border border-blue-200 rounded-xl p-3">
                    <p><span className="font-semibold">Кто добавил:</span> Супер Админ (SuperAdmin)</p>
                    <p className="mt-0.5">Запись о действии будет сохранена в audit history соответствующих страниц.</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer actions */}
        <div className="border-t bg-gray-50 px-6 py-3 shrink-0">
          {hasErrors && (
            <p className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-2 py-1.5 mb-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Заполните обязательные поля во вкладках, отмеченных красной точкой.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 border border-gray-200 bg-white hover:bg-gray-50 rounded-xl text-sm font-medium">
              Отмена
            </button>
            <button onClick={() => setShowPreview(true)} className="flex items-center gap-1.5 px-4 py-2 border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-sm font-medium">
              <Eye className="w-3.5 h-3.5" />Предпросмотр карточки
            </button>
            <div className="flex-1" />
            <button onClick={() => trySubmit('draft')}
              className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold">
              <FileText className="w-3.5 h-3.5" />Сохранить как черновик
            </button>
            <button onClick={() => trySubmit(statusChoice === 'draft' ? 'draft' : 'moderation')} disabled={hasErrors && statusChoice !== 'draft'}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold">
              <Plus className="w-3.5 h-3.5" />Создать товар
            </button>
            <button onClick={() => trySubmit('active')} disabled={hasErrors}
              className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold">
              <BadgeCheck className="w-3.5 h-3.5" />Создать и активировать
            </button>
            <button onClick={() => trySubmit('active+showcase')} disabled={hasErrors}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold">
              <Crown className="w-3.5 h-3.5" />Создать и в витрину
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox for photos */}
      {lightbox && (
        <MediaLightbox
          items={lightbox.items}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}

      {/* Preview modal */}
      {showPreview && (
        <ProductPreviewModal
          product={previewProduct}
          media={previewMedia}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );

  return ReactDOM.createPortal(node, document.body);
}
