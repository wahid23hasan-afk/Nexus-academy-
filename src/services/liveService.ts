import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  deleteDoc, 
  updateDoc 
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { LiveClass, LiveAttendance, LiveChatMessage, LiveReminder } from '../types/live';

class LiveService {
  private classesColl = 'liveClasses';
  private attendanceColl = 'liveAttendance';
  private chatColl = 'liveChat';
  private remindersColl = 'liveReminders';

  /**
   * Helper to generate dynamic live class schedule relative to current time.
   */
  private generateDynamicMockClasses(courseId: string = 'course-web-dev'): LiveClass[] {
    const now = new Date();
    
    // 1. LIVE NOW Class (started 10 mins ago, ends in 50 mins)
    const liveStart = new Date(now.getTime() - 10 * 60 * 1000);
    const liveEnd = new Date(now.getTime() + 50 * 60 * 1000);

    // 2. UPCOMING Class (starts in 2 hours)
    const upcomingStart = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const upcomingEnd = new Date(now.getTime() + 3 * 60 * 60 * 1000);

    // 3. COMPLETED Class (occurred 2 days ago)
    const completedStart = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const completedEnd = new Date(now.getTime() - (2 * 24 * 60 * 60 * 1000) + 60 * 60 * 1000);

    // 4. MISSED Class (occurred 1 day ago)
    const missedStart = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    const missedEnd = new Date(now.getTime() - (1 * 24 * 60 * 60 * 1000) + 90 * 60 * 1000);

    return [
      {
        classId: 'live-now-react',
        courseId,
        title: '🔴 Interactive Live Workspace: Node.js Stream Buffers & REST APIs',
        instructor: 'Engr. Jamil Ahmed',
        instructorPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
        subject: 'Backend Architecture',
        description: 'Deep dive session on stream pipe architectures, microservices, Express buffers, and real-time socket polling with live coding and Q&A workspace support.',
        requirements: ['Basic Node.js knowledge', 'Enrolled in Full-Stack program', 'Familiarity with Postman'],
        startTime: liveStart.toISOString(),
        endTime: liveEnd.toISOString(),
        duration: 60,
        status: 'live',
        thumbnail: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80',
        banner: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&auto=format&fit=crop&q=80',
        streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        createdAt: new Date().toISOString()
      },
      {
        classId: 'live-upcoming-web',
        courseId,
        title: '🚀 Upcoming: Deploying Production Systems with Docker & Cloud Run',
        instructor: 'Engr. Jamil Ahmed',
        instructorPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
        subject: 'DevOps & Deployment',
        description: 'Learn the complete workflow of containerizing full-stack systems, optimizing base images, declaring secrets, and targeting high-availability hosting.',
        requirements: ['Docker Desktop installed', 'Enrolled in Full-Stack program', 'Google Cloud Sandbox account'],
        startTime: upcomingStart.toISOString(),
        endTime: upcomingEnd.toISOString(),
        duration: 60,
        status: 'upcoming',
        thumbnail: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&auto=format&fit=crop&q=80',
        banner: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&auto=format&fit=crop&q=80',
        createdAt: new Date().toISOString()
      },
      {
        classId: 'live-completed-react',
        courseId,
        title: '🎓 Completed: Advanced Custom React Hooks & State Orchestration',
        instructor: 'Engr. Jamil Ahmed',
        instructorPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
        subject: 'Frontend Architecture',
        description: 'Comprehensive analysis of state reconciliation, useRef memory managers, useReducer configurations, and custom hook extraction logic.',
        requirements: ['Advanced JavaScript ES6', 'Familiarity with functional React props'],
        startTime: completedStart.toISOString(),
        endTime: completedEnd.toISOString(),
        duration: 60,
        status: 'completed',
        thumbnail: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=600&auto=format&fit=crop&q=80',
        banner: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=1200&auto=format&fit=crop&q=80',
        recordingUrl: 'https://media.w3.org/2010/05/sintel/trailer_hd.mp4',
        notesUrl: 'https://example.com/assets/react-advanced-hooks-notes.pdf',
        createdAt: new Date().toISOString()
      },
      {
        classId: 'live-missed-ielts',
        courseId: 'course-web-dev', // Mapping to this so the user is enrolled and can see it
        title: '📝 Completed: High-Velocity Mock Exam Breakdown & Writing Rubrics',
        instructor: 'Ms. Sarah Connor',
        instructorPhoto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
        subject: 'IELTS Preparation',
        description: 'Analyzing essay tasks, dynamic vocabulary insertions, cohesive layout techniques, and high-band score execution models under exam stress.',
        requirements: ['English standard fluency', 'Notebook or notepad'],
        startTime: missedStart.toISOString(),
        endTime: missedEnd.toISOString(),
        duration: 90,
        status: 'completed',
        thumbnail: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&auto=format&fit=crop&q=80',
        banner: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1200&auto=format&fit=crop&q=80',
        recordingUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        notesUrl: 'https://example.com/assets/ielts-writing-rubrics.pdf',
        createdAt: new Date().toISOString()
      }
    ];
  }

