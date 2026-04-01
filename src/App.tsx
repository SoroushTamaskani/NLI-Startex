/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Paperclip, 
  Link as LinkIcon, 
  Image as ImageIcon, 
  FileText, 
  Mic, 
  MicOff,
  Video, 
  X, 
  Loader2, 
  ShieldCheck, 
  AlertCircle, 
  Info,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  History,
  Plus,
  Trash2,
  Menu,
  Copy,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { Message, Attachment, GroundingSource, ChatSession } from './types';
import { verifyInformation } from './services/gemini';

import mammoth from 'mammoth';

export default function App() {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('nli_sessions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((s: any) => ({
          ...s,
          createdAt: new Date(s.createdAt),
          messages: s.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }))
        }));
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hi there! 👋 I'm NLI, your friendly truth-detecting robot! 🤖 Send me a story, a picture, or a video, and I'll help you find out if it's true or just a silly trick! I can even spot if a computer made it! ✨",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [hasQuotaError, setHasQuotaError] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const saveToLocalStorage = (data: ChatSession[]) => {
      try {
        localStorage.setItem('nli_sessions', JSON.stringify(data));
        setHasQuotaError(false);
      } catch (e) {
        if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
          console.warn('LocalStorage quota exceeded. Pruning sessions...');
          setHasQuotaError(true);
          
          // Strategy 1: Prune base64 data from all attachments in all sessions
          const prunedSessions = data.map(session => ({
            ...session,
            messages: session.messages.map(msg => ({
              ...msg,
              attachments: msg.attachments?.map(att => ({
                ...att,
                base64: undefined // Remove base64 to save space
              }))
            }))
          }));

          try {
            localStorage.setItem('nli_sessions', JSON.stringify(prunedSessions));
            setSessions(prunedSessions);
            setHasQuotaError(false);
          } catch (e2) {
            // Strategy 2: Remove oldest sessions one by one
            if (data.length > 1) {
              const fewerSessions = data.slice(0, -1);
              setSessions(fewerSessions);
            }
          }
        }
      }
    };

    saveToLocalStorage(sessions);
  }, [sessions]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isVerifying]);

  // Voice Input Setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('');
        setInput(transcript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const createNewSession = () => {
    if (messages.length > 1) {
      const newSession: ChatSession = {
        id: Date.now().toString(),
        title: messages[1]?.content.slice(0, 30) + '...' || 'New Verification',
        messages: [...messages],
        createdAt: new Date()
      };
      setSessions(prev => [newSession, ...prev]);
    }
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: "Hello! I'm NLI (No Lie AI). Send me a claim, link, image, audio, video, or document files you'd like me to fact-check for you.",
      timestamp: new Date(),
    }]);
    setCurrentSessionId(null);
    setIsSidebarOpen(false);
  };

  const loadSession = (session: ChatSession) => {
    setMessages(session.messages);
    setCurrentSessionId(session.id);
    setIsSidebarOpen(false);
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions(prev => prev.filter(s => s.id !== id));
    if (currentSessionId === id) {
      createNewSession();
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files) return;

    for (const file of Array.from(files)) {
      const id = Math.random().toString(36).substring(7);
      
      // Refined type detection
      let type = file.type.split('/')[0];
      const extension = file.name.split('.').pop()?.toLowerCase();
      
      // Common audio extensions that might be misidentified as video or document
      const audioExtensions = ['mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac', 'm4b', 'm4p', 'opus'];
      const videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv'];
      const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
      const documentExtensions = ['pdf', 'txt', 'md', 'docx', 'doc'];

      let attachmentType: 'image' | 'audio' | 'video' | 'document' = 'document';

      if (type === 'audio' || (extension && audioExtensions.includes(extension))) {
        attachmentType = 'audio';
      } else if (type === 'video' || (extension && videoExtensions.includes(extension))) {
        attachmentType = 'video';
      } else if (type === 'image' || (extension && imageExtensions.includes(extension))) {
        attachmentType = 'image';
      }

      const url = URL.createObjectURL(file);
      
      const initialAttachment: Attachment = {
        id,
        type: attachmentType as any,
        url: url,
        name: file.name,
        mimeType: file.type || (
          attachmentType === 'audio' ? `audio/${extension}` : 
          attachmentType === 'video' ? `video/${extension}` : 
          attachmentType === 'image' ? `image/${extension}` : 
          extension === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' :
          extension === 'doc' ? 'application/msword' :
          'application/octet-stream'
        ),
        progress: 0
      };
      
      setAttachments(prev => [...prev, initialAttachment]);

      // Simulate upload progress
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 30;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          
          // Once "uploaded", read the base64
          const reader = new FileReader();
          reader.onload = (event) => {
            const base64 = event.target?.result as string;
            
            // If it's a text file, read the text content too
            if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
              const textReader = new FileReader();
              textReader.onload = (textEvent) => {
                const text = textEvent.target?.result as string;
                setAttachments(prev => prev.map(a => a.id === id ? { ...a, progress: 100, base64: base64.split(',')[1], textContent: text } : a));
              };
              textReader.readAsText(file);
            } else if (file.name.endsWith('.docx')) {
              const docxReader = new FileReader();
              docxReader.onload = async (docxEvent) => {
                const arrayBuffer = docxEvent.target?.result as ArrayBuffer;
                try {
                  const result = await mammoth.extractRawText({ arrayBuffer });
                  setAttachments(prev => prev.map(a => a.id === id ? { ...a, progress: 100, base64: base64.split(',')[1], textContent: result.value } : a));
                } catch (e) {
                  console.error('Error extracting text from docx:', e);
                  setAttachments(prev => prev.map(a => a.id === id ? { ...a, progress: 100, base64: base64.split(',')[1] } : a));
                }
              };
              docxReader.readAsArrayBuffer(file);
            } else {
              setAttachments(prev => prev.map(a => a.id === id ? { ...a, progress: 100, base64: base64.split(',')[1] } : a));
            }
          };
          reader.readAsDataURL(file);
        } else {
          setAttachments(prev => prev.map(a => a.id === id ? { ...a, progress } : a));
        }
      }, 300);
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileUpload(e.target.files);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleSend = async () => {
    if (!input.trim() && attachments.length === 0) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      attachments: [...attachments],
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setAttachments([]);
    setIsVerifying(true);

    try {
      const response = await verifyInformation(userMessage.content, userMessage.attachments);
      
      let data;
      try {
        const rawData = JSON.parse(response.text || '{}');
        // Map flattened schema back to our internal structure
        data = {
          verdict: rawData.verdict || "Unknown",
          summary: rawData.summary || "No summary provided.",
          detailedAnalysis: rawData.detailedAnalysis || "No detailed analysis available.",
          credibilityScore: rawData.credibilityScore || 0,
          aiDetection: {
            isAI: rawData.isAI || false,
            confidence: rawData.aiConfidence || 0,
            reasoning: rawData.aiReasoning || "No reasoning provided."
          },
          sources: rawData.sources || []
        };
      } catch (e) {
        data = {
          verdict: "Error",
          summary: "Failed to parse AI response.",
          detailedAnalysis: response.text || "No analysis available.",
          credibilityScore: 0,
          aiDetection: { isAI: false, confidence: 0, reasoning: "Error parsing response." },
          sources: []
        };
      }

      const groundingSources: GroundingSource[] = data.sources || response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
        title: chunk.web?.title || 'Source',
        uri: chunk.web?.uri || '#'
      })) || [];

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `**VERDICT: ${data.verdict}**\n\n${data.summary}\n\n**Detailed Analysis:**\n${data.detailedAnalysis}`,
        timestamp: new Date(),
        groundingSources,
        credibilityScore: data.credibilityScore,
        aiDetection: data.aiDetection
      };

      const finalMessages = [...newMessages, assistantMessage];
      setMessages(finalMessages);
      
      // Auto-save session if it's the first exchange
      if (!currentSessionId && finalMessages.length >= 3) {
        const newSession: ChatSession = {
          id: Date.now().toString(),
          title: userMessage.content.slice(0, 30) + '...',
          messages: finalMessages,
          createdAt: new Date()
        };
        setSessions(prev => [newSession, ...prev]);
        setCurrentSessionId(newSession.id);
      } else if (currentSessionId) {
        setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: finalMessages } : s));
      }

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I encountered an error while trying to verify that information. Please try again.",
        timestamp: new Date(),
      }]);
    } finally {
      setIsVerifying(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileUpload(files);
    }
  };

  return (
    <div className="flex h-screen bg-[#fffaf0] overflow-hidden font-sans">
      {/* Sidebar / History */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className="fixed inset-y-0 left-0 w-72 bg-white border-r-4 border-[#fef3c7] z-50 flex flex-col shadow-2xl"
          >
            <div className="p-4 border-b-4 border-[#fef3c7] flex items-center justify-between bg-[#fff7ed]">
              <h2 className="font-display font-bold text-[#4338ca] flex items-center gap-2 text-lg">
                <History size={20} className="text-[#f97316]" />
                My Discoveries 📚
              </h2>
              <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-[#ffedd5] rounded-full transition-colors">
                <X size={20} className="text-[#f97316]" />
              </button>
            </div>
            
            <div className="p-4">
              <button 
                onClick={createNewSession}
                className="w-full py-3 px-4 bg-[#f97316] text-white rounded-2xl font-display font-bold text-base flex items-center justify-center gap-2 hover:bg-[#ea580c] transition-all bubble-shadow active:translate-y-1 active:shadow-none"
              >
                <Plus size={20} />
                New Truth Hunt! 🔍
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {sessions.map(session => (
                <div 
                  key={session.id}
                  onClick={() => loadSession(session)}
                  className={cn(
                    "group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all",
                    currentSessionId === session.id ? "bg-sky-50 text-sky-700" : "hover:bg-slate-50 text-slate-600"
                  )}
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold truncate">{session.title}</span>
                    <span className="text-[10px] opacity-60">{session.createdAt.toLocaleDateString()}</span>
                  </div>
                  <button 
                    onClick={(e) => deleteSession(session.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-rose-50 hover:text-rose-500 rounded-lg transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col max-w-5xl mx-auto bg-white shadow-2xl relative border-x-4 border-[#fef3c7]">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b-4 border-[#fef3c7] bg-white z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 hover:bg-[#fff7ed] rounded-2xl text-[#f97316] transition-colors"
            >
              <Menu size={28} />
            </button>
            <div className="w-12 h-12 rounded-2xl bg-[#70d6ff] flex items-center justify-center text-white shadow-lg shadow-[#70d6ff]/20 bubble-shadow">
              <ShieldCheck size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold tracking-tight text-[#4338ca]">NLI</h1>
              <p className="text-xs font-bold text-[#f97316] uppercase tracking-widest">No Lie AI 🤖</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-[#99ff88]/20 border-2 border-[#99ff88]">
              <div className="w-3 h-3 rounded-full bg-[#99ff88] animate-pulse" />
              <span className="text-xs font-bold text-[#4338ca]">Ready to Help! ✨</span>
            </div>
          </div>
        </header>

        <AnimatePresence>
          {hasQuotaError && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-rose-50 border-b border-rose-100 overflow-hidden"
            >
              <div className="px-6 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-rose-600">
                  <AlertTriangle size={18} />
                  <p className="text-xs font-medium">
                    Storage limit reached. Older sessions or large attachments may be removed to save space.
                  </p>
                </div>
                <button 
                  onClick={() => setHasQuotaError(false)}
                  className="p-1 hover:bg-rose-100 rounded-lg text-rose-400 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat Area */}
        <main 
          ref={scrollRef}
          className={cn(
            "flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar relative",
            isDragging && "bg-sky-50/50"
          )}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 260, 
                  damping: 20,
                  opacity: { duration: 0.2 }
                }}
                className={cn(
                  "flex w-full",
                  msg.role === 'user' ? "justify-end" : "justify-start"
                )}
              >
                <div className={cn(
                  "max-w-[85%] sm:max-w-[75%] space-y-2",
                  msg.role === 'user' ? "items-end" : "items-start"
                )}>
                  {/* Message Bubble */}
                  <div className={cn(
                    "p-5 rounded-[32px] shadow-sm relative group/bubble bubble-shadow",
                    msg.role === 'user' 
                      ? "bg-[#70d6ff] text-[#4338ca] rounded-tr-none border-2 border-[#70d6ff]" 
                      : "bg-white text-[#4338ca] rounded-tl-none border-4 border-[#fef3c7]"
                  )}>
                    {msg.role === 'assistant' && msg.id !== 'welcome' && (
                      <button
                        onClick={() => copyToClipboard(msg.content, msg.id)}
                        className={cn(
                          "absolute top-2 right-2 p-1.5 rounded-lg transition-all opacity-0 group-hover/bubble:opacity-100",
                          copiedId === msg.id 
                            ? "bg-emerald-500 text-white" 
                            : "bg-white/80 text-slate-400 hover:text-slate-600 hover:bg-white shadow-sm border border-slate-200"
                        )}
                        title="Copy verification results"
                      >
                        {copiedId === msg.id ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    )}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {msg.attachments.map((att, i) => (
                          <div key={i} className="relative group rounded-lg overflow-hidden border border-white/20 bg-black/5">
                            {att.type === 'image' && (
                              <img src={att.url} alt={att.name} className="h-32 w-auto object-cover" referrerPolicy="no-referrer" />
                            )}
                            {att.type === 'video' && (
                              <div className="h-48 w-72 bg-slate-900 rounded-lg overflow-hidden flex flex-col">
                                <div className="flex items-center gap-2 p-2 bg-slate-800 text-white/70">
                                  <Video size={14} className="text-purple-400" />
                                  <span className="text-[10px] truncate flex-1">{att.name}</span>
                                </div>
                                <video src={att.url} controls className="w-full h-full object-contain bg-black" />
                              </div>
                            )}
                            {att.type === 'audio' && (
                              <div className="h-24 w-64 bg-slate-800 flex flex-col items-center justify-center px-4 gap-2">
                                <div className="flex items-center gap-2 w-full">
                                  <Mic className="text-sky-400" size={20} />
                                  <span className="text-[10px] truncate text-white/70 flex-1">{att.name}</span>
                                </div>
                                <audio src={att.url} controls className="h-8 w-full scale-90" />
                              </div>
                            )}
                            {att.type === 'document' && (
                              <div className="flex flex-col gap-2">
                                <div className="h-16 w-64 bg-slate-50 flex items-center px-4 gap-3 border border-slate-200 rounded-xl">
                                  <div className="p-2 bg-amber-100 rounded-lg">
                                    <FileText className="text-amber-600" size={20} />
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-bold text-slate-700 truncate">{att.name}</span>
                                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Document</span>
                                  </div>
                                </div>
                                {att.mimeType === 'application/pdf' && (
                                  <div className="w-64 h-80 rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm">
                                    <iframe 
                                      src={att.url} 
                                      className="w-full h-full border-none"
                                      title={att.name}
                                    />
                                  </div>
                                )}
                                {att.textContent && (
                                  <div className="w-64 max-h-64 overflow-y-auto p-4 bg-slate-50 rounded-xl border border-slate-200 text-[11px] font-mono text-slate-600 leading-relaxed custom-scrollbar shadow-inner">
                                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-200/50">
                                      <div className="w-2 h-2 rounded-full bg-slate-300" />
                                      <span className="text-[9px] uppercase tracking-widest font-bold text-slate-400">Content Preview</span>
                                    </div>
                                    {att.textContent}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="prose prose-sm max-w-none whitespace-pre-wrap leading-relaxed">
                      {msg.content}
                    </div>

                    {/* Credibility and AI Detection Indicators */}
                    {msg.role === 'assistant' && (msg.credibilityScore !== undefined || msg.aiDetection) && (
                      <div className="mt-4 pt-4 border-t-2 border-[#fef3c7] space-y-3">
                        <div className="flex flex-wrap gap-4">
                          {msg.credibilityScore !== undefined && (
                            <div className="flex items-center gap-2">
                              <div className="text-[10px] font-bold text-[#f97316] uppercase tracking-widest">Trust Meter 📈</div>
                              <div className={cn(
                                "px-2 py-0.5 rounded-full text-[11px] font-bold",
                                msg.credibilityScore > 70 ? "bg-[#99ff88] text-[#4338ca]" :
                                msg.credibilityScore > 40 ? "bg-[#ffd670] text-[#4338ca]" :
                                "bg-[#ff85a2] text-white"
                              )}>
                                {msg.credibilityScore}%
                              </div>
                            </div>
                          )}
                          {msg.aiDetection && (
                            <div className="flex items-center gap-2">
                              <div className="text-[10px] font-bold text-[#f97316] uppercase tracking-widest">Robot Check 🤖</div>
                              <div className={cn(
                                "px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1",
                                msg.aiDetection.isAI ? "bg-[#e4c1f9] text-[#4338ca]" : "bg-[#70d6ff] text-[#4338ca]"
                              )}>
                                {msg.aiDetection.isAI ? "Robot Made" : "Human Made"}
                                <span className="opacity-60 font-medium">({Math.round(msg.aiDetection.confidence * 100)}%)</span>
                              </div>
                            </div>
                          )}
                        </div>
                        {msg.aiDetection?.reasoning && (
                          <p className="text-[11px] text-[#4338ca]/70 italic leading-snug">
                            <span className="font-bold not-italic text-[#f97316]">Why?</span> {msg.aiDetection.reasoning}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Grounding Sources */}
                  {msg.groundingSources && msg.groundingSources.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-[10px] font-bold text-[#f97316] uppercase tracking-widest ml-1">Where I checked 📚</p>
                      <div className="flex flex-wrap gap-2">
                        {msg.groundingSources.map((source, i) => (
                          <a 
                            key={i} 
                            href={source.uri} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border-2 border-[#fef3c7] text-[11px] font-bold text-[#4338ca] hover:bg-[#fff7ed] transition-all bubble-shadow"
                          >
                            <ExternalLink size={12} className="text-[#70d6ff]" />
                            <span className="truncate max-w-[150px]">{source.title}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  <span className="text-[10px] text-slate-400 px-1">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isVerifying && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="flex justify-start"
            >
              <div className="bg-white border-4 border-[#fef3c7] p-5 rounded-[32px] rounded-tl-none flex items-center gap-4 shadow-sm bubble-shadow">
                <div className="relative">
                  <Loader2 className="animate-spin text-[#f97316]" size={24} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div 
                      animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-3 h-3 bg-[#f97316] rounded-full" 
                    />
                  </div>
                </div>
                <span className="text-base font-bold text-[#f97316]">Thinking hard... 🧠✨</span>
              </div>
            </motion.div>
          )}

          {isDragging && (
            <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
              <div className="bg-sky-500/10 border-2 border-dashed border-sky-500 rounded-3xl w-[calc(100%-48px)] h-[calc(100%-48px)] flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 rounded-full bg-sky-500 text-white flex items-center justify-center shadow-xl">
                  <Paperclip size={32} />
                </div>
                <p className="text-xl font-bold text-sky-600">Drop files to verify</p>
              </div>
            </div>
          )}
        </main>

        {/* Input Area */}
        <footer className="p-6 bg-white border-t-4 border-[#fef3c7]">
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-4">
              {attachments.map((att, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-[#fff7ed] border-2 border-[#ffedd5] group relative overflow-hidden min-w-[160px] bubble-shadow">
                  {att.type === 'image' && <ImageIcon size={16} className="text-[#ff85a2]" />}
                  {att.type === 'video' && <Video size={16} className="text-[#e4c1f9]" />}
                  {att.type === 'audio' && <Mic size={16} className="text-[#70d6ff]" />}
                  {att.type === 'document' && <FileText size={16} className="text-[#ffd670]" />}
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-xs font-bold text-[#4338ca] truncate">{att.name}</span>
                    {att.progress !== undefined && att.progress < 100 && (
                      <div className="w-full h-2 bg-white rounded-full mt-1 overflow-hidden border border-[#ffedd5]">
                        <div 
                          className="h-full bg-[#f97316] transition-all duration-300" 
                          style={{ width: `${att.progress}%` }} 
                        />
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => removeAttachment(i)}
                    className="p-1 rounded-full hover:bg-[#ffedd5] text-[#f97316] transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="relative flex items-end gap-4">
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={isListening ? "Listening... 👂" : "Tell me something to check! 🕵️‍♂️"}
                className={cn(
                  "w-full bg-[#fff7ed] border-4 border-[#ffedd5] rounded-[28px] px-6 py-4 pr-28 text-base font-medium placeholder:text-[#f97316]/40 focus:outline-none focus:ring-4 focus:ring-[#f97316]/10 focus:border-[#f97316] transition-all resize-none min-h-[64px] max-h-40 custom-scrollbar text-[#4338ca]",
                  isListening && "border-[#f97316] ring-4 ring-[#f97316]/10"
                )}
                rows={1}
              />
              <div className="absolute right-3 bottom-3 flex items-center gap-2">
                <button 
                  onClick={toggleListening}
                  className={cn(
                    "p-2.5 rounded-2xl transition-all bubble-shadow",
                    isListening ? "bg-[#ff85a2] text-white" : "bg-white text-[#f97316] hover:bg-[#fff7ed] border-2 border-[#ffedd5]"
                  )}
                  title="Voice Input"
                >
                  {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 rounded-2xl bg-white text-[#f97316] hover:bg-[#fff7ed] border-2 border-[#ffedd5] transition-all bubble-shadow"
                  title="Attach media"
                >
                  <Paperclip size={20} />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={onFileInputChange} 
                  className="hidden" 
                  multiple
                  accept=".jpg,.jpeg,.png,.gif,.webp,.mp3,.wav,.m4a,.mp4,.mov,.avi,.pdf,.txt,.md,.docx,.doc"
                />
              </div>
            </div>
            
            <motion.button
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              onClick={handleSend}
              disabled={(!input.trim() && attachments.length === 0) || isVerifying || attachments.some(a => (a.progress ?? 0) < 100)}
              className={cn(
                "p-4.5 rounded-[28px] flex items-center justify-center transition-all bubble-shadow",
                (!input.trim() && attachments.length === 0) || isVerifying || attachments.some(a => (a.progress ?? 0) < 100)
                  ? "bg-slate-100 text-slate-400 shadow-none cursor-not-allowed"
                  : "bg-[#f97316] text-white hover:bg-[#ea580c]"
              )}
            >
              <Send size={24} />
            </motion.button>
          </div>
          
          <div className="mt-6 flex items-center justify-center gap-8">
            <div className="flex items-center gap-2 text-xs font-bold text-[#4338ca] uppercase tracking-widest">
              <CheckCircle2 size={16} className="text-[#99ff88]" />
              Truth Finder 🌟
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#4338ca] uppercase tracking-widest">
              <AlertTriangle size={16} className="text-[#ffd670]" />
              Trick Spotter 🎩
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#4338ca] uppercase tracking-widest">
              <HelpCircle size={16} className="text-[#70d6ff]" />
              Super Helper 🦸‍♂️
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
