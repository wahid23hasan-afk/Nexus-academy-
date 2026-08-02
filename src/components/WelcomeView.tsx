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
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="flex flex-col items-center justify-center flex-1 my-8"
      >
        <AppLogo size="lg" />
        
        <p className="mt-6 text-center text-slate-300 max-w-xs text-sm leading-relaxed font-sans">
          Access world-class study programs, immersive practical cohorts, and elite certifications designed for future leaders.
        </p>

        {/* Floating Glass Accent Features List */}
        <div className="mt-8 w-full space-y-2.5">
          <div className="flex items-center space-x-3 glass-panel-light border border-white/5 rounded-xl px-4 py-3 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-[#39FF14] shadow-[0_0_8px_#39FF14]" />
            <span className="text-xs text-slate-300 font-mono">150+ Professional Masterclasses</span>
          </div>
          <div className="flex items-center space-x-3 glass-panel-light border border-white/5 rounded-xl px-4 py-3 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-[#39FF14] shadow-[0_0_8px_#39FF14]" />
            <span className="text-xs text-slate-300 font-mono">1-on-1 Senior Industry Mentorship</span>
          </div>
        </div>
      </motion.div>

      {/* Controls & Buttons */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
        className="space-y-4 w-full"
      >
        {/* Login Button with Neon fill hover */}
        <motion.button
          id="welcome-login-btn"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onNavigate('login')}
          className="
            w-full py-4 px-6 rounded-2xl bg-[#39FF14] text-black hover-lift font-semibold 
            text-sm tracking-wide shadow-[0_4px_20px_rgba(57,255,20,0.25)] 
            hover:shadow-[0_4px_30px_rgba(57,255,20,0.4)]
            transition-all duration-300 flex items-center justify-center space-x-2 cursor-pointer
          "
        >
          <LogIn size={18} />
          <span>Login to Account</span>
          <ArrowRight size={16} className="ml-1" />
        </motion.button>

        {/* Register Button with elegant outline and glass glow */}
        <motion.button
          id="welcome-register-btn"
          whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onNavigate('register')}
          className="
            w-full py-4 px-6 rounded-2xl glass-panel-light border border-white/10 
            text-slate-200 font-semibold text-sm tracking-wide hover:border-white/25
            transition-all duration-300 flex items-center justify-center space-x-2 cursor-pointer
          "
        >
          <UserPlus size={18} className="text-[#39FF14]" />
          <span>Create New Account</span>
        </motion.button>

        {/* Footer info text */}
        <p className="text-center text-[11px] text-slate-500 font-mono">
          By continuing, you agree to our Terms of Intellect.
        </p>
      </motion.div>
    </div>
  );
};
