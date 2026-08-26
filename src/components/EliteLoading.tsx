import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Cpu } from 'lucide-react';

export interface EliteLoadingProps {
  label?: string;
  subLabel?: string;
  variant?: 'full' | 'card' | 'inline';
  compact?: boolean;
}

export function RadarScannerGraphic({ size = 120 }: { size?: number }) {
  return (
    <div 
      className="relative flex items-center justify-center rounded-full bg-slate-950/80 p-2 shadow-[0_0_35px_rgba(0,240,255,0.2)] border border-[#00f0ff]/30 select-none overflow-hidden"
      style={{ width: size, height: size }}
    >
      {/* Concentric Radar Rings */}
      <div className="absolute inset-1.5 rounded-full border border-[#00f0ff]/30 pointer-events-none" />
      <div className="absolute inset-5 rounded-full border border-[#00f0ff]/25 pointer-events-none" />
      <div className="absolute inset-9 rounded-full border border-[#00f0ff]/20 pointer-events-none" />
      <div className="absolute inset-[3.2rem] rounded-full border border-[#00f0ff]/15 pointer-events-none" />

      {/* Crosshair Axes */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-25">
        <div className="w-full h-[1px] bg-[#00f0ff]" />
        <div className="h-full w-[1px] bg-[#00f0ff] absolute" />
      </div>

      {/* Rotating Radar Scanner Sweep */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-1.5 rounded-full overflow-hidden pointer-events-none flex items-center justify-center"
      >
        {/* Conic Gradient Fan trailing behind the needle */}
        <div 
          className="w-full h-full rounded-full"
          style={{
            background: `conic-gradient(from 270deg at 50% 50%, transparent 0deg, rgba(0, 240, 255, 0.05) 40deg, rgba(0, 240, 255, 0.25) 70deg, rgba(0, 240, 255, 0.65) 90deg, transparent 90deg)`
          }}
        />

        {/* Radar Needle (leading edge at 12 o'clock) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[2px] h-1/2 bg-gradient-to-t from-[#00f0ff]/30 via-[#00f0ff] to-white shadow-[0_0_12px_#00f0ff]">
          {/* Glowing Beacon at Tip */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white shadow-[0_0_8px_#00f0ff]" />
        </div>
      </motion.div>

      {/* Outer Pulse Ring */}
      <motion.div
        animate={{ scale: [0.96, 1.05, 0.96], opacity: [0.25, 0.6, 0.25] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute inset-0 rounded-full border border-[#00f0ff]/50 pointer-events-none"
      />

      {/* Central Core Glowing Dot */}
      <div className="relative z-10 w-3.5 h-3.5 rounded-full bg-[#00f0ff] shadow-[0_0_16px_#00f0ff] border-2 border-white flex items-center justify-center">
        <div className="w-1 h-1 rounded-full bg-white animate-ping" />
      </div>
    </div>
  );
}

export function EliteLoading({
  label = "SCANNING COURSES & ACADEMIC DATA",
  subLabel = "STREAMING REALTIME SCHOLAR MATRIX",
  variant = 'full',
  compact = false
}: EliteLoadingProps) {
  const [statusIndex, setStatusIndex] = useState(0);

  const statusList = [
    label,
    "SYNCHRONIZING FIRESTORE RADAR NODES",
    "VERIFYING REALTIME ENROLLMENTS",
    "OPTIMIZING SCHOLAR METRICS"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % statusList.length);
    }, 2400);
    return () => clearInterval(interval);
  }, [label]);

  if (variant === 'card' || compact) {
    return (
      <div className="w-full py-6 px-4 flex flex-col items-center justify-center space-y-3.5 rounded-3xl bg-slate-950/70 border border-[#00f0ff]/20 backdrop-blur-xl relative overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        {/* Radar Sweeping Animation */}
        <RadarScannerGraphic size={80} />

        {/* Status text */}
        <div className="text-center space-y-1">
          <p className="text-[10px] font-mono font-bold tracking-widest text-[#00f0ff] uppercase drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]">
            {label}
          </p>
          {subLabel && (
            <p className="text-[8.5px] font-mono text-slate-400 tracking-wider uppercase">
              {subLabel}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className="flex items-center justify-center space-x-3 py-4 px-2">
        <RadarScannerGraphic size={48} />
        <div className="space-y-0.5 text-left">
          <p className="text-[10px] font-mono font-bold text-[#00f0ff] tracking-wider uppercase">
            {label}
          </p>
          <p className="text-[8.5px] font-mono text-slate-400 uppercase">
            {subLabel}
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="flex-1 min-h-[340px] w-full flex flex-col items-center justify-center p-6 space-y-6 relative select-none"
    >
      {/* 1. Ambient Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />

      {/* 2. Central Radar Scanner Graphic */}
      <RadarScannerGraphic size={130} />

      {/* 3. Glassmorphic Motion Status Control Card */}
      <motion.div 
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="w-full max-w-sm px-5 py-4 rounded-3xl bg-slate-900/60 border border-[#00f0ff]/20 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.6)] space-y-3 relative overflow-hidden"
      >
        {/* Specular Light Sweep */}
        <motion.div 
          initial={{ x: '-100%' }}
          animate={{ x: '200%' }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00f0ff]/10 to-transparent pointer-events-none"
        />

        {/* Progress Track */}
        <div className="w-full h-1.5 bg-slate-950/90 rounded-full border border-white/10 overflow-hidden relative shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] p-[1px]">
          <motion.div 
            animate={{ x: ['-100%', '0%', '100%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="h-full w-2/3 bg-gradient-to-r from-[#00f0ff] via-cyan-400 to-emerald-400 rounded-full shadow-[0_0_12px_#00f0ff]"
          />
        </div>

        {/* Live Cycled Status Label */}
        <div className="flex flex-col items-center text-center space-y-1 min-h-[36px] justify-center">
          <AnimatePresence mode="wait">
            <motion.div 
              key={statusIndex}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="flex items-center space-x-2"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#00f0ff] shadow-[0_0_8px_#00f0ff] animate-ping" />
              <p className="text-[11px] font-mono font-bold tracking-widest text-[#00f0ff] drop-shadow-[0_0_8px_rgba(0,240,255,0.6)] uppercase">
                {statusList[statusIndex] || label}
              </p>
            </motion.div>
          </AnimatePresence>

          <p className="text-[9px] font-mono tracking-wider text-slate-400 uppercase">
            {subLabel}
          </p>
        </div>

        {/* Real-time Frequency Equalizer */}
        <div className="flex items-center justify-center space-x-1.5 pt-1 border-t border-white/5">
          <div className="flex items-center space-x-1">
            <Cpu size={11} className="text-cyan-400/80 mr-1" />
            <span className="text-[9px] font-mono text-slate-400 mr-2">RADAR SIGNAL PIPELINE</span>
          </div>
          <div className="flex items-center space-x-1">
            {[0.4, 0.9, 0.3, 1, 0.6, 0.8, 0.5, 0.9, 0.2, 0.7].map((heightVal, idx) => (
              <motion.div
                key={idx}
                animate={{ height: ['3px', `${14 * heightVal}px`, '3px'] }}
                transition={{
                  duration: 0.5 + idx * 0.12,
                  repeat: Infinity,
                  repeatType: 'mirror',
                  ease: 'easeInOut'
                }}
                className="w-1 rounded-full bg-gradient-to-t from-[#00f0ff] to-cyan-300 shadow-[0_0_4px_#00f0ff]"
              />
            ))}
          </div>
        </div>
      </motion.div>

      {/* Micro Footnote */}
      <div className="flex items-center space-x-2 text-[9px] font-mono text-slate-400 tracking-widest uppercase">
        <ShieldCheck size={12} className="text-[#00f0ff]" />
        <span>NEXUS RADAR SCANNER • ENCRYPTED</span>
      </div>
    </motion.div>
  );
}

export default EliteLoading;
