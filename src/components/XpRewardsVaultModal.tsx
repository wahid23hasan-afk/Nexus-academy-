import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Sparkles, 
  Wallet, 
  Zap, 
  Gift, 
  Award, 
  Ticket, 
  History, 
  Crown, 
  ArrowRight, 
  Check, 
  Copy, 
  AlertCircle, 
  ShieldCheck, 
  Flame, 
  RefreshCw, 
  Star, 
  Clock, 
  ChevronRight, 
  TrendingUp, 
  DollarSign, 
  Layers,
  Info
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { gamificationService } from '../services/gamificationService';
import { soundFxService } from '../services/soundFxService';
import { 
  GamificationConfig, 
  DEFAULT_GAMIFICATION_CONFIG, 
  DiscountVoucher, 
  UserRedeemedVoucher, 
  SpinWheelSegment, 
  VIPTierDefinition, 
  XPLedgerEntry 
} from '../types/gamification';

interface XpRewardsVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentUserXP: number;
  onXPUpdated?: (newXP: number) => void;
  onShowNotification?: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  initialTab?: 'converter' | 'vouchers' | 'spin' | 'vip' | 'ledger';
}

export const XpRewardsVaultModal: React.FC<XpRewardsVaultModalProps> = ({
  isOpen,
  onClose,
  userId,
  currentUserXP,
  onXPUpdated,
  onShowNotification,
  initialTab = 'converter'
}) => {
  const [activeTab, setActiveTab] = useState<'converter' | 'vouchers' | 'spin' | 'vip' | 'ledger'>(initialTab);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);
  const [config, setConfig] = useState<GamificationConfig>(DEFAULT_GAMIFICATION_CONFIG);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Balances & Data
  const [userXP, setUserXP] = useState(currentUserXP);
  const [walletBalance, setWalletBalance] = useState(0);
  const [redeemedVouchers, setRedeemedVouchers] = useState<UserRedeemedVoucher[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<XPLedgerEntry[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'earn' | 'spend'>('all');

  // Converter State
  const [convertAmount, setConvertAmount] = useState<number>(100);
  const [converting, setConverting] = useState(false);

  // Vouchers State
  const [redeemingVoucherId, setRedeemingVoucherId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [voucherSubTab, setVoucherSubTab] = useState<'store' | 'my_vouchers'>('store');

  // Lucky Spin State
  const [spinStatus, setSpinStatus] = useState<{
    freeSpinsRemaining: number;
    totalSpinsToday: number;
    spinCostXP: number;
    canSpinWithXP: boolean;
  }>({ freeSpinsRemaining: 1, totalSpinsToday: 0, spinCostXP: 50, canSpinWithXP: true });
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [spinOutcome, setSpinOutcome] = useState<{
    segment: SpinWheelSegment;
    message: string;
    isFree: boolean;
  } | null>(null);

  // VIP Tier calculation
  const currentVIPTier = gamificationService.getUserVIPTier(userXP, config);
  const nextVIPTierInfo = gamificationService.getNextVIPTier(userXP, config);

  // Load config & data
  useEffect(() => {
    if (!isOpen) return;

    setUserXP(currentUserXP);

    // Subscribe to real-time gamification config
    const unsubscribe = gamificationService.subscribeGamificationConfig((newConfig) => {
      setConfig(newConfig);
      setLoadingConfig(false);
    });

    // Fetch initial balances
    refreshUserData();

    return () => {
      unsubscribe();
    };
  }, [isOpen, userId, currentUserXP]);

  const refreshUserData = async () => {
    if (!userId) return;
    try {
      const [wallet, vouchers, spinStat] = await Promise.all([
        gamificationService.getUserWalletBalance(userId),
        gamificationService.getUserRedeemedVouchers(userId),
        gamificationService.getDailySpinStatus(userId)
      ]);
      setWalletBalance(wallet);
      setRedeemedVouchers(vouchers);
      setSpinStatus(spinStat);
    } catch (err) {
      console.warn('refreshUserData error:', err);
    }
  };

  // Load Ledger when ledger tab is selected
  useEffect(() => {
    if (activeTab === 'ledger' && userId) {
      setLoadingLedger(true);
      gamificationService.getUserXPLedger(userId, 50).then(entries => {
        setLedgerEntries(entries);
        setLoadingLedger(false);
      }).catch(() => setLoadingLedger(false));
    }
  }, [activeTab, userId]);

  // Handle Convert XP to Wallet
  const handleConvertXP = async () => {
    if (!userId) return;
    if (convertAmount < config.converter.minXPThreshold) {
      onShowNotification?.(`Minimum conversion threshold is ${config.converter.minXPThreshold} XP.`, 'warning');
      return;
    }
    if (userXP < convertAmount) {
      onShowNotification?.(`Insufficient XP. You have ${userXP} XP.`, 'error');
      return;
    }

    setConverting(true);
    try {
      const res = await gamificationService.convertXPToWallet(userId, convertAmount);
      if (res.success) {
        setUserXP(res.remainingXP);
        setWalletBalance(res.newWalletBalance);
        onXPUpdated?.(res.remainingXP);
        soundFxService.playBadgeChime();
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
        onShowNotification?.(res.message, 'success');
      } else {
        onShowNotification?.(res.message, 'error');
      }
    } catch (err: any) {
      onShowNotification?.(err?.message || 'Conversion failed', 'error');
    } finally {
      setConverting(false);
    }
  };

  // Handle Redeem Voucher
  const handleRedeemVoucher = async (voucher: DiscountVoucher) => {
    if (!userId) return;
    if (userXP < voucher.xpCost) {
      onShowNotification?.(`Insufficient XP. You need ${voucher.xpCost} XP.`, 'error');
      return;
    }

    setRedeemingVoucherId(voucher.id);
    try {
      const res = await gamificationService.redeemVoucherWithXP(userId, voucher.id);
      if (res.success && res.voucher) {
        if (res.remainingXP !== undefined) {
          setUserXP(res.remainingXP);
          onXPUpdated?.(res.remainingXP);
        }
        setRedeemedVouchers(prev => [res.voucher!, ...prev]);
        soundFxService.playUnlock();
        confetti({ particleCount: 80, spread: 80, origin: { y: 0.6 } });
        onShowNotification?.(res.message, 'success');
        setVoucherSubTab('my_vouchers');
      } else {
        onShowNotification?.(res.message, 'error');
      }
    } catch (err: any) {
      onShowNotification?.(err?.message || 'Redemption failed', 'error');
    } finally {
      setRedeemingVoucherId(null);
    }
  };

  // Handle Spin
  const handleSpinWheel = async () => {
    if (isSpinning || !userId) return;

    const isFree = spinStatus.freeSpinsRemaining > 0;
    if (!isFree && userXP < spinStatus.spinCostXP) {
      onShowNotification?.(`You need ${spinStatus.spinCostXP} XP for a spin.`, 'error');
      return;
    }

    setIsSpinning(true);
    setSpinOutcome(null);
    soundFxService.playClick();

    try {
      const res = await gamificationService.spinLuckyWheel(userId);
      const segments = config.spinWheel.segments.length > 0 ? config.spinWheel.segments : DEFAULT_GAMIFICATION_CONFIG.spinWheel.segments;
      const segmentCount = segments.length;
      const arcDegrees = 360 / segmentCount;

      // Calculate final target angle to land needle (top center = 270 deg) on winning index
      const extraRounds = 5 + Math.floor(Math.random() * 3); // 5 to 7 full rotations
      const targetSegmentCenter = res.winningIndex * arcDegrees + arcDegrees / 2;
      const targetDegree = 360 * extraRounds + (360 - targetSegmentCenter);

      setWheelRotation(prev => prev + targetDegree);

      // Wait for rotation animation to complete (4 seconds)
      setTimeout(async () => {
        setIsSpinning(false);
        setUserXP(res.remainingXP);
        onXPUpdated?.(res.remainingXP);
        if (res.newWalletBalance !== undefined) {
          setWalletBalance(res.newWalletBalance);
        }
        setSpinOutcome({
          segment: res.winningSegment,
          message: res.rewardMessage,
          isFree: res.isFreeSpin
        });

        if (res.winningSegment.type !== 'none') {
          soundFxService.playChestOpen();
          confetti({ particleCount: 90, spread: 90, origin: { y: 0.6 } });
        }

        // Refresh spin status
        const updatedStatus = await gamificationService.getDailySpinStatus(userId);
        setSpinStatus(updatedStatus);
      }, 4000);
    } catch (err: any) {
      setIsSpinning(false);
      onShowNotification?.(err?.message || 'Spin failed', 'error');
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    onShowNotification?.(`Promo code ${code} copied to clipboard!`, 'success');
    setTimeout(() => setCopiedCode(null), 2500);
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/98 backdrop-blur-xl overflow-y-auto w-screen h-[100dvh]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto"
        >
          {/* Top Gaming Banner / Header */}
          <div className="relative px-5 py-4 bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 flex-shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
                <Sparkles size={22} className="animate-pulse" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-xl font-bold text-white tracking-tight">XP Rewards & Perks Vault</h2>
                  <span className="px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-full">
                    Gamified
                  </span>
                </div>
                <p className="text-xs text-slate-400">Redeem rewards, convert XP to wallet balance, and spin for mega prizes</p>
              </div>
            </div>

            {/* Live Badges: XP Balance & Wallet Balance */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-800/90 border border-amber-500/30 text-amber-400 text-sm font-semibold shadow-inner">
                <Zap size={16} className="text-amber-400 fill-amber-400/30 animate-pulse" />
                <span>{userXP.toLocaleString()} XP</span>
              </div>
              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-800/90 border border-emerald-500/30 text-emerald-400 text-sm font-semibold shadow-inner">
                <Wallet size={16} className="text-emerald-400" />
                <span>৳{walletBalance.toLocaleString()} BDT</span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-800 bg-slate-900/90 px-3 overflow-x-auto no-scrollbar flex-shrink-0">
            {[
              { id: 'converter', label: 'XP to Wallet', icon: Wallet, badge: 'Instant' },
              { id: 'vouchers', label: 'Discount Vault', icon: Ticket, badge: `${config.vouchers.length}` },
              { id: 'spin', label: 'Lucky Spin Wheel', icon: Gift, badge: spinStatus.freeSpinsRemaining > 0 ? 'Free Spin' : 'Spin' },
              { id: 'vip', label: 'VIP Perks & Tiers', icon: Crown, badge: currentVIPTier.name.split(' ')[0] },
              { id: 'ledger', label: 'XP Passbook', icon: History, badge: null }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                    isActive 
                      ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' 
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                      isActive ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab Contents */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950/60">
            {/* 1. XP TO WALLET CONVERTER TAB */}
            {activeTab === 'converter' && (
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-500/20 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                    <Wallet size={120} className="text-indigo-400" />
                  </div>

                  <div className="relative z-10 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Live Rate</span>
                        <h3 className="text-lg font-bold text-white">Direct XP to Wallet Exchange</h3>
                      </div>
                      <div className="px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-xs font-bold text-indigo-300">
                        {config.converter.xpPerCurrencyUnit * 10} XP = ৳10 BDT
                      </div>
                    </div>
                    <p className="text-sm text-slate-300">
                      Convert your earned study points directly into digital wallet credit. Use your wallet balance at checkout to enroll in any premium course instantly!
                    </p>

                    {/* Quick Select Buttons */}
                    <div className="space-y-2 pt-2">
                      <label className="text-xs font-medium text-slate-400">Select XP Amount to Convert:</label>
                      <div className="grid grid-cols-4 gap-2">
                        {[100, 250, 500, 1000].map(val => (
                          <button
                            key={val}
                            onClick={() => setConvertAmount(val)}
                            disabled={val > userXP}
                            className={`py-2 px-3 rounded-xl text-sm font-semibold border transition-all cursor-pointer ${
                              convertAmount === val
                                ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/30'
                                : val > userXP
                                ? 'bg-slate-800/40 border-slate-800 text-slate-600 cursor-not-allowed'
                                : 'bg-slate-800/70 border-slate-700 text-slate-300 hover:border-slate-500'
                            }`}
                          >
                            {val} XP
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Input & Slider */}
                    <div className="space-y-2 pt-2">
                      <div className="flex justify-between items-center text-xs text-slate-400">
                        <span>Custom Conversion:</span>
                        <span>Min: {config.converter.minXPThreshold} XP | Available: {userXP} XP</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <input
                          type="range"
                          min={config.converter.minXPThreshold}
                          max={Math.max(config.converter.minXPThreshold, userXP)}
                          step={10}
                          value={Math.min(convertAmount, Math.max(config.converter.minXPThreshold, userXP))}
                          onChange={(e) => setConvertAmount(Number(e.target.value))}
                          disabled={userXP < config.converter.minXPThreshold}
                          className="flex-1 accent-indigo-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                        />
                        <div className="w-28 relative">
                          <input
                            type="number"
                            min={config.converter.minXPThreshold}
                            max={userXP}
                            value={convertAmount}
                            onChange={(e) => setConvertAmount(Math.max(0, Number(e.target.value)))}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-sm font-bold text-white text-right focus:outline-none focus:border-indigo-500"
                          />
                          <span className="absolute left-2.5 top-2 text-xs text-slate-400 font-semibold">XP</span>
                        </div>
                      </div>
                    </div>

                    {/* Exchange Preview Box */}
                    <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                          <Zap size={20} />
                        </div>
                        <div>
                          <div className="text-xs text-slate-400">You are converting</div>
                          <div className="text-base font-bold text-amber-400">{convertAmount} XP Points</div>
                        </div>
                      </div>

                      <ArrowRight size={20} className="text-slate-500" />

                      <div className="flex items-center space-x-3 text-right">
                        <div>
                          <div className="text-xs text-slate-400">Wallet Credit Payout</div>
                          <div className="text-lg font-bold text-emerald-400">
                            ৳{Math.floor(convertAmount / config.converter.xpPerCurrencyUnit)} BDT
                          </div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                          <Wallet size={20} />
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={handleConvertXP}
                      disabled={converting || userXP < convertAmount || convertAmount < config.converter.minXPThreshold}
                      className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm tracking-wide transition-all shadow-lg flex items-center justify-center space-x-2 cursor-pointer ${
                        userXP < convertAmount || convertAmount < config.converter.minXPThreshold
                          ? 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed'
                          : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-900/30 active:scale-[0.99]'
                      }`}
                    >
                      {converting ? (
                        <>
                          <RefreshCw size={18} className="animate-spin" />
                          <span>Processing Exchange...</span>
                        </>
                      ) : (
                        <>
                          <DollarSign size={18} />
                          <span>
                            Convert {convertAmount} XP into ৳{Math.floor(convertAmount / config.converter.xpPerCurrencyUnit)} BDT Wallet Credit
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Conversion Features Info */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                    <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold">
                      <ShieldCheck size={14} />
                      <span>Instant & Atomic</span>
                    </div>
                    <p className="text-xs text-slate-400">Balance is updated in real-time and permanently saved to your profile.</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                    <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold">
                      <Wallet size={14} />
                      <span>100% Course Usable</span>
                    </div>
                    <p className="text-xs text-slate-400">Use your wallet balance directly during course checkout to reduce fees.</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                    <div className="flex items-center space-x-2 text-amber-400 text-xs font-semibold">
                      <TrendingUp size={14} />
                      <span>No Expiration</span>
                    </div>
                    <p className="text-xs text-slate-400">Converted wallet credit remains valid indefinitely in your account.</p>
                  </div>
                </div>
              </div>
            )}

            {/* 2. DISCOUNT VOUCHERS VAULT TAB */}
            {activeTab === 'vouchers' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-white">Course Discount Vouchers Vault</h3>
                    <p className="text-xs text-slate-400">Redeem promo codes with XP points to slash course fees on enrollment</p>
                  </div>

                  {/* Sub Tab Switcher */}
                  <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl">
                    <button
                      onClick={() => setVoucherSubTab('store')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                        voucherSubTab === 'store'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Voucher Store ({config.vouchers.filter(v => v.isActive).length})
                    </button>
                    <button
                      onClick={() => setVoucherSubTab('my_vouchers')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                        voucherSubTab === 'my_vouchers'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      My Redeemed Coupons ({redeemedVouchers.length})
                    </button>
                  </div>
                </div>

                {voucherSubTab === 'store' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {config.vouchers.filter(v => v.isActive).map(v => {
                      const canAfford = userXP >= v.xpCost;
                      const isRedeeming = redeemingVoucherId === v.id;

                      return (
                        <div
                          key={v.id}
                          className="relative p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 hover:border-indigo-500/40 transition-all flex flex-col justify-between space-y-4 group overflow-hidden"
                        >
                          {v.badgeText && (
                            <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 border border-amber-500/30 text-amber-400">
                              {v.badgeText}
                            </div>
                          )}

                          <div className="flex items-start space-x-3.5">
                            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-2xl shrink-0 group-hover:scale-105 transition-transform">
                              {v.icon || '🎟️'}
                            </div>
                            <div className="space-y-1">
                              <h4 className="font-bold text-white text-base leading-tight">{v.title}</h4>
                              {v.titleBn && <p className="text-xs text-slate-400">{v.titleBn}</p>}
                              <p className="text-xs text-slate-300 pt-1 leading-relaxed">{v.description}</p>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                            <div className="space-y-0.5">
                              <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                                <Clock size={12} />
                                <span>Valid for {v.expiryDays} days</span>
                              </div>
                              <div className="text-[11px] text-slate-500">
                                Min spend: ৳{v.minSpend} BDT
                              </div>
                            </div>

                            <button
                              onClick={() => handleRedeemVoucher(v)}
                              disabled={!canAfford || isRedeeming}
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-1.5 cursor-pointer ${
                                canAfford
                                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-900/30 active:scale-95'
                                  : 'bg-slate-800 text-slate-500 border border-slate-700/40 cursor-not-allowed'
                              }`}
                            >
                              {isRedeeming ? (
                                <RefreshCw size={14} className="animate-spin" />
                              ) : (
                                <>
                                  <Zap size={14} className={canAfford ? 'text-amber-400 fill-amber-400' : ''} />
                                  <span>Redeem for {v.xpCost} XP</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* My Redeemed Coupons Section */
                  <div className="space-y-3">
                    {redeemedVouchers.length === 0 ? (
                      <div className="text-center py-12 bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
                        <Ticket size={40} className="mx-auto text-slate-600 mb-3" />
                        <h4 className="text-base font-bold text-white">No Redeemed Vouchers Yet</h4>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                          Redeem coupons using your study XP from the store tab to save on enrollment fees.
                        </p>
                        <button
                          onClick={() => setVoucherSubTab('store')}
                          className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors cursor-pointer"
                        >
                          Browse Voucher Store
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {redeemedVouchers.map(uv => {
                          const isExpired = new Date(uv.expiresAt).getTime() < Date.now();
                          const isCopied = copiedCode === uv.code;

                          return (
                            <div
                              key={uv.id}
                              className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 relative overflow-hidden ${
                                uv.isUsed
                                  ? 'bg-slate-900/50 border-slate-800 opacity-60'
                                  : isExpired
                                  ? 'bg-red-950/20 border-red-900/30'
                                  : 'bg-gradient-to-r from-slate-900 to-indigo-950/40 border-indigo-500/30 shadow-lg'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <span className="font-bold text-white text-sm">{uv.title}</span>
                                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                                      uv.isUsed
                                        ? 'bg-slate-800 text-slate-400'
                                        : isExpired
                                        ? 'bg-red-500/20 text-red-400'
                                        : 'bg-emerald-500/20 text-emerald-300'
                                    }`}>
                                      {uv.isUsed ? 'Used' : isExpired ? 'Expired' : 'Active'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-400 mt-0.5">
                                    Discount: {uv.discountValue}{uv.discountType === 'percentage' ? '%' : ' Tk'} OFF (Min: ৳{uv.minSpend})
                                  </p>
                                </div>
                                <div className="text-xs text-slate-500">
                                  {uv.xpSpent > 0 ? `${uv.xpSpent} XP` : 'Free Reward'}
                                </div>
                              </div>

                              {/* Promo Code Box */}
                              <div className="flex items-center justify-between p-2.5 bg-slate-950/80 rounded-lg border border-slate-800">
                                <div className="flex items-center space-x-2 font-mono font-bold text-sm text-indigo-300">
                                  <Ticket size={14} className="text-indigo-400" />
                                  <span>{uv.code}</span>
                                </div>
                                <button
                                  onClick={() => handleCopyCode(uv.code)}
                                  className="flex items-center space-x-1 px-2.5 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-300 text-xs font-semibold transition-colors cursor-pointer"
                                >
                                  {isCopied ? <Check size={12} /> : <Copy size={12} />}
                                  <span>{isCopied ? 'Copied' : 'Copy'}</span>
                                </button>
                              </div>

                              <div className="text-[11px] text-slate-500 flex justify-between">
                                <span>Redeemed: {new Date(uv.redeemedAt).toLocaleDateString()}</span>
                                <span>Expires: {new Date(uv.expiresAt).toLocaleDateString()}</span>
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

            {/* 3. LUCKY SPIN WHEEL TAB */}
            {activeTab === 'spin' && (
              <div className="max-w-3xl mx-auto space-y-6">
                <div className="text-center space-y-1">
                  <h3 className="text-xl font-bold text-white flex items-center justify-center space-x-2">
                    <span>🎰 Daily Lucky Spin Wheel</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Spin for instant XP points, cash wallet credits, and discount vouchers!
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  {/* Wheel Interactive Container */}
                  <div className="md:col-span-7 flex flex-col items-center justify-center relative">
                    {/* Top Pointer Ticker Arrow */}
                    <div className="relative z-20 -mb-4 flex flex-col items-center">
                      <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[22px] border-t-amber-400 drop-shadow-[0_4px_10px_rgba(245,158,11,0.6)]" />
                    </div>

                    {/* SVG Wheel Canvas */}
                    <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full p-2 bg-gradient-to-b from-amber-500/30 via-indigo-900/50 to-slate-900 border-4 border-amber-500/60 shadow-[0_0_35px_rgba(99,102,241,0.25)] flex items-center justify-center overflow-hidden">
                      <svg
                        viewBox="0 0 300 300"
                        className="w-full h-full transform transition-transform"
                        style={{
                          transform: `rotate(${wheelRotation}deg)`,
                          transitionDuration: isSpinning ? '4000ms' : '0ms',
                          transitionTimingFunction: 'cubic-bezier(0.15, 0.9, 0.2, 1)'
                        }}
                      >
                        {(() => {
                          const segments = config.spinWheel.segments.length > 0 ? config.spinWheel.segments : DEFAULT_GAMIFICATION_CONFIG.spinWheel.segments;
                          const total = segments.length;
                          const angleStep = 360 / total;

                          return segments.map((seg, idx) => {
                            const startAngle = idx * angleStep;
                            const endAngle = startAngle + angleStep;
                            const startRad = ((startAngle - 90) * Math.PI) / 180;
                            const endRad = ((endAngle - 90) * Math.PI) / 180;

                            const x1 = 150 + 140 * Math.cos(startRad);
                            const y1 = 150 + 140 * Math.sin(startRad);
                            const x2 = 150 + 140 * Math.cos(endRad);
                            const y2 = 150 + 140 * Math.sin(endRad);

                            const pathData = `M 150 150 L ${x1} ${y1} A 140 140 0 0 1 ${x2} ${y2} Z`;

                            // Text Position
                            const midAngle = startAngle + angleStep / 2;
                            const midRad = ((midAngle - 90) * Math.PI) / 180;
                            const textX = 150 + 90 * Math.cos(midRad);
                            const textY = 150 + 90 * Math.sin(midRad);

                            return (
                              <g key={seg.id || idx}>
                                <path
                                  d={pathData}
                                  fill={seg.color}
                                  stroke="#0f172a"
                                  strokeWidth="2"
                                />
                                <text
                                  x={textX}
                                  y={textY}
                                  fill={seg.textColor || '#ffffff'}
                                  fontSize="12"
                                  fontWeight="bold"
                                  textAnchor="middle"
                                  dominantBaseline="middle"
                                  transform={`rotate(${midAngle + 90}, ${textX}, ${textY})`}
                                >
                                  {seg.label}
                                </text>
                              </g>
                            );
                          });
                        })()}
                      </svg>

                      {/* Center Hub Cap */}
                      <div className="absolute w-14 h-14 rounded-full bg-slate-900 border-2 border-amber-400 shadow-xl flex items-center justify-center text-amber-400 font-bold text-xs pointer-events-none">
                        <Sparkles size={18} className="animate-spin text-amber-400" />
                      </div>
                    </div>

                    {/* Spin Action Button */}
                    <div className="mt-5 w-full max-w-xs space-y-2">
                      <button
                        onClick={handleSpinWheel}
                        disabled={isSpinning || (!spinStatus.freeSpinsRemaining && userXP < spinStatus.spinCostXP)}
                        className={`w-full py-3 px-5 rounded-xl font-bold text-sm tracking-wide transition-all shadow-xl flex items-center justify-center space-x-2 cursor-pointer ${
                          isSpinning
                            ? 'bg-slate-800 text-slate-400 cursor-wait'
                            : spinStatus.freeSpinsRemaining > 0
                            ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black shadow-amber-500/30 active:scale-95'
                            : userXP >= spinStatus.spinCostXP
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-900/30 active:scale-95'
                            : 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed'
                        }`}
                      >
                        {isSpinning ? (
                          <>
                            <RefreshCw size={16} className="animate-spin" />
                            <span>Spinning the Wheel...</span>
                          </>
                        ) : spinStatus.freeSpinsRemaining > 0 ? (
                          <>
                            <Gift size={18} />
                            <span>FREE DAILY SPIN ({spinStatus.freeSpinsRemaining} Left)</span>
                          </>
                        ) : (
                          <>
                            <Zap size={18} className="text-amber-400 fill-amber-400" />
                            <span>Spin for {spinStatus.spinCostXP} XP</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Right Side Stats & Outcomes */}
                  <div className="md:col-span-5 space-y-4">
                    {/* Outcome Card */}
                    {spinOutcome && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-4 rounded-xl bg-gradient-to-br from-indigo-950/60 to-slate-900 border border-indigo-500/40 text-center space-y-2 shadow-lg"
                      >
                        <span className="text-2xl">{spinOutcome.segment.icon || '🎉'}</span>
                        <h4 className="text-base font-bold text-white">{spinOutcome.segment.label}</h4>
                        <p className="text-xs text-indigo-300 font-medium">{spinOutcome.message}</p>
                      </motion.div>
                    )}

                    {/* Daily Stats */}
                    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Spin Privileges</h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center text-slate-300">
                          <span>Free Daily Spins:</span>
                          <span className="font-bold text-amber-400">{spinStatus.freeSpinsRemaining} remaining</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-300">
                          <span>Total Spins Today:</span>
                          <span className="font-semibold text-white">{spinStatus.totalSpinsToday}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-300">
                          <span>VIP Free Spin Bonus:</span>
                          <span className="font-semibold text-indigo-400">+{currentVIPTier.dailyFreeSpins} / Day ({currentVIPTier.name.split(' ')[0]})</span>
                        </div>
                      </div>
                    </div>

                    {/* Possible Wheel Rewards */}
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Possible Rewards</h4>
                      <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-300">
                        {config.spinWheel.segments.map((s, idx) => (
                          <div key={idx} className="flex items-center space-x-1.5 py-1 px-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                            <span className="truncate">{s.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. VIP TIERS & PERKS TAB */}
            {activeTab === 'vip' && (
              <div className="space-y-6 max-w-3xl mx-auto">
                {/* Current VIP Status Card */}
                <div className={`p-6 rounded-2xl bg-gradient-to-br ${currentVIPTier.gradientBg} border ${currentVIPTier.borderColor} relative overflow-hidden shadow-2xl`}>
                  <div className="flex items-start justify-between relative z-10">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-3xl">{currentVIPTier.badgeIcon}</span>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">Current Tier Status</span>
                          <h3 className="text-2xl font-black text-white">{currentVIPTier.name}</h3>
                        </div>
                      </div>
                      <p className="text-xs text-slate-300 pt-1">
                        Active Perks: {currentVIPTier.perks.join(' • ')}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-slate-400">Total Study XP</span>
                      <div className="text-xl font-bold text-amber-400">{userXP.toLocaleString()} XP</div>
                    </div>
                  </div>

                  {/* Next Tier Progression Bar */}
                  {nextVIPTierInfo.nextTier && (
                    <div className="mt-5 pt-4 border-t border-slate-700/50 space-y-2 relative z-10">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 font-medium">
                          Next Rank: <strong className="text-white">{nextVIPTierInfo.nextTier.name}</strong> ({nextVIPTierInfo.nextTier.badgeIcon})
                        </span>
                        <span className="text-indigo-300 font-bold">
                          {nextVIPTierInfo.xpNeeded.toLocaleString()} XP Needed
                        </span>
                      </div>
                      <div className="w-full h-3 bg-slate-950/80 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-500"
                          style={{ width: `${nextVIPTierInfo.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* All VIP Tiers Breakdown */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">All VIP Tier Thresholds</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {config.vipTiers.map(t => {
                      const isUnlocked = userXP >= t.minXP;
                      const isCurrent = t.tierId === currentVIPTier.tierId;

                      return (
                        <div
                          key={t.tierId}
                          className={`p-4 rounded-xl border transition-all ${
                            isCurrent
                              ? 'bg-indigo-950/30 border-indigo-500/50 shadow-md ring-1 ring-indigo-500/30'
                              : isUnlocked
                              ? 'bg-slate-900/90 border-slate-800'
                              : 'bg-slate-950/50 border-slate-900 opacity-60'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2.5">
                              <span className="text-2xl">{t.badgeIcon}</span>
                              <div>
                                <h5 className="text-sm font-bold text-white flex items-center space-x-1.5">
                                  <span>{t.name}</span>
                                  {isCurrent && (
                                    <span className="px-1.5 py-0.2 text-[9px] font-bold bg-indigo-500 text-white rounded">YOU</span>
                                  )}
                                </h5>
                                <span className="text-[11px] text-slate-400">{t.minXP.toLocaleString()} XP Required</span>
                              </div>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isUnlocked ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
                            }`}>
                              {isUnlocked ? 'Unlocked' : 'Locked'}
                            </span>
                          </div>

                          <ul className="space-y-1 text-xs text-slate-300 mt-2.5">
                            {t.perks.map((p, pIdx) => (
                              <li key={pIdx} className="flex items-center space-x-1.5 text-slate-400">
                                <Check size={12} className={isUnlocked ? 'text-emerald-400' : 'text-slate-600'} />
                                <span>{p}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 5. XP LEDGER / PASSBOOK TAB */}
            {activeTab === 'ledger' && (
              <div className="space-y-4 max-w-3xl mx-auto">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-white">XP Transaction Passbook</h3>
                    <p className="text-xs text-slate-400">Audit trail of all study points earned and spent in the Rewards Hub</p>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center space-x-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs">
                    {(['all', 'earn', 'spend'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setLedgerFilter(f)}
                        className={`px-3 py-1 font-semibold rounded-lg capitalize transition-colors cursor-pointer ${
                          ledgerFilter === f
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {f === 'all' ? 'All Transactions' : f === 'earn' ? 'Inflow (+XP)' : 'Outflow (-XP)'}
                      </button>
                    ))}
                  </div>
                </div>

                {loadingLedger ? (
                  <div className="text-center py-12 text-slate-500 flex items-center justify-center space-x-2">
                    <RefreshCw size={18} className="animate-spin" />
                    <span>Loading ledger transactions...</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {ledgerEntries
                      .filter(e => ledgerFilter === 'all' || e.type === ledgerFilter)
                      .map(item => {
                        const isEarn = item.type === 'earn';
                        return (
                          <div
                            key={item.id}
                            className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition-colors flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center space-x-3">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                isEarn ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                              }`}>
                                {isEarn ? <Zap size={18} /> : <DollarSign size={18} />}
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-white">{item.description}</div>
                                <div className="text-[11px] text-slate-500 flex items-center space-x-2 mt-0.5">
                                  <span>{new Date(item.createdAt).toLocaleString()}</span>
                                  {item.category && (
                                    <span className="px-1.5 py-0.2 bg-slate-800 rounded text-[9px] uppercase font-mono text-slate-400">
                                      {item.category.replace('_', ' ')}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className={`text-sm font-bold shrink-0 ${
                              isEarn ? 'text-emerald-400' : 'text-rose-400'
                            }`}>
                              {isEarn ? `+${item.amount}` : `-${item.amount}`} XP
                            </div>
                          </div>
                        );
                      })}

                    {ledgerEntries.length === 0 && (
                      <div className="text-center py-12 text-slate-500">
                        <History size={36} className="mx-auto text-slate-600 mb-2" />
                        <p className="text-sm font-medium">No transactions recorded yet.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
