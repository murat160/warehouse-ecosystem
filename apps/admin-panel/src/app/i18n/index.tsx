/**
 * i18n — language provider, hook, and re-exports.
 *
 * Usage:
 *   <LanguageProvider>...</LanguageProvider>     // mount once at App root
 *   const { t, lang, setLang } = useI18n();      // any component
 *   <h1>{t('security.title')}</h1>
 *
 * Storage:
 *   Selected language is persisted in localStorage under `admin-panel.lang`.
 *   On first load, falls back to navigator.language → 'ru'.
 *
 * Falls back to Russian if a key is missing from the active dictionary
 * (TS prevents this at compile time via `Dictionary` type, but the runtime
 * fallback is a safety net for hand-rolled keys).
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ru, type DictKey, type Dictionary } from './dictionaries/ru';
import { en } from './dictionaries/en';
import { tr } from './dictionaries/tr';
import { tk } from './dictionaries/tk';

export type Lang = 'ru' | 'en' | 'tr' | 'tk';

const DICTS: Record<Lang, Dictionary> = { ru, en, tr, tk };

/** Display name + native short label, used in the language selector. */
export const LANG_META: Record<Lang, { native: string; short: string; flag: string }> = {
  ru: { native: 'Русский',   short: 'RU', flag: '🇷🇺' },
  en: { native: 'English',   short: 'EN', flag: '🇬🇧' },
  tr: { native: 'Türkçe',    short: 'TR', flag: '🇹🇷' },
  tk: { native: 'Türkmençe', short: 'TK', flag: '🇹🇲' },
};

const STORAGE_KEY = 'admin-panel.lang';

function detectInitialLang(): Lang {
  if (typeof window === 'undefined') return 'ru';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (stored && stored in DICTS) return stored;
  } catch { /* no-op */ }
  const nav = (typeof navigator !== 'undefined' ? navigator.language : '').toLowerCase();
  if (nav.startsWith('en')) return 'en';
  if (nav.startsWith('tr')) return 'tr';
  if (nav.startsWith('tk')) return 'tk';
  return 'ru';
}

interface I18nCtx {
  lang:    Lang;
  setLang: (l: Lang) => void;
  /** Translate a key, with optional simple `{name}` placeholder substitution. */
  t:       (key: DictKey, vars?: Record<string, string | number>) => string;
}

const Ctx = createContext<I18nCtx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectInitialLang);

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, lang); } catch { /* no-op */ }
    if (typeof document !== 'undefined') document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<I18nCtx>(() => ({
    lang,
    setLang: setLangState,
    t: (key, vars) => {
      const dict = DICTS[lang] ?? ru;
      const raw = (dict[key] ?? ru[key] ?? key) as string;
      if (!vars) return raw;
      return raw.replace(/\{(\w+)\}/g, (_, k) =>
        vars[k] !== undefined ? String(vars[k]) : `{${k}}`,
      );
    },
  }), [lang]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/**
 * Returns translation API. Safe to call outside the provider — returns a
 * minimal fallback (Russian dictionary, no setLang). This keeps tests and
 * isolated component renders from crashing.
 */
export function useI18n(): I18nCtx {
  const ctx = useContext(Ctx);
  if (ctx) return ctx;
  return {
    lang: 'ru',
    setLang: () => { /* no-op outside provider */ },
    t: (key, vars) => {
      const raw = (ru[key] ?? key) as string;
      if (!vars) return raw;
      return raw.replace(/\{(\w+)\}/g, (_, k) =>
        vars[k] !== undefined ? String(vars[k]) : `{${k}}`,
      );
    },
  };
}

export type { DictKey, Dictionary } from './dictionaries/ru';
