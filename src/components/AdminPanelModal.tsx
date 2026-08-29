import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Star,
  X, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShieldCheck, 
  Tag, 
  CreditCard, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Search, 
  UserCheck, 
  AlertTriangle, 
  Phone, 
  Mail, 
  DollarSign, 
  Bell, 
  Send, 
  Megaphone, 
  Video, 
  Upload, 
  Play, 
  Film,
  Cloud,
  CloudLightning,
  HardDrive,
  Server,
  Link2,
  Copy,
  Check,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Key,
  Eye,
  EyeOff,
  Sparkles,
  ShoppingBag,
  Lock,
  Unlock,
  Edit3,
  Zap,
  Award,
  Crown,
  Tv,
  Headset,
  User,
  Settings as SettingsIcon,
  Wrench,
  ShieldAlert,
  Sliders,
  Power,
  RotateCcw
} from 'lucide-react';
import { Purchase, Coupon, PaymentMethodConfig, Course, CurriculumChapter, CurriculumLesson } from '../types/course';
import { LessonVideo } from '../services/learningService';
import { Notification, Announcement, NotificationCategory } from '../types/notification';
import { courseService } from '../services/courseService';
import { notificationService } from '../services/notificationService';
import { learningService } from '../services/learningService';
import { liveService } from '../services/liveService';
import { LiveClass, LiveClassStatus } from '../types/live';
import { db, storage, auth } from '../services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, getDocs, serverTimestamp, collection, onSnapshot, query, arrayUnion } from 'firebase/firestore';
import { CourseSection, CourseLesson } from '../types/course';
import { SmartVideoPlayer } from './SmartVideoPlayer';
import { StoreItem, DEFAULT_STORE_ITEMS } from './XpStoreModal';
import { StudyRoomManager } from './StudyRoomManager';
import { studyFeatureService } from '../services/studyFeatureService';
import { systemSettingsService, SystemSettings, DEFAULT_SYSTEM_SETTINGS } from '../services/systemSettingsService';
import { ReviewsPage } from '../pages/Reviews';
import { AdminGamificationManager } from './AdminGamificationManager';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowNotification: (message: string, type: 'success' | 'error') => void;
  initialTab?: 'approvals' | 'notifications' | 'coupons' | 'payments' | 'curriculum' | 'storage' | 'xp_store' | 'studyFeatures' | 'live_classes' | 'support' | 'settings' | 'reviews';
}

