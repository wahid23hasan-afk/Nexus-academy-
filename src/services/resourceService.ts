import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  deleteDoc,
  getDoc,
  updateDoc,
  increment
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { StudyResource, ResourceDownload, OfflineResource, ReadingProgress } from '../types/resources';

// Helper to determine generalized category for filters
export function getCategoryForType(type: string): 'pdf' | 'doc' | 'audio' | 'image' | 'zip' | 'link' {
  const t = type.toLowerCase();
  if (t === 'pdf') return 'pdf';
  if (['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(t)) return 'doc';
  if (t === 'audio') return 'audio';
  if (['image', 'jpg', 'jpeg', 'png', 'gif', 'svg'].includes(t)) return 'image';
  if (t === 'zip') return 'zip';
  return 'link';
}

const SAMPLE_SHORT_DESCS = [
  'Essential study companion with complete structural outline, step-by-step walk-throughs, and expert remarks.',
  'Contains fully annotated slide decks covering high-impact themes, structural breakdowns, and blueprint layouts.',
  'Comprehensive workbook comprising practical code repositories, boilerplate assets, and system mockups.',
  'Architectural conceptual mindmap tracing structural relations, key terminologies, and flow structures.',
  'Interactive worksheets, solution sets, and spreadsheet calculators tailored for high-fidelity practice.',
  'High-quality audio narration of complex concepts, vocabulary references, and core summary cards.'
];

export const resourceService = {
  // Get all resources for a specific course, grouped by chapter and lesson, with automatic seeding if Firestore is empty
  async getResourcesForCourse(courseId: string, chapters: any[]): Promise<StudyResource[]> {
    const collName = 'courseResources';
    try {
      const q = query(collection(db, collName), where('courseId', '==', courseId));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        return snap.docs.map(d => d.data() as StudyResource);
      }

      // No resources found in Firestore, let's seed them beautifully matching the exact chapter/lessons
      const seededResources: StudyResource[] = [];
      const resourceTypes: Array<StudyResource['type']> = ['pdf', 'ppt', 'zip', 'image', 'xls', 'audio', 'link'];
      
      let resIndex = 0;
      for (const ch of chapters) {
        for (const lesson of ch.lessons || []) {
          // Create 2-3 resources per lesson
          const typesForThisLesson: Array<StudyResource['type']> = [
            'pdf', 
            resourceTypes[(resIndex + 1) % resourceTypes.length],
            resourceTypes[(resIndex + 2) % resourceTypes.length]
          ];

          for (const type of typesForThisLesson) {
            const resourceId = `res_${courseId}_${lesson.lessonId}_${type}`;
            
            let downloadUrl = '#';
            let fileSize = '1.2 MB';
            if (type === 'pdf') {
              downloadUrl = 'https://raw.githubusercontent.com/mozilla/pdf.js/master/web/compressed.tracemonkey-pldi-09.pdf';
              fileSize = '1.8 MB';
            } else if (type === 'zip') {
              downloadUrl = 'https://github.com/scandum/binary_search/archive/refs/heads/master.zip';
              fileSize = '14.2 MB';
            } else if (type === 'image') {
              downloadUrl = 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=1200&auto=format&fit=crop&q=80';
              fileSize = '2.4 MB';
            } else if (type === 'audio') {
              downloadUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
              fileSize = '6.8 MB';
            } else {
              downloadUrl = 'https://google.com';
              fileSize = 'External Link';
            }

            const title = type === 'pdf' 
              ? `${lesson.title} - Ultimate Slides & Guide.pdf`
              : type === 'zip'
              ? `${lesson.title} - Code Sandboxes & Boilerplates.zip`
              : type === 'image'
              ? `${lesson.title} - Architectural Mindmap.png`
              : type === 'xls'
              ? `${lesson.title} - Data Calculation Sheet.xlsx`
              : type === 'ppt' || type === 'pptx'
              ? `${lesson.title} - Slide Presentation Deck.pptx`
              : type === 'audio'
              ? `${lesson.title} - Concept Audio Narrative.mp3`
              : `${lesson.title} - Extra Material Reference Link`;

            const shortDescription = SAMPLE_SHORT_DESCS[resIndex % SAMPLE_SHORT_DESCS.length];

            const resource: StudyResource = {
              resourceId,
              courseId,
              chapterId: ch.chapterId,
              chapterTitle: ch.title,
              lessonId: lesson.lessonId,
              lessonTitle: lesson.title,
              title,
              type,
              downloadUrl,
              fileSize,
              uploadDate: new Date(Date.now() - (resIndex * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
              downloadCount: 12 + (resIndex * 3),
              shortDescription,
              thumbnailUrl: type === 'image' ? downloadUrl : undefined
            };

            await setDoc(doc(db, collName, resourceId), resource);
            
            // Also seed under lessonResources for compatibility
            await setDoc(doc(db, 'lessonResources', resourceId), resource);

            seededResources.push(resource);
            resIndex++;
          }
        }
      }
      return seededResources;
    } catch (err) {
      console.warn('getResourcesForCourse Firestore fetch/seed failed, loading fallback local resources:', err);
      // Fallback local mock data
      const list: StudyResource[] = [];
      let resIndex = 0;
      for (const ch of chapters) {
        for (const lesson of ch.lessons || []) {
          const resourceId = `res_${courseId}_${lesson.lessonId}_pdf`;
          list.push({
            resourceId,
            courseId,
            chapterId: ch.chapterId,
            chapterTitle: ch.title,
            lessonId: lesson.lessonId,
            lessonTitle: lesson.title,
            title: `${lesson.title} - Lecture Reference Notes.pdf`,
            type: 'pdf',
            downloadUrl: 'https://raw.githubusercontent.com/mozilla/pdf.js/master/web/compressed.tracemonkey-pldi-09.pdf',
            fileSize: '1.8 MB',
            uploadDate: '2026-07-01',
            downloadCount: 45,
            shortDescription: 'Comprehensive student study companion for this classroom session.'
          });
          resIndex++;
        }
      }
      return list;
    }
  },

  // Record a download increment in Firestore
  async incrementDownloadCount(resourceId: string): Promise<void> {
    try {
      const docRef = doc(db, 'courseResources', resourceId);
      await updateDoc(docRef, {
        downloadCount: increment(1)
      });
    } catch (err) {
      console.warn('Silent download count increment failed:', err);
    }
  },

  // Save/Get local Reading Progress for PDFs
  async getReadingProgress(userId: string, resourceId: string): Promise<ReadingProgress | null> {
    const collName = 'readingProgress';
    try {
      const docRef = doc(db, collName, `${userId}_${resourceId}`);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as ReadingProgress;
      }
    } catch (err) {
      console.warn('getReadingProgress Firestore fetch failed:', err);
    }

    // LocalStorage Fallback
    const local = localStorage.getItem(`nexus_rp_${userId}_${resourceId}`);
    if (local) {
      return JSON.parse(local) as ReadingProgress;
    }
    return null;
  },

  async saveReadingProgress(progress: ReadingProgress): Promise<void> {
    const collName = 'readingProgress';
    const docId = `${progress.userId}_${progress.resourceId}`;
    try {
      await setDoc(doc(db, collName, docId), progress);
    } catch (err) {
      console.warn('saveReadingProgress Firestore write failed:', err);
    }

    // Always fallback/cache locally in LocalStorage
    localStorage.setItem(`nexus_rp_${progress.userId}_${progress.resourceId}`, JSON.stringify(progress));
  },

  // Get and Save offline downloaded resources
  async getOfflineResources(courseId: string): Promise<OfflineResource[]> {
    const local = localStorage.getItem(`nexus_offline_res_${courseId}`);
    if (local) {
      return JSON.parse(local) as OfflineResource[];
    }
    return [];
  },

  async saveOfflineResource(courseId: string, offlineRes: OfflineResource): Promise<void> {
    const current = await this.getOfflineResources(courseId);
    const updated = current.filter(r => r.resourceId !== offlineRes.resourceId);
    updated.push(offlineRes);
    localStorage.setItem(`nexus_offline_res_${courseId}`, JSON.stringify(updated));

    // Store in Firestore collection too for cloud replication
    try {
      const userId = auth.currentUser?.uid || 'anonymous';
      await setDoc(doc(db, 'offlineResources', `${userId}_${offlineRes.resourceId}`), {
        userId,
        courseId,
        resourceId: offlineRes.resourceId,
        title: offlineRes.title,
        type: offlineRes.type,
        fileSize: offlineRes.fileSize,
        downloadedAt: offlineRes.downloadedAt
      });
    } catch (err) {
      console.warn('offlineResources Firestore write failed:', err);
    }
  },

  async removeOfflineResource(courseId: string, resourceId: string): Promise<void> {
    const current = await this.getOfflineResources(courseId);
    const updated = current.filter(r => r.resourceId !== resourceId);
    localStorage.setItem(`nexus_offline_res_${courseId}`, JSON.stringify(updated));

    try {
      const userId = auth.currentUser?.uid || 'anonymous';
      await deleteDoc(doc(db, 'offlineResources', `${userId}_${resourceId}`));
    } catch (err) {
      console.warn('offlineResources Firestore delete failed:', err);
    }
  }
};
