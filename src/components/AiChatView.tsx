import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Send, Bot, User, Trash2, RotateCw, Copy, Check, MessageSquare, 
  Sparkles, History, Mic, Image as ImageIcon, PlusCircle, Maximize2, Minimize2, ChevronLeft, Camera
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { auth, db } from '../services/firebase';
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { Course } from '../types/course';
import { progressService } from '../services/progressService';
import { courseService } from '../services/courseService';

interface AiChatViewProps {
  onClose: () => void;
  userProfile: any;
  onShowNotification: (message: string, type: 'success' | 'error') => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  images?: string[];
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  updatedAt: Date;
}

export function AiChatView({ onClose, userProfile, onShowNotification }: AiChatViewProps) {
  
  // Handling Android Back Button / App Back Button
  useEffect(() => {
    const handlePopState = (e) => {
      onClose();
    };
    
    // Push a dummy state so when back button is pressed, it just pops this state and triggers popstate
    window.history.pushState({ modal: 'aichat' }, '');
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (window.history.state && window.history.state.modal === 'aichat') {
        window.history.back();
      }
    };
  }, [onClose]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  
  const [historySessions, setHistorySessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [isCopied, setIsCopied] = useState<string | null>(null);
  
  const [isFullscreen, setIsFullscreen] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Suggested Prompts
  const suggestedPrompts = [
    "Summarize my recent course",
    "Generate a 5-question MCQ on Physics",
    "Explain React Hooks simply",
    "Create a study plan for this week"
  ];

  useEffect(() => {
    loadEnrolledCourses();
    loadHistorySessions();
    if (!currentSessionId) {
      createNewSession();
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadEnrolledCourses = async () => {
    if (!auth.currentUser) return;
    try {
      const relations = await progressService.getUserMyCourses(
        auth.currentUser.uid,
        auth.currentUser.email || undefined
      );
      const courses: Course[] = [];
      for (const r of relations) {
        const c = await courseService.getCourses({}, 'popular'); // Or a specific fetch
        const found = c.find(course => course.courseId === r.courseId);
        if (found) courses.push(found);
      }
      setEnrolledCourses(courses);
    } catch (err) {
      console.error(err);
    }
  };

  const loadHistorySessions = async () => {
    if (!auth.currentUser) return;
    try {
      const q = query(
        collection(db, 'chatHistory'),
        where('userId', '==', auth.currentUser.uid)
      );
      const snap = await getDocs(q);
      const sessions = snap.docs.map(doc => ({
        id: doc.id,
        title: doc.data().title || 'New Conversation',
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      setHistorySessions(sessions);
    } catch (error) {
      console.error("Error loading chat history", error);
    }
  };
  
  const createNewSession = async () => {
    if (!auth.currentUser) return;
    setMessages([{
      id: 'welcome-msg',
      role: 'assistant',
      text: "Hello! I am your Premium Nexus AI Study Assistant. How can I help you accelerate your learning today?",
      timestamp: new Date()
    }]);
    setCurrentSessionId(null); // will be created on first message
  };
  
  const loadSession = async (sessionId: string) => {
    if (!auth.currentUser) return;
    setCurrentSessionId(sessionId);
    setShowHistory(false);
    setIsLoading(true);
    try {
      const q = query(
        collection(db, `chatHistory/${sessionId}/messages`),
        orderBy('timestamp', 'asc')
      );
      const snap = await getDocs(q);
      const loadedMsgs = snap.docs.map(doc => ({
        id: doc.id,
        role: doc.data().role,
        text: doc.data().text,
        timestamp: doc.data().timestamp?.toDate() || new Date()
      }));
      setMessages(loadedMsgs);
    } catch (error) {
      console.error("Error loading messages", error);
    } finally {
      setIsLoading(false);
    }
  };

  
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          const max_size = 1200;
          if (width > height && width > max_size) {
            height *= max_size / width;
            width = max_size;
          } else if (height > max_size) {
            width *= max_size / height;
            height = max_size;
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = (e) => reject(e);
      };
      reader.onerror = (e) => reject(e);
    });
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsUploading(true);
      try {
        const newImages = [...selectedImages];
        for (let i = 0; i < e.target.files.length; i++) {
          const file = e.target.files[i];
          if (file.type.startsWith('image/')) {
            const compressed = await compressImage(file);
            newImages.push(compressed);
          }
        }
        setSelectedImages(newImages);
      } catch (err) {
        onShowNotification('Error processing image', 'error');
      } finally {
        setIsUploading(false);
      }
    }
  };
  
  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(id);
    setTimeout(() => setIsCopied(null), 2000);
  };

  const handleSend = async (text: string = input) => {
    if ((!text.trim() && selectedImages.length === 0) || !auth.currentUser) return;
    
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text,
      images: selectedImages.length > 0 ? [...selectedImages] : undefined,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    const imagesToSend = [...selectedImages];
    setSelectedImages([]);
    setIsLoading(true);

    try {
      let sessionId = currentSessionId;
      if (!sessionId) {
        const newSessionRef = await addDoc(collection(db, 'chatHistory'), {
          userId: auth.currentUser.uid,
          title: text.substring(0, 30) + (text.length > 30 ? '...' : ''),
          updatedAt: serverTimestamp()
        });
        sessionId = newSessionRef.id;
        setCurrentSessionId(sessionId);
        setHistorySessions(prev => [{
          id: sessionId!,
          title: text.substring(0, 30) + '...',
          updatedAt: new Date()
        }, ...prev]);
      } else {
        await setDoc(doc(db, 'chatHistory', sessionId), {
          updatedAt: serverTimestamp()
        }, { merge: true });
      }

      await addDoc(collection(db, `chatHistory/${sessionId}/messages`), {
        role: 'user',
        text,
        images: imagesToSend.length > 0 ? imagesToSend : null,
        timestamp: serverTimestamp()
      });

      // Prepare context
      let courseContext = "No specific course context.";
      if (selectedCourseId !== 'all') {
        const course = enrolledCourses.find(c => c.courseId === selectedCourseId);
        if (course) {
          courseContext = `The student is currently asking about the course: "${course.title}" (Category: ${course.category}, Instructor: ${course.instructor}). Description: ${course.description}`;
        }
      }
      
      const historyForApi = messages.map(m => ({ role: m.role, text: m.text, images: m.images }));

      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          images: imagesToSend,
          history: historyForApi,
          courseContext
        })
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      
      let aiResponseText = "";
      const aiMsgId = (Date.now() + 1).toString();
      
      setMessages(prev => [...prev, {
        id: aiMsgId,
        role: 'assistant',
        text: '',
        timestamp: new Date()
      }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunkStr = decoder.decode(value);
        const lines = chunkStr.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data = JSON.parse(line.substring(6));
              if (data.text) {
                aiResponseText += data.text;
                setMessages(prev => {
                  const newMsgs = [...prev];
                  const last = newMsgs[newMsgs.length - 1];
                  if (last.id === aiMsgId) {
                    last.text = aiResponseText;
                  }
                  return newMsgs;
                });
              }
            } catch (e) {
              console.warn("Parse error", e);
            }
          }
        }
      }

      await addDoc(collection(db, `chatHistory/${sessionId}/messages`), {
        role: 'assistant',
        text: aiResponseText,
        timestamp: serverTimestamp()
      });

    } catch (error) {
      console.error("Chat error:", error);
      onShowNotification("Failed to get response from AI. Please try again.", "error");
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        text: "I apologize, but I encountered an error connecting to the Nexus AI Matrix. Please check your network and try again.",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (messages.length < 2) return;
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMsg) {
      // Remove last assistant message
      setMessages(prev => {
        const newMsgs = [...prev];
        if (newMsgs[newMsgs.length - 1].role === 'assistant') {
          newMsgs.pop();
        }
        return newMsgs;
      });
      handleSend(lastUserMsg.text);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 50, scale: 0.95 }}
      className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-md`}
    >
      <div className={`w-full ${isFullscreen ? 'h-full max-w-7xl' : 'h-[85vh] max-w-4xl'} bg-[#0a0f1d] border border-[#39FF14]/20 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(57,255,20,0.1)] flex transition-all duration-300 relative`}>
        
        {/* Sidebar History */}
        <div className={`w-64 bg-slate-950/80 border-r border-white/10 flex flex-col transition-all duration-300 absolute md:relative z-20 h-full ${showHistory ? 'left-0' : '-left-full md:left-0'}`}>
          <div className="p-4 border-b border-white/10 flex justify-between items-center">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <History size={16} className="text-[#39FF14]" />
              <span>Chat History</span>
            </h3>
            <button onClick={() => setShowHistory(false)} className="md:hidden text-slate-400 hover:text-white">
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 no-scrollbar">
            <button 
              onClick={createNewSession}
              className="w-full flex items-center space-x-2 p-3 rounded-xl bg-[#39FF14]/10 text-[#39FF14] hover:bg-[#39FF14]/20 border border-[#39FF14]/20 transition-all font-semibold text-xs mb-4"
            >
              <PlusCircle size={14} />
              <span>New Conversation</span>
            </button>
            {historySessions.map(session => (
              <button
                key={session.id}
                onClick={() => loadSession(session.id)}
                className={`w-full text-left p-3 rounded-xl text-xs font-sans transition-all truncate flex items-center space-x-2 ${currentSessionId === session.id ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}
              >
                <MessageSquare size={12} className="shrink-0" />
                <span className="truncate">{session.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col h-full bg-[#0a0f1d]/90 relative z-10">
          {/* Header */}
          <div className="h-16 border-b border-white/10 flex items-center justify-between px-4 bg-slate-950/50 backdrop-blur-md">
            <div className="flex items-center space-x-3">
              <button 
                onClick={onClose}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-300 transition-all"
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                onClick={() => setShowHistory(!showHistory)}
                className="md:hidden p-2 bg-white/5 rounded-lg text-slate-300"
              >
                <History size={16} />
              </button>
              <div className="w-8 h-8 rounded-full bg-[#39FF14]/10 border border-[#39FF14]/30 flex items-center justify-center">
                <Sparkles size={16} className="text-[#39FF14]" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                  <span>Nexus AI Assistant</span>
                  <span className="text-[9px] bg-[#39FF14]/20 text-[#39FF14] px-1.5 py-0.5 rounded uppercase font-mono font-bold tracking-wider">Premium</span>
                </h2>
                <div className="flex items-center space-x-2 mt-0.5">
                  <span className="w-1.5 h-1.5 bg-[#39FF14] rounded-full animate-pulse"></span>
                  <span className="text-[10px] text-slate-400 font-mono">System Online</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <select 
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="hidden sm:block bg-slate-900 border border-white/10 text-slate-300 text-[10px] rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#39FF14]/50 max-w-[150px] truncate"
              >
                <option value="all">General Context</option>
                {enrolledCourses.map(c => (
                  <option key={c.courseId} value={c.courseId}>{c.title}</option>
                ))}
              </select>
              <button 
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
              >
                {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
              <button 
                onClick={onClose}
                className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded-lg transition-all"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scroll-smooth">
            {messages.length === 1 && messages[0].id === 'welcome-msg' && (
              <div className="flex flex-wrap gap-2 mt-6 justify-center">
                {suggestedPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(prompt)}
                    className="px-4 py-2 bg-white/5 border border-white/10 hover:border-[#39FF14]/50 rounded-full text-xs text-slate-300 hover:text-[#39FF14] transition-all"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {messages.map((msg, i) => (
              <motion.div 
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex max-w-[85%] sm:max-w-[75%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-slate-800 ml-3' : 'bg-[#39FF14]/10 border border-[#39FF14]/30 mr-3'}`}>
                    {msg.role === 'user' ? <User size={14} className="text-white" /> : <Bot size={16} className="text-[#39FF14]" />}
                  </div>
                  
                  <div className="flex flex-col space-y-1">
                    <div className={`p-4 rounded-2xl ${
                      msg.role === 'user' 
                        ? 'bg-slate-800 text-white rounded-tr-sm' 
                        : 'glass-panel-light text-slate-200 rounded-tl-sm shadow-lg'
                    }`}>
                      {msg.role === 'user' ? (
                        <div>
                          {msg.images && msg.images.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-2">
                              {msg.images.map((img, idx) => (
                                <img key={idx} src={img || undefined} alt="User Upload" className="max-w-[120px] max-h-[120px] rounded-lg border border-white/10" />
                              ))}
                            </div>
                          )}
                          <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                        </div>
                      ) : (
                        <div className="prose prose-invert prose-sm max-w-none text-sm">
                          <ReactMarkdown 
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                            components={{
                              code({node, inline, className, children, ...props}: any) {
                                const match = /language-(\w+)/.exec(className || '')
                                return !inline && match ? (
                                  <SyntaxHighlighter
                                    style={vscDarkPlus as any}
                                    language={match[1]}
                                    PreTag="div"
                                    className="rounded-lg text-xs"
                                    {...props}
                                  >
                                    {String(children).replace(/\n$/, '')}
                                  </SyntaxHighlighter>
                                ) : (
                                  <code className="bg-white/10 px-1.5 py-0.5 rounded text-[#39FF14] font-mono text-xs" {...props}>
                                    {children}
                                  </code>
                                )
                              }
                            }}
                          >
                            {msg.text || '...'}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                    {msg.role === 'assistant' && msg.text && (
                      <div className="flex items-center space-x-2 pl-1">
                        <button 
                          onClick={() => handleCopy(msg.id, msg.text)}
                          className="text-slate-500 hover:text-slate-300 p-1 flex items-center space-x-1 transition-colors"
                        >
                          {isCopied === msg.id ? <Check size={12} className="text-[#39FF14]" /> : <Copy size={12} />}
                          <span className="text-[10px] font-mono">{isCopied === msg.id ? 'Copied' : 'Copy'}</span>
                        </button>
                        {i === messages.length - 1 && !isLoading && (
                          <button 
                            onClick={handleRegenerate}
                            className="text-slate-500 hover:text-[#39FF14] p-1 flex items-center space-x-1 transition-colors"
                          >
                            <RotateCw size={12} />
                            <span className="text-[10px] font-mono">Regenerate</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex max-w-[85%] flex-row">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-[#39FF14]/10 border border-[#39FF14]/30 mr-3 flex items-center justify-center">
                    <Bot size={16} className="text-[#39FF14]" />
                  </div>
                  <div className="glass-panel-light p-4 rounded-2xl rounded-tl-sm flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 bg-[#39FF14] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-[#39FF14] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-[#39FF14] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          {selectedImages.length > 0 && (
            <div className="px-4 py-2 bg-slate-900 border-t border-white/10 flex gap-2 overflow-x-auto">
              {selectedImages.map((img, idx) => (
                <div key={idx} className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-white/10">
                  <img src={img || undefined} alt="upload preview" className="w-full h-full object-cover" />
                  <button onClick={() => removeImage(idx)} className="absolute top-1 right-1 bg-black/50 p-1 rounded-full text-white hover:text-red-400">
                    <X size={10} />
                  </button>
                </div>
              ))}
              {isUploading && (
                 <div className="w-16 h-16 shrink-0 rounded-lg border border-white/10 flex items-center justify-center bg-white/5">
                   <div className="w-4 h-4 border-2 border-[#39FF14] border-t-transparent rounded-full animate-spin"></div>
                 </div>
              )}
            </div>
          )}
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleImageSelect} />
          <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleImageSelect} />

          <div className="p-4 bg-slate-950/80 border-t border-white/10 backdrop-blur-md">
            <div className="relative flex items-end bg-slate-900 border border-white/10 rounded-2xl focus-within:border-[#39FF14]/50 focus-within:shadow-[0_0_15px_rgba(57,255,20,0.1)] transition-all overflow-hidden p-1">
              <div className="flex p-2 space-x-1 text-slate-400">
                <button onClick={() => fileInputRef.current?.click()} className="p-1.5 hover:text-white hover:bg-white/5 rounded-lg transition-all text-slate-400 hover:text-[#39FF14]" title="Upload Image">
                  <ImageIcon size={18} />
                </button>
                <button onClick={() => cameraInputRef.current?.click()} className="p-1.5 hover:text-white hover:bg-white/5 rounded-lg transition-all text-slate-400 hover:text-[#39FF14]" title="Take Photo">
    <Camera size={18} />
  </button>
              </div>
              
              <textarea 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask your AI Assistant anything..."
                className="flex-1 bg-transparent border-none focus:outline-none text-sm text-white resize-none py-3 px-2 max-h-32 placeholder-slate-500 font-sans"
                rows={1}
                style={{ minHeight: '44px' }}
              />
              
              <div className="p-2">
                <button 
                  onClick={() => handleSend()}
                  disabled={(!input.trim() && selectedImages.length === 0) || isLoading || isUploading}
                  className={`p-2.5 rounded-xl flex items-center justify-center transition-all ${(input.trim() || selectedImages.length > 0) && !isLoading ? 'bg-[#39FF14] text-black shadow-[0_0_15px_rgba(57,255,20,0.3)] cursor-pointer hover:scale-105' : 'bg-white/5 text-slate-500 cursor-not-allowed'}`}
                >
                  <Send size={16} className={(input.trim() || selectedImages.length > 0) && !isLoading ? 'translate-x-0.5' : ''} />
                </button>
              </div>
            </div>
            <div className="text-center mt-2">
              <p className="text-[9px] text-slate-500 font-mono">
                Nexus AI can make mistakes. Consider verifying important academic information.
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
