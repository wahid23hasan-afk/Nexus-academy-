import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  X, 
  Bell, 
  GraduationCap, 
  Star, 
  Users, 
  Share2, 
  Heart, 
  ChevronLeft, 
  ChevronRight, 
  SlidersHorizontal, 
  Check, 
  RotateCw, 
  BookOpen, 
  Sparkles, 
  Clock, 
  Award, 
  Flame, 
  ArrowUpDown,
  Compass,
  CheckCircle2,
  ExternalLink,
  Tv,
  MessageSquare,
  Trophy,
  User,
  ShieldCheck,
  Brain,
  Code2,
  Radio,
  Layers,
  FileCode
} from 'lucide-react';
import { Course, Banner } from '../types/course';
import { courseService } from '../services/courseService';
import { progressService } from '../services/progressService';
import { auth } from '../services/firebase';

const CourseDetailsView = React.lazy(() => import('./CourseDetailsView').then(m => ({ default: m.CourseDetailsView })));
const EnrollmentConfirmationView = React.lazy(() => import('./EnrollmentConfirmationView').then(m => ({ default: m.EnrollmentConfirmationView })));
const PaymentView = React.lazy(() => import('./PaymentView').then(m => ({ default: m.PaymentView })));
const MyCoursesView = React.lazy(() => import('./MyCoursesView').then(m => ({ default: m.MyCoursesView })));
const LearningDashboardView = React.lazy(() => import('./LearningDashboardView').then(m => ({ default: m.LearningDashboardView })));
const MyCertificatesView = React.lazy(() => import('./MyCertificatesView').then(m => ({ default: m.MyCertificatesView })));
const NotificationCenter = React.lazy(() => import('./NotificationCenter').then(m => ({ default: m.NotificationCenter })));
const AnnouncementBanner = React.lazy(() => import('./AnnouncementBanner').then(m => ({ default: m.AnnouncementBanner })));
const LiveClassesView = React.lazy(() => import('./LiveClassesView').then(m => ({ default: m.LiveClassesView })));
const CommunityView = React.lazy(() => import('./CommunityView').then(m => ({ default: m.CommunityView })));
const FlashcardsView = React.lazy(() => import('./FlashcardsView').then(m => ({ default: m.FlashcardsView })));
const StudyGroupView = React.lazy(() => import('./StudyGroupView').then(m => ({ default: m.StudyGroupView })));
const CodeSandboxView = React.lazy(() => import('./CodeSandboxView').then(m => ({ default: m.CodeSandboxView })));
const CourseReviewsModal = React.lazy(() => import('./CourseReviewsModal').then(m => ({ default: m.CourseReviewsModal })));
import { AiChatView } from './AiChatView';
const ProfileView = React.lazy(() => import('./ProfileView').then(m => ({ default: m.ProfileView })));
const GamificationSummary = React.lazy(() => import('./GamificationDashboard').then(m => ({ default: m.GamificationSummary })));
const RewardsView = React.lazy(() => import('./RewardsView').then(m => ({ default: m.RewardsView })));
const AccountDetailsView = React.lazy(() => import('./AccountDetailsView').then(m => ({ default: m.AccountDetailsView })));
const PrivacySecurityView = React.lazy(() => import('./PrivacySecurityView').then(m => ({ default: m.PrivacySecurityView })));
const HelpSupportView = React.lazy(() => import('./HelpSupportView').then(m => ({ default: m.HelpSupportView })));
const AdminPanelModal = React.lazy(() => import('./AdminPanelModal').then(m => ({ default: m.AdminPanelModal })));

import { notificationService } from '../services/notificationService';
import { Notification as DBNotification } from '../types/notification';
import { AiAssistantFAB } from './AiAssistantFAB';
import { gamificationService } from '../services/gamificationService';

interface CourseDiscoveryViewProps {
  userProfile: { fullName: string; username: string; photoURL?: string } | null;
  onLogout: () => void;
  onShowNotification: (message: string, type: 'success' | 'error') => void;
}

const CATEGORIES = [
  'All',
  'SSC',
  'HSC',
  'Admission',
  'Programming',
  'IELTS',
  'Freelancing',
  'Graphic Design',
  'Web Development',
  'Digital Marketing',
  'UI/UX Design',
  'Data Science'
];

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  unread: boolean;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: '🚀 BUET Admission Prep Live!',
    message: 'Engineering physics intensive session starts tomorrow at 4:00 PM.',
    time: '2 hours ago',
    unread: true
  },
  {
    id: 'notif-2',
    title: '🔥 Eid Special 50% Discount',
    message: 'Unlock any Web Development or Programming course at half price. Use code NEXUS50.',
    time: '5 hours ago',
    unread: true
  },
  {
    id: 'notif-3',
    title: '✍️ IELTS Writing Assessment Feedback',
    message: 'Your mock essay has been graded by Ms. Sarah. Check your inbox for reports.',
    time: '1 day ago',
    unread: false
  }
];

