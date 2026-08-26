import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  RefreshCw, 
  GraduationCap, 
  Sparkles, 
  ChevronRight,
  HelpCircle,
  Award,
  Layers,
  Inbox,
  Check
} from 'lucide-react';
import { Course } from '../types/course';
import { progressService, MyCourseRelation } from '../services/progressService';
import { courseService } from '../services/courseService';
import { auth, db } from '../services/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { EliteLoading } from './EliteLoading';
import { RefundRequestModal } from './RefundRequestModal';

interface MyCoursesViewProps {
  userProfile: { fullName: string; username: string; photoURL?: string } | null;
  onOpenCourse: (course: Course) => void;
  onBrowseCourses: () => void;
  onShowNotification: (message: string, type: 'success' | 'error') => void;
}

export function MyCoursesView({
  userProfile,
  onOpenCourse,
  onBrowseCourses,
  onShowNotification
}: MyCoursesViewProps) {
  const userId = auth.currentUser?.uid || userProfile?.username || 'anonymous_user';
  const userEmail = auth.currentUser?.email || userProfile?.username || '';

  // State variables
  const [purchasedCourses, setPurchasedCourses] = useState<Course[]>([]);
  const [pendingCourses, setPendingCourses] = useState<{ course: Course; date: string; method: string }[]>([]);
  const [courseRelations, setCourseRelations] = useState<MyCourseRelation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [selectedCourseForRefund, setSelectedCourseForRefund] = useState<Course | null>(null);

  // Fetch classroom data
  const loadClassroomData = async (isRefreshed = false) => {
    if (isRefreshed) setRefreshing(true);
    else setLoading(true);

    try {
      // 1. Fetch user purchase records to check approval status (by userId OR userEmail)
      const userPurchases = await courseService.getUserPurchases(userId, userEmail);

      // 2. Fetch relations from myCourses Firestore (by userId OR userEmail)
      const relations = await progressService.getUserMyCourses(userId, userEmail);
      setCourseRelations(relations);

      const approvedPurIds = userPurchases
        .filter(p => p.status === 'approved' || p.status === 'success' || p.status === 'active')
        .map(p => p.courseId);
      const relationCourseIds = relations.map(r => r.courseId);
      const allApprovedIds = Array.from(new Set([...approvedPurIds, ...relationCourseIds]));

      const pendingPur = userPurchases.filter(p => p.status === 'pending' && !allApprovedIds.includes(p.courseId));

      // 3. Fetch all course templates
      const allCourses = await courseService.getCourses();

      // Filter matched courses ONLY if approved or already in progress
      const matchedApproved = allCourses.filter(c => 
        allApprovedIds.includes(c.courseId)
      );
      setPurchasedCourses(matchedApproved);

      // Match pending courses
      const matchedPending = pendingPur.map(p => {
        const foundCourse = allCourses.find(c => c.courseId === p.courseId) || {
          courseId: p.courseId,
          title: p.courseTitle || 'Nexus Course',
          description: '',
          thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&auto=format&fit=crop&q=80',
          banner: '',
          instructor: 'Nexus Instructor',
          category: 'Academic',
          price: p.amount,
          rating: 4.9,
          students: 120,
          language: 'Bangla',
          duration: '10 Hours',
          level: 'Beginner',
          isFeatured: false,
          isBestSeller: false,
          isNew: true,
          createdAt: new Date(),
          updatedAt: new Date()
        } as Course;

        return {
          course: foundCourse,
          date: p.purchaseDate,
          method: p.paymentMethod
        };
      });
      setPendingCourses(matchedPending);

    } catch (err) {
      console.error('Error fetching academic classroom data:', err);
      onShowNotification('Failed to sync purchased programs catalog.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadClassroomData();

    const handleUpdate = () => {
      loadClassroomData(true);
    };

    window.addEventListener('nexus_purchases_updated', handleUpdate);

    // Real-time Firestore onSnapshot listeners for instant sync of enrollments and courses
    let unsubPurchases: (() => void) | null = null;
    let unsubPurchasesEmail: (() => void) | null = null;
    let unsubMyCourses: (() => void) | null = null;
    let unsubMyCoursesEmail: (() => void) | null = null;

    try {
      const cleanEmail = userEmail ? userEmail.trim().toLowerCase() : '';

      if (userId) {
        const qPurchases = query(collection(db, 'purchases'), where('userId', '==', userId));
        unsubPurchases = onSnapshot(qPurchases, () => {
          loadClassroomData(true);
        }, (err) => console.warn('MyCourses purchases listener warning:', err));

        const qMyCourses = query(collection(db, 'myCourses'), where('userId', '==', userId));
        unsubMyCourses = onSnapshot(qMyCourses, () => {
          loadClassroomData(true);
        }, (err) => console.warn('MyCourses myCourses listener warning:', err));
      }

      if (cleanEmail && cleanEmail !== userId) {
        const qPurchasesEmail = query(collection(db, 'purchases'), where('userEmail', '==', cleanEmail));
        unsubPurchasesEmail = onSnapshot(qPurchasesEmail, () => {
          loadClassroomData(true);
        }, (err) => console.warn('MyCourses purchases email listener warning:', err));

        const qMyCoursesEmail = query(collection(db, 'myCourses'), where('userEmail', '==', cleanEmail));
        unsubMyCoursesEmail = onSnapshot(qMyCoursesEmail, () => {
          loadClassroomData(true);
        }, (err) => console.warn('MyCourses myCourses email listener warning:', err));
      }
    } catch (err) {
      console.warn('Real-time listener setup notice in MyCoursesView:', err);
    }

    return () => {
      window.removeEventListener('nexus_purchases_updated', handleUpdate);
      if (unsubPurchases) unsubPurchases();
      if (unsubPurchasesEmail) unsubPurchasesEmail();
      if (unsubMyCourses) unsubMyCourses();
      if (unsubMyCoursesEmail) unsubMyCoursesEmail();
    };
  }, [userId, userEmail]);

  // Pull to refresh simulation
  const handlePullToRefresh = () => {
    loadClassroomData(true);
    onShowNotification('Refreshed student ledger & classroom!', 'success');
  };

  // Helper to get custom progress for a course
  const getCourseProgressPercentage = (courseId: string) => {
    const found = courseRelations.find(r => r.courseId === courseId);
    return found ? found.totalProgress : 0;
  };

  // Helper to format date
  const formatEnrollDate = (dateStr: string) => {
    if (!dateStr) return 'Recently';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Recently';
    }
  };

  // Helper to get last watch or opened info
  const getLastWatchedInfo = (courseId: string) => {
    const found = courseRelations.find(r => r.courseId === courseId);
    if (!found || !found.lastOpenedDate) return 'Not started yet';
    try {
      const d = new Date(found.lastOpenedDate);
      const relativeTime = d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      return `Opened on ${relativeTime}`;
    } catch {
      return 'In Progress';
    }
  };

  // ================= RENDER SKELETON LOADERS =================
  if (loading) {
    return (
      <EliteLoading 
        label="SYNCHRONIZING MY CLASSROOM" 
        subLabel="FETCHING ENROLLED COURSES & PROGRESS..." 
      />
    );
  }

  // ================= RENDER EMPTY STATE =================
  if (purchasedCourses.length === 0 && pendingCourses.length === 0) {
    return (
      <div className="flex-1 flex flex-col justify-between py-1 px-1 text-slate-100 max-w-lg mx-auto w-full">
        
        <div className="flex-1 flex flex-col items-center justify-center py-16 text-center space-y-6">
          <div className="relative">
            {/* Elegant futuristic pulsing circles */}
            <div className="absolute inset-0 bg-[#39FF14]/5 rounded-full blur-2xl shimmer-effect" />
            <div className="w-20 h-20 bg-slate-900 border border-white/5 rounded-3xl flex items-center justify-center shadow-xl">
              <Inbox size={32} className="text-slate-500 animate-bounce" />
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-[9px] font-mono font-bold tracking-widest text-slate-500 uppercase bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
              Classroom Empty
            </span>
            <h2 className="text-sm font-sans font-bold text-white">No Programs Enrolled Yet</h2>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              You have not enrolled in any premium courses yet. Browse our course catalog to start learning!
            </p>
          </div>

          <button
            onClick={onBrowseCourses}
            className="px-6 py-3 bg-[#39FF14] hover:bg-[#32e011] text-black font-bold uppercase tracking-wider text-xs rounded-xl transition-all flex items-center justify-center space-x-2 shadow-lg shadow-[#39FF14]/15 cursor-pointer"
          >
            <BookOpen size={13} />
            <span>Browse Academic Catalog</span>
          </button>
        </div>

        <footer className="mt-4 pt-3 border-t border-white/5 text-center font-mono text-[9px] text-slate-500 tracking-wider">
          NEXUS DISCOVERY ENGINE • NO PURCHASE FOUND
        </footer>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-between py-1 px-1 text-slate-100 max-w-lg mx-auto w-full">
      
      {/* Title Header with Pull-to-Refresh option */}
      <div className="flex items-center justify-between pl-1 pb-3 border-b border-white/5 mb-4">
        <div>
          <span className="text-[8px] font-mono text-slate-400 uppercase tracking-widest block">STUDENT CLASSROOM</span>
          <h2 className="text-sm font-sans font-bold text-white tracking-tight flex items-center">
            <GraduationCap size={16} className="text-[#39FF14] mr-1.5" />
            <span>My Active Courses ({purchasedCourses.length})</span>
          </h2>
        </div>

        <button
          onClick={handlePullToRefresh}
          className={`p-2 rounded-xl border border-white/10 hover:border-white/20 bg-white/[0.02] text-slate-400 hover:text-white transition-all cursor-pointer ${refreshing ? 'animate-spin text-[#39FF14]' : ''}`}
          title="Refresh classroom logs"
        >
          <RefreshCw size={13} />
        </button>
      </div>

      {/* Classroom list container */}
      <main className="flex-1 space-y-4 overflow-y-auto pr-0.5">

        {/* PENDING APPROVAL SECTION */}
        {pendingCourses.length > 0 && (
          <div className="space-y-2 mb-4">
            <div className="flex items-center space-x-1.5 text-amber-400 font-mono text-[10px] font-bold uppercase">
              <Clock size={12} className="animate-spin" />
              <span>Pending Admin Approval ({pendingCourses.length})</span>
            </div>

            {pendingCourses.map(({ course, date, method }) => (
              <div 
                key={course.courseId}
                className="bg-slate-950 border border-amber-500/40 rounded-2xl p-3.5 space-y-2 text-xs font-mono relative overflow-hidden"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[8px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded uppercase">
                      AWAITING ADMIN APPROVAL
                    </span>
                    <h4 className="text-xs font-bold text-white mt-1">{course.title}</h4>
                  </div>
                  <span className="text-[10px] text-slate-400">{method}</span>
                </div>
                <p className="text-[10px] text-slate-400 font-sans leading-relaxed">
                  🔒 Payment submitted on {new Date(date).toLocaleDateString()}. Admin approval is required before course content & lessons unlock.
                </p>
              </div>
            ))}
          </div>
        )}
        
        {purchasedCourses.map((course) => {
          const progressPct = getCourseProgressPercentage(course.courseId);
          const isFinished = progressPct === 100;
          const relation = courseRelations.find(r => r.courseId === course.courseId);
          const enrollDate = relation ? relation.enrollmentDate : '';
          const lastWatched = getLastWatchedInfo(course.courseId);

          return (
            <motion.div
              key={course.courseId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ 
                scale: [1, 1.018, 1.008, 1.018],
                y: -3,
                transition: {
                  scale: {
                    duration: 2.2,
                    repeat: Infinity,
                    repeatType: 'mirror',
                    ease: 'easeInOut'
                  },
                  y: { duration: 0.2, ease: 'easeOut' }
                }
              }}
              onClick={() => onOpenCourse(course)}
              className="glass-panel-light hover-lift hover:border-[#39FF14]/30 rounded-3xl p-4.5 flex flex-col justify-between space-y-4 transition-all duration-300 relative overflow-hidden group cursor-pointer"
            >
              {/* Backing gradient hover highlights */}
              <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#39FF14]/5 to-transparent rounded-r-3xl pointer-events-none transition-opacity duration-300 opacity-0 group-hover:opacity-100" />
              
              <div className="flex items-start space-x-4">
                {/* Thumbnail */}
                <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-white/10 relative">
                  <img 
                    src={course.thumbnail?.trim() || undefined} 
                    alt={course.title} 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer"
                  />
                  {isFinished && (
                    <div className="absolute inset-0 bg-emerald-950/80 flex items-center justify-center">
                      <Award size={18} className="text-amber-400" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-[8px] font-mono text-[#39FF14] bg-[#39FF14]/10 border border-[#39FF14]/20 px-2 py-0.5 rounded uppercase font-bold tracking-wider">
                      {course.category}
                    </span>
                    {isFinished ? (
                      <span className="text-[8px] font-mono text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded uppercase font-bold flex items-center space-x-0.5">
                        <Check size={9} />
                        <span>GRADUATE</span>
                      </span>
                    ) : (
                      <span className="text-[8px] font-mono text-slate-400 bg-white/5 border border-white/5 px-2 py-0.5 rounded uppercase tracking-wider">
                        ACTIVE STUDY
                      </span>
                    )}
                  </div>

                  <h3 className="text-xs font-sans font-bold text-white tracking-tight mt-1.5 leading-snug truncate group-hover:text-[#39FF14] transition-colors">
                    {course.title}
                  </h3>
                  
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Mentor: <strong className="text-white">{course.instructor}</strong>
                  </p>
                </div>
              </div>

              {/* Progress Bar & Calculations */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[9px] font-mono text-slate-400">
                  <span>Progress Percentage:</span>
                  <span className={isFinished ? "text-amber-400 font-bold" : "text-[#39FF14] font-bold"}>
                    {progressPct}% Completed
                  </span>
                </div>

                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5 relative">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className={`h-full rounded-full ${
                      isFinished 
                        ? 'bg-gradient-to-r from-amber-500 to-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                        : 'bg-gradient-to-r from-emerald-500 to-[#39FF14] shadow-[0_0_8px_rgba(57,255,20,0.5)]'
                    }`}
                  />
                </div>
              </div>

              {/* Course Ledger details & continue button */}
              <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[9px] font-mono text-slate-500">
                <div className="space-y-1">
                  <div>
                    📅 Enrollment: <strong className="text-slate-300">{formatEnrollDate(enrollDate)}</strong>
                  </div>
                  <div>
                    🕒 Last Watched: <strong className="text-slate-300">{lastWatched}</strong>
                  </div>
                </div>

                <button
                  onClick={() => onOpenCourse(course)}
                  className="px-4 py-2 bg-[#39FF14]/15 hover:bg-[#39FF14] border border-[#39FF14]/20 hover:border-transparent text-[#39FF14] hover:text-black rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center space-x-1"
                >
                  <span>Continue Learning</span>
                  <ChevronRight size={11} />
                </button>
              </div>

              <button
                onClick={() => {
                  setSelectedCourseForRefund(course);
                  setIsRefundModalOpen(true);
                }}
                className="text-rose-500 hover:text-rose-400 text-[9px] font-bold uppercase tracking-widest mt-1 block w-full text-center"
              >
                Request Refund (রিফান্ড আবেদন)
              </button>

            </motion.div>
          );
        })}

        {selectedCourseForRefund && (
          <RefundRequestModal
            isOpen={isRefundModalOpen}
            onClose={() => {
              setIsRefundModalOpen(false);
              setSelectedCourseForRefund(null);
            }}
            courseId={selectedCourseForRefund.courseId}
            courseTitle={selectedCourseForRefund.title}
            amount={selectedCourseForRefund.price}
            onShowNotification={onShowNotification}
          />
        )}

      </main>

      <footer className="mt-4 pt-3 border-t border-white/5 text-center font-mono text-[9px] text-slate-500 tracking-wider uppercase">
        NEXUS ACADEMIC LEDGER MANAGER ACTIVE
      </footer>
    </div>
  );
}
