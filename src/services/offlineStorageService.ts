import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Course } from '../types/course';

interface NexusOfflineDB extends DBSchema {
  userProfile: {
    key: string;
    value: {
      uid: string;
      fullName?: string;
      displayName?: string;
      email?: string;
      photoURL?: string;
      role?: string;
      xp?: number;
      level?: number;
      streak?: number;
      cachedAt: number;
      [key: string]: any;
    };
  };
  courses: {
    key: string;
    value: Course & { cachedAt: number };
  };
  appMetadata: {
    key: string;
    value: {
      key: string;
      data: any;
      updatedAt: number;
    };
  };
}

const DB_NAME = 'nexus_academic_offline_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<NexusOfflineDB>> | null = null;
let hasRunCleanup = false;

function getDB(): Promise<IDBPDatabase<NexusOfflineDB>> {
  if (!dbPromise) {
    dbPromise = openDB<NexusOfflineDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('userProfile')) {
          db.createObjectStore('userProfile', { keyPath: 'uid' });
        }
        if (!db.objectStoreNames.contains('courses')) {
          db.createObjectStore('courses', { keyPath: 'courseId' });
        }
        if (!db.objectStoreNames.contains('appMetadata')) {
          db.createObjectStore('appMetadata', { keyPath: 'key' });
        }
      },
    }).then((db) => {
      if (!hasRunCleanup) {
        hasRunCleanup = true;
        setTimeout(() => {
          offlineStorageService.pruneStaleCache(30).catch(console.warn);
        }, 2000);
      }
      return db;
    }).catch((err) => {
      console.warn('IndexedDB failed to open, falling back gracefully:', err);
      throw err;
    });
  }
  return dbPromise;
}

