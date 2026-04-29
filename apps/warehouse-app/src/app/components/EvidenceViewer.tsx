import { useState } from 'react';
import { Download, Eye } from 'lucide-react';
import { MediaPreviewModal, type MediaItem } from './MediaPreviewModal';
import { EVIDENCE_SOURCE_LABELS, type EvidenceSource } from '../domain/types';

export interface Evidence extends MediaItem {
  source: EvidenceSource;
  uploadedBy?: string;
  uploadedAt?: string;
  status?: string;
  /** Технический id, если документ или dispute. */
  refId?: string;
}

export interface EvidenceViewerProps {
  items: Evidence[];
  /** Заголовок секции. */
  title?: string;
  /** Если true — показывать фильтры по типу/источнику. */
  withFilters?: boolean;
}

const SOURCE_COLORS: Record<EvidenceSource, { bg: string; fg: string }> = {
  customer:  { bg: '#FEE2E2', fg: '#7F1D1D' },
  supplier:  { bg: '#E0E7FF', fg: '#3730A3' },
  warehouse: { bg: '#E0F2FE', fg: '#0369A1' },
  courier:   { bg: '#F3E8FF', fg: '#6B21A8' },
  return:    { bg: '#FECACA', fg: '#991B1B' },
  receiving: { bg: '#FEF3C7', fg: '#92400E' },
};

const KIND_LABELS: Record<MediaItem['kind'], string> = {
  image: 'фото', video: 'видео', emoji: 'иконка',
};

export function EvidenceViewer({ items, title, withFilters = true }: EvidenceViewerProps) {
  const [src, setSrc] = useState<EvidenceSource | 'ALL'>('ALL');
  const [kind, setKind] = useState<MediaItem['kind'] | 'ALL'>('ALL');
  const [open, setOpen] = useState<{ list: MediaItem[]; idx: number } | null>(null);

  const filtered = items.filter(e =>
    (src === 'ALL' || e.source === src) &&
    (kind === 'ALL' || e.kind === kind),
  );

  const downloadOne = (e: Evidence) => {
    const txt = `Source: ${e.source}\nKind: ${e.kind}\nSrc: ${e.src}\nTitle: ${e.title ?? ''}\nUploadedBy: ${e.uploadedBy ?? ''}\nAt: ${e.uploadedAt ?? ''}\nComment: ${e.comment ?? ''}\n`;
    const blob = new Blob([txt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `evidence-${e.refId ?? Date.now()}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[14px] text-[#1F2430]" style={{ fontWeight: 800 }}>
          {title ?? 'Доказательства'}
        </h3>
        <span className="text-[11px] text-[#6B7280]" style={{ fontWeight: 700 }}>{filtered.length} / {items.length}</span>
      </div>

      {withFilters && items.length > 0 && (
        <div className="space-y-1.5 mb-3">
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <Pill active={src === 'ALL'} onClick={() => setSrc('ALL')}>Все источники</Pill>
            {(Object.keys(EVIDENCE_SOURCE_LABELS) as EvidenceSource[]).map(s => (
              <Pill key={s} active={src === s} onClick={() => setSrc(s)} color={SOURCE_COLORS[s]}>
                {EVIDENCE_SOURCE_LABELS[s]}
              </Pill>
            ))}
          </div>
          <div className="flex gap-1.5">
            <Pill active={kind === 'ALL'}   onClick={() => setKind('ALL')}>Все</Pill>
            <Pill active={kind === 'image'} onClick={() => setKind('image')}>Фото</Pill>
            <Pill active={kind === 'video'} onClick={() => setKind('video')}>Видео</Pill>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-[12px] text-[#6B7280] text-center py-6" style={{ fontWeight: 500 }}>
          Доказательств нет
        </div>
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
          {filtered.map((e, i) => {
            const c = SOURCE_COLORS[e.source];
            return (
              <div key={i} className="relative">
                <button
                  onClick={() => setOpen({ list: filtered, idx: i })}
                  className="w-full aspect-square rounded-lg bg-[#F3F4F6] flex items-center justify-center active-press relative"
                >
                  {e.kind === 'image' && /^(https?:|blob:|data:)/.test(e.src)
                    ? <img src={e.src} alt={e.title ?? ''} className="w-full h-full object-cover rounded-lg" />
                    : e.kind === 'video'
                      ? <span className="text-[#1F2430]" style={{ fontWeight: 800 }}>▶ {KIND_LABELS.video}</span>
                      : <span className="text-[28px]">{e.src.length <= 4 ? e.src : '🖼'}</span>}
                </button>
                <span
                  className="absolute top-1 left-1 text-[9px] px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: c.bg, color: c.fg, fontWeight: 800 }}
                >
                  {EVIDENCE_SOURCE_LABELS[e.source]}
                </span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-[#9CA3AF] truncate" style={{ fontWeight: 600 }}>
                    {e.uploadedBy ?? '—'}
                  </span>
                  <button
                    onClick={(ev) => { ev.stopPropagation(); downloadOne(e); }}
                    className="w-6 h-6 rounded bg-[#F3F4F6] flex items-center justify-center"
                    aria-label="Скачать"
                  >
                    <Download className="w-3 h-3 text-[#374151]" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filtered.length > 0 && (
        <button
          onClick={() => setOpen({ list: filtered, idx: 0 })}
          className="w-full mt-3 h-10 rounded-xl bg-[#1F2430] text-white text-[12px] active-press inline-flex items-center justify-center gap-1"
          style={{ fontWeight: 700 }}
        >
          <Eye className="w-3 h-3" /> Открыть просмотр
        </button>
      )}

      <MediaPreviewModal
        open={!!open}
        items={open?.list ?? []}
        initialIndex={open?.idx ?? 0}
        onClose={() => setOpen(null)}
      />
    </div>
  );
}

function Pill({ active, onClick, children, color }: { active: boolean; onClick: () => void; children: React.ReactNode; color?: { bg: string; fg: string } }) {
  return (
    <button
      onClick={onClick}
      className="px-3 h-7 rounded-full text-[10px] whitespace-nowrap active-press"
      style={{
        backgroundColor: active ? (color?.bg ?? '#1F2430') : 'white',
        color: active ? (color?.fg ?? 'white') : '#1F2430',
        border: '1px solid #E5E7EB',
        fontWeight: 800,
      }}
    >{children}</button>
  );
}
