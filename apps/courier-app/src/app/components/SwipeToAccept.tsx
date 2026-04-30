import { useState, useRef, useEffect } from 'react';
import { ChevronsRight } from 'lucide-react';

interface SwipeToAcceptProps {
  onAccept: () => void;
  label: string;
}

export function SwipeToAccept({ onAccept, label }: SwipeToAcceptProps) {
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const SWIPE_THRESHOLD = 0.75; // 75% of container width

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      e.preventDefault();
      
      const containerWidth = containerRef.current.offsetWidth;
      const maxDrag = containerWidth - 56;
      const deltaX = e.clientX - startXRef.current;
      const newOffset = Math.max(0, Math.min(maxDrag, currentXRef.current + deltaX));
      
      setDragOffset(newOffset);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || !containerRef.current) return;
      e.preventDefault();
      
      const containerWidth = containerRef.current.offsetWidth;
      const maxDrag = containerWidth - 56;
      const touch = e.touches[0];
      const deltaX = touch.clientX - startXRef.current;
      const newOffset = Math.max(0, Math.min(maxDrag, currentXRef.current + deltaX));
      
      setDragOffset(newOffset);
    };

    const handleEnd = () => {
      if (!isDragging || !containerRef.current) return;
      
      setIsDragging(false);
      const containerWidth = containerRef.current.offsetWidth;
      const swipePercentage = dragOffset / containerWidth;
      
      if (swipePercentage >= SWIPE_THRESHOLD) {
        onAccept();
      } else {
        setDragOffset(0);
      }
      
      currentXRef.current = 0;
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchend', handleEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, dragOffset, onAccept]);

  const handleStart = (clientX: number) => {
    setIsDragging(true);
    startXRef.current = clientX;
    currentXRef.current = dragOffset;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleStart(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    handleStart(e.touches[0].clientX);
  };

  // Calculate progress for text fade
  const progress = containerRef.current
    ? dragOffset / (containerRef.current.offsetWidth - 56)
    : 0;

  return (
    <div 
      ref={containerRef}
      className="relative w-full rounded-[32px] bg-[#00D27A] overflow-hidden select-none"
      style={{ height: '60px', touchAction: 'none' }}
    >
      {/* Swipe trail / progress fill */}
      <div 
        className="absolute top-0 left-0 bottom-0 bg-[#00BA6C] rounded-[32px]"
        style={{
          width: `${dragOffset + 56}px`,
          transition: isDragging ? 'none' : 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />

      {/* Background Text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span 
          className="text-white text-[17px] tracking-tight"
          style={{ 
            fontWeight: 800,
            opacity: 1 - progress * 1.5,
            transition: isDragging ? 'none' : 'opacity 0.3s ease',
          }}
        >
          {label}
        </span>
      </div>

      {/* Swipeable Button */}
      <div
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className="absolute left-[4px] top-[4px] bottom-[4px] w-[52px] flex items-center justify-center cursor-grab active:cursor-grabbing z-10"
        style={{
          transform: `translateX(${dragOffset}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          touchAction: 'none',
        }}
      >
        <div
          className="w-[52px] h-[52px] rounded-full bg-white shadow-lg flex items-center justify-center"
          style={{
            transform: isDragging ? 'scale(1.05)' : 'scale(1)',
            transition: 'transform 0.2s ease',
          }}
        >
          <ChevronsRight className="w-6 h-6 text-[#00D27A]" strokeWidth={2.5} />
        </div>
      </div>
    </div>
  );
}