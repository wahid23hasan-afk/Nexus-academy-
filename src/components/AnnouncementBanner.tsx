import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Megaphone, X, AlertTriangle, Sparkles, ChevronRight } from 'lucide-react';
import { Announcement } from '../types/notification';
import { notificationService } from '../services/notificationService';

export function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

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

    return () => unsub();
  }, []);

  // Filter out dismissed announcements
  const activeAnnouncements = announcements.filter(
    (a) => !dismissedIds.includes(a.announcementId)
  );

  useEffect(() => {
    if (activeAnnouncements.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeAnnouncements.length);
    }, 6000); // Rotate every 6 seconds

    return () => clearInterval(timer);
  }, [activeAnnouncements.length]);

  const handleDismiss = (id: string) => {
    const updated = [...dismissedIds, id];
    setDismissedIds(updated);
    localStorage.setItem('nexus_dismissed_announcements', JSON.stringify(updated));
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
          className={`flex items-center justify-between border rounded-2xl p-3 md:p-3.5 backdrop-blur-xl ${style.bg} relative overflow-hidden shadow-lg`}
        >
          {/* Subtle light bar for emergency notices */}
          {current.priority === 'emergency' && (
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-500 via-amber-500 to-red-500 animate-pulse" />
          )}

          <div className="flex items-start space-x-3 pr-4 flex-1">
            <div className="mt-0.5 shrink-0 p-1 bg-white/5 rounded-lg border border-white/10 flex items-center justify-center">
              {style.icon}
            </div>

            <div className="space-y-0.5 flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded-full uppercase font-bold tracking-wider ${style.badge}`}>
                  {current.priority}
                </span>
                <span className="text-[9px] font-mono text-slate-400">
                  {new Date(current.createdAt).toLocaleDateString()}
                </span>
                {activeAnnouncements.length > 1 && (
                  <span className="text-[8px] font-mono text-slate-500">
                    ({currentIndex + 1}/{activeAnnouncements.length})
                  </span>
                )}
              </div>
              <h4 className={`text-[11px] leading-tight truncate ${style.titleStyle}`}>
                {current.title}
              </h4>
              <p className="text-[10px] text-slate-300 leading-normal font-sans line-clamp-2">
                {current.message}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1 shrink-0">
            {current.link && (
              <a
                href={current.link}
                target="_blank"
                rel="noreferrer"
                className="p-1 bg-white/5 border border-white/5 text-slate-400 hover:text-white rounded-lg transition-colors"
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
