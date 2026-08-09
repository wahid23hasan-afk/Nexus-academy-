import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ChevronLeft, 
  ShieldCheck, 
  CheckCircle2, 
  Info,
  Clock,
  ArrowRight,
  Smartphone,
  CreditCard,
  Building2,
  Copy,
  Check
} from 'lucide-react';
import { Course, PaymentMethodConfig } from '../types/course';
import { courseService, DEFAULT_PAYMENT_METHODS } from '../services/courseService';
import { progressService } from '../services/progressService';
import { auth } from '../services/firebase';

const FREE_COUPON_METHOD: PaymentMethodConfig = {
  id: 'coupon_free',
  name: '100% Discount Coupon (Free)',
  type: 'Coupon',
  accountNumber: 'N/A - Fully Discounted',
  accountType: '100% Coupon',
  instructions: 'Your coupon discount covers 100% of the program fee. Click "Pay Now & Submit" below to confirm your enrollment request.',
  badge: '100% OFF',
  color: 'from-emerald-500 to-teal-600',
  icon: '🎁',
  isActive: true
};

interface PaymentViewProps {
  course: Course;
  finalPrice: number;
  discount: number;
  couponCode: string;
  userProfile: { fullName: string; username: string; photoURL?: string } | null;
  onBack: () => void;
  onShowNotification: (message: string, type: 'success' | 'error') => void;
  onEnrollSuccess: () => void;
}

