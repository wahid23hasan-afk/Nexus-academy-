import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Sparkles, Award, Lock, CheckCircle2 } from 'lucide-react';

interface HolographicCertSealProps {
  serialNumber?: string;
  studentName?: string;
  issueDate?: string;
  className?: string;
}

export function HolographicCertSeal({
  serialNumber = 'NEXUS-VERIFIED-AUTH-2026',
  studentName,
  issueDate,
  className = ''
}: HolographicCertSealProps) {
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    // Calculate rotation (-15 to 15 degrees)
    setRotate({
      x: -(y / rect.height) * 30,
      y: (x / rect.width) * 30
    });
  };

  const handleMouseLeave = () => {
    setRotate({ x: 0, y: 0 });
    setIsHovered(false);
  };

  return (
    <div className={`perspective-1000 ${className}`}>
      <motion.div
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        animate={{
          rotateX: rotate.x,
          rotateY: rotate.y,
          scale: isHovered ? 1.05 : 1
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="relative w-40 h-40 rounded-full p-1 cursor-pointer select-none group"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Holographic Rainbow Metallic Edge */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 via-cyan-400 via-[#39FF14] to-yellow-300 animate-spin-slow opacity-80 blur-sm group-hover:opacity-100 transition-opacity" />

        {/* Inner Seal Body */}
        <div className="relative w-full h-full rounded-full bg-[#070c18] border-2 border-amber-400/80 p-3 flex flex-col items-center justify-center text-center shadow-[0_0_30px_rgba(245,158,11,0.25)] overflow-hidden">
          {/* Light Glare Reflection Layer */}
          <div
            className="absolute inset-0 pointer-events-none opacity-40 transition-opacity duration-300"
            style={{
              background: `radial-gradient(circle at ${50 + rotate.y * 2}% ${50 - rotate.x * 2}%, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 60%)`
            }}
          />

          {/* Starburst Metallic Ring */}
          <div className="absolute inset-1 rounded-full border border-dashed border-amber-400/40 pointer-events-none animate-spin-slow" style={{ animationDuration: '30s' }} />

          {/* Center Emblem */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 p-0.5 mb-1 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.5)]">
              <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                <Award size={20} className="text-amber-400 animate-pulse" />
              </div>
            </div>

            <div className="flex items-center space-x-1 text-[8px] font-mono font-black uppercase text-amber-300 tracking-wider">
              <ShieldCheck size={10} className="text-[#39FF14]" />
              <span>OFFICIAL SEAL</span>
            </div>

            <p className="text-[7px] font-mono text-slate-400 tracking-tighter mt-0.5 truncate max-w-[110px]">
              {serialNumber}
            </p>

            <div className="mt-1 px-1.5 py-0.5 bg-[#39FF14]/10 border border-[#39FF14]/40 rounded-full flex items-center space-x-1">
              <CheckCircle2 size={8} className="text-[#39FF14]" />
              <span className="text-[7px] font-mono font-bold text-[#39FF14] uppercase">VERIFIED AUTHENTIC</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
