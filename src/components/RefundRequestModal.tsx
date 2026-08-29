import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, DollarSign, AlertCircle, Send, HelpCircle, CheckCircle2, Clock, ShieldCheck, ArrowRight } from 'lucide-react';
import { db, auth } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface RefundRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  courseTitle: string;
  amount: number;
  onShowNotification: (message: string, type: 'success' | 'error') => void;
}

const REFUND_REASONS = [
  'Course content not as described / expected',
  'Purchased by mistake / accidental duplicate',
  'Technical issues with video playback or materials',
  'Found alternative course / timing conflict',
  'Quality of teaching / instruction issues',
  'Other (Specify in notes below)'
];

export function RefundRequestModal({
  isOpen,
  onClose,
  courseId,
  courseTitle,
  amount,
  onShowNotification
}: RefundRequestModalProps) {
  const [selectedReason, setSelectedReason] = useState(REFUND_REASONS[0]);
  const [notes, setNotes] = useState('');
  const [bkashNumber, setBkashNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReason) {
      onShowNotification('Please select a reason for the refund.', 'error');
      return;
    }
    if (!bkashNumber.trim()) {
      onShowNotification('Please enter your bKash / Nagad payout number.', 'error');
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
        reason: selectedReason,
        notes: notes.trim(),
        bkashNumber: bkashNumber.trim(),
        status: 'pending',
        createdAt: new Date().toISOString(),
        timestamp: serverTimestamp()
      };

      await addDoc(collection(db, 'refund_requests'), requestData);
      
      onShowNotification('Refund request submitted with pending status.', 'success');
      setNotes('');
      setBkashNumber('');
      onClose();
    } catch (err) {
      console.error('Error submitting refund request to Firestore:', err);
      onShowNotification('Failed to submit refund request. Please try again.', 'error');
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
        className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto w-screen h-[100dvh] top-0 left-0"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl relative"
        >
          <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
            <div className="flex items-center space-x-2">
              <DollarSign size={20} className="text-amber-400" />
              <h2 className="text-lg font-bold text-white font-sans">Request Course Refund</h2>
            </div>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer">
              <X size={20} />
            </button>
          </div>

          {/* STEP-BY-STEP REFUND PROGRESS VISUALIZER */}
          <div className="mb-5 p-3 rounded-xl bg-slate-950 border border-white/10 font-mono text-[10px]">
            <span className="text-slate-400 font-bold uppercase block mb-2 text-[9px] tracking-wider">Refund Process Lifecycle:</span>
            <div className="grid grid-cols-3 gap-1.5 relative">
              <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 flex flex-col items-center text-center space-y-1">
                <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center font-bold text-[10px]">1</div>
                <span className="font-bold text-[9px] leading-tight">Submit Form</span>
                <span className="text-[8px] text-amber-400/80">Current Step</span>
              </div>

              <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 flex flex-col items-center text-center space-y-1">
                <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center font-bold text-[10px]">2</div>
                <span className="font-bold text-[9px] leading-tight">Admin Review</span>
                <span className="text-[8px] text-slate-500">24-48 Hours</span>
              </div>

              <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 flex flex-col items-center text-center space-y-1">
                <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center font-bold text-[10px]">3</div>
                <span className="font-bold text-[9px] leading-tight">Payout Credit</span>
                <span className="text-[8px] text-slate-500">bKash/Nagad</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase mb-1">Course Title</label>
              <input
                type="text"
                value={courseTitle}
                readOnly
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-sans"
              />
            </div>
            
            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase mb-1">Refund Amount (BDT)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">৳</span>
                <input
                  type="text"
                  value={amount}
                  readOnly
                  className="w-full bg-slate-950 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-white text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase mb-1">Select Refund Reason *</label>
              <select
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-sans outline-none focus:border-amber-500/50"
              >
                {REFUND_REASONS.map((r, i) => (
                  <option key={i} value={r} className="bg-slate-900 text-white">
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase mb-1">bKash / Nagad Number for Refund *</label>
              <input
                type="text"
                required
                value={bkashNumber}
                onChange={(e) => setBkashNumber(e.target.value)}
                placeholder="e.g. 01712345678"
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-mono outline-none focus:border-amber-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase mb-1">Additional Notes / Explanation</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Provide any additional details to help our team process your request..."
                rows={3}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-sans outline-none focus:border-amber-500/50 resize-none"
              />
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300 flex items-start space-x-2">
              <AlertCircle size={14} className="shrink-0 mt-0.5 text-amber-400" />
              <span>Refund requests are recorded as <strong>pending</strong> and reviewed by our administration team within 24–48 hours.</span>
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-mono font-bold rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-mono font-bold rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Submitting...</span>
                ) : (
                  <>
                    <Send size={14} />
                    <span>Submit Request</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

