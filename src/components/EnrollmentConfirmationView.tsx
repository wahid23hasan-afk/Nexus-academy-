import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  Tag, 
  Check, 
  X, 
  Sparkles, 
  AlertCircle, 
  Calendar, 
  Users, 
  Star, 
  Clock, 
  CheckCircle2, 
  Lock, 
  Play, 
  Download, 
  FileCode, 
  BookOpen, 
  Award, 
  Smartphone, 
  RefreshCw,
  HelpCircle,
  ShieldCheck,
  CreditCard
} from 'lucide-react';
import { Course, Coupon, Offer, CourseBenefit } from '../types/course';
import { courseService } from '../services/courseService';
import { auth } from '../services/firebase';

// Dynamic helper to match icon names to Lucide react components
const DynamicIcon = ({ name, size = 18, className = '' }: { name: string; size?: number; className?: string }) => {
  const icons: Record<string, React.ComponentType<any>> = {
    Lock,
    Play,
    Download,
    FileCode,
    BookOpen,
    Award,
    Smartphone,
    RefreshCw
  };
  const IconComponent = icons[name] || HelpCircle;
  return <IconComponent size={size} className={className} />;
};

interface EnrollmentConfirmationViewProps {
  course: Course;
  userProfile: { fullName: string; username: string; photoURL?: string } | null;
  onBack: () => void;
  onShowNotification: (message: string, type: 'success' | 'error') => void;
  onEnrollSuccess: () => void;
  onContinueToPayment: (finalPrice: number, discount: number, couponCode: string) => void;
}

