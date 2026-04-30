import { useNavigate } from 'react-router';
import {
  ArrowLeft, ChevronRight, FileText, History, LogOut, Settings, Star, Wallet, Truck,
} from 'lucide-react';
import { useT } from '../i18n';
import { useCourierStore } from '../store/CourierStore';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

export function ProfilePage() {
  const t = useT();
  const navigate = useNavigate();
  const { state, logout, setOnline } = useCourierStore();

  if (!state.courier) return null;
  const c = state.courier;

  return (
    <div className="min-h-full bg-gray-50 flex flex-col">
      <header className="px-4 pt-5 pb-2 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-[18px] font-extrabold">{t('courier.profile')}</h1>
        <div className="w-10" />
      </header>

      <div className="px-4">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-5 text-white shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-extrabold">
              {c.name.split(' ').map(s => s[0]).slice(0, 2).join('')}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[18px] font-extrabold">{c.name}</div>
              <div className="text-white/80 text-sm">{c.phone}</div>
              <div className="mt-1 inline-flex items-center gap-1.5 bg-white/15 rounded-full px-2.5 py-0.5 text-xs font-semibold">
                <span className={`w-1.5 h-1.5 rounded-full ${state.isOnline ? 'bg-lime-300' : 'bg-gray-300'}`} />
                {state.isOnline ? t('courier.online') : t('courier.offline')}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="bg-white/10 rounded-2xl p-2">
              <div className="text-[20px] font-extrabold flex items-center justify-center gap-1">
                <Star className="w-4 h-4 fill-yellow-300 text-yellow-300" />
                {c.rating.toFixed(2)}
              </div>
              <div className="text-[11px] text-white/80 uppercase tracking-wide">{t('courier.rating')}</div>
            </div>
            <div className="bg-white/10 rounded-2xl p-2">
              <div className="text-[20px] font-extrabold">{c.totalDeliveries + state.history.length}</div>
              <div className="text-[11px] text-white/80 uppercase tracking-wide">{t('courier.deliveries')}</div>
            </div>
            <div className="bg-white/10 rounded-2xl p-2">
              <div className="text-[20px] font-extrabold">{state.earningsToday.toFixed(0)}</div>
              <div className="text-[11px] text-white/80 uppercase tracking-wide">{t('earnings.today')}</div>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={() => setOnline(!state.isOnline)}
            className={`w-full h-12 rounded-2xl font-bold transition-colors ${
              state.isOnline ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700'
            }`}
          >
            {state.isOnline ? t('online.go_offline') : t('online.go_online')}
          </button>
        </div>

        <ul className="mt-4 bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <ProfileLink icon={<History className="w-5 h-5" />} label={t('courier.history')} onClick={() => navigate('/history')} />
          <ProfileLink icon={<Wallet className="w-5 h-5" />} label={t('courier.earnings')} onClick={() => navigate('/earnings')} />
          <ProfileLink icon={<Truck className="w-5 h-5" />} label={`${t('courier.shift')} · ${c.vehicle}`} onClick={() => navigate('/delivery-settings')} />
          <ProfileLink icon={<FileText className="w-5 h-5" />} label={t('courier.documents')} onClick={() => navigate('/insurance')} />
          <ProfileLink icon={<Settings className="w-5 h-5" />} label={t('courier.settings')} onClick={() => navigate('/settings')} />
        </ul>

        <div className="mt-4">
          <LanguageSwitcher variant="list" />
        </div>

        <div className="mt-6 mb-8">
          <button
            onClick={() => { logout(); navigate('/login', { replace: true }); }}
            className="w-full h-12 rounded-2xl bg-white border border-rose-200 text-rose-600 font-bold flex items-center justify-center gap-2"
          >
            <LogOut className="w-5 h-5" />
            {t('courier.logout')}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProfileLink({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <li>
      <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3 active:bg-gray-50 border-b border-gray-100 last:border-0">
        <span className="text-gray-700">{icon}</span>
        <span className="flex-1 text-left text-[15px] font-semibold text-gray-900">{label}</span>
        <ChevronRight className="w-4 h-4 text-gray-300" />
      </button>
    </li>
  );
}
