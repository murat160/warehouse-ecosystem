import { useState } from 'react';
import { toast } from 'sonner';
import { Modal } from './Modal';
import { store } from '../store/useStore';
import { DISPUTE_REASON_LABELS, type DisputeReason } from '../domain/types';

export interface SupplierDisputeModalProps {
  open: boolean;
  onClose: () => void;
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

export function SupplierDisputeModal({ open, onClose, defaults }: SupplierDisputeModalProps) {
  const [reason, setReason] = useState<DisputeReason>(defaults.initialReason ?? 'damaged_goods');
  const [desc, setDesc] = useState('');
  const [qty, setQty] = useState(defaults.initialDamagedQty ? String(defaults.initialDamagedQty) : '');
  const [amount, setAmount] = useState('');

  const reset = () => {
    setReason(defaults.initialReason ?? 'damaged_goods'); setDesc(''); setQty(''); setAmount('');
  };

  const submit = () => {
    if (!desc.trim()) { toast.error('Опишите ситуацию'); return; }
    const id = store.createSupplierDispute({
      supplierId: defaults.supplierId, supplierName: defaults.supplierName,
      invoiceNumber: defaults.invoiceNumber, asnId: defaults.asnId, sku: defaults.sku,
      reason, description: desc,
      damagedQty: qty ? parseInt(qty, 10) : undefined,
      claimedAmount: amount ? parseFloat(amount) : undefined,
      supplierMediaId: defaults.supplierMediaId, damageReportId: defaults.damageReportId,
    });
    toast.success(`Спор ${id} создан (черновик)`);
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
        className="w-full px-3 py-2 rounded-xl border-2 border-[#E5E7EB] focus:border-[#3730A3] focus:outline-none text-[14px] resize-none"
        style={{ fontWeight: 500 }}
      />
    </Modal>
  );
}
