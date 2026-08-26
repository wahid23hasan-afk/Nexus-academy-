import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface RollingDigitProps {
  digit: string;
  fontSizeClass?: string;
  colorClass?: string;
}

function SingleDigitRoll({ digit, fontSizeClass = "text-lg font-black", colorClass = "text-orange-400" }: RollingDigitProps) {
  return (
    <div className={`relative inline-flex flex-col items-center justify-center overflow-hidden h-[1.25em] leading-none ${fontSizeClass} ${colorClass} font-mono select-none`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={digit}
          initial={{ y: 22, opacity: 0, filter: 'blur(2px)' }}
          animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
          exit={{ y: -22, opacity: 0, filter: 'blur(2px)' }}
          transition={{
            type: "spring",
            stiffness: 380,
            damping: 24,
            mass: 0.8
          }}
          className="inline-block leading-none"
        >
          {digit}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

interface RollingCounterProps {
  value: number;
  className?: string;
  fontSizeClass?: string;
  colorClass?: string;
}

export function RollingCounter({
  value,
  className = "",
  fontSizeClass = "text-xl sm:text-2xl font-black",
  colorClass = "text-orange-400"
}: RollingCounterProps) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    setDisplayValue(value);
  }, [value]);

  const digits = displayValue.toString().split('');

  return (
    <span className={`inline-flex items-center tracking-tight ${className}`}>
      {digits.map((d, index) => (
        <SingleDigitRoll
          key={`${digits.length - index}-${d}`}
          digit={d}
          fontSizeClass={fontSizeClass}
          colorClass={colorClass}
        />
      ))}
    </span>
  );
}

export default RollingCounter;
