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
  onSnapshot,
  arrayUnion
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

// Default Seed Notifications (empty by default so only user/admin sent items appear)
const DEFAULT_NOTIFICATIONS = (userId: string): Omit<DBNotification, 'notificationId' | 'createdAt'>[] => [];

// Default Seed Announcements (empty by default so only user/admin sent items appear)
const DEFAULT_ANNOUNCEMENTS: Omit<Announcement, 'announcementId' | 'createdAt'>[] = [];

export const notificationService = {
  /**
   * Listen to user notifications in real-time.
   * Receives notifications targeted to this userId, userEmail, or broadcasted to 'all'/'broadcast'.
   * Seeds standard defaults if user has no notifications.
   */
  /**
   * Listen to user notifications in real-time.
   * Receives notifications targeted to this userId, userEmail, userName or broadcasted to 'all'/'broadcast'.
   * Seeds standard defaults if user has no notifications.
   */
  listenToNotifications(userId: string, callback: (notifications: DBNotification[]) => void, userEmail?: string, userName?: string) {
    const collPath = 'notifications';

    const getMatchingNotifications = (allNotifs: DBNotification[]): DBNotification[] => {
      const currentEmail = (userEmail || auth.currentUser?.email || '').trim().toLowerCase();
      const currentUid = (userId || auth.currentUser?.uid || '').trim().toLowerCase();
      const currentName = (userName || auth.currentUser?.displayName || '').trim().toLowerCase();

      const filtered = allNotifs.filter((data) => {
        const targetUser = (data.userId || '').trim().toLowerCase();
        const targetEmail = (data.userEmail || '').trim().toLowerCase();

        // 1. Universal broadcasts
        if (!targetUser || targetUser === 'all' || targetUser === 'broadcast') return true;

        // 2. Direct UID match
        if (currentUid && currentUid !== 'guest_user' && targetUser === currentUid) return true;

        // 3. Email match
        if (currentEmail && (targetEmail === currentEmail || targetUser === currentEmail)) return true;

        // 4. Name / Username match
        if (currentName && (targetUser === currentName || targetEmail === currentName)) return true;

        // 5. Broad substring match (e.g. email prefix or username match)
        if (currentEmail && targetEmail && (currentEmail.includes(targetEmail) || targetEmail.includes(currentEmail))) return true;

        if (targetUser && (
          (currentEmail && currentEmail.includes(targetUser)) ||
          (currentName && currentName.includes(targetUser)) ||
          (currentUid && currentUid.includes(targetUser))
        )) return true;

        return false;
      });

      // Compute multi-user read status for current student
      return filtered.map((data) => {
        const rawReadBy = Array.isArray(data.readBy) ? data.readBy : [];
        const readByArray = rawReadBy.map(s => String(s).trim().toLowerCase());

        const myIdentifiers = Array.from(new Set([
          currentUid,
          currentEmail,
          currentName,
          'guest_user',
          userId ? String(userId).trim().toLowerCase() : '',
          userEmail ? String(userEmail).trim().toLowerCase() : ''
        ].filter(Boolean)));

        const matchedInReadBy = myIdentifiers.some(id => readByArray.includes(id));
        const isReadByMe = matchedInReadBy || data.unread === false;

        return {
          ...data,
          unread: !isReadByMe,
          category: data.category || 'learning'
        };
      });
    };

    const emitMergedNotifications = (firestoreList: DBNotification[]) => {
      const localNotifs: DBNotification[] = JSON.parse(localStorage.getItem('nexus_db_notifications') || '[]');
      
      const map = new Map<string, DBNotification>();
      firestoreList.forEach(n => map.set(n.notificationId, { ...n }));

      localNotifs.forEach(n => {
        const existing = map.get(n.notificationId);
        if (existing) {
          const mergedReadBy = Array.from(new Set([...(existing.readBy || []), ...(n.readBy || [])]));
          const isRead = existing.unread === false || n.unread === false;
          map.set(n.notificationId, {
            ...existing,
            readBy: mergedReadBy,
            unread: isRead ? false : existing.unread
          });
        } else {
          map.set(n.notificationId, { ...n });
        }
      });

      const merged = Array.from(map.values());
      const filtered = getMatchingNotifications(merged);
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(filtered);
    };

    // Listen for local trigger updates
    const handleLocalUpdate = () => {
      const localNotifs: DBNotification[] = JSON.parse(localStorage.getItem('nexus_db_notifications') || '[]');
      emitMergedNotifications(localNotifs);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('nexus_notifications_updated', handleLocalUpdate);
    }

    // Real-time snapshot of notifications collection
    const unsubscribe = onSnapshot(
      collection(db, collPath),
      (snapshot) => {
        const list: DBNotification[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as DBNotification;
          list.push({
            ...data,
            notificationId: data.notificationId || docSnap.id
          });
        });
        emitMergedNotifications(list);
      },
      (error) => {
        console.warn('Firestore onSnapshot notifications error, using local fallback:', error);
        emitMergedNotifications([]);
      }
    );

    return () => {
      unsubscribe();
      if (typeof window !== 'undefined') {
        window.removeEventListener('nexus_notifications_updated', handleLocalUpdate);
      }
    };
  },

  /**
   * Listen to global announcements in real-time.
   */
  listenToAnnouncements(callback: (announcements: Announcement[]) => void) {
    const collPath = 'announcements';

    const emitMergedAnnouncements = (firestoreList: Announcement[]) => {
      const localAnns: Announcement[] = JSON.parse(localStorage.getItem('nexus_db_announcements') || '[]');
      const map = new Map<string, Announcement>();
      firestoreList.forEach(a => {
        if (a.isActive !== false) map.set(a.announcementId, a);
      });
      localAnns.forEach(a => {
        if (a.isActive !== false && !map.has(a.announcementId)) {
          map.set(a.announcementId, a);
        }
      });
      const merged = Array.from(map.values());
      merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(merged);
    };

    const handleLocalUpdate = () => {
      const localAnns: Announcement[] = JSON.parse(localStorage.getItem('nexus_db_announcements') || '[]');
      emitMergedAnnouncements(localAnns);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('nexus_announcements_updated', handleLocalUpdate);
    }

    const unsubscribe = onSnapshot(
      collection(db, collPath),
      (snapshot) => {
        const list: Announcement[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Announcement;
          if (data.isActive !== false) {
            list.push({
              ...data,
              announcementId: data.announcementId || docSnap.id
            });
          }
        });
        emitMergedAnnouncements(list);
      },
      (error) => {
        console.warn('Firestore announcements onSnapshot error:', error);
        emitMergedAnnouncements([]);
      }
    );

    return () => {
      unsubscribe();
      if (typeof window !== 'undefined') {
        window.removeEventListener('nexus_announcements_updated', handleLocalUpdate);
      }
    };
  },

  /**
   * Get dismissed announcements for the authenticated user from Firestore.
   */
  async getDismissedAnnouncements(userId: string): Promise<string[]> {
    if (!userId || userId === 'guest_user') return [];
    try {
      const docRef = doc(db, 'notificationSettings', userId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        return Array.isArray(data.dismissedAnnouncements) ? data.dismissedAnnouncements : [];
      }
    } catch (e) {
      console.warn('Failed to get dismissed announcements from Firestore:', e);
    }
    return [];
  },

  /**
   * Add an announcement ID to user's dismissed announcements list in Firestore.
   */
  async dismissAnnouncement(userId: string, announcementId: string): Promise<void> {
    if (!userId || userId === 'guest_user') return;
    try {
      const docRef = doc(db, 'notificationSettings', userId);
      await setDoc(docRef, {
        dismissedAnnouncements: arrayUnion(announcementId),
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.warn('Failed to dismiss announcement in Firestore:', e);
    }
  },

  /**
   * Fetch notification settings.
   * Creates default settings if none exist.
   */
  async getNotificationSettings(userId: string): Promise<NotificationSetting> {
    const path = `notificationSettings/${userId}`;
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

    if (!auth.currentUser) {
      return defaultSettings;
    }

    try {
      const docRef = doc(db, 'notificationSettings', userId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as NotificationSetting;
      } else {
        await setDoc(docRef, defaultSettings);
        return defaultSettings;
      }
    } catch (error) {
      console.warn('Notification settings fetch notice:', error);
      return defaultSettings;
    }
  },

  /**
   * Save custom notification settings.
   */
  async saveNotificationSettings(userId: string, settings: Partial<NotificationSetting>): Promise<void> {
    const path = `notificationSettings/${userId}`;
    if (!auth.currentUser) return;
    try {
      const docRef = doc(db, 'notificationSettings', userId);
      await setDoc(docRef, {
        ...settings,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      console.warn('Save notification settings notice:', error);
    }
  },

  /**
   * Mark single notification as read.
   */
  async markAsRead(notificationId: string, userId?: string, userEmail?: string): Promise<void> {
    const path = `notifications/${notificationId}`;
    const effectiveUid = userId || auth.currentUser?.uid || 'guest_user';
    const effectiveEmail = (userEmail || auth.currentUser?.email || '').trim().toLowerCase();
    const readByValues = Array.from(new Set([
      effectiveUid,
      effectiveUid.toLowerCase(),
      effectiveEmail,
      effectiveEmail.toLowerCase(),
      'guest_user'
    ].filter(Boolean)));

    try {
      const docRef = doc(db, 'notifications', notificationId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        const targetUser = (data.userId || '').trim().toLowerCase();
        const isBroadcast = !targetUser || targetUser === 'all' || targetUser === 'broadcast';
        
        const updateFields: any = {
          readBy: arrayUnion(...readByValues)
        };
        if (!isBroadcast) {
          updateFields.unread = false;
        }
        await updateDoc(docRef, updateFields);
      } else {
        await updateDoc(docRef, {
          readBy: arrayUnion(...readByValues),
          unread: false
        });
      }
    } catch (error) {
      console.warn('Failed updateDoc in markAsRead, using local fallback:', error);
    }

    // Local Storage fallback & instant cache sync
    const fallbackNotifs: DBNotification[] = JSON.parse(localStorage.getItem('nexus_db_notifications') || '[]');
    let target = fallbackNotifs.find(n => n.notificationId === notificationId);
    if (!target) {
      target = { notificationId, unread: false, readBy: readByValues } as DBNotification;
      fallbackNotifs.push(target);
    } else {
      if (!Array.isArray(target.readBy)) target.readBy = [];
      readByValues.forEach(v => {
        if (!target.readBy!.includes(v)) target.readBy!.push(v);
      });
      target.unread = false;
    }
    localStorage.setItem('nexus_db_notifications', JSON.stringify(fallbackNotifs));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('nexus_notifications_updated'));
    }
  },

  /**
   * Mark all unread notifications as read.
   */
  async markAllAsRead(userId: string, notificationsToMark: (string | { notificationId: string; userId?: string })[], userEmail?: string): Promise<void> {
    const collPath = 'notifications';
    const effectiveUid = userId || auth.currentUser?.uid || 'guest_user';
    const effectiveEmail = (userEmail || auth.currentUser?.email || '').trim().toLowerCase();
    const readByValues = Array.from(new Set([
      effectiveUid,
      effectiveUid.toLowerCase(),
      effectiveEmail,
      effectiveEmail.toLowerCase(),
      'guest_user'
    ].filter(Boolean)));

    try {
      const batch = writeBatch(db);
      notificationsToMark.forEach(item => {
        const id = typeof item === 'string' ? item : item.notificationId;
        const targetUser = typeof item === 'string' ? '' : (item.userId || '').trim().toLowerCase();
        const isBroadcast = !targetUser || targetUser === 'all' || targetUser === 'broadcast';

        const docRef = doc(db, collPath, id);
        const updateFields: any = {
          readBy: arrayUnion(...readByValues)
        };
        if (!isBroadcast) {
          updateFields.unread = false;
        }
        batch.update(docRef, updateFields);
      });
      await batch.commit();
    } catch (error) {
      console.warn('Failed batch markAllAsRead in Firestore:', error);
    }

    // Local storage fallback & instant cache sync
    const fallbackNotifs: DBNotification[] = JSON.parse(localStorage.getItem('nexus_db_notifications') || '[]');
    notificationsToMark.forEach(item => {
      const id = typeof item === 'string' ? item : item.notificationId;
      let target = fallbackNotifs.find(n => n.notificationId === id);
      if (!target) {
        fallbackNotifs.push({ notificationId: id, unread: false, readBy: readByValues } as DBNotification);
      } else {
        if (!Array.isArray(target.readBy)) target.readBy = [];
        readByValues.forEach(v => {
          if (!target.readBy!.includes(v)) target.readBy!.push(v);
        });
        target.unread = false;
      }
    });
    localStorage.setItem('nexus_db_notifications', JSON.stringify(fallbackNotifs));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('nexus_notifications_updated'));
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

    // Local storage sync & broadcast event
    const fallbackNotifs: DBNotification[] = JSON.parse(localStorage.getItem('nexus_db_notifications') || '[]');
    fallbackNotifs.unshift(notifObj);
    localStorage.setItem('nexus_db_notifications', JSON.stringify(fallbackNotifs));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('nexus_notifications_updated'));
    }

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

    // Local storage sync & broadcast event
    const fallbackAnns: Announcement[] = JSON.parse(localStorage.getItem('nexus_db_announcements') || '[]');
    fallbackAnns.unshift(newAnn);
    localStorage.setItem('nexus_db_announcements', JSON.stringify(fallbackAnns));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('nexus_announcements_updated'));
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

    // Local storage sync & broadcast event
    const fallbackAnns: Announcement[] = JSON.parse(localStorage.getItem('nexus_db_announcements') || '[]');
    const updated = fallbackAnns.filter(a => a.announcementId !== announcementId);
    localStorage.setItem('nexus_db_announcements', JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('nexus_announcements_updated'));
    }
  },

  /**
   * Admin method to fetch all notifications for admin view
   */
  async getAllNotifications(): Promise<DBNotification[]> {
    try {
      const snap = await getDocs(collection(db, 'notifications'));
      const list: DBNotification[] = [];
      snap.forEach(d => {
        const data = d.data() as DBNotification;
        list.push({
          ...data,
          notificationId: data.notificationId || d.id
        });
      });
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
      snap.forEach(d => {
        const data = d.data() as Announcement;
        list.push({
          ...data,
          announcementId: data.announcementId || d.id
        });
      });
      
      const localAnns: Announcement[] = JSON.parse(localStorage.getItem('nexus_db_announcements') || '[]');
      const map = new Map<string, Announcement>();
      list.forEach(a => map.set(a.announcementId, a));
      localAnns.forEach(a => { if (!map.has(a.announcementId)) map.set(a.announcementId, a); });

      const merged = Array.from(map.values());
      merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return merged;
    } catch (err) {
      console.warn('Failed fetching all announcements:', err);
      return JSON.parse(localStorage.getItem('nexus_db_announcements') || '[]');
    }
  }
};
