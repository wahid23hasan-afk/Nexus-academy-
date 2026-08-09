import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Star, 
  X, 
  ThumbsUp, 
  CheckCircle2, 
  MessageSquare, 
  Sparkles, 
  Plus, 
  Award,
  User
} from 'lucide-react';

interface Review {
  id: string;
  studentName: string;
  rating: number;
  date: string;
  comment: string;
  tags: string[];
  helpfulCount: number;
  verifiedStudent: boolean;
}

const SAMPLE_REVIEWS: Review[] = [
  {
    id: 'rev_1',
    studentName: 'Tanvir Ahmed',
    rating: 5,
    date: '2 days ago',
    comment: 'Exceptional vector and motion problem solving techniques! The instructor explains every shortcut clearly.',
    tags: ['Clear Explanations', 'High Yield', 'Great Exercises'],
    helpfulCount: 14,
    verifiedStudent: true
  },
  {
    id: 'rev_2',
    studentName: 'Nusrat Jahan',
    rating: 5,
    date: '1 week ago',
    comment: 'The live practice quizzes and flashcard decks helped me top my college term exams. Highly recommended!',
    tags: ['Top Quality', 'Exam Focused'],
    helpfulCount: 9,
    verifiedStudent: true
  },
  {
    id: 'rev_3',
    studentName: 'Siam Rahman',
    rating: 4,
    date: '2 weeks ago',
    comment: 'Great course overall. Would love even more practice PDF sheets attached to chapter 4.',
    tags: ['Good Content', 'Helpful Audio'],
    helpfulCount: 5,
    verifiedStudent: true
  }
];

interface CourseReviewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseTitle: string;
  rating: number;
  totalReviews: number;
  onShowNotification: (message: string, type: 'success' | 'error') => void;
}

export function CourseReviewsModal({
  isOpen,
  onClose,
  courseTitle,
  rating,
  totalReviews,
  onShowNotification
}: CourseReviewsModalProps) {
  const [reviews, setReviews] = useState<Review[]>(SAMPLE_REVIEWS);
  const [isWriteOpen, setIsWriteOpen] = useState<boolean>(false);

  // Form State
  const [userRating, setUserRating] = useState<number>(5);
  const [commentText, setCommentText] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('High Yield');

  if (!isOpen) return null;

  const handleVoteHelpful = (id: string) => {
    setReviews(prev => prev.map(r => r.id === id ? { ...r, helpfulCount: r.helpfulCount + 1 } : r));
    onShowNotification('Liked student review!', 'success');
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) {
      onShowNotification('Please write a short review comment.', 'error');
      return;
    }

    const newRev: Review = {
      id: 'rev_' + Date.now(),
      studentName: 'Scholar (You)',
      rating: userRating,
      date: 'Just now',
      comment: commentText.trim(),
      tags: [selectedTag],
      helpfulCount: 0,
      verifiedStudent: true
    };

    setReviews(prev => [newRev, ...prev]);
    setCommentText('');
    setIsWriteOpen(false);
    onShowNotification('🌟 Thank you! Your course review has been published.', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="glass-panel max-w-2xl w-full p-6 rounded-2xl border border-white/10 space-y-6 relative bg-slate-900 my-8 max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider">Verified Reviews</span>
            <h3 className="text-base font-bold text-white leading-tight">{courseTitle}</h3>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl bg-white/5 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Rating Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
          <div className="text-center sm:border-r border-white/10 pr-2 space-y-1">
            <span className="text-3xl font-extrabold text-white font-mono">{(typeof rating === 'number' ? rating : Number(rating) || 5.0).toFixed(1)}</span>
            <div className="flex justify-center text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={14} fill={i < Math.floor(typeof rating === 'number' ? rating : Number(rating) || 5.0) ? 'currentColor' : 'none'} />
              ))}
            </div>
            <p className="text-[10px] text-slate-400 font-mono">{totalReviews} Verified Ratings</p>
          </div>

          <div className="sm:col-span-2 space-y-1 text-xs font-mono text-slate-300">
            <div className="flex items-center space-x-2">
              <span className="w-12 text-[10px]">5 Stars</span>
              <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full w-[85%]" />
              </div>
              <span className="text-[10px]">85%</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-12 text-[10px]">4 Stars</span>
              <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full w-[12%]" />
              </div>
              <span className="text-[10px]">12%</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-12 text-[10px]">3 Stars</span>
              <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full w-[3%]" />
              </div>
              <span className="text-[10px]">3%</span>
            </div>
          </div>
        </div>

        {/* Write Review Toggle Button */}
        <div className="flex justify-between items-center">
          <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
            <MessageSquare size={14} className="text-amber-400" />
            <span>Student Feedback ({reviews.length})</span>
          </h4>

          <button
            onClick={() => setIsWriteOpen(!isWriteOpen)}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer font-mono"
          >
            <Plus size={14} />
            <span>Write Review</span>
          </button>
        </div>

        {/* Write Review Form */}
        {isWriteOpen && (
          <form onSubmit={handleSubmitReview} className="p-4 bg-white/5 border border-amber-500/30 rounded-2xl space-y-3 font-sans text-xs">
            <div className="flex items-center space-x-2">
              <span className="font-mono text-slate-300">Your Rating:</span>
              <div className="flex text-amber-400 cursor-pointer">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={18}
                    fill={s <= userRating ? 'currentColor' : 'none'}
                    onClick={() => setUserRating(s)}
                    className="p-0.5"
                  />
                ))}
              </div>
            </div>

            <textarea
              rows={3}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Share what you liked about this course, instructor, or lectures..."
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500"
              required
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="font-mono text-slate-400 text-[11px]">Tag:</span>
                <select
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-lg p-1 text-xs text-white"
                >
                  <option value="High Yield">High Yield</option>
                  <option value="Clear Explanations">Clear Explanations</option>
                  <option value="Great Exercises">Great Exercises</option>
                  <option value="Exam Focused">Exam Focused</option>
                </select>
              </div>

              <button
                type="submit"
                className="px-4 py-2 bg-amber-500 text-black font-bold rounded-xl font-mono text-xs cursor-pointer"
              >
                Submit Review
              </button>
            </div>
          </form>
        )}

        {/* Review Cards List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {reviews.map((rev) => (
            <div key={rev.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-xs border border-amber-500/20">
                    <User size={14} />
                  </div>
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-bold text-white">{rev.studentName}</span>
                      {rev.verifiedStudent && (
                        <span className="inline-flex items-center text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20">
                          <CheckCircle2 size={10} className="mr-0.5" /> Verified Student
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">{rev.date}</span>
                  </div>
                </div>

                <div className="flex text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={12} fill={i < rev.rating ? 'currentColor' : 'none'} />
                  ))}
                </div>
              </div>

              <p className="text-xs text-slate-300 font-sans leading-relaxed">{rev.comment}</p>

              <div className="flex items-center justify-between pt-1 text-[10px] font-mono">
                <div className="flex gap-1">
                  {rev.tags.map(t => (
                    <span key={t} className="bg-white/5 text-amber-400 px-2 py-0.5 rounded-md">
                      #{t}
                    </span>
                  ))}
                </div>

                <button
                  onClick={() => handleVoteHelpful(rev.id)}
                  className="text-slate-400 hover:text-white flex items-center space-x-1 bg-white/5 px-2 py-1 rounded-lg border border-white/5 cursor-pointer"
                >
                  <ThumbsUp size={12} />
                  <span>Helpful ({rev.helpfulCount})</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
