import React, { useEffect, useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { Trophy, Flame, Target, Zap, ChevronRight, Sparkles, Award, CheckCircle2, BarChart2, Star, X } from 'lucide-react';
import { gamificationService, UserXP, DailyStreak, RANKS } from '../services/gamificationService';
import { auth, db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { AnimatedXPCounter, formatSmartXPNumber } from './AnimatedXPCounter';
import { RankBadge } from './RankBadge';
import { RollingCounter } from './RollingDigitCounter';

interface GamificationSummaryProps {
  onOpenRewards: () => void;
}

// High-fidelity multi-burst confetti effect helper
const triggerHighFidelityConfetti = () => {
  try {
    // 1. Center cannon burst
    confetti({
      particleCount: 80,
      spread: 100,
      origin: { y: 0.6 },
      colors: ['#39FF14', '#00F0FF', '#FFD700', '#FF3366', '#A855F7'],
      disableForReducedMotion: true,
      zIndex: 9999
    });

    // 2. Left side cannon burst
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 70,
        origin: { x: 0.1, y: 0.7 },
        colors: ['#39FF14', '#00F0FF', '#FFD700'],
        disableForReducedMotion: true,
        zIndex: 9999
      });
    }, 150);

    // 3. Right side cannon burst
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 70,
        origin: { x: 0.9, y: 0.7 },
        colors: ['#00F0FF', '#FFD700', '#A855F7'],
        disableForReducedMotion: true,
        zIndex: 9999
      });
    }, 300);
  } catch (err) {
    console.warn("Confetti trigger warning:", err);
  }
};

// Particle Emitter Component for XP Progress Bar & Level Up
function LevelUpParticleEmitter({ active, intensity = 'normal' }: { active: boolean; intensity?: 'normal' | 'high' }) {
  const particleCount = intensity === 'high' ? 14 : 7;
  const particles = useMemo(() => {
    return Array.from({ length: particleCount }).map((_, i) => ({
      id: i,
      left: `${(i / particleCount) * 100 + (Math.random() * 8 - 4)}%`,
      size: Math.random() * 4 + 3,
      duration: Math.random() * 1.5 + 1.2,
      delay: Math.random() * 1.2,
      color: ['#39FF14', '#00F0FF', '#FFD700', '#A855F7'][i % 4]
    }));
  }, [particleCount]);

  if (!active) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible z-20">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: 0, opacity: 0, scale: 0 }}
          animate={{
            y: [-4, -28, -48],
            opacity: [0, 1, 0],
            scale: [0, 1.2, 0.4],
            x: [(Math.random() - 0.5) * 10, (Math.random() - 0.5) * 20]
          }}
          transition={{
            repeat: Infinity,
            duration: p.duration,
            delay: p.delay,
            ease: "easeOut"
          }}
          style={{
            left: p.left,
            bottom: '2px',
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            boxShadow: `0 0 8px ${p.color}, 0 0 12px ${p.color}`
          }}
          className="absolute rounded-full"
        />
      ))}
    </div>
  );
}

