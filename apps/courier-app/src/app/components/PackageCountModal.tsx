import { useRef, useState } from 'react';
import { Camera, Minus, Plus, Package, X } from 'lucide-react';
import { useT } from '../i18n';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: { count: number; photo?: string; comment?: string }) => void;
}

export function PackageCountModal({ open, onClose, onConfirm }: Props) {
  const t = useT();
  const [count, setCount] = useState<number>(1);
  const [photo, setPhoto] = useState<string | undefined>();
  const [comment, setComment] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(typeof reader.result === 'string' ? reader.result : undefined);
    reader.readAsDataURL(f);
  }

  function handleConfirm() {
    if (!count || count < 1) { setError(t('pkg.must_set_count')); return; }
    onConfirm({ count, photo, comment: comment.trim() || undefined });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50">
      <div className="w-full max-w-[420px] bg-white rounded-t-3xl pb-[max(16px,env(safe-area-inset-bottom))] fade-in">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <Package className="w-6 h-6 text-emerald-500" />
            <h2 className="text-[20px] font-extrabold">{t('pkg.title')}</h2>
          </div>
          <button onClick={onClose} className="p-2 -mr-2 rounded-full active:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-3 space-y-4">
          <div className="text-sm text-gray-600">{t('pkg.count_hint')}</div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
              {t('pkg.count_label')} <span className="text-rose-500">({t('common.required')})</span>
            </div>
            <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-3 py-2">
              <button
                type="button"
                onClick={() => setCount(c => Math.max(1, c - 1))}
                className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center active:scale-95"
                aria-label="-"
              >
                <Minus className="w-5 h-5" />
              </button>
              <input
                type="number"
                min={1}
                max={20}
                value={count}
                onChange={e => setCount(Math.max(1, Number(e.target.value) || 1))}
                className="w-20 text-center text-3xl font-extrabold bg-transparent outline-none"
              />
              <button
                type="button"
                onClick={() => setCount(c => Math.min(20, c + 1))}
                className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center active:scale-95"
                aria-label="+"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
              {t('pkg.add_photo')}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={handleFile}
            />
            {photo ? (
              <div className="relative">
                <img src={photo} alt="package" className="w-full max-h-48 object-cover rounded-2xl" />
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
              {t('pkg.add_comment')}
            </div>
            <textarea
              rows={2}
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder={t('pkg.comment_placeholder')}
              className="w-full bg-gray-50 rounded-2xl p-3 text-[15px] outline-none resize-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>

          {error && <div className="text-sm text-rose-500 font-semibold">{error}</div>}
        </div>

        <div className="px-5 pt-2 pb-2">
          <button
            onClick={handleConfirm}
            className="w-full h-14 rounded-full bg-emerald-500 text-white text-[17px] font-bold active:bg-emerald-600"
          >
            {t('pkg.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
