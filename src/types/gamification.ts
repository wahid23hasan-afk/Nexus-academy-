export type GamificationRewardType = 'xp' | 'wallet' | 'voucher' | 'badge' | 'mystery' | 'none';

export interface SpinWheelSegment {
  id: string;
  label: string;
  type: GamificationRewardType;
  value: number; // XP amount, Wallet amount, or Discount %
  voucherCode?: string;
  voucherTitle?: string;
  color: string;
  textColor?: string;
  probability: number; // 0.0 to 1.0
  icon?: string;
}

export interface DiscountVoucher {
  id: string;
  code: string;
  title: string;
  titleBn: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  xpCost: number;
  minSpend: number;
  expiryDays: number;
  badgeText?: string;
  icon?: string;
  isActive: boolean;
  stockRemaining?: number;
}

export interface UserRedeemedVoucher {
  id: string;
  userId: string;
  voucherId: string;
  code: string;
  title: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minSpend: number;
  xpSpent: number;
  redeemedAt: string;
  expiresAt: string;
  isUsed: boolean;
  usedAt?: string;
}

export interface VIPTierDefinition {
  tierId: string;
  name: string;
  nameBn: string;
  minXP: number;
  badgeIcon: string;
  colorTheme: string;
  gradientBg: string;
  borderColor: string;
  glowColor: string;
  perks: string[];
  xpMultiplier: number;
  dailyFreeSpins: number;
  courseDiscountPercent: number;
}

export interface GamificationConfig {
  isEnabled: boolean;
  converter: {
    isEnabled: boolean;
    xpPerCurrencyUnit: number; // e.g. 10 XP = 1 BDT (so 100 XP = 10 BDT)
    currencySymbol: string; // '৳'
    currencyCode: string; // 'BDT'
    minXPThreshold: number; // e.g. 100 XP
    maxDailyConversionXP: number; // e.g. 5000 XP
  };
  spinWheel: {
    isEnabled: boolean;
    spinCostXP: number; // e.g. 50 XP
    dailyFreeSpins: number; // e.g. 1
    cooldownMinutes: number;
    segments: SpinWheelSegment[];
  };
  vouchers: DiscountVoucher[];
  vipTiers: VIPTierDefinition[];
  updatedAt?: string;
  updatedBy?: string;
}

