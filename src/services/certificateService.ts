import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  query, 
  where, 
  getDoc,
  deleteDoc,
  addDoc
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { 
  Certificate, 
  CertificateTemplate, 
  CertificateVerification, 
  CourseCompletionRecord 
} from '../types/certificate';
import { quizService } from './quizService';
import { progressService } from './progressService';

export const certificateService = {
  // 1. Check if course meets all completion criteria
  async checkCourseCompletion(userId: string, courseId: string, chapters: any[]): Promise<{
    completed: boolean;
    lessonsCompleted: number;
    totalLessons: number;
    quizzesPassedCount: number;
    totalQuizzesCount: number;
    reason?: string;
  }> {
    // A. Check enrollment
    const myCourseRelation = await progressService.getCourseProgress(userId, courseId);
    if (!myCourseRelation) {
      return {
        completed: false,
        lessonsCompleted: 0,
        totalLessons: 0,
        quizzesPassedCount: 0,
        totalQuizzesCount: 0,
        reason: 'User is not officially enrolled in this course.'
      };
    }

    // B. Calculate lesson count completion
    let totalLessonsCount = 0;
    chapters.forEach(ch => {
      totalLessonsCount += ch.lessons?.length || 0;
    });

    const lessonProgresses = await progressService.getLessonProgresses(userId, courseId);
    const lessonsCompletedCount = lessonProgresses.filter(l => l.completed).length;

    // Check 100% required lessons
    const lessonsOk = totalLessonsCount > 0 && lessonsCompletedCount >= totalLessonsCount;

    // C. Calculate quizzes passed count
    // Fetch all quizzes for this course
    const courseQuizzes = await quizService.getQuizzesForCourse(courseId, chapters);
    const requiredQuizzes = courseQuizzes.filter(q => q.type === 'chapter' || q.type === 'final');
    
    // Fetch all quiz results for this user
    const resultsKey = `nexus_quiz_all_results_${userId}`;
    const allResults = JSON.parse(localStorage.getItem(resultsKey) || '[]');
    const courseResults = allResults.filter((r: any) => r.courseId === courseId);

    let quizzesPassedCount = 0;
    requiredQuizzes.forEach(q => {
      const hasPassedQuiz = courseResults.some((r: any) => r.quizId === q.quizId && r.passed);
      if (hasPassedQuiz) {
        quizzesPassedCount++;
      }
    });

    const quizzesOk = requiredQuizzes.length === 0 || quizzesPassedCount >= requiredQuizzes.length;

    const completed = lessonsOk && quizzesOk;

    return {
      completed,
      lessonsCompleted: lessonsCompletedCount,
      totalLessons: totalLessonsCount,
      quizzesPassedCount,
      totalQuizzesCount: requiredQuizzes.length,
      reason: !lessonsOk 
        ? 'Some lessons are not fully completed. Ensure you watch all video materials.' 
        : !quizzesOk 
        ? 'Some required chapter assessments or the final exam have not been passed yet.' 
        : undefined
    };
  },

  // 2. Generate certificate if not already generated
  async generateCertificate(
    userId: string, 
    courseId: string, 
    studentName: string, 
    courseName: string, 
    instructorName: string,
    chapters: any[]
  ): Promise<Certificate | null> {
    const certId = `cert_${userId}_${courseId}`;
    try {
      // Check if already exists
      const docRef = doc(db, 'certificates', certId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as Certificate;
      }
    } catch (err) {
      console.warn('Firestore fetch failed for checking certificate, checking local storage:', err);
    }

    const localCerts = JSON.parse(localStorage.getItem('nexus_certificates') || '[]');
    const existingLocal = localCerts.find((c: any) => c.certificateId === certId);
    if (existingLocal) {
      return existingLocal;
    }

    // Check completion criteria
    const check = await this.checkCourseCompletion(userId, courseId, chapters);
    if (!check.completed) {
      console.warn('Cannot generate certificate: criteria not satisfied yet.');
      return null;
    }

    // Generate fresh certificate and verification ID
    const verificationId = `verify_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const nowISO = new Date().toISOString();

    const certificate: Certificate = {
      id: certId,
      certificateId: certId,
      certificateNumber: certId,
      userId,
      studentName,
      courseId,
      courseName,
      courseTitle: courseName,
      instructorName,
      completionDate: nowISO,
      issueDate: nowISO,
      issuedAt: nowISO, // Fallback, will be replaced by serverTimestamp if possible
      verificationId,
      isVerified: true,
      qrCodePlaceholderUrl: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
        `${window.location.origin}/verify/${verificationId}`
      )}`,
      signaturePlaceholderUrl: 'https://images.unsplash.com/photo-1581090464762-c43c2c99d4f0?auto=format&fit=crop&q=80&w=200', // Signature mock line
      templateId: 'template_nexus_dark_gold'
    };

    const verificationRecord: CertificateVerification = {
      verificationId,
      certificateId: certId,
      studentName,
      courseName,
      issueDate: nowISO,
      verificationStatus: 'valid',
      institution: 'Nexus Academy of Advanced Technology'
    };

    const completionRecord: CourseCompletionRecord = {
      completionId: `compl_${userId}_${courseId}`,
      userId,
      courseId,
      lessonsCompleted: check.lessonsCompleted,
      totalLessons: check.totalLessons,
      quizzesPassedCount: check.quizzesPassedCount,
      totalQuizzesCount: check.totalQuizzesCount,
      completedAt: nowISO,
      status: 'completed'
    };

    // Save to Firestore
    try {
      const { serverTimestamp } = await import('firebase/firestore');
      const certToSave = {
        ...certificate,
        issuedAt: serverTimestamp()
      };
      await setDoc(doc(db, 'certificates', certId), certToSave);
      await setDoc(doc(db, 'certificateVerification', verificationId), verificationRecord);
      await setDoc(doc(db, 'courseCompletion', completionRecord.completionId), completionRecord);
    } catch (err) {
      console.warn('Firestore writes failed for certificate generation, storing locally:', err);
    }

    // Save to LocalStorage fallbacks
    localCerts.push(certificate);
    localStorage.setItem('nexus_certificates', JSON.stringify(localCerts));

    const localVerifications = JSON.parse(localStorage.getItem('nexus_cert_verifications') || '[]');
    localVerifications.push(verificationRecord);
    localStorage.setItem('nexus_cert_verifications', JSON.stringify(localVerifications));

    const localCompletions = JSON.parse(localStorage.getItem('nexus_course_completions') || '[]');
    localCompletions.push(completionRecord);
    localStorage.setItem('nexus_course_completions', JSON.stringify(localCompletions));

    return certificate;
  },

  // Get template settings from Firestore
  async getCertificateSettings(): Promise<any> {
    try {
      const snap = await getDoc(doc(db, 'settings', 'certificates'));
      if (snap.exists()) {
        return snap.data();
      }
    } catch (err) {
      console.warn('Failed to fetch certificate settings', err);
    }
    return {
      instituteName: 'Nexus Academy of Advanced Technology',
      signatureName: 'Dr. John Doe',
      signatureTitle: 'Director of Education'
    };
  },

  // 3. Get specific certificate for user and course
  async getCertificate(userId: string, courseId: string): Promise<Certificate | null> {
    const certId = `cert_${userId}_${courseId}`;
    try {
      const docRef = doc(db, 'certificates', certId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as Certificate;
      }
    } catch (err) {
      console.warn('Firestore fetch failed for single certificate:', err);
    }

    const localCerts = JSON.parse(localStorage.getItem('nexus_certificates') || '[]');
    const found = localCerts.find((c: any) => c.certificateId === certId || (c.userId === userId && c.courseId === courseId));
    return found || null;
  },

  // 4. Get all certificates for a student
  async getUserCertificates(userId: string): Promise<Certificate[]> {
    try {
      const q = query(collection(db, 'certificates'), where('userId', '==', userId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const results = snap.docs.map(d => d.data() as Certificate);
        localStorage.setItem('nexus_certificates', JSON.stringify(results));
        return results;
      }
    } catch (err) {
      console.warn('Firestore fetch failed for user certificates, reading from local cache:', err);
    }

    const localCerts = JSON.parse(localStorage.getItem('nexus_certificates') || '[]');
    return localCerts.filter((c: any) => c.userId === userId);
  },

  // 4. Verify a certificate by Verification ID
  async verifyCertificate(verificationId: string): Promise<CertificateVerification | null> {
    try {
      const snap = await getDoc(doc(db, 'certificateVerification', verificationId));
      if (snap.exists()) {
        return snap.data() as CertificateVerification;
      }
    } catch (err) {
      console.warn('Firestore fetch failed for verificationId, searching locally:', err);
    }

    const localVerifications = JSON.parse(localStorage.getItem('nexus_cert_verifications') || '[]');
    const found = localVerifications.find((v: any) => v.verificationId === verificationId);
    return found || null;
  }
};
