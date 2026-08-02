import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Layers, 
  RotateCw, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  Plus, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Flame, 
  Trophy, 
  Brain, 
  BookOpen, 
  Zap,
  Check
} from 'lucide-react';

interface Flashcard {
  id: string;
  deckId: string;
  question: string;
  answer: string;
  hint?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

interface Deck {
  id: string;
  title: string;
  category: string;
  totalCards: number;
  masteredCount: number;
  color: string;
  icon: string;
}

const DEFAULT_DECKS: Deck[] = [
  { id: 'hsc_physics', title: 'HSC Physics - Formulas & Vector Mechanics', category: 'HSC Science', totalCards: 12, masteredCount: 5, color: 'from-blue-600 to-cyan-600', icon: '⚡' },
  { id: 'web_dev', title: 'React & JS Core Concepts', category: 'Programming', totalCards: 10, masteredCount: 4, color: 'from-emerald-500 to-teal-600', icon: '💻' },
  { id: 'hsc_chemistry', title: 'Organic Reaction Mechanisms', category: 'HSC Science', totalCards: 15, masteredCount: 8, color: 'from-purple-600 to-pink-600', icon: '🧪' },
  { id: 'english_vocabulary', title: 'IELTS Band 8.0 Advanced Vocab', category: 'Language', totalCards: 20, masteredCount: 12, color: 'from-amber-500 to-orange-600', icon: '📚' }
];

const DEFAULT_CARDS: Record<string, Flashcard[]> = {
  hsc_physics: [
    { id: 'p1', deckId: 'hsc_physics', question: 'What is the dot product of two perpendicular vectors?', answer: 'Zero (0) because cos(90°) = 0.', hint: 'Formula: A·B = |A||B|cos(θ)' },
    { id: 'p2', deckId: 'hsc_physics', question: 'State Newton’s Second Law of Motion mathematically.', answer: 'F = ma (Force equals mass times acceleration, or rate of change of momentum dP/dt).', hint: 'dP/dt' },
    { id: 'p3', deckId: 'hsc_physics', question: 'What is the expression for kinetic energy in terms of momentum (P) and mass (m)?', answer: 'E_k = P² / (2m)', hint: 'Express E_k = 1/2 m v² with P = m v' },
    { id: 'p4', deckId: 'hsc_physics', question: 'Define escape velocity from Earth’s surface.', answer: 'v_e = √(2GM/R) ≈ 11.2 km/s.', hint: 'Gravitational constant G, Earth radius R' }
  ],
  web_dev: [
    { id: 'w1', deckId: 'web_dev', question: 'What is the main purpose of React useEffect dependency array?', answer: 'It controls when the effect runs: [] runs once on mount; omitted runs on every render; [dep] runs when dep changes.', hint: 'Mount vs state updates' },
    { id: 'w2', deckId: 'web_dev', question: 'Explain the difference between let, const, and var in JavaScript.', answer: 'let/const are block-scoped; var is function-scoped. const prevents re-assignment.', hint: 'Scope and re-assignment' },
    { id: 'w3', deckId: 'web_dev', question: 'What is a Closure in JavaScript?', answer: 'A function bundled together with references to its surrounding state (lexical environment).', hint: 'Functions keeping outer variables' }
  ],
  hsc_chemistry: [
    { id: 'c1', deckId: 'hsc_chemistry', question: 'What product is formed when ethanol is oxidized using K₂Cr₂O₇ / H₂SO₄?', answer: 'Ethanal (Acetaldehyde) initially, which oxidizes further into Ethanoic Acid (Acetic Acid).', hint: 'Primary alcohol oxidation' },
    { id: 'c2', deckId: 'hsc_chemistry', question: 'State Markovnikov’s Rule for electrophilic addition.', answer: 'When adding H-X to an unsymmetrical alkene, H attaches to the carbon with more hydrogen atoms.', hint: 'Rich get richer rule' }
  ],
  english_vocabulary: [
    { id: 'e1', deckId: 'english_vocabulary', question: 'Define "Ephemeral"', answer: 'Lasting for a very short time; fleeting or transient.', hint: 'Short lived like a shooting star' },
    { id: 'e2', deckId: 'english_vocabulary', question: 'Define "Meticulous"', answer: 'Showing great attention to detail; extremely careful and precise.', hint: 'Very precise and thorough' }
  ]
};

interface FlashcardsViewProps {
  onShowNotification: (message: string, type: 'success' | 'error') => void;
}

export function FlashcardsView({ onShowNotification }: FlashcardsViewProps) {
  const [decks, setDecks] = useState<Deck[]>(DEFAULT_DECKS);
  const [cardsMap, setCardsMap] = useState<Record<string, Flashcard[]>>(DEFAULT_CARDS);
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  
  // Active Deck Session
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [streak, setStreak] = useState<number>(3);
  const [sessionCompleted, setSessionCompleted] = useState<boolean>(false);

  // Modal for New Card / Deck Creation
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [newQuestion, setNewQuestion] = useState<string>('');
  const [newAnswer, setNewAnswer] = useState<string>('');
  const [newHint, setNewHint] = useState<string>('');
  const [newDeckCategory, setNewDeckCategory] = useState<string>('HSC Science');

  const activeDeck = decks.find(d => d.id === activeDeckId);
  const activeCards = activeDeckId ? (cardsMap[activeDeckId] || []) : [];
  const currentCard = activeCards[currentIndex];

  const handleSelectDeck = (deckId: string) => {
    setActiveDeckId(deckId);
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowHint(false);
    setSessionCompleted(false);
  };

  const handleNextCard = (rating: 'again' | 'hard' | 'good' | 'easy') => {
    setIsFlipped(false);
    setShowHint(false);

    if (rating === 'good' || rating === 'easy') {
      setStreak(s => s + 1);
      // Increment mastered count
      if (activeDeckId) {
        setDecks(prev => prev.map(d => d.id === activeDeckId ? { ...d, masteredCount: Math.min(d.totalCards, d.masteredCount + 1) } : d));
      }
    }

    if (currentIndex + 1 < activeCards.length) {
      setCurrentIndex(c => c + 1);
    } else {
      setSessionCompleted(true);
      onShowNotification('🎉 Session Completed! Great memory recall practice.', 'success');
    }
  };

  const handleCreateCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim() || !newAnswer.trim()) {
      onShowNotification('Please enter both question and answer.', 'error');
      return;
    }

