import React from 'react';
import { ChevronLeft, User, Mail, Hash, Calendar, Shield, MapPin } from 'lucide-react';
import { motion } from 'motion/react';

interface AccountDetailsViewProps {
  onBack: () => void;
  userProfile: any;
}

export const AccountDetailsView: React.FC<AccountDetailsViewProps> = ({ onBack, userProfile }) => {
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
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-[#39FF14]/30 flex items-center justify-center overflow-hidden mb-4 shadow-[0_0_15px_rgba(57,255,20,0.1)]">
            {userProfile?.photoURL ? (
              <img src={userProfile.photoURL || undefined} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User size={40} className="text-[#39FF14]" />
            )}
          </div>
          <h3 className="text-xl font-bold text-white">{userProfile?.fullName || 'Nexus Scholar'}</h3>
          <p className="text-sm font-mono text-slate-400">@{userProfile?.username || 'scholar'}</p>
        </div>

        <div className="space-y-4 relative z-10">
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
            <Shield size={14} className="text-emerald-400" />
          </div>

          <div className="bg-slate-900/50 rounded-xl p-4 flex items-center space-x-3 border border-white/5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
              <Hash size={16} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-slate-500">Student ID</span>
              <span className="text-sm font-mono text-slate-200">{userProfile?.uid?.slice(0,8).toUpperCase() || 'NEXUS-01'}</span>
            </div>
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
