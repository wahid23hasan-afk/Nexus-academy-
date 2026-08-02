import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  deleteDoc,
  getDoc,
  updateDoc,
  addDoc
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { 
  Quiz, 
  QuizQuestion, 
  QuizAttempt, 
  QuizResult, 
  LeaderboardEntry, 
  AchievementBadge,
  QuizType,
  QuestionType 
} from '../types/quiz';
import { CurriculumChapter } from '../types/course';

// Dynamic sample generator for seeds
const SAMPLE_MOCK_QUESTIONS: Record<string, Omit<QuizQuestion, 'questionId' | 'quizId' | 'sequenceOrder'>[]> = {
  // Course/General standard questions
  general: [
    {
      type: 'mcq',
      questionText: 'Which processor cache optimization strategy avoids thread writing contention across independent cores?',
      options: [
        'A. False Sharing alignment via 64-byte padding',
        'B. Incremental paging limits',
        'C. Direct cache invalidation loops',
        'D. Synchronous thread locking blocks'
      ],
      correctAnswer: '0',
      explanation: 'Maintaining strict spatial and temporal locality and padding critical state to 64 bytes prevents memory bus false sharing, accelerating lookups up to 15x.',
      points: 10
    },
    {
      type: 'true_false',
      questionText: 'Amdahl\'s Law of scalability states that parallelized speedup is limited by the sequential portion of the execution.',
      options: ['True', 'False'],
      correctAnswer: '0',
      explanation: 'Correct. According to Amdahl\'s Law: S(N) = 1 / [ (1 - P) + P/N ], meaning that speedup is strictly capped by the non-parallelizable proportion (1 - P).',
      points: 10
    },
    {
      type: 'mcq',
      questionText: 'What is the minimum quorum majority required to successfully elect a new leader in a 5-node Raft consensus cluster?',
      options: [
        'A. 2 Nodes',
        'B. 3 Nodes',
        'C. 4 Nodes',
        'D. 5 Nodes'
      ],
      correctAnswer: '1',
      explanation: 'Consensus majority quorum is floor(N / 2) + 1. For N = 5, this requires 2 + 1 = 3 node approvals to ensure network-partition safety.',
      points: 10
    },
    {
      type: 'multi_mcq',
      questionText: 'Which of the following database isolation guarantees are properties of the ACID standard? (Select ALL correct options)',
      options: [
        'A. Atomicity',
        'B. Consistency',
        'C. Interoperability',
        'D. Durability'
      ],
      correctAnswer: ['0', '1', '3'],
      explanation: 'ACID stands for Atomicity, Consistency, Isolation, and Durability. Interoperability is not part of ACID constraints.',
      points: 15
    },
    {
      type: 'mcq',
      questionText: 'In Write-Ahead Logging (WAL) databases, when is a user mutation officially committed and safe from catastrophic power failure?',
      options: [
        'A. As soon as memory cache index is updated',
        'B. Once the append-only log is physically flushed to persistent disk (fsync)',
        'C. After the transaction is sent to secondary replicas',
        'D. During the next garbage collection cycle sweep'
      ],
      correctAnswer: '1',
      explanation: 'To guarantee durability, the mutation must be appended to a log and flushed to non-volatile disk via fsync before confirming success.',
      points: 10
    },
    {
      type: 'true_false',
      questionText: 'Relational database schema normalization to Boyce-Codd Normal Form (BCNF) entirely eliminates SQL join overhead queries.',
      options: ['True', 'False'],
      correctAnswer: '1',
      explanation: 'False. Over-normalization segregates metrics into distinct tables, which actually increases SQL join overhead. Denormalization is often done for read performance.',
      points: 10
    },
    {
      type: 'mcq',
      questionText: 'Which kernel event dispatch loop mechanism scales optimally for managing tens of thousands of concurrent client socket file descriptors?',
      options: [
        'A. Traditional select() polling loop',
        'B. Thread-per-connection fork() model',
        'C. epoll (Linux) or kqueue (BSD) multiplexing queues',
        'D. Generational reference tracking sweeps'
      ],
      correctAnswer: '2',
      explanation: 'Multiplexed epoll/kqueue operations scale O(1) with active events rather than O(N) scanning all sockets, preventing heavy OS context-switching.',
      points: 10
    },
    {
      type: 'mcq',
      questionText: 'Which protocol is standard for establishing secure ephemeral session keys during asymmetric cryptography handshake sequences?',
      options: [
        'A. AES-GCM-256 blocks',
        'B. Elliptic Curve Diffie-Hellman Exchange (ECDHE)',
        'C. SHA-256 block hashing',
        'D. Generational garbage memory collection'
      ],
      correctAnswer: '1',
      explanation: 'ECDHE is widely used for dynamic key exchanges to provide perfect forward secrecy in HTTPS/TLS transmissions.',
      points: 10
    },
    {
      type: 'true_false',
      questionText: 'Garbage collection in compiled runtime engines completely eliminates all possibilities of application memory leaks.',
      options: ['True', 'False'],
      correctAnswer: '1',
      explanation: 'False. Even with GC, cyclic references, global scopes, or unclosed events/file descriptors can hold reachable memory references, causing leaks.',
      points: 10
    },
    {
      type: 'mcq',
      questionText: 'According to the Master Theorem template for recurrences T(n) = a*T(n/b) + O(n^d), what is the time complexity when a > b^d?',
      options: [
        'A. O(n^d)',
        'B. O(n^log_b(a))',
        'C. O(n^d * log(n))',
        'D. O(1)'
      ],
      correctAnswer: '1',
      explanation: 'Under Case 1 of the Master Theorem, when a > b^d, the computational bound is dominated by leaf nodes, yielding O(n^log_b(a)).',
      points: 15
    }
  ]
};

