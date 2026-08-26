import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Trophy, 
  X, 
  Award, 
  CheckCircle, 
  XCircle, 
  HelpCircle, 
  Clock, 
  RotateCcw, 
  List, 
  Star,
  Users,
  Search,
  BookOpen,
  ArrowRight,
  TrendingUp,
  ChevronRight,
  Zap
} from 'lucide-react';
import { Quiz, QuizQuestion, QuizResult, LeaderboardEntry, AchievementBadge } from '../types/quiz';
import { quizService } from '../services/quizService';

interface QuizResultsViewProps {
  quiz: Quiz;
  questions: QuizQuestion[];
  result: QuizResult;
  userId: string;
  courseId: string;
  onRetry: () => void;
  onClose: () => void;
  onShowNotification: (message: string, type: 'success' | 'error') => void;
}

export function QuizResultsView({
  quiz,
  questions,
  result,
  userId,
  courseId,
  onRetry,
  onClose,
  onShowNotification
}: QuizResultsViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'review' | 'leaderboard'>('overview');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [achievements, setAchievements] = useState<AchievementBadge[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState<boolean>(false);

  // Load Leaderboard and Achievements
  useEffect(() => {
    async function loadStats() {
      setIsLoadingLeaderboard(true);
      try {
        const [lbl, achs] = await Promise.all([
          quizService.getLeaderboard(quiz.quizId),
          quizService.getAchievements(userId, courseId)
        ]);
        setLeaderboard(lbl);
        setAchievements(achs.filter(a => a.quizId === quiz.quizId || a.courseId === courseId));
      } catch (err) {
        console.warn('Failed loading scoreboard metrics:', err);
      } finally {
        setIsLoadingLeaderboard(false);
      }
    }
    loadStats();
  }, [quiz.quizId, userId, courseId]);

  // Circle stroke calculations
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (result.percentage / 100) * circumference;

  const passed = result.passed;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#040812] text-slate-100 font-sans" id="quiz-results-overlay">
      {/* Container Wrapper */}
      <div className="max-w-2xl mx-auto px-4 py-8 min-h-screen flex flex-col justify-between">
        
        {/* Top Header */}
        <header className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
          <div>
            <h3 className="text-xs font-mono uppercase tracking-widest text-slate-400">Assessment Complete</h3>
            <h1 className="text-base font-extrabold text-white mt-1">{quiz.title}</h1>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </header>

        {/* Tab Selector Buttons */}
        <div className="flex border-b border-white/5 mb-6 text-xs font-mono">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-3 text-center border-b-2 font-bold transition-all ${
              activeTab === 'overview' 
                ? 'border-[#39FF14] text-[#39FF14]' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp size={13} className="inline mr-1.5" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('review')}
            className={`flex-1 py-3 text-center border-b-2 font-bold transition-all ${
              activeTab === 'review' 
                ? 'border-[#39FF14] text-[#39FF14]' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen size={13} className="inline mr-1.5" />
            Detailed Review
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex-1 py-3 text-center border-b-2 font-bold transition-all ${
              activeTab === 'leaderboard' 
                ? 'border-[#39FF14] text-[#39FF14]' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users size={13} className="inline mr-1.5" />
            Scoreboard ({leaderboard.length})
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1">
          {activeTab === 'overview' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Radial Progress Graphic & Outcome Badge */}
              <div className="bg-gradient-to-b from-[#0a1124] to-[#060b17] border border-white/5 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-around space-y-6 md:space-y-0">
                
                {/* Score Circle */}
                <div className="relative flex items-center justify-center w-36 h-36">
                  <svg className="w-full h-full transform -rotate-90">
                    {/* Background Track */}
                    <circle
                      cx="72"
                      cy="72"
                      r={radius}
                      className="text-white/5"
                      strokeWidth="10"
                      stroke="currentColor"
                      fill="transparent"
                    />
                    {/* Progress Track */}
                    <circle
                      cx="72"
                      cy="72"
                      r={radius}
                      className={passed ? "text-[#39FF14]" : "text-red-500"}
                      strokeWidth="10"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="transparent"
                      style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                    />
                  </svg>
                  
                  {/* Center Score Text */}
                  <div className="absolute flex flex-col items-center">
                    <span className="text-3xl font-black font-mono leading-none">{result.percentage}%</span>
                    <span className="text-[9px] font-mono uppercase text-slate-400 tracking-wider mt-1">
                      {result.score}/{result.totalPoints} PTS
                    </span>
                  </div>
                </div>

                {/* Outcome Statement Card */}
                <div className="text-center md:text-left space-y-3 max-w-xs">
                  <div className="flex flex-col md:flex-row items-center md:space-x-2">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-mono font-extrabold uppercase ${
                      passed 
                        ? 'bg-[#39FF14]/10 border border-[#39FF14]/20 text-[#39FF14]' 
                        : 'bg-red-500/10 border border-red-500/20 text-red-400'
                    }`}>
                      {passed ? 'Passed 🎉' : 'Failed ❌'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono mt-1 md:mt-0">
                      Required score: {quiz.passingScore}%
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white">
                    {passed 
                      ? 'Congratulations! You unlocked subsequent academic files.' 
                      : 'You did not satisfy the minimum evaluation criteria.'}
                  </h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {passed 
                      ? 'Exceptional metrics! This score has been logged to the course record ledger and catalog rankings.'
                      : 'Review lesson references in the Review tab to reinforce critical spatial structures.'}
                  </p>
                </div>
              </div>

              {/* Metrics Grid Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#080e1a]/80 border border-white/5 rounded-2xl p-4 text-center">
                  <CheckCircle size={18} className="text-[#39FF14] mx-auto mb-1.5" />
                  <p className="text-[10px] font-mono text-slate-400 uppercase">Correct</p>
                  <h4 className="text-sm font-bold mt-0.5">{result.correctCount}</h4>
                </div>

                <div className="bg-[#080e1a]/80 border border-white/5 rounded-2xl p-4 text-center">
                  <XCircle size={18} className="text-red-400 mx-auto mb-1.5" />
                  <p className="text-[10px] font-mono text-slate-400 uppercase">Wrong</p>
                  <h4 className="text-sm font-bold mt-0.5">{result.wrongCount}</h4>
                </div>

                <div className="bg-[#080e1a]/80 border border-white/5 rounded-2xl p-4 text-center">
                  <HelpCircle size={18} className="text-slate-400 mx-auto mb-1.5" />
                  <p className="text-[10px] font-mono text-slate-400 uppercase">Skipped</p>
                  <h4 className="text-sm font-bold mt-0.5">{result.skippedCount}</h4>
                </div>

                <div className="bg-[#080e1a]/80 border border-white/5 rounded-2xl p-4 text-center">
                  <Clock size={18} className="text-sky-400 mx-auto mb-1.5" />
                  <p className="text-[10px] font-mono text-slate-400 uppercase">Time Taken</p>
                  <h4 className="text-sm font-bold mt-0.5">
                    {Math.floor(result.timeTaken / 60)}m {result.timeTaken % 60}s
                  </h4>
                </div>
              </div>

              {/* Achievements Rewards Section */}
              {achievements.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center">
                    <Star size={11} className="mr-1 text-amber-400" />
                    Unlocked Milestones
                  </h4>

                  <div className="grid gap-2.5">
                    {achievements.map((ach) => (
                      <div 
                        key={ach.achievementId} 
                        className="bg-gradient-to-r from-amber-500/5 to-transparent border border-amber-500/10 rounded-2xl p-3 flex items-center space-x-3"
                      >
                        <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 shrink-0 border border-amber-500/20">
                          <Award size={16} />
                        </div>
                        <div>
                          <h5 className="text-[11px] font-bold text-amber-400">{ach.title}</h5>
                          <p className="text-[10px] text-slate-300 leading-none mt-1">{ach.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'review' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <p className="text-[10px] font-mono text-slate-500 uppercase">
                Questions Breakdown & Solutions Guide
              </p>

              <div className="space-y-4">
                {questions.map((q, idx) => {
                  const studentAns = result.attemptId 
                    ? null // If active attempt details are lost we look at local structures or keep it simple
                    : null;
                  
                  // Safe indexing
                  const correctIdxStr = String(q.correctAnswer);
                  const correctStr = q.options ? q.options[Number(q.correctAnswer)] : String(q.correctAnswer);

                  return (
                    <div 
                      key={q.questionId} 
                      className="bg-[#070c17] border border-white/5 rounded-2xl p-4 space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">
                          Question {idx + 1}
                        </span>
                        <span className="text-[9px] font-mono text-[#39FF14] bg-[#39FF14]/5 px-2 py-0.5 rounded border border-[#39FF14]/20">
                          +{q.points} Points
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-white">{q.questionText}</h4>

                      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 text-[11px] space-y-1">
                        <div className="font-bold text-[#39FF14] font-mono flex items-center">
                          <CheckCircle size={12} className="mr-1.5" />
                          Correct Answer:
                        </div>
                        <p className="text-slate-300">{correctStr}</p>
                      </div>

                      {/* Explanation Callout */}
                      <div className="bg-[#101930] border border-white/5 rounded-xl p-3 text-[11px] leading-relaxed space-y-1">
                        <div className="font-bold text-slate-300 font-mono flex items-center">
                          <Zap size={12} className="mr-1.5 text-amber-400" />
                          Academic Explanation:
                        </div>
                        <p className="text-slate-400">{q.explanation}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeTab === 'leaderboard' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 uppercase">
                <span>Classroom Rank Leaders</span>
                <span>Sorted by accuracy & speed</span>
              </div>

              {isLoadingLeaderboard ? (
                <div className="py-12 text-center text-[10px] font-mono text-slate-500">
                  FETCHING LEDGER RANKS...
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-white/5 rounded-2xl text-[10px] font-mono text-slate-500">
                  NO LEADERBOARD SCORES LOGGED YET
                </div>
              ) : (
                <div className="bg-[#070c17] border border-white/5 rounded-3xl overflow-hidden divide-y divide-white/5">
                  {leaderboard.map((entry, idx) => {
                    const isSelf = entry.userId === userId;
                    const rank = idx + 1;

                    return (
                      <div 
                        key={entry.entryId} 
                        className={`p-3 flex items-center justify-between transition-colors ${
                          isSelf ? 'bg-[#39FF14]/5 text-[#39FF14]' : 'hover:bg-white/[0.01]'
                        }`}
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          {/* Rank Icon */}
                          <div className={`w-6 h-6 font-mono font-black text-xs rounded-full flex items-center justify-center shrink-0 ${
                            rank === 1 
                              ? 'bg-amber-400 text-black shadow-[0_0_8px_rgba(251,191,36,0.4)]' 
                              : rank === 2 
                              ? 'bg-slate-300 text-black' 
                              : rank === 3 
                              ? 'bg-amber-700 text-white' 
                              : 'bg-white/5 text-slate-400'
                          }`}>
                            {rank}
                          </div>

                          {/* Profile Picture */}
                          <div className="w-7 h-7 rounded-full bg-slate-800 border border-white/10 overflow-hidden shrink-0">
                            {entry.studentPhotoURL?.trim() ? (
                              <img src={entry.studentPhotoURL.trim()} alt={entry.studentName} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-white font-mono">
                                {entry.studentName.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>

                          <span className="text-[11px] font-bold truncate">
                            {entry.studentName} {isSelf && '(You)'}
                          </span>
                        </div>

                        {/* Metrics score and duration */}
                        <div className="flex items-center space-x-4 font-mono shrink-0">
                          <div className="text-right">
                            <p className="text-[11px] font-bold">{entry.percentage}%</p>
                            <p className="text-[9px] text-slate-500">
                              {Math.floor(entry.completionTime / 60)}m {entry.completionTime % 60}s
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Bottom Actions Row */}
        <footer className="mt-8 pt-6 border-t border-white/5 flex flex-col sm:flex-row gap-3">
          <button
            onClick={onRetry}
            className="flex-1 py-3 border border-white/10 hover:border-white/20 bg-white/5 rounded-2xl text-xs font-mono font-extrabold uppercase transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <RotateCcw size={13} />
            <span>Retry Assessment</span>
          </button>

          <button
            onClick={onClose}
            className="flex-1 py-3 bg-[#39FF14] hover:bg-[#32e011] text-black rounded-2xl text-xs font-mono font-extrabold uppercase transition-all flex items-center justify-center space-x-1 shadow-[0_4px_12px_rgba(57,255,20,0.2)] cursor-pointer"
          >
            <span>Close Metrics</span>
            <ChevronRight size={13} />
          </button>
        </footer>

      </div>
    </div>
  );
}
