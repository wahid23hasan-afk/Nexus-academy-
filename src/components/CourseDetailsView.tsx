import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  Star, 
  Users, 
  Clock, 
  Calendar, 
  Globe, 
  Share2, 
  Heart, 
  Lock, 
  Play, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  GraduationCap, 
  BookOpen, 
  Award, 
  ShieldCheck,
  Flame,
  X,
  ArrowRight
} from 'lucide-react';
import { Course, Instructor, CurriculumChapter, CourseReview } from '../types/course';
import { courseService } from '../services/courseService';
import { AnnouncementBanner } from './AnnouncementBanner';

interface CourseDetailsViewProps {
  course: Course;
  userProfile: { fullName: string; username: string; photoURL?: string } | null;
  onBack: () => void;
  onShowNotification: (message: string, type: 'success' | 'error') => void;
  isWishlisted: boolean;
  onToggleWishlist: () => void;
  isEnrolled: boolean;
  isPending?: boolean;
  onEnroll: () => void;
  onSelectCourse: (course: Course) => void;
}

export function CourseDetailsView({
  course,
  userProfile,
  onBack,
  onShowNotification,
  isWishlisted,
  onToggleWishlist,
  isEnrolled,
  isPending = false,
  onEnroll,
  onSelectCourse
}: CourseDetailsViewProps) {
  // Firestore data states
  const [instructor, setInstructor] = useState<Instructor | null>(null);
  const [curriculum, setCurriculum] = useState<CurriculumChapter[]>([]);
  const [reviews, setReviews] = useState<CourseReview[]>([]);
  const [relatedCourses, setRelatedCourses] = useState<Course[]>([]);
  
  // Loading states
  const [loadingInstructor, setLoadingInstructor] = useState(true);
  const [loadingCurriculum, setLoadingCurriculum] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [loadingRelated, setLoadingRelated] = useState(true);

  // Expansion states
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [expandedChapters, setExpandedChapters] = useState<string[]>([]);
  const [activePreviewLesson, setActivePreviewLesson] = useState<{ title: string; courseTitle: string } | null>(null);

  // Load Firestore data on mount or when courseId changes
  useEffect(() => {
    // Reset states
    setInstructor(null);
    setCurriculum([]);
    setReviews([]);
    setRelatedCourses([]);
    setExpandedChapters([]);
    
    setLoadingInstructor(true);
    setLoadingCurriculum(true);
    setLoadingReviews(true);
    setLoadingRelated(true);

    const loadDetails = async () => {
      try {
        // 1. Fetch Instructor
        if (course.instructorId) {
          const instData = await courseService.getInstructor(course.instructorId);
          setInstructor(instData);
        }
        setLoadingInstructor(false);

        // 2. Fetch Curriculum
        const currData = await courseService.getCurriculum(course.courseId);
        setCurriculum(currData);
        // Expand first chapter by default
        if (currData.length > 0) {
          setExpandedChapters([currData[0].chapterId]);
        }
        setLoadingCurriculum(false);

        // 3. Fetch Reviews
        const reviewData = await courseService.getReviews(course.courseId);
        setReviews(reviewData);
        setLoadingReviews(false);

        // 4. Fetch Related Courses
        const relatedData = await courseService.getRelatedCourses(course.category, course.courseId);
        setRelatedCourses(relatedData);
        setLoadingRelated(false);
      } catch (err) {
        console.error('Error fetching course details from Firestore:', err);
        onShowNotification('Failed to retrieve full course details.', 'error');
      }
    };

    loadDetails();
  }, [course.courseId]);

  // Toggle chapter expansion
  const toggleChapter = (chapterId: string) => {
    setExpandedChapters(prev => 
      prev.includes(chapterId) 
        ? prev.filter(id => id !== chapterId) 
        : [...prev, chapterId]
    );
  };

  // Pricing calculations
  const hasDiscount = course.discountPrice !== undefined && course.discountPrice < course.price;
  const discountPercent = hasDiscount 
    ? Math.round(((course.price - (course.discountPrice || 0)) / course.price) * 100) 
    : 0;

  // Handle Share Course link
  const handleShare = () => {
    const shareUrl = `${window.location.origin}/courses/${course.courseId}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl)
        .then(() => onShowNotification('Syllabus Link copied to clipboard!', 'success'))
        .catch(() => onShowNotification('Failed to copy link.', 'error'));
    } else {
      onShowNotification(`Syllabus Link: ${shareUrl}`, 'success');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#050811] text-slate-100 min-h-screen">
      {/* Dynamic Announcement Banner */}
      <div className="w-full z-20">
        <AnnouncementBanner />
      </div>

      {/* ================= HERO SPOTLIGHT BANNER ================= */}
      <div className="relative w-full h-56 md:h-72 overflow-hidden border-b border-white/5">
        <motion.img 
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.6 }}
          transition={{ duration: 0.6 }}
          src={course.banner || undefined} 
          alt={course.title} 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050811] via-transparent to-black/70" />

        {/* Floating Top Navigation Buttons */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
          <button
            onClick={onBack}
            className="p-2.5 bg-black/40 hover:bg-black/60 border border-white/10 hover:border-[#39FF14]/30 rounded-xl text-white transition-all cursor-pointer flex items-center space-x-1 backdrop-blur-md"
            title="Go Back"
          >
            <ChevronLeft size={16} />
            <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Back</span>
          </button>

          <div className="flex items-center space-x-2">
            {/* Share Button */}
            <button
              onClick={handleShare}
              className="p-2.5 bg-black/40 hover:bg-black/60 border border-white/10 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer backdrop-blur-md"
              title="Share Syllabus"
            >
              <Share2 size={15} />
            </button>

            {/* Wishlist Button */}
            <button
              onClick={onToggleWishlist}
              className={`p-2.5 rounded-xl border cursor-pointer backdrop-blur-md transition-all ${
                isWishlisted 
                  ? 'bg-red-500/20 border-red-500/50 text-red-400' 
                  : 'bg-black/40 border-white/10 text-slate-300 hover:text-white'
              }`}
              title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
            >
              <Heart size={15} fill={isWishlisted ? 'currentColor' : 'none'} />
            </button>
          </div>
        </div>

        {/* Floating Categories Tag */}
        <div className="absolute bottom-4 left-4 flex space-x-2">
          <span className="text-[9px] font-mono uppercase tracking-widest font-bold bg-[#39FF14]/10 border border-[#39FF14]/30 text-[#39FF14] px-3 py-1 rounded-full backdrop-blur-md shadow-[0_0_12px_rgba(57,255,20,0.1)]">
            {course.category}
          </span>
          {course.isBestSeller && (
            <span className="text-[9px] font-mono uppercase tracking-widest font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400 px-3 py-1 rounded-full backdrop-blur-md">
              Bestseller 🔥
            </span>
          )}
        </div>
      </div>

      {/* ================= MAIN SCROLLABLE CONTENT ================= */}
      <main className="flex-1 px-4 py-6 max-w-4xl mx-auto w-full space-y-6">
        
        {/* ================= HEADER OVERVIEW CARD ================= */}
        <section className="bg-white/[0.01] border border-white/5 rounded-3xl p-5 backdrop-blur-md relative overflow-hidden space-y-4">
          <div className="absolute -top-12 -left-12 w-24 h-24 bg-gradient-to-br from-[#39FF14]/5 to-transparent blur-2xl rounded-full" />
          
          <div className="space-y-2">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white font-sans leading-tight">
              {course.title}
            </h1>
            {course.subtitle && (
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {course.subtitle}
              </p>
            )}
          </div>

          {/* Instructor Compact Info */}
          <div className="flex items-center space-x-3 pt-1 border-t border-white/5">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 relative">
              {instructor?.photoURL ? (
                <img 
                  src={instructor.photoURL || undefined} 
                  alt={course.instructor} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                  <GraduationCap size={18} className="text-slate-400" />
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center space-x-1">
                <span className="text-xs font-semibold text-slate-200">{course.instructor}</span>
                {instructor?.isVerified && (
                  <ShieldCheck size={12} className="text-[#39FF14]" />
                )}
              </div>
              <p className="text-[10px] font-mono text-slate-450">{instructor?.experience || 'Professional Educator'}</p>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-white/5 text-[11px] font-mono text-slate-300">
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 flex items-center space-x-2">
              <Star className="text-amber-400" size={13} fill="currentColor" />
              <div>
                <p className="text-[9px] text-slate-500">RATING</p>
                <p className="font-bold text-white">
                  {course.rating.toFixed(1)} <span className="text-slate-400 font-normal">({course.reviewCount || 120} reviews)</span>
                </p>
              </div>
            </div>

            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 flex items-center space-x-2">
              <Users className="text-[#39FF14]" size={13} />
              <div>
                <p className="text-[9px] text-slate-500">STUDENTS</p>
                <p className="font-bold text-white">{course.students?.toLocaleString() || 0}</p>
              </div>
            </div>

            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 flex items-center space-x-2">
              <Clock className="text-cyan-400" size={13} />
              <div>
                <p className="text-[9px] text-slate-500">DURATION</p>
                <p className="font-bold text-white">{course.duration}</p>
              </div>
            </div>

            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 flex items-center space-x-2">
              <Globe className="text-purple-400" size={13} />
              <div>
                <p className="text-[9px] text-slate-500">LANGUAGE</p>
                <p className="font-bold text-white">{course.language}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1 text-[10px] text-slate-400 font-mono">
            <span className="flex items-center">
              <Calendar size={11} className="mr-1.5 text-slate-500" />
              Last Updated: {course.lastUpdated || 'Recently'}
            </span>
            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 uppercase font-bold text-[9px] tracking-wider text-slate-300">
              {course.level} Level
            </span>
          </div>
        </section>

        {/* ================= PREMIUM PRICE SECTION ================= */}
        <section className="bg-gradient-to-br from-slate-950 to-slate-900 border border-[#39FF14]/20 rounded-3xl p-5 shadow-[0_4px_30px_rgba(57,255,20,0.03)] relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-[#39FF14]/10 text-[#39FF14] text-[8px] font-mono font-bold px-3.5 py-1.5 rounded-bl-2xl uppercase tracking-widest border-l border-b border-[#39FF14]/20 flex items-center space-x-1">
            <Flame size={10} className="animate-pulse" />
            <span>LIMITED TIME PROMO</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Enrollment Pricing</p>
              <div className="flex items-baseline space-x-2.5 mt-1">
                {hasDiscount ? (
                  <>
                    <span className="text-2xl font-bold text-[#39FF14] font-mono">
                      ৳{course.discountPrice?.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-500 line-through font-mono">
                      ৳{course.price?.toLocaleString()}
                    </span>
                    <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-400/5 px-2 py-0.5 rounded border border-amber-400/25">
                      {discountPercent}% DISCOUNT
                    </span>
                  </>
                ) : (
                  <span className="text-2xl font-bold text-white font-mono">
                    {course.price === 0 ? 'FREE' : `৳${course.price?.toLocaleString()}`}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-450 mt-1 font-sans">
                *One-time payment for lifetime syllabus access, updates & certificates.
              </p>
            </div>

            <div className="flex items-center space-x-2.5">
              <button
                onClick={() => {
                  if (isPending) {
                    onShowNotification('Your payment request is pending Admin approval. Please wait for Admin to approve.', 'error');
                  } else {
                    onEnroll();
                  }
                }}
                className={`flex-1 sm:flex-initial px-6 py-3.5 rounded-xl font-bold uppercase tracking-wider text-xs transition-all duration-300 cursor-pointer flex items-center justify-center space-x-1.5 ${
                  isPending
                    ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400'
                    : isEnrolled 
                    ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-950/60' 
                    : 'bg-[#39FF14] hover:bg-[#32e011] text-black shadow-[0_0_20px_rgba(57,255,20,0.25)] hover:shadow-[0_0_24px_rgba(57,255,20,0.4)]'
                }`}
              >
                <GraduationCap size={14} />
                <span>{isPending ? '⏳ Pending Approval' : isEnrolled ? 'Already Enrolled' : 'Enroll Now'}</span>
              </button>
            </div>
          </div>
        </section>

        {/* ================= DESCRIPTION & EXPANDABLE DETAILS ================= */}
        <section className="space-y-3">
          <h2 className="text-sm font-mono uppercase tracking-widest text-slate-400 flex items-center">
            <BookOpen size={13} className="mr-2 text-cyan-400" />
            <span>Course Syllabus & Overview</span>
          </h2>
          
          <div className="bg-white/[0.01] border border-white/5 rounded-3xl p-5 space-y-4 font-sans text-xs">
            <div className="relative">
              <p className={`text-slate-300 leading-relaxed transition-all ${!isDescExpanded && 'line-clamp-3'}`}>
                {course.description}
              </p>
              {!isDescExpanded && (
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#050811]/10 to-transparent pointer-events-none" />
              )}
            </div>

            <button
              onClick={() => setIsDescExpanded(!isDescExpanded)}
              className="text-[#39FF14] hover:text-white font-mono text-[10px] tracking-wider uppercase flex items-center space-x-1 cursor-pointer"
            >
              <span>{isDescExpanded ? 'Read Less' : 'Read Full Description'}</span>
              {isDescExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>

            {/* Learning Outcomes (Expandable checklist) */}
            {course.learningOutcomes && course.learningOutcomes.length > 0 && (
              <div className="pt-3 border-t border-white/5 space-y-2.5">
                <h3 className="text-xs font-semibold text-white">Syllabus Learning Outcomes</h3>
                <div className="grid gap-2 text-slate-300 text-[11px] leading-relaxed">
                  {course.learningOutcomes.map((outcome, i) => (
                    <div key={i} className="flex items-start space-x-2">
                      <span className="mt-0.5 text-[#39FF14] flex-shrink-0">✔</span>
                      <span>{outcome}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ================= WHAT YOU WILL LEARN CHECKLIST ================= */}
        {course.skillsGained && course.skillsGained.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-mono uppercase tracking-widest text-slate-400 flex items-center">
              <Award size={13} className="mr-2 text-[#39FF14]" />
              <span>Skills & Tools You Will Gain</span>
            </h2>
            <div className="flex flex-wrap gap-2">
              {course.skillsGained.map((skill, index) => (
                <span 
                  key={index}
                  className="px-3.5 py-2 rounded-xl text-xs bg-white/[0.02] border border-white/5 text-slate-300 font-sans font-semibold flex items-center space-x-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#39FF14]" />
                  <span>{skill}</span>
                </span>
              ))}
            </div>
          </section>
        )}

        {/* ================= COURSE CURRICULUM (CHAPTERS & LESSONS) ================= */}
        <section className="space-y-3">
          <div className="flex justify-between items-end">
            <h2 className="text-sm font-mono uppercase tracking-widest text-slate-400 flex items-center">
              <GraduationCap size={13} className="mr-2 text-yellow-400" />
              <span>Syllabus Curriculum</span>
            </h2>
            <span className="text-[10px] font-mono text-slate-500">EXPAND CHAPTERS</span>
          </div>

          <div className="space-y-2.5">
            {loadingCurriculum ? (
              // Skeletons
              [1, 2].map(i => (
                <div key={i} className="bg-white/[0.01] border border-white/5 rounded-2xl p-4 animate-pulse h-12" />
              ))
            ) : curriculum.length > 0 ? (
              curriculum.map((chapter) => {
                const isExpanded = expandedChapters.includes(chapter.chapterId);
                return (
                  <div 
                    key={chapter.chapterId}
                    className="bg-white/[0.01] border border-white/5 hover:border-white/10 rounded-2xl overflow-hidden transition-all"
                  >
                    {/* Chapter Header */}
                    <button
                      onClick={() => toggleChapter(chapter.chapterId)}
                      className="w-full px-4 py-3.5 flex items-center justify-between text-left cursor-pointer hover:bg-white/[0.01] transition-colors"
                    >
                      <div className="space-y-0.5">
                        <h3 className="text-xs font-semibold text-white tracking-tight font-sans">
                          {chapter.title}
                        </h3>
                        <p className="text-[10px] font-mono text-slate-500">
                          {chapter.lessonsCount} Lessons • {chapter.totalDuration} Total Duration
                        </p>
                      </div>
                      <div className="text-slate-400">
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </div>
                    </button>

                    {/* Chapter Lessons List */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-t border-white/5 bg-black/20"
                        >
                          <div className="p-1 space-y-1">
                            {chapter.lessons.map((lesson) => (
                              <div 
                                key={lesson.lessonId}
                                className="px-3.5 py-2.5 rounded-xl flex items-center justify-between text-[11px] font-sans hover:bg-white/[0.02] transition-colors"
                              >
                                <div className="flex items-center space-x-2.5">
                                  {lesson.isPreviewAllowed ? (
                                    <button
                                      onClick={() => setActivePreviewLesson({ title: lesson.title, courseTitle: course.title })}
                                      className="p-1.5 bg-[#39FF14]/10 hover:bg-[#39FF14]/20 border border-[#39FF14]/25 text-[#39FF14] rounded-lg cursor-pointer transition-all flex items-center justify-center"
                                      title="Free Preview Lesson"
                                    >
                                      <Play size={10} fill="currentColor" />
                                    </button>
                                  ) : (
                                    <div className="p-1.5 bg-white/5 border border-white/5 text-slate-500 rounded-lg flex items-center justify-center">
                                      <Lock size={10} />
                                    </div>
                                  )}
                                  <span className="text-slate-300 font-medium">{lesson.title}</span>
                                </div>

                                <div className="flex items-center space-x-2 font-mono text-[10px] text-slate-450">
                                  <span>{lesson.duration}</span>
                                  {lesson.isPreviewAllowed && (
                                    <span className="text-[8px] uppercase tracking-wider font-bold bg-[#39FF14]/10 text-[#39FF14] px-1 py-0.5 rounded border border-[#39FF14]/20">
                                      PREVIEW
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            ) : (
              <p className="text-xs font-mono text-slate-500 py-4 text-center">Curriculum details not compiled yet.</p>
            )}
          </div>
        </section>

        {/* ================= COURSE REQUIREMENTS ================= */}
        {course.requirements && course.requirements.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-mono uppercase tracking-widest text-slate-400 flex items-center">
              <Check size={13} className="mr-2 text-teal-400" />
              <span>Syllabus Prerequisites & Requirements</span>
            </h2>
            <div className="bg-white/[0.01] border border-white/5 rounded-3xl p-5 space-y-2.5">
              {course.requirements.map((req, i) => (
                <div key={i} className="flex items-center space-x-2.5 text-xs text-slate-300 font-sans">
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                  <span>{req}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ================= DETAILED INSTRUCTOR PROFILE ================= */}
        <section className="space-y-3">
          <h2 className="text-sm font-mono uppercase tracking-widest text-slate-400 flex items-center">
            <GraduationCap size={13} className="mr-2 text-[#39FF14]" />
            <span>Meet Your Instructor</span>
          </h2>

          <div className="bg-white/[0.01] border border-white/5 rounded-3xl p-5 space-y-4">
            {loadingInstructor ? (
              <div className="animate-pulse flex space-x-4">
                <div className="rounded-2xl bg-slate-800 h-16 w-16" />
                <div className="flex-1 space-y-3 py-1">
                  <div className="h-4 bg-slate-800 rounded w-1/4" />
                  <div className="h-3 bg-slate-800 rounded w-3/4" />
                </div>
              </div>
            ) : instructor ? (
              <>
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden border border-white/10 shadow-md">
                    <img 
                      src={instructor.photoURL || undefined} 
                      alt={instructor.name} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <div className="flex items-center space-x-1">
                      <h3 className="text-sm font-bold text-white font-sans">{instructor.name}</h3>
                      {instructor.isVerified && (
                        <span className="text-[8px] font-mono font-bold uppercase tracking-widest bg-[#39FF14]/10 text-[#39FF14] px-1.5 py-0.5 rounded border border-[#39FF14]/25">
                          VERIFIED
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] font-mono text-[#39FF14]">{instructor.experience}</p>
                    
                    {/* Faculty Stats */}
                    <div className="flex items-center space-x-3 mt-1.5 text-[10px] font-mono text-slate-450">
                      <span>🎓 {instructor.totalCourses} Courses</span>
                      <span>👥 {instructor.totalStudents?.toLocaleString() || 0} Students</span>
                      <span>⭐ {instructor.averageRating.toFixed(1)} Avg Rating</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans pt-1 border-t border-white/5">
                  {instructor.bio}
                </p>
              </>
            ) : (
              <p className="text-xs font-mono text-slate-500 text-center">Instructor bio not synced.</p>
            )}
          </div>
        </section>

        {/* ================= STUDENT REVIEWS ================= */}
        <section className="space-y-3">
          <h2 className="text-sm font-mono uppercase tracking-widest text-slate-400 flex items-center">
            <Star size={13} className="mr-2 text-amber-400" fill="currentColor" />
            <span>Student Experiences & Feedback</span>
          </h2>

          <div className="space-y-2.5">
            {loadingReviews ? (
              <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4 animate-pulse h-16" />
            ) : reviews.length > 0 ? (
              reviews.map((rev) => (
                <div 
                  key={rev.reviewId}
                  className="bg-white/[0.01] border border-white/5 rounded-2xl p-4 space-y-3 text-[11px] font-sans"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/5 bg-slate-800">
                        {rev.studentPhotoURL ? (
                          <img 
                            src={rev.studentPhotoURL || undefined} 
                            alt={rev.studentName} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-white bg-slate-800">
                            {rev.studentName.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-200">{rev.studentName}</h4>
                        <div className="flex items-center space-x-1.5 mt-0.5">
                          <div className="flex items-center text-amber-400">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                size={9} 
                                fill={i < Math.floor(rev.rating) ? 'currentColor' : 'none'} 
                                className="mr-0.5" 
                              />
                            ))}
                          </div>
                          <span className="text-[9px] text-slate-500 font-mono">{rev.rating.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>

                    <span className="text-[9px] font-mono text-slate-500">{rev.createdAt}</span>
                  </div>

                  <p className="text-slate-300 leading-relaxed pl-1 border-l-2 border-[#39FF14]/20 italic">
                    "{rev.comment}"
                  </p>
                </div>
              ))
            ) : (
              <p className="text-xs font-mono text-slate-500 py-2 text-center">No reviews submitted yet.</p>
            )}
          </div>
        </section>

        {/* ================= RELATED COURSES ================= */}
        <section className="space-y-3">
          <h2 className="text-sm font-mono uppercase tracking-widest text-slate-400 flex items-center">
            <BookOpen size={13} className="mr-2 text-[#39FF14]" />
            <span>Similar Courses in Category</span>
          </h2>

          <div className="flex space-x-3 overflow-x-auto pb-4 scrollbar-none snap-x touch-pan-x">
            {loadingRelated ? (
              [1, 2].map(i => (
                <div key={i} className="min-w-[220px] max-w-[220px] h-32 bg-slate-900 border border-white/5 rounded-2xl animate-pulse" />
              ))
            ) : relatedCourses.length > 0 ? (
              relatedCourses.map((rc) => {
                const isRcDiscount = rc.discountPrice !== undefined && rc.discountPrice < rc.price;
                return (
                  <motion.div
                    key={rc.courseId}
                    whileHover={{ scale: 1.01 }}
                    onClick={() => onSelectCourse(rc)}
                    className="min-w-[220px] max-w-[220px] bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 hover:border-[#39FF14]/20 rounded-2xl p-2.5 cursor-pointer transition-all snap-center flex flex-col justify-between"
                  >
                    <div>
                      <div className="w-full h-24 rounded-lg overflow-hidden relative border border-white/5">
                        <img 
                          src={rc.thumbnail || undefined} 
                          alt={rc.title} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <h4 className="text-[11px] font-semibold text-slate-200 mt-2 line-clamp-2 leading-snug">
                        {rc.title}
                      </h4>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono">
                      <span className="text-slate-400">👨‍🏫 {rc.instructor?.split(' ')[1] || rc.instructor}</span>
                      <span className="text-[#39FF14] font-bold">
                        {isRcDiscount ? `৳${rc.discountPrice?.toLocaleString()}` : rc.price === 0 ? 'FREE' : `৳${rc.price?.toLocaleString()}`}
                      </span>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <p className="text-xs font-mono text-slate-500 py-3 text-center w-full">No other programs registered in this niche yet.</p>
            )}
          </div>
        </section>

      </main>

      {/* ================= DETAILED SYLLABUS LESSON PREVIEW OVERLAY ================= */}
      <AnimatePresence>
        {activePreviewLesson && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-950 border border-white/10 rounded-3xl p-5 max-w-sm w-full text-center relative shadow-[0_10px_40px_rgba(57,255,20,0.15)] space-y-4"
            >
              <button
                onClick={() => setActivePreviewLesson(null)}
                className="absolute top-4 right-4 p-1.5 bg-white/5 border border-white/10 hover:border-white/20 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>

              <div className="w-12 h-12 bg-[#39FF14]/10 rounded-full flex items-center justify-center mx-auto border border-[#39FF14]/20">
                <Play className="text-[#39FF14]" size={18} fill="currentColor" />
              </div>

              <div>
                <span className="text-[9px] font-mono uppercase tracking-widest text-[#39FF14] font-bold bg-[#39FF14]/5 border border-[#39FF14]/20 px-2.5 py-1 rounded-full">
                  FREE SYLLABUS PREVIEW
                </span>
                <h4 className="text-sm font-semibold text-white mt-3 font-sans leading-snug">
                  {activePreviewLesson.title}
                </h4>
                <p className="text-[10px] text-slate-400 font-sans mt-1">
                  Course: {activePreviewLesson.courseTitle}
                </p>
              </div>

              <div className="aspect-video w-full bg-slate-900 border border-white/5 rounded-2xl flex flex-col items-center justify-center p-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900 to-black/40" />
                <GraduationCap className="text-slate-750 relative z-10 animate-bounce" size={40} />
                <p className="text-[10px] text-slate-300 text-center max-w-xs mt-3.5 leading-relaxed relative z-10 font-sans">
                  Syllabus video streams are compiled. Streaming endpoints will lock automatically onto this container context in Part 6.
                </p>
              </div>

              <button
                onClick={() => setActivePreviewLesson(null)}
                className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold uppercase transition-all border border-white/10 cursor-pointer"
              >
                Close Preview
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="mt-8 py-4 border-t border-white/5 text-center font-mono text-[9px] text-slate-500 tracking-wider bg-black/20">
        NEXUS SYLLABUS CORE • SECURED BY FIREBASE AUTH
      </footer>
    </div>
  );
}
