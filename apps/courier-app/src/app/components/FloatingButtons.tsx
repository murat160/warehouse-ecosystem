import { Menu, BarChart3, Navigation } from 'lucide-react';

interface FloatingButtonsProps {
  onMenuClick: () => void;
  onStatsClick: () => void;
  showLocation?: boolean;
}

export function FloatingButtons({ onMenuClick, onStatsClick, showLocation = true }: FloatingButtonsProps) {
  return (
    <>
      {/* Top Buttons */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-30 pointer-events-none">
        <button
          onClick={onMenuClick}
          className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors pointer-events-auto"
        >
          <Menu className="w-6 h-6 text-gray-900" />
        </button>

        <button
          onClick={onStatsClick}
          className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors pointer-events-auto"
        >
          <BarChart3 className="w-6 h-6 text-gray-900" />
        </button>
      </div>

      {/* Location Button (Bottom Left) */}
      {showLocation && (
        <div className="absolute bottom-[200px] left-4 z-30">
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('courier-recenter'))}
            className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <Navigation className="w-6 h-6 text-gray-900" />
          </button>
        </div>
      )}
    </>
  );
}