import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useStore, store } from '../store/useStore';
import { ROLE_LABELS } from '../domain/roles';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { useT } from '../i18n';

const isUrl = (s: string) => /^(https?:|blob:|data:)/.test(s);

export function LoginPage() {
  const t = useT();
  const { workers } = useStore();
  const nav = useNavigate();
  const [pickedId, setPickedId] = useState<string | null>(null);

  const submit = () => {
    if (!pickedId) { toast.error(t('login.choose')); return; }
    if (!store.login(pickedId)) { toast.error(t('login.choose')); return; }
    toast.success(t('login.signIn'));
    nav('/');
  };

  return (
    <div className="min-h-screen bg-[#1F2430] flex flex-col px-4 pt-8 pb-8">
      <div className="max-w-md mx-auto w-full text-white flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-[28px]" style={{ fontWeight: 900 }}>{t('login.title')}</h1>
            <p className="text-white/60 text-[13px] mt-1" style={{ fontWeight: 500 }}>
              {t('login.subtitle')}
            </p>
          </div>
          <LanguageSwitcher variant="wide" />
        </div>

        <div className="space-y-2 mb-6 flex-1">
          {workers.map(w => (
            <button
              key={w.id}
              onClick={() => setPickedId(w.id)}
              className="w-full text-left rounded-2xl p-3 active-press flex items-center gap-3"
              style={{
                backgroundColor: pickedId === w.id ? '#2EA7E0' : 'rgba(255,255,255,0.08)',
                color: 'white', fontWeight: 700,
              }}
            >
              <div className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center text-[20px] overflow-hidden flex-shrink-0">
                {w.avatar
                  ? (isUrl(w.avatar)
                      ? <img src={w.avatar} alt={w.name} className="w-full h-full object-cover" />
                      : <span>{w.avatar}</span>)
                  : <span style={{ fontWeight: 900 }}>{w.name.charAt(0)}</span>}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[14px]">{w.name}</div>
                <div className="text-[11px] opacity-70 mt-0.5" style={{ fontWeight: 500 }}>
                  {w.position ?? ROLE_LABELS[w.role]} · {w.id}
                </div>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={submit}
          className="w-full h-12 rounded-2xl bg-[#00D27A] text-white active-press"
          style={{ fontWeight: 800 }}
        >
          {t('login.signIn')}
        </button>
      </div>
    </div>
  );
}
