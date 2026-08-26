import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mail, 
  CheckCircle, 
  RefreshCw, 
  Send, 
  Edit2, 
  ArrowLeft, 
  ShieldCheck, 
  AlertTriangle, 
  KeyRound, 
  Clock,
  Sparkles,
  Check
} from 'lucide-react';
import { AppView } from '../types/auth';
import { authService } from '../services/authService';
import { otpService } from '../services/otpService';
import { auth } from '../services/firebase';
import { NeonConfetti } from './NeonConfetti';

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
  // 6-digit OTP inputs state
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timers: Resend cooldown (60s) & Expiry (300s = 5m)
  const [resendCooldown, setResendCooldown] = useState<number>(60);
  const [isResendDisabled, setIsResendDisabled] = useState<boolean>(true);
  const [expiresInSeconds, setExpiresInSeconds] = useState<number>(300);

  // States
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [devOtpCode, setDevOtpCode] = useState<string | null>(null);
  const [emailDispatched, setEmailDispatched] = useState<boolean>(false);

  // Edit email modal/inline state
  const [isChangingEmail, setIsChangingEmail] = useState<boolean>(false);
  const [newEmail, setNewEmail] = useState<string>('');
  const [changeEmailError, setChangeEmailError] = useState<string | null>(null);

  // Send initial OTP upon opening if email is present
  useEffect(() => {
    let isMounted = true;
    if (email) {
      otpService.sendOtp(email, 'signup').then((res) => {
        if (!isMounted) return;
        if (res.success) {
          if (res.emailDispatched) {
            setEmailDispatched(true);
            onShowNotification(res.message || '৬-ডিজিটের ভেরিফিকেশন কোড ইমেইলে পাঠানো হয়েছে।', 'success');
          } else {
            if (res.devOtp) setDevOtpCode(res.devOtp);
            onShowNotification(res.message || 'ভেরিফিকেশন কোড প্রস্তুত করা হয়েছে।', 'success');
          }
          if (res.expiresIn) setExpiresInSeconds(res.expiresIn);
        } else {
          setErrorMessage(res.error || 'ওটিপি পাঠাতে সমস্যা হয়েছে।');
        }
      });
    }

    return () => {
      isMounted = false;
    };
  }, [email]);

  // Focus the first input box on load
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // 60-second Resend Cooldown Countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendCooldown > 0 && isResendDisabled) {
      interval = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    } else if (resendCooldown === 0) {
      setIsResendDisabled(false);
    }
    return () => clearInterval(interval);
  }, [resendCooldown, isResendDisabled]);

  // 5-Minute OTP Expiry Countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (expiresInSeconds > 0 && !isSuccess) {
      interval = setInterval(() => {
        setExpiresInSeconds((prev) => {
          if (prev <= 1) {
            setErrorMessage('ভেরিফিকেশন কোডের ৫ মিনিটের মেয়াদ শেষ হয়ে গেছে (Expired)। অনুগ্রহ করে নতুন কোড পাঠান।');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [expiresInSeconds, isSuccess]);

  // Format expiry time MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Handle single digit input
  const handleDigitChange = (index: number, value: string) => {
    // Only accept numeric digit
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned) {
      const newDigits = [...otpDigits];
      newDigits[index] = '';
      setOtpDigits(newDigits);
      return;
    }

    // Take the last character typed
    const digit = cleaned.slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);
    setErrorMessage(null);

    // Auto-focus next input box
    if (index < 5 && digit) {
      inputRefs.current[index + 1]?.focus();
    }

    // If 6th digit entered, auto submit
    const fullOtp = newDigits.join('');
    if (fullOtp.length === 6 && index === 5) {
      handleVerifyOtp(fullOtp);
    }
  };

  // Handle KeyDown for Backspace navigation
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        // Move to previous and clear it
        const newDigits = [...otpDigits];
        newDigits[index - 1] = '';
        setOtpDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle Paste event (Pasting entire 6 digits e.g. "548920")
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length > 0) {
      const newDigits = [...otpDigits];
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pastedData[i] || '';
      }
      setOtpDigits(newDigits);
      setErrorMessage(null);

      // Focus last filled box or next empty box
      const targetIndex = Math.min(pastedData.length, 5);
      inputRefs.current[targetIndex]?.focus();

      if (pastedData.length === 6) {
        handleVerifyOtp(pastedData);
      }
    }
  };

  // Submit & Verify OTP
  const handleVerifyOtp = async (otpToVerify?: string) => {
    const code = otpToVerify || otpDigits.join('');
    if (code.length !== 6) {
      setErrorMessage('অনুগ্রহ করে সম্পূর্ণ ৬-ডিজিট ওটিপি কোডটি প্রদান করুন।');
      return;
    }

    if (expiresInSeconds <= 0) {
      setErrorMessage('ভেরিফিকেশন কোডের মেয়াদ শেষ হয়ে গেছে। অনুগ্রহ করে নতুন কোড পাঠান।');
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const response = await otpService.verifyOtp(email, code);
      setIsVerifying(false);

      if (response.success) {
        setIsSuccess(true);
        onShowNotification('অভিনন্দন! আপনার ইমেইল সফলভাবে ভেরিফাই করা হয়েছে।', 'success');

        // Store local verification override so App.tsx knows verification is complete
        try {
          if (auth.currentUser) {
            localStorage.setItem(`nexus_email_verified_${auth.currentUser.uid}`, 'true');
            if (auth.currentUser.email) {
              localStorage.setItem(`nexus_email_verified_${auth.currentUser.email}`, 'true');
            }
          }
          localStorage.setItem(`nexus_email_verified_${email}`, 'true');
        } catch (e) {}

        // Force reload current Firebase user to update emailVerified state
        try {
          if (auth.currentUser) {
            await auth.currentUser.reload();
          }
        } catch (e) {}

        // Immediate reload or navigation to clear verification screen blocker
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        if (response.attemptsLeft !== undefined) {
          setAttemptsLeft(response.attemptsLeft);
        }
        setErrorMessage(response.error || 'ভুল ওটিপি কোড। অনুগ্রহ করে আবার চেষ্টা করুন।');
        onShowNotification(response.error || 'ওটিপি ভেরিফিকেশন ব্যর্থ হয়েছে।', 'error');
      }
    } catch (err: any) {
      setIsVerifying(false);
      setErrorMessage(err.message || 'ভেরিফিকেশন প্রসেস করতে ত্রুটি হয়েছে।');
      onShowNotification(err.message || 'ত্রুটি ঘটেছে।', 'error');
    }
  };

  // Resend OTP handler
  const handleResendOtp = async () => {
    if (isResendDisabled || isResending) return;

    setIsResending(true);
    setErrorMessage(null);
    setOtpDigits(['', '', '', '', '', '']);

    try {
      const response = await otpService.resendOtp(email, 'resend');
      setIsResending(false);

      if (response.success) {
        setResendCooldown(60);
        setIsResendDisabled(true);
        setExpiresInSeconds(300);
        setAttemptsLeft(5);

        if (response.emailDispatched) {
          setEmailDispatched(true);
          onShowNotification('নতুন ৬-ডিজিট ওটিপি কোড আপনার ইমেইলে পাঠানো হয়েছে।', 'success');
        } else {
          if (response.devOtp) setDevOtpCode(response.devOtp);
          onShowNotification('নতুন ভেরিফিকেশন কোড প্রস্তুত করা হয়েছে।', 'success');
        }

        inputRefs.current[0]?.focus();
      } else {
        setErrorMessage(response.error || 'নতুন কোড পাঠাতে সমস্যা হয়েছে।');
        onShowNotification(response.error || 'ব্যর্থ হয়েছে।', 'error');
      }
    } catch (err: any) {
      setIsResending(false);
      setErrorMessage(err.message || 'নতুন কোড পাঠাতে ত্রুটি হয়েছে।');
      onShowNotification(err.message || 'ত্রুটি ঘটেছে।', 'error');
    }
  };

  // Auto-fill dev test code helper
  const handleAutoFillDevOtp = () => {
    if (devOtpCode && devOtpCode.length === 6) {
      const digits = devOtpCode.split('');
      setOtpDigits(digits);
      setErrorMessage(null);
      handleVerifyOtp(devOtpCode);
    }
  };

  // Change email workflow
  const handleChangeEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangeEmailError(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!newEmail || !emailRegex.test(newEmail)) {
      setChangeEmailError('অনুগ্রহ করে সঠিক ইমেইল এড্রেস প্রদান করুন।');
      return;
    }

    if (newEmail.toLowerCase() === email.toLowerCase()) {
      setChangeEmailError('এটি ইতিমধ্যেই আপনার বর্তমান ইমেইল।');
      return;
    }

    setIsVerifying(true);
    try {
      const response = await otpService.sendOtp(newEmail, 'signup');
      setIsVerifying(false);

      if (response.success) {
        onSetVerificationEmail(newEmail);
        setIsChangingEmail(false);
        setNewEmail('');
        setOtpDigits(['', '', '', '', '', '']);
        setResendCooldown(60);
        setIsResendDisabled(true);
        setExpiresInSeconds(300);
        if (response.devOtp) setDevOtpCode(response.devOtp);
        onShowNotification('ইমেইল পরিবর্তন করা হয়েছে এবং নতুন ওটিপি পাঠানো হয়েছে!', 'success');
      } else {
        setChangeEmailError(response.error || 'নতুন ইমেইলে ওটিপি পাঠাতে ব্যর্থ হয়েছে।');
      }
    } catch (err: any) {
      setIsVerifying(false);
      setChangeEmailError(err.message || 'ত্রুটি ঘটেছে।');
    }
  };

  const handleSignOut = async () => {
    await authService.logout();
    onShowNotification('লগআউট করা হয়েছে।', 'success');
    onNavigate('welcome');
  };

  return (
    <div className="flex-1 flex flex-col justify-between py-1 relative">
      <NeonConfetti active={isSuccess} particleCount={45} />

      {/* Success Modal Overlay */}
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
              animate={{ scale: [0.5, 1.15, 1], opacity: 1 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="w-24 h-24 rounded-full bg-[#39FF14]/15 border-2 border-[#39FF14] flex items-center justify-center relative shadow-[0_0_35px_rgba(57,255,20,0.4)] mb-5"
            >
              <div className="absolute inset-0 rounded-full border-4 border-[#39FF14] animate-ping opacity-25" />
              <CheckCircle size={48} className="text-[#39FF14]" />
            </motion.div>

            <motion.h3
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-2xl font-display font-bold text-white"
            >
              ইমেইল ভেরিফিকেশন সফল!
            </motion.h3>

            <motion.p
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-slate-300 text-sm mt-2 max-w-xs leading-relaxed"
            >
              আপনার Nexus Academy একাউন্ট সফলভাবে ভেরিফাই ও সক্রিয় করা হয়েছে। আপনাকে প্রোফাইলে রিডাইরেক্ট করা হচ্ছে...
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              transition={{ delay: 0.5 }}
              className="mt-8 flex items-center space-x-2 text-xs text-[#39FF14] font-mono tracking-wider"
            >
              <Sparkles size={14} className="animate-spin" />
              <span>AUTHENTICATION PROTOCOL COMPLETE...</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div>
        <button
          onClick={handleSignOut}
          className="inline-flex items-center space-x-1.5 text-slate-300 hover:text-white transition-colors py-2 px-3 -ml-3 rounded-xl hover:bg-white/5 active:bg-white/10 min-h-[44px] group cursor-pointer"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform text-[#39FF14]" />
          <span className="text-xs font-mono font-medium">Cancel & Sign Out</span>
        </button>

        <div className="mt-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#39FF14]/10 border border-[#39FF14]/30 flex items-center justify-center text-[#39FF14] shadow-[0_0_15px_rgba(57,255,20,0.15)]">
              <KeyRound size={20} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-display font-semibold text-white tracking-tight">
                ইমেইল ওটিপি ভেরিফিকেশন
              </h2>
              <p className="text-xs text-slate-400">
                Email OTP Verification
              </p>
            </div>
          </div>

          <div className="mt-3 bg-white/[0.02] border border-white/10 px-3.5 py-2.5 rounded-xl flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center space-x-2 min-w-0">
              <Mail size={15} className="text-[#39FF14] shrink-0" />
              <span className="text-xs text-slate-200 font-mono truncate">{email}</span>
            </div>
            <button
              onClick={() => {
                setNewEmail(email);
                setIsChangingEmail(!isChangingEmail);
              }}
              className="text-[11px] font-mono text-[#39FF14] hover:underline flex items-center space-x-1 py-1 px-2 rounded hover:bg-[#39FF14]/10 transition-colors cursor-pointer"
            >
              <Edit2 size={12} />
              <span>ইমেইল পরিবর্তন</span>
            </button>
          </div>
        </div>
      </div>

      {/* Change Email Inline Dropdown */}
      <AnimatePresence>
        {isChangingEmail && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="my-3 bg-white/[0.03] border border-white/10 rounded-2xl p-4 space-y-2.5"
          >
            <form onSubmit={handleChangeEmailSubmit} className="space-y-2.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-slate-300 block">
                নতুন ইমেইল এড্রেস লিখুন
              </label>
              <div className="flex space-x-2">
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="new.email@example.com"
                  className="flex-1 bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 min-h-[44px] text-sm text-slate-100 focus:outline-none focus:border-[#39FF14]"
                />
                <button
                  type="submit"
                  disabled={isVerifying}
                  className="bg-[#39FF14] text-black hover:bg-[#32e011] font-semibold rounded-xl px-4 py-2.5 text-xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send size={13} />
                  <span>Send OTP</span>
                </button>
              </div>
              {changeEmailError && (
                <p className="text-xs text-red-400">{changeEmailError}</p>
              )}
              <button
                type="button"
                onClick={() => setIsChangingEmail(false)}
                className="text-xs text-slate-400 hover:underline"
              >
                বাতিল করুন
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main 6-Digit OTP Box Area */}
      <div className="flex-1 my-4 flex flex-col justify-center space-y-4">
        
        {/* Developer Sandbox Helper Banner if devOtp is present */}
        {devOtpCode && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 flex items-center justify-between"
          >
            <div className="flex items-center space-x-2 text-xs text-emerald-300 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Dev OTP Code: <strong className="text-white text-sm tracking-widest">{devOtpCode}</strong></span>
            </div>
            <button
              onClick={handleAutoFillDevOtp}
              className="px-2.5 py-1 text-[11px] font-mono font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg transition-colors cursor-pointer"
            >
              Auto-fill Code
            </button>
          </motion.div>
        )}

        {/* Expiry & Validity Status Indicator */}
        <div className="flex items-center justify-between text-xs px-1 font-mono">
          <div className="flex items-center space-x-1.5 text-slate-400">
            <Clock size={14} className="text-[#39FF14]" />
            <span>কোডের মেয়াদ:</span>
            <span className={`font-bold ${expiresInSeconds < 60 ? 'text-red-400 animate-pulse' : 'text-[#39FF14]'}`}>
              {formatTime(expiresInSeconds)}
            </span>
          </div>
          {attemptsLeft !== null && (
            <span className="text-amber-400 text-[11px]">
              বাকি সুযোগ: {attemptsLeft} বার
            </span>
          )}
        </div>

        {/* 6 Segmented Input Boxes with Auto-focus & Paste */}
        <div 
          className="flex justify-between items-center gap-2 sm:gap-3"
          onPaste={handlePaste}
        >
          {otpDigits.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => { inputRefs.current[idx] = el; }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              className={`
                w-11 sm:w-14 h-14 sm:h-16 text-center text-xl sm:text-2xl font-mono font-bold rounded-xl border
                bg-black/50 text-white transition-all duration-200 outline-none
                ${digit 
                  ? 'border-[#39FF14] shadow-[0_0_15px_rgba(57,255,20,0.25)] bg-[#39FF14]/5' 
                  : 'border-white/15 focus:border-[#39FF14] focus:shadow-[0_0_12px_rgba(57,255,20,0.2)] focus:bg-white/[0.04]'
                }
              `}
            />
          ))}
        </div>

        {/* Error Alert Box */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, height: 0, scale: 0.96 }}
              animate={{ opacity: 1, height: 'auto', scale: 1 }}
              exit={{ opacity: 0, height: 0, scale: 0.96 }}
              className="bg-red-500/10 border border-red-500/25 rounded-xl p-3 flex items-start space-x-2.5 text-xs text-red-300"
            >
              <AlertTriangle size={16} className="shrink-0 mt-0.5 text-red-400" />
              <div className="flex-1 leading-relaxed">
                {errorMessage}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Verify Button */}
        <motion.button
          onClick={() => handleVerifyOtp()}
          whileHover={{ scale: isVerifying ? 1 : 1.01 }}
          whileTap={{ scale: isVerifying ? 1 : 0.98 }}
          disabled={isVerifying || otpDigits.join('').length !== 6 || expiresInSeconds <= 0}
          className={`
            w-full py-4 px-6 min-h-[50px] rounded-xl text-sm font-semibold tracking-wide flex items-center justify-center space-x-2 transition-all duration-300 cursor-pointer
            ${isVerifying || otpDigits.join('').length !== 6 || expiresInSeconds <= 0
              ? 'bg-[#39FF14]/20 text-slate-400 cursor-not-allowed border border-[#39FF14]/20'
              : 'bg-[#39FF14] text-black shadow-[0_4px_15px_rgba(57,255,20,0.25)] hover:shadow-[0_4px_25px_rgba(57,255,20,0.4)]'
            }
          `}
        >
          {isVerifying ? (
            <div className="flex items-center space-x-2">
              <RefreshCw size={16} className="animate-spin text-black" />
              <span className="text-black/90 font-mono text-xs">ভেরিফাই করা হচ্ছে...</span>
            </div>
          ) : (
            <>
              <ShieldCheck size={18} />
              <span>ওটিপি ভেরিফাই করুন (Verify OTP)</span>
            </>
          )}
        </motion.button>
      </div>

      {/* Footer: Resend Code & Cooldown */}
      <div className="border-t border-white/5 pt-4 text-center space-y-2">
        <p className="text-xs text-slate-400">
          কোডটি পাননি বা ইনবক্সে আসেনি?
        </p>

        {isResendDisabled ? (
          <div className="inline-flex items-center space-x-2 text-xs font-mono text-slate-400 bg-white/[0.02] border border-white/10 px-4 py-2 min-h-[40px] rounded-full">
            <span>নতুন কোড পাঠানোর সময় বাকি:</span>
            <span className="text-[#39FF14] font-bold">{resendCooldown}s</span>
          </div>
        ) : (
          <motion.button
            onClick={handleResendOtp}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={isResending}
            className="text-xs font-semibold text-[#39FF14] hover:underline inline-flex items-center justify-center space-x-1.5 py-2.5 px-4 min-h-[44px] rounded-xl hover:bg-[#39FF14]/10 cursor-pointer"
          >
            <RefreshCw size={14} className={isResending ? 'animate-spin' : ''} />
            <span>নতুন ওটিপি কোড পাঠান (Resend OTP)</span>
          </motion.button>
        )}
      </div>
    </div>
  );
};
