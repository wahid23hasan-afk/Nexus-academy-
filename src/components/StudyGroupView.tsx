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
  UserCheck,
  Lock,
  Unlock,
  Key,
  X,
  Link as LinkIcon,
  Copy,
  Share2
} from 'lucide-react';
import { db } from '../services/firebase';
import { collection, addDoc, onSnapshot, serverTimestamp, doc, getDoc } from 'firebase/firestore';

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
  password?: string;
  pin?: string;
  hasPassword?: boolean;
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

  // Create Room Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createSubject, setCreateSubject] = useState('HSC Science');
  const [createDescription, setCreateDescription] = useState('');
  const [createPassword, setCreatePassword] = useState('');

  // Room Password Join Prompt Modal States
  const [passwordPromptRoom, setPasswordPromptRoom] = useState<StudyRoom | null>(null);
  const [enteredPassword, setEnteredPassword] = useState('');

  // Join via Room Link Modal States
  const [isJoinLinkModalOpen, setIsJoinLinkModalOpen] = useState(false);
  const [inputRoomLink, setInputRoomLink] = useState('');
  const [linkPassword, setLinkPassword] = useState('');
  const [isSearchingLink, setIsSearchingLink] = useState(false);

  // Subtle Entry Animation Effect for Protected Rooms
  const [showUnlockEffect, setShowUnlockEffect] = useState(false);

  // Firestore Real-time listener for study_rooms
  useEffect(() => {
    try {
      const unsubscribe = onSnapshot(collection(db, 'study_rooms'), (snapshot) => {
        const firestoreRooms: StudyRoom[] = snapshot.docs.map(doc => {
          const data = doc.data();
          const pwd = data.pin || data.password || '';
          return {
            id: doc.id,
            title: data.title || 'Live Study Room',
            subject: data.subject || 'General Study',
            activeMembers: data.activeMembers || 1,
            maxMembers: data.maxMembers || 15,
            description: data.description || 'Student focus room',
            tags: data.tags || [data.subject || 'Study Room'],
            hostName: data.hostName || 'Scholar',
            pin: pwd,
            password: pwd,
            hasPassword: Boolean(pwd)
          };
        });
        setRooms([...firestoreRooms, ...DEFAULT_ROOMS]);
      }, (err) => {
        console.error('Error listening to study_rooms collection:', err);
      });
      return () => unsubscribe();
    } catch (e) {
      console.error('Error initializing study_rooms snapshot:', e);
    }
  }, []);

  // Auto-detect joinRoom query parameter on mount or when rooms update
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const targetRoomId = params.get('joinRoom') || params.get('room') || params.get('joinGroup');
    if (targetRoomId && !activeRoom) {
      let matchedRoom = rooms.find(r => r.id === targetRoomId || r.id.toLowerCase() === targetRoomId.toLowerCase());
      if (matchedRoom) {
        handleJoinRoomClick(matchedRoom);
      } else {
        getDoc(doc(db, 'study_rooms', targetRoomId)).then((docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const pwd = data.pin || data.password || '';
            const fetchedRoom: StudyRoom = {
              id: docSnap.id,
              title: data.title || 'Live Study Room',
              subject: data.subject || 'General Study',
              activeMembers: data.activeMembers || 1,
              maxMembers: data.maxMembers || 15,
              description: data.description || 'Student focus room',
              tags: data.tags || [data.subject || 'Study Room'],
              hostName: data.hostName || 'Scholar',
              pin: pwd,
              password: pwd,
              hasPassword: Boolean(pwd)
            };
            handleJoinRoomClick(fetchedRoom);
          }
        }).catch(err => console.warn('Error fetching joinRoom param:', err));
      }
    }
  }, [rooms]);

  const handleCreateRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTitle.trim()) {
      onShowNotification('Please enter a room title', 'error');
      return;
    }

    const secretPin = createPassword.trim();
    const newRoomData = {
      title: createTitle.trim(),
      subject: createSubject.trim() || 'General Study',
      activeMembers: 1,
      maxMembers: 15,
      description: createDescription.trim() || 'Custom student focus room',
      tags: [createSubject.trim() || 'General', 'Student Room'],
      hostName: userProfile?.fullName || 'Scholar',
      pin: secretPin,
      password: secretPin,
      hasPassword: Boolean(secretPin),
      createdAt: serverTimestamp()
    };

    try {
      const docRef = await addDoc(collection(db, 'study_rooms'), newRoomData);
      const createdRoom: StudyRoom = {
        id: docRef.id,
        ...newRoomData
      };
      setActiveRoom(createdRoom);
      onShowNotification(`Created and joined "${createdRoom.title}"!`, 'success');
    } catch (err) {
      console.error('Error creating study room in Firestore:', err);
      const fallbackRoom: StudyRoom = {
        id: 'custom_room_' + Date.now(),
        ...newRoomData
      };
      setRooms(prev => [fallbackRoom, ...prev]);
      setActiveRoom(fallbackRoom);
      onShowNotification(`Created and joined "${fallbackRoom.title}"!`, 'success');
    }

    setIsCreateModalOpen(false);
    setCreateTitle('');
    setCreateDescription('');
    setCreatePassword('');
  };

  const handleJoinRoomClick = (room: StudyRoom) => {
    const requiredPin = room.pin || room.password;
    if (room.hasPassword || Boolean(requiredPin)) {
      setPasswordPromptRoom(room);
      setEnteredPassword('');
    } else {
      setActiveRoom(room);
      onShowNotification(`Joined "${room.title}"! Happy studying.`, 'success');
    }
  };

  const handleConfirmRoomPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordPromptRoom) return;

    const targetPin = passwordPromptRoom.pin || passwordPromptRoom.password || '';
    if (enteredPassword.trim() === targetPin) {
      setActiveRoom(passwordPromptRoom);
      setShowUnlockEffect(true);
      onShowNotification(`PIN verified! Joined "${passwordPromptRoom.title}".`, 'success');
      setPasswordPromptRoom(null);
      setEnteredPassword('');
    } else {
      onShowNotification('Incorrect room password/PIN! Please try again.', 'error');
    }
  };

  const handleJoinViaLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let targetId = inputRoomLink.trim();
    if (!targetId) {
      onShowNotification('Please enter or paste a valid room link or Room ID', 'error');
      return;
    }

    // Extract room ID if user pasted a full URL
    if (targetId.includes('room=')) {
      const match = targetId.match(/[?&]room=([^&]+)/);
      if (match) targetId = match[1];
    } else if (targetId.includes('/room/')) {
      targetId = targetId.split('/room/').pop()?.split('?')[0] || targetId;
    }

    setIsSearchingLink(true);

    try {
      let roomToJoin = rooms.find(r => r.id === targetId || r.id.toLowerCase() === targetId.toLowerCase());

      if (!roomToJoin) {
        // Fetch room directly from Firestore by ID if not in active state array
        const docSnap = await getDoc(doc(db, 'study_rooms', targetId));
        if (docSnap.exists()) {
          const data = docSnap.data();
          const pwd = data.pin || data.password || '';
          roomToJoin = {
            id: docSnap.id,
            title: data.title || 'Live Study Room',
            subject: data.subject || 'General Study',
            activeMembers: data.activeMembers || 1,
            maxMembers: data.maxMembers || 15,
            description: data.description || 'Student focus room',
            tags: data.tags || [data.subject || 'Study Room'],
            hostName: data.hostName || 'Scholar',
            pin: pwd,
            password: pwd,
            hasPassword: Boolean(pwd)
          };
        }
      }

      if (!roomToJoin) {
        onShowNotification('Study room not found! Please check the link or room ID.', 'error');
        setIsSearchingLink(false);
        return;
      }

      // Check for PIN requirement
      const targetPin = roomToJoin.pin || roomToJoin.password || '';
      const isProtected = roomToJoin.hasPassword || Boolean(targetPin);
      if (isProtected) {
        if (!linkPassword.trim()) {
          onShowNotification('This room is password-protected. Please enter the password/PIN.', 'error');
          setIsSearchingLink(false);
          return;
        }
        if (linkPassword.trim() !== targetPin) {
          onShowNotification('Incorrect room password/PIN! Access denied.', 'error');
          setIsSearchingLink(false);
          return;
        }
      }

      // Successfully join room
      setActiveRoom(roomToJoin);
      if (isProtected) {
        setShowUnlockEffect(true);
      }
      onShowNotification(`Successfully joined "${roomToJoin.title}" via link!`, 'success');
      setIsJoinLinkModalOpen(false);
      setInputRoomLink('');
      setLinkPassword('');
    } catch (err) {
      console.error('Error joining room via link:', err);
      onShowNotification('Failed to join room. Please check connection.', 'error');
    } finally {
      setIsSearchingLink(false);
    }
  };

  // URL Query Param Auto-Detection on page load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlRoomId = params.get('room');
    if (urlRoomId && rooms.length > 0) {
      const targetRoom = rooms.find(r => r.id === urlRoomId);
      if (targetRoom) {
        const targetPin = targetRoom.pin || targetRoom.password;
        if (targetRoom.hasPassword || Boolean(targetPin)) {
          setPasswordPromptRoom(targetRoom);
        } else {
          setActiveRoom(targetRoom);
          onShowNotification(`Joined "${targetRoom.title}" from link!`, 'success');
        }
      }
    }
  }, [rooms]);

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

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-3.5 py-2 bg-[#39FF14]/10 hover:bg-[#39FF14]/20 border border-[#39FF14]/30 text-[#39FF14] text-xs font-mono font-bold rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 shadow-lg shadow-[#39FF14]/10"
            >
              <Plus size={14} />
              <span>Create Custom Room</span>
            </button>

            <button
              onClick={() => {
                setIsJoinLinkModalOpen(true);
                setInputRoomLink('');
                setLinkPassword('');
              }}
              className="px-3.5 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 shadow-lg shadow-cyan-500/10"
            >
              <LinkIcon size={14} />
              <span>Join via Room Link</span>
            </button>

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
                        <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 flex items-center space-x-1">
                          {(room.hasPassword || room.password) && <Lock size={10} className="text-amber-400 mr-1" />}
                          <span>{room.subject}</span>
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

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleJoinRoomClick(room)}
                          className="flex-1 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 font-mono text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-2"
                        >
                          {(room.hasPassword || room.password) ? <Lock size={14} className="text-amber-400" /> : <UserCheck size={14} />}
                          <span>{(room.hasPassword || room.password) ? 'Join Protected Room' : 'Join Study Room'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const roomUrl = `${window.location.origin}${window.location.pathname}?room=${room.id}`;
                            navigator.clipboard.writeText(roomUrl);
                            onShowNotification('Room link copied to clipboard!', 'success');
                          }}
                          title="Copy Room Link"
                          className="p-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-cyan-400 rounded-xl border border-white/10 transition-colors cursor-pointer"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ) : (
            /* Joined Room Chat & Shared Task Workspace */
            <motion.div
              key={activeRoom.id}
              initial={{ opacity: 0, scale: 0.98, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-4"
            >
              {/* Subtle Entry Unlock Banner for Protected Rooms */}
              <AnimatePresence>
                {(showUnlockEffect || activeRoom.hasPassword || activeRoom.password) && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.97 }}
                    transition={{ duration: 0.35 }}
                    className="relative overflow-hidden p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-emerald-500/20 border border-emerald-500/40 shadow-xl shadow-emerald-500/10 flex items-center justify-between text-xs font-mono text-emerald-300"
                  >
                    <div className="absolute inset-0 bg-emerald-400/5 animate-pulse pointer-events-none" />
                    <div className="flex items-center space-x-3 z-10">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0 shadow-inner">
                        <Unlock size={16} className="animate-bounce" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-1.5 font-bold text-white">
                          <span>Access Unlocked</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 uppercase">PIN Verified</span>
                        </div>
                        <p className="text-[11px] text-emerald-200/90 font-sans">
                          Welcome to <strong>{activeRoom.title}</strong>! Security credentials authenticated.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowUnlockEffect(false)}
                      className="p-1.5 text-emerald-400 hover:text-white rounded-lg bg-white/5 hover:bg-white/10 transition-colors z-10 cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Joined Room Header */}
              <div className="glass-panel p-4 rounded-2xl border border-cyan-500/30 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">{activeRoom.subject} • Host: {activeRoom.hostName}</span>
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <span>{activeRoom.title}</span>
                    {(activeRoom.hasPassword || activeRoom.password) && <Lock size={12} className="text-amber-400" />}
                  </h3>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      const inviteUrl = `${window.location.origin}${window.location.pathname}?joinRoom=${activeRoom.id}`;
                      navigator.clipboard.writeText(inviteUrl);
                      onShowNotification(`Invite link for "${activeRoom.title}" copied to clipboard!`, 'success');
                    }}
                    className="px-3.5 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 font-mono text-xs font-bold rounded-xl border border-cyan-500/30 flex items-center space-x-1.5 cursor-pointer transition-all shadow-md hover:shadow-cyan-500/20"
                  >
                    <LinkIcon size={13} />
                    <span>Copy Invite Link</span>
                  </button>
                  <button
                    onClick={() => setActiveRoom(null)}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 font-mono text-xs rounded-xl border border-white/10 cursor-pointer"
                  >
                    Leave Room
                  </button>
                </div>
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
            </motion.div>
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

      {/* CREATE ROOM MODAL */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-slate-900 border border-cyan-500/40 rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center space-x-2 text-cyan-400 font-mono font-bold text-sm">
                  <Plus size={16} />
                  <span>Create Custom Live Study Room</span>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg bg-white/5"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateRoomSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Room Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ⚡ Physics Vector Marathon & Focus"
                    value={createTitle}
                    onChange={(e) => setCreateTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Subject / Tag</label>
                  <input
                    type="text"
                    placeholder="e.g. HSC Science, BUET Math, Programming"
                    value={createSubject}
                    onChange={(e) => setCreateSubject(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Description / Goal</label>
                  <textarea
                    rows={2}
                    placeholder="Describe session goals..."
                    value={createDescription}
                    onChange={(e) => setCreateDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1 flex items-center justify-between">
                    <span className="flex items-center space-x-1">
                      <Lock size={12} className="text-amber-400" />
                      <span>Optional Room Password / PIN</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">(Leave empty for public)</span>
                  </label>
                  <input
                    type="password"
                    placeholder="Set secret PIN (optional)"
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div className="pt-2 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-mono font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-mono font-bold rounded-xl shadow-lg shadow-cyan-500/20"
                  >
                    Launch Room
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* JOIN PASSWORD PROMPT MODAL */}
      <AnimatePresence>
        {passwordPromptRoom && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-slate-900 border border-amber-500/40 rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center space-x-2 text-amber-400 font-mono font-bold text-sm">
                  <Lock size={16} />
                  <span>Private Study Room Locked</span>
                </div>
                <button
                  onClick={() => setPasswordPromptRoom(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg bg-white/5"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-1">
                <h4 className="text-xs font-bold text-white">{passwordPromptRoom.title}</h4>
                <p className="text-[11px] text-slate-400 font-mono">Host: {passwordPromptRoom.hostName}</p>
              </div>

              <form onSubmit={handleConfirmRoomPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Enter Password / PIN</label>
                  <input
                    type="password"
                    autoFocus
                    required
                    placeholder="Enter room password..."
                    value={enteredPassword}
                    onChange={(e) => setEnteredPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-amber-500/30 rounded-xl text-white text-xs focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setPasswordPromptRoom(null)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-mono font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-mono font-bold rounded-xl shadow-lg shadow-amber-500/20"
                  >
                    Unlock & Join
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* JOIN VIA ROOM LINK MODAL */}
      <AnimatePresence>
        {isJoinLinkModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-slate-900 border border-cyan-500/40 rounded-2xl p-6 shadow-2xl space-y-4 relative"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center space-x-2 text-cyan-400 font-mono font-bold text-sm">
                  <LinkIcon size={18} />
                  <span>Join Study Room via Link</span>
                </div>
                <button
                  onClick={() => setIsJoinLinkModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg bg-white/5 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleJoinViaLinkSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">
                    Paste Study Room Link or Room ID *
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="e.g. https://.../?room=xyz123 or room ID"
                    value={inputRoomLink}
                    onChange={(e) => setInputRoomLink(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1 flex items-center justify-between">
                    <span className="flex items-center space-x-1">
                      <Lock size={12} className="text-amber-400" />
                      <span>Room Password / PIN</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">(Required if room is protected)</span>
                  </label>
                  <input
                    type="password"
                    placeholder="Enter room PIN (if protected)"
                    value={linkPassword}
                    onChange={(e) => setLinkPassword(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-[11px] text-cyan-300 font-sans leading-relaxed">
                  💡 Enter the shared room link or room ID provided by the host. If the room is password-protected, enter its PIN to join instantly.
                </div>

                <div className="pt-2 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsJoinLinkModalOpen(false)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-mono font-bold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSearchingLink}
                    className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-mono font-bold rounded-xl shadow-lg shadow-cyan-500/20 cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
                  >
                    {isSearchingLink ? <span>Verifying...</span> : <span>Join Room Now</span>}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
