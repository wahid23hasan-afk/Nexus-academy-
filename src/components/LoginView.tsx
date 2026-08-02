import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, Eye, EyeOff, LogIn, ChevronLeft, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';
import { AppView, LoginFormErrors } from '../types/auth';
import { authService } from '../services/authService';

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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  
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
      setIsLoading(false);

      if (response.success && response.user) {
        onShowNotification(`Welcome back, ${response.user.displayName || 'Scholar'}!`, 'success');
        setLoginError(null);
      } else {
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
      setIsLoading(false);

      if (response.success && response.user) {
        onShowNotification(`Welcome, ${response.user.displayName || 'Scholar'}!`, 'success');
      } else {
        setLoginError(response.error || 'Google Sign-In failed.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setLoginError(err.message || 'Google Sign-In failed.');
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setErrors({ email: 'Please enter your email to request a reset link.' });
      onShowNotification('Email address is required.', 'error');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors({ email: 'Please enter a valid email address.' });
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.sendPasswordReset(email);
      setIsLoading(false);
      
      if (response.success) {
        onShowNotification(`Reset email dispatched to ${email}!`, 'success');
        
              } else {
        setLoginError(response.error || 'Failed to dispatch password reset link.');
        onShowNotification(response.error || 'Password reset failed', 'error');
      }
    } catch (err: any) {
      setIsLoading(false);
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
          onClick={() => onNavigate('welcome')}
          className="flex items-center space-x-1 text-slate-400 hover:text-white transition-colors py-2 group cursor-pointer"
        >
          <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          <span className="text-xs font-mono">Back to welcome</span>
        </button>

        <div className="mt-6">
          <h2 className="text-2xl font-display font-semibold text-white tracking-tight">
            Welcome Back
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Sign in to continue your masterclass programs
          </p>
        </div>
      </div>

      {/* Form Area */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-center my-6 space-y-4">
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
                      className="mt-2.5 text-xs text-[#39FF14] hover:underline font-semibold flex items-center space-x-1 cursor-pointer"
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
        <div className="space-y-1.5">
          <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block ml-1">
            Email Address
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
              <Mail size={16} />
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
                w-full pl-11 pr-4 py-3.5 glass-panel-light border rounded-xl text-sm text-slate-200
                placeholder-slate-500 focus:outline-none transition-all duration-300 font-sans
                ${errors.email ? 'border-red-500/40 focus:border-red-500 bg-red-500/[0.01]' : 'border-white/10 focus:border-[#39FF14]/40 focus:bg-white/[0.04]'}
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
        </div>

        {/* Password Input */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center ml-1">
            <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
              Password
            </label>
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-[11px] font-mono uppercase tracking-wider text-[#39FF14]/80 hover:text-[#39FF14] transition-colors cursor-pointer animate-pulse"
            >
              Forgot?
            </button>
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
              <Lock size={16} />
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
                w-full pl-11 pr-12 py-3.5 glass-panel-light border rounded-xl text-sm text-slate-200
                placeholder-slate-500 focus:outline-none transition-all duration-300 font-sans
                ${errors.password ? 'border-red-500/40 focus:border-red-500 bg-red-500/[0.01]' : 'border-white/10 focus:border-[#39FF14]/40 focus:bg-white/[0.04]'}
              `}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
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
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <motion.button
            id="login-submit-btn"
            type="submit"
            whileHover={{ scale: isLoading ? 1 : 1.01 }}
            whileTap={{ scale: isLoading ? 1 : 0.99 }}
            disabled={isLoading}
            className={`
              w-full py-4 rounded-xl text-sm font-semibold tracking-wide flex items-center justify-center space-x-2 transition-all duration-300 cursor-pointer
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
                <LogIn size={16} />
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

        {/* Google Sign-In Button */}
        <div>
          <motion.button
            id="login-google-btn"
            type="button"
            onClick={handleGoogleSignIn}
            whileHover={{ scale: isLoading ? 1 : 1.01 }}
            whileTap={{ scale: isLoading ? 1 : 0.99 }}
            disabled={isLoading}
            className="w-full py-3.5 rounded-xl text-xs font-semibold tracking-wide flex items-center justify-center space-x-2 bg-white/[0.02] hover:bg-white/[0.05] text-white border border-white/10 hover:border-white/20 transition-all duration-300 cursor-pointer"
          >
            <LogIn size={14} className="text-[#39FF14]" />
            <span>Instant Access with Google Account</span>
          </motion.button>
        </div>
      </form>

      {/* Register Redirect Area */}
      <div className="border-t border-white/5 pt-4 text-center">
        <p className="text-xs text-slate-450 font-sans">
          Don't have an active account?{' '}
          <button
            type="button"
            onClick={() => onNavigate('register')}
            className="text-[#39FF14] hover:underline font-semibold font-sans cursor-pointer ml-1"
          >
            Create Account
          </button>
        </p>
      </div>
    </div>
  );
};
