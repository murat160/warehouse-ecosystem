/**
 * Reusable download / export helpers used by Admin Panel actions.
 * Pure browser-side utilities — no UI, no styles, no API.
 */

/** Quote a CSV cell so commas, quotes and newlines stay safe. */
function csvCell(v: unknown): string {
  if (v === null || v === undefined) return '""';
  const s = String(v).replace(/"/g, '""');
  return `"${s}"`;
}

/** Trigger a real browser download of a Blob. */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Export an array of objects to CSV and download.
 * Headers come from `columns` (order preserved); each column is `{ key, label }`.
 * Adds UTF-8 BOM so Excel opens Cyrillic correctly.
 */
export function exportToCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: Array<{ key: keyof T | string; label: string }>,
  filename: string,
): void {
  const header = columns.map(c => csvCell(c.label)).join(',');
  const body = rows
    .map(r => columns.map(c => csvCell((r as any)[c.key])).join(','))
    .join('\n');
  const csv = `﻿${header}\n${body}`;
  const today = new Date().toISOString().slice(0, 10);
  const safeName = filename.endsWith('.csv') ? filename : `${filename}-${today}.csv`;
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), safeName);
}

/** Download arbitrary JSON. */
export function downloadJson(data: unknown, filename: string): void {
  const today = new Date().toISOString().slice(0, 10);
  const safeName = filename.endsWith('.json') ? filename : `${filename}-${today}.json`;
  downloadBlob(
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' }),
    safeName,
  );
}

/**
 * Trigger a browser download from a URL or data-URL.
 * Falls back to opening in a new tab when the URL is on a different origin
 * and `download` is ignored by the browser.
 */
export function downloadFromUrl(url: string, filename?: string): void {
  if (!url) return;
  const a = document.createElement('a');
  a.href = url;
  if (filename) a.download = filename;
  a.target = '_blank';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
