/**
 * LanguageSelector — compact language switcher used in the dashboard header.
 *
 * Renders a button showing the active language's short code (RU/EN/TR/TK)
 * and opens a popover with all four supported languages. Selection is
 * persisted via the i18n provider's localStorage.
 */
import { useEffect, useRef, useState } from 'react';
import { Globe, Check } from 'lucide-react';
import { useI18n, LANG_META, type Lang } from '../../i18n';

const LANGS: Lang[] = ['ru', 'en', 'tr', 'tk'];

export function LanguageSelector() {
  const { lang, setLang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const active = LANG_META[lang];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        title={t('lang.label')}
        aria-label={t('lang.label')}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors">
        <Globe className="w-4 h-4 text-gray-500" />
        <span className="hidden sm:inline tracking-wide">{active.short}</span>
        <span className="sm:hidden text-base leading-none">{active.flag}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          <p className="px-3 py-2 text-[10px] uppercase tracking-widest text-gray-400 font-bold border-b border-gray-100">
            {t('lang.label')}
          </p>
          <div className="py-1">
            {LANGS.map(code => {
              const meta = LANG_META[code];
              const isActive = code === lang;
              return (
                <button
                  key={code}
                  onClick={() => { setLang(code); setOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                    isActive ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                  }`}>
                  <span className="text-lg leading-none w-5 text-center">{meta.flag}</span>
                  <span className="flex-1">{meta.native}</span>
                  <span className="text-[10px] font-mono text-gray-400">{meta.short}</span>
                  {isActive && <Check className="w-4 h-4 text-blue-600" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
