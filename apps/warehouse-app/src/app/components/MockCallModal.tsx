import { useState } from 'react';
import { Phone, PhoneCall, X } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from './Modal';
import { useStore, store } from '../store/useStore';
import { ROLE_LABELS } from '../domain/roles';

export interface MockCallModalProps {
  open: boolean;
  workerId: string | null;
  onClose: () => void;
}

const ONLINE_STATUS = (shiftStatus: 'on_shift' | 'on_break' | 'off') =>
  shiftStatus === 'on_shift' ? { label: 'online', color: '#10B981' }
    : shiftStatus === 'on_break' ? { label: 'busy',   color: '#F59E0B' }
    :                              { label: 'offline', color: '#9CA3AF' };

export function MockCallModal({ open, workerId, onClose }: MockCallModalProps) {
  const { workers } = useStore();
  const [calling, setCalling] = useState(false);
  const w = workerId ? workers.find(x => x.id === workerId) : null;

  if (!w) return null;
  const status = ONLINE_STATUS(w.shiftStatus);

  const startCall = () => {
    setCalling(true);
    store.viewMedia(`Mock call → ${w.name} (${w.id})`);
    toast.success(`Звоним ${w.name}…`);
  };

  const cancel = () => {
    setCalling(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={cancel}
      title={calling ? 'Идёт звонок…' : 'Позвонить сотруднику'}
      size="sm"
      footer={
        calling ? (
          <button onClick={cancel} className="w-full h-11 rounded-xl bg-[#EF4444] text-white active-press inline-flex items-center justify-center gap-2" style={{ fontWeight: 800 }}>
            <X className="w-4 h-4" /> Завершить
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button onClick={onClose} className="h-11 rounded-xl bg-[#F3F4F6] text-[#1F2430] active-press" style={{ fontWeight: 800 }}>
              Отмена
            </button>
            <button onClick={startCall} className="h-11 rounded-xl bg-[#10B981] text-white active-press inline-flex items-center justify-center gap-2" style={{ fontWeight: 800 }}>
              <PhoneCall className="w-4 h-4" /> Начать звонок
            </button>
          </div>
        )
      }
    >
      <div className="text-center py-4">
        <div className="mx-auto w-20 h-20 rounded-full bg-[#E0F2FE] flex items-center justify-center mb-3">
          <Phone className="w-9 h-9 text-[#0369A1]" />
        </div>
        <div className="text-[18px] text-[#1F2430]" style={{ fontWeight: 900 }}>{w.name}</div>
        <div className="text-[12px] text-[#6B7280] mb-2" style={{ fontWeight: 600 }}>
          {ROLE_LABELS[w.role]} · {w.id}
        </div>
        <div className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full bg-[#F3F4F6]" style={{ fontWeight: 800 }}>
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: status.color }} />
          <span style={{ color: status.color }}>{status.label}</span>
        </div>
        {calling && (
          <div className="text-[12px] text-[#6B7280] mt-4 animate-pulse" style={{ fontWeight: 700 }}>
            Установка соединения (mock)…
          </div>
        )}
      </div>
    </Modal>
  );
}
