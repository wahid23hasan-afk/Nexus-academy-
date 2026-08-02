import { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GlowBackground } from './components/GlowBackground';
import { WelcomeView } from './components/WelcomeView';
import { LoginView } from './components/LoginView';
import { RegisterView } from './components/RegisterView';
import { VerificationView } from './components/VerificationView';

const ProfileSetupView = lazy(() => import('./components/ProfileSetupView').then(m => ({ default: m.ProfileSetupView })));
const CourseDiscoveryView = lazy(() => import('./components/CourseDiscoveryView').then(m => ({ default: m.CourseDiscoveryView })));
const PublicCertificateVerification = lazy(() => import('./components/PublicCertificateVerification').then(m => ({ default: m.PublicCertificateVerification })));

import { AppView } from './types/auth';
import { auth, db } from './services/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { authService } from './services/authService';
import { ENABLE_EMAIL_VERIFICATION } from './config';
import { Check, X, Bell, Copy, Shield, LogOut, GraduationCap, Calendar, Mail, User as UserIcon } from 'lucide-react';


export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('welcome');
  const [verificationEmail, setVerificationEmail] = useState<string>('');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<{ fullName: string; username: string; phone?: string; createdAt?: string; photoURL?: string } | null>(null);
  const [isProfileCompleted, setIsProfileCompleted] = useState<boolean | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  
  // Custom toast notifications (success / error states)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  
  // Certificate Public Verification Link Routing
  const [verificationIdFromUrl, setVerificationIdFromUrl] = useState<string>('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verifyParam = params.get('verify');
    if (verifyParam) {
      setVerificationIdFromUrl(verifyParam);
    }
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

  // Firebase Authentication State Observer (Session Persistence & Auto Login)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      let freshUser = firebaseUser;
      
      if (firebaseUser) {
        try {
          await firebaseUser.reload();
          if (auth.currentUser) {
            freshUser = auth.currentUser;
          }
        } catch (e) {
          console.warn('Failed to reload user in App', e);
        }
      }
      
      setUser(freshUser);
      
      if (freshUser) {
        setVerificationEmail(freshUser.email || '');
        // Fetch profile details and verify completeness
        try {
          const result = await authService.checkAndInitializeProfile(freshUser);
          const data = result.data;
          
          setUserProfile({
            fullName: data?.fullName || freshUser.displayName || 'Scholar',
            username: data?.username || '',
            phone: data?.phoneNumber || data?.phone || undefined,
            createdAt: data?.createdAt ? (typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate().toISOString() : data.createdAt) : undefined,
            photoURL: data?.photoURL || freshUser.photoURL || undefined,
          });

          setIsProfileCompleted(result.profileCompleted);

          // Auto-routing depending on verification status and profile completed status
          if (freshUser.emailVerified || !ENABLE_EMAIL_VERIFICATION) {
            if (result.profileCompleted) {
              setCurrentView('welcome');
            } else {
              setCurrentView('profile-setup');
            }
          } else {
            setCurrentView('verify');
          }
        } catch (err) {
          console.error('Error loading user profile details from Firestore:', err);
          setUserProfile({
            fullName: freshUser.displayName || 'Scholar',
            username: '',
          });
          setIsProfileCompleted(false);
          
          if (freshUser.emailVerified || !ENABLE_EMAIL_VERIFICATION) {
            setCurrentView('profile-setup');
          } else {
            setCurrentView('verify');
          }
        }
      } else {
        setUserProfile(null);
        setIsProfileCompleted(null);
        // If not logged in, take them back to welcome/login
        if (currentView === 'verify' || currentView === 'profile-setup') {
          setCurrentView('welcome');
        }
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, [currentView]);

  
    const triggerToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  const handleLogout = async () => {
    await authService.logout();
  };

  return (
    <GlowBackground>
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
        {isAuthLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4">
            <svg className="animate-spin h-8 w-8 text-[#39FF14]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-xs font-mono tracking-widest text-[#39FF14]/80 animate-pulse">
              INITIALIZING ACADEMIC MATRIX...
            </p>
          </div>
        ) : (
          <Suspense fallback={
            <div className="flex-1 flex flex-col items-center justify-center space-y-4">
              <svg className="animate-spin h-8 w-8 text-[#39FF14]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-xs font-mono tracking-widest text-[#39FF14]/80 animate-pulse">
                LOADING MODULE...
              </p>
            </div>
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
            ) : user && (user.emailVerified || !ENABLE_EMAIL_VERIFICATION) && isProfileCompleted === false ? (
              <motion.div
                key="profile-setup"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.3 }}
                className="flex-1 flex flex-col"
              >
                <ProfileSetupView
                  user={user}
                  onComplete={() => {
                    setIsProfileCompleted(true);
                    // Re-fetch profile details
                    getDoc(doc(db, 'users', user.uid)).then((docSnap) => {
                      if (docSnap.exists()) {
                        const data = docSnap.data();
                        setUserProfile({
                          fullName: data.fullName || user.displayName || 'Scholar',
                          username: data.username || 'scholar',
                          phone: data.phoneNumber || data.phone || undefined,
                          createdAt: data.createdAt ? (typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate().toISOString() : data.createdAt) : undefined,
                          photoURL: data.photoURL || undefined,
                        });
                      }
                    });
                    setCurrentView('welcome');
                  }}
                  onShowNotification={triggerToast}
                />
              </motion.div>
            ) : user && (user.emailVerified || !ENABLE_EMAIL_VERIFICATION) && isProfileCompleted === true ? (
              <motion.div
                key="authenticated"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex-1 flex flex-col justify-between py-2"
              >
                <CourseDiscoveryView
                  userProfile={userProfile}
                  onLogout={handleLogout}
                  onShowNotification={triggerToast}
                />
              </motion.div>
            ) : (
              <>
                {currentView === 'welcome' && (
                  <motion.div
                    key="welcome"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.3 }}
                    className="flex-1 flex flex-col"
                  >
                    <WelcomeView onNavigate={setCurrentView} />
                  </motion.div>
                )}

                {currentView === 'login' && (
                  <motion.div
                    key="login"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.3 }}
                    className="flex-1 flex flex-col"
                  >
                    <LoginView
                      onNavigate={setCurrentView}
                      onSetVerificationEmail={setVerificationEmail}
                      onShowNotification={triggerToast}
                    />
                  </motion.div>
                )}

                {currentView === 'register' && (
                  <motion.div
                    key="register"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.3 }}
                    className="flex-1 flex flex-col"
                  >
                    <RegisterView
                      onNavigate={setCurrentView}
                      onSetVerificationEmail={setVerificationEmail}
                      onShowNotification={triggerToast}
                    />
                  </motion.div>
                )}

                {currentView === 'verify' && (
                  <motion.div
                    key="verify"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className="flex-1 flex flex-col"
                  >
                    <VerificationView
                      email={verificationEmail}
                      onNavigate={setCurrentView}
                      onSetVerificationEmail={setVerificationEmail}
                      onShowNotification={triggerToast}
                    />
                  </motion.div>
                )}
              </>
            )}
          </AnimatePresence>
          </Suspense>
        )}
      </div>
    </GlowBackground>
  );
}