export function CourseDiscoveryView({ userProfile, onLogout, onShowNotification }: CourseDiscoveryViewProps) {
  // Database States
  const [courses, setCourses] = useState<Course[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Search States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showRecent, setShowRecent] = useState<boolean>(false);
  
  // Carousel States
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const slideTimer = useRef<NodeJS.Timeout | null>(null);

  // Filter & Sort States
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState<boolean>(false);
  const [tempCategory, setTempCategory] = useState<string>('All');
  const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'premium'>('all');
  const [badgeFilter, setBadgeFilter] = useState<'all' | 'bestseller' | 'new' | 'highest_rated'>('all');
  const [sortBy, setSortBy] = useState<'popular' | 'newest' | 'rated' | 'priceAsc' | 'priceDesc'>('popular');

  // Interactive Wishlist & Enrollment local sync
  const [wishlistedIds, setWishlistedIds] = useState<string[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<string[]>([]);
  const [pendingPurchaseCourseIds, setPendingPurchaseCourseIds] = useState<string[]>([]);
  const [selectedEnrollCourse, setSelectedEnrollCourse] = useState<Course | null>(null);
  const [selectedDetailsCourse, setSelectedDetailsCourse] = useState<Course | null>(null);
  
  // Tab Navigation & Active Learning states
  const [activeTab, setActiveTab] = useState<'discover' | 'my-courses' | 'certificates' | 'live-classes' | 'community' | 'flashcards' | 'study-group' | 'sandbox' | 'profile' | 'account-details' | 'privacy-security' | 'help-support'>('discover');
  const [activeLearningCourse, setActiveLearningCourse] = useState<Course | null>(null);
  
  // Payment Module states
  const [paymentCourse, setPaymentCourse] = useState<Course | null>(null);
  const [paymentPrice, setPaymentPrice] = useState<number>(0);
  const [paymentDiscount, setPaymentDiscount] = useState<number>(0);
  const [paymentCoupon, setPaymentCoupon] = useState<string>('');

  // Notification states
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [dbNotifications, setDbNotifications] = useState<DBNotification[]>([]);

  // Pagination/Infinite Scroll State
  const [visibleCount, setVisibleCount] = useState<number>(4);

  // AI Assistant State
  const [isAiChatOpen, setIsAiChatOpen] = useState<boolean>(false);
  
  // Rewards View State
  const [isRewardsOpen, setIsRewardsOpen] = useState<boolean>(false);

  // Admin Control Panel Modal State
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);

  // Search input element reference
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Dynamic Greeting based on Local Time
  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Good Morning 🌅';
    if (hours < 18) return 'Good Afternoon ☀️';
    return 'Good Evening 🌌';
  };

  // Load Recent Searches, Wishlist & Enrollments on mount
  useEffect(() => {
    const recents = localStorage.getItem('nexus_recent_searches');
    if (recents) {
      setRecentSearches(JSON.parse(recents));
    }
    const wishlists = localStorage.getItem('nexus_wishlist');
    if (wishlists) {
      setWishlistedIds(JSON.parse(wishlists));
    }
    const enrollments = localStorage.getItem('nexus_enrollments');
    if (enrollments) {
      setEnrolledIds(JSON.parse(enrollments));
    }

    // Run primary Firestore seed & load routines
    initializeData();
  }, []);

  // Sync enrolled courses from Firestore when auth state or userProfile changes
  useEffect(() => {
    const syncEnrollments = async () => {
      if (!auth.currentUser) return;
      const uId = auth.currentUser.uid;
      const uEmail = auth.currentUser.email || userProfile?.username || '';
      
      try {
        // Update Gamification Activity
        gamificationService.updateActivity(uId).then(res => {
          if (res.streakIncreased) {
            onShowNotification(`Streak increased to ${res.newStreak} days! 🔥`, 'success');
          }
        });

        const [relations, userPurchases] = await Promise.all([
          progressService.getUserMyCourses(uId, uEmail),
          courseService.getUserPurchases(uId, uEmail)
        ]);

        const approvedPurchaseIds = userPurchases
          .filter(p => p.status === 'approved' || p.status === 'success' || p.status === 'active')
          .map(p => p.courseId);

        const pendingPurchaseIds = userPurchases
          .filter(p => p.status === 'pending')
          .map(p => p.courseId);

        setPendingPurchaseCourseIds(pendingPurchaseIds);

        const progressIds = (relations || []).map(r => r.courseId);
        const combinedApproved = Array.from(new Set([...approvedPurchaseIds, ...progressIds]));

        setEnrolledIds(combinedApproved);
        localStorage.setItem('nexus_enrollments', JSON.stringify(combinedApproved));
      } catch (err) {
        console.warn('Silent enrollment sync failed:', err);
      }
    };
    syncEnrollments();
  }, [userProfile]);

  // Listen to dynamic notifications from Firestore in real-time
  useEffect(() => {
    const uId = auth.currentUser?.uid;
    if (!uId) {
      setDbNotifications([]);
      return;
    }

    const uEmail = auth.currentUser?.email || undefined;
    const unsubscribe = notificationService.listenToNotifications(uId, (list) => {
      setDbNotifications(list);
    }, uEmail);

    return () => unsubscribe();
  }, [userProfile]);

  // Fetch from Firestore database
  const initializeData = async (isRefreshed = false) => {
    if (isRefreshed) setRefreshing(true);
    else setLoading(true);

    try {
      // 1. Trigger automated Firestore schema checks and seeding
      await courseService.seedDatabaseIfEmpty();

      // 2. Fetch banners
      const fetchedBanners = await courseService.getBanners();
      setBanners(fetchedBanners);

      // 3. Fetch courses based on current filters and sorting parameters
      await loadCourses();
    } catch (err) {
      console.error('Failed to load courses data from Firebase:', err);
      onShowNotification('Failed to sync academic catalogs.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load courses based on active filters and sorting
  const loadCourses = async () => {
    const filters = {
      category: selectedCategory,
      priceType: priceFilter,
      isBestSeller: badgeFilter === 'bestseller',
      isNew: badgeFilter === 'new',
      rating: badgeFilter === 'highest_rated' ? 4.8 : undefined,
      searchQuery: searchQuery
    };
    const fetchedCourses = await courseService.getCourses(filters, sortBy);
    setCourses(fetchedCourses);
    setVisibleCount(4); // Reset visible count on filter/sort change
  };

  // Listen to filter, sorting, and real-time search query changes with debounce
  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        loadCourses();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [selectedCategory, priceFilter, badgeFilter, sortBy, searchQuery]);

  // Infinite sliding auto loop
  useEffect(() => {
    if (banners.length === 0) return;

    // Reset old timer
    if (slideTimer.current) clearInterval(slideTimer.current);

    slideTimer.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 5500);

    return () => {
      if (slideTimer.current) clearInterval(slideTimer.current);
    };
  }, [banners, currentSlide]);

  // Execute Search
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Push into recent searches
    const cleanSearch = searchQuery.trim();
    const updatedRecents = [cleanSearch, ...recentSearches.filter(s => s !== cleanSearch)].slice(0, 5);
    setRecentSearches(updatedRecents);
    localStorage.setItem('nexus_recent_searches', JSON.stringify(updatedRecents));
    setShowRecent(false);

    loadCourses();
  };

  // Click search suggestion
  const handleSuggestionClick = (term: string) => {
    setSearchQuery(term);
    const updatedRecents = [term, ...recentSearches.filter(s => s !== term)].slice(0, 5);
    setRecentSearches(updatedRecents);
    localStorage.setItem('nexus_recent_searches', JSON.stringify(updatedRecents));
    setShowRecent(false);

    // Filter instantly
    const filters = {
      category: selectedCategory,
      priceType: priceFilter,
      isBestSeller: badgeFilter === 'bestseller',
      isNew: badgeFilter === 'new',
      rating: badgeFilter === 'highest_rated' ? 4.8 : undefined,
      searchQuery: term
    };
    courseService.getCourses(filters, sortBy).then(results => {
      setCourses(results);
      setVisibleCount(4);
    });
  };

  // Clear search query
  const handleClearSearch = () => {
    setSearchQuery('');
    loadCourses();
  };

  // Manual slide swipe controls
  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % banners.length);
  };

  // Toggle wishlist state
  const handleToggleWishlist = (courseId: string, title: string) => {
    let updated;
    if (wishlistedIds.includes(courseId)) {
      updated = wishlistedIds.filter(id => id !== courseId);
      onShowNotification(`Removed ${title.substring(0, 20)}... from wishlist`, 'success');
    } else {
      updated = [...wishlistedIds, courseId];
      onShowNotification(`Added ${title.substring(0, 20)}... to wishlist!`, 'success');
    }
    setWishlistedIds(updated);
    localStorage.setItem('nexus_wishlist', JSON.stringify(updated));
  };

  // Open high-fidelity enrollment modal or launch course player
  const handleEnrollClick = (course: Course) => {
    if (enrolledIds.includes(course.courseId)) {
      setActiveLearningCourse(course);
      onShowNotification(`Launching Course Workspace for "${course.title.substring(0, 20)}..."`, 'success');
      return;
    }

    if (pendingPurchaseCourseIds.includes(course.courseId)) {
      onShowNotification(`Your payment request for "${course.title}" is pending Admin approval. Please wait for Admin to approve.`, 'error');
      return;
    }

    setSelectedEnrollCourse(course);
  };

  // Finalize mock enrollment
  const handleConfirmEnrollment = () => {
    if (!selectedEnrollCourse) return;
    const updated = [...enrolledIds, selectedEnrollCourse.courseId];
    setEnrolledIds(updated);
    localStorage.setItem('nexus_enrollments', JSON.stringify(updated));
    onShowNotification(`Successfully enrolled in ${selectedEnrollCourse.title}! Welcome aboard.`, 'success');
    setSelectedEnrollCourse(null);
  };

  // Mock Share course
  const handleShareCourse = (course: Course) => {
    const mockLink = `https://nexus-academy.edu/courses/${course.courseId}`;
    navigator.clipboard.writeText(mockLink);
    onShowNotification(`Copied sharing link for ${course.instructor}'s class!`, 'success');
  };

  // Handle banner spotlight click
  const handleBannerClick = (banner: Banner) => {
    if (banner.courseId) {
      const found = courses.find(c => c.courseId === banner.courseId);
      if (found) {
        setSelectedDetailsCourse(found);
      } else {
        courseService.getCourses().then(allCourses => {
          const courseFromAll = allCourses.find(c => c.courseId === banner.courseId);
          if (courseFromAll) setSelectedDetailsCourse(courseFromAll);
        });
      }
    }
  };

  // Select a course by its ID (used for notification deep-linking)
  const handleSelectCourseById = (courseId: string) => {
    const found = courses.find(c => c.courseId === courseId);
    if (found) {
      setSelectedDetailsCourse(found);
    } else {
      courseService.getCourses().then(allCourses => {
        const courseFromAll = allCourses.find(c => c.courseId === courseId);
        if (courseFromAll) setSelectedDetailsCourse(courseFromAll);
      });
    }
  };

  // Clear search history
  const handleClearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('nexus_recent_searches');
    onShowNotification('Recent searches cleared.', 'success');
  };

  // Category filter trigger from horizontal chips
  const handleCategoryChipSelect = (category: string) => {
    setSelectedCategory(category);
    setTempCategory(category);
  };

  // Apply deep filters from Slidedown Panel
  const handleApplyFilters = () => {
    setSelectedCategory(tempCategory);
    setIsFilterPanelOpen(false);
    onShowNotification('Filters applied successfully', 'success');
  };

  // Reset all filters
  const handleResetFilters = () => {
    setTempCategory('All');
    setSelectedCategory('All');
    setPriceFilter('all');
    setBadgeFilter('all');
    setSortBy('popular');
    setIsFilterPanelOpen(false);
    onShowNotification('Filters reset to default', 'success');
  };

  // Unread notification counter
  const unreadCount = dbNotifications.filter(n => n.unread).length;

  if (paymentCourse) {
    return (
      <PaymentView
        course={paymentCourse}
        finalPrice={paymentPrice}
        discount={paymentDiscount}
        couponCode={paymentCoupon}
        userProfile={userProfile}
        onBack={() => setPaymentCourse(null)}
        onShowNotification={onShowNotification}
        onEnrollSuccess={() => {
          const updated = [...enrolledIds, paymentCourse.courseId];
          setEnrolledIds(updated);
          localStorage.setItem('nexus_enrollments', JSON.stringify(updated));
          setPaymentCourse(null);
          setSelectedEnrollCourse(null);
          setSelectedDetailsCourse(null);
        }}
      />
    );
  }

  if (selectedEnrollCourse) {
    return (
      <EnrollmentConfirmationView
        course={selectedEnrollCourse}
        userProfile={userProfile}
        onBack={() => setSelectedEnrollCourse(null)}
        onShowNotification={onShowNotification}
        onEnrollSuccess={() => {
          const updated = [...enrolledIds, selectedEnrollCourse.courseId];
          setEnrolledIds(updated);
          localStorage.setItem('nexus_enrollments', JSON.stringify(updated));
          setSelectedEnrollCourse(null);
          setSelectedDetailsCourse(null);
          onShowNotification(`Successfully enrolled in ${selectedEnrollCourse.title}! Welcome aboard.`, 'success');
        }}
        onContinueToPayment={(finalPrice, discount, couponCode) => {
          setPaymentCourse(selectedEnrollCourse);
          setPaymentPrice(finalPrice);
          setPaymentDiscount(discount);
          setPaymentCoupon(couponCode);
        }}
      />
    );
  }

  if (selectedDetailsCourse) {
    const isWishlisted = wishlistedIds.includes(selectedDetailsCourse.courseId);
    const isEnrolled = enrolledIds.includes(selectedDetailsCourse.courseId);
    
    return (
      <CourseDetailsView
        course={selectedDetailsCourse}
        userProfile={userProfile}
        onBack={() => setSelectedDetailsCourse(null)}
        onShowNotification={onShowNotification}
        isWishlisted={isWishlisted}
        onToggleWishlist={() => handleToggleWishlist(selectedDetailsCourse.courseId, selectedDetailsCourse.title)}
        isEnrolled={isEnrolled}
        isPending={pendingPurchaseCourseIds.includes(selectedDetailsCourse.courseId)}
        onEnroll={() => handleEnrollClick(selectedDetailsCourse)}
        onSelectCourse={(c) => setSelectedDetailsCourse(c)}
      />
    );
  }

  if (activeLearningCourse) {
    return (
      <LearningDashboardView
        course={activeLearningCourse}
        userProfile={userProfile}
        onBack={() => setActiveLearningCourse(null)}
        onShowNotification={onShowNotification}
        purchasedCourseIds={enrolledIds}
        onTriggerPurchase={(c) => {
          setActiveLearningCourse(null);
          handleEnrollClick(c);
        }}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-between py-1 px-1 text-slate-100 max-w-lg mx-auto w-full relative">
      
      {/* ================= HEADER ================= */}
      <header className="flex items-center justify-between py-3 px-1 border-b border-white/5 backdrop-blur-md sticky top-0 z-40 bg-[#0a0f1d]/90">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-[#39FF14]/30 overflow-hidden flex items-center justify-center shadow-[0_0_12px_rgba(57,255,20,0.15)]">
            {userProfile?.photoURL ? (
              <img 
                src={userProfile.photoURL || undefined} 
                alt="Profile Avatar" 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <GraduationCap size={20} className="text-[#39FF14] drop-shadow-[0_0_4px_rgba(57,255,20,0.4)]" />
            )}
          </div>
          <div>
            <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">{getGreeting()}</p>
            <h1 className="text-sm font-sans font-semibold text-white tracking-tight flex items-center space-x-1">
              <span>{userProfile?.fullName || 'Distinguished Scholar'}</span>
              <span className="text-xs">👋</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Rewards Button */}
          <button 
            onClick={() => setIsRewardsOpen(true)}
            className="p-2 rounded-xl border bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20 transition-all duration-300 relative cursor-pointer"
            title="Rewards & Gamification"
          >
            <Trophy size={16} />
          </button>

          {/* Notification Button */}
          <button 
            onClick={() => setShowNotifications(true)}
            className={`p-2 rounded-xl border transition-all duration-300 relative cursor-pointer ${
              showNotifications 
                ? 'bg-[#39FF14]/10 border-[#39FF14]/40 text-[#39FF14]' 
                : 'bg-white/[0.02] border-white/10 text-slate-300 hover:bg-white/[0.05]'
            }`}
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[8px] font-mono font-bold text-white shadow-lg animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Quick Logout shortcut */}
          <button 
            onClick={onLogout}
            className="p-2 bg-red-950/10 border border-red-500/10 text-red-400 hover:text-red-300 rounded-xl hover:bg-red-950/20 transition-all cursor-pointer text-xs font-mono font-bold uppercase tracking-wider flex items-center space-x-1"
            title="Log Out Session"
          >
            <span>OUT</span>
          </button>
        </div>
      </header>

      {/* Premium Announcement Auto-scrolling banner */}
      <React.Suspense fallback={<div className="p-4 text-center text-xs font-mono text-emerald-400/50 animate-pulse">Initializing components...</div>}>
      <AnnouncementBanner />

      {/* Quick Study Hub Navigation Bar */}
      <div className="my-2 p-1.5 glass-panel rounded-2xl flex items-center space-x-1.5 overflow-x-auto no-scrollbar border border-white/10 bg-slate-900/60">
        <button
          onClick={() => setActiveTab('discover')}
          className={`px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider whitespace-nowrap flex items-center space-x-1.5 transition-all cursor-pointer ${
            activeTab === 'discover' ? 'bg-[#39FF14] text-black shadow-md shadow-[#39FF14]/20' : 'text-slate-400 hover:text-white bg-white/5'
          }`}
        >
          <Compass size={12} />
          <span>Catalog</span>
        </button>

        <button
          onClick={() => setActiveTab('flashcards')}
          className={`px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider whitespace-nowrap flex items-center space-x-1.5 transition-all cursor-pointer ${
            activeTab === 'flashcards' ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20' : 'text-slate-400 hover:text-white bg-white/5'
          }`}
        >
          <Brain size={12} />
          <span>Flashcards</span>
        </button>

        <button
          onClick={() => setActiveTab('study-group')}
          className={`px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider whitespace-nowrap flex items-center space-x-1.5 transition-all cursor-pointer ${
            activeTab === 'study-group' ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20' : 'text-slate-400 hover:text-white bg-white/5'
          }`}
        >
          <Users size={12} />
          <span>Study Room</span>
        </button>

        <button
          onClick={() => setActiveTab('sandbox')}
          className={`px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider whitespace-nowrap flex items-center space-x-1.5 transition-all cursor-pointer ${
            activeTab === 'sandbox' ? 'bg-purple-500 text-black shadow-md shadow-purple-500/20' : 'text-slate-400 hover:text-white bg-white/5'
          }`}
        >
          <Code2 size={12} />
          <span>Sandbox</span>
        </button>
      </div>

      {activeTab === 'my-courses' ? (
        <MyCoursesView
          userProfile={userProfile}
          onOpenCourse={(course) => setActiveLearningCourse(course)}
          onBrowseCourses={() => setActiveTab('discover')}
          onShowNotification={onShowNotification}
        />
      ) : activeTab === 'certificates' ? (
        <MyCertificatesView
          userProfile={userProfile}
          onNavigateToDiscover={() => setActiveTab('discover')}
          onShowNotification={onShowNotification}
        />
      ) : activeTab === 'live-classes' ? (
        <LiveClassesView
          userProfile={userProfile}
          purchasedCourseIds={enrolledIds}
          onShowNotification={onShowNotification}
          onNavigateToDiscover={() => setActiveTab('discover')}
        />
      ) : activeTab === 'community' ? (
        <CommunityView
          userProfile={userProfile}
          onShowNotification={onShowNotification}
        />
      ) : activeTab === 'flashcards' ? (
        <FlashcardsView
          onShowNotification={onShowNotification}
        />
      ) : activeTab === 'study-group' ? (
        <StudyGroupView
          userProfile={userProfile}
          onShowNotification={onShowNotification}
        />
      ) : activeTab === 'sandbox' ? (
        <CodeSandboxView
          onShowNotification={onShowNotification}
        />
      ) : activeTab === 'profile' ? (
        <ProfileView
          userProfile={userProfile}
          onLogout={onLogout}
          onShowNotification={onShowNotification}
          onOpenRewards={() => setIsRewardsOpen(true)}
          onNavigate={(route: any) => setActiveTab(route)}
        />
      ) : activeTab === 'account-details' ? (
        <AccountDetailsView onBack={() => setActiveTab('profile')} userProfile={userProfile} />
      ) : activeTab === 'privacy-security' ? (
        <PrivacySecurityView onBack={() => setActiveTab('profile')} />
      ) : activeTab === 'help-support' ? (
        <HelpSupportView onBack={() => setActiveTab('profile')} />
      ) : (
        <>
          {/* ================= GAMIFICATION SUMMARY ================= */}
          

          {/* ================= SEARCH SYSTEM ================= */}
          <section className="my-4 px-1 relative">
        <form onSubmit={handleSearchSubmit} className="relative">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search by course, instructor, or tag..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowRecent(true);
            }}
            onFocus={() => setShowRecent(true)}
            className="w-full bg-white/[0.02] border border-white/10 hover:border-white/20 focus:border-[#39FF14]/40 focus:ring-1 focus:ring-[#39FF14]/20 rounded-xl py-3.5 pl-11 pr-12 text-xs text-white placeholder-slate-500 outline-none transition-all duration-300 shadow-inner"
          />
          <Search className="absolute left-4 top-3.5 text-slate-400" size={16} />
          
          <div className="absolute right-3.5 top-2.5 flex items-center space-x-1">
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
            
            {/* Slide Down Filter Trigger */}
            <button
              type="button"
              onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                isFilterPanelOpen 
                  ? 'bg-[#39FF14]/10 border-[#39FF14]/40 text-[#39FF14]' 
                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
              }`}
            >
              <SlidersHorizontal size={12} />
            </button>
          </div>
        </form>

        {/* Search Suggestions & Recent Searches Box */}
        <AnimatePresence>
          {showRecent && (
            <>
              {/* Backing dismiss overlay */}
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowRecent(false)} 
              />
              
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="absolute left-0 right-0 mt-1.5 bg-slate-950/95 border border-white/10 rounded-xl p-4 shadow-2xl backdrop-blur-xl z-20 space-y-4"
              >
                {/* Search suggestions */}
                <div>
                  <h4 className="text-[9px] font-mono font-bold tracking-wider text-slate-500 uppercase mb-2">
                    Popular Suggestions
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {['React', 'BUET Prep', 'Figma Design', 'SSC Physics', 'IELTS'].map((term) => (
                      <button
                        key={term}
                        type="button"
                        onClick={() => handleSuggestionClick(term)}
                        className="text-[10px] bg-white/5 hover:bg-[#39FF14]/10 border border-white/5 hover:border-[#39FF14]/25 text-slate-300 hover:text-[#39FF14] px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recent search items */}
                {recentSearches.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-[9px] font-mono font-bold tracking-wider text-slate-500 uppercase">
                        Recent Searches
                      </h4>
                      <button
                        type="button"
                        onClick={handleClearRecentSearches}
                        className="text-[9px] font-mono text-slate-400 hover:text-red-400 hover:underline cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="space-y-1">
                      {recentSearches.map((term, idx) => (
                        <div 
                          key={idx} 
                          className="flex items-center justify-between text-xs text-slate-300 py-1 hover:bg-white/5 rounded-lg px-2 transition-all"
                        >
                          <button
                            type="button"
                            onClick={() => handleSuggestionClick(term)}
                            className="text-left flex-1 font-sans cursor-pointer"
                          >
                            🕒 {term}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = recentSearches.filter(s => s !== term);
                              setRecentSearches(updated);
                              localStorage.setItem('nexus_recent_searches', JSON.stringify(updated));
                            }}
                            className="text-slate-500 hover:text-white cursor-pointer px-1"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </section>

      {/* ================= DEEP FILTER SLIDE PANEL ================= */}
      <AnimatePresence>
        {isFilterPanelOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-[#0c1325]/90 border border-white/10 rounded-2xl p-4 mb-4 backdrop-blur-md px-1 mx-1"
          >
            <div className="space-y-4">
              {/* Filter Section Header */}
              <div className="flex justify-between items-center pb-1.5 border-b border-white/5">
                <span className="text-xs font-mono font-bold text-[#39FF14] uppercase tracking-wider flex items-center">
                  <SlidersHorizontal size={12} className="mr-1.5" />
                  <span>FILTER ENGINE</span>
                </span>
                <button 
                  onClick={handleResetFilters}
                  className="text-[10px] font-mono text-red-400 hover:underline cursor-pointer uppercase"
                >
                  Reset All
                </button>
              </div>

              {/* Category selector inside filter */}
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-2">Category</label>
                <select
                  value={tempCategory}
                  onChange={(e) => setTempCategory(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 text-xs text-slate-200 rounded-lg p-2.5 outline-none focus:border-[#39FF14]/50"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Price filter select */}
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-2">Pricing Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'all', label: 'All Pricing' },
                    { id: 'free', label: 'Free' },
                    { id: 'premium', label: 'Premium' }
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPriceFilter(p.id as any)}
                      className={`text-[10px] font-medium py-2 rounded-lg border text-center cursor-pointer transition-all ${
                        priceFilter === p.id 
                          ? 'bg-[#39FF14]/10 border-[#39FF14]/30 text-[#39FF14]' 
                          : 'bg-white/[0.01] border-white/5 hover:bg-white/5 text-slate-300'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status/Badge filter */}
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-2">Quick Tags</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'all', label: 'No filter' },
                    { id: 'bestseller', label: 'Bestseller 🔥' },
                    { id: 'new', label: 'Recently Added ✨' },
                    { id: 'highest_rated', label: 'Top Rated ⭐' }
                  ].map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setBadgeFilter(b.id as any)}
                      className={`text-[10px] font-medium py-2 rounded-lg border text-center cursor-pointer transition-all ${
                        badgeFilter === b.id 
                          ? 'bg-[#39FF14]/10 border-[#39FF14]/30 text-[#39FF14]' 
                          : 'bg-white/[0.01] border-white/5 hover:bg-white/5 text-slate-300'
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit panel actions */}
              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={handleApplyFilters}
                  className="flex-1 py-2.5 bg-[#39FF14] hover:bg-[#32e011] text-black font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Apply Filters
                </button>
                <button
                  type="button"
                  onClick={() => setIsFilterPanelOpen(false)}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs transition-colors border border-white/10 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= IMAGE SLIDER CAROUSEL ================= */}
      <section className="my-2 px-1 relative">
        {loading ? (
          /* Slider Shimmer Placeholder */
          <div className="w-full h-44 rounded-2xl bg-white/[0.02] border border-white/5 shimmer-effect flex flex-col justify-end p-4 space-y-2">
            <div className="h-4 bg-slate-800 rounded w-1/3" />
            <div className="h-3 bg-slate-800 rounded w-2/3" />
          </div>
        ) : banners.length > 0 ? (
          <div className="relative w-full h-44 rounded-2xl overflow-hidden border border-white/10 group shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
            
            {/* Banner Slides */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.5 }}
                onClick={() => handleBannerClick(banners[currentSlide])}
                className="absolute inset-0 w-full h-full cursor-pointer"
              >
                {/* Background image */}
                <img 
                  src={banners[currentSlide].imageUrl || undefined} 
                  alt={banners[currentSlide].title} 
                  className="w-full h-full object-cover brightness-[0.4]"
                />

                {/* Accent neon glow line */}
                <div 
                  className="absolute bottom-0 left-0 right-0 h-1 transition-all"
                  style={{ backgroundColor: banners[currentSlide].accentColor || '#39FF14' }}
                />

                {/* Banner contents */}
                <div className="absolute inset-0 flex flex-col justify-end p-4 md:p-5 bg-gradient-to-t from-black via-black/40 to-transparent">
                  <span 
                    className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border mb-1 w-max"
                    style={{ 
                      borderColor: (banners[currentSlide].accentColor || '#39FF14') + '30',
                      backgroundColor: (banners[currentSlide].accentColor || '#39FF14') + '10',
                      color: banners[currentSlide].accentColor || '#39FF14' 
                    }}
                  >
                    NEXUS SPOTLIGHT
                  </span>
                  <h3 className="text-sm font-sans font-semibold text-white leading-snug tracking-tight">
                    {banners[currentSlide].title}
                  </h3>
                  <p className="text-[10px] text-slate-300 font-sans mt-1 leading-normal max-w-sm line-clamp-2">
                    {banners[currentSlide].subtitle}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Slider Dots */}
            <div className="absolute top-4 right-4 flex space-x-1.5 z-25 bg-black/40 px-2 py-1 rounded-full backdrop-blur-md border border-white/5">
              {banners.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`w-1.5 h-1.5 rounded-full transition-all cursor-pointer ${
                    idx === currentSlide 
                      ? 'bg-[#39FF14] scale-125' 
                      : 'bg-white/30'
                  }`}
                />
              ))}
            </div>

            {/* Manual Slide Controls on Hover */}
            <button
              onClick={handlePrevSlide}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-black/60 border border-white/10 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-sm"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={handleNextSlide}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-black/60 border border-white/10 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-sm"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        ) : null}
      </section>

      {/* ================= COURSE CATEGORIES CHIPS ================= */}
      <section className="my-3 relative px-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase flex items-center">
            <Compass size={11} className="text-[#39FF14] mr-1" />
            <span>Academic Niches</span>
          </span>
          <span className="text-[9px] font-mono text-slate-500">SWIPE HORIZONTALLY</span>
        </div>
        
        {/* Horizontal scroll container with premium chips */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-2 scrollbar-none snap-x touch-pan-x">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                id={`category-chip-${cat.toLowerCase().replace(/\s+/g, '-')}`}
                key={cat}
                onClick={() => handleCategoryChipSelect(cat)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap snap-center transition-all duration-300 border cursor-pointer ${
                  isActive
                    ? 'bg-[#39FF14]/10 border-[#39FF14] text-[#39FF14] shadow-[0_0_12px_rgba(57,255,20,0.15)]'
                    : 'bg-white/[0.02] border-white/5 hover:border-white/15 text-slate-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </section>

      {/* ================= FILTER & SORT SHORTCUTS ROW ================= */}
      <section className="my-1.5 px-1 flex justify-between items-center bg-white/[0.01] border border-white/5 rounded-xl p-2.5">
        <div className="flex items-center space-x-2">
          {/* Active sorting name tag */}
          <span className="text-[9px] font-mono font-bold text-slate-500 uppercase flex items-center">
            <ArrowUpDown size={10} className="mr-1" />
            <span>SORT:</span>
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-transparent text-slate-200 font-sans text-xs font-semibold outline-none cursor-pointer border-none"
          >
            <option value="popular" className="bg-[#0a0f1d] text-slate-200">Most Popular 🔥</option>
            <option value="newest" className="bg-[#0a0f1d] text-slate-200">Newest Added 🆕</option>
            <option value="rated" className="bg-[#0a0f1d] text-slate-200">Highest Rated ⭐</option>
            <option value="priceAsc" className="bg-[#0a0f1d] text-slate-200">Price: Low to High 📈</option>
            <option value="priceDesc" className="bg-[#0a0f1d] text-slate-200">Price: High to Low 📉</option>
          </select>
        </div>

        {/* Dynamic refresh & reset actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => initializeData(true)}
            disabled={refreshing}
            className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-[#39FF14]/30 text-slate-300 hover:text-[#39FF14] cursor-pointer transition-all flex items-center space-x-1"
            title="Refresh academic data"
          >
            <RotateCw size={11} className={`${refreshing ? 'animate-spin text-[#39FF14]' : ''}`} />
            <span className="text-[9px] font-mono">PULL</span>
          </button>
        </div>
      </section>

      {/* Active Search Query Filter Chip */}
      {searchQuery.trim() && (
        <div className="mx-1 mb-2 px-3 py-1.5 bg-[#39FF14]/10 border border-[#39FF14]/30 rounded-xl flex items-center justify-between text-xs text-[#39FF14]">
          <div className="flex items-center space-x-1.5 truncate">
            <Search size={12} className="shrink-0" />
            <span className="font-mono text-[11px]">
              Filtered by: <span className="font-bold text-white">"{searchQuery.trim()}"</span>
            </span>
            <span className="text-[10px] bg-[#39FF14]/20 px-1.5 py-0.5 rounded-md font-mono text-[#39FF14]">
              {courses.length} match{courses.length !== 1 ? 'es' : ''}
            </span>
          </div>
          <button
            onClick={handleClearSearch}
            className="p-1 hover:bg-[#39FF14]/20 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0 ml-2"
            title="Clear search filter"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* ================= FEATURED COURSES LIST ================= */}
      <main className="my-3 px-1 flex-1 min-h-[300px]">
        {loading ? (
          /* Skeletons */
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white/[0.02] border border-white/5 rounded-2xl p-3 shimmer-effect space-y-3">
                <div className="w-full h-36 bg-slate-800 rounded-xl" />
                <div className="h-4 bg-slate-800 rounded w-3/4" />
                <div className="h-3 bg-slate-800 rounded w-1/2" />
                <div className="flex justify-between items-center pt-2">
                  <div className="h-4 bg-slate-800 rounded w-1/4" />
                  <div className="h-8 bg-slate-800 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : courses.length > 0 ? (
          <motion.div
            key={`${selectedCategory}-${sortBy}-${searchQuery}-${visibleCount}`}
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.07,
                  delayChildren: 0.03
                }
              }
            }}
            className="space-y-4"
          >
            
            {/* Staggered Course Cards */}
            {courses.slice(0, visibleCount).map((course) => {
              const isWishlisted = wishlistedIds.includes(course.courseId);
              const isEnrolled = enrolledIds.includes(course.courseId);
              const isPending = pendingPurchaseCourseIds.includes(course.courseId);
              const hasDiscount = course.discountPrice !== undefined && course.discountPrice < course.price;
              const discountPercent = hasDiscount 
                ? Math.round(((course.price - (course.discountPrice || 0)) / course.price) * 100) 
                : 0;

              return (
                <motion.div
                  key={course.courseId}
                  variants={{
                    hidden: { opacity: 0, y: 18, scale: 0.98 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      scale: 1,
                      transition: {
                        type: 'spring',
                        stiffness: 280,
                        damping: 22
                      }
                    }
                  }}
                  whileHover={{ y: -3, transition: { duration: 0.2 } }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedDetailsCourse(course)}
                  className="glass-panel-light hover-lift hover:border-[#39FF14]/30 rounded-2xl p-3 flex flex-col transition-all duration-300 relative group overflow-hidden cursor-pointer"
                >
                  {/* Floating Action Cards decorative overlay */}
                  <div className="absolute -top-12 -right-12 w-24 h-24 bg-gradient-to-br from-[#39FF14]/10 to-transparent blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />

                  {/* Course Thumbnail */}
                  <div className="relative w-full h-36 rounded-xl overflow-hidden border border-white/5">
                    <img 
                      src={course.thumbnail || undefined} 
                      alt={course.title} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    
                    {/* Dark gradient shadow inside thumbnail */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

                    {/* Floating Badges */}
                    <div className="absolute top-2.5 left-2.5 flex flex-col space-y-1">
                      {course.isBestSeller && (
                        <span className="text-[8px] font-mono font-bold bg-amber-500 text-black px-2 py-0.5 rounded uppercase tracking-wider shadow">
                          Bestseller 🔥
                        </span>
                      )}
                      {course.isNew && (
                        <span className="text-[8px] font-mono font-bold bg-[#39FF14] text-black px-2 py-0.5 rounded uppercase tracking-wider shadow">
                          NEW ✨
                        </span>
                      )}
                    </div>

                    {/* Category Label bottom overlay */}
                    <span className="absolute bottom-2.5 left-2.5 text-[8px] font-mono uppercase bg-black/60 px-2 py-0.5 rounded text-slate-300 border border-white/5 backdrop-blur-sm">
                      {course.category}
                    </span>

                    {/* Quick Heart Wishlist toggle overlay */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleWishlist(course.courseId, course.title);
                      }}
                      className={`absolute top-2.5 right-2.5 p-1.5 rounded-full backdrop-blur-md border cursor-pointer transition-all ${
                        isWishlisted 
                          ? 'bg-red-500/20 border-red-500/50 text-red-400' 
                          : 'bg-black/40 border-white/5 text-slate-300 hover:text-white'
                      }`}
                    >
                      <Heart size={12} fill={isWishlisted ? 'currentColor' : 'none'} className="transition-transform active:scale-125" />
                    </button>
                  </div>

                  {/* Course Details */}
                  <div className="mt-3 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Instructor & Rating */}
                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                        <span>👨‍🏫 {course.instructor}</span>
                        <span className="flex items-center text-amber-400">
                          <Star size={10} fill="currentColor" className="mr-0.5" />
                          <strong>{course.rating.toFixed(1)}</strong>
                        </span>
                      </div>

                      {/* Course Title */}
                      <h3 className="text-xs font-semibold text-white tracking-tight mt-1.5 leading-snug group-hover:text-[#39FF14] transition-colors line-clamp-2">
                        {course.title}
                      </h3>

                      {/* Details row: Duration, Students */}
                      <div className="flex items-center space-x-3 mt-2 text-[9px] font-mono text-slate-400">
                        <span className="flex items-center">
                          <Clock size={10} className="text-slate-500 mr-1" />
                          {course.duration}
                        </span>
                        <span className="flex items-center">
                          <Users size={10} className="text-slate-500 mr-1" />
                          {course.students?.toLocaleString() || 0} Students
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-[8px] uppercase">
                          {course.level}
                        </span>
                      </div>
                    </div>

                    {/* Price, Share & Enroll Buttons */}
                    <div className="mt-3.5 pt-2.5 border-t border-white/5 flex items-center justify-between">
                      <div className="flex items-baseline space-x-1.5">
                        {hasDiscount ? (
                          <>
                            <span className="text-sm font-bold text-[#39FF14] font-mono">
                              ৳{course.discountPrice?.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-slate-500 line-through font-mono">
                              ৳{course.price?.toLocaleString()}
                            </span>
                            <span className="text-[8px] font-mono font-bold text-amber-400 bg-amber-400/5 px-1 py-0.5 rounded border border-amber-400/10">
                              {discountPercent}% SAVED
                            </span>
                          </>
                        ) : (
                          <span className="text-sm font-bold text-white font-mono">
                            {course.price === 0 ? 'FREE' : `৳${course.price?.toLocaleString()}`}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-1.5">
                        {/* Share Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShareCourse(course);
                          }}
                          className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
                          title="Share Academic link"
                        >
                          <Share2 size={12} />
                        </button>

                        {/* Enroll Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEnrollClick(course);
                          }}
                          className={`px-3.5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center space-x-1 ${
                            isPending
                              ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400'
                              : isEnrolled 
                              ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-400' 
                              : 'bg-[#39FF14] hover:bg-[#32e011] text-black shadow-[0_2px_8px_rgba(57,255,20,0.2)]'
                          }`}
                        >
                          {isPending ? (
                            <span>⏳ Pending</span>
                          ) : isEnrolled ? (
                            <>
                              <CheckCircle2 size={10} className="text-emerald-400" />
                              <span>Enrolled</span>
                            </>
                          ) : (
                            <span>Enroll Now</span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {/* Load More/Infinite Scroll Simulation */}
            {courses.length > visibleCount && (
              <div className="text-center pt-2">
                <button
                  onClick={() => setVisibleCount((prev) => prev + 4)}
                  className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-mono font-bold tracking-wider uppercase text-slate-300 transition-colors cursor-pointer"
                >
                  Load More Programs...
                </button>
              </div>
            )}
          </motion.div>
        ) : (
          /* Empty catalog results state */
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 bg-white/[0.01] border border-white/5 rounded-2xl p-6">
            <BookOpen size={40} className="text-slate-500 animate-pulse" />
            <div>
              <h4 className="text-xs font-semibold text-white">No courses matched your filters</h4>
              <p className="text-[10px] text-slate-400 mt-1 max-w-xs leading-relaxed font-sans">
                Try clearing the search query or resetting active categories to scan our complete premium academic catalog.
              </p>
            </div>
            <button
              onClick={handleResetFilters}
              className="text-[10px] font-mono bg-[#39FF14]/10 hover:bg-[#39FF14]/20 border border-[#39FF14]/20 text-[#39FF14] px-4 py-2 rounded-xl transition-colors cursor-pointer uppercase tracking-wider"
            >
              Reset Search & Filters
            </button>
          </div>
        )}
      </main>
        </>
      )}
      </React.Suspense>

      {/* ================= PERSISTENT BOTTOM NAVIGATION BAR ================= */}
      <div className="sticky bottom-0 z-40 pt-4 pb-2 bg-gradient-to-t from-[#0a0f1d] via-[#0a0f1d]/95 to-transparent">
        <div className="glass-panel rounded-2xl p-2.5 flex items-center justify-around">
          {/* Catalog / Discover Tab */}
          <button
            onClick={() => setActiveTab('discover')}
            className={`flex-1 py-2 rounded-xl flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer ${
              activeTab === 'discover'
                ? 'bg-white/5 border border-[#39FF14]/30 text-[#39FF14]'
                : 'text-slate-400 hover:text-white border border-transparent'
            }`}
          >
            <Compass size={18} className={activeTab === 'discover' ? 'text-[#39FF14] drop-shadow-[0_0_4px_rgba(57,255,20,0.5)]' : ''} />
            <span className="text-[9px] font-mono font-bold tracking-wider uppercase">Discover</span>
          </button>

          {/* My Courses Tab */}
          <button
            onClick={() => setActiveTab('my-courses')}
            className={`flex-1 py-2 rounded-xl flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer ${
              activeTab === 'my-courses'
                ? 'bg-white/5 border border-[#39FF14]/30 text-[#39FF14]'
                : 'text-slate-400 hover:text-white border border-transparent'
            }`}
          >
            <div className="relative">
              <GraduationCap size={18} className={activeTab === 'my-courses' ? 'text-[#39FF14] drop-shadow-[0_0_4px_rgba(57,255,20,0.5)]' : ''} />
              {enrolledIds.length > 0 && (
                <span className="absolute -top-1 -right-2 bg-[#39FF14] text-black text-[7.5px] font-mono font-extrabold w-3.5 h-3.5 rounded-full flex items-center justify-center border border-slate-950 animate-bounce">
                  {enrolledIds.length}
                </span>
              )}
            </div>
            <span className="text-[9px] font-mono font-bold tracking-wider uppercase">My Courses</span>
          </button>

          {/* Certificates Tab */}
          <button
            onClick={() => setActiveTab('certificates')}
            className={`flex-1 py-2 rounded-xl flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer ${
              activeTab === 'certificates'
                ? 'bg-white/5 border border-[#39FF14]/30 text-[#39FF14]'
                : 'text-slate-400 hover:text-white border border-transparent'
            }`}
          >
            <Award size={18} className={activeTab === 'certificates' ? 'text-[#39FF14] drop-shadow-[0_0_4px_rgba(57,255,20,0.5)]' : ''} />
            <span className="text-[9px] font-mono font-bold tracking-wider uppercase">Certificates</span>
          </button>

          {/* Live Classes Tab */}
          <button
            onClick={() => setActiveTab('live-classes')}
            className={`flex-1 py-2 rounded-xl flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer ${
              activeTab === 'live-classes'
                ? 'bg-white/5 border border-[#39FF14]/30 text-[#39FF14]'
                : 'text-slate-400 hover:text-white border border-transparent'
            }`}
          >
            <div className="relative">
              <Tv size={18} className={activeTab === 'live-classes' ? 'text-[#39FF14] drop-shadow-[0_0_4px_rgba(57,255,20,0.5)]' : ''} />
              <span className="absolute -top-1 -right-2 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
            </div>
            <span className="text-[9px] font-mono font-bold tracking-wider uppercase">Live</span>
          </button>

          {/* Community Tab */}
          <button
            onClick={() => setActiveTab('community')}
            className={`flex-1 py-2 rounded-xl flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer ${
              activeTab === 'community'
                ? 'bg-white/5 border border-[#39FF14]/30 text-[#39FF14]'
                : 'text-slate-400 hover:text-white border border-transparent'
            }`}
          >
            <MessageSquare size={18} className={activeTab === 'community' ? 'text-[#39FF14] drop-shadow-[0_0_4px_rgba(57,255,20,0.5)]' : ''} />
            <span className="text-[9px] font-mono font-bold tracking-wider uppercase">Community</span>
          </button>
          
          {/* Profile Tab */}
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-2 rounded-xl flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-white/5 border border-[#39FF14]/30 text-[#39FF14]'
                : 'text-slate-400 hover:text-white border border-transparent'
            }`}
          >
            <div className="w-5 h-5 rounded-full overflow-hidden border border-current">
               {userProfile?.photoURL ? <img src={userProfile.photoURL || undefined} alt="Profile" className="w-full h-full object-cover" /> : <User size={18} />}
            </div>
            <span className="text-[9px] font-mono font-bold tracking-wider uppercase">Profile</span>
          </button>
        </div>
      </div>

      <footer className="mt-4 pt-1 pb-3 text-center font-mono text-[9px] text-slate-500 tracking-wider">
        NEXUS PORTAL • STUDY COURSE DISCOVERY SYSTEM
      </footer>

      {/* Notification and Preferences Sidebar Drawer */}
      <React.Suspense fallback={null}>
      <NotificationCenter
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        onShowNotification={onShowNotification}
        onNavigateToTab={(tab) => setActiveTab(tab)}
        onSelectCourseById={handleSelectCourseById}
        userId={auth.currentUser?.uid || ''}
      />
      </React.Suspense>

      {/* AI Study Assistant */}
      <AiAssistantFAB 
        isOpen={isAiChatOpen} 
        onClick={() => setIsAiChatOpen(true)} 
      />
      
      <AnimatePresence>
        {isAiChatOpen && (
          <React.Suspense fallback={null}>
          <AiChatView 
            onClose={() => setIsAiChatOpen(false)} 
            userProfile={userProfile}
            onShowNotification={onShowNotification}
          />
          </React.Suspense>
        )}
        
        {isRewardsOpen && (
          <React.Suspense fallback={null}>
          <RewardsView onClose={() => setIsRewardsOpen(false)} />
          </React.Suspense>
        )}

        {isAdminOpen && (
          <React.Suspense fallback={null}>
          <AdminPanelModal
            isOpen={isAdminOpen}
            onClose={() => setIsAdminOpen(false)}
            onShowNotification={onShowNotification}
          />
          </React.Suspense>
        )}
      </AnimatePresence>
    </div>
  );
}
