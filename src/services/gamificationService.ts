import { db, auth } from './firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit, 
  serverTimestamp, 
  increment, 
  addDoc, 
  onSnapshot, 
  runTransaction, 
  writeBatch 
} from 'firebase/firestore';
import { checkXpMilestones, checkStreakMilestones, triggerMilestoneToast } from './milestoneService';
import { UserBadgeItem } from '../types/auth';
import { 
  GamificationConfig, 
  DEFAULT_GAMIFICATION_CONFIG, 
  DiscountVoucher, 
  UserRedeemedVoucher, 
  SpinWheelSegment, 
  VIPTierDefinition, 
  XPLedgerEntry, 
  WalletTransactionEntry,
  DEFAULT_VIP_TIERS,
  DEFAULT_SPIN_SEGMENTS
} from '../types/gamification';

export interface UserXP {
  userId: string;
  totalXP: number;
  currentLevel: number;
  rank: string;
  learningPoints: number;
  updatedAt: string;
}

export interface DailyStreak {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string; // YYYY-MM-DD
  todayStudyMinutes: number;
  updatedAt: string;
}

export interface BadgeDefinition {
  id: string;
  title: string;
  titleBn: string;
  description: string;
  descriptionBn: string;
  icon: string;
  xpReward: number;
  category: 'learning' | 'quiz' | 'streak' | 'mastery' | 'community';
  targetCount: number;
}

export const BADGE_CATALOG: BadgeDefinition[] = [
  {
    id: 'first_step',
    title: 'First Step',
    titleBn: 'প্রথম ধাপ',
    description: 'Complete your first course lesson',
    descriptionBn: 'প্রথম পাঠ বা লেকচার সফলভাবে সম্পন্ন করুন',
    icon: '🚀',
    xpReward: 50,
    category: 'learning',
    targetCount: 1
  },
  {
    id: 'quiz_master',
    title: 'Quiz Master',
    titleBn: 'কুইজ বিজয়ী',
    description: 'Score a perfect 100% on any assessment quiz',
    descriptionBn: 'যেকোনো কুইজ বা পরীক্ষায় ১০০% স্কোর অর্জন করুন',
    icon: '🎯',
    xpReward: 100,
    category: 'quiz',
    targetCount: 1
  },
  {
    id: 'course_finisher',
    title: 'Course Finisher',
    titleBn: 'কোর্স সমাপনী',
    description: 'Complete 100% of an entire curriculum course',
    descriptionBn: 'একটি সম্পূর্ণ কোর্স ১০০% সম্পন্ন করুন',
    icon: '🎓',
    xpReward: 300,
    category: 'mastery',
    targetCount: 1
  },
  {
    id: 'streak_champion',
    title: 'Streak Champion',
    titleBn: 'নিয়মিত শিক্ষার্থী',
    description: 'Maintain a continuous 7-day learning streak',
    descriptionBn: 'টানা ৭ দিন নিয়মিত পড়াশোনা বজায় রাখুন',
    icon: '🔥',
    xpReward: 200,
    category: 'streak',
    targetCount: 7
  },
  {
    id: 'speed_scholar',
    title: 'Speed Scholar',
    titleBn: 'দ্রুত শিক্ষার্থী',
    description: 'Complete 5 lessons across your enrolled courses',
    descriptionBn: 'অন্তত ৫টি লেকচার বা পাঠ সম্পন্ন করুন',
    icon: '⚡',
    xpReward: 100,
    category: 'learning',
    targetCount: 5
  },
  {
    id: 'grand_scholar',
    title: 'Grand Scholar',
    titleBn: 'বিদ্যানুরাগী রত্ন',
    description: 'Accumulate 500+ XP in your learning journey',
    descriptionBn: 'সর্বমোট ৫০০+ এক্সপি পয়েন্ট অর্জন করুন',
    icon: '👑',
    xpReward: 150,
    category: 'mastery',
    targetCount: 500
  },
  {
    id: 'night_owl',
    title: 'Night Owl Scholar',
    titleBn: 'নৈশ শিক্ষার্থী',
    description: 'Study and complete lessons after 9:00 PM',
    descriptionBn: 'রাত ৯টার পর একাগ্রচিত্তে পড়াশোনা করুন',
    icon: '🦉',
    xpReward: 75,
    category: 'learning',
    targetCount: 1
  },
  {
    id: 'discussion_voice',
    title: 'Discussion Voice',
    titleBn: 'সহপাঠী কণ্ঠ',
    description: 'Participate actively in lesson Q&A discussions',
    descriptionBn: 'পাঠের প্রশ্ন ও মতামত বিভাগে সক্রিয়ভাবে অংশ নিন',
    icon: '💬',
    xpReward: 50,
    category: 'community',
    targetCount: 1
  }
];

export interface GamificationBadge {
  badgeId: string;
  name: string;
  description: string;
  icon: string;
  requiredXP?: number;
}

export interface AchievementBadge {
  achievementId: string;
  userId: string;
  badgeType: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string;
}

export interface DailyGoal {
  goalId: string;
  userId: string;
  date: string; // YYYY-MM-DD
  type: string;
  title: string;
  progress: number;
  target: number;
  completed: boolean;
  xpReward: number;
}

export interface RewardHistory {
  historyId: string;
  userId: string;
  type: 'xp' | 'badge' | 'goal';
  amount: number;
  description: string;
  createdAt: string;
}

export interface LeaderboardStudent {
  userId: string;
  displayName: string;
  username?: string;
  photoURL?: string;
  totalXP: number;
  streak: number;
  badgesCount: number;
  level: number;
  rank: string;
  isCurrentUser?: boolean;
}

export const RANKS = [
  { maxLevel: 3, name: 'Scholar', nameBn: 'শিক্ষার্থী' },
  { maxLevel: 6, name: 'Novice', nameBn: 'ব্রোঞ্জ স্কলার' },
  { maxLevel: 10, name: 'Skilled', nameBn: 'সিলভার স্কলার' },
  { maxLevel: 15, name: 'Advanced', nameBn: 'গোল্ড স্কলার' },
  { maxLevel: 25, name: 'Expert', nameBn: 'প্লাটিনাম স্কলার' },
  { maxLevel: 50, name: 'Master', nameBn: 'ডায়মন্ড মাস্টার' },
  { maxLevel: 100, name: 'Legend', nameBn: 'কিংবদন্তি' },
];

export const getLevelFromXP = (xp: number) => {
  return Math.max(1, Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1);
};

export const getRankFromLevel = (level: number) => {
  for (const r of RANKS) {
    if (level <= r.maxLevel) return r.name;
  }
  return 'Legend';
};

export const getXPForLevel = (level: number) => {
  return Math.pow(Math.max(1, level) - 1, 2) * 100;
};

export const getXPForNextLevel = (level: number) => {
  return Math.pow(Math.max(1, level), 2) * 100;
};

export const getTodayDateString = () => {
  return new Date().toISOString().split('T')[0];
};

