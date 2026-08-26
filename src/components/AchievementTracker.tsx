import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  GraduationCap, 
  Flame, 
  Zap, 
  BookOpen, 
  CheckCircle2, 
  Sparkles, 
  Award, 
  Lock, 
  ChevronRight, 
  Star,
  Brain,
  Layers,
  X,
  Target,
  Clock,
  Share2,
  Copy,
  Check
} from 'lucide-react';
import { CourseProgressInfo, LessonProgressInfo } from '../services/progressService';
import { gamificationService, UserXP, DailyStreak, AchievementBadge } from '../services/gamificationService';
import { soundFxService } from '../services/soundFxService';
import { auth, db } from '../services/firebase';
import { Course } from '../types/course';
import { collection, onSnapshot, query } from 'firebase/firestore';
import * as LucideIcons from 'lucide-react';

export interface AchievementItem {
  id: string;
  title: string;
  category: 'course' | 'lesson' | 'streak' | 'enrollment' | 'xp' | 'mastery' | string;
  description: string;
  requirement: string;
  icon: React.ReactNode;
  accentColor: string;
  glowColor: string;
  xpReward: number;
  isUnlocked: boolean;
  progressPercent: number; // 0 to 100
  currentValue: number;
  targetValue: number;
  valueUnit: string;
  unlockedDate?: string;
}

const renderLucideIcon = (iconName: string, className?: string, size = 16) => {
  if (!iconName) return React.createElement(LucideIcons.Award, { className, size });
  
  // Try matching direct or capitalized icon name
  const IconComponent = (LucideIcons as any)[iconName] || 
                        (LucideIcons as any)[iconName.charAt(0).toUpperCase() + iconName.slice(1)] || 
                        LucideIcons.Award;
  return React.createElement(IconComponent, { className, size });
};

interface AchievementTrackerProps {
  userProfile: any;
  courses: Course[];
  enrolledCourseIds: string[];
  userCourseProgressMap: Record<string, CourseProgressInfo>;
  userLessonProgressMap: Record<string, LessonProgressInfo[]>;
  onShowNotification?: (message: string, type: 'success' | 'info' | 'warning' | 'error') => void;
  onOpenCourse?: (course: Course) => void;
}

