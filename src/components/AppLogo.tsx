import React from 'react';
import { motion } from 'motion/react';
import { GraduationCap, Sparkles } from 'lucide-react';

interface AppLogoProps {
  size?: 'sm' | 'md' | 'lg';
}

export const AppLogo: React.FC<AppLogoProps> = ({ size = 'md' }) => {
  const containerSizes = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
  };

  const iconSizes = {
    sm: 18,
    md: 28,
    lg: 42,
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative">
        {/* Glow effect underneath */}
        <div 
          className={`absolute inset-0 rounded-2xl bg-[#39FF14]/20 blur-md pointer-events-none ${containerSizes[size]}`} 
        />
        
        {/* Main Badge Container */}
        <motion.div
          whileHover={{ scale: 1.05, rotate: [0, -3, 3, 0] }}
          transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          className={`
            ${containerSizes[size]} 
            relative rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-850/90 
            border border-white/10 flex items-center justify-center shadow-lg
          `}
        >
          {/* Neon inner accent ring */}
          <div className="absolute inset-0.5 rounded-[14px] border border-[#39FF14]/10 pointer-events-none" />
          
          <GraduationCap 
            size={iconSizes[size]} 
            className="text-[#39FF14] filter drop-shadow-[0_0_8px_rgba(57,255,20,0.5)]" 
          />
          
          <motion.div
            animate={{ 
              opacity: [0.4, 1, 0.4],
              scale: [0.9, 1.1, 0.9] 
            }}
            transition={{ 
              duration: 3, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="absolute -top-1 -right-1 text-[#39FF14]"
          >
            <Sparkles size={size === 'lg' ? 18 : 12} />
          </motion.div>
        </motion.div>
      </div>

      <div className="mt-4 text-center">
        <h1 className={`font-display font-bold tracking-tight ${size === 'lg' ? 'text-3xl' : 'text-xl'} text-white`}>
          NEXUS<span className="text-[#39FF14] drop-shadow-[0_0_10px_rgba(57,255,20,0.4)]">ACADEMY</span>
        </h1>
        {size === 'lg' && (
          <p className="text-xs text-slate-400 font-mono tracking-widest mt-1 uppercase">
            Elevate Your Intellect
          </p>
        )}
      </div>
    </div>
  );
};
