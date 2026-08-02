export interface CommunityPost {
  postId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  title: string;
  description: string;
  imageUrl?: string;
  courseId?: string;
  courseTitle?: string;
  chapterId?: string;
  lessonId?: string;
  lessonTitle?: string;
  tags: string[];
  likesCount: number;
  helpfulCount: number;
  heartCount: number;
  repliesCount: number;
  viewsCount: number;
  isInstructorPost: boolean;
  isPinned?: boolean;
  isLocked?: boolean;
  isReported?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityReply {
  replyId: string;
  postId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  message: string;
  likesCount: number;
  isBestAnswer: boolean;
  isInstructorReply: boolean;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityLike {
  likeId: string;
  postId: string;
  userId: string;
  type: 'like' | 'helpful' | 'heart';
  createdAt: string;
}

export interface CommunityBookmark {
  bookmarkId: string;
  postId: string;
  userId: string;
  createdAt: string;
}

export interface CommunityReport {
  reportId: string;
  postId?: string;
  replyId?: string;
  userId: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'resolved';
  createdAt: string;
}

export interface UserReputation {
  userId: string;
  userName: string;
  userPhoto?: string;
  totalQuestions: number;
  totalAnswers: number;
  reputationPoints: number;
  badges: string[];
  updatedAt: string;
}
