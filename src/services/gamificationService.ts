import { db, auth } from './firebase';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, orderBy, limit, serverTimestamp, increment, addDoc } from 'firebase/firestore';

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

export interface GamificationBadge {
  badgeId: string;
  name: string;
  description: string;
  icon: string; // lucide icon name or emoji
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

export const RANKS = [
  { maxLevel: 5, name: 'Beginner' },
  { maxLevel: 10, name: 'Learner' },
  { maxLevel: 20, name: 'Skilled' },
  { maxLevel: 30, name: 'Advanced' },
  { maxLevel: 50, name: 'Expert' },
  { maxLevel: 100, name: 'Master' },
];

export const getLevelFromXP = (xp: number) => {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
};

export const getRankFromLevel = (level: number) => {
  for (const r of RANKS) {
    if (level <= r.maxLevel) return r.name;
  }
  return 'Legend';
};

const getTodayDateString = () => {
  return new Date().toISOString().split('T')[0];
};

export const gamificationService = {
  // Initialize or get UserXP
  async getUserXP(userId: string): Promise<UserXP> {
    try {
      const docRef = doc(db, 'userXP', userId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as UserXP;
      }
      
      const newProfile: UserXP = {
        userId,
        totalXP: 0,
        currentLevel: 1,
        rank: 'Beginner',
        learningPoints: 0,
        updatedAt: new Date().toISOString()
      };
      await setDoc(docRef, newProfile);
      return newProfile;
    } catch (error) {
      console.warn("Failed to get UserXP:", error);
      return { userId, totalXP: 0, currentLevel: 1, rank: 'Beginner', learningPoints: 0, updatedAt: new Date().toISOString() };
    }
  },

  // Initialize or get Daily Streak
  async getDailyStreak(userId: string): Promise<DailyStreak> {
    try {
      const docRef = doc(db, 'dailyStreak', userId);
      const snap = await getDoc(docRef);
      const today = getTodayDateString();
      
      if (snap.exists()) {
        const data = snap.data() as DailyStreak;
        
        // Check if streak is broken
        const lastDate = new Date(data.lastActivityDate);
        const currentDate = new Date(today);
        const diffTime = Math.abs(currentDate.getTime() - lastDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays > 1 && data.lastActivityDate !== today) {
          // Streak broken
          data.currentStreak = 0;
          data.todayStudyMinutes = 0;
          data.lastActivityDate = today;
          data.updatedAt = new Date().toISOString();
          await updateDoc(docRef, { ...data });
        } else if (diffDays === 1) {
          // New day, reset today's minutes
          data.todayStudyMinutes = 0;
          await updateDoc(docRef, { todayStudyMinutes: 0 });
        }
        
        return data;
      }
      
      const newStreak: DailyStreak = {
        userId,
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: today,
        todayStudyMinutes: 0,
        updatedAt: new Date().toISOString()
      };
      await setDoc(docRef, newStreak);
      return newStreak;
    } catch (error) {
      console.warn("Failed to get DailyStreak:", error);
      return { userId, currentStreak: 0, longestStreak: 0, lastActivityDate: getTodayDateString(), todayStudyMinutes: 0, updatedAt: new Date().toISOString() };
    }
  },

  // Add XP and potentially level up
  async addXP(userId: string, amount: number, description: string): Promise<{ leveledUp: boolean, newLevel: number, newBadge?: any }> {
    try {
      const profile = await this.getUserXP(userId);
      const newXP = profile.totalXP + amount;
      const newLevel = getLevelFromXP(newXP);
      const newRank = getRankFromLevel(newLevel);
      const leveledUp = newLevel > profile.currentLevel;

      await updateDoc(doc(db, 'userXP', userId), {
        totalXP: newXP,
        currentLevel: newLevel,
        rank: newRank,
        learningPoints: increment(amount / 10), // Example: 1 LP for every 10 XP
        updatedAt: new Date().toISOString()
      });

      // Record History
      await addDoc(collection(db, 'rewardHistory'), {
        userId,
        type: 'xp',
        amount,
        description,
        createdAt: new Date().toISOString()
      });

      return { leveledUp, newLevel };
    } catch (error) {
      console.error("Failed to add XP:", error);
      return { leveledUp: false, newLevel: 1 };
    }
  },

  // Update Daily Streak Activity
  async updateActivity(userId: string, minutes: number = 0): Promise<{ streakIncreased: boolean, newStreak: number }> {
    try {
      const streak = await this.getDailyStreak(userId);
      const today = getTodayDateString();
      let streakIncreased = false;
      let newStreak = streak.currentStreak;

      if (streak.lastActivityDate !== today || streak.currentStreak === 0) {
        // First activity of the day
        newStreak += 1;
        streakIncreased = true;
      }

      const updates: any = {
        currentStreak: newStreak,
        lastActivityDate: today,
        updatedAt: new Date().toISOString()
      };

      if (minutes > 0) {
        updates.todayStudyMinutes = increment(minutes);
      }

      if (newStreak > streak.longestStreak) {
        updates.longestStreak = newStreak;
      }

      await updateDoc(doc(db, 'dailyStreak', userId), updates);

      // Check for streak badges
      if (streakIncreased) {
        await this.addXP(userId, 10, 'Daily Login Streak');
        if (newStreak === 7) await this.unlockAchievement(userId, 'streak_7', '7-Day Streak', 'Studied for 7 days in a row!', '🔥');
        if (newStreak === 30) await this.unlockAchievement(userId, 'streak_30', '30-Day Streak', 'Studied for 30 days in a row!', '🌟');
      }

      return { streakIncreased, newStreak };
    } catch (error) {
      console.error("Failed to update activity:", error);
      return { streakIncreased: false, newStreak: 0 };
    }
  },

  // Unlock an achievement
  async unlockAchievement(userId: string, badgeType: string, title: string, description: string, icon: string) {
    try {
      // Check if already unlocked
      const q = query(collection(db, 'achievements'), where('userId', '==', userId), where('badgeType', '==', badgeType));
      const snap = await getDocs(q);
      if (!snap.empty) return; // Already unlocked

      await addDoc(collection(db, 'achievements'), {
        userId,
        badgeType,
        title,
        description,
        icon,
        unlockedAt: new Date().toISOString()
      });

      await this.addXP(userId, 100, `Badge Unlocked: ${title}`);
    } catch (error) {
      console.error("Failed to unlock achievement:", error);
    }
  },

  // Get User Achievements
  async getUserAchievements(userId: string): Promise<AchievementBadge[]> {
    try {
      const q = query(collection(db, 'achievements'), where('userId', '==', userId));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ achievementId: d.id, ...d.data() } as AchievementBadge));
      return list.sort((a, b) => new Date(b.unlockedAt || 0).getTime() - new Date(a.unlockedAt || 0).getTime());
    } catch (error) {
      console.error("Failed to get achievements:", error);
      return [];
    }
  },

  // Get Reward History
  async getRewardHistory(userId: string): Promise<RewardHistory[]> {
    try {
      const q = query(collection(db, 'rewardHistory'), where('userId', '==', userId));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ historyId: d.id, ...d.data() } as RewardHistory));
      return list
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 50);
    } catch (error) {
      console.error("Failed to get reward history:", error);
      return [];
    }
  },

  // Get Leaderboard (Top XP)
  async getLeaderboard(limitCount = 10): Promise<{ userId: string, totalXP: number, currentLevel: number, rank: string }[]> {
    try {
      const q = query(collection(db, 'userXP'), orderBy('totalXP', 'desc'), limit(limitCount));
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as any);
    } catch (error) {
      console.error("Failed to get leaderboard:", error);
      return [];
    }
  },

  // Generate and Get Daily Goals
  async getDailyGoals(userId: string): Promise<DailyGoal[]> {
    try {
      const today = getTodayDateString();
      const q = query(collection(db, 'dailyGoals'), where('userId', '==', userId), where('date', '==', today));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        return snap.docs.map(d => ({ goalId: d.id, ...d.data() } as DailyGoal));
      }

      // Generate new goals for today
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
      console.error("Failed to get daily goals:", error);
      return [];
    }
  },

  // Update Goal Progress
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
            
            await updateDoc(docSnap.ref, {
              progress: newProgress,
              completed
            });

            if (completed) {
              await this.addXP(userId, goal.xpReward, `Completed Daily Goal: ${goal.title}`);
            }
          }
        }
      }
    } catch (error) {
      console.error("Failed to update goal progress:", error);
    }
  }
};
