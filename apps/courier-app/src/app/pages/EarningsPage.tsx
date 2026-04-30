import { useNavigate } from 'react-router';
import { ArrowLeft, Wallet, Package, ChevronRight } from 'lucide-react';
import { useT } from '../i18n';
import { useCourierStore } from '../store/CourierStore';

export function EarningsPage() {
  const t = useT();
  const navigate = useNavigate();
  const { state } = useCourierStore();

  const today = state.earningsToday;
  const completedToday = state.history.filter(o => {
    const at = o.deliveredAt ?? 0;
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    return at >= startOfDay.getTime();
  });
  const week = state.history.slice(-30).reduce((s, o) => s + (o.earnings ?? 0), 0);

  return (
    <div className="min-h-full bg-gray-50">
      <header className="bg-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10 border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full active:bg-gray-100 flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-[18px] font-extrabold">{t('courier.earnings')}</h1>
      </header>

      <div className="px-4 pt-3 space-y-3 pb-8">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-5 text-white shadow-lg">
          <div className="text-sm font-semibold uppercase tracking-wide opacity-80">{t('earnings.today')}</div>
          <div className="text-[36px] font-extrabold leading-none mt-1">
            {today.toFixed(2)} <span className="text-[18px] font-bold opacity-80">PLN</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="bg-white/15 rounded-2xl p-2.5">
              <div className="text-[11px] uppercase opacity-80">{t('earnings.total_orders')}</div>
              <div className="text-[20px] font-extrabold">{completedToday.length}</div>
            </div>
            <div className="bg-white/15 rounded-2xl p-2.5">
              <div className="text-[11px] uppercase opacity-80">{t('earnings.week')}</div>
              <div className="text-[20px] font-extrabold">{week.toFixed(0)}</div>
            </div>
          </div>
        </div>

        <section>
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 px-1 mb-2">{t('history.title')}</div>
          {state.history.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center text-gray-500 border border-gray-100">
              <Package className="w-7 h-7 mx-auto mb-2 text-gray-400" />
              {t('history.empty')}
            </div>
          ) : (
            <ul className="space-y-2">
              {state.history.map(o => (
                <li key={o.id}>
                  <button
                    onClick={() => navigate(`/earnings/order/${o.id}`)}
                    className="w-full text-left bg-white rounded-2xl p-3 active:bg-gray-50 border border-gray-100"
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="font-extrabold text-[15px] truncate">{o.number}</div>
                        <div className="text-xs text-gray-500 truncate">{o.pickup.name}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="inline-flex items-center gap-1 text-emerald-600 font-extrabold">
                          <Wallet className="w-4 h-4" />
                          {(o.earnings ?? o.payAmount).toFixed(2)}
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
