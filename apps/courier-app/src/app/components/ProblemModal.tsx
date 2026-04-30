import { useRef, useState } from 'react';
import { AlertTriangle, Camera, CheckCircle2, Trash2, Video, X } from 'lucide-react';
import { useT } from '../i18n';
import type { ProblemType } from '../store/types';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { type: ProblemType; description: string; photos: string[]; videos: string[] }) => void;
}

const TYPES: { code: ProblemType; tk: any }[] = [
  { code: 'cafe_not_ready',        tk: 'problem.type.cafe_not_ready' },
  { code: 'damaged',               tk: 'problem.type.damaged' },
  { code: 'wrong_order',           tk: 'problem.type.wrong_order' },
  { code: 'wrong_address',         tk: 'problem.type.wrong_address' },
  { code: 'customer_no_response',  tk: 'problem.type.customer_no_response' },
  { code: 'customer_refused',      tk: 'problem.type.customer_refused' },
  { code: 'cant_find_address',     tk: 'problem.type.cant_find_address' },
  { code: 'delay',                 tk: 'problem.type.delay' },
  { code: 'transport',             tk: 'problem.type.transport' },
  { code: 'payment',               tk: 'problem.type.payment' },
  { code: 'other',                 tk: 'problem.type.other' },
];

export function ProblemModal({ open, onClose, onSubmit }: Props) {
  const t = useT();
  const [step, setStep] = useState<'type' | 'details' | 'done'>('type');
  const [type, setType] = useState<ProblemType | null>(null);
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  function reset() {
    setStep('type');
    setType(null);
    setDescription('');
    setPhotos([]);
    setVideos([]);
    setError(null);
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    files.forEach(f => {
      const r = new FileReader();
      r.onload = () => {
        if (typeof r.result === 'string') setPhotos(prev => [...prev, r.result as string].slice(0, 6));
      };
      r.readAsDataURL(f);
    });
    e.target.value = '';
  }

  function handleVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    files.forEach(f => {
      const r = new FileReader();
      r.onload = () => {
        if (typeof r.result === 'string') setVideos(prev => [...prev, r.result as string].slice(0, 3));
      };
      r.readAsDataURL(f);
    });
    e.target.value = '';
  }

  function handleSubmit() {
    if (!type) { setError(t('problem.must_select_type')); return; }
    onSubmit({ type, description: description.trim(), photos, videos });
    setStep('done');
    setTimeout(() => { reset(); onClose(); }, 1500);
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/55">
      <div className="w-full max-w-[420px] bg-white rounded-t-3xl pb-[max(16px,env(safe-area-inset-bottom))] fade-in max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            <h2 className="text-[20px] font-extrabold">{t('problem.title')}</h2>
          </div>
          <button onClick={() => { reset(); onClose(); }} className="p-2 -mr-2 rounded-full active:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 'type' && (
          <>
            <div className="px-5 pb-2 text-sm text-gray-600">{t('problem.subtitle')}</div>
            <div className="px-5 mt-1 mb-1">
              <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">{t('problem.types_title')}</div>
            </div>
            <div className="px-5 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 gap-2 pb-2">
                {TYPES.map(({ code, tk }) => (
                  <button
                    key={code}
                    onClick={() => setType(code)}
                    className={`w-full px-4 py-3 rounded-2xl text-left text-[15px] font-semibold border-2 transition-colors ${
                      type === code ? 'bg-amber-50 border-amber-400 text-amber-900' : 'bg-white border-gray-200 text-gray-900'
                    }`}
                  >
                    {t(tk)}
                  </button>
                ))}
              </div>
            </div>
            <div className="px-5 pt-2 pb-2">
              <button
                onClick={() => { if (!type) { setError(t('problem.must_select_type')); return; } setError(null); setStep('details'); }}
                className="w-full h-14 rounded-full bg-amber-500 text-white text-[17px] font-bold active:bg-amber-600"
              >
                {t('common.continue')}
              </button>
              {error && <div className="mt-2 text-center text-sm text-rose-500 font-semibold">{error}</div>}
            </div>
          </>
        )}

        {step === 'details' && (
          <>
            <div className="px-5 overflow-y-auto flex-1 space-y-3 pb-2">
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">{t('problem.description')}</div>
                <textarea
                  rows={4}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder={t('problem.description_placeholder')}
                  className="w-full bg-gray-50 rounded-2xl p-3 text-[15px] outline-none resize-none focus:ring-2 focus:ring-amber-200"
                />
              </div>

              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">{t('common.photo')}</div>
                <input ref={photoRef} type="file" accept="image/*" multiple capture="environment" hidden onChange={handlePhotoChange} />
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((p, idx) => (
                    <div key={idx} className="relative h-24 rounded-xl overflow-hidden bg-gray-100">
                      <img src={p} alt={`photo-${idx}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setPhotos(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {photos.length < 6 && (
                    <button
                      type="button"
                      onClick={() => photoRef.current?.click()}
                      className="h-24 rounded-xl border-2 border-dashed border-gray-200 text-gray-500 flex flex-col items-center justify-center"
                    >
                      <Camera className="w-5 h-5" />
                      <span className="text-xs font-semibold mt-0.5">{t('problem.attach_photo')}</span>
                    </button>
                  )}
                </div>
              </div>

              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">{t('common.video')}</div>
                <input ref={videoRef} type="file" accept="video/*" multiple capture="environment" hidden onChange={handleVideoChange} />
                <div className="grid grid-cols-3 gap-2">
                  {videos.map((v, idx) => (
                    <div key={idx} className="relative h-24 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center">
                      <video src={v} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setVideos(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {videos.length < 3 && (
                    <button
                      type="button"
                      onClick={() => videoRef.current?.click()}
                      className="h-24 rounded-xl border-2 border-dashed border-gray-200 text-gray-500 flex flex-col items-center justify-center"
                    >
                      <Video className="w-5 h-5" />
                      <span className="text-xs font-semibold mt-0.5">{t('problem.attach_video')}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="px-5 pt-2 pb-2 flex gap-3">
              <button onClick={() => setStep('type')} className="px-5 h-14 rounded-full bg-gray-100 text-gray-700 font-semibold">
                {t('common.back')}
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 h-14 rounded-full bg-amber-500 text-white text-[17px] font-bold active:bg-amber-600"
              >
                {t('problem.submit')}
              </button>
            </div>
          </>
        )}

        {step === 'done' && (
          <div className="px-5 py-10 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-[18px] font-extrabold mb-1">{t('problem.submitted')}</h3>
            <p className="text-sm text-gray-600">{t('problem.support_will_review')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
