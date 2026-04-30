import { useRef, useState } from 'react';
import { Camera, CheckCircle2, X } from 'lucide-react';
import { useT } from '../i18n';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: { photo?: string; code?: string; comment?: string }) => void;
}

export function DeliveryProofModal({ open, onClose, onConfirm }: Props) {
  const t = useT();
  const [photo, setPhoto] = useState<string | undefined>();
  const [code, setCode] = useState('');
  const [comment, setComment] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(typeof reader.result === 'string' ? reader.result : undefined);
    reader.readAsDataURL(f);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50">
      <div className="w-full max-w-[420px] bg-white rounded-t-3xl pb-[max(16px,env(safe-area-inset-bottom))] fade-in">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            <h2 className="text-[20px] font-extrabold">{t('proof.title')}</h2>
          </div>
          <button onClick={onClose} className="p-2 -mr-2 rounded-full active:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-3 space-y-4">
          <div className="text-[15px] text-gray-700">{t('proof.confirm_handoff')}</div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
              {t('proof.optional_photo')}
            </div>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={handleFile} />
            {photo ? (
              <div className="relative">
                <img src={photo} alt="proof" className="w-full max-h-48 object-cover rounded-2xl" />
                <button
                  type="button"
                  onClick={() => setPhoto(undefined)}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full h-24 rounded-2xl border-2 border-dashed border-gray-200 text-gray-500 flex flex-col items-center justify-center gap-1 active:bg-gray-50"
              >
                <Camera className="w-6 h-6" />
                <span className="text-sm font-semibold">{t('common.photo')}</span>
              </button>
            )}
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
              {t('proof.optional_code')}
            </div>
            <input
              value={code}
              onChange={e => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
              placeholder={t('proof.code_placeholder')}
              inputMode="numeric"
              className="w-full bg-gray-50 rounded-2xl px-4 py-3 text-[17px] tracking-widest font-bold outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
              {t('proof.optional_comment')}
            </div>
            <textarea
              rows={2}
              value={comment}
              onChange={e => setComment(e.target.value)}
              className="w-full bg-gray-50 rounded-2xl p-3 text-[15px] outline-none resize-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>
        </div>

        <div className="px-5 pt-2 pb-2">
          <button
            onClick={() => onConfirm({
              photo,
              code: code.trim() || undefined,
              comment: comment.trim() || undefined,
            })}
            className="w-full h-14 rounded-full bg-emerald-500 text-white text-[17px] font-bold active:bg-emerald-600"
          >
            {t('proof.complete')}
          </button>
        </div>
      </div>
    </div>
  );
}
