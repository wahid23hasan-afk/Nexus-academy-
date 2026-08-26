import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Minimize2, 
  Settings, 
  Sparkles,
  AlertCircle,
  RefreshCw,
  Tv,
  ExternalLink,
  Check,
  X,
  ChevronDown,
  Sliders,
  FastForward,
  Rewind
} from 'lucide-react';

interface SmartVideoPlayerProps {
  videoUrl?: string;
  thumbnailUrl?: string;
  title?: string;
  autoPlay?: boolean;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onLoadedMetadata?: (duration: number) => void;
  className?: string;
  initialTime?: number;
}

// Available Video Resolution Options (Scrollable)
const QUALITY_OPTIONS = [
  { id: 'auto', label: 'Auto (1080p)', resolution: 'Adaptive', sub: 'Best adaptive stream for connection', tag: 'AUTO' },
  { id: '4k', label: '4K Ultra HD (2160p)', resolution: '3840x2160', sub: 'Ultra High Definition (Maximum bitrate)', tag: '4K UHD' },
  { id: '2k', label: '2K Quad HD (1440p)', resolution: '2560x1440', sub: 'Quad High Definition (Crystal clear)', tag: '2K QHD' },
  { id: '1080p', label: '1080p Full HD', resolution: '1920x1080', sub: 'Full High Definition 60fps', tag: '1080p' },
  { id: '720p', label: '720p HD', resolution: '1280x720', sub: 'Standard HD (Smooth streaming)', tag: '720p' },
  { id: '480p', label: '480p SD', resolution: '854x480', sub: 'Medium quality standard definition', tag: '480p' },
  { id: '360p', label: '360p Low', resolution: '640x360', sub: 'Data saver for mobile networks', tag: '360p' },
  { id: '240p', label: '240p Eco', resolution: '426x240', sub: 'Ultra low bandwidth usage', tag: '240p' },
  { id: '144p', label: '144p Minimal', resolution: '256x144', sub: 'Minimal data saver (Audio focus)', tag: '144p' }
];

// Helper to transform video URL for different quality settings
const getQualityTransformedUrl = (rawUrl: string, qualityId: string): string => {
  if (!rawUrl) return rawUrl;
  
  // 1. Cloudinary Video URL Transformation
  if (rawUrl.includes('cloudinary.com') || rawUrl.includes('res.cloudinary.com')) {
    const qualityMap: Record<string, string> = {
      '4k': 'w_3840,h_2160,c_limit,q_auto:best',
      '2k': 'w_2560,h_1440,c_limit,q_auto:best',
      '1080p': 'w_1920,h_1080,c_limit,q_auto:good',
      '720p': 'w_1280,h_720,c_limit,q_auto:good',
      '480p': 'w_854,h_480,c_limit,q_auto:eco',
      '360p': 'w_640,h_360,c_limit,q_auto:low',
      '240p': 'w_426,h_240,c_limit,q_auto:low',
      '144p': 'w_256,h_144,c_limit,q_auto:low',
      'auto': 'q_auto,f_auto'
    };
    
    const transform = qualityMap[qualityId] || 'q_auto';
    
    if (rawUrl.includes('/video/upload/')) {
      return rawUrl.replace(/\/video\/upload\/([^/]+\/)?/, `/video/upload/${transform}/`);
    } else if (rawUrl.includes('/upload/')) {
      return rawUrl.replace(/\/upload\/([^/]+\/)?/, `/upload/${transform}/`);
    }
  }

  return rawUrl;
};

// Fallback high-speed CDN video stream (Google Cloud CDN bucket)
const DEFAULT_FALLBACK_VIDEO = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

// Process Dropbox, Google Drive, and direct stream links
const processUrl = (rawUrl?: string): string => {
  if (!rawUrl) return DEFAULT_FALLBACK_VIDEO;
  let trimmed = rawUrl.trim();
  const lower = trimmed.toLowerCase();

  if (
    lower.startsWith('firestore:') ||
    lower.startsWith('vid_') ||
    (lower.startsWith('v_') && !lower.includes('.') && !lower.includes('/')) ||
    lower === 'cloudinary_url' ||
    lower === 'undefined' ||
    lower === 'null' ||
    lower === 'none' ||
    lower === 'n/a' ||
    lower === 'false' ||
    lower === '0'
  ) {
    return DEFAULT_FALLBACK_VIDEO;
  }

  if (trimmed.includes('dropbox.com')) {
    trimmed = trimmed.replace('dl=0', 'dl=1').replace('www.dropbox.com', 'dl.dropboxusercontent.com');
  }
  // Ensure relative /uploads or /api or / paths resolve correctly against the active server origin
  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('/api/') || (trimmed.startsWith('/') && !trimmed.startsWith('//'))) {
    try {
      return `${window.location.origin}${trimmed}`;
    } catch (e) {
      return trimmed;
    }
  }

  // If not a recognized URL scheme or path, fallback safely
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('/') && !trimmed.startsWith('blob:') && !trimmed.startsWith('data:')) {
    return DEFAULT_FALLBACK_VIDEO;
  }

  return trimmed;
};

