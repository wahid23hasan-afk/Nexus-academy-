import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Gift, Sparkles, Flame, Zap, CheckCircle2 } from 'lucide-react';
import { gamificationService } from '../services/gamificationService';
import { soundFxService } from '../services/soundFxService';
import { NeonConfetti } from './NeonConfetti';

interface DailyMysteryChestModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onRewardClaimed: (totalXP: number) => void;
  onShowNotification: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export function DailyMysteryChestModal({
  isOpen,
  onClose,
  userId,
  onRewardClaimed,
  onShowNotification
}: DailyMysteryChestModalProps) {
  const [canClaim, setCanClaim] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [opened, setOpened] = useState(false);
  const [rewardData, setRewardData] = useState<{ xpReward: number; streakBonus: number; totalReward: number } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      gamificationService.getDailyChestStatus(userId).then(st => {
        setCanClaim(st.canClaim);
      });
      setOpened(false);
      setRewardData(null);
      setShowConfetti(false);
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const handleOpenChest = async () => {
    if (!canClaim || claiming || opened) return;
    setClaiming(true);

    try {
      const res = await gamificationService.claimDailyChest(userId);
      if (res.success) {
        soundFxService.playChestOpen();
        setRewardData(res);
        setOpened(true);
        setShowConfetti(true);
        onRewardClaimed(res.totalReward);
        setCanClaim(false);
        onShowNotification(`🎉 Daily Mystery Chest Opened! +${res.totalReward} XP added to your balance!`, 'success');
      }
    } catch (e: any) {
      onShowNotification('Failed to claim daily reward', 'error');
    } finally {
      setClaiming(false);
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
        {showConfetti && <NeonConfetti active={showConfetti} particleCount={50} />}

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
          className="relative w-full max-w-sm rounded-2xl sm:rounded-3xl bg-[#0a0f1d] border border-amber-500/30 p-5 sm:p-6 shadow-[0_0_50px_rgba(245,158,11,0.2)] overflow-hidden z-10 text-center max-h-[88dvh] flex flex-col my-auto"
        >
          {/* Ambient Amber Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer border border-white/5"
          >
            <X size={16} />
          </button>

          {/* Title badge */}
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-mono font-bold uppercase tracking-wider mb-4">
            <Sparkles size={11} />
            <span>Daily Login Surprise</span>
          </div>

          <h3 className="text-xl font-black text-white mb-2">Daily Mystery Chest</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto mb-6">
            Log in daily to claim free XP, streak multipliers, and level up faster!
          </p>

          {/* 3D Animated Chest Visual */}
          <div className="relative my-6 flex justify-center items-center">
            <motion.div
              animate={
                opened
                  ? { scale: [1, 1.25, 1.1], rotate: [0, -5, 5, 0] }
                  : { y: [0, -8, 0], scale: [1, 1.02, 1] }
              }
              transition={{ repeat: opened ? 0 : Infinity, duration: 2.5, ease: 'easeInOut' }}
              onClick={handleOpenChest}
              className={`w-28 h-28 rounded-3xl flex items-center justify-center relative cursor-pointer border-2 transition-all shadow-2xl ${
                opened
                  ? 'bg-gradient-to-tr from-amber-600/30 via-yellow-500/20 to-[#39FF14]/30 border-[#39FF14] shadow-[0_0_40px_rgba(57,255,20,0.4)]'
                  : canClaim
                  ? 'bg-gradient-to-tr from-amber-600/20 via-orange-500/20 to-yellow-500/20 border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.3)] hover:scale-105'
                  : 'bg-slate-900/60 border-slate-700 opacity-60 cursor-not-allowed'
              }`}
            >
              <span className="text-5xl select-none">{opened ? '🎉' : '🎁'}</span>

              {canClaim && !opened && (
                <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-[#39FF14] text-black font-mono font-black text-[9px] rounded-full uppercase animate-bounce">
                  Ready!
                </span>
              )}
            </motion.div>
          </div>

          {/* Reward Reveal */}
          {opened && rewardData && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-white/5 border border-[#39FF14]/30 rounded-2xl mb-4 space-y-2"
            >
              <p className="text-xs text-slate-300 font-medium">You Received:</p>
              <div className="flex items-center justify-center space-x-2">
                <Zap size={20} className="text-[#39FF14] fill-[#39FF14]" />
                <span className="text-3xl font-black text-[#39FF14] font-mono">+{rewardData.totalReward} XP</span>
              </div>
              <p className="text-[10px] font-mono text-slate-400">
                Base: +{rewardData.xpReward} XP • Streak Bonus: +{rewardData.streakBonus} XP
              </p>
            </motion.div>
          )}

          {/* Action Button */}
          {!opened ? (
            <button
              onClick={handleOpenChest}
              disabled={!canClaim || claiming}
              className={`w-full py-3.5 rounded-xl font-extrabold font-mono text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg flex items-center justify-center space-x-2 ${
                canClaim
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black shadow-amber-500/20'
                  : 'bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed'
              }`}
            >
              {claiming ? (
                <span>Opening Mystery Box...</span>
              ) : canClaim ? (
                <>
                  <Gift size={15} />
                  <span>Tap to Claim Reward</span>
                </>
              ) : (
                <span>Claimed for Today (Come back tomorrow)</span>
              )}
            </button>
          ) : (
            <button
              onClick={onClose}
              className="w-full py-3 bg-white/10 hover:bg-white/15 text-white font-mono text-xs font-bold rounded-xl border border-white/10 transition-colors cursor-pointer"
            >
              Awesome! Continue Learning
            </button>
          )}
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
