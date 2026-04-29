import { useMemo, useState } from 'react';
import { Camera, Video, Trash2, FileWarning, Send, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from './Modal';
import { MediaPreviewModal, type MediaItem } from './MediaPreviewModal';
import { useStore, store } from '../store/useStore';
import {
  PARTIAL_RECEIVE_REASON_LABELS,
  type PartialReceiveLine, type PartialReceiveReason, type Asn, type EvidenceSendItem,
} from '../domain/types';

export interface PartialReceiveModalProps {
  open: boolean;
  asn: Asn;
  onClose: () => void;
  onCreateDispute?: (defaults: { sku: string; supplierMediaId?: string }) => void;
  onSendEvidence?: (defaults: { sku: string; items: EvidenceSendItem[] }) => void;
}

interface DraftLine extends PartialReceiveLine {}

export function PartialReceiveModal({ open, asn, onClose, onCreateDispute, onSendEvidence }: PartialReceiveModalProps) {
  const { skus } = useStore();
  const [lines, setLines] = useState<DraftLine[]>(() => asn.items.map(it => ({
    asnItemId: it.id, sku: it.sku,
    expectedQty: it.expectedQty,
    receivedQty: it.expectedQty - it.damagedQty,
    damagedQty: it.damagedQty,
    missingQty: 0,
    reason: 'damaged',
    comment: '',
    photos: [], videos: [],
  })));
  const [media, setMedia] = useState<{ items: MediaItem[]; index: number } | null>(null);

  const setField = (idx: number, patch: Partial<DraftLine>) => {
    setLines(prev => prev.map((l, i) => {
      if (i !== idx) return l;
      const next = { ...l, ...patch };
      const expected = next.expectedQty;
      const received = Math.max(0, Number(next.receivedQty) || 0);
      const damaged  = Math.max(0, Number(next.damagedQty)  || 0);
      const missing  = Math.max(0, expected - received - damaged);
      return { ...next, receivedQty: received, damagedQty: damaged, missingQty: missing };
    }));
  };

  const addFile = (idx: number, files: FileList | null, kind: 'photo' | 'video') => {
    if (!files) return;
    const arr = Array.from(files).map(f => URL.createObjectURL(f));
    setLines(prev => prev.map((l, i) => i !== idx ? l
      : kind === 'photo'
        ? { ...l, photos: [...l.photos, ...arr] }
        : { ...l, videos: [...l.videos, ...arr] }
    ));
  };

  const removeMedia = (idx: number, kind: 'photo' | 'video', mIdx: number) => {
    setLines(prev => prev.map((l, i) => {
      if (i !== idx) return l;
      if (kind === 'photo') return { ...l, photos: l.photos.filter((_, k) => k !== mIdx) };
      return { ...l, videos: l.videos.filter((_, k) => k !== mIdx) };
    }));
  };

  const totals = useMemo(() => {
    return lines.reduce((acc, l) => ({
      received: acc.received + l.receivedQty,
      damaged:  acc.damaged  + l.damagedQty,
      missing:  acc.missing  + l.missingQty,
    }), { received: 0, damaged: 0, missing: 0 });
  }, [lines]);

  const save = () => {
    // Валидация: received + damaged ≤ expected
    for (const l of lines) {
      if (l.receivedQty + l.damagedQty > l.expectedQty) {
        toast.error(`${l.sku}: принято + брак больше, чем ожидалось`);
        return;
      }
    }
    const r = store.partialReceiveAsnDetailed(asn.id, lines);
    if (r.ok) {
      toast.success(`Частичная приёмка зафиксирована · ${r.damageReportIds.length} damage report(ов)`);
      if (totals.missing > 0) {
        toast(`Недостача ×${totals.missing}. Рекомендуется создать спор с поставщиком.`);
      }
      onClose();
    } else {
      toast.error(r.reason ?? 'Ошибка');
    }
  };

  const allEvidence: EvidenceSendItem[] = useMemo(() => {
    const out: EvidenceSendItem[] = [];
    for (const l of lines) {
      l.photos.forEach(src => out.push({ kind: 'image', src, source: 'warehouse', title: `Фото ${l.sku}` }));
      l.videos.forEach(src => out.push({ kind: 'video', src, source: 'warehouse', title: `Видео ${l.sku}` }));
    }
    return out;
  }, [lines]);

  return (
    <>
      <Modal
        open={open} onClose={onClose}
        title={`Частичная приёмка · ${asn.id}`}
        size="lg"
        footer={
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
              <Mini label="Принято"   value={totals.received} color="#10B981" />
              <Mini label="Брак"      value={totals.damaged}  color="#EF4444" />
              <Mini label="Недостача" value={totals.missing}  color="#F59E0B" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={save} className="h-11 rounded-xl bg-[#10B981] text-white active-press" style={{ fontWeight: 800 }}>
                Сохранить частичную приёмку
              </button>
              <button
                onClick={() => onCreateDispute?.({ sku: lines.find(l => l.missingQty > 0 || l.damagedQty > 0)?.sku ?? lines[0].sku })}
                className="h-11 rounded-xl bg-[#3730A3] text-white active-press inline-flex items-center justify-center gap-1"
                style={{ fontWeight: 800 }}
              ><FileWarning className="w-4 h-4" /> Создать спор</button>
              <button
                onClick={() => onSendEvidence?.({
                  sku: lines.find(l => l.photos.length || l.videos.length)?.sku ?? lines[0].sku,
                  items: allEvidence,
                })}
                disabled={allEvidence.length === 0}
                className="h-11 rounded-xl bg-[#0369A1] text-white active-press inline-flex items-center justify-center gap-1 disabled:opacity-50"
                style={{ fontWeight: 800 }}
              ><Send className="w-4 h-4" /> Отправить доказательства</button>
              <button onClick={onClose} className="h-11 rounded-xl bg-[#F3F4F6] text-[#1F2430] active-press" style={{ fontWeight: 800 }}>
                Отмена
              </button>
            </div>
          </div>
        }
      >
        <div className="bg-[#F9FAFB] rounded-xl p-2 mb-3 text-[11px] font-mono" style={{ fontWeight: 600 }}>
          Поставщик: <b>{asn.supplierName}</b> · Invoice: <b>{asn.invoiceNumber}</b> · ASN: <b>{asn.id}</b>
        </div>

        <div className="space-y-3">
          {lines.map((l, i) => {
            const sku = skus.find(s => s.sku === l.sku);
            const lineMedia: MediaItem[] = [
              ...l.photos.map((src, k): MediaItem => ({ kind: 'image', src, title: `Фото ${k + 1}`, sku: l.sku })),
              ...l.videos.map((src, k): MediaItem => ({ kind: 'video', src, title: `Видео ${k + 1}`, sku: l.sku })),
            ];
            return (
              <div key={l.asnItemId} className="border-2 border-[#E5E7EB] rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[24px]">{sku?.photo ?? '📦'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-[#1F2430] truncate" style={{ fontWeight: 800 }}>{sku?.name ?? l.sku}</div>
                    <div className="text-[11px] text-[#6B7280] font-mono truncate" style={{ fontWeight: 600 }}>
                      {l.sku} · BC {sku?.barcode ?? '—'} · ожидалось {l.expectedQty}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <NumField label="Принято"  value={l.receivedQty} onChange={(v) => setField(i, { receivedQty: v })} />
                  <NumField label="Брак"     value={l.damagedQty}  onChange={(v) => setField(i, { damagedQty: v })} />
                  <div>
                    <div className="text-[10px] text-[#6B7280] mb-0.5" style={{ fontWeight: 700 }}>Недостача</div>
                    <input
                      readOnly value={l.missingQty}
                      className="w-full px-2 py-2 rounded-lg border-2 border-[#FEF3C7] bg-[#FEF9C3] text-[13px] text-[#92400E]"
                      style={{ fontWeight: 800 }}
                    />
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-[#6B7280] mb-0.5" style={{ fontWeight: 700 }}>Причина</div>
                  <select
                    value={l.reason}
                    onChange={(e) => setField(i, { reason: e.target.value as PartialReceiveReason })}
                    className="w-full px-2 py-2 rounded-lg border-2 border-[#E5E7EB] text-[13px]"
                    style={{ fontWeight: 700 }}
                  >
                    {(Object.keys(PARTIAL_RECEIVE_REASON_LABELS) as PartialReceiveReason[]).map(r =>
                      <option key={r} value={r}>{PARTIAL_RECEIVE_REASON_LABELS[r]}</option>
                    )}
                  </select>
                </div>

                <div>
                  <div className="text-[10px] text-[#6B7280] mb-0.5" style={{ fontWeight: 700 }}>Комментарий</div>
                  <input
                    value={l.comment ?? ''}
                    onChange={(e) => setField(i, { comment: e.target.value })}
                    placeholder="Подробности…"
                    className="w-full px-2 py-2 rounded-lg border-2 border-[#E5E7EB] text-[13px]"
                    style={{ fontWeight: 600 }}
                  />
                </div>

                <div className="flex gap-2">
                  <label className="flex-1 h-9 rounded-lg bg-[#0EA5E9] text-white text-[12px] active-press inline-flex items-center justify-center gap-1 cursor-pointer" style={{ fontWeight: 700 }}>
                    <Camera className="w-3 h-3" /> + Фото
                    <input type="file" accept="image/*" multiple onChange={(e) => addFile(i, e.target.files, 'photo')} className="hidden" />
                  </label>
                  <label className="flex-1 h-9 rounded-lg bg-[#7C3AED] text-white text-[12px] active-press inline-flex items-center justify-center gap-1 cursor-pointer" style={{ fontWeight: 700 }}>
                    <Video className="w-3 h-3" /> + Видео
                    <input type="file" accept="video/mp4,video/webm" multiple onChange={(e) => addFile(i, e.target.files, 'video')} className="hidden" />
                  </label>
                </div>

                {(l.photos.length > 0 || l.videos.length > 0) && (
                  <div className="flex items-center gap-1 flex-wrap">
                    {[...l.photos.map((src, k) => ({ kind: 'photo' as const, src, k })), ...l.videos.map((src, k) => ({ kind: 'video' as const, src, k }))].map((m, idx) => (
                      <div key={idx} className="relative">
                        <button
                          onClick={() => setMedia({ items: lineMedia, index: idx })}
                          className="w-12 h-12 rounded-lg bg-[#F3F4F6] flex items-center justify-center text-[18px] active-press"
                        >
                          {m.kind === 'photo' ? '📷' : '🎬'}
                        </button>
                        <button
                          onClick={() => removeMedia(i, m.kind, m.k)}
                          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#EF4444] text-white flex items-center justify-center"
                          aria-label="Удалить"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setMedia({ items: lineMedia, index: 0 })}
                      className="px-2 h-12 rounded-lg bg-[#1F2430] text-white text-[10px] active-press inline-flex items-center gap-1"
                      style={{ fontWeight: 700 }}
                    >
                      <Eye className="w-3 h-3" /> Смотреть
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Modal>

      <MediaPreviewModal
        open={!!media}
        items={media?.items ?? []}
        initialIndex={media?.index ?? 0}
        onClose={() => setMedia(null)}
      />
    </>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div>
      <div className="text-[10px] text-[#6B7280] mb-0.5" style={{ fontWeight: 700 }}>{label}</div>
      <input
        type="number" min={0}
        value={value}
        onChange={(e) => onChange(Math.max(0, parseInt(e.target.value, 10) || 0))}
        className="w-full px-2 py-2 rounded-lg border-2 border-[#E5E7EB] focus:border-[#10B981] focus:outline-none text-[13px]"
        style={{ fontWeight: 800 }}
      />
    </div>
  );
}

function Mini({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-[#F9FAFB] rounded-lg p-2">
      <div className="text-[16px]" style={{ fontWeight: 900, color }}>{value}</div>
      <div className="text-[10px] text-[#6B7280]" style={{ fontWeight: 700 }}>{label}</div>
    </div>
  );
}
