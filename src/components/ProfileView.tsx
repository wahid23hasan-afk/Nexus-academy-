import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Award, Shield, CheckCircle2, ChevronRight, LogOut, Settings, HelpCircle, UserCheck, Flame, Trophy, Share2, Mail, Compass, Star, ShieldCheck, MessageSquare, Clock, CreditCard, XCircle, AlertTriangle } from 'lucide-react';
import { auth, db } from '../services/firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { GamificationSummary } from './GamificationDashboard';
import { courseService } from '../services/courseService';
import { progressService } from '../services/progressService';

interface ProfileViewProps {
  userProfile: any;
  onLogout: () => void;
  onShowNotification: (message: string, type: 'success' | 'error') => void;
  onOpenRewards: () => void;
  onNavigate: (route: string) => void;
}

export function ProfileView({ userProfile, onLogout, onShowNotification, onOpenRewards, onNavigate }: ProfileViewProps) {
  const [approvalStatus, setApprovalStatus] = useState<'Approved' | 'Pending' | 'Rejected'>('Approved');
  const [rejectedCount, setRejectedCount] = useState<number>(0);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [approvedCount, setApprovedCount] = useState<number>(0);

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

        const rejNum = purchases.filter(p => p.status === 'rejected' || p.status === 'failed').length;
        const pendNum = purchases.filter(p => p.status === 'pending').length;
        const appNum = purchases.filter(p => p.status === 'approved' || p.status === 'success' || p.status === 'active').length;

        setRejectedCount(rejNum);
        setPendingCount(pendNum);
        setApprovedCount(appNum);

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
    <div className="flex-1 overflow-y-auto pb-24 space-y-4 pt-4 px-2">
      {/* Profile Header */}
      <div className="glass-panel p-5 rounded-2xl border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#39FF14]/10 rounded-full blur-[50px] -mr-10 -mt-10 pointer-events-none"></div>
        <div className="flex items-center space-x-4 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-[#39FF14]/30 overflow-hidden flex items-center justify-center shadow-[0_0_15px_rgba(57,255,20,0.15)] shrink-0">
            {userProfile?.photoURL ? (
              <img src={userProfile.photoURL || undefined} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <User size={32} className="text-[#39FF14] drop-shadow-[0_0_8px_rgba(57,255,20,0.5)]" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center flex-wrap gap-1.5">
              <h2 className="text-lg font-bold text-white flex items-center">
                {userProfile?.fullName || 'Scholar'}
              </h2>
              {userProfile?.username && <span className="bg-[#39FF14]/20 text-[#39FF14] text-[9px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider hidden sm:inline-block">Pro Member</span>}
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">@{userProfile?.username || 'user'}</p>
            <div className="flex items-center flex-wrap gap-2 mt-2">
              {/* Approval Status Badge */}
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold flex items-center border transition-all ${
                approvalStatus === 'Approved'
                  ? 'bg-[#39FF14]/15 border-[#39FF14]/40 text-[#39FF14] shadow-[0_0_10px_rgba(57,255,20,0.2)]'
                  : approvalStatus === 'Pending'
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)] animate-pulse'
                  : 'bg-red-500/20 border-red-500/40 text-red-300 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
              }`}>
                {approvalStatus === 'Approved' ? (
                  <ShieldCheck size={11} className="text-[#39FF14] mr-1" />
                ) : approvalStatus === 'Pending' ? (
                  <Clock size={11} className="text-amber-400 mr-1" />
                ) : (
                  <XCircle size={11} className="text-red-400 mr-1" />
                )}
                {approvalStatus === 'Approved' ? 'Approved Student' : approvalStatus === 'Pending' ? 'Pending Approval' : 'Payment Rejected'}
              </span>

              <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded text-slate-300 font-mono flex items-center">
                <CheckCircle2 size={10} className="text-[#39FF14] mr-1" />
                Verified
              </span>
              <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded text-slate-300 font-mono flex items-center">
                <Mail size={10} className="text-slate-400 mr-1" />
                {auth.currentUser?.email}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Student Approval / Payment Status Alert Card */}
      <div className={`p-4 rounded-2xl border transition-all relative overflow-hidden ${
        approvalStatus === 'Rejected'
          ? 'bg-gradient-to-r from-red-950/60 via-slate-900/80 to-slate-950/90 border-red-500/40'
          : approvalStatus === 'Pending'
          ? 'bg-gradient-to-r from-amber-950/40 via-slate-900/60 to-slate-900/40 border-amber-500/30'
          : 'bg-gradient-to-r from-emerald-950/40 via-slate-900/60 to-slate-900/40 border-[#39FF14]/30'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              approvalStatus === 'Rejected'
                ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                : approvalStatus === 'Pending'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                : 'bg-[#39FF14]/10 text-[#39FF14] border border-[#39FF14]/30'
            }`}>
              {approvalStatus === 'Rejected' ? <XCircle size={20} /> : approvalStatus === 'Pending' ? <Clock size={20} /> : <ShieldCheck size={20} />}
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Payment & Access Status</span>
              <h4 className="text-sm font-bold text-white mt-0.5">
                {approvalStatus === 'Rejected' ? 'Payment Submission Rejected' : approvalStatus === 'Pending' ? 'Enrollment Under Review' : 'Verified Student Account'}
              </h4>
            </div>
          </div>
          <button
            onClick={() => onNavigate('payment-history')}
            className={`px-3 py-1.5 rounded-full text-xs font-mono font-bold flex items-center space-x-1 border transition-all cursor-pointer ${
              approvalStatus === 'Rejected'
                ? 'bg-red-500/20 text-red-300 border-red-500/40 hover:bg-red-500/30 animate-pulse'
                : approvalStatus === 'Pending'
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                : 'bg-[#39FF14]/20 text-[#39FF14] border-[#39FF14]/40 hover:bg-[#39FF14]/30'
            }`}
          >
            <span>{approvalStatus === 'Rejected' ? 'View & Retry' : 'View Status'}</span>
            <ChevronRight size={12} />
          </button>
        </div>
        <p className="text-[11px] text-slate-300 font-mono mt-2.5 pt-2 border-t border-white/5">
          {approvalStatus === 'Rejected'
            ? '❌ Admin was unable to verify your payment transaction ID. Click "View & Retry" to re-submit correct details.'
            : approvalStatus === 'Pending'
            ? '⌛ Your course enrollment is pending admin verification. Access will be unlocked automatically upon approval.'
            : '✓ Your student profile and course access are fully approved by admin.'}
        </p>
      </div>

      {/* Gamification Component */}
      <section className="relative">
        <GamificationSummary onOpenRewards={onOpenRewards} />
      </section>

      {/* Profile Sections */}
      <div className="space-y-3">
        {/* Payments & Enrollments Section */}
        <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
          <div className="p-3 border-b border-white/5 bg-white/[0.02]">
            <h3 className="text-xs font-mono font-bold text-slate-400 tracking-wider flex items-center">
              <CreditCard size={14} className="mr-2 text-[#39FF14]" />
              PAYMENTS & ENROLLMENTS
            </h3>
          </div>
          <div className="divide-y divide-white/5">
            <button
              onClick={() => onNavigate('payment-history')}
              className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors group cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 ${
                  rejectedCount > 0 ? 'bg-red-500/10 text-red-400' : 'bg-[#39FF14]/10 text-[#39FF14]'
                }`}>
                  <CreditCard size={16} />
                </div>
                <div className="text-left">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-slate-200 block">Payment & Order Status</span>
                    {rejectedCount > 0 && (
                      <span className="px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full text-[9px] font-mono font-bold animate-pulse">
                        Rejected ({rejectedCount})
                      </span>
                    )}
                    {pendingCount > 0 && rejectedCount === 0 && (
                      <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-[9px] font-mono font-bold">
                        Pending ({pendingCount})
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">View payment verification statuses, receipts & retry</span>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-500 group-hover:text-white transition-colors" />
            </button>
          </div>
        </div>

        {/* My Content & Community Section */}
        <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
          <div className="p-3 border-b border-white/5 bg-white/[0.02]">
            <h3 className="text-xs font-mono font-bold text-slate-400 tracking-wider flex items-center">
              <Compass size={14} className="mr-2 text-[#39FF14]" />
              MY CONTENT & COMMUNITY
            </h3>
          </div>
          <div className="divide-y divide-white/5">
            <button
              onClick={() => onNavigate('certificates')}
              className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors group cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                  <Award size={16} />
                </div>
                <div className="text-left">
                  <span className="text-sm font-medium text-slate-200 block">My Certificates</span>
                  <span className="text-[10px] text-slate-400 font-mono">View & download earned course certificates</span>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-500 group-hover:text-white transition-colors" />
            </button>

            <button
              onClick={() => onNavigate('community')}
              className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors group cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-[#39FF14]/10 flex items-center justify-center text-[#39FF14] group-hover:scale-110 transition-transform">
                  <MessageSquare size={16} />
                </div>
                <div className="text-left">
                  <span className="text-sm font-medium text-slate-200 block">Nexus Community</span>
                  <span className="text-[10px] text-slate-400 font-mono">Ask questions, discuss & connect with peers</span>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-500 group-hover:text-white transition-colors" />
            </button>
          </div>
        </div>

        {/* Settings & Support */}
        <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
          <div className="p-3 border-b border-white/5 bg-white/[0.02]">
            <h3 className="text-xs font-mono font-bold text-slate-400 tracking-wider flex items-center">
              <Settings size={14} className="mr-2" />
              PREFERENCES
            </h3>
          </div>
          <div className="divide-y divide-white/5">
            <button onClick={() => onNavigate('account-details')}
            className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors group">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                  <UserCheck size={16} />
                </div>
                <span className="text-sm font-medium text-slate-200">Account Details</span>
              </div>
              <ChevronRight size={16} className="text-slate-500 group-hover:text-white transition-colors" />
            </button>
            <button onClick={() => onNavigate('privacy-security')}
            className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors group">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                  <Shield size={16} />
                </div>
                <span className="text-sm font-medium text-slate-200">Privacy & Security</span>
              </div>
              <ChevronRight size={16} className="text-slate-500 group-hover:text-white transition-colors" />
            </button>
            <button onClick={() => onNavigate('help-support')}
            className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors group cursor-pointer">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                  <HelpCircle size={16} />
                </div>
                <span className="text-sm font-medium text-slate-200">Help & Support</span>
              </div>
              <ChevronRight size={16} className="text-slate-500 group-hover:text-white transition-colors" />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 pb-8 space-y-3">
          <button
            onClick={() => {
              const url = window.location.origin + '?ref=' + auth.currentUser?.uid;
              navigator.clipboard.writeText(url);
              onShowNotification('Referral link copied to clipboard!', 'success');
            }}
            className="w-full py-3.5 bg-[#39FF14]/10 hover:bg-[#39FF14]/20 border border-[#39FF14]/30 rounded-xl text-[#39FF14] text-sm font-bold tracking-wide transition-all shadow-[0_0_15px_rgba(57,255,20,0.1)] flex items-center justify-center space-x-2 group"
          >
            <Share2 size={16} className="group-hover:scale-110 transition-transform" />
            <span>INVITE FRIENDS</span>
          </button>
          
          <button 
            onClick={onLogout}
            className="w-full py-3.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm font-bold tracking-wide transition-all flex items-center justify-center space-x-2 group"
          >
            <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span>SECURE LOGOUT</span>
          </button>
        </div>
      </div>
    </div>
  );
}