  /**
   * Seed dynamic classes in Firestore database if not present.
   */
  async ensureSeededClasses(courseId: string = 'course-web-dev'): Promise<LiveClass[]> {
    try {
      const q = query(collection(db, this.classesColl));
      let snapshot;
      try {
        snapshot = await getDocs(q);
      } catch (readErr) {
        console.warn('Could not read live classes from Firestore, fallback to mock data:', readErr);
        return this.generateDynamicMockClasses(courseId);
      }

      const list: LiveClass[] = [];
      snapshot.forEach(doc => {
        list.push(doc.data() as LiveClass);
      });

      // If database is completely empty, seed default initial mock classes
      if (list.length === 0 && auth.currentUser) {
        try {
          const freshMocks = this.generateDynamicMockClasses(courseId);
          for (const item of freshMocks) {
            const ref = doc(db, this.classesColl, item.classId);
            await setDoc(ref, item, { merge: true });
          }

          const finalSnapshot = await getDocs(q);
          const finalList: LiveClass[] = [];
          finalSnapshot.forEach(doc => {
            finalList.push(doc.data() as LiveClass);
          });
          return finalList.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        } catch (writeErr) {
          console.warn('Bypassing Firestore write during initial seeding:', writeErr);
        }
      }

      if (list.length > 0) {
        return list.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      }
      return this.generateDynamicMockClasses(courseId);
    } catch (err) {
      console.error('Error seeding/fetching live classes:', err);
      return this.generateDynamicMockClasses(courseId);
    }
  }

