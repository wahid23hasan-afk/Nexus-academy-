import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trophy, Flame, Zap, Target, Star, ShieldCheck, ChevronRight, BookOpen, Clock, Activity, Medal } from 'lucide-react';
import { gamificationService, UserXP, DailyStreak, AchievementBadge, RewardHistory, DailyGoal } from '../services/gamificationService';
import { auth } from '../services/firebase';

interface RewardsViewProps {
  onClose: () => void;
}

export function RewardsView({ onClose }: RewardsViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'achievements' | 'leaderboard' | 'history'>('overview');
  const [xp, setXp] = useState<UserXP | null>(null);
  const [streak, setStreak] = useState<DailyStreak | null>(null);
  const [achievements, setAchievements] = useState<AchievementBadge[]>([]);
  const [history, setHistory] = useState<RewardHistory[]>([]);
  const [goals, setGoals] = useState<DailyGoal[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      if (!auth.currentUser) {
        if (mounted) setLoading(false);
        return;
      }
      const uid = auth.currentUser.uid;
      const [xpData, streakData, achData, histData, goalsData, boardData] = await Promise.all([
        gamificationService.getUserXP(uid),
        gamificationService.getDailyStreak(uid),
        gamificationService.getUserAchievements(uid),
        gamificationService.getRewardHistory(uid),
        gamificationService.getDailyGoals(uid),
        gamificationService.getLeaderboard(10)
      ]);
      if (mounted) {
        setXp(xpData);
        setStreak(streakData);
        setAchievements(achData);
        setHistory(histData);
        setGoals(goalsData);
        setLeaderboard(boardData);
        setLoading(false);
      }
    };
    loadData();
    return () => { mounted = false; };
  }, []);

  const handleClaimGoal = async (goal: DailyGoal) => {
    if (!auth.currentUser || goal.completed) return;
    // Simulate claiming
    // Usually goals update automatically, but for demo we can force complete if they met the target
    // Wait, the progress is updated via gamificationService.updateGoalProgress normally.
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <div className="w-full max-w-4xl h-[85vh] bg-[#0a0f1d] border border-[#39FF14]/20 rounded-3xl flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-12 h-12 border-4 border-[#39FF14]/30 border-t-[#39FF14] rounded-full animate-spin" />
            <p className="text-xs text-[#39FF14] font-mono tracking-widest animate-pulse">LOADING GAMIFICATION DATA...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!xp || !streak) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <div className="bg-slate-900 border border-red-500/30 p-6 rounded-2xl text-center">
          <p className="text-white font-bold mb-4">You need to sign in to view rewards.</p>
          <button onClick={onClose} className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg">Close</button>
        </div>
      </div>
    );
  }

  const xpForCurrentLevel = Math.pow(xp.currentLevel - 1, 2) * 100;
  const xpForNextLevel = Math.pow(xp.currentLevel, 2) * 100;
  const progressPercent = Math.min(100, Math.max(0, ((xp.totalXP - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100));

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 50, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-md"
    >
      <div className="w-full h-[90vh] sm:h-[85vh] max-w-5xl bg-[#0a0f1d] border border-[#39FF14]/20 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(57,255,20,0.1)] flex flex-col relative">
        {/* Header */}
        <div className="h-16 shrink-0 border-b border-white/10 flex items-center justify-between px-6 bg-slate-950/50 backdrop-blur-md relative z-10">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center">
              <Trophy size={16} className="text-orange-500" />
            </div>
            <h2 className="text-sm font-bold text-white flex items-center space-x-2">
              <span>Premium Rewards</span>
              <span className="text-[9px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded uppercase font-mono font-bold tracking-wider">XP System</span>
            </h2>
          </div>
          <button onClick={onClose} className="p-2 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white rounded-lg transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-4 pt-4 space-x-2 border-b border-white/5 overflow-x-auto no-scrollbar shrink-0">
          {[
            { id: 'overview', label: 'Dashboard', icon: Activity },
            { id: 'achievements', label: 'Badges', icon: Medal },
            { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
            { id: 'history', label: 'History', icon: Clock }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 text-xs font-bold font-mono uppercase tracking-wider rounded-t-xl transition-all flex items-center space-x-2 whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-white/10 text-white border-t border-l border-r border-white/10' 
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
              }`}
            >
              <tab.icon size={14} className={activeTab === tab.id ? 'text-[#39FF14]' : ''} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 scroll-smooth">
          <AnimatePresence mode="wait">
            
            {activeTab === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                
                {/* Master Progress Card */}
                <div className="relative rounded-3xl overflow-hidden p-6 sm:p-8 border border-[#39FF14]/20 shadow-[0_0_30px_rgba(57,255,20,0.05)]">
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-950" />
                  <div className="absolute top-0 right-0 w-64 h-64 bg-[#39FF14]/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
                  
                  <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                    {/* Radial Progress */}
                    <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
                      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="4" className="text-white/10" />
                        <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="4" className="text-[#39FF14] transition-all duration-1000" strokeDasharray={`${progressPercent * 2.83} 283`} strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 bg-[#39FF14]/5 rounded-full m-2 border border-[#39FF14]/20 flex items-center justify-center flex-col">
                        <span className="text-xs font-bold text-slate-400 font-mono">LEVEL</span>
                        <span className="text-4xl font-black text-white leading-none">{xp.currentLevel}</span>
                      </div>
                    </div>
                    
                    <div className="flex-1 text-center md:text-left">
                      <div className="inline-flex items-center space-x-2 bg-orange-500/10 border border-orange-500/30 px-3 py-1 rounded-full mb-3">
                        <Star size={12} className="text-orange-400 fill-orange-400" />
                        <span className="text-xs font-bold text-orange-400 uppercase tracking-widest">{xp.rank}</span>
                      </div>
                      <h3 className="text-2xl font-black text-white mb-2">Total XP: <span className="text-[#39FF14] font-mono">{xp.totalXP}</span></h3>
                      <p className="text-sm text-slate-400 font-sans">
                        You need <strong className="text-white">{xpForNextLevel - xp.totalXP} XP</strong> to reach Level {xp.currentLevel + 1}. Keep learning to unlock new perks and badges!
                      </p>
                    </div>
                  </div>
                </div>

                {/* Stats & Streak */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5 relative overflow-hidden group hover:border-orange-500/30 transition-all">
                    <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Flame size={120} className="text-orange-500" />
                    </div>
                    <div className="flex items-center justify-between mb-4 relative z-10">
                      <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                        <Flame size={16} className="text-orange-500" />
                        <span>Daily Streak</span>
                      </h4>
                      <span className="text-xs font-mono text-slate-400 bg-white/10 px-2 py-0.5 rounded">Current</span>
                    </div>
                    <div className="flex items-end space-x-2 relative z-10">
                      <span className="text-4xl font-black text-white font-mono">{streak.currentStreak}</span>
                      <span className="text-sm text-slate-400 font-bold uppercase mb-1">Days</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2 relative z-10 font-sans">
                      Longest streak: <strong className="text-slate-300">{streak.longestStreak} days</strong>. You studied <strong className="text-[#39FF14]">{streak.todayStudyMinutes} mins</strong> today.
                    </p>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5 relative overflow-hidden group hover:border-purple-500/30 transition-all">
                    <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Target size={120} className="text-purple-500" />
                    </div>
                    <div className="flex items-center justify-between mb-4 relative z-10">
                      <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                        <Target size={16} className="text-purple-400" />
                        <span>Learning Points</span>
                      </h4>
                      <span className="text-xs font-mono text-slate-400 bg-white/10 px-2 py-0.5 rounded">Store</span>
                    </div>
                    <div className="flex items-end space-x-2 relative z-10">
                      <span className="text-4xl font-black text-white font-mono">{xp.learningPoints}</span>
                      <span className="text-sm text-slate-400 font-bold uppercase mb-1">Pts</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2 relative z-10 font-sans">
                      Redeem points for discounts and exclusive study materials in the Nexus Store.
                    </p>
                  </div>
                </div>

                {/* Daily Goals */}
                <div>
                  <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-wider font-mono">Today's Daily Goals</h4>
                  <div className="space-y-3">
                    {goals.map((goal) => (
                      <div key={goal.goalId} className={`p-4 rounded-xl border ${goal.completed ? 'bg-[#39FF14]/5 border-[#39FF14]/30' : 'bg-white/5 border-white/10'} flex items-center justify-between`}>
                        <div className="flex items-center space-x-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${goal.completed ? 'bg-[#39FF14]/20 text-[#39FF14]' : 'bg-slate-800 text-slate-400'}`}>
                            {goal.completed ? <ShieldCheck size={18} /> : <BookOpen size={18} />}
                          </div>
                          <div>
                            <p className={`text-sm font-bold ${goal.completed ? 'text-[#39FF14]' : 'text-slate-200'}`}>{goal.title}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="text-xs text-orange-400 font-bold font-mono">+{goal.xpReward} XP</span>
                              <span className="text-[10px] text-slate-500">•</span>
                              <span className="text-[10px] text-slate-500 font-mono">{goal.progress} / {goal.target}</span>
                            </div>
                          </div>
                        </div>
                        {goal.completed ? (
                          <div className="px-3 py-1 rounded bg-[#39FF14]/10 text-[#39FF14] text-[10px] font-bold uppercase tracking-wider">
                            Completed
                          </div>
                        ) : (
                          <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(goal.progress / goal.target) * 100}%` }} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

              </motion.div>
            )}

            {activeTab === 'achievements' && (
              <motion.div key="achievements" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {achievements.length === 0 ? (
                    <div className="col-span-full py-12 text-center border border-dashed border-white/10 rounded-2xl">
                      <Medal size={32} className="text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400 text-sm font-sans">No badges unlocked yet.<br/>Keep learning to earn your first badge!</p>
                    </div>
                  ) : (
                    achievements.map((ach) => (
                      <div key={ach.achievementId} className="bg-gradient-to-b from-white/10 to-white/5 border border-white/10 rounded-2xl p-5 text-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-[#39FF14]/0 group-hover:bg-[#39FF14]/5 transition-colors" />
                        <div className="text-4xl mb-3 relative z-10">{ach.icon || '🏅'}</div>
                        <h4 className="text-sm font-bold text-white mb-1 relative z-10">{ach.title}</h4>
                        <p className="text-xs text-slate-400 font-sans relative z-10">{ach.description}</p>
                        <div className="mt-4 text-[9px] font-mono text-slate-500 uppercase tracking-wider relative z-10 bg-black/30 py-1 px-2 rounded-full inline-block">
                          Unlocked: {new Date(ach.unlockedAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'leaderboard' && (
              <motion.div key="leaderboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                  <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/10 bg-black/20 text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                    <div className="col-span-2 text-center">Rank</div>
                    <div className="col-span-5">Scholar</div>
                    <div className="col-span-2 text-center">Level</div>
                    <div className="col-span-3 text-right">Total XP</div>
                  </div>
                  {leaderboard.map((user, idx) => (
                    <div key={user.userId} className={`grid grid-cols-12 gap-4 p-4 items-center border-b border-white/5 hover:bg-white/[0.02] transition-colors ${user.userId === auth.currentUser?.uid ? 'bg-[#39FF14]/5 border-l-2 border-l-[#39FF14]' : ''}`}>
                      <div className="col-span-2 flex justify-center">
                        {idx === 0 ? <Trophy size={18} className="text-yellow-400" /> :
                         idx === 1 ? <Trophy size={18} className="text-slate-300" /> :
                         idx === 2 ? <Trophy size={18} className="text-amber-600" /> :
                         <span className="text-slate-500 font-mono text-sm font-bold">#{idx + 1}</span>}
                      </div>
                      <div className="col-span-5 font-bold text-sm text-slate-200 truncate">
                        {user.userId === auth.currentUser?.uid ? 'You' : `Scholar_${user.userId.substring(0,4)}`}
                      </div>
                      <div className="col-span-2 text-center">
                        <span className="bg-white/10 text-slate-300 text-[10px] px-2 py-1 rounded font-mono font-bold">{user.currentLevel}</span>
                      </div>
                      <div className="col-span-3 text-right font-mono font-bold text-[#39FF14]">
                        {user.totalXP}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="space-y-3">
                  {history.length === 0 ? (
                    <div className="py-12 text-center">
                      <Clock size={32} className="text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400 text-sm font-sans">No reward history yet.</p>
                    </div>
                  ) : (
                    history.map((item) => (
                      <div key={item.historyId} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:border-white/20 transition-colors">
                        <div className="flex items-center space-x-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${item.type === 'badge' ? 'bg-orange-500/20 text-orange-400' : 'bg-[#39FF14]/20 text-[#39FF14]'}`}>
                            {item.type === 'badge' ? <Medal size={16} /> : <Zap size={16} />}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-200">{item.description}</p>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">{new Date(item.createdAt).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`font-mono font-bold ${item.type === 'badge' ? 'text-orange-400' : 'text-[#39FF14]'}`}>
                            +{item.amount} XP
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
