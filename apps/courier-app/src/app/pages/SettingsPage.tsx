import { useNavigate } from 'react-router';
import { ArrowLeft, Bell, FileText, Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { useT } from '../i18n';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { useCourierStore } from '../store/CourierStore';

export function SettingsPage() {
  const t = useT();
  const navigate = useNavigate();
  const { state, updateSettings } = useCourierStore();

  return (
    <div className="min-h-full bg-gray-50">
      <header className="bg-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10 border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full active:bg-gray-100 flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-[18px] font-extrabold">{t('courier.settings')}</h1>
      </header>

      <div className="px-4 pt-4 space-y-5 pb-8">
        <LanguageSwitcher variant="list" />

        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 px-1 mb-2">
            {t('settings.notifications')}
          </div>
          <ul className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <Toggle
              icon={<Bell className="w-5 h-5" />}
              label={t('settings.notifications')}
              description={state.settings.notifications ? t('common.yes') : t('common.no')}
              checked={state.settings.notifications}
              onChange={(v) => updateSettings({ notifications: v })}
            />
          </ul>
        </div>

        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 px-1 mb-2">{t('settings.legal')}</div>
          <ul className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <Item icon={<FileText className="w-5 h-5" />} label={t('courier.documents')} onClick={() => navigate('/insurance')} />
            <Item icon={<Info className="w-5 h-5" />} label={t('settings.about')} onClick={() => navigate('/help')} />
          </ul>
        </div>
      </div>
    </div>
  );
}

function Item({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <li>
      <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3 active:bg-gray-50 border-b border-gray-100 last:border-0">
        <span className="text-gray-700">{icon}</span>
        <span className="flex-1 text-left text-[15px] font-semibold text-gray-900">{label}</span>
      </button>
    </li>
  );
}

interface ToggleProps {
  icon: ReactNode;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}

function Toggle({ icon, label, description, checked, onChange }: ToggleProps) {
  return (
    <li className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0">
      <span className="text-gray-700">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-semibold text-gray-900">{label}</div>
        {description && <div className="text-[12px] text-gray-500">{description}</div>}
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className="w-11 h-6 bg-gray-200 peer-checked:bg-emerald-500 rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 peer-checked:after:translate-x-5 after:transition-transform" />
      </label>
    </li>
  );
}
