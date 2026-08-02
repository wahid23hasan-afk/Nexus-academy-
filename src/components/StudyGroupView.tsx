import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Clock, 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  MessageSquare, 
  Plus, 
  CheckCircle2, 
  Circle, 
  Sparkles, 
  Music, 
  Radio, 
  Send,
  Flame,
  UserCheck
} from 'lucide-react';

interface StudyRoom {
  id: string;
  title: string;
  subject: string;
  activeMembers: number;
  maxMembers: number;
  description: string;
  tags: string[];
  hostName: string;
  isPrivate?: boolean;
}

const DEFAULT_ROOMS: StudyRoom[] = [
  {
    id: 'room_1',
    title: '⚡ HSC Physics & Vector Problem Solving Squad',
    subject: 'HSC Science',
    activeMembers: 7,
    maxMembers: 12,
    description: 'Solving board questions together! Silent focus session with Pomodoro timer.',
    tags: ['Physics', 'Vector', 'Pomodoro'],
    hostName: 'Rakib Hasan'
  },
  {
    id: 'room_2',
    title: '💻 Web Dev MERN Stack Code-Along Room',
    subject: 'Programming',
    activeMembers: 11,
    maxMembers: 15,
    description: 'Building full-stack projects in React & Express. Ask questions and review code live.',
    tags: ['React', 'Node.js', 'Live Code'],
    hostName: 'Tanvir Ahmed'
  },
  {
    id: 'room_3',
    title: '🎓 BUET Engineering Mathematics Grind',
    subject: 'Admission Prep',
    activeMembers: 5,
    maxMembers: 10,
    description: 'Targeting calculus & coordinate geometry high-yield formulas.',
    tags: ['BUET', 'Math', 'Calculus'],
    hostName: 'Siam Rahman'
  },
  {
    id: 'room_4',
    title: '🗣️ IELTS Band 8.0 Speaking Practice Circle',
    subject: 'English Language',
    activeMembers: 4,
    maxMembers: 8,
    description: 'Mock speaking tests and vocabulary exchange for upcoming exam dates.',
    tags: ['IELTS', 'Speaking', 'Vocab'],
    hostName: 'Nusrat Jahan'
  }
];

const AMBIENT_SOUNDS = [
  { id: 'none', label: '🔇 Off', icon: VolumeX },
  { id: 'rain', label: '🌧️ Heavy Rain', icon: Volume2 },
  { id: 'lofi', label: '🎧 Lo-Fi Chill Beats', icon: Radio },
  { id: 'cafe', label: '☕ Cozy Coffee Shop', icon: Music },
  { id: 'forest', label: '🌲 Forest Stream', icon: Sparkles }
];

interface StudyGroupViewProps {
  userProfile: { fullName: string; username: string } | null;
  onShowNotification: (message: string, type: 'success' | 'error') => void;
}

