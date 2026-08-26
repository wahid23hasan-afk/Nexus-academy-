import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Clock, 
  BookOpen, 
  CheckCircle2, 
  Lock, 
  Play, 
  Star, 
  Users, 
  Globe, 
  ShieldCheck, 
  Share2, 
  Heart, 
  MessageSquare, 
  ChevronDown, 
  ChevronUp, 
  Award, 
  Layers, 
  Sparkles, 
  Check, 
  X,
  GraduationCap,
  RefreshCw,
  Zap,
  ExternalLink
} from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { Course, CourseSection, CourseLesson, CurriculumChapter, Instructor, CourseReview } from '../types/course';
import { courseService, OperationType } from '../services/courseService';
import { learningService } from '../services/learningService';
import { SmartVideoPlayer } from './SmartVideoPlayer';
import { AnnouncementBanner } from './AnnouncementBanner';
import { EliteLoading } from './EliteLoading';

export interface CourseDetailsProps {
  course: Course;
  userProfile?: { fullName: string; username: string; email?: string; photoURL?: string; role?: string; isAdmin?: boolean } | null;
  onBack: () => void;
  onShowNotification: (message: string, type: 'success' | 'error') => void;
  purchasedCourseIds?: string[];
  wishlistedIds?: string[];
  onToggleWishlist?: (courseId: string) => void;
  onStartLearning?: (course: Course) => void;
  onTriggerPurchase?: (course: Course) => void;
}

const DEFAULT_PREVIEW_VIDEO = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

