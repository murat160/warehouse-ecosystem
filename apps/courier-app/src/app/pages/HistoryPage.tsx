import { useNavigate } from 'react-router';
import { ArrowLeft, MapPin, Package, Wallet } from 'lucide-react';
import { useT } from '../i18n';
import { useCourierStore } from '../store/CourierStore';

function formatDate(ts: number) {
  const d = new Date(ts);
  return d.toLocaleString();
}

export function HistoryPage() {
  const t = useT();
  const navigate = useNavigate();
  const { state } = useCourierStore();

  return (
    <div className="min-h-full bg-gray-50">
      <header className="bg-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10 border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full active:bg-gray-100 flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-[18px] font-extrabold">{t('history.title')}</h1>
      </header>

      {state.history.length === 0 ? (
        <div className="px-6 py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <Package className="w-7 h-7 text-gray-400" />
          </div>
          <p className="text-gray-500">{t('history.empty')}</p>
        </div>
      ) : (
        <ul className="px-3 py-3 space-y-2">
          {state.history.map(o => (
            <li key={o.id}>
              <button
                onClick={() => navigate(`/earnings/order/${o.id}`)}
                className="w-full text-left bg-white rounded-2xl p-3 active:bg-gray-50 border border-gray-100"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-extrabold text-[15px]">{o.number}</span>
                  <span className="text-xs text-gray-500">{o.deliveredAt ? formatDate(o.deliveredAt) : '—'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-gray-700">
                  <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="truncate">{o.pickup.name}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-gray-500">{t('history.completed_at')}</span>
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-extrabold">
                    <Wallet className="w-4 h-4" />
                    {(o.earnings ?? o.payAmount).toFixed(2)} {o.payCurrency}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
