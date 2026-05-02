import { Clock, MapPin, Navigation, Package, Store, Wallet } from 'lucide-react';
import { useT } from '../i18n';
import { isCustomerInfoUnlocked } from '../store/CourierStore';
import type { Order, OrderStatus } from '../store/types';

type Variant = 'offer' | 'to_pickup' | 'to_customer';

interface Props {
  order: Order;
  pendingOffer?: boolean;
  className?: string;
}

function pickVariant(order: Order, isOffer: boolean): Variant {
  if (isOffer) return 'offer';
  return isCustomerInfoUnlocked(order.status) ? 'to_customer' : 'to_pickup';
}

function googleMapsHref(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}

export function OrderMiniMapCard({ order, pendingOffer = false, className = '' }: Props) {
  const t = useT();
  const variant = pickVariant(order, pendingOffer);

  const titleKey =
    variant === 'offer' ? 'mini.title.offer'
    : variant === 'to_pickup' ? 'mini.title.to_pickup'
    : 'mini.title.to_customer';

  const dest = variant === 'to_customer'
    ? order.customer.location
    : order.pickup.location;

  const accent =
    variant === 'offer' ? 'from-emerald-500 to-teal-600'
    : variant === 'to_pickup' ? 'from-sky-500 to-emerald-500'
    : 'from-rose-500 to-orange-500';

  return (
    <div
      className={`pointer-events-auto w-[200px] rounded-2xl shadow-lg overflow-hidden bg-white ${className}`}
      data-testid="order-mini-map-card"
    >
      <div className={`bg-gradient-to-br ${accent} px-3 py-2 text-white`}>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" />
          <span className="text-[11px] font-extrabold uppercase tracking-wide">{t(titleKey)}</span>
        </div>
        <div className="mt-1 flex items-center gap-2 text-white/95 text-[12px] font-semibold">
          <Wallet className="w-3.5 h-3.5" />
          <span>{order.payAmount.toFixed(2)} {order.payCurrency}</span>
          <span className="opacity-60">·</span>
          <Clock className="w-3.5 h-3.5" />
          <span>{order.etaMinutes} {t('units.min')}</span>
        </div>
      </div>

      <div className="px-3 py-2 space-y-1.5">
        <div className="flex items-start gap-1.5">
          <Store className="w-3.5 h-3.5 text-emerald-600 mt-[2px] flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-extrabold text-gray-900 truncate">{order.pickup.name}</div>
            <div className="text-[10px] text-gray-500 truncate">{order.pickup.address}</div>
          </div>
        </div>

        <div className="flex items-start gap-1.5">
          <MapPin className={`w-3.5 h-3.5 mt-[2px] flex-shrink-0 ${variant === 'to_customer' ? 'text-rose-500' : 'text-amber-500'}`} />
          <div className="flex-1 min-w-0">
            {variant === 'to_customer' ? (
              <>
                <div className="text-[12px] font-extrabold text-gray-900 truncate">{order.customer.name}</div>
                <div className="text-[10px] text-gray-500 truncate">{order.customer.address}</div>
              </>
            ) : (
              <>
                <div className="text-[10px] uppercase tracking-wide font-bold text-amber-700">
                  {t('offer.area')}
                </div>
                <div className="text-[12px] font-semibold text-gray-700 truncate">
                  {order.customer.area ?? '—'}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] text-gray-500 pt-0.5">
          <div className="inline-flex items-center gap-1">
            <Package className="w-3 h-3" />
            <span>{order.distanceKm.toFixed(1)} {t('units.km')}</span>
          </div>
          <span className="font-semibold text-gray-900">{statusLabel(order.status, t)}</span>
        </div>
      </div>

      <a
        href={googleMapsHref(dest.lat, dest.lng)}
        target="_blank"
        rel="noreferrer"
        className="flex items-center justify-center gap-1.5 h-9 bg-gray-900 text-white text-[12px] font-bold active:bg-gray-800"
      >
        <Navigation className="w-3.5 h-3.5" />
        {t('mini.open_route')}
      </a>
    </div>
  );
}

function statusLabel(status: OrderStatus, t: (k: any) => string) {
  return t(`status.${status}`);
}
