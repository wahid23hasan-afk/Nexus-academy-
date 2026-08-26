import React, { useState, useEffect } from 'react';
import { ChevronLeft, User, Mail, Hash, Calendar, Shield, MapPin, CheckCircle2, Clock, ShieldCheck, Copy, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { auth } from '../services/firebase';
import { courseService } from '../services/courseService';
import { progressService } from '../services/progressService';

interface AccountDetailsViewProps {
  onBack: () => void;
  userProfile: any;
}

export const AccountDetailsView: React.FC<AccountDetailsViewProps> = ({ onBack, userProfile }) => {
  const [approvalStatus, setApprovalStatus] = useState<'Approved' | 'Pending' | 'Rejected'>('Approved');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, type: 'email' | 'id') => {
    navigator.clipboard.writeText(text);
    setCopiedId(type);
    setTimeout(() => setCopiedId(null), 2000);
  };

  useEffect(() => {
    const checkApprovalStatus = async () => {
      const userId = auth.currentUser?.uid || userProfile?.username || 'guest_user';
      const userEmail = auth.currentUser?.email || userProfile?.email || userProfile?.username || '';

      try {
        const purchases = await courseService.getUserPurchases(userId, userEmail);
        const myCourses = await progressService.getUserMyCourses(userId, userEmail);

        const hasApproved = purchases.some(p => p.status === 'approved' || p.status === 'success' || p.status === 'active') || myCourses.length > 0;
        const hasPending = purchases.some(p => p.status === 'pending');
        const hasRejected = purchases.some(p => p.status === 'rejected' || p.status === 'failed');

        if (hasRejected && !hasApproved) {
          setApprovalStatus('Rejected');
        } else if (hasPending && !hasApproved) {
          setApprovalStatus('Pending');
        } else if (hasRejected) {
          setApprovalStatus('Rejected');
        } else {
          setApprovalStatus('Approved');
        }
      } catch (e) {
        console.warn('Failed to compute student approval status:', e);
      }
    };

    checkApprovalStatus();

    const handleUpdate = () => {
      checkApprovalStatus();
    };

    window.addEventListener('nexus_purchases_updated', handleUpdate);
    return () => {
      window.removeEventListener('nexus_purchases_updated', handleUpdate);
    };
  }, [userProfile]);

  return (
    <div className="flex-1 flex flex-col pt-2 pb-24 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button 
          onClick={onBack}
          className="flex items-center text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ChevronLeft size={20} />
          <span className="text-sm font-medium ml-1">Back</span>
        </button>
        <h2 className="text-lg font-bold text-white tracking-wide">Account Details</h2>
        <div className="w-16" /> {/* Placeholder for balance */}
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-6 rounded-3xl border border-white/5 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#39FF14]/5 rounded-full blur-3xl" />
        
        <div className="flex flex-col items-center mb-8 relative z-10">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-[#39FF14]/30 flex items-center justify-center overflow-hidden mb-3 shadow-[0_0_15px_rgba(57,255,20,0.1)]">
            {userProfile?.photoURL?.trim() ? (
              <img src={userProfile.photoURL.trim()} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User size={40} className="text-[#39FF14]" />
            )}
          </div>
          <h3 className="text-xl font-bold text-white">{userProfile?.fullName || 'Nexus Scholar'}</h3>
          <p className="text-sm font-mono text-slate-400 mt-0.5">@{userProfile?.username || 'scholar'}</p>
          
          {/* Approval Badge under Header */}
          <div className="mt-3">
            <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold flex items-center space-x-1.5 border ${
              approvalStatus === 'Approved'
                ? 'bg-[#39FF14]/15 text-[#39FF14] border-[#39FF14]/40 shadow-[0_0_10px_rgba(57,255,20,0.2)]'
                : approvalStatus === 'Pending'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)] animate-pulse'
                : 'bg-red-500/20 text-red-300 border-red-500/40 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
            }`}>
              {approvalStatus === 'Approved' ? (
                <ShieldCheck size={13} className="text-[#39FF14]" />
              ) : approvalStatus === 'Pending' ? (
                <Clock size={13} className="text-amber-400" />
              ) : (
                <Clock size={13} className="text-red-400" />
              )}
              <span>Approval Status: {approvalStatus}</span>
            </span>
          </div>
        </div>

        <div className="space-y-4 relative z-10">
          {/* Approval Status Card */}
          <div className="bg-slate-900/50 rounded-xl p-4 flex items-center justify-between border border-white/5">
            <div className="flex items-center space-x-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                approvalStatus === 'Approved' ? 'bg-[#39FF14]/10 text-[#39FF14]' : approvalStatus === 'Pending' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'
              }`}>
                {approvalStatus === 'Approved' ? <ShieldCheck size={16} /> : <Clock size={16} />}
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-slate-500">Approval Status</span>
                <span className="text-sm font-medium text-slate-200">
                  {approvalStatus === 'Approved' ? 'Approved Student' : approvalStatus === 'Pending' ? 'Pending Verification' : 'Payment Rejected'}
                </span>
              </div>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold flex items-center space-x-1 border ${
              approvalStatus === 'Approved'
                ? 'bg-[#39FF14]/10 text-[#39FF14] border-[#39FF14]/30'
                : approvalStatus === 'Pending'
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-red-500/10 text-red-400 border-red-500/30'
            }`}>
              {approvalStatus === 'Approved' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
              <span>{approvalStatus}</span>
            </span>
          </div>

          <div className="bg-slate-900/50 rounded-xl p-4 flex items-center justify-between border border-white/5">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                <Mail size={16} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-slate-500">Email Address</span>
                <span className="text-sm font-medium text-slate-200">{userProfile?.email || 'Registered Email'}</span>
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(userProfile?.email || '', 'email')}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              {copiedId === 'email' ? <Check size={14} className="text-[#39FF14]" /> : <Copy size={14} className="text-slate-400" />}
            </button>
          </div>

          <div className="bg-slate-900/50 rounded-xl p-4 flex items-center justify-between border border-white/5">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                <Hash size={16} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-slate-500">Student ID</span>
                <span className="text-sm font-mono text-slate-200">{userProfile?.uid?.slice(0,8).toUpperCase() || 'NEXUS-01'}</span>
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(userProfile?.uid?.slice(0,8).toUpperCase() || 'NEXUS-01', 'id')}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              {copiedId === 'id' ? <Check size={14} className="text-[#39FF14]" /> : <Copy size={14} className="text-slate-400" />}
            </button>
          </div>

          <div className="bg-slate-900/50 rounded-xl p-4 flex items-center space-x-3 border border-white/5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Calendar size={16} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-slate-500">Joined</span>
              <span className="text-sm font-medium text-slate-200">
                {userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString() : 'Recently'}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
