import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Gamepad2, Timer, Sparkles, Zap, CheckCircle2, RotateCcw } from 'lucide-react';
import { soundFxService } from '../services/soundFxService';
import { gamificationService } from '../services/gamificationService';
import { NeonConfetti } from './NeonConfetti';

interface SpeedMatchGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onXPUpdated: (newXP: number) => void;
  onShowNotification: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

interface CardItem {
  id: string;
  pairId: number;
  text: string;
  isMatched: boolean;
}

const SAMPLE_PAIRS = [
  { id: 1, term: 'React State', def: 'useState()' },
  { id: 2, term: 'TypeScript', def: 'Static Typing' },
  { id: 3, term: 'CSS Flexbox', def: '1D Alignment' },
  { id: 4, term: 'NoSQL DB', def: 'Firestore Docs' },
  { id: 5, term: 'HTTP GET', def: 'Fetch Data' },
  { id: 6, term: 'Async/Await', def: 'Promises Handler' }
];

export function SpeedMatchGameModal({
  isOpen,
  onClose,
  userId,
  onXPUpdated,
  onShowNotification
}: SpeedMatchGameModalProps) {
  const [cards, setCards] = useState<CardItem[]>([]);
  const [selectedCards, setSelectedCards] = useState<CardItem[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Initialize and shuffle cards
  const initGame = () => {
    const cardList: CardItem[] = [];
    SAMPLE_PAIRS.forEach(p => {
      cardList.push({ id: `term_${p.id}`, pairId: p.id, text: p.term, isMatched: false });
      cardList.push({ id: `def_${p.id}`, pairId: p.id, text: p.def, isMatched: false });
    });
    // Shuffle array
    const shuffled = cardList.sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setSelectedCards([]);
    setScore(0);
    setCombo(1);
    setTimeLeft(60);
    setIsGameOver(false);
    setShowConfetti(false);
    setIsPlaying(true);
  };

  useEffect(() => {
    if (isOpen) {
      initGame();
    }
  }, [isOpen]);

  // Timer Countdown
  useEffect(() => {
    let interval: any = null;
    if (isPlaying && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isPlaying) {
      setIsPlaying(false);
      setIsGameOver(true);
      handleGameEnd();
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, timeLeft]);

  // Check card match
  const handleCardClick = (card: CardItem) => {
    if (!isPlaying || card.isMatched || selectedCards.find(c => c.id === card.id)) return;
    soundFxService.playClick();

    const newSelected = [...selectedCards, card];
    setSelectedCards(newSelected);

    if (newSelected.length === 2) {
      if (newSelected[0].pairId === newSelected[1].pairId) {
        // Match success!
        soundFxService.playXP();
        setScore(prev => prev + 10 * combo);
        setCombo(prev => prev + 1);

        setCards(prev =>
          prev.map(c => (c.pairId === card.pairId ? { ...c, isMatched: true } : c))
        );
        setSelectedCards([]);

        // Check if all matched
        setTimeout(() => {
          setCards(currentCards => {
            const allMatched = currentCards.every(c => c.isMatched);
            if (allMatched) {
              setIsPlaying(false);
              setIsGameOver(true);
              handleGameEnd();
            }
            return currentCards;
          });
        }, 100);
      } else {
        // Match failed
        setCombo(1);
        setTimeout(() => {
          setSelectedCards([]);
        }, 500);
      }
    }
  };

  const handleGameEnd = async () => {
    soundFxService.playUnlock();
    setShowConfetti(true);
    const bonusXP = Math.max(score, 30);
    if (userId) {
      await gamificationService.addXP(userId, bonusXP, `⚡ 60s Speed Match Match Arena (+${bonusXP} XP)`);
      window.dispatchEvent(new Event('nexus_xp_updated'));
    }
    onShowNotification(`🎉 Speed Match Complete! Earned +${bonusXP} XP!`, 'success');
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md overflow-y-auto w-screen h-[100dvh] top-0 left-0">
        {showConfetti && <NeonConfetti active={showConfetti} particleCount={40} />}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg rounded-2xl sm:rounded-3xl bg-[#0a0f1d] border border-cyan-500/30 p-5 sm:p-6 shadow-[0_0_60px_rgba(6,182,212,0.2)] overflow-hidden z-10 text-center max-h-[88dvh] flex flex-col my-auto"
        >
          {/* Top Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-32 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer border border-white/5"
          >
            <X size={18} />
          </button>

          {/* Header */}
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-mono font-bold uppercase tracking-wider mb-2">
            <Gamepad2 size={12} />
            <span>60s Flashcard Speed Arena</span>
          </div>

          <h2 className="text-xl font-black text-white">Brain Refresh Match</h2>

          {/* Stats Bar */}
          <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-2xl my-4 text-xs font-mono">
            <div className="flex items-center space-x-1.5 text-cyan-400">
              <Timer size={14} />
              <span className="font-bold text-sm">{timeLeft}s</span>
            </div>

            <div className="flex items-center space-x-1 text-amber-400 font-bold">
              <Zap size={14} className="fill-amber-400" />
              <span>Score: {score}</span>
            </div>

            <div className="px-2 py-0.5 bg-[#39FF14]/10 border border-[#39FF14]/30 text-[#39FF14] text-[10px] font-bold rounded-full">
              Combo {combo}x
            </div>
          </div>

          {/* Cards Grid */}
          {!isGameOver ? (
            <div className="grid grid-cols-3 gap-2.5 my-4">
              {cards.map(card => {
                const isSelected = selectedCards.some(c => c.id === card.id);
                return (
                  <motion.button
                    key={card.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleCardClick(card)}
                    disabled={card.isMatched}
                    className={`h-20 rounded-2xl p-2.5 flex items-center justify-center text-center font-bold text-xs transition-all cursor-pointer border select-none ${
                      card.isMatched
                        ? 'opacity-20 bg-emerald-500/10 border-emerald-500/20 cursor-default'
                        : isSelected
                        ? 'bg-cyan-500 text-black border-cyan-300 font-extrabold shadow-[0_0_15px_rgba(6,182,212,0.5)]'
                        : 'bg-white/[0.04] hover:bg-white/[0.08] text-white border-white/10'
                    }`}
                  >
                    {card.text}
                  </motion.button>
                );
              })}
            </div>
          ) : (
            <div className="py-8 space-y-4">
              <span className="text-5xl">🏆</span>
              <h3 className="text-2xl font-black text-white">Arena Complete!</h3>
              <p className="text-sm font-mono text-[#39FF14] font-bold">
                Final Score: {score} • Earned +{Math.max(score, 30)} XP!
              </p>

              <button
                onClick={initGame}
                className="px-6 py-3 rounded-2xl bg-cyan-400 text-black font-extrabold font-mono text-xs uppercase tracking-wider flex items-center justify-center space-x-2 mx-auto cursor-pointer shadow-lg shadow-cyan-500/20 hover:bg-cyan-300"
              >
                <RotateCcw size={15} />
                <span>Play Again</span>
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
