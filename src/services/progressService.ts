import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  query, 
  where, 
  getDoc,
  addDoc,
  updateDoc
} from 'firebase/firestore';
import { db } from './firebase';

export interface MyCourseRelation {
  userId: string;
  userEmail?: string;
  courseId: string;
  enrollmentDate: string;
  lastOpenedDate: string;
  totalProgress: number; // 0 - 100
  lastLessonId: string;
  isCompleted: boolean;
  status?: string;
}

export interface CourseProgressInfo {
  userId: string;
  courseId: string;
  progressPercent: number; // 0 - 100
  totalLessons: number;
  completedLessons: number;
  lastOpenedDate: string;
}

export interface LessonProgressInfo {
  userId: string;
  courseId: string;
  lessonId: string;
  completed: boolean;
  watchedPercentage: number; // 0 - 100
  lastUpdated: string;
  lastPositionSeconds?: number;
  durationSeconds?: number;
}

export interface LearningHistoryEntry {
  userId: string;
  courseId: string;
  lessonId: string;
  action: 'opened' | 'completed';
  timestamp: string;
}

export const progressService = {
  // Initialize user progress when a course is enrolled/purchased
  async initializeUserProgress(userId: string, courseId: string, totalLessonsCount = 10): Promise<void> {
    const nowISO = new Date().toISOString();
    
    const myCourseDoc: MyCourseRelation = {
      userId,
      courseId,
      enrollmentDate: nowISO,
      lastOpenedDate: nowISO,
      totalProgress: 0,
      lastLessonId: '',
      isCompleted: false
    };

    const courseProgressDoc: CourseProgressInfo = {
      userId,
      courseId,
      progressPercent: 0,
      totalLessons: totalLessonsCount,
      completedLessons: 0,
      lastOpenedDate: nowISO
    };

    // 1. Write to Firestore
    try {
      await setDoc(doc(db, 'myCourses', `${userId}_${courseId}`), myCourseDoc);
      await setDoc(doc(db, 'courseProgress', `${userId}_${courseId}`), courseProgressDoc);
      console.log(`Successfully initialized progress collections in Firestore for ${courseId}`);
    } catch (err) {
      console.warn('Firestore write failed, using local storage fallback for user progress initiation:', err);
    }

    // 2. Always maintain local storage sync
    const localMyCourses = JSON.parse(localStorage.getItem('nexus_my_courses') || '[]');
    if (!localMyCourses.some((item: any) => item.userId === userId && item.courseId === courseId)) {
      localMyCourses.push(myCourseDoc);
      localStorage.setItem('nexus_my_courses', JSON.stringify(localMyCourses));
    }

    const localCourseProg = JSON.parse(localStorage.getItem('nexus_course_progress') || '[]');
    const progIndex = localCourseProg.findIndex((item: any) => item.userId === userId && item.courseId === courseId);
    if (progIndex > -1) {
      localCourseProg[progIndex] = courseProgressDoc;
    } else {
      localCourseProg.push(courseProgressDoc);
    }
    localStorage.setItem('nexus_course_progress', JSON.stringify(localCourseProg));
  },

  // Get user's purchased/enrolled courses matching userId OR userEmail (case-insensitive)
  async getUserMyCourses(userId: string, userEmail?: string): Promise<MyCourseRelation[]> {
    const firestoreResults: MyCourseRelation[] = [];
    const cleanEmail = userEmail ? userEmail.trim().toLowerCase() : '';

    try {
      // 1. Query by userId
      if (userId) {
        const qUser = query(collection(db, 'myCourses'), where('userId', '==', userId));
        const snapUser = await getDocs(qUser);
        snapUser.docs.forEach(d => firestoreResults.push(d.data() as MyCourseRelation));
      }

      // 2. Query by lowercased userEmail if provided
      if (cleanEmail) {
        const qEmail = query(collection(db, 'myCourses'), where('userEmail', '==', cleanEmail));
        const snapEmail = await getDocs(qEmail);
        snapEmail.docs.forEach(d => firestoreResults.push(d.data() as MyCourseRelation));
      }
    } catch (err) {
      console.warn('Failed to fetch myCourses from Firestore, using local fallback:', err);
    }

    // Local fallback
    const localMyCourses: MyCourseRelation[] = JSON.parse(localStorage.getItem('nexus_my_courses') || '[]');
    const localMatched = localMyCourses.filter((item: any) => 
      (userId && item.userId === userId) || 
      (cleanEmail && item.userEmail?.toLowerCase() === cleanEmail)
    );

    // Merge unique by courseId
    const map = new Map<string, MyCourseRelation>();
    firestoreResults.forEach(r => map.set(r.courseId, r));
    localMatched.forEach(r => {
      if (!map.has(r.courseId)) {
        map.set(r.courseId, r);
      }
    });

    const combined = Array.from(map.values());
    if (combined.length > 0) {
      localStorage.setItem('nexus_my_courses', JSON.stringify(combined));
    }
    return combined;
  },

  // Get course-level progress info
  async getCourseProgress(userId: string, courseId: string): Promise<CourseProgressInfo | null> {
    try {
      const snap = await getDoc(doc(db, 'courseProgress', `${userId}_${courseId}`));
      if (snap.exists()) {
        return snap.data() as CourseProgressInfo;
      }
    } catch (err) {
      console.warn('Failed to fetch courseProgress from Firestore, using local fallback:', err);
    }

    const localCourseProg = JSON.parse(localStorage.getItem('nexus_course_progress') || '[]');
    const found = localCourseProg.find((item: any) => item.userId === userId && item.courseId === courseId);
    return found || null;
  },

  // Get individual lesson progresses for a course
  async getLessonProgresses(userId: string, courseId: string): Promise<LessonProgressInfo[]> {
    try {
      const q = query(
        collection(db, 'lessonProgress'),
        where('userId', '==', userId),
        where('courseId', '==', courseId)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const results = snap.docs.map(d => d.data() as LessonProgressInfo);
        
        // Sync to local storage
        const allLocal = JSON.parse(localStorage.getItem('nexus_lesson_progress') || '[]');
        const filteredLocal = allLocal.filter((l: any) => !(l.userId === userId && l.courseId === courseId));
        localStorage.setItem('nexus_lesson_progress', JSON.stringify([...filteredLocal, ...results]));
        
        return results;
      }
    } catch (err) {
      console.warn('Failed to fetch lessonProgresses from Firestore, using local fallback:', err);
    }

    const localLessonProg = JSON.parse(localStorage.getItem('nexus_lesson_progress') || '[]');
    return localLessonProg.filter((item: any) => item.userId === userId && item.courseId === courseId);
  },

  // Get all lesson progress for a user across all courses
  async getAllUserLessonProgresses(userId: string): Promise<LessonProgressInfo[]> {
    if (!userId) return [];
    try {
      const q = query(
        collection(db, 'lessonProgress'),
        where('userId', '==', userId)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const results = snap.docs.map(d => d.data() as LessonProgressInfo);
        localStorage.setItem('nexus_lesson_progress', JSON.stringify(results));
        return results;
      }
    } catch (err) {
      console.warn('Failed to fetch all user lessonProgresses from Firestore, using local fallback:', err);
    }

    const localLessonProg = JSON.parse(localStorage.getItem('nexus_lesson_progress') || '[]');
    return localLessonProg.filter((item: any) => item.userId === userId);
  },

  // Update a single lesson progress and recalculate course progress percentage
  async updateLessonProgress(
    userId: string,
    courseId: string,
    lessonId: string,
    completed: boolean,
    watchedPercentage: number,
    totalCourseLessonsCount = 10,
    lastPositionSeconds?: number,
    durationSeconds?: number
  ): Promise<void> {
    const nowISO = new Date().toISOString();

    // Preserve completed status if already marked completed
    const localLessons = JSON.parse(localStorage.getItem('nexus_lesson_progress') || '[]');
    const existingIdx = localLessons.findIndex((l: any) => l.userId === userId && l.courseId === courseId && l.lessonId === lessonId);
    const isAlreadyCompleted = existingIdx > -1 && localLessons[existingIdx].completed;
    const finalCompleted = completed || isAlreadyCompleted;
    const finalWatchedPercentage = finalCompleted ? 100 : watchedPercentage;

    const lessonDoc: LessonProgressInfo = {
      userId,
      courseId,
      lessonId,
      completed: finalCompleted,
      watchedPercentage: finalWatchedPercentage,
      lastUpdated: nowISO,
      ...(lastPositionSeconds !== undefined ? { lastPositionSeconds } : {}),
      ...(durationSeconds !== undefined ? { durationSeconds } : {})
    };

    // 1. Write lesson progress to Firestore
    try {
      await setDoc(doc(db, 'lessonProgress', `${userId}_${courseId}_${lessonId}`), lessonDoc);
    } catch (err) {
      console.warn('Failed saving single lesson progress to Firestore:', err);
    }

    // Update lesson progress in local storage
    if (existingIdx > -1) {
      localLessons[existingIdx] = lessonDoc;
    } else {
      localLessons.push(lessonDoc);
    }
    localStorage.setItem('nexus_lesson_progress', JSON.stringify(localLessons));

    // 2. Fetch all lesson progress for this course to calculate new completion metrics
    const lessonsForThisCourse = localLessons.filter((l: any) => l.userId === userId && l.courseId === courseId);
    const completedCount = lessonsForThisCourse.filter((l: any) => l.completed).length;
    const computedPercentage = Math.min(100, Math.round((completedCount / totalCourseLessonsCount) * 100));

    // Update courseProgress
    const courseProgressDoc: CourseProgressInfo = {
      userId,
      courseId,
      progressPercent: computedPercentage,
      totalLessons: totalCourseLessonsCount,
      completedLessons: completedCount,
      lastOpenedDate: nowISO
    };

    try {
      await setDoc(doc(db, 'courseProgress', `${userId}_${courseId}`), courseProgressDoc);
    } catch (err) {
      console.warn('Failed saving course progress to Firestore:', err);
    }

    const localCourseProg = JSON.parse(localStorage.getItem('nexus_course_progress') || '[]');
    const cpIdx = localCourseProg.findIndex((item: any) => item.userId === userId && item.courseId === courseId);
    if (cpIdx > -1) {
      localCourseProg[cpIdx] = courseProgressDoc;
    } else {
      localCourseProg.push(courseProgressDoc);
    }
    localStorage.setItem('nexus_course_progress', JSON.stringify(localCourseProg));

    // Update myCourses collection relation
    const localMyCourses = JSON.parse(localStorage.getItem('nexus_my_courses') || '[]');
    const myIdx = localMyCourses.findIndex((item: any) => item.userId === userId && item.courseId === courseId);
    
    let isCompleted = computedPercentage === 100;
    
    let updatedRelation: MyCourseRelation;
    if (myIdx > -1) {
      updatedRelation = {
        ...localMyCourses[myIdx],
        lastOpenedDate: nowISO,
        totalProgress: computedPercentage,
        lastLessonId: lessonId,
        isCompleted: isCompleted
      };
      localMyCourses[myIdx] = updatedRelation;
    } else {
      updatedRelation = {
        userId,
        courseId,
        enrollmentDate: nowISO,
        lastOpenedDate: nowISO,
        totalProgress: computedPercentage,
        lastLessonId: lessonId,
        isCompleted: isCompleted
      };
      localMyCourses.push(updatedRelation);
    }
    localStorage.setItem('nexus_my_courses', JSON.stringify(localMyCourses));

    try {
      await setDoc(doc(db, 'myCourses', `${userId}_${courseId}`), updatedRelation);
    } catch (err) {
      console.warn('Failed saving myCourses relation to Firestore:', err);
    }

    // 3. Log a history event
    await this.addLearningHistory(userId, courseId, lessonId, completed ? 'completed' : 'opened');
  },

  // Toggle or explicitly set lesson completion status
  async setLessonCompletionStatus(
    userId: string,
    courseId: string,
    lessonId: string,
    completed: boolean,
    totalCourseLessonsCount = 10
  ): Promise<void> {
    const nowISO = new Date().toISOString();

    const lessonDoc: LessonProgressInfo = {
      userId,
      courseId,
      lessonId,
      completed,
      watchedPercentage: completed ? 100 : 0,
      lastUpdated: nowISO
    };

    // 1. Write to Firestore
    try {
      await setDoc(doc(db, 'lessonProgress', `${userId}_${courseId}_${lessonId}`), lessonDoc);
    } catch (err) {
      console.warn('Failed saving lesson toggle status to Firestore:', err);
    }

    // 2. Update local storage
    const localLessons = JSON.parse(localStorage.getItem('nexus_lesson_progress') || '[]');
    const idx = localLessons.findIndex((l: any) => l.userId === userId && l.courseId === courseId && l.lessonId === lessonId);
    if (idx > -1) {
      localLessons[idx] = lessonDoc;
    } else {
      localLessons.push(lessonDoc);
    }
    localStorage.setItem('nexus_lesson_progress', JSON.stringify(localLessons));

    // 3. Recalculate course completion metrics
    const lessonsForThisCourse = localLessons.filter((l: any) => l.userId === userId && l.courseId === courseId);
    const completedCount = lessonsForThisCourse.filter((l: any) => l.completed).length;
    const computedPercentage = Math.min(100, Math.round((completedCount / totalCourseLessonsCount) * 100));

    const courseProgressDoc: CourseProgressInfo = {
      userId,
      courseId,
      progressPercent: computedPercentage,
      totalLessons: totalCourseLessonsCount,
      completedLessons: completedCount,
      lastOpenedDate: nowISO
    };

    try {
      await setDoc(doc(db, 'courseProgress', `${userId}_${courseId}`), courseProgressDoc);
    } catch (err) {
      console.warn('Failed saving course progress to Firestore:', err);
    }

    const localCourseProg = JSON.parse(localStorage.getItem('nexus_course_progress') || '[]');
    const cpIdx = localCourseProg.findIndex((item: any) => item.userId === userId && item.courseId === courseId);
    if (cpIdx > -1) {
      localCourseProg[cpIdx] = courseProgressDoc;
    } else {
      localCourseProg.push(courseProgressDoc);
    }
    localStorage.setItem('nexus_course_progress', JSON.stringify(localCourseProg));

    // Update myCourses collection relation
    const localMyCourses = JSON.parse(localStorage.getItem('nexus_my_courses') || '[]');
    const myIdx = localMyCourses.findIndex((item: any) => item.userId === userId && item.courseId === courseId);
    
    let isCompleted = computedPercentage === 100;
    let updatedRelation: MyCourseRelation;
    if (myIdx > -1) {
      updatedRelation = {
        ...localMyCourses[myIdx],
        lastOpenedDate: nowISO,
        totalProgress: computedPercentage,
        lastLessonId: lessonId,
        isCompleted: isCompleted
      };
      localMyCourses[myIdx] = updatedRelation;
    } else {
      updatedRelation = {
        userId,
        courseId,
        enrollmentDate: nowISO,
        lastOpenedDate: nowISO,
        totalProgress: computedPercentage,
        lastLessonId: lessonId,
        isCompleted: isCompleted
      };
      localMyCourses.push(updatedRelation);
    }
    localStorage.setItem('nexus_my_courses', JSON.stringify(localMyCourses));

    try {
      await setDoc(doc(db, 'myCourses', `${userId}_${courseId}`), updatedRelation);
    } catch (err) {
      console.warn('Failed saving myCourses relation to Firestore:', err);
    }

    // 4. Learning history
    await this.addLearningHistory(userId, courseId, lessonId, completed ? 'completed' : 'opened');
  },

  // Save learning history audit log
  async addLearningHistory(
    userId: string,
    courseId: string,
    lessonId: string,
    action: 'opened' | 'completed'
  ): Promise<void> {
    const nowISO = new Date().toISOString();
    const historyDoc: LearningHistoryEntry = {
      userId,
      courseId,
      lessonId,
      action,
      timestamp: nowISO
    };

    try {
      await addDoc(collection(db, 'learningHistory'), historyDoc);
    } catch (err) {
      console.warn('Failed adding learning history to Firestore:', err);
    }

    const localHistory = JSON.parse(localStorage.getItem('nexus_learning_history') || '[]');
    localHistory.push(historyDoc);
    localStorage.setItem('nexus_learning_history', JSON.stringify(localHistory));
  }
};
