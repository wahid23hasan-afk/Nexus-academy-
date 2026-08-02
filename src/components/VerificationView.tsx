import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, CheckCircle, RefreshCw, Send, Edit2, ExternalLink, ArrowLeft, ShieldAlert } from 'lucide-react';
import { AppView } from '../types/auth';
import { authService } from '../services/authService';

interface VerificationViewProps {
  email: string;
  onNavigate: (view: AppView) => void;
  onSetVerificationEmail: (email: string) => void;
  onShowNotification: (message: string, type: 'success' | 'error') => void;
}

export const VerificationView: React.FC<VerificationViewProps> = ({
  email,
  onNavigate,
  onSetVerificationEmail,
  onShowNotification,
}) => {
    const [timer, setTimer] = useState(60);
  const [isResendDisabled, setIsResendDisabled] = useState(true);
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [changeEmailError, setChangeEmailError] = useState<string | null>(null);
  // 60-second countdown timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0 && isResendDisabled) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setIsResendDisabled(false);
    }
    return () => clearInterval(interval);
  }, [timer, isResendDisabled]);

  // Background real-time verification status polling (Auto-detect when email becomes verified!)
  useEffect(() => {
    let active = true;
    const pollInterval = setInterval(async () => {
      if (!active || isSuccess || isVerifying) return;
      
      try {
        const response = await authService.checkVerificationStatus();
        if (response.success && response.verified) {
          clearInterval(pollInterval);
          setIsSuccess(true);
          onShowNotification('Email verification detected automatically!', 'success');
          setTimeout(() => {
            onNavigate('welcome'); // Redirect to welcomed/authenticated state
          }, 2500);
        }
      } catch (err) {
        console.warn('Silent verification polling failed:', err);
      }
    }, 4000); // Poll every 4 seconds

    return () => {
      active = false;
      clearInterval(pollInterval);
    };
  }, [isSuccess, isVerifying, onNavigate, onShowNotification]);
  // Resend code/link trigger
  const handleResend = async () => {
    setIsVerifying(true);
    try {
      const response = await authService.resendVerificationEmail();
      setIsVerifying(false);
      
      if (response.success) {
        onShowNotification('A fresh secure verification link has been dispatched!', 'success');
        setTimer(60);
        setIsResendDisabled(true);
              } else {
        onShowNotification(response.error || 'Failed to resend link.', 'error');
      }
    } catch (err: any) {
      setIsVerifying(false);
      onShowNotification(err.message || 'Resend link failed.', 'error');
    }
  };

  // Change email workflow
  const handleChangeEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangeEmailError(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!newEmail || !emailRegex.test(newEmail)) {
      setChangeEmailError('Please enter a valid email address.');
      return;
    }

    if (newEmail.toLowerCase() === email.toLowerCase()) {
      setChangeEmailError('This is already your current email.');
      return;
    }

    setIsVerifying(true);
    try {
      const response = await authService.changeEmail(newEmail);
      setIsVerifying(false);
      
      if (response.success) {
        onSetVerificationEmail(newEmail);
        onShowNotification('Email updated and link dispatched!', 'success');
        setIsChangingEmail(false);
        setNewEmail('');
        setTimer(60);
        setIsResendDisabled(true);
              } else {
        setChangeEmailError(response.error || 'Failed to change email address.');
      }
    } catch (err: any) {
      setIsVerifying(false);
      setChangeEmailError(err.message || 'An unexpected error occurred.');
    }
  };

  // Open Email client helper
  const handleOpenEmailApp = () => {
    window.open('mailto:', '_blank');
    onShowNotification('Attempted to launch local mail app.', 'success');
  };

  // Refresh status checks current Firebase state
  const handleRefreshStatus = async () => {
    setIsVerifying(true);
    try {
      const response = await authService.checkVerificationStatus();
      setIsVerifying(false);
      
      if (response.success && response.verified) {
        setIsSuccess(true);
        onShowNotification('Email address is verified!', 'success');
        setTimeout(() => {
          onNavigate('welcome');
        }, 2500);
      } else {
        onShowNotification('Verification pending. Please click the link sent to your email.', 'error');
      }
    } catch (err: any) {
      setIsVerifying(false);
      onShowNotification(err.message || 'Verification check failed.', 'error');
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    onShowNotification('Signed out from unverified session.', 'success');
    onNavigate('welcome');
  };

  return (
    <div className="flex-1 flex flex-col justify-between py-1 relative">
      {/* Absolute success overlay animation */}
      <AnimatePresence>
        {isSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#050811] z-50 rounded-2xl flex flex-col items-center justify-center p-6 text-center"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: [0.5, 1.1, 1], opacity: 1 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="w-24 h-24 rounded-full bg-[#39FF14]/10 border-2 border-[#39FF14] flex items-center justify-center relative shadow-[0_0_30px_rgba(57,255,20,0.3)] mb-6"
            >
              {/* Pulsing neon rings */}
              <div className="absolute inset-0 rounded-full border-4 border-[#39FF14] animate-ping opacity-30" />
              <CheckCircle size={48} className="text-[#39FF14]" />
            </motion.div>

            <motion.h3
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-display font-bold text-white animate-pulse"
            >
              Access Granted!
            </motion.h3>

            <motion.p
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-slate-300 text-sm mt-2 max-w-xs leading-relaxed"
            >
              Your secure academic credentials have been verified by our high-fidelity matrix system. Transitioning to your study academy...
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              transition={{ delay: 0.8 }}
              className="mt-12 text-xs text-[#39FF14] font-mono tracking-widest animate-pulse"
            >
              ESTABLISHING ENCRYPTION LAYER...
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div>
        <button 
          onClick={handleLogout}
          className="flex items-center space-x-1 text-slate-400 hover:text-white transition-colors py-2 group cursor-pointer"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          <span className="text-xs font-mono font-medium">Cancel & Sign Out</span>
        </button>

        <div className="mt-4">
          <h2 className="text-2xl font-display font-semibold text-white tracking-tight flex items-center space-x-2">
            <Mail className="text-[#39FF14] animate-pulse" size={24} />
            <span>Shield Verification</span>
          </h2>
          {/* Specific request message */}
          <p className="text-xs text-[#39FF14] mt-2 font-medium bg-[#39FF14]/5 border border-[#39FF14]/10 px-3 py-2 rounded-xl">
            "Your email address has not been verified yet. Please verify your email before logging in."
          </p>
        </div>
      </div>

      {/* Main verification area */}
      <div className="flex-1 my-6 flex flex-col justify-center space-y-6">
        
        {/* Verification target label */}
        <div className="text-center">
          <span className="text-xs text-slate-450 font-sans block">Official link dispatched to:</span>
          <span className="text-sm text-slate-200 font-mono font-semibold mt-0.5 bg-white/[0.02] border border-white/5 px-3 py-1 rounded-full inline-flex items-center space-x-1">
            <span>{email}</span>
            <button
              onClick={() => {
                setNewEmail(email);
                setIsChangingEmail(!isChangingEmail);
              }}
              className="p-1 hover:text-[#39FF14] transition-colors cursor-pointer"
              title="Change email address"
            >
              <Edit2 size={12} />
            </button>
          </span>
        </div>

        {/* Change Email Form Block (Interactive Modal) */}
        <AnimatePresence>
          {isChangingEmail && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 space-y-3"
            >
              <form onSubmit={handleChangeEmailSubmit} className="space-y-2">
                <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                  Enter New Email Address
                </label>
                <div className="flex space-x-2">
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="new.email@example.com"
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#39FF14]"
                  />
                  <button
                    type="submit"
                    className="bg-[#39FF14] text-black hover:bg-[#32e011] transition-colors rounded-xl px-3 text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                  >
                    <Send size={11} />
                    <span>Update</span>
                  </button>
                </div>
                {changeEmailError && (
                  <p className="text-xs text-red-400 mt-1">{changeEmailError}</p>
                )}
                <button
                  type="button"
                  onClick={() => setIsChangingEmail(false)}
                  className="text-[10px] text-slate-400 hover:underline block"
                >
                  Cancel Change
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Informative Live Tracker */}
        <div className="space-y-4 bg-white/[0.01] border border-white/5 rounded-2xl p-4 text-center">
          <div className="flex items-center justify-center space-x-2 text-xs text-[#39FF14] font-mono animate-pulse">
            <span className="w-2 h-2 rounded-full bg-[#39FF14] inline-block" />
            <span>ACTIVELY POLLING FIREBASE AUTH MATRIX...</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
            Please click the official verification link inside your email inbox to verify. The system will auto-detect the click and grant entrance instantly.
          </p>
        </div>

        {/* Action Options Row (Open Email App & Status Refresh) */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={handleOpenEmailApp}
            className="flex items-center justify-center space-x-1.5 px-3 py-2.5 bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-xl text-xs text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            <ExternalLink size={13} />
            <span>Open Email App</span>
          </button>
          
          <button
            onClick={handleRefreshStatus}
            className="flex items-center justify-center space-x-1.5 px-3 py-2.5 bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-xl text-xs text-slate-300 hover:text-white transition-all cursor-pointer font-semibold"
          >
            <RefreshCw size={13} className={isVerifying ? 'animate-spin' : ''} />
            <span>Refresh Status</span>
          </button>
        </div>

      </div>

      {/* Footer countdown and resend control */}
      <div className="border-t border-white/5 pt-4 text-center space-y-2">
        <p className="text-xs text-slate-450">
          Didn't receive the verification link?
        </p>
        
        {isResendDisabled ? (
          <div className="inline-flex items-center space-x-2 text-xs font-mono text-slate-450 bg-white/[0.01] border border-white/5 px-3 py-1.5 rounded-full">
            <span>Resend secure link in</span>
            <span className="text-[#39FF14] font-bold">{timer}s</span>
          </div>
        ) : (
          <motion.button
            onClick={handleResend}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="text-xs font-semibold text-[#39FF14] hover:underline flex items-center justify-center space-x-1 mx-auto cursor-pointer"
          >
            <Send size={12} />
            <span>Resend Verification Link</span>
          </motion.button>
        )}
      </div>
    </div>
  );
};
