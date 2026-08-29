import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
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
  ShieldAlert,
  AlertTriangle,
  Edit3,
  Eye,
  EyeOff,
  Reply,
  CornerDownRight
} from 'lucide-react';
import { db } from '../services/firebase';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  doc, 
  getDoc, 
  updateDoc, 
  query, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { soundFxService } from '../services/soundFxService';

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
  createdAt?: number;
  timerState?: {
    mode: 'focus' | 'shortBreak' | 'longBreak';
    isRunning: boolean;
    duration: number;
    remainingSeconds: number;
    startedAt: number;
    updatedAt: number;
    updatedBy?: string;
  };
}

interface ChatMsg {
  id: string;
  sender: string;
  username?: string;
  text: string;
  time: string;
  timestamp?: number;
  replyTo?: {
    id: string;
    sender: string;
    text: string;
  } | null;
}

interface RoomTask {
  id: string;
  title: string;
  completed: boolean;
  createdAt?: number;
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
    hostName: 'Rakib Hasan',
    createdAt: 1000
  },
  {
    id: 'room_2',
    title: '💻 Web Dev MERN Stack Code-Along Room',
    subject: 'Programming',
    activeMembers: 11,
    maxMembers: 15,
    description: 'Building full-stack projects in React & Express. Ask questions and review code live.',
    tags: ['React', 'Node.js', 'Live Code'],
    hostName: 'Tanvir Ahmed',
    createdAt: 900
  },
  {
    id: 'room_3',
    title: '🎓 BUET Engineering Mathematics Grind',
    subject: 'Admission Prep',
    activeMembers: 5,
    maxMembers: 10,
    description: 'Targeting calculus & coordinate geometry high-yield formulas.',
    tags: ['BUET', 'Math', 'Calculus'],
    hostName: 'Siam Rahman',
    createdAt: 800
  },
  {
    id: 'room_4',
    title: '🗣️ IELTS Band 8.0 Speaking Practice Circle',
    subject: 'English Language',
    activeMembers: 4,
    maxMembers: 8,
    description: 'Mock speaking tests and vocabulary exchange for upcoming exam dates.',
    tags: ['IELTS', 'Speaking', 'Vocab'],
    hostName: 'Nusrat Jahan',
    createdAt: 700
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
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [completedPomodoros, setCompletedPomodoros] = useState<number>(2);

  // Ambient sound selection
  const [selectedSound, setSelectedSound] = useState<string>('none');

  // Room Chat States
  const [messages, setMessages] = useState<ChatMsg[]>([
    { id: 'm1', sender: 'Rakib Hasan', text: 'Welcome everyone! Today we are tackling Chapter 3 vectors.', time: '10:15 AM' },
    { id: 'm2', sender: 'Amina Khatun', text: 'Started 25 min focus sprint. Good luck all!', time: '10:18 AM' }
  ]);
  const [chatInput, setChatInput] = useState<string>('');
  const [replyingTo, setReplyingTo] = useState<ChatMsg | null>(null);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Room Study Tasks Checklist
  const [tasks, setTasks] = useState<RoomTask[]>([
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

  // Wrong Password Popup Modal States (with Retry & Edit options)
  const [wrongPasswordModal, setWrongPasswordModal] = useState<{
    room: StudyRoom;
    enteredPass: string;
  } | null>(null);
  const [wrongPassInput, setWrongPassInput] = useState('');
  const [showWrongPass, setShowWrongPass] = useState(false);
  const [isWrongPassShaking, setIsWrongPassShaking] = useState(false);
  const [wrongPassFeedback, setWrongPassFeedback] = useState<string | null>(null);
  const editPassInputRef = useRef<HTMLInputElement>(null);

  // Subtle Entry Animation Effect for Protected Rooms
  const [showUnlockEffect, setShowUnlockEffect] = useState(false);

  // Clean up ambient sound on unmount
  useEffect(() => {
    return () => {
      soundFxService.stopAmbientSound();
    };
  }, []);

  // Firestore Real-time listener for study_rooms (Newest created rooms strictly at top)
  useEffect(() => {
    try {
      const unsubscribe = onSnapshot(collection(db, 'study_rooms'), (snapshot) => {
        const firestoreRooms: StudyRoom[] = snapshot.docs.map(docSnap => {
          const data = docSnap.data();
          const pwd = data.pin || data.password || '';
          let created = 0;
          if (data.createdAt) {
            if (typeof data.createdAt === 'number') created = data.createdAt;
            else if (typeof data.createdAt.toMillis === 'function') created = data.createdAt.toMillis();
            else if (data.createdAt.seconds) created = data.createdAt.seconds * 1000;
          }
          return {
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
            hasPassword: Boolean(pwd),
            createdAt: created,
            timerState: data.timerState || undefined
          };
        });

        // Sort descending so newest room is at the absolute top
        firestoreRooms.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setRooms([...firestoreRooms, ...DEFAULT_ROOMS]);
      }, (err) => {
        console.error('Error listening to study_rooms collection:', err);
      });
      return () => unsubscribe();
    } catch (e) {
      console.error('Error initializing study_rooms snapshot:', e);
    }
  }, []);

  // Real-time Room Sync: Room Doc (for Real-time Room Timer sync)
  useEffect(() => {
    if (!activeRoom || !activeRoom.id) return;

    const roomRef = doc(db, 'study_rooms', activeRoom.id);
    const unsubRoom = onSnapshot(roomRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.timerState) {
          const tState = data.timerState;
          if (tState.isRunning) {
            const elapsed = Math.max(0, Math.floor((Date.now() - (tState.startedAt || Date.now())) / 1000));
            const calculatedTime = Math.max(0, (tState.remainingSeconds || 0) - elapsed);
            setTimeLeft(calculatedTime);
            setIsTimerRunning(true);
            setTimerMode(tState.mode || 'focus');
          } else {
            setTimeLeft(tState.remainingSeconds ?? (tState.mode === 'focus' ? 25 * 60 : tState.mode === 'shortBreak' ? 5 * 60 : 15 * 60));
            setIsTimerRunning(false);
            setTimerMode(tState.mode || 'focus');
          }
        }
      }
    }, (err) => {
      console.warn('Live room timer listener error (using local state fallback):', err);
    });

    return () => unsubRoom();
  }, [activeRoom?.id]);

  // Real-time Room Sync: Chat Messages subcollection
  useEffect(() => {
    if (!activeRoom || !activeRoom.id) return;

    try {
      const msgsQuery = query(
        collection(db, 'study_rooms', activeRoom.id, 'messages'),
        orderBy('timestamp', 'asc'),
        limit(100)
      );

      const unsubMsgs = onSnapshot(msgsQuery, (snapshot) => {
        if (!snapshot.empty) {
          const fetchedMsgs: ChatMsg[] = snapshot.docs.map(d => {
            const data = d.data();
            return {
              id: d.id,
              sender: data.sender || 'Scholar',
              username: data.username || '',
              text: data.text || '',
              time: data.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              timestamp: data.timestamp || Date.now(),
              replyTo: data.replyTo || null
            };
          });
          setMessages(fetchedMsgs);
          setTimeout(() => {
            chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }
      }, (err) => {
        console.warn('Real-time chat snapshot listener:', err);
      });

      return () => unsubMsgs();
    } catch (e) {
      console.warn('Error setting up room messages listener:', e);
    }
  }, [activeRoom?.id]);

  // Real-time Room Sync: Tasks Checklist
  useEffect(() => {
    if (!activeRoom || !activeRoom.id) return;

    try {
      const tasksQuery = query(
        collection(db, 'study_rooms', activeRoom.id, 'tasks'),
        orderBy('createdAt', 'asc'),
        limit(50)
      );

      const unsubTasks = onSnapshot(tasksQuery, (snapshot) => {
        if (!snapshot.empty) {
          const fetchedTasks: RoomTask[] = snapshot.docs.map(d => ({
            id: d.id,
            title: d.data().title || '',
            completed: Boolean(d.data().completed),
            createdAt: d.data().createdAt || Date.now()
          }));
          setTasks(fetchedTasks);
        }
      }, (err) => {
        console.warn('Real-time tasks listener:', err);
      });

      return () => unsubTasks();
    } catch (e) {
      console.warn('Error setting up tasks listener:', e);
    }
  }, [activeRoom?.id]);

  const handleCreateRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTitle.trim()) {
      onShowNotification('Please enter a room title', 'error');
      return;
    }

    const secretPin = createPassword.trim();
    const nowTime = Date.now();
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
      createdAt: nowTime,
      timerState: {
        mode: 'focus',
        isRunning: false,
        duration: 25 * 60,
        remainingSeconds: 25 * 60,
        startedAt: nowTime,
        updatedAt: nowTime,
        updatedBy: userProfile?.fullName || 'Scholar'
      }
    };

    try {
      const docRef = await addDoc(collection(db, 'study_rooms'), newRoomData);
      const createdRoom: StudyRoom = {
        id: docRef.id,
        ...newRoomData,
        timerState: newRoomData.timerState as any
      };
      
      // Initialize welcome chat message in Firestore
      await addDoc(collection(db, 'study_rooms', docRef.id, 'messages'), {
        sender: userProfile?.fullName || 'Scholar',
        username: userProfile?.username || '',
        text: `Created room "${createdRoom.title}". Welcome everyone!`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now(),
        replyTo: null
      });

      setActiveRoom(createdRoom);
      onShowNotification(`Created and joined "${createdRoom.title}"!`, 'success');
    } catch (err) {
      console.error('Error creating study room in Firestore:', err);
      const fallbackRoom: StudyRoom = {
        id: 'custom_room_' + Date.now(),
        ...newRoomData,
        timerState: newRoomData.timerState as any
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
      soundFxService.playUnlock();
      onShowNotification(`PIN verified! Joined "${passwordPromptRoom.title}".`, 'success');
      setPasswordPromptRoom(null);
      setEnteredPassword('');
    } else {
      soundFxService.playError();
      const currentRoom = passwordPromptRoom;
      const currentAttempt = enteredPassword;
      setPasswordPromptRoom(null);
      setEnteredPassword('');
      setWrongPasswordModal({
        room: currentRoom,
        enteredPass: currentAttempt
      });
      setWrongPassInput(currentAttempt);
      setShowWrongPass(false);
      setWrongPassFeedback('Entered room password/PIN is incorrect. Please edit and retry.');
    }
  };

  const handleWrongModalRetry = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!wrongPasswordModal) return;

    const targetPin = wrongPasswordModal.room.pin || wrongPasswordModal.room.password || '';
    if (wrongPassInput.trim() === targetPin) {
      setActiveRoom(wrongPasswordModal.room);
      setShowUnlockEffect(true);
      soundFxService.playUnlock();
      onShowNotification(`PIN verified! Joined "${wrongPasswordModal.room.title}".`, 'success');
      setWrongPasswordModal(null);
      setWrongPassInput('');
      setWrongPassFeedback(null);
    } else {
      soundFxService.playError();
      setIsWrongPassShaking(true);
      setWrongPassFeedback('❌ Password still incorrect! Please edit the PIN and retry.');
      setTimeout(() => setIsWrongPassShaking(false), 500);
      editPassInputRef.current?.focus();
    }
  };

  const handleWrongModalEdit = () => {
    soundFxService.playClick();
    setWrongPassFeedback(null);
    editPassInputRef.current?.focus();
    editPassInputRef.current?.select();
  };

  // Timer Tick Interval Effect (Runs continuously in background using local intervals)
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            setIsTimerRunning(false);
            soundFxService.playTimerComplete();
            if (timerMode === 'focus') {
              setCompletedPomodoros(c => c + 1);
              onShowNotification('🔔 Focus session complete! Time for a 5-minute break.', 'success');
              setTimerMode('shortBreak');
              return 5 * 60;
            } else {
              onShowNotification('⏰ Break over! Ready for the next focus sprint?', 'success');
              setTimerMode('focus');
              return 25 * 60;
            }
          }
          return t - 1;
        });
      }, 1000);
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

  // Sync Timer Mode Change (Broadcasts in Real-time to all users in the active room)
  const handleModeChange = async (mode: 'focus' | 'shortBreak' | 'longBreak') => {
    const newSeconds = mode === 'focus' ? 25 * 60 : mode === 'shortBreak' ? 5 * 60 : 15 * 60;
    setTimerMode(mode);
    setIsTimerRunning(false);
    setTimeLeft(newSeconds);

    if (activeRoom && activeRoom.id) {
      try {
        await updateDoc(doc(db, 'study_rooms', activeRoom.id), {
          timerState: {
            mode,
            isRunning: false,
            duration: newSeconds,
            remainingSeconds: newSeconds,
            startedAt: Date.now(),
            updatedAt: Date.now(),
            updatedBy: userProfile?.fullName || 'Scholar'
          }
        });
      } catch (e) {
        console.warn('Sync mode change error:', e);
      }
    }
  };

  // Sync Timer Start / Pause Toggle (Broadcasts in Real-time to all users in the active room)
  const handleToggleTimer = async () => {
    const nextRunning = !isTimerRunning;
    setIsTimerRunning(nextRunning);
    soundFxService.playClick();

    if (activeRoom && activeRoom.id) {
      try {
        await updateDoc(doc(db, 'study_rooms', activeRoom.id), {
          timerState: {
            mode: timerMode,
            isRunning: nextRunning,
            duration: timerMode === 'focus' ? 25 * 60 : timerMode === 'shortBreak' ? 5 * 60 : 15 * 60,
            remainingSeconds: timeLeft,
            startedAt: Date.now(),
            updatedAt: Date.now(),
            updatedBy: userProfile?.fullName || 'Scholar'
          }
        });
      } catch (e) {
        console.warn('Sync toggle timer error:', e);
      }
    }
  };

  // Sync Timer Reset
  const handleResetTimer = async () => {
    const defaultSecs = timerMode === 'focus' ? 25 * 60 : timerMode === 'shortBreak' ? 5 * 60 : 15 * 60;
    setTimeLeft(defaultSecs);
    setIsTimerRunning(false);
    soundFxService.playClick();

    if (activeRoom && activeRoom.id) {
      try {
        await updateDoc(doc(db, 'study_rooms', activeRoom.id), {
          timerState: {
            mode: timerMode,
            isRunning: false,
            duration: defaultSecs,
            remainingSeconds: defaultSecs,
            startedAt: Date.now(),
            updatedAt: Date.now(),
            updatedBy: userProfile?.fullName || 'Scholar'
          }
        });
      } catch (e) {
        console.warn('Sync reset timer error:', e);
      }
    }
  };

  // Ambient Sound Change (Continuous background audio synthesis)
  const handleSoundSelect = (sndId: string) => {
    setSelectedSound(sndId);
    soundFxService.playAmbientSound(sndId as any);
    const soundItem = AMBIENT_SOUNDS.find(s => s.id === sndId);
    onShowNotification(sndId === 'none' ? 'Background soundscape muted.' : `Playing ${soundItem?.label || sndId}`, 'success');
  };

  // Send Message with WhatsApp/Messenger Style Reply
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const msgPayload = {
      sender: userProfile?.fullName || 'Scholar',
      username: userProfile?.username || 'scholar',
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now(),
      replyTo: replyingTo ? {
        id: replyingTo.id,
        sender: replyingTo.sender,
        text: replyingTo.text
      } : null
    };

    setChatInput('');
    setReplyingTo(null);
    soundFxService.playClick();

    if (activeRoom && activeRoom.id) {
      try {
        await addDoc(collection(db, 'study_rooms', activeRoom.id, 'messages'), msgPayload);
      } catch (err) {
        console.error('Error sending message to Firestore room:', err);
        setMessages(prev => [...prev, { id: 'msg_' + Date.now(), ...msgPayload }]);
      }
    } else {
      setMessages(prev => [...prev, { id: 'msg_' + Date.now(), ...msgPayload }]);
    }
  };

  // Add Task to Sprint
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const taskPayload = {
      title: newTaskTitle.trim(),
      completed: false,
      createdAt: Date.now()
    };

    setNewTaskTitle('');
    soundFxService.playClick();

    if (activeRoom && activeRoom.id) {
      try {
        await addDoc(collection(db, 'study_rooms', activeRoom.id, 'tasks'), taskPayload);
      } catch (err) {
        console.error('Error creating task in Firestore:', err);
        setTasks(prev => [...prev, { id: 't_' + Date.now(), ...taskPayload }]);
      }
    } else {
      setTasks(prev => [...prev, { id: 't_' + Date.now(), ...taskPayload }]);
    }
  };

  const toggleTask = async (id: string) => {
    const targetTask = tasks.find(t => t.id === id);
    if (!targetTask) return;

    const newCompleted = !targetTask.completed;
    if (newCompleted) soundFxService.playXP();
    else soundFxService.playClick();

    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: newCompleted } : t));

    if (activeRoom && activeRoom.id) {
      try {
        await updateDoc(doc(db, 'study_rooms', activeRoom.id, 'tasks', id), {
          completed: newCompleted
        });
      } catch (e) {
        // ignore fallback
      }
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner (Hidden automatically when a user joins any study room) */}
      {!activeRoom && (
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

              <div className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl flex items-center space-x-2 text-xs font-mono text-cyan-400">
                <Flame size={16} className="text-cyan-400" />
                <span>{completedPomodoros} Sprints Today</span>
              </div>
            </div>
          </div>
        </div>
      )}

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
                          className="w-full py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 font-mono text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-2 shadow-sm hover:shadow-cyan-500/20"
                        >
                          {(room.hasPassword || room.password) ? <Lock size={14} className="text-amber-400" /> : <UserCheck size={14} />}
                          <span>{(room.hasPassword || room.password) ? 'Join Protected Room' : 'Join Study Room'}</span>
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

              {/* Joined Room Header (With Leave Room option) */}
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
                      setActiveRoom(null);
                      onShowNotification('Left study room.', 'success');
                    }}
                    className="px-3.5 py-1.5 bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-slate-300 font-mono text-xs rounded-xl border border-white/10 hover:border-red-500/30 cursor-pointer transition-all flex items-center space-x-1.5"
                  >
                    <X size={13} />
                    <span>Leave Room</span>
                  </button>
                </div>
              </div>

              {/* Room Live Chat & Session Tasks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Live Multi-user Chat Box with WhatsApp/Messenger-style Reply */}
                <div className="glass-panel p-4 rounded-2xl border border-white/10 flex flex-col h-[380px]">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <span className="text-xs font-mono font-bold text-slate-300 flex items-center space-x-1.5">
                      <MessageSquare size={14} className="text-cyan-400" />
                      <span>Room Study Chat</span>
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 flex items-center space-x-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping mr-1" />
                      <span>Live Synced</span>
                    </span>
                  </div>

                  {/* Messages Scroll Area */}
                  <div className="flex-1 overflow-y-auto space-y-2.5 py-3 pr-1 text-xs font-sans">
                    {messages.map((m) => {
                      const isCurrentUser = m.sender === userProfile?.fullName;
                      return (
                        <div 
                          key={m.id} 
                          id={`msg-${m.id}`}
                          className={`group relative p-2.5 rounded-xl border transition-all ${
                            isCurrentUser 
                              ? 'bg-cyan-500/10 border-cyan-500/30 ml-4' 
                              : 'bg-white/[0.03] border-white/5 mr-4 hover:border-white/10'
                          }`}
                        >
                          {/* Sender & Timestamp */}
                          <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                            <span className={`font-bold ${isCurrentUser ? 'text-cyan-300' : 'text-emerald-400'}`}>
                              {m.sender} {isCurrentUser && '(You)'}
                            </span>
                            <div className="flex items-center space-x-2">
                              <span className="text-slate-500 text-[9px]">{m.time}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setReplyingTo(m);
                                  chatInputRef.current?.focus();
                                }}
                                title="Reply to this message"
                                className="opacity-70 group-hover:opacity-100 p-1 hover:bg-white/10 rounded text-cyan-400 transition-opacity cursor-pointer flex items-center space-x-1 text-[10px]"
                              >
                                <Reply size={11} />
                                <span className="hidden group-hover:inline text-[9px]">Reply</span>
                              </button>
                            </div>
                          </div>

                          {/* Quoted Message (WhatsApp/Messenger Style) */}
                          {m.replyTo && (
                            <div 
                              onClick={() => {
                                const targetEl = document.getElementById(`msg-${m.replyTo?.id}`);
                                targetEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              }}
                              className="mb-1.5 p-1.5 rounded-lg bg-black/40 border-l-2 border-cyan-400 text-[11px] font-sans flex flex-col space-y-0.5 cursor-pointer hover:bg-black/60 transition-colors"
                            >
                              <div className="flex items-center space-x-1 text-cyan-400 font-bold font-mono text-[9px]">
                                <CornerDownRight size={9} />
                                <span>Replying to {m.replyTo.sender}</span>
                              </div>
                              <p className="text-slate-300 truncate text-[10px] italic">
                                "{m.replyTo.text}"
                              </p>
                            </div>
                          )}

                          {/* Message Content */}
                          <p className="text-slate-100 text-xs leading-relaxed break-words font-sans">
                            {m.text}
                          </p>
                        </div>
                      );
                    })}
                    <div ref={chatMessagesEndRef} />
                  </div>

                  {/* WhatsApp-style Replying Banner */}
                  {replyingTo && (
                    <div className="px-3 py-1.5 bg-cyan-950/60 border-l-2 border-cyan-400 rounded-t-xl flex items-center justify-between text-xs text-slate-300 border-t border-r border-cyan-500/30">
                      <div className="flex items-center space-x-2 truncate">
                        <Reply size={12} className="text-cyan-400 shrink-0" />
                        <div className="truncate">
                          <span className="text-cyan-400 font-bold font-mono text-[10px] mr-1">Replying to {replyingTo.sender}:</span>
                          <span className="italic text-slate-300 text-[11px] truncate">"{replyingTo.text}"</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReplyingTo(null)}
                        className="p-1 text-slate-400 hover:text-white rounded-md cursor-pointer ml-2 shrink-0"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  )}

                  {/* Chat Input Form */}
                  <form onSubmit={handleSendMessage} className={`pt-2 border-t border-white/10 flex space-x-2 ${replyingTo ? 'bg-black/20 rounded-b-xl p-1' : ''}`}>
                    <input
                      ref={chatInputRef}
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder={replyingTo ? `Replying to ${replyingTo.sender}...` : "Share a thought, formula or question..."}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-sans"
                    />
                    <button type="submit" className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl font-bold text-xs cursor-pointer transition-colors shadow-md shadow-cyan-500/20">
                      <Send size={14} />
                    </button>
                  </form>
                </div>

                {/* Session Goal Checklist */}
                <div className="glass-panel p-4 rounded-2xl border border-white/10 flex flex-col h-[380px]">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <span className="text-xs font-mono font-bold text-slate-300 flex items-center space-x-1.5">
                      <CheckCircle2 size={14} className="text-emerald-400" />
                      <span>Sprint Goal Checklist</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {tasks.filter(t => t.completed).length}/{tasks.length} Completed
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
                        <span className="text-xs font-sans flex-1">{t.title}</span>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleAddTask} className="pt-2 border-t border-white/10 flex space-x-2">
                    <input
                      type="text"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="Add goal for this sprint..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-sans"
                    />
                    <button type="submit" className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl font-bold text-xs cursor-pointer transition-colors shadow-md shadow-emerald-500/20">
                      <Plus size={14} />
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Right Sidebar Widget: Focus Pomodoro Clock & Ambient Audio (Synced in real-time) */}
        <div className="space-y-4">
          {/* Real-time Pomodoro Timer Box */}
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
              <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mt-2 flex items-center justify-center space-x-1.5">
                <span>{timerMode === 'focus' ? '🔥 Deep Concentration Sprint' : '☕ Relax & Stretch Break'}</span>
                {activeRoom && <span className="text-cyan-400 font-bold">• Realtime Room Synced</span>}
              </p>
            </div>

            {/* Timer Controls */}
            <div className="flex justify-center space-x-3">
              <button
                onClick={handleToggleTimer}
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
                onClick={handleResetTimer}
                className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-300 transition-colors cursor-pointer"
                title="Reset Timer"
              >
                <RotateCcw size={18} />
              </button>
            </div>
          </div>

          {/* Ambient Soundscapes Switcher (Procedural Audio Background Playback - Hidden when active in a room) */}
          {!activeRoom && (
            <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-3">
              <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
                <Music size={14} className="text-cyan-400" />
                <span>Background Focus Soundscapes</span>
              </h4>

              <div className="space-y-1.5">
                {AMBIENT_SOUNDS.map((snd) => (
                  <button
                    key={snd.id}
                    onClick={() => handleSoundSelect(snd.id)}
                    className={`w-full p-2.5 rounded-xl border text-left text-xs font-mono flex items-center justify-between transition-all cursor-pointer ${
                      selectedSound === snd.id
                        ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400 font-bold shadow-sm shadow-cyan-500/20'
                        : 'bg-white/[0.02] border-white/5 text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span>{snd.label}</span>
                    {selectedSound === snd.id && <span className="text-[10px] text-cyan-400 animate-pulse">Active 🎵</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CREATE ROOM MODAL */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isCreateModalOpen && (
            <div className="fixed inset-0 z-[99999] flex items-start justify-center p-3 sm:p-6 pt-4 sm:pt-10 bg-black/80 backdrop-blur-md overflow-y-auto w-screen h-[100dvh] top-0 left-0">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="w-full max-w-md bg-slate-900 border border-cyan-500/40 rounded-2xl p-6 shadow-2xl space-y-4 my-auto"
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
                    <label className="block text-xs font-mono text-slate-300 mb-1">Description</label>
                    <textarea
                      rows={2}
                      placeholder="What is this study room focusing on?"
                      value={createDescription}
                      onChange={(e) => setCreateDescription(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500 font-sans"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                    <div className="flex items-center space-x-1.5 text-amber-400 text-xs font-mono font-bold">
                      <Lock size={14} />
                      <span>Optional Room Password / PIN</span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Leave empty for a public open room, or set a PIN to restrict access.
                    </p>
                    <input
                      type="text"
                      placeholder="e.g. 1234 or math2026"
                      value={createPassword}
                      onChange={(e) => setCreatePassword(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-amber-500/30 rounded-xl text-white text-xs focus:outline-none focus:border-amber-400 font-mono tracking-widest"
                    />
                  </div>

                  <div className="flex justify-end space-x-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsCreateModalOpen(false)}
                      className="px-4 py-2 text-xs font-mono text-slate-400 hover:text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-mono text-xs font-bold rounded-xl cursor-pointer shadow-lg shadow-cyan-500/20"
                    >
                      Create & Enter Room
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* PASSWORD REQUIRED PROMPT MODAL */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {passwordPromptRoom && (
            <div className="fixed inset-0 z-[99999] flex items-start justify-center p-3 sm:p-6 pt-4 sm:pt-10 bg-black/85 backdrop-blur-md overflow-y-auto w-screen h-[100dvh] top-0 left-0">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-2xl p-6 shadow-2xl space-y-4 my-auto"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center space-x-2 text-amber-400 font-mono font-bold text-sm">
                    <Lock size={16} />
                    <span>Protected Study Room</span>
                  </div>
                  <button
                    onClick={() => {
                      setPasswordPromptRoom(null);
                      setEnteredPassword('');
                    }}
                    className="p-1 text-slate-400 hover:text-white rounded-lg bg-white/5"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">
                    {passwordPromptRoom.title}
                  </h4>
                  <p className="text-xs text-slate-300 font-sans">
                    This room is private. Please enter the secret PIN or password provided by the host ({passwordPromptRoom.hostName}).
                  </p>
                </div>

                <form onSubmit={handleConfirmRoomPassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono text-slate-300 mb-1">Enter Room Password / PIN</label>
                    <input
                      type="password"
                      autoFocus
                      required
                      placeholder="••••••"
                      value={enteredPassword}
                      onChange={(e) => setEnteredPassword(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-950 border border-amber-500/40 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400 font-mono tracking-widest text-center"
                    />
                  </div>

                  <div className="flex justify-end space-x-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPasswordPromptRoom(null);
                        setEnteredPassword('');
                      }}
                      className="px-4 py-2 text-xs font-mono text-slate-400 hover:text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-mono text-xs font-bold rounded-xl cursor-pointer shadow-lg shadow-amber-500/20 flex items-center space-x-1.5"
                    >
                      <Key size={14} />
                      <span>Verify & Join</span>
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* DEDICATED WRONG PASSWORD POPUP MODAL (WITH RETRY & EDIT OPTIONS) */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {wrongPasswordModal && (
            <div className="fixed inset-0 z-[999999] flex items-start justify-center p-3 sm:p-6 pt-4 sm:pt-10 bg-black/90 backdrop-blur-md overflow-y-auto w-screen h-[100dvh] top-0 left-0">
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: -12 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1, 
                  y: 0,
                  x: isWrongPassShaking ? [-8, 8, -6, 6, -3, 3, 0] : 0
                }}
                exit={{ opacity: 0, scale: 0.92, y: -12 }}
                transition={{ duration: 0.25 }}
                className="w-full max-w-md bg-gradient-to-b from-slate-900 via-slate-900 to-red-950/40 border border-red-500/50 rounded-2xl p-6 shadow-[0_0_50px_rgba(239,68,68,0.25)] space-y-4 my-auto relative"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-red-500/20 pb-3">
                  <div className="flex items-center space-x-2 text-red-400 font-mono font-bold text-sm">
                    <ShieldAlert size={18} className="text-red-400 animate-pulse" />
                    <span>ভুল পাসওয়ার্ড / Authentication Failed</span>
                  </div>
                  <button
                    onClick={() => {
                      setWrongPasswordModal(null);
                      setWrongPassInput('');
                      setWrongPassFeedback(null);
                    }}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Message & Room Target Info */}
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 space-y-1.5">
                  <div className="flex items-center space-x-2 text-red-300 font-mono text-xs font-bold">
                    <AlertTriangle size={14} className="text-amber-400" />
                    <span>ইনভ্যালিড বা ভুল পিন কোড দেওয়া হয়েছে!</span>
                  </div>
                  <p className="text-[12px] text-slate-300 font-sans">
                    <strong>"{wrongPasswordModal.room.title}"</strong> রুমে প্রবেশের জন্য দেওয়া সিকিউরিটি পিন সঠিক নয়। অনুগ্রহ করে পিন কোডটি <strong>এডিট</strong> করে পুনরায় <strong>রিট্রাই</strong> করুন।
                  </p>
                </div>

                {/* Inline Editable Password Input */}
                <form onSubmit={handleWrongModalRetry} className="space-y-4 pt-1">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-300">রুম পাসওয়ার্ড / PIN কোড:</span>
                      <button
                        type="button"
                        onClick={() => setShowWrongPass(!showWrongPass)}
                        className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 cursor-pointer"
                      >
                        {showWrongPass ? <EyeOff size={13} /> : <Eye size={13} />}
                        <span>{showWrongPass ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন'}</span>
                      </button>
                    </div>

                    <div className="relative flex items-center">
                      <input
                        ref={editPassInputRef}
                        type={showWrongPass ? "text" : "password"}
                        value={wrongPassInput}
                        onChange={(e) => {
                          setWrongPassInput(e.target.value);
                          setWrongPassFeedback(null);
                        }}
                        placeholder="সঠিক পিন লিখুন..."
                        className="w-full px-4 py-3 bg-slate-950 border-2 border-red-500/50 focus:border-cyan-400 rounded-xl text-white text-sm focus:outline-none font-mono tracking-widest text-center shadow-inner transition-colors"
                      />
                      {wrongPassInput && (
                        <button
                          type="button"
                          onClick={() => {
                            setWrongPassInput('');
                            editPassInputRef.current?.focus();
                          }}
                          className="absolute right-3 p-1 text-slate-400 hover:text-white rounded-md"
                          title="Clear field"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    {wrongPassFeedback && (
                      <p className="text-[11px] font-mono text-red-400 text-center animate-pulse pt-0.5">
                        {wrongPassFeedback}
                      </p>
                    )}
                  </div>

                  {/* Action Buttons: Edit (এডিট) & Retry (রিট্রাই) */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleWrongModalEdit}
                      className="py-2.5 px-4 bg-white/10 hover:bg-white/15 border border-white/20 hover:border-cyan-400/50 text-slate-200 hover:text-white font-mono text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1.5 shadow-sm"
                    >
                      <Edit3 size={14} className="text-cyan-400" />
                      <span>এডিট (Edit PIN)</span>
                    </button>

                    <button
                      type="submit"
                      className="py-2.5 px-4 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-mono text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1.5 shadow-lg shadow-red-600/30"
                    >
                      <RotateCcw size={14} />
                      <span>রিট্রাই (Retry Join)</span>
                    </button>
                  </div>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setWrongPasswordModal(null);
                        setWrongPassInput('');
                        setWrongPassFeedback(null);
                      }}
                      className="text-[11px] font-mono text-slate-400 hover:text-slate-200 underline cursor-pointer"
                    >
                      বাতিল করুন (Cancel)
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
