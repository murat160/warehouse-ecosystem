import { useSyncExternalStore } from 'react';
import { dict, type Lang } from './dictionaries';

export type { Lang };
export { LANGS } from './dictionaries';

const STORAGE = 'warehouse_lang';

let lang: Lang = (() => {
  if (typeof window === 'undefined') return 'ru';
  const saved = localStorage.getItem(STORAGE);
  return (saved === 'ru' || saved === 'en' || saved === 'tk' || saved === 'tr') ? saved : 'ru';
})();

const listeners = new Set<() => void>();
function emit() { listeners.forEach(l => l()); }

function subscribe(l: () => void) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

export function getLanguage(): Lang { return lang; }

export function setLanguage(l: Lang) {
  if (l === lang) return;
  lang = l;
  if (typeof window !== 'undefined') {
    try { localStorage.setItem(STORAGE, l); } catch { /* ignore */ }
    document.documentElement.lang = l;
  }
  emit();
}

export function useLanguage(): Lang {
  return useSyncExternalStore(subscribe, () => lang, () => lang);
}

/** Простая функция перевода. Если ключа в текущем языке нет — fallback на ru, иначе показываем сам ключ. */
export function t(key: string, fallback?: string): string {
  const cur = (dict[lang] as Record<string, string>)[key];
  if (cur !== undefined) return cur;
  const ru = (dict.ru as Record<string, string>)[key];
  if (ru !== undefined) return ru;
  return fallback ?? key;
}

/** Хук для перевода. Подписывается на смену языка и заставляет компонент re-render. */
export function useT(): (key: string, fallback?: string) => string {
  useLanguage();
  return t;
}
