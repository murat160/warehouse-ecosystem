import { useState } from 'react';
import { Camera, Video, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from './Modal';
import { store } from '../store/useStore';
import { DISPUTE_REASON_LABELS, type DisputeReason } from '../domain/types';

export interface SupplierDisputeModalProps {
  open: boolean;
  onClose: () => void;
  /** Колбэк после успешного создания спора. */
  onCreated?: (disputeId: string) => void;
  defaults: {
    supplierId: string;
    supplierName: string;
    invoiceNumber?: string;
    asnId?: string;
    sku: string;
    supplierMediaId?: string;
    damageReportId?: string;
    initialReason?: DisputeReason;
    initialDamagedQty?: number;
  };
}

export function SupplierDisputeModal({ open, onClose, onCreated, defaults }: SupplierDisputeModalProps) {
  const [reason, setReason] = useState<DisputeReason>(defaults.initialReason ?? 'damaged_goods');
  const [desc, setDesc] = useState('');
  const [qty, setQty] = useState(defaults.initialDamagedQty ? String(defaults.initialDamagedQty) : '');
  const [amount, setAmount] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [forceWithoutEvidence, setForceWithoutEvidence] = useState(false);

  const reset = () => {
    setReason(defaults.initialReason ?? 'damaged_goods'); setDesc(''); setQty(''); setAmount('');
    setPhotos([]); setVideos([]); setForceWithoutEvidence(false);
  };

  const onAddFile = (e: React.ChangeEvent<HTMLInputElement>, kind: 'photo' | 'video') => {
    const files = e.target.files;
    if (!files) return;
    const arr = Array.from(files).map(f => URL.createObjectURL(f));
    if (kind === 'photo') setPhotos(p => [...p, ...arr]);
    else                  setVideos(p => [...p, ...arr]);
    e.target.value = '';
  };

  const hasEvidence = photos.length + videos.length > 0;

  const submit = () => {
    if (!desc.trim()) { toast.error('Опишите ситуацию'); return; }
    if (!hasEvidence && !forceWithoutEvidence) {
      toast.error('Нет доказательств. Загрузите фото/видео или нажмите «Создать как черновик».');
      return;
    }
    const id = store.createSupplierDispute({
      supplierId: defaults.supplierId, supplierName: defaults.supplierName,
      invoiceNumber: defaults.invoiceNumber, asnId: defaults.asnId, sku: defaults.sku,
      reason, description: desc,
      damagedQty: qty ? parseInt(qty, 10) : undefined,
      claimedAmount: amount ? parseFloat(amount) : undefined,
      supplierMediaId: defaults.supplierMediaId, damageReportId: defaults.damageReportId,
    });
    photos.forEach(src => store.uploadDisputeMedia(id, 'photo', src));
    videos.forEach(src => store.uploadDisputeMedia(id, 'video', src));
    if (hasEvidence) {
      store.changeDisputeStatus(id, 'sent_to_supplier');
      toast.success(`Спор ${id} создан · отправлен поставщику`);
    } else {
      toast(`Спор ${id} создан как черновик (без доказательств)`);
    }
    // Авто-создаём internal + supplier чаты
    store.getOrCreateInternalThread({
      kind: 'dispute', refId: id, title: `Спор ${id} · ${defaults.supplierName}`, priority: 'urgent',
    });
    store.getOrCreateSupplierThread({
      supplierId: defaults.supplierId, supplierName: defaults.supplierName,
      linkedTo: { type: 'dispute', id }, invoiceNumber: defaults.invoiceNumber, sku: defaults.sku,
    });
    onCreated?.(id);
    reset(); onClose();
  };

  return (
    <Modal
      open={open} onClose={() => { reset(); onClose(); }}
      title="Спор с поставщиком"
      footer={<button onClick={submit} className="w-full h-11 rounded-xl bg-[#3730A3] text-white active-press" style={{ fontWeight: 800 }}>Создать спор</button>}
    >
      <div className="bg-[#F9FAFB] rounded-xl p-2 text-[11px] text-[#374151] font-mono mb-3" style={{ fontWeight: 600 }}>
        Поставщик: {defaults.supplierName}<br />
        SKU: {defaults.sku}
        {defaults.invoiceNumber && <><br />Invoice: {defaults.invoiceNumber}</>}
      </div>

      <div className="text-[12px] text-[#6B7280] mb-1" style={{ fontWeight: 700 }}>Причина спора</div>
      <div className="space-y-1 mb-3 max-h-48 overflow-y-auto">
        {(Object.keys(DISPUTE_REASON_LABELS) as DisputeReason[]).map(r => (
          <button
            key={r}
            onClick={() => setReason(r)}
            className="w-full text-left p-2 rounded-xl text-[13px]"
            style={{
              backgroundColor: reason === r ? '#E0E7FF' : '#F9FAFB',
              border: reason === r ? '2px solid #3730A3' : '2px solid transparent',
              fontWeight: 700,
            }}
          >{DISPUTE_REASON_LABELS[r]}</button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <div className="text-[11px] text-[#6B7280] mb-1" style={{ fontWeight: 700 }}>Кол-во проблемных</div>
          <input type="number" value={qty} onChange={e => setQty(e.target.value)} className="w-full px-3 py-2 rounded-xl border-2 border-[#E5E7EB] text-[14px]" style={{ fontWeight: 700 }} />
        </div>
        <div>
          <div className="text-[11px] text-[#6B7280] mb-1" style={{ fontWeight: 700 }}>Сумма претензии</div>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full px-3 py-2 rounded-xl border-2 border-[#E5E7EB] text-[14px]" style={{ fontWeight: 700 }} />
        </div>
      </div>

      <div className="text-[11px] text-[#6B7280] mb-1" style={{ fontWeight: 700 }}>Описание</div>
      <textarea
        rows={4}
        value={desc}
        onChange={e => setDesc(e.target.value)}
        placeholder="Подробности для поставщика…"
        className="w-full px-3 py-2 rounded-xl border-2 border-[#E5E7EB] focus:border-[#3730A3] focus:outline-none text-[14px] resize-none mb-3"
        style={{ fontWeight: 500 }}
      />

      <div className="text-[11px] text-[#6B7280] mb-1" style={{ fontWeight: 700 }}>Доказательства склада</div>
      <div className="flex gap-2 mb-2">
        <label className="flex-1 h-9 rounded-lg bg-[#0EA5E9] text-white text-[12px] active-press inline-flex items-center justify-center gap-1 cursor-pointer" style={{ fontWeight: 700 }}>
          <Camera className="w-3 h-3" /> + Фото ({photos.length})
          <input type="file" accept="image/*" multiple onChange={(e) => onAddFile(e, 'photo')} className="hidden" />
        </label>
        <label className="flex-1 h-9 rounded-lg bg-[#7C3AED] text-white text-[12px] active-press inline-flex items-center justify-center gap-1 cursor-pointer" style={{ fontWeight: 700 }}>
          <Video className="w-3 h-3" /> + Видео ({videos.length})
          <input type="file" accept="video/mp4,video/webm" multiple onChange={(e) => onAddFile(e, 'video')} className="hidden" />
        </label>
      </div>

      {!hasEvidence && (
        <div className="bg-[#FEF3C7] border-l-4 border-[#F59E0B] rounded-md p-2 text-[11px] text-[#92400E] mb-2" style={{ fontWeight: 600 }}>
          <div className="inline-flex items-center gap-1 mb-1" style={{ fontWeight: 800 }}>
            <AlertTriangle className="w-3 h-3" /> Спор без доказательств
          </div>
          Если нет фото/видео — поставщику будет сложно ответить. Желательно приложить хотя бы одно фото.
          <label className="inline-flex items-center gap-1 mt-1.5">
            <input type="checkbox" checked={forceWithoutEvidence} onChange={(e) => setForceWithoutEvidence(e.target.checked)} className="accent-[#F59E0B]" />
            <span>Создать как черновик без доказательств</span>
          </label>
        </div>
      )}
    </Modal>
  );
}
