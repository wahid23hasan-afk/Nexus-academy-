import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Shield, Award, Trophy, Crown, Sparkles, Gem, Zap } from 'lucide-react';

export type RankTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Master' | 'Grandmaster';

export interface RankTierInfo {
  tier: RankTier;
  name: string;
  minXP: number;
  maxXP: number;
  bgGradient: string;
  borderColor: string;
  textColor: string;
  glowColor: string;
  glowColorHex: string;
  badgeBg: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  description: string;
}

export const RANK_TIERS: RankTierInfo[] = [
  {
    tier: 'Bronze',
    name: 'Bronze Novice',
    minXP: 0,
    maxXP: 500,
    bgGradient: 'from-amber-900/60 via-amber-800/40 to-amber-950/80',
    borderColor: 'border-amber-600/60',
    textColor: 'text-amber-300',
    glowColor: 'rgba(217, 119, 6, 0.45)',
    glowColorHex: '#d97706',
    badgeBg: 'bg-amber-800/30',
    icon: Shield,
    description: 'Starting your learning journey'
  },
  {
    tier: 'Silver',
    name: 'Silver Scholar',
    minXP: 501,
    maxXP: 1500,
    bgGradient: 'from-slate-400/40 via-slate-300/20 to-slate-700/60',
    borderColor: 'border-slate-300/70',
    textColor: 'text-slate-100',
    glowColor: 'rgba(226, 232, 240, 0.5)',
    glowColorHex: '#e2e8f0',
    badgeBg: 'bg-slate-400/30',
    icon: Award,
    description: 'Consistent academic dedication'
  },
  {
    tier: 'Gold',
    name: 'Gold Achiever',
    minXP: 1501,
    maxXP: 3500,
    bgGradient: 'from-amber-500/40 via-yellow-400/30 to-amber-700/60',
    borderColor: 'border-yellow-400/80',
    textColor: 'text-yellow-300',
    glowColor: 'rgba(234, 179, 8, 0.6)',
    glowColorHex: '#eab308',
    badgeBg: 'bg-yellow-500/30',
    icon: Trophy,
    description: 'Exemplary performance & mastery'
  },
  {
    tier: 'Platinum',
    name: 'Platinum Vanguard',
    minXP: 3501,
    maxXP: 7500,
    bgGradient: 'from-cyan-500/40 via-teal-400/30 to-emerald-700/60',
    borderColor: 'border-cyan-400/80',
    textColor: 'text-cyan-200',
    glowColor: 'rgba(6, 182, 212, 0.6)',
    glowColorHex: '#06b6d4',
    badgeBg: 'bg-cyan-500/30',
    icon: Gem,
    description: 'Elite student & high-speed comprehension'
  },
  {
    tier: 'Diamond',
    name: 'Diamond Specialist',
    minXP: 7501,
    maxXP: 15000,
    bgGradient: 'from-sky-500/50 via-indigo-400/30 to-blue-700/70',
    borderColor: 'border-sky-300/90',
    textColor: 'text-sky-100',
    glowColor: 'rgba(56, 189, 248, 0.7)',
    glowColorHex: '#38bdf8',
    badgeBg: 'bg-sky-500/30',
    icon: Sparkles,
    description: 'Top-tier domain expertise'
  },
  {
    tier: 'Master',
    name: 'Master Luminary',
    minXP: 15001,
    maxXP: 30000,
    bgGradient: 'from-purple-600/50 via-fuchsia-500/30 to-pink-700/70',
    borderColor: 'border-fuchsia-400/90',
    textColor: 'text-fuchsia-200',
    glowColor: 'rgba(217, 70, 239, 0.7)',
    glowColorHex: '#d946ef',
    badgeBg: 'bg-fuchsia-500/30',
    icon: Crown,
    description: 'Distinguished scholarship and top rankings'
  },
  {
    tier: 'Grandmaster',
    name: 'Grandmaster Apex',
    minXP: 30001,
    maxXP: Infinity,
    bgGradient: 'from-[#39FF14]/40 via-emerald-400/30 to-[#00F0FF]/50',
    borderColor: 'border-[#39FF14]',
    textColor: 'text-[#39FF14]',
    glowColor: 'rgba(57, 255, 20, 0.8)',
    glowColorHex: '#39ff14',
    badgeBg: 'bg-[#39FF14]/30',
    icon: Zap,
    description: 'Apex academic leader of the platform'
  }
];

export function getRankTierFromXP(xp: number): RankTierInfo {
  const tier = RANK_TIERS.find(t => xp >= t.minXP && xp <= t.maxXP);
  return tier || RANK_TIERS[0];
}

interface RankBadgeProps {
  totalXP: number;
  level?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showTierName?: boolean;
  animateMilestone?: boolean;
  className?: string;
  onClick?: () => void;
}

export function formatSmartXPNumber(num: number): string {
  if (!num || isNaN(num)) return '0';
  if (num < 1000000) {
    return num.toLocaleString();
  } else if (num < 1000000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num < 1000000000000) {
    return (num / 1000000000).toFixed(2) + 'B';
  } else if (num < 1000000000000000) {
    return (num / 1000000000000).toFixed(2) + 'T';
  } else {
    return (num / 1000000000000000).toFixed(2) + 'Q';
  }
}

