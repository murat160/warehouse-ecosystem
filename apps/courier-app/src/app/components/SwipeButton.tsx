import { useState, useRef, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';

interface SwipeButtonProps {
  onConfirm: () => void;
  text: string;
  isOnline: boolean;
}

export function SwipeButton({ onConfirm, text, isOnline }: SwipeButtonProps) {
  const [dragPosition, setDragPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonSize = 52; // 52px circle
  const threshold = 0.8; // 80% of container width

  const handleStart = (clientX: number) => {
    setIsDragging(true);
  };

  const handleMove = (clientX: number) => {
    if (!isDragging || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const maxDrag = containerWidth - buttonSize - 8; // 8px padding

    let newPosition = clientX - containerRect.left - buttonSize / 2;
    newPosition = Math.max(4, Math.min(newPosition, maxDrag));

    setDragPosition(newPosition);

    // Check if reached threshold
    if (newPosition >= maxDrag * threshold) {
      setIsDragging(false);
      onConfirm();
      setTimeout(() => setDragPosition(0), 300);
    }
  };

  const handleEnd = () => {
    setIsDragging(false);
    setDragPosition(0);
  };

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      handleMove(e.clientX);
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      handleEnd();
    }
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    handleStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (isDragging && e.touches[0]) {
      handleMove(e.touches[0].clientX);
    }
  };

  const handleTouchEnd = () => {
    if (isDragging) {
      handleEnd();
    }
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, dragPosition]);

  const progress = containerRef.current
    ? dragPosition / (containerRef.current.offsetWidth - buttonSize - 8)
    : 0;

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-[32px] overflow-hidden cursor-pointer select-none flex items-center ${
        isOnline
          ? 'bg-[#F2E3DF]'
          : 'bg-[#00D4FF]'
      }`}
      style={{
        height: '60px',
        padding: '0 18px 0 10px',
        gap: '14px',
        transition: isDragging ? 'none' : 'background-color 0.3s',
      }}
    >
      {/* Background progress indicator */}
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${
          isOnline ? 'bg-[#E8D4CF]' : 'bg-[#00C4EF]'
        }`}
        style={{
          opacity: progress * 0.5,
          transition: isDragging ? 'none' : 'opacity 0.3s',
        }}
      />

      {/* Draggable button */}
      <div
        className={`absolute rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing transition-all ${
          isOnline ? 'bg-[#B42318]' : 'bg-gray-900'
        }`}
        style={{
          width: '52px',
          height: '52px',
          top: '4px',
          left: `${dragPosition + 10}px`,
          transition: isDragging ? 'none' : 'left 0.3s ease-out',
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <ChevronRight className="w-[22px] h-[22px] text-white" strokeWidth={3} />
      </div>

      {/* Text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span
          className={`text-[17px] font-extrabold transition-opacity duration-200 tracking-tight ${
            isOnline ? 'text-[#B42318]' : 'text-gray-900'
          }`}
          style={{
            opacity: 1 - progress * 0.5,
          }}
        >
          {text}
        </span>
      </div>
    </div>
  );
}