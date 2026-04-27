/**
 * Global Products Store
 * Module-level mutable store with subscriber pattern.
 * Supports: price, availability, stock, discount changes
 * + Expiry date tracking with auto-removal and 3-day warning notifications.
 */

import { useSyncExternalStore } from 'react';
import {
  getSellerProducts,
  type SellerProduct,
  type AvailabilityStatus,
} from '../data/merchants-mock';
import { addNotification } from './notificationsStore';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProductDiscount {
  type: 'percent' | 'fixed';
  value: number;
  originalPrice: number;
  discountedPrice: number;
  duration: string;
  appliedAt: string;
}

export type ExpiryStatus = 'ok' | 'expiring_soon' | 'expired';

export interface ExpiryInfo {
  date: string;         // ISO YYYY-MM-DD
  daysLeft: number;     // negative = already expired
  status: ExpiryStatus;
}

interface ProductOverride {
  price?: number;
  availability?: AvailabilityStatus;
  stock?: number | null;
  discount?: ProductDiscount | null;
  expiryDate?: string | null;       // ISO YYYY-MM-DD
  expiryNotifiedAt?: string | null; // ISO timestamp of last warning notification
  expiryExpiredAt?: string | null;  // ISO timestamp when auto-removed
}

// ─── Store internals ──────────────────────────────────────────────────────────

const overrides = new Map<string, ProductOverride>();
const subscribers = new Set<() => void>();
let snapshotVersion = 0;
const snapshots = new Map<string, SellerProduct[]>();

function notify() {
  snapshotVersion++;
  subscribers.forEach(fn => fn());
}

// ─── Base product cache: productId → SellerProduct ───────────────────────────

const baseProductCache = new Map<string, SellerProduct>();
// Track which sellers are cached
const cachedSellerIds = new Set<string>();

function ensureSellerCached(sid: string) {
  if (cachedSellerIds.has(sid)) return;
  cachedSellerIds.add(sid);
  const list = getSellerProducts(sid);
  for (const p of list) {
    baseProductCache.set(p.id, p);
  }
}

function getBaseProduct(productId: string): SellerProduct | undefined {
  if (baseProductCache.has(productId)) return baseProductCache.get(productId);
  // Populate all known sellers
  const knownSellers = ['slr-001', 'slr-002', 'slr-003', 'slr-004', 'slr-005',
    'slr-006', 'slr-007', 'slr-008', 'slr-009', 'slr-010', 'slr-011',
    'slr-012', 'slr-013', 'slr-014', 'slr-015', 'slr-016'];
  for (const sid of knownSellers) ensureSellerCached(sid);
  return baseProductCache.get(productId);
}

// ─── Expiry helpers ───────────────────────────────────────────────────────────

/** Today as YYYY-MM-DD (midnight) in local time */
function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export function calcExpiryInfo(expiryDateStr: string): ExpiryInfo {
  const today = new Date(todayStr());
  const expiry = new Date(expiryDateStr);
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysLeft = Math.round((expiry.getTime() - today.getTime()) / msPerDay);
  let status: ExpiryStatus = 'ok';
  if (daysLeft < 0) status = 'expired';
  else if (daysLeft <= 3) status = 'expiring_soon';
  return { date: expiryDateStr, daysLeft, status };
}

/** Format expiry date for display: DD.MM.YYYY */
export function formatExpiryDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

/** Fired whenever an expiry date is set or on boot for products with expiryDate in mock data */
function triggerExpiryLogic(
  productId: string,
  productName: string,
  expiryDateStr: string,
  silent = false,
) {
  const info = calcExpiryInfo(expiryDateStr);
  const existing = overrides.get(productId) ?? {};

  if (info.status === 'expired') {
    // Auto-remove: set to sold_out_indefinitely
    if (existing.availability !== 'sold_out_indefinitely' || !existing.expiryExpiredAt) {
      overrides.set(productId, {
        ...existing,
        expiryDate: expiryDateStr,
        availability: 'sold_out_indefinitely',
        expiryExpiredAt: new Date().toISOString(),
      });

      if (!silent) {
        // Fire critical system notification
        addNotification({
          id: `expiry-expired-${productId}-${Date.now()}`,
          type: 'escalation',
          title: `⚠️ Товар снят с продажи — истёк срок годности`,
          body: `«${productName}» — срок годности истёк ${formatExpiryDate(expiryDateStr)}. Товар автоматически переведён в «Нет в наличии».`,
          fromId: 'system',
          fromName: 'Система контроля сроков',
          fromRole: 'system',
          targetDept: 'Все отделы',
          priority: 'critical',
          createdAt: new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
          read: false,
          channel: 'Товары',
        });
      }
    }
  } else if (info.status === 'expiring_soon') {
    // Only send warning once per product (check expiryNotifiedAt)
    const alreadyNotified = existing.expiryNotifiedAt &&
      new Date(existing.expiryNotifiedAt).toDateString() === new Date().toDateString();

    overrides.set(productId, {
      ...existing,
      expiryDate: expiryDateStr,
      ...(alreadyNotified ? {} : { expiryNotifiedAt: new Date().toISOString() }),
    });

    if (!alreadyNotified && !silent) {
      const daysLabel = info.daysLeft === 0 ? 'сегодня' : info.daysLeft === 1 ? 'завтра' : `через ${info.daysLeft} дн.`;
      addNotification({
        id: `expiry-warn-${productId}-${todayStr()}`,
        type: 'task_assigned',
        title: `🕐 Срок годности истекает ${daysLabel}`,
        body: `«${productName}» — срок годности ${formatExpiryDate(expiryDateStr)}. Обратите внимание и примите решение о товаре.`,
        fromId: 'system',
        fromName: 'Система контроля сроков',
        fromRole: 'system',
        targetDept: 'Партнёры',
        priority: info.daysLeft === 0 ? 'high' : 'normal',
        createdAt: new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        read: false,
        channel: 'Товары',
      });
    }
  } else {
    // ok — just persist the date
    overrides.set(productId, {
      ...existing,
      expiryDate: expiryDateStr,
    });
  }
}

