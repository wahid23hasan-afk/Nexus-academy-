import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Trophy, Flame, Star, Target, TrendingUp, Zap, ChevronRight, Award } from 'lucide-react';
import { gamificationService, UserXP, DailyStreak } from '../services/gamificationService';
import { auth } from '../services/firebase';

interface GamificationSummaryProps {
  onOpenRewards: () => void;
}

export function GamificationSummary({ onOpenRewards }: GamificationSummaryProps) {
  const [xp, setXp] = useState<UserXP | null>(null);
  const [streak, setStreak] = useState<DailyStreak | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const loadGamiData = async () => {
      if (!auth.currentUser) {
        if (mounted) setLoading(false);
        return;
      }
      const [xpData, streakData] = await Promise.all([
        gamificationService.getUserXP(auth.currentUser.uid),
        gamificationService.getDailyStreak(auth.currentUser.uid)
      ]);
      if (mounted) {
        setXp(xpData);
        setStreak(streakData);
        setLoading(false);
      }
    };
    loadGamiData();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse bg-white/5 rounded-2xl h-32 w-full mb-6 border border-white/10" />
    );
  }

  if (!xp || !streak) {
    return null; // Don't render for guests
  }

  const xpForCurrentLevel = Math.pow(xp.currentLevel - 1, 2) * 100;
  const xpForNextLevel = Math.pow(xp.currentLevel, 2) * 100;
  const progressPercent = Math.min(100, Math.max(0, ((xp.totalXP - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100));

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 relative group overflow-hidden rounded-3xl cursor-pointer"
      onClick={onOpenRewards}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 opacity-90 border border-white/10 rounded-3xl" />
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#39FF14]/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/3" />
      
      <div className="relative p-5 sm:p-6 flex flex-col md:flex-row gap-6 items-center">
        {/* Level Badge */}
        <div className="flex items-center space-x-4 w-full md:w-auto md:pr-6 md:border-r md:border-white/10">
          <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="6" className="text-white/10" />
              <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="6" className="text-[#39FF14]" strokeDasharray={`${progressPercent * 2.83} 283`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 bg-[#39FF14]/10 rounded-full m-1 border border-[#39FF14]/30 flex items-center justify-center flex-col shadow-[0_0_15px_rgba(57,255,20,0.2)]">
              <span className="text-[10px] font-bold text-slate-300 font-mono">LVL</span>
              <span className="text-xl font-black text-white leading-none">{xp.currentLevel}</span>
            </div>
          </div>
          <div className="flex-1 md:flex-none">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <span>{xp.rank}</span>
              <Trophy size={14} className="text-[#39FF14]" />
            </h3>
            <p className="text-[10px] text-slate-400 font-mono mt-1">
              {xp.totalXP} / {xpForNextLevel} XP to Next
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="flex-1 grid grid-cols-3 gap-2 w-full">
          <div className="bg-white/5 rounded-xl p-3 border border-white/5 flex flex-col items-center justify-center relative overflow-hidden group-hover:border-[#39FF14]/20 transition-colors">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent" />
            <Flame size={18} className="text-orange-500 mb-1" />
            <span className="text-lg font-black text-white font-mono">{streak.currentStreak}</span>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Day Streak</span>
          </div>
          
          <div className="bg-white/5 rounded-xl p-3 border border-white/5 flex flex-col items-center justify-center relative overflow-hidden group-hover:border-[#39FF14]/20 transition-colors">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent" />
            <Zap size={18} className="text-blue-400 mb-1" />
            <span className="text-lg font-black text-white font-mono">{xp.totalXP}</span>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Total XP</span>
          </div>

          <div className="bg-white/5 rounded-xl p-3 border border-white/5 flex flex-col items-center justify-center relative overflow-hidden group-hover:border-[#39FF14]/20 transition-colors">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent" />
            <Target size={18} className="text-purple-400 mb-1" />
            <span className="text-lg font-black text-white font-mono">{xp.learningPoints}</span>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Learning Pts</span>
          </div>
        </div>
        
        <div className="hidden md:flex shrink-0">
          <ChevronRight size={24} className="text-slate-500 group-hover:text-[#39FF14] transition-colors translate-x-0 group-hover:translate-x-1" />
        </div>
      </div>
    </motion.div>
  );
}
