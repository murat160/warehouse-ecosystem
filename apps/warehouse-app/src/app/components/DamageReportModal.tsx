import { useState } from 'react';
import { Camera, Video } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from './Modal';
import { store } from '../store/useStore';
import { DAMAGE_TYPE_LABELS, type DamageType } from '../domain/types';

export interface DamageReportModalProps {
  open: boolean;
  onClose: () => void;
  defaults: {
    asnId?: string;
    asnItemId?: string;
    supplierId?: string;
    supplierName?: string;
    invoiceNumber?: string;
    sku: string;
  };
}

export function DamageReportModal({ open, onClose, defaults }: DamageReportModalProps) {
  const [type, setType] = useState<DamageType>('broken');
  const [qty, setQty] = useState('1');
  const [desc, setDesc] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);

  const reset = () => {
    setType('broken'); setQty('1'); setDesc(''); setPhotos([]); setVideos([]);
  };

  const onFile = (files: FileList | null, kind: 'photo' | 'video') => {
    if (!files) return;
    const arr = Array.from(files).map(f => URL.createObjectURL(f));
    if (kind === 'photo') setPhotos(p => [...p, ...arr]);
    else                  setVideos(v => [...v, ...arr]);
  };

  const submit = () => {
    const n = parseInt(qty, 10);
    if (!n || n <= 0)         { toast.error('Количество > 0');     return; }
    if (!desc.trim())         { toast.error('Опишите повреждение'); return; }
    store.createDamageReport({
      ...defaults,
      damageType: type, damagedQty: n, description: desc, photos, videos,
    });
    toast.success('Damage report создан + проблема + документ');
    reset(); onClose();
  };

  return (
    <Modal
      open={open} onClose={() => { reset(); onClose(); }}
      title="Повреждение при приёмке"
      footer={<button onClick={submit} className="w-full h-11 rounded-xl bg-[#EF4444] text-white active-press" style={{ fontWeight: 800 }}>Создать damage report</button>}
    >
      <div className="text-[12px] text-[#6B7280] mb-1" style={{ fontWeight: 700 }}>Тип повреждения</div>
      <div className="grid grid-cols-2 gap-1.5 mb-3">
        {(Object.keys(DAMAGE_TYPE_LABELS) as DamageType[]).map(t => (
          <button
            key={t}
            onClick={() => setType(t)}
            className="text-left p-2 rounded-xl text-[12px]"
            style={{
              backgroundColor: type === t ? '#FEE2E2' : '#F9FAFB',
              border: type === t ? '2px solid #EF4444' : '2px solid transparent',
              fontWeight: 700,
            }}
          >{DAMAGE_TYPE_LABELS[t]}</button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <div className="text-[11px] text-[#6B7280] mb-1" style={{ fontWeight: 700 }}>Кол-во повреждено</div>
          <input type="number" value={qty} onChange={e => setQty(e.target.value)} className="w-full px-3 py-2 rounded-xl border-2 border-[#E5E7EB] text-[14px]" style={{ fontWeight: 700 }} />
        </div>
        <div>
          <div className="text-[11px] text-[#6B7280] mb-1" style={{ fontWeight: 700 }}>SKU</div>
          <input value={defaults.sku} disabled className="w-full px-3 py-2 rounded-xl border-2 border-[#E5E7EB] bg-[#F9FAFB] text-[14px] font-mono" style={{ fontWeight: 700 }} />
        </div>
      </div>

      <div className="text-[11px] text-[#6B7280] mb-1" style={{ fontWeight: 700 }}>Описание</div>
      <textarea
        rows={3}
        value={desc}
        onChange={e => setDesc(e.target.value)}
        placeholder="Что произошло, на что обратить внимание…"
        className="w-full px-3 py-2 rounded-xl border-2 border-[#E5E7EB] focus:border-[#EF4444] focus:outline-none text-[14px] resize-none mb-3"
        style={{ fontWeight: 500 }}
      />

      <div className="flex gap-2 mb-3">
        <label className="flex-1 h-10 rounded-xl bg-[#0EA5E9] text-white active-press inline-flex items-center justify-center gap-1 cursor-pointer text-[12px]" style={{ fontWeight: 700 }}>
          <Camera className="w-4 h-4" /> Фото ({photos.length})
          <input type="file" accept="image/*" multiple onChange={e => onFile(e.target.files, 'photo')} className="hidden" />
        </label>
        <label className="flex-1 h-10 rounded-xl bg-[#7C3AED] text-white active-press inline-flex items-center justify-center gap-1 cursor-pointer text-[12px]" style={{ fontWeight: 700 }}>
          <Video className="w-4 h-4" /> Видео ({videos.length})
          <input type="file" accept="video/mp4,video/webm" multiple onChange={e => onFile(e.target.files, 'video')} className="hidden" />
        </label>
      </div>

      {(defaults.invoiceNumber || defaults.supplierName) && (
        <div className="bg-[#F9FAFB] rounded-xl p-2 text-[11px] text-[#374151] font-mono" style={{ fontWeight: 600 }}>
          {defaults.supplierName && <>Поставщик: {defaults.supplierName}<br /></>}
          {defaults.invoiceNumber && <>Invoice: {defaults.invoiceNumber}</>}
        </div>
      )}
    </Modal>
  );
}
