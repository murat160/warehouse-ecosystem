// ─── Platform Cache Layer ─────────────────────────────────────────────────────
// LRU-style in-memory cache with TTL. Used by API Gateway for hot data:
// activeCouriers, openOrders, onlineStatus, pvzCapacity, etc.

interface CacheEntry<T> {
  value: T;
  expiresAt: number;    // epoch ms
  hits: number;
  createdAt: number;
  key: string;
  tags: string[];       // for tag-based invalidation
}

interface CacheOptions {
  ttl?: number;         // seconds, default 30
  tags?: string[];
}

const DEFAULT_TTL = 30;   // seconds
const MAX_ENTRIES = 500;

// ── Module-level store ────────────────────────────────────────────────────────

const _store: Map<string, CacheEntry<unknown>> = new Map();
const _stats = { hits: 0, misses: 0, sets: 0, evictions: 0 };

// ── Helpers ───────────────────────────────────────────────────────────────────

function evict() {
  if (_store.size <= MAX_ENTRIES) return;
  // Evict oldest entry
  let oldest: string | null = null;
  let oldestTime = Infinity;
  for (const [key, entry] of _store) {
    if (entry.createdAt < oldestTime) { oldestTime = entry.createdAt; oldest = key; }
  }
  if (oldest) { _store.delete(oldest); _stats.evictions++; }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function get<T>(key: string): T | null {
  const entry = _store.get(key) as CacheEntry<T> | undefined;
  if (!entry) { _stats.misses++; return null; }
  if (Date.now() > entry.expiresAt) { _store.delete(key); _stats.misses++; return null; }
  entry.hits++;
  _stats.hits++;
  return entry.value;
}

export function set<T>(key: string, value: T, options: CacheOptions = {}): void {
  const ttl = (options.ttl ?? DEFAULT_TTL) * 1000;
  evict();
  _store.set(key, {
    key,
    value,
    expiresAt: Date.now() + ttl,
    hits: 0,
    createdAt: Date.now(),
    tags: options.tags ?? [],
  });
  _stats.sets++;
}

export function del(key: string): void {
  _store.delete(key);
}

/** Invalidate all entries with a given tag */
export function invalidateByTag(tag: string): number {
  let count = 0;
  for (const [key, entry] of _store) {
    if (entry.tags.includes(tag)) { _store.delete(key); count++; }
  }
  return count;
}

/** Invalidate all entries whose key starts with prefix */
export function invalidateByPrefix(prefix: string): number {
  let count = 0;
  for (const key of _store.keys()) {
    if (key.startsWith(prefix)) { _store.delete(key); count++; }
  }
  return count;
}

export function flush(): void {
  _store.clear();
}

export function getStats() {
  const total = _stats.hits + _stats.misses;
  return {
    ..._stats,
    size: _store.size,
    hitRate: total > 0 ? Math.round((_stats.hits / total) * 100) : 0,
  };
}

export function getKeys(): string[] {
  return [..._store.keys()];
}

/** Cached fetch helper — auto-caches the result of an async factory */
export async function cached<T>(
  key: string,
  factory: () => Promise<T>,
  options: CacheOptions = {},
): Promise<T> {
  const hit = get<T>(key);
  if (hit !== null) return hit;
  const value = await factory();
  set(key, value, options);
  return value;
}

export const cache = { get, set, del, invalidateByTag, invalidateByPrefix, flush, getStats, getKeys, cached };
