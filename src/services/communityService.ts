import {
  collection,
  getDocs,
  setDoc,
  doc,
  query,
  where,
  getDoc,
  deleteDoc,
  updateDoc,
  writeBatch,
  increment,
  runTransaction
} from 'firebase/firestore';
import { db, auth } from './firebase';
import {
  CommunityPost,
  CommunityReply,
  CommunityLike,
  CommunityBookmark,
  CommunityReport,
  UserReputation
} from '../types/community';
import { notificationService } from './notificationService';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error in communityService: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Blocked words list for Moderation Ready Spam Detection
const BLOCKED_WORDS = ['spam', 'scam', 'cheat', 'hack', 'malware', 'buy crypto', 'win free money', 'fake keys'];

const DEFAULT_POSTS: CommunityPost[] = [
  {
    postId: 'post-1',
    userId: 'user-jamil',
    userName: 'Engr. Jamil Ahmed',
    userPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    title: '🚀 Guide: Understanding React 19 Server Components vs Client Components',
    description: 'React Server Components (RSC) represent a paradigm shift in how we build React applications. In this post, I explain how data serialization works over the wire, when to use the "use client" directive, and how layout animations remain fully uninterrupted in nested routing models.',
    courseId: 'course-web-dev',
    courseTitle: 'Full-Stack Web Development BootCamp',
    tags: ['React', 'NextJS', 'Architecture', 'WebDev'],
    likesCount: 24,
    helpfulCount: 15,
    heartCount: 8,
    repliesCount: 4,
    viewsCount: 342,
    isInstructorPost: true,
    isPinned: true,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    postId: 'post-2',
    userId: 'user-student-1',
    userName: 'Wahid Hasan',
    userPhoto: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
    title: '❓ How to configure TypeScript with custom absolute paths in Vite?',
    description: 'I am trying to map absolute imports like "@/components/Button" inside my Vite React project. I edited tsconfig.json to include "paths" but Vite keeps complaining that it cannot find the module. Does anyone have a working vite.config.ts configuration for resolving paths?',
    courseId: 'course-web-dev',
    courseTitle: 'Full-Stack Web Development BootCamp',
    chapterId: 'chapter-1',
    lessonId: 'lesson-1',
    lessonTitle: 'Development Environment Setup',
    tags: ['TypeScript', 'Vite', 'Config'],
    likesCount: 8,
    helpfulCount: 3,
    heartCount: 1,
    repliesCount: 2,
    viewsCount: 120,
    isInstructorPost: false,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    postId: 'post-3',
    userId: 'user-student-2',
    userName: 'Ayesha Chowdhury',
    userPhoto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
    title: '📝 IELTS Speaking Part 2: Structure for a 2-Minute Monologue',
    description: 'Many students struggle to keep talking for a full 2 minutes during the cue card section. Here is the structural template I created following Engr. Jamil’s strategy. It breaks down the response into Introduction (15s), Detail 1 (30s), Detail 2 (30s), personal feeling (30s), and wrapping up (15s). Tested this on practice runs and it works wonderfully!',
    courseId: 'course-ielts-001',
    courseTitle: 'IELTS Preparation Premium',
    tags: ['IELTS', 'Speaking', 'CueCard', 'Strategy'],
    likesCount: 19,
    helpfulCount: 12,
    heartCount: 9,
    repliesCount: 3,
    viewsCount: 215,
    isInstructorPost: false,
    isPinned: false,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    postId: 'post-4',
    userId: 'user-student-3',
    userName: 'Tanvir Rahman',
    userPhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    title: '🧠 SQL Join optimization strategies for massive databases',
    description: 'In my current project, I have a query joining three tables with over 5 million rows each. The execution time is over 8 seconds. I have already added B-Tree indexes on foreign keys. What other optimization steps should I try?',
    tags: ['SQL', 'Database', 'Optimization'],
    likesCount: 11,
    helpfulCount: 9,
    heartCount: 4,
    repliesCount: 0,
    viewsCount: 184,
    isInstructorPost: false,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const DEFAULT_REPLIES: CommunityReply[] = [
  {
    replyId: 'reply-1',
    postId: 'post-2',
    userId: 'user-jamil',
    userName: 'Engr. Jamil Ahmed',
    userPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    message: 'Hello Wahid! The missing link is usually Vite’s bundler paths resolver. In addition to adding paths inside `tsconfig.json`, you must install the `vite-tsconfig-paths` npm package and register it as a plugin in your `vite.config.ts`. Here is the exact config:\n\n```typescript\nimport { defineConfig } from "vite";\nimport react from "@vitejs/plugin-react";\nimport tsconfigPaths from "vite-tsconfig-paths";\n\nexport default defineConfig({\n  plugins: [react(), tsconfigPaths()]\n});\n```',
    likesCount: 6,
    isBestAnswer: true,
    isInstructorReply: true,
    createdAt: new Date(Date.now() - 2.5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2.5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    replyId: 'reply-2',
    postId: 'post-2',
    userId: 'user-student-2',
    userName: 'Ayesha Chowdhury',
    userPhoto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
    message: 'Thank you Sir! This was driving me crazy too, and registering `vite-tsconfig-paths` completely resolved my compile issues.',
    likesCount: 2,
    isBestAnswer: false,
    isInstructorReply: false,
    parentId: 'reply-1',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    replyId: 'reply-3',
    postId: 'post-3',
    userId: 'user-jamil',
    userName: 'Engr. Jamil Ahmed',
    userPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    message: 'This is an excellent breakdown Ayesha! To take this even further, I recommend using the **"PPF" (Past, Present, Future) transition strategy** during cue card delays. If you run out of details, quickly pivot from your current presentation (Present) into what you plan to do next in relation to it (Future). Keep up the great work!',
    likesCount: 5,
    isBestAnswer: false,
    isInstructorReply: true,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export const communityService = {
  /**
   * Helper: check if message contains spam or blocked words
   */
  detectSpam(text: string): boolean {
    const lowerText = text.toLowerCase();
    return BLOCKED_WORDS.some(word => lowerText.includes(word));
  },

  /**
   * Seed defaults if Firestore is empty or unauthenticated (read fallback)
   */
  async ensureSeededData(): Promise<void> {
    try {
      const snap = await getDocs(collection(db, 'communityPosts'));
      if (snap.empty && auth.currentUser) {
        console.log('Seeding default community posts to Firestore...');
        const batch = writeBatch(db);
        DEFAULT_POSTS.forEach(post => {
          batch.set(doc(db, 'communityPosts', post.postId), post);
        });
        DEFAULT_REPLIES.forEach(reply => {
          batch.set(doc(db, 'communityReplies', reply.replyId), reply);
        });
        await batch.commit();
      }
    } catch (err) {
      console.warn('Silent seeding error or bypass during initialization:', err);
    }
  },

  /**
   * Fetch reputation points and badge counts for profiles
   */
  async getUserReputation(userId: string, userName: string = 'Anonymous Student', userPhoto?: string): Promise<UserReputation> {
    const path = `userReputation/${userId}`;
    try {
      const docRef = doc(db, 'userReputation', userId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as UserReputation;
      } else {
        // Compute dynamically or return initial template
        const initialRep: UserReputation = {
          userId,
          userName,
          userPhoto,
          totalQuestions: 0,
          totalAnswers: 0,
          reputationPoints: 10, // starting gift
          badges: ['Community Novice'],
          updatedAt: new Date().toISOString()
        };
        // Attempt to write, fail silently if permissions lack
        try {
          if (auth.currentUser) {
            await setDoc(docRef, initialRep);
          }
        } catch (e) {
          console.warn('Could not write userReputation to Firestore:', e);
        }
        return initialRep;
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      throw error;
    }
  },

  /**
   * Reward user reputation points and update badges
   */
  async awardReputation(userId: string, points: number, actionType: 'question' | 'answer' | 'best_answer' | 'reaction'): Promise<void> {
    const path = `userReputation/${userId}`;
    if (!auth.currentUser) return;
    try {
      const docRef = doc(db, 'userReputation', userId);
      const snap = await getDoc(docRef);
      
      let currentPoints = 10;
      let totalQuestions = 0;
      let totalAnswers = 0;
      let badges: string[] = ['Community Novice'];

      if (snap.exists()) {
        const data = snap.data() as UserReputation;
        currentPoints = data.reputationPoints;
        totalQuestions = data.totalQuestions || 0;
        totalAnswers = data.totalAnswers || 0;
        badges = data.badges || [];
      }

      currentPoints += points;
      if (actionType === 'question') totalQuestions += 1;
      if (actionType === 'answer') totalAnswers += 1;

      // Dynamic Badges based on points
      if (currentPoints >= 100 && !badges.includes('Scholar Guide')) {
        badges.push('Scholar Guide');
      }
      if (currentPoints >= 50 && !badges.includes('Helpful Contributor')) {
        badges.push('Helpful Contributor');
      }
      if (currentPoints >= 200 && !badges.includes('Academy Expert')) {
        badges.push('Academy Expert');
      }

      await setDoc(docRef, {
        userId,
        userName: snap.exists() ? snap.data()?.userName || 'Academic Peer' : 'Academic Peer',
        userPhoto: snap.exists() ? snap.data()?.userPhoto || '' : '',
        totalQuestions,
        totalAnswers,
        reputationPoints: currentPoints,
        badges,
        updatedAt: new Date().toISOString()
      }, { merge: true });

    } catch (error) {
      console.warn('Failed to update reputation (bypassed smoothly):', error);
    }
  },

  /**
   * Get filtered community posts (Supports dynamic filters and search terms)
   */
  async getPosts(filters: {
    courseId?: string;
    search?: string;
    filterType?: 'latest' | 'trending' | 'mostAnswered' | 'unanswered' | 'instructorAnswered' | 'myDiscussions';
    userId?: string;
  } = {}): Promise<CommunityPost[]> {
    const collPath = 'communityPosts';
    try {
      await this.ensureSeededData();

      // Read from Firestore
      const snap = await getDocs(collection(db, collPath));
      let posts: CommunityPost[] = [];
      
      if (!snap.empty) {
        snap.forEach(doc => {
          posts.push(doc.data() as CommunityPost);
        });
      } else {
        // Fallback to memory defaults
        posts = [...DEFAULT_POSTS];
      }

      // Hide reported posts
      posts = posts.filter(post => !post.isReported);

      // Apply Filter: courseId
      if (filters.courseId) {
        posts = posts.filter(post => post.courseId === filters.courseId);
      }

      // Apply Filter: My Discussions
      if (filters.filterType === 'myDiscussions' && filters.userId) {
        posts = posts.filter(post => post.userId === filters.userId);
      }

      // Apply Filter: Search keyword (title, description, tags, lesson, user)
      if (filters.search) {
        const queryStr = filters.search.toLowerCase();
        posts = posts.filter(post => 
          post.title.toLowerCase().includes(queryStr) ||
          post.description.toLowerCase().includes(queryStr) ||
          post.tags.some(tag => tag.toLowerCase().includes(queryStr)) ||
          (post.courseTitle && post.courseTitle.toLowerCase().includes(queryStr)) ||
          (post.lessonTitle && post.lessonTitle.toLowerCase().includes(queryStr)) ||
          post.userName.toLowerCase().includes(queryStr)
        );
      }

      // Apply Filter Type
      if (filters.filterType === 'trending') {
        // Sort by total reaction counts + reply activity
        posts.sort((a, b) => {
          const scoreA = (a.likesCount || 0) + (a.helpfulCount || 0) + (a.heartCount || 0) * 1.5 + (a.repliesCount || 0) * 2;
          const scoreB = (b.likesCount || 0) + (b.helpfulCount || 0) + (b.heartCount || 0) * 1.5 + (b.repliesCount || 0) * 2;
          return scoreB - scoreA;
        });
      } else if (filters.filterType === 'mostAnswered') {
        posts.sort((a, b) => (b.repliesCount || 0) - (a.repliesCount || 0));
      } else if (filters.filterType === 'unanswered') {
        posts = posts.filter(post => (post.repliesCount || 0) === 0);
        posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } else if (filters.filterType === 'instructorAnswered') {
        // We'll prioritize posts that have isInstructorPost true or marked answers from instructors.
        // For simplicity, instructor written or pinned
        posts = posts.filter(post => post.isInstructorPost);
        posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } else {
        // 'latest' default: pinned posts on top, then sorted by createdAt descending
        posts.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      }

      return posts;
    } catch (error) {
      console.warn('Firestore load failed, returning offline memory posts:', error);
      return DEFAULT_POSTS;
    }
  },

  /**
   * Get single post detail
   */
  async getPostById(postId: string): Promise<CommunityPost | null> {
    const path = `communityPosts/${postId}`;
    try {
      const snap = await getDoc(doc(db, 'communityPosts', postId));
      if (snap.exists()) {
        return snap.data() as CommunityPost;
      }
      return DEFAULT_POSTS.find(p => p.postId === postId) || null;
    } catch (error) {
      console.warn('Bypassing Firestore getPostById:', error);
      return DEFAULT_POSTS.find(p => p.postId === postId) || null;
    }
  },

  /**
   * Add a new Question/Post
   */
  async createPost(postData: Omit<CommunityPost, 'postId' | 'likesCount' | 'helpfulCount' | 'heartCount' | 'repliesCount' | 'viewsCount' | 'isInstructorPost' | 'createdAt' | 'updatedAt'>): Promise<CommunityPost> {
    const collPath = 'communityPosts';
    if (!auth.currentUser) {
      throw new Error('User must be authenticated to ask questions.');
    }
    try {
      const postId = `post_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const isSpam = this.detectSpam(postData.title) || this.detectSpam(postData.description);
      
      const newPost: CommunityPost = {
        ...postData,
        postId,
        likesCount: 0,
        helpfulCount: 0,
        heartCount: 0,
        repliesCount: 0,
        viewsCount: 1,
        isInstructorPost: auth.currentUser.email === 'wahid23hasan@gmail.com' || auth.currentUser.email?.includes('instructor'),
        isReported: isSpam, // Auto-report/hide if contains spam
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, collPath, postId), newPost);

      // Award reputation points for asking a question (+5)
      await this.awardReputation(auth.currentUser.uid, 5, 'question');

      return newPost;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, collPath);
      throw error;
    }
  },

  /**
   * Fetch replies for a specific post
   */
  async getReplies(postId: string): Promise<CommunityReply[]> {
    const collPath = 'communityReplies';
    try {
      const snap = await getDocs(collection(db, collPath));
      let replies: CommunityReply[] = [];
      if (!snap.empty) {
        snap.forEach(doc => {
          const item = doc.data() as CommunityReply;
          if (item.postId === postId) {
            replies.push(item);
          }
        });
      } else {
        replies = DEFAULT_REPLIES.filter(r => r.postId === postId);
      }

      // Sort: best answer first, then instructor reply, then latest
      replies.sort((a, b) => {
        if (a.isBestAnswer && !b.isBestAnswer) return -1;
        if (!a.isBestAnswer && b.isBestAnswer) return 1;
        if (a.isInstructorReply && !b.isInstructorReply) return -1;
        if (!a.isInstructorReply && b.isInstructorReply) return 1;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

      return replies;
    } catch (error) {
      console.warn('Firestore load replies failed, returning offline replies:', error);
      return DEFAULT_REPLIES.filter(r => r.postId === postId);
    }
  },

  /**
   * Post a new Answer or nested reply
   */
  async createReply(replyData: Omit<CommunityReply, 'replyId' | 'likesCount' | 'isBestAnswer' | 'isInstructorReply' | 'createdAt' | 'updatedAt'>): Promise<CommunityReply> {
    const collPath = 'communityReplies';
    if (!auth.currentUser) {
      throw new Error('User must be authenticated to reply.');
    }
    try {
      const replyId = `reply_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const isInstructor = auth.currentUser.email === 'wahid23hasan@gmail.com' || auth.currentUser.email?.includes('instructor');
      
      const newReply: CommunityReply = {
        ...replyData,
        replyId,
        likesCount: 0,
        isBestAnswer: false,
        isInstructorReply: isInstructor,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Set inside Firestore
      await setDoc(doc(db, collPath, replyId), newReply);

      // Increment reply counter on Post
      try {
        const postRef = doc(db, 'communityPosts', replyData.postId);
        await updateDoc(postRef, {
          repliesCount: increment(1)
        });
      } catch (err) {
        console.warn('Could not increment post replies count:', err);
      }

      // Award reputation points for answering (+10)
      await this.awardReputation(auth.currentUser.uid, 10, 'answer');

      // Notify original post author
      try {
        const postSnap = await getDoc(doc(db, 'communityPosts', replyData.postId));
        if (postSnap.exists()) {
          const post = postSnap.data() as CommunityPost;
          if (post.userId !== auth.currentUser.uid) {
            await notificationService.createNotification(post.userId, {
              title: isInstructor ? '🎓 Instructor answered your question' : '💬 New reply on your question',
              message: `${replyData.userName} commented: "${replyData.message.substring(0, 60)}${replyData.message.length > 60 ? '...' : ''}"`,
              category: 'learning',
              type: 'General Announcement',
              unread: true,
              relatedPage: 'community',
              targetId: replyData.postId
            });
          }
        }
      } catch (notifErr) {
        console.warn('Failed to send comment notification:', notifErr);
      }

      return newReply;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, collPath);
      throw error;
    }
  },

  /**
   * Edit reply message
   */
  async editReply(replyId: string, newMessage: string): Promise<void> {
    const path = `communityReplies/${replyId}`;
    if (!auth.currentUser) throw new Error('Unauthenticated.');
    try {
      const docRef = doc(db, 'communityReplies', replyId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) throw new Error('Reply not found.');
      const reply = snap.data() as CommunityReply;
      if (reply.userId !== auth.currentUser.uid) {
        throw new Error('Unauthorized to edit this answer.');
      }
      await updateDoc(docRef, {
        message: newMessage,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  /**
   * Delete reply
   */
  async deleteReply(replyId: string, postId: string): Promise<void> {
    const path = `communityReplies/${replyId}`;
    if (!auth.currentUser) throw new Error('Unauthenticated.');
    try {
      const docRef = doc(db, 'communityReplies', replyId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) throw new Error('Reply not found.');
      const reply = snap.data() as CommunityReply;
      if (reply.userId !== auth.currentUser.uid) {
        throw new Error('Unauthorized to delete this answer.');
      }
      await deleteDoc(docRef);

      // Decrement replies counter on Post
      try {
        const postRef = doc(db, 'communityPosts', postId);
        await updateDoc(postRef, {
          repliesCount: increment(-1)
        });
      } catch (err) {
        console.warn('Could not decrement post replies count:', err);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  /**
   * Mark an answer as the "Best Answer"
   */
  async markBestAnswer(postId: string, replyId: string): Promise<void> {
    if (!auth.currentUser) throw new Error('Unauthenticated.');
    try {
      // 1. Fetch post to verify ownership
      const postRef = doc(db, 'communityPosts', postId);
      const postSnap = await getDoc(postRef);
      if (!postSnap.exists()) throw new Error('Post not found.');
      const post = postSnap.data() as CommunityPost;
      
      const isInstructor = auth.currentUser.email === 'wahid23hasan@gmail.com' || auth.currentUser.email?.includes('instructor');
      if (post.userId !== auth.currentUser.uid && !isInstructor) {
        throw new Error('Only the author or instructors can mark the best answer.');
      }

      // 2. Fetch all replies of this post and clear best answer status
      const repliesSnap = await getDocs(collection(db, 'communityReplies'));
      const batch = writeBatch(db);

      repliesSnap.forEach(rDoc => {
        const rData = rDoc.data() as CommunityReply;
        if (rData.postId === postId && rData.isBestAnswer) {
          batch.update(doc(db, 'communityReplies', rData.replyId), { isBestAnswer: false });
        }
      });

      // 3. Set chosen reply as best answer
      batch.update(doc(db, 'communityReplies', replyId), { isBestAnswer: true });
      await batch.commit();

      // 4. Reward +25 points to answer author
      try {
        const replySnap = await getDoc(doc(db, 'communityReplies', replyId));
        if (replySnap.exists()) {
          const reply = replySnap.data() as CommunityReply;
          await this.awardReputation(reply.userId, 25, 'best_answer');

          // Notify reply author
          if (reply.userId !== auth.currentUser.uid) {
            await notificationService.createNotification(reply.userId, {
              title: '🏆 Best Answer Selected!',
              message: `Congratulations! Your answer on "${post.title}" was selected as the Best Answer. (+25 points)`,
              category: 'learning',
              type: 'Certificate Available',
              unread: true,
              relatedPage: 'community',
              targetId: postId
            });
          }
        }
      } catch (reputationErr) {
        console.warn('Failed to reward best answer reputation:', reputationErr);
      }

    } catch (error) {
      console.error('Failed to mark best answer:', error);
      throw error;
    }
  },

  /**
   * Toggle Like, Helpful, Heart reactions
   */
  async toggleReaction(postId: string, type: 'like' | 'helpful' | 'heart'): Promise<void> {
    if (!auth.currentUser) throw new Error('Authentication required to react.');
    const userId = auth.currentUser.uid;
    const likeId = `like_${postId}_${userId}_${type}`;
    const likeDocRef = doc(db, 'communityLikes', likeId);

    try {
      const snap = await getDoc(likeDocRef);
      const postRef = doc(db, 'communityPosts', postId);

      if (snap.exists()) {
        // Remove Reaction (Toggle off)
        await deleteDoc(likeDocRef);
        
        const updateField = type === 'like' ? 'likesCount' : type === 'helpful' ? 'helpfulCount' : 'heartCount';
        await updateDoc(postRef, {
          [updateField]: increment(-1)
        });
      } else {
        // Add Reaction (Toggle on)
        const newReaction: CommunityLike = {
          likeId,
          postId,
          userId,
          type,
          createdAt: new Date().toISOString()
        };
        await setDoc(likeDocRef, newReaction);

        const updateField = type === 'like' ? 'likesCount' : type === 'helpful' ? 'helpfulCount' : 'heartCount';
        await updateDoc(postRef, {
          [updateField]: increment(1)
        });

        // Award peer reputation for getting a reaction (+2)
        const postSnap = await getDoc(postRef);
        if (postSnap.exists()) {
          const post = postSnap.data() as CommunityPost;
          await this.awardReputation(post.userId, 2, 'reaction');

          // Send brief notification on post like
          if (post.userId !== userId && type === 'like') {
            await notificationService.createNotification(post.userId, {
              title: '❤️ Someone liked your post',
              message: `${auth.currentUser.displayName || 'A peer'} liked your post "${post.title.substring(0, 30)}..."`,
              category: 'learning',
              type: 'General Announcement',
              unread: true,
              relatedPage: 'community',
              targetId: postId
            });
          }
        }
      }
    } catch (error) {
      console.error('Toggle reaction failed:', error);
    }
  },

  /**
   * Toggle Bookmark Status
   */
  async toggleBookmark(postId: string): Promise<boolean> {
    if (!auth.currentUser) throw new Error('Authentication required to bookmark.');
    const userId = auth.currentUser.uid;
    const bookmarkId = `bookmark_${postId}_${userId}`;
    const bookmarkDocRef = doc(db, 'communityBookmarks', bookmarkId);

    try {
      const snap = await getDoc(bookmarkDocRef);
      if (snap.exists()) {
        await deleteDoc(bookmarkDocRef);
        return false;
      } else {
        const newBookmark: CommunityBookmark = {
          bookmarkId,
          postId,
          userId,
          createdAt: new Date().toISOString()
        };
        await setDoc(bookmarkDocRef, newBookmark);
        return true;
      }
    } catch (error) {
      console.error('Bookmark toggle failed:', error);
      return false;
    }
  },

  /**
   * Check if a user has reacted/bookmarked
   */
  async getUserInteractions(postId: string): Promise<{ liked: boolean; helpful: boolean; heart: boolean; bookmarked: boolean }> {
    if (!auth.currentUser) return { liked: false, helpful: false, heart: false, bookmarked: false };
    const userId = auth.currentUser.uid;
    
    try {
      const likeSnap = await getDoc(doc(db, 'communityLikes', `like_${postId}_${userId}_like`));
      const helpfulSnap = await getDoc(doc(db, 'communityLikes', `like_${postId}_${userId}_helpful`));
      const heartSnap = await getDoc(doc(db, 'communityLikes', `like_${postId}_${userId}_heart`));
      const bookmarkSnap = await getDoc(doc(db, 'communityBookmarks', `bookmark_${postId}_${userId}`));

      return {
        liked: likeSnap.exists(),
        helpful: helpfulSnap.exists(),
        heart: heartSnap.exists(),
        bookmarked: bookmarkSnap.exists()
      };
    } catch (e) {
      return { liked: false, helpful: false, heart: false, bookmarked: false };
    }
  },

  /**
   * Report a post (Moderation ready architecture)
   */
  async reportPost(postId: string, reason: string): Promise<void> {
    const collPath = 'communityReports';
    const userId = auth.currentUser?.uid || 'anonymous';
    try {
      const reportId = `report_${postId}_${userId}_${Date.now()}`;
      const newReport: CommunityReport = {
        reportId,
        postId,
        userId,
        reason,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, collPath, reportId), newReport);

      // Flag post in Firestore if reports accumulate (e.g. hide after 3 reports)
      const postRef = doc(db, 'communityPosts', postId);
      const reportsSnap = await getDocs(collection(db, collPath));
      let reportCount = 0;
      reportsSnap.forEach(doc => {
        if (doc.data().postId === postId) reportCount++;
      });

      if (reportCount >= 3) {
        await updateDoc(postRef, {
          isReported: true // Automatically hide post
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, collPath);
    }
  }
};
