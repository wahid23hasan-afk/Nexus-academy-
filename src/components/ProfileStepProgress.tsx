import React from 'react';
import { motion } from 'motion/react';
import { User, AtSign, Sparkles, Check } from 'lucide-react';

export interface StepItem {
  id: number;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
}

export const PROFILE_STEPS: StepItem[] = [
  { id: 1, label: 'Identity & Avatar', shortLabel: 'Avatar', icon: User },
  { id: 2, label: 'Scholar Handle', shortLabel: 'Credentials', icon: AtSign },
  { id: 3, label: 'Demographics & Review', shortLabel: 'Review', icon: Sparkles },
];

interface ProfileStepProgressProps {
  currentStep: number; // 1-indexed (1, 2, 3)
  onStepClick?: (step: number) => void;
  canNavigateToStep?: (step: number) => boolean;
}

export const ProfileStepProgress: React.FC<ProfileStepProgressProps> = ({
  currentStep,
  onStepClick,
  canNavigateToStep = () => true,
}) => {
  const totalSteps = PROFILE_STEPS.length;
  const stepsRemaining = totalSteps - currentStep;
  const progressPercent = ((currentStep - 1) / (totalSteps - 1)) * 100;

  return (
    <div className="w-full bg-slate-900/60 border border-white/10 rounded-2xl p-4 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] my-3">
      {/* Top Status Row */}
      <div className="flex items-center justify-between mb-3 text-xs">
        <div className="flex items-center space-x-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#39FF14] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#39FF14] shadow-[0_0_8px_#39FF14]" />
          </span>
          <span className="font-mono uppercase tracking-wider text-[#39FF14] font-semibold text-[11px] drop-shadow-[0_0_6px_rgba(57,255,20,0.6)]">
            STEP {currentStep} OF {totalSteps}
          </span>
        </div>

        <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
          {stepsRemaining === 0 ? (
            <span className="text-[#39FF14] font-semibold">FINAL STEP • READY TO ACTIVATE</span>
          ) : (
            <span>
              {stepsRemaining} {stepsRemaining === 1 ? 'STEP' : 'STEPS'} REMAINING
            </span>
          )}
        </div>
      </div>

      {/* Interactive Step Nodes and Progress Line */}
      <div className="relative flex items-center justify-between px-2 pt-1 pb-2">
        {/* Background Track Line */}
        <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-slate-950/80 rounded-full border border-white/5 z-0" />

        {/* Animated Progress Fill Line */}
        <motion.div
          className="absolute left-6 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-[#39FF14] via-[#00F0FF] to-[#39FF14] rounded-full shadow-[0_0_10px_rgba(57,255,20,0.8)] z-0"
          initial={false}
          animate={{
            width: `calc(${progressPercent}% * (100% - 48px) / 100)`,
          }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        />

        {/* Step Nodes */}
        {PROFILE_STEPS.map((step) => {
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          const isUpcoming = currentStep < step.id;
          const isClickable = onStepClick && (isCompleted || isCurrent || canNavigateToStep(step.id));
          const Icon = step.icon;

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center group">
              <button
                type="button"
                onClick={() => isClickable && onStepClick?.(step.id)}
                disabled={!isClickable}
                className={`
                  relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl transition-all duration-300
                  ${isClickable ? 'cursor-pointer' : 'cursor-default'}
                  ${isCompleted 
                    ? 'bg-[#39FF14] text-black shadow-[0_0_16px_rgba(57,255,20,0.6)] scale-100 hover:scale-105' 
                    : isCurrent 
                      ? 'bg-slate-950 border-2 border-[#39FF14] text-[#39FF14] shadow-[0_0_20px_rgba(57,255,20,0.5)] scale-110' 
                      : 'bg-slate-900/90 border border-white/10 text-slate-500 hover:text-slate-400'
                  }
                `}
              >
                {/* Pulsing ring for current step */}
                {isCurrent && (
                  <motion.div
                    className="absolute -inset-1 rounded-2xl border border-[#39FF14]/50 pointer-events-none"
                    animate={{ scale: [1, 1.15, 1], opacity: [0.8, 0, 0.8] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}

                {isCompleted ? (
                  <Check size={18} className="stroke-[3]" />
                ) : (
                  <Icon size={16} />
                )}
              </button>

              {/* Step Label */}
              <span
                className={`
                  mt-2 text-[10px] sm:text-[11px] font-mono tracking-wider transition-colors duration-200 text-center whitespace-nowrap
                  ${isCompleted 
                    ? 'text-slate-300 font-medium' 
                    : isCurrent 
                      ? 'text-[#39FF14] font-bold drop-shadow-[0_0_6px_rgba(57,255,20,0.5)]' 
                      : 'text-slate-500'
                  }
                `}
              >
                {step.shortLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProfileStepProgress;
