import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Award, 
  Search, 
  ArrowUpDown, 
  Download, 
  Share2, 
  Eye, 
  Loader2, 
  Compass, 
  Sparkles,
  ExternalLink,
  ShieldCheck,
  ArrowLeft
} from 'lucide-react';
import { Certificate } from '../types/certificate';
import { certificateService } from '../services/certificateService';
import { PremiumCertificatePreview } from './PremiumCertificatePreview';
import { Course } from '../types/course';
import { auth } from '../services/firebase';

interface MyCertificatesViewProps {
  userProfile: { fullName: string; username: string; photoURL?: string } | null;
  onNavigateToDiscover: () => void;
  onBackToProfile?: () => void;
  onShowNotification: (message: string, type: 'success' | 'error') => void;
}

export function MyCertificatesView({
  userProfile,
  onNavigateToDiscover,
  onBackToProfile,
  onShowNotification
}: MyCertificatesViewProps) {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);

  useEffect(() => {
    async function loadCertificates() {
      setLoading(true);
      const uId = auth.currentUser?.uid || userProfile?.username || '';
      if (!uId) {
        setLoading(false);
        return;
      }
      try {
        const list = await certificateService.getUserCertificates(uId);
        setCertificates(list);
      } catch (err) {
        console.warn('Failed to load certificates:', err);
        onShowNotification('Could not load graduation certificates.', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadCertificates();
  }, [userProfile]);

  // Filtering & Sorting
  const filtered = certificates.filter(cert => {
    return cert.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
           cert.verificationId.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const sorted = [...filtered].sort((a, b) => {
    const timeA = new Date(a.issueDate).getTime();
    const timeB = new Date(b.issueDate).getTime();
    return sortBy === 'newest' ? timeB - timeA : timeA - timeB;
  });

  const handleShare = (cert: Certificate, e: React.MouseEvent) => {
    e.stopPropagation();
    const verificationUrl = `${window.location.origin}?verify=${cert.verificationId}`;
    if (navigator.share) {
      navigator.share({
        title: `My Graduation Credential - ${cert.courseName}`,
        text: `I completed "${cert.courseName}" on Nexus Academy! Check out my official secure verified certificate.`,
        url: verificationUrl
      }).then(() => {
        onShowNotification('Certificate shared successfully!', 'success');
      }).catch(console.warn);
    } else {
      navigator.clipboard.writeText(verificationUrl);
      onShowNotification('Verification link copied to clipboard!', 'success');
    }
  };

  const handleDownload = (cert: Certificate, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCertificate(cert);
    onShowNotification('Opening print-ready view for PDF compilation...', 'success');
  };

  return (
    <div className="space-y-5 px-1 max-w-4xl mx-auto" id="my-certificates-ledger-view">
      
      {/* Back to Profile / Navigation */}
      <div className="flex items-center justify-between pb-1">
        <button
          onClick={() => onBackToProfile ? onBackToProfile() : onNavigateToDiscover()}
          className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-[#39FF14] font-mono uppercase tracking-wider transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Back to Profile</span>
        </button>
      </div>

      {/* View Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-900/40 p-4 border border-white/5 rounded-3xl backdrop-blur-md">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Award className="text-[#39FF14] animate-pulse" size={18} />
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#39FF14]">
              Verified Credentials Ledger
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            My Graduation Certificates
          </h2>
          <p className="text-[10px] text-slate-400 font-sans leading-relaxed">
            Congratulations! These are your earned, cryptographic blockchain verified completion certificates.
          </p>
        </div>
        
        {/* Total stats counter */}
        <div className="shrink-0 flex items-center space-x-2 bg-white/5 border border-white/10 px-3.5 py-2 rounded-2xl">
          <span className="text-[16px] font-bold font-mono text-[#39FF14]">
            {certificates.length}
          </span>
          <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">
            Earned Credential{certificates.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Query Filters */}
      {certificates.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2.5">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={13} />
            <input
              type="text"
              placeholder="Search by course name or certificate ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/80 border border-white/5 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#39FF14]/50"
            />
          </div>

          {/* Sort trigger */}
          <button
            onClick={() => setSortBy(prev => prev === 'newest' ? 'oldest' : 'newest')}
            className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-slate-900 border border-white/5 rounded-2xl text-xs text-slate-300 hover:text-white hover:border-[#39FF14]/20 transition-all cursor-pointer"
          >
            <ArrowUpDown size={12} className="text-slate-500" />
            <span className="font-mono text-[10px] uppercase">
              Sort: {sortBy === 'newest' ? 'Newest Issued' : 'Oldest Issued'}
            </span>
          </button>
        </div>
      )}

      {/* Primary Certificates Stack */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="text-[#39FF14] animate-spin" size={24} />
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest animate-pulse">
            Retrieving secure verified credentials...
          </p>
        </div>
      ) : sorted.length === 0 ? (
        <div className="border border-dashed border-white/5 rounded-3xl p-10 text-center space-y-4 bg-slate-950/20 backdrop-blur-sm">
          <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto text-slate-500">
            <Award size={20} />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-white">No graduation credentials found</h3>
            <p className="text-[10px] text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
              {searchQuery 
                ? 'No certified courses matched your filter criteria. Try expanding search tags.' 
                : 'Complete all required lessons and clear the quiz assessments in any enrolled course to unlock your premium secure certificates.'}
            </p>
          </div>
          
          {!searchQuery && (
            <button
              onClick={onNavigateToDiscover}
              className="px-5 py-2.5 bg-[#39FF14] hover:bg-[#2eff05] text-slate-950 text-xs font-bold uppercase rounded-xl transition-all shadow-md cursor-pointer flex items-center space-x-1.5 mx-auto"
            >
              <Compass size={13} />
              <span>Browse Programs & Start Learning</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3.5">
          {sorted.map((cert) => (
            <motion.div
              key={cert.certificateId}
              layoutId={cert.certificateId}
              onClick={() => setSelectedCertificate(cert)}
              className="bg-slate-950/40 border border-white/5 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-[#39FF14]/30 hover:bg-slate-950/80 transition-all duration-300 relative group overflow-hidden cursor-pointer"
            >
              {/* Premium Glow effect on hover */}
              <div className="absolute -inset-px bg-gradient-to-r from-[#39FF14]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none" />

              {/* Certificate Information */}
              <div className="flex items-start space-x-3.5 min-w-0">
                {/* Visual Badge Icon */}
                <div className="w-11 h-11 rounded-xl bg-[#39FF14]/5 border border-[#39FF14]/15 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-[#39FF14]/10 transition-colors">
                  <Award className="text-[#39FF14] group-hover:scale-110 transition-transform" size={18} />
                </div>

                <div className="min-w-0 space-y-1">
                  <span className="text-[8px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#39FF14]/10 text-[#39FF14] border border-[#39FF14]/20">
                    VERIFIED • ID {cert.verificationId}
                  </span>
                  <h3 className="text-xs font-bold text-white group-hover:text-[#39FF14] transition-colors leading-snug truncate">
                    {cert.courseName}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] font-mono text-slate-400">
                    <span>👨‍🏫 Instructor: {cert.instructorName}</span>
                    <span>•</span>
                    <span>Issued: {new Date(cert.issueDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Utility buttons */}
              <div className="flex items-center space-x-1.5 shrink-0 ml-auto md:ml-0">
                <button
                  onClick={(e) => handleShare(cert, e)}
                  className="p-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl transition-all border border-white/5 cursor-pointer"
                  title="Share link"
                >
                  <Share2 size={13} />
                </button>
                <button
                  onClick={(e) => handleDownload(cert, e)}
                  className="p-2 bg-[#39FF14]/15 hover:bg-[#39FF14]/25 border border-[#39FF14]/30 text-[#39FF14] rounded-xl transition-all cursor-pointer"
                  title="Print/Download PDF"
                >
                  <Download size={13} />
                </button>
                <button
                  className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-white rounded-xl font-mono uppercase tracking-wider flex items-center space-x-1 cursor-pointer"
                >
                  <Eye size={12} className="text-slate-400" />
                  <span className="text-[9px]">View</span>
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Floating active Certificate overlay */}
      <AnimatePresence>
        {selectedCertificate && (
          <PremiumCertificatePreview
            certificate={selectedCertificate}
            onClose={() => setSelectedCertificate(null)}
            onShowNotification={onShowNotification}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
