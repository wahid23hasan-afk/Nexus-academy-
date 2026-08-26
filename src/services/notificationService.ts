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
import { db, auth, sanitizeForFirestore } from './firebase';
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

// Default Seed Notifications (starter alerts for new students)
const DEFAULT_NOTIFICATIONS = (userId: string): DBNotification[] => [
  {
    notificationId: 'welcome_nexus_scholar',
    userId: 'all',
    title: '🎉 Welcome to Nexus Academy Workspace!',
    message: 'Explore university-standard courses, interactive flashcards, collaborative study rooms, and live instructor sessions.',
    type: 'General Announcement',
    category: 'announcements',
    unread: true,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    relatedPage: 'discover'
  },
  {
    notificationId: 'academic_catalog_ready',
    userId: 'all',
    title: '📚 SSC, HSC & Admission Course Tracks Available',
    message: 'Check out the newly updated curricula with lecture notes, quizzes, and certificates of completion.',
    type: 'Course Update',
    category: 'courses',
    unread: true,
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    relatedPage: 'discover'
  }
];

// Default Seed Announcements (empty by default so only user/admin sent items appear)
const DEFAULT_ANNOUNCEMENTS: Omit<Announcement, 'announcementId' | 'createdAt'>[] = [];

// Module-level cache of latest Firestore notifications to prevent race-condition data loss
let latestFirestoreNotifications: DBNotification[] = [];

export function getSafeTimestamp(createdAtVal: any, fallbackId?: string): number {
  if (createdAtVal !== null && createdAtVal !== undefined) {
    if (typeof createdAtVal === 'number' && !isNaN(createdAtVal)) {
      return createdAtVal;
    }
    if (typeof createdAtVal === 'string') {
      const parsed = new Date(createdAtVal).getTime();
      if (!isNaN(parsed) && parsed > 0) return parsed;
      const num = Number(createdAtVal);
      if (!isNaN(num) && num > 0) return num;
    }
    if (typeof createdAtVal === 'object') {
      if (typeof createdAtVal.toDate === 'function') {
        try {
          const t = createdAtVal.toDate().getTime();
          if (!isNaN(t) && t > 0) return t;
        } catch (e) {}
      }
      if (typeof createdAtVal.seconds === 'number') {
        return createdAtVal.seconds * 1000;
      }
      if (typeof createdAtVal._seconds === 'number') {
        return createdAtVal._seconds * 1000;
      }
    }
  }

  if (fallbackId && typeof fallbackId === 'string') {
    const match = fallbackId.match(/_(\d{10,13})(?:_|$)/);
    if (match && match[1]) {
      const ts = Number(match[1]);
      if (!isNaN(ts) && ts > 0) return ts;
    }
  }

  return 0;
}

