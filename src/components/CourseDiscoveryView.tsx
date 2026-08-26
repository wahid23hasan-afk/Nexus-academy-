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
  FileCode,
  Play,
  PlayCircle,
  Calendar,
  Hourglass,
  Timer,
  Zap,
  Headset,
  LifeBuoy,
  HelpCircle
} from 'lucide-react';
import { Course, Banner } from '../types/course';
import { courseService } from '../services/courseService';
import { progressService, CourseProgressInfo, LessonProgressInfo } from '../services/progressService';
import { auth, db } from '../services/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

import { CourseDetailsView } from './CourseDetailsView';
import { EnrollmentConfirmationView } from './EnrollmentConfirmationView';
import { PaymentView } from './PaymentView';
import { MyCoursesView } from './MyCoursesView';
import { LearningDashboardView } from './LearningDashboardView';
import { AnnouncementBanner } from './AnnouncementBanner';
import { EliteLoading } from './EliteLoading';

import { MyCertificatesView } from './MyCertificatesView';
import { NotificationCenter } from './NotificationCenter';
import { LiveClassesView } from './LiveClassesView';
import { CommunityView } from './CommunityView';
import { FlashcardsView } from './FlashcardsView';
import { StudyGroupView } from './StudyGroupView';
import { CourseReviewsModal } from './CourseReviewsModal';
import { AiChatView } from './AiChatView';
import { ProfileView } from './ProfileView';
import { GamificationSummary } from './GamificationDashboard';
import { AchievementTracker } from './AchievementTracker';
import { RewardsView } from './RewardsView';
import { AccountDetailsView } from './AccountDetailsView';
import { PrivacySecurityView } from './PrivacySecurityView';
import { HelpSupportView } from './HelpSupportView';
import { CodeSandboxView } from './CodeSandboxView';
import { PaymentHistoryView } from './PaymentHistoryView';

import { notificationService, getSafeTimestamp } from '../services/notificationService';
import { triggerMilestoneToast } from '../services/milestoneService';
import { DailyMysteryChestModal } from './DailyMysteryChestModal';
import { SmartFocusTimerModal } from './SmartFocusTimerModal';
import { XpStoreModal } from './XpStoreModal';
import { WeeklyLeagueModal } from './WeeklyLeagueModal';
import { SpeedMatchGameModal } from './SpeedMatchGameModal';
import { GlobalLeaderboard } from './GlobalLeaderboard';
import { LeaderboardRewardsView } from './LeaderboardRewardsView';
import { soundFxService } from '../services/soundFxService';
import { Volume2, VolumeX, Gift, ShoppingBag, Gamepad2, Menu } from 'lucide-react';
import { Notification as DBNotification, Announcement } from '../types/notification';
import { AiAssistantFAB } from './AiAssistantFAB';
import { gamificationService } from '../services/gamificationService';

