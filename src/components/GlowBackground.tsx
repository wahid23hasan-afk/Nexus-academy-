import React from 'react';
import { motion } from 'motion/react';

interface GlowBackgroundProps {
  children: React.ReactNode;
}

export const GlowBackground: React.FC<GlowBackgroundProps> = ({ children }) => {
  return (
    <div className="min-h-screen w-full bg-[#050811] flex items-center justify-center p-0 sm:p-6 overflow-hidden relative font-sans text-slate-100 selection:bg-[#39FF14]/30">
      {/* Glow Ambient Circles */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-lime-500/10 blur-[120px] pointer-events-none" />
      
      {/* Animated glowing neon-green blob */}
      <motion.div
        animate={{
          x: [0, 40, -20, 0],
          y: [0, -30, 50, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute top-1/3 left-1/4 w-72 h-72 rounded-full bg-[#39FF14]/5 blur-[90px] pointer-events-none"
      />

      <motion.div
        animate={{
          x: [0, -50, 30, 0],
          y: [0, 40, -20, 0],
          scale: [1, 0.9, 1.05, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full bg-emerald-500/5 blur-[100px] pointer-events-none"
      />

      {/* Grid Pattern overlay with low opacity */}
      <div 
        className="absolute inset-0 opacity-[0.04] pointer-events-none bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:32px_32px]"
        style={{ maskImage: 'radial-gradient(ellipse 70% 50% at 50% 50%, #000 70%, transparent 100%)', WebkitMaskImage: 'radial-gradient(ellipse 70% 50% at 50% 50%, #000 70%, transparent 100%)' }}
      />

      {/* Main interactive frame mimicking high-end smartphone / elegant modal layout on desktop */}
      <div 
        id="app-container"
        className="w-full max-w-md h-screen sm:h-[820px] sm:rounded-[40px] bg-[#090d16]/70 backdrop-blur-[20px] border-0 sm:border border-white/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5),_0_0_50px_-12px_rgba(57,255,20,0.15)] overflow-hidden relative flex flex-col justify-between transition-all duration-300"
      >
        {/* Top glossy camera bar speaker mockup on desktop to elevate mobile aesthetic */}
        <div className="hidden sm:flex absolute top-0 left-0 right-0 h-8 items-center justify-center z-50 pointer-events-none">
          <div className="w-32 h-5 bg-black/80 rounded-b-3xl border-x border-b border-white/5 flex items-center justify-center shadow-[inset_0_-2px_10px_rgba(255,255,255,0.05)]">
            <div className="w-12 h-1 bg-white/10 rounded-full" />
          </div>
        </div>

        {/* Content container */}
        <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden no-scrollbar pt-4 sm:pt-8 pb-6 px-6 relative z-10 scroll-smooth">
          {children}
        </div>

        {/* Subtitle footer credit line keeping minimal, tidy branding */}
        <div className="absolute bottom-1 right-1 opacity-20 pointer-events-none text-[8px] font-mono tracking-wider">
          ACADEMIA.AUTH
        </div>
      </div>
    </div>
  );
};
