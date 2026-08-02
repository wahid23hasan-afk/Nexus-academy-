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
  Calendar
} from 'lucide-react';
import { certificateService } from '../services/certificateService';
import { Certificate } from '../types/certificate';
import { CertificateCelebrationView } from './CertificateCelebrationView';
import { PremiumCertificatePreview } from './PremiumCertificatePreview';
import { Course, CurriculumChapter, CurriculumLesson } from '../types/course';
import { progressService, LessonProgressInfo, CourseProgressInfo } from '../services/progressService';
import { courseService } from '../services/courseService';
import { auth } from '../services/firebase';
import { 
  learningService, 
  CourseLesson, 
  LessonVideo, 
  LessonResource, 
  LessonNote, 
  LessonBookmark, 
  WatchHistory 
} from '../services/learningService';
import { ResourcesDashboard } from './ResourcesDashboard';
import { QuizDashboardView } from './QuizDashboardView';
import { AnnouncementBanner } from './AnnouncementBanner';
import { gamificationService } from '../services/gamificationService';

interface LearningDashboardViewProps {
  course: Course;
  userProfile: { fullName: string; username: string; photoURL?: string } | null;
  onBack: () => void;
  onShowNotification: (message: string, type: 'success' | 'error') => void;
  purchasedCourseIds: string[];
  onTriggerPurchase: (course: Course) => void;
}

