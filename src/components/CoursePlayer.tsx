import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Clock, 
  BookOpen, 
  CheckCircle2, 
  Lock, 
  Unlock, 
  ChevronDown, 
  ChevronUp, 
  Award, 
  Play, 
  Pause,
  RefreshCw, 
  Sparkles, 
  AlertTriangle,
  AlertCircle,
  Flame,
  Check,
  ShieldCheck,
  Info,
  Maximize2,
  Minimize2,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Trash2,
  Plus,
  Bookmark,
  FileText,
  Download,
  ChevronRight,
  ChevronLeft,
  Settings,
  Tv,
  Calendar,
  MessageSquare,
  Share2,
  ExternalLink,
  Layers,
  HelpCircle
} from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { Course, CourseSection, CourseLesson, CurriculumChapter, CurriculumLesson, CourseReview } from '../types/course';
import { progressService, LessonProgressInfo, CourseProgressInfo } from '../services/progressService';
import { courseService, OperationType } from '../services/courseService';
import { learningService } from '../services/learningService';
import { certificateService } from '../services/certificateService';
import { Certificate } from '../types/certificate';
import { CertificateCelebrationView } from './CertificateCelebrationView';
import { PremiumCertificatePreview } from './PremiumCertificatePreview';
import { SmartVideoPlayer } from './SmartVideoPlayer';
import { ResourcesDashboard } from './ResourcesDashboard';
import { QuizDashboardView } from './QuizDashboardView';
import { AnnouncementBanner } from './AnnouncementBanner';
import { gamificationService, UserXP } from '../services/gamificationService';
import { AnimatedXPCounter } from './AnimatedXPCounter';
import { UnlockLessonModal } from './UnlockLessonModal';
import { soundFxService } from '../services/soundFxService';
import { EliteLoading } from './EliteLoading';

export interface CoursePlayerProps {
  course: Course;
  userProfile?: { uid?: string; fullName: string; username: string; email?: string; photoURL?: string; role?: string; isAdmin?: boolean } | null;
  onBack: () => void;
  onShowNotification: (message: string, type: 'success' | 'error') => void;
  purchasedCourseIds?: string[];
  onTriggerPurchase?: (course: Course) => void;
  initialLessonId?: string;
  initialTime?: number;
}

// Educational Video Samples Pool for default lessons (Google Cloud CDN)
const VIDEO_PRESETS = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4'
];

// Helper to normalize sections from course or fallback curriculum
function normalizeSections(rawCourse: Course): CourseSection[] {
  if (rawCourse.sections && Array.isArray(rawCourse.sections) && rawCourse.sections.length > 0) {
    return rawCourse.sections.map((sec, sIdx) => ({
      ...sec,
      sectionId: sec.sectionId || sec.id || `sec-${sIdx + 1}`,
      lessons: (sec.lessons || []).map((l, lIdx) => ({
        ...l,
        lessonId: l.lessonId || l.id || `l-${sIdx + 1}-${lIdx + 1}`,
        sectionId: sec.sectionId || sec.id || `sec-${sIdx + 1}`,
        sequenceOrder: l.sequenceOrder || lIdx + 1,
        videoUrl: l.videoUrl || '',
        duration: l.duration || '12:30',
        isPreviewAllowed: l.isPreviewAllowed ?? l.isFreePreview ?? (sIdx === 0 && lIdx === 0)
      }))
    }));
  }

  // Convert curriculum chapters to sections if sections not provided directly
  if (rawCourse.curriculum && Array.isArray(rawCourse.curriculum) && rawCourse.curriculum.length > 0) {
    return rawCourse.curriculum.map((ch, sIdx) => ({
      sectionId: ch.chapterId,
      title: ch.title,
      sequenceOrder: ch.sequenceOrder || sIdx + 1,
      lessons: ch.lessons.map((l, lIdx) => ({
        lessonId: l.lessonId,
        sectionId: ch.chapterId,
        chapterId: ch.chapterId,
        title: l.title,
        duration: l.duration,
        sequenceOrder: l.sequenceOrder || lIdx + 1,
        isPreviewAllowed: l.isPreviewAllowed,
        videoUrl: (l as any).videoUrl || ''
      }))
    }));
  }

  // Default 3 structured modules if no sections exist yet
  return [
    {
      sectionId: `${rawCourse.courseId}-sec-1`,
      title: 'Module 1: Orientation & Core Fundamentals',
      sequenceOrder: 1,
      lessons: [
        {
          lessonId: `${rawCourse.courseId}-l1`,
          sectionId: `${rawCourse.courseId}-sec-1`,
          title: '1. Welcome & Roadmap Overview',
          duration: '10:45',
          isPreviewAllowed: true,
          isFreePreview: true,
          videoUrl: VIDEO_PRESETS[0],
          sequenceOrder: 1
        },
        {
          lessonId: `${rawCourse.courseId}-l2`,
          sectionId: `${rawCourse.courseId}-sec-1`,
          title: '2. Setting Up Professional Development Environment',
          duration: '18:20',
          isPreviewAllowed: true,
          isFreePreview: true,
          videoUrl: VIDEO_PRESETS[1],
          sequenceOrder: 2
        },
        {
          lessonId: `${rawCourse.courseId}-l3`,
          sectionId: `${rawCourse.courseId}-sec-1`,
          title: '3. Deep Dive into Architectural Principles',
          duration: '24:50',
          isPreviewAllowed: false,
          videoUrl: VIDEO_PRESETS[2],
          sequenceOrder: 3
        }
      ]
    },
    {
      sectionId: `${rawCourse.courseId}-sec-2`,
      title: 'Module 2: Practical Implementation & Advanced Concepts',
      sequenceOrder: 2,
      lessons: [
        {
          lessonId: `${rawCourse.courseId}-l4`,
          sectionId: `${rawCourse.courseId}-sec-2`,
          title: '4. Hands-on Project Implementation & Real-world Workflows',
          duration: '35:10',
          isPreviewAllowed: false,
          videoUrl: VIDEO_PRESETS[3],
          sequenceOrder: 4
        },
        {
          lessonId: `${rawCourse.courseId}-l5`,
          sectionId: `${rawCourse.courseId}-sec-2`,
          title: '5. Debugging, Edge Cases, and Performance Tuning',
          duration: '29:40',
          isPreviewAllowed: false,
          videoUrl: VIDEO_PRESETS[3 % VIDEO_PRESETS.length],
          sequenceOrder: 5
        }
      ]
    },
    {
      sectionId: `${rawCourse.courseId}-sec-3`,
      title: 'Module 3: Capstone Deployment & Certification',
      sequenceOrder: 3,
      lessons: [
        {
          lessonId: `${rawCourse.courseId}-l6`,
          sectionId: `${rawCourse.courseId}-sec-3`,
          title: '6. Production Deployment & Industry Best Practices',
          duration: '42:15',
          isPreviewAllowed: false,
          videoUrl: VIDEO_PRESETS[0],
          sequenceOrder: 6
        }
      ]
    }
  ];
}