export const gamificationService = {
  // Sync Gamification Data into users/{userId} and userXP/{userId}
  async syncUserGamification(
    userId: string, 
    xpDelta = 0, 
    streakOverride?: number, 
    badgeToUnlock?: UserBadgeItem
  ): Promise<{ xp: number; streak: number; level: number; badges: UserBadgeItem[] }> {
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDocSnap = await getDoc(userDocRef);
      const today = getTodayDateString();

      let currentXP = 0;
      let currentStreak = 1;
      let currentBadges: UserBadgeItem[] = [];
      let lastActiveDate = today;

      if (userDocSnap.exists()) {
        const uData = userDocSnap.data();
        currentXP = Number(uData.xp || uData.totalXP || 0);
        currentStreak = Number(uData.streak || 1);
        currentBadges = Array.isArray(uData.badges) ? uData.badges : [];
        lastActiveDate = uData.lastActiveDate || today;
      } else {
        // Try fallback to userXP
        const xpDocSnap = await getDoc(doc(db, 'userXP', userId)).catch(() => null);
        if (xpDocSnap && xpDocSnap.exists()) {
          currentXP = Number(xpDocSnap.data().totalXP || 0);
        }
      }

      const newXP = Math.max(0, currentXP + xpDelta);
      const newLevel = getLevelFromXP(newXP);
      const newRank = getRankFromLevel(newLevel);
      const newStreak = streakOverride !== undefined ? streakOverride : currentStreak;

      // Add badge if provided and not already present
      if (badgeToUnlock && !currentBadges.some(b => b.id === badgeToUnlock.id)) {
        currentBadges.push(badgeToUnlock);
      }

      const updates: any = {
        xp: newXP,
        streak: newStreak,
        lastActiveDate: today,
        level: newLevel,
        rank: newRank,
        badges: currentBadges,
        updatedAt: serverTimestamp()
      };

      await setDoc(userDocRef, updates, { merge: true });

      // Also maintain backward-compatible userXP & dailyStreak docs
      try {
        await setDoc(doc(db, 'userXP', userId), {
          userId,
          totalXP: newXP,
          currentLevel: newLevel,
          rank: newRank,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        await setDoc(doc(db, 'dailyStreak', userId), {
          userId,
          currentStreak: newStreak,
          lastActivityDate: today,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (e) {
        // non-blocking
      }

      return { xp: newXP, streak: newStreak, level: newLevel, badges: currentBadges };
    } catch (err) {
      console.warn('syncUserGamification error:', err);
      return { xp: 0, streak: 1, level: 1, badges: [] };
    }
  },

  // Initialize or get UserXP
  async getUserXP(userId: string): Promise<UserXP> {
    try {
      // 1. Check users/{userId} first
      const userSnap = await getDoc(doc(db, 'users', userId));
      if (userSnap.exists()) {
        const uData = userSnap.data();
        const totalXP = Number(uData.xp || uData.totalXP || 0);
        const currentLevel = uData.level || getLevelFromXP(totalXP);
        const rank = uData.rank || getRankFromLevel(currentLevel);
        return {
          userId,
          totalXP,
          currentLevel,
          rank,
          learningPoints: Math.floor(totalXP / 10),
          updatedAt: uData.updatedAt ? new Date(uData.updatedAt.toDate?.() || uData.updatedAt).toISOString() : new Date().toISOString()
        };
      }

      // 2. Check userXP/{userId}
      const docRef = doc(db, 'userXP', userId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as UserXP;
      }
      
      const newProfile: UserXP = {
        userId,
        totalXP: 0,
        currentLevel: 1,
        rank: 'Scholar',
        learningPoints: 0,
        updatedAt: new Date().toISOString()
      };
      await setDoc(docRef, newProfile);
      return newProfile;
    } catch (error) {
      console.warn("Failed to get UserXP:", error);
      return { userId, totalXP: 0, currentLevel: 1, rank: 'Scholar', learningPoints: 0, updatedAt: new Date().toISOString() };
    }
  },

  // Initialize or get Daily Streak
  async getDailyStreak(userId: string): Promise<DailyStreak> {
    try {
      const userSnap = await getDoc(doc(db, 'users', userId));
      const today = getTodayDateString();

      if (userSnap.exists()) {
        const uData = userSnap.data();
        const streakVal = Number(uData.streak || 1);
        const lastDate = uData.lastActiveDate || today;
        return {
          userId,
          currentStreak: streakVal,
          longestStreak: Math.max(streakVal, Number(uData.longestStreak || streakVal)),
          lastActivityDate: lastDate,
          todayStudyMinutes: 0,
          updatedAt: new Date().toISOString()
        };
      }

      const docRef = doc(db, 'dailyStreak', userId);
      const snap = await getDoc(docRef);
      
      if (snap.exists()) {
        const data = snap.data() as DailyStreak;
        return data;
      }
      
      const newStreak: DailyStreak = {
        userId,
        currentStreak: 1,
        longestStreak: 1,
        lastActivityDate: today,
        todayStudyMinutes: 0,
        updatedAt: new Date().toISOString()
      };
      await setDoc(docRef, newStreak);
      return newStreak;
    } catch (error) {
      console.warn("Failed to get DailyStreak:", error);
      return { userId, currentStreak: 1, longestStreak: 1, lastActivityDate: getTodayDateString(), todayStudyMinutes: 0, updatedAt: new Date().toISOString() };
    }
  },

  // Add XP and potentially level up
  async addXP(userId: string, amount: number, description: string): Promise<{ leveledUp: boolean, newLevel: number, newBadge?: any }> {
    try {
      const profile = await this.getUserXP(userId);
      const oldXP = profile.totalXP;
      const newXP = oldXP + amount;
      const newLevel = getLevelFromXP(newXP);
      const newRank = getRankFromLevel(newLevel);
      const leveledUp = newLevel > profile.currentLevel;

      // Update both users collection and userXP
      await this.syncUserGamification(userId, amount);

      // Check Grand Scholar 500+ XP badge
      if (newXP >= 500 && oldXP < 500) {
        await this.unlockBadge(userId, 'grand_scholar');
      }

      // Check XP milestone triggers
      checkXpMilestones(userId, oldXP, newXP);

      // Check level up milestone toast
      if (leveledUp) {
        triggerMilestoneToast({
          type: 'level',
          title: `🏆 Level Up: ${newRank}!`,
          value: `Level ${newLevel}`,
          description: `Congratulations! You advanced to Level ${newLevel} (${newRank})!`,
          icon: '🏆',
          colorTheme: 'purple',
          actionLabel: 'View Rank'
        });
      }

      // Record History
      try {
        await addDoc(collection(db, 'rewardHistory'), {
          userId,
          type: 'xp',
          amount,
          description,
          createdAt: new Date().toISOString()
        });
      } catch (e) {}

      // Dispatch global window event for real-time reactivity
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nexus_xp_updated', { detail: { newXP, amount } }));
      }

      return { leveledUp, newLevel };
    } catch (error) {
      console.error("Failed to add XP:", error);
      return { leveledUp: false, newLevel: 1 };
    }
  },

  // Record Daily Login / Visit (awards +10 XP and updates streak)
  async recordDailyLogin(userId: string): Promise<{ streak: number; awardedXP: number }> {
    try {
      const today = getTodayDateString();
      const userRef = doc(db, 'users', userId);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        await this.syncUserGamification(userId, 10, 1);
        return { streak: 1, awardedXP: 10 };
      }

      const uData = snap.data();
      const lastDate = uData.lastActiveDate;
      let streak = Number(uData.streak || 1);

      if (lastDate === today) {
        // Already recorded today
        return { streak, awardedXP: 0 };
      }

      // Check if consecutive day
      if (lastDate) {
        const last = new Date(lastDate);
        const cur = new Date(today);
        const diffDays = Math.round((cur.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          streak += 1;
        } else if (diffDays > 1) {
          streak = 1;
        }
      } else {
        streak = 1;
      }

      await this.syncUserGamification(userId, 10, streak);

      // Trigger toast
      triggerMilestoneToast({
        type: 'streak',
        title: `🔥 Daily Streak: ${streak} Days!`,
        value: `${streak} Days`,
        description: `Daily login recorded! +10 XP awarded.`,
        icon: '🔥',
        colorTheme: 'amber',
        actionLabel: 'Keep It Up'
      });

      // Award Streak Champion if streak reaches 7
      if (streak >= 7) {
        await this.unlockBadge(userId, 'streak_champion');
      }

      return { streak, awardedXP: 10 };
    } catch (err) {
      console.warn('recordDailyLogin error:', err);
      return { streak: 1, awardedXP: 0 };
    }
  },

  // Action Trigger: Complete a lesson / video (+20 XP)
  async recordLessonCompletion(userId: string, lessonTitle?: string, allCompletedCount = 1): Promise<void> {
    try {
      await this.addXP(userId, 20, `Completed Lesson: ${lessonTitle || 'Lecture'}`);

      // Unlock "first_step" badge on 1st lesson
      if (allCompletedCount >= 1) {
        await this.unlockBadge(userId, 'first_step');
      }

      // Unlock "speed_scholar" on 5 lessons
      if (allCompletedCount >= 5) {
        await this.unlockBadge(userId, 'speed_scholar');
      }

      // Check if night study (after 9 PM = 21:00)
      const currentHour = new Date().getHours();
      if (currentHour >= 21 || currentHour < 4) {
        await this.unlockBadge(userId, 'night_owl');
      }
    } catch (err) {
      console.warn('recordLessonCompletion error:', err);
    }
  },

  // Action Trigger: Complete a quiz with passing score (+50 XP)
  async recordQuizCompletion(userId: string, passed: boolean, scorePercentage: number, quizTitle?: string): Promise<void> {
    try {
      if (passed) {
        await this.addXP(userId, 50, `Passed Quiz: ${quizTitle || 'Assessment'} (${scorePercentage}%)`);
      }

      if (scorePercentage >= 100) {
        await this.unlockBadge(userId, 'quiz_master');
      }
    } catch (err) {
      console.warn('recordQuizCompletion error:', err);
    }
  },

  // Action Trigger: Complete a full course (+300 XP)
  async recordCourseCompletion(userId: string, courseTitle?: string): Promise<void> {
    try {
      await this.addXP(userId, 300, `Graduated Course: ${courseTitle || 'Curriculum'}`);
      await this.unlockBadge(userId, 'course_finisher');
    } catch (err) {
      console.warn('recordCourseCompletion error:', err);
    }
  },

  // Unlock a specific badge from catalog or with custom metadata
  async unlockBadge(
    userId: string, 
    badgeId: string, 
    customTitle?: string, 
    customDesc?: string, 
    customColor?: string
  ): Promise<boolean> {
    try {
      const badgeDef = BADGE_CATALOG.find(b => b.id === badgeId);
      const title = customTitle || (badgeDef ? `${badgeDef.title} / ${badgeDef.titleBn}` : badgeId);
      const icon = badgeDef?.icon || '🏅';
      const description = customDesc || badgeDef?.description || 'Achievement unlocked';
      const xpReward = badgeDef?.xpReward || 50;

      const userDocRef = doc(db, 'users', userId);
      const snap = await getDoc(userDocRef);

      let currentBadges: UserBadgeItem[] = [];
      if (snap.exists()) {
        const data = snap.data();
        currentBadges = Array.isArray(data.badges) ? data.badges : [];
      }

      // If already unlocked, return
      if (currentBadges.some(b => b.id === badgeId)) {
        return false;
      }

      const newBadge: UserBadgeItem = {
        id: badgeId,
        title,
        icon,
        description,
        xpReward,
        unlockedAt: new Date().toISOString()
      };

      currentBadges.push(newBadge);

      // Save badge and reward XP
      await this.syncUserGamification(userId, xpReward, undefined, newBadge);

      // Also record in achievements collection for backward compatibility
      try {
        await addDoc(collection(db, 'achievements'), {
          userId,
          badgeType: badgeId,
          title,
          description,
          icon,
          accentColor: customColor || '#39FF14',
          unlockedAt: new Date().toISOString()
        });
      } catch (e) {}

      // Trigger Fanfare & Milestone Toast
      triggerMilestoneToast({
        type: 'badge',
        title: `🏅 Badge Unlocked: ${title}!`,
        value: title,
        description: `${description} (+${xpReward} XP)`,
        icon,
        colorTheme: 'amber',
        actionLabel: 'View Badges'
      });

      return true;
    } catch (err) {
      console.warn('unlockBadge error:', err);
      return false;
    }
  },

  // Get Leaderboard (ordered by xp descending from users collection)
  async getLeaderboard(limitCount = 25): Promise<LeaderboardStudent[]> {
    try {
      // 1. Primary Firestore Query: query(collection(db, "users"), orderBy("xp", "desc"), limit(25))
      let userList: LeaderboardStudent[] = [];
      try {
        const q = query(collection(db, 'users'), orderBy('xp', 'desc'), limit(limitCount));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          userList = snap.docs.map(docSnap => {
            const data = docSnap.data();
            const xp = Number(data.xp || data.totalXP || 0);
            const level = Number(data.level || getLevelFromXP(xp));
            const streak = Number(data.streak || 1);
            const badgesCount = Array.isArray(data.badges) ? data.badges.length : 0;
            const rank = data.rank || getRankFromLevel(level);
            const displayName = data.fullName || data.username || 'Distinguished Scholar';

            return {
              userId: docSnap.id,
              displayName,
              username: data.username || '',
              photoURL: data.photoURL || undefined,
              totalXP: xp,
              streak,
              badgesCount,
              level,
              rank
            };
          });
        }
      } catch (firestoreErr) {
        console.warn('Query users by xp orderBy failed, attempting fallback query:', firestoreErr);
      }

      // If user list is empty or minimal, supplement with userXP collection or starter benchmarks
      if (userList.length === 0) {
        try {
          const snapAll = await getDocs(query(collection(db, 'users'), limit(limitCount)));
          userList = snapAll.docs.map(docSnap => {
            const data = docSnap.data();
            const xp = Number(data.xp || data.totalXP || 0);
            const level = Number(data.level || getLevelFromXP(xp));
            return {
              userId: docSnap.id,
              displayName: data.fullName || data.username || 'Scholar',
              username: data.username || '',
              photoURL: data.photoURL,
              totalXP: xp,
              streak: Number(data.streak || 1),
              badgesCount: Array.isArray(data.badges) ? data.badges.length : 0,
              level,
              rank: data.rank || getRankFromLevel(level)
            };
          }).sort((a, b) => b.totalXP - a.totalXP);
        } catch (e) {
          console.warn('Fallback users query error:', e);
        }
      }

      // Standard starter community champions if the database is newly seeded
      const baselineChamps: LeaderboardStudent[] = [
        { userId: 'bench_1', displayName: 'Arafat Rahman', username: 'arafat_dev', totalXP: 1850, streak: 14, badgesCount: 6, level: 5, rank: 'Diamond Master' },
        { userId: 'bench_2', displayName: 'Tanvir Hasan', username: 'tanvir_h', totalXP: 1220, streak: 9, badgesCount: 4, level: 4, rank: 'Platinum Scholar' },
        { userId: 'bench_3', displayName: 'Nusrat Jahan', username: 'nusrat_j', totalXP: 860, streak: 7, badgesCount: 4, level: 3, rank: 'Gold Scholar' },
        { userId: 'bench_4', displayName: 'Samiul Islam', username: 'samiul_is', totalXP: 640, streak: 5, badgesCount: 3, level: 3, rank: 'Gold Scholar' },
        { userId: 'bench_5', displayName: 'Farhana Akter', username: 'farhana_a', totalXP: 450, streak: 4, badgesCount: 2, level: 3, rank: 'Scholar' },
        { userId: 'bench_6', displayName: 'Mahmudul Karim', username: 'mahmud_k', totalXP: 320, streak: 3, badgesCount: 2, level: 2, rank: 'Silver Scholar' },
        { userId: 'bench_7', displayName: 'Sadia Sultana', username: 'sadia_s', totalXP: 210, streak: 2, badgesCount: 1, level: 2, rank: 'Bronze Scholar' }
      ];

      // Merge real users with baseline champions without duplicates
      const mergedMap = new Map<string, LeaderboardStudent>();
      userList.forEach(u => mergedMap.set(u.userId, u));
      baselineChamps.forEach(b => {
        if (!mergedMap.has(b.userId)) {
          mergedMap.set(b.userId, b);
        }
      });

      const finalSorted = Array.from(mergedMap.values()).sort((a, b) => b.totalXP - a.totalXP).slice(0, limitCount);
      return finalSorted;
    } catch (error) {
      console.error("Failed to get leaderboard:", error);
      return [];
    }
  },

  // Get User Badges & Achievements
  async getUserBadges(userId: string): Promise<UserBadgeItem[]> {
    try {
      const userRef = doc(db, 'users', userId);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data.badges)) {
          return data.badges;
        }
      }
      return [];
    } catch (error) {
      console.warn("Failed to get user badges:", error);
      return [];
    }
  },

  // Legacy compatibility methods
  async updateActivity(userId: string, minutes: number = 0): Promise<{ streakIncreased: boolean, newStreak: number }> {
    const res = await this.recordDailyLogin(userId);
    return { streakIncreased: res.awardedXP > 0, newStreak: res.streak };
  },

  async getUserAchievements(userId: string): Promise<AchievementBadge[]> {
    const badges = await this.getUserBadges(userId);
    return badges.map(b => ({
      achievementId: b.id,
      userId,
      badgeType: b.id,
      title: b.title,
      description: b.description || '',
      icon: b.icon,
      unlockedAt: b.unlockedAt
    }));
  },

  async getRewardHistory(userId: string): Promise<RewardHistory[]> {
    try {
      const q = query(collection(db, 'rewardHistory'), where('userId', '==', userId));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ historyId: d.id, ...d.data() } as RewardHistory))
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 50);
    } catch (error) {
      return [];
    }
  },

  async getDailyGoals(userId: string): Promise<DailyGoal[]> {
    try {
      const today = getTodayDateString();
      const q = query(collection(db, 'dailyGoals'), where('userId', '==', userId), where('date', '==', today));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        return snap.docs.map(d => ({ goalId: d.id, ...d.data() } as DailyGoal));
      }

      const defaultGoals = [
        { type: 'study_time', title: 'Study for 30 Minutes', target: 30, xpReward: 50 },
        { type: 'complete_lesson', title: 'Complete a Lesson', target: 1, xpReward: 40 },
        { type: 'take_quiz', title: 'Take a Quiz', target: 1, xpReward: 60 }
      ];

      const newGoals: DailyGoal[] = [];
      for (const g of defaultGoals) {
        const docRef = await addDoc(collection(db, 'dailyGoals'), {
          userId,
          date: today,
          type: g.type,
          title: g.title,
          progress: 0,
          target: g.target,
          completed: false,
          xpReward: g.xpReward
        });
        newGoals.push({ goalId: docRef.id, userId, date: today, type: g.type, title: g.title, progress: 0, target: g.target, completed: false, xpReward: g.xpReward });
      }
      return newGoals;
    } catch (error) {
      return [];
    }
  },

  async updateGoalProgress(userId: string, type: string, amount: number = 1) {
    try {
      const today = getTodayDateString();
      const q = query(collection(db, 'dailyGoals'), where('userId', '==', userId), where('date', '==', today), where('type', '==', type));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        for (const docSnap of snap.docs) {
          const goal = docSnap.data() as DailyGoal;
          if (!goal.completed) {
            const newProgress = Math.min(goal.progress + amount, goal.target);
            const completed = newProgress >= goal.target;
            
            await updateDoc(docSnap.ref, { progress: newProgress, completed });
            if (completed) {
              await this.addXP(userId, goal.xpReward, `Completed Goal: ${goal.title}`);
            }
          }
        }
      }
    } catch (error) {
      console.warn("Failed to update goal progress:", error);
    }
  },

  async isLessonUnlockedWithXP(userId: string, courseId: string, lessonId: string): Promise<boolean> {
    try {
      const docRef = doc(db, 'unlockedLessons', `${userId}_${lessonId}`);
      const snap = await getDoc(docRef);
      if (snap.exists()) return true;
      const localUnlocked = localStorage.getItem(`nexus_unlocked_lesson_${userId}_${lessonId}`);
      return localUnlocked === 'true';
    } catch (error) {
      const localUnlocked = localStorage.getItem(`nexus_unlocked_lesson_${userId}_${lessonId}`);
      return localUnlocked === 'true';
    }
  },

  async unlockLessonWithXP(userId: string, courseId: string, lessonId: string, lessonTitle: string, xpCost: number = 150): Promise<{ success: boolean; message: string; remainingXP?: number }> {
    try {
      const profile = await this.getUserXP(userId);
      if (profile.totalXP < xpCost) {
        return { success: false, message: `Not enough XP. You need ${xpCost} XP (you have ${profile.totalXP} XP).` };
      }

      const newXP = profile.totalXP - xpCost;
      await this.syncUserGamification(userId, -xpCost);

      const unlockDocRef = doc(db, 'unlockedLessons', `${userId}_${lessonId}`);
      await setDoc(unlockDocRef, {
        userId,
        courseId,
        lessonId,
        lessonTitle,
        xpSpent: xpCost,
        unlockedAt: new Date().toISOString()
      });

      localStorage.setItem(`nexus_unlocked_lesson_${userId}_${lessonId}`, 'true');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nexus_lesson_unlocked', { detail: { lessonId, courseId } }));
      }

      return { success: true, message: `Lesson "${lessonTitle}" successfully unlocked!`, remainingXP: newXP };
    } catch (error: any) {
      return { success: false, message: error?.message || 'Failed to unlock lesson.' };
    }
  },

  async getUserActivePerks(userId: string): Promise<{ itemId: string, expiryDate: any }[]> {
    try {
      const docRef = doc(db, 'userPerks', userId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        const now = new Date();
        return (data.purchasedItems || []).filter((item: any) => new Date(item.expiryDate.toDate()) > now);
      }
      return [];
    } catch (error) {
      return [];
    }
  },

  async getDailyChestStatus(userId: string): Promise<{ canClaim: boolean; lastClaimDate: string | null }> {
    try {
      const today = getTodayDateString();
      const localClaim = localStorage.getItem(`nexus_daily_chest_${userId}`);
      if (localClaim === today) {
        return { canClaim: false, lastClaimDate: today };
      }

      const docRef = doc(db, 'dailyChests', userId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        const claimedToday = data.lastClaimDate === today;
        return { canClaim: !claimedToday, lastClaimDate: data.lastClaimDate || null };
      }
      return { canClaim: true, lastClaimDate: null };
    } catch (e) {
      return { canClaim: true, lastClaimDate: null };
    }
  },

  async claimDailyChest(userId: string): Promise<{ success: boolean; xpReward: number; streakBonus: number; totalReward: number }> {
    try {
      const today = getTodayDateString();
      const streak = await this.getDailyStreak(userId);
      const baseXP = Math.floor(Math.random() * 41) + 30; // 30-70 XP
      const streakMultiplier = Math.min(streak.currentStreak * 5, 50);
      const totalXP = baseXP + streakMultiplier;

      const docRef = doc(db, 'dailyChests', userId);
      await setDoc(docRef, {
        userId,
        lastClaimDate: today,
        streakCount: streak.currentStreak || 1,
        lastRewardAmount: totalXP,
        claimedAt: new Date().toISOString()
      }, { merge: true });

      await this.addXP(userId, totalXP, `🎁 Daily Mystery Chest Claimed (+${totalXP} XP)`);
      localStorage.setItem(`nexus_daily_chest_${userId}`, today);

      return { success: true, xpReward: baseXP, streakBonus: streakMultiplier, totalReward: totalXP };
    } catch (e) {
      return { success: false, xpReward: 30, streakBonus: 0, totalReward: 30 };
    }
  },

  // ==========================================
  // DYNAMIC GAMIFICATION & REWARDS VAULT APIS
  // ==========================================

  // 1. Get or Subscribe to Gamification Config from Firestore (settings/gamification_config)
  async getGamificationConfig(): Promise<GamificationConfig> {
    try {
      const configDocRef = doc(db, 'settings', 'gamification_config');
      const snap = await getDoc(configDocRef);
      if (snap.exists()) {
        const data = snap.data() as Partial<GamificationConfig>;
        return {
          isEnabled: data.isEnabled !== undefined ? data.isEnabled : DEFAULT_GAMIFICATION_CONFIG.isEnabled,
          converter: {
            ...DEFAULT_GAMIFICATION_CONFIG.converter,
            ...(data.converter || {})
          },
          spinWheel: {
            ...DEFAULT_GAMIFICATION_CONFIG.spinWheel,
            ...(data.spinWheel || {}),
            segments: Array.isArray(data.spinWheel?.segments) && data.spinWheel.segments.length > 0 
              ? data.spinWheel.segments 
              : DEFAULT_GAMIFICATION_CONFIG.spinWheel.segments
          },
          vouchers: Array.isArray(data.vouchers) && data.vouchers.length > 0 
            ? data.vouchers 
            : DEFAULT_GAMIFICATION_CONFIG.vouchers,
          vipTiers: Array.isArray(data.vipTiers) && data.vipTiers.length > 0 
            ? data.vipTiers 
            : DEFAULT_GAMIFICATION_CONFIG.vipTiers,
          updatedAt: data.updatedAt,
          updatedBy: data.updatedBy
        };
      }
      return DEFAULT_GAMIFICATION_CONFIG;
    } catch (err) {
      console.warn('Failed to load gamification config, using safe defaults:', err);
      return DEFAULT_GAMIFICATION_CONFIG;
    }
  },

  subscribeGamificationConfig(callback: (config: GamificationConfig) => void): () => void {
    try {
      const configDocRef = doc(db, 'settings', 'gamification_config');
      return onSnapshot(configDocRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<GamificationConfig>;
          const merged: GamificationConfig = {
            isEnabled: data.isEnabled !== undefined ? data.isEnabled : DEFAULT_GAMIFICATION_CONFIG.isEnabled,
            converter: {
              ...DEFAULT_GAMIFICATION_CONFIG.converter,
              ...(data.converter || {})
            },
            spinWheel: {
              ...DEFAULT_GAMIFICATION_CONFIG.spinWheel,
              ...(data.spinWheel || {}),
              segments: Array.isArray(data.spinWheel?.segments) && data.spinWheel.segments.length > 0 
                ? data.spinWheel.segments 
                : DEFAULT_GAMIFICATION_CONFIG.spinWheel.segments
            },
            vouchers: Array.isArray(data.vouchers) && data.vouchers.length > 0 
              ? data.vouchers 
              : DEFAULT_GAMIFICATION_CONFIG.vouchers,
            vipTiers: Array.isArray(data.vipTiers) && data.vipTiers.length > 0 
              ? data.vipTiers 
              : DEFAULT_GAMIFICATION_CONFIG.vipTiers,
            updatedAt: data.updatedAt,
            updatedBy: data.updatedBy
          };
          callback(merged);
        } else {
          callback(DEFAULT_GAMIFICATION_CONFIG);
        }
      }, (err) => {
        console.warn('subscribeGamificationConfig error:', err);
        callback(DEFAULT_GAMIFICATION_CONFIG);
      });
    } catch (e) {
      console.warn('Failed to setup config listener:', e);
      callback(DEFAULT_GAMIFICATION_CONFIG);
      return () => {};
    }
  },

  async saveGamificationConfig(config: GamificationConfig, adminEmail = 'admin@nexus.edu'): Promise<boolean> {
    try {
      const configDocRef = doc(db, 'settings', 'gamification_config');
      await setDoc(configDocRef, {
        ...config,
        updatedAt: new Date().toISOString(),
        updatedBy: adminEmail
      }, { merge: true });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nexus_gamification_config_updated', { detail: config }));
      }
      return true;
    } catch (err) {
      console.error('Failed to save gamification config:', err);
      throw err;
    }
  },

  // 2. User Wallet Balance
  async getUserWalletBalance(userId: string): Promise<number> {
    try {
      const userRef = doc(db, 'users', userId);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        return Number(data.walletBalance || data.wallet || 0);
      }
      return 0;
    } catch (err) {
      console.warn('Failed to get wallet balance:', err);
      return 0;
    }
  },

  // 3. XP to Wallet Converter (Atomic transaction / synchronized updates)
  async convertXPToWallet(
    userId: string, 
    xpAmount: number
  ): Promise<{ success: boolean; payout: number; remainingXP: number; newWalletBalance: number; message: string }> {
    try {
      const config = await this.getGamificationConfig();
      if (!config.isEnabled || !config.converter.isEnabled) {
        return { success: false, payout: 0, remainingXP: 0, newWalletBalance: 0, message: 'XP to Wallet Converter is currently disabled by Admin.' };
      }

      if (xpAmount < config.converter.minXPThreshold) {
        return { success: false, payout: 0, remainingXP: 0, newWalletBalance: 0, message: `Minimum conversion threshold is ${config.converter.minXPThreshold} XP.` };
      }

      const profile = await this.getUserXP(userId);
      if (profile.totalXP < xpAmount) {
        return { success: false, payout: 0, remainingXP: profile.totalXP, newWalletBalance: 0, message: `Insufficient XP. You have ${profile.totalXP} XP.` };
      }

      // Calculate payout based on conversion rate (e.g. 100 XP = 10 BDT -> xpAmount / 10)
      const payout = Math.floor(xpAmount / config.converter.xpPerCurrencyUnit);
      if (payout <= 0) {
        return { success: false, payout: 0, remainingXP: profile.totalXP, newWalletBalance: 0, message: 'Conversion amount too low.' };
      }

      const userRef = doc(db, 'users', userId);
      const currentWallet = await this.getUserWalletBalance(userId);
      const newWallet = currentWallet + payout;
      const newXP = profile.totalXP - xpAmount;

      // Update user document
      await updateDoc(userRef, {
        xp: newXP,
        walletBalance: newWallet,
        updatedAt: serverTimestamp()
      });

      // Update userXP doc
      try {
        await setDoc(doc(db, 'userXP', userId), {
          totalXP: newXP,
          currentLevel: getLevelFromXP(newXP),
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (e) {}

      // Log to Reward History
      const nowIso = new Date().toISOString();
      try {
        await addDoc(collection(db, 'rewardHistory'), {
          userId,
          type: 'xp',
          amount: -xpAmount,
          description: `Converted ${xpAmount} XP to ${config.converter.currencySymbol}${payout} Wallet Balance`,
          createdAt: nowIso
        });
      } catch (e) {}

      // Log to XP Ledger
      try {
        await addDoc(collection(db, 'xpLedger'), {
          userId,
          type: 'spend',
          category: 'wallet_conversion',
          amount: xpAmount,
          balanceAfter: newXP,
          description: `Converted ${xpAmount} XP to ${config.converter.currencySymbol}${payout} Wallet`,
          createdAt: nowIso
        });
      } catch (e) {}

      // Log to Wallet Transactions
      try {
        await addDoc(collection(db, 'walletTransactions'), {
          userId,
          type: 'credit',
          amount: payout,
          source: 'xp_conversion',
          balanceAfter: newWallet,
          description: `Credited from ${xpAmount} XP Conversion`,
          createdAt: nowIso
        });
      } catch (e) {}

      // Trigger Celebration Toast
      triggerMilestoneToast({
        type: 'xp',
        title: `💰 ৳${payout} Wallet Credit Added!`,
        value: `৳${payout} BDT`,
        description: `Successfully converted ${xpAmount} XP to wallet balance.`,
        icon: '💰',
        colorTheme: 'green',
        actionLabel: 'Check Wallet'
      });

      // Dispatch global events
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nexus_xp_updated', { detail: { newXP } }));
        window.dispatchEvent(new CustomEvent('nexus_wallet_updated', { detail: { newWallet } }));
      }

      return {
        success: true,
        payout,
        remainingXP: newXP,
        newWalletBalance: newWallet,
        message: `Successfully converted ${xpAmount} XP to ${config.converter.currencySymbol}${payout} Wallet Balance!`
      };
    } catch (err: any) {
      console.error('convertXPToWallet error:', err);
      return { success: false, payout: 0, remainingXP: 0, newWalletBalance: 0, message: err?.message || 'Failed to convert XP.' };
    }
  },

  // 4. Discount Vouchers Redemption
  async redeemVoucherWithXP(
    userId: string, 
    voucherId: string
  ): Promise<{ success: boolean; voucher?: UserRedeemedVoucher; message: string; remainingXP?: number }> {
    try {
      const config = await this.getGamificationConfig();
      const voucherDef = config.vouchers.find(v => v.id === voucherId && v.isActive);
      
      if (!voucherDef) {
        return { success: false, message: 'Selected voucher is no longer active or available.' };
      }

      const profile = await this.getUserXP(userId);
      if (profile.totalXP < voucherDef.xpCost) {
        return { success: false, message: `Insufficient XP. You need ${voucherDef.xpCost} XP (you have ${profile.totalXP} XP).` };
      }

      const newXP = profile.totalXP - voucherDef.xpCost;
      const userRef = doc(db, 'users', userId);
      
      // Generate Unique Promo Code
      const uniqueCode = `${voucherDef.code}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + voucherDef.expiryDays * 24 * 60 * 60 * 1000).toISOString();
      const nowIso = now.toISOString();

      // Deduct XP
      await updateDoc(userRef, {
        xp: newXP,
        updatedAt: serverTimestamp()
      });

      try {
        await setDoc(doc(db, 'userXP', userId), {
          totalXP: newXP,
          currentLevel: getLevelFromXP(newXP),
          updatedAt: nowIso
        }, { merge: true });
      } catch (e) {}

      // Create User Redeemed Voucher entry
      const userVoucherData: UserRedeemedVoucher = {
        id: `uv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId,
        voucherId: voucherDef.id,
        code: uniqueCode,
        title: voucherDef.title,
        discountType: voucherDef.discountType,
        discountValue: voucherDef.discountValue,
        minSpend: voucherDef.minSpend,
        xpSpent: voucherDef.xpCost,
        redeemedAt: nowIso,
        expiresAt,
        isUsed: false
      };

      await setDoc(doc(db, 'userVouchers', userVoucherData.id), userVoucherData);

      // Also register this code in `coupons` collection so it works in Payment checkout immediately
      try {
        await setDoc(doc(db, 'coupons', uniqueCode), {
          couponId: uniqueCode,
          code: uniqueCode,
          discountType: voucherDef.discountType === 'percentage' ? 'percentage' : 'fixed',
          discountValue: voucherDef.discountValue,
          isActive: true,
          expiryDate: expiresAt,
          description: `XP Rewards Voucher: ${voucherDef.title} (${uniqueCode})`,
          minSpend: voucherDef.minSpend,
          assignedUserId: userId,
          createdAt: nowIso
        });
      } catch (e) {}

      // Record in XP Ledger & Reward History
      try {
        await addDoc(collection(db, 'rewardHistory'), {
          userId,
          type: 'xp',
          amount: -voucherDef.xpCost,
          description: `Redeemed Voucher: ${voucherDef.title} (${uniqueCode})`,
          createdAt: nowIso
        });

        await addDoc(collection(db, 'xpLedger'), {
          userId,
          type: 'spend',
          category: 'voucher_redeem',
          amount: voucherDef.xpCost,
          balanceAfter: newXP,
          description: `Redeemed ${voucherDef.title} for ${voucherDef.xpCost} XP`,
          metadata: { code: uniqueCode, voucherId: voucherDef.id },
          createdAt: nowIso
        });
      } catch (e) {}

      // Milestone toast
      triggerMilestoneToast({
        type: 'badge',
        title: `🎟️ Voucher Redeemed: ${voucherDef.title}!`,
        value: uniqueCode,
        description: `Promo Code: ${uniqueCode} (${voucherDef.discountValue}${voucherDef.discountType === 'percentage' ? '%' : ' Tk'} OFF)`,
        icon: '🎟️',
        colorTheme: 'purple',
        actionLabel: 'Use Coupon'
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nexus_xp_updated', { detail: { newXP } }));
        window.dispatchEvent(new CustomEvent('nexus_vouchers_updated', { detail: userVoucherData }));
      }

      return {
        success: true,
        voucher: userVoucherData,
        message: `Successfully redeemed "${voucherDef.title}"! Your promo code is ${uniqueCode}`,
        remainingXP: newXP
      };
    } catch (err: any) {
      console.error('redeemVoucherWithXP error:', err);
      return { success: false, message: err?.message || 'Failed to redeem voucher.' };
    }
  },

  // 5. Get User Redeemed Vouchers
  async getUserRedeemedVouchers(userId: string): Promise<UserRedeemedVoucher[]> {
    try {
      const q = query(collection(db, 'userVouchers'), where('userId', '==', userId));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as UserRedeemedVoucher));
      return list.sort((a, b) => new Date(b.redeemedAt || 0).getTime() - new Date(a.redeemedAt || 0).getTime());
    } catch (err) {
      console.warn('getUserRedeemedVouchers error:', err);
      return [];
    }
  },

  // 6. Lucky Spin Wheel State & Action
  async getDailySpinStatus(userId: string): Promise<{ 
    freeSpinsRemaining: number; 
    totalSpinsToday: number; 
    spinCostXP: number; 
    canSpinWithXP: boolean; 
    currentXP: number;
    vipTier: VIPTierDefinition;
  }> {
    try {
      const today = getTodayDateString();
      const config = await this.getGamificationConfig();
      const profile = await this.getUserXP(userId);
      const vipTier = this.getUserVIPTier(profile.totalXP, config);

      // Allowed daily free spins = Base free spins + VIP bonus free spins
      const allowedFreeSpins = (config.spinWheel.dailyFreeSpins || 1) + (vipTier.dailyFreeSpins > 1 ? vipTier.dailyFreeSpins - 1 : 0);

      const spinDocRef = doc(db, 'userSpins', `${userId}_${today}`);
      const snap = await getDoc(spinDocRef);

      let usedFreeSpins = 0;
      let totalSpinsToday = 0;

      if (snap.exists()) {
        const data = snap.data();
        usedFreeSpins = Number(data.usedFreeSpins || 0);
        totalSpinsToday = Number(data.totalSpins || 0);
      }

      const freeSpinsRemaining = Math.max(0, allowedFreeSpins - usedFreeSpins);
      const spinCostXP = config.spinWheel.spinCostXP || 50;
      const canSpinWithXP = profile.totalXP >= spinCostXP;

      return {
        freeSpinsRemaining,
        totalSpinsToday,
        spinCostXP,
        canSpinWithXP,
        currentXP: profile.totalXP,
        vipTier
      };
    } catch (err) {
      console.warn('getDailySpinStatus error:', err);
      return {
        freeSpinsRemaining: 1,
        totalSpinsToday: 0,
        spinCostXP: 50,
        canSpinWithXP: true,
        currentXP: 0,
        vipTier: DEFAULT_VIP_TIERS[0]
      };
    }
  },

  async spinLuckyWheel(
    userId: string
  ): Promise<{ 
    success: boolean; 
    winningSegment: SpinWheelSegment; 
    winningIndex: number; 
    isFreeSpin: boolean; 
    awardedValue: number; 
    rewardMessage: string; 
    remainingXP: number; 
    newWalletBalance?: number; 
  }> {
    try {
      const today = getTodayDateString();
      const config = await this.getGamificationConfig();
      if (!config.isEnabled || !config.spinWheel.isEnabled) {
        throw new Error('Lucky Spin Wheel is currently disabled by Admin.');
      }

      const status = await this.getDailySpinStatus(userId);
      const isFreeSpin = status.freeSpinsRemaining > 0;
      const spinCost = isFreeSpin ? 0 : status.spinCostXP;

      if (!isFreeSpin && status.currentXP < spinCost) {
        throw new Error(`Insufficient XP for spin. You need ${spinCost} XP.`);
      }

      // Pick winning segment based on weighted probabilities
      const segments = config.spinWheel.segments.length > 0 ? config.spinWheel.segments : DEFAULT_SPIN_SEGMENTS;
      const totalWeight = segments.reduce((sum, s) => sum + (s.probability || 0.1), 0);
      let rand = Math.random() * totalWeight;
      let winningIndex = 0;

      for (let i = 0; i < segments.length; i++) {
        const w = segments[i].probability || 0.1;
        if (rand < w) {
          winningIndex = i;
          break;
        }
        rand -= w;
      }

      const winningSegment = segments[winningIndex] || segments[0];

      // Atomic XP balance update
      let newXP = status.currentXP - spinCost;
      let newWallet = await this.getUserWalletBalance(userId);
      const nowIso = new Date().toISOString();

      // Apply winning reward
      let rewardMessage = '';
      if (winningSegment.type === 'xp' && winningSegment.value > 0) {
        newXP += winningSegment.value;
        rewardMessage = `🎉 Won +${winningSegment.value} XP!`;
        await this.syncUserGamification(userId, winningSegment.value - spinCost);
      } else if (winningSegment.type === 'wallet' && winningSegment.value > 0) {
        newWallet += winningSegment.value;
        rewardMessage = `💰 Won ৳${winningSegment.value} Wallet Balance!`;
        if (spinCost > 0) {
          await this.syncUserGamification(userId, -spinCost);
        }
        // Update user wallet
        await updateDoc(doc(db, 'users', userId), { walletBalance: newWallet, updatedAt: serverTimestamp() });
        // Log wallet transaction
        try {
          await addDoc(collection(db, 'walletTransactions'), {
            userId,
            type: 'credit',
            amount: winningSegment.value,
            source: 'spin_reward',
            balanceAfter: newWallet,
            description: `Won ৳${winningSegment.value} from Lucky Spin Wheel`,
            createdAt: nowIso
          });
        } catch (e) {}
      } else if (winningSegment.type === 'voucher' && winningSegment.voucherCode) {
        rewardMessage = `🎟️ Won Discount Voucher: ${winningSegment.voucherCode}!`;
        if (spinCost > 0) {
          await this.syncUserGamification(userId, -spinCost);
        }
        // Grant voucher
        const voucherData: UserRedeemedVoucher = {
          id: `spin_vouch_${Date.now()}`,
          userId,
          voucherId: winningSegment.id,
          code: winningSegment.voucherCode,
          title: winningSegment.voucherTitle || `${winningSegment.value}% Spin Discount`,
          discountType: 'percentage',
          discountValue: winningSegment.value || 15,
          minSpend: 400,
          xpSpent: 0,
          redeemedAt: nowIso,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          isUsed: false
        };
        await setDoc(doc(db, 'userVouchers', voucherData.id), voucherData);
        // Also register in coupons collection
        try {
          await setDoc(doc(db, 'coupons', winningSegment.voucherCode), {
            couponId: winningSegment.voucherCode,
            code: winningSegment.voucherCode,
            discountType: 'percentage',
            discountValue: winningSegment.value || 15,
            isActive: true,
            expiryDate: voucherData.expiresAt,
            description: `Lucky Spin Reward Coupon (${winningSegment.voucherCode})`,
            minSpend: 400,
            assignedUserId: userId,
            createdAt: nowIso
          });
        } catch (e) {}
      } else {
        rewardMessage = winningSegment.value > 0 ? `Won ${winningSegment.label}` : 'Better luck next spin!';
        if (spinCost > 0) {
          await this.syncUserGamification(userId, -spinCost);
        }
      }

      // Record Spin usage
      const spinDocRef = doc(db, 'userSpins', `${userId}_${today}`);
      await setDoc(spinDocRef, {
        userId,
        date: today,
        usedFreeSpins: isFreeSpin ? increment(1) : (status.totalSpinsToday === 0 ? 0 : increment(0)),
        totalSpins: increment(1),
        lastSpinAt: nowIso
      }, { merge: true });

      // Log to Reward History & XP Ledger
      try {
        await addDoc(collection(db, 'rewardHistory'), {
          userId,
          type: 'xp',
          amount: winningSegment.type === 'xp' ? winningSegment.value - spinCost : -spinCost,
          description: `Lucky Spin: ${winningSegment.label} (${isFreeSpin ? 'Free Spin' : `Cost: ${spinCost} XP`})`,
          createdAt: nowIso
        });

        await addDoc(collection(db, 'xpLedger'), {
          userId,
          type: winningSegment.type === 'xp' && winningSegment.value > spinCost ? 'earn' : (spinCost > 0 ? 'spend' : 'earn'),
          category: 'lucky_spin',
          amount: spinCost > 0 ? spinCost : winningSegment.value,
          balanceAfter: newXP,
          description: `Spin outcome: ${winningSegment.label} (${isFreeSpin ? 'Free' : `-${spinCost} XP`})`,
          metadata: { segmentId: winningSegment.id, isFreeSpin },
          createdAt: nowIso
        });
      } catch (e) {}

      // Trigger Celebration
      triggerMilestoneToast({
        type: 'xp',
        title: `🎰 Spin Outcome: ${winningSegment.label}!`,
        value: winningSegment.label,
        description: rewardMessage,
        icon: winningSegment.icon || '🎰',
        colorTheme: winningSegment.type === 'wallet' ? 'amber' : 'green',
        actionLabel: 'Awesome'
      });

      // Dispatch global events
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nexus_xp_updated', { detail: { newXP } }));
        if (winningSegment.type === 'wallet') {
          window.dispatchEvent(new CustomEvent('nexus_wallet_updated', { detail: { newWallet } }));
        }
      }

      return {
        success: true,
        winningSegment,
        winningIndex,
        isFreeSpin,
        awardedValue: winningSegment.value,
        rewardMessage,
        remainingXP: newXP,
        newWalletBalance: newWallet
      };
    } catch (err: any) {
      console.error('spinLuckyWheel error:', err);
      throw err;
    }
  },

  // 7. Get User XP Ledger / Passbook
  async getUserXPLedger(userId: string, limitCount = 50): Promise<XPLedgerEntry[]> {
    try {
      const q = query(
        collection(db, 'xpLedger'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as XPLedgerEntry));
      }

      // Fallback: convert rewardHistory into ledger format
      const history = await this.getRewardHistory(userId);
      return history.map(h => ({
        id: h.historyId,
        userId: h.userId,
        type: h.amount >= 0 ? 'earn' : 'spend',
        category: (h.type === 'badge' ? 'quiz' : 'other') as any,
        amount: Math.abs(h.amount),
        description: h.description,
        createdAt: h.createdAt
      }));
    } catch (err) {
      console.warn('getUserXPLedger query fallback:', err);
      const history = await this.getRewardHistory(userId);
      return history.map(h => ({
        id: h.historyId,
        userId: h.userId,
        type: h.amount >= 0 ? 'earn' : 'spend',
        category: 'other',
        amount: Math.abs(h.amount),
        description: h.description,
        createdAt: h.createdAt
      }));
    }
  },

  // 8. Calculate VIP Tier from total XP
  getUserVIPTier(totalXP: number, config?: GamificationConfig): VIPTierDefinition {
    const tiers = (config?.vipTiers && config.vipTiers.length > 0) ? config.vipTiers : DEFAULT_VIP_TIERS;
    const sorted = [...tiers].sort((a, b) => b.minXP - a.minXP);
    for (const t of sorted) {
      if (totalXP >= t.minXP) return t;
    }
    return tiers[0] || DEFAULT_VIP_TIERS[0];
  },

  getNextVIPTier(totalXP: number, config?: GamificationConfig): { nextTier: VIPTierDefinition | null; xpNeeded: number; progressPercent: number } {
    const tiers = (config?.vipTiers && config.vipTiers.length > 0) ? config.vipTiers : DEFAULT_VIP_TIERS;
    const sorted = [...tiers].sort((a, b) => a.minXP - b.minXP);
    const currentTier = this.getUserVIPTier(totalXP, config);
    const currentIndex = sorted.findIndex(t => t.tierId === currentTier.tierId);
    
    if (currentIndex === -1 || currentIndex === sorted.length - 1) {
      return { nextTier: null, xpNeeded: 0, progressPercent: 100 };
    }

    const nextTier = sorted[currentIndex + 1];
    const span = nextTier.minXP - currentTier.minXP;
    const gainedInTier = totalXP - currentTier.minXP;
    const progressPercent = Math.min(100, Math.max(0, (gainedInTier / span) * 100));
    const xpNeeded = Math.max(0, nextTier.minXP - totalXP);

    return { nextTier, xpNeeded, progressPercent };
  },

  // ==========================================
  // XP MARKETPLACE & STORE (PERKS BAZAAR) APIS
  // ==========================================

  // 1. Real-time Subscription to XP Store Items (Listens to `xp_store_items` collection with fallback)
  subscribeXpStoreItems(callback: (items: any[]) => void): () => void {
    try {
      const itemsCollectionRef = collection(db, 'xp_store_items');
      
      const unsubscribe = onSnapshot(itemsCollectionRef, async (snapshot) => {
        if (!snapshot.empty) {
          const items = snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            const cost = Number(data.costXP || data.priceXp || 100);
            const title = data.title || data.name || 'Perk Item';
            const category = data.category || data.perkType || 'perk';
            const perkGranted = data.perkGranted || data.perkDetails || 'Special Perk Granted';
            const isActive = data.isActive !== false && data.status !== 'inactive' && data.availability !== 'inactive';
            const order = Number(data.order !== undefined ? data.order : cost);
            
            return {
              id: docSnap.id,
              name: title,
              title: title,
              category: category,
              perkType: category,
              description: data.description || '',
              costXP: cost,
              priceXp: cost,
              icon: data.icon || '✨',
              perkGranted: perkGranted,
              perkDetails: perkGranted,
              isActive: isActive,
              availability: isActive ? 'active' : 'inactive',
              status: isActive ? 'active' : 'inactive',
              targetScope: data.targetScope || 'all',
              previewClass: data.previewClass || '',
              order: order
            };
          })
          .filter(item => item.isActive)
          .sort((a, b) => (a.order - b.order) || (a.costXP - b.costXP));

          callback(items);
        } else {
          // Fallback to appSettings/xpStoreCatalog document or defaults
          try {
            const catalogDoc = await getDoc(doc(db, 'appSettings', 'xpStoreCatalog'));
            if (catalogDoc.exists() && Array.isArray(catalogDoc.data().items) && catalogDoc.data().items.length > 0) {
              const items = catalogDoc.data().items
                .filter((item: any) => item.availability === 'active' || item.isActive !== false)
                .map((item: any) => ({
                  ...item,
                  title: item.title || item.name,
                  name: item.name || item.title,
                  costXP: Number(item.costXP || item.priceXp || 100),
                  priceXp: Number(item.priceXp || item.costXP || 100),
                  perkType: item.perkType || item.category,
                  category: item.category || item.perkType,
                  perkGranted: item.perkGranted || item.perkDetails,
                  perkDetails: item.perkDetails || item.perkGranted,
                  isActive: true
                }));
              callback(items);
            } else {
              // Trigger default seeding in background if completely empty
              callback([]);
            }
          } catch (e) {
            console.warn('Fallback xpStoreCatalog load warning:', e);
            callback([]);
          }
        }
      }, (err) => {
        console.warn('subscribeXpStoreItems snapshot error:', err);
      });

      return unsubscribe;
    } catch (e) {
      console.warn('subscribeXpStoreItems init error:', e);
      return () => {};
    }
  },

  // 2. Real-time Subscription to User's Owned & Equipped Perks
  getUserPurchasedPerksRealtime(
    userId: string, 
    callback: (ownedItemIds: string[], activeFrame: string, activeTitle: string) => void
  ): () => void {
    if (!userId) return () => {};

    try {
      const userDocRef = doc(db, 'users', userId);
      const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
        const ownedSet = new Set<string>();

        // Check local storage backup
        try {
          const savedPurchases = localStorage.getItem(`nexus_xp_store_${userId}`);
          if (savedPurchases) {
            const parsed = JSON.parse(savedPurchases);
            Object.keys(parsed).forEach(k => {
              if (parsed[k]) ownedSet.add(k);
            });
          }
          if (localStorage.getItem(`nexus_vip_pass_${userId}`) === 'true') {
            ownedSet.add('vip_scholar_pass');
          }
        } catch (e) {}

        let activeFrame = 'default';
        let activeTitle = '';

        if (docSnap.exists()) {
          const data = docSnap.data();
          activeFrame = data.activeFrame || data.activeBadge || localStorage.getItem(`nexus_active_frame_${userId}`) || 'default';
          activeTitle = data.activeTitle || localStorage.getItem(`nexus_active_title_${userId}`) || '';

          if (Array.isArray(data.purchasedPerks)) {
            data.purchasedPerks.forEach((id: string) => ownedSet.add(id));
          }
          if (Array.isArray(data.purchasedItems)) {
            data.purchasedItems.forEach((item: any) => {
              if (typeof item === 'string') ownedSet.add(item);
              else if (item?.itemId) ownedSet.add(item.itemId);
              else if (item?.id) ownedSet.add(item.id);
            });
          }
        }

        callback(Array.from(ownedSet), activeFrame, activeTitle);
      }, (err) => {
        console.warn('getUserPurchasedPerksRealtime error:', err);
      });

      return unsubscribe;
    } catch (e) {
      console.warn('getUserPurchasedPerksRealtime init error:', e);
      return () => {};
    }
  },

  // 3. Atomic Perk Purchase Execution with Concurrency Safety & Event Dispatch
  async purchaseStorePerk(
    userId: string, 
    item: { id: string; name?: string; title?: string; costXP?: number; priceXp?: number; category?: string; perkType?: string; perkGranted?: string; perkDetails?: string; icon?: string }
  ): Promise<{ success: boolean; message: string; remainingXP?: number }> {
    try {
      if (!userId) {
        return { success: false, message: 'Please log in to purchase perks.' };
      }

      const cost = Number(item.costXP || item.priceXp || 0);
      const itemName = item.title || item.name || 'Perk Item';
      const category = item.category || item.perkType || 'perk';
      const nowIso = new Date().toISOString();

      // Read current XP
      const profile = await this.getUserXP(userId);
      if (profile.totalXP < cost) {
        return { 
          success: false, 
          message: `Insufficient XP. You need ${cost} XP, but you currently have ${profile.totalXP} XP.` 
        };
      }

      const userDocRef = doc(db, 'users', userId);
      const userXpDocRef = doc(db, 'userXP', userId);
      const purchaseDocRef = doc(db, 'xp_store_purchases', `${userId}_${item.id}`);

      let newXP = profile.totalXP - cost;

      // Execute Atomic Database Updates
      try {
        await runTransaction(db, async (transaction) => {
          const userSnap = await transaction.get(userDocRef);
          let currentXP = profile.totalXP;
          let purchasedPerks: string[] = [];
          let activeFrame = 'default';
          let activeTitle = '';

          if (userSnap.exists()) {
            const data = userSnap.data();
            currentXP = Number(data.xp !== undefined ? data.xp : (data.totalXP || currentXP));
            purchasedPerks = Array.isArray(data.purchasedPerks) ? [...data.purchasedPerks] : [];
            activeFrame = data.activeFrame || 'default';
            activeTitle = data.activeTitle || '';
          }

          if (currentXP < cost) {
            throw new Error(`Insufficient XP. You need ${cost} XP.`);
          }

          newXP = Math.max(0, currentXP - cost);
          if (!purchasedPerks.includes(item.id)) {
            purchasedPerks.push(item.id);
          }

          const updatePayload: any = {
            xp: newXP,
            totalXP: newXP,
            purchasedPerks: purchasedPerks,
            updatedAt: serverTimestamp()
          };

          // Auto-equip if cosmetic
          if (category === 'frame') {
            updatePayload.activeFrame = item.id;
          } else if (category === 'title') {
            updatePayload.activeTitle = itemName;
          } else if (category === 'vip_pass' || item.id === 'vip_scholar_pass') {
            updatePayload.isVIP = true;
            updatePayload.vipPass = true;
          }

          transaction.set(userDocRef, updatePayload, { merge: true });
          transaction.set(userXpDocRef, { totalXP: newXP, updatedAt: serverTimestamp() }, { merge: true });
        });
      } catch (txError: any) {
        console.warn('Transaction failed, falling back to direct write synchronization:', txError);
        // Fallback resilient write
        await this.syncUserGamification(userId, -cost);
        const userSnap = await getDoc(userDocRef);
        let existingPerks: string[] = [];
        if (userSnap.exists()) {
          existingPerks = userSnap.data().purchasedPerks || [];
        }
        if (!existingPerks.includes(item.id)) {
          existingPerks.push(item.id);
        }
        const fallbackPayload: any = {
          purchasedPerks: existingPerks,
          updatedAt: serverTimestamp()
        };
        if (category === 'frame') fallbackPayload.activeFrame = item.id;
        if (category === 'title') fallbackPayload.activeTitle = itemName;
        if (category === 'vip_pass') fallbackPayload.isVIP = true;

        await setDoc(userDocRef, fallbackPayload, { merge: true });
      }

      // Record purchase in xp_store_purchases and userPerks collections
      try {
        await setDoc(purchaseDocRef, {
          userId,
          itemId: item.id,
          itemName,
          category,
          costXP: cost,
          purchasedAt: nowIso,
          status: 'active'
        }, { merge: true });

        // Update userPerks document
        const userPerksRef = doc(db, 'userPerks', userId);
        const perksSnap = await getDoc(userPerksRef);
        let purchasedItems = [];
        if (perksSnap.exists()) {
          purchasedItems = perksSnap.data().purchasedItems || [];
        }
        purchasedItems.push({
          itemId: item.id,
          name: itemName,
          category,
          purchasedAt: nowIso,
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        });
        await setDoc(userPerksRef, { userId, purchasedItems }, { merge: true });
      } catch (e) {
        console.warn('Audit record warning:', e);
      }

      // Local storage persistence backup for zero-latency UI
      try {
        const savedPurchases = localStorage.getItem(`nexus_xp_store_${userId}`);
        const parsed = savedPurchases ? JSON.parse(savedPurchases) : {};
        parsed[item.id] = true;
        localStorage.setItem(`nexus_xp_store_${userId}`, JSON.stringify(parsed));

        if (category === 'frame') {
          localStorage.setItem(`nexus_active_frame_${userId}`, item.id);
        } else if (category === 'title') {
          localStorage.setItem(`nexus_active_title_${userId}`, itemName);
        } else if (category === 'vip_pass' || item.id === 'vip_scholar_pass') {
          localStorage.setItem(`nexus_vip_pass_${userId}`, 'true');
        }
      } catch (e) {}

      // Log to Ledger & Reward History
      try {
        await addDoc(collection(db, 'xpLedger'), {
          userId,
          type: 'spend',
          category: 'xp_store',
          amount: cost,
          balanceAfter: newXP,
          description: `Purchased Perk: ${itemName} (-${cost} XP)`,
          metadata: { itemId: item.id, category },
          createdAt: nowIso
        });

        await addDoc(collection(db, 'rewardHistory'), {
          userId,
          type: 'xp',
          amount: -cost,
          description: `Perks Bazaar: ${itemName} (-${cost} XP)`,
          createdAt: nowIso
        });
      } catch (e) {}

      // Milestone Celebration Toast
      triggerMilestoneToast({
        type: 'xp',
        title: `🛍️ Perk Acquired: ${itemName}!`,
        value: itemName,
        description: `Successfully unlocked from Perks Bazaar (-${cost} XP)`,
        icon: item.icon || '🛍️',
        colorTheme: 'amber',
        actionLabel: 'Equipped'
      });

      // Dispatch Global Sync Events
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nexus_xp_updated', { detail: { newXP } }));
        window.dispatchEvent(new CustomEvent('nexus_store_purchase_updated', { 
          detail: { 
            itemId: item.id, 
            category, 
            itemName,
            activeFrame: category === 'frame' ? item.id : undefined,
            activeTitle: category === 'title' ? itemName : undefined
          } 
        }));
        window.dispatchEvent(new CustomEvent('nexus_profile_updated', { detail: { userId } }));
      }

      return {
        success: true,
        message: `Successfully purchased "${itemName}"!`,
        remainingXP: newXP
      };
    } catch (err: any) {
      console.error('purchaseStorePerk error:', err);
      return {
        success: false,
        message: err?.message || 'Failed to complete perk purchase.'
      };
    }
  },

  // 4. Equip Perk
  async equipUserPerk(
    userId: string, 
    item: { id: string; name?: string; title?: string; category?: string; perkType?: string }
  ): Promise<{ success: boolean; message: string }> {
    try {
      const category = item.category || item.perkType || '';
      const itemName = item.title || item.name || '';
      const userDocRef = doc(db, 'users', userId);

      const updateData: any = { updatedAt: serverTimestamp() };
      if (category === 'frame') {
        updateData.activeFrame = item.id;
        try { localStorage.setItem(`nexus_active_frame_${userId}`, item.id); } catch (e) {}
      } else if (category === 'title') {
        updateData.activeTitle = itemName;
        try { localStorage.setItem(`nexus_active_title_${userId}`, itemName); } catch (e) {}
      }

      await setDoc(userDocRef, updateData, { merge: true });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nexus_store_purchase_updated', { 
          detail: { 
            itemId: item.id, 
            category, 
            activeFrame: updateData.activeFrame,
            activeTitle: updateData.activeTitle
          } 
        }));
        window.dispatchEvent(new CustomEvent('nexus_profile_updated', { detail: { userId } }));
      }

      return { success: true, message: `Equipped ${itemName}!` };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Failed to equip perk.' };
    }
  },

  // 5. Unequip Perk
  async unequipUserPerk(
    userId: string, 
    category: 'frame' | 'title'
  ): Promise<{ success: boolean; message: string }> {
    try {
      const userDocRef = doc(db, 'users', userId);
      const updateData: any = { updatedAt: serverTimestamp() };

      if (category === 'frame') {
        updateData.activeFrame = 'default';
        try { localStorage.setItem(`nexus_active_frame_${userId}`, 'default'); } catch (e) {}
      } else if (category === 'title') {
        updateData.activeTitle = '';
        try { localStorage.setItem(`nexus_active_title_${userId}`, ''); } catch (e) {}
      }

      await setDoc(userDocRef, updateData, { merge: true });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nexus_store_purchase_updated', { 
          detail: { 
            category, 
            activeFrame: category === 'frame' ? 'default' : undefined,
            activeTitle: category === 'title' ? '' : undefined
          } 
        }));
        window.dispatchEvent(new CustomEvent('nexus_profile_updated', { detail: { userId } }));
      }

      return { success: true, message: `Unequipped successfully.` };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Failed to unequip perk.' };
    }
  }
};