export function LearningDashboardView({
  course,
  userProfile,
  onBack,
  onShowNotification,
  purchasedCourseIds,
  onTriggerPurchase
}: LearningDashboardViewProps) {
  const userId = auth.currentUser?.uid || userProfile?.username || 'anonymous_user';
  const userEmail = auth.currentUser?.email || userProfile?.username || '';

  // Approval states
  const [hasPendingApproval, setHasPendingApproval] = useState<boolean>(false);
  const [hasApprovedPurchase, setHasApprovedPurchase] = useState<boolean>(false);

  const isEnrolled = purchasedCourseIds.includes(course.courseId) || hasApprovedPurchase;

  // Core curriculum state loaded from Firestore
  const [curriculum, setCurriculum] = useState<CurriculumChapter[]>([]);
  const [lessonProgress, setLessonProgress] = useState<LessonProgressInfo[]>([]);
  const [overallProgress, setOverallProgress] = useState<CourseProgressInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeLesson, setActiveLesson] = useState<CurriculumLesson | null>(null);
  const [openChapters, setOpenChapters] = useState<Record<string, boolean>>({});

  // Dynamic lesson asset states loaded when active lesson shifts
  const [activeVideo, setActiveVideo] = useState<LessonVideo | null>(null);
  const [activeResources, setActiveResources] = useState<LessonResource[]>([]);
  const [notes, setNotes] = useState<LessonNote[]>([]);
  const [bookmarks, setBookmarks] = useState<LessonBookmark[]>([]);
  const [loadingActiveDetails, setLoadingActiveDetails] = useState<boolean>(false);

  // Certificate and Course Graduation System state variables
  const [isEligibleForCertificate, setIsEligibleForCertificate] = useState<boolean>(false);
  const [generatedCertificate, setGeneratedCertificate] = useState<Certificate | null>(null);
  const [showCelebration, setShowCelebration] = useState<boolean>(false);
  const [showCertPreview, setShowCertPreview] = useState<boolean>(false);
  const [evaluatingCompletion, setEvaluatingCompletion] = useState<boolean>(false);

  // Note/Bookmark Creation state
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [activeTab, setActiveTab] = useState<'syllabus' | 'notes' | 'bookmarks' | 'resources' | 'quizzes'>('syllabus');

  // Video element interaction states
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [videoDuration, setVideoDuration] = useState<number>(1);
  const [volume, setVolume] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [videoQuality, setVideoQuality] = useState<'Auto' | '1080p' | '720p'>('Auto');
  const [showControls, setShowControls] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [pendingResumeSeconds, setPendingResumeSeconds] = useState<number | null>(null);
  const [watchPctLogged, setWatchPctLogged] = useState<number>(0);
  const [totalSessionWatchTime, setTotalSessionWatchTime] = useState<number>(0);

  // Autohide controls timer ref
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Core Data Sync with Firestore
  const loadLearningData = async (isRefreshed = false) => {
    if (isRefreshed) setRefreshing(true);
    else setLoading(true);

    try {
      // Check user purchases and myCourses for this course matching userId OR userEmail
      const userPurchases = await courseService.getUserPurchases(userId, userEmail);
      const myCourses = await progressService.getUserMyCourses(userId, userEmail);

      const matchPurchase = userPurchases.find(p => p.courseId === course.courseId);
      const matchMyCourse = myCourses.find(m => m.courseId === course.courseId);

      if (matchPurchase) {
        if (matchPurchase.status === 'pending') {
          setHasPendingApproval(true);
          setHasApprovedPurchase(false);
        } else if (matchPurchase.status === 'approved' || matchPurchase.status === 'success' || matchPurchase.status === 'active') {
          setHasApprovedPurchase(true);
          setHasPendingApproval(false);
        }
      } else if (matchMyCourse) {
        setHasApprovedPurchase(true);
        setHasPendingApproval(false);
      }

      // Fetch core syllabus chapters
      const chapters = await courseService.getCurriculum(course.courseId);

      // Fetch dynamic lesson data from Firebase Firestore
      const dbLessons = await learningService.getLessonsForCourse(course.courseId, chapters);

      // Map dynamic database lessons back to chapters to maintain structured taxonomy
      const mappedChapters = chapters.map(ch => ({
        ...ch,
        lessons: dbLessons.filter(l => l.chapterId === ch.chapterId)
      }));
      setCurriculum(mappedChapters);

      // Default expand first chapter
      if (mappedChapters.length > 0) {
        setOpenChapters({ [mappedChapters[0].chapterId]: true });
      }

      // Sync overall progress logs from Firestore
      const lessonsProg = await progressService.getLessonProgresses(userId, course.courseId);
      setLessonProgress(lessonsProg);

      const courseProg = await progressService.getCourseProgress(userId, course.courseId);
      setOverallProgress(courseProg);

      // Pre-select next unfinished lesson or last studied lesson
      const allLessons = mappedChapters.flatMap(ch => ch.lessons);
      let nextToStudy: CurriculumLesson | null = null;

      if (courseProg?.lastOpenedDate) {
        const lastStudiedId = courseProg.completedLessons > 0 ? courseProg.userId : '';
        const found = allLessons.find(l => l.lessonId === lastStudiedId);
        if (found) nextToStudy = found;
      }

      if (!nextToStudy) {
        const unfinished = allLessons.find(l => {
          const prog = lessonsProg.find(lp => lp.lessonId === l.lessonId);
          return !prog || !prog.completed;
        });
        nextToStudy = unfinished || allLessons[0] || null;
      }

      setActiveLesson(nextToStudy);
      
      // Auto-evaluate graduation certificate eligibility after loading curriculum data
      setTimeout(() => {
        evaluateGraduationCert(true);
      }, 500);
    } catch (err) {
      console.error('Error syncing curriculum metrics:', err);
      onShowNotification('Failed to sync complete curriculum from Firestore.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isEnrolled) {
      loadLearningData();
    }
  }, [course.courseId, isEnrolled]);

  // 2. Fetch specific video & interaction details when active lesson switches
  useEffect(() => {
    if (activeLesson && userId && isEnrolled) {
      const loadLessonDetails = async () => {
        setLoadingActiveDetails(true);
        try {
          // Fetch dynamic video, notes, bookmarks and resource documents
          const video = await learningService.getLessonVideo(course.courseId, activeLesson.lessonId, activeLesson.sequenceOrder);
          setActiveVideo(video);

          const res = await learningService.getLessonResources(course.courseId, activeLesson.lessonId);
          setActiveResources(res);

          const notesList = await learningService.getLessonNotes(userId, activeLesson.lessonId);
          setNotes(notesList);

          const bmList = await learningService.getLessonBookmarks(userId, activeLesson.lessonId);
          setBookmarks(bmList);

          const history = await learningService.getWatchHistory(userId, activeLesson.lessonId);
          if (history && history.lastWatchedPosition > 4) {
            setPendingResumeSeconds(history.lastWatchedPosition);
          } else {
            setPendingResumeSeconds(null);
          }

          // Reset active video session parameters
          setCurrentTime(0);
          setIsPlaying(false);
          setWatchPctLogged(0);
          if (videoRef.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.playbackRate = playbackSpeed;
          }
        } catch (err) {
          console.error('Failed loading active lesson details:', err);
        } finally {
          setLoadingActiveDetails(false);
        }
      };
      loadLessonDetails();
    }
  }, [activeLesson?.lessonId, userId, isEnrolled]);

  const evaluateGraduationCert = async (silent = true) => {
    if (!userId || !isEnrolled || curriculum.length === 0) return;
    if (!silent) setEvaluatingCompletion(true);
    try {
      const status = await certificateService.checkCourseCompletion(userId, course.courseId, curriculum);
      setIsEligibleForCertificate(status.completed);
      
      if (status.completed) {
        // Find if they already have a generated certificate, or generate it!
        const existing = await certificateService.getUserCertificates(userId);
        const match = existing.find(c => c.courseId === course.courseId);
        if (match) {
          setGeneratedCertificate(match);
        } else {
          // Auto generate!
          const newCert = await certificateService.generateCertificate(
            userId,
            course.courseId,
            userProfile?.fullName || 'Scholar',
            course.title,
            course.instructor,
            curriculum
          );
          setGeneratedCertificate(newCert);
          
          // Trigger celebration!
          const celebratedKey = `nexus_celebrated_${userId}_${course.courseId}`;
          if (!localStorage.getItem(celebratedKey)) {
            localStorage.setItem(celebratedKey, 'true');
            setShowCelebration(true);
          }
        }
      }
    } catch (err) {
      console.warn('Silent graduation evaluation failed:', err);
    } finally {
      if (!silent) setEvaluatingCompletion(false);
    }
  };

  // Re-run evaluation on activeTab change to capture newly passed quizzes
  useEffect(() => {
    if (activeTab) {
      evaluateGraduationCert(true);
    }
  }, [activeTab, curriculum]);

  // Autohide controls logic
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying]);

  // Toggle chapter collapse
  const toggleChapter = (chapterId: string) => {
    setOpenChapters(prev => ({ ...prev, [chapterId]: !prev[chapterId] }));
  };

  // Check lesson completion from progress arrays
  const isLessonCompleted = (lessonId: string) => {
    const found = lessonProgress.find(lp => lp.lessonId === lessonId);
    return found ? found.completed : false;
  };

  // Unlocking mechanism: Sequential Locking
  const isLessonLocked = (lesson: CurriculumLesson) => {
    const allLessons = curriculum.flatMap(ch => ch.lessons);
    const currIndex = allLessons.findIndex(l => l.lessonId === lesson.lessonId);
    if (currIndex <= 0) return false; // First lesson is always unlocked

    // Locked if previous sequential lesson is incomplete
    const prevLesson = allLessons[currIndex - 1];
    return !isLessonCompleted(prevLesson.lessonId);
  };

  // Trigger manual or auto-marking as completed
  const handleToggleLessonCompleted = async (lesson: CurriculumLesson) => {
    const isCurrentlyCompleted = isLessonCompleted(lesson.lessonId);
    const nextCompleted = !isCurrentlyCompleted;

    const optimisticProg: LessonProgressInfo = {
      userId,
      courseId: course.courseId,
      lessonId: lesson.lessonId,
      completed: nextCompleted,
      watchedPercentage: nextCompleted ? 100 : 0,
      lastUpdated: new Date().toISOString()
    };

    setLessonProgress(prev => {
      const filtered = prev.filter(lp => lp.lessonId !== lesson.lessonId);
      return [...filtered, optimisticProg];
    });

    const totalLessonsCount = curriculum.flatMap(ch => ch.lessons).length;
    const completedCount = [...lessonProgress.filter(lp => lp.lessonId !== lesson.lessonId), optimisticProg].filter(lp => lp.completed).length;
    const computedPercentage = Math.min(100, Math.round((completedCount / totalLessonsCount) * 100));

    setOverallProgress(prev => {
      if (!prev) return null;
      return {
        ...prev,
        completedLessons: completedCount,
        progressPercent: computedPercentage,
        lastOpenedDate: new Date().toISOString()
      };
    });

    try {
      await progressService.updateLessonProgress(
        userId,
        course.courseId,
        lesson.lessonId,
        nextCompleted,
        nextCompleted ? 100 : 0,
        totalLessonsCount
      );

      // Save watch history state as well
      await learningService.saveWatchHistory({
        userId,
        courseId: course.courseId,
        lessonId: lesson.lessonId,
        lastWatchedPosition: nextCompleted ? (videoDuration || 180) : 0,
        completed: nextCompleted,
        watchPercentage: nextCompleted ? 100 : 0,
        lastOpenedTime: new Date().toISOString(),
        totalLearningTime: totalSessionWatchTime + 5
      });

      onShowNotification(
        nextCompleted 
          ? `✓ Completed: "${lesson.title.substring(0, 20)}..."! Next class unlocked.`
          : `Removed completion for "${lesson.title.substring(0, 20)}..."`,
        'success'
      );

      if (nextCompleted) {
        gamificationService.addXP(userId, 20, 'Completed Lesson');
        gamificationService.updateGoalProgress(userId, 'complete_lesson', 1);
        
        // If course is 100% completed
        if (computedPercentage === 100) {
          gamificationService.addXP(userId, 200, `Completed Course: ${course.title}`);
          gamificationService.unlockAchievement(userId, 'course_champion', 'Course Champion', `Finished ${course.title}`, '🎓');
        }
      }

      // Auto check and trigger graduation celebrations!
      evaluateGraduationCert(true);
    } catch (err) {
      console.error('Failed to sync lesson progress:', err);
      onShowNotification('Progress saved locally, but online sync lagged.', 'error');
    }
  };

  const handleSelectLesson = (lesson: CurriculumLesson) => {
    if (isLessonLocked(lesson)) {
      onShowNotification('This class is locked! Complete preceding lesson first to progress.', 'error');
      return;
    }
    setActiveLesson(lesson);
  };

  // Interactive Video controls
  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
      syncPlaybackProgress();
    } else {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => console.warn(err));
    }
  };

  const handleSeek = (seconds: number) => {
    if (!videoRef.current) return;
    let nextTime = videoRef.current.currentTime + seconds;
    if (nextTime < 0) nextTime = 0;
    if (nextTime > videoDuration) nextTime = videoDuration;
    videoRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const seekTime = pos * videoDuration;
    videoRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    setIsMuted(vol === 0);
    if (videoRef.current) {
      videoRef.current.volume = vol;
      videoRef.current.muted = vol === 0;
    }
  };

  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (videoRef.current) {
      videoRef.current.muted = nextMute;
    }
  };

  const handleTogglePiP = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      onShowNotification('Picture-in-Picture is not supported in this environment.', 'error');
    }
  };

  const handleToggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(() => onShowNotification('Fullscreen request rejected.', 'error'));
    } else {
      document.exitFullscreen()
        .then(() => setIsFullscreen(false));
    }
  };

  const handleResumePlayback = () => {
    if (videoRef.current && pendingResumeSeconds) {
      videoRef.current.currentTime = pendingResumeSeconds;
      setCurrentTime(pendingResumeSeconds);
      setPendingResumeSeconds(null);
      onShowNotification(`Resumed playback at ${formatDurationSeconds(pendingResumeSeconds)}`, 'success');
      videoRef.current.play().then(() => setIsPlaying(true));
    }
  };

  const syncPlaybackProgress = async () => {
    if (!videoRef.current || !activeLesson) return;
    const current = videoRef.current.currentTime;
    const duration = videoDuration || 1;
    const pct = Math.min(100, Math.round((current / duration) * 100));

    try {
      await learningService.saveWatchHistory({
        userId,
        courseId: course.courseId,
        lessonId: activeLesson.lessonId,
        lastWatchedPosition: Math.round(current),
        completed: pct >= 90 || isLessonCompleted(activeLesson.lessonId),
        watchPercentage: pct,
        lastOpenedTime: new Date().toISOString(),
        totalLearningTime: totalSessionWatchTime
      });
    } catch (err) {
      console.warn('Watch history sync lagged:', err);
    }
  };

  // Periodic Watch Progress Auto-Completion & Firestore sync
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && activeLesson) {
      interval = setInterval(() => {
        setTotalSessionWatchTime(prev => prev + 2);
        if (videoRef.current) {
          const current = videoRef.current.currentTime;
          const pct = Math.round((current / (videoDuration || 1)) * 100);

          // Auto Complete lesson at 90% watch time
          if (pct >= 90 && !isLessonCompleted(activeLesson.lessonId)) {
            handleToggleLessonCompleted(activeLesson);
          }

          // Throttle saves to Firestore
          if (Math.abs(pct - watchPctLogged) >= 5) {
            setWatchPctLogged(pct);
            syncPlaybackProgress();
          }
        }
      }, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, activeLesson, videoDuration, watchPctLogged]);

  // Formatter utilities
  const formatDurationSeconds = (secondsNum: number) => {
    const mins = Math.floor(secondsNum / 60);
    const secs = Math.floor(secondsNum % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Add notes linked to video timestamps
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLesson) return;
    if (!newNoteTitle.trim() || !newNoteContent.trim()) {
      onShowNotification('Note title and details cannot be empty!', 'error');
      return;
    }

    const noteSec = Math.round(currentTime);
    const newNote: Omit<LessonNote, 'noteId'> = {
      userId,
      courseId: course.courseId,
      lessonId: activeLesson.lessonId,
      timestamp: noteSec,
      noteTitle: newNoteTitle.trim(),
      noteContent: newNoteContent.trim(),
      createdAt: new Date().toISOString()
    };

    try {
      const saved = await learningService.saveLessonNote(newNote);
      setNotes(prev => [...prev, saved].sort((a, b) => a.timestamp - b.timestamp));
      setNewNoteTitle('');
      setNewNoteContent('');
      onShowNotification(`Note captured at ${formatDurationSeconds(noteSec)}!`, 'success');
    } catch (err) {
      onShowNotification('Failed to sync note online.', 'error');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await learningService.deleteLessonNote(noteId);
      setNotes(prev => prev.filter(n => n.noteId !== noteId));
      onShowNotification('Note successfully removed.', 'success');
    } catch (err) {
      onShowNotification('Failed to delete note.', 'error');
    }
  };

  // Add Bookmarks linked to timestamps
  const handleAddBookmark = async () => {
    if (!activeLesson) return;
    const marker = Math.round(currentTime);
    const customLabel = `Bookmark pinned @ ${formatDurationSeconds(marker)}`;

    const newBookmark: Omit<LessonBookmark, 'bookmarkId'> = {
      userId,
      courseId: course.courseId,
      lessonId: activeLesson.lessonId,
      timestamp: marker,
      label: customLabel,
      createdAt: new Date().toISOString()
    };

    try {
      const saved = await learningService.saveLessonBookmark(newBookmark);
      setBookmarks(prev => [...prev, saved].sort((a, b) => a.timestamp - b.timestamp));
      onShowNotification(`Pinned bookmark at ${formatDurationSeconds(marker)}!`, 'success');
    } catch (err) {
      onShowNotification('Failed to pin bookmark.', 'error');
    }
  };

  const handleDeleteBookmark = async (bookmarkId: string) => {
    try {
      await learningService.deleteLessonBookmark(bookmarkId);
      setBookmarks(prev => prev.filter(b => b.bookmarkId !== bookmarkId));
      onShowNotification('Bookmark removed.', 'success');
    } catch (err) {
      onShowNotification('Failed to remove bookmark.', 'error');
    }
  };

  const handleNextLesson = () => {
    const allLessons = curriculum.flatMap(ch => ch.lessons);
    const currIndex = allLessons.findIndex(l => l.lessonId === activeLesson?.lessonId);
    if (currIndex !== -1 && currIndex < allLessons.length - 1) {
      const nextL = allLessons[currIndex + 1];
      if (isLessonLocked(nextL)) {
        onShowNotification('Next class is locked. Mark this class completed to proceed!', 'error');
      } else {
        setActiveLesson(nextL);
      }
    } else {
      onShowNotification('Congratulations! You reached the end of the course curriculum!', 'success');
    }
  };

  const handlePrevLesson = () => {
    const allLessons = curriculum.flatMap(ch => ch.lessons);
    const currIndex = allLessons.findIndex(l => l.lessonId === activeLesson?.lessonId);
    if (currIndex > 0) {
      setActiveLesson(allLessons[currIndex - 1]);
    }
  };

  const handleContinueLearning = () => {
    const allLessons = curriculum.flatMap(ch => ch.lessons);
    const unfinished = allLessons.find(l => {
      const prog = lessonProgress.find(lp => lp.lessonId === l.lessonId);
      return !prog || !prog.completed;
    });

    const targetLesson = unfinished || allLessons[0];
    if (targetLesson) {
      setActiveLesson(targetLesson);
      const chContaining = curriculum.find(ch => ch.lessons.some(l => l.lessonId === targetLesson.lessonId));
      if (chContaining) {
        setOpenChapters(prev => ({ ...prev, [chContaining.chapterId]: true }));
      }
      onShowNotification(`Resuming from class: "${targetLesson.title.substring(0, 22)}..."`, 'success');
    }
  };

  // Layout variables
  const progressVal = overallProgress?.progressPercent ?? 0;
  const completedLessonsCount = overallProgress?.completedLessons ?? 0;
  const totalLessons = curriculum.flatMap(ch => ch.lessons).length;
  const remainingLessons = Math.max(0, totalLessons - completedLessonsCount);

  // Pull to refresh simulation trigger
  const handlePullToRefresh = () => {
    loadLearningData(true);
    onShowNotification('Synced learning data with Cloud Firestore!', 'success');
  };

  // ================= RENDER ACCESS CONTROL: COURSE LOCKED =================
  if (!isEnrolled) {
    return (
      <div className="flex-1 flex flex-col justify-between py-1 px-1 text-slate-100 max-w-lg mx-auto w-full" id="nexus-locked-screen">
        <header className="flex items-center space-x-3 py-3 px-1 border-b border-white/5 bg-[#0a0f1d]/90 sticky top-0 z-40 backdrop-blur-md">
          <button 
            onClick={onBack}
            className="p-2 rounded-xl bg-white/[0.02] border border-white/10 hover:bg-white/[0.06] text-slate-300 hover:text-white transition-all cursor-pointer flex items-center justify-center"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <p className="text-[9px] font-mono text-amber-500 uppercase tracking-wider">RESTRICTED ACCESS</p>
            <h1 className="text-xs font-sans font-bold text-white tracking-tight truncate max-w-[220px]">{course.title}</h1>
          </div>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 text-center space-y-6">
          <div className="relative">
            <motion.div 
              animate={{ scale: [1, 1.12, 1], opacity: [0.15, 0.25, 0.15] }}
              transition={{ repeat: Infinity, duration: 2.5 }}
              className="absolute -inset-4 bg-red-500/15 rounded-full blur-xl"
            />
            <div className="w-20 h-20 bg-red-950/40 border border-red-500/30 rounded-3xl flex items-center justify-center shadow-[0_0_24px_rgba(239,68,68,0.2)]">
              <Lock size={36} className="text-red-500 shimmer-effect" />
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-mono font-bold tracking-widest text-red-400 uppercase bg-red-950/20 border border-red-500/20 px-3 py-1 rounded-full">
              Course Locked
            </span>
            <h2 className="text-base font-sans font-bold text-white tracking-tight">
              Premium Subscription Required
            </h2>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              You are currently unauthorized to open the academic syllabus for this program. Access is enabled automatically upon successful payment processing.
            </p>
          </div>

          <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4 text-left w-full space-y-2 text-xs text-slate-300 font-sans">
            <div className="flex items-center space-x-2 text-red-400">
              <AlertTriangle size={14} />
              <span className="font-semibold text-[11px] font-mono">CREDENTIAL REJECTION DETAILS:</span>
            </div>
            <ul className="space-y-1.5 pl-1 text-[11px] text-slate-400 font-mono list-disc list-inside">
              <li>USER_ID: {userId}</li>
              <li>ENROLLMENT_STATUS: NULL</li>
              <li>LEDGER_PURCHASE: UNVERIFIED</li>
              <li>GATEWAY_CONFIRMATION: DENIED</li>
            </ul>
          </div>
        </div>

        <footer className="mt-4 pt-3 border-t border-white/5 space-y-2 px-1 bg-[#0a0f1d]">
          <button
            onClick={() => onTriggerPurchase(course)}
            className="w-full py-4 bg-[#39FF14] hover:bg-[#32e011] text-black font-bold uppercase tracking-wider text-xs rounded-xl transition-all flex items-center justify-center space-x-2 shadow-lg shadow-[#39FF14]/15 cursor-pointer"
          >
            <Unlock size={14} />
            <span>Unlock This Course (Enroll Now)</span>
          </button>
          <button
            onClick={onBack}
            className="w-full py-3 bg-white/5 hover:bg-white/10 text-slate-300 font-bold uppercase tracking-wider text-[10px] border border-white/10 rounded-xl transition-all cursor-pointer"
          >
            Return to Directory
          </button>
          <p className="text-[8px] font-mono text-center text-slate-500 tracking-wider">
            🔒 NEXUS AUTH SECURE GATE SYSTEM 3.0
          </p>
        </footer>
      </div>
    );
  }

  // ================= SKELETON LOADING VIEW =================
  if (loading) {
    return (
      <div className="flex-1 flex flex-col text-slate-100 max-w-lg mx-auto w-full py-1 px-1" id="nexus-skeleton-view">
        <header className="flex items-center space-x-3 py-3 px-1 border-b border-white/5 mb-4">
          <div className="w-8 h-8 rounded-xl bg-white/5 shimmer-effect" />
          <div className="space-y-2 flex-1">
            <div className="h-2 w-16 bg-white/5 rounded shimmer-effect" />
            <div className="h-4 w-40 bg-white/5 rounded shimmer-effect" />
          </div>
        </header>
        <div className="w-full h-44 rounded-3xl bg-white/5 shimmer-effect mb-6" />
        <div className="space-y-4">
          <div className="h-4 w-28 bg-white/5 rounded shimmer-effect" />
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 rounded-2xl bg-white/5 shimmer-effect" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-between py-1 px-1 text-slate-100 max-w-lg mx-auto w-full" id="nexus-learning-dashboard">
      
      {/* Headersticky */}
      <header className="flex items-center justify-between py-3 px-1 border-b border-white/5 bg-[#0a0f1d]/90 sticky top-0 z-40 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <button 
            onClick={onBack}
            className="p-2 rounded-xl bg-white/[0.02] border border-white/10 hover:bg-white/[0.06] text-slate-300 hover:text-white transition-all cursor-pointer flex items-center justify-center"
            id="btn-back-to-courses"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <span className="text-[8px] font-mono text-[#39FF14] uppercase tracking-widest flex items-center">
              <ShieldCheck size={10} className="mr-0.5 text-[#39FF14]" />
              <span>ACADEMIC CLASSROOM ACTIVE</span>
            </span>
            <h1 className="text-xs font-sans font-semibold text-white tracking-tight truncate max-w-[200px]">{course.title}</h1>
          </div>
        </div>

        <button
          onClick={handlePullToRefresh}
          className={`p-2 rounded-xl border border-white/10 hover:border-white/20 bg-white/[0.02] text-slate-400 hover:text-white transition-all cursor-pointer ${refreshing ? 'animate-spin text-[#39FF14]' : ''}`}
          title="Sync study room"
          id="btn-sync-classroom"
        >
          <RefreshCw size={13} />
        </button>
      </header>

      {/* Dynamic announcements ribbon */}
      <AnnouncementBanner />

      {/* Main Learning Space Scroll Container */}
      <main className="flex-1 py-4 space-y-4 overflow-y-auto px-1">
        
        {/* ================= ADMIN APPROVAL REQUIRED LOCK SCREEN ================= */}
        {(hasPendingApproval || (!isEnrolled && !hasApprovedPurchase && course.price > 0)) ? (
          <div className="bg-slate-950 border border-amber-500/40 rounded-3xl p-6 text-center space-y-4 shadow-2xl relative overflow-hidden">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
              <Lock size={30} />
            </div>

            {hasPendingApproval ? (
              <div className="space-y-2">
                <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                  AWAITING ADMIN APPROVAL
                </span>
                <h3 className="text-base font-bold text-white">Enrollment Under Review</h3>
                <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                  Your payment submission is pending Admin verification. Access to video lessons, quizzes, and resources will be automatically unlocked once the Admin approves your request.
                </p>
                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl text-[10px] font-mono text-slate-400 max-w-sm mx-auto mt-2">
                  <span>Contact support or refresh this page after approval to begin learning.</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-[#39FF14] bg-[#39FF14]/10 px-3 py-1 rounded-full border border-[#39FF14]/20">
                  PREMIUM COURSE ACCESS
                </span>
                <h3 className="text-base font-bold text-white">Enrollment Required</h3>
                <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                  You need to enroll in this program to access full video lessons, downloadable resources, and quizzes.
                </p>
                <button
                  onClick={() => onTriggerPurchase(course)}
                  className="mt-3 px-6 py-3 bg-[#39FF14] hover:bg-[#32e011] text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg cursor-pointer"
                >
                  Enroll in Course
                </button>
              </div>
            )}
          </div>
        ) : (
          /* ================= HIGH FIDELITY VIDEO PLAYER ================= */
          activeLesson && activeVideo ? (
          <div 
            ref={playerContainerRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => isPlaying && setShowControls(false)}
            className="relative rounded-3xl overflow-hidden border border-white/10 bg-black shadow-2xl group transition-all"
            id="video-player-viewport"
          >
            {/* Native Video Element */}
            <video
              ref={videoRef}
              src={activeVideo.videoUrl || undefined}
              poster={activeVideo.thumbnailUrl}
              onTimeUpdate={() => {
                if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
              }}
              onLoadedMetadata={() => {
                if (videoRef.current) setVideoDuration(videoRef.current.duration || activeVideo.duration);
              }}
              onClick={handlePlayPause}
              className="w-full aspect-video object-contain cursor-pointer"
              playsInline
            />

            {/* Glowing Buffer / Loading active details overlay */}
            {loadingActiveDetails && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-3 z-30">
                <div className="w-10 h-10 border-4 border-[#39FF14]/20 border-t-[#39FF14] rounded-full animate-spin" />
                <span className="text-[9px] font-mono text-[#39FF14] tracking-widest uppercase shimmer-effect">STREAMING SIGNAL...</span>
              </div>
            )}

            {/* Resume Playback Prompt Banner */}
            {pendingResumeSeconds && !isPlaying && (
              <div className="absolute top-3 left-3 right-3 bg-[#0a0f1d]/95 border border-[#39FF14]/30 rounded-2xl p-3 flex items-center justify-between z-30 backdrop-blur-md shadow-xl animate-bounce">
                <div className="flex items-center space-x-2">
                  <Clock size={14} className="text-[#39FF14]" />
                  <div className="text-left">
                    <p className="text-[9px] font-mono text-slate-400 uppercase">Auto Resume Available</p>
                    <p className="text-[10px] font-sans font-bold text-white">Continue from {formatDurationSeconds(pendingResumeSeconds)}?</p>
                  </div>
                </div>
                <div className="flex space-x-1.5">
                  <button 
                    onClick={handleResumePlayback}
                    className="px-2.5 py-1 bg-[#39FF14] text-black font-mono font-extrabold text-[9px] uppercase rounded-lg hover:bg-[#32e011] transition-colors cursor-pointer"
                  >
                    Resume
                  </button>
                  <button 
                    onClick={() => setPendingResumeSeconds(null)}
                    className="px-2.5 py-1 bg-white/5 border border-white/10 text-slate-300 font-mono text-[9px] uppercase rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    Ignore
                  </button>
                </div>
              </div>
            )}

            {/* Play overlay button on center */}
            {!isPlaying && !loadingActiveDetails && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none z-10">
                <button 
                  onClick={handlePlayPause}
                  className="w-14 h-14 rounded-full bg-white/10 border border-white/20 hover:bg-[#39FF14] hover:text-black hover:border-transparent text-white transition-all flex items-center justify-center shadow-2xl scale-100 hover:scale-110 pointer-events-auto cursor-pointer"
                >
                  <Play size={20} fill="currentColor" className="ml-0.5" />
                </button>
              </div>
            )}

            {/* Custom Interactive Controls (Autohide-supported) */}
            <AnimatePresence>
              {(showControls || !isPlaying) && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 15 }}
                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950/95 via-slate-950/70 to-transparent p-4 pt-10 flex flex-col space-y-3 z-20 pointer-events-auto"
                >
                  {/* Timeline Scrubber */}
                  <div className="space-y-1">
                    <div 
                      onClick={handleProgressClick}
                      className="w-full h-1.5 bg-white/10 rounded-full cursor-pointer relative overflow-hidden group/scrub"
                    >
                      {/* Active watched timeline fill */}
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-[#39FF14] rounded-full relative"
                        style={{ width: `${(currentTime / (videoDuration || 1)) * 100}%` }}
                      >
                        <span className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white opacity-0 group-hover/scrub:opacity-100 transition-opacity shadow" />
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[9px] font-mono text-slate-300">
                      <span>{formatDurationSeconds(currentTime)} / {formatDurationSeconds(videoDuration)}</span>
                      <span className="text-[#39FF14] font-semibold">{Math.round((currentTime / (videoDuration || 1)) * 100)}% Watched</span>
                    </div>
                  </div>

                  {/* Primary control row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {/* Prev lesson */}
                      <button 
                        onClick={handlePrevLesson}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                        title="Previous lesson"
                      >
                        <ChevronLeft size={16} />
                      </button>

                      {/* Play / Pause toggle */}
                      <button 
                        onClick={handlePlayPause}
                        className="p-2 bg-white text-black hover:bg-[#39FF14] transition-colors rounded-full flex items-center justify-center cursor-pointer"
                        title={isPlaying ? 'Pause class' : 'Resume class'}
                      >
                        {isPlaying ? <Pause size={13} fill="black" /> : <Play size={13} fill="black" className="ml-0.5" />}
                      </button>

                      {/* Next lesson */}
                      <button 
                        onClick={handleNextLesson}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                        title="Next lesson"
                      >
                        <ChevronRight size={16} />
                      </button>

                      {/* Seek controls */}
                      <button 
                        onClick={() => handleSeek(-10)}
                        className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                        title="Backward 10s"
                      >
                        <RotateCcw size={14} />
                      </button>
                      <button 
                        onClick={() => handleSeek(10)}
                        className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                        title="Forward 10s"
                      >
                        <RotateCw size={14} />
                      </button>

                      {/* Volume controls */}
                      <div className="flex items-center space-x-1.5 group/vol">
                        <button 
                          onClick={handleToggleMute}
                          className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                        >
                          {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                        </button>
                        <input 
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={isMuted ? 0 : volume}
                          onChange={handleVolumeChange}
                          className="w-12 h-1 accent-[#39FF14] bg-white/10 rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2.5 text-[9px] font-mono">
                      {/* Playback speed selector */}
                      <div className="flex items-center space-x-1 bg-white/5 border border-white/5 rounded-lg px-1.5 py-0.5">
                        <span className="text-slate-500 uppercase tracking-tight text-[8px]">Speed</span>
                        <select 
                          value={playbackSpeed}
                          onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                          className="bg-transparent text-white font-semibold font-mono border-none outline-none focus:ring-0 cursor-pointer text-[9px]"
                        >
                          <option value="0.5" className="bg-slate-950 text-white">0.5x</option>
                          <option value="1.0" className="bg-slate-950 text-white">1.0x</option>
                          <option value="1.25" className="bg-slate-950 text-white">1.25x</option>
                          <option value="1.5" className="bg-slate-950 text-white">1.5x</option>
                          <option value="2.0" className="bg-slate-950 text-white">2.0x</option>
                        </select>
                      </div>

                      {/* Quality selector */}
                      <div className="flex items-center space-x-1 bg-white/5 border border-white/5 rounded-lg px-1.5 py-0.5">
                        <span className="text-slate-500 uppercase tracking-tight text-[8px]">Quality</span>
                        <select 
                          value={videoQuality}
                          onChange={(e) => {
                            setVideoQuality(e.target.value as any);
                            onShowNotification(`Video stream calibrated to ${e.target.value}`, 'success');
                          }}
                          className="bg-transparent text-white font-semibold font-mono border-none outline-none focus:ring-0 cursor-pointer text-[9px]"
                        >
                          <option value="Auto" className="bg-slate-950 text-white">Auto</option>
                          <option value="1080p" className="bg-slate-950 text-white">1080p FHD</option>
                          <option value="720p" className="bg-slate-950 text-white">720p HD</option>
                        </select>
                      </div>

                      {/* PiP Mode */}
                      <button 
                        onClick={handleTogglePiP}
                        className="p-1 text-slate-400 hover:text-white transition-all cursor-pointer"
                        title="Picture in Picture"
                      >
                        <Tv size={13} />
                      </button>

                      {/* Fullscreen Mode */}
                      <button 
                        onClick={handleToggleFullscreen}
                        className="p-1 text-slate-400 hover:text-white transition-all cursor-pointer"
                        title="Fullscreen"
                      >
                        {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          /* Static Spot Light Banner if no video is active */
          <div className="relative h-44 rounded-3xl overflow-hidden border border-white/10 group shadow-2xl">
            <img 
              src={course.banner || undefined} 
              alt={course.title} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
            
            <div className="absolute bottom-4 left-4 right-4 flex flex-col space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-[8px] font-mono font-extrabold text-black bg-[#39FF14] px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {course.category}
                </span>
                <span className="text-[9px] font-mono text-slate-300">
                  ⭐ {course.rating} ({course.reviewCount ?? 120} ratings)
                </span>
              </div>
              <h2 className="text-sm font-sans font-extrabold text-white leading-tight tracking-tight line-clamp-1">
                {course.title}
              </h2>
              <p className="text-[10px] text-slate-400 font-sans">
                Mentor: <strong className="text-white">{course.instructor}</strong>
              </p>
            </div>
          </div>
        )
        )}

        {/* ================= COURSE ACADEMIC PROGRESS REPORT ================= */}
        <div className="glass-panel-light rounded-3xl p-5 space-y-4 shadow-xl relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-[#39FF14]/5 to-transparent rounded-full blur-xl pointer-events-none" />
          
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[9px] font-mono text-slate-400 tracking-wider uppercase block">STUDY PROGRESS REPORT</span>
              <h3 className="text-base font-mono font-extrabold text-[#39FF14] mt-0.5">
                {progressVal}% COMPLETE
              </h3>
            </div>
            <span className="text-[10px] font-mono bg-[#39FF14]/10 border border-[#39FF14]/20 text-[#39FF14] px-2.5 py-1 rounded-xl">
              {completedLessonsCount} / {totalLessons} Classes Completed
            </span>
          </div>

          <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5 relative">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progressVal}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-emerald-500 to-[#39FF14] rounded-full shadow-[0_0_8px_rgba(57,255,20,0.5)]"
            />
          </div>

          <div className="flex justify-between items-center pt-1 text-[9px] font-mono text-slate-400">
            <span>START</span>
            <span className="text-[#39FF14] flex items-center">
              <Flame size={10} className="mr-0.5 shimmer-effect" />
              <span>{remainingLessons} Lessons Left</span>
            </span>
            <span>GRADUATION 🎓</span>
          </div>

          {/* Jump to unfinished lesson */}
          <button
            onClick={handleContinueLearning}
            className="w-full py-3 bg-[#39FF14] hover:bg-[#32e011] text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-[#39FF14]/10"
            id="btn-continue-learning"
          >
            <Play size={12} fill="black" />
            <span>Continue Learning</span>
          </button>
        </div>

        {/* ================= HIGH FIDELITY WIDGET TABS CONTROL ================= */}
        <div className="glass-panel rounded-3xl p-3 flex flex-col space-y-4" id="nexus-learning-workspace">
          
          {/* Scrollable pill tabs bar */}
          <div className="flex border-b border-white/5 pb-2 overflow-x-auto space-x-1.5 scrollbar-none">
            {[
              { id: 'syllabus', label: 'Curriculum' },
              { id: 'notes', label: `Personal Notes (${notes.length})` },
              { id: 'bookmarks', label: `Bookmarks (${bookmarks.length})` },
              { id: 'resources', label: `Resources (${activeResources.length})` },
              { id: 'quizzes', label: 'Quizzes & Assessments 🎯' }
            ].map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3.5 py-1.5 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider whitespace-nowrap shrink-0 transition-all border cursor-pointer ${
                    isActive 
                      ? 'bg-[#39FF14]/10 border-[#39FF14]/35 text-[#39FF14] shadow-[0_0_12px_rgba(57,255,20,0.1)]' 
                      : 'bg-white/[0.01] border-transparent text-slate-400 hover:text-white'
                  }`}
                  id={`tab-trigger-${tab.id}`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Active Tab Panel rendered with clean animations */}
          <div className="min-h-[220px]">
            <AnimatePresence mode="wait">
              {activeTab === 'syllabus' && (
                <motion.div
                  key="syllabus-panel"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-2.5"
                >
                  <div className="flex justify-between items-center pl-1">
                    <h3 className="text-[10px] font-mono font-bold text-slate-400 tracking-wider uppercase flex items-center">
                      <BookOpen size={11} className="mr-1.5 text-slate-500" />
                      <span>Chapters & Classes:</span>
                    </h3>
                  </div>

                  <div className="space-y-2.5">
                    {curriculum.map((chapter) => {
                      const isChapterOpen = !!openChapters[chapter.chapterId];
                      return (
                        <div 
                          key={chapter.chapterId} 
                          className="bg-slate-950/50 border border-white/5 rounded-2xl overflow-hidden transition-all duration-300"
                        >
                          <button
                            onClick={() => toggleChapter(chapter.chapterId)}
                            className="w-full p-3.5 flex items-center justify-between text-left hover:bg-white/[0.01] transition-colors cursor-pointer"
                          >
                            <div className="flex-1 min-w-0 pr-3">
                              <h4 className="text-[11px] font-sans font-bold text-white tracking-tight leading-snug">
                                {chapter.title}
                              </h4>
                              <div className="flex items-center space-x-3 mt-1 text-[9px] font-mono text-slate-500">
                                <span className="flex items-center">
                                  <BookOpen size={9} className="mr-0.5" />
                                  {chapter.lessons.length} Classes
                                </span>
                                <span className="flex items-center">
                                  <Clock size={9} className="mr-0.5" />
                                  {chapter.totalDuration}
                                </span>
                              </div>
                            </div>
                            <div>
                              {isChapterOpen ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                            </div>
                          </button>

                          {/* Lesson Sublist with Locking support */}
                          <AnimatePresence initial={false}>
                            {isChapterOpen && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="border-t border-white/5 bg-black/10 overflow-hidden"
                              >
                                <div className="p-2 space-y-1">
                                  {chapter.lessons.map((lesson) => {
                                    const isSelected = activeLesson?.lessonId === lesson.lessonId;
                                    const isCompleted = isLessonCompleted(lesson.lessonId);
                                    const isLocked = isLessonLocked(lesson);
                                    
                                    return (
                                      <div
                                        key={lesson.lessonId}
                                        onClick={() => handleSelectLesson(lesson)}
                                        className={`p-2.5 rounded-xl flex items-center justify-between transition-all cursor-pointer group ${
                                          isSelected 
                                            ? 'bg-[#39FF14]/5 border border-[#39FF14]/20' 
                                            : 'hover:bg-white/[0.01] border border-transparent'
                                        } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                      >
                                        <div className="flex items-start space-x-2.5 flex-1 min-w-0">
                                          {/* Lock/Play Toggle Button */}
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (!isLocked) {
                                                handleToggleLessonCompleted(lesson);
                                              } else {
                                                onShowNotification('Complete previous sequential lessons to unlock.', 'error');
                                              }
                                            }}
                                            className="p-1 rounded-lg bg-white/5 border border-white/10 hover:border-[#39FF14]/30 hover:bg-[#39FF14]/10 transition-colors shrink-0 mt-0.5"
                                            title={isCompleted ? 'Completed' : 'Lock/Play'}
                                          >
                                            {isCompleted ? (
                                              <CheckCircle2 size={12} className="text-emerald-400" />
                                            ) : isLocked ? (
                                              <Lock size={12} className="text-slate-500" />
                                            ) : (
                                              <Play size={10} className="text-slate-400 group-hover:text-white" />
                                            )}
                                          </button>

                                          <div className="flex-1 min-w-0">
                                            <h5 className={`text-[10.5px] font-sans leading-snug transition-colors ${
                                              isSelected ? 'text-[#39FF14] font-semibold' : 'text-slate-300 group-hover:text-white'
                                            }`}>
                                              {lesson.title}
                                            </h5>
                                            <span className="text-[8.5px] font-mono text-slate-500 block mt-0.5">
                                              Duration: {lesson.duration} Mins • Class {lesson.sequenceOrder}
                                            </span>
                                          </div>
                                        </div>

                                        <div className="flex items-center space-x-2 shrink-0 ml-2">
                                          <span className="text-[8px] font-mono text-slate-500 uppercase">
                                            {isCompleted ? 'COMPLETED' : isLocked ? 'LOCKED' : 'UNLOCKED'}
                                          </span>
                                          {isLocked ? (
                                            <Lock size={10} className="text-red-400/50" />
                                          ) : (
                                            <Unlock size={10} className="text-[#39FF14]/70" />
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {activeTab === 'notes' && (
                <motion.div
                  key="notes-panel"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="flex justify-between items-center pl-1">
                    <h3 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                      Study Notes ({notes.length})
                    </h3>
                    <span className="text-[8.5px] font-mono text-slate-500">Captured timestamps link directly to the stream position</span>
                  </div>

                  {/* Add note Form */}
                  <form onSubmit={handleAddNote} className="space-y-2 bg-white/[0.02] border border-white/5 rounded-2xl p-3">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
                      <span className="text-[9px] font-mono text-[#39FF14] font-bold flex items-center">
                        <Clock size={11} className="mr-1" /> 
                        LINKED TIMESTOP: {formatDurationSeconds(currentTime)}
                      </span>
                      <button 
                        type="submit"
                        className="px-3 py-1 bg-[#39FF14] hover:bg-[#32e011] text-black font-mono font-extrabold text-[9px] uppercase rounded-lg transition-colors cursor-pointer flex items-center"
                      >
                        <Plus size={10} className="mr-1" />
                        <span>Save Note</span>
                      </button>
                    </div>
                    
                    <input 
                      type="text" 
                      placeholder="Note Title (e.g. Key Concept Overview)" 
                      value={newNoteTitle}
                      onChange={(e) => setNewNoteTitle(e.target.value)}
                      className="w-full glass-panel-light border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#39FF14]/50"
                    />

                    <textarea
                      placeholder="Type details or markdown content here..."
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                      rows={3}
                      className="w-full glass-panel-light border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#39FF14]/50 resize-none"
                    />
                  </form>

                  {/* Notes List */}
                  <div className="space-y-2">
                    {notes.length === 0 ? (
                      <div className="text-center py-6 border border-dashed border-white/5 rounded-2xl text-slate-500 text-[10px] font-mono">
                        No custom notes captured yet for this class. Type above to log academic progress.
                      </div>
                    ) : (
                      notes.map(note => (
                        <div 
                          key={note.noteId}
                          onClick={() => {
                            if (videoRef.current) {
                              videoRef.current.currentTime = note.timestamp;
                              setCurrentTime(note.timestamp);
                              if (!isPlaying) handlePlayPause();
                              onShowNotification(`Skipped to concept: "${note.noteTitle}"`, 'success');
                            }
                          }}
                          className="bg-white/[0.01] border border-white/5 hover:border-white/10 rounded-2xl p-3.5 flex items-start justify-between cursor-pointer hover:bg-white/[0.02] transition-all group"
                        >
                          <div className="space-y-1.5 flex-1 pr-3">
                            <div className="flex items-center space-x-2">
                              <span className="text-[9px] font-mono bg-[#39FF14]/10 border border-[#39FF14]/20 text-[#39FF14] px-1.5 py-0.5 rounded-md">
                                {formatDurationSeconds(note.timestamp)}
                              </span>
                              <h5 className="text-[11px] font-sans font-bold text-white leading-tight group-hover:text-[#39FF14] transition-colors">
                                {note.noteTitle}
                              </h5>
                            </div>
                            <p className="text-[10px] text-slate-400 font-sans whitespace-pre-wrap leading-relaxed">
                              {note.noteContent}
                            </p>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteNote(note.noteId);
                            }}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                            title="Delete note"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'bookmarks' && (
                <motion.div
                  key="bookmarks-panel"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="flex justify-between items-center pl-1">
                    <h3 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                      Study Bookmarks ({bookmarks.length})
                    </h3>
                    <button
                      onClick={handleAddBookmark}
                      className="px-3 py-1.5 bg-white/5 hover:bg-[#39FF14]/10 hover:text-[#39FF14] text-slate-300 font-mono font-bold text-[9px] uppercase border border-white/10 hover:border-[#39FF14]/30 rounded-xl transition-all flex items-center space-x-1 cursor-pointer"
                    >
                      <Bookmark size={11} />
                      <span>Pin Current Marker @ {formatDurationSeconds(currentTime)}</span>
                    </button>
                  </div>

                  {/* Bookmarks Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {bookmarks.length === 0 ? (
                      <div className="col-span-full text-center py-6 border border-dashed border-white/5 rounded-2xl text-slate-500 text-[10px] font-mono">
                        No bookmarks set yet. Press pin button to capture reference markers.
                      </div>
                    ) : (
                      bookmarks.map(bm => (
                        <div 
                          key={bm.bookmarkId}
                          onClick={() => {
                            if (videoRef.current) {
                              videoRef.current.currentTime = bm.timestamp;
                              setCurrentTime(bm.timestamp);
                              if (!isPlaying) handlePlayPause();
                            }
                          }}
                          className="bg-[#0a0f1d]/60 border border-white/5 hover:border-[#39FF14]/20 rounded-2xl p-3 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-all group"
                        >
                          <div className="flex items-center space-x-2">
                            <Bookmark size={12} className="text-[#39FF14]" />
                            <div>
                              <p className="text-[10px] font-mono text-white font-bold leading-none">
                                {formatDurationSeconds(bm.timestamp)}
                              </p>
                              <span className="text-[8.5px] font-sans text-slate-400 block mt-1">Timeline Ref</span>
                            </div>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteBookmark(bm.bookmarkId);
                            }}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                            title="Remove pin"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'resources' && (
                <motion.div
                  key="resources-panel"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-3"
                >
                  <ResourcesDashboard 
                    course={course}
                    curriculum={curriculum}
                    userId={userId}
                    isEnrolled={isEnrolled}
                    onTriggerPurchase={onTriggerPurchase}
                    onBack={onBack}
                    onShowNotification={onShowNotification}
                  />
                </motion.div>
              )}

              {activeTab === 'quizzes' && (
                <motion.div
                  key="quizzes-panel"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-3"
                >
                  <QuizDashboardView 
                    courseId={course.courseId}
                    chapters={curriculum}
                    onShowNotification={onShowNotification}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ================= CERTIFICATE & GRADUATION STATUS CARD ================= */}
        <div className="bg-slate-950 border border-white/10 rounded-3xl p-5 relative overflow-hidden shadow-xl" id="graduation-box">
          <div className="absolute -left-6 -bottom-6 w-24 h-24 bg-gradient-to-tr from-[#39FF14]/5 to-transparent rounded-full blur-xl pointer-events-none" />
          
          <div className="flex items-start space-x-4">
            <div className={`p-3 rounded-2xl border flex items-center justify-center shrink-0 ${
              isEligibleForCertificate
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 animate-bounce'
                : 'bg-white/5 border-white/10 text-slate-400'
            }`}>
              <Award size={24} />
            </div>

            <div className="flex-1 space-y-1">
              <span className="text-[8px] font-mono text-slate-500 tracking-wider uppercase block">NEXUS ACADEMIC CREDENTIALS</span>
              <h4 className="text-xs font-sans font-bold text-white flex items-center space-x-1.5">
                <span>Completion Certificate</span>
                <span className={`text-[8.5px] font-mono px-2 py-0.5 rounded-full uppercase ${
                  isEligibleForCertificate
                    ? 'bg-[#39FF14] text-black font-extrabold shadow-[0_0_8px_rgba(57,255,20,0.5)]'
                    : 'bg-white/5 text-slate-500 border border-white/5'
                }`}>
                  {isEligibleForCertificate ? 'UNLOCKED ✓' : 'LOCKED 🔒'}
                </span>
              </h4>

              {isEligibleForCertificate ? (
                <div className="space-y-2 pt-1">
                  <p className="text-[10px] text-emerald-400 font-sans leading-relaxed">
                    🏆 <strong>Congratulations!</strong> You have successfully finished all lessons and passed all required assessments. Your secure digital graduation certificate is active.
                  </p>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => {
                        if (generatedCertificate) {
                          setShowCertPreview(true);
                        } else {
                          onShowNotification('Securing encryption keys on blockchain register...', 'success');
                          evaluateGraduationCert(false);
                        }
                      }}
                      className="px-3.5 py-1.5 bg-[#39FF14] hover:bg-[#32e011] text-black font-mono font-extrabold text-[9px] uppercase rounded-lg transition-all cursor-pointer flex items-center shadow"
                    >
                      <Award size={10} className="mr-1" />
                      <span>{generatedCertificate ? 'View Certificate' : 'Generate Certificate'}</span>
                    </button>
                    
                    <button 
                      onClick={() => setShowCelebration(true)}
                      className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 text-white font-mono font-bold text-[9px] uppercase rounded-lg transition-all border border-white/10 cursor-pointer"
                    >
                      <span>Show Celebration</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <p className="text-[10px] text-slate-400 font-sans leading-relaxed">
                    Unlock your official secure certificate by fulfilling all requirements:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
                    <div className="flex items-center space-x-2 text-[9.5px] font-mono">
                      <span className={progressVal === 100 ? "text-[#39FF14]" : "text-slate-500"}>
                        {progressVal === 100 ? "✓" : "○"}
                      </span>
                      <span className={progressVal === 100 ? "text-white" : "text-slate-400"}>
                        100% Lessons ({progressVal}%)
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-[9.5px] font-mono">
                      <span className="text-slate-500">○</span>
                      <span className="text-slate-400">
                        Pass All Chapter Quizzes
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ================= CELEBRATION & PREVIEW FLOATING OVERLAYS ================= */}
        <AnimatePresence>
          {showCelebration && (
            <CertificateCelebrationView
              courseName={course.title}
              certificate={generatedCertificate}
              onClose={() => setShowCelebration(false)}
              onBrowseCourses={onBack}
              onDownloadCertificate={() => {
                setShowCelebration(false);
                setShowCertPreview(true);
              }}
            />
          )}

          {showCertPreview && generatedCertificate && (
            <PremiumCertificatePreview
              certificate={generatedCertificate}
              onClose={() => setShowCertPreview(false)}
              onShowNotification={onShowNotification}
            />
          )}
        </AnimatePresence>

      </main>

      <footer className="mt-4 pt-3 border-t border-white/5 text-center font-mono text-[9px] text-slate-500 tracking-wider uppercase">
        NEXUS SECURE LEARNING PORTAL SYSTEM
      </footer>
    </div>
  );
}