  /**
   * Listen to real-time live class list changes.
   */
  listenToLiveClasses(callback: (classes: LiveClass[]) => void) {
    const q = query(collection(db, this.classesColl));
    return onSnapshot(q, (snapshot) => {
      const list: LiveClass[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as LiveClass);
      });
      callback(list.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()));
    }, (err) => {
      console.warn('Silent live classes onSnapshot warning:', err);
    });
  }

  /**
   * Save / Publish / Update a Live Class in Firestore
   */
  async saveLiveClass(liveClass: LiveClass): Promise<void> {
    try {
      const ref = doc(db, this.classesColl, liveClass.classId);
      await setDoc(ref, liveClass, { merge: true });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nexus_live_class_updated', { detail: liveClass }));
      }
    } catch (err) {
      console.error('Error saving live class:', err);
      throw err;
    }
  }

  /**
   * Delete a Live Class from Firestore
   */
  async deleteLiveClass(classId: string): Promise<void> {
    try {
      const ref = doc(db, this.classesColl, classId);
      await deleteDoc(ref);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nexus_live_class_updated', { detail: { classId, deleted: true } }));
      }
    } catch (err) {
      console.error('Error deleting live class:', err);
      throw err;
    }
  }

  /**
   * Get all live classes.
   */
  async getLiveClasses(courseId: string = 'course-web-dev'): Promise<LiveClass[]> {
    return this.ensureSeededClasses(courseId);
  }

  /**
   * Get single live class details.
   */
  async getLiveClass(classId: string): Promise<LiveClass | null> {
    try {
      const ref = doc(db, this.classesColl, classId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        return snap.data() as LiveClass;
      }
      return null;
    } catch (err) {
      console.error('Error getting live class:', err);
      return null;
    }
  }

  /**
   * Listen to real-time chat messages for a specific class.
   */
  listenToLiveChat(classId: string, callback: (messages: LiveChatMessage[]) => void) {
    const q = query(
      collection(db, this.chatColl),
      where('classId', '==', classId),
      orderBy('timestamp', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
      const messages: LiveChatMessage[] = [];
      snapshot.forEach((doc) => {
        messages.push({ chatId: doc.id, ...doc.data() } as LiveChatMessage);
      });
      callback(messages);
    }, (err) => {
      console.warn('Silent live chat onSnapshot warning:', err);
    });
  }

  /**
   * Send a real-time chat message.
   */
  async sendChatMessage(
    classId: string, 
    userId: string, 
    userName: string, 
    userPhoto: string, 
    message: string, 
    isInstructor: boolean = false
  ): Promise<void> {
    try {
      const chatDoc: Omit<LiveChatMessage, 'chatId'> = {
        classId,
        userId,
        userName,
        userPhoto,
        message: message.trim(),
        timestamp: new Date().toISOString(),
        isInstructor
      };
      await addDoc(collection(db, this.chatColl), chatDoc);
    } catch (err) {
      console.error('Error sending chat message:', err);
      throw err;
    }
  }

  /**
   * Toggle class reminders.
   */
  async toggleReminder(classId: string, userId: string): Promise<boolean> {
    const reminderId = `${userId}_${classId}`;
    const ref = doc(db, this.remindersColl, reminderId);
    try {
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data() as LiveReminder;
        const nextState = !data.enabled;
        await updateDoc(ref, { enabled: nextState });
        return nextState;
      } else {
        const newReminder: LiveReminder = {
          reminderId,
          classId,
          userId,
          enabled: true,
          createdAt: new Date().toISOString()
        };
        await setDoc(ref, newReminder);
        return true;
      }
    } catch (err) {
      console.error('Error toggling reminder:', err);
      return false;
    }
  }

  /**
   * Check if user enabled reminder for this class.
   */
  async checkReminder(classId: string, userId: string): Promise<boolean> {
    const reminderId = `${userId}_${classId}`;
    const ref = doc(db, this.remindersColl, reminderId);
    try {
      const snap = await getDoc(ref);
      if (snap.exists()) {
        return (snap.data() as LiveReminder).enabled;
      }
      return false;
    } catch (err) {
      return false;
    }
  }

  /**
   * Sync and track live class student attendance.
   */
  async syncAttendance(
    classId: string, 
    userId: string, 
    userName: string, 
    joinTime: string, 
    leaveTime: string, 
    durationSec: number, 
    classDurationMin: number
  ): Promise<LiveAttendance | null> {
    const attendanceId = `${userId}_${classId}`;
    const ref = doc(db, this.attendanceColl, attendanceId);
    
    // Max duration is capped by total class duration
    const totalClassSec = classDurationMin * 60;
    const cappedDurationSec = Math.min(durationSec, totalClassSec);
    const percentage = Math.round((cappedDurationSec / totalClassSec) * 100);

    let status: 'present' | 'absent' | 'partial' = 'absent';
    if (percentage >= 75) status = 'present';
    else if (percentage >= 20) status = 'partial';

    try {
      const snap = await getDoc(ref);
      let updatedAttendance: LiveAttendance;

      if (snap.exists()) {
        const currentData = snap.data() as LiveAttendance;
        // Aggregate durations
        const newDuration = Math.min(currentData.duration + durationSec, totalClassSec);
        const newPercentage = Math.round((newDuration / totalClassSec) * 100);
        let newStatus: 'present' | 'absent' | 'partial' = 'absent';
        if (newPercentage >= 75) newStatus = 'present';
        else if (newPercentage >= 20) newStatus = 'partial';

        updatedAttendance = {
          ...currentData,
          leaveTime,
          duration: newDuration,
          percentage: newPercentage,
          status: newStatus,
          updatedAt: new Date().toISOString()
        };
      } else {
        updatedAttendance = {
          attendanceId,
          classId,
          userId,
          userName,
          joinTime,
          leaveTime,
          duration: cappedDurationSec,
          percentage,
          status,
          updatedAt: new Date().toISOString()
        };
      }

      await setDoc(ref, updatedAttendance);
      return updatedAttendance;
    } catch (err) {
      console.error('Error syncing attendance:', err);
      return null;
    }
  }

  /**
   * Get single user attendance.
   */
  async getAttendance(classId: string, userId: string): Promise<LiveAttendance | null> {
    const attendanceId = `${userId}_${classId}`;
    try {
      const snap = await getDoc(doc(db, this.attendanceColl, attendanceId));
      if (snap.exists()) {
        return snap.data() as LiveAttendance;
      }
      return null;
    } catch (err) {
      return null;
    }
  }
}

export const liveService = new LiveService();
