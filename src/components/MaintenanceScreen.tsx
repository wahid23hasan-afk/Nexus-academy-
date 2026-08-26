import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Wrench, 
  ShieldAlert, 
  RefreshCw, 
  Clock, 
  LogOut, 
  Terminal,
  Activity
} from 'lucide-react';
import { SystemSettings } from '../services/systemSettingsService';

interface MaintenanceScreenProps {
  settings: SystemSettings;
  userEmail?: string;
  onLogout?: () => void;
  onRefresh?: () => void;
}

export function MaintenanceScreen({
  settings,
  userEmail,
  onLogout,
  onRefresh
}: MaintenanceScreenProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckMessage, setLastCheckMessage] = useState<string | null>(null);

  const handleCheckStatus = () => {
    setIsChecking(true);
    setLastCheckMessage(null);

    setTimeout(() => {
      setIsChecking(false);
      if (onRefresh) onRefresh();
      setLastCheckMessage('মেইনটেনেন্স কার্যক্রম এখনো চলমান রয়েছে... (Maintenance is still in progress)');
      setTimeout(() => setLastCheckMessage(null), 4000);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-[#030712]/95 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 w-full h-full overflow-y-auto">
      {/* Background Subtle Glowing Halo */}
      <div className="absolute -top-20 -left-20 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-[#39FF14]/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-lg bg-[#080d1a]/95 backdrop-blur-2xl border border-amber-500/30 shadow-[0_0_60px_rgba(245,158,11,0.15)] rounded-3xl p-5 sm:p-7 text-center space-y-5 my-auto relative overflow-hidden"
      >
        {/* Top Floating Cyber Strip */}
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5 font-mono text-[10px] text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping inline-block" />
            <span className="text-amber-400 font-bold tracking-wider">SYSTEM STATUS: MAINTENANCE ACTIVE</span>
          </div>
          <div className="flex items-center space-x-1.5 text-slate-500">
            <Terminal size={12} />
            <span>NEXUS ENGINE v4.2</span>
          </div>
        </div>

        {/* Central Animated Illustration / Icon */}
        <div className="relative flex items-center justify-center py-2">
          {/* Outer Pulsing Rotating Glow Ring */}
          <div className="absolute w-24 h-24 sm:w-28 sm:h-28 rounded-full border border-amber-500/30 border-dashed animate-spin [animation-duration:15s]" />
          <div className="absolute w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-amber-500/10 blur-xl animate-pulse" />
          
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-amber-950/80 via-slate-900 to-black border-2 border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.3)] flex items-center justify-center text-amber-400">
            <Wrench size={32} className="animate-bounce [animation-duration:2.5s]" />
            
            {/* Tiny Corner Badge */}
            <span className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-black border border-amber-500/60 text-amber-400">
              <ShieldAlert size={12} />
            </span>
          </div>
        </div>

        {/* Title & Badge */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-mono font-semibold tracking-wide">
            <Activity size={12} className="animate-pulse text-amber-400" />
            <span>সিস্টেম রক্ষণাবেক্ষণ চলছে • SCHEDULED UPGRADE</span>
          </div>

          <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
            {settings.maintenanceTitle || 'System Maintenance In Progress'}
          </h2>
        </div>

        {/* Detailed Message Box */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-black/40 border border-white/10 text-slate-300 text-xs sm:text-sm leading-relaxed text-left space-y-2.5 font-sans">
          <p className="whitespace-pre-wrap">
            {settings.maintenanceMessage || 'আমাদের প্ল্যাটফর্মে প্রয়োজনীয় সিস্টেম আপগ্রেড ও রক্ষণাবেক্ষণ কার্যক্রম চলছে। শিক্ষার্থীদের নিরবচ্ছিন্ন ও দ্রুততর সেবা নিশ্চিত করতে আমাদের টিম কাজ করছে। খুব শীঘ্রই সব কিছু স্বাভাবিক হয়ে যাবে।'}
          </p>

          {/* Estimated Time Badge */}
          {settings.estimatedEndTime && (
            <div className="flex items-center space-x-2 pt-2 border-t border-white/5 text-amber-300 text-xs font-mono">
              <Clock size={14} className="text-amber-400 shrink-0" />
              <span>আনুমানিক সময় (Estimated Duration): <strong className="text-white font-bold">{settings.estimatedEndTime}</strong></span>
            </div>
          )}
        </div>

        {/* User Session Info if student was logged in */}
        {userEmail && (
          <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] font-mono text-slate-400">
            <span>Logged in as: <strong className="text-slate-200">{userEmail}</strong></span>
            {onLogout && (
              <button
                onClick={onLogout}
                className="flex items-center space-x-1 text-red-400 hover:text-red-300 transition-colors cursor-pointer"
              >
                <LogOut size={12} />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        )}

        {/* Real-time Status Feedback Alert */}
        {lastCheckMessage && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono"
          >
            {lastCheckMessage}
          </motion.div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-center pt-1">
          {/* Check Status Button */}
          <button
            onClick={handleCheckStatus}
            disabled={isChecking}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={isChecking ? 'animate-spin' : ''} />
            <span>{isChecking ? 'চেক করা হচ্ছে...' : 'Check Live Status'}</span>
          </button>
        </div>

        {/* Footer Note */}
        <p className="text-[10px] font-mono text-slate-500 pt-1">
          জরুরী প্রয়োজনে যোগাযোগ করুন: <a href="mailto:support@nexus.edu" className="text-slate-400 underline hover:text-slate-200">support@nexus.edu</a>
        </p>
      </motion.div>
    </div>
  );
}
