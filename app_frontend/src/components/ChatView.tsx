'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { jsPDF } from 'jspdf';
import { Chat, Message, TranscriptSegment } from '@/types';
import { SendIcon, SparklesIcon, UserIcon, FileTextIcon, MenuIcon } from './Icons';
import Button from './Button';
import FlashcardsView from './FlashcardsView';
import QuizView from './QuizView';
import CodePracticeView from './CodePracticeView';
import TranscriptView from './TranscriptView';
import clsx from 'clsx';
import { DownloadIcon, Maximize2, Minimize2, BookOpen, FileText, Layers, HelpCircle, Trophy, Subtitles } from 'lucide-react';

interface ChatViewProps {
  chat: Chat;
  messages: Message[];
  onSendMessage: (input: string) => Promise<void>;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const studyDropdownRef = useRef<HTMLDivElement>(null);

  // Parse timed transcript if available
  const timedTranscript: TranscriptSegment[] | undefined = chat.youtube_transcript_timed
    ? JSON.parse(chat.youtube_transcript_timed)
    : undefined;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (studyDropdownRef.current && !studyDropdownRef.current.contains(event.target as Node)) {
        setIsStudyDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;

    const message = input;
    setInput('');
    await onSendMessage(message);
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
    // pdf.setTextColor(120);
    // pdf.text(`Video ID: ${chat.youtube_id}`, margin, y);
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

  return (
    <div className="flex-1 flex flex-col h-screen bg-void-950">
      {/* Header */}
      <header className={clsx(
        "flex-shrink-0 px-6 py-4 border-b border-white/[0.06] glass-darker",
        isSidebarCollapsed && "pl-14"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-lg hover:bg-white/[0.05] text-void-400"
            >
              <MenuIcon size={20} />
            </button>
            <div>
              <h1 className="font-display font-semibold text-lg text-white truncate max-w-md">
                {chat.session_name}
              </h1>
              {/* <p className="text-xs text-void-500 mt-0.5">
                Video ID: {chat.youtube_id}
              </p> */}
            </div>
          </div>

          {/* Tabs - Desktop: individual buttons, Mobile: dropdown */}

          {/* Desktop Tabs */}
          <div className="hidden md:flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <button
              onClick={() => setActiveTab('notes')}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                activeTab === 'notes'
                  ? 'bg-ember-500/20 text-ember-300'
                  : 'text-void-400 hover:text-void-200 hover:bg-white/[0.05]'
              )}
            >
              <FileText size={16} />
              Notes
            </button>
            <button
              onClick={() => setActiveTab('flashcards')}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                activeTab === 'flashcards'
                  ? 'bg-ember-500/20 text-ember-300'
                  : 'text-void-400 hover:text-void-200 hover:bg-white/[0.05]'
              )}
            >
              <Layers size={16} />
              Flashcards
            </button>
            <button
              onClick={() => setActiveTab('quiz')}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                activeTab === 'quiz'
                  ? 'bg-ember-500/20 text-ember-300'
                  : 'text-void-400 hover:text-void-200 hover:bg-white/[0.05]'
              )}
            >
              <Trophy size={16} />
              Quiz
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                activeTab === 'code'
                  ? 'bg-ember-500/20 text-ember-300'
                  : 'text-void-400 hover:text-void-200 hover:bg-white/[0.05]'
              )}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16,18 22,12 16,6" />
                <polyline points="8,6 2,12 8,18" />
              </svg>
              Code
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                activeTab === 'chat'
                  ? 'bg-ember-500/20 text-ember-300'
                  : 'text-void-400 hover:text-void-200 hover:bg-white/[0.05]'
              )}
            >
              <SendIcon size={16} />
              Chat
            </button>
          </div>

          {/* Mobile Dropdown */}
          <div ref={studyDropdownRef} className="md:hidden relative">
            <button
              onClick={() => setIsStudyDropdownOpen(!isStudyDropdownOpen)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm font-medium text-void-200"
            >
              {activeTab === 'notes' && <><FileText size={16} />Notes</>}
              {activeTab === 'flashcards' && <><Layers size={16} />Flashcards</>}
              {activeTab === 'quiz' && <><Trophy size={16} />Quiz</>}
              {activeTab === 'code' && <>Code</>}
              {activeTab === 'chat' && <><SendIcon size={16} />Chat</>}
              <svg
                className={clsx("w-4 h-4 transition-transform ml-1", isStudyDropdownOpen && "rotate-180")}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isStudyDropdownOpen && (
              <div
                className="absolute top-full mt-2 left-0 w-48 rounded-xl border border-white/[0.1] shadow-2xl z-[100] overflow-hidden"
                style={{ backgroundColor: '#0a0a0c' }}
              >
                <div className="py-1">
                  <button
                    onClick={() => { setActiveTab('notes'); setIsStudyDropdownOpen(false); }}
                    className={clsx(
                      'w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors',
                      activeTab === 'notes' ? 'bg-ember-500/20 text-ember-300' : 'text-void-300 hover:bg-white/[0.05] hover:text-white'
                    )}
                  >
                    <FileText size={16} />Notes
                  </button>
                  <button
                    onClick={() => { setActiveTab('flashcards'); setIsStudyDropdownOpen(false); }}
                    className={clsx(
                      'w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors',
                      activeTab === 'flashcards' ? 'bg-ember-500/20 text-ember-300' : 'text-void-300 hover:bg-white/[0.05] hover:text-white'
                    )}
                  >
                    <Layers size={16} />Flashcards
                  </button>
                  <button
                    onClick={() => { setActiveTab('quiz'); setIsStudyDropdownOpen(false); }}
                    className={clsx(
                      'w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors',
                      activeTab === 'quiz' ? 'bg-ember-500/20 text-ember-300' : 'text-void-300 hover:bg-white/[0.05] hover:text-white'
                    )}
                  >
                    <Trophy size={16} />Quiz
                  </button>
                  <button
                    onClick={() => { setActiveTab('code'); setIsStudyDropdownOpen(false); }}
                    className={clsx(
                      'w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors',
                      activeTab === 'code' ? 'bg-ember-500/20 text-ember-300' : 'text-void-300 hover:bg-white/[0.05] hover:text-white'
                    )}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="16,18 22,12 16,6" />
                      <polyline points="8,6 2,12 8,18" />
                    </svg>
                    Code
                  </button>
                  <button
                    onClick={() => { setActiveTab('chat'); setIsStudyDropdownOpen(false); }}
                    className={clsx(
                      'w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors',
                      activeTab === 'chat' ? 'bg-ember-500/20 text-ember-300' : 'text-void-300 hover:bg-white/[0.05] hover:text-white'
                    )}
                  >
                    <SendIcon size={16} />Chat
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Panel with Transcript */}
        <div
          className={clsx(
            "hidden xl:flex flex-col flex-shrink-0 border-r border-white/[0.06] transition-all duration-300 overflow-hidden",
            isVideoExpanded ? "w-[600px]" : "w-96"
          )}
        >
          {/* Video Section - hidden when transcript is full */}
          {transcriptMode !== 'full' && (
            <div className="p-4 flex flex-col transition-all duration-300 flex-1 min-h-[200px]">
              <div className="relative group h-full">
                <div className="rounded-xl overflow-hidden bg-black shadow-2xl h-full">
                  <iframe
                    src={`https://www.youtube.com/embed/${chat.youtube_id}?enablejsapi=1`}
                    title="YouTube video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full min-h-[150px]"
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
          <div className={clsx(
            "border-t border-white/[0.06] flex flex-col min-h-0 overflow-hidden",
            transcriptMode === 'full' ? "flex-1 border-t-0" : transcriptMode === 'compact' ? "h-[200px] flex-shrink-0" : "flex-shrink-0"
          )}>
            {/* Toggle Bar */}
            <div className="flex items-center justify-between px-4 py-2 bg-white/[0.02] flex-shrink-0">
              <div className="flex items-center gap-1">
                <Subtitles size={14} className="text-void-400 mr-1" />
                <span className="text-sm text-void-400">Transcript</span>
              </div>

              <div className="flex items-center gap-2">
                {/* Auto-scroll toggle - only when not collapsed */}
                {transcriptMode !== 'collapsed' && (
                  <button
                    onClick={() => setIsTranscriptAutoScroll(!isTranscriptAutoScroll)}
                    className={clsx(
                      "px-2 py-1 rounded text-xs font-medium transition-all",
                      isTranscriptAutoScroll
                        ? "bg-azure-500/20 text-azure-300"
                        : "bg-white/[0.05] text-void-400 hover:text-void-200"
                    )}
                  >
                    Auto-scroll
                  </button>
                )}

                {/* Expand/Compact button */}
                <button
                  onClick={() => {
                    if (transcriptMode === 'collapsed') setTranscriptMode('compact');
                    else if (transcriptMode === 'compact') setTranscriptMode('full');
                    else setTranscriptMode('compact');
                  }}
                  className="px-2 py-1 rounded text-xs font-medium bg-white/[0.05] text-void-400 hover:text-void-200 hover:bg-white/[0.08] transition-all"
                >
                  {transcriptMode === 'collapsed' ? 'Show' : transcriptMode === 'compact' ? 'Expand' : 'Compact'}
                </button>

                {/* Hide button - only when not already collapsed */}
                {transcriptMode !== 'collapsed' && (
                  <button
                    onClick={() => setTranscriptMode('collapsed')}
                    className="px-2 py-1 rounded text-xs font-medium bg-white/[0.05] text-void-400 hover:text-void-200 hover:bg-white/[0.08] transition-all"
                  >
                    Hide
                  </button>
                )}
              </div>
            </div>

            {/* Transcript Content */}
            {transcriptMode !== 'collapsed' && timedTranscript && (
              <div className="flex-1 min-h-0 overflow-hidden">
                <TranscriptView
                  transcript={chat.youtube_transcript}
                  transcriptTimed={timedTranscript}
                  youtubeId={chat.youtube_id}
                  hideHeader={true}
                  isAutoScrollControlled={true}
                  autoScrollValue={isTranscriptAutoScroll}
                  onAutoScrollChange={setIsTranscriptAutoScroll}
                />
              </div>
            )}

            {/* Plain transcript fallback */}
            {transcriptMode !== 'collapsed' && !timedTranscript && (
              <div className="flex-1 min-h-0 overflow-y-auto p-4">
                <p className="text-sm text-void-300 leading-relaxed whitespace-pre-wrap">
                  {chat.youtube_transcript}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Content area - z-0 so header dropdown stays on top */}
        <div className="flex-1 flex flex-col min-w-0 relative z-0">
          {activeTab === 'notes' && (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-3xl mx-auto">
                <div className="flex items-center justify-between gap-3 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-ember-500/20">
                      <FileText size={20} className="text-ember-400" />
                    </div>
                    <h2 className="font-display font-semibold text-xl text-white">Here's your notes</h2>
                  </div>
                  <Button onClick={handleExportPDF} variant="ghost" size="sm">
                    <DownloadIcon size={16} />
                    Export
                  </Button>
                </div>
                <div className="markdown-content prose prose-invert max-w-none">
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
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-3xl mx-auto space-y-6">
                  {messages.length === 0 && (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-ember-500/10 to-ember-600/10 border border-ember-500/20 flex items-center justify-center">
                        <SparklesIcon size={36} className="text-ember-400" />
                      </div>
                      <h3 className="text-xl font-display font-semibold text-white mb-2">
                        Ask anything about this video
                      </h3>
                      <p className="text-void-400 max-w-md mx-auto">
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
                            className="px-4 py-2 rounded-full text-sm text-void-300 bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.map((message) => (
                    <div key={message.id} className="space-y-4 animate-fade-in">
                      <div className="flex gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-azure-500/20 flex items-center justify-center">
                          <UserIcon size={18} className="text-azure-400" />
                        </div>
                        <div className="flex-1 pt-2">
                          <p className="text-void-100">{message.input}</p>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-ember-500/20 flex items-center justify-center">
                          <SparklesIcon size={18} className="text-ember-400" />
                        </div>
                        <div className="flex-1 pt-2">
                          <div className="markdown-content">
                            <ReactMarkdown>{message.output}</ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {isSending && (
                    <div className="flex gap-4 animate-fade-in">
                      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-ember-500/20 flex items-center justify-center">
                        <SparklesIcon size={18} className="text-ember-400" />
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

              <div className="flex-shrink-0 p-6 border-t border-white/[0.06] glass-darker">
                <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => {
                          setInput(e.target.value);
                          // Auto-resize
                          e.target.style.height = 'auto';
                          e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask a question about the video..."
                        rows={1}
                        className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-5 py-4 text-void-100 placeholder:text-void-500 resize-none transition-all focus:outline-none focus:border-ember-500/50 focus:bg-white/[0.05] hover:border-white/[0.15]"
                        style={{ minHeight: '56px', maxHeight: '200px' }}
                      />
                    </div>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={!input.trim() || isSending}
                      className="!rounded-xl !p-4 flex-shrink-0 mb-1"
                    >
                      {isSending ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <SendIcon size={20} />
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}