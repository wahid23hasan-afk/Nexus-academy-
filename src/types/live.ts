export type LiveClassStatus = 'upcoming' | 'live' | 'completed';

export interface LiveClass {
  classId: string;
  courseId: string; // The parent course
  title: string;
  instructor: string;
  instructorPhoto?: string;
  subject: string;
  description: string;
  requirements?: string[];
  startTime: string; // ISO string
  endTime: string; // ISO string
  duration: number; // in minutes
  status: LiveClassStatus;
  thumbnail?: string;
  banner?: string;
  streamUrl?: string; // WebRTC/HLS mock/live stream URL
  recordingUrl?: string;
  notesUrl?: string; // Optional notes/PDF download
  createdAt: string;
}

export interface LiveAttendance {
  attendanceId: string;
  classId: string;
  userId: string;
  userName: string;
  joinTime: string;
  leaveTime?: string;
  duration: number; // in seconds
  percentage: number; // calculated as (duration / (classDuration * 60)) * 100
  status: 'present' | 'absent' | 'partial';
  updatedAt: string;
}

export interface LiveChatMessage {
  chatId: string;
  classId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  message: string;
  timestamp: string;
  isInstructor: boolean;
}

export interface LiveReminder {
  reminderId: string;
  classId: string;
  userId: string;
  enabled: boolean;
  createdAt: string;
}
