import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, DollarSign, AlertCircle, Send } from 'lucide-react';
import { db } from '../services/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { auth } from '../services/firebase';

interface RefundRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  courseTitle: string;
  amount: number;
  onShowNotification: (message: string, type: 'success' | 'error') => void;
}

export function RefundRequestModal({
  isOpen,
  onClose,
  courseId,
  courseTitle,
  amount,
  onShowNotification
}: RefundRequestModalProps) {
  const [bkashNumber, setBkashNumber] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bkashNumber.trim()) {
      onShowNotification('Please enter your bKash/Nagad number.', 'error');
      return;
    }
    if (!reason.trim()) {
      onShowNotification('Please provide a reason for the refund.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const user = auth.currentUser;
      const requestData = {
        userId: user?.uid || 'anonymous',
        userName: user?.displayName || 'Student',
        userEmail: user?.email || '',
        courseId,
        courseTitle,
        amount,
        bkashNumber: bkashNumber.trim(),
        reason: reason.trim(),
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'refund_requests'), requestData);
      
      onShowNotification('Refund request submitted successfully.', 'success');
      onClose();
    } catch (err) {
      console.error('Error submitting refund request:', err);
      onShowNotification('Failed to submit request. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Refund Request</h2>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase mb-1">Course Title</label>
              <input
                type="text"
                value={courseTitle}
                readOnly
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
            
            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase mb-1">Refund Amount</label>
              <div className="relative">
                <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={amount}
                  readOnly
                  className="w-full bg-slate-950 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-white text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase mb-1">bKash/Nagad Number</label>
              <input
                type="text"
                value={bkashNumber}
                onChange={(e) => setBkashNumber(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-amber-500/50 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase mb-1">Reason for Refund</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please tell us why you're requesting a refund..."
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-amber-500/50 outline-none h-24 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Submitting...</span>
              ) : (
                <>
                  <Send size={16} />
                  <span>Submit Request</span>
                </>
              )}
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
