/**
 * Safe clipboard copy — falls back to execCommand when Clipboard API
 * is blocked by a permissions policy (common in sandboxed iframes).
 */
export function copyToClipboard(text: string): void {
  // Try modern API first
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).catch(() => execCommandFallback(text));
  } else {
    execCommandFallback(text);
  }
}

function execCommandFallback(text: string): void {
  const el = document.createElement('textarea');
  el.value = text;
  el.setAttribute('readonly', '');
  el.style.cssText = 'position:absolute;left:-9999px;top:-9999px;';
  document.body.appendChild(el);
  el.select();
  try { document.execCommand('copy'); } catch (_) { /* silent */ }
  document.body.removeChild(el);
}