    const deckId = activeDeckId || 'hsc_physics';
    const newCardObj: Flashcard = {
      id: 'card_' + Date.now(),
      deckId,
      question: newQuestion.trim(),
      answer: newAnswer.trim(),
      hint: newHint.trim() || undefined
    };

    setCardsMap(prev => ({
      ...prev,
      [deckId]: [...(prev[deckId] || []), newCardObj]
    }));

    setDecks(prev => prev.map(d => d.id === deckId ? { ...d, totalCards: d.totalCards + 1 } : d));

    setNewQuestion('');
    setNewAnswer('');
    setNewHint('');
    setIsNewModalOpen(false);
    onShowNotification('✨ New flashcard added successfully!', 'success');
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header Banner */}
      <div className="glass-panel p-5 rounded-2xl relative overflow-hidden border border-emerald-500/20 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-950">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold uppercase tracking-wider">
              <Brain size={12} className="text-emerald-400" />
              <span>Spaced Repetition Active Recall</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Interactive Flashcard Review Decks
            </h2>
            <p className="text-xs text-slate-300 max-w-xl font-sans">
              Master complex HSC science formulas, coding logic, and IELTS vocabulary through active recall and spaced memory algorithms.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl flex items-center space-x-2 text-xs font-mono text-amber-400">
              <Flame size={16} className="text-amber-400 animate-bounce" />
              <span>{streak} Day Review Streak</span>
            </div>
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl flex items-center space-x-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              <Plus size={16} />
              <span>Add Flashcard</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      {!activeDeckId ? (
        /* Deck Selection Grid */
        <div className="space-y-4">
          <h3 className="text-sm font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
            <Layers size={16} className="text-emerald-400" />
            <span>Select Flashcard Deck ({decks.length})</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {decks.map((deck) => {
              const progressPct = Math.round((deck.masteredCount / deck.totalCards) * 100);
              return (
                <motion.div
                  key={deck.id}
                  whileHover={{ y: -3 }}
                  onClick={() => handleSelectDeck(deck.id)}
                  className="glass-panel p-5 rounded-2xl border border-white/10 hover:border-emerald-500/40 bg-white/[0.02] hover:bg-white/[0.04] transition-all cursor-pointer group relative overflow-hidden"
                >
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${deck.color}`} />
                  
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">
                        {deck.category}
                      </span>
                      <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                        {deck.title}
                      </h4>
                    </div>
                    <span className="text-2xl p-2 bg-white/5 rounded-xl border border-white/10">
                      {deck.icon}
                    </span>
                  </div>

                  <div className="mt-6 space-y-2">
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-slate-400">{deck.masteredCount} of {deck.totalCards} cards mastered</span>
                      <span className="text-emerald-400 font-bold">{progressPct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Active Deck Flip Review Engine */
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Deck Navigation Header */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setActiveDeckId(null)}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-mono text-slate-300 flex items-center space-x-2 transition-colors cursor-pointer"
            >
              <ChevronLeft size={16} />
              <span>Back to Decks</span>
            </button>

            <div className="text-center">
              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider block">{activeDeck?.category}</span>
              <span className="text-xs font-bold text-white">{activeDeck?.title}</span>
            </div>

            <div className="text-xs font-mono text-slate-400">
              {currentIndex + 1} / {activeCards.length}
            </div>
          </div>

          {!sessionCompleted && currentCard ? (
            <div className="space-y-6">
              {/* Progress Bar */}
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${((currentIndex + 1) / activeCards.length) * 100}%` }}
                />
              </div>

              {/* 3D Flip Card Container */}
              <div 
                onClick={() => setIsFlipped(!isFlipped)}
                className="relative min-h-[280px] sm:min-h-[320px] rounded-2xl glass-panel p-8 border border-emerald-500/30 bg-slate-900/90 shadow-2xl flex flex-col justify-between cursor-pointer group hover:border-emerald-400 transition-all select-none"
              >
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span className="flex items-center space-x-1.5 text-emerald-400">
                    <Zap size={14} />
                    <span>{isFlipped ? 'ANSWER SIDE' : 'QUESTION SIDE'}</span>
                  </span>
                  <span className="text-[10px] text-slate-500 group-hover:text-slate-300 transition-colors">
                    Click anywhere to flip 🔄
                  </span>
                </div>

                {/* Card Main Text */}
                <div className="my-auto text-center px-4 space-y-4">
                  {!isFlipped ? (
                    <motion.p 
                      key="q" 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-lg sm:text-xl font-medium text-white leading-relaxed font-sans"
                    >
                      {currentCard.question}
                    </motion.p>
                  ) : (
                    <motion.div 
                      key="a"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="space-y-3"
                    >
                      <p className="text-lg sm:text-xl font-bold text-emerald-400 leading-relaxed font-sans">
                        {currentCard.answer}
                      </p>
                    </motion.div>
                  )}
                </div>

                {/* Card Footer / Hint */}
                <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs font-mono">
                  {currentCard.hint && !isFlipped ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowHint(!showHint);
                      }}
                      className="text-[11px] text-amber-400 hover:underline flex items-center space-x-1"
                    >
                      <span>💡 {showHint ? currentCard.hint : 'Show Hint'}</span>
                    </button>
                  ) : <span />}

                  <span className="text-[10px] text-slate-500">
                    Card #{currentIndex + 1}
                  </span>
                </div>
              </div>

              {/* Recall Self-Assessment Grading Bar */}
              {isFlipped ? (
                <div className="space-y-2">
                  <p className="text-center text-xs font-mono text-slate-400">How well did you remember this concept?</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      onClick={() => handleNextCard('again')}
                      className="p-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-mono text-xs font-bold transition-all cursor-pointer flex flex-col items-center space-y-1"
                    >
                      <span>🔴 Forgot</span>
                      <span className="text-[9px] text-slate-400 font-normal">Review in 1 min</span>
                    </button>
                    <button
                      onClick={() => handleNextCard('hard')}
                      className="p-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-mono text-xs font-bold transition-all cursor-pointer flex flex-col items-center space-y-1"
                    >
                      <span>🟡 Hard</span>
                      <span className="text-[9px] text-slate-400 font-normal">Review in 10 min</span>
                    </button>
                    <button
                      onClick={() => handleNextCard('good')}
                      className="p-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold transition-all cursor-pointer flex flex-col items-center space-y-1"
                    >
                      <span>🟢 Good</span>
                      <span className="text-[9px] text-slate-400 font-normal">Review tomorrow</span>
                    </button>
                    <button
                      onClick={() => handleNextCard('easy')}
                      className="p-3 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 font-mono text-xs font-bold transition-all cursor-pointer flex flex-col items-center space-y-1"
                    >
                      <span>🔵 Easy</span>
                      <span className="text-[9px] text-slate-400 font-normal">Review in 4 days</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center text-xs font-mono text-slate-500">
                  Tap card to reveal answer and rate your memory.
                </div>
              )}
            </div>
          ) : (
            /* Session Completed Screen */
            <div className="glass-panel p-8 rounded-2xl text-center space-y-4 border border-emerald-500/30 bg-emerald-950/20">
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/40">
                <Trophy size={32} className="animate-bounce" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Deck Session Complete!</h3>
                <p className="text-xs text-slate-300 mt-1">
                  You reviewed all {activeCards.length} flashcards in this set. Your retention memory score is recorded.
                </p>
              </div>
              <div className="pt-4 flex justify-center space-x-3">
                <button
                  onClick={() => {
                    setCurrentIndex(0);
                    setSessionCompleted(false);
                    setIsFlipped(false);
                  }}
                  className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-mono text-white flex items-center space-x-2 cursor-pointer"
                >
                  <RotateCw size={14} />
                  <span>Restart Deck</span>
                </button>
                <button
                  onClick={() => setActiveDeckId(null)}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl cursor-pointer"
                >
                  Select Other Deck
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal for Creating Custom Flashcard */}
      <AnimatePresence>
        {isNewModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel max-w-md w-full p-6 rounded-2xl border border-white/10 space-y-5 relative bg-slate-900"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Plus size={16} className="text-emerald-400" />
                  <span>Create Custom Flashcard</span>
                </h3>
                <button onClick={() => setIsNewModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateCard} className="space-y-4 text-xs font-sans">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-300">Question / Concept *</label>
                  <textarea
                    rows={2}
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    placeholder="e.g. What is the formula for kinetic energy?"
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-emerald-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-300">Answer / Key Formula *</label>
                  <textarea
                    rows={2}
                    value={newAnswer}
                    onChange={(e) => setNewAnswer(e.target.value)}
                    placeholder="e.g. E_k = 1/2 m v²"
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-emerald-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-300">Memory Hint (Optional)</label>
                  <input
                    type="text"
                    value={newHint}
                    onChange={(e) => setNewHint(e.target.value)}
                    placeholder="e.g. Express in terms of velocity v"
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsNewModalOpen(false)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl font-mono text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl font-mono text-xs"
                  >
                    Save Card
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
