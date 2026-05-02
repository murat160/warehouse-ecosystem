/**
 * Common Location data model — used by sellers, pickup points, warehouses,
 * and (in the future) customer addresses.
 *
 * The hard rule: `fullAddress` and `latitude/longitude` are SEPARATE fields.
 * The text address is for humans; the coordinates are for routing, ETA,
 * geofences, delivery zones, and "courier arrived" checks. A geocoder may
 * place an address 20–30 m off the actual entrance — admins / customers
 * must be able to drag the marker manually right to the door.
 *
 * Status machine:
 *   not_set ──[type address or click map]──▶ found_by_address
 *           ──[drag marker]──────────────▶ adjusted_manually
 *           ──[click "Confirm"]──────────▶ confirmed (locationConfirmed=true)
 *
 * Editing the address text or moving the marker AFTER confirmation flips
 * locationConfirmed back to false — the operator must re-confirm.
 *
 * Activation gate: a seller / pickup point / warehouse can NEVER reach
 * status="active" while locationConfirmed === false. See
 * `assertCanActivate()` below.
 */

export type LocationSource = 'address' | 'manual' | 'imported';
export type LocationStatus = 'not_set' | 'found_by_address' | 'adjusted_manually' | 'confirmed';

export interface Location {
  /** Single human-readable address, ready to display in a card. */
  fullAddress:    string;
  postalCode:     string;
  country?:       string;
  city:           string;
  district?:      string;
  area?:          string;
  street?:        string;
  building?:      string;
  /** Free-text hint: "вход со двора, 2 этаж, домофон 22*". */
  entranceHint?:  string;
  /** Geographic coordinates of the actual entrance / drop-off point. */
  latitude:       number;
  longitude:      number;
  /** How the coordinates were obtained — provenance for audit. */
  locationSource: LocationSource;
  /** Where the operator is in the verification flow. */
  locationStatus: LocationStatus;
  /**
   * True ONLY after an operator (or end customer for their own address)
   * pressed "Confirm" *after* placing/moving the marker. The activation
   * gate trusts this single boolean.
   */
  locationConfirmed: boolean;
  /** Optional: estimated accuracy in metres (geocoder hint or operator note). */
  locationAccuracyMeters?: number;
  /** Audit: who saved this location last. */
  updatedBy?: string;
  /** Audit: when (ISO timestamp). */
  updatedAt?: string;
}

/** Create a fresh, empty Location. Use this for create-flows. */
export function emptyLocation(): Location {
  return {
    fullAddress: '',
    postalCode:  '',
    country:     '',
    city:        '',
    district:    '',
    area:        '',
    street:      '',
    building:    '',
    entranceHint:'',
    latitude:    0,
    longitude:   0,
    locationSource: 'address',
    locationStatus: 'not_set',
    locationConfirmed: false,
  };
}

/**
 * `true` when the location is fully usable for routing / activation.
 * Used by the activation gate AND by client-facing endpoints that must
 * never publish unconfirmed pickup points.
 */
export function isLocationUsable(loc: Location | null | undefined): boolean {
  if (!loc) return false;
  if (!loc.locationConfirmed) return false;
  if (!Number.isFinite(loc.latitude)  || loc.latitude  === 0) return false;
  if (!Number.isFinite(loc.longitude) || loc.longitude === 0) return false;
  return true;
}

/**
 * Throws (or returns an i18n key) when the operator tries to activate a
 * seller / pickup point / warehouse without a confirmed location.
 *
 * Returns null when the activation can proceed.
 *
 *   const err = assertCanActivate(loc, 'pickup_point');
 *   if (err) { toast.error(t(err)); return; }
 */
export function assertCanActivate(
  loc: Location | null | undefined,
  kind: 'seller' | 'pickup_point' | 'warehouse',
): string | null {
  if (isLocationUsable(loc)) return null;
  switch (kind) {
    case 'seller':        return 'location.error.seller_not_confirmed';
    case 'pickup_point':  return 'location.error.pvz_not_confirmed';
    case 'warehouse':     return 'location.error.warehouse_not_confirmed';
  }
}

/**
 * Bounding box used by PreciseLocationPicker to project pixel <-> lat/lng.
 * Picked so the default view roughly covers the relevant operating city.
 * Pickers can override via `cityCenter` prop; this default is just a
 * sensible fallback.
 */
export interface MapBounds {
  /** Latitude of the top edge of the visible map (north). */
  north: number;
  /** Latitude of the bottom edge of the visible map (south). */
  south: number;
  /** Longitude of the left edge (west). */
  west:  number;
  /** Longitude of the right edge (east). */
  east:  number;
}

/** Cities we have presets for — extend as the platform grows. */
export const CITY_PRESETS: Record<string, { center: [number, number]; bounds: MapBounds }> = {
  Москва:           { center: [55.7558, 37.6173], bounds: { north: 55.92, south: 55.59, west: 37.32, east: 37.92 } },
  Moscow:           { center: [55.7558, 37.6173], bounds: { north: 55.92, south: 55.59, west: 37.32, east: 37.92 } },
  'Санкт-Петербург':{ center: [59.9343, 30.3351], bounds: { north: 60.09, south: 59.78, west: 30.05, east: 30.62 } },
  Ашхабад:          { center: [37.9601, 58.3261], bounds: { north: 38.06, south: 37.86, west: 58.20, east: 58.46 } },
  Ashgabat:         { center: [37.9601, 58.3261], bounds: { north: 38.06, south: 37.86, west: 58.20, east: 58.46 } },
  Türkmenabat:      { center: [39.0717, 63.5728], bounds: { north: 39.17, south: 38.97, west: 63.43, east: 63.71 } },
  Стамбул:          { center: [41.0082, 28.9784], bounds: { north: 41.18, south: 40.84, west: 28.65, east: 29.30 } },
  Istanbul:         { center: [41.0082, 28.9784], bounds: { north: 41.18, south: 40.84, west: 28.65, east: 29.30 } },
};

/** Best-effort city → preset lookup. Falls back to Moscow when unknown. */
export function presetForCity(city: string | undefined | null) {
  if (city && CITY_PRESETS[city]) return CITY_PRESETS[city];
  return CITY_PRESETS['Москва'];
}

/** Pretty 6-decimal printable coordinates ("55.751244, 37.618423"). */
export function formatLatLng(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}
