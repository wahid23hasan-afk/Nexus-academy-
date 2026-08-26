import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Trash2, 
  Search, 
  Settings, 
  Award, 
  BookOpen, 
  CreditCard, 
  HelpCircle, 
  Video, 
  Megaphone, 
  Gift, 
  RefreshCw, 
  Play, 
  FileText, 
  AlertTriangle, 
  X, 
  Send, 
  Smartphone,
  SlidersHorizontal,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';
import { Notification, NotificationCategory, NotificationType, NotificationSetting } from '../types/notification';
import { notificationService, getSafeTimestamp } from '../services/notificationService';
import { auth } from '../services/firebase';
import { EliteLoading } from './EliteLoading';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onShowNotification: (message: string, type: 'success' | 'error') => void;
  onNavigateToTab: (tab: 'discover' | 'my-courses' | 'certificates') => void;
  onSelectCourseById: (courseId: string) => void;
  userId?: string;
  userProfile?: { fullName?: string; username?: string; photoURL?: string } | null;
  notifications?: Notification[];
}

export function NotificationCenter({ 
  isOpen, 
  onClose, 
  onShowNotification,
  onNavigateToTab,
  onSelectCourseById,
  userId = '',
  userProfile,
  notifications: notificationsProp
}: NotificationCenterProps) {
  const [activeTab, setActiveTab] = useState<'notifications' | 'preferences'>('notifications');
  const [notifications, setNotifications] = useState<Notification[]>(notificationsProp || []);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<NotificationCategory | 'all'>('all');
  const [settings, setSettings] = useState<NotificationSetting | null>(null);
  const [loading, setLoading] = useState<boolean>(!notificationsProp);
  const [expandedNotifId, setExpandedNotifId] = useState<string | null>(null);

  // Sync with prop when provided
  useEffect(() => {
    if (notificationsProp) {
      setNotifications(notificationsProp);
      setLoading(false);
    }
  }, [notificationsProp]);
  
  // Sandbox Simulator State
  const [simulatedType, setSimulatedType] = useState<NotificationType>('Live Class Reminder');
  const [simulatedTitle, setSimulatedTitle] = useState<string>('🔴 Python Live Coding session is starting!');
  const [simulatedMessage, setSimulatedMessage] = useState<string>('Join Dr. Zafar in the interactive workspace. Bring your assignments.');
  const [simulating, setSimulating] = useState<boolean>(false);

  // Format Time Ago
  const formatTimeAgo = (createdAt: any) => {
    if (!createdAt) return 'Recently';
    try {
      let date: Date;
      if (typeof createdAt === 'string') {
        date = new Date(createdAt);
      } else if (typeof createdAt === 'number') {
        date = new Date(createdAt);
      } else if (createdAt && typeof createdAt.toDate === 'function') {
        date = createdAt.toDate();
      } else if (createdAt && typeof createdAt.seconds === 'number') {
        date = new Date(createdAt.seconds * 1000);
      } else {
        date = new Date(createdAt);
      }

      if (isNaN(date.getTime())) {
        return 'Recently';
      }

      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch (e) {
      return 'Recently';
    }
  };

  // Subscribe to real-time notifications from Firestore
  useEffect(() => {
    const effectiveUserId = userId || auth.currentUser?.uid || (userProfile as any)?.uid || userProfile?.username || 'guest_user';
    const effectiveEmail = auth.currentUser?.email || (userProfile as any)?.email || userProfile?.username || undefined;
    const effectiveName = userProfile?.fullName || auth.currentUser?.displayName || undefined;

    setLoading(true);
    const unsubscribe = notificationService.listenToNotifications(
      effectiveUserId, 
      (list) => {
        setNotifications(list);
        setLoading(false);
      }, 
      effectiveEmail, 
      effectiveName
    );

    // Load custom notification settings
    if (effectiveUserId && effectiveUserId !== 'guest_user') {
      notificationService.getNotificationSettings(effectiveUserId).then((res) => {
        setSettings(res);
      }).catch((err) => {
        console.warn('Silent settings fetch failure:', err);
      });
    }

    return () => unsubscribe();
  }, [userId, userProfile]);

  // Handle setting updates
  const handleToggleSetting = async (key: keyof Omit<NotificationSetting, 'userId' | 'updatedAt'>) => {
    if (!settings || !userId) return;
    const updatedValue = !settings[key];
    const newSettings = { ...settings, [key]: updatedValue };
    setSettings(newSettings);

    try {
      await notificationService.saveNotificationSettings(userId, { [key]: updatedValue });
      onShowNotification('Preferences updated in Firestore.', 'success');
    } catch (err) {
      onShowNotification('Failed to update settings.', 'error');
    }
  };

  // Mark single as read
  const handleMarkRead = async (notif: Notification) => {
    if (!notif.unread) return;
    // Optimistic local state update
    setNotifications(prev => prev.map(n => n.notificationId === notif.notificationId ? { ...n, unread: false } : n));
    const effectiveEmail = auth.currentUser?.email || userProfile?.username || undefined;
    const effectiveUid = userId || auth.currentUser?.uid || userProfile?.username || 'guest_user';
    try {
      await notificationService.markAsRead(notif.notificationId, effectiveUid, effectiveEmail);
    } catch (err) {
      console.error(err);
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    const unreadNotifs = notifications.filter(n => n.unread).map(n => ({
      notificationId: n.notificationId,
      userId: n.userId
    }));
    if (unreadNotifs.length === 0) return;
    
    // Optimistic local state update immediately
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));

    const effectiveEmail = auth.currentUser?.email || userProfile?.username || undefined;
    const effectiveUid = userId || auth.currentUser?.uid || userProfile?.username || 'guest_user';

    try {
      await notificationService.markAllAsRead(effectiveUid, unreadNotifs, effectiveEmail);
      if (selectedCategory === 'unread') {
        setSelectedCategory('all');
      }
      onShowNotification('All marked as read.', 'success');
    } catch (err) {
      onShowNotification('Failed to mark all as read.', 'error');
    }
  };

  // Delete notification
  const handleDeleteNotif = async (id: string) => {
    // Optimistic local state update
    setNotifications(prev => prev.filter(n => n.notificationId !== id));
    try {
      await notificationService.deleteNotification(id);
      onShowNotification('Notification cleared.', 'success');
    } catch (err) {
      onShowNotification('Failed to delete notification.', 'error');
    }
  };

  // Trigger simulated FCM notification
  const handleSimulateFCM = async () => {
    if (!userId) return;
    setSimulating(true);
    try {
      await notificationService.simulateFCMNotificationTrigger(
        userId,
        simulatedType,
        simulatedTitle,
        simulatedMessage
      );
      onShowNotification(`FCM Simulated: "${simulatedType}" dispatched.`, 'success');
    } catch (err) {
      onShowNotification('FCM simulation failed.', 'error');
    } finally {
      setSimulating(false);
    }
  };

  // Pre-load simulator presets
  const handlePresetSelect = (type: NotificationType) => {
    setSimulatedType(type);
    switch (type) {
      case 'Live Class Reminder':
        setSimulatedTitle('🔴 Python Live Coding session is starting!');
        setSimulatedMessage('Join Dr. Zafar in the interactive workspace. Bring your assignments.');
        break;
      case 'Course Update':
        setSimulatedTitle('📚 New Material Added: IELTS Writing');
        setSimulatedMessage('Ms. Sarah added 5 model essays with band 9 breakdowns to resources.');
        break;
      case 'New Course':
        setSimulatedTitle('🎓 Brand New Course: Next.js Specialization');
        setSimulatedMessage('Master Server Actions, App Router, and Edge DB deployments. Enroll now.');
        break;
      case 'Quiz Reminder':
        setSimulatedTitle('✍️ Pending Assessment: Physics Quiz 3');
        setSimulatedMessage('Do not break your streak! Spend 10 minutes checking your thermodynamics retention.');
        break;
      case 'Certificate Available':
        setSimulatedTitle('🏆 Certified Scholar: Web Foundations');
        setSimulatedMessage('Your secure digital certificate has been issued and cataloged.');
        break;
      case 'Promotional Offer':
        setSimulatedTitle('⚡ Flash Special: 60% Checkout Discount');
        setSimulatedMessage('Upgrade your academic subscription before the campaign coupon expires at midnight.');
        break;
      case 'Maintenance Notice':
        setSimulatedTitle('🛠️ System Update Scheduled');
        setSimulatedMessage('Nexus learning servers will cycle for security upgrades on Sunday at 3 AM UTC.');
        break;
      default:
        setSimulatedTitle('📢 Platform Notification Bulletin');
        setSimulatedMessage('Please check your academic settings panel for critical alerts.');
    }
  };

  // Handle click on notification: Mark as read & toggle expand/open to read full message
  const handleNotificationClick = async (notif: Notification) => {
    await handleMarkRead(notif);
    setExpandedNotifId(prev => prev === notif.notificationId ? null : notif.notificationId);
  };

  // Explicit action navigation button inside expanded notification
  const handleNavigateWorkspace = (e: React.MouseEvent, notif: Notification) => {
    e.stopPropagation();
    onClose();

    if (notif.relatedPage) {
      if (notif.relatedPage === 'certificates') {
        onNavigateToTab('certificates');
        onShowNotification('Deep-linked to My Certificates.', 'success');
      } else if (notif.relatedPage === 'courses' || notif.relatedPage === 'course-details') {
        if (notif.targetId) {
          onSelectCourseById(notif.targetId);
        } else {
          onNavigateToTab('discover');
        }
      } else if (notif.relatedPage === 'quiz') {
        onNavigateToTab('my-courses');
        onShowNotification('Deep-linked to Quiz assessment inside Course Workspace.', 'success');
      } else {
        onNavigateToTab('discover');
      }
    }
  };

  // Filter & Search Logic
  const filteredNotifications = notifications
    .filter((n) => Boolean(n && n.notificationId && (n.title || n.message)))
    .filter((n) => {
      // 1. Filter by Category Tab
      if (selectedCategory !== 'all') {
        const isCurrentlyExpanded = expandedNotifId === n.notificationId;
        if (selectedCategory === 'unread' && !n.unread && !isCurrentlyExpanded) return false;
        if (selectedCategory === 'read' && n.unread && !isCurrentlyExpanded) return false;
        if (selectedCategory !== 'unread' && selectedCategory !== 'read' && n.category !== selectedCategory) return false;
      }

      // 2. Filter by Search Query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        return (
          (n.title && n.title.toLowerCase().includes(q)) ||
          (n.message && n.message.toLowerCase().includes(q)) ||
          (n.type && n.type.toLowerCase().includes(q))
        );
      }

      return true;
    })
    .sort((a, b) => {
      const timeA = getSafeTimestamp(a.createdAt, a.notificationId);
      const timeB = getSafeTimestamp(b.createdAt, b.notificationId);
      if (timeB !== timeA) return timeB - timeA;
      return (b.notificationId || '').localeCompare(a.notificationId || '');
    });

  const getCategoryIcon = (type: NotificationType) => {
    switch (type) {
      case 'New Course':
        return <BookOpen size={14} className="text-emerald-400" />;
      case 'Course Update':
        return <RefreshCw size={14} className="text-blue-400" />;
      case 'New Lesson':
        return <Play size={14} className="text-[#39FF14]" />;
      case 'Live Class Reminder':
        return <Video size={14} className="text-purple-400" />;
      case 'Quiz Reminder':
        return <HelpCircle size={14} className="text-amber-400 animate-bounce" />;
      case 'Assignment Reminder':
        return <FileText size={14} className="text-amber-500" />;
      case 'Payment Success':
        return <CreditCard size={14} className="text-emerald-500" />;
      case 'Certificate Available':
        return <Award size={14} className="text-[#39FF14] drop-shadow-[0_0_3px_rgba(57,255,20,0.4)]" />;
      case 'Promotional Offer':
        return <Gift size={14} className="text-pink-400" />;
      case 'General Announcement':
        return <Megaphone size={14} className="text-cyan-400" />;
      case 'Maintenance Notice':
        return <AlertTriangle size={14} className="text-red-400 animate-pulse" />;
      default:
        return <Bell size={14} className="text-slate-400" />;
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] overflow-hidden flex justify-end w-screen h-[100dvh] top-0 left-0">
        {/* Backdrop glass */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        />

        {/* Panel Container */}
        <motion.div 
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="w-full max-w-sm bg-[#080d1a]/95 border-l border-white/10 h-full shadow-2xl relative z-10 flex flex-col"
        >
          {/* Header Panel */}
          <div className="p-4 border-b border-white/10 bg-slate-950/60 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell size={16} className="text-[#39FF14] animate-swing" />
              <h2 className="text-sm font-semibold text-white tracking-tight font-sans">
                Notification Workspace
              </h2>
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>

          {/* Sub Tab Switcher */}
          <div className="flex border-b border-white/5 bg-slate-950/20 px-2 pt-2">
            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex-1 py-2 text-xs font-mono font-bold tracking-wider uppercase border-b-2 transition-all cursor-pointer ${
                activeTab === 'notifications'
                  ? 'border-[#39FF14] text-white'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              Inbox ({notifications.filter(n => n.unread).length})
            </button>
            <button
              onClick={() => setActiveTab('preferences')}
              className={`flex-1 py-2 text-xs font-mono font-bold tracking-wider uppercase border-b-2 transition-all cursor-pointer ${
                activeTab === 'preferences'
                  ? 'border-[#39FF14] text-white'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              Settings & FCM
            </button>
          </div>

          {activeTab === 'notifications' ? (
            <>
              {/* Filter Tabs & Keyword Search */}
              <div className="p-3 border-b border-white/5 bg-[#0a0f1d] space-y-2">
                {/* Search Bar */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search in alert history..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/[0.02] border border-white/5 hover:border-white/10 focus:border-[#39FF14]/40 focus:ring-1 focus:ring-[#39FF14]/20 rounded-lg py-1.5 pl-8 pr-8 text-[10px] text-white placeholder-slate-500 outline-none transition-all font-sans"
                  />
                  <Search className="absolute left-2.5 top-2.5 text-slate-500" size={12} />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-slate-500 hover:text-white"
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>

                {/* Categories Scrollable Filters */}
                <div className="flex space-x-1.5 overflow-x-auto scrollbar-none pb-1">
                  {(['all', 'unread', 'read', 'learning', 'courses', 'payment', 'promotions'] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2 py-1 rounded-md text-[9px] font-mono capitalize shrink-0 transition-all cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-[#39FF14]/15 border border-[#39FF14]/30 text-[#39FF14] font-bold'
                          : 'bg-white/[0.02] border border-white/5 text-slate-400 hover:bg-white/[0.05]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Operations Bar */}
              <div className="px-4 py-2 border-b border-white/5 flex justify-between items-center bg-[#070c17]">
                <span className="text-[9px] font-mono text-slate-400">
                  Showing {filteredNotifications.length} items
                </span>
                {notifications.some(n => n.unread) && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[9px] font-mono text-[#39FF14] hover:underline flex items-center space-x-1 cursor-pointer"
                  >
                    <CheckCheck size={10} className="mr-0.5" />
                    <span>Mark All as Read</span>
                  </button>
                )}
              </div>

              {/* List Notifications */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-[#050912] scrollbar-thin">
                {loading ? (
                  <EliteLoading variant="card" compact label="SCANNING INBOX SIGNALS" subLabel="FETCHING REALTIME NOTIFICATIONS..." />
                ) : filteredNotifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-center space-y-2">
                    <div className="p-3 bg-white/5 rounded-full border border-white/10 text-slate-500">
                      <Bell size={20} />
                    </div>
                    <p className="text-[10px] font-mono text-slate-400">No matching notifications found.</p>
                  </div>
                ) : (
                  filteredNotifications.map((notif, index) => {
                    const isExpanded = expandedNotifId === notif.notificationId;

                    return (
                      <motion.div
                        layout
                        key={notif.notificationId ? `${notif.notificationId}_${index}` : `notif_${index}`}
                        onClick={() => handleNotificationClick(notif)}
                        className={`p-3 border rounded-xl relative overflow-hidden transition-all duration-300 group cursor-pointer ${
                          notif.unread
                            ? 'bg-[#39FF14]/5 border-[#39FF14]/25 shadow-[0_0_12px_rgba(57,255,20,0.05)]'
                            : isExpanded
                            ? 'bg-white/[0.04] border-[#39FF14]/40 shadow-md'
                            : 'bg-white/[0.01] border-white/5 opacity-80 hover:opacity-100 hover:bg-white/[0.03]'
                        }`}
                      >
                        {/* Left color ribbon for unread alerts */}
                        {notif.unread && (
                          <div className="absolute top-0 left-0 bottom-0 w-[3px] bg-[#39FF14]" />
                        )}

                        <div className="flex items-start space-x-2.5">
                          <div className={`mt-0.5 p-1.5 rounded-lg border flex items-center justify-center shrink-0 ${
                            notif.unread ? 'bg-[#39FF14]/10 border-[#39FF14]/20' : 'bg-white/5 border-white/5'
                          }`}>
                            {getCategoryIcon(notif.type)}
                          </div>

                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-[8px] font-mono text-slate-400 tracking-wider uppercase bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                                {notif.type}
                              </span>
                              <div className="flex items-center space-x-1.5">
                                <span className="text-[8px] font-mono text-slate-500">
                                  {formatTimeAgo(notif.createdAt)}
                                </span>
                                {isExpanded ? (
                                  <ChevronUp size={12} className="text-[#39FF14]" />
                                ) : (
                                  <ChevronDown size={12} className="text-slate-500 group-hover:text-slate-300" />
                                )}
                              </div>
                            </div>

                            <h4 className="text-[11px] font-semibold text-white leading-snug font-sans group-hover:text-[#39FF14] transition-colors">
                              {notif.title}
                            </h4>

                            {/* Message preview or expanded readable message */}
                            <p className={`text-[10px] text-slate-300 font-sans ${
                              isExpanded ? 'leading-relaxed text-slate-200 pt-1 border-t border-white/5 mt-1' : 'line-clamp-2 leading-normal'
                            }`}>
                              {notif.message}
                            </p>

                            {/* Expanded Action & Navigation Details */}
                            {isExpanded && (
                              <div className="pt-2 flex items-center justify-between border-t border-white/10 mt-2">
                                {notif.relatedPage ? (
                                  <button
                                    onClick={(e) => handleNavigateWorkspace(e, notif)}
                                    className="text-[9px] font-mono font-semibold text-[#39FF14] bg-[#39FF14]/10 hover:bg-[#39FF14]/20 border border-[#39FF14]/30 px-2.5 py-1 rounded-lg flex items-center space-x-1 transition-all cursor-pointer"
                                  >
                                    <span>Navigate workspace</span>
                                    <ExternalLink size={10} />
                                  </button>
                                ) : (
                                  <span className="text-[8px] font-mono text-slate-500">Read & saved</span>
                                )}

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteNotif(notif.notificationId);
                                  }}
                                  className="text-[9px] font-mono text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 py-1 rounded border border-red-500/20 transition-all cursor-pointer flex items-center space-x-1"
                                  title="Delete notification"
                                >
                                  <Trash2 size={10} />
                                  <span>Remove</span>
                                </button>
                              </div>
                            )}

                            {!isExpanded && notif.relatedPage && (
                              <div className="text-[8px] font-mono text-[#39FF14] flex items-center space-x-1 pt-0.5">
                                <span>Click to read details</span>
                                <span>→</span>
                              </div>
                            )}
                          </div>

                          {/* Quick delete trash button */}
                          {!isExpanded && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteNotif(notif.notificationId);
                              }}
                              className="p-1 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded-md transition-all self-center opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer shrink-0"
                              title="Delete notification"
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            /* PREFERENCES & FCM SIMULATOR WORKSPACE */
            <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-[#050912] scrollbar-thin">
              {/* Preferences list */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2 pb-1 border-b border-white/10">
                  <SlidersHorizontal size={13} className="text-[#39FF14]" />
                  <h3 className="text-[10px] font-mono font-bold tracking-wider text-slate-300 uppercase">
                    Delivery Prefs
                  </h3>
                </div>

                {settings ? (
                  <div className="space-y-2.5">
                    {[
                      { key: 'courseUpdates', label: 'Course Announcements & Syllabi', desc: 'Syllabus adjustments and class additions' },
                      { key: 'quizReminders', label: 'Quiz & Retention Prompts', desc: 'Streak warnings and chapter test openings' },
                      { key: 'liveClassAlerts', label: 'Live Faculty Transmissions', desc: 'Alerts when live streams initiate' },
                      { key: 'certificateAlerts', label: 'Graduation Credentials', desc: 'Secure blockchain certificate releases' },
                      { key: 'generalAnnouncements', label: 'Academic Announcements', desc: 'Maintenance bulletins and scholarships' },
                      { key: 'marketingNotifications', label: 'Campaign Offers & Discounts', desc: 'Special coupon checks and promotions' },
                    ].map((item) => {
                      const settingKey = item.key as keyof Omit<NotificationSetting, 'userId' | 'updatedAt'>;
                      return (
                        <div 
                          key={item.key} 
                          className="flex items-start justify-between p-2 rounded-xl bg-white/[0.01] border border-white/5"
                        >
                          <div className="space-y-0.5 pr-2">
                            <h4 className="text-[10px] font-medium text-white font-sans">{item.label}</h4>
                            <p className="text-[8px] text-slate-400 font-sans leading-normal">{item.desc}</p>
                          </div>
                          <button
                            onClick={() => handleToggleSetting(settingKey)}
                            className={`w-7 h-4 rounded-full p-0.5 transition-colors shrink-0 cursor-pointer ${
                              settings[settingKey] ? 'bg-[#39FF14]' : 'bg-slate-800'
                            }`}
                          >
                            <div className={`w-3 h-3 rounded-full bg-slate-950 transition-transform ${
                              settings[settingKey] ? 'translate-x-3' : 'translate-x-0'
                            }`} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-24 bg-white/[0.01] rounded-xl animate-pulse" />
                )}
              </div>

              {/* FCM PUSH SIMULATION SANDBOX */}
              <div className="space-y-3 bg-slate-950/40 p-3 rounded-xl border border-white/10">
                <div className="flex items-center space-x-2 pb-1 border-b border-white/10">
                  <Smartphone size={13} className="text-[#39FF14]" />
                  <h3 className="text-[10px] font-mono font-bold tracking-wider text-slate-300 uppercase">
                    FCM Emulator
                  </h3>
                </div>

                <p className="text-[8px] text-slate-400 leading-normal font-sans">
                  The client simulates FCM registration and triggers live foreground/background push events. Pick a scenario below to inject real payloads into Firestore.
                </p>

                {/* Preset Dropdowns */}
                <div className="space-y-2 text-[9px] font-mono">
                  <div>
                    <label className="text-slate-400 block mb-1">Payload Type Preset</label>
                    <select
                      value={simulatedType}
                      onChange={(e) => handlePresetSelect(e.target.value as NotificationType)}
                      className="w-full bg-[#080d1a] border border-white/10 text-white rounded p-1 outline-none text-[9px]"
                    >
                      <option value="Live Class Reminder">Live Class Reminder</option>
                      <option value="New Course">New Course</option>
                      <option value="Course Update">Course Update</option>
                      <option value="Quiz Reminder">Quiz Reminder</option>
                      <option value="Certificate Available">Certificate Available</option>
                      <option value="Promotional Offer">Promotional Offer</option>
                      <option value="Maintenance Notice">Maintenance Notice</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Alert Title</label>
                    <input
                      type="text"
                      value={simulatedTitle}
                      onChange={(e) => setSimulatedTitle(e.target.value)}
                      className="w-full bg-[#080d1a] border border-white/10 text-white rounded p-1 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Alert Message Body</label>
                    <textarea
                      value={simulatedMessage}
                      onChange={(e) => setSimulatedMessage(e.target.value)}
                      rows={2}
                      className="w-full bg-[#080d1a] border border-white/10 text-white rounded p-1 outline-none resize-none"
                    />
                  </div>

                  <button
                    onClick={handleSimulateFCM}
                    disabled={simulating}
                    className="w-full bg-[#39FF14] text-slate-950 font-bold py-1.5 rounded flex items-center justify-center space-x-1.5 cursor-pointer hover:bg-opacity-90 disabled:opacity-50 text-[10px] uppercase font-sans mt-3 tracking-wider shadow-[0_0_12px_rgba(57,255,20,0.3)] transition-all"
                  >
                    <Send size={11} />
                    <span>{simulating ? 'Emulating...' : 'Dispatch FCM Payload'}</span>
                  </button>
                </div>
              </div>

              {/* Secure Registration Info */}
              <div className="p-2.5 rounded-xl border border-white/5 bg-slate-950/20 text-slate-400 space-y-1.5">
                <div className="flex items-center space-x-1 text-slate-300">
                  <Info size={11} className="text-[#39FF14]" />
                  <span className="text-[8px] font-mono uppercase font-bold">Secure FCM Registration</span>
                </div>
                <p className="text-[7.5px] leading-relaxed font-sans">
                  Permission request is executed securely via secure iframe channels. Once verified, local tokens log back receipts inside the <code>notificationHistory</code> ledger to monitor delivery failures.
                </p>
                <button
                  onClick={async () => {
                    try {
                      const t = await notificationService.registerPushMessagingToken(userId);
                      onShowNotification(`Device Token Registered: ${t.substring(0, 15)}...`, 'success');
                    } catch (e) {
                      onShowNotification('Failed to register device token.', 'error');
                    }
                  }}
                  className="text-[8px] font-mono text-[#39FF14] hover:underline uppercase block cursor-pointer"
                >
                  Request Push Permission Token
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
