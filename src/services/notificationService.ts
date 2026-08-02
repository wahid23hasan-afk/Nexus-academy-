import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  limit, 
  addDoc, 
  getDoc,
  deleteDoc,
  updateDoc,
  writeBatch,
  onSnapshot
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { 
  Notification as DBNotification, 
  NotificationCategory, 
  NotificationType, 
  Announcement, 
  NotificationSetting 
} from '../types/notification';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error in notificationService: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Default Seed Notifications
const DEFAULT_NOTIFICATIONS = (userId: string): Omit<DBNotification, 'notificationId' | 'createdAt'>[] => [
  {
    userId,
    title: '🎓 Course Workspace Ready',
    message: 'Your enrollment in IELTS Preparation Premium is fully verified. Launch your chapters dashboard now.',
    category: 'courses',
    type: 'New Course',
    unread: true,
    relatedPage: 'course-details',
    targetId: 'course-ielts-001'
  },
  {
    userId,
    title: '💡 Quiz Reminder: Calculus Basics',
    message: 'Assess your integration skills! Chapter 2 Quiz is open. Aim for a passing score of 80% to earn points.',
    category: 'learning',
    type: 'Quiz Reminder',
    unread: true,
    relatedPage: 'quiz',
    targetId: 'quiz-math-001'
  },
  {
    userId,
    title: '💳 Payment Successful',
    message: 'Payment of $49.00 processed successfully. Transaction reference ID #NEX-8849-DF-AC.',
    category: 'payment',
    type: 'Payment Success',
    unread: false,
    relatedPage: 'courses',
    targetId: 'course-ielts-001'
  },
  {
    userId,
    title: '🏆 Graduation Certificate Unlocked!',
    message: 'Congratulations! You have satisfied all academic standards for IELTS Preparation Premium. Claim your secure credential.',
    category: 'learning',
    type: 'Certificate Available',
    unread: true,
    relatedPage: 'certificates',
    targetId: 'course-ielts-001'
  },
  {
    userId,
    title: '🔥 Eid Campaign: 60% Off Specials',
    message: 'Unlock full lifetime access to our best selling Web Development stack. Use checkout code NEXUS60.',
    category: 'promotions',
    type: 'Promotional Offer',
    unread: true,
    relatedPage: 'courses',
    targetId: 'course-web-002'
  },
  {
    userId,
    title: '🛠️ Scheduled System Upgrades',
    message: 'In-app services and live classes will pause temporarily on Saturday from 2:00 AM to 4:00 AM UTC.',
    category: 'announcements',
    type: 'Maintenance Notice',
    unread: false
  }
];

// Default Seed Announcements
const DEFAULT_ANNOUNCEMENTS: Omit<Announcement, 'announcementId' | 'createdAt'>[] = [
  {
    title: '🚨 EMERGENCY MAINTENANCE NOTICE',
    message: 'Scheduled server upgrades will occur on Saturday 2:00 AM UTC. Please pause active quiz attempts before this window.',
    priority: 'emergency',
    isActive: true
  },
  {
    title: '🏆 SCHOLARSHIP DRIVE IS NOW OPEN',
    message: 'Sign up for our annual Tech Talent Scholarship before July 25. Stand a chance to win 100% tuition coverage.',
    priority: 'high',
    isActive: true,
    link: 'https://nexus-academy.edu/scholarships'
  },
  {
    title: '🌟 New Programming Curriculum Added',
    message: 'Explore our brand new interactive Python for Data Science pathway now included in the catalog.',
    priority: 'normal',
    isActive: true
  }
];

