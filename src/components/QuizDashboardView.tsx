import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Clock, 
  HelpCircle, 
  Play, 
  Lock, 
  CheckCircle2, 
  XCircle, 
  Award, 
  RotateCcw,
  Zap,
  BookOpen,
  ArrowRight,
  TrendingUp,
  ChevronRight,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { Quiz, QuizQuestion, QuizAttempt, QuizResult } from '../types/quiz';
import { CurriculumChapter } from '../types/course';
import { quizService } from '../services/quizService';
import { PremiumQuizView } from './PremiumQuizView';
import { QuizResultsView } from './QuizResultsView';
import { auth } from '../services/firebase';
import { gamificationService } from '../services/gamificationService';

interface QuizDashboardViewProps {
  courseId: string;
  chapters: CurriculumChapter[];
  onShowNotification: (message: string, type: 'success' | 'error') => void;
}

export function QuizDashboardView({
  courseId,
  chapters,
  onShowNotification
}: QuizDashboardViewProps) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Quiz taking state
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [activeQuestions, setActiveQuestions] = useState<QuizQuestion[]>([]);
  const [activeAttempt, setActiveAttempt] = useState<QuizAttempt | null>(null);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState<boolean>(false);

  // Post Quiz results view state
  const [activeResult, setActiveResult] = useState<QuizResult | null>(null);
  const [activeResultQuiz, setActiveResultQuiz] = useState<Quiz | null>(null);
  const [activeResultQuestions, setActiveResultQuestions] = useState<QuizQuestion[]>([]);

  // Previous attempts metrics history
  const [quizScores, setQuizScores] = useState<Record<string, QuizResult[]>>({});
  const [retriesLeft, setRetriesLeft] = useState<Record<string, number>>({});

  const currentUser = auth.currentUser;
  const userId = currentUser?.uid || 'anonymous';
  const userName = currentUser?.displayName || 'Academic Scholar';
  const userPhotoURL = currentUser?.photoURL || undefined;

  // Load available quizzes
  const loadQuizzesAndStats = async () => {
    setLoading(true);
    try {
      // 1. Fetch & Seed quizzes dynamically
      const quizList = await quizService.getQuizzesForCourse(courseId, chapters);
      setQuizzes(quizList);

      // 2. Fetch all scores previously completed
      const resultsKey = `nexus_quiz_all_results_${userId}`;
      const allResults: QuizResult[] = JSON.parse(localStorage.getItem(resultsKey) || '[]');
      const filtered = allResults.filter(r => r.courseId === courseId);

      const scoresMap: Record<string, QuizResult[]> = {};
      filtered.forEach(res => {
        if (!scoresMap[res.quizId]) scoresMap[res.quizId] = [];
        scoresMap[res.quizId].push(res);
      });
      setQuizScores(scoresMap);

      // 3. Compute Retries left
      const retriesMap: Record<string, number> = {};
      for (const q of quizList) {
        const rem = await quizService.getRetryCountRemaining(userId, q);
        retriesMap[q.quizId] = rem;
      }
      setRetriesLeft(retriesMap);

    } catch (err) {
      console.warn('Failed loading assessment dashboard:', err);
      onShowNotification('Error loading academy quizzes database.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuizzesAndStats();
  }, [courseId, chapters]);

  // Launch a Quiz
  const handleLaunchQuiz = async (quiz: Quiz) => {
    // Retry Limit Verification Check
    const retries = retriesLeft[quiz.quizId] ?? quiz.maxRetries;
    if (retries <= 0 && quiz.maxRetries !== -1) {
      onShowNotification('Attempt ceiling reached. You have no retries left for this exam.', 'error');
      return;
    }

    setIsLoadingQuiz(true);
    try {
      const questions = await quizService.getQuestionsForQuiz(quiz.quizId);
      if (questions.length === 0) {
        onShowNotification('Course questions could not be prepared dynamically.', 'error');
        setIsLoadingQuiz(false);
        return;
      }

      // Initialize or resume attempt state
      const attempt = await quizService.startQuizAttempt(userId, quiz.quizId, quiz.timeLimit);
      
      setActiveQuestions(questions);
      setActiveAttempt(attempt);
      setActiveQuiz(quiz);
    } catch (err) {
      console.error(err);
      onShowNotification('Failed to securely establish a quiz attempt.', 'error');
    } finally {
      setIsLoadingQuiz(false);
    }
  };

  // Callback on successful submit
  const handleQuizSubmitSuccess = (result: QuizResult) => {
    // Capture details to show result screen
    setActiveResult(result);
    setActiveResultQuiz(activeQuiz);
    setActiveResultQuestions(activeQuestions);

    // Give Gamification XP based on score
    if (result.passed) {
      const xpReward = Math.round(result.score * 1.5); // Example: 100 score = 150 XP
      gamificationService.addXP(userId, xpReward, `Passed Quiz: ${activeQuiz?.title}`);
      gamificationService.updateGoalProgress(userId, 'take_quiz', 1);
      
      // Check if perfectly scored
      if (result.percentage === 100) {
        gamificationService.unlockAchievement(userId, 'quiz_master', 'Quiz Master', `Scored 100% on ${activeQuiz?.title}`, '🎯');
      }
    } else {
      // Participation XP
      gamificationService.addXP(userId, 10, `Attempted Quiz: ${activeQuiz?.title}`);
      gamificationService.updateGoalProgress(userId, 'take_quiz', 1);
    }

    // Reset taking state
    setActiveQuiz(null);
    setActiveQuestions([]);
    setActiveAttempt(null);

    // Refresh dashboard statistics
    loadQuizzesAndStats();
  };

  // Launch Results Details screen directly from completed list
  const handleShowPastResult = (quiz: Quiz, result: QuizResult) => {
    // Fetch questions again to show detailed solutions review
    quizService.getQuestionsForQuiz(quiz.quizId).then(questions => {
      setActiveResult(result);
      setActiveResultQuiz(quiz);
      setActiveResultQuestions(questions);
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'practice': return 'bg-sky-500/10 border-sky-500/20 text-sky-400';
      case 'chapter': return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
      case 'lesson': return 'bg-purple-500/10 border-purple-500/20 text-purple-400';
      case 'final': return 'bg-amber-500/10 border-amber-500/20 text-amber-400 font-extrabold';
      default: return 'bg-white/5 border-white/5 text-slate-400';
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'practice': return 'Practice';
      case 'chapter': return 'Milestone';
      case 'lesson': return 'Topic Quiz';
      case 'final': return 'Final Exam';
      default: return 'Standard';
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-center space-y-3">
        <Loader2 className="text-[#39FF14] animate-spin" size={32} />
        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
          Sychronizing assessment database...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="quiz-dashboard-workspace">
      
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-[#09152b] to-[#040813] border border-white/10 rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1.5 text-center sm:text-left">
          <h2 className="text-sm font-bold text-white flex items-center justify-center sm:justify-start">
            <Trophy size={16} className="text-amber-400 mr-1.5" />
            Unified Evaluation & Assessment Center
          </h2>
          <p className="text-[11px] text-slate-400 max-w-md leading-relaxed">
            Validate acquired lessons. Score at least <strong className="text-white">75%</strong> on the Final Certification Exam to unlock premium grade indicators and showcase skills.
          </p>
        </div>

        <div className="bg-white/5 border border-white/5 px-4 py-3 rounded-2xl text-center shrink-0">
          <p className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">Total Available</p>
          <h3 className="text-base font-black font-mono text-[#39FF14] mt-0.5">{quizzes.length} Assessments</h3>
        </div>
      </div>

      {/* 2. Quizzes Category Breakdown List */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest px-1">
          Assigned Course Evaluations
        </h3>

        <div className="grid gap-3">
          {quizzes.map((quiz) => {
            const scores = quizScores[quiz.quizId] || [];
            const bestScore = scores.length > 0 
              ? Math.max(...scores.map(s => s.percentage)) 
              : null;
            const hasPassed = scores.some(s => s.passed);
            const remaining = retriesLeft[quiz.quizId] ?? quiz.maxRetries;

            return (
              <div 
                key={quiz.quizId}
                className={`bg-[#060c18]/80 border rounded-3xl p-4 transition-all duration-300 hover:border-white/15 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  hasPassed 
                    ? 'border-[#39FF14]/15 shadow-[0_0_12px_rgba(57,255,20,0.02)]' 
                    : 'border-white/5'
                }`}
              >
                {/* Visual Metadata Panel */}
                <div className="space-y-2.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-lg border text-[8px] font-mono font-bold uppercase tracking-widest ${getTypeColor(quiz.type)}`}>
                      {getTypeName(quiz.type)}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 flex items-center">
                      <Clock size={11} className="mr-1" />
                      {quiz.timeLimit / 60} mins
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      • {quiz.totalQuestions} Questions
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-white leading-snug">
                      {quiz.title}
                    </h4>
                    <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                      {quiz.description}
                    </p>
                  </div>

                  {/* History List Metrics sub-panel */}
                  {scores.length > 0 && (
                    <div className="flex items-center space-x-2.5 pt-1 text-[10px] font-mono">
                      <span className="text-slate-500">Attempts: <strong className="text-slate-300">{scores.length}</strong></span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-500">Best Score: 
                        <strong className={hasPassed ? "text-[#39FF14] ml-1" : "text-red-400 ml-1"}>
                          {bestScore}%
                        </strong>
                      </span>
                      <span className="text-slate-500">•</span>
                      <button
                        onClick={() => handleShowPastResult(quiz, scores[scores.length - 1])}
                        className="text-sky-400 hover:underline hover:text-sky-300 font-bold uppercase text-[9px] cursor-pointer"
                      >
                        View Solutions Review
                      </button>
                    </div>
                  )}
                </div>

                {/* Active Controls Launcher */}
                <div className="flex items-center justify-between md:justify-end gap-4 border-t border-white/5 pt-3 md:pt-0 md:border-0 shrink-0">
                  <div className="text-left md:text-right font-mono text-[10px]">
                    <p className="text-slate-500 uppercase">Retries Left</p>
                    <p className={`font-bold mt-0.5 ${remaining === 0 ? 'text-red-400' : 'text-slate-300'}`}>
                      {quiz.maxRetries === -1 ? 'Unlimited' : `${remaining} left`}
                    </p>
                  </div>

                  {hasPassed ? (
                    <button
                      onClick={() => handleLaunchQuiz(quiz)}
                      disabled={isLoadingQuiz}
                      className="px-4 py-2.5 rounded-xl border border-[#39FF14]/30 hover:bg-[#39FF14]/10 text-[#39FF14] text-[10px] font-mono font-extrabold uppercase transition-all flex items-center space-x-1 cursor-pointer"
                    >
                      <RotateCcw size={11} />
                      <span>Re-Take Exam</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleLaunchQuiz(quiz)}
                      disabled={isLoadingQuiz || (remaining <= 0 && quiz.maxRetries !== -1)}
                      className="px-5 py-2.5 rounded-xl bg-[#39FF14] hover:bg-[#32e011] text-black text-[10px] font-mono font-black uppercase transition-all flex items-center space-x-1 cursor-pointer disabled:opacity-20 shadow-[0_4px_12px_rgba(57,255,20,0.15)]"
                    >
                      <Play size={10} fill="currentColor" />
                      <span>Start Assessment</span>
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* 3. In-Progress Overlay taking panel */}
      {activeQuiz && activeAttempt && (
        <PremiumQuizView
          quiz={activeQuiz}
          questions={activeQuestions}
          initialAttempt={activeAttempt}
          userId={userId}
          userName={userName}
          userPhotoURL={userPhotoURL}
          courseId={courseId}
          onClose={() => {
            setActiveQuiz(null);
            setActiveAttempt(null);
            setActiveQuestions([]);
          }}
          onSubmitSuccess={handleQuizSubmitSuccess}
          onShowNotification={onShowNotification}
        />
      )}

      {/* 4. Score Metrics Completed solutions details overlay */}
      {activeResult && activeResultQuiz && (
        <QuizResultsView
          quiz={activeResultQuiz}
          questions={activeResultQuestions}
          result={activeResult}
          userId={userId}
          courseId={courseId}
          onRetry={() => {
            setActiveResult(null);
            setActiveResultQuiz(null);
            setActiveResultQuestions([]);
            handleLaunchQuiz(activeResultQuiz);
          }}
          onClose={() => {
            setActiveResult(null);
            setActiveResultQuiz(null);
            setActiveResultQuestions([]);
          }}
          onShowNotification={onShowNotification}
        />
      )}

    </div>
  );
}
