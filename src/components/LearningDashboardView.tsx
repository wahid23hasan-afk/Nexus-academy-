import React from 'react';
import { CoursePlayer } from './CoursePlayer';
import { Course } from '../types/course';

export interface LearningDashboardViewProps {
  course: Course;
  userProfile: { fullName: string; username: string; email?: string; photoURL?: string; role?: string; isAdmin?: boolean } | null;
  onBack: () => void;
  onShowNotification: (message: string, type: 'success' | 'error') => void;
  purchasedCourseIds: string[];
  onTriggerPurchase: (course: Course) => void;
  initialLessonId?: string;
  initialTime?: number;
}

export function LearningDashboardView({
  course,
  userProfile,
  onBack,
  onShowNotification,
  purchasedCourseIds = [],
  onTriggerPurchase,
  initialLessonId,
  initialTime
}: LearningDashboardViewProps) {
  if (!course) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#050811] text-slate-100 min-h-screen">
        <p className="text-sm font-mono text-slate-400">Selected course could not be loaded.</p>
        <button 
          onClick={onBack} 
          className="mt-4 px-4 py-2 bg-[#39FF14] text-black font-bold text-xs rounded-xl cursor-pointer"
        >
          Return to Course Discovery
        </button>
      </div>
    );
  }

  return (
    <CoursePlayer
      course={course}
      userProfile={userProfile}
      onBack={onBack}
      onShowNotification={onShowNotification}
      purchasedCourseIds={purchasedCourseIds}
      onTriggerPurchase={onTriggerPurchase}
      initialLessonId={initialLessonId}
      initialTime={initialTime}
    />
  );
}

export default LearningDashboardView;