export const quizService = {
  // 1. Get/Seed Quizzes for a course
  async getQuizzesForCourse(courseId: string, chapters: CurriculumChapter[]): Promise<Quiz[]> {
    const collName = 'quizzes';
    try {
      const q = query(collection(db, collName), where('courseId', '==', courseId));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        return snap.docs.map(d => d.data() as Quiz);
      }

      // No quizzes exist, let's seed several high-quality quizzes matching current structure
      const seededQuizzes: Quiz[] = [];

      // 1. Course-level Practice Quiz
      const practiceQuiz: Quiz = {
        quizId: `quiz_${courseId}_practice`,
        courseId,
        title: 'Academic Practice Review Quiz',
        type: 'practice',
        description: 'Flexible practice assessment with unlimited retries. Pause is allowed so you can research answers.',
        totalQuestions: 5,
        passingScore: 60,
        timeLimit: 900, // 15 mins
        allowPause: true,
        maxRetries: -1, // Unlimited
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, collName, practiceQuiz.quizId), practiceQuiz);
      seededQuizzes.push(practiceQuiz);

      // 2. Course-level Final Certification Exam
      const finalExam: Quiz = {
        quizId: `quiz_${courseId}_final`,
        courseId,
        title: 'Master Final Certification Exam',
        type: 'final',
        description: 'Official intense final assessment. Timing is strictly enforced, pausing is disabled, and auto-submit triggers upon countdown expiry.',
        totalQuestions: 10,
        passingScore: 75,
        timeLimit: 600, // 10 mins
        allowPause: false,
        maxRetries: 3,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, collName, finalExam.quizId), finalExam);
      seededQuizzes.push(finalExam);

      // 3. Chapter-level Quizzes (one per chapter loaded)
      for (const ch of chapters) {
        const chapterQuiz: Quiz = {
          quizId: `quiz_${courseId}_ch_${ch.chapterId}`,
          courseId,
          chapterId: ch.chapterId,
          chapterTitle: ch.title,
          title: `Chapter Assessment: ${ch.title}`,
          type: 'chapter',
          description: `Consolidated curriculum assessment testing all core modules discussed inside Chapter "${ch.title}".`,
          totalQuestions: 5,
          passingScore: 70,
          timeLimit: 420, // 7 mins
          allowPause: false,
          maxRetries: 5,
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, collName, chapterQuiz.quizId), chapterQuiz);
        seededQuizzes.push(chapterQuiz);

        // 4. Lesson-level Quiz (for the first lesson of each chapter to demonstrate fine-grained testing)
        if (ch.lessons && ch.lessons.length > 0) {
          const firstLesson = ch.lessons[0];
          const lessonQuiz: Quiz = {
            quizId: `quiz_${courseId}_les_${firstLesson.lessonId}`,
            courseId,
            chapterId: ch.chapterId,
            chapterTitle: ch.title,
            lessonId: firstLesson.lessonId,
            lessonTitle: firstLesson.title,
            title: `Quick Class Quiz: ${firstLesson.title}`,
            type: 'lesson',
            description: `A fast 3-question evaluation to solidify your immediately acquired core understanding.`,
            totalQuestions: 3,
            passingScore: 66,
            timeLimit: 180, // 3 mins
            allowPause: true,
            maxRetries: -1,
            createdAt: new Date().toISOString()
          };
          await setDoc(doc(db, collName, lessonQuiz.quizId), lessonQuiz);
          seededQuizzes.push(lessonQuiz);
        }
      }

      return seededQuizzes;
    } catch (err) {
      console.warn('getQuizzesForCourse failed, loading local fallback:', err);
      return [];
    }
  },

  // 2. Get/Seed Questions for a Quiz
  async getQuestionsForQuiz(quizId: string): Promise<QuizQuestion[]> {
    const collName = 'questions';
    try {
      const q = query(collection(db, collName), where('quizId', '==', quizId));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        return snap.docs.map(d => d.data() as QuizQuestion).sort((a, b) => a.sequenceOrder - b.sequenceOrder);
      }

      // No questions found, let's seed them matching the quiz totalQuestions
      // Let's determine how many questions we need
      let count = 5;
      if (quizId.includes('_final')) count = 10;
      else if (quizId.includes('_les_')) count = 3;

      const seededQuestions: QuizQuestion[] = [];
      const samples = SAMPLE_MOCK_QUESTIONS.general;

      for (let i = 0; i < count; i++) {
        const sampleIndex = i % samples.length;
        const sample = samples[sampleIndex];

        const question: QuizQuestion = {
          questionId: `q_${quizId}_${i + 1}`,
          quizId,
          type: sample.type as QuestionType,
          questionText: sample.questionText,
          options: sample.options,
          correctAnswer: sample.correctAnswer,
          explanation: sample.explanation,
          points: sample.points,
          sequenceOrder: i + 1
        };

        await setDoc(doc(db, collName, question.questionId), question);
        seededQuestions.push(question);
      }

      return seededQuestions;
    } catch (err) {
      console.warn('getQuestionsForQuiz failed:', err);
      return [];
    }
  },

  // 3. Manage Attempts (Starts/Resumes an active attempt)
  async startQuizAttempt(userId: string, quizId: string, durationLimit: number): Promise<QuizAttempt> {
    const collName = 'quizAttempts';
    const attemptId = `${userId}_${quizId}_active`;
    try {
      const docRef = doc(db, collName, attemptId);
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        // Resume existing active attempt
        return snap.data() as QuizAttempt;
      }

      // Create fresh active attempt
      const attempt: QuizAttempt = {
        attemptId,
        quizId,
        userId,
        startedAt: new Date().toISOString(),
        status: 'progress',
        currentQuestionIndex: 0,
        answers: {},
        flaggedForReview: [],
        timeLeft: durationLimit
      };

      await setDoc(docRef, attempt);
      return attempt;
    } catch (err) {
      console.warn('startQuizAttempt Firestore failed, using local caching:', err);
      
      // LocalStorage Fallback
      const localKey = `nexus_quiz_attempt_${userId}_${quizId}`;
      const local = localStorage.getItem(localKey);
      if (local) {
        return JSON.parse(local) as QuizAttempt;
      }

      const attempt: QuizAttempt = {
        attemptId,
        quizId,
        userId,
        startedAt: new Date().toISOString(),
        status: 'progress',
        currentQuestionIndex: 0,
        answers: {},
        flaggedForReview: [],
        timeLeft: durationLimit
      };
      localStorage.setItem(localKey, JSON.stringify(attempt));
      return attempt;
    }
  },

  // 4. Save attempt state real-time (Answers saved as they click)
  async saveQuizAttemptAnswer(
    attemptId: string, 
    questionId: string, 
    answer: string | string[], 
    timeLeft: number,
    currentIndex: number
  ): Promise<void> {
    try {
      const docRef = doc(db, 'quizAttempts', attemptId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const currentData = snap.data() as QuizAttempt;
        const updatedAnswers = { ...currentData.answers, [questionId]: answer };
        await updateDoc(docRef, {
          answers: updatedAnswers,
          timeLeft,
          currentQuestionIndex: currentIndex
        });
      }
    } catch (err) {
      console.warn('saveQuizAttemptAnswer Firestore update failed:', err);
    }

    // LocalStorage Fallback sync
    try {
      const quizId = (attemptId || '').split('_active')[0].replace(`${auth.currentUser?.uid || 'anonymous'}_`, '');
      const localKey = `nexus_quiz_attempt_${auth.currentUser?.uid || 'anonymous'}_${quizId}`;
      const local = localStorage.getItem(localKey);
      if (local) {
        const attempt = JSON.parse(local) as QuizAttempt;
        attempt.answers[questionId] = answer;
        attempt.timeLeft = timeLeft;
        attempt.currentQuestionIndex = currentIndex;
        localStorage.setItem(localKey, JSON.stringify(attempt));
      }
    } catch (lsErr) {
      console.warn('LocalStorage save failed:', lsErr);
    }
  },

  // 5. Toggle flag for review
  async toggleFlaggedQuestion(attemptId: string, questionId: string, isFlagged: boolean): Promise<void> {
    try {
      const docRef = doc(db, 'quizAttempts', attemptId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const currentData = snap.data() as QuizAttempt;
        let updatedFlagged = [...(currentData.flaggedForReview || [])];
        if (isFlagged) {
          if (!updatedFlagged.includes(questionId)) updatedFlagged.push(questionId);
        } else {
          updatedFlagged = updatedFlagged.filter(id => id !== questionId);
        }
        await updateDoc(docRef, {
          flaggedForReview: updatedFlagged
        });
      }
    } catch (err) {
      console.warn('toggleFlaggedQuestion Firestore update failed:', err);
    }

    // LocalStorage sync
    try {
      const quizId = (attemptId || '').split('_active')[0].replace(`${auth.currentUser?.uid || 'anonymous'}_`, '');
      const localKey = `nexus_quiz_attempt_${auth.currentUser?.uid || 'anonymous'}_${quizId}`;
      const local = localStorage.getItem(localKey);
      if (local) {
        const attempt = JSON.parse(local) as QuizAttempt;
        let updatedFlagged = [...(attempt.flaggedForReview || [])];
        if (isFlagged) {
          if (!updatedFlagged.includes(questionId)) updatedFlagged.push(questionId);
        } else {
          updatedFlagged = updatedFlagged.filter(id => id !== questionId);
        }
        attempt.flaggedForReview = updatedFlagged;
        localStorage.setItem(localKey, JSON.stringify(attempt));
      }
    } catch (lsErr) {
      console.warn('LocalStorage flag sync failed:', lsErr);
    }
  },

  // 6. Submit Quiz and calculate scores/results, unlock chapter, unlock achievements
  async submitQuizAttempt(
    userId: string,
    courseId: string,
    attempt: QuizAttempt,
    questions: QuizQuestion[],
    quiz: Quiz,
    userName = 'Scholar',
    userPhotoURL?: string
  ): Promise<QuizResult> {
    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;
    let totalPoints = 0;
    let score = 0;

    questions.forEach(q => {
      totalPoints += q.points;
      const studentAns = attempt.answers[q.questionId];

      if (studentAns === undefined || studentAns === null || studentAns === '') {
        skippedCount++;
      } else if (Array.isArray(studentAns)) {
        // Multi MCQ array comparison
        const correctArray = Array.isArray(q.correctAnswer) 
          ? q.correctAnswer 
          : [q.correctAnswer as string];
        const isCorrect = correctArray.length === studentAns.length &&
          correctArray.every(val => studentAns.includes(val));
        
        if (isCorrect) {
          correctCount++;
          score += q.points;
        } else {
          wrongCount++;
        }
      } else {
        // Single MCQ/TrueFalse string comparison
        if (String(studentAns) === String(q.correctAnswer)) {
          correctCount++;
          score += q.points;
        } else {
          wrongCount++;
        }
      }
    });

    const percentage = Math.round((score / (totalPoints || 1)) * 100);
    const passed = percentage >= quiz.passingScore;

    const timeTaken = Math.max(0, quiz.timeLimit - attempt.timeLeft);

    const resultId = `res_${userId}_${quiz.quizId}_${Date.now()}`;
    const resultDoc: QuizResult = {
      resultId,
      attemptId: attempt.attemptId,
      quizId: quiz.quizId,
      userId,
      courseId,
      score,
      totalPoints,
      percentage,
      passed,
      correctCount,
      wrongCount,
      skippedCount,
      timeTaken,
      completedAt: new Date().toISOString()
    };

    // 1. Write Result document
    try {
      await setDoc(doc(db, 'quizResults', resultId), resultDoc);
      // Clean up the active attempt document
      await deleteDoc(doc(db, 'quizAttempts', attempt.attemptId));
    } catch (err) {
      console.warn('Firestore write/delete failed during submit:', err);
    }

    // Always mirror to LocalStorage
    localStorage.setItem(`nexus_quiz_result_${resultId}`, JSON.stringify(resultDoc));
    localStorage.removeItem(`nexus_quiz_attempt_${userId}_${quiz.quizId}`);

    // Update retry stats & history metrics
    const resultsKey = `nexus_quiz_all_results_${userId}`;
    const allResults = JSON.parse(localStorage.getItem(resultsKey) || '[]');
    allResults.push(resultDoc);
    localStorage.setItem(resultsKey, JSON.stringify(allResults));

    // 2. Write to Leaderboard collection if score is high quality
    if (passed) {
      const entryId = `lbl_${userId}_${quiz.quizId}`;
      const leaderboardDoc: LeaderboardEntry = {
        entryId,
        quizId: quiz.quizId,
        courseId,
        userId,
        studentName: userName,
        studentPhotoURL: userPhotoURL,
        score,
        percentage,
        completionTime: timeTaken,
        completedAt: resultDoc.completedAt
      };

      try {
        await setDoc(doc(db, 'leaderboards', entryId), leaderboardDoc);
      } catch (err) {
        console.warn('Leaderboard write failed:', err);
      }

      // Save locally too
      const localLeaderboards = JSON.parse(localStorage.getItem(`nexus_leaderboards_${quiz.quizId}`) || '[]');
      const existingIdx = localLeaderboards.findIndex((l: any) => l.userId === userId);
      if (existingIdx > -1) {
        if (score > localLeaderboards[existingIdx].score) {
          localLeaderboards[existingIdx] = leaderboardDoc;
        }
      } else {
        localLeaderboards.push(leaderboardDoc);
      }
      localStorage.setItem(`nexus_leaderboards_${quiz.quizId}`, JSON.stringify(localLeaderboards));
    }

    // 3. Achievement Badges check
    try {
      const badges: AchievementBadge[] = [];

      // A. Perfect Score badge
      if (percentage === 100) {
        const badge: AchievementBadge = {
          achievementId: `ach_${userId}_perfect_${quiz.quizId}`,
          userId,
          quizId: quiz.quizId,
          courseId,
          badgeType: 'perfect_score',
          title: 'Perfect Score 🎯',
          description: `Scored an flawless 100% on "${quiz.title}" assessment!`,
          unlockedAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'achievements', badge.achievementId), badge);
        badges.push(badge);
      }

      // B. Fast Learner badge (less than 25% of allowed time taken)
      if (passed && timeTaken < (quiz.timeLimit * 0.25)) {
        const badge: AchievementBadge = {
          achievementId: `ach_${userId}_fast_${quiz.quizId}`,
          userId,
          quizId: quiz.quizId,
          courseId,
          badgeType: 'fast_learner',
          title: 'Fast Learner ⚡',
          description: `Passed "${quiz.title}" in record speed taking less than a quarter of the limit!`,
          unlockedAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'achievements', badge.achievementId), badge);
        badges.push(badge);
      }

      // C. Quiz Master badge (if they passed 3 distinct quizzes in this course)
      const passedCount = allResults.filter((r: QuizResult) => r.courseId === courseId && r.passed).length;
      if (passedCount >= 3) {
        const badge: AchievementBadge = {
          achievementId: `ach_${userId}_master_${courseId}`,
          userId,
          courseId,
          badgeType: 'quiz_master',
          title: 'Quiz Master 👑',
          description: `Unlocked by successfully passing 3 or more assessments inside the curriculum!`,
          unlockedAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'achievements', badge.achievementId), badge);
        badges.push(badge);
      }

      if (badges.length > 0) {
        const localBadges = JSON.parse(localStorage.getItem(`nexus_achievements_${userId}_${courseId}`) || '[]');
        badges.forEach(b => {
          if (!localBadges.some((lb: any) => lb.achievementId === b.achievementId)) {
            localBadges.push(b);
          }
        });
        localStorage.setItem(`nexus_achievements_${userId}_${courseId}`, JSON.stringify(localBadges));
      }
    } catch (achErr) {
      console.warn('Silent achievement badge logic failed:', achErr);
    }

    return resultDoc;
  },

  // 7. Get leaderboard entries for a quiz
  async getLeaderboard(quizId: string): Promise<LeaderboardEntry[]> {
    try {
      const q = query(
        collection(db, 'leaderboards'),
        where('quizId', '==', quizId)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const results = snap.docs.map(d => d.data() as LeaderboardEntry);
        // Sort descending by score, then ascending by time taken
        return results.sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return a.completionTime - b.completionTime;
        }).map((entry, idx) => ({ ...entry, rank: idx + 1 }));
      }
    } catch (err) {
      console.warn('getLeaderboard Firestore query failed:', err);
    }

    // Local Storage Fallback
    const local = JSON.parse(localStorage.getItem(`nexus_leaderboards_${quizId}`) || '[]');
    const items = local as LeaderboardEntry[];
    return items.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.completionTime - b.completionTime;
    }).map((entry, idx) => ({ ...entry, rank: idx + 1 }));
  },

  // 8. Get achievements
  async getAchievements(userId: string, courseId: string): Promise<AchievementBadge[]> {
    try {
      const q = query(
        collection(db, 'achievements'),
        where('userId', '==', userId),
        where('courseId', '==', courseId)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs.map(d => d.data() as AchievementBadge);
      }
    } catch (err) {
      console.warn('getAchievements Firestore query failed:', err);
    }

    return JSON.parse(localStorage.getItem(`nexus_achievements_${userId}_${courseId}`) || '[]');
  },

  // 9. Get retry counts remaining for a student
  async getRetryCountRemaining(userId: string, quiz: Quiz): Promise<number> {
    if (quiz.maxRetries === -1) return 999;
    
    // Sum attempts from results
    try {
      const resultsKey = `nexus_quiz_all_results_${userId}`;
      const allResults = JSON.parse(localStorage.getItem(resultsKey) || '[]');
      const matches = allResults.filter((r: QuizResult) => r.quizId === quiz.quizId);
      return Math.max(0, quiz.maxRetries - matches.length);
    } catch (err) {
      return quiz.maxRetries;
    }
  }
};
