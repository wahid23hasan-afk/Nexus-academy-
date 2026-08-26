export interface Certificate {
  id?: string;
  certificateId: string;
  certificateNumber?: string;
  userId: string;
  studentName: string;
  courseId: string;
  courseName: string;
  courseTitle?: string;
  instructorName?: string;
  completionDate: string; // ISO String
  issueDate: string; // ISO String
  issuedAt?: any; // Firestore timestamp
  verificationId: string; // Used to look up in verification collection
  isVerified: boolean;
  qrCodePlaceholderUrl?: string;
  signaturePlaceholderUrl?: string;
  templateId?: string;
}

export interface CertificateTemplate {
  templateId: string;
  name: string;
  styleConfig: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    backgroundColor: string;
    fontFamily: string;
    borderStyle: string;
  };
}

export interface CertificateVerification {
  verificationId: string;
  certificateId: string;
  studentName: string;
  courseName: string;
  issueDate: string;
  verificationStatus: 'valid' | 'revoked' | 'pending';
  institution: string;
}

export interface CourseCompletionRecord {
  completionId: string;
  userId: string;
  courseId: string;
  lessonsCompleted: number;
  totalLessons: number;
  quizzesPassedCount: number;
  totalQuizzesCount: number;
  completedAt: string; // ISO String
  status: 'progress' | 'completed';
}
