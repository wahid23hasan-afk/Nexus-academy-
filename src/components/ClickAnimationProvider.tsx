import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { triggerHaptic } from '../utils/haptics';

interface TouchRippleItem {
  id: number;
  x: number;
  y: number;
}

export function ClickAnimationProvider({ children }: { children?: React.ReactNode }) {
  const [ripples, setRipples] = useState<TouchRippleItem[]>([]);

  const handlePointerDown = useCallback((e: PointerEvent) => {
    // Only respond to primary left mouse clicks or direct touches
    if (e.button !== undefined && e.button !== 0) return;
    
    // Ignore invalid touch coordinates
    if (typeof e.clientX !== 'number' || typeof e.clientY !== 'number') return;
    if (e.clientX === 0 && e.clientY === 0) return;

    const id = Date.now() + Math.random();
    const newRipple: TouchRippleItem = {
      id,
      x: e.clientX,
      y: e.clientY,
    };

    setRipples((prev) => [...prev.slice(-8), newRipple]);
    triggerHaptic('light');

    // Auto-remove after animation completes
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 320);
  }, []);

  useEffect(() => {
    window.addEventListener('pointerdown', handlePointerDown, { passive: true, capture: true });

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, { capture: true });
    };
  }, [handlePointerDown]);

  const portalContent = typeof document !== 'undefined' ? (
    <div
      id="nexus-touch-feedback-container"
      className="fixed inset-0 pointer-events-none z-[9999999] overflow-hidden select-none"
      aria-hidden="true"
    >
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="nexus-touch-ripple"
          style={{
            left: `${ripple.x}px`,
            top: `${ripple.y}px`,
          }}
        />
      ))}
    </div>
  ) : null;

  return (
    <>
      {children}
      {typeof document !== 'undefined' && portalContent && createPortal(portalContent, document.body)}
    </>
  );
}

