import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Play, Pause, RotateCcw, Flame, CheckCircle2, Clock, Zap } from 'lucide-react';
import { soundFxService } from '../services/soundFxService';
import { gamificationService } from '../services/gamificationService';

interface SmartFocusTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onShowNotification: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export function SmartFocusTimerModal({
  isOpen,
  onClose,
  userId,
  onShowNotification
}: SmartFocusTimerModalProps) {
  const [mode, setMode] = useState<'study' | 'shortBreak' | 'longBreak'>('study');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);

  const durationMap = {
    study: 25 * 60,
    shortBreak: 5 * 60,
    longBreak: 15 * 60
  };

  useEffect(() => {
    setTimeLeft(durationMap[mode]);
    setIsRunning(false);
  }, [mode]);

  useEffect(() => {
    let timer: any = null;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      soundFxService.playTimerComplete();

      if (mode === 'study') {
        const newCount = completedSessions + 1;
        setCompletedSessions(newCount);
        // Grant XP for completed focus session
        if (userId) {
          gamificationService.addXP(userId, 25, 'Completed 25-Min Focus Session');
          gamificationService.updateActivity(userId, 25);
        }
        onShowNotification('🎯 Focus Session complete! +25 XP awarded. Take a well-deserved break!', 'success');
        setMode(newCount % 4 === 0 ? 'longBreak' : 'shortBreak');
      } else {
        onShowNotification('⚡ Break complete! Ready to start next focus sprint?', 'info');
        setMode('study');
      }
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRunning, timeLeft, mode, completedSessions, userId]);

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

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const totalDuration = durationMap[mode];
  const progress = ((totalDuration - timeLeft) / totalDuration) * 100;

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
          initial={{ opacity: 0, scale: 0.9, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 15 }}
          className="relative w-full max-w-sm rounded-2xl sm:rounded-3xl bg-[#0a0f1d] border border-cyan-500/30 p-5 sm:p-6 shadow-[0_0_50px_rgba(0,240,255,0.15)] overflow-hidden z-10 text-center max-h-[88dvh] flex flex-col my-auto"
        >
          {/* Ambient Top Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer border border-white/5"
          >
            <X size={16} />
          </button>

          {/* Header */}
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-mono font-bold uppercase tracking-wider mb-4">
            <Clock size={11} />
            <span>Smart Pomodoro Focus</span>
          </div>

          <h3 className="text-xl font-black text-white mb-2">Deep Study Chamber</h3>
          <p className="text-xs text-slate-400 mb-6">
            Stay in flow state. Earn +25 XP for every completed 25-minute sprint.
          </p>

          {/* Mode Selector Tabs */}
          <div className="flex items-center justify-center p-1 bg-white/5 border border-white/10 rounded-xl mb-6 space-x-1">
            {[
              { id: 'study', label: '25m Focus' },
              { id: 'shortBreak', label: '5m Break' },
              { id: 'longBreak', label: '15m Rest' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setMode(tab.id as any)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  mode === tab.id
                    ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Circular Countdown Display */}
          <div className="relative w-48 h-48 mx-auto mb-6 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="4" className="text-white/10" />
              <circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                className="text-cyan-400 transition-all duration-1000"
                strokeDasharray={`${(progress / 100) * 276.4} 276.4`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-black font-mono text-white tracking-wider">
                {formattedTime}
              </span>
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest mt-1">
                {isRunning ? (mode === 'study' ? 'Deep Flowing...' : 'Resting...') : 'Paused'}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center space-x-3 mb-4">
            <button
              onClick={() => {
                soundFxService.playClick();
                setIsRunning(!isRunning);
              }}
              className={`px-8 py-3 rounded-2xl font-black font-mono text-xs uppercase tracking-wider flex items-center space-x-2 transition-all cursor-pointer shadow-lg ${
                isRunning
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-cyan-400 hover:bg-cyan-300 text-black shadow-cyan-500/25'
              }`}
            >
              {isRunning ? <Pause size={16} /> : <Play size={16} className="fill-black" />}
              <span>{isRunning ? 'Pause' : 'Start Focus'}</span>
            </button>

            <button
              onClick={() => {
                soundFxService.playClick();
                setIsRunning(false);
                setTimeLeft(durationMap[mode]);
              }}
              className="p-3 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-2xl border border-white/10 transition-colors cursor-pointer"
              title="Reset Timer"
            >
              <RotateCcw size={16} />
            </button>
          </div>

          {/* Session Milestone Info */}
          <div className="flex items-center justify-between px-3 py-2 bg-white/[0.02] border border-white/5 rounded-xl text-[11px] font-mono text-slate-400">
            <span>Completed Sprints: <strong className="text-white">{completedSessions}</strong></span>
            <span className="text-cyan-400 font-bold">+25 XP/Session</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
