import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShoppingBag, Shield, Sparkles, Check, Zap, AlertCircle, Key, Lock, Unlock, Crown, Award } from 'lucide-react';
import { gamificationService } from '../services/gamificationService';
import { soundFxService } from '../services/soundFxService';
import { db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface XpStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentUserXP: number;
  onXPUpdated: (newXP: number) => void;
  onShowNotification: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export interface StoreItem {
  id: string;
  name: string;
  category: 'frame' | 'title' | 'shield' | 'lesson_access' | 'certificate_badge' | 'vip_pass';
  description: string;
  perkGranted?: string;
  costXP: number;
  icon: string;
  availability?: 'active' | 'inactive';
  targetScope?: 'all' | 'free_tier' | 'pro_tier';
  previewClass?: string;
}

export const DEFAULT_STORE_ITEMS: StoreItem[] = [
  {
    id: 'lesson_single_pass',
    name: 'Single Lesson Video Unlock Pass 🔓',
    category: 'lesson_access',
    description: 'Unlocks instant high-speed streaming access to ANY single course lesson without requiring full course enrollment.',
    perkGranted: 'Full Video Stream Access to 1 Selected Lesson',
    costXP: 150,
    icon: '🔓',
    availability: 'active',
    targetScope: 'all'
  },
  {
    id: 'frame_cyberpunk',
    name: 'Cyberpunk Neon Glow Frame',
    category: 'frame',
    description: 'An intense cyan & neon green glowing animated halo around your profile avatar.',
    perkGranted: 'Cyberpunk Neon Avatar Halo',
    costXP: 300,
    icon: '✨',
    availability: 'active',
    targetScope: 'all',
    previewClass: 'border-2 border-[#39FF14] shadow-[0_0_15px_#39FF14]'
  },
  {
    id: 'frame_gold_master',
    name: 'Gold Master Crown Frame',
    category: 'frame',
    description: 'A regal metallic golden border reserved for top tier scholars.',
    perkGranted: 'Gold Metallic Avatar Frame',
    costXP: 500,
    icon: '👑',
    availability: 'active',
    targetScope: 'all',
    previewClass: 'border-2 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.5)]'
  },
  {
    id: 'title_code_ninja',
    name: 'Title: Code Ninja 🥷',
    category: 'title',
    description: 'Displays the custom badge "Code Ninja" under your profile name in community and leaderboards.',
    perkGranted: 'Code Ninja Profile Badge',
    costXP: 250,
    icon: '🥷',
    availability: 'active',
    targetScope: 'all'
  },
  {
    id: 'title_quantum_scholar',
    name: 'Title: Quantum Scholar ⚛️',
    category: 'title',
    description: 'Displays "Quantum Scholar" badge with glowing purple border.',
    perkGranted: 'Quantum Scholar Badge',
    costXP: 400,
    icon: '⚛️',
    availability: 'active',
    targetScope: 'all'
  },
  {
    id: 'shield_streak_freeze',
    name: 'Streak Freeze Shield 🛡️',
    category: 'shield',
    description: 'Protects your Daily Learning Streak from resetting if you miss 1 study day.',
    perkGranted: '1-Day Streak Reset Protection',
    costXP: 350,
    icon: '🛡️',
    availability: 'active',
    targetScope: 'all'
  },
  {
    id: 'vip_scholar_pass',
    name: 'VIP Scholar Status Pass 🏆',
    category: 'vip_pass',
    description: 'Grants VIP Scholar Badge, 1.5x XP Boost on study sessions, and priority community support.',
    perkGranted: 'VIP Scholar Badge + 1.5x XP Boost',
    costXP: 1000,
    icon: '🏆',
    availability: 'active',
    targetScope: 'all'
  }
];

export function XpStoreModal({
  isOpen,
  onClose,
  userId,
  currentUserXP,
  onXPUpdated,
  onShowNotification
}: XpStoreModalProps) {
  const [storeCatalog, setStoreCatalog] = useState<StoreItem[]>(DEFAULT_STORE_ITEMS);
  const [purchasedItems, setPurchasedItems] = useState<Record<string, boolean>>({});
  const [activeFrame, setActiveFrame] = useState<string>('default');
  const [activeTitle, setActiveTitle] = useState<string>('');
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && userId) {
      // 1. Fetch live Admin configured Store Catalog from Firestore
      getDoc(doc(db, 'appSettings', 'xpStoreCatalog')).then((snap) => {
        if (snap.exists() && snap.data()?.items && Array.isArray(snap.data().items)) {
          const items = snap.data().items as StoreItem[];
          setStoreCatalog(items.filter(i => i.availability !== 'inactive'));
        }
      }).catch(err => {
        console.warn('XP Store Catalog load error (using default):', err);
      });

      // 2. Load user purchases & equips
      const savedPurchases = localStorage.getItem(`nexus_xp_store_${userId}`);
      if (savedPurchases) {
        try {
          setPurchasedItems(JSON.parse(savedPurchases));
        } catch (e) {}
      }
      const savedFrame = localStorage.getItem(`nexus_active_frame_${userId}`);
      if (savedFrame) setActiveFrame(savedFrame);

      const savedTitle = localStorage.getItem(`nexus_active_title_${userId}`);
      if (savedTitle) setActiveTitle(savedTitle);
    }
  }, [isOpen, userId]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBuyOrEquip = async (item: StoreItem) => {
    const isOwned = purchasedItems[item.id];

    if (isOwned) {
      // Equip item or display status
      soundFxService.playClick();
      if (item.category === 'frame') {
        setActiveFrame(item.id);
        localStorage.setItem(`nexus_active_frame_${userId}`, item.id);
        window.dispatchEvent(new CustomEvent('nexus_store_purchase_updated'));
        onShowNotification(`Equipped ${item.name}!`, 'success');
      } else if (item.category === 'title') {
        setActiveTitle(item.name);
        localStorage.setItem(`nexus_active_title_${userId}`, item.name);
        window.dispatchEvent(new CustomEvent('nexus_store_purchase_updated'));
        onShowNotification(`Equipped ${item.name}!`, 'success');
      } else if (item.category === 'lesson_access') {
        onShowNotification(`You own Single Lesson Unlock Pass! Click "Unlock with XP" on any premium lesson to watch directly.`, 'info');
      } else {
        onShowNotification(`Perk "${item.perkGranted || item.name}" is active on your profile!`, 'info');
      }
      return;
    }

    // Check balance
    if (currentUserXP < item.costXP) {
      onShowNotification(`Not enough XP! You need ${item.costXP - currentUserXP} more XP.`, 'error');
      return;
    }

    setLoadingItemId(item.id);
    try {
      // Deduct XP
      const res = await gamificationService.unlockLessonWithXP(
        userId,
        'store',
        item.id,
        `XP Store: ${item.name}`,
        item.costXP
      );

      if (res.success) {
        soundFxService.playUnlock();
        const updatedPurchases = { ...purchasedItems, [item.id]: true };
        setPurchasedItems(updatedPurchases);
        localStorage.setItem(`nexus_xp_store_${userId}`, JSON.stringify(updatedPurchases));

        if (item.category === 'frame') {
          setActiveFrame(item.id);
          localStorage.setItem(`nexus_active_frame_${userId}`, item.id);
        } else if (item.category === 'title') {
          setActiveTitle(item.name);
          localStorage.setItem(`nexus_active_title_${userId}`, item.name);
        } else if (item.category === 'vip_pass') {
          localStorage.setItem(`nexus_vip_pass_${userId}`, 'true');
        }

        window.dispatchEvent(new CustomEvent('nexus_store_purchase_updated'));
        onXPUpdated(res.remainingXP ?? (currentUserXP - item.costXP));
        onShowNotification(`🎉 Purchased ${item.name}! Access Granted: ${item.perkGranted || 'Feature Unlocked'}`, 'success');
      } else {
        onShowNotification(res.message, 'error');
      }
    } catch (e: any) {
      onShowNotification(e?.message || 'Transaction failed', 'error');
    } finally {
      setLoadingItemId(null);
    }
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md overflow-y-auto w-screen h-[100dvh] top-0 left-0">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-2xl rounded-2xl sm:rounded-3xl bg-[#0a0f1d] border border-amber-500/30 p-5 sm:p-6 md:p-8 shadow-[0_0_60px_rgba(245,158,11,0.2)] overflow-hidden z-10 max-h-[88dvh] flex flex-col my-auto"
        >
          {/* Top Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer border border-white/5"
          >
            <X size={18} />
          </button>

          {/* Header */}
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-yellow-500/20 border border-amber-500/40 flex items-center justify-center shadow-lg">
              <ShoppingBag size={24} className="text-amber-400" />
            </div>
            <div>
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-mono font-bold uppercase tracking-wider">
                <Sparkles size={11} />
                <span>Admin Managed Perks Bazaar</span>
              </div>
              <h2 className="text-xl font-black text-white">XP Marketplace & Store</h2>
            </div>

            <div className="ml-auto text-right">
              <div className="text-[10px] font-mono text-slate-400">Your Wallet Balance</div>
              <div className="text-base font-black font-mono text-[#39FF14] flex items-center space-x-1">
                <Zap size={14} className="fill-[#39FF14]" />
                <span>{currentUserXP} XP</span>
              </div>
            </div>
          </div>

          {/* Items Grid */}
          <div className="overflow-y-auto pr-1 space-y-3 flex-1 custom-scrollbar">
            {storeCatalog.map((item) => {
              const isOwned = Boolean(purchasedItems[item.id]);
              const isEquipped =
                (item.category === 'frame' && activeFrame === item.id) ||
                (item.category === 'title' && activeTitle === item.name);

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-amber-500/30 transition-all flex items-center justify-between space-x-4"
                >
                  <div className="flex items-center space-x-3.5">
                    <div className="w-12 h-12 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center text-2xl shrink-0">
                      {item.icon}
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-bold text-white">{item.name}</h4>
                        {isEquipped && (
                          <span className="px-2 py-0.5 bg-[#39FF14]/10 border border-[#39FF14]/30 text-[#39FF14] text-[9px] font-mono font-bold uppercase rounded-full">
                            Equipped
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 max-w-md mt-0.5">{item.description}</p>
                      
                      {item.perkGranted && (
                        <div className="mt-1.5 inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono">
                          <Unlock size={10} />
                          <span>Perk: {item.perkGranted}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleBuyOrEquip(item)}
                    disabled={loadingItemId === item.id}
                    className={`px-4 py-2.5 rounded-xl font-mono text-xs font-black uppercase tracking-wider transition-all shrink-0 cursor-pointer flex items-center space-x-1.5 ${
                      isEquipped
                        ? 'bg-white/10 text-slate-300 border border-white/10'
                        : isOwned
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                        : currentUserXP >= item.costXP
                        ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20'
                        : 'bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed'
                    }`}
                  >
                    {loadingItemId === item.id ? (
                      <span>Processing...</span>
                    ) : isEquipped ? (
                      <>
                        <Check size={14} />
                        <span>Active</span>
                      </>
                    ) : isOwned ? (
                      <span>Owned</span>
                    ) : (
                      <>
                        <Zap size={13} className="fill-current" />
                        <span>{item.costXP} XP</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}

