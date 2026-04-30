import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  AlertTriangle, ChevronRight, Lock, MapPin, MessageCircle, Navigation,
  Package, Phone, ShieldCheck, Store,
} from 'lucide-react';
import { useT } from '../i18n';
import type { Order, OrderStatus } from '../store/types';
import { isCustomerInfoUnlocked } from '../store/CourierStore';
import { PackageCountModal } from './PackageCountModal';
import { DeliveryProofModal } from './DeliveryProofModal';
import { ProblemModal } from './ProblemModal';

interface Props {
  order: Order;
  isNearPickup: boolean;
  isNearCustomer: boolean;
  onAdvance: (next: OrderStatus) => void;
  onPackageData: (count: number, photo?: string, comment?: string) => void;
  onProof: (data: { photo?: string; code?: string; comment?: string }) => void;
  onComplete: () => void;
  onProblem: (data: { type: any; description: string; photos: string[]; videos: string[] }) => void;
}

export function ActiveOrderSheetContent({
  order, isNearPickup, isNearCustomer, onAdvance, onPackageData, onProof, onComplete, onProblem,
}: Props) {
  const t = useT();
  const navigate = useNavigate();
  const [pkgOpen, setPkgOpen] = useState(false);
  const [proofOpen, setProofOpen] = useState(false);
  const [problemOpen, setProblemOpen] = useState(false);

  const unlocked = isCustomerInfoUnlocked(order.status);
  const customerChannelKey = `customer:${order.id}`;

  const phase: 'pickup' | 'customer' = unlocked ? 'customer' : 'pickup';

  const primary = (() => {
    switch (order.status) {
      case 'accepted':
      case 'going_to_pickup':
        return {
          label: t('active.arrived_pickup'),
          enabled: isNearPickup,
          hint: !isNearPickup ? t('active.too_far_pickup') : undefined,
          onClick: () => onAdvance('arrived_at_pickup'),
        };
      case 'arrived_at_pickup':
        return {
          label: t('active.confirm_packages'),
          enabled: true,
          onClick: () => { onAdvance('package_count_required'); setPkgOpen(true); },
        };
      case 'package_count_required':
        return {
          label: t('active.confirm_packages'),
          enabled: true,
          onClick: () => setPkgOpen(true),
        };
      case 'picked_up':
        return {
          label: t('active.go_to_customer'),
          enabled: true,
          onClick: () => onAdvance('going_to_customer'),
        };
      case 'going_to_customer':
        return {
          label: t('active.arrived_customer'),
          enabled: isNearCustomer,
          hint: !isNearCustomer ? t('active.too_far_customer') : undefined,
          onClick: () => onAdvance('arrived_at_customer'),
        };
      case 'arrived_at_customer':
        return {
          label: t('active.deliver'),
          enabled: true,
          onClick: () => setProofOpen(true),
        };
      case 'problem':
      case 'support_required':
        return {
          label: t('active.contact_support'),
          enabled: true,
          onClick: () => navigate('/chat/support'),
        };
      default:
        return null;
    }
  })();

  return (
    <div className="bg-white">
      <div className="flex justify-center pt-3 pb-2">
        <div className="w-9 h-1 bg-[#DADADA] rounded-full" />
      </div>

      <div
        className="overflow-y-auto overscroll-contain px-5"
        style={{ maxHeight: 'calc(var(--drawer-snap-h, 55vh) - 140px)', WebkitOverflowScrolling: 'touch' }}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="text-[11px] uppercase tracking-wide font-bold text-emerald-700">
            {t(`status.${order.status}`)}
          </div>
          {unlocked ? (
            <button
              onClick={() => navigate(`/earnings/order/${order.id}`)}
              className="text-emerald-700 text-[13px] font-bold inline-flex items-center"
            >
              {t('order.number')} {order.number} <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 text-gray-400 text-xs font-semibold">
              <Lock className="w-3.5 h-3.5" />
              {t('privacy.order_number_after_pickup')}
            </span>
          )}
        </div>

        {/* Pickup card — always visible */}
        <div className="rounded-2xl border border-gray-100 p-3 mb-2 bg-gradient-to-br from-white to-emerald-50/30">
          <div className="text-[10px] uppercase tracking-wide text-gray-500 font-bold mb-1">
            {t('order.pickup_point')}
          </div>
          <div className="flex items-start gap-2">
            <Store className="w-5 h-5 text-emerald-600 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-extrabold text-[15px] text-gray-900 truncate">{order.pickup.name}</p>
              <p className="text-[12px] text-gray-600">{order.pickup.address}</p>
            </div>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${order.pickup.location.lat},${order.pickup.location.lng}`}
              target="_blank" rel="noreferrer"
              className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center"
            >
              <Navigation className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Customer card — privacy gate */}
        {phase === 'pickup' ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3 mb-2">
            <div className="flex items-start gap-2">
              <Lock className="w-5 h-5 text-amber-700 mt-0.5" />
              <div>
                <p className="font-extrabold text-[14px] text-amber-900">{t('privacy.address_locked')}</p>
                <p className="text-[12px] text-amber-800/90 mt-0.5">{t('privacy.address_locked_hint')}</p>
                <p className="text-[12px] text-amber-900 font-semibold mt-1">
                  {t('offer.area')}: <span className="font-bold">{order.customer.area ?? '—'}</span>
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-100 p-3 mb-2 bg-white">
            <div className="text-[10px] uppercase tracking-wide text-gray-500 font-bold mb-1">
              {t('order.customer')}
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-5 h-5 text-rose-500 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-extrabold text-[15px] text-gray-900">{order.customer.name}</p>
                <p className="text-[12px] text-gray-700">{order.customer.address}</p>
                <div className="flex flex-wrap gap-x-3 mt-0.5 text-[12px] text-gray-600">
                  {order.customer.entrance && <span><span className="text-gray-400">{t('order.entrance')}:</span> {order.customer.entrance}</span>}
                  {order.customer.apartment && <span><span className="text-gray-400">{t('order.apartment')}:</span> {order.customer.apartment}</span>}
                </div>
                {order.customer.comment && (
                  <p className="mt-1 text-[12px] bg-gray-50 rounded-lg px-2 py-1 text-gray-700">
                    «{order.customer.comment}»
                  </p>
                )}
              </div>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${order.customer.location.lat},${order.customer.location.lng}`}
                target="_blank" rel="noreferrer"
                className="w-9 h-9 rounded-full bg-rose-500 text-white flex items-center justify-center"
              >
                <Navigation className="w-4 h-4" />
              </a>
            </div>

            <div className="mt-2 flex gap-2">
              <a
                href={`tel:${order.customer.phone}`}
                className="flex-1 h-10 rounded-full bg-emerald-500 text-white text-sm font-bold flex items-center justify-center gap-1.5"
              >
                <Phone className="w-4 h-4" />
                {t('order.call_customer')}
              </a>
              <button
                onClick={() => navigate(`/chat/${customerChannelKey}`)}
                className="flex-1 h-10 rounded-full bg-sky-500 text-white text-sm font-bold flex items-center justify-center gap-1.5"
              >
                <MessageCircle className="w-4 h-4" />
                {t('order.message_customer')}
              </button>
            </div>
          </div>
        )}

        {/* Items */}
        <div className="rounded-2xl border border-gray-100 p-3 mb-2 bg-white">
          <div className="text-[10px] uppercase tracking-wide text-gray-500 font-bold mb-2">
            {t('order.items')}
          </div>
          {phase === 'pickup' ? (
            <div className="text-sm text-gray-500 italic">{t('order.no_items')}</div>
          ) : (
            <ul className="space-y-1">
              {order.items.map(it => (
                <li key={it.id} className="flex justify-between text-sm">
                  <span className="text-gray-800">{it.name}</span>
                  <span className="text-gray-500">×{it.quantity}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Pickup proof / package count summary if set */}
        {order.packageCount != null && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 mb-2 flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-600" />
            <span className="text-sm text-emerald-900 font-semibold">
              {t('pkg.count_label')}: <span className="font-extrabold">{order.packageCount}</span>
            </span>
          </div>
        )}

        {/* Cancel hint */}
        <div className="rounded-2xl bg-gray-50 p-3 mb-2 flex items-start gap-2">
          <ShieldCheck className="w-5 h-5 text-gray-500 mt-0.5" />
          <p className="text-[12px] text-gray-600">{t('active.no_cancel_hint')}</p>
        </div>

        <div className="flex gap-2 pb-2">
          <button
            onClick={() => setProblemOpen(true)}
            className="flex-1 h-11 rounded-full bg-amber-50 text-amber-700 font-bold text-sm flex items-center justify-center gap-1.5 border border-amber-200 active:bg-amber-100"
          >
            <AlertTriangle className="w-4 h-4" />
            {t('active.report_problem')}
          </button>
          <button
            onClick={() => navigate('/chat/support')}
            className="flex-1 h-11 rounded-full bg-gray-100 text-gray-800 font-bold text-sm flex items-center justify-center gap-1.5 active:bg-gray-200"
          >
            <MessageCircle className="w-4 h-4" />
            {t('active.contact_support')}
          </button>
        </div>
      </div>

      {/* Primary action */}
      <div
        className="px-5 bg-white border-t border-gray-100"
        style={{ paddingTop: '12px', paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
      >
        {primary && (
          <>
            <button
              onClick={primary.onClick}
              disabled={!primary.enabled}
              className={`w-full h-14 rounded-full text-[17px] font-bold transition-all ${
                primary.enabled
                  ? 'bg-emerald-500 text-white active:bg-emerald-600'
                  : 'bg-gray-200 text-gray-400'
              }`}
            >
              {primary.label}
            </button>
            {primary.hint && (
              <div className="text-center text-xs text-gray-500 mt-2">{primary.hint}</div>
            )}
          </>
        )}
      </div>

      <PackageCountModal
        open={pkgOpen}
        onClose={() => setPkgOpen(false)}
        onConfirm={({ count, photo, comment }) => {
          onPackageData(count, photo, comment);
          setPkgOpen(false);
        }}
      />
      <DeliveryProofModal
        open={proofOpen}
        onClose={() => setProofOpen(false)}
        onConfirm={(d) => { onProof(d); onComplete(); setProofOpen(false); }}
      />
      <ProblemModal
        open={problemOpen}
        onClose={() => setProblemOpen(false)}
        onSubmit={(d) => { onProblem(d); setProblemOpen(false); }}
      />
    </div>
  );
}
