export type NotificationType =
  | 'New Course'
  | 'Course Update'
  | 'New Lesson'
  | 'Live Class Reminder'
  | 'Quiz Reminder'
  | 'Assignment Reminder'
  | 'Payment Success'
  | 'Certificate Available'
  | 'Promotional Offer'
  | 'General Announcement'
  | 'Maintenance Notice';

export type NotificationCategory =
  | 'unread'
  | 'read'
  | 'payment'
  | 'learning'
  | 'courses'
  | 'announcements'
  | 'promotions';

export interface Notification {
  notificationId: string;
  userId: string;
  userEmail?: string;
  title: string;
  message: string;
  category: NotificationCategory;
  type: NotificationType;
  unread: boolean;
  readBy?: string[];
  relatedPage?: string; // e.g. 'course-details' | 'quiz' | 'certificates' | 'courses'
  targetId?: string; // e.g. courseId, quizId, certificateId
  createdAt: string; // ISO 8601 string
}

export interface Announcement {
  announcementId: string;
  title: string;
  message: string;
  priority: 'normal' | 'high' | 'emergency';
  isActive: boolean;
  link?: string; // e.g. related page path/action
  createdAt: string;
}

export interface NotificationSetting {
  userId: string;
  marketingNotifications: boolean;
  courseUpdates: boolean;
  quizReminders: boolean;
  liveClassAlerts: boolean;
  certificateAlerts: boolean;
  generalAnnouncements: boolean;
  updatedAt: string;
}

export interface NotificationHistory {
  historyId: string;
  userId: string;
  notificationId: string;
  deliveryType: 'push' | 'in-app';
  status: 'delivered' | 'failed' | 'read';
  timestamp: string;
}
