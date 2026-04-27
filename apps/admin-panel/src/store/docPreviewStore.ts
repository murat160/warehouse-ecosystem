// ─── Global Document Preview Store ────────────────────────────────────────────
// Single source of truth for document image previews.
// Completely decoupled from the compliance doc chain.
// Module-level Map → persists across ALL navigation, NEVER loses data.
//
// Usage:
//   setDocPreview(complianceDocId, base64DataUrl)  ← called on upload
//   getDocPreview(complianceDocId)                 ← called on display
//   removeDocPreview(complianceDocId)              ← called on delete
//
// complianceDocId = `${courier.id}-${doc.document_id}` — matches complianceStore IDs

const _previews = new Map<string, string>(); // id → base64 data URL
const _listeners = new Set<() => void>();

function _notify() {
  _listeners.forEach(fn => fn());
}

// ── Write ─────────────────────────────────────────────────────────────────────

export function setDocPreview(id: string, dataUrl: string): void {
  if (!id || !dataUrl) return;
  _previews.set(id, dataUrl);
  _notify();
}

// Store a File object as preview by reading it with FileReader (async).
// Returns a cleanup function. Calls onDone(dataUrl) when ready.
export function storeFilePreview(
  id: string,
  file: File,
  onDone?: (dataUrl: string) => void,
): void {
  if (!id || !file) return;
  // Only store image files
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const imageExts = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'gif', 'bmp'];
  if (!imageExts.includes(ext) && !file.type.startsWith('image/')) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target?.result as string;
    if (dataUrl) {
      _previews.set(id, dataUrl);
      _notify();
      onDone?.(dataUrl);
    }
  };
  reader.onerror = () => {
    // If FileReader fails (e.g. restricted env), try object URL as fallback
    // Object URLs persist until explicitly revoked — store them anyway
    try {
      const blobUrl = URL.createObjectURL(file);
      _previews.set(id, blobUrl);
      _notify();
      onDone?.(blobUrl);
    } catch {
      // Cannot create preview
    }
  };
  reader.readAsDataURL(file);
}

// ── Read ──────────────────────────────────────────────────────────────────────

export function getDocPreview(id: string): string | undefined {
  return _previews.get(id);
}

export function hasDocPreview(id: string): boolean {
  return _previews.has(id);
}

export function getAllPreviews(): ReadonlyMap<string, string> {
  return _previews;
}

// ── Delete ────────────────────────────────────────────────────────────────────

export function removeDocPreview(id: string): void {
  const url = _previews.get(id);
  // Only revoke if it's a blob URL (not a data URL)
  if (url?.startsWith('blob:')) {
    try { URL.revokeObjectURL(url); } catch { /* ignore */ }
  }
  _previews.delete(id);
  _notify();
}

// ── Subscribe ─────────────────────────────────────────────────────────────────

export function subscribePreview(fn: () => void): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}
