import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User as UserIcon, Mail, Phone, Lock, Eye, EyeOff, UserPlus, ChevronLeft, Check, AlertCircle, ExternalLink, LogIn } from 'lucide-react';
import { AppView, RegistrationFormErrors } from '../types/auth';
import { authService } from '../services/authService';
import { ENABLE_EMAIL_VERIFICATION } from '../config';

interface RegisterViewProps {
  onNavigate: (view: AppView) => void;
  onSetVerificationEmail: (email: string) => void;
  onShowNotification: (message: string, type: 'success' | 'error') => void;
}

export const RegisterView: React.FC<RegisterViewProps> = ({
  onNavigate,
  onSetVerificationEmail,
  onShowNotification,
}) => {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Real-time validations
  const [usernameValid, setUsernameValid] = useState<{ checked: boolean; valid: boolean; message: string }>({ checked: false, valid: false, message: '' });
  const [emailValid, setEmailValid] = useState<{ checked: boolean; valid: boolean; message: string }>({ checked: false, valid: false, message: '' });
  const [passwordStrength, setPasswordStrength] = useState<{ score: number; label: string; colorClass: string; glowColor: string }>({ score: 0, label: 'None', colorClass: 'bg-slate-800', glowColor: '' });
  const [passwordsMatch, setPasswordsMatch] = useState<boolean | null>(null);

  const [errors, setErrors] = useState<RegistrationFormErrors>({});
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  
  // Real-time Username Check (Debounced to prevent Firestore overload)
  useEffect(() => {
    if (!username) {
      setUsernameValid({ checked: false, valid: false, message: '' });
      return;
    }

    if (username.length < 3) {
      setUsernameValid({ checked: true, valid: false, message: 'Must be at least 3 characters.' });
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setUsernameValid({ checked: true, valid: false, message: 'Only alphanumeric & underscores.' });
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const exists = await authService.isUsernameTaken(username);
        if (exists) {
          setUsernameValid({ checked: true, valid: false, message: 'Username is already taken.' });
        } else {
          setUsernameValid({ checked: true, valid: true, message: 'Username is available.' });
        }
      } catch (err) {
        setUsernameValid({ checked: true, valid: true, message: 'Username is available.' });
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [username]);

  // Real-time Email Check (Debounced to prevent Firestore overload)
  useEffect(() => {
    if (!email) {
      setEmailValid({ checked: false, valid: false, message: '' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailValid({ checked: true, valid: false, message: 'Invalid email syntax.' });
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const exists = await authService.isEmailRegistered(email);
        if (exists) {
          setEmailValid({ checked: true, valid: false, message: 'Email already registered.' });
        } else {
          setEmailValid({ checked: true, valid: true, message: 'Email is valid & unique.' });
        }
      } catch (err) {
        setEmailValid({ checked: true, valid: true, message: 'Email is valid & unique.' });
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [email]);

  // Real-time Password Strength Check
  useEffect(() => {
    if (!password) {
      setPasswordStrength({ score: 0, label: 'None', colorClass: 'bg-slate-800', glowColor: '' });
      return;
    }

    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    let label = 'Weak';
    let colorClass = 'bg-red-500';
    let glowColor = 'shadow-[0_0_10px_rgba(239,68,68,0.5)]';

    if (score >= 4) {
      label = 'Strong';
      colorClass = 'bg-[#39FF14]';
      glowColor = 'shadow-[0_0_10px_rgba(57,255,20,0.5)]';
    } else if (score >= 2) {
      label = 'Medium';
      colorClass = 'bg-amber-500';
      glowColor = 'shadow-[0_0_10px_rgba(245,158,11,0.5)]';
    }

    setPasswordStrength({ score, label, colorClass, glowColor });
  }, [password]);

  // Real-time Confirm Password Match
  useEffect(() => {
    if (!confirmPassword || !password) {
      setPasswordsMatch(null);
      return;
    }
    setPasswordsMatch(password === confirmPassword);
  }, [password, confirmPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: RegistrationFormErrors = {};
    let hasErrors = false;

    // Final checks
    if (!fullName) {
      newErrors.fullName = 'Full Name is required.';
      hasErrors = true;
    }

    if (!usernameValid.valid) {
      newErrors.username = usernameValid.message || 'Invalid username.';
      hasErrors = true;
    }

    if (!emailValid.valid) {
      newErrors.email = emailValid.message || 'Invalid email address.';
      hasErrors = true;
    }

    if (phone && !/^\+?[0-9\s-]{6,16}$/.test(phone)) {
      newErrors.phone = 'Please enter a valid phone number.';
      hasErrors = true;
    }

    if (passwordStrength.score < 2) {
      newErrors.password = 'Password is too weak. Must meet at least 2 requirements.';
      hasErrors = true;
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
      hasErrors = true;
    }

    setErrors(newErrors);
    setRegistrationError(null);
    
    if (hasErrors) {
      onShowNotification('Please resolve errors before submitting.', 'error');
      return;
    }

    setIsLoading(true);

    try {
      const response = await authService.register(fullName, username, email, phone, password);
      setIsLoading(false);

      if (response.success && response.user) {
        onSetVerificationEmail(email);
        onShowNotification('Account initiated. Secure link dispatched!', 'success');

        if (ENABLE_EMAIL_VERIFICATION) {
          onNavigate('verify');
        } else {
          onNavigate('profile-setup');
        }
      } else {
        if (response.operationNotAllowed) {
          setRegistrationError('Email/Password registration is currently unavailable. Please try using another sign-in method like Google.');
        } else {
          setRegistrationError(response.error || 'Registration failed.');
        }
        
        onShowNotification(response.error || 'Registration failed.', 'error');
        setErrors({ email: response.error });
      }
    } catch (err: any) {
      setIsLoading(false);
      setRegistrationError(err.message || 'Registration failed.');
      onShowNotification(err.message || 'Registration failed.', 'error');
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setRegistrationError(null);
    
    try {
      const response = await authService.loginWithGoogle();
      setIsLoading(false);

      if (response.success && response.user) {
        onShowNotification(`Welcome, ${response.user.displayName || 'Scholar'}!`, 'success');
      } else {
        setRegistrationError(response.error || 'Google Sign-In failed.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setRegistrationError(err.message || 'Google Sign-In failed.');
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between py-1">
      {/* Header */}
      <div>
        <button 
          onClick={() => onNavigate('welcome')}
          className="flex items-center space-x-1 text-slate-400 hover:text-white transition-colors py-2 group cursor-pointer"
        >
          <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          <span className="text-xs font-mono">Back to welcome</span>
        </button>

        <div className="mt-4">
          <h2 className="text-2xl font-display font-semibold text-white tracking-tight">
            Create Account
          </h2>
          <p className="text-xs text-slate-450 mt-0.5">
            Join Nexus Academy to start learning from industry veterans
          </p>
        </div>
      </div>

      {/* Register Form Scroll Area */}
      <form onSubmit={handleSubmit} className="flex-1 my-4 space-y-4 pr-1 scrollbar-thin">
        
        {/* Error Notification Alert */}
        <AnimatePresence>
          {registrationError && (
            <motion.div
              initial={{ opacity: 0, height: 0, scale: 0.95 }}
              animate={{ opacity: 1, height: 'auto', scale: 1 }}
              exit={{ opacity: 0, height: 0, scale: 0.95 }}
              className="bg-red-500/10 border-red-500/20 border rounded-2xl p-4 overflow-hidden mb-4"
            >
              <div className="flex items-start space-x-3">
                <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={18} />
                <div className="flex-1">
                  <p className="text-xs text-slate-200 leading-relaxed font-sans">
                    {registrationError}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Full Name Input */}
        <div className="space-y-1">
          <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block ml-1">
            Full Legal Name
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
              <UserIcon size={16} />
            </span>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (errors.fullName) setErrors({ ...errors, fullName: undefined });
              }}
              placeholder="e.g. John Doe"
              className={`
                w-full pl-11 pr-4 py-2.5 bg-white/[0.01] border rounded-xl text-sm text-slate-200
                placeholder-slate-550 focus:outline-none transition-all duration-300 font-sans
                ${errors.fullName ? 'border-red-500/40 focus:border-red-500 bg-red-500/[0.005]' : 'border-white/10 focus:border-[#39FF14]/40'}
              `}
            />
          </div>
          {errors.fullName && (
            <p className="text-xs text-red-400 ml-1">{errors.fullName}</p>
          )}
        </div>

        {/* Username Input with dynamic status indicator */}
        <div className="space-y-1">
          <div className="flex justify-between items-center ml-1">
            <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
              Username
            </label>
            {usernameValid.checked && (
              <span className={`text-[10px] font-mono uppercase tracking-wider ${usernameValid.valid ? 'text-[#39FF14]' : 'text-red-450'}`}>
                {usernameValid.message}
              </span>
            )}
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
              <span className="text-xs font-mono select-none">@</span>
            </span>
            <input
              id="reg-username-input"
              type="text"
              required
              value={username}
              onChange={(e) => {
                setUsername(e.target.value.toLowerCase().replace(/\s/g, ''));
                if (errors.username) setErrors({ ...errors, username: undefined });
              }}
              placeholder="johndoe_99"
              className={`
                w-full pl-11 pr-4 py-2.5 bg-white/[0.01] border rounded-xl text-sm text-slate-200
                placeholder-slate-550 focus:outline-none transition-all duration-300 font-sans
                ${errors.username || (usernameValid.checked && !usernameValid.valid) ? 'border-red-500/40 focus:border-red-500' : 'border-white/10 focus:border-[#39FF14]/40'}
              `}
            />
          </div>
        </div>

        {/* Email Address with dynamic uniqueness indicator */}
        <div className="space-y-1">
          <div className="flex justify-between items-center ml-1">
            <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
              Email Address
            </label>
            {!errors.email && emailValid.checked && (
              <span className={`text-[10px] font-mono uppercase tracking-wider ${emailValid.valid ? 'text-[#39FF14]' : 'text-red-400'}`}>
                {emailValid.message}
              </span>
            )}
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
              <Mail size={15} />
            </span>
            <input
              id="reg-email-input"
              type="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors({ ...errors, email: undefined });
              }}
              placeholder="john@example.com"
              className={`
                w-full pl-11 pr-4 py-2.5 bg-white/[0.01] border rounded-xl text-sm text-slate-200
                placeholder-slate-550 focus:outline-none transition-all duration-300 font-sans
                ${errors.email || (emailValid.checked && !emailValid.valid) ? 'border-red-500/40 focus:border-red-500' : 'border-white/10 focus:border-[#39FF14]/40'}
              `}
            />
          </div>
        </div>

        {/* Phone Number (Optional) */}
        <div className="space-y-1">
          <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block ml-1">
            Phone Number <span className="text-[9px] text-slate-500 font-normal">(Optional)</span>
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
              <Phone size={15} />
            </span>
            <input
              id="reg-phone-input"
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (errors.phone) setErrors({ ...errors, phone: undefined });
              }}
              placeholder="+1 555-0100"
              className={`
                w-full pl-11 pr-4 py-2.5 bg-white/[0.01] border rounded-xl text-sm text-slate-200
                placeholder-slate-550 focus:outline-none transition-all duration-300 font-sans
                ${errors.phone ? 'border-red-500/40 focus:border-red-500' : 'border-white/10 focus:border-[#39FF14]/40'}
              `}
            />
          </div>
          {errors.phone && (
            <p className="text-xs text-red-400 ml-1">{errors.phone}</p>
          )}
        </div>

        {/* Password block with Cyber Strength bar */}
        <div className="space-y-1">
          <div className="flex justify-between items-center ml-1">
            <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
              Create Password
            </label>
            {password && (
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-450">
                STRENGTH:{' '}
                <span className={
                  passwordStrength.label === 'Strong' ? 'text-[#39FF14]' : 
                  passwordStrength.label === 'Medium' ? 'text-amber-400' : 'text-red-450'
                }>
                  {passwordStrength.label}
                </span>
              </span>
            )}
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
              <Lock size={15} />
            </span>
            <input
              id="reg-password-input"
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors({ ...errors, password: undefined });
              }}
              placeholder="Minimum 8 complex characters"
              className={`
                w-full pl-11 pr-11 py-2.5 bg-white/[0.01] border rounded-xl text-sm text-slate-200
                placeholder-slate-550 focus:outline-none transition-all duration-300 font-sans
                ${errors.password ? 'border-red-500/40 focus:border-red-500' : 'border-white/10 focus:border-[#39FF14]/40'}
              `}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          {/* Graphical Cyber Password Strength indicator */}
          {password && (
            <div className="mt-1.5 px-1 space-y-1.5">
              <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden flex space-x-0.5">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`h-full flex-1 transition-all duration-500 ${
                      passwordStrength.score >= step 
                        ? `${passwordStrength.colorClass} ${passwordStrength.glowColor}` 
                        : 'bg-slate-800'
                    }`}
                  />
                ))}
              </div>
              <ul className="text-[10px] font-mono text-slate-400 space-y-0.5 grid grid-cols-2 gap-x-1.5">
                <li className={`flex items-center space-x-1 ${password.length >= 8 ? 'text-[#39FF14]' : ''}`}>
                  <span>{password.length >= 8 ? '✓' : '•'} 8+ characters</span>
                </li>
                <li className={`flex items-center space-x-1 ${/[A-Z]/.test(password) && /[a-z]/.test(password) ? 'text-[#39FF14]' : ''}`}>
                  <span>{/[A-Z]/.test(password) && /[a-z]/.test(password) ? '✓' : '•'} Case mixed</span>
                </li>
                <li className={`flex items-center space-x-1 ${/[0-9]/.test(password) ? 'text-[#39FF14]' : ''}`}>
                  <span>{/[0-9]/.test(password) ? '✓' : '•'} Numeric digit</span>
                </li>
                <li className={`flex items-center space-x-1 ${/[^A-Za-z0-9]/.test(password) ? 'text-[#39FF14]' : ''}`}>
                  <span>{/[^A-Za-z0-9]/.test(password) ? '✓' : '•'} Special symbol</span>
                </li>
              </ul>
            </div>
          )}
          {errors.password && (
            <p className="text-xs text-red-400 ml-1">{errors.password}</p>
          )}
        </div>

        {/* Confirm Password Input with Match status indicator */}
        <div className="space-y-1">
          <div className="flex justify-between items-center ml-1">
            <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
              Confirm Password
            </label>
            {passwordsMatch !== null && (
              <span className={`text-[10px] font-mono uppercase tracking-wider ${passwordsMatch ? 'text-[#39FF14]' : 'text-red-450'}`}>
                {passwordsMatch ? 'Passwords match ✓' : 'Mismatch ✗'}
              </span>
            )}
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
              <Lock size={15} />
            </span>
            <input
              id="reg-confirmpassword-input"
              type={showConfirmPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
              }}
              placeholder="Re-enter your password"
              className={`
                w-full pl-11 pr-11 py-2.5 bg-white/[0.01] border rounded-xl text-sm text-slate-200
                placeholder-slate-550 focus:outline-none transition-all duration-300 font-sans
                ${errors.confirmPassword || (passwordsMatch === false) ? 'border-red-500/40 focus:border-red-500' : 'border-white/10 focus:border-[#39FF14]/40'}
              `}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-red-400 ml-1">{errors.confirmPassword}</p>
          )}
        </div>

        {/* Submit Register Button */}
        <div className="pt-2">
          <motion.button
            id="register-submit-btn"
            type="submit"
            whileHover={{ scale: isLoading ? 1 : 1.01 }}
            whileTap={{ scale: isLoading ? 1 : 0.99 }}
            disabled={isLoading}
            className={`
              w-full py-3.5 rounded-xl text-sm font-semibold tracking-wide flex items-center justify-center space-x-2 transition-all duration-300 cursor-pointer
              ${isLoading 
                ? 'bg-[#39FF14]/20 text-slate-400 cursor-not-allowed border border-[#39FF14]/20' 
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
                <span className="text-black/80 font-mono text-xs">Generating Academic Core...</span>
              </div>
            ) : (
              <>
                <UserPlus size={16} />
                <span>Create Secure Account</span>
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
            id="register-google-btn"
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

      {/* Redirect back to Login */}
      <div className="border-t border-white/5 pt-3 text-center">
        <p className="text-xs text-slate-450 font-sans">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => onNavigate('login')}
            className="text-[#39FF14] hover:underline font-semibold font-sans cursor-pointer ml-1"
          >
            Sign In Instead
          </button>
        </p>
      </div>
    </div>
  );
};
