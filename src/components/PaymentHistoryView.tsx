import React, { useState, useEffect } from 'react';
import { ChevronLeft, CreditCard, Clock, CheckCircle2, XCircle, RefreshCw, AlertTriangle, ArrowRight, Copy, Check, ShieldAlert, Receipt, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from '../services/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { courseService } from '../services/courseService';
import { Purchase, Course } from '../types/course';
import { RefundRequestModal } from './RefundRequestModal';

interface PaymentHistoryViewProps {
  onBack: () => void;
  userProfile: any;
  onShowNotification: (message: string, type: 'success' | 'error') => void;
  onRetryPayment?: (courseId: string) => void;
}

export const PaymentHistoryView: React.FC<PaymentHistoryViewProps> = ({
  onBack,
  userProfile,
  onShowNotification,
  onRetryPayment
}) => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [courses, setCourses] = useState<Record<string, Course>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<'all' | 'rejected' | 'pending' | 'approved'>('all');
  const [copiedTxnId, setCopiedTxnId] = useState<string | null>(null);

  // Refund modal & history state
  const [refundTarget, setRefundTarget] = useState<{ courseId: string; courseTitle: string; amount: number } | null>(null);
  const [userRefundRequests, setUserRefundRequests] = useState<any[]>([]);

  useEffect(() => {
    const currentUid = auth.currentUser?.uid;
    const currentEmail = auth.currentUser?.email || userProfile?.email;
    const currentUsername = userProfile?.username;

    const qRefunds = query(collection(db, 'refund_requests'));
    const unsubRefunds = onSnapshot(qRefunds, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const isMatch = 
          (currentUid && data.userId === currentUid) ||
          (currentEmail && data.userEmail && data.userEmail.toLowerCase() === currentEmail.toLowerCase()) ||
          (currentUsername && data.userId === currentUsername);

        if (isMatch) {
          list.push({
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt || new Date().toISOString()
          });
        }
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setUserRefundRequests(list);
    }, (err) => console.warn('Error fetching refund requests in PaymentHistoryView:', err));

    return () => unsubRefunds();
  }, [userProfile]);

  const fetchUserPurchases = async () => {
    setLoading(true);
    const userId = auth.currentUser?.uid || userProfile?.username || 'guest_user';
    const userEmail = auth.currentUser?.email || userProfile?.email || userProfile?.username || '';

    try {
      const [purList, courseList] = await Promise.all([
        courseService.getUserPurchases(userId, userEmail),
        courseService.getCourses()
      ]);

      // Create course lookup map
      const courseMap: Record<string, Course> = {};
      courseList.forEach(c => {
        courseMap[c.courseId] = c;
      });
      setCourses(courseMap);

      // Sort newest first
      const sorted = [...purList].sort((a, b) => {
        const dateA = new Date(a.purchaseDate || 0).getTime();
        const dateB = new Date(b.purchaseDate || 0).getTime();
        return dateB - dateA;
      });

      setPurchases(sorted);
    } catch (err) {
      console.error('Failed fetching user purchases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserPurchases();

    const handleUpdate = () => {
      fetchUserPurchases();
    };

    window.addEventListener('nexus_purchases_updated', handleUpdate);

    const userId = auth.currentUser?.uid || userProfile?.username || 'guest_user';
    let unsub: (() => void) | null = null;
    try {
      const q = query(collection(db, 'purchases'), where('userId', '==', userId));
      unsub = onSnapshot(q, () => {
        fetchUserPurchases();
      });
    } catch (err) {
      console.warn('Real-time listener notice in PaymentHistoryView:', err);
    }

    return () => {
      window.removeEventListener('nexus_purchases_updated', handleUpdate);
      if (unsub) unsub();
    };
  }, [userProfile]);

  const handleCopyTxn = (txnId: string) => {
    navigator.clipboard.writeText(txnId);
    setCopiedTxnId(txnId);
    onShowNotification('Transaction ID copied to clipboard!', 'success');
    setTimeout(() => setCopiedTxnId(null), 2000);
  };

  const approvedCount = purchases.filter(p => p.status === 'approved' || p.status === 'active' || p.status === 'success').length;
  const pendingCount = purchases.filter(p => p.status === 'pending').length;
  const rejectedCount = purchases.filter(p => p.status === 'rejected' || p.status === 'failed').length;

  const filteredPurchases = purchases.filter(p => {
    if (filter === 'approved') return p.status === 'approved' || p.status === 'active' || p.status === 'success';
    if (filter === 'pending') return p.status === 'pending';
    if (filter === 'rejected') return p.status === 'rejected' || p.status === 'failed';
    return true;
  });

  return (
    <div className="flex-1 flex flex-col pt-2 pb-24 space-y-4 max-w-xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <button 
          onClick={onBack}
          className="flex items-center text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ChevronLeft size={20} />
          <span className="text-sm font-medium ml-1">Back to Profile</span>
        </button>
        <button
          onClick={() => fetchUserPurchases()}
          className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all cursor-pointer"
          title="Refresh payment status"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin text-[#39FF14]' : ''} />
        </button>
      </div>

      {/* Title Card */}
      <div className="glass-panel p-5 rounded-2xl border border-white/10 relative overflow-hidden bg-gradient-to-br from-slate-900/90 via-slate-900/50 to-slate-950/90">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#39FF14]/10 rounded-full blur-[60px] pointer-events-none" />
        
        <div className="flex items-center space-x-3 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-[#39FF14]/10 border border-[#39FF14]/30 flex items-center justify-center text-[#39FF14] shrink-0 shadow-[0_0_15px_rgba(57,255,20,0.15)]">
            <Receipt size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Payment & Order Status</h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">Live tracking of your course enrollments & verification</p>
          </div>
        </div>

        {/* Rejected Alert Notice Banner if there are rejected payments */}
        {rejectedCount > 0 && (
          <div className="mt-4 p-3 bg-red-950/60 border border-red-500/40 rounded-xl flex items-start space-x-2.5 text-red-200 text-xs">
            <ShieldAlert size={18} className="text-red-400 shrink-0 mt-0.5 animate-pulse" />
            <div className="flex-1">
              <span className="font-bold text-red-300 block">Payment Action Required!</span>
              <p className="text-[11px] text-red-200/90 leading-relaxed mt-0.5">
                You have {rejectedCount} rejected payment submission{rejectedCount > 1 ? 's' : ''}. Admin was unable to verify your Transaction ID. Please click "Retry Payment" below to re-submit correct transaction details.
              </p>
            </div>
          </div>
        )}

        {/* Counter Summary Pills */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/10 text-center">
          <div className="bg-white/5 rounded-xl p-2 border border-white/5">
            <span className="text-[10px] text-slate-400 font-mono block">Approved</span>
            <span className="text-sm font-bold text-[#39FF14] font-mono">{approvedCount}</span>
          </div>
          <div className="bg-white/5 rounded-xl p-2 border border-white/5">
            <span className="text-[10px] text-slate-400 font-mono block">Pending</span>
            <span className="text-sm font-bold text-amber-400 font-mono">{pendingCount}</span>
          </div>
          <div className="bg-white/5 rounded-xl p-2 border border-white/5">
            <span className="text-[10px] text-slate-400 font-mono block">Rejected</span>
            <span className="text-sm font-bold text-red-400 font-mono">{rejectedCount}</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-1">
        <button
          onClick={() => setFilter('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold tracking-wide transition-all cursor-pointer whitespace-nowrap ${
            filter === 'all'
              ? 'bg-[#39FF14] text-black shadow-md shadow-[#39FF14]/20'
              : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
          }`}
        >
          All ({purchases.length})
        </button>
        {rejectedCount > 0 && (
          <button
            onClick={() => setFilter('rejected')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold tracking-wide transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1 ${
              filter === 'rejected'
                ? 'bg-red-500 text-white shadow-md shadow-red-500/20'
                : 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30'
            }`}
          >
            <XCircle size={12} />
            <span>Rejected ({rejectedCount})</span>
          </button>
        )}
        <button
          onClick={() => setFilter('pending')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold tracking-wide transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1 ${
            filter === 'pending'
              ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
              : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
          }`}
        >
          <Clock size={12} />
          <span>Pending ({pendingCount})</span>
        </button>
        <button
          onClick={() => setFilter('approved')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold tracking-wide transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1 ${
            filter === 'approved'
              ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
              : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
          }`}
        >
          <CheckCircle2 size={12} />
          <span>Approved ({approvedCount})</span>
        </button>
      </div>

      {/* Purchase Records List */}
      {loading ? (
        <div className="space-y-3 py-6">
          {[1, 2].map((i) => (
            <div key={i} className="glass-panel p-4 rounded-2xl border border-white/5 shimmer-effect h-32" />
          ))}
        </div>
      ) : filteredPurchases.length === 0 ? (
        <div className="glass-panel rounded-2xl p-8 text-center border border-white/5 space-y-3 my-4">
          <CreditCard size={36} className="mx-auto text-slate-600" />
          <h3 className="text-sm font-bold text-white">No payment records found</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            {filter === 'rejected'
              ? 'Great! You have no rejected payment submissions.'
              : filter === 'pending'
              ? 'You have no payments currently under admin verification.'
              : 'You have not submitted any course payment requests yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredPurchases.map((purchase, index) => {
            const courseObj = courses[purchase.courseId];
            const courseTitle = purchase.courseTitle || courseObj?.title || 'Nexus Academic Course';
            const isApproved = purchase.status === 'approved' || purchase.status === 'active' || purchase.status === 'success';
            const isPending = purchase.status === 'pending';
            const isRejected = purchase.status === 'rejected' || purchase.status === 'failed';
            const itemKey = purchase.purchaseId || (purchase as any).id || `purchase-${index}-${purchase.courseId}-${purchase.transactionId || ''}`;

            return (
              <motion.div
                key={itemKey}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`glass-panel p-4 rounded-2xl border transition-all relative overflow-hidden ${
                  isRejected
                    ? 'bg-gradient-to-br from-red-950/40 via-slate-900/80 to-slate-950/90 border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.1)]'
                    : isPending
                    ? 'bg-gradient-to-br from-amber-950/30 via-slate-900/80 to-slate-950/90 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.08)]'
                    : 'bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-950/90 border-white/10'
                }`}
              >
                {/* Status Badge Header */}
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold flex items-center space-x-1 border ${
                    isApproved
                      ? 'bg-[#39FF14]/15 text-[#39FF14] border-[#39FF14]/40'
                      : isPending
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                      : 'bg-red-500/20 text-red-300 border-red-500/40'
                  }`}>
                    {isApproved ? (
                      <>
                        <CheckCircle2 size={12} className="text-[#39FF14]" />
                        <span>Approved & Verified</span>
                      </>
                    ) : isPending ? (
                      <>
                        <Clock size={12} className="text-amber-400" />
                        <span>Pending Admin Review</span>
                      </>
                    ) : (
                      <>
                        <XCircle size={12} className="text-red-400" />
                        <span>Payment Rejected</span>
                      </>
                    )}
                  </span>

                  <span className="text-[10px] font-mono text-slate-400">
                    {purchase.purchaseDate ? new Date(purchase.purchaseDate).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    }) : 'Recent'}
                  </span>
                </div>

                {/* Course Details */}
                <div className="mt-3 flex items-start space-x-3">
                  {courseObj?.thumbnail?.trim() ? (
                    <img 
                      src={courseObj.thumbnail.trim()} 
                      alt={courseTitle} 
                      className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 shrink-0">
                      <CreditCard size={20} />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-white truncate">{courseTitle}</h4>
                    <div className="flex items-center space-x-2 mt-1 text-[11px] font-mono">
                      <span className="text-slate-300 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                        {purchase.paymentMethod || 'MFS'}
                      </span>
                      <span className="text-[#39FF14] font-bold">
                        ৳{purchase.amount?.toLocaleString()}
                      </span>
                      {purchase.discount > 0 && (
                        <span className="text-amber-400 text-[10px]">
                          ({purchase.discount}% off)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Transaction ID & Copy */}
                <div className="mt-3 p-2.5 bg-black/40 rounded-xl border border-white/5 flex items-center justify-between text-xs font-mono">
                  <div className="min-w-0 flex-1 pr-2">
                    <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Transaction ID</span>
                    <span className="text-slate-200 font-semibold truncate block">{purchase.transactionId || 'N/A'}</span>
                  </div>
                  <button
                    onClick={() => handleCopyTxn(purchase.transactionId)}
                    className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors shrink-0 cursor-pointer"
                    title="Copy Transaction ID"
                  >
                    {copiedTxnId === purchase.transactionId ? <Check size={14} className="text-[#39FF14]" /> : <Copy size={14} />}
                  </button>
                </div>

                {/* Message Box per Status */}
                {isRejected && (
                  <div className="mt-3 p-3 bg-red-950/80 border border-red-500/40 rounded-xl space-y-2">
                    <div className="flex items-center text-red-300 text-xs font-bold space-x-1.5">
                      <AlertTriangle size={14} className="text-red-400" />
                      <span>Rejection Notice from Admin:</span>
                    </div>
                    <p className="text-[11px] text-red-200/90 leading-relaxed font-sans">
                      Admin could not verify this transaction. Common causes include wrong Transaction ID, incorrect payment amount, or unconfirmed payment.
                    </p>
                    <div className="pt-1 flex justify-end">
                      <button
                        onClick={() => {
                          if (onRetryPayment) {
                            onRetryPayment(purchase.courseId);
                          } else {
                            onShowNotification('Navigating to course catalog...', 'success');
                            onBack();
                          }
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-600/30 flex items-center space-x-1.5 transition-all cursor-pointer"
                      >
                        <RefreshCw size={13} />
                        <span>Retry Payment / Re-Submit</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                )}

                {isPending && (
                  <div className="mt-3 p-2.5 bg-amber-950/40 border border-amber-500/20 rounded-xl text-[11px] text-amber-200/90 leading-relaxed flex items-center space-x-2">
                    <Clock size={14} className="text-amber-400 shrink-0" />
                    <span>Your payment verification is in progress. Verification usually takes 5-30 minutes during standard hours.</span>
                  </div>
                )}

                {isApproved && (
                  <div className="mt-3 p-2.5 bg-emerald-950/40 border border-emerald-500/20 rounded-xl text-[11px] text-emerald-300 leading-relaxed flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 size={14} className="text-[#39FF14] shrink-0" />
                      <span>Course unlocked! Access all modules & live classes.</span>
                    </div>
                    <button
                      onClick={() => setRefundTarget({
                        courseId: purchase.courseId,
                        courseTitle,
                        amount: purchase.amount || 0
                      })}
                      className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer"
                    >
                      Request Refund
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* REFUND REQUESTS HISTORY SECTION */}
      {userRefundRequests.length > 0 && (
        <div className="pt-4 border-t border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono font-bold text-slate-300 uppercase flex items-center space-x-2">
              <RotateCcw size={15} className="text-amber-400" />
              <span>Refund Request History ({userRefundRequests.length})</span>
            </h3>
            <span className="text-[10px] font-mono text-slate-400">Real-time status tracking</span>
          </div>

          <div className="space-y-2.5">
            {userRefundRequests.map((req) => (
              <div
                key={req.id}
                className="p-3.5 rounded-2xl bg-slate-950 border border-white/10 space-y-2 text-xs font-sans shadow-md"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-white text-xs">{req.courseTitle}</h4>
                    <span className="text-[10px] font-mono text-slate-400 block mt-0.5">Payout: {req.bkashNumber || 'N/A'}</span>
                  </div>

                  <div className="text-right flex flex-col items-end">
                    <span className="font-mono font-bold text-amber-400">৳{req.amount}</span>
                    <span className={`mt-1 px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider flex items-center space-x-1 ${
                      req.status === 'approved'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : req.status === 'rejected'
                        ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        : 'bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse'
                    }`}>
                      {req.status === 'approved' && <CheckCircle2 size={11} />}
                      {req.status === 'rejected' && <XCircle size={11} />}
                      {req.status === 'pending' && <Clock size={11} />}
                      <span>{req.status}</span>
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-300 bg-white/[0.02] p-2 rounded-xl border border-white/5">
                  <span className="text-slate-400 font-mono text-[9px] uppercase block mb-0.5">Reason:</span>
                  <span>{req.reason}</span>
                </div>

                {req.adminNote && (
                  <div className={`p-2 rounded-xl text-[11px] border ${
                    req.status === 'approved' 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' 
                      : req.status === 'rejected'
                      ? 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                      : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                  }`}>
                    <span className="font-mono text-[9px] uppercase font-bold block mb-0.5">Admin Note:</span>
                    <span>{req.adminNote}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 pt-1 border-t border-white/5">
                  <span>Submitted: {new Date(req.createdAt).toLocaleString()}</span>
                  {req.resolvedAt && <span>Updated: {new Date(req.resolvedAt).toLocaleString()}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* REFUND REQUEST MODAL */}
      <RefundRequestModal
        isOpen={refundTarget !== null}
        onClose={() => setRefundTarget(null)}
        courseId={refundTarget?.courseId || ''}
        courseTitle={refundTarget?.courseTitle || ''}
        amount={refundTarget?.amount || 0}
        onShowNotification={onShowNotification}
      />
    </div>
  );
};
