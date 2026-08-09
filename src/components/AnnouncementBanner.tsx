import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Megaphone, X, AlertTriangle, Sparkles, ChevronRight } from 'lucide-react';
import { Announcement } from '../types/notification';
import { notificationService } from '../services/notificationService';
import { auth } from '../services/firebase';

export function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Robust date formatting function that handles ISO string, millisecond number, and Firestore Timestamps
  const formatAnnouncementDate = (createdAt: any) => {
    if (!createdAt) return '';
    try {
      if (typeof createdAt === 'string') {
        return new Date(createdAt).toLocaleDateString();
      }
      if (typeof createdAt === 'number') {
        return new Date(createdAt).toLocaleDateString();
      }
      if (createdAt && typeof createdAt.toDate === 'function') {
        return createdAt.toDate().toLocaleDateString();
      }
      if (createdAt && typeof createdAt.seconds === 'number') {
        return new Date(createdAt.seconds * 1000).toLocaleDateString();
      }
      return new Date(createdAt).toLocaleDateString();
    } catch (e) {
      return '';
    }
  };

  useEffect(() => {
    // Read dismissed announcements from localStorage
    const saved = localStorage.getItem('nexus_dismissed_announcements');
    if (saved) {
      try {
        setDismissedIds(JSON.parse(saved));
      } catch (e) {
        console.warn('Failed parsing dismissed announcements');
      }
    }

    // Subscribe to announcements in Firestore
    const unsub = notificationService.listenToAnnouncements((list) => {
      setAnnouncements(list);
    });

    // Listen to auth state to fetch user-specific dismissed announcements from Firestore
    const unsubAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        notificationService.getDismissedAnnouncements(user.uid).then((firebaseDismissed) => {
          setDismissedIds((prev) => {
            const merged = Array.from(new Set([...prev, ...firebaseDismissed]));
            return merged;
          });
        });
      }
    });

    return () => {
      unsub();
      unsubAuth();
    };
  }, []);

  // Filter out dismissed announcements
  const activeAnnouncements = announcements.filter(
    (a) => !dismissedIds.includes(a.announcementId)
  );

  useEffect(() => {
    setIsExpanded(false);
  }, [currentIndex]);

  useEffect(() => {
    if (activeAnnouncements.length <= 1) return;

    const timer = setInterval(() => {
      if (!isExpanded) {
        setCurrentIndex((prev) => (prev + 1) % activeAnnouncements.length);
      }
    }, 6000); // Rotate every 6 seconds, pause rotating if user expanded it

    return () => clearInterval(timer);
  }, [activeAnnouncements.length, isExpanded]);

  const handleDismiss = async (id: string) => {
    const updated = [...dismissedIds, id];
    setDismissedIds(updated);
    localStorage.setItem('nexus_dismissed_announcements', JSON.stringify(updated));

    // Persist to Firestore if user is authenticated
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        await notificationService.dismissAnnouncement(currentUser.uid, id);
      } catch (e) {
        console.warn('Failed to persist dismissed announcement to Firestore:', e);
      }
    }

    if (currentIndex >= activeAnnouncements.length - 1) {
      setCurrentIndex(0);
    }
  };

  if (activeAnnouncements.length === 0) return null;

  const current = activeAnnouncements[currentIndex] || activeAnnouncements[0];

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
          badge: 'bg-slate-800 text-slate-300 border border-white/5',
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
          key={current.announcementId}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.3 }}
          className={`flex items-start justify-between border rounded-2xl p-3 md:p-3.5 backdrop-blur-xl ${style.bg} relative overflow-hidden shadow-lg transition-all duration-300`}
        >
          {/* Subtle light bar for emergency notices */}
          {current.priority === 'emergency' && (
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-500 via-amber-500 to-red-500 animate-pulse" />
          )}

          <div className="flex items-start space-x-3 pr-2 flex-1 min-w-0">
            <div className="mt-0.5 shrink-0 p-1 bg-white/5 rounded-lg border border-white/10 flex items-center justify-center">
              {style.icon}
            </div>

            <div 
              onClick={() => setIsExpanded(!isExpanded)}
              className="space-y-1 flex-1 min-w-0 cursor-pointer select-none"
            >
              <div className="flex items-center space-x-2">
                <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded-full uppercase font-bold tracking-wider ${style.badge}`}>
                  {current.priority}
                </span>
                <span className="text-[9px] font-mono text-slate-400">
                  {formatAnnouncementDate(current.createdAt)}
                </span>
                {activeAnnouncements.length > 1 && (
                  <span className="text-[8px] font-mono text-slate-500">
                    ({currentIndex + 1}/{activeAnnouncements.length})
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
                <span>{isExpanded ? '📖 Collapse full message' : '📖 Click to read full message...'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1 shrink-0 mt-0.5 ml-1">
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
              onClick={() => handleDismiss(current.announcementId)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all cursor-pointer"
              title="Dismiss announcement"
            >
              <X size={13} />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
