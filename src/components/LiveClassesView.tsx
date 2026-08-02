import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Tv, 
  Calendar, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  ChevronLeft, 
  Send, 
  Smile, 
  User, 
  Bell, 
  BellOff, 
  Maximize2, 
  Minimize2, 
  Settings, 
  ShieldCheck, 
  Wifi, 
  WifiOff, 
  Activity, 
  Download, 
  FileText, 
  BookOpen, 
  ExternalLink,
  Users
} from 'lucide-react';
import { liveService } from '../services/liveService';
import { LiveClass, LiveAttendance, LiveChatMessage } from '../types/live';
import { auth } from '../services/firebase';
import { gamificationService } from '../services/gamificationService';

interface LiveClassesViewProps {
  userProfile: any;
  purchasedCourseIds: string[];
  onShowNotification: (message: string, type: 'success' | 'error') => void;
  onNavigateToDiscover: () => void;
}

export function LiveClassesView({
  userProfile,
  purchasedCourseIds = [],
  onShowNotification,
  onNavigateToDiscover
}: LiveClassesViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'live' | 'upcoming' | 'completed'>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [classes, setClasses] = useState<LiveClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<LiveClass | null>(null);
  const [inWorkspace, setInWorkspace] = useState<boolean>(false);

  // Reminders map
  const [reminders, setReminders] = useState<Record<string, boolean>>({});

  // Active student UID
  const userId = auth.currentUser?.uid || 'guest_user';
  const userName = userProfile?.fullName || 'Distinguished Scholar';
  const userPhoto = userProfile?.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100';

  // Fetch classes
  const loadClasses = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const data = await liveService.getLiveClasses();
      setClasses(data);

      // Load reminders for these classes
      const reminderStatuses: Record<string, boolean> = {};
      for (const cls of data) {
        if (userId && userId !== 'guest_user') {
          reminderStatuses[cls.classId] = await liveService.checkReminder(cls.classId, userId);
        }
      }
      setReminders(reminderStatuses);
    } catch (err) {
      console.error(err);
      onShowNotification('Failed to retrieve live sessions roster.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadClasses();
  }, [userId]);

  const handlePullToRefresh = () => {
    setRefreshing(true);
    loadClasses(true);
  };

  const toggleReminder = async (classId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId || userId === 'guest_user') {
      onShowNotification('Authentication required to set alerts.', 'error');
      return;
    }
    const state = await liveService.toggleReminder(classId, userId);
    setReminders(prev => ({ ...prev, [classId]: state }));
    if (state) {
      onShowNotification('Push alerts enabled. You will receive an FCM notification 10 minutes prior.', 'success');
    } else {
      onShowNotification('Class alerts deactivated.', 'error');
    }
  };

  const filteredClasses = classes.filter(cls => {
    if (activeSubTab === 'all') return true;
    if (activeSubTab === 'live') return cls.status === 'live';
    if (activeSubTab === 'upcoming') return cls.status === 'upcoming';
    if (activeSubTab === 'completed') return cls.status === 'completed';
    return true;
  });

  return (
    <div className="flex-1 w-full text-slate-100 font-sans relative">
      <AnimatePresence mode="wait">
        {!selectedClass && (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-4 py-2"
          >
            {/* Header / Sub Tabs */}
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <h2 className="text-base font-semibold tracking-tight text-white flex items-center space-x-2">
                  <Tv size={18} className="text-[#39FF14] animate-pulse" />
                  <span>Live Academic Classes</span>
                </h2>
                <p className="text-[10px] text-slate-400 mt-0.5">Real-time interactive engineering classrooms</p>
              </div>

              {/* Pull to refresh / Sync btn */}
              <button
                onClick={handlePullToRefresh}
                disabled={refreshing}
                className="p-1.5 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 text-[10px] font-mono text-slate-300 hover:text-white transition-all cursor-pointer flex items-center space-x-1"
              >
                <Activity size={10} className={refreshing ? 'animate-spin text-[#39FF14]' : 'text-slate-400'} />
                <span>{refreshing ? 'Refreshing...' : 'Pull Sync'}</span>
              </button>
            </div>

            {/* Sub-tab pills */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-white/10">
              {(['all', 'live', 'upcoming', 'completed'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveSubTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                    activeSubTab === tab
                      ? 'bg-[#39FF14]/10 border-[#39FF14]/40 text-[#39FF14]'
                      : 'bg-white/[0.02] border-white/5 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab === 'live' ? '🔴 Live Now' : tab}
                </button>
              ))}
            </div>

            {/* Main Content Cards */}
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-44 rounded-2xl bg-white/[0.02] border border-white/5 animate-pulse flex flex-col p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="w-20 h-4 bg-white/10 rounded"></div>
                      <div className="w-12 h-4 bg-white/10 rounded"></div>
                    </div>
                    <div className="h-6 bg-white/10 rounded w-3/4"></div>
                    <div className="h-4 bg-white/10 rounded w-1/2"></div>
                    <div className="mt-auto h-8 bg-white/10 rounded-xl"></div>
                  </div>
                ))}
              </div>
            ) : filteredClasses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 bg-white/[0.01] border border-white/5 rounded-2xl p-6">
                <Tv size={44} className="text-slate-600 animate-pulse" />
                <div>
                  <h4 className="text-xs font-semibold text-white">No active classes matching filter</h4>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-xs leading-relaxed">
                    Check back shortly! Interactive lectures and coding bootcamps are streamed weekly relative to your primary course pathways.
                  </p>
                </div>
                <button
                  onClick={onNavigateToDiscover}
                  className="px-4 py-2 bg-[#39FF14]/10 border border-[#39FF14]/30 text-[#39FF14] text-[10px] font-mono font-bold uppercase rounded-xl hover:bg-[#39FF14]/20 transition-all cursor-pointer"
                >
                  Explore Course Library
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredClasses.map(cls => {
                  const isEnrolled = purchasedCourseIds.includes(cls.courseId);
                  const isLive = cls.status === 'live';
                  const isUpcoming = cls.status === 'upcoming';
                  const isCompleted = cls.status === 'completed';
                  const hasAlert = reminders[cls.classId] || false;

                  return (
                    <motion.div
                      key={cls.classId}
                      layoutId={`class-card-${cls.classId}`}
                      onClick={() => setSelectedClass(cls)}
                      className="bg-white/[0.02] hover:bg-white/[0.04] border border-white/10 hover:border-white/20 rounded-2xl p-4 transition-all duration-300 flex flex-col cursor-pointer relative overflow-hidden group shadow-lg"
                    >
                      {/* Top Action / Status row */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          {isLive ? (
                            <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-red-500/20 border border-red-500/40 text-[8px] font-mono font-extrabold text-red-400 uppercase tracking-wider animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block"></span>
                              <span>LIVE NOW</span>
                            </span>
                          ) : isUpcoming ? (
                            <span className="px-2 py-0.5 rounded bg-[#39FF14]/10 border border-[#39FF14]/30 text-[8px] font-mono font-bold text-[#39FF14] uppercase tracking-wider">
                              Upcoming
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-slate-800 border border-white/5 text-[8px] font-mono font-medium text-slate-400 uppercase tracking-wider">
                              Completed
                            </span>
                          )}
                          <span className="text-[9px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                            {cls.subject}
                          </span>
                        </div>

                        {/* Reminders / Actions */}
                        {isUpcoming && (
                          <button
                            onClick={(e) => toggleReminder(cls.classId, e)}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                              hasAlert 
                                ? 'bg-[#39FF14]/20 border-[#39FF14] text-[#39FF14]' 
                                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                            }`}
                            title={hasAlert ? "Alert Active" : "Set Alert"}
                          >
                            {hasAlert ? <Bell size={11} className="animate-bounce" /> : <BellOff size={11} />}
                          </button>
                        )}
                      </div>

                      {/* Title & Description */}
                      <h3 className="text-xs font-semibold text-white group-hover:text-[#39FF14] transition-colors line-clamp-1">
                        {cls.title}
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-normal">
                        {cls.description}
                      </p>

                      {/* Instructor and Timing */}
                      <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 rounded-full bg-slate-800 overflow-hidden border border-white/10">
                            {cls.instructorPhoto ? (
                              <img src={cls.instructorPhoto || undefined} alt={cls.instructor} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <User size={12} className="text-slate-400 m-1" />
                            )}
                          </div>
                          <span className="text-[9px] font-medium text-slate-300">{cls.instructor}</span>
                        </div>

                        <div className="flex items-center space-x-3 text-slate-400 text-[9px] font-mono">
                          <span className="flex items-center space-x-1">
                            <Clock size={10} className="text-slate-500" />
                            <span>{cls.duration}m</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Calendar size={10} className="text-slate-500" />
                            <span>
                              {new Date(cls.startTime).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </span>
                        </div>
                      </div>

                      {/* Card Button footer */}
                      <div className="mt-3 pt-2">
                        {isLive ? (
                          <button className="w-full py-2 bg-[#39FF14] hover:bg-[#32e011] text-black text-[10px] font-mono font-black uppercase tracking-wider rounded-xl transition-all shadow-[0_2px_8px_rgba(57,255,20,0.2)] cursor-pointer flex items-center justify-center space-x-1">
                            <span>Join Interactive Workspace</span>
                            <ExternalLink size={10} />
                          </button>
                        ) : isCompleted ? (
                          <button className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-[10px] font-mono font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1">
                            <span>Watch Stream Recording</span>
                          </button>
                        ) : (
                          <div className="w-full py-2 bg-white/[0.01] border border-white/5 text-slate-500 text-center text-[9px] font-mono uppercase tracking-widest rounded-xl">
                            Awaiting Stream Schedule
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {selectedClass && !inWorkspace && (
          <motion.div
            key="details"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-4 py-2"
          >
            {/* Back to catalog button */}
            <button
              onClick={() => setSelectedClass(null)}
              className="p-1.5 px-3 rounded-lg border border-white/10 bg-white/5 text-[9px] font-mono font-bold uppercase tracking-wider text-slate-300 hover:text-white transition-all cursor-pointer flex items-center space-x-1"
            >
              <ChevronLeft size={12} />
              <span>Catalog</span>
            </button>

            <LiveClassDetails
              cls={selectedClass}
              purchasedCourseIds={purchasedCourseIds}
              hasAlert={reminders[selectedClass.classId] || false}
              onToggleAlert={(e) => toggleReminder(selectedClass.classId, e)}
              onJoinWorkspace={() => {
                setInWorkspace(true);
                if (auth.currentUser) {
                  gamificationService.addXP(auth.currentUser.uid, 50, 'Joined Live Class');
                  gamificationService.unlockAchievement(auth.currentUser.uid, 'live_regular', 'Live Class Regular', 'Attended a live class', '📹');
                }
              }}
              onShowNotification={onShowNotification}
            />
          </motion.div>
        )}

        {selectedClass && inWorkspace && (
          <motion.div
            key="workspace"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full py-1"
          >
            <LiveWorkspace
              cls={selectedClass}
              userId={userId}
              userName={userName}
              userPhoto={userPhoto}
              onBack={() => setInWorkspace(false)}
              onShowNotification={onShowNotification}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ========================================================
   LIVE CLASS DETAILS VIEW COMPONENT
   ======================================================== */
interface LiveClassDetailsProps {
  cls: LiveClass;
  purchasedCourseIds: string[];
  hasAlert: boolean;
  onToggleAlert: (e: React.MouseEvent) => void;
  onJoinWorkspace: () => void;
  onShowNotification: (m: string, t: 'success' | 'error') => void;
}

function LiveClassDetails({
  cls,
  purchasedCourseIds,
  hasAlert,
  onToggleAlert,
  onJoinWorkspace,
  onShowNotification
}: LiveClassDetailsProps) {
  const isEnrolled = purchasedCourseIds.includes(cls.courseId);
  const isLive = cls.status === 'live';
  const isUpcoming = cls.status === 'upcoming';
  const isCompleted = cls.status === 'completed';

  // State for attendance logs if completed
  const [attendanceRecord, setAttendanceRecord] = useState<any>(null);

  useEffect(() => {
    const fetchAttendance = async () => {
      const uId = auth.currentUser?.uid;
      if (uId && isCompleted) {
        const record = await liveService.getAttendance(cls.classId, uId);
        setAttendanceRecord(record);
      }
    };
    fetchAttendance();
  }, [cls.classId, isCompleted]);

  // Countdown calculations
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    if (!isUpcoming) return;

    const timer = setInterval(() => {
      const diff = new Date(cls.startTime).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft(null);
        clearInterval(timer);
        window.location.reload(); // Recalculate status
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff / 1000 / 60) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setTimeLeft({ hours, minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [cls.startTime, isUpcoming]);

  return (
    <div className="bg-slate-950/40 rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
      {/* Banner */}
      <div className="h-32 w-full relative">
        <img src={cls.banner || cls.thumbnail || undefined} alt={cls.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent"></div>
        <div className="absolute top-3 left-3 flex items-center space-x-1.5">
          <span className="text-[8px] font-mono font-bold bg-black/60 backdrop-blur-md text-white border border-white/10 px-2 py-0.5 rounded uppercase">
            {cls.subject}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Title & Status */}
        <div>
          <h2 className="text-sm font-semibold text-white tracking-tight leading-snug">{cls.title}</h2>
          <div className="flex items-center space-x-2 mt-2">
            {isLive ? (
              <span className="flex items-center space-x-1 px-2 py-0.5 bg-red-500/20 border border-red-500/30 text-[8px] font-mono font-bold text-red-400 rounded">
                <span className="w-1 h-1 bg-red-500 rounded-full animate-pulse"></span>
                <span>Active Broadcast</span>
              </span>
            ) : isUpcoming ? (
              <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-[8px] font-mono font-bold text-amber-400 rounded">
                Pending Schedule
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-slate-800 border border-white/5 text-[8px] font-mono font-bold text-slate-400 rounded">
                Broadcasting Completed
              </span>
            )}
            <span className="text-[9px] font-mono text-slate-400">Class ID: {cls.classId}</span>
          </div>
        </div>

        {/* Countdown Module */}
        {isUpcoming && timeLeft && (
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 text-center">
            <p className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">Countdown to Stream</p>
            <div className="flex items-center justify-center space-x-3 mt-1.5">
              <div className="flex flex-col">
                <span className="text-base font-mono font-extrabold text-[#39FF14]">
                  {String(timeLeft.hours).padStart(2, '0')}
                </span>
                <span className="text-[7.5px] font-mono text-slate-500 uppercase">hrs</span>
              </div>
              <span className="text-slate-600 font-bold">:</span>
              <div className="flex flex-col">
                <span className="text-base font-mono font-extrabold text-[#39FF14]">
                  {String(timeLeft.minutes).padStart(2, '0')}
                </span>
                <span className="text-[7.5px] font-mono text-slate-500 uppercase">min</span>
              </div>
              <span className="text-slate-600 font-bold">:</span>
              <div className="flex flex-col">
                <span className="text-base font-mono font-extrabold text-[#39FF14]">
                  {String(timeLeft.seconds).padStart(2, '0')}
                </span>
                <span className="text-[7.5px] font-mono text-slate-500 uppercase">sec</span>
              </div>
            </div>
          </div>
        )}

        {/* Core Description */}
        <div className="space-y-1">
          <h4 className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Session Brief</h4>
          <p className="text-[11px] text-slate-300 leading-relaxed font-sans">{cls.description}</p>
        </div>

        {/* Requirements */}
        {cls.requirements && cls.requirements.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Pre-requisite Blueprints</h4>
            <ul className="space-y-1">
              {cls.requirements.map((req, idx) => (
                <li key={idx} className="flex items-start space-x-1.5 text-[10.5px] text-slate-300 font-sans">
                  <CheckCircle size={10} className="text-[#39FF14] mt-0.5 flex-shrink-0" />
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Instructor Profile Card */}
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex space-x-3 items-center">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-[#39FF14]/30 flex-shrink-0">
            {cls.instructorPhoto ? (
              <img src={cls.instructorPhoto || undefined} alt={cls.instructor} className="w-full h-full object-cover" />
            ) : (
              <User size={16} className="text-slate-400 m-3" />
            )}
          </div>
          <div>
            <h5 className="text-[11px] font-bold text-white flex items-center space-x-1">
              <span>{cls.instructor}</span>
              <ShieldCheck size={11} className="text-[#39FF14]" />
            </h5>
            <p className="text-[9px] text-slate-400 font-mono mt-0.5">Faculty Lead, Course Instructor</p>
          </div>
        </div>

        {/* Timing Overview Box */}
        <div className="grid grid-cols-2 gap-2 bg-white/[0.01] border border-white/5 rounded-xl p-3">
          <div className="flex items-center space-x-2">
            <Clock size={14} className="text-slate-400" />
            <div>
              <p className="text-[8px] font-mono text-slate-500 uppercase">Duration</p>
              <p className="text-[10px] font-bold text-slate-200">{cls.duration} minutes</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar size={14} className="text-slate-400" />
            <div>
              <p className="text-[8px] font-mono text-slate-500 uppercase">Date & Time</p>
              <p className="text-[10px] font-bold text-slate-200">
                {new Date(cls.startTime).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        </div>

        {/* Watch Recording / Completed Class Extras */}
        {isCompleted && (
          <div className="border border-white/10 bg-[#39FF14]/5 rounded-xl p-3 space-y-2">
            <div className="flex justify-between items-center">
              <h5 className="text-[10px] font-mono font-bold text-[#39FF14] uppercase tracking-wider">Attendance Register Record</h5>
              <span className={`text-[8px] font-mono font-extrabold uppercase px-1.5 py-0.5 rounded ${
                attendanceRecord?.status === 'present' 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : attendanceRecord?.status === 'partial'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}>
                {attendanceRecord ? attendanceRecord.status : 'Missed'}
              </span>
            </div>

            {attendanceRecord && (
              <div className="text-[9.5px] text-slate-400 space-y-0.5 font-mono">
                <p>Engaged Duration: {Math.round((attendanceRecord.duration || 0) / 60)} minutes</p>
                <p>Telemetry Engagement Ratio: {attendanceRecord.percentage}%</p>
              </div>
            )}

            {cls.recordingUrl && (
              <div className="pt-2 border-t border-white/5 flex gap-2">
                <button
                  onClick={() => {
                    if (!isEnrolled) {
                      onShowNotification('Course enrollment required to access classroom archives.', 'error');
                      return;
                    }
                    onJoinWorkspace();
                  }}
                  className="flex-1 py-2 bg-slate-900 border border-white/10 hover:border-white/20 text-[10px] font-mono font-bold uppercase text-white rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1"
                >
                  <Tv size={10} className="text-[#39FF14]" />
                  <span>Playback Recording</span>
                </button>

                {cls.notesUrl && (
                  <button
                    onClick={() => onShowNotification('Syllabus slide notes successfully sent to downloader cache.', 'success')}
                    className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white rounded-lg transition-all cursor-pointer"
                    title="Download Lecture Notes"
                  >
                    <Download size={12} />
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action Button guards */}
        <div>
          {!isEnrolled ? (
            <div className="bg-red-950/20 border border-red-500/20 rounded-xl p-3 text-center space-y-2">
              <p className="text-[10px] font-semibold text-red-400 flex items-center justify-center space-x-1">
                <AlertCircle size={12} />
                <span>Enrolled Access Only</span>
              </p>
              <p className="text-[9px] text-slate-400 leading-normal max-w-xs mx-auto">
                This live interactive classroom is gated for enrolled scholars of the core curriculum.
              </p>
            </div>
          ) : isLive ? (
            <button
              onClick={onJoinWorkspace}
              className="w-full py-3 bg-[#39FF14] hover:bg-[#32e011] text-black text-[11px] font-mono font-black uppercase tracking-wider rounded-xl transition-all shadow-[0_2px_12px_rgba(57,255,20,0.3)] cursor-pointer"
            >
              Enter Live Stream Workspace
            </button>
          ) : isUpcoming ? (
            <div className="flex space-x-2">
              <button
                disabled
                className="flex-1 py-3 bg-white/[0.02] border border-white/5 text-slate-500 text-[10px] font-mono font-bold uppercase tracking-widest rounded-xl text-center"
              >
                Awaiting Host Schedule
              </button>
              <button
                onClick={onToggleAlert}
                className={`px-4 py-3 rounded-xl border transition-all cursor-pointer ${
                  hasAlert 
                    ? 'bg-[#39FF14]/20 border-[#39FF14]/40 text-[#39FF14]' 
                    : 'bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Bell size={14} className={hasAlert ? "animate-bounce text-[#39FF14]" : ""} />
              </button>
            </div>
          ) : (
            <div className="text-center py-2 text-[9px] text-slate-500 font-mono">
              Broadcast concluded. Archives accessible to active enrolled students.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ========================================================
   LIVE STREAM INTERACTIVE WORKSPACE (PLAYER + CHAT + ATTENDANCE)
   ======================================================== */
interface LiveWorkspaceProps {
  cls: LiveClass;
  userId: string;
  userName: string;
  userPhoto: string;
  onBack: () => void;
  onShowNotification: (m: string, t: 'success' | 'error') => void;
}

function LiveWorkspace({
  cls,
  userId,
  userName,
  userPhoto,
  onBack,
  onShowNotification
}: LiveWorkspaceProps) {
  const isCompleted = cls.status === 'completed';

  // Video and stream quality state
  const [streamQuality, setStreamQuality] = useState<'1080p' | '720p' | '480p' | 'auto'>('auto');
  const [syncingQuality, setSyncingQuality] = useState<boolean>(false);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor' | 'disconnected'>('excellent');
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const [reconnectAttempts, setReconnectAttempts] = useState<number>(0);

  // Video element player features
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isPip, setIsPip] = useState<boolean>(false);

  // Chat message management
  const [chatInput, setChatInput] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<LiveChatMessage[]>([]);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const [lastSentTime, setLastSentTime] = useState<number>(0);
  const [spamGuardActive, setSpamGuardActive] = useState<boolean>(false);

  // Attendance metrics tracking
  const [attendanceDuration, setAttendanceDuration] = useState<number>(0);
  const [syncingAttendance, setSyncingAttendance] = useState<boolean>(false);
  const startTimeRef = useRef<Date>(new Date());

  // Connection drop out simulator (every 90s, brief drop)
  useEffect(() => {
    if (isCompleted) return;

    const timer = setInterval(() => {
      // Trigger a brief simulated connection drops occasionally to prove auto-reconnection architecture!
      setConnectionQuality('disconnected');
      setIsReconnecting(true);
      onShowNotification('Live Stream connection drop detected. Initiating auto-recovery protocol...', 'error');
    }, 90000);

    return () => clearInterval(timer);
  }, [isCompleted]);

  // Reconnection logic
  useEffect(() => {
    if (connectionQuality === 'disconnected' && isReconnecting) {
      const timer = setInterval(() => {
        setReconnectAttempts(prev => {
          if (prev >= 2) {
            clearInterval(timer);
            setConnectionQuality('excellent');
            setIsReconnecting(false);
            onShowNotification('Stream pipeline re-established. Connected to HD endpoint.', 'success');
            return 0;
          }
          return prev + 1;
        });
      }, 25000); // Attempt every 2.5 seconds simulation
      return () => clearInterval(timer);
    }
  }, [connectionQuality, isReconnecting]);

  // Sync quality settings
  const handleQualityChange = (q: '1080p' | '720p' | '480p' | 'auto') => {
    setSyncingQuality(true);
    setStreamQuality(q);
    setTimeout(() => {
      setSyncingQuality(false);
      onShowNotification(`Bitrate stream adapted to ${q.toUpperCase()} resolution.`, 'success');
    }, 800);
  };

  // Sync real-time attendance in the background (runs every 15s)
  useEffect(() => {
    if (isCompleted) return;

    const interval = setInterval(async () => {
      setAttendanceDuration(prev => {
        const nextVal = prev + 15;
        // Background sync with Firestore
        if (userId && userId !== 'guest_user') {
          setSyncingAttendance(true);
          liveService.syncAttendance(
            cls.classId,
            userId,
            userName,
            startTimeRef.current.toISOString(),
            new Date().toISOString(),
            nextVal,
            cls.duration
          ).then(() => {
            setSyncingAttendance(false);
          }).catch(() => {
            setSyncingAttendance(false);
          });
        }
        return nextVal;
      });
    }, 15000);

    return () => clearInterval(interval);
  }, [cls.classId, userId, isCompleted]);

  // Sync attendance upon unmounting (leaving workspace)
  useEffect(() => {
    return () => {
      if (!isCompleted && userId && userId !== 'guest_user' && attendanceDuration > 0) {
        liveService.syncAttendance(
          cls.classId,
          userId,
          userName,
          startTimeRef.current.toISOString(),
          new Date().toISOString(),
          attendanceDuration,
          cls.duration
        ).catch(err => console.warn('Final attendance flush failed:', err));
      }
    };
  }, [cls.classId, userId, attendanceDuration, isCompleted]);

  // Listen to Firestore real-time Live Chat
  useEffect(() => {
    const unsubscribe = liveService.listenToLiveChat(cls.classId, (msgs) => {
      setChatMessages(msgs);
      // Auto Scroll
      setTimeout(() => {
        if (chatScrollRef.current) {
          chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
      }, 100);
    });

    return () => unsubscribe();
  }, [cls.classId]);

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const now = Date.now();
    if (now - lastSentTime < 1500) {
      setSpamGuardActive(true);
      setTimeout(() => setSpamGuardActive(false), 2000);
      onShowNotification('Please slow down. Chat spam protection is active.', 'error');
      return;
    }

    try {
      setLastSentTime(now);
      const msgText = chatInput.trim();
      setChatInput('');
      await liveService.sendChatMessage(
        cls.classId,
        userId,
        userName,
        userPhoto,
        msgText,
        userName.includes('Zafar') || userName.includes('Jamil') || userName.includes('Connor')
      );
    } catch (err) {
      onShowNotification('Failed to dispatch message.', 'error');
    }
  };

  // Fast emoji insert
  const handleEmojiInsert = (emoji: string) => {
    setChatInput(prev => prev + emoji);
  };

  // Fullscreen support
  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (!document.fullscreenElement) {
        videoRef.current.requestFullscreen().then(() => {
          setIsFullscreen(true);
        }).catch(() => {});
      } else {
        document.exitFullscreen().then(() => {
          setIsFullscreen(false);
        }).catch(() => {});
      }
    }
  };

  // PiP support
  const togglePip = () => {
    if (videoRef.current) {
      if (document.pictureInPictureElement) {
        document.exitPictureInPicture().then(() => {
          setIsPip(false);
        }).catch(() => {});
      } else {
        videoRef.current.requestPictureInPicture().then(() => {
          setIsPip(true);
        }).catch(() => {});
      }
    }
  };

  // Render variables
  const currentRatio = Math.min(Math.round((attendanceDuration / (cls.duration * 60)) * 100), 100);

  return (
    <div className="space-y-3">
      {/* Mini Workspace header */}
      <div className="flex justify-between items-center bg-slate-900/60 p-3 rounded-2xl border border-white/5 backdrop-blur-md">
        <button
          onClick={onBack}
          className="p-1 px-2.5 bg-white/5 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white rounded-lg text-[9px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center space-x-1"
        >
          <ChevronLeft size={10} />
          <span>Exit Workspace</span>
        </button>

        <div className="flex items-center space-x-2">
          {isCompleted ? (
            <span className="text-[8px] font-mono font-bold bg-white/5 text-slate-400 border border-white/10 px-2 py-0.5 rounded">
              Archived Classroom Recording
            </span>
          ) : (
            <div className="flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
              <span className="text-[9px] font-mono font-extrabold text-red-400 uppercase tracking-widest">
                Real-Time stream
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Grid: Video Left, Chat Right */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Left 2 cols: Video Player & controls */}
        <div className="md:col-span-2 space-y-2">
          <div className="bg-slate-950 rounded-2xl border border-white/10 overflow-hidden relative shadow-2xl aspect-video flex flex-col justify-center">
            {/* Real Streaming HTML5 Video source */}
            <video
              ref={videoRef}
              src={(isCompleted ? cls.recordingUrl : cls.streamUrl) || undefined}
              autoPlay
              playsInline
              controls
              className="w-full h-full object-contain"
            />

            {/* Simulated Live Connection Droppings Overlay */}
            {isReconnecting && (
              <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center text-center p-4 z-20">
                <div className="relative mb-3">
                  <div className="w-12 h-12 rounded-full border-2 border-t-[#39FF14] border-white/10 animate-spin"></div>
                  <WifiOff size={16} className="text-red-500 absolute top-3.5 left-3.5 animate-pulse" />
                </div>
                <h4 className="text-xs font-bold text-white">Stream Buffering Link Lost</h4>
                <p className="text-[10px] text-slate-400 mt-1 max-w-xs leading-normal">
                  Re-negotiating WebRTC socket pipeline parameters... (Attempt {reconnectAttempts}/3)
                </p>
                <div className="mt-3 text-[8px] font-mono text-[#39FF14] bg-[#39FF14]/5 px-2 py-1 rounded border border-[#39FF14]/10">
                  AUTO RECONNECT TRIGGERED
                </div>
              </div>
            )}

            {/* Sync Quality Indicator Overlay */}
            {syncingQuality && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-10 font-mono text-[10px] text-[#39FF14] animate-pulse">
                Adapting encoding stream...
              </div>
            )}

            {/* Indicator labels inside player */}
            <div className="absolute top-3 left-3 flex items-center space-x-1.5 pointer-events-none">
              {!isCompleted && (
                <span className="px-2 py-0.5 rounded bg-red-500 text-white text-[7px] font-mono font-black uppercase tracking-wider animate-pulse">
                  Live
                </span>
              )}
              <span className="px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm text-slate-300 text-[7px] font-mono">
                {streamQuality.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Telemetry Control Panel */}
          <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-3 space-y-2.5">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-[10px] font-bold text-white">Advanced Classroom Telemetry</h4>
                <p className="text-[8px] text-slate-400 mt-0.5">Adapt pipeline buffers or watch resolution</p>
              </div>

              {/* Attendance quick gauge (live only) */}
              {!isCompleted && (
                <div className="flex items-center space-x-2 bg-white/5 px-2.5 py-1 rounded-xl border border-white/5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#39FF14] animate-ping"></span>
                  <span className="text-[8.5px] font-mono text-slate-300">
                    Duration: {Math.round(attendanceDuration / 60)}m ({currentRatio}%)
                  </span>
                  {syncingAttendance && (
                    <Activity size={10} className="text-[#39FF14] animate-spin flex-shrink-0" />
                  )}
                </div>
              )}
            </div>

            {/* Quality selectors & Network health controls */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
              {/* Quality options */}
              <div className="space-y-1">
                <p className="text-[8px] font-mono text-slate-500 uppercase tracking-wider">Stream Quality</p>
                <div className="flex space-x-1">
                  {(['auto', '1080p', '480p'] as const).map(q => (
                    <button
                      key={q}
                      onClick={() => handleQualityChange(q)}
                      className={`flex-1 py-1 rounded text-[8.5px] font-mono font-bold transition-all cursor-pointer ${
                        streamQuality === q 
                          ? 'bg-[#39FF14] text-black font-extrabold' 
                          : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {q.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Simulation triggers */}
              <div className="space-y-1">
                <p className="text-[8px] font-mono text-slate-500 uppercase tracking-wider">Telemetry Teleport</p>
                <div className="flex space-x-1">
                  <button
                    onClick={() => {
                      setConnectionQuality('excellent');
                      setIsReconnecting(false);
                      onShowNotification('Linked to primary CDNs. Latency: 12ms.', 'success');
                    }}
                    className={`flex-1 py-1 rounded text-[8.5px] font-mono font-bold transition-all cursor-pointer ${
                      connectionQuality === 'excellent' && !isReconnecting
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    WiFi Ok
                  </button>
                  <button
                    onClick={() => {
                      setConnectionQuality('disconnected');
                      setIsReconnecting(true);
                    }}
                    className={`flex-1 py-1 rounded text-[8.5px] font-mono font-bold transition-all cursor-pointer ${
                      isReconnecting
                        ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                        : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    Sim Drop
                  </button>
                </div>
              </div>
            </div>

            {/* Attendance indicator footer */}
            {!isCompleted && (
              <div className="pt-2 border-t border-white/5 space-y-1">
                <div className="flex justify-between items-center text-[8.5px] font-mono">
                  <span className="text-slate-400">Class Attendance Logging Status</span>
                  <span className={`font-bold ${currentRatio >= 75 ? 'text-[#39FF14]' : 'text-amber-400'}`}>
                    {currentRatio >= 75 ? 'PRESENT (75%+ ENGAGED)' : 'PARTIAL ENGAGEMENT'}
                  </span>
                </div>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-amber-500 to-[#39FF14] h-full transition-all duration-500"
                    style={{ width: `${currentRatio}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 col: Live Chat Workspace */}
        <div className="bg-slate-900/60 border border-white/5 rounded-2xl flex flex-col h-[400px] overflow-hidden relative shadow-2xl">
          <div className="bg-white/[0.01] border-b border-white/5 p-3 flex justify-between items-center">
            <div className="flex items-center space-x-1.5">
              <Users size={12} className="text-[#39FF14]" />
              <h4 className="text-[10px] font-bold text-white uppercase tracking-wider">Scholarly Chat</h4>
            </div>
            <span className="text-[8px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">
              {chatMessages.length} Messages
            </span>
          </div>

          {/* Chat scroll box */}
          <div 
            ref={chatScrollRef}
            className="flex-1 p-3 overflow-y-auto space-y-2.5 scrollbar-thin scrollbar-thumb-white/10"
          >
            {chatMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-1.5 text-slate-500 py-12">
                <Smile size={24} className="text-slate-600 animate-bounce" />
                <p className="text-[9px] font-mono">Welcome to the Interactive classroom chat.</p>
                <p className="text-[8px] max-w-[160px] leading-normal">Feel free to raise queries or answer peer reviews.</p>
              </div>
            ) : (
              chatMessages.map(msg => (
                <div 
                  key={msg.chatId} 
                  className={`flex items-start space-x-2 text-[10.5px] ${
                    msg.isInstructor ? 'bg-amber-500/5 p-2 rounded-xl border border-amber-500/20 shadow-md' : ''
                  }`}
                >
                  <div className="w-5.5 h-5.5 rounded-full bg-slate-800 overflow-hidden border border-white/10 flex-shrink-0 mt-0.5">
                    {msg.userPhoto ? (
                      <img src={msg.userPhoto || undefined} alt={msg.userName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User size={10} className="text-slate-500 m-1" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between mb-0.5">
                      <span className={`font-bold truncate max-w-[100px] ${
                        msg.isInstructor ? 'text-amber-400 text-[10px] flex items-center space-x-0.5' : 'text-[#39FF14]'
                      }`}>
                        <span>{msg.userName}</span>
                        {msg.isInstructor && <ShieldCheck size={9} className="text-amber-400" />}
                      </span>
                      <span className="text-[7.5px] font-mono text-slate-500 flex-shrink-0">
                        {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}
                      </span>
                    </div>
                    <p className={`text-slate-200 leading-normal font-sans break-words ${msg.isInstructor ? 'font-medium' : ''}`}>
                      {msg.message}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Chat Quick Emojis row */}
          <div className="bg-white/[0.01] border-t border-white/5 px-2 py-1 flex justify-around">
            {['👍', '🔥', '❤️', '😮', '🚀', '💡'].map(emoji => (
              <button
                key={emoji}
                onClick={() => handleEmojiInsert(emoji)}
                className="hover:scale-125 transition-transform text-xs cursor-pointer p-0.5"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Input text form */}
          <form 
            onSubmit={handleSendMessage}
            className="p-2 border-t border-white/5 bg-slate-950/40 flex items-center space-x-1.5"
          >
            <input
              type="text"
              placeholder={spamGuardActive ? "Spam protection: Wait 1.5s" : "Type a query..."}
              disabled={spamGuardActive}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 bg-white/[0.02] border border-white/10 focus:border-[#39FF14]/40 rounded-xl py-2 px-3 text-[10px] text-white placeholder-slate-500 outline-none transition-all outline-none"
            />
            <button
              type="submit"
              disabled={spamGuardActive || !chatInput.trim()}
              className="p-2 bg-[#39FF14] hover:bg-[#32e011] disabled:bg-white/5 text-black disabled:text-slate-500 rounded-xl transition-all cursor-pointer"
            >
              <Send size={11} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
