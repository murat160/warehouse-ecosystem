import { Store, Clock } from 'lucide-react';
import { useT } from '../i18n';

interface PickupTimeBubbleProps {
  time: string;
  position: { lat: number; lng: number };
  isReady: boolean;
  readyTime?: string;
  isActive?: boolean;
}

export function PickupTimeBubble({ time, isReady, readyTime, isActive = false }: PickupTimeBubbleProps) {
  const t = useT();

  if (isActive) {
    return (
      <div className="absolute top-[15%] left-[12%] z-20 bg-[#00D27A] rounded-2xl px-3 py-2.5 shadow-lg flex items-center gap-2 fade-in">
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
          {isReady ? <Store className="w-4 h-4 text-white" /> : <Clock className="w-4 h-4 text-white" />}
        </div>
        <div className="flex flex-col">
          <p className="text-[10px] font-bold text-white/90 leading-tight uppercase tracking-wide">{t('offer.pickup_at')}</p>
          <p className="text-sm font-extrabold text-white whitespace-nowrap leading-tight">
            {isReady ? t('offer.pickup_ready') : (readyTime ?? `${t('offer.pickup_in')} ~30 min`)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute top-[15%] left-[12%] z-20 bg-white rounded-2xl px-3 py-2.5 shadow-lg flex items-center gap-2 fade-in">
      <div className="w-8 h-8 rounded-full bg-[#2EA7E0] flex items-center justify-center flex-shrink-0">
        <Store className="w-4 h-4 text-white" />
      </div>
      <p className="text-sm font-extrabold text-[#1F2430] whitespace-nowrap">
        {t('offer.pickup_at')} · {time}
      </p>
    </div>
  );
}
