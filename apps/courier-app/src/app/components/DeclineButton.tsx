import { useT } from '../i18n';

interface DeclineButtonProps {
  onClick: () => void;
  variant: 'offer' | 'active';
  hasNavigationButton?: boolean;
}

export function DeclineButton({ onClick, variant, hasNavigationButton = false }: DeclineButtonProps) {
  const t = useT();
  const isOffer = variant === 'offer';

  // If navigation button is shown, position the decline button below it
  const topPosition = hasNavigationButton ? 'top-[68px]' : 'top-4';

  return (
    <button
      onClick={onClick}
      className={`absolute ${topPosition} right-4 z-30 px-5 py-2.5 rounded-full font-bold text-sm transition-all shadow-md ${
        isOffer
          ? 'bg-white text-red-600 border-2 border-white hover:bg-red-50'
          : 'bg-red-50 text-red-700 border-2 border-red-100 hover:bg-red-100'
      }`}
      style={{
        borderRadius: '24px',
      }}
    >
      {t('offer.decline')}
    </button>
  );
}