export function EnrollmentConfirmationView({
  course,
  userProfile,
  onBack,
  onShowNotification,
  onEnrollSuccess,
  onContinueToPayment
}: EnrollmentConfirmationViewProps) {
  // Database state
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [benefits, setBenefits] = useState<CourseBenefit[]>([]);
  
  // UX Interaction States
  const [loading, setLoading] = useState(true);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccessMsg, setCouponSuccessMsg] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  // Checkbox agreement states
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeRefund, setAgreeRefund] = useState(false);
  
  // Payment progress transition state
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    const fetchCheckoutData = async () => {
      try {
        setLoading(true);
        // Load in parallel
        const [fetchedCoupons, fetchedOffers, fetchedBenefits] = await Promise.all([
          courseService.getCoupons(),
          courseService.getOffers(),
          courseService.getCourseBenefits()
        ]);
        setCoupons(fetchedCoupons);
        setOffers(fetchedOffers);
        setBenefits(fetchedBenefits);
      } catch (err) {
        console.error('Failed to load checkouts metadata:', err);
        onShowNotification('Failed to sync pricing catalogs.', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchCheckoutData();
  }, [course.courseId]);

  // Pricing math calculation - Only original price and coupon discounts apply (no automatic campaign/launch discounts)
  const originalPrice = course.price;
  
  const baseDiscount = 0;
  const priceAfterBaseDiscount = course.price;

  const activeOffer = null;
  const offerDiscount = 0;
  
  const priceAfterOfferDiscount = course.price;

  // Coupon discount deduction
  let couponDeduction = 0;
  if (appliedCoupon) {
    const val = Number(appliedCoupon.discountValue ?? (appliedCoupon as any).discount ?? (appliedCoupon as any).value ?? 0);
    const type = appliedCoupon.discountType || (appliedCoupon as any).type || 'percent';
    if (type === 'percent') {
      couponDeduction = Math.round((originalPrice * val) / 100);
    } else {
      couponDeduction = Math.min(val, originalPrice);
    }
  }

  // Final price calculations
  const finalPrice = Math.max(0, originalPrice - couponDeduction);

  // Apply Coupon action
  const handleApplyCoupon = () => {
    setCouponError(null);
    setCouponSuccessMsg(null);

    const cleanInput = couponInput.trim().toUpperCase();
    if (!cleanInput) {
      setCouponError('Please enter a coupon code.');
      return;
    }

    // Find in coupons collection
    const found = coupons.find(c => {
      const code = (c.code || (c as any).couponCode || (c as any).name || '').toUpperCase();
      return code === cleanInput;
    });

    if (!found) {
      setCouponError('This coupon code is invalid.');
      onShowNotification('Invalid coupon code.', 'error');
      return;
    }

    // Bug #11: Single-User Restricted Secret Coupon / Voucher Validation
    const currentUid = auth.currentUser?.uid;
    const currentEmail = (auth.currentUser?.email || (userProfile as any)?.email || '').toLowerCase().trim();

    if (found.ownerUserId || found.userEmail || found.isSecret) {
      const isOwnerMatch = 
        (found.ownerUserId && found.ownerUserId === currentUid) ||
        (found.userEmail && found.userEmail.toLowerCase().trim() === currentEmail);

      if (!isOwnerMatch) {
        setCouponError('Secret coupon code date expired / Invalid for this account');
        onShowNotification('Secret coupon code date expired / Invalid for this account', 'error');
        return;
      }
    }

    if (found.expiryDate) {
      const expTime = new Date(found.expiryDate).getTime();
      if (!isNaN(expTime) && Date.now() > expTime) {
        setCouponError('Secret coupon code date expired / Invalid for this account');
        onShowNotification('Secret coupon code date expired / Invalid for this account', 'error');
        return;
      }
    }

    if (!found.isActive) {
      setCouponError('Secret coupon code date expired / Invalid for this account');
      onShowNotification('Secret coupon code date expired / Invalid for this account', 'error');
      return;
    }

    // Successfully apply
    setAppliedCoupon(found);
    setCouponInput('');
    const codeStr = (found.code || (found as any).couponCode || 'PROMO').toUpperCase();
    setCouponSuccessMsg(`Successfully applied ${codeStr}! ${found.description || ''}`);
    setShowConfetti(true);
    onShowNotification(`Coupon ${codeStr} applied successfully!`, 'success');

    // Dismiss confetti animation after 3 seconds
    setTimeout(() => setShowConfetti(false), 3000);
  };

  // Remove Coupon action
  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponSuccessMsg(null);
    setCouponError(null);
    onShowNotification('Coupon removed.', 'success');
  };

  // Submit complete enrollment
  const handleContinueCheckout = () => {
    if (!agreeTerms || !agreeRefund) return;
    
    setProcessingPayment(true);
    
    // Simulate premium secure routing with step delay
    setTimeout(() => {
      setProcessingPayment(false);
      onShowNotification('Security verification passed! Continuing to Payment.', 'success');
      onContinueToPayment(finalPrice, (originalPrice - finalPrice), appliedCoupon?.code || '');
    }, 1200);
  };

  return (
    <div className="flex-1 flex flex-col justify-between py-1 px-1 text-slate-100 max-w-lg mx-auto w-full relative">
      
      {/* Confetti Micro-Success Animation Overlay */}
      <AnimatePresence>
        {showConfetti && (
          <div className="absolute inset-x-0 top-0 z-50 pointer-events-none flex justify-center">
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: [1, 1, 0], y: [0, 80, 160] }}
              transition={{ duration: 2.5 }}
              className="text-xs font-mono font-bold text-[#39FF14] bg-[#39FF14]/10 border border-[#39FF14]/30 px-3 py-1 rounded-full shadow-[0_0_15px_rgba(57,255,20,0.4)] flex items-center space-x-1"
            >
              <Sparkles size={12} className="animate-spin text-[#39FF14]" />
              <span>COUPON UNLOCKED! 🎉</span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= HEADER ================= */}
      <header className="flex items-center space-x-3 py-3.5 px-1 border-b border-white/5 backdrop-blur-md sticky top-0 z-40 bg-[#0a0f1d]/90">
        <button 
          onClick={onBack}
          className="p-2 rounded-xl bg-white/[0.02] border border-white/10 hover:bg-white/[0.06] text-slate-300 hover:text-white transition-all cursor-pointer flex items-center justify-center"
        >
          <ChevronLeft size={16} />
        </button>
        <div>
          <p className="text-[9px] font-mono text-[#39FF14] uppercase tracking-wider">CHECKOUT PORTAL</p>
          <h1 className="text-sm font-sans font-bold text-white tracking-tight">Enrollment Confirmation</h1>
        </div>
      </header>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-4">
          <svg className="animate-spin h-6 w-6 text-[#39FF14]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-[10px] font-mono tracking-widest text-slate-400">INITIALIZING CHECKOUT LEDGER...</p>
        </div>
      ) : (
        <main className="flex-1 py-4 space-y-5 overflow-y-auto px-1">
          
          {/* ================= 1. COURSE SPOTLIGHT SUMMARY CARD ================= */}
          <div className="relative rounded-3xl border border-white/10 bg-slate-950/80 p-4 shadow-[0_4px_24px_rgba(0,0,0,0.5)] overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#39FF14]/5 to-transparent rounded-full blur-2xl" />
            
            <div className="relative flex space-x-3.5">
              {/* Thumbnail Container with hover scale effect */}
              <div className="shrink-0 w-20 h-20 rounded-2xl overflow-hidden border border-white/10 shadow-lg relative bg-slate-900">
                <img 
                  src={course.thumbnail?.trim() || undefined} 
                  alt={course.title} 
                  className="w-full h-full object-cover transform hover:scale-110 transition-transform duration-300" 
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Course Identity Block */}
              <div className="flex-1 space-y-1">
                <span className="inline-block px-2 py-0.5 rounded bg-[#39FF14]/10 text-[#39FF14] text-[8px] font-mono uppercase tracking-wider font-bold">
                  {course.category}
                </span>
                <h2 className="text-xs font-sans font-bold text-white leading-snug line-clamp-2">
                  {course.title}
                </h2>
                <p className="text-[10px] text-slate-400 font-sans">
                  By <span className="text-[#39FF14]/90 font-medium">{course.instructor}</span>
                </p>
                <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-400 pt-0.5">
                  <span className="flex items-center text-amber-400">
                    <Star size={10} className="fill-amber-400 mr-0.5" />
                    <span>{course.rating}</span>
                  </span>
                  <span>•</span>
                  <span>{course.students?.toLocaleString() || 0} Students</span>
                </div>
              </div>
            </div>

            {/* Badges and last updated footer inside summary card */}
            <div className="mt-4 pt-3 border-t border-white/5 grid grid-cols-3 gap-2 text-[9px] font-mono">
              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2 text-center">
                <span className="text-[#39FF14] block font-bold">LIFETIME</span>
                <span className="text-slate-400 text-[8px]">Access Granted</span>
              </div>
              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2 text-center">
                <span className="text-[#39FF14] block font-bold">MOBILE</span>
                <span className="text-slate-400 text-[8px]">Access Ready</span>
              </div>
              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2 text-center">
                <span className="text-[#39FF14] block font-bold">VERIFIED</span>
                <span className="text-slate-400 text-[8px]">Certificate</span>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-[8px] font-mono text-slate-500 px-1">
              <span className="flex items-center">
                <Calendar size={10} className="mr-1" />
                Updated: {course.lastUpdated || 'Recently'}
              </span>
              <span>•</span>
              <span className="flex items-center">
                <Clock size={10} className="mr-1" />
                Duration: {course.duration}
              </span>
            </div>
          </div>

          {/* ================= 2. WHAT YOU WILL GET (BENEFITS GRID) ================= */}
          <div className="space-y-2.5">
            <h3 className="text-[10px] font-mono font-bold text-slate-400 tracking-wider uppercase pl-1">
              🛡️ WHAT IS INCLUDED WITH YOUR ENROLLMENT:
            </h3>
            
            <div className="grid grid-cols-2 gap-2">
              {benefits.map((ben, i) => (
                <div 
                  key={ben.benefitId || `ben-${i}`} 
                  className="bg-white/[0.01] border border-white/5 hover:border-[#39FF14]/15 rounded-2xl p-3 transition-colors flex items-start space-x-2.5"
                >
                  <div className="p-1.5 rounded-lg bg-[#39FF14]/5 text-[#39FF14] border border-[#39FF14]/10">
                    <DynamicIcon name={ben.iconName} size={12} />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-[10px] font-sans font-bold text-slate-200">
                      {ben.title}
                    </h4>
                    <p className="text-[8px] text-slate-400 font-sans leading-normal">
                      {ben.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ================= 3. COOPON REDEMPTION SYSTEM ================= */}
          <div className="space-y-2.5">
            <h3 className="text-[10px] font-mono font-bold text-slate-400 tracking-wider uppercase pl-1">
              🎫 CHOOSE OR ENTER COUPON CODE:
            </h3>

            <div className="bg-slate-950 border border-white/10 rounded-2xl p-4 space-y-3 shadow-md">
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                    <Tag size={13} />
                  </div>
                  <input 
                    type="text" 
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder="Enter Coupon (e.g., NEXUS50)" 
                    disabled={appliedCoupon !== null}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/10 text-xs font-mono uppercase tracking-wider text-white focus:outline-none focus:border-[#39FF14]/50 transition-all disabled:opacity-40"
                  />
                </div>
                
                {appliedCoupon ? (
                  <button 
                    onClick={handleRemoveCoupon}
                    className="px-4 py-2.5 rounded-xl bg-red-950/40 hover:bg-red-950/60 border border-red-500/30 text-red-400 text-xs font-mono font-bold cursor-pointer transition-colors"
                  >
                    Remove
                  </button>
                ) : (
                  <button 
                    onClick={handleApplyCoupon}
                    className="px-4 py-2.5 rounded-xl bg-[#39FF14] hover:bg-[#32e011] text-black text-xs font-mono font-bold cursor-pointer transition-colors shadow-[0_2px_8px_rgba(57,255,20,0.2)]"
                  >
                    Apply
                  </button>
                )}
              </div>

              {/* Dynamic Notification Messages */}
              <AnimatePresence mode="wait">
                {couponError && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center space-x-2 text-red-400 text-[10px] font-mono pl-1"
                  >
                    <AlertCircle size={12} />
                    <span>{couponError}</span>
                  </motion.div>
                )}

                {couponSuccessMsg && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center space-x-2 text-emerald-400 text-[10px] font-mono pl-1"
                  >
                    <CheckCircle2 size={12} className="animate-pulse" />
                    <span>{couponSuccessMsg}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Active list of coupons directly loaded from Firestore blueprint for helpful reference */}
              <div className="pt-2 border-t border-white/5 space-y-1.5">
                <span className="text-[8px] font-mono text-slate-500 tracking-wide block">AVAILABLE PROMO CODES:</span>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {coupons.map((c, i) => {
                    const code = (c.code || (c as any).couponCode || (c as any).name || 'PROMO').toUpperCase();
                    const val = Number(c.discountValue ?? (c as any).discount ?? (c as any).value ?? 0);
                    const type = c.discountType || (c as any).type || 'percent';
                    const discountLabel = type === 'percent' ? `${val}%` : `৳${val}`;
                    const isApplied = appliedCoupon && (appliedCoupon.code || (appliedCoupon as any).couponCode)?.toUpperCase() === code;
                    
                    return (
                      <button
                        key={c.couponId || `c-${i}`}
                        onClick={() => {
                          if (!appliedCoupon) {
                            setCouponInput(code);
                          }
                        }}
                        disabled={appliedCoupon !== null}
                        className={`px-2 py-1 rounded-lg border text-[9px] font-mono transition-all ${
                          !c.isActive 
                            ? 'border-white/5 bg-white/[0.01] text-slate-600 line-through' 
                            : isApplied
                              ? 'border-[#39FF14] bg-[#39FF14]/10 text-[#39FF14] shadow-[0_0_8px_rgba(57,255,20,0.1)]'
                              : 'border-white/10 bg-white/[0.02] text-slate-400 hover:border-[#39FF14]/30 hover:text-slate-200 cursor-pointer'
                        }`}
                      >
                        {code} ({discountLabel})
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ================= 4. PRICE SUMMARY CARD ================= */}
          <div className="space-y-2.5">
            <h3 className="text-[10px] font-mono font-bold text-slate-400 tracking-wider uppercase pl-1">
              📊 CHECKOUT PRICE SUMMARY:
            </h3>

            <div className="bg-slate-950 border border-white/10 rounded-2xl p-4 space-y-2.5 shadow-md relative overflow-hidden">
              <div className="flex justify-between text-xs font-sans text-slate-400">
                <span>Original Program Price</span>
                <span className="font-mono text-slate-300">৳{originalPrice?.toLocaleString()}</span>
              </div>

              {/* Campaign Discount Deduction if active */}
              {baseDiscount > 0 && (
                <div className="flex justify-between text-xs font-sans text-emerald-400">
                  <span className="flex items-center">
                    <span>Campaign Catalog Discount</span>
                  </span>
                  <span className="font-mono">-৳{baseDiscount?.toLocaleString()}</span>
                </div>
              )}

              {/* Extra Campaign Offer Deduction if active */}
              {offerDiscount > 0 && (
                <div className="flex justify-between text-xs font-sans text-emerald-400">
                  <span className="flex items-center">
                    <span>{activeOffer?.title || 'Launch Promo'} Discount</span>
                  </span>
                  <span className="font-mono">-৳{offerDiscount?.toLocaleString()}</span>
                </div>
              )}

              {/* Coupon deduction amount if applied */}
              {appliedCoupon && couponDeduction > 0 && (
                <div className="flex justify-between text-xs font-sans text-emerald-400">
                  <span className="flex items-center space-x-1">
                    <Tag size={10} className="text-[#39FF14] animate-pulse" />
                    <span>Coupon Discount ({appliedCoupon.code})</span>
                  </span>
                  <span className="font-mono font-semibold">-৳{couponDeduction?.toLocaleString()}</span>
                </div>
              )}

              <div className="border-t border-white/10 pt-3 flex justify-between items-center">
                <div>
                  <span className="text-xs font-sans text-slate-300 font-semibold block">Total Amount Payable</span>
                  <span className="text-[9px] font-mono text-slate-500">Security checkout verified</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-mono font-extrabold text-[#39FF14] drop-shadow-[0_0_6px_rgba(57,255,20,0.3)]">
                    {finalPrice === 0 ? 'FREE' : `৳${finalPrice?.toLocaleString()}`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ================= 5. AGREEMENT TERMS CHECKBOXES ================= */}
          <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4 space-y-3">
            <span className="text-[9px] font-mono text-slate-500 tracking-wide uppercase block">TERMS AND CONDITIONS</span>
            
            <label className="flex items-start space-x-2.5 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-white/10 text-[#39FF14] focus:ring-0 cursor-pointer accent-[#39FF14]"
              />
              <span className="text-[10px] text-slate-400 font-sans leading-relaxed">
                I agree to the official <span className="text-slate-300 hover:underline">Nexus Portal Academic Terms & Conditions</span> and verify my identity details.
              </span>
            </label>

            <label className="flex items-start space-x-2.5 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={agreeRefund}
                onChange={(e) => setAgreeRefund(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-white/10 text-[#39FF14] focus:ring-0 cursor-pointer accent-[#39FF14]"
              />
              <span className="text-[10px] text-slate-400 font-sans leading-relaxed">
                I understand the <span className="text-slate-300 hover:underline">7-Day Refund Policy</span> and acknowledge this enrollment grants authentic class credentials.
              </span>
            </label>
          </div>

        </main>
      )}

      {/* ================= FOOTER CONTINUATION ACTION BUTTON ================= */}
      <footer className="mt-4 pt-3 border-t border-white/5 space-y-2.5 px-1 bg-[#0a0f1d]">
        <button
          onClick={handleContinueCheckout}
          disabled={!agreeTerms || !agreeRefund || processingPayment || loading}
          className={`w-full py-3.5 rounded-xl font-bold uppercase tracking-wider text-xs transition-all flex items-center justify-center space-x-2 shadow-lg ${
            agreeTerms && agreeRefund && !processingPayment && !loading
              ? 'bg-[#39FF14] hover:bg-[#32e011] text-black shadow-[0_4px_16px_rgba(57,255,20,0.15)] cursor-pointer'
              : 'bg-white/5 border border-white/5 text-slate-500 cursor-not-allowed'
          }`}
        >
          {processingPayment ? (
            <>
              <svg className="animate-spin h-4 w-4 text-black mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Securing Session...</span>
            </>
          ) : (
            <>
              <ShieldCheck size={14} />
              <span>Continue to Payment</span>
            </>
          )}
        </button>

        <p className="text-[8px] font-mono text-center text-slate-500 tracking-wider">
          🔒 SSL SECURED PORTAL • INSTANT VERIFICATION • PART 6 TESTING
        </p>
      </footer>

    </div>
  );
}