export function GamificationSummary({ onOpenRewards }: GamificationSummaryProps) {
  const [xp, setXp] = useState<UserXP | null>(null);
  const [streak, setStreak] = useState<DailyStreak | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);
  const [selectedStatDetail, setSelectedStatDetail] = useState<'streak' | 'xp' | 'points' | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [isHoveringXP, setIsHoveringXP] = useState(false);
  const [weeklyGoalMinutes, setWeeklyGoalMinutes] = useState(150); // Default 150 mins weekly goal, can be set by admin
  const previousLevelRef = useRef<number | null>(null);
  const lastMilestonePercentRef = useRef<number>(0);

  const loadGamiData = async () => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }
    try {
      const [xpData, streakData] = await Promise.all([
        gamificationService.getUserXP(auth.currentUser.uid),
        gamificationService.getDailyStreak(auth.currentUser.uid)
      ]);

      // Check admin settings for weekly study goal if available
      try {
        const settingsSnap = await getDoc(doc(db, 'appSettings', 'gamification'));
        if (settingsSnap.exists() && settingsSnap.data().weeklyGoalMinutes) {
          setWeeklyGoalMinutes(settingsSnap.data().weeklyGoalMinutes);
        }
      } catch {
        // Fallback to default
      }

      // Detect Level-Up or 100% XP Milestone
      if (previousLevelRef.current !== null && xpData.currentLevel > previousLevelRef.current) {
        setShowCelebration(true);
        setIsShaking(true);
        triggerHighFidelityConfetti();
        setTimeout(() => setIsShaking(false), 800);
      }
      previousLevelRef.current = xpData.currentLevel;

      setXp(xpData);
      setStreak(streakData);
    } catch (e) {
      console.warn("Failed to load gamification data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    loadGamiData();

    const handleUpdate = () => {
      if (mounted) loadGamiData();
    };

    window.addEventListener('nexus_xp_updated', handleUpdate);
    window.addEventListener('nexus_progress_updated', handleUpdate);
    return () => {
      mounted = false;
      window.removeEventListener('nexus_xp_updated', handleUpdate);
      window.removeEventListener('nexus_progress_updated', handleUpdate);
    };
  }, []);

  // Check and trigger milestone effects if progress hits 100%
  useEffect(() => {
    if (!xp) return;
    const xpForCurrentLevel = Math.pow(xp.currentLevel - 1, 2) * 100;
    const xpForNextLevel = Math.pow(xp.currentLevel, 2) * 100;
    const xpGainedInLevel = Math.max(0, xp.totalXP - xpForCurrentLevel);
    const xpSpanForLevel = Math.max(1, xpForNextLevel - xpForCurrentLevel);
    const pct = Math.min(100, Math.max(0, (xpGainedInLevel / xpSpanForLevel) * 100));

    if (pct >= 100 && lastMilestonePercentRef.current < 100) {
      setIsShaking(true);
      triggerHighFidelityConfetti();
      setShowCelebration(true);
      setTimeout(() => setIsShaking(false), 800);
    }
    lastMilestonePercentRef.current = pct;
  }, [xp?.totalXP, xp?.currentLevel]);

  if (loading) {
    return (
      <div className="animate-pulse bg-white/5 rounded-2xl h-44 w-full mb-3 border border-white/10" />
    );
  }

  if (!xp || !streak) {
    return null;
  }

  // Level & XP calculations
  const xpForCurrentLevel = Math.pow(xp.currentLevel - 1, 2) * 100;
  const xpForNextLevel = Math.pow(xp.currentLevel, 2) * 100;
  const xpGainedInLevel = Math.max(0, xp.totalXP - xpForCurrentLevel);
  const xpSpanForLevel = Math.max(1, xpForNextLevel - xpForCurrentLevel);
  const progressPercent = Math.min(100, Math.max(0, (xpGainedInLevel / xpSpanForLevel) * 100));
  const remainingXP = Math.max(0, xpForNextLevel - xp.totalXP);

  // Rank progression
  const currentRankIndex = RANKS.findIndex(r => xp.currentLevel <= r.maxLevel);
  const currentRankObj = currentRankIndex !== -1 ? RANKS[currentRankIndex] : RANKS[0];
  const nextRank = currentRankIndex !== -1 && currentRankIndex < RANKS.length - 1 ? RANKS[currentRankIndex + 1] : null;
  const nextRankLevel = nextRank ? currentRankObj.maxLevel + 1 : null;

  // Streak tracker
  const todayStr = new Date().toISOString().split('T')[0];
  const isStudiedToday = streak.lastActivityDate === todayStr && streak.currentStreak > 0;
  const longestStreakRecord = Math.max(streak.longestStreak || 0, streak.currentStreak || 0);

  // 7-day streak and weekly goals breakdown
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const todayDayIndex = (new Date().getDay() + 6) % 7; // 0 = Mon, 6 = Sun
  
  // Weekly minutes progress calculation
  const dailyTargetMinutes = Math.round(weeklyGoalMinutes / 7);
  const weeklyStudyLogs = daysOfWeek.map((dayName, idx) => {
    const isToday = idx === todayDayIndex;
    const isPast = idx < todayDayIndex;
    let minutes = 0;
    if (isToday) {
      minutes = streak.todayStudyMinutes || (isStudiedToday ? dailyTargetMinutes : 0);
    } else if (isPast) {
      const daysAgo = todayDayIndex - idx;
      if (daysAgo <= streak.currentStreak) {
        minutes = Math.max(20, dailyTargetMinutes);
      } else {
        minutes = 0;
      }
    }
    const percent = Math.min(100, Math.round((minutes / Math.max(1, dailyTargetMinutes)) * 100));
    return { dayName, isToday, isPast, minutes, percent };
  });

  const totalWeeklyMinutesLogged = weeklyStudyLogs.reduce((acc, curr) => acc + curr.minutes, 0);
  const weeklyGoalPercent = Math.min(100, Math.round((totalWeeklyMinutesLogged / Math.max(1, weeklyGoalMinutes)) * 100));
  const is100Percent = progressPercent >= 100;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }}
      animate={isShaking ? {
        x: [0, -6, 6, -5, 5, -3, 3, 0],
        y: [0, 2, -2, 1, -1, 0],
        transition: { duration: 0.6, ease: "easeInOut" }
      } : { opacity: 1, y: 0, x: 0 }}
      className="relative group overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/90 via-slate-900/95 to-slate-950 p-4 sm:p-5 shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
    >
      {/* Subtle Level Up Celebration Overlay */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md p-4 flex flex-col items-center justify-center text-center overflow-hidden"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
              className="absolute w-72 h-72 bg-gradient-to-r from-[#39FF14]/20 via-[#00F0FF]/20 to-amber-500/20 rounded-full blur-[50px] pointer-events-none"
            />
            <button
              onClick={() => setShowCelebration(false)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>

            {/* Sparkles explosion */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: 0.5 }}
              className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#39FF14] to-[#00F0FF] p-0.5 shadow-[0_0_30px_rgba(57,255,20,0.6)] mb-3 flex items-center justify-center"
            >
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center flex-col">
                <Trophy size={26} className="text-[#39FF14] animate-bounce" />
              </div>
            </motion.div>

            <motion.h4
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-base sm:text-lg font-black text-white"
            >
              LEVEL UP CELEBRATION! 🎉
            </motion.h4>

            <motion.p
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-xs text-slate-300 font-mono mt-1"
            >
              You've unlocked <span className="text-[#39FF14] font-bold">Level {xp.currentLevel}</span> ({xp.rank})
            </motion.p>

            <div className="flex items-center gap-2 mt-3">
              <RankBadge totalXP={xp.totalXP} level={xp.currentLevel} size="md" showTierName={true} animateMilestone={true} />
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCelebration(false)}
              className="mt-4 px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#39FF14] to-[#00F0FF] text-slate-950 font-mono font-bold text-xs shadow-[0_0_15px_rgba(57,255,20,0.4)] cursor-pointer"
            >
              Continue Learning
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background glow flares */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#39FF14]/10 rounded-full blur-[70px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#00F0FF]/10 rounded-full blur-[70px] translate-y-1/2 -translate-x-1/3 pointer-events-none" />

      {/* 1. TOP HEADER: Level Badge, RankBadge with Shimmer & Neon Glow */}
      <div className="relative z-10 flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center space-x-3 min-w-0">
          {/* Level Shield Badge with Glow aura */}
          <motion.div
            whileHover={{ scale: 1.08, rotate: [0, -2, 2, 0] }}
            whileTap={{ scale: 0.94 }}
            onClick={() => {
              setSelectedStatDetail((prev) => (prev === 'xp' ? null : 'xp'));
            }}
            title="Click to view detailed XP and Level metrics"
            className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 border-2 border-[#39FF14]/50 flex items-center justify-center flex-col shadow-[0_0_22px_rgba(57,255,20,0.3)] shrink-0 cursor-pointer transition-all"
          >
            <span className="text-[9px] font-black text-slate-400 font-mono tracking-wider">LVL</span>
            <span className="text-xs sm:text-sm font-black text-white leading-none tracking-tight">{formatSmartXPNumber(xp.currentLevel)}</span>
            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#39FF14] rounded-full border-2 border-slate-950 flex items-center justify-center shadow-sm">
              <Sparkles size={8} className="text-slate-950" />
            </div>
          </motion.div>

          <div className="min-w-0">
            <div className="flex items-center flex-wrap gap-1.5">
              <h3 className="text-sm sm:text-base font-black text-white flex items-center truncate">
                <span>{xp.rank || 'Beginner'}</span>
              </h3>
              {/* Enhanced RankBadge with Shimmer, Neon Glow & Scale Pop */}
              <RankBadge 
                totalXP={xp.totalXP} 
                level={xp.currentLevel} 
                size="xs" 
                showLabel={true} 
                animateMilestone={is100Percent}
              />
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate flex items-center gap-1">
              {nextRank ? (
                <>
                  <span className="text-slate-300">Next Rank:</span>
                  <span className="text-cyan-400 font-bold">{nextRank.name}</span>
                  <span className="text-slate-500">(Lvl {nextRankLevel})</span>
                </>
              ) : (
                <span className="text-amber-400 font-bold flex items-center gap-1">
                  🏆 Apex Rank Mastered
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Rewards / Badges button */}
        <button
          onClick={onOpenRewards}
          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#39FF14]/40 text-slate-200 hover:text-white transition-all text-xs font-mono font-bold flex items-center space-x-1.5 shrink-0 cursor-pointer shadow-sm group/btn active:scale-95"
        >
          <Award size={13} className="text-[#39FF14] group-hover/btn:rotate-12 transition-transform" />
          <span className="hidden xs:inline">Rewards</span>
          <ChevronRight size={12} className="text-slate-400 group-hover/btn:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* 2. REFACTORED HIGH-FIDELITY GLASSMORPHIC XP PROGRESS BAR WITH PARTICLE EMITTER */}
      <motion.div
        animate={isShaking ? { scale: [1, 1.025, 0.975, 1.01, 1] } : { scale: 1 }}
        transition={{ duration: 0.5 }}
        onMouseEnter={() => setIsHoveringXP(true)}
        onMouseLeave={() => setIsHoveringXP(false)}
        onClick={() => {
          setIsShaking(true);
          triggerHighFidelityConfetti();
          setTimeout(() => setIsShaking(false), 700);
        }}
        title="Tap to trigger XP milestone celebration"
        className="relative z-10 mb-3.5 p-3.5 rounded-2xl bg-gradient-to-b from-slate-900/90 via-slate-950/80 to-slate-950 border border-white/10 hover:border-[#39FF14]/40 backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-300 cursor-pointer group/bar"
      >
        {/* Integrated Level Up Particle Emitter */}
        <LevelUpParticleEmitter 
          active={is100Percent || isHoveringXP || isShaking} 
          intensity={is100Percent || isShaking ? 'high' : 'normal'} 
        />

        {/* Ambient Top Specular Light Highlight */}
        <div className="absolute top-0 inset-x-4 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent pointer-events-none" />

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <Zap size={12} className="text-cyan-400 group-hover/bar:text-[#39FF14] transition-colors" />
            </div>
            <span className="text-xs font-black text-slate-200 uppercase tracking-wider">Experience Points (XP)</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono font-bold text-white">
              <AnimatedXPCounter value={xp.totalXP} size="xs" glowColor="#39FF14" showFloatingGain={false} />
              <span className="text-slate-500 font-normal"> / {formatSmartXPNumber(xpForNextLevel)} XP</span>
            </span>
            <span className={`px-2 py-0.5 rounded-lg font-mono text-[10px] font-black transition-all ${
              is100Percent 
                ? 'bg-[#39FF14]/25 border border-[#39FF14]/60 text-[#39FF14] shadow-[0_0_12px_rgba(57,255,20,0.5)] animate-pulse'
                : 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-300'
            }`}>
              {progressPercent.toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Glassmorphic Progress track container with 3D inset depth */}
        <div className="relative h-3.5 w-full bg-slate-950/90 rounded-full overflow-hidden border border-white/15 p-0.5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
          {/* Custom Multi-stop Gradient Animated Fill */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            className={`h-full rounded-full relative overflow-hidden transition-all ${
              is100Percent 
                ? 'bg-gradient-to-r from-emerald-500 via-[#39FF14] to-[#00F0FF] shadow-[0_0_20px_rgba(57,255,20,0.9)]'
                : 'bg-gradient-to-r from-[#10b981] via-[#39FF14] to-[#00F0FF] shadow-[0_0_14px_rgba(57,255,20,0.6)]'
            }`}
          >
            {/* Shimmer Light Reflection Sweep */}
            <motion.div 
              animate={{ x: ['-100%', '200%'] }}
              transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -skew-x-12"
            />
            {/* Top Light Bevel Accent */}
            <div className="absolute top-0 inset-x-0 h-[1px] bg-white/60" />
          </motion.div>
        </div>

        {/* Progress Bar Footer info with tactile micro-typography */}
        <div className="flex items-center justify-between mt-2 text-[10px] font-mono text-slate-400">
          <span className="text-slate-400 flex items-center">
            {is100Percent ? (
              <span className="text-[#39FF14] font-bold flex items-center gap-1">
                <Sparkles size={11} className="text-[#39FF14] animate-spin" /> 100% Milestone Achieved! Level Up Ready 🎉
              </span>
            ) : (
              <>
                <span className="text-[#39FF14] font-bold mr-1">{formatSmartXPNumber(remainingXP)} XP</span> to Level {formatSmartXPNumber(xp.currentLevel + 1)}
              </>
            )}
          </span>
          <span className="text-slate-500">
            {formatSmartXPNumber(xpGainedInLevel)} / {formatSmartXPNumber(xpSpanForLevel)} in level
          </span>
        </div>
      </motion.div>

      {/* 3. 3D-INSPIRED GLASS CARD STUDY STREAK COUNTER WITH DYNAMIC GLOW PULSES & ROLLING COUNTER */}
      <motion.div 
        whileHover={{ y: -1, transition: { duration: 0.2 } }}
        className="relative z-10 p-4 rounded-2xl bg-gradient-to-b from-slate-900/80 via-slate-950/90 to-slate-950 border border-orange-500/30 backdrop-blur-xl mb-3.5 space-y-3.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_8px_24px_rgba(249,115,22,0.12)] overflow-hidden group/streak"
      >
        {/* Dynamic Flame Glow Pulse Background Halo */}
        <motion.div
          animate={{
            opacity: [0.15, 0.35, 0.15],
            scale: [0.98, 1.04, 0.98]
          }}
          transition={{
            repeat: Infinity,
            duration: 3.5,
            ease: "easeInOut"
          }}
          className="absolute -top-12 -right-12 w-48 h-48 bg-gradient-to-br from-orange-500/30 to-amber-500/20 rounded-full blur-[45px] pointer-events-none"
        />

        {/* Specular Highlight Strip */}
        <div className="absolute top-0 inset-x-6 h-[1px] bg-gradient-to-r from-transparent via-orange-400/40 to-transparent pointer-events-none" />

        {/* Streak Top Header with 3D Flame Capsule & Rolling Digit Counter */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* 3D-inspired Layered Flame Token with dynamic pulse */}
            <motion.div
              animate={{
                boxShadow: [
                  '0 0 12px rgba(249,115,22,0.3)',
                  '0 0 24px rgba(249,115,22,0.6)',
                  '0 0 12px rgba(249,115,22,0.3)'
                ]
              }}
              transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
              className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/30 via-amber-500/20 to-slate-950 border border-orange-500/50 flex items-center justify-center shrink-0 shadow-lg"
            >
              <Flame size={22} className="text-orange-400 animate-pulse drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
              <div className="absolute inset-0 rounded-xl bg-orange-400/10 pointer-events-none" />
            </motion.div>

            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-white tracking-wide">
                  {streak.currentStreak > 0 ? `${streak.currentStreak} Day Study Streak` : 'Daily Study Streak'}
                </span>
                {isStudiedToday ? (
                  <span className="px-2 py-0.5 bg-[#39FF14]/15 border border-[#39FF14]/30 text-[#39FF14] rounded-full text-[9px] font-mono font-bold flex items-center shadow-[0_0_8px_rgba(57,255,20,0.2)]">
                    <CheckCircle2 size={10} className="mr-1" /> Active Today
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-amber-500/15 border border-amber-500/30 text-amber-300 rounded-full text-[9px] font-mono font-bold">
                    Study Today
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                Best Record: <span className="text-slate-200 font-bold">{longestStreakRecord} Days</span> • Today: <span className="text-cyan-400 font-bold">{streak.todayStudyMinutes || 0}m</span>
              </p>
            </div>
          </div>

          {/* Smooth Rolling Digit Counter Display */}
          <div className="text-right flex flex-col items-end justify-center">
            <div className="flex items-baseline justify-end space-x-0.5">
              <RollingCounter 
                value={streak.currentStreak} 
                fontSizeClass="text-2xl font-black"
                colorClass="text-orange-400"
              />
            </div>
            <span className="block text-[9px] text-slate-500 uppercase font-mono font-bold tracking-wider">Days</span>
          </div>
        </div>

        {/* MINI HORIZONTAL & COLUMN CHART: Weekly Study Goals (Ultra High Quality & Responsive) */}
        <div className="pt-3 border-t border-white/10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 rounded-md bg-[#39FF14]/15 border border-[#39FF14]/30 flex items-center justify-center">
                <BarChart2 size={12} className="text-[#39FF14]" />
              </div>
              <span className="text-xs font-bold text-slate-200 tracking-tight">Weekly Study Goal</span>
            </div>
            <div className="flex items-center space-x-1.5 font-mono text-[11px]">
              <span className="text-white font-bold">{totalWeeklyMinutesLogged}</span>
              <span className="text-slate-500 font-normal">/ {weeklyGoalMinutes}m</span>
              <span className="px-1.5 py-0.5 rounded-md bg-[#39FF14]/15 border border-[#39FF14]/30 text-[#39FF14] font-bold text-[10px] shadow-[0_0_8px_rgba(57,255,20,0.25)]">
                {weeklyGoalPercent}%
              </span>
            </div>
          </div>

          {/* Slim Weekly Cumulative Progress Track */}
          <div className="relative h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5 mb-3">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${weeklyGoalPercent}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-[#39FF14] via-[#00F0FF] to-[#39FF14] shadow-[0_0_8px_rgba(57,255,20,0.5)]"
            />
          </div>

          {/* 7-Day Micro Column Chart (Always In Single Row, 100% Mobile Safe) */}
          <div className="flex items-end justify-between gap-1 sm:gap-2 w-full pt-1">
            {weeklyStudyLogs.map((item, idx) => {
              const isGoalMet = item.minutes >= dailyTargetMinutes;
              const hasActivity = item.minutes > 0;
              return (
                <div key={idx} className="flex-1 min-w-0 flex flex-col items-center group/day">
                  {/* Top Minute Label */}
                  <span className={`text-[8px] sm:text-[9px] font-mono font-bold mb-1 truncate transition-colors ${
                    item.isToday 
                      ? 'text-amber-300 font-extrabold' 
                      : hasActivity 
                      ? 'text-slate-300' 
                      : 'text-slate-600'
                  }`}>
                    {hasActivity ? `${item.minutes}m` : item.isToday ? 'Today' : '—'}
                  </span>

                  {/* Vertical Column Bar */}
                  <div className={`w-full h-12 max-w-[38px] rounded-lg bg-slate-950/80 border p-0.5 relative flex flex-col justify-end overflow-hidden transition-all group-hover/day:border-white/30 ${
                    item.isToday
                      ? 'border-amber-400/50 shadow-[0_0_10px_rgba(251,191,36,0.2)]'
                      : isGoalMet
                      ? 'border-[#39FF14]/30 shadow-[0_0_8px_rgba(57,255,20,0.15)]'
                      : 'border-white/10'
                  }`}>
                    {/* Background Target Line Guide */}
                    <div className="absolute top-[30%] inset-x-0 border-b border-dashed border-white/10 pointer-events-none" />

                    {/* Animated Fill Bar */}
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(hasActivity ? 22 : item.isToday ? 10 : 4, item.percent)}%` }}
                      transition={{ duration: 0.8, delay: idx * 0.05, ease: 'easeOut' }}
                      className={`w-full rounded-[5px] relative overflow-hidden transition-colors ${
                        isGoalMet
                          ? 'bg-gradient-to-t from-emerald-600 via-[#39FF14] to-[#00F0FF] shadow-[0_0_10px_rgba(57,255,20,0.5)]'
                          : hasActivity
                          ? 'bg-gradient-to-t from-cyan-600 to-cyan-400'
                          : item.isToday
                          ? 'bg-gradient-to-t from-amber-600/50 to-amber-400/80 animate-pulse'
                          : 'bg-white/5'
                      }`}
                    >
                      {/* Subtle Top Cap Light Highlight */}
                      {hasActivity && (
                        <div className="absolute top-0 inset-x-0 h-0.5 bg-white/70 shadow-sm" />
                      )}
                    </motion.div>
                  </div>

                  {/* Day Label Pill */}
                  <div className="mt-1.5 text-center">
                    <span className={`text-[9px] sm:text-[10px] font-mono tracking-tight font-bold block px-1 py-0.5 rounded transition-all ${
                      item.isToday
                        ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 shadow-sm'
                        : isGoalMet
                        ? 'text-slate-200'
                        : hasActivity
                        ? 'text-slate-300'
                        : 'text-slate-500'
                    }`}>
                      {item.dayName}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Motivation Footnote */}
        <div className="pt-2 border-t border-white/5 text-[10px] text-slate-400 font-mono flex items-center justify-between">
          <span className="flex items-center text-slate-300">
            <Sparkles size={11} className="text-amber-400 mr-1 shrink-0" />
            {streak.currentStreak >= 7 
              ? '🔥 7+ Day Streak Active! +20% Bonus XP Multiplier applied'
              : `🔥 Complete daily goals to maintain streak & unlock Gold Rank`}
          </span>
        </div>
      </motion.div>

      {/* 4. STATS SUMMARY TILES WITH INLINE EXPANSION (NO OVERLAY MODAL) */}
      <div className="relative z-10 grid grid-cols-3 gap-2">
        <motion.div 
          whileHover={{ y: -2 }}
          onClick={() => setSelectedStatDetail((prev) => (prev === 'streak' ? null : 'streak'))}
          title="Click to view exact streak details"
          className={`rounded-xl p-2.5 border flex flex-col items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95 ${
            selectedStatDetail === 'streak'
              ? 'bg-orange-500/15 border-orange-500/80 shadow-[0_0_12px_rgba(249,115,22,0.25)]'
              : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/5 hover:border-orange-500/30'
          }`}
        >
          <Flame size={15} className="text-orange-400 mb-0.5" />
          <span className="text-sm sm:text-base font-black text-white font-mono">{streak.currentStreak}d</span>
          <span className="text-[8px] sm:text-[9px] text-slate-400 font-bold uppercase tracking-wider">Streak</span>
        </motion.div>
        
        <motion.div 
          whileHover={{ y: -2 }}
          onClick={() => setSelectedStatDetail((prev) => (prev === 'xp' ? null : 'xp'))}
          title="Click to view exact Total XP details"
          className={`rounded-xl p-2.5 border flex flex-col items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95 ${
            selectedStatDetail === 'xp'
              ? 'bg-cyan-500/15 border-cyan-400/80 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
              : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/5 hover:border-cyan-500/30'
          }`}
        >
          <Zap size={15} className="text-cyan-400 mb-0.5" />
          <AnimatedXPCounter value={xp.totalXP} size="sm" glowColor="#00F0FF" showFloatingGain={false} />
          <span className="text-[8px] sm:text-[9px] text-slate-400 font-bold uppercase tracking-wider">Total XP</span>
        </motion.div>

        <motion.div 
          whileHover={{ y: -2 }}
          onClick={() => setSelectedStatDetail((prev) => (prev === 'points' ? null : 'points'))}
          title="Click to view exact Points details"
          className={`rounded-xl p-2.5 border flex flex-col items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95 ${
            selectedStatDetail === 'points'
              ? 'bg-[#39FF14]/15 border-[#39FF14]/80 shadow-[0_0_12px_rgba(57,255,20,0.25)]'
              : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/5 hover:border-[#39FF14]/30'
          }`}
        >
          <Target size={15} className="text-[#39FF14] mb-0.5" />
          <span className="text-sm sm:text-base font-black text-white font-mono">{formatSmartXPNumber(xp.learningPoints || 0)}</span>
          <span className="text-[8px] sm:text-[9px] text-slate-400 font-bold uppercase tracking-wider">Points</span>
        </motion.div>
      </div>

      {/* INLINE STATS DETAILS (NO SCREEN OVERFLOW / NO MODAL OVERLAY) */}
      <AnimatePresence>
        {selectedStatDetail && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 10 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-white/10 p-3.5 relative text-left shadow-xl"
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
              <div className="flex items-center space-x-2">
                {selectedStatDetail === 'streak' && <Flame size={16} className="text-orange-400" />}
                {selectedStatDetail === 'xp' && <Zap size={16} className="text-cyan-400" />}
                {selectedStatDetail === 'points' && <Target size={16} className="text-[#39FF14]" />}
                <span className="text-xs font-bold text-white font-mono uppercase tracking-wide">
                  {selectedStatDetail === 'streak' && 'Streak Record'}
                  {selectedStatDetail === 'xp' && 'Total XP & Rank'}
                  {selectedStatDetail === 'points' && 'Learning Points'}
                </span>
              </div>
              <button
                onClick={() => setSelectedStatDetail(null)}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            {selectedStatDetail === 'streak' && (
              <div className="space-y-1.5 font-mono text-xs">
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400 text-[11px]">Active Streak:</span>
                  <span className="font-bold text-orange-400">🔥 {streak.currentStreak} Days</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400 text-[11px]">Best Record:</span>
                  <span className="font-bold text-amber-300">{longestStreakRecord} Days</span>
                </div>
              </div>
            )}

            {selectedStatDetail === 'xp' && (
              <div className="space-y-2 font-mono text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Exact Total Experience</span>
                  <span className="text-sm font-black text-[#39FF14] block break-all">
                    {xp.totalXP.toLocaleString()} XP
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-300 pt-1.5 border-t border-white/5">
                  <span className="text-slate-400 text-[11px]">Current Rank:</span>
                  <span className="font-bold text-amber-300">Lvl {xp.currentLevel.toLocaleString()} ({xp.rank || 'Scholar'})</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400 text-[11px]">XP to Next Level:</span>
                  <span className="font-bold text-cyan-400">{remainingXP.toLocaleString()} XP</span>
                </div>
              </div>
            )}

            {selectedStatDetail === 'points' && (
              <div className="space-y-1.5 font-mono text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Exact Learning Points</span>
                  <span className="text-sm font-black text-cyan-400 block break-all">
                    {(xp.learningPoints || 0).toLocaleString()} Points
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 pt-1 border-t border-white/5">
                  Redeem points for badges and avatar frames in the XP Store.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default GamificationSummary;
