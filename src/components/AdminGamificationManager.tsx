import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Wallet, 
  Gift, 
  Ticket, 
  Crown, 
  Save, 
  RefreshCw, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  AlertCircle, 
  Sliders, 
  DollarSign, 
  Zap, 
  Eye, 
  EyeOff,
  Percent,
  CheckCircle2
} from 'lucide-react';
import { gamificationService } from '../services/gamificationService';
import { 
  GamificationConfig, 
  DEFAULT_GAMIFICATION_CONFIG, 
  DiscountVoucher, 
  SpinWheelSegment, 
  VIPTierDefinition 
} from '../types/gamification';

interface AdminGamificationManagerProps {
  onShowNotification: (message: string, type: 'success' | 'error') => void;
}

export const AdminGamificationManager: React.FC<AdminGamificationManagerProps> = ({
  onShowNotification
}) => {
  const [config, setConfig] = useState<GamificationConfig>(DEFAULT_GAMIFICATION_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'converter' | 'spin' | 'vouchers' | 'vip'>('converter');

  // New Voucher Form state
  const [showAddVoucher, setShowAddVoucher] = useState(false);
  const [editingVoucherId, setEditingVoucherId] = useState<string | null>(null);
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherTitle, setVoucherTitle] = useState('');
  const [voucherDesc, setVoucherDesc] = useState('');
  const [voucherType, setVoucherType] = useState<'percentage' | 'fixed'>('percentage');
  const [voucherValue, setVoucherValue] = useState(15);
  const [voucherXpCost, setVoucherXpCost] = useState(300);
  const [voucherMinSpend, setVoucherMinSpend] = useState(500);
  const [voucherExpiryDays, setVoucherExpiryDays] = useState(30);

  // New Spin Segment Form state
  const [showAddSegment, setShowAddSegment] = useState(false);
  const [newSegLabel, setNewSegLabel] = useState('');
  const [newSegType, setNewSegType] = useState<'xp' | 'wallet' | 'voucher' | 'none'>('xp');
  const [newSegValue, setNewSegValue] = useState(50);
  const [newSegCode, setNewSegCode] = useState('');
  const [newSegColor, setNewSegColor] = useState('#10b981');
  const [newSegProb, setNewSegProb] = useState(0.2);

  // Load config
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const cfg = await gamificationService.getGamificationConfig();
      setConfig(cfg);
    } catch (err) {
      console.error('Failed to load gamification config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      await gamificationService.saveGamificationConfig(config);
      onShowNotification('Gamification & Rewards settings saved successfully to Firestore!', 'success');
    } catch (err: any) {
      onShowNotification(err?.message || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Voucher operations
  const handleSaveVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherCode || !voucherTitle) {
      onShowNotification('Code and Title are required', 'error');
      return;
    }

    const newVoucher: DiscountVoucher = {
      id: editingVoucherId || `vouch_${Date.now()}`,
      code: voucherCode.toUpperCase().trim(),
      title: voucherTitle,
      titleBn: '',
      description: voucherDesc,
      discountType: voucherType,
      discountValue: Number(voucherValue),
      xpCost: Number(voucherXpCost),
      minSpend: Number(voucherMinSpend),
      expiryDays: Number(voucherExpiryDays),
      badgeText: voucherType === 'percentage' ? `${voucherValue}% OFF` : `৳${voucherValue} OFF`,
      icon: voucherType === 'percentage' ? '🎟️' : '💰',
      isActive: true
    };

    let updatedVouchers = [...config.vouchers];
    if (editingVoucherId) {
      updatedVouchers = updatedVouchers.map(v => v.id === editingVoucherId ? newVoucher : v);
    } else {
      updatedVouchers.push(newVoucher);
    }

    setConfig(prev => ({ ...prev, vouchers: updatedVouchers }));
    setShowAddVoucher(false);
    setEditingVoucherId(null);
    resetVoucherForm();
    onShowNotification('Voucher updated in configuration. Remember to click "Save to Firestore"!', 'success');
  };

  const resetVoucherForm = () => {
    setVoucherCode('');
    setVoucherTitle('');
    setVoucherDesc('');
    setVoucherType('percentage');
    setVoucherValue(15);
    setVoucherXpCost(300);
    setVoucherMinSpend(500);
    setVoucherExpiryDays(30);
  };

  const handleDeleteVoucher = (id: string) => {
    setConfig(prev => ({ ...prev, vouchers: prev.vouchers.filter(v => v.id !== id) }));
  };

  const handleToggleVoucher = (id: string) => {
    setConfig(prev => ({
      ...prev,
      vouchers: prev.vouchers.map(v => v.id === id ? { ...v, isActive: !v.isActive } : v)
    }));
  };

  // Spin Segment operations
  const handleAddSegment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSegLabel) return;

    const newSeg: SpinWheelSegment = {
      id: `spin_${Date.now()}`,
      label: newSegLabel,
      type: newSegType as any,
      value: Number(newSegValue),
      voucherCode: newSegCode ? newSegCode.toUpperCase().trim() : undefined,
      color: newSegColor,
      textColor: '#ffffff',
      probability: Number(newSegProb),
      icon: newSegType === 'wallet' ? '💰' : newSegType === 'voucher' ? '🎟️' : '⚡'
    };

    setConfig(prev => ({
      ...prev,
      spinWheel: {
        ...prev.spinWheel,
        segments: [...prev.spinWheel.segments, newSeg]
      }
    }));

    setShowAddSegment(false);
    setNewSegLabel('');
    setNewSegCode('');
    onShowNotification('Spin wheel segment added. Click "Save to Firestore" to apply!', 'success');
  };

  const handleDeleteSegment = (id: string) => {
    if (config.spinWheel.segments.length <= 2) {
      onShowNotification('The wheel must have at least 2 segments.', 'error');
      return;
    }
    setConfig(prev => ({
      ...prev,
      spinWheel: {
        ...prev.spinWheel,
        segments: prev.spinWheel.segments.filter(s => s.id !== id)
      }
    }));
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 flex items-center justify-center space-x-2">
        <RefreshCw size={20} className="animate-spin text-amber-400" />
        <span>Loading dynamic gamification configuration...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header bar with Master Toggle & Save Button */}
      <div className="p-4 bg-slate-950 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white font-mono uppercase flex items-center space-x-2">
              <span>Dynamic XP Gamification & Rewards Control</span>
              <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] rounded-full">
                FIRESTORE LIVE
              </span>
            </h3>
            <p className="text-xs text-slate-400">Real-time control over XP conversion rates, spin wheels, discount vouchers, and VIP perks</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setConfig(prev => ({ ...prev, isEnabled: !prev.isEnabled }))}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold uppercase transition-all flex items-center space-x-1.5 cursor-pointer border ${
              config.isEnabled
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-red-500/20 text-red-400 border-red-500/40'
            }`}
          >
            {config.isEnabled ? <Check size={14} /> : <EyeOff size={14} />}
            <span>{config.isEnabled ? 'System Active' : 'System Disabled'}</span>
          </button>

          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-mono font-bold text-xs rounded-xl uppercase tracking-wider flex items-center space-x-1.5 shadow-lg shadow-amber-500/20 cursor-pointer active:scale-95 transition-all"
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            <span>Save to Firestore</span>
          </button>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex border-b border-slate-800 bg-slate-900/60 rounded-xl p-1 gap-1 overflow-x-auto">
        {[
          { id: 'converter', label: 'XP to Wallet Converter', icon: Wallet },
          { id: 'spin', label: 'Lucky Spin Wheel', icon: Gift },
          { id: 'vouchers', label: `Discount Vouchers (${config.vouchers.length})`, icon: Ticket },
          { id: 'vip', label: `VIP Tiers (${config.vipTiers.length})`, icon: Crown }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUBTAB 1: CONVERTER SETTINGS */}
      {activeSubTab === 'converter' && (
        <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h4 className="text-xs font-mono font-bold text-white uppercase">XP to Wallet Conversion Parameters</h4>
              <p className="text-xs text-slate-400">Configure how student XP converts to BDT wallet balance</p>
            </div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.converter.isEnabled}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  converter: { ...prev.converter, isEnabled: e.target.checked }
                }))}
                className="accent-amber-500 w-4 h-4 rounded cursor-pointer"
              />
              <span className="text-xs font-mono text-slate-300">Enable Converter</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                XP Per 1 BDT (Rate) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  value={config.converter.xpPerCurrencyUnit}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    converter: { ...prev.converter, xpPerCurrencyUnit: Math.max(1, Number(e.target.value)) }
                  }))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-amber-400 font-mono font-bold focus:border-amber-500"
                />
                <span className="absolute right-3 top-2 text-[10px] text-slate-500 font-mono">XP / ৳1</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Currently: {config.converter.xpPerCurrencyUnit * 10} XP = ৳10 BDT (100 XP = ৳{(100 / config.converter.xpPerCurrencyUnit).toFixed(0)})
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                Minimum XP Threshold *
              </label>
              <input
                type="number"
                min={10}
                value={config.converter.minXPThreshold}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  converter: { ...prev.converter, minXPThreshold: Number(e.target.value) }
                }))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono focus:border-amber-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">Min XP needed before converting to wallet</p>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                Max Daily Conversion (XP)
              </label>
              <input
                type="number"
                min={100}
                value={config.converter.maxDailyConversionXP}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  converter: { ...prev.converter, maxDailyConversionXP: Number(e.target.value) }
                }))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono focus:border-amber-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">Cap to prevent abuse / balance flooding</p>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: LUCKY SPIN WHEEL CONFIG */}
      {activeSubTab === 'spin' && (
        <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-wrap gap-2">
            <div>
              <h4 className="text-xs font-mono font-bold text-white uppercase">Lucky Spin Wheel Customizer</h4>
              <p className="text-xs text-slate-400">Configure spin costs, daily free spins, and wheel segments</p>
            </div>
            <div className="flex items-center space-x-3">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.spinWheel.isEnabled}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    spinWheel: { ...prev.spinWheel, isEnabled: e.target.checked }
                  }))}
                  className="accent-amber-500 w-4 h-4 rounded cursor-pointer"
                />
                <span className="text-xs font-mono text-slate-300">Enable Spin Wheel</span>
              </label>

              <button
                type="button"
                onClick={() => setShowAddSegment(!showAddSegment)}
                className="px-3 py-1.5 bg-amber-500 text-black text-xs font-mono font-bold rounded-lg flex items-center space-x-1 cursor-pointer"
              >
                <Plus size={12} />
                <span>{showAddSegment ? 'Cancel' : 'Add Slice'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                XP Cost Per Spin (When Free Spins Exceeded)
              </label>
              <input
                type="number"
                min={10}
                value={config.spinWheel.spinCostXP}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  spinWheel: { ...prev.spinWheel, spinCostXP: Number(e.target.value) }
                }))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                Base Daily Free Spins Per Student
              </label>
              <input
                type="number"
                min={0}
                value={config.spinWheel.dailyFreeSpins}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  spinWheel: { ...prev.spinWheel, dailyFreeSpins: Number(e.target.value) }
                }))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono focus:border-amber-500"
              />
            </div>
          </div>

          {/* Add Segment Form */}
          {showAddSegment && (
            <form onSubmit={handleAddSegment} className="p-4 bg-slate-900 border border-amber-500/40 rounded-xl space-y-3">
              <h5 className="text-xs font-mono font-bold text-amber-400 uppercase">Add New Wheel Slice</h5>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 text-[10px] uppercase">Slice Label *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. +75 XP"
                    value={newSegLabel}
                    onChange={(e) => setNewSegLabel(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white mt-1"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[10px] uppercase">Reward Type *</label>
                  <select
                    value={newSegType}
                    onChange={(e) => setNewSegType(e.target.value as any)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white mt-1"
                  >
                    <option value="xp">⚡ XP Points</option>
                    <option value="wallet">💰 Wallet Balance (BDT)</option>
                    <option value="voucher">🎟️ Discount Voucher</option>
                    <option value="none">🎯 Try Again (No Reward)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 text-[10px] uppercase">Value / Amount</label>
                  <input
                    type="number"
                    value={newSegValue}
                    onChange={(e) => setNewSegValue(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white mt-1"
                  />
                </div>
                {newSegType === 'voucher' && (
                  <div>
                    <label className="block text-slate-400 text-[10px] uppercase">Coupon Code</label>
                    <input
                      type="text"
                      placeholder="e.g. LUCKY20"
                      value={newSegCode}
                      onChange={(e) => setNewSegCode(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white mt-1"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-slate-400 text-[10px] uppercase">Slice Color</label>
                  <input
                    type="color"
                    value={newSegColor}
                    onChange={(e) => setNewSegColor(e.target.value)}
                    className="w-full h-8 bg-slate-950 border border-slate-700 rounded-lg mt-1 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[10px] uppercase">Win Probability (0.01 - 1.0)</label>
                  <input
                    type="number"
                    step={0.01}
                    min={0.01}
                    max={1}
                    value={newSegProb}
                    onChange={(e) => setNewSegProb(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white mt-1"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-500 text-black font-bold rounded-lg text-xs font-mono uppercase cursor-pointer"
              >
                Add Segment to Wheel
              </button>
            </form>
          )}

          {/* Current Segments List */}
          <div className="space-y-2">
            <h5 className="text-xs font-mono font-bold text-slate-400 uppercase">Configured Wheel Slices ({config.spinWheel.segments.length})</h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {config.spinWheel.segments.map((seg, idx) => (
                <div key={seg.id || idx} className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/20" style={{ backgroundColor: seg.color }} />
                    <div>
                      <div className="font-bold text-white">{seg.label}</div>
                      <div className="text-[10px] text-slate-400">
                        Type: {seg.type} | Prob: {(seg.probability * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteSegment(seg.id)}
                    className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: DISCOUNT VOUCHERS MANAGER */}
      {activeSubTab === 'vouchers' && (
        <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h4 className="text-xs font-mono font-bold text-white uppercase">Course Discount Vouchers Catalog</h4>
              <p className="text-xs text-slate-400">Define promo codes that students can redeem using study XP</p>
            </div>
            <button
              onClick={() => {
                setShowAddVoucher(!showAddVoucher);
                setEditingVoucherId(null);
                resetVoucherForm();
              }}
              className="px-3 py-1.5 bg-amber-500 text-black text-xs font-mono font-bold rounded-lg flex items-center space-x-1 cursor-pointer"
            >
              <Plus size={14} />
              <span>{showAddVoucher ? 'Cancel' : 'Add New Voucher'}</span>
            </button>
          </div>

          {/* Add / Edit Voucher Form */}
          {showAddVoucher && (
            <form onSubmit={handleSaveVoucher} className="p-4 bg-slate-900 border border-amber-500/40 rounded-xl space-y-3 text-xs">
              <h5 className="font-bold text-amber-400 font-mono uppercase">
                {editingVoucherId ? 'Edit Discount Voucher' : 'Create New Discount Voucher'}
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 text-[10px] uppercase">Coupon Code Base *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. XP20OFF"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white mt-1 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[10px] uppercase">Voucher Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 20% Pro Discount"
                    value={voucherTitle}
                    onChange={(e) => setVoucherTitle(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white mt-1"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[10px] uppercase">XP Redemption Cost *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={voucherXpCost}
                    onChange={(e) => setVoucherXpCost(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-amber-400 font-bold mt-1"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[10px] uppercase">Discount Type</label>
                  <select
                    value={voucherType}
                    onChange={(e) => setVoucherType(e.target.value as any)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white mt-1"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (৳)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 text-[10px] uppercase">Discount Value ({voucherType === 'percentage' ? '%' : '৳'})</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={voucherValue}
                    onChange={(e) => setVoucherValue(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white mt-1"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[10px] uppercase">Min Course Spend (৳)</label>
                  <input
                    type="number"
                    min={0}
                    value={voucherMinSpend}
                    onChange={(e) => setVoucherMinSpend(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white mt-1"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[10px] uppercase">Validity (Days)</label>
                  <input
                    type="number"
                    min={1}
                    value={voucherExpiryDays}
                    onChange={(e) => setVoucherExpiryDays(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white mt-1"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-slate-400 text-[10px] uppercase">Description / Conditions</label>
                  <input
                    type="text"
                    placeholder="e.g. Valid on all web & mobile development courses."
                    value={voucherDesc}
                    onChange={(e) => setVoucherDesc(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white mt-1"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-500 text-black font-bold rounded-lg uppercase tracking-wider font-mono cursor-pointer"
              >
                {editingVoucherId ? 'Save Changes' : 'Publish Voucher to Catalog'}
              </button>
            </form>
          )}

          {/* Vouchers Table */}
          <div className="space-y-2">
            {config.vouchers.map(v => (
              <div
                key={v.id}
                className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between flex-wrap gap-3 text-xs"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xl shrink-0">
                    {v.icon || '🎟️'}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white font-mono">{v.code}</span>
                      <span className="text-slate-300 font-semibold">• {v.title}</span>
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-bold">
                        {v.discountValue}{v.discountType === 'percentage' ? '%' : ' Tk'} OFF
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Cost: <strong className="text-amber-400">{v.xpCost} XP</strong> | Min Spend: ৳{v.minSpend} | Valid: {v.expiryDays} Days
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleToggleVoucher(v.id)}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase cursor-pointer border ${
                      v.isActive
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                        : 'bg-red-500/10 text-red-400 border-red-500/30'
                    }`}
                  >
                    {v.isActive ? 'Active' : 'Disabled'}
                  </button>

                  <button
                    onClick={() => {
                      setEditingVoucherId(v.id);
                      setVoucherCode(v.code);
                      setVoucherTitle(v.title);
                      setVoucherDesc(v.description);
                      setVoucherType(v.discountType);
                      setVoucherValue(v.discountValue);
                      setVoucherXpCost(v.xpCost);
                      setVoucherMinSpend(v.minSpend);
                      setVoucherExpiryDays(v.expiryDays);
                      setShowAddVoucher(true);
                    }}
                    className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded cursor-pointer"
                  >
                    <Edit3 size={13} />
                  </button>

                  <button
                    onClick={() => handleDeleteVoucher(v.id)}
                    className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 4: VIP TIERS CONFIG */}
      {activeSubTab === 'vip' && (
        <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-4">
          <div className="pb-2 border-b border-slate-800">
            <h4 className="text-xs font-mono font-bold text-white uppercase">VIP Tier Progression Thresholds</h4>
            <p className="text-xs text-slate-400">Edit minimum XP requirements and perks granted at each VIP level</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {config.vipTiers.map((tier, idx) => (
              <div key={tier.tierId} className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{tier.badgeIcon}</span>
                    <div>
                      <h5 className="font-bold text-white">{tier.name}</h5>
                      <span className="text-[10px] text-slate-400">Tier #{idx + 1}</span>
                    </div>
                  </div>
                  <div className="w-28">
                    <label className="block text-[9px] text-slate-400 uppercase">Min XP Required</label>
                    <input
                      type="number"
                      value={tier.minXP}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setConfig(prev => ({
                          ...prev,
                          vipTiers: prev.vipTiers.map(t => t.tierId === tier.tierId ? { ...t, minXP: val } : t)
                        }));
                      }}
                      className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-amber-400 font-bold text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <label className="block text-[9px] text-slate-400 uppercase">Daily Free Spins</label>
                    <input
                      type="number"
                      min={1}
                      value={tier.dailyFreeSpins}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setConfig(prev => ({
                          ...prev,
                          vipTiers: prev.vipTiers.map(t => t.tierId === tier.tierId ? { ...t, dailyFreeSpins: val } : t)
                        }));
                      }}
                      className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-400 uppercase">Course Discount %</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={tier.courseDiscountPercent}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setConfig(prev => ({
                          ...prev,
                          vipTiers: prev.vipTiers.map(t => t.tierId === tier.tierId ? { ...t, courseDiscountPercent: val } : t)
                        }));
                      }}
                      className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-white text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] text-slate-400 uppercase mb-1">Perks (Comma Separated)</label>
                  <input
                    type="text"
                    value={tier.perks.join(', ')}
                    onChange={(e) => {
                      const list = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                      setConfig(prev => ({
                        ...prev,
                        vipTiers: prev.vipTiers.map(t => t.tierId === tier.tierId ? { ...t, perks: list } : t)
                      }));
                    }}
                    className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-slate-300 text-xs"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
