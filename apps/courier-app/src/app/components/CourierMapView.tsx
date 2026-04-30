import { useEffect, useRef, useState, useCallback } from 'react';

// ──────────────────────────────────────────────────────────────
// Leaflet is loaded entirely from CDN at runtime to avoid
// bundling the large CJS package (which broke Figma's bundler).
// ──────────────────────────────────────────────────────────────
const LEAFLET_CDN_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_CDN_JS  = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

let _leafletPromise: Promise<void> | null = null;

function loadLeafletFromCDN(): Promise<void> {
  if (_leafletPromise) return _leafletPromise;

  _leafletPromise = new Promise<void>((resolve, reject) => {
    // CSS
    if (!document.querySelector(`link[href="${LEAFLET_CDN_CSS}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = LEAFLET_CDN_CSS;
      link.crossOrigin = '';
      document.head.appendChild(link);
    }

    // JS – already loaded?
    if ((window as any).L) {
      setupLeafletDefaults();
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = LEAFLET_CDN_JS;
    script.crossOrigin = '';
    script.onload = () => {
      setupLeafletDefaults();
      resolve();
    };
    script.onerror = () => reject(new Error('Failed to load Leaflet from CDN'));
    document.head.appendChild(script);
  });

  return _leafletPromise;
}

function setupLeafletDefaults() {
  const L = (window as any).L;
  if (!L) return;
  try { delete L.Icon.Default.prototype._getIconUrl; } catch { /* noop */ }
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

/** Shorthand accessor – only call after leaflet is loaded */
function getL(): any { return (window as any).L; }

// ── Types ────────────────────────────────────────────────────
interface Location { lat: number; lng: number }

export interface RouteInfo {
  toCafeDistance: number;
  toClientDistance: number;
  toCafeDuration: number;
  toClientDuration: number;
}

interface CourierMapViewProps {
  showRoute?: boolean;
  showFullRoute?: boolean;
  pickupLocation?: Location;
  deliveryLocation?: Location;
  courierLocation?: Location;
  center?: [number, number];
  zoom?: number;
  orderStatus?: 'pickup' | 'on_way' | 'delivered';
  onRouteInfo?: (info: RouteInfo) => void;
}

interface RouteSegment {
  coordinates: [number, number][];
  distance: number;
  duration: number;
}

// ── Icon factories (called only after L is available) ────────
function createCourierIcon() {
  return getL().divIcon({
    className: 'courier-location-marker',
    html: `
      <div class="courier-pulse-ring"></div>
      <div class="courier-pulse-ring courier-pulse-ring-2"></div>
      <div class="courier-dot-outer"></div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });
}

function createPickupIcon() {
  return getL().divIcon({
    className: 'custom-pickup-marker',
    html: `<div class="pickup-pin"><div class="pickup-pin-inner"></div></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
}

function createDeliveryIcon() {
  return getL().divIcon({
    className: 'custom-delivery-marker',
    html: `<div class="delivery-pin"><div class="delivery-pin-inner"></div></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
}

function createDistanceLabel(distanceMeters: number, durationSeconds: number, color: string) {
  const km = (distanceMeters / 1000).toFixed(1);
  const min = Math.max(1, Math.round(durationSeconds / 60));
  return getL().divIcon({
    className: 'route-distance-wrapper',
    html: `<div class="route-distance-pill" style="--route-accent: ${color}">
      <span class="route-distance-km">${km} км</span>
      <span class="route-distance-sep">·</span>
      <span class="route-distance-time">~${min} мин</span>
    </div>`,
    iconSize: [130, 32],
    iconAnchor: [65, 16],
  });
}

// ── Routing helpers ──────────────────────────────────────────
async function fetchOSRMRoute(from: Location, to: Location): Promise<RouteSegment | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=false`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const data = await res.json();
    if (data.code === 'Ok' && data.routes?.length > 0) {
      const route = data.routes[0];
      return {
        coordinates: route.geometry.coordinates.map(
          (c: number[]) => [c[1], c[0]] as [number, number]
        ),
        distance: route.distance,
        duration: route.duration,
      };
    }
    return null;
  } catch {
    return null;
  }
}

function haversineDistance(from: Location, to: Location): number {
  const R = 6371000;
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((from.lat * Math.PI) / 180) *
      Math.cos((to.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function createFallbackSegment(from: Location, to: Location): RouteSegment {
  const dist = haversineDistance(from, to);
  return {
    coordinates: [[from.lat, from.lng], [to.lat, to.lng]],
    distance: dist,
    duration: dist / 8.33,
  };
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

// ── Component ────────────────────────────────────────────────
export function CourierMapView({
  showRoute = false,
  showFullRoute = false,
  pickupLocation,
  deliveryLocation,
  courierLocation,
  center = [52.2297, 21.0122],
  zoom = 13,
  orderStatus = 'pickup',
  onRouteInfo,
}: CourierMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const courierMarkerRef = useRef<any>(null);
  const pickupMarkerRef = useRef<any>(null);
  const deliveryMarkerRef = useRef<any>(null);
  const routeLayerGroupRef = useRef<any>(null);
  const simulatedPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const targetPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const onRouteInfoRef = useRef(onRouteInfo);
  useEffect(() => { onRouteInfoRef.current = onRouteInfo; });

  const [leafletReady, setLeafletReady] = useState(() => !!(window as any).L);
  const [routeData, setRouteData] = useState<{ segment1: RouteSegment; segment2: RouteSegment } | null>(null);

  // ── 0. Load Leaflet from CDN ──────────────────────────────
  useEffect(() => {
    let cancelled = false;
    loadLeafletFromCDN().then(() => {
      if (!cancelled) setLeafletReady(true);
    });
    return () => { cancelled = true; };
  }, []);

  // ── 1. Initialize map (once leaflet is ready) ─────────────
  useEffect(() => {
    if (!leafletReady || !mapRef.current || mapInstanceRef.current) return;

    const L = getL();
    const mapCenter: [number, number] = courierLocation
      ? [courierLocation.lat, courierLocation.lng]
      : center;

    const map = L.map(mapRef.current, {
      center: mapCenter,
      zoom,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '',
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [leafletReady]);

  // ── 2. Courier marker + real-time GPS simulation ──────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = getL();
    if (!map || !L || !courierLocation) return;

    simulatedPosRef.current = { lat: courierLocation.lat, lng: courierLocation.lng };
    targetPosRef.current = { lat: courierLocation.lat, lng: courierLocation.lng };

    if (!courierMarkerRef.current) {
      courierMarkerRef.current = L.marker(
        [courierLocation.lat, courierLocation.lng],
        { icon: createCourierIcon(), zIndexOffset: 1000 }
      ).addTo(map);
    } else {
      courierMarkerRef.current.setLatLng([courierLocation.lat, courierLocation.lng]);
    }

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (!simulatedPosRef.current) return;
      const base = simulatedPosRef.current;
      targetPosRef.current = {
        lat: base.lat + (Math.random() - 0.48) * 0.0003,
        lng: base.lng + (Math.random() - 0.48) * 0.0003,
      };
    }, 3000);

    let lastTime = performance.now();
    const animate = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      if (simulatedPosRef.current && targetPosRef.current && courierMarkerRef.current) {
        const speed = Math.min(dt * 0.8, 1);
        simulatedPosRef.current.lat = lerp(simulatedPosRef.current.lat, targetPosRef.current.lat, speed);
        simulatedPosRef.current.lng = lerp(simulatedPosRef.current.lng, targetPosRef.current.lng, speed);
        courierMarkerRef.current.setLatLng([simulatedPosRef.current.lat, simulatedPosRef.current.lng]);
      }
      animFrameRef.current = requestAnimationFrame(animate);
    };
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [courierLocation?.lat, courierLocation?.lng, leafletReady]);

  // ── 3. Fetch real road routes from OSRM ───────────────────
  useEffect(() => {
    if (!showRoute || !courierLocation || !pickupLocation || !deliveryLocation) {
      setRouteData(null);
      return;
    }

    let cancelled = false;

    (async () => {
      const [seg1, seg2] = await Promise.all([
        fetchOSRMRoute(courierLocation, pickupLocation),
        fetchOSRMRoute(pickupLocation, deliveryLocation),
      ]);

      if (cancelled) return;

      setRouteData({
        segment1: seg1 || createFallbackSegment(courierLocation, pickupLocation),
        segment2: seg2 || createFallbackSegment(pickupLocation, deliveryLocation),
      });
    })();

    return () => { cancelled = true; };
  }, [
    showRoute,
    courierLocation?.lat,
    courierLocation?.lng,
    pickupLocation?.lat,
    pickupLocation?.lng,
    deliveryLocation?.lat,
    deliveryLocation?.lng,
  ]);

  // ── 4. Draw routes + markers on map ───────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = getL();
    if (!map || !L) return;

    if (routeLayerGroupRef.current) {
      map.removeLayer(routeLayerGroupRef.current);
      routeLayerGroupRef.current = null;
    }
    if (pickupMarkerRef.current) {
      map.removeLayer(pickupMarkerRef.current);
      pickupMarkerRef.current = null;
    }
    if (deliveryMarkerRef.current) {
      map.removeLayer(deliveryMarkerRef.current);
      deliveryMarkerRef.current = null;
    }

    if (!routeData || !showRoute || !pickupLocation || !deliveryLocation) {
      if (courierLocation && !showRoute) {
        map.setView([courierLocation.lat, courierLocation.lng], zoom, { animate: true });
      }
      return;
    }

    const group = L.layerGroup().addTo(map);
    routeLayerGroupRef.current = group;

    const allBoundsPoints: any[] = [];

    const drawSeg1 = showFullRoute || orderStatus === 'pickup';
    const drawSeg2 = showFullRoute || orderStatus === 'on_way';
    const showPickupMarker = showFullRoute || orderStatus === 'pickup';
    const showDeliveryMarker = showFullRoute || orderStatus === 'on_way';

    if (drawSeg1) {
      const seg1 = routeData.segment1;
      const seg1Active = showFullRoute ? true : orderStatus === 'pickup';
      const seg1Color = '#00D27A';

      L.polyline(seg1.coordinates, {
        color: '#ffffff',
        weight: seg1Active ? 10 : 7,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(group);

      L.polyline(seg1.coordinates, {
        color: seg1Active ? seg1Color : '#B8B8B8',
        weight: seg1Active ? 6 : 4,
        opacity: seg1Active ? 1 : 0.55,
        lineCap: 'round',
        lineJoin: 'round',
        ...(seg1Active ? {} : { dashArray: '10, 8' }),
      }).addTo(group);

      const label1Idx = Math.max(1, Math.floor(seg1.coordinates.length * 0.35));
      if (seg1.coordinates[label1Idx]) {
        L.marker(seg1.coordinates[label1Idx], {
          icon: createDistanceLabel(seg1.distance, seg1.duration, seg1Color),
          interactive: false,
          zIndexOffset: 600,
        }).addTo(group);
      }

      seg1.coordinates.forEach((c: [number, number]) => allBoundsPoints.push(L.latLng(c[0], c[1])));
    }

    if (drawSeg2) {
      const seg2 = routeData.segment2;
      const seg2Active = showFullRoute ? false : orderStatus === 'on_way';
      const seg2Color = '#2EA7E0';

      L.polyline(seg2.coordinates, {
        color: '#ffffff',
        weight: seg2Active ? 10 : 7,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(group);

      L.polyline(seg2.coordinates, {
        color: seg2Active ? seg2Color : '#B8B8B8',
        weight: seg2Active ? 6 : 4,
        opacity: seg2Active ? 1 : 0.55,
        lineCap: 'round',
        lineJoin: 'round',
        ...(seg2Active ? {} : { dashArray: '10, 8' }),
      }).addTo(group);

      const label2Idx = Math.max(1, Math.floor(seg2.coordinates.length * 0.65));
      if (seg2.coordinates[label2Idx]) {
        L.marker(seg2.coordinates[label2Idx], {
          icon: createDistanceLabel(seg2.distance, seg2.duration, seg2Color),
          interactive: false,
          zIndexOffset: 600,
        }).addTo(group);
      }

      seg2.coordinates.forEach((c: [number, number]) => allBoundsPoints.push(L.latLng(c[0], c[1])));
    }

    if (showPickupMarker) {
      pickupMarkerRef.current = L.marker(
        [pickupLocation.lat, pickupLocation.lng],
        { icon: createPickupIcon(), zIndexOffset: 800 }
      ).addTo(map);
    }

    if (showDeliveryMarker) {
      deliveryMarkerRef.current = L.marker(
        [deliveryLocation.lat, deliveryLocation.lng],
        { icon: createDeliveryIcon(), zIndexOffset: 800 }
      ).addTo(map);
    }

    if (allBoundsPoints.length > 0) {
      const bounds = L.latLngBounds(allBoundsPoints);
      map.fitBounds(bounds, {
        padding: [70, 50],
        paddingBottomRight: [50, 280],
        maxZoom: 15,
        animate: true,
      });
    }

    if (onRouteInfoRef.current) {
      onRouteInfoRef.current({
        toCafeDistance: routeData.segment1.distance,
        toClientDistance: routeData.segment2.distance,
        toCafeDuration: routeData.segment1.duration,
        toClientDuration: routeData.segment2.duration,
      });
    }
  }, [routeData, orderStatus, showRoute, showFullRoute, leafletReady]);

  // ── 5. Recenter on courier via custom event ───────────────
  const handleRecenter = useCallback(() => {
    if (mapInstanceRef.current && simulatedPosRef.current) {
      mapInstanceRef.current.setView(
        [simulatedPosRef.current.lat, simulatedPosRef.current.lng],
        zoom,
        { animate: true }
      );
    }
  }, [zoom]);

  useEffect(() => {
    const handler = () => handleRecenter();
    window.addEventListener('courier-recenter', handler);
    return () => window.removeEventListener('courier-recenter', handler);
  }, [handleRecenter]);

  return (
    <div
      ref={mapRef}
      style={{ height: '100%', width: '100%', zIndex: 0 }}
      className="absolute inset-0"
    />
  );
}