// Helper URL Sanitizer and Resolver
function resolveVideoSourceUrl(rawUrl?: string | null): string {
  if (!rawUrl) return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';

  const lower = trimmed.toLowerCase();
  // Check for invalid strings, placeholders, or undefined
  if (
    lower === 'cloudinary_url' ||
    lower === 'undefined' ||
    lower === 'null' ||
    lower === 'none' ||
    lower === 'n/a' ||
    lower === 'false' ||
    lower === '0'
  ) {
    return '';
  }

  let finalUrl = trimmed;
  if (finalUrl.includes('dropbox.com')) {
    finalUrl = finalUrl.replace('dl=0', 'dl=1').replace('www.dropbox.com', 'dl.dropboxusercontent.com');
  }

  // Prepend server/origin for relative paths starting with /
  if (finalUrl.startsWith('/')) {
    try {
      finalUrl = `${window.location.origin}${finalUrl}`;
    } catch (e) {
      // fallback
    }
  }

  return finalUrl;
}

// Check for embed providers
function isEmbedProvider(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.includes('youtube.com') ||
    lower.includes('youtu.be') ||
    lower.includes('vimeo.com') ||
    lower.includes('drive.google.com') ||
    lower.includes('loom.com')
  );
}

// Format embed provider URL
function formatEmbedUrl(url: string): string {
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    let videoId = '';
    if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split(/[?#]/)[0] || '';
    } else if (url.includes('shorts/')) {
      videoId = url.split('shorts/')[1]?.split(/[?#]/)[0] || '';
    } else if (url.includes('watch?v=')) {
      videoId = url.split('watch?v=')[1]?.split('&')[0] || '';
    } else if (url.includes('/embed/')) {
      videoId = '';
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0` : url;
  } else if (url.includes('vimeo.com')) {
    const vId = url.replace(/[^0-9]/g, '');
    return `https://player.vimeo.com/video/${vId}?autoplay=1`;
  } else if (url.includes('drive.google.com')) {
    let fileId = '';
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) fileId = match[1];
    return fileId ? `https://drive.google.com/file/d/${fileId}/preview` : url;
  } else if (url.includes('loom.com')) {
    const lId = url.split('/share/')[1]?.split('?')[0] || url.split('/embed/')[1]?.split('?')[0] || '';
    return lId ? `https://www.loom.com/embed/${lId}` : url;
  }
  return url;
}

export function CoursePlayer({
  course: initialCourse,
  userProfile,
  onBack,
  onShowNotification,
  purchasedCourseIds = [],
  onTriggerPurchase,
  initialLessonId,
  initialTime = 0
}: CoursePlayerProps) {
  const userId = userProfile?.uid || auth.currentUser?.uid || userProfile?.username || 'user_anon';
  const userEmail = userProfile?.email || auth.currentUser?.email || userProfile?.username || '';

  // 1. Live Synchronized Course State
  const [course, setCourse] = useState<Course>(initialCourse);
  const [sections, setSections] = useState<CourseSection[]>(() => normalizeSections(initialCourse));
  const [currentLesson, setCurrentLesson] = useState<CourseLesson | null>(() => {
    const parsed = normalizeSections(initialCourse);
    const all = parsed.flatMap(s => s.lessons);
    if (initialLessonId) {
      const found = all.find(l => l.lessonId === initialLessonId);
      if (found) return found;
    }
    return all[0] || null;
  });
  const [activeVideoUrl, setActiveVideoUrl] = useState<string>('');
  const [videoHasError, setVideoHasError] = useState<boolean>(false);
  const [openSectionIds, setOpenSectionIds] = useState<Record<string, boolean>>({});
  const [activeInitialTime, setActiveInitialTime] = useState<number>(initialTime);

  // 2. Authorization & Enrollment check
  const [hasApprovedPurchase, setHasApprovedPurchase] = useState<boolean>(false);
  const [hasPendingApproval, setHasPendingApproval] = useState<boolean>(false);

  // Admin / Superadmin privilege bypass check
  const isAdmin = Boolean(
    userEmail.toLowerCase() === 'wahid23hasan@gmail.com' ||
    userEmail.toLowerCase().includes('admin') ||
    userProfile?.role === 'admin' ||
    userProfile?.isAdmin
  );

  const isEnrolled = isAdmin || purchasedCourseIds.includes(course.courseId) || hasApprovedPurchase;

  // 3. Progress and Analytics State
  const [lessonProgress, setLessonProgress] = useState<LessonProgressInfo[]>([]);
  const [overallProgress, setOverallProgress] = useState<CourseProgressInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // 4. Interactive Tabs State (Lesson Notes, Comments, Resources, Quizzes, Overview)
  const [activeTab, setActiveTab] = useState<'syllabus' | 'notes' | 'discussion' | 'resources' | 'quizzes' | 'overview'>('notes');
  const [notes, setNotes] = useState<Array<{ id: string; timestamp: number; title: string; content: string; date: string }>>([]);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [comments, setComments] = useState<Array<{ id: string; author: string; text: string; time: string; avatar?: string }>>([
    { id: 'c1', author: 'Md. Tariqul Islam', text: 'Great explanation on the architecture setup! Really cleared up my confusion.', time: '2 hours ago' },
    { id: 'c2', author: 'Nusrat Jahan', text: 'Where can I find the starter repository files for this lecture?', time: '5 hours ago' }
  ]);
  const [newComment, setNewComment] = useState('');

  // 5. Certificate & Graduation State
  const [isEligibleForCertificate, setIsEligibleForCertificate] = useState<boolean>(false);
  const [generatedCertificate, setGeneratedCertificate] = useState<Certificate | null>(null);
  const [showCelebration, setShowCelebration] = useState<boolean>(false);
  const [showCertPreview, setShowCertPreview] = useState<boolean>(false);
  const [userXP, setUserXP] = useState<number>(0);
  const [xpUnlockedLessonIds, setXpUnlockedLessonIds] = useState<Record<string, boolean>>({});
  const [unlockTargetLesson, setUnlockTargetLesson] = useState<CourseLesson | null>(null);

  // Helper to create valid Certificate object with instantaneous fallback
  const createFallbackCert = (): Certificate => {
    const studentDisplayName = userProfile?.fullName || userProfile?.username || auth.currentUser?.displayName || 'Distinguished Scholar';
    const certId = `cert_${userId}_${course.courseId}`;
    const verificationId = `VERIFY-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const nowISO = new Date().toISOString();

    return {
      certificateId: certId,
      userId,
      studentName: studentDisplayName,
      courseId: course.courseId,
      courseName: course.title,
      instructorName: course.instructor || 'Nexus Faculty',
      completionDate: nowISO,
      issueDate: nowISO,
      verificationId,
      isVerified: true,
      qrCodePlaceholderUrl: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
        `${window.location.origin}?verify=${verificationId}`
      )}`,
      signaturePlaceholderUrl: 'https://images.unsplash.com/photo-1581090464762-c43c2c99d4f0?auto=format&fit=crop&q=80&w=200',
      templateId: 'template_nexus_dark_gold'
    };
  };

  const getCurriculumChapters = (secs: CourseSection[]): CurriculumChapter[] => {
    return secs.map((sec, idx) => {
      const les = (sec.lessons || []).map((l, lIdx) => ({
        lessonId: l.lessonId || `les_${idx + 1}_${lIdx + 1}`,
        title: l.title || `Lesson ${lIdx + 1}`,
        duration: l.duration || '05:00',
        sequenceOrder: l.sequenceOrder || lIdx + 1,
        isPreviewAllowed: Boolean(l.isPreviewAllowed || l.isFreePreview)
      }));
      return {
        chapterId: sec.sectionId || `ch_${idx + 1}`,
        courseId: course.courseId,
        title: sec.title || `Section ${idx + 1}`,
        sequenceOrder: sec.sequenceOrder || idx + 1,
        lessonsCount: les.length,
        totalDuration: `${les.length * 10}m`,
        lessons: les
      };
    });
  };

  // 1. REAL-TIME FIRESTORE SUBSCRIPTION: onSnapshot on "courses/{courseId}"
  useEffect(() => {
    if (!course.courseId) return;

    setLoading(true);
    const courseDocRef = doc(db, 'courses', course.courseId);

    const unsubscribe = onSnapshot(
      courseDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const courseData = { ...docSnap.data(), courseId: docSnap.id } as Course;
          setCourse(courseData);

          const parsedSections = normalizeSections(courseData);
          setSections(parsedSections);

          // Default open first section
          if (parsedSections.length > 0) {
            setOpenSectionIds(prev => ({
              ...prev,
              [parsedSections[0].sectionId || 'sec-0']: true
            }));
          }

          // When snapshot updates, ensure currentLesson automatically falls back or picks initialLessonId
          setCurrentLesson(prevActive => {
            const allLessons = parsedSections.flatMap(s => s.lessons);
            if (initialLessonId) {
              const target = allLessons.find(l => l.lessonId === initialLessonId);
              if (target) return target;
            }
            if (!prevActive) {
              return allLessons[0] || null;
            }
            // If active lesson exists in new sections, update it with fresh data (e.g. newly uploaded videoUrl)
            const updated = allLessons.find(l => l.lessonId === prevActive.lessonId);
            return updated || allLessons[0] || null;
          });
        } else {
          // If Firestore document doesn't exist yet, fallback to props
          const parsedSections = normalizeSections(initialCourse);
          setSections(parsedSections);
          if (!currentLesson && parsedSections[0]?.lessons[0]) {
            const allLessons = parsedSections.flatMap(s => s.lessons);
            const target = initialLessonId ? allLessons.find(l => l.lessonId === initialLessonId) : null;
            setCurrentLesson(target || parsedSections[0].lessons[0]);
          }
        }
        setLoading(false);
      },
      (error) => {
        console.warn('Firestore onSnapshot notice on courses (falling back to cached/prop course):', error);
        // Fallback to offline / mock sections
        const parsedSections = normalizeSections(initialCourse);
        setSections(parsedSections);
        if (!currentLesson && parsedSections[0]?.lessons[0]) {
          const allLessons = parsedSections.flatMap(s => s.lessons);
          const target = initialLessonId ? allLessons.find(l => l.lessonId === initialLessonId) : null;
          setCurrentLesson(target || parsedSections[0].lessons[0]);
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [course.courseId]);

  // Check user purchases & progress
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userPurchases = await courseService.getUserPurchases(userId, userEmail);
        const myCourses = await progressService.getUserMyCourses(userId, userEmail);

        const hasApproved = userPurchases.some(p => 
          p.courseId === course.courseId && 
          (p.status === 'approved' || p.status === 'success' || p.status === 'active')
        ) || myCourses.some(m => m.courseId === course.courseId);

        if (hasApproved) {
          setHasApprovedPurchase(true);
          setHasPendingApproval(false);
        } else if (userPurchases.some(p => p.courseId === course.courseId && p.status === 'pending')) {
          setHasPendingApproval(true);
        }

        // Fetch lesson progress
        const prog = await progressService.getLessonProgresses(userId, course.courseId);
        setLessonProgress(prog);

        const cProg = await progressService.getCourseProgress(userId, course.courseId);
        setOverallProgress(cProg);

        // Preload User XP for smooth animated counter feedback
        gamificationService.getUserXP(userId).then((xpData) => {
          if (xpData?.totalXP !== undefined) {
            setUserXP(xpData.totalXP);
          }
        }).catch(() => {});

        // Preload XP Unlocked Lessons
        const allSecLessonsList = sections.flatMap(s => s.lessons);
        allSecLessonsList.forEach((les) => {
          gamificationService.isLessonUnlockedWithXP(userId, course.courseId, les.lessonId).then((unlocked) => {
            if (unlocked) {
              setXpUnlockedLessonIds(prev => ({ ...prev, [les.lessonId]: true }));
            }
          });
        });

        // Preload Certificate if user already finished
        const allSecLessons = sections.flatMap(s => s.lessons);
        const compCount = allSecLessons.filter(l => prog.some(p => p.lessonId === l.lessonId && p.completed)).length;
        if (compCount >= allSecLessons.length && allSecLessons.length > 0) {
          setIsEligibleForCertificate(true);
          certificateService.getCertificate(userId, course.courseId).then((existingCert) => {
            if (existingCert) setGeneratedCertificate(existingCert);
          }).catch(() => {});
        }

        // Load local saved notes for lesson
        const savedNotes = localStorage.getItem(`nexus_notes_${course.courseId}`);
        if (savedNotes) {
          setNotes(JSON.parse(savedNotes));
        }
      } catch (err) {
        console.warn('Failed to load user enrollment/progress:', err);
      }
    };

    fetchUserData();

    const handleSyncXP = () => {
      gamificationService.getUserXP(userId).then((xpData) => {
        if (xpData?.totalXP !== undefined) {
          setUserXP(xpData.totalXP);
        }
      }).catch(() => {});
    };
    window.addEventListener('nexus_xp_updated', handleSyncXP);

    return () => {
      window.removeEventListener('nexus_xp_updated', handleSyncXP);
    };
  }, [course.courseId, userId, userEmail]);

  // Real-time Discussion & Q/A Firestore subscription
  useEffect(() => {
    if (!course.courseId) return;

    const unsubscribeDiscussions = learningService.subscribeLessonDiscussions(
      course.courseId,
      currentLesson?.lessonId,
      (updatedDiscussions) => {
        setComments(updatedDiscussions.map(d => ({
          id: d.discussionId,
          author: d.author,
          text: d.text,
          time: d.time || 'Recently',
          avatar: d.avatar
        })));
      }
    );

    return () => unsubscribeDiscussions();
  }, [course.courseId, currentLesson?.lessonId]);

  // Update active initial time when currentLesson or lessonProgress changes
  useEffect(() => {
    if (currentLesson) {
      const saved = lessonProgress.find(p => p.lessonId === currentLesson.lessonId);
      if (saved?.lastPositionSeconds && saved.lastPositionSeconds > 0) {
        setActiveInitialTime(saved.lastPositionSeconds);
      } else if (initialLessonId && currentLesson.lessonId === initialLessonId && initialTime > 0) {
        setActiveInitialTime(initialTime);
      } else {
        setActiveInitialTime(0);
      }
    }
  }, [currentLesson?.lessonId, lessonProgress, initialLessonId, initialTime]);

  // Synchronize active lesson video URL with real-time Firestore listener & custom sync events (Admin Panel Live Sync)
  useEffect(() => {
    let isMounted = true;
    if (!currentLesson || !course.courseId) return;

    // Helper validator
    const isStreamableUrl = (url?: string | null): boolean => {
      if (!url) return false;
      const u = url.trim().toLowerCase();
      if (!u) return false;
      if (
        u.startsWith('firestore:') ||
        u.startsWith('vid_') ||
        (u.startsWith('v_') && !u.includes('.') && !u.includes('/')) ||
        u === 'undefined' ||
        u === 'null' ||
        u === 'none'
      ) return false;
      return true;
    };

    // 1. If currentLesson already has a custom videoUrl, prioritize it immediately
    const cleanLessonVideoUrl = (currentLesson.videoUrl || (currentLesson as any).video_url || '').trim();
    if (isStreamableUrl(cleanLessonVideoUrl) && !VIDEO_PRESETS.includes(cleanLessonVideoUrl)) {
      setActiveVideoUrl(cleanLessonVideoUrl);
    }

    // 2. Fetch latest video document from lessonVideos collection
    const fetchActiveLessonVideo = async () => {
      try {
        const vidData = await learningService.getLessonVideo(
          course.courseId,
          currentLesson.lessonId,
          currentLesson.sequenceOrder || 1,
          (isStreamableUrl(cleanLessonVideoUrl) && !VIDEO_PRESETS.includes(cleanLessonVideoUrl)) ? cleanLessonVideoUrl : undefined
        );
        if (isMounted && vidData && isStreamableUrl(vidData.videoUrl)) {
          setActiveVideoUrl(vidData.videoUrl.trim());
          return;
        }
      } catch (err) {
        console.warn('Could not fetch video from lessonVideos collection:', err);
      }

      if (isStreamableUrl(cleanLessonVideoUrl)) {
        if (isMounted) setActiveVideoUrl(cleanLessonVideoUrl);
        return;
      }

      if (isMounted) {
        const seqIdx = Math.max(0, (currentLesson.sequenceOrder || 1) - 1);
        setActiveVideoUrl(VIDEO_PRESETS[seqIdx % VIDEO_PRESETS.length]);
      }
    };

    fetchActiveLessonVideo();

    // 3. Real-time Firestore snapshot listeners for live sync from Admin Panel edits
    const videoDocId1 = `vid_${currentLesson.lessonId}`;
    const videoDocId2 = currentLesson.lessonId;

    const unsubscribe1 = onSnapshot(
      doc(db, 'lessonVideos', videoDocId1),
      (snapshot) => {
        if (snapshot.exists() && isMounted) {
          const data = snapshot.data();
          if (data && isStreamableUrl(data.videoUrl)) {
            setActiveVideoUrl(data.videoUrl.trim());
          }
        }
      },
      () => {}
    );

    const unsubscribe2 = onSnapshot(
      doc(db, 'lessonVideos', videoDocId2),
      (snapshot) => {
        if (snapshot.exists() && isMounted) {
          const data = snapshot.data();
          if (data && isStreamableUrl(data.videoUrl)) {
            setActiveVideoUrl(data.videoUrl.trim());
          }
        }
      },
      () => {}
    );

    // 4. Custom DOM Event listener for instant in-tab Admin edits
    const handleCustomVideoSync = (e: Event) => {
      const customEvt = e as CustomEvent;
      if (customEvt.detail?.lessonId === currentLesson.lessonId && customEvt.detail?.videoUrl) {
        if (isMounted) {
          setActiveVideoUrl(customEvt.detail.videoUrl);
        }
      }
    };
    window.addEventListener('nexus_video_updated', handleCustomVideoSync);

    return () => {
      isMounted = false;
      unsubscribe1();
      unsubscribe2();
      window.removeEventListener('nexus_video_updated', handleCustomVideoSync);
    };
  }, [currentLesson?.lessonId, currentLesson?.videoUrl, course.courseId]);

  // Reset video playback error state whenever lesson or active video URL changes
  useEffect(() => {
    setVideoHasError(false);
  }, [currentLesson?.lessonId, activeVideoUrl]);

  // Check completion & evaluate certificate
  const evaluateCompletion = async (currentProgress: LessonProgressInfo[] = lessonProgress) => {
    const allLessons = sections.flatMap(s => s.lessons);
    if (allLessons.length === 0) return;

    const completedCount = allLessons.filter(l => 
      currentProgress.some(p => p.lessonId === l.lessonId && p.completed)
    ).length;

    const isComplete = completedCount >= allLessons.length && allLessons.length > 0;
    if (isComplete) {
      setIsEligibleForCertificate(true);
      
      if (!generatedCertificate) {
        // Just pre-fetch if one exists already
        certificateService.getCertificate(userId, course.courseId).then(existingCert => {
          if (existingCert) {
            setGeneratedCertificate(existingCert);
          }
        }).catch(err => {
          console.warn('Silent fetch error for existing cert:', err);
        });
      }
    }
  };

  // Toggle Lesson Completion
  const handleToggleLessonComplete = async (lesson: CourseLesson) => {
    const currentProg = lessonProgress.find(p => p.lessonId === lesson.lessonId);
    const newStatus = !currentProg?.completed;

    const updatedList: LessonProgressInfo[] = [
      ...lessonProgress.filter(p => p.lessonId !== lesson.lessonId),
      {
        userId,
        courseId: course.courseId,
        lessonId: lesson.lessonId,
        completed: newStatus,
        watchedPercentage: newStatus ? 100 : 0,
        lastUpdated: new Date().toISOString()
      }
    ];
    setLessonProgress(updatedList);

    try {
      const allLessonsCount = sections.flatMap(s => s.lessons).length || 10;
      await progressService.setLessonCompletionStatus(
        userId,
        course.courseId,
        lesson.lessonId,
        newStatus,
        allLessonsCount
      );

      if (newStatus) {
        onShowNotification(`🎉 Lesson "${lesson.title}" marked complete! (+20 XP)`, 'success');
        gamificationService.recordLessonCompletion(userId, lesson.title, updatedList.filter(l => l.completed).length).then(() => {
          setUserXP(prev => prev + 20);
          window.dispatchEvent(new Event('nexus_xp_updated'));
        }).catch(() => {
          setUserXP(prev => prev + 20);
          window.dispatchEvent(new Event('nexus_xp_updated'));
        });
        evaluateCompletion(updatedList);
      } else {
        onShowNotification(`Lesson "${lesson.title}" marked incomplete.`, 'success');
      }
    } catch (err) {
      console.warn('Error saving lesson progress:', err);
    }
  };

  // Open Certificate Preview Safely
  const handleOpenCertificate = async () => {
    if (generatedCertificate) {
      setShowCertPreview(true);
      return;
    }
    try {
      const curriculumChapters = getCurriculumChapters(sections);
      let cert = await certificateService.getCertificate(userId, course.courseId);
      
      let isNew = false;
      if (!cert) {
        cert = await certificateService.generateCertificate(
          userId,
          course.courseId,
          userProfile?.fullName || userProfile?.username || 'Distinguished Scholar',
          course.title,
          course.instructor || 'Nexus Faculty',
          curriculumChapters
        );
        isNew = true;
      }
      
      if (!cert) {
        cert = createFallbackCert();
      }
      
      setGeneratedCertificate(cert);
      
      if (isNew) {
        setShowCelebration(true);
        await gamificationService.recordCourseCompletion(userId, course.title);
        setUserXP(prev => prev + 300);
      } else {
        setShowCertPreview(true);
      }
    } catch (err) {
      console.warn('Fallback certificate loaded:', err);
      const cert = createFallbackCert();
      setGeneratedCertificate(cert);
      setShowCertPreview(true);
    }
  };

  // Lock validation check: Enrolled students (and admins) have 100% unrestricted access to all lessons
  const isLessonLocked = (lesson: CourseLesson): boolean => {
    if (isEnrolled) {
      return false;
    }
    if (xpUnlockedLessonIds[lesson.lessonId]) {
      return false;
    }
    const isPreview = Boolean(
      lesson.isPreviewAllowed || 
      lesson.isFreePreview || 
      (lesson as any).freePreview || 
      (lesson as any).isFree
    );
    if (isPreview) {
      return false;
    }
    return true;
  };

  // Switch Lesson with Permission Check
  const handleSelectLesson = (lesson: CourseLesson) => {
    if (isLessonLocked(lesson)) {
      setUnlockTargetLesson(lesson);
      return;
    }
    setCurrentLesson(lesson);
  };

  // Handle Note Save
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;

    const newNote = {
      id: `note_${Date.now()}`,
      timestamp: Date.now(),
      title: newNoteTitle.trim() || currentLesson?.title || 'Lecture Note',
      content: newNoteContent.trim(),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };

    const updated = [newNote, ...notes];
    setNotes(updated);
    localStorage.setItem(`nexus_notes_${course.courseId}`, JSON.stringify(updated));
    setNewNoteTitle('');
    setNewNoteContent('');
    onShowNotification('📝 Study note saved successfully!', 'success');
  };

  // Handle Comment / Discussion Submission
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const commentText = newComment.trim();
    setNewComment('');

    const item = {
      courseId: course.courseId,
      lessonId: currentLesson?.lessonId,
      author: userProfile?.fullName || 'Scholar',
      userId,
      text: commentText,
      time: 'Just now',
      avatar: userProfile?.photoURL || ''
    };

    // Immediate optimistic update
    const optimisticItem = {
      id: `comm_${Date.now()}`,
      author: item.author,
      text: item.text,
      time: 'Just now',
      avatar: item.avatar
    };
    setComments(prev => [optimisticItem, ...prev]);

    try {
      await learningService.addLessonDiscussion(item);
      onShowNotification('💬 Discussion question posted and saved!', 'success');
    } catch (err) {
      console.warn('Error saving persistent discussion:', err);
      onShowNotification('💬 Discussion question posted locally.', 'success');
    }
  };

  // Progress metrics calculation
  const allLessons = sections.flatMap(s => s.lessons);
  const totalLessonsCount = allLessons.length;
  const completedLessonsCount = allLessons.filter(l => 
    lessonProgress.some(p => p.lessonId === l.lessonId && p.completed)
  ).length;
  const progressPercentage = totalLessonsCount > 0 ? Math.round((completedLessonsCount / totalLessonsCount) * 100) : 0;

  // Next / Previous Navigation
  const currentLessonIndex = allLessons.findIndex(l => l.lessonId === currentLesson?.lessonId);
  const prevLesson = currentLessonIndex > 0 ? allLessons[currentLessonIndex - 1] : null;
  const nextLesson = currentLessonIndex >= 0 && currentLessonIndex < allLessons.length - 1 ? allLessons[currentLessonIndex + 1] : null;

  const isCurrentLessonComplete = currentLesson 
    ? lessonProgress.some(p => p.lessonId === currentLesson.lessonId && p.completed)
    : false;

  return (
    <div className="flex-1 flex flex-col bg-[#050811] text-slate-100 min-h-screen">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-[#050811]/90 backdrop-blur-md border-b border-white/10 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3 truncate">
            <button
              onClick={onBack}
              className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="truncate">
              <h1 className="text-sm md:text-base font-bold text-white truncate">{course.title}</h1>
              <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-400">
                <span>{course.instructor}</span>
                <span>•</span>
                <span className="text-[#39FF14]">{completedLessonsCount}/{totalLessonsCount} Completed ({progressPercentage}%)</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Live Animated XP Counter for tactile feedback on lesson/course completion */}
            <div className="flex items-center px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-xs text-white">
              <AnimatedXPCounter
                value={userXP}
                size="xs"
                showIcon={true}
                suffix=" XP"
                glowColor="#39FF14"
                showFloatingGain={true}
              />
            </div>

            {isAdmin && (
              <span className="hidden sm:flex px-2 py-0.5 rounded bg-purple-500/20 border border-purple-500/40 text-purple-300 font-mono text-[10px] uppercase font-bold items-center space-x-1">
                <ShieldCheck size={12} />
                <span>Admin</span>
              </span>
            )}

            {(isEligibleForCertificate || progressPercentage >= 100 || (completedLessonsCount >= totalLessonsCount && totalLessonsCount > 0)) && (
              <button
                onClick={handleOpenCertificate}
                className="px-3 py-1.5 bg-[#FFD700] hover:bg-[#FFD700]/90 text-black font-bold font-mono text-xs rounded-xl flex items-center space-x-1.5 transition-colors cursor-pointer shadow-lg shadow-[#FFD700]/20 animate-pulse hover:animate-none"
              >
                <Award size={14} />
                <span>{generatedCertificate ? 'View Certificate' : 'Claim Your Certificate 🎓'}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Classroom Layout */}
      <main className="max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: VIDEO PLAYER & LESSON INTERACTIVE CONTENT (Cols 1-8) */}
        <section className="lg:col-span-8 flex flex-col space-y-4">
          {/* 1. Video Player Container */}
          <div className="w-full bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10 aspect-video flex items-center justify-center relative">
            {currentLesson ? (
              (() => {
                // Prioritize the real Cloudinary/uploaded video URL over any presets
                let rawUrl = activeVideoUrl || currentLesson.videoUrl || (currentLesson as any).url || (currentLesson as any).video || '';
                
                const currentIsPreset = VIDEO_PRESETS.includes(currentLesson.videoUrl || '');
                const activeIsPreset = VIDEO_PRESETS.includes(activeVideoUrl || '');
                
                if (activeVideoUrl && !activeIsPreset) {
                  rawUrl = activeVideoUrl;
                } else if (currentLesson.videoUrl && !currentIsPreset) {
                  rawUrl = currentLesson.videoUrl;
                }
                
                const resolvedVideoUrl = resolveVideoSourceUrl(rawUrl);

                return (
                  <SmartVideoPlayer
                    key={currentLesson.lessonId}
                    videoUrl={resolvedVideoUrl || activeVideoUrl}
                    title={currentLesson.title}
                    autoPlay={false}
                    initialTime={activeInitialTime}
                    onTimeUpdate={(currTime, durationSecs) => {
                      if (currentLesson && durationSecs > 0) {
                        const pct = Math.min(100, Math.round((currTime / durationSecs) * 100));
                        const isCompleted = pct >= 90;
                        const totalLessons = sections.flatMap(s => s.lessons).length || 10;
                        progressService.updateLessonProgress(
                          userId,
                          course.courseId,
                          currentLesson.lessonId,
                          isCompleted,
                          pct,
                          totalLessons,
                          Math.round(currTime),
                          Math.round(durationSecs)
                        );
                      }
                    }}
                    onEnded={() => {
                      if (!isCurrentLessonComplete) {
                        handleToggleLessonComplete(currentLesson);
                      }
                    }}
                  />
                );
              })()
            ) : (
              <div className="w-full h-full aspect-video flex flex-col items-center justify-center text-center p-8 bg-slate-950 space-y-2">
                <AlertCircle size={32} className="text-amber-400 mx-auto opacity-80" />
                <p className="text-slate-300 font-medium text-sm">এই লেসনে এখনও ভিডিও যোগ করা হয়নি</p>
                <p className="text-slate-500 text-xs">কারিকুলাম থেকে একটি লেসন নির্বাচন করুন</p>
              </div>
            )}
          </div>

          {/* 2. Current Lesson Action Controls Bar */}
          {currentLesson && (
            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-3">
              {/* Left Info: Free preview badge if applicable or Lesson index */}
              <div className="flex items-center space-x-2">
                {(currentLesson.isPreviewAllowed || currentLesson.isFreePreview) ? (
                  <span className="px-2 py-0.5 bg-[#39FF14]/10 border border-[#39FF14]/30 text-[#39FF14] text-[10px] rounded-lg font-bold font-mono uppercase">
                    Free Preview
                  </span>
                ) : (
                  <span className="text-xs text-slate-400 font-mono">
                    Lesson {currentLessonIndex + 1} of {totalLessonsCount}
                  </span>
                )}
              </div>

              {/* Mark Complete & Nav Buttons */}
              <div className="flex items-center space-x-2 shrink-0">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleToggleLessonComplete(currentLesson)}
                  className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                    isCurrentLessonComplete
                      ? 'bg-[#39FF14]/20 border border-[#39FF14] text-[#39FF14]'
                      : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                  }`}
                >
                  <CheckCircle2 size={15} />
                  <span>{isCurrentLessonComplete ? 'Completed' : 'Mark as Complete'}</span>
                </motion.button>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => prevLesson && handleSelectLesson(prevLesson)}
                    disabled={!prevLesson}
                    className="p-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed border border-white/10 rounded-xl text-white cursor-pointer"
                    title="Previous Lesson"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => nextLesson && handleSelectLesson(nextLesson)}
                    disabled={!nextLesson}
                    className="p-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed border border-white/10 rounded-xl text-white cursor-pointer"
                    title="Next Lesson"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 3. Interactive Main Content Tabs (Notes, Comments, Resources, Overview) */}
          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 md:p-5 space-y-4">
            {/* Tabs Header */}
            <div className="flex items-center space-x-2 border-b border-white/10 pb-3 overflow-x-auto">
              {[
                { id: 'notes', label: 'Notes & Scratchpad', icon: FileText },
                { id: 'discussion', label: 'Discussion & Q/A', icon: MessageSquare },
                { id: 'resources', label: 'Course Resources', icon: Download },
                { id: 'quizzes', label: 'Assessments & Quizzes', icon: Award },
                { id: 'overview', label: 'About Course', icon: BookOpen }
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold whitespace-nowrap flex items-center space-x-1.5 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#39FF14] text-black shadow-lg shadow-[#39FF14]/20'
                        : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icon size={14} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* TAB 1: NOTES */}
            {activeTab === 'notes' && (
              <div className="space-y-4 font-mono text-xs">
                <form onSubmit={handleAddNote} className="bg-black/30 border border-white/10 rounded-xl p-3.5 space-y-2.5">
                  <span className="text-[#39FF14] font-bold block uppercase text-[10px]">Create Study Note</span>
                  <input
                    type="text"
                    value={newNoteTitle}
                    onChange={(e) => setNewNoteTitle(e.target.value)}
                    placeholder="Note Topic / Headline..."
                    className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs outline-none focus:border-[#39FF14]"
                  />
                  <textarea
                    rows={3}
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    placeholder="Write down key takeaways, code formulas, or study notes..."
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-xs outline-none focus:border-[#39FF14]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-[#39FF14] text-black font-bold rounded-lg text-xs hover:bg-[#39FF14]/90 cursor-pointer"
                  >
                    Save Note
                  </button>
                </form>

                {/* Notes List */}
                <div className="space-y-2">
                  {notes.length === 0 ? (
                    <p className="text-slate-500 py-4 text-center">No notes written for this lecture yet.</p>
                  ) : (
                    notes.map(n => (
                      <div key={n.id} className="p-3 bg-white/[0.02] border border-white/10 rounded-xl space-y-1">
                        <div className="flex justify-between items-center text-slate-400 text-[10px]">
                          <span className="font-bold text-[#39FF14]">{n.title}</span>
                          <span>{n.date}</span>
                        </div>
                        <p className="text-slate-300 font-sans text-xs">{n.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: DISCUSSION / Q&A */}
            {activeTab === 'discussion' && (
              <div className="space-y-4 font-mono text-xs">
                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Ask a question or share a thought with peers..."
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-[#39FF14]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#39FF14] text-black font-bold rounded-xl hover:bg-[#39FF14]/90 cursor-pointer whitespace-nowrap"
                  >
                    Post Question
                  </button>
                </form>

                <div className="space-y-3">
                  {comments.map(c => (
                    <div key={c.id} className="p-3 bg-white/[0.02] border border-white/10 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-white">{c.author}</span>
                        <span className="text-slate-500 text-[10px]">{c.time}</span>
                      </div>
                      <p className="text-slate-300 font-sans text-xs">{c.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: RESOURCES */}
            {activeTab === 'resources' && (
              <div>
                <ResourcesDashboard 
                  course={course}
                  curriculum={getCurriculumChapters(sections)}
                  userId={userId}
                  isEnrolled={isEnrolled}
                  onTriggerPurchase={(c) => onTriggerPurchase ? onTriggerPurchase(c) : undefined}
                  onBack={() => setActiveTab('notes')}
                  onShowNotification={onShowNotification} 
                />
              </div>
            )}

            {/* TAB 4: QUIZZES */}
            {activeTab === 'quizzes' && (
              <div>
                <QuizDashboardView 
                  courseId={course.courseId} 
                  chapters={getCurriculumChapters(sections)}
                  onShowNotification={onShowNotification} 
                />
              </div>
            )}

            {/* TAB 5: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-4 text-xs">
                <div>
                  <h3 className="font-bold text-white text-sm mb-1">About This Course</h3>
                  <p className="text-slate-300 leading-relaxed font-sans">{course.description}</p>
                </div>

                {(() => {
                  const safeOutcomes = Array.isArray(course.learningOutcomes)
                    ? course.learningOutcomes
                    : typeof course.learningOutcomes === 'string'
                      ? (course.learningOutcomes as string).split('\n').flatMap(s => s.split(',')).map(s => s.trim()).filter(Boolean)
                      : [];
                  return safeOutcomes.length > 0 ? (
                    <div>
                      <h4 className="font-bold text-[#39FF14] font-mono text-xs uppercase mb-2">What you will learn</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-mono">
                        {safeOutcomes.map((item, idx) => (
                          <div key={idx} className="flex items-start space-x-2 text-slate-300">
                            <Check size={14} className="text-[#39FF14] shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            )}
          </div>
        </section>

        {/* RIGHT COLUMN: CURRICULUM SIDEBAR (Cols 9-12) */}
        <aside className="lg:col-span-4 flex flex-col space-y-4">
          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 md:p-5 flex flex-col h-full max-h-[85vh]">
            
            {/* Sidebar Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
              <div>
                <h3 className="font-mono font-bold text-white text-sm flex items-center space-x-2">
                  <Layers size={16} className="text-[#39FF14]" />
                  <span>Course Curriculum</span>
                </h3>
                <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                  {sections.length} Modules • {totalLessonsCount} Lessons
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs font-mono font-extrabold text-[#39FF14]">{progressPercentage}%</span>
                <span className="text-[9px] block text-slate-500 uppercase">Progress</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mb-4">
              <div
                className="bg-[#39FF14] h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>

            {/* Structured Sections and Lessons List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {loading ? (
                <EliteLoading variant="card" compact label="SYNCING CURRICULUM NODES" subLabel="FETCHING LESSON STRUCTURE" />
              ) : sections.length === 0 ? (
                <div className="py-8 text-center text-xs font-mono text-slate-500">
                  No modules or lessons found for this course.
                </div>
              ) : (
                sections.map((section, sIdx) => {
                  const secId = section.sectionId || `sec-${sIdx}`;
                  const isOpen = openSectionIds[secId] !== false; // default open
                  const sectionCompletedCount = section.lessons.filter(l => 
                    lessonProgress.some(p => p.lessonId === l.lessonId && p.completed)
                  ).length;

                  return (
                    <div key={secId} className="border border-white/10 rounded-xl overflow-hidden bg-black/20">
                      {/* Section Accordion Header */}
                      <button
                        onClick={() => setOpenSectionIds(prev => ({ ...prev, [secId]: !isOpen }))}
                        className="w-full p-3 bg-white/[0.02] hover:bg-white/5 text-left flex items-center justify-between transition-colors cursor-pointer"
                      >
                        <div className="truncate pr-2">
                          <span className="text-[10px] font-mono text-[#39FF14] uppercase block font-bold">
                            Module {section.sequenceOrder || sIdx + 1}
                          </span>
                          <h4 className="text-xs font-bold text-white truncate">{section.title}</h4>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0 font-mono text-[10px] text-slate-400">
                          <span>{sectionCompletedCount}/{section.lessons.length}</span>
                          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </div>
                      </button>

                      {/* Section Lessons */}
                      {isOpen && (
                        <div className="p-1.5 space-y-1 bg-black/40 border-t border-white/5">
                          {section.lessons.map((lesson, lIdx) => {
                            const isSelected = currentLesson?.lessonId === lesson.lessonId;
                            const isCompleted = lessonProgress.some(p => p.lessonId === lesson.lessonId && p.completed);
                            const locked = isLessonLocked(lesson);

                            return (
                              <button
                                key={lesson.lessonId || `les-${lIdx}`}
                                onClick={() => handleSelectLesson(lesson)}
                                className={`w-full p-2.5 rounded-lg text-left transition-all flex items-center justify-between group cursor-pointer ${
                                  isSelected
                                    ? 'bg-[#39FF14]/15 border border-[#39FF14]/40 text-[#39FF14]'
                                    : 'bg-white/[0.01] hover:bg-white/5 text-slate-300 border border-transparent'
                                }`}
                              >
                                <div className="flex items-center space-x-2.5 truncate pr-2">
                                  {/* Status Icon */}
                                  {isCompleted ? (
                                    <CheckCircle2 size={15} className="text-[#39FF14] shrink-0" />
                                  ) : locked ? (
                                    <Lock size={14} className="text-slate-500 shrink-0" />
                                  ) : isSelected ? (
                                    <Play size={14} className="text-[#39FF14] fill-[#39FF14] shrink-0 animate-pulse" />
                                  ) : (
                                    <span className="w-4 text-center font-mono text-[10px] text-slate-500 shrink-0">
                                      {lesson.sequenceOrder || lIdx + 1}
                                    </span>
                                  )}

                                  <div className="truncate">
                                    <p className={`text-xs font-medium truncate ${isSelected ? 'text-white font-bold' : ''}`}>
                                      {lesson.title}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center space-x-1.5 shrink-0 font-mono text-[9px]">
                                  {(lesson.isPreviewAllowed || lesson.isFreePreview) && !isEnrolled && (
                                    <span className="px-1.5 py-0.5 bg-[#39FF14]/10 text-[#39FF14] rounded font-bold uppercase">
                                      Preview
                                    </span>
                                  )}
                                  {lesson.duration && (
                                    <span className="text-slate-500">{lesson.duration}</span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Non-Enrolled CTA Lock Banner */}
            {!isEnrolled && (
              <div className="mt-3 p-3 bg-gradient-to-r from-purple-950/40 to-slate-900/60 border border-purple-500/30 rounded-xl text-center space-y-2">
                <Lock size={18} className="mx-auto text-purple-400" />
                <p className="text-xs font-bold text-white">Full Access Locked</p>
                <p className="text-[10px] text-slate-400">Enroll to unlock all {totalLessonsCount} HD lessons and get certified.</p>
                {onTriggerPurchase && (
                  <button
                    onClick={() => onTriggerPurchase(course)}
                    className="w-full py-1.5 bg-[#39FF14] hover:bg-[#39FF14]/90 text-black font-bold font-mono text-xs rounded-lg uppercase cursor-pointer"
                  >
                    Enroll Now • ৳{course.discountPrice || course.price}
                  </button>
                )}
              </div>
            )}

          </div>
        </aside>

      </main>

      {/* Graduation Certificate Celebration Modal */}
      {showCelebration && generatedCertificate && (
        <CertificateCelebrationView
          certificate={generatedCertificate}
          courseName={course.title}
          onClose={() => setShowCelebration(false)}
          onBrowseCourses={onBack}
          onDownloadCertificate={() => {
            setShowCelebration(false);
            setShowCertPreview(true);
          }}
        />
      )}

      {/* Certificate Viewer Preview Modal */}
      {showCertPreview && generatedCertificate && (
        <PremiumCertificatePreview
          certificate={generatedCertificate}
          onClose={() => setShowCertPreview(false)}
          onShowNotification={onShowNotification}
        />
      )}

      {/* Unlock Single Lesson with XP Modal */}
      {unlockTargetLesson && (
        <UnlockLessonModal
          isOpen={Boolean(unlockTargetLesson)}
          onClose={() => setUnlockTargetLesson(null)}
          lesson={unlockTargetLesson}
          courseId={course.courseId}
          courseTitle={course.title}
          userId={userId}
          currentUserXP={userXP}
          onSuccess={(remainingXP) => {
            setUserXP(remainingXP);
            if (unlockTargetLesson) {
              setXpUnlockedLessonIds(prev => ({ ...prev, [unlockTargetLesson.lessonId]: true }));
              setCurrentLesson(unlockTargetLesson);
            }
          }}
          onShowNotification={onShowNotification}
          onTriggerFullEnroll={onTriggerPurchase ? () => onTriggerPurchase(course) : undefined}
        />
      )}
    </div>
  );
}