export const offlineStorageService = {
  /**
   * Cache user basic profile into IndexedDB for persistent offline access
   */
  async cacheUserProfile(profile: any): Promise<void> {
    if (!profile || !profile.uid) return;
    try {
      const db = await getDB();
      await db.put('userProfile', {
        ...profile,
        cachedAt: Date.now(),
      });
      // Also save to a fixed default key 'current' for instant offline auth retrieval
      await db.put('userProfile', {
        ...profile,
        uid: 'current',
        cachedAt: Date.now(),
      });
    } catch (err) {
      console.warn('Failed to cache user profile in IndexedDB:', err);
      // LocalStorage fallback
      try {
        localStorage.setItem('nexus_offline_profile', JSON.stringify(profile));
      } catch {}
    }
  },

  /**
   * Get cached user profile from IndexedDB by uid or 'current'
   */
  async getCachedUserProfile(uid: string = 'current'): Promise<any | null> {
    try {
      const db = await getDB();
      let profile = await db.get('userProfile', uid);
      if (!profile && uid !== 'current') {
        profile = await db.get('userProfile', 'current');
      }
      if (profile) return profile;
    } catch (err) {
      console.warn('Failed to read user profile from IndexedDB:', err);
    }

    // LocalStorage fallback check
    try {
      const cached = localStorage.getItem('nexus_offline_profile');
      if (cached) return JSON.parse(cached);
    } catch {}

    return null;
  },

  /**
   * Cache courses meta-data array into IndexedDB
   */
  async cacheCourses(courses: Course[]): Promise<void> {
    if (!Array.isArray(courses) || courses.length === 0) return;
    try {
      const db = await getDB();
      const tx = db.transaction('courses', 'readwrite');
      const now = Date.now();
      for (const course of courses) {
        if (course && course.courseId) {
          await tx.store.put({
            ...course,
            cachedAt: now,
          });
        }
      }
      await tx.done;

      // Also store meta-data snapshot in appMetadata
      await db.put('appMetadata', {
        key: 'courses_meta_snapshot',
        data: courses,
        updatedAt: now,
      });
    } catch (err) {
      console.warn('Failed to cache courses in IndexedDB:', err);
      try {
        localStorage.setItem('nexus_offline_courses', JSON.stringify(courses));
      } catch {}
    }
  },

  /**
   * Get all cached courses from IndexedDB
   */
  async getCachedCourses(): Promise<Course[]> {
    try {
      const db = await getDB();
      const courses = await db.getAll('courses');
      if (courses && courses.length > 0) {
        return courses;
      }
      const snapshot = await db.get('appMetadata', 'courses_meta_snapshot');
      if (snapshot && Array.isArray(snapshot.data) && snapshot.data.length > 0) {
        return snapshot.data;
      }
    } catch (err) {
      console.warn('Failed to read cached courses from IndexedDB:', err);
    }

    // LocalStorage fallback
    try {
      const cached = localStorage.getItem('nexus_offline_courses');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}

    return [];
  },

  /**
   * Cache a single course by courseId into IndexedDB
   */
  async cacheSingleCourse(course: Course): Promise<void> {
    if (!course || !course.courseId) return;
    try {
      const db = await getDB();
      await db.put('courses', {
        ...course,
        cachedAt: Date.now(),
      });
    } catch (err) {
      console.warn(`Failed to cache course ${course.courseId} in IndexedDB:`, err);
    }
  },

  /**
   * Get a single cached course by courseId from IndexedDB
   */
  async getCachedSingleCourse(courseId: string): Promise<Course | null> {
    try {
      const db = await getDB();
      const course = await db.get('courses', courseId);
      if (course) return course;
    } catch (err) {
      console.warn(`Failed to read course ${courseId} from IndexedDB:`, err);
    }
    return null;
  },

  /**
   * Save general offline metadata
   */
  async setMetadata(key: string, data: any): Promise<void> {
    try {
      const db = await getDB();
      await db.put('appMetadata', {
        key,
        data,
        updatedAt: Date.now(),
      });
    } catch (err) {
      console.warn(`Failed to set metadata ${key} in IndexedDB:`, err);
    }
  },

  /**
   * Get general offline metadata
   */
  async getMetadata<T = any>(key: string): Promise<T | null> {
    try {
      const db = await getDB();
      const entry = await db.get('appMetadata', key);
      if (entry) return entry.data as T;
    } catch (err) {
      console.warn(`Failed to get metadata ${key} from IndexedDB:`, err);
    }
    return null;
  },

  /**
   * Automated cleanup task that prunes stale cached data older than maxAgeDays (default: 30 days).
   */
  async pruneStaleCache(maxAgeDays: number = 30): Promise<{ prunedCourses: number; prunedProfiles: number; prunedMetadata: number }> {
    const results = { prunedCourses: 0, prunedProfiles: 0, prunedMetadata: 0 };
    try {
      const db = await getDB();
      const cutoffTime = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;

      // 1. Prune stale courses
      const courseTx = db.transaction('courses', 'readwrite');
      const allCourses = await courseTx.store.getAll();
      for (const course of allCourses) {
        if (course && course.cachedAt && course.cachedAt < cutoffTime) {
          await courseTx.store.delete(course.courseId);
          results.prunedCourses++;
        }
      }
      await courseTx.done;

      // 2. Prune stale user profiles
      const profileTx = db.transaction('userProfile', 'readwrite');
      const allProfiles = await profileTx.store.getAll();
      for (const profile of allProfiles) {
        if (profile && profile.cachedAt && profile.cachedAt < cutoffTime) {
          await profileTx.store.delete(profile.uid);
          results.prunedProfiles++;
        }
      }
      await profileTx.done;

      // 3. Prune stale app metadata
      const metaTx = db.transaction('appMetadata', 'readwrite');
      const allMeta = await metaTx.store.getAll();
      for (const meta of allMeta) {
        if (meta && meta.updatedAt && meta.updatedAt < cutoffTime) {
          await metaTx.store.delete(meta.key);
          results.prunedMetadata++;
        }
      }
      await metaTx.done;

      if (results.prunedCourses > 0 || results.prunedProfiles > 0 || results.prunedMetadata > 0) {
        console.log(`[OfflineCache Cleanup] Pruned stale cache items older than ${maxAgeDays} days:`, results);
      }
    } catch (err) {
      console.warn('Failed to prune stale cache in IndexedDB:', err);
    }
    return results;
  },

  /**
   * Clear offline cache on logout
   */
  async clearOfflineCache(): Promise<void> {
    try {
      const db = await getDB();
      await db.clear('userProfile');
      await db.clear('courses');
      await db.clear('appMetadata');
    } catch (err) {
      console.warn('Failed to clear IndexedDB offline cache:', err);
    }
    try {
      localStorage.removeItem('nexus_offline_profile');
      localStorage.removeItem('nexus_offline_courses');
    } catch {}
  }
};
