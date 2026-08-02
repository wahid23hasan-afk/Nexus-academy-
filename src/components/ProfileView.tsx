import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Award, Shield, CheckCircle2, ChevronRight, LogOut, Settings, HelpCircle, UserCheck, Flame, Trophy, Share2, Mail, Compass, Star, ShieldCheck } from 'lucide-react';
import { auth, db } from '../services/firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { GamificationSummary } from './GamificationDashboard';

interface ProfileViewProps {
  userProfile: any;
  onLogout: () => void;
  onShowNotification: (message: string, type: 'success' | 'error') => void;
  onOpenRewards: () => void;
  onNavigate: (route: string) => void;
  onOpenAdminPortal?: () => void;
}

export function ProfileView({ userProfile, onLogout, onShowNotification, onOpenRewards, onNavigate, onOpenAdminPortal }: ProfileViewProps) {
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
            <h2 className="text-lg font-bold text-white flex items-center">
              {userProfile?.fullName || 'Scholar'}
              {userProfile?.username && <span className="ml-2 bg-[#39FF14]/20 text-[#39FF14] text-[9px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider hidden sm:inline-block">Pro Member</span>}
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">@{userProfile?.username || 'user'}</p>
            <div className="flex items-center space-x-2 mt-2">
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

      {/* Gamification Component moved from Discover */}
      <section className="relative">
        <GamificationSummary onOpenRewards={onOpenRewards} />
      </section>

      {/* Profile Sections */}
      <div className="space-y-3">
        
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
            className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors group">
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
