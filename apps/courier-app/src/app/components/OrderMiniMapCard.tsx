import { Check, CheckCircle2, Clock, MapPin, Navigation, Package, Star, Store, Wallet, X } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useT } from '../i18n';
import { isCustomerInfoUnlocked } from '../store/CourierStore';
import type { Order } from '../store/types';

export type MiniMapMode = 'offer' | 'active' | 'delivered';

interface Props {
  order: Order;
  mode: MiniMapMode;
  onDismiss?: () => void;
  className?: string;
}

function googleMapsHref(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}

function durationLabel(start?: number, end?: number): string {
  if (!start || !end) return '—';
  const ms = Math.max(0, end - start);
  const min = Math.round(ms / 60000);
  return `${min}`;
}

export function OrderMiniMapCard({ order, mode, onDismiss, className = '' }: Props) {
  const t = useT();
  const navigate = useNavigate();

  // Delivered banner — congratulatory state
  if (mode === 'delivered') {
    const took = durationLabel(order.acceptedAt, order.deliveredAt);
    return (
      <div
        className={`pointer-events-auto w-[200px] rounded-2xl shadow-lg overflow-hidden bg-white relative ${className}`}
        data-testid="order-mini-map-card"
      >
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/30 text-white flex items-center justify-center"
            aria-label={t('common.close')}
          >
            <X className="w-3 h-3" />
          </button>
        )}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 px-3 py-3 text-white">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-[11px] font-extrabold uppercase tracking-wide">
              {t('mini.title.delivered')}
            </span>
          </div>
          <div className="mt-1 text-[12px] font-semibold opacity-95">
            {t('order.number')} {order.number}
          </div>
          <div className="mt-1 flex items-center gap-2 text-white/95 text-[11px]">
            <Clock className="w-3 h-3" />
            <span>{t('mini.delivered_in')} {took} {t('units.min')}</span>
          </div>
        </div>
        <button
          onClick={() => navigate(`/earnings/order/${order.id}`)}
          className="w-full flex items-center justify-center gap-1.5 h-9 bg-gray-900 text-white text-[12px] font-bold active:bg-gray-800"
        >
          <Wallet className="w-3.5 h-3.5" />
          {t('mini.view_receipt')} · {order.payAmount.toFixed(2)} {order.payCurrency}
        </button>
      </div>
    );
  }

  // Offer / active variants
  const isOffer = mode === 'offer';
  const unlocked = isCustomerInfoUnlocked(order.status);
  const variant: 'offer' | 'to_pickup' | 'to_customer' = isOffer
    ? 'offer'
    : unlocked
      ? 'to_customer'
      : 'to_pickup';

  const titleKey =
    variant === 'offer' ? 'mini.title.offer'
    : variant === 'to_pickup' ? 'mini.title.to_pickup'
    : 'mini.title.to_customer';

  const dest = variant === 'to_customer' ? order.customer.location : order.pickup.location;

  const accent =
    variant === 'offer' ? 'from-emerald-500 to-teal-600'
    : variant === 'to_pickup' ? 'from-sky-500 to-emerald-500'
    : 'from-rose-500 to-orange-500';

  return (
    <div
      className={`pointer-events-auto w-[200px] rounded-2xl shadow-lg overflow-hidden bg-white ${className}`}
      data-testid="order-mini-map-card"
    >
      <div className={`bg-gradient-to-br ${accent} px-3 py-2 text-white relative`}>
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
        {order.bonus > 0 && (
          <div
            className="absolute top-1.5 right-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-400 text-amber-950 text-[10px] font-extrabold leading-none shadow"
            title={t('bonus.eligible')}
          >
            <Star className="w-3 h-3 fill-amber-950" />
            +{order.bonus}
          </div>
        )}
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
          <span className="font-semibold text-gray-900 truncate ml-2">
            {variant === 'offer' && unlocked ? <Check className="w-3 h-3 inline" /> : null}
            {t(`status.${order.status}`)}
          </span>
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
