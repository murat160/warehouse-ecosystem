import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Search, Upload, Download, Eye, CheckCircle2, XCircle, Trash2,
  Image as ImageIcon, X, AlertCircle, Filter, Video as VideoIcon,
} from 'lucide-react';
import {
  MEDIA, PRODUCTS, MEDIA_STATUS_CFG,
  type ProductMediaItem, type MediaStatus, type MediaType,
} from '../../data/products-mock';
import { exportToCsv } from '../../utils/downloads';
import { MediaLightbox } from '../../components/ui/MediaLightbox';

type StatusFilter = MediaStatus | 'all' | 'no_photo';
type TypeFilter   = MediaType | 'all';

export function ProductMedia() {
  const [searchParams] = useSearchParams();
  const initialProduct  = searchParams.get('product')  ?? '';
  const initialMerchant = searchParams.get('merchant') ?? '';
  const [media, setMedia]       = useState<ProductMediaItem[]>(MEDIA);
  const [search, setSearch]     = useState(initialProduct ? PRODUCTS.find(p => p.id === initialProduct)?.name ?? '' : '');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter]     = useState<TypeFilter>('all');
  const [merchantFilter] = useState<string>(initialMerchant);
  const [lightbox, setLightbox] = useState<{ items: ProductMediaItem[]; index: number } | null>(null);

  // Products without any approved photo (for "Без фото" filter)
  const productsWithoutPhotos = useMemo(() => {
    const ids = new Set<string>();
    PRODUCTS.forEach(p => {
      const has = media.some(m => m.productId === p.id && m.status === 'approved');
      if (!has) ids.add(p.id);
    });
    return ids;
  }, [media]);

  const stats = useMemo(() => ({
    total:    media.length,
    images:   media.filter(m => (m.mediaType ?? 'image') === 'image').length,
    videos:   media.filter(m => m.mediaType === 'video').length,
    approved: media.filter(m => m.status === 'approved').length,
    pending:  media.filter(m => m.status === 'pending').length,
    rejected: media.filter(m => m.status === 'rejected').length,
    noPhoto:  productsWithoutPhotos.size,
  }), [media, productsWithoutPhotos]);

  // Map productId → merchantId for merchant filter
  const productMerchantMap = useMemo(() => {
    const map: Record<string, string> = {};
    PRODUCTS.forEach(p => { map[p.id] = p.merchantId; });
    return map;
  }, []);

  const filtered = useMemo(() => {
    let list = media;
    if (statusFilter === 'no_photo') {
      list = list.filter(m => productsWithoutPhotos.has(m.productId));
    } else {
      if (statusFilter !== 'all') list = list.filter(m => m.status === statusFilter);
    }
    if (typeFilter !== 'all') list = list.filter(m => (m.mediaType ?? 'image') === typeFilter);
    if (merchantFilter) list = list.filter(m => productMerchantMap[m.productId] === merchantFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(m =>
        m.productName.toLowerCase().includes(q) ||
        m.filename.toLowerCase().includes(q) ||
        m.uploader.toLowerCase().includes(q));
    }
    return list;
  }, [media, search, statusFilter, typeFilter, merchantFilter, productsWithoutPhotos, productMerchantMap]);

  function setMediaStatus(id: string, status: MediaStatus) {
    setMedia(prev => prev.map(m => m.id === id ? { ...m, status } : m));
    const m = media.find(x => x.id === id);
    if (m) toast.success(`«${m.filename}» → ${MEDIA_STATUS_CFG[status].label}`);
  }

  function removeMedia(id: string) {
    const m = media.find(x => x.id === id);
    if (!m) return;
    const ok = window.confirm(`Удалить файл «${m.filename}»?`);
    if (!ok) return;
    setMedia(prev => prev.filter(x => x.id !== id));
    toast.success(`Удалён: ${m.filename}`);
  }

  function downloadMedia(m: ProductMediaItem) {
    if (m.url) {
      const a = document.createElement('a');
      a.href = m.url;
      a.download = m.filename;
      document.body.appendChild(a); a.click(); a.remove();
      toast.success(`Скачан: ${m.filename}`);
      return;
    }
    // Placeholder → download metadata as text
    const text = `Медиа-файл: ${m.filename}\nТовар: ${m.productName} (${m.productId})\nЗагружено: ${m.uploadedAt}\nКем: ${m.uploader}\nРазмер: ${m.sizeLabel}\nСтатус: ${MEDIA_STATUS_CFG[m.status].label}`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${m.filename}.txt`.replace(/[\\/:*?"<>|]/g, '_');
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast.success(`Скачаны метаданные: ${m.filename}.txt`, { description: 'Файл-источник недоступен (placeholder)' });
  }

  function handleUpload(file: File) {
    const isVideo = file.type.startsWith('video/');
    if (!isVideo && file.size > 10 * 1024 * 1024) { toast.error('Фото больше 10 MB'); return; }
    if (isVideo  && file.size > 50 * 1024 * 1024) { toast.error('Видео больше 50 MB'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const sizeKb = Math.max(1, Math.round(file.size / 1024));
      const sizeLabel = sizeKb >= 1024 ? `${(sizeKb / 1024).toFixed(1)} МБ` : `${sizeKb} КБ`;
      const now = new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      // Default to first product (in real life — selector). User can re-attach.
      const defaultProduct = initialProduct
        ? (PRODUCTS.find(p => p.id === initialProduct) ?? PRODUCTS[0])
        : PRODUCTS[0];
      setMedia(prev => [{
        id: `${isVideo ? 'vid' : 'med'}-${Date.now()}`,
        productId: defaultProduct.id,
        productName: defaultProduct.name,
        url: dataUrl,
        bg: 'bg-gray-100',
        emoji: isVideo ? '🎬' : '🖼',
        filename: file.name,
        sizeLabel,
        status: 'pending',
        uploadedAt: now,
        uploader: 'Текущий пользователь',
        mediaType: isVideo ? 'video' : 'image',
        ...(isVideo ? { videoMimeType: file.type || 'video/mp4' } : {}),
      }, ...prev]);
      toast.success(`${isVideo ? 'Видео' : 'Фото'} загружено: ${file.name}`, { description: `Привязан к «${defaultProduct.name}». Статус: На проверке` });
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Медиа товаров</h1>
          <p className="text-sm text-gray-500 mt-0.5">Фотографии и изображения товаров · {media.length} файлов</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (filtered.length === 0) { toast.info('Нет файлов для экспорта'); return; }
              exportToCsv(filtered as any[], [
                { key: 'id',           label: 'ID' },
                { key: 'productId',    label: 'Товар ID' },
                { key: 'productName',  label: 'Товар' },
                { key: 'filename',     label: 'Файл' },
                { key: 'sizeLabel',    label: 'Размер' },
                { key: 'status',       label: 'Статус' },
                { key: 'uploadedAt',   label: 'Загружено' },
                { key: 'uploader',     label: 'Кем' },
              ], 'product-media');
              toast.success(`Скачан CSV: ${filtered.length} файлов`);
            }}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm">
            <Download className="w-4 h-4" />Экспорт
          </button>
          <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm cursor-pointer">
            <Upload className="w-4 h-4" />Загрузить медиа
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,video/mp4,video/webm"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }}
            />
          </label>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Всего',          value: stats.total,    bg: 'bg-white border-gray-200',       color: 'text-gray-900',  filter: 'all'      as StatusFilter },
          { label: 'Одобрено',       value: stats.approved, bg: 'bg-green-50 border-green-200',   color: 'text-green-700', filter: 'approved' as StatusFilter },
          { label: 'На проверке',    value: stats.pending,  bg: 'bg-yellow-50 border-yellow-200', color: 'text-yellow-700',filter: 'pending'  as StatusFilter },
          { label: 'Отклонены',      value: stats.rejected, bg: 'bg-red-50 border-red-200',       color: 'text-red-700',   filter: 'rejected' as StatusFilter },
          { label: 'Товары без фото',value: stats.noPhoto,  bg: 'bg-orange-50 border-orange-200', color: 'text-orange-700',filter: 'no_photo' as StatusFilter },
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

      {/* Search + type filter */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск по товару, файлу, продавцу..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {([
            { v: 'all'   as TypeFilter, label: 'Всё',   count: stats.total },
            { v: 'image' as TypeFilter, label: 'Фото',  count: stats.images },
            { v: 'video' as TypeFilter, label: 'Видео', count: stats.videos },
          ]).map(t => (
            <button key={t.v}
              onClick={() => setTypeFilter(t.v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${typeFilter === t.v ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}>
              {t.v === 'image' && <ImageIcon className="w-3 h-3" />}
              {t.v === 'video' && <VideoIcon className="w-3 h-3" />}
              {t.label}
              <span className="opacity-60 text-[10px]">{t.count}</span>
            </button>
          ))}
        </div>
        {merchantFilter && (
          <span className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
            Продавец: <span className="font-mono font-semibold">{merchantFilter}</span>
          </span>
        )}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400">
          <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Файлов не найдено</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((m, idx) => {
            const sc = MEDIA_STATUS_CFG[m.status];
            const isVideo = m.mediaType === 'video';
            return (
              <div key={m.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                {/* Thumbnail */}
                <button onClick={() => setLightbox({ items: filtered, index: idx })} className="block w-full relative aspect-square hover:opacity-90 transition-opacity">
                  {isVideo ? (
                    m.url ? (
                      <video src={m.url} className="w-full h-full object-cover" muted preload="metadata" />
                    ) : (
                      <div className={`w-full h-full ${m.bg} flex items-center justify-center`}>
                        <span className="text-6xl">{m.emoji}</span>
                      </div>
                    )
                  ) : (
                    m.url ? (
                      <img src={m.url} alt={m.filename} className="w-full h-full object-cover" />
                    ) : (
                      <div className={`w-full h-full ${m.bg} flex items-center justify-center`}>
                        <span className="text-6xl">{m.emoji}</span>
                      </div>
                    )
                  )}
                  {isVideo && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-purple-600 ml-1 text-lg">▶</span>
                      </div>
                    </div>
                  )}
                  <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold ${sc.cls}`}>{sc.label}</span>
                  {isVideo && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-600 text-white flex items-center gap-1">
                      <VideoIcon className="w-3 h-3" />Видео
                    </span>
                  )}
                </button>
                {/* Info */}
                <div className="p-3">
                  <p className="text-sm font-medium text-gray-900 truncate">{m.productName}</p>
                  <p className="text-xs text-gray-500 truncate font-mono mt-0.5">{m.filename}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{m.sizeLabel} · {m.uploadedAt}</p>
                  {/* Actions */}
                  <div className="flex items-center gap-1 mt-3">
                    <button onClick={() => setLightbox({ items: filtered, index: idx })} className="flex-1 py-1.5 border border-gray-200 rounded-md text-xs hover:bg-gray-50 flex items-center justify-center gap-1" title="Просмотр">
                      <Eye className="w-3 h-3" />
                    </button>
                    <button onClick={() => downloadMedia(m)} className="flex-1 py-1.5 border border-gray-200 rounded-md text-xs hover:bg-gray-50 flex items-center justify-center gap-1" title="Скачать">
                      <Download className="w-3 h-3" />
                    </button>
                    {m.status !== 'approved' && (
                      <button onClick={() => setMediaStatus(m.id, 'approved')} className="flex-1 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-md text-xs flex items-center justify-center gap-1" title="Одобрить">
                        <CheckCircle2 className="w-3 h-3" />
                      </button>
                    )}
                    {m.status !== 'rejected' && (
                      <button onClick={() => setMediaStatus(m.id, 'rejected')} className="flex-1 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-md text-xs flex items-center justify-center gap-1" title="Отклонить">
                        <XCircle className="w-3 h-3" />
                      </button>
                    )}
                    <button onClick={() => removeMedia(m.id)} className="py-1.5 px-2 bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-600 rounded-md text-xs" title="Удалить">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox / video player (reusable component) */}
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
