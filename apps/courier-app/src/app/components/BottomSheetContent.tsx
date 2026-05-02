import { useNavigate } from 'react-router';
import { Calendar, ChevronRight, History, MessageCircle, MessagesSquare, Wallet } from 'lucide-react';
import { useT } from '../i18n';
import { useCourierStore } from '../store/CourierStore';
import { OfferSheetContent } from './OfferSheetContent';
import { ActiveOrderSheetContent } from './ActiveOrderSheetContent';
import { SwipeButton } from './SwipeButton';
import type { OrderStatus, ProblemType } from '../store/types';

interface Props {
  variant: 'idle' | 'offer' | 'active';
  onToggleOnline: () => void;
  isNearPickup: boolean;
  isNearCustomer: boolean;
  onAdvance: (next: OrderStatus) => void;
  onPackageData: (count: number, photo?: string, comment?: string) => void;
  onComplete: (code: string) => { ok: boolean; reason?: 'wrong_code' | 'no_active' };
  onProblem: (data: { type: ProblemType; description: string; photos: string[]; videos: string[] }) => void;
  onAccept: () => void;
  onToggleCheck: (itemId: string) => void;
}

export function BottomSheetContent(props: Props) {
  const t = useT();
  const navigate = useNavigate();
  const { state } = useCourierStore();

  if (props.variant === 'offer' && state.pendingOffer) {
    return <OfferSheetContent order={state.pendingOffer} onAccept={props.onAccept} />;
  }

  if (props.variant === 'active' && state.activeOrder) {
    return (
      <ActiveOrderSheetContent
        order={state.activeOrder}
        isNearPickup={props.isNearPickup}
        isNearCustomer={props.isNearCustomer}
        onAdvance={props.onAdvance}
        onPackageData={props.onPackageData}
        onComplete={props.onComplete}
        onProblem={props.onProblem}
        onToggleCheck={props.onToggleCheck}
      />
    );
  }

  return (
    <div className="bg-white">
      <div className="flex justify-center pt-3 pb-2">
        <div className="w-9 h-1 bg-[#DADADA] rounded-full" />
      </div>

      <div
        className="overflow-y-auto overscroll-contain"
        style={{ maxHeight: 'calc(var(--drawer-snap-h, 55vh) - 130px)', WebkitOverflowScrolling: 'touch' }}
      >
        <h1 className="text-[28px] font-extrabold text-[#1F2430] leading-[1.05] px-5 mt-1 mb-1 tracking-tight">
          {state.isOnline ? t('map.searching_orders') : t('online.go_online')}
        </h1>
        <p className="text-sm text-[#6B7280] px-5 mb-3">
          {state.isOnline ? t('map.demand_medium') : t('courier.offline')}
        </p>

        <div className="px-5 mb-3">
          <div className="bg-emerald-50 rounded-2xl p-3 flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-2xl font-extrabold text-emerald-600">
              %
            </div>
            <div className="flex-1">
              <p className="text-[12px] text-emerald-700 font-semibold">{t('map.bonus_now')}</p>
              <p className="text-[20px] font-extrabold text-emerald-900 leading-tight">+20%</p>
              <p className="text-[12px] text-emerald-700">12:00–16:00</p>
            </div>
          </div>
        </div>

        <div className="mb-3 px-5">
          <h3 className="text-[16px] font-extrabold text-[#1F2430] mb-2">{t('map.quick_links')}</h3>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <Link icon={<History className="w-5 h-5" />} label={t('map.previous_task')} onClick={() => navigate('/history')} />
            <Link icon={<Wallet className="w-5 h-5" />} label={t('courier.earnings')} onClick={() => navigate('/earnings')} />
            <Link icon={<Calendar className="w-5 h-5" />} label={t('map.scheduled_offline')} onClick={() => navigate('/delivery-settings')} />
            <Link icon={<MessagesSquare className="w-5 h-5" />} label={t('chats.title')} onClick={() => navigate('/chats')} />
            <Link icon={<MessageCircle className="w-5 h-5" />} label={t('map.support_service')} onClick={() => navigate('/chat/support')} />
          </div>
        </div>
      </div>

      <div
        className="px-5 bg-white border-t border-gray-100"
        style={{ paddingTop: '12px', paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
      >
        <SwipeButton
          onConfirm={props.onToggleOnline}
          text={state.isOnline ? t('online.swipe_offline') : t('online.swipe_online')}
          isOnline={state.isOnline}
        />
      </div>
    </div>
  );
}

function Link({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 h-[52px] px-4 active:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
    >
      <span className="text-gray-700">{icon}</span>
      <span className="flex-1 text-left text-[15px] font-semibold text-[#1F2430]">{label}</span>
      <ChevronRight className="w-4 h-4 text-gray-300" />
    </button>
  );
}
