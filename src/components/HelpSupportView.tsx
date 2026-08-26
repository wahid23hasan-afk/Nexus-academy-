import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, HelpCircle, MessageSquare, BookOpen, Mail, Send, 
  Clock, Plus, CheckCircle2, AlertCircle, ShieldAlert, User, Headset,
  RefreshCw, ChevronDown, Sparkles, Filter, Search, CreditCard,
  GraduationCap, Video, Award, CheckCheck, X, LifeBuoy, AlertTriangle,
  ArrowRight, ShieldCheck, Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, query, where, onSnapshot, addDoc, updateDoc, doc, 
  arrayUnion, serverTimestamp 
} from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { soundFxService } from '../services/soundFxService';

export interface SupportReply {
  message: string;
  adminId?: string;
  senderId?: string;
  senderName?: string;
  createdAt: string;
}

export type TicketCategory = 'payment' | 'enrollment' | 'video_player' | 'certificate' | 'general';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high';

export interface SupportTicket {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  subject: string;
  category: TicketCategory;
  message: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  updatedAt?: any;
  replies?: SupportReply[];
}

interface HelpSupportViewProps {
  onBack: () => void;
  userProfile?: { fullName?: string; username?: string; photoURL?: string; email?: string } | null;
  onNavigateToTab?: (tab: string) => void;
}

export const CATEGORY_INFO: Record<TicketCategory, { labelEn: string; labelBn: string; icon: any; color: string }> = {
  payment: {
    labelEn: 'Payment & Billing',
    labelBn: 'পেমেন্ট ও বিলিং',
    icon: CreditCard,
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
  },
  enrollment: {
    labelEn: 'Course Access & Enrollment',
    labelBn: 'কোর্স এনরোলমেন্ট ও অ্যাক্সেস',
    icon: GraduationCap,
    color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30'
  },
  video_player: {
    labelEn: 'Video & Playback Issue',
    labelBn: 'ভিডিও ও প্লেয়ার সমস্যা',
    icon: Video,
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/30'
  },
  certificate: {
    labelEn: 'Certificate & Exam',
    labelBn: 'সার্টিফিকেট ও মূল্যায়ন',
    icon: Award,
    color: 'text-purple-400 bg-purple-500/10 border-purple-500/30'
  },
  general: {
    labelEn: 'General Inquiry',
    labelBn: 'সাধারণ জিজ্ঞাসা',
    icon: LifeBuoy,
    color: 'text-[#39FF14] bg-[#39FF14]/10 border-[#39FF14]/30'
  }
};

