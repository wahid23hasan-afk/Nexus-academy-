import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Zap } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

export function formatSmartXPNumber(num: number): string {
  if (!num || isNaN(num)) return '0';
  if (num < 1000000) {
    return num.toLocaleString();
  } else if (num < 1000000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num < 1000000000000) {
    return (num / 1000000000).toFixed(2) + 'B';
  } else if (num < 1000000000000000) {
    return (num / 1000000000000).toFixed(2) + 'T';
  } else {
    return (num / 1000000000000000).toFixed(2) + 'Q';
  }
}

export interface AnimatedXPCounterProps {
  value: number;
  initialValue?: number;
  duration?: number; // ms for ticking animation (default: 900ms)
  prefix?: string;
  suffix?: string;
  className?: string;
  glowColor?: string; // default neon emerald #39FF14
  showFloatingGain?: boolean;
  showIcon?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export function AnimatedXPCounter({
  value,
  initialValue,
  duration = 900,
  prefix = '',
  suffix = '',
  className = '',
  glowColor = '#39FF14',
  showFloatingGain = true,
  showIcon = false,
  size = 'md'
}: AnimatedXPCounterProps) {
  const [displayValue, setDisplayValue] = useState<number>(initialValue !== undefined ? initialValue : value);
  const [isGaining, setIsGaining] = useState<boolean>(false);
  const [deltaGain, setDeltaGain] = useState<number | null>(null);
  const previousValueRef = useRef<number>(initialValue !== undefined ? initialValue : value);
  const animFrameRef = useRef<number | null>(null);

  // Size styling map
  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base font-bold',
    lg: 'text-xl font-extrabold',
    xl: 'text-2xl sm:text-3xl font-black'
  };

  useEffect(() => {
    const prev = previousValueRef.current;
    const diff = value - prev;

    if (diff > 0) {
      setIsGaining(true);
      setDeltaGain(diff);
      triggerHaptic('light');

      // Animate the ticking up
      const startTime = performance.now();
      const startValue = prev;
      const targetValue = value;

      const tick = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(1, elapsed / duration);
        // Ease Out Cubic
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentVal = Math.round(startValue + (targetValue - startValue) * easeOut);

        setDisplayValue(currentVal);

        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(tick);
        } else {
          setDisplayValue(targetValue);
          previousValueRef.current = targetValue;
          setTimeout(() => {
            setIsGaining(false);
            setDeltaGain(null);
          }, 600);
        }
      };

      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(tick);
    } else if (diff < 0) {
      setDisplayValue(value);
      previousValueRef.current = value;
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [value, duration]);

  return (
    <span className={`relative inline-flex items-center font-mono select-none ${className}`}>
      {/* Optional Leading Icon */}
      {showIcon && (
        <Zap
          size={size === 'xl' ? 22 : size === 'lg' ? 18 : 14}
          className={`mr-1 transition-transform duration-300 ${
            isGaining ? 'text-[#39FF14] scale-125 animate-pulse' : 'text-amber-400'
          }`}
        />
      )}

      {/* Main Counter Number with Smooth Tactile Glow Transition */}
      <motion.span
        title={`Exact: ${displayValue.toLocaleString()} XP`}
        animate={{
          scale: isGaining ? [1, 1.15, 1.05, 1] : 1,
          color: isGaining ? glowColor : undefined,
          textShadow: isGaining
            ? `0 0 16px ${glowColor}, 0 0 30px ${glowColor}`
            : '0 0 0px transparent'
        }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={`tracking-tight transition-colors duration-300 ${sizeClasses[size]}`}
      >
        {prefix}
        {formatSmartXPNumber(displayValue)}
        {suffix}
      </motion.span>

      {/* Floating XP Gain Badge with subtle fade & sparkle */}
      <AnimatePresence>
        {showFloatingGain && isGaining && deltaGain && (
          <motion.span
            initial={{ opacity: 0, y: 0, scale: 0.6 }}
            animate={{ opacity: 1, y: -22, scale: 1 }}
            exit={{ opacity: 0, y: -34, scale: 0.8 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            className="absolute -top-1 right-0 translate-x-full ml-1.5 px-1.5 py-0.5 rounded-full bg-[#39FF14]/20 border border-[#39FF14]/60 text-[#39FF14] text-[10px] font-mono font-black shadow-[0_0_12px_rgba(57,255,20,0.5)] flex items-center space-x-0.5 pointer-events-none z-30 whitespace-nowrap"
          >
            <Sparkles size={9} className="animate-spin" style={{ animationDuration: '2s' }} />
            <span>+{deltaGain} XP</span>
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

export default AnimatedXPCounter;
