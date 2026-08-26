import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Lock, Zap, CheckCircle2, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';
import { CourseLesson } from '../types/course';
import { gamificationService } from '../services/gamificationService';
import { soundFxService } from '../services/soundFxService';

interface UnlockLessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  lesson: CourseLesson | null;
  courseId: string;
  courseTitle: string;
  userId: string;
  currentUserXP: number;
  onSuccess: (remainingXP: number) => void;
  onShowNotification: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  onTriggerFullEnroll?: () => void;
}

export function UnlockLessonModal({
  isOpen,
  onClose,
  lesson,
  courseId,
  courseTitle,
  userId,
  currentUserXP,
  onSuccess,
  onShowNotification,
  onTriggerFullEnroll
}: UnlockLessonModalProps) {
  const [loading, setLoading] = useState(false);
  const xpCost = 150; // 150 XP per individual lesson unlock

  if (!isOpen || !lesson) return null;

  const hasEnoughXP = currentUserXP >= xpCost;

  const handleUnlock = async () => {
    if (!hasEnoughXP) {
      onShowNotification(`You need ${xpCost} XP to unlock this lesson. Keep learning or complete daily quizzes!`, 'error');
      return;
    }

    setLoading(true);
    try {
      const result = await gamificationService.unlockLessonWithXP(
        userId,
        courseId,
        lesson.lessonId,
        lesson.title,
        xpCost
      );

      if (result.success) {
        soundFxService.playUnlock();
        onShowNotification(`⚡ Unlocked "${lesson.title}" using ${xpCost} XP!`, 'success');
        onSuccess(result.remainingXP ?? (currentUserXP - xpCost));
        onClose();
      } else {
        onShowNotification(result.message, 'error');
      }
    } catch (e: any) {
      onShowNotification(e?.message || 'Failed to unlock lesson', 'error');
    } finally {
      setLoading(false);
    }
  };

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
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md overflow-y-auto w-screen h-[100dvh] top-0 left-0">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 15 }}
          className="relative w-full max-w-md rounded-2xl sm:rounded-3xl bg-[#0a0f1d] border border-[#39FF14]/30 p-5 sm:p-6 shadow-[0_0_50px_rgba(57,255,20,0.15)] overflow-hidden z-10 max-h-[88dvh] flex flex-col my-auto"
        >
          {/* Ambient Top Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-[#39FF14]/15 rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer border border-white/5"
          >
            <X size={16} />
          </button>

          {/* Header */}
          <div className="flex flex-col items-center text-center mt-2 mb-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-[#39FF14]/20 to-emerald-500/20 border border-[#39FF14]/40 flex items-center justify-center mb-3 shadow-[0_0_25px_rgba(57,255,20,0.25)] relative">
              <Zap size={28} className="text-[#39FF14] animate-pulse" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-black/80 border border-[#39FF14]/40 flex items-center justify-center text-amber-400 font-bold text-xs">
                ⚡
              </div>
            </div>

            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#39FF14]/10 border border-[#39FF14]/30 text-[#39FF14] text-[10px] font-mono font-bold uppercase tracking-wider mb-2">
              <Sparkles size={11} />
              <span>XP Instant Lesson Pass</span>
            </div>

            <h3 className="text-lg font-black text-white">Unlock Single Lesson</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs truncate">
              {courseTitle}
            </p>
          </div>

          {/* Lesson Info Card */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 mb-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Target Lesson:</span>
              <span className="text-xs font-bold text-white max-w-[200px] truncate text-right">{lesson.title}</span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <span className="text-xs text-slate-400">Unlock Price:</span>
              <span className="text-xs font-mono font-extrabold text-amber-400 flex items-center space-x-1">
                <Zap size={13} className="fill-amber-400 text-amber-400" />
                <span>{xpCost} XP</span>
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <span className="text-xs text-slate-400">Your Current Balance:</span>
              <span className={`text-xs font-mono font-extrabold ${hasEnoughXP ? 'text-[#39FF14]' : 'text-red-400'}`}>
                {currentUserXP} XP
              </span>
            </div>
          </div>

          {/* XP Warning if not enough */}
          {!hasEnoughXP && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl mb-4 flex items-start space-x-2">
              <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-red-300">
                You need <strong>{xpCost - currentUserXP} more XP</strong> to unlock this lesson. Study completed lessons or pass quizzes to earn more XP!
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-2.5">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleUnlock}
              disabled={loading || !hasEnoughXP}
              className="w-full py-3 bg-[#39FF14] hover:bg-[#39FF14]/90 disabled:opacity-40 disabled:cursor-not-allowed text-black font-extrabold font-mono text-xs rounded-xl flex items-center justify-center space-x-2 shadow-[0_0_20px_rgba(57,255,20,0.3)] transition-all cursor-pointer"
            >
              {loading ? (
                <span>Unlocking HD Video...</span>
              ) : (
                <>
                  <Zap size={14} className="fill-black" />
                  <span>CONFIRM UNLOCK ({xpCost} XP)</span>
                </>
              )}
            </motion.button>

            {onTriggerFullEnroll && (
              <button
                onClick={() => {
                  onClose();
                  onTriggerFullEnroll();
                }}
                className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-mono text-[11px] rounded-xl border border-white/10 transition-colors cursor-pointer"
              >
                Or Enroll in Full Course for All Lessons
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
