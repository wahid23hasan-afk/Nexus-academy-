import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, Sparkles, Move, RotateCcw } from 'lucide-react';

interface AiAssistantFABProps {
  onClick: () => void;
  isOpen: boolean;
  isVisible?: boolean;
}

const STORAGE_KEY = 'nexus_ai_fab_coords_v1';
const FAB_SIZE = 56; // 14 * 4 = 56px

// Helper to clamp FAB inside full viewport bounds with 8px margin
const clampCoords = (x: number, y: number) => {
  const minX = 8;
  const maxX = Math.max(8, (typeof window !== 'undefined' ? window.innerWidth : 360) - FAB_SIZE - 8);
  const minY = 8;
  const maxY = Math.max(8, (typeof window !== 'undefined' ? window.innerHeight : 640) - FAB_SIZE - 8);
  return {
    x: Math.max(minX, Math.min(maxX, x)),
    y: Math.max(minY, Math.min(maxY, y))
  };
};

export function AiAssistantFAB({ onClick, isOpen, isVisible = true }: AiAssistantFABProps) {
  // Always initialize coords to concrete pixel coordinates right away
  const [coords, setCoords] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return clampCoords(parsed.x, parsed.y);
        }
      }
    } catch {
      // Ignore
    }
    const defaultX = typeof window !== 'undefined' ? window.innerWidth - FAB_SIZE - 16 : 300;
    const defaultY = typeof window !== 'undefined' ? window.innerHeight - FAB_SIZE - 90 : 500;
    return clampCoords(defaultX, defaultY);
  });

  const [isHolding, setIsHolding] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [showMoveSuccess, setShowMoveSuccess] = useState<boolean>(false);

  const coordsRef = useRef<{ x: number; y: number }>(coords);
  const startPointerPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: FAB_SIZE / 2, y: FAB_SIZE / 2 });
  const isPointerDownRef = useRef<boolean>(false);
  const wasDraggedRef = useRef<boolean>(false);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);

  const updateCoords = (newCoords: { x: number; y: number }) => {
    const clamped = clampCoords(newCoords.x, newCoords.y);
    coordsRef.current = clamped;
    setCoords(clamped);
  };

  // Window resize protection to keep inside safe screen area
  useEffect(() => {
    const handleResize = () => {
      updateCoords(coordsRef.current);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle pointer down (Mouse/Touch) with Pointer Capture
  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== undefined && e.button !== 0) return; // Only primary button
    
    // Prevent default touch gestures (scrolling, text selection)
    e.preventDefault();
    e.stopPropagation();

    // Lock pointer capture on the target so pointermove/pointerup events are NEVER lost
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Fallback if browser doesn't support
    }

    isPointerDownRef.current = true;
    wasDraggedRef.current = false;
    startPointerPosRef.current = { x: e.clientX, y: e.clientY };
    dragOffsetRef.current = {
      x: e.clientX - coordsRef.current.x,
      y: e.clientY - coordsRef.current.y
    };

    setIsHolding(true);

    // After 150ms hold, automatically activate dragging indicator even if not moved
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    holdTimerRef.current = setTimeout(() => {
      if (isPointerDownRef.current) {
        setIsDragging(true);
        wasDraggedRef.current = true;
      }
    }, 150);
  };

  // Handle pointer move during drag
  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isPointerDownRef.current) return;
    
    e.preventDefault();
    e.stopPropagation();

    const dx = Math.abs(e.clientX - startPointerPosRef.current.x);
    const dy = Math.abs(e.clientY - startPointerPosRef.current.y);

    // If moved more than 3px, immediately switch to dragging state
    if (dx > 3 || dy > 3) {
      if (!isDragging) {
        setIsDragging(true);
      }
      wasDraggedRef.current = true;
    }

    if (wasDraggedRef.current || isDragging) {
      updateCoords({
        x: e.clientX - dragOffsetRef.current.x,
        y: e.clientY - dragOffsetRef.current.y
      });
    }
  };

  // Handle pointer release or capture loss
  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isPointerDownRef.current) return;

    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore
    }

    isPointerDownRef.current = false;

    if (wasDraggedRef.current) {
      // Save newly dragged location permanently in localStorage
      const finalCoords = coordsRef.current;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(finalCoords));
      } catch {
        // Ignore
      }

      setShowMoveSuccess(true);
      setTimeout(() => setShowMoveSuccess(false), 2000);
    } else {
      // Clean tap without drag opens the AI assistant!
      onClick();
    }

    setIsHolding(false);
    setIsDragging(false);
  };

  // Reset to default bottom-right position
  const resetPosition = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    localStorage.removeItem(STORAGE_KEY);
    const defaultCoords = clampCoords(
      window.innerWidth - FAB_SIZE - 16,
      window.innerHeight - FAB_SIZE - 90
    );
    updateCoords(defaultCoords);
    setShowMoveSuccess(false);
  };

  return (
    <AnimatePresence>
      {!isOpen && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'fixed',
            left: `${coords.x}px`,
            top: `${coords.y}px`,
            zIndex: 9999,
            touchAction: 'none',
          }}
          className="w-14 h-14 select-none group touch-none pointer-events-auto"
        >
          {/* Main Interactive Button with Full Pointer Capture & touch-action: none */}
          <button
            id="ai-assistant-fab-btn"
            type="button"
            aria-label="Open AI Study Assistant"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{ touchAction: 'none' }}
            className={`
              relative w-14 h-14 rounded-full select-none focus:outline-none touch-none
              flex items-center justify-center transition-all duration-150 pointer-events-auto
              ${isDragging ? 'cursor-grabbing scale-110' : 'cursor-pointer'}
            `}
          >
            {/* Outer Glow - Strictly pointer-events-none */}
            <div
              className={`absolute inset-0 rounded-full blur-xl transition-all duration-300 pointer-events-none ${
                isDragging
                  ? 'bg-[#39FF14] opacity-80 scale-125'
                  : isHolding
                  ? 'bg-[#39FF14] opacity-60 scale-110'
                  : 'bg-[#39FF14] opacity-25 group-hover:opacity-45'
              }`}
            />

            {/* Button Inner Body */}
            <div
              className={`relative w-14 h-14 bg-slate-900 border transition-all duration-150 rounded-full flex items-center justify-center shadow-2xl overflow-hidden pointer-events-none ${
                isDragging
                  ? 'border-[#39FF14] ring-4 ring-[#39FF14]/40 bg-slate-950 scale-105'
                  : isHolding
                  ? 'border-[#39FF14] ring-2 ring-[#39FF14]/20'
                  : 'border-[#39FF14]/50 group-hover:border-[#39FF14]'
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-[#39FF14]/20 to-transparent opacity-50 pointer-events-none" />

              {isDragging ? (
                <Move size={24} className="text-[#39FF14] relative z-10 animate-pulse pointer-events-none" />
              ) : (
                <Bot size={24} className="text-[#39FF14] relative z-10 pointer-events-none" />
              )}

              {/* Sparkles */}
              {!isDragging && (
                <motion.div
                  animate={{
                    rotate: [0, 15, -15, 0],
                    scale: [1, 1.2, 1]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatType: 'reverse'
                  }}
                  className="absolute top-2 right-2 text-white z-10 pointer-events-none"
                >
                  <Sparkles size={10} />
                </motion.div>
              )}
            </div>

            {/* Custom Dragging Badge */}
            <AnimatePresence>
              {isDragging && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.8 }}
                  animate={{ opacity: 1, y: -40, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute whitespace-nowrap bg-emerald-500 text-slate-950 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow-lg flex items-center space-x-1 pointer-events-none z-30"
                >
                  <Move size={12} className="animate-spin" />
                  <span>Release to Drop</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Success notification banner after drop */}
            <AnimatePresence>
              {showMoveSuccess && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: -35 }}
                  animate={{ opacity: 1, scale: 1, y: -42 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute whitespace-nowrap bg-slate-900 border border-[#39FF14] text-[#39FF14] px-3 py-1 rounded-full text-[10px] font-bold shadow-2xl flex items-center space-x-1.5 pointer-events-none z-30"
                >
                  <span>Position Saved!</span>
                </motion.div>
              )}
            </AnimatePresence>
          </button>

          {/* Floating Hover Tooltip */}
          {!isDragging && !isHolding && (
            <div className="absolute top-1/2 -translate-y-1/2 right-full mr-3 bg-slate-900/95 border border-white/10 px-3 py-2 rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none shadow-2xl flex flex-col items-end z-30 backdrop-blur-md">
              <span className="text-xs font-bold text-white flex items-center space-x-1">
                <span>Nexus AI</span>
                <span className="text-[8px] bg-[#39FF14]/20 text-[#39FF14] px-1 rounded font-mono">
                  PRO
                </span>
              </span>
              <span className="text-[10px] text-slate-400">Your Study Assistant</span>
              <div className="mt-1 pt-1 border-t border-white/10 flex items-center space-x-2 text-[9px] text-emerald-400 font-mono">
                <span>💡 Hold & Drag to move</span>
                {coords && (
                  <button
                    type="button"
                    onClick={resetPosition}
                    className="p-0.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors pointer-events-auto cursor-pointer"
                    title="Reset to default position"
                  >
                    <RotateCcw size={10} />
                  </button>
                )}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

