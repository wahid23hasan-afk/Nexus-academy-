import { MilestoneNotification, MilestoneType } from '../types/milestone';

// Audio Synthesizer for Milestone Fanfare using Web Audio API
export const playMilestoneSound = (type: MilestoneType = 'xp') => {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // Fanfare chords based on type
    let freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 (Major Arpeggio)
    if (type === 'streak') freqs = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5 (Warm Major)
    if (type === 'level') freqs = [392, 493.88, 587.33, 783.99, 987.77]; // Level up ascending
    if (type === 'badge') freqs = [587.33, 739.99, 880, 1174.66]; // D Major Sparkle

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = idx === freqs.length - 1 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);

      gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.08);
      osc.stop(ctx.currentTime + idx * 0.08 + 0.45);
    });
  } catch (err) {
    // Silent fail if audio context is restricted
  }
};

export const triggerMilestoneToast = (milestone: Omit<MilestoneNotification, 'id' | 'createdAt'>) => {
  if (typeof window === 'undefined') return;

  const fullMilestone: MilestoneNotification = {
    ...milestone,
    id: `ms_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: Date.now()
  };

  window.dispatchEvent(new CustomEvent('nexus_milestone_reached', { detail: fullMilestone }));
  playMilestoneSound(milestone.type);
};

// Check XP Threshold Milestones
export const checkXpMilestones = (userId: string, oldXP: number, newXP: number) => {
  const milestones = [
    { target: 100, title: '⚡ 100 XP Pioneer', desc: 'Reached your first 100 XP milestone!', theme: 'green' as const },
    { target: 250, title: '⚡ 250 XP Scholar', desc: 'Quarter-kilo XP milestone unlocked!', theme: 'cyan' as const },
    { target: 500, title: '⚡ 500 XP Vanguard', desc: '500 XP Milestone reached! You are on fire!', theme: 'amber' as const },
    { target: 1000, title: '⚡ 1,000 XP Mastermind', desc: '1,000 XP reached! Outstanding dedication!', theme: 'purple' as const },
    { target: 2500, title: '⚡ 2,500 XP Titan', desc: '2,500 XP Legendary milestone!', theme: 'purple' as const },
    { target: 5000, title: '⚡ 5,000 XP Apex Scholar', desc: '5,000 XP Unstoppable learning force!', theme: 'rose' as const },
    { target: 10000, title: '⚡ 10,000 XP Hall of Fame', desc: '10,000 XP Mythic status achieved!', theme: 'rose' as const }
  ];

  milestones.forEach((m) => {
    if (oldXP < m.target && newXP >= m.target) {
      const storageKey = `nexus_milestone_xp_${userId}_${m.target}`;
      if (!localStorage.getItem(storageKey)) {
        localStorage.setItem(storageKey, new Date().toISOString());
        triggerMilestoneToast({
          type: 'xp',
          title: m.title,
          value: `${newXP} XP`,
          description: m.desc,
          icon: '⚡',
          colorTheme: m.theme,
          actionLabel: 'View Leaderboard'
        });
      }
    }
  });
};

// Check Streak Milestones
export const checkStreakMilestones = (userId: string, streakCount: number) => {
  const milestones = [
    { days: 3, title: '🔥 3-Day Spark', desc: '3 consecutive days of active learning!', theme: 'amber' as const },
    { days: 7, title: '🔥 7-Day Flame', desc: '7-Day Streak achieved! A full week of consistency!', theme: 'amber' as const },
    { days: 14, title: '🔥 14-Day Torch', desc: '2 solid weeks of non-stop daily progress!', theme: 'green' as const },
    { days: 30, title: '🔥 30-Day Inferno', desc: '30-Day Streak! Master of daily habit!', theme: 'purple' as const },
    { days: 60, title: '🔥 60-Day Unstoppable', desc: '60 days in a row! Elite discipline!', theme: 'purple' as const },
    { days: 100, title: '🔥 100-Day Legend', desc: '100-Day Streak Century Club!', theme: 'rose' as const }
  ];

  milestones.forEach((m) => {
    if (streakCount >= m.days) {
      const storageKey = `nexus_milestone_streak_${userId}_${m.days}`;
      if (!localStorage.getItem(storageKey)) {
        localStorage.setItem(storageKey, new Date().toISOString());
        triggerMilestoneToast({
          type: 'streak',
          title: m.title,
          value: `${streakCount}-Day Streak`,
          description: m.desc,
          icon: '🔥',
          colorTheme: m.theme,
          actionLabel: 'Keep It Up'
        });
      }
    }
  });
};
