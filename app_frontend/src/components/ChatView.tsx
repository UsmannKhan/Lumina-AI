'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { jsPDF } from 'jspdf';
import { Chat, Message, TranscriptSegment } from '@/types';
import { cn } from '@/lib/utils';
import FlashcardsView from './FlashcardsView';
import QuizView from './QuizView';
import CodePracticeView from './CodePracticeView';
import TranscriptView from './TranscriptView';
import { Download, Maximize2, Minimize2, FileText, Layers, Trophy, Subtitles, Globe, MessageSquare, ChevronDown, Send, Sparkles, User, Menu } from 'lucide-react';
import { api } from '@/lib/api';

interface ChatViewProps {
  chat: Chat;
  messages: Message[];
  onSendMessage: (input: string, useWebSearch: boolean) => Promise<void>;
  onToggleSidebar: () => void;
  isSidebarCollapsed: boolean;
  isSending: boolean;
}

export default function ChatView({
  chat,
  messages,
  onSendMessage,
  onToggleSidebar,
  isSidebarCollapsed,
  isSending,
}: ChatViewProps) {
  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState<'notes' | 'chat' | 'flashcards' | 'quiz' | 'code'>('notes');
  const [isVideoExpanded, setIsVideoExpanded] = useState(false);
  const [isStudyDropdownOpen, setIsStudyDropdownOpen] = useState(false);
  const [transcriptMode, setTranscriptMode] = useState<'collapsed' | 'compact' | 'full'>('compact');
  const [isTranscriptAutoScroll, setIsTranscriptAutoScroll] = useState(true);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [chatStyle, setChatStyle] = useState<'study' | 'conversational' | 'concise' | 'custom'>(chat.chat_style as 'study' | 'conversational' | 'concise' | 'custom' || 'study');
  const [isStyleDropdownOpen, setIsStyleDropdownOpen] = useState(false);
  const [customInstructions, setCustomInstructions] = useState(chat.custom_instructions || '');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const studyDropdownRef = useRef<HTMLDivElement>(null);
  const styleDropdownRef = useRef<HTMLDivElement>(null);

  // Parse timed transcript if available
  const timedTranscript: TranscriptSegment[] | undefined = chat.youtube_transcript_timed
    ? JSON.parse(chat.youtube_transcript_timed)
    : undefined;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (studyDropdownRef.current && !studyDropdownRef.current.contains(event.target as Node)) {
        setIsStudyDropdownOpen(false);
      }
      if (styleDropdownRef.current && !styleDropdownRef.current.contains(event.target as Node)) {
        setIsStyleDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStyleChange = async (style: 'study' | 'conversational' | 'concise' | 'custom') => {
    if (style === 'custom') {
      setShowCustomInput(true);
      setIsStyleDropdownOpen(false);
      return;
    }

    setChatStyle(style);
    setIsStyleDropdownOpen(false);
    setShowCustomInput(false);

    try {
      await api.updateChatStyle(chat.id, style);
    } catch (err) {
      console.error('Failed to update chat style:', err);
    }
  };

  const handleCustomInstructionsSave = async () => {
    setChatStyle('custom');
    setShowCustomInput(false);

    try {
      await api.updateChatStyle(chat.id, 'custom', customInstructions);
    } catch (err) {
      console.error('Failed to save custom instructions:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;

    const message = input;
    setInput('');
    await onSendMessage(message, webSearchEnabled);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleExportPDF = () => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 20;
    const maxWidth = pageWidth - margin * 2;
    let y = 20;

    const checkPage = (needed: number) => {
      if (y + needed > 280) {
        pdf.addPage();
        y = 20;
      }
    };

    const addText = (text: string, fontSize: number, isBold = false, indent = 0) => {
      pdf.setFontSize(fontSize);
      pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
      const lines = pdf.splitTextToSize(text, maxWidth - indent);
      for (const line of lines) {
        checkPage(fontSize * 0.5);
        pdf.text(line, margin + indent, y);
        y += fontSize * 0.45;
      }
    };

    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    const titleLines = pdf.splitTextToSize(chat.session_name, maxWidth);
    for (const line of titleLines) {
      pdf.text(line, margin, y);
      y += 9;
    }
    y += 2;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0);
    y += 12;

    pdf.setDrawColor(200);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 10;

    const lines = chat.notes.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (!line.trim()) {
        y += 3;
        continue;
      }

      const cleanText = (text: string) => {
        return text
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/\*(.*?)\*/g, '$1')
          .replace(/`(.*?)`/g, '$1')
          .replace(/\[(.*?)\]\(.*?\)/g, '$1')
          .trim();
      };

      if (line.startsWith('# ')) {
        checkPage(15);
        y += 6;
        addText(cleanText(line.replace('# ', '')), 18, true);
        y += 4;
      } else if (line.startsWith('## ')) {
        checkPage(12);
        y += 5;
        addText(cleanText(line.replace('## ', '')), 14, true);
        y += 3;
      } else if (line.startsWith('### ')) {
        checkPage(10);
        y += 4;
        addText(cleanText(line.replace('### ', '')), 12, true);
        y += 2;
      } else if (line.startsWith('#### ')) {
        checkPage(10);
        y += 3;
        addText(cleanText(line.replace('#### ', '')), 11, true);
        y += 2;
      } else if (line.startsWith('---')) {
        checkPage(10);
        y += 4;
        pdf.setDrawColor(220);
        pdf.line(margin, y, pageWidth - margin, y);
        y += 6;
      } else if (line.match(/^[\s]*[-*•]\s/)) {
        checkPage(8);
        const indent = (line.match(/^(\s*)/)?.[1]?.length || 0) / 2;
        const text = cleanText(line.replace(/^[\s]*[-*•]\s/, ''));
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text('•', margin + (indent * 5), y);
        const bulletLines = pdf.splitTextToSize(text, maxWidth - 8 - (indent * 5));
        for (let j = 0; j < bulletLines.length; j++) {
          if (j > 0) checkPage(5);
          pdf.text(bulletLines[j], margin + 6 + (indent * 5), y);
          y += 5;
        }
      } else if (line.match(/^\d+\.\s/)) {
        checkPage(8);
        const num = line.match(/^(\d+)\./)?.[1] || '1';
        const text = cleanText(line.replace(/^\d+\.\s/, ''));
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`${num}.`, margin, y);
        const numLines = pdf.splitTextToSize(text, maxWidth - 10);
        for (let j = 0; j < numLines.length; j++) {
          if (j > 0) checkPage(5);
          pdf.text(numLines[j], margin + 8, y);
          y += 5;
        }
      } else {
        checkPage(8);
        addText(cleanText(line), 10, false);
        y += 1;
      }
    }

    const filename = chat.session_name
      .replace(/[^a-z0-9\s]/gi, '')
      .replace(/\s+/g, '_')
      .substring(0, 50) || 'notes';

    pdf.save(`${filename}.pdf`);
  };

  const tabButtonClass = (isActive: boolean) => cn(
    'flex items-center gap-1 2xl:gap-2 px-2.5 2xl:px-5 py-1.5 2xl:py-2.5 rounded-md text-xs 2xl:text-base font-medium transition-all',
    isActive
      ? 'bg-[#0C115B] text-white'
      : 'text-gray-500 hover:text-gray-700 hover:bg-white/40'
  );

  return (
    <div className="flex-1 flex flex-col h-screen">
      {/* Header */}
      <header
        className={cn(
          "flex-shrink-0 px-3 2xl:px-8 py-2 2xl:py-5",
          isSidebarCollapsed && "pl-12 2xl:pl-24"
        )}
        style={{
          backdropFilter: 'blur(20px)',
          background: 'rgba(255, 255, 255, 0.6)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-lg hover:bg-white/40 text-gray-500"
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 className="font-semibold text-lg 2xl:text-2xl text-gray-800 max-w-md">
                {chat.session_name}
              </h1>
            </div>
          </div>

          {/* Desktop Tabs */}
          <div
            className="hidden md:flex gap-1 p-1 rounded-xl"
            style={{
              background: 'rgba(255, 255, 255, 0.5)',
              border: '1px solid rgba(0, 0, 0, 0.06)',
            }}
          >
            <button onClick={() => setActiveTab('notes')} className={tabButtonClass(activeTab === 'notes')}>
              <FileText size={14} className="2xl:w-4 2xl:h-4" />
              Notes
            </button>
            <button onClick={() => setActiveTab('flashcards')} className={tabButtonClass(activeTab === 'flashcards')}>
              <Layers size={14} className="2xl:w-4 2xl:h-4" />
              Flashcards
            </button>
            <button onClick={() => setActiveTab('quiz')} className={tabButtonClass(activeTab === 'quiz')}>
              <Trophy size={14} className="2xl:w-4 2xl:h-4" />
              Quiz
            </button>
            <button onClick={() => setActiveTab('code')} className={tabButtonClass(activeTab === 'code')}>
              <svg width="14" height="14" className="2xl:w-4 2xl:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16,18 22,12 16,6" />
                <polyline points="8,6 2,12 8,18" />
              </svg>
              Code
            </button>
            <button onClick={() => setActiveTab('chat')} className={tabButtonClass(activeTab === 'chat')}>
              <Send size={14} className="2xl:w-4 2xl:h-4" />
              Chat
            </button>
          </div>

          {/* Mobile Dropdown */}
          <div ref={studyDropdownRef} className="md:hidden relative">
            <button
              onClick={() => setIsStudyDropdownOpen(!isStudyDropdownOpen)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-700"
              style={{
                background: 'rgba(255, 255, 255, 0.5)',
                border: '1px solid rgba(0, 0, 0, 0.06)',
              }}
            >
              {activeTab === 'notes' && <><FileText size={16} />Notes</>}
              {activeTab === 'flashcards' && <><Layers size={16} />Flashcards</>}
              {activeTab === 'quiz' && <><Trophy size={16} />Quiz</>}
              {activeTab === 'code' && <>Code</>}
              {activeTab === 'chat' && <><Send size={16} />Chat</>}
              <ChevronDown className={cn("w-4 h-4 transition-transform ml-1", isStudyDropdownOpen && "rotate-180")} />
            </button>

            {isStudyDropdownOpen && (
              <div
                className="absolute top-full mt-2 left-0 w-48 rounded-xl shadow-xl z-[100] overflow-hidden"
                style={{
                  background: 'white',
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                }}
              >
                <div className="py-1">
                  {[
                    { id: 'notes', icon: FileText, label: 'Notes' },
                    { id: 'flashcards', icon: Layers, label: 'Flashcards' },
                    { id: 'quiz', icon: Trophy, label: 'Quiz' },
                    { id: 'code', icon: null, label: 'Code' },
                    { id: 'chat', icon: Send, label: 'Chat' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => { setActiveTab(tab.id as typeof activeTab); setIsStudyDropdownOpen(false); }}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors',
                        activeTab === tab.id ? 'bg-[#0C115B]/10 text-[#0C115B]' : 'text-gray-600 hover:bg-gray-50'
                      )}
                    >
                      {tab.icon && <tab.icon size={16} />}
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div
        className="flex-1 flex overflow-hidden"
        style={{
          backgroundImage: 'url(/images/app-background.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
        }}
      >
        {/* Video Panel with Transcript */}
        <div
          className={cn(
            "hidden lg:flex flex-col flex-shrink-0 transition-all duration-300 overflow-hidden border-r border-black/5",
            isVideoExpanded ? "w-[50%] 2xl:w-[55%] max-w-[800px] 2xl:max-w-[1200px]" : "w-[35%] 2xl:w-[45%] max-w-[450px] 2xl:max-w-[700px] min-w-[280px] 2xl:min-w-[500px]"
          )}
          style={{
            background: 'rgba(255, 255, 255, 0.4)',
            backdropFilter: 'blur(10px)',
          }}
        >
          {/* Video Section - Expands to fill space when transcript is collapsed */}
          {transcriptMode !== 'full' && (
            <div className="p-3 2xl:p-5 flex-shrink-0 transition-all duration-300">
              <div className="relative group w-full">
                <div
                  className="rounded-2xl overflow-hidden bg-black shadow-lg w-full"
                  style={{ aspectRatio: '16/9' }}
                >
                  <iframe
                    src={`https://www.youtube.com/embed/${chat.youtube_id}?enablejsapi=1`}
                    title="YouTube video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>

                <button
                  onClick={() => setIsVideoExpanded(!isVideoExpanded)}
                  className="absolute top-2 right-2 p-2 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                  title={isVideoExpanded ? "Collapse video" : "Expand video"}
                >
                  {isVideoExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>
              </div>
            </div>
          )}

          {/* Transcript Toggle & Content */}
          <div className={cn(
            "flex flex-col min-h-0 overflow-hidden transition-all duration-300",
            transcriptMode === 'full' ? "flex-1" : transcriptMode === 'compact' ? "flex-1" : "h-auto"
          )} style={{ borderTop: '1px solid rgba(0, 0, 0, 0.06)' }}>
            {/* Toggle Bar */}
            <div
              className="flex items-center justify-between px-3 2xl:px-4 py-1.5 2xl:py-2 flex-shrink-0"
              style={{ background: 'rgba(255, 255, 255, 0.5)' }}
            >
              <div className="flex items-center gap-1.5 2xl:gap-2">
                <Subtitles size={14} className="2xl:w-[18px] 2xl:h-[18px] text-gray-500" />
                <span className="text-sm 2xl:text-base font-semibold text-gray-700">Transcript</span>
              </div>

              <div className="flex items-center gap-1.5 2xl:gap-2">
                {transcriptMode !== 'collapsed' && (
                  <button
                    onClick={() => setIsTranscriptAutoScroll(!isTranscriptAutoScroll)}
                    className={cn(
                      "px-2.5 2xl:px-3.5 py-1 2xl:py-1.5 rounded-lg text-xs 2xl:text-sm font-medium transition-all",
                      isTranscriptAutoScroll
                        ? "bg-[#0C115B]/10 text-[#0C115B]"
                        : "bg-gray-100 text-gray-600 hover:text-gray-800 hover:bg-gray-200"
                    )}
                  >
                    Auto-scroll
                  </button>
                )}

                <button
                  onClick={() => {
                    if (transcriptMode === 'collapsed') setTranscriptMode('compact');
                    else if (transcriptMode === 'compact') setTranscriptMode('full');
                    else setTranscriptMode('compact');
                  }}
                  className="px-2.5 2xl:px-3.5 py-1 2xl:py-1.5 rounded-lg text-xs 2xl:text-sm font-medium bg-gray-100 text-gray-600 hover:text-gray-800 hover:bg-gray-200 transition-all"
                >
                  {transcriptMode === 'collapsed' ? 'Show' : transcriptMode === 'compact' ? 'Expand' : 'Compact'}
                </button>

                {transcriptMode !== 'collapsed' && (
                  <button
                    onClick={() => setTranscriptMode('collapsed')}
                    className="px-2.5 2xl:px-3.5 py-1 2xl:py-1.5 rounded-lg text-xs 2xl:text-sm font-medium bg-gray-100 text-gray-600 hover:text-gray-800 hover:bg-gray-200 transition-all"
                  >
                    Hide
                  </button>
                )}
              </div>
            </div>

            {/* Transcript Content */}
            {transcriptMode !== 'collapsed' && timedTranscript && (
              <div className="flex-1 min-h-0 overflow-y-auto">
                <TranscriptView
                  transcript={chat.youtube_transcript}
                  transcriptTimed={timedTranscript}
                  youtubeId={chat.youtube_id}
                  hideHeader={true}
                  isAutoScrollControlled={true}
                  autoScrollValue={isTranscriptAutoScroll}
                  onAutoScrollChange={setIsTranscriptAutoScroll}
                  isExpanded={isVideoExpanded}
                />
              </div>
            )}

            {transcriptMode !== 'collapsed' && !timedTranscript && (
              <div className="flex-1 min-h-0 overflow-y-auto p-4">
                <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap font-medium">
                  {chat.youtube_transcript}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 flex flex-col min-w-0 relative z-0">
          {activeTab === 'notes' && (
            <div
              className="flex-1 overflow-y-auto p-3 2xl:p-6"
              style={{ background: 'rgba(255, 255, 255, 0.4)' }}
            >
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between gap-2 2xl:gap-3 mb-3 2xl:mb-4 flex-shrink-0">
                  <div className="flex items-center gap-2 2xl:gap-3">
                    <FileText size={20} className="text-[#0C115B] 2xl:w-7 2xl:h-7" />
                    <h2 className="font-bold text-lg 2xl:text-2xl text-gray-800">Your Notes</h2>
                  </div>
                  <button
                    onClick={handleExportPDF}
                    className="flex items-center gap-1.5 2xl:gap-2 px-3 2xl:px-4 py-1.5 2xl:py-2.5 rounded-lg text-sm 2xl:text-base font-medium text-gray-500 hover:text-gray-700 hover:bg-white/50 transition-all"
                  >
                    <Download size={16} className="2xl:w-5 2xl:h-5" />
                    Export
                  </button>
                </div>
                <div
                  className="markdown-content max-w-none p-4 2xl:p-8 rounded-xl 2xl:rounded-2xl flex-1 overflow-y-auto shadow-sm"
                  style={{
                    background: 'rgba(255, 255, 255, 0.85)',
                    border: '1px solid rgba(0, 0, 0, 0.06)',
                  }}
                >
                  <ReactMarkdown>{chat.notes}</ReactMarkdown>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'flashcards' && (
            <FlashcardsView chatId={chat.id} videoTitle={chat.session_name} />
          )}

          {activeTab === 'quiz' && (
            <QuizView chatId={chat.id} videoTitle={chat.session_name} />
          )}

          {activeTab === 'code' && (
            <CodePracticeView chatId={chat.id} />
          )}

          {activeTab === 'chat' && (
            <>
              <div className="flex-1 overflow-y-auto p-3 2xl:p-6" style={{ background: 'rgba(255, 255, 255, 0.3)' }}>
                <div className="max-w-3xl mx-auto space-y-6">
                  {messages.length === 0 && (
                    <div className="text-center py-70">
                      <div
                        className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center"
                        style={{
                          background: 'rgba(255, 255, 255, 0.7)',
                          border: '1px solid rgba(0, 0, 0, 0.06)',
                          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.04)',
                        }}
                      >
                        <Sparkles size={36} className="text-[#0C115B]" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">
                        Ask anything about this video
                      </h3>
                      <p className="text-gray-500 max-w-md mx-auto">
                        I'm ready to answer your questions,
                        provide summaries, or dive deeper into any topic.
                      </p>

                      <div className="mt-8 flex flex-wrap justify-center gap-2">
                        {[
                          'What are the main takeaways?',
                          'Summarize in 3 bullet points',
                          'What was the conclusion?',
                        ].map((suggestion) => (
                          <button
                            key={suggestion}
                            onClick={() => setInput(suggestion)}
                            className="px-4 py-2 rounded-full text-sm text-gray-600 transition-all hover:bg-white/60"
                            style={{
                              background: 'rgba(255, 255, 255, 0.5)',
                              border: '1px solid rgba(0, 0, 0, 0.06)',
                            }}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.map((message) => (
                    <div key={message.id} className="space-y-4">
                      <div className="flex gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                          <User size={18} className="text-blue-600" />
                        </div>
                        <div className="flex-1 pt-2">
                          <p className="text-gray-800">{message.input}</p>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#0C115B]/10 flex items-center justify-center">
                          <Sparkles size={18} className="text-[#0C115B]" />
                        </div>
                        <div
                          className="flex-1 pt-2 p-4 rounded-xl prose max-w-none"
                          style={{
                            background: 'rgba(255, 255, 255, 0.6)',
                            border: '1px solid rgba(0, 0, 0, 0.04)',
                          }}
                        >
                          <ReactMarkdown>{message.output}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  ))}

                  {isSending && (
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#0C115B]/10 flex items-center justify-center">
                        <Sparkles size={18} className="text-[#0C115B]" />
                      </div>
                      <div className="flex-1 pt-2">
                        <div className="typing-indicator">
                          <span />
                          <span />
                          <span />
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </div>

              <div
                className="flex-shrink-0 p-4 xl:p-6"
                style={{
                  background: 'rgba(255, 255, 255, 0.7)',
                  borderTop: '1px solid rgba(0, 0, 0, 0.06)',
                }}
              >
                <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
                  <div className="flex items-end gap-3">
                    <div className="flex-1 relative">
                      <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => {
                          setInput(e.target.value);
                          e.target.style.height = 'auto';
                          e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder={webSearchEnabled ? 'Ask with web search...' : 'Ask a question about the video...'}
                        rows={1}
                        className="w-full rounded-2xl px-5 py-4 text-gray-800 placeholder:text-gray-400 resize-none transition-all focus:outline-none focus:ring-2 focus:ring-[#0C115B]/30"
                        style={{
                          minHeight: '56px',
                          maxHeight: '200px',
                          background: 'rgba(255, 255, 255, 0.8)',
                          border: '1px solid rgba(0, 0, 0, 0.08)',
                        }}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!input.trim() || isSending}
                      className="p-4 rounded-xl text-white flex-shrink-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5"
                      style={{
                        background: '#0C115B',
                        boxShadow: '0 4px 12px rgba(12, 17, 91, 0.3)',
                      }}
                    >
                      {isSending ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Send size={20} />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-3 mt-3 px-1">
                    <button
                      type="button"
                      onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                        webSearchEnabled
                          ? 'bg-blue-100 text-blue-600'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                      )}
                    >
                      <Globe size={14} />
                      Web Search
                    </button>

                    <div ref={styleDropdownRef} className="relative">
                      <button
                        type="button"
                        onClick={() => setIsStyleDropdownOpen(!isStyleDropdownOpen)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all"
                      >
                        <MessageSquare size={14} />
                        <span className="capitalize">{chatStyle}</span>
                        <ChevronDown size={12} className={cn('transition-transform', isStyleDropdownOpen && 'rotate-180')} />
                      </button>

                      {isStyleDropdownOpen && (
                        <div
                          className="absolute bottom-full mb-2 left-0 w-48 rounded-xl shadow-xl z-50 overflow-hidden"
                          style={{
                            background: 'white',
                            border: '1px solid rgba(0, 0, 0, 0.08)',
                          }}
                        >
                          <div className="py-1">
                            {(['study', 'conversational', 'concise', 'custom'] as const).map((style) => (
                              <button
                                key={style}
                                type="button"
                                onClick={() => handleStyleChange(style)}
                                className={cn(
                                  'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left',
                                  chatStyle === style
                                    ? 'bg-[#0C115B]/10 text-[#0C115B]'
                                    : 'text-gray-600 hover:bg-gray-50'
                                )}
                              >
                                <span className="capitalize">{style}</span>
                                {style === 'study' && <span className="text-xs text-gray-400 ml-auto">Default</span>}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {showCustomInput && (
                    <div
                      className="mt-3 p-4 rounded-xl"
                      style={{
                        background: 'rgba(255, 255, 255, 0.8)',
                        border: '1px solid rgba(0, 0, 0, 0.06)',
                      }}
                    >
                      <label className="text-sm text-gray-500 mb-2 block">Custom Instructions</label>
                      <textarea
                        value={customInstructions}
                        onChange={(e) => setCustomInstructions(e.target.value)}
                        placeholder="Enter your custom instructions for how the AI should respond..."
                        rows={3}
                        className="w-full rounded-xl px-4 py-3 text-gray-800 placeholder:text-gray-400 resize-none transition-all focus:outline-none focus:ring-2 focus:ring-[#0C115B]/30 text-sm"
                        style={{
                          background: 'white',
                          border: '1px solid rgba(0, 0, 0, 0.08)',
                        }}
                      />
                      <div className="flex justify-end gap-2 mt-3">
                        <button
                          type="button"
                          onClick={() => setShowCustomInput(false)}
                          className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleCustomInstructionsSave}
                          className="px-4 py-1.5 text-sm text-white rounded-lg transition-colors hover:brightness-110"
                          style={{ background: '#0C115B' }}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  )}
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div >
  );
}