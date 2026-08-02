import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  deleteDoc,
  serverTimestamp,
  getDoc
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

// Public-domain educational video loop references
const VIDEO_POOL = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
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
  async getLessonVideo(courseId: string, lessonId: string, seqOrder: number): Promise<LessonVideo> {
    const path = 'lessonVideos';
    const videoId = `vid_${lessonId}`;
    try {
      const docRef = doc(db, path, videoId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as LessonVideo;
      }

      // Seed a video dynamically
      const urlIndex = seqOrder % VIDEO_POOL.length;
      const videoUrl = VIDEO_POOL[urlIndex];
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
      return {
        videoId,
        lessonId,
        courseId,
        videoUrl: VIDEO_POOL[urlIndex],
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
  }
};
