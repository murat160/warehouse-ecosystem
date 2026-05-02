import { Clock, MapPin, ShieldAlert, Star, Store } from 'lucide-react';
import { useT } from '../i18n';
import type { Order } from '../store/types';
import { SwipeToAccept } from './SwipeToAccept';

interface Props {
  order: Order;
  onAccept: () => void;
}

export function OfferSheetContent({ order, onAccept }: Props) {
  const t = useT();
  const totalPay = order.payAmount.toFixed(2);

  return (
    <div className="bg-white">
      <div className="flex justify-center pt-3 pb-2">
        <div className="w-9 h-1 bg-[#DADADA] rounded-full" />
      </div>

      <div
        className="overflow-y-auto overscroll-contain px-5"
        style={{ maxHeight: 'calc(var(--drawer-snap-h, 55vh) - 130px)', WebkitOverflowScrolling: 'touch' }}
      >
        <div className="text-[11px] uppercase tracking-wide font-bold text-emerald-600 mt-1 mb-1">
          {t('offer.new_order')}
        </div>

        <div className="mb-2">
          <div className="flex items-end justify-between gap-2 mb-1">
            <h1 className="text-[32px] font-extrabold text-[#1F2430] leading-none">
              {totalPay} {order.payCurrency}
            </h1>
            {/* Reward / star badge — visible only when the order is bonus-eligible. */}
            {order.bonus > 0 && (
              <div
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 border border-amber-200"
                title={t('bonus.eligible')}
              >
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span className="text-[13px] font-extrabold text-amber-900 leading-none">
                  +{order.bonus}
                </span>
                <span className="text-[10px] uppercase tracking-wide font-bold text-amber-700 leading-none">
                  {t('bonus.star')}
                </span>
              </div>
            )}
          </div>
          <p className="text-[11px] text-gray-500">{t('offer.payment')}</p>
          {order.bonus > 0 && (
            <p className="text-[11px] text-amber-700 font-semibold mt-0.5">
              {t('bonus.points')}: +{order.bonus}
            </p>
          )}
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-3 mb-3 flex items-start gap-2">
          <ShieldAlert className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-bold text-emerald-900">{t('privacy.address_locked')}</p>
            <p className="text-[11px] text-emerald-800/80 leading-snug mt-0.5">
              {t('privacy.address_locked_hint')}
            </p>
          </div>
        </div>

        <div className="mb-3">
          <p className="text-[10px] text-gray-500 mb-0.5 font-semibold uppercase tracking-wide">
            {t('offer.cafe_or_shop')}
          </p>
          <h2 className="text-[15px] font-extrabold text-[#1F2430] mb-1">{order.pickup.name}</h2>
          <div className="flex items-start gap-1.5">
            <Store className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
            <p className="text-[12px] text-gray-600 leading-tight">{order.pickup.address}</p>
          </div>
        </div>

        <div className="mb-3">
          <p className="text-[10px] text-gray-500 mb-0.5 font-semibold uppercase tracking-wide">
            {t('offer.area')}
          </p>
          <div className="flex items-start gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
            <p className="text-[13px] text-gray-700 font-semibold">
              {order.customer.area ?? '—'}
              <span className="ml-2 text-[11px] text-gray-400 font-normal">{t('privacy.area_only')}</span>
            </p>
          </div>
        </div>

        <div className="space-y-2 pb-2">
          <div>
            <p className="text-[9px] text-gray-500 font-bold mb-0.5 uppercase tracking-wide">
              {t('offer.distance')}
            </p>
            <p className="text-lg font-extrabold text-[#1F2430]">
              {order.distanceKm.toFixed(1)} km
            </p>
          </div>

          <div>
            <p className="text-[9px] text-gray-500 font-bold mb-0.5 uppercase tracking-wide">
              {t('offer.estimated_time')}
            </p>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#1F2430]" />
              <p className="text-lg font-extrabold text-[#1F2430]">{order.etaMinutes} min</p>
            </div>
          </div>

          <div>
            <p className="text-[9px] text-gray-500 font-bold mb-0.5 uppercase tracking-wide">
              {t('offer.pickup_at')}
            </p>
            <p className="text-base font-extrabold text-[#1F2430]">
              {order.pickupReady
                ? t('offer.pickup_ready')
                : `${t('offer.pickup_in')} ${order.pickupReadyInMinutes ?? 30} min`}
            </p>
          </div>
        </div>
      </div>

      <div
        className="px-5 bg-white border-t border-gray-100"
        style={{ paddingTop: '12px', paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
      >
        <SwipeToAccept onAccept={onAccept} label={t('offer.swipe_accept')} />
      </div>
    </div>
  );
}
