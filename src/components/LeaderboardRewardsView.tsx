import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, Flame, Award, Zap, Crown, Medal, Shield, Sparkles, 
  Search, RefreshCw, ChevronRight, User as UserIcon, CheckCircle2, 
  Lock, Star, ArrowUpRight, TrendingUp, Info, HelpCircle, BookOpen
} from 'lucide-react';
import { User, UserBadgeItem } from '../types/auth';
import { 
  gamificationService, 
  LeaderboardStudent, 
  BADGE_CATALOG, 
  BadgeDefinition, 
  getLevelFromXP, 
  getRankFromLevel,
  getXPForLevel,
  getXPForNextLevel
} from '../services/gamificationService';
import { soundFxService } from '../services/soundFxService';

interface LeaderboardRewardsViewProps {
  userProfile: User | null;
  onShowNotification?: (message: string, type?: 'success' | 'error' | 'info') => void;
  onNavigateToCourse?: () => void;
}

export const LeaderboardRewardsView: React.FC<LeaderboardRewardsViewProps> = ({
  userProfile,
  onShowNotification,
  onNavigateToCourse
}) => {
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'badges'>('leaderboard');
  const [timeFilter, setTimeFilter] = useState<'all' | 'weekly' | 'monthly'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<LeaderboardStudent[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadgeItem[]>([]);
  const [userXP, setUserXP] = useState<number>(0);
  const [userStreak, setUserStreak] = useState<number>(1);
  const [userLevel, setUserLevel] = useState<number>(1);
  const [userRank, setUserRank] = useState<string>('Scholar');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [selectedBadge, setSelectedBadge] = useState<BadgeDefinition | null>(null);

  const currentUserId = userProfile?.uid || (userProfile as any)?.id || userProfile?.email || 'guest_user';

  // Load all gamification and leaderboard data
  const loadData = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true);
    try {
      if (currentUserId && currentUserId !== 'guest_user') {
        const [xpData, streakData, badgesData] = await Promise.all([
          gamificationService.getUserXP(currentUserId),
          gamificationService.getDailyStreak(currentUserId),
          gamificationService.getUserBadges(currentUserId)
        ]);
        
        const xp = xpData.totalXP;
        const lvl = getLevelFromXP(xp);
        setUserXP(xp);
        setUserLevel(lvl);
        setUserRank(getRankFromLevel(lvl));
        setUserStreak(streakData.currentStreak || 1);
        setUserBadges(badgesData);
      }

      // Fetch Live Leaderboard
      const leaderboardData = await gamificationService.getLeaderboard(50);
      
      // Ensure the logged in user is represented accurately
      const enriched = leaderboardData.map(s => {
        if (s.userId === currentUserId || (userProfile?.email && s.userId === userProfile.email)) {
          return {
            ...s,
            displayName: userProfile?.fullName || s.displayName,
            photoURL: userProfile?.photoURL || s.photoURL,
            totalXP: userXP > 0 ? userXP : s.totalXP,
            streak: userStreak > 0 ? userStreak : s.streak,
            badgesCount: userBadges.length > 0 ? userBadges.length : s.badgesCount,
            level: userLevel,
            rank: userRank,
            isCurrentUser: true
          };
        }
        return s;
      });

      // If current user is not in the list, insert them
      const hasUser = enriched.some(s => s.userId === currentUserId || s.isCurrentUser);
      if (!hasUser && currentUserId !== 'guest_user') {
        enriched.push({
          userId: currentUserId,
          displayName: userProfile?.fullName || userProfile?.username || 'You',
          username: userProfile?.username || '',
          photoURL: userProfile?.photoURL,
          totalXP: userXP,
          streak: userStreak,
          badgesCount: userBadges.length,
          level: userLevel,
          rank: userRank,
          isCurrentUser: true
        });
      }

      // Re-sort
      enriched.sort((a, b) => b.totalXP - a.totalXP);
      setStudents(enriched);
    } catch (err) {
      console.error('Failed to load leaderboard data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();

    // Listen for live XP update events
    const handleXPUpdate = () => {
      loadData();
    };

    window.addEventListener('nexus_xp_updated', handleXPUpdate);
    return () => {
      window.removeEventListener('nexus_xp_updated', handleXPUpdate);
    };
  }, [currentUserId]);

  // Compute Current User Standing
  const userRankIndex = useMemo(() => {
    const idx = students.findIndex(s => s.userId === currentUserId || s.isCurrentUser);
    return idx >= 0 ? idx + 1 : 1;
  }, [students, currentUserId]);

  // XP Progress to next level
  const currentLevelBaseXP = getXPForLevel(userLevel);
  const nextLevelXP = getXPForNextLevel(userLevel);
  const xpInCurrentLevel = Math.max(0, userXP - currentLevelBaseXP);
  const xpNeededForCurrentLevel = Math.max(1, nextLevelXP - currentLevelBaseXP);
  const progressPercent = Math.min(100, Math.round((xpInCurrentLevel / xpNeededForCurrentLevel) * 100));
  const remainingXPToNext = Math.max(0, nextLevelXP - userXP);

  // Top 3 Podium
  const top3 = useMemo(() => {
    return [
      students[0] || null,
      students[1] || null,
      students[2] || null
    ];
  }, [students]);

  // Filtered Students list
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(s => 
      s.displayName.toLowerCase().includes(q) || 
      (s.username && s.username.toLowerCase().includes(q)) ||
      s.rank.toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  // Check if badge is unlocked
  const isBadgeUnlocked = (badgeId: string) => {
    return userBadges.some(b => b.id === badgeId);
  };

  // Badge Progress Calculation
  const getBadgeProgress = (badge: BadgeDefinition) => {
    if (isBadgeUnlocked(badge.id)) {
      return { current: badge.targetCount, target: badge.targetCount, percent: 100 };
    }
    if (badge.id === 'streak_champion') {
      const cur = Math.min(userStreak, badge.targetCount);
      return { current: cur, target: badge.targetCount, percent: Math.round((cur / badge.targetCount) * 100) };
    }
    if (badge.id === 'grand_scholar') {
      const cur = Math.min(userXP, badge.targetCount);
      return { current: cur, target: badge.targetCount, percent: Math.round((cur / badge.targetCount) * 100) };
    }
    if (badge.id === 'first_step' || badge.id === 'speed_scholar') {
      const cur = userXP > 50 ? 1 : 0;
      return { current: cur, target: badge.targetCount, percent: Math.round((cur / badge.targetCount) * 100) };
    }
    return { current: 0, target: badge.targetCount, percent: 0 };
  };

  return (
    <div className="w-full text-slate-100 space-y-4 pb-20 animate-fade-in">
      
      {/* 1. HERO BANNER & HEADER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0c1527] via-[#09101d] to-[#050811] border border-white/10 p-4 sm:p-6 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        {/* Glowing Background Orbs */}
        <div className="absolute top-0 right-1/4 w-56 h-56 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-56 h-56 bg-[#39FF14]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-mono font-bold flex items-center space-x-1">
                <Crown size={11} className="text-amber-400" />
                <span>NEXUS SCHOLAR ARENA</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#39FF14]/10 border border-[#39FF14]/20 text-[#39FF14] text-[10px] font-mono font-bold">
                LIVE
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-sans font-bold text-white tracking-tight flex items-center space-x-2">
              <span>Leaderboard & Rewards</span>
              <span className="text-slate-400 text-sm font-normal hidden xs:inline">/ লিডারবোর্ড ও ব্যাজ</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-lg">
              Compete with fellow scholars across Bangladesh, climb the podium, earn XP by learning, and collect prestigious mastery badges.
            </p>
          </div>

          {/* Quick Refresh Button */}
          <button
            onClick={() => {
              soundFxService.playClick();
              loadData(true);
              if (onShowNotification) onShowNotification('Leaderboard refreshed with latest live scores', 'info');
            }}
            disabled={isRefreshing}
            className="self-start sm:self-center flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all text-xs font-mono font-bold cursor-pointer disabled:opacity-50"
            title="Refresh Leaderboard"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-[#39FF14]' : ''} />
            <span>{isRefreshing ? 'Syncing...' : 'Live Sync'}</span>
          </button>
        </div>

        {/* User Quick Stats Summary Strip */}
        <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-3 gap-2 text-center">
          <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col items-center justify-center">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center space-x-1">
              <Zap size={11} className="text-amber-400" />
              <span>Current XP</span>
            </span>
            <span className="text-base sm:text-lg font-mono font-black text-amber-400 mt-0.5">
              {userXP.toLocaleString()} XP
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col items-center justify-center">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center space-x-1">
              <Flame size={11} className="text-orange-500 fill-orange-500" />
              <span>Daily Streak</span>
            </span>
            <span className="text-base sm:text-lg font-mono font-black text-orange-400 mt-0.5">
              {userStreak} Days 🔥
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col items-center justify-center">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center space-x-1">
              <Shield size={11} className="text-[#39FF14]" />
              <span>Current Level</span>
            </span>
            <span className="text-base sm:text-lg font-mono font-black text-[#39FF14] mt-0.5">
              Level {userLevel} • {userRank}
            </span>
          </div>
        </div>
      </div>

      {/* 2. TAB SWITCHER */}
      <div className="flex items-center justify-between gap-2 p-1.5 rounded-2xl bg-[#0b1220] border border-white/10">
        <div className="flex items-center space-x-1.5 w-full sm:w-auto">
          <button
            onClick={() => {
              soundFxService.playClick();
              setActiveTab('leaderboard');
            }}
            className={`flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'leaderboard'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-lg shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Trophy size={14} />
            <span>Leaderboard / লিডারবোর্ড</span>
          </button>

          <button
            onClick={() => {
              soundFxService.playClick();
              setActiveTab('badges');
            }}
            className={`flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'badges'
                ? 'bg-gradient-to-r from-[#39FF14] to-emerald-500 text-black shadow-lg shadow-[#39FF14]/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Award size={14} />
            <span>Badges & Milestones / ব্যাজ ({userBadges.length}/{BADGE_CATALOG.length})</span>
          </button>
        </div>
      </div>

      {/* TAB CONTENT: 1. LEADERBOARD */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-4 animate-fade-in">
          
          {/* PODIUM TOP 3 CARDS */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end pt-4 pb-2 px-1">
            
            {/* RANK 2 - SILVER 🥈 */}
            <div className="order-1 flex flex-col items-center">
              {top3[1] ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="w-full flex flex-col items-center p-3 rounded-2xl bg-gradient-to-b from-slate-800/80 to-slate-900/90 border border-slate-400/30 shadow-[0_4px_20px_rgba(148,163,184,0.15)] relative"
                >
                  <div className="absolute -top-3.5 px-2.5 py-0.5 rounded-full bg-slate-300 text-slate-950 text-[10px] font-mono font-black shadow-md border border-white">
                    #2 SILVER 🥈
                  </div>
                  
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border-2 border-slate-300/60 overflow-hidden mt-2 bg-slate-800 flex items-center justify-center shadow-inner">
                    {top3[1].photoURL ? (
                      <img src={top3[1].photoURL} alt={top3[1].displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-base sm:text-lg font-bold text-slate-200">
                        {top3[1].displayName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <h3 className="text-[11px] sm:text-xs font-bold text-white mt-2 text-center truncate max-w-full">
                    {top3[1].displayName}
                  </h3>
                  <span className="text-[9px] font-mono text-slate-400 truncate">
                    Level {top3[1].level}
                  </span>

                  <div className="mt-2 w-full pt-1.5 border-t border-white/5 flex items-center justify-center space-x-1">
                    <Zap size={11} className="text-amber-400" />
                    <span className="text-xs font-mono font-black text-amber-300">{top3[1].totalXP.toLocaleString()} XP</span>
                  </div>
                </motion.div>
              ) : (
                <div className="w-full p-4 rounded-2xl bg-white/5 border border-white/5 text-center text-xs text-slate-500">
                  #2 Position Empty
                </div>
              )}
            </div>

            {/* RANK 1 - GOLD 🥇 (Elevated) */}
            <div className="order-2 flex flex-col items-center">
              {top3[0] ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full flex flex-col items-center p-3.5 sm:p-4 rounded-2xl bg-gradient-to-b from-amber-500/25 via-[#1a1708] to-[#0d121f] border-2 border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.3)] relative -translate-y-2"
                >
                  <div className="absolute -top-4 flex items-center space-x-1 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 text-[10px] font-mono font-black shadow-lg border border-yellow-200">
                    <Crown size={12} className="text-slate-950 fill-slate-950 animate-bounce" />
                    <span>#1 CHAMPION 🥇</span>
                  </div>

                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 border-amber-300 overflow-hidden mt-2 bg-amber-950/50 flex items-center justify-center shadow-[0_0_15px_rgba(251,191,36,0.5)]">
                    {top3[0].photoURL ? (
                      <img src={top3[0].photoURL} alt={top3[0].displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-lg sm:text-xl font-black text-amber-300">
                        {top3[0].displayName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <h3 className="text-xs sm:text-sm font-black text-amber-200 mt-2 text-center truncate max-w-full">
                    {top3[0].displayName}
                  </h3>
                  <span className="text-[10px] font-mono text-amber-400/80 truncate">
                    {top3[0].rank} • Lvl {top3[0].level}
                  </span>

                  <div className="mt-2 w-full pt-1.5 border-t border-amber-500/20 flex items-center justify-center space-x-1">
                    <Zap size={13} className="text-amber-400 fill-amber-400" />
                    <span className="text-sm font-mono font-black text-amber-300">{top3[0].totalXP.toLocaleString()} XP</span>
                  </div>
                </motion.div>
              ) : (
                <div className="w-full p-4 rounded-2xl bg-white/5 border border-white/5 text-center text-xs text-slate-500">
                  #1 Position Empty
                </div>
              )}
            </div>

            {/* RANK 3 - BRONZE 🥉 */}
            <div className="order-3 flex flex-col items-center">
              {top3[2] ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="w-full flex flex-col items-center p-3 rounded-2xl bg-gradient-to-b from-amber-900/30 to-slate-900/90 border border-amber-700/40 shadow-[0_4px_20px_rgba(180,83,9,0.15)] relative"
                >
                  <div className="absolute -top-3.5 px-2.5 py-0.5 rounded-full bg-amber-700 text-amber-100 text-[10px] font-mono font-black shadow-md border border-amber-600">
                    #3 BRONZE 🥉
                  </div>

                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border-2 border-amber-600/60 overflow-hidden mt-2 bg-slate-800 flex items-center justify-center shadow-inner">
                    {top3[2].photoURL ? (
                      <img src={top3[2].photoURL} alt={top3[2].displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-base sm:text-lg font-bold text-amber-200">
                        {top3[2].displayName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <h3 className="text-[11px] sm:text-xs font-bold text-white mt-2 text-center truncate max-w-full">
                    {top3[2].displayName}
                  </h3>
                  <span className="text-[9px] font-mono text-slate-400 truncate">
                    Level {top3[2].level}
                  </span>

                  <div className="mt-2 w-full pt-1.5 border-t border-white/5 flex items-center justify-center space-x-1">
                    <Zap size={11} className="text-amber-400" />
                    <span className="text-xs font-mono font-black text-amber-300">{top3[2].totalXP.toLocaleString()} XP</span>
                  </div>
                </motion.div>
              ) : (
                <div className="w-full p-4 rounded-2xl bg-white/5 border border-white/5 text-center text-xs text-slate-500">
                  #3 Position Empty
                </div>
              )}
            </div>

          </div>

          {/* SEARCH & LIVE RANKED TABLE */}
          <div className="rounded-2xl bg-[#090f1d] border border-white/10 overflow-hidden shadow-xl">
            
            {/* Table Header & Search */}
            <div className="p-3 sm:p-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/[0.02]">
              <div className="flex items-center space-x-2">
                <Trophy size={16} className="text-amber-400" />
                <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                  Live Global Rankings
                </h2>
                <span className="text-[10px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded-full">
                  {students.length} Scholars
                </span>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search student by name..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#39FF14]/50 font-sans"
                />
              </div>
            </div>

            {/* Table List */}
            <div className="divide-y divide-white/5 max-h-[550px] overflow-y-auto no-scrollbar">
              {filteredStudents.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No scholars found matching "{searchQuery}".
                </div>
              ) : (
                filteredStudents.map((student, idx) => {
                  const rank = idx + 1;
                  const isCurrent = student.isCurrentUser || student.userId === currentUserId;

                  return (
                    <div
                      key={student.userId || idx}
                      className={`p-3 sm:p-3.5 flex items-center justify-between gap-3 transition-colors ${
                        isCurrent
                          ? 'bg-[#39FF14]/10 border-l-4 border-l-[#39FF14] shadow-[inset_0_0_20px_rgba(57,255,20,0.08)]'
                          : rank <= 3
                          ? 'bg-amber-500/[0.02] hover:bg-white/[0.03]'
                          : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      {/* Left: Rank number & Avatar */}
                      <div className="flex items-center space-x-3 min-w-0">
                        {/* Rank Badge */}
                        <div className="w-7 text-center shrink-0">
                          {rank === 1 ? (
                            <span className="text-base">🥇</span>
                          ) : rank === 2 ? (
                            <span className="text-base">🥈</span>
                          ) : rank === 3 ? (
                            <span className="text-base">🥉</span>
                          ) : (
                            <span className={`text-xs font-mono font-bold ${isCurrent ? 'text-[#39FF14]' : 'text-slate-400'}`}>
                              #{rank}
                            </span>
                          )}
                        </div>

                        {/* Avatar */}
                        <div className={`w-9 h-9 rounded-xl overflow-hidden shrink-0 flex items-center justify-center text-xs font-bold border ${
                          isCurrent
                            ? 'border-[#39FF14] bg-emerald-950 text-[#39FF14]'
                            : 'border-white/10 bg-slate-800 text-slate-300'
                        }`}>
                          {student.photoURL ? (
                            <img src={student.photoURL} alt={student.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <span>{student.displayName.charAt(0).toUpperCase()}</span>
                          )}
                        </div>

                        {/* Name & Details */}
                        <div className="min-w-0">
                          <div className="flex items-center space-x-1.5">
                            <span className={`text-xs sm:text-sm font-semibold truncate ${
                              isCurrent ? 'text-[#39FF14] font-bold' : 'text-white'
                            }`}>
                              {student.displayName}
                            </span>
                            {isCurrent && (
                              <span className="px-1.5 py-0.2 rounded-full bg-[#39FF14] text-black text-[9px] font-mono font-bold shrink-0">
                                YOU
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-400">
                            <span>Level {student.level} • {student.rank}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Streak, Badges & XP */}
                      <div className="flex items-center space-x-2 sm:space-x-4 shrink-0">
                        {/* Streak */}
                        <div className="hidden xs:flex items-center space-x-1 text-orange-400 text-xs font-mono font-bold" title={`${student.streak} Days Continuous Learning Streak`}>
                          <Flame size={13} className="text-orange-500 fill-orange-500" />
                          <span>{student.streak}d</span>
                        </div>

                        {/* Badges count */}
                        <div className="hidden sm:flex items-center space-x-1 text-amber-400 text-xs font-mono font-bold" title={`${student.badgesCount} Badges Unlocked`}>
                          <Award size={13} className="text-amber-400" />
                          <span>{student.badgesCount}</span>
                        </div>

                        {/* XP Points */}
                        <div className="px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-right min-w-[70px]">
                          <span className="text-xs sm:text-sm font-mono font-black text-amber-400 block leading-none">
                            {student.totalXP.toLocaleString()}
                          </span>
                          <span className="text-[8px] font-mono text-slate-400 uppercase tracking-widest block mt-0.5">
                            XP PTS
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* STICKY "MY STANDING" FOOTER CARD */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#0d1c15] via-[#091522] to-[#121226] border-2 border-[#39FF14]/40 shadow-[0_0_25px_rgba(57,255,20,0.15)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-[#39FF14]/15 border border-[#39FF14]/40 flex items-center justify-center text-[#39FF14] shrink-0 font-mono font-black text-sm">
                  #{userRankIndex}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                      My Standing / আমার অবস্থান
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-[#39FF14]/20 text-[#39FF14] text-[9px] font-mono font-bold">
                      {userRank} (Level {userLevel})
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-sans mt-0.5">
                    {remainingXPToNext > 0 ? (
                      <>You need <strong className="text-amber-400 font-mono">{remainingXPToNext} XP</strong> to advance to Level {userLevel + 1}!</>
                    ) : (
                      <>You have reached the maximum rank milestone!</>
                    )}
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full sm:w-60">
                <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                  <span>Level {userLevel} ({currentLevelBaseXP} XP)</span>
                  <span className="text-[#39FF14] font-bold">{progressPercent}%</span>
                  <span>Level {userLevel + 1} ({nextLevelXP} XP)</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden p-0.5 border border-white/10">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full rounded-full bg-gradient-to-r from-[#39FF14] to-amber-400 shadow-[0_0_10px_rgba(57,255,20,0.5)]"
                  />
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB CONTENT: 2. BADGES & MILESTONES */}
      {activeTab === 'badges' && (
        <div className="space-y-4 animate-fade-in">
          
          {/* Badge Summary Header */}
          <div className="p-4 rounded-2xl bg-[#090f1d] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <Award size={16} className="text-[#39FF14]" />
                <span>Scholar Achievement Badges & Milestones</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Unlock prestigious achievements by finishing lessons, scoring 100% on quizzes, maintaining daily streaks, and graduating courses.
              </p>
            </div>

            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 shrink-0">
              <Sparkles size={14} className="text-amber-400" />
              <span className="text-xs font-mono font-bold text-slate-200">
                Unlocked: <strong className="text-[#39FF14]">{userBadges.length}</strong> / {BADGE_CATALOG.length}
              </span>
            </div>
          </div>

          {/* BADGES GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {BADGE_CATALOG.map((badge) => {
              const unlocked = isBadgeUnlocked(badge.id);
              const progress = getBadgeProgress(badge);
              const unlockedInfo = userBadges.find(b => b.id === badge.id);

              return (
                <motion.div
                  key={badge.id}
                  whileHover={{ scale: 1.01 }}
                  onClick={() => setSelectedBadge(badge)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                    unlocked
                      ? 'bg-gradient-to-br from-[#0e1c15] to-[#09121d] border-[#39FF14]/40 shadow-[0_0_20px_rgba(57,255,20,0.12)]'
                      : 'bg-[#090f1d]/60 border-white/5 opacity-75 hover:opacity-100 hover:border-white/20'
                  }`}
                >
                  {/* Glowing Top-Right Tag */}
                  <div className="flex items-start justify-between gap-2">
                    
                    {/* Badge Icon & Content */}
                    <div className="flex items-start space-x-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 border ${
                        unlocked
                          ? 'bg-[#39FF14]/20 border-[#39FF14]/50 shadow-[0_0_15px_rgba(57,255,20,0.3)]'
                          : 'bg-slate-800/80 border-slate-700 text-slate-500 grayscale'
                      }`}>
                        {badge.icon}
                      </div>

                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className={`text-sm font-bold ${unlocked ? 'text-white' : 'text-slate-300'}`}>
                            {badge.title}
                          </h3>
                          <span className="text-xs text-slate-400 font-normal">({badge.titleBn})</span>
                        </div>

                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                          {badge.description}
                        </p>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <div className="shrink-0">
                      {unlocked ? (
                        <span className="px-2 py-0.5 rounded-full bg-[#39FF14]/20 text-[#39FF14] border border-[#39FF14]/40 text-[10px] font-mono font-bold flex items-center space-x-1">
                          <CheckCircle2 size={11} />
                          <span>EARNED</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-mono font-bold flex items-center space-x-1">
                          <Lock size={10} />
                          <span>+{badge.xpReward} XP</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress or Unlock Date */}
                  <div className="mt-3 pt-3 border-t border-white/5">
                    {unlocked ? (
                      <div className="flex items-center justify-between text-[10px] font-mono text-[#39FF14]">
                        <span className="flex items-center space-x-1">
                          <CheckCircle2 size={11} />
                          <span>Unlocked & XP Claimed (+{badge.xpReward} XP)</span>
                        </span>
                        {unlockedInfo?.unlockedAt && (
                          <span className="text-slate-400">
                            {new Date(unlockedInfo.unlockedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                          <span>Requirement Progress</span>
                          <span className="text-amber-400 font-bold">{progress.current} / {progress.target}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden border border-white/5">
                          <div
                            style={{ width: `${progress.percent}%` }}
                            className="h-full rounded-full bg-amber-400"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* HOW TO EARN XP GUIDE CARD */}
          <div className="p-4 rounded-2xl bg-[#090f1d] border border-white/10 space-y-3">
            <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
              <Zap size={14} className="text-amber-400" />
              <span>How to Earn XP & Climb the Leaderboard</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                <div className="flex items-center space-x-1.5 text-[#39FF14] font-mono font-bold">
                  <BookOpen size={13} />
                  <span>+20 XP Per Lesson</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  Finish video lessons, readings, and coding exercises in your enrolled courses.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                <div className="flex items-center space-x-1.5 text-amber-400 font-mono font-bold">
                  <Award size={13} />
                  <span>+50 XP Quiz Completion</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  Pass course assessments and score 100% to unlock the Quiz Master badge.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                <div className="flex items-center space-x-1.5 text-orange-400 font-mono font-bold">
                  <Flame size={13} />
                  <span>+10 XP Daily Login</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  Log in every day to increment your daily streak and earn streak bonuses.
                </p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* BADGE DETAILS MODAL */}
      <AnimatePresence>
        {selectedBadge && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm rounded-2xl bg-[#0d1627] border border-[#39FF14]/30 p-5 shadow-2xl space-y-4 text-center relative"
            >
              <div className="w-16 h-16 rounded-2xl bg-[#39FF14]/15 border border-[#39FF14]/40 mx-auto flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(57,255,20,0.3)]">
                {selectedBadge.icon}
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">{selectedBadge.title}</h3>
                <p className="text-xs text-[#39FF14] font-mono font-semibold">{selectedBadge.titleBn}</p>
                <p className="text-xs text-slate-300 mt-2">{selectedBadge.description}</p>
                <p className="text-xs text-slate-400 font-sans mt-0.5">{selectedBadge.descriptionBn}</p>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">XP Reward:</span>
                <span className="text-amber-400 font-bold">+{selectedBadge.xpReward} XP Points</span>
              </div>

              <button
                onClick={() => setSelectedBadge(null)}
                className="w-full py-2.5 rounded-xl bg-[#39FF14] text-black font-mono font-bold text-xs uppercase tracking-wider hover:bg-[#32e012] transition-colors cursor-pointer"
              >
                Close / বন্ধ করুন
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
