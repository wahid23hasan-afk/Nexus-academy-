import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, Sparkles, Move, RotateCcw } from 'lucide-react';

interface AiAssistantFABProps {
  onClick: () => void;
  isOpen: boolean;
}

const STORAGE_KEY = 'nexus_ai_fab_coords_v1';
const HOLD_DURATION_MS = 2000; // 2 seconds hold to unlock drag
const FAB_SIZE = 56; // 14 * 4 = 56px

export function AiAssistantFAB({ onClick, isOpen }: AiAssistantFABProps) {
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);
  const [holdProgress, setHoldProgress] = useState<number>(0);
  const [isHolding, setIsHolding] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [showMoveSuccess, setShowMoveSuccess] = useState<boolean>(false);

  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const startPointerPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const wasDraggedRef = useRef<boolean>(false);

  // Load saved position on mount with strict safe area bounds
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          // Safe boundaries: top header (~80px) and bottom nav bar (~100px)
          const topMin = 80;
          const bottomMin = 100;
          const clampedX = Math.max(12, Math.min(window.innerWidth - FAB_SIZE - 12, parsed.x));
          const clampedY = Math.max(topMin, Math.min(window.innerHeight - FAB_SIZE - bottomMin, parsed.y));
          setCoords({ x: clampedX, y: clampedY });
        }
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Window resize protection to keep inside safe screen area
  useEffect(() => {
    const handleResize = () => {
      setCoords((prev) => {
        if (!prev) return null;
        const topMin = 80;
        const bottomMin = 100;
        const clampedX = Math.max(12, Math.min(window.innerWidth - FAB_SIZE - 12, prev.x));
        const clampedY = Math.max(topMin, Math.min(window.innerHeight - FAB_SIZE - bottomMin, prev.y));
        return { x: clampedX, y: clampedY };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle pointer down (Mouse/Touch)
  const handlePointerDown = (e: React.PointerEvent) => {
    // Only primary button or touch
    if (e.button !== undefined && e.button !== 0) return;

    const pointerX = e.clientX;
    const pointerY = e.clientY;
    startPointerPosRef.current = { x: pointerX, y: pointerY };
    startTimeRef.current = Date.now();
    wasDraggedRef.current = false;
    setIsHolding(true);
    setHoldProgress(0);

    // Animation frame timer to update progress smoothly over 2s
    const updateProgress = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(100, (elapsed / HOLD_DURATION_MS) * 100);
      setHoldProgress(progress);

      if (elapsed >= HOLD_DURATION_MS) {
        // 2s Hold reached! Unlock dragging mode
        setIsDragging(true);
        setIsHolding(false);
        wasDraggedRef.current = true;

        if (navigator.vibrate) {
          try { navigator.vibrate(80); } catch { /* ignore */ }
        }

        // Set initial coords if null (transitioning from CSS fixed)
        setCoords((prev) => {
          if (!prev) {
            return {
              x: Math.max(12, Math.min(window.innerWidth - FAB_SIZE - 12, pointerX - FAB_SIZE / 2)),
              y: Math.max(12, Math.min(window.innerHeight - FAB_SIZE - 12, pointerY - FAB_SIZE / 2))
            };
          }
          return prev;
        });
      } else {
        animFrameRef.current = requestAnimationFrame(updateProgress);
      }
    };

    animFrameRef.current = requestAnimationFrame(updateProgress);
  };

  // Global pointer move handler when holding or dragging
  useEffect(() => {
    const handleGlobalPointerMove = (e: PointerEvent) => {
      // If still holding before 2s, check if pointer moved significantly
      if (isHolding && !isDragging) {
        const dx = Math.abs(e.clientX - startPointerPosRef.current.x);
        const dy = Math.abs(e.clientY - startPointerPosRef.current.y);
        if (dx > 10 || dy > 10) {
          // Cancel hold if moved before 2s
          if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
          setIsHolding(false);
          setHoldProgress(0);
        }
      }

      // If dragging mode is ACTIVE (unlocked after 2s hold)
      if (isDragging) {
        e.preventDefault();
        const topMin = 80;
        const bottomMin = 100;
        const newX = Math.max(12, Math.min(window.innerWidth - FAB_SIZE - 12, e.clientX - FAB_SIZE / 2));
        const newY = Math.max(topMin, Math.min(window.innerHeight - FAB_SIZE - bottomMin, e.clientY - FAB_SIZE / 2));
        setCoords({ x: newX, y: newY });
      }
    };

    const handleGlobalPointerUp = () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }

      if (isDragging) {
        // Save position to localStorage
        setCoords((currentCoords) => {
          if (currentCoords) {
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(currentCoords));
            } catch {
              // Ignore
            }
          }
          return currentCoords;
        });

        setShowMoveSuccess(true);
        setTimeout(() => setShowMoveSuccess(false), 2000);
      }

      setIsHolding(false);
      setIsDragging(false);
      setHoldProgress(0);
    };

    if (isHolding || isDragging) {
      window.addEventListener('pointermove', handleGlobalPointerMove);
      window.addEventListener('pointerup', handleGlobalPointerUp);
      window.addEventListener('pointercancel', handleGlobalPointerUp);
    }

    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
    };
  }, [isHolding, isDragging]);

  // Handle click trigger
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Only open AI chat if user did NOT drag or enter move mode
    if (!wasDraggedRef.current && !isDragging && holdProgress < 100) {
      onClick();
    }
  };

  // Reset to default bottom-right position
  const resetPosition = (e: React.MouseEvent) => {
    e.stopPropagation();
    localStorage.removeItem(STORAGE_KEY);
    setCoords(null);
    setShowMoveSuccess(false);
  };

  // SVG progress ring calculation
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (holdProgress / 100) * circumference;

  return (
    <AnimatePresence>
      {!isOpen && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          whileHover={{ scale: isDragging ? 1.1 : 1.05 }}
          style={
            coords
              ? {
                  position: 'fixed',
                  left: `${coords.x}px`,
                  top: `${coords.y}px`,
                  bottom: 'auto',
                  right: 'auto',
                  zIndex: 9999,
                  touchAction: 'none'
                }
              : {
                  position: 'fixed',
                  bottom: '90px',
                  right: '16px',
                  zIndex: 9999,
                  touchAction: 'none'
                }
          }
          className={`group select-none ${isDragging ? 'cursor-grabbing scale-110' : 'cursor-pointer'}`}
          onPointerDown={handlePointerDown}
          onClick={handleClick}
        >
          <div className="relative flex items-center justify-center">
            {/* Outer Glow */}
            <div
              className={`absolute inset-0 rounded-full blur-xl transition-all duration-300 ${
                isDragging
                  ? 'bg-[#39FF14] opacity-80 scale-125'
                  : isHolding
                  ? 'bg-[#39FF14] opacity-60 scale-110'
                  : 'bg-[#39FF14] opacity-30 group-hover:opacity-50'
              }`}
            ></div>

            {/* Hold 2s Progress Ring Overlay */}
            {(isHolding || holdProgress > 0) && (
              <svg className="absolute -inset-2 w-[72px] h-[72px] -rotate-90 pointer-events-none z-20">
                <circle
                  cx="36"
                  cy="36"
                  r={radius}
                  className="stroke-slate-700/50 fill-none"
                  strokeWidth="3.5"
                />
                <circle
                  cx="36"
                  cy="36"
                  r={radius}
                  className="stroke-[#39FF14] fill-none transition-all duration-75 ease-linear"
                  strokeWidth="3.5"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                />
              </svg>
            )}

            {/* Button Container */}
            <div
              className={`relative w-14 h-14 bg-slate-900 border transition-all duration-200 rounded-full flex items-center justify-center shadow-2xl overflow-hidden ${
                isDragging
                  ? 'border-[#39FF14] ring-4 ring-[#39FF14]/30 bg-slate-950 scale-105'
                  : isHolding
                  ? 'border-[#39FF14] ring-2 ring-[#39FF14]/20'
                  : 'border-[#39FF14]/50 hover:border-[#39FF14]'
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-[#39FF14]/20 to-transparent opacity-50"></div>

              {isDragging ? (
                <Move size={24} className="text-[#39FF14] relative z-10 animate-pulse" />
              ) : (
                <Bot size={24} className="text-[#39FF14] relative z-10" />
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
                  className="absolute top-2 right-2 text-white z-10"
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

            {/* Hold Progress Banner */}
            <AnimatePresence>
              {isHolding && !isDragging && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: -38 }}
                  exit={{ opacity: 0 }}
                  className="absolute whitespace-nowrap bg-slate-900 border border-[#39FF14]/40 text-white px-2.5 py-1 rounded-lg text-[10px] font-mono shadow-xl flex items-center space-x-1.5 pointer-events-none z-30"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#39FF14] animate-ping" />
                  <span>Hold 2s to drag... {Math.round(holdProgress)}%</span>
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
                  className="absolute whitespace-nowrap bg-slate-900 border border-[#39FF14] text-[#39FF14] px-3 py-1 rounded-full text-[10px] font-bold shadow-2xl flex items-center space-x-1.5 z-30"
                >
                  <span>Position Saved!</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Floating Tooltip */}
          {!isDragging && !isHolding && (
            <div className="absolute top-1/2 -translate-y-1/2 right-full mr-3 bg-slate-900/95 border border-white/10 px-3 py-2 rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-auto shadow-2xl flex flex-col items-end z-30 backdrop-blur-md">
              <span className="text-xs font-bold text-white flex items-center space-x-1">
                <span>Nexus AI</span>
                <span className="text-[8px] bg-[#39FF14]/20 text-[#39FF14] px-1 rounded font-mono">
                  PRO
                </span>
              </span>
              <span className="text-[10px] text-slate-400">Your Study Assistant</span>
              <div className="mt-1 pt-1 border-t border-white/10 flex items-center space-x-2 text-[9px] text-emerald-400 font-mono">
                <span>💡 Hold 2s to move anywhere</span>
                {coords && (
                  <button
                    onClick={resetPosition}
                    className="p-0.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                    title="Reset to bottom right"
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
