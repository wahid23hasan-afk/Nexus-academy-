import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, DollarSign, CreditCard, Send, Building2, Smartphone } from 'lucide-react';
import { db, auth } from '../services/firebase';
import { collection, addDoc } from 'firebase/firestore';

interface InstructorPayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  instructorName?: string;
  instructorEmail?: string;
  availableBalance?: number;
  onShowNotification: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export function InstructorPayoutModal({
  isOpen,
  onClose,
  instructorName,
  instructorEmail,
  availableBalance,
  onShowNotification
}: InstructorPayoutModalProps) {
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'bKash' | 'Nagad' | 'Rocket' | 'Bank'>('bKash');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      onShowNotification('Please enter a valid withdrawal amount in BDT.', 'error');
      return;
    }

    if (availableBalance !== undefined && numAmount > availableBalance) {
      onShowNotification(`Withdrawal amount exceeds your available balance (৳${availableBalance.toLocaleString()}).`, 'error');
      return;
    }

    if (!accountNumber.trim()) {
      onShowNotification('Please enter your account number or bank details.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const currentUser = auth.currentUser;
      const uid = currentUser?.uid || 'instructor_guest';
      const name = instructorName || currentUser?.displayName || 'Instructor';
      const email = instructorEmail || currentUser?.email || '';

      const payload = {
        instructorId: uid,
        instructorName: name,
        instructorEmail: email,
        amount: numAmount,
        paymentMethod: paymentMethod,
        accountNumber: accountNumber.trim(),
        status: 'pending',
        createdAt: new Date().toISOString(),
        adminNote: ''
      };

      await addDoc(collection(db, 'payout_requests'), payload);

      onShowNotification('Withdrawal request submitted successfully! Pending admin approval.', 'success');
      setAmount('');
      setAccountNumber('');
      onClose();
    } catch (err: any) {
      console.error('Error submitting payout request:', err);
      onShowNotification('Failed to submit withdrawal request: ' + (err.message || 'Error'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return typeof document !== 'undefined' ? createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-start justify-center p-3 sm:p-6 pt-4 sm:pt-10 bg-black/80 backdrop-blur-md overflow-y-auto w-screen h-[100dvh] top-0 left-0">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          className="w-full max-w-md bg-[#0a0f1d] border border-amber-500/30 rounded-2xl p-6 shadow-[0_0_35px_rgba(0,0,0,0.9)] space-y-5 relative my-auto max-h-[90vh] overflow-y-auto custom-scrollbar"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <CreditCard size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-wide">Request Payout</h3>
                <p className="text-[10px] font-mono text-amber-400/80">টাকা তোলার আবেদন</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Withdrawal Amount */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider">
                  Withdrawal Amount (BDT)
                </label>
                {availableBalance !== undefined && (
                  <span className="text-[11px] font-mono text-amber-400 font-bold">
                    Avail: ৳{availableBalance.toLocaleString()}
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">৳</span>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-full bg-slate-900 border border-white/10 focus:border-amber-500/60 rounded-xl pl-8 pr-3 py-2.5 text-white text-sm outline-none font-mono"
                  required
                />
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-1">
                Payment Method
              </label>
              <div className="relative">
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full bg-slate-900 border border-white/10 focus:border-amber-500/60 rounded-xl px-3.5 py-2.5 text-white text-sm outline-none font-sans appearance-none cursor-pointer"
                >
                  <option value="bKash" className="bg-slate-900 text-white">bKash Personal / Agent</option>
                  <option value="Nagad" className="bg-slate-900 text-white">Nagad Personal / Agent</option>
                  <option value="Rocket" className="bg-slate-900 text-white">Rocket Account</option>
                  <option value="Bank" className="bg-slate-900 text-white">Bank Transfer</option>
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                  ▼
                </div>
              </div>
            </div>

            {/* Account Number / Bank Details */}
            <div>
              <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-1">
                Account Number / Bank Details
              </label>
              <div className="relative">
                {paymentMethod === 'Bank' ? (
                  <Building2 size={16} className="absolute left-3 top-3 text-slate-400" />
                ) : (
                  <Smartphone size={16} className="absolute left-3 top-3 text-slate-400" />
                )}
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder={
                    paymentMethod === 'Bank'
                      ? 'Bank Name, Branch, Account Holder Name & Account No.'
                      : `Enter 11-digit ${paymentMethod} mobile number`
                  }
                  className="w-full bg-slate-900 border border-white/10 focus:border-amber-500/60 rounded-xl pl-9 pr-3 py-2.5 text-white text-sm outline-none font-mono"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-amber-500 hover:bg-amber-600 text-black font-mono font-bold py-3 rounded-xl transition-all cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.3)] flex items-center justify-center space-x-2 disabled:opacity-50 mt-2"
            >
              {isSubmitting ? (
                <span>Submitting Request...</span>
              ) : (
                <>
                  <Send size={16} />
                  <span>Submit Withdrawal Request</span>
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  ) : null;
}
