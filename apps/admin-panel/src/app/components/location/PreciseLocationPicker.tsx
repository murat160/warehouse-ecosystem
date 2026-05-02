/**
 * PreciseLocationPicker — single, reusable component for choosing the
 * exact entrance point of a seller, pickup point, warehouse, or customer
 * address.
 *
 * Why this exists: text addresses alone aren't precise enough for
 * delivery. A geocoder may put the marker 20–30 m off the actual door.
 * The operator (or end customer) MUST be able to drop the pin manually.
 *
 * The picker:
 *   1. Renders a styled SVG "map" backed by the city preset's bounding box.
 *      No external map SDK required — production deploys can swap in a
 *      real Mapbox/Google component without touching the call sites,
 *      because the picker only emits a `Location` object.
 *   2. Click anywhere on the map → marker placed there → reverse geocode
 *      kicks off and fills fullAddress / postalCode / city / district /
 *      street / building automatically.
 *   3. Drag the marker to the exact entrance. Status flips to
 *      `adjusted_manually`.
 *   4. Operator presses "Confirm point" → `locationConfirmed = true`.
 *   5. Editing the address text or moving the marker AFTER confirmation
 *      re-arms `locationConfirmed = false`.
 *
 * The component has no side-effects beyond `onChange(location)` — the
 * caller decides when / where to persist.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { MapPin, Search, Check, AlertTriangle, Loader2, RotateCcw, ExternalLink } from 'lucide-react';
import { useI18n, type DictKey } from '../../i18n';
import {
  emptyLocation, presetForCity, formatLatLng,
  type Location, type LocationStatus,
} from '../../data/location';
import { geocodeAddress, reverseGeocode } from '../../services/geocoding';

type Mode = 'seller' | 'pickup_point' | 'warehouse' | 'customer';

export interface PreciseLocationPickerProps {
  value:    Location | null | undefined;
  onChange: (next: Location) => void;
  /** Picker mode — only changes hint text, not behaviour. */
  mode:     Mode;
  /** Hint city for initial map view + geocoder bias. Read-only here. */
  cityHint?: string;
  /** When true, the activation gate is enforced by the parent form. */
  required?: boolean;
  /** Disable interaction (read-only viewer). */
  disabled?: boolean;
}

const STATUS_KEY: Record<LocationStatus, DictKey> = {
  not_set:             'location.status.not_set',
  found_by_address:    'location.status.found_by_address',
  adjusted_manually:   'location.status.adjusted_manually',
  confirmed:           'location.status.confirmed',
};

const STATUS_BADGE: Record<LocationStatus, string> = {
  not_set:             'bg-gray-100 text-gray-600',
  found_by_address:    'bg-blue-100 text-blue-700',
  adjusted_manually:   'bg-amber-100 text-amber-700',
  confirmed:           'bg-green-100 text-green-700',
};

