import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trophy, Flame, Zap, Award, Sparkles, ChevronRight } from 'lucide-react';
import { MilestoneNotification } from '../types/milestone';
import { playMilestoneSound } from '../services/milestoneService';

interface MilestoneToastContainerProps {
  onNavigateToLeaderboard?: () => void;
  onNavigateToProfile?: () => void;
}

export function MilestoneToastContainer({ onNavigateToLeaderboard, onNavigateToProfile }: MilestoneToastContainerProps) {
  const [activeToast, setActiveToast] = useState<MilestoneNotification | null>(null);
  const queueRef = useRef<MilestoneNotification[]>([]);
  const isDisplayingRef = useRef<boolean>(false);
  const [soundEnabled] = useState<boolean>(true);

  // Process the single-toast queue sequentially
  const processNextInQueue = () => {
    if (queueRef.current.length > 0) {
      const nextToast = queueRef.current.shift()!;
      isDisplayingRef.current = true;
      setActiveToast(nextToast);
    } else {
      isDisplayingRef.current = false;
      setActiveToast(null);
    }
  };

  useEffect(() => {
    const handleMilestoneEvent = (e: CustomEvent<MilestoneNotification>) => {
      const newMilestone = e.detail;
      if (soundEnabled) {
        playMilestoneSound(newMilestone.type);
      }

      // Add to queue
      queueRef.current.push(newMilestone);

      // If nothing is currently displaying, show immediately
      if (!isDisplayingRef.current) {
        processNextInQueue();
      }
    };

    window.addEventListener('nexus_milestone_reached' as any, handleMilestoneEvent);
    return () => {
      window.removeEventListener('nexus_milestone_reached' as any, handleMilestoneEvent);
    };
  }, [soundEnabled]);

  const handleDismiss = () => {
    setActiveToast(null);
    // Give time for exit animation before showing the next queued toast
    setTimeout(() => {
      processNextInQueue();
    }, 280);
  };

  return (
    <div className="fixed bottom-5 right-3 sm:right-6 z-[99999] pointer-events-none max-w-[calc(100vw-1.5rem)] sm:max-w-md w-full flex flex-col items-end">
      <AnimatePresence mode="wait">
        {activeToast && (
          <SingleMilestoneToast
            key={activeToast.id}
            toast={activeToast}
            onClose={handleDismiss}
            onNavigateToLeaderboard={onNavigateToLeaderboard}
            onNavigateToProfile={onNavigateToProfile}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Single Compact Milestone Toast with 3.5s Smooth Timer
interface SingleMilestoneToastProps {
  toast: MilestoneNotification;
  onClose: () => void;
  onNavigateToLeaderboard?: () => void;
  onNavigateToProfile?: () => void;
}

function SingleMilestoneToast({
  toast,
  onClose,
  onNavigateToLeaderboard,
  onNavigateToProfile
}: SingleMilestoneToastProps) {
  const [progress, setProgress] = useState<number>(100);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 3.5 seconds total auto-dismiss duration
  const DURATION_MS = 3500;
  const INTERVAL_MS = 50;
  const STEP = (INTERVAL_MS / DURATION_MS) * 100;

  useEffect(() => {
    if (isPaused) {
      if (autoCloseTimerRef.current) clearInterval(autoCloseTimerRef.current);
      return;
    }

    autoCloseTimerRef.current = setInterval(() => {
      setProgress((prev) => Math.max(0, prev - STEP));
    }, INTERVAL_MS);

    return () => {
      if (autoCloseTimerRef.current) clearInterval(autoCloseTimerRef.current);
    };
  }, [isPaused, STEP]);

  useEffect(() => {
    if (progress <= 0) {
      if (autoCloseTimerRef.current) clearInterval(autoCloseTimerRef.current);
      onClose();
    }
  }, [progress, onClose]);

  // Theme color styling
  const themeStyles = {
    amber: {
      border: 'border-amber-500/50',
      bg: 'bg-[#0a0f1d]/95',
      glow: 'shadow-[0_8px_32px_rgba(245,158,11,0.2)]',
      badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      progress: 'bg-amber-500',
      text: 'text-amber-400'
    },
    green: {
      border: 'border-[#39FF14]/50',
      bg: 'bg-[#0a0f1d]/95',
      glow: 'shadow-[0_8px_32px_rgba(57,255,20,0.2)]',
      badgeBg: 'bg-[#39FF14]/20 text-[#39FF14] border-[#39FF14]/40',
      progress: 'bg-[#39FF14]',
      text: 'text-[#39FF14]'
    },
    purple: {
      border: 'border-purple-500/50',
      bg: 'bg-[#0a0f1d]/95',
      glow: 'shadow-[0_8px_32px_rgba(168,85,247,0.2)]',
      badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      progress: 'bg-purple-500',
      text: 'text-purple-400'
    },
    cyan: {
      border: 'border-cyan-500/50',
      bg: 'bg-[#0a0f1d]/95',
      glow: 'shadow-[0_8px_32px_rgba(6,182,212,0.2)]',
      badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      progress: 'bg-cyan-500',
      text: 'text-cyan-400'
    },
    rose: {
      border: 'border-rose-500/50',
      bg: 'bg-[#0a0f1d]/95',
      glow: 'shadow-[0_8px_32px_rgba(244,63,94,0.2)]',
      badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      progress: 'bg-rose-500',
      text: 'text-rose-400'
    }
  };

  const currentTheme = themeStyles[toast.colorTheme || 'amber'];

  const handleActionClick = () => {
    if (toast.actionLabel?.includes('Leaderboard') && onNavigateToLeaderboard) {
      onNavigateToLeaderboard();
    } else if (onNavigateToProfile) {
      onNavigateToProfile();
    }
    onClose();
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30, scale: 0.92, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: 20, scale: 0.94, filter: 'blur(6px)' }}
      transition={{
        type: 'spring',
        stiffness: 420,
        damping: 28,
        mass: 0.7
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`pointer-events-auto relative overflow-hidden rounded-2xl border ${currentTheme.border} ${currentTheme.bg} ${currentTheme.glow} p-3.5 sm:p-4 backdrop-blur-2xl text-white w-full shadow-2xl`}
    >
      <div className="flex items-start space-x-3">
        {/* Animated Icon Badge */}
        <motion.div
          animate={{ scale: [1, 1.18, 1], rotate: [0, 6, -6, 0] }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl border ${currentTheme.badgeBg} flex items-center justify-center text-xl shrink-0 shadow-inner`}
        >
          {toast.icon || '⚡'}
        </motion.div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center space-x-1.5 flex-wrap">
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400">
              MILESTONE UNLOCKED
            </span>
            <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-mono font-bold uppercase border ${currentTheme.badgeBg}`}>
              {toast.value}
            </span>
          </div>

          <h4 className="text-xs sm:text-sm font-bold text-white font-mono mt-0.5 tracking-tight line-clamp-1">
            {toast.title}
          </h4>

          <p className="text-[11px] text-slate-300 mt-0.5 leading-snug line-clamp-2">
            {toast.description}
          </p>

          {/* Action Button */}
          {toast.actionLabel && (
            <button
              onClick={handleActionClick}
              className={`mt-1.5 text-[10px] font-mono font-bold ${currentTheme.text} hover:underline inline-flex items-center space-x-1 cursor-pointer`}
            >
              <span>{toast.actionLabel}</span>
              <ChevronRight size={11} />
            </button>
          )}
        </div>

        {/* Clean Close (✕) Button */}
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          title="Dismiss notification"
        >
          <X size={15} />
        </button>
      </div>

      {/* Auto-Dismiss Progress Bar Timer */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10 overflow-hidden">
        <div
          className={`h-full ${currentTheme.progress} transition-all duration-75 ease-linear`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </motion.div>
  );
}
