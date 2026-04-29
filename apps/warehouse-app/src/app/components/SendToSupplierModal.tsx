import { useEffect, useState } from 'react';
import { Send, Camera, Video } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from './Modal';
import { useStore, store } from '../store/useStore';
import type { EvidenceSendItem, EvidenceLinkedTarget, Supplier } from '../domain/types';

export interface SendToSupplierModalProps {
  open: boolean;
  onClose: () => void;
  /**
   * Поставщик предзаполнен из контекста (по invoice/ASN/SKU). Если undefined —
   * складчику нужно выбрать вручную из списка.
   */
  defaultSupplierId?: string;
  /** Уже доступные доказательства, которые можно отправить — складчик отмечает галочками. */
  availableItems: EvidenceSendItem[];
  defaultLinkedTo?: EvidenceLinkedTarget;
  defaultInvoice?: string;
  defaultSku?: string;
  defaultComment?: string;
}

export function SendToSupplierModal({
  open, onClose, defaultSupplierId, availableItems,
  defaultLinkedTo, defaultInvoice, defaultSku, defaultComment,
}: SendToSupplierModalProps) {
  const { suppliers } = useStore();
  const [supplierId, setSupplierId] = useState(defaultSupplierId ?? '');
  const [selectedIdx, setSelectedIdx] = useState<Set<number>>(() => new Set(availableItems.map((_, i) => i)));
  const [comment, setComment] = useState(defaultComment ?? '');
  const [extraPhotos, setExtraPhotos] = useState<EvidenceSendItem[]>([]);

  useEffect(() => {
    if (open) {
      setSupplierId(defaultSupplierId ?? '');
      setSelectedIdx(new Set(availableItems.map((_, i) => i)));
      setComment(defaultComment ?? '');
      setExtraPhotos([]);
    }
  }, [open, defaultSupplierId, availableItems, defaultComment]);

  const supplier: Supplier | undefined = suppliers.find(s => s.id === supplierId);

  const toggle = (i: number) => {
    setSelectedIdx(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const onAddFile = (e: React.ChangeEvent<HTMLInputElement>, kind: 'image' | 'video') => {
    const files = e.target.files;
    if (!files) return;
    const adds: EvidenceSendItem[] = Array.from(files).map(f => ({
      kind, src: URL.createObjectURL(f), source: 'warehouse', title: f.name,
    }));
    setExtraPhotos(prev => [...prev, ...adds]);
    e.target.value = '';
  };

  const submit = () => {
    if (!supplierId) { toast.error('Выберите поставщика'); return; }
    const items = [
      ...availableItems.filter((_, i) => selectedIdx.has(i)),
      ...extraPhotos,
    ];
    if (items.length === 0) { toast.error('Выберите хотя бы один файл'); return; }
    const r = store.sendEvidence({
      supplierId, items, comment,
      linkedTo: defaultLinkedTo,
      invoiceNumber: defaultInvoice,
      sku: defaultSku,
    });
    if (r.ok) {
      toast.success('Отправлено поставщику');
      onClose();
    } else {
      toast.error(r.reason ?? 'Ошибка');
    }
  };

  return (
    <Modal
      open={open} onClose={onClose}
      title="Отправить поставщику"
      size="lg"
      footer={
        <button onClick={submit} className="w-full h-11 rounded-xl bg-[#3730A3] text-white active-press inline-flex items-center justify-center gap-2" style={{ fontWeight: 800 }}>
          <Send className="w-4 h-4" /> Отправить
        </button>
      }
    >
      {!defaultSupplierId && (
        <div className="mb-3">
          <div className="text-[11px] text-[#6B7280] mb-1" style={{ fontWeight: 700 }}>Поставщик</div>
          <select
            value={supplierId}
            onChange={e => setSupplierId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border-2 border-[#E5E7EB] text-[14px]"
            style={{ fontWeight: 600 }}
          >
            <option value="">Выберите…</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} · {s.id}</option>)}
          </select>
        </div>
      )}

      {supplier && (
        <div className="bg-[#F9FAFB] rounded-md px-3 py-2 mb-3 text-[11px]" style={{ fontWeight: 600 }}>
          <div className="text-[#1F2430]" style={{ fontWeight: 800 }}>{supplier.name}</div>
          <div className="text-[#6B7280]">
            {supplier.contactPerson && <>{supplier.contactPerson} · </>}
            {supplier.email ?? supplier.phone} · канал: {supplier.notifyChannel ?? 'email'}
          </div>
          {(defaultInvoice || defaultSku) && (
            <div className="text-[#6B7280] font-mono mt-0.5">
              {defaultInvoice && <>Invoice: {defaultInvoice} </>}
              {defaultSku && <>· SKU: {defaultSku}</>}
            </div>
          )}
        </div>
      )}

      <div className="text-[11px] text-[#6B7280] mb-2" style={{ fontWeight: 700 }}>
        Доступные доказательства ({availableItems.length})
      </div>
      <div className="space-y-1 mb-3 max-h-64 overflow-y-auto">
        {availableItems.length === 0 ? (
          <div className="text-[12px] text-[#6B7280] text-center py-4" style={{ fontWeight: 500 }}>
            Нет готовых файлов — добавьте ниже.
          </div>
        ) : availableItems.map((it, i) => (
          <label
            key={i}
            className="flex items-center gap-2 p-2 rounded-xl cursor-pointer"
            style={{
              backgroundColor: selectedIdx.has(i) ? '#E0E7FF' : '#F9FAFB',
              border: selectedIdx.has(i) ? '2px solid #3730A3' : '2px solid transparent',
              fontWeight: 600,
            }}
          >
            <input
              type="checkbox"
              checked={selectedIdx.has(i)}
              onChange={() => toggle(i)}
              className="accent-[#3730A3]"
            />
            <span className="text-[20px]">{it.kind === 'video' ? '🎬' : '📷'}</span>
            <span className="flex-1 min-w-0">
              <span className="text-[12px] text-[#1F2430] block truncate" style={{ fontWeight: 700 }}>
                {it.title ?? `${it.kind} ${i + 1}`}
              </span>
              <span className="text-[10px] text-[#6B7280] font-mono truncate" style={{ fontWeight: 500 }}>
                {it.source} · {it.src}
              </span>
            </span>
          </label>
        ))}
      </div>

      <div className="flex gap-2 mb-3">
        <label className="flex-1 h-9 rounded-lg bg-[#0EA5E9] text-white text-[12px] active-press inline-flex items-center justify-center gap-1 cursor-pointer" style={{ fontWeight: 700 }}>
          <Camera className="w-3 h-3" /> + Фото
          <input type="file" accept="image/*" multiple onChange={(e) => onAddFile(e, 'image')} className="hidden" />
        </label>
        <label className="flex-1 h-9 rounded-lg bg-[#7C3AED] text-white text-[12px] active-press inline-flex items-center justify-center gap-1 cursor-pointer" style={{ fontWeight: 700 }}>
          <Video className="w-3 h-3" /> + Видео
          <input type="file" accept="video/mp4,video/webm" multiple onChange={(e) => onAddFile(e, 'video')} className="hidden" />
        </label>
      </div>

      {extraPhotos.length > 0 && (
        <div className="text-[11px] text-[#6B7280] mb-2" style={{ fontWeight: 600 }}>
          Будет добавлено: {extraPhotos.length} новых файла
        </div>
      )}

      <div className="text-[11px] text-[#6B7280] mb-1" style={{ fontWeight: 700 }}>Комментарий</div>
      <textarea
        rows={3}
        value={comment}
        onChange={e => setComment(e.target.value)}
        placeholder="Что именно отправляется и о чём попросить ответ…"
        className="w-full px-3 py-2 rounded-xl border-2 border-[#E5E7EB] focus:border-[#3730A3] focus:outline-none text-[14px] resize-none"
        style={{ fontWeight: 500 }}
      />
    </Modal>
  );
}
