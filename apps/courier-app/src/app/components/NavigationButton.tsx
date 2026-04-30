interface NavigationButtonProps {
  destination: {
    lat: number;
    lng: number;
    label: string;
  };
  orderStatus: 'pickup' | 'on_way' | 'delivered';
}

export function NavigationButton({ destination, orderStatus }: NavigationButtonProps) {
  const handleNavigate = () => {
    const { lat, lng, label } = destination;
    const destCoords = `${lat},${lng}`;
    const navLabel = orderStatus === 'pickup' ? `Café: ${label}` : `Client: ${label}`;
    const destLabel = encodeURIComponent(navLabel);

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);

    if (isIOS) {
      window.location.href = `maps://maps.apple.com/?daddr=${destCoords}&dirflg=d&t=m&q=${destLabel}`;
      setTimeout(() => {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${destCoords}&travelmode=driving`, '_blank');
      }, 500);
    } else if (isAndroid) {
      window.location.href = `google.navigation:q=${destCoords}&mode=d`;
      setTimeout(() => {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${destCoords}&travelmode=driving`, '_blank');
      }, 500);
    } else {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${destCoords}&travelmode=driving`, '_blank');
    }
  };

  return (
    <button
      onClick={handleNavigate}
      className="absolute top-4 right-[72px] z-30 w-11 h-11 bg-white rounded-xl shadow-[0_6px_18px_rgba(0,0,0,0.12)] active:scale-95 transition-all flex items-center justify-center overflow-hidden"
      aria-label="Открыть навигацию"
      title="Открыть в Google Maps"
    >
      {/* Google Maps icon */}
      <svg width="26" height="26" viewBox="0 0 92 92" fill="none">
        {/* Background shape */}
        <path d="M46 8C30.536 8 18 20.536 18 36c0 22.5 28 48 28 48s28-25.5 28-48c0-15.464-12.536-28-28-28z" fill="#EA4335"/>
        <path d="M46 8C30.536 8 18 20.536 18 36c0 22.5 28 48 28 48s28-25.5 28-48c0-15.464-12.536-28-28-28z" fill="url(#gm_grad)" fillOpacity="0.3"/>
        {/* Inner circle */}
        <circle cx="46" cy="36" r="11" fill="#B31412"/>
        <circle cx="46" cy="36" r="8" fill="#F5F5F5"/>
        {/* Google Maps colored quadrants */}
        <path d="M46 28c-4.4 0-8 3.6-8 8h8V28z" fill="#4285F4"/>
        <path d="M38 36c0 4.4 3.6 8 8 8V36H38z" fill="#34A853"/>
        <path d="M46 44c4.4 0 8-3.6 8-8H46v8z" fill="#FBBC04"/>
        <path d="M54 36c0-4.4-3.6-8-8-8v8h8z" fill="#EA4335"/>
        <defs>
          <linearGradient id="gm_grad" x1="46" y1="8" x2="46" y2="84">
            <stop offset="0" stopColor="#EA4335" stopOpacity="0"/>
            <stop offset="1" stopColor="#7B1FA2" stopOpacity="0.4"/>
          </linearGradient>
        </defs>
      </svg>
    </button>
  );
}