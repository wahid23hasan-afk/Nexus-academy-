import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Smartphone, 
  Download, 
  QrCode, 
  Share2, 
  MoreVertical, 
  PlusSquare, 
  Check, 
  Copy, 
  ExternalLink, 
  ShieldCheck, 
  Sparkles,
  ArrowRight,
  Info
} from 'lucide-react';

interface DownloadAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DownloadAppModal: React.FC<DownloadAppModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'qr'>('android');
  const [copied, setCopied] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://nexusacademy.app';
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(currentUrl)}&color=39FF14&bgcolor=0B1120`;

  useEffect(() => {
    // Listen for PWA beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check if running in standalone PWA mode
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleNativeInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Dark Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg bg-slate-900 border border-[#39FF14]/30 rounded-3xl p-5 sm:p-6 shadow-[0_0_50px_rgba(57,255,20,0.15)] z-10 text-white font-sans overflow-hidden my-auto"
        >
          {/* Top Decorative Glow */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#39FF14]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Modal Header */}
          <div className="flex items-start justify-between border-b border-white/10 pb-4 mb-4 relative z-10">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-2xl bg-slate-950 border border-[#39FF14]/40 flex items-center justify-center shadow-[0_0_15px_rgba(57,255,20,0.2)] overflow-hidden">
                <img src="/icon.svg" alt="Nexus Academy Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">Nexus Academy App</h2>
                  <span className="px-2 py-0.5 rounded-full bg-[#39FF14]/15 border border-[#39FF14]/30 text-[#39FF14] text-[9px] font-mono font-bold uppercase tracking-wider">
                    PWA Ready
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-0.5">Install on Mobile or Desktop in seconds</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Native Direct Install Banner (if browser supports native PWA trigger) */}
          {deferredPrompt && !isInstalled && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-3.5 rounded-2xl bg-gradient-to-r from-[#39FF14]/15 via-emerald-500/10 to-transparent border border-[#39FF14]/40 flex items-center justify-between shadow-lg"
            >
              <div className="flex items-center space-x-2.5">
                <Sparkles size={18} className="text-[#39FF14] animate-pulse shrink-0" />
                <div>
                  <span className="text-xs font-bold text-white block">One-Click Auto Install</span>
                  <span className="text-[10px] text-slate-300 font-mono">Instant installation supported by your browser</span>
                </div>
              </div>

              <button
                onClick={handleNativeInstall}
                className="px-3.5 py-1.5 rounded-xl bg-[#39FF14] hover:bg-[#32e010] text-black font-mono font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-[#39FF14]/20 cursor-pointer transition-all shrink-0"
              >
                <Download size={14} />
                <span>Install Now</span>
              </button>
            </motion.div>
          )}

          {isInstalled && (
            <div className="mb-5 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center space-x-2">
              <ShieldCheck size={16} className="shrink-0" />
              <span>App is already installed on your device! You can launch it from your home screen.</span>
            </div>
          )}

          {/* Tab Selector */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 border border-white/10 rounded-2xl mb-5 font-mono text-xs">
            <button
              onClick={() => setActiveTab('android')}
              className={`py-2 rounded-xl font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                activeTab === 'android'
                  ? 'bg-[#39FF14] text-black shadow-md shadow-[#39FF14]/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Android</span>
            </button>

            <button
              onClick={() => setActiveTab('ios')}
              className={`py-2 rounded-xl font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                activeTab === 'ios'
                  ? 'bg-[#39FF14] text-black shadow-md shadow-[#39FF14]/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>iPhone / iOS</span>
            </button>

            <button
              onClick={() => setActiveTab('qr')}
              className={`py-2 rounded-xl font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                activeTab === 'qr'
                  ? 'bg-[#39FF14] text-black shadow-md shadow-[#39FF14]/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <QrCode size={13} />
              <span>Scan QR</span>
            </button>
          </div>

          {/* TAB CONTENT */}
          <div className="space-y-4">
            {/* ANDROID INSTRUCTIONS */}
            {activeTab === 'android' && (
              <div className="space-y-3">
                <div className="p-3 bg-white/[0.02] border border-white/10 rounded-2xl space-y-3 font-sans text-xs">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-[#39FF14]/20 text-[#39FF14] border border-[#39FF14]/30 flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5">
                      1
                    </div>
                    <div>
                      <p className="font-bold text-white">Chrome ব্রাউজারের ৩টি ডটে (⋮) ক্লিক করুন</p>
                      <p className="text-slate-400 text-[11px] font-mono">উপরে ডান কোণায় থাকা ৩টি পয়েন্টে ট্যাপ করুন।</p>
                    </div>
                    <div className="p-1.5 rounded-lg bg-slate-800 text-slate-300 border border-white/10 shrink-0">
                      <MoreVertical size={16} />
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-2.5 flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-[#39FF14]/20 text-[#39FF14] border border-[#39FF14]/30 flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5">
                      2
                    </div>
                    <div>
                      <p className="font-bold text-white">"Install app" বা "Install and create shortcut" চাপুন</p>
                      <p className="text-slate-400 text-[11px] font-mono">মেনু তালিকা থেকে Install অথবা Add to Home Screen নির্বাচন করুন।</p>
                    </div>
                    <div className="p-1.5 rounded-lg bg-slate-800 text-slate-300 border border-white/10 shrink-0">
                      <Download size={16} />
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-2.5 flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-[#39FF14]/20 text-[#39FF14] border border-[#39FF14]/30 flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5">
                      3
                    </div>
                    <div>
                      <p className="font-bold text-white">পপ-আপ আসলে "Add" / "Install" এ ক্লিক করুন</p>
                      <p className="text-slate-400 text-[11px] font-mono">সাথে সাথেই আপনার মোবাইলের হোম স্ক্রিনে Nexus Academy অ্যাপ যুক্ত হয়ে যাবে।</p>
                    </div>
                    <div className="px-2 py-1 rounded-lg bg-[#39FF14]/20 text-[#39FF14] font-mono text-[10px] font-bold border border-[#39FF14]/30 shrink-0">
                      Add
                    </div>
                  </div>
                </div>

                {/* Simulated Visual Box matching Android UI */}
                <div className="p-3 rounded-2xl bg-slate-950 border border-white/10 font-mono text-xs space-y-1.5">
                  <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center space-x-1">
                    <Info size={12} className="text-[#39FF14]" />
                    <span>Android Popup Visual Preview:</span>
                  </span>
                  <div className="p-3 bg-slate-900 rounded-xl border border-white/10 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-950 border border-[#39FF14]/30 flex items-center justify-center overflow-hidden shrink-0">
                        <img src="/icon.svg" alt="Nexus Academy Icon" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div>
                        <span className="text-white font-bold text-xs block">Nexus Academy</span>
                        <span className="text-[10px] text-slate-400">Create shortcut</span>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-lg bg-[#39FF14] text-black font-bold text-xs shadow-sm">
                      Add
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* IOS INSTRUCTIONS */}
            {activeTab === 'ios' && (
              <div className="space-y-3">
                <div className="p-3 bg-white/[0.02] border border-white/10 rounded-2xl space-y-3 font-sans text-xs">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-[#39FF14]/20 text-[#39FF14] border border-[#39FF14]/30 flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5">
                      1
                    </div>
                    <div>
                      <p className="font-bold text-white">Safari ব্রাউজারের "Share" বাটনে চাপ দিন</p>
                      <p className="text-slate-400 text-[11px] font-mono">আইফোনের নিচের দিকে থাকা শেয়ার আইকনে (квадрат + তীর) ট্যাপ করুন।</p>
                    </div>
                    <div className="p-1.5 rounded-lg bg-slate-800 text-cyan-400 border border-white/10 shrink-0">
                      <Share2 size={16} />
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-2.5 flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-[#39FF14]/20 text-[#39FF14] border border-[#39FF14]/30 flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5">
                      2
                    </div>
                    <div>
                      <p className="font-bold text-white">একটু নিচে স্ক্রোল করে "Add to Home Screen" বেছে নিন</p>
                      <p className="text-slate-400 text-[11px] font-mono">পপ-আপের লিস্ট থেকে প্লাস (+) আইকন বিশিষ্ট অপশনটিতে চাপ দিন।</p>
                    </div>
                    <div className="p-1.5 rounded-lg bg-slate-800 text-slate-300 border border-white/10 shrink-0">
                      <PlusSquare size={16} />
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-2.5 flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-[#39FF14]/20 text-[#39FF14] border border-[#39FF14]/30 flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5">
                      3
                    </div>
                    <div>
                      <p className="font-bold text-white">উপরে ডান কোণায় "Add" বাটনে ক্লিক করুন</p>
                      <p className="text-slate-400 text-[11px] font-mono">ক্লিক করলেই আপনার আইফোনের অ্যাপস পেজে যুক্ত হয়ে যাবে!</p>
                    </div>
                    <div className="px-2 py-1 rounded-lg bg-[#39FF14]/20 text-[#39FF14] font-mono text-[10px] font-bold border border-[#39FF14]/30 shrink-0">
                      Add
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* QR CODE SCAN TAB */}
            {activeTab === 'qr' && (
              <div className="text-center space-y-3">
                <div className="p-4 bg-slate-950 border border-white/10 rounded-2xl inline-block shadow-2xl relative">
                  <img
                    src={qrCodeUrl}
                    alt="App Installation QR Code"
                    className="w-48 h-48 rounded-xl mx-auto border border-[#39FF14]/30 shadow-[0_0_20px_rgba(57,255,20,0.2)]"
                  />
                  <div className="mt-3 flex items-center justify-center space-x-1.5 text-slate-300 text-xs font-mono">
                    <Smartphone size={14} className="text-[#39FF14]" />
                    <span>Scan with Mobile Camera to Open</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Link Copy Bar */}
          <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between gap-2 font-mono text-xs">
            <div className="min-w-0 flex-1 bg-slate-950 border border-white/10 px-3 py-2 rounded-xl text-slate-400 text-[11px] truncate">
              {currentUrl}
            </div>

            <button
              onClick={handleCopyLink}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold flex items-center space-x-1.5 transition-all cursor-pointer shrink-0"
            >
              {copied ? <Check size={14} className="text-[#39FF14]" /> : <Copy size={14} />}
              <span>{copied ? 'Copied!' : 'Copy Link'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