export function PreciseLocationPicker({
  value, onChange, mode, cityHint, required, disabled,
}: PreciseLocationPickerProps) {
  const { t } = useI18n();
  const loc = value && value.locationStatus ? value : emptyLocation();

  const [searchQuery, setSearchQuery]     = useState('');
  const [searching, setSearching]         = useState(false);
  const [reverseLoading, setReverseLoading] = useState(false);
  const [searchError, setSearchError]     = useState<string | null>(null);

  // Refs for the map area (SVG) — used to translate click pixels into
  // lat/lng based on the active bounding box.
  const mapRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  /**
   * Active bounding box: prefer the location's saved city, then `cityHint`,
   * then the default preset (Moscow). Memoised so click→latlng conversions
   * stay stable across renders.
   */
  const preset = useMemo(() => presetForCity(loc.city || cityHint), [loc.city, cityHint]);

  /** Pixel point inside `mapRef` → (lat, lng). */
  function pixelToLatLng(px: number, py: number, w: number, h: number): { lat: number; lng: number } {
    const lng = preset.bounds.west  + (px / w) * (preset.bounds.east  - preset.bounds.west);
    const lat = preset.bounds.north - (py / h) * (preset.bounds.north - preset.bounds.south);
    return { lat, lng };
  }
  /** (lat, lng) → pixel inside `mapRef`. */
  function latLngToPixel(lat: number, lng: number, w: number, h: number): { x: number; y: number } {
    const x = ((lng - preset.bounds.west) / (preset.bounds.east  - preset.bounds.west))  * w;
    const y = ((preset.bounds.north - lat) / (preset.bounds.north - preset.bounds.south)) * h;
    return { x, y };
  }

  function commit(next: Location) {
    onChange(next);
  }

  /** Click / drop a marker on the map, or update from a drag. */
  const placeMarker = useCallback(async (lat: number, lng: number, source: 'click' | 'drag') => {
    if (disabled) return;
    // Optimistically place the marker — UX must feel instant.
    const next: Location = {
      ...loc,
      latitude: lat,
      longitude: lng,
      locationSource: source === 'drag' ? 'manual' : 'address',
      locationStatus: source === 'drag' ? 'adjusted_manually' : 'found_by_address',
      locationConfirmed: false,         // moving the pin always disarms confirm
    };
    commit(next);
    setReverseLoading(true);
    try {
      const parsed = await reverseGeocode(lat, lng);
      if (parsed) {
        commit({
          ...next,
          fullAddress:  parsed.fullAddress  ?? next.fullAddress,
          postalCode:   parsed.postalCode   ?? next.postalCode,
          country:      parsed.country      ?? next.country,
          city:         parsed.city         ?? next.city,
          district:     parsed.district     ?? next.district,
          street:       parsed.street       ?? next.street,
          building:     parsed.building     ?? next.building,
        });
      }
    } finally {
      setReverseLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc, disabled]);

  // ── Map mouse handlers ─────────────────────────────────────────────────
  function onMapClick(e: React.MouseEvent<HTMLDivElement>) {
    if (disabled || draggingRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const { lat, lng } = pixelToLatLng(e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height);
    void placeMarker(lat, lng, 'click');
  }

  function onMarkerPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (disabled) return;
    e.stopPropagation();
    e.preventDefault();
    const map = mapRef.current;
    if (!map) return;
    const rect = map.getBoundingClientRect();
    draggingRef.current = true;
    (e.target as Element).setPointerCapture?.(e.pointerId);

    const move = (ev: PointerEvent) => {
      const x = Math.max(0, Math.min(rect.width,  ev.clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, ev.clientY - rect.top));
      const { lat, lng } = pixelToLatLng(x, y, rect.width, rect.height);
      // Don't reverse-geocode on every move — only after release.
      commit({
        ...loc,
        latitude: lat, longitude: lng,
        locationSource: 'manual', locationStatus: 'adjusted_manually',
        locationConfirmed: false,
      });
    };
    const up = (ev: PointerEvent) => {
      const x = Math.max(0, Math.min(rect.width,  ev.clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, ev.clientY - rect.top));
      const { lat, lng } = pixelToLatLng(x, y, rect.width, rect.height);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      // Slight delay so the parent click-handler doesn't re-fire on the map.
      setTimeout(() => { draggingRef.current = false; }, 0);
      void placeMarker(lat, lng, 'drag');
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  // ── Search by address ─────────────────────────────────────────────────
  async function runSearch() {
    if (disabled) return;
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    setSearchError(null);
    try {
      const r = await geocodeAddress(q, loc.city || cityHint);
      if (!r) { setSearchError(t('location.search.notFound')); return; }
      commit({
        ...loc,
        fullAddress:  r.parsed?.fullAddress  ?? q,
        postalCode:   r.parsed?.postalCode   ?? loc.postalCode,
        country:      r.parsed?.country      ?? loc.country,
        city:         r.parsed?.city         ?? loc.city,
        district:     r.parsed?.district     ?? loc.district,
        street:       r.parsed?.street       ?? loc.street,
        building:     r.parsed?.building     ?? loc.building,
        latitude:     r.lat,
        longitude:    r.lng,
        locationSource: 'address',
        locationStatus: 'found_by_address',
        locationConfirmed: false,
      });
    } finally {
      setSearching(false);
    }
  }

  function confirmPoint() {
    if (disabled) return;
    if (!Number.isFinite(loc.latitude) || loc.latitude === 0) return;
    if (!Number.isFinite(loc.longitude) || loc.longitude === 0) return;
    commit({
      ...loc,
      locationStatus: 'confirmed',
      locationConfirmed: true,
      updatedAt: new Date().toISOString(),
    });
  }

  function reset() {
    if (disabled) return;
    commit(emptyLocation());
    setSearchQuery('');
    setSearchError(null);
  }

  function updateField<K extends keyof Location>(key: K, val: Location[K]) {
    if (disabled) return;
    // Editing an address field after confirmation disarms the confirm.
    commit({
      ...loc,
      [key]: val,
      locationConfirmed: false,
      locationStatus: loc.locationStatus === 'confirmed' ? 'adjusted_manually' : loc.locationStatus,
    });
  }

  // ── Marker pixel position ─────────────────────────────────────────────
  const hasMarker = Number.isFinite(loc.latitude) && Number.isFinite(loc.longitude) &&
                    loc.locationStatus !== 'not_set' &&
                    !(loc.latitude === 0 && loc.longitude === 0);
  const markerPos = hasMarker
    ? latLngToPixel(loc.latitude, loc.longitude, 100, 100)   // expressed in % of map
    : null;

  const externalMapsHref = hasMarker
    ? `https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`
    : '#';

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Title */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            {t('location.title')}
            {required && <span className="text-red-500">*</span>}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">{t('location.subtitle')}</p>
        </div>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${STATUS_BADGE[loc.locationStatus]}`}>
          {t(STATUS_KEY[loc.locationStatus])}
        </span>
      </div>

      {/* Search by address */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void runSearch(); } }}
            placeholder={t('location.search.placeholder')}
            disabled={disabled}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50" />
        </div>
        <button
          type="button"
          onClick={runSearch}
          disabled={disabled || searching || !searchQuery.trim()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 shrink-0">
          {searching
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Search className="w-4 h-4" />}
          {searching ? t('location.search.searching') : t('location.search.button')}
        </button>
      </div>
      {searchError && <p className="text-xs text-red-600">{searchError}</p>}
      <p className="text-[11px] text-gray-400">{t('location.search.tip')}</p>

      {/* Map */}
      <div
        ref={mapRef}
        onClick={onMapClick}
        className={`relative w-full aspect-[16/9] rounded-xl border border-gray-200 overflow-hidden select-none ${disabled ? '' : 'cursor-crosshair'}`}
        style={{
          background: 'linear-gradient(135deg, #e7f0ff 0%, #f0e7ff 100%)',
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px),
            linear-gradient(135deg, #e7f0ff 0%, #f0e7ff 100%)`,
          backgroundSize: '40px 40px, 40px 40px, 100% 100%',
        }}
        aria-label={t('location.help.clickMap')}
      >
        {/* Compass + scale hint */}
        <div className="absolute top-2 left-2 px-2 py-1 bg-white/80 backdrop-blur rounded-md text-[10px] font-mono text-gray-500 pointer-events-none">
          {loc.city || cityHint || '—'}
        </div>
        <div className="absolute bottom-2 right-2 px-2 py-1 bg-white/80 backdrop-blur rounded-md text-[10px] font-mono text-gray-500 pointer-events-none">
          {hasMarker ? formatLatLng(loc.latitude, loc.longitude) : t('location.help.clickMap')}
        </div>

        {reverseLoading && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-white/90 backdrop-blur rounded-md text-[10px] text-blue-700 font-semibold flex items-center gap-1 pointer-events-none">
            <Loader2 className="w-3 h-3 animate-spin" />
            {t('location.help.reverseGeocoding')}
          </div>
        )}

        {markerPos && (
          <div
            onPointerDown={onMarkerPointerDown}
            role="button"
            aria-label="marker"
            className={`absolute -translate-x-1/2 -translate-y-full ${disabled ? '' : 'cursor-grab active:cursor-grabbing'}`}
            style={{ left: `${markerPos.x}%`, top: `${markerPos.y}%` }}
          >
            <div className="w-7 h-7 rounded-full bg-red-500 ring-4 ring-red-200 shadow-lg flex items-center justify-center text-white">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="w-1 h-1 mx-auto rounded-full bg-red-700 -mt-0.5" />
          </div>
        )}
      </div>

      {/* Drag tip + reverse geocoding hint */}
      <p className="text-[11px] text-gray-400">
        {hasMarker ? t('location.help.dragMarker') : t('location.help.clickMap')}
      </p>

      {/* Address fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-gray-600 mb-1">{t('location.field.fullAddress')}</label>
          <input
            value={loc.fullAddress}
            onChange={e => updateField('fullAddress', e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">{t('location.field.postalCode')}</label>
          <input
            value={loc.postalCode}
            onChange={e => updateField('postalCode', e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">{t('location.field.city')}</label>
          <input
            value={loc.city}
            onChange={e => updateField('city', e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">{t('location.field.district')}</label>
          <input
            value={loc.district ?? ''}
            onChange={e => updateField('district', e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">{t('location.field.street')}</label>
          <input
            value={loc.street ?? ''}
            onChange={e => updateField('street', e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">{t('location.field.building')}</label>
          <input
            value={loc.building ?? ''}
            onChange={e => updateField('building', e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-gray-600 mb-1">{t('location.field.entranceHint')}</label>
          <input
            value={loc.entranceHint ?? ''}
            onChange={e => updateField('entranceHint', e.target.value)}
            placeholder="Подъезд 2, домофон 22, 4 этаж"
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50" />
        </div>
      </div>

      {/* Coordinates readout (read-only — marker is the source of truth) */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="text-gray-500">{t('location.coordsLabel')}:</span>
        <span className="font-mono text-gray-700">{hasMarker ? formatLatLng(loc.latitude, loc.longitude) : '—'}</span>
        {hasMarker && (
          <a href={externalMapsHref} target="_blank" rel="noopener noreferrer"
             className="ml-auto inline-flex items-center gap-1 text-blue-600 hover:text-blue-800">
            <ExternalLink className="w-3 h-3" />
            {t('location.openExternal')}
          </a>
        )}
      </div>

      {/* Confirm row */}
      <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={confirmPoint}
          disabled={disabled || !hasMarker || loc.locationConfirmed}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            loc.locationConfirmed
              ? 'bg-green-100 text-green-700 cursor-default'
              : 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-200 disabled:text-gray-500'
          }`}>
          <Check className="w-4 h-4" />
          {loc.locationConfirmed ? t('location.confirmed') : t('location.confirm')}
        </button>
        <button
          type="button"
          onClick={reset}
          disabled={disabled || !hasMarker}
          className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 hover:bg-gray-50 disabled:opacity-50 rounded-xl text-xs text-gray-600 transition-colors">
          <RotateCcw className="w-3.5 h-3.5" />
          {t('location.reset')}
        </button>
      </div>

      {/* Warning if not confirmed */}
      {!loc.locationConfirmed && hasMarker && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>
            {loc.locationStatus === 'adjusted_manually'
              ? t('location.warning.movedAfterConfirm')
              : t('location.warning.notConfirmed')}
          </p>
        </div>
      )}
      {!hasMarker && required && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>
            {mode === 'pickup_point' ? t('location.error.pvz_not_confirmed')
            : mode === 'warehouse'   ? t('location.error.warehouse_not_confirmed')
            :                          t('location.error.seller_not_confirmed')}
          </p>
        </div>
      )}
    </div>
  );
}
