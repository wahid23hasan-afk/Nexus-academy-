import { 
  collection, 
  getDocs, 
  setDoc, 
  updateDoc,
  doc, 
  query, 
  where, 
  orderBy, 
  deleteDoc,
  serverTimestamp,
  getDoc,
  onSnapshot
} from 'firebase/firestore';
import { db, auth } from './firebase';

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
  console.error('Firestore Error in learningService: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface CourseLesson {
  lessonId: string;
  courseId: string;
  chapterId: string;
  title: string;
  duration: string;
  sequenceOrder: number;
  isPreviewAllowed: boolean;
}

export interface LessonVideo {
  videoId: string;
  lessonId: string;
  courseId: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: number; // in seconds
}

export interface LessonResource {
  resourceId: string;
  lessonId: string;
  courseId: string;
  title: string;
  type: 'pdf' | 'zip' | 'image' | 'code' | 'other';
  downloadUrl: string;
  fileSize: string;
}

export interface LessonNote {
  noteId: string;
  userId: string;
  courseId: string;
  lessonId: string;
  timestamp: number; // video position in seconds
  noteTitle: string;
  noteContent: string;
  createdAt: string;
}

export interface LessonBookmark {
  bookmarkId: string;
  userId: string;
  courseId: string;
  lessonId: string;
  timestamp: number; // video position in seconds
  label: string;
  createdAt: string;
}

export interface WatchHistory {
  historyId: string;
  userId: string;
  courseId: string;
  lessonId: string;
  lastWatchedPosition: number; // in seconds
  completed: boolean;
  watchPercentage: number;
  lastOpenedTime: string;
  totalLearningTime: number; // cumulative in seconds
}

export interface CourseDiscussion {
  discussionId: string;
  courseId: string;
  lessonId?: string;
  author: string;
  userId?: string;
  text: string;
  time: string;
  avatar?: string;
  createdAt: string;
}

// Public-domain educational video loop references (Google Cloud CDN)
const VIDEO_POOL = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4'
];

