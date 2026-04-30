import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Bike, Phone, ShieldCheck } from 'lucide-react';
import { useT } from '../i18n';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { useCourierStore } from '../store/CourierStore';

export function LoginPage() {
  const t = useT();
  const navigate = useNavigate();
  const { login } = useCourierStore();
  const [phone, setPhone] = useState('+993 ');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [error, setError] = useState<string | null>(null);

  function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    if (phone.replace(/\D/g, '').length < 7) {
      setError(t('login.error.invalid'));
      return;
    }
    setError(null);
    setStep('code');
  }

  function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (code !== '0000') {
      setError(t('login.error.invalid'));
      return;
    }
    login(phone);
    navigate('/', { replace: true });
  }

  return (
    <div className="relative min-h-full bg-gradient-to-b from-emerald-500 to-teal-600 flex flex-col">
      <div className="flex justify-end p-4">
        <LanguageSwitcher />
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 pb-8">
        <div className="text-white mb-8 fade-in">
          <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center mb-4">
            <Bike className="w-7 h-7" />
          </div>
          <h1 className="text-[32px] font-extrabold leading-tight">{t('login.heading')}</h1>
          <p className="text-white/80 mt-1">{t('login.subtitle')}</p>
        </div>

        <form
          onSubmit={step === 'phone' ? handleSendCode : handleVerify}
          className="bg-white rounded-3xl p-5 shadow-xl space-y-4 fade-in"
        >
          {step === 'phone' ? (
            <>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                  {t('login.phone')}
                </span>
                <div className="mt-1 flex items-center gap-2 bg-gray-50 rounded-2xl px-4 py-3">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    autoFocus
                    className="flex-1 bg-transparent outline-none text-[17px] font-semibold"
                  />
                </div>
              </label>
              {error && <div className="text-sm text-rose-500 font-semibold">{error}</div>}
              <button className="w-full h-14 rounded-full bg-emerald-500 text-white text-[17px] font-bold active:bg-emerald-600">
                {t('login.send_code')}
              </button>
            </>
          ) : (
            <>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                  {t('login.enter_code')}
                </span>
                <div className="mt-1 flex items-center gap-2 bg-gray-50 rounded-2xl px-4 py-3">
                  <ShieldCheck className="w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    inputMode="numeric"
                    value={code}
                    onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    autoFocus
                    className="flex-1 bg-transparent outline-none text-[24px] tracking-[0.5em] font-bold"
                    placeholder="0000"
                  />
                </div>
              </label>
              {error && <div className="text-sm text-rose-500 font-semibold">{error}</div>}
              <button className="w-full h-14 rounded-full bg-emerald-500 text-white text-[17px] font-bold active:bg-emerald-600">
                {t('login.verify')}
              </button>
              <button
                type="button"
                onClick={() => setStep('phone')}
                className="w-full text-sm font-semibold text-gray-500 py-2"
              >
                {t('common.back')}
              </button>
            </>
          )}
          <div className="text-center text-xs text-gray-400">{t('login.test_hint')}</div>
        </form>
      </div>
    </div>
  );
}
