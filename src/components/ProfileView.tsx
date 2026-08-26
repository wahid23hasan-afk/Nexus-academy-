import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Award, Shield, CheckCircle2, ChevronRight, LogOut, Settings, HelpCircle, 
  UserCheck, Flame, Trophy, Share2, Mail, Compass, Star, ShieldCheck, MessageSquare, 
  Clock, CreditCard, XCircle, AlertTriangle, Sparkles, Check, Crown, Zap, Lock, Unlock, ShoppingBag, Edit3, X, Wallet
} from 'lucide-react';
import { InstructorPayoutModal } from './InstructorPayoutModal';
import { updateProfile } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { gamificationService } from '../services/gamificationService';
import { courseService } from '../services/courseService';
import { auth, db } from '../services/firebase';
import { progressService, CourseProgressInfo, LessonProgressInfo } from '../services/progressService';
import { AchievementTracker } from './AchievementTracker';
import { GamificationSummary } from './GamificationDashboard';
import { DEFAULT_STORE_ITEMS, StoreItem } from './XpStoreModal';
import { soundFxService } from '../services/soundFxService';
import { Course } from '../types/course';
import { EliteLoading } from './EliteLoading';

interface ProfileViewProps {
  userProfile: any;
  onLogout: () => void;
  onShowNotification: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  onOpenRewards: () => void;
  onNavigate: (route: string) => void;
  courses?: Course[];
  enrolledCourseIds?: string[];
  userCourseProgressMap?: Record<string, CourseProgressInfo>;
  userLessonProgressMap?: Record<string, LessonProgressInfo[]>;
  onOpenCourse?: (course: Course) => void;
}

