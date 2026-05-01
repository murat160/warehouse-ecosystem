/**
 * Cyrillic → Latin transliteration for mock-data display.
 *
 * Goal: when an operator switches the UI to EN/TR/TK, demo content like
 * "Иванов Алексей" should not stay as Cyrillic — it should be rendered
 * in the alphabet of the chosen language. We don't *translate* meaning;
 * we just transliterate characters.
 *
 *   ru:  text passes through (no-op)
 *   en:  BGN/PCGN-style romanisation (Ivanov Aleksey Petrovich)
 *   tr:  Turkish-friendly Latin     (İvanov Aleksey Petroviç)
 *   tk:  Turkmen Latin alphabet     (Iwanow Alekseý Petrowiç)
 *
 * The maps are intentionally pragmatic, not academically correct. They
 * handle the most common letters; weird edge cases fall through and stay
 * as the input character so we never lose information.
 *
 * Usage:
 *   import { useLocalize } from '../i18n/transliterate';
 *   const localize = useLocalize();
 *   <td>{localize(order.customerName)}</td>
 */
import { useI18n, type Lang } from './index';

type CharMap = Record<string, string>;

// ── Lower-case base maps ──────────────────────────────────────────────────────

/** English (ALA-LC / BGN-PCGN hybrid; the "default" Latin transliteration). */
const RU_TO_EN: CharMap = {
  а:'a', б:'b', в:'v', г:'g', д:'d', е:'e', ё:'yo', ж:'zh', з:'z', и:'i',
  й:'y', к:'k', л:'l', м:'m', н:'n', о:'o', п:'p', р:'r', с:'s', т:'t',
  у:'u', ф:'f', х:'kh', ц:'ts', ч:'ch', ш:'sh', щ:'shch', ъ:'',  ы:'y',
  ь:'',  э:'e', ю:'yu', я:'ya',
};

/** Turkish-friendly Latin: keeps Turkish-specific glyphs the user expects. */
const RU_TO_TR: CharMap = {
  а:'a', б:'b', в:'v', г:'g', д:'d', е:'e', ё:'yo', ж:'j',  з:'z', и:'i',
  й:'y', к:'k', л:'l', м:'m', н:'n', о:'o', п:'p', р:'r', с:'s', т:'t',
  у:'u', ф:'f', х:'h', ц:'ts', ч:'ç', ш:'ş', щ:'şç', ъ:'', ы:'ı',
  ь:'',  э:'e', ю:'yu', я:'ya',
};

/** Turkmen Latin alphabet: ä, ç, ý, ž, ş, ň, ö, ü, w (instead of v). */
const RU_TO_TK: CharMap = {
  а:'a', б:'b', в:'w', г:'g', д:'d', е:'e', ё:'ýo', ж:'ž', з:'z', и:'i',
  й:'ý', к:'k', л:'l', м:'m', н:'n', о:'o', п:'p', р:'r', с:'s', т:'t',
  у:'u', ф:'f', х:'h', ц:'s', ч:'ç', ш:'ş', щ:'şç', ъ:'', ы:'y',
  ь:'',  э:'e', ю:'ýu', я:'ýa',
};

const MAPS: Partial<Record<Lang, CharMap>> = {
  en: RU_TO_EN,
  tr: RU_TO_TR,
  tk: RU_TO_TK,
};

/** Lower-case once, look up, preserve original case afterwards. */
function transliterateChar(ch: string, map: CharMap): string {
  const low = ch.toLowerCase();
  const out = map[low];
  if (out === undefined) return ch;       // unknown → pass-through
  if (ch === low) return out;             // already lower → as-is
  if (out.length === 0) return '';        // soft/hard sign → drop
  // Capitalise first letter of the result for inputs like "Я" → "Ya".
  return out.charAt(0).toUpperCase() + out.slice(1);
}

/**
 * Transliterate any Cyrillic letters in `text` to the target language's
 * Latin alphabet. Non-Cyrillic glyphs (digits, punctuation, latin already
 * present, currency, emojis) pass through unchanged.
 */
export function transliterate(text: string, lang: Lang): string {
  if (!text) return text;
  if (lang === 'ru') return text;
  const map = MAPS[lang];
  if (!map) return text;
  let out = '';
  for (const ch of text) out += transliterateChar(ch, map);
  return out;
}

/**
 * Specialised wrapper for proper names — same as transliterate, kept as a
 * separate symbol so the call site stays self-documenting at the point of
 * use ("we transliterated this person, not a generic UI string").
 */
export function localizePersonName(name: string, lang: Lang): string {
  return transliterate(name, lang);
}

/** Generic mock-data text (descriptions, addresses, free text). */
export function localizeMockText(text: string, lang: Lang): string {
  return transliterate(text, lang);
}

/**
 * Hook returning a `(text) => string` function bound to the current lang.
 * Use inside React components to localise mock data on render without
 * threading `lang` through every prop.
 */
export function useLocalize(): (text: string | null | undefined) => string {
  const { lang } = useI18n();
  return (text) => (text == null ? '' : transliterate(text, lang));
}
