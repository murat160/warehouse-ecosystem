import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import {
  Search, Upload, Download, Eye, CheckCircle2, XCircle, Trash2,
  Image as ImageIcon, X, AlertCircle, Filter,
} from 'lucide-react';
import {
  MEDIA, PRODUCTS, MEDIA_STATUS_CFG,
  type ProductMediaItem, type MediaStatus,
} from '../../data/products-mock';
import { exportToCsv } from '../../utils/downloads';

type StatusFilter = MediaStatus | 'all' | 'no_photo';

export function ProductMedia() {
  const [media, setMedia]       = useState<ProductMediaItem[]>(MEDIA);
  const [search, setSearch]     = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [viewing, setViewing]   = useState<ProductMediaItem | null>(null);

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
    approved: media.filter(m => m.status === 'approved').length,
    pending:  media.filter(m => m.status === 'pending').length,
    rejected: media.filter(m => m.status === 'rejected').length,
    noPhoto:  productsWithoutPhotos.size,
  }), [media, productsWithoutPhotos]);

  const filtered = useMemo(() => {
    if (statusFilter === 'no_photo') {
      return media.filter(m => productsWithoutPhotos.has(m.productId));
    }
    return media.filter(m => {
      const q = search.toLowerCase();
      const matchSearch = !q ||
        m.productName.toLowerCase().includes(q) ||
        m.filename.toLowerCase().includes(q) ||
        m.uploader.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || m.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [media, search, statusFilter, productsWithoutPhotos]);

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
    if (file.size > 10 * 1024 * 1024) { toast.error('Файл больше 10 MB'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const sizeKb = Math.max(1, Math.round(file.size / 1024));
      const sizeLabel = sizeKb >= 1024 ? `${(sizeKb / 1024).toFixed(1)} МБ` : `${sizeKb} КБ`;
      const now = new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      // Default to first product (in real life — selector). User can re-attach.
      const defaultProduct = PRODUCTS[0];
      setMedia(prev => [{
        id: `med-${Date.now()}`,
        productId: defaultProduct.id,
        productName: defaultProduct.name,
        url: dataUrl,
        bg: 'bg-gray-100',
        emoji: '🖼',
        filename: file.name,
        sizeLabel,
        status: 'pending',
        uploadedAt: now,
        uploader: 'Текущий пользователь',
      }, ...prev]);
      toast.success(`Файл загружен: ${file.name}`, { description: `Привязан к «${defaultProduct.name}». Статус: На проверке` });
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
            <Upload className="w-4 h-4" />Загрузить фото
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
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

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 relative">
        <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Поиск по товару, файлу, продавцу..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400">
          <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Файлов не найдено</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(m => {
            const sc = MEDIA_STATUS_CFG[m.status];
            return (
              <div key={m.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                {/* Thumbnail */}
                <button onClick={() => setViewing(m)} className="block w-full relative aspect-square hover:opacity-90 transition-opacity">
                  {m.url ? (
                    <img src={m.url} alt={m.filename} className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full ${m.bg} flex items-center justify-center`}>
                      <span className="text-6xl">{m.emoji}</span>
                    </div>
                  )}
                  <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold ${sc.cls}`}>{sc.label}</span>
                </button>
                {/* Info */}
                <div className="p-3">
                  <p className="text-sm font-medium text-gray-900 truncate">{m.productName}</p>
                  <p className="text-xs text-gray-500 truncate font-mono mt-0.5">{m.filename}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{m.sizeLabel} · {m.uploadedAt}</p>
                  {/* Actions */}
                  <div className="flex items-center gap-1 mt-3">
                    <button onClick={() => setViewing(m)} className="flex-1 py-1.5 border border-gray-200 rounded-md text-xs hover:bg-gray-50 flex items-center justify-center gap-1" title="Просмотр">
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

      {/* Lightbox */}
      {viewing && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/85 backdrop-blur-sm" onClick={() => setViewing(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <p className="font-bold text-gray-900">{viewing.productName}</p>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{viewing.filename}</p>
              </div>
              <button onClick={() => setViewing(null)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="bg-gray-50 flex items-center justify-center p-6 min-h-[320px]">
              {viewing.url ? (
                <img src={viewing.url} alt={viewing.filename} className="max-w-full max-h-[60vh] rounded-xl shadow-lg" />
              ) : (
                <div className={`w-72 h-72 ${viewing.bg} rounded-2xl flex items-center justify-center text-9xl`}>
                  {viewing.emoji}
                </div>
              )}
            </div>
            <div className="p-6 grid grid-cols-2 gap-3 text-sm">
              <div className="border-b border-gray-50 pb-2"><p className="text-xs text-gray-400 mb-0.5">Размер</p><p className="font-semibold">{viewing.sizeLabel}</p></div>
              <div className="border-b border-gray-50 pb-2"><p className="text-xs text-gray-400 mb-0.5">Загружено</p><p className="font-semibold">{viewing.uploadedAt}</p></div>
              <div className="border-b border-gray-50 pb-2"><p className="text-xs text-gray-400 mb-0.5">Кем</p><p className="font-semibold">{viewing.uploader}</p></div>
              <div className="border-b border-gray-50 pb-2"><p className="text-xs text-gray-400 mb-0.5">Статус</p>
                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${MEDIA_STATUS_CFG[viewing.status].cls}`}>{MEDIA_STATUS_CFG[viewing.status].label}</span>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex gap-2">
              <button onClick={() => downloadMedia(viewing)} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50 flex items-center justify-center gap-1.5"><Download className="w-3.5 h-3.5" />Скачать</button>
              {viewing.status !== 'approved' && (
                <button onClick={() => { setMediaStatus(viewing.id, 'approved'); setViewing(prev => prev ? { ...prev, status: 'approved' } : null); }} className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" />Одобрить</button>
              )}
              {viewing.status !== 'rejected' && (
                <button onClick={() => { setMediaStatus(viewing.id, 'rejected'); setViewing(prev => prev ? { ...prev, status: 'rejected' } : null); }} className="flex-1 py-2 border border-red-300 text-red-700 hover:bg-red-50 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5"><XCircle className="w-3.5 h-3.5" />Отклонить</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
