import { useState } from 'react';
import { useT } from '../i18n';

interface DeclineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDecline: (reason: string) => void;
  onStartTask: () => void;
}

const REASONS = [
  { code: 'too_far', tk: 'offer.decline.too_far' as const },
  { code: 'busy',    tk: 'offer.decline.busy' as const },
  { code: 'other',   tk: 'offer.decline.other' as const },
];

export function DeclineModal({ isOpen, onClose, onConfirmDecline, onStartTask }: DeclineModalProps) {
  const t = useT();
  const [reason, setReason] = useState<string>('too_far');
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full bg-white rounded-t-3xl p-6 fade-in shadow-2xl pb-[max(24px,env(safe-area-inset-bottom))]">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>

        <h2 className="text-[20px] font-bold text-gray-900 mb-2">{t('offer.decline')}</h2>
        <p className="text-gray-600 mb-3 text-sm">{t('offer.decline_reason')}</p>

        <div className="space-y-2 mb-6">
          {REASONS.map(r => (
            <button
              key={r.code}
              onClick={() => setReason(r.code)}
              className={`w-full px-4 py-3 rounded-2xl text-left text-[15px] font-semibold border-2 ${
                reason === r.code ? 'border-emerald-400 bg-emerald-50 text-emerald-900' : 'border-gray-200 bg-white text-gray-900'
              }`}
            >
              {t(r.tk)}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <button
            onClick={onStartTask}
            className="w-full h-[56px] bg-[#00D4FF] active:bg-[#00C4EF] text-gray-900 rounded-full font-semibold text-lg shadow-sm"
          >
            {t('offer.swipe_accept')}
          </button>
          <button
            onClick={() => onConfirmDecline(reason)}
            className="w-full h-[56px] bg-[#C5003E] active:bg-[#B0003A] text-white rounded-full font-semibold text-lg shadow-sm"
          >
            {t('offer.decline')}
          </button>
        </div>
      </div>
    </div>
  );
}