export const notificationService = {
  /**
   * Listen to user notifications in real-time.
   * Receives notifications targeted to this userId, userEmail, or broadcasted to 'all'/'broadcast'.
   * Seeds standard defaults if user has no notifications.
   */
  listenToNotifications(userId: string, callback: (notifications: DBNotification[]) => void, userEmail?: string) {
    const collPath = 'notifications';
    const cleanEmail = (userEmail || auth.currentUser?.email || '').trim().toLowerCase();

    // Check and seed default notifications if empty
    getDocs(query(collection(db, collPath), where('userId', '==', userId))).then(async (snap) => {
      if (snap.empty) {
        console.log('Seeding default notifications for user:', userId);
        const batch = writeBatch(db);
        const defaults = DEFAULT_NOTIFICATIONS(userId);
        
        defaults.forEach((item, index) => {
          const newId = `notif_${Date.now()}_${index}`;
          const docRef = doc(db, collPath, newId);
          const creationDate = new Date(Date.now() - index * 3600000).toISOString();
          
          batch.set(docRef, {
            ...item,
            notificationId: newId,
            userEmail: cleanEmail,
            createdAt: creationDate
          });
        });
        
        await batch.commit();
      }
    }).catch(err => {
      console.warn('Silent seeding error:', err);
    });

    // Real-time snapshot of notifications collection
    return onSnapshot(
      collection(db, collPath),
      (snapshot) => {
        const list: DBNotification[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as DBNotification;
          const targetUser = data.userId ? data.userId.trim() : '';
          const targetEmail = data.userEmail ? data.userEmail.trim().toLowerCase() : '';

          const isMatch = 
            targetUser === userId || 
            targetUser === 'all' || 
            targetUser === 'broadcast' ||
            (cleanEmail && targetEmail === cleanEmail) ||
            (cleanEmail && targetUser.toLowerCase() === cleanEmail);

          if (isMatch) {
            list.push(data);
          }
        });

        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(list);
      },
      (error) => {
        console.warn('Firestore onSnapshot notifications error, using local fallback:', error);
      }
    );
  },

  /**
   * Listen to global announcements in real-time.
   * Seeds default announcements if database is empty.
   */
  listenToAnnouncements(callback: (announcements: Announcement[]) => void) {
    const collPath = 'announcements';
    const q = query(
      collection(db, collPath),
      where('isActive', '==', true)
    );

    getDocs(collection(db, collPath)).then(async (snap) => {
      if (snap.empty) {
        console.log('Seeding default announcements...');
        const batch = writeBatch(db);
        
        DEFAULT_ANNOUNCEMENTS.forEach((item, index) => {
          const newId = `ann_${Date.now()}_${index}`;
          const docRef = doc(db, collPath, newId);
          const creationDate = new Date(Date.now() - index * 7200000).toISOString();
          
          batch.set(docRef, {
            ...item,
            announcementId: newId,
            createdAt: creationDate
          });
        });

        await batch.commit();
      }
    }).catch(err => {
      console.warn('Announcement seeding error:', err);
    });

    return onSnapshot(
      q,
      (snapshot) => {
        const list: Announcement[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as Announcement);
        });
        // Sort descending
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, collPath);
      }
    );
  },

  /**
   * Fetch notification settings.
   * Creates default settings if none exist.
   */
  async getNotificationSettings(userId: string): Promise<NotificationSetting> {
    const path = `notificationSettings/${userId}`;
    try {
      const docRef = doc(db, 'notificationSettings', userId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as NotificationSetting;
      } else {
        const defaultSettings: NotificationSetting = {
          userId,
          marketingNotifications: true,
          courseUpdates: true,
          quizReminders: true,
          liveClassAlerts: true,
          certificateAlerts: true,
          generalAnnouncements: true,
          updatedAt: new Date().toISOString()
        };
        await setDoc(docRef, defaultSettings);
        return defaultSettings;
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      throw error;
    }
  },

  /**
   * Save custom notification settings.
   */
  async saveNotificationSettings(userId: string, settings: Partial<NotificationSetting>): Promise<void> {
    const path = `notificationSettings/${userId}`;
    try {
      const docRef = doc(db, 'notificationSettings', userId);
      await updateDoc(docRef, {
        ...settings,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  /**
   * Mark single notification as read.
   */
  async markAsRead(notificationId: string): Promise<void> {
    const path = `notifications/${notificationId}`;
    try {
      const docRef = doc(db, 'notifications', notificationId);
      await updateDoc(docRef, { unread: false, category: 'read' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  /**
   * Mark all unread notifications as read.
   */
  async markAllAsRead(userId: string, notificationIds: string[]): Promise<void> {
    const collPath = 'notifications';
    try {
      const batch = writeBatch(db);
      notificationIds.forEach(id => {
        const docRef = doc(db, collPath, id);
        batch.update(docRef, { unread: false, category: 'read' });
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, collPath);
    }
  },

  /**
   * Delete single notification.
   */
  async deleteNotification(notificationId: string): Promise<void> {
    const path = `notifications/${notificationId}`;
    try {
      const docRef = doc(db, 'notifications', notificationId);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  /**
   * Create a single new notification.
   */
  async createNotification(userId: string, notification: Omit<DBNotification, 'notificationId' | 'userId' | 'createdAt'>): Promise<DBNotification> {
    const collPath = 'notifications';
    try {
      const newId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newNotification: DBNotification = {
        ...notification,
        notificationId: newId,
        userId,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, collPath, newId), newNotification);
      return newNotification;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, collPath);
      throw error;
    }
  },

  /**
   * Prepare/Simulate Push Messaging tokens
   */
  async registerPushMessagingToken(userId: string): Promise<string> {
    console.log('Requesting browser push notification permission...');
    // Real browser notification prompt (safe from within sandboxed frame as standard request)
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      console.log('Push notification permission response:', permission);
    }
    
    // Simulate token retrieval and save under notificationHistory/settings
    const simulatedFCMToken = `fcm_token_nexus_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`;
    console.log('FCM Device Token registered successfully:', simulatedFCMToken);
    
    // Log registration history
    const historyId = `fcm_reg_${Date.now()}`;
    await setDoc(doc(db, 'notificationHistory', historyId), {
      historyId,
      userId,
      notificationId: 'FCM_REGISTER',
      deliveryType: 'push',
      status: 'delivered',
      timestamp: new Date().toISOString()
    });

    return simulatedFCMToken;
  },

  /**
   * Simulate Scheduled/FCM push trigger (foreground/background)
   */
  async simulateFCMNotificationTrigger(userId: string, type: NotificationType, title: string, message: string): Promise<void> {
    console.log(`[FCM Push] Simulating scheduled push transmission to student: ${userId}`);
    
    let category: NotificationCategory = 'learning';
    if (type.includes('Course')) category = 'courses';
    if (type.includes('Payment')) category = 'payment';
    if (type.includes('Promotional')) category = 'promotions';
    if (type.includes('Maintenance') || type.includes('Announcement')) category = 'announcements';

    // Save to Firestore as a new real notification item
    await this.createNotification(userId, {
      title: `[PUSH] ${title}`,
      message,
      category,
      type,
      unread: true
    });
  },

  /**
   * Admin method to send notification to all users ('all') or a targeted user
   */
  async adminSendNotification(params: {
    targetType: 'all' | 'user';
    targetIdentifier?: string;
    title: string;
    message: string;
    category?: NotificationCategory;
    type?: NotificationType;
    relatedPage?: string;
    targetId?: string;
  }): Promise<DBNotification> {
    const { targetType, targetIdentifier, title, message, category, type, relatedPage, targetId } = params;
    const nowISO = new Date().toISOString();
    const notifId = `admin_notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    let targetUser = 'all';
    let targetEmail = '';

    if (targetType === 'user' && targetIdentifier) {
      const cleanInput = targetIdentifier.trim();
      if (cleanInput.includes('@')) {
        targetEmail = cleanInput.toLowerCase();
        targetUser = cleanInput;
      } else {
        targetUser = cleanInput;
      }
    }

    const notifObj: DBNotification = {
      notificationId: notifId,
      userId: targetUser,
      userEmail: targetEmail || undefined,
      title,
      message,
      category: category || 'announcements',
      type: type || 'General Announcement',
      unread: true,
      relatedPage,
      targetId,
      createdAt: nowISO
    };

    try {
      await setDoc(doc(db, 'notifications', notifId), notifObj);
    } catch (err) {
      console.warn('Failed to save notification to Firestore, using local fallback:', err);
    }

    // Local storage sync
    const fallbackNotifs: DBNotification[] = JSON.parse(localStorage.getItem('nexus_db_notifications') || '[]');
    fallbackNotifs.unshift(notifObj);
    localStorage.setItem('nexus_db_notifications', JSON.stringify(fallbackNotifs));

    return notifObj;
  },

  /**
   * Admin method to create a global banner announcement
   */
  async createAnnouncement(announcement: Omit<Announcement, 'announcementId' | 'createdAt'>): Promise<Announcement> {
    const annId = `ann_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newAnn: Announcement = {
      ...announcement,
      announcementId: annId,
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'announcements', annId), newAnn);
    } catch (err) {
      console.warn('Failed to save announcement to Firestore:', err);
    }

    return newAnn;
  },

  /**
   * Admin method to delete a global announcement
   */
  async deleteAnnouncement(announcementId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'announcements', announcementId));
    } catch (err) {
      console.warn('Failed to delete announcement:', err);
    }
  },

  /**
   * Admin method to fetch all notifications for admin view
   */
  async getAllNotifications(): Promise<DBNotification[]> {
    try {
      const snap = await getDocs(collection(db, 'notifications'));
      const list: DBNotification[] = [];
      snap.forEach(d => list.push(d.data() as DBNotification));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return list;
    } catch (err) {
      console.warn('Failed fetching all notifications from Firestore:', err);
      return JSON.parse(localStorage.getItem('nexus_db_notifications') || '[]');
    }
  },

  /**
   * Admin method to fetch all announcements for admin view
   */
  async getAllAnnouncements(): Promise<Announcement[]> {
    try {
      const snap = await getDocs(collection(db, 'announcements'));
      const list: Announcement[] = [];
      snap.forEach(d => list.push(d.data() as Announcement));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return list;
    } catch (err) {
      console.warn('Failed fetching all announcements:', err);
      return [];
    }
  }
};