export function CourseDetails({
  course: initialCourse,
  userProfile,
  onBack,
  onShowNotification,
  purchasedCourseIds = [],
  wishlistedIds = [],
  onToggleWishlist,
  onStartLearning,
  onTriggerPurchase
}: CourseDetailsProps) {
  const [course, setCourse] = useState<Course>(initialCourse);
  const [sections, setSections] = useState<CourseSection[]>([]);
  const [openSectionIds, setOpenSectionIds] = useState<Record<string, boolean>>({});
  const [instructor, setInstructor] = useState<Instructor | null>(null);
  const [reviews, setReviews] = useState<CourseReview[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Free Preview Modal State
  const [previewLesson, setPreviewLesson] = useState<CourseLesson | null>(null);
  const [activePreviewUrl, setActivePreviewUrl] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    if (!previewLesson) {
      setActivePreviewUrl('');
      document.body.style.overflow = '';
      return;
    }

    document.body.style.overflow = 'hidden';

    const fetchPreviewVideo = async () => {
      try {
        const vid = await learningService.getLessonVideo(
          course.courseId,
          previewLesson.lessonId,
          previewLesson.sequenceOrder || 1,
          previewLesson.videoUrl
        );
        if (isMounted && vid?.videoUrl?.trim()) {
          setActivePreviewUrl(vid.videoUrl.trim());
          return;
        }
      } catch (err) {
        console.warn('Failed to fetch preview lesson video:', err);
      }
      if (isMounted) {
        setActivePreviewUrl(previewLesson.videoUrl?.trim() || '');
      }
    };

    fetchPreviewVideo();
    return () => { isMounted = false; };
  }, [previewLesson, course.courseId]);

  // Review submission state
  const [showReviewForm, setShowReviewForm] = useState<boolean>(false);
  const [userRating, setUserRating] = useState<number>(5);
  const [commentText, setCommentText] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);

  const userId = auth.currentUser?.uid || userProfile?.username || 'anon_student';
  const userEmail = auth.currentUser?.email || (userProfile as any)?.email || userProfile?.username || '';
  
  const isAdmin = Boolean(
    userEmail.toLowerCase() === 'wahid23hasan@gmail.com' ||
    userEmail.toLowerCase().includes('admin') ||
    userProfile?.role === 'admin' ||
    userProfile?.isAdmin
  );

  const isEnrolled = isAdmin || purchasedCourseIds.includes(course.courseId);
  const isWishlisted = wishlistedIds.includes(course.courseId);

  // Normalize sections helper
  const normalizeSections = (rawCourse: Course): CourseSection[] => {
    if (rawCourse.sections && Array.isArray(rawCourse.sections) && rawCourse.sections.length > 0) {
      return rawCourse.sections;
    }
    if (rawCourse.curriculum && Array.isArray(rawCourse.curriculum) && rawCourse.curriculum.length > 0) {
      return rawCourse.curriculum.map(ch => ({
        sectionId: ch.chapterId,
        title: ch.title,
        sequenceOrder: ch.sequenceOrder,
        lessons: ch.lessons.map(l => ({
          lessonId: l.lessonId,
          sectionId: ch.chapterId,
          title: l.title,
          duration: l.duration,
          sequenceOrder: l.sequenceOrder,
          isPreviewAllowed: l.isPreviewAllowed,
          isFreePreview: l.isPreviewAllowed,
          videoUrl: (l as any).videoUrl,
          thumbnailUrl: (l as any).thumbnailUrl
        }))
      }));
    }
    return [];
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
          const liveData = { ...docSnap.data(), courseId: docSnap.id } as Course;
          setCourse(liveData);
          const parsedSections = normalizeSections(liveData);
          setSections(parsedSections);

          // Open first section by default
          if (parsedSections.length > 0) {
            setOpenSectionIds(prev => ({
              ...prev,
              [parsedSections[0].sectionId || 'sec-0']: true
            }));
          }
        } else {
          setSections(normalizeSections(initialCourse));
        }
        setLoading(false);
      },
      (err) => {
        console.warn('Firestore subscription notice in CourseDetails (using prop course):', err);
        setSections(normalizeSections(initialCourse));
        setLoading(false);
      }
    );

    // Fetch instructor and reviews
    const fetchAdditionalData = async () => {
      try {
        if (course.instructorId) {
          const inst = await courseService.getInstructor(course.instructorId);
          setInstructor(inst);
        }
        const revs = await courseService.getReviews(course.courseId);
        setReviews(revs);
      } catch (e) {
        console.warn('Could not fetch extra details:', e);
      }
    };

    fetchAdditionalData();

    return () => unsubscribe();
  }, [course.courseId]);

  // Handle Review submission
  const handleSubmitReview = async () => {
    if (!commentText.trim()) {
      onShowNotification('Please write your review thoughts first.', 'error');
      return;
    }

    setSubmittingReview(true);
    try {
      const reviewObj = {
        courseId: course.courseId,
        courseTitle: course.title || '',
        userId: auth.currentUser?.uid || 'guest_student',
        userName: userProfile?.fullName || auth.currentUser?.displayName || 'Verified Learner',
        userEmail: userProfile?.email || auth.currentUser?.email || '',
        studentName: userProfile?.fullName || 'Verified Learner',
        studentPhotoURL: userProfile?.photoURL || '',
        rating: userRating,
        comment: commentText.trim(),
        status: 'approved',
        createdAt: new Date().toISOString()
      };

      const newReview = await courseService.addReview(reviewObj);
      setReviews(prev => [newReview, ...prev]);
      setCommentText('');
      setShowReviewForm(false);
      onShowNotification('🌟 Thank you! Your rating and review were published.', 'success');
    } catch (err) {
      console.error('Failed to submit review:', err);
      onShowNotification('Failed to post review. Please try again.', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  const allLessons = sections.flatMap(s => s.lessons);
  const totalLessonsCount = allLessons.length;
  const hasDiscount = course.discountPrice !== undefined && course.discountPrice < course.price;

  return (
    <div className="flex-1 flex flex-col bg-[#050811] text-slate-100 min-h-screen">
      <div className="w-full z-20">
        <AnnouncementBanner />
      </div>

      {/* Hero Spotlight Section */}
      <section className="relative w-full h-64 md:h-80 overflow-hidden border-b border-white/5">
        <img
          src={course.banner?.trim() || course.thumbnail?.trim() || undefined}
          alt={course.title}
          className="w-full h-full object-cover opacity-60"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050811] via-[#050811]/40 to-black/70" />

        {/* Top Action Bar */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10 max-w-7xl mx-auto">
          <button
            onClick={onBack}
            className="p-2.5 bg-black/50 hover:bg-black/80 border border-white/10 rounded-xl text-white transition-all cursor-pointer flex items-center space-x-1.5 backdrop-blur-md"
          >
            <ArrowLeft size={16} />
            <span className="text-xs font-mono font-bold">Back</span>
          </button>

          <div className="flex items-center space-x-2">
            {onToggleWishlist && (
              <button
                onClick={() => onToggleWishlist(course.courseId)}
                className={`p-2.5 rounded-xl border backdrop-blur-md transition-all cursor-pointer ${
                  isWishlisted
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                    : 'bg-black/50 hover:bg-black/80 border-white/10 text-white'
                }`}
                title={isWishlisted ? 'Saved in Wishlist' : 'Add to Wishlist'}
              >
                <Heart size={16} className={isWishlisted ? 'fill-rose-400' : ''} />
              </button>
            )}

            <button
              onClick={() => {
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(window.location.href);
                  onShowNotification('Course link copied to clipboard!', 'success');
                }
              }}
              className="p-2.5 bg-black/50 hover:bg-black/80 border border-white/10 rounded-xl text-white transition-all cursor-pointer backdrop-blur-md"
              title="Share Course"
            >
              <Share2 size={16} />
            </button>
          </div>
        </div>

        {/* Bottom Hero Info */}
        <div className="absolute bottom-6 left-4 right-4 max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <span className="px-2.5 py-1 rounded-full bg-[#39FF14]/10 border border-[#39FF14]/30 text-[#39FF14] text-[10px] font-mono font-bold uppercase tracking-wider">
              {course.category}
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white leading-tight">
              {course.title}
            </h1>
            <p className="text-xs md:text-sm text-slate-300 line-clamp-2">
              {course.subtitle || course.description}
            </p>
          </div>

          {/* Quick Enrolled / CTA status badge */}
          <div className="shrink-0 flex items-center space-x-3">
            {isEnrolled ? (
              <button
                onClick={() => onStartLearning && onStartLearning(course)}
                className="px-6 py-3 bg-[#39FF14] hover:bg-[#39FF14]/90 text-black font-bold font-mono text-xs rounded-xl flex items-center space-x-2 shadow-xl shadow-[#39FF14]/20 cursor-pointer transition-all hover:scale-105"
              >
                <Play size={16} className="fill-black" />
                <span>Go to Classroom (Enrolled)</span>
              </button>
            ) : (
              <button
                onClick={() => onTriggerPurchase && onTriggerPurchase(course)}
                className="px-6 py-3 bg-[#39FF14] hover:bg-[#39FF14]/90 text-black font-bold font-mono text-xs rounded-xl flex items-center space-x-2 shadow-xl shadow-[#39FF14]/20 cursor-pointer transition-all hover:scale-105"
              >
                <Zap size={16} />
                <span>Enroll Now • ৳{course.discountPrice || course.price}</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Main Grid Details Layout */}
      <main className="max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: ABOUT, SYLLABUS, REQUIREMENTS, REVIEWS (Cols 1-8) */}
        <div className="lg:col-span-8 space-y-6">

          {/* 1. COURSE HIGHLIGHTS & OUTCOMES */}
          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 md:p-6 space-y-4">
            <h2 className="font-mono font-bold text-white text-base flex items-center space-x-2">
              <Sparkles size={18} className="text-[#39FF14]" />
              <span>What You Will Master</span>
            </h2>

            {(() => {
              const safeOutcomes = Array.isArray(course.learningOutcomes)
                ? course.learningOutcomes
                : typeof course.learningOutcomes === 'string'
                  ? (course.learningOutcomes as string).split('\n').flatMap(s => s.split(',')).map(s => s.trim()).filter(Boolean)
                  : [];
              return safeOutcomes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {safeOutcomes.map((item, idx) => (
                    <div key={idx} className="flex items-start space-x-2.5 text-xs text-slate-300">
                      <Check size={16} className="text-[#39FF14] shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 font-sans">{course.description}</p>
              );
            })()}
          </div>

          {/* 2. COURSE CURRICULUM / SYLLABUS ACCORDION (REQUIREMENT 3) */}
          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 md:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 gap-2">
              <div>
                <h2 className="font-mono font-bold text-white text-base flex items-center space-x-2">
                  <Layers size={18} className="text-[#39FF14]" />
                  <span>Course Curriculum & Syllabus</span>
                </h2>
                <p className="text-[11px] font-mono text-slate-400 mt-1">
                  {sections.length} structured modules • {totalLessonsCount} high-definition lectures
                </p>
              </div>

              <div className="flex items-center space-x-2 text-[10px] font-mono">
                <span className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-slate-300">
                  {course.duration || 'Comprehensive'}
                </span>
                <span className="px-2 py-1 bg-[#39FF14]/10 border border-[#39FF14]/30 rounded-lg text-[#39FF14] font-bold">
                  {course.level || 'All Levels'}
                </span>
              </div>
            </div>

            {/* Modules Accordion */}
            <div className="space-y-3">
              {loading ? (
                <EliteLoading variant="card" compact label="SCANNING SYLLABUS NODES" subLabel="FETCHING LIVE CURRICULUM..." />
              ) : sections.length === 0 ? (
                <p className="text-xs font-mono text-slate-500 py-6 text-center">
                  Curriculum modules are being finalized for this course.
                </p>
              ) : (
                sections.map((section, sIdx) => {
                  const secId = section.sectionId || `sec-${sIdx}`;
                  const isOpen = openSectionIds[secId] !== false;

                  return (
                    <div key={secId} className="border border-white/10 rounded-xl overflow-hidden bg-black/20">
                      {/* Section Header */}
                      <button
                        onClick={() => setOpenSectionIds(prev => ({ ...prev, [secId]: !isOpen }))}
                        className="w-full p-3.5 bg-white/[0.02] hover:bg-white/5 text-left flex items-center justify-between transition-colors cursor-pointer"
                      >
                        <div>
                          <span className="text-[10px] font-mono text-[#39FF14] uppercase block font-bold">
                            Module {section.sequenceOrder || sIdx + 1}
                          </span>
                          <h3 className="text-xs md:text-sm font-bold text-white">{section.title}</h3>
                        </div>

                        <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
                          <span className="text-[11px]">{section.lessons.length} lessons</span>
                          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </button>

                      {/* Section Lessons */}
                      {isOpen && (
                        <div className="p-2 space-y-1.5 bg-black/40 border-t border-white/5">
                          {section.lessons.map((lesson, lIdx) => {
                            const isFreePreview = lesson.isPreviewAllowed || lesson.isFreePreview;
                            const isPlayable = isEnrolled || isFreePreview;

                            return (
                              <div
                                key={lesson.lessonId || `les-${lIdx}`}
                                className="p-2.5 rounded-lg flex items-center justify-between hover:bg-white/[0.02] transition-colors"
                              >
                                <div className="flex items-center space-x-3 truncate pr-2">
                                  {isPlayable ? (
                                    <button
                                      onClick={() => {
                                        if (isEnrolled && onStartLearning) {
                                          onStartLearning(course);
                                        } else {
                                          setPreviewLesson(lesson);
                                        }
                                      }}
                                      className="p-1.5 bg-[#39FF14]/15 hover:bg-[#39FF14]/30 border border-[#39FF14]/30 text-[#39FF14] rounded-lg transition-all cursor-pointer flex items-center justify-center shrink-0"
                                      title={isEnrolled ? "Play Lesson" : "Play Free Preview"}
                                    >
                                      <Play size={12} className="fill-[#39FF14]" />
                                    </button>
                                  ) : (
                                    <div className="p-1.5 bg-white/5 border border-white/5 text-slate-500 rounded-lg shrink-0">
                                      <Lock size={12} />
                                    </div>
                                  )}

                                  <span
                                    onClick={() => {
                                      if (isPlayable) {
                                        if (isEnrolled && onStartLearning) {
                                          onStartLearning(course);
                                        } else {
                                          setPreviewLesson(lesson);
                                        }
                                      }
                                    }}
                                    className={`text-xs text-slate-300 font-medium truncate ${isPlayable ? 'cursor-pointer hover:text-[#39FF14]' : ''}`}
                                  >
                                    {lesson.title}
                                  </span>
                                </div>

                                <div className="flex items-center space-x-2 shrink-0 font-mono text-[10px]">
                                  {isEnrolled ? (
                                    <span className="px-2 py-0.5 bg-[#39FF14]/10 text-[#39FF14] border border-[#39FF14]/20 rounded font-bold uppercase">
                                      Unlocked
                                    </span>
                                  ) : isFreePreview ? (
                                    <button
                                      onClick={() => setPreviewLesson(lesson)}
                                      className="px-2 py-0.5 bg-[#39FF14]/10 hover:bg-[#39FF14]/20 border border-[#39FF14]/30 text-[#39FF14] rounded font-bold uppercase cursor-pointer"
                                    >
                                      Free Preview
                                    </button>
                                  ) : null}
                                  {lesson.duration && (
                                    <span className="text-slate-500">{lesson.duration}</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 3. INSTRUCTOR PROFILE */}
          {instructor && (
            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 md:p-6 space-y-4">
              <h2 className="font-mono font-bold text-white text-base">Your Lead Instructor</h2>
              <div className="flex items-center space-x-4">
                <img
                  src={instructor.photoURL?.trim() || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200'}
                  alt={instructor.name}
                  className="w-16 h-16 rounded-2xl object-cover border border-white/10"
                />
                <div>
                  <h3 className="text-sm md:text-base font-bold text-white flex items-center space-x-1.5">
                    <span>{instructor.name}</span>
                    {instructor.isVerified && <ShieldCheck size={16} className="text-[#39FF14]" />}
                  </h3>
                  <p className="text-xs text-[#39FF14] font-mono">{instructor.experience}</p>
                  <p className="text-xs text-slate-400 font-mono mt-1">
                    ⭐ {instructor.averageRating} Rating • {instructor.totalStudents?.toLocaleString()} Students
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">{instructor.bio}</p>
            </div>
          )}

          {/* 4. STUDENT REVIEWS & RATINGS */}
          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 md:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h2 className="font-mono font-bold text-white text-base flex items-center space-x-2">
                  <Star size={18} className="text-[#FFD700] fill-[#FFD700]" />
                  <span>Student Feedback & Ratings</span>
                </h2>
                <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                  ⭐ {course.rating} / 5.0 • ({reviews.length} verified reviews)
                </p>
              </div>

              <button
                onClick={() => setShowReviewForm(!showReviewForm)}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-mono font-bold text-[#39FF14] transition-colors cursor-pointer"
              >
                {showReviewForm ? 'Cancel' : 'Write Review'}
              </button>
            </div>

            {/* Review Form */}
            {showReviewForm && (
              <div className="bg-black/30 border border-white/10 rounded-xl p-4 space-y-3 font-mono text-xs">
                <span className="text-[#39FF14] font-bold uppercase text-[10px] block">Your Rating</span>
                <div className="flex items-center space-x-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setUserRating(star)}
                      className="p-1 cursor-pointer"
                    >
                      <Star
                        size={20}
                        className={star <= userRating ? 'text-[#FFD700] fill-[#FFD700]' : 'text-slate-600'}
                      />
                    </button>
                  ))}
                  <span className="text-white font-bold ml-2">{userRating} / 5 Stars</span>
                </div>

                <textarea
                  rows={3}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Share your learning experience and feedback..."
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-xs outline-none focus:border-[#39FF14]"
                />

                <button
                  type="button"
                  onClick={handleSubmitReview}
                  disabled={submittingReview}
                  className="px-4 py-2 bg-[#39FF14] text-black font-bold rounded-lg text-xs hover:bg-[#39FF14]/90 cursor-pointer disabled:opacity-50"
                >
                  {submittingReview ? 'Publishing...' : 'Publish Review'}
                </button>
              </div>
            )}

            {/* Reviews List */}
            <div className="space-y-3">
              {reviews.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center font-mono">No reviews yet. Be the first to share your thoughts!</p>
              ) : (
                reviews.map(r => (
                  <div key={r.reviewId} className="p-3.5 bg-white/[0.01] border border-white/10 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">{r.studentName}</span>
                      <div className="flex items-center text-[#FFD700] text-xs">
                        {'★'.repeat(r.rating)}
                      </div>
                    </div>
                    <p className="text-slate-300 text-xs font-sans">{r.comment}</p>
                    <span className="text-[10px] font-mono text-slate-500 block">{r.createdAt || 'Recent'}</span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: ENROLLMENT CARD (Cols 9-12) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 md:p-6 space-y-4 sticky top-20">
            {/* Thumbnail Preview with Play icon */}
            <div className="relative rounded-xl overflow-hidden aspect-video border border-white/10 group cursor-pointer" onClick={() => {
              const firstPreview = allLessons.find(l => l.isPreviewAllowed || l.isFreePreview) || allLessons[0];
              if (firstPreview) setPreviewLesson(firstPreview);
            }}>
              <img
                src={course.thumbnail?.trim() || undefined}
                alt={course.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-[#39FF14] flex items-center justify-center text-black shadow-lg shadow-[#39FF14]/30 group-hover:scale-110 transition-transform">
                  <Play size={20} className="fill-black translate-x-0.5" />
                </div>
              </div>
              <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/80 font-mono text-[10px] text-[#39FF14] rounded">
                Preview Course
              </span>
            </div>

            {/* Pricing Section */}
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-2xl font-extrabold font-mono text-white">
                  ৳{course.discountPrice || course.price}
                </span>
                {hasDiscount && (
                  <span className="text-xs font-mono text-slate-400 line-through ml-2">
                    ৳{course.price}
                  </span>
                )}
              </div>

              {hasDiscount && (
                <span className="px-2 py-0.5 bg-rose-500/20 border border-rose-500/30 text-rose-300 font-mono text-[10px] font-bold rounded">
                  SAVE {Math.round(((course.price - (course.discountPrice || 0)) / course.price) * 100)}%
                </span>
              )}
            </div>

            {/* Action Buttons */}
            {isEnrolled ? (
              <button
                onClick={() => onStartLearning && onStartLearning(course)}
                className="w-full py-3 bg-[#39FF14] hover:bg-[#39FF14]/90 text-black font-bold font-mono text-xs rounded-xl flex items-center justify-center space-x-2 shadow-xl shadow-[#39FF14]/20 cursor-pointer uppercase tracking-wider"
              >
                <Play size={16} className="fill-black" />
                <span>Continue Learning</span>
              </button>
            ) : (
              <button
                onClick={() => onTriggerPurchase && onTriggerPurchase(course)}
                className="w-full py-3 bg-[#39FF14] hover:bg-[#39FF14]/90 text-black font-bold font-mono text-xs rounded-xl flex items-center justify-center space-x-2 shadow-xl shadow-[#39FF14]/20 cursor-pointer uppercase tracking-wider"
              >
                <Zap size={16} />
                <span>Enroll Now</span>
              </button>
            )}

            {/* Course Inclusions Summary */}
            <div className="border-t border-white/10 pt-4 space-y-2.5 font-mono text-xs text-slate-300">
              <span className="font-bold text-white text-[11px] block uppercase text-slate-400">Course Includes</span>
              <div className="flex items-center space-x-2">
                <Clock size={14} className="text-[#39FF14]" />
                <span>{course.duration || '24+ Hours'} On-demand HD Video</span>
              </div>
              <div className="flex items-center space-x-2">
                <Layers size={14} className="text-[#39FF14]" />
                <span>{totalLessonsCount} In-depth Modular Lectures</span>
              </div>
              <div className="flex items-center space-x-2">
                <Award size={14} className="text-[#39FF14]" />
                <span>Official Nexus Accredited Certificate</span>
              </div>
              <div className="flex items-center space-x-2">
                <Globe size={14} className="text-[#39FF14]" />
                <span>Lifetime Access on Mobile & Desktop</span>
              </div>
            </div>

          </div>
        </div>

      </main>

      {/* ================= FREE PREVIEW VIDEO MODAL (REQUIREMENT 3) ================= */}
      <AnimatePresence>
        {previewLesson && (
          <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto w-screen h-[100dvh] top-0 left-0">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#050811] border border-white/15 rounded-2xl sm:rounded-3xl p-5 max-w-2xl w-full relative shadow-[0_10px_50px_rgba(57,255,20,0.15)] space-y-4 max-h-[88dvh] overflow-y-auto my-auto z-10"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="truncate pr-4">
                  <span className="px-2 py-0.5 bg-[#39FF14]/10 text-[#39FF14] border border-[#39FF14]/30 rounded font-mono text-[9px] font-bold uppercase">
                    Free Lecture Preview
                  </span>
                  <h3 className="text-base font-bold text-white truncate mt-1">{previewLesson.title}</h3>
                </div>

                <button
                  onClick={() => setPreviewLesson(null)}
                  className="p-1.5 bg-white/5 border border-white/10 hover:border-white/20 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Video Player */}
              <div className="w-full">
                <SmartVideoPlayer
                  videoUrl={activePreviewUrl || previewLesson.videoUrl || DEFAULT_PREVIEW_VIDEO}
                  title={previewLesson.title}
                  autoPlay={true}
                />
              </div>

              {/* Modal Footer CTA */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <p className="text-xs text-slate-400 font-sans">
                  Enjoying this lecture? Enroll now to unlock all {totalLessonsCount} lessons & get certified.
                </p>

                <div className="flex items-center space-x-2 shrink-0 w-full sm:w-auto">
                  <button
                    onClick={() => setPreviewLesson(null)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-mono font-bold transition-all border border-white/10 cursor-pointer flex-1 sm:flex-none"
                  >
                    Close
                  </button>

                  {!isEnrolled && onTriggerPurchase && (
                    <button
                      onClick={() => {
                        setPreviewLesson(null);
                        onTriggerPurchase(course);
                      }}
                      className="px-5 py-2 bg-[#39FF14] hover:bg-[#39FF14]/90 text-black font-bold font-mono text-xs rounded-xl uppercase transition-all shadow-lg shadow-[#39FF14]/20 cursor-pointer flex-1 sm:flex-none"
                    >
                      Enroll Now • ৳{course.discountPrice || course.price}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
export default CourseDetails;
