import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { GlobalLeaderboard } from './GlobalLeaderboard';

interface WeeklyLeagueModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userXP: number;
  userName?: string;
  userProfile?: { fullName?: string; username?: string; photoURL?: string } | null;
}

export function WeeklyLeagueModal({
  isOpen,
  onClose,
  userId,
  userXP,
  userName,
  userProfile
}: WeeklyLeagueModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto w-screen h-[100dvh] top-0 left-0">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-2xl rounded-2xl sm:rounded-3xl bg-[#0a0f1d] border border-[#39FF14]/30 p-2 sm:p-4 shadow-[0_0_60px_rgba(57,255,20,0.15)] overflow-y-auto max-h-[92dvh] z-10 my-auto text-left"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer border border-white/10 z-30"
          >
            <X size={18} />
          </button>

          <GlobalLeaderboard
            userId={userId}
            userXP={userXP}
            userName={userName}
            userProfile={userProfile}
          />
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
