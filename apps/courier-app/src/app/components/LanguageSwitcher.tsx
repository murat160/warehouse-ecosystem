import { useState } from 'react';
import { Check, Globe } from 'lucide-react';
import { LANGUAGES, useI18n } from '../i18n';

interface Props {
  variant?: 'button' | 'list';
  className?: string;
}

export function LanguageSwitcher({ variant = 'button', className = '' }: Props) {
  const { lang, setLang, t } = useI18n();
  const [open, setOpen] = useState(false);

  if (variant === 'list') {
    return (
      <div className={className}>
        <div className="text-xs font-bold uppercase tracking-wide text-gray-500 px-4 mb-2">
          {t('settings.language')}
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {LANGUAGES.map((L, idx) => (
            <button
              key={L.code}
              onClick={() => setLang(L.code)}
              className={`w-full flex items-center gap-3 px-4 py-3 active:bg-gray-50 ${
                idx > 0 ? 'border-t border-gray-100' : ''
              }`}
            >
              <span className="text-2xl leading-none">{L.flag}</span>
              <span className="flex-1 text-left text-[15px] font-semibold text-gray-900">{L.label}</span>
              {lang === L.code && <Check className="w-5 h-5 text-emerald-500" />}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const current = LANGUAGES.find(l => l.code === lang) ?? LANGUAGES[0];

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 border border-gray-200 shadow-sm text-sm font-semibold text-gray-900"
      >
        <Globe className="w-4 h-4" />
        <span className="text-base leading-none">{current.flag}</span>
        <span className="uppercase">{current.code}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
            {LANGUAGES.map(L => (
              <button
                key={L.code}
                onClick={() => { setLang(L.code); setOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 active:bg-gray-50 text-left"
              >
                <span className="text-xl leading-none">{L.flag}</span>
                <span className="flex-1 text-sm font-semibold text-gray-900">{L.label}</span>
                {lang === L.code && <Check className="w-4 h-4 text-emerald-500" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