// ─── Boot: scan all perishable products in mock data ─────────────────────────
// Run once at module load — silently seeds expiry overrides from mock base data.

function bootExpiryCheck() {
  const flowerProducts = getSellerProducts('slr-008');
  for (const p of flowerProducts) {
    if (p.hasExpiryTracking && p.expiryDate) {
      triggerExpiryLogic(p.id, p.name, p.expiryDate, false /* not silent → fires notifications */);
    }
  }
}

// Defer boot until after the first event loop tick so toast/notification systems are ready
setTimeout(bootExpiryCheck, 100);

// ─── Public API ───────────────────────────────────────────────────────────────

export function updateProductPrice(productId: string, price: number, _reason?: string): void {
  const existing = overrides.get(productId) ?? {};
  overrides.set(productId, { ...existing, price, discount: null });
  notify();
}

export function updateProductAvailability(productId: string, availability: AvailabilityStatus): void {
  const existing = overrides.get(productId) ?? {};
  overrides.set(productId, { ...existing, availability });
  notify();
}

export function updateProductStock(productId: string, stock: number, _reason?: string): void {
  const existing = overrides.get(productId) ?? {};
  overrides.set(productId, { ...existing, stock });
  notify();
}

export function applyProductDiscount(
  productId: string,
  type: 'percent' | 'fixed',
  value: number,
  duration: string,
  _reason?: string,
): void {
  const existing = overrides.get(productId) ?? {};
  const base = getBaseProduct(productId);
  const originalPrice = existing.discount
    ? existing.discount.originalPrice
    : (existing.price ?? base?.price ?? 0);

  const discountedPrice = type === 'percent'
    ? Math.round(originalPrice * (1 - value / 100))
    : Math.round(originalPrice - value);

  const discount: ProductDiscount = {
    type, value, originalPrice, discountedPrice, duration,
    appliedAt: new Date().toISOString(),
  };
  overrides.set(productId, { ...existing, price: discountedPrice, discount });
  notify();
}

export function removeProductDiscount(productId: string): void {
  const existing = overrides.get(productId) ?? {};
  if (!existing.discount) return;
  overrides.set(productId, {
    ...existing,
    price: existing.discount.originalPrice,
    discount: null,
  });
  notify();
}

/**
 * Set or clear an expiry date for a product.
 * - Setting a date: validates, fires notification if expiring/expired, auto-removes if expired.
 * - Clearing (null): removes expiry tracking.
 */
export function setProductExpiryDate(
  productId: string,
  productName: string,
  expiryDate: string | null,
): void {
  const existing = overrides.get(productId) ?? {};
  if (expiryDate === null) {
    // Clear expiry — restore availability if it was auto-removed by us
    const wasAutoRemoved = !!existing.expiryExpiredAt;
    overrides.set(productId, {
      ...existing,
      expiryDate: null,
      expiryNotifiedAt: null,
      expiryExpiredAt: null,
      // If we auto-removed it, restore to available
      ...(wasAutoRemoved ? { availability: 'available' } : {}),
    });
    notify();
    return;
  }

  triggerExpiryLogic(productId, productName, expiryDate, false);
  notify();
}

export function getProductOverride(productId: string): ProductOverride | undefined {
  return overrides.get(productId);
}

/** Get live expiry date for a product (override or base) */
export function getEffectiveExpiryDate(product: SellerProduct): string | null | undefined {
  const override = overrides.get(product.id);
  if (override && 'expiryDate' in override) return override.expiryDate;
  return product.expiryDate;
}

/** Get computed expiry info for a product */
export function getExpiryInfo(product: SellerProduct): ExpiryInfo | null {
  const date = getEffectiveExpiryDate(product);
  if (!date) return null;
  return calcExpiryInfo(date);
}

/** Apply overrides on top of a base product */
function applyOverrides(product: SellerProduct): SellerProduct {
  const override = overrides.get(product.id);
  if (!override) return product;
  return {
    ...product,
    ...(override.price        !== undefined ? { price:        override.price }        : {}),
    ...(override.availability !== undefined ? { availability: override.availability } : {}),
    ...(override.stock        !== undefined ? { stock:        override.stock }        : {}),
    ...('expiryDate' in override            ? { expiryDate:   override.expiryDate }   : {}),
  };
}

// ─── useSyncExternalStore glue ────────────────────────────────────────────────

function subscribe(cb: () => void): () => void {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
}

function getSnapshot(sellerId: string): () => SellerProduct[] {
  return () => {
    const key = `${sellerId}::${snapshotVersion}`;
    if (!snapshots.has(key)) {
      const base = getSellerProducts(sellerId);
      // Cache base products
      for (const p of base) baseProductCache.set(p.id, p);
      snapshots.set(key, base.map(applyOverrides));
      if (snapshots.size > 20) {
        const firstKey = snapshots.keys().next().value;
        if (firstKey !== undefined) snapshots.delete(firstKey);
      }
    }
    return snapshots.get(key)!;
  };
}

/** React hook — returns live product list that updates on any store change */
export function useSellerProducts(sellerId: string): SellerProduct[] {
  return useSyncExternalStore(subscribe, getSnapshot(sellerId));
}

/** Get a single live product (for the detail panel) */
export function useLiveProduct(
  sellerId: string,
  productId: string,
): SellerProduct | undefined {
  const all = useSellerProducts(sellerId);
  return all.find(p => p.id === productId);
}
