import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  BookMarked, 
  Bookmark, 
  Sun, 
  Moon, 
  RotateCcw, 
  Maximize2, 
  Minimize2,
  FileText,
  BookmarkCheck,
  Award,
  ArrowRight
} from 'lucide-react';
import { StudyResource, ReadingProgress } from '../types/resources';
import { resourceService } from '../services/resourceService';

interface PremiumPdfViewerProps {
  resource: StudyResource;
  userId: string;
  onClose: () => void;
  onShowNotification: (message: string, type: 'success' | 'error') => void;
}

// Generate highly detailed textbook-style content for 10 mock academic pages to make search and reading extremely real and high fidelity
const ACADEMIC_PAGES = [
  {
    pageNum: 1,
    title: "COURSE OUTLINE AND METRIC SYSTEMS",
    subtitle: "Section 1.1: Standard Methodologies and Scope Definition",
    paragraphs: [
      "Welcome to this advanced study resource. In this comprehensive academic guide, we analyze the core concepts of systematic implementation and engineering, defining the exact benchmarks required to build scalable systems.",
      "The architectural matrix focuses primarily on high-efficiency data mapping, distributed synchronization patterns, and high-performance algorithms. Students are advised to review the core formulas on Page 4.",
      "Key Terminology: High-Fidelity Systems, Micro-Architectures, Local Persistence, Synchronization Engines, Latency Benchmarks, Throughput Optimization."
    ],
    formula: "S(N) = 1 / [ (1 - P) + P / N ]  -- Amdahl's Law of Parallel Scalability"
  },
  {
    pageNum: 2,
    title: "MICRO-SYSTEM ARCHITECTURE & MEMORY LAYERS",
    subtitle: "Section 1.2: Cache Optimization and Layered Interfaces",
    paragraphs: [
      "Modern processor cache line alignment is critical to preventing unnecessary memory bus contention and false sharing. Here we explore L1, L2, and L3 cache access intervals.",
      "By maintaining strict spatial and temporal locality, an application can experience up to a 15x speedup in resource lookup times. Standard indexes should be aligned with memory bounds.",
      "Design Considerations: Prefetching strategies, cache line size matching (typically 64 bytes), avoiding atomic write contention across independent threads."
    ],
    formula: "T_access = H * C_time + (1 - H) * M_penalty  -- Cache Latency Equation"
  },
  {
    pageNum: 3,
    title: "SECURE COMMUNICATION & CRYPTOGRAPHIC LEDGERS",
    subtitle: "Section 2.1: Key Handshakes and Asymmetric Signatures",
    paragraphs: [
      "Security remains the central pillar of cloud-deployed resources. All transmission data must be enveloped in secure cryptographic handshakes to prevent passive eavesdropping.",
      "We utilize the Elliptic Curve Diffie-Hellman Exchange (ECDHE) protocol in combination with standard AES-GCM-256 block ciphers to establish secure, ephemeral session keys.",
      "Rule of thumb: Never store raw private keys in any repository. Use cloud key management services (KMS) with strict IAM policies and hardware security modules."
    ],
    formula: "y^2 = x^3 + a*x + b (mod p)  -- Elliptic Curve Equation"
  },
  {
    pageNum: 4,
    title: "COMPUTATIONAL ALGORITHMS & BIG-O BOUNDS",
    subtitle: "Section 2.2: Time Complexities and Recurrence Structures",
    paragraphs: [
      "Sorting and indexing large-scale datasets requires a thorough understanding of asymptotic bounds. We investigate linear, logarithmic, and quadratic computational patterns.",
      "Master Theorem application: When analyzing recurrences of the form T(n) = aT(n/b) + f(n), we identify three distinct operational cases that determine the bound.",
      "Recommended practices: Prefer merge sort or heap sort for guaranteed O(N log N) worst-case time, while utilizing quicksort for optimal in-place average-case performance."
    ],
    formula: "T(n) = a * T(n/b) + O(n^d)  -- Recurrence Relation Template"
  },
  {
    pageNum: 5,
    title: "DATABASE NORMALIZATION AND SCHEMA MAPPING",
    subtitle: "Section 3.1: First, Second, and Third Normal Forms",
    paragraphs: [
      "Relational integrity relies heavily on systematic schema design. We review normalization techniques up to Boyce-Codd Normal Form (BCNF) to eliminate data redundancy.",
      "By segregating independent entities into distinct, key-linked relations, we prevent update anomalies and maintain transaction safety guarantees (ACID).",
      "Practical advice: Over-normalization can lead to excessive SQL join queries. Selectively denormalize read-heavy metrics to maximize server lookup speeds."
    ],
    formula: "R -> (X intersect Y) is a valid Functional Dependency"
  },
  {
    pageNum: 6,
    title: "SECURE PERSISTENCE & TRANSACTION LOGS",
    subtitle: "Section 3.2: Write-Ahead Logging (WAL) and Durability",
    paragraphs: [
      "To guarantee durability under hardware or power failure states, modern databases implement Write-Ahead Logging. Every mutation is appended to a log before index updates.",
      "During boot-up recovery cycles, the engine replays the redo-log to reconstruct uncommitted transactions and rollbacks failed operations securely.",
      "Important Note: Disks often buffer writes. Force a physical sync (fsync) to ensure the journal entry is non-volatile before confirming the API request."
    ],
    formula: "Durability = Log_committed && Fsync_completed"
  },
  {
    pageNum: 7,
    title: "DISTRIBUTED CONSENSUS AND RAFT ELECTORATES",
    subtitle: "Section 4.1: Leader Election and Log Replication",
    paragraphs: [
      "In a partitioned network environment, distributed databases must agree on state transitions. Raft divides consensus into leader election, log replication, and safety.",
      "The leader handles all client mutations, appends them to its log, and directs followers to replicate the entry before committing it to the state machine.",
      "In the event of network partition, only the partition containing a true majority (quorum) can commit new transactions, preventing split-brain inconsistencies."
    ],
    formula: "Quorum = floor(N / 2) + 1  -- Consensus Majority Requirement"
  },
  {
    pageNum: 8,
    title: "PREVENTING MEMORY LEAKS IN COMPILING ENGINES",
    subtitle: "Section 4.2: Reference Counting and Garbage Collection",
    paragraphs: [
      "Unmanaged memory allocation risks resource exhaustion. We contrast manual allocation (malloc/free), smart pointer reference tracking, and generational garbage collection.",
      "Cyclic references can trick naive reference counting systems, leaving dead allocations in memory. Utilize weak references to break ownership loops.",
      "Engine profile guidelines: Monitor heap consumption profiles during heavy workloads to isolate uncollected elements or global reference retains."
    ],
    formula: "Live_Memory = Root_Set + Reachable_Graph"
  },
  {
    pageNum: 9,
    title: "HIGH-THROUGHPUT NETWORKING & EVENT LOOPS",
    subtitle: "Section 5.1: Non-Blocking Socket I/O and Select/Poll",
    paragraphs: [
      "Traditional thread-per-connection socket models scale poorly under thousands of concurrent requests. We examine multiplexed, non-blocking socket handling.",
      "By utilizing kernel event queues like epoll or kqueue, a single-threaded server loop can monitor thousands of active sockets and dispatch handlers only on ready states.",
      "Under heavy I/O, this asynchronous pattern reduces OS context-switching overhead, offering maximum throughput performance with minimal CPU footprint."
    ],
    formula: "Max_Connections = FD_Limit * Thread_Efficiency"
  },
  {
    pageNum: 10,
    title: "SUMMARY SHEET & PRE-EXAM BLUEPRINTS",
    subtitle: "Final Appendix: Essential Equations and Cheat-Sheet",
    paragraphs: [
      "This concludes the study resources guide. Review all mathematical formulas, cache alignment strategies, and distributed consensus models.",
      "Ensure you can replicate the algorithms from Page 4 and normal forms from Page 5 during final system certification reviews.",
      "Good luck with your academic studies. Keep practicing clean coding guidelines, modular development, and rigorous automated validations."
    ],
    formula: "Success = Practice * (Theoretical_Base + Coding_Hours)"
  }
];

