export interface StudyResource {
  resourceId: string;
  courseId: string;
  chapterId: string;
  chapterTitle: string;
  lessonId: string;
  lessonTitle: string;
  title: string;
  type: 'pdf' | 'ppt' | 'pptx' | 'doc' | 'docx' | 'xls' | 'xlsx' | 'zip' | 'image' | 'audio' | 'link';
  downloadUrl: string;
  fileSize: string;
  uploadDate: string;
  downloadCount: number;
  shortDescription: string;
  thumbnailUrl?: string;
}

export interface ResourceDownload {
  downloadId: string;
  resourceId: string;
  resourceTitle: string;
  resourceType: string;
  status: 'queue' | 'downloading' | 'completed' | 'failed';
  progress: number; // 0 to 100
  downloadSpeed: string; // e.g. "1.2 MB/s"
  remainingTime: string; // e.g. "15s" or "completed"
  localPath?: string; // or binary/base64 cache if stored offline
  error?: string;
  fileSize: string;
}

export interface OfflineResource {
  resourceId: string;
  courseId: string;
  title: string;
  type: string;
  fileSize: string;
  downloadedAt: string;
  localDataUrl: string; // Stored locally as blob url / data url
}

export interface ReadingProgress {
  userId: string;
  resourceId: string;
  lastReadPage: number;
  totalPages: number;
  progressPercent: number;
  bookmarks: number[]; // Page numbers bookmarked
  updatedAt: string;
}
