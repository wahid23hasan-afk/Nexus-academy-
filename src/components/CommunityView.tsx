import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  MessageSquare,
  ThumbsUp,
  Award,
  Bookmark,
  Share2,
  Trash2,
  Edit3,
  CheckCircle,
  PlusCircle,
  AlertTriangle,
  X,
  Compass,
  ArrowLeft,
  BookOpen,
  User as UserIcon,
  Flag,
  UserCheck,
  ChevronRight,
  Heart,
  FileText,
  Sparkles,
  Info
} from 'lucide-react';
import { auth, db } from '../services/firebase';
import { communityService } from '../services/communityService';
import { courseService } from '../services/courseService';
import { CommunityPost, CommunityReply, UserReputation } from '../types/community';
import { Course } from '../types/course';
import { gamificationService } from '../services/gamificationService';

interface CommunityViewProps {
  userProfile: { fullName: string; username: string; photoURL?: string } | null;
  onBackToProfile?: () => void;
  onShowNotification: (message: string, type: 'success' | 'error') => void;
}

export function CommunityView({ userProfile, onBackToProfile, onShowNotification }: CommunityViewProps) {
  // Navigation & UI States
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [replies, setReplies] = useState<CommunityReply[]>([]);
  const [reputation, setReputation] = useState<UserReputation | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRepliesLoading, setIsRepliesLoading] = useState<boolean>(false);
  const [showAskModal, setShowAskModal] = useState<boolean>(false);
  const [showReputationInfo, setShowReputationInfo] = useState<boolean>(false);

  // Filters & Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<'latest' | 'trending' | 'mostAnswered' | 'unanswered' | 'instructorAnswered' | 'myDiscussions'>('latest');

  // Form States for Ask Question
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [chapterText, setChapterText] = useState<string>('');
  const [lessonText, setLessonText] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [tagInput, setTagInput] = useState<string>('');
  const [isSubmittingQuestion, setIsSubmittingQuestion] = useState<boolean>(false);

  // Form States for Answer Reply
  const [replyMessage, setReplyMessage] = useState<string>('');
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editingMessage, setEditingMessage] = useState<string>('');
  const [isSubmittingReply, setIsSubmittingReply] = useState<boolean>(false);

  // State for user post interactions (Likes, Bookmarks, etc.)
  const [postInteractions, setPostInteractions] = useState<{
    [postId: string]: { liked: boolean; helpful: boolean; heart: boolean; bookmarked: boolean };
  }>({});

  // Report State
  const [reportingPostId, setReportingPostId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<string>('');

  const currentUser = auth.currentUser;

  // 1. Initial Load of Posts, Reputation, and Catalog Courses
  useEffect(() => {
    loadInitialData();
  }, [activeFilter, searchQuery]);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      // Load user reputation if authenticated
      if (currentUser) {
        const repData = await communityService.getUserReputation(
          currentUser.uid,
          userProfile?.fullName || currentUser.displayName || 'Academic Peer',
          userProfile?.photoURL || currentUser.photoURL || undefined
        );
        setReputation(repData);
      }

      // Load courses for reference drop down
      const fetchedCourses = await courseService.getCourses();
      setCourses(fetchedCourses);

      // Fetch filtered & searched posts
      const fetchedPosts = await communityService.getPosts({
        filterType: activeFilter,
        search: searchQuery,
        userId: currentUser?.uid
      });
      setPosts(fetchedPosts);

      // Fetch interaction states for each post
      const interactions: typeof postInteractions = {};
      for (const post of fetchedPosts) {
        const status = await communityService.getUserInteractions(post.postId);
        interactions[post.postId] = status;
      }
      setPostInteractions(interactions);

    } catch (err) {
      console.error('Error loading community dashboard data:', err);
      onShowNotification('Error loading discussions.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Fetch Replies when a post is clicked/viewed
  const handleViewPostDetails = async (post: CommunityPost) => {
    setSelectedPost(post);
    setIsRepliesLoading(true);
    setReplyMessage('');
    setEditingReplyId(null);
    try {
      const fetchedReplies = await communityService.getReplies(post.postId);
      setReplies(fetchedReplies);
    } catch (err) {
      console.error('Error loading replies:', err);
      onShowNotification('Could not load discussion replies.', 'error');
    } finally {
      setIsRepliesLoading(false);
    }
  };

  // 3. Reacting to a Post (Like, Helpful, Heart)
  const handleToggleReaction = async (postId: string, type: 'like' | 'helpful' | 'heart') => {
    if (!currentUser) {
      onShowNotification('Please sign in to react to posts.', 'error');
      return;
    }
    try {
      // Toggle local state instantly (Optimistic UI)
      setPosts(prevPosts =>
        prevPosts.map(p => {
          if (p.postId === postId) {
            const currentCount = type === 'like' ? p.likesCount : type === 'helpful' ? p.helpfulCount : p.heartCount;
            const hasReacted = postInteractions[postId]?.[type === 'like' ? 'liked' : type === 'helpful' ? 'helpful' : 'heart'];
            const diff = hasReacted ? -1 : 1;
            
            return {
              ...p,
              likesCount: type === 'like' ? p.likesCount + diff : p.likesCount,
              helpfulCount: type === 'helpful' ? p.helpfulCount + diff : p.helpfulCount,
              heartCount: type === 'heart' ? p.heartCount + diff : p.heartCount
            };
          }
          return p;
        })
      );

      setPostInteractions(prev => ({
        ...prev,
        [postId]: {
          ...prev[postId],
          liked: type === 'like' ? !prev[postId]?.liked : !!prev[postId]?.liked,
          helpful: type === 'helpful' ? !prev[postId]?.helpful : !!prev[postId]?.helpful,
          heart: type === 'heart' ? !prev[postId]?.heart : !!prev[postId]?.heart
        }
      }));

      // Send to Firestore
      await communityService.toggleReaction(postId, type);

      // Refresh post context if active in detail view
      if (selectedPost && selectedPost.postId === postId) {
        const updated = await communityService.getPostById(postId);
        if (updated) setSelectedPost(updated);
      }
    } catch (err) {
      console.error('Failed to react:', err);
    }
  };

  // 4. Bookmark Toggle
  const handleToggleBookmark = async (postId: string) => {
    if (!currentUser) {
      onShowNotification('Sign in to bookmark discussions.', 'error');
      return;
    }
    try {
      const isBookmarked = await communityService.toggleBookmark(postId);
      setPostInteractions(prev => ({
        ...prev,
        [postId]: {
          ...prev[postId],
          bookmarked: isBookmarked
        }
      }));
      onShowNotification(isBookmarked ? 'Discussion bookmarked' : 'Bookmark removed', 'success');
    } catch (err) {
      console.error('Failed to bookmark:', err);
    }
  };

  // 5. Ask Question Submit (Anti-spam verification + Course validation)
  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (!newTitle.trim() || !newDescription.trim()) {
      onShowNotification('Title and description cannot be empty.', 'error');
      return;
    }

    setIsSubmittingQuestion(true);
    try {
      // Anti-spam warning validation
      const textToVerify = `${newTitle} ${newDescription}`;
      const containsSpam = communityService.detectSpam(textToVerify);
      if (containsSpam) {
        onShowNotification('Potential spam words detected! Your post will be flagged for review.', 'error');
      }

      // Map course title
      const matchedCourse = courses.find(c => c.courseId === selectedCourseId);
      const courseTitle = matchedCourse ? matchedCourse.title : undefined;

      // Extract tags
      const tags = (tagInput || '')
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      await communityService.createPost({
        userId: currentUser.uid,
        userName: userProfile?.fullName || currentUser.displayName || 'Academic Scholar',
        userPhoto: userProfile?.photoURL || currentUser.photoURL || undefined,
        title: newTitle.trim(),
        description: newDescription.trim(),
        courseId: selectedCourseId || undefined,
        courseTitle,
        chapterId: chapterText.trim() ? 'chapter-custom' : undefined,
        lessonId: lessonText.trim() ? 'lesson-custom' : undefined,
        lessonTitle: lessonText.trim() || undefined,
        tags: tags.length > 0 ? tags : ['General'],
        imageUrl: imageUrl.trim() || undefined,
        isPinned: false
      });

      onShowNotification('Your question is live on the Nexus Community!', 'success');
      
      // Gamification Reward
      gamificationService.addXP(currentUser.uid, 15, 'Community Question');

      // Reset forms & close modal
      setNewTitle('');
      setNewDescription('');
      setSelectedCourseId('');
      setChapterText('');
      setLessonText('');
      setImageUrl('');
      setTagInput('');
      setShowAskModal(false);

      // Refresh list
      await loadInitialData();
    } catch (err) {
      console.error('Error submitting question:', err);
      onShowNotification('Could not upload post. Try again.', 'error');
    } finally {
      setIsSubmittingQuestion(false);
    }
  };

  // 6. Reply / Answer Submission
  const handlePostReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedPost) return;

    if (!replyMessage.trim()) {
      onShowNotification('Please type your answer first.', 'error');
      return;
    }

    setIsSubmittingReply(true);
    try {
      await communityService.createReply({
        postId: selectedPost.postId,
        userId: currentUser.uid,
        userName: userProfile?.fullName || currentUser.displayName || 'Anonymous Peer',
        userPhoto: userProfile?.photoURL || currentUser.photoURL || undefined,
        message: replyMessage.trim()
      });

      onShowNotification('Your response has been published!', 'success');
      setReplyMessage('');

      // Refresh replies list
      const updatedReplies = await communityService.getReplies(selectedPost.postId);
      setReplies(updatedReplies);

      // Update local replies count
      gamificationService.addXP(currentUser.uid, 20, "Answered Community Question");
      gamificationService.unlockAchievement(currentUser.uid, "community_helper", "Community Helper", "Answered a question", "🤝");
      setPosts(prev =>
        prev.map(p =>
          p.postId === selectedPost.postId ? { ...p, repliesCount: p.repliesCount + 1 } : p
        )
      );

    } catch (err) {
      console.error('Error replying:', err);
      onShowNotification('Could not post your reply.', 'error');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // 7. Edit Answer message
  const handleSaveEditReply = async (replyId: string) => {
    if (!editingMessage.trim() || !selectedPost) return;
    try {
      await communityService.editReply(replyId, editingMessage);
      onShowNotification('Reply updated successfully.', 'success');
      setEditingReplyId(null);

      // Reload replies
      const updated = await communityService.getReplies(selectedPost.postId);
      setReplies(updated);
    } catch (err) {
      onShowNotification('Failed to update reply.', 'error');
    }
  };

  // 8. Delete Answer
  const handleDeleteReply = async (replyId: string) => {
    if (!selectedPost) return;
    if (!confirm('Are you sure you want to remove your answer?')) return;
    try {
      await communityService.deleteReply(replyId, selectedPost.postId);
      onShowNotification('Answer deleted.', 'success');

      // Reload replies
      const updated = await communityService.getReplies(selectedPost.postId);
      setReplies(updated);

      // Update local replies count
      gamificationService.addXP(currentUser.uid, 20, "Answered Community Question");
      gamificationService.unlockAchievement(currentUser.uid, "community_helper", "Community Helper", "Answered a question", "🤝");
      setPosts(prev =>
        prev.map(p =>
          p.postId === selectedPost.postId ? { ...p, repliesCount: Math.max(0, p.repliesCount - 1) } : p
        )
      );
    } catch (err) {
      onShowNotification('Could not delete answer.', 'error');
    }
  };

  // 9. Mark Best Answer (Atomic trigger + Point dispatch)
  const handleMarkBestAnswer = async (replyId: string) => {
    if (!selectedPost) return;
    try {
      await communityService.markBestAnswer(selectedPost.postId, replyId);
      onShowNotification('🏆 Marked as Best Answer! Points dispatched to peer.', 'success');

      // Reload replies
      const updatedReplies = await communityService.getReplies(selectedPost.postId);
      setReplies(updatedReplies);
    } catch (err) {
      onShowNotification('Only the author or instructor can mark Best Answer.', 'error');
    }
  };

  // 10. Report Post (Moderation Ready)
  const handleReportPostSubmit = async () => {
    if (!reportingPostId || !reportReason.trim()) return;
    try {
      await communityService.reportPost(reportingPostId, reportReason);
      onShowNotification('Post reported successfully. Moderation queue updated.', 'success');
      setReportingPostId(null);
      setReportReason('');

      // If viewing reported post, back out
      if (selectedPost && selectedPost.postId === reportingPostId) {
        setSelectedPost(null);
      }
      await loadInitialData();
    } catch (e) {
      onShowNotification('Failed to submit report.', 'error');
    }
  };

  // Share link simulation
  const handleSharePost = (post: CommunityPost) => {
    const url = `${window.location.origin}?communityPost=${post.postId}`;
    navigator.clipboard.writeText(url);
    onShowNotification('Discussion link copied to clipboard!', 'success');
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen text-slate-100">
      
      {/* 1. TOP HEADER: USER REPUTATION SUMMARY (Only displayed when no post is open) */}
      <AnimatePresence mode="wait">
        {!selectedPost && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="px-1"
          >
            <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-4 shadow-xl backdrop-blur-md flex items-center justify-between mb-4 relative overflow-hidden group">
              {/* Abstract green neon background glow */}
              <div className="absolute -right-12 -top-12 w-24 h-24 bg-[#39FF14]/10 rounded-full blur-2xl group-hover:bg-[#39FF14]/15 transition-all duration-500" />
              
              <div className="flex items-center space-x-3.5 relative">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#39FF14]/20 to-slate-900 border border-[#39FF14]/30 overflow-hidden flex items-center justify-center shadow-[0_0_12px_rgba(57,255,20,0.1)]">
                  {userProfile?.photoURL ? (
                    <img src={userProfile.photoURL || undefined} alt="User Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon size={20} className="text-[#39FF14]" />
                  )}
                </div>
                <div>
                  <div className="flex items-center space-x-1.5">
                    <h2 className="text-xs font-semibold text-white tracking-wide">
                      {userProfile?.fullName || currentUser?.displayName || 'Distinguished Peer'}
                    </h2>
                    <span className="text-[9px] font-mono font-bold text-[#39FF14] bg-[#39FF14]/10 border border-[#39FF14]/20 px-1.5 py-0.5 rounded uppercase">
                      Level {reputation ? Math.floor(reputation.reputationPoints / 50) + 1 : 1}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-[10px] text-slate-400 font-mono">
                      Reputation Points: <strong className="text-white">{reputation?.reputationPoints ?? 10}</strong>
                    </span>
                    <button
                      onClick={() => setShowReputationInfo(true)}
                      className="p-0.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <Info size={11} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Stats/Badges Display */}
              <div className="hidden sm:flex flex-col items-end text-right relative">
                <span className="text-[9px] font-mono text-[#39FF14] uppercase tracking-wider">PRIMARY BADGE</span>
                <span className="text-[10px] font-sans font-semibold text-white mt-0.5 flex items-center">
                  <Award size={12} className="text-amber-400 mr-1" />
                  {reputation?.badges?.[reputation.badges.length - 1] || 'Community Novice'}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. DYNAMIC CONTENT BRANCH */}
      <AnimatePresence mode="wait">
        {selectedPost ? (
          
          /* ==================== A: POST DETAIL VIEW ==================== */
          <motion.div
            key="post-detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col space-y-4 px-1"
          >
            {/* Back to main Community bar */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setSelectedPost(null)}
                className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-[#39FF14] font-mono uppercase tracking-wider transition-colors cursor-pointer"
              >
                <ArrowLeft size={14} />
                <span>Back to Community</span>
              </button>
              
              <button
                onClick={() => setReportingPostId(selectedPost.postId)}
                className="text-[10px] text-red-400/80 hover:text-red-400 flex items-center space-x-1 font-mono uppercase transition-colors cursor-pointer"
              >
                <Flag size={11} />
                <span>Report Post</span>
              </button>
            </div>

            {/* Core Question Card */}
            <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-4 shadow-2xl backdrop-blur-md relative overflow-hidden">
              {/* Pinned or Instructor Accent lines */}
              {selectedPost.isInstructorPost && (
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 to-teal-500" />
              )}

              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-900 border border-white/10 overflow-hidden flex items-center justify-center">
                    {selectedPost.userPhoto ? (
                      <img src={selectedPost.userPhoto || undefined} alt="Author Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon size={14} className="text-slate-400" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <h4 className="text-xs font-semibold text-white">{selectedPost.userName}</h4>
                      {selectedPost.isInstructorPost && (
                        <span className="text-[8px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1 py-0.5 rounded flex items-center uppercase">
                          <UserCheck size={8} className="mr-0.5" /> INSTRUCTOR
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] text-slate-400 font-mono">
                      Published {new Date(selectedPost.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Course Indicator */}
                {selectedPost.courseTitle && (
                  <span className="text-[9px] font-mono text-[#39FF14] bg-[#39FF14]/5 border border-[#39FF14]/15 px-2 py-1 rounded max-w-[150px] truncate" title={selectedPost.courseTitle}>
                    📖 {selectedPost.courseTitle}
                  </span>
                )}
              </div>

              {/* Title & Body Description */}
              <div className="my-4 space-y-2.5">
                <h3 className="text-sm font-sans font-bold text-white tracking-tight leading-snug">
                  {selectedPost.title}
                </h3>
                
                <p className="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
                  {selectedPost.description}
                </p>

                {/* Associated Attachment Image preview */}
                {selectedPost.imageUrl && (
                  <div className="mt-4 rounded-xl overflow-hidden border border-white/10 bg-black/40 max-h-64 flex items-center justify-center">
                    <img
                      src={selectedPost.imageUrl || undefined}
                      alt="Attachment Preview"
                      className="max-h-64 object-contain"
                    />
                  </div>
                )}
              </div>

              {/* Metadata tags */}
              <div className="flex flex-wrap gap-1.5 pt-2">
                {selectedPost.tags.map((tag, i) => (
                  <span key={i} className="text-[9px] font-mono bg-white/5 border border-white/5 px-2 py-0.5 rounded text-slate-300">
                    #{tag}
                  </span>
                ))}
              </div>

              {/* Actions row: Like, Helpful, Heart, Bookmark */}
              <div className="flex items-center justify-between border-t border-white/5 mt-4 pt-3.5 text-slate-400">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => handleToggleReaction(selectedPost.postId, 'like')}
                    className={`flex items-center space-x-1 p-1 rounded-lg hover:text-[#39FF14] transition-colors cursor-pointer ${
                      postInteractions[selectedPost.postId]?.liked ? 'text-[#39FF14] bg-[#39FF14]/5' : ''
                    }`}
                  >
                    <ThumbsUp size={13} />
                    <span className="text-xs font-mono">{selectedPost.likesCount}</span>
                  </button>

                  <button
                    onClick={() => handleToggleReaction(selectedPost.postId, 'helpful')}
                    className={`flex items-center space-x-1 p-1 rounded-lg hover:text-amber-400 transition-colors cursor-pointer ${
                      postInteractions[selectedPost.postId]?.helpful ? 'text-amber-400 bg-amber-400/5' : ''
                    }`}
                  >
                    <Sparkles size={13} />
                    <span className="text-xs font-mono">{selectedPost.helpfulCount}</span>
                  </button>

                  <button
                    onClick={() => handleToggleReaction(selectedPost.postId, 'heart')}
                    className={`flex items-center space-x-1 p-1 rounded-lg hover:text-rose-400 transition-colors cursor-pointer ${
                      postInteractions[selectedPost.postId]?.heart ? 'text-rose-400 bg-rose-400/5' : ''
                    }`}
                  >
                    <Heart size={13} />
                    <span className="text-xs font-mono">{selectedPost.heartCount}</span>
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleToggleBookmark(selectedPost.postId)}
                    className={`p-1.5 hover:text-[#39FF14] transition-colors cursor-pointer ${
                      postInteractions[selectedPost.postId]?.bookmarked ? 'text-[#39FF14]' : ''
                    }`}
                  >
                    <Bookmark size={14} />
                  </button>
                  
                  <button
                    onClick={() => handleSharePost(selectedPost)}
                    className="p-1.5 hover:text-[#39FF14] transition-colors cursor-pointer"
                  >
                    <Share2 size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* ANSWERS / REPLIES HEADLINE */}
            <div className="flex items-center justify-between mt-6">
              <span className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase flex items-center">
                <MessageSquare size={12} className="text-[#39FF14] mr-1.5" />
                <span>Answers & Solutions ({replies.length})</span>
              </span>
            </div>

            {/* Answers Loop */}
            <div className="space-y-3.5">
              {isRepliesLoading ? (
                /* Shimmer loading replies */
                <div className="space-y-2">
                  <div className="h-16 bg-white/[0.01] border border-white/5 rounded-2xl animate-pulse" />
                  <div className="h-16 bg-white/[0.01] border border-white/5 rounded-2xl animate-pulse" />
                </div>
              ) : replies.length > 0 ? (
                replies.map(reply => {
                  const isAuthor = reply.userId === currentUser?.uid;
                  const isPostOwner = selectedPost.userId === currentUser?.uid;
                  const isInstructor = currentUser?.email === 'wahid23hasan@gmail.com' || currentUser?.email?.includes('instructor');
                  const isEditing = editingReplyId === reply.replyId;

                  return (
                    <div
                      key={reply.replyId}
                      className={`rounded-2xl p-4 shadow-lg border backdrop-blur-md transition-all duration-300 relative ${
                        reply.isBestAnswer
                          ? 'bg-emerald-950/30 border-emerald-500/40 shadow-[0_4px_20px_rgba(16,185,129,0.1)]'
                          : reply.isInstructorReply
                          ? 'bg-slate-900/60 border-indigo-500/20'
                          : 'bg-slate-950/60 border-white/5'
                      }`}
                    >
                      {/* Best Answer Golden Banner Ribbon */}
                      {reply.isBestAnswer && (
                        <div className="absolute top-2.5 right-3.5 flex items-center space-x-1 text-emerald-400 text-[9px] font-mono font-bold tracking-wider uppercase">
                          <CheckCircle size={11} className="text-emerald-400" />
                          <span>BEST ANSWER</span>
                        </div>
                      )}

                      <div className="flex items-center space-x-2.5 pb-2.5 border-b border-white/5 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-900 border border-white/5 overflow-hidden flex items-center justify-center">
                          {reply.userPhoto ? (
                            <img src={reply.userPhoto || undefined} alt="Reply user avatar" className="w-full h-full object-cover" />
                          ) : (
                            <UserIcon size={12} className="text-slate-400" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <h5 className="text-xs font-semibold text-white">{reply.userName}</h5>
                            {reply.isInstructorReply && (
                              <span className="text-[7.5px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1 rounded">
                                INSTRUCTOR
                              </span>
                            )}
                          </div>
                          <span className="text-[8px] text-slate-500 font-mono">
                            {new Date(reply.createdAt).toLocaleDateString()} at {new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      {/* Editing Message area */}
                      {isEditing ? (
                        <div className="space-y-2 mt-2">
                          <textarea
                            value={editingMessage}
                            onChange={(e) => setEditingMessage(e.target.value)}
                            className="w-full bg-slate-900 border border-white/15 rounded-xl p-3 text-xs text-white focus:border-[#39FF14]/50 outline-none"
                            rows={3}
                          />
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => setEditingReplyId(null)}
                              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg text-[10px] font-mono cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveEditReply(reply.replyId)}
                              className="px-3 py-1.5 bg-[#39FF14] hover:bg-[#32e011] text-black font-semibold rounded-lg text-[10px] font-mono cursor-pointer"
                            >
                              Save Edit
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
                          {reply.message}
                        </p>
                      )}

                      {/* Reply Controls: Edit, Delete, Mark Best Answer */}
                      <div className="mt-3.5 pt-2 border-t border-white/5 flex items-center justify-between text-slate-500 text-[10px]">
                        <div className="flex items-center space-x-2.5">
                          {isAuthor && !isEditing && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingReplyId(reply.replyId);
                                  setEditingMessage(reply.message);
                                }}
                                className="hover:text-[#39FF14] flex items-center space-x-1 cursor-pointer transition-colors"
                              >
                                <Edit3 size={11} />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => handleDeleteReply(reply.replyId)}
                                className="hover:text-red-400 flex items-center space-x-1 cursor-pointer transition-colors"
                              >
                                <Trash2 size={11} />
                                <span>Delete</span>
                              </button>
                            </>
                          )}
                        </div>

                        {/* Best Answer Mark (Poster or Instructor can mark) */}
                        {!reply.isBestAnswer && (isPostOwner || isInstructor) && (
                          <button
                            onClick={() => handleMarkBestAnswer(reply.replyId)}
                            className="text-[#39FF14] hover:underline flex items-center space-x-1 cursor-pointer"
                          >
                            <CheckCircle size={11} />
                            <span>Mark Best Answer</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10 bg-slate-950/40 rounded-2xl border border-white/5 p-4">
                  <MessageSquare size={32} className="mx-auto text-slate-600 mb-2 animate-bounce" />
                  <h4 className="text-xs font-semibold text-white">No solutions yet</h4>
                  <p className="text-[10px] text-slate-400 mt-1 font-sans">
                    Be the first helper to answer this student question!
                  </p>
                </div>
              )}
            </div>

            {/* ADD REPLY FORM */}
            {currentUser ? (
              <form onSubmit={handlePostReply} className="bg-slate-950/80 border border-white/10 rounded-2xl p-4 shadow-xl backdrop-blur-md mt-6">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-2.5">
                  Publish Your Answer
                </span>
                <textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Explain your explanation clearly. Include code blocks, formulas or helpful resources..."
                  className="w-full bg-slate-900/60 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:border-[#39FF14]/40 focus:bg-slate-900 outline-none transition-all"
                  rows={4}
                  required
                />
                <div className="flex justify-end mt-2.5">
                  <button
                    type="submit"
                    disabled={isSubmittingReply}
                    className="px-5 py-2 bg-[#39FF14] hover:bg-[#32e011] disabled:bg-slate-800 text-black font-semibold rounded-xl text-xs flex items-center space-x-1.5 cursor-pointer shadow-lg transition-colors"
                  >
                    {isSubmittingReply ? (
                      <span>Publishing...</span>
                    ) : (
                      <>
                        <PlusCircle size={14} />
                        <span>Submit Answer</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4 text-center mt-4">
                <span className="text-[10px] text-slate-400">Please log in to submit replies to community questions.</span>
              </div>
            )}
          </motion.div>
        ) : (
          
          /* ==================== B: DISCUSSION DIRECTORY HOME ==================== */
          <motion.div
            key="community-home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col space-y-4"
          >
            {onBackToProfile && (
              <div className="flex items-center justify-between pb-1">
                <button
                  onClick={onBackToProfile}
                  className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-[#39FF14] font-mono uppercase tracking-wider transition-colors cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>Back to Profile</span>
                </button>
              </div>
            )}

            {/* SEARCH AND ASK BUTTON OVERVIEW */}
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="text"
                  placeholder="Search questions, programs, tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950/80 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:border-[#39FF14]/50 outline-none transition-all backdrop-blur-sm font-sans"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {currentUser && (
                <button
                  onClick={() => setShowAskModal(true)}
                  className="px-3.5 py-2.5 bg-[#39FF14] hover:bg-[#32e011] text-black rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center space-x-1.5 shadow-[0_2px_12px_rgba(57,255,20,0.2)]"
                >
                  <PlusCircle size={15} />
                  <span className="hidden sm:inline">Ask Question</span>
                </button>
              )}
            </div>

            {/* DYNAMIC FILTER TABS */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1.5 scrollbar-none snap-x touch-pan-x">
              {[
                { id: 'latest', label: 'Latest' },
                { id: 'trending', label: 'Trending 🔥' },
                { id: 'instructorAnswered', label: 'Instructor Posts 🎓' },
                { id: 'myDiscussions', label: 'My Posts 👤' },
                { id: 'unanswered', label: 'Unanswered ❓' }
              ].map((tab) => {
                const isActive = activeFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveFilter(tab.id as any)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap snap-center transition-all duration-300 border cursor-pointer ${
                      isActive
                        ? 'bg-[#39FF14]/10 border-[#39FF14] text-[#39FF14] shadow-[0_0_12px_rgba(57,255,20,0.15)]'
                        : 'bg-white/[0.02] border-white/5 hover:border-white/15 text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* DIRECTORY LIST LOOP */}
            <div className="space-y-3.5">
              {isLoading ? (
                /* Shimmer loaders */
                <div className="space-y-3">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="w-full h-32 rounded-2xl bg-white/[0.01] border border-white/5 animate-pulse" />
                  ))}
                </div>
              ) : posts.length > 0 ? (
                posts.map((post) => {
                  const interactions = postInteractions[post.postId];
                  return (
                    <motion.div
                      id={`post-card-${post.postId}`}
                      key={post.postId}
                      onClick={() => handleViewPostDetails(post)}
                      className="bg-slate-950/70 hover:bg-slate-950 border border-white/10 rounded-2xl p-4 shadow-md backdrop-blur-md cursor-pointer transition-all hover:scale-[1.01] duration-300 relative group"
                    >
                      {/* Pinned Accent strip */}
                      {post.isPinned && (
                        <div className="absolute top-0 left-0 bottom-0 w-1 bg-[#39FF14] rounded-l-2xl shadow-[0_0_8px_#39FF14]" />
                      )}

                      {/* Header row metadata */}
                      <div className="flex items-center justify-between pb-2.5 border-b border-white/5">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-lg bg-slate-900 border border-white/10 overflow-hidden flex items-center justify-center">
                            {post.userPhoto ? (
                              <img src={post.userPhoto || undefined} alt="Poster Avatar" className="w-full h-full object-cover" />
                            ) : (
                              <UserIcon size={12} className="text-slate-400" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center space-x-1">
                              <span className="text-[10px] font-semibold text-white">{post.userName}</span>
                              {post.isInstructorPost && (
                                <span className="text-[7.5px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1 rounded flex items-center uppercase">
                                  INSTRUCTOR
                                </span>
                              )}
                            </div>
                            <span className="text-[8px] text-slate-500 font-mono">
                              {new Date(post.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {/* Pinned or Tag indication */}
                        {post.isPinned ? (
                          <span className="text-[8px] font-mono font-bold text-[#39FF14] bg-[#39FF14]/10 border border-[#39FF14]/25 px-1.5 py-0.5 rounded uppercase flex items-center">
                            📌 PINNED
                          </span>
                        ) : post.courseTitle ? (
                          <span className="text-[8.5px] font-mono text-slate-400 bg-white/5 border border-white/5 px-2 py-0.5 rounded max-w-[120px] truncate">
                            📖 {post.courseTitle}
                          </span>
                        ) : null}
                      </div>

                      {/* Post Content */}
                      <div className="my-3">
                        <h4 className="text-xs font-semibold text-white group-hover:text-[#39FF14] transition-colors leading-snug">
                          {post.title}
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {post.description}
                        </p>
                      </div>

                      {/* Tags list */}
                      <div className="flex flex-wrap gap-1 mt-2 mb-3">
                        {post.tags.slice(0, 3).map((tag, i) => (
                          <span key={i} className="text-[8px] font-mono bg-white/5 border border-white/5 px-1.5 py-0.5 rounded text-slate-400">
                            #{tag}
                          </span>
                        ))}
                      </div>

                      {/* Interactive metadata details */}
                      <div className="flex items-center justify-between border-t border-white/5 pt-2 text-slate-500 text-[10px]">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleReaction(post.postId, 'like');
                            }}
                            className={`flex items-center space-x-1 hover:text-[#39FF14] transition-colors cursor-pointer ${
                              interactions?.liked ? 'text-[#39FF14]' : ''
                            }`}
                          >
                            <ThumbsUp size={11} />
                            <span className="font-mono">{post.likesCount}</span>
                          </button>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleReaction(post.postId, 'helpful');
                            }}
                            className={`flex items-center space-x-1 hover:text-amber-400 transition-colors cursor-pointer ${
                              interactions?.helpful ? 'text-amber-400' : ''
                            }`}
                          >
                            <Sparkles size={11} />
                            <span className="font-mono">{post.helpfulCount}</span>
                          </button>

                          <div className="flex items-center space-x-1 text-slate-500">
                            <MessageSquare size={11} />
                            <span className="font-mono">{post.repliesCount}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleBookmark(post.postId);
                            }}
                            className={`p-1 hover:text-[#39FF14] cursor-pointer transition-colors ${
                              interactions?.bookmarked ? 'text-[#39FF14]' : ''
                            }`}
                          >
                            <Bookmark size={12} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                /* Pure Empty state */
                <div className="text-center py-12 bg-white/[0.01] border border-white/5 rounded-2xl p-6">
                  <Compass size={40} className="text-slate-500 mx-auto animate-pulse mb-3" />
                  <h4 className="text-xs font-semibold text-white">No discussions match your filter</h4>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed font-sans">
                    Be the first student to kick-start this topic! Click "Ask Question" above.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= MODAL 1: ASK QUESTION POPUP ================= */}
      <AnimatePresence>
        {showAskModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAskModal(false)}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-950 border border-white/15 rounded-3xl p-5 shadow-2xl relative w-full max-w-md overflow-y-auto max-h-[85vh]"
            >
              <button
                onClick={() => setShowAskModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>

              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#39FF14] flex items-center space-x-1.5 mb-1">
                <Sparkles size={11} className="animate-pulse" />
                <span>NEXUS COMMUNITY SYSTEM</span>
              </span>
              <h3 className="text-sm font-sans font-bold text-white mb-4">
                Launch a Academic Question
              </h3>

              <form onSubmit={handleAskQuestion} className="space-y-4">
                {/* Title */}
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5">Question Title</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g., tsconfig path mapping issues with Vite and React"
                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:border-[#39FF14]/40 outline-none transition-all"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5">Detailed description</label>
                  <textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Describe what error you are seeing, what approaches you tried, and attach error logs or codes..."
                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:border-[#39FF14]/40 outline-none transition-all"
                    rows={4}
                    required
                  />
                </div>

                {/* Course Selection Linkage */}
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5">Link Course (Optional)</label>
                  <select
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 text-xs text-slate-300 rounded-xl p-2.5 outline-none focus:border-[#39FF14]/40"
                  >
                    <option value="">-- No specific course --</option>
                    {courses.map(course => (
                      <option key={course.courseId} value={course.courseId}>{course.title}</option>
                    ))}
                  </select>
                </div>

                {/* Optional Lesson details */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Chapter ID (Opt)</label>
                    <input
                      type="text"
                      placeholder="e.g. Chapter 1"
                      value={chapterText}
                      onChange={(e) => setChapterText(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:border-[#39FF14]/40 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Lesson (Opt)</label>
                    <input
                      type="text"
                      placeholder="e.g. Setting up path resolution"
                      value={lessonText}
                      onChange={(e) => setLessonText(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:border-[#39FF14]/40 outline-none"
                    />
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5">Tags (Comma separated)</label>
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="e.g., TypeScript, Vite, Resolution"
                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:border-[#39FF14]/40 outline-none transition-all"
                  />
                </div>

                {/* Optional Image Attachment */}
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5">Image URL Attachment (Optional)</label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/screenshot.png"
                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:border-[#39FF14]/40 outline-none transition-all"
                  />
                </div>

                {/* Actions submit */}
                <div className="flex space-x-2.5 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingQuestion}
                    className="flex-1 py-3 bg-[#39FF14] hover:bg-[#32e011] disabled:bg-slate-800 text-black font-semibold rounded-xl text-xs transition-colors cursor-pointer text-center"
                  >
                    {isSubmittingQuestion ? 'Launching Post...' : 'Publish to Community'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAskModal(false)}
                    className="px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs transition-colors border border-white/10 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= MODAL 2: REPORT POST REASON POPUP ================= */}
      <AnimatePresence>
        {reportingPostId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setReportingPostId(null)}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-950 border border-white/15 rounded-3xl p-5 shadow-2xl relative w-full max-w-sm"
            >
              <button
                onClick={() => setReportingPostId(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>

              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-red-400 flex items-center space-x-1.5 mb-1">
                <AlertTriangle size={11} className="text-red-400" />
                <span>MODERATION QUEUE</span>
              </span>
              <h3 className="text-sm font-sans font-bold text-white mb-3">
                Report Discussion
              </h3>

              <div className="space-y-4">
                <p className="text-[10.5px] text-slate-400 leading-normal">
                  Our system flags and automatically hides content that accumulates 3 reports. Let us know why this post is inappropriate:
                </p>

                <div className="space-y-2">
                  {[
                    'Spam, advertising, or crypto scams',
                    'Abusive language or personal attacks',
                    'Irrelevant topics or cheating answers',
                    'Copyright violations'
                  ].map((reason) => (
                    <button
                      key={reason}
                      onClick={() => setReportReason(reason)}
                      className={`w-full p-2.5 rounded-xl border text-left text-xs font-medium cursor-pointer transition-all ${
                        reportReason === reason
                          ? 'bg-red-500/10 border-red-500/30 text-red-400'
                          : 'bg-white/[0.01] border-white/5 hover:bg-white/5 text-slate-300'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>

                <div className="flex space-x-2 pt-2">
                  <button
                    onClick={handleReportPostSubmit}
                    disabled={!reportReason}
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-800 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Submit Report
                  </button>
                  <button
                    onClick={() => setReportingPostId(null)}
                    className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs transition-colors border border-white/10 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= MODAL 3: REPUTATION INFO POPUP ================= */}
      <AnimatePresence>
        {showReputationInfo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowReputationInfo(false)}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-950 border border-white/15 rounded-3xl p-5 shadow-2xl relative w-full max-w-sm"
            >
              <button
                onClick={() => setShowReputationInfo(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>

              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#39FF14] flex items-center space-x-1.5 mb-1">
                <Award size={11} className="text-[#39FF14]" />
                <span>NEXUS CREDENTIAL SYSTEM</span>
              </span>
              <h3 className="text-sm font-sans font-bold text-white mb-3">
                How Academic Reputation Works
              </h3>

              <div className="space-y-4 text-[11px] text-slate-300 leading-relaxed font-sans">
                <p>
                  Nexus Academy encourages peer-to-peer knowledge sharing. Earn reputation points to level up and unlock exclusive community credentials:
                </p>

                <div className="space-y-2 border-y border-white/5 py-3">
                  <div className="flex justify-between">
                    <span>Ask a Question</span>
                    <span className="text-[#39FF14] font-mono">+5 Points</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Submit an Answer</span>
                    <span className="text-[#39FF14] font-mono">+10 Points</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Marked "Best Answer"</span>
                    <span className="text-[#39FF14] font-mono">+25 Points</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Receiving Reactions (Like, etc)</span>
                    <span className="text-[#39FF14] font-mono">+2 Points</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-white font-semibold">Available Community Badges:</span>
                  <ul className="list-disc list-inside text-slate-400 space-y-0.5">
                    <li><strong className="text-white">Community Novice</strong>: Starting level (0-49 pts)</li>
                    <li><strong className="text-white">Helpful Contributor</strong>: Earned at 50 pts</li>
                    <li><strong className="text-white">Scholar Guide</strong>: Earned at 100 pts</li>
                    <li><strong className="text-white">Academy Expert</strong>: Earned at 200 pts</li>
                  </ul>
                </div>

                <button
                  onClick={() => setShowReputationInfo(false)}
                  className="w-full mt-2 py-2 bg-[#39FF14] hover:bg-[#32e011] text-black font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Close Info
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
