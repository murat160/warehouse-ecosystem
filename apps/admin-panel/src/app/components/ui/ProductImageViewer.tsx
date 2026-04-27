/**
 * ProductImageViewer
 * – Thumbnail grid
 * – Fullscreen lightbox (portal on document.body)
 * – Zoom (scroll or pinch) up to 4×
 * – Simulated 3D / 360° rotation via pointer-drag (CSS perspective)
 * – Damage annotation overlay
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
  X, ZoomIn, ZoomOut, RotateCcw, Maximize2, ChevronLeft,
  ChevronRight, AlertTriangle, Image as ImageIcon, Download,
  RefreshCw, Move3d,
} from 'lucide-react';

export interface ProductImage {
  id:          string;
  url:         string;           // data URL or placeholder colour/emoji
  label:       string;           // e.g. "Фото 1 – вид спереди"
  isDamage?:   boolean;          // highlights damage
  annotation?: string;           // short text overlay on thumbnail
  emoji?:      string;           // shown when no real URL
  bg?:         string;           // tailwind bg for placeholder
}

interface Props {
  images:       ProductImage[];
  productName:  string;
  barcode?:     string;          // if undefined → barcode section hidden
  sku?:         string;
  category?:    string;
  hasDamage?:   boolean;
}

// ─── Barcode SVG ──────────────────────────────────────────────────────────────

function BarcodeSVG({ code }: { code: string }) {
  // Generate deterministic bar pattern from code string
  const bars: { x: number; w: number; isThin: boolean }[] = [];
  let x = 0;
  const totalWidth = 200;
  const charWidth  = Math.floor(totalWidth / (code.length * 3 + 6));

  // Guard bars
  bars.push({ x, w: charWidth, isThin: false }); x += charWidth;
  bars.push({ x, w: charWidth, isThin: true  }); x += charWidth + 1;
  bars.push({ x, w: charWidth, isThin: false }); x += charWidth + 2;

  for (let i = 0; i < code.length; i++) {
    const n = code.charCodeAt(i) % 8;
    for (let b = 0; b < 4; b++) {
      const isBar = (n >> b) & 1;
      const w = isBar ? charWidth : charWidth - 1;
      if (isBar) bars.push({ x, w, isThin: b % 2 === 0 });
      x += w + 1;
    }
    x += 1;
  }

  // Guard bars end
  bars.push({ x, w: charWidth, isThin: false }); x += charWidth;
  bars.push({ x, w: charWidth, isThin: true  }); x += charWidth + 1;
  bars.push({ x, w: charWidth, isThin: false });

  return (
    <svg viewBox={`0 0 ${totalWidth} 56`} className="w-full h-14" xmlns="http://www.w3.org/2000/svg">
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={0} width={b.w} height={44} fill="#111827" />
      ))}
      <text x={totalWidth / 2} y={54} textAnchor="middle" fontSize="8" fill="#374151" fontFamily="monospace">
        {code}
      </text>
    </svg>
  );
}

// ─── Image Placeholder ───────────────────────────────────────────────────────

function ImagePlaceholder({ img, size = 'full' }: { img: ProductImage; size?: 'thumb' | 'full' }) {
  const bgMap: Record<string, string> = {
    'bg-red-100':    '#FEE2E2',
    'bg-blue-100':   '#DBEAFE',
    'bg-green-100':  '#D1FAE5',
    'bg-amber-100':  '#FEF3C7',
    'bg-purple-100': '#EDE9FE',
    'bg-gray-100':   '#F3F4F6',
    'bg-pink-100':   '#FCE7F3',
    'bg-orange-100': '#FFEDD5',
    'bg-teal-100':   '#CCFBF1',
  };
  const bg = bgMap[img.bg ?? 'bg-gray-100'] ?? '#F3F4F6';
  const fontSize = size === 'thumb' ? '1.8rem' : '4rem';
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-2" style={{ background: bg }}>
      <span style={{ fontSize }}>{img.emoji ?? '📦'}</span>
      {size === 'full' && <p className="text-xs text-gray-500 font-medium text-center px-4">{img.label}</p>}
      {img.isDamage && (
        <div className="flex items-center gap-1 px-2 py-0.5 bg-red-600 rounded-full">
          <AlertTriangle className="w-3 h-3 text-white" />
          <span className="text-white text-[10px] font-bold">ПОВРЕЖДЕНИЕ</span>
        </div>
      )}
    </div>
  );
}

// ─── Lightbox ────────────────────────────────────────────────────────────────

function Lightbox({
  images, initialIdx, onClose,
}: {
  images: ProductImage[];
  initialIdx: number;
  onClose: () => void;
}) {
  const [idx, setIdx]         = useState(initialIdx);
  const [zoom, setZoom]       = useState(1);
  const [mode, setMode]       = useState<'view' | 'rotate'>('view');
  // 3-D rotation state
  const [rotX, setRotX]       = useState(0);
  const [rotY, setRotY]       = useState(0);
  const dragging              = useRef(false);
  const lastPos               = useRef({ x: 0, y: 0 });
  const autoRotRef            = useRef<ReturnType<typeof setInterval> | null>(null);
  const [autoRotate, setAutoRotate] = useState(false);

  const img = images[idx];

  const prev = () => { setIdx(i => (i - 1 + images.length) % images.length); resetTransform(); };
  const next = () => { setIdx(i => (i + 1) % images.length); resetTransform(); };
  const resetTransform = () => { setZoom(1); setRotX(0); setRotY(0); };

  // Auto-rotate
  useEffect(() => {
    if (autoRotate && mode === 'rotate') {
      autoRotRef.current = setInterval(() => setRotY(y => y + 1.5), 16);
    } else {
      if (autoRotRef.current) clearInterval(autoRotRef.current);
    }
    return () => { if (autoRotRef.current) clearInterval(autoRotRef.current); };
  }, [autoRotate, mode]);

  // Pointer drag for 3D rotate
  const onPointerDown = (e: React.PointerEvent) => {
    if (mode !== 'rotate') return;
    dragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setAutoRotate(false);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current || mode !== 'rotate') return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    setRotY(y => y + dx * 0.5);
    setRotX(x => Math.max(-40, Math.min(40, x - dy * 0.3)));
    lastPos.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = () => { dragging.current = false; };

  // Wheel zoom
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.max(1, Math.min(4, z - e.deltaY * 0.002)));
  };

  // Key navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const transform3D = mode === 'rotate'
    ? `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(${zoom})`
    : `scale(${zoom})`;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[200] flex flex-col bg-gray-950" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {img.isDamage && (
              <span className="flex items-center gap-1 px-2.5 py-1 bg-red-600 rounded-full text-white text-xs font-bold">
                <AlertTriangle className="w-3.5 h-3.5" />ПОВРЕЖДЕНИЕ
              </span>
            )}
            <span className="text-sm text-gray-400">{img.label}</span>
          </div>
          {img.annotation && (
            <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/40 rounded text-xs text-amber-300">{img.annotation}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Mode toggle */}
          <div className="flex items-center gap-1 bg-gray-800 rounded-xl p-1">
            <button onClick={() => { setMode('view'); setAutoRotate(false); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${mode === 'view' ? 'bg-white text-gray-900' : 'text-gray-400 hover:text-white'}`}>
              <ZoomIn className="w-3.5 h-3.5" />Просмотр
            </button>
            <button onClick={() => setMode('rotate')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${mode === 'rotate' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              <Move3d className="w-3.5 h-3.5" />3D / 360°
            </button>
          </div>
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-gray-800 rounded-xl p-1">
            <button onClick={() => setZoom(z => Math.max(1, z - 0.25))} className="p-1.5 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors">
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-400 w-8 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(4, z + 0.25))} className="p-1.5 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors">
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
          {mode === 'rotate' && (
            <button onClick={() => setAutoRotate(a => !a)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${autoRotate ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
              <RefreshCw className={`w-3.5 h-3.5 ${autoRotate ? 'animate-spin' : ''}`} />Auto
            </button>
          )}
          <button onClick={resetTransform} className="p-2 hover:bg-gray-800 rounded-xl text-gray-400 hover:text-white transition-colors" title="Сбросить">
            <RotateCcw className="w-4 h-4" />
          </button>
          <button onClick={() => {}} className="p-2 hover:bg-gray-800 rounded-xl text-gray-400 hover:text-white transition-colors" title="Скачать">
            <Download className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="p-2 hover:bg-red-900/40 rounded-xl text-gray-400 hover:text-red-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main image area */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{ cursor: mode === 'rotate' ? 'grab' : zoom > 1 ? 'zoom-out' : 'zoom-in' }}
      >
        {/* 3D hint */}
        {mode === 'rotate' && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3 py-1.5 bg-gray-900/80 border border-blue-500/30 rounded-full text-xs text-blue-300">
            <Move3d className="w-3.5 h-3.5" />
            Перетащите для вращения · Колесо — масштаб
          </div>
        )}

        {/* Image */}
        <div
          className="w-[640px] h-[480px] max-w-[85vw] max-h-[70vh] rounded-2xl overflow-hidden shadow-2xl relative select-none"
          style={{
            transform: transform3D,
            transition: dragging.current || autoRotate ? 'none' : 'transform 0.15s ease',
            transformStyle: 'preserve-3d',
          }}
        >
          <ImagePlaceholder img={img} size="full" />

          {/* Damage overlay indicator */}
          {img.isDamage && (
            <div className="absolute inset-0 border-4 border-red-500/60 rounded-2xl pointer-events-none">
              <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg">
                <AlertTriangle className="w-3.5 h-3.5" />ЗАФИКСИРОВАНО ПОВРЕЖДЕНИЕ
              </div>
              {/* Corner marks */}
              {['top-2 left-2','top-2 right-2','bottom-2 left-2','bottom-2 right-2'].map((pos, i) => (
                <div key={i} className={`absolute ${pos} w-6 h-6 border-2 border-red-500 rounded-sm`} />
              ))}
            </div>
          )}
        </div>

        {/* Nav arrows */}
        {images.length > 1 && (
          <>
            <button onClick={prev}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-gray-900/70 hover:bg-gray-700 border border-gray-700 rounded-full flex items-center justify-center text-white transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={next}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-gray-900/70 hover:bg-gray-700 border border-gray-700 rounded-full flex items-center justify-center text-white transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Bottom strip: thumbnails + counter */}
      <div className="shrink-0 border-t border-gray-800 bg-gray-900 px-4 py-3 flex items-center gap-3">
        <span className="text-xs text-gray-500 shrink-0">{idx + 1} / {images.length}</span>
        <div className="flex-1 flex items-center gap-2 overflow-x-auto pb-1">
          {images.map((im, i) => (
            <button key={im.id} onClick={() => { setIdx(i); resetTransform(); }}
              className={`w-14 h-14 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${i === idx ? 'border-blue-500 scale-105' : 'border-gray-700 hover:border-gray-500 opacity-60 hover:opacity-100'}`}>
              <ImagePlaceholder img={im} size="thumb" />
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Public Component ─────────────────────────────────────────────────────────

export function ProductImageViewer({ images, productName, barcode, sku, category, hasDamage }: Props) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [copied, setCopied]           = useState(false);

  const copyBarcode = () => {
    if (!barcode) return;
    navigator.clipboard.writeText(barcode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const hasBarcode = !!barcode;
  const damageImages = images.filter(i => i.isDamage);

  return (
    <div className="space-y-4">
      {/* Damage alert */}
      {(hasDamage || damageImages.length > 0) && (
        <div className="flex items-center gap-3 p-3.5 bg-red-50 border border-red-300 rounded-2xl">
          <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-red-800">Зафиксировано повреждение товара</p>
            <p className="text-xs text-red-600 mt-0.5">{damageImages.length} фото с повреждением · Кликните для просмотра в увеличенном виде</p>
          </div>
        </div>
      )}

      {/* Image thumbnails */}
      <div>
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5" />
          Фотографии товара
          <span className="text-gray-400">· {images.length} шт.</span>
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setLightboxIdx(i)}
              className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all group hover:scale-105 hover:shadow-lg ${img.isDamage ? 'border-red-400 ring-2 ring-red-300/50' : 'border-gray-200 hover:border-blue-400'}`}
            >
              <ImagePlaceholder img={img} size="thumb" />
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-gray-900/0 group-hover:bg-gray-900/40 transition-colors flex items-center justify-center">
                <Maximize2 className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
              </div>
              {/* Damage badge */}
              {img.isDamage && (
                <div className="absolute top-1 right-1 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center shadow">
                  <AlertTriangle className="w-3 h-3 text-white" />
                </div>
              )}
              {/* Label */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                <p className="text-[9px] text-white font-medium truncate">{img.label}</p>
              </div>
            </button>
          ))}

          {/* Add photo placeholder */}
          <button className="aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-blue-500 transition-colors">
            <ImageIcon className="w-5 h-5" />
            <span className="text-[9px] font-medium">Добавить</span>
          </button>
        </div>
      </div>

      {/* 3D view promo hint */}
      <button onClick={() => setLightboxIdx(0)}
        className="w-full flex items-center justify-center gap-2 py-2.5 border border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-xl text-xs font-semibold text-blue-700 transition-colors">
        <Move3d className="w-4 h-4" />
        Открыть 3D / 360° просмотр
        <span className="text-blue-400 font-normal">· увеличение до 4×</span>
      </button>

      {/* Barcode block */}
      {hasBarcode && (
        <div className="border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <p className="text-xs font-bold text-gray-700">Штрих-код / Баркод товара</p>
            <div className="flex items-center gap-2">
              <button onClick={copyBarcode}
                className={`flex items-center gap-1.5 px-2.5 py-1 border rounded-lg text-xs font-medium transition-all ${copied ? 'bg-green-50 border-green-300 text-green-700' : 'border-gray-200 hover:bg-gray-100 text-gray-600'}`}>
                {copied ? '✓ Скопировано' : 'Копировать'}
              </button>
              <button className="flex items-center gap-1.5 px-2.5 py-1 border border-gray-200 hover:bg-gray-100 rounded-lg text-xs font-medium text-gray-600 transition-colors">
                <Download className="w-3 h-3" />SVG
              </button>
            </div>
          </div>
          <div className="px-6 py-4 bg-white flex flex-col items-center gap-2">
            <BarcodeSVG code={barcode!} />
            <div className="flex items-center gap-4 text-xs text-gray-500">
              {sku && <span>SKU: <span className="font-mono font-bold text-gray-800">{sku}</span></span>}
              {category && <span>Категория: <span className="font-semibold text-gray-700">{category}</span></span>}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <Lightbox images={images} initialIdx={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}
    </div>
  );
}