export const learningService = {
  // Fetch or Seed lessons for a specific course
  async getLessonsForCourse(courseId: string, fallbackChapters: any[] = []): Promise<CourseLesson[]> {
    const path = 'courseLessons';
    try {
      const q = query(collection(db, path), where('courseId', '==', courseId));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const lessons = snap.docs.map(d => d.data() as CourseLesson);
        lessons.sort((a, b) => a.sequenceOrder - b.sequenceOrder);
        return lessons;
      }
      
      // If Firestore is empty, seed lessons dynamically from chapters
      const seededLessons: CourseLesson[] = [];
      for (const ch of fallbackChapters) {
        for (const l of ch.lessons) {
          const lessonDoc: CourseLesson = {
            lessonId: l.lessonId,
            courseId: courseId,
            chapterId: ch.chapterId,
            title: l.title,
            duration: l.duration,
            sequenceOrder: l.sequenceOrder,
            isPreviewAllowed: l.isPreviewAllowed || false
          };
          await setDoc(doc(db, path, l.lessonId), lessonDoc);
          seededLessons.push(lessonDoc);
        }
      }
      return seededLessons;
    } catch (err) {
      // Graceful fallback to client-side mapping if there's any restriction
      console.warn('getLessonsForCourse fallback triggered:', err);
      const list: CourseLesson[] = [];
      for (const ch of fallbackChapters) {
        for (const l of ch.lessons) {
          list.push({
            lessonId: l.lessonId,
            courseId: courseId,
            chapterId: ch.chapterId,
            title: l.title,
            duration: l.duration,
            sequenceOrder: l.sequenceOrder,
            isPreviewAllowed: l.isPreviewAllowed || false
          });
        }
      }
      return list;
    }
  },

  // Fetch or Seed video asset for a specific lesson
  async getLessonVideo(courseId: string, lessonId: string, seqOrder: number, initialVideoUrl?: string): Promise<LessonVideo> {
    const path = 'lessonVideos';
    const videoId = `vid_${lessonId}`;
    const cleanInitialUrl = initialVideoUrl?.trim() || '';

    try {
      // 1. Try fetching 'vid_${lessonId}'
      let docRef = doc(db, path, videoId);
      let snap = await getDoc(docRef);

      // If not found, try '${lessonId}'
      if (!snap.exists()) {
        const altDocRef = doc(db, path, lessonId);
        const altSnap = await getDoc(altDocRef);
        if (altSnap.exists()) {
          docRef = altDocRef;
          snap = altSnap;
        }
      }

      if (snap.exists()) {
        const data = snap.data() as LessonVideo;
        
        // IMPORTANT FIX: Never overwrite a real video URL with a preset/pool URL.
        const isInitialReal = cleanInitialUrl && !VIDEO_POOL.includes(cleanInitialUrl);
        const isDataPreset = VIDEO_POOL.includes(data.videoUrl) || !data.videoUrl || data.videoUrl.trim() === '';
        
        // ONLY OVERWRITE if the existing data in lessonVideos is a preset/empty, 
        // AND the new initial URL from courses is a real URL.
        // DO NOT overwrite if data.videoUrl is ALREADY a real URL, to prevent stale state from destroying new Cloudinary uploads!
        if (isInitialReal && isDataPreset) {
          data.videoUrl = cleanInitialUrl;
          await setDoc(docRef, { ...data, videoUrl: cleanInitialUrl }, { merge: true }).catch(() => {});
        }
        return data;
      }

      // Seed video URL: prefer initialVideoUrl if provided, else fallback to VIDEO_POOL
      const urlIndex = seqOrder % VIDEO_POOL.length;
      const videoUrl = cleanInitialUrl || VIDEO_POOL[urlIndex];
      const videoDoc: LessonVideo = {
        videoId,
        lessonId,
        courseId,
        videoUrl,
        thumbnailUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80',
        duration: urlIndex === 0 || urlIndex === 1 || urlIndex === 6 ? 600 : 180 // reasonable seconds duration
      };
      await setDoc(docRef, videoDoc);
      return videoDoc;
    } catch (err) {
      console.warn('getLessonVideo fallback triggered:', err);
      const urlIndex = seqOrder % VIDEO_POOL.length;
      const videoUrl = cleanInitialUrl || VIDEO_POOL[urlIndex];
      return {
        videoId,
        lessonId,
        courseId,
        videoUrl,
        thumbnailUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80',
        duration: urlIndex === 0 || urlIndex === 1 || urlIndex === 6 ? 600 : 180
      };
    }
  },

  // Fetch or Seed resources for a specific lesson
  async getLessonResources(courseId: string, lessonId: string): Promise<LessonResource[]> {
    const path = 'lessonResources';
    try {
      const q = query(collection(db, path), where('lessonId', '==', lessonId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs.map(d => d.data() as LessonResource);
      }

      // Seed mock files
      const mockResources: LessonResource[] = [
        {
          resourceId: `res_${lessonId}_pdf`,
          lessonId,
          courseId,
          title: 'Class Presentation Slides & Quick Notes.pdf',
          type: 'pdf',
          downloadUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          fileSize: '2.4 MB'
        },
        {
          resourceId: `res_${lessonId}_zip`,
          lessonId,
          courseId,
          title: 'Practice Source Codes & Blueprints.zip',
          type: 'zip',
          downloadUrl: 'https://github.com/scandum/binary_search/archive/refs/heads/master.zip',
          fileSize: '15.8 MB'
        },
        {
          resourceId: `res_${lessonId}_img`,
          lessonId,
          courseId,
          title: 'Syllabus Architectural Concept Mindmap.png',
          type: 'image',
          downloadUrl: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=1200&auto=format&fit=crop&q=80',
          fileSize: '1.1 MB'
        }
      ];

      for (const res of mockResources) {
        await setDoc(doc(db, path, res.resourceId), res);
      }
      return mockResources;
    } catch (err) {
      console.warn('getLessonResources fallback triggered:', err);
      return [
        {
          resourceId: `res_${lessonId}_pdf`,
          lessonId,
          courseId,
          title: 'Class Presentation Slides & Quick Notes.pdf',
          type: 'pdf',
          downloadUrl: '#',
          fileSize: '2.4 MB'
        }
      ];
    }
  },

  // Fetch student notes for a lesson
  async getLessonNotes(userId: string, lessonId: string): Promise<LessonNote[]> {
    const path = 'lessonNotes';
    try {
      const q = query(
        collection(db, path), 
        where('userId', '==', userId), 
        where('lessonId', '==', lessonId)
      );
      const snap = await getDocs(q);
      const notes = snap.docs.map(d => d.data() as LessonNote);
      notes.sort((a, b) => a.timestamp - b.timestamp);
      return notes;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
      return [];
    }
  },

  // Save student note
  async saveLessonNote(note: Omit<LessonNote, 'noteId'> & { noteId?: string }): Promise<LessonNote> {
    const path = 'lessonNotes';
    const noteId = note.noteId || 'note_' + Math.random().toString(36).substring(2, 11).toUpperCase();
    const fullNote: LessonNote = {
      ...note,
      noteId
    };
    try {
      await setDoc(doc(db, path, noteId), fullNote);
      return fullNote;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
      return fullNote;
    }
  },

  // Delete student note
  async deleteLessonNote(noteId: string): Promise<void> {
    const path = 'lessonNotes';
    try {
      await deleteDoc(doc(db, path, noteId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  },

  // Fetch student bookmarks for a lesson
  async getLessonBookmarks(userId: string, lessonId: string): Promise<LessonBookmark[]> {
    const path = 'lessonBookmarks';
    try {
      const q = query(
        collection(db, path), 
        where('userId', '==', userId), 
        where('lessonId', '==', lessonId)
      );
      const snap = await getDocs(q);
      const bookmarks = snap.docs.map(d => d.data() as LessonBookmark);
      bookmarks.sort((a, b) => a.timestamp - b.timestamp);
      return bookmarks;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
      return [];
    }
  },

  // Save student bookmark
  async saveLessonBookmark(bookmark: Omit<LessonBookmark, 'bookmarkId'> & { bookmarkId?: string }): Promise<LessonBookmark> {
    const path = 'lessonBookmarks';
    const bookmarkId = bookmark.bookmarkId || 'bm_' + Math.random().toString(36).substring(2, 11).toUpperCase();
    const fullBookmark: LessonBookmark = {
      ...bookmark,
      bookmarkId
    };
    try {
      await setDoc(doc(db, path, bookmarkId), fullBookmark);
      return fullBookmark;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
      return fullBookmark;
    }
  },

  // Delete student bookmark
  async deleteLessonBookmark(bookmarkId: string): Promise<void> {
    const path = 'lessonBookmarks';
    try {
      await deleteDoc(doc(db, path, bookmarkId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  },

  // Fetch last watched state/history for a specific lesson
  async getWatchHistory(userId: string, lessonId: string): Promise<WatchHistory | null> {
    const path = 'watchHistory';
    const historyId = `${userId}_${lessonId}`;
    try {
      const docRef = doc(db, path, historyId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as WatchHistory;
      }
      return null;
    } catch (err) {
      console.warn('Failed to fetch watchHistory:', err);
      return null;
    }
  },

  // Save user watch position / resume history
  async saveWatchHistory(history: Omit<WatchHistory, 'historyId'>): Promise<WatchHistory> {
    const path = 'watchHistory';
    const historyId = `${history.userId}_${history.lessonId}`;
    const fullHistory: WatchHistory = {
      ...history,
      historyId
    };
    try {
      await setDoc(doc(db, path, historyId), fullHistory);
      return fullHistory;
    } catch (err) {
      console.warn('Failed to save watchHistory to Firestore:', err);
      return fullHistory;
    }
  },

  // Subscribe to real-time course/lesson discussions
  subscribeLessonDiscussions(
    courseId: string,
    lessonId?: string,
    onUpdate?: (discussions: CourseDiscussion[]) => void,
    onError?: (err: any) => void
  ) {
    const path = 'courseDiscussions';
    const colRef = collection(db, path);

    return onSnapshot(
      colRef,
      (snapshot) => {
        let items: CourseDiscussion[] = [];
        if (!snapshot.empty) {
          items = snapshot.docs
            .map(d => ({ ...d.data(), discussionId: d.id } as CourseDiscussion))
            .filter(item => item.courseId === courseId);
          
          items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        }

        // Merge with local storage for instant offline fallback
        const localKey = `nexus_discussions_${courseId}`;
        try {
          const localSaved = localStorage.getItem(localKey);
          if (localSaved) {
            const parsed: CourseDiscussion[] = JSON.parse(localSaved);
            const existingIds = new Set(items.map(i => i.discussionId));
            for (const lItem of parsed) {
              if (!existingIds.has(lItem.discussionId)) {
                items.push(lItem);
              }
            }
            items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          }
        } catch (e) {
          console.warn('Local storage discussions merge notice:', e);
        }

        // Default seed questions if totally empty
        if (items.length === 0) {
          items = [
            {
              discussionId: 'c1',
              courseId,
              author: 'Md. Tariqul Islam',
              text: 'Great explanation on the architecture setup! Really cleared up my confusion.',
              time: '2 hours ago',
              createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
            },
            {
              discussionId: 'c2',
              courseId,
              author: 'Nusrat Jahan',
              text: 'Where can I find the starter repository files for this lecture?',
              time: '5 hours ago',
              createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString()
            }
          ];
        }

        if (onUpdate) onUpdate(items);
      },
      (err) => {
        console.warn('subscribeLessonDiscussions listener warning, using local fallback:', err);
        const localKey = `nexus_discussions_${courseId}`;
        const localSaved = localStorage.getItem(localKey);
        if (localSaved && onUpdate) {
          try {
            onUpdate(JSON.parse(localSaved));
          } catch (e) {
            if (onError) onError(err);
          }
        } else if (onError) {
          onError(err);
        }
      }
    );
  },

  // Save new discussion post persistently to Firestore & LocalStorage
  async addLessonDiscussion(
    item: Omit<CourseDiscussion, 'discussionId' | 'createdAt'> & { discussionId?: string; createdAt?: string }
  ): Promise<CourseDiscussion> {
    const path = 'courseDiscussions';
    const discussionId = item.discussionId || 'disc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    const nowISO = new Date().toISOString();

    const fullItem: CourseDiscussion = {
      ...item,
      discussionId,
      createdAt: item.createdAt || nowISO
    };

    // 1. Save to LocalStorage immediately
    const localKey = `nexus_discussions_${item.courseId}`;
    try {
      const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
      const updated = [fullItem, ...existing.filter((i: any) => i.discussionId !== discussionId)];
      localStorage.setItem(localKey, JSON.stringify(updated));
    } catch (e) {
      console.warn('LocalStorage save discussion failed:', e);
    }

    // 2. Save to Firestore
    try {
      await setDoc(doc(db, path, discussionId), fullItem);
    } catch (err) {
      console.warn('Firestore setDoc failed for discussion, saved to LocalStorage:', err);
    }

    return fullItem;
  }
};