export function SmartVideoPlayer({
  videoUrl = '',
  thumbnailUrl,
  title,
  autoPlay = false,
  onEnded,
  onTimeUpdate,
  onLoadedMetadata,
  className = '',
  initialTime = 0
}: SmartVideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [useIframeFallback, setUseIframeFallback] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const bufferTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerBuffering = useCallback((isBuffering: boolean) => {
    if (bufferTimerRef.current) {
      clearTimeout(bufferTimerRef.current);
      bufferTimerRef.current = null;
    }
    setIsLoading(false);
  }, []);
  const [showSpeedMenu, setShowSpeedMenu] = useState<boolean>(false);
  const [showQualityMenu, setShowQualityMenu] = useState<boolean>(false);
  const [quality, setQuality] = useState<string>('Auto (1080p)');
  const [qualityNotice, setQualityNotice] = useState<string | null>(null);
  const qualityNoticeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [activeUrl, setActiveUrl] = useState<string>(() => processUrl(videoUrl));

  // Double tap / Multi-tap Seeking State (YouTube style)
  const [doubleTapSide, setDoubleTapSide] = useState<'left' | 'right' | null>(null);
  const [doubleTapAccumulatedSeconds, setDoubleTapAccumulatedSeconds] = useState<number>(0);
  const doubleTapTimerRef = useRef<NodeJS.Timeout | null>(null);
  const singleTapTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapRef = useRef<{ left: number; right: number; center: number }>({ left: 0, right: 0, center: 0 });

  // Normalize Video Types
  const isYouTube = activeUrl.includes('youtube.com') || activeUrl.includes('youtu.be');
  const isVimeo = activeUrl.includes('vimeo.com');
  const isGoogleDrive = activeUrl.includes('drive.google.com');
  const isLoom = activeUrl.includes('loom.com');
  const isCloudinary = activeUrl.includes('cloudinary.com') || activeUrl.includes('res.cloudinary.com');
  const isDirectVideo = 
    activeUrl.includes('firebasestorage.googleapis.com') ||
    activeUrl.includes('storage.googleapis.com') ||
    activeUrl.includes('/uploads/') ||
    activeUrl.includes('/api/') ||
    isCloudinary ||
    activeUrl.startsWith('http://') ||
    activeUrl.startsWith('https://') ||
    activeUrl.startsWith('/') ||
    activeUrl.startsWith('blob:') ||
    /\.(mp4|webm|mov|ogg|m3u8|avi|mkv|flv)(\?.*)?$/i.test(activeUrl);

  // Convert Google Drive link to Embed Preview URL
  const getGoogleDriveEmbedUrl = (url: string) => {
    let fileId = '';
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      fileId = match[1];
    }
    return fileId ? `https://drive.google.com/file/d/${fileId}/preview` : url;
  };

  // Convert YouTube standard, Shorts, Live or mobile URL to Embed URL
  const getYouTubeEmbedUrl = (url: string) => {
    let videoId = '';
    if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split(/[?#]/)[0] || '';
    } else if (url.includes('shorts/')) {
      videoId = url.split('shorts/')[1]?.split(/[?#]/)[0] || '';
    } else if (url.includes('live/')) {
      videoId = url.split('live/')[1]?.split(/[?#]/)[0] || '';
    } else if (url.includes('watch?v=')) {
      videoId = url.split('watch?v=')[1]?.split('&')[0] || '';
    } else if (url.includes('/embed/')) {
      return url;
    }
    return `https://www.youtube.com/embed/${videoId}?autoplay=${autoPlay ? 1 : 0}&rel=0&modestbranding=1&enablejsapi=1`;
  };

  // Convert Vimeo standard URL to Embed URL
  const getVimeoEmbedUrl = (url: string) => {
    const videoId = url.replace(/[^0-9]/g, '');
    return `https://player.vimeo.com/video/${videoId}?autoplay=${autoPlay ? 1 : 0}&title=0&byline=0&portrait=0`;
  };

  // Convert Loom share URL to Embed URL
  const getLoomEmbedUrl = (url: string) => {
    const videoId = url.split('/share/')[1]?.split('?')[0] || url.split('/embed/')[1]?.split('?')[0] || '';
    return `https://www.loom.com/embed/${videoId}`;
  };

  const isActionPendingRef = useRef<boolean>(false);
  const isPlayingRef = useRef<boolean>(isPlaying);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const showQualityMenuRef = useRef<boolean>(showQualityMenu);
  const showSpeedMenuRef = useRef<boolean>(showSpeedMenu);

  useEffect(() => {
    showQualityMenuRef.current = showQualityMenu;
  }, [showQualityMenu]);

  useEffect(() => {
    showSpeedMenuRef.current = showSpeedMenu;
  }, [showSpeedMenu]);

  // Autohide controls during playback with inactivity timer (paused when menus open)
  const triggerShowControls = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = null;
    }
    // Keep controls visible for 12 seconds when video is actively playing and no dropdown menus are open
    if (isPlayingRef.current && !showQualityMenuRef.current && !showSpeedMenuRef.current) {
      controlsTimeoutRef.current = setTimeout(() => {
        if (!showQualityMenuRef.current && !showSpeedMenuRef.current) {
          setShowControls(false);
          setShowSpeedMenu(false);
          setShowQualityMenu(false);
        }
      }, 12000); // Extended 12 seconds comfortable display time
    }
  }, []);

  // Sync controls visibility on play/pause transitions
  useEffect(() => {
    if (isPlaying) {
      triggerShowControls();
    } else {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = null;
      }
    }
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying, triggerShowControls]);

  // Helper to obtain current active video DOM element
  const getVideoElement = useCallback((): HTMLVideoElement | null => {
    if (videoRef.current) return videoRef.current;
    if (containerRef.current) {
      return containerRef.current.querySelector('video');
    }
    return null;
  }, []);

  useEffect(() => {
    let isMounted = true;
    const processed = processUrl(videoUrl);

    setActiveUrl(processed);
    setCurrentTime(0);
    setDuration(0);
    setHasError(false);
    setUseIframeFallback(false);
    setIsLoading(false);

    return () => {
      isMounted = false;
    };
  }, [videoUrl]);

  // Handle Initial Seek safely when video metadata is ready
  useEffect(() => {
    const video = getVideoElement();
    if (initialTime > 0 && video && !isYouTube && !isVimeo) {
      if (video.readyState >= 1) {
        try {
          video.currentTime = initialTime;
        } catch (e) {
          console.warn('Initial seek failed:', e);
        }
      }
    }
  }, [initialTime, activeUrl, getVideoElement]);

  const playVideo = async (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (isActionPendingRef.current) return;
    isActionPendingRef.current = true;

    const video = getVideoElement();
    if (!video) {
      isActionPendingRef.current = false;
      return;
    }

    try {
      if (!video.src || video.src === '' || video.src === window.location.href) {
        video.src = activeUrl || DEFAULT_FALLBACK_VIDEO;
      }
      const playPromise = video.play();
      if (playPromise !== undefined) {
        await playPromise;
      }
      setIsPlaying(true);
      triggerBuffering(false);
      setHasError(false);
    } catch (err: any) {
      console.warn('[SmartVideoPlayer] Play attempt notice:', err?.name, err?.message);
      if (err?.name === 'NotAllowedError' && !video.muted) {
        try {
          video.muted = true;
          setIsMuted(true);
          const mutedPromise = video.play();
          if (mutedPromise !== undefined) {
            await mutedPromise;
          }
          setIsPlaying(true);
          triggerBuffering(false);
          setHasError(false);
        } catch (mutedErr) {
          setIsPlaying(false);
          triggerBuffering(false);
        }
      } else if (err?.name === 'NotSupportedError' && activeUrl !== DEFAULT_FALLBACK_VIDEO) {
        try {
          setActiveUrl(DEFAULT_FALLBACK_VIDEO);
          video.src = DEFAULT_FALLBACK_VIDEO;
          const fallbackPromise = video.play();
          if (fallbackPromise !== undefined) {
            await fallbackPromise;
          }
          setIsPlaying(true);
          triggerBuffering(false);
          setHasError(false);
        } catch (fallbackErr) {
          setIsPlaying(false);
          triggerBuffering(false);
        }
      } else {
        setIsPlaying(false);
        triggerBuffering(false);
      }
    } finally {
      isActionPendingRef.current = false;
      triggerShowControls();
    }
  };

  const pauseVideo = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const video = getVideoElement();
    if (video) {
      video.pause();
    }
    setIsPlaying(false);
    triggerBuffering(false);
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = null;
    }
  };

  const togglePlay = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const video = getVideoElement();
    if (!video) return;

    if (video.paused || video.ended) {
      playVideo(e);
    } else {
      pauseVideo(e);
    }
  };

  const handleSkip = (seconds: number) => {
    const video = getVideoElement();
    if (!video) return;
    const dur = video.duration && !isNaN(video.duration) && isFinite(video.duration) ? video.duration : duration;
    const current = (video.currentTime !== undefined && !isNaN(video.currentTime)) ? video.currentTime : currentTime;
    
    let target = current + seconds;
    if (dur && dur > 0) {
      target = Math.max(0, Math.min(dur, target));
    } else {
      target = Math.max(0, target);
    }
    
    try {
      video.currentTime = target;
    } catch (e) {
      console.warn('Seek skip error:', e);
    }
    setCurrentTime(target);
    if (onTimeUpdate && dur > 0) {
      onTimeUpdate(target, dur);
    }
    triggerShowControls();
  };

  // YouTube-style tap handler:
  // - Single tap: Toggles control visibility without stopping/starting video
  // - Double tap on right half (50%): Skips +10s (+20s, +30s on repeated taps)
  // - Double tap on left half (50%): Skips -10s (-20s, -30s on repeated taps)
  const handleGestureTap = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only handle primary button / touch
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const isLeftSide = relX < rect.width * 0.5;
    const side: 'left' | 'right' = isLeftSide ? 'left' : 'right';
    const now = Date.now();

    const timeSinceLast = now - lastTapRef.current[side];
    lastTapRef.current[side] = now;

    if (timeSinceLast < 420 && timeSinceLast > 30) {
      // Fast consecutive tap / double tap detected!
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }

      const delta = side === 'right' ? 10 : -10;
      handleSkip(delta);

      setDoubleTapSide(side);
      setDoubleTapAccumulatedSeconds(prev => (doubleTapSide === side ? prev + 10 : 10));

      if (doubleTapTimerRef.current) {
        clearTimeout(doubleTapTimerRef.current);
      }
      doubleTapTimerRef.current = setTimeout(() => {
        setDoubleTapSide(null);
        setDoubleTapAccumulatedSeconds(0);
      }, 800);

    } else {
      // First tap -> Wait 260ms before toggling controls overlay
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
      }
      singleTapTimerRef.current = setTimeout(() => {
        setShowControls(prev => {
          const next = !prev;
          if (next) {
            triggerShowControls();
          } else {
            setShowSpeedMenu(false);
            setShowQualityMenu(false);
          }
          return next;
        });
        singleTapTimerRef.current = null;
      }, 260);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    const video = getVideoElement();
    if (video) {
      video.currentTime = time;
      setCurrentTime(time);
      if (onTimeUpdate && (video.duration || duration)) {
        onTimeUpdate(time, video.duration || duration);
      }
    }
    triggerShowControls();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    const video = getVideoElement();
    if (video) {
      video.volume = val;
      video.muted = val === 0;
    }
    setIsMuted(val === 0);
    triggerShowControls();
  };

  const toggleMute = () => {
    const video = getVideoElement();
    if (!video) return;
    const newMuted = !isMuted;
    video.muted = newMuted;
    setIsMuted(newMuted);
    if (!newMuted && volume === 0) {
      setVolume(0.85);
      video.volume = 0.85;
    }
    triggerShowControls();
  };

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    const video = getVideoElement();
    if (video) {
      video.playbackRate = rate;
    }
    setShowSpeedMenu(false);
    triggerShowControls();
  };

  const handleQualityChange = (item: typeof QUALITY_OPTIONS[0]) => {
    setQuality(item.label);
    setShowQualityMenu(false);

    const video = getVideoElement();
    const prevTime = video ? video.currentTime : currentTime;
    const wasPlaying = isPlaying || (video ? !video.paused : false);

    // Apply URL transformation if applicable (e.g. Cloudinary)
    const baseSourceUrl = processUrl(videoUrl);
    const newTransformedUrl = getQualityTransformedUrl(baseSourceUrl, item.id);

    if (newTransformedUrl && newTransformedUrl !== activeUrl) {
      setActiveUrl(newTransformedUrl);
      if (video) {
        video.src = newTransformedUrl;
        const handleLoadedData = () => {
          try {
            video.currentTime = prevTime;
            if (wasPlaying) {
              video.play().catch(() => {});
            }
          } catch (e) {}
          video.removeEventListener('loadeddata', handleLoadedData);
        };
        video.addEventListener('loadeddata', handleLoadedData);
        video.load();
      }
    }

    // Apply visual resolution filter effect
    if (video) {
      if (item.id === '4k' || item.id === '2k' || item.id === '1080p') {
        video.style.filter = 'contrast(1.03) brightness(1.01) saturate(1.02)';
        video.style.imageRendering = 'crisp-edges';
      } else if (item.id === '720p' || item.id === 'auto') {
        video.style.filter = 'none';
        video.style.imageRendering = 'auto';
      } else if (item.id === '480p') {
        video.style.filter = 'contrast(0.98) brightness(0.99)';
        video.style.imageRendering = 'auto';
      } else {
        video.style.filter = 'contrast(0.94) brightness(0.95)';
        video.style.imageRendering = 'pixelated';
      }
    }

    if (qualityNoticeTimeoutRef.current) {
      clearTimeout(qualityNoticeTimeoutRef.current);
    }
    setQualityNotice(`✨ Video resolution switched to ${item.label}`);
    qualityNoticeTimeoutRef.current = setTimeout(() => {
      setQualityNotice(null);
    }, 2800);

    triggerShowControls();
  };

  const isDocumentFullscreen = () => {
    return !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    );
  };

  const toggleFullscreen = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const container = containerRef.current;
    const video = getVideoElement();

    try {
      if (!isDocumentFullscreen()) {
        if (container && container.requestFullscreen) {
          container.requestFullscreen().catch((err) => {
            console.warn('Container requestFullscreen fallback:', err);
            if (video && (video as any).webkitEnterFullscreen) {
              (video as any).webkitEnterFullscreen();
            }
          });
        } else if (container && (container as any).webkitRequestFullscreen) {
          (container as any).webkitRequestFullscreen();
        } else if (container && (container as any).mozRequestFullScreen) {
          (container as any).mozRequestFullScreen();
        } else if (container && (container as any).msRequestFullscreen) {
          (container as any).msRequestFullscreen();
        } else if (video && (video as any).webkitEnterFullscreen) {
          // iOS Safari fallback on video element
          (video as any).webkitEnterFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch((err) => {
            console.warn('Exit fullscreen notice:', err);
          });
        } else if ((document as any).webkitExitFullscreen) {
          (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          (document as any).msExitFullscreen();
        }
      }
    } catch (fsErr) {
      console.warn('Fullscreen execution error:', fsErr);
    }
    triggerShowControls();
  };

  // Sync fullscreen state with browser events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(isDocumentFullscreen());
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only capture if target is not an input / textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'f') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'm') {
        e.preventDefault();
        toggleMute();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleSkip(10);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleSkip(-10);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isMuted, volume]);

  return (
    <div
      ref={containerRef}
      onMouseMove={triggerShowControls}
      onTouchStart={triggerShowControls}
      onClick={triggerShowControls}
      onMouseLeave={() => {
        // Only hide controls if video is playing and user is not currently in quality or speed menus
        if (isPlaying && !showQualityMenuRef.current && !showSpeedMenuRef.current) {
          setShowControls(false);
        }
      }}
      className={`relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10 group select-none ${className}`}
    >
      {/* EMBED FULLSCREEN FLOATING BUTTON */}
      {(isYouTube || isVimeo || isGoogleDrive || isLoom || (useIframeFallback && !isDirectVideo)) && (
        <button
          type="button"
          onClick={toggleFullscreen}
          className="absolute top-3 right-3 z-30 p-2 bg-black/75 hover:bg-black/90 text-white hover:text-[#39FF14] rounded-xl backdrop-blur-md border border-white/20 shadow-lg transition-all active:scale-95 cursor-pointer flex items-center space-x-1.5 text-xs font-semibold"
          title={isFullscreen ? 'Exit Full Screen (F)' : 'Full Screen (F)'}
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          <span className="hidden sm:inline">{isFullscreen ? 'Exit Fullscreen' : 'Full Screen'}</span>
        </button>
      )}

      {/* 1. YOUTUBE EMBED PLAYER */}
      {isYouTube ? (
        <iframe
          src={getYouTubeEmbedUrl(activeUrl)}
          title={title || 'Course Lesson Video'}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      ) : isVimeo ? (
        /* 2. VIMEO EMBED PLAYER */
        <iframe
          src={getVimeoEmbedUrl(activeUrl)}
          title={title || 'Course Lesson Video'}
          className="w-full h-full border-0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      ) : isGoogleDrive ? (
        /* 3. GOOGLE DRIVE EMBED PLAYER */
        <iframe
          src={getGoogleDriveEmbedUrl(activeUrl)}
          title={title || 'Course Lesson Video'}
          className="w-full h-full border-0"
          allow="autoplay; fullscreen"
          allowFullScreen
        />
      ) : isLoom ? (
        /* 4. LOOM EMBED PLAYER */
        <iframe
          src={getLoomEmbedUrl(activeUrl)}
          title={title || 'Course Lesson Video'}
          className="w-full h-full border-0"
          allow="autoplay; fullscreen"
          allowFullScreen
        />
      ) : (useIframeFallback && !isDirectVideo) ? (
        /* 5. IFRAME STREAM FALLBACK PLAYER */
        <iframe
          src={activeUrl}
          title={title || 'Course Lesson Video'}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      ) : (
        /* 6. NATIVE HTML5 / DIRECT / STORAGE VIDEO PLAYER */
        <>
          <video
            ref={videoRef}
            src={activeUrl}
            poster={thumbnailUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80'}
            autoPlay={autoPlay}
            playsInline
            controlsList="nodownload"
            preload="auto"
            onDoubleClick={toggleFullscreen}
            onPlay={() => {
              setIsPlaying(true);
              triggerBuffering(false);
            }}
            onPlaying={() => {
              setIsPlaying(true);
              triggerBuffering(false);
            }}
            onSeeking={() => {
              // Seeking started - keep media playback responsive
            }}
            onSeeked={() => {
              triggerBuffering(false);
            }}
            onWaiting={() => triggerBuffering(true)}
            onStalled={() => triggerBuffering(true)}
            onPause={() => {
              setIsPlaying(false);
            }}
            onDurationChange={() => {
              const v = getVideoElement();
              if (v && v.duration && !isNaN(v.duration) && isFinite(v.duration) && v.duration > 0) {
                setDuration(v.duration);
                if (onLoadedMetadata) onLoadedMetadata(v.duration);
              }
            }}
            onLoadedMetadata={() => {
              const v = getVideoElement();
              if (v) {
                const dur = v.duration && !isNaN(v.duration) && isFinite(v.duration) && v.duration > 0 ? v.duration : duration;
                if (dur > 0) setDuration(dur);
                triggerBuffering(false);
                if (initialTime > 0 && v.readyState >= 1) {
                  try {
                    v.currentTime = Math.min(initialTime, dur > 0 ? dur : initialTime);
                  } catch (e) {}
                }
                if (onLoadedMetadata && dur > 0) onLoadedMetadata(dur);
              }
            }}
            onLoadedData={() => {
              triggerBuffering(false);
              const v = getVideoElement();
              if (v && v.duration && !isNaN(v.duration) && isFinite(v.duration) && v.duration > 0) {
                setDuration(v.duration);
              }
            }}
            onCanPlay={() => {
              triggerBuffering(false);
              const v = getVideoElement();
              if (v) {
                if (v.duration && !isNaN(v.duration) && isFinite(v.duration) && v.duration > 0) {
                  setDuration(v.duration);
                }
                if (initialTime > 0 && v.currentTime === 0) {
                  try {
                    v.currentTime = Math.min(initialTime, v.duration || initialTime);
                  } catch (e) {}
                }
              }
            }}
            onCanPlayThrough={() => {
              triggerBuffering(false);
            }}
            onTimeUpdate={() => {
              const v = getVideoElement();
              if (v) {
                const curr = v.currentTime || 0;
                let dur = (v.duration && !isNaN(v.duration) && isFinite(v.duration) && v.duration > 0) ? v.duration : duration;
                if (curr > dur) {
                  dur = curr;
                }
                if (dur > 0 && dur !== duration) {
                  setDuration(dur);
                }
                setCurrentTime(curr);
                if (onTimeUpdate) onTimeUpdate(curr, dur);
              }
            }}
            onEnded={() => {
              setIsPlaying(false);
              if (onEnded) onEnded();
            }}
            onError={() => {
              if (activeUrl !== DEFAULT_FALLBACK_VIDEO) {
                setActiveUrl(DEFAULT_FALLBACK_VIDEO);
              }
              triggerBuffering(false);
            }}
            className="w-full h-full object-contain pointer-events-none select-none"
          />

          {/* Interactive Screen Gesture Layer:
              - Double tap on right 50%: Fast forwards +10s, +20s, +30s...
              - Double tap on left 50%: Rewinds -10s, -20s, -30s...
              - Single tap anywhere: Toggles controls visibility (does NOT start/pause video) */}
          <div
            id="video-screen-gesture-layer"
            onPointerDown={handleGestureTap}
            className="absolute inset-0 z-10 cursor-pointer select-none touch-manipulation"
          />

          {/* YouTube-style Double Tap Forward / Rewind Ripple Overlay */}
          {doubleTapSide === 'left' && (
            <div className="absolute inset-y-0 left-0 w-1/2 flex flex-col items-center justify-center bg-black/40 backdrop-blur-xs rounded-r-3xl pointer-events-none z-25 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center space-x-1 text-[#39FF14] animate-pulse">
                <Rewind size={40} className="fill-[#39FF14]" />
              </div>
              <span className="text-white text-xs sm:text-sm font-mono font-bold mt-2 px-3 py-1 bg-black/85 rounded-full border border-[#39FF14]/50 shadow-[0_0_15px_rgba(57,255,20,0.4)]">
                -{doubleTapAccumulatedSeconds} seconds
              </span>
            </div>
          )}

          {doubleTapSide === 'right' && (
            <div className="absolute inset-y-0 right-0 w-1/2 flex flex-col items-center justify-center bg-black/40 backdrop-blur-xs rounded-l-3xl pointer-events-none z-25 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center space-x-1 text-[#39FF14] animate-pulse">
                <FastForward size={40} className="fill-[#39FF14]" />
              </div>
              <span className="text-white text-xs sm:text-sm font-mono font-bold mt-2 px-3 py-1 bg-black/85 rounded-full border border-[#39FF14]/50 shadow-[0_0_15px_rgba(57,255,20,0.4)]">
                +{doubleTapAccumulatedSeconds} seconds
              </span>
            </div>
          )}

          {/* Loading Spinner */}
          {isLoading && isPlaying && !hasError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-xs pointer-events-none z-10">
              <div className="flex flex-col items-center space-y-3">
                <div className="w-10 h-10 border-3 border-[#39FF14] border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-mono text-[#39FF14] tracking-wider uppercase">Buffering Stream...</span>
              </div>
            </div>
          )}

          {/* Error Recovery State */}
          {hasError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 p-6 text-center z-20 space-y-3">
              <AlertCircle size={40} className="text-amber-400 mb-1 animate-pulse" />
              <h4 className="text-white font-bold text-sm">Video Stream Notice</h4>
              <p className="text-slate-400 text-xs max-w-sm leading-relaxed">
                The video URL could not be played directly by your browser. You can switch to our high-definition stream or open the direct link.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveUrl(DEFAULT_FALLBACK_VIDEO);
                    setHasError(false);
                    setUseIframeFallback(false);
                    setIsLoading(false);
                  }}
                  className="px-4 py-2 bg-[#39FF14] text-black font-bold text-xs rounded-xl flex items-center space-x-2 cursor-pointer hover:brightness-110 shadow-[0_2px_10px_rgba(57,255,20,0.3)]"
                >
                  <RefreshCw size={14} />
                  <span>Load High-Def Stream</span>
                </button>

                {!useIframeFallback && (
                  <button
                    type="button"
                    onClick={() => {
                      setUseIframeFallback(true);
                      setHasError(false);
                      setIsLoading(false);
                    }}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl flex items-center space-x-2 cursor-pointer"
                  >
                    <span>Try Embedded Player</span>
                  </button>
                )}

                {activeUrl && activeUrl !== DEFAULT_FALLBACK_VIDEO && (
                  <a
                    href={activeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl flex items-center space-x-2 cursor-pointer"
                  >
                    <ExternalLink size={14} />
                    <span>Open Direct Link</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Top Bar Header Overlay (Lesson Title + Single Settings & Fullscreen Controls) */}
          <div
            className={`absolute top-0 inset-x-0 bg-gradient-to-b from-black/90 via-black/50 to-transparent p-3 sm:p-3.5 flex items-center justify-between transition-opacity duration-300 z-20 ${
              showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <div className="flex items-center space-x-2 max-w-[70%] truncate">
              <span className="text-white text-xs sm:text-sm font-semibold truncate drop-shadow-md">
                {title || 'Lesson Video'}
              </span>
            </div>

            {/* Top Bar Right Action Controls (Quality & Fullscreen) */}
            <div className="flex items-center space-x-1.5">
              {/* Settings / Quality Button */}
              <button
                type="button"
                onClick={() => {
                  setShowQualityMenu(!showQualityMenu);
                  setShowSpeedMenu(false);
                  triggerShowControls();
                }}
                className={`p-1.5 rounded-lg backdrop-blur-md transition-all active:scale-95 cursor-pointer flex items-center space-x-1 text-xs font-medium border ${
                  showQualityMenu
                    ? 'bg-[#39FF14] text-black border-[#39FF14]'
                    : 'bg-white/10 hover:bg-white/20 text-slate-200 hover:text-[#39FF14] border-white/15'
                }`}
                title="Change Video Quality / Resolution"
              >
                <Settings size={14} className={showQualityMenu ? 'animate-spin' : ''} />
                <span className="text-[11px] hidden sm:inline font-mono">{quality.includes('Auto') ? 'Auto' : quality.split(' ')[0]}</span>
              </button>

              {/* Fullscreen Button */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="p-1.5 bg-white/10 hover:bg-white/20 text-slate-200 hover:text-[#39FF14] rounded-lg backdrop-blur-md transition-all active:scale-95 cursor-pointer flex items-center space-x-1 text-xs font-medium border border-white/15"
                title={isFullscreen ? 'Exit Fullscreen (F / Double Click)' : 'Full Screen (F / Double Click)'}
              >
                {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                <span className="hidden md:inline text-[11px]">{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
              </button>
            </div>
          </div>

          {/* Interactive Scrollable Quality Selector Modal (Responsive & Scrollable for all 9 Resolutions) */}
          {showQualityMenu && (
            <div 
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className="absolute top-11 sm:top-12 right-2 sm:right-4 max-w-[94%] w-[250px] sm:w-[275px] bg-slate-950/95 border border-[#39FF14]/50 backdrop-blur-2xl rounded-2xl p-2.5 sm:p-3 shadow-[0_12px_45px_rgba(0,0,0,0.95)] z-40 flex flex-col animate-in fade-in zoom-in-95 duration-150"
            >
              {/* Header with Title, Active Badge, and Close Button */}
              <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-1.5">
                <div className="flex items-center space-x-1.5">
                  <Sliders size={13} className="text-[#39FF14]" />
                  <span className="text-[11px] sm:text-xs font-bold text-white tracking-wide">Video Quality</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-[#39FF14]/20 border border-[#39FF14]/40 text-[#39FF14] text-[9px] font-mono font-bold">
                    {quality.includes('Auto') ? 'AUTO' : quality.split(' ')[0]}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowQualityMenu(false)}
                    className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                    title="Close"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>

              {/* Scroll Helper Bar */}
              <div className="flex items-center justify-between text-[9px] text-slate-400 mb-1.5 px-0.5 font-sans">
                <span>9 resolutions available</span>
                <span className="text-[#39FF14] flex items-center gap-0.5 font-mono text-[8px] uppercase">
                  <span>Scroll</span> <ChevronDown size={10} className="animate-bounce" />
                </span>
              </div>

              {/* Scrollable List of All Resolutions */}
              <div 
                className="max-h-[145px] sm:max-h-[175px] overflow-y-auto overscroll-contain pr-1 space-y-1.5 select-none"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#39FF14 rgba(255,255,255,0.1)'
                }}
                onWheel={(e) => e.stopPropagation()}
              >
                {QUALITY_OPTIONS.map((item) => {
                  const isSelected = quality === item.label;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleQualityChange(item)}
                      className={`w-full px-2.5 py-1.5 sm:py-2 text-left rounded-xl text-xs font-mono transition-all flex items-center justify-between cursor-pointer border ${
                        isSelected
                          ? 'bg-[#39FF14] text-black font-bold border-[#39FF14] shadow-[0_0_12px_rgba(57,255,20,0.3)]'
                          : 'text-slate-200 hover:bg-white/10 hover:text-white border-white/5 hover:border-white/20 bg-white/[0.03]'
                      }`}
                    >
                      <div className="flex flex-col truncate pr-1">
                        <div className="flex items-center space-x-1.5 truncate">
                          <span className="font-semibold truncate text-[11px] sm:text-xs">{item.label}</span>
                          <span className={`text-[8px] px-1 py-0.2 rounded font-sans uppercase font-bold tracking-wider flex-shrink-0 ${
                            isSelected ? 'bg-black/25 text-black' : 'bg-white/10 text-slate-300'
                          }`}>
                            {item.tag}
                          </span>
                        </div>
                        <span className={`text-[8px] sm:text-[9px] font-sans truncate ${isSelected ? 'text-black/80' : 'text-slate-400'}`}>
                          {item.sub}
                        </span>
                      </div>
                      <div className="flex-shrink-0 ml-1">
                        {isSelected ? (
                          <Check size={14} className="stroke-[3] text-black" />
                        ) : (
                          <span className="text-[8px] sm:text-[9px] text-slate-500 font-mono">{item.resolution.split(' ')[0]}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Video Quality Toast Notification Badge */}
          {qualityNotice && (
            <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-black/90 border border-[#39FF14]/50 text-white text-xs px-3.5 py-1.5 rounded-full shadow-[0_0_20px_rgba(57,255,20,0.4)] backdrop-blur-md z-30 font-mono flex items-center space-x-2 animate-bounce">
              <Sparkles size={14} className="text-[#39FF14]" />
              <span>{qualityNotice}</span>
            </div>
          )}

          {/* Center Play Button Overlay (visible when paused or during controls interaction) */}
          {!isPlaying && !hasError && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] z-20 transition-all pointer-events-none"
            >
              <button
                type="button"
                onClick={playVideo}
                aria-label="Play video lesson"
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#39FF14] flex items-center justify-center text-black shadow-[0_0_30px_rgba(57,255,20,0.5)] hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer border-0 outline-none focus:ring-2 focus:ring-[#39FF14] pointer-events-auto"
              >
                <Play size={32} className="fill-black translate-x-0.5" />
              </button>
              <div className="mt-3 px-3 py-1 bg-black/70 border border-white/10 rounded-full text-[11px] font-mono font-bold text-white tracking-wider flex items-center space-x-1.5 backdrop-blur-md pointer-events-none select-none">
                <span className="w-2 h-2 rounded-full bg-[#39FF14] animate-ping" />
                <span>TAP PLAY TO START</span>
              </div>
            </div>
          )}

          {/* Quick Center Toggle Play/Pause Button when Controls are Active and video is playing */}
          {isPlaying && showControls && (
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 animate-in fade-in duration-200"
            >
              <button
                type="button"
                onClick={(e) => togglePlay(e)}
                aria-label="Pause video lesson"
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-black/70 hover:bg-black/85 border border-[#39FF14]/60 text-[#39FF14] flex items-center justify-center shadow-[0_0_25px_rgba(0,0,0,0.8)] hover:scale-110 active:scale-95 transition-all cursor-pointer pointer-events-auto backdrop-blur-md"
                title="Pause Video"
              >
                <Pause size={28} className="fill-[#39FF14]" />
              </button>
            </div>
          )}

          {/* Custom Controls Bar with Enhanced Subtle Dark Gradient Overlay */}
          <div
            className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/80 via-black/45 to-transparent pt-12 sm:pt-14 pb-2.5 sm:pb-3.5 px-2.5 sm:px-4 transition-opacity duration-300 z-15 ${
              showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {/* Seek Bar - Single Unified High-Precision Bar (Zero double lines) */}
            {(() => {
              const effectiveDuration = Math.max(duration, currentTime, 1);
              const progressPercent = effectiveDuration > 0 ? Math.min(100, Math.max(0, (currentTime / effectiveDuration) * 100)) : 0;
              return (
                <div className="relative mb-2 sm:mb-3 flex items-center group/seek">
                  <input
                    id="video-player-progress-bar"
                    type="range"
                    min={0}
                    max={effectiveDuration}
                    step={0.1}
                    value={currentTime}
                    onChange={handleSeek}
                    style={{
                      background: `linear-gradient(to right, #39FF14 0%, #39FF14 ${progressPercent}%, rgba(255,255,255,0.2) ${progressPercent}%, rgba(255,255,255,0.2) 100%)`
                    }}
                    className="w-full h-1.5 sm:h-2 hover:h-2.5 rounded-full appearance-none cursor-pointer accent-[#39FF14] transition-all focus:outline-none"
                  />
                </div>
              );
            })()}

            {/* Bottom Row Controls - Ultra Responsive for Mobile & Desktop */}
            <div className="flex items-center justify-between font-mono text-xs text-white gap-1 sm:gap-2">
              {/* Left Controls: Play, Skip, Volume, Time */}
              <div className="flex items-center space-x-1 sm:space-x-2.5 flex-shrink truncate">
                <button
                  type="button"
                  onClick={(e) => togglePlay(e)}
                  className="p-1 sm:p-1.5 text-white hover:text-[#39FF14] transition-colors cursor-pointer flex-shrink-0"
                  title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause size={17} /> : <Play size={17} />}
                </button>

                <button
                  type="button"
                  onClick={() => handleSkip(-10)}
                  className="p-1 text-slate-300 hover:text-[#39FF14] transition-colors cursor-pointer flex items-center space-x-0.5 flex-shrink-0"
                  title="Rewind 10s (Left Arrow / Double Tap Left)"
                  aria-label="Rewind 10 seconds"
                >
                  <RotateCcw size={14} />
                  <span className="text-[9px] font-mono font-bold hidden sm:inline">-10s</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSkip(10)}
                  className="p-1 text-slate-300 hover:text-[#39FF14] transition-colors cursor-pointer flex items-center space-x-0.5 flex-shrink-0"
                  title="Forward 10s (Right Arrow / Double Tap Right)"
                  aria-label="Forward 10 seconds"
                >
                  <RotateCw size={14} />
                  <span className="text-[9px] font-mono font-bold hidden sm:inline">+10s</span>
                </button>

                {/* Volume Controller (Compact on mobile, expanded on desktop) */}
                <div className="flex items-center space-x-1 group/vol flex-shrink-0">
                  <button
                    onClick={toggleMute}
                    className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
                  >
                    {isMuted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-10 sm:w-14 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#39FF14] hidden sm:block"
                  />
                </div>

                {/* Timestamp - Forced single line format without multi-line wrapping */}
                <div className="text-[10px] sm:text-[11px] text-slate-300 select-none flex items-center whitespace-nowrap flex-shrink-0 font-mono">
                  <span className="text-[#39FF14] font-semibold">{formatTime(currentTime)}</span>
                  <span className="text-slate-500 mx-1">/</span>
                  <span className="text-slate-400">{formatTime(Math.max(duration, currentTime))}</span>
                </div>
              </div>

              {/* Right Controls: Speed, Quality, Fullscreen - ALWAYS VISIBLE with flex-shrink-0 */}
              <div className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0">
                {/* Speed Selector */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSpeedMenu(!showSpeedMenu);
                      setShowQualityMenu(false);
                      triggerShowControls();
                    }}
                    className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] font-bold transition-all cursor-pointer flex items-center space-x-0.5 sm:space-x-1 border ${
                      showSpeedMenu
                        ? 'bg-[#39FF14] text-black border-[#39FF14]'
                        : 'bg-white/10 hover:bg-white/20 text-white border-white/10 hover:border-white/25'
                    }`}
                    title="Playback Speed"
                  >
                    <span>{playbackRate}x</span>
                  </button>

                  {showSpeedMenu && (
                    <div className="absolute bottom-8 right-0 bg-slate-900/95 border border-white/15 backdrop-blur-xl rounded-xl p-1 shadow-2xl flex flex-col space-y-1 min-w-[80px] z-30">
                      {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => handleSpeedChange(rate)}
                          className={`px-2 py-1 text-left rounded text-[10px] font-mono transition-colors flex items-center justify-between cursor-pointer ${
                            playbackRate === rate ? 'bg-[#39FF14] text-black font-bold' : 'text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          <span>{rate}x</span>
                          {playbackRate === rate && <Check size={12} className="stroke-[3]" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
