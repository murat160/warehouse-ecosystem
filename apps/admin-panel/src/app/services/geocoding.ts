/**
 * Geocoding service abstraction.
 *
 * This is the seam between the UI (PreciseLocationPicker) and whichever
 * provider the platform ships with — Google Maps Geocoding API, Mapbox
 * Geocoding, or Nominatim/OSM. The UI never knows which one.
 *
 * The default export is a MOCK provider that returns deterministic,
 * city-anchored coordinates so the picker is fully functional in dev,
 * demos, and CI. To swap in a real provider, set `setGeocodingProvider`
 * once at app startup with the production implementation; everything
 * downstream picks it up automatically.
 *
 * Contract:
 *   geocodeAddress(query)       resolves to `{ lat, lng, parsed }` or null
 *   reverseGeocode(lat, lng)    resolves to a partial Location { fullAddress,
 *                               postalCode, city, district, street, building }
 *
 * Both calls are async with a small artificial delay so consumers must
 * handle the loading state — that mirrors real-world API latency and
 * means swapping in Google/Mapbox doesn't require any UI changes.
 */
import { CITY_PRESETS, presetForCity, type Location } from '../data/location';

export interface GeocodeResult {
  lat: number;
  lng: number;
  /** Optional pre-parsed address fragments returned by the provider. */
  parsed?: Partial<Location>;
}

export interface GeocodingProvider {
  geocodeAddress(query: string, hintCity?: string): Promise<GeocodeResult | null>;
  reverseGeocode(lat: number, lng: number): Promise<Partial<Location> | null>;
}

// ─── Mock provider ────────────────────────────────────────────────────────────

/**
 * Stable hash → number ∈ [0, 1). Used so the same address always resolves
 * to the same coordinate offset in the demo, which makes the dev loop
 * predictable.
 */
function hashFloat(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

/** Best-effort city detection from a free-form query. */
function inferCity(query: string): string {
  const q = query.toLowerCase();
  for (const city of Object.keys(CITY_PRESETS)) {
    if (q.includes(city.toLowerCase())) return city;
  }
  return 'Москва';
}

const MOCK_STREETS = [
  'Tverskaya',  'Arbat',    'Lubyanka',   'Mira',      'Nevsky',
  'Lenina',     'Kirova',   'Sovetskaya', 'Pushkina',  'Gagarina',
];

/** Synthesize a plausible address for given coordinates. */
function synthesizeAddress(lat: number, lng: number): Partial<Location> {
  // Pick a "city" by reverse-looking-up which preset bbox contains lat/lng.
  let city = 'Москва';
  for (const [name, p] of Object.entries(CITY_PRESETS)) {
    const b = p.bounds;
    if (lat >= b.south && lat <= b.north && lng >= b.west && lng <= b.east) {
      city = name; break;
    }
  }
  const seed = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  const street = MOCK_STREETS[Math.floor(hashFloat(seed) * MOCK_STREETS.length)];
  const building = String(1 + Math.floor(hashFloat(seed + 'b') * 200));
  const postalCode = String(100000 + Math.floor(hashFloat(seed + 'p') * 99999));
  const district = `District ${Math.floor(hashFloat(seed + 'd') * 12) + 1}`;
  return {
    fullAddress: `${city}, ${street} st., ${building}`,
    postalCode,
    country: city === 'Ashgabat' || city === 'Ашхабад' || city === 'Türkmenabat' ? 'TM'
           : city === 'Istanbul' || city === 'Стамбул' ? 'TR' : 'RU',
    city,
    district,
    street,
    building,
  };
}

const mockProvider: GeocodingProvider = {
  async geocodeAddress(query, hintCity) {
    await new Promise(r => setTimeout(r, 250));
    const q = (query || '').trim();
    if (!q) return null;
    const city = hintCity ?? inferCity(q);
    const preset = presetForCity(city);
    // Deterministic offset within ±0.015° from the city centre, based on
    // the hash of the query — that's roughly ±1.5 km, which is exactly
    // the kind of "geocoder put me near the building" precision we are
    // designing the manual-correction flow for.
    const dLat = (hashFloat(q + 'lat')   - 0.5) * 0.03;
    const dLng = (hashFloat(q + 'lng') - 0.5) * 0.03;
    const lat = preset.center[0] + dLat;
    const lng = preset.center[1] + dLng;
    return {
      lat, lng,
      parsed: { ...synthesizeAddress(lat, lng), fullAddress: q },
    };
  },
  async reverseGeocode(lat, lng) {
    await new Promise(r => setTimeout(r, 200));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return synthesizeAddress(lat, lng);
  },
};

// ─── Provider registry ───────────────────────────────────────────────────────

let activeProvider: GeocodingProvider = mockProvider;

/**
 * Replace the geocoding provider — call once at app startup if a real
 * provider is configured. Returns the previous provider so tests can
 * restore it.
 */
export function setGeocodingProvider(p: GeocodingProvider): GeocodingProvider {
  const prev = activeProvider;
  activeProvider = p;
  return prev;
}

/** Forward to the active provider. UI calls this. */
export function geocodeAddress(query: string, hintCity?: string): Promise<GeocodeResult | null> {
  return activeProvider.geocodeAddress(query, hintCity);
}
export function reverseGeocode(lat: number, lng: number): Promise<Partial<Location> | null> {
  return activeProvider.reverseGeocode(lat, lng);
}

/** Exposed for tests; in production code consumers shouldn't depend on this. */
export const __mockProviderForTests = mockProvider;
