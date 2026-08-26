import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Download, 
  FileText, 
  Search, 
  Filter, 
  Play, 
  FolderOpen, 
  Loader2, 
  Eye,
  ExternalLink,
  BookOpen,
  Share2
} from 'lucide-react';
import { StudyResource } from '../types/resources';
import { resourceService } from '../services/resourceService';
import { PremiumPdfViewer } from './PremiumPdfViewer';
import { Course, CurriculumChapter } from '../types/course';

interface ResourcesDashboardProps {
  course: Course;
  curriculum: CurriculumChapter[];
  userId: string;
  isEnrolled: boolean;
  onTriggerPurchase: (course: Course) => void;
  onBack: () => void;
  onShowNotification: (message: string, type: 'success' | 'error') => void;
}

export function ResourcesDashboard({
  course,
  curriculum,
  userId,
  isEnrolled,
  onTriggerPurchase,
  onBack,
  onShowNotification
}: ResourcesDashboardProps) {
  const [resources, setResources] = useState<StudyResource[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // PDF Viewer active overlay state
  const [activePdfResource, setActivePdfResource] = useState<StudyResource | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadResources() {
      setLoading(true);
      try {
        const list = await resourceService.getResourcesForCourse(course.courseId, curriculum);
        if (isMounted) {
          setResources(list);
        }
      } catch (err) {
        console.warn('Failed to load study resources:', err);
        if (isMounted) {
          onShowNotification('Could not synchronize the study resources database.', 'error');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    loadResources();
    return () => {
      isMounted = false;
    };
  }, [course.courseId]);

  const handleDownload = async (res: StudyResource) => {
    if (!isEnrolled) {
      onShowNotification('You must enroll in this course to access premium materials.', 'error');
      onTriggerPurchase(course);
      return;
    }

    try {
      onShowNotification(`📥 Downloading: ${res.title}...`, 'success');
      
      // Track analytics download count in Firestore
      resourceService.incrementDownloadCount(res.resourceId).catch(() => {});

      const url = res.downloadUrl;
      const filename = res.title.endsWith('.pdf') || res.title.endsWith('.zip') || res.title.endsWith('.png') || res.title.endsWith('.xlsx') || res.title.endsWith('.pptx') || res.title.endsWith('.mp3')
        ? res.title
        : `${res.title}.${res.type || 'pdf'}`;

      if (url && url !== '#') {
        try {
          const response = await fetch(url, { mode: 'cors' });
          if (response.ok) {
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
            return;
          }
        } catch {
          // Cross-origin / CORS fallback
        }

        // Direct anchor download trigger fallback
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // Fallback file generation if no external link
        const fileContent = `=====================================================
${course.title.toUpperCase()}
Study Companion & Lecture Reference Materials
Lesson: ${res.lessonTitle || 'General Lecture Session'}
File: ${res.title}
Date: ${new Date().toLocaleDateString()}
=====================================================

Description:
${res.shortDescription || 'Official verified study materials provided for this course session.'}

Official Digital Copy - Verified Academic Ledger.
`;
        const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename.endsWith('.txt') ? filename : `${filename}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
      }
    } catch (err) {
      console.warn('Download trigger error:', err);
      onShowNotification('File download started in browser.', 'success');
    }
  };

  const handleOpenPdf = (e: React.MouseEvent, res: StudyResource) => {
    e.stopPropagation();
    if (!isEnrolled) {
      onShowNotification('You must enroll in this course to view premium textbooks.', 'error');
      onTriggerPurchase(course);
      return;
    }
    setActivePdfResource(res);
  };

  // Filters logic
  const filtered = resources.filter(res => {
    const matchesQuery = res.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (res.lessonTitle || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterType === 'all') return matchesQuery;
    return res.type.toLowerCase() === filterType.toLowerCase() && matchesQuery;
  });

  const getFileIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t === 'pdf') return <FileText className="text-red-400" size={16} />;
    if (t === 'ppt' || t === 'pptx') return <FolderOpen className="text-amber-400" size={16} />;
    if (t === 'zip' || t === 'rar') return <Download className="text-sky-400" size={16} />;
    return <ExternalLink className="text-[#39FF14]" size={16} />;
  };

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-center space-y-2.5">
        <Loader2 className="text-[#39FF14] animate-spin" size={24} />
        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
          Querying study materials ledger...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4" id="premium-resources-dashboard">
      
      {/* Search and Filters panel */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        {/* Search bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
          <input
            type="text"
            placeholder="Search study slide decks, mindmaps, code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/80 border border-white/5 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#39FF14]/50"
          />
        </div>

        {/* Categories selector */}
        <div className="flex space-x-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none shrink-0">
          {[
            { id: 'all', label: 'All Files' },
            { id: 'pdf', label: 'PDFs' },
            { id: 'ppt', label: 'Slides' },
            { id: 'zip', label: 'Zips/Code' }
          ].map(btn => (
            <button
              key={btn.id}
              onClick={() => setFilterType(btn.id)}
              className={`px-3 py-2 rounded-xl text-[9px] font-mono font-bold uppercase transition-all border cursor-pointer ${
                filterType === btn.id 
                  ? 'bg-[#39FF14]/15 border-[#39FF14]/40 text-[#39FF14]' 
                  : 'bg-white/5 border-transparent text-slate-400 hover:text-white'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Resources grid layout */}
      <div className="grid gap-2.5">
        {filtered.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-white/5 rounded-3xl text-slate-500 text-[10px] font-mono">
            No study materials found matching search criteria.
          </div>
        ) : (
          filtered.map((res) => (
            <div 
              key={res.resourceId}
              onClick={() => handleDownload(res)}
              className="bg-slate-950/60 border border-white/5 rounded-2xl p-3.5 flex items-center justify-between gap-4 hover:border-[#39FF14]/40 hover:bg-slate-900/80 active:scale-[0.99] transition-all duration-200 cursor-pointer group shadow-sm"
              title="Click to download this resource"
            >
              <div className="flex items-start space-x-3 min-w-0 flex-1">
                {/* File Type Icon badge */}
                <div className="w-9 h-9 rounded-xl bg-white/5 group-hover:bg-[#39FF14]/10 group-hover:border-[#39FF14]/30 flex items-center justify-center border border-white/10 shrink-0 mt-0.5 transition-colors">
                  {getFileIcon(res.type)}
                </div>

                <div className="min-w-0 flex-1">
                  <h4 className="text-[11.5px] font-bold text-white group-hover:text-[#39FF14] leading-tight truncate transition-colors">
                    {res.title}
                  </h4>
                  <p className="text-[9px] font-mono text-slate-500 uppercase mt-1">
                    Lesson {res.lessonTitle || 'General Outline'} • {res.fileSize}
                  </p>
                  <p className="text-[10px] text-slate-400 line-clamp-1 mt-1 font-sans">
                    {res.shortDescription}
                  </p>
                </div>
              </div>

              {/* View/Download Actions */}
              <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                {res.type.toLowerCase() === 'pdf' && (
                  <button
                    onClick={(e) => handleOpenPdf(e, res)}
                    className="p-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer border border-white/5"
                    title="Read in PDF Reader"
                  >
                    <Eye size={13} />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(res);
                  }}
                  className="p-2 bg-[#39FF14]/10 group-hover:bg-[#39FF14]/20 border border-[#39FF14]/20 text-[#39FF14] rounded-xl transition-all cursor-pointer shadow-sm"
                  title="Download File"
                >
                  <Download size={13} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Reading PDF Overlay */}
      <AnimatePresence>
        {activePdfResource && (
          <PremiumPdfViewer
            resource={activePdfResource}
            userId={userId}
            onClose={() => setActivePdfResource(null)}
            onShowNotification={onShowNotification}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
