export interface LatLng { lat: number; lng: number; }

export const PROXIMITY_THRESHOLD_M = 50;

export function haversineMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
}

export type GeoSource = 'gps' | 'mock' | 'unavailable';

export interface GeoState {
  source: GeoSource;
  position: LatLng | null;
  error?: string;
}

export function isSecureForGeo(): boolean {
  if (typeof window === 'undefined') return false;
  return window.isSecureContext === true || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
}

export function watchPosition(
  onUpdate: (state: GeoState) => void,
  mockFallback: LatLng,
): () => void {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
    onUpdate({ source: 'mock', position: mockFallback, error: 'unsupported' });
    return () => {};
  }
  if (!isSecureForGeo()) {
    onUpdate({ source: 'mock', position: mockFallback, error: 'insecure_context' });
    return () => {};
  }
  let watchId: number | null = null;
  try {
    watchId = navigator.geolocation.watchPosition(
      (pos) => onUpdate({ source: 'gps', position: { lat: pos.coords.latitude, lng: pos.coords.longitude } }),
      (err) => onUpdate({ source: 'mock', position: mockFallback, error: err.message }),
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 10_000 },
    );
  } catch (e: any) {
    onUpdate({ source: 'mock', position: mockFallback, error: e?.message ?? 'failed' });
  }
  return () => {
    if (watchId != null) navigator.geolocation.clearWatch(watchId);
  };
}

export function isWithin(target: LatLng, current: LatLng | null, threshold = PROXIMITY_THRESHOLD_M): boolean {
  if (!current) return false;
  return haversineMeters(target, current) <= threshold;
}
