import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GlowBackground } from './components/GlowBackground';
import { ClickAnimationProvider } from './components/ClickAnimationProvider';
import { BrandLoader } from './components/BrandLoader';
import { WelcomeView } from './components/WelcomeView';
import { LoginView } from './components/LoginView';
import { RegisterView } from './components/RegisterView';
import { VerificationView } from './components/VerificationView';

import { ProfileSetupView } from './components/ProfileSetupView';
import { CourseDiscoveryView } from './components/CourseDiscoveryView';
import { PublicCertificateVerification } from './components/PublicCertificateVerification';
import { AdminPanelModal } from './components/AdminPanelModal';
import { MilestoneToastContainer } from './components/MilestoneToastContainer';
import { MaintenanceScreen } from './components/MaintenanceScreen';
import { StudentLayout } from './components/StudentLayout';
import { AuthProvider } from './context/AuthContext';

import { AppView } from './types/auth';
import { auth, db } from './services/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { authService } from './services/authService';
import { systemSettingsService, SystemSettings, DEFAULT_SYSTEM_SETTINGS } from './services/systemSettingsService';
import { ENABLE_EMAIL_VERIFICATION } from './config';
import { Check, X, Bell, Copy, Shield, LogOut, GraduationCap, Calendar, Mail, User as UserIcon, WifiOff, Wrench } from 'lucide-react';


import type { Transition } from 'motion/react';

const slideAndFadeTransition: Transition = {
  duration: 0.36,
  ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
};

