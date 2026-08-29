export interface CourseLesson {
  id?: string;
  lessonId: string;
  sectionId?: string;
  chapterId?: string;
  title: string;
  duration?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  isPreviewAllowed?: boolean;
  isFreePreview?: boolean;
  sequenceOrder?: number;
  description?: string;
  resources?: { title: string; downloadUrl: string; type?: string; fileSize?: string }[];
}

export interface CourseSection {
  id?: string;
  sectionId?: string;
  title: string;
  sequenceOrder?: number;
  description?: string;
  lessons: CourseLesson[];
}

export interface Course {
  courseId: string;
  title: string;
  subtitle?: string;
  description: string;
  thumbnail: string;
  banner: string;
  instructor: string;
  instructorId?: string;
  category: string;
  price: number;
  discountPrice?: number;
  rating: number;
  reviewCount?: number;
  students: number;
  language: string;
  duration: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels';
  isFeatured: boolean;
  isBestSeller: boolean;
  isNew: boolean;
  learningOutcomes?: string[];
  skillsGained?: string[];
  requirements?: string[];
  sections?: CourseSection[];
  curriculum?: CurriculumChapter[];
  modules?: any[];
  videoUrl?: string;
  previewVideoUrl?: string;
  demoVideoUrl?: string;
  lastUpdated?: string;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}

export interface Banner {
  bannerId: string;
  imageUrl: string;
  title: string;
  subtitle: string;
  courseId?: string;
  accentColor?: string;
}

export interface Instructor {
  instructorId: string;
  name: string;
  photoURL: string;
  bio: string;
  experience: string;
  totalStudents: number;
  totalCourses: number;
  averageRating: number;
  isVerified: boolean;
}

export interface CurriculumLesson {
  id?: string;
  lessonId: string;
  chapterId?: string;
  title: string;
  duration?: string;
  isPreviewAllowed?: boolean;
  sequenceOrder?: number;
  videoUrl?: string;
  thumbnailUrl?: string;
}

export interface CurriculumChapter {
  id?: string;
  chapterId: string;
  courseId: string;
  title: string;
  sequenceOrder?: number;
  lessonsCount?: number;
  totalDuration?: string;
  lessons: CurriculumLesson[];
}

export interface CourseReview {
  reviewId: string;
  courseId: string;
  studentName?: string;
  studentPhotoURL?: string;
  rating: number;
  comment: string;
  createdAt: any; // Date/String
}

export interface Coupon {
  couponId: string;
  code: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  isActive: boolean;
  expiryDate: string; // ISO date or simple string "YYYY-MM-DD"
  description: string;
  ownerUserId?: string;
  userEmail?: string;
  isSecret?: boolean;
}

export interface Offer {
  offerId: string;
  title: string;
  description: string;
  discountPercent: number;
  badgeText: string;
  isActive: boolean;
}

export interface CourseBenefit {
  benefitId: string;
  title: string;
  iconName: string;
  description: string;
}

export interface Purchase {
  purchaseId: string;
  userId: string;
  userEmail?: string;
  userPhoneNumber?: string;
  courseId: string;
  courseTitle?: string;
  paymentMethod: string;
  amount: number;
  discount: number;
  coupon: string;
  status: 'pending' | 'approved' | 'active' | 'success' | 'rejected' | 'failed';
  transactionId: string;
  purchaseDate: any;
  walletAmountUsed?: number;
  walletUsed?: number;
  paidAmount?: number;
}

export interface PaymentDetails {
  paymentId: string;
  userId: string;
  courseId: string;
  amount: number;
  paymentMethod: string;
  transactionId: string;
  status: 'pending' | 'approved' | 'active' | 'success' | 'rejected' | 'failed';
  createdAt: any;
}

export interface PaymentMethodConfig {
  id: string;
  name: string;
  type: 'MFS' | 'Card' | 'Gateway' | 'Bank' | 'Coupon';
  accountNumber: string;
  accountType?: string;
  instructions?: string;
  badge: string;
  color: string;
  icon: string;
  isActive: boolean;
}