const TabFallback = () => (
  <div className="flex-1 flex flex-col items-center justify-center p-8">
    <EliteLoading variant="inline" compact label="STREAMING ACADEMIC MODULE" subLabel="PREPARING INTERACTIVE CANVAS" />
  </div>
);

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

  // Auto-hiding Bottom Bar & AI FAB on scroll
  const [isBarsVisible, setIsBarsVisible] = useState<boolean>(true);
  const lastScrollYRef = useRef<number>(0);

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
  const [activeTab, setActiveTab] = useState<'discover' | 'my-courses' | 'certificates' | 'live-classes' | 'community' | 'flashcards' | 'study-group' | 'sandbox' | 'profile' | 'payment-history' | 'account-details' | 'privacy-security' | 'help-support' | 'leaderboard'>('discover');
  const [activeLearningCourse, setActiveLearningCourse] = useState<Course | null>(null);
  const [userCourseProgressMap, setUserCourseProgressMap] = useState<Record<string, CourseProgressInfo>>({});
  const [userLessonProgressMap, setUserLessonProgressMap] = useState<Record<string, LessonProgressInfo[]>>({});
  const [selectedResumeLesson, setSelectedResumeLesson] = useState<{ lessonId?: string; initialTime?: number } | null>(null);
  
  // Payment Module states
  const [paymentCourse, setPaymentCourse] = useState<Course | null>(null);
  const [paymentPrice, setPaymentPrice] = useState<number>(0);
  const [paymentDiscount, setPaymentDiscount] = useState<number>(0);
  const [paymentCoupon, setPaymentCoupon] = useState<string>('');

  // Notification states
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [dbNotifications, setDbNotifications] = useState<DBNotification[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const seenNotifIdsRef = useRef<Set<string> | null>(null);
  const lastUserIdRef = useRef<string | null>(null);
  const sessionStartTimeRef = useRef<number>(Date.now());

  // Pagination/Infinite Scroll State
  const [visibleCount, setVisibleCount] = useState<number>(4);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

  const handleLoadMorePrograms = () => {
    setIsLoadingMore(true);
    soundFxService.playClick();
    setTimeout(() => {
      setVisibleCount((prev) => prev + 4);
      setIsLoadingMore(false);
    }, 800);
  };

  // AI Assistant State
  const [isAiChatOpen, setIsAiChatOpen] = useState<boolean>(false);
  
  // Rewards View State
  const [isRewardsOpen, setIsRewardsOpen] = useState<boolean>(false);
  const [isChestOpen, setIsChestOpen] = useState<boolean>(false);
  const [isFocusTimerOpen, setIsFocusTimerOpen] = useState<boolean>(false);
  const [isStoreOpen, setIsStoreOpen] = useState<boolean>(false);
  const [isLeagueOpen, setIsLeagueOpen] = useState<boolean>(false);
  const [isGameOpen, setIsGameOpen] = useState<boolean>(false);
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState<boolean>(false);
  const [userXPVal, setUserXPVal] = useState<number>(0);
  const [dailyStreakVal, setDailyStreakVal] = useState<number>(1);
  const [unreadSupportCount, setUnreadSupportCount] = useState<number>(0);
  const [isSoundMuted, setIsSoundMuted] = useState<boolean>(() => soundFxService.getIsMuted());

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

    // Fetch user XP balance & Daily Streak and record daily login
    const currentUid = auth.currentUser?.uid || userProfile?.username || 'scholar';
    const refreshXP = () => {
      gamificationService.recordDailyLogin(currentUid).then((loginRes) => {
        if (loginRes.streak > 0) setDailyStreakVal(loginRes.streak);
      }).catch(() => {});
      gamificationService.getUserXP(currentUid).then((xpData) => {
        setUserXPVal(xpData.totalXP);
      }).catch(() => {});
    };
    refreshXP();

    window.addEventListener('nexus_xp_updated', refreshXP);

    // Scroll Direction Tracking for dynamic Bottom Bar & AI FAB Auto-Hiding
    const handleScroll = (e: Event) => {
      const target = e.target;
      let currentScrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;

      if (target && target instanceof HTMLElement && typeof target.scrollTop === 'number') {
        currentScrollY = target.scrollTop;
      }

      const diff = currentScrollY - lastScrollYRef.current;
      const threshold = 8;

      // Scrolling Down: Hide Bottom Bar and AI FAB
      if (diff > threshold && currentScrollY > 40) {
        setIsBarsVisible(false);
      } 
      // Scrolling Up or near top: Reveal Bottom Bar and AI FAB
      else if (diff < -threshold || currentScrollY <= 25) {
        setIsBarsVisible(true);
      }

      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true });
      window.removeEventListener('nexus_xp_updated', refreshXP);
    };
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
          if (typeof res.newStreak === 'number') {
            setDailyStreakVal(res.newStreak || 1);
          }
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

        const progressIds = (relations || []).map(r => r.courseId);
        const combinedApproved = Array.from(new Set([...approvedPurchaseIds, ...progressIds]));

        const pendingPurchaseIds = userPurchases
          .filter(p => p.status === 'pending' && !combinedApproved.includes(p.courseId))
          .map(p => p.courseId);

        setPendingPurchaseCourseIds(pendingPurchaseIds);
        setEnrolledIds(combinedApproved);
        localStorage.setItem('nexus_enrollments', JSON.stringify(combinedApproved));

        // Fetch user progress for enrolled courses
        const [allCourseProgs, allLessonProgs] = await Promise.all([
          Promise.all(combinedApproved.map(cId => progressService.getCourseProgress(uId, cId))),
          progressService.getAllUserLessonProgresses(uId)
        ]);

        const cMap: Record<string, CourseProgressInfo> = {};
        allCourseProgs.forEach(p => {
          if (p) cMap[p.courseId] = p;
        });
        setUserCourseProgressMap(cMap);

        const lMap: Record<string, LessonProgressInfo[]> = {};
        allLessonProgs.forEach(lp => {
          if (!lMap[lp.courseId]) lMap[lp.courseId] = [];
          lMap[lp.courseId].push(lp);
        });
        setUserLessonProgressMap(lMap);
      } catch (err) {
        console.warn('Silent enrollment sync failed:', err);
      }
    };

    syncEnrollments();

    const handlePurchaseUpdate = () => {
      syncEnrollments();
      loadCourses();
    };

    window.addEventListener('nexus_purchases_updated', handlePurchaseUpdate);
    return () => {
      window.removeEventListener('nexus_purchases_updated', handlePurchaseUpdate);
    };
  }, [userProfile]);

  // Listen to dynamic notifications and announcements from Firestore in real-time using onSnapshot
  useEffect(() => {
    let unsubscribeNotif: (() => void) | undefined;
    let unsubscribeAnn: (() => void) | undefined;

    const setupListeners = () => {
      const uId = auth.currentUser?.uid || (userProfile as any)?.uid || userProfile?.username || 'guest_user';
      const uEmail = auth.currentUser?.email || (userProfile as any)?.email || userProfile?.username || undefined;
      const uName = userProfile?.fullName || auth.currentUser?.displayName || undefined;

      // Reset seen notifications cache if the user ID switches
      if (lastUserIdRef.current !== uId) {
        lastUserIdRef.current = uId;
        seenNotifIdsRef.current = null;
        sessionStartTimeRef.current = Date.now();
      }

      if (unsubscribeNotif) unsubscribeNotif();
      if (unsubscribeAnn) unsubscribeAnn();

      // Real-time notifications listener
      unsubscribeNotif = notificationService.listenToNotifications(uId, (list) => {
        setDbNotifications(list);

        // Sort entire notification list strictly by createdAt descending (Newest first)
        const sortedList = [...list].sort((a, b) => {
          const tA = getSafeTimestamp(a.createdAt, a.notificationId);
          const tB = getSafeTimestamp(b.createdAt, b.notificationId);
          if (tB !== tA) return tB - tA;
          return (b.notificationId || '').localeCompare(a.notificationId || '');
        });

        // Find unread notifications
        const unreadNotifs = sortedList.filter(n => n.unread);

        if (seenNotifIdsRef.current === null) {
          // INITIAL LOAD UPON ENTERING THE APP:
          seenNotifIdsRef.current = new Set();

          if (unreadNotifs.length > 0) {
            // Show top popup alert for the NEWEST unread admin message immediately on app entry
            const newestUnread = unreadNotifs[0];
            onShowNotification(`🔔 ${newestUnread.title}: ${newestUnread.message}`, 'success');
            seenNotifIdsRef.current.add(newestUnread.notificationId);
          }

          // Mark all existing notification IDs as processed
          sortedList.forEach(n => seenNotifIdsRef.current!.add(n.notificationId));
        } else {
          // LIVE IN-APP UPDATE:
          const newItems = sortedList.filter(n => {
            const isUnseen = !seenNotifIdsRef.current!.has(n.notificationId);
            const isUnread = n.unread;
            return isUnseen && isUnread;
          });

          newItems.forEach(n => {
            onShowNotification(`📢 ${n.title}: ${n.message}`, 'success');
            seenNotifIdsRef.current!.add(n.notificationId);
          });
          
          sortedList.forEach(n => seenNotifIdsRef.current!.add(n.notificationId));
        }
      }, uEmail, uName);

      // Real-time announcements listener
      unsubscribeAnn = notificationService.listenToAnnouncements((annList) => {
        setAnnouncements(annList);
      });
    };

    setupListeners();

    const authUnsub = auth.onAuthStateChanged(() => {
      setupListeners();
    });

    return () => {
      if (unsubscribeNotif) unsubscribeNotif();
      if (unsubscribeAnn) unsubscribeAnn();
      authUnsub();
    };
  }, [userProfile, onShowNotification]);

  // Real-time listener for support tickets unread admin replies
  useEffect(() => {
    const currentUid = auth.currentUser?.uid || userProfile?.username;
    if (!currentUid) {
      setUnreadSupportCount(0);
      return;
    }

    const q = query(
      collection(db, 'support_tickets'),
      where('userId', '==', currentUid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let unreadCount = 0;
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.status === 'open' && Array.isArray(data.replies) && data.replies.length > 0) {
          const hasAdminReply = data.replies.some((r: any) => Boolean(r.adminId));
          if (hasAdminReply) {
            unreadCount += 1;
          }
        }
      });
      setUnreadSupportCount(unreadCount);
    }, (err) => {
      console.warn('Error listening to support tickets unread count:', err);
    });

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

  // Custom video asset preloader strategy to minimize start-time latency
  const preloadedUrlsRef = useRef<Set<string>>(new Set());

  const preloadVideoAssets = (urls: (string | undefined)[]) => {
    if (typeof window === 'undefined') return;
    const validUrls = urls.filter((url): url is string => {
      if (!url || typeof url !== 'string') return false;
      const clean = url.trim();
      if (!clean || clean.startsWith('firestore:') || clean.startsWith('vid_')) return false;
      return !preloadedUrlsRef.current.has(clean);
    });

    validUrls.forEach((url) => {
      preloadedUrlsRef.current.add(url);
      try {
        // Method A: HTML5 video element with preload="metadata"
        const v = document.createElement('video');
        v.preload = 'metadata';
        v.muted = true;
        v.playsInline = true;
        v.src = url;
        v.load();

        // Method B: Lightweight socket & HTTP cache warmup
        fetch(url, {
          method: 'GET',
          headers: { Range: 'bytes=0-102400' },
          mode: 'cors',
          cache: 'force-cache'
        }).catch(() => {});
      } catch (e) {}
    });
  };

  // Automatically preload video assets for visible & enrolled courses
  useEffect(() => {
    if (courses.length === 0) return;

    const timer = setTimeout(() => {
      const urlsToPreload: (string | undefined)[] = [];

      courses.slice(0, 8).forEach((c) => {
        if (c.videoUrl) urlsToPreload.push(c.videoUrl);
        if (c.previewVideoUrl) urlsToPreload.push(c.previewVideoUrl);
        if (c.demoVideoUrl) urlsToPreload.push(c.demoVideoUrl);
        if (c.sections) {
          c.sections.forEach((s) => {
            if (s.lessons) {
              s.lessons.slice(0, 2).forEach((l) => {
                if (l.videoUrl) urlsToPreload.push(l.videoUrl);
              });
            }
          });
        }
        if (c.curriculum) {
          c.curriculum.forEach((ch) => {
            if (ch.lessons) {
              ch.lessons.slice(0, 2).forEach((l) => {
                if (l.videoUrl) urlsToPreload.push(l.videoUrl);
              });
            }
          });
        }
        if (c.modules) {
          c.modules.forEach((m: any) => {
            if (m.lessons) {
              m.lessons.slice(0, 2).forEach((l: any) => {
                if (l.videoUrl) urlsToPreload.push(l.videoUrl);
              });
            }
          });
        }
      });

      preloadVideoAssets(urlsToPreload);
    }, 600);

    return () => clearTimeout(timer);
  }, [courses]);

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

  // Listen to filter, sorting, and real-time Firestore database changes with unsubscribe cleanup
  useEffect(() => {
    const filters = {
      category: selectedCategory,
      priceType: priceFilter,
      isBestSeller: badgeFilter === 'bestseller',
      isNew: badgeFilter === 'new',
      rating: badgeFilter === 'highest_rated' ? 4.8 : undefined,
      searchQuery: searchQuery
    };

    const unsubscribe = courseService.subscribeCourses(
      filters,
      sortBy,
      (liveCourses) => {
        setCourses(liveCourses);
        setLoading(false);
      },
      (err) => {
        console.warn('Real-time courses sync failed, falling back to static fetch:', err);
        loadCourses();
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
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
    courseService.incrementCourseStudents(selectedEnrollCourse.courseId);
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
          courseService.incrementCourseStudents(paymentCourse.courseId);
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
          courseService.incrementCourseStudents(selectedEnrollCourse.courseId);
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
        onBack={() => {
          setActiveLearningCourse(null);
          setSelectedResumeLesson(null);
        }}
        onShowNotification={onShowNotification}
        purchasedCourseIds={enrolledIds}
        onTriggerPurchase={(c) => {
          setActiveLearningCourse(null);
          handleEnrollClick(c);
        }}
        initialLessonId={selectedResumeLesson?.lessonId}
        initialTime={selectedResumeLesson?.initialTime}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-between py-1 px-1 text-slate-100 max-w-lg mx-auto w-full relative pb-28">
      
      {/* ================= HEADER ================= */}
      <header className="flex items-center justify-between gap-2 py-2.5 px-1.5 border-b border-white/5 relative z-10 bg-[#0a0f1d]">
        {/* Left: User Avatar & Greetings */}
        <div className="flex items-center space-x-2.5 min-w-0 shrink">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-[#39FF14]/30 overflow-hidden flex items-center justify-center shadow-[0_0_12px_rgba(57,255,20,0.15)] shrink-0">
            {userProfile?.photoURL?.trim() ? (
              <img 
                src={userProfile.photoURL.trim()} 
                alt="Profile Avatar" 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <GraduationCap size={18} className="text-[#39FF14] drop-shadow-[0_0_4px_rgba(57,255,20,0.4)]" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-mono text-slate-400 uppercase tracking-widest leading-none mb-0.5">{getGreeting()}</p>
            <div className="flex items-center space-x-1.5 min-w-0">
              <h1 className="text-xs sm:text-sm font-sans font-semibold text-white tracking-tight flex items-center space-x-1 truncate">
                <span className="truncate max-w-[100px] xs:max-w-[140px] sm:max-w-none">{userProfile?.fullName || 'Distinguished Scholar'}</span>
                <span className="text-xs shrink-0">👋</span>
              </h1>
              <span className={`text-[8px] font-mono font-bold px-1.5 py-0.2 rounded-full border flex items-center space-x-0.5 shrink-0 transition-all ${
                pendingPurchaseCourseIds.length > 0 && enrolledIds.length === 0
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.2)] animate-pulse'
                  : 'bg-[#39FF14]/15 text-[#39FF14] border-[#39FF14]/30 shadow-[0_0_8px_rgba(57,255,20,0.15)]'
              }`}>
                {pendingPurchaseCourseIds.length > 0 && enrolledIds.length === 0 ? <Clock size={9} /> : <ShieldCheck size={9} />}
                <span>{pendingPurchaseCourseIds.length > 0 && enrolledIds.length === 0 ? 'Pending' : 'Approved'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right: Streak Counter, Notification and 3-Line Quest/Rewards Menu Button */}
        <div className="flex items-center space-x-1.5 shrink-0 pl-1 relative">
          {/* Daily Streak Counter Header Pill */}
          <button
            onClick={() => {
              soundFxService.playClick();
              setIsRewardsOpen(true);
            }}
            className="flex items-center space-x-1 px-2 py-1.5 rounded-xl bg-gradient-to-r from-orange-500/15 to-amber-500/15 border border-orange-500/35 text-orange-400 font-mono text-[11px] font-bold shrink-0 shadow-[0_0_12px_rgba(249,115,22,0.18)] cursor-pointer hover:border-orange-500/60 hover:bg-orange-500/25 transition-all select-none"
            title={`${dailyStreakVal} Day Login Streak - Click to open rewards`}
          >
            <Flame size={13} className="text-orange-500 fill-orange-500 animate-pulse" />
            <span className="text-[10px] sm:text-[11px] font-black">{dailyStreakVal}d</span>
          </button>

          {/* Notification Button */}
          <button 
            onClick={() => setShowNotifications(true)}
            className={`p-2 rounded-xl border transition-all duration-300 relative cursor-pointer shrink-0 ${
              showNotifications 
                ? 'bg-[#39FF14]/10 border-[#39FF14]/40 text-[#39FF14]' 
                : 'bg-white/[0.02] border-white/10 text-slate-300 hover:bg-white/[0.05]'
            }`}
            title={unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'Notifications'}
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[17px] h-[17px] px-1 bg-red-500 rounded-full flex items-center justify-center text-[8px] font-mono font-bold text-white shadow-lg shadow-red-500/50 animate-pulse border border-slate-900">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* 3-Line Menu with Rewards/XP/Timer Indicator Icon */}
          <div className="relative">
            <button
              onClick={() => {
                soundFxService.playClick();
                setIsQuickMenuOpen(!isQuickMenuOpen);
              }}
              className={`p-2 rounded-xl border transition-all duration-300 flex items-center space-x-1.5 cursor-pointer relative ${
                isQuickMenuOpen
                  ? 'bg-[#39FF14]/20 border-[#39FF14] text-[#39FF14] shadow-[0_0_15px_rgba(57,255,20,0.3)]'
                  : 'bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-[#39FF14]/10 border-[#39FF14]/40 text-slate-200 hover:text-white hover:border-[#39FF14]'
              }`}
              title="Rewards, League, Game Arena & Focus Chamber"
            >
              {/* 3-line hamburger icon */}
              <Menu size={16} className="text-[#39FF14]" />
              
              {/* Rewards/XP indicator icon badge */}
              <div className="flex items-center space-x-0.5 bg-[#39FF14]/20 px-1.5 py-0.5 rounded-lg border border-[#39FF14]/30">
                <Sparkles size={11} className="text-amber-400 animate-pulse" />
                <span className="text-[10px] font-mono font-black text-[#39FF14]">XP</span>
              </div>
            </button>

            {/* Dropdown Menu when clicked */}
            <AnimatePresence>
              {isQuickMenuOpen && (
                <>
                  {/* Backdrop overlay to close when clicking outside */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsQuickMenuOpen(false)}
                  />

                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-12 w-64 rounded-2xl bg-[#0d1527] border border-[#39FF14]/30 shadow-[0_12px_36px_rgba(0,0,0,0.85)] p-2.5 z-50 backdrop-blur-xl"
                  >
                    {/* Header summary in menu */}
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 px-1">
                      <div className="flex items-center space-x-1.5">
                        <Trophy size={14} className="text-amber-400" />
                        <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">Quest & Hub</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-[#39FF14] bg-[#39FF14]/10 px-1.5 py-0.5 rounded border border-[#39FF14]/30">
                        {userXPVal} XP
                      </span>
                    </div>

                    <div className="space-y-1 max-h-[55vh] overflow-y-auto pr-1 no-scrollbar">
                      {/* XP Store */}
                      <button
                        onClick={() => {
                          setIsQuickMenuOpen(false);
                          soundFxService.playClick();
                          setIsStoreOpen(true);
                        }}
                        className="w-full flex items-center justify-between p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-300 transition-all cursor-pointer text-left"
                      >
                        <div className="flex items-center space-x-2">
                          <ShoppingBag size={15} className="text-amber-400" />
                          <span className="text-xs font-bold">XP Store & Customizer</span>
                        </div>
                        <span className="text-[9px] font-mono text-amber-400 bg-amber-500/20 px-1.5 py-0.2 rounded font-bold">SHOP</span>
                      </button>

                      {/* Weekly League Podium */}
                      <button
                        onClick={() => {
                          setIsQuickMenuOpen(false);
                          soundFxService.playClick();
                          setIsLeagueOpen(true);
                        }}
                        className="w-full flex items-center justify-between p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-300 transition-all cursor-pointer text-left"
                      >
                        <div className="flex items-center space-x-2">
                          <Trophy size={15} className="text-emerald-400" />
                          <span className="text-xs font-bold">Weekly Diamond League</span>
                        </div>
                        <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/20 px-1.5 py-0.2 rounded font-bold">PODIUM</span>
                      </button>

                      {/* 60s Speed Match Arena */}
                      <button
                        onClick={() => {
                          setIsQuickMenuOpen(false);
                          soundFxService.playClick();
                          setIsGameOpen(true);
                        }}
                        className="w-full flex items-center justify-between p-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-300 transition-all cursor-pointer text-left"
                      >
                        <div className="flex items-center space-x-2">
                          <Gamepad2 size={15} className="text-purple-400" />
                          <span className="text-xs font-bold">60s Speed Match Game</span>
                        </div>
                        <span className="text-[9px] font-mono text-purple-400 bg-purple-500/20 px-1.5 py-0.2 rounded font-bold">PLAY</span>
                      </button>

                      {/* Smart Focus Timer */}
                      <button
                        onClick={() => {
                          setIsQuickMenuOpen(false);
                          soundFxService.playClick();
                          setIsFocusTimerOpen(true);
                        }}
                        className="w-full flex items-center justify-between p-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-300 transition-all cursor-pointer text-left"
                      >
                        <div className="flex items-center space-x-2">
                          <Timer size={15} className="text-cyan-400" />
                          <span className="text-xs font-bold">Focus Timer Chamber</span>
                        </div>
                        <span className="text-[9px] font-mono text-cyan-400 bg-cyan-500/20 px-1.5 py-0.2 rounded font-bold">TIMER</span>
                      </button>

                      {/* Daily Mystery Chest */}
                      <button
                        onClick={() => {
                          setIsQuickMenuOpen(false);
                          soundFxService.playClick();
                          setIsChestOpen(true);
                        }}
                        className="w-full flex items-center justify-between p-2 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 text-orange-300 transition-all cursor-pointer text-left"
                      >
                        <div className="flex items-center space-x-2">
                          <Gift size={15} className="text-orange-400" />
                          <span className="text-xs font-bold">Daily Mystery Chest</span>
                        </div>
                        <span className="text-[9px] font-mono text-orange-400 bg-orange-500/20 px-1.5 py-0.2 rounded font-bold">GIFT</span>
                      </button>



                      {/* Rewards & Gamification View */}
                      <button
                        onClick={() => {
                          setIsQuickMenuOpen(false);
                          soundFxService.playClick();
                          setIsRewardsOpen(true);
                        }}
                        className="w-full flex items-center justify-between p-2 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/40 border border-[#39FF14]/20 text-[#39FF14] transition-all cursor-pointer text-left"
                      >
                        <div className="flex items-center space-x-2">
                          <Award size={15} className="text-[#39FF14]" />
                          <span className="text-xs font-bold">Rewards & Badges</span>
                        </div>
                        <span className="text-[9px] font-mono text-[#39FF14] bg-[#39FF14]/20 px-1.5 py-0.2 rounded font-bold">REWARDS</span>
                      </button>

                      {/* Student Support & Helpdesk */}
                      <button
                        onClick={() => {
                          setIsQuickMenuOpen(false);
                          soundFxService.playClick();
                          setActiveTab('help-support');
                        }}
                        className="w-full flex items-center justify-between p-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-300 transition-all cursor-pointer text-left"
                      >
                        <div className="flex items-center space-x-2">
                          <Headset size={15} className="text-purple-400" />
                          <span className="text-xs font-bold">Support & Helpdesk</span>
                        </div>
                        {unreadSupportCount > 0 ? (
                          <span className="text-[9px] font-mono text-black bg-[#39FF14] px-1.5 py-0.2 rounded font-bold animate-pulse">
                            {unreadSupportCount} NEW
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono text-purple-400 bg-purple-500/20 px-1.5 py-0.2 rounded font-bold">HELP</span>
                        )}
                      </button>

                      {/* Sound FX Audio Mute Toggle */}
                      <button
                        onClick={() => {
                          const nextMute = soundFxService.toggleMute();
                          setIsSoundMuted(nextMute);
                          if (!nextMute) {
                            soundFxService.playXP();
                          }
                        }}
                        className="w-full flex items-center justify-between p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-all cursor-pointer text-left"
                      >
                        <div className="flex items-center space-x-2">
                          {isSoundMuted ? <VolumeX size={15} className="text-slate-400" /> : <Volume2 size={15} className="text-[#39FF14]" />}
                          <span className="text-xs font-bold">Audio Sound FX</span>
                        </div>
                        <span className="text-[9px] font-mono text-slate-400 bg-white/10 px-1.5 py-0.2 rounded">
                          {isSoundMuted ? 'MUTED' : 'ON'}
                        </span>
                      </button>

                      {/* Test Milestone Toasts Section */}
                      <div className="pt-2 mt-2 border-t border-white/10">
                        <div className="text-[10px] font-mono font-bold text-[#39FF14] uppercase tracking-wider mb-1 px-1 flex items-center space-x-1">
                          <Sparkles size={11} />
                          <span>Test Milestone Toasts</span>
                        </div>
                        <div className="space-y-1">
                          <button
                            onClick={() => {
                              setIsQuickMenuOpen(false);
                              triggerMilestoneToast({
                                type: 'xp',
                                title: '⚡ 500 XP Milestone Reached!',
                                value: '500 XP',
                                description: 'Half-a-thousand XP milestone unlocked! You are in the top 5% today!',
                                icon: '⚡',
                                colorTheme: 'amber',
                                actionLabel: 'View Leaderboard'
                              });
                            }}
                            className="w-full flex items-center justify-between p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-300 transition-all cursor-pointer text-left text-xs font-bold"
                          >
                            <span>⚡ 500 XP Milestone</span>
                            <span className="text-[9px] font-mono text-amber-400 bg-amber-500/20 px-1.5 py-0.2 rounded">TEST</span>
                          </button>

                          <button
                            onClick={() => {
                              setIsQuickMenuOpen(false);
                              triggerMilestoneToast({
                                type: 'streak',
                                title: '🔥 7-Day Streak Master!',
                                value: '7 Days Streak',
                                description: 'Studied for 7 full consecutive days without breaking your momentum!',
                                icon: '🔥',
                                colorTheme: 'amber',
                                actionLabel: 'View Stats'
                              });
                            }}
                            className="w-full flex items-center justify-between p-2 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 text-orange-300 transition-all cursor-pointer text-left text-xs font-bold"
                          >
                            <span>🔥 7-Day Streak Toast</span>
                            <span className="text-[9px] font-mono text-orange-400 bg-orange-500/20 px-1.5 py-0.2 rounded">TEST</span>
                          </button>

                          <button
                            onClick={() => {
                              setIsQuickMenuOpen(false);
                              triggerMilestoneToast({
                                type: 'level',
                                title: '🏆 Level Up: Skilled Scholar!',
                                value: 'Level 10 Unlocked',
                                description: 'Rank upgraded! You unlocked Advanced Curriculum and Exclusive Badge Perks.',
                                icon: '🏆',
                                colorTheme: 'purple',
                                actionLabel: 'View Profile'
                              });
                            }}
                            className="w-full flex items-center justify-between p-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-300 transition-all cursor-pointer text-left text-xs font-bold"
                          >
                            <span>🏆 Level Up Toast</span>
                            <span className="text-[9px] font-mono text-purple-400 bg-purple-500/20 px-1.5 py-0.2 rounded">TEST</span>
                          </button>

                          <button
                            onClick={() => {
                              setIsQuickMenuOpen(false);
                              triggerMilestoneToast({
                                type: 'badge',
                                title: '🏅 Badge Unlocked: 100% Quiz Ace',
                                value: 'Perfect Score Badge',
                                description: 'Scored 100% accuracy on a course exam. +100 Bonus XP awarded!',
                                icon: '🏅',
                                colorTheme: 'green',
                                actionLabel: 'View Badges'
                              });
                            }}
                            className="w-full flex items-center justify-between p-2 rounded-xl bg-[#39FF14]/10 hover:bg-[#39FF14]/20 border border-[#39FF14]/30 text-[#39FF14] transition-all cursor-pointer text-left text-xs font-bold"
                          >
                            <span>🏅 Badge Unlocked Toast</span>
                            <span className="text-[9px] font-mono text-[#39FF14] bg-[#39FF14]/20 px-1.5 py-0.2 rounded">TEST</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Premium Announcement Auto-scrolling banner */}
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
          onClick={() => setActiveTab('leaderboard')}
          className={`px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider whitespace-nowrap flex items-center space-x-1.5 transition-all cursor-pointer ${
            activeTab === 'leaderboard' ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20' : 'text-slate-400 hover:text-white bg-white/5'
          }`}
        >
          <Trophy size={12} />
          <span>Leaderboard</span>
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

        <button
          onClick={() => setActiveTab('help-support')}
          className={`px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider whitespace-nowrap flex items-center space-x-1.5 transition-all cursor-pointer relative ${
            activeTab === 'help-support' ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20' : 'text-slate-400 hover:text-white bg-white/5'
          }`}
        >
          <Headset size={12} className={unreadSupportCount > 0 ? 'text-[#39FF14]' : ''} />
          <span>Support</span>
          {unreadSupportCount > 0 && (
            <span className="px-1 py-0.2 rounded-full bg-[#39FF14] text-black text-[8px] font-mono font-bold">
              {unreadSupportCount}
            </span>
          )}
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
          onBackToProfile={() => setActiveTab('profile')}
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
          onBackToProfile={() => setActiveTab('profile')}
          onShowNotification={onShowNotification}
        />
      ) : activeTab === 'flashcards' ? (
        <FlashcardsView
          onShowNotification={onShowNotification}
        />
      ) : activeTab === 'leaderboard' ? (
        <LeaderboardRewardsView
          userProfile={userProfile as any}
          onShowNotification={onShowNotification}
          onNavigateToCourse={() => setActiveTab('discover')}
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
          courses={courses}
          enrolledCourseIds={enrolledIds}
          userCourseProgressMap={userCourseProgressMap}
          userLessonProgressMap={userLessonProgressMap}
          onOpenCourse={(course) => setActiveLearningCourse(course)}
        />
      ) : activeTab === 'payment-history' ? (
        <PaymentHistoryView
          onBack={() => setActiveTab('profile')}
          userProfile={userProfile}
          onShowNotification={onShowNotification}
          onRetryPayment={(courseId) => {
            const course = courses.find(c => c.courseId === courseId);
            if (course) {
              handleEnrollClick(course);
            } else {
              courseService.getCourses().then(allCourses => {
                const found = allCourses.find(c => c.courseId === courseId);
                if (found) handleEnrollClick(found);
              });
            }
          }}
        />
      ) : activeTab === 'account-details' ? (
        <AccountDetailsView onBack={() => setActiveTab('profile')} userProfile={userProfile} />
      ) : activeTab === 'privacy-security' ? (
        <PrivacySecurityView onBack={() => setActiveTab('profile')} />
      ) : activeTab === 'help-support' ? (
        <HelpSupportView
          onBack={() => setActiveTab('discover')}
          userProfile={userProfile}
          onNavigateToTab={(tab) => setActiveTab(tab as any)}
        />
      ) : (
        <>
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
                  src={banners[currentSlide].imageUrl?.trim() || undefined} 
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
          <EliteLoading 
            label="SYNCHRONIZING ACADEMIC CATALOG" 
            subLabel="STREAMING REALTIME SCHOLAR MATRIX..." 
          />
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
                  whileHover={{ 
                    scale: [1, 1.018, 1.008, 1.018],
                    y: -4,
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
                  whileTap={{ scale: 0.98 }}
                  onMouseEnter={() => preloadVideoAssets([course.videoUrl, course.previewVideoUrl, course.demoVideoUrl])}
                  onTouchStart={() => preloadVideoAssets([course.videoUrl, course.previewVideoUrl, course.demoVideoUrl])}
                  onClick={() => setSelectedDetailsCourse(course)}
                  className="glass-panel-light hover-lift hover:border-[#39FF14]/30 rounded-2xl p-3 flex flex-col transition-all duration-300 relative group overflow-hidden cursor-pointer"
                >
                  {/* Floating Action Cards decorative overlay */}
                  <div className="absolute -top-12 -right-12 w-24 h-24 bg-gradient-to-br from-[#39FF14]/10 to-transparent blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />

                  {/* Course Thumbnail */}
                  <div className="relative w-full h-36 rounded-xl overflow-hidden border border-white/5">
                    <img 
                      src={course.thumbnail?.trim() || undefined} 
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
                      {/* Instructor, Rating & Timestamp Metadata */}
                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                        <span className="truncate max-w-[55%]">👨‍🏫 {course.instructor}</span>
                        <div className="flex items-center space-x-2 shrink-0">
                          {/* Timestamp Metadata Display */}
                          {(() => {
                            let dateBadge = '2026';
                            try {
                              if (course.updatedAt) {
                                const d = typeof course.updatedAt.toDate === 'function' ? course.updatedAt.toDate() : new Date(course.updatedAt);
                                if (!isNaN(d.getTime())) dateBadge = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                              } else if (course.lastUpdated) {
                                dateBadge = course.lastUpdated;
                              } else if (course.createdAt) {
                                const d = typeof course.createdAt.toDate === 'function' ? course.createdAt.toDate() : new Date(course.createdAt);
                                if (!isNaN(d.getTime())) dateBadge = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                              }
                            } catch (e) {
                              dateBadge = 'Aug 2026';
                            }
                            return (
                              <span className="flex items-center space-x-1 text-[9px] text-slate-400 bg-white/5 border border-white/5 px-1.5 py-0.5 rounded">
                                <Calendar size={9} className="text-[#39FF14]" />
                                <span>{dateBadge}</span>
                              </span>
                            );
                          })()}

                          <span className="flex items-center text-amber-400 font-bold">
                            <Star size={10} fill="currentColor" className="mr-0.5" />
                            <span>{(typeof course.rating === 'number' ? course.rating : Number(course.rating) || 5.0).toFixed(1)}</span>
                          </span>
                        </div>
                      </div>

                      {/* Course Title */}
                      <h3 className="text-xs font-semibold text-white tracking-tight mt-1.5 leading-snug group-hover:text-[#39FF14] transition-colors line-clamp-2">
                        {course.title}
                      </h3>

                      {/* Details row: Duration, Modules, Level */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[9px] font-mono text-slate-400">
                        <span className="flex items-center bg-white/[0.03] border border-white/5 px-1.5 py-0.5 rounded">
                          <Clock size={10} className="text-[#39FF14] mr-1" />
                          <span>{course.duration || '12 Hours'}</span>
                        </span>
                        <span className="flex items-center bg-white/[0.03] border border-white/5 px-1.5 py-0.5 rounded">
                          <BookOpen size={10} className="text-slate-400 mr-1" />
                          <span>
                            {course.curriculum?.reduce((acc, c) => acc + (c.lessons?.length || 0), 0) ||
                             course.sections?.reduce((acc, s) => acc + (s.lessons?.length || 0), 0) || 12} Lectures
                          </span>
                        </span>
                        <span className="flex items-center bg-white/[0.03] border border-white/5 px-1.5 py-0.5 rounded">
                          <Users size={10} className="text-slate-500 mr-1" />
                          <span>{course.students?.toLocaleString() || 0}</span>
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-[8px] uppercase">
                          {course.level}
                        </span>
                      </div>

                      {/* Study Time Investment Tracker Box */}
                      {(() => {
                        // Extract study hours for investment calculation
                        const rawDur = course.duration || '10 Hours';
                        let estHours = 10;
                        const match = rawDur.match(/(\d+(\.\d+)?)/);
                        if (match) {
                          const val = parseFloat(match[1]);
                          estHours = rawDur.toLowerCase().includes('min') ? Math.max(0.5, Math.round((val / 60) * 10) / 10) : val;
                        }
                        const weeklyInvestment = estHours > 12 
                          ? `~${Math.round(estHours / 4)} hrs/wk (4 wks)` 
                          : estHours > 4 
                          ? `~${Math.round(estHours / 2)} hrs/wk (2 wks)` 
                          : `~${estHours} hrs (Self-paced)`;

                        const cProgress = userCourseProgressMap[course.courseId];
                        const cLessons = userLessonProgressMap[course.courseId] || [];
                        const maxLessonPct = cLessons.reduce((max, l) => Math.max(max, l.watchedPercentage || 0), 0);
                        const watchPct = Math.min(100, Math.max(cProgress?.progressPercent || 0, maxLessonPct));
                        const watchedMins = Math.round((watchPct * estHours * 60) / 100);

                        return (
                          <div className="mt-2.5 p-2 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
                            <div className="flex items-center justify-between text-[9px] font-mono">
                              <span className="text-slate-300 flex items-center space-x-1">
                                <Hourglass size={10} className="text-[#39FF14]" />
                                <span className="text-slate-400">Study Investment:</span>
                                <span className="text-slate-200 font-semibold">{weeklyInvestment}</span>
                              </span>
                              {isEnrolled ? (
                                <span className="text-[#39FF14] font-bold text-[9px]">
                                  {watchedMins > 60 ? `${(watchedMins / 60).toFixed(1)}h` : `${watchedMins}m`} / {estHours}h
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[8px] uppercase tracking-wider bg-white/5 px-1 py-0.2 rounded">
                                  {estHours}h Total
                                </span>
                              )}
                            </div>

                            {/* Watch Progress / Time Investment Bar */}
                            {(isEnrolled || watchPct > 0) && (
                              <div className="space-y-1 pt-0.5">
                                <div className="flex justify-between items-center text-[8px] font-mono text-slate-400">
                                  <span>Progress</span>
                                  <span className="text-[#39FF14] font-bold">{watchPct}%</span>
                                </div>
                                <div className="w-full bg-white/10 rounded-full h-1 overflow-hidden">
                                  <div 
                                    className="bg-gradient-to-r from-[#39FF14] to-emerald-400 h-full rounded-full transition-all duration-500"
                                    style={{ width: `${watchPct}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Price, Share, Resume & Enroll Buttons */}
                    <div className="mt-3.5 pt-2.5 border-t border-white/5 flex items-center justify-between gap-2">
                      <div className="flex items-baseline space-x-1.5 shrink-0">
                        {hasDiscount ? (
                          <>
                            <span className="text-sm font-bold text-[#39FF14] font-mono">
                              ৳{course.discountPrice?.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-slate-500 line-through font-mono">
                              ৳{course.price?.toLocaleString()}
                            </span>
                          </>
                        ) : (
                          <span className="text-sm font-bold text-white font-mono">
                            {course.price === 0 ? 'FREE' : `৳${course.price?.toLocaleString()}`}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-none">
                        {/* Resume Button if user has watched or started watching */}
                        {(() => {
                          const cLessons = userLessonProgressMap[course.courseId] || [];
                          const latestWatched = cLessons
                            .filter(l => (l.lastPositionSeconds && l.lastPositionSeconds > 0) || (l.watchedPercentage && l.watchedPercentage > 0))
                            .sort((a, b) => new Date(b.lastUpdated || 0).getTime() - new Date(a.lastUpdated || 0).getTime())[0];

                          const formatTime = (secs?: number) => {
                            if (!secs || secs <= 0) return '00:00';
                            const m = Math.floor(secs / 60);
                            const s = Math.floor(secs % 60);
                            return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                          };

                          if (isEnrolled && latestWatched) {
                            return (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedResumeLesson({
                                    lessonId: latestWatched.lessonId,
                                    initialTime: latestWatched.lastPositionSeconds || 0
                                  });
                                  setActiveLearningCourse(course);
                                }}
                                className="px-3 py-2 bg-gradient-to-r from-[#39FF14] to-emerald-400 hover:brightness-110 text-black font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all duration-300 cursor-pointer flex items-center space-x-1 shadow-[0_2px_10px_rgba(57,255,20,0.3)] shrink-0 animate-pulse"
                                title={`Resume at ${formatTime(latestWatched.lastPositionSeconds)}`}
                              >
                                <Play size={10} className="fill-black" />
                                <span>Resume ({formatTime(latestWatched.lastPositionSeconds)})</span>
                              </button>
                            );
                          }
                          return null;
                        })()}

                        {/* Share Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShareCourse(course);
                          }}
                          className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer shrink-0"
                          title="Share Academic link"
                        >
                          <Share2 size={12} />
                        </button>

                        {/* Enroll / Workspace Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEnrollClick(course);
                          }}
                          className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center space-x-1 shrink-0 ${
                            isPending
                              ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400'
                              : isEnrolled 
                              ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-900/50' 
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
              <div className="text-center pt-3 pb-2">
                {isLoadingMore ? (
                  <div className="max-w-md mx-auto my-2">
                    <EliteLoading
                      variant="card"
                      compact
                      label="SCANNING NEXT ACADEMIC BATCH"
                      subLabel="FETCHING ADDITIONAL COURSES FROM SCHOLAR MATRIX..."
                    />
                  </div>
                ) : (
                  <button
                    onClick={handleLoadMorePrograms}
                    className="px-6 py-2.5 bg-slate-900/80 hover:bg-slate-800 border border-[#39FF14]/30 hover:border-[#39FF14]/60 rounded-xl text-xs font-mono font-bold tracking-wider uppercase text-slate-200 transition-all cursor-pointer shadow-[0_0_15px_rgba(57,255,20,0.1)] hover:scale-105 active:scale-95 inline-flex items-center space-x-2"
                  >
                    <RotateCw size={14} className="text-[#39FF14]" />
                    <span>Load More Programs...</span>
                  </button>
                )}
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

      <footer className="mt-8 pt-4 pb-2 text-center font-mono text-[9px] text-slate-500 tracking-wider">
        NEXUS PORTAL • STUDY COURSE DISCOVERY SYSTEM
      </footer>

      {/* ================= PERSISTENT BOTTOM NAVIGATION BAR (Auto-hides on scroll down, reveals on scroll up) ================= */}
      <div 
        className={`sticky bottom-0 z-40 pt-1 pb-1 sm:pt-1.5 sm:pb-1.5 bg-[#0a0f1d]/95 backdrop-blur-xl border-t border-white/10 shadow-2xl rounded-2xl -mx-1 px-1 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isBarsVisible 
            ? 'translate-y-0 opacity-100 pointer-events-auto' 
            : 'translate-y-[135%] opacity-0 pointer-events-none'
        }`}
      >
        <div className="glass-panel rounded-2xl p-1.5 flex items-center justify-around">
          {/* Catalog / Discover Tab */}
          <button
            onClick={() => setActiveTab('discover')}
            className={`flex-1 py-1.5 rounded-xl flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer ${
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
            className={`flex-1 py-1.5 rounded-xl flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer ${
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

          {/* Live Classes Tab */}
          <button
            onClick={() => setActiveTab('live-classes')}
            className={`flex-1 py-1.5 rounded-xl flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer ${
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
          
          {/* Profile Tab */}
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-1.5 rounded-xl flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer ${
              activeTab === 'profile' || activeTab === 'certificates' || activeTab === 'community' || activeTab === 'account-details' || activeTab === 'privacy-security' || activeTab === 'help-support'
                ? 'bg-white/5 border border-[#39FF14]/30 text-[#39FF14]'
                : 'text-slate-400 hover:text-white border border-transparent'
            }`}
          >
            <div className="w-5 h-5 rounded-full overflow-hidden border border-current flex items-center justify-center">
               {userProfile?.photoURL?.trim() ? <img src={userProfile.photoURL.trim()} alt="Profile" className="w-full h-full object-cover" /> : <User size={16} />}
            </div>
            <span className="text-[9px] font-mono font-bold tracking-wider uppercase">Profile</span>
          </button>
        </div>
      </div>

      {/* Notification and Preferences Sidebar Drawer */}
      <NotificationCenter
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        onShowNotification={onShowNotification}
        onNavigateToTab={(tab) => setActiveTab(tab)}
        onSelectCourseById={handleSelectCourseById}
        userId={auth.currentUser?.uid || userProfile?.username || 'guest_user'}
        userProfile={userProfile}
        notifications={dbNotifications}
      />

      {/* AI Study Assistant */}
      <AiAssistantFAB 
        isOpen={isAiChatOpen} 
        isVisible={true}
        onClick={() => setIsAiChatOpen(true)} 
      />
      
      <AnimatePresence>
        {isAiChatOpen && (
          <AiChatView 
            onClose={() => setIsAiChatOpen(false)} 
            userProfile={userProfile}
            onShowNotification={onShowNotification}
          />
        )}
        
        {isRewardsOpen && (
          <RewardsView onClose={() => setIsRewardsOpen(false)} />
        )}

        {isChestOpen && (
          <DailyMysteryChestModal
            isOpen={isChestOpen}
            onClose={() => setIsChestOpen(false)}
            userId={auth.currentUser?.uid || userProfile?.username || 'scholar'}
            onRewardClaimed={() => {
              window.dispatchEvent(new Event('nexus_xp_updated'));
            }}
            onShowNotification={onShowNotification}
          />
        )}

        {isFocusTimerOpen && (
          <SmartFocusTimerModal
            isOpen={isFocusTimerOpen}
            onClose={() => setIsFocusTimerOpen(false)}
            userId={auth.currentUser?.uid || userProfile?.username || 'scholar'}
            onShowNotification={onShowNotification}
          />
        )}

        {isStoreOpen && (
          <XpStoreModal
            isOpen={isStoreOpen}
            onClose={() => setIsStoreOpen(false)}
            userId={auth.currentUser?.uid || userProfile?.username || 'scholar'}
            currentUserXP={userXPVal}
            onXPUpdated={(newXP) => {
              setUserXPVal(newXP);
              window.dispatchEvent(new Event('nexus_xp_updated'));
            }}
            onShowNotification={onShowNotification}
          />
        )}

        {isLeagueOpen && (
          <WeeklyLeagueModal
            isOpen={isLeagueOpen}
            onClose={() => setIsLeagueOpen(false)}
            userId={auth.currentUser?.uid || userProfile?.username || 'scholar'}
            userXP={userXPVal}
            userName={userProfile?.fullName || userProfile?.username || 'You'}
            userProfile={userProfile}
          />
        )}

        {isGameOpen && (
          <SpeedMatchGameModal
            isOpen={isGameOpen}
            onClose={() => setIsGameOpen(false)}
            userId={auth.currentUser?.uid || userProfile?.username || 'scholar'}
            onXPUpdated={(newXP) => {
              setUserXPVal(newXP);
              window.dispatchEvent(new Event('nexus_xp_updated'));
            }}
            onShowNotification={onShowNotification}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default CourseDiscoveryView;
