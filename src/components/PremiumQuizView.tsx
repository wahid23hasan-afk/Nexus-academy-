import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Clock, 
  HelpCircle, 
  ChevronLeft, 
  ChevronRight, 
  Bookmark, 
  BookmarkCheck,
  AlertTriangle,
  Play,
  Pause,
  Send,
  Flag,
  RotateCcw,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { Quiz, QuizQuestion, QuizAttempt } from '../types/quiz';
import { quizService } from '../services/quizService';

interface PremiumQuizViewProps {
  quiz: Quiz;
  questions: QuizQuestion[];
  initialAttempt: QuizAttempt;
  userId: string;
  userName: string;
  userPhotoURL?: string;
  courseId: string;
  onClose: () => void;
  onSubmitSuccess: (result: any) => void;
  onShowNotification: (message: string, type: 'success' | 'error') => void;
}

export function PremiumQuizView({
  quiz,
  questions,
  initialAttempt,
  userId,
  userName,
  userPhotoURL,
  courseId,
  onClose,
  onSubmitSuccess,
  onShowNotification
}: PremiumQuizViewProps) {
  // Active Attempt state synced locally
  const [attempt, setAttempt] = useState<QuizAttempt>(initialAttempt);
  const [currentIdx, setCurrentIdx] = useState<number>(initialAttempt.currentQuestionIndex || 0);
  const [timeLeft, setTimeLeft] = useState<number>(initialAttempt.timeLeft ?? quiz.timeLimit);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync Timer countdown
  useEffect(() => {
    if (isPaused || isSubmitting) return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          onShowNotification('Time has expired! Submitting answers automatically...', 'error');
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, isSubmitting]);

  // Periodic Firestore state backup (every 10 seconds)
  useEffect(() => {
    if (timeLeft % 10 === 0 && timeLeft > 0) {
      const activeQ = questions[currentIdx];
      if (activeQ) {
        quizService.saveQuizAttemptAnswer(
          attempt.attemptId,
          activeQ.questionId,
          attempt.answers[activeQ.questionId] || '',
          timeLeft,
          currentIdx
        );
      }
    }
  }, [timeLeft]);

  const handleAutoSubmit = async () => {
    setIsSubmitting(true);
    try {
      const result = await quizService.submitQuizAttempt(
        userId,
        courseId,
        { ...attempt, timeLeft: 0 },
        questions,
        quiz,
        userName,
        userPhotoURL
      );
      onShowNotification('Quiz submitted successfully!', 'success');
      onSubmitSuccess(result);
    } catch (err) {
      console.error(err);
      onShowNotification('Error submitting quiz answers automatically.', 'error');
      setIsSubmitting(false);
    }
  };

  const handleManualSubmit = async () => {
    const unansweredCount = questions.filter(q => {
      const ans = attempt.answers[q.questionId];
      return ans === undefined || ans === null || ans === '' || (Array.isArray(ans) && ans.length === 0);
    }).length;

    const confirmMsg = unansweredCount > 0 
      ? `You have ${unansweredCount} unanswered questions. Are you sure you want to submit?`
      : 'Are you sure you want to complete this academic assessment?';

    if (!window.confirm(confirmMsg)) return;

    setIsSubmitting(true);
    try {
      const result = await quizService.submitQuizAttempt(
        userId,
        courseId,
        { ...attempt, timeLeft },
        questions,
        quiz,
        userName,
        userPhotoURL
      );
      onShowNotification('Quiz submitted successfully!', 'success');
      onSubmitSuccess(result);
    } catch (err) {
      console.error(err);
      onShowNotification('Failed to submit assessment securely.', 'error');
      setIsSubmitting(false);
    }
  };

  const handleSelectAnswer = async (answer: string) => {
    const activeQ = questions[currentIdx];
    if (!activeQ) return;

    const currentAnswers = { ...attempt.answers };
    
    if (activeQ.type === 'multi_mcq') {
      const existing = (currentAnswers[activeQ.questionId] as string[]) || [];
      let updated: string[];
      if (existing.includes(answer)) {
        updated = existing.filter(a => a !== answer);
      } else {
        updated = [...existing, answer].sort();
      }
      currentAnswers[activeQ.questionId] = updated;
    } else {
      currentAnswers[activeQ.questionId] = answer;
    }

    const updatedAttempt = { ...attempt, answers: currentAnswers };
    setAttempt(updatedAttempt);

    // Save choice immediately to Firebase
    await quizService.saveQuizAttemptAnswer(
      attempt.attemptId,
      activeQ.questionId,
      currentAnswers[activeQ.questionId],
      timeLeft,
      currentIdx
    );
  };

  const handleToggleFlag = async () => {
    const activeQ = questions[currentIdx];
    if (!activeQ) return;

    const isFlagged = attempt.flaggedForReview.includes(activeQ.questionId);
    let updatedFlagged = [...attempt.flaggedForReview];
    
    if (isFlagged) {
      updatedFlagged = updatedFlagged.filter(id => id !== activeQ.questionId);
      onShowNotification('Removed flag for review', 'success');
    } else {
      updatedFlagged.push(activeQ.questionId);
      onShowNotification('Question flagged for review', 'success');
    }

    setAttempt(prev => ({ ...prev, flaggedForReview: updatedFlagged }));
    await quizService.toggleFlaggedQuestion(attempt.attemptId, activeQ.questionId, !isFlagged);
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
    }
  };

  const handleJumpToQuestion = (idx: number) => {
    setCurrentIdx(idx);
  };

  const activeQuestion = questions[currentIdx];
  const totalQuestions = questions.length;
  const progressPercent = Math.round(((currentIdx + 1) / totalQuestions) * 100);

  // Time Formatter
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const isLastMinute = timeLeft < 60;

  if (!activeQuestion) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <HelpCircle size={40} className="text-slate-500 animate-spin" />
        <p className="text-xs font-mono text-slate-400 mt-2">LOADING QUIZ COMPONENT CONTEXT...</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#050914] text-slate-100 font-sans select-none overflow-hidden" id="premium-quiz-overlay">
      {/* 1. Header Row */}
      <header className="px-4 py-3 flex items-center justify-between border-b border-white/10 bg-[#070d1a]/95 backdrop-blur-md">
        <div className="flex items-center space-x-2 w-2/3">
          <div className="p-2 bg-[#39FF14]/10 border border-[#39FF14]/20 rounded-xl text-[#39FF14]">
            <FileText size={16} />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold line-clamp-1">{quiz.title}</h4>
            <p className="text-[9px] font-mono text-slate-400 uppercase tracking-widest leading-none mt-1">
              {quiz.chapterTitle || 'General Curriculum Assessment'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {quiz.allowPause && (
            <button 
              onClick={() => setIsPaused(!isPaused)}
              className={`p-2 rounded-xl border text-[10px] font-mono font-bold uppercase transition-colors flex items-center space-x-1 ${
                isPaused 
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              {isPaused ? <Play size={11} fill="currentColor" /> : <Pause size={11} />}
              <span className="hidden sm:inline">{isPaused ? 'Resume' : 'Pause'}</span>
            </button>
          )}

          <button 
            onClick={() => {
              if (window.confirm('Abandoning quiz will lose unsaved final results. Exit now?')) {
                onClose();
              }
            }}
            className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl transition-colors cursor-pointer"
            title="Exit Assessment"
          >
            <X size={15} />
          </button>
        </div>
      </header>

      {/* Pause Mask Block */}
      <AnimatePresence>
        {isPaused && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#050914]/95 z-40 flex flex-col items-center justify-center space-y-4"
          >
            <div className="w-14 h-14 bg-amber-500/10 border-2 border-amber-500/30 text-amber-400 rounded-full flex items-center justify-center animate-pulse">
              <Pause size={24} fill="currentColor" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-sm font-bold text-white">QUIZ STUDY TIMEOUT</h3>
              <p className="text-[10px] text-slate-400 max-w-xs leading-relaxed font-mono">
                The countdown timer has been paused. Review your reference material and click resume when ready.
              </p>
            </div>
            <button 
              onClick={() => setIsPaused(false)}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-black text-xs font-mono font-bold uppercase rounded-xl transition-all"
            >
              Resume Assessment
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Secondary Info Metrics Row */}
      <div className="px-4 py-2.5 flex items-center justify-between border-b border-white/5 bg-[#060b16] text-[10px] font-mono text-slate-400">
        <div className="flex items-center space-x-4">
          <span>Passing: <strong className="text-white">{quiz.passingScore}%</strong></span>
          <span>Questions: <strong className="text-white">{totalQuestions}</strong></span>
          <span>Question: <strong className="text-[#39FF14]">{currentIdx + 1} of {totalQuestions}</strong></span>
        </div>

        {/* Beautiful Countdown visual warning logic */}
        <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-xl border transition-all ${
          isLastMinute 
            ? 'bg-red-500/15 border-red-500/30 text-red-400 font-black animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.2)]' 
            : 'bg-white/5 border-white/5 text-slate-300'
        }`}>
          <Clock size={11} className={isLastMinute ? 'animate-spin' : ''} />
          <span>Timer:</span>
          <span>{formatTime(timeLeft)}</span>
        </div>
      </div>

      {/* Progress Bar indicator */}
      <div className="w-full h-1 bg-white/5 relative">
        <div 
          className="h-full bg-gradient-to-r from-emerald-500 to-[#39FF14] transition-all duration-300 shadow-[0_0_8px_rgba(57,255,20,0.5)]"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* 3. Main Quiz Panel Canvas */}
      <main className="flex-1 overflow-y-auto p-4 flex flex-col justify-between max-w-2xl mx-auto w-full space-y-6">
        
        {/* Active Question Content Block */}
        <div className="space-y-4">
          <header className="space-y-1.5 pt-2">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-mono uppercase font-black text-[#39FF14] bg-[#39FF14]/5 border border-[#39FF14]/25 px-2.5 py-1 rounded-lg">
                Question {currentIdx + 1}
              </span>
              <span className="text-[9px] font-mono text-slate-500 uppercase">
                {activeQuestion.points} Points • {activeQuestion.type === 'multi_mcq' ? 'Multi Select' : 'Single Choice'}
              </span>
            </div>
            <h2 className="text-sm md:text-base font-bold text-white leading-relaxed">
              {activeQuestion.questionText}
            </h2>
          </header>

          <hr className="border-white/5" />

          {/* Options Grid */}
          <div className="space-y-2.5">
            {activeQuestion.options && activeQuestion.options.map((opt, i) => {
              const optIndex = String(i);
              const isSelected = activeQuestion.type === 'multi_mcq'
                ? ((attempt.answers[activeQuestion.questionId] as string[]) || []).includes(optIndex)
                : attempt.answers[activeQuestion.questionId] === optIndex;

              return (
                <button
                  key={i}
                  onClick={() => handleSelectAnswer(optIndex)}
                  className={`w-full p-4 rounded-2xl text-left text-xs leading-normal transition-all duration-300 border flex items-center justify-between cursor-pointer group ${
                    isSelected 
                      ? 'bg-[#39FF14]/5 border-[#39FF14]/40 text-[#39FF14] shadow-[0_0_12px_rgba(57,255,20,0.06)]' 
                      : 'bg-white/[0.01] border-white/5 text-slate-300 hover:border-white/10 hover:bg-white/[0.02]'
                  }`}
                >
                  <span className="font-sans font-medium">{opt}</span>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ml-3 ${
                    isSelected ? 'border-[#39FF14] bg-[#39FF14]/10' : 'border-slate-600 group-hover:border-slate-400'
                  }`}>
                    {isSelected && <div className="w-2 h-2 rounded-full bg-[#39FF14]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Mini Question Navigation Grid Pad */}
        <div className="bg-slate-950/40 border border-white/5 rounded-3xl p-3 space-y-2">
          <div className="flex justify-between items-center px-1 text-[9px] font-mono text-slate-500 uppercase">
            <span>Grid Navigator</span>
            <div className="flex space-x-3">
              <span className="flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-[#39FF14] mr-1" /> Answered</span>
              <span className="flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1" /> Flagged</span>
              <span className="flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-white/20 mr-1" /> Empty</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 justify-center">
            {questions.map((q, idx) => {
              const isAns = attempt.answers[q.questionId] !== undefined && attempt.answers[q.questionId] !== null && attempt.answers[q.questionId] !== '';
              const isFlag = attempt.flaggedForReview.includes(q.questionId);
              const isCur = idx === currentIdx;

              return (
                <button
                  key={idx}
                  onClick={() => handleJumpToQuestion(idx)}
                  className={`w-7 h-7 rounded-lg text-[10px] font-mono font-bold flex items-center justify-center transition-all ${
                    isCur 
                      ? 'bg-[#39FF14] text-black ring-2 ring-[#39FF14]/30 scale-110' 
                      : isFlag 
                      ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                      : isAns 
                      ? 'bg-[#39FF14]/15 border border-[#39FF14]/30 text-[#39FF14]' 
                      : 'bg-white/5 border border-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      </main>

      {/* 5. Bottom Navigation Bar Toolbar */}
      <footer className="px-4 py-3.5 border-t border-white/10 bg-[#070d19] flex items-center justify-between">
        <div className="flex space-x-2">
          {/* Flag Toggle Bookmark */}
          <button
            onClick={handleToggleFlag}
            className={`px-3 py-2 rounded-xl border text-[11px] font-bold font-sans flex items-center space-x-1 cursor-pointer transition-all ${
              attempt.flaggedForReview.includes(activeQuestion.questionId)
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <Bookmark size={13} className={attempt.flaggedForReview.includes(activeQuestion.questionId) ? 'fill-current' : ''} />
            <span className="hidden sm:inline">
              {attempt.flaggedForReview.includes(activeQuestion.questionId) ? 'Flagged' : 'Flag for Review'}
            </span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrev}
            disabled={currentIdx === 0}
            className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-20 cursor-pointer transition-colors"
            title="Previous Question"
          >
            <ChevronLeft size={16} />
          </button>

          {currentIdx === totalQuestions - 1 ? (
            <button
              onClick={handleManualSubmit}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-[#39FF14] text-black font-extrabold text-xs uppercase tracking-wider flex items-center space-x-1.5 shadow-[0_4px_12px_rgba(57,255,20,0.2)] hover:bg-[#32e011] transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-black" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>SUBMITTING...</span>
                </>
              ) : (
                <>
                  <Send size={12} />
                  <span>Submit Exam</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-5 py-2.5 rounded-xl bg-white text-black font-bold text-xs uppercase tracking-wider flex items-center space-x-1 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight size={13} />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
