import React, { useState, useEffect } from 'react';
import { 
  Star, 
  Search, 
  Filter, 
  CheckCircle, 
  EyeOff, 
  Trash2, 
  RefreshCw, 
  MessageSquare, 
  User, 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  ShieldAlert,
  AlertCircle,
  ThumbsUp,
  Mail,
  SlidersHorizontal
} from 'lucide-react';
import { db } from '../services/firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  orderBy 
} from 'firebase/firestore';

export interface FirestoreReviewItem {
  id: string; // Document ID
  courseId: string;
  courseTitle?: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  rating: number;
  comment: string;
  status: 'approved' | 'pending' | 'hidden' | string;
  createdAt: string;
}

interface ReviewsPageProps {
  onShowNotification?: (message: string, type: 'success' | 'error') => void;
}

export function ReviewsPage({ onShowNotification }: ReviewsPageProps) {
  const [reviews, setReviews] = useState<FirestoreReviewItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [ratingFilter, setRatingFilter] = useState<string>('all');

  // Lookup maps for fallback resolution: courseId -> courseTitle, userId -> { name, email }
  const [courseMap, setCourseMap] = useState<Record<string, string>>({});
  const [userMap, setUserMap] = useState<Record<string, { name?: string; email?: string }>>({});

  // 1. Fetch courses & users collections once for resolution fallback
  useEffect(() => {
    let isMounted = true;
    const fetchLookups = async () => {
      try {
        const coursesSnap = await getDocs(collection(db, 'courses'));
        const cMap: Record<string, string> = {};
        coursesSnap.forEach(docSnap => {
          const data = docSnap.data();
          if (data.title) cMap[docSnap.id] = data.title;
          if (data.courseId && data.title) cMap[data.courseId] = data.title;
        });

        const usersSnap = await getDocs(collection(db, 'users'));
        const uMap: Record<string, { name?: string; email?: string }> = {};
        usersSnap.forEach(docSnap => {
          const data = docSnap.data();
          const info = {
            name: data.fullName || data.displayName || data.username,
            email: data.email
          };
          uMap[docSnap.id] = info;
          if (data.uid) uMap[data.uid] = info;
        });

        if (isMounted) {
          setCourseMap(cMap);
          setUserMap(uMap);
        }
      } catch (err) {
        console.warn('Fallback resolution lookup fetch warning:', err);
      }
    };
    fetchLookups();
    return () => { isMounted = false; };
  }, []);

  // 2. Real-time Firestore sync on collection "reviews"
  useEffect(() => {
    setLoading(true);
    let q;
    try {
      q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'));
    } catch {
      q = collection(db, 'reviews');
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: FirestoreReviewItem[] = snapshot.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            courseId: data.courseId || '',
            courseTitle: data.courseTitle || '',
            userId: data.userId || '',
            userName: data.userName || '',
            userEmail: data.userEmail || '',
            rating: typeof data.rating === 'number' ? data.rating : 5,
            comment: data.comment || '',
            status: data.status || 'approved',
            createdAt: data.createdAt || new Date().toISOString()
          };
        });

        // In-memory sort by createdAt descending to guarantee order
        items.sort((a, b) => {
          const timeA = new Date(a.createdAt).getTime() || 0;
          const timeB = new Date(b.createdAt).getTime() || 0;
          return timeB - timeA;
        });

        setReviews(items);
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to reviews collection:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Auto-fallback Name Resolution Logic
  const resolveCourseName = (review: FirestoreReviewItem): string => {
    if (review.courseTitle && review.courseTitle.trim()) {
      return review.courseTitle;
    }
    if (review.courseId && courseMap[review.courseId]) {
      return courseMap[review.courseId];
    }
    return review.courseId ? `Course (${review.courseId})` : 'Unassigned Course';
  };

  const resolveUserName = (review: FirestoreReviewItem): string => {
    if (review.userName && review.userName.trim()) {
      return review.userName;
    }
    if (review.userEmail && review.userEmail.trim()) {
      return review.userEmail;
    }
    if (review.userId && userMap[review.userId]) {
      const u = userMap[review.userId];
      if (u.name && u.name.trim()) return u.name;
      if (u.email && u.email.trim()) return u.email;
    }
    return review.userId ? `Student (${review.userId.substring(0, 8)}...)` : 'Anonymous Student';
  };

  const resolveUserEmail = (review: FirestoreReviewItem): string => {
    if (review.userEmail && review.userEmail.trim()) return review.userEmail;
    if (review.userId && userMap[review.userId]?.email) return userMap[review.userId].email!;
    return 'No email provided';
  };

  // Admin Actions
  const handleUpdateStatus = async (reviewId: string, newStatus: 'approved' | 'hidden' | 'pending') => {
    try {
      await updateDoc(doc(db, 'reviews', reviewId), { status: newStatus });
      if (onShowNotification) {
        onShowNotification(`Review status updated to "${newStatus}"`, 'success');
      }
    } catch (err) {
      console.error('Failed to update review status:', err);
      if (onShowNotification) {
        onShowNotification('Failed to update review status', 'error');
      }
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!window.confirm('Are you sure you want to delete this review permanently?')) return;
    try {
      await deleteDoc(doc(db, 'reviews', reviewId));
      if (onShowNotification) {
        onShowNotification('Review deleted from Firestore', 'success');
      }
    } catch (err) {
      console.error('Failed to delete review:', err);
      if (onShowNotification) {
        onShowNotification('Failed to delete review', 'error');
      }
    }
  };

  // Search & Filter
  const filteredReviews = reviews.filter(rev => {
    const courseName = resolveCourseName(rev).toLowerCase();
    const userName = resolveUserName(rev).toLowerCase();
    const userEmail = resolveUserEmail(rev).toLowerCase();
    const comment = rev.comment.toLowerCase();
    const queryStr = searchTerm.toLowerCase().trim();

    const matchesSearch = 
      !queryStr ||
      courseName.includes(queryStr) ||
      userName.includes(queryStr) ||
      userEmail.includes(queryStr) ||
      comment.includes(queryStr);

    const matchesStatus = 
      statusFilter === 'all' || 
      rev.status === statusFilter;

    const matchesRating = 
      ratingFilter === 'all' || 
      rev.rating === Number(ratingFilter);

    return matchesSearch && matchesStatus && matchesRating;
  });

  // Calculate statistics
  const totalCount = reviews.length;
  const approvedCount = reviews.filter(r => r.status === 'approved').length;
  const pendingCount = reviews.filter(r => r.status === 'pending').length;
  const hiddenCount = reviews.filter(r => r.status === 'hidden').length;
  const avgRating = totalCount > 0 
    ? (reviews.reduce((acc, curr) => acc + (curr.rating || 0), 0) / totalCount).toFixed(1)
    : '0.0';

  return (
    <div className="w-full space-y-6 text-slate-100 p-2 sm:p-4">
      {/* Header & Stats Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 p-5 rounded-2xl border border-white/10 backdrop-blur-md">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Star size={20} className="fill-amber-400" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Review & Rating Management</h2>
              <p className="text-xs text-slate-400">Live synced reviews collection from student panel</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
            <span className="text-[10px] uppercase font-mono text-slate-400">Total</span>
            <div className="text-lg font-bold text-white font-mono">{totalCount}</div>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
            <span className="text-[10px] uppercase font-mono text-emerald-400">Approved</span>
            <div className="text-lg font-bold text-emerald-400 font-mono">{approvedCount}</div>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center">
            <span className="text-[10px] uppercase font-mono text-amber-400">Avg Rating</span>
            <div className="text-lg font-bold text-amber-300 font-mono">⭐ {avgRating}</div>
          </div>
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-center">
            <span className="text-[10px] uppercase font-mono text-rose-400">Hidden</span>
            <div className="text-lg font-bold text-rose-400 font-mono">{hiddenCount}</div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900/60 p-4 rounded-2xl border border-white/10 flex flex-col md:flex-row items-center gap-3">
        {/* Search Field */}
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by student name, course title, or review comment..."
            className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
          />
        </div>

        {/* Status Dropdown */}
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <Filter size={14} className="text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/60 shrink-0 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="hidden">Hidden</option>
          </select>

          {/* Rating Dropdown */}
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/60 shrink-0 cursor-pointer"
          >
            <option value="all">All Ratings</option>
            <option value="5">5 Stars ⭐⭐⭐⭐⭐</option>
            <option value="4">4 Stars ⭐⭐⭐⭐</option>
            <option value="3">3 Stars ⭐⭐⭐</option>
            <option value="2">2 Stars ⭐⭐</option>
            <option value="1">1 Star ⭐</option>
          </select>
        </div>
      </div>

      {/* Reviews Table / Card Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3 bg-slate-900/40 rounded-2xl border border-white/5">
          <RefreshCw size={24} className="animate-spin text-amber-400" />
          <p className="text-xs text-slate-400 font-mono">Loading live reviews from Firestore...</p>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3 bg-slate-900/40 rounded-2xl border border-white/5 text-center px-4">
          <MessageSquare size={36} className="text-slate-600" />
          <h4 className="text-sm font-bold text-slate-300">No reviews found</h4>
          <p className="text-xs text-slate-500 max-w-md">
            {searchTerm || statusFilter !== 'all' || ratingFilter !== 'all'
              ? 'Try adjusting your search query or filter criteria.'
              : 'No student reviews have been submitted yet in the "reviews" collection.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredReviews.map((review) => {
            const courseTitle = resolveCourseName(review);
            const userName = resolveUserName(review);
            const userEmail = resolveUserEmail(review);
            const dateStr = review.createdAt 
              ? new Date(review.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
              : 'Unknown date';

            return (
              <div 
                key={review.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  review.status === 'hidden'
                    ? 'bg-rose-950/10 border-rose-500/20 opacity-75'
                    : review.status === 'pending'
                    ? 'bg-amber-950/10 border-amber-500/20'
                    : 'bg-slate-900/60 border-white/10 hover:border-white/20'
                }`}
              >
                {/* Left: Review Info */}
                <div className="space-y-2 flex-1 min-w-0">
                  {/* Top Bar: Course Title & Status Badge */}
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[11px] font-bold">
                      <BookOpen size={12} className="shrink-0" />
                      <span className="truncate max-w-[240px]">{courseTitle}</span>
                    </span>

                    {/* Rating Stars */}
                    <div className="flex items-center space-x-0.5 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg text-amber-300 text-xs font-bold font-mono">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Star 
                          key={idx} 
                          size={12} 
                          className={idx < review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-600'} 
                        />
                      ))}
                      <span className="ml-1 text-[11px]">{review.rating}.0</span>
                    </div>

                    {/* Status Badge */}
                    <span 
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                        review.status === 'approved'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : review.status === 'hidden'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {review.status || 'approved'}
                    </span>
                  </div>

                  {/* Comment */}
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans bg-black/20 p-3 rounded-xl border border-white/5 whitespace-pre-line">
                    "{review.comment}"
                  </p>

                  {/* Meta: User details & Timestamp */}
                  <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400 font-mono">
                    <div className="flex items-center space-x-1 text-slate-300 font-semibold">
                      <User size={12} className="text-amber-400" />
                      <span>{userName}</span>
                    </div>
                    {userEmail && userEmail !== 'No email provided' && (
                      <div className="flex items-center space-x-1 text-slate-400">
                        <Mail size={12} />
                        <span>{userEmail}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-1 text-slate-500">
                      <Clock size={12} />
                      <span>{dateStr}</span>
                    </div>
                    <div className="text-slate-600 text-[10px]">
                      ID: {review.id}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center space-x-2 shrink-0 border-t md:border-t-0 md:border-l border-white/10 pt-3 md:pt-0 md:pl-4 justify-end">
                  {review.status !== 'approved' && (
                    <button
                      onClick={() => handleUpdateStatus(review.id, 'approved')}
                      title="Approve & Show Review"
                      className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer"
                    >
                      <CheckCircle size={14} />
                      <span>Approve</span>
                    </button>
                  )}

                  {review.status !== 'hidden' && (
                    <button
                      onClick={() => handleUpdateStatus(review.id, 'hidden')}
                      title="Hide Review"
                      className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer"
                    >
                      <EyeOff size={14} />
                      <span>Hide</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleDeleteReview(review.id)}
                    title="Delete Review Permanently"
                    className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-all cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ReviewsPage;
