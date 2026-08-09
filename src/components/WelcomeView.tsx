import React from 'react';
import { motion } from 'motion/react';
import { AppLogo } from './AppLogo';
import { LogIn, UserPlus, ArrowRight } from 'lucide-react';
import { AppView } from '../types/auth';

interface WelcomeViewProps {
  onNavigate: (view: AppView) => void;
}

export const WelcomeView: React.FC<WelcomeViewProps> = ({ onNavigate }) => {
  return (
    <div className="flex-1 flex flex-col justify-between py-6">
      {/* Top spacing / subtle indicator */}
      <div className="h-6" />

      {/* Hero section */}
      <div className="flex flex-col items-center justify-center flex-1 my-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.21, 0.47, 0.32, 0.98] }}
        >
          <AppLogo size="lg" />
        </motion.div>
        
        <motion.p 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
          className="mt-6 text-center text-slate-300 max-w-xs text-sm leading-relaxed font-sans"
        >
          Access world-class study programs, immersive practical cohorts, and elite certifications designed for future leaders.
        </motion.p>

        {/* Floating Glass Accent Features List */}
        <div className="mt-8 w-full space-y-2.5">
          <motion.div 
            initial={{ opacity: 0, x: -16, y: 8 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35, ease: 'easeOut' }}
            className="flex items-center space-x-3 glass-panel-light border border-white/5 rounded-xl px-4 py-3 backdrop-blur-md"
          >
            <span className="w-2 h-2 rounded-full bg-[#39FF14] shadow-[0_0_8px_#39FF14]" />
            <span className="text-xs text-slate-300 font-mono">150+ Professional Masterclasses</span>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, x: 16, y: 8 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45, ease: 'easeOut' }}
            className="flex items-center space-x-3 glass-panel-light border border-white/5 rounded-xl px-4 py-3 backdrop-blur-md"
          >
            <span className="w-2 h-2 rounded-full bg-[#39FF14] shadow-[0_0_8px_#39FF14]" />
            <span className="text-xs text-slate-300 font-mono">1-on-1 Senior Industry Mentorship</span>
          </motion.div>
        </div>
      </div>

      {/* Controls & Buttons */}
      <div className="space-y-3.5 w-full">
        {/* Login Button with Neon fill hover */}
        <motion.button
          id="welcome-login-btn"
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.55, ease: [0.21, 0.47, 0.32, 0.98] }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onNavigate('login')}
          className="
            w-full py-4 px-6 min-h-[52px] rounded-2xl bg-[#39FF14] text-black font-semibold 
            text-base sm:text-sm tracking-wide shadow-[0_4px_20px_rgba(57,255,20,0.25)] 
            hover:shadow-[0_4px_30px_rgba(57,255,20,0.4)] active:scale-[0.98]
            transition-all duration-300 flex items-center justify-center space-x-2 cursor-pointer
          "
        >
          <LogIn size={20} />
          <span>Login to Account</span>
          <ArrowRight size={18} className="ml-1" />
        </motion.button>

        {/* Register Button with elegant outline and glass glow */}
        <motion.button
          id="welcome-register-btn"
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.65, ease: [0.21, 0.47, 0.32, 0.98] }}
          whileHover={{ scale: 1.01, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onNavigate('register')}
          className="
            w-full py-4 px-6 min-h-[52px] rounded-2xl glass-panel-light border border-white/10 
            text-slate-100 font-semibold text-base sm:text-sm tracking-wide hover:border-white/25 active:bg-white/10
            transition-all duration-300 flex items-center justify-center space-x-2 cursor-pointer
          "
        >
          <UserPlus size={20} className="text-[#39FF14]" />
          <span>Create New Account</span>
        </motion.button>

        {/* Footer info text */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.75 }}
          className="text-center text-[11px] text-slate-400 font-mono pt-1"
        >
          By continuing, you agree to our Terms of Intellect.
        </motion.p>
      </div>
    </div>
  );
};
