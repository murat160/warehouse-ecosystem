import { useNavigate } from 'react-router';
import { ArrowLeft, Bell, Bike, Car, Filter, Footprints, MapPin, Volume2, Zap } from 'lucide-react';
import type { ReactNode } from 'react';
import { useT } from '../i18n';
import type { TKey } from '../i18n';
import { useCourierStore } from '../store/CourierStore';
import type { Vehicle } from '../store/types';

const VEHICLES: { code: Vehicle; tk: TKey; icon: ReactNode }[] = [
  { code: 'walk',    tk: 'dset.transport.walk',    icon: <Footprints className="w-5 h-5" /> },
  { code: 'bike',    tk: 'dset.transport.bike',    icon: <Bike className="w-5 h-5" /> },
  { code: 'scooter', tk: 'dset.transport.scooter', icon: <Zap className="w-5 h-5" /> },
  { code: 'car',     tk: 'dset.transport.car',     icon: <Car className="w-5 h-5" /> },
];

export function DeliverySettingsPage() {
  const t = useT();
  const navigate = useNavigate();
  const { state, setOnline, updateSettings } = useCourierStore();
  const s = state.settings;

  return (
    <div className="min-h-full bg-gray-50">
      <header className="bg-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10 border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full active:bg-gray-100 flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-[18px] font-extrabold">{t('dset.title')}</h1>
          <p className="text-xs text-gray-500">{t('dset.subtitle')}</p>
        </div>
      </header>

      <div className="px-4 pt-3 space-y-5 pb-8">
        <Section title={t('dset.work_status')}>
          <ToggleRow
            icon={<Filter className="w-5 h-5 text-emerald-500" />}
            label={t('dset.online')}
            description={t('dset.online_desc')}
            checked={state.isOnline}
            onChange={(v) => setOnline(v)}
          />
          <ToggleRow
            icon={<Zap className="w-5 h-5 text-amber-500" />}
            label={t('dset.auto_accept')}
            description={t('dset.auto_accept_desc')}
            checked={s.autoAccept}
            onChange={(v) => updateSettings({ autoAccept: v })}
          />
        </Section>

        <Section title={t('dset.transport')}>
          <div className="grid grid-cols-4 gap-2 p-2">
            {VEHICLES.map(v => (
              <button
                key={v.code}
                onClick={() => updateSettings({ vehicle: v.code })}
                className={`flex flex-col items-center gap-1 py-3 rounded-2xl border-2 ${
                  s.vehicle === v.code
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-900'
                    : 'border-transparent bg-white text-gray-600'
                }`}
              >
                {v.icon}
                <span className="text-[11px] font-bold">{t(v.tk)}</span>
              </button>
            ))}
          </div>
        </Section>

        <Section title={t('dset.filters')}>
          <SliderRow
            icon={<MapPin className="w-5 h-5 text-rose-500" />}
            label={t('dset.max_distance')}
            value={s.maxDistanceKm}
            min={1}
            max={20}
            step={1}
            unit={t('units.km')}
            onChange={(v) => updateSettings({ maxDistanceKm: v })}
          />
          <SliderRow
            icon={<Filter className="w-5 h-5 text-emerald-500" />}
            label={t('dset.min_income')}
            value={s.minPayoutPln}
            min={5}
            max={100}
            step={1}
            unit={t('units.currency')}
            onChange={(v) => updateSettings({ minPayoutPln: v })}
          />
        </Section>

        <Section title={t('dset.notifications_section')}>
          <ToggleRow
            icon={<Bell className="w-5 h-5 text-sky-500" />}
            label={t('settings.notifications')}
            description={s.notifications ? t('common.yes') : t('common.no')}
            checked={s.notifications}
            onChange={(v) => updateSettings({ notifications: v })}
          />
          <ToggleRow
            icon={<Volume2 className="w-5 h-5 text-emerald-500" />}
            label={t('dset.sound')}
            description={s.sound ? t('common.yes') : t('common.no')}
            checked={s.sound}
            onChange={(v) => updateSettings({ sound: v })}
          />
          <ToggleRow
            icon={<Zap className="w-5 h-5 text-amber-500" />}
            label={t('dset.vibration')}
            description={s.vibration ? t('common.yes') : t('common.no')}
            checked={s.vibration}
            onChange={(v) => updateSettings({ vibration: v })}
          />
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wide text-gray-500 px-1 mb-2">{title}</div>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">{children}</div>
    </div>
  );
}

interface ToggleRowProps {
  icon: ReactNode;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

function ToggleRow({ icon, label, description, checked, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0">
      {icon}
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
    </div>
  );
}

interface SliderRowProps {
  icon: ReactNode;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}

function SliderRow({ icon, label, value, min, max, step, unit, onChange }: SliderRowProps) {
  return (
    <div className="flex flex-col gap-2 px-4 py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3">
        {icon}
        <div className="flex-1 text-[15px] font-semibold text-gray-900">{label}</div>
        <div className="text-[14px] font-extrabold text-gray-900">{value} {unit}</div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-emerald-500"
      />
    </div>
  );
}
