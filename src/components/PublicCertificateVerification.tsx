import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Award, 
  Calendar, 
  ExternalLink, 
  Search, 
  Loader2, 
  ChevronRight,
  GraduationCap,
  Sparkles,
  UserCheck
} from 'lucide-react';
import { CertificateVerification } from '../types/certificate';
import { certificateService } from '../services/certificateService';

interface PublicCertificateVerificationProps {
  initialVerificationId?: string;
  onClose: () => void;
}

export function PublicCertificateVerification({
  initialVerificationId = '',
  onClose
}: PublicCertificateVerificationProps) {
  const [queryId, setQueryId] = useState<string>(initialVerificationId);
  const [verification, setVerification] = useState<CertificateVerification | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleVerify = async (idToVerify: string) => {
    if (!idToVerify.trim()) return;
    setLoading(true);
    setError('');
    setVerification(null);
    try {
      const result = await certificateService.verifyCertificate(idToVerify.trim());
      if (result) {
        setVerification(result);
      } else {
        setError('No credential found with this Certificate ID. Please double check characters.');
      }
    } catch (err) {
      console.error('Verification error:', err);
      setError('An error occurred during verification lookup. Try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialVerificationId) {
      handleVerify(initialVerificationId);
    }
  }, [initialVerificationId]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden text-slate-100">
      
      {/* Background Ornaments */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#39FF14]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-xl space-y-6 relative z-10">
        
        {/* Portal Branding */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
              <GraduationCap className="text-[#39FF14]" size={24} />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            NEXUS CREDENTIALS REGISTER
          </h1>
          <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
            Secure Cryptographic Student Ledger
          </p>
        </div>

        {/* Search verification card */}
        <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-5 md:p-6 backdrop-blur-xl shadow-2xl space-y-5">
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold text-white flex items-center space-x-1.5">
              <Search size={14} className="text-[#39FF14]" />
              <span>Verify Completion Certificate</span>
            </h3>
            <p className="text-[10px] text-slate-400 font-sans leading-relaxed">
              Enter any Nexus certificate serial code below to instantly inspect graduation criteria, student profile matches, and cryptographically verified issuance timestamps.
            </p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. CERT_170420"
              value={queryId}
              onChange={(e) => setQueryId(e.target.value)}
              className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#39FF14]/50"
            />
            <button
              onClick={() => handleVerify(queryId)}
              disabled={loading}
              className="px-5 py-2.5 bg-[#39FF14] hover:bg-[#2eff05] text-slate-950 text-xs font-bold uppercase rounded-2xl transition-all shadow cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={13} /> : <ShieldCheck size={13} />}
              <span>Verify</span>
            </button>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center"
            >
              <p className="text-[10.5px] text-red-400 font-medium">{error}</p>
            </motion.div>
          )}

          {/* Loader */}
          {loading && (
            <div className="py-10 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="text-[#39FF14] animate-spin" size={24} />
              <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest animate-pulse">
                Consulting secure blockchain index...
              </p>
            </div>
          )}

          {/* Verified Credential Details */}
          <AnimatePresence>
            {verification && !loading && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-4 pt-1"
              >
                {/* Visual verified badge */}
                <div className="bg-emerald-950/40 border border-[#39FF14]/30 rounded-2xl p-4 flex items-center space-x-3.5 shadow-inner">
                  <div className="w-10 h-10 bg-[#39FF14]/10 rounded-xl flex items-center justify-center border border-[#39FF14]/30 shrink-0">
                    <ShieldCheck className="text-[#39FF14] animate-pulse" size={22} />
                  </div>
                  <div>
                    <span className="text-[7.5px] font-mono text-[#39FF14] uppercase tracking-wider block font-bold">LEDGER STATUS: SIGNED SECURE</span>
                    <h4 className="text-[13px] font-bold text-white leading-tight">
                      Credential Successfully Verified
                    </h4>
                    <span className="text-[9px] text-slate-400">This certificate is fully genuine and unaltered.</span>
                  </div>
                </div>

                {/* Metadata list */}
                <div className="bg-black/20 border border-white/5 rounded-2xl p-4 space-y-3 font-sans">
                  <div className="flex justify-between items-start pb-2 border-b border-white/5">
                    <div>
                      <span className="text-[8px] font-mono text-slate-500 uppercase block">Graduated Scholar</span>
                      <span className="text-xs font-bold text-white">{verification.studentName}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[8px] font-mono text-slate-500 uppercase block">Verification ID</span>
                      <span className="text-xs font-bold text-[#39FF14] font-mono">{verification.verificationId}</span>
                    </div>
                  </div>

                  <div className="pb-2 border-b border-white/5">
                    <span className="text-[8px] font-mono text-slate-500 uppercase block">Certified Specialization Course</span>
                    <span className="text-xs font-bold text-white">{verification.courseName}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[8px] font-mono text-slate-500 uppercase block">Date Issued</span>
                      <span className="text-xs font-bold text-white">{new Date(verification.issueDate).toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="text-[8px] font-mono text-slate-500 uppercase block">Status</span>
                      <span className="text-xs font-bold text-emerald-400 font-mono">GRADUATED ACTIVE</span>
                    </div>
                  </div>
                </div>

                {/* Secure criteria timeline details */}
                <div className="border border-white/5 bg-slate-900/40 rounded-2xl p-4 space-y-2.5">
                  <div className="text-[8.5px] font-mono text-slate-500 uppercase tracking-wider">
                    Graduation Milestones Met:
                  </div>
                  <div className="space-y-1.5 text-[10.5px]">
                    <div className="flex items-center space-x-2 text-[#39FF14]">
                      <UserCheck size={12} />
                      <span className="text-white">Student matriculation validated and active.</span>
                    </div>
                    <div className="flex items-center space-x-2 text-[#39FF14]">
                      <UserCheck size={12} />
                      <span className="text-white">100% video lectures ledger verified.</span>
                    </div>
                    <div className="flex items-center space-x-2 text-[#39FF14]">
                      <UserCheck size={12} />
                      <span className="text-white">Passed required chapter assessment quizzes.</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Back button */}
        <div className="text-center pt-2">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs font-mono font-bold tracking-wider uppercase text-slate-300 transition-colors cursor-pointer"
          >
            Go Back to Nexus Academy
          </button>
        </div>

      </div>
    </div>
  );
}
