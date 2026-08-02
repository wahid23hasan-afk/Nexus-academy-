import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
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
  Megaphone
} from 'lucide-react';
import { Purchase, Coupon, PaymentMethodConfig, Course } from '../types/course';
import { Notification, Announcement, NotificationCategory } from '../types/notification';
import { courseService } from '../services/courseService';
import { notificationService } from '../services/notificationService';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowNotification: (message: string, type: 'success' | 'error') => void;
}

export function AdminPanelModal({ isOpen, onClose, onShowNotification }: AdminPanelModalProps) {
  const [activeTab, setActiveTab] = useState<'approvals' | 'notifications' | 'coupons' | 'payments'>('approvals');

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

  useEffect(() => {
    if (isOpen) {
      loadAllData();
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
      if (allCourses.length > 0) {
        setSelectedCourseId(prev => prev || allCourses[0].courseId);
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
      if (alsoPostAnnouncement && notifTargetType === 'all') {
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
      await courseService.approvePurchase(purchaseId);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#0a0f1d] border border-white/10 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-[0_0_50px_rgba(57,255,20,0.1)] overflow-hidden"
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
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
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
                        <span className="text-base font-mono font-bold text-[#39FF14]">
                          ৳{p.amount?.toLocaleString()}
                        </span>
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
                  {notifTargetType === 'all' && (
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
                  )}

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

        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-white/10 bg-black/40 text-center font-mono text-[9px] text-slate-500">
          NEXUS ADMIN CORE • ADMIN ENROLLMENT SYSTEM ENFORCED
        </div>
      </motion.div>
    </div>
  );
}