export function RankBadge({
  totalXP,
  level,
  size = 'md',
  showLabel = true,
  showTierName = false,
  animateMilestone = false,
  className = '',
  onClick
}: RankBadgeProps) {
  const rankInfo = getRankTierFromXP(totalXP);
  const Icon = rankInfo.icon;
  const prevTierRef = useRef<string>(rankInfo.tier);
  const [triggerPop, setTriggerPop] = useState(animateMilestone);

  // Trigger scale pop when rank changes or animateMilestone updates
  useEffect(() => {
    if (prevTierRef.current !== rankInfo.tier || animateMilestone) {
      setTriggerPop(true);
      const t = setTimeout(() => setTriggerPop(false), 1200);
      prevTierRef.current = rankInfo.tier;
      return () => clearTimeout(t);
    }
  }, [rankInfo.tier, animateMilestone]);

  const sizeClasses = {
    xs: {
      container: 'px-2 py-0.5 text-[9px] gap-1',
      iconSize: 10,
      iconWrap: 'w-3.5 h-3.5'
    },
    sm: {
      container: 'px-2.5 py-1 text-[10px] gap-1.5',
      iconSize: 12,
      iconWrap: 'w-4 h-4'
    },
    md: {
      container: 'px-3 py-1.5 text-xs gap-2',
      iconSize: 14,
      iconWrap: 'w-5 h-5'
    },
    lg: {
      container: 'px-4 py-2 text-sm gap-2.5',
      iconSize: 17,
      iconWrap: 'w-6 h-6'
    }
  }[size];

  return (
    <motion.div
      onClick={onClick}
      initial={false}
      animate={
        triggerPop
          ? {
              scale: [1, 1.32, 0.92, 1.12, 1],
              rotate: [0, -3, 3, -1, 0],
              boxShadow: [
                `0 0 10px ${rankInfo.glowColor}`,
                `0 0 28px ${rankInfo.glowColorHex}, 0 0 45px ${rankInfo.glowColorHex}`,
                `0 0 14px ${rankInfo.glowColor}`
              ]
            }
          : {
              scale: 1,
              rotate: 0,
              boxShadow: [
                `0 0 10px ${rankInfo.glowColor}`,
                `0 0 18px ${rankInfo.glowColor}`,
                `0 0 10px ${rankInfo.glowColor}`
              ]
            }
      }
      transition={
        triggerPop
          ? { duration: 0.9, ease: [0.34, 1.56, 0.64, 1] }
          : {
              boxShadow: {
                duration: 2.8,
                repeat: Infinity,
                repeatType: 'reverse',
                ease: 'easeInOut'
              }
            }
      }
      whileHover={{ scale: 1.06, y: -1 }}
      whileTap={{ scale: 0.95 }}
      className={`relative group/rank overflow-hidden inline-flex items-center rounded-full border backdrop-blur-md bg-gradient-to-r ${rankInfo.bgGradient} ${rankInfo.borderColor} ${rankInfo.textColor} font-mono font-bold transition-all select-none shadow-lg ${sizeClasses.container} ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* 1. Neon Glow Ambient Pulsing Backdrop */}
      <motion.div
        animate={{
          opacity: [0.3, 0.7, 0.3],
          scale: [0.95, 1.05, 0.95]
        }}
        transition={{
          repeat: Infinity,
          duration: 3,
          ease: "easeInOut"
        }}
        className="absolute inset-0 rounded-full pointer-events-none opacity-40 blur-[4px]"
        style={{ background: `radial-gradient(circle, ${rankInfo.glowColorHex} 0%, transparent 80%)` }}
      />

      {/* 2. Shimmer Light Beam Effect */}
      <motion.div
        initial={{ x: '-150%' }}
        animate={{ x: '250%' }}
        transition={{
          repeat: Infinity,
          repeatDelay: 2.2,
          duration: 1.5,
          ease: "easeInOut"
        }}
        className="absolute inset-y-0 w-8 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-25deg] pointer-events-none"
      />

      {/* 3. Icon Medal Wrap with micro-glow */}
      <span className={`relative z-10 flex items-center justify-center rounded-full ${rankInfo.badgeBg} border border-white/20 shadow-inner shrink-0 group-hover/rank:rotate-12 transition-transform duration-300`}>
        <Icon size={sizeClasses.iconSize} className={`${rankInfo.textColor} drop-shadow-[0_0_6px_currentColor]`} />
      </span>

      {/* 4. Label & Rank Name */}
      {showLabel && (
        <span className="relative z-10 tracking-tight whitespace-nowrap drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
          {showTierName ? rankInfo.name : rankInfo.tier}
        </span>
      )}

      {level !== undefined && (
        <span className="relative z-10 opacity-80 text-[85%] font-normal bg-black/30 px-1.5 py-0.2 rounded-full border border-white/10">
          Lvl {formatSmartXPNumber(level)}
        </span>
      )}
    </motion.div>
  );
}

export default RankBadge;