export function ProfileView({
  userProfile,
  onLogout,
  onShowNotification,
  onOpenRewards,
  onNavigate,
  courses = [],
  enrolledCourseIds = [],
  userCourseProgressMap = {},
  userLessonProgressMap = {},
  onOpenCourse
}: ProfileViewProps) {
  const [isProfileLoading, setIsProfileLoading] = useState<boolean>(true);
  const [approvalStatus, setApprovalStatus] = useState<'Approved' | 'Pending' | 'Rejected'>('Approved');
  const [rejectedCount, setRejectedCount] = useState<number>(0);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [approvedCount, setApprovedCount] = useState<number>(0);
  const [activeFrame, setActiveFrame] = useState<string>('default');
  const [activeTitle, setActiveTitle] = useState<string>('');
  const [ownedItemIds, setOwnedItemIds] = useState<string[]>([]);
  const [unreadSupportCount, setUnreadSupportCount] = useState<number>(0);

  // Edit Profile States
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editFullName, setEditFullName] = useState<string>(userProfile?.fullName || '');
  const [editPhotoURL, setEditPhotoURL] = useState<string>(userProfile?.photoURL || '');
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);

  // Instructor Payout States
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState<boolean>(false);
  const [myPayoutRequests, setMyPayoutRequests] = useState<any[]>([]);

  // Role check guard: ONLY show IF user.role === 'instructor' OR user.role === 'admin'
  const userRole = userProfile?.role || userProfile?.userRole || (userProfile?.email === 'wahid23hasan@gmail.com' ? 'admin' : 'student');
  const isInstructorOrAdmin = userRole === 'instructor' || userRole === 'admin' || userRole === 'super_admin' || userProfile?.email === 'wahid23hasan@gmail.com';

  // Dynamic balance calculation for instructor earnings
  const initialInstructorBalance = 12500;
  const totalWithdrawn = myPayoutRequests
    .filter((req) => req.status === 'approved' || req.status === 'pending')
    .reduce((sum, req) => sum + (Number(req.amount) || 0), 0);
  const currentAvailableBalance = Math.max(0, initialInstructorBalance - totalWithdrawn);

  // Initial loading simulation for radar scanner animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsProfileLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  // Sync state when userProfile prop updates
  useEffect(() => {
    if (userProfile) {
      setEditFullName(userProfile.fullName || '');
      setEditPhotoURL(userProfile.photoURL || '');
    }
  }, [userProfile]);

  // Permanent Profile Update Handler
  const handleSaveProfile = async () => {
    if (!editFullName.trim()) {
      onShowNotification('Display name cannot be empty', 'error');
      return;
    }

    setIsSavingProfile(true);
    soundFxService.playXP();

    try {
      const user = auth.currentUser;
      const uid = user?.uid || userProfile?.uid || userProfile?.username || 'guest_user';

      // 1. Update Firebase Auth User Profile
      if (user) {
        try {
          await updateProfile(user, {
            displayName: editFullName.trim(),
            photoURL: editPhotoURL.trim() || undefined
          });
        } catch (authErr) {
          console.warn('Firebase Auth update notice:', authErr);
        }
      }

      // 2. Update Firestore User Document permanently
      if (uid) {
        try {
          await setDoc(doc(db, 'users', uid), {
            fullName: editFullName.trim(),
            photoURL: editPhotoURL.trim() || '',
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (fsErr) {
          console.warn('Firestore user update notice:', fsErr);
        }
      }

      // 3. LocalStorage persistence backup
      const updatedProfile = {
        ...userProfile,
        fullName: editFullName.trim(),
        photoURL: editPhotoURL.trim()
      };
      localStorage.setItem(`nexus_user_profile_${uid}`, JSON.stringify(updatedProfile));

      // 4. Dispatch custom event so App.tsx and all top headers update immediately
      window.dispatchEvent(new CustomEvent('nexus_profile_updated', {
        detail: {
          fullName: editFullName.trim(),
          photoURL: editPhotoURL.trim()
        }
      }));

      onShowNotification('Profile updated & permanently saved!', 'success');
      setIsEditModalOpen(false);
    } catch (err: any) {
      console.warn('Error saving profile:', err);
      onShowNotification('Failed to save profile changes: ' + (err.message || 'Error'), 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Real-time listener for support tickets unread admin replies
  useEffect(() => {
    const studentUserId = auth.currentUser?.uid || 'guest_student';
    if (!studentUserId) return;

    const q = query(
      collection(db, 'support_tickets'),
      where('userId', '==', studentUserId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let count = 0;
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.status === 'open' && Array.isArray(data.replies) && data.replies.length > 0) {
          const hasAdminReply = data.replies.some((r: any) => Boolean(r.adminId));
          if (hasAdminReply) {
            count += 1;
          }
        }
      });
      setUnreadSupportCount(count);
    }, (err) => {
      console.warn('Error fetching support ticket unread status:', err);
    });

    return () => unsubscribe();
  }, []);

  // Real-time listener for instructor payout requests
  useEffect(() => {
    const instructorUid = auth.currentUser?.uid;
    if (!instructorUid || !isInstructorOrAdmin) return;

    const q = query(
      collection(db, 'payout_requests'),
      where('instructorId', '==', instructorUid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requests: any[] = [];
      snapshot.forEach((docSnap) => {
        requests.push({ id: docSnap.id, ...docSnap.data() });
      });
      // Sort newest first
      requests.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setMyPayoutRequests(requests);
    }, (err) => {
      console.warn('Error fetching instructor payout requests:', err);
    });

    return () => unsubscribe();
  }, [isInstructorOrAdmin]);

  // Load owned badges / perks and currently equipped items
  const loadEquippedAndOwnedItems = async () => {
    const userId = auth.currentUser?.uid || userProfile?.username || 'guest_user';
    if (!userId) return;

    const ownedSet = new Set<string>();

    // 1. Check LocalStorage store purchases
    try {
      const savedPurchases = localStorage.getItem(`nexus_xp_store_${userId}`);
      if (savedPurchases) {
        const parsed = JSON.parse(savedPurchases);
        Object.keys(parsed).forEach(k => {
          if (parsed[k]) ownedSet.add(k);
        });
      }
      if (localStorage.getItem(`nexus_vip_pass_${userId}`) === 'true') {
        ownedSet.add('vip_scholar_pass');
      }
      const savedFrame = localStorage.getItem(`nexus_active_frame_${userId}`);
      if (savedFrame) setActiveFrame(savedFrame);

      const savedTitle = localStorage.getItem(`nexus_active_title_${userId}`);
      if (savedTitle) setActiveTitle(savedTitle);
    } catch (e) {
      console.warn('Error reading local perks:', e);
    }

    // 2. Check Firestore perks & user profile
    try {
      const perks = await gamificationService.getUserActivePerks(userId);
      perks.forEach(p => {
        if (p.itemId) ownedSet.add(p.itemId);
      });

      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.activeFrame) setActiveFrame(data.activeFrame);
        if (data.activeBadge) setActiveFrame(data.activeBadge);
        if (data.activeTitle) setActiveTitle(data.activeTitle);
        if (Array.isArray(data.purchasedPerks)) {
          data.purchasedPerks.forEach((id: string) => ownedSet.add(id));
        }
      }
    } catch (e) {
      console.warn('Error reading remote perks:', e);
    }

    setOwnedItemIds(Array.from(ownedSet));
  };

  useEffect(() => {
    loadEquippedAndOwnedItems();

    const handleStoreUpdate = () => {
      loadEquippedAndOwnedItems();
    };

    window.addEventListener('nexus_store_purchase_updated', handleStoreUpdate);
    window.addEventListener('nexus_xp_updated', handleStoreUpdate);
    return () => {
      window.removeEventListener('nexus_store_purchase_updated', handleStoreUpdate);
      window.removeEventListener('nexus_xp_updated', handleStoreUpdate);
    };
  }, [userProfile]);

  const handleToggleEquipItem = async (item: StoreItem) => {
    const userId = auth.currentUser?.uid || userProfile?.username || 'guest_user';
    if (!userId) return;

    soundFxService.playBadgeChime();

    if (item.category === 'frame' || item.id.startsWith('frame_') || item.id === 'vip_scholar_pass') {
      const newFrame = activeFrame === item.id ? 'default' : item.id;
      setActiveFrame(newFrame);
      localStorage.setItem(`nexus_active_frame_${userId}`, newFrame);
      try {
        await updateDoc(doc(db, 'users', userId), { activeFrame: newFrame, activeBadge: newFrame });
      } catch (e) {}
      onShowNotification(
        newFrame === 'default' ? `Default avatar frame restored` : `Equipped ${item.name} on Avatar!`,
        'success'
      );
    } else if (item.category === 'title' || item.id.startsWith('title_')) {
      const newTitle = activeTitle === item.name ? '' : item.name;
      setActiveTitle(newTitle);
      localStorage.setItem(`nexus_active_title_${userId}`, newTitle);
      try {
        await updateDoc(doc(db, 'users', userId), { activeTitle: newTitle });
      } catch (e) {}
      onShowNotification(
        newTitle === '' ? `Unequipped title` : `Equipped ${item.name} title!`,
        'success'
      );
    } else {
      // General perk/badge
      const newBadge = activeFrame === item.id ? 'default' : item.id;
      setActiveFrame(newBadge);
      localStorage.setItem(`nexus_active_frame_${userId}`, newBadge);
      try {
        await updateDoc(doc(db, 'users', userId), { activeFrame: newBadge, activeBadge: newBadge });
      } catch (e) {}
      onShowNotification(
        newBadge === 'default' ? `Badge unequipped` : `Equipped badge ${item.name} on Avatar!`,
        'success'
      );
    }
  };

  useEffect(() => {
    const checkApprovalStatus = async () => {
      const userId = auth.currentUser?.uid || userProfile?.username || 'guest_user';
      const userEmail = auth.currentUser?.email || userProfile?.email || userProfile?.username || '';

      try {
        const purchases = await courseService.getUserPurchases(userId, userEmail);
        const myCourses = await progressService.getUserMyCourses(userId, userEmail);

        const hasApproved = purchases.some(p => p.status === 'approved' || p.status === 'success' || p.status === 'active') || myCourses.length > 0;
        const hasPending = purchases.some(p => p.status === 'pending');
        const hasRejected = purchases.some(p => p.status === 'rejected' || p.status === 'failed');

        const rejNum = purchases.filter(p => p.status === 'rejected' || p.status === 'failed').length;
        const pendNum = purchases.filter(p => p.status === 'pending').length;
        const appNum = purchases.filter(p => p.status === 'approved' || p.status === 'success' || p.status === 'active').length;

        setRejectedCount(rejNum);
        setPendingCount(pendNum);
        setApprovedCount(appNum);

        if (hasRejected && !hasApproved) {
          setApprovalStatus('Rejected');
        } else if (hasPending && !hasApproved) {
          setApprovalStatus('Pending');
        } else if (hasRejected) {
          setApprovalStatus('Rejected');
        } else {
          setApprovalStatus('Approved');
        }
      } catch (e) {
        console.warn('Failed to compute student approval status:', e);
      }
    };

    checkApprovalStatus();

    const handleUpdate = () => {
      checkApprovalStatus();
    };

    window.addEventListener('nexus_purchases_updated', handleUpdate);
    return () => {
      window.removeEventListener('nexus_purchases_updated', handleUpdate);
    };
  }, [userProfile]);

  // Find user's owned store item objects
  const ownedStoreItems = DEFAULT_STORE_ITEMS.filter(item => ownedItemIds.includes(item.id));

  if (isProfileLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 min-h-[400px]">
        <EliteLoading
          variant="card"
          compact
          label="SCANNING SCHOLAR PROFILE & PERKS"
          subLabel="SYNCHRONIZING SCHOLAR CREDENTIAL MATRIX..."
        />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto pb-24 space-y-3.5 pt-2 px-2">
      {/* 1. USER LEVEL & STAGE BANNER - AT THE VERY TOP */}
      <section className="relative">
        <GamificationSummary onOpenRewards={onOpenRewards} />
      </section>

      {/* 2. PROFILE HEADER */}
      <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#39FF14]/10 rounded-full blur-[50px] -mr-10 -mt-10 pointer-events-none"></div>
        <div className="flex items-center space-x-3.5 relative z-10">
          
          {/* Avatar with dynamic frame styling and floating badge */}
          <div className="relative shrink-0">
            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 overflow-hidden flex items-center justify-center transition-all duration-300 relative ${
              activeFrame === 'frame_cyberpunk'
                ? 'border-2 border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.7)] ring-2 ring-[#39FF14]/50'
                : activeFrame === 'frame_gold_master'
                ? 'border-2 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.8)] ring-2 ring-yellow-300/60'
                : activeFrame === 'vip_scholar_pass'
                ? 'border-2 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.7)] ring-2 ring-purple-500/60'
                : activeFrame === 'title_quantum_scholar'
                ? 'border-2 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.7)]'
                : activeFrame === 'title_code_ninja'
                ? 'border-2 border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.7)]'
                : activeFrame !== 'default' && activeFrame
                ? 'border-2 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                : 'border-2 border-[#39FF14]/30 shadow-[0_0_15px_rgba(57,255,20,0.15)]'
            }`}>
              {userProfile?.photoURL?.trim() ? (
                <img src={userProfile.photoURL.trim()} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <User size={28} className="text-[#39FF14] drop-shadow-[0_0_8px_rgba(57,255,20,0.5)]" />
              )}
            </div>

            {/* Floating Equipped Badge Icon on Avatar */}
            {activeFrame !== 'default' && activeFrame && (
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-900 border border-amber-400/80 shadow-[0_0_10px_rgba(245,158,11,0.8)] flex items-center justify-center text-xs z-20"
                title="Equipped XP Perk"
              >
                {activeFrame === 'frame_gold_master' ? '👑' :
                 activeFrame === 'frame_cyberpunk' ? '✨' :
                 activeFrame === 'vip_scholar_pass' ? '🏆' :
                 activeFrame === 'title_code_ninja' ? '🥷' :
                 activeFrame === 'title_quantum_scholar' ? '⚛️' :
                 activeFrame === 'shield_streak_freeze' ? '🛡️' :
                 activeFrame === 'lesson_single_pass' ? '🔓' : '⭐'}
              </motion.div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between flex-wrap gap-1.5">
              <div className="flex items-center flex-wrap gap-1.5">
                <h2 className="text-base sm:text-lg font-bold text-white truncate">
                  {userProfile?.fullName || 'Scholar'}
                </h2>
                {activeTitle && (
                  <span className="bg-gradient-to-r from-amber-500/20 to-purple-500/20 border border-amber-400/40 text-amber-300 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold flex items-center shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                    <Sparkles size={10} className="mr-1 text-amber-400" />
                    {activeTitle}
                  </span>
                )}
                {userProfile?.username && !activeTitle && (
                  <span className="bg-[#39FF14]/20 text-[#39FF14] text-[9px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider hidden sm:inline-block">Pro Member</span>
                )}
              </div>

              {/* EDIT PROFILE BUTTON */}
              <button
                onClick={() => {
                  soundFxService.playClick();
                  setIsEditModalOpen(true);
                }}
                className="px-3 py-1.5 bg-[#39FF14]/15 hover:bg-[#39FF14]/25 border border-[#39FF14]/40 text-[#39FF14] rounded-xl text-xs font-mono font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-[0_0_12px_rgba(57,255,20,0.2)] hover:scale-105 active:scale-95 shrink-0"
              >
                <Edit3 size={13} />
                <span>Edit Profile</span>
              </button>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">@{userProfile?.username || 'user'}</p>
            <div className="flex items-center flex-wrap gap-1.5 mt-2">
              {/* Approval Status Badge */}
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold flex items-center border transition-all ${
                approvalStatus === 'Approved'
                  ? 'bg-[#39FF14]/15 border-[#39FF14]/40 text-[#39FF14] shadow-[0_0_10px_rgba(57,255,20,0.2)]'
                  : approvalStatus === 'Pending'
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)] animate-pulse'
                  : 'bg-red-500/20 border-red-500/40 text-red-300 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
              }`}>
                {approvalStatus === 'Approved' ? (
                  <ShieldCheck size={11} className="text-[#39FF14] mr-1" />
                ) : approvalStatus === 'Pending' ? (
                  <Clock size={11} className="text-amber-400 mr-1" />
                ) : (
                  <XCircle size={11} className="text-red-400 mr-1" />
                )}
                {approvalStatus === 'Approved' ? 'Approved Student' : approvalStatus === 'Pending' ? 'Pending Approval' : 'Payment Rejected'}
              </span>

              <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded text-slate-300 font-mono flex items-center">
                <CheckCircle2 size={10} className="text-[#39FF14] mr-1" />
                Verified
              </span>
              <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded text-slate-300 font-mono flex items-center truncate max-w-[150px] sm:max-w-none">
                <Mail size={10} className="text-slate-400 mr-1 shrink-0" />
                <span className="truncate">{auth.currentUser?.email}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* INSTRUCTOR EARNINGS & PAYOUT CARD - ROLE GUARD: ONLY INSTRUCTOR OR ADMIN */}
      {isInstructorOrAdmin && (
        <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/20 via-slate-900 to-slate-900 relative overflow-hidden space-y-3.5 shadow-[0_0_20px_rgba(245,158,11,0.1)]">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <Wallet size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">Instructor Earnings & Payout</h3>
                <p className="text-[10px] font-mono text-amber-400/80">ইন্সট্রাক্টর আয় ও উত্তোলন ড্যাশবোর্ড</p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-mono font-bold uppercase tracking-wider">
              🎓 Verified Instructor
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-slate-900/80 p-3 rounded-xl border border-white/5">
              <span className="text-[10px] font-mono text-slate-400 uppercase block">Total Course Revenue</span>
              <span className="text-base sm:text-lg font-bold font-mono text-emerald-400">৳ 45,500</span>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-xl border border-white/5">
              <span className="text-[10px] font-mono text-slate-400 uppercase block">Available Balance</span>
              <span className="text-base sm:text-lg font-bold font-mono text-amber-400">৳ {currentAvailableBalance.toLocaleString()}</span>
            </div>
          </div>

          <button
            onClick={() => setIsPayoutModalOpen(true)}
            className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-mono font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.3)] flex items-center justify-center space-x-2 hover:scale-[1.01] active:scale-[0.99]"
          >
            <CreditCard size={15} />
            <span>Request Payout / টাকা তোলার আবেদন</span>
          </button>

          {/* Recent Payout Requests History */}
          {myPayoutRequests.length > 0 && (
            <div className="pt-2 border-t border-white/10 space-y-2">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                Recent Withdrawal Requests:
              </span>
              <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                {myPayoutRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-white/5 text-xs font-mono"
                  >
                    <div>
                      <span className="text-white font-bold">৳{req.amount}</span>
                      <span className="text-slate-400 ml-1.5">({req.paymentMethod})</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                      req.status === 'approved'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : req.status === 'rejected'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                    }`}>
                      {req.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. EQUIPPED BADGES & AVATAR FRAMES (XP BAZAAR WARDROBE) */}
      <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-white/5 space-y-3.5 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Award size={16} />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide">
                My Badges & Avatar Frames
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">
                Select any unlocked XP Store badge to display on your profile & avatar
              </p>
            </div>
          </div>

          <button
            onClick={onOpenRewards}
            className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 rounded-lg text-[11px] font-mono font-bold flex items-center space-x-1 transition-all cursor-pointer shrink-0"
          >
            <ShoppingBag size={12} className="mr-1" />
            <span>XP Store</span>
          </button>
        </div>

        {ownedStoreItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {ownedStoreItems.map((item) => {
              const isEquippedFrame = activeFrame === item.id;
              const isEquippedTitle = activeTitle === item.name;
              const isEquipped = isEquippedFrame || isEquippedTitle;

              return (
                <div
                  key={item.id}
                  onClick={() => handleToggleEquipItem(item)}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                    isEquipped
                      ? 'bg-amber-500/15 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                      : 'bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <span className="text-xl shrink-0">{item.icon}</span>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-bold text-white truncate block">
                          {item.name}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono truncate block">
                        {item.perkGranted || item.description}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleEquipItem(item);
                    }}
                    className={`ml-2 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold shrink-0 transition-all ${
                      isEquipped
                        ? 'bg-amber-400 text-slate-950 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                        : 'bg-white/10 text-slate-300 hover:bg-white/20 border border-white/10'
                    }`}
                  >
                    {isEquipped ? 'EQUIPPED' : 'EQUIP'}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-white/[0.02] border border-dashed border-white/10 text-center space-y-2">
            <div className="text-2xl">✨</div>
            <p className="text-xs text-slate-300 font-medium">No Badges or Frames Owned Yet</p>
            <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
              Use your earned XP to buy glowing avatar frames, titles, and VIP passes in the XP Marketplace!
            </p>
            <button
              onClick={onOpenRewards}
              className="mt-1 px-3 py-1.5 bg-[#39FF14]/15 hover:bg-[#39FF14]/25 border border-[#39FF14]/30 text-[#39FF14] rounded-lg text-xs font-mono font-bold inline-flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <Zap size={12} />
              <span>Explore XP Marketplace</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. COMPACT PAYMENT & ACCESS STATUS ALERT */}
      <div 
        onClick={() => onNavigate('payment-history')}
        className={`p-3 rounded-xl border transition-all relative overflow-hidden cursor-pointer group hover:border-white/20 ${
          approvalStatus === 'Rejected'
            ? 'bg-gradient-to-r from-red-950/50 via-slate-900/80 to-slate-950/90 border-red-500/35 hover:border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.1)]'
            : approvalStatus === 'Pending'
            ? 'bg-gradient-to-r from-amber-950/30 via-slate-900/60 to-slate-900/40 border-amber-500/25 hover:border-amber-500/40'
            : 'bg-gradient-to-r from-emerald-950/30 via-slate-900/60 to-slate-900/40 border-[#39FF14]/25 hover:border-[#39FF14]/40'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              approvalStatus === 'Rejected'
                ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                : approvalStatus === 'Pending'
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                : 'bg-[#39FF14]/15 text-[#39FF14] border border-[#39FF14]/30'
            }`}>
              {approvalStatus === 'Rejected' ? <XCircle size={16} /> : approvalStatus === 'Pending' ? <Clock size={16} /> : <ShieldCheck size={16} />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-bold text-white truncate">
                  {approvalStatus === 'Rejected' ? 'Payment Submission Rejected' : approvalStatus === 'Pending' ? 'Enrollment Under Review' : 'Verified Student Account'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono truncate">
                {approvalStatus === 'Rejected'
                  ? 'Admin was unable to verify transaction ID. Click to retry.'
                  : approvalStatus === 'Pending'
                  ? 'Pending admin verification. Access auto-unlocks upon approval.'
                  : 'Student profile & course access fully verified.'}
              </p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNavigate('payment-history');
            }}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold flex items-center space-x-1 border shrink-0 transition-all cursor-pointer ${
              approvalStatus === 'Rejected'
                ? 'bg-red-500/20 text-red-300 border-red-500/40 hover:bg-red-500/30 animate-pulse'
                : approvalStatus === 'Pending'
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                : 'bg-[#39FF14]/20 text-[#39FF14] border-[#39FF14]/40 hover:bg-[#39FF14]/30'
            }`}
          >
            <span>{approvalStatus === 'Rejected' ? 'View & Retry' : 'View Status'}</span>
            <ChevronRight size={11} />
          </button>
        </div>
      </div>

      {/* 4. COMPACT PAYMENTS & ENROLLMENTS SECTION */}
      <div className="glass-panel rounded-xl border border-white/5 overflow-hidden">
        <button
          onClick={() => onNavigate('payment-history')}
          className="w-full p-3 sm:p-3.5 flex items-center justify-between hover:bg-white/5 transition-colors group cursor-pointer"
        >
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${
              rejectedCount > 0 ? 'bg-red-500/15 text-red-400 border border-red-500/30' : 'bg-[#39FF14]/10 text-[#39FF14] border border-[#39FF14]/20'
            }`}>
              <CreditCard size={16} />
            </div>
            <div className="text-left">
              <div className="flex items-center space-x-2">
                <span className="text-xs sm:text-sm font-semibold text-slate-200 block">Payment & Order Status</span>
                {rejectedCount > 0 && (
                  <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full text-[9px] font-mono font-bold animate-pulse">
                    Rejected ({rejectedCount})
                  </span>
                )}
                {pendingCount > 0 && rejectedCount === 0 && (
                  <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-[9px] font-mono font-bold">
                    Pending ({pendingCount})
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 font-mono block">View verification statuses, receipts & retry</span>
            </div>
          </div>
          <ChevronRight size={15} className="text-slate-500 group-hover:text-white transition-colors shrink-0 ml-2" />
        </button>
      </div>

      {/* 5. LEARNING MILESTONES (ACHIEVEMENT TRACKER) IN PROFILE */}
      <section className="relative">
        <AchievementTracker
          userProfile={userProfile}
          courses={courses}
          enrolledCourseIds={enrolledCourseIds}
          userCourseProgressMap={userCourseProgressMap}
          userLessonProgressMap={userLessonProgressMap}
          onShowNotification={onShowNotification}
          onOpenCourse={onOpenCourse}
        />
      </section>

      {/* 6. PROFILE SECTIONS (CONTENT, COMMUNITY, SETTINGS) */}
      <div className="space-y-3">
        {/* My Content & Community Section */}
        <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
          <div className="p-3 border-b border-white/5 bg-white/[0.02]">
            <h3 className="text-xs font-mono font-bold text-slate-400 tracking-wider flex items-center">
              <Compass size={14} className="mr-2 text-[#39FF14]" />
              MY CONTENT & COMMUNITY
            </h3>
          </div>
          <div className="divide-y divide-white/5">
            <button
              onClick={() => onNavigate('certificates')}
              className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors group cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                  <Award size={16} />
                </div>
                <div className="text-left">
                  <span className="text-sm font-medium text-slate-200 block">My Certificates</span>
                  <span className="text-[10px] text-slate-400 font-mono">View & download earned course certificates</span>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-500 group-hover:text-white transition-colors" />
            </button>

            <button
              onClick={() => onNavigate('community')}
              className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors group cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-[#39FF14]/10 flex items-center justify-center text-[#39FF14] group-hover:scale-110 transition-transform">
                  <MessageSquare size={16} />
                </div>
                <div className="text-left">
                  <span className="text-sm font-medium text-slate-200 block">Nexus Community</span>
                  <span className="text-[10px] text-slate-400 font-mono">Ask questions, discuss & connect with peers</span>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-500 group-hover:text-white transition-colors" />
            </button>
          </div>
        </div>

        {/* Settings & Support */}
        <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
          <div className="p-3 border-b border-white/5 bg-white/[0.02]">
            <h3 className="text-xs font-mono font-bold text-slate-400 tracking-wider flex items-center">
              <Settings size={14} className="mr-2" />
              PREFERENCES
            </h3>
          </div>
          <div className="divide-y divide-white/5">
            <button onClick={() => onNavigate('account-details')}
            className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors group cursor-pointer">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                  <UserCheck size={16} />
                </div>
                <span className="text-sm font-medium text-slate-200">Account Details</span>
              </div>
              <ChevronRight size={16} className="text-slate-500 group-hover:text-white transition-colors" />
            </button>
            <button onClick={() => onNavigate('privacy-security')}
            className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors group cursor-pointer">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                  <Shield size={16} />
                </div>
                <span className="text-sm font-medium text-slate-200">Privacy & Security</span>
              </div>
              <ChevronRight size={16} className="text-slate-500 group-hover:text-white transition-colors" />
            </button>
            <button onClick={() => onNavigate('help-support')}
            className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors group cursor-pointer relative">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform relative">
                  <HelpCircle size={16} />
                  {unreadSupportCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#39FF14] rounded-full animate-ping" />
                  )}
                </div>
                <div className="text-left">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-slate-200">Support & Helpdesk / সাহায্য ও সাপোর্ট</span>
                    {unreadSupportCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-[#39FF14] text-black text-[9px] font-mono font-bold animate-pulse">
                        {unreadSupportCount} REPLIED
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Live Ticket System, Payment Support & FAQs</span>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-500 group-hover:text-white transition-colors" />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 pb-4 space-y-3">
          <button
            onClick={() => {
              const url = 'https://nexus-academic.ai.studio';
              try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                  navigator.clipboard.writeText(url).catch(() => {
                    const el = document.createElement('textarea');
                    el.value = url;
                    document.body.appendChild(el);
                    el.select();
                    document.execCommand('copy');
                    document.body.removeChild(el);
                  });
                } else {
                  const el = document.createElement('textarea');
                  el.value = url;
                  document.body.appendChild(el);
                  el.select();
                  document.execCommand('copy');
                  document.body.removeChild(el);
                }
              } catch (e) {
                console.error(e);
              }
              onShowNotification('Invite link (https://nexus-academic.ai.studio) copied to clipboard!', 'success');
            }}
            className="w-full py-3.5 bg-[#39FF14]/10 hover:bg-[#39FF14]/20 border border-[#39FF14]/30 rounded-xl text-[#39FF14] text-sm font-bold tracking-wide transition-all shadow-[0_0_15px_rgba(57,255,20,0.1)] flex items-center justify-center space-x-2 group cursor-pointer"
          >
            <Share2 size={16} className="group-hover:scale-110 transition-transform" />
            <span>INVITE FRIENDS</span>
          </button>
          
          <button 
            onClick={onLogout}
            className="w-full py-3.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm font-bold tracking-wide transition-all flex items-center justify-center space-x-2 group cursor-pointer"
          >
            <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span>SECURE LOGOUT</span>
          </button>
        </div>

        {/* Language Switcher */}
        <div className="pb-8">
            <button className="w-full flex items-center justify-center space-x-2 bg-slate-800/50 hover:bg-slate-700/50 border border-white/10 rounded-xl py-3 px-4 text-slate-200 transition-all">
                <span className="text-xl">🇺🇸</span>
                <span className="font-mono text-sm font-bold">ENGLISH (EN)</span>
                <ChevronRight size={16} className="rotate-90 text-slate-500" />
            </button>
        </div>
      </div>

      {/* INSTRUCTOR PAYOUT WITHDRAWAL MODAL */}
      <InstructorPayoutModal
        isOpen={isPayoutModalOpen}
        onClose={() => setIsPayoutModalOpen(false)}
        instructorName={userProfile?.fullName}
        instructorEmail={userProfile?.email}
        availableBalance={currentAvailableBalance}
        onShowNotification={onShowNotification}
      />

      {/* EDIT PROFILE MODAL */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isEditModalOpen && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="w-full max-w-md bg-[#0a0f1d] border border-[#39FF14]/30 rounded-2xl p-5 shadow-[0_0_35px_rgba(0,0,0,0.9)] space-y-4 relative my-auto max-h-[90vh] overflow-y-auto custom-scrollbar"
              >
                <div className="flex justify-between items-center pb-3 border-b border-white/10">
                  <div className="flex items-center space-x-2">
                    <Edit3 size={18} className="text-[#39FF14]" />
                    <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                      Edit Scholar Profile
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsEditModalOpen(false)}
                    className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Live Avatar Preview */}
                <div className="flex flex-col items-center justify-center space-y-2 py-1">
                  <div className="w-20 h-20 rounded-2xl bg-slate-900 border-2 border-[#39FF14] overflow-hidden flex items-center justify-center shadow-[0_0_20px_rgba(57,255,20,0.3)] relative shrink-0">
                    {editPhotoURL.trim() ? (
                      <img src={editPhotoURL.trim()} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User size={36} className="text-[#39FF14]" />
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">Live Profile Picture Preview</span>
                </div>

                {/* Display Name Input */}
                <div>
                  <label className="text-[10px] font-mono text-slate-300 uppercase tracking-wider block mb-1">
                    Display Name / Full Name
                  </label>
                  <input
                    type="text"
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full bg-slate-900/80 border border-white/10 focus:border-[#39FF14] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-sans"
                  />
                </div>

                {/* Profile Picture URL Input */}
                <div>
                  <label className="text-[10px] font-mono text-slate-300 uppercase tracking-wider block mb-1">
                    Profile Picture URL
                  </label>
                  <input
                    type="text"
                    value={editPhotoURL}
                    onChange={(e) => setEditPhotoURL(e.target.value)}
                    placeholder="https://example.com/photo.jpg"
                    className="w-full bg-slate-900/80 border border-white/10 focus:border-[#39FF14] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-mono"
                  />
                </div>

                {/* Quick Preset Avatars */}
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1.5">
                    Quick Avatar Presets:
                  </span>
                  <div className="flex items-center space-x-2 overflow-x-auto pb-1 no-scrollbar">
                    {[
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
                      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
                      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=250&q=80',
                      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80',
                      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=250&q=80',
                      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=250&q=80'
                    ].map((url, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setEditPhotoURL(url)}
                        className={`w-10 h-10 rounded-xl overflow-hidden border shrink-0 transition-all cursor-pointer ${
                          editPhotoURL === url ? 'border-[#39FF14] scale-105 ring-2 ring-[#39FF14]/50' : 'border-white/10 hover:border-white/40'
                        }`}
                      >
                        <img src={url} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Modal Buttons */}
                <div className="flex space-x-2 pt-2">
                  <button
                    onClick={handleSaveProfile}
                    disabled={isSavingProfile}
                    className="flex-1 py-2.5 bg-[#39FF14] hover:bg-[#32e011] text-black font-mono font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-[0_0_15px_rgba(57,255,20,0.3)] flex items-center justify-center space-x-1"
                  >
                    {isSavingProfile ? (
                      <span>Saving Changes...</span>
                    ) : (
                      <>
                        <Check size={14} />
                        <span>Save Profile</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setIsEditModalOpen(false)}
                    disabled={isSavingProfile}
                    className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 font-mono text-xs rounded-xl border border-white/10 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

