import React from 'react';
import { ChevronLeft, Shield, Key, Eye, Lock, Smartphone, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';

interface PrivacySecurityViewProps {
  onBack: () => void;
}

export const PrivacySecurityView: React.FC<PrivacySecurityViewProps> = ({ onBack }) => {
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
        <h2 className="text-lg font-bold text-white tracking-wide">Privacy & Security</h2>
        <div className="w-16" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
          <h3 className="text-sm font-bold text-slate-300 flex items-center">
            <Lock size={16} className="mr-2 text-blue-400" />
            Security Settings
          </h3>
          
          <div className="divide-y divide-white/5">
            <div className="py-3 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-slate-200">Password</span>
                <span className="text-xs text-slate-500">Last changed 30 days ago</span>
              </div>
              <button className="px-4 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-300 transition-colors cursor-pointer border border-white/10">
                Update
              </button>
            </div>
            
            <div className="py-3 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-slate-200">Two-Factor Auth</span>
                <span className="text-xs text-emerald-400 font-mono">Enabled</span>
              </div>
              <button className="px-4 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-300 transition-colors cursor-pointer border border-white/10">
                Manage
              </button>
            </div>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
          <h3 className="text-sm font-bold text-slate-300 flex items-center">
            <Eye size={16} className="mr-2 text-purple-400" />
            Privacy Preferences
          </h3>
          
          <div className="divide-y divide-white/5">
            <div className="py-3 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-slate-200">Profile Visibility</span>
                <span className="text-xs text-slate-500">Public to other students</span>
              </div>
              <div className="w-10 h-5 bg-[#39FF14]/20 rounded-full flex items-center p-0.5 cursor-pointer border border-[#39FF14]/30">
                <div className="w-4 h-4 bg-[#39FF14] rounded-full translate-x-5 shadow-sm" />
              </div>
            </div>
            
            <div className="py-3 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-slate-200">Activity Status</span>
                <span className="text-xs text-slate-500">Show when you are online</span>
              </div>
              <div className="w-10 h-5 bg-slate-800 rounded-full flex items-center p-0.5 cursor-pointer border border-slate-700">
                <div className="w-4 h-4 bg-slate-500 rounded-full shadow-sm" />
              </div>
            </div>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-red-500/20 bg-red-500/5 space-y-3">
          <h3 className="text-sm font-bold text-red-400 flex items-center">
            <AlertTriangle size={16} className="mr-2" />
            Danger Zone
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <button className="w-full py-2.5 rounded-xl border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/10 transition-colors cursor-pointer mt-2">
            Delete Account
          </button>
        </div>
      </motion.div>
    </div>
  );
};