export function AchievementTracker({
  userProfile,
  courses,
  enrolledCourseIds,
  userCourseProgressMap,
  userLessonProgressMap,
  onShowNotification,
  onOpenCourse
}: AchievementTrackerProps) {
  const [selectedBadge, setSelectedBadge] = useState<AchievementItem | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [userXP, setUserXP] = useState<UserXP | null>(null);
  const [streak, setStreak] = useState<DailyStreak | null>(null);

  useEffect(() => {
    if (selectedBadge) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedBadge]);
  const [remoteAchievements, setRemoteAchievements] = useState<AchievementBadge[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [dbMilestones, setDbMilestones] = useState<any[]>([]);

  const userId = auth.currentUser?.uid || userProfile?.uid || userProfile?.username || 'guest';

  // Real-time listener for achievement badges / milestones
  useEffect(() => {
    try {
      const q = query(collection(db, 'milestones'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const milestonesList: any[] = [];
        snapshot.forEach((docSnap) => {
          milestonesList.push({ id: docSnap.id, ...docSnap.data() });
        });
        setDbMilestones(milestonesList);
      }, (error) => {
        console.warn('Real-time milestones snapshot error:', error);
      });
      return unsubscribe;
    } catch (err) {
      console.warn('Failed to listen to milestones:', err);
    }
  }, []);

  // Fetch live XP, streak and achievements
  useEffect(() => {
    let isMounted = true;
    const fetchGamification = async () => {
      if (!auth.currentUser && !userProfile) return;
      try {
        const [xpData, streakData, achData] = await Promise.all([
          gamificationService.getUserXP(userId),
          gamificationService.getDailyStreak(userId),
          gamificationService.getUserAchievements(userId)
        ]);
        if (isMounted) {
          setUserXP(xpData);
          setStreak(streakData);
          setRemoteAchievements(achData);
        }
      } catch (err) {
        console.warn('Silent achievement gamification fetch error:', err);
      }
    };

    fetchGamification();
    return () => {
      isMounted = false;
    };
  }, [userId, userProfile]);

  // Handle sharing formatted achievement summary
  const handleShareAchievement = async (badge: AchievementItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const formattedSummary = `🎓 Nexus Academy Milestone Achievement!
━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 Badge: ${badge.title} (${badge.category.toUpperCase()})
📌 Requirement: ${badge.requirement}
⚡ Status: ${badge.isUnlocked ? `Unlocked (+${badge.xpReward} XP Earned)` : `In Progress (${Math.round(badge.progressPercent)}%)`}
📝 Description: ${badge.description}
━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 Learn & Excel on Nexus Academy`;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(formattedSummary);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = formattedSummary;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      setCopiedId(badge.id);
      onShowNotification?.(`Copied "${badge.title}" summary to clipboard!`, 'success');
      setTimeout(() => {
        setCopiedId((prev) => (prev === badge.id ? null : prev));
      }, 2500);
    } catch (err) {
      console.warn('Clipboard copy error:', err);
      onShowNotification?.('Failed to copy to clipboard', 'error');
    }
  };

  // Compute calculated metrics
  const metrics = useMemo(() => {
    // 1. Total completed courses (progress == 100%)
    let completedCoursesCount = 0;
    let maxCourseProgress = 0;
    Object.values(userCourseProgressMap).forEach((prog) => {
      if (prog && prog.progressPercent >= 100) {
        completedCoursesCount++;
      }
      if (prog && prog.progressPercent > maxCourseProgress) {
        maxCourseProgress = prog.progressPercent;
      }
    });

    // 2. Total completed lessons across all courses
    let totalCompletedLessons = 0;
    Object.values(userLessonProgressMap).forEach((lessons) => {
      if (Array.isArray(lessons)) {
        totalCompletedLessons += lessons.filter((l) => l.completed || l.watchedPercentage >= 90).length;
      }
    });

    // 3. Enrolled count
    const totalEnrolled = enrolledCourseIds.length;

    // 4. Daily Streak
    const currentStreakDays = streak?.currentStreak || 0;

    // 5. Total XP
    const totalXP = userXP?.totalXP || 0;

    return {
      completedCoursesCount,
      maxCourseProgress,
      totalCompletedLessons,
      totalEnrolled,
      currentStreakDays,
      totalXP
    };
  }, [userCourseProgressMap, userLessonProgressMap, enrolledCourseIds, streak, userXP]);

  const { quizzesPassedCount, maxQuizScore } = useMemo(() => {
    try {
      const resultsKey = `nexus_quiz_all_results_${userId}`;
      const allResults = JSON.parse(localStorage.getItem(resultsKey) || '[]');
      const quizzesPassedCount = allResults.filter((r: any) => r.passed).length;
      let maxScore = 0;
      allResults.forEach((r: any) => {
        if (r.percentage > maxScore) {
          maxScore = r.percentage;
        }
      });
      return { quizzesPassedCount, maxQuizScore: maxScore };
    } catch (e) {
      return { quizzesPassedCount: 0, maxQuizScore: 0 };
    }
  }, [userId]);

  // Define dynamic achievements list
  const achievements: AchievementItem[] = useMemo(() => {
    if (!dbMilestones || dbMilestones.length === 0) {
      const list: AchievementItem[] = [
        {
          id: 'first_lesson',
          title: 'First Step',
          category: 'lesson',
          description: 'Completed your very first video lesson in any enrolled course.',
          requirement: 'Complete 1 lesson',
          icon: <Zap size={16} className="text-amber-400" />,
          accentColor: '#F59E0B',
          glowColor: 'rgba(245, 158, 11, 0.4)',
          xpReward: 30,
          isUnlocked: metrics.totalCompletedLessons >= 1,
          progressPercent: Math.min(100, (metrics.totalCompletedLessons / 1) * 100),
          currentValue: metrics.totalCompletedLessons,
          targetValue: 1,
          valueUnit: 'lesson'
        },
        {
          id: 'halfway_hero',
          title: 'Halfway Hero',
          category: 'course',
          description: 'Reached 50% completion or more in an academic course curriculum.',
          requirement: 'Reach 50% course progress',
          icon: <Target size={16} className="text-cyan-400" />,
          accentColor: '#00F0FF',
          glowColor: 'rgba(0, 240, 255, 0.4)',
          xpReward: 60,
          isUnlocked: metrics.maxCourseProgress >= 50,
          progressPercent: Math.min(100, (metrics.maxCourseProgress / 50) * 100),
          currentValue: Math.min(50, Math.round(metrics.maxCourseProgress)),
          targetValue: 50,
          valueUnit: '%'
        },
        {
          id: 'course_completed_1',
          title: 'Mastery Graduate',
          category: 'mastery',
          description: 'Successfully completed 100% of all lessons in an academic course.',
          requirement: 'Complete 1 full course',
          icon: <GraduationCap size={16} className="text-[#39FF14]" />,
          accentColor: '#39FF14',
          glowColor: 'rgba(57, 255, 20, 0.45)',
          xpReward: 150,
          isUnlocked: metrics.completedCoursesCount >= 1,
          progressPercent: Math.min(100, (metrics.completedCoursesCount / 1) * 100),
          currentValue: metrics.completedCoursesCount,
          targetValue: 1,
          valueUnit: 'course'
        },
        {
          id: 'daily_scholar',
          title: 'Study Flame',
          category: 'streak',
          description: 'Maintained a consecutive study streak of 3 active learning days.',
          requirement: '3-day learning streak',
          icon: <Flame size={16} className="text-orange-500" />,
          accentColor: '#F97316',
          glowColor: 'rgba(249, 115, 22, 0.4)',
          xpReward: 50,
          isUnlocked: metrics.currentStreakDays >= 3,
          progressPercent: Math.min(100, (metrics.currentStreakDays / 3) * 100),
          currentValue: metrics.currentStreakDays,
          targetValue: 3,
          valueUnit: 'days'
        },
        {
          id: 'curator_enrolled',
          title: 'Knowledge Seeker',
          category: 'enrollment',
          description: 'Enrolled in 2 or more diverse course specializations.',
          requirement: 'Enroll in 2 courses',
          icon: <BookOpen size={16} className="text-purple-400" />,
          accentColor: '#A855F7',
          glowColor: 'rgba(168, 85, 247, 0.4)',
          xpReward: 40,
          isUnlocked: metrics.totalEnrolled >= 2,
          progressPercent: Math.min(100, (metrics.totalEnrolled / 2) * 100),
          currentValue: metrics.totalEnrolled,
          targetValue: 2,
          valueUnit: 'courses'
        },
        {
          id: 'lesson_master_5',
          title: 'Speed Learner',
          category: 'lesson',
          description: 'Completed 5 total lessons across your study curriculums.',
          requirement: 'Complete 5 lessons',
          icon: <Sparkles size={16} className="text-emerald-400" />,
          accentColor: '#10B981',
          glowColor: 'rgba(16, 185, 129, 0.4)',
          xpReward: 80,
          isUnlocked: metrics.totalCompletedLessons >= 5,
          progressPercent: Math.min(100, (metrics.totalCompletedLessons / 5) * 100),
          currentValue: metrics.totalCompletedLessons,
          targetValue: 5,
          valueUnit: 'lessons'
        },
        {
          id: 'century_xp',
          title: 'Century Pioneer',
          category: 'xp',
          description: 'Accumulated over 100 XP through quizzes, lessons, and streaks.',
          requirement: 'Earn 100+ Total XP',
          icon: <Star size={16} className="text-yellow-400" />,
          accentColor: '#EAB308',
          glowColor: 'rgba(234, 179, 8, 0.4)',
          xpReward: 100,
          isUnlocked: metrics.totalXP >= 100,
          progressPercent: Math.min(100, (metrics.totalXP / 100) * 100),
          currentValue: metrics.totalXP,
          targetValue: 100,
          valueUnit: 'XP'
        },
        {
          id: 'double_graduate',
          title: 'Academic Elite',
          category: 'mastery',
          description: 'Completed 2 complete specialized certificate courses.',
          requirement: 'Complete 2 full courses',
          icon: <Trophy size={16} className="text-pink-400" />,
          accentColor: '#EC4899',
          glowColor: 'rgba(236, 72, 153, 0.4)',
          xpReward: 300,
          isUnlocked: metrics.completedCoursesCount >= 2,
          progressPercent: Math.min(100, (metrics.completedCoursesCount / 2) * 100),
          currentValue: metrics.completedCoursesCount,
          targetValue: 2,
          valueUnit: 'courses'
        }
      ];
      return list;
    }

    const colorMap: Record<string, { accent: string; glow: string }> = {
      amber: { accent: '#F59E0B', glow: 'rgba(245, 158, 11, 0.4)' },
      emerald: { accent: '#10B981', glow: 'rgba(16, 185, 129, 0.4)' },
      blue: { accent: '#3B82F6', glow: 'rgba(59, 130, 246, 0.4)' },
      purple: { accent: '#8B5CF6', glow: 'rgba(139, 92, 246, 0.4)' },
      rose: { accent: '#F43F5E', glow: 'rgba(244, 63, 94, 0.4)' },
      cyan: { accent: '#06B6D4', glow: 'rgba(6, 182, 212, 0.4)' },
      orange: { accent: '#F97316', glow: 'rgba(249, 115, 22, 0.4)' },
      green: { accent: '#10B981', glow: 'rgba(16, 185, 129, 0.4)' },
      yellow: { accent: '#EAB308', glow: 'rgba(234, 179, 8, 0.4)' }
    };

    return dbMilestones.map((m: any) => {
      let currentValue = 0;
      const targetValue = Number(m.targetValue || m.valueTarget || 1);
      let valueUnit = '';

      switch (m.targetType) {
        case 'videos_watched':
          currentValue = metrics.totalCompletedLessons;
          valueUnit = 'lessons';
          break;
        case 'quizzes_passed':
          currentValue = quizzesPassedCount;
          valueUnit = 'quizzes';
          break;
        case 'streak_days':
          currentValue = metrics.currentStreakDays;
          valueUnit = 'days';
          break;
        case 'courses_completed':
          currentValue = metrics.completedCoursesCount;
          valueUnit = 'courses';
          break;
        case 'score_achieved':
          currentValue = maxQuizScore;
          valueUnit = '%';
          break;
        default:
          currentValue = 0;
          valueUnit = '';
      }

      const progressPercent = Math.min(100, (currentValue / targetValue) * 100);
      const isUnlocked = currentValue >= targetValue;

      const colors = colorMap[m.color] || colorMap.amber;

      return {
        id: m.id || m.achievementId,
        title: m.title || m.name || 'Badge',
        category: (m.category || 'general') as any,
        description: m.description || '',
        requirement: `Reach ${targetValue} ${m.targetType?.replace('_', ' ') || ''}`,
        icon: renderLucideIcon(m.icon, `text-${m.color}-400`),
        accentColor: colors.accent,
        glowColor: colors.glow,
        xpReward: Number(m.xpReward || m.rewardXP || 50),
        isUnlocked,
        progressPercent,
        currentValue,
        targetValue,
        valueUnit
      };
    }).sort((a: any, b: any) => (a.order || 0) - (b.order || 0) || a.title.localeCompare(b.title));
  }, [dbMilestones, metrics, quizzesPassedCount, maxQuizScore]);

  const unlockedCount = achievements.filter((a) => a.isUnlocked).length;
  const totalCount = achievements.length;
  const overallProgress = Math.round((unlockedCount / totalCount) * 100);

  const filteredAchievements = useMemo(() => {
    if (filter === 'unlocked') return achievements.filter((a) => a.isUnlocked);
    if (filter === 'locked') return achievements.filter((a) => !a.isUnlocked);
    return achievements;
  }, [achievements, filter]);

  // Handle automatic Firestore achievement persistence when newly unlocked
  useEffect(() => {
    if (!auth.currentUser) return;
    achievements.forEach((ach) => {
      if (ach.isUnlocked) {
        const alreadySaved = remoteAchievements.some((ra) => ra.badgeType === ach.id);
        if (!alreadySaved) {
          gamificationService.unlockBadge(
            auth.currentUser!.uid,
            ach.id,
            ach.title,
            ach.description,
            ach.accentColor
          ).then(() => {
            setRemoteAchievements((prev) => [
              ...prev,
              {
                achievementId: ach.id,
                userId: auth.currentUser!.uid,
                badgeType: ach.id,
                title: ach.title,
                description: ach.description,
                icon: ach.accentColor,
                unlockedAt: new Date().toISOString()
              }
            ]);
          });
        }
      }
    });
  }, [achievements, remoteAchievements]);

  return (
    <section className="my-3 px-1">
      {/* Glassmorphic Container */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-white/[0.05] via-slate-900/60 to-slate-950/80 backdrop-blur-xl border border-white/10 p-3.5 sm:p-4 shadow-lg shadow-black/40">
        
        {/* Subtle Ambient Background Light */}
        <div className="absolute top-0 right-1/4 w-40 h-40 bg-[#39FF14]/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2" />
        <div className="absolute bottom-0 left-1/4 w-40 h-40 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none translate-y-1/2" />

        {/* Header Bar */}
        <div className="relative z-10 flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#39FF14]/20 to-emerald-500/10 border border-[#39FF14]/30 flex items-center justify-center shadow-[0_0_12px_rgba(57,255,20,0.2)]">
              <Award size={16} className="text-[#39FF14]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xs font-bold text-white tracking-wide">Learning Milestones</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#39FF14]/10 border border-[#39FF14]/30 text-[#39FF14] font-bold">
                  {unlockedCount}/{totalCount} Unlocked
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                {overallProgress}% Completed • Track milestones & earn XP badges
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold tracking-wider uppercase bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all flex items-center space-x-1 cursor-pointer"
            >
              <span>{isExpanded ? 'Collapse' : 'View All'}</span>
              <ChevronRight size={12} className={`transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
            </button>
          </div>
        </div>

        {/* Milestone Mini Progress Bar */}
        <div className="relative w-full h-1.5 bg-white/5 rounded-full overflow-hidden mb-3 border border-white/5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${overallProgress}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-emerald-500 via-[#39FF14] to-cyan-400 rounded-full shadow-[0_0_8px_rgba(57,255,20,0.6)]"
          />
        </div>

        {/* Filter Pills when Expanded */}
        {isExpanded && (
          <div className="flex items-center space-x-1.5 mb-3 overflow-x-auto no-scrollbar">
            {(['all', 'unlocked', 'locked'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded-lg text-[9px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  filter === f
                    ? 'bg-[#39FF14] text-black shadow-md shadow-[#39FF14]/20'
                    : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                {f === 'all' ? 'All Badges' : f === 'unlocked' ? `Unlocked (${unlockedCount})` : `In Progress (${totalCount - unlockedCount})`}
              </button>
            ))}
          </div>
        )}

        {/* Glassmorphic Badges Stream (Horizontal scroll on compact, responsive grid when expanded) */}
        <div
          className={
            isExpanded
              ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5'
              : 'flex items-center space-x-2.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar scroll-smooth'
          }
        >
          {filteredAchievements.map((badge) => {
            const isUnlocked = badge.isUnlocked;

            return (
              <motion.div
                key={badge.id}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  soundFxService.playBadgeChime();
                  setSelectedBadge(badge);
                }}
                className={`group relative shrink-0 rounded-xl p-2.5 sm:p-3 transition-all cursor-pointer select-none backdrop-blur-md ${
                  isExpanded ? 'w-full' : 'w-[145px] sm:w-[155px]'
                } ${
                  isUnlocked
                    ? 'bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-slate-900/60 border border-white/15 hover:border-[#39FF14]/50 shadow-[0_4px_16px_rgba(0,0,0,0.3)]'
                    : 'bg-white/[0.02] border border-white/5 hover:border-white/10 opacity-75 hover:opacity-100'
                }`}
              >
                {/* Glow aura for unlocked badge */}
                {isUnlocked && (
                  <div
                    className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none blur-sm"
                    style={{ background: `radial-gradient(circle at 50% 0%, ${badge.glowColor}, transparent 70%)` }}
                  />
                )}

                <div className="relative z-10 flex flex-col h-full justify-between">
                  {/* Top row: Icon & Status */}
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all ${
                        isUnlocked
                          ? 'bg-black/40 border-white/20 shadow-sm'
                          : 'bg-white/5 border-white/5 grayscale'
                      }`}
                      style={{
                        borderColor: isUnlocked ? badge.accentColor : 'rgba(255,255,255,0.08)'
                      }}
                    >
                      {badge.icon}
                    </div>

                    {isUnlocked ? (
                      <span className="flex items-center space-x-0.5 px-1.5 py-0.5 rounded-full bg-[#39FF14]/15 border border-[#39FF14]/30 text-[8px] font-mono font-bold text-[#39FF14]">
                        <CheckCircle2 size={9} />
                        <span>DONE</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-0.5 px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[8px] font-mono text-slate-400">
                        <Lock size={8} />
                        <span>{Math.round(badge.progressPercent)}%</span>
                      </span>
                    )}
                  </div>

                  {/* Title & Requirement */}
                  <div>
                    <h4 className="text-[11px] font-bold text-white truncate leading-tight group-hover:text-[#39FF14] transition-colors">
                      {badge.title}
                    </h4>
                    <p className="text-[9px] text-slate-400 truncate mt-0.5 font-sans">
                      {badge.requirement}
                    </p>
                  </div>

                  {/* Micro Progress Bar or XP Reward */}
                  <div className="mt-2.5 pt-1.5 border-t border-white/5 flex items-center justify-between text-[9px] font-mono">
                    <span className="text-slate-400">
                      {isUnlocked ? (
                        <span className="text-[#39FF14] font-bold">+{badge.xpReward} XP</span>
                      ) : (
                        `${badge.currentValue}/${badge.targetValue} ${badge.valueUnit}`
                      )}
                    </span>

                    <div className="flex items-center space-x-1.5">
                      {!isUnlocked && (
                        <div className="w-8 h-1 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-slate-400 rounded-full"
                            style={{ width: `${badge.progressPercent}%` }}
                          />
                        </div>
                      )}
                      <button
                        onClick={(e) => handleShareAchievement(badge, e)}
                        title="Share Milestone"
                        className={`p-1 rounded-md transition-all cursor-pointer ${
                          copiedId === badge.id
                            ? 'bg-[#39FF14]/20 text-[#39FF14] scale-110'
                            : 'text-slate-500 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {copiedId === badge.id ? (
                          <Check size={10} className="text-[#39FF14]" />
                        ) : (
                          <Share2 size={10} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Badge Detail Modal Dialog */}
      {selectedBadge && createPortal(
        <AnimatePresence>
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto w-screen h-[100dvh] top-0 left-0">
            {/* Backdrop Dismiss */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => setSelectedBadge(null)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 15 }}
              className="relative w-full max-w-sm rounded-2xl sm:rounded-3xl bg-[#0d1322] border border-white/15 p-5 shadow-2xl overflow-hidden z-10 max-h-[88dvh] flex flex-col my-auto"
            >
              {/* Top ambient glow */}
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-32 blur-3xl pointer-events-none"
                style={{ background: selectedBadge.glowColor }}
              />

              {/* Close Button */}
              <button
                onClick={() => setSelectedBadge(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer border border-white/5"
              >
                <X size={14} />
              </button>

              {/* Badge Icon & Header */}
              <div className="flex flex-col items-center text-center mt-2 mb-4">
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center border-2 mb-3 shadow-lg relative ${
                    selectedBadge.isUnlocked ? 'bg-slate-900 shadow-[0_0_20px_rgba(57,255,20,0.3)]' : 'bg-slate-900/60 grayscale'
                  }`}
                  style={{
                    borderColor: selectedBadge.isUnlocked ? selectedBadge.accentColor : 'rgba(255,255,255,0.1)'
                  }}
                >
                  <div className="scale-150">{selectedBadge.icon}</div>
                  {selectedBadge.isUnlocked && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#39FF14] text-black flex items-center justify-center font-bold">
                      <CheckCircle2 size={12} />
                    </div>
                  )}
                </div>

                <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono uppercase tracking-wider text-slate-300 mb-1">
                  <span>{selectedBadge.category} Milestone</span>
                </div>

                <h3 className="text-base font-bold text-white">{selectedBadge.title}</h3>
                <p className="text-xs text-slate-300 mt-1 max-w-xs">{selectedBadge.description}</p>
              </div>

              {/* Requirement & Progress Details Card */}
              <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-3.5 mb-4 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-sans">Requirement:</span>
                  <span className="text-white font-medium">{selectedBadge.requirement}</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-sans">Current Progress:</span>
                  <span className="font-mono font-bold text-white">
                    {selectedBadge.currentValue} / {selectedBadge.targetValue} {selectedBadge.valueUnit}
                  </span>
                </div>

                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${selectedBadge.progressPercent}%`,
                      backgroundColor: selectedBadge.accentColor
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                  <span className="text-slate-400 font-sans">XP Reward:</span>
                  <span className="font-mono font-bold text-[#39FF14]">+{selectedBadge.xpReward} XP</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-sans">Status:</span>
                  {selectedBadge.isUnlocked ? (
                    <span className="font-mono font-bold text-emerald-400 flex items-center space-x-1">
                      <Sparkles size={12} />
                      <span>Unlocked & Claimed</span>
                    </span>
                  ) : (
                    <span className="font-mono text-slate-400 flex items-center space-x-1">
                      <Lock size={12} />
                      <span>Locked ({Math.round(100 - selectedBadge.progressPercent)}% to unlock)</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={(e) => handleShareAchievement(selectedBadge, e)}
                  className={`flex-1 py-2.5 px-3 rounded-xl font-medium text-xs transition-all duration-300 flex items-center justify-center space-x-1.5 cursor-pointer border ${
                    copiedId === selectedBadge.id
                      ? 'bg-[#39FF14]/20 border-[#39FF14] text-[#39FF14] shadow-[0_0_16px_rgba(57,255,20,0.35)] scale-[1.02]'
                      : 'bg-gradient-to-r from-emerald-500/20 via-[#39FF14]/15 to-cyan-500/20 hover:from-emerald-500/30 hover:to-cyan-500/30 text-white border-white/15 hover:border-[#39FF14]/40'
                  }`}
                >
                  {copiedId === selectedBadge.id ? (
                    <>
                      <Check size={14} className="text-[#39FF14] animate-pulse" />
                      <span className="font-bold text-[#39FF14]">Summary Copied!</span>
                    </>
                  ) : (
                    <>
                      <Share2 size={14} className="text-[#39FF14]" />
                      <span>Share Achievement</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setSelectedBadge(null)}
                  className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white font-medium text-xs transition-colors cursor-pointer border border-white/10"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        </AnimatePresence>,
        document.body
      )}
    </section>
  );
}