export interface XPLedgerEntry {
  id: string;
  userId: string;
  type: 'earn' | 'spend';
  category: 'lesson' | 'quiz' | 'course_complete' | 'daily_login' | 'daily_chest' | 'lucky_spin' | 'wallet_conversion' | 'voucher_redeem' | 'admin_grant' | 'other';
  amount: number; // Positive for earn, positive for spend (indicated by type)
  description: string;
  balanceAfter?: number;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface WalletTransactionEntry {
  id: string;
  userId: string;
  type: 'credit' | 'debit';
  amount: number;
  source: 'xp_conversion' | 'spin_reward' | 'course_refund' | 'course_purchase' | 'admin_bonus';
  description: string;
  balanceAfter?: number;
  createdAt: string;
}

export const DEFAULT_SPIN_SEGMENTS: SpinWheelSegment[] = [
  { id: 'spin_1', label: '+50 XP', type: 'xp', value: 50, color: '#10b981', textColor: '#ffffff', probability: 0.3, icon: '⚡' },
  { id: 'spin_2', label: '৳10 Wallet', type: 'wallet', value: 10, color: '#f59e0b', textColor: '#000000', probability: 0.15, icon: '💰' },
  { id: 'spin_3', label: '+100 XP', type: 'xp', value: 100, color: '#6366f1', textColor: '#ffffff', probability: 0.15, icon: '🔥' },
  { id: 'spin_4', label: '15% Off Code', type: 'voucher', value: 15, voucherCode: 'LUCKY15', voucherTitle: '15% Lucky Spin Voucher', color: '#8b5cf6', textColor: '#ffffff', probability: 0.1, icon: '🎟️' },
  { id: 'spin_5', label: '+25 XP', type: 'xp', value: 25, color: '#06b6d4', textColor: '#ffffff', probability: 0.2, icon: '✨' },
  { id: 'spin_6', label: '৳25 Wallet', type: 'wallet', value: 25, color: '#ec4899', textColor: '#ffffff', probability: 0.05, icon: '👑' },
  { id: 'spin_7', label: 'Try Again', type: 'none', value: 0, color: '#334155', textColor: '#94a3b8', probability: 0.05, icon: '🎯' }
];

export const DEFAULT_VOUCHERS: DiscountVoucher[] = [
  {
    id: 'vouch_1',
    code: 'XP10OFF',
    title: '10% Discount Voucher',
    titleBn: '১০% বিশেষ কোর্স ছাড় ভাউচার',
    description: 'Get 10% instant discount on any premium programming or academic course.',
    discountType: 'percentage',
    discountValue: 10,
    xpCost: 200,
    minSpend: 500,
    expiryDays: 30,
    badgeText: 'Popular',
    icon: '🎟️',
    isActive: true
  },
  {
    id: 'vouch_2',
    code: 'XP25OFF',
    title: '25% Pro Scholar Voucher',
    titleBn: '২৫% মেগা স্কলারশিপ ছাড়',
    description: 'Unlock a massive 25% discount across all admission & engineering programs.',
    discountType: 'percentage',
    discountValue: 25,
    xpCost: 450,
    minSpend: 1000,
    expiryDays: 45,
    badgeText: 'Hot Deal',
    icon: '🔥',
    isActive: true
  },
  {
    id: 'vouch_3',
    code: 'FLAT100TK',
    title: 'Flat ৳100 Off Voucher',
    titleBn: '১০০ টাকা ফ্ল্যাট ছাড়',
    description: 'Direct ৳100 cash deduction on any course purchase of ৳800 or more.',
    discountType: 'fixed',
    discountValue: 100,
    xpCost: 350,
    minSpend: 800,
    expiryDays: 60,
    badgeText: 'Cashback',
    icon: '💰',
    isActive: true
  },
  {
    id: 'vouch_4',
    code: 'XP50MEGA',
    title: '50% Elite Master Voucher',
    titleBn: '৫০% এলিট রত্ন ভাউচার',
    description: 'Exclusive half-price discount for dedicated scholars on any single course.',
    discountType: 'percentage',
    discountValue: 50,
    xpCost: 1000,
    minSpend: 1500,
    expiryDays: 90,
    badgeText: 'Legendary',
    icon: '👑',
    isActive: true
  }
];

export const DEFAULT_VIP_TIERS: VIPTierDefinition[] = [
  {
    tierId: 'tier_bronze',
    name: 'Bronze Scholar',
    nameBn: 'ব্রোঞ্জ স্কলার',
    minXP: 0,
    badgeIcon: '🥉',
    colorTheme: 'amber-700',
    gradientBg: 'from-amber-950/40 via-amber-900/20 to-slate-950',
    borderColor: 'border-amber-700/40',
    glowColor: 'rgba(180, 83, 9, 0.2)',
    perks: ['Standard Lesson Streaming', 'Community Forum Access', 'Basic Daily Login XP'],
    xpMultiplier: 1.0,
    dailyFreeSpins: 1,
    courseDiscountPercent: 0
  },
  {
    tierId: 'tier_silver',
    name: 'Silver Prodigy',
    nameBn: 'সিলভার স্কলার',
    minXP: 300,
    badgeIcon: '🥈',
    colorTheme: 'slate-300',
    gradientBg: 'from-slate-800/50 via-slate-900/30 to-slate-950',
    borderColor: 'border-slate-400/40',
    glowColor: 'rgba(203, 213, 225, 0.2)',
    perks: ['+5% Bonus XP on Lesson Completions', 'Silver Scholar Profile Badge', '1 Free Lucky Wheel Spin / Day', '5% Course Discount'],
    xpMultiplier: 1.05,
    dailyFreeSpins: 1,
    courseDiscountPercent: 5
  },
  {
    tierId: 'tier_gold',
    name: 'Gold Vanguard',
    nameBn: 'গোল্ড মাস্টার',
    minXP: 1000,
    badgeIcon: '🥇',
    colorTheme: 'amber-400',
    gradientBg: 'from-amber-600/30 via-amber-900/20 to-slate-950',
    borderColor: 'border-amber-400/50',
    glowColor: 'rgba(245, 158, 11, 0.3)',
    perks: ['+10% Bonus XP on All Quizzes', 'Gold Metallic Avatar Frame', '10% Discount on All Courses', '2 Free Lucky Spins / Day'],
    xpMultiplier: 1.10,
    dailyFreeSpins: 2,
    courseDiscountPercent: 10
  },
  {
    tierId: 'tier_platinum',
    name: 'Platinum Champion',
    nameBn: 'প্লাটিনাম চ্যাম্পিয়ন',
    minXP: 2500,
    badgeIcon: '💎',
    colorTheme: 'cyan-400',
    gradientBg: 'from-cyan-900/40 via-blue-950/30 to-slate-950',
    borderColor: 'border-cyan-400/50',
    glowColor: 'rgba(6, 182, 212, 0.3)',
    perks: ['+20% Bonus XP Multiplier', 'Priority 24/7 Academic Support', '15% Direct Course Discount', 'Streak Freeze Shield Included'],
    xpMultiplier: 1.20,
    dailyFreeSpins: 2,
    courseDiscountPercent: 15
  },
  {
    tierId: 'tier_diamond',
    name: 'Diamond Master',
    nameBn: 'ডায়মন্ড মাস্টার',
    minXP: 5000,
    badgeIcon: '👑',
    colorTheme: 'indigo-400',
    gradientBg: 'from-indigo-900/40 via-purple-950/30 to-slate-950',
    borderColor: 'border-indigo-400/50',
    glowColor: 'rgba(99, 102, 241, 0.35)',
    perks: ['+35% Bonus XP on All Actions', '3 Free Lucky Spins / Day', '20% Course Discount', 'Exclusive Live Masterclass Invites'],
    xpMultiplier: 1.35,
    dailyFreeSpins: 3,
    courseDiscountPercent: 20
  },
  {
    tierId: 'tier_mythic',
    name: 'Mythic Legend',
    nameBn: 'মিথিক কিংবদন্তি',
    minXP: 10000,
    badgeIcon: '🌌',
    colorTheme: 'emerald-400',
    gradientBg: 'from-emerald-900/40 via-teal-950/30 to-slate-950',
    borderColor: 'border-emerald-400/60',
    glowColor: 'rgba(16, 185, 129, 0.4)',
    perks: ['+50% Ultra XP Boost', '5 Free Lucky Spins / Day', '30% Lifetime Course Discount', 'Mythic Legend Glowing Halo & Crown'],
    xpMultiplier: 1.50,
    dailyFreeSpins: 5,
    courseDiscountPercent: 30
  }
];

export const DEFAULT_GAMIFICATION_CONFIG: GamificationConfig = {
  isEnabled: true,
  converter: {
    isEnabled: true,
    xpPerCurrencyUnit: 10, // 100 XP = ৳10 (10 XP = ৳1)
    currencySymbol: '৳',
    currencyCode: 'BDT',
    minXPThreshold: 100,
    maxDailyConversionXP: 5000
  },
  spinWheel: {
    isEnabled: true,
    spinCostXP: 50,
    dailyFreeSpins: 1,
    cooldownMinutes: 0,
    segments: DEFAULT_SPIN_SEGMENTS
  },
  vouchers: DEFAULT_VOUCHERS,
  vipTiers: DEFAULT_VIP_TIERS
};
