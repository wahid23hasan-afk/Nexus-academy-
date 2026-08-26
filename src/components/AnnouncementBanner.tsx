import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Megaphone, X, AlertTriangle, Sparkles, ChevronRight, ChevronLeft, Bell } from 'lucide-react';
import { Announcement, Notification as DBNotification } from '../types/notification';
import { notificationService, getSafeTimestamp } from '../services/notificationService';
import { auth } from '../services/firebase';

interface BannerItem {
  id: string;
  title: string;
  message: string;
  createdAt: any;
  priority: 'emergency' | 'high' | 'normal';
  link?: string;
  isUnread?: boolean;
  type?: string;
}

export function AnnouncementBanner() {
  const [items, setItems] = useState<BannerItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const prevCountRef = useRef<number>(0);

  // Format Date helper
  const formatDate = (createdAt: any) => {
    if (!createdAt) return 'Just now';
    try {
      let d: Date;
      if (typeof createdAt === 'string' || typeof createdAt === 'number') {
        d = new Date(createdAt);
      } else if (createdAt && typeof createdAt.toDate === 'function') {
        d = createdAt.toDate();
      } else if (createdAt && typeof createdAt.seconds === 'number') {
        d = new Date(createdAt.seconds * 1000);
      } else {
        d = new Date(createdAt);
      }

      if (isNaN(d.getTime())) return 'Recently';

      const now = new Date();
      const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch (e) {
      return 'Recently';
    }
  };

  useEffect(() => {
    const uId = auth.currentUser?.uid || 'guest_user';
    const uEmail = auth.currentUser?.email || undefined;
    const uName = auth.currentUser?.displayName || undefined;

    let rawAnnouncements: Announcement[] = [];
    let rawNotifications: DBNotification[] = [];

    const mergeAndSort = () => {
      const combinedMap = new Map<string, BannerItem>();
      const dismissedIds = notificationService.getLocalDismissedAnnouncements();
      const readIds = notificationService.getLocalReadIds();

      // 1. Process Announcements (only non-dismissed ones)
      rawAnnouncements.forEach((a) => {
        if (a && a.announcementId && a.isActive !== false && !dismissedIds.has(a.announcementId)) {
          combinedMap.set(a.announcementId, {
            id: a.announcementId,
            title: a.title,
            message: a.message,
            createdAt: a.createdAt,
            priority: a.priority || 'normal',
            link: a.link,
            isUnread: true,
            type: 'Announcement'
          });
        }
      });

      // 2. Process Notifications (ONLY include if unread and not dismissed/read)
      rawNotifications.forEach((n) => {
        if (
          n && 
          n.notificationId && 
          (n.title || n.message) && 
          n.unread === true && 
          !readIds.has(n.notificationId) && 
          !dismissedIds.has(n.notificationId)
        ) {
          const existing = Array.from(combinedMap.values()).find(
            item => item.title === n.title && item.message === n.message
          );

          if (!existing) {
            combinedMap.set(n.notificationId, {
              id: n.notificationId,
              title: n.title,
              message: n.message,
              createdAt: n.createdAt,
              priority: n.category === 'announcements' ? 'high' : 'normal',
              link: n.relatedPage ? `#${n.relatedPage}` : undefined,
              isUnread: true,
              type: n.type || 'Message'
            });
          }
        }
      });

      const combinedList = Array.from(combinedMap.values());

      // STRICTLY SORT BY CREATED AT DESCENDING (NEWEST FIRST AT TOP)
      combinedList.sort((a, b) => {
        const timeA = getSafeTimestamp(a.createdAt, a.id);
        const timeB = getSafeTimestamp(b.createdAt, b.id);
        if (timeB !== timeA) return timeB - timeA;
        return (b.id || '').localeCompare(a.id || '');
      });

      setItems(combinedList);
    };

    // Listen to real-time announcements
    const unsubAnn = notificationService.listenToAnnouncements((annList) => {
      rawAnnouncements = annList;
      mergeAndSort();
    });

    // Listen to real-time notifications
    const unsubNotif = notificationService.listenToNotifications(uId, (notifList) => {
      rawNotifications = notifList;
      mergeAndSort();
    }, uEmail, uName);

    return () => {
      unsubAnn();
      unsubNotif();
    };
  }, []);

  // Auto-unhide banner and reset to index 0 (NEWEST FIRST) when new items arrive
  useEffect(() => {
    if (items.length > prevCountRef.current && prevCountRef.current > 0) {
      setIsDismissed(false);
      setCurrentIndex(0); // Always show newest item first
    }
    prevCountRef.current = items.length;
  }, [items.length]);

  useEffect(() => {
    setIsExpanded(false);
  }, [currentIndex]);

  // Auto-rotate every 7 seconds if not expanded
  useEffect(() => {
    if (items.length <= 1) return;

    const timer = setInterval(() => {
      if (!isExpanded) {
        setCurrentIndex((prev) => (prev + 1) % items.length);
      }
    }, 7000);

    return () => clearInterval(timer);
  }, [items.length, isExpanded]);

  const handlePrevItem = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (items.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const handleNextItem = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (items.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  const handleDismissCurrent = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!current) return;

    const uId = auth.currentUser?.uid || 'guest_user';
    const uEmail = auth.currentUser?.email || undefined;

    // Permanently record dismissal in local storage and Firestore
    await notificationService.dismissAnnouncement(uId, current.id);
    await notificationService.markAsRead(current.id, uId, uEmail);

    const updated = items.filter(it => it.id !== current.id);
    setItems(updated);
    if (updated.length === 0) {
      setIsDismissed(true);
    } else {
      setCurrentIndex(prev => prev % updated.length);
    }
  };

  if (isDismissed || items.length === 0) return null;

  const current = items[currentIndex] || items[0];

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'emergency':
        return {
          bg: 'bg-red-500/15 border-red-500/30 text-red-200',
          badge: 'bg-red-500 text-white shadow-[0_0_8px_rgba(239,68,68,0.5)]',
          icon: <AlertTriangle size={14} className="text-red-400 animate-pulse" />,
          titleStyle: 'text-red-400 font-bold',
        };
      case 'high':
        return {
          bg: 'bg-amber-500/10 border-amber-500/20 text-amber-100',
          badge: 'bg-amber-500 text-slate-950 font-bold',
          icon: <Sparkles size={14} className="text-amber-400" />,
          titleStyle: 'text-amber-400 font-semibold',
        };
      default:
        return {
          bg: 'bg-white/5 border-white/10 text-slate-200',
          badge: 'bg-[#39FF14]/20 text-[#39FF14] border border-[#39FF14]/30',
          icon: <Megaphone size={14} className="text-[#39FF14]" />,
          titleStyle: 'text-[#39FF14] font-medium',
        };
    }
  };

  const style = getPriorityStyle(current.priority);

  return (
    <div className="w-full max-w-lg mx-auto px-1.5 pt-2">
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.3 }}
          className={`flex items-start justify-between border rounded-2xl p-3 md:p-3.5 backdrop-blur-xl ${style.bg} relative overflow-hidden shadow-lg transition-all duration-300`}
        >
          {/* Top light bar indicator for emergency notices */}
          {current.priority === 'emergency' && (
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-500 via-amber-500 to-red-500 animate-pulse" />
          )}

          <div className="flex items-start space-x-3 pr-2 flex-1 min-w-0">
            <div className="mt-0.5 shrink-0 p-1.5 bg-white/5 rounded-lg border border-white/10 flex items-center justify-center">
              {style.icon}
            </div>

            <div 
              onClick={() => setIsExpanded(!isExpanded)}
              className="space-y-1 flex-1 min-w-0 cursor-pointer select-none"
            >
              <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                {current.isUnread && (
                  <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-full bg-red-500 text-white font-extrabold uppercase animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]">
                    NEW
                  </span>
                )}
                <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded-full uppercase font-bold tracking-wider ${style.badge}`}>
                  {current.priority === 'normal' ? 'ADMIN MESSAGE' : current.priority}
                </span>
                <span className="text-[9px] font-mono text-slate-400">
                  {formatDate(current.createdAt)}
                </span>
                {items.length > 1 && (
                  <span className="text-[8px] font-mono text-slate-400 font-bold bg-white/10 px-1.5 py-0.2 rounded-full">
                    {currentIndex + 1}/{items.length}
                  </span>
                )}
              </div>
              
              <h4 className={`text-xs leading-tight font-semibold ${isExpanded ? 'whitespace-normal break-words' : 'truncate'} ${style.titleStyle}`}>
                {current.title}
              </h4>
              
              <p className={`text-[11px] text-slate-200 leading-relaxed font-sans break-words ${isExpanded ? 'whitespace-normal' : 'line-clamp-2'}`}>
                {current.message}
              </p>
              
              <div className="flex items-center space-x-1 text-[9px] font-mono text-[#39FF14] hover:underline mt-1 pt-0.5">
                <span>{isExpanded ? '📖 Collapse message' : '📖 Click to read full message...'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1 shrink-0 mt-0.5 ml-1">
            {/* Step through older messages */}
            {items.length > 1 && (
              <div className="flex items-center space-x-0.5 mr-0.5">
                <button
                  type="button"
                  onClick={handlePrevItem}
                  className="p-1 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                  title="Previous message"
                >
                  <ChevronLeft size={13} />
                </button>
                <button
                  type="button"
                  onClick={handleNextItem}
                  className="p-1 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                  title="Next message"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            )}

            {current.link && (
              <a
                href={current.link}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 bg-white/5 border border-white/5 text-slate-400 hover:text-white rounded-lg transition-colors"
                title="Learn more"
              >
                <ChevronRight size={13} />
              </a>
            )}
            <button
              type="button"
              onClick={handleDismissCurrent}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all cursor-pointer"
              title="Close notification banner"
            >
              <X size={13} />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

