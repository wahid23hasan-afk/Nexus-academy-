import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Camera, 
  Upload, 
  Phone, 
  Calendar, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  AlertCircle, 
  RefreshCw, 
  RotateCw, 
  Image as ImageIcon,
  Wifi, 
  WifiOff, 
  X,
  LogOut,
  AtSign,
  Sparkles,
  ShieldCheck,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Move
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { authService } from '../services/authService';
import { NeonConfetti } from './NeonConfetti';
import { ProfileStepProgress } from './ProfileStepProgress';

interface ProfileSetupViewProps {
  user: any;
  initialProfile?: any;
  onComplete: () => void;
  onShowNotification: (message: string, type: 'success' | 'error') => void;
}

// Client-side high-performance image compressor (< 25KB Web/Mobile safe avatar)
const compressImage = (source: File | string): Promise<{ dataUrl: string; blob: Blob }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxDim = 240;
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        }
      } else {
        if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Canvas 2D context not supported'));
      }
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      canvas.toBlob((blob) => {
        if (blob) {
          resolve({ dataUrl, blob });
        } else {
          resolve({ dataUrl, blob: new Blob() });
        }
      }, 'image/jpeg', 0.8);
    };
    img.onerror = (e) => reject(e);

    if (typeof source === 'string') {
      img.src = source;
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        img.src = reader.result as string;
      };
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(source);
    }
  });
};