export function PremiumPdfViewer({
  resource,
  userId,
  onClose,
  onShowNotification
}: PremiumPdfViewerProps) {
  // Viewer state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(100);
  const [searchText, setSearchText] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Array<{ page: number; text: string }>>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState<number>(-1);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const textInputRef = useRef<HTMLInputElement | null>(null);

  // Total pages count
  const totalPages = ACADEMIC_PAGES.length;

  // Load saved reading progress on mount
  useEffect(() => {
    const loadProgress = async () => {
      try {
        const rp = await resourceService.getReadingProgress(userId, resource.resourceId);
        if (rp) {
          setCurrentPage(rp.lastReadPage || 1);
          setBookmarks(rp.bookmarks || []);
          onShowNotification(`Resumed PDF from last read page: ${rp.lastReadPage}`, 'success');
        }
      } catch (err) {
        console.warn('Could not restore PDF progress:', err);
      } finally {
        setLoading(false);
      }
    };
    loadProgress();
  }, [resource.resourceId, userId]);

  // Save progress when page changes
  const saveProgress = async (newPage: number, currentBookmarks = bookmarks) => {
    const progressPercent = Math.round((newPage / totalPages) * 100);
    const progressObj: ReadingProgress = {
      userId,
      resourceId: resource.resourceId,
      lastReadPage: newPage,
      totalPages,
      progressPercent,
      bookmarks: currentBookmarks,
      updatedAt: new Date().toISOString()
    };
    await resourceService.saveReadingProgress(progressObj);
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    saveProgress(page);
  };

  const handleToggleBookmark = () => {
    let updated: number[];
    if (bookmarks.includes(currentPage)) {
      updated = bookmarks.filter(p => p !== currentPage);
      onShowNotification(`Removed bookmark from Page ${currentPage}`, 'success');
    } else {
      updated = [...bookmarks, currentPage].sort((a, b) => a - b);
      onShowNotification(`Bookmarked Page ${currentPage}`, 'success');
    }
    setBookmarks(updated);
    saveProgress(currentPage, updated);
  };

  // Search through all page paragraphs for matches
  useEffect(() => {
    if (!searchText.trim()) {
      setSearchResults([]);
      setCurrentResultIndex(-1);
      return;
    }

    const query = searchText.toLowerCase();
    const matches: Array<{ page: number; text: string }> = [];

    ACADEMIC_PAGES.forEach(page => {
      page.paragraphs.forEach(p => {
        if (p.toLowerCase().includes(query)) {
          matches.push({ page: page.pageNum, text: p });
        }
      });
      if (page.title.toLowerCase().includes(query) || page.subtitle.toLowerCase().includes(query)) {
        matches.push({ page: page.pageNum, text: page.title });
      }
    });

    setSearchResults(matches);
    if (matches.length > 0) {
      setCurrentResultIndex(0);
      // Automatically jump to first match page
      setCurrentPage(matches[0].page);
    } else {
      setCurrentResultIndex(-1);
    }
  }, [searchText]);

  const handleNextSearchMatch = () => {
    if (searchResults.length === 0) return;
    const nextIdx = (currentResultIndex + 1) % searchResults.length;
    setCurrentResultIndex(nextIdx);
    setCurrentPage(searchResults[nextIdx].page);
  };

  const handlePrevSearchMatch = () => {
    if (searchResults.length === 0) return;
    const prevIdx = (currentResultIndex - 1 + searchResults.length) % searchResults.length;
    setCurrentResultIndex(prevIdx);
    setCurrentPage(searchResults[prevIdx].page);
  };

  // Highlight matches in paragraph text
  const renderHighlightedText = (text: string) => {
    if (!text) return "";
    if (!searchText.trim()) return text;
    const parts = text.split(new RegExp(`(${escapeRegExp(searchText)})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === searchText.toLowerCase() ? (
            <mark key={i} className="bg-yellow-400 text-black px-0.5 rounded font-bold animate-pulse">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  function escapeRegExp(str: string) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const activePageData = ACADEMIC_PAGES.find(p => p.pageNum === currentPage) || ACADEMIC_PAGES[0];

  return (
    <div 
      ref={containerRef}
      className={`fixed inset-0 z-50 flex flex-col font-sans transition-colors duration-300 ${isDarkMode ? 'bg-[#060a13] text-slate-100' : 'bg-slate-50 text-slate-800'}`}
      id="nexus-pdf-viewer-overlay"
    >
      {/* 1. Header Navigation Bar */}
      <header className={`px-4 py-3 flex flex-col md:flex-row items-center justify-between border-b transition-colors duration-300 ${isDarkMode ? 'border-white/10 bg-[#090e18]/95' : 'border-slate-200 bg-white shadow-sm'}`}>
        <div className="flex items-center space-x-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
              <FileText size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold font-sans line-clamp-1 max-w-[180px] md:max-w-xs">{resource.title}</h4>
              <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Premium PDF e-Reader</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors md:hidden ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-slate-400' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
          >
            <X size={15} />
          </button>
        </div>

        {/* Search controls row */}
        <div className="flex items-center space-x-2 mt-2.5 md:mt-0 w-full md:w-auto justify-center">
          <div className="relative flex-1 md:flex-initial">
            <input 
              ref={textInputRef}
              type="text"
              placeholder="Search documents..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className={`w-full md:w-48 pl-8 pr-2 py-1.5 text-xs rounded-xl focus:outline-none focus:ring-1 ${
                isDarkMode 
                  ? 'bg-slate-900 border-white/5 focus:border-[#39FF14]/50 focus:ring-[#39FF14]/20 text-white placeholder-slate-500' 
                  : 'bg-slate-100 border-slate-200 focus:border-emerald-500 focus:ring-emerald-200 text-slate-800 placeholder-slate-400'
              }`}
            />
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            {searchText && (
              <button 
                onClick={() => setSearchText('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X size={10} />
              </button>
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="flex items-center space-x-1.5 bg-white/5 px-2 py-1 rounded-xl border border-white/5 shrink-0 text-[10px] font-mono">
              <span className="text-slate-400">{currentResultIndex + 1}/{searchResults.length} matches</span>
              <div className="flex space-x-1">
                <button onClick={handlePrevSearchMatch} className="p-0.5 hover:text-[#39FF14] transition-colors">
                  <ChevronLeft size={12} />
                </button>
                <button onClick={handleNextSearchMatch} className="p-0.5 hover:text-[#39FF14] transition-colors">
                  <ChevronRight size={12} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Command deck */}
        <div className="hidden md:flex items-center space-x-3">
          {/* Zoom Controls */}
          <div className="flex items-center space-x-1.5 border-r border-white/10 pr-3">
            <button 
              onClick={() => setZoom(prev => Math.max(50, prev - 10))}
              className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-white/5 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}
              title="Zoom Out"
            >
              <ZoomOut size={15} />
            </button>
            <span className="text-[10px] font-mono text-slate-500 w-10 text-center">{zoom}%</span>
            <button 
              onClick={() => setZoom(prev => Math.min(200, prev + 10))}
              className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-white/5 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}
              title="Zoom In"
            >
              <ZoomIn size={15} />
            </button>
          </div>

          {/* Theme Switcher */}
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2 rounded-xl border transition-colors ${
              isDarkMode 
                ? 'bg-white/5 border-white/10 text-amber-400 hover:bg-white/10' 
                : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
            }`}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* Bookmark Trigger */}
          <button 
            onClick={handleToggleBookmark}
            className={`p-2 rounded-xl border transition-all flex items-center space-x-1 ${
              bookmarks.includes(currentPage)
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'
            }`}
            title="Bookmark Current Page"
          >
            {bookmarks.includes(currentPage) ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
            <span className="text-[9px] font-mono">Page {currentPage}</span>
          </button>

          {/* Fullscreen Trigger */}
          <button 
            onClick={toggleFullscreen}
            className={`p-2 rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:text-white transition-all`}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>

          {/* Desktop Close */}
          <button 
            onClick={onClose}
            className={`p-2 rounded-xl transition-all font-bold cursor-pointer ${
              isDarkMode 
                ? 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20' 
                : 'bg-red-50 border border-red-200 text-red-600 hover:bg-red-100'
            }`}
          >
            <X size={15} />
          </button>
        </div>
      </header>

      {/* 2. Secondary Control Bar (Responsive page navigation) */}
      <section className={`px-4 py-2 flex items-center justify-between border-b text-xs font-mono transition-colors duration-300 ${
        isDarkMode ? 'bg-[#080d16] border-white/5 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
      }`}>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-1 rounded bg-white/5 hover:bg-[#39FF14]/15 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          <span>Page {currentPage} of {totalPages}</span>
          <button 
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-1 rounded bg-white/5 hover:bg-[#39FF14]/15 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Mobile quick icons bar */}
        <div className="flex items-center space-x-1.5 md:hidden">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-1.5 rounded hover:bg-white/5"
          >
            {isDarkMode ? <Sun size={13} className="text-amber-400" /> : <Moon size={13} />}
          </button>
          <button 
            onClick={handleToggleBookmark}
            className={`p-1.5 rounded ${bookmarks.includes(currentPage) ? 'text-amber-400 bg-amber-500/10' : 'text-slate-400'}`}
          >
            <Bookmark size={13} />
          </button>
        </div>

        <div className="flex items-center space-x-2 text-[10px]">
          <BookMarked size={12} className="text-slate-500" />
          <span className="text-slate-500">Bookmarks:</span>
          {bookmarks.length === 0 ? (
            <span className="text-slate-600">None</span>
          ) : (
            <div className="flex space-x-1">
              {bookmarks.map(p => (
                <button 
                  key={p}
                  onClick={() => handlePageChange(p)}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                    p === currentPage 
                      ? 'bg-[#39FF14]/20 text-[#39FF14] border border-[#39FF14]/30' 
                      : 'bg-white/5 text-slate-300 hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 3. Main Document Canvas Wrapper */}
      <main className="flex-1 overflow-auto p-4 flex justify-center items-start scroll-smooth relative select-text">
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-4 border-[#39FF14]/20 border-t-[#39FF14] rounded-full animate-spin" />
            <p className="text-xs font-mono text-slate-400 tracking-wider">RESTORYING PREVIOUS PROGRESS...</p>
          </div>
        ) : (
          <motion.div 
            initial={{ scale: 0.97, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className={`w-full max-w-2xl border transition-all duration-300 rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden ${
              isDarkMode 
                ? 'bg-[#0b1220] border-white/10 text-slate-100 shadow-black/80' 
                : 'bg-white border-slate-200 text-slate-800 shadow-slate-300'
            }`}
            style={{ 
              transform: `scale(${zoom / 100})`, 
              transformOrigin: 'top center',
              fontSize: '14px',
              lineHeight: '1.7'
            }}
          >
            {/* Watermark header */}
            <div className="flex justify-between items-center border-b border-dashed border-slate-500/20 pb-4 mb-6 text-[10px] font-mono text-slate-500 tracking-widest uppercase">
              <span>NEXUS STUDY RESOURCES SYSTEM</span>
              <span className="text-[#39FF14] font-bold">SECURE ENROLLED ACCESS</span>
            </div>

            {/* Academic Content Block */}
            <article className="space-y-6">
              <header className="space-y-1">
                <span className="text-[10px] font-mono font-extrabold text-[#39FF14] uppercase tracking-widest bg-[#39FF14]/5 border border-[#39FF14]/25 px-2.5 py-1 rounded-lg">
                  PAGE {activePageData.pageNum} OF {totalPages}
                </span>
                <h1 className="text-lg md:text-xl font-sans font-black tracking-tight leading-tight pt-2">
                  {renderHighlightedText(activePageData.title)}
                </h1>
                <p className="text-xs font-mono text-slate-400 italic">
                  {renderHighlightedText(activePageData.subtitle)}
                </p>
              </header>

              <hr className="border-slate-500/10" />

              {/* Body Text */}
              <div className="space-y-4 font-sans text-xs md:text-sm leading-relaxed text-justify opacity-90">
                {activePageData.paragraphs.map((para, i) => (
                  <p key={i}>
                    {renderHighlightedText(para)}
                  </p>
                ))}
              </div>

              {/* Mathematical Equation Card */}
              {activePageData.formula && (
                <div className={`p-4 rounded-2xl border font-mono text-xs md:text-sm leading-snug flex items-center justify-between overflow-x-auto ${
                  isDarkMode 
                    ? 'bg-black/40 border-white/5 text-[#39FF14]' 
                    : 'bg-slate-50 border-slate-200 text-emerald-600'
                }`}>
                  <span className="font-semibold">{renderHighlightedText(activePageData.formula)}</span>
                  <Award size={14} className="shrink-0 ml-3 opacity-60" />
                </div>
              )}
            </article>

            {/* Simulated Academic Figure */}
            <div className={`mt-8 p-4 rounded-2xl border text-center space-y-2 ${
              isDarkMode ? 'bg-white/[0.01] border-white/5' : 'bg-slate-50 border-slate-100'
            }`}>
              <div className="h-1 bg-gradient-to-r from-transparent via-[#39FF14]/40 to-transparent w-3/4 mx-auto" />
              <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                Fig 1.2: System Architecture Relations Matrix, Page {activePageData.pageNum}
              </p>
            </div>

            {/* Footer progress tracker */}
            <footer className="mt-12 pt-4 border-t border-dashed border-slate-500/20 flex flex-col md:flex-row items-center justify-between text-[9px] font-mono text-slate-500 gap-3">
              <span className="uppercase">STUDENT ID: {userId.substring(0, 10)}...</span>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-[#39FF14] animate-ping" />
                <span>PROGRESS: {Math.round((currentPage / totalPages) * 100)}% READ</span>
              </div>
              <span className="uppercase">{resource.fileSize} DOCUMENT</span>
            </footer>
          </motion.div>
        )}
      </main>

      {/* 4. Bottom Footer Navigation Hub */}
      <footer className={`px-4 py-3 flex items-center justify-between border-t transition-colors duration-300 ${
        isDarkMode ? 'border-white/10 bg-[#070b13]' : 'border-slate-200 bg-slate-100'
      }`}>
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`px-3 py-1.5 rounded-xl border text-xs font-bold font-sans flex items-center space-x-1 cursor-pointer transition-all ${
            isDarkMode 
              ? 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-20' 
              : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700 disabled:opacity-20'
          }`}
        >
          <ChevronLeft size={13} />
          <span>Previous Page</span>
        </button>

        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider hidden sm:inline">
          Last read page autosaved securely to the cloud
        </span>

        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold font-sans flex items-center space-x-1 cursor-pointer transition-all ${
            isDarkMode 
              ? 'bg-[#39FF14] border-transparent text-black hover:bg-[#32e011] disabled:opacity-20' 
              : 'bg-emerald-600 border-transparent text-white hover:bg-emerald-700 disabled:opacity-20'
          }`}
        >
          <span>Next Page</span>
          <ChevronRight size={13} />
        </button>
      </footer>
    </div>
  );
}
