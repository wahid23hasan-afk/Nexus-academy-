import React from 'react';
import { ChevronLeft, HelpCircle, MessageSquare, BookOpen, ExternalLink, Mail } from 'lucide-react';
import { motion } from 'motion/react';

interface HelpSupportViewProps {
  onBack: () => void;
}

export const HelpSupportView: React.FC<HelpSupportViewProps> = ({ onBack }) => {
  return (
    <div className="flex-1 flex flex-col pt-2 pb-24 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button 
          onClick={onBack}
          className="flex items-center text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ChevronLeft size={20} />
          <span className="text-sm font-medium ml-1">Back</span>
        </button>
        <h2 className="text-lg font-bold text-white tracking-wide">Help & Support</h2>
        <div className="w-16" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-white/10 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl" />
          <h3 className="text-xl font-bold text-white mb-2 relative z-10">How can we help?</h3>
          <p className="text-sm text-slate-300 mb-4 relative z-10">Search our knowledge base or get in touch with our support team.</p>
          
          <div className="relative z-10 flex items-center bg-slate-900/80 rounded-xl border border-white/10 overflow-hidden">
            <div className="pl-4 pr-2 text-slate-400">
              <HelpCircle size={16} />
            </div>
            <input 
              type="text" 
              placeholder="Search help articles..." 
              className="w-full bg-transparent border-none py-3 pr-4 text-sm text-white placeholder:text-slate-500 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button className="glass-panel p-4 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center hover:bg-white/5 transition-colors cursor-pointer group">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-2 group-hover:scale-110 transition-transform">
              <BookOpen size={18} />
            </div>
            <span className="text-sm font-medium text-slate-200">FAQs</span>
            <span className="text-xs text-slate-500 mt-1">Common answers</span>
          </button>
          
          <button className="glass-panel p-4 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center hover:bg-white/5 transition-colors cursor-pointer group">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 mb-2 group-hover:scale-110 transition-transform">
              <MessageSquare size={18} />
            </div>
            <span className="text-sm font-medium text-slate-200">Live Chat</span>
            <span className="text-xs text-slate-500 mt-1">Talk to an agent</span>
          </button>
        </div>

        <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
          <div className="p-4 border-b border-white/5 bg-white/[0.02]">
            <h3 className="text-sm font-bold text-slate-200">Contact Us</h3>
          </div>
          <div className="divide-y divide-white/5">
            <a href="mailto:support@nexus.edu" className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors group cursor-pointer">
              <div className="flex items-center space-x-3">
                <Mail size={16} className="text-slate-400" />
                <span className="text-sm font-medium text-slate-300 group-hover:text-white">support@nexus.edu</span>
              </div>
              <ExternalLink size={14} className="text-slate-500" />
            </a>
            <div className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors group cursor-pointer">
              <div className="flex items-center space-x-3">
                <HelpCircle size={16} className="text-slate-400" />
                <span className="text-sm font-medium text-slate-300 group-hover:text-white">Submit a Ticket</span>
              </div>
              <ExternalLink size={14} className="text-slate-500" />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
