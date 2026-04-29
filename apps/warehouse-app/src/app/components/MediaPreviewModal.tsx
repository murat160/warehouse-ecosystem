import { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

export interface MediaItem {
  kind: 'image' | 'video' | 'emoji';
  src: string;
  title?: string;
  sku?: string;
  barcode?: string;
  orderId?: string;
  zone?: string;
  binId?: string;
  comment?: string;
}

export interface MediaPreviewModalProps {
  open: boolean;
  items: MediaItem[];
  initialIndex?: number;
  onClose: () => void;
}

export function MediaPreviewModal({ open, items, initialIndex = 0, onClose }: MediaPreviewModalProps) {
  const [idx, setIdx] = useState(initialIndex);

  useEffect(() => { if (open) setIdx(initialIndex); }, [open, initialIndex]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && items.length > 1)  setIdx(i => (i - 1 + items.length) % items.length);
      if (e.key === 'ArrowRight' && items.length > 1) setIdx(i => (i + 1) % items.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, items.length, onClose]);

  if (!open || items.length === 0) return null;
  const cur = items[idx];

  return (
    <div className="fixed inset-0 z-[60] bg-black/85 flex flex-col" onClick={onClose}>
      <header className="flex items-center justify-between px-4 py-3 text-white">
        <div className="min-w-0">
          <div className="text-[14px] truncate" style={{ fontWeight: 800 }}>{cur.title ?? 'Медиа'}</div>
          {(cur.sku || cur.orderId) && (
            <div className="text-[11px] text-white/70 truncate font-mono" style={{ fontWeight: 600 }}>
              {cur.sku && `SKU ${cur.sku}`}
              {cur.barcode && ` · BC ${cur.barcode}`}
              {cur.orderId && ` · ${cur.orderId}`}
              {cur.binId && ` · ${cur.binId}`}
              {cur.zone && ` · ${cur.zone}`}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
          aria-label="Закрыть"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </header>

      <div
        className="flex-1 flex items-center justify-center p-4 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {items.length > 1 && (
          <button
            onClick={() => setIdx(i => (i - 1 + items.length) % items.length)}
            className="absolute left-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
            aria-label="Предыдущее"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
        )}

        <div className="max-w-[90vw] max-h-[70vh] flex items-center justify-center">
          {cur.kind === 'image' && (
            <img
              src={cur.src}
              alt={cur.title ?? ''}
              className="max-w-full max-h-[70vh] object-contain rounded-2xl"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          {cur.kind === 'video' && (
            <video
              src={cur.src}
              controls
              autoPlay
              className="max-w-full max-h-[70vh] rounded-2xl bg-black"
            />
          )}
          {cur.kind === 'emoji' && (
            <div className="bg-white rounded-3xl p-12 text-[200px] leading-none">
              {cur.src}
            </div>
          )}
        </div>

        {items.length > 1 && (
          <button
            onClick={() => setIdx(i => (i + 1) % items.length)}
            className="absolute right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
            aria-label="Следующее"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        )}
      </div>

      {(cur.comment || items.length > 1) && (
        <footer
          className="px-5 pb-5 pt-3 text-white text-center"
          onClick={(e) => e.stopPropagation()}
        >
          {cur.comment && (
            <div className="text-[12px] text-white/80 mb-2" style={{ fontWeight: 500 }}>
              {cur.comment}
            </div>
          )}
          {items.length > 1 && (
            <div className="text-[11px] text-white/60" style={{ fontWeight: 600 }}>
              {idx + 1} / {items.length}
            </div>
          )}
        </footer>
      )}
    </div>
  );
}
