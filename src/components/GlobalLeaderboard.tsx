import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Crown, Flame, Zap, Award, Sparkles, TrendingUp, RefreshCw, ChevronRight, UserCheck, Star, Shield } from 'lucide-react';
import { gamificationService } from '../services/gamificationService';

export interface GlobalLeaderboardProps {
  userId: string;
  userXP: number;
  userName?: string;
  userProfile?: { fullName?: string; username?: string; photoURL?: string } | null;
  onOpenLeague?: () => void;
  onOpenRewards?: () => void;
}

interface LeaderboardEntry {
  userId: string;
  displayName: string;
  totalXP: number;
  currentLevel?: number;
  rank?: string;
  isCurrentUser?: boolean;
  avatarUrl?: string;
}

export function GlobalLeaderboard({
  userId,
  userXP,
  userName,
  userProfile,
  onOpenLeague,
  onOpenRewards
}: GlobalLeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>('Just now');

  const effectiveUserName = userName || userProfile?.fullName || userProfile?.username || 'You (Scholar)';

  const fetchLeaderboard = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const data = await gamificationService.getLeaderboard(25);
      let board: LeaderboardEntry[] = [];

      if (data && data.length > 0) {
        board = data.map((item) => ({
          userId: item.userId,
          displayName: item.displayName || 'Scholar',
          totalXP: Number(item.totalXP) || 0,
          currentLevel: item.level || Math.max(1, Math.floor((item.totalXP || 0) / 100) + 1),
          rank: item.rank || 'Scholar'
        }));
      } else {
        // High quality fallback starter champions
        board = [
          { userId: 'mock_1', displayName: 'Arafat Rahman', totalXP: 1690, currentLevel: 17, rank: 'Master' },
          { userId: 'mock_2', displayName: 'Tanvir Hasan', totalXP: 820, currentLevel: 9, rank: 'Diamond' },
          { userId: 'mock_3', displayName: 'Nusrat Jahan', totalXP: 615, currentLevel: 7, rank: 'Platinum' },
          { userId: 'mock_4', displayName: 'Samiul Islam', totalXP: 440, currentLevel: 5, rank: 'Gold' },
          { userId: 'mock_5', displayName: 'Farhana Akter', totalXP: 310, currentLevel: 4, rank: 'Silver' },
          { userId: 'mock_6', displayName: 'Mahmudul Karim', totalXP: 250, currentLevel: 3, rank: 'Silver' },
          { userId: 'mock_7', displayName: 'Sadia Sultana', totalXP: 180, currentLevel: 2, rank: 'Bronze' },
          { userId: 'mock_8', displayName: 'Rayhan Ahmed', totalXP: 120, currentLevel: 2, rank: 'Bronze' },
          { userId: 'mock_9', displayName: 'Tasnim Zahra', totalXP: 85, currentLevel: 1, rank: 'Novice' }
        ];
      }

      // Merge current user with live userXP
      const existingUserIdx = board.findIndex(
        (u) => u.userId === userId || (userId && u.userId?.includes(userId))
      );

      if (existingUserIdx !== -1) {
        board[existingUserIdx] = {
          ...board[existingUserIdx],
          displayName: board[existingUserIdx].displayName || effectiveUserName,
          totalXP: Math.max(board[existingUserIdx].totalXP, userXP),
          currentLevel: Math.max(1, Math.floor(Math.max(board[existingUserIdx].totalXP, userXP) / 100) + 1),
          isCurrentUser: true
        };
      } else {
        board.push({
          userId: userId || 'current_user',
          displayName: effectiveUserName,
          totalXP: userXP,
          currentLevel: Math.max(1, Math.floor(userXP / 100) + 1),
          rank: 'Scholar',
          isCurrentUser: true
        });
      }

      // Sort descending by totalXP
      board.sort((a, b) => b.totalXP - a.totalXP);

      setLeaderboard(board);
      setLastUpdatedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (e) {
      console.warn("Failed to fetch global leaderboard:", e);
    } finally {
      setLoading(false);
      if (isManualRefresh) setRefreshing(false);
    }
  }, [userId, userXP, effectiveUserName]);

  useEffect(() => {
    fetchLeaderboard();

    // Listen for custom app gamification events
    const handleXPUpdate = () => {
      fetchLeaderboard();
    };
    window.addEventListener('nexus_store_purchase_updated', handleXPUpdate);
    window.addEventListener('nexus_xp_updated', handleXPUpdate);

    return () => {
      window.removeEventListener('nexus_store_purchase_updated', handleXPUpdate);
      window.removeEventListener('nexus_xp_updated', handleXPUpdate);
    };
  }, [fetchLeaderboard]);

  // Derived rank and statistics
  const { top10List, currentUserRank, isUserInTop10, tenthPlaceXP, xpNeededForTop10 } = useMemo(() => {
    const top10 = leaderboard.slice(0, 10);
    const userIndex = leaderboard.findIndex((u) => u.isCurrentUser || u.userId === userId);
    const rank = userIndex !== -1 ? userIndex + 1 : 1;
    const inTop10 = rank <= 10;
    const tenthXP = top10.length >= 10 ? top10[9].totalXP : (top10[top10.length - 1]?.totalXP || 0);
    const diff = !inTop10 ? Math.max(1, (tenthXP - userXP) + 10) : 0;

    return {
      top10List: top10,
      currentUserRank: rank,
      isUserInTop10: inTop10,
      tenthPlaceXP: tenthXP,
      xpNeededForTop10: diff
    };
  }, [leaderboard, userId, userXP]);

  const top3 = top10List.slice(0, 3);
  const restOfTop10 = top10List.slice(3, 10);

  return (
    <section className="my-6 px-1 relative">
      <div className="relative rounded-3xl bg-[#090e1a]/90 border border-white/10 p-4 sm:p-6 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden">
        
        {/* Background Ambient Glows */}
        <div className="absolute top-0 right-1/4 w-72 h-40 bg-[#39FF14]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-60 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Section Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-3 border-b border-white/5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#39FF14]/20 to-emerald-500/10 border border-[#39FF14]/40 flex items-center justify-center shadow-[0_0_15px_rgba(57,255,20,0.2)]">
              <Trophy size={20} className="text-[#39FF14]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#39FF14] bg-[#39FF14]/10 px-2 py-0.5 rounded-full border border-[#39FF14]/20">
                  Global Leaderboard
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Updated {lastUpdatedTime}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight mt-0.5 flex items-center gap-1.5">
                <span>Top 10 XP Scholars</span>
                <Sparkles size={14} className="text-amber-400" />
              </h3>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => fetchLeaderboard(true)}
              disabled={refreshing}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer disabled:opacity-50"
              title="Refresh Leaderboard"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin text-[#39FF14]' : ''} />
            </button>
            {onOpenLeague && (
              <button
                onClick={onOpenLeague}
                className="px-3 py-1.5 rounded-xl bg-[#39FF14]/10 hover:bg-[#39FF14]/20 border border-[#39FF14]/30 text-[#39FF14] text-xs font-mono font-bold transition-all cursor-pointer flex items-center space-x-1"
              >
                <span>League Podium</span>
                <ChevronRight size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Current User Standing Card (Highlighted banner) */}
        <div className="mb-5 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-[#39FF14]/15 via-emerald-950/40 to-[#0a1020] border border-[#39FF14]/40 shadow-[0_0_20px_rgba(57,255,20,0.12)] flex items-center justify-between relative overflow-hidden">
          <div className="flex items-center space-x-3 min-w-0">
            {/* Rank badge */}
            <div className="w-11 h-11 rounded-xl bg-slate-950 border-2 border-[#39FF14] flex flex-col items-center justify-center shadow-[0_0_12px_rgba(57,255,20,0.3)] shrink-0">
              <span className="text-[8px] font-mono text-slate-400 font-bold uppercase leading-none">RANK</span>
              <span className="text-base font-mono font-black text-[#39FF14]">#{currentUserRank}</span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center space-x-1.5 flex-wrap">
                <span className="text-xs sm:text-sm font-bold text-white truncate max-w-[140px] sm:max-w-[200px]">
                  {effectiveUserName}
                </span>
                <span className="bg-[#39FF14] text-slate-950 text-[9px] font-mono font-black px-1.5 py-0.2 rounded shadow-sm">
                  YOU
                </span>
                {isUserInTop10 && (
                  <span className="bg-amber-400 text-slate-950 text-[8px] font-mono font-bold px-1.5 py-0.2 rounded">
                    TOP 10 ELITE
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-300 font-mono mt-0.5 flex items-center">
                {currentUserRank === 1 ? (
                  <span className="text-amber-300 font-bold flex items-center">
                    <Crown size={11} className="mr-1 text-amber-400" /> Rank #1 Grandmaster Champion!
                  </span>
                ) : currentUserRank <= 3 ? (
                  <span className="text-emerald-300 font-bold flex items-center">
                    <Sparkles size={11} className="mr-1 text-[#39FF14]" /> In Top 3 Podium! Keep defending!
                  </span>
                ) : currentUserRank <= 10 ? (
                  <span className="text-[#39FF14] font-bold flex items-center">
                    <TrendingUp size={11} className="mr-1" /> Inside Global Top 10 Leaderboard!
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center">
                    <Zap size={11} className="mr-1" /> {xpNeededForTop10} XP needed to break into Top 10
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0 pl-2">
            <div className="text-sm sm:text-base font-mono font-black text-[#39FF14]">{userXP} XP</div>
            <div className="text-[9px] text-slate-400 font-mono">
              Lvl {Math.max(1, Math.floor(userXP / 100) + 1)} Scholar
            </div>
          </div>
        </div>

        {/* Podium Area for Top 3 */}
        {loading ? (
          <div className="h-44 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-[#39FF14] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="flex items-end justify-center space-x-1.5 sm:space-x-4 pt-5 pb-3 mb-4 border-b border-white/5 w-full">
              {/* 2nd Place */}
              {top3[1] && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  className={`flex flex-col items-center flex-1 min-w-0 max-w-[105px] xs:max-w-[120px] sm:max-w-[135px] transition-all relative ${
                    top3[1].isCurrentUser || top3[1].userId === userId
                      ? 'p-1 sm:p-1.5 rounded-2xl bg-[#39FF14]/10 border border-[#39FF14] shadow-[0_0_15px_rgba(57,255,20,0.25)]'
                      : ''
                  }`}
                >
                  {(top3[1].isCurrentUser || top3[1].userId === userId) && (
                    <div className="absolute -top-3.5 bg-[#39FF14] text-black text-[8px] font-mono font-black px-1.5 py-0.2 rounded-full shadow-md z-10 whitespace-nowrap">
                      YOU
                    </div>
                  )}
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-800 border-2 border-slate-300 flex items-center justify-center font-black text-sm text-white shadow-lg mb-1 relative shrink-0">
                    🥈
                    <span className="absolute -bottom-1 -right-1 px-1 py-0.2 bg-slate-900 text-[8px] font-mono text-slate-200 rounded border border-slate-500 whitespace-nowrap">
                      2nd
                    </span>
                  </div>
                  <span
                    className={`text-[11px] sm:text-xs font-bold truncate w-full text-center px-0.5 ${
                      top3[1].isCurrentUser || top3[1].userId === userId ? 'text-[#39FF14]' : 'text-white'
                    }`}
                    title={top3[1].displayName}
                  >
                    {top3[1].displayName}
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-mono font-bold text-amber-400 whitespace-nowrap">{top3[1].totalXP.toLocaleString()} XP</span>
                  <div className="w-full h-14 sm:h-16 bg-gradient-to-t from-slate-800 to-slate-700/60 rounded-t-xl mt-1.5 border-t-2 border-slate-400 flex items-center justify-center text-base sm:text-xl font-black text-slate-400">
                    2
                  </div>
                </motion.div>
              )}

              {/* 1st Place */}
              {top3[0] && (
                <motion.div
                  initial={{ opacity: 0, y: 25, scale: 0.85 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.45, delay: 0.02 }}
                  className={`flex flex-col items-center flex-1 min-w-0 max-w-[115px] xs:max-w-[130px] sm:max-w-[150px] -mt-5 transition-all relative ${
                    top3[0].isCurrentUser || top3[0].userId === userId
                      ? 'p-1 sm:p-1.5 rounded-2xl bg-amber-500/15 border-2 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.35)]'
                      : ''
                  }`}
                >
                  <Crown size={20} className="text-amber-400 animate-bounce mb-0.5" />
                  {(top3[0].isCurrentUser || top3[0].userId === userId) && (
                    <div className="absolute -top-3.5 bg-amber-400 text-black text-[8px] font-mono font-black px-2 py-0.2 rounded-full shadow-md z-10 whitespace-nowrap">
                      YOU 👑
                    </div>
                  )}
                  <div className="w-13 h-13 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 border-2 border-amber-300 flex items-center justify-center font-black text-lg sm:text-xl text-black shadow-[0_0_25px_rgba(245,158,11,0.5)] mb-1 relative shrink-0">
                    🥇
                    <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 bg-black text-[8px] sm:text-[9px] font-mono text-amber-400 font-bold rounded-full border border-amber-400 whitespace-nowrap">
                      1st
                    </span>
                  </div>
                  <span className="text-[11px] sm:text-xs font-black text-amber-300 truncate w-full text-center px-0.5" title={top3[0].displayName}>
                    {top3[0].displayName}
                  </span>
                  <span className="text-[10px] sm:text-xs font-mono font-black text-[#39FF14] whitespace-nowrap">{top3[0].totalXP.toLocaleString()} XP</span>
                  <div className="w-full h-20 sm:h-24 bg-gradient-to-t from-amber-600/40 via-amber-500/30 to-yellow-400/20 rounded-t-xl mt-1.5 border-t-2 border-amber-400 flex items-center justify-center text-lg sm:text-2xl font-black text-amber-400 shadow-lg">
                    1
                  </div>
                </motion.div>
              )}

              {/* 3rd Place */}
              {top3[2] && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.18 }}
                  className={`flex flex-col items-center flex-1 min-w-0 max-w-[105px] xs:max-w-[120px] sm:max-w-[135px] transition-all relative ${
                    top3[2].isCurrentUser || top3[2].userId === userId
                      ? 'p-1 sm:p-1.5 rounded-2xl bg-[#39FF14]/10 border border-[#39FF14] shadow-[0_0_15px_rgba(57,255,20,0.25)]'
                      : ''
                  }`}
                >
                  {(top3[2].isCurrentUser || top3[2].userId === userId) && (
                    <div className="absolute -top-3.5 bg-[#39FF14] text-black text-[8px] font-mono font-black px-1.5 py-0.2 rounded-full shadow-md z-10 whitespace-nowrap">
                      YOU
                    </div>
                  )}
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-amber-900/80 border-2 border-amber-600 flex items-center justify-center font-black text-sm text-white shadow-lg mb-1 relative shrink-0">
                    🥉
                    <span className="absolute -bottom-1 -right-1 px-1 py-0.2 bg-amber-950 text-[8px] font-mono text-amber-400 rounded border border-amber-700 whitespace-nowrap">
                      3rd
                    </span>
                  </div>
                  <span
                    className={`text-[11px] sm:text-xs font-bold truncate w-full text-center px-0.5 ${
                      top3[2].isCurrentUser || top3[2].userId === userId ? 'text-[#39FF14]' : 'text-white'
                    }`}
                    title={top3[2].displayName}
                  >
                    {top3[2].displayName}
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-mono font-bold text-amber-400 whitespace-nowrap">{top3[2].totalXP.toLocaleString()} XP</span>
                  <div className="w-full h-11 sm:h-12 bg-gradient-to-t from-amber-950 to-amber-900/60 rounded-t-xl mt-1.5 border-t-2 border-amber-600 flex items-center justify-center text-base sm:text-xl font-black text-amber-600">
                    3
                  </div>
                </motion.div>
              )}
            </div>

            {/* Rows #4 to #10 with staggered entrance */}
            <div className="space-y-1.5">
              {restOfTop10.map((entry, idx) => {
                const rankNum = idx + 4;
                const isCurrent = entry.isCurrentUser || entry.userId === userId;

                return (
                  <motion.div
                    key={entry.userId || idx}
                    initial={{ opacity: 0, y: 12, x: -6 }}
                    animate={{ opacity: 1, y: 0, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 + idx * 0.04 }}
                    className={`px-3.5 py-2.5 rounded-xl border flex items-center justify-between transition-all ${
                      isCurrent
                        ? 'bg-[#39FF14]/15 border-[#39FF14] shadow-[0_0_15px_rgba(57,255,20,0.25)]'
                        : 'bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      {/* Rank Position */}
                      <span
                        className={`w-6 font-mono font-bold text-xs text-center ${
                          isCurrent ? 'text-[#39FF14]' : rankNum <= 5 ? 'text-amber-400' : 'text-slate-500'
                        }`}
                      >
                        #{rankNum}
                      </span>

                      {/* Level Chip */}
                      <span className="text-[9px] font-mono font-semibold bg-white/5 border border-white/5 px-1.5 py-0.5 rounded text-slate-400">
                        Lvl {entry.currentLevel || 1}
                      </span>

                      {/* Name */}
                      <div className="flex items-center space-x-1.5 min-w-0">
                        <span
                          className={`text-xs font-bold truncate ${
                            isCurrent ? 'text-[#39FF14]' : 'text-slate-200'
                          }`}
                        >
                          {entry.displayName}
                        </span>
                        {isCurrent && (
                          <span className="bg-[#39FF14] text-slate-950 text-[8px] font-mono font-black px-1.5 py-0.2 rounded shrink-0">
                            YOU
                          </span>
                        )}
                      </div>
                    </div>

                    {/* XP Score */}
                    <div className="flex items-center space-x-1.5 shrink-0 pl-2">
                      <Zap size={11} className={isCurrent ? 'text-[#39FF14]' : 'text-amber-400'} />
                      <span className="text-xs font-mono font-black text-[#39FF14]">
                        {entry.totalXP.toLocaleString()} XP
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}

        {/* Bottom CTA bar */}
        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-400">
          <span className="flex items-center space-x-1">
            <Flame size={12} className="text-orange-400" />
            <span>Earn XP by watching lessons, solving quizzes & daily streaks</span>
          </span>
          {onOpenRewards && (
            <button
              onClick={onOpenRewards}
              className="text-[#39FF14] hover:underline font-bold cursor-pointer shrink-0 ml-2"
            >
              XP Store & Rewards →
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
