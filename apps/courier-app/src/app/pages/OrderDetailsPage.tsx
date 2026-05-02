import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, MapPin, MessageCircle, Package, Phone, Receipt, ShieldCheck, Store, Wallet } from 'lucide-react';
import { useT } from '../i18n';
import { useCourierStore } from '../store/CourierStore';

export function OrderDetailsPage() {
  const t = useT();
  const navigate = useNavigate();
  const { orderId } = useParams();
  const { state } = useCourierStore();

  const order = state.history.find(o => o.id === orderId) ?? (state.activeOrder?.id === orderId ? state.activeOrder : null);

  if (!order) {
    return (
      <div className="min-h-full bg-gray-50">
        <header className="bg-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10 border-b border-gray-100">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full active:bg-gray-100 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-[18px] font-extrabold">{t('order.number')}</h1>
        </header>
        <div className="px-6 py-10 text-center text-gray-500">{t('common.error.generic')}</div>
      </div>
    );
  }

  // Privacy: show full customer info only if order is past pickup OR delivered (in history)
  const fullVisible =
    order.status === 'delivered' ||
    ['picked_up', 'going_to_customer', 'arrived_at_customer'].includes(order.status);

  return (
    <div className="min-h-full bg-gray-50">
      <header className="bg-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10 border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full active:bg-gray-100 flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-[18px] font-extrabold">{t('order.number')} {order.number}</h1>
          <p className="text-xs text-gray-500">{t(`status.${order.status}`)}</p>
        </div>
        <button
          onClick={() => navigate(`/chat/customer:${order.id}`)}
          className="w-10 h-10 rounded-full bg-sky-500 text-white flex items-center justify-center"
          aria-label={t('chat.customer')}
        >
          <MessageCircle className="w-4 h-4" />
        </button>
      </header>

      <div className="px-4 pt-3 space-y-3 pb-8">
        <section className="bg-white rounded-2xl p-4 border border-gray-100">
          <h2 className="text-[10px] uppercase tracking-wide text-gray-500 font-bold mb-2">
            {t('order.pickup_point')}
          </h2>
          <div className="flex items-start gap-2">
            <Store className="w-5 h-5 text-emerald-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-extrabold text-[15px]">{order.pickup.name}</p>
              <p className="text-[13px] text-gray-600">{order.pickup.address}</p>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl p-4 border border-gray-100">
          <h2 className="text-[10px] uppercase tracking-wide text-gray-500 font-bold mb-2">
            {t('order.customer')}
          </h2>
          {fullVisible ? (
            <>
              <div className="flex items-start gap-2">
                <MapPin className="w-5 h-5 text-rose-500 mt-0.5" />
                <div className="flex-1">
                  <p className="font-extrabold text-[15px]">{order.customer.name}</p>
                  <p className="text-[13px] text-gray-700">{order.customer.address}</p>
                  <div className="flex flex-wrap gap-x-3 mt-0.5 text-[12px] text-gray-600">
                    {order.customer.entrance && <span><span className="text-gray-400">{t('order.entrance')}:</span> {order.customer.entrance}</span>}
                    {order.customer.apartment && <span><span className="text-gray-400">{t('order.apartment')}:</span> {order.customer.apartment}</span>}
                  </div>
                  {order.customer.comment && (
                    <p className="mt-1 text-[12px] bg-gray-50 rounded-lg px-2 py-1 text-gray-700">«{order.customer.comment}»</p>
                  )}
                </div>
              </div>
              {order.status !== 'delivered' && (
                <a
                  href={`tel:${order.customer.phone}`}
                  className="mt-3 inline-flex items-center gap-1.5 text-emerald-700 font-bold text-sm"
                >
                  <Phone className="w-4 h-4" />
                  {t('order.call_customer')}
                </a>
              )}
            </>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-[13px] text-amber-900 font-extrabold">{t('privacy.address_locked')}</p>
              <p className="text-[12px] text-amber-800 mt-0.5">{t('privacy.address_locked_hint')}</p>
            </div>
          )}
        </section>

        <section className="bg-white rounded-2xl p-4 border border-gray-100">
          <h2 className="text-[10px] uppercase tracking-wide text-gray-500 font-bold mb-2">
            {t('order.items')}
          </h2>
          {fullVisible ? (
            <ul className="space-y-1">
              {order.items.map(it => (
                <li key={it.id} className="flex justify-between text-sm">
                  <span className="text-gray-800">{it.name}</span>
                  <span className="text-gray-500">×{it.quantity}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-gray-500 italic">{t('order.no_items')}</div>
          )}
        </section>

        <section className="bg-white rounded-2xl p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 inline-flex items-center gap-1.5"><Wallet className="w-4 h-4" />{t('offer.payment')}</span>
            <span className="text-[18px] font-extrabold">{order.payAmount.toFixed(2)} {order.payCurrency}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 inline-flex items-center gap-1.5"><Receipt className="w-4 h-4" />{t('offer.bonus')}</span>
            <span className="text-sm font-bold text-emerald-700">+{order.bonus}</span>
          </div>
          {order.packageCount != null && (
            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm text-gray-600 inline-flex items-center gap-1.5"><Package className="w-4 h-4" />{t('pkg.count_label')}</span>
              <span className="text-sm font-bold">{order.packageCount}</span>
            </div>
          )}
        </section>

        {/* Customer confirmation marker — proofCode is set only when the courier
            entered the right code at handover, so its presence proves the customer
            confirmed the delivery. */}
        {order.proofCode && (
          <section className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
            <ShieldCheck className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-extrabold text-emerald-900">{t('code.confirmed_at')}</div>
              <div className="text-sm text-emerald-800 mt-0.5">
                {t('order.number')} {order.number} · {t('code.confirm')}
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-200 text-emerald-900 font-extrabold tracking-widest text-sm">
              ••••
            </span>
          </section>
        )}
      </div>
    </div>
  );
}