export const ProfileSetupView: React.FC<ProfileSetupViewProps> = ({
  user,
  initialProfile,
  onComplete,
  onShowNotification,
}) => {
  // Step Navigation State (Step 1: Avatar & Identity, Step 2: Handle & Phone, Step 3: Demographics & Review)
  const [currentStep, setCurrentStep] = useState(1);

  // Page states - Auto initialized from registration / user object
  const [fullName, setFullName] = useState(initialProfile?.fullName || user?.displayName || '');
  const [username, setUsername] = useState(initialProfile?.username || '');
  const [phoneNumber, setPhoneNumber] = useState(initialProfile?.phone || initialProfile?.phoneNumber || user?.phoneNumber || '');
  const [gender, setGender] = useState(initialProfile?.gender || '');
  const [dateOfBirth, setDateOfBirth] = useState(initialProfile?.dateOfBirth || '');
  
  // Validation & Loading States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isUsernameChecking, setIsUsernameChecking] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Avatar and Image states
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialProfile?.photoURL || user?.photoURL || null);
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
  const [rotation, setRotation] = useState(0);
  const [imageDimensions, setImageDimensions] = useState<{
    naturalWidth: number;
    naturalHeight: number;
    baseWidth: number;
    baseHeight: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const cropperContainerRef = useRef<HTMLDivElement>(null);

  // Connectivity monitoring
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Auto-fetch profile document from Firestore to populate username & info registered in Step 1
  useEffect(() => {
    if (!user?.uid) return;

    let isMounted = true;
    const fetchExistingData = async () => {
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && isMounted) {
          const data = docSnap.data();
          if (data.fullName) setFullName((prev: string) => prev || data.fullName);
          if (data.username) setUsername((prev: string) => prev || data.username);
          if (data.phone || data.phoneNumber) setPhoneNumber((prev: string) => prev || data.phoneNumber || data.phone);
          if (data.gender) setGender((prev: string) => prev || data.gender);
          if (data.dateOfBirth) setDateOfBirth((prev: string) => prev || data.dateOfBirth);
          if (data.photoURL) setAvatarPreview((prev: string | null) => prev || data.photoURL);
        }
      } catch (err) {
        console.warn('Could not auto-fetch user profile in setup view:', err);
      }
    };

    fetchExistingData();
    return () => {
      isMounted = false;
    };
  }, [user?.uid]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      onShowNotification('Connected to the internet.', 'success');
    };
    const handleOffline = () => {
      setIsOnline(false);
      onShowNotification('Internet connection lost. Working offline.', 'error');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onShowNotification]);

  // Username validation and debounced real-time check
  const validateUsername = (val: string): boolean => {
    if (!val || val.trim().length === 0) {
      setUsernameError('Username is required.');
      return false;
    }
    if (val.length < 3) {
      setUsernameError('Username must be at least 3 characters.');
      return false;
    }
    if (val.length > 20) {
      setUsernameError('Username cannot exceed 20 characters.');
      return false;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(val)) {
      setUsernameError('Username may only contain letters, numbers, and underscores.');
      return false;
    }
    setUsernameError(null);
    return true;
  };

  useEffect(() => {
    if (!username) {
      setUsernameError(null);
      setIsUsernameChecking(false);
      return;
    }

    const isValidFormat = validateUsername(username);
    if (!isValidFormat) {
      setIsUsernameChecking(false);
      return;
    }

    setIsUsernameChecking(true);
    const timeoutId = setTimeout(async () => {
      try {
        const isTaken = await authService.isUsernameTaken(username, user?.uid);
        if (isTaken) {
          setUsernameError('This username is already taken. Please choose another.');
        } else {
          setUsernameError(null);
        }
      } catch (err) {
        console.warn('Username availability check error:', err);
      } finally {
        setIsUsernameChecking(false);
      }
    }, 450);

    return () => clearTimeout(timeoutId);
  }, [username, user?.uid]);

  // Phone Validation
  const validatePhone = (val: string): boolean => {
    if (!val || val.trim().length === 0) {
      setPhoneError('Phone number is required.');
      return false;
    }
    const cleanPhone = val.replace(/\D/g, '');
    if (cleanPhone.length < 7 || cleanPhone.length > 15) {
      setPhoneError('Please enter a valid phone number (7-15 digits).');
      return false;
    }
    setPhoneError(null);
    return true;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPhoneNumber(val);
    if (val.length > 0) {
      validatePhone(val);
    } else {
      setPhoneError('Phone number is required.');
    }
  };

  // Camera Management
  const startCamera = async () => {
    setCameraError(null);
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera permissions in your browser.'
          : 'Could not initialize camera. Please upload an image instead.'
      );
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 640;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Mirror image for realistic selfie feel
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    stopCamera();
    openCropper(dataUrl);
  };

  // Image Upload & Cropper
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onShowNotification('Please select a valid image file (PNG, JPG, WEBP, GIF).', 'error');
      return;
    }

    // Unlimited file size support: using object URL for instant zero-latency loading
    const objectUrl = URL.createObjectURL(file);
    openCropper(objectUrl);

    // Reset input value so user can re-select if needed
    e.target.value = '';
  };

  const openCropper = (imageSrc: string) => {
    // Revoke previous blob URL if needed to release memory
    if (rawImage && rawImage.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(rawImage);
      } catch (e) {}
    }

    // Pre-measure image natural dimensions to fit seamlessly inside the cropper box
    const testImg = new Image();
    testImg.onload = () => {
      const natW = testImg.naturalWidth || 600;
      const natH = testImg.naturalHeight || 600;
      const containerSize = 260; // preview container box size in px

      // Fit whole image inside container initially so no awkward zooming occurs
      const fitScale = Math.min(containerSize / natW, containerSize / natH);
      const baseW = Math.round(natW * fitScale);
      const baseH = Math.round(natH * fitScale);

      setImageDimensions({
        naturalWidth: natW,
        naturalHeight: natH,
        baseWidth: baseW,
        baseHeight: baseH,
      });

      setRawImage(imageSrc);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setRotation(0);
    };
    testImg.onerror = () => {
      onShowNotification('Unable to decode image file. Please try another picture.', 'error');
    };
    testImg.src = imageSrc;
  };

  const closeCropper = () => {
    if (rawImage && rawImage.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(rawImage);
      } catch (e) {}
    }
    setRawImage(null);
    setImageDimensions(null);
    setPan({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
  };

  const applyCrop = async () => {
    if (!rawImage || !imageDimensions) return;

    try {
      const img = new Image();
      img.src = rawImage;
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
      });

      const canvas = document.createElement('canvas');
      const outputSize = 360; // High-density crisp canvas export
      const previewSize = 260; // Matching preview box size
      const ratio = outputSize / previewSize;

      canvas.width = outputSize;
      canvas.height = outputSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Dark background fill
      ctx.fillStyle = '#050811';
      ctx.fillRect(0, 0, outputSize, outputSize);

      ctx.save();
      // Move to center with pan offset scaled to canvas
      ctx.translate(
        outputSize / 2 + pan.x * ratio,
        outputSize / 2 + pan.y * ratio
      );
      // Rotate by angle
      ctx.rotate((rotation * Math.PI) / 180);
      // Scale by zoom
      ctx.scale(zoom * ratio, zoom * ratio);

      // Draw the image centered around (0,0)
      ctx.drawImage(
        img,
        -imageDimensions.baseWidth / 2,
        -imageDimensions.baseHeight / 2,
        imageDimensions.baseWidth,
        imageDimensions.baseHeight
      );
      ctx.restore();

      const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
      const compressed = await compressImage(croppedDataUrl);

      setAvatarPreview(compressed.dataUrl);
      setAvatarBlob(compressed.blob);
      closeCropper();
      onShowNotification('Avatar cropped and updated successfully!', 'success');
    } catch (err) {
      console.error('Cropping error:', err);
      onShowNotification('Failed to process image crop.', 'error');
    }
  };

  // Step Validation & Navigation
  const canGoToStep = (step: number) => {
    if (step === 1) return true;
    if (step === 2) {
      return fullName.trim().length > 0;
    }
    if (step === 3) {
      return fullName.trim().length > 0 && 
             username.trim().length >= 3 && 
             !usernameError && 
             phoneNumber.trim().length >= 6 && 
             !phoneError;
    }
    return false;
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!fullName.trim()) {
        onShowNotification('Please enter your full name to proceed.', 'error');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!username.trim()) {
        onShowNotification('Please enter your unique scholar handle.', 'error');
        return;
      }
      if (usernameError || isUsernameChecking) {
        onShowNotification('Please choose a valid and available username.', 'error');
        return;
      }
      if (!phoneNumber.trim()) {
        onShowNotification('Please enter your contact phone number.', 'error');
        return;
      }
      if (phoneError) {
        onShowNotification('Please enter a valid phone number.', 'error');
        return;
      }
      setCurrentStep(3);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isOnline) {
      onShowNotification('No internet connection. Please reconnect to save your profile.', 'error');
      return;
    }

    const isUserValid = validateUsername(username);
    if (!isUserValid || usernameError) {
      setCurrentStep(2);
      onShowNotification('Please resolve the username error before continuing.', 'error');
      return;
    }

    if (!validatePhone(phoneNumber) || phoneError) {
      setCurrentStep(2);
      onShowNotification('Please resolve the phone number error before continuing.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      let finalPhotoURL = avatarPreview || '';

      // Upload profile picture if custom cropped picture is chosen
      if (avatarBlob && user?.uid) {
        try {
          finalPhotoURL = await authService.uploadProfilePicture(user.uid, avatarBlob);
        } catch (storageErr) {
          console.warn('Storage upload failed, falling back to local base64 URL representation:', storageErr);
          if (avatarPreview) {
            finalPhotoURL = avatarPreview;
          }
        }
      }

      if (!finalPhotoURL && avatarPreview) {
        finalPhotoURL = avatarPreview;
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
        }, 1500);
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
      <NeonConfetti active={isSuccess} particleCount={42} />
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
      <div>
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl sm:text-3xl font-display font-semibold text-white tracking-tight">
              Scholar Enrollment
            </h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Complete your high-end credentials to initialize your account.
            </p>
          </div>
          
          <button
            onClick={handleLogout}
            className="p-3 bg-white/5 border border-white/10 hover:bg-white/10 active:bg-white/15 transition-all text-slate-300 hover:text-red-400 rounded-xl cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="Sign Out"
          >
            <LogOut size={16} />
          </button>
        </div>

        {/* Multi-Step Neon Progress Indicator */}
        <ProfileStepProgress 
          currentStep={currentStep} 
          onStepClick={(step) => setCurrentStep(step)}
          canNavigateToStep={canGoToStep}
        />
      </div>

      {/* Main Multi-Step Setup Form */}
      <form onSubmit={handleSubmit} className="flex-1 my-2 flex flex-col justify-between">
        <AnimatePresence mode="wait">
          {/* STEP 1: Avatar & Full Name */}
          {currentStep === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="space-y-4"
            >
              {/* Profile Picture Slot */}
              <div className="flex flex-col items-center justify-center space-y-2.5 pt-2">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-[#39FF14]/30 overflow-hidden flex items-center justify-center shadow-md relative">
                    {avatarPreview?.trim() ? (
                      <img 
                        src={avatarPreview.trim()} 
                        alt="Avatar Preview" 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <User size={36} className="text-slate-500" />
                    )}
                  </div>

                  {/* Dynamic camera/upload action circle */}
                  <div className="absolute -bottom-2 -right-2 flex space-x-1.5">
                    <button
                      type="button"
                      onClick={startCamera}
                      className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-xl bg-[#39FF14] text-black hover:bg-[#32e011] flex items-center justify-center shadow-md cursor-pointer transition-all hover:scale-105 active:scale-95"
                      title="Use Camera"
                    >
                      <Camera size={16} />
                    </button>
                    
                    <label
                      className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 flex items-center justify-center shadow-md cursor-pointer transition-all hover:scale-105 active:scale-95"
                      title="Upload Image"
                    >
                      <Upload size={16} />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
                
                <span className="text-[10px] font-mono text-slate-400 tracking-wider">
                  AVATAR PORTRAIT • CAMERA / UPLOAD
                </span>
              </div>

              {/* Full Name Field */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block ml-1">
                  Full Legal Name
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                    <User size={18} />
                  </span>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Valued Scholar"
                    className="w-full glass-panel-light border border-white/10 focus:border-[#39FF14] neon-focus-glow rounded-xl pl-12 pr-4 py-3.5 min-h-[48px] text-base sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-all font-sans"
                  />
                </div>
              </div>

              {/* Step 1 Next Action */}
              <div className="pt-3">
                <motion.button
                  type="button"
                  onClick={handleNextStep}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-4 px-6 min-h-[50px] rounded-2xl bg-[#39FF14] text-black font-semibold text-sm tracking-wide shadow-[0_4px_20px_rgba(57,255,20,0.2)] hover:shadow-[0_4px_30px_rgba(57,255,20,0.35)] transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <span>Proceed to Step 2: Credentials</span>
                  <ChevronRight size={16} />
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Handle & Phone Number */}
          {currentStep === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="space-y-4"
            >
              {/* Unique Username */}
              <motion.div
                animate={usernameError ? { x: [-8, 8, -6, 6, -3, 3, 0] } : { x: 0 }}
                transition={{ duration: 0.35, ease: 'easeInOut' }}
                className="space-y-1.5"
              >
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                    Unique Username Handle
                  </label>
                  {isUsernameChecking && (
                    <RefreshCw size={12} className="text-[#39FF14] animate-spin" />
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-mono pointer-events-none">@</span>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ''))}
                    placeholder="username"
                    className={`w-full glass-panel-light border ${usernameError ? 'border-red-500/40 focus:border-red-500' : 'border-white/10 focus:border-[#39FF14]'} neon-focus-glow rounded-xl pl-9 pr-4 py-3.5 min-h-[48px] text-base sm:text-sm text-slate-100 focus:outline-none transition-all font-mono`}
                  />
                </div>
                {usernameError && (
                  <p className="text-xs text-red-400 mt-1 flex items-center space-x-1 ml-1">
                    <AlertCircle size={12} />
                    <span>{usernameError}</span>
                  </p>
                )}
                {!usernameError && username && !isUsernameChecking && (
                  <p className="text-xs text-emerald-400 mt-1 flex items-center space-x-1 font-mono ml-1">
                    <Check size={12} />
                    <span>Username available</span>
                  </p>
                )}
              </motion.div>

              {/* Phone Number */}
              <motion.div
                animate={phoneError ? { x: [-8, 8, -6, 6, -3, 3, 0] } : { x: 0 }}
                transition={{ duration: 0.35, ease: 'easeInOut' }}
                className="space-y-1.5"
              >
                <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block ml-1">
                  Verified Contact Phone
                </label>
                <div className="relative">
                  <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={handlePhoneChange}
                    placeholder="+1 555-0199"
                    className={`w-full glass-panel-light border ${phoneError ? 'border-red-500/40 focus:border-red-500' : 'border-white/10 focus:border-[#39FF14]'} neon-focus-glow rounded-xl pl-12 pr-4 py-3.5 min-h-[48px] text-base sm:text-sm text-slate-100 focus:outline-none transition-all`}
                  />
                </div>
                {phoneError && (
                  <p className="text-xs text-red-400 mt-1 flex items-center space-x-1 ml-1">
                    <AlertCircle size={12} />
                    <span>{phoneError}</span>
                  </p>
                )}
              </motion.div>

              {/* Step 2 Actions */}
              <div className="flex space-x-3 pt-3">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="w-1/3 py-3.5 px-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 font-mono text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <ChevronLeft size={16} />
                  <span>Back</span>
                </button>
                <motion.button
                  type="button"
                  onClick={handleNextStep}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-2/3 py-4 px-6 min-h-[50px] rounded-2xl bg-[#39FF14] text-black font-semibold text-sm tracking-wide shadow-[0_4px_20px_rgba(57,255,20,0.2)] hover:shadow-[0_4px_30px_rgba(57,255,20,0.35)] transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <span>Next: Demographics</span>
                  <ChevronRight size={16} />
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Demographics & Final Review */}
          {currentStep === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="space-y-3.5"
            >
              {/* Double Column: Gender & DOB */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Gender */}
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5 ml-1">
                    Gender (Optional)
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full bg-[#090d16] border border-white/10 focus:border-[#39FF14] neon-focus-glow rounded-xl px-4 py-3.5 min-h-[48px] text-base sm:text-xs text-slate-200 focus:outline-none transition-all cursor-pointer"
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
                  <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5 ml-1">
                    Birth Date (Optional)
                  </label>
                  <div className="relative">
                    <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                    <input
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="w-full glass-panel-light border border-white/10 focus:border-[#39FF14] neon-focus-glow rounded-xl pl-11 pr-3 py-3.5 min-h-[48px] text-base sm:text-xs text-slate-200 focus:outline-none transition-all cursor-pointer font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Scholar ID Summary Badge */}
              <div className="rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900 border border-[#39FF14]/30 p-3.5 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#39FF14]/10 rounded-full blur-xl pointer-events-none" />
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-900 border border-[#39FF14]/40 overflow-hidden shrink-0 flex items-center justify-center">
                    {avatarPreview?.trim() ? (
                      <img src={avatarPreview.trim()} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User size={20} className="text-slate-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-1.5">
                      <h4 className="text-sm font-semibold text-white truncate">{fullName || 'Scholar'}</h4>
                      <ShieldCheck size={14} className="text-[#39FF14]" />
                    </div>
                    <p className="text-xs text-[#39FF14] font-mono truncate">@{username || 'handle'}</p>
                    <p className="text-[10px] text-slate-400 font-mono truncate">{phoneNumber || 'No phone set'}</p>
                  </div>
                </div>
              </div>

              {/* Step 3 Actions: Back and Submit */}
              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="w-1/3 py-3.5 px-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 font-mono text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <ChevronLeft size={16} />
                  <span>Back</span>
                </button>
                <motion.button
                  type="submit"
                  disabled={isSubmitting || !!usernameError || !!phoneError}
                  whileHover={{ scale: (isSubmitting || !!usernameError || !!phoneError) ? 1 : 1.01 }}
                  whileTap={{ scale: (isSubmitting || !!usernameError || !!phoneError) ? 1 : 0.98 }}
                  className="
                    w-2/3 py-4 px-6 min-h-[50px] rounded-2xl bg-[#39FF14] text-black font-semibold 
                    text-sm tracking-wide shadow-[0_4px_20px_rgba(57,255,20,0.25)] 
                    hover:shadow-[0_4px_30px_rgba(57,255,20,0.4)] active:scale-[0.98]
                    disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none
                    transition-all duration-300 flex items-center justify-center space-x-2 cursor-pointer
                  "
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={16} className="animate-spin mr-1" />
                      <span>ACTIVATING PROFILE...</span>
                    </>
                  ) : (
                    <>
                      <span>Initialize My Profile</span>
                      <ChevronRight size={16} />
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
                  className="w-full py-4 rounded-xl bg-[#39FF14] text-black font-semibold text-sm flex items-center justify-center space-x-2 shadow-lg hover:shadow-[#39FF14]/20 transition-all cursor-pointer"
                >
                  <Camera size={18} />
                  <span>Capture Official Portrait</span>
                </button>
              )}

              <button
                type="button"
                onClick={stopCamera}
                className="w-full py-3 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer font-mono"
              >
                Cancel & Close Camera
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Interactive Avatar Image Cropper modal */}
      <AnimatePresence>
        {rawImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#050811]/98 z-50 rounded-[28px] p-5 sm:p-6 flex flex-col justify-between overflow-y-auto"
          >
            <div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono tracking-widest text-[#39FF14] bg-[#39FF14]/10 border border-[#39FF14]/30 px-3 py-1 rounded-full flex items-center space-x-1.5">
                  <RotateCw size={11} className="text-[#39FF14] animate-spin" />
                  <span>PRECISE AVATAR CROPPER</span>
                </span>
                <button 
                  onClick={closeCropper}
                  className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
                  title="Close"
                >
                  <X size={16} />
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Drag to position portrait inside the circle. Use zoom & rotation tools below.
              </p>
            </div>

            <div className="flex-1 my-3 flex flex-col items-center justify-center">
              {/* Cropper Window */}
              <div 
                ref={cropperContainerRef}
                onMouseDown={(e) => {
                  setIsDragging(true);
                  dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
                }}
                onMouseMove={(e) => {
                  if (!isDragging) return;
                  setPan({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
                }}
                onMouseUp={() => setIsDragging(false)}
                onMouseLeave={() => setIsDragging(false)}
                onTouchStart={(e) => {
                  setIsDragging(true);
                  dragStart.current = { x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y };
                }}
                onTouchMove={(e) => {
                  if (!isDragging) return;
                  setPan({ x: e.touches[0].clientX - dragStart.current.x, y: e.touches[0].clientY - dragStart.current.y });
                }}
                onTouchEnd={() => setIsDragging(false)}
                className="relative w-[260px] h-[260px] rounded-3xl overflow-hidden border-2 border-[#39FF14]/40 bg-[#030712] cursor-grab active:cursor-grabbing select-none flex items-center justify-center touch-none shadow-[0_0_30px_rgba(0,0,0,0.8)]"
              >
                {imageDimensions && (
                  <img 
                    src={rawImage?.trim() || undefined} 
                    alt="Raw source for crop"
                    style={{
                      width: `${imageDimensions.baseWidth}px`,
                      height: `${imageDimensions.baseHeight}px`,
                      transform: `translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scale(${zoom})`,
                      transformOrigin: 'center center',
                      maxWidth: 'none',
                      maxHeight: 'none',
                    }}
                    className="pointer-events-none transition-transform duration-75 select-none"
                    referrerPolicy="no-referrer"
                  />
                )}

                {/* Circular Crop Target Overlay */}
                <div className="absolute inset-3 rounded-full border-2 border-dashed border-[#39FF14] pointer-events-none shadow-[0_0_20px_rgba(57,255,20,0.25)] ring-1 ring-black/40" />
                <div className="absolute inset-0 bg-black/20 pointer-events-none" />
              </div>

              {/* Quick Adjustment Toolbar */}
              <div className="w-[260px] mt-3 flex items-center justify-between gap-1.5">
                <button
                  type="button"
                  onClick={() => setRotation((prev) => (prev + 90) % 360)}
                  className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-[11px] font-mono flex items-center space-x-1 transition-all cursor-pointer"
                  title="Rotate 90 degrees"
                >
                  <RotateCw size={12} className="text-[#39FF14]" />
                  <span>Rotate</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setZoom(1);
                    setPan({ x: 0, y: 0 });
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-[11px] font-mono flex items-center space-x-1 transition-all cursor-pointer"
                  title="Fit whole image"
                >
                  <Minimize2 size={12} className="text-cyan-400" />
                  <span>Fit All</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!imageDimensions) return;
                    const cropArea = 236; // circular crop diameter
                    const scaleX = cropArea / imageDimensions.baseWidth;
                    const scaleY = cropArea / imageDimensions.baseHeight;
                    const coverScale = Math.max(scaleX, scaleY);
                    setZoom(Math.max(1, coverScale));
                    setPan({ x: 0, y: 0 });
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-[11px] font-mono flex items-center space-x-1 transition-all cursor-pointer"
                  title="Fill circular crop"
                >
                  <Maximize2 size={12} className="text-amber-400" />
                  <span>Fill</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPan({ x: 0, y: 0 })}
                  className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-[11px] font-mono flex items-center space-x-1 transition-all cursor-pointer"
                  title="Reset Pan to Center"
                >
                  <Move size={12} className="text-purple-400" />
                  <span>Center</span>
                </button>
              </div>

              {/* Slider for Zoom */}
              <div className="w-[260px] mt-3 flex items-center space-x-2 bg-slate-900/60 px-3 py-2 rounded-xl border border-white/5">
                <ZoomOut size={14} className="text-slate-400 shrink-0" />
                <input 
                  type="range" 
                  min="0.2" 
                  max="3.5" 
                  step="0.02"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="flex-1 accent-[#39FF14] h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
                <ZoomIn size={14} className="text-slate-400 shrink-0" />
                <span className="text-[10px] font-mono text-[#39FF14] w-9 text-right shrink-0">
                  {Math.round(zoom * 100)}%
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={applyCrop}
                className="w-full py-4 rounded-xl bg-[#39FF14] text-black font-semibold text-sm flex items-center justify-center space-x-2 shadow-lg hover:shadow-[#39FF14]/25 transition-all cursor-pointer active:scale-[0.99]"
              >
                <Check size={18} />
                <span>Confirm & Apply Avatar</span>
              </button>

              <button
                type="button"
                onClick={closeCropper}
                className="w-full py-2 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer font-mono text-center"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfileSetupView;
