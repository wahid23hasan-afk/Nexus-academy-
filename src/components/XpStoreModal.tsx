import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ShoppingBag, 
  Shield, 
  Sparkles, 
  Check, 
  Zap, 
  Search,
  Lock, 
  Unlock, 
  Crown, 
  Award, 
  Flame, 
  CheckCircle2, 
  User, 
  Filter, 
  Layers, 
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  SlidersHorizontal
} from 'lucide-react';
import { gamificationService } from '../services/gamificationService';
import { soundFxService } from '../services/soundFxService';
import { db } from '../services/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

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
  title?: string;
  category: 'frame' | 'title' | 'shield' | 'lesson_access' | 'certificate_badge' | 'vip_pass' | string;
  perkType?: string;
  description: string;
  perkGranted?: string;
  perkDetails?: string;
  costXP: number;
  priceXp?: number;
  icon: string;
  availability?: 'active' | 'inactive';
  status?: 'active' | 'inactive';
  isActive?: boolean;
  targetScope?: 'all' | 'free_tier' | 'pro_tier';
  previewClass?: string;
  order?: number;
}

export const DEFAULT_STORE_ITEMS: StoreItem[] = [
  {
    id: 'lesson_single_pass',
    name: 'Single Lesson Video Unlock Pass 🔓',
    title: 'Single Lesson Video Unlock Pass 🔓',
    category: 'lesson_access',
    perkType: 'lesson_access',
    description: 'Unlocks instant high-speed streaming access to ANY single course lesson without requiring full course enrollment.',
    perkGranted: 'Full Video Stream Access to 1 Selected Lesson',
    costXP: 150,
    priceXp: 150,
    icon: '🔓',
    availability: 'active',
    status: 'active',
    isActive: true,
    targetScope: 'all',
    order: 10
  },
  {
    id: 'frame_cyberpunk',
    name: 'Cyberpunk Neon Glow Frame',
    title: 'Cyberpunk Neon Glow Frame',
    category: 'frame',
    perkType: 'frame',
    description: 'An intense cyan & neon green glowing animated halo around your profile avatar.',
    perkGranted: 'Cyberpunk Neon Avatar Halo',
    costXP: 300,
    priceXp: 300,
    icon: '✨',
    availability: 'active',
    status: 'active',
    isActive: true,
    targetScope: 'all',
    previewClass: 'border-2 border-[#39FF14] shadow-[0_0_15px_#39FF14]',
    order: 20
  },
  {
    id: 'frame_gold_master',
    name: 'Gold Master Crown Frame',
    title: 'Gold Master Crown Frame',
    category: 'frame',
    perkType: 'frame',
    description: 'A regal metallic golden border reserved for top tier scholars.',
    perkGranted: 'Gold Metallic Avatar Frame',
    costXP: 500,
    priceXp: 500,
    icon: '👑',
    availability: 'active',
    status: 'active',
    isActive: true,
    targetScope: 'all',
    previewClass: 'border-2 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.5)]',
    order: 30
  },
  {
    id: 'title_code_ninja',
    name: 'Title: Code Ninja 🥷',
    title: 'Title: Code Ninja 🥷',
    category: 'title',
    perkType: 'title',
    description: 'Displays the custom badge "Code Ninja" under your profile name in community and leaderboards.',
    perkGranted: 'Code Ninja Profile Badge',
    costXP: 250,
    priceXp: 250,
    icon: '🥷',
    availability: 'active',
    status: 'active',
    isActive: true,
    targetScope: 'all',
    order: 40
  },
  {
    id: 'title_quantum_scholar',
    name: 'Title: Quantum Scholar ⚛️',
    title: 'Title: Quantum Scholar ⚛️',
    category: 'title',
    perkType: 'title',
    description: 'Displays "Quantum Scholar" badge with glowing purple border.',
    perkGranted: 'Quantum Scholar Badge',
    costXP: 400,
    priceXp: 400,
    icon: '⚛️',
    availability: 'active',
    status: 'active',
    isActive: true,
    targetScope: 'all',
    order: 50
  },
  {
    id: 'shield_streak_freeze',
    name: 'Streak Freeze Shield 🛡️',
    title: 'Streak Freeze Shield 🛡️',
    category: 'shield',
    perkType: 'shield',
    description: 'Protects your Daily Learning Streak from resetting if you miss 1 study day.',
    perkGranted: '1-Day Streak Reset Protection',
    costXP: 350,
    priceXp: 350,
    icon: '🛡️',
    availability: 'active',
    status: 'active',
    isActive: true,
    targetScope: 'all',
    order: 60
  },
  {
    id: 'vip_scholar_pass',
    name: 'VIP Scholar Status Pass 🏆',
    title: 'VIP Scholar Status Pass 🏆',
    category: 'vip_pass',
    perkType: 'vip_pass',
    description: 'Grants VIP Scholar Badge, 1.5x XP Boost on study sessions, and priority community support.',
    perkGranted: 'VIP Scholar Badge + 1.5x XP Boost',
    costXP: 1000,
    priceXp: 1000,
    icon: '🏆',
    availability: 'active',
    status: 'active',
    isActive: true,
    targetScope: 'all',
    order: 70
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
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const [liveUserXP, setLiveUserXP] = useState<number>(currentUserXP);

  // Sync initial XP from prop
  useEffect(() => {
    setLiveUserXP(currentUserXP);
  }, [currentUserXP]);

  // 1. Real-time Subscription to XP Store Items Collection & Catalog
  useEffect(() => {
    if (!isOpen) return;

    const unsubscribeCatalog = gamificationService.subscribeXpStoreItems((items) => {
      if (items && items.length > 0) {
        setStoreCatalog(items);
      } else {
        setStoreCatalog(DEFAULT_STORE_ITEMS);
      }
    });

    return () => {
      unsubscribeCatalog();
    };
  }, [isOpen]);

  // 2. Real-time Subscription to User Purchases & Profile Equips
  useEffect(() => {
    if (!isOpen || !userId) return;

    // Load initial local cache for instant zero-latency render
    try {
      const savedPurchases = localStorage.getItem(`nexus_xp_store_${userId}`);
      if (savedPurchases) {
        setPurchasedItems(JSON.parse(savedPurchases));
      }
      const savedFrame = localStorage.getItem(`nexus_active_frame_${userId}`);
      if (savedFrame) setActiveFrame(savedFrame);
      const savedTitle = localStorage.getItem(`nexus_active_title_${userId}`);
      if (savedTitle) setActiveTitle(savedTitle);
    } catch (e) {}

    // Setup real-time listener for user perks and equipment in Firestore
    const unsubscribeUser = gamificationService.getUserPurchasedPerksRealtime(
      userId,
      (ownedIds, curFrame, curTitle) => {
        const map: Record<string, boolean> = {};
        ownedIds.forEach(id => { map[id] = true; });
        setPurchasedItems(map);
        if (curFrame) setActiveFrame(curFrame);
        if (curTitle) setActiveTitle(curTitle);
      }
    );

    // Listen for live XP updates across the app
    const handleXPUpdate = (e: any) => {
      if (e?.detail?.newXP !== undefined) {
        setLiveUserXP(e.detail.newXP);
      }
    };
    window.addEventListener('nexus_xp_updated', handleXPUpdate);

    return () => {
      unsubscribeUser();
      window.removeEventListener('nexus_xp_updated', handleXPUpdate);
    };
  }, [isOpen, userId]);

  // Lock body scroll when open
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

  // Filter items by category and search query
  const filteredItems = useMemo(() => {
    return storeCatalog.filter(item => {
      const matchesCategory = 
        selectedCategory === 'all' || 
        item.category === selectedCategory ||
        item.perkType === selectedCategory ||
        (selectedCategory === 'shields_vip' && (item.category === 'shield' || item.category === 'vip_pass'));

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !q || 
        (item.name && item.name.toLowerCase().includes(q)) || 
        (item.title && item.title.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.perkGranted && item.perkGranted.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [storeCatalog, selectedCategory, searchQuery]);

  if (!isOpen) return null;

  // Handle Buy, Equip, or Unequip Item
  const handleBuyOrEquip = async (item: StoreItem) => {
    const isOwned = Boolean(purchasedItems[item.id]);
    const isFrame = item.category === 'frame' || item.perkType === 'frame';
    const isTitle = item.category === 'title' || item.perkType === 'title';
    const isFrameEquipped = isFrame && activeFrame === item.id;
    const isTitleEquipped = isTitle && activeTitle === (item.title || item.name);

    // 1. If currently equipped cosmetic, allow Unequipping
    if (isFrameEquipped) {
      soundFxService.playClick();
      await gamificationService.unequipUserPerk(userId, 'frame');
      setActiveFrame('default');
      onShowNotification('Frame unequipped.', 'info');
      return;
    }

    if (isTitleEquipped) {
      soundFxService.playClick();
      await gamificationService.unequipUserPerk(userId, 'title');
      setActiveTitle('');
      onShowNotification('Title unequipped.', 'info');
      return;
    }

    // 2. If already owned, Equip it
    if (isOwned) {
      soundFxService.playClick();
      if (isFrame) {
        await gamificationService.equipUserPerk(userId, item);
        setActiveFrame(item.id);
        onShowNotification(`✨ Equipped ${item.title || item.name}!`, 'success');
      } else if (isTitle) {
        await gamificationService.equipUserPerk(userId, item);
        setActiveTitle(item.title || item.name);
        onShowNotification(`🥷 Equipped ${item.title || item.name}!`, 'success');
      } else if (item.category === 'lesson_access') {
        onShowNotification(`🔓 You own Single Lesson Unlock Pass! Click "Unlock with XP" on any premium lesson to watch instantly.`, 'info');
      } else {
        onShowNotification(`🛡️ Perk "${item.perkGranted || item.name}" is active on your profile!`, 'info');
      }
      return;
    }

    // 3. Purchase Item with XP
    const itemCost = Number(item.costXP || item.priceXp || 0);
    if (liveUserXP < itemCost) {
      soundFxService.playError();
      onShowNotification(`Insufficient XP! You need ${itemCost - liveUserXP} more XP to purchase this perk.`, 'error');
      return;
    }

    setLoadingItemId(item.id);
    try {
      const res = await gamificationService.purchaseStorePerk(userId, item);

      if (res.success) {
        soundFxService.playUnlock();
        
        // Update local purchase state
        const updatedPurchases = { ...purchasedItems, [item.id]: true };
        setPurchasedItems(updatedPurchases);

        if (isFrame) {
          setActiveFrame(item.id);
        } else if (isTitle) {
          setActiveTitle(item.title || item.name);
        }

        const remainingXP = res.remainingXP ?? Math.max(0, liveUserXP - itemCost);
        setLiveUserXP(remainingXP);
        onXPUpdated(remainingXP);

        onShowNotification(`🎉 Purchased ${item.title || item.name}! Perk Unlocked: ${item.perkGranted || 'Access Granted'}`, 'success');
      } else {
        soundFxService.playError();
        onShowNotification(res.message || 'Purchase failed.', 'error');
      }
    } catch (e: any) {
      soundFxService.playError();
      onShowNotification(e?.message || 'Transaction failed', 'error');
    } finally {
      setLoadingItemId(null);
    }
  };

  return createPortal(
    <AnimatePresence>
      <div 
        id="xp-store-modal-backdrop"
        className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md overflow-y-auto w-screen h-[100dvh] top-0 left-0"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
          onClick={onClose}
        />

        <motion.div
          id="xp-store-modal-card"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-3xl rounded-2xl sm:rounded-3xl bg-[#0a0f1d] border border-amber-500/30 p-4 sm:p-6 md:p-7 shadow-[0_0_60px_rgba(245,158,11,0.18)] overflow-hidden z-10 max-h-[90dvh] flex flex-col my-auto"
        >
          {/* Top Gold Ambient Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            id="xp-store-modal-close-btn"
            onClick={onClose}
            aria-label="Close Store"
            className="absolute top-4 sm:top-5 right-4 sm:right-5 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer border border-white/5 z-20"
          >
            <X size={18} />
          </button>

          {/* Modal Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-5 pr-8 sm:pr-0">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-yellow-500/20 border border-amber-500/40 flex items-center justify-center shadow-lg shrink-0">
                <ShoppingBag size={22} className="text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
              </div>
              <div>
                <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-mono font-bold uppercase tracking-wider">
                  <Sparkles size={11} />
                  <span>Real-Time Perks Bazaar</span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">XP Marketplace & Store</h2>
              </div>
            </div>

            {/* Live Student XP Badge */}
            <div className="bg-white/[0.03] border border-amber-500/30 rounded-2xl px-3.5 py-2 flex items-center space-x-2.5 shrink-0 self-start sm:self-auto">
              <div className="w-8 h-8 rounded-xl bg-[#39FF14]/10 border border-[#39FF14]/30 flex items-center justify-center text-[#39FF14]">
                <Zap size={16} className="fill-[#39FF14]" />
              </div>
              <div>
                <div className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">Your Balance</div>
                <div className="text-sm sm:text-base font-black font-mono text-[#39FF14] flex items-center space-x-1">
                  <span>{liveUserXP.toLocaleString()} XP</span>
                </div>
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="xp-store-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search frames, titles, passes..."
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar py-0.5">
              {[
                { id: 'all', label: 'All', icon: '🌟' },
                { id: 'frame', label: 'Frames', icon: '✨' },
                { id: 'title', label: 'Titles', icon: '🥷' },
                { id: 'lesson_access', label: 'Passes', icon: '🔓' },
                { id: 'shields_vip', label: 'VIP & Shields', icon: '🛡️' }
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-mono font-bold whitespace-nowrap transition-all cursor-pointer flex items-center space-x-1.5 ${
                    selectedCategory === cat.id
                      ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Items Grid */}
          <div 
            id="xp-store-items-container"
            className="overflow-y-auto pr-1 space-y-2.5 flex-1 custom-scrollbar"
          >
            {filteredItems.length === 0 ? (
              <div className="p-8 text-center bg-white/[0.01] border border-white/5 rounded-2xl">
                <ShoppingBag size={32} className="mx-auto text-slate-600 mb-2" />
                <p className="text-sm font-bold text-slate-300">No perk items found</p>
                <p className="text-xs text-slate-500 mt-1">Try clearing your search query or switching categories.</p>
              </div>
            ) : (
              filteredItems.map((item) => {
                const isOwned = Boolean(purchasedItems[item.id]);
                const isFrame = item.category === 'frame' || item.perkType === 'frame';
                const isTitle = item.category === 'title' || item.perkType === 'title';
                const itemCost = Number(item.costXP || item.priceXp || 100);
                const itemName = item.title || item.name;

                const isFrameEquipped = isFrame && activeFrame === item.id;
                const isTitleEquipped = isTitle && activeTitle === itemName;
                const isEquipped = isFrameEquipped || isTitleEquipped;
                const canAfford = liveUserXP >= itemCost;

                return (
                  <div
                    key={item.id}
                    id={`xp-store-item-${item.id}`}
                    className={`p-3.5 sm:p-4 rounded-2xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 border ${
                      isEquipped
                        ? 'bg-amber-500/[0.04] border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.08)]'
                        : isOwned
                        ? 'bg-emerald-500/[0.02] border-emerald-500/30'
                        : 'bg-white/[0.02] border-white/10 hover:border-amber-500/30'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      {/* Icon with Live Cosmetic Frame Preview if Applicable */}
                      <div className="relative shrink-0">
                        {isFrame ? (
                          <div className={`w-12 h-12 rounded-xl bg-black/60 flex items-center justify-center text-2xl transition-all ${
                            item.previewClass || 'border border-amber-400/50'
                          }`}>
                            <User size={22} className="text-amber-300" />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center text-2xl">
                            {item.icon || '✨'}
                          </div>
                        )}
                        
                        {isEquipped && (
                          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#39FF14] text-black text-[9px] font-bold flex items-center justify-center shadow-md">
                            ✓
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h4 className="text-sm font-bold text-white tracking-tight truncate">{itemName}</h4>
                          
                          {/* Status Badge */}
                          {isEquipped ? (
                            <span className="px-2 py-0.5 bg-[#39FF14]/10 border border-[#39FF14]/30 text-[#39FF14] text-[9px] font-mono font-bold uppercase rounded-md">
                              Active
                            </span>
                          ) : isOwned ? (
                            <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9px] font-mono font-bold uppercase rounded-md">
                              Unlocked
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] font-mono font-bold uppercase rounded-md">
                              {item.category?.replace('_', ' ') || 'Perk'}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.description}</p>
                        
                        {/* Perk Details Pill */}
                        {(item.perkGranted || item.perkDetails) && (
                          <div className="mt-2 inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[10px] font-mono">
                            <Unlock size={10} className="shrink-0" />
                            <span className="truncate">Perk: {item.perkGranted || item.perkDetails}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="sm:self-center shrink-0 flex items-center justify-end">
                      <button
                        id={`xp-store-action-btn-${item.id}`}
                        onClick={() => handleBuyOrEquip(item)}
                        disabled={loadingItemId === item.id || (!isOwned && !canAfford)}
                        className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-mono text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                          loadingItemId === item.id
                            ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40 cursor-wait'
                            : isEquipped
                            ? 'bg-amber-500/20 hover:bg-red-500/20 text-amber-300 hover:text-red-300 border border-amber-500/40 hover:border-red-500/40'
                            : isOwned
                            ? (isFrame || isTitle)
                              ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20'
                              : 'bg-white/10 text-slate-300 border border-white/10'
                            : canAfford
                            ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98]'
                            : 'bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed opacity-60'
                        }`}
                        title={!isOwned && !canAfford ? `Needs ${itemCost - liveUserXP} more XP` : undefined}
                      >
                        {loadingItemId === item.id ? (
                          <>
                            <RefreshCw size={13} className="animate-spin" />
                            <span>Unlocking...</span>
                          </>
                        ) : isEquipped ? (
                          <>
                            <Check size={13} />
                            <span>Equipped (Click to Unequip)</span>
                          </>
                        ) : isOwned ? (
                          (isFrame || isTitle) ? (
                            <>
                              <Sparkles size={13} />
                              <span>Equip Now</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck size={13} />
                              <span>Owned & Active</span>
                            </>
                          )
                        ) : (
                          <>
                            <Zap size={13} className={canAfford ? 'fill-current' : 'fill-slate-500'} />
                            <span>Buy ({itemCost} XP)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Note */}
          <div className="mt-4 pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 font-mono gap-2">
            <div className="flex items-center space-x-1.5">
              <Sparkles size={12} className="text-amber-400" />
              <span>XP is earned by completing lessons, quizzes, and daily study milestones.</span>
            </div>
            <div className="text-[#39FF14] font-bold">
              Instant Real-Time Synchronization
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}


