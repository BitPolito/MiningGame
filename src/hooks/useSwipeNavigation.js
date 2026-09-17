import { useRef } from 'react';

export function useSwipeNavigation(onPrevious, onNext, threshold = 54) {
  const startRef = useRef(null);

  return {
    onTouchStart(event) {
      const touch = event.touches[0];
      startRef.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
    },
    onTouchEnd(event) {
      const start = startRef.current;
      const touch = event.changedTouches[0];
      startRef.current = null;
      if (!start || !touch) return;
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      if (Math.abs(dx) < threshold || Math.abs(dx) <= Math.abs(dy)) return;
      if (dx < 0) onNext?.();
      else onPrevious?.();
    },
  };
}
