import { useT } from '../i18n';

interface ConfirmOfflineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ConfirmOfflineModal({ isOpen, onClose, onConfirm }: ConfirmOfflineModalProps) {
  const t = useT();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full bg-white rounded-t-3xl p-6 fade-in shadow-2xl pb-[max(24px,env(safe-area-inset-bottom))]">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-3">{t('online.confirm_offline')}</h2>
        <p className="text-gray-600 mb-8 text-base">{t('online.confirm_offline_desc')}</p>

        <div className="space-y-3">
          <button
            onClick={onClose}
            className="w-full h-[56px] bg-[#00D4FF] active:bg-[#00C4EF] text-gray-900 rounded-full font-semibold text-lg transition-colors shadow-sm"
          >
            {t('online.stay_online')}
          </button>
          <button
            onClick={onConfirm}
            className="w-full h-[56px] bg-[#C5003E] active:bg-[#B0003A] text-white rounded-full font-semibold text-lg transition-colors shadow-sm"
          >
            {t('online.go_offline')}
          </button>
        </div>
      </div>
    </div>
  );
}