export const notificationService = {
  /**
   * Helper to retrieve locally tracked dismissed announcement IDs
   */
  getLocalDismissedAnnouncements(): Set<string> {
    try {
      const raw = localStorage.getItem('nexus_dismissed_announcements');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return new Set(parsed);
      }
    } catch (e) {
      console.warn('Error reading nexus_dismissed_announcements:', e);
    }
    return new Set<string>();
  },

  /**
   * Helper to record dismissed announcement ID in localStorage
   */
  addLocalDismissedAnnouncement(announcementId: string) {
    try {
      const current = this.getLocalDismissedAnnouncements();
      current.add(announcementId);
      localStorage.setItem('nexus_dismissed_announcements', JSON.stringify(Array.from(current)));
    } catch (e) {
      console.warn('Error saving nexus_dismissed_announcements:', e);
    }
  },

  /**
   * Helper to retrieve locally tracked read notification IDs
   */
  getLocalReadIds(): Set<string> {
    try {
      const raw = localStorage.getItem('nexus_read_notif_ids');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return new Set(parsed);
      }
    } catch (e) {
      console.warn('Error reading nexus_read_notif_ids:', e);
    }
    return new Set<string>();
  },

  /**
   * Helper to record read notification IDs in localStorage
   */
  addLocalReadIds(ids: string[]) {
    try {
      const current = this.getLocalReadIds();
      ids.forEach(id => current.add(id));
      localStorage.setItem('nexus_read_notif_ids', JSON.stringify(Array.from(current)));
    } catch (e) {
      console.warn('Error saving nexus_read_notif_ids:', e);
    }
  },

  /**
   * Helper to retrieve deleted notification IDs
   */
  getLocalDeletedIds(): Set<string> {
    try {
      const raw = localStorage.getItem('nexus_deleted_notif_ids');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return new Set(parsed);
      }
    } catch (e) {
      console.warn('Error reading nexus_deleted_notif_ids:', e);
    }
    return new Set<string>();
  },

  /**
   * Helper to record deleted notification ID
   */
  addLocalDeletedId(id: string) {
    try {
      const current = this.getLocalDeletedIds();
      current.add(id);
      localStorage.setItem('nexus_deleted_notif_ids', JSON.stringify(Array.from(current)));
    } catch (e) {
      console.warn('Error saving nexus_deleted_notif_ids:', e);
    }
  },

  /**
   * Helper to sanitize and clean localStorage notifications cache
   */
  getCleanLocalNotifications(): DBNotification[] {
    try {
      const raw = localStorage.getItem('nexus_db_notifications');
      if (!raw) return [];
      const list = JSON.parse(raw);
      if (!Array.isArray(list)) return [];
      
      // Filter out broken dummy items with missing title or message
      const valid = list.filter((n: any) => n && typeof n === 'object' && n.notificationId && (n.title || n.message));
      // Save back cleaned version if broken items were purged
      if (valid.length !== list.length) {
        localStorage.setItem('nexus_db_notifications', JSON.stringify(valid));
      }
      return valid;
    } catch (e) {
      return [];
    }
  },

  /**
   * Listen to user notifications in real-time.
   * Receives notifications targeted to this userId, userEmail, userName or broadcasted to 'all'/'broadcast'.
   */
  listenToNotifications(userId: string, callback: (notifications: DBNotification[]) => void, userEmail?: string, userName?: string) {
    const collPath = 'notifications';

    const getMatchingNotifications = (allNotifs: DBNotification[]): DBNotification[] => {
      const currentEmail = (userEmail || auth.currentUser?.email || '').trim().toLowerCase();
      const currentUid = (userId || auth.currentUser?.uid || '').trim().toLowerCase();
      const currentName = (userName || auth.currentUser?.displayName || '').trim().toLowerCase();
      const emailPrefix = currentEmail.includes('@') ? currentEmail.split('@')[0] : '';
      const readIds = this.getLocalReadIds();
      const deletedIds = this.getLocalDeletedIds();

      const filtered = allNotifs.filter((data) => {
        if (!data || !data.notificationId) return false;
        // Exclude locally deleted notifications
        if (deletedIds.has(data.notificationId)) return false;
        // Require at least a title or message
        if (!data.title && !data.message) return false;

        const targetUser = (data.userId || '').trim().toLowerCase();
        const targetEmail = (data.userEmail || '').trim().toLowerCase();
        const targetUserPrefix = targetUser.includes('@') ? targetUser.split('@')[0] : '';
        const targetEmailPrefix = targetEmail.includes('@') ? targetEmail.split('@')[0] : '';

        // 1. Universal broadcasts
        if (
          !targetUser || 
          targetUser === 'all' || 
          targetUser === 'broadcast' || 
          targetUser === 'everyone' || 
          targetUser === 'all students' ||
          (data as any).targetType === 'all'
        ) {
          return true;
        }

        // 2. Direct UID match
        if (currentUid && currentUid !== 'guest_user' && targetUser === currentUid) return true;

        // 3. Email match (exact)
        if (currentEmail && (targetEmail === currentEmail || targetUser === currentEmail)) return true;

        // 4. Email handle / prefix match (e.g. wahid23hasan matches wahid23hasan@gmail.com)
        if (emailPrefix && (targetUser === emailPrefix || targetEmailPrefix === emailPrefix || targetUserPrefix === emailPrefix)) {
          return true;
        }

        // 5. Name / Username match
        if (currentName && (targetUser === currentName || targetEmail === currentName)) return true;

        // 6. Broad substring match (e.g. email prefix or username match)
        if (currentEmail && targetEmail && (currentEmail.includes(targetEmail) || targetEmail.includes(currentEmail))) return true;

        if (targetUser && (
          (currentEmail && currentEmail.includes(targetUser)) ||
          (currentName && currentName.includes(targetUser)) ||
          (currentUid && currentUid.includes(targetUser))
        )) return true;

        // 7. If guest user and notification is targeted to guest
        if (currentUid === 'guest_user' && (targetUser === 'guest_user' || targetUser === 'guest')) return true;

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
          emailPrefix,
          'guest_user',
          userId ? String(userId).trim().toLowerCase() : '',
          userEmail ? String(userEmail).trim().toLowerCase() : ''
        ].filter(Boolean)));

        const matchedInReadBy = myIdentifiers.some(id => readByArray.includes(id));
        const isLocallyMarkedRead = readIds.has(data.notificationId);
        const isReadByMe = matchedInReadBy || isLocallyMarkedRead || data.unread === false;

        return {
          ...data,
          unread: !isReadByMe,
          category: data.category || 'learning',
          type: data.type || 'General Announcement'
        };
      });
    };

    const emitMergedNotifications = () => {
      const localNotifs = this.getCleanLocalNotifications();
      const map = new Map<string, DBNotification>();
      
      // 1. Add Firestore notifications
      latestFirestoreNotifications.forEach(n => {
        if (n && n.notificationId && (n.title || n.message)) {
          map.set(n.notificationId, { ...n });
        }
      });

      // 2. Add local notifications (if created offline or locally)
      localNotifs.forEach(n => {
        if (n && n.notificationId && (n.title || n.message)) {
          const existing = map.get(n.notificationId);
          if (existing) {
            const mergedReadBy = Array.from(new Set([...(existing.readBy || []), ...(n.readBy || [])]));
            map.set(n.notificationId, {
              ...existing,
              ...n,
              readBy: mergedReadBy
            });
          } else {
            map.set(n.notificationId, { ...n });
          }
        }
      });

      // 3. If completely empty, seed default starter notifications
      if (map.size === 0) {
        DEFAULT_NOTIFICATIONS(userId).forEach(n => map.set(n.notificationId, n));
      }

      const merged = Array.from(map.values());
      const filtered = getMatchingNotifications(merged);
      filtered.sort((a, b) => {
        const tA = getSafeTimestamp(a.createdAt, a.notificationId);
        const tB = getSafeTimestamp(b.createdAt, b.notificationId);
        if (tB !== tA) return tB - tA;
        return (b.notificationId || '').localeCompare(a.notificationId || '');
      });
      callback(filtered);
    };

    // Listen for local trigger updates (e.g. after marking read or creating alert)
    const handleLocalUpdate = () => {
      emitMergedNotifications();
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
          if (data && (data.title || data.message)) {
            list.push({
              ...data,
              notificationId: data.notificationId || docSnap.id
            });
          }
        });
        latestFirestoreNotifications = list;
        emitMergedNotifications();
      },
      (error) => {
        console.warn('Firestore onSnapshot notifications notice:', error);
        emitMergedNotifications();
      }
    );

    // Initial emit with local/default data while Firestore is connecting
    emitMergedNotifications();

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
    const currentUid = auth.currentUser?.uid;

    if (currentUid && currentUid !== 'guest_user') {
      this.getDismissedAnnouncements(currentUid).then(dismissed => {
        if (Array.isArray(dismissed) && dismissed.length > 0) {
          dismissed.forEach(id => this.addLocalDismissedAnnouncement(id));
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('nexus_announcements_updated'));
          }
        }
      }).catch(() => {});
    }

    const emitMergedAnnouncements = (firestoreList: Announcement[]) => {
      const localAnns: Announcement[] = JSON.parse(localStorage.getItem('nexus_db_announcements') || '[]');
      const dismissed = this.getLocalDismissedAnnouncements();

      const map = new Map<string, Announcement>();
      firestoreList.forEach(a => {
        if (a && a.announcementId && a.isActive !== false && !dismissed.has(a.announcementId)) {
          map.set(a.announcementId, a);
        }
      });
      localAnns.forEach(a => {
        if (a && a.announcementId && a.isActive !== false && !dismissed.has(a.announcementId) && !map.has(a.announcementId)) {
          map.set(a.announcementId, a);
        }
      });
      const merged = Array.from(map.values());
      merged.sort((a, b) => {
        const tA = getSafeTimestamp(a.createdAt, a.announcementId);
        const tB = getSafeTimestamp(b.createdAt, b.announcementId);
        if (tB !== tA) return tB - tA;
        return (b.announcementId || '').localeCompare(a.announcementId || '');
      });
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
          if (data && data.isActive !== false) {
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
    if (!announcementId) return;

    // Save locally immediately
    this.addLocalDismissedAnnouncement(announcementId);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('nexus_announcements_updated'));
      window.dispatchEvent(new Event('nexus_notifications_updated'));
    }

    if (!userId || userId === 'guest_user') return;

    try {
      const docRef = doc(db, 'notificationSettings', userId);
      await setDoc(docRef, sanitizeForFirestore({
        dismissedAnnouncements: arrayUnion(announcementId),
        updatedAt: new Date().toISOString()
      }), { merge: true });
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
    const effectiveUid = userId || auth.currentUser?.uid || 'guest_user';
    const effectiveEmail = (userEmail || auth.currentUser?.email || '').trim().toLowerCase();
    const readByValues = Array.from(new Set([
      effectiveUid,
      effectiveUid.toLowerCase(),
      effectiveEmail,
      effectiveEmail.toLowerCase(),
      'guest_user'
    ].filter(Boolean)));

    // Record locally in read set
    this.addLocalReadIds([notificationId]);

    // Update in-memory cache if present
    latestFirestoreNotifications = latestFirestoreNotifications.map(n => {
      if (n.notificationId === notificationId) {
        const mergedReadBy = Array.from(new Set([...(n.readBy || []), ...readByValues]));
        return { ...n, unread: false, readBy: mergedReadBy };
      }
      return n;
    });

    // Update in localStorage cache if full notification exists
    const localNotifs = this.getCleanLocalNotifications();
    const updatedLocal = localNotifs.map(n => {
      if (n.notificationId === notificationId) {
        const mergedReadBy = Array.from(new Set([...(n.readBy || []), ...readByValues]));
        return { ...n, unread: false, readBy: mergedReadBy };
      }
      return n;
    });
    localStorage.setItem('nexus_db_notifications', JSON.stringify(updatedLocal));

    // Dispatch update for immediate UI refresh
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('nexus_notifications_updated'));
    }

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
      }
    } catch (error) {
      console.warn('Failed updateDoc in markAsRead, handled locally:', error);
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

    const idsToMark = notificationsToMark.map(item => typeof item === 'string' ? item : item.notificationId);

    // Record locally in read set
    this.addLocalReadIds(idsToMark);

    // Update in-memory cache
    latestFirestoreNotifications = latestFirestoreNotifications.map(n => {
      if (idsToMark.includes(n.notificationId)) {
        const mergedReadBy = Array.from(new Set([...(n.readBy || []), ...readByValues]));
        return { ...n, unread: false, readBy: mergedReadBy };
      }
      return n;
    });

    // Update localStorage cache if full notifications exist (never injecting broken skeleton items)
    const localNotifs = this.getCleanLocalNotifications();
    const updatedLocal = localNotifs.map(n => {
      if (idsToMark.includes(n.notificationId)) {
        const mergedReadBy = Array.from(new Set([...(n.readBy || []), ...readByValues]));
        return { ...n, unread: false, readBy: mergedReadBy };
      }
      return n;
    });
    localStorage.setItem('nexus_db_notifications', JSON.stringify(updatedLocal));

    // Dispatch update for immediate UI refresh
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('nexus_notifications_updated'));
    }

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
      console.warn('Batch markAllAsRead in Firestore synced with local store:', error);
    }
  },

  /**
   * Delete single notification.
   */
  async deleteNotification(notificationId: string): Promise<void> {
    // 1. Mark as locally deleted so it never re-appears
    this.addLocalDeletedId(notificationId);

    // 2. Remove from in-memory cache
    latestFirestoreNotifications = latestFirestoreNotifications.filter(n => n.notificationId !== notificationId);

    // 3. Remove from localStorage cache
    const localNotifs = this.getCleanLocalNotifications();
    const filteredLocal = localNotifs.filter(n => n.notificationId !== notificationId);
    localStorage.setItem('nexus_db_notifications', JSON.stringify(filteredLocal));

    // 4. Dispatch event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('nexus_notifications_updated'));
    }

    try {
      const docRef = doc(db, 'notifications', notificationId);
      await deleteDoc(docRef);
    } catch (error) {
      console.warn('Delete notification from Firestore notice:', error);
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
      await setDoc(doc(db, collPath, newId), sanitizeForFirestore(newNotification));
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
      const lower = cleanInput.toLowerCase();
      if (lower === 'all' || lower === 'broadcast' || lower === 'everyone' || lower === 'all students') {
        targetUser = 'all';
      } else if (cleanInput.includes('@')) {
        targetEmail = lower;
        targetUser = lower;
      } else {
        targetUser = lower;
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
      createdAt: nowISO,
      targetType: targetType
    } as DBNotification;

    try {
      await setDoc(doc(db, 'notifications', notifId), sanitizeForFirestore(notifObj));
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
      await setDoc(doc(db, 'announcements', annId), sanitizeForFirestore(newAnn));
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
      list.sort((a, b) => {
        const tA = getSafeTimestamp(a.createdAt, a.notificationId);
        const tB = getSafeTimestamp(b.createdAt, b.notificationId);
        if (tB !== tA) return tB - tA;
        return (b.notificationId || '').localeCompare(a.notificationId || '');
      });
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
      merged.sort((a, b) => {
        const tA = getSafeTimestamp(a.createdAt, a.announcementId);
        const tB = getSafeTimestamp(b.createdAt, b.announcementId);
        if (tB !== tA) return tB - tA;
        return (b.announcementId || '').localeCompare(a.announcementId || '');
      });
      return merged;
    } catch (err) {
      console.warn('Failed fetching all announcements:', err);
      return JSON.parse(localStorage.getItem('nexus_db_announcements') || '[]');
    }
  }
};
