import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Award, 
  Sparkles, 
  ArrowRight, 
  BookOpen, 
  Download, 
  Printer, 
  Share2, 
  Lock, 
  CheckCircle,
  Trophy
} from 'lucide-react';
import { Certificate } from '../types/certificate';

interface CertificateCelebrationViewProps {
  courseName: string;
  certificate: Certificate | null;
  onClose: () => void;
  onBrowseCourses: () => void;
  onDownloadCertificate: () => void;
}

export function CertificateCelebrationView({
  courseName,
  certificate,
  onClose,
  onBrowseCourses,
  onDownloadCertificate
}: CertificateCelebrationViewProps) {
  const [particles, setParticles] = useState<any[]>([]);

  // Generate confetti coordinates
  useEffect(() => {
    const arr = Array.from({ length: 60 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100, // percentage width
      y: -20 - Math.random() * 50, // start above view
      rotation: Math.random() * 360,
      scale: 0.4 + Math.random() * 0.8,
      color: ['#39FF14', '#10B981', '#059669', '#FBBF24', '#3B82F6', '#EC4899'][Math.floor(Math.random() * 6)],
      speed: 1.5 + Math.random() * 3,
      delay: Math.random() * 1.5
    }));
    setParticles(arr);
  }, []);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-[#030712]/95 backdrop-blur-xl flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto w-screen h-[100dvh] top-0 left-0">
      
      {/* Confetti canvas simulation inside view overlay */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {particles.map(p => (
          <motion.div
            key={p.id}
            initial={{ y: p.y + '%', x: p.x + 'vw', rotate: 0 }}
            animate={{ 
              y: '120vh', 
              x: `${p.x + (Math.sin(p.id) * 15)}vw`, 
              rotate: p.rotation + 720 
            }}
            transition={{ 
              duration: p.speed + 3, 
              delay: p.delay,
              repeat: Infinity,
              ease: 'linear'
            }}
            style={{
              position: 'absolute',
              width: `${10 * p.scale}px`,
              height: `${10 * p.scale}px`,
              backgroundColor: p.color,
              borderRadius: p.id % 3 === 0 ? '50%' : p.id % 3 === 1 ? '0%' : '20%',
              opacity: 0.8
            }}
          />
        ))}
      </div>

      {/* Main card box container */}
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 100 }}
        className="w-full max-w-2xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border border-[#39FF14]/30 rounded-3xl p-6 md:p-10 shadow-[0_0_50px_rgba(57,255,20,0.15)] text-center relative overflow-hidden"
      >
        
        {/* Ambient background accent rings */}
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-[#39FF14]/5 rounded-full blur-[100px]" />
        <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px]" />

        {/* 1. Animated Golden Trophy Header */}
        <div className="relative mb-6 flex justify-center">
          <motion.div
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', delay: 0.2, damping: 12 }}
            className="w-24 h-24 rounded-full bg-[#39FF14]/10 border-2 border-[#39FF14] flex items-center justify-center shadow-[0_0_25px_rgba(57,255,20,0.3)]"
          >
            <Trophy className="text-[#39FF14] animate-bounce" size={44} />
          </motion.div>
          
          {/* Sparkles design accents around trophy */}
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 pointer-events-none flex items-center justify-center"
          >
            <Sparkles className="text-amber-400 absolute top-4 left-24 animate-pulse" size={16} />
            <Sparkles className="text-[#39FF14] absolute bottom-4 right-24 animate-pulse" size={14} />
          </motion.div>
        </div>

        {/* 2. Congratulations Message */}
        <div className="space-y-3 relative z-10">
          <span className="text-[10px] font-mono font-bold tracking-widest text-[#39FF14] uppercase bg-[#39FF14]/10 px-3.5 py-1 rounded-full border border-[#39FF14]/20 inline-block">
            Course Fully Completed 🎯 100% Passed
          </span>
          <h1 className="text-2xl md:text-4xl font-serif font-extrabold text-white leading-tight tracking-tight">
            CONGRATULATIONS!
          </h1>
          <p className="text-xs md:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
            You have successfully completed every required curriculum chapter, submitted code workflows, and mastered all exam questions for:
          </p>
          <h2 className="text-md md:text-xl font-bold text-[#39FF14] uppercase tracking-wide px-4 py-2 bg-white/5 border border-white/10 rounded-2xl max-w-md mx-auto">
            {courseName}
          </h2>
        </div>

        {/* 3. Certificate Unlocked Card Animation */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 bg-slate-900/60 border border-white/10 rounded-2xl p-5 max-w-md mx-auto flex items-center space-x-4 hover:border-[#39FF14]/40 transition-all duration-300 shadow-md group"
        >
          <div className="w-14 h-14 bg-[#39FF14]/10 rounded-xl flex items-center justify-center border border-[#39FF14]/20 group-hover:bg-[#39FF14]/20 transition-all shrink-0">
            <Award className="text-[#39FF14] animate-pulse" size={26} />
          </div>
          <div className="text-left space-y-1">
            <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider block">GRADUATION CREDENTIAL UNLOCKED</span>
            <h4 className="text-[12.5px] font-bold text-white uppercase group-hover:text-[#39FF14] transition-colors leading-tight">
              Official Academic Certificate
            </h4>
            <p className="text-[10px] text-slate-400 font-sans leading-normal">
              Your cryptographic blockchain secured certificate is processed and ready to be printed or shared.
            </p>
          </div>
        </motion.div>

        {/* 4. Action navigation controls */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 relative z-10">
          {certificate ? (
            <button
              onClick={onDownloadCertificate}
              className="w-full sm:w-auto px-6 py-3 bg-[#39FF14] hover:bg-[#2eff05] text-slate-950 text-xs font-bold uppercase rounded-2xl transition-all shadow-lg flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Award size={14} />
              <span>View & Print Certificate</span>
            </button>
          ) : (
            <div className="flex items-center space-x-2 text-[10px] font-mono text-amber-400">
              <Lock size={12} />
              <span>Certificate is compiling secure ledger keys...</span>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold uppercase rounded-2xl transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <span>Continue Learning</span>
            <ArrowRight size={13} />
          </button>
        </div>

        <div className="mt-4">
          <button
            onClick={onBrowseCourses}
            className="text-[10px] font-mono text-slate-400 hover:text-white transition-colors cursor-pointer uppercase tracking-wider flex items-center justify-center space-x-1 mx-auto"
          >
            <BookOpen size={11} className="mr-0.5" />
            <span>Browse More Advanced Specialties</span>
          </button>
        </div>

      </motion.div>
    </div>,
    document.body
  );
}
