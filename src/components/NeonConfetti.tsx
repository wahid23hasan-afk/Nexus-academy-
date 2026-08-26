import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface NeonConfettiProps {
  active?: boolean;
  particleCount?: number;
  originY?: number; // 0 to 1 (e.g. 0.3 for top/mid screen burst)
}

interface ConfettiPiece {
  id: number;
  x: number; // percentage 0 - 100
  targetY: number; // px to travel downwards
  swayX: number; // horizontal sway px
  size: number;
  shape: 'rect' | 'diamond' | 'star' | 'circle';
  color: string;
  glowColor: string;
  duration: number;
  delay: number;
  rotX: number;
  rotY: number;
  rotZ: number;
}

const NEON_PALETTE = [
  { color: '#39FF14', glow: 'rgba(57, 255, 20, 0.8)' },   // Cyber Emerald
  { color: '#00F0FF', glow: 'rgba(0, 240, 255, 0.8)' },   // Electric Cyan
  { color: '#FFD700', glow: 'rgba(255, 215, 0, 0.85)' },  // Solar Gold
  { color: '#FF2E93', glow: 'rgba(255, 46, 147, 0.8)' },  // Neon Rose
  { color: '#B026FF', glow: 'rgba(176, 38, 255, 0.8)' },  // Cosmic Violet
  { color: '#FFFFFF', glow: 'rgba(255, 255, 255, 0.9)' },  // Starlight White
];

export function NeonConfetti({ active = true, particleCount = 36 }: NeonConfettiProps) {
  const pieces = useMemo<ConfettiPiece[]>(() => {
    if (!active) return [];

    return Array.from({ length: particleCount }, (_, index) => {
      const palette = NEON_PALETTE[index % NEON_PALETTE.length];
      const shapes: ('rect' | 'diamond' | 'star' | 'circle')[] = ['rect', 'diamond', 'star', 'circle'];
      const shape = shapes[index % shapes.length];

      return {
        id: index,
        x: 10 + Math.random() * 80, // Horizontal start spread 10% - 90%
        targetY: 350 + Math.random() * 400, // Travel 350px - 750px downwards
        swayX: (Math.random() - 0.5) * 80, // Horizontal oscillation
        size: shape === 'circle' ? 4 + Math.random() * 3 : 6 + Math.random() * 5,
        shape,
        color: palette.color,
        glowColor: palette.glow,
        duration: 2.2 + Math.random() * 1.4, // 2.2s - 3.6s
        delay: Math.random() * 0.35, // Staggered entry
        rotX: Math.random() * 720 - 360,
        rotY: Math.random() * 720 - 360,
        rotZ: Math.random() * 360 - 180,
      };
    });
  }, [active, particleCount]);

  if (!active) return null;

  return (
    <div 
      className="fixed inset-0 pointer-events-none z-[999999] overflow-hidden select-none"
      aria-hidden="true"
    >
      <AnimatePresence>
        {pieces.map((p) => (
          <motion.div
            key={p.id}
            initial={{
              opacity: 0,
              x: `${p.x}vw`,
              y: -20,
              scale: 0.2,
              rotateX: 0,
              rotateY: 0,
              rotateZ: 0,
            }}
            animate={{
              opacity: [0, 1, 1, 0.8, 0],
              x: [
                `${p.x}vw`,
                `calc(${p.x}vw + ${p.swayX * 0.4}px)`,
                `calc(${p.x}vw - ${p.swayX * 0.6}px)`,
                `calc(${p.x}vw + ${p.swayX}px)`,
              ],
              y: [-20, p.targetY * 0.2, p.targetY * 0.6, p.targetY],
              scale: [0.2, 1.2, 1, 0.8, 0.4],
              rotateX: p.rotX,
              rotateY: p.rotY,
              rotateZ: p.rotZ,
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              ease: [0.25, 0.1, 0.25, 1], // Smooth gravity curve
            }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              color: p.color,
              filter: `drop-shadow(0 0 6px ${p.glowColor})`,
            }}
          >
            {p.shape === 'rect' && (
              <div
                style={{
                  width: `${p.size * 1.8}px`,
                  height: `${p.size * 0.8}px`,
                  backgroundColor: p.color,
                  borderRadius: '2px',
                }}
              />
            )}

            {p.shape === 'diamond' && (
              <div
                style={{
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  backgroundColor: p.color,
                  transform: 'rotate(45deg)',
                  borderRadius: '1px',
                }}
              />
            )}

            {p.shape === 'star' && (
              <svg
                width={p.size * 1.5}
                height={p.size * 1.5}
                viewBox="0 0 24 24"
                fill={p.color}
              >
                <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
              </svg>
            )}

            {p.shape === 'circle' && (
              <div
                style={{
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  backgroundColor: p.color,
                  borderRadius: '9999px',
                }}
              />
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export default NeonConfetti;
