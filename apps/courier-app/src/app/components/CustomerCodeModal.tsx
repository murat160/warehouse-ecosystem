import { useEffect, useRef, useState } from 'react';
import { KeyRound, ShieldCheck, X } from 'lucide-react';
import { useT } from '../i18n';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (code: string) => { ok: boolean; reason?: 'wrong_code' | 'no_active' };
}

export function CustomerCodeModal({ open, onClose, onConfirm }: Props) {
  const t = useT();
  const [digits, setDigits] = useState<string[]>(['', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  useEffect(() => {
    if (open) {
      setDigits(['', '', '', '']);
      setError(null);
      setSubmitting(false);
      setTimeout(() => inputs[0].current?.focus(), 50);
    }
  }, [open]);

  if (!open) return null;

  const code = digits.join('');
  const ready = code.length === 4 && /^[0-9]{4}$/.test(code);

  function setDigit(idx: number, v: string) {
    const cleaned = v.replace(/[^0-9]/g, '').slice(-1);
    setError(null);
    setDigits(prev => {
      const next = [...prev];
      next[idx] = cleaned;
      return next;
    });
    if (cleaned && idx < 3) inputs[idx + 1].current?.focus();
  }

  function onKey(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputs[idx - 1].current?.focus();
    }
  }

  function onPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 4);
    if (!pasted) return;
    e.preventDefault();
    const arr = pasted.split('');
    setDigits([arr[0] ?? '', arr[1] ?? '', arr[2] ?? '', arr[3] ?? '']);
    inputs[Math.min(3, pasted.length - 1)].current?.focus();
  }

  function handleConfirm() {
    if (!ready) { setError(t('proof.code_required')); return; }
    setSubmitting(true);
    const res = onConfirm(code);
    setSubmitting(false);
    if (!res.ok) {
      setError(t('code.invalid'));
      setDigits(['', '', '', '']);
      inputs[0].current?.focus();
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/55">
      <div className="w-full max-w-[420px] bg-white rounded-t-3xl pb-[max(16px,env(safe-area-inset-bottom))] fade-in">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <KeyRound className="w-6 h-6 text-emerald-500" />
            <h2 className="text-[20px] font-extrabold">{t('code.title')}</h2>
          </div>
          <button onClick={onClose} className="p-2 -mr-2 rounded-full active:bg-gray-100" aria-label={t('common.close')}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-2 space-y-4">
          <p className="text-sm text-gray-600">{t('code.subtitle')}</p>

          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 flex items-start gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div className="text-[12px] text-emerald-900 font-semibold">
              <div>{t('proof.ask_customer')}</div>
              <div className="text-emerald-800/80 font-normal">{t('code.hint')}</div>
            </div>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
              {t('code.label')}
            </div>
            <div className="flex justify-center gap-2">
              {digits.map((d, idx) => (
                <input
                  key={idx}
                  ref={inputs[idx]}
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={d}
                  onChange={(e) => setDigit(idx, e.target.value)}
                  onKeyDown={(e) => onKey(idx, e)}
                  onPaste={onPaste}
                  className="w-14 h-16 text-center text-3xl font-extrabold bg-gray-50 rounded-2xl border-2 border-gray-200 focus:border-emerald-500 focus:outline-none"
                  aria-label={`digit ${idx + 1}`}
                />
              ))}
            </div>
            {error && <div className="mt-2 text-center text-sm text-rose-500 font-semibold">{error}</div>}
          </div>
        </div>

        <div className="px-5 pt-2 pb-2">
          <button
            onClick={handleConfirm}
            disabled={!ready || submitting}
            className={`w-full h-14 rounded-full text-[17px] font-bold transition-colors ${
              ready ? 'bg-emerald-500 text-white active:bg-emerald-600' : 'bg-gray-200 text-gray-400'
            }`}
          >
            {t('code.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