export function PaymentView({
  course,
  finalPrice,
  discount,
  couponCode,
  userProfile,
  onBack,
  onShowNotification,
  onEnrollSuccess
}: PaymentViewProps) {
  // Payment methods dynamically loaded from Admin configuration
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string>('');
  const [loadingMethods, setLoadingMethods] = useState(true);

  // Form inputs
  const [walletNumber, setWalletNumber] = useState('0');
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvc, setCvc] = useState('');
  
  // View phases: 'form' | 'trx_input' | 'loading' | 'pending_approval'
  const [phase, setPhase] = useState<'form' | 'trx_input' | 'loading' | 'pending_approval'>('form');
  const [userTrxId, setUserTrxId] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [copiedAccount, setCopiedAccount] = useState(false);

  // Platform Fee calculation
  const platformFee = finalPrice > 0 ? 20 : 0;
  const totalPayable = finalPrice + platformFee;

  // Load payment methods on mount
  useEffect(() => {
    async function loadMethods() {
      try {
        const methods = await courseService.getPaymentMethods();
        let active = methods.filter(m => m.isActive);
        if (active.length === 0) {
          active = DEFAULT_PAYMENT_METHODS;
        }
        if (totalPayable === 0) {
          active = [FREE_COUPON_METHOD, ...active.filter(m => m.id !== 'coupon_free')];
        }
        setPaymentMethods(active);
        if (active.length > 0) {
          setSelectedMethodId(active[0].id);
        }
      } catch (err) {
        console.error('Failed loading payment methods:', err);
        const fallback = totalPayable === 0 ? [FREE_COUPON_METHOD, ...DEFAULT_PAYMENT_METHODS] : DEFAULT_PAYMENT_METHODS;
        setPaymentMethods(fallback);
        setSelectedMethodId(fallback[0].id);
      } finally {
        setLoadingMethods(false);
      }
    }
    loadMethods();
  }, [totalPayable]);

  const selectedMethod = paymentMethods.find(m => m.id === selectedMethodId);

  // Mobile number input handler - automatically ensures leading "0"
  const handleWalletChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (!val.startsWith('0')) {
      val = '0' + val;
    }
    if (val.length <= 11) {
      setWalletNumber(val);
    }
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length <= 16) {
      const formatted = val.replace(/(\d{4})(?=\d)/g, '$1 ');
      setCardNumber(formatted);
    }
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length <= 4) {
      if (val.length >= 2) {
        val = val.substring(0, 2) + '/' + val.substring(2);
      }
      setExpiryDate(val);
    }
  };

  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    if (val.length <= 3) {
      setCvc(val);
    }
  };

  // Validations
  const validateInputs = (): boolean => {
    if (totalPayable === 0 || selectedMethod?.type === 'Coupon' || selectedMethod?.id === 'coupon_free') {
      return true;
    }

    if (!selectedMethod) {
      onShowNotification('Please select a payment method before submitting.', 'error');
      return false;
    }

    if (selectedMethod.type === 'MFS' || ['bkash', 'nagad', 'rocket', 'upay', 'cellfin'].includes(selectedMethod.id.toLowerCase())) {
      if (!walletNumber || walletNumber.length < 11) {
        onShowNotification('Please enter a valid 11-digit mobile wallet number starting with 0.', 'error');
        return false;
      }
    } else if (selectedMethod.type === 'Card' || ['visa', 'mastercard', 'card'].includes(selectedMethod.id.toLowerCase())) {
      const cleanCard = cardNumber.replace(/\s/g, '');
      if (cleanCard.length < 16) {
        onShowNotification('Please enter a valid 16-digit card number.', 'error');
        return false;
      }
      if (!cardHolder.trim()) {
        onShowNotification('Please enter the cardholder full name.', 'error');
        return false;
      }
      if (expiryDate.length < 5) {
        onShowNotification('Please enter the card expiration date (MM/YY).', 'error');
        return false;
      }
      if (cvc.length < 3) {
        onShowNotification('Please enter the 3-digit CVC code.', 'error');
        return false;
      }
    }
    return true;
  };

  // Step 1: User clicks "Pay Now & Submit for Admin Approval"
  const handleProceedToTrxInput = () => {
    if (!validateInputs()) return;

    if (totalPayable === 0 || selectedMethod?.type === 'Coupon' || selectedMethod?.id === 'coupon_free') {
      handleFinalSubmit('COUPON-FREE-' + Math.random().toString(36).substring(2, 8).toUpperCase());
    } else {
      setPhase('trx_input');
    }
  };

  // Step 2: Final submission with Transaction ID (TrxID)
  const handleFinalSubmit = async (customTrxId?: string) => {
    const finalTrxId = (customTrxId || userTrxId).trim().toUpperCase();

    if (!finalTrxId && (totalPayable > 0 && selectedMethod?.type !== 'Coupon')) {
      onShowNotification('Please enter your payment Transaction ID (TrxID) to proceed.', 'error');
      return;
    }

    setPhase('loading');

    setTimeout(async () => {
      try {
        const userId = auth.currentUser?.uid || userProfile?.username || 'anonymous_user';
        const userEmail = auth.currentUser?.email || 'student@nexus.edu';
        
        // Save purchase with status 'pending' (Awaiting Admin Approval)
        const result = await courseService.recordPurchase({
          userId,
          userEmail,
          userPhoneNumber: walletNumber,
          courseId: course.courseId,
          courseTitle: course.title,
          paymentMethod: selectedMethod?.name || 'MFS Payment',
          amount: totalPayable,
          discount: discount,
          coupon: couponCode,
          transactionId: finalTrxId,
          status: 'pending' // Admin Approval Required!
        });

        setTransactionId(result.transactionId);
        setPhase('pending_approval');
        onShowNotification('Payment & TrxID submitted! Awaiting Admin Approval.', 'success');
      } catch (err) {
        console.error('Error submitting payment:', err);
        setTransactionId(finalTrxId || ('TXN-' + Math.random().toString(36).substring(2, 9).toUpperCase()));
        setPhase('pending_approval');
        onShowNotification('Payment submitted! Awaiting Admin Approval.', 'success');
      }
    }, 1200);
  };

  // Copy Admin Payment Number
  const handleCopyAccount = () => {
    if (selectedMethod?.accountNumber) {
      navigator.clipboard.writeText(selectedMethod.accountNumber);
      setCopiedAccount(true);
      onShowNotification('Payment account number copied!', 'success');
      setTimeout(() => setCopiedAccount(false), 2000);
    }
  };

  // ================= RENDER PHASE: TRANSACTION ID INPUT (STEP 2) =================
  if (phase === 'trx_input') {
    return (
      <div className="flex-1 flex flex-col justify-between py-1 px-1 text-slate-100 max-w-lg mx-auto w-full">
        {/* Header */}
        <header className="flex items-center space-x-3 py-3.5 px-1 border-b border-white/5 backdrop-blur-md sticky top-0 z-40 bg-[#0a0f1d]/90">
          <button 
            onClick={() => setPhase('form')}
            className="p-2 rounded-xl bg-white/[0.02] border border-white/10 hover:bg-white/[0.06] text-slate-300 hover:text-white transition-all cursor-pointer flex items-center justify-center"
          >
            <ChevronLeft size={16} />
          </button>
          <div>
            <p className="text-[9px] font-mono text-[#39FF14] uppercase tracking-wider">STEP 2 OF 2 • PAYMENT VERIFICATION</p>
            <h1 className="text-sm font-sans font-bold text-white tracking-tight">Enter Payment Transaction ID</h1>
          </div>
        </header>

        <main className="flex-1 py-4 space-y-4 overflow-y-auto px-1">
          {/* Payment Summary Box */}
          <div className="bg-slate-950 border border-[#39FF14]/30 rounded-2xl p-4 space-y-3 shadow-lg">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div>
                <span className="text-[9px] font-mono text-slate-400 block uppercase">Selected Gateway</span>
                <span className="text-sm font-bold text-white flex items-center space-x-1.5">
                  <span>{selectedMethod?.icon || '💳'}</span>
                  <span>{selectedMethod?.name}</span>
                </span>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-mono text-slate-400 block uppercase">Total Payable</span>
                <span className="text-base font-mono font-extrabold text-[#39FF14]">৳{totalPayable.toLocaleString()}</span>
              </div>
            </div>

            {/* Admin Account Number display */}
            <div className="p-3 bg-white/[0.03] border border-white/10 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[9px] font-mono text-slate-400 block uppercase">
                  Admin {selectedMethod?.name} Number:
                </span>
                <span className="text-sm font-mono font-extrabold text-white tracking-wider">
                  {selectedMethod?.accountNumber}
                </span>
              </div>
              <button
                onClick={handleCopyAccount}
                className="px-2.5 py-1.5 bg-[#39FF14]/10 hover:bg-[#39FF14]/20 border border-[#39FF14]/30 rounded-lg text-xs font-mono text-[#39FF14] flex items-center space-x-1 cursor-pointer transition-colors"
              >
                {copiedAccount ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedAccount ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* User phone/account number */}
            <div className="flex justify-between text-xs font-mono text-slate-300 pt-1">
              <span className="text-slate-400">Your Sender Mobile/Card:</span>
              <span className="text-white font-bold">{walletNumber || 'Card Payment'}</span>
            </div>
          </div>

          {/* Payment Instructions */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3.5 space-y-1.5">
            <div className="flex items-center space-x-1.5 text-amber-300 font-bold text-xs">
              <Info size={14} />
              <span>নির্দেশনা (Instructions):</span>
            </div>
            <p className="text-[11px] text-amber-200/90 font-sans leading-relaxed">
              ১. আপনার {selectedMethod?.name} অ্যাপ অথবা USSD ডায়াল করে <span className="font-bold text-amber-300">৳{totalPayable.toLocaleString()}</span> টাকা <span className="font-bold text-white">{selectedMethod?.accountNumber}</span> নম্বরে সেন্ড মানি/পেমেন্ট করুন।
              <br />
              ২. পেমেন্ট সফল হলে এসএমএস (SMS) এ আসা <span className="font-bold text-[#39FF14]">Transaction ID (TrxID)</span> টি নিচে টাইপ করুন এবং কনফার্ম বাটনে ক্লিক করুন।
            </p>
          </div>

          {/* Transaction ID Input Form */}
          <div className="bg-slate-950 border border-white/10 rounded-2xl p-4 space-y-2.5 shadow-md">
            <label className="text-[10px] font-mono font-bold text-[#39FF14] uppercase tracking-wider block">
              🔑 PAYMENT TRANSACTION ID (TrxID) / ট্রানজেকশন আইডি:
            </label>
            
            <div className="relative">
              <input
                type="text"
                value={userTrxId}
                onChange={(e) => setUserTrxId(e.target.value.toUpperCase().trim())}
                placeholder="e.g. 8X9A21B or TRX9823472"
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-[#39FF14]/40 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-[#39FF14] focus:bg-white/[0.06] transition-all font-bold tracking-widest text-center uppercase"
                autoFocus
              />
            </div>

            <p className="text-[9.5px] text-slate-400 font-sans text-center">
              * সঠিক ট্রানজেকশন আইডি দিলে এডমিন দ্রুত আপনার পেমেন্ট ভেরিফাই করতে পারবেন।
            </p>
          </div>
        </main>

        {/* Footer actions */}
        <footer className="mt-4 pt-3 border-t border-white/5 space-y-2 px-1 bg-[#0a0f1d]">
          <button
            onClick={() => handleFinalSubmit()}
            className="w-full py-3.5 bg-[#39FF14] hover:bg-[#32e011] text-black font-bold uppercase tracking-wider text-xs rounded-xl transition-all flex items-center justify-center space-x-2 shadow-lg shadow-[#39FF14]/20 cursor-pointer"
          >
            <ShieldCheck size={16} />
            <span>CONFIRM PAYMENT & SUBMIT ORDER</span>
          </button>

          <button
            onClick={() => setPhase('form')}
            className="w-full py-2.5 bg-transparent hover:bg-white/5 text-slate-400 hover:text-white font-mono text-xs rounded-xl transition-all cursor-pointer"
          >
            ← Back to Payment Methods
          </button>
        </footer>
      </div>
    );
  }

  // ================= RENDER PHASE: LOADING =================
  if (phase === 'loading') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-24 text-center px-4 max-w-lg mx-auto w-full">
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-full border border-[#39FF14]/20 flex items-center justify-center animate-spin">
            <div className="w-16 h-16 rounded-full border-t-2 border-r-2 border-[#39FF14] animate-pulse" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <ShieldCheck size={28} className="text-[#39FF14] animate-bounce" />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <span className="text-[10px] font-mono text-[#39FF14] tracking-[0.2em] uppercase block">
            SECURE TRANSACTION SUBMISSION
          </span>
          <h2 className="text-base font-sans font-bold text-white tracking-tight">
            Submitting Payment Record...
          </h2>
          <p className="text-xs text-slate-400 max-w-xs mx-auto font-sans leading-relaxed">
            Registering transaction for Admin Approval. Please do not close this window.
          </p>
        </motion.div>
      </div>
    );
  }

  // ================= RENDER PHASE: PENDING ADMIN APPROVAL =================
  if (phase === 'pending_approval') {
    return (
      <div className="flex-1 flex flex-col justify-between py-6 px-3 text-slate-100 max-w-lg mx-auto w-full">
        <div className="space-y-6 my-auto text-center">
          
          <div className="w-20 h-20 bg-amber-500/10 border-2 border-amber-500/30 rounded-3xl flex items-center justify-center mx-auto text-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.2)]">
            <Clock size={40} className="animate-pulse" />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-full uppercase tracking-widest inline-block font-bold">
              STATUS: PENDING ADMIN APPROVAL
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Payment Submission Received!
            </h2>
            <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
              Your payment for <span className="text-amber-300 font-semibold">{course.title}</span> has been submitted successfully.
            </p>
          </div>

          <div className="bg-slate-950 border border-white/10 rounded-2xl p-4 text-left space-y-3 font-mono text-xs">
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span className="text-slate-500">Transaction ID:</span>
              <span className="text-[#39FF14] font-bold">{transactionId}</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span className="text-slate-500">Payment Method:</span>
              <span className="text-white">{selectedMethod?.name}</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span className="text-slate-500">Account Number:</span>
              <span className="text-white">{walletNumber || 'Card Payment'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total Paid:</span>
              <span className="text-[#39FF14] font-bold">৳{totalPayable.toLocaleString()}</span>
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3.5 text-left flex items-start space-x-3">
            <Info size={18} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-amber-200/90 leading-relaxed space-y-1">
              <p className="font-bold text-amber-300">Approval Notice:</p>
              <p>
                Course lessons and content will be unlocked automatically as soon as the Admin verifies and approves your payment transaction.
              </p>
            </div>
          </div>

        </div>

        <div className="space-y-3 pt-4 border-t border-white/5">
          <button
            onClick={() => {
              onEnrollSuccess();
              onBack();
            }}
            className="w-full py-3.5 bg-[#39FF14] hover:bg-[#32e011] text-black font-bold uppercase tracking-wider text-xs rounded-xl transition-all flex items-center justify-center space-x-2 shadow-lg cursor-pointer"
          >
            <span>GO TO MY COURSES</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  // ================= RENDER PHASE: PAYMENT FORM =================
  return (
    <div className="flex-1 flex flex-col justify-between py-1 px-1 text-slate-100 max-w-lg mx-auto w-full">
      
      {/* Header */}
      <header className="flex items-center space-x-3 py-3.5 px-1 border-b border-white/5 backdrop-blur-md sticky top-0 z-40 bg-[#0a0f1d]/90">
        <button 
          onClick={onBack}
          className="p-2 rounded-xl bg-white/[0.02] border border-white/10 hover:bg-white/[0.06] text-slate-300 hover:text-white transition-all cursor-pointer flex items-center justify-center"
        >
          <ChevronLeft size={16} />
        </button>
        <div>
          <p className="text-[9px] font-mono text-[#39FF14] uppercase tracking-wider">SECURE CHECKOUT</p>
          <h1 className="text-sm font-sans font-bold text-white tracking-tight">Select Payment Method</h1>
        </div>
      </header>

      <main className="flex-1 py-4 space-y-5 overflow-y-auto px-1">
        
        {/* Course Mini Spotlight */}
        <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-3 flex items-center space-x-3">
          <img src={course.thumbnail || undefined} alt={course.title} className="w-12 h-12 rounded-lg object-cover border border-white/10" referrerPolicy="no-referrer" />
          <div className="flex-1 min-w-0">
            <span className="text-[8px] font-mono text-[#39FF14] uppercase tracking-wider block">{course.category}</span>
            <h2 className="text-[11px] font-sans font-bold text-white truncate leading-tight">{course.title}</h2>
            <p className="text-[9px] text-slate-400">By {course.instructor}</p>
          </div>
        </div>

        {/* ================= PAYMENT METHODS SELECTION ================= */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between pl-1">
            <h3 className="text-[10px] font-mono font-bold text-slate-400 tracking-wider uppercase">
              💳 SELECT PAYMENT METHOD:
            </h3>
            <span className="text-[9px] font-mono text-[#39FF14]">
              {paymentMethods.length} Available
            </span>
          </div>

          {loadingMethods ? (
            <div className="p-4 text-center text-xs font-mono text-slate-400 animate-pulse">
              Loading payment gateways...
            </div>
          ) : paymentMethods.length === 0 ? (
            <div className="p-4 text-center text-xs font-mono text-amber-400 bg-amber-500/10 rounded-xl border border-amber-500/20">
              No active payment methods configured by admin.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {paymentMethods.map((m) => {
                const isActive = selectedMethodId === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      setSelectedMethodId(m.id);
                      setWalletNumber('0');
                      setCardNumber('');
                      setCardHolder('');
                      setExpiryDate('');
                      setCvc('');
                    }}
                    className={`relative rounded-2xl p-3 text-left border cursor-pointer transition-all flex flex-col justify-between min-h-[90px] overflow-hidden group ${
                      isActive 
                        ? 'border-[#39FF14] bg-slate-950 shadow-[0_4px_16px_rgba(57,255,20,0.15)]' 
                        : 'border-white/5 bg-white/[0.01] hover:border-white/15'
                    }`}
                  >
                    {isActive && (
                      <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#39FF14] shadow-[0_0_8px_#39FF14]" />
                    )}

                    <div className="flex items-center justify-between w-full">
                      <span className="text-xl font-mono">{m.icon || '💳'}</span>
                      <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        isActive ? 'bg-[#39FF14]/10 text-[#39FF14]' : 'bg-white/5 text-slate-500'
                      }`}>
                        {m.badge || m.type}
                      </span>
                    </div>

                    <div className="pt-2">
                      <span className="text-[10px] font-mono text-slate-400 block leading-none">{m.accountType || m.type}</span>
                      <span className="text-xs font-sans font-bold text-white mt-1 block truncate">
                        {m.name}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ================= ADMIN PAYMENT NUMBER & DETAILS ================= */}
        {selectedMethod && (
          <div className="bg-slate-950 border border-[#39FF14]/20 rounded-2xl p-4 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-[#39FF14] font-bold uppercase tracking-wider flex items-center">
                <Info size={12} className="mr-1.5" />
                ADMIN PAYMENT DETAILS
              </span>
              <span className="text-[9px] bg-[#39FF14]/10 text-[#39FF14] px-2 py-0.5 rounded font-mono font-bold">
                {selectedMethod.accountType || 'Personal'}
              </span>
            </div>

            <div className="p-3 bg-white/[0.02] border border-white/10 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[9px] font-mono text-slate-400 block uppercase">
                  {selectedMethod.name} Number / Gateway:
                </span>
                <span className="text-sm font-mono font-extrabold text-white tracking-wider">
                  {selectedMethod.accountNumber}
                </span>
              </div>
              <button
                onClick={handleCopyAccount}
                className="px-2.5 py-1.5 bg-[#39FF14]/10 hover:bg-[#39FF14]/20 border border-[#39FF14]/30 rounded-lg text-xs font-mono text-[#39FF14] flex items-center space-x-1 cursor-pointer transition-colors"
              >
                {copiedAccount ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedAccount ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {selectedMethod.instructions && (
              <p className="text-[10px] text-slate-300 font-sans leading-relaxed">
                💡 <span className="font-semibold text-white">Instructions:</span> {selectedMethod.instructions}
              </p>
            )}
          </div>
        )}

        {/* ================= USER TRANSACTION DETAILS INPUT ================= */}
        {selectedMethod && (
          <div className="space-y-2.5">
            <h3 className="text-[10px] font-mono font-bold text-slate-400 tracking-wider uppercase pl-1">
              ✍️ ENTER YOUR PAYMENT DETAILS:
            </h3>

            <div className="bg-slate-950 border border-white/10 rounded-2xl p-4 space-y-3.5 shadow-md">
              
              {/* MFS Phone Number Input with Auto-Prefilled 0 */}
              {(selectedMethod.type === 'MFS' || ['bkash', 'nagad', 'rocket', 'upay', 'cellfin'].includes(selectedMethod.id.toLowerCase())) && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-slate-400 block">
                    YOUR {selectedMethod.name.toUpperCase()} NUMBER (AUTOMATIC PRE-FILLED 0):
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[#39FF14] font-mono text-xs font-bold">
                      +88
                    </div>
                    <input
                      type="tel"
                      value={walletNumber}
                      onChange={handleWalletChange}
                      placeholder="01XXXXXXXXX"
                      className="w-full pl-12 pr-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-[#39FF14]/50 transition-all font-bold tracking-wider"
                    />
                  </div>
                  <p className="text-[8.5px] text-slate-400 leading-normal font-sans">
                    * The input starts automatically with <span className="text-[#39FF14] font-bold">"0"</span>. Simply type your remaining digits (e.g., 01712345678).
                  </p>
                </div>
              )}

              {/* Coupon / Free 100% Discount Message */}
              {(selectedMethod.type === 'Coupon' || selectedMethod.id === 'coupon_free') && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-sans space-y-1">
                  <p className="font-bold">🎁 100% Discount Applied!</p>
                  <p className="text-[10px] text-slate-300">
                    Your coupon discount covers 100% of the program fee. No payment details required! Click "Pay Now & Submit For Admin Approval" below to confirm your enrollment.
                  </p>
                </div>
              )}
              {(selectedMethod.type === 'Card' || ['visa', 'mastercard', 'card'].includes(selectedMethod.id.toLowerCase())) && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-slate-400 block">CARD NUMBER (16 DIGITS):</label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      placeholder="0000 0000 0000 0000"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.02] border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-[#39FF14]/50 transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-slate-400 block">CARDHOLDER NAME:</label>
                    <input
                      type="text"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      placeholder="John Doe"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.02] border border-white/10 text-xs font-sans text-white focus:outline-none focus:border-[#39FF14]/50 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-slate-400 block">EXPIRY DATE:</label>
                      <input
                        type="text"
                        value={expiryDate}
                        onChange={handleExpiryChange}
                        placeholder="MM/YY"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.02] border border-white/10 text-xs font-mono text-white text-center focus:outline-none focus:border-[#39FF14]/50 transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-slate-400 block">CVC CODE:</label>
                      <input
                        type="password"
                        value={cvc}
                        onChange={handleCvcChange}
                        placeholder="***"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.02] border border-white/10 text-xs font-mono text-white text-center focus:outline-none focus:border-[#39FF14]/50 transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* ================= BILLING SUMMARY ================= */}
        <div className="space-y-2.5">
          <h3 className="text-[10px] font-mono font-bold text-slate-400 tracking-wider uppercase pl-1">
            🧾 FINAL BILLING CALCULATION SUMMARY:
          </h3>

          <div className="bg-slate-950 border border-white/10 rounded-2xl p-4 space-y-2.5 shadow-md">
            <div className="flex justify-between text-xs font-sans text-slate-400">
              <span>Program Catalog Subtotal</span>
              <span className="font-mono">৳{course.price?.toLocaleString()}</span>
            </div>

            {discount > 0 && (
              <div className="flex justify-between text-xs font-sans text-emerald-400">
                <span>Total Coupon & Campaign Discount</span>
                <span className="font-mono">-৳{discount?.toLocaleString()}</span>
              </div>
            )}

            {platformFee > 0 && (
              <div className="flex justify-between text-xs font-sans text-slate-400">
                <span className="flex items-center">
                  <span>SSL Gateway Platform Fee</span>
                  <Info size={10} className="ml-1 text-slate-500" />
                </span>
                <span className="font-mono">৳{platformFee}</span>
              </div>
            )}

            <div className="border-t border-white/10 pt-3 flex justify-between items-center mt-1">
              <div>
                <span className="text-xs font-sans text-white font-semibold block">Settled Total Payable</span>
                <span className="text-[9px] font-mono text-slate-500">Includes all VAT/Platform Fee</span>
              </div>
              <div>
                <span className="text-base font-mono font-extrabold text-[#39FF14] drop-shadow-[0_0_6px_rgba(57,255,20,0.3)]">
                  ৳{totalPayable?.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

      </main>

      {/* ================= FOOTER ACTIONS ================= */}
      <footer className="mt-4 pt-3 border-t border-white/5 space-y-2.5 px-1 bg-[#0a0f1d]">
        <button
          onClick={handleProceedToTrxInput}
          className="w-full py-3.5 bg-[#39FF14] hover:bg-[#32e011] text-black font-bold uppercase tracking-wider text-xs rounded-xl transition-all flex items-center justify-center space-x-2 shadow-lg shadow-[#39FF14]/10 cursor-pointer"
        >
          <ShieldCheck size={14} />
          <span>Pay Now & Submit for Admin Approval</span>
        </button>

        <p className="text-[8px] font-mono text-center text-slate-500 tracking-wider">
          🔒 ENCRYPTED PAYMENT LEDGER • REQUIRES ADMIN APPROVAL BEFORE ENROLLMENT
        </p>
      </footer>

    </div>
  );
}
