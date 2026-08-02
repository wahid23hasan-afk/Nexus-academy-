export type QuizType = 'chapter' | 'lesson' | 'practice' | 'final';

export type QuestionType = 'mcq' | 'multi_mcq' | 'true_false' | 'fill_in_blank' | 'short_answer';

export interface Quiz {
  quizId: string;
  courseId: string;
  chapterId?: string; // Optional if course-level / final / practice
  lessonId?: string;  // Optional if chapter-level / final / practice
  title: string;
  chapterTitle?: string;
  lessonTitle?: string;
  type: QuizType;
  description: string;
  totalQuestions: number;
  passingScore: number; // percentage, e.g. 70
  timeLimit: number; // in seconds, e.g. 600 for 10 mins
  allowPause: boolean;
  maxRetries: number; // e.g. 3, or -1 for unlimited
  createdAt: string;
}

export interface QuizQuestion {
  questionId: string;
  quizId: string;
  type: QuestionType;
  questionText: string;
  options?: string[]; // Required for mcq and multi_mcq
  correctAnswer: string | string[]; // Single string index for mcq/true_false, array of index strings for multi_mcq
  explanation: string;
  points: number;
  sequenceOrder: number;
}

export interface QuizAttempt {
  attemptId: string;
  quizId: string;
  userId: string;
  startedAt: string;
  completedAt?: string;
  status: 'progress' | 'completed' | 'expired';
  currentQuestionIndex: number;
  answers: Record<string, string | string[]>; // questionId -> answer index/indices or text
  flaggedForReview: string[]; // questionId[]
  timeLeft: number; // in seconds
}

export interface QuizResult {
  resultId: string;
  attemptId: string;
  quizId: string;
  userId: string;
  courseId: string;
  score: number; // achieved raw score points
  totalPoints: number; // max possible score points
  percentage: number; // achieved score percentage
  passed: boolean;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  timeTaken: number; // in seconds
  completedAt: string;
}

export interface LeaderboardEntry {
  entryId: string;
  quizId: string;
  courseId: string;
  userId: string;
  studentName: string;
  studentPhotoURL?: string;
  score: number;
  percentage: number;
  completionTime: number; // time taken in seconds
  completedAt: string;
  rank?: number; // Calculated on-the-fly or stored
}

export interface AchievementBadge {
  achievementId: string;
  userId: string;
  quizId?: string;
  courseId: string;
  badgeType: 'perfect_score' | 'fast_learner' | 'quiz_master';
  title: string;
  description: string;
  unlockedAt: string;
}
