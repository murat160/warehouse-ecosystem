import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Drawer as DrawerPrimitive } from 'vaul';
import { AlertTriangle, BellRing } from 'lucide-react';
import { useT } from '../i18n';
import { useCourierStore } from '../store/CourierStore';
import { CourierMapView, type RouteInfo } from '../components/CourierMapView';
import { FloatingButtons } from '../components/FloatingButtons';
import { OrderMiniMapCard } from '../components/OrderMiniMapCard';
import { Drawer } from '../components/Drawer';
import { BottomSheetContent } from '../components/BottomSheetContent';
import { DeclineModal } from '../components/DeclineModal';
import { ConfirmOfflineModal } from '../components/ConfirmOfflineModal';
import { DeclineButton } from '../components/DeclineButton';
import { PickupTimeBubble } from '../components/PickupTimeBubble';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { isWithin, watchPosition, type LatLng } from '../lib/geo';
import type { OrderStatus, ProblemType } from '../store/types';

export function CourierMap() {
  const t = useT();
  const navigate = useNavigate();
  const {
    state, setOnline, acceptOffer, declineOffer, transition,
    setPackageData, completeOrder, reportProblem, clearLastDelivered,
  } = useCourierStore();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDeclineOpen, setIsDeclineOpen] = useState(false);
  const [isConfirmOfflineOpen, setIsConfirmOfflineOpen] = useState(false);
  const [snap, setSnap] = useState<number | string | null>(0.55);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [courierPos, setCourierPos] = useState<LatLng | null>(null);
  const [geoNotice, setGeoNotice] = useState<string | null>(null);

  const variant: 'idle' | 'offer' | 'active' =
    state.activeOrder ? 'active' : state.pendingOffer ? 'offer' : 'idle';

  // Geolocation watcher with mock fallback when no order active
  useEffect(() => {
    const seed: LatLng = state.activeOrder?.pickup.location ?? { lat: 52.2297, lng: 21.0117 };
    const stop = watchPosition((s) => {
      setCourierPos(s.position);
      if (s.source === 'mock') setGeoNotice(t('geo.using_mock'));
      else setGeoNotice(null);
    }, seed);
    return stop;
  }, [state.activeOrder?.pickup.location, t]);

  // Proximity computed from real position OR routeInfo distance for fallback
  const isNearPickup = useMemo(() => {
    if (!state.activeOrder) return false;
    if (courierPos) return isWithin(state.activeOrder.pickup.location, courierPos);
    if (routeInfo) return routeInfo.toCafeDistance <= 50;
    return false;
  }, [state.activeOrder, courierPos, routeInfo]);

  const isNearCustomer = useMemo(() => {
    if (!state.activeOrder) return false;
    if (courierPos) return isWithin(state.activeOrder.customer.location, courierPos);
    if (routeInfo) return routeInfo.toClientDistance <= 50;
    return false;
  }, [state.activeOrder, courierPos, routeInfo]);

  // Toggle online with confirmation
  const handleToggleOnline = useCallback(() => {
    if (state.isOnline) setIsConfirmOfflineOpen(true);
    else setOnline(true);
  }, [state.isOnline, setOnline]);

  const confirmGoOffline = () => {
    setIsConfirmOfflineOpen(false);
    setOnline(false);
  };

  const handleAccept = () => acceptOffer();
  const handleDeclineConfirm = (reason: string) => {
    declineOffer(reason);
    setIsDeclineOpen(false);
  };

  const handleAdvance = (s: OrderStatus) => transition(s);
  const handlePackageData = (count: number, photo?: string, comment?: string) => setPackageData(count, photo, comment);
  const handleComplete = (code: string) => completeOrder(code);
  const handleProblem = (d: { type: ProblemType; description: string; photos: string[]; videos: string[] }) => reportProblem(d);

  const phaseForMap: 'pickup' | 'on_way' | 'delivered' = state.activeOrder
    ? (['accepted','going_to_pickup','arrived_at_pickup','package_count_required'].includes(state.activeOrder.status) ? 'pickup'
      : state.activeOrder.status === 'delivered' ? 'delivered' : 'on_way')
    : 'pickup';

  const offerOrActive = state.activeOrder ?? state.pendingOffer;
  // Show the right-top "Delivered" mini card briefly after completeOrder.
  const miniOrder = offerOrActive ?? state.lastDelivered;
  const miniMode: 'offer' | 'active' | 'delivered' =
    state.activeOrder ? 'active' : state.pendingOffer ? 'offer' : 'delivered';

  return (
    <div className="relative w-full h-full bg-gray-100 overflow-hidden">
      {/* Map */}
      <CourierMapView
        pickupLocation={offerOrActive?.pickup.location}
        deliveryLocation={offerOrActive?.customer.location}
        courierLocation={state.activeOrder ? courierPos ?? undefined : undefined}
        showRoute={Boolean(offerOrActive)}
        orderStatus={phaseForMap}
        onRouteInfo={setRouteInfo}
      />

      {/* Pickup time bubble visible when offer or pickup phase */}
      {offerOrActive && phaseForMap === 'pickup' && (
        <PickupTimeBubble
          time={`${offerOrActive.etaMinutes} min`}
          position={offerOrActive.pickup.location}
          isReady={offerOrActive.pickupReady}
          readyTime={
            offerOrActive.pickupReady
              ? undefined
              : `${t('offer.pickup_in')} ~${offerOrActive.pickupReadyInMinutes ?? 30} min`
          }
          isActive={Boolean(state.activeOrder)}
        />
      )}

      <FloatingButtons
        onMenuClick={() => setIsDrawerOpen(true)}
        onStatsClick={() => navigate('/profile')}
        showLocation={Boolean(state.activeOrder)}
      />

      <div className="absolute top-4 right-[72px] z-30">
        <LanguageSwitcher />
      </div>

      {/* Right-top mini route card — visible during offer / active / and ~8s after delivered. */}
      {miniOrder && (
        <div className="absolute top-[68px] right-3 z-30 pointer-events-none">
          <OrderMiniMapCard
            order={miniOrder}
            mode={miniMode}
            onDismiss={miniMode === 'delivered' ? clearLastDelivered : undefined}
          />
        </div>
      )}

      {variant === 'offer' && (
        <DeclineButton
          onClick={() => setIsDeclineOpen(true)}
          variant="offer"
        />
      )}

      {/* Geo notice */}
      {geoNotice && (
        <div className="absolute top-20 left-4 right-4 z-30 pointer-events-none">
          <div className="bg-amber-100/95 border border-amber-300 text-amber-900 rounded-xl px-3 py-2 text-xs font-semibold flex items-start gap-2 max-w-md mx-auto pointer-events-auto">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <div>{geoNotice}</div>
              <div className="text-[11px] font-normal mt-0.5 opacity-80">{t('geo.https_required')}</div>
            </div>
          </div>
        </div>
      )}

      {/* New order notification banner */}
      {variant === 'offer' && (
        <div className="absolute top-20 left-4 right-4 z-30 pointer-events-none">
          <div className="bg-emerald-500/95 text-white rounded-xl px-3 py-2 text-sm font-semibold flex items-center gap-2 max-w-md mx-auto pointer-events-auto">
            <BellRing className="w-4 h-4" />
            <span>{t('offer.new_order')}</span>
          </div>
        </div>
      )}

      {/* Bottom sheet */}
      <DrawerPrimitive.Root
        open
        modal={false}
        snapPoints={[0.18, 0.55, 0.93]}
        activeSnapPoint={snap}
        setActiveSnapPoint={setSnap}
        dismissible={false}
      >
        <DrawerPrimitive.Portal>
          <DrawerPrimitive.Content
            data-vaul-drawer-direction="bottom"
            className="fixed inset-x-0 bottom-0 z-40 flex flex-col rounded-t-3xl bg-white shadow-[0_-12px_30px_rgba(0,0,0,0.15)] outline-none mx-auto w-full max-w-[420px]"
            style={{ maxHeight: '95vh', '--drawer-snap-h': typeof snap === 'number' ? `${snap * 100}vh` : '55vh' } as React.CSSProperties}
          >
            <DrawerPrimitive.Title className="sr-only">{t('app.title')}</DrawerPrimitive.Title>
            <DrawerPrimitive.Description className="sr-only">{t('app.title')}</DrawerPrimitive.Description>
            <BottomSheetContent
              variant={variant}
              onToggleOnline={handleToggleOnline}
              isNearPickup={isNearPickup}
              isNearCustomer={isNearCustomer}
              onAdvance={handleAdvance}
              onPackageData={handlePackageData}
              onComplete={handleComplete}
              onProblem={handleProblem}
              onAccept={handleAccept}
            />
          </DrawerPrimitive.Content>
        </DrawerPrimitive.Portal>
      </DrawerPrimitive.Root>

      <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

      <DeclineModal
        isOpen={isDeclineOpen}
        onClose={() => setIsDeclineOpen(false)}
        onConfirmDecline={handleDeclineConfirm}
        onStartTask={() => { handleAccept(); setIsDeclineOpen(false); }}
      />

      <ConfirmOfflineModal
        isOpen={isConfirmOfflineOpen}
        onClose={() => setIsConfirmOfflineOpen(false)}
        onConfirm={confirmGoOffline}
      />
    </div>
  );
}
