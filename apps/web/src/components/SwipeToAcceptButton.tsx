'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronsRight, CheckCircle2 } from 'lucide-react';

interface SwipeToAcceptButtonProps {
  onAccept: () => void | Promise<void>;
  label?: string;
  successLabel?: string;
}

export function SwipeToAcceptButton({
  onAccept,
  label = 'SWIPE TO ACCEPT',
  successLabel = 'DISPATCH ACCEPTED ✓',
}: SwipeToAcceptButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const maxDrag = useRef(0);
  const startX = useRef(0);

  const calculateMaxDrag = () => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      maxDrag.current = Math.max(containerWidth - 50, 100);
    }
  };

  useEffect(() => {
    calculateMaxDrag();
    window.addEventListener('resize', calculateMaxDrag);
    return () => window.removeEventListener('resize', calculateMaxDrag);
  }, []);

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (isAccepted || loading) return;
    calculateMaxDrag();
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    startX.current = clientX - dragX;
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging || isAccepted || loading) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    let currentX = clientX - startX.current;

    if (currentX < 0) currentX = 0;
    if (currentX > maxDrag.current) currentX = maxDrag.current;

    setDragX(currentX);

    // Trigger threshold at 80%
    if (currentX >= maxDrag.current * 0.82) {
      triggerAccept();
    }
  };

  const handleTouchEnd = () => {
    if (isAccepted || loading) return;
    setIsDragging(false);
    if (dragX < maxDrag.current * 0.82) {
      setDragX(0);
    }
  };

  const triggerAccept = async () => {
    setIsDragging(false);
    setDragX(maxDrag.current);
    setIsAccepted(true);
    setLoading(true);

    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(60);
      } catch (err) {}
    }

    try {
      await onAccept();
    } catch (err) {
      setIsAccepted(false);
      setDragX(0);
    } finally {
      setLoading(false);
    }
  };

  const fillPercentage = maxDrag.current > 0 ? (dragX / maxDrag.current) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-12 rounded-full overflow-hidden select-none touch-pan-x transition-all duration-200 shadow-md border-2 ${
        isAccepted
          ? 'bg-emerald-600 border-emerald-500'
          : 'bg-emerald-700 border-emerald-500/80 shadow-inner'
      }`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseMove={handleTouchMove}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
    >
      {/* Dynamic Drag Fill Bar */}
      <div
        className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-emerald-500 to-emerald-400"
        style={{
          width: `${dragX + 24}px`,
          transition: isDragging ? 'none' : 'width 0.25s ease-out',
        }}
      />

      {/* Background Animated Text */}
      {!isAccepted && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-150 pl-6"
          style={{ opacity: Math.max(1 - fillPercentage / 50, 0) }}
        >
          <span className="text-white font-black text-xs uppercase tracking-wider flex items-center gap-1">
            {label}
            <ChevronsRight className="w-4 h-4 text-emerald-200 animate-pulse" />
          </span>
        </div>
      )}

      {/* Success Text when Accepted */}
      {isAccepted && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-white" />
            {successLabel}
          </span>
        </div>
      )}

      {/* Swipe Thumb Knob */}
      {!isAccepted && (
        <div
          className="absolute top-1 left-1 w-9 h-9 bg-white rounded-full shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing text-emerald-700 z-10 border border-emerald-100"
          style={{
            transform: `translateX(${dragX}px)`,
            transition: isDragging ? 'none' : 'transform 0.25s ease-out',
          }}
        >
          <ChevronsRight className="w-5 h-5 text-emerald-700" />
        </div>
      )}
    </div>
  );
}