export function AdminPanelModal({ isOpen, onClose, onShowNotification, initialTab = 'approvals' }: AdminPanelModalProps) {
  const [activeTab, setActiveTab] = useState<'approvals' | 'notifications' | 'coupons' | 'payments' | 'curriculum' | 'storage' | 'xp_store' | 'studyFeatures' | 'live_classes' | 'support' | 'settings' | 'reviews'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Gamification & XP Store section toggle
  const [xpStoreSection, setXpStoreSection] = useState<'vault_settings' | 'catalog_items'>('vault_settings');

  // System Settings & Maintenance Mode state
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(DEFAULT_SYSTEM_SETTINGS);
  const [maintenanceEnabled, setMaintenanceEnabled] = useState<boolean>(false);
  const [maintenanceTitleInput, setMaintenanceTitleInput] = useState<string>(DEFAULT_SYSTEM_SETTINGS.maintenanceTitle || '');
  const [maintenanceMessageInput, setMaintenanceMessageInput] = useState<string>(DEFAULT_SYSTEM_SETTINGS.maintenanceMessage || '');
  const [maintenanceEstimatedTimeInput, setMaintenanceEstimatedTimeInput] = useState<string>(DEFAULT_SYSTEM_SETTINGS.estimatedEndTime || '');
  const [savingSettings, setSavingSettings] = useState<boolean>(false);

  // Subscribe to real-time System Settings
  useEffect(() => {
    const unsubscribe = systemSettingsService.subscribeSystemSettings((settings) => {
      setSystemSettings(settings);
      setMaintenanceEnabled(settings.maintenanceMode);
      if (settings.maintenanceTitle) setMaintenanceTitleInput(settings.maintenanceTitle);
      if (settings.maintenanceMessage) setMaintenanceMessageInput(settings.maintenanceMessage);
      if (settings.estimatedEndTime) setMaintenanceEstimatedTimeInput(settings.estimatedEndTime);
    });
    return () => unsubscribe();
  }, []);

  const handleSaveMaintenanceSettings = async (targetEnabled?: boolean) => {
    setSavingSettings(true);
    const newEnabled = targetEnabled !== undefined ? targetEnabled : maintenanceEnabled;
    try {
      // Instantly execute setDoc on collection "settings", document ID "general"
      await setDoc(doc(db, "settings", "general"), { 
        maintenanceMode: newEnabled,
        maintenanceTitle: maintenanceTitleInput.trim() || DEFAULT_SYSTEM_SETTINGS.maintenanceTitle,
        maintenanceMessage: maintenanceMessageInput.trim() || DEFAULT_SYSTEM_SETTINGS.maintenanceMessage,
        estimatedEndTime: maintenanceEstimatedTimeInput.trim() || DEFAULT_SYSTEM_SETTINGS.estimatedEndTime,
        updatedAt: serverTimestamp(),
        updatedBy: 'admin@nexus.edu'
      }, { merge: true });

      await systemSettingsService.setMaintenanceMode(newEnabled, {
        title: maintenanceTitleInput.trim() || DEFAULT_SYSTEM_SETTINGS.maintenanceTitle,
        message: maintenanceMessageInput.trim() || DEFAULT_SYSTEM_SETTINGS.maintenanceMessage,
        estimatedEndTime: maintenanceEstimatedTimeInput.trim() || DEFAULT_SYSTEM_SETTINGS.estimatedEndTime,
        adminEmail: 'admin@nexus.edu'
      });

      setMaintenanceEnabled(newEnabled);
      setSystemSettings(prev => ({ ...prev, maintenanceMode: newEnabled }));

      onShowNotification(
        newEnabled
          ? '⚠️ Maintenance Mode ACTIVATED! Student panel is now locked in real-time.'
          : '✅ Maintenance Mode DISABLED! Platform is fully restored for all students.',
        'success'
      );
    } catch (err: any) {
      console.error('Failed to update maintenance mode:', err);
      onShowNotification('Failed to update system settings.', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  // Support Center state
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [loadingSupportTickets, setLoadingSupportTickets] = useState<boolean>(true);
  const [selectedSupportTicketId, setSelectedSupportTicketId] = useState<string | null>(null);
  const [adminReplyText, setAdminReplyText] = useState<string>('');
  const [sendingAdminReply, setSendingAdminReply] = useState<boolean>(false);
  const [supportFilter, setSupportFilter] = useState<'all' | 'open' | 'closed'>('all');

  // Refund Requests state
  const [refundRequestsList, setRefundRequestsList] = useState<any[]>([]);
  const [loadingRefundRequests, setLoadingRefundRequests] = useState<boolean>(true);

  // XP Store & Perks Management state
  const [xpStoreItems, setXpStoreItems] = useState<StoreItem[]>([]);
  const [loadingStoreCatalog, setLoadingStoreCatalog] = useState<boolean>(false);
  const [showAddStoreItem, setShowAddStoreItem] = useState<boolean>(false);
  const [editingStoreItemId, setEditingStoreItemId] = useState<string | null>(null);

  // Live Class Management state
  const [liveClassesList, setLiveClassesList] = useState<LiveClass[]>([]);
  const [loadingLiveClasses, setLoadingLiveClasses] = useState<boolean>(false);
  const [showAddLiveClassForm, setShowAddLiveClassForm] = useState<boolean>(false);
  const [editingLiveClassId, setEditingLiveClassId] = useState<string | null>(null);

  const [liveClassTitle, setLiveClassTitle] = useState<string>('');
  const [liveClassSubject, setLiveClassSubject] = useState<string>('Backend Engineering');
  const [liveClassInstructor, setLiveClassInstructor] = useState<string>('Engr. Jamil Ahmed');
  const [liveClassInstructorPhoto, setLiveClassInstructorPhoto] = useState<string>('');
  const [liveClassCourseId, setLiveClassCourseId] = useState<string>('course-web-dev');
  const [liveClassDuration, setLiveClassDuration] = useState<number>(60);
  const [liveClassStatus, setLiveClassStatus] = useState<LiveClassStatus>('upcoming');
  const [liveClassStreamUrl, setLiveClassStreamUrl] = useState<string>('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4');
  const [liveClassRecordingUrl, setLiveClassRecordingUrl] = useState<string>('');
  const [liveClassNotesUrl, setLiveClassNotesUrl] = useState<string>('');
  const [liveClassDescription, setLiveClassDescription] = useState<string>('');
  const [liveClassRequirements, setLiveClassRequirements] = useState<string>('');
  const [liveClassStartTime, setLiveClassStartTime] = useState<string>(() => new Date(Date.now() + 30 * 60 * 1000).toISOString().slice(0, 16));
  const [savingLiveClass, setSavingLiveClass] = useState<boolean>(false);

  const [storeItemName, setStoreItemName] = useState<string>('');
  const [storeItemCategory, setStoreItemCategory] = useState<'frame' | 'title' | 'shield' | 'lesson_access' | 'certificate_badge' | 'vip_pass' | string>('lesson_access');
  const [storeItemDescription, setStoreItemDescription] = useState<string>('');
  const [storeItemPerkGranted, setStoreItemPerkGranted] = useState<string>('');
  const [storeItemCostXP, setStoreItemCostXP] = useState<number>(150);
  const [storeItemIcon, setStoreItemIcon] = useState<string>('🔓');
  const [storeItemAvailability, setStoreItemAvailability] = useState<'active' | 'inactive'>('active');
  const [storeItemTargetScope, setStoreItemTargetScope] = useState<'all' | 'free_tier' | 'pro_tier'>('all');

  // Cloudinary Cloud Storage Integration state
  const [cloudinaryStatus, setCloudinaryStatus] = useState<{
    configured: boolean;
    cloudName: string;
    apiKeyMasked: string;
    provider: string;
  }>({
    configured: false,
    cloudName: '',
    apiKeyMasked: '',
    provider: 'server_local'
  });
  const [cloudinaryUrlInput, setCloudinaryUrlInput] = useState<string>('');
  const [cloudNameInput, setCloudNameInput] = useState<string>('');
  const [cloudApiKeyInput, setCloudApiKeyInput] = useState<string>('');
  const [cloudApiSecretInput, setCloudApiSecretInput] = useState<string>('');
  const [showCloudSecret, setShowCloudSecret] = useState<boolean>(false);
  const [testingCloudinary, setTestingCloudinary] = useState<boolean>(false);
  const [savingCloudinary, setSavingCloudinary] = useState<boolean>(false);
  const [targetStorageProvider, setTargetStorageProvider] = useState<'cloudinary' | 'server_local'>('cloudinary');
  
  // Direct Cloudinary Asset Uploader state
  const [directUploading, setDirectUploading] = useState<boolean>(false);
  const [directUploadProgress, setDirectUploadProgress] = useState<number>(0);
  const [uploadedAssetResult, setUploadedAssetResult] = useState<{
    url: string;
    videoUrl?: string;
    thumbnailUrl?: string;
    publicId?: string;
    duration?: number;
    bytes?: number;
    size?: number;
    format?: string;
    provider?: string;
    mimeType?: string;
    message?: string;
  } | null>(null);
  const [copiedAssetUrl, setCopiedAssetUrl] = useState<boolean>(false);

  // Curriculum / Video Management tab state
  const [selectedCurriculumCourseId, setSelectedCurriculumCourseId] = useState<string>('');
  const [chapters, setChapters] = useState<CurriculumChapter[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');
  const [selectedLesson, setSelectedLesson] = useState<CurriculumLesson | null>(null);
  const [lessonVideo, setLessonVideo] = useState<LessonVideo | null>(null);
  const [loadingCurriculum, setLoadingCurriculum] = useState<boolean>(false);
  const [loadingVideo, setLoadingVideo] = useState<boolean>(false);

  // New Chapter & Lesson creation state
  const [newChapterTitle, setNewChapterTitle] = useState<string>('');
  const [newLessonTitle, setNewLessonTitle] = useState<string>('');
  const [newLessonDuration, setNewLessonDuration] = useState<string>('15:00');
  const [newLessonVideoUrl, setNewLessonVideoUrl] = useState<string>('');
  const [newLessonIsFreePreview, setNewLessonIsFreePreview] = useState<boolean>(false);
  const [showAddChapterModal, setShowAddChapterModal] = useState<boolean>(false);
  const [showAddLessonModal, setShowAddLessonModal] = useState<boolean>(false);
  const [addingChapter, setAddingChapter] = useState<boolean>(false);
  const [addingLesson, setAddingLesson] = useState<boolean>(false);
  
  // Edit Video Form state
  const [editVideoUrl, setEditVideoUrl] = useState<string>('');
  const [editVideoDuration, setEditVideoDuration] = useState<number>(180);
  const [editVideoThumbnail, setEditVideoThumbnail] = useState<string>('');
  const [uploadingFile, setUploadingFile] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [savingVideo, setSavingVideo] = useState<boolean>(false);

  // Support Center Real-time Firestore Listener
  useEffect(() => {
    if (!isOpen) return;
    setLoadingSupportTickets(true);
    const q = query(collection(db, 'support_tickets'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ticketList: any[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        ticketList.push({
          id: docSnap.id,
          userId: data.userId || 'unknown',
          userEmail: data.userEmail || '',
          subject: data.subject || 'Support Ticket',
          message: data.message || '',
          status: data.status || 'open',
          priority: data.priority || 'medium',
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt,
          replies: Array.isArray(data.replies) ? data.replies : []
        });
      });
      ticketList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setSupportTickets(ticketList);
      setLoadingSupportTickets(false);
    }, (err) => {
      console.error('Error listening to support_tickets in Admin Panel:', err);
      setLoadingSupportTickets(false);
    });

    // Listener for refund_requests
    setLoadingRefundRequests(true);
    const qRefunds = query(collection(db, 'refund_requests'));
    const unsubscribeRefunds = onSnapshot(qRefunds, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt || new Date().toISOString()
        });
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRefundRequestsList(list);
      setLoadingRefundRequests(false);
    }, (err) => {
      console.error('Error listening to refund_requests in Admin:', err);
      setLoadingRefundRequests(false);
    });

    return () => {
      unsubscribe();
      unsubscribeRefunds();
    };
  }, [isOpen]);

  const handleUpdateRefundStatus = async (requestId: string, newStatus: 'approved' | 'rejected', defaultNote?: string) => {
    try {
      const note = prompt('Enter optional Admin note for student (এডমিন বার্তা লিখুন):', defaultNote || (newStatus === 'approved' ? 'Refund approved and payment credited to payout number.' : 'Refund request declined after review.'));
      
      const refDoc = doc(db, 'refund_requests', requestId);
      await updateDoc(refDoc, {
        status: newStatus,
        adminNote: note !== null ? note : (defaultNote || ''),
        resolvedAt: new Date().toISOString()
      });

      onShowNotification(`Refund request updated to ${newStatus.toUpperCase()}`, 'success');
    } catch (err: any) {
      console.error('Error updating refund request:', err);
      onShowNotification('Failed to update refund request status.', 'error');
    }
  };

  const handleSendAdminReply = async (ticketId: string) => {
    if (!adminReplyText.trim()) return;
    setSendingAdminReply(true);
    try {
      const replyObj = {
        message: adminReplyText.trim(),
        adminId: 'admin_support',
        createdAt: new Date().toISOString()
      };
      const ticketRef = doc(db, 'support_tickets', ticketId);
      await updateDoc(ticketRef, {
        replies: arrayUnion(replyObj),
        status: 'open',
        updatedAt: serverTimestamp()
      });
      setAdminReplyText('');
      setSendingAdminReply(false);
      onShowNotification('Admin reply sent to student!', 'success');
    } catch (err) {
      console.error('Failed to send admin reply:', err);
      setSendingAdminReply(false);
      onShowNotification('Failed to send admin reply', 'error');
    }
  };

  const handleToggleAdminTicketStatus = async (ticketId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'open' ? 'closed' : 'open';
      const ticketRef = doc(db, 'support_tickets', ticketId);
      await updateDoc(ticketRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      onShowNotification(`Ticket status updated to ${newStatus}`, 'success');
    } catch (err) {
      console.error('Failed to toggle ticket status:', err);
      onShowNotification('Failed to update ticket status', 'error');
    }
  };

  // Curriculum helper functions
  const loadCurriculum = async (courseId: string) => {
    if (!courseId) return;
    setLoadingCurriculum(true);
    setSelectedChapterId('');
    setSelectedLesson(null);
    setLessonVideo(null);
    try {
      const cur = await courseService.getCurriculum(courseId);
      setChapters(cur || []);
      if (cur && cur.length > 0) {
        setSelectedChapterId(cur[0].chapterId);
      }
    } catch (err) {
      console.error('Error loading curriculum chapters:', err);
      onShowNotification('Failed to load curriculum chapters.', 'error');
    } finally {
      setLoadingCurriculum(false);
    }
  };

  const loadLessonVideo = async (courseId: string, lessonId: string, seqOrder: number, initialVideoUrl?: string) => {
    setLoadingVideo(true);
    setLessonVideo(null);
    try {
      const vid = await learningService.getLessonVideo(courseId, lessonId, seqOrder, initialVideoUrl);
      setLessonVideo(vid);
      let chosenUrl = (initialVideoUrl && initialVideoUrl.trim()) ? initialVideoUrl.trim() : (vid.videoUrl || '');
      if (
        chosenUrl.startsWith('firestore:') ||
        chosenUrl.startsWith('vid_') ||
        (chosenUrl.startsWith('v_') && !chosenUrl.includes('.') && !chosenUrl.includes('/'))
      ) {
        chosenUrl = (vid.videoUrl && !vid.videoUrl.startsWith('firestore:') && !vid.videoUrl.startsWith('vid_'))
          ? vid.videoUrl
          : '';
      }
      setEditVideoUrl(chosenUrl);
      setEditVideoDuration(vid.duration);
      setEditVideoThumbnail(vid.thumbnailUrl || '');
    } catch (err) {
      console.error('Error loading lesson video details:', err);
      if (initialVideoUrl && !initialVideoUrl.startsWith('firestore:') && !initialVideoUrl.startsWith('vid_')) {
        setEditVideoUrl(initialVideoUrl);
      }
    } finally {
      setLoadingVideo(false);
    }
  };

  const handleSaveVideoDetails = async () => {
    if (!selectedCurriculumCourseId || !selectedLesson) {
      onShowNotification('No lesson selected.', 'error');
      return;
    }
    setSavingVideo(true);
    const targetVideoUrl = editVideoUrl.trim();
    try {
      const videoIdToUse = lessonVideo?.videoId || `vid_${selectedLesson.lessonId}`;
      const videoDoc: LessonVideo = {
        videoId: videoIdToUse,
        lessonId: selectedLesson.lessonId,
        courseId: selectedCurriculumCourseId,
        videoUrl: targetVideoUrl,
        thumbnailUrl: editVideoThumbnail.trim() || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80',
        duration: Number(editVideoDuration) || 180
      };

      // 1. Write to lessonVideos collections with all potential lookup keys
      await setDoc(doc(db, 'lessonVideos', videoIdToUse), videoDoc, { merge: true });
      await setDoc(doc(db, 'lessonVideos', `vid_${selectedLesson.lessonId}`), videoDoc, { merge: true });
      await setDoc(doc(db, 'lessonVideos', selectedLesson.lessonId), videoDoc, { merge: true });
      setLessonVideo(videoDoc);

      // 2. Synchronize directly into courses collection under sections
      const courseDocRef = doc(db, 'courses', selectedCurriculumCourseId);
      const courseSnap = await getDoc(courseDocRef);
      let secList: CourseSection[] = [];

      if (courseSnap.exists()) {
        const cData = courseSnap.data() as Course;
        secList = cData.sections || [];
      }

      if (secList.length === 0 && chapters.length > 0) {
        secList = chapters.map(ch => ({
          sectionId: ch.chapterId,
          title: ch.title,
          sequenceOrder: ch.sequenceOrder,
          lessons: ch.lessons.map(l => ({
            lessonId: l.lessonId,
            sectionId: ch.chapterId,
            title: l.title,
            duration: l.duration,
            sequenceOrder: l.sequenceOrder,
            isPreviewAllowed: l.isPreviewAllowed,
            videoUrl: l.lessonId === selectedLesson.lessonId ? targetVideoUrl : ((l as any).videoUrl || undefined),
            thumbnailUrl: l.lessonId === selectedLesson.lessonId ? editVideoThumbnail.trim() : ((l as any).thumbnailUrl || undefined)
          }))
        }));
      } else {
        secList = secList.map(sec => ({
          ...sec,
          lessons: (sec.lessons || []).map(les => {
            if (les.lessonId === selectedLesson.lessonId) {
              const durMinutes = Math.floor((Number(editVideoDuration) || 180) / 60);
              const durSecs = (Number(editVideoDuration) || 180) % 60;
              return {
                ...les,
                videoUrl: targetVideoUrl,
                duration: `${durMinutes}:${durSecs < 10 ? '0' : ''}${durSecs}`,
                thumbnailUrl: editVideoThumbnail.trim()
              };
            }
            return les;
          })
        }));
      }

      if (courseSnap.exists()) {
        await updateDoc(courseDocRef, {
          sections: secList,
          updatedAt: serverTimestamp()
        });
      } else {
        await setDoc(courseDocRef, {
          courseId: selectedCurriculumCourseId,
          sections: secList,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }

      // 3. Sync into local chapters state and courseCurriculum collection
      const updatedChapters = chapters.map(ch => ({
        ...ch,
        lessons: (ch.lessons || []).map(l => {
          if (l.lessonId === selectedLesson.lessonId) {
            return {
              ...l,
              videoUrl: targetVideoUrl,
              thumbnailUrl: editVideoThumbnail.trim()
            };
          }
          return l;
        })
      }));
      setChapters(updatedChapters);

      if (selectedChapterId) {
        const activeChapter = updatedChapters.find(ch => ch.chapterId === selectedChapterId);
        if (activeChapter) {
          await setDoc(doc(db, 'courseCurriculum', selectedChapterId), activeChapter, { merge: true });
        }
      }

      // 4. Dispatch global custom event for instant user playback sync
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nexus_video_updated', {
          detail: {
            lessonId: selectedLesson.lessonId,
            videoUrl: targetVideoUrl
          }
        }));
      }

      onShowNotification('🎥 Video curriculum updated & live synchronized!', 'success');
    } catch (err) {
      console.error('Error saving video info to Firestore:', err);
      onShowNotification('Failed to save video details.', 'error');
    } finally {
      setSavingVideo(false);
    }
  };

  const loadCloudinaryStatus = async () => {
    try {
      const res = await fetch('/api/cloudinary/config');
      if (res.ok) {
        const data = await res.json();
        setCloudinaryStatus(data);
        if (data.cloudName) setCloudNameInput(data.cloudName);
      }
    } catch (e) {
      console.warn('Could not load Cloudinary status:', e);
    }
  };

  const handleCloudinaryUrlChange = (val: string) => {
    setCloudinaryUrlInput(val);
    let clean = val.trim();
    if (clean.startsWith('CLOUDINARY_URL=')) {
      clean = clean.replace(/^CLOUDINARY_URL=/, '').trim();
    }
    const match = clean.match(/cloudinary:\/\/([^:]+):([^@]+)@(.+)/);
    if (match) {
      const extractedKey = match[1].trim();
      const extractedSecret = match[2].trim();
      const extractedCloud = match[3].trim();
      setCloudApiKeyInput(extractedKey);
      setCloudApiSecretInput(extractedSecret);
      setCloudNameInput(extractedCloud);
      onShowNotification('✨ Auto-extracted Cloud Name, API Key & Secret from CLOUDINARY_URL!', 'success');
    }
  };

  const handleSaveCloudinaryConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCloudName = cloudNameInput.trim();
    const finalApiKey = cloudApiKeyInput.trim();
    const finalApiSecret = cloudApiSecretInput.trim();
    const finalUrl = cloudinaryUrlInput.trim();

    if (!finalUrl && (!finalCloudName || !finalApiKey || !finalApiSecret)) {
      onShowNotification('Please enter Cloud Name, API Key, and API Secret, or paste your CLOUDINARY_URL.', 'error');
      return;
    }

    setSavingCloudinary(true);
    try {
      const res = await fetch('/api/cloudinary/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cloudName: finalCloudName,
          apiKey: finalApiKey,
          apiSecret: finalApiSecret,
          cloudinaryUrl: finalUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save Cloudinary settings');

      onShowNotification(data.message || '🎉 Cloudinary Cloud Storage connected & active!', 'success');
      await loadCloudinaryStatus();
      setCloudApiSecretInput('');
      setCloudinaryUrlInput('');
    } catch (err: any) {
      onShowNotification(err.message || 'Failed to save Cloudinary credentials', 'error');
    } finally {
      setSavingCloudinary(false);
    }
  };

  const handleTestCloudinary = async () => {
    setTestingCloudinary(true);
    try {
      const res = await fetch('/api/cloudinary/test', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Connection failed');
      onShowNotification('⚡ Cloudinary connection verified & healthy!', 'success');
      await loadCloudinaryStatus();
    } catch (err: any) {
      onShowNotification(`Cloudinary test error: ${err.message || 'Connection failed'}`, 'error');
    } finally {
      setTestingCloudinary(false);
    }
  };

  const handleDirectAssetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDirectUploading(true);
    setDirectUploadProgress(20);
    setUploadedAssetResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      setDirectUploadProgress(50);

      const res = await fetch('/api/cloudinary/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      setDirectUploadProgress(100);
      setUploadedAssetResult(data);
      onShowNotification(
        data.provider === 'cloudinary'
          ? '🎉 File uploaded directly to Cloudinary Global CDN!'
          : 'File uploaded to Local Server Storage (Connect Cloudinary for Cloud CDN).',
        'success'
      );
    } catch (err: any) {
      onShowNotification(err.message || 'Direct upload failed.', 'error');
    } finally {
      setDirectUploading(false);
    }
  };

  const handleCopyAssetUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedAssetUrl(true);
    onShowNotification('CDN Link copied to clipboard!', 'success');
    setTimeout(() => setCopiedAssetUrl(false), 2500);
  };

  const handleUploadVideoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!selectedCurriculumCourseId || !selectedLesson) {
      onShowNotification('Please select a course and lesson first.', 'error');
      return;
    }

    setUploadingFile(true);
    setUploadProgress(15);
    try {
      // 1. Upload directly to high-speed dedicated server storage or Cloudinary
      const formData = new FormData();
      formData.append('video', file);
      formData.append('targetStorage', targetStorageProvider);

      setUploadProgress(40);
      const res = await fetch('/api/upload-video', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with status ${res.status}`);
      }

      setUploadProgress(85);
      const data = await res.json();
      const serverVideoUrl = data.videoUrl; // Cloudinary CDN URL or local URL
      const autoThumbnail = data.thumbnailUrl || editVideoThumbnail.trim() || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80';

      setUploadProgress(100);
      setEditVideoUrl(serverVideoUrl);
      if (data.thumbnailUrl) {
        setEditVideoThumbnail(data.thumbnailUrl);
      }

      let computedDuration = Number(editVideoDuration) || 180;
      if (data.duration && !isNaN(data.duration)) {
        computedDuration = data.duration;
        setEditVideoDuration(computedDuration);
      } else {
        // Attempt to get video duration from file
        try {
          const videoEl = document.createElement('video');
          videoEl.src = URL.createObjectURL(file);
          videoEl.onloadedmetadata = () => {
            if (videoEl.duration && !isNaN(videoEl.duration)) {
              computedDuration = Math.round(videoEl.duration);
              setEditVideoDuration(computedDuration);
            }
          };
        } catch (e) {
          console.warn('Could not compute video file metadata:', e);
        }
      }

      // 2. Auto-save uploaded video to Firestore so admin changes sync instantly
      const videoIdToUse = lessonVideo?.videoId || `vid_${selectedLesson.lessonId}`;
      const videoDoc: LessonVideo = {
        videoId: videoIdToUse,
        lessonId: selectedLesson.lessonId,
        courseId: selectedCurriculumCourseId,
        videoUrl: serverVideoUrl,
        thumbnailUrl: autoThumbnail,
        duration: computedDuration
      };
      await setDoc(doc(db, 'lessonVideos', videoIdToUse), videoDoc, { merge: true });
      await setDoc(doc(db, 'lessonVideos', `vid_${selectedLesson.lessonId}`), videoDoc, { merge: true });
      await setDoc(doc(db, 'lessonVideos', selectedLesson.lessonId), videoDoc, { merge: true });
      setLessonVideo(videoDoc);

      // 3. Sync into courses collection sections
      const courseDocRef = doc(db, 'courses', selectedCurriculumCourseId);
      const courseSnap = await getDoc(courseDocRef);
      let secList: CourseSection[] = [];

      if (courseSnap.exists()) {
        const cData = courseSnap.data() as Course;
        secList = cData.sections || [];
      }

      if (secList.length === 0 && chapters.length > 0) {
        secList = chapters.map(ch => ({
          sectionId: ch.chapterId,
          title: ch.title,
          sequenceOrder: ch.sequenceOrder,
          lessons: ch.lessons.map(l => ({
            lessonId: l.lessonId,
            sectionId: ch.chapterId,
            title: l.title,
            duration: l.duration,
            sequenceOrder: l.sequenceOrder,
            isPreviewAllowed: l.isPreviewAllowed,
            videoUrl: l.lessonId === selectedLesson.lessonId ? serverVideoUrl : ((l as any).videoUrl || undefined),
            thumbnailUrl: l.lessonId === selectedLesson.lessonId ? editVideoThumbnail.trim() : ((l as any).thumbnailUrl || undefined)
          }))
        }));
      } else {
        secList = secList.map(sec => ({
          ...sec,
          lessons: (sec.lessons || []).map(les => {
            if (les.lessonId === selectedLesson.lessonId) {
              const durMinutes = Math.floor(computedDuration / 60);
              const durSecs = computedDuration % 60;
              return {
                ...les,
                videoUrl: serverVideoUrl,
                duration: `${durMinutes}:${durSecs < 10 ? '0' : ''}${durSecs}`,
                thumbnailUrl: editVideoThumbnail.trim()
              };
            }
            return les;
          })
        }));
      }

      if (courseSnap.exists()) {
        await updateDoc(courseDocRef, {
          sections: secList,
          updatedAt: serverTimestamp()
        });
      } else {
        await setDoc(courseDocRef, {
          courseId: selectedCurriculumCourseId,
          sections: secList,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }

      // 4. Sync into local chapters state and courseCurriculum collection
      const updatedChapters = chapters.map(ch => ({
        ...ch,
        lessons: (ch.lessons || []).map(l => {
          if (l.lessonId === selectedLesson.lessonId) {
            return {
              ...l,
              videoUrl: serverVideoUrl,
              thumbnailUrl: editVideoThumbnail.trim()
            };
          }
          return l;
        })
      }));
      setChapters(updatedChapters);

      if (selectedChapterId) {
        const activeChapter = updatedChapters.find(ch => ch.chapterId === selectedChapterId);
        if (activeChapter) {
          await setDoc(doc(db, 'courseCurriculum', selectedChapterId), activeChapter, { merge: true });
        }
      }

      // 5. Global custom event dispatch
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nexus_video_updated', {
          detail: {
            lessonId: selectedLesson.lessonId,
            videoUrl: serverVideoUrl
          }
        }));
      }

      onShowNotification('🎉 Video uploaded to High-Speed Server Storage & live synchronized!', 'success');
    } catch (err: any) {
      console.error('Error uploading video file to server storage:', err);
      onShowNotification(`Upload failed: ${err.message || 'Server error'}. You can also paste a YouTube or Drive URL in Option B below.`, 'error');
    } finally {
      setUploadingFile(false);
      setUploadProgress(0);
    }
  };

  // Add a new Chapter to the selected course
  const handleAddNewChapter = async () => {
    if (!selectedCurriculumCourseId) {
      onShowNotification('Please select a course first.', 'error');
      return;
    }
    if (!newChapterTitle.trim()) {
      onShowNotification('Please enter a chapter title.', 'error');
      return;
    }

    setAddingChapter(true);
    try {
      const chapterId = `chap_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const nextSeq = chapters.length + 1;
      const newChapter: CurriculumChapter = {
        chapterId,
        courseId: selectedCurriculumCourseId,
        title: newChapterTitle.trim(),
        sequenceOrder: nextSeq,
        lessons: []
      };

      // 1. Save chapter to courseCurriculum collection
      await setDoc(doc(db, 'courseCurriculum', chapterId), newChapter);

      // 2. Sync to courses collection sections field
      const updatedChapters = [...chapters, newChapter];
      setChapters(updatedChapters);
      setSelectedChapterId(chapterId);

      const courseDocRef = doc(db, 'courses', selectedCurriculumCourseId);
      const courseSnap = await getDoc(courseDocRef);

      const newSectionsList: CourseSection[] = updatedChapters.map((ch, sIdx) => ({
        sectionId: ch.chapterId,
        title: ch.title,
        sequenceOrder: ch.sequenceOrder || sIdx + 1,
        lessons: (ch.lessons || []).map((l, lIdx) => ({
          lessonId: l.lessonId,
          sectionId: ch.chapterId,
          chapterId: ch.chapterId,
          title: l.title,
          duration: l.duration || '15:00',
          sequenceOrder: l.sequenceOrder || lIdx + 1,
          isPreviewAllowed: l.isPreviewAllowed
        }))
      }));

      if (courseSnap.exists()) {
        await updateDoc(courseDocRef, {
          sections: newSectionsList,
          updatedAt: serverTimestamp()
        });
      } else {
        await setDoc(courseDocRef, {
          courseId: selectedCurriculumCourseId,
          sections: newSectionsList,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }

      setNewChapterTitle('');
      setShowAddChapterModal(false);
      onShowNotification(`✨ Chapter "${newChapter.title}" created and synchronized!`, 'success');

      // 3. Auto-notify students of new chapter
      try {
        const targetCourse = courses.find(c => c.courseId === selectedCurriculumCourseId);
        const courseTitle = targetCourse?.title || 'your course';
        await notificationService.adminSendNotification({
          targetType: 'all',
          title: `📚 New Chapter Added: ${newChapter.title}`,
          message: `A new chapter "${newChapter.title}" has been added to "${courseTitle}". Check out the updated curriculum!`,
          category: 'courses',
          type: 'Course Update',
          relatedPage: 'course-details',
          targetId: selectedCurriculumCourseId
        });
      } catch (notifErr) {
        console.warn('Auto notification for new chapter notice:', notifErr);
      }
    } catch (err) {
      console.error('Error adding chapter:', err);
      onShowNotification('Failed to add chapter.', 'error');
    } finally {
      setAddingChapter(false);
    }
  };

  // Add a new Lesson to the selected chapter
  const handleAddNewLesson = async () => {
    if (!selectedCurriculumCourseId) {
      onShowNotification('Please select a course first.', 'error');
      return;
    }
    if (!selectedChapterId) {
      onShowNotification('Please select a chapter first.', 'error');
      return;
    }
    if (!newLessonTitle.trim()) {
      onShowNotification('Please enter a lesson title.', 'error');
      return;
    }

    setAddingLesson(true);
    try {
      const activeChapter = chapters.find(ch => ch.chapterId === selectedChapterId);
      if (!activeChapter) return;

      const lessonId = `les_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const nextSeq = (activeChapter.lessons?.length || 0) + 1;
      
      const newLesson: CurriculumLesson = {
        lessonId,
        chapterId: selectedChapterId,
        title: newLessonTitle.trim(),
        duration: newLessonDuration.trim() || '15:00',
        sequenceOrder: nextSeq,
        isPreviewAllowed: newLessonIsFreePreview,
        videoUrl: newLessonVideoUrl.trim() || undefined
      };

      // 1. Save video record if video URL provided
      if (newLessonVideoUrl.trim()) {
        const videoDoc: LessonVideo = {
          videoId: `vid_${lessonId}`,
          lessonId,
          courseId: selectedCurriculumCourseId,
          videoUrl: newLessonVideoUrl.trim(),
          thumbnailUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80',
          duration: 900
        };
        await setDoc(doc(db, 'lessonVideos', videoDoc.videoId), videoDoc);
      }

      // 2. Update activeChapter in courseCurriculum
      const updatedLessons = [...(activeChapter.lessons || []), newLesson];
      const updatedChapter: CurriculumChapter = {
        ...activeChapter,
        lessons: updatedLessons
      };

      await setDoc(doc(db, 'courseCurriculum', selectedChapterId), updatedChapter, { merge: true });

      // 3. Update chapters in local state
      const updatedChapters = chapters.map(ch => ch.chapterId === selectedChapterId ? updatedChapter : ch);
      setChapters(updatedChapters);

      // 4. SYNC IMMEDIATELY into Firestore 'courses' document 'sections' field
      const courseDocRef = doc(db, 'courses', selectedCurriculumCourseId);
      const courseSnap = await getDoc(courseDocRef);

      const newSectionsList: CourseSection[] = updatedChapters.map((ch, sIdx) => ({
        sectionId: ch.chapterId,
        title: ch.title,
        sequenceOrder: ch.sequenceOrder || sIdx + 1,
        lessons: (ch.lessons || []).map((l, lIdx) => ({
          lessonId: l.lessonId,
          sectionId: ch.chapterId,
          chapterId: ch.chapterId,
          title: l.title,
          duration: l.duration || '15:00',
          sequenceOrder: l.sequenceOrder || lIdx + 1,
          isPreviewAllowed: l.isPreviewAllowed,
          videoUrl: (l.lessonId === lessonId && newLessonVideoUrl.trim()) ? newLessonVideoUrl.trim() : (l as any).videoUrl
        }))
      }));

      if (courseSnap.exists()) {
        await updateDoc(courseDocRef, {
          sections: newSectionsList,
          updatedAt: serverTimestamp()
        });
      } else {
        await setDoc(courseDocRef, {
          courseId: selectedCurriculumCourseId,
          sections: newSectionsList,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }

      setNewLessonTitle('');
      setNewLessonVideoUrl('');
      setSelectedLesson(newLesson);
      setShowAddLessonModal(false);
      onShowNotification(`🎉 Lesson "${newLesson.title}" added & live synchronized to users!`, 'success');

      // 5. Auto-notify students of new lesson
      try {
        const targetCourse = courses.find(c => c.courseId === selectedCurriculumCourseId);
        const courseTitle = targetCourse?.title || 'your course';
        await notificationService.adminSendNotification({
          targetType: 'all',
          title: `🎬 New Lesson: ${newLesson.title}`,
          message: `A new lesson "${newLesson.title}" (${newLesson.duration}) has been published in "${courseTitle}". Start learning now!`,
          category: 'courses',
          type: 'New Lesson',
          relatedPage: 'course-details',
          targetId: selectedCurriculumCourseId
        });
      } catch (notifErr) {
        console.warn('Auto notification for new lesson notice:', notifErr);
      }
    } catch (err) {
      console.error('Error adding new lesson:', err);
      onShowNotification('Failed to add new lesson.', 'error');
    } finally {
      setAddingLesson(false);
    }
  };

  // Delete a lesson
  const handleDeleteLesson = async (lessonId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedCurriculumCourseId || !selectedChapterId) return;
    try {
      const activeChapter = chapters.find(ch => ch.chapterId === selectedChapterId);
      if (!activeChapter) return;

      const filteredLessons = (activeChapter.lessons || []).filter(l => l.lessonId !== lessonId);
      const updatedChapter: CurriculumChapter = {
        ...activeChapter,
        lessons: filteredLessons
      };

      await setDoc(doc(db, 'courseCurriculum', selectedChapterId), updatedChapter, { merge: true });

      const updatedChapters = chapters.map(ch => ch.chapterId === selectedChapterId ? updatedChapter : ch);
      setChapters(updatedChapters);
      if (selectedLesson?.lessonId === lessonId) {
        setSelectedLesson(null);
      }

      // Sync to Firestore 'courses' document sections field
      const courseDocRef = doc(db, 'courses', selectedCurriculumCourseId);
      const newSectionsList: CourseSection[] = updatedChapters.map((ch, sIdx) => ({
        sectionId: ch.chapterId,
        title: ch.title,
        sequenceOrder: ch.sequenceOrder || sIdx + 1,
        lessons: (ch.lessons || []).map((l, lIdx) => ({
          lessonId: l.lessonId,
          sectionId: ch.chapterId,
          chapterId: ch.chapterId,
          title: l.title,
          duration: l.duration || '15:00',
          sequenceOrder: l.sequenceOrder || lIdx + 1,
          isPreviewAllowed: l.isPreviewAllowed
        }))
      }));

      await updateDoc(courseDocRef, {
        sections: newSectionsList,
        updatedAt: serverTimestamp()
      });

      onShowNotification('Lesson removed and synchronized.', 'success');
    } catch (err) {
      console.error('Error deleting lesson:', err);
      onShowNotification('Failed to delete lesson.', 'error');
    }
  };

  // Watch selected course selection changes
  useEffect(() => {
    if (selectedCurriculumCourseId) {
      loadCurriculum(selectedCurriculumCourseId);
    }
  }, [selectedCurriculumCourseId]);

  // Data states
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [sentNotifs, setSentNotifs] = useState<Notification[]>([]);
  const [sentAnnouncements, setSentAnnouncements] = useState<Announcement[]>([]);

  // Instant Access form state
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [instantEmails, setInstantEmails] = useState<string>('');
  const [showInstantForm, setShowInstantForm] = useState<boolean>(false);
  const [grantingAccess, setGrantingAccess] = useState<boolean>(false);

  // Broadcast / Send Notification form state
  const [notifTargetType, setNotifTargetType] = useState<'all' | 'user'>('all');
  const [notifTargetIdentifier, setNotifTargetIdentifier] = useState<string>('');
  const [notifTitle, setNotifTitle] = useState<string>('');
  const [notifMessage, setNotifMessage] = useState<string>('');
  const [notifCategory, setNotifCategory] = useState<NotificationCategory>('announcements');
  const [alsoPostAnnouncement, setAlsoPostAnnouncement] = useState<boolean>(true);
  const [sendingNotif, setSendingNotif] = useState<boolean>(false);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // New Coupon Form state
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newDiscountType, setNewDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [newDiscountValue, setNewDiscountValue] = useState('');
  const [newExpiryDate, setNewExpiryDate] = useState('2030-12-31');
  const [newCouponDesc, setNewCouponDesc] = useState('');

  // New Payment Method Form state
  const [newPmName, setNewPmName] = useState('');
  const [newPmType, setNewPmType] = useState<'MFS' | 'Card' | 'Bank'>('MFS');
  const [newPmNumber, setNewPmNumber] = useState('');
  const [newPmAccType, setNewPmAccType] = useState('Personal');
  const [newPmInstructions, setNewPmInstructions] = useState('');
  const [showAddPm, setShowAddPm] = useState(false);
  const [showAddCoupon, setShowAddCoupon] = useState(false);

  const loadXpStoreCatalog = async () => {
    setLoadingStoreCatalog(true);
    try {
      // 1. Try reading from xp_store_items collection
      const snapCollection = await getDocs(collection(db, 'xp_store_items'));
      if (!snapCollection.empty) {
        const items = snapCollection.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            name: data.title || data.name || 'Perk Item',
            category: data.category || data.perkType || 'perk',
            description: data.description || '',
            perkGranted: data.perkGranted || data.perkDetails || '',
            costXP: Number(data.costXP || data.priceXp || 100),
            icon: data.icon || '✨',
            availability: (data.isActive !== false && data.status !== 'inactive' && data.availability !== 'inactive') ? 'active' : 'inactive',
            targetScope: data.targetScope || 'all',
            previewClass: data.previewClass || ''
          } as StoreItem;
        });
        setXpStoreItems(items);
        return;
      }

      // 2. Fallback to appSettings/xpStoreCatalog document
      const docRef = doc(db, 'appSettings', 'xpStoreCatalog');
      const snap = await getDoc(docRef);
      if (snap.exists() && snap.data()?.items && Array.isArray(snap.data().items)) {
        setXpStoreItems(snap.data().items as StoreItem[]);
      } else {
        setXpStoreItems(DEFAULT_STORE_ITEMS);
        await setDoc(docRef, { items: DEFAULT_STORE_ITEMS, updatedAt: serverTimestamp() });
        // Seed collection as well
        for (const itm of DEFAULT_STORE_ITEMS) {
          await setDoc(doc(db, 'xp_store_items', itm.id), {
            id: itm.id,
            title: itm.name,
            name: itm.name,
            category: itm.category,
            perkType: itm.category,
            description: itm.description,
            perkGranted: itm.perkGranted || itm.name,
            perkDetails: itm.perkGranted || itm.name,
            costXP: itm.costXP,
            priceXp: itm.costXP,
            icon: itm.icon,
            availability: itm.availability || 'active',
            status: itm.availability || 'active',
            isActive: itm.availability !== 'inactive',
            targetScope: itm.targetScope || 'all',
            previewClass: itm.previewClass || '',
            order: itm.costXP,
            updatedAt: serverTimestamp()
          }, { merge: true });
        }
      }
    } catch (err) {
      console.error('Error loading XP store catalog:', err);
      setXpStoreItems(DEFAULT_STORE_ITEMS);
    } finally {
      setLoadingStoreCatalog(false);
    }
  };

  const handleSaveStoreItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeItemName.trim() || !storeItemCostXP) {
      onShowNotification('Please enter Item Name and XP Cost.', 'error');
      return;
    }

    try {
      const idToUse = editingStoreItemId || `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newItem: StoreItem = {
        id: idToUse,
        name: storeItemName.trim(),
        category: storeItemCategory,
        description: storeItemDescription.trim() || 'Purchasable XP Perk Item',
        perkGranted: storeItemPerkGranted.trim() || storeItemName.trim(),
        costXP: Number(storeItemCostXP),
        icon: storeItemIcon.trim() || '✨',
        availability: storeItemAvailability,
        targetScope: storeItemTargetScope
      };

      let updatedItems: StoreItem[] = [];
      if (editingStoreItemId) {
        updatedItems = xpStoreItems.map(item => item.id === editingStoreItemId ? newItem : item);
      } else {
        updatedItems = [newItem, ...xpStoreItems];
      }

      // Write to both xp_store_items collection AND appSettings/xpStoreCatalog document
      await setDoc(doc(db, 'xp_store_items', idToUse), {
        id: idToUse,
        title: newItem.name,
        name: newItem.name,
        category: newItem.category,
        perkType: newItem.category,
        description: newItem.description,
        perkGranted: newItem.perkGranted,
        perkDetails: newItem.perkGranted,
        costXP: newItem.costXP,
        priceXp: newItem.costXP,
        icon: newItem.icon,
        availability: newItem.availability,
        status: newItem.availability,
        isActive: newItem.availability === 'active',
        targetScope: newItem.targetScope,
        order: newItem.costXP,
        updatedAt: serverTimestamp()
      }, { merge: true });

      await setDoc(doc(db, 'appSettings', 'xpStoreCatalog'), {
        items: updatedItems,
        updatedAt: serverTimestamp()
      });

      setXpStoreItems(updatedItems);
      setShowAddStoreItem(false);
      setEditingStoreItemId(null);
      setStoreItemName('');
      setStoreItemDescription('');
      setStoreItemPerkGranted('');
      setStoreItemCostXP(150);
      setStoreItemIcon('🔓');
      onShowNotification(`🎉 Store Item "${newItem.name}" saved & live published to XP Store!`, 'success');
    } catch (err: any) {
      console.error('Error saving store item:', err);
      onShowNotification(`Failed to save store item: ${err.message}`, 'error');
    }
  };

  const handleDeleteStoreItem = async (itemId: string) => {
    try {
      const updated = xpStoreItems.filter(i => i.id !== itemId);
      
      // Delete from xp_store_items collection
      try {
        await deleteDoc(doc(db, 'xp_store_items', itemId));
      } catch (e) {
        console.warn('xp_store_items doc delete warning:', e);
      }

      // Update appSettings/xpStoreCatalog
      await setDoc(doc(db, 'appSettings', 'xpStoreCatalog'), {
        items: updated,
        updatedAt: serverTimestamp()
      });
      setXpStoreItems(updated);
      onShowNotification('Store item deleted from XP Marketplace.', 'success');
    } catch (err: any) {
      onShowNotification(`Delete failed: ${err.message}`, 'error');
    }
  };

  const handleToggleStoreItemStatus = async (itemId: string) => {
    try {
      let newStatus: 'active' | 'inactive' = 'active';
      const updated = xpStoreItems.map(i => {
        if (i.id === itemId) {
          newStatus = i.availability === 'inactive' ? 'active' : 'inactive';
          return { ...i, availability: newStatus as 'active' | 'inactive' };
        }
        return i;
      });

      // Update xp_store_items collection
      try {
        await setDoc(doc(db, 'xp_store_items', itemId), {
          availability: newStatus,
          status: newStatus,
          isActive: newStatus === 'active',
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (e) {
        console.warn('xp_store_items toggle warning:', e);
      }

      await setDoc(doc(db, 'appSettings', 'xpStoreCatalog'), {
        items: updated,
        updatedAt: serverTimestamp()
      });
      setXpStoreItems(updated);
      onShowNotification('Item status updated live in XP Store.', 'success');
    } catch (err: any) {
      onShowNotification('Failed updating item status.', 'error');
    }
  };

  const loadLiveClassesList = async () => {
    setLoadingLiveClasses(true);
    try {
      const data = await liveService.getLiveClasses();
      setLiveClassesList(data);
    } catch (err) {
      console.error('Failed loading live classes list:', err);
    } finally {
      setLoadingLiveClasses(false);
    }
  };

  const handleSaveLiveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!liveClassTitle.trim()) {
      onShowNotification('Please enter Live Class title.', 'error');
      return;
    }
    setSavingLiveClass(true);
    try {
      const classId = editingLiveClassId || `live_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const startTimeISO = liveClassStartTime ? new Date(liveClassStartTime).toISOString() : new Date().toISOString();
      const endTimeISO = new Date(new Date(startTimeISO).getTime() + (Number(liveClassDuration) || 60) * 60 * 1000).toISOString();

      const classData: LiveClass = {
        classId,
        courseId: liveClassCourseId || 'course-web-dev',
        title: liveClassTitle.trim(),
        subject: liveClassSubject.trim() || 'Backend Engineering',
        instructor: liveClassInstructor.trim() || 'Engr. Jamil Ahmed',
        instructorPhoto: liveClassInstructorPhoto.trim() || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
        description: liveClassDescription.trim() || 'Live interactive session and Q&A workspace.',
        requirements: liveClassRequirements ? liveClassRequirements.split(',').map(r => r.trim()).filter(Boolean) : ['Active Enrollment'],
        startTime: startTimeISO,
        endTime: endTimeISO,
        duration: Number(liveClassDuration) || 60,
        status: liveClassStatus,
        thumbnail: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80',
        banner: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&auto=format&fit=crop&q=80',
        streamUrl: liveClassStreamUrl.trim() || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        recordingUrl: liveClassRecordingUrl.trim() || undefined,
        notesUrl: liveClassNotesUrl.trim() || undefined,
        createdAt: new Date().toISOString()
      };

      await liveService.saveLiveClass(classData);
      onShowNotification(`🎉 Live Class "${liveClassTitle.trim()}" published & visible on student panel!`, 'success');

      // Reset form
      setShowAddLiveClassForm(false);
      setEditingLiveClassId(null);
      setLiveClassTitle('');
      setLiveClassDescription('');
      loadLiveClassesList();
    } catch (err: any) {
      onShowNotification(`Failed saving live class: ${err.message || 'Error'}`, 'error');
    } finally {
      setSavingLiveClass(false);
    }
  };

  const handleDeleteLiveClass = async (classId: string) => {
    if (!confirm('Are you sure you want to delete this live class session?')) return;
    try {
      await liveService.deleteLiveClass(classId);
      onShowNotification('Live class deleted.', 'success');
      loadLiveClassesList();
    } catch (err) {
      onShowNotification('Failed deleting live class.', 'error');
    }
  };

  const handleQuickLiveStatus = async (cls: LiveClass, newStatus: LiveClassStatus) => {
    try {
      const updated: LiveClass = { ...cls, status: newStatus };
      await liveService.saveLiveClass(updated);
      onShowNotification(`Class "${cls.title.substring(0, 25)}..." status set to ${newStatus.toUpperCase()}!`, 'success');
      loadLiveClassesList();
    } catch (err) {
      onShowNotification('Failed updating class status.', 'error');
    }
  };

  const handleSendClassReminder = async (cls: LiveClass, target: 'all' | 'user', userIdentifier?: string) => {
    try {
      const formattedTime = new Date(cls.startTime).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const notifTitle = cls.status === 'live' 
        ? `🔴 LIVE NOW: ${cls.title}` 
        : `🔔 Live Class Reminder: ${cls.title}`;

      const notifMessage = cls.status === 'live'
        ? `Class '${cls.title}' with ${cls.instructor || 'Faculty'} is LIVE NOW! Click to join the interactive stream.`
        : `Your scheduled live class '${cls.title}' with ${cls.instructor || 'Faculty'} starts at ${formattedTime}. Be ready with your study notes!`;

      await notificationService.adminSendNotification({
        targetType: target,
        targetIdentifier: userIdentifier,
        title: notifTitle,
        message: notifMessage,
        category: 'announcements',
        type: 'Course Update',
        relatedPage: 'live_classes',
        targetId: cls.classId
      });

      onShowNotification(
        `🎉 Live class reminder sent to ${target === 'all' ? 'all students' : userIdentifier}!`,
        'success'
      );
    } catch (err: any) {
      onShowNotification(`Failed sending class reminder: ${err.message || 'Error'}`, 'error');
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAllData();
      loadXpStoreCatalog();
      loadLiveClassesList();
    }
  }, [isOpen]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [allPur, allCoup, allPm, allCourses, allNotifs, allAnns] = await Promise.all([
        courseService.getAllPurchases(),
        courseService.getCoupons(),
        courseService.getPaymentMethods(),
        courseService.getCourses(),
        notificationService.getAllNotifications(),
        notificationService.getAllAnnouncements()
      ]);
      setPurchases(allPur);
      setCoupons(allCoup);
      setPaymentMethods(allPm);
      setCourses(allCourses);
      setSentNotifs(allNotifs);
      setSentAnnouncements(allAnns);
      loadCloudinaryStatus();
      loadXpStoreCatalog();
      loadLiveClassesList();
      if (allCourses.length > 0) {
        setSelectedCourseId(prev => prev || allCourses[0].courseId);
        setSelectedCurriculumCourseId(prev => prev || allCourses[0].courseId);
      }
    } catch (err) {
      console.error('Failed loading admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Broadcast & Direct Notification Sender Handler
  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifMessage.trim()) {
      onShowNotification('Please enter notification title and message.', 'error');
      return;
    }

    if (notifTargetType === 'user' && !notifTargetIdentifier.trim()) {
      onShowNotification('Please enter target student email address or User ID.', 'error');
      return;
    }

    setSendingNotif(true);
    try {
      // 1. Create Notification Document (for Bell Notification Center)
      await notificationService.adminSendNotification({
        targetType: notifTargetType,
        targetIdentifier: notifTargetIdentifier,
        title: notifTitle,
        message: notifMessage,
        category: notifCategory,
        type: 'General Announcement'
      });

      // 2. Optionally create Global Banner Announcement
      if (alsoPostAnnouncement || notifCategory === 'announcements') {
        await notificationService.createAnnouncement({
          title: notifTitle,
          message: notifMessage,
          priority: 'high',
          isActive: true
        });
      }

      onShowNotification(
        notifTargetType === 'all'
          ? '📢 Broadcast notification sent to all students!'
          : `📩 Notification sent directly to ${notifTargetIdentifier}!`,
        'success'
      );

      setNotifTitle('');
      setNotifMessage('');
      setNotifTargetIdentifier('');
      loadAllData();
    } catch (err) {
      console.error('Failed sending notification:', err);
      onShowNotification('Failed to send notification.', 'error');
    } finally {
      setSendingNotif(false);
    }
  };

  // Delete notification
  const handleDeleteNotif = async (notifId: string) => {
    try {
      await notificationService.deleteNotification(notifId);
      onShowNotification('Notification deleted.', 'success');
      loadAllData();
    } catch (err) {
      onShowNotification('Failed deleting notification.', 'error');
    }
  };

  // Delete announcement
  const handleDeleteAnnouncement = async (annId: string) => {
    try {
      await notificationService.deleteAnnouncement(annId);
      onShowNotification('Announcement deleted.', 'success');
      loadAllData();
    } catch (err) {
      onShowNotification('Failed deleting announcement.', 'error');
    }
  };

  // Grant Instant Access handler
  const handleGrantInstantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) {
      onShowNotification('Please select a course for enrollment.', 'error');
      return;
    }

    const rawList = instantEmails
      .split(/[\n,;]+/)
      .map(s => s.trim())
      .filter(Boolean);

    if (rawList.length === 0) {
      onShowNotification('Please enter at least one student email address or User ID.', 'error');
      return;
    }

    setGrantingAccess(true);
    try {
      const selectedCourse = courses.find(c => c.courseId === selectedCourseId);
      const res = await courseService.grantInstantAccess({
        identifiers: rawList,
        courseId: selectedCourseId,
        courseTitle: selectedCourse?.title
      });

      onShowNotification(
        `Instant Access Granted! Created/merged active enrollment for ${res.grantedCount} student(s).`,
        'success'
      );
      setInstantEmails('');
      setShowInstantForm(false);
      loadAllData();
    } catch (err) {
      console.error('Failed granting instant access:', err);
      onShowNotification('Failed granting instant access.', 'error');
    } finally {
      setGrantingAccess(false);
    }
  };

  const pendingPurchases = purchases.filter(p => p.status === 'pending');

  // Approve action
  const handleApprove = async (purchaseId: string) => {
    setProcessingId(purchaseId);
    try {
      const res = await courseService.approvePurchase(purchaseId);
      if (res && res.userId) {
        await notificationService.adminSendNotification({
          targetType: 'user',
          targetIdentifier: res.userId,
          title: 'Enrollment Approved! 🎉',
          message: `Your course enrollment request has been approved by Admin! You can now access your course in My Courses.`,
          type: 'Payment Success',
          relatedPage: 'courses'
        }).catch(e => console.warn('Silent notice sending approval notification:', e));
      }
      onShowNotification('Enrollment approved! Student now has access.', 'success');
      loadAllData();
    } catch (err) {
      console.error('Failed approving purchase:', err);
      onShowNotification('Failed to approve enrollment.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  // Reject action
  const handleReject = async (purchaseId: string) => {
    setProcessingId(purchaseId);
    try {
      await courseService.rejectPurchase(purchaseId);
      onShowNotification('Enrollment request rejected.', 'error');
      loadAllData();
    } catch (err) {
      console.error('Failed rejecting purchase:', err);
    } finally {
      setProcessingId(null);
    }
  };

  // Revoke / Delete Enrollment action
  const handleRevokeEnrollment = async (p: Purchase) => {
    if (!confirm(`Are you sure you want to revoke/delete the enrollment for "${p.courseTitle || p.courseId}" (${p.userEmail || p.userId})?`)) return;
    try {
      await courseService.deleteEnrollment({
        userId: p.userId,
        courseId: p.courseId,
        purchaseId: p.purchaseId
      });
      onShowNotification('Course enrollment successfully revoked and deleted.', 'success');
      loadAllData();
    } catch (err) {
      console.error('Failed revoking enrollment:', err);
      onShowNotification('Failed revoking enrollment.', 'error');
    }
  };

  // Add Coupon
  const handleAddCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode.trim() || !newDiscountValue) {
      onShowNotification('Please enter coupon code and discount value.', 'error');
      return;
    }

    try {
      await courseService.saveCoupon({
        code: newCouponCode,
        discountType: newDiscountType,
        discountValue: Number(newDiscountValue),
        isActive: true,
        expiryDate: newExpiryDate || '2030-12-31',
        description: newCouponDesc || `${newDiscountType === 'percent' ? newDiscountValue + '%' : '৳' + newDiscountValue} Special Discount`
      });

      onShowNotification(`Coupon ${newCouponCode.toUpperCase()} added successfully!`, 'success');
      setNewCouponCode('');
      setNewDiscountValue('');
      setNewCouponDesc('');
      setShowAddCoupon(false);
      loadAllData();
    } catch (err) {
      onShowNotification('Failed adding coupon.', 'error');
    }
  };

  // Delete Coupon
  const handleDeleteCoupon = async (couponId: string) => {
    try {
      await courseService.deleteCoupon(couponId);
      onShowNotification('Coupon deleted.', 'success');
      loadAllData();
    } catch (err) {
      onShowNotification('Failed deleting coupon.', 'error');
    }
  };

  // Add Payment Method
  const handleAddPaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPmName.trim() || !newPmNumber.trim()) {
      onShowNotification('Please enter method name and account number.', 'error');
      return;
    }

    const id = newPmName.toLowerCase().replace(/\s+/g, '_');
    const newPm: PaymentMethodConfig = {
      id,
      name: newPmName,
      type: newPmType,
      accountNumber: newPmNumber,
      accountType: newPmAccType,
      instructions: newPmInstructions || 'Send Money and submit transaction details.',
      badge: `${newPmType} Active`,
      color: 'from-[#39FF14]/20 to-emerald-600/30',
      icon: newPmType === 'MFS' ? '৳' : '💳',
      isActive: true
    };

    try {
      await courseService.savePaymentMethod(newPm);
      onShowNotification(`Payment method ${newPmName} saved!`, 'success');
      setNewPmName('');
      setNewPmNumber('');
      setNewPmInstructions('');
      setShowAddPm(false);
      loadAllData();
    } catch (err) {
      onShowNotification('Failed saving payment method.', 'error');
    }
  };

  // Delete Payment Method
  const handleDeletePaymentMethod = async (methodId: string) => {
    try {
      await courseService.deletePaymentMethod(methodId);
      onShowNotification('Payment method removed.', 'success');
      loadAllData();
    } catch (err) {
      onShowNotification('Failed removing payment method.', 'error');
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto w-screen h-[100dvh] top-0 left-0">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#0a0f1d] border border-white/10 rounded-2xl sm:rounded-3xl max-w-2xl w-full max-h-[92dvh] flex flex-col shadow-[0_0_50px_rgba(57,255,20,0.1)] overflow-hidden my-auto"
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#39FF14]/10 border border-[#39FF14]/30 flex items-center justify-center text-[#39FF14]">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-white tracking-tight">ADMIN CONTROL PANEL</h2>
                <span className="text-[9px] font-mono bg-[#39FF14]/10 text-[#39FF14] px-2 py-0.5 rounded border border-[#39FF14]/20 uppercase">
                  VERIFIED ADMIN
                </span>
              </div>
              <p className="text-[10px] text-slate-400">Manage Course Approvals, Broadcast Notifications, Coupons & Payments</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={loadAllData}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Tabs */}
        <div className="flex border-b border-white/5 bg-black/20 p-1.5 gap-1.5 overflow-x-auto">
          <button
            onClick={() => setActiveTab('approvals')}
            className={`flex-1 min-w-[120px] py-2 rounded-xl text-[11px] font-mono font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer ${
              activeTab === 'approvals'
                ? 'bg-[#39FF14] text-black shadow-md'
                : 'text-slate-400 hover:text-white bg-white/[0.02]'
            }`}
          >
            <UserCheck size={13} />
            <span>APPROVALS</span>
            {pendingPurchases.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                activeTab === 'approvals' ? 'bg-black text-[#39FF14]' : 'bg-amber-500 text-black'
              }`}>
                {pendingPurchases.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex-1 min-w-[120px] py-2 rounded-xl text-[11px] font-mono font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer ${
              activeTab === 'notifications'
                ? 'bg-[#39FF14] text-black shadow-md'
                : 'text-slate-400 hover:text-white bg-white/[0.02]'
            }`}
          >
            <Bell size={13} />
            <span>NOTIFICATIONS</span>
            {supportTickets.filter(t => t.status === 'open').length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-purple-500 text-white">
                {supportTickets.filter(t => t.status === 'open').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('coupons')}
            className={`flex-1 min-w-[100px] py-2 rounded-xl text-[11px] font-mono font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer ${
              activeTab === 'coupons'
                ? 'bg-[#39FF14] text-black shadow-md'
                : 'text-slate-400 hover:text-white bg-white/[0.02]'
            }`}
          >
            <Tag size={13} />
            <span>COUPONS ({coupons.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`flex-1 min-w-[110px] py-2 rounded-xl text-[11px] font-mono font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer ${
              activeTab === 'payments'
                ? 'bg-[#39FF14] text-black shadow-md'
                : 'text-slate-400 hover:text-white bg-white/[0.02]'
            }`}
          >
            <CreditCard size={13} />
            <span>PAYMENTS ({paymentMethods.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('curriculum')}
            className={`flex-1 min-w-[140px] py-2 rounded-xl text-[11px] font-mono font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer ${
              activeTab === 'curriculum'
                ? 'bg-[#39FF14] text-black shadow-md'
                : 'text-slate-400 hover:text-white bg-white/[0.02]'
            }`}
          >
            <Film size={13} />
            <span>CURRICULUM / VIDEOS</span>
          </button>

          <button
            onClick={() => setActiveTab('live_classes')}
            className={`flex-1 min-w-[140px] py-2 rounded-xl text-[11px] font-mono font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer ${
              activeTab === 'live_classes'
                ? 'bg-[#39FF14] text-black shadow-md'
                : 'text-slate-400 hover:text-white bg-white/[0.02]'
            }`}
          >
            <Tv size={13} />
            <span>LIVE CLASSES ({liveClassesList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('storage')}
            className={`flex-1 min-w-[140px] py-2 rounded-xl text-[11px] font-mono font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
              activeTab === 'storage'
                ? 'bg-[#39FF14] text-black shadow-md'
                : 'text-slate-400 hover:text-white bg-white/[0.02]'
            }`}
          >
            <Cloud size={13} className={cloudinaryStatus.configured ? 'text-[#39FF14]' : 'text-slate-400'} />
            <span>CLOUD STORAGE</span>
            <span className={`w-2 h-2 rounded-full ${
              cloudinaryStatus.configured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
            }`} title={cloudinaryStatus.configured ? 'Cloudinary Connected' : 'Config required'} />
          </button>

          <button
            onClick={() => setActiveTab('xp_store')}
            className={`flex-1 min-w-[140px] py-2 rounded-xl text-[11px] font-mono font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
              activeTab === 'xp_store'
                ? 'bg-[#39FF14] text-black shadow-md'
                : 'text-slate-400 hover:text-white bg-white/[0.02]'
            }`}
          >
            <ShoppingBag size={13} />
            <span>XP STORE PERKS ({xpStoreItems.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('studyFeatures')}
            className={`flex-1 min-w-[140px] py-2 rounded-xl text-[11px] font-mono font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
              activeTab === 'studyFeatures'
                ? 'bg-[#39FF14] text-black shadow-md'
                : 'text-slate-400 hover:text-white bg-white/[0.02]'
            }`}
          >
            <Sparkles size={13} />
            <span>STUDY FEATURES</span>
          </button>

          <button
            onClick={() => setActiveTab('support')}
            className={`flex-1 min-w-[140px] py-2 rounded-xl text-[11px] font-mono font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
              activeTab === 'support'
                ? 'bg-[#39FF14] text-black shadow-md'
                : 'text-slate-400 hover:text-white bg-white/[0.02]'
            }`}
          >
            <Headset size={13} />
            <span>SUPPORT CENTER ({supportTickets.filter(t => t.status === 'open').length})</span>
          </button>

          <button
            onClick={() => setActiveTab('reviews')}
            className={`flex-1 min-w-[130px] py-2 rounded-xl text-[11px] font-mono font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
              activeTab === 'reviews'
                ? 'bg-[#39FF14] text-black shadow-md'
                : 'text-slate-400 hover:text-white bg-white/[0.02]'
            }`}
          >
            <Star size={13} className={activeTab === 'reviews' ? 'fill-black' : 'fill-amber-400 text-amber-400'} />
            <span>REVIEWS (/reviews)</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 min-w-[130px] py-2 rounded-xl text-[11px] font-mono font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-[#39FF14] text-black shadow-md'
                : 'text-slate-400 hover:text-white bg-white/[0.02]'
            }`}
          >
            <SettingsIcon size={13} />
            <span>SETTINGS</span>
            {maintenanceEnabled && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" title="Maintenance Mode Active" />
            )}
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* REVIEWS MANAGEMENT TAB */}
          {activeTab === 'reviews' && (
            <ReviewsPage onShowNotification={onShowNotification} />
          )}
          
          {/* TAB 1: ENROLLMENT APPROVALS */}
          {activeTab === 'approvals' && (
            <div className="space-y-4">
              
              {/* INSTANT ACCESS / MANUAL & BATCH ENROLLMENT SECTION */}
              <div className="bg-slate-950 border border-[#39FF14]/30 rounded-2xl p-4 space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="p-1.5 rounded-lg bg-[#39FF14]/10 text-[#39FF14] border border-[#39FF14]/20 font-mono font-bold text-xs">
                      ⚡
                    </span>
                    <div>
                      <h4 className="text-xs font-mono font-bold text-white uppercase">Instant Access & Batch Enrollment</h4>
                      <p className="text-[10px] text-slate-400">Grant immediate active course access by student email(s) or User IDs</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowInstantForm(!showInstantForm)}
                    className="px-3 py-1.5 bg-[#39FF14] hover:bg-[#32e011] text-black text-xs font-mono font-bold rounded-xl flex items-center space-x-1 cursor-pointer transition-colors"
                  >
                    <Plus size={14} />
                    <span>{showInstantForm ? 'Hide Form' : 'Grant Instant Access'}</span>
                  </button>
                </div>

                {showInstantForm && (
                  <form onSubmit={handleGrantInstantAccess} className="space-y-3 pt-2 border-t border-white/10 font-mono text-xs">
                    <div>
                      <label className="text-slate-400 block text-[10px] uppercase mb-1">Select Target Course:</label>
                      <select
                        value={selectedCourseId}
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-white focus:border-[#39FF14]"
                      >
                        {courses.map(c => (
                          <option key={c.courseId} value={c.courseId}>
                            {c.title} ({c.category})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-400 block text-[10px] uppercase mb-1">
                        Student Email(s) or User ID(s) (Manual or Batch):
                      </label>
                      <textarea
                        rows={3}
                        value={instantEmails}
                        onChange={(e) => setInstantEmails(e.target.value)}
                        placeholder={"Enter student emails or user IDs (one per line, or comma separated):\nwahid23hasan@gmail.com\nstudent@nexus.edu"}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-[#39FF14] text-xs font-mono"
                      />
                      <p className="text-[9px] text-slate-400 mt-1">
                        Creates/merges active enrollment record with status <strong className="text-[#39FF14]">"active"</strong>, lowercased userEmail, and userId.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={grantingAccess}
                      className="w-full py-2.5 bg-[#39FF14] hover:bg-[#32e011] text-black font-bold rounded-xl uppercase tracking-wider transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 size={15} />
                      <span>{grantingAccess ? 'Granting Access...' : '⚡ Grant Instant Access Now'}</span>
                    </button>
                  </form>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                  ⚡ Pending Purchase Approval Requests ({pendingPurchases.length})
                </h3>
                <span className="text-[10px] text-amber-400 font-mono">
                  Students cannot access course content without Admin approval
                </span>
              </div>

              {pendingPurchases.length === 0 ? (
                <div className="p-8 text-center bg-white/[0.01] border border-white/5 rounded-2xl space-y-2">
                  <CheckCircle2 size={32} className="text-[#39FF14] mx-auto opacity-80" />
                  <p className="text-xs font-mono text-slate-300">All pending enrollments have been processed!</p>
                  <p className="text-[10px] text-slate-500">New purchase submissions will appear here automatically.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingPurchases.map((p) => (
                    <div
                      key={p.purchaseId}
                      className="bg-slate-950 border border-amber-500/30 rounded-2xl p-4 space-y-3 relative overflow-hidden"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded uppercase">
                            PENDING APPROVAL
                          </span>
                          <h4 className="text-sm font-bold text-white mt-1.5">{p.courseTitle || 'Course Enrollment'}</h4>
                          <p className="text-[10px] font-mono text-slate-400">ID: {p.purchaseId} • Txn: {p.transactionId}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-base font-mono font-bold text-[#39FF14]">
                            ৳{p.amount?.toLocaleString()}
                          </span>
                          {(p.walletAmountUsed || p.walletUsed) ? (
                            <div className="text-[9.5px] font-mono text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded mt-1">
                              Wallet: ৳{(p.walletAmountUsed || p.walletUsed)} | Gateway: ৳{p.paidAmount ?? (p.amount - (p.walletAmountUsed || p.walletUsed || 0))}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-white/[0.02] p-2.5 rounded-xl border border-white/5 text-slate-300">
                        <div className="flex items-center space-x-1.5">
                          <Mail size={12} className="text-slate-500" />
                          <span className="truncate">{p.userEmail || p.userId}</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <Phone size={12} className="text-[#39FF14]" />
                          <span className="font-bold text-white">{p.userPhoneNumber || 'N/A'}</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <CreditCard size={12} className="text-slate-500" />
                          <span>{p.paymentMethod}</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <Clock size={12} className="text-slate-500" />
                          <span>{new Date(p.purchaseDate).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleApprove(p.purchaseId)}
                          disabled={processingId === p.purchaseId}
                          className="flex-1 py-2.5 bg-[#39FF14] hover:bg-[#32e011] text-black font-bold text-xs font-mono rounded-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-md disabled:opacity-50"
                        >
                          <CheckCircle2 size={14} />
                          <span>APPROVE & ENROLL STUDENT</span>
                        </button>
                        <button
                          onClick={() => handleReject(p.purchaseId)}
                          disabled={processingId === p.purchaseId}
                          className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-bold text-xs font-mono rounded-xl transition-all flex items-center justify-center space-x-1 cursor-pointer disabled:opacity-50"
                        >
                          <XCircle size={14} />
                          <span>REJECT</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Student Refund Requests Management */}
              <div className="pt-4 border-t border-white/10 space-y-3 font-mono">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold text-xs">
                      💰
                    </span>
                    <div>
                      <h4 className="text-xs font-mono font-bold text-white uppercase">Student Course Refund Applications ({refundRequestsList.length})</h4>
                      <p className="text-[10px] text-slate-400">Review payout details, student notes & approve/reject requests</p>
                    </div>
                  </div>

                  <span className="text-[10px] text-amber-400 font-bold px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                    {refundRequestsList.filter(r => r.status === 'pending').length} PENDING
                  </span>
                </div>

                {loadingRefundRequests ? (
                  <div className="text-center py-6 text-slate-400 text-xs">Syncing refund applications...</div>
                ) : refundRequestsList.length === 0 ? (
                  <div className="p-6 text-center bg-white/[0.01] border border-white/5 rounded-2xl text-xs text-slate-400">
                    No refund requests recorded in Firestore.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1 scrollbar-thin">
                    {refundRequestsList.map((req) => (
                      <div key={req.id} className={`p-3.5 rounded-2xl border text-xs space-y-2.5 ${
                        req.status === 'pending'
                          ? 'bg-slate-950 border-amber-500/40'
                          : req.status === 'approved'
                          ? 'bg-slate-950/80 border-emerald-500/30'
                          : 'bg-slate-950/80 border-rose-500/30'
                      }`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-white font-bold">{req.courseTitle || 'Course Purchase'}</span>
                            <p className="text-[10px] text-slate-400">Student: {req.userName || req.userEmail || req.userId}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-bold text-emerald-400">৳{req.amount}</span>
                            <div className="mt-0.5">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                req.status === 'approved'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : req.status === 'rejected'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                              }`}>
                                {req.status}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[10px] bg-white/[0.02] p-2 rounded-xl border border-white/5 text-slate-300">
                          <div>
                            <span className="text-slate-500 block uppercase">bKash/Nagad Payout:</span>
                            <strong className="text-white font-mono">{req.bkashNumber || 'N/A'}</strong>
                          </div>
                          <div>
                            <span className="text-slate-500 block uppercase">Reason:</span>
                            <span className="text-slate-200">{req.reason}</span>
                          </div>
                        </div>

                        {req.notes && (
                          <div className="text-[10px] p-2 bg-white/[0.02] rounded-xl border border-white/5 text-slate-300">
                            <span className="text-slate-500 uppercase block">Student Note:</span>
                            <span>{req.notes}</span>
                          </div>
                        )}

                        {req.adminNote && (
                          <div className="text-[10px] p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-300">
                            <span className="text-emerald-400 uppercase font-bold block">Current Admin Note:</span>
                            <span>{req.adminNote}</span>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/5">
                          <span className="text-[9px] text-slate-500">{new Date(req.createdAt).toLocaleString()}</span>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleUpdateRefundStatus(req.id, 'approved')}
                              className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 rounded-lg text-[10px] font-bold cursor-pointer transition-all flex items-center space-x-1"
                            >
                              <span>✓ Approve Refund</span>
                            </button>

                            <button
                              onClick={() => handleUpdateRefundStatus(req.id, 'rejected')}
                              className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 rounded-lg text-[10px] font-bold cursor-pointer transition-all flex items-center space-x-1"
                            >
                              <span>✕ Reject Refund</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* All Purchase History */}
              <div className="pt-4 border-t border-white/10 space-y-2">
                <h4 className="text-xs font-mono font-bold text-slate-400 uppercase">Recent Purchase Ledger History</h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {purchases.filter(p => p.status !== 'pending').map((p) => (
                    <div key={p.purchaseId} className="flex justify-between items-center p-2.5 bg-white/[0.01] border border-white/5 rounded-xl text-[10px] font-mono">
                      <div>
                        <span className="text-white font-bold">{p.courseTitle || p.courseId}</span>
                        <span className="text-slate-500 ml-2">({p.userEmail || p.userId})</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-slate-400">৳{p.amount}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                          p.status === 'approved' || p.status === 'success' 
                            ? 'bg-[#39FF14]/10 text-[#39FF14]' 
                            : 'bg-red-500/10 text-red-400'
                        }`}>
                          {p.status}
                        </span>
                        <button
                          onClick={() => handleRevokeEnrollment(p)}
                          className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded text-[9px] font-bold cursor-pointer transition-colors"
                          title="Revoke / Delete Enrollment"
                        >
                          Revoke
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: NOTIFICATIONS & BROADCASTS */}
          {activeTab === 'notifications' && (
            <div className="space-y-4 font-mono">
              <div className="bg-slate-950 border border-[#39FF14]/30 rounded-2xl p-4 space-y-3">
                <div className="flex items-center space-x-2 pb-2 border-b border-white/10">
                  <Megaphone size={18} className="text-[#39FF14]" />
                  <div>
                    <h3 className="text-xs font-bold text-[#39FF14] uppercase">Broadcast & Direct Push Notifications</h3>
                    <p className="text-[10px] text-slate-400">Send instant real-time alerts directly to student dashboards & notification bells</p>
                  </div>
                </div>

                <form onSubmit={handleSendNotification} className="space-y-3 text-xs">
                  {/* Target audience selector */}
                  <div>
                    <label className="text-slate-400 block text-[10px] uppercase font-bold mb-1">Target Recipient Audience:</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setNotifTargetType('all')}
                        className={`py-2 px-3 rounded-xl border text-center font-bold text-[11px] transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                          notifTargetType === 'all'
                            ? 'bg-[#39FF14]/20 border-[#39FF14] text-[#39FF14]'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        <Megaphone size={14} />
                        <span>📢 All Students (Broadcast)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setNotifTargetType('user')}
                        className={`py-2 px-3 rounded-xl border text-center font-bold text-[11px] transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                          notifTargetType === 'user'
                            ? 'bg-[#39FF14]/20 border-[#39FF14] text-[#39FF14]'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        <Mail size={14} />
                        <span>👤 Direct Student Email / ID</span>
                      </button>
                    </div>
                  </div>

                  {/* Specific Student Input */}
                  {notifTargetType === 'user' && (
                    <div>
                      <label className="text-slate-400 block text-[10px] uppercase font-bold">Student Email or User ID:</label>
                      <input
                        type="text"
                        value={notifTargetIdentifier}
                        onChange={(e) => setNotifTargetIdentifier(e.target.value)}
                        placeholder="e.g. wahid23hasan@gmail.com or user_uid"
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white mt-1 focus:border-[#39FF14]"
                      />
                    </div>
                  )}

                  {/* Title & Category */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="text-slate-400 block text-[10px] uppercase font-bold">Notification Title:</label>
                      <input
                        type="text"
                        value={notifTitle}
                        onChange={(e) => setNotifTitle(e.target.value)}
                        placeholder="e.g. 🎓 New Live Class Schedule Announced!"
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white mt-1 focus:border-[#39FF14]"
                      />
                    </div>

                    <div>
                      <label className="text-slate-400 block text-[10px] uppercase font-bold">Category:</label>
                      <select
                        value={notifCategory}
                        onChange={(e) => setNotifCategory(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-white mt-1 focus:border-[#39FF14]"
                      >
                        <option value="announcements">Announcements</option>
                        <option value="courses">Courses</option>
                        <option value="learning">Learning / Quizzes</option>
                        <option value="payment">Payment & Billing</option>
                        <option value="promotions">Promotions & Discounts</option>
                      </select>
                    </div>
                  </div>

                  {/* Message body */}
                  <div>
                    <label className="text-slate-400 block text-[10px] uppercase font-bold">Notification Message Content:</label>
                    <textarea
                      value={notifMessage}
                      onChange={(e) => setNotifMessage(e.target.value)}
                      rows={3}
                      placeholder="Enter detailed message for students..."
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white mt-1 focus:border-[#39FF14] text-xs"
                    />
                  </div>

                  {/* Option to also pin as Top Banner Announcement */}
                  <div className="flex items-center space-x-2 pt-1">
                    <input
                      type="checkbox"
                      id="alsoPostAnn"
                      checked={alsoPostAnnouncement}
                      onChange={(e) => setAlsoPostAnnouncement(e.target.checked)}
                      className="rounded border-white/20 bg-white/5 text-[#39FF14] focus:ring-0 cursor-pointer"
                    />
                    <label htmlFor="alsoPostAnn" className="text-slate-300 text-[11px] cursor-pointer">
                      Pin as a High-Priority Top Banner Announcement
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={sendingNotif}
                    className="w-full py-2.5 bg-[#39FF14] hover:bg-[#32e011] text-black font-extrabold text-xs rounded-xl uppercase tracking-wider cursor-pointer flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
                  >
                    <Send size={14} className={sendingNotif ? 'animate-bounce' : ''} />
                    <span>{sendingNotif ? 'Sending Notification...' : '🚀 Send Notification & Broadcast Now'}</span>
                  </button>
                </form>
              </div>

              {/* Real-time Student Support Ticket Alerts Block */}
              <div className="bg-purple-950/40 border border-purple-500/30 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-purple-500/20">
                  <div className="flex items-center space-x-2">
                    <Headset size={16} className="text-purple-400" />
                    <div>
                      <h4 className="text-xs font-bold text-purple-300 uppercase">Incoming Student Support Requests & Messages</h4>
                      <p className="text-[10px] text-slate-400">Live support queue connected to Firestore <code className="text-[#39FF14]">support_tickets</code></p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-500/30">
                    {supportTickets.filter(t => t.status === 'open').length} OPEN
                  </span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {supportTickets.filter(t => t.status === 'open').length === 0 ? (
                    <div className="p-3 bg-white/[0.01] border border-white/5 rounded-xl text-slate-400 text-[10px] text-center">
                      🟢 All student support tickets have been resolved! No pending support alerts.
                    </div>
                  ) : (
                    supportTickets.filter(t => t.status === 'open').map((st) => (
                      <div key={st.id} className="p-3 bg-slate-900/80 border border-purple-500/20 hover:border-purple-500/40 rounded-xl flex items-center justify-between text-xs transition-colors">
                        <div className="space-y-1 flex-1 pr-2">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-white text-xs">{st.subject}</span>
                            <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold uppercase ${
                              st.priority === 'high' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-white/10 text-slate-300'
                            }`}>
                              {st.priority} Priority
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-300 font-sans line-clamp-1">{st.message}</p>
                          <p className="text-[9px] text-slate-500 font-mono">
                            Student: {st.userEmail || st.userId} • {new Date(st.createdAt).toLocaleString()}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('support');
                            setSelectedSupportTicketId(st.id);
                          }}
                          className="px-2.5 py-1.5 bg-[#39FF14] hover:bg-[#32e011] text-black font-mono font-bold text-[10px] rounded-lg shrink-0 cursor-pointer shadow"
                        >
                          View & Reply →
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Sent Notifications History */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center justify-between">
                  <span>📜 Sent Notifications History ({sentNotifs.length})</span>
                  <button onClick={loadAllData} className="text-[10px] text-[#39FF14] hover:underline flex items-center space-x-1 cursor-pointer">
                    <RefreshCw size={10} />
                    <span>Refresh</span>
                  </button>
                </h4>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {sentNotifs.length === 0 ? (
                    <div className="p-3 bg-white/[0.01] border border-white/5 rounded-xl text-slate-500 text-[10px] text-center">
                      No sent notifications recorded yet.
                    </div>
                  ) : (
                    sentNotifs.map((n) => (
                      <div key={n.notificationId} className="p-3 bg-white/[0.02] border border-white/10 rounded-2xl flex justify-between items-start text-xs">
                        <div className="space-y-1 pr-2 flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-white text-xs">{n.title}</span>
                            <span className="px-1.5 py-0.5 rounded bg-[#39FF14]/10 text-[#39FF14] text-[9px] font-bold uppercase">
                              {n.userId === 'all' ? '📢 Broadcast (All)' : `👤 ${n.userEmail || n.userId}`}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 font-sans">{n.message}</p>
                          <p className="text-[9px] text-slate-500">{new Date(n.createdAt).toLocaleString()}</p>
                        </div>

                        <button
                          onClick={() => handleDeleteNotif(n.notificationId)}
                          className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Delete notification"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Active Banner Announcements */}
              {sentAnnouncements.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <h4 className="text-xs font-bold text-slate-400 uppercase">📌 Active Top Banner Announcements ({sentAnnouncements.length})</h4>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {sentAnnouncements.map((ann) => (
                      <div key={ann.announcementId} className="p-2.5 bg-[#39FF14]/5 border border-[#39FF14]/20 rounded-xl flex justify-between items-center text-xs">
                        <div>
                          <p className="font-bold text-[#39FF14] text-[11px]">{ann.title}</p>
                          <p className="text-[10px] text-slate-300 font-sans">{ann.message}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteAnnouncement(ann.announcementId)}
                          className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer ml-2"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: COUPONS MANAGEMENT */}
          {activeTab === 'coupons' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-mono font-bold text-slate-300 uppercase">
                  🏷️ Manage Promotional Coupons
                </h3>
                <button
                  onClick={() => setShowAddCoupon(!showAddCoupon)}
                  className="px-3 py-1.5 bg-[#39FF14] text-black text-xs font-mono font-bold rounded-xl flex items-center space-x-1 cursor-pointer"
                >
                  <Plus size={14} />
                  <span>{showAddCoupon ? 'Cancel' : 'Add New Coupon'}</span>
                </button>
              </div>

              {/* Add Coupon Form */}
              {showAddCoupon && (
                <form onSubmit={handleAddCoupon} className="bg-slate-950 border border-[#39FF14]/30 rounded-2xl p-4 space-y-3 font-mono text-xs">
                  <h4 className="font-bold text-[#39FF14]">Create New Coupon Code</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-400 block text-[10px]">COUPON CODE:</label>
                      <input
                        type="text"
                        value={newCouponCode}
                        onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                        placeholder="e.g. SPECIAL50"
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white mt-1 focus:border-[#39FF14]"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block text-[10px]">DISCOUNT TYPE:</label>
                      <select
                        value={newDiscountType}
                        onChange={(e) => setNewDiscountType(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-white mt-1 focus:border-[#39FF14]"
                      >
                        <option value="percent">Percentage (%)</option>
                        <option value="fixed">Fixed Amount (৳)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-400 block text-[10px]">VALUE ({newDiscountType === 'percent' ? '%' : '৳'}):</label>
                      <input
                        type="number"
                        value={newDiscountValue}
                        onChange={(e) => setNewDiscountValue(e.target.value)}
                        placeholder="e.g. 50"
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white mt-1 focus:border-[#39FF14]"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block text-[10px]">EXPIRY DATE:</label>
                      <input
                        type="date"
                        value={newExpiryDate}
                        onChange={(e) => setNewExpiryDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-white mt-1 focus:border-[#39FF14]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-400 block text-[10px]">DESCRIPTION / NOTE:</label>
                    <input
                      type="text"
                      value={newCouponDesc}
                      onChange={(e) => setNewCouponDesc(e.target.value)}
                      placeholder="e.g. Special 50% Launch Promo"
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white mt-1 focus:border-[#39FF14]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#39FF14] text-black font-bold rounded-xl uppercase tracking-wider cursor-pointer"
                  >
                    Save & Publish Coupon
                  </button>
                </form>
              )}

              {/* Coupons List */}
              <div className="space-y-2">
                {coupons.map((c) => (
                  <div key={c.couponId} className="flex justify-between items-center p-3 bg-white/[0.01] border border-white/10 rounded-2xl font-mono text-xs">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-[#39FF14] text-sm">{c.code}</span>
                        <span className="px-2 py-0.5 rounded bg-white/5 text-slate-300 text-[10px]">
                          {c.discountType === 'percent' ? `${c.discountValue}% OFF` : `৳${c.discountValue} OFF`}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">{c.description}</p>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className="text-[10px] text-slate-500">{c.expiryDate}</span>
                      <button
                        onClick={() => handleDeleteCoupon(c.couponId)}
                        className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: PAYMENT METHODS MANAGEMENT */}
          {activeTab === 'payments' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-mono font-bold text-slate-300 uppercase">
                  💳 Configure Admin Payment Gateways
                </h3>
                <button
                  onClick={() => setShowAddPm(!showAddPm)}
                  className="px-3 py-1.5 bg-[#39FF14] text-black text-xs font-mono font-bold rounded-xl flex items-center space-x-1 cursor-pointer"
                >
                  <Plus size={14} />
                  <span>{showAddPm ? 'Cancel' : 'Add Payment Method'}</span>
                </button>
              </div>

              {/* Add Payment Method Form */}
              {showAddPm && (
                <form onSubmit={handleAddPaymentMethod} className="bg-slate-950 border border-[#39FF14]/30 rounded-2xl p-4 space-y-3 font-mono text-xs">
                  <h4 className="font-bold text-[#39FF14]">Configure Payment Method</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-400 block text-[10px]">METHOD NAME:</label>
                      <input
                        type="text"
                        value={newPmName}
                        onChange={(e) => setNewPmName(e.target.value)}
                        placeholder="e.g. bKash Personal"
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white mt-1 focus:border-[#39FF14]"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block text-[10px]">TYPE:</label>
                      <select
                        value={newPmType}
                        onChange={(e) => setNewPmType(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-white mt-1 focus:border-[#39FF14]"
                      >
                        <option value="MFS">MFS Wallet (bKash/Nagad/Rocket)</option>
                        <option value="Card">Credit/Debit Card</option>
                        <option value="Bank">Bank Gateway</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-400 block text-[10px]">ACCOUNT / WALLET NUMBER:</label>
                      <input
                        type="text"
                        value={newPmNumber}
                        onChange={(e) => setNewPmNumber(e.target.value)}
                        placeholder="017XXXXXXXX"
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white mt-1 focus:border-[#39FF14]"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block text-[10px]">ACCOUNT TYPE:</label>
                      <input
                        type="text"
                        value={newPmAccType}
                        onChange={(e) => setNewPmAccType(e.target.value)}
                        placeholder="Personal / Merchant"
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white mt-1 focus:border-[#39FF14]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-400 block text-[10px]">PAYMENT INSTRUCTIONS FOR USER:</label>
                    <input
                      type="text"
                      value={newPmInstructions}
                      onChange={(e) => setNewPmInstructions(e.target.value)}
                      placeholder="e.g. Send Money to this Personal bKash number and enter transaction ID."
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white mt-1 focus:border-[#39FF14]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#39FF14] text-black font-bold rounded-xl uppercase tracking-wider cursor-pointer"
                  >
                    Save Gateway Configuration
                  </button>
                </form>
              )}

              {/* Payment Methods List */}
              <div className="space-y-3">
                {paymentMethods.map((pm) => (
                  <div key={pm.id} className="p-3.5 bg-white/[0.01] border border-white/10 rounded-2xl font-mono text-xs space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-extrabold text-white text-sm">{pm.name}</span>
                          <span className="px-2 py-0.5 rounded bg-[#39FF14]/10 text-[#39FF14] text-[9px] font-bold uppercase">
                            {pm.accountType || pm.type}
                          </span>
                        </div>
                        <p className="text-xs text-[#39FF14] font-bold mt-1">Number: {pm.accountNumber}</p>
                      </div>

                      <button
                        onClick={() => handleDeletePaymentMethod(pm.id)}
                        className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {pm.instructions && (
                      <p className="text-[10px] text-slate-400 font-sans italic border-t border-white/5 pt-1.5">
                        "{pm.instructions}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: CURRICULUM & VIDEOS MANAGEMENT */}
          {activeTab === 'curriculum' && (
            <div className="space-y-4 font-mono">
              <div className="bg-slate-950 border border-[#39FF14]/30 rounded-2xl p-4 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/5 pb-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center space-x-2">
                      <Video size={14} className="text-[#39FF14]" />
                      <span>Curriculum Video & Material Manager</span>
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Upload video files or configure video lessons for students.
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] text-slate-400">Select Course:</span>
                    <select
                      value={selectedCurriculumCourseId}
                      onChange={(e) => setSelectedCurriculumCourseId(e.target.value)}
                      className="px-3 py-1.5 bg-black border border-white/10 rounded-xl text-xs text-white focus:border-[#39FF14] outline-none"
                    >
                      {courses.map(c => (
                        <option key={c.courseId} value={c.courseId}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {loadingCurriculum ? (
                  <div className="py-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center space-y-2">
                    <RefreshCw className="animate-spin text-[#39FF14]" size={20} />
                    <span>Loading chapters and curriculum...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    {/* LEFT COLUMN: CHAPTERS & LESSONS SELECTION */}
                    <div className="lg:col-span-5 space-y-3 border-r border-white/5 pr-0 lg:pr-4">
                      {/* CHAPTER SELECTION & CREATION */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] text-slate-400 uppercase font-bold">1. Select Chapter</label>
                          <button
                            onClick={() => setShowAddChapterModal(!showAddChapterModal)}
                            className="text-[10px] text-[#39FF14] hover:underline flex items-center space-x-1 font-bold cursor-pointer"
                          >
                            <Plus size={12} />
                            <span>{showAddChapterModal ? 'Cancel' : 'New Chapter'}</span>
                          </button>
                        </div>

                        {showAddChapterModal && (
                          <div className="p-2.5 mb-2 bg-[#39FF14]/5 border border-[#39FF14]/20 rounded-xl space-y-2">
                            <span className="text-[10px] text-[#39FF14] font-bold block">CREATE NEW CHAPTER</span>
                            <input
                              type="text"
                              placeholder="e.g. Chapter 1: Foundations"
                              value={newChapterTitle}
                              onChange={(e) => setNewChapterTitle(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-black border border-white/10 rounded-lg text-xs text-white focus:border-[#39FF14] outline-none"
                            />
                            <button
                              onClick={handleAddNewChapter}
                              disabled={addingChapter || !newChapterTitle.trim()}
                              className="w-full py-1.5 bg-[#39FF14] text-black text-[10px] font-bold rounded-lg uppercase tracking-wider hover:bg-opacity-90 disabled:opacity-50 cursor-pointer flex items-center justify-center space-x-1"
                            >
                              {addingChapter ? <RefreshCw size={12} className="animate-spin" /> : <Plus size={12} />}
                              <span>Save Chapter</span>
                            </button>
                          </div>
                        )}

                        <select
                          value={selectedChapterId}
                          onChange={(e) => {
                            setSelectedChapterId(e.target.value);
                            setSelectedLesson(null);
                            setLessonVideo(null);
                          }}
                          className="w-full px-3 py-2 bg-black border border-white/10 rounded-xl text-xs text-white focus:border-[#39FF14] outline-none"
                        >
                          <option value="">-- Choose Chapter --</option>
                          {chapters.map(ch => (
                            <option key={ch.chapterId} value={ch.chapterId}>
                              CH {ch.sequenceOrder}: {ch.title}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* LESSON SELECTION & CREATION */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] text-slate-400 uppercase font-bold">2. Select Lesson</label>
                          {selectedChapterId && (
                            <button
                              onClick={() => setShowAddLessonModal(!showAddLessonModal)}
                              className="text-[10px] text-[#39FF14] hover:underline flex items-center space-x-1 font-bold cursor-pointer"
                            >
                              <Plus size={12} />
                              <span>{showAddLessonModal ? 'Cancel' : 'Add Lesson'}</span>
                            </button>
                          )}
                        </div>

                        {showAddLessonModal && selectedChapterId && (
                          <div className="p-2.5 mb-2 bg-[#39FF14]/5 border border-[#39FF14]/20 rounded-xl space-y-2">
                            <span className="text-[10px] text-[#39FF14] font-bold block">ADD NEW LESSON TO CHAPTER</span>
                            <input
                              type="text"
                              placeholder="Lesson Title (e.g., Intro to Variables)"
                              value={newLessonTitle}
                              onChange={(e) => setNewLessonTitle(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-black border border-white/10 rounded-lg text-xs text-white focus:border-[#39FF14] outline-none"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                placeholder="Duration (e.g. 15:00)"
                                value={newLessonDuration}
                                onChange={(e) => setNewLessonDuration(e.target.value)}
                                className="px-2.5 py-1 bg-black border border-white/10 rounded-lg text-[11px] text-white focus:border-[#39FF14] outline-none"
                              />
                              <label className="flex items-center space-x-1 text-[10px] text-slate-300 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={newLessonIsFreePreview}
                                  onChange={(e) => setNewLessonIsFreePreview(e.target.checked)}
                                  className="accent-[#39FF14]"
                                />
                                <span>Free Preview</span>
                              </label>
                            </div>
                            <input
                              type="text"
                              placeholder="Video URL (e.g., https://.../video.mp4)"
                              value={newLessonVideoUrl}
                              onChange={(e) => setNewLessonVideoUrl(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-black border border-white/10 rounded-lg text-xs text-white focus:border-[#39FF14] outline-none"
                            />
                            <button
                              onClick={handleAddNewLesson}
                              disabled={addingLesson || !newLessonTitle.trim()}
                              className="w-full py-1.5 bg-[#39FF14] text-black text-[10px] font-bold rounded-lg uppercase tracking-wider hover:bg-opacity-90 disabled:opacity-50 cursor-pointer flex items-center justify-center space-x-1"
                            >
                              {addingLesson ? <RefreshCw size={12} className="animate-spin" /> : <Plus size={12} />}
                              <span>Add Lesson to Course</span>
                            </button>
                          </div>
                        )}

                        <div className="bg-black/40 border border-white/5 rounded-xl max-h-[300px] overflow-y-auto p-1.5 space-y-1">
                          {selectedChapterId ? (
                            chapters
                              .find(ch => ch.chapterId === selectedChapterId)
                              ?.lessons.map(lesson => {
                                const isSelected = selectedLesson?.lessonId === lesson.lessonId;
                                const hasCustomVideo = !!((lesson as any).videoUrl || (lesson as any).video_url);
                                return (
                                  <div
                                    key={lesson.lessonId}
                                    onClick={() => {
                                      setSelectedLesson(lesson);
                                      loadLessonVideo(selectedCurriculumCourseId, lesson.lessonId, lesson.sequenceOrder, (lesson as any).videoUrl);
                                    }}
                                    className={`w-full text-left p-2 rounded-lg text-xs font-mono transition-all flex items-center justify-between cursor-pointer group ${
                                      isSelected
                                        ? 'bg-[#39FF14]/10 border border-[#39FF14]/30 text-[#39FF14]'
                                        : 'bg-white/[0.01] hover:bg-white/5 text-slate-300 border border-transparent'
                                    }`}
                                  >
                                    <div className="truncate pr-2 flex items-center space-x-1.5">
                                      <span className="text-[10px] text-slate-500">#{lesson.sequenceOrder}</span>
                                      <span className="truncate">{lesson.title}</span>
                                      {hasCustomVideo && (
                                        <span className="px-1.5 py-0.5 bg-[#39FF14]/20 text-[#39FF14] text-[8px] rounded uppercase font-bold tracking-wider shrink-0">
                                          🎥 Custom
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center space-x-1.5 shrink-0">
                                      <span className="text-[9px] text-slate-500 whitespace-nowrap bg-white/5 px-1.5 py-0.5 rounded">
                                        {lesson.duration}
                                      </span>
                                      <button
                                        onClick={(e) => handleDeleteLesson(lesson.lessonId, e)}
                                        title="Delete Lesson"
                                        className="p-1 hover:text-red-400 text-slate-600 transition-colors opacity-0 group-hover:opacity-100"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })
                          ) : (
                            <div className="py-6 text-center text-xs text-slate-600">
                              Please select a chapter first
                            </div>
                          )}
                          {selectedChapterId && chapters.find(ch => ch.chapterId === selectedChapterId)?.lessons.length === 0 && (
                            <div className="py-6 text-center text-xs text-slate-600">
                              No lessons inside this chapter
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* RIGHT COLUMN: VIDEO CONFIG & UPLOAD */}
                    <div className="lg:col-span-7 space-y-3">
                      {!selectedLesson ? (
                        <div className="h-full min-h-[220px] bg-black/20 rounded-2xl border border-dashed border-white/10 flex flex-col items-center justify-center text-center p-6 text-slate-500">
                          <Film size={28} className="text-slate-600 mb-2 animate-pulse" />
                          <p className="text-xs font-bold text-slate-400">No Lesson Selected</p>
                          <p className="text-[10px] text-slate-600 max-w-[240px] mt-1">
                            Click a chapter and then select a lesson on the left to configure or upload its video.
                          </p>
                        </div>
                      ) : loadingVideo ? (
                        <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center p-6 space-y-2 text-slate-500">
                          <RefreshCw className="animate-spin text-[#39FF14]" size={20} />
                          <span className="text-xs">Fetching video record...</span>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="bg-black/30 border border-[#39FF14]/10 rounded-xl p-3">
                            <span className="text-[9px] text-[#39FF14] font-bold uppercase tracking-wider block mb-0.5">CURRENT LESSON</span>
                            <h4 className="text-xs font-bold text-white">{selectedLesson.title}</h4>
                            <div className="flex items-center space-x-3 text-[10px] text-slate-400 mt-1.5">
                              <span>Chapter: {chapters.find(ch => ch.chapterId === selectedChapterId)?.title}</span>
                              <span>•</span>
                              <span>Duration: {selectedLesson.duration}</span>
                            </div>
                          </div>

                          {/* FILE UPLOAD DIRECTIVE */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] text-[#39FF14] uppercase font-bold tracking-wider">
                                Option A: Upload Video File
                              </label>
                              <div className="flex items-center space-x-1 bg-black/60 p-0.5 rounded-lg border border-white/10 text-[9px] font-mono">
                                <button
                                  type="button"
                                  onClick={() => setTargetStorageProvider('cloudinary')}
                                  className={`px-2 py-0.5 rounded-md flex items-center space-x-1 cursor-pointer transition-colors ${
                                    targetStorageProvider === 'cloudinary'
                                      ? 'bg-[#39FF14] text-black font-bold'
                                      : 'text-slate-400 hover:text-white'
                                  }`}
                                >
                                  <Cloud size={10} />
                                  <span>Cloudinary CDN</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setTargetStorageProvider('server_local')}
                                  className={`px-2 py-0.5 rounded-md flex items-center space-x-1 cursor-pointer transition-colors ${
                                    targetStorageProvider === 'server_local'
                                      ? 'bg-[#39FF14] text-black font-bold'
                                      : 'text-slate-400 hover:text-white'
                                  }`}
                                >
                                  <Server size={10} />
                                  <span>Server Local</span>
                                </button>
                              </div>
                            </div>
                            
                            <div className="border border-dashed border-[#39FF14]/30 rounded-xl p-4 bg-black/40 text-center hover:border-[#39FF14] transition-colors relative">
                              {uploadingFile ? (
                                <div className="space-y-2 py-2">
                                  <RefreshCw className="animate-spin mx-auto text-[#39FF14]" size={24} />
                                  <p className="text-xs text-white font-bold">
                                    Uploading to {targetStorageProvider === 'cloudinary' ? 'Cloudinary Cloud CDN' : 'Server Storage'}...
                                  </p>
                                  <div className="w-full bg-slate-900 rounded-full h-1.5 max-w-[200px] mx-auto overflow-hidden">
                                    <div 
                                      className="bg-[#39FF14] h-1.5 rounded-full transition-all duration-300" 
                                      style={{ width: `${uploadProgress}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-[9px] text-slate-400 font-mono">{uploadProgress}% complete</span>
                                </div>
                              ) : (
                                <div className="space-y-2 py-1">
                                  {targetStorageProvider === 'cloudinary' ? (
                                    <Cloud className="mx-auto text-[#39FF14]" size={24} />
                                  ) : (
                                    <Upload className="mx-auto text-[#39FF14]" size={24} />
                                  )}
                                  <p className="text-xs text-slate-200 font-medium">
                                    Drag & drop your video here, or <span className="text-[#39FF14] underline cursor-pointer font-bold">browse from device</span>
                                  </p>
                                  <p className="text-[9px] text-slate-400">
                                    Target: <span className="text-[#39FF14] font-mono">{targetStorageProvider === 'cloudinary' ? 'Cloudinary Global CDN (Stream & Auto Poster)' : 'Local Server Storage'}</span> • MP4, WebM, MOV supported (up to 500MB)
                                  </p>
                                  
                                  <input
                                    type="file"
                                    accept="video/*"
                                    onChange={handleUploadVideoFile}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                  />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* MANUAL INPUTS */}
                          <div className="space-y-2 border-t border-white/5 pt-3">
                            <label className="text-[10px] text-slate-400 block uppercase font-bold">
                              Option B: Custom Video Link (YouTube, Drive, Vimeo, MP4)
                            </label>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="md:col-span-2">
                                <span className="text-[9px] text-slate-400">VIDEO STREAMING URL:</span>
                                <input
                                  type="text"
                                  value={editVideoUrl}
                                  onChange={(e) => setEditVideoUrl(e.target.value)}
                                  placeholder="e.g. /uploads/video.mp4 or https://youtu.be/... or https://drive.google.com/..."
                                  className="w-full px-3 py-1.5 mt-1 bg-black border border-white/10 rounded-xl text-xs text-white focus:border-[#39FF14] outline-none font-mono"
                                />
                              </div>

                              <div>
                                <span className="text-[9px] text-slate-400">VIDEO DURATION (SECONDS):</span>
                                <input
                                  type="number"
                                  value={editVideoDuration}
                                  onChange={(e) => setEditVideoDuration(Number(e.target.value))}
                                  placeholder="180"
                                  className="w-full px-3 py-1.5 mt-1 bg-black border border-white/10 rounded-xl text-xs text-white focus:border-[#39FF14] outline-none"
                                />
                              </div>

                              <div>
                                <span className="text-[9px] text-slate-400">THUMBNAIL URL (OPTIONAL):</span>
                                <input
                                  type="text"
                                  value={editVideoThumbnail}
                                  onChange={(e) => setEditVideoThumbnail(e.target.value)}
                                  placeholder="https://images.unsplash.com/photo..."
                                  className="w-full px-3 py-1.5 mt-1 bg-black border border-white/10 rounded-xl text-xs text-white focus:border-[#39FF14] outline-none"
                                />
                              </div>
                            </div>
                          </div>

                          {/* LIVE VIDEO TEST PREVIEW IN ADMIN MODAL */}
                          {editVideoUrl && editVideoUrl.trim() && (
                            <div className="space-y-1.5 border border-white/10 rounded-xl p-2.5 bg-black/60">
                              <div className="flex items-center justify-between text-[10px] text-slate-300 font-mono">
                                <span className="flex items-center space-x-1 text-[#39FF14]">
                                  <Play size={12} />
                                  <span>Live Stream Test Preview</span>
                                </span>
                                <span className="text-slate-500 truncate max-w-[200px]">{editVideoUrl}</span>
                              </div>
                              <div className="w-full aspect-video rounded-lg overflow-hidden border border-white/10 bg-black">
                                <SmartVideoPlayer
                                  videoUrl={editVideoUrl}
                                  title={selectedLesson.title}
                                  thumbnailUrl={editVideoThumbnail}
                                  autoPlay={false}
                                />
                              </div>
                            </div>
                          )}

                          {/* VIDEO PRESETS FOR QUICK TESTING */}
                          <div className="space-y-1.5 border-t border-white/5 pt-2">
                            <span className="text-[9px] text-slate-400 block uppercase font-bold">QUICK TEST: High-Quality Educational Preset Loops</span>
                            <div className="flex flex-wrap gap-1.5">
                              {[
                                { name: 'Big Buck Bunny (Google CDN)', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' },
                                { name: 'For Bigger Blazes (Google CDN)', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' },
                                { name: 'Elephants Dream (Google CDN)', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4' },
                                { name: 'Tears of Steel (Google CDN)', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4' }
                              ].map(p => (
                                <button
                                  key={p.name}
                                  onClick={() => {
                                    setEditVideoUrl(p.url);
                                    setEditVideoDuration(600);
                                    onShowNotification(`Preset "${p.name}" selected! Click Save to apply.`, 'success');
                                  }}
                                  className="px-2 py-1 bg-white/5 hover:bg-[#39FF14]/10 hover:text-[#39FF14] rounded text-[9px] font-mono text-slate-400 border border-white/10 hover:border-[#39FF14]/30 cursor-pointer transition-all"
                                >
                                  {p.name}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* ACTION BUTTON */}
                          <div className="border-t border-white/5 pt-3">
                            <button
                              onClick={handleSaveVideoDetails}
                              disabled={savingVideo}
                              className="w-full py-2 bg-[#39FF14] text-black text-xs font-mono font-bold rounded-xl uppercase tracking-wider hover:bg-opacity-95 disabled:bg-slate-700 disabled:text-slate-500 transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                            >
                              {savingVideo ? (
                                <>
                                  <RefreshCw className="animate-spin" size={13} />
                                  <span>Saving Curriculum...</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 size={13} />
                                  <span>Save Video Settings</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: CLOUD STORAGE & CLOUDINARY CDN INTEGRATION */}
          {activeTab === 'storage' && (
            <div className="space-y-4">
              {/* STATUS BANNER */}
              <div className="bg-slate-950 border border-[#39FF14]/30 rounded-2xl p-4 shadow-lg space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 rounded-2xl bg-[#39FF14]/10 border border-[#39FF14]/20 text-[#39FF14]">
                      <Cloud size={22} />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-xs font-mono font-bold text-white uppercase">Cloudinary Cloud Storage & Global CDN</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase ${
                          cloudinaryStatus.configured
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {cloudinaryStatus.configured ? '● CONNECTED & ACTIVE' : '○ NEEDS CONFIGURATION'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        High-speed cloud media delivery, automated video compression, dynamic thumbnails, and ultra-fast video streaming.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleTestCloudinary}
                      disabled={testingCloudinary}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-mono font-bold border border-white/10 flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 transition-all"
                    >
                      <RefreshCw size={12} className={testingCloudinary ? 'animate-spin text-[#39FF14]' : ''} />
                      <span>{testingCloudinary ? 'Pinging Cloud...' : 'Test Connection'}</span>
                    </button>
                  </div>
                </div>

                {/* INFO PILLS */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-[11px] font-mono">
                  <div className="bg-black/40 border border-white/5 p-2.5 rounded-xl">
                    <span className="text-[9px] text-slate-500 block uppercase">Active Cloud Name</span>
                    <span className="text-white font-bold truncate block">{cloudinaryStatus.cloudName || 'Not Connected'}</span>
                  </div>
                  <div className="bg-black/40 border border-white/5 p-2.5 rounded-xl">
                    <span className="text-[9px] text-slate-500 block uppercase">API Key</span>
                    <span className="text-slate-300 font-mono block">{cloudinaryStatus.apiKeyMasked || '••••••••'}</span>
                  </div>
                  <div className="bg-black/40 border border-white/5 p-2.5 rounded-xl">
                    <span className="text-[9px] text-slate-500 block uppercase">Storage Mode</span>
                    <span className="text-[#39FF14] font-bold block">
                      {cloudinaryStatus.configured ? 'Cloudinary CDN (Fast)' : 'Server Storage (Fallback)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* TWO COLUMN WORKSPACE: CONFIGURATION + DIRECT CLOUD UPLOADER */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                
                {/* LEFT: CLOUDINARY CREDENTIALS FORM */}
                <div className="lg:col-span-6 bg-slate-950 border border-white/10 rounded-2xl p-4 space-y-4 shadow-lg">
                  <div className="flex items-center space-x-2 pb-2 border-b border-white/5">
                    <Key size={16} className="text-[#39FF14]" />
                    <h4 className="text-xs font-mono font-bold text-white uppercase">Cloudinary API Credentials</h4>
                  </div>

                  <form onSubmit={handleSaveCloudinaryConfig} className="space-y-3">
                    {/* FAST PASTE CLOUDINARY_URL */}
                    <div className="p-3 bg-[#39FF14]/5 border border-[#39FF14]/20 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] text-[#39FF14] uppercase font-bold flex items-center space-x-1">
                          <Sparkles size={12} />
                          <span>Quick Paste: API Environment Variable / CLOUDINARY_URL</span>
                        </label>
                        <span className="text-[9px] text-slate-400 font-mono">1-Step Fast Auto-Fill</span>
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. CLOUDINARY_URL=cloudinary://123456:abcdef@mycloud"
                        value={cloudinaryUrlInput}
                        onChange={(e) => handleCloudinaryUrlChange(e.target.value)}
                        className="w-full px-3 py-2 bg-black border border-[#39FF14]/30 rounded-lg text-xs text-[#39FF14] placeholder:text-slate-600 focus:border-[#39FF14] outline-none font-mono"
                      />
                      <span className="text-[9px] text-slate-400 block">
                        Cloudinary ড্যাশবোর্ডের <strong>API Environment variable</strong> লিংক পেস্ট করলেই নিচের Cloud Name, API Key ও Secret স্বয়ংক্রিয়ভাবে আলাদা হয়ে যাবে।
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 my-2">
                      <div className="flex-1 h-px bg-white/10" />
                      <span className="text-[9px] font-mono text-slate-500 uppercase">OR Fill Fields Manually</span>
                      <div className="flex-1 h-px bg-white/10" />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                        1. Cloud Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. dxyz123ab or my-academy-cloud"
                        value={cloudNameInput}
                        onChange={(e) => setCloudNameInput(e.target.value)}
                        className="w-full px-3 py-2 bg-black border border-white/10 rounded-xl text-xs text-white focus:border-[#39FF14] outline-none font-mono"
                      />
                      <span className="text-[9px] text-slate-500 mt-1 block">Found on your Cloudinary Dashboard under Product Environment.</span>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                        2. API Key <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 845612345678912"
                        value={cloudApiKeyInput}
                        onChange={(e) => setCloudApiKeyInput(e.target.value)}
                        className="w-full px-3 py-2 bg-black border border-white/10 rounded-xl text-xs text-white focus:border-[#39FF14] outline-none font-mono"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] text-slate-400 uppercase font-bold">
                          3. API Secret <span className="text-red-400">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowCloudSecret(!showCloudSecret)}
                          className="text-[10px] text-slate-400 hover:text-white flex items-center space-x-1 cursor-pointer"
                        >
                          {showCloudSecret ? <EyeOff size={11} /> : <Eye size={11} />}
                          <span>{showCloudSecret ? 'Hide' : 'Show'}</span>
                        </button>
                      </div>
                      <input
                        type={showCloudSecret ? 'text' : 'password'}
                        placeholder="••••••••••••••••••••••••"
                        value={cloudApiSecretInput}
                        onChange={(e) => setCloudApiSecretInput(e.target.value)}
                        className="w-full px-3 py-2 bg-black border border-white/10 rounded-xl text-xs text-white focus:border-[#39FF14] outline-none font-mono"
                      />
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={savingCloudinary}
                        className="w-full py-2.5 bg-[#39FF14] hover:bg-[#32e011] text-black text-xs font-mono font-bold rounded-xl uppercase tracking-wider transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-md disabled:opacity-50"
                      >
                        {savingCloudinary ? (
                          <>
                            <RefreshCw size={13} className="animate-spin" />
                            <span>Connecting to Cloudinary...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={13} />
                            <span>Save & Connect Cloud Storage</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>

                  <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-1.5 text-[10px] text-slate-400">
                    <span className="text-white font-bold font-mono block">💡 HOW TO GET FREE CLOUDINARY KEYS:</span>
                    <ol className="list-decimal list-inside space-y-1 text-slate-400">
                      <li>Create or sign into your free account at <strong className="text-[#39FF14]">cloudinary.com</strong></li>
                      <li>Go to Dashboard &gt; copy your <strong className="text-white">Cloud Name</strong>, <strong className="text-white">API Key</strong> &amp; <strong className="text-white">API Secret</strong></li>
                      <li>Paste them above and hit <strong className="text-white">Save &amp; Connect</strong>!</li>
                    </ol>
                  </div>
                </div>

                {/* RIGHT: DIRECT CLOUD MEDIA UPLOADER */}
                <div className="lg:col-span-6 bg-slate-950 border border-white/10 rounded-2xl p-4 space-y-4 shadow-lg">
                  <div className="flex items-center justify-between pb-2 border-b border-white/5">
                    <div className="flex items-center space-x-2">
                      <Upload size={16} className="text-[#39FF14]" />
                      <h4 className="text-xs font-mono font-bold text-white uppercase">Direct Cloud Media Uploader</h4>
                    </div>
                    <span className="text-[9px] font-mono text-slate-500 uppercase">Videos • Images • Files</span>
                  </div>

                  <p className="text-[10px] text-slate-400">
                    Upload any video lesson, course thumbnail, or document directly to Cloudinary and instantly copy the global CDN link.
                  </p>

                  {/* DROPZONE */}
                  <div className="border-2 border-dashed border-[#39FF14]/30 rounded-2xl p-6 bg-black/40 text-center hover:border-[#39FF14] transition-all relative">
                    {directUploading ? (
                      <div className="space-y-3 py-4">
                        <RefreshCw className="animate-spin mx-auto text-[#39FF14]" size={28} />
                        <p className="text-xs text-white font-bold">Uploading media to Cloudinary CDN...</p>
                        <div className="w-full bg-slate-900 rounded-full h-2 max-w-[220px] mx-auto overflow-hidden">
                          <div 
                            className="bg-[#39FF14] h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${directUploadProgress}%` }}
                          ></div>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">{directUploadProgress}% complete</span>
                      </div>
                    ) : (
                      <div className="space-y-2.5 py-2">
                        <CloudLightning className="mx-auto text-[#39FF14]" size={32} />
                        <div>
                          <p className="text-xs text-white font-bold">
                            Drop video or media file here, or <span className="text-[#39FF14] underline cursor-pointer">browse</span>
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Auto-optimizes to MP4/HLS streaming with secure HTTPS CDN delivery
                          </p>
                        </div>
                        <input
                          type="file"
                          accept="video/*,image/*,application/pdf"
                          onChange={handleDirectAssetUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </div>
                    )}
                  </div>

                  {/* UPLOADED RESULT CARD */}
                  {uploadedAssetResult && (
                    <div className="p-3 bg-[#39FF14]/5 border border-[#39FF14]/20 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[#39FF14] font-bold uppercase font-mono flex items-center space-x-1">
                          <CheckCircle2 size={12} />
                          <span>UPLOAD SUCCESSFUL ({uploadedAssetResult.provider?.toUpperCase()})</span>
                        </span>
                        {uploadedAssetResult.duration && (
                          <span className="text-[9px] text-slate-400 font-mono">
                            Duration: {uploadedAssetResult.duration}s
                          </span>
                        )}
                      </div>

                      {/* URL DISPLAY & COPY */}
                      <div className="space-y-1">
                        <span className="text-[9px] text-slate-400 uppercase font-mono">Cloud CDN URL:</span>
                        <div className="flex items-center space-x-1.5">
                          <input
                            type="text"
                            readOnly
                            value={uploadedAssetResult.url}
                            className="flex-1 px-2.5 py-1.5 bg-black border border-white/10 rounded-lg text-xs text-[#39FF14] font-mono select-all outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleCopyAssetUrl(uploadedAssetResult.url)}
                            className="px-3 py-1.5 bg-white/10 hover:bg-[#39FF14] hover:text-black rounded-lg text-xs font-mono font-bold flex items-center space-x-1 cursor-pointer transition-all shrink-0"
                          >
                            {copiedAssetUrl ? <Check size={12} /> : <Copy size={12} />}
                            <span>{copiedAssetUrl ? 'Copied' : 'Copy URL'}</span>
                          </button>
                        </div>
                      </div>

                      {/* THUMBNAIL IF PRESENT */}
                      {uploadedAssetResult.thumbnailUrl && (
                        <div className="flex items-center space-x-3 pt-1 border-t border-white/5">
                          <img
                            src={uploadedAssetResult.thumbnailUrl}
                            alt="Auto poster"
                            className="w-16 h-10 object-cover rounded-lg border border-white/10"
                          />
                          <div className="text-[10px] text-slate-400">
                            <span className="text-white font-bold block">Generated Poster Frame</span>
                            <span>Auto-extracted 1.0s video snapshot</span>
                          </div>
                        </div>
                      )}

                      {/* SHORTCUT TO ASSIGN TO SELECTED LESSON */}
                      {selectedLesson && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditVideoUrl(uploadedAssetResult.url);
                            if (uploadedAssetResult.thumbnailUrl) {
                              setEditVideoThumbnail(uploadedAssetResult.thumbnailUrl);
                            }
                            if (uploadedAssetResult.duration) {
                              setEditVideoDuration(uploadedAssetResult.duration);
                            }
                            setActiveTab('curriculum');
                            onShowNotification(`Set CDN URL for lesson: "${selectedLesson.title}". Don't forget to click Save!`, 'success');
                          }}
                          className="w-full py-1.5 bg-white/10 hover:bg-[#39FF14] hover:text-black text-white text-[10px] font-mono font-bold rounded-lg uppercase tracking-wider transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                        >
                          <Film size={12} />
                          <span>Use this Video for Lesson: {selectedLesson.title}</span>
                        </button>
                      )}
                    </div>
                  )}

                </div>

              </div>
            </div>
          )}

          {/* XP STORE PERKS MANAGER TAB */}
          {activeTab === 'xp_store' && (
            <div className="space-y-4">
              {/* Section Sub-Navigation Tabs */}
              <div className="flex border-b border-white/10 bg-slate-900/80 rounded-2xl p-1.5 gap-1.5 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setXpStoreSection('vault_settings')}
                  className={`flex-1 min-w-[200px] py-2.5 px-4 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                    xpStoreSection === 'vault_settings'
                      ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                      : 'text-slate-400 hover:text-white bg-white/[0.02]'
                  }`}
                >
                  <Sparkles size={14} />
                  <span>⚡ REWARDS VAULT CONFIG (CONVERTER / SPINS / VOUCHERS / VIP)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setXpStoreSection('catalog_items')}
                  className={`flex-1 min-w-[200px] py-2.5 px-4 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                    xpStoreSection === 'catalog_items'
                      ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                      : 'text-slate-400 hover:text-white bg-white/[0.02]'
                  }`}
                >
                  <ShoppingBag size={14} />
                  <span>🛍️ XP STORE CATALOG ITEMS ({xpStoreItems.length})</span>
                </button>
              </div>

              {/* SECTION A: DYNAMIC GAMIFICATION & VAULT RULES */}
              {xpStoreSection === 'vault_settings' && (
                <AdminGamificationManager onShowNotification={onShowNotification} />
              )}

              {/* SECTION B: CATALOG STORE ITEMS */}
              {xpStoreSection === 'catalog_items' && (
                <div className="space-y-4">
                  {/* Header card with statistics & Add Item button */}
                  <div className="p-4 bg-slate-950 border border-amber-500/30 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-[0_0_30px_rgba(245,158,11,0.1)]">
                    <div>
                      <div className="flex items-center space-x-2">
                        <ShoppingBag size={18} className="text-amber-400" />
                        <h3 className="text-sm font-bold text-white font-mono uppercase">XP Store Perks & Access Control</h3>
                        <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-mono font-bold rounded-full">
                          LIVE MARKETPLACE SYNC
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Define purchasable items, XP pricing, granted access/perks, and eligibility for all students.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingStoreItemId(null);
                        setStoreItemName('');
                        setStoreItemCategory('lesson_access');
                        setStoreItemDescription('');
                        setStoreItemPerkGranted('');
                        setStoreItemCostXP(150);
                        setStoreItemIcon('🔓');
                        setStoreItemAvailability('active');
                        setStoreItemTargetScope('all');
                        setShowAddStoreItem(!showAddStoreItem);
                      }}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-mono font-bold rounded-xl uppercase tracking-wider transition-all flex items-center justify-center space-x-1.5 cursor-pointer shrink-0 shadow-lg"
                    >
                      <Plus size={14} />
                      <span>{showAddStoreItem ? 'Cancel Form' : 'Add Store Item'}</span>
                    </button>
                  </div>

              {/* ADD / EDIT ITEM FORM */}
              {showAddStoreItem && (
                <form onSubmit={handleSaveStoreItem} className="p-4 bg-black/60 border border-amber-500/40 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <h4 className="text-xs font-mono font-bold text-amber-400 uppercase flex items-center space-x-2">
                      <Sparkles size={14} />
                      <span>{editingStoreItemId ? 'Edit Store Item & Perk' : 'Create New XP Store Item'}</span>
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">Syncs immediately to student XP store</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Item Title / Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Single Lesson Access Pass 🔓"
                        value={storeItemName}
                        onChange={(e) => setStoreItemName(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Perk Category *</label>
                      <select
                        value={storeItemCategory}
                        onChange={(e) => setStoreItemCategory(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-amber-500"
                      >
                        <option value="lesson_access">🔓 Single Lesson / Course Video Unlock Pass</option>
                        <option value="frame">✨ Avatar Frame / Aura Halo</option>
                        <option value="title">🥷 Profile Badge Title</option>
                        <option value="shield">🛡️ Streak Protection Shield</option>
                        <option value="certificate_badge">🏅 3D Certificate Seal Access</option>
                        <option value="vip_pass">🏆 VIP Scholar Status Pass</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Price in XP (XP Cost) *</label>
                      <input
                        type="number"
                        required
                        min={1}
                        placeholder="150"
                        value={storeItemCostXP}
                        onChange={(e) => setStoreItemCostXP(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-[#39FF14] font-mono font-bold outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Icon / Emoji Symbol</label>
                      <input
                        type="text"
                        placeholder="🔓, ✨, 👑, 🥷, 🛡️, 🏆"
                        value={storeItemIcon}
                        onChange={(e) => setStoreItemIcon(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Granted Access / Specific Perk Description *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Grants instant video streaming access to 1 chosen lesson without full course purchase"
                        value={storeItemPerkGranted}
                        onChange={(e) => setStoreItemPerkGranted(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-cyan-300 font-mono outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Public Description for Store</label>
                      <textarea
                        rows={2}
                        placeholder="Detailed overview shown to students in the XP Store marketplace..."
                        value={storeItemDescription}
                        onChange={(e) => setStoreItemDescription(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Store Availability Status</label>
                      <select
                        value={storeItemAvailability}
                        onChange={(e) => setStoreItemAvailability(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-amber-500"
                      >
                        <option value="active">Active (Visible & Purchasable)</option>
                        <option value="inactive">Inactive (Hidden from Store)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Target Student Scope</label>
                      <select
                        value={storeItemTargetScope}
                        onChange={(e) => setStoreItemTargetScope(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-amber-500"
                      >
                        <option value="all">All Students (Free & Paid)</option>
                        <option value="free_tier">Free Tier Students Only</option>
                        <option value="pro_tier">Pro / Enrolled Students Only</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddStoreItem(false)}
                      className="px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-mono rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#39FF14] hover:bg-[#32e011] text-black text-xs font-mono font-bold rounded-xl uppercase tracking-wider cursor-pointer shadow-md"
                    >
                      {editingStoreItemId ? 'Update Store Item' : 'Publish to Store'}
                    </button>
                  </div>
                </form>
              )}

              {/* LIST OF STORE ITEMS */}
              <div className="space-y-2">
                {loadingStoreCatalog ? (
                  <div className="text-center py-8 text-slate-400 font-mono text-xs">
                    Loading XP store catalog from database...
                  </div>
                ) : xpStoreItems.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 font-mono text-xs border border-white/10 rounded-2xl bg-black/40">
                    No items in XP store. Click "Add Store Item" above to create one!
                  </div>
                ) : (
                  <>
                    {xpStoreItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-3.5 bg-slate-950 border border-white/10 hover:border-amber-500/30 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all"
                      >
                        <div className="flex items-start space-x-3">
                          <div className="w-10 h-10 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center text-xl shrink-0">
                            {item.icon || '✨'}
                          </div>

                          <div>
                            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                              <h4 className="text-xs font-bold text-white">{item.name}</h4>
                              <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[9px] font-mono font-bold uppercase rounded-full">
                                {item.category.replace('_', ' ')}
                              </span>
                              <span className="px-2 py-0.5 bg-[#39FF14]/10 border border-[#39FF14]/30 text-[#39FF14] text-[9px] font-mono font-bold rounded-full">
                                {item.costXP} XP
                              </span>
                              <span className={`px-2 py-0.5 border text-[9px] font-mono font-bold uppercase rounded-full ${
                                item.availability === 'inactive'
                                  ? 'bg-red-500/10 text-red-400 border-red-500/30'
                                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              }`}>
                                {item.availability || 'active'}
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-400 mt-1 max-w-xl">{item.description}</p>

                            {item.perkGranted && (
                              <div className="mt-1.5 inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono">
                                <Unlock size={10} />
                                <span>Granted Access / Perk: {item.perkGranted}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-1.5 shrink-0 self-end md:self-center">
                          <button
                            type="button"
                            onClick={() => handleToggleStoreItemStatus(item.id)}
                            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase cursor-pointer border transition-all ${
                              item.availability === 'inactive'
                                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                            }`}
                          >
                            {item.availability === 'inactive' ? 'Activate' : 'Hide'}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingStoreItemId(item.id);
                              setStoreItemName(item.name);
                              setStoreItemCategory(item.category);
                              setStoreItemDescription(item.description);
                              setStoreItemPerkGranted(item.perkGranted || '');
                              setStoreItemCostXP(item.costXP);
                              setStoreItemIcon(item.icon);
                              setStoreItemAvailability(item.availability || 'active');
                              setStoreItemTargetScope(item.targetScope || 'all');
                              setShowAddStoreItem(true);
                            }}
                            className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg cursor-pointer"
                            title="Edit Store Item"
                          >
                            <Edit3 size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteStoreItem(item.id)}
                            className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg cursor-pointer"
                            title="Delete Store Item"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
                </div>
              </div>
            )}
          </div>
        )}

          {/* TAB: STUDY FEATURES MANAGER */}
          {activeTab === 'studyFeatures' && (
            <div className="space-y-6">
              <div className="p-4 bg-slate-950 border border-[#39FF14]/30 rounded-2xl">
                <h3 className="text-sm font-bold text-white font-mono uppercase mb-4 flex items-center space-x-2">
                  <Sparkles size={18} className="text-[#39FF14]" />
                  <span>Feature Master Toggles</span>
                </h3>
                <div className="space-y-3">
                  {['studyRooms', 'aiFlashcards', 'mentorship', 'offlineAccess'].map((feature) => (
                    <div key={feature} className="flex justify-between items-center p-3 bg-slate-900 rounded-lg">
                      <span className="text-xs text-slate-400 capitalize">{feature.replace(/([A-Z])/g, ' $1')}</span>
                      <button 
                        onClick={() => studyFeatureService.updateStudyFeatureStatus(feature, true)}
                        className="px-3 py-1 bg-[#39FF14]/20 text-[#39FF14] text-[10px] rounded hover:bg-[#39FF14]/30"
                      >
                        TOGGLE
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4 bg-slate-950 border border-white/10 rounded-2xl">
                <StudyRoomManager />
              </div>
            </div>
          )}

          {/* TAB: LIVE CLASSES MANAGEMENT */}
          {activeTab === 'live_classes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-black/40 p-3.5 border border-white/10 rounded-2xl">
                <div>
                  <h3 className="text-xs font-bold text-white font-mono uppercase flex items-center space-x-2">
                    <Tv size={16} className="text-[#39FF14]" />
                    <span>Live Academic Classes Roster</span>
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Schedule, publish live stream links, and manage student lectures in real-time
                  </p>
                </div>

                <button
                  onClick={() => {
                    setEditingLiveClassId(null);
                    setLiveClassTitle('');
                    setLiveClassDescription('');
                    setShowAddLiveClassForm(!showAddLiveClassForm);
                  }}
                  className="px-3 py-1.5 bg-[#39FF14] hover:bg-[#32e011] text-black text-xs font-mono font-bold rounded-xl flex items-center space-x-1 cursor-pointer shadow-md transition-all"
                >
                  <Plus size={14} />
                  <span>{showAddLiveClassForm ? 'Close Form' : 'Schedule Live Class'}</span>
                </button>
              </div>

              {/* FORM TO ADD OR EDIT LIVE CLASS */}
              {showAddLiveClassForm && (
                <form onSubmit={handleSaveLiveClass} className="p-4 bg-slate-950 border border-[#39FF14]/30 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <h4 className="text-xs font-bold text-[#39FF14] font-mono uppercase">
                      {editingLiveClassId ? 'Edit Scheduled Live Class' : 'Schedule New Live Class Session'}
                    </h4>
                    <span className="text-[9px] font-mono text-slate-400">INSTANT STUDENT PANEL SYNC</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Class Title *</label>
                      <input
                        type="text"
                        required
                        value={liveClassTitle}
                        onChange={(e) => setLiveClassTitle(e.target.value)}
                        placeholder="e.g. 🔴 Masterclass: Advanced Full-Stack Architecture"
                        className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-[#39FF14]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Subject / Category</label>
                      <input
                        type="text"
                        value={liveClassSubject}
                        onChange={(e) => setLiveClassSubject(e.target.value)}
                        placeholder="e.g. Backend Engineering"
                        className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-[#39FF14]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Instructor Name</label>
                      <input
                        type="text"
                        value={liveClassInstructor}
                        onChange={(e) => setLiveClassInstructor(e.target.value)}
                        placeholder="e.g. Engr. Jamil Ahmed"
                        className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-[#39FF14]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Instructor Photo URL (Optional)</label>
                      <input
                        type="url"
                        value={liveClassInstructorPhoto}
                        onChange={(e) => setLiveClassInstructorPhoto(e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-[#39FF14]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Start Date & Time *</label>
                      <input
                        type="datetime-local"
                        required
                        value={liveClassStartTime}
                        onChange={(e) => setLiveClassStartTime(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-[#39FF14]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Duration (Minutes)</label>
                      <input
                        type="number"
                        min="15"
                        max="300"
                        value={liveClassDuration}
                        onChange={(e) => setLiveClassDuration(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-[#39FF14]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Live Class Status *</label>
                      <select
                        value={liveClassStatus}
                        onChange={(e) => setLiveClassStatus(e.target.value as LiveClassStatus)}
                        className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-[#39FF14]"
                      >
                        <option value="upcoming">Upcoming (Scheduled)</option>
                        <option value="live">🔴 LIVE NOW (Broadcasting)</option>
                        <option value="completed">Completed (Archived Stream)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Target Course ID</label>
                      <select
                        value={liveClassCourseId}
                        onChange={(e) => setLiveClassCourseId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-[#39FF14]"
                      >
                        <option value="course-web-dev">Web Development Specialization</option>
                        <option value="course-app-dev">App Engineering Track</option>
                        <option value="course-cyber">Cybersecurity & Cloud Security</option>
                        <option value="course-ielts">IELTS Academic Preparation</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Stream / Meeting Video URL *</label>
                    <input
                      type="text"
                      required
                      value={liveClassStreamUrl}
                      onChange={(e) => setLiveClassStreamUrl(e.target.value)}
                      placeholder="e.g. HLS Stream URL, YouTube Live, or mp4 link"
                      className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-[#39FF14]"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Recording URL (For completed classes)</label>
                      <input
                        type="text"
                        value={liveClassRecordingUrl}
                        onChange={(e) => setLiveClassRecordingUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-[#39FF14]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Class Notes / Handout PDF URL</label>
                      <input
                        type="text"
                        value={liveClassNotesUrl}
                        onChange={(e) => setLiveClassNotesUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-[#39FF14]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Class Description & Agenda</label>
                    <textarea
                      rows={2}
                      value={liveClassDescription}
                      onChange={(e) => setLiveClassDescription(e.target.value)}
                      placeholder="Brief breakdown of lecture topics and live coding demonstrations..."
                      className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-[#39FF14]"
                    ></textarea>
                  </div>

                  <div className="flex justify-end space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddLiveClassForm(false)}
                      className="px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-mono rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingLiveClass}
                      className="px-4 py-2 bg-[#39FF14] hover:bg-[#32e011] text-black text-xs font-mono font-bold rounded-xl uppercase tracking-wider cursor-pointer shadow-md flex items-center space-x-1"
                    >
                      <span>{savingLiveClass ? 'Publishing...' : editingLiveClassId ? 'Update Live Class' : 'Publish Live Class'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* LIVE CLASSES LIST */}
              <div className="space-y-2">
                {loadingLiveClasses ? (
                  <div className="text-center py-8 text-slate-400 font-mono text-xs">
                    Loading live class schedule from database...
                  </div>
                ) : liveClassesList.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 font-mono text-xs border border-white/10 rounded-2xl bg-black/40">
                    No live classes scheduled yet. Click "Schedule Live Class" above to publish one!
                  </div>
                ) : (
                  liveClassesList.map((cls) => (
                    <div
                      key={cls.classId}
                      className="p-3.5 bg-slate-950 border border-white/10 hover:border-[#39FF14]/30 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center text-xl shrink-0">
                          <Tv size={20} className={cls.status === 'live' ? 'text-red-400 animate-pulse' : 'text-[#39FF14]'} />
                        </div>

                        <div>
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <h4 className="text-xs font-bold text-white">{cls.title}</h4>

                            <span className={`px-2 py-0.5 border text-[9px] font-mono font-bold uppercase rounded-full ${
                              cls.status === 'live'
                                ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
                                : cls.status === 'upcoming'
                                ? 'bg-[#39FF14]/10 text-[#39FF14] border-[#39FF14]/30'
                                : 'bg-slate-800 text-slate-400 border-white/10'
                            }`}>
                              {cls.status === 'live' ? '🔴 LIVE NOW' : cls.status}
                            </span>

                            <span className="px-2 py-0.5 bg-white/5 border border-white/10 text-slate-300 text-[9px] font-mono rounded-full">
                              {cls.subject}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-400 mt-1 max-w-xl line-clamp-1">{cls.description}</p>

                          <div className="flex items-center space-x-3 mt-1.5 text-[10px] text-slate-400 font-mono flex-wrap">
                            <span>Instructor: {cls.instructor}</span>
                            <span>Duration: {cls.duration}m</span>
                            <span>
                              Start: {new Date(cls.startTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5 shrink-0 self-end md:self-center">
                        {/* Quick status switches */}
                        <button
                          type="button"
                          onClick={() => handleQuickLiveStatus(cls, cls.status === 'live' ? 'completed' : 'live')}
                          className={`px-2.5 py-1.5 rounded-lg text-[9px] font-mono font-bold uppercase cursor-pointer border transition-all ${
                            cls.status === 'live'
                              ? 'bg-slate-800 text-slate-300 border-white/10 hover:bg-slate-700'
                              : 'bg-red-500/20 text-red-400 border-red-500/40 hover:bg-red-500/30'
                          }`}
                        >
                          {cls.status === 'live' ? 'End Class' : 'Set LIVE'}
                        </button>

                        {/* Send Class Reminder Button */}
                        <button
                          type="button"
                          onClick={() => {
                            const choice = confirm(
                              `Send Live Class Reminder for "${cls.title}"?\n\n` +
                              `• Click OK to broadcast to ALL STUDENTS.\n` +
                              `• Click CANCEL to enter a specific student email / ID.`
                            );
                            if (choice) {
                              handleSendClassReminder(cls, 'all');
                            } else {
                              const email = prompt("Enter student email or User ID:");
                              if (email && email.trim()) {
                                handleSendClassReminder(cls, 'user', email.trim());
                              }
                            }
                          }}
                          className="px-2.5 py-1.5 bg-[#39FF14]/10 hover:bg-[#39FF14]/20 border border-[#39FF14]/30 text-[#39FF14] rounded-lg cursor-pointer flex items-center space-x-1"
                          title="Send Class Reminder Notification to All or Targeted Student"
                        >
                          <Bell size={12} />
                          <span className="text-[9px] font-mono font-bold uppercase">Remind</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingLiveClassId(cls.classId);
                            setLiveClassTitle(cls.title);
                            setLiveClassSubject(cls.subject || 'Backend Engineering');
                            setLiveClassInstructor(cls.instructor || 'Engr. Jamil Ahmed');
                            setLiveClassInstructorPhoto(cls.instructorPhoto || '');
                            setLiveClassCourseId(cls.courseId || 'course-web-dev');
                            setLiveClassDuration(cls.duration || 60);
                            setLiveClassStatus(cls.status);
                            setLiveClassStreamUrl(cls.streamUrl || '');
                            setLiveClassRecordingUrl(cls.recordingUrl || '');
                            setLiveClassNotesUrl(cls.notesUrl || '');
                            setLiveClassDescription(cls.description || '');
                            setLiveClassRequirements(cls.requirements?.join(', ') || '');
                            if (cls.startTime) {
                              setLiveClassStartTime(new Date(cls.startTime).toISOString().slice(0, 16));
                            }
                            setShowAddLiveClassForm(true);
                          }}
                          className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg cursor-pointer"
                          title="Edit Class"
                        >
                          <Edit3 size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteLiveClass(cls.classId)}
                          className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg cursor-pointer"
                          title="Delete Class"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB: SUPPORT TICKETS DESK */}
          {activeTab === 'support' && (
            <div className="space-y-4">
              {/* Header Stats Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-950 border border-white/10 rounded-2xl">
                <div>
                  <h3 className="text-xs font-bold text-white font-mono uppercase flex items-center space-x-2">
                    <Headset size={16} className="text-[#39FF14]" />
                    <span>Support Desk Central Console</span>
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-sans">
                    Real-time student inquiry management connected directly to Firestore <code className="text-[#39FF14]">support_tickets</code>
                  </p>
                </div>

                <div className="flex items-center space-x-2 font-mono text-[10px]">
                  <button
                    onClick={() => setSupportFilter('all')}
                    className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                      supportFilter === 'all'
                        ? 'bg-[#39FF14]/20 border-[#39FF14] text-[#39FF14] font-bold'
                        : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    ALL ({supportTickets.length})
                  </button>
                  <button
                    onClick={() => setSupportFilter('open')}
                    className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                      supportFilter === 'open'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold'
                        : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    OPEN ({supportTickets.filter(t => t.status === 'open').length})
                  </button>
                  <button
                    onClick={() => setSupportFilter('closed')}
                    className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                      supportFilter === 'closed'
                        ? 'bg-slate-800 border-white/10 text-slate-300 font-bold'
                        : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    RESOLVED ({supportTickets.filter(t => t.status === 'closed').length})
                  </button>
                </div>
              </div>

              {/* Tickets Layout Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                
                {/* Left Column: Tickets Queue */}
                <div className="lg:col-span-5 space-y-2 max-h-[550px] overflow-y-auto pr-1 scrollbar-thin">
                  {loadingSupportTickets ? (
                    <div className="text-center py-12 text-slate-400 font-mono text-xs">
                      Syncing real-time tickets queue...
                    </div>
                  ) : supportTickets.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 font-mono text-xs border border-white/10 rounded-2xl bg-black/40">
                      No support tickets recorded in Firestore.
                    </div>
                  ) : (
                    supportTickets
                      .filter(t => supportFilter === 'all' ? true : t.status === supportFilter)
                      .map((ticket) => {
                        const isSelected = selectedSupportTicketId === ticket.id;
                        
                        return (
                          <div
                            key={ticket.id}
                            onClick={() => setSelectedSupportTicketId(ticket.id)}
                            className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#39FF14]/10 border-[#39FF14] text-white shadow-lg'
                                : 'bg-slate-950 border-white/10 hover:border-white/20 text-slate-300'
                            }`}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <span className="text-xs font-bold line-clamp-1">{ticket.subject}</span>
                              <span className={`px-2 py-0.5 text-[8px] font-mono font-bold uppercase rounded-full border shrink-0 ${
                                ticket.status === 'open'
                                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                  : 'bg-slate-800 text-slate-400 border-white/10'
                              }`}>
                                {ticket.status}
                              </span>
                            </div>

                            <p className="text-[10px] text-slate-400 mt-1 line-clamp-1 font-sans">
                              {ticket.message}
                            </p>

                            <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 mt-2 pt-1.5 border-t border-white/5">
                              <span className="truncate max-w-[140px] text-slate-400">
                                Student: {ticket.userEmail || ticket.userId.slice(0, 8)}
                              </span>
                              <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>

                {/* Right Column: Selected Ticket Thread & Admin Reply Action */}
                <div className="lg:col-span-7">
                  {selectedSupportTicketId ? (
                    (() => {
                      const activeTicket = supportTickets.find(t => t.id === selectedSupportTicketId);
                      if (!activeTicket) return null;

                      return (
                        <div className="p-4 bg-slate-950 border border-white/10 rounded-2xl space-y-4">
                          <div className="flex justify-between items-center pb-2 border-b border-white/10">
                            <div>
                              <h4 className="text-xs font-mono font-bold text-[#39FF14] uppercase">
                                Ticket #{activeTicket.id.slice(0, 8)}
                              </h4>
                              <p className="text-[10px] text-slate-400 font-mono">
                                Student ID: <span className="text-slate-200">{activeTicket.userId}</span> {activeTicket.userEmail && `(${activeTicket.userEmail})`}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleToggleAdminTicketStatus(activeTicket.id, activeTicket.status)}
                              className={`px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold border cursor-pointer transition-all ${
                                activeTicket.status === 'open'
                                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-white/10'
                                  : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border-emerald-500/40'
                              }`}
                            >
                              {activeTicket.status === 'open' ? 'Mark Resolved / Close' : 'Re-open Ticket'}
                            </button>
                          </div>

                          <div>
                            <h3 className="text-sm font-bold text-white mb-1">{activeTicket.subject}</h3>
                            <div className="flex items-center space-x-2 text-[9px] font-mono text-slate-400">
                              <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded">
                                Priority: {activeTicket.priority.toUpperCase()}
                              </span>
                              <span>Created: {new Date(activeTicket.createdAt).toLocaleString()}</span>
                            </div>
                          </div>

                          {/* Thread list */}
                          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                            {/* Original Message */}
                            <div className="p-3 bg-slate-900 border border-white/10 rounded-xl space-y-1">
                              <div className="flex justify-between text-[9px] font-mono text-[#39FF14] font-bold">
                                <span>STUDENT INQUIRY</span>
                                <span className="text-slate-400">{new Date(activeTicket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <p className="text-xs text-slate-200 whitespace-pre-wrap font-sans">
                                {activeTicket.message}
                              </p>
                            </div>

                            {/* Replies */}
                            {activeTicket.replies && activeTicket.replies.map((reply: any, rIdx: number) => {
                              const isAdmin = Boolean(reply.adminId);
                              return (
                                <div
                                  key={rIdx}
                                  className={`p-3 rounded-xl space-y-1 ${
                                    isAdmin
                                      ? 'bg-purple-950/60 border border-purple-500/30 ml-4'
                                      : 'bg-slate-900 border border-white/10 mr-4'
                                  }`}
                                >
                                  <div className="flex justify-between text-[9px] font-mono font-bold">
                                    <span className={isAdmin ? 'text-purple-300' : 'text-[#39FF14]'}>
                                      {isAdmin ? '🛡️ ADMIN SUPPORT RESPONSE' : 'STUDENT REPLIED'}
                                    </span>
                                    <span className="text-slate-400">{new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                  <p className="text-xs text-slate-100 whitespace-pre-wrap font-sans">
                                    {reply.message}
                                  </p>
                                </div>
                              );
                            })}
                          </div>

                          {/* Admin Reply Form */}
                          <div className="pt-2 border-t border-white/10 space-y-2">
                            <label className="text-[10px] font-mono text-slate-400 uppercase font-bold block">
                              Send Admin Response to Student:
                            </label>
                            <div className="flex gap-2">
                              <textarea
                                rows={2}
                                value={adminReplyText}
                                onChange={(e) => setAdminReplyText(e.target.value)}
                                placeholder="Type official support response..."
                                className="flex-1 bg-slate-900 border border-white/10 focus:border-[#39FF14] rounded-xl p-2.5 text-xs text-white placeholder-slate-500 outline-none resize-none font-sans"
                              />
                              <button
                                type="button"
                                onClick={() => handleSendAdminReply(activeTicket.id)}
                                disabled={sendingAdminReply || !adminReplyText.trim()}
                                className="px-4 py-2 bg-[#39FF14] hover:bg-[#32e011] text-black font-mono font-bold text-xs rounded-xl cursor-pointer disabled:opacity-40 flex items-center justify-center shrink-0 space-x-1"
                              >
                                <Send size={14} className={sendingAdminReply ? 'animate-bounce' : ''} />
                                <span>{sendingAdminReply ? 'Sending...' : 'Reply'}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="h-full min-h-[300px] border border-white/10 rounded-2xl bg-black/40 flex flex-col items-center justify-center p-6 text-center text-slate-500 space-y-2">
                      <Headset size={32} className="text-slate-600" />
                      <p className="text-xs font-mono">Select a ticket from the left queue to view thread & reply.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* MY REFUND REQUESTS SECTION */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-white/10 space-y-3 font-mono">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center space-x-2">
                    <RotateCcw size={16} className="text-amber-400" />
                    <h3 className="text-xs font-bold text-white uppercase">My Refund Requests</h3>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    UID: <code className="text-amber-400">{auth.currentUser?.uid || 'N/A'}</code>
                  </span>
                </div>

                {loadingRefundRequests ? (
                  <div className="text-center py-6 text-slate-400 text-xs">Fetching my refund applications...</div>
                ) : refundRequestsList.filter(r => r.userId === auth.currentUser?.uid).length === 0 ? (
                  <div className="p-6 text-center bg-white/[0.01] border border-white/5 rounded-2xl text-xs text-slate-400">
                    No personal refund requests found matching user ID ({auth.currentUser?.uid || 'guest'}).
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {refundRequestsList
                      .filter(r => r.userId === auth.currentUser?.uid)
                      .map((req) => (
                        <div key={req.id} className={`p-3.5 rounded-2xl border text-xs space-y-2 ${
                          req.status === 'pending'
                            ? 'bg-slate-900 border-amber-500/40'
                            : req.status === 'approved'
                            ? 'bg-slate-900 border-emerald-500/30'
                            : 'bg-slate-900 border-rose-500/30'
                        }`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-white font-bold block">{req.courseTitle || 'Course Purchase'}</span>
                              <span className="text-[10px] text-slate-400 font-mono">Payout: {req.bkashNumber || 'N/A'}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-bold text-amber-400 block">৳{req.amount}</span>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                req.status === 'approved'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : req.status === 'rejected'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                              }`}>
                                {req.status}
                              </span>
                            </div>
                          </div>

                          <div className="text-[10px] text-slate-300 bg-white/[0.02] p-2 rounded-xl border border-white/5">
                            <span className="text-slate-500 block uppercase">Reason:</span>
                            <span>{req.reason}</span>
                          </div>

                          {req.adminNote && (
                            <div className="text-[10px] p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-300">
                              <span className="text-emerald-400 font-bold block uppercase">Admin Response:</span>
                              <span>{req.adminNote}</span>
                            </div>
                          )}

                          <div className="flex justify-between items-center text-[9px] text-slate-500 pt-1 border-t border-white/5">
                            <span>Submitted: {new Date(req.createdAt).toLocaleString()}</span>
                            <span>Updated: {req.resolvedAt ? new Date(req.resolvedAt).toLocaleString() : new Date(req.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Header Title Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-950 border border-white/10 rounded-2xl">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                    <SettingsIcon size={22} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white font-mono uppercase flex items-center space-x-2">
                      <span>System Configuration & Platform Settings</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                      Manage real-time platform maintenance, student access restrictions, and global settings.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 text-[10px] font-mono font-bold uppercase rounded-full border flex items-center space-x-1.5 ${
                    maintenanceEnabled
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${maintenanceEnabled ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
                    <span>{maintenanceEnabled ? '⚠️ MAINTENANCE MODE ACTIVE' : '⚡ PLATFORM OPERATIONAL'}</span>
                  </span>
                </div>
              </div>

              {/* MAINTENANCE MODE MASTER CARD */}
              <div className={`p-5 rounded-2xl border transition-all duration-300 ${
                maintenanceEnabled 
                  ? 'bg-amber-950/20 border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.15)]' 
                  : 'bg-slate-950 border-white/10'
              }`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
                  <div className="flex items-start space-x-3.5">
                    <div className={`p-3 rounded-2xl border shrink-0 ${
                      maintenanceEnabled
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 animate-pulse'
                        : 'bg-white/5 border-white/10 text-slate-400'
                    }`}>
                      <Wrench size={26} />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-base font-black text-white font-mono">
                          MAINTENANCE MODE (রক্ষণাবেক্ষণ মোড)
                        </h4>
                        {maintenanceEnabled && (
                          <span className="px-2 py-0.5 rounded bg-red-500/20 border border-red-500/30 text-red-400 text-[9px] font-mono font-bold">
                            STUDENT PANEL LOCKED
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 font-sans leading-relaxed">
                        {maintenanceEnabled ? (
                          <span className="text-amber-200">
                            সক্রিয় রয়েছে: সাধারণ শিক্ষার্থীদের প্রবেশাধিকার তাৎক্ষণিকভাবে ব্লক করা হয়েছে এবং তাদের স্ক্রিনে রিয়েল-টাইমে রক্ষণাবেক্ষণ নোটিশ প্রদর্শিত হচ্ছে। শুধুমাত্র Admin এবং Super Admin প্রবেশ করতে পারবেন।
                          </span>
                        ) : (
                          <span>
                            নিষ্ক্রিয় রয়েছে: সকল শিক্ষার্থী ও ব্যবহারকারী স্বাভাবিকভাবে প্ল্যাটফর্মে প্রবেশ ও কোর্স ব্রাউজ করতে পারছেন।
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* MASTER TOGGLE BUTTON */}
                  <div className="flex items-center space-x-3 shrink-0">
                    <button
                      type="button"
                      disabled={savingSettings}
                      onClick={() => handleSaveMaintenanceSettings(!maintenanceEnabled)}
                      className={`px-5 py-3 rounded-2xl font-mono text-xs font-black uppercase tracking-wider flex items-center space-x-2 cursor-pointer transition-all duration-200 shadow-lg ${
                        maintenanceEnabled
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20'
                          : 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20'
                      }`}
                    >
                      <Power size={16} className={savingSettings ? 'animate-spin' : ''} />
                      <span>
                        {savingSettings 
                          ? 'Updating...' 
                          : maintenanceEnabled 
                            ? 'DISABLE & RESTORE APP' 
                            : 'ENABLE MAINTENANCE MODE'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* MAINTENANCE CONFIGURATION FORM */}
                <div className="pt-4 space-y-4">
                  <h5 className="text-xs font-mono font-bold text-slate-300 uppercase flex items-center space-x-2">
                    <Sliders size={14} className="text-[#39FF14]" />
                    <span>Maintenance Screen Notice Settings</span>
                  </h5>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Notice Title */}
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase font-bold mb-1.5">
                        Notice Headline / Title (ব্যানার শিরোনাম) *
                      </label>
                      <input
                        type="text"
                        value={maintenanceTitleInput}
                        onChange={(e) => setMaintenanceTitleInput(e.target.value)}
                        placeholder="e.g. সিস্টেম রক্ষণাবেক্ষণ চলছে / System Maintenance In Progress"
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-white/10 focus:border-amber-500 rounded-xl text-xs text-white outline-none transition-all"
                      />
                    </div>

                    {/* Estimated Duration */}
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase font-bold mb-1.5">
                        Estimated Return Time (আনুমানিক সময়সীমা) *
                      </label>
                      <input
                        type="text"
                        value={maintenanceEstimatedTimeInput}
                        onChange={(e) => setMaintenanceEstimatedTimeInput(e.target.value)}
                        placeholder="e.g. ৩০-৪৫ মিনিট (Within 30-45 minutes)"
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-white/10 focus:border-amber-500 rounded-xl text-xs text-amber-300 font-mono outline-none transition-all"
                      />
                    </div>

                    {/* Detailed Message Textarea */}
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-mono text-slate-400 uppercase font-bold mb-1.5">
                        Detailed Explanation Message for Students (বিস্তারিত বার্তা) *
                      </label>
                      <textarea
                        rows={3}
                        value={maintenanceMessageInput}
                        onChange={(e) => setMaintenanceMessageInput(e.target.value)}
                        placeholder="আমাদের প্ল্যাটফর্মে প্রয়োজনীয় সিস্টেম আপগ্রেড ও রক্ষণাবেক্ষণ কার্যক্রম চলছে..."
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-white/10 focus:border-amber-500 rounded-xl text-xs text-slate-200 outline-none resize-none leading-relaxed transition-all font-sans"
                      />
                    </div>
                  </div>

                  {/* Save Configuration Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5">
                    <div className="text-[11px] font-mono text-slate-400 flex items-center space-x-2">
                      <ShieldCheck size={14} className="text-[#39FF14]" />
                      <span>Admins & Super Admins automatically bypass maintenance locks.</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          setMaintenanceTitleInput(DEFAULT_SYSTEM_SETTINGS.maintenanceTitle || '');
                          setMaintenanceMessageInput(DEFAULT_SYSTEM_SETTINGS.maintenanceMessage || '');
                          setMaintenanceEstimatedTimeInput(DEFAULT_SYSTEM_SETTINGS.estimatedEndTime || '');
                        }}
                        className="px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-400 text-xs font-mono rounded-xl cursor-pointer"
                      >
                        Reset Template
                      </button>

                      <button
                        type="button"
                        disabled={savingSettings}
                        onClick={() => handleSaveMaintenanceSettings()}
                        className="px-5 py-2 bg-[#39FF14] hover:bg-[#32e011] text-black text-xs font-mono font-bold rounded-xl cursor-pointer shadow-md flex items-center space-x-1.5 disabled:opacity-40"
                      >
                        <Check size={14} />
                        <span>{savingSettings ? 'Saving...' : 'Save Settings Live'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* SYSTEM INFORMATION & RULES CARD */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
                <h4 className="text-xs font-bold text-white font-mono uppercase flex items-center space-x-2">
                  <ShieldAlert size={14} className="text-[#39FF14]" />
                  <span>Platform Security & Bypass Rules</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] text-slate-300 font-sans">
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 space-y-1">
                    <div className="font-mono font-bold text-[#39FF14] text-[10px]">🟢 REAL-TIME STUDENT BLOCK</div>
                    <p className="text-slate-400">
                      When Maintenance Mode is turned ON, active student sessions immediately transition to the maintenance screen in real-time via Firestore listeners.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 space-y-1">
                    <div className="font-mono font-bold text-purple-400 text-[10px]">👑 ADMIN EXCLUSION</div>
                    <p className="text-slate-400">
                      Users with roles <code className="text-purple-300">admin</code>, <code className="text-purple-300">super_admin</code> or authorized administrator credentials retain full system privileges.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-white/10 bg-black/40 text-center font-mono text-[9px] text-slate-500">
          NEXUS ADMIN CORE • ADMIN ENROLLMENT SYSTEM ENFORCED
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
