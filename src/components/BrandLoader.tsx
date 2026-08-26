import React from 'react';
import { GraduationCap, Sparkles } from 'lucide-react';

interface BrandLoaderProps {
  label?: string;
  subLabel?: string;
}

export function BrandLoader({ 
  label = "INITIALIZING ACADEMIC MATRIX", 
  subLabel = "AUTHENTICATING SECURE PROTOCOLS" 
}: BrandLoaderProps) {
  return (
    <div 
      id="brand-loader-container"
      className="flex-1 flex flex-col items-center justify-center p-6 space-y-6 select-none animate-fadeIn"
    >
      {/* 1. Futuristic Orbital Cyber Hologram */}
      <div className="relative w-24 h-24 flex items-center justify-center">
        {/* Ambient Neon Back-Glow */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#39FF14]/25 via-[#00F0FF]/20 to-transparent blur-xl animate-pulse" />

        {/* Outer Rotating Segmented Hologram Track */}
        <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#39FF14]/40 animate-[spin_8s_linear_infinite]" />

        {/* Counter-Rotating Glowing Arcs */}
        <div className="absolute inset-1 rounded-full border-2 border-transparent border-t-[#39FF14] border-r-[#00F0FF] animate-[spin_2s_cubic-bezier(0.5,0,0.5,1)_infinite] shadow-[0_0_15px_rgba(57,255,20,0.4)]" />

        {/* Inner High-Speed Cyan Ring */}
        <div className="absolute inset-3 rounded-full border border-transparent border-b-[#00F0FF] border-l-[#39FF14] animate-[spin_1.5s_linear_infinite_reverse]" />

        {/* Central Brand Core Badge with Glassmorphism */}
        <div className="relative w-12 h-12 rounded-xl bg-slate-950/85 border border-[#39FF14]/50 flex items-center justify-center shadow-[0_0_22px_rgba(57,255,20,0.35)] backdrop-blur-md">
          <GraduationCap size={22} className="text-[#39FF14] animate-pulse drop-shadow-[0_0_8px_#39FF14]" />
        </div>
      </div>

      {/* 2. Glassmorphic Fluid Progress Bar Card */}
      <div className="flex flex-col items-center space-y-3 w-full max-w-[240px] px-4 py-3.5 rounded-2xl bg-slate-900/40 border border-white/10 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)]">
        
        {/* Fluid Multi-Stage Neon Glass Track */}
        <div className="w-full h-2 bg-slate-950/90 rounded-full border border-white/10 overflow-hidden relative shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] p-[1px]">
          {/* Base Flowing Neon Gradient Wave */}
          <div className="h-full w-full bg-gradient-to-r from-[#39FF14] via-[#00F0FF] to-[#FFD700] rounded-full animate-fluid-progress animate-neon-glow-pulse" />
          
          {/* Sweeping Specular Glass Shimmer Beam */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-glass-shimmer pointer-events-none" />
        </div>

        {/* 3. Terminal Matrix Status Typography */}
        <div className="flex flex-col items-center space-y-1 w-full text-center">
          <div className="flex items-center justify-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#39FF14] shadow-[0_0_8px_#39FF14] animate-ping" />
            <p className="text-[10px] font-mono font-bold tracking-widest text-[#39FF14] drop-shadow-[0_0_6px_rgba(57,255,20,0.6)]">
              {label}
            </p>
          </div>

          {subLabel && (
            <p className="text-[8.5px] font-mono tracking-wider text-slate-400/80 uppercase">
              {subLabel}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default BrandLoader;
