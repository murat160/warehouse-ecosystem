import { useState } from 'react';
import { Globe, Check } from 'lucide-react';
import { LANGS, useLanguage, setLanguage } from '../i18n';

export interface LanguageSwitcherProps {
  variant?: 'compact' | 'wide' | 'pills';
  align?: 'left' | 'right';
}

export function LanguageSwitcher({ variant = 'compact', align = 'right' }: LanguageSwitcherProps) {
  const lang = useLanguage();
  const [open, setOpen] = useState(false);
  const cur = LANGS.find(l => l.code === lang) ?? LANGS[0];

  if (variant === 'pills') {
    return (
      <div className="flex gap-1.5 flex-wrap">
        {LANGS.map(l => (
          <button
            key={l.code}
            onClick={() => setLanguage(l.code)}
            className="px-3 h-9 rounded-full text-[12px] active-press inline-flex items-center gap-1.5"
            style={{
              backgroundColor: lang === l.code ? '#1F2430' : 'rgba(255,255,255,0.1)',
              color: lang === l.code ? 'white' : 'inherit',
              fontWeight: 800,
            }}
          >
            <span>{l.flag}</span> {l.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`${variant === 'wide' ? 'px-3 h-9' : 'w-9 h-9'} rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center gap-1.5 active-press`}
        style={{ fontWeight: 800 }}
        aria-label="Language"
      >
        {variant === 'wide' ? (
          <>
            <span>{cur.flag}</span>
            <span className="text-[12px]">{cur.label}</span>
          </>
        ) : (
          <Globe className="w-4 h-4" />
        )}
      </button>
      {open && (
        <>
          <button className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-label="Close" />
          <div
            className={`absolute z-40 mt-2 ${align === 'right' ? 'right-0' : 'left-0'} bg-white rounded-xl shadow-lg border border-[#E5E7EB] min-w-[180px] overflow-hidden`}
          >
            {LANGS.map(l => (
              <button
                key={l.code}
                onClick={() => { setLanguage(l.code); setOpen(false); }}
                className="w-full px-3 py-2 text-left text-[13px] flex items-center gap-2 hover:bg-[#F9FAFB]"
                style={{ fontWeight: 700, color: '#1F2430' }}
              >
                <span>{l.flag}</span>
                <span className="flex-1">{l.label}</span>
                {l.code === lang && <Check className="w-4 h-4 text-[#10B981]" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