export function StudyGroupView({ userProfile, onShowNotification }: StudyGroupViewProps) {
  const [rooms, setRooms] = useState<StudyRoom[]>(DEFAULT_ROOMS);
  const [activeRoom, setActiveRoom] = useState<StudyRoom | null>(null);

  // Pomodoro Timer States
  const [timerMode, setTimerMode] = useState<'focus' | 'shortBreak' | 'longBreak'>('focus');
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60); // 25 minutes
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [completedPomodoros, setCompletedPomodoros] = useState<number>(2);

  // Ambient sound selection
  const [selectedSound, setSelectedSound] = useState<string>('none');

  // Room Chat States
  const [messages, setMessages] = useState<Array<{ id: string; sender: string; text: string; time: string }>>([
    { id: 'm1', sender: 'Rakib Hasan', text: 'Welcome everyone! Today we are tackling Chapter 3 vectors.', time: '10:15 AM' },
    { id: 'm2', sender: 'Amina Khatun', text: 'Started 25 min focus sprint. Good luck all!', time: '10:18 AM' }
  ]);
  const [chatInput, setChatInput] = useState<string>('');

  // Room Study Tasks Checklist
  const [tasks, setTasks] = useState<Array<{ id: string; title: string; completed: boolean }>>([
    { id: 't1', title: 'Solve 5 Vector Dot Product Math Problems', completed: true },
    { id: 't2', title: 'Review Newton Motion Formulas', completed: false },
    { id: 't3', title: 'Write summary notes on momentum conservation', completed: false }
  ]);
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');

  // Timer Effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(t => t - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsTimerRunning(false);
      if (timerMode === 'focus') {
        setCompletedPomodoros(c => c + 1);
        onShowNotification('🔔 Focus session complete! Time for a 5-minute break.', 'success');
        setTimerMode('shortBreak');
        setTimeLeft(5 * 60);
      } else {
        onShowNotification('⏰ Break over! Ready for the next focus sprint?', 'success');
        setTimerMode('focus');
        setTimeLeft(25 * 60);
      }
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timeLeft, timerMode]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleModeChange = (mode: 'focus' | 'shortBreak' | 'longBreak') => {
    setTimerMode(mode);
    setIsTimerRunning(false);
    if (mode === 'focus') setTimeLeft(25 * 60);
    else if (mode === 'shortBreak') setTimeLeft(5 * 60);
    else setTimeLeft(15 * 60);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMsg = {
      id: 'msg_' + Date.now(),
      sender: userProfile?.fullName || 'Scholar',
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, newMsg]);
    setChatInput('');
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    setTasks(prev => [...prev, { id: 't_' + Date.now(), title: newTaskTitle.trim(), completed: false }]);
    setNewTaskTitle('');
  };

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner */}
      <div className="glass-panel p-5 rounded-2xl relative overflow-hidden border border-cyan-500/20 bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-950">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-mono font-bold uppercase tracking-wider">
              <Users size={12} className="text-cyan-400" />
              <span>P2P Study Group & Pomodoro Arena</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Virtual Study Rooms & Focus Timer
            </h2>
            <p className="text-xs text-slate-300 max-w-xl font-sans">
              Study synchronously with peers, track focus hours with Pomodoro sprints, listen to lo-fi ambient audio, and share session task lists.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl flex items-center space-x-2 text-xs font-mono text-cyan-400">
              <Flame size={16} className="text-cyan-400" />
              <span>{completedPomodoros} Sprints Today</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Side Rooms or Active Room / Right Side Pomodoro Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column (2 cols): Room List or Joined Room */}
        <div className="lg:col-span-2 space-y-4">
          {!activeRoom ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
                  <Radio size={16} className="text-cyan-400" />
                  <span>Active Live Study Rooms ({rooms.length})</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {rooms.map((room) => (
                  <motion.div
                    key={room.id}
                    whileHover={{ y: -2 }}
                    className="glass-panel p-5 rounded-2xl border border-white/10 hover:border-cyan-500/40 bg-white/[0.02] hover:bg-white/[0.04] transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20">
                          {room.subject}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 flex items-center space-x-1">
                          <Users size={12} className="text-emerald-400" />
                          <span>{room.activeMembers}/{room.maxMembers} Online</span>
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-white leading-snug">
                        {room.title}
                      </h4>
                      <p className="text-xs text-slate-400 line-clamp-2">
                        {room.description}
                      </p>
                    </div>

                    <div className="space-y-3 pt-2 border-t border-white/5">
                      <div className="flex flex-wrap gap-1">
                        {room.tags.map(t => (
                          <span key={t} className="text-[9px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded-md">
                            #{t}
                          </span>
                        ))}
                      </div>

                      <button
                        onClick={() => {
                          setActiveRoom(room);
                          onShowNotification(`Joined "${room.title}"! Happy studying.`, 'success');
                        }}
                        className="w-full py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 font-mono text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-2"
                      >
                        <UserCheck size={14} />
                        <span>Join Study Room</span>
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ) : (
            /* Joined Room Chat & Shared Task Workspace */
            <div className="space-y-4">
              {/* Joined Room Header */}
              <div className="glass-panel p-4 rounded-2xl border border-cyan-500/30 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">{activeRoom.subject} • Host: {activeRoom.hostName}</span>
                  <h3 className="text-sm font-bold text-white">{activeRoom.title}</h3>
                </div>
                <button
                  onClick={() => setActiveRoom(null)}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 font-mono text-xs rounded-xl border border-white/10 cursor-pointer"
                >
                  Leave Room
                </button>
              </div>

              {/* Room Live Chat & Session Tasks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Live Chat Box */}
                <div className="glass-panel p-4 rounded-2xl border border-white/10 flex flex-col h-[320px]">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <span className="text-xs font-mono font-bold text-slate-300 flex items-center space-x-1.5">
                      <MessageSquare size={14} className="text-cyan-400" />
                      <span>Room Study Chat</span>
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">🟢 Live</span>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3 py-3 pr-1 text-xs font-sans">
                    {messages.map((m) => (
                      <div key={m.id} className="space-y-0.5 bg-white/[0.02] p-2 rounded-xl border border-white/5">
                        <div className="flex justify-between text-[10px] font-mono">
                          <span className="text-cyan-400 font-bold">{m.sender}</span>
                          <span className="text-slate-500">{m.time}</span>
                        </div>
                        <p className="text-slate-200 text-xs">{m.text}</p>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleSendMessage} className="pt-2 border-t border-white/10 flex space-x-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Share a thought or formula..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                    <button type="submit" className="px-3 py-1.5 bg-cyan-500 text-black rounded-xl font-bold text-xs cursor-pointer">
                      <Send size={14} />
                    </button>
                  </form>
                </div>

                {/* Session Goal Checklist */}
                <div className="glass-panel p-4 rounded-2xl border border-white/10 flex flex-col h-[320px]">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <span className="text-xs font-mono font-bold text-slate-300 flex items-center space-x-1.5">
                      <CheckCircle2 size={14} className="text-emerald-400" />
                      <span>Sprint Goal Checklist</span>
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2 py-3 pr-1 text-xs">
                    {tasks.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => toggleTask(t.id)}
                        className={`p-2.5 rounded-xl border flex items-center space-x-2.5 transition-all cursor-pointer ${
                          t.completed 
                            ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-400 line-through' 
                            : 'bg-white/5 border-white/10 text-white hover:border-cyan-500/40'
                        }`}
                      >
                        {t.completed ? <CheckCircle2 size={16} className="text-emerald-400 shrink-0" /> : <Circle size={16} className="text-slate-500 shrink-0" />}
                        <span className="text-xs font-sans">{t.title}</span>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleAddTask} className="pt-2 border-t border-white/10 flex space-x-2">
                    <input
                      type="text"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="Add goal for this sprint..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                    <button type="submit" className="px-3 py-1.5 bg-emerald-500 text-black rounded-xl font-bold text-xs cursor-pointer">
                      <Plus size={14} />
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar Widget: Focus Pomodoro Clock & Ambient Audio */}
        <div className="space-y-4">
          {/* Pomodoro Timer Box */}
          <div className="glass-panel p-6 rounded-2xl border border-cyan-500/30 bg-slate-900/90 text-center space-y-6">
            <div className="flex justify-center space-x-1 p-1 bg-white/5 rounded-xl border border-white/10 text-[11px] font-mono">
              <button
                onClick={() => handleModeChange('focus')}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                  timerMode === 'focus' ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Focus (25m)
              </button>
              <button
                onClick={() => handleModeChange('shortBreak')}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                  timerMode === 'shortBreak' ? 'bg-emerald-500 text-black font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Break (5m)
              </button>
              <button
                onClick={() => handleModeChange('longBreak')}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                  timerMode === 'longBreak' ? 'bg-purple-500 text-black font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Rest (15m)
              </button>
            </div>

            {/* Big Timer Clock Display */}
            <div className="relative py-4">
              <span className="text-5xl font-mono font-extrabold tracking-tight text-white drop-shadow-[0_0_12px_rgba(6,182,212,0.4)]">
                {formatTime(timeLeft)}
              </span>
              <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mt-2">
                {timerMode === 'focus' ? '🔥 Deep Concentration Sprint' : '☕ Relax & Stretch Break'}
              </p>
            </div>

            {/* Timer Controls */}
            <div className="flex justify-center space-x-3">
              <button
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className={`px-6 py-3 rounded-xl font-mono text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer shadow-lg ${
                  isTimerRunning 
                    ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20' 
                    : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-cyan-500/20'
                }`}
              >
                {isTimerRunning ? <Pause size={18} /> : <Play size={18} />}
                <span>{isTimerRunning ? 'Pause Sprint' : 'Start Focus'}</span>
              </button>

              <button
                onClick={() => handleModeChange(timerMode)}
                className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-300 transition-colors cursor-pointer"
                title="Reset Timer"
              >
                <RotateCcw size={18} />
              </button>
            </div>
          </div>

          {/* Ambient Soundscapes Switcher */}
          <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-3">
            <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
              <Music size={14} className="text-cyan-400" />
              <span>Background Focus Soundscapes</span>
            </h4>

            <div className="space-y-1.5">
              {AMBIENT_SOUNDS.map((snd) => (
                <button
                  key={snd.id}
                  onClick={() => {
                    setSelectedSound(snd.id);
                    onShowNotification(snd.id === 'none' ? 'Sound muted.' : `Playing ${snd.label}`, 'success');
                  }}
                  className={`w-full p-2.5 rounded-xl border text-left text-xs font-mono flex items-center justify-between transition-all cursor-pointer ${
                    selectedSound === snd.id
                      ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400 font-bold'
                      : 'bg-white/[0.02] border-white/5 text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span>{snd.label}</span>
                  {selectedSound === snd.id && <span className="text-[10px] text-cyan-400">Active 🎵</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