const slideFadeForward = {
  initial: { opacity: 0, x: 24, scale: 0.98, filter: 'blur(3px)' },
  animate: { opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' },
  exit: { opacity: 0, x: -20, scale: 0.98, filter: 'blur(3px)' },
  transition: slideAndFadeTransition,
};

const slideFadeBackward = {
  initial: { opacity: 0, x: -24, scale: 0.98, filter: 'blur(3px)' },
  animate: { opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' },
  exit: { opacity: 0, x: 20, scale: 0.98, filter: 'blur(3px)' },
  transition: slideAndFadeTransition,
};

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('welcome');
  const [verificationEmail, setVerificationEmail] = useState<string>('');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<{ uid: string; fullName: string; username: string; phone?: string; createdAt?: string; photoURL?: string; email?: string; role?: string } | null>(null);
  const [isProfileCompleted, setIsProfileCompleted] = useState<boolean | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  
  // Real-time System Settings (Maintenance Mode, Global Banners)
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(DEFAULT_SYSTEM_SETTINGS);

  useEffect(() => {
    const unsubscribe = systemSettingsService.subscribeSystemSettings((settings) => {
      setSystemSettings(settings);
    });
    return () => unsubscribe();
  }, []);

  // Custom toast notifications (success / error states)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Offline mode state tracking
  const [isOffline, setIsOffline] = useState<boolean>(typeof navigator !== 'undefined' ? !navigator.onLine : false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setToast({ message: 'Connected! Back online.', type: 'success' });
    };
    const handleOffline = () => {
      setIsOffline(true);
      setToast({ message: 'Offline mode active. Using cached data.', type: 'error' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  
  // Certificate Public Verification Link Routing & Direct Admin URL routing
  const [verificationIdFromUrl, setVerificationIdFromUrl] = useState<string>('');
  const [showGlobalAdmin, setShowGlobalAdmin] = useState<boolean>(false);
  const [adminInitialTab, setAdminInitialTab] = useState<'approvals' | 'notifications' | 'coupons' | 'payments' | 'curriculum' | 'storage' | 'xp_store' | 'studyFeatures' | 'live_classes' | 'support' | 'settings' | 'reviews'>('approvals');

  useEffect(() => {
    const handleOpenAdmin = () => setShowGlobalAdmin(true);
    window.addEventListener('nexus_open_admin_panel', handleOpenAdmin);
    return () => window.removeEventListener('nexus_open_admin_panel', handleOpenAdmin);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verifyParam = params.get('verify');
    if (verifyParam) {
      setVerificationIdFromUrl(verifyParam);
    }
    const adminParam = params.get('admin');
    const pageParam = params.get('page');
    const pathname = window.location.pathname;

    if (adminParam === 'reviews' || pageParam === 'reviews' || pathname.endsWith('/reviews')) {
      setAdminInitialTab('reviews');
      setShowGlobalAdmin(true);
    } else if (adminParam === 'true' || adminParam === '1') {
      setShowGlobalAdmin(true);
    }
  }, []);

  // Global Keyboard Shortcut: Ctrl+Shift+A or Cmd+Shift+A opens Admin Panel anytime
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        setShowGlobalAdmin(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-clear toasts
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Check redirect result from Google sign-in
  useEffect(() => {
    authService.handleRedirectResult().catch((err) => {
      console.warn('Redirect sign-in handler error:', err);
    });
  }, []);

  // Listen for real-time profile edits (Display name, photoURL)
  useEffect(() => {
    const handleProfileUpdate = (e: any) => {
      if (e?.detail) {
        setUserProfile((prev) => prev ? { ...prev, ...e.detail } : e.detail);
      }
    };
    window.addEventListener('nexus_profile_updated', handleProfileUpdate);
    return () => window.removeEventListener('nexus_profile_updated', handleProfileUpdate);
  }, []);

  // Firebase Authentication State Observer (Session Persistence & Auto Login)
  useEffect(() => {
    let isMounted = true;

    // Safety fallback: ensure loader dismisses within 2.5s even if Firebase is sluggish on mobile networks
    const timer = setTimeout(() => {
      if (isMounted) {
        setIsAuthLoading(false);
      }
    }, 2500);

    const unsubscribe = onAuthStateChanged(auth, async (freshUser) => {
      if (!isMounted) return;
      setUser(freshUser);
      
      if (freshUser) {
        setVerificationEmail(freshUser.email || '');
        // Fetch profile details and verify completeness
        try {
          const result = await authService.checkAndInitializeProfile(freshUser);
          const data = result.data;
          
          if (isMounted) {
            setUserProfile({
              uid: freshUser.uid,
              fullName: data?.fullName || freshUser.displayName || 'Scholar',
              username: data?.username || '',
              phone: data?.phoneNumber || data?.phone || undefined,
              createdAt: data?.createdAt ? (typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate().toISOString() : data.createdAt) : undefined,
              photoURL: data?.photoURL || freshUser.photoURL || undefined,
              email: freshUser.email || data?.email || '',
              role: data?.role || (freshUser.email === 'wahid23hasan@gmail.com' ? 'super_admin' : 'student'),
            });

            setIsProfileCompleted(result.profileCompleted ?? true);
          }
        } catch (err) {
          console.warn('Profile read notice in App (using authenticated fallback):', err);
          if (isMounted) {
            setUserProfile(prev => prev || {
              uid: freshUser.uid,
              fullName: freshUser.displayName || freshUser.email?.split('@')[0] || 'Scholar',
              username: freshUser.email?.split('@')[0] || 'scholar',
              email: freshUser.email || '',
            });
            // Do not kick the user out if authenticated
            setIsProfileCompleted(true);
          }
        }
      } else {
        if (isMounted) {
          setUserProfile(null);
          setIsProfileCompleted(null);
        }
      }
      if (isMounted) {
        setIsAuthLoading(false);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  
  const triggerToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  }, []);

  const handleLogout = async () => {
    await authService.logout();
  };

  const userRole = (userProfile?.role || '').toLowerCase().trim();
  const userEmail = (user?.email || userProfile?.email || '').toLowerCase().trim();
  const isRealAdmin = userRole === 'super_admin' || userRole === 'admin' || userEmail === 'wahid23hasan@gmail.com';
  const isMaintenanceActiveForUser = Boolean(systemSettings.maintenanceMode) && !isRealAdmin;

  return (
    <AuthProvider>
      <ClickAnimationProvider>
        <GlowBackground>
        {/* Floating Admin Maintenance Mode Bypass Badge */}
        <AnimatePresence>
          {systemSettings.maintenanceMode && isRealAdmin && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-2 right-4 z-50 pointer-events-auto"
            >
              <button
                onClick={() => setShowGlobalAdmin(true)}
                className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-amber-950/90 hover:bg-amber-900 border border-amber-500/50 text-amber-300 backdrop-blur-md shadow-2xl text-[10px] font-mono font-bold tracking-wider cursor-pointer transition-all"
                title="Click to open Admin Panel Settings"
              >
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
                <span>MAINTENANCE ACTIVE (ADMIN BYPASS)</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Persistent Offline Mode Badge */}
      <AnimatePresence>
        {isOffline && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-2 left-1/2 -translate-x-1/2 z-50 pointer-events-auto max-w-[90vw]"
          >
            <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-amber-950/90 border border-amber-500/40 text-amber-300 backdrop-blur-md shadow-xl text-[11px] font-mono font-semibold tracking-wider">
              <WifiOff size={13} className="animate-pulse text-amber-400 shrink-0" />
              <span>OFFLINE MODE • CACHED DATA ACTIVE</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. Glassmorphic App Toast Notification Alert */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="absolute top-12 left-6 right-6 z-50 pointer-events-none"
          >
            <div className={`
              px-4 py-3 rounded-xl border backdrop-blur-md shadow-lg flex items-center space-x-3 pointer-events-auto
              ${toast.type === 'success' 
                ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300' 
                : 'bg-red-950/90 border-red-500/30 text-red-300'
              }
            `}>
              <div className="shrink-0">
                {toast.type === 'success' ? (
                  <span className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                    <Check size={12} className="text-emerald-400" />
                  </span>
                ) : (
                  <span className="w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                    <X size={12} className="text-red-400" />
                  </span>
                )}
              </div>
              <p className="text-xs font-sans font-medium">{toast.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Screen Views Coordinate Router with Micro Page transitions */}
      <div className="flex-1 flex flex-col h-full justify-between">
        {(isAuthLoading || (user !== null && isProfileCompleted === null)) ? (
          <BrandLoader 
            label="INITIALIZING ACADEMIC MATRIX" 
            subLabel="AUTHENTICATING SECURE PROTOCOLS" 
          />
        ) : (
          <Suspense fallback={
            <BrandLoader 
              label="LOADING MODULE" 
              subLabel="SYNCHRONIZING SCHOLAR ASSETS" 
            />
          }>
          <AnimatePresence mode="wait">
            {verificationIdFromUrl ? (
              <motion.div
                key="public-verification"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col"
              >
                <PublicCertificateVerification
                  initialVerificationId={verificationIdFromUrl}
                  onClose={() => {
                    setVerificationIdFromUrl('');
                    window.history.replaceState({}, document.title, window.location.pathname);
                  }}
                />
              </motion.div>
            ) : isMaintenanceActiveForUser ? (
              <motion.div
                key="system-maintenance-screen"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] bg-[#030712]/95 backdrop-blur-xl flex flex-col justify-center items-center overflow-y-auto"
              >
                <MaintenanceScreen
                  settings={systemSettings}
                  userEmail={user?.email || undefined}
                  onLogout={handleLogout}
                  onRefresh={() => {
                    systemSettingsService.getSystemSettings().then(setSystemSettings);
                    triggerToast('সিস্টেম স্ট্যাটাস যাচাই করা হচ্ছে...', 'success');
                  }}
                />
              </motion.div>
            ) : user && !user.emailVerified && ENABLE_EMAIL_VERIFICATION && localStorage.getItem(`nexus_email_verified_${user.uid}`) !== 'true' && localStorage.getItem(`nexus_email_verified_${user.email || ''}`) !== 'true' ? (
              <motion.div
                key="unverified-email-notice"
                {...slideFadeForward}
                className="flex-1 flex flex-col"
              >
                <VerificationView
                  email={user.email || verificationEmail}
                  onNavigate={setCurrentView}
                  onSetVerificationEmail={setVerificationEmail}
                  onShowNotification={triggerToast}
                />
              </motion.div>
            ) : user && isProfileCompleted === false ? (
              <motion.div
                key="profile-setup"
                {...slideFadeForward}
                className="flex-1 flex flex-col"
              >
                <ProfileSetupView
                  user={user}
                  initialProfile={userProfile}
                  onComplete={() => {
                    setIsProfileCompleted(true);
                    // Immediately fetch the updated user document to sync photoURL and username
                    getDoc(doc(db, 'users', user.uid)).then((docSnap) => {
                      if (docSnap.exists()) {
                        const data = docSnap.data();
                        setUserProfile({
                          uid: user.uid,
                          fullName: data.fullName || user.displayName || 'Scholar',
                          username: data.username || 'scholar',
                          phone: data.phoneNumber || data.phone || undefined,
                          createdAt: data.createdAt ? (typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate().toISOString() : data.createdAt) : undefined,
                          photoURL: data.photoURL || user.photoURL || undefined,
                          email: user.email || data.email || '',
                          role: data.role || (user.email === 'wahid23hasan@gmail.com' ? 'super_admin' : 'student'),
                        });
                      }
                    });
                    setCurrentView('welcome');
                  }}
                  onShowNotification={triggerToast}
                />
              </motion.div>
            ) : user && isProfileCompleted === true ? (
              <motion.div
                key="authenticated"
                {...slideFadeForward}
                className="flex-1 flex flex-col justify-between py-2"
              >
                <StudentLayout
                  userProfile={userProfile}
                  systemSettings={systemSettings}
                  onLogout={handleLogout}
                  onOpenAdminPanel={() => setShowGlobalAdmin(true)}
                  onRefresh={() => {
                    systemSettingsService.getSystemSettings().then(setSystemSettings);
                    triggerToast('সিস্টেম স্ট্যাটাস যাচাই করা হচ্ছে...', 'success');
                  }}
                >
                  <CourseDiscoveryView
                    userProfile={userProfile}
                    onLogout={handleLogout}
                    onShowNotification={triggerToast}
                  />
                </StudentLayout>
              </motion.div>
            ) : currentView === 'login' ? (
              <motion.div
                key="login"
                {...slideFadeForward}
                className="flex-1 flex flex-col"
              >
                <LoginView
                  onNavigate={setCurrentView}
                  onSetVerificationEmail={setVerificationEmail}
                  onShowNotification={triggerToast}
                />
              </motion.div>
            ) : currentView === 'register' ? (
              <motion.div
                key="register"
                {...slideFadeForward}
                className="flex-1 flex flex-col"
              >
                <RegisterView
                  onNavigate={setCurrentView}
                  onSetVerificationEmail={setVerificationEmail}
                  onShowNotification={triggerToast}
                />
              </motion.div>
            ) : currentView === 'verify' ? (
              <motion.div
                key="verify"
                {...slideFadeForward}
                className="flex-1 flex flex-col"
              >
                <VerificationView
                  email={verificationEmail}
                  onNavigate={setCurrentView}
                  onSetVerificationEmail={setVerificationEmail}
                  onShowNotification={triggerToast}
                />
              </motion.div>
            ) : (
              <motion.div
                key="welcome"
                {...slideFadeBackward}
                className="flex-1 flex flex-col"
              >
                <WelcomeView onNavigate={setCurrentView} />
              </motion.div>
            )}
          </AnimatePresence>
          </Suspense>
        )}
      </div>

      {/* Global Admin Panel Modal (Opens directly via ?admin=true or shortcut anytime) */}
      <AdminPanelModal
        isOpen={showGlobalAdmin}
        initialTab={adminInitialTab}
        onClose={() => {
          setShowGlobalAdmin(false);
          const url = new URL(window.location.href);
          url.searchParams.delete('admin');
          url.searchParams.delete('page');
          window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : ''));
        }}
        onShowNotification={triggerToast}
      />

      {/* Milestone Toast Notification System with Framer Motion */}
      <MilestoneToastContainer />
      </GlowBackground>
    </ClickAnimationProvider>
    </AuthProvider>
  );
}
