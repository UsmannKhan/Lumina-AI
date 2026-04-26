'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import MarkdownRenderer from './MarkdownRenderer';
import { jsPDF } from 'jspdf';
import { Chat, Message, TranscriptSegment } from '@/types';
import { cn } from '@/lib/utils';
import FlashcardsView from './FlashcardsView';
import QuizView from './QuizView';
import CodePracticeView from './CodePracticeView';
import TranscriptView from './TranscriptView';
import ManualNotesEditor from './ManualNotesEditor';
import SelectionBubbleMenu from './SelectionBubbleMenu';
import dynamic from 'next/dynamic';
import { Download, Maximize2, Minimize2, FileText, Layers, Trophy, Subtitles, Globe, MessageSquare, ChevronDown, Send, Sparkles, User, Menu, Code2, PenLine, Bot, Loader2, Quote, X, Copy, Check } from 'lucide-react';
import { api } from '@/lib/api';

// Dynamic import for PdfViewer to avoid SSR issues with PDF.js
const PdfViewer = dynamic(() => import('./PdfViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-gray-100">
      <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
    </div>
  )
});

// Dynamic import for TextViewer
const TextViewer = dynamic(() => import('./TextViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-gray-100">
      <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
    </div>
  )
});

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
  const [notesSubTab, setNotesSubTab] = useState<'ai' | 'manual'>('ai');
  const [manualNotesContent, setManualNotesContent] = useState<string>(chat.manual_notes || '');

  // PDF selection state
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [selectionPosition, setSelectionPosition] = useState<{ x: number; y: number } | null>(null);

  // Attached quote for chat (selected text to ask about)
  const [attachedQuote, setAttachedQuote] = useState<string | null>(null);

  // Copy feedback state
  const [notesCopied, setNotesCopied] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const studyDropdownRef = useRef<HTMLDivElement>(null);
  const styleDropdownRef = useRef<HTMLDivElement>(null);

  // Parse timed transcript if available (only for YouTube)
  const timedTranscript: TranscriptSegment[] | undefined = chat.timed_content
    ? JSON.parse(chat.timed_content)
    : undefined;

  // Check if this is a YouTube source
  const isYouTube = chat.source_type === 'youtube';

  // Reset state when chat changes
  useEffect(() => {
    setManualNotesContent(chat.manual_notes || '');
    setChatStyle(chat.chat_style as 'study' | 'conversational' | 'concise' | 'custom' || 'study');
    setCustomInstructions(chat.custom_instructions || '');
    setAttachedQuote(null);
    setNotesSubTab('ai');
  }, [chat.id]);

  // Instant scroll when switching to chat tab
  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
    }
  }, [activeTab]);

  // Smooth scroll when new messages arrive
  useEffect(() => {
    if (activeTab === 'chat' && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
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

  // PDF text selection handlers
  const handleTextSelect = useCallback((text: string, position: { x: number; y: number }) => {
    setSelectedText(text);
    setSelectionPosition(position);
  }, []);

  const handleCloseSelection = useCallback(() => {
    setSelectedText(null);
    setSelectionPosition(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  const handleChatWithSelection = useCallback((text: string) => {
    setActiveTab('chat');
    setAttachedQuote(text);
    inputRef.current?.focus();
  }, []);

  const handleAddToNotes = useCallback((text: string) => {
    setActiveTab('notes');
    setNotesSubTab('manual');
    // Append as HTML paragraph (Tiptap uses HTML format)
    const newParagraph = `<p>${text}</p>`;
    setManualNotesContent(prev => prev ? `${prev}${newParagraph}` : newParagraph);
  }, []);

  const handleExplain = useCallback(async (text: string) => {
    setActiveTab('chat');
    await onSendMessage(`Explain: ${text}`, false);
  }, [onSendMessage]);

  const handleDefine = useCallback(async (text: string) => {
    setActiveTab('chat');
    await onSendMessage(`Define: ${text}`, false);
  }, [onSendMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;

    // Build message with attached quote if present
    let message = input;
    if (attachedQuote) {
      message = `Regarding this text: "${attachedQuote}"\n\n${input}`;
      setAttachedQuote(null);
    }
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
              aria-label="Toggle sidebar"
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 className="font-semibold text-lg 2xl:text-2xl text-gray-800 max-w-md 2xl:max-w-2xl">
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
              <Code2 size={14} className="2xl:w-4 2xl:h-4" />
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
        {/* Video/PDF Panel with Transcript */}
        <div
          className={cn(
            "hidden lg:flex flex-col flex-shrink-0 transition-all duration-300 overflow-hidden border-r border-black/5",
            isVideoExpanded ? "w-[50%] 2xl:w-[60%] max-w-[800px] 2xl:max-w-none" : "w-[35%] 2xl:w-[50%] max-w-[450px] 2xl:max-w-[900px] min-w-[280px] 2xl:min-w-[550px]"
          )}
          style={{
            background: 'rgba(255, 255, 255, 0.4)',
            backdropFilter: 'blur(10px)',
          }}
        >
          {/* PDF Viewer - Full height for PDF sources */}
          {!isYouTube && chat.source_type === 'pdf' && (
            <div className="flex-1 flex flex-col min-h-0 relative">
              <PdfViewer
                pdfUrl={api.getPdfUrl(chat.id)}
                onTextSelect={handleTextSelect}
              />

              {/* Selection Bubble Menu */}
              {selectedText && selectionPosition && (
                <SelectionBubbleMenu
                  selectedText={selectedText}
                  position={selectionPosition}
                  onChat={handleChatWithSelection}
                  onAddToNotes={handleAddToNotes}
                  onExplain={handleExplain}
                  onDefine={handleDefine}
                  onClose={handleCloseSelection}
                />
              )}
            </div>
          )}

          {/* Text Viewer - Full height for TXT sources */}
          {!isYouTube && (chat.source_type === 'txt' || chat.source_type === 'website') && (
            <div className="flex-1 flex flex-col min-h-0 relative">
              <TextViewer
                content={chat.source_content || ''}
                fileName={chat.session_name}
                onTextSelect={handleTextSelect}
              />

              {/* Selection Bubble Menu */}
              {selectedText && selectionPosition && (
                <SelectionBubbleMenu
                  selectedText={selectedText}
                  position={selectionPosition}
                  onChat={handleChatWithSelection}
                  onAddToNotes={handleAddToNotes}
                  onExplain={handleExplain}
                  onDefine={handleDefine}
                  onClose={handleCloseSelection}
                />
              )}
            </div>
          )}

          {/* Audio Player + Transcript Viewer */}
          {!isYouTube && chat.source_type === 'audio' && (
            <div className="flex-1 flex flex-col min-h-0 relative">
              <div className="p-3 flex-shrink-0 border-b border-black/5 dark:border-white/5">
                <audio
                  controls
                  className="w-full rounded-lg"
                  src={api.getAudioUrl(chat.id)}
                />
              </div>
              <div className="flex-1 min-h-0">
                <TextViewer
                  content={chat.source_content || ''}
                  fileName={chat.session_name}
                  onTextSelect={handleTextSelect}
                />
              </div>

              {/* Selection Bubble Menu */}
              {selectedText && selectionPosition && (
                <SelectionBubbleMenu
                  selectedText={selectedText}
                  position={selectionPosition}
                  onChat={handleChatWithSelection}
                  onAddToNotes={handleAddToNotes}
                  onExplain={handleExplain}
                  onDefine={handleDefine}
                  onClose={handleCloseSelection}
                />
              )}
            </div>
          )}

          {/* Video Section - Only for YouTube sources */}
          {isYouTube && transcriptMode !== 'full' && chat.source_id && (
            <div className="p-3 2xl:p-5 flex-shrink-0 transition-all duration-300">
              <div className="relative group w-full">
                <div
                  className="rounded-2xl overflow-hidden bg-black shadow-lg w-full"
                  style={{ aspectRatio: '16/9' }}
                >
                  <iframe
                    src={`https://www.youtube.com/embed/${chat.source_id}?enablejsapi=1`}
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
                  aria-label={isVideoExpanded ? "Collapse video" : "Expand video"}
                >
                  {isVideoExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>
              </div>
            </div>
          )}

          {/* Transcript Toggle & Content - Only for YouTube sources */}
          {isYouTube && (
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
                    transcript={chat.source_content}
                    transcriptTimed={timedTranscript}
                    youtubeId={chat.source_id || ''}
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
                    {chat.source_content}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Content area */}
        <div className="flex-1 flex flex-col min-w-0 relative z-0">
          {activeTab === 'notes' && (
            <div
              className="flex-1 flex flex-col overflow-hidden"
              style={{ background: 'rgba(255, 255, 255, 0.4)' }}
            >
              {/* Notes Header with Sub-tabs */}
              <div className="flex items-center justify-between gap-2 2xl:gap-3 p-3 2xl:p-6 pb-0 2xl:pb-0 flex-shrink-0">
                {/* Left side: Sub-tabs */}
                <div className="flex items-center gap-1 p-0.5 rounded-lg" style={{ background: 'rgba(0, 0, 0, 0.05)' }}>
                  <button
                    onClick={() => setNotesSubTab('ai')}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 2xl:px-3 py-1 2xl:py-1.5 rounded-md text-xs 2xl:text-sm font-medium transition-all',
                      notesSubTab === 'ai'
                        ? 'bg-white text-[#0C115B] shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    )}
                  >
                    <Bot size={14} className="2xl:w-4 2xl:h-4" />
                    AI Generated
                  </button>
                  <button
                    onClick={() => setNotesSubTab('manual')}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 2xl:px-3 py-1 2xl:py-1.5 rounded-md text-xs 2xl:text-sm font-medium transition-all',
                      notesSubTab === 'manual'
                        ? 'bg-white text-[#0C115B] shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    )}
                  >
                    <PenLine size={14} className="2xl:w-4 2xl:h-4" />
                    My Notes
                  </button>
                </div>

                {/* Right side: Export */}
                <div className="flex items-center gap-2 2xl:gap-3">

                  {notesSubTab === 'ai' && (
                    <>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(chat.notes || '');
                          setNotesCopied(true);
                          setTimeout(() => setNotesCopied(false), 2000);
                        }}
                        className="flex items-center gap-1.5 2xl:gap-2 px-3 2xl:px-4 py-1.5 2xl:py-2.5 rounded-lg text-sm 2xl:text-base font-medium text-gray-500 hover:text-gray-700 hover:bg-white/50 transition-all"
                        title="Copy to clipboard"
                      >
                        {notesCopied ? (
                          <Check size={16} className="2xl:w-5 2xl:h-5 text-green-500" />
                        ) : (
                          <Copy size={16} className="2xl:w-5 2xl:h-5" />
                        )}
                        {notesCopied ? 'Copied' : 'Copy'}
                      </button>
                      <button
                        onClick={handleExportPDF}
                        className="flex items-center gap-1.5 2xl:gap-2 px-3 2xl:px-4 py-1.5 2xl:py-2.5 rounded-lg text-sm 2xl:text-base font-medium text-gray-500 hover:text-gray-700 hover:bg-white/50 transition-all"
                      >
                        <Download size={16} className="2xl:w-5 2xl:h-5" />
                        Export
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Notes Content */}
              <div className="flex-1 overflow-hidden p-3 2xl:p-6 pt-3 2xl:pt-4">
                {notesSubTab === 'ai' ? (
                  <div
                    className="markdown-content max-w-none p-4 2xl:p-8 rounded-xl 2xl:rounded-2xl h-full overflow-y-auto shadow-sm"
                    style={{
                      background: 'rgba(255, 255, 255, 0.85)',
                      border: '1px solid rgba(0, 0, 0, 0.06)',
                    }}
                  >
                    <MarkdownRenderer content={chat.notes || ''} />
                  </div>
                ) : (
                  <div
                    className="rounded-xl 2xl:rounded-2xl h-full overflow-hidden shadow-sm"
                    style={{
                      background: 'rgba(255, 255, 255, 0.85)',
                      border: '1px solid rgba(0, 0, 0, 0.06)',
                    }}
                  >
                    <ManualNotesEditor
                      chatId={chat.id}
                      initialContent={manualNotesContent}
                      onSave={async (content) => {
                        setManualNotesContent(content);
                        await api.updateManualNotes(chat.id, content);
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'flashcards' && (
            <FlashcardsView chatId={chat.id} videoTitle={chat.session_name} sourceType={chat.source_type} />
          )}

          {activeTab === 'quiz' && (
            <QuizView chatId={chat.id} videoTitle={chat.session_name} sourceType={chat.source_type} />
          )}

          {activeTab === 'code' && (
            <CodePracticeView chatId={chat.id} />
          )}

          {activeTab === 'chat' && (
            <>
              <div className="flex-1 overflow-y-auto p-3 2xl:p-8" style={{ background: 'rgba(255, 255, 255, 0.3)' }}>
                <div className="max-w-xl 2xl:max-w-5xl mx-auto space-y-6">
                  {messages.length === 0 && (
                    <div className="text-center py-8 2xl:pt-80 2xl:pb-8 flex flex-col items-center justify-center min-h-[200px]">
                      <div
                        className="w-14 h-14 2xl:w-20 2xl:h-20 mx-auto mb-4 2xl:mb-6 rounded-xl 2xl:rounded-2xl flex items-center justify-center"
                        style={{
                          background: 'rgba(255, 255, 255, 0.7)',
                          border: '1px solid rgba(0, 0, 0, 0.06)',
                          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.04)',
                        }}
                      >
                        <Sparkles size={24} className="2xl:w-9 2xl:h-9 text-[#0C115B]" />
                      </div>
                      <h3 className="text-base 2xl:text-xl font-semibold text-gray-800 mb-1 2xl:mb-2">
                        Ask anything
                      </h3>
                      <p className="text-sm 2xl:text-base text-gray-500 max-w-sm 2xl:max-w-md mx-auto">
                        I'm ready to answer your questions,
                        provide summaries, or dive deeper into any topic.
                      </p>

                      <div className="mt-4 2xl:mt-8 flex flex-wrap justify-center gap-1.5 2xl:gap-2">
                        {[
                          'What are the main takeaways?',
                          'Summarize in 3 bullet points',
                          'What was the conclusion?',
                        ].map((suggestion) => (
                          <button
                            key={suggestion}
                            onClick={() => setInput(suggestion)}
                            className="px-3 2xl:px-4 py-1.5 2xl:py-2 rounded-full text-xs 2xl:text-sm text-gray-600 transition-all hover:bg-white/60"
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

                      {/* Only show AI response if there's output */}
                      {message.output && (
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
                            <MarkdownRenderer content={message.output || ''} className="prose" />
                          </div>
                        </div>
                      )}
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
                className="flex-shrink-0 p-3 xl:p-4 2xl:p-6"
                style={{
                  background: 'rgba(255, 255, 255, 0.7)',
                  borderTop: '1px solid rgba(0, 0, 0, 0.06)',
                }}
              >
                <form onSubmit={handleSubmit} className="max-w-xl 2xl:max-w-5xl mx-auto">
                  {/* Attached quote bubble */}
                  {attachedQuote && (
                    <div className="mb-2 inline-flex items-start gap-2 p-2.5 px-3 rounded-lg bg-[#0C115B]/5 border border-[#0C115B]/10 max-w-sm">
                      <p className="flex-1 text-sm text-gray-600 line-clamp-4 italic leading-relaxed">
                        "{attachedQuote.length > 100 ? attachedQuote.slice(0, 100) + '...' : attachedQuote}"
                      </p>
                      <button
                        type="button"
                        onClick={() => setAttachedQuote(null)}
                        className="p-0.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                  <div className="flex items-end gap-2 2xl:gap-3">
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
                        placeholder={webSearchEnabled ? 'Ask with web search...' : 'Ask a question...'}
                        rows={1}
                        className="w-full rounded-xl 2xl:rounded-2xl px-3 py-2.5 2xl:px-5 2xl:py-4 text-sm 2xl:text-base text-gray-800 placeholder:text-gray-400 resize-none transition-all focus:outline-none focus:ring-2 focus:ring-[#0C115B]/30"
                        style={{
                          minHeight: '44px',
                          maxHeight: '200px',
                          background: 'rgba(255, 255, 255, 0.8)',
                          border: '1px solid rgba(0, 0, 0, 0.08)',
                        }}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!input.trim() || isSending}
                      className="p-2.5 2xl:p-4 rounded-lg 2xl:rounded-xl text-white flex-shrink-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5"
                      style={{
                        background: '#0C115B',
                        boxShadow: '0 4px 12px rgba(12, 17, 91, 0.3)',
                      }}
                    >
                      {isSending ? (
                        <div className="w-4 h-4 2xl:w-5 2xl:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Send size={16} className="2xl:w-5 2xl:h-5" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-2 2xl:gap-3 mt-2 2xl:mt-3 px-1">
                    <button
                      type="button"
                      onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                      className={cn(
                        'flex items-center gap-1.5 2xl:gap-2 px-2 2xl:px-3 py-1 2xl:py-1.5 rounded-lg text-xs 2xl:text-sm font-medium transition-all',
                        webSearchEnabled
                          ? 'bg-blue-100 text-blue-600'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                      )}
                    >
                      <Globe size={12} className="2xl:w-3.5 2xl:h-3.5" />
                      Web Search
                    </button>

                    <div ref={styleDropdownRef} className="relative">
                      <button
                        type="button"
                        onClick={() => setIsStyleDropdownOpen(!isStyleDropdownOpen)}
                        className="flex items-center gap-1.5 2xl:gap-2 px-2 2xl:px-3 py-1 2xl:py-1.5 rounded-lg text-xs 2xl:text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all"
                      >
                        <MessageSquare size={12} className="2xl:w-3.5 2xl:h-3.5" />
                        <span className="capitalize">{chatStyle}</span>
                        <ChevronDown size={10} className={cn('2xl:w-3 2xl:h-3 transition-transform', isStyleDropdownOpen && 'rotate-180')} />
                      </button>

                      {isStyleDropdownOpen && (
                        <div
                          className="absolute bottom-full mb-2 left-0 w-40 2xl:w-48 rounded-lg 2xl:rounded-xl shadow-xl z-50 overflow-hidden"
                          style={{
                            background: 'white',
                            border: '1px solid rgba(0, 0, 0, 0.08)',
                          }}
                        >
                          <div className="py-0.5 2xl:py-1">
                            {(['study', 'conversational', 'concise', 'custom'] as const).map((style) => (
                              <button
                                key={style}
                                type="button"
                                onClick={() => handleStyleChange(style)}
                                className={cn(
                                  'w-full flex items-center gap-2 2xl:gap-3 px-3 2xl:px-4 py-1.5 2xl:py-2.5 text-xs 2xl:text-sm transition-colors text-left',
                                  chatStyle === style
                                    ? 'bg-[#0C115B]/10 text-[#0C115B]'
                                    : 'text-gray-600 hover:bg-gray-50'
                                )}
                              >
                                <span className="capitalize">{style}</span>
                                {style === 'study' && <span className="text-[10px] 2xl:text-xs text-gray-400 ml-auto">Default</span>}
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