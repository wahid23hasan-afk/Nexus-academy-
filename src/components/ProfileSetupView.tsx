import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Camera, 
  Upload, 
  Phone, 
  Calendar, 
  ChevronRight, 
  Check, 
  AlertCircle, 
  RefreshCw, 
  RotateCw, 
  Image as ImageIcon,
  Wifi, 
  WifiOff, 
  X,
  LogOut
} from 'lucide-react';
import { authService } from '../services/authService';

interface ProfileSetupViewProps {
  user: any;
  onComplete: () => void;
  onShowNotification: (message: string, type: 'success' | 'error') => void;
}

export const ProfileSetupView: React.FC<ProfileSetupViewProps> = ({
  user,
  onComplete,
  onShowNotification,
}) => {
  // Page states
  const [fullName, setFullName] = useState(user?.displayName || '');
  const [username, setUsername] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [gender, setGender] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  
  // Validation & Loading States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isUsernameChecking, setIsUsernameChecking] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Avatar and Image states
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.photoURL || null);
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);
  const [rawImage, setRawImage] = useState<string | null>(null); // Raw loaded image for cropper
  
  // Camera States
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Cropper states
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const cropperContainerRef = useRef<HTMLDivElement>(null);

  // Connectivity monitoring
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      onShowNotification('Connected to the internet.', 'success');
    };
    const handleOffline = () => {
      setIsOnline(false);
      onShowNotification('Network offline. Form data will save once connection is restored.', 'error');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onShowNotification]);

  // Username validation regex: 3-20 chars, letters, numbers, underscore only, no spaces
  const validateUsername = (val: string): boolean => {
    const regex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!val) {
      setUsernameError('Username is required.');
      return false;
    }
    if (!regex.test(val)) {
      setUsernameError('Use 3-20 characters: letters, numbers, and underscores only.');
      return false;
    }
    setUsernameError(null);
    return true;
  };

  // Perform debounced username availability checks
  useEffect(() => {
    if (!username) {
      setUsernameError(null);
      return;
    }

    const timer = setTimeout(async () => {
      if (validateUsername(username)) {
        setIsUsernameChecking(true);
        const taken = await authService.isUsernameTaken(username);
        setIsUsernameChecking(false);
        if (taken) {
          setUsernameError('Username is already taken.');
        } else {
          setUsernameError(null);
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username]);

  // Phone number validation: standard basic pattern matching
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPhoneNumber(val);
    
    if (!val) {
      setPhoneError(null);
      return;
    }

    const phoneRegex = /^\+?[0-9\s\-()]{7,15}$/;
    if (!phoneRegex.test(val)) {
      setPhoneError('Please enter a valid phone number (7-15 digits).');
    } else {
      setPhoneError(null);
    }
  };

  // Handle local image file load
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setRawImage(reader.result as string);
        setZoom(1);
        setPan({ x: 0, y: 0 });
      };
      reader.readAsDataURL(file);
    }
  };

  // Camera Functions
  const startCamera = async () => {
    try {
      setShowCamera(true);
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 400, height: 400, facingMode: 'user' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraStream(stream);
    } catch (err: any) {
      console.error('Camera access failed:', err);
      setCameraError('Camera access denied or unsupported on this device.');
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, 400, 400);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setRawImage(dataUrl);
        setZoom(1);
        setPan({ x: 0, y: 0 });
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  // Cropper Drag & Pan events
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch drag support for mobile devices
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStart.current = { 
        x: e.touches[0].clientX - pan.x, 
        y: e.touches[0].clientY - pan.y 
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPan({
      x: e.touches[0].clientX - dragStart.current.x,
      y: e.touches[0].clientY - dragStart.current.y,
    });
  };

  // Perform crop operations and compress image via Canvas
  const handleConfirmCrop = () => {
    if (!rawImage) return;

    const img = new Image();
    img.src = rawImage;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 300; // Target output size
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, size, size);

      const displaySize = 200; // Size of UI crop area
      const scaleMultiplier = size / displaySize;

      const imgAspect = img.width / img.height;
      let renderWidth = displaySize;
      let renderHeight = displaySize;

      if (imgAspect > 1) {
        renderWidth = displaySize * imgAspect;
      } else {
        renderHeight = displaySize / imgAspect;
      }

      // Compute top-left drawing offsets normalized to scaled coordinates
      const dx = ((displaySize - renderWidth * zoom) / 2 + pan.x) * scaleMultiplier;
      const dy = ((displaySize - renderHeight * zoom) / 2 + pan.y) * scaleMultiplier;
      const dWidth = renderWidth * zoom * scaleMultiplier;
      const dHeight = renderHeight * zoom * scaleMultiplier;

      ctx.drawImage(img, dx, dy, dWidth, dHeight);

      // Export compressed blob (80% JPEG compression)
      canvas.toBlob((blob) => {
        if (blob) {
          setAvatarBlob(blob);
          setAvatarPreview(canvas.toDataURL('image/jpeg', 0.8));
          setRawImage(null); // Close cropper modal
          onShowNotification('Avatar cropped and compressed successfully!', 'success');
        }
      }, 'image/jpeg', 0.8);
    };
  };

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isOnline) {
      onShowNotification('No internet connection. Please reconnect to save your profile.', 'error');
      return;
    }

    const isUserValid = validateUsername(username);
    if (!isUserValid || usernameError) {
      onShowNotification('Please resolve the username error before continuing.', 'error');
      return;
    }

    if (phoneError) {
      onShowNotification('Please resolve the phone number error before continuing.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      let finalPhotoURL = avatarPreview || '';

      // Upload profile picture if custom cropped picture is chosen
      if (avatarBlob) {
        try {
          finalPhotoURL = await authService.uploadProfilePicture(user.uid, avatarBlob);
        } catch (storageErr) {
          console.warn('Storage upload failed, falling back to local base64 URL representation:', storageErr);
          // If Firebase Storage is disabled or fails, we fall back to base64 preview URL so users are not blocked!
          if (avatarPreview) {
            finalPhotoURL = avatarPreview;
          }
        }
      }

      // Save User data to Firestore
      const result = await authService.saveUserProfile(user.uid, {
        fullName: fullName.trim(),
        username: username.toLowerCase().trim(),
        phoneNumber: phoneNumber.trim(),
        gender: gender || undefined,
        dateOfBirth: dateOfBirth || undefined,
        photoURL: finalPhotoURL,
      });

      setIsSubmitting(false);

      if (result.success) {
        setIsSuccess(true);
        onShowNotification('Welcome! Your profile has been activated.', 'success');
        setTimeout(() => {
          onComplete(); // Transition state to landing
        }, 2500);
      } else {
        onShowNotification(result.error || 'Failed to save profile. Please retry.', 'error');
      }
    } catch (err: any) {
      setIsSubmitting(false);
      onShowNotification(err.message || 'An unexpected error occurred. Please try again.', 'error');
    }
  };

  const handleLogout = async () => {
    stopCamera();
    await authService.logout();
    onShowNotification('Session cancelled.', 'success');
    window.location.reload();
  };

  return (
    <div className="flex-1 flex flex-col justify-between py-1 relative">
      {/* 1. Internet Connection Warning Bar */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 left-0 right-0 bg-red-950/90 border border-red-500/30 text-red-300 text-xs px-4 py-2.5 rounded-xl z-40 flex items-center justify-between"
          >
            <div className="flex items-center space-x-2">
              <WifiOff size={14} className="animate-pulse" />
              <span>Offline Mode • Waiting for network reconnection</span>
            </div>
            <button 
              onClick={() => setIsOnline(navigator.onLine)}
              className="text-[10px] font-mono hover:underline cursor-pointer"
            >
              Retry
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Success Screen Overlay Animation */}
      <AnimatePresence>
        {isSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#050811] z-50 rounded-[28px] flex flex-col items-center justify-center p-6 text-center"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: [0.5, 1.1, 1], opacity: 1 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="w-24 h-24 rounded-full bg-[#39FF14]/10 border-2 border-[#39FF14] flex items-center justify-center relative shadow-[0_0_30px_rgba(57,255,20,0.3)] mb-6"
            >
              <div className="absolute inset-0 rounded-full border-4 border-[#39FF14] animate-ping opacity-30" />
              <Check size={48} className="text-[#39FF14]" />
            </motion.div>

            <motion.h3
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-display font-bold text-white animate-pulse"
            >
              Profile Activated!
            </motion.h3>

            <motion.p
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-slate-350 text-xs mt-2 max-w-xs leading-relaxed"
            >
              Your academic profile is successfully registered in the secure Firestore system. Initiating personalized scholar interface...
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-display font-semibold text-white tracking-tight">
            Scholar Enrollment
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Complete your high-end credentials to initialize your account.
          </p>
        </div>
        
        <button
          onClick={handleLogout}
          className="p-2 bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-slate-400 hover:text-red-400 rounded-xl cursor-pointer"
          title="Sign Out"
        >
          <LogOut size={14} />
        </button>
      </div>

      {/* Main setup form */}
      <form onSubmit={handleSubmit} className="flex-1 my-5 space-y-4">
        {/* Profile Picture Slot */}
        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="relative group">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-[#39FF14]/20 overflow-hidden flex items-center justify-center shadow-md relative">
              {avatarPreview ? (
                <img 
                  src={avatarPreview || undefined} 
                  alt="Avatar Preview" 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <User size={32} className="text-slate-500" />
              )}
            </div>

            {/* Dynamic camera/upload action circle */}
            <div className="absolute -bottom-1 -right-1 flex space-x-1">
              <button
                type="button"
                onClick={startCamera}
                className="w-7 h-7 rounded-lg bg-[#39FF14] text-black hover:bg-[#32e011] flex items-center justify-center shadow-md cursor-pointer transition-all hover:scale-105"
                title="Use Camera"
              >
                <Camera size={13} />
              </button>
              
              <label
                className="w-7 h-7 rounded-lg bg-white/10 border border-white/15 text-white hover:bg-white/20 flex items-center justify-center shadow-md cursor-pointer transition-all hover:scale-105"
                title="Upload Image"
              >
                <Upload size={13} />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>
          
          <span className="text-[10px] font-mono text-slate-500 tracking-wider">
            AVATAR PORTRAIT • CAMERA / UPLOAD
          </span>
        </div>

        {/* Fields Container */}
        <div className="space-y-3">
          {/* Full Name */}
          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Valued Scholar"
                className="w-full glass-panel-light border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-[#39FF14] transition-all"
              />
            </div>
          </div>

          {/* Username */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Unique Username
              </label>
              {isUsernameChecking && (
                <RefreshCw size={10} className="text-[#39FF14] animate-spin" />
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-500 text-xs font-mono">@</span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ''))}
                placeholder="username"
                className={`w-full glass-panel-light border ${usernameError ? 'border-red-500/40' : 'border-white/10'} rounded-xl pl-8 pr-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-[#39FF14] transition-all font-mono`}
              />
            </div>
            {usernameError && (
              <p className="text-[11px] text-red-400 mt-1.5 flex items-center space-x-1">
                <AlertCircle size={10} />
                <span>{usernameError}</span>
              </p>
            )}
            {!usernameError && username && !isUsernameChecking && (
              <p className="text-[11px] text-emerald-400 mt-1.5 flex items-center space-x-1 font-mono">
                <Check size={10} />
                <span>Username available</span>
              </p>
            )}
          </div>

          {/* Phone Number */}
          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5">
              Phone Number
            </label>
            <div className="relative">
              <Phone size={12} className="absolute left-3.5 top-3.5 text-slate-500" />
              <input
                type="tel"
                required
                value={phoneNumber}
                onChange={handlePhoneChange}
                placeholder="+1 555-0199"
                className={`w-full glass-panel-light border ${phoneError ? 'border-red-500/40' : 'border-white/10'} rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-[#39FF14] transition-all`}
              />
            </div>
            {phoneError && (
              <p className="text-[11px] text-red-400 mt-1.5 flex items-center space-x-1">
                <AlertCircle size={10} />
                <span>{phoneError}</span>
              </p>
            )}
          </div>

          {/* Double Column: Gender & DOB */}
          <div className="grid grid-cols-2 gap-3">
            {/* Gender */}
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5">
                Gender (Optional)
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full bg-[#090d16] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-[#39FF14] transition-all cursor-pointer"
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer-not-to-say">Prefer not to say</option>
              </select>
            </div>

            {/* Date of Birth */}
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5">
                Birth Date (Optional)
              </label>
              <div className="relative">
                <Calendar size={12} className="absolute left-3 top-3.5 text-slate-500 pointer-events-none" />
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full glass-panel-light border border-white/10 rounded-xl pl-8 pr-2 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-[#39FF14] transition-all cursor-pointer font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Button Controls */}
        <motion.button
          type="submit"
          disabled={isSubmitting || !!usernameError || !!phoneError}
          whileHover={{ scale: (isSubmitting || !!usernameError || !!phoneError) ? 1 : 1.02 }}
          whileTap={{ scale: (isSubmitting || !!usernameError || !!phoneError) ? 1 : 0.98 }}
          className="
            w-full py-3.5 px-6 rounded-2xl bg-[#39FF14] text-black font-semibold 
            text-xs tracking-wide shadow-[0_4px_20px_rgba(57,255,20,0.15)] 
            hover:shadow-[0_4px_30px_rgba(57,255,20,0.3)]
            disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none
            transition-all duration-300 flex items-center justify-center space-x-2 cursor-pointer mt-4
          "
        >
          {isSubmitting ? (
            <>
              <RefreshCw size={14} className="animate-spin mr-1" />
              <span>SAVING ENROLLMENT RECORDS...</span>
            </>
          ) : (
            <>
              <span>Initialize My Profile</span>
              <ChevronRight size={14} />
            </>
          )}
        </motion.button>
      </form>

      {/* 3. Live Camera View overlay modal */}
      <AnimatePresence>
        {showCamera && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#050811]/95 z-50 rounded-[28px] p-6 flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono tracking-widest text-[#39FF14] bg-[#39FF14]/5 border border-[#39FF14]/20 px-3 py-1 rounded-full flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#39FF14] animate-pulse" />
                  <span>LIVE COHORT CAPTURE</span>
                </span>
                <button 
                  onClick={stopCamera}
                  className="p-1 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Pose directly inside the indicator rings to render your official profile avatar.
              </p>
            </div>

            <div className="flex-1 my-4 flex items-center justify-center">
              <div className="relative w-64 h-64 rounded-3xl overflow-hidden border-2 border-[#39FF14]/20 shadow-inner flex items-center justify-center bg-black">
                {cameraError ? (
                  <p className="text-xs text-red-400 px-4 text-center font-sans">{cameraError}</p>
                ) : (
                  <>
                    <video 
                      ref={videoRef} 
                      className="absolute inset-0 w-full h-full object-cover scale-x-[-1]" 
                      playsInline 
                      muted 
                    />
                    <div className="absolute inset-4 border-2 border-dashed border-[#39FF14]/35 rounded-full pointer-events-none" />
                  </>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {!cameraError && (
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="w-full py-3 bg-[#39FF14] hover:bg-[#32e011] transition-colors rounded-xl text-black font-semibold text-xs tracking-wider flex items-center justify-center space-x-1 cursor-pointer"
                >
                  <Camera size={14} />
                  <span>CAPTURE FRAME</span>
                </button>
              )}
              
              <button
                type="button"
                onClick={stopCamera}
                className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel & Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Canvas Avatar Cropper embedded full-screen overlay */}
      <AnimatePresence>
        {rawImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#050811]/95 z-50 rounded-[28px] p-6 flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono tracking-widest text-[#39FF14] bg-[#39FF14]/5 border border-[#39FF14]/20 px-3 py-1 rounded-full flex items-center space-x-1.5">
                  <RotateCw size={10} />
                  <span>ALIGN SCHOLAR AVATAR</span>
                </span>
                <button 
                  onClick={() => setRawImage(null)}
                  className="p-1 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Drag to pan, slide to zoom, and align inside the grid for automated crop and compress.
              </p>
            </div>

            {/* Interactive crop frame */}
            <div className="flex-1 my-4 flex flex-col items-center justify-center space-y-4">
              <div 
                ref={cropperContainerRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleMouseUp}
                className="relative w-[200px] h-[200px] rounded-full border border-white/20 overflow-hidden cursor-move bg-black flex items-center justify-center select-none"
              >
                <img
                  src={rawImage || undefined}
                  alt="Source avatar"
                  draggable={false}
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: 'center center',
                    transition: isDragging ? 'none' : 'transform 0.1s ease',
                  }}
                  className="max-w-none max-h-none pointer-events-none"
                  referrerPolicy="no-referrer"
                />
                
                {/* Visual Circle Viewport Overlay */}
                <div className="absolute inset-0 rounded-full border-2 border-[#39FF14] pointer-events-none shadow-[0_0_0_9999px_rgba(5,8,17,0.7)]" />
                <div className="absolute inset-0 rounded-full border border-[#39FF14]/20 pointer-events-none grid grid-cols-3 grid-rows-3">
                  <div className="border-r border-b border-white/10" />
                  <div className="border-r border-b border-white/10" />
                  <div className="border-b border-white/10" />
                  <div className="border-r border-b border-white/10" />
                  <div className="border-r border-b border-white/10" />
                  <div className="border-b border-white/10" />
                  <div className="border-r border-white/10" />
                  <div className="border-r border-white/10" />
                  <div />
                </div>
              </div>

              {/* Zoom slider control */}
              <div className="w-full max-w-[240px] space-y-1.5">
                <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                  <span>SCALE ZOOM: {zoom.toFixed(1)}x</span>
                  <button 
                    onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
                    className="text-[#39FF14] hover:underline cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.1"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full accent-[#39FF14] h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleConfirmCrop}
                className="w-full py-3 bg-[#39FF14] hover:bg-[#32e011] transition-colors rounded-xl text-black font-semibold text-xs tracking-wider flex items-center justify-center space-x-1 cursor-pointer"
              >
                <Check size={14} />
                <span>CONFIRM CROP & COMPRESS</span>
              </button>
              
              <button
                type="button"
                onClick={() => setRawImage(null)}
                className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel & Back
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
