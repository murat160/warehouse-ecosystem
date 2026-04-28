/**
 * Reusable lightbox/video-player for ProductMediaItem.
 * Supports navigation (left/right arrows + keyboard) when given an array.
 * Renders <img> for url-based images, placeholder (emoji + bg) when no url,
 * and <video controls> for mediaType='video'.
 */
import { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { X, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut } from 'lucide-react';
import type { ProductMediaItem } from '../../data/products-mock';
import { MEDIA_STATUS_CFG } from '../../data/products-mock';

interface Props {
  items: ProductMediaItem[];
  initialIndex?: number;
  onClose: () => void;
  onDownload?: (item: ProductMediaItem) => void;
}

export function MediaLightbox({ items, initialIndex = 0, onClose, onDownload }: Props) {
  const [idx, setIdx] = useState(Math.max(0, Math.min(initialIndex, items.length - 1)));
  const [zoom, setZoom] = useState(1);
  const item = items[idx];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft')  setIdx(i => (i - 1 + items.length) % items.length);
      if (e.key === 'ArrowRight') setIdx(i => (i + 1) % items.length);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [items.length, onClose]);

  // Reset zoom when switching items
  useEffect(() => { setZoom(1); }, [idx]);

  if (!item) return null;

  const isVideo = item.mediaType === 'video';
  const sc = MEDIA_STATUS_CFG[item.status];

  const node = (
    <div className="fixed inset-0 z-[300] flex flex-col bg-black/90 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-white/10 text-white">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{item.productName}</p>
          <p className="text-xs text-white/60 truncate font-mono">{item.filename} · {item.sizeLabel}</p>
        </div>
        {items.length > 1 && (
          <span className="text-xs text-white/60 shrink-0">{idx + 1} / {items.length}</span>
        )}
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sc.cls}`}>{sc.label}</span>
        {!isVideo && (
          <div className="flex items-center gap-1">
            <button onClick={() => setZoom(z => Math.max(0.5, +(z - 0.25).toFixed(2)))} className="p-1.5 hover:bg-white/10 rounded-lg" title="Уменьшить">
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs text-white/70 w-10 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(4, +(z + 0.25).toFixed(2)))} className="p-1.5 hover:bg-white/10 rounded-lg" title="Увеличить">
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        )}
        {onDownload && (
          <button onClick={() => onDownload(item)} className="p-1.5 hover:bg-white/10 rounded-lg" title="Скачать">
            <Download className="w-4 h-4" />
          </button>
        )}
        <button onClick={onClose} className="p-1.5 hover:bg-red-900/40 rounded-lg" title="Закрыть"><X className="w-5 h-5" /></button>
      </div>

      {/* Body */}
      <div className="flex-1 relative flex items-center justify-center overflow-auto p-6">
        {items.length > 1 && (
          <button onClick={() => setIdx(i => (i - 1 + items.length) % items.length)}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white">
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        {items.length > 1 && (
          <button onClick={() => setIdx(i => (i + 1) % items.length)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white">
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {isVideo ? (
          item.url ? (
            <video controls autoPlay className="max-w-full max-h-[80vh] rounded-xl shadow-2xl bg-black">
              <source src={item.url} type={item.videoMimeType ?? 'video/mp4'} />
              Ваш браузер не поддерживает video.
            </video>
          ) : (
            <div className={`w-[640px] h-[360px] max-w-[80vw] max-h-[60vh] rounded-2xl flex flex-col items-center justify-center gap-4 ${item.bg}`}>
              <span className="text-9xl">{item.emoji}</span>
              <p className="text-sm text-gray-700 font-medium">Видео-плейсхолдер</p>
              <p className="text-xs text-gray-500 max-w-md text-center">
                Файл-источник недоступен в demo-данных. Загрузите свой mp4/webm через
                «Загрузить видео» — он откроется здесь в плеере.
              </p>
            </div>
          )
        ) : item.url ? (
          <img
            src={item.url}
            alt={item.filename}
            className="max-w-full max-h-[80vh] rounded-xl shadow-2xl select-none"
            style={{ transform: `scale(${zoom})`, transition: 'transform 0.15s ease', transformOrigin: 'center center' }}
            draggable={false}
          />
        ) : (
          <div
            className={`w-[640px] h-[480px] max-w-[80vw] max-h-[70vh] rounded-2xl flex items-center justify-center text-9xl ${item.bg}`}
            style={{ transform: `scale(${zoom})`, transition: 'transform 0.15s ease' }}
          >
            {item.emoji}
          </div>
        )}
      </div>

      {/* Thumbnails strip */}
      {items.length > 1 && (
        <div className="border-t border-white/10 p-3 flex items-center gap-2 overflow-x-auto">
          {items.map((m, i) => (
            <button key={m.id}
              onClick={() => setIdx(i)}
              className={`relative w-14 h-14 rounded-lg overflow-hidden shrink-0 transition-all ${i === idx ? 'ring-2 ring-blue-400 scale-105' : 'opacity-60 hover:opacity-100'}`}>
              {m.mediaType === 'video' && (
                <span className="absolute top-0.5 right-0.5 text-[8px] bg-black/70 text-white px-1 rounded">▶</span>
              )}
              {m.url ? (
                m.mediaType === 'video'
                  ? <video src={m.url} className="w-full h-full object-cover" muted />
                  : <img src={m.url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className={`w-full h-full ${m.bg} flex items-center justify-center text-2xl`}>{m.emoji}</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return ReactDOM.createPortal(node, document.body);
}