export const HelpSupportView: React.FC<HelpSupportViewProps> = ({ onBack, userProfile }) => {
  const [activeTab, setActiveTab] = useState<'support' | 'faqs'>('support');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  
  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | TicketStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | TicketCategory>('all');

  // New ticket form state
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [newCategory, setNewCategory] = useState<TicketCategory>('payment');
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newPriority, setNewPriority] = useState<TicketPriority>('medium');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [successToast, setSuccessToast] = useState('');

  // Follow-up reply state
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // FAQ search & expanded state
  const [faqSearch, setFaqSearch] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  const currentUser = auth.currentUser;
  const currentUserId = currentUser?.uid || userProfile?.username || 'guest_student';
  const currentUserName = userProfile?.fullName || currentUser?.displayName || userProfile?.username || 'Scholar';
  const currentUserEmail = currentUser?.email || userProfile?.email || '';

  // Real-time listener for user's support tickets
  useEffect(() => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    
    // Subscribe to support_tickets where userId == currentUserId
    const q = query(
      collection(db, 'support_tickets'),
      where('userId', '==', currentUserId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ticketList: SupportTicket[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const rawStatus = data.status || 'open';
        const normalizedStatus: TicketStatus = 
          rawStatus === 'in_progress' ? 'in_progress' :
          rawStatus === 'resolved' ? 'resolved' :
          rawStatus === 'closed' ? 'closed' : 'open';

        const rawCategory = data.category || 'general';
        const normalizedCategory: TicketCategory = 
          rawCategory === 'payment' || rawCategory === 'enrollment' || rawCategory === 'video_player' || rawCategory === 'certificate'
            ? rawCategory
            : 'general';

        ticketList.push({
          id: docSnap.id,
          userId: data.userId || currentUserId,
          userName: data.userName || currentUserName,
          userEmail: data.userEmail || currentUserEmail,
          subject: data.subject || 'Support Ticket',
          category: normalizedCategory,
          message: data.message || '',
          status: normalizedStatus,
          priority: data.priority || 'medium',
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt,
          replies: Array.isArray(data.replies) ? data.replies : []
        });
      });

      // Sort client-side by createdAt descending
      ticketList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setTickets(ticketList);
      setLoading(false);

      // Keep active ticket updated if currently opened
      if (selectedTicket) {
        const updated = ticketList.find(t => t.id === selectedTicket.id);
        if (updated) {
          setSelectedTicket(updated);
        }
      }
    }, (error) => {
      console.error('Error fetching support tickets:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUserId, selectedTicket?.id]);

  // Submit new support ticket
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newMessage.trim()) {
      setFormError('Please enter both a title/subject and detailed message.');
      return;
    }

    setFormError('');
    setSubmitting(true);
    soundFxService.playClick();

    try {
      const ticketData = {
        userId: currentUserId,
        userName: currentUserName,
        userEmail: currentUserEmail || 'student@nexus.edu',
        subject: newSubject.trim(),
        category: newCategory,
        message: newMessage.trim(),
        status: 'open',
        priority: newPriority,
        createdAt: new Date().toISOString(),
        updatedAt: serverTimestamp(),
        replies: []
      };

      await addDoc(collection(db, 'support_tickets'), ticketData);

      soundFxService.playXP();
      setSubmitting(false);
      setIsCreatingTicket(false);
      setNewSubject('');
      setNewMessage('');
      setNewCategory('payment');
      setNewPriority('medium');
      setSuccessToast('Support ticket submitted successfully! Our team will respond shortly.');
      
      setTimeout(() => setSuccessToast(''), 4500);
    } catch (err: any) {
      console.error('Failed to submit ticket:', err);
      setFormError('Failed to send support ticket: ' + (err.message || 'Please check your connection.'));
      setSubmitting(false);
    }
  };

  // Send student follow-up reply in thread
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyMessage.trim()) return;

    setSendingReply(true);
    soundFxService.playClick();

    try {
      const newReplyObj: SupportReply = {
        message: replyMessage.trim(),
        senderId: currentUserId,
        senderName: currentUserName,
        createdAt: new Date().toISOString()
      };

      const ticketRef = doc(db, 'support_tickets', selectedTicket.id);
      await updateDoc(ticketRef, {
        replies: arrayUnion(newReplyObj),
        status: selectedTicket.status === 'closed' || selectedTicket.status === 'resolved' ? 'open' : selectedTicket.status,
        updatedAt: serverTimestamp()
      });

      soundFxService.playXP();
      setReplyMessage('');
      setSendingReply(false);
    } catch (err: any) {
      console.error('Failed to send reply:', err);
      alert('Could not send message: ' + (err.message || 'Please try again.'));
      setSendingReply(false);
    }
  };

  // Close or resolve or reopen ticket from student side
  const handleUpdateTicketStatus = async (ticket: SupportTicket, newStatus: TicketStatus) => {
    soundFxService.playClick();
    try {
      const ticketRef = doc(db, 'support_tickets', ticket.id);
      await updateDoc(ticketRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      if (newStatus === 'resolved') {
        soundFxService.playXP();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const faqs = [
    {
      q: 'How do I access my enrolled course videos?',
      qBn: 'আমি কীভাবে আমার এনরোল করা কোর্সের ভিডিও দেখতে পারি?',
      a: 'Go to the "Explore" or "My Courses" tab. Click on your course card to launch the video player with chapters, notes, and resource downloads.',
      cat: 'enrollment'
    },
    {
      q: 'How long does bKash / Nagad payment approval take?',
      qBn: 'বিকাশ / নগদ পেমেন্ট ভেরিফিকেশনে কত সময় লাগে?',
      a: 'Manual bKash/Nagad transactions are usually verified by our admin team within 5 to 15 minutes during active hours.',
      cat: 'payment'
    },
    {
      q: 'What should I do if my payment gets rejected?',
      qBn: 'আমার পেমেন্ট রিজেক্ট হলে কী করব?',
      a: 'Navigate to "Payment & Order Status" in your profile and click "View & Retry" to re-submit your 8-10 digit Transaction ID (TrxID) or open a Quick Support Ticket under Payment category.',
      cat: 'payment'
    },
    {
      q: 'Can I download lecture PDF notes for offline study?',
      qBn: 'কোর্স লেকচার শিট কি ডাউনলোড করা যায়?',
      a: 'Yes! Inside the course workspace, you will find a "Download Resources" section where you can save PDF slides and study materials.',
      cat: 'video_player'
    },
    {
      q: 'How do I earn and verify my course certificate?',
      qBn: 'কোর্স সমাপ্তির পর সার্টিফিকেট কীভাবে পাব?',
      a: 'Once you reach 100% video completion and pass the course assessment, your official digital certificate is auto-generated in your Profile under "My Certificates" with a QR code and instant verification ID.',
      cat: 'certificate'
    },
    {
      q: 'What should I do if a live class stream URL is not working?',
      qBn: 'লাইভ ক্লাসের লিংক কাজ না করলে কী করব?',
      a: 'Submit a Quick Support ticket choosing "High Priority" or send us a message in the Live Class chat room so an admin can refresh the stream endpoint.',
      cat: 'general'
    }
  ];

  // Filtered tickets
  const filteredTickets = tickets.filter(ticket => {
    // Status filter
    if (statusFilter !== 'all' && ticket.status !== statusFilter) return false;
    // Category filter
    if (categoryFilter !== 'all' && ticket.category !== categoryFilter) return false;
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSubject = ticket.subject.toLowerCase().includes(q);
      const matchMessage = ticket.message.toLowerCase().includes(q);
      const matchId = ticket.id.toLowerCase().includes(q);
      if (!matchSubject && !matchMessage && !matchId) return false;
    }
    return true;
  });

  const filteredFaqs = faqs.filter(f => 
    f.q.toLowerCase().includes(faqSearch.toLowerCase()) || 
    f.qBn.toLowerCase().includes(faqSearch.toLowerCase()) ||
    f.a.toLowerCase().includes(faqSearch.toLowerCase())
  );

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'open':
        return (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Open (পেন্ডিং)</span>
          </span>
        );
      case 'in_progress':
        return (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
            <span>In Progress (প্রক্রিয়াধীন)</span>
          </span>
        );
      case 'resolved':
        return (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase bg-sky-500/15 text-sky-400 border border-sky-500/30 flex items-center space-x-1">
            <CheckCheck size={11} className="text-sky-400" />
            <span>Resolved (সমাধানকৃত)</span>
          </span>
        );
      case 'closed':
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase bg-slate-800 text-slate-400 border border-white/10 flex items-center space-x-1">
            <span>Closed (সমাপ্ত)</span>
          </span>
        );
    }
  };

  const getPriorityBadge = (priority: TicketPriority) => {
    switch (priority) {
      case 'high':
        return (
          <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase bg-red-500/15 text-red-400 border border-red-500/30 flex items-center space-x-1">
            <AlertTriangle size={10} />
            <span>Urgent (জরুরি)</span>
          </span>
        );
      case 'medium':
        return (
          <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30">
            Medium (মাঝারি)
          </span>
        );
      case 'low':
      default:
        return (
          <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase bg-white/5 text-slate-300 border border-white/10">
            Low (সাধারণ)
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col pt-2 pb-24 space-y-4 max-w-4xl mx-auto w-full">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2">
        <button 
          onClick={onBack}
          className="flex items-center text-slate-400 hover:text-white transition-colors cursor-pointer group shrink-0"
        >
          <div className="p-1.5 rounded-lg bg-white/5 group-hover:bg-white/10 mr-2 border border-white/5">
            <ChevronLeft size={16} />
          </div>
          <span className="text-xs font-mono font-bold tracking-wider uppercase">Back</span>
        </button>

        <div className="flex items-center space-x-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
            <Headset size={16} />
          </div>
          <div className="truncate">
            <h2 className="text-xs sm:text-sm font-mono font-bold text-white tracking-wide uppercase truncate">
              Student Support & Helpdesk
            </h2>
            <p className="text-[10px] text-slate-400 font-sans truncate">সাহায্য ও রিয়েল-টাইম কাস্টমার সাপোর্ট</p>
          </div>
        </div>

        <button
          onClick={() => {
            soundFxService.playClick();
            setSelectedTicket(null);
            setIsCreatingTicket(true);
            setActiveTab('support');
          }}
          className="px-3 py-1.5 bg-gradient-to-r from-[#39FF14] to-emerald-400 hover:brightness-110 text-black font-mono font-bold text-xs rounded-xl flex items-center space-x-1.5 transition-all shadow-[0_0_15px_rgba(57,255,20,0.3)] cursor-pointer shrink-0"
        >
          <Plus size={14} className="stroke-[3]" />
          <span className="hidden sm:inline">Create Ticket</span>
          <span className="sm:hidden">New</span>
        </button>
      </div>

      {/* Success Notification Banner */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3.5 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-emerald-400 text-xs font-mono flex items-center space-x-2 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
          >
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{successToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Summary Cards (Stat Bar) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
          <div>
            <span className="text-[9px] font-mono text-slate-400 uppercase block">Total Tickets</span>
            <span className="text-base font-bold text-white font-mono">{tickets.length}</span>
          </div>
          <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-slate-300">
            <MessageSquare size={14} />
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/20 flex items-center justify-between">
          <div>
            <span className="text-[9px] font-mono text-emerald-400 uppercase block">Open / Active</span>
            <span className="text-base font-bold text-emerald-400 font-mono">
              {tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length}
            </span>
          </div>
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <Clock size={14} />
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-purple-500/[0.04] border border-purple-500/20 flex items-center justify-between">
          <div>
            <span className="text-[9px] font-mono text-purple-400 uppercase block">Admin Replied</span>
            <span className="text-base font-bold text-purple-400 font-mono">
              {tickets.filter(t => t.replies && t.replies.some(r => Boolean(r.adminId))).length}
            </span>
          </div>
          <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
            <ShieldAlert size={14} />
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-sky-500/[0.04] border border-sky-500/20 flex items-center justify-between">
          <div>
            <span className="text-[9px] font-mono text-sky-400 uppercase block">Resolved</span>
            <span className="text-base font-bold text-sky-400 font-mono">
              {tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length}
            </span>
          </div>
          <div className="w-7 h-7 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400">
            <CheckCheck size={14} />
          </div>
        </div>
      </div>

      {/* Main Mode Tabs */}
      <div className="flex border-b border-white/10 pb-2 space-x-2">
        <button
          onClick={() => {
            soundFxService.playClick();
            setActiveTab('support');
            setIsCreatingTicket(false);
          }}
          className={`flex-1 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
            activeTab === 'support' && !isCreatingTicket && !selectedTicket
              ? 'bg-[#39FF14]/15 border border-[#39FF14]/40 text-[#39FF14]'
              : 'bg-white/5 border border-white/5 text-slate-400 hover:text-white'
          }`}
        >
          <MessageSquare size={14} />
          <span>My Tickets ({tickets.length})</span>
        </button>

        <button
          onClick={() => {
            soundFxService.playClick();
            setActiveTab('faqs');
            setSelectedTicket(null);
            setIsCreatingTicket(false);
          }}
          className={`flex-1 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
            activeTab === 'faqs'
              ? 'bg-[#39FF14]/15 border border-[#39FF14]/40 text-[#39FF14]'
              : 'bg-white/5 border border-white/5 text-slate-400 hover:text-white'
          }`}
        >
          <BookOpen size={14} />
          <span>Help & FAQs (প্রশ্নোত্তর)</span>
        </button>
      </div>

      {/* TAB 1: SUPPORT TICKETS LIST / VIEW / CREATE */}
      {activeTab === 'support' && (
        <div className="space-y-4">
          
          {/* DETAILED CONVERSATION VIEW FOR A SELECTED TICKET */}
          {selectedTicket ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-950/90 border border-white/10 rounded-2xl p-4 md:p-5 space-y-4 shadow-2xl relative overflow-hidden backdrop-blur-xl"
            >
              {/* Top Navigation & Status Bar */}
              <div className="flex flex-wrap justify-between items-center pb-3 border-b border-white/10 gap-2">
                <button
                  onClick={() => {
                    soundFxService.playClick();
                    setSelectedTicket(null);
                  }}
                  className="flex items-center text-xs font-mono text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <ChevronLeft size={16} className="mr-1" />
                  <span>Back to All Tickets</span>
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Category Pill */}
                  {(() => {
                    const info = CATEGORY_INFO[selectedTicket.category] || CATEGORY_INFO.general;
                    const CatIcon = info.icon;
                    return (
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border flex items-center space-x-1 ${info.color}`}>
                        <CatIcon size={11} />
                        <span>{info.labelEn}</span>
                      </span>
                    );
                  })()}

                  {/* Status Badge */}
                  {getStatusBadge(selectedTicket.status)}

                  {/* Priority Badge */}
                  {getPriorityBadge(selectedTicket.priority)}

                  {/* Status Toggle Actions */}
                  {selectedTicket.status === 'open' || selectedTicket.status === 'in_progress' ? (
                    <button
                      onClick={() => handleUpdateTicketStatus(selectedTicket, 'resolved')}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-mono bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 transition-all cursor-pointer flex items-center space-x-1"
                      title="Mark as successfully resolved"
                    >
                      <CheckCheck size={12} />
                      <span>Mark Resolved</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpdateTicketStatus(selectedTicket, 'open')}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-mono bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 transition-all cursor-pointer flex items-center space-x-1"
                      title="Reopen ticket for more help"
                    >
                      <RefreshCw size={11} />
                      <span>Re-open Ticket</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Ticket Subject Heading */}
              <div>
                <h3 className="text-base font-bold text-white leading-snug">{selectedTicket.subject}</h3>
                <div className="text-[10px] font-mono text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                  <span className="flex items-center space-x-1">
                    <Clock size={11} />
                    <span>Submitted on {new Date(selectedTicket.createdAt).toLocaleString()}</span>
                  </span>
                  <span>•</span>
                  <span>ID: <code className="text-slate-300">{selectedTicket.id.slice(0, 10)}</code></span>
                  <span>•</span>
                  <span>Student: <strong className="text-white">{selectedTicket.userName || 'Scholar'}</strong></span>
                </div>
              </div>

              {/* Conversation Messages Thread */}
              <div className="space-y-3 pt-2 max-h-[440px] overflow-y-auto pr-1 scrollbar-thin">
                
                {/* Initial Student Message */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                    <span className="flex items-center text-[#39FF14] font-bold">
                      <User size={12} className="mr-1.5" />
                      <span>YOU ({selectedTicket.userName || 'STUDENT'})</span>
                    </span>
                    <span>{new Date(selectedTicket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-xs text-slate-100 whitespace-pre-wrap font-sans leading-relaxed">
                    {selectedTicket.message}
                  </p>
                </div>

                {/* Chronological Replies */}
                {selectedTicket.replies && selectedTicket.replies.length > 0 ? (
                  selectedTicket.replies.map((reply, idx) => {
                    const isAdmin = Boolean(reply.adminId);
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-3.5 rounded-2xl space-y-2 transition-all ${
                          isAdmin 
                            ? 'bg-gradient-to-r from-purple-950/70 via-slate-900/90 to-purple-950/40 border border-purple-500/40 ml-3 md:ml-8 shadow-[0_4px_20px_rgba(168,85,247,0.15)]'
                            : 'bg-slate-900/90 border border-white/10 mr-3 md:mr-8'
                        }`}
                      >
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          {isAdmin ? (
                            <span className="flex items-center text-purple-300 font-bold bg-purple-500/20 px-2 py-0.5 rounded-md border border-purple-500/30">
                              <ShieldAlert size={12} className="mr-1.5 text-purple-400" />
                              <span>NEXUS ADMIN SUPPORT DESK</span>
                            </span>
                          ) : (
                            <span className="flex items-center text-[#39FF14] font-bold">
                              <User size={12} className="mr-1.5" />
                              <span>YOU (STUDENT)</span>
                            </span>
                          )}
                          <span className="text-slate-400">
                            {new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-100 whitespace-pre-wrap font-sans leading-relaxed">
                          {reply.message}
                        </p>
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl text-center space-y-1">
                    <Clock size={20} className="text-amber-400 mx-auto animate-pulse" />
                    <p className="text-xs font-mono text-slate-300">Awaiting Admin Response...</p>
                    <p className="text-[10px] text-slate-500 font-sans">
                      Our support team monitors this ticket live. You will see replies appear in real-time.
                    </p>
                  </div>
                )}
              </div>

              {/* Reply Box Form */}
              <form onSubmit={handleSendReply} className="pt-2 border-t border-white/10 space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-mono font-bold text-slate-400 uppercase block">
                    Write Reply to Support / বার্তা লিখুন:
                  </label>
                  {selectedTicket.status === 'resolved' && (
                    <span className="text-[9px] font-mono text-sky-400">
                      (Sending a reply will automatically reopen this ticket)
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <textarea
                    rows={2}
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Type follow-up details, transaction IDs or questions..."
                    className="flex-1 bg-slate-900/90 border border-white/10 focus:border-[#39FF14] rounded-xl p-3 text-xs text-white placeholder-slate-500 outline-none resize-none font-sans"
                  />
                  <button
                    type="submit"
                    disabled={sendingReply || !replyMessage.trim()}
                    className="px-4 py-2 bg-[#39FF14] hover:bg-[#32e011] text-black font-mono font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-40 flex items-center justify-center space-x-1.5 shrink-0 shadow-[0_0_12px_rgba(57,255,20,0.2)]"
                  >
                    <Send size={14} className={sendingReply ? 'animate-bounce' : ''} />
                    <span>{sendingReply ? 'Sending...' : 'Send'}</span>
                  </button>
                </div>
              </form>
            </motion.div>

          ) : isCreatingTicket ? (

            /* NEW TICKET CREATION FORM */
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-950/90 border border-[#39FF14]/30 rounded-2xl p-5 space-y-4 shadow-2xl backdrop-blur-xl"
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-[#39FF14]/15 border border-[#39FF14]/30 flex items-center justify-center text-[#39FF14]">
                    <Plus size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-mono font-bold text-[#39FF14] uppercase">
                      Create New Support Ticket / নতুন সাপোর্ট টিকিট
                    </h3>
                    <p className="text-[10px] text-slate-400 font-sans mt-0.5">
                      Direct ticket connection to Nexus Admin Support Desk
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundFxService.playClick();
                    setIsCreatingTicket(false);
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer"
                  title="Close form"
                >
                  <X size={16} />
                </button>
              </div>

              {formError && (
                <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-400 text-xs font-mono flex items-center space-x-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleCreateTicket} className="space-y-3.5 font-mono text-xs">
                {/* Category Selection Grid */}
                <div>
                  <label className="text-slate-400 block text-[10px] uppercase font-bold mb-1.5">
                    1. Select Ticket Category / বিভাগের ধরন *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {(Object.keys(CATEGORY_INFO) as TicketCategory[]).map((catKey) => {
                      const item = CATEGORY_INFO[catKey];
                      const Icon = item.icon;
                      const isSelected = newCategory === catKey;

                      return (
                        <button
                          key={catKey}
                          type="button"
                          onClick={() => {
                            soundFxService.playClick();
                            setNewCategory(catKey);
                          }}
                          className={`p-2.5 rounded-xl border text-left flex items-center space-x-2.5 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#39FF14]/15 border-[#39FF14] text-white shadow-[0_0_15px_rgba(57,255,20,0.15)]'
                              : 'bg-white/[0.02] border-white/10 hover:border-white/20 text-slate-300'
                          }`}
                        >
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${item.color}`}>
                            <Icon size={14} />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold block truncate">{item.labelEn}</span>
                            <span className="text-[9px] text-slate-400 block truncate font-sans">{item.labelBn}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Priority Selector */}
                <div>
                  <label className="text-slate-400 block text-[10px] uppercase font-bold mb-1.5">
                    2. Priority Level / গুরুত্ব *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'low', labelEn: 'Low Priority', labelBn: 'সাধারণ', color: 'text-slate-300' },
                      { id: 'medium', labelEn: 'Medium Priority', labelBn: 'মাঝারি', color: 'text-amber-400' },
                      { id: 'high', labelEn: 'High / Urgent', labelBn: 'জরুরি', color: 'text-red-400' }
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          soundFxService.playClick();
                          setNewPriority(p.id as any);
                        }}
                        className={`py-2 px-2 rounded-xl text-center border transition-all cursor-pointer ${
                          newPriority === p.id 
                            ? 'bg-[#39FF14]/20 border-[#39FF14] text-[#39FF14] shadow-[0_0_12px_rgba(57,255,20,0.15)]'
                            : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className="text-[11px] font-bold block">{p.labelEn}</span>
                        <span className="text-[9px] text-slate-400 block font-sans">{p.labelBn}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subject Title */}
                <div>
                  <label className="text-slate-400 block text-[10px] uppercase font-bold mb-1">
                    3. Ticket Subject / সমস্যা বা বিষয়ের সারসংক্ষেপ *
                  </label>
                  <input
                    type="text"
                    required
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder={
                      newCategory === 'payment' ? 'e.g. bKash payment verification for SSC Physics (TrxID: 9J3K...)' :
                      newCategory === 'enrollment' ? 'e.g. Course video lessons locked after approval' :
                      newCategory === 'video_player' ? 'e.g. Video playback buffering or audio sync error on Chapter 2' :
                      newCategory === 'certificate' ? 'e.g. Certificate name correction request' :
                      'e.g. Need assistance with course materials'
                    }
                    className="w-full px-3 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-white outline-none focus:border-[#39FF14] text-xs font-sans placeholder-slate-500"
                  />
                </div>

                {/* Detailed Description */}
                <div>
                  <label className="text-slate-400 block text-[10px] uppercase font-bold mb-1">
                    4. Detailed Problem Description / বিস্তারিত বিবরণ *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Please include all relevant details such as Transaction ID, course title, lesson chapter, device/browser, or error messages..."
                    className="w-full px-3 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-white outline-none focus:border-[#39FF14] text-xs font-sans resize-none placeholder-slate-500 leading-relaxed"
                  />
                </div>

                <div className="pt-2 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      soundFxService.playClick();
                      setIsCreatingTicket(false);
                    }}
                    className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 bg-gradient-to-r from-[#39FF14] to-emerald-400 hover:brightness-110 text-black font-bold rounded-xl uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_15px_rgba(57,255,20,0.3)] disabled:opacity-50 flex items-center space-x-1.5"
                  >
                    <Send size={14} className={submitting ? 'animate-bounce' : ''} />
                    <span>{submitting ? 'Submitting Ticket...' : 'Submit Support Ticket'}</span>
                  </button>
                </div>
              </form>
            </motion.div>

          ) : (

            /* TICKETS LIST SUMMARY VIEW */
            <div className="space-y-3">
              {/* Search & Filter Bar */}
              <div className="p-3 bg-slate-950/80 border border-white/10 rounded-2xl space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search tickets by subject, problem or ticket ID..."
                      className="w-full bg-slate-900 border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-[#39FF14]"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      soundFxService.playClick();
                      setIsCreatingTicket(true);
                    }}
                    className="px-3 py-2 bg-[#39FF14] text-black font-mono font-bold text-xs rounded-xl flex items-center space-x-1 hover:bg-[#32e011] cursor-pointer shrink-0"
                  >
                    <Plus size={13} />
                    <span>New Ticket</span>
                  </button>
                </div>

                {/* Status Filter Chips */}
                <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar pt-0.5">
                  <span className="text-[9px] font-mono text-slate-500 uppercase font-bold mr-1 shrink-0">
                    Status:
                  </span>
                  {[
                    { id: 'all', label: `All (${tickets.length})` },
                    { id: 'open', label: `Open (${tickets.filter(t => t.status === 'open').length})` },
                    { id: 'in_progress', label: `In Progress (${tickets.filter(t => t.status === 'in_progress').length})` },
                    { id: 'resolved', label: `Resolved (${tickets.filter(t => t.status === 'resolved').length})` },
                    { id: 'closed', label: `Closed (${tickets.filter(t => t.status === 'closed').length})` }
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        soundFxService.playClick();
                        setStatusFilter(s.id as any);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-all cursor-pointer shrink-0 ${
                        statusFilter === s.id
                          ? 'bg-[#39FF14]/20 border border-[#39FF14] text-[#39FF14]'
                          : 'bg-white/5 hover:bg-white/10 text-slate-400 border border-transparent'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tickets List */}
              {loading ? (
                <div className="py-12 text-center text-xs font-mono text-slate-400 flex flex-col items-center justify-center space-y-2">
                  <RefreshCw size={20} className="animate-spin text-[#39FF14]" />
                  <span>Connecting to Realtime Support Desk...</span>
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="p-8 text-center bg-slate-950 border border-white/10 rounded-2xl space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto">
                    <Headset size={24} />
                  </div>
                  <div>
                    <h3 className="text-sm font-mono font-bold text-white">
                      {searchQuery || statusFilter !== 'all' ? 'No Matching Tickets Found' : 'No Support Tickets Yet'}
                    </h3>
                    <p className="text-xs text-slate-400 font-sans mt-1 max-w-sm mx-auto">
                      {searchQuery || statusFilter !== 'all'
                        ? 'Try adjusting your search query or status filter to see other tickets.'
                        : 'Need help with payments, course access, or videos? Click "Create New Ticket" to connect with an administrator.'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      soundFxService.playClick();
                      if (searchQuery || statusFilter !== 'all') {
                        setSearchQuery('');
                        setStatusFilter('all');
                      } else {
                        setIsCreatingTicket(true);
                      }
                    }}
                    className="px-4 py-2 bg-[#39FF14] text-black font-mono font-bold text-xs rounded-xl uppercase tracking-wider hover:bg-[#32e011] cursor-pointer inline-flex items-center space-x-1.5"
                  >
                    <Plus size={14} />
                    <span>{searchQuery || statusFilter !== 'all' ? 'Reset Filters' : 'Create New Ticket'}</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredTickets.map((ticket) => {
                    const hasAdminReplies = ticket.replies && ticket.replies.some(r => Boolean(r.adminId));
                    const replyCount = ticket.replies?.length || 0;
                    const catInfo = CATEGORY_INFO[ticket.category] || CATEGORY_INFO.general;
                    const CatIcon = catInfo.icon;

                    return (
                      <div
                        key={ticket.id}
                        onClick={() => {
                          soundFxService.playClick();
                          setSelectedTicket(ticket);
                        }}
                        className="p-4 bg-slate-950/90 border border-white/10 hover:border-[#39FF14]/50 rounded-2xl transition-all cursor-pointer group flex flex-col justify-between space-y-2.5 hover:shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="space-y-1.5 min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {/* Category Badge */}
                              <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase border flex items-center space-x-1 ${catInfo.color}`}>
                                <CatIcon size={10} />
                                <span>{catInfo.labelEn}</span>
                              </span>

                              {/* Admin Replied Glowing Badge */}
                              {hasAdminReplies && (
                                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[8.5px] font-mono font-bold border border-purple-500/30 flex items-center space-x-1 animate-pulse shadow-[0_0_10px_rgba(168,85,247,0.3)]">
                                  <Sparkles size={9} />
                                  <span>ADMIN REPLIED ✨</span>
                                </span>
                              )}
                            </div>

                            <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-[#39FF14] transition-colors line-clamp-1">
                              {ticket.subject}
                            </h4>

                            <p className="text-[11px] text-slate-400 font-sans line-clamp-1 leading-relaxed">
                              {ticket.message}
                            </p>
                          </div>

                          <div className="flex flex-col items-end space-y-1 shrink-0">
                            {getStatusBadge(ticket.status)}
                            {getPriorityBadge(ticket.priority)}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-2 border-t border-white/5">
                          <span className="flex items-center space-x-1">
                            <Clock size={11} className="text-slate-400" />
                            <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>{new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </span>

                          <span className="text-slate-400 group-hover:text-white transition-colors flex items-center space-x-1">
                            <span>{replyCount} message{replyCount !== 1 ? 's' : ''}</span>
                            <ArrowRight size={11} className="text-[#39FF14]" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: FAQS AND KNOWLEDGE BASE */}
      {activeTab === 'faqs' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-950/60 to-purple-950/60 border border-white/10 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-mono font-bold text-white uppercase flex items-center">
              <Sparkles size={16} className="text-[#39FF14] mr-2" />
              <span>Knowledge Base & Common FAQs / প্রশ্নোত্তর</span>
            </h3>
            <p className="text-xs text-slate-300 font-sans">
              Instant answers to frequently asked questions regarding course enrollment, video playback, certificates, and bKash payments.
            </p>
            
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                value={faqSearch}
                onChange={(e) => setFaqSearch(e.target.value)}
                placeholder="Search FAQs by topic or keyword (e.g. payment, certificate, video)..."
                className="w-full bg-slate-900 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-[#39FF14]"
              />
            </div>
          </div>

          <div className="space-y-2">
            {filteredFaqs.map((faq, idx) => {
              const isOpen = expandedFaq === idx;
              return (
                <div
                  key={idx}
                  className="bg-slate-950/90 border border-white/10 rounded-2xl overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => {
                      soundFxService.playClick();
                      setExpandedFaq(isOpen ? null : idx);
                    }}
                    className="w-full p-4 text-left flex justify-between items-center text-xs font-bold text-slate-200 hover:text-white cursor-pointer"
                  >
                    <div>
                      <span className="block">{faq.q}</span>
                      <span className="text-[10px] text-slate-400 font-normal font-sans block mt-0.5">{faq.qBn}</span>
                    </div>
                    <ChevronDown size={16} className={`transition-transform duration-200 text-slate-400 shrink-0 ml-2 ${isOpen ? 'rotate-180 text-[#39FF14]' : ''}`} />
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 text-xs text-slate-300 font-sans leading-relaxed border-t border-white/5 pt-2">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 text-center space-y-2">
            <p className="text-xs text-slate-300 font-medium">Still have questions or need specific help?</p>
            <button
              onClick={() => {
                soundFxService.playClick();
                setActiveTab('support');
                setIsCreatingTicket(true);
              }}
              className="px-4 py-2 bg-[#39FF14]/15 hover:bg-[#39FF14]/25 border border-[#39FF14]/30 text-[#39FF14] text-xs font-mono font-bold rounded-xl transition-all cursor-pointer inline-flex items-center space-x-1.5"
            >
              <Plus size={13} />
              <span>Open a Support Ticket / সাহায্য নিন</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
