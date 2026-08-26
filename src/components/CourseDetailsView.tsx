import React from 'react';
import { CourseDetails } from './CourseDetails';
import { Course } from '../types/course';

export interface CourseDetailsViewProps {
  course: Course;
  userProfile: { fullName: string; username: string; email?: string; photoURL?: string; role?: string; isAdmin?: boolean } | null;
  onBack: () => void;
  onShowNotification: (message: string, type: 'success' | 'error') => void;
  isWishlisted: boolean;
  onToggleWishlist: () => void;
  isEnrolled: boolean;
  isPending?: boolean;
  onEnroll: () => void;
  onSelectCourse: (course: Course) => void;
}

export function CourseDetailsView({
  course,
  userProfile,
  onBack,
  onShowNotification,
  isWishlisted,
  onToggleWishlist,
  isEnrolled,
  isPending = false,
  onEnroll,
  onSelectCourse
}: CourseDetailsViewProps) {
  if (!course) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#050811] text-slate-100 min-h-screen">
        <p className="text-sm font-mono text-slate-400">Course information is unavailable.</p>
        <button 
          onClick={onBack} 
          className="mt-4 px-4 py-2 bg-[#39FF14] text-black font-bold text-xs rounded-xl cursor-pointer"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <CourseDetails
      course={course}
      userProfile={userProfile}
      onBack={onBack}
      onShowNotification={onShowNotification}
      purchasedCourseIds={isEnrolled ? [course.courseId] : []}
      wishlistedIds={isWishlisted ? [course.courseId] : []}
      onToggleWishlist={() => onToggleWishlist()}
      onStartLearning={(c) => onSelectCourse(c)}
      onTriggerPurchase={() => onEnroll()}
    />
  );
}

export default CourseDetailsView;
