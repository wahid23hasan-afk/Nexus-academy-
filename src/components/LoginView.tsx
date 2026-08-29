import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, Eye, EyeOff, LogIn, ChevronLeft, AlertCircle, CheckCircle, KeyRound, Send, ArrowLeft, ShieldAlert } from 'lucide-react';
import { AppView, LoginFormErrors } from '../types/auth';
import { authService } from '../services/authService';
import { systemSettingsService, SystemSettings, DEFAULT_SYSTEM_SETTINGS } from '../services/systemSettingsService';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface LoginViewProps {
  onNavigate: (view: AppView) => void;
  onSetVerificationEmail: (email: string) => void;
  onShowNotification: (message: string, type: 'success' | 'error') => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onNavigate,
  onSetVerificationEmail,
  onShowNotification,
}) => {
  const { maintenanceMode } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Forgot Password flow state
  const [isForgotMode, setIsForgotMode] = useState<boolean>(false);
  const [forgotEmail, setForgotEmail] = useState<string>('');
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState<boolean>(false);
  const [isSendingReset, setIsSendingReset] = useState<boolean>(false);
  
  // Validate fields on submit
  const validateForm = (): boolean => {
    const newErrors: LoginFormErrors = {};
    let isValid = true;

    if (!email) {
      newErrors.email = 'Email address is required.';
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address.';
      isValid = false;
    }

    if (!password) {
      newErrors.password = 'Password is required.';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setUnverifiedEmail(null);
    
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const response = await authService.login(email, password);

      if (response.success && response.user) {
        // Verify if system is currently in Maintenance Mode
        const systemSettings = await systemSettingsService.getSystemSettings();
        if (systemSettings.maintenanceMode || maintenanceMode) {
          let userRole = 'student';
          try {
            const userDocSnap = await getDoc(doc(db, 'users', response.user.uid));
            if (userDocSnap.exists()) {
              userRole = userDocSnap.data()?.role || 'student';
            }
          } catch {}
          const userEmail = (response.user.email || '').toLowerCase().trim();
          const isRealAdmin = userRole === 'super_admin' || userRole === 'admin' || userEmail === 'wahid23hasan@gmail.com';

          if (!isRealAdmin) {
            await authService.logout();
            setIsLoading(false);
            const maintError = 'সিস্টেম রক্ষণাবেক্ষণ চলছে। পরবর্তীতে চেষ্টা করুন।';
            setLoginError(maintError);
            onShowNotification(maintError, 'error');
            return;
          }
        }

        setIsLoading(false);
        onShowNotification(`Welcome back, ${response.user.displayName || 'Scholar'}!`, 'success');
        setLoginError(null);
      } else {
        setIsLoading(false);
        if (response.notVerified) {
          setUnverifiedEmail(email);
          setLoginError('Your email address has not been verified yet. Please verify your email before logging in.');
          onShowNotification('Verification required', 'error');
        } else {
          if (response.operationNotAllowed) {
            setLoginError('Email/Password authentication is currently unavailable. Please try using another sign-in method like Google.');
          } else {
            setLoginError(response.error || 'Login failed.');
          }
          
          onShowNotification(response.error || 'Login failed.', 'error');
        }
      }
    } catch (err: any) {
      setIsLoading(false);
      setLoginError(err.message || 'An unexpected error occurred.');
      onShowNotification(err.message || 'Login failed.', 'error');
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setLoginError(null);
    
    try {
      const response = await authService.loginWithGoogle();

      if (response.success && response.user) {
        // Verify if system is currently in Maintenance Mode
        const systemSettings = await systemSettingsService.getSystemSettings();
        if (systemSettings.maintenanceMode || maintenanceMode) {
          let userRole = 'student';
          try {
            const userDocSnap = await getDoc(doc(db, 'users', response.user.uid));
            if (userDocSnap.exists()) {
              userRole = userDocSnap.data()?.role || 'student';
            }
          } catch {}
          const userEmail = (response.user.email || '').toLowerCase().trim();
          const isRealAdmin = userRole === 'super_admin' || userRole === 'admin' || userEmail === 'wahid23hasan@gmail.com';

          if (!isRealAdmin) {
            await authService.logout();
            setIsLoading(false);
            const maintError = 'সিস্টেম রক্ষণাবেক্ষণ চলছে। পরবর্তীতে চেষ্টা করুন।';
            setLoginError(maintError);
            onShowNotification(maintError, 'error');
            return;
          }
        }

        setIsLoading(false);
        onShowNotification(`Welcome, ${response.user.displayName || 'Scholar'}!`, 'success');
      } else {
        setIsLoading(false);
        setLoginError(response.error || 'Google Sign-In failed.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setLoginError(err.message || 'Google Sign-In failed.');
    }
  };

  const openForgotPasswordMode = () => {
    setForgotEmail(email);
    setForgotError(null);
    setResetSent(false);
    setIsForgotMode(true);
  };

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);

    const trimmedEmail = forgotEmail.trim();
    if (!trimmedEmail) {
      setForgotError('Please enter your registered email address.');
      onShowNotification('Email address is required.', 'error');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setForgotError('Please enter a valid email address.');
      return;
    }

    setIsSendingReset(true);
    try {
      const response = await authService.sendPasswordReset(trimmedEmail);
      setIsSendingReset(false);
      
      if (response.success) {
        setResetSent(true);
        onShowNotification(`Password reset email sent to ${trimmedEmail}! Check your inbox.`, 'success');
      } else {
        setForgotError(response.error || 'Failed to send password reset link.');
        onShowNotification(response.error || 'Password reset failed', 'error');
      }
    } catch (err: any) {
      setIsSendingReset(false);
      setForgotError(err.message || 'Password reset failed.');
      onShowNotification(err.message || 'Password reset failed.', 'error');
    }
  };

  const handleGoToVerification = () => {
    if (unverifiedEmail) {
      onSetVerificationEmail(unverifiedEmail);
      onNavigate('verify');
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between py-2">
      {/* Header */}
      <div>
        <button 
          onClick={() => isForgotMode ? setIsForgotMode(false) : onNavigate('welcome')}
          className="inline-flex items-center space-x-1.5 text-slate-300 hover:text-white transition-colors py-2.5 px-3 -ml-3 rounded-xl hover:bg-white/5 active:bg-white/10 min-h-[44px] group cursor-pointer"
        >
          <ChevronLeft size={18} className="group-hover:-translate-x-0.5 transition-transform text-[#39FF14]" />
          <span className="text-xs font-mono font-medium">
            {isForgotMode ? 'Back to sign in' : 'Back to welcome'}
          </span>
        </button>

        <div className="mt-4">
          <h2 className="text-2xl sm:text-3xl font-display font-semibold text-white tracking-tight flex items-center space-x-2">
            {isForgotMode ? (
              <>
                <KeyRound className="text-[#39FF14]" size={26} />
                <span>Reset Password</span>
              </>
            ) : (
              <span>Welcome Back</span>
            )}
          </h2>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            {isForgotMode 
              ? 'Enter your account email to receive a password reset link via Firebase' 
              : 'Sign in to continue your masterclass programs'}
          </p>
        </div>
      </div>

      {/* Main Content Area: Forgot Password Mode vs Login Mode */}
      <AnimatePresence mode="wait">
        {isForgotMode ? (
          <motion.div
            key="forgot-password-view"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col justify-center my-6 space-y-4"
          >
            {resetSent ? (
              <div className="bg-[#39FF14]/10 border border-[#39FF14]/30 rounded-2xl p-5 space-y-4 text-center">
                <div className="w-12 h-12 bg-[#39FF14]/20 rounded-full flex items-center justify-center mx-auto text-[#39FF14]">
                  <CheckCircle size={28} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white font-sans">
                    Password Reset Link Sent!
                  </h3>
                  <p className="text-xs text-slate-300 mt-1.5 leading-relaxed font-sans">
                    An official password reset link has been dispatched to <span className="text-[#39FF14] font-medium">{forgotEmail}</span>. Please check your inbox and follow the instructions in the email to set a new password.
                  </p>
                </div>

                <div className="pt-2 space-y-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setEmail(forgotEmail);
                      setIsForgotMode(false);
                    }}
                    className="w-full py-3.5 px-5 min-h-[48px] rounded-xl text-xs sm:text-sm font-semibold bg-[#39FF14] text-black shadow-lg hover:shadow-[#39FF14]/20 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center space-x-2"
                  >
                    <LogIn size={16} />
                    <span>Return to Sign In</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setResetSent(false)}
                    className="w-full py-3 px-4 min-h-[44px] text-xs text-slate-400 hover:text-white transition-colors cursor-pointer font-mono inline-flex items-center justify-center"
                  >
                    Send to another email address
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendResetEmail} className="space-y-4">
                {forgotError && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-500/10 border border-red-500/20 rounded-xl p-3.5 flex items-start space-x-2.5 text-xs text-red-400 font-sans"
                  >
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <span>{forgotError}</span>
                  </motion.div>
                )}

                <motion.div 
                  animate={forgotError ? { x: [-8, 8, -6, 6, -3, 3, 0] } : { x: 0 }}
                  transition={{ duration: 0.35, ease: 'easeInOut' }}
                  className="space-y-1.5"
                >
                  <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block ml-1">
                    Registered Email Address
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                      <Mail size={18} />
                    </span>
                    <input
                      id="forgot-email-input"
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => {
                        setForgotEmail(e.target.value);
                        if (forgotError) setForgotError(null);
                      }}
                      placeholder="Enter your registered account email"
                      className="w-full pl-12 pr-4 py-3.5 sm:py-4 min-h-[48px] glass-panel-light border border-white/10 focus:border-[#39FF14] focus:bg-white/[0.04] neon-focus-glow rounded-xl text-base sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-all font-sans"
                    />
                  </div>
                </motion.div>

                <motion.button
                  id="send-reset-btn"
                  type="submit"
                  whileHover={{ scale: isSendingReset ? 1 : 1.01 }}
                  whileTap={{ scale: isSendingReset ? 1 : 0.98 }}
                  disabled={isSendingReset}
                  className={`
                    w-full py-4 px-5 min-h-[50px] rounded-xl text-sm font-semibold tracking-wide flex items-center justify-center space-x-2 transition-all duration-300 cursor-pointer
                    ${isSendingReset
                      ? 'bg-[#39FF14]/20 text-slate-400 cursor-not-allowed border border-[#39FF14]/20 shadow-none'
                      : 'bg-[#39FF14] text-black shadow-[0_4px_15px_rgba(57,255,20,0.2)] hover:shadow-[0_4px_25px_rgba(57,255,20,0.35)]'
                    }
                  `}
                >
                  {isSendingReset ? (
                    <div className="flex items-center space-x-2">
                      <svg className="animate-spin h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-black/80 font-mono text-xs">Sending Reset Link...</span>
                    </div>
                  ) : (
                    <>
                      <Send size={16} />
                      <span>Send Recovery Email</span>
                    </>
                  )}
                </motion.button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setIsForgotMode(false)}
                    className="text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer inline-flex items-center space-x-1.5 py-2 px-3 min-h-[44px] rounded-xl hover:bg-white/5"
                  >
                    <ArrowLeft size={14} />
                    <span>Back to Sign In</span>
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        ) : (
          <motion.form
            key="login-form-view"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            onSubmit={handleSubmit}
            className="flex-1 flex flex-col justify-center my-6 space-y-4"
          >
            {/* Maintenance Mode Prominent Warning Banner */}
            <AnimatePresence>
              {maintenanceMode && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.96 }}
                  className="bg-amber-950/80 border-2 border-amber-500/60 rounded-2xl p-3.5 flex items-center space-x-3 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.2)] animate-pulse"
                >
                  <ShieldAlert className="text-amber-400 shrink-0" size={20} />
                  <div className="flex-1">
                    <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-300">
                      Maintenance Mode Active - Admin Only Login
                    </h4>
                    <p className="text-[11px] text-amber-200/80 font-sans mt-0.5">
                      সাধারণ শিক্ষার্থীদের লগইন সাময়িকভাবে বন্ধ রাখা হয়েছে।
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Unverified Email Warning Notification block */}
            <AnimatePresence>
              {loginError && (
                <motion.div
                  initial={{ opacity: 0, height: 0, scale: 0.95 }}
                  animate={{ opacity: 1, height: 'auto', scale: 1 }}
                  exit={{ opacity: 0, height: 0, scale: 0.95 }}
                  className="bg-red-500/10 border-red-500/20 border rounded-2xl p-4 overflow-hidden"
                >
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={18} />
                    <div className="flex-1">
                      <p className="text-xs text-slate-200 leading-relaxed font-sans">
                        {loginError}
                      </p>
                      {unverifiedEmail ? (
                        <button
                          type="button"
                          onClick={handleGoToVerification}
                          className="mt-2.5 text-xs text-[#39FF14] hover:underline font-semibold inline-flex items-center space-x-1 py-1.5 px-2 -ml-2 rounded-lg hover:bg-[#39FF14]/10 cursor-pointer"
                        >
                          <span>Verify Email Now</span>
                          <span>&rarr;</span>
                        </button>
                      ) : null}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email Address Input */}
            <motion.div 
              animate={errors.email ? { x: [-8, 8, -6, 6, -3, 3, 0] } : { x: 0 }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
              className="space-y-1.5"
            >
              <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block ml-1">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                  <Mail size={18} />
                </span>
                <input
                  id="login-email-input"
                  type="text"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors({ ...errors, email: undefined });
                  }}
                  placeholder="Enter your registered email"
                  className={`
                    w-full pl-12 pr-4 py-3.5 sm:py-4 min-h-[48px] glass-panel-light border rounded-xl text-base sm:text-sm text-slate-100
                    placeholder-slate-500 focus:outline-none transition-all duration-300 font-sans
                    ${errors.email ? 'border-red-500/40 focus:border-red-500 bg-red-500/[0.01]' : 'border-white/10 focus:border-[#39FF14] neon-focus-glow focus:bg-white/[0.04]'}
                  `}
                />
              </div>
              {errors.email && (
                <motion.p 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-red-400 ml-1 font-sans flex items-center space-x-1"
                >
                  <span>{errors.email}</span>
                </motion.p>
              )}
            </motion.div>

            {/* Password Input */}
            <motion.div 
              animate={errors.password ? { x: [-8, 8, -6, 6, -3, 3, 0] } : { x: 0 }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
              className="space-y-1.5"
            >
              <div className="flex justify-between items-center ml-1">
                <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  Password
                </label>
                <button
                  type="button"
                  onClick={openForgotPasswordMode}
                  className="text-xs font-mono uppercase tracking-wider text-[#39FF14]/90 hover:text-[#39FF14] transition-colors cursor-pointer py-1.5 px-2 -mr-2 min-h-[40px] inline-flex items-center rounded-lg hover:bg-white/5"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                  <Lock size={18} />
                </span>
                <input
                  id="login-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors({ ...errors, password: undefined });
                  }}
                  placeholder="Enter your password"
                  className={`
                    w-full pl-12 pr-14 py-3.5 sm:py-4 min-h-[48px] glass-panel-light border rounded-xl text-base sm:text-sm text-slate-100
                    placeholder-slate-500 focus:outline-none transition-all duration-300 font-sans
                    ${errors.password ? 'border-red-500/40 focus:border-red-500 bg-red-500/[0.01]' : 'border-white/10 focus:border-[#39FF14] neon-focus-glow focus:bg-white/[0.04]'}
                  `}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#39FF14] focus:text-[#39FF14] focus:outline-none p-2.5 min-w-[44px] min-h-[44px] rounded-xl hover:bg-white/10 flex items-center justify-center transition-all cursor-pointer"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <motion.p 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-red-400 ml-1 font-sans flex items-center space-x-1"
                >
                  <span>{errors.password}</span>
                </motion.p>
              )}
            </motion.div>

            {/* Submit Button */}
            <div className="pt-2">
              <motion.button
                id="login-submit-btn"
                type="submit"
                whileHover={{ scale: isLoading ? 1 : 1.01 }}
                whileTap={{ scale: isLoading ? 1 : 0.98 }}
                disabled={isLoading}
                className={`
                  w-full py-4 px-6 min-h-[50px] rounded-xl text-sm font-semibold tracking-wide flex items-center justify-center space-x-2 transition-all duration-300 cursor-pointer
                  ${isLoading 
                    ? 'bg-[#39FF14]/20 text-slate-400 cursor-not-allowed border border-[#39FF14]/20 shadow-none' 
                    : 'bg-[#39FF14] text-black shadow-[0_4px_15px_rgba(57,255,20,0.2)] hover:shadow-[0_4px_25px_rgba(57,255,20,0.35)]'
                  }
                `}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <svg className="animate-spin h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-black/80 font-mono text-xs">Authenticating Profile...</span>
                  </div>
                ) : (
                  <>
                    <LogIn size={18} />
                    <span>Verify & Login</span>
                  </>
                )}
              </motion.button>
            </div>

            {/* Divider */}
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-white/5"></div>
              <span className="flex-shrink mx-4 text-slate-500 text-[10px] font-mono uppercase tracking-widest">or</span>
              <div className="flex-grow border-t border-white/5"></div>
            </div>

            {/* Quick Auth Option: Google */}
            <div>
              {/* Google Sign-In Button */}
              <motion.button
                id="login-google-btn"
                type="button"
                onClick={handleGoogleSignIn}
                whileHover={{ scale: isLoading ? 1 : 1.01 }}
                whileTap={{ scale: isLoading ? 1 : 0.98 }}
                disabled={isLoading}
                className="w-full py-3.5 px-4 min-h-[48px] rounded-xl text-xs sm:text-sm font-semibold tracking-wide flex items-center justify-center space-x-2 bg-white/[0.02] hover:bg-white/[0.06] active:bg-white/[0.1] text-[#39FF14] border border-white/10 hover:border-white/20 transition-all duration-300 cursor-pointer"
              >
                <LogIn size={16} className="text-[#39FF14]" />
                <span className="text-white">Instant Access with Google Account</span>
              </motion.button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Register Redirect Area */}
      <div className="border-t border-white/5 pt-4 text-center">
        <p className="text-xs text-slate-400 font-sans flex items-center justify-center flex-wrap gap-1">
          <span>Don't have an active account?</span>
          <button
            type="button"
            onClick={() => onNavigate('register')}
            className="text-[#39FF14] hover:underline font-semibold font-sans cursor-pointer py-2 px-2.5 min-h-[44px] inline-flex items-center rounded-xl hover:bg-white/5"
          >
            Create Account
          </button>
        </p>
      </div>
    </div>
  );
};
