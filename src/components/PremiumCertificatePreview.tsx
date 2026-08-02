import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Download, 
  Printer, 
  Share2, 
  Copy, 
  Check, 
  X, 
  ShieldCheck, 
  Award, 
  FileText,
  Clock,
  ExternalLink
} from 'lucide-react';
import { Certificate } from '../types/certificate';

interface PremiumCertificatePreviewProps {
  certificate: Certificate;
  onClose: () => void;
  onShowNotification: (message: string, type: 'success' | 'error') => void;
}

export function PremiumCertificatePreview({
  certificate,
  onClose,
  onShowNotification
}: PremiumCertificatePreviewProps) {
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  const verificationUrl = `${window.location.origin}?verify=${certificate.verificationId}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(verificationUrl);
      setCopied(true);
      onShowNotification('Verification link copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      onShowNotification('Failed to copy verification link.', 'error');
    }
  };

  const handlePrint = () => {
    // Open a new printable window or trigger standard print on the certificate content container
    const printContent = document.getElementById('printable-certificate-frame');
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      onShowNotification('Pop-up blocker is active. Please allow pop-ups to print.', 'error');
      return;
    }

    const htmlContent = `
      <html>
        <head>
          <title>Certificate - ${certificate.studentName}</title>
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;1,400&family=Inter:wght@400;600;700&family=JetBrains+Mono&display=swap');
            body {
              background-color: #030712;
              color: #f3f4f6;
              font-family: 'Inter', sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
            }
            .cert-container {
              width: 1050px;
              height: 700px;
              padding: 48px;
              position: relative;
              background: linear-gradient(135deg, #090d16 0%, #030712 100%);
              border: 12px solid #39FF14;
              border-image: linear-gradient(to right, #39FF14, #10B981, #059669) 1;
              box-sizing: border-box;
            }
            .font-serif {
              font-family: 'Playfair Display', serif;
            }
            .font-mono {
              font-family: 'JetBrains Mono', monospace;
            }
            @media print {
              body {
                background: white;
                color: black;
              }
              .cert-container {
                width: 100%;
                height: 100%;
                border: 16px solid #10B981 !important;
                background: white !important;
                color: black !important;
                box-shadow: none !important;
              }
              .text-white { color: black !important; }
              .text-slate-400 { color: #4b5563 !important; }
              .text-[#39FF14] { color: #10B981 !important; }
              .bg-slate-900 { background-color: #f3f4f6 !important; }
              .border-white\\/10 { border-color: #e5e7eb !important; }
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="cert-container text-center flex flex-col justify-between shadow-2xl">
            <!-- Top corner design details -->
            <div class="absolute top-4 left-4 text-[9px] font-mono tracking-widest text-[#39FF14]">NEXUS ACADEMY OF ADVANCED TECHNOLOGY</div>
            <div class="absolute top-4 right-4 text-[9px] font-mono tracking-widest text-slate-400">SECURE BLOCKCHAIN VERIFICATION</div>

            <!-- Header Section -->
            <div class="space-y-2 mt-4">
              <div class="text-[12px] font-mono uppercase tracking-widest text-[#39FF14]">Official Graduation Credential</div>
              <h1 class="text-4xl font-serif font-bold text-white tracking-wide">CERTIFICATE OF COMPLETION</h1>
              <div class="w-24 h-0.5 bg-gradient-to-r from-[#39FF14] to-emerald-500 mx-auto"></div>
            </div>

            <!-- Body Section -->
            <div class="space-y-6">
              <p class="text-slate-400 italic text-sm font-serif">This is to officially certify and record that</p>
              <h2 class="text-5xl font-serif font-bold italic text-white tracking-normal text-gradient py-1">${certificate.studentName}</h2>
              <p class="text-slate-400 text-sm max-w-2xl mx-auto leading-relaxed">
                has successfully fulfilled all required curriculum hours, parsed lessons ledger, completed complex assessments, and met the graduation benchmarks for the advanced specialization course:
              </p>
              <h3 class="text-2xl font-bold text-[#39FF14] tracking-wide uppercase font-sans">${certificate.courseName}</h3>
            </div>

            <!-- Signatures & Verification Section -->
            <div class="flex items-end justify-between px-12 pb-4">
              <!-- Left Signature -->
              <div class="text-left w-48 border-t border-slate-700 pt-3">
                <div class="font-serif italic text-white text-md mb-0.5">Alex Carter</div>
                <div class="text-[9px] font-mono text-slate-400 uppercase tracking-wider">Tutor / Curriculum Lead</div>
              </div>

              <!-- Center Emblem -->
              <div class="flex flex-col items-center">
                <div class="w-16 h-16 rounded-full border-2 border-[#39FF14] flex items-center justify-center bg-[#39FF14]/5 mb-1">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-8 h-8 text-[#39FF14]">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <span class="text-[8px] font-mono text-slate-400 uppercase tracking-widest">VERIFIED SECURE</span>
              </div>

              <!-- Right QR & Metadata -->
              <div class="text-right flex flex-col items-end space-y-1">
                <img src="${certificate.qrCodePlaceholderUrl}" alt="Verification QR" class="w-16 h-16 border border-white/10 rounded-lg p-0.5" />
                <div class="text-[8px] font-mono text-slate-400">ID: ${certificate.verificationId}</div>
                <div class="text-[8px] font-mono text-slate-400">Date: ${new Date(certificate.issueDate).toLocaleDateString()}</div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleMockPdfDownload = () => {
    // High-quality print dialog trigger
    onShowNotification('Compiling print-ready high fidelity PDF matrix...', 'success');
    setTimeout(() => {
      handlePrint();
    }, 1000);
  };

  const handleShare = () => {
    setSharing(true);
    if (navigator.share) {
      navigator.share({
        title: `Nexus Certificate - ${certificate.courseName}`,
        text: `I've successfully completed the course "${certificate.courseName}" on Nexus Academy! Check out my official certified credential.`,
        url: verificationUrl
      }).then(() => {
        onShowNotification('Certificate shared successfully!', 'success');
        setSharing(false);
      }).catch((err) => {
        console.warn(err);
        setSharing(false);
      });
    } else {
      handleCopyLink();
      setSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      
      {/* Modal Card */}
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col md:flex-row"
      >
        
        {/* Certificate Display Side */}
        <div className="flex-1 bg-slate-950 p-6 md:p-8 flex flex-col justify-between items-center relative overflow-hidden border-b md:border-b-0 md:border-r border-white/5">
          
          {/* Certificate Ambient Glow */}
          <div className="absolute -top-32 -left-32 w-64 h-64 bg-[#39FF14]/10 rounded-full blur-[80px]" />
          <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px]" />

          {/* Certificate Frame Container */}
          <div 
            id="printable-certificate-frame"
            className="w-full aspect-[1.5/1] border-8 border-transparent rounded-2xl relative p-5 md:p-7 flex flex-col justify-between text-center overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #090d16 0%, #02040a 100%)',
              borderImage: 'linear-gradient(to right, #39FF14, #10B981, #059669) 1'
            }}
          >
            {/* Header branding */}
            <div className="flex justify-between items-start">
              <div className="text-[7px] md:text-[8px] font-mono tracking-wider text-slate-500 text-left">
                NEXUS ACADEMY OF ADVANCED TECHNOLOGY
              </div>
              <div className="text-[7px] md:text-[8px] font-mono tracking-wider text-slate-500 text-right">
                SECURE GRADUATION REGISTER
              </div>
            </div>

            {/* Badge Indicator */}
            <div className="my-auto space-y-2 md:space-y-3 py-1">
              <div className="flex justify-center">
                <div className="w-9 h-9 md:w-12 md:h-12 rounded-full bg-[#39FF14]/10 flex items-center justify-center border border-[#39FF14]/30">
                  <Award className="text-[#39FF14]" size={18} />
                </div>
              </div>

              <div className="text-[9px] font-mono uppercase tracking-widest text-[#39FF14]">
                Official Academic Certificate
              </div>
              <h3 className="text-lg md:text-2xl font-serif text-white font-semibold">
                CERTIFICATE OF COMPLETION
              </h3>
              <div className="w-16 h-0.5 bg-gradient-to-r from-[#39FF14] to-emerald-500 mx-auto" />

              <p className="text-[9px] md:text-[10px] text-slate-400 italic font-serif">
                This is to certify that
              </p>
              <h2 className="text-xl md:text-3xl font-serif font-bold italic text-white leading-none tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-300">
                {certificate.studentName}
              </h2>
              <p className="text-[8px] md:text-[10px] text-slate-400 max-w-md mx-auto leading-normal">
                has successfully completed all advanced lessons, compiled codebases, and passed required quizzes specialization criteria for the course:
              </p>
              <h4 className="text-[11px] md:text-[14px] font-bold text-[#39FF14] uppercase tracking-wider">
                {certificate.courseName}
              </h4>
            </div>

            {/* Footnote details */}
            <div className="flex justify-between items-end pt-2 border-t border-white/5">
              <div className="text-left">
                <div className="font-serif italic text-white text-[10px]">{certificate.instructorName}</div>
                <div className="text-[6px] md:text-[7px] font-mono text-slate-500 uppercase">COURSE INSTRUCTOR</div>
              </div>

              <div className="flex flex-col items-center shrink-0">
                <div className="text-[7px] font-mono text-[#39FF14] font-semibold border border-[#39FF14]/20 bg-[#39FF14]/5 px-1.5 py-0.5 rounded-full uppercase tracking-wider mb-0.5">
                  VERIFIED AUTHENTIC
                </div>
                <div className="text-[6px] font-mono text-slate-500">ID: {certificate.verificationId}</div>
              </div>

              <div className="text-right">
                <div className="text-[10px] text-white font-mono">{new Date(certificate.issueDate).toLocaleDateString()}</div>
                <div className="text-[6px] md:text-[7px] font-mono text-slate-500 uppercase">DATE OF ISSUANCE</div>
              </div>
            </div>
          </div>
        </div>

        {/* Info & Options Side */}
        <div className="w-full md:w-80 p-6 md:p-8 flex flex-col justify-between space-y-6">
          <div className="space-y-5">
            {/* Header info */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[9px] font-mono uppercase tracking-wider text-[#39FF14] bg-[#39FF14]/10 px-2.5 py-1 rounded-full border border-[#39FF14]/20">
                  CRIMSON GRADE
                </span>
                <h3 className="text-lg font-bold text-white mt-2.5">
                  Graduation Credential
                </h3>
              </div>
              <button 
                onClick={onClose}
                className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-full text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Explanatory security details */}
            <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-4 space-y-3">
              <div className="flex items-center space-x-2.5">
                <ShieldCheck className="text-[#39FF14]" size={16} />
                <span className="text-[10.5px] font-mono font-semibold uppercase text-white tracking-wide">
                  Secured & Verifiable
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                This credential represents full syllabus mastery. Anyone can scan the QR code or use the unique verification link to instantly audit the authenticity of this certificate directly on the blockchain ledger.
              </p>
            </div>

            {/* Action buttons */}
            <div className="space-y-2">
              <button
                onClick={handlePrint}
                className="w-full flex items-center justify-center space-x-2 py-2.5 bg-[#39FF14] hover:bg-[#2eff05] text-slate-950 text-xs font-bold uppercase rounded-2xl transition-all shadow-md cursor-pointer"
              >
                <Printer size={13} />
                <span>Print Certificate</span>
              </button>

              <button
                onClick={handleMockPdfDownload}
                className="w-full flex items-center justify-center space-x-2 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold uppercase rounded-2xl transition-all cursor-pointer"
              >
                <Download size={13} />
                <span>Download PDF File</span>
              </button>

              <button
                onClick={handleShare}
                className="w-full flex items-center justify-center space-x-2 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold uppercase rounded-2xl transition-all cursor-pointer"
                disabled={sharing}
              >
                <Share2 size={13} />
                <span>{sharing ? 'Sharing...' : 'Share Certificate'}</span>
              </button>

              <button
                onClick={handleCopyLink}
                className="w-full flex items-center justify-center space-x-2 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-bold uppercase rounded-2xl transition-all cursor-pointer"
              >
                {copied ? <Check className="text-[#39FF14]" size={13} /> : <Copy size={13} />}
                <span>{copied ? 'Copied Link!' : 'Copy Verify Link'}</span>
              </button>
            </div>
          </div>

          {/* Verification link info */}
          <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[9px] font-mono text-slate-500">
            <span>VERIFICATION STATUS:</span>
            <span className="text-[#39FF14] font-bold">SECURED ACTIVE</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